import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';
import {
  LAYOUTS,
  SELECTION_MODES,
  THEMES,
  cell,
  cells,
  focusedName,
  measure,
  resolveColours,
  statusRegion,
  type StoredSettings,
} from './support/boards';
import { SIGNED_OUT_STATE } from './support/firebase';
import {
  POST_CLICK_DELAY,
  SCAN_TIME,
  axeWithClock,
  boardCells,
  cellAt,
  cellHost,
  grid,
  groups,
  holdAnimationsAt,
  marked,
  pass,
  pickByScan,
  pointAt,
  readBar,
  scanTo,
  switchKey,
  test,
  type OpenBoard,
} from './support/scan';

interface BoardEntry {
  id: string;
  title: string;
}

/** Every board of the app, read from the data file, so a new board is scanned by case K4 too. */
function isBoardEntry(value: unknown): value is BoardEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string'
  );
}

function readBoards(): BoardEntry[] {
  const file: unknown = JSON.parse(readFileSync('src/data/boards.json', 'utf8'));
  if (!Array.isArray(file) || !file.every(isBoardEntry)) {
    throw new Error('boards.json is not a list of boards with an id and a title.');
  }
  return file;
}

const ALL_BOARDS = readBoards();

const HOME_CELLS = ['My boards', 'Needs', 'Quick phrases', 'Keyboards'];
const DWELL_TIME = 1000;
const NOTHING = { groups: [], cells: [] };

const title = (page: Page) => page.locator('h1');
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Settings' });
const panel = (page: Page) => page.locator('dialog.panel');

/**
 * Picks every cell of a board with one switch, in the order of the data. A cell that opens
 * another screen is checked by the title of that screen, and the board is then opened again.
 * A cell that stays on the board must show the confirmed look.
 */
async function pickEveryCell(
  open: OpenBoard,
  id: string,
  boardTitle: string,
  stored: StoredSettings = {},
): Promise<{ opened: Record<string, string>; cellCount: number }> {
  const opened: Record<string, string> = {};
  let page = await open(id, boardTitle, stored);
  const names = await boardCells(page);
  for (const [group, groupNames] of names.entries()) {
    for (const [index, name] of groupNames.entries()) {
      await pickByScan(page, group, index);
      const shown = (await title(page).textContent()) ?? '';
      if (shown === boardTitle) {
        await expect(cellAt(page, group, index), name).toHaveAttribute('data-confirmed', '');
        // The scan starts again by itself at the first group.
        await pass(page, POST_CLICK_DELAY);
      } else {
        opened[name] = shown;
        page = await open(id, boardTitle, stored);
      }
    }
  }
  return { opened, cellCount: names.flat().length };
}

/** Whether a caregiver control is highlighted or holds the focus, and the tab index of each. */
async function caregiverControls(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-caregiver-control]')).map(
      (control) => ({
        scanned: control.hasAttribute('data-scan'),
        focused: document.activeElement === control,
        tabIndex: control.tabIndex,
      }),
    ),
  );
}

/** The settings button and the settings panel carry the mark. */
const UNTOUCHED = [
  { scanned: false, focused: false, tabIndex: -1 },
  { scanned: false, focused: false, tabIndex: -1 },
];

test('K1: single switch scanning reaches each of the four home cells', async ({ open }) => {
  test.slow();
  const page = await open('home', 'Home');
  const names = await boardCells(page);
  expect(names.flat()).toEqual(HOME_CELLS);
  for (const [group, groupNames] of names.entries()) {
    for (const [index, name] of groupNames.entries()) {
      const page = await open('home', 'Home');
      await pickByScan(page, group, index);
      // Each home cell opens the board of its own name.
      await expect(title(page)).toHaveText(name);
    }
  }
});

test('K2: single switch scanning reaches each of the thirteen cells of Needs in both layouts', async ({
  open,
}) => {
  test.slow();
  for (const layout of LAYOUTS) {
    const { opened, cellCount } = await pickEveryCell(open, 'needs', 'Needs', { layout });
    expect(opened, layout).toEqual({ Back: 'Home' });
    expect(cellCount, layout).toBe(13);
  }
});

