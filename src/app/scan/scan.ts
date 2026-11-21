import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { ScanSettings } from './scan-settings';

/** The place of a cell on a board: the index of its group, and its index in that group. */
export interface CellPosition {
  readonly group: number;
  readonly cell: number;
}

/**
 * Whether two places are the same cell. A place with no group or no cell, as the scan state has
 * at rest or on a group, is no cell.
 */
export function sameCell(
  a: { readonly group: number | null; readonly cell: number | null } | null,
  b: CellPosition,
): boolean {
  return a !== null && a.group === b.group && a.cell === b.cell;
}

/**
 * What the scan is doing. At `rest` nothing is highlighted. In `groups` a group is highlighted,
 * and in `cells` a cell of the picked group is. In `confirmed` a cell was picked and the scan
 * waits for the post click delay.
 */
export type ScanPhase = 'rest' | 'groups' | 'cells' | 'confirmed';

export interface ScanState {
  readonly phase: ScanPhase;
  /** The highlighted group, or the group of the highlighted or picked cell. */
  readonly group: number | null;
  /** The highlighted or picked cell. */
  readonly cell: number | null;
}

const REST: ScanState = { phase: 'rest', group: null, cell: null };

/** The highlight goes through the groups, or through the cells of a group, this many times before it gives up. */
const PASSES = 2;

/**
 * Scans a board. The board is a list of group sizes, so the service knows nothing about keys,
 * cells or the page. It keeps the state and runs the timers for the scan time and the post click delay.
 */
@Injectable({ providedIn: 'root' })
export class Scan {
  private readonly settings = inject(ScanSettings);

  private readonly current = signal(REST);
  private readonly picked = new Subject<CellPosition>();

  /** The number of cells in each group of the board on show. */
  private sizes: readonly number[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** How many times the scan time has moved the highlight since the last switch press. */
  private steps = 0;
  /** Whether the scan started again after a pick and nothing has happened since. */
  private resumed = false;

  readonly state = this.current.asReadonly();

  /** Each pick of a cell. The state is `confirmed` by the time a pick is told. */
  readonly picks = this.picked.asObservable();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimer());

