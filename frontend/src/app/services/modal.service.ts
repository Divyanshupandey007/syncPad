import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private helpOpenSubject = new BehaviorSubject<boolean>(false);
  private settingsOpenSubject = new BehaviorSubject<boolean>(false);

  helpOpen$ = this.helpOpenSubject.asObservable();
  settingsOpen$ = this.settingsOpenSubject.asObservable();

  openHelp(): void {
    this.settingsOpenSubject.next(false);
    this.helpOpenSubject.next(true);
  }

  closeHelp(): void {
    this.helpOpenSubject.next(false);
  }

  openSettings(): void {
    this.helpOpenSubject.next(false);
    this.settingsOpenSubject.next(true);
  }

  closeSettings(): void {
    this.settingsOpenSubject.next(false);
  }

  closeAll(): void {
    this.helpOpenSubject.next(false);
    this.settingsOpenSubject.next(false);
  }
}
