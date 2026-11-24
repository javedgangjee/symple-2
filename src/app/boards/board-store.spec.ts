import { TestBed } from '@angular/core/testing';
import { BOARDS_STORAGE_KEY, BOARD_FILES, BoardStore, TILES_STORAGE_KEY } from './board-store';

const BUILT_IN = {
  tiles: [{ id: 'help', label: 'Help', colour: 'light', style: 'key' }],
  boards: [{ id: 'home', title: 'Home', groups: [{ cells: [{ tile: 'help' }] }] }],
};

const EDITED = {
  tiles: [{ id: 'help', label: 'Help me', colour: 'light', style: 'key' }],
  boards: [{ id: 'home', title: 'Start', groups: [{ cells: [{ tile: 'help' }] }] }],
};

describe('BoardStore', () => {
  /** Makes the store. It reads local storage when it is made, so a case stores its texts first. */
  function make(): BoardStore {
    TestBed.configureTestingModule({ providers: [{ provide: BOARD_FILES, useValue: BUILT_IN }] });
    return TestBed.inject(BoardStore);
  }

  function storeTexts(set: typeof EDITED): void {
    localStorage.setItem(TILES_STORAGE_KEY, JSON.stringify(set.tiles));
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(set.boards));
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('BS1: with nothing stored the set is the built-in files, and nothing is written', () => {
    const store = make();
    expect(store.set()).toBe(BUILT_IN);
    expect(store.stored()).toBeNull();
    expect(localStorage.getItem(TILES_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(BOARDS_STORAGE_KEY)).toBeNull();
  });

  it('BS2: a saved set is stored as two JSON texts, and the signal gives it', () => {
    const store = make();
    store.save(EDITED);
    expect(localStorage.getItem(TILES_STORAGE_KEY)).toBe(JSON.stringify(EDITED.tiles));
    expect(localStorage.getItem(BOARDS_STORAGE_KEY)).toBe(JSON.stringify(EDITED.boards));
    expect(store.set()).toEqual(EDITED);
    expect(store.stored()).toEqual({
      tiles: JSON.stringify(EDITED.tiles),
      boards: JSON.stringify(EDITED.boards),
    });
  });

  it('BS3: a stored text that is not JSON gives the built-in files and is left as it is', () => {
    storeTexts(EDITED);
    localStorage.setItem(BOARDS_STORAGE_KEY, '[{"id": "home"');
    const store = make();
    expect(store.set()).toBe(BUILT_IN);
    expect(store.stored()).toBeNull();
    expect(localStorage.getItem(BOARDS_STORAGE_KEY)).toBe('[{"id": "home"');
    expect(localStorage.getItem(TILES_STORAGE_KEY)).toBe(JSON.stringify(EDITED.tiles));
  });

  it('BS4: a saved set is used when writing storage throws, and nothing is thrown', () => {
    const store = make();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage is full.');
    });
    expect(() => store.save(EDITED)).not.toThrow();
    expect(store.set()).toEqual(EDITED);
  });

  it('BS5: a stored set that is forgotten is removed, and the set is the built-in files', () => {
    storeTexts(EDITED);
    const store = make();
    expect(store.set()).toEqual(EDITED);
    store.forget();
    expect(localStorage.getItem(TILES_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(BOARDS_STORAGE_KEY)).toBeNull();
    expect(store.set()).toBe(BUILT_IN);
    expect(store.stored()).toBeNull();
  });
});
