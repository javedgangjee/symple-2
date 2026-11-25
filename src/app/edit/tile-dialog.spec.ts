import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardData } from '../boards/board-data';
import { CellFields } from './board-edits';
import { EditDialog, EditMode } from './edit-mode';
import { TileDialog } from './tile-dialog';
import { standInForDialog } from './dialog-stand-in';

describe('TileDialog', () => {
  let fixture: ComponentFixture<TileDialog>;
  let element: HTMLElement;
  let edit: EditMode;
  let saved: CellFields[];
  let restoreDialog: () => void;

  /** Draws the dialog over a board and opens it as the button of edit mode does. */
  async function open(dialog: EditDialog, boardId = 'needs'): Promise<void> {
    edit = TestBed.inject(EditMode);
    edit.start();
    edit.show(boardId);
    fixture = TestBed.createComponent(TileDialog);
    document.body.appendChild(fixture.nativeElement);
    saved = [];
    fixture.componentInstance.saved.subscribe((fields) => saved.push(fields));
    await fixture.whenStable();
    edit.open(dialog);
    await fixture.whenStable();
    element = fixture.nativeElement;
  }

  /** The one element that matches a selector. The test fails when there is none. */
  function one<T extends HTMLElement = HTMLElement>(selector: string): T {
    const found = element.querySelector<T>(selector);
    if (!found) {
      throw new Error(`Nothing matches "${selector}".`);
    }
    return found;
  }

  const dialog = () => one<HTMLDialogElement>('dialog');
  const title = () => one('#tile-title').textContent?.trim();
  const texts = (selector: string) =>
    Array.from(element.querySelectorAll(selector)).map((found) => found.textContent?.trim());
  /** The names of the fields, in the order of the page. */
  const fieldNames = () => texts('.field > label, legend');
  const previewLabel = () => one('.preview .label').textContent?.trim();
  const chosen = (name: string) => one<HTMLInputElement>(`input[name="${name}"]:checked`).value;
  const pictures = () => texts('.pictures label');
  /** The pictures of the list, without "No picture". */
  const listed = () => pictures().filter((name) => name !== 'No picture');
  const note = () => one('#tile-picture-note').textContent?.trim();
  /** The drop down of the kind of picture, beside the box. */
  const kindSelect = () => one<HTMLSelectElement>('#tile-kind');
  /** The kind of picture on show, as the drop down holds it. */
  const kindValue = () => kindSelect().value;
  const chosenPicture = () => one('.pictures label:has(input:checked)').textContent?.trim();

  /** Picks the choice of the list whose name is given. */
  async function pick(selector: string, name: string): Promise<void> {
    const found = Array.from(element.querySelectorAll<HTMLLabelElement>(selector)).find(
      (label) => label.textContent?.trim() === name,
    );
    const input = found?.querySelector('input');
    if (!input) {
      throw new Error(`There is no choice named "${String(name)}".`);
    }
    input.click();
    await fixture.whenStable();
  }

  const pickPicture = (name: string) => pick('.pictures label', name);

  /** Chooses Symbols or Icons in the drop down, as the browser does when an option is picked. */
  async function pickKind(name: 'Symbols' | 'Icons'): Promise<void> {
    const select = kindSelect();
    const option = Array.from(select.options).find((item) => item.textContent?.trim() === name);
    if (!option) {
      throw new Error(`The drop down has no option named "${name}".`);
    }
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
  }

  async function press(name: string): Promise<void> {
    const found = Array.from(element.querySelectorAll<HTMLButtonElement>('.actions button')).find(
      (candidate) => candidate.textContent?.trim() === name,
    );
    if (!found) {
      throw new Error(`There is no button named "${name}".`);
    }
    found.click();
    await fixture.whenStable();
  }

  /** Types a text into a field, as a paste does: the whole text arrives at once. */
  async function type(selector: string, text: string): Promise<HTMLInputElement> {
    const input = one<HTMLInputElement>(selector);
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    return input;
  }

  beforeEach(() => {
    localStorage.clear();
    restoreDialog = standInForDialog();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    restoreDialog();
    localStorage.clear();
  });

  it('TD1: Add Tile shows Label, Phrase, Colour and Picture, with a preview', async () => {
    await open({ kind: 'add-tile' });
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute('aria-labelledby')).toBe('tile-title');
    expect(title()).toBe('Add Tile');
    expect(fieldNames()).toEqual(['Label', 'Phrase', 'Colour', 'Picture']);
    // The preview and the fields that set the words and the look are on the left, and the Picture field is on the right.
    expect(texts('.side .field > label, .side legend')).toEqual(['Label', 'Phrase', 'Colour']);
    expect(texts('.fields legend')).toEqual(['Picture']);
    expect(one('.side .preview')).toBeTruthy();
    expect(one('.preview').hasAttribute('inert')).toBe(true);
    expect(one('.preview app-cell')).toBeTruthy();
    expect(previewLabel()).toBe('New tile');
    expect(chosen('tile-colour')).toBe('light');
    expect(chosen('tile-picture')).toBe('');
    expect(document.activeElement).toBe(one('#tile-label'));
  });

  it('TD2: the label Juice is typed, and the preview reads Juice', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-label', 'Juice');
    expect(previewLabel()).toBe('Juice');
  });

  it('TD3: dog is typed in Find a picture, and every picture in the list has dog in its name', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-find', 'dog');
    expect(kindValue()).toBe('symbol');
    const names = listed();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name?.toLowerCase()).toContain('dog');
    }
    expect(names[0]).toBe('dog');
  });

  it('TD4: Add with an empty label keeps the dialog open and says that a label is needed', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-label', '   ');
    await press('Add');
    const label = one('#tile-label');
    expect(dialog().open).toBe(true);
    expect(edit.dialog()).toEqual({ kind: 'add-tile' });
    expect(label.getAttribute('aria-invalid')).toBe('true');
    const line = one(`#${label.getAttribute('aria-describedby')}`);
    expect(line.textContent?.trim()).toBe('Give the tile a label.');
    expect(saved).toEqual([]);

    // The line goes when the caregiver types.
    await type('#tile-label', 'Juice');
    expect(label.hasAttribute('aria-invalid')).toBe(false);
    expect(element.querySelector('#tile-label-needed')).toBeNull();
  });

  it('TD5: a label of 25 characters is typed, and the field holds the first 24', async () => {
    await open({ kind: 'add-tile' });
    const input = await type('#tile-label', 'abcdefghijklmnopqrstuvwxy');
    expect(input.value).toBe('abcdefghijklmnopqrstuvwx');
    expect(input.getAttribute('maxlength')).toBe('24');
    expect(previewLabel()).toBe('abcdefghijklmnopqrstuvwx');
  });

  it('TD6: Add Board shows Name, Style, Colour and Picture, on Icons, with Grid first and chosen', async () => {
    await open({ kind: 'add-board' });
    expect(title()).toBe('Add Board');
    expect(fieldNames()).toEqual(['Name', 'Style', 'Colour', 'Picture']);
    expect(texts('.fields legend')).toEqual(['Picture']);
    expect(previewLabel()).toBe('New board');
    // Style is a drop down named by its label, with the three styles in their order.
    const style = one<HTMLSelectElement>('#tile-style');
    expect(style).toBeInstanceOf(HTMLSelectElement);
    expect(one('label[for="tile-style"]').textContent?.trim()).toBe('Style');
    expect(style.labels[0]?.textContent?.trim()).toBe('Style');
    expect(texts('#tile-style option')).toEqual([
      'Cropped Icon',
      'Icon in Circle',
      'Centered Icon',
    ]);
    expect(Array.from(style.options).map((item) => item.value)).toEqual([
      'bleed',
      'signage',
      'stage',
    ]);
    expect(style.value).toBe('bleed');
    expect(element.querySelector('input[name="tile-style"]')).toBeNull();
    expect(chosen('tile-colour')).toBe('dark');
    expect(kindValue()).toBe('icon');
    expect(pictures()[0]).toBe('Grid');
    expect(chosenPicture()).toBe('Grid');

    // Centered Icon is chosen in the drop down, and the preview draws the Stage style.
    style.value = 'stage';
    style.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(one('.preview .cell').classList).toContain('stage');
  });

  it('TD7: Edit Help shows the label, the phrase and the colour of Help, on Symbols with help first and chosen, and no type', async () => {
    await open({ kind: 'edit-tile', at: { group: 0, cell: 1 } });
    expect(title()).toBe('Edit Help');
    expect(one<HTMLInputElement>('#tile-label').value).toBe('Help');
    expect(one<HTMLInputElement>('#tile-phrase').value).toBe('I need help');
    expect(chosen('tile-colour')).toBe('light');
    expect(kindValue()).toBe('symbol');
    expect(listed()[0]).toBe('help');
    expect(chosenPicture()).toBe('help');
    expect(chosen('tile-picture')).toBe('symbol:help.svg');
    expect(element.textContent).not.toContain('Type');
    expect(texts('.actions button')).toEqual(['Cancel', 'Save']);
  });

  it('TD8: Cancel and Escape close the dialog with no change and give the focus back', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Add Tile';
    document.body.appendChild(opener);
    const data = TestBed.inject(BoardData);
    const before = data.set();

    opener.focus();
    await open({ kind: 'add-tile' });
    await type('#tile-label', 'Juice');
    await press('Cancel');
    expect(edit.dialog()).toBeNull();
    expect(dialog().open).toBe(false);
    expect(data.set()).toBe(before);
    expect(document.activeElement).toBe(opener);

    opener.focus();
    edit.open({ kind: 'add-tile' });
    await fixture.whenStable();
    expect(dialog().open).toBe(true);
    // A browser closes a modal dialog on Escape and then tells of it with a close event.
    dialog().close();
    await fixture.whenStable();
    expect(edit.dialog()).toBeNull();
    expect(data.set()).toBe(before);
    expect(document.activeElement).toBe(opener);
    expect(saved).toEqual([]);
    opener.remove();
  });

  it('TD9: Add Tile with an empty box lists No picture and 60 symbols, and Show more', async () => {
    await open({ kind: 'add-tile' });
    expect(pictures()[0]).toBe('No picture');
    expect(pictures().length).toBe(61);
    expect(element.querySelectorAll('.pictures img').length).toBe(60);
    expect(note()).toBe('');
    expect(element.textContent).not.toContain('Showing');
    expect(one('#tile-find').getAttribute('aria-label')).toBe('Find a picture');
    expect(texts('button.more')).toEqual(['Show more']);
    const image = one<HTMLImageElement>('.pictures img');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('width')).toBeTruthy();
    expect(image.getAttribute('height')).toBeTruthy();
  });

  it('TD10: after case TD9, Show more lists 120 symbols', async () => {
    await open({ kind: 'add-tile' });
    one<HTMLButtonElement>('button.more').click();
    await fixture.whenStable();
    expect(listed().length).toBe(120);
  });

  it('TD11: advent is typed, and the list holds the matches with no Show more', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-find', 'advent');
    const count = listed().length;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(60);
    expect(note()).toBe('');
    expect(element.querySelector('button.more')).toBeNull();
  });

  it('TD12: apple is typed and Icons is chosen in the drop down beside the box, and the box keeps apple', async () => {
    await open({ kind: 'add-tile' });
    // The kind of picture is a drop down on the row of the box, named for screen readers, with two
    // options and no number in them. The user changed it from two boxes on 2026-11-25.
    const select = kindSelect();
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(select.parentElement?.parentElement).toBe(one('#tile-find').parentElement);
    expect(select.getAttribute('aria-label')).toBe('Kind of picture');
    expect(select.getAttribute('aria-controls')).toBe('tile-pictures');
    expect(texts('#tile-kind option')).toEqual(['Symbols', 'Icons']);
    expect(Array.from(select.options).map((item) => item.value)).toEqual(['symbol', 'icon']);
    expect(element.querySelector('input[name="tile-picture-kind"]')).toBeNull();
    await type('#tile-find', 'apple');
    await pickKind('Icons');
    expect(kindValue()).toBe('icon');
    expect(one<HTMLInputElement>('#tile-find').value).toBe('apple');
    expect(listed()).toContain('apple');
  });

  it('TD13: the icon apple is picked in Add Tile, and the preview draws it and Add emits lucide:apple', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-label', 'Apple');
    await type('#tile-find', 'apple');
    await pickKind('Icons');
    await pickPicture('apple');
    expect(one('.preview .plate app-icon')).toBeTruthy();
    expect(element.querySelector('.preview .plate img')).toBeNull();
    await press('Add');
    expect(saved).toEqual([
      expect.objectContaining({ kind: 'speak', picture: { kind: 'icon', icon: 'lucide:apple' } }),
    ]);
  });

  it('TD14: in Add Board, Symbols is chosen and dog is picked, and the Style field goes', async () => {
    await open({ kind: 'add-board' });
    await type('#tile-label', 'Pets');
    await pickKind('Symbols');
    await type('#tile-find', 'dog');
    await pickPicture('dog');
    expect(fieldNames()).not.toContain('Style');
    expect(one<HTMLImageElement>('.preview img').getAttribute('src')).toBe('symbols/dog.svg');
    await press('Add');
    expect(saved).toEqual([
      expect.objectContaining({ kind: 'open', picture: { kind: 'symbol', symbol: 'dog.svg' } }),
    ]);
  });

  it('TD15: in Add Board, Icons is chosen again after case TD14, and the Style field is back', async () => {
    await open({ kind: 'add-board' });
    await pickKind('Symbols');
    await type('#tile-find', 'dog');
    await pickPicture('dog');
    expect(fieldNames()).not.toContain('Style');
    await pickKind('Icons');
    expect(fieldNames()).toContain('Style');
  });

  it('TD16: Edit Help with a text no symbol name holds lists No picture and help, chosen, and says so', async () => {
    await open({ kind: 'edit-tile', at: { group: 0, cell: 1 } });
    await type('#tile-find', 'zebra crossing sign');
    expect(pictures()).toEqual(['No picture', 'help']);
    expect(chosenPicture()).toBe('help');
    expect(note()).toBe('No symbol has that name.');
    expect(one('#tile-picture-note').getAttribute('aria-live')).toBe('polite');
  });

  it('TD17: No picture is picked after a symbol in Add Tile, and the preview shows the label alone', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-label', 'Juice');
    await type('#tile-find', 'drink');
    await pickPicture('drink');
    expect(element.querySelector('.preview img')).toBeTruthy();
    await pickPicture('No picture');
    expect(element.querySelector('.preview .plate')).toBeNull();
    expect(previewLabel()).toBe('Juice');
    await press('Add');
    expect(saved.length).toBe(1);
    expect(saved[0].picture).toBeUndefined();
  });

  it('TD18: Enter in Find a picture keeps the dialog open and emits nothing', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-label', 'Juice');
    const find = one<HTMLInputElement>('#tile-find');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    find.dispatchEvent(enter);
    await fixture.whenStable();
    expect(enter.defaultPrevented).toBe(true);
    expect(dialog().open).toBe(true);
    expect(edit.dialog()).toEqual({ kind: 'add-tile' });
    expect(saved).toEqual([]);
  });
});
