import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { standInForDialog } from '../edit/dialog-stand-in';
import { EditMode } from '../edit/edit-mode';
import { Room } from '../edit/room';
import { Message } from '../keyboard/message';
import { Scan } from '../scan/scan';
import { ScanSettingValues, ScanSettings } from '../scan/scan-settings';
import { SettingsOpen } from '../settings/settings-open';
import { FakeVoiceSource } from '../speech/fake-voice-source';
import { VOICE_SOURCE } from '../speech/voice-source';
import { Back } from './back';
import { addGroup, removeCell, setBoard } from '../edit/board-edits';
import { EditActions } from '../edit/edit-actions';
import { Board, BoardData, Cell, CellSize, Tile } from './board-data';
import { BoardScreen } from './board-screen';

@Component({ template: '' })
class Blank {}

/** A plain tile with a label and, if given, an action. */
function tile(label: string, action?: Tile['action']): Tile {
  return {
    id: label.toLowerCase(),
    label,
    colour: 'light',
    style: 'key',
    ...(action && { action }),
  };
}

function cell(label: string, size?: CellSize, action?: Tile['action']): Cell {
  return { tile: tile(label, action), ...(size !== undefined && { size }) };
}

const MESSAGE_TILE: Tile = { id: 'message', label: 'Message', colour: 'light', style: 'message' };

/** The message tile as the data has it, with the action that speaks the message. */
const SPEAKING_MESSAGE_TILE: Tile = { ...MESSAGE_TILE, action: { type: 'speak-message' } };

