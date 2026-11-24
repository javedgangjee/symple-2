import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  afterRenderEffect,
  computed,
  effect,
  inject,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import symbolsFile from '../../data/symbols.json';
import { BoardData, CellColour, ICON_NAMES, IconName } from '../boards/board-data';
import { Cell } from '../cells/cell';
import { Icon } from '../cells/icon';
import {
  BOARD_CELL_STYLES,
  BoardCellStyle,
  CellFields,
  LABEL_LENGTH,
  OpenFields,
  PHRASE_LENGTH,
  SpeakFields,
  fieldsOf,
  tileAt,
  tileFor,
} from './board-edits';
import { EditDialog, EditMode } from './edit-mode';

/** What a dialog of edit mode hears from its `<dialog>` element. The template binds each one. */
export interface SheetEvents {
  /** The dialog was closed, by the page or by Escape. */
  readonly closed: () => void;
  readonly pointerDown: (event: PointerEvent) => void;
  readonly click: (event: MouseEvent) => void;
  readonly key: (event: KeyboardEvent) => void;
}

/**
 * The way the three dialogs of edit mode open and close. It is shared by the tile dialog, the
 * remove dialog and the board dialog, and it must be called where `inject` works.
 *
 * The `<dialog>` is shown with `showModal` while `isOpen` is true, so the browser makes the page
 * behind it inert and closes it on Escape. When it opens it remembers the element that had the
 * focus and gives the focus to `first`. When it closes the focus goes back to that element,
 * if it is still in the page. Escape and a press on the dimmed page close it with `EditMode.close`.
 */
export function sheetDialog(
  dialog: Signal<ElementRef<HTMLDialogElement>>,
  isOpen: Signal<boolean>,
  first: () => HTMLElement | undefined,
): SheetEvents {
  const edit = inject(EditMode);
  let opener: HTMLElement | undefined;
  let pressStartedOnPage = false;

  // This runs after the page is drawn, so the first field exists when it takes the focus.
  afterRenderEffect(() => {
    const open = isOpen();
    const element = dialog().nativeElement;
    untracked(() => {
      if (open && !element.open) {
        const active = element.ownerDocument.activeElement;
        opener = active instanceof HTMLElement ? active : undefined;
        element.showModal();
        first()?.focus();
      } else if (!open) {
        if (element.open) {
          element.close();
        }
        if (opener?.isConnected) {
          opener.focus();
        }
        opener = undefined;
      }
    });
  });

  return {
    // A dialog that the page closed is no longer open by now, so only Escape gets here open.
    closed: () => {
      if (isOpen()) {
        edit.close();
      }
    },
    // Only the dimmed page gives the dialog itself as the target of a press.
    pointerDown: (event) => {
      pressStartedOnPage = event.target === dialog().nativeElement;
    },
    // A press that starts inside the dialog and ends on the dimmed page, as when text is
    // selected with the mouse, also reports its click on the dialog, and it must leave it open.
    click: (event) => {
      if (event.target === dialog().nativeElement && pressStartedOnPage) {
        edit.close();
      }
      pressStartedOnPage = false;
    },
    key: (event) => keepTabInside(event, dialog().nativeElement),
  };
}

/**
 * Tab goes round inside a dialog. From the last control it goes to the first, and Shift with
 * Tab goes the other way, so the focus never leaves for the browser's own buttons.
 */
function keepTabInside(event: KeyboardEvent, dialog: HTMLDialogElement): void {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  const stops = tabStops(dialog);
  const active = dialog.ownerDocument.activeElement;
  if (event.shiftKey && active === stops.at(0)) {
    event.preventDefault();
    stops.at(-1)?.focus();
  } else if (!event.shiftKey && active === stops.at(-1)) {
    event.preventDefault();
    stops.at(0)?.focus();
  }
}

/**
 * The controls that Tab stops on, in order. A group of radio buttons takes one stop, on the
 * chosen one, and the preview of the tile dialog is inert, so it takes none.
 */
function tabStops(dialog: HTMLDialogElement): HTMLElement[] {
  const candidates = dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]');
  return Array.from(candidates).filter(
    (element) =>
      element.tabIndex >= 0 &&
      element.closest('[hidden], [inert]') === null &&
      !(element instanceof HTMLInputElement && element.type === 'radio' && !element.checked),
  );
}

