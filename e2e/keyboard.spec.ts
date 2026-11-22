import { expect, type Page } from '@playwright/test';
import { axeViolations } from './support/axe';
import {
  LAYOUTS,
  THEMES,
  cell,
  cellNames,
  cells,
  expectDirection,
  focusedName,
  measure,
  openBoard,
  pressTo,
  readGlass,
  statusRegion,
} from './support/boards';
import { test } from './support/firebase';

// The names of the keys in the order of the data, with caps lock off.
const KEY_NAMES = [
  ...'qwertyuiop',
  ...'asdfghjkl',
  'Backspace',
  'Caps lock',
  ...'zxcvbnm',
  'Full stop',
  'Question mark',
  '123',
  'Space',
  'Clear',
];

/** The message is the second cell of the board. Its text is what the user has written. */
const message = (page: Page) => cells(page).nth(1);

/** Presses keys that stay on the same board. A cell that opens a board goes through pressTo. */
async function press(page: Page, ...names: string[]): Promise<void> {
  for (const name of names) {
    await cell(page, name).click();
  }
}

async function openWithHi(page: Page): Promise<void> {
  await openBoard(page, 'keyboard');
  await press(page, 'h', 'i');
  await expect(message(page)).toHaveText('hi');
}

test('Y1: Keyboards and QWERTY open five groups and thirty five cells, with an empty message', async ({
  page,
}) => {
  await openBoard(page, 'home');
  await pressTo(page, 'Keyboards', 'Keyboards');
  await pressTo(page, 'QWERTY', 'QWERTY keyboard');
  await expect(page.locator('main .group')).toHaveCount(5);
  await expect(cells(page)).toHaveCount(35);
  expect((await cellNames(page))[0]).toBe('Back');
  await expect(message(page)).toHaveClass(/\bmessage\b/);
  await expect(message(page)).toHaveText('');
  // The mockup's row of suggested words is not drawn.
  expect((await measure(page)).groups.map((group) => group.cells.length)).toEqual([
    2, 10, 10, 10, 3,
  ]);
  await expect(page.getByRole('button', { name: /soup|some|soon|something/ })).toHaveCount(0);
});

test('Y2: the keyboard is drawn as rows in both stored layouts, with keys sized by their parts', async ({
  page,
}) => {
  for (const stored of LAYOUTS) {
    await openBoard(page, 'keyboard', stored === 'rows' ? { layout: stored } : {});
    const layout = await measure(page);
    expectDirection(layout, 'rows');
    const gap = layout.main.top - layout.header.bottom;

    const keys = layout.groups.slice(1, 4).flatMap((group) => group.cells);
    expect(keys.length).toBe(30);
    for (const key of keys) {
      expect(Math.abs(key.box.width - keys[0].box.width), stored).toBeLessThanOrEqual(2);
      expect(Math.abs(key.box.height - keys[0].box.height), stored).toBeLessThanOrEqual(2);
    }

    // A row shares out what is left after its gaps, so the widths compare directly.
    expect(gap).toBeGreaterThan(0);
    const [back, text] = layout.groups[0].cells.map((item) => item.box.width);
    expect(Math.abs(text - back * 9), stored).toBeLessThanOrEqual(2);
    const [numbers, space, clear] = layout.groups[4].cells.map((item) => item.box.width);
    expect(Math.abs(space - numbers * 3), stored).toBeLessThanOrEqual(2);
    expect(Math.abs(space - clear * 3), stored).toBeLessThanOrEqual(2);
  }
});

test('Y3: typing with caps lock writes "hi Mom."', async ({ page }) => {
  await openBoard(page, 'keyboard');
  await press(page, 'h', 'i', 'Space', 'Caps lock');

  const caps = cell(page, 'Caps lock');
  await expect(caps).toHaveAttribute('aria-pressed', 'true');
  await expect(cell(page, 'M')).toHaveText('M');
  await expect(cell(page, 'Q')).toHaveText('Q');
  await expect(cell(page, 'm')).toHaveCount(0);

  await press(page, 'M', 'Caps lock');
  await expect(caps).toHaveAttribute('aria-pressed', 'false');
  await expect(cell(page, 'm')).toHaveText('m');

  await press(page, 'o', 'm', 'Full stop');
  await expect(message(page)).toHaveText('hi Mom.');
  await expect(statusRegion(page)).toHaveText('hi Mom.');
});