test('K3: single switch scanning reaches each of the thirty five cells of the QWERTY keyboard', async ({
  open,
}) => {
  test.slow();
  const { opened, cellCount } = await pickEveryCell(open, 'keyboard', 'QWERTY keyboard');
  expect(opened).toEqual({ Back: 'Home', '123': 'Numbers and symbols' });
  expect(cellCount).toBe(35);

  const page = await open('keyboard', 'QWERTY keyboard');
  const names = await boardCells(page);
  for (const key of ['h', 'i']) {
    const group = names.findIndex((groupNames) => groupNames.includes(key));
    await pickByScan(page, group, names[group].indexOf(key));
    await pass(page, POST_CLICK_DELAY);
  }
  // The message is the second cell of the board.
  await expect(cells(page).nth(1)).toHaveText('hi');
});

test('K4: single switch scanning reaches a cell on every other board', async ({ open }) => {
  test.slow();
  const others = ALL_BOARDS.filter((board) => !['home', 'needs', 'keyboard'].includes(board.id));
  expect(others.length).toBeGreaterThan(0);
  for (const board of others) {
    const page = await open(board.id, board.title);
    const names = await boardCells(page);
    // The last cell of the last group is the one that the scan takes longest to reach.
    const group = names.length - 1;
    const index = names[group].length - 1;
    await scanTo(page, group, index);
    if (names[group].length > 1) {
      expect((await marked(page, 'data-scan')).cells, board.id).toEqual([names[group][index]]);
    }
    await switchKey(page, 'Enter');
    // The pick either stays on the board, with the cell confirmed, or opens another screen.
    await expect
      .poll(
        async () =>
          (await title(page).textContent()) !== board.title ||
          (await cellAt(page, group, index).getAttribute('data-confirmed')) !== null,
        { message: board.id },
      )
      .toBe(true);
  }
});

test('K5: the caregiver controls are never highlighted and never hold the focus', async ({
  open,
}) => {
  test.slow();
  const page = await open('home', 'Home');
  await switchKey(page, 'Enter');
  for (let second = 0; second < 20; second++) {
    expect(await caregiverControls(page), `second ${second}`).toEqual(UNTOUCHED);
    await pass(page, 1000);
  }
  for (const selectionMode of SELECTION_MODES) {
    const page = await open('home', 'Home', { selectionMode });
    for (let press = 1; press <= 12; press++) {
      await switchKey(page, 'Tab');
      expect(await caregiverControls(page), `${selectionMode} Tab ${press}`).toEqual(UNTOUCHED);
    }
  }
});

test.describe('on a device with no stored sign in', () => {
  test.use({ storageState: SIGNED_OUT_STATE });

  test('K6: the sign in screen is not scanned and keeps the tab order of the browser', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByLabel('Email').focus();
    await page.keyboard.press('Tab');
    await page.clock.runFor(5000);
    await expect(page.locator('[data-scan]')).toHaveCount(0);
    await expect(page.getByLabel('Password')).toBeFocused();
  });
});

test('K7: a press in the post click delay picks nothing, and the scan then starts again', async ({
  open,
}) => {
  const page = await open('quick-phrases', 'Quick phrases');
  const names = await boardCells(page);
  await pickByScan(page, 0, 1);
  const phrase = (await statusRegion(page).textContent())?.trim() ?? '';
  expect(phrase).not.toBe('');
  const told = await statusRegion(page).locator('span').elementHandle();

  await pass(page, 300);
  await switchKey(page, 'Enter');
  expect((await marked(page, 'data-confirmed')).cells).toEqual([names[0][1]]);
  await expect(grid(page)).toHaveAttribute('data-state', 'confirmed');
  // A second pick would draw the status text again.
  expect(await told?.evaluate((span) => span.isConnected)).toBe(true);

  await pass(page, 200);
  await expect(grid(page)).toHaveAttribute('data-state', 'groups');
  expect(await marked(page, 'data-scan')).toEqual({ groups: ['Column 1 of 3'], cells: [] });
  expect(await marked(page, 'data-confirmed')).toEqual(NOTHING);
});

