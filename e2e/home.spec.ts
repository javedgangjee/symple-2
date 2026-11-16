import { expect, test } from '@playwright/test';
import { contrastRatio } from './support/contrast';
import {
  LAYOUTS,
  THEMES,
  cell,
  cellNames,
  expectDirection,
  focusedName,
  measure,
  openBoard,
  readGlass,
  resolveColours,
  type ScreenLayout,
} from './support/boards';

const HOME_CELLS = ['My boards', 'Needs', 'Quick phrases', 'Keyboards'];

test('E1: home holds two groups and four cells', async ({ page }) => {
  await openBoard(page, 'home');
  await expect(page.locator('main .group')).toHaveCount(2);
  expect(await cellNames(page)).toEqual(HOME_CELLS);
  for (const name of ['Devices', 'Messaging', 'Music', 'Photos', 'Video', 'Games', 'Back']) {
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  }
});

/** Checks that the four home cells have the same size and that each group is filled by its two cells. */
function expectEqualCells(layout: ScreenLayout): void {
  const boxes = layout.groups.flatMap((group) => group.cells.map((item) => item.box));
  expect(layout.groups.map((group) => group.cells.length)).toEqual([2, 2]);
  for (const box of boxes) {
    expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - boxes[0].height)).toBeLessThanOrEqual(2);
  }
}

test('E2: with nothing stored home is two columns of two equal cells', async ({ page }) => {
  await openBoard(page, 'home');
  const layout = await measure(page);
  const [first, second] = layout.groups;
  expectDirection(layout, 'columns');
  expect(first.box.right).toBeLessThan(second.box.left);
  expect(Math.abs(first.box.width - second.box.width)).toBeLessThanOrEqual(2);
  expectEqualCells(layout);
});

test('E3: with rows stored home is two rows of two equal cells', async ({ page }) => {
  await openBoard(page, 'home', { layout: 'rows' });
  const layout = await measure(page);
  const [first, second] = layout.groups;
  expectDirection(layout, 'rows');
  expect(first.box.bottom).toBeLessThan(second.box.top);
  expect(Math.abs(first.box.height - second.box.height)).toBeLessThanOrEqual(2);
  expectEqualCells(layout);
});

test('E4: Tab reaches the four cells in order and skips the settings button', async ({ page }) => {
  for (const layout of LAYOUTS) {
    await openBoard(page, 'home', layout === 'rows' ? { layout } : {});
    for (const name of HOME_CELLS) {
      await page.keyboard.press('Tab');
      expect(await focusedName(page), layout).toBe(name);
    }
    await page.keyboard.press('Tab');
    expect(await focusedName(page), layout).not.toBe('Settings');
  }
});

test('E5: each home label keeps 4.5:1 against its glass fill in every theme', async ({ page }) => {
  for (const theme of THEMES) {
    await openBoard(page, 'home', { theme });
    for (const name of HOME_CELLS) {
      const { ratio } = await readGlass(cell(page, name));
      expect(ratio, `${theme} ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('E6: the Colours theme gives the home cells their hues', async ({ page }) => {
  await openBoard(page, 'home', { theme: 'colours' });
  const expected: Record<string, string> = {
    'My boards': 'oklch(0.42 0.115 250)',
    Needs: 'oklch(0.42 0.115 20)',
    'Quick phrases': 'oklch(0.42 0.115 190)',
    Keyboards: 'oklch(0.40 0.19 285)',
  };
  for (const [name, value] of Object.entries(expected)) {
    const [actual, wanted] = await resolveColours(cell(page, name), 'var(--bg)', value);
    expect(actual, name).toBe(wanted);
  }
});

test('E7: the focused cell has an ink outline at least 4px wide', async ({ page }) => {
  await openBoard(page, 'home');
  await page.keyboard.press('Tab');
  const focused = cell(page, 'My boards');
  await expect(focused).toBeFocused();
  const [, ink] = await resolveColours(focused, 'var(--ink)', 'var(--ink)');
  // The outline colour fades in, so the test waits for it to settle.
  await expect
    .poll(() => focused.evaluate((button) => getComputedStyle(button).outlineColor))
    .toBe(ink);
  const outline = await focused.evaluate((button) => {
    const style = getComputedStyle(button);
    return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(outline.style).toBe('solid');
  expect(outline.width).toBeGreaterThanOrEqual(4);
  expect(await contrastRatio(page, 'body', 'var(--ink)', 'var(--canvas)')).toBeGreaterThanOrEqual(
    3,
  );
});

test('E8: Keyboards opens the keyboard with no console error', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await openBoard(page, 'home');
  await cell(page, 'Keyboards').click();
  await expect(page).toHaveURL(/\/board\/keyboard$/);
  await expect(page.locator('h1')).toHaveText('Keyboard');
  expect(errors).toEqual([]);
});
