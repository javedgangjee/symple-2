import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Cell as CellButton } from '../cells/cell';
import { BoardDialog } from '../edit/board-dialog';
import {
  CellFields,
  addBoard,
  addCell,
  addGroup,
  canRemove,
  canRemoveGroup,
  editCell,
  fieldsOf,
  moveCell,
  moveInGroups,
  removeCell,
  removeGroup,
  setBoard,
} from '../edit/board-edits';
import { Drag, GroupBox, Places, placeUnder, readPlaces, slide } from '../edit/drag';
import { EditMode } from '../edit/edit-mode';
import { Room, measureRoom } from '../edit/room';
import { TileDialog } from '../edit/tile-dialog';
import { Message } from '../keyboard/message';
import { DEFAULT_LAYOUT, LayoutName } from '../layout/layout';
import { Dwell } from '../scan/dwell';
import { PointerPlace } from '../scan/pointer-place';
import { CellPosition, Scan, sameCell } from '../scan/scan';
import { ScanSettings, isSwitchMode } from '../scan/scan-settings';
import { Switches } from '../scan/switches';
import { SettingsOpen } from '../settings/settings-open';
import { Speech } from '../speech/speech';
import { Back } from './back';
import { BoardData, Cell, HOME_BOARD_ID, NAMED_SIZES, Tile } from './board-data';

/** One cell as the screen draws it, with what its edit buttons need. */
interface Slot {
  /** Names the cell on its board. A cell keeps its key when it moves, so the page can follow it. */
  readonly key: string;
  readonly cell: Cell;
  /** The share of its group that the cell takes. */
  readonly share: number;
  /** The name of the cell in the names of its edit buttons, such as "Edit Help". */
  readonly name: string;
  readonly canEdit: boolean;
  readonly canRemove: boolean;
  /** The id of the board that the Open button goes to, or null when the cell has no Open button. */
  readonly opens: string | null;
  readonly isBack: boolean;
}

interface GroupView {
  readonly key: string;
  readonly slots: readonly Slot[];
}

/** A cell with its key, before its share in the group that it is drawn in is known. */
interface KeyedCell {
  readonly key: string;
  readonly cell: Cell;
}

