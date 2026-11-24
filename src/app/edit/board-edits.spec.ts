import boardsFile from '../../data/boards.json';
import cellsFile from '../../data/cells.json';
import { BoardRecord, BoardSet, Tile, loadBoards, toBoardSet } from '../boards/board-data';
import { CellPosition } from '../scan/scan';
import {
  SpeakFields,
  addBoard,
  addCell,
  addGroup,
  editCell,
  moveCell,
  removeCell,
  removeGroup,
  setBoard,
} from './board-edits';

/** The built-in set. No case changes it, because every edit gives a new set. */
const BUILT_IN = toBoardSet(loadBoards(cellsFile, boardsFile).boards);

const JUICE: SpeakFields = {
  kind: 'speak',
  label: 'Juice',
  phrase: 'I want juice',
  symbol: 'drink.svg',
  colour: 'light',
};

function board(set: BoardSet, id: string): BoardRecord {
  const found = set.boards.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`There is no board "${id}".`);
  }
  return found;
}

function tile(set: BoardSet, id: string): Tile {
  const found = set.tiles.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`There is no tile "${id}".`);
  }
  return found;
}

/** The tile ids of each group of a board. */
const layout = (set: BoardSet, id: string) =>
  board(set, id).groups.map((group) => group.cells.map((cell) => cell.tile));

/** The tiles of `after` that `before` does not have. */
const newTiles = (before: BoardSet, after: BoardSet) =>
  after.tiles.filter((made) => !before.tiles.some((old) => old.id === made.id));

/** The place of the cell that shows a tile on a board. */
function placeOf(set: BoardSet, boardId: string, tileId: string): CellPosition {
  const groups = layout(set, boardId);
  const group = groups.findIndex((cells) => cells.includes(tileId));
  if (group === -1) {
    throw new Error(`No cell of "${boardId}" shows the tile "${tileId}".`);
  }
  return { group, cell: groups[group].indexOf(tileId) };
}

/** The built-in set with a second cell that shows the Help tile, on Quick phrases. */
function withHelpTwice(): BoardSet {
  return {
    tiles: BUILT_IN.tiles,
    boards: BUILT_IN.boards.map((item) =>
      item.id === 'quick-phrases'
        ? { ...item, groups: [...item.groups, { cells: [{ tile: 'help' }] }] }
        : item,
    ),
  };
}

/** The built-in set with a fourth group on Needs, which is empty. */
const withEmptyGroup = () => addGroup(BUILT_IN, 'needs');

/** The built-in set in which the board Yes or no has one group. */
function withOneGroup(): BoardSet {
  return {
    tiles: BUILT_IN.tiles,
    boards: BUILT_IN.boards.map((item) =>
      item.id === 'yes-no' ? { ...item, groups: [{ cells: [] }] } : item,
    ),
  };
}

