import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalStore } from '../storage/local-store';
import { VoiceValues } from './voice-source';

/** The lowest and the highest value of a slider, and the size of one step. */
export interface Range {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** The ranges of the rate, the pitch and the volume. The sliders of the settings panel use them too. */
export const VOICE_RANGES: Readonly<Record<'rate' | 'pitch' | 'volume', Range>> = {
  rate: { min: 0.5, max: 2, step: 0.1 },
  pitch: { min: 0, max: 2, step: 0.1 },
  volume: { min: 0, max: 1, step: 0.1 },
};

/** The longest voice id that is stored. The ids of the browsers are far shorter. */
const VOICE_ID_MAX_LENGTH = 200;

/** Reads one stored text as a value. It gives `undefined` for a text that is not a usable value. */
type Parser<T> = (stored: string) => T | undefined;

/** A plain decimal number inside a range, such as "1" or "0.5". */
function within(range: Range): Parser<number> {
  return (stored) => {
    if (!/^\d+(\.\d+)?$/.test(stored)) {
      return undefined;
    }
    const value = Number(stored);
    return value >= range.min && value <= range.max ? value : undefined;
  };
}

/** The id of a voice. Any short text is an id, because each browser names its voices its own way. */
const voiceId: Parser<string> = (stored) =>
  stored.length <= VOICE_ID_MAX_LENGTH ? stored : undefined;

/** What the app knows of one stored value: its local storage key, its default and how it is read. */
interface Setting<T> {
  readonly key: string;
  /** The value used when nothing usable is stored. */
  readonly fallback: T;
  readonly parse: Parser<T>;
}

/** The one table of the stored values. `load` and `set` go through it, so a new value is added here. */
const SETTINGS: { readonly [K in keyof VoiceValues]: Setting<VoiceValues[K]> } = {
  voice: { key: 'symple.voice', fallback: '', parse: voiceId },
  rate: { key: 'symple.voiceRate', fallback: 1, parse: within(VOICE_RANGES.rate) },
  pitch: { key: 'symple.voicePitch', fallback: 1, parse: within(VOICE_RANGES.pitch) },
  volume: { key: 'symple.voiceVolume', fallback: 1, parse: within(VOICE_RANGES.volume) },
};

export type VoiceSettingName = keyof VoiceValues;

function isSettingName(name: string): name is VoiceSettingName {
  return Object.hasOwn(SETTINGS, name);
}

const SETTING_NAMES = Object.keys(SETTINGS).filter(isSettingName);

/** The local storage key of each value. */
export const VOICE_STORAGE_KEYS: Readonly<Record<VoiceSettingName, string>> = {
  voice: SETTINGS.voice.key,
  rate: SETTINGS.rate.key,
  pitch: SETTINGS.pitch.key,
  volume: SETTINGS.volume.key,
};

/** The values used when nothing usable is stored. */
export const DEFAULT_VOICE_SETTINGS: VoiceValues = {
  voice: SETTINGS.voice.fallback,
  rate: SETTINGS.rate.fallback,
  pitch: SETTINGS.pitch.fallback,
  volume: SETTINGS.volume.fallback,
};

/**
 * Holds the chosen voice and its rate, pitch and volume. The values are stored on the device,
 * and the sync keeps a second copy in the cloud. The settings panel calls `set`.
 */
@Injectable({ providedIn: 'root' })
export class VoiceSettings {
  private readonly store = inject(LocalStore);
  private readonly current = signal(DEFAULT_VOICE_SETTINGS);

  /** The four values together, as the voice source takes them. */
  readonly values = this.current.asReadonly();

  /** The id of the chosen voice. It is empty until the caregiver picks one. */
  readonly voice = computed(() => this.current().voice);
  readonly rate = computed(() => this.current().rate);
  readonly pitch = computed(() => this.current().pitch);
  readonly volume = computed(() => this.current().volume);

  /**
   * Reads the stored values. A value that is missing, not a number or out of range gives
   * its default, and so does a storage that fails.
   */
  load(): void {
    let values = DEFAULT_VOICE_SETTINGS;
    for (const name of SETTING_NAMES) {
      const stored = this.store.read(SETTINGS[name].key);
      if (stored !== null) {
        values = this.withText(values, name, stored) ?? values;
      }
    }
    this.current.set(values);
  }

  /**
   * Uses the given values and stores them. A value that `load` would not accept is left out.
   * The values are used even when storage fails.
   */
  set(changes: Partial<VoiceValues>): void {
    for (const name of SETTING_NAMES) {
      const value = changes[name];
      if (value !== undefined) {
        this.setFromText(name, String(value));
      }
    }
  }

  /**
   * Uses one value given as text, as the cloud holds it, and stores it. It returns false and
   * changes nothing for a text that `load` would not accept.
   */
  setFromText(name: VoiceSettingName, text: string): boolean {
    const values = this.withText(this.current(), name, text);
    if (!values) {
      return false;
    }
    this.store.write(SETTINGS[name].key, String(values[name]));
    this.current.set(values);
    return true;
  }

  /** The values with one of them read from a text, or nothing when the text is not usable. */
  private withText<K extends VoiceSettingName>(
    values: VoiceValues,
    name: K,
    text: string,
  ): VoiceValues | undefined {
    const value = SETTINGS[name].parse(text);
    return value === undefined ? undefined : { ...values, [name]: value };
  }
}
