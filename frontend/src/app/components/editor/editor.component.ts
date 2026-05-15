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

  private initialized = false;
  private previousText = '';
  private suppressChangeEvents = false;
  private lastSettings: EditorSettings | null = null;

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId') || 'default';

    this.messageSub = this.wsService.incomingMessage$.subscribe((data) => {
      this.handleIncomingMessage(data);
    });

    this.wsService.connect(documentId);

    // Periodically send full snapshot for persistence
    this.snapshotInterval = setInterval(() => {
      if (this.initialized) {
        this.wsService.send(this.amService.getSnapshot());
      }
    }, 5000);
  }

  ngAfterViewInit(): void {
    const settings = this.settingsService.currentSettings;

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

    this.settingsSub = this.settingsService.settings$.subscribe((s) => {
      this.applySettingsDiff(s);
    });
  }

  /** Only reconfigure settings that actually changed */
  private applySettingsDiff(s: EditorSettings): void {
    const prev = this.lastSettings;

    if (!prev || prev.theme !== s.theme) this.cmService.setTheme(s.theme);
    if (!prev || prev.fontSize !== s.fontSize) this.cmService.setFontSize(s.fontSize);
    if (!prev || prev.lineNumbers !== s.lineNumbers) this.cmService.setLineNumbers(s.lineNumbers);
    if (!prev || prev.wordWrap !== s.wordWrap) this.cmService.setWordWrap(s.wordWrap);
    if (!prev || prev.syntaxLanguage !== s.syntaxLanguage) this.cmService.setLanguage(s.syntaxLanguage);

    this.lastSettings = { ...s };
  }

  private onCmContentChange(update: ViewUpdate): void {
    if (this.suppressChangeEvents) return;

    const newText = update.state.doc.toString();

    if (!this.initialized) {
      this.amService.initEmpty();
      this.initialized = true;
    }

    const diff = this.computeDiff(this.previousText, newText);

    if (diff.deleteCount > 0 || diff.insertText.length > 0) {
      const changeMsg = this.amService.applyLocalEdit(diff.pos, diff.deleteCount, diff.insertText);
      if (changeMsg) {
        this.wsService.send(changeMsg);
      }
    }

    this.previousText = this.amService.getText();
  }

  private handleIncomingMessage(data: Uint8Array): void {
    if (data.length === 0) return;

    const msgType = data[0];
    const payload = data.slice(1);

    switch (msgType) {
      case MSG_TYPE_SNAPSHOT:
        this.amService.loadSnapshot(payload);
        this.initialized = true;
        break;

      case MSG_TYPE_CHANGE:
        if (!this.initialized) {
          this.amService.initEmpty();
          this.initialized = true;
        }
        this.amService.applyRemoteChange(payload);
        break;

      default:
        console.warn('[Editor] Unknown message type:', msgType);
        return;
    }

    this.updateContentFromCRDT();
  }

  /** Sync CodeMirror from Automerge, suppressing events to avoid feedback loops */
  private updateContentFromCRDT(): void {
    const newContent = this.amService.getText();

    this.suppressChangeEvents = true;
    this.cmService.replaceContent(newContent);
    this.suppressChangeEvents = false;

    this.previousText = newContent;
  }

  /** Compute minimal diff between two strings (common prefix/suffix) */
  private computeDiff(
    oldText: string,
    newText: string,
  ): { pos: number; deleteCount: number; insertText: string } {
    let prefixLen = 0;
    while (
      prefixLen < oldText.length &&
      prefixLen < newText.length &&
      oldText[prefixLen] === newText[prefixLen]
    ) {
      prefixLen++;
    }

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