/** The cell that follows the pointer while it is dragged: its tile, and where and how large it is drawn. */
interface Lifted {
  readonly tile: Tile;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** What the pointer took hold of: the slot, its size, and where on it the pointer went down. */
interface Grip {
  readonly key: string;
  readonly tile: Tile;
  readonly width: number;
  readonly height: number;
  readonly dx: number;
  readonly dy: number;
}

/**
 * The edit button that takes the focus after a change, at the place of a cell. With no tool
 * named, the first edit button of the cell takes it.
 */
interface FocusAsk {
  readonly at: CellPosition;
  readonly tool?: 'edit' | 'remove';
}

/** The share of a cell with no size in a group of these cells. A new cell takes it too. */
function shareWithNoSize(cells: readonly Cell[]): number {
  return cells.some((cell) => cell.size !== undefined) ? NAMED_SIZES.medium : 1;
}

/** Whether an event came from a button, such as Add Tile of an empty group, which does its own work. */
function onButton(event: Event): boolean {
  return event.target instanceof Element && event.target.closest('button') !== null;
}

/** What the scan is given: the board on show and the number of cells in each of its groups. */
interface Scanned {
  readonly id: string;
  readonly sizes: readonly number[];
}

function sameScanned(a: Scanned, b: Scanned): boolean {
  return (
    a.id === b.id &&
    a.sizes.length === b.sizes.length &&
    a.sizes.every((size, index) => size === b.sizes[index])
  );
}

/** Whether an event came from an edit button, which does its own work. */
function onTool(event: Event): boolean {
  return event.target instanceof Element && event.target.closest('.tool') !== null;
}

/**
 * Draws one board: one element for each group and one cell for each entry, in the order of the data.
 * The home screen is this screen with the `home` board.
 * The screen gives its board to the scan, draws the scan state and runs the action of a picked cell.
 * In edit mode the cells do nothing, and the screen draws the edit buttons and changes the board.
 */
@Component({
  selector: 'app-board-screen',
  imports: [CellButton, TileDialog, BoardDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-screen.html',
  styleUrl: './board-screen.css',
  host: {
    // The round cursor of `cursor` mode follows the pointer over the whole page, and so does a dragged cell.
    '(document:pointermove)': 'onPagePointer($event)',
    '(document:pointerleave)': 'pointer.set(null)',
    '(document:pointerup)': 'onDragEnd($event)',
    '(document:pointercancel)': 'onDragEnd($event)',
    '(document:keydown.escape)': 'putBack()',
  },
})
export class BoardScreen {
  private readonly data = inject(BoardData);
  private readonly router = inject(Router);
  private readonly back = inject(Back);
  private readonly message = inject(Message);
  private readonly speech = inject(Speech);
  private readonly switches = inject(Switches);
  protected readonly room = inject(Room);
  private readonly view = inject(DOCUMENT).defaultView;
  protected readonly edit = inject(EditMode);
  protected readonly settings = inject(ScanSettings);
  protected readonly scan = inject(Scan);
  protected readonly dwell = inject(Dwell);

  /** The id of the board to draw. The router sets it from the address. */
  readonly id = input(HOME_BOARD_ID);

  protected readonly board = computed(() => this.data.board(this.id()));

  /** The layout of the board. A board that gives none is drawn in columns. */
  protected readonly layout = computed<LayoutName>(() => this.board()?.layout ?? DEFAULT_LAYOUT);

  /** What a group is called in this layout, as "Column" or "Row". */
  protected readonly groupKind = computed(() => (this.layout() === 'rows' ? 'Row' : 'Column'));

  private readonly scanned = computed<Scanned>(
    () => ({
      id: this.id(),
      sizes: this.board()?.groups.map((group) => group.cells.length) ?? [],
    }),
    { equal: sameScanned },
  );

  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  /**
   * The scan state that the grid shows. While the post click delay runs on a board that the
   * pick has just opened, no cell of that board is picked, so the grid looks at rest.
   */
  protected readonly scanState = computed(() => {
    const { phase, cell } = this.scan.state();
    return phase === 'confirmed' && cell === null ? 'rest' : phase;
  });

  /**
   * Whether the highlight shows the bar that counts down the scan time. The scan time runs
   * only in `scan` mode, and a stored setting says whether the bar is shown. It is hidden by default.
   */
  protected readonly showsBar = computed(
    () => this.settings.selectionMode() === 'scan' && this.settings.showProgressBar(),
  );

  protected readonly pointer = inject(PointerPlace);
  private readonly settingsOpen = inject(SettingsOpen);

  protected readonly cursorMode = computed(() => this.settings.selectionMode() === 'cursor');

  /**
   * Whether the round cursor takes the place of the arrow of the system. It does not while the
   * settings panel is open or edit mode is on, so the caregiver sees the arrow.
   */
  private readonly drawsCursor = computed(
    () => this.cursorMode() && !this.settingsOpen.isOpen() && !this.edit.isOn(),
  );

  /** Where the round cursor of `cursor` mode is drawn, or nothing when it is not drawn. */
  protected readonly cursor = computed(() => (this.drawsCursor() ? this.pointer.at() : null));

  /** The cell that the caregiver has picked up with a press, to put down with a second press. */
  protected readonly picked = signal<CellPosition | null>(null);

  /**
   * Where a dragged cell came from and where it lies now. The grid draws the cell at `to`
   * while the drag lasts, and the set changes once, when the pointer goes up.
   */
  private readonly preview = signal<{ from: CellPosition; to: CellPosition } | null>(null, {
    equal: (a, b) =>
      a === b || (a !== null && b !== null && sameCell(a.from, b.from) && sameCell(a.to, b.to)),
  });

  /** The cell that follows the pointer while it is dragged. */
  protected readonly lifted = signal<Lifted | null>(null);

  /** The place in the grid of the cell that is dragged, which is drawn as a gap. */
  protected readonly gap = computed(() => this.preview()?.to ?? null);

  /** The groups and the cells as the grid draws them. */
  protected readonly groups = computed<GroupView[]>(() => {
    const board = this.board();
    if (!board) {
      return [];
    }
    // Two cells of a board can show the same tile, so the key also counts the tile.
    const seen = new Map<string, number>();
    const lists = board.groups.map((group) =>
      group.cells.map((cell): KeyedCell => {
        const count = seen.get(cell.tile.id) ?? 0;
        seen.set(cell.tile.id, count + 1);
        return { key: `${board.id}/${cell.tile.id}/${count}`, cell };
      }),
    );
    const preview = this.preview();
    const drawn = preview ? moveInGroups(lists, preview.from, preview.to) : lists;
    return drawn.map((cells, index) => ({
      key: `${board.id}/${index}`,
      slots: cells.map((keyed) => this.slotOf(keyed, cells)),
    }));
  });

  private readonly drag = new Drag();
  private grip: Grip | null = null;

  /** The edit button that takes the focus once the page is drawn again. */
  private readonly focusAsk = signal<FocusAsk | null>(null);

  /** Counts the changes of the size of the grid, so the room is measured again after each. */
  private readonly resized = signal(0);

  /** Where each cell lay when the page was last drawn, and in which order, for the slide. */
  private places: Places = new Map();
  private order = '';

  constructor() {
    // The switch keys are heard only while a board is on show, so the sign in screen is not scanned.
    this.switches.start();
    inject(DestroyRef).onDestroy(() => {
      this.switches.stop();
      // The board is taken away and the scan is not sent to rest. A pick that opens another
      // screen closes this one, and the scan must start again on the board of the next.
      this.scan.show([]);
      this.dwell.reset();
    });

    // The scan starts again only when another board comes on show or the groups of this one
    // change in size. A change elsewhere in the set, such as a sync of another board, leaves
    // the highlight where the primary user has it.
    effect(() => {
      const { sizes } = this.scanned();
      untracked(() => {
        this.scan.show([...sizes]);
        this.dwell.reset();
      });
    });

    // A change of the set, such as a sync from another device, can remove the board on show.
    // The screen would then hold no cell and no Back cell, so home opens in its place.
    effect(() => {
      if (!this.board() && this.id() !== HOME_BOARD_ID) {
        untracked(() => void this.router.navigateByUrl('/', { replaceUrl: true }));
      }
    });

    this.scan.picks.pipe(takeUntilDestroyed()).subscribe((position) => this.pressAt(position));
    this.dwell.presses.pipe(takeUntilDestroyed()).subscribe((position) => this.pressAt(position));

    // In `cursor` mode the page hides the arrow of the system, because the screen draws a cursor.
    const page = inject(DOCUMENT).documentElement;
    effect(() => page.toggleAttribute('data-cursor', this.drawsCursor()));
    inject(DestroyRef).onDestroy(() => page.removeAttribute('data-cursor'));

    // The keyboard focus follows the highlight, so a screen reader tells each group and cell.
    // This runs after the page is drawn, because a new board has new elements.
    // In edit mode the focus is the caregiver's, on the edit buttons.
    afterRenderEffect(() => {
      const { group, cell } = this.scan.state();
      const grid = this.grid()?.nativeElement;
      const editing = this.edit.isOn();
      this.board();
      if (!editing) {
        untracked(() => this.moveFocus(grid, group, cell));
      }
    });

    this.watchEditMode();
    this.followTitle();
    this.watchGrid();
  }

  /**
   * The text that screen readers hear after a press: the phrase of a cell, or the message.
   * Each press gets a new number, so the page changes even when the text is the same as before.
   */
  private readonly said = signal({ text: '', count: 0 });

  /** What the status line holds: the last press, or the last change in edit mode. */
  protected readonly status = computed(() => (this.edit.isOn() ? this.edit.status() : this.said()));

  /** Tells screen readers a text through the status region. */
  private tell(text: string): void {
    this.said.update((told) => ({ text, count: told.count + 1 }));
  }

  /** Speaks a text aloud and tells it to screen readers. An empty text makes no sound. */
  private speak(text: string): void {
    this.tell(text);
    this.speech.say(text);
  }

  /**
   * The share of its group that a cell takes. A size given as a number is that many parts, and
   * the named sizes are on the same scale. A cell with no size counts as medium when another cell
   * of its group has a size. When no cell of the group has one, they all share it equally.
   */
  private share(cells: readonly Cell[], cell: Cell): number {
    if (typeof cell.size === 'number') {
      return cell.size;
    }
    if (cell.size !== undefined) {
      return NAMED_SIZES[cell.size];
    }
    return shareWithNoSize(cells);
  }

  private slotOf({ key, cell }: KeyedCell, cells: readonly KeyedCell[]): Slot {
    const { tile } = cell;
    const opened = tile.action?.type === 'open' ? tile.action.board : null;
    return {
      key,
      cell,
      share: this.share(
        cells.map((other) => other.cell),
        cell,
      ),
      name: tile.name ?? tile.label,
      canEdit: fieldsOf(tile) !== undefined,
      canRemove: canRemove(tile),
      opens: opened,
      isBack: tile.action?.type === 'back',
    };
  }

  /** The name of a group for screen readers, such as "Column 1 of 2" or "Row 1 of 2". */
  protected groupName(index: number): string {
    return `${this.groupKind()} ${index + 1} of ${this.board()?.groups.length ?? 0}`;
  }

  /** The value of an attribute that is either there or not. */
  protected mark(on: boolean): '' | null {
    return on ? '' : null;
  }

  /** Whether a place, such as the highlight of the scan, is a given cell. */
  protected readonly sameCell = sameCell;

  /** Whether an empty group can be removed. The last group of a board stays. */
  protected canRemoveGroup(): boolean {
    return canRemoveGroup(this.board() ?? { groups: [] }, 0);
  }

  /**
   * A cell was pressed with a pointer or a finger, or with a key that the browser turned into
   * a press. The cell is pressed at once. In `scan` and `step` mode the scan goes to rest with
   * nothing in focus. In edit mode a cell does nothing.
   */
  protected onCellPress(tile: Tile): void {
    if (this.edit.isOn()) {
      return;
    }
    this.dwell.interrupt();
    if (isSwitchMode(this.settings.selectionMode())) {
      this.scan.rest();
      this.releaseFocus(this.grid()?.nativeElement);
    }
    this.onPress(tile);
  }

  /** The pointer came onto a cell or moved on it. A finger starts no dwell. */
  protected onPointer(event: PointerEvent, group: number, cell: number): void {
    if (event.pointerType !== 'touch') {
      this.dwell.pointer({ group, cell }, event.clientX, event.clientY);
    }
  }

  /**
   * The pointer moved somewhere on the page. In `cursor` mode the round cursor follows it.
   * A finger has no cursor. In edit mode a cell that is held follows it.
   */
  protected onPagePointer(event: PointerEvent): void {
    if (this.cursorMode() && event.pointerType !== 'touch') {
      this.pointer.set({ x: event.clientX, y: event.clientY });
    }
    this.onDragMove(event);
  }

  /** Runs the action of the cell that the scan picked or that a dwell pressed. */
  private pressAt(position: CellPosition): void {
    const tile = this.board()?.groups[position.group]?.cells[position.cell]?.tile;
    if (tile) {
      this.onPress(tile);
    }
  }

  /** Puts the keyboard focus on the highlighted group or cell. With no highlight nothing in the grid holds it. */
  private moveFocus(
    grid: HTMLElement | undefined,
    group: number | null,
    cell: number | null,
  ): void {
    const groupElement = group === null ? undefined : grid?.querySelectorAll('.group')[group];
    const target =
      cell === null ? groupElement : groupElement?.querySelectorAll('app-cell button')[cell];
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll: true });
    } else {
      this.releaseFocus(grid);
    }
  }

  private releaseFocus(grid: HTMLElement | undefined): void {
    const active = grid?.ownerDocument.activeElement;
    if (active instanceof HTMLElement && grid?.contains(active)) {
      active.blur();
    }
  }

  protected onPress(tile: Tile): void {
    const action = tile.action;
    if (!action) {
      // A tile with no action does nothing.
      return;
    }
    // Only a tile that speaks starts or stops a speech. The other actions let it run on.
    switch (action.type) {
      case 'open':
        this.open(action.board);
        break;
      case 'back':
        this.goBack();
        break;
      case 'speak':
        this.speak(action.phrase);
        break;
      case 'speak-message':
        this.speak(this.message.text());
        break;
      case 'type':
        this.message.type(action.text);
        this.tellMessage();
        break;
      case 'backspace':
        this.message.backspace();
        this.tellMessage();
        break;
      case 'clear':
        this.message.clear();
        this.tellMessage();
        break;
      case 'caps':
        this.message.toggleCaps();
        break;
      default:
        // Every action type has a case above. A new type does not compile until it has one too.
        action satisfies never;
    }
  }

  /** Opens a board. A picked cell and the Open button of edit mode both end here. */
  protected open(boardId: string): void {
    this.tell('');
    void this.router.navigate(['/board', boardId]);
  }

  /** Goes to the previous board. The Back cell and the Go back button of edit mode both end here. */
  protected goBack(): void {
    this.tell('');
    void this.back.back();
  }

  /** Tells screen readers the message as it stands after a key has changed it. */
  private tellMessage(): void {
    this.tell(this.message.text());
  }

  // Edit mode. Each change below is stored and synced at once, and told to screen readers.

  /** Where a cell lies, as the status line says it, such as "column 2, place 1". */
  private where(at: CellPosition): string {
    return `${this.groupKind().toLowerCase()} ${at.group + 1}, place ${at.cell + 1}`;
  }

  private nameAt(at: CellPosition): string {
    return this.groups()[at.group]?.slots[at.cell]?.name ?? 'The tile';
  }

  /** The number of cells in each group of the board, as the set holds them. */
  private groupSizes(): number[] {
    return this.board()?.groups.map((group) => group.cells.length) ?? [];
  }

  /**
   * The Add Tile button of an empty group or of an empty board was pressed. It turns edit mode
   * on, because the button also shows out of edit mode, and opens the tile dialog for that group.
   */
  protected addTileTo(group?: number): void {
    this.edit.start();
    if (group !== undefined && !this.room.forCell(group)) {
      this.edit.tell(`${this.groupKind()} ${group + 1} has no room for a tile.`);
      return;
    }
    this.edit.open(group === undefined ? { kind: 'add-tile' } : { kind: 'add-tile', group });
  }

  /** Why Add column does nothing, for the caregiver and for screen readers. */
  protected readonly groupsFullText = computed(
    () => `The board has no room for another ${this.groupKind().toLowerCase()}.`,
  );

  /**
   * The Add column button beside the grid was pressed. With no room for a group it stays in
   * the tab order, says why and does nothing.
   */
  protected addGroup(): void {
    const board = this.board();
    if (!board) {
      return;
    }
    if (!this.room.forGroup()) {
      this.edit.tell(this.groupsFullText());
      return;
    }
    this.data.change((set) => addGroup(set, board.id));
    this.edit.tell(`${this.groupKind()} ${board.groups.length + 1} added`);
  }

  protected removeGroupAt(group: number): void {
    this.data.change((set) => removeGroup(set, this.id(), group));
    this.edit.tell(`${this.groupKind()} ${group + 1} removed`);
    this.focusAsk.set({ at: { group: Math.max(0, group - 1), cell: 0 } });
  }

  /** The Remove button of a cell was pressed. The cell is removed at once. */
  protected remove(at: CellPosition): void {
    this.picked.set(null);
    this.removeAt(at);
  }

  /**
   * Removes a cell. The focus goes to the Remove button of the next cell, then of the cell
   * before, then to the Add Tile button of the group, which is empty by then.
   */
  private removeAt(at: CellPosition): void {
    const name = this.nameAt(at);
    this.data.change((set) => removeCell(set, this.id(), at));
    this.edit.tell(`${name} removed`);
    const left = this.groupSizes()[at.group] ?? 0;
    this.focusAsk.set({
      at: { group: at.group, cell: Math.min(at.cell, left - 1) },
      tool: 'remove',
    });
  }

  /** The tile dialog was filled in. The dialog that is open says what the fields are for. */
  protected onTileSaved(fields: CellFields): void {
    const dialog = this.edit.dialog();
    this.edit.close();
    if (dialog?.kind === 'edit-tile') {
      this.data.change((set) => editCell(set, this.id(), dialog.at, fields));
      this.edit.tell(`${fields.label.trim()} saved`);
      this.focusAsk.set({ at: dialog.at, tool: 'edit' });
    } else if (dialog?.kind === 'add-tile' || dialog?.kind === 'add-board') {
      this.add(fields, dialog.kind === 'add-tile' ? dialog.group : undefined);
    }
  }

  /** Adds a cell that speaks, or a board with the cell that opens it, and tells where the cell went. */
  private add(fields: CellFields, named?: number): void {
    const group = named ?? this.groupForNewCell();
    const before = this.groupSizes();
    this.data.change((set) =>
      fields.kind === 'speak'
        ? addCell(set, this.id(), fields, group)
        : addBoard(set, this.id(), fields, group),
    );
    const sizes = this.groupSizes();
    const landed = sizes.findIndex((size, index) => size !== (before[index] ?? 0));
    if (landed !== -1) {
      const at = { group: landed, cell: sizes[landed] - 1 };
      this.edit.tell(`${fields.label.trim()} added to ${this.where(at)}`);
    }
  }

  /**
   * The group that a new cell goes to: the one with the fewest cells among those with room.
   * With nothing measured it is left to the edit, which takes the group with the fewest cells.
   */
  private groupForNewCell(): number | undefined {
    const sizes = this.groupSizes();
    const withRoom = this.room.groupsWithRoom().filter((group) => group < sizes.length);
    return withRoom.reduce<number | undefined>(
      (best, group) => (best === undefined || sizes[group] < sizes[best] ? group : best),
      undefined,
    );
  }

  protected onBoardSaved(fields: { readonly title: string; readonly layout: LayoutName }): void {
    this.edit.close();
    this.data.change((set) => setBoard(set, this.id(), fields));
    this.edit.tell('Board settings saved');
  }

  /**
   * Moves a cell and tells its new place. It returns the place, or null when nothing moved.
   * `noRoom` says that the group of `to` cannot take one more cell, so the two cells trade places.
   */
  private move(from: CellPosition, to: CellPosition, noRoom = false): CellPosition | null {
    const name = this.nameAt(from);
    const before = this.data.set();
    this.data.change((set) => moveCell(set, this.id(), from, to, noRoom));
    if (this.data.set() === before) {
      return null;
    }
    const others = (this.groupSizes()[to.group] ?? 1) - 1;
    const landed = { group: to.group, cell: Math.max(0, Math.min(to.cell, others)) };
    this.edit.tell(`${name} moved to ${this.where(landed)}`);
    return landed;
  }

  /**
   * A press on a cell in edit mode. The first press picks the cell up.
   * A press on a second cell puts the first in its place, and a press on the same cell puts it back.
   */
  private pressSlot(at: CellPosition): void {
    const held = this.picked();
    if (!held) {
      this.picked.set(at);
      this.edit.tell(`${this.nameAt(at)} picked up. Press a tile to take its place.`);
      return;
    }
    this.picked.set(null);
    const noRoom = held.group !== at.group && !this.room.forCell(at.group);
    const landed = this.move(held, at, noRoom);
    if (landed) {
      this.focusAsk.set({ at: landed });
    }
  }

  /** A click on a slot. The click that ends a drag, and a click on an edit button, are not presses on the cell. */
  protected onSlotClick(event: Event, at: CellPosition): void {
    if (this.edit.isOn() && !onTool(event) && !this.drag.swallowsClick()) {
      this.pressSlot(at);
    }
  }

  /** A press on an empty group puts the picked cell there. A press on a button of the group does not. */
  protected onGroupClick(event: Event, group: number): void {
    const held = this.picked();
    if (held && !onButton(event) && this.groups()[group]?.slots.length === 0) {
      this.picked.set(null);
      this.move(held, { group, cell: 0 });
    }
  }

  /** Escape puts a picked cell back. */
  protected putBack(): void {
    const held = this.picked();
    if (held && !this.edit.dialog()) {
      this.picked.set(null);
      this.edit.tell(`${this.nameAt(held)} put back`);
    }
  }

  /** The pointer went down on a slot in edit mode. The cell may be dragged from here. */
  protected onSlotPointerDown(event: PointerEvent, at: CellPosition, slot: Slot): void {
    const element = event.currentTarget;
    if (!this.edit.isOn() || event.button !== 0 || onTool(event) || !(element instanceof Element)) {
      return;
    }
    const box = element.getBoundingClientRect();
    this.drag.begin(event.pointerId, { x: event.clientX, y: event.clientY }, at);
    this.grip = {
      key: slot.key,
      tile: slot.cell.tile,
      width: box.width,
      height: box.height,
      dx: event.clientX - box.left,
      dy: event.clientY - box.top,
    };
  }

  /** The held cell follows the pointer and takes the place under it. */
  private onDragMove(event: PointerEvent): void {
    const point = { x: event.clientX, y: event.clientY };
    const from = this.drag.move(event.pointerId, point);
    const grid = this.grid()?.nativeElement;
    const grip = this.grip;
    if (!from || !grip || !grid) {
      return;
    }
    this.picked.set(null);
    const own = this.preview()?.to ?? from;
    const hasRoom = (group: number) => group === from.group || this.room.forCell(group);
    const to = placeUnder(point, this.groupBoxes(grid, grip.key), this.layout(), own, hasRoom);
    this.preview.set({ from, to });
    const { tile, width, height } = grip;
    this.lifted.set({ tile, width, height, left: point.x - grip.dx, top: point.y - grip.dy });
  }

  /** The pointer went up or was taken away. A cell that was dragged moves to where it lies. */
  protected onDragEnd(event: PointerEvent): void {
    const from = this.drag.end(event.pointerId);
    const to = this.preview()?.to;
    this.grip = null;
    this.lifted.set(null);
    this.preview.set(null);
    if (from && to) {
      this.move(from, to);
    }
  }

  /** The groups of the grid and their cells as they lie on the page, without the cell that is dragged. */
  private groupBoxes(grid: HTMLElement, draggedKey: string): GroupBox[] {
    return Array.from(grid.querySelectorAll<HTMLElement>(':scope > .group'), (group) => ({
      box: group.getBoundingClientRect(),
      cells: Array.from(group.querySelectorAll<HTMLElement>(':scope > .slot'))
        .filter((slot) => slot.dataset['key'] !== draggedKey)
        .map((slot) => slot.getBoundingClientRect()),
    }));
  }

  /** Keeps edit mode in step with the board on show. */
  private watchEditMode(): void {
    effect(() => this.edit.show(this.id()));

    // A locked board cannot be edited, so edit mode ends when one comes on show.
    effect(() => {
      if (this.edit.isOn() && this.board()?.locked) {
        untracked(() => this.edit.stop());
      }
    });

    // A cell stays picked up only on its own board, in edit mode and with no dialog open.
    effect(() => {
      this.id();
      if (!this.edit.isOn() || this.edit.dialog()) {
        untracked(() => this.picked.set(null));
      }
    });

    // The edit button that a change names takes the focus once the page is drawn again.
    afterRenderEffect(() => {
      const ask = this.focusAsk();
      const grid = this.grid()?.nativeElement;
      if (ask && grid) {
        untracked(() => {
          this.focusAsk.set(null);
          this.focusTool(grid, ask);
        });
      }
    });
  }

  /**
   * Puts the focus on an edit button of the cell at a place. A cell without that button, or an
   * ask that names no button, gives its first one, and a group with no cell there gives its Add
   * Tile button.
   */
  private focusTool(grid: HTMLElement, { at, tool }: FocusAsk): void {
    const group = grid.querySelectorAll(':scope > .group')[at.group];
    const slot = group?.querySelectorAll(':scope > .slot')[at.cell];
    const target =
      (tool && slot?.querySelector(`.tool.${tool}`)) ??
      slot?.querySelector('.tool') ??
      group?.querySelector('.add-tile');
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll: true });
    }
  }

  /**
   * The header shows the title that the router read when the board was opened. When the
   * caregiver renames the board on show, the route is read again, so the header follows.
   */
  private followTitle(): void {
    let shown: { id: string; title: string } | undefined;
    effect(() => {
      const board = this.board();
      const was = shown;
      shown = board && { id: board.id, title: board.title };
      if (was && board && was.id === board.id && was.title !== board.title) {
        untracked(() => {
          const again = { onSameUrlNavigation: 'reload', replaceUrl: true } as const;
          // A route that is gone by now has no title to show.
          this.router.navigateByUrl(this.router.url, again).catch(() => undefined);
        });
      }
    });
  }

  /** Measures the room of the grid and lets the cells slide, each time the page is drawn in edit mode. */
  private watchGrid(): void {
    const resize =
      this.view && 'ResizeObserver' in this.view
        ? new this.view.ResizeObserver(() => this.resized.update((count) => count + 1))
        : undefined;
    inject(DestroyRef).onDestroy(() => resize?.disconnect());

    effect((onCleanup) => {
      const grid = this.grid()?.nativeElement;
      if (grid && resize) {
        resize.observe(grid);
        onCleanup(() => resize.unobserve(grid));
      }
    });

    afterRenderEffect(() => {
      const grid = this.grid()?.nativeElement;
      const groups = this.groups();
      const layout = this.layout();
      const dragging = this.preview() !== null;
      const editing = this.edit.isOn();
      this.resized();
      if (!grid || !editing) {
        this.places = new Map();
        return;
      }
      untracked(() => {
        this.slideTo(grid, groups);
        // While a cell is dragged the grid shows where it would go, which is not what the board holds.
        if (!dragging) {
          const shares = groups.map(({ slots }) => ({
            shares: slots.map((slot) => slot.share),
            next: shareWithNoSize(slots.map((slot) => slot.cell)),
          }));
          this.room.set(measureRoom(grid, layout, shares));
        }
      });
    });
  }

  /** Lets the cells slide to their places when their order has changed since the page was last drawn. */
  private slideTo(grid: HTMLElement, groups: readonly GroupView[]): void {
    const order = groups.map(({ slots }) => slots.map((slot) => slot.key).join(' ')).join('|');
    const before = this.places;
    const reordered = order !== this.order && before.size > 0;
    this.order = order;
    // The places are read before a slide starts, because a cell that slides is drawn where it was.
    this.places = readPlaces(grid);
    if (reordered) {
      const still = this.view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
      slide(grid, before, still);
    }
  }
}
