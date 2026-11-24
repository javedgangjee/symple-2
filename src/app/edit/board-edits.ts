import {
  BoardRecord,
  BoardSet,
  CellColour,
  CellHue,
  CellRecord,
  GroupRecord,
  HOME_BOARD_ID,
  IconName,
  Tile,
} from '../boards/board-data';
import { LayoutName } from '../layout/layout';
import { CellPosition } from '../scan/scan';

/**
 * The changes that the caregiver makes to the set of boards. Each function takes a set and
 * gives a new one, and gives the same set back when the change is not allowed or changes
 * nothing. No function touches the page or storage.
 */

/** The longest label of a cell and the longest title of a board, in characters. */
export const LABEL_LENGTH = 24;

/** The longest phrase of a cell that speaks, in characters. */
export const PHRASE_LENGTH = 200;

/** The styles that the caregiver can give a cell that opens a board. */
export const BOARD_CELL_STYLES = ['bleed', 'signage', 'stage'] as const;
export type BoardCellStyle = (typeof BOARD_CELL_STYLES)[number];

/** The number of groups that a new board starts with. Its first group holds the Back cell. */
const NEW_BOARD_GROUPS = 3;

/** What the caregiver gives for a cell that speaks. */
export interface SpeakFields {
  readonly kind: 'speak';
  readonly label: string;
  /** The phrase to speak. An empty phrase speaks the label. */
  readonly phrase: string;
  /** The file name of a symbol, or nothing for a cell that shows its label alone. */
  readonly symbol?: string;
  readonly colour: CellColour;
}

/** What the caregiver gives for a cell that opens a board. The label is also the title of the board. */
export interface OpenFields {
  readonly kind: 'open';
  readonly label: string;
  readonly style: BoardCellStyle;
  readonly colour: CellColour;
  readonly icon: IconName;
}

export type CellFields = SpeakFields | OpenFields;

/** What goes when a cell is removed: the boards that nothing else reaches, and the number of their cells. */
export interface Removal {
  readonly boards: readonly BoardRecord[];
  readonly cells: number;
}

function newId(kind: 'tile' | 'board'): string {
  return `${kind}-${crypto.randomUUID()}`;
}

/** A label or a title as it is stored: with no space at either end, and no longer than the limit. */
function clean(text: string, limit: number): string {
  return text.trim().slice(0, limit).trim();
}

function boardOf(set: BoardSet, boardId: string): BoardRecord | undefined {
  return set.boards.find((board) => board.id === boardId);
}

/** The board with this id, when the caregiver can edit it. */
function editable(set: BoardSet, boardId: string): BoardRecord | undefined {
  const board = boardOf(set, boardId);
  return board?.locked ? undefined : board;
}

function tileOf(set: BoardSet, id: string): Tile | undefined {
  return set.tiles.find((tile) => tile.id === id);
}

function cellAt(board: BoardRecord, at: CellPosition): CellRecord | undefined {
  return board.groups[at.group]?.cells[at.cell];
}

/** The tile of the cell at a place on a board, or nothing when there is no such cell. */
export function tileAt(set: BoardSet, boardId: string, at: CellPosition): Tile | undefined {
  const cell = boardOf(set, boardId)?.groups[at.group]?.cells[at.cell];
  return cell && tileOf(set, cell.tile);
}

function everyCell(boards: readonly BoardRecord[]): CellRecord[] {
  return boards.flatMap((board) => board.groups.flatMap((group) => group.cells));
}

/** Drops each tile that no cell uses. */
function prune(set: BoardSet): BoardSet {
  const used = new Set(everyCell(set.boards).map((cell) => cell.tile));
  return { tiles: set.tiles.filter((tile) => used.has(tile.id)), boards: set.boards };
}

function withBoard(set: BoardSet, board: BoardRecord): BoardSet {
  return {
    tiles: set.tiles,
    boards: set.boards.map((other) => (other.id === board.id ? board : other)),
  };
}

function withGroups(board: BoardRecord, groups: readonly GroupRecord[]): BoardRecord {
  return { ...board, groups };
}

