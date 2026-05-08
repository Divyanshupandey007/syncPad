import { Injectable } from '@angular/core';
import { Automerge } from './automerge-init';
import { BehaviorSubject } from 'rxjs';
import { MSG_TYPE_CHANGE, MSG_TYPE_SNAPSHOT } from './websocket.service';

/** The shape of our Automerge CRDT document */
export interface SyncPadDoc {
  [key: string]: unknown;
  text: string;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class AutomergeService {
  private doc: Automerge.Doc<SyncPadDoc> = Automerge.init();

  /** Observable title — navbar subscribes to this for live updates */
  private titleSubject = new BehaviorSubject<string>('Untitled Document.md');
  title$ = this.titleSubject.asObservable();

  /** Get the current text from the CRDT document */
  getText(): string {
    return this.doc.text ?? '';
  }

  /** Get the current title from the CRDT document */
  getTitle(): string {
    return this.doc.title ?? 'Untitled Document.md';
  }

  /**
   * Apply a local title change to the Automerge document.
   * Returns the binary change to send over WebSocket (prefixed with 0x01),
   * or null if nothing changed.
   */
  applyTitleChange(newTitle: string): Uint8Array | null {
    const currentTitle = this.doc.title ?? '';
    if (newTitle === currentTitle) return null;

    this.doc = Automerge.change(this.doc, (d) => {
      // Use splice on the title string: delete everything, insert new title
      Automerge.splice(d, ['title'], 0, currentTitle.length, newTitle);
    });

    this.titleSubject.next(newTitle);

    const change = Automerge.getLastLocalChange(this.doc);
    if (!change) return null;

    // Prepend message type byte 0x01 (change)
    const msg = new Uint8Array(1 + change.length);
    msg[0] = MSG_TYPE_CHANGE;
    msg.set(change, 1);
    return msg;
  }

  /**
   * Apply a local text edit to the Automerge document.
   * Returns the binary change to send over WebSocket (prefixed with 0x01),
   * or null if nothing changed.
   */
  applyLocalEdit(pos: number, deleteCount: number, insertText: string): Uint8Array | null {
    this.doc = Automerge.change(this.doc, (d) => {
      Automerge.splice(d, ['text'], pos, deleteCount, insertText);
    });

    const change = Automerge.getLastLocalChange(this.doc);
    if (!change) return null;

    // Prepend message type byte 0x01 (change)
    const msg = new Uint8Array(1 + change.length);
    msg[0] = MSG_TYPE_CHANGE;
    msg.set(change, 1);
    return msg;
  }

  /**
   * Apply a remote binary change received from the server.
   * The raw payload (without the type byte) is expected.
   */
  applyRemoteChange(changeBytes: Uint8Array): void {
    const [newDoc] = Automerge.applyChanges(this.doc, [changeBytes]);
    this.doc = newDoc;
    // Emit updated title in case a remote user changed it
    this.titleSubject.next(this.getTitle());
  }

  /**
   * Load a full snapshot received from the server.
   * The raw payload (without the type byte) is expected.
   */
  loadSnapshot(snapshotBytes: Uint8Array): void {
    if (snapshotBytes.length === 0) return;
    this.doc = Automerge.load<SyncPadDoc>(snapshotBytes);
    // Emit updated title from the loaded snapshot
    this.titleSubject.next(this.getTitle());
  }

  /**
   * Generate a full snapshot to send to the server for persistence.
   * Returns the binary snapshot prefixed with 0x02.
   */
  getSnapshot(): Uint8Array {
    const save = Automerge.save(this.doc);
    const msg = new Uint8Array(1 + save.length);
    msg[0] = MSG_TYPE_SNAPSHOT;
    msg.set(save, 1);
    return msg;
  }

  /**
   * Initialize a fresh document with empty text and default title.
   * Called when no server snapshot is available.
   */
  initEmpty(): void {
    this.doc = Automerge.from<SyncPadDoc>({ text: '', title: 'Untitled Document.md' });
    this.titleSubject.next('Untitled Document.md');
  }
}
