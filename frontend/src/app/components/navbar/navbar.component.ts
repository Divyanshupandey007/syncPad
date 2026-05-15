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

  documentTitle = 'Untitled Document.md';
  fontSize = 15;
  isDarkMode = true;
  status$ = this.wsService.status$;
  collaboratorCount$ = this.wsService.collaboratorCount$;

  private isEditingTitle = false;

  ngOnInit(): void {
    this.settingsSub = this.settingsService.settings$.subscribe(s => {
      this.fontSize = s.fontSize;
      this.isDarkMode = s.theme === 'dark';
    });

    // Don't overwrite title while user is actively editing it
    this.titleSub = this.amService.title$.subscribe(title => {
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
    this.documentTitle = (event.target as HTMLInputElement).value;
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
    const changeMsg = this.amService.applyTitleChange(this.documentTitle);
    if (changeMsg) {
      this.wsService.send(changeMsg);
    }
  }

  toggleTheme(): void {
    this.settingsService.updateSettings({ theme: this.isDarkMode ? 'light' : 'dark' });
  }

  onFontSizeChange(event: Event): void {
    this.settingsService.updateSettings({ fontSize: +(event.target as HTMLInputElement).value });
  }

  openSettings(): void { this.modalService.openSettings(); }
  openHelp(): void { this.modalService.openHelp(); }
  copyLink(): void { navigator.clipboard.writeText(window.location.href); }

  downloadFile(): void {
    const content = this.cmService.getContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