function withTile(set: BoardSet, tile: Tile): BoardSet {
  return {
    tiles: set.tiles.map((other) => (other.id === tile.id ? tile : other)),
    boards: set.boards,
  };
}

/** The group with the fewest cells. When groups tie, it is the first of them. */
export function emptiestGroup(groups: readonly GroupRecord[]): number {
  let emptiest = 0;
  groups.forEach((group, index) => {
    if (group.cells.length < groups[emptiest].cells.length) {
      emptiest = index;
    }
  });
  return emptiest;
}

/**
 * Puts a new cell at the end of a group. With no group named it is the emptiest one,
 * and a board with no groups gets its first.
 */
function withNewCell(board: BoardRecord, tileId: string, group?: number): BoardRecord {
  const groups = board.groups.length > 0 ? board.groups : [{ cells: [] }];
  const target = group ?? emptiestGroup(groups);
  return withGroups(
    board,
    groups.map((other, index) =>
      index === target ? { cells: [...other.cells, { tile: tileId }] } : other,
    ),
  );
}

/** The tile of a cell that speaks. A cell with a symbol is a symbol tile, and a cell without one shows its label alone. */
function speakTile(id: string, fields: SpeakFields, label: string): Tile {
  const phrase = clean(fields.phrase, PHRASE_LENGTH) || label;
  return {
    id,
    label,
    colour: fields.colour,
    ...(fields.symbol ? { style: 'symbol', symbol: fields.symbol } : { style: 'key' }),
    action: { type: 'speak', phrase },
  };
}

/**
 * Adds a cell that speaks to a board, at the end of the group that is named or of the emptiest one.
 */
export function addCell(
  set: BoardSet,
  boardId: string,
  fields: SpeakFields,
  group?: number,
): BoardSet {
  const board = editable(set, boardId);
  const label = clean(fields.label, LABEL_LENGTH);
  if (!board || !label || (group !== undefined && !board.groups[group])) {
    return set;
  }
  const tile = tileFor(fields);
  return withBoard(
    { tiles: [...set.tiles, tile], boards: set.boards },
    withNewCell(board, tile.id, group),
  );
}

/**
 * The hue that the Colours theme gives a colour that the caregiver picked. The Soft and the Grey
 * swatch of the tile dialog show a red and a green there, so a tile of that colour takes the
 * same hue. Dark and White are drawn in the Colours theme as they are named, with no hue.
 */
const PICKED_HUES: Partial<Record<CellColour, CellHue>> = { soft1: 'c2', grey: 'c3' };

/** The hue of a new tile of a colour, for the Colours theme. */
function pickedHue(colour: CellColour): Pick<Tile, 'hue'> {
  const hue = PICKED_HUES[colour];
  return hue === undefined ? {} : { hue };
}

/**
 * The two marks of a tile that an edit can change. The hue is the colour of the tile in the
 * Colours theme. It stays while the colour stays, and a new colour brings the hue of its swatch.
 * The name for screen readers belongs to the old label, so it goes when the label changes.
 */
function marks(tile: Tile, colour: CellColour, label: string): Pick<Tile, 'hue' | 'name'> {
  const hue = colour === tile.colour ? tile.hue : PICKED_HUES[colour];
  return {
    ...(hue !== undefined && { hue }),
    ...(tile.name !== undefined && label === tile.label && { name: tile.name }),
  };
}

/**
 * The tile of a cell that speaks, with the fields of an edit. A tile that shows an icon and
 * gets no symbol keeps its style and its icon, as the Yes and No tiles do.
 */
function editedSpeakTile(tile: Tile, fields: SpeakFields, label: string): Tile {
  const keepsLook = !fields.symbol && tile.style !== 'symbol';
  return {
    ...speakTile(tile.id, fields, label),
    ...(keepsLook && {
      style: tile.style,
      ...(tile.icon !== undefined && { icon: tile.icon }),
      ...(tile.caption && { caption: tile.caption }),
    }),
    ...marks(tile, fields.colour, label),
  };
}

function editedOpenTile(tile: Tile, fields: OpenFields, label: string): Tile {
  return {
    id: tile.id,
    label,
    colour: fields.colour,
    style: fields.style,
    icon: fields.icon,
    ...(tile.action && { action: tile.action }),
    ...marks(tile, fields.colour, label),
  };
}

