import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ModalService } from '../../services/modal.service';
import { EditorSettingsService } from '../../services/editor-settings.service';
import { AutomergeService } from '../../services/automerge.service';
import { WebSocketService } from '../../services/websocket.service';
import { CodeMirrorService } from '../../services/codemirror.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private settingsService = inject(EditorSettingsService);
  private amService = inject(AutomergeService);
  private wsService = inject(WebSocketService);
  private cmService = inject(CodeMirrorService);
  private cdr = inject(ChangeDetectorRef);
  private settingsSub!: Subscription;
  private titleSub!: Subscription;

  /** Editable document title */
  documentTitle = 'Untitled Document.md';

  /** Font size from settings — live bound */
  fontSize = 15;

  /** Current theme */
  isDarkMode = true;

  /** Connection status observable for the template */
  status$ = this.wsService.status$;

  /** Collaborator count observable for the template */
  collaboratorCount$ = this.wsService.collaboratorCount$;

  /** Whether user is currently editing the title */
  private isEditingTitle = false;

  ngOnInit(): void {
    // Sync font size and theme from settings service
    this.settingsSub = this.settingsService.settings$.subscribe(s => {
      this.fontSize = s.fontSize;
      this.isDarkMode = s.theme === 'dark';
    });

    // Subscribe to live title changes from the Automerge CRDT
    // (fires on remote edits, snapshot loads, and local changes)
    this.titleSub = this.amService.title$.subscribe(title => {
      // Only update the input if the user is NOT currently typing a new title
      if (!this.isEditingTitle) {
        this.documentTitle = title;
        this.cdr.markForCheck();
      }
    });
  }

  onTitleFocus(): void {
    this.isEditingTitle = true;
  }

  onTitleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.documentTitle = input.value;
  }

  onTitleBlur(): void {
    this.isEditingTitle = false;
    this.saveTitle();
  }

  onTitleEnter(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  private saveTitle(): void {
    if (!this.documentTitle.trim()) {
      this.documentTitle = 'Untitled Document.md';
    }
    // Push title into the Automerge CRDT and send over WebSocket
    const changeMsg = this.amService.applyTitleChange(this.documentTitle);
    if (changeMsg) {
      this.wsService.send(changeMsg);
    }
  }

  toggleTheme(): void {
    const newTheme = this.isDarkMode ? 'light' : 'dark';
    this.settingsService.updateSettings({ theme: newTheme });
  }

  onFontSizeChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.settingsService.updateSettings({ fontSize: value });
  }

  openSettings(): void {
    this.modalService.openSettings();
  }

  openHelp(): void {
    this.modalService.openHelp();
  }

  copyLink(): void {
    navigator.clipboard.writeText(window.location.href);
  }

  /** Download the pad content as a .txt file */
  downloadFile(): void {
    const content = this.cmService.getContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    // Use the document title as the filename (strip .md if present, add .txt)
    let filename = this.documentTitle.trim() || 'Untitled Document';
    filename = filename.replace(/\.md$/i, '');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
    this.titleSub?.unsubscribe();
  }
}
