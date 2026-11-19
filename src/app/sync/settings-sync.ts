import { Injectable, effect, inject, untracked } from '@angular/core';
import { Auth } from '../auth/auth';
import { Layout, isLayoutName } from '../layout/layout';
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
 * Keeps the theme and the layout of the device in step with the settings document of the account.
 * The settings stay stored on the device, and the cloud holds a second copy.
 * The service starts when it is made and runs until the app ends.
 */
@Injectable({ providedIn: 'root' })
export class SettingsSync {
  private readonly auth = inject(Auth);
  private readonly store = inject(CLOUD_STORE);
  private readonly theme = inject(Theme);
  private readonly layout = inject(Layout);

  /** The settings in the sync. Feature 8 adds the others here. */
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
  };

  /**
   * The value of each setting when the sync last looked. A value that differs from it
   * was changed on the device, so it is saved to the cloud.
   */
  private readonly seen = new Map<string, string>();

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

  /** Takes the known values of the document, and fills the fields that the document lacks. */
  private onDocument(accountId: string, document: CloudDocument): void {
    // A watch that was stopped can still report once. A report for another account is dropped.
    if (this.auth.account()?.id !== accountId) {
      return;
    }
    const missing: Record<string, string> = {};
    for (const [field, setting] of Object.entries(this.settings)) {
      const value = document.fields?.[field];
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
    // A save that fails is dropped. The device keeps its value and stays usable with no cloud.
    this.store.save(accountId, fields).catch(() => undefined);
  }
}
