import { Injectable, effect, inject, untracked } from '@angular/core';
import { Auth } from '../auth/auth';
import { HOME_BOARD_ID, loadBoards } from '../boards/board-data';
import { BoardStore, BoardTexts } from '../boards/board-store';
import { BoardSyncState } from './board-sync-state';
import { CLOUD_STORE, CloudDocument } from './cloud-store';

/** Reads one text of the cloud as a list. It gives nothing for a text that is not a JSON list. */
function parseList(text: string): unknown[] | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Gives the set that a boards document holds, when this version can read all of it. Both fields
 * must be JSON lists that load with no fault and give the home board. A set from a newer version
 * can hold what this version does not know, and using it would drop that part.
 */
function readableSet(fields: Readonly<Record<string, unknown>>): BoardTexts | undefined {
  const tiles = fields['tiles'];
  const boards = fields['boards'];
  if (typeof tiles !== 'string' || typeof boards !== 'string') {
    return undefined;
  }
  const tileList = parseList(tiles);
  const boardList = parseList(boards);
  if (!tileList || !boardList) {
    return undefined;
  }
  const loaded = loadBoards(tileList, boardList);
  const hasHome = loaded.boards.some((board) => board.id === HOME_BOARD_ID);
  return loaded.faults.length === 0 && hasHome ? { tiles, boards } : undefined;
}

/**
 * Whether a boards document holds no set at all. A document with only one of the two fields
 * holds a set that cannot be read.
 */
function holdsNoSet(fields: Readonly<Record<string, unknown>> | null): boolean {
  const absent = (value: unknown) => value === undefined || value === null;
  return fields === null || (absent(fields['tiles']) && absent(fields['boards']));
}

/** The fields of the boards document that hold a set. Every save writes both. */
function fieldsOf(texts: BoardTexts): Readonly<Record<string, string>> {
  return { tiles: texts.tiles, boards: texts.boards };
}

function sameTexts(a: BoardTexts | null, b: BoardTexts | null): boolean {
  return a?.tiles === b?.tiles && a?.boards === b?.boards;
}

/**
 * Keeps the stored set of boards in step with the boards document of the account,
 * `users/{uid}/data/boards`. The document holds the set as the two texts `tiles` and `boards`.
 * A set in the cloud replaces the set of the device, and a change on the device saves the whole set.
 * A change is saved only once the document of the account has been handled, so the set of the
 * device never goes over a set that the device did not take.
 * When two devices change their boards with no network, the last save wins.
 * The service starts when it is made and runs until the app ends.
 */
@Injectable({ providedIn: 'root' })
export class BoardSync {
  private readonly auth = inject(Auth);
  private readonly cloud = inject(CLOUD_STORE);
  private readonly boards = inject(BoardStore);
  private readonly state = inject(BoardSyncState);

  /**
   * The account whose boards document has been handled: the device took its set, or the cloud
   * itself said that it holds none. Until then, and while the document holds a set that this
   * version cannot read, a change on the device is not saved.
   */
  private handled: string | null = null;

  /**
   * The stored set when the sync last looked. A stored set that differs from it was changed
   * on the device, so it is saved to the cloud. It starts as the set that the device holds at
   * the start, which is no change, so a device never saves an old set over a newer one of the
   * cloud just because it started.
   */
  private seen: BoardTexts | null = this.boards.stored();

  /**
   * How many saves of each account the cloud has not answered yet. While an account has one,
   * the set of the device is on its way, and a report can still hold the set from before it.
   * The count is kept for each account, so a save that never ends after a sign out does not
   * hold back the next account.
   */
  private readonly unanswered = new Map<string, number>();

  constructor() {
    // The boards document of the account is watched from sign in to sign out.
    effect((onCleanup) => {
      const account = this.auth.account();
      this.handled = null;
      untracked(() => this.state.unreadable.set(false));
      if (!account) {
        return;
      }
      const stop = untracked(() =>
        this.cloud.watch(account.id, 'boards', (document) => this.onDocument(account.id, document)),
      );
      onCleanup(stop);
    });

    // A set that changes on the device is saved to the document. The sign out removes the
    // stored set, so `stored` turns null, and a null set is never saved.
    effect(() => {
      const stored = this.boards.stored();
      const changed = stored !== null && !sameTexts(stored, this.seen);
      this.seen = stored;
      const account = untracked(this.auth.account);
      if (changed && account && this.handled === account.id) {
        this.save(account.id, stored);
      }
    });
  }

  /** Takes a readable set of the document, or fills a document that holds none. */
  private onDocument(accountId: string, document: CloudDocument): void {
    // A watch that was stopped can still report once. A report for another account is dropped.
    if (this.auth.account()?.id !== accountId) {
      return;
    }
    // The cloud store also reports the saves of this device, a moment after each one. Such a
    // report must not undo a newer change. The set of the device is saved last, so it is the
    // one that the cloud ends with.
    if (this.unanswered.has(accountId)) {
      return;
    }
    if (holdsNoSet(document.fields)) {
      this.fill(accountId, document.fromCloud);
      return;
    }
    // A set this version cannot read is left alone, so a newer version's set is not lost.
    // The device then saves nothing until the cloud reports a set that it can read.
    const texts = document.fields && readableSet(document.fields);
    if (texts && this.boards.saveTexts(texts)) {
      // The set came from the cloud, so it is not saved back.
      this.seen = this.boards.stored();
      this.handle(accountId);
    } else {
      this.handled = null;
      this.state.unreadable.set(true);
    }
  }

  /** The document of an account was handled, so the changes of the device are saved from now on. */
  private handle(accountId: string): void {
    this.handled = accountId;
    this.state.unreadable.set(false);
  }

  /**
   * Saves the stored set to a cloud that holds none. The copy on the device can lack the set
   * that the cloud holds, so this is done only when the cloud itself says it is missing, and the
   * store asks the cloud once more before it writes. A device with nothing stored saves nothing.
   */
  private fill(accountId: string, fromCloud: boolean): void {
    if (!fromCloud) {
      return;
    }
    this.handle(accountId);
    const stored = this.boards.stored();
    if (stored) {
      this.cloud.saveIfMissing(accountId, 'boards', fieldsOf(stored)).catch(() => undefined);
    }
  }

  private save(accountId: string, texts: BoardTexts): void {
    this.unanswered.set(accountId, (this.unanswered.get(accountId) ?? 0) + 1);
    // A save that fails is dropped. The device keeps its set and stays usable with no cloud.
    void this.cloud
      .save(accountId, 'boards', fieldsOf(texts))
      .catch(() => undefined)
      .then(() => this.answered(accountId));
  }

  /** One save of an account was answered, or failed. */
  private answered(accountId: string): void {
    const left = (this.unanswered.get(accountId) ?? 1) - 1;
    if (left > 0) {
      this.unanswered.set(accountId, left);
    } else {
      this.unanswered.delete(accountId);
    }
  }
}
