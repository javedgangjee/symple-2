import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BoardData } from '../boards/board-data';
import { BoardScreen } from '../boards/board-screen';
import { FakeVoiceSource } from '../speech/fake-voice-source';
import { VOICE_SOURCE } from '../speech/voice-source';
import { EditMode } from './edit-mode';
import { RemoveDialog } from './remove-dialog';
import { standInForDialog } from './dialog-stand-in';

@Component({ template: '' })
class Blank {}

describe('RemoveDialog', () => {
  let fixture: ComponentFixture<RemoveDialog> | ComponentFixture<BoardScreen>;
  let element: HTMLElement;
  let edit: EditMode;
  let confirmed: number;
  let restoreDialog: () => void;

  beforeEach(() => {
    localStorage.clear();
    restoreDialog = standInForDialog();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    restoreDialog();
    localStorage.clear();
  });

  it('RD1: Remove My boards on home names My boards and says that 9 boards and their cells go', async () => {
    const data = TestBed.inject(BoardData);
    const before = data.set();
    edit = TestBed.inject(EditMode);
    edit.start();
    edit.show('home');
    const drawn = TestBed.createComponent(RemoveDialog);
    fixture = drawn;
    document.body.appendChild(fixture.nativeElement);
    confirmed = 0;
    drawn.componentInstance.confirmed.subscribe(() => confirmed++);
    await fixture.whenStable();
    edit.open({ kind: 'remove', at: { group: 0, cell: 0 } });
    await fixture.whenStable();
    element = fixture.nativeElement;

    const dialog = element.querySelector('dialog');
    expect(dialog?.open).toBe(true);
    expect(element.querySelector('#remove-title')?.textContent?.trim()).toBe('Remove My boards?');
    expect(element.querySelector('#remove-text')?.textContent?.trim()).toMatch(
      /^9 boards and their \d+ cells will be removed\.$/,
    );
    const buttons = Array.from(element.querySelectorAll('button'));
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Cancel', 'Remove']);
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].click();
    await fixture.whenStable();
    expect(edit.dialog()).toBeNull();
    expect(dialog?.open).toBe(false);
    expect(data.set()).toBe(before);
    expect(confirmed).toBe(0);
  });

  it('RD2: Remove in that dialog removes My boards and the boards that only it reaches', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        { provide: VOICE_SOURCE, useValue: new FakeVoiceSource() },
      ],
    });
    const data = TestBed.inject(BoardData);
    edit = TestBed.inject(EditMode);
    edit.start();
    // The board screen holds the dialog and removes the cell when the dialog says yes.
    const screen = TestBed.createComponent(BoardScreen);
    fixture = screen;
    document.body.appendChild(screen.nativeElement);
    await screen.whenStable();
    element = screen.nativeElement;
    element.querySelector<HTMLElement>('[aria-label="Remove My boards"]')?.click();
    await screen.whenStable();
    expect(element.querySelector('app-remove-dialog dialog')?.hasAttribute('open')).toBe(true);
    expect(data.board('my-boards')).toBeDefined();

    const remove = Array.from(element.querySelectorAll('app-remove-dialog button')).find(
      (button) => button.textContent?.trim() === 'Remove',
    );
    remove?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await screen.whenStable();
    expect(edit.dialog()).toBeNull();
    for (const id of ['my-boards', 'food', 'drinks', 'feelings', 'people', 'places']) {
      expect(data.board(id), id).toBeUndefined();
    }
    expect(data.board('home')?.groups.map((group) => group.cells.length)).toEqual([1, 2]);
    expect(data.board('needs')).toBeDefined();
  });

  it('RD3: Remove Keyboards on home names Keyboards, a locked board, and says that 5 boards and their cells go', async () => {
    edit = TestBed.inject(EditMode);
    edit.start();
    edit.show('home');
    fixture = TestBed.createComponent(RemoveDialog);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    edit.open({ kind: 'remove', at: { group: 1, cell: 1 } });
    await fixture.whenStable();
    element = fixture.nativeElement;

    expect(element.querySelector('#remove-title')?.textContent?.trim()).toBe('Remove Keyboards?');
    expect(element.querySelector('#remove-text')?.textContent?.trim()).toMatch(
      /^5 boards and their \d+ cells will be removed\.$/,
    );
  });
});
