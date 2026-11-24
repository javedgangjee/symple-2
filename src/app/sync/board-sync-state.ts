import { Injectable, signal } from '@angular/core';

/**
 * What the board sync has to tell the caregiver. It is a service of its own, so a screen can
 * read it without the cloud store that the sync needs.
 */
@Injectable({ providedIn: 'root' })
export class BoardSyncState {
  /**
   * Whether the boards document of the account holds a set that this version cannot read, such
   * as one that a newer version saved. While it does, the changes of this device are not saved.
   */
  readonly unreadable = signal(false);
}
