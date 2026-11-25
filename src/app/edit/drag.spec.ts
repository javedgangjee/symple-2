import { CellPosition } from '../scan/scan';
import { Drag, GroupBox, isOver, placeUnder } from './drag';

/** Three columns of 100px with a gap of 20px. Each holds two cells of 100px, one under the other. */
const COLUMNS: GroupBox[] = [0, 120, 240].map((left) => ({
  box: { left, top: 0, width: 100, height: 220 },
  cells: [
    { left, top: 0, width: 100, height: 100 },
    { left, top: 120, width: 100, height: 100 },
  ],
}));

const OWN: CellPosition = { group: 0, cell: 1 };
const POINTER = 1;

describe('Drag', () => {
  it('DR1: a pointer that moves 2px drags nothing, and the release is a press', () => {
    const drag = new Drag();
    drag.begin(POINTER, { x: 50, y: 150 }, OWN);
    expect(drag.move(POINTER, { x: 52, y: 150 })).toBeNull();
    expect(drag.end(POINTER)).toBeNull();
    expect(drag.swallowsClick()).toBe(false);
  });

  it('DR2: over the middle of the third group, above the middle of its first cell, the place is its first', () => {
    const place = placeUnder({ x: 290, y: 30 }, COLUMNS, 'columns', OWN, () => true);
    expect(place).toEqual({ group: 2, cell: 0 });
  });

  it('DR3: over a group with no room the place is the own place of the cell', () => {
    const place = placeUnder({ x: 290, y: 30 }, COLUMNS, 'columns', OWN, (group) => group !== 2);
    expect(place).toEqual(OWN);
  });

  it('DR4: a drag asks for one move when the pointer goes up, and the click that follows picks nothing up', () => {
    const drag = new Drag();
    drag.begin(POINTER, { x: 50, y: 150 }, OWN);
    expect(drag.move(POINTER, { x: 150, y: 150 })).toEqual(OWN);
    expect(drag.move(POINTER, { x: 290, y: 30 })).toEqual(OWN);
    // The release gives the place to move from once. A second release gives nothing.
    expect(drag.end(POINTER)).toEqual(OWN);
    expect(drag.end(POINTER)).toBeNull();
    // The click of that release is swallowed, and the next click is a press again.
    expect(drag.swallowsClick()).toBe(true);
    expect(drag.swallowsClick()).toBe(false);
  });

  it('DR5: a point on Add column, its edges included, is over it, and a point beside it is not', () => {
    const add = { left: 400, top: 0, width: 48, height: 220 };
    expect(isOver({ x: 424, y: 110 }, add)).toBe(true);
    expect(isOver({ x: 400, y: 0 }, add)).toBe(true);
    expect(isOver({ x: 448, y: 220 }, add)).toBe(true);
    expect(isOver({ x: 399, y: 110 }, add)).toBe(false);
    expect(isOver({ x: 424, y: 221 }, add)).toBe(false);
  });
});
