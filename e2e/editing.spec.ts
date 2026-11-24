import { expect, type Locator, type Page } from '@playwright/test';
import { axeViolations } from './support/axe';
import {
  THEMES,
  cell,
  cellBoxes,
  cellsByGroup,
  editAction,
  expectDirection,
  measure,
  openBoard,
  readStoredSet,
  setWith,
  startEditing,
  tool,
} from './support/boards';
import { drawnContrast } from './support/contrast';
import { test } from './support/firebase';
import { SCAN_TIME, marked, pass, pickByScan, switchKey } from './support/scan';
import { spokenTexts } from './support/speech';

/** The five buttons of edit mode in the footer, in their order. */
const ACTIONS = ['Add column', 'Add Board', 'Add Tile', 'Configure Board', 'Done'];

/** The scan time and the post click delay that the scan helpers move the clock by. */
const SCAN = { scanTime: SCAN_TIME, postClickDelay: 500 } as const;

const title = (page: Page) => page.locator('h1');
const sheet = (page: Page) => page.locator('dialog.sheet[open]');
const footerButtons = (page: Page) => page.locator('app-footer button');

/** The tile of a cell that speaks "Juice", and the Needs board with that cell at the end of its second group. */
const JUICE = {
  id: 'e2e-juice',
  label: 'Juice',
  colour: 'light',
  style: 'symbol',
  symbol: 'drink.svg',
  action: { type: 'speak', phrase: 'Juice' },
};
const needsWithJuice = () =>
  setWith(
    'needs',
    (board) => ({
      ...board,
      groups: board.groups.map((group, index) =>
        index === 1 ? { cells: [...group.cells, { tile: JUICE.id }] } : group,
      ),
    }),
    [JUICE],
  );

/** The Needs board with a fourth group, which is empty. */
const needsWithEmptyColumn = () =>
  setWith('needs', (board) => ({ ...board, groups: [...board.groups, { cells: [] }] }));

/** Opens a board and turns edit mode on. */
async function edit(page: Page, id: string, stored = {}): Promise<void> {
  await openBoard(page, id, stored);
  await startEditing(page);
}

