import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

import { HelpModalComponent } from './components/help-modal/help-modal.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { ModalService } from './services/modal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    HelpModalComponent,
    SettingsModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private modalService = inject(ModalService);

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    const mod = event.metaKey || event.ctrlKey;

    if (mod && event.key === 'p') {
      event.preventDefault();
      this.modalService.openSettings();
    }

    if (mod && event.shiftKey && event.key === 'C') {
      event.preventDefault();
      navigator.clipboard.writeText(window.location.href);
    }
  }
}