describe('BoardScreen', () => {
  let fixture: ComponentFixture<BoardScreen>;
  let element: HTMLElement;
  /** The fake voice of the screen that was drawn last. No test speaks aloud. */
  let voice: FakeVoiceSource;
  const back = { back: vi.fn(() => Promise.resolve(true)) };

  /**
   * Draws the screen with one board of test data in place of the board service.
   * The scan settings are used as if they had been stored.
   */
  async function draw(
    board: Omit<Board, 'id' | 'title'>,
    others: Board[] = [],
    settings: Partial<ScanSettingValues> = {},
  ): Promise<void> {
    const boards: Board[] = [{ id: 'test', title: 'Test', ...board }, ...others];
    voice = new FakeVoiceSource();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'board/:id', component: Blank }]),
        {
          provide: BoardData,
          useValue: { board: (id: string) => boards.find((b) => b.id === id) },
        },
        { provide: Back, useValue: back },
        { provide: VOICE_SOURCE, useValue: voice },
      ],
    });
    TestBed.inject(ScanSettings).set(settings);
    fixture = TestBed.createComponent(BoardScreen);
    fixture.componentRef.setInput('id', 'test');
    await fixture.whenStable();
    element = fixture.nativeElement;
  }

  const groups = () => Array.from(element.querySelectorAll('.group'));
  const buttons = (within: Element = element) => Array.from(within.querySelectorAll('button'));
  const names = (within: Element = element) =>
    buttons(within).map((button) => button.getAttribute('aria-label'));
  const shares = () =>
    Array.from(element.querySelectorAll<HTMLElement>('.slot')).map((slot) =>
      Number(slot.style.flexGrow),
    );
  const status = () => element.querySelector('[role="status"]')?.textContent?.trim();
  const layoutOfGrid = () => element.querySelector('.grid')?.getAttribute('data-layout');

  async function press(name: string): Promise<void> {
    const button = buttons().find((candidate) => candidate.getAttribute('aria-label') === name);
    if (!button) {
      throw new Error(`There is no button named "${name}".`);
    }
    button.click();
    await fixture.whenStable();
  }

  beforeEach(() => {
    back.back.mockClear();
    localStorage.clear();
  });

  it('S1: draws the groups and the cells in the order of the data', async () => {
    await draw({ groups: [{ cells: [cell('A'), cell('B')] }, { cells: [cell('C')] }] });
    expect(groups().length).toBe(2);
    expect(names()).toEqual(['A', 'B', 'C']);
    expect(names(groups()[0])).toEqual(['A', 'B']);
  });

  it('S2: draws one group with one button', async () => {
    await draw({ groups: [{ cells: [cell('X')] }] });
    expect(groups().length).toBe(1);
    expect(names()).toEqual(['X']);
  });

  it('S3: a board that gives no layout is drawn in columns', async () => {
    await draw({ groups: [{ cells: [cell('X')] }] });
    expect(layoutOfGrid()).toBe('columns');
  });

  it('S4: a cell with no size counts as medium beside a large cell', async () => {
    await draw({ groups: [{ cells: [cell('A', 'large'), cell('B')] }] });
    expect(shares()).toEqual([5, 4]);
  });

  it('S5: cells with no size all have the same share', async () => {
    await draw({
      groups: [{ cells: [cell('A'), cell('B')] }, { cells: [cell('C')] }, { cells: [cell('D')] }],
    });
    expect(groups().length).toBe(3);
    expect(new Set(shares()).size).toBe(1);
  });

  it('S6: an empty group is drawn with no cell, and its only control is the Add Tile button', async () => {
    await draw({ groups: [{ cells: [cell('A')] }, { cells: [] }] });
    expect(groups().length).toBe(2);
    expect(element.querySelectorAll('app-cell').length).toBe(1);
    const controls = groups()[1].querySelectorAll('button, a, input, select, textarea');
    expect(Array.from(controls, (control) => control.textContent?.trim())).toEqual(['Add Tile']);
  });

  it('S7: a board with no groups is drawn with no cell, and its only control is the Add Tile button', async () => {
    await draw({ groups: [] });
    expect(groups().length).toBe(0);
    expect(element.querySelectorAll('app-cell').length).toBe(0);
    expect(buttons().map((button) => button.textContent?.trim())).toEqual(['Add Tile']);
  });

  it('S8: a tile that speaks writes its phrase to the status region and does not change', async () => {
    await draw({
      groups: [{ cells: [cell('Help', undefined, { type: 'speak', phrase: 'I need help' })] }],
    });
    const before = buttons()[0].className;
    const url = TestBed.inject(Router).url;
    await press('Help');
    expect(status()).toBe('I need help');
    expect(buttons()[0].className).toBe(before);
    expect(TestBed.inject(Router).url).toBe(url);
    expect(names()).toEqual(['Help']);
  });

  it('S17: a phrase that is picked twice changes the status region twice', async () => {
    await draw({
      groups: [{ cells: [cell('Help', undefined, { type: 'speak', phrase: 'I need help' })] }],
    });
    const said = () => element.querySelector('[role="status"] span');
    const atFirst = said();
    await press('Help');
    const afterOne = said();
    expect(afterOne).not.toBe(atFirst);
    expect(status()).toBe('I need help');
    await press('Help');
    expect(said()).not.toBe(afterOne);
    expect(status()).toBe('I need help');
  });

  it('S18: a second board gets cells of its own and keeps none of the first', async () => {
    const second: Board = {
      id: 'second',
      title: 'Second',
      groups: [{ cells: [cell('C'), cell('D')] }, { cells: [cell('E')] }],
    };
    await draw({ groups: [{ cells: [cell('A'), cell('B')] }, { cells: [cell('F')] }] }, [second]);
    const before = [...groups(), ...buttons()];
    fixture.componentRef.setInput('id', 'second');
    await fixture.whenStable();
    expect(names()).toEqual(['C', 'D', 'E']);
    const after = [...groups(), ...buttons()];
    expect(after.filter((item) => before.includes(item))).toEqual([]);
  });

  it('S9: a tile that opens a board goes to that board', async () => {
    await draw({
      groups: [{ cells: [cell('Food', undefined, { type: 'open', board: 'food' })] }],
    });
    await press('Food');
    expect(TestBed.inject(Router).url).toBe('/board/food');
  });

  it('S10: a tile with no action does nothing', async () => {
    await draw({ groups: [{ cells: [cell('Plain')] }] });
    const url = TestBed.inject(Router).url;
    await press('Plain');
    expect(status()).toBe('');
    expect(TestBed.inject(Router).url).toBe(url);
    expect(back.back).not.toHaveBeenCalled();
  });

  it('S11: the Back tile asks the way back to go back once', async () => {
    await draw({ groups: [{ cells: [cell('Back', undefined, { type: 'back' })] }] });
    await press('Back');
    expect(back.back).toHaveBeenCalledTimes(1);
  });

  it('S12: a board that gives a layout is drawn that way', async () => {
    await draw({ layout: 'rows', groups: [{ cells: [cell('X')] }] });
    expect(layoutOfGrid()).toBe('rows');
  });

  it('S13: number sizes and named sizes are one scale', async () => {
    await draw({
      groups: [{ cells: [cell('A', 2), cell('B', 6), cell('C', 'small'), cell('D')] }],
    });
    expect(shares()).toEqual([2, 6, 3, 4]);
  });

  it('S14: a tile that types adds to the message and the status region', async () => {
    await draw({ groups: [{ cells: [cell('a', undefined, { type: 'type', text: 'a' })] }] });
    await press('a');
    await press('a');
    expect(TestBed.inject(Message).text()).toBe('aa');
    expect(status()).toBe('aa');
  });

  it('S15: Backspace and Clear change the message and the status region', async () => {
    await draw({
      groups: [
        {
          cells: [
            cell('Backspace', undefined, { type: 'backspace' }),
            cell('Clear', undefined, { type: 'clear' }),
          ],
        },
      ],
    });
    const message = TestBed.inject(Message);
    message.type('aa');
    await press('Backspace');
    expect(message.text()).toBe('a');
    expect(status()).toBe('a');
    await press('Clear');
    expect(message.text()).toBe('');
    expect(status()).toBe('');
  });

  it('S16: a message tile with no action does nothing when pressed', async () => {
    await draw({ groups: [{ cells: [{ tile: MESSAGE_TILE }] }] });
    const message = TestBed.inject(Message);
    message.type('hi');
    await fixture.whenStable();
    const url = TestBed.inject(Router).url;
    await press('hi');
    expect(message.text()).toBe('hi');
    expect(status()).toBe('');
    expect(TestBed.inject(Router).url).toBe(url);
    expect(back.back).not.toHaveBeenCalled();
  });

  describe('with the scan', () => {
    const opens = (label: string, board: string) => cell(label, undefined, { type: 'open', board });
    const says = (phrase: string) => cell(phrase, undefined, { type: 'speak', phrase });

    /** Two groups of two cells that each open a board, as the home board has. */
    const HOME = {
      groups: [
        { cells: [opens('My boards', 'my-boards'), opens('Needs', 'needs')] },
        { cells: [opens('Quick phrases', 'quick-phrases'), opens('Keyboards', 'keyboards')] },
      ],
    };

    const grid = () => element.querySelector<HTMLElement>('.grid');
    const scanState = () => grid()?.getAttribute('data-state');
    const labels = (selector: string) =>
      Array.from(element.querySelectorAll(selector)).map((item) => item.getAttribute('aria-label'));
    /** The names of the cells that carry an attribute. */
    const cellsWith = (attribute: string) => labels(`app-cell[${attribute}] button`);
    const groupsWith = (attribute: string) => labels(`.group[${attribute}]`);
    const host = (name: string) => {
      const found = buttons().find((button) => button.getAttribute('aria-label') === name);
      const cellHost = found?.closest('app-cell');
      if (!cellHost) {
        throw new Error(`There is no cell named "${name}".`);
      }
      return cellHost;
    };

    /**
     * Draws the home board with a scan time of 1000 ms and a post click delay of 500 ms.
     * The clock is faked after the first draw, so each test moves the time itself.
     */
    async function drawWithScan(
      settings: Partial<ScanSettingValues> = {},
      board: Omit<Board, 'id' | 'title'> = HOME,
    ): Promise<void> {
      await draw(board, [], { scanTime: 1000, postClickDelay: 500, dwellTime: 1000, ...settings });
      vi.useFakeTimers();
    }

    /** Presses a switch key, as a switch box does, and draws the result. */
    function switchKey(key: 'Enter' | 'Tab'): void {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
    }

    function pass(ms: number): void {
      vi.advanceTimersByTime(ms);
      fixture.detectChanges();
    }

    function pointerEnters(name: string, pointerType: string): void {
      host(name).dispatchEvent(new PointerEvent('pointerenter', { pointerType }));
      fixture.detectChanges();
    }

    /** Waits for the router, which works in promises that the faked clock does not hold up. */
    async function expectUrl(url: string): Promise<void> {
      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe(url));
    }

    afterEach(() => {
      fixture.destroy();
      vi.useRealTimers();
    });

    it('R1: the grid is at rest and nothing is highlighted before a press', async () => {
      await drawWithScan();
      expect(scanState()).toBe('rest');
      expect(groupsWith('data-scan')).toEqual([]);
      expect(cellsWith('data-scan')).toEqual([]);
    });

    it('R2: one press highlights the first group, which holds the focus and has a name', async () => {
      await drawWithScan();
      switchKey('Enter');
      expect(scanState()).toBe('groups');
      expect(groupsWith('data-scan')).toEqual(['Column 1 of 2']);
      expect(cellsWith('data-scan')).toEqual([]);
      expect(document.activeElement).toBe(groups()[0]);
      expect(groups()[0].getAttribute('tabindex')).toBe('-1');
    });

    it('R3: a second press goes into the cells, and the highlight moves after the scan time', async () => {
      await drawWithScan();
      switchKey('Enter');
      switchKey('Enter');
      pass(1000);
      expect(scanState()).toBe('cells');
      expect(cellsWith('data-scan')).toEqual(['Needs']);
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Needs');
    });

    it('R4: a press on a highlighted cell runs its action', async () => {
      await drawWithScan();
      switchKey('Enter');
      switchKey('Enter');
      pass(1000);
      switchKey('Enter');
      await expectUrl('/board/needs');
    });

    it('R5: a picked phrase is told, and its cell is marked as confirmed', async () => {
      await drawWithScan(
        {},
        {
          groups: [
            { cells: [says('Hello'), says('How are you?')] },
            { cells: [says('I love you'), says('See you later')] },
          ],
        },
      );
      const url = TestBed.inject(Router).url;
      switchKey('Enter');
      switchKey('Enter');
      switchKey('Enter');
      expect(status()).toBe('Hello');
      expect(scanState()).toBe('confirmed');
      expect(cellsWith('data-confirmed')).toEqual(['Hello']);
      expect(names()).toEqual(['Hello', 'How are you?', 'I love you', 'See you later']);
      expect(TestBed.inject(Router).url).toBe(url);
    });

    it('R6: a pointer press runs the action and sends the scan to rest with nothing in focus', async () => {
      await drawWithScan();
      switchKey('Enter');
      const keyboards = host('Keyboards').querySelector('button');
      // A browser gives the focus to a button that is pressed with a pointer.
      keyboards?.focus();
      keyboards?.click();
      fixture.detectChanges();
      expect(scanState()).toBe('rest');
      expect(groupsWith('data-scan')).toEqual([]);
      expect(grid()?.contains(document.activeElement)).toBe(false);
      await expectUrl('/board/keyboards');
    });

    it('R16: a change of the selection mode sends the scan to rest with nothing in focus', async () => {
      await drawWithScan();
      switchKey('Enter');
      expect(groupsWith('data-scan')).toEqual(['Column 1 of 2']);
      TestBed.inject(ScanSettings).set({ selectionMode: 'touch' });
      TestBed.tick();
      fixture.detectChanges();
      expect(scanState()).toBe('rest');
      expect(groupsWith('data-scan')).toEqual([]);
      expect(cellsWith('data-scan')).toEqual([]);
      expect(grid()?.contains(document.activeElement)).toBe(false);
    });

    it('R7: in the rows layout the groups are the rows', async () => {
      await drawWithScan({}, { ...HOME, layout: 'rows' });
      switchKey('Enter');
      expect(groupsWith('data-scan')).toEqual(['Row 1 of 2']);
    });

    it('R13: in scan mode nothing shows the bar and no room is kept for it by default', async () => {
      await drawWithScan({ selectionMode: 'scan' });
      expect(grid()?.hasAttribute('data-bar-room')).toBe(false);
      switchKey('Enter');
      expect(groupsWith('data-scan')).toEqual(['Column 1 of 2']);
      expect(groupsWith('data-scan-bar')).toEqual([]);
      switchKey('Enter');
      expect(cellsWith('data-scan')).toEqual(['My boards']);
      expect(cellsWith('data-scan-bar')).toEqual([]);
    });

    it('R11: with the progress bar shown the highlight shows the bar, and the grid carries the scan time', async () => {
      await drawWithScan({ selectionMode: 'scan', showProgressBar: true });
      expect(grid()?.hasAttribute('data-bar-room')).toBe(true);
      expect(grid()?.style.getPropertyValue('--scan-time')).toBe('1000ms');
      switchKey('Enter');
      expect(groupsWith('data-scan-bar')).toEqual(['Column 1 of 2']);
      expect(cellsWith('data-scan-bar')).toEqual([]);
      switchKey('Enter');
      expect(groupsWith('data-scan-bar')).toEqual([]);
      expect(cellsWith('data-scan-bar')).toEqual(['My boards']);
    });

    it('R12: in step mode nothing shows the bar', async () => {
      await drawWithScan({ selectionMode: 'step', showProgressBar: true });
      expect(grid()?.hasAttribute('data-bar-room')).toBe(false);
      switchKey('Tab');
      expect(groupsWith('data-scan')).toEqual(['Column 1 of 2']);
      expect(groupsWith('data-scan-bar')).toEqual([]);
      expect(cellsWith('data-scan-bar')).toEqual([]);
    });

    it('R8: in dwell mode the cell under the mouse pointer is marked, and the grid carries the style and the time', async () => {
      await drawWithScan({ selectionMode: 'dwell', dwellStyle: 'bar' });
      pointerEnters('Needs', 'mouse');
      expect(cellsWith('data-dwell')).toEqual(['Needs']);
      expect(grid()?.getAttribute('data-dwell-style')).toBe('bar');
      expect(grid()?.style.getPropertyValue('--dwell-time')).toBe('1000ms');
    });

    it('R9: the cell is pressed when the dwell time ends', async () => {
      await drawWithScan({ selectionMode: 'dwell', dwellStyle: 'bar' });
      pointerEnters('Needs', 'mouse');
      pass(1000);
      await expectUrl('/board/needs');
    });

    /** Moves a pointer over the page, to a place in the window. */
    function pointerMoves(x: number, y: number, pointerType = 'mouse'): void {
      document.body.dispatchEvent(
        new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType, bubbles: true }),
      );
      fixture.detectChanges();
    }

    const cursor = () => element.querySelector<HTMLElement>('.cursor');

    it('R14: in cursor mode a round cursor follows the pointer over the page', async () => {
      await drawWithScan({ selectionMode: 'cursor' });
      expect(cursor()).toBeNull();
      pointerMoves(120, 80);
      expect(cursor()?.style.left).toBe('120px');
      expect(cursor()?.style.top).toBe('80px');
      expect(cursor()?.getAttribute('aria-hidden')).toBe('true');
      pointerMoves(300, 210);
      expect(cursor()?.style.left).toBe('300px');
      expect(cursor()?.style.top).toBe('210px');
      expect(document.documentElement.hasAttribute('data-cursor')).toBe(true);
      document.dispatchEvent(new PointerEvent('pointerleave'));
      fixture.detectChanges();
      expect(cursor()).toBeNull();
    });

    it('R15: no cursor is drawn for a finger, or in the other selection modes', async () => {
      await drawWithScan({ selectionMode: 'cursor' });
      pointerMoves(120, 80, 'touch');
      expect(cursor()).toBeNull();
      pointerMoves(120, 80);
      expect(cursor()).not.toBeNull();
      for (const selectionMode of ['scan', 'step', 'touch', 'dwell'] as const) {
        TestBed.inject(ScanSettings).set({ selectionMode });
        pointerMoves(200, 90);
        expect(cursor(), selectionMode).toBeNull();
        expect(document.documentElement.hasAttribute('data-cursor'), selectionMode).toBe(false);
      }
    });

    it('PB6: no round cursor is drawn while the settings panel is open', async () => {
      await drawWithScan({ selectionMode: 'cursor' });
      const panel = TestBed.inject(SettingsOpen);
      pointerMoves(120, 80);
      expect(cursor()).not.toBeNull();
      panel.open();
      fixture.detectChanges();
      expect(cursor()).toBeNull();
      expect(document.documentElement.hasAttribute('data-cursor')).toBe(false);
      panel.close();
      fixture.detectChanges();
      expect(cursor()).not.toBeNull();
      expect(document.documentElement.hasAttribute('data-cursor')).toBe(true);
    });

    it('R10: a pointer of the touch kind starts no dwell', async () => {
      await drawWithScan({ selectionMode: 'dwell' });
      const url = TestBed.inject(Router).url;
      pointerEnters('Needs', 'touch');
      expect(cellsWith('data-dwell')).toEqual([]);
      pass(5000);
      expect(cellsWith('data-dwell')).toEqual([]);
      expect(TestBed.inject(Router).url).toBe(url);
    });

    const speaks = (label: string, phrase: string) =>
      cell(label, undefined, { type: 'speak', phrase });
    const types = (text: string) => cell(text, undefined, { type: 'type', text });

    /** Two phrase cells in one group and Back in a group of its own, as a small Needs board. */
    const NEEDS = {
      groups: [
        { cells: [speaks('Help', 'I need help'), speaks('Pain', 'I am in pain')] },
        { cells: [cell('Back', undefined, { type: 'back' })] },
      ],
    };

    /** Picks Help on the small Needs board with one switch, from rest or from the first group. */
    function pickHelp(): void {
      if (scanState() === 'rest') {
        switchKey('Enter');
      }
      switchKey('Enter');
      switchKey('Enter');
    }

    it('BS1: a phrase that the scan picks is spoken, told and marked as confirmed', async () => {
      await drawWithScan({}, NEEDS);
      pickHelp();
      expect(voice.texts).toEqual(['I need help']);
      expect(status()).toBe('I need help');
      expect(cellsWith('data-confirmed')).toEqual(['Help']);
    });

    it('BS2: the scan starts again after the post click delay while the speech still runs', async () => {
      await drawWithScan({}, NEEDS);
      pickHelp();
      pass(500);
      expect(voice.speaking).toBe(true);
      expect(cellsWith('data-confirmed')).toEqual([]);
      expect(groupsWith('data-scan')).toEqual(['Column 1 of 2']);
    });

    it('BS4: a second phrase stops the first one that still speaks', async () => {
      await drawWithScan({}, NEEDS);
      pickHelp();
      const before = voice.calls.length;
      pass(500);
      // The scan is on the first group again. It goes into the group and on to Pain.
      switchKey('Enter');
      pass(1000);
      switchKey('Enter');
      expect(voice.calls.slice(before)).toEqual([
        { kind: 'stop' },
        { kind: 'speak', text: 'I am in pain' },
      ]);
    });

    it('BS5: Back opens the home board and does not stop the speech', async () => {
      await drawWithScan({}, NEEDS);
      // The way back is a stand-in here, so it opens the home board itself.
      back.back.mockImplementationOnce(() => TestBed.inject(Router).navigate(['/board', 'home']));
      pickHelp();
      const stops = voice.stops;
      pass(500);
      // The scan moves on to the group of Back, which has one cell, so one press picks it.
      pass(1000);
      switchKey('Enter');
      expect(back.back).toHaveBeenCalledTimes(1);
      await expectUrl('/board/home');
      expect(voice.stops).toBe(stops);
      expect(voice.speaking).toBe(true);
    });

    it('BS6: the message is spoken when it is picked, and it stays as it is', async () => {
      await drawWithScan(
        { selectionMode: 'touch' },
        { groups: [{ cells: [{ tile: SPEAKING_MESSAGE_TILE }, types('h'), types('i')] }] },
      );
      for (const name of ['h', 'i', 'hi']) {
        host(name).querySelector('button')?.click();
        fixture.detectChanges();
      }
      expect(voice.texts).toEqual(['hi']);
      expect(TestBed.inject(Message).text()).toBe('hi');
    });

    it('BS7: an empty message is not spoken, and its cell is marked as confirmed', async () => {
      await drawWithScan(
        {},
        { groups: [{ cells: [{ tile: SPEAKING_MESSAGE_TILE }, types('h')] }] },
      );
      // The board has one group, so the scan starts on the message.
      switchKey('Enter');
      switchKey('Enter');
      expect(voice.calls).toEqual([]);
      expect(cellsWith('data-confirmed')).toEqual(['Message']);
    });

    describe('BS8: a pick speaks in the other selection modes', () => {
      it('in step mode, by a move and a press', async () => {
        await drawWithScan({ selectionMode: 'step' }, NEEDS);
        switchKey('Tab');
        switchKey('Enter');
        switchKey('Enter');
        expect(voice.texts).toEqual(['I need help']);
      });

      it('in touch mode, by a pointer press', async () => {
        await drawWithScan({ selectionMode: 'touch' }, NEEDS);
        host('Help').querySelector('button')?.click();
        fixture.detectChanges();
        expect(voice.texts).toEqual(['I need help']);
      });

      it('in dwell mode, by a dwell', async () => {
        await drawWithScan({ selectionMode: 'dwell' }, NEEDS);
        pointerEnters('Help', 'mouse');
        pass(1000);
        expect(voice.texts).toEqual(['I need help']);
      });
    });
  });

  describe('in edit mode', () => {
    let edit: EditMode;
    let data: BoardData;
    let restoreDialog: () => void;

    /**
     * Draws a board of the built-in set, in edit mode unless a case says otherwise. `before`
     * changes the set first. The screen is put on the page, so its buttons can take the focus.
     */
    async function drawBoard(
      id: string,
      { editing = true, before = () => undefined }: { editing?: boolean; before?: () => void } = {},
    ): Promise<void> {
      voice = new FakeVoiceSource();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: '**', component: Blank }]),
          { provide: Back, useValue: back },
          { provide: VOICE_SOURCE, useValue: voice },
        ],
      });
      edit = TestBed.inject(EditMode);
      data = TestBed.inject(BoardData);
      before();
      if (editing) {
        edit.start();
      }
      fixture = TestBed.createComponent(BoardScreen);
      fixture.componentRef.setInput('id', id);
      document.body.appendChild(fixture.nativeElement);
      await fixture.whenStable();
      element = fixture.nativeElement;
    }

    const tools = () => Array.from(element.querySelectorAll('.tool'));
    const toolNames = (within: Element = element) =>
      Array.from(within.querySelectorAll('.tool'), (tool) => tool.getAttribute('aria-label'));
    /** The names of the cells of each group, in the order of the page. */
    const cellOrder = () =>
      groups().map((group) =>
        Array.from(group.querySelectorAll('app-cell button'), (button) =>
          button.getAttribute('aria-label'),
        ),
      );
    const texts = (within: Element) =>
      Array.from(within.querySelectorAll('button'), (button) => button.textContent?.trim());
    const focused = () => document.activeElement?.getAttribute('aria-label');

    function named(name: string): HTMLElement {
      const found = buttons().find((button) => button.getAttribute('aria-label') === name);
      if (!found) {
        throw new Error(`There is no button named "${name}".`);
      }
      return found;
    }

    /** The slot of a cell, which takes the presses on the cell in edit mode. */
    function slotOf(name: string): HTMLElement {
      const slot = named(name).closest<HTMLElement>('.slot');
      if (!slot) {
        throw new Error(`The cell "${name}" lies in no slot.`);
      }
      return slot;
    }

    async function pressCell(name: string): Promise<void> {
      slotOf(name).click();
      await fixture.whenStable();
    }

    async function key(target: EventTarget, name: string): Promise<void> {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();
    }

    beforeEach(() => {
      restoreDialog = standInForDialog();
    });

    afterEach(() => {
      fixture.nativeElement.remove();
      restoreDialog();
      localStorage.clear();
    });

    it('ES1: each cell but Back has an Edit and a Remove button with its label, and no cell can be pressed', async () => {
      await drawBoard('needs');
      const labels = cellOrder()
        .flat()
        .filter((label) => label !== 'Back');
      expect(labels.length).toBe(12);
      for (const label of labels) {
        expect(toolNames(slotOf(label ?? ''))).toEqual([`Edit ${label}`, `Remove ${label}`]);
      }
      // A cell that is inert takes no press and no focus in a browser.
      const hosts = Array.from(element.querySelectorAll('.grid app-cell'));
      expect(hosts.every((host) => host.hasAttribute('inert'))).toBe(true);
      await press('Help');
      expect(voice.texts).toEqual([]);
    });

    it('ES2: out of edit mode the screen has no edit button', async () => {
      await drawBoard('needs', { editing: false });
      expect(tools()).toEqual([]);
      expect(element.querySelector('app-cell[inert]')).toBeNull();
    });

    it('ES3: the cell My boards has an Open button, which opens that board with edit mode still on', async () => {
      await drawBoard('home');
      await press('Open My boards');
      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/board/my-boards'));
      expect(edit.isOn()).toBe(true);
    });

    it('ES4: the Back cell has Go back, and no Edit or Remove button', async () => {
      await drawBoard('needs');
      expect(toolNames(slotOf('Back'))).toEqual(['Go back']);
    });

    it('ES5: Remove Help removes the cell, tells of it and puts the focus on the Remove button of the next cell', async () => {
      await drawBoard('needs');
      await press('Remove Help');
      expect(cellOrder()[0]).toEqual(['Back', 'Pain', 'Toilet', 'Drink']);
      expect(status()).toBe('Help removed');
      expect(focused()).toBe('Remove Pain');
    });

    it('ES6: the cell Keyboards, which opens a locked board, has no Remove button', async () => {
      await drawBoard('home');
      expect(toolNames(slotOf('Keyboards'))).toEqual(['Edit Keyboards']);
      expect(toolNames(slotOf('Needs'))).toContain('Remove Needs');
    });

    it('ES7: out of edit mode an empty group shows an Add Tile button, which turns edit mode on and opens the tile dialog', async () => {
      await drawBoard('needs', {
        editing: false,
        before: () => data.change((set) => addGroup(set, 'needs')),
      });
      const add = groups()[3].querySelector('button');
      expect(texts(groups()[3])).toEqual(['Add Tile']);
      expect(add?.hasAttribute('data-caregiver-control')).toBe(true);
      expect(add?.tabIndex).toBe(-1);
      add?.click();
      await fixture.whenStable();
      expect(edit.isOn()).toBe(true);
      expect(edit.dialog()).toEqual({ kind: 'add-tile', group: 3 });
      expect(element.querySelector('app-tile-dialog dialog')?.hasAttribute('open')).toBe(true);
    });

    it('ES8: in edit mode an empty group shows Add Tile and Remove column', async () => {
      await drawBoard('needs', { before: () => data.change((set) => addGroup(set, 'needs')) });
      expect(texts(groups()[3])).toEqual(['Add Tile', 'Remove column']);
      expect(groups()[3].querySelector('button')?.tabIndex).toBe(0);
    });

    it('ES9: a press on Help and then on Pain puts Help in the place of Pain and the focus on Edit Help', async () => {
      await drawBoard('needs');
      await pressCell('Help');
      expect(slotOf('Help').hasAttribute('data-picked')).toBe(true);
      expect(cellOrder()[0]).toEqual(['Back', 'Help', 'Pain', 'Toilet', 'Drink']);
      await pressCell('Pain');
      expect(cellOrder()[0]).toEqual(['Back', 'Pain', 'Help', 'Toilet', 'Drink']);
      expect(element.querySelector('[data-picked]')).toBeNull();
      expect(status()).toBe('Help moved to column 1, place 3');
      expect(focused()).toBe('Edit Help');
    });

    it('ES10: a press on Help and then Escape leaves Help where it was, with nothing picked up', async () => {
      await drawBoard('needs');
      await pressCell('Help');
      await key(document.body, 'Escape');
      expect(cellOrder()[0]).toEqual(['Back', 'Help', 'Pain', 'Toilet', 'Drink']);
      expect(element.querySelector('[data-picked]')).toBeNull();
      // The next press picks a cell up again, so nothing was held.
      await pressCell('Pain');
      expect(slotOf('Pain').hasAttribute('data-picked')).toBe(true);
      expect(cellOrder()[0]).toEqual(['Back', 'Help', 'Pain', 'Toilet', 'Drink']);
    });

    it('ES13: in the rows layout the button beside the grid is named Add row, and an empty group reads Remove row', async () => {
      await drawBoard('needs', {
        before: () =>
          data.change((set) =>
            addGroup(setBoard(set, 'needs', { title: 'Needs', layout: 'rows' }), 'needs'),
          ),
      });
      expect(texts(groups()[3])).toEqual(['Add Tile', 'Remove row']);
      expect(element.querySelector('.add-group')?.getAttribute('aria-label')).toBe('Add row');
    });

    it('EA4: Add column beside the grid gives the board one more group, and the footer has no such button', async () => {
      await drawBoard('needs');
      expect(element.querySelector('.grid .add-group')).toBeNull();
      await press('Add column');
      expect(data.board('needs')?.groups.map((group) => group.cells.length)).toEqual([5, 4, 4, 0]);
      expect(status()).toBe('Column 4 added');
      const footer = TestBed.createComponent(EditActions);
      await footer.whenStable();
      expect(texts(footer.nativeElement)).toEqual([
        'Add Board',
        'Add Tile',
        'Configure Board',
        'Done',
      ]);
    });

    it('EA6: with no room for a group, Add column says it is disabled and why, and does nothing', async () => {
      await drawBoard('needs');
      TestBed.inject(Room).set({ cells: [true, true, true], group: false });
      await fixture.whenStable();
      const add = named('Add column');
      expect(add.getAttribute('aria-disabled')).toBe('true');
      const line = element.querySelector(`#${add.getAttribute('aria-describedby')}`);
      expect(line?.textContent).toContain('no room for another column');
      await press('Add column');
      expect(data.board('needs')?.groups.length).toBe(3);
    });

    it('EA7: out of edit mode the screen has no Add column button', async () => {
      await drawBoard('needs', { editing: false });
      expect(element.querySelector('.add-group')).toBeNull();
    });

    it('ES14: a set change that removes the board on show opens home', async () => {
      await drawBoard('needs', { editing: false });
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/board/needs');
      const groupsOfHome = data.board('home')?.groups ?? [];
      const opensNeeds = (one: Cell) =>
        one.tile.action?.type === 'open' && one.tile.action.board === 'needs';
      const group = groupsOfHome.findIndex((candidate) => candidate.cells.some(opensNeeds));
      const at = { group, cell: groupsOfHome[group].cells.findIndex(opensNeeds) };
      data.change((set) => removeCell(set, 'home', at));
      await fixture.whenStable();
      expect(data.board('needs')).toBeUndefined();
      await vi.waitFor(() => expect(router.url).toBe('/'));
    });

    it('ES15: a change to a board that is not on show leaves the scan where it is', async () => {
      await drawBoard('needs', {
        editing: false,
        before: () => TestBed.inject(ScanSettings).set({ selectionMode: 'step' }),
      });
      const scan = TestBed.inject(Scan);
      await key(document.body, 'Enter');
      expect(scan.state()).toEqual({ phase: 'groups', group: 0, cell: null });
      data.change((set) => setBoard(set, 'food', { title: 'Meals', layout: 'columns' }));
      await fixture.whenStable();
      expect(data.board('food')?.title).toBe('Meals');
      expect(scan.state()).toEqual({ phase: 'groups', group: 0, cell: null });
    });

    it('ES16: Add Tile of an empty group, pressed while Help is picked up, leaves Help where it was', async () => {
      await drawBoard('needs', { before: () => data.change((set) => addGroup(set, 'needs')) });
      await pressCell('Help');
      groups()[3].querySelector<HTMLElement>('.add-tile')?.click();
      await fixture.whenStable();
      expect(cellOrder()[0]).toEqual(['Back', 'Help', 'Pain', 'Toilet', 'Drink']);
      expect(cellOrder()[3]).toEqual([]);
      expect(edit.dialog()).toEqual({ kind: 'add-tile', group: 3 });
    });
  });
});
