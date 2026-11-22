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
import { Message } from '../keyboard/message';
import { Layout } from '../layout/layout';
import { Dwell } from '../scan/dwell';
import { PointerPlace } from '../scan/pointer-place';
import { CellPosition, Scan, sameCell } from '../scan/scan';
import { ScanSettings, isSwitchMode } from '../scan/scan-settings';
import { Switches } from '../scan/switches';
import { Speech } from '../speech/speech';
import { Back } from './back';
import { BoardData, Cell, Group, HOME_BOARD_ID, NAMED_SIZES, Tile } from './board-data';

/**
 * Draws one board: one element for each group and one cell for each entry, in the order of the data.
 * The home screen is this screen with the `home` board.
 * The screen gives its board to the scan, draws the scan state and runs the action of a picked cell.
 */
@Component({
  selector: 'app-board-screen',
  imports: [CellButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-screen.html',
  styleUrl: './board-screen.css',
  host: {
    // The round cursor of `cursor` mode follows the pointer over the whole page.
    '(document:pointermove)': 'onPagePointer($event)',
    '(document:pointerleave)': 'pointer.set(null)',
  },
})
export class BoardScreen {
  private readonly data = inject(BoardData);
  private readonly router = inject(Router);
  private readonly back = inject(Back);
  private readonly message = inject(Message);
  private readonly speech = inject(Speech);
  private readonly switches = inject(Switches);
  protected readonly layout = inject(Layout);
  protected readonly settings = inject(ScanSettings);
  protected readonly scan = inject(Scan);
  protected readonly dwell = inject(Dwell);

  /** The id of the board to draw. The router sets it from the address. */
  readonly id = input(HOME_BOARD_ID);

  protected readonly board = computed(() => this.data.board(this.id()));

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

  protected readonly cursorMode = computed(() => this.settings.selectionMode() === 'cursor');

  /** Where the round cursor of `cursor` mode is drawn, or nothing in another mode. */
  protected readonly cursor = computed(() => (this.cursorMode() ? this.pointer.at() : null));

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

    effect(() => {
      const sizes = this.board()?.groups.map((group) => group.cells.length) ?? [];
      untracked(() => {
        this.scan.show(sizes);
        this.dwell.reset();
      });
    });

    this.scan.picks.pipe(takeUntilDestroyed()).subscribe((position) => this.pressAt(position));
    this.dwell.presses.pipe(takeUntilDestroyed()).subscribe((position) => this.pressAt(position));

    // In `cursor` mode the page hides the arrow of the system, because the screen draws a cursor.
    const page = inject(DOCUMENT).documentElement;
    effect(() => page.toggleAttribute('data-cursor', this.cursorMode()));
    inject(DestroyRef).onDestroy(() => page.removeAttribute('data-cursor'));

    // The keyboard focus follows the highlight, so a screen reader tells each group and cell.
    // This runs after the page is drawn, because a new board has new elements.
    afterRenderEffect(() => {
      const { group, cell } = this.scan.state();
      const grid = this.grid()?.nativeElement;
      this.board();
      untracked(() => this.moveFocus(grid, group, cell));
    });
  }

  /**
   * The text that screen readers hear after a press: the phrase of a cell, or the message.
   * Each press gets a new number, so the page changes even when the text is the same as before.
   */
  protected readonly status = signal({ text: '', press: 0 });

  /** Tells screen readers a text through the status region. */
  private tell(text: string): void {
    this.status.update((told) => ({ text, press: told.press + 1 }));
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
  protected share(group: Group, cell: Cell): number {
    if (typeof cell.size === 'number') {
      return cell.size;
    }
    if (cell.size !== undefined) {
      return NAMED_SIZES[cell.size];
    }
    return group.cells.some((other) => other.size !== undefined) ? NAMED_SIZES.medium : 1;
  }

  /** The name of a group for screen readers, such as "Column 1 of 2" or "Row 1 of 2". */
  protected groupName(index: number): string {
    const board = this.board();
    const kind = (board?.layout ?? this.layout.name()) === 'rows' ? 'Row' : 'Column';
    return `${kind} ${index + 1} of ${board?.groups.length ?? 0}`;
  }

  /** The value of an attribute that is either there or not. */
  protected mark(on: boolean): '' | null {
    return on ? '' : null;
  }

  /** Whether a place, such as the highlight of the scan, is a given cell. */
  protected readonly sameCell = sameCell;

  /**
   * A cell was pressed with a pointer or a finger, or with a key that the browser turned into
   * a press. The cell is pressed at once. In `scan` and `step` mode the scan goes to rest with
   * nothing in focus.
   */
  protected onCellPress(tile: Tile): void {
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
   * A finger has no cursor.
   */
  protected onPagePointer(event: PointerEvent): void {
    if (this.cursorMode() && event.pointerType !== 'touch') {
      this.pointer.set({ x: event.clientX, y: event.clientY });
    }
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
    const target = cell === null ? groupElement : groupElement?.querySelectorAll('button')[cell];
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
        this.tell('');
        void this.router.navigate(['/board', action.board]);
        break;
      case 'back':
        this.tell('');
        void this.back.back();
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

  /** Tells screen readers the message as it stands after a key has changed it. */
  private tellMessage(): void {
    this.tell(this.message.text());
  }
}
