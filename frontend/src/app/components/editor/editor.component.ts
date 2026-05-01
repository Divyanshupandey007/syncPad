import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { EditorSettingsService } from '../../services/editor-settings.service';
import { WebSocketService } from '../../services/websocket.service';
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
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private messageSub!: Subscription;

  /** The live document content bound to the textarea */
  content = '';

  /** Flag to prevent echo loops (ignore incoming message we just sent) */
  private ignoreNextIncoming = false;

  /** Track line count for the gutter */
  lineCount = 1;

  ngOnInit(): void {
    // Read the document ID from the URL (e.g. /rdg → "rdg")
    const documentId = this.route.snapshot.paramMap.get('documentId') || 'default';
    this.wsService.connect(documentId);

    // Listen for incoming messages from the Go backend
    this.messageSub = this.wsService.incomingMessage$.subscribe((message) => {
      if (this.ignoreNextIncoming) {
        this.ignoreNextIncoming = false;
        return;
      }
      this.content = message;
      this.lineCount = this.content.split('\n').length;
      // Force Angular to re-check and update the DOM immediately
      this.cdr.detectChanges();
    });
  }

  /** Called every time the user types in the textarea */
  onTextInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.content = textarea.value;
    this.lineCount = this.content.split('\n').length;

    // Send the full text to Go, which broadcasts it to all other clients
    this.ignoreNextIncoming = true;
    this.wsService.send(this.content);
  }

  ngOnDestroy(): void {
    this.messageSub?.unsubscribe();
    this.wsService.disconnect();
  }
}
