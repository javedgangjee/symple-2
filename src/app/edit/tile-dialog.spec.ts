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
  const fieldNames = () => [...texts('.field > label'), ...texts('legend')];
  const previewLabel = () => one('.preview .label').textContent?.trim();
  const chosen = (name: string) => one<HTMLInputElement>(`input[name="${name}"]:checked`).value;

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

  it('TD1: Add Tile shows Label, Phrase, Symbol and Colour, with a preview', async () => {
    await open({ kind: 'add-tile' });
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute('aria-labelledby')).toBe('tile-title');
    expect(title()).toBe('Add Tile');
    expect(fieldNames()).toEqual(['Label', 'Phrase', 'Symbol', 'Colour']);
    expect(one('.preview').hasAttribute('inert')).toBe(true);
    expect(one('.preview app-cell')).toBeTruthy();
    expect(previewLabel()).toBe('New tile');
    expect(chosen('tile-colour')).toBe('light');
    expect(chosen('tile-symbol')).toBe('');
    expect(document.activeElement).toBe(one('#tile-label'));
  });

  it('TD2: the label Juice is typed, and the preview reads Juice', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-label', 'Juice');
    expect(previewLabel()).toBe('Juice');
  });

  it('TD3: dri is typed in the filter, and the list holds only the symbols with dri in their name', async () => {
    await open({ kind: 'add-tile' });
    await type('#tile-find', 'dri');
    expect(texts('.symbols label')).toEqual(['No symbol', 'cold drink', 'drink', 'hot drink']);
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

  it('TD6: Add Board shows Name, Style, Colour and Icon, and no icon of a key or a control', async () => {
    await open({ kind: 'add-board' });
    expect(title()).toBe('Add Board');
    expect(fieldNames()).toEqual(['Name', 'Style', 'Colour', 'Icon']);
    expect(previewLabel()).toBe('New board');
    expect(chosen('tile-style')).toBe('bleed');
    expect(chosen('tile-colour')).toBe('dark');
    expect(chosen('tile-icon')).toBe('board');
    const icons = Array.from(
      element.querySelectorAll<HTMLInputElement>('input[name="tile-icon"]'),
      (input) => input.value,
    );
    expect(icons.length).toBeGreaterThan(0);
    for (const control of ['back', 'backspace', 'caps', 'trash', 'check', 'cross']) {
      expect(icons).not.toContain(control);
    }
  });

  it('TD7: Edit Help shows the label, the phrase, the symbol and the colour of Help, and no type', async () => {
    await open({ kind: 'edit-tile', at: { group: 0, cell: 1 } });
    expect(title()).toBe('Edit Help');
    expect(one<HTMLInputElement>('#tile-label').value).toBe('Help');
    expect(one<HTMLInputElement>('#tile-phrase').value).toBe('I need help');
    expect(chosen('tile-symbol')).toBe('help.svg');
    expect(chosen('tile-colour')).toBe('light');
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
});
