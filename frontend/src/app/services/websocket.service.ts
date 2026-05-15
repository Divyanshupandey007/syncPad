import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export const MSG_TYPE_CHANGE = 0x01;
export const MSG_TYPE_SNAPSHOT = 0x02;
export const MSG_TYPE_PRESENCE = 0x03;

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private ngZone = inject(NgZone);

  readonly incomingMessage$ = new Subject<Uint8Array>();

  private statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  readonly status$ = this.statusSubject.asObservable();

  private collaboratorCountSubject = new BehaviorSubject<number>(1);
  readonly collaboratorCount$ = this.collaboratorCountSubject.asObservable();

  private currentDocId: string | null = null;

  connect(documentId: string): void {
    if (this.ws && this.currentDocId === documentId) return;
    this.disconnect();

    this.currentDocId = documentId;
    this.statusSubject.next('connecting');

    // Derive WS URL based on environment:
    // - :4200 → ng serve, direct to Go backend on :3000
    // - localhost → Docker, nginx proxies /ws/
    // - production → explicit backend URL from env config
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const isLocal = host === 'localhost' || host.startsWith('localhost:') || host.startsWith('127.0.0.1');

    let wsBase: string;
    if (host.includes(':4200')) {
      wsBase = `${protocol}//localhost:3000/ws`;
    } else if (isLocal) {
      wsBase = `${protocol}//${host}/ws`;
    } else if (environment.backendWsUrl) {
      wsBase = environment.backendWsUrl;
    } else {
      wsBase = `${protocol}//${host}/ws`;
    }

    // Run outside Angular zone to avoid unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      this.ws = new WebSocket(`${wsBase}/${documentId}`);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to document: ${documentId}`);
        this.ngZone.run(() => this.statusSubject.next('connected'));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
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

  send(data: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.currentDocId = null;
      this.statusSubject.next('disconnected');
    }
  }
}
