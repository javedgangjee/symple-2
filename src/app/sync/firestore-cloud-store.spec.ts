import { TestBed } from '@angular/core/testing';
import type { FirebaseApp } from 'firebase/app';
import { FIREBASE_APP } from '../firebase/firebase-app';
import { CloudDocument, CloudDocumentName } from './cloud-store';
import {
  DocumentSnapshot,
  FIRESTORE_LOADER,
  FirestoreCloudStore,
  FirestoreDocuments,
} from './firestore-cloud-store';

const ACCOUNT_ID = 'uid-anna';

/** A stand-in for Firestore that keeps its watches in memory and records each call. */
class FakeDocuments implements FirestoreDocuments {
  readonly watches: {
    path: string;
    onSnapshot: (snapshot: DocumentSnapshot) => void;
    onError: (error: unknown) => void;
  }[] = [];
  readonly merges: { path: string; fields: Record<string, string> }[] = [];

  watch(
    path: readonly string[],
    onSnapshot: (snapshot: DocumentSnapshot) => void,
    onError: (error: unknown) => void,
  ): () => void {
    this.watches.push({ path: path.join('/'), onSnapshot, onError });
    return () => undefined;
  }

  /** The fields that the server holds, or null when there is no document. */
  held: Record<string, unknown> | null = null;

  async mergeAfterRead(
    path: readonly string[],
    choose: (held: Readonly<Record<string, unknown>> | null) => Readonly<Record<string, string>>,
  ): Promise<void> {
    const fields = choose(this.held);
    if (Object.keys(fields).length > 0) {
      await this.merge(path, fields);
    }
  }

  async merge(path: readonly string[], fields: Readonly<Record<string, string>>): Promise<void> {
    this.merges.push({ path: path.join('/'), fields: { ...fields } });
  }
}

function snapshot(fields: Record<string, unknown> | null, fromCache: boolean): DocumentSnapshot {
  return {
    exists: () => fields !== null,
    data: () => fields ?? undefined,
    metadata: { fromCache },
  };
}

