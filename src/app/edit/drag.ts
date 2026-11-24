import { LayoutName } from '../layout/layout';
import { CellPosition } from '../scan/scan';

/**
 * Moving a cell by dragging. `Drag` follows one pointer and says when a press has become a
 * drag, `placeUnder` finds the group and the place under the pointer, and `slide` lets the
 * other cells slide out of the way. Nothing here changes the set: the board screen does that
 * once, when the pointer goes up.
 */

/** How far the pointer moves before a press becomes a drag, in pixels. */
export const DRAG_START = 8;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The part of a rectangle that the sums here read. A `DOMRect` is one. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A group on the page, and the cells that it holds apart from the cell that is dragged. */
export interface GroupBox {
  readonly box: Box;
  readonly cells: readonly Box[];
}

/** The pointer that is down on a cell. */
interface Held {
  readonly pointerId: number;
  readonly start: Point;
  readonly from: CellPosition;
  lifted: boolean;
}

/** Follows the pointer from the press on a cell to its release. */
export class Drag {
  private held: Held | null = null;
  private swallows = false;

  /** The pointer went down on the cell at a place. */
  begin(pointerId: number, at: Point, from: CellPosition): void {
    this.held = { pointerId, start: at, from, lifted: false };
    this.swallows = false;
  }

  /**
   * The pointer moved. It returns the place that the cell is dragged from once the pointer
   * has moved far enough, and null while the press is still a press.
   */
  move(pointerId: number, at: Point): CellPosition | null {
    const held = this.held;
    if (held?.pointerId !== pointerId) {
      return null;
    }
    const { start } = held;
    held.lifted ||= Math.hypot(at.x - start.x, at.y - start.y) >= DRAG_START;
    return held.lifted ? held.from : null;
  }

  /**
   * The pointer went up or was taken away. It returns the place that the cell was dragged
   * from, or null when the press never became a drag, so the release is a press.
   */
  end(pointerId: number): CellPosition | null {
    const held = this.held;
    if (held?.pointerId !== pointerId) {
      return null;
    }
    this.held = null;
    this.swallows = held.lifted;
    return held.lifted ? held.from : null;
  }

  /**
   * Whether the click that the browser sends now belongs to a drag that has just ended.
   * It says so once, and such a click must pick nothing up.
   */
  swallowsClick(): boolean {
    const swallows = this.swallows;
    this.swallows = false;
    return swallows;
  }
}

const middle = (start: number, length: number) => start + length / 2;

/**
 * The place under the pointer: the group whose middle is nearest, before the first cell
 * whose middle lies past the pointer. A group with no room is skipped, so the cell stays at
 * `own`, the place it has now. Its own group always has room for it.
 */
export function placeUnder(
  point: Point,
  groups: readonly GroupBox[],
  layout: LayoutName,
  own: CellPosition,
  hasRoom: (group: number) => boolean,
): CellPosition {
  // In the columns layout the groups run across the page and the cells of a group run down it.
  const columns = layout === 'columns';
  const across = (box: Box) =>
    columns ? middle(box.left, box.width) : middle(box.top, box.height);
  const along = (box: Box) => (columns ? middle(box.top, box.height) : middle(box.left, box.width));
  const [groupAt, cellAt] = columns ? [point.x, point.y] : [point.y, point.x];

  let group = -1;
  groups.forEach(({ box }, index) => {
    if (
      group === -1 ||
      Math.abs(across(box) - groupAt) < Math.abs(across(groups[group].box) - groupAt)
    ) {
      group = index;
    }
  });
  if (group === -1 || (group !== own.group && !hasRoom(group))) {
    return own;
  }
  const before = groups[group].cells.filter((box) => along(box) < cellAt).length;
  return { group, cell: before };
}

/** Where each cell lies on the page, by the key of its slot. */
export type Places = ReadonlyMap<string, Box>;

/** Reads where each slot of the grid lies. A slot carries its key as `data-key`. */
export function readPlaces(grid: HTMLElement): Map<string, Box> {
  const places = new Map<string, Box>();
  for (const slot of grid.querySelectorAll<HTMLElement>('.slot[data-key]')) {
    places.set(slot.dataset['key'] ?? '', slot.getBoundingClientRect());
  }
  return places;
}

/** How a cell slides to its new place. */
const SLIDE: KeyframeAnimationOptions = { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

/**
 * Lets each slot that lies somewhere new slide there from where it was. `before` holds the
 * places from before the change. Nothing slides when `still` is true, as it is when the
 * system asks for reduced motion, and the cells then jump.
 */
export function slide(grid: HTMLElement, before: Places, still: boolean): void {
  if (still) {
    return;
  }
  for (const slot of grid.querySelectorAll<HTMLElement>('.slot[data-key]')) {
    const was = before.get(slot.dataset['key'] ?? '');
    const now = slot.getBoundingClientRect();
    const moved = was && (was.left !== now.left || was.top !== now.top);
    // A browser without the Web Animations API, and the page of a unit test, let the cells jump.
    if (moved && typeof slot.animate === 'function') {
      slot.animate(
        [{ translate: `${was.left - now.left}px ${was.top - now.top}px` }, { translate: '0 0' }],
        SLIDE,
      );
    }
  }
}
