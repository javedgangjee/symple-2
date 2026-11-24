import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import boardsFile from '../../data/boards.json';
import cellsFile from '../../data/cells.json';
import { AUTH_SOURCE, Account } from '../auth/auth';
import { FakeAuthSource } from '../auth/fake-auth-source';
import { BoardData } from '../boards/board-data';
import { BOARDS_STORAGE_KEY, BoardFiles, BoardStore, BoardTexts } from '../boards/board-store';
import { BoardSync } from './board-sync';
import { BoardSyncState } from './board-sync-state';
import { CLOUD_STORE, CloudDocument, CloudDocumentName, CloudStore } from './cloud-store';

@Component({ template: '' })
class Blank {}

const ANNA: Account = { id: 'uid-a', email: 'a@example.com' };

/** A set as the two texts that the boards document holds. */
function textsOf(set: BoardFiles): BoardTexts {
  return { tiles: JSON.stringify(set.tiles), boards: JSON.stringify(set.boards) };
}

/** The built-in set with the Needs board titled "Care". */
const CARE_SET: BoardFiles = {
  tiles: cellsFile,
  boards: boardsFile.map((board) => (board.id === 'needs' ? { ...board, title: 'Care' } : board)),
};

/** The built-in set as a newer version could save it, with a board field that this version does not know. */
const NEWER_SET: BoardFiles = {
  tiles: cellsFile,
  boards: boardsFile.map((board) => ({ ...board, future: true })),
};

/** The built-in set with the first tile put once more, or more times, at the end of the first group of home. */
function withMoreCells(count: number): BoardFiles {
  const added = Array.from({ length: count }, () => ({ tile: cellsFile[0].id }));
  return {
    tiles: cellsFile,
    boards: boardsFile.map((board) =>
      board.id === 'home'
        ? {
            ...board,
            groups: board.groups.map((group, index) =>
              index === 0 ? { cells: [...group.cells, ...added] } : group,
            ),
          }
        : board,
    ),
  };
}

/** The fake holds only the boards document. A call for another document is a fault of the sync. */
function checkName(name: CloudDocumentName): void {
  if (name !== 'boards') {
    throw new Error(`The board sync used the ${name} document.`);
  }
}

/** A cloud store that keeps its watches of the boards document in memory and records each save. */
class FakeCloudStore implements CloudStore {
  /** The account ids that are watched now. */
  readonly watched = new Map<string, (document: CloudDocument) => void>();
  readonly saves: { accountId: string; fields: Record<string, string> }[] = [];
  /** The saves that were asked for only where the cloud lacks the field. They are not in `saves`. */
  readonly fills: { accountId: string; fields: Record<string, string> }[] = [];
  /** When set, a save waits for this promise before it answers, as a slow network makes it. */
  holdSaves: Promise<void> | null = null;

  watch(
    accountId: string,
    name: CloudDocumentName,
    listener: (document: CloudDocument) => void,
  ): () => void {
    checkName(name);
    this.watched.set(accountId, listener);
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
  }

  async saveIfMissing(
    accountId: string,
    name: CloudDocumentName,
    fields: Readonly<Record<string, string>>,
  ): Promise<void> {
    checkName(name);
    this.fills.push({ accountId, fields: { ...fields } });
  }

  /** Reports the boards document of an account as the cloud holds it. Null means there is no document. */
  report(accountId: string, fields: Record<string, unknown> | null): void {
    this.watched.get(accountId)?.({ fields, fromCloud: true });
  }
}

