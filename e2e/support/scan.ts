import {
  test as base,
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { axeViolations } from './axe';
import { standInForFirebase } from './firebase';
import type { LayoutName, ThemeName } from './boards';

/** The scan time and the post click delay that the scanning tests store, in milliseconds. */
export const SCAN_TIME = 1000;
export const POST_CLICK_DELAY = 500;

export const SELECTION_MODES = ['scan', 'step', 'cursor', 'touch', 'dwell'] as const;
export type SelectionMode = (typeof SELECTION_MODES)[number];

/** The values that a test can store before the app starts. Each is stored under `symple.` and its name. */
export interface StoredSettings {
  scanTime?: number;
  postClickDelay?: number;
  selectionMode?: SelectionMode;
  dwellTime?: number;
  dwellStyle?: 'grow' | 'bar';
  showProgressBar?: boolean;
  layout?: LayoutName;
  theme?: ThemeName;
}

/** Opens a board in a page of its own, with stored settings and a stopped clock. */
export type OpenBoard = (id: string, title: string, stored?: StoredSettings) => Promise<Page>;

/**
 * The `test` object of the scanning tests. Its `open` opens a board with stored settings and
 * stops the clock of the page, so the scan moves only when a test moves the time. The scan time
 * is 1000 ms and the post click delay is 500 ms unless the test stores others.
 *
 * Each call makes a new browser context and loads the app once. Playwright runs every clock
 * command again on each new page load of a context, so a page that is loaded again after many
 * commands starts slowly and at the wrong time.
 */
export const test = base.extend<{ open: OpenBoard }>({
  open: async ({ browser, baseURL, viewport, storageState }, use, testInfo) => {
    let context: BrowserContext | undefined;

    /** Loads the app once in a new context, with the values stored before the app starts. */
    const load = async (id: string, stored: StoredSettings): Promise<Page> => {
      await context?.close();
      context = await browser.newContext({ baseURL, viewport, storageState });
      await context.addInitScript(
        (values) => {
          for (const [name, value] of Object.entries(values)) {
            localStorage.setItem(`symple.${name}`, String(value));
          }
        },
        { scanTime: SCAN_TIME, postClickDelay: POST_CLICK_DELAY, ...stored },
      );
      const page = await context.newPage();
      await standInForFirebase(page);
      await page.goto(id === 'home' ? '/' : `/board/${id}`);
      await expect(page.locator('h1')).not.toHaveText('');
      return page;
    };

    await use(async (id, title, stored = {}) => {
      let page = await load(id, stored);
      if ((await page.locator('h1').textContent()) === 'Sign in') {
        // About one new context in a hundred starts with no stored sign in when the whole
        // suite runs. The cause was not found. It is in the test setup, before the app is
        // scanned, so the board is loaded once more and the event is noted on the test.
        testInfo.annotations.push({
          type: 'lost sign in',
          description: `The first load of ${id} showed the sign in screen.`,
        });
        page = await load(id, stored);
      }
      await expect(page.locator('h1')).toHaveText(title);
      // The app starts on the real clock, as in the other tests. The clock is taken over once
      // the board is on show, and the scan starts its timers after that.
      await page.clock.install();
      await stopClock(page);
      return page;
    });
    await context?.close();
  },
});

/** Stops the clock of a page a little ahead of where it is, because it cannot be stopped in the past. */
async function stopClock(page: Page): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 2000);
}

/** Stores scan settings on a page that is already open and starts the app again with them. */
export async function storeAndReload(page: Page, stored: StoredSettings): Promise<void> {
  await page.evaluate((values) => {
    for (const [name, value] of Object.entries(values)) {
      localStorage.setItem(`symple.${name}`, String(value));
    }
  }, stored);
  await page.reload();
  await expect(page.locator('main button').first()).toBeVisible();
}

/** Lets the app draw what the last event changed. The clock is stopped, so the app waits for it. */
async function settle(page: Page): Promise<void> {
  await page.clock.runFor(1);
}

/** Moves the clock of the page forward. */
export async function pass(page: Page, ms: number): Promise<void> {
  await page.clock.runFor(ms);
  await settle(page);
}

/**
 * Runs axe on the page. axe waits on timers of the page, so the clock runs while it works and
 * is stopped again after it. A test that calls this stores times long enough that nothing moves
 * in the meantime.
 */
export async function axeWithClock(page: Page): ReturnType<typeof axeViolations> {
  await page.clock.resume();
  const violations = await axeViolations(page);
  await stopClock(page);
  return violations;
}

/** Presses a switch key: Enter picks, Tab moves, and Shift with Tab moves back. */
export async function switchKey(page: Page, key: 'Enter' | 'Tab' | 'Shift+Tab'): Promise<void> {
  await page.keyboard.press(key);
  await settle(page);
}

export const grid = (page: Page): Locator => page.locator('main .grid');
export const groups = (page: Page): Locator => page.locator('main .group');
/** The host element of a cell. It carries the scan and dwell marks. */
export const cellAt = (page: Page, group: number, cell: number): Locator =>
  groups(page).nth(group).locator('app-cell').nth(cell);
/** The host element of the cell with a name. */
export const cellHost = (page: Page, name: string): Locator =>
  page.locator('main app-cell').filter({ has: page.getByRole('button', { name, exact: true }) });

