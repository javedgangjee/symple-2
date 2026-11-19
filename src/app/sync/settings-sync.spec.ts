import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AUTH_SOURCE, Account } from '../auth/auth';
import { FakeAuthSource } from '../auth/fake-auth-source';
import { LAYOUT_STORAGE_KEY, Layout } from '../layout/layout';
import { THEME_STORAGE_KEY, Theme } from '../theme/theme';
import { CLOUD_STORE, CloudDocument, CloudStore } from './cloud-store';
import { SettingsSync } from './settings-sync';

@Component({ template: '' })
class Blank {}

/** A cloud store that keeps its watches in memory and records each save. */
class FakeCloudStore implements CloudStore {
  /** The account ids that are watched now. */
  readonly watched = new Map<string, (document: CloudDocument) => void>();
  /** Every account id that was ever watched, in order. */
  readonly everWatched: string[] = [];
  readonly saves: { accountId: string; fields: Record<string, string> }[] = [];
  failSaves = false;

  watch(accountId: string, listener: (document: CloudDocument) => void): () => void {
    this.watched.set(accountId, listener);
    this.everWatched.push(accountId);
    return () => this.watched.delete(accountId);
  }

  async save(accountId: string, fields: Readonly<Record<string, string>>): Promise<void> {
    this.saves.push({ accountId, fields: { ...fields } });
    if (this.failSaves) {
      throw new Error('The save failed.');
    }
  }

  /** The saves that were asked for only where the cloud lacks the field. They are in `saves` too. */
  readonly fills: { accountId: string; fields: Record<string, string> }[] = [];

  async saveIfMissing(accountId: string, fields: Readonly<Record<string, string>>): Promise<void> {
    this.fills.push({ accountId, fields: { ...fields } });
    await this.save(accountId, fields);
  }

  /** Reports the document of an account as the cloud holds it. Null means there is no document. */
  report(accountId: string, fields: Record<string, unknown> | null): void {
    this.watched.get(accountId)?.({ fields, fromCloud: true });
  }

  /** Reports the document of an account as the cache on the device holds it, which can lack what the cloud holds. */
  reportFromCache(accountId: string, fields: Record<string, unknown> | null): void {
    this.watched.get(accountId)?.({ fields, fromCloud: false });
  }
}

const ANNA: Account = { id: 'uid-a', email: 'a@example.com' };
const BEN: Account = { id: 'uid-b', email: 'b@example.com' };

describe('SettingsSync', () => {
  let source: FakeAuthSource;
  let store: FakeCloudStore;
  let theme: Theme;
  let layout: Layout;

  /** Signs an account in and reports its document. */
  function signIn(account: Account, fields: Record<string, unknown> | null): void {
    source.report(account);
    TestBed.tick();
    store.report(account.id, fields);
    TestBed.tick();
  }

  /** Case Y2: a document that holds both settings. */
  function signInWithBoth(): void {
    signIn(ANNA, { theme: 'teal', layout: 'rows' });
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
    layout = TestBed.inject(Layout);
    theme.load();
    layout.load();
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

  it('Y2: the device uses and stores the theme and the layout of the document', () => {
    signInWithBoth();
    expect(theme.name()).toBe('teal');
    expect(layout.name()).toBe('rows');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('teal');
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe('rows');
    expect(store.saves).toEqual([]);
  });

  it('Y3: with no document the device saves its theme and its layout', () => {
    signIn(ANNA, null);
    expect(store.saves).toEqual([
      { accountId: ANNA.id, fields: { theme: 'blue', layout: 'columns' } },
    ]);
  });

  it('Y4: a document with only a theme is used, and only the layout is saved', () => {
    signIn(ANNA, { theme: 'dark' });
    expect(theme.name()).toBe('dark');
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { layout: 'columns' } }]);
  });

  it('Y5: an unknown theme is left alone and the known layout is used', () => {
    signIn(ANNA, { theme: 'pink', layout: 'rows' });
    expect(theme.name()).toBe('blue');
    expect(layout.name()).toBe('rows');
    expect(store.saves).toEqual([]);
  });

  it('Y6: a theme set on the device is the only field saved', () => {
    signInWithBoth();
    theme.set('dark');
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { theme: 'dark' } }]);
  });

  it('Y7: a layout set on the device is the only field saved', () => {
    signInWithBoth();
    layout.set('columns');
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { layout: 'columns' } }]);
  });

  it('Y8: a theme that changes in the document is used and not saved back', () => {
    signInWithBoth();
    store.report(ANNA.id, { theme: 'purple', layout: 'rows' });
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

  it('Y14: a cloud report of the same document saves only the missing layout', () => {
    signInFromCache(ANNA, { theme: 'dark' });
    store.report(ANNA.id, { theme: 'dark' });
    TestBed.tick();
    expect(store.saves).toEqual([{ accountId: ANNA.id, fields: { layout: 'columns' } }]);
  });

  it('Y15: a field that the document lacks is saved only if the cloud still lacks it', () => {
    signIn(ANNA, { theme: 'dark' });
    expect(store.fills).toEqual([{ accountId: ANNA.id, fields: { layout: 'columns' } }]);

    // A setting that changes on the device is saved whatever the cloud holds.
    theme.set('teal');
    TestBed.tick();
    expect(store.fills.length).toBe(1);
    expect(store.saves.at(-1)).toEqual({ accountId: ANNA.id, fields: { theme: 'teal' } });
  });
});
