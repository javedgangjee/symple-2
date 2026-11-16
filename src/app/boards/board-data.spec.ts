import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import boardsFile from '../../data/boards.json';
import cellsFile from '../../data/cells.json';
import { BOARD_FILES, Board, BoardData, Cell, LoadedBoards, loadBoards } from './board-data';

type Json = Record<string, unknown>;

function boardOf(loaded: LoadedBoards, id: string): Board {
  const board = loaded.boards.find((candidate) => candidate.id === id);
  if (!board) {
    throw new Error(`There is no board "${id}".`);
  }
  return board;
}

const ids = (cells: readonly Cell[]) => cells.map((cell) => cell.tile.id);
const labels = (cells: readonly Cell[]) => cells.map((cell) => cell.tile.label);
const sizes = (cells: readonly Cell[]) => cells.map((cell) => cell.size);

function phrase(cell: Cell): string | undefined {
  return cell.tile.action?.type === 'speak' ? cell.tile.action.phrase : undefined;
}

function typed(cell: Cell): string | undefined {
  return cell.tile.action?.type === 'type' ? cell.tile.action.text : undefined;
}

function opened(cell: Cell): string | undefined {
  return cell.tile.action?.type === 'open' ? cell.tile.action.board : undefined;
}

describe('Board data with the real files', () => {
  const loaded = loadBoards(cellsFile, boardsFile);
  const everyCell = loaded.boards.flatMap((board) => board.groups.flatMap((group) => group.cells));

  function tile(id: string) {
    const found = everyCell.find((cell) => cell.tile.id === id);
    if (!found) {
      throw new Error(`No cell shows the tile "${id}".`);
    }
    return found.tile;
  }

  it('D1: the home board has two groups of two cells with no sizes', () => {
    const home = boardOf(loaded, 'home');
    expect(home.title).toBe('Home');
    expect(home.groups.length).toBe(2);
    expect(ids(home.groups[0].cells)).toEqual(['my-boards', 'needs']);
    expect(ids(home.groups[1].cells)).toEqual(['quick-phrases', 'keyboards']);
    expect(sizes([...home.groups[0].cells, ...home.groups[1].cells])).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(everyCell.some((cell) => cell.tile.label === 'Devices')).toBe(false);
  });

  it('D2: the four home tiles have the values of requirement 31', () => {
    const expected = [
      ['my-boards', 'My boards', 'board', 'dark', 'c1', 'my-boards'],
      ['needs', 'Needs', 'heart', 'soft1', 'c2', 'needs'],
      ['quick-phrases', 'Quick phrases', 'chat', 'grey', 'c3', 'quick-phrases'],
      ['keyboards', 'Keyboards', 'keyboard', 'dark', 'c5', 'keyboard'],
    ];
    for (const [id, label, icon, colour, hue, board] of expected) {
      expect(tile(id)).toEqual({
        id,
        label,
        icon,
        colour,
        hue,
        style: 'bleed',
        action: { type: 'open', board },
      });
    }
  });

  it('D3: the needs board has Back, then three groups of four with the mockup phrases', () => {
    const needs = boardOf(loaded, 'needs');
    expect(needs.title).toBe('Needs');
    expect(needs.groups.length).toBe(3);
    expect(needs.groups[0].cells[0].tile.id).toBe('back');
    const groups = [needs.groups[0].cells.slice(1), needs.groups[1].cells, needs.groups[2].cells];
    expect(groups.map((cells) => cells.map((cell) => [cell.tile.label, phrase(cell)]))).toEqual([
      [
        ['Help', 'I need help'],
        ['Pain', 'I am in pain'],
        ['Toilet', 'I need the toilet'],
        ['Drink', 'I need a drink'],
      ],
      [
        ['Eat', 'I am hungry'],
        ['Medicine', 'I need my medicine'],
        ['Hot', 'I am too hot'],
        ['Blanket', 'I am cold. I need a blanket'],
      ],
      [
        ['Bed', 'I want to go to bed'],
        ['Move me', 'Please move me'],
        ['Itch', 'I have an itch'],
        ['Glasses', 'I need my glasses'],
      ],
    ]);
  });

  it('D4: my boards has Back, then six cells in three groups that open the topic boards', () => {
    const board = boardOf(loaded, 'my-boards');
    expect(board.groups.map((group) => group.cells.length)).toEqual([3, 2, 2]);
    expect(board.groups[0].cells[0].tile.id).toBe('back');
    const cells = board.groups.flatMap((group) => group.cells).slice(1);
    expect(labels(cells)).toEqual(['Food', 'Drinks', 'Feelings', 'People', 'Places', 'Activities']);
    expect(cells.map(opened)).toEqual([
      'food',
      'drinks',
      'feelings',
      'people',
      'places',
      'activities',
    ]);
  });

  it('D5: the boards of requirement 24 have three groups of three, with Back first', () => {
    const expected: Record<string, string[]> = {
      'quick-phrases': ['Yes', 'No', 'More', 'Good', 'Hello', 'Finished', "I don't know", 'Wait'],
      food: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Fruit', 'Soup', 'Bread', 'Something sweet'],
      drinks: [
        'Water',
        'Tea',
        'Coffee',
        'Juice',
        'Milk',
        'Something cold',
        'Something hot',
        'Straw',
      ],
      feelings: ['Happy', 'Sad', 'Tired', 'Angry', 'Scared', 'Worried', 'Hungry', 'Fine'],
      people: [
        'Family',
        'Grandparents',
        'Carer',
        'Doctor',
        'Nurse',
        'Visitor',
        'Partner',
        'Parents',
      ],
      places: ['Home', 'Bedroom', 'Bathroom', 'Kitchen', 'Garden', 'Outside', 'Shop', 'Hospital'],
      activities: ['TV', 'Music', 'Read', 'Go out', 'Rest', 'Phone call', 'Game', 'Shower'],
    };
    for (const [id, wanted] of Object.entries(expected)) {
      const board = boardOf(loaded, id);
      expect(
        board.groups.map((group) => group.cells.length),
        id,
      ).toEqual([3, 3, 3]);
      expect(board.groups[0].cells[0].tile.id, id).toBe('back');
      const cells = board.groups.flatMap((group) => group.cells).slice(1);
      expect(labels(cells), id).toEqual(wanted);
      for (const cell of cells) {
        expect(phrase(cell)?.trim(), `${id} ${cell.tile.label}`).toBeTruthy();
      }
    }
  });

  it('D6: every symbol file exists and is listed in ATTRIBUTION.txt', () => {
    const folder = join(process.cwd(), 'public', 'symbols');
    const listed = readFileSync(join(folder, 'ATTRIBUTION.txt'), 'utf8')
      .split('\n')
      .map((line) => line.split(/\s+/)[0]);
    const symbolTiles = everyCell.filter((cell) => cell.tile.style === 'symbol');
    expect(symbolTiles.length).toBeGreaterThan(0);
    for (const { tile: symbolTile } of symbolTiles) {
      const file = symbolTile.symbol ?? '';
      expect(existsSync(join(folder, file)), file).toBe(true);
      expect(listed, file).toContain(file);
    }
  });

  it('D7: every board can be reached from home', () => {
    const reached = new Set(['home']);
    const queue = ['home'];
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      for (const cell of boardOf(loaded, id).groups.flatMap((group) => group.cells)) {
        const next = opened(cell);
        if (next !== undefined && !reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    expect(loaded.boards.length).toBe(12);
    expect([...reached].sort()).toEqual(loaded.boards.map((board) => board.id).sort());
  });

  it('D8: every board except home has one Back tile, as its first cell', () => {
    for (const board of loaded.boards) {
      const cells = board.groups.flatMap((group) => group.cells);
      const backs = cells.filter((cell) => cell.tile.action?.type === 'back');
      if (board.id === 'home') {
        expect(backs.length, board.id).toBe(0);
        continue;
      }
      expect(backs.length, board.id).toBe(1);
      expect(board.groups[0].cells[0].tile, board.id).toEqual({
        id: 'back',
        label: 'Back',
        colour: 'ink',
        style: 'stage',
        icon: 'back',
        action: { type: 'back' },
      });
    }
  });

  it('D12: the two shipped files have no faults', () => {
    expect(loaded.faults).toEqual([]);
  });

  it('D9: the keyboard board has the message row, three letter rows and the bottom row', () => {
    const board = boardOf(loaded, 'keyboard');
    expect(board.title).toBe('Keyboard');
    expect(board.layout).toBe('rows');
    expect(board.groups.length).toBe(5);
    expect(ids(board.groups[0].cells)).toEqual(['back', 'message']);
    expect(board.groups[0].cells[1].tile.style).toBe('message');
    expect(sizes(board.groups[0].cells)).toEqual([1, 9]);
    expect(labels(board.groups[1].cells)).toEqual([...'qwertyuiop']);
    expect(labels(board.groups[2].cells)).toEqual([...'asdfghjkl', 'Backspace']);
    expect(labels(board.groups[3].cells)).toEqual(['Caps lock', ...'zxcvbnm', '.', '?']);
    expect(labels(board.groups[4].cells)).toEqual(['123', 'Space', 'Clear']);
    expect(sizes(board.groups[4].cells)).toEqual([2, 6, 2]);
  });

  it('D10: the keys of the keyboard board type, erase, lock and open as they should', () => {
    const cells = boardOf(loaded, 'keyboard').groups.flatMap((group) => group.cells);
    const byLabel = (label: string) => {
      const cell = cells.find((candidate) => candidate.tile.label === label);
      if (!cell) {
        throw new Error(`There is no key "${label}".`);
      }
      return cell;
    };
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      const cell = byLabel(letter);
      expect(typed(cell), letter).toBe(letter);
      expect(cell.tile.style, letter).toBe('key');
      expect(cell.tile.colour, letter).toBe('light');
    }
    expect(typed(byLabel('Space'))).toBe(' ');
    expect(byLabel('.').tile.name).toBe('Full stop');
    expect(byLabel('?').tile.name).toBe('Question mark');
    expect(byLabel('Backspace').tile.action?.type).toBe('backspace');
    expect(byLabel('Clear').tile.action?.type).toBe('clear');
    expect(byLabel('Caps lock').tile.action?.type).toBe('caps');
    expect(opened(byLabel('123'))).toBe('keyboard-numbers');
  });

  it('D11: the numbers board has the same top row and the signs of requirement 48', () => {
    const board = boardOf(loaded, 'keyboard-numbers');
    expect(board.title).toBe('Numbers and symbols');
    expect(board.layout).toBe('rows');
    expect(board.groups.length).toBe(5);
    expect(board.groups[0]).toEqual(boardOf(loaded, 'keyboard').groups[0]);
    const rows = [[...'1234567890'], [...'-/:;()&@"\''], [...',!£$%+=.?']];
    expect(labels(board.groups[1].cells)).toEqual(rows[0]);
    expect(labels(board.groups[2].cells)).toEqual(rows[1]);
    expect(labels(board.groups[3].cells)).toEqual([...rows[2], 'Backspace']);
    const signKeys = [
      ...board.groups[1].cells,
      ...board.groups[2].cells,
      ...board.groups[3].cells.slice(0, -1),
    ];
    expect(signKeys.map(typed)).toEqual(rows.flat());
    expect(labels(board.groups[4].cells)).toEqual(['Space', 'Clear']);
    expect(sizes(board.groups[4].cells)).toEqual([8, 2]);
  });
});

describe('Board data rules', () => {
  // Valid test data. Each case copies it and changes one thing.
  function validTiles(): Json[] {
    return [
      {
        id: 'needs',
        label: 'Needs',
        colour: 'soft1',
        hue: 'c2',
        style: 'bleed',
        icon: 'heart',
        action: { type: 'open', board: 'food' },
      },
      {
        id: 'help',
        label: 'Help',
        colour: 'light',
        style: 'symbol',
        symbol: 'help.svg',
        action: { type: 'speak', phrase: 'I need help' },
      },
      {
        id: 'key-a',
        label: 'a',
        colour: 'light',
        style: 'key',
        action: { type: 'type', text: 'a' },
      },
      { id: 'plain', label: 'Plain', colour: 'grey', style: 'key' },
    ];
  }

  function validBoards(): { id: string; title?: string; layout?: string; groups: Json[] }[] {
    return [
      {
        id: 'home',
        title: 'Home',
        groups: [{ cells: [{ tile: 'needs' }, { tile: 'help' }, { tile: 'key-a' }] }],
      },
      { id: 'food', title: 'Food', groups: [{ cells: [{ tile: 'plain' }] }] },
    ];
  }

  /** Changes one tile of the valid data and loads the result. */
  function withTile(id: string, change: Json): LoadedBoards {
    const tiles = validTiles().map((tile) => (tile['id'] === id ? { ...tile, ...change } : tile));
    return loadBoards(tiles, validBoards());
  }

  /** Replaces the cells of the home board and loads the result. */
  function withHomeCells(cells: Json[]): LoadedBoards {
    const boards = validBoards();
    boards[0].groups = [{ cells }];
    return loadBoards(validTiles(), boards);
  }

  const homeIds = (loaded: LoadedBoards) => ids(boardOf(loaded, 'home').groups[0].cells);

  /** Checks that one cell was skipped: the others are there in order, and one fault holds the word. */
  function expectSkipped(loaded: LoadedBoards, skipped: string, word: string): void {
    const all = ['needs', 'help', 'key-a'];
    expect(homeIds(loaded)).toEqual(all.filter((id) => id !== skipped));
    expect(loaded.faults.length).toBe(1);
    expect(loaded.faults[0]).toContain(word);
  }

  it('the valid test data has no faults', () => {
    const loaded = loadBoards(validTiles(), validBoards());
    expect(loaded.faults).toEqual([]);
    expect(homeIds(loaded)).toEqual(['needs', 'help', 'key-a']);
  });

  it('R1: a cell that names a missing tile is skipped', () => {
    const loaded = withHomeCells([{ tile: 'needs' }, { tile: 'nope' }, { tile: 'key-a' }]);
    expect(homeIds(loaded)).toEqual(['needs', 'key-a']);
    expect(loaded.faults.length).toBe(1);
    expect(loaded.faults[0]).toContain('nope');
  });

  it('R2: the first of two tiles with one id is kept', () => {
    const tiles = [...validTiles(), { ...validTiles()[0], label: 'Second' }];
    const loaded = loadBoards(tiles, validBoards());
    expect(boardOf(loaded, 'home').groups[0].cells[0].tile.label).toBe('Needs');
    expect(loaded.faults.length).toBe(1);
    expect(loaded.faults[0]).toContain('needs');
  });

  it('R3: the first of two boards with one id is kept', () => {
    const boards = [...validBoards(), { id: 'food', title: 'Second', groups: [] }];
    const loaded = loadBoards(validTiles(), boards);
    expect(loaded.boards.filter((board) => board.id === 'food').length).toBe(1);
    expect(boardOf(loaded, 'food').title).toBe('Food');
    expect(loaded.faults.length).toBe(1);
    expect(loaded.faults[0]).toContain('food');
  });

  it('R4: a tile with an unknown colour is skipped', () => {
    expectSkipped(withTile('help', { colour: 'pink' }), 'help', 'pink');
  });

  it('R5: a tile with an unknown icon is skipped', () => {
    expectSkipped(withTile('needs', { icon: 'rocket' }), 'needs', 'rocket');
  });

  it('R6: a tile with a style that is not built is skipped', () => {
    expectSkipped(withTile('help', { style: 'hero' }), 'help', 'hero');
  });

  it('R7: a tile with an unknown hue is skipped', () => {
    expectSkipped(withTile('needs', { hue: 'c9' }), 'needs', 'c9');
  });

  it('R8: a tile with an empty label is skipped', () => {
    expectSkipped(withTile('help', { label: '' }), 'help', 'help');
  });

  it('R9: a cell with an unknown size is skipped', () => {
    const loaded = withHomeCells([
      { tile: 'needs' },
      { tile: 'help', size: 'huge' },
      { tile: 'key-a' },
    ]);
    expectSkipped(loaded, 'help', 'huge');
  });

  it('R10: a bleed tile with no icon is skipped', () => {
    expectSkipped(withTile('needs', { icon: undefined }), 'needs', 'needs');
  });

  it('R11: a symbol tile with no symbol is skipped', () => {
    expectSkipped(withTile('help', { symbol: undefined }), 'help', 'help');
  });

  it('R12: a tile that opens a missing board is skipped', () => {
    const loaded = withTile('needs', { action: { type: 'open', board: 'nowhere' } });
    expectSkipped(loaded, 'needs', 'nowhere');
  });

  it('R13: a tile with two actions is skipped', () => {
    const loaded = withTile('help', {
      action: [{ type: 'speak', phrase: 'I need help' }, { type: 'back' }],
    });
    expectSkipped(loaded, 'help', 'help');
  });

  it('R14: a board with no title is skipped, and so is a tile that opens it', () => {
    const boards = validBoards();
    delete boards[1].title;
    const loaded = loadBoards(validTiles(), boards);
    expect(loaded.boards.map((board) => board.id)).toEqual(['home']);
    expect(loaded.faults.some((fault) => fault.includes('"food"') && fault.includes('title'))).toBe(
      true,
    );
    expect(homeIds(loaded)).toEqual(['help', 'key-a']);
  });

  it('R15: a board can have six groups and a group six cells', () => {
    const boards = validBoards();
    boards[1].groups = Array.from({ length: 6 }, () => ({
      cells: Array.from({ length: 6 }, () => ({ tile: 'plain' })),
    }));
    const loaded = loadBoards(validTiles(), boards);
    expect(loaded.faults).toEqual([]);
    const food = boardOf(loaded, 'food');
    expect(food.groups.length).toBe(6);
    expect(food.groups.every((group) => group.cells.length === 6)).toBe(true);
  });

  it('R16: a group with no cells and a board with no groups are allowed', () => {
    const boards = validBoards();
    boards[0].groups.push({ cells: [] });
    boards[1].groups = [];
    const loaded = loadBoards(validTiles(), boards);
    expect(loaded.faults).toEqual([]);
    expect(boardOf(loaded, 'home').groups[1].cells).toEqual([]);
    expect(boardOf(loaded, 'food').groups).toEqual([]);
  });

  it('R17: a cell with no size has no size', () => {
    const loaded = loadBoards(validTiles(), validBoards());
    expect(loaded.faults).toEqual([]);
    expect(Object.hasOwn(boardOf(loaded, 'home').groups[0].cells[0], 'size')).toBe(false);
  });

  it('R18: the service gives no board for an unknown id', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BOARD_FILES, useValue: { tiles: validTiles(), boards: validBoards() } },
      ],
    });
    const service = TestBed.inject(BoardData);
    expect(() => service.board('missing')).not.toThrow();
    expect(service.board('missing')).toBeUndefined();
    expect(service.board('food')?.title).toBe('Food');
  });

  it('R19: a board with an unknown layout is skipped', () => {
    const boards = validBoards();
    boards[1].layout = 'diagonal';
    const loaded = loadBoards(validTiles(), boards);
    expect(loaded.boards.map((board) => board.id)).toEqual(['home']);
    expect(loaded.faults.some((fault) => fault.includes('diagonal'))).toBe(true);
  });

  it('R20: a board with no layout has no layout', () => {
    const loaded = loadBoards(validTiles(), validBoards());
    expect(loaded.faults).toEqual([]);
    expect(Object.hasOwn(boardOf(loaded, 'home'), 'layout')).toBe(false);
  });

  it('R21: a cell with a size of 0 or 1.5 is skipped', () => {
    const loaded = withHomeCells([
      { tile: 'needs', size: 0 },
      { tile: 'help', size: 1.5 },
      { tile: 'key-a', size: 2 },
    ]);
    expect(homeIds(loaded)).toEqual(['key-a']);
    expect(loaded.faults.length).toBe(2);
  });

  it('R22: a cell with a span field is skipped', () => {
    const loaded = withHomeCells([{ tile: 'needs' }, { tile: 'help', span: 2 }, { tile: 'key-a' }]);
    expectSkipped(loaded, 'help', 'span');
  });

  it('R23: a tile with an unknown action type is skipped', () => {
    expectSkipped(withTile('help', { action: { type: 'enter' } }), 'help', 'enter');
  });

  it('R24: an open action with no board and a speak action with no phrase are skipped', () => {
    expectSkipped(withTile('needs', { action: { type: 'open' } }), 'needs', 'needs');
    expectSkipped(withTile('help', { action: { type: 'speak' } }), 'help', 'help');
  });

  it('R25: a type action with an empty text is skipped', () => {
    expectSkipped(withTile('key-a', { action: { type: 'type', text: '' } }), 'key-a', 'key-a');
  });

  it('R26: the other two cells stay when one of three names a missing tile', () => {
    let loaded: LoadedBoards | undefined;
    expect(() => {
      loaded = withHomeCells([{ tile: 'needs' }, { tile: 'nope' }, { tile: 'help' }]);
    }).not.toThrow();
    expect(loaded && homeIds(loaded)).toEqual(['needs', 'help']);
  });

  it('R27: the service writes each fault to the console as a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tiles = validTiles().map((tile) =>
      tile['id'] === 'help' ? { ...tile, colour: 'pink' } : tile,
    );
    const { faults } = loadBoards(tiles, validBoards());
    expect(faults.length).toBe(1);
    TestBed.configureTestingModule({
      providers: [{ provide: BOARD_FILES, useValue: { tiles, boards: validBoards() } }],
    });
    TestBed.inject(BoardData);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(faults[0]);
    warn.mockRestore();
  });
});
