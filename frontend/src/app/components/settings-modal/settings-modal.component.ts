import { Component, inject, HostListener } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { EditorSettingsService, EditorSettings } from '../../services/editor-settings.service';
import { CodeMirrorService } from '../../services/codemirror.service';
import { FormatterService } from '../../services/formatter.service';

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
  private cmService = inject(CodeMirrorService);
  private formatterService = inject(FormatterService);

  isOpen$ = this.modalService.settingsOpen$;

  // Local copies for two-way binding
  syntaxLanguage = 'JavaScript';
  lineNumbers = true;
  wordWrap = false;

  /** Full list of supported languages from CodeMirror */
  languages: string[] = [];

  /** Whether the current language supports Prettier formatting */
  canFormat = false;

  /** Formatting in progress flag */
  isFormatting = false;

  /** Status message after formatting */
  formatStatus: string | null = null;

  constructor() {
    // Build sorted language list from CM6's language-data
    this.languages = this.cmService.getLanguageNames();

    this.settingsService.settings$.subscribe(s => {
      this.syntaxLanguage = s.syntaxLanguage;
      this.lineNumbers = s.lineNumbers;
      this.wordWrap = s.wordWrap;
      this.updateCanFormat();
    });
  }

  onLanguageChange(): void {
    this.updateCanFormat();
    this.cmService.setLanguage(this.syntaxLanguage);
  }

  private updateCanFormat(): void {
    this.canFormat = this.formatterService.isFormattingSupported(this.syntaxLanguage);
  }

  async formatCode(): Promise<void> {
    this.isFormatting = true;
    this.formatStatus = null;

    try {
      const currentCode = this.cmService.getContent();
      if (!currentCode.trim()) {
        this.formatStatus = 'Nothing to format';
        this.isFormatting = false;
        return;
      }

      const formatted = await this.formatterService.formatCode(currentCode, this.syntaxLanguage);

      if (formatted !== currentCode) {
        this.cmService.replaceContent(formatted);
        this.formatStatus = '✓ Formatted successfully';
      } else {
        this.formatStatus = '✓ Already formatted';
      }
    } catch {
      this.formatStatus = '✗ Formatting failed';
    }

    this.isFormatting = false;

    // Clear status after 3 seconds
    setTimeout(() => {
      this.formatStatus = null;
    }, 3000);
  }

  save(): void {
    this.settingsService.updateSettings({
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