/** The middle of a cell. A cell is inert in edit mode, so a test presses and drags it by its place. */
async function middleOf(page: Page, name: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(`main app-cell button[aria-label="${name}"]`).boundingBox();
  if (!box) {
    throw new Error(`The cell "${name}" is not on the page.`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Presses a cell in edit mode, which picks it up or puts the picked cell in its place. */
async function pressCell(page: Page, name: string): Promise<void> {
  const { x, y } = await middleOf(page, name);
  await page.mouse.click(x, y);
}

/** Fills in the tile dialog for a new cell that speaks and adds the cell. */
async function addTile(page: Page, label: string, symbol?: string): Promise<void> {
  await editAction(page, 'Add Tile').click();
  await sheet(page).getByLabel('Label').fill(label);
  if (symbol) {
    await sheet(page).getByLabel('Find a symbol').fill(symbol);
    const named = new RegExp(`^\\s*${symbol}\\s*$`);
    await sheet(page).locator('.symbols label').filter({ hasText: named }).click();
  }
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
}

/** Takes over the clock of the page and stops it, so the scan moves only when the test moves the time. */
async function stopClock(page: Page): Promise<void> {
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2000);
}

/** Takes the focus off whatever holds it. */
async function blur(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

/** The controls that are smaller than 48px in either direction, among those that match a selector. */
async function smallControls(target: Locator, selector: string): Promise<string[]> {
  return target.evaluate(
    (root, controls) =>
      Array.from(root.querySelectorAll(controls)).flatMap((control) => {
        const { width, height } = control.getBoundingClientRect();
        if (width === 0 && height === 0) {
          return [];
        }
        const name = (control.getAttribute('aria-label') ?? control.textContent ?? '').trim();
        return width < 48 || height < 48 ? [`${name}: ${width} by ${height}`] : [];
      }),
    selector,
  );
}

test('ED1: Edit boards closes the panel and shows the edit buttons, with the cells the same size as before', async ({
  page,
}) => {
  await openBoard(page, 'needs');
  const before = await cellBoxes(page);
  await startEditing(page);
  for (const name of ['Help', 'Pain', 'Glasses']) {
    await expect(tool(page, `Edit ${name}`)).toBeVisible();
    await expect(tool(page, `Remove ${name}`)).toBeVisible();
  }
  await expect(page.locator('main .tool.edit')).toHaveCount(12);
  await expect(page.locator('main .tool.remove')).toHaveCount(12);
  await expect(footerButtons(page)).toHaveText(ACTIONS);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  expect(await cellBoxes(page)).toEqual(before);
});

test('ED2: a tile that is added with a label and a symbol is on Needs after a reload', async ({
  page,
}) => {
  await edit(page, 'needs');
  await addTile(page, 'Juice', 'drink');
  await expect(cell(page, 'Juice')).toBeVisible();
  await editAction(page, 'Done').click();
  await page.reload();
  await expect(title(page)).toHaveText('Needs');
  await expect(cell(page, 'Juice')).toBeVisible();
  expect((await cellsByGroup(page))[1]).toEqual(['Eat', 'Medicine', 'Hot', 'Blanket', 'Juice']);
  await expect(cell(page, 'Juice').locator('img')).toHaveAttribute('src', 'symbols/drink.svg');
});

test('ED3: the scan reaches the added tile and speaks it, and never lands on an edit control', async ({
  page,
}) => {
  await openBoard(page, 'needs', { ...SCAN, set: needsWithJuice() });
  await stopClock(page);
  await pickByScan(page, 1, 4);
  expect((await marked(page, 'data-confirmed')).cells).toEqual(['Juice']);
  expect(await spokenTexts(page)).toEqual(['Juice']);
  // The scan starts again after the pick. Every stop of its next two rounds is a group of the board.
  const stops: string[] = [];
  for (let step = 0; step < 8; step++) {
    await pass(page, SCAN_TIME);
    stops.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        return !active || active === document.body || active.matches('.group, app-cell button')
          ? 'board'
          : active.outerHTML;
      }),
    );
  }
  expect(stops.filter((stop) => stop !== 'board')).toEqual([]);
  await expect(page.locator('main .tool')).toHaveCount(0);
});

test('ED4: a board that is added from home opens in edit mode with its title and a Back cell', async ({
  page,
}) => {
  await edit(page, 'home');
  await editAction(page, 'Add Board').click();
  await expect(sheet(page).getByRole('heading')).toHaveText('Add Board');
  await sheet(page).getByLabel('Name').fill('Outings');
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();
  await tool(page, 'Open Outings').click();
  await expect(title(page)).toHaveText('Outings');
  await expect(footerButtons(page)).toHaveText(ACTIONS);
  expect(await cellsByGroup(page)).toEqual([['Back'], [], []]);
  await expect(tool(page, 'Go back')).toBeVisible();
});

