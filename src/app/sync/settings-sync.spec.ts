import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AUTH_SOURCE, Account } from '../auth/auth';
import { FakeAuthSource } from '../auth/fake-auth-source';
import { SCAN_STORAGE_KEYS, ScanSettings } from '../scan/scan-settings';
import { VOICE_STORAGE_KEYS, VoiceSettings } from '../speech/voice-settings';
import { THEME_STORAGE_KEY, Theme } from '../theme/theme';
import { CLOUD_STORE, CloudDocument, CloudDocumentName, CloudStore } from './cloud-store';
import { SettingsSync } from './settings-sync';

@Component({ template: '' })
class Blank {}

/** The ten fields that feature 8 added, with the values of a device that has stored nothing. */
const TEN_FIELDS: Readonly<Record<string, string>> = {
  scanTime: '1500',
  postClickDelay: '500',
  selectionMode: 'scan',
  dwellTime: '1000',
  dwellStyle: 'grow',
  showProgressBar: 'false',
  voice: '',
  voiceRate: '1',
  voicePitch: '1',
  voiceVolume: '1',
};

/**
 * The ten fields apart from the voice rate. Many cases tell only of the theme and the voice rate,
 * so their documents hold these fields too.
 */
const NINE_FIELDS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(TEN_FIELDS).filter(([field]) => field !== 'voiceRate'),
);

/** The fake holds only the settings document. A call for another document is a fault of the sync. */
function checkName(name: CloudDocumentName): void {
  if (name !== 'settings') {
    throw new Error(`The settings sync used the ${name} document.`);
  }
}

/** A cloud store that keeps its watches of the settings document in memory and records each save. */
class FakeCloudStore implements CloudStore {
  /** The account ids that are watched now. */
  readonly watched = new Map<string, (document: CloudDocument) => void>();
  /** Every account id that was ever watched, in order. */
  readonly everWatched: string[] = [];
  readonly saves: { accountId: string; fields: Record<string, string> }[] = [];
  failSaves = false;
  /** When set, a save waits for this promise before it answers, as a slow network makes it. */
  holdSaves: Promise<void> | null = null;

  watch(
    accountId: string,
    name: CloudDocumentName,
    listener: (document: CloudDocument) => void,
  ): () => void {
    checkName(name);
    this.watched.set(accountId, listener);
    this.everWatched.push(accountId);
    return () => this.watched.delete(accountId);
  }

  async save(
    accountId: string,
    name: CloudDocumentName,
    fields: Readonly<Record<string, string>>,
  ): Promise<void> {
    checkName(name);
    this.saves.push({ accountId, fields: { ...fields } });
    await this.holdSaves;
    if (this.failSaves) {
      throw new Error('The save failed.');
    }
  }

  /** The saves that were asked for only where the cloud lacks the field. They are in `saves` too. */
  readonly fills: { accountId: string; fields: Record<string, string> }[] = [];

  async saveIfMissing(
    accountId: string,
    name: CloudDocumentName,
    fields: Readonly<Record<string, string>>,
  ): Promise<void> {
    checkName(name);
    this.fills.push({ accountId, fields: { ...fields } });
    await this.save(accountId, name, fields);
  }

  /**
   * Reports the document of an account as the cloud holds it. Null means there is no document.
   * The document also holds the nine other fields of feature 8, so a case on the theme and the
   * voice rate tells only of those two.
   */
  report(accountId: string, fields: Record<string, unknown> | null): void {
    this.reportOnly(accountId, fields && { ...NINE_FIELDS, ...fields });
  }

  /** Reports a document that holds the given fields and no others. */
  reportOnly(accountId: string, fields: Record<string, unknown> | null): void {
    this.watched.get(accountId)?.({ fields, fromCloud: true });
  }

  /** Reports the document of an account as the cache on the device holds it, which can lack what the cloud holds. */
  reportFromCache(accountId: string, fields: Record<string, unknown> | null): void {
    this.watched.get(accountId)?.({
      fields: fields && { ...NINE_FIELDS, ...fields },
      fromCloud: false,
    });
  }
}

const ANNA: Account = { id: 'uid-a', email: 'a@example.com' };
const BEN: Account = { id: 'uid-b', email: 'b@example.com' };