/** The set that each case produces. Case BE18 gives every one of them to `loadBoards`. */
const PRODUCED: Readonly<Record<string, () => BoardSet>> = {
  BE1: () => addCell(BUILT_IN, 'needs', JUICE),
  BE2: () => addCell(BUILT_IN, 'home', JUICE),
  BE3: () => addCell(BUILT_IN, 'needs', JUICE, 2),
  BE4: () =>
    addCell(BUILT_IN, 'needs', { kind: 'speak', label: 'Juice', phrase: '', colour: 'light' }),
  BE5: () =>
    editCell(BUILT_IN, 'needs', placeOf(BUILT_IN, 'needs', 'help'), {
      kind: 'speak',
      label: 'Help me',
      phrase: 'I need help',
      symbol: 'help.svg',
      colour: 'light',
    }),
  BE6: () =>
    editCell(withHelpTwice(), 'needs', placeOf(BUILT_IN, 'needs', 'help'), {
      kind: 'speak',
      label: 'Help me',
      phrase: 'I need help',
      symbol: 'help.svg',
      colour: 'light',
    }),
  BE7: () => {
    const food = tile(BUILT_IN, 'food');
    return editCell(BUILT_IN, 'my-boards', placeOf(BUILT_IN, 'my-boards', 'food'), {
      kind: 'open',
      label: 'Meals',
      style: 'stage',
      colour: food.colour,
      icon: food.icon ?? 'board',
    });
  },
  BE8: () => removeCell(BUILT_IN, 'needs', placeOf(BUILT_IN, 'needs', 'help')),
  BE9: () => removeCell(BUILT_IN, 'home', placeOf(BUILT_IN, 'home', 'my-boards')),
  BE10: () => removeCell(BUILT_IN, 'home', placeOf(BUILT_IN, 'home', 'keyboards')),
  BE11: () => removeCell(BUILT_IN, 'needs', placeOf(BUILT_IN, 'needs', 'back')),
  BE12: () => moveCell(BUILT_IN, 'needs', { group: 0, cell: 1 }, { group: 2, cell: 0 }),
  BE13: () => moveCell(BUILT_IN, 'needs', { group: 0, cell: 1 }, { group: 2, cell: 0 }, true),
  BE14: () => addGroup(BUILT_IN, 'needs'),
  BE15: () => removeGroup(withEmptyGroup(), 'needs', 3),
  BE16: () =>
    addBoard(BUILT_IN, 'home', {
      kind: 'open',
      label: 'Outings',
      style: 'stage',
      colour: 'grey',
      icon: 'place',
    }),
  BE17: () => setBoard(BUILT_IN, 'needs', { title: 'Care', layout: 'rows' }),
};

