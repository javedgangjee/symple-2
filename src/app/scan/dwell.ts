import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { CellPosition, sameCell } from './scan';
import { ScanSettings } from './scan-settings';

type Timer = ReturnType<typeof setTimeout> | undefined;

/**
 * The dwell press. In `dwell` mode a pointer that rests on a cell for the dwell time presses
 * that cell. The screen tells the service where the pointer is, and the service runs the timer.
 * It knows nothing about the page.
 */
@Injectable({ providedIn: 'root' })
export class Dwell {
  private readonly settings = inject(ScanSettings);

  private readonly runningOn = signal<CellPosition | null>(null);
  private readonly confirmedOn = signal<CellPosition | null>(null);
  private readonly pressed = new Subject<CellPosition>();

  private dwellTimer: Timer;
  private delayTimer: Timer;
  /**
   * Whether the pointer must move before a dwell can start. It is set after a press and on a
   * new board, so a pointer that stays still does not press the cell under it again and again.
   */
  private mustMove = false;

  /** Where the pointer was when the screen last told of it. */
  private lastPoint: { readonly x: number; readonly y: number } | undefined;

  /** The cell that a dwell runs on. */
  readonly running = this.runningOn.asReadonly();

  /** The cell that a dwell pressed, for the length of the post click delay. */
  readonly confirmed = this.confirmedOn.asReadonly();

  /** Each press of a cell by a dwell. */
  readonly presses = this.pressed.asObservable();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.dwellTimer);
      clearTimeout(this.delayTimer);
    });

    // A change of the selection mode stops the dwell, so a dwell that began in `dwell` mode
    // presses nothing in another mode.
    let mode = this.settings.selectionMode();
    effect(() => {
      const next = this.settings.selectionMode();
      if (next !== mode) {
        mode = next;
        untracked(() => this.stop());
      }
    });
  }

  /**
   * The pointer is on a cell, at a place in the window. The browser also tells of a pointer that
   * has not moved, when a new board is drawn under it. The place tells the two apart, and it is
   * kept here because a new board can come with a new screen.
   */
  pointer(position: CellPosition, x: number, y: number): void {
    const last = this.lastPoint;
    const moved = last === undefined || last.x !== x || last.y !== y;
    this.lastPoint = { x, y };
    if (moved) {
      this.move(position);
    } else {
      this.enter(position);
    }
  }

  /** The pointer came onto a cell without a move of its own. */
  enter(position: CellPosition): void {
    this.begin(position);
  }

  /**
   * The pointer moved on a cell. A move inside the cell that a dwell runs on changes nothing,
   * because a head tracker and eye gaze never hold still. A move in the post click delay does not count.
   */
  move(position: CellPosition): void {
    if (this.delayTimer === undefined) {
      this.mustMove = false;
    }
    this.begin(position);
  }

  /** The pointer left a cell. The dwell on it stops, and nothing is pressed. */
  leave(position: CellPosition): void {
    if (sameCell(this.runningOn(), position)) {
      this.stop();
    }
  }

  /** A cell was pressed some other way, such as with a pointer press. The dwell stops. */
  interrupt(): void {
    this.stop();
    this.mustMove = true;
  }

  /** A new board is on show. The dwell stops, and no cell of the new board is marked. */
  reset(): void {
    this.stop();
    this.mustMove = true;
    this.confirmedOn.set(null);
  }

  private begin(position: CellPosition): void {
    if (
      this.settings.selectionMode() !== 'dwell' ||
      this.delayTimer !== undefined ||
      this.mustMove ||
      sameCell(this.runningOn(), position)
    ) {
      return;
    }
    this.stop();
    this.runningOn.set(position);
    this.dwellTimer = setTimeout(() => this.press(position), this.settings.dwellTime());
  }

  private press(position: CellPosition): void {
    this.stop();
    this.mustMove = true;
    const delay = this.settings.postClickDelay();
    if (delay > 0) {
      this.confirmedOn.set(position);
      this.delayTimer = setTimeout(() => {
        this.delayTimer = undefined;
        this.confirmedOn.set(null);
      }, delay);
    }
    this.pressed.next(position);
  }

  private stop(): void {
    clearTimeout(this.dwellTimer);
    this.dwellTimer = undefined;
    this.runningOn.set(null);
  }
}