test('K8: the highlighted group and the highlighted cell have an ink outline at least 4px wide', async ({
  open,
}) => {
  for (const theme of THEMES) {
    const page = await open('home', 'Home', { theme });
    await switchKey(page, 'Enter');
    const group = groups(page).first();
    await switchKeyAndCheckOutline(page, theme, group);
    await switchKey(page, 'Enter');
    await switchKeyAndCheckOutline(page, theme, cell(page, 'My boards'));
  }

  /** Checks the outline of what is highlighted. The colour fades in, so the test waits for it. */
  async function switchKeyAndCheckOutline(
    page: Page,
    theme: string,
    target: ReturnType<typeof cell>,
  ): Promise<void> {
    const [, ink] = await resolveColours(target, 'var(--ink)', 'var(--ink)');
    await expect
      .poll(() => target.evaluate((element) => getComputedStyle(element).outlineColor), {
        message: theme,
      })
      .toBe(ink);
    const outline = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });
    expect(outline.style, theme).toBe('solid');
    expect(outline.width, theme).toBeGreaterThanOrEqual(4);
  }
});

test('K9: axe reports no WCAG 2.2 Level AA violation in any scan state', async ({ open }) => {
  test.slow();
  for (const theme of THEMES) {
    for (const [id, boardTitle] of [
      ['home', 'Home'],
      ['needs', 'Needs'],
    ]) {
      // The clock runs while axe works, so the times are the longest that can be stored.
      const page = await open(id, boardTitle, { theme, scanTime: 5000, postClickDelay: 5000 });
      await switchKey(page, 'Enter');
      await expect(grid(page)).toHaveAttribute('data-state', 'groups');
      expect(await axeWithClock(page), `${theme} ${id} groups`).toEqual([]);
      await switchKey(page, 'Enter');
      await expect(grid(page)).toHaveAttribute('data-state', 'cells');
      expect(await axeWithClock(page), `${theme} ${id} cells`).toEqual([]);
      if (id === 'needs') {
        // A pick on the home screen opens a board at once, so the confirmed state is checked on
        // Needs, where the second cell of the first group is a phrase and the board stays open.
        await switchKey(page, 'Tab');
        await switchKey(page, 'Enter');
        await expect(grid(page)).toHaveAttribute('data-state', 'confirmed');
        expect(await axeWithClock(page), `${theme} needs confirmed`).toEqual([]);
      }
    }
  }
});

test('K10: the keyboard focus follows the highlight, and nothing holds it at rest', async ({
  open,
}) => {
  const page = await open('home', 'Home');
  await switchKey(page, 'Enter');
  expect(await focusedName(page)).toBe('Column 1 of 2');
  await pass(page, SCAN_TIME);
  expect(await focusedName(page)).toBe('Column 2 of 2');
  await switchKey(page, 'Enter');
  expect(await focusedName(page)).toBe('Quick phrases');
  await pass(page, SCAN_TIME);
  expect(await focusedName(page)).toBe('Keyboards');
  // The cells are scanned twice and the scan returns to the groups.
  await pass(page, 3 * SCAN_TIME);
  expect(await focusedName(page)).toBe('Column 2 of 2');
  // The groups are scanned twice and the scan goes to rest.
  await pass(page, 4 * SCAN_TIME);
  await expect(grid(page)).toHaveAttribute('data-state', 'rest');
  expect(await focusedName(page)).toBe('none');
});

test('K22: in touch mode Tab goes from cell to cell and Enter presses the focused cell', async ({
  open,
}) => {
  const page = await open('home', 'Home', { selectionMode: 'touch' });
  for (const name of HOME_CELLS) {
    await switchKey(page, 'Tab');
    expect(await focusedName(page)).toBe(name);
    expect(await marked(page, 'data-scan')).toEqual(NOTHING);
  }
  await switchKey(page, 'Enter');
  await expect(title(page)).toHaveText('Keyboards');
});

