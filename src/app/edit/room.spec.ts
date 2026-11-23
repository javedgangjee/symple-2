import { cellFits, groupFits } from './room';

/** The shares of a group whose cells share its length equally. */
const equal = (cells: number) => Array.from({ length: cells }, () => 1);

describe('Room', () => {
  // Six cells of 48px with five gaps of 16px need 368px, so a sixth cell fits in 400px.
  it('RM1: a group of 400px with a gap of 16px and 5 cells has room for one more cell', () => {
    expect(cellFits(400, 16, equal(5), 1)).toBe(true);
  });

  it('RM2: the same group with 7 cells has no room, because 8 cells would each be under 48px', () => {
    expect(cellFits(400, 16, equal(7), 1)).toBe(false);
  });

  it('RM3: a grid of 300px with a gap of 16px and 5 groups has no room for one more group', () => {
    expect(groupFits(300, 16, 5)).toBe(false);
  });
});