describe('BoardSync', () => {
  let source: FakeAuthSource;
  let cloud: FakeCloudStore;
  let boards: BoardStore;

  /** Signs an account in and reports its boards document. */
  function signIn(account: Account, fields: Record<string, unknown> | null): void {
    source.report(account);
    TestBed.tick();
    cloud.report(account.id, fields);
    TestBed.tick();
  }

  /** Changes the set on the device, as an edit does, and lets the sync see it. */
  function change(set: BoardFiles): void {
    boards.save(set);
    TestBed.tick();
  }

  beforeEach(() => {
    localStorage.clear();
    source = new FakeAuthSource();
    cloud = new FakeCloudStore();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        { provide: AUTH_SOURCE, useValue: source },
        { provide: CLOUD_STORE, useValue: cloud },
      ],
    });
    boards = TestBed.inject(BoardStore);
    TestBed.inject(BoardSync);
    TestBed.tick();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('BY1: a set in the cloud is used and stored, and nothing is saved', () => {
    const care = textsOf(CARE_SET);
    signIn(ANNA, { ...care });
    expect(TestBed.inject(BoardData).board('needs')?.title).toBe('Care');
    expect(boards.stored()).toEqual(care);
    expect(localStorage.getItem(BOARDS_STORAGE_KEY)).toBe(care.boards);
    expect(cloud.saves).toEqual([]);
    expect(cloud.fills).toEqual([]);
  });

  it('BY2: a stored set fills a cloud that has none, only if the cloud still lacks it', () => {
    change(CARE_SET);
    signIn(ANNA, null);
    expect(cloud.fills).toEqual([{ accountId: ANNA.id, fields: { ...textsOf(CARE_SET) } }]);
    expect(cloud.saves).toEqual([]);
  });

  it('BY3: with nothing stored and no set in the cloud, nothing is saved', () => {
    signIn(ANNA, null);
    expect(boards.stored()).toBeNull();
    expect(cloud.saves).toEqual([]);
    expect(cloud.fills).toEqual([]);
  });

  it('BY4: a cell added on the device is one save of the whole set', () => {
    signIn(ANNA, null);
    const added = withMoreCells(1);
    change(added);
    expect(cloud.saves).toEqual([{ accountId: ANNA.id, fields: { ...textsOf(added) } }]);
  });

  it('BY5: a set in the cloud that is not JSON is left alone, and nothing is saved back', () => {
    change(CARE_SET);
    signIn(ANNA, { tiles: JSON.stringify(cellsFile), boards: '[{"id": "home"' });
    expect(boards.stored()).toEqual(textsOf(CARE_SET));
    expect(cloud.saves).toEqual([]);
    expect(cloud.fills).toEqual([]);
  });

  it('BY6: a report of the set from before two unanswered saves does not undo them', async () => {
    signIn(ANNA, null);
    let answer: () => void = () => undefined;
    cloud.holdSaves = new Promise<void>((resolve) => (answer = resolve));
    change(withMoreCells(1));
    change(withMoreCells(2));
    // The cloud reports the set from before the two changes while they are on their way.
    cloud.report(ANNA.id, { ...textsOf(CARE_SET) });
    TestBed.tick();
    expect(boards.stored()).toEqual(textsOf(withMoreCells(2)));
    expect(cloud.saves.length).toBe(2);

    // Once the cloud has answered both saves, a set in the cloud is used again.
    answer();
    await new Promise((resolve) => setTimeout(resolve, 0));
    cloud.report(ANNA.id, { ...textsOf(CARE_SET) });
    TestBed.tick();
    expect(boards.stored()).toEqual(textsOf(CARE_SET));
    expect(cloud.saves.length).toBe(2);
  });

  it('BY8: while the cloud holds a set this version cannot read, a change on the device is not saved', () => {
    const state = TestBed.inject(BoardSyncState);
    signIn(ANNA, { ...textsOf(NEWER_SET) });
    expect(boards.stored()).toBeNull();
    expect(state.unreadable()).toBe(true);
    change(withMoreCells(1));
    expect(cloud.saves).toEqual([]);
    expect(cloud.fills).toEqual([]);

    // Once the cloud reports a set this version can read, the device takes it and saves changes again.
    cloud.report(ANNA.id, { ...textsOf(CARE_SET) });
    TestBed.tick();
    expect(boards.stored()).toEqual(textsOf(CARE_SET));
    expect(state.unreadable()).toBe(false);
    change(withMoreCells(2));
    expect(cloud.saves).toEqual([{ accountId: ANNA.id, fields: { ...textsOf(withMoreCells(2)) } }]);
  });

  it('BY9: a change made before the first report of the cloud is not saved over the set of the account', () => {
    source.report(ANNA);
    TestBed.tick();
    const added = withMoreCells(1);
    change(added);
    expect(cloud.saves).toEqual([]);

    // The cloud then says that the account has no set, so the set of the device fills it.
    cloud.report(ANNA.id, null);
    TestBed.tick();
    expect(cloud.fills).toEqual([{ accountId: ANNA.id, fields: { ...textsOf(added) } }]);
    expect(cloud.saves).toEqual([]);
  });
});