test('K11: a pointer press on a cell presses it and sends the scan to rest', async ({ open }) => {
  const page = await open('home', 'Home');
  await switchKey(page, 'Enter');
  await expect(grid(page)).toHaveAttribute('data-state', 'groups');
  await cell(page, 'Keyboards').click();
  await pass(page, 0);
  await expect(title(page)).toHaveText('Keyboards');
  await expect(grid(page)).toHaveAttribute('data-state', 'rest');
  expect(await marked(page, 'data-scan')).toEqual(NOTHING);
  expect(await focusedName(page)).toBe('none');
  // The scan stays at rest on the new board.
  await pass(page, 10 * SCAN_TIME);
  await expect(grid(page)).toHaveAttribute('data-state', 'rest');
});

test('K12: in step mode Tab moves, Enter picks and nothing moves by itself', async ({ open }) => {
  const page = await open('home', 'Home', { selectionMode: 'step' });
  await switchKey(page, 'Tab');
  expect(await focusedName(page)).toBe('Column 1 of 2');
  await switchKey(page, 'Tab');
  expect(await focusedName(page)).toBe('Column 2 of 2');
  await switchKey(page, 'Enter');
  expect(await focusedName(page)).toBe('Quick phrases');
  await switchKey(page, 'Tab');
  expect(await focusedName(page)).toBe('Keyboards');
  await switchKey(page, 'Enter');
  await expect(title(page)).toHaveText('Keyboards');
  // The scan starts again on the new board and then waits for a switch.
  await pass(page, POST_CLICK_DELAY);
  const afterDelay = await marked(page, 'data-scan');
  expect(afterDelay).toEqual({ groups: ['Column 1 of 2'], cells: [] });
  await pass(page, 10_000);
  expect(await marked(page, 'data-scan')).toEqual(afterDelay);
});

test('K23: in step mode Shift with Tab moves the highlight back', async ({ open }) => {
  const page = await open('home', 'Home', { selectionMode: 'step' });
  await switchKey(page, 'Tab');
  await switchKey(page, 'Tab');
  expect(await focusedName(page)).toBe('Column 2 of 2');
  await switchKey(page, 'Shift+Tab');
  expect(await focusedName(page)).toBe('Column 1 of 2');
});

test('K13: in cursor, touch and dwell mode nothing is highlighted and a click presses a cell', async ({
  open,
}) => {
  for (const selectionMode of ['cursor', 'touch', 'dwell'] as const) {
    const page = await open('home', 'Home', { selectionMode });
    for (let second = 0; second < 5; second++) {
      await pass(page, 1000);
      expect(await marked(page, 'data-scan'), selectionMode).toEqual(NOTHING);
    }
    await cell(page, 'Needs').click();
    await pass(page, 0);
    await expect(title(page), selectionMode).toHaveText('Needs');
    expect(await marked(page, 'data-scan'), selectionMode).toEqual(NOTHING);
  }
});

test('K14: a pointer that rests on a cell presses it once', async ({ open }) => {
  const page = await open('home', 'Home', { selectionMode: 'dwell', dwellTime: DWELL_TIME });
  await pointAt(page, cell(page, 'Needs'));
  expect((await marked(page, 'data-dwell')).cells).toEqual(['Needs']);
  await pass(page, DWELL_TIME);
  await expect(title(page)).toHaveText('Needs');
  // The pointer now lies on a cell of Needs and stays still.
  await pass(page, 5000);
  await expect(title(page)).toHaveText('Needs');
  await expect(statusRegion(page)).toHaveText('');
  expect((await marked(page, 'data-dwell')).cells).toEqual([]);
});

test('K15: a pointer that leaves a cell before the dwell time ends presses nothing', async ({
  open,
}) => {
  const page = await open('quick-phrases', 'Quick phrases', {
    selectionMode: 'dwell',
    dwellTime: DWELL_TIME,
  });
  const names = await boardCells(page);
  await pointAt(page, cell(page, names[1][1]));
  expect((await marked(page, 'data-dwell')).cells).toEqual([names[1][1]]);
  await pass(page, 600);
  await pointAt(page, title(page));
  await pass(page, 2000);
  await expect(statusRegion(page)).toHaveText('');
  expect((await marked(page, 'data-dwell')).cells).toEqual([]);
  await expect(title(page)).toHaveText('Quick phrases');
});

