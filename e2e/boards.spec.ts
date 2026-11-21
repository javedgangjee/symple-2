import { expect } from '@playwright/test';
import { axeViolations } from './support/axe';
import {
  BOARDS,
  FIXED_LAYOUTS,
  LAYOUTS,
  NEEDS_LABELS,
  THEMES,
  askForLessTransparency,
  cell,
  cellNames,
  cells,
  expectDirection,
  focusedName,
  measure,
  openBoard,
  readGlass,
  resolveColours,
  statusRegion,
  type LayoutName,
} from './support/boards';
import { test } from './support/firebase';
import { storeAndReload } from './support/scan';

const BOARD_IDS = Object.keys(BOARDS);
const MY_BOARDS = [
  'Food',
  'Drinks',
  'Feelings',
  'People',
  'Places',
  'Activities',
  'Yes or no',
  'Core words',
];
const FOOD = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Fruit', 'Soup', 'Bread', 'Something sweet'];

/** The layout a board is drawn in: its own when it fixes one, and the stored one when it does not. */
const drawnLayout = (id: string, stored: LayoutName): LayoutName => FIXED_LAYOUTS[id] ?? stored;

test('B1: Needs opens from home with Back and the twelve cells', async ({ page }) => {
  await openBoard(page, 'home');
  await cell(page, 'Needs').click();
  await expect(page).toHaveURL(/\/board\/needs$/);
  await expect(page.locator('h1')).toHaveText('Needs');
  await expect(page.locator('main .group')).toHaveCount(3);
  expect(await cellNames(page)).toEqual(['Back', ...NEEDS_LABELS]);
});

test('B2: Needs is drawn as columns or as rows, with equal cells in each group', async ({
  page,
}) => {
  for (const stored of LAYOUTS) {
    await openBoard(page, 'needs', stored === 'rows' ? { layout: stored } : {});
    const layout = await measure(page);
    expect(layout.groups.map((group) => group.cells.length)).toEqual([5, 4, 4]);
    expectDirection(layout, stored);

    const sameSize = (boxes: { width: number; height: number }[]) => {
      for (const box of boxes) {
        expect(Math.abs(box.width - boxes[0].width), stored).toBeLessThanOrEqual(2);
        expect(Math.abs(box.height - boxes[0].height), stored).toBeLessThanOrEqual(2);
      }
    };
    sameSize([...layout.groups[1].cells, ...layout.groups[2].cells].map((item) => item.box));
    sameSize(layout.groups[0].cells.map((item) => item.box));
  }
});

test('B3: every symbol image on the sample boards loads from the app itself with empty alt text', async ({
  page,
  baseURL,
}) => {
  const host = new URL(baseURL ?? '').host;
  let seen = 0;
  for (const id of BOARD_IDS) {
    await openBoard(page, id);
    const images = page.locator('main img');
    const count = await images.count();
    for (let index = 0; index < count; index++) {
      const image = images.nth(index);
      await expect(image, id).toHaveJSProperty('complete', true);
      const read = await image.evaluate((img: HTMLImageElement) => ({
        width: img.naturalWidth,
        host: new URL(img.currentSrc || img.src).host,
        alt: img.getAttribute('alt'),
      }));
      expect(read, id).toEqual({ width: expect.any(Number), host, alt: '' });
      expect(read.width, id).toBeGreaterThan(0);
    }
    seen += count;
  }
  // Of the sample boards, Needs has twelve symbols and Core words has thirty six.
  expect(seen).toBe(48);
});

test('B4: pressing Help tells screen readers the phrase and changes nothing on screen', async ({
  page,
}) => {
  await openBoard(page, 'needs');
  const help = cell(page, 'Help');
  const fill = () => help.evaluate((button) => getComputedStyle(button).backgroundColor);
  const before = await fill();
  const url = page.url();
  await help.click();
  await expect(statusRegion(page)).toHaveText('I need help');
  // Any colour change would fade in, so the test gives it time to show.
  await page.waitForTimeout(300);
  expect(await fill()).toBe(before);
  expect(page.url()).toBe(url);
});

