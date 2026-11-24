import { TestBed } from '@angular/core/testing';
import lucideFile from '../../data/lucide.json';
import { IconName } from '../boards/board-data';
import { Icon } from './icon';
import { IconSet, LUCIDE_FILE, LucideIcon } from './icon-set';

/** A small set of two icons, for the cases that do not need the real file. */
const TWO_ICONS: readonly LucideIcon[] = [
  { name: 'apple', shapes: [{ tag: 'path', d: 'M12 6.528V3' }] },
  { name: 'house', shapes: [{ tag: 'rect', x: '3', y: '3', width: '18', height: '18' }] },
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

describe('IconSet', () => {
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

  it('IC2: the icon lucide:apple reads the set once and holds the shapes of apple', async () => {
    useSet(() => import('../../data/lucide.json').then((file) => file.default));
    const apple = lucideFile.find((icon) => icon.name === 'apple');
    expect(apple).toBeDefined();
    const svg = await draw('lucide:apple');
    expect(reads).toBe(1);
    expect(shapesOf(svg)).toEqual(apple?.shapes);
    expect(TestBed.inject(IconSet).shapes('apple')).toEqual(apple?.shapes);
  });

  it('IC3: two Lucide icons drawn one after the other read the set once', async () => {
    useSet(() => Promise.resolve(TWO_ICONS));
    const apple = await draw('lucide:apple');
    const house = await draw('lucide:house');
    expect(reads).toBe(1);
    expect(shapesOf(apple)).toEqual(TWO_ICONS[0].shapes);
    expect(shapesOf(house)).toEqual(TWO_ICONS[1].shapes);
  });
});
