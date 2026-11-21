import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';

/**
 * The ways the primary user can select. `scan` is for one switch and `step` is for two.
 * In `cursor`, `touch` and `dwell` the user presses a cell with a pointer or a finger.
 */
export const SELECTION_MODES = ['scan', 'step', 'cursor', 'touch', 'dwell'] as const;
export type SelectionMode = (typeof SELECTION_MODES)[number];

/** The ways a cell shows the dwell time running. */
export const DWELL_STYLES = ['grow', 'bar'] as const;
export type DwellStyle = (typeof DWELL_STYLES)[number];

/** The six stored values. The times are in milliseconds. */
export interface ScanSettingValues {
  /** How long the highlight stays on a group or a cell in `scan` mode. */
  readonly scanTime: number;
  /** How long the app ignores presses after a pick. */
  readonly postClickDelay: number;
  readonly selectionMode: SelectionMode;
  /** How long the pointer rests on a cell before the cell is pressed in `dwell` mode. */
  readonly dwellTime: number;
  readonly dwellStyle: DwellStyle;
  /** Whether the highlight shows the bar that counts down the scan time in `scan` mode. */
  readonly showProgressBar: boolean;
}

/** The local storage key of each value. */
export const SCAN_STORAGE_KEYS = {
  scanTime: 'symple.scanTime',
  postClickDelay: 'symple.postClickDelay',
  selectionMode: 'symple.selectionMode',
  dwellTime: 'symple.dwellTime',
  dwellStyle: 'symple.dwellStyle',
  showProgressBar: 'symple.showProgressBar',
} as const satisfies Record<keyof ScanSettingValues, string>;

/** The values used when nothing usable is stored. */
export const DEFAULT_SCAN_SETTINGS: ScanSettingValues = {
  scanTime: 1500,
  postClickDelay: 500,
  selectionMode: 'scan',
  dwellTime: 1000,
  dwellStyle: 'grow',
  showProgressBar: false,
};

/** Whether the mode is one where Tab and Enter are switches and the app highlights the groups and the cells. */
export function isSwitchMode(mode: SelectionMode): boolean {
  return mode === 'scan' || mode === 'step';
}

/** Reads one stored text as a value. It gives `undefined` for a text that is not a usable value. */
type Parser<T> = (stored: string) => T | undefined;

/** A whole number of milliseconds from `min` to `max`. */
function time(min: number, max: number): Parser<number> {
  return (stored) => {
    if (!/^\d+$/.test(stored)) {
      return undefined;
    }
    const value = Number(stored);
    return value >= min && value <= max ? value : undefined;
  };
}

/** One of a list of names. */
function oneOf<T extends string>(names: readonly T[]): Parser<T> {
  return (stored) => names.find((name) => name === stored);
}

/** A yes or a no, stored as `true` or `false`. */
const yesOrNo: Parser<boolean> = (stored) =>
  stored === 'true' ? true : stored === 'false' ? false : undefined;

const PARSERS: { readonly [K in keyof ScanSettingValues]: Parser<ScanSettingValues[K]> } = {
  scanTime: time(500, 5000),
  postClickDelay: time(0, 5000),
  selectionMode: oneOf(SELECTION_MODES),
  dwellTime: time(500, 5000),
  dwellStyle: oneOf(DWELL_STYLES),
  showProgressBar: yesOrNo,
};

const SETTING_NAMES = [
  'scanTime',
  'postClickDelay',
  'selectionMode',
  'dwellTime',
  'dwellStyle',
  'showProgressBar',
] as const satisfies readonly (keyof ScanSettingValues)[];

/**
 * Reads the stored scan settings. The values are stored on the device and are not synced yet.
 * Feature 8 adds the controls that call `set`.
 */
@Injectable({ providedIn: 'root' })
export class ScanSettings {
  private readonly document = inject(DOCUMENT);
  private readonly values = signal(DEFAULT_SCAN_SETTINGS);

  readonly scanTime = computed(() => this.values().scanTime);
  readonly postClickDelay = computed(() => this.values().postClickDelay);
  readonly selectionMode = computed(() => this.values().selectionMode);
  readonly dwellTime = computed(() => this.values().dwellTime);
  readonly dwellStyle = computed(() => this.values().dwellStyle);
  readonly showProgressBar = computed(() => this.values().showProgressBar);

  /**
   * Reads the stored values. A value that is missing, not a number, out of range or unknown
   * gives its default, and so does a storage that fails.
   */
  load(): void {
    this.values.set({
      scanTime: this.read('scanTime'),
      postClickDelay: this.read('postClickDelay'),
      selectionMode: this.read('selectionMode'),
      dwellTime: this.read('dwellTime'),
      dwellStyle: this.read('dwellStyle'),
      showProgressBar: this.read('showProgressBar'),
    });
  }

  /**
   * Uses the given values and stores them. A value that `load` would not accept is left out.
   * The values are used even when storage fails.
   */
  set(changes: Partial<ScanSettingValues>): void {
    const accepted: Partial<ScanSettingValues> = { ...changes };
    for (const name of SETTING_NAMES) {
      const value = accepted[name];
      if (value === undefined) {
        continue;
      }
      const text = String(value);
      if (PARSERS[name](text) === undefined) {
        delete accepted[name];
        continue;
      }
      this.store(SCAN_STORAGE_KEYS[name], text);
    }
    this.values.update((values) => ({ ...values, ...accepted }));
  }

  private read<K extends keyof ScanSettingValues>(name: K): ScanSettingValues[K] {
    const stored = this.stored(SCAN_STORAGE_KEYS[name]);
    const value = stored === null ? undefined : PARSERS[name](stored);
    return value ?? DEFAULT_SCAN_SETTINGS[name];
  }

  private stored(key: string): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      // Storage can be blocked. The default is used.
      return null;
    }
  }

  private store(key: string, text: string): void {
    try {
      this.document.defaultView?.localStorage.setItem(key, text);
    } catch {
      // Storage can be full or blocked. The value still applies for this session.
    }
  }
}
