import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  PendingTasks,
  Signal,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  BoardData,
  CORE_ICON_NAMES,
  CellColour,
  CoreIconName,
  IconName,
  isLucideIconName,
} from '../boards/board-data';
import { Cell } from '../cells/cell';
import { Icon } from '../cells/icon';
import {
  BOARD_CELL_STYLES,
  BoardCellStyle,
  CellFields,
  LABEL_LENGTH,
  OpenFields,
  PHRASE_LENGTH,
  Picture,
  SpeakFields,
  fieldsOf,
  tileAt,
  tileFor,
} from './board-edits';
import { EditDialog, EditMode } from './edit-mode';
import { searchPictures } from './picture-search';
import { IconItem, PictureList, SymbolItem } from './picture-list';

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
 * board dialog, and it must be called where `inject` works.
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
  picture: { kind: 'icon', icon: 'board' },
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

/** The icons that stand for a key or a control. The list does not offer them. */
const CONTROL_ICONS: readonly CoreIconName[] = [
  'back',
  'backspace',
  'caps',
  'trash',
  'check',
  'cross',
];

/**
 * The name of each core icon. The 12 that the list offers keep the names the dialog gave them
 * before the Lucide set came in. A cell can still show one of the control icons, such as the
 * tick of Yes, so those have names too, which the list shows when such a cell is edited.
 */
const CORE_ICON_LABELS: Readonly<Record<CoreIconName, string>> = {
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
  back: 'Arrow left',
  backspace: 'Delete',
  caps: 'Capitals',
  trash: 'Bin',
  check: 'Tick',
  cross: 'Cross',
};

/** The prefix of a Lucide name. */
const LUCIDE_PREFIX = 'lucide:';

/** The number of pictures that the list draws at first, and that Show more adds. */
const PAGE = 60;

/** Writes a number with a comma between the thousands, such as 3,437. */
const COUNT = new Intl.NumberFormat('en');

/** The two kinds of picture, which the choice of Symbols or Icons picks between. */
type PictureKind = Picture['kind'];

/** One picture of the list: the value of its radio button, its name and the picture itself. */
interface PictureOption {
  readonly key: string;
  readonly name: string;
  readonly picture: Picture;
}

/** The value of a radio button of the list. "No picture" has the empty value. */
function keyOf(picture: Picture | undefined): string {
  if (!picture) {
    return '';
  }
  return picture.kind === 'symbol' ? `symbol:${picture.symbol}` : `icon:${picture.icon}`;
}

function option(picture: Picture, name: string): PictureOption {
  return { key: keyOf(picture), name, picture };
}

function symbolOption(item: SymbolItem): PictureOption {
  return option({ kind: 'symbol', symbol: item.file }, item.name);
}

/** A Lucide icon of the list. A value that is not a Lucide name is left out. */
function iconOption(item: IconItem): PictureOption[] {
  const icon = item.value;
  return isLucideIconName(icon) ? [option({ kind: 'icon', icon }, item.name)] : [];
}

/**
 * The 12 core icons that a board could take before the Lucide set came in. They come before the
 * Lucide icons, so where a core name and a Lucide name are the same word, such as "Heart" and
 * "heart", the core icon is listed first. They are counted and searched like any other icon.
 */
const CORE_OPTIONS: readonly PictureOption[] = CORE_ICON_NAMES.filter(
  (name) => !CONTROL_ICONS.includes(name),
).map((icon) => option({ kind: 'icon', icon }, CORE_ICON_LABELS[icon]));

/**
 * The name of a picture that the lists do not give, such as the picture of a cell while the lists
 * load, a control icon or a Lucide name that the set does not have. It is made from the stored name.
 */
function fallbackName(picture: Picture): string {
  if (picture.kind === 'symbol') {
    return picture.symbol.replace(/\.svg$/, '').replaceAll('-', ' ');
  }
  const icon: IconName = picture.icon;
  if (isLucideIconName(icon)) {
    return icon.slice(LUCIDE_PREFIX.length).replaceAll('-', ' ');
  }
  return CORE_ICON_LABELS[icon];
}

/** The pictures of both kinds, once they have loaded. */
interface PictureLists {
  readonly symbol: readonly PictureOption[];
  readonly icon: readonly PictureOption[];
}