describe('FirestoreCloudStore', () => {
  let documents: FakeDocuments;
  /** The number of times Firestore was loaded. */
  let loads: number;
  /** The number of loads, from now on, that fail. */
  let failingLoads: number;
  let warn: ReturnType<typeof vi.spyOn>;
  let store: FirestoreCloudStore;

  /** Lets the load of Firestore, and what waits for it, run. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  /** Watches a document of the account and returns the reports and the function that stops them. */
  async function watch(
    name: CloudDocumentName = 'settings',
  ): Promise<{ reports: CloudDocument[]; stop: () => void }> {
    const reports: CloudDocument[] = [];
    const stop = store.watch(ACCOUNT_ID, name, (document) => reports.push(document));
    await settle();
    return { reports, stop };
  }

  beforeEach(() => {
    documents = new FakeDocuments();
    loads = 0;
    failingLoads = 0;
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const app: Partial<FirebaseApp> = { name: 'test' };
    TestBed.configureTestingModule({
      providers: [
        FirestoreCloudStore,
        { provide: FIREBASE_APP, useValue: app },
        {
          provide: FIRESTORE_LOADER,
          useValue: async (): Promise<FirestoreDocuments> => {
            loads++;
            if (failingLoads > 0) {
              failingLoads--;
              throw new Error(`The load failed for ${ACCOUNT_ID}.`);
            }
            return documents;
          },
        },
      ],
    });
    store = TestBed.inject(FirestoreCloudStore);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('C1: a document from the cache is reported as not from the cloud', async () => {
    const { reports } = await watch();
    documents.watches[0].onSnapshot(snapshot({ theme: 'teal' }, true));
    expect(documents.watches[0].path).toBe(`users/${ACCOUNT_ID}`);
    expect(reports).toEqual([{ fields: { theme: 'teal' }, fromCloud: false }]);
  });

  it('C2: a document from the server is reported as from the cloud', async () => {
    const { reports } = await watch();
    documents.watches[0].onSnapshot(snapshot({ theme: 'teal' }, false));
    expect(reports).toEqual([{ fields: { theme: 'teal' }, fromCloud: true }]);
  });

  it('C3: a document that does not exist is reported with no fields', async () => {
    const { reports } = await watch();
    documents.watches[0].onSnapshot(snapshot(null, false));
    expect(reports).toEqual([{ fields: null, fromCloud: true }]);
  });

  it('C4: a watch that is stopped before Firestore has loaded never watches the document', async () => {
    const stop = store.watch(ACCOUNT_ID, 'settings', () => undefined);
    stop();
    await settle();
    expect(loads).toBe(1);
    expect(documents.watches).toEqual([]);
  });

  it('C5: after a load that fails, a save loads Firestore again and reaches it', async () => {
    failingLoads = 1;
    await watch();
    expect(documents.watches).toEqual([]);
    await store.save(ACCOUNT_ID, 'settings', { theme: 'dark' });
    expect(loads).toBe(2);
    expect(documents.merges).toEqual([{ path: `users/${ACCOUNT_ID}`, fields: { theme: 'dark' } }]);
  });

  it('C6: a watch that fails writes one warning with the code and without the account id', async () => {
    await watch();
    documents.watches[0].onError({
      code: 'permission-denied',
      message: `Missing or insufficient permissions for ${ACCOUNT_ID}.`,
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const text = warn.mock.calls[0].join(' ');
    expect(text).toContain('permission-denied');
    expect(text).not.toContain(ACCOUNT_ID);
  });

  it('C7: a load that fails writes one warning and raises no error', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      failingLoads = 1;
      await watch();
      // The failed load gets time to raise an error. It must not raise one.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0].join(' ')).not.toContain(ACCOUNT_ID);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('C8: a save of missing fields leaves out a field that the server holds', async () => {
    documents.held = { theme: 'teal' };
    await store.saveIfMissing(ACCOUNT_ID, 'settings', { theme: 'blue', scanTime: '1500' });
    expect(documents.merges).toEqual([
      { path: `users/${ACCOUNT_ID}`, fields: { scanTime: '1500' } },
    ]);
  });

  it('C9: a save of missing fields writes nothing when the server holds them all', async () => {
    documents.held = { theme: 'teal', scanTime: '2000' };
    await store.saveIfMissing(ACCOUNT_ID, 'settings', { theme: 'blue', scanTime: '1500' });
    expect(documents.merges).toEqual([]);
  });

  it('C10: a save of missing fields writes them all when there is no document', async () => {
    documents.held = null;
    await store.saveIfMissing(ACCOUNT_ID, 'settings', { theme: 'blue', scanTime: '1500' });
    expect(documents.merges).toEqual([
      { path: `users/${ACCOUNT_ID}`, fields: { theme: 'blue', scanTime: '1500' } },
    ]);
  });

  it('C11: the boards document is watched at its own path', async () => {
    const { reports } = await watch('boards');
    documents.watches[0].onSnapshot(snapshot({ tiles: '[]', boards: '[]' }, false));
    expect(documents.watches[0].path).toBe(`users/${ACCOUNT_ID}/data/boards`);
    expect(reports).toEqual([{ fields: { tiles: '[]', boards: '[]' }, fromCloud: true }]);
  });

  it('C12: the two saves of the boards document reach its own path', async () => {
    await store.save(ACCOUNT_ID, 'boards', { tiles: '[]', boards: '[]' });
    await store.saveIfMissing(ACCOUNT_ID, 'boards', { tiles: '[1]', boards: '[2]' });
    const path = `users/${ACCOUNT_ID}/data/boards`;
    expect(documents.merges).toEqual([
      { path, fields: { tiles: '[]', boards: '[]' } },
      { path, fields: { tiles: '[1]', boards: '[2]' } },
    ]);
  });
});
