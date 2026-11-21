import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { LocalStore } from '../storage/local-store';

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
 * Reads the stored theme and applies it to the page. Feature 8 adds the picker that calls `set`.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(LocalStore);
  private readonly current = signal<ThemeName>(DEFAULT_THEME);

  /** The theme in use. */
  readonly name = this.current.asReadonly();

  /** Reads the stored theme and applies it. Blue is used when the value is missing or unknown, or when storage fails. */
  load(): void {
    const stored = this.store.read(THEME_STORAGE_KEY);
    this.apply(isThemeName(stored) ? stored : DEFAULT_THEME);
  }

  /** Applies a theme and stores it. The theme is applied even when storage fails. */
  set(name: ThemeName): void {
    this.apply(name);
    this.store.write(THEME_STORAGE_KEY, name);
  }

  private apply(name: ThemeName): void {
    this.current.set(name);
    this.document.documentElement.setAttribute('data-theme', name);
  }
}