test('ED5: an edited tile speaks its new phrase when the scan picks it', async ({ page }) => {
  await edit(page, 'needs', SCAN);
  await tool(page, 'Edit Help').click();
  await expect(sheet(page).getByRole('heading')).toHaveText('Edit Help');
  await sheet(page).getByLabel('Label').fill('Help me');
  await sheet(page).getByLabel('Phrase').fill('Please help me');
  await sheet(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(tool(page, 'Edit Help me')).toBeFocused();
  await editAction(page, 'Done').click();
  await expect(footerButtons(page)).toHaveCount(0);
  await stopClock(page);
  await pickByScan(page, 0, 1);
  expect((await marked(page, 'data-confirmed')).cells).toEqual(['Help me']);
  expect(await spokenTexts(page)).toEqual(['Please help me']);
});

test('ED6: a removed tile is gone, and it is still gone after a reload', async ({ page }) => {
  await edit(page, 'needs');
  await tool(page, 'Remove Pain').click();
  await expect(cell(page, 'Pain')).toHaveCount(0);
  await expect(tool(page, 'Remove Toilet')).toBeFocused();
  await page.reload();
  await expect(title(page)).toHaveText('Needs');
  expect((await cellsByGroup(page))[0]).toEqual(['Back', 'Help', 'Toilet', 'Drink']);
});

test('ED7: a tile that is dragged to the top of the third column is its first cell, also after a reload', async ({
  page,
}) => {
  await edit(page, 'needs');
  const from = await middleOf(page, 'Help');
  const bed = await page.locator('main app-cell button[aria-label="Bed"]').boundingBox();
  if (!bed) {
    throw new Error('The cell "Bed" is not on the page.');
  }
  // The pointer ends over the third column, above the middle of its first cell.
  const to = { x: bed.x + bed.width / 2, y: bed.y + bed.height / 4 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 8 });
  await expect(page.locator('main .lifted')).toBeVisible();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('main .lifted')).toHaveCount(0);
  const dragged = [
    ['Back', 'Pain', 'Toilet', 'Drink'],
    ['Eat', 'Medicine', 'Hot', 'Blanket'],
    ['Help', 'Bed', 'Move me', 'Itch', 'Glasses'],
  ];
  await expect.poll(() => cellsByGroup(page)).toEqual(dragged);
  // The click that ends the drag picks nothing up.
  await expect(page.locator('main [aria-pressed="true"]')).toHaveCount(0);
  await page.reload();
  await expect(title(page)).toHaveText('Needs');
  expect(await cellsByGroup(page)).toEqual(dragged);
});

test('ED8: a press on Help and then on Pain puts Help in the place of Pain', async ({ page }) => {
  await edit(page, 'needs');
  await pressCell(page, 'Help');
  await expect(tool(page, 'Move Help')).toHaveAttribute('aria-pressed', 'true');
  await pressCell(page, 'Pain');
  await expect
    .poll(async () => (await cellsByGroup(page))[0])
    .toEqual(['Back', 'Pain', 'Help', 'Toilet', 'Drink']);
  await expect(page.locator('main [role="status"]')).toHaveText('Help moved to column 1, place 3');
});

test('ED9: Tab reaches Move Help, and the Right arrow moves Help to the second column', async ({
  page,
}) => {
  await edit(page, 'needs');
  await tool(page, 'Edit Help').focus();
  await page.keyboard.press('Tab');
  await expect(tool(page, 'Move Help')).toBeFocused();
  await expect(tool(page, 'Move Help')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await cellsByGroup(page))[1])
    .toEqual(['Eat', 'Help', 'Medicine', 'Hot', 'Blanket']);
  await expect(tool(page, 'Move Help')).toBeFocused();
});

test('ED10: the rows layout of Needs holds after a reload, and home is still drawn in columns', async ({
  page,
}) => {
  await edit(page, 'needs');
  await editAction(page, 'Configure Board').click();
  await expect(sheet(page).getByLabel('Title')).toHaveValue('Needs');
  await sheet(page).locator('label').filter({ hasText: 'Rows' }).click();
  await sheet(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('main .grid')).toHaveAttribute('data-layout', 'rows');
  await expect(editAction(page, 'Add row')).toBeVisible();
  await editAction(page, 'Done').click();
  await expect(page.locator('main .tool')).toHaveCount(0);
  expectDirection(await measure(page), 'rows');
  await page.reload();
  await expect(title(page)).toHaveText('Needs');
  expectDirection(await measure(page), 'rows');
  await page.goto('/');
  await expect(title(page)).toHaveText('Home');
  expectDirection(await measure(page), 'columns');
});

test('ED11: Add column gives the board four columns, and Remove column on the new one gives it three', async ({
  page,
}) => {
  await edit(page, 'needs');
  await editAction(page, 'Add column').click();
  await expect(page.locator('main .group')).toHaveCount(4);
  await page.locator('main .group').nth(3).getByRole('button', { name: 'Remove column' }).click();
  await expect(page.locator('main .group')).toHaveCount(3);
});

