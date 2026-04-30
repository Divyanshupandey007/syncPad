import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface EditorSettings {
  theme: 'dark' | 'light';
  fontFamily: string;
  fontSize: number;
  syntaxLanguage: string;
  lineNumbers: boolean;
  wordWrap: boolean;
}

const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'dark',
  fontFamily: 'JetBrains Mono',
  fontSize: 15,
  syntaxLanguage: 'JavaScript',
  lineNumbers: true,
  wordWrap: false,
};

@Injectable({ providedIn: 'root' })
export class EditorSettingsService {
  private readonly STORAGE_KEY = 'syncpad-editor-settings';
  private settingsSubject = new BehaviorSubject<EditorSettings>(this.loadSettings());

  settings$ = this.settingsSubject.asObservable();

  get currentSettings(): EditorSettings {
    return this.settingsSubject.value;
  }

  updateSettings(partial: Partial<EditorSettings>): void {
    const updated = { ...this.settingsSubject.value, ...partial };
    this.settingsSubject.next(updated);
    this.saveSettings(updated);
  }

  resetDefaults(): void {
    this.settingsSubject.next({ ...DEFAULT_SETTINGS });
    this.saveSettings(DEFAULT_SETTINGS);
  }

  private loadSettings(): EditorSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch { /* ignore parse errors */ }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(settings: EditorSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore storage errors */ }
  }
}
