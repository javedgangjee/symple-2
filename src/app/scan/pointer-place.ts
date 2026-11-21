import { Injectable, signal } from '@angular/core';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Where the pointer is in the window, or nothing while it is outside it. The board screen writes
 * it and draws the round cursor of `cursor` mode from it. It is kept here, and not in the screen,
 * because a cell can open another screen and the cursor must stay where it is.
 */
@Injectable({ providedIn: 'root' })
export class PointerPlace {
  private readonly place = signal<Point | null>(null);

  readonly at = this.place.asReadonly();

  set(point: Point | null): void {
    this.place.set(point);
  }
}