describe('The changes to a set', () => {
  it('BE1: a cell that speaks is added to the group of Needs with the fewest cells', () => {
    const set = PRODUCED['BE1']();
    const made = newTiles(BUILT_IN, set);
    expect(made).toEqual([
      {
        id: made[0].id,
        label: 'Juice',
        colour: 'light',
        style: 'symbol',
        symbol: 'drink.svg',
        action: { type: 'speak', phrase: 'I want juice' },
      },
    ]);
    expect(set.tiles.length).toBe(BUILT_IN.tiles.length + 1);
    // Needs has groups of five, four and four cells, so the second group is the first with the fewest.
    const before = layout(BUILT_IN, 'needs');
    expect(layout(set, 'needs')).toEqual([before[0], [...before[1], made[0].id], before[2]]);
  });

  it('BE2: the first of two groups that tie for the fewest cells gets the new cell', () => {
    const set = PRODUCED['BE2']();
    const [made] = newTiles(BUILT_IN, set);
    expect(layout(BUILT_IN, 'home').map((cells) => cells.length)).toEqual([2, 2]);
    expect(layout(set, 'home')).toEqual([
      ['my-boards', 'needs', made.id],
      ['quick-phrases', 'keyboards'],
    ]);
  });

  it('BE3: a cell that is added with a group named is the last cell of that group', () => {
    const set = PRODUCED['BE3']();
    const [made] = newTiles(BUILT_IN, set);
    const before = layout(BUILT_IN, 'needs');
    expect(layout(set, 'needs')).toEqual([before[0], before[1], [...before[2], made.id]]);
  });

  it('BE4: a cell with no phrase and no symbol speaks its label and has the key style', () => {
    const [made] = newTiles(BUILT_IN, PRODUCED['BE4']());
    expect(made.action).toEqual({ type: 'speak', phrase: 'Juice' });
    expect(made.style).toBe('key');
    expect(made.symbol).toBeUndefined();
  });

  it('BE5: an edited label goes to the tile, which keeps its id, when no other cell uses it', () => {
    const set = PRODUCED['BE5']();
    expect(newTiles(BUILT_IN, set)).toEqual([]);
    expect(tile(set, 'help')).toEqual({ ...tile(BUILT_IN, 'help'), label: 'Help me' });
    expect(layout(set, 'needs')).toEqual(layout(BUILT_IN, 'needs'));
  });

  it('BE6: an edited cell gets a tile of its own when a second cell uses the same tile', () => {
    const before = withHelpTwice();
    const set = PRODUCED['BE6']();
    const made = newTiles(before, set);
    expect(made.length).toBe(1);
    expect(made[0].label).toBe('Help me');
    expect(tile(set, 'help')).toEqual(tile(before, 'help'));
    expect(layout(set, 'quick-phrases')).toEqual(layout(before, 'quick-phrases'));
    const at = placeOf(BUILT_IN, 'needs', 'help');
    expect(layout(set, 'needs')[at.group][at.cell]).toBe(made[0].id);
  });

  it('BE7: a cell that opens the board Food is renamed, and so is the board', () => {
    const set = PRODUCED['BE7']();
    expect(tile(set, 'food').label).toBe('Meals');
    expect(board(set, 'food').title).toBe('Meals');
  });

  it('BE8: a cell that speaks is removed with its tile, which no cell uses', () => {
    const set = PRODUCED['BE8']();
    expect(layout(set, 'needs').flat()).not.toContain('help');
    expect(layout(set, 'needs').flat().length).toBe(layout(BUILT_IN, 'needs').flat().length - 1);
    expect(set.tiles.some((item) => item.id === 'help')).toBe(false);
  });

  it('BE9: the cell that opens My boards is removed with the nine boards that only it reaches', () => {
    const set = PRODUCED['BE9']();
    const gone = [
      'my-boards',
      'food',
      'drinks',
      'feelings',
      'people',
      'places',
      'activities',
      'yes-no',
      'core-words',
    ];
    const ids = (from: BoardSet) => from.boards.map((item) => item.id);
    expect(ids(set)).toEqual(ids(BUILT_IN).filter((id) => !gone.includes(id)));
    expect(layout(set, 'home')).toEqual([['needs'], ['quick-phrases', 'keyboards']]);
    // Every tile that is left is shown by a cell, and the tiles of the removed boards are gone.
    const shown = new Set(set.boards.flatMap((item) => layout(set, item.id).flat()));
    expect(set.tiles.every((item) => shown.has(item.id))).toBe(true);
    expect(set.tiles.some((item) => item.id === 'my-boards' || item.id === 'food')).toBe(false);
    expect(set.tiles.some((item) => item.id === 'back')).toBe(true);
  });

  it('BE10: the cell that opens Keyboards, a locked board, is removed with the five boards that only it reaches', () => {
    expect(board(BUILT_IN, 'keyboards').locked).toBe(true);
    const set = PRODUCED['BE10']();
    const gone = ['keyboards', 'keyboard', 'keyboard-abc', 'keyboard-vowels', 'keyboard-numbers'];
    const ids = (from: BoardSet) => from.boards.map((item) => item.id);
    expect(ids(set)).toEqual(ids(BUILT_IN).filter((id) => !gone.includes(id)));
    expect(layout(set, 'home')).toEqual([['my-boards', 'needs'], ['quick-phrases']]);
    expect(set.tiles.some((item) => item.id === 'keyboards' || item.id === 'key-q')).toBe(false);
  });

  it('BE11: the Back cell of Needs is not removed and not edited', () => {
    const back = placeOf(BUILT_IN, 'needs', 'back');
    expect(PRODUCED['BE11']()).toBe(BUILT_IN);
    expect(editCell(BUILT_IN, 'needs', back, { ...JUICE, label: 'Away' })).toBe(BUILT_IN);
    expect(
      editCell(BUILT_IN, 'needs', back, {
        kind: 'open',
        label: 'Away',
        style: 'stage',
        colour: 'ink',
        icon: 'back',
      }),
    ).toBe(BUILT_IN);
  });

  it('BE12: a cell moves from the first group to the first place of the third', () => {
    const set = PRODUCED['BE12']();
    expect(layout(BUILT_IN, 'needs')[0]).toEqual(['back', 'help', 'pain', 'toilet', 'drink']);
    expect(layout(set, 'needs')).toEqual([
      ['back', 'pain', 'toilet', 'drink'],
      layout(BUILT_IN, 'needs')[1],
      ['help', 'bed', 'move-me', 'itch', 'glasses'],
    ]);
  });

  it('BE13: a cell that moves to a group with no room trades places with the cell there', () => {
    const set = PRODUCED['BE13']();
    expect(layout(set, 'needs')).toEqual([
      ['back', 'bed', 'pain', 'toilet', 'drink'],
      layout(BUILT_IN, 'needs')[1],
      ['help', 'move-me', 'itch', 'glasses'],
    ]);
  });

  it('BE14: a group that is added is empty and last', () => {
    const set = PRODUCED['BE14']();
    expect(layout(set, 'needs')).toEqual([...layout(BUILT_IN, 'needs'), []]);
  });

  it('BE15: an empty group is removed, and the only group of a board is not', () => {
    expect(layout(withEmptyGroup(), 'needs').length).toBe(4);
    expect(layout(PRODUCED['BE15'](), 'needs')).toEqual(layout(BUILT_IN, 'needs'));
    const one = withOneGroup();
    expect(removeGroup(one, 'yes-no', 0)).toBe(one);
  });

  it('BE16: a board is added from home with a Back cell, and home gets a cell that opens it', () => {
    const set = PRODUCED['BE16']();
    const added = set.boards.filter((item) => !BUILT_IN.boards.some((old) => old.id === item.id));
    expect(added.length).toBe(1);
    expect(added[0].title).toBe('Outings');
    expect(layout(set, added[0].id)).toEqual([['back'], [], []]);
    const made = newTiles(BUILT_IN, set);
    expect(made).toEqual([
      {
        id: made[0].id,
        label: 'Outings',
        colour: 'grey',
        hue: 'c3',
        style: 'stage',
        icon: 'place',
        action: { type: 'open', board: added[0].id },
      },
    ]);
    expect(layout(set, 'home')).toEqual([
      ['my-boards', 'needs', made[0].id],
      ['quick-phrases', 'keyboards'],
    ]);
  });

  it('BE17: a board gets a title and a layout, and the cell on home that opens it reads the title', () => {
    const set = PRODUCED['BE17']();
    expect(board(set, 'needs').title).toBe('Care');
    expect(board(set, 'needs').layout).toBe('rows');
    expect(tile(set, 'needs').label).toBe('Care');
    expect(layout(set, 'home')).toEqual(layout(BUILT_IN, 'home'));
  });

  it('BE18: each set that cases BE1 to BE17 produce is read with no fault', () => {
    expect(Object.keys(PRODUCED).length).toBe(17);
    for (const [name, produce] of Object.entries(PRODUCED)) {
      const set = produce();
      const loaded = loadBoards(set.tiles, set.boards);
      expect(loaded.faults, name).toEqual([]);
    }
  });

  it('BE19: a tile of the Soft or the Grey colour takes the hue of its swatch, and Dark and White take none', () => {
    const added = (colour: SpeakFields['colour']) =>
      newTiles(BUILT_IN, addCell(BUILT_IN, 'needs', { ...JUICE, colour }))[0];
    expect(added('soft1').hue).toBe('c2');
    expect(added('grey').hue).toBe('c3');
    expect(added('dark').hue).toBeUndefined();
    expect(added('light').hue).toBeUndefined();

    const at = placeOf(BUILT_IN, 'needs', 'help');
    const recoloured = (set: BoardSet, colour: SpeakFields['colour']) =>
      editCell(set, 'needs', at, {
        kind: 'speak',
        label: 'Help',
        phrase: 'I need help',
        symbol: 'help.svg',
        colour,
      });
    const grey = recoloured(BUILT_IN, 'grey');
    expect(tile(grey, 'help').hue).toBe('c3');
    expect(tile(recoloured(grey, 'dark'), 'help').hue).toBeUndefined();
    expect(loadBoards(grey.tiles, grey.boards).faults).toEqual([]);
  });
});