/**
 * The tile dialog. Add Tile, Add Board and the Edit button of a cell open it. It shows the
 * fields of a cell that speaks or of a cell that opens a board, and a preview of the cell that
 * follows each change. It changes nothing itself: Add and Save emit the fields, and the board
 * screen applies them and closes the dialog. It is a caregiver screen, so scanning does not reach it.
 */
@Component({
  selector: 'app-tile-dialog',
  imports: [Cell, Icon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tile-dialog.html',
  styleUrl: './tile-dialog.css',
})
export class TileDialog {
  private readonly edit = inject(EditMode);
  private readonly data = inject(BoardData);
  private readonly pictureList = inject(PictureList);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly injector = inject(Injector);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly labelInput = viewChild.required<ElementRef<HTMLInputElement>>('labelInput');
  private readonly pictureListElement = viewChild<ElementRef<HTMLElement>>('pictureList');

  /** The fields of the cell, when Add or Save is pressed with a label. */
  readonly saved = output<CellFields>();

  protected readonly labelLength = LABEL_LENGTH;
  protected readonly phraseLength = PHRASE_LENGTH;
  protected readonly colours = COLOURS;
  protected readonly styles = BOARD_CELL_STYLES;
  protected readonly styleLabels = STYLE_LABELS;

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
  protected readonly colour = signal<CellColour>(NEW_TILE.colour);
  protected readonly style = signal<BoardCellStyle>(NEW_BOARD.style);

  /** The picture of the cell, or nothing for a cell that speaks and shows its label alone. */
  protected readonly picture = signal<Picture | undefined>(undefined);

  /** The kind of picture that the list shows: Symbols or Icons. */
  protected readonly view = signal<PictureKind>('symbol');

  /** The text in the box "Find a picture". It stays when the caregiver changes the kind. */
  protected readonly query = signal('');

  /** How many of the matches the list draws. Show more adds a page. */
  protected readonly limit = signal(PAGE);

  /** The pictures of both kinds, or null until they have loaded. */
  private readonly lists = signal<PictureLists | null>(null);

  /** Whether the lists could not be loaded. */
  protected readonly failed = signal(false);

  /**
   * The last picture of each kind that a cell that opens a board had in this dialog. Such a cell
   * must have a picture, so a change of kind brings back the last one of that kind, if there is one.
   */
  private lastOfKind: Partial<Record<PictureKind, Picture>> = {};

  /** Whether the lists are being loaded. */
  private loading = false;

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

  /** A cell that opens a board shows the Style field only while its picture is an icon. */
  protected readonly showStyle = computed(
    () => this.kind() === 'open' && this.picture()?.kind === 'icon',
  );

  /** The pictures of each kind whose name holds every word of the text, in the order of the search. */
  private readonly matches = computed(
    (): Readonly<Record<PictureKind, readonly PictureOption[]>> => {
      const lists = this.lists();
      const query = this.query();
      return {
        symbol: lists ? searchPictures(lists.symbol, query) : [],
        icon: lists ? searchPictures(lists.icon, query) : [],
      };
    },
  );

  /** The two choices of kind. */
  protected readonly kinds: readonly { value: PictureKind; label: string }[] = [
    { value: 'symbol', label: 'Symbols' },
    { value: 'icon', label: 'Icons' },
  ];

  /**
   * The picture that leads the list. It is the picture of the cell when the dialog opens, and the
   * chosen picture when the text or the kind changes. A pick does not change it, so a picture
   * that is picked keeps its place. If it moved to the top, an arrow key would move the focus
   * out of the list and could not go past the second picture.
   */
  private readonly lead = signal<Picture | undefined>(undefined);

  /** The picture that leads the list as an entry of the list, with its name from the lists when they have it. */
  private readonly chosen = computed((): PictureOption | undefined => {
    const picture = this.lead();
    if (!picture) {
      return undefined;
    }
    const key = keyOf(picture);
    const listed = this.lists()?.[picture.kind].find((item) => item.key === key);
    return listed ?? option(picture, fallbackName(picture));
  });

  protected readonly chosenKey = computed(() => keyOf(this.picture()));

  /**
   * What the list draws. The picture that leads the list comes first when it is of the kind on show,
   * whatever the box holds. When it matches it is one of the matches that are drawn and counted;
   * when it does not, it is drawn in addition and not counted. Then come the matches, up to the limit.
   */
  private readonly page = computed(() => {
    const view = this.view();
    const matches = this.matches()[view];
    const chosen = this.chosen();
    const own = chosen?.picture.kind === view ? chosen : undefined;
    const others = own ? matches.filter((item) => item.key !== own.key) : matches;
    const ownMatches = own !== undefined && others.length < matches.length;
    const limit = this.limit();
    const shown = ownMatches && own ? [own, ...others.slice(0, limit - 1)] : others.slice(0, limit);
    return {
      items: own && !ownMatches ? [own, ...shown] : shown,
      shown: shown.length,
      total: matches.length,
    };
  });

  protected readonly items = computed(() => this.page().items);

  protected readonly hasMore = computed(() => this.page().shown < this.page().total);

  /** The line under the list, which says how many pictures are shown and how many match. */
  protected readonly countLine = computed(() => {
    if (this.failed()) {
      return 'The pictures could not be loaded.';
    }
    if (this.lists() === null) {
      return 'Loading the pictures.';
    }
    const { shown, total } = this.page();
    if (total === 0) {
      return this.view() === 'symbol' ? 'No symbol has that name.' : 'No icon has that name.';
    }
    return `Showing ${COUNT.format(shown)} of ${COUNT.format(total)}`;
  });

  protected readonly fields = computed((): CellFields => {
    const label = this.label();
    const colour = this.colour();
    const picture = this.picture();
    if (this.kind() === 'open') {
      return {
        kind: 'open',
        label,
        colour,
        style: this.style(),
        picture: picture ?? NEW_BOARD.picture,
      };
    }
    return { kind: 'speak', label, colour, phrase: this.phrase(), ...(picture && { picture }) };
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
    // Each dialog that is asked for starts from its own fields. The lists load the first time.
    effect(() => {
      const asked = this.asked();
      if (asked) {
        untracked(() => {
          this.fill(asked);
          this.loadLists();
        });
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

  protected setQuery(text: string): void {
    this.query.set(text);
    this.limit.set(PAGE);
    this.lead.set(this.picture());
  }

  /**
   * Shows the pictures of the other kind. A cell that opens a board takes back the last picture
   * of that kind it had in this dialog, so its Style field follows the kind on show.
   */
  protected setView(kind: PictureKind): void {
    this.view.set(kind);
    this.limit.set(PAGE);
    const last = this.lastOfKind[kind];
    if (this.kind() === 'open' && last) {
      this.picture.set(last);
    }
    this.lead.set(this.picture());
  }

  protected pick(picture: Picture | undefined): void {
    this.picture.set(picture);
    if (picture) {
      this.lastOfKind[picture.kind] = picture;
    }
  }

  /**
   * Draws a page more. When the button goes, because every match is drawn, the focus moves to
   * the first of the new pictures, so it is not lost.
   */
  protected showMore(): void {
    const before = this.items().length;
    this.limit.update((limit) => limit + PAGE);
    if (this.hasMore()) {
      return;
    }
    const first = this.items()[before];
    afterNextRender(
      () => {
        const list = this.pictureListElement()?.nativeElement;
        const radios = list?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [];
        Array.from(radios)
          .find((radio) => first && radio.value === first.key)
          ?.focus();
      },
      { injector: this.injector },
    );
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

  /**
   * Loads the names of the symbols and of the icons, once. The pending task keeps the app from
   * counting as stable while they load, so a test can wait for the list.
   */
  private loadLists(): void {
    if (this.loading || this.lists() !== null) {
      return;
    }
    this.loading = true;
    this.failed.set(false);
    void this.pendingTasks.run(async () => {
      try {
        const [symbols, icons] = await Promise.all([
          this.pictureList.symbols(),
          this.pictureList.icons(),
        ]);
        this.lists.set({
          symbol: symbols.map(symbolOption),
          icon: [...CORE_OPTIONS, ...icons.flatMap(iconOption)],
        });
      } catch {
        this.failed.set(true);
      } finally {
        this.loading = false;
      }
    });
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
    this.style.set(start.kind === 'open' ? start.style : NEW_BOARD.style);
    const picture = start.picture;
    this.picture.set(picture);
    this.lead.set(picture);
    this.lastOfKind = picture ? { [picture.kind]: picture } : {};
    // A cell that speaks starts on Symbols and a cell that opens a board on Icons, unless it has a picture.
    this.view.set(picture?.kind ?? (start.kind === 'open' ? 'icon' : 'symbol'));
    this.query.set('');
    this.limit.set(PAGE);
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
