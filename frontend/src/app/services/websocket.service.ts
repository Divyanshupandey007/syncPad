import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private ngZone = inject(NgZone);

  /** Emits incoming text messages from the server */
  readonly incomingMessage$ = new Subject<string>();

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

    const wsUrl = `ws://localhost:3000/ws/${documentId}`;

    // Create WebSocket outside Angular's zone to avoid unnecessary
    // change detection on every internal WebSocket event.
    // We manually re-enter the zone only when we need Angular to update.
    this.ngZone.runOutsideAngular(() => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to document: ${documentId}`);
        this.ngZone.run(() => this.statusSubject.next('connected'));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        // Re-enter Angular's zone so subscribers trigger change detection
        this.ngZone.run(() => this.incomingMessage$.next(event.data));
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

  /** Send text content to the Go backend */
  send(data: string): void {
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
