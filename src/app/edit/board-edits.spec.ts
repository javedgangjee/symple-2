import boardsFile from '../../data/boards.json';
import cellsFile from '../../data/cells.json';
import {
  BoardRecord,
  BoardSet,
  IconName,
  Tile,
  loadBoards,
  toBoardSet,
} from '../boards/board-data';
import { CellPosition } from '../scan/scan';
import {
  IconPicture,
  OpenFields,
  SpeakFields,
  SymbolPicture,
  addBoard,
  addCell,
  addGroup,
  editCell,
  moveCell,
  moveToNewGroup,
  fieldsOf,
  removeCell,
  removeGroup,
  setBoard,
} from './board-edits';

/** The picture of a symbol. */
const symbol = (file: string): SymbolPicture => ({ kind: 'symbol', symbol: file });

/** The picture of an icon. */
const icon = (name: IconName): IconPicture => ({ kind: 'icon', icon: name });

/** The built-in set. No case changes it, because every edit gives a new set. */
const BUILT_IN = toBoardSet(loadBoards(cellsFile, boardsFile).boards);

const JUICE: SpeakFields = {
  kind: 'speak',
  label: 'Juice',
  phrase: 'I want juice',
  picture: symbol('drink.svg'),
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
      picture: symbol('help.svg'),
      colour: 'light',
    }),
  BE6: () =>
    editCell(withHelpTwice(), 'needs', placeOf(BUILT_IN, 'needs', 'help'), {
      kind: 'speak',
      label: 'Help me',
      phrase: 'I need help',
      picture: symbol('help.svg'),
      colour: 'light',
    }),
  BE7: () => {
    const food = tile(BUILT_IN, 'food');
    return editCell(BUILT_IN, 'my-boards', placeOf(BUILT_IN, 'my-boards', 'food'), {
      kind: 'open',
      label: 'Meals',
      style: 'stage',
      colour: food.colour,
      picture: icon(food.icon ?? 'board'),
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
      picture: icon('place'),
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

  it('BE9: the cell that opens My boards is removed, and every board stays in the set', () => {
    const set = PRODUCED['BE9']();
    expect(layout(set, 'home')).toEqual([['needs'], ['quick-phrases', 'keyboards']]);
    expect(set.boards).toEqual(
      BUILT_IN.boards.map((item) => (item.id === 'home' ? board(set, 'home') : item)),
    );
    // Only the tile of the removed cell is gone. The tiles of My boards and of the boards it opens stay.
    const gone = BUILT_IN.tiles.filter((old) => !set.tiles.some((item) => item.id === old.id));
    expect(gone.map((item) => item.id)).toEqual(['my-boards']);
  });

  it('BE10: the cell that opens Keyboards, a locked board, is removed, and the keyboards stay in the set', () => {
    expect(board(BUILT_IN, 'keyboards').locked).toBe(true);
    const set = PRODUCED['BE10']();
    expect(layout(set, 'home')).toEqual([['my-boards', 'needs'], ['quick-phrases']]);
    const kept = ['keyboards', 'keyboard', 'keyboard-abc', 'keyboard-vowels', 'keyboard-numbers'];
    for (const id of kept) {
      expect(board(set, id), id).toEqual(board(BUILT_IN, id));
    }
    expect(set.tiles.some((item) => item.id === 'keyboards')).toBe(false);
    expect(set.tiles.some((item) => item.id === 'key-q')).toBe(true);
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
        picture: icon('back'),
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
        picture: symbol('help.svg'),
        colour,
      });
    const grey = recoloured(BUILT_IN, 'grey');
    expect(tile(grey, 'help').hue).toBe('c3');
    expect(tile(recoloured(grey, 'dark'), 'help').hue).toBeUndefined();
    expect(loadBoards(grey.tiles, grey.boards).faults).toEqual([]);
  });

  it('BE20: a cell that is dropped on Add column moves into a new group at the end of the board', () => {
    const set = moveToNewGroup(BUILT_IN, 'needs', placeOf(BUILT_IN, 'needs', 'help'));
    const before = layout(BUILT_IN, 'needs');
    expect(layout(set, 'needs')).toEqual([
      ['back', 'pain', 'toilet', 'drink'],
      before[1],
      before[2],
      ['help'],
    ]);
    expect(set.tiles).toBe(BUILT_IN.tiles);
    expect(loadBoards(set.tiles, set.boards).faults).toEqual([]);
  });

  it('BE21: the group that the only cell of a group leaves for a new group stays empty, and a locked board does not change', () => {
    const once = moveToNewGroup(BUILT_IN, 'needs', placeOf(BUILT_IN, 'needs', 'help'));
    const twice = moveToNewGroup(once, 'needs', { group: 3, cell: 0 });
    expect(layout(twice, 'needs').slice(3)).toEqual([[], ['help']]);
    expect(loadBoards(twice.tiles, twice.boards).faults).toEqual([]);
    expect(board(BUILT_IN, 'keyboard').locked).toBe(true);
    expect(moveToNewGroup(BUILT_IN, 'keyboard', { group: 0, cell: 0 })).toBe(BUILT_IN);
    expect(moveToNewGroup(BUILT_IN, 'needs', { group: 0, cell: 9 })).toBe(BUILT_IN);
  });
});

