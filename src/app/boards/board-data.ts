import { Injectable, InjectionToken, inject } from '@angular/core';
import boardsFile from '../../data/boards.json';
import cellsFile from '../../data/cells.json';
import { LayoutName, isLayoutName } from '../layout/layout';

/** The cell colours. Each name is a class in src/styles/cells.css. */
export const CELL_COLOURS = ['dark', 'light', 'soft1', 'grey', 'ink', 'green', 'red'] as const;
export type CellColour = (typeof CELL_COLOURS)[number];

/** The cell styles that this feature draws. */
export const CELL_STYLES = ['bleed', 'signage', 'stage', 'symbol', 'key', 'message'] as const;
export type CellStyle = (typeof CELL_STYLES)[number];

/** The hues that the Colours theme gives a cell. */
export const CELL_HUES = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;
export type CellHue = (typeof CELL_HUES)[number];

/** The line icons. The drawings are in src/app/cells/icon.ts. */
export const ICON_NAMES = [
  'board',
  'heart',
  'chat',
  'keyboard',
  'back',
  'backspace',
  'caps',
  'trash',
  'check',
  'cross',
  'restaurant',
  'cafe',
  'mood',
  'group',
  'place',
  'game',
  'thumbs',
  'apps',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

/** The sizes with a name, and the number of parts each one takes. */
export const NAMED_SIZES = { small: 3, medium: 4, large: 5 } as const;
export type CellSize = keyof typeof NAMED_SIZES | number;

export type TileAction =
  | { readonly type: 'open'; readonly board: string }
  | { readonly type: 'speak'; readonly phrase: string }
  | { readonly type: 'type'; readonly text: string }
  | { readonly type: 'back' }
  | { readonly type: 'backspace' }
  | { readonly type: 'clear' }
  | { readonly type: 'caps' };

const ACTION_TYPES = ['open', 'speak', 'type', 'back', 'backspace', 'clear', 'caps'] as const;

export interface Tile {
  readonly id: string;
  readonly label: string;
  readonly colour: CellColour;
  readonly style: CellStyle;
  readonly hue?: CellHue;
  readonly icon?: IconName;
  /** A key with an icon shows its label beside the icon when this is true. */
  readonly caption?: true;
  /** The file name of a symbol in public/symbols. */
  readonly symbol?: string;
  /** The name for screen readers, when the label is a sign. */
  readonly name?: string;
  readonly action?: TileAction;
}

export interface Cell {
  readonly tile: Tile;
  readonly size?: CellSize;
}

export interface Group {
  readonly cells: readonly Cell[];
}

export interface Board {
  readonly id: string;
  readonly title: string;
  /** A board that gives a layout is always drawn that way. */
  readonly layout?: LayoutName;
  readonly groups: readonly Group[];
}

export interface LoadedBoards {
  readonly boards: readonly Board[];
  /** One line for each thing that was skipped. Each line names what was skipped and why. */
  readonly faults: readonly string[];
}

/** The id of the board that is the home screen. */
export const HOME_BOARD_ID = 'home';

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return list.some((item) => item === value);
}

function isNamedSize(value: unknown): value is keyof typeof NAMED_SIZES {
  return typeof value === 'string' && Object.hasOwn(NAMED_SIZES, value);
}

/** Gives the first field that is not in the list, or nothing when every field is known. */
function unknownField(value: Json, known: readonly string[]): string | undefined {
  return Object.keys(value).find((key) => !known.includes(key));
}

function show(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
}

/** A symbol is a plain file name, so the data cannot point outside the symbols folder. */
const SYMBOL_FILE = /^[a-z0-9-]+\.svg$/;

const TILE_FIELDS = [
  'id',
  'label',
  'colour',
  'style',
  'hue',
  'icon',
  'caption',
  'symbol',
  'name',
  'action',
];

/** Reads the action of a tile. It gives the action, or a line that says what is wrong with it. */
function readAction(value: unknown): TileAction | string {
  if (!isRecord(value)) {
    return 'its action must be one object';
  }
  const type = value['type'];
  if (!isOneOf(ACTION_TYPES, type)) {
    return `its action type ${show(type)} is not known`;
  }
  const fields = { open: 'board', speak: 'phrase', type: 'text' } as const;
  const field = type === 'open' || type === 'speak' || type === 'type' ? fields[type] : undefined;
  const extra = unknownField(value, field ? ['type', field] : ['type']);
  if (extra) {
    return `its action has the unknown field "${extra}"`;
  }
  switch (type) {
    case 'open': {
      const board = value['board'];
      return isText(board) ? { type, board } : 'its open action names no board';
    }
    case 'speak': {
      const phrase = value['phrase'];
      return isText(phrase) ? { type, phrase } : 'its speak action gives no phrase';
    }
    case 'type': {
      const text = value['text'];
      // A space is a text that can be typed, so only the empty text is refused.
      return typeof text === 'string' && text !== ''
        ? { type, text }
        : 'its type action gives no text';
    }
    default:
      return { type };
  }
}

