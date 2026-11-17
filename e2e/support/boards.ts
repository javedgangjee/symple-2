import { expect, type Locator, type Page } from '@playwright/test';

export const THEMES = ['colours', 'blue', 'purple', 'teal', 'dark'] as const;
export type ThemeName = (typeof THEMES)[number];

export const LAYOUTS = ['columns', 'rows'] as const;
export type LayoutName = (typeof LAYOUTS)[number];

/**
 * The sample boards, with the title that the header shows. There is one board of each kind:
 * bleed tiles, symbols, stage tiles, the fixed colours of Yes and No, a full grid with a fixed
 * layout, a keyboard of five rows and a keyboard of seven. The tests that go over the boards use
 * these, because a second board of the same kind is drawn by the same rules. The unit tests
 * check the data of every board.
 */
export const BOARDS: Record<string, string> = {
  home: 'Home',
  needs: 'Needs',
  'my-boards': 'My boards',
  'yes-no': 'Yes or no',
  'core-words': 'Core words',
  keyboard: 'QWERTY keyboard',
  'keyboard-vowels': 'Vowel keyboard',
};

/** The sample boards that fix their own layout. */
export const FIXED_LAYOUTS: Record<string, LayoutName> = {
  'core-words': 'columns',
  keyboard: 'rows',
  'keyboard-vowels': 'rows',
};

export const NEEDS_LABELS = [
  'Help',
  'Pain',
  'Toilet',
  'Drink',
  'Eat',
  'Medicine',
  'Hot',
  'Blanket',
  'Bed',
  'Move me',
  'Itch',
  'Glasses',
];

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ScreenLayout {
  header: Box;
  main: Box;
  groups: { box: Box; cells: { name: string; box: Box }[] }[];
}

/**
 * Opens a board with a stored layout and theme, as a caregiver's choice would be read on the next start.
 * Nothing is stored for a value that is left out.
 */
export async function openBoard(
  page: Page,
  id: string,
  stored: { layout?: LayoutName; theme?: ThemeName } = {},
): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ layout, theme }) => {
    localStorage.clear();
    if (layout) {
      localStorage.setItem('symple.layout', layout);
    }
    if (theme) {
      localStorage.setItem('symple.theme', theme);
    }
  }, stored);
  await page.goto(id === 'home' ? '/' : `/board/${id}`);
  await expect(page.locator('h1')).toHaveText(BOARDS[id]);
}

/** The cells of the main area, in the order of the page. */
export function cells(page: Page): Locator {
  return page.locator('main button');
}

export function cell(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('button', { name, exact: true });
}

/**
 * Presses a cell that opens a board and waits for the title of that board.
 * A test that presses and then reads the page at once can read the old board.
 */
export async function pressTo(page: Page, name: string, title: string): Promise<void> {
  await cell(page, name).click();
  await expect(page.locator('h1')).toHaveText(title);
}

export function statusRegion(page: Page): Locator {
  return page.locator('main [role="status"]');
}

/** The names of the cells, in the order of the page. */
export async function cellNames(page: Page): Promise<string[]> {
  return cells(page).evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label') ?? ''),
  );
}

/** Measures the header, the main area, each group and each cell. */
export async function measure(page: Page): Promise<ScreenLayout> {
  return page.evaluate(() => {
    const box = (element: Element) => {
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const find = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`No element matches ${selector}`);
      }
      return element;
    };
    return {
      header: box(find('header')),
      main: box(find('main')),
      groups: Array.from(document.querySelectorAll('main .group')).map((group) => ({
        box: box(group),
        cells: Array.from(group.querySelectorAll('button')).map((button) => ({
          name: button.getAttribute('aria-label') ?? '',
          box: box(button),
        })),
      })),
    };
  });
}

/** The name of the control that has focus, or "none". */
export async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active === null || active === document.body
      ? 'none'
      : (active.getAttribute('aria-label') ?? active.outerHTML);
  });
}

/** Resolves two colours inside an element, so values written differently compare as equal. */
export async function resolveColours(
  target: Locator,
  actual: string,
  expected: string,
): Promise<[string, string]> {
  return target.evaluate(
    (host, [first, second]) => {
      const read = (colour: string) => {
        const probe = document.createElement('span');
        probe.style.color = colour;
        host.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      return [read(first), read(second)];
    },
    [actual, expected] as const,
  );
}

export interface GlassReading {
  /** The contrast of the label against the cell's fill laid over the worst backdrop. */
  ratio: number;
  /** The alpha of the fill, from 0 to 255. */
  alpha: number;
  backdropFilter: string;
}

/**
 * Reads the contrast between the text colour of a cell and its glass fill.
 * The fill is partly see-through, so it is laid over the backdrop that hurts the contrast most:
 * white for a light label and --canvas-3 for a dark label.
 */
export async function readGlass(target: Locator): Promise<GlassReading> {
  return target.evaluate((button) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('The canvas has no 2D context.');
    }
    const resolve = (colour: string) => {
      const probe = document.createElement('span');
      probe.style.color = colour;
      button.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    // Draws the colours on top of each other and reads the result as sRGB.
    const paint = (...colours: string[]) => {
      context.clearRect(0, 0, 1, 1);
      for (const colour of colours) {
        context.fillStyle = colour;
        context.fillRect(0, 0, 1, 1);
      }
      return context.getImageData(0, 0, 1, 1).data;
    };
    const luminance = (data: Uint8ClampedArray) => {
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(data[0]) + 0.7152 * channel(data[1]) + 0.0722 * channel(data[2]);
    };

    const style = getComputedStyle(button);
    const label = luminance(paint(style.color));
    const backdrop = label > 0.5 ? 'white' : resolve('var(--canvas-3)');
    const fill = luminance(paint(backdrop, style.backgroundColor));
    return {
      ratio: (Math.max(label, fill) + 0.05) / (Math.min(label, fill) + 0.05),
      alpha: paint(style.backgroundColor)[3],
      backdropFilter: style.backdropFilter,
    };
  });
}

/** Checks that the groups run one way and the cells of each group run the other way. */
export function expectDirection(layout: ScreenLayout, direction: LayoutName): void {
  const along = direction === 'columns' ? 'left' : 'top';
  const across = direction === 'columns' ? 'top' : 'left';
  const groups = layout.groups;
  for (let index = 1; index < groups.length; index++) {
    expect(groups[index].box[along]).toBeGreaterThan(groups[index - 1].box[along]);
    expect(groups[index].box[across]).toBeCloseTo(groups[index - 1].box[across], 0);
  }
  for (const group of groups) {
    for (let index = 1; index < group.cells.length; index++) {
      expect(group.cells[index].box[across]).toBeGreaterThan(group.cells[index - 1].box[across]);
      expect(group.cells[index].box[along]).toBeCloseTo(group.cells[index - 1].box[along], 0);
    }
  }
}

/** Asks Chromium for less transparency. Playwright cannot emulate this media feature itself. */
export async function askForLessTransparency(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
}
