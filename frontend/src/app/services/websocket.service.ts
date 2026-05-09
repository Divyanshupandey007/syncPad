import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

/** Message type byte constants matching the backend protocol */
export const MSG_TYPE_CHANGE = 0x01;
export const MSG_TYPE_SNAPSHOT = 0x02;

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private ngZone = inject(NgZone);

  /** Emits incoming binary messages from the server */
  readonly incomingMessage$ = new Subject<Uint8Array>();

  /** Tracks the current connection status */
  private statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  readonly status$ = this.statusSubject.asObservable();

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

    // Dynamically build WebSocket URL from current browser location.
    // In Docker (behind Nginx), this connects to the same host:port the page loaded from.
    // Nginx then proxies /ws/ to the Go backend.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // const wsUrl = `${protocol}//${host}/ws/${documentId}`;

    // Create WebSocket outside Angular's zone to avoid unnecessary
    // change detection on every internal WebSocket event.
    // We manually re-enter the zone only when we need Angular to update.
    this.ngZone.runOutsideAngular(() => {
      this.ws = new WebSocket(`${environment.wsUrl}/${documentId}`);
      // Receive binary data as ArrayBuffer (not Blob)
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to document: ${documentId}`);
        this.ngZone.run(() => this.statusSubject.next('connected'));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        // Binary messages arrive as ArrayBuffer
        const data = new Uint8Array(event.data as ArrayBuffer);
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
