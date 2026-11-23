import { Injectable, effect, inject, untracked } from '@angular/core';
import { Auth } from '../auth/auth';
import { Layout, isLayoutName } from '../layout/layout';
import { ScanSettingName, ScanSettings } from '../scan/scan-settings';
import { VoiceSettingName, VoiceSettings } from '../speech/voice-settings';
import { THEME_NAMES, Theme, ThemeName } from '../theme/theme';
import { CLOUD_STORE, CloudDocument } from './cloud-store';

/** One setting that the sync covers. The name of the field in the document is the key of `settings`. */
interface SyncedSetting {
  /** The value that the device uses. */
  read(): string;
  /** Uses a value from the cloud and stores it on the device. It returns false for a value this version does not know. */
  use(value: unknown): boolean;
}

function isThemeName(value: unknown): value is ThemeName {
  return THEME_NAMES.some((name) => name === value);
}

/**
 * Keeps the settings of the device in step with the settings document of the account. They are
 * the theme, the layout, the six scan values and the four voice values, each saved as text.
 * The settings stay stored on the device, and the cloud holds a second copy.
 * The service starts when it is made and runs until the app ends.
 */
@Injectable({ providedIn: 'root' })
export class SettingsSync {
  private readonly auth = inject(Auth);
  private readonly store = inject(CLOUD_STORE);
  private readonly theme = inject(Theme);
  private readonly layout = inject(Layout);
  private readonly scan = inject(ScanSettings);
  private readonly voice = inject(VoiceSettings);

  /** The settings in the sync. A new setting is added here. */
  private readonly settings: Readonly<Record<string, SyncedSetting>> = {
    theme: {
      read: () => this.theme.name(),
      use: (value) => {
        if (!isThemeName(value)) {
          return false;
        }
        this.theme.set(value);
        return true;
      },
    },
    layout: {
      read: () => this.layout.name(),
      use: (value) => {
        if (!isLayoutName(value)) {
          return false;
        }
        this.layout.set(value);
        return true;
      },
    },
    scanTime: this.scanValue('scanTime'),
    postClickDelay: this.scanValue('postClickDelay'),
    selectionMode: this.scanValue('selectionMode'),
    dwellTime: this.scanValue('dwellTime'),
    dwellStyle: this.scanValue('dwellStyle'),
    showProgressBar: this.scanValue('showProgressBar'),
    voice: this.voiceValue('voice'),
    voiceRate: this.voiceValue('rate'),
    voicePitch: this.voiceValue('pitch'),
    voiceVolume: this.voiceValue('volume'),
  };

  /**
   * The value of each setting when the sync last looked. A value that differs from it
   * was changed on the device, so it is saved to the cloud.
   */
  private readonly seen = new Map<string, string>();

  /**
   * How many saves of each field the cloud has not answered yet. While a field has one, the
   * value of the device is on its way, and a report can still hold the value from before it.
   */
  private readonly unanswered = new Map<string, number>();

  constructor() {
    // The document of the account is watched from sign in to sign out.
    effect((onCleanup) => {
      const account = this.auth.account();
      if (!account) {
        return;
      }
      const stop = untracked(() =>
        this.store.watch(account.id, (document) => this.onDocument(account.id, document)),
      );
      onCleanup(stop);
    });

    // A setting that changes on the device is saved to the document.
    effect(() => {
      const changed: Record<string, string> = {};
      for (const [field, setting] of Object.entries(this.settings)) {
        const value = setting.read();
        if (this.seen.has(field) && this.seen.get(field) !== value) {
          changed[field] = value;
        }
        this.seen.set(field, value);
      }
      const account = untracked(this.auth.account);
      if (account) {
        this.save(account.id, changed);
      }
    });
  }

  /** One scan value. The service that holds it says whether a text of the cloud is usable. */
  private scanValue(name: ScanSettingName): SyncedSetting {
    return {
      read: () => String(this.scan[name]()),
      use: (value) => typeof value === 'string' && this.scan.setFromText(name, value),
    };
  }

  /** One voice value, checked in the same way. */
  private voiceValue(name: VoiceSettingName): SyncedSetting {
    return {
      read: () => String(this.voice[name]()),
      use: (value) => typeof value === 'string' && this.voice.setFromText(name, value),
    };
  }

  /** Takes the known values of the document, and fills the fields that the document lacks. */
  private onDocument(accountId: string, document: CloudDocument): void {
    // A watch that was stopped can still report once. A report for another account is dropped.
    if (this.auth.account()?.id !== accountId) {
      return;
    }
    const missing: Record<string, string> = {};
    for (const [field, setting] of Object.entries(this.settings)) {
      const value = document.fields?.[field];
      if (this.unanswered.has(field)) {
        // The cloud store also reports the saves of this device, a moment after each one. Such a
        // report must not undo a newer change, as it would when a slider is dragged. The value
        // of the device is saved last, so it is the one that the cloud ends with.
        continue;
      }
      if (value === undefined || value === null) {
        missing[field] = setting.read();
      } else if (setting.use(value)) {
        // The value came from the cloud, so it is not saved back.
        this.seen.set(field, setting.read());
      }
      // A value this version does not know is left alone, so a newer version's value is not lost.
    }
    // The copy on the device can lack a field that the cloud holds,
    // so a field is filled only when the cloud itself says it is missing.
    // The store then asks the cloud once more before it writes, so a value of the device
    // never replaces a value that the cloud holds, and nothing waits on the device to be sent later.
    if (document.fromCloud && Object.keys(missing).length > 0) {
      this.store.saveIfMissing(accountId, missing).catch(() => undefined);
    }
  }

  private save(accountId: string, fields: Record<string, string>): void {
    if (Object.keys(fields).length === 0) {
      return;
    }
    const names = Object.keys(fields);
    for (const field of names) {
      this.unanswered.set(field, (this.unanswered.get(field) ?? 0) + 1);
    }
    // A save that fails is dropped. The device keeps its value and stays usable with no cloud.
    void this.store
      .save(accountId, fields)
      .catch(() => undefined)
      .then(() => names.forEach((field) => this.answered(field)));
  }

  /** One save of a field was answered, or failed. */
  private answered(field: string): void {
    const left = (this.unanswered.get(field) ?? 1) - 1;
    if (left > 0) {
      this.unanswered.set(field, left);
    } else {
      this.unanswered.delete(field);
    }
  }
}
