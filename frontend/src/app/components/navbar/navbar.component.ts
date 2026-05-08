import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ModalService } from '../../services/modal.service';
import { EditorSettingsService } from '../../services/editor-settings.service';
import { AutomergeService } from '../../services/automerge.service';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private settingsService = inject(EditorSettingsService);
  private amService = inject(AutomergeService);
  private wsService = inject(WebSocketService);
  private settingsSub!: Subscription;
  private titleSub!: Subscription;

  /** Editable document title */
  documentTitle = 'Untitled Document.md';

  /** Font size from settings — live bound */
  fontSize = 15;

  /** Current theme */
  isDarkMode = true;

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

  ngOnDestroy(): void {
    this.settingsSub?.unsubscribe();
    this.titleSub?.unsubscribe();
  }
}