test('B17: a press on a symbol that moves a little before release still counts', async ({
  page,
}) => {
  await openBoard(page, 'needs');
  const image = cell(page, 'Pain').locator('img');
  await expect(image).toHaveJSProperty('draggable', false);
  const box = await image.boundingBox();
  if (!box) {
    throw new Error('The Pain symbol has no box.');
  }
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y + 8, { steps: 6 });
  await page.mouse.up();
  await expect(statusRegion(page)).toHaveText('I am in pain');
});

test('B5: Back on Needs shows home', async ({ page }) => {
  await openBoard(page, 'home');
  await cell(page, 'Needs').click();
  await expect(page.locator('h1')).toHaveText('Needs');
  await cell(page, 'Back').click();
  await expect(page.locator('h1')).toHaveText('Home');
  await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
});

test('B6: Back goes one screen at a time from Food to My boards to home', async ({ page }) => {
  await openBoard(page, 'home');
  await cell(page, 'My boards').click();
  await expect(page.locator('h1')).toHaveText('My boards');
  expect(await cellNames(page)).toEqual(['Back', ...MY_BOARDS]);
  await cell(page, 'Food').click();
  await expect(page.locator('h1')).toHaveText('Food');
  expect(await cellNames(page)).toEqual(['Back', ...FOOD]);
  await cell(page, 'Back').click();
  await expect(page.locator('h1')).toHaveText('My boards');
  await cell(page, 'Back').click();
  await expect(page.locator('h1')).toHaveText('Home');
});

