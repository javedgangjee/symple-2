import { InjectionToken } from '@angular/core';

/**
 * The documents that each account has in the cloud. `settings` holds the settings of the
 * device, and `boards` holds the set of boards and tiles.
 */
export type CloudDocumentName = 'settings' | 'boards';

/** One document of an account, as the cloud store reports it. */
export interface CloudDocument {
  /** The fields of the document, or null when the account has no document. The values are not checked. */
  readonly fields: Readonly<Record<string, unknown>> | null;
  /**
   * Whether the report came from the cloud itself. It is false when it came from the copy
   * that the device keeps, which can be out of date or empty.
   */
  readonly fromCloud: boolean;
}

/**
 * The service that holds the cloud copy of the settings and the boards. Firestore is the only
 * one for now. The syncs use it through this interface, so the unit tests can use a fake.
 */
export interface CloudStore {
  /**
   * Reports one document of an account now and after each change.
   * The returned function stops the reports.
   */
  watch(
    accountId: string,
    name: CloudDocumentName,
    listener: (document: CloudDocument) => void,
  ): () => void;

  /** Saves fields to one document of an account. The other fields of the document are kept. */
  save(
    accountId: string,
    name: CloudDocumentName,
    fields: Readonly<Record<string, string>>,
  ): Promise<void>;

  /**
   * Saves only the fields that the cloud itself does not hold yet. It asks the cloud first,
   * so a value that the cloud holds is never replaced, and it fails with no network.
   */
  saveIfMissing(
    accountId: string,
    name: CloudDocumentName,
    fields: Readonly<Record<string, string>>,
  ): Promise<void>;
}

/** The cloud store in use. The app config provides the Firestore store, and the unit tests provide a fake. */
export const CLOUD_STORE = new InjectionToken<CloudStore>('CLOUD_STORE');