    // A change of the selection mode sends the scan to rest, so no highlight is left behind
    // in a mode that has none, and no scan time runs on from the old mode.
    let mode = this.settings.selectionMode();
    effect(() => {
      const next = this.settings.selectionMode();
      if (next !== mode) {
        mode = next;
        untracked(() => this.rest());
      }
    });
  }

  /**
   * Takes the board on show as the number of cells in each of its groups. A screen that closes
   * gives an empty board. The scan goes to rest, unless the board changed because of a pick.
   * Then the scan starts at the first group of the new board, when the post click delay ends
   * or at once if it has ended.
   */
  show(sizes: readonly number[]): void {
    this.sizes = [...sizes];
    if (this.current().phase === 'confirmed') {
      // The picked cell is not on the new board, so nothing is marked while the delay runs.
      this.current.set({ phase: 'confirmed', group: null, cell: null });
    } else if (this.resumed) {
      this.resume();
    } else {
      this.rest();
    }
  }

  /**
   * The switch that picks. At rest it starts the scan and picks nothing. On a group it goes into
   * the cells of the group, and on a cell it picks the cell. It does nothing in the post click delay.
   */
  press(): void {
    const { phase, group, cell } = this.current();
    this.resumed = false;
    if (phase === 'rest') {
      this.start();
    } else if (phase === 'groups' && group !== null) {
      this.enter(group);
    } else if (phase === 'cells' && group !== null && cell !== null) {
      this.pick({ group, cell });
    }
  }

  /**
   * The switch that moves the highlight by one, forward or back. At rest it starts the scan.
   * A move past the last group goes round to the first. A move out of either end of a group
   * goes back to the groups, with that group highlighted. The scan time and the count of passes
   * start again. It does nothing in the post click delay.
   */
  move(direction: 1 | -1 = 1): void {
    const { phase, group, cell } = this.current();
    this.resumed = false;
    if (phase === 'rest') {
      this.start();
    } else if (phase === 'groups' && group !== null) {
      this.highlightGroup(this.nextGroup(group, direction));
    } else if (phase === 'cells' && group !== null && cell !== null) {
      const next = cell + direction;
      const size = this.sizes[group];
      if (next >= 0 && next < size) {
        this.highlightCell(group, next);
      } else if (this.hasGroupStep()) {
        this.highlightGroup(group);
      } else {
        this.highlightCell(group, (next + size) % size);
      }
    }
  }

  /** Sends the scan to rest. Nothing is highlighted and nothing moves until the next switch press. */
  rest(): void {
    this.stopTimer();
    this.resumed = false;
    this.steps = 0;
    this.current.set(REST);
  }

  /** The groups that hold cells, by index. A group with no cells is skipped. */
  private filledGroups(): number[] {
    return this.sizes.flatMap((size, index) => (size > 0 ? [index] : []));
  }

  /** Whether the groups are scanned before the cells. A board with one filled group has no group step. */
  private hasGroupStep(): boolean {
    return this.filledGroups().length > 1;
  }

  private nextGroup(group: number, direction: 1 | -1): number {
    const filled = this.filledGroups();
    const place = filled.indexOf(group);
    return filled[(place + direction + filled.length) % filled.length];
  }

  /** Starts the scan at the first group, or at the first cell when the board has no group step. */
  private start(): void {
    const filled = this.filledGroups();
    if (filled.length === 0) {
      this.stopTimer();
      this.current.set(REST);
    } else if (filled.length === 1) {
      this.highlightCell(filled[0], 0);
    } else {
      this.highlightGroup(filled[0]);
    }
  }

  /**
   * Starts the scan again after a pick. The scan stays marked as started again until a switch
   * or the scan time moves it, so a board that the pick opens a moment later is scanned too.
   */
  private resume(): void {
    this.start();
    this.resumed = true;
  }

  private highlightGroup(group: number): void {
    this.steps = 0;
    this.current.set({ phase: 'groups', group, cell: null });
    this.schedule();
  }

  private highlightCell(group: number, cell: number): void {
    this.steps = 0;
    this.current.set({ phase: 'cells', group, cell });
    this.schedule();
  }

  /** Goes into the cells of a group. A group of one cell has no cell step, so its cell is picked. */
  private enter(group: number): void {
    if (this.sizes[group] === 1) {
      this.pick({ group, cell: 0 });
    } else {
      this.highlightCell(group, 0);
    }
  }

  private pick(position: CellPosition): void {
    this.stopTimer();
    this.current.set({ phase: 'confirmed', ...position });
    this.picked.next(position);
    if (this.current().phase !== 'confirmed') {
      // A listener sent the scan to rest.
      return;
    }
    const delay = this.settings.postClickDelay();
    if (delay === 0) {
      this.resume();
    } else {
      this.timer = setTimeout(() => this.resume(), delay);
    }
  }

  /** In `scan` mode the highlight moves by itself after each scan time. In `step` mode no time runs. */
  private schedule(): void {
    this.stopTimer();
    if (this.settings.selectionMode() === 'scan') {
      this.timer = setTimeout(() => this.tick(), this.settings.scanTime());
    }
  }

  /**
   * Moves the highlight when the scan time ends. After two passes over the cells of a group
   * the scan returns to the groups, and after two passes over the groups it goes to rest.
   */
  private tick(): void {
    const { phase, group, cell } = this.current();
    this.resumed = false;
    if (group === null) {
      return;
    }
    const steps = this.steps + 1;
    if (phase === 'groups') {
      if (steps >= PASSES * this.filledGroups().length) {
        this.rest();
        return;
      }
      this.current.set({ phase, group: this.nextGroup(group, 1), cell: null });
    } else if (phase === 'cells' && cell !== null) {
      const size = this.sizes[group];
      if (steps >= PASSES * size) {
        if (this.hasGroupStep()) {
          this.highlightGroup(group);
        } else {
          this.rest();
        }
        return;
      }
      this.current.set({ phase, group, cell: (cell + 1) % size });
    }
    this.steps = steps;
    this.schedule();
  }

  private stopTimer(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
