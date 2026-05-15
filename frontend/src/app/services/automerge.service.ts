import { Injectable } from '@angular/core';
import { Automerge } from './automerge-init';
import { BehaviorSubject } from 'rxjs';
import { MSG_TYPE_CHANGE, MSG_TYPE_SNAPSHOT } from './websocket.service';

export interface SyncPadDoc {
  [key: string]: unknown;
  text: string;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class AutomergeService {
  private doc: Automerge.Doc<SyncPadDoc> = Automerge.init();

  private titleSubject = new BehaviorSubject<string>('Untitled Document.md');
  title$ = this.titleSubject.asObservable();

  getText(): string {
    return this.doc.text ?? '';
  }

  getTitle(): string {
    return this.doc.title ?? 'Untitled Document.md';
  }

  applyTitleChange(newTitle: string): Uint8Array | null {
    const currentTitle = this.doc.title ?? '';
    if (newTitle === currentTitle) return null;

    this.doc = Automerge.change(this.doc, (d) => {
      Automerge.splice(d, ['title'], 0, currentTitle.length, newTitle);
    });

    this.titleSubject.next(newTitle);

    const change = Automerge.getLastLocalChange(this.doc);
    if (!change) return null;

    const msg = new Uint8Array(1 + change.length);
    msg[0] = MSG_TYPE_CHANGE;
    msg.set(change, 1);
    return msg;
  }

  applyLocalEdit(pos: number, deleteCount: number, insertText: string): Uint8Array | null {
    this.doc = Automerge.change(this.doc, (d) => {
      Automerge.splice(d, ['text'], pos, deleteCount, insertText);
    });

    const change = Automerge.getLastLocalChange(this.doc);
    if (!change) return null;

    const msg = new Uint8Array(1 + change.length);
    msg[0] = MSG_TYPE_CHANGE;
    msg.set(change, 1);
    return msg;
  }

  applyRemoteChange(changeBytes: Uint8Array): void {
    const [newDoc] = Automerge.applyChanges(this.doc, [changeBytes]);
    this.doc = newDoc;
    this.titleSubject.next(this.getTitle());
  }

  loadSnapshot(snapshotBytes: Uint8Array): void {
    if (snapshotBytes.length === 0) return;
    this.doc = Automerge.load<SyncPadDoc>(snapshotBytes);
    this.titleSubject.next(this.getTitle());
  }

  getSnapshot(): Uint8Array {
    const save = Automerge.save(this.doc);
    const msg = new Uint8Array(1 + save.length);
    msg[0] = MSG_TYPE_SNAPSHOT;
    msg.set(save, 1);
    return msg;
  }

  initEmpty(): void {
    this.doc = Automerge.from<SyncPadDoc>({ text: '', title: 'Untitled Document.md' });
    this.titleSubject.next('Untitled Document.md');
  }
}
