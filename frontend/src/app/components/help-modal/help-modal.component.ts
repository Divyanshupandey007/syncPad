import { Component, inject, HostListener } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './help-modal.component.html',
  styleUrls: ['./help-modal.component.scss'],
})
export class HelpModalComponent {
  modalService = inject(ModalService);
  isOpen$ = this.modalService.helpOpen$;

  close(): void {
    this.modalService.closeHelp();
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
