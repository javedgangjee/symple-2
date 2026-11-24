import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { EditMode } from '../edit/edit-mode';
import { SettingsOpen } from '../settings/settings-open';
import { Dwell } from './dwell';
import { CellPosition } from './scan';
import { ScanSettings, SelectionMode } from './scan-settings';

const A: CellPosition = { group: 0, cell: 0 };
const B: CellPosition = { group: 0, cell: 1 };

describe('Dwell', () => {
  let dwell: Dwell;
  let presses: CellPosition[];
  let listening: Subscription | undefined;

  /** Makes the service with a dwell time of 1000 ms and a post click delay of 500 ms. */
  function setUp(mode: SelectionMode = 'dwell'): void {
    TestBed.inject(ScanSettings).set({
      selectionMode: mode,
      dwellTime: 1000,
      postClickDelay: 500,
    });
    dwell = TestBed.inject(Dwell);
    presses = [];
    listening?.unsubscribe();
    listening = dwell.presses.subscribe((position) => presses.push(position));
  }

  const pass = (ms: number) => vi.advanceTimersByTime(ms);

  /** Rests the pointer on cell A until the dwell presses it. */
  function pressA(): void {
    dwell.enter(A);
    pass(1000);
    expect(presses).toEqual([A]);
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    listening?.unsubscribe();
    listening = undefined;
    vi.useRealTimers();
    localStorage.clear();
  });

  it('D1: a dwell runs on the cell and presses nothing before the dwell time ends', () => {
    setUp();
    dwell.enter(A);
    pass(999);
    expect(dwell.running()).toEqual(A);
    expect(presses).toEqual([]);
  });

  it('D2: the cell is pressed once when the dwell time ends', () => {
    setUp();
    dwell.enter(A);
    pass(999);
    pass(1);
    expect(presses).toEqual([A]);
    expect(dwell.running()).toBeNull();
  });

  it('D3: a pointer that leaves the cell presses nothing', () => {
    setUp();
    dwell.enter(A);
    pass(600);
    dwell.leave(A);
    pass(1000);
    expect(presses).toEqual([]);
    expect(dwell.running()).toBeNull();
  });

  it('D4: a dwell on the next cell starts from zero', () => {
    setUp();
    dwell.enter(A);
    pass(600);
    dwell.leave(A);
    dwell.enter(B);
    pass(999);
    expect(presses).toEqual([]);
    pass(1);
    expect(presses).toEqual([B]);
  });

  it('D5: a move inside the cell does not start the dwell again', () => {
    setUp();
    dwell.enter(A);
    pass(300);
    dwell.move(A);
    pass(400);
    dwell.move(A);
    pass(299);
    expect(presses).toEqual([]);
    pass(1);
    expect(presses).toEqual([A]);
  });

  it('D6: a pointer that stays still after a press does not press again', () => {
    setUp();
    pressA();
    pass(10_000);
    expect(presses).toEqual([A]);
  });

  it('D7: a move in the post click delay starts no dwell', () => {
    setUp();
    pressA();
    pass(300);
    dwell.move(A);
    pass(2000);
    expect(presses).toEqual([A]);
  });

  it('D8: a move after the post click delay starts a new dwell', () => {
    setUp();
    pressA();
    pass(600);
    dwell.move(A);
    expect(dwell.running()).toEqual(A);
    pass(999);
    expect(presses).toEqual([A]);
    pass(1);
    expect(presses).toEqual([A, A]);
  });

  it('D9: a still pointer presses nothing on a new board', () => {
    setUp();
    pressA();
    dwell.reset();
    // The browser tells the screen that the pointer is on a cell of the new board, with no move.
    dwell.enter(A);
    pass(10_000);
    expect(presses).toEqual([A]);
  });

  it('D10: a pointer press on the cell stops the dwell', () => {
    setUp();
    dwell.enter(A);
    pass(400);
    dwell.interrupt();
    expect(dwell.running()).toBeNull();
    pass(5000);
    expect(presses).toEqual([]);
  });

  it('D11: no dwell runs in the other selection modes', () => {
    for (const mode of ['scan', 'step', 'cursor', 'touch'] as const) {
      setUp(mode);
      dwell.enter(A);
      expect(dwell.running(), mode).toBeNull();
      pass(5000);
      expect(presses, mode).toEqual([]);
    }
  });

  it('D12: a change of the selection mode stops the dwell and presses nothing', () => {
    setUp();
    dwell.enter(A);
    pass(400);
    TestBed.inject(ScanSettings).set({ selectionMode: 'touch' });
    TestBed.tick();
    expect(dwell.running()).toBeNull();
    pass(5000);
    expect(dwell.running()).toBeNull();
    expect(presses).toEqual([]);
  });

  it('PB5: a dwell that runs is dropped when the settings panel opens', () => {
    setUp();
    dwell.enter(A);
    pass(400);
    expect(dwell.running()).toEqual(A);
    TestBed.inject(SettingsOpen).open();
    TestBed.tick();
    expect(dwell.running()).toBeNull();
    pass(5000);
    expect(presses).toEqual([]);
    // No dwell starts while the panel is open.
    dwell.move(B);
    pass(5000);
    expect(dwell.running()).toBeNull();
    expect(presses).toEqual([]);
  });

  it('EM3: a dwell that runs is dropped when edit mode turns on', () => {
    setUp();
    dwell.enter(A);
    pass(400);
    expect(dwell.running()).toEqual(A);
    TestBed.inject(EditMode).start();
    TestBed.tick();
    expect(dwell.running()).toBeNull();
    pass(1000);
    expect(presses).toEqual([]);
  });
});
