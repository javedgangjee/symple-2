import { Injectable, signal } from '@angular/core';

/**
 * Says whether the settings panel is open. The header and the shortcut open it, and the panel
 * closes it. The scan, the switch keys, the dwell press and the round cursor read it, so the
 * board behind the panel stays quiet while the caregiver works in the panel.
 */
@Injectable({ providedIn: 'root' })
export class SettingsOpen {
  private readonly current = signal(false);

  readonly isOpen = this.current.asReadonly();

  open(): void {
    this.current.set(true);
  }

  close(): void {
    this.current.set(false);
  }
}