/** Cuts the text of a field to its limit. A paste, and a test page, can go past `maxlength`. */
export function cut(input: HTMLInputElement, limit: number): string {
  if (input.value.length > limit) {
    input.value = input.value.slice(0, limit);
  }
  return input.value;
}

/** The dialogs that the tile dialog shows. */
type TileDialogAsk = Extract<EditDialog, { kind: 'add-tile' | 'add-board' | 'edit-tile' }>;

function isTileDialog(dialog: EditDialog | null): dialog is TileDialogAsk {
  return (
    dialog?.kind === 'add-tile' || dialog?.kind === 'add-board' || dialog?.kind === 'edit-tile'
  );
}

/** The fields of a new cell that speaks. */
const NEW_TILE: SpeakFields = { kind: 'speak', label: '', phrase: '', colour: 'light' };

/** The fields of a new board. */
const NEW_BOARD: OpenFields = {
  kind: 'open',
  label: '',
  style: 'bleed',
  colour: 'dark',
  icon: 'board',
};

/** The four colours that the caregiver can pick, with their names. */
const COLOURS: readonly { readonly value: CellColour; readonly label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'soft1', label: 'Soft' },
  { value: 'grey', label: 'Grey' },
  { value: 'light', label: 'White' },
];

/** The name and the short description of each style of a cell that opens a board. */
const STYLE_LABELS: Readonly<Record<BoardCellStyle, { name: string; about: string }>> = {
  bleed: { name: 'Bleed', about: 'Cropped icon' },
  signage: { name: 'Signage', about: 'Icon in a disc' },
  stage: { name: 'Stage', about: 'Centred icon' },
};

/** The icons that stand for a key or a control. A board cannot take them. */
const CONTROL_ICONS = [
  'back',
  'backspace',
  'caps',
  'trash',
  'check',
  'cross',
] as const satisfies readonly IconName[];

type BoardIcon = Exclude<IconName, (typeof CONTROL_ICONS)[number]>;

/** The name of each icon that a board can take, for screen readers. */
const ICON_LABELS: Readonly<Record<BoardIcon, string>> = {
  board: 'Grid',
  heart: 'Heart',
  chat: 'Speech bubble',
  keyboard: 'Keyboard',
  restaurant: 'Knife and fork',
  cafe: 'Coffee cup',
  mood: 'Smile',
  group: 'People',
  place: 'Map pin',
  game: 'Game controller',
  thumbs: 'Thumbs up',
  apps: 'Dots',
};

function isBoardIcon(name: IconName): name is BoardIcon {
  return !CONTROL_ICONS.some((control) => control === name);
}

/** The icons in the order of `ICON_NAMES`, with their names. */
const ICONS = ICON_NAMES.filter(isBoardIcon).map((name) => ({ name, label: ICON_LABELS[name] }));

/**
 * The tile dialog. Add Tile, Add Board and the Edit button of a cell open it. It shows the
 * fields of a cell that speaks or of a cell that opens a board, and a preview of the cell that
 * follows each change. It changes nothing itself: Add and Save emit the fields, and the board
 * screen applies them and closes the dialog. It is a caregiver screen, so scanning does not reach it.
 */