test('K16: a pointer that moves after the post click delay dwells on the same cell again', async ({
  open,
}) => {
  const page = await open('keyboard', 'QWERTY keyboard', {
    selectionMode: 'dwell',
    dwellTime: DWELL_TIME,
  });
  const message = cells(page).nth(1);
  // The message takes the name of what is written, so the key is found by its place.
  const names = await boardCells(page);
  const row = names.findIndex((rowNames) => rowNames.includes('l'));
  const key = cellAt(page, row, names[row].indexOf('l'));
  await pointAt(page, key);
  await pass(page, DWELL_TIME);
  await expect(message).toHaveText('l');
  await pass(page, 600);
  await pointAt(page, key, 3);
  await pass(page, DWELL_TIME);
  await expect(message).toHaveText('ll');
});

test('K17: in the grow style the cell grows above its neighbours, and no other cell moves', async ({
  open,
}) => {
  const page = await open('home', 'Home', {
    selectionMode: 'dwell',
    dwellTime: DWELL_TIME,
    dwellStyle: 'grow',
  });
  const before = (await measure(page)).groups.flatMap((group) => group.cells);
  await pointAt(page, cell(page, 'Needs'));
  await pass(page, 500);
  await holdAnimationsAt(page, 500);
  const after = (await measure(page)).groups.flatMap((group) => group.cells);
  for (const [index, item] of after.entries()) {
    const was = before[index].box;
    if (item.name === 'Needs') {
      // Half way through the dwell time the cell has grown by half of the 8 percent.
      expect(item.box.width / was.width).toBeCloseTo(1.04, 2);
      expect(item.box.height / was.height).toBeCloseTo(1.04, 2);
    } else {
      expect(item.box, item.name).toEqual(was);
    }
  }
  // The grown cell is drawn above the cell next to it, which comes later in the page.
  const onTop = await cell(page, 'Needs').evaluate((button) => {
    const box = button.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.bottom - 1);
    return top !== null && button.contains(top);
  });
  expect(onTop).toBe(true);
});

test('K18: in the bar style a bar fills across the bottom of the cell in every theme', async ({
  open,
}) => {
  for (const theme of THEMES) {
    const page = await open('home', 'Home', {
      selectionMode: 'dwell',
      dwellTime: DWELL_TIME,
      dwellStyle: 'bar',
      theme,
    });
    await pointAt(page, cell(page, 'Needs'));
    await pass(page, 500);
    await holdAnimationsAt(page, 500);
    const bar = await readBar(cell(page, 'Needs'), 'cell');
    expect(bar.filled, theme).toBeCloseTo(0.5, 2);
    expect(bar.contrast, theme).toBeGreaterThanOrEqual(3);
    // The bar lies across the bottom of the cell, inside it.
    const place = await cell(page, 'Needs').evaluate((button) => {
      const bar = getComputedStyle(button, '::after');
      return {
        bottom: parseFloat(bar.bottom),
        height: parseFloat(bar.height),
        width: parseFloat(bar.width),
        cell: button.getBoundingClientRect(),
      };
    });
    expect(place.bottom, theme).toBeGreaterThanOrEqual(0);
    expect(place.bottom + place.height, theme).toBeLessThan(place.cell.height / 4);
    expect(place.width, theme).toBeGreaterThan(place.cell.width / 2);
  }
});

test('K20: a dwell never presses the settings button', async ({ open }) => {
  const page = await open('home', 'Home', { selectionMode: 'dwell', dwellTime: DWELL_TIME });
  await pointAt(page, settingsButton(page));
  await pass(page, 5000);
  await expect(page.locator('[data-dwell]')).toHaveCount(0);
  await expect(panel(page)).not.toHaveAttribute('open');
  await expect(title(page)).toHaveText('Home');
});

test('K21: axe reports no WCAG 2.2 Level AA violation while a dwell runs', async ({ open }) => {
  test.slow();
  for (const dwellStyle of ['grow', 'bar'] as const) {
    for (const theme of THEMES) {
      // The clock runs while axe works, so the dwell time is the longest that can be stored.
      const page = await open('home', 'Home', {
        selectionMode: 'dwell',
        dwellTime: 5000,
        dwellStyle,
        theme,
      });
      await pointAt(page, cell(page, 'Needs'));
      await pass(page, 500);
      await expect(cellHost(page, 'Needs')).toHaveAttribute('data-dwell', dwellStyle);
      expect(await axeWithClock(page), `${dwellStyle} ${theme}`).toEqual([]);
    }
  }
});

