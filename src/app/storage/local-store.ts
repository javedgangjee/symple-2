import { DOCUMENT, Injectable, inject } from '@angular/core';

/**
 * Reads and writes the local storage of the device. Storage can be blocked or full, so neither
 * method throws. A service that keeps a setting on the device uses this.
 */
@Injectable({ providedIn: 'root' })
export class LocalStore {
  private readonly document = inject(DOCUMENT);

  /** The text stored under a key. It is null when nothing is stored or when storage fails. */
  read(key: string): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      // Storage can be blocked. The caller then uses its default.
      return null;
    }
  }

  /** Stores a text under a key. When storage fails, nothing is stored. */
  write(key: string, text: string): void {
    try {
      this.document.defaultView?.localStorage.setItem(key, text);
    } catch {
      // Storage can be full or blocked. The value still applies for this session.
    }
  }
}
