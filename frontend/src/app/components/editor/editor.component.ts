import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { EditorSettingsService } from '../../services/editor-settings.service';

interface EditorLine {
  number: number;
  content: string;
  type: 'heading' | 'text' | 'text-active' | 'blank' | 'code-fence' | 'code-keyword';
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent {
  settingsService = inject(EditorSettingsService);
  settings$ = this.settingsService.settings$;

  lines: EditorLine[] = [
    { number: 1, content: '# Project SyncPad Architecture', type: 'heading' },
    { number: 2, content: '', type: 'blank' },
    { number: 3, content: 'The core engine relies on a distributed state graph to ensure', type: 'text' },
    { number: 4, content: 'low-latency synchronization across multiple client sessions.', type: 'text-active' },
    { number: 5, content: '', type: 'blank' },
    { number: 6, content: '```javascript', type: 'code-fence' },
    { number: 7, content: 'function initializeSync() {', type: 'code-keyword' },
  ];

  activeLine = 4;
}