test('K24 and K25: the scan time bar empties on the highlighted group and starts full on the next', async ({
  open,
}) => {
  for (const theme of THEMES) {
    const page = await open('home', 'Home', {
      selectionMode: 'scan',
      showProgressBar: true,
      theme,
    });
    await switchKey(page, 'Enter');
    await pass(page, 500);
    await holdAnimationsAt(page, 500);
    const first = await readBar(groups(page).nth(0), 'track');
    expect(first.filled, theme).toBeCloseTo(0.5, 2);
    expect(first.contrast, theme).toBeGreaterThanOrEqual(3);
    expect((await readBar(groups(page).nth(1), 'track')).animation, theme).toBe('none');

    // Case K25: the highlight moves at 1000 ms, and the bar of the second column is then 250 ms old.
    await pass(page, 500);
    await pass(page, 250);
    await holdAnimationsAt(page, 250);
    const second = await readBar(groups(page).nth(1), 'track');
    expect(second.filled, theme).toBeCloseTo(0.75, 2);
    expect((await readBar(groups(page).nth(0), 'track')).animation, theme).toBe('none');
  }
});

test('K26: no bar is drawn while a cell shows the confirmed look', async ({ open }) => {
  const page = await open('quick-phrases', 'Quick phrases', {
    selectionMode: 'scan',
    showProgressBar: true,
  });
  await scanTo(page, 0, 1);
  expect((await readBar(cell(page, (await boardCells(page))[0][1]), 'cell')).animation).toBe(
    'scan-bar',
  );
  await switchKey(page, 'Enter');
  await expect(grid(page)).toHaveAttribute('data-state', 'confirmed');
  expect(await marked(page, 'data-scan-bar')).toEqual(NOTHING);
  expect((await readBar(cell(page, (await boardCells(page))[0][1]), 'cell')).animation).toBe(
    'none',
  );
});

