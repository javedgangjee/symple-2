import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Message } from '../keyboard/message';
import { Layout } from '../layout/layout';
import { ScanSettingValues, ScanSettings } from '../scan/scan-settings';
import { Back } from './back';
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

describe('BoardScreen', () => {
  let fixture: ComponentFixture<BoardScreen>;
  let element: HTMLElement;
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
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'board/:id', component: Blank }]),
        {
          provide: BoardData,
          useValue: { board: (id: string) => boards.find((b) => b.id === id) },
        },
        { provide: Back, useValue: back },
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
    Array.from(element.querySelectorAll<HTMLElement>('app-cell')).map((host) =>
      Number(host.style.flexGrow),
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

  it('S3: the grid carries the stored layout', async () => {
    await draw({ groups: [{ cells: [cell('X')] }] });
    expect(layoutOfGrid()).toBe('columns');
    TestBed.inject(Layout).set('rows');
    await fixture.whenStable();
    expect(layoutOfGrid()).toBe('rows');
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

  it('S6: an empty group is drawn with no control', async () => {
    await draw({ groups: [{ cells: [cell('A')] }, { cells: [] }] });
    expect(groups().length).toBe(2);
    expect(buttons().length).toBe(1);
    expect(groups()[1].querySelectorAll('button, a, input, select, textarea').length).toBe(0);
  });

  it('S7: a board with no groups is drawn empty', async () => {
    await draw({ groups: [] });
    expect(groups().length).toBe(0);
    expect(buttons().length).toBe(0);
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
    expect(TestBed.inject(Layout).name()).toBe('columns');
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

  it('S16: the message tile does nothing when pressed', async () => {
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

    it('R10: a pointer of the touch kind starts no dwell', async () => {
      await drawWithScan({ selectionMode: 'dwell' });
      const url = TestBed.inject(Router).url;
      pointerEnters('Needs', 'touch');
      expect(cellsWith('data-dwell')).toEqual([]);
      pass(5000);
      expect(cellsWith('data-dwell')).toEqual([]);
      expect(TestBed.inject(Router).url).toBe(url);
    });
  });
});
