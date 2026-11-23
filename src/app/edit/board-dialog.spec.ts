import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BoardData } from '../boards/board-data';
import { BoardScreen } from '../boards/board-screen';
import { FakeVoiceSource } from '../speech/fake-voice-source';
import { VOICE_SOURCE } from '../speech/voice-source';
import { EditMode } from './edit-mode';
import { BoardDialog } from './board-dialog';
import { standInForDialog } from './dialog-stand-in';

@Component({ template: '' })
class Blank {}

describe('BoardDialog', () => {
  let fixture: ComponentFixture<BoardDialog> | ComponentFixture<BoardScreen>;
  let element: HTMLElement;
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

  it('BG1: Board settings over Needs shows the title Needs and the layout Columns as chosen', async () => {
    const edit = TestBed.inject(EditMode);
    edit.start();
    edit.show('needs');
    fixture = TestBed.createComponent(BoardDialog);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    edit.open({ kind: 'board' });
    await fixture.whenStable();
    element = fixture.nativeElement;

    expect(element.querySelector('dialog')?.open).toBe(true);
    expect(element.querySelector('#board-settings-title')?.textContent?.trim()).toBe(
      'Board settings',
    );
    const title = element.querySelector<HTMLInputElement>('#board-title');
    expect(title?.value).toBe('Needs');
    expect(document.activeElement).toBe(title);
    expect(element.querySelector('legend')?.textContent?.trim()).toBe('Layout');
    const chosen = element.querySelector<HTMLInputElement>('input[name="board-layout"]:checked');
    expect(chosen?.value).toBe('columns');
    expect(chosen?.parentElement?.textContent?.trim()).toBe('Columns');
  });

  it('BG2: Rows and then Save give the board the rows layout, which the grid carries', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        { provide: VOICE_SOURCE, useValue: new FakeVoiceSource() },
      ],
    });
    const edit = TestBed.inject(EditMode);
    edit.start();
    // The board screen holds the dialog and gives the board its layout when the dialog is saved.
    const screen = TestBed.createComponent(BoardScreen);
    fixture = screen;
    screen.componentRef.setInput('id', 'needs');
    document.body.appendChild(screen.nativeElement);
    await screen.whenStable();
    element = screen.nativeElement;
    const layoutOfGrid = () => element.querySelector('.grid')?.getAttribute('data-layout');
    expect(layoutOfGrid()).toBe('columns');

    edit.open({ kind: 'board' });
    await screen.whenStable();
    element.querySelector<HTMLInputElement>('input[name="board-layout"][value="rows"]')?.click();
    await screen.whenStable();
    element
      .querySelector('app-board-dialog form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await screen.whenStable();

    expect(edit.dialog()).toBeNull();
    expect(TestBed.inject(BoardData).board('needs')?.layout).toBe('rows');
    expect(layoutOfGrid()).toBe('rows');
  });
});
