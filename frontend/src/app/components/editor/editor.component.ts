import {
  Component,
  inject,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EditorSettingsService, EditorSettings } from '../../services/editor-settings.service';
import { WebSocketService, MSG_TYPE_CHANGE, MSG_TYPE_SNAPSHOT } from '../../services/websocket.service';
import { AutomergeService } from '../../services/automerge.service';
import { CodeMirrorService } from '../../services/codemirror.service';
import { Subscription } from 'rxjs';
import { ViewUpdate } from '@codemirror/view';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHostRef!: ElementRef<HTMLDivElement>;

  settingsService = inject(EditorSettingsService);

  private wsService = inject(WebSocketService);
  private amService = inject(AutomergeService);
  private cmService = inject(CodeMirrorService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private messageSub!: Subscription;
  private settingsSub!: Subscription;
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;

  /** Whether the initial document state has been received */
  private initialized = false;

  /** Previous text value for computing diffs */
  private previousText = '';

  /** Flag to suppress CM change events when applying remote CRDT updates */
  private suppressChangeEvents = false;

  /** Track the last applied settings to only reconfigure what changed */
  private lastSettings: EditorSettings | null = null;

  ngOnInit(): void {
    // Read the document ID from the URL (e.g. /rdg → "rdg")
    const documentId = this.route.snapshot.paramMap.get('documentId') || 'default';

    // Listen for incoming binary messages from the Go backend
    this.messageSub = this.wsService.incomingMessage$.subscribe((data) => {
      this.handleIncomingMessage(data);
    });

    // Connect to the backend WebSocket
    this.wsService.connect(documentId);

    // Send a full snapshot to the server every 5 seconds for persistence
    this.snapshotInterval = setInterval(() => {
      if (this.initialized) {
        this.wsService.send(this.amService.getSnapshot());
      }
    }, 5000);
  }

  ngAfterViewInit(): void {
    const settings = this.settingsService.currentSettings;

    // Create the CodeMirror editor
    this.cmService.createEditor(this.editorHostRef.nativeElement, {
      initialContent: '',
      theme: settings.theme,
      fontSize: settings.fontSize,
      lineNumbers: settings.lineNumbers,
      wordWrap: settings.wordWrap,
      syntaxLanguage: settings.syntaxLanguage,
      onContentChange: (update: ViewUpdate) => this.onCmContentChange(update),
    });

    this.lastSettings = { ...settings };

    // Subscribe to settings changes to reactively update CM
    this.settingsSub = this.settingsService.settings$.subscribe((s) => {
      this.applySettingsDiff(s);
    });
  }

  /**
   * Apply only the settings that actually changed to avoid unnecessary reconfiguration.
   */
  private applySettingsDiff(s: EditorSettings): void {
    const prev = this.lastSettings;

    if (!prev || prev.theme !== s.theme) {
      this.cmService.setTheme(s.theme);
    }
    if (!prev || prev.fontSize !== s.fontSize) {
      this.cmService.setFontSize(s.fontSize);
    }
    if (!prev || prev.lineNumbers !== s.lineNumbers) {
      this.cmService.setLineNumbers(s.lineNumbers);
    }
    if (!prev || prev.wordWrap !== s.wordWrap) {
      this.cmService.setWordWrap(s.wordWrap);
    }
    if (!prev || prev.syntaxLanguage !== s.syntaxLanguage) {
      this.cmService.setLanguage(s.syntaxLanguage);
    }

    this.lastSettings = { ...s };
  }

  /**
   * Handle CodeMirror content changes — compute diff and send to CRDT.
   */
  private onCmContentChange(update: ViewUpdate): void {
    if (this.suppressChangeEvents) return;

    const newText = update.state.doc.toString();

    // If not initialized yet, create the doc first
    if (!this.initialized) {
      this.amService.initEmpty();
      this.initialized = true;
    }

    // Compute the diff between previous text and new text
    const diff = this.computeDiff(this.previousText, newText);

    if (diff.deleteCount > 0 || diff.insertText.length > 0) {
      // Apply the diff to the Automerge CRDT and get the binary change
      const changeMsg = this.amService.applyLocalEdit(diff.pos, diff.deleteCount, diff.insertText);

      if (changeMsg) {
        // Send the change to the server (which relays to other clients)
        this.wsService.send(changeMsg);
      }
    }

    // Update local tracking state
    this.previousText = this.amService.getText();
  }

  /**
   * Handle binary messages from the server.
   * First byte is the message type.
   */
  private handleIncomingMessage(data: Uint8Array): void {
    if (data.length === 0) return;

    const msgType = data[0];
    const payload = data.slice(1);

    switch (msgType) {
      case MSG_TYPE_SNAPSHOT:
        // Full document state from server (sent on initial join)
        this.amService.loadSnapshot(payload);
        this.initialized = true;
        break;

      case MSG_TYPE_CHANGE:
        // Incremental change from another user
        if (!this.initialized) {
          // If we haven't received a snapshot yet, init empty first
          this.amService.initEmpty();
          this.initialized = true;
        }
        this.amService.applyRemoteChange(payload);
        break;

      default:
        console.warn('[Editor] Unknown message type:', msgType);
        return;
    }

    // Update the CodeMirror editor with the CRDT's current text
    this.updateContentFromCRDT();
  }

  /**
   * Sync the CodeMirror content from the Automerge document.
   * Suppresses change events to avoid feedback loops.
   */
  private updateContentFromCRDT(): void {
    const newContent = this.amService.getText();

    this.suppressChangeEvents = true;
    this.cmService.replaceContent(newContent);
    this.suppressChangeEvents = false;

    this.previousText = newContent;
  }

  /**
   * Compute the minimal diff between two strings.
   * Finds the common prefix and suffix, then determines
   * what was inserted/deleted in between.
   */
  private computeDiff(
    oldText: string,
    newText: string,
  ): { pos: number; deleteCount: number; insertText: string } {
    // Find common prefix length
    let prefixLen = 0;
    while (
      prefixLen < oldText.length &&
      prefixLen < newText.length &&
      oldText[prefixLen] === newText[prefixLen]
    ) {
      prefixLen++;
    }

    // Find common suffix length (don't overlap with prefix)
    let oldSuffix = oldText.length;
    let newSuffix = newText.length;
    while (
      oldSuffix > prefixLen &&
      newSuffix > prefixLen &&
      oldText[oldSuffix - 1] === newText[newSuffix - 1]
    ) {
      oldSuffix--;
      newSuffix--;
    }

    return {
      pos: prefixLen,
      deleteCount: oldSuffix - prefixLen,
      insertText: newText.slice(prefixLen, newSuffix),
    };
  }

  ngOnDestroy(): void {
    // Send a final snapshot before disconnecting
    if (this.initialized) {
      this.wsService.send(this.amService.getSnapshot());
    }

    this.messageSub?.unsubscribe();
    this.settingsSub?.unsubscribe();
    this.wsService.disconnect();

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }

    this.cmService.destroy();
  }
}