test('ED12: when Add column says it is disabled, no cell of the board is under 48px', async ({
  page,
}) => {
  await edit(page, 'needs');
  const add = editAction(page, 'Add column');
  // The count of presses has a limit, so a button that never says it is disabled fails the test.
  for (let pressCount = 0; pressCount < 40; pressCount++) {
    if ((await add.getAttribute('aria-disabled')) === 'true') {
      break;
    }
    const groups = await page.locator('main .group').count();
    await add.click();
    await expect(page.locator('main .group')).toHaveCount(groups + 1);
    // The room is measured after the page is drawn again.
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await expect(add).toHaveAttribute('aria-disabled', 'true');
  await expect(add).toHaveAccessibleDescription(/no room for another column/);
  const boxes = await cellBoxes(page);
  expect(boxes.length).toBe(13);
  // A cell of 48px can measure a hair less, because the browser shares the width out in fractions.
  const small = boxes.filter(({ width, height }) => width < 47.99 || height < 47.99);
  expect(small).toEqual([]);
  // One more press adds nothing.
  // Playwright does not click a button that says it is disabled, so the click is sent to it.
  const groups = await page.locator('main .group').count();
  await add.dispatchEvent('click');
  await expect(page.locator('main [role="status"]')).toHaveText(/no room for another column/);
  await expect(page.locator('main .group')).toHaveCount(groups);
});

test('ED13: axe reports no WCAG 2.2 Level AA violation in edit mode, in any theme', async ({
  page,
}) => {
  test.slow();
  for (const theme of THEMES) {
    await edit(page, 'home', { theme });
    expect(await axeViolations(page), `${theme} home`).toEqual([]);
    await edit(page, 'needs', { theme });
    expect(await axeViolations(page), `${theme} needs`).toEqual([]);
    await tool(page, 'Edit Help').click();
    await expect(sheet(page)).toBeVisible();
    expect(await axeViolations(page), `${theme} tile dialog`).toEqual([]);
  }
});

test('ED14: the labels and the borders of the edit controls keep their contrast over the Needs board', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const expectContrast = async (selector: string, what: string) => {
    // The pointer is moved off the controls, so none shows its hover look.
    await page.mouse.move(1, 1);
    const readings = await drawnContrast(page, selector);
    expect(readings.length, what).toBeGreaterThan(0);
    const low = readings
      .filter(({ ratio, needed }) => ratio < needed)
      .map(({ what: part, ratio, needed }) => `${part}: ${ratio.toFixed(2)} of ${needed}`);
    expect(low, what).toEqual([]);
  };
  for (const theme of THEMES) {
    await edit(page, 'needs', { theme });
    // The focus is taken off Done, so its focus ring is not read as its edge.
    await blur(page);
    await expectContrast('app-footer, main .tool:not(.move)', `${theme} edit mode`);
    await tool(page, 'Edit Help').click();
    await expect(sheet(page)).toBeVisible();
    await expectContrast('dialog.sheet[open]', `${theme} tile dialog`);
  }
});

test('ED15: every edit button, footer button and dialog control is at least 48px high and wide', async ({
  page,
}) => {
  await edit(page, 'needs', { set: needsWithEmptyColumn() });
  expect(await smallControls(page.locator('main'), '.tool, .add-tile, .remove-group')).toEqual([]);
  expect(await smallControls(page.locator('app-footer'), 'button')).toEqual([]);
  const controls = 'button, input[type="text"], label:has(input[type="radio"])';
  await editAction(page, 'Add Tile').click();
  expect(await smallControls(sheet(page), controls)).toEqual([]);
  await sheet(page).getByRole('button', { name: 'Cancel' }).click();
  await editAction(page, 'Add Board').click();
  expect(await smallControls(sheet(page), controls)).toEqual([]);
  await sheet(page).getByRole('button', { name: 'Cancel' }).click();
  await editAction(page, 'Configure Board').click();
  expect(await smallControls(sheet(page), controls)).toEqual([]);
});