/** A tile with a new label, and without the name for screen readers that the old label had. */
function relabelled(tile: Tile, label: string): Tile {
  const { id, colour, style, hue, icon, caption, symbol, action } = tile;
  return {
    id,
    label,
    colour,
    style,
    ...(hue !== undefined && { hue }),
    ...(icon !== undefined && { icon }),
    ...(caption && { caption }),
    ...(symbol !== undefined && { symbol }),
    ...(action && { action }),
  };
}

/** Whether two tiles hold the same fields with the same values, in any order. */
function sameTile(a: Tile, b: Tile): boolean {
  const text = (tile: Tile) =>
    JSON.stringify(Object.entries(tile).sort(([x], [y]) => x.localeCompare(y)));
  return text(a) === text(b);
}

/**
 * The tile that a cell with these fields shows. `current` is the tile of the cell when a cell
 * is edited, and a new cell gets a tile with a new id. The tile dialog draws its preview from
 * this, so the preview and the stored tile agree. The tile of a new cell that opens a board
 * has no action yet, because the board does not exist.
 */
export function tileFor(fields: CellFields, current?: Tile): Tile {
  const label = clean(fields.label, LABEL_LENGTH);
  if (fields.kind === 'speak') {
    return current
      ? editedSpeakTile(current, fields, label)
      : { ...speakTile(newId('tile'), fields, label), ...pickedHue(fields.colour) };
  }
  if (current) {
    return editedOpenTile(current, fields, label);
  }
  const { colour, style, icon } = fields;
  return { id: newId('tile'), label, colour, style, icon, ...pickedHue(colour) };
}

/**
 * The fields of a tile, as the tile dialog shows them when a cell is edited. It gives nothing
 * for a tile that cannot be edited, such as the Back tile or a key of a keyboard.
 * A phrase that is the label is given as empty, so it follows the label when the label changes.
 */
export function fieldsOf(tile: Tile): CellFields | undefined {
  const { label, colour, action } = tile;
  if (action?.type === 'speak') {
    const phrase = action.phrase === label ? '' : action.phrase;
    return {
      kind: 'speak',
      label,
      phrase,
      colour,
      ...(tile.symbol !== undefined && { symbol: tile.symbol }),
    };
  }
  const style = BOARD_CELL_STYLES.find((name) => name === tile.style);
  if (action?.type === 'open' && style && tile.icon) {
    return { kind: 'open', label, style, colour, icon: tile.icon };
  }
  return undefined;
}

/** Gives a board a title, and the same label to each tile that opens it. */
function withTitle(set: BoardSet, boardId: string, title: string): BoardSet {
  const opensIt = (tile: Tile) => tile.action?.type === 'open' && tile.action.board === boardId;
  return {
    tiles: set.tiles.map((tile) =>
      opensIt(tile) && tile.label !== title ? relabelled(tile, title) : tile,
    ),
    boards: set.boards.map((board) => (board.id === boardId ? { ...board, title } : board)),
  };
}

/** Gives the cell at a place a tile of its own, so the other cells that showed its tile keep theirs. */
function withOwnTile(set: BoardSet, board: BoardRecord, at: CellPosition, tile: Tile): BoardSet {
  const own = { ...tile, id: newId('tile') };
  const groups = board.groups.map((group, g) =>
    g === at.group
      ? {
          cells: group.cells.map((cell, c) => (c === at.cell ? { ...cell, tile: own.id } : cell)),
        }
      : group,
  );
  return withBoard({ tiles: [...set.tiles, own], boards: set.boards }, withGroups(board, groups));
}

/**
 * Edits the cell at a place. The type of the cell cannot change, and the Back cell cannot be
 * edited. An edit changes only that cell: when another cell uses the same tile, the edited cell
 * gets a tile of its own. A new label of a cell that opens a board is also the title of that board.
 */
