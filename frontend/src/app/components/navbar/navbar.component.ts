import { Component, inject } from '@angular/core';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  private modalService = inject(ModalService);

  openSettings(): void {
    this.modalService.openSettings();
  }

  openHelp(): void {
    this.modalService.openHelp();
  }

  copyLink(): void {
    navigator.clipboard.writeText(window.location.href);
  }
}