test('Y4: Backspace removes one letter and Clear empties the message', async ({ page }) => {
  await openWithHi(page);
  await press(page, 'Backspace');
  await expect(message(page)).toHaveText('h');
  await press(page, 'Clear');
  await expect(message(page)).toHaveText('');
});

test('Y5: the message is kept between the letters and the numbers', async ({ page }) => {
  await openWithHi(page);
  await pressTo(page, '123', 'Numbers and symbols');
  await press(page, '2');
  await expect(message(page)).toHaveText('hi2');
  await pressTo(page, 'Back', 'QWERTY keyboard');
  await expect(message(page)).toHaveText('hi2');
});

test('Y11: ABC returns to the letters, and Back then leads home', async ({ page }) => {
  await openBoard(page, 'home');
  await pressTo(page, 'Keyboards', 'Keyboards');
  await pressTo(page, 'QWERTY', 'QWERTY keyboard');
  await pressTo(page, '123', 'Numbers and symbols');
  const sizes = await page.evaluate(() =>
    ['ABC', 'Space', 'Clear'].map(
      (name) =>
        document.querySelector(`main button[aria-label="${name}"]`)?.getBoundingClientRect().width,
    ),
  );
  expect(sizes[0]).toBeGreaterThan(0);
  expect(Math.abs((sizes[0] ?? 0) - (sizes[2] ?? 0))).toBeLessThanOrEqual(2);
  await pressTo(page, 'ABC', 'QWERTY keyboard');
  await pressTo(page, 'Back', 'Keyboards');
  await pressTo(page, 'Back', 'Home');
});

test('Y6: the message is kept when the user goes home and comes back', async ({ page }) => {
  await openWithHi(page);
  await pressTo(page, 'Back', 'Home');
  await pressTo(page, 'Keyboards', 'Keyboards');
  await pressTo(page, 'QWERTY', 'QWERTY keyboard');
  await expect(message(page)).toHaveText('hi');
});

test('Y8: Tab reaches the thirty five cells in order and never a caregiver control', async ({
  page,
}) => {
  // In `scan` mode Tab stops on a group first. In `touch` mode it goes from cell to cell.
  await openBoard(page, 'keyboard', { selectionMode: 'touch' });
  // The message is named "Message" until something has been written.
  for (const name of ['Back', 'Message', ...KEY_NAMES]) {
    await page.keyboard.press('Tab');
    expect(await focusedName(page)).toBe(name);
  }
  await page.keyboard.press('Tab');
  expect(['Settings', 'Sign out']).not.toContain(await focusedName(page));
});

test('Y9: a long message stays inside its cell with its end in view', async ({ page }) => {
  await openBoard(page, 'keyboard');
  const letters = 'the quick brown fox jumps over the lazy dog and runs far away'.replace(/ /g, '');
  expect(letters.length).toBeGreaterThanOrEqual(48);
  for (const letter of [...letters, ...'abcdefghijkl'].slice(0, 60)) {
    await cell(page, letter).click();
  }
  await expect(message(page)).toHaveText(/^\w{60}$/);

  const boxes = await message(page).evaluate((button) => {
    const box = (element: Element | null) => {
      if (!element) {
        throw new Error('The message has no text or no caret.');
      }
      const { left, top, right, bottom } = element.getBoundingClientRect();
      return { left, top, right, bottom };
    };
    return {
      cell: box(button),
      text: box(button.querySelector('.text')),
      caret: box(button.querySelector('.caret')),
    };
  });
  const main = (await measure(page)).main;
  // The cell has not grown, and the box that clips the text lies inside it.
  expect(boxes.cell.bottom).toBeLessThanOrEqual(main.bottom + 0.5);
  expect(boxes.text.left).toBeGreaterThanOrEqual(boxes.cell.left);
  expect(boxes.text.right).toBeLessThanOrEqual(boxes.cell.right);
  expect(boxes.text.top).toBeGreaterThanOrEqual(boxes.cell.top);
  expect(boxes.text.bottom).toBeLessThanOrEqual(boxes.cell.bottom);
  // The caret marks the end of the text, and it lies inside the box that clips the text.
  expect(boxes.caret.left).toBeGreaterThanOrEqual(boxes.text.left);
  expect(boxes.caret.right).toBeLessThanOrEqual(boxes.text.right + 0.5);
  expect(boxes.caret.top).toBeGreaterThanOrEqual(boxes.text.top - 0.5);
  expect(boxes.caret.bottom).toBeLessThanOrEqual(boxes.text.bottom + 0.5);

  const scroll = await page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(scroll.width).toBeLessThanOrEqual(scroll.clientWidth);
  expect(scroll.height).toBeLessThanOrEqual(scroll.clientHeight);
});

