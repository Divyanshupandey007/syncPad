import { Component, inject, HostListener } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { EditorSettingsService, EditorSettings } from '../../services/editor-settings.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [AsyncPipe, FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss'],
})
export class SettingsModalComponent {
  modalService = inject(ModalService);
  settingsService = inject(EditorSettingsService);

  isOpen$ = this.modalService.settingsOpen$;

  // Local copies for two-way binding
  theme: 'dark' | 'light' = 'dark';
  fontFamily = 'JetBrains Mono';
  fontSize = 15;
  syntaxLanguage = 'JavaScript';
  lineNumbers = true;
  wordWrap = false;

  fontFamilies = ['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Consolas'];
  languages = ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Python', 'Markdown'];

  constructor() {
    this.settingsService.settings$.subscribe(s => {
      this.theme = s.theme;
      this.fontFamily = s.fontFamily;
      this.fontSize = s.fontSize;
      this.syntaxLanguage = s.syntaxLanguage;
      this.lineNumbers = s.lineNumbers;
      this.wordWrap = s.wordWrap;
    });
  }

  get isDarkMode(): boolean {
    return this.theme === 'dark';
  }

  set isDarkMode(val: boolean) {
    this.theme = val ? 'dark' : 'light';
  }

  save(): void {
    this.settingsService.updateSettings({
      theme: this.theme,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      syntaxLanguage: this.syntaxLanguage,
      lineNumbers: this.lineNumbers,
      wordWrap: this.wordWrap,
    });
    this.modalService.closeSettings();
  }

  resetDefaults(): void {
    this.settingsService.resetDefaults();
  }

  close(): void {
    this.modalService.closeSettings();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