/** The fields of a cell that speaks, as the tile dialog reads them from a tile. */
function speakFieldsOf(shown: Tile): SpeakFields {
  const fields = fieldsOf(shown);
  if (fields?.kind !== 'speak') {
    throw new Error(`The tile "${shown.id}" is not a cell that speaks.`);
  }
  return fields;
}

/** The fields of a cell that opens a board, as the tile dialog reads them from a tile. */
function openFieldsOf(shown: Tile): OpenFields {
  const fields = fieldsOf(shown);
  if (fields?.kind !== 'open') {
    throw new Error(`The tile "${shown.id}" is not a cell that opens a board.`);
  }
  return fields;
}

/** A cell that speaks, with a picture or with none. */
const speaking = (label: string, picture?: SpeakFields['picture']): SpeakFields => ({
  kind: 'speak',
  label,
  phrase: '',
  colour: 'light',
  ...(picture && { picture }),
});

/** The built-in set in which the Yes tile is a `key` tile that shows the icon `check`. */
function withKeyYes(): BoardSet {
  return {
    tiles: BUILT_IN.tiles.map((item) =>
      item.id === 'yes-green' ? { ...item, style: 'key' } : item,
    ),
    boards: BUILT_IN.boards,
  };
}

/** The built-in set after the cell on home that opens Needs gets the symbol `dog.svg`. */
function withNeedsSymbol(): BoardSet {
  return editCell(BUILT_IN, 'home', placeOf(BUILT_IN, 'home', 'needs'), {
    ...openFieldsOf(tile(BUILT_IN, 'needs')),
    picture: symbol('dog.svg'),
  });
}

/** The sets that the cases of pictures produce. Case PE10 gives every one of them to `loadBoards`. */
const PICTURE_SETS: Readonly<Record<string, () => BoardSet>> = {
  PE1: () => addCell(BUILT_IN, 'needs', speaking('Advent', symbol('advent-calendar.svg'))),
  PE2: () => addCell(BUILT_IN, 'needs', speaking('Apple', icon('lucide:apple'))),
  PE3: () => addCell(BUILT_IN, 'needs', speaking('Hello')),
  PE4: () =>
    addBoard(BUILT_IN, 'home', {
      kind: 'open',
      label: 'Pets',
      style: 'bleed',
      colour: 'dark',
      picture: symbol('dog.svg'),
    }),
  PE5: () =>
    addBoard(BUILT_IN, 'home', {
      kind: 'open',
      label: 'House',
      style: 'stage',
      colour: 'dark',
      picture: icon('lucide:house'),
    }),
  PE6: () =>
    editCell(BUILT_IN, 'needs', placeOf(BUILT_IN, 'needs', 'help'), {
      ...speakFieldsOf(tile(BUILT_IN, 'help')),
      picture: icon('lucide:apple'),
    }),
  'PE7 symbol': withNeedsSymbol,
  'PE7 icon': () => {
    const before = withNeedsSymbol();
    return editCell(before, 'home', placeOf(before, 'home', 'needs'), {
      ...openFieldsOf(tile(before, 'needs')),
      style: 'signage',
      picture: icon('lucide:house'),
    });
  },
  PE8: () => {
    const before = withKeyYes();
    return editCell(before, 'yes-no', placeOf(before, 'yes-no', 'yes-green'), {
      ...speakFieldsOf(tile(before, 'yes-green')),
      label: 'Yes please',
    });
  },
};

/** The one tile of `after` that `before` does not have. */
function madeTile(before: BoardSet, after: BoardSet): Tile {
  const made = newTiles(before, after);
  expect(made.length).toBe(1);
  return made[0];
}

