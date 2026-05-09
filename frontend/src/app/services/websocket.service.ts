import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';


export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

/** Message type byte constants matching the backend protocol */
export const MSG_TYPE_CHANGE = 0x01;
export const MSG_TYPE_SNAPSHOT = 0x02;
export const MSG_TYPE_PRESENCE = 0x03;

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private ngZone = inject(NgZone);

  /** Emits incoming binary messages from the server */
  readonly incomingMessage$ = new Subject<Uint8Array>();

  /** Tracks the current connection status */
  private statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  readonly status$ = this.statusSubject.asObservable();

  /** Tracks the number of collaborators on the current document */
  private collaboratorCountSubject = new BehaviorSubject<number>(1);
  readonly collaboratorCount$ = this.collaboratorCountSubject.asObservable();

  /** The document ID we are currently connected to */
  private currentDocId: string | null = null;

  /**
   * Opens a WebSocket connection to the Go backend for the given document.
   * If already connected to this document, does nothing.
   */
  connect(documentId: string): void {
    // Avoid duplicate connections to the same document
    if (this.ws && this.currentDocId === documentId) {
      return;
    }

    // Close any existing connection first
    this.disconnect();

    this.currentDocId = documentId;
    this.statusSubject.next('connecting');

    // Derive WebSocket URL from the browser's current location at runtime.
    // This makes the SAME build work in every environment:
    //   • Docker Compose: browser on localhost:80 → ws://localhost/ws/docId (nginx proxies to backend)
    //   • Production:     browser on syncpad.com  → wss://syncpad.com/ws/docId
    //   • ng serve:       browser on localhost:4200 → ws://localhost:3000/ws/docId (direct to Go backend)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const isDevServer = host.includes(':4200');
    const wsBase = isDevServer
      ? `${protocol}//localhost:3000/ws`        // ng serve — connect directly to Go backend
      : `${protocol}//${host}/ws`;              // Docker / production — nginx proxies /ws/

    // Create WebSocket outside Angular's zone to avoid unnecessary
    // change detection on every internal WebSocket event.
    // We manually re-enter the zone only when we need Angular to update.
    this.ngZone.runOutsideAngular(() => {
      this.ws = new WebSocket(`${wsBase}/${documentId}`);
      // Receive binary data as ArrayBuffer (not Blob)
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to document: ${documentId}`);
        this.ngZone.run(() => this.statusSubject.next('connected'));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        // Binary messages arrive as ArrayBuffer
        const data = new Uint8Array(event.data as ArrayBuffer);
        // Intercept presence messages (type 0x03) — don't forward to CRDT
        if (data.length >= 2 && data[0] === MSG_TYPE_PRESENCE) {
          this.ngZone.run(() => this.collaboratorCountSubject.next(data[1]));
          return;
        }
        this.ngZone.run(() => this.incomingMessage$.next(data));
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        this.ngZone.run(() => this.statusSubject.next('disconnected'));
        this.ws = null;
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.ngZone.run(() => this.statusSubject.next('disconnected'));
      };
    });
  }

  /** Send binary data to the Go backend */
  send(data: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  /** Cleanly close the WebSocket connection */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.currentDocId = null;
      this.statusSubject.next('disconnected');
    }
  }
}
