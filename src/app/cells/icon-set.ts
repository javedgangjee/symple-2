import { Injectable, InjectionToken, PendingTasks, inject, signal } from '@angular/core';

/**
 * One shape of a Lucide drawing, as `src/data/lucide.json` writes it: the name of the SVG
 * element and its attributes. Each kind of shape has the attributes that the Lucide set gives it.
 */
export type LucideShape =
  | { readonly tag: 'path'; readonly d: string }
  | {
      readonly tag: 'circle';
      readonly cx: string;
      readonly cy: string;
      readonly r: string;
      readonly fill?: string;
    }
  | {
      readonly tag: 'rect';
      readonly x: string;
      readonly y: string;
      readonly width: string;
      readonly height: string;
      readonly rx?: string;
      readonly ry?: string;
    }
  | {
      readonly tag: 'line';
      readonly x1: string;
      readonly y1: string;
      readonly x2: string;
      readonly y2: string;
    }
  | {
      readonly tag: 'ellipse';
      readonly cx: string;
      readonly cy: string;
      readonly rx: string;
      readonly ry: string;
    }
  | { readonly tag: 'polyline'; readonly points: string }
  | { readonly tag: 'polygon'; readonly points: string };

/** One icon of `src/data/lucide.json`: its Lucide name and its drawing. */
export interface LucideIcon {
  readonly name: string;
  readonly shapes: readonly LucideShape[];
}

/**
 * Gives the contents of `src/data/lucide.json`. Each call reads the file again, so the
 * service calls it once. The service checks what it gives before it draws from it.
 */
export type LucideFile = () => Promise<unknown>;

/**
 * The way the Lucide set is read. The app reads `src/data/lucide.json` with a dynamic import,
 * which the build turns into a chunk of its own, so the file is not in the first download.
 * The unit tests provide a loader that counts its calls or gives a small set.
 */
export const LUCIDE_FILE = new InjectionToken<LucideFile>('LUCIDE_FILE', {
  providedIn: 'root',
  factory: () => () => import('../../data/lucide.json').then((file) => file.default),
});

/** The attributes that each kind of shape must have, by the name of its element. */
const REQUIRED: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries({
    path: ['d'],
    circle: ['cx', 'cy', 'r'],
    rect: ['x', 'y', 'width', 'height'],
    line: ['x1', 'y1', 'x2', 'y2'],
    ellipse: ['cx', 'cy', 'rx', 'ry'],
    polyline: ['points'],
    polygon: ['points'],
  } satisfies Record<LucideShape['tag'], readonly string[]>),
);

/** Tells whether a value is a shape of a kind the icon draws, with each attribute it needs. */
function isShape(value: unknown): value is LucideShape {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const fields: Readonly<Record<string, unknown>> = { ...value };
  const tag = fields['tag'];
  const required = typeof tag === 'string' ? REQUIRED.get(tag) : undefined;
  return (
    required !== undefined &&
    required.every((name) => name in fields) &&
    Object.values(fields).every((field) => typeof field === 'string')
  );
}

/** Tells whether a value is an icon with a name and shapes that the icon can draw. */
function isIcon(value: unknown): value is LucideIcon {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const fields: Readonly<Record<string, unknown>> = { ...value };
  const shapes = fields['shapes'];
  return typeof fields['name'] === 'string' && Array.isArray(shapes) && shapes.every(isShape);
}

/** The drawing of an icon that the set does not have, and of every icon while the set loads. */
const NO_SHAPES: readonly LucideShape[] = [];

/** The wait in milliseconds after the first failed read of the set. It doubles after each one. */
const FIRST_WAIT = 1000;

/** The longest wait in milliseconds between two reads of the set. */
const LONGEST_WAIT = 60_000;

/**
 * The drawings of the Lucide set. The set is read the first time an icon asks for a drawing,
 * and only once if the read succeeds. A board with only the core icons never reads it.
 */
@Injectable({ providedIn: 'root' })
export class IconSet {
  private readonly file = inject(LUCIDE_FILE);
  private readonly pendingTasks = inject(PendingTasks);

  /** The drawings by Lucide name. It is null until the set has been read. */
  private readonly icons = signal<ReadonlyMap<string, readonly LucideShape[]> | null>(null);

  /**
   * The number of failed reads whose wait is over. Each icon reads it, so an icon on screen
   * asks again, and starts a new read, when a wait ends.
   */
  private readonly failures = signal(0);

  /** Whether the set is being read, has been read, or waits to be read again. */
  private started = false;

  /**
   * The shapes of a Lucide icon, by its Lucide name without the prefix, such as `apple`.
   * The first call starts to read the set. The answer is empty until the set has been read,
   * and it stays empty for a name that the set does not have. It reads a signal, so a
   * computed value that calls it gets the shapes once they arrive.
   */
  shapes(name: string): readonly LucideShape[] {
    this.failures();
    this.load();
    return this.icons()?.get(name) ?? NO_SHAPES;
  }

  private load(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    // The pending task keeps the app from counting as stable while the set is read.
    void this.pendingTasks.run(async () => {
      try {
        const file = await this.file();
        // An entry that is not an icon in the right shape is left out, so it draws nothing.
        const entries: readonly unknown[] = Array.isArray(file) ? file : [];
        const icons = entries.filter(isIcon);
        this.icons.set(new Map(icons.map((icon) => [icon.name, icon.shapes])));
      } catch {
        // The icons stay empty. After a wait that grows with each failure, every icon on
        // screen asks again, so a read that keeps failing cannot loop fast.
        const wait = Math.min(FIRST_WAIT * 2 ** this.failures(), LONGEST_WAIT);
        setTimeout(() => {
          this.started = false;
          this.failures.update((count) => count + 1);
        }, wait);
      }
    });
  }
}