test('ED16: Edit boards on the QWERTY keyboard opens home in edit mode, where Keyboards has no Remove and no Open button', async ({
  page,
}) => {
  await openBoard(page, 'keyboard');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Edit boards', exact: true }).click();
  await expect(title(page)).toHaveText('Home');
  await expect(footerButtons(page)).toHaveText(ACTIONS);
  await expect(tool(page, 'Edit Keyboards')).toBeVisible();
  await expect(tool(page, 'Remove Keyboards')).toHaveCount(0);
  await expect(tool(page, 'Open Keyboards')).toHaveCount(0);
  await expect(tool(page, 'Remove Needs')).toBeVisible();
  await expect(tool(page, 'Open Needs')).toBeVisible();
});

test('ED17: in edit mode nothing is highlighted, and Tab goes through the edit buttons in the order of the cells and then the footer', async ({
  page,
}) => {
  await edit(page, 'home', SCAN);
  await stopClock(page);
  await pass(page, 10 * SCAN_TIME);
  expect(await marked(page, 'data-scan')).toEqual({ groups: [], cells: [] });
  // A press on the title puts the start of the tab order before the first edit button.
  await title(page).click();
  const visited: string[] = [];
  for (let pressCount = 0; pressCount < 16; pressCount++) {
    await switchKey(page, 'Tab');
    visited.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        return (active?.getAttribute('aria-label') ?? active?.textContent ?? '').trim();
      }),
    );
  }
  expect(visited).toEqual([
    'Edit My boards',
    'Open My boards',
    'Move My boards',
    'Remove My boards',
    'Edit Needs',
    'Open Needs',
    'Move Needs',
    'Remove Needs',
    'Edit Quick phrases',
    'Open Quick phrases',
    'Move Quick phrases',
    'Remove Quick phrases',
    'Edit Keyboards',
    'Move Keyboards',
    'Add column',
    'Add Board',
  ]);
  await switchKey(page, 'Enter');
  expect(await marked(page, 'data-scan')).toEqual({ groups: [], cells: [] });
  expect(await marked(page, 'data-confirmed')).toEqual({ groups: [], cells: [] });
});

test('ED18: out of edit mode the scan never lands on the Add Tile button of an empty column', async ({
  page,
}) => {
  await openBoard(page, 'needs', { ...SCAN, set: needsWithEmptyColumn() });
  await expect(page.locator('main .group')).toHaveCount(4);
  const add = page.locator('main .group').nth(3).getByRole('button', { name: 'Add Tile' });
  await expect(add).toBeVisible();
  await expect(add).toHaveAttribute('data-caregiver-control', '');
  await stopClock(page);
  await switchKey(page, 'Enter');
  // Two rounds over the three groups that hold cells. The scan then goes to rest.
  const highlighted: string[] = [];
  for (let step = 0; step < 6; step++) {
    highlighted.push(...(await marked(page, 'data-scan')).groups);
    await expect(add).not.toBeFocused();
    await pass(page, SCAN_TIME);
  }
  expect(highlighted).toEqual([
    'Column 1 of 4',
    'Column 2 of 4',
    'Column 3 of 4',
    'Column 1 of 4',
    'Column 2 of 4',
    'Column 3 of 4',
  ]);
  expect(await readStoredSet(page)).not.toBeNull();
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('ED19: no cell is animated when a cell is moved with two presses', async ({ page }) => {
    await edit(page, 'needs');
    await pressCell(page, 'Help');
    await pressCell(page, 'Glasses');
    await expect
      .poll(async () => (await cellsByGroup(page))[2])
      .toEqual(['Bed', 'Move me', 'Itch', 'Help', 'Glasses']);
    const animated = await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => {
          const target =
            animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
          return target?.closest('main') !== null && target !== null;
        }).length,
    );
    expect(animated).toBe(0);
  });
});