describe('The picture of a cell', () => {
  it('PE1: a cell that speaks is added with a symbol and has the symbol style and no icon', () => {
    const made = madeTile(BUILT_IN, PICTURE_SETS['PE1']());
    expect(made.style).toBe('symbol');
    expect(made.symbol).toBe('advent-calendar.svg');
    expect(made.icon).toBeUndefined();
  });

  it('PE2: a cell that speaks is added with an icon and has the symbol style and no symbol', () => {
    const made = madeTile(BUILT_IN, PICTURE_SETS['PE2']());
    expect(made.style).toBe('symbol');
    expect(made.icon).toBe('lucide:apple');
    expect(made.symbol).toBeUndefined();
  });

  it('PE3: a cell that speaks is added with no picture and has the key style', () => {
    const made = madeTile(BUILT_IN, PICTURE_SETS['PE3']());
    expect(made.style).toBe('key');
    expect(made.symbol).toBeUndefined();
    expect(made.icon).toBeUndefined();
  });

  it('PE4: a board is added with a symbol, and the cell that opens it has the symbol style and no icon', () => {
    const set = PICTURE_SETS['PE4']();
    const opener = newTiles(BUILT_IN, set).find((item) => item.action?.type === 'open');
    expect(opener?.style).toBe('symbol');
    expect(opener?.symbol).toBe('dog.svg');
    expect(opener?.icon).toBeUndefined();
  });

  it('PE5: a board is added with the Stage style and an icon, and the cell that opens it has both', () => {
    const set = PICTURE_SETS['PE5']();
    const opener = newTiles(BUILT_IN, set).find((item) => item.action?.type === 'open');
    expect(opener?.style).toBe('stage');
    expect(opener?.icon).toBe('lucide:house');
  });

  it('PE6: Help gets an icon in place of its symbol and keeps its id, its phrase and its colour', () => {
    const before = tile(BUILT_IN, 'help');
    const after = tile(PICTURE_SETS['PE6'](), 'help');
    expect(before.symbol).toBe('help.svg');
    expect(after.icon).toBe('lucide:apple');
    expect(after.symbol).toBeUndefined();
    expect(after.id).toBe(before.id);
    expect(after.action).toEqual(before.action);
    expect(after.colour).toBe(before.colour);
  });

  it('PE7: the cell that opens Needs gets a symbol, and then an icon with the Signage style', () => {
    const before = tile(BUILT_IN, 'needs');
    expect(before.style).toBe('bleed');
    expect(before.icon).toBe('heart');

    const withSymbol = tile(PICTURE_SETS['PE7 symbol'](), 'needs');
    expect(withSymbol.style).toBe('symbol');
    expect(withSymbol.symbol).toBe('dog.svg');

    const withIcon = tile(PICTURE_SETS['PE7 icon'](), 'needs');
    expect(withIcon.style).toBe('signage');
    expect(withIcon.icon).toBe('lucide:house');
    expect(withIcon.symbol).toBeUndefined();
  });

  it('PE8: a key tile that speaks and shows an icon keeps its style and its icon when only its label is edited', () => {
    const before = tile(withKeyYes(), 'yes-green');
    expect(before.style).toBe('key');
    expect(before.icon).toBe('check');
    expect(before.action?.type).toBe('speak');

    const after = tile(PICTURE_SETS['PE8'](), 'yes-green');
    expect(after.label).toBe('Yes please');
    expect(after.style).toBe('key');
    expect(after.icon).toBe('check');
  });

  it('PE9: fieldsOf reads a symbol, an icon of Lucide, an icon of the app and no picture', () => {
    const apple: Tile = {
      id: 'apple',
      label: 'Apple',
      colour: 'light',
      style: 'symbol',
      icon: 'lucide:apple',
      action: { type: 'speak', phrase: 'Apple' },
    };
    const hello: Tile = {
      id: 'hello',
      label: 'Hello',
      colour: 'light',
      style: 'key',
      action: { type: 'speak', phrase: 'Hello' },
    };
    expect(tile(BUILT_IN, 'needs').icon).toBe('heart');
    expect(fieldsOf(tile(BUILT_IN, 'help'))?.picture).toEqual(symbol('help.svg'));
    expect(fieldsOf(apple)?.picture).toEqual(icon('lucide:apple'));
    expect(fieldsOf(tile(BUILT_IN, 'needs'))?.picture).toEqual(icon('heart'));
    expect(fieldsOf(hello)).toBeDefined();
    expect(fieldsOf(hello)?.picture).toBeUndefined();
  });

  it('PE10: each set that cases PE1 to PE8 produce is read with no fault', () => {
    for (const [name, produce] of Object.entries(PICTURE_SETS)) {
      const set = produce();
      expect(set, name).not.toBe(BUILT_IN);
      expect(loadBoards(set.tiles, set.boards).faults, name).toEqual([]);
    }
  });
});
