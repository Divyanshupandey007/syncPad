import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss'],
})
export class StatusBarComponent {
  private wsService = inject(WebSocketService);
  status$ = this.wsService.status$;
}
