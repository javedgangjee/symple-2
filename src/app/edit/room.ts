import { Injectable, computed, signal } from '@angular/core';
import { LayoutName } from '../layout/layout';

/**
 * The 48px rule. A board can hold any number of groups, and a group any number of cells, as
 * long as no cell gets smaller than 48px in the window in use. The functions here do the sums,
 * `measureRoom` reads the sizes from the page, and the `Room` service keeps the answer for the
 * Add buttons.
 */

/** The smallest width and height of a cell, in pixels. */
export const SMALLEST_CELL = 48;

/**
 * Whether a group has room for one more cell. `length` is the length of the group along its
 * cells, `gap` is the space between two cells, and `shares` are the shares of the cells that
 * the group holds. The new cell takes the share `share`. A group shares its length out by the
 * shares, so the cell with the smallest share is the smallest cell.
 */
export function cellFits(
  length: number,
  gap: number,
  shares: readonly number[],
  share: number,
): boolean {
  const all = [...shares, share];
  const forCells = length - gap * shares.length;
  const total = all.reduce((sum, one) => sum + one, 0);
  return (forCells * Math.min(...all)) / total >= SMALLEST_CELL;
}

/**
 * Whether a board has room for one more group. `across` is the length of the grid across its
 * groups, `gap` is the space between two groups, and `groups` is the number of groups it holds.
 * `edge` is what a group keeps for itself across its cells, such as the room for the scan time bar.
 */
export function groupFits(across: number, gap: number, groups: number, edge = 0): boolean {
  return (across - gap * groups) / (groups + 1) - edge >= SMALLEST_CELL;
}

/** What has room: each group for one more cell, and the board for one more group. */
export interface RoomReport {
  readonly cells: readonly boolean[];
  readonly group: boolean;
}

/** The shares of the cells of one group, and the share that a new cell would take. */
export interface GroupShares {
  readonly shares: readonly number[];
  readonly next: number;
}

function gapOf(element: Element, axis: 'row' | 'column'): number {
  const style = getComputedStyle(element);
  return parseFloat(axis === 'row' ? style.rowGap : style.columnGap) || 0;
}

/**
 * Measures the grid of the board screen. `groups` gives the shares of the cells of each group,
 * in the order of the page. A grid with no size has not been laid out, as in a unit test, and
 * then nothing is known, so everything is said to have room.
 */
export function measureRoom(
  grid: HTMLElement,
  layout: LayoutName,
  groups: readonly GroupShares[],
): RoomReport {
  const box = grid.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) {
    return { cells: groups.map(() => true), group: true };
  }
  // In the columns layout the cells of a group run down the page and the groups run across it.
  const columns = layout === 'columns';
  const along = (rect: DOMRect) => (columns ? rect.height : rect.width);
  const across = (rect: DOMRect) => (columns ? rect.width : rect.height);
  const elements = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .group'));

  let edge = 0;
  const cells = groups.map(({ shares, next }, index) => {
    const element = elements[index];
    if (!element) {
      return true;
    }
    const group = element.getBoundingClientRect();
    const slots = Array.from(element.querySelectorAll<HTMLElement>(':scope > .slot'));
    const gap = gapOf(element, columns ? 'row' : 'column');
    if (slots.length === 0) {
      return along(group) >= SMALLEST_CELL;
    }
    const rects = slots.map((slot) => slot.getBoundingClientRect());
    edge = Math.max(edge, across(group) - across(rects[0]));
    const length = rects.reduce((sum, rect) => sum + along(rect), 0) + gap * (rects.length - 1);
    return cellFits(length, gap, shares, next);
  });
  const gridGap = gapOf(grid, columns ? 'column' : 'row');
  return { cells, group: groupFits(across(box), gridGap, elements.length, edge) };
}

/**
 * Keeps what the board on show has room for. The board screen measures its grid and sets the
 * report, and the Add buttons read it.
 */
@Injectable({ providedIn: 'root' })
export class Room {
  private readonly report = signal<RoomReport>({ cells: [], group: true });

  /** Whether the board has room for one more group. */
  readonly forGroup = computed(() => this.report().group);

  /** Whether any group has room for one more cell. A board with no groups gets its first group with the cell. */
  readonly forAnyCell = computed(() => {
    const { cells, group } = this.report();
    return cells.length === 0 ? group : cells.some((fits) => fits);
  });

  set(report: RoomReport): void {
    this.report.set(report);
  }

  /** Whether a group has room for one more cell. A group that was not measured is said to have room. */
  forCell(group: number): boolean {
    return this.report().cells[group] ?? true;
  }

  /** The groups that have room for one more cell, by index. */
  groupsWithRoom(): number[] {
    return this.report().cells.flatMap((fits, index) => (fits ? [index] : []));
  }
}
