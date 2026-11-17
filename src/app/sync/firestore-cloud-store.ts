import { Injectable, InjectionToken, inject } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import { FIREBASE_APP } from '../firebase/firebase-app';
import { CloudDocument, CloudStore } from './cloud-store';

/** The Firestore collection that holds one settings document for each account. */
const USERS = 'users';

/** One report of a document, with the parts of a Firestore snapshot that the store reads. */
export interface DocumentSnapshot {
  exists(): boolean;
  data(): Readonly<Record<string, unknown>> | undefined;
  readonly metadata: { readonly fromCache: boolean };
}

/** The Firestore calls that the store makes. The unit tests stand in for them. */
export interface FirestoreDocuments {
  /** Reports a document now and after each change, with the reports from the cache told apart. */
  watch(
    collection: string,
    id: string,
    onSnapshot: (snapshot: DocumentSnapshot) => void,
    onError: (error: unknown) => void,
  ): () => void;

  /** Saves fields to a document and keeps its other fields. */
  merge(collection: string, id: string, fields: Readonly<Record<string, string>>): Promise<void>;
}

/**
 * Loads Firestore, so it is not part of the first load of the app.
 * Firestore keeps a cache on the device. A save made with no network waits there and is sent later.
 */
async function loadFirestore(app: FirebaseApp): Promise<FirestoreDocuments> {
  const api = await import('firebase/firestore');
  const db = api.initializeFirestore(app, {
    localCache: api.persistentLocalCache({ tabManager: api.persistentMultipleTabManager() }),
  });
  return {
    watch: (collection, id, onSnapshot, onError) =>
      api.onSnapshot(
        api.doc(db, collection, id),
        { includeMetadataChanges: true },
        onSnapshot,
        onError,
      ),
    merge: (collection, id, fields) =>
      api.setDoc(api.doc(db, collection, id), fields, { merge: true }),
  };
}

/** The function that loads Firestore. The unit tests provide a stand-in. */
export const FIRESTORE_LOADER = new InjectionToken<
  (app: FirebaseApp) => Promise<FirestoreDocuments>
>('FIRESTORE_LOADER', { providedIn: 'root', factory: () => loadFirestore });

/** The shape of a Firebase error code, such as `permission-denied`. */
const ERROR_CODE = /^[a-z][a-z/-]{0,63}$/;

/**
 * The code of a Firebase error, or `unknown`. Only the code is taken, and only when it has
 * the shape of a code, so a warning never holds an account id, an email or a setting.
 */
function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (typeof code === 'string' && ERROR_CODE.test(code)) {
      return code;
    }
  }
  return 'unknown';
}

/**
 * The cloud store that uses Firestore. The settings of an account are the document `users/{uid}`.
 * The access rules in `firestore.rules` let an account reach only its own document.
 */
@Injectable()
export class FirestoreCloudStore implements CloudStore {
  private readonly app = inject(FIREBASE_APP);
  private readonly load = inject(FIRESTORE_LOADER);
  private loading?: Promise<FirestoreDocuments>;

  /** Loads Firestore on first use. A load that fails is not kept, so the next call tries again. */
  private firestore(): Promise<FirestoreDocuments> {
    this.loading ??= this.load(this.app).catch((error: unknown) => {
      this.loading = undefined;
      this.warn('Symple could not load the sync of the settings', error);
      throw error;
    });
    return this.loading;
  }

  watch(accountId: string, listener: (document: CloudDocument) => void): () => void {
    let stopped = false;
    let stop: (() => void) | undefined;
    this.firestore().then(
      (documents) => {
        if (stopped) {
          return;
        }
        stop = documents.watch(
          USERS,
          accountId,
          // A report from the cache is told apart, because the cache can lack what the cloud holds.
          (snapshot) =>
            listener({
              fields: snapshot.exists() ? (snapshot.data() ?? null) : null,
              fromCloud: !snapshot.metadata.fromCache,
            }),
          // Firestore ends the watch when the account loses access, as it does at sign out.
          // The settings on the device stay in use.
          (error) => this.warn('Symple stopped the sync of the settings', error),
        );
      },
      // Firestore could not be loaded, and `firestore()` has said so. The settings on the device stay in use.
      () => undefined,
    );
    return () => {
      stopped = true;
      stop?.();
    };
  }

  async save(accountId: string, fields: Readonly<Record<string, string>>): Promise<void> {
    const documents = await this.firestore();
    await documents.merge(USERS, accountId, fields);
  }

  /** Leaves a trace of a failure in the console. It holds the error code and nothing else of the error. */
  private warn(what: string, error: unknown): void {
    console.warn(`${what}: ${errorCode(error)}.`);
  }
}
