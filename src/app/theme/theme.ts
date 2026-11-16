import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/** The five colour themes. Each name is also the value of `data-theme` on the html element. */
export const THEME_NAMES = ['colours', 'blue', 'purple', 'teal', 'dark'] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

/** The local storage key that holds the chosen theme. */
export const THEME_STORAGE_KEY = 'symple.theme';

/** The theme used when nothing usable is stored. */
export const DEFAULT_THEME: ThemeName = 'blue';

function isThemeName(value: unknown): value is ThemeName {
  return THEME_NAMES.some((name) => name === value);
}

/**
 * Reads the stored theme and applies it to the page. Feature 7 adds the picker that calls `set`.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<ThemeName>(DEFAULT_THEME);

  /** The theme in use. */
  readonly name = this.current.asReadonly();

  /** Reads the stored theme and applies it. Blue is used when the value is missing or unknown, or when storage fails. */
  load(): void {
    const stored = this.readStored();
    this.apply(isThemeName(stored) ? stored : DEFAULT_THEME);
  }

  /** Applies a theme and stores it. The theme is applied even when storage fails. */
  set(name: ThemeName): void {
    this.apply(name);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, name);
    } catch {
      // Storage can be full or blocked. The theme still applies for this session.
    }
  }

  private apply(name: ThemeName): void {
    this.current.set(name);
    this.document.documentElement.setAttribute('data-theme', name);
  }

  private readStored(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
    } catch {
      // Storage can be blocked. The default theme is used.
      return null;
    }
  }
}