/** Reads one tile. It gives the tile, or a line that says what is wrong with it. */
function readTile(value: Json, id: string): Tile | string {
  const extra = unknownField(value, TILE_FIELDS);
  if (extra) {
    return `it has the unknown field "${extra}"`;
  }
  const { label, colour, style, hue, icon, caption, symbol, name, action } = value;
  if (!isText(label)) {
    return 'it has no label';
  }
  if (!isOneOf(CELL_COLOURS, colour)) {
    return `its colour ${show(colour)} is not known`;
  }
  if (!isOneOf(CELL_STYLES, style)) {
    return `its style ${show(style)} is not known`;
  }
  if (hue !== undefined && !isOneOf(CELL_HUES, hue)) {
    return `its hue ${show(hue)} is not known`;
  }
  if (icon !== undefined && !isOneOf(ICON_NAMES, icon)) {
    return `its icon ${show(icon)} is not known`;
  }
  if ((style === 'bleed' || style === 'signage' || style === 'stage') && icon === undefined) {
    return `a ${style} tile must name an icon`;
  }
  if (caption !== undefined && caption !== true) {
    return `its caption ${show(caption)} is not true`;
  }
  if (symbol !== undefined && !(typeof symbol === 'string' && SYMBOL_FILE.test(symbol))) {
    return `its symbol ${show(symbol)} is not a file name such as "help.svg"`;
  }
  if (style === 'symbol' && symbol === undefined) {
    return 'a symbol tile must name a symbol';
  }
  if (name !== undefined && !isText(name)) {
    return 'its name is empty';
  }
  let readActionResult: TileAction | undefined;
  if (action !== undefined) {
    const result = readAction(action);
    if (typeof result === 'string') {
      return result;
    }
    readActionResult = result;
  }
  return {
    id,
    label,
    colour,
    style,
    ...(hue !== undefined && { hue }),
    ...(icon !== undefined && { icon }),
    ...(caption === true && { caption }),
    ...(symbol !== undefined && { symbol }),
    ...(name !== undefined && { name }),
    ...(readActionResult && { action: readActionResult }),
  };
}

/** A board whose own fields are sound. Its cells are read later, when the tiles are known. */
interface BoardShell {
  readonly id: string;
  readonly title: string;
  readonly layout?: LayoutName;
  readonly groups: readonly (readonly unknown[])[];
}

/** Reads the fields of one board, without its cells. It gives the board, or a line that says what is wrong. */
function readBoardShell(value: Json, id: string): BoardShell | string {
  const extra = unknownField(value, ['id', 'title', 'layout', 'groups']);
  if (extra) {
    return `it has the unknown field "${extra}"`;
  }
  const { title, layout, groups } = value;
  if (!isText(title)) {
    return 'it has no title';
  }
  if (layout !== undefined && !isLayoutName(layout)) {
    return `its layout ${show(layout)} is not known`;
  }
  if (!Array.isArray(groups)) {
    return 'it has no list of groups';
  }
  const cellLists: (readonly unknown[])[] = [];
  for (const group of groups) {
    const cells: unknown = isRecord(group) ? group['cells'] : undefined;
    if (!isRecord(group) || !Array.isArray(cells) || unknownField(group, ['cells'])) {
      return 'each of its groups must hold a list of cells and nothing else';
    }
    cellLists.push(cells);
  }
  return { id, title, ...(layout !== undefined && { layout }), groups: cellLists };
}

/**
 * Checks the contents of cells.json and boards.json and joins each cell to its tile.
 * Data that breaks a rule is skipped and the rest is kept. A faulty tile takes its cells with it,
 * a faulty cell leaves the other cells of its group, and a faulty board is left out whole.
 * When two tiles or two boards share an id, the first is read and the others are skipped,
 * even when the first turns out to be faulty.
 */