export function editCell(
  set: BoardSet,
  boardId: string,
  at: CellPosition,
  fields: CellFields,
): BoardSet {
  const board = editable(set, boardId);
  const cell = board && cellAt(board, at);
  const tile = cell && tileOf(set, cell.tile);
  const label = clean(fields.label, LABEL_LENGTH);
  if (!board || !cell || !tile || !label || tile.action?.type !== fields.kind) {
    return set;
  }
  const edited = tileFor(fields, tile);
  if (sameTile(edited, tile)) {
    return set;
  }
  const shared = everyCell(set.boards).filter((other) => other.tile === tile.id).length > 1;
  const next = shared ? withOwnTile(set, board, at, edited) : withTile(set, edited);
  return edited.action?.type === 'open' ? withTitle(next, edited.action.board, label) : next;
}

/** The ids of the boards that can be reached from home through the cells that open a board. */
function reachable(set: BoardSet): Set<string> {
  const opens = new Map<string, string>();
  for (const tile of set.tiles) {
    if (tile.action?.type === 'open') {
      opens.set(tile.id, tile.action.board);
    }
  }
  const seen = new Set<string>();
  const queue = [HOME_BOARD_ID];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    const board = seen.has(id) ? undefined : boardOf(set, id);
    if (!board) {
      continue;
    }
    seen.add(id);
    for (const cell of everyCell([board])) {
      const opened = opens.get(cell.tile);
      if (opened !== undefined) {
        queue.push(opened);
      }
    }
  }
  return seen;
}

/** Whether the caregiver can remove the cell that shows this tile. The Back cell stays. */
export function canRemove(tile: Tile): boolean {
  return tile.action?.type !== 'back';
}

/** The set with one cell taken out, before the boards and the tiles that go with it are dropped. */
function withoutCell(set: BoardSet, boardId: string, at: CellPosition): BoardSet | undefined {
  const board = editable(set, boardId);
  const tile = tileAt(set, boardId, at);
  if (!board || !tile || !canRemove(tile)) {
    return undefined;
  }
  const groups = board.groups.map((group, g) =>
    g === at.group ? { cells: group.cells.filter((_, c) => c !== at.cell) } : group,
  );
  return withBoard(set, withGroups(board, groups));
}

/** The boards that only the cell at a place reaches, which go when the cell is removed. */
export function removedWith(set: BoardSet, boardId: string, at: CellPosition): Removal {
  const without = withoutCell(set, boardId, at);
  if (!without) {
    return { boards: [], cells: 0 };
  }
  const before = reachable(set);
  const after = reachable(without);
  const boards = set.boards.filter((board) => before.has(board.id) && !after.has(board.id));
  return { boards, cells: everyCell(boards).length };
}

/**
 * Removes the cell at a place. A cell that opens a board takes that board with it, and every
 * board that can only be reached through it, locked or not. The Back cell stays.
 */
export function removeCell(set: BoardSet, boardId: string, at: CellPosition): BoardSet {
  const without = withoutCell(set, boardId, at);
  if (!without) {
    return set;
  }
  const gone = new Set(removedWith(set, boardId, at).boards.map((board) => board.id));
  return prune({
    tiles: without.tiles,
    boards: without.boards.filter((board) => !gone.has(board.id)),
  });
}

/**
 * Moves one item of a list of groups to the place it ends in. The item that was there and the
 * items after it move on by one. The board screen uses it to draw a cell where it is dragged.
 */
export function moveInGroups<T>(
  groups: readonly (readonly T[])[],
  from: CellPosition,
  to: CellPosition,
): (readonly T[])[] {
  const moved = groups[from.group]?.[from.cell];
  if (moved === undefined || !groups[to.group]) {
    return [...groups];
  }
  return groups.map((items, g) => {
    const rest = g === from.group ? items.filter((_, c) => c !== from.cell) : items;
    if (g !== to.group) {
      return rest;
    }
    const place = Math.max(0, Math.min(to.cell, rest.length));
    return [...rest.slice(0, place), moved, ...rest.slice(place)];
  });
}

/**
 * Moves a cell on its board. `to` is the place that the cell ends in: the cell that was there
 * and the cells after it move on by one. When `noRoom` says that the group of `to` cannot take
 * one more cell, the cell trades places with the cell at `to`.
 */