/** The names of the cells of each group, in the order of the page. */
export async function boardCells(page: Page): Promise<string[][]> {
  return groups(page).evaluateAll((elements) =>
    elements.map((element) =>
      Array.from(element.querySelectorAll('button')).map(
        (button) => button.getAttribute('aria-label') ?? '',
      ),
    ),
  );
}

/** The names of what carries an attribute: the groups, and the cells. */
export async function marked(
  page: Page,
  attribute: string,
): Promise<{ groups: string[]; cells: string[] }> {
  return page.evaluate((name) => {
    const names = (selector: string) =>
      Array.from(document.querySelectorAll(selector)).map(
        (element) => element.getAttribute('aria-label') ?? '',
      );
    return { groups: names(`.group[${name}]`), cells: names(`app-cell[${name}] button`) };
  }, attribute);
}

/**
 * Scans to a cell with one switch, as the primary user does, and stops with the cell highlighted.
 * It starts the scan if the scan is at rest, waits for the group, picks it and waits for the cell.
 * A group of one cell has no cell step, so the scan stops on the group.
 * The scan must be at rest or at its first step when this is called.
 */
export async function scanTo(page: Page, group: number, cell: number): Promise<void> {
  const sizes = (await boardCells(page)).map((names) => names.length);
  const filled = sizes.flatMap((size, index) => (size > 0 ? [index] : []));
  if ((await grid(page).getAttribute('data-state')) === 'rest') {
    await switchKey(page, 'Enter');
  }
  if (filled.length > 1) {
    await pass(page, filled.indexOf(group) * SCAN_TIME);
    await expect(groups(page).nth(group)).toHaveAttribute('data-scan', '');
    if (sizes[group] === 1) {
      return;
    }
    await switchKey(page, 'Enter');
  }
  await pass(page, cell * SCAN_TIME);
  await expect(cellAt(page, group, cell)).toHaveAttribute('data-scan', '');
}

/** Scans to a cell with one switch and picks it. */
export async function pickByScan(page: Page, group: number, cell: number): Promise<void> {
  await scanTo(page, group, cell);
  await switchKey(page, 'Enter');
}

/** Moves the mouse pointer onto the middle of an element, a little off centre if asked. */
export async function pointAt(page: Page, target: Locator, offset = 0): Promise<void> {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('The element to point at is not on the page.');
  }
  await page.mouse.move(box.x + box.width / 2 + offset, box.y + box.height / 2 + offset);
  await settle(page);
}

/**
 * Stops every CSS animation of the page at a time on its own timeline. CSS animations do not
 * follow the clock of the page, so this is how a test looks at a bar or a growing cell part way.
 */
export async function holdAnimationsAt(page: Page, ms: number): Promise<void> {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSAnimation) {
        animation.pause();
        animation.currentTime = time;
      }
    }
  }, ms);
}

export interface BarReading {
  /** The animation that draws the bar, or "none". */
  animation: string;
  /** How long the animation runs, in seconds. */
  seconds: number;
  /** The part of the bar that is filled, from 0 to 1. */
  filled: number;
  /** The contrast of the fill of the bar against what is behind it. */
  contrast: number;
}

/**
 * Reads the progress bar that is drawn at the bottom of a group or of the button of a cell.
 * The bar of a cell is measured against the glass fill of the cell, laid over the backdrop that
 * hurts the contrast most. The bar of a group is measured against its own track, laid over the
 * fill of the group.
 */
export async function readBar(target: Locator, behind: 'cell' | 'track'): Promise<BarReading> {
  return target.evaluate((element, against) => {
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
      element.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    // Draws the colours on top of each other and reads the result as sRGB.
    const luminance = (...colours: string[]) => {
      context.clearRect(0, 0, 1, 1);
      for (const colour of colours) {
        context.fillStyle = colour;
        context.fillRect(0, 0, 1, 1);
      }
      const data = context.getImageData(0, 0, 1, 1).data;
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(data[0]) + 0.7152 * channel(data[1]) + 0.0722 * channel(data[2]);
    };

    const bar = getComputedStyle(element, '::after');
    if (bar.content === 'none') {
      return { animation: 'none', seconds: 0, filled: 0, contrast: 0 };
    }
    // The fill is the one colour of the gradient, and its width is the first background size.
    const fillColour = /(?:rgba?|oklch|oklab|color)\([^)]*\)/.exec(bar.backgroundImage)?.[0];
    if (!fillColour) {
      throw new Error(`The bar has no fill: ${bar.backgroundImage}`);
    }
    const fill = luminance(fillColour);
    const backdrop = fill > 0.5 ? 'white' : resolve('var(--canvas-3)');
    const ground =
      against === 'cell'
        ? luminance(backdrop, getComputedStyle(element).backgroundColor)
        : luminance(backdrop, getComputedStyle(element).backgroundColor, bar.backgroundColor);
    return {
      animation: bar.animationName,
      seconds: parseFloat(bar.animationDuration),
      filled: parseFloat(bar.backgroundSize) / 100,
      contrast: (Math.max(fill, ground) + 0.05) / (Math.min(fill, ground) + 0.05),
    };
  }, behind);
}
