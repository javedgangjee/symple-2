import { TestBed } from '@angular/core/testing';
import lucideFile from '../../data/lucide.json';
import { ICON_NAMES, IconName } from '../boards/board-data';
import { Icon } from './icon';
import { LUCIDE_FILE, LucideIcon } from './icon-set';

/** The drawing of the core icon `heart` today, copied from icon.ts. */
const HEART =
  'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5';

/** A small set with one icon of each kind of shape. */
const EVERY_SHAPE: readonly LucideIcon[] = [
  {
    name: 'every-shape',
    shapes: [
      { tag: 'path', d: 'M2 2h20' },
      { tag: 'circle', cx: '12', cy: '12', r: '4', fill: 'currentColor' },
      { tag: 'rect', x: '3', y: '3', width: '7', height: '7', rx: '1' },
      { tag: 'line', x1: '6', y1: '11', x2: '10', y2: '11' },
      { tag: 'ellipse', cx: '12', cy: '5', rx: '9', ry: '3' },
      { tag: 'polyline', points: '22 12 18 12 15 21 9 3 6 12 2 12' },
      { tag: 'polygon', points: '3 11 22 2 13 21 11 13 3 11' },
    ],
  },
];

/** The shapes of an icon as the page holds them: each element with its attributes. */
function shapesOf(svg: SVGElement): Record<string, string>[] {
  return [...svg.children].map((element) => {
    const shape: Record<string, string> = { tag: element.tagName.toLowerCase() };
    for (const attribute of element.attributes) {
      // Angular marks each element for its styles. The mark is not part of the drawing.
      if (!attribute.name.startsWith('_ng')) {
        shape[attribute.name] = attribute.value;
      }
    }
    return shape;
  });
}

describe('Icon', () => {
  let reads: number;

  /** Reads the Lucide set from the given contents, and counts the reads. */
  function useSet(contents: () => Promise<unknown>): void {
    reads = 0;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LUCIDE_FILE,
          useValue: () => {
            reads++;
            return contents();
          },
        },
      ],
    });
  }

  async function draw(name: IconName): Promise<SVGElement> {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', name);
    await fixture.whenStable();
    const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
    if (!svg) {
      throw new Error(`The icon ${name} has no svg.`);
    }
    return svg;
  }

  it('I1: every icon name has a drawing', async () => {
    for (const name of ICON_NAMES) {
      const fixture = TestBed.createComponent(Icon);
      fixture.componentRef.setInput('name', name);
      await fixture.whenStable();
      const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
      expect(svg?.querySelectorAll('path, rect, circle').length, name).toBeGreaterThan(0);
      fixture.destroy();
    }
  });

  it('IC1: the icon heart is drawn as today, and the Lucide set is never read', async () => {
    useSet(() => Promise.resolve(EVERY_SHAPE));
    const svg = await draw('heart');
    expect(shapesOf(svg)).toEqual([{ tag: 'path', d: HEART }]);
    expect(reads).toBe(0);
  });

  it('IC4: the icon lucide:no-such-icon is empty, and nothing is thrown', async () => {
    useSet(() => Promise.resolve(EVERY_SHAPE));
    const svg = await draw('lucide:no-such-icon');
    expect(svg.children.length).toBe(0);
    expect(reads).toBe(1);
  });

  it('IC5: lucide:group has the shapes of the Lucide group, and group has the drawing of today', async () => {
    useSet(() => import('../../data/lucide.json').then((file) => file.default));
    const lucide = lucideFile.find((icon) => icon.name === 'group');
    expect(lucide).toBeDefined();
    expect(shapesOf(await draw('lucide:group'))).toEqual(lucide?.shapes);
    expect(shapesOf(await draw('group'))).toEqual([
      { tag: 'path', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
      { tag: 'path', d: 'M16 3.128a4 4 0 0 1 0 7.744' },
      { tag: 'path', d: 'M22 21v-2a4 4 0 0 0-3-3.87' },
      { tag: 'circle', cx: '9', cy: '7', r: '4' },
    ]);
  });

  it('IC6: an icon of every kind of shape holds one element of each kind with its attributes', async () => {
    useSet(() => Promise.resolve(EVERY_SHAPE));
    const svg = await draw('lucide:every-shape');
    expect(shapesOf(svg)).toEqual(EVERY_SHAPE[0].shapes);
  });
});
