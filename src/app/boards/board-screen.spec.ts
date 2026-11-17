import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Message } from '../keyboard/message';
import { Layout } from '../layout/layout';
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

  /** Draws the screen with one board of test data in place of the board service. */
  async function draw(board: Omit<Board, 'id' | 'title'>, others: Board[] = []): Promise<void> {
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
});