test('K27: the bar is still drawn and still empties for people who ask for less motion', async ({
  open,
}) => {
  const page = await open('home', 'Home', { selectionMode: 'scan', showProgressBar: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await switchKey(page, 'Enter');
  const atStart = await readBar(groups(page).nth(0), 'track');
  expect(atStart.animation).toBe('scan-bar');
  expect(atStart.seconds).toBe(SCAN_TIME / 1000);
  await holdAnimationsAt(page, 0);
  expect((await readBar(groups(page).nth(0), 'track')).filled).toBeCloseTo(1, 2);
  await holdAnimationsAt(page, 900);
  expect((await readBar(groups(page).nth(0), 'track')).filled).toBeCloseTo(0.1, 2);
});

test('K32: the bar of a group and the bar of a cell are as tall as each other', async ({
  open,
}) => {
  const page = await open('home', 'Home', { selectionMode: 'scan', showProgressBar: true });
  const barHeight = (target: Locator) =>
    target.evaluate((element) => getComputedStyle(element, '::after').height);
  await switchKey(page, 'Enter');
  const ofGroup = await barHeight(groups(page).nth(0));
  await switchKey(page, 'Enter');
  await expect(cellAt(page, 0, 0)).toHaveAttribute('data-scan-bar', '');
  const ofCell = await barHeight(cell(page, 'My boards'));
  expect(parseFloat(ofGroup)).toBeGreaterThan(0);
  expect(ofCell).toBe(ofGroup);
});

test('K28: the progress bar is hidden by default, on a group and on a cell', async ({ open }) => {
  for (const layout of LAYOUTS) {
    const page = await open('needs', 'Needs', { selectionMode: 'scan', layout });
    const before = await measure(page);
    await switchKey(page, 'Enter');
    await expect(grid(page)).toHaveAttribute('data-state', 'groups');
    expect(await marked(page, 'data-scan-bar'), layout).toEqual(NOTHING);
    expect((await readBar(groups(page).nth(0), 'track')).animation, layout).toBe('none');
    await switchKey(page, 'Enter');
    await expect(grid(page)).toHaveAttribute('data-state', 'cells');
    expect(await marked(page, 'data-scan-bar'), layout).toEqual(NOTHING);
    expect((await readBar(cell(page, 'Back'), 'cell')).animation, layout).toBe('none');
    // No room is kept for the bar, and the highlight moves no cell.
    const room = await groups(page)
      .first()
      .evaluate((group) => parseFloat(getComputedStyle(group).paddingBottom));
    expect(room, layout).toBe(0);
    expect((await measure(page)).groups, layout).toEqual(before.groups);
  }
});

test('K29: with the progress bar shown each group keeps room for it, and the highlight moves no cell', async ({
  open,
}) => {
  for (const layout of LAYOUTS) {
    const page = await open('needs', 'Needs', {
      selectionMode: 'scan',
      showProgressBar: true,
      layout,
    });
    const before = await measure(page);
    const room = await groups(page)
      .first()
      .evaluate((group) => parseFloat(getComputedStyle(group).paddingBottom));
    expect(room, layout).toBeGreaterThan(0);
    await switchKey(page, 'Enter');
    expect((await marked(page, 'data-scan-bar')).groups, layout).toHaveLength(1);
    expect((await measure(page)).groups, layout).toEqual(before.groups);
    await switchKey(page, 'Enter');
    expect((await marked(page, 'data-scan-bar')).cells, layout).toEqual(['Back']);
    expect((await measure(page)).groups, layout).toEqual(before.groups);
  }
});

test('K30: in cursor mode a round cursor follows the pointer over the whole page, and a click presses', async ({
  open,
}) => {
  const page = await open('home', 'Home', { selectionMode: 'cursor' });
  const cursor = page.locator('main .cursor');
  await expect(cursor).toHaveCount(0);
  // The cursor is drawn on the cells and off the grid too, on the title and on a caregiver control.
  for (const target of [cell(page, 'My boards'), title(page), settingsButton(page)]) {
    const box = await target.boundingBox();
    if (!box) {
      throw new Error('The element to point at is not on the page.');
    }
    const x = Math.round(box.x + box.width / 3);
    const y = Math.round(box.y + box.height / 3);
    await page.mouse.move(x, y);
    await pass(page, 0);
    const ring = await cursor.evaluate((element) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return {
        x: left + width / 2,
        y: top + height / 2,
        width,
        height,
        radius: getComputedStyle(element).borderRadius,
      };
    });
    // The cursor is a circle with its middle at the pointer.
    expect(ring.x).toBeCloseTo(x, 0);
    expect(ring.y).toBeCloseTo(y, 0);
    expect(ring.width).toBeCloseTo(ring.height, 0);
    expect(ring.radius).toBe('50%');
    // The arrow of the system is hidden under it.
    expect(await target.evaluate((element) => getComputedStyle(element).cursor)).toBe('none');
    // The cursor is drawn above everything, and does not take the press from what is under it.
    const under = await page.evaluate(
      // An icon is an svg element, whose className is not a text, so the attribute is read.
      ([px, py]) => document.elementFromPoint(px, py)?.getAttribute('class') ?? '',
      [x, y] as const,
    );
    expect(under).not.toContain('cursor');
  }
  expect(await marked(page, 'data-scan')).toEqual(NOTHING);
  await cell(page, 'Keyboards').click();
  await pass(page, 0);
  await expect(title(page)).toHaveText('Keyboards');
  await expect(cursor).toHaveCount(1);
});

test('K31: no round cursor is drawn in the other selection modes', async ({ open }) => {
  for (const selectionMode of ['scan', 'step', 'touch', 'dwell'] as const) {
    const page = await open('home', 'Home', { selectionMode });
    await pointAt(page, cell(page, 'My boards'));
    await expect(page.locator('main .cursor'), selectionMode).toHaveCount(0);
    expect(
      await cell(page, 'My boards').evaluate((button) => getComputedStyle(button).cursor),
      selectionMode,
    ).toBe('pointer');
  }
});