test('B16: Yes is green and No is red in every theme', async ({ page }) => {
  for (const theme of THEMES) {
    await openBoard(page, 'yes-no', { theme });
    expect(await cellNames(page)).toEqual(['Back', 'Yes', 'No']);
    const [yes, green] = await resolveColours(
      cell(page, 'Yes'),
      'var(--bg)',
      'oklch(0.43 0.12 150)',
    );
    const [no, red] = await resolveColours(cell(page, 'No'), 'var(--bg)', 'oklch(0.43 0.16 27)');
    expect(yes, theme).toBe(green);
    expect(no, theme).toBe(red);
    for (const name of ['Yes', 'No']) {
      const { ratio } = await readGlass(cell(page, name));
      expect(ratio, `${theme} ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  }
  await cell(page, 'Yes').click();
  await expect(statusRegion(page)).toHaveText('Yes');
});

test('B7: Back on a board opened by its address, and an unknown board, both show home', async ({
  page,
}) => {
  await page.goto('/board/food');
  await expect(page.locator('h1')).toHaveText('Food');
  await cell(page, 'Back').click();
  await expect(page.locator('h1')).toHaveText('Home');
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/board/nope');
  await expect(page.locator('h1')).toHaveText('Home');
  await expect(page).toHaveURL(/\/$/);
});

test('B8: Tab reaches the thirteen cells of Needs in order and never a caregiver control', async ({
  page,
}) => {
  for (const layout of LAYOUTS) {
    await openBoard(page, 'needs', layout === 'rows' ? { layout } : {});
    // In `scan` mode Tab stops on a group first. In `touch` mode it goes from cell to cell.
    await storeAndReload(page, { selectionMode: 'touch' });
    for (const name of ['Back', ...NEEDS_LABELS]) {
      await page.keyboard.press('Tab');
      expect(await focusedName(page), layout).toBe(name);
    }
    await page.keyboard.press('Tab');
    expect(['Settings', 'Sign out'], layout).not.toContain(await focusedName(page));
  }
});

test('B9: each sample board fills the main area, does not scroll and cuts off no label', async ({
  page,
}) => {
  test.slow();
  for (const id of BOARD_IDS) {
    for (const stored of LAYOUTS) {
      const label = `${id} ${stored}`;
      await openBoard(page, id, stored === 'rows' ? { layout: stored } : {});
      await page.evaluate(() => document.fonts.ready);
      const layout = await measure(page);
      const { main, groups } = layout;
      const gap = main.top - layout.header.bottom;
      const columns = drawnLayout(id, stored) === 'columns';
      // A group keeps room under its cells for the scan time bar when the bar is shown.
      // The bar is hidden by default, and the room is then nothing.
      const barRoom = await page
        .locator('main .group')
        .first()
        .evaluate((group) => parseFloat(getComputedStyle(group).paddingBottom));

      const scroll = await page.evaluate(() => ({
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
      }));
      expect(scroll.width, label).toBeLessThanOrEqual(scroll.clientWidth);
      expect(scroll.height, label).toBeLessThanOrEqual(scroll.clientHeight);

      // The groups fill the main area along their line, with only the gaps left over.
      const alongGroups = groups.reduce(
        (sum, group) => sum + (columns ? group.box.width : group.box.height),
        0,
      );
      const mainAlong = columns ? main.width : main.height;
      expect(Math.abs(alongGroups + gap * (groups.length - 1) - mainAlong), label).toBeLessThan(1);

      for (const group of groups) {
        // Each group spans the main area the other way.
        const across = columns ? group.box.height : group.box.width;
        expect(Math.abs(across - (columns ? main.height : main.width)), label).toBeLessThan(1);

        // The cells fill their group, with only the gaps and the room for the bar left over.
        // The room is under the cells, so it is along the line of a column and across a row.
        const alongCells = group.cells.reduce(
          (sum, item) => sum + (columns ? item.box.height : item.box.width),
          0,
        );
        const groupAlong = columns ? group.box.height - barRoom : group.box.width;
        expect(
          Math.abs(alongCells + gap * (group.cells.length - 1) - groupAlong),
          label,
        ).toBeLessThan(1);

        for (const item of group.cells) {
          const cellAcross = columns ? item.box.width : item.box.height;
          const groupAcross = columns ? group.box.width : group.box.height - barRoom;
          expect(Math.abs(cellAcross - groupAcross), `${label} ${item.name}`).toBeLessThan(1);
          expect(item.box.left, `${label} ${item.name}`).toBeGreaterThanOrEqual(main.left - 0.5);
          expect(item.box.top, `${label} ${item.name}`).toBeGreaterThanOrEqual(main.top - 0.5);
          expect(item.box.right, `${label} ${item.name}`).toBeLessThanOrEqual(main.right + 0.5);
          expect(item.box.bottom, `${label} ${item.name}`).toBeLessThanOrEqual(main.bottom + 0.5);
        }
      }

      // A label is cut off when a word is wider than its box, when it sticks out of its cell,
      // or when it clips its own text.
      const cutOff = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main button .label'))
          .filter((element) => {
            const button = element.closest('button');
            if (!button) {
              return true;
            }
            const inner = element.getBoundingClientRect();
            const outer = button.getBoundingClientRect();
            return (
              element.scrollWidth > element.clientWidth + 1 ||
              (getComputedStyle(element).overflow !== 'visible' &&
                element.scrollHeight > element.clientHeight + 1) ||
              inner.left < outer.left - 0.5 ||
              inner.right > outer.right + 0.5 ||
              inner.top < outer.top - 0.5 ||
              inner.bottom > outer.bottom + 0.5
            );
          })
          .map((element) => element.textContent ?? ''),
      );
      expect(cutOff, label).toEqual([]);
    }
  }
});

test('B10: one gap size is used between cells, between groups and under the header', async ({
  page,
}) => {
  test.slow();
  for (const id of BOARD_IDS) {
    for (const stored of LAYOUTS) {
      const label = `${id} ${stored}`;
      await openBoard(page, id, stored === 'rows' ? { layout: stored } : {});
      const layout = await measure(page);
      const gap = layout.main.top - layout.header.bottom;
      const columns = drawnLayout(id, stored) === 'columns';
      expect(gap, label).toBeGreaterThan(0);

      for (let index = 1; index < layout.groups.length; index++) {
        const previous = layout.groups[index - 1].box;
        const next = layout.groups[index].box;
        const between = columns ? next.left - previous.right : next.top - previous.bottom;
        expect(Math.abs(between - gap), label).toBeLessThan(0.5);
      }
      for (const group of layout.groups) {
        for (let index = 1; index < group.cells.length; index++) {
          const previous = group.cells[index - 1].box;
          const next = group.cells[index].box;
          const between = columns ? next.top - previous.bottom : next.left - previous.right;
          expect(Math.abs(between - gap), label).toBeLessThan(0.5);
        }
      }
    }
  }
});

test('B11: axe reports no WCAG 2.2 Level AA violations on any sample board', async ({ page }) => {
  // The scan covers each sample board in both layouts, so it needs more time than the other tests.
  test.setTimeout(240_000);
  for (const stored of LAYOUTS) {
    const layout = stored === 'rows' ? { layout: stored } : {};
    for (const id of BOARD_IDS) {
      await openBoard(page, id, { ...layout, theme: 'blue' });
      expect(await axeViolations(page), `${id} blue ${stored}`).toEqual([]);
    }
    for (const theme of THEMES) {
      for (const id of ['home', 'needs']) {
        await openBoard(page, id, { ...layout, theme });
        expect(await axeViolations(page), `${id} ${theme} ${stored}`).toEqual([]);
      }
    }
  }
});

test('B12: the Needs labels and the Back tile keep 4.5:1 in every theme', async ({ page }) => {
  for (const theme of THEMES) {
    await openBoard(page, 'needs', { theme });
    for (const name of NEEDS_LABELS) {
      const { ratio } = await readGlass(cell(page, name));
      expect(ratio, `${theme} ${name}`).toBeGreaterThanOrEqual(4.5);
    }
    const back = cell(page, 'Back');
    const [fill, ink] = await resolveColours(back, 'var(--bg)', 'var(--ink)');
    expect(fill, theme).toBe(ink);
    expect((await readGlass(back)).ratio, `${theme} Back`).toBeGreaterThanOrEqual(4.5);
  }
});

test('B13: the cells are solid with no blur when less transparency is asked for', async ({
  page,
}) => {
  await askForLessTransparency(page);
  for (const id of ['home', 'needs']) {
    await openBoard(page, id);
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches),
    ).toBe(true);
    const count = await cells(page).count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      const reading = await readGlass(cells(page).nth(index));
      expect(reading.alpha, `${id} cell ${index}`).toBe(255);
      expect(reading.backdropFilter, `${id} cell ${index}`).toBe('none');
      expect(reading.ratio, `${id} cell ${index}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('B14: the label of Help uses Libre Franklin', async ({ page }) => {
  await openBoard(page, 'needs');
  await page.waitForFunction(() =>
    Array.from(document.fonts).some(
      (font) => font.family.replace(/["']/g, '') === 'Libre Franklin' && font.status === 'loaded',
    ),
  );
  const family = await cell(page, 'Help')
    .locator('.label')
    .evaluate((label) =>
      getComputedStyle(label).fontFamily.split(',')[0].replace(/["']/g, '').trim(),
    );
  expect(family).toBe('Libre Franklin');
});

test('B18: the licence of the Material icons is served', async ({ request }) => {
  const response = await request.get('/licenses/material-icons.txt');
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toContain('Apache License');
  expect(text).toContain('Version 2.0');
});

test('B15: the symbol credit is served', async ({ request }) => {
  const response = await request.get('/symbols/ATTRIBUTION.txt');
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toContain('Mulberry');
  expect(text).toContain('Creative Commons Attribution-ShareAlike 4.0');
});
