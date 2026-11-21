import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStore } from '../storage/local-store';

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

/** What the app knows of one stored value: its local storage key, its default and how it is read. */
interface Setting<T> {
  readonly key: string;
  /** The value used when nothing usable is stored. */
  readonly fallback: T;
  readonly parse: Parser<T>;
}

/** The one table of the stored values. `load` and `set` go through it, so a new value is added here. */
const SETTINGS: { readonly [K in keyof ScanSettingValues]: Setting<ScanSettingValues[K]> } = {
  scanTime: { key: 'symple.scanTime', fallback: 1500, parse: time(500, 5000) },
  postClickDelay: { key: 'symple.postClickDelay', fallback: 500, parse: time(0, 5000) },
  selectionMode: { key: 'symple.selectionMode', fallback: 'scan', parse: oneOf(SELECTION_MODES) },
  dwellTime: { key: 'symple.dwellTime', fallback: 1000, parse: time(500, 5000) },
  dwellStyle: { key: 'symple.dwellStyle', fallback: 'grow', parse: oneOf(DWELL_STYLES) },
  showProgressBar: { key: 'symple.showProgressBar', fallback: false, parse: yesOrNo },
};

type SettingName = keyof ScanSettingValues;

function isSettingName(name: string): name is SettingName {
  return Object.hasOwn(SETTINGS, name);
}

const SETTING_KEYS = Object.keys(SETTINGS).filter(isSettingName);

/** The local storage key of each value. */
export const SCAN_STORAGE_KEYS: Readonly<Record<SettingName, string>> = {
  scanTime: SETTINGS.scanTime.key,
  postClickDelay: SETTINGS.postClickDelay.key,
  selectionMode: SETTINGS.selectionMode.key,
  dwellTime: SETTINGS.dwellTime.key,
  dwellStyle: SETTINGS.dwellStyle.key,
  showProgressBar: SETTINGS.showProgressBar.key,
};

/** The values used when nothing usable is stored. */
export const DEFAULT_SCAN_SETTINGS: ScanSettingValues = {
  scanTime: SETTINGS.scanTime.fallback,
  postClickDelay: SETTINGS.postClickDelay.fallback,
  selectionMode: SETTINGS.selectionMode.fallback,
  dwellTime: SETTINGS.dwellTime.fallback,
  dwellStyle: SETTINGS.dwellStyle.fallback,
  showProgressBar: SETTINGS.showProgressBar.fallback,
};

/**
 * Reads the stored scan settings. The values are stored on the device and are not synced yet.
 * Feature 8 adds the controls that call `set`.
 */
@Injectable({ providedIn: 'root' })
export class ScanSettings {
  private readonly store = inject(LocalStore);
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
    let values = DEFAULT_SCAN_SETTINGS;
    for (const name of SETTING_KEYS) {
      values = this.read(values, name);
    }
    this.values.set(values);
  }

  /**
   * Uses the given values and stores them. A value that `load` would not accept is left out.
   * The values are used even when storage fails.
   */
  set(changes: Partial<ScanSettingValues>): void {
    let values = this.values();
    for (const name of SETTING_KEYS) {
      values = this.accept(values, name, changes);
    }
    this.values.set(values);
  }

  /** The values with one of them read from storage, when what is stored is usable. */
  private read<K extends SettingName>(values: ScanSettingValues, name: K): ScanSettingValues {
    const stored = this.store.read(SETTINGS[name].key);
    const value = stored === null ? undefined : SETTINGS[name].parse(stored);
    return value === undefined ? values : { ...values, [name]: value };
  }

  /** The values with one of them changed and stored, when the change holds a usable value for it. */
  private accept<K extends SettingName>(
    values: ScanSettingValues,
    name: K,
    changes: Partial<ScanSettingValues>,
  ): ScanSettingValues {
    const value = changes[name];
    if (value === undefined) {
      return values;
    }
    const text = String(value);
    if (SETTINGS[name].parse(text) === undefined) {
      return values;
    }
    this.store.write(SETTINGS[name].key, text);
    return { ...values, [name]: value };
  }
}
