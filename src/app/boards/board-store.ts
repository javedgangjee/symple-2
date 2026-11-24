import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import boardsFile from '../../data/boards.json';
import cellsFile from '../../data/cells.json';
import { LocalStore } from '../storage/local-store';

/**
 * The set: every tile and every board together, in the shape of `cells.json` and `boards.json`.
 * The contents are not checked here. `loadBoards` checks them.
 */
export interface BoardFiles {
  readonly tiles: unknown;
  readonly boards: unknown;
}

/** The set that is built into the app. The tests replace it. */
export const BOARD_FILES = new InjectionToken<BoardFiles>('BOARD_FILES', {
  providedIn: 'root',
  factory: () => ({ tiles: cellsFile, boards: boardsFile }),
});

/** The local storage keys that hold the set once the caregiver has changed it. */
export const TILES_STORAGE_KEY = 'symple.tiles';
export const BOARDS_STORAGE_KEY = 'symple.boards';

/** A set as two JSON texts. Local storage and the cloud hold it this way. */
export interface BoardTexts {
  readonly tiles: string;
  readonly boards: string;
}

/** A stored set: the two texts, and what they hold. */
interface Stored {
  readonly texts: BoardTexts;
  readonly files: BoardFiles;
}

/** Reads one text as a list. It gives nothing for a text that is not JSON or is not a list. */
function readList(text: string): unknown[] | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Reads two texts as a set. It gives nothing when either text cannot be read. */
function readTexts(texts: BoardTexts): Stored | undefined {
  const tiles = readList(texts.tiles);
  const boards = readList(texts.boards);
  return tiles && boards ? { texts, files: { tiles, boards } } : undefined;
}

/**
 * Keeps the set of boards on the device. Nothing is stored until the first change. Until then,
 * and when a stored text cannot be read, the set is the one built into the app.
 */
@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly store = inject(LocalStore);
  private readonly builtIn = inject(BOARD_FILES);

  /** Two stored sets with the same texts are one set, so a set that is stored again changes nothing. */
  private readonly current = signal(this.readStored(), {
    equal: (a, b) => a?.texts.tiles === b?.texts.tiles && a?.texts.boards === b?.texts.boards,
  });

  /** The set in use. */
  readonly set = computed(() => this.current()?.files ?? this.builtIn);

  /** The stored set as two texts, or null when the set in use is the built-in one. */
  readonly stored = computed(() => this.current()?.texts ?? null);

  /** Uses a set and stores it. The set is used even when storage fails. */
  save(set: BoardFiles): void {
    const texts = { tiles: JSON.stringify(set.tiles), boards: JSON.stringify(set.boards) };
    this.keep({ texts, files: set });
  }

  /**
   * Uses a set that comes as two texts, as the cloud holds it, and stores it.
   * It returns false and changes nothing when either text cannot be read.
   */
  saveTexts(texts: BoardTexts): boolean {
    const stored = readTexts(texts);
    if (stored) {
      this.keep(stored);
    }
    return stored !== undefined;
  }

  /** Removes the stored set, so the set in use is the built-in one again. */
  forget(): void {
    this.store.remove(TILES_STORAGE_KEY);
    this.store.remove(BOARDS_STORAGE_KEY);
    this.current.set(undefined);
  }

  private keep(stored: Stored): void {
    this.store.write(TILES_STORAGE_KEY, stored.texts.tiles);
    this.store.write(BOARDS_STORAGE_KEY, stored.texts.boards);
    this.current.set(stored);
  }

  /** Reads the stored set. A text that cannot be read is left in storage as it is. */
  private readStored(): Stored | undefined {
    const tiles = this.store.read(TILES_STORAGE_KEY);
    const boards = this.store.read(BOARDS_STORAGE_KEY);
    return tiles !== null && boards !== null ? readTexts({ tiles, boards }) : undefined;
  }
}