test('Y10: the keyboard passes axe and each key keeps 4.5:1 in every theme', async ({ page }) => {
  test.slow();
  for (const theme of THEMES) {
    await openBoard(page, 'keyboard', { theme });
    expect(await axeViolations(page), theme).toEqual([]);
    const count = await cells(page).count();
    expect(count).toBe(35);
    for (let index = 0; index < count; index++) {
      const { ratio } = await readGlass(cells(page).nth(index));
      expect(ratio, `${theme} cell ${index}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('Y12: Keyboards lists the three keyboards as bleed tiles, and each one opens', async ({
  page,
}) => {
  await openBoard(page, 'home');
  await pressTo(page, 'Keyboards', 'Keyboards');
  await expect(page).toHaveURL(/\/board\/keyboards$/);
  expect(await cellNames(page)).toEqual(['Back', 'QWERTY', 'ABC', 'Vowels']);
  const titles = { QWERTY: 'QWERTY keyboard', ABC: 'ABC keyboard', Vowels: 'Vowel keyboard' };
  for (const [name, title] of Object.entries(titles)) {
    await expect(cell(page, name)).toHaveClass(/\bbleed\b/);
    await pressTo(page, name, title);
    await pressTo(page, 'Back', 'Keyboards');
  }
});

test('Y13: the ABC keyboard runs in the order of the alphabet, types, and gets its numbers back to itself', async ({
  page,
}) => {
  await openBoard(page, 'home');
  await pressTo(page, 'Keyboards', 'Keyboards');
  await pressTo(page, 'ABC', 'ABC keyboard');
  const layout = await measure(page);
  expectDirection(layout, 'rows');
  expect(layout.groups.map((group) => group.cells.map((item) => item.name))).toEqual([
    ['Back', 'Message'],
    [...'abcdefghij'],
    [...'klmnopqrs', 'Backspace'],
    ['Caps lock', ...'tuvwxyz', 'Full stop', 'Question mark'],
    ['123', 'Space', 'Clear'],
  ]);
  await press(page, 'h', 'i');
  await pressTo(page, '123', 'Numbers and symbols');
  await press(page, '2');
  await pressTo(page, 'ABC', 'ABC keyboard');
  await expect(message(page)).toHaveText('hi2');
  await pressTo(page, 'Back', 'Keyboards');
});

test('Y14: each letter row of the vowel keyboard starts with a vowel, and the keys type', async ({
  page,
}) => {
  await openBoard(page, 'home');
  await pressTo(page, 'Keyboards', 'Keyboards');
  await pressTo(page, 'Vowels', 'Vowel keyboard');
  const layout = await measure(page);
  expectDirection(layout, 'rows');
  expect(layout.groups.map((group) => group.cells.map((item) => item.name))).toEqual([
    ['Back', 'Message'],
    [...'abcd', 'Full stop', 'Backspace'],
    [...'efgh', 'Question mark', 'Caps lock'],
    [...'ijklmn'],
    [...'opqrst'],
    [...'uvwxyz'],
    ['123', 'Space', 'Clear'],
  ]);
  const keys = layout.groups.slice(1, 6).flatMap((group) => group.cells);
  for (const key of keys) {
    expect(Math.abs(key.box.width - keys[0].box.width), key.name).toBeLessThanOrEqual(2);
    expect(Math.abs(key.box.height - keys[0].box.height), key.name).toBeLessThanOrEqual(2);
  }
  await press(page, 'h', 'i', 'Full stop');
  await pressTo(page, '123', 'Numbers and symbols');
  await pressTo(page, 'ABC', 'Vowel keyboard');
  await expect(message(page)).toHaveText('hi.');
});