@Component({
  selector: 'app-tile-dialog',
  imports: [Cell, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tile-dialog.html',
  styleUrl: './tile-dialog.css',
})
export class TileDialog {
  private readonly edit = inject(EditMode);
  private readonly data = inject(BoardData);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly labelInput = viewChild.required<ElementRef<HTMLInputElement>>('labelInput');

  /** The fields of the cell, when Add or Save is pressed with a label. */
  readonly saved = output<CellFields>();

  protected readonly labelLength = LABEL_LENGTH;
  protected readonly phraseLength = PHRASE_LENGTH;
  protected readonly colours = COLOURS;
  protected readonly styles = BOARD_CELL_STYLES;
  protected readonly styleLabels = STYLE_LABELS;
  protected readonly icons = ICONS;

  /** The dialog that is asked for, or null while this one is closed. */
  protected readonly asked = computed(() => {
    const dialog = this.edit.dialog();
    return isTileDialog(dialog) ? dialog : null;
  });

  /** The tile of the cell that is edited, or nothing for a new cell. */
  private readonly current = computed(() => {
    const asked = this.asked();
    return asked?.kind === 'edit-tile'
      ? tileAt(this.data.set(), this.edit.boardId(), asked.at)
      : undefined;
  });

  protected readonly kind = signal<CellFields['kind']>('speak');
  protected readonly label = signal('');
  protected readonly phrase = signal('');
  /** The file name of the symbol, or empty for no symbol. */
  protected readonly symbol = signal('');
  protected readonly colour = signal<CellColour>(NEW_TILE.colour);
  protected readonly style = signal<BoardCellStyle>(NEW_BOARD.style);
  protected readonly icon = signal<IconName>(NEW_BOARD.icon);

  /** The text in the box that filters the symbols. */
  protected readonly query = signal('');

  /** Whether Add or Save was pressed with an empty label. It goes when the caregiver types. */
  protected readonly invalid = signal(false);

  protected readonly title = computed(() => {
    const asked = this.asked();
    if (asked?.kind === 'edit-tile') {
      return `Edit ${this.current()?.label ?? ''}`.trim();
    }
    return asked?.kind === 'add-board' ? 'Add Board' : 'Add Tile';
  });

  protected readonly placeholder = computed(() =>
    this.kind() === 'open' ? 'New board' : 'New tile',
  );

  protected readonly needed = computed(() =>
    this.kind() === 'open' ? 'Give the board a name.' : 'Give the tile a label.',
  );

  /** The symbols whose name holds the text of the filter, without regard to case. */
  protected readonly symbols = computed(() => {
    const query = this.query().trim().toLowerCase();
    return symbolsFile.filter((symbol) => symbol.name.toLowerCase().includes(query));
  });

  protected readonly fields = computed((): CellFields => {
    const label = this.label();
    const colour = this.colour();
    if (this.kind() === 'open') {
      return { kind: 'open', label, colour, style: this.style(), icon: this.icon() };
    }
    const symbol = this.symbol();
    return { kind: 'speak', label, colour, phrase: this.phrase(), ...(symbol && { symbol }) };
  });

  /**
   * The tile that the preview draws. It is made as the stored tile is made, so the two agree.
   * With an empty label it shows the label of the cell that is edited, or the placeholder.
   */
  protected readonly preview = computed(() => {
    const fields = this.fields();
    const current = this.current();
    const label = fields.label.trim() || current?.label || this.placeholder();
    return tileFor({ ...fields, label }, current);
  });

  protected readonly events = sheetDialog(
    this.dialog,
    computed(() => this.asked() !== null),
    () => this.labelInput().nativeElement,
  );

  constructor() {
    // Each dialog that is asked for starts from its own fields.
    effect(() => {
      const asked = this.asked();
      if (asked) {
        untracked(() => this.fill(asked));
      }
    });
  }

  protected setLabel(input: HTMLInputElement): void {
    this.label.set(cut(input, LABEL_LENGTH));
    this.invalid.set(false);
  }

  protected setPhrase(input: HTMLInputElement): void {
    this.phrase.set(cut(input, PHRASE_LENGTH));
  }

  /** Add or Save. An empty label keeps the dialog open and says that a label is needed. */
  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.label().trim()) {
      this.invalid.set(true);
      this.labelInput().nativeElement.focus();
      return;
    }
    this.saved.emit(this.fields());
  }

  protected cancel(): void {
    this.edit.close();
  }

  /** Fills the fields for the dialog that is asked for. A cell that cannot be edited closes it. */
  private fill(asked: TileDialogAsk): void {
    const start = this.startFields(asked);
    if (!start) {
      this.edit.close();
      return;
    }
    this.kind.set(start.kind);
    this.label.set(start.label);
    this.colour.set(start.colour);
    this.phrase.set(start.kind === 'speak' ? start.phrase : NEW_TILE.phrase);
    this.symbol.set(start.kind === 'speak' ? (start.symbol ?? '') : '');
    this.style.set(start.kind === 'open' ? start.style : NEW_BOARD.style);
    this.icon.set(start.kind === 'open' ? start.icon : NEW_BOARD.icon);
    this.query.set('');
    this.invalid.set(false);
  }

  private startFields(asked: TileDialogAsk): CellFields | undefined {
    if (asked.kind === 'add-tile') {
      return NEW_TILE;
    }
    if (asked.kind === 'add-board') {
      return NEW_BOARD;
    }
    const tile = this.current();
    return tile && fieldsOf(tile);
  }
}