describe('SettingsSync', () => {
  let source: FakeAuthSource;
  let store: FakeCloudStore;
  let theme: Theme;
  let scan: ScanSettings;
  let voice: VoiceSettings;

  /** Signs an account in and reports its document. */
  function signIn(account: Account, fields: Record<string, unknown> | null): void {
    source.report(account);
    TestBed.tick();
    store.report(account.id, fields);
    TestBed.tick();
  }

  /** Case Y2: a document that holds both settings. */
  function signInWithBoth(): void {
    signIn(ANNA, { theme: 'teal', voiceRate: '1.5' });
  }

  beforeEach(() => {
    localStorage.clear();
    source = new FakeAuthSource();
    store = new FakeCloudStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        { provide: AUTH_SOURCE, useValue: source },
        { provide: CLOUD_STORE, useValue: store },
      ],
    });
    theme = TestBed.inject(Theme);
    theme.load();
    scan = TestBed.inject(ScanSettings);
    voice = TestBed.inject(VoiceSettings);
    TestBed.inject(SettingsSync);
    TestBed.tick();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('Y1: with no account the store is not watched and not written', () => {
    source.report(null);
    TestBed.tick();
    expect(store.everWatched).toEqual([]);
    expect(store.saves).toEqual([]);
  });

  it('Y2: the device uses and stores the theme and the voice rate of the document', () => {
    signInWithBoth();
    expect(theme.name()).toBe('teal');
    expect(voice.rate()).toBe(1.5);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('teal');
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.rate)).toBe('1.5');
    expect(store.saves).toEqual([]);
  });

  it('Y3: with no document the device saves its theme and its voice rate', () => {
    signIn(ANNA, null);
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { theme: 'blue', ...TEN_FIELDS } }]);
  });

  it('Y4: a document with only a theme is used, and only the voice rate is saved', () => {
    signIn(ANNA, { theme: 'dark' });
    expect(theme.name()).toBe('dark');
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { voiceRate: '1' } }]);
  });

  it('Y5: an unknown theme is left alone and the known voice rate is used', () => {
    signIn(ANNA, { theme: 'pink', voiceRate: '1.5' });
    expect(theme.name()).toBe('blue');
    expect(voice.rate()).toBe(1.5);
    expect(store.saves).toEqual([]);
  });

  it('Y6: a theme set on the device is the only field saved', () => {
    signInWithBoth();
    theme.set('dark');
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { theme: 'dark' } }]);
  });

  it('Y7: a voice rate set on the device is the only field saved', () => {
    signInWithBoth();
    voice.set({ rate: 1.2 });
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { voiceRate: '1.2' } }]);
  });

  it('Y8: a theme that changes in the document is used and not saved back', () => {
    signInWithBoth();
    store.report(ANNA.id, { theme: 'purple', voiceRate: '1.5' });
    TestBed.tick();
    expect(theme.name()).toBe('purple');
    expect(store.saves).toEqual([]);
  });

  it('Y9: after a sign out the watch is stopped and nothing is saved', () => {
    signInWithBoth();
    source.report(null);
    TestBed.tick();
    theme.set('dark');
    TestBed.tick();
    expect(store.watched.size).toBe(0);
    expect(store.saves).toEqual([]);
  });

  it('Y10: a save that fails raises no error, and the device keeps the new value', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      store.failSaves = true;
      signInWithBoth();
      theme.set('dark');
      expect(() => TestBed.tick()).not.toThrow();
      // The failed save gets time to raise an error. It must not raise one.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(store.saves.length).toBe(1);
      expect(unhandled).not.toHaveBeenCalled();
      expect(theme.name()).toBe('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('Y11: after account A signs out and account B signs in, only B is watched', () => {
    signInWithBoth();
    source.report(null);
    TestBed.tick();
    source.report(BEN);
    TestBed.tick();
    expect([...store.watched.keys()]).toEqual([BEN.id]);
  });

  /** Signs an account in and reports its document from the cache on the device. */
  function signInFromCache(account: Account, fields: Record<string, unknown> | null): void {
    source.report(account);
    TestBed.tick();
    store.reportFromCache(account.id, fields);
    TestBed.tick();
  }

  it('Y12: a cache report of no document saves nothing', () => {
    signInFromCache(ANNA, null);
    expect(store.saves).toEqual([]);
  });

  it('Y13: a cache report with only a theme is used, and nothing is saved', () => {
    signInFromCache(ANNA, { theme: 'dark' });
    expect(theme.name()).toBe('dark');
    expect(store.saves).toEqual([]);
  });

  it('Y14: a cloud report of the same document saves only the missing voice rate', () => {
    signInFromCache(ANNA, { theme: 'dark' });
    store.report(ANNA.id, { theme: 'dark' });
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { voiceRate: '1' } }]);
  });

  it('Y15: a field that the document lacks is saved only if the cloud still lacks it', () => {
    signIn(ANNA, { theme: 'dark' });
    expect(store.fills).toEqual([{ accountId: ANNA.id, fields: { voiceRate: '1' } }]);

    // A setting that changes on the device is saved whatever the cloud holds.
    theme.set('teal');
    TestBed.tick();
    expect(store.fills.length).toBe(1);
    expect(store.saves.at(-1)).toEqual({ accountId: ANNA.id, fields: { theme: 'teal' } });
  });

  it('Y16: the device uses the scan values and the voice values of the document', () => {
    signIn(ANNA, {
      theme: 'teal',
      scanTime: '2000',
      selectionMode: 'dwell',
      voiceRate: '1.5',
    });
    expect(scan.scanTime()).toBe(2000);
    expect(scan.selectionMode()).toBe('dwell');
    expect(voice.rate()).toBe(1.5);
    expect(localStorage.getItem(SCAN_STORAGE_KEYS.scanTime)).toBe('2000');
    expect(store.saves).toEqual([]);
  });

  it('Y17: the ten new fields are saved as text when the document lacks them', () => {
    source.report(ANNA);
    TestBed.tick();
    store.reportOnly(ANNA.id, { theme: 'teal' });
    TestBed.tick();
    expect(store.fills).toEqual([{ accountId: ANNA.id, fields: TEN_FIELDS }]);
    expect(store.saves.length).toBe(1);
  });

  it('Y18: a scan time set on the device is the only field saved', () => {
    signInWithBoth();
    scan.set({ scanTime: 2500 });
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { scanTime: '2500' } }]);
  });

  it('Y19: a volume set on the device is the only field saved', () => {
    signInWithBoth();
    voice.set({ volume: 0.4 });
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { voiceVolume: '0.4' } }]);
  });

  it('Y20: a scan time and a dwell style that this version cannot use are left alone', () => {
    signIn(ANNA, { theme: 'teal', voiceRate: '1.5', scanTime: '99999', dwellStyle: 'spin' });
    expect(scan.scanTime()).toBe(1500);
    expect(scan.dwellStyle()).toBe('grow');
    expect(store.saves).toEqual([]);
  });

  it('Y21: a report of an older save does not undo a newer change on the device', async () => {
    signInWithBoth();
    let answer: () => void = () => undefined;
    store.holdSaves = new Promise<void>((resolve) => (answer = resolve));
    scan.set({ scanTime: 2000 });
    TestBed.tick();
    scan.set({ scanTime: 2500 });
    TestBed.tick();
    // The cloud store reports the first save back while the second is on its way.
    store.report(ANNA.id, { theme: 'teal', voiceRate: '1.5', scanTime: '2000' });
    TestBed.tick();
    expect(scan.scanTime()).toBe(2500);
    expect(store.saves.map((save) => save.fields)).toEqual([
      { scanTime: '2000' },
      { scanTime: '2500' },
    ]);

    // Once the cloud has answered both saves, a change in the document is used again.
    answer();
    await new Promise((resolve) => setTimeout(resolve, 0));
    store.report(ANNA.id, { theme: 'teal', voiceRate: '1.5', scanTime: '3000' });
    TestBed.tick();
    expect(scan.scanTime()).toBe(3000);
    expect(store.saves.length).toBe(2);
  });

  it('BY7: a layout in the document is not used and not saved', () => {
    source.report(ANNA);
    TestBed.tick();
    store.reportOnly(ANNA.id, { layout: 'rows' });
    TestBed.tick();
    expect(localStorage.getItem('symple.layout')).toBeNull();
    // The document lacks every field of the sync, so each one is filled, and the layout is not.
    expect(store.fills).toEqual([{ accountId: ANNA.id, fields: { theme: 'blue', ...TEN_FIELDS } }]);

    theme.set('dark');
    TestBed.tick();
    expect(store.saves.at(-1)).toEqual({ accountId: ANNA.id, fields: { theme: 'dark' } });
  });
});
