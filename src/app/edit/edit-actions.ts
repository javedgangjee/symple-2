import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { BoardData } from '../boards/board-data';
import { addGroup } from './board-edits';
import { EditMode } from './edit-mode';
import { Room } from './room';

/**
 * The buttons of edit mode in the footer: Add column, Add board, Add tile, Board settings and
 * Done. An Add button with no room stays in the tab order, says that it is disabled and why,
 * and does nothing.
 */
@Component({
  selector: 'app-edit-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-actions.html',
  styleUrl: './edit-actions.css',
})
export class EditActions {
  private readonly data = inject(BoardData);
  private readonly edit = inject(EditMode);
  protected readonly room = inject(Room);

  private readonly done = viewChild.required<ElementRef<HTMLButtonElement>>('done');

  private readonly board = computed(() => this.data.board(this.edit.boardId()));

  /** What a group of the board on show is called, as "column" or "row". */
  protected readonly groupKind = computed(() =>
    this.board()?.layout === 'rows' ? 'row' : 'column',
  );

  /** Why Add tile and Add board do nothing, for the caregiver and for screen readers. */
  protected readonly cellsFullText = computed(
    () =>
      `Every ${this.groupKind()} is full. Remove a tile or add a ${this.groupKind()} to add another.`,
  );

  /** Why Add column does nothing. */
  protected readonly groupsFullText = computed(
    () => `The board has no room for another ${this.groupKind()}.`,
  );

  constructor() {
    // Edit mode starts with the focus on Done, as in the mockup, so the focus is not lost when
    // the settings panel closes. A dialog that opens at the same moment takes the focus itself.
    afterNextRender(() => {
      if (!this.edit.dialog()) {
        this.done().nativeElement.focus();
      }
    });
  }

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
    const kind = this.groupKind();
    this.edit.tell(`${kind[0].toUpperCase()}${kind.slice(1)} ${board.groups.length + 1} added`);
  }

  /** Opens the tile dialog for a new cell or a new board, when a group has room for the cell. */
  protected add(kind: 'add-tile' | 'add-board'): void {
    if (this.room.forAnyCell()) {
      this.edit.open({ kind });
    } else {
      this.edit.tell(this.cellsFullText());
    }
  }

  protected openBoardSettings(): void {
    this.edit.open({ kind: 'board' });
  }

  protected stop(): void {
    this.edit.stop();
  }
}
