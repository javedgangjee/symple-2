import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { CellPosition, Scan, ScanState } from './scan';
import { ScanSettings, SelectionMode } from './scan-settings';

const REST: ScanState = { phase: 'rest', group: null, cell: null };
const group = (index: number): ScanState => ({ phase: 'groups', group: index - 1, cell: null });
const cell = (groupIndex: number, index: number): ScanState => ({
  phase: 'cells',
  group: groupIndex - 1,
  cell: index - 1,
});
const confirmed = (groupIndex: number, index: number): ScanState => ({
  phase: 'confirmed',
  group: groupIndex - 1,
  cell: index - 1,
});
/** A pick, with the group and the cell counted from 1 as the cases count them. */
const pick = (groupIndex: number, index: number): CellPosition => ({
  group: groupIndex - 1,
  cell: index - 1,
});

describe('Scan', () => {
  let scan: Scan;
  let picks: CellPosition[];
  let listening: Subscription | undefined;

  /** Makes the service with a scan time of 1000 ms, and gives it a board. */
  function setUp(mode: SelectionMode, sizes: number[] = [2, 2], postClickDelay = 500): void {
    TestBed.inject(ScanSettings).set({ selectionMode: mode, scanTime: 1000, postClickDelay });
    scan = TestBed.inject(Scan);
    picks = [];
    listening?.unsubscribe();
    listening = scan.picks.subscribe((position) => picks.push(position));
    scan.show(sizes);
  }

  const pass = (ms: number) => vi.advanceTimersByTime(ms);

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

  describe('in scan mode', () => {
    beforeEach(() => setUp('scan'));

    /** Starts the scan and waits until group 2 is highlighted. */
    function toGroupTwo(): void {
      scan.press();
      pass(1000);
      expect(scan.state()).toEqual(group(2));
    }

    /** Goes on to cell 2 of group 2. */
    function toCellTwo(): void {
      toGroupTwo();
      scan.press();
      pass(1000);
      expect(scan.state()).toEqual(cell(2, 2));
    }

    it('S1: stays at rest when no press is made', () => {
      pass(10_000);
      expect(scan.state()).toEqual(REST);
    });

    it('S2: one press at rest highlights group 1 and picks nothing', () => {
      scan.press();
      expect(scan.state()).toEqual(group(1));
      expect(picks).toEqual([]);
    });

    it('S3: the highlight moves to group 2 after the scan time', () => {
      scan.press();
      pass(1000);
      expect(scan.state()).toEqual(group(2));
    });

    it('S4: the highlight returns to group 1 after two scan times', () => {
      scan.press();
      pass(2000);
      expect(scan.state()).toEqual(group(1));
    });

    it('S5: the scan goes to rest when the groups were scanned twice', () => {
      scan.press();
      pass(4000);
      expect(scan.state()).toEqual(REST);
    });

    it('S6: a press on group 2 highlights its first cell and picks nothing', () => {
      toGroupTwo();
      scan.press();
      expect(scan.state()).toEqual(cell(2, 1));
      expect(picks).toEqual([]);
    });

    it('S7: the highlight moves to cell 2 after the scan time', () => {
      toGroupTwo();
      scan.press();
      pass(1000);
      expect(scan.state()).toEqual(cell(2, 2));
    });

    it('S8: the scan returns to the groups when the cells were scanned twice', () => {
      toGroupTwo();
      scan.press();
      pass(4000);
      expect(scan.state()).toEqual(group(2));
    });

    it('S9: the count of passes starts again when the scan returns to the groups', () => {
      toGroupTwo();
      scan.press();
      pass(4000);
      pass(4000);
      expect(scan.state()).toEqual(REST);
    });

    it('S10: a press on a cell picks it once and confirms it', () => {
      toCellTwo();
      scan.press();
      expect(picks).toEqual([pick(2, 2)]);
      expect(scan.state()).toEqual(confirmed(2, 2));
    });

    it('S11: a press in the post click delay is ignored', () => {
      toCellTwo();
      scan.press();
      pass(499);
      scan.press();
      expect(picks).toEqual([pick(2, 2)]);
      expect(scan.state()).toEqual(confirmed(2, 2));
    });

    it('S12: the scan starts again by itself when the post click delay ends', () => {
      toCellTwo();
      scan.press();
      pass(500);
      expect(scan.state()).toEqual(group(1));
    });

    it('S13: after a pick the scan starts on a new board that was given in the delay', () => {
      toCellTwo();
      scan.press();
      pass(200);
      scan.show([3, 3, 3]);
      pass(300);
      expect(scan.state()).toEqual(group(1));
      // The third group shows that the new board is the one that is scanned.
      pass(2000);
      expect(scan.state()).toEqual(group(3));
    });

    it('S15: the scan stays at rest after it is sent there', () => {
      toGroupTwo();
      scan.press();
      scan.rest();
      pass(10_000);
      expect(scan.state()).toEqual(REST);
    });

    it('S16: a new board sends the scan to rest', () => {
      toGroupTwo();
      scan.show([3, 3]);
      expect(scan.state()).toEqual(REST);
    });
  });

  it('S14: with no post click delay the scan starts again at once after a pick', () => {
    setUp('scan', [2, 2], 0);
    scan.press();
    scan.press();
    scan.press();
    expect(picks).toEqual([pick(1, 1)]);
    expect(scan.state()).toEqual(group(1));
  });

  describe('the short cuts', () => {
    it('S17: a group of one cell is picked with no cell step', () => {
      setUp('scan', [1, 1, 1]);
      scan.press();
      pass(1000);
      scan.press();
      expect(picks).toEqual([pick(2, 1)]);
      expect(scan.state()).toEqual(confirmed(2, 1));
    });

    it('S18: a board of one group is scanned by its cells with no group step', () => {
      setUp('scan', [3]);
      scan.press();
      expect(scan.state()).toEqual(cell(1, 1));
    });

    it('S19: a board of one group goes to rest when its cells were scanned twice', () => {
      setUp('scan', [3]);
      scan.press();
      pass(6000);
      expect(scan.state()).toEqual(REST);
    });

    it('S20: an empty group is skipped', () => {
      setUp('scan', [2, 0, 2]);
      scan.press();
      pass(1000);
      expect(scan.state()).toEqual(group(3));
    });

    it('S21: a board with no cells stays at rest', () => {
      for (const sizes of [[], [0, 0]]) {
        setUp('scan', sizes);
        scan.press();
        expect(scan.state()).toEqual(REST);
        expect(picks).toEqual([]);
      }
    });
  });

  describe('in step mode', () => {
    beforeEach(() => setUp('step'));

    /** Moves to group 2, picks it and so highlights its first cell. */
    function toFirstCellOfGroupTwo(): void {
      scan.move();
      scan.move();
      scan.press();
      expect(scan.state()).toEqual(cell(2, 1));
    }

    it('P1: a move at rest highlights group 1 and nothing moves by itself', () => {
      scan.move();
      pass(10_000);
      expect(scan.state()).toEqual(group(1));
    });

    it('P2: a move goes to group 2', () => {
      scan.move();
      scan.move();
      expect(scan.state()).toEqual(group(2));
    });

    it('P3: a move past the last group goes to group 1', () => {
      scan.move();
      scan.move();
      scan.move();
      expect(scan.state()).toEqual(group(1));
    });

    it('P4: a press at rest highlights group 1 and picks nothing', () => {
      scan.press();
      expect(scan.state()).toEqual(group(1));
      expect(picks).toEqual([]);
    });

    it('P5: a press on group 2 and then a move highlights cell 2', () => {
      toFirstCellOfGroupTwo();
      scan.move();
      expect(scan.state()).toEqual(cell(2, 2));
    });

    it('P6: a move past the last cell shows the groups again', () => {
      toFirstCellOfGroupTwo();
      scan.move();
      scan.move();
      expect(scan.state()).toEqual(group(2));
    });

    it('P7: a press on a cell picks it once and confirms it', () => {
      toFirstCellOfGroupTwo();
      scan.press();
      expect(picks).toEqual([pick(2, 1)]);
      expect(scan.state()).toEqual(confirmed(2, 1));
    });

    it('P8: a move and a press in the post click delay change nothing', () => {
      toFirstCellOfGroupTwo();
      scan.press();
      pass(200);
      scan.move();
      scan.press();
      expect(picks).toEqual([pick(2, 1)]);
      expect(scan.state()).toEqual(confirmed(2, 1));
    });

    it('P9: group 1 is highlighted when the post click delay ends', () => {
      toFirstCellOfGroupTwo();
      scan.press();
      pass(500);
      expect(scan.state()).toEqual(group(1));
    });
  });
});
