import { Injectable, signal } from '@angular/core';
import { HOME_BOARD_ID } from '../boards/board-data';
import { CellPosition } from '../scan/scan';

/**
 * A dialog of edit mode, and what it is about. The buttons of the footer and of the cells ask
 * for one, and the board screen shows it.
 */
export type EditDialog =
  /** Adds a cell that speaks, to a group when one is named. */
  | { readonly kind: 'add-tile'; readonly group?: number }
  /** Adds a board and a cell that opens it. */
  | { readonly kind: 'add-board' }
  /** Edits the cell at a place. */
  | { readonly kind: 'edit-tile'; readonly at: CellPosition }
  /** Sets the title and the layout of the board on show. */
  | { readonly kind: 'board' };

/** A change as screen readers hear it. Each change gets a new number, so the same text twice is told twice. */
export interface Told {
  readonly text: string;
  readonly count: number;
}

/**
 * The state of edit mode, in which the caregiver changes the boards. It says whether edit mode
 * is on, which board is on show, which dialog is open and what the last change was.
 * The scan, the switch keys, the dwell press and the round cursor read `isOn`, so the board
 * stays quiet while the caregiver edits it, as it does behind the settings panel.
 */
@Injectable({ providedIn: 'root' })
export class EditMode {
  private readonly on = signal(false);
  private readonly shown = signal(HOME_BOARD_ID);
  private readonly asked = signal<EditDialog | null>(null);
  private readonly told = signal<Told>({ text: '', count: 0 });

  readonly isOn = this.on.asReadonly();

  /** The id of the board on show. The board screen sets it. */
  readonly boardId = this.shown.asReadonly();

  /** The dialog that is open, or null when none is. */
  readonly dialog = this.asked.asReadonly();

  /** The last change, for the status line that screen readers hear. */
  readonly status = this.told.asReadonly();

  /**
   * Turns edit mode on. The last change of an earlier session is dropped, so the status line
   * does not tell it again as if it had just happened.
   */
  start(): void {
    if (!this.on()) {
      this.told.update(({ count }) => ({ text: '', count: count + 1 }));
    }
    this.on.set(true);
  }

  /** Turns edit mode off. A dialog that is open is closed with no change. */
  stop(): void {
    this.on.set(false);
    this.asked.set(null);
  }

  /** The board screen says which board it shows. */
  show(boardId: string): void {
    this.shown.set(boardId);
  }

  open(dialog: EditDialog): void {
    this.asked.set(dialog);
  }

  close(): void {
    this.asked.set(null);
  }

  /** Tells screen readers a change. */
  tell(text: string): void {
    this.told.update(({ count }) => ({ text, count: count + 1 }));
  }
}