export function loadBoards(tilesInput: unknown, boardsInput: unknown): LoadedBoards {
  const faults: string[] = [];

  // Step 1. Read each tile on its own.
  const tiles = new Map<string, Tile>();
  const seenTiles = new Set<string>();
  if (!Array.isArray(tilesInput)) {
    faults.push('cells.json was skipped: it must hold a list of tiles.');
  }
  for (const value of Array.isArray(tilesInput) ? tilesInput : []) {
    const id: unknown = isRecord(value) ? value['id'] : undefined;
    if (!isRecord(value) || !isText(id)) {
      faults.push('A tile was skipped: it has no id.');
      continue;
    }
    if (seenTiles.has(id)) {
      faults.push(`A second tile "${id}" was skipped: an earlier tile already uses that id.`);
      continue;
    }
    seenTiles.add(id);
    const tile = readTile(value, id);
    if (typeof tile === 'string') {
      faults.push(`The tile "${id}" was skipped: ${tile}.`);
    } else {
      tiles.set(id, tile);
    }
  }

  // Step 2. Read the fields of each board.
  const shells = new Map<string, BoardShell>();
  const seenBoards = new Set<string>();
  if (!Array.isArray(boardsInput)) {
    faults.push('boards.json was skipped: it must hold a list of boards.');
  }
  for (const value of Array.isArray(boardsInput) ? boardsInput : []) {
    const id: unknown = isRecord(value) ? value['id'] : undefined;
    if (!isRecord(value) || !isText(id)) {
      faults.push('A board was skipped: it has no id.');
      continue;
    }
    if (seenBoards.has(id)) {
      faults.push(`A second board "${id}" was skipped: an earlier board already uses that id.`);
      continue;
    }
    seenBoards.add(id);
    const shell = readBoardShell(value, id);
    if (typeof shell === 'string') {
      faults.push(`The board "${id}" was skipped: ${shell}.`);
    } else {
      shells.set(id, shell);
    }
  }

  // Step 3. A tile that opens a board that is missing or was skipped is skipped too.
  for (const [id, tile] of tiles) {
    if (tile.action?.type === 'open' && !shells.has(tile.action.board)) {
      faults.push(
        `The tile "${id}" was skipped: it opens the board "${tile.action.board}", which is missing or was skipped.`,
      );
      tiles.delete(id);
    }
  }

  // Step 4. Read the cells and join each one to its tile.
  const boards: Board[] = [];
  for (const shell of shells.values()) {
    const groups = shell.groups.map((cellValues, groupIndex): Group => {
      const cells: Cell[] = [];
      cellValues.forEach((value, cellIndex) => {
        const where = `Cell ${cellIndex + 1} of group ${groupIndex + 1} on the board "${shell.id}" was skipped`;
        if (!isRecord(value) || !isText(value['tile'])) {
          faults.push(`${where}: it names no tile.`);
          return;
        }
        const extra = unknownField(value, ['tile', 'size']);
        if (extra) {
          faults.push(`${where}: it has the unknown field "${extra}".`);
          return;
        }
        const size = value['size'];
        const sizeIsSound =
          size === undefined ||
          isNamedSize(size) ||
          (typeof size === 'number' && Number.isInteger(size) && size >= 1);
        if (!sizeIsSound) {
          faults.push(
            `${where}: its size ${show(size)} is not small, medium, large or a whole number of 1 or more.`,
          );
          return;
        }
        const tile = tiles.get(value['tile']);
        if (!tile) {
          // A tile that was skipped has its own line already. A tile that was never there gets one here.
          if (!seenTiles.has(value['tile'])) {
            faults.push(`${where}: there is no tile "${value['tile']}".`);
          }
          return;
        }
        cells.push(isNamedSize(size) || typeof size === 'number' ? { tile, size } : { tile });
      });
      return { cells };
    });
    boards.push({
      id: shell.id,
      title: shell.title,
      ...(shell.layout !== undefined && { layout: shell.layout }),
      groups,
    });
  }

  return { boards, faults };
}

/** The contents of the two data files. The tests replace them. */
export interface BoardFiles {
  readonly tiles: unknown;
  readonly boards: unknown;
}

/** The files that are built into the app. Feature 9 adds the boards that the caregiver edits. */
export const BOARD_FILES = new InjectionToken<BoardFiles>('BOARD_FILES', {
  providedIn: 'root',
  factory: () => ({ tiles: cellsFile, boards: boardsFile }),
});

/** Reads the two data files once and gives a board by its id. */
@Injectable({ providedIn: 'root' })
export class BoardData {
  private readonly byId = new Map<string, Board>();

  constructor() {
    const files = inject(BOARD_FILES);
    const { boards, faults } = loadBoards(files.tiles, files.boards);
    for (const board of boards) {
      this.byId.set(board.id, board);
    }
    // The caregiver or the developer can find each skipped item in the console.
    for (const fault of faults) {
      console.warn(fault);
    }
  }

  /** Gives the board with this id, or nothing when there is none. */
  board(id: string): Board | undefined {
    return this.byId.get(id);
  }
}
