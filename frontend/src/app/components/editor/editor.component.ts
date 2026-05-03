import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { EditorSettingsService } from '../../services/editor-settings.service';
import { WebSocketService, MSG_TYPE_CHANGE, MSG_TYPE_SNAPSHOT } from '../../services/websocket.service';
import { AutomergeService } from '../../services/automerge.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements OnInit, OnDestroy {
  settingsService = inject(EditorSettingsService);
  settings$ = this.settingsService.settings$;

  private wsService = inject(WebSocketService);
  private amService = inject(AutomergeService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private messageSub!: Subscription;
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;

  /** The live document content bound to the textarea */
  content = '';

  /** Track line count for the gutter */
  lineCount = 1;

  /** Whether the initial document state has been received */
  private initialized = false;

  /** Previous text value for computing diffs */
  private previousText = '';

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

    // Update the textarea with the CRDT's current text
    this.updateContentFromCRDT();
  }

  /**
   * Sync the textarea content from the Automerge document.
   * Preserves cursor position as best as possible.
   */
  private updateContentFromCRDT(): void {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement | null;
    const cursorPos = textarea?.selectionStart ?? 0;

    this.content = this.amService.getText();
    this.previousText = this.content;
    this.lineCount = this.content.split('\n').length;

    // Force Angular to re-check and update the DOM immediately
    this.cdr.detectChanges();

    // Restore cursor position after DOM update
    if (textarea) {
      const newPos = Math.min(cursorPos, this.content.length);
      textarea.setSelectionRange(newPos, newPos);
    }
  }

  /** Called every time the user types in the textarea */
  onTextInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const newText = textarea.value;

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
    this.content = this.amService.getText();
    this.previousText = this.content;
    this.lineCount = this.content.split('\n').length;
  }

  /**
   * Compute the minimal diff between two strings.
   * Finds the common prefix and suffix, then determines
   * what was inserted/deleted in between.
   */
  private computeDiff(
    oldText: string,
    newText: string
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
    this.wsService.disconnect();

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }
  }
}
