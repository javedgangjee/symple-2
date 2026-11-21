import { Injectable, inject, signal } from '@angular/core';
import { LocalStore } from '../storage/local-store';

/** The two layouts. In `columns` each group of cells is a column. In `rows` each group is a row. */
export const LAYOUT_NAMES = ['columns', 'rows'] as const;

export type LayoutName = (typeof LAYOUT_NAMES)[number];

/** The local storage key that holds the chosen layout. */
export const LAYOUT_STORAGE_KEY = 'symple.layout';

/** The layout used when nothing usable is stored. */
export const DEFAULT_LAYOUT: LayoutName = 'columns';

export function isLayoutName(value: unknown): value is LayoutName {
  return LAYOUT_NAMES.some((name) => name === value);
}

/**
 * Reads the stored layout for the screens that do not fix their own.
 * Feature 8 adds the picker that calls `set`.
 */
@Injectable({ providedIn: 'root' })
export class Layout {
  private readonly store = inject(LocalStore);
  private readonly current = signal<LayoutName>(DEFAULT_LAYOUT);

  /** The layout in use. */
  readonly name = this.current.asReadonly();

  /** Reads the stored layout. Columns are used when the value is missing or unknown, or when storage fails. */
  load(): void {
    const stored = this.store.read(LAYOUT_STORAGE_KEY);
    this.current.set(isLayoutName(stored) ? stored : DEFAULT_LAYOUT);
  }

  /** Uses a layout and stores it. The layout is used even when storage fails. */
  set(name: LayoutName): void {
    this.current.set(name);
    this.store.write(LAYOUT_STORAGE_KEY, name);
  }
}
