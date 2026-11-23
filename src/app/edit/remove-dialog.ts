import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { BoardData } from '../boards/board-data';
import { removedWith, tileAt } from './board-edits';
import { EditMode } from './edit-mode';
import { sheetDialog } from './tile-dialog';

/** A count with its word, such as "1 board" or "9 boards". */
function counted(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * The dialog that asks before a cell that opens a board is removed. It names the board and
 * says how many boards and cells go with it. It changes nothing itself: Remove emits
 * `confirmed`, and the board screen removes the cell and closes the dialog.
 */
@Component({
  selector: 'app-remove-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './remove-dialog.html',
  styleUrls: ['./tile-dialog.css', './remove-dialog.css'],
})
export class RemoveDialog {
  private readonly edit = inject(EditMode);
  private readonly data = inject(BoardData);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');

  /** Remove was pressed. */
  readonly confirmed = output<void>();

  /** The place of the cell that is to go, or null while this dialog is closed. */
  private readonly at = computed(() => {
    const dialog = this.edit.dialog();
    return dialog?.kind === 'remove' ? dialog.at : null;
  });

  private readonly tile = computed(() => {
    const at = this.at();
    return at && tileAt(this.data.set(), this.edit.boardId(), at);
  });

  /** The title of the board that the cell opens. A cell that opens no board is named by its label. */
  protected readonly name = computed(() => {
    const action = this.tile()?.action;
    const board = action?.type === 'open' ? this.data.board(action.board) : undefined;
    return board?.title ?? this.tile()?.label ?? '';
  });

  /** What goes with the cell, as a sentence. */
  protected readonly text = computed(() => {
    const at = this.at();
    const { boards, cells } = at
      ? removedWith(this.data.set(), this.edit.boardId(), at)
      : { boards: [], cells: 0 };
    if (boards.length === 0) {
      return 'Only this tile will be removed.';
    }
    const their = boards.length === 1 ? 'its' : 'their';
    return `${counted(boards.length, 'board')} and ${their} ${counted(cells, 'cell')} will be removed.`;
  });

  protected readonly events = sheetDialog(
    this.dialog,
    computed(() => this.at() !== null),
    () => this.cancelButton().nativeElement,
  );

  constructor() {
    // A cell that is no longer there, as after a sync, has nothing to remove.
    effect(() => {
      if (this.at() && !this.tile()) {
        untracked(() => this.edit.close());
      }
    });
  }

  protected cancel(): void {
    this.edit.close();
  }
}
