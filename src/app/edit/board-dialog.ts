import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { BoardData } from '../boards/board-data';
import { DEFAULT_LAYOUT, LAYOUT_NAMES, LayoutName } from '../layout/layout';
import { LABEL_LENGTH } from './board-edits';
import { EditMode } from './edit-mode';
import { cut, sheetDialog } from './tile-dialog';

/** What Save gives for the board on show. */
export interface BoardFields {
  readonly title: string;
  readonly layout: LayoutName;
}

const LAYOUT_LABELS: Readonly<Record<LayoutName, string>> = { columns: 'Columns', rows: 'Rows' };

/**
 * The dialog of Board settings. It sets the title and the layout of the board on show.
 * It changes nothing itself: Save emits the fields, and the board screen applies them and
 * closes the dialog.
 */
@Component({
  selector: 'app-board-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-dialog.html',
  styleUrls: ['./tile-dialog.css', './board-dialog.css'],
})
export class BoardDialog {
  private readonly edit = inject(EditMode);
  private readonly data = inject(BoardData);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly titleInput = viewChild.required<ElementRef<HTMLInputElement>>('titleInput');

  /** The title and the layout, when Save is pressed with a title. */
  readonly saved = output<BoardFields>();

  protected readonly labelLength = LABEL_LENGTH;
  protected readonly layouts = LAYOUT_NAMES;
  protected readonly layoutLabels = LAYOUT_LABELS;

  private readonly isOpen = computed(() => this.edit.dialog()?.kind === 'board');

  protected readonly title = signal('');
  protected readonly layout = signal<LayoutName>(DEFAULT_LAYOUT);

  /** Whether Save was pressed with an empty title. It goes when the caregiver types. */
  protected readonly invalid = signal(false);

  protected readonly events = sheetDialog(
    this.dialog,
    this.isOpen,
    () => this.titleInput().nativeElement,
  );

  constructor() {
    // The dialog starts from the board on show each time it opens.
    effect(() => {
      if (this.isOpen()) {
        untracked(() => this.fill());
      }
    });
  }

  protected setTitle(input: HTMLInputElement): void {
    this.title.set(cut(input, LABEL_LENGTH));
    this.invalid.set(false);
  }

  /** Save. An empty title keeps the dialog open and says that a title is needed. */
  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.title().trim()) {
      this.invalid.set(true);
      this.titleInput().nativeElement.focus();
      return;
    }
    this.saved.emit({ title: this.title(), layout: this.layout() });
  }

  protected cancel(): void {
    this.edit.close();
  }

  /** Fills the fields from the board on show. A board with no layout is drawn in columns. */
  private fill(): void {
    const board = this.data.board(this.edit.boardId());
    this.title.set(board?.title ?? '');
    this.layout.set(board?.layout ?? DEFAULT_LAYOUT);
    this.invalid.set(false);
  }
}