export function moveCell(
  set: BoardSet,
  boardId: string,
  from: CellPosition,
  to: CellPosition,
  noRoom = false,
): BoardSet {
  const board = editable(set, boardId);
  const moved = board && cellAt(board, from);
  const target = board?.groups[to.group];
  if (!board || !moved || !target || (from.group === to.group && from.cell === to.cell)) {
    return set;
  }
  const other = target.cells[to.cell];
  if (noRoom && from.group !== to.group) {
    if (!other) {
      return set;
    }
    const traded = board.groups.map((group, g) => ({
      cells: group.cells.map((cell, c) => {
        if (g === from.group && c === from.cell) {
          return other;
        }
        return g === to.group && c === to.cell ? moved : cell;
      }),
    }));
    return withBoard(set, withGroups(board, traded));
  }
  const lists = moveInGroups(
    board.groups.map((group) => group.cells),
    from,
    to,
  );
  return withBoard(
    set,
    withGroups(
      board,
      lists.map((cells) => ({ cells })),
    ),
  );
}

/** Puts an empty group at the end of a board. */
export function addGroup(set: BoardSet, boardId: string): BoardSet {
  const board = editable(set, boardId);
  return board ? withBoard(set, withGroups(board, [...board.groups, { cells: [] }])) : set;
}

/** Whether a group of a board can be removed: it is empty, and it is not the last group. */
export function canRemoveGroup(
  board: { readonly groups: readonly unknown[] },
  cells: number,
): boolean {
  return cells === 0 && board.groups.length > 1;
}

/** Removes an empty group. The last group of a board stays. */
export function removeGroup(set: BoardSet, boardId: string, group: number): BoardSet {
  const board = editable(set, boardId);
  const cells = board?.groups[group]?.cells.length;
  if (!board || cells === undefined || !canRemoveGroup(board, cells)) {
    return set;
  }
  return withBoard(
    set,
    withGroups(
      board,
      board.groups.filter((_, index) => index !== group),
    ),
  );
}

/**
 * The tile of the Back cell of a new board. It is the Back tile that the set already has.
 * A set with no such tile gets this one, which is written here because a board with no way
 * back would trap the primary user, and the set has nothing to copy.
 */
function backTile(set: BoardSet): Tile {
  return (
    set.tiles.find((tile) => tile.action?.type === 'back' && tile.icon === 'back') ?? {
      id: newId('tile'),
      label: 'Back',
      colour: 'ink',
      style: 'stage',
      icon: 'back',
      action: { type: 'back' },
    }
  );
}

/**
 * Adds a board, and a cell that opens it on the board `fromBoardId`. The new board has the
 * label as its title and three groups, and its first group holds the Back cell.
 */
export function addBoard(
  set: BoardSet,
  fromBoardId: string,
  fields: OpenFields,
  group?: number,
): BoardSet {
  const from = editable(set, fromBoardId);
  const label = clean(fields.label, LABEL_LENGTH);
  if (!from || !label || (group !== undefined && !from.groups[group])) {
    return set;
  }
  const back = backTile(set);
  const board: BoardRecord = {
    id: newId('board'),
    title: label,
    groups: Array.from({ length: NEW_BOARD_GROUPS }, (_, index) => ({
      cells: index === 0 ? [{ tile: back.id }] : [],
    })),
  };
  const opener: Tile = { ...tileFor(fields), action: { type: 'open', board: board.id } };
  const tiles = set.tiles.includes(back) ? set.tiles : [...set.tiles, back];
  return withBoard(
    { tiles: [...tiles, opener], boards: [...set.boards, board] },
    withNewCell(from, opener.id, group),
  );
}

/** Sets the title and the layout of a board. Each cell that opens the board takes the title as its label. */
export function setBoard(
  set: BoardSet,
  boardId: string,
  fields: { readonly title: string; readonly layout: LayoutName },
): BoardSet {
  const board = editable(set, boardId);
  const title = clean(fields.title, LABEL_LENGTH);
  if (!board || !title || (board.title === title && board.layout === fields.layout)) {
    return set;
  }
  return withTitle(withBoard(set, { ...board, layout: fields.layout }), boardId, title);
}
