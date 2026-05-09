import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

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

    // Derive WebSocket URL based on the deployment environment:
    //
    //   1. ng serve (localhost:4200)
    //      → connect directly to Go backend on localhost:3000
    //
    //   2. Docker Compose (localhost / localhost:80)
    //      → nginx reverse-proxies /ws/ to the Go backend container
    //      → derive URL from window.location (same-origin)
    //
    //   3. Production split-hosting (Cloudflare Pages + Render)
    //      → static CDN can't proxy WebSockets
    //      → use the explicit backend URL from environment.prod.ts
    //
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const isLocal = host === 'localhost' || host.startsWith('localhost:') || host.startsWith('127.0.0.1');

    let wsBase: string;
    if (host.includes(':4200')) {
      // ng serve dev server — connect directly to Go backend
      wsBase = `${protocol}//localhost:3000/ws`;
    } else if (isLocal) {
      // Docker Compose — nginx proxies /ws/ to the backend container
      wsBase = `${protocol}//${host}/ws`;
    } else if (environment.backendWsUrl) {
      // Production with separate backend domain (e.g. Cloudflare Pages → Render)
      wsBase = environment.backendWsUrl;
    } else {
      // Fallback: same-origin (frontend + backend behind same reverse proxy)
      wsBase = `${protocol}//${host}/ws`;
    }

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
