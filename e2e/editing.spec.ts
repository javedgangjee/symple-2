import { expect, type Locator, type Page, type Response } from '@playwright/test';
import lucideFile from '../src/data/lucide.json' with { type: 'json' };
import symbolsFile from '../src/data/symbols.json' with { type: 'json' };
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

/** The four buttons of edit mode in the footer, in their order. */
const ACTIONS = ['Add Board', 'Add Tile', 'Configure Board', 'Done'];

/** The Add column button, which lies in the margin beside the grid. It reads Add row in the rows layout. */
const addGroup = (page: Page, name = 'Add column') =>
  page.locator('main .add-group').and(page.getByRole('button', { name, exact: true }));

/** The scan time and the post click delay that the scan helpers move the clock by. */
const SCAN = { scanTime: SCAN_TIME, postClickDelay: 500 } as const;

const title = (page: Page) => page.locator('h1');
const sheet = (page: Page) => page.locator('dialog.sheet[open]');
const footerButtons = (page: Page) => page.locator('app-footer button');

/** The tile of a cell that speaks "Juice". */
const JUICE = {
  id: 'e2e-juice',
  label: 'Juice',
  colour: 'light',
  style: 'symbol',
  symbol: 'drink.svg',
  action: { type: 'speak', phrase: 'Juice' },
};

/** The tile of a cell that speaks "Apple" and shows the Lucide icon `apple`, as Add Tile stores it. */
const APPLE = {
  id: 'e2e-apple',
  label: 'Apple',
  colour: 'light',
  style: 'symbol',
  icon: 'lucide:apple',
  action: { type: 'speak', phrase: 'Apple' },
};

/** The Needs board with a cell at the end of its second group, where Add Tile puts a new cell. */
const needsEndingWith = (tile: { id: string }) =>
  setWith(
    'needs',
    (board) => ({
      ...board,
      groups: board.groups.map((group, index) =>
        index === 1 ? { cells: [...group.cells, { tile: tile.id }] } : group,
      ),
    }),
    [tile],
  );

/** The Needs board with a fourth group, which is empty. */
const needsWithEmptyColumn = () =>
  setWith('needs', (board) => ({ ...board, groups: [...board.groups, { cells: [] }] }));

/** Opens a board and turns edit mode on. */
async function edit(page: Page, id: string, stored = {}): Promise<void> {
  await openBoard(page, id, stored);
  await startEditing(page);
}

/** The box of an element on the page. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('The element is not on the page.');
  }
  return box;
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

/** The box "Find a picture" of the tile dialog. */
const findBox = (page: Page) => sheet(page).getByLabel('Find a picture');

/** The line of the Picture field that says how many pictures are shown and how many match. */
const countLine = (page: Page) => sheet(page).locator('#tile-picture-count');

/** The list of pictures of the tile dialog, which scrolls. */
const pictureList = (page: Page) => sheet(page).locator('#tile-pictures');

/** The choice of Symbols or Icons, which reads "Symbols (3,437)" once the lists have loaded. */
const pictureKind = (page: Page, kind: 'Symbols' | 'Icons') =>
  sheet(page)
    .locator('.kinds label')
    .filter({ has: page.getByRole('radio', { name: new RegExp(`^${kind}`) }) });

/**
 * A picture of the list, by the value of its radio button, such as `symbol:drink.svg`. Two
 * pictures can share a name, as the two symbols "drink" do, so a test that needs one of them
 * finds it by its value. The label is pressed, because the radio button inside it is see-through.
 */
const pictureByValue = (page: Page, value: string) =>
  pictureList(page)
    .locator('label')
    .filter({ has: page.locator(`input[name="tile-picture"][value="${value}"]`) });

/** A picture of the list, by its exact name, such as "Advent calendar". */
const pictureNamed = (page: Page, name: string) =>
  pictureList(page)
    .locator('label')
    .filter({ has: page.getByRole('radio', { name, exact: true }) });

/**
 * Fills in the tile dialog for a new cell that speaks and adds the cell. A picture is found by
 * the text typed in "Find a picture" and picked by the value of its radio button.
 */
async function addTile(
  page: Page,
  label: string,
  picture?: { find: string; value: string },
): Promise<void> {
  await editAction(page, 'Add Tile').click();
  await sheet(page).getByLabel('Label').fill(label);
  if (picture) {
    await findBox(page).fill(picture.find);
    await pictureByValue(page, picture.value).click();
  }
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
}

/** The shapes that a drawn icon holds, by the `d` of each path or else the name of the element. */
async function drawnShapes(icon: Locator): Promise<string[]> {
  return icon
    .locator('path, circle, rect, line, ellipse, polyline, polygon')
    .evaluateAll((shapes) => shapes.map((shape) => shape.getAttribute('d') ?? shape.tagName));
}

/** The shapes of a Lucide icon in `src/data/lucide.json`, in the form of `drawnShapes`. */
function lucideShapes(name: string): string[] {
  const icon = lucideFile.find((item) => item.name === name);
  if (!icon) {
    throw new Error(`The Lucide set has no icon "${name}".`);
  }
  return icon.shapes.map((shape) => ('d' in shape && shape.d !== undefined ? shape.d : shape.tag));
}

/** Whether an image has loaded. */
async function imageLoaded(image: Locator): Promise<boolean> {
  return image.evaluate(
    (element) =>
      element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
  );
}

/**
 * Notes each response of a page that carries `lucide.json` or `symbols.json`. The dev server
 * gives the chunk of each file a name like `chunk-SOK7XA6I.js`, which does not name the file,
 * so the body of each script and each JSON response is read too. It carries the file when it
 * holds the first and the last name of the file, each in quotes, as the build writes them.
 */
function watchPictureFiles(page: Page): () => Promise<string[]> {
  const markers = [
    {
      file: 'lucide.json',
      names: [lucideFile[0].name, lucideFile[lucideFile.length - 1].name],
    },
    {
      file: 'symbols.json',
      names: [symbolsFile[0].file, symbolsFile[symbolsFile.length - 1].file],
    },
  ];
  const checks: Promise<string[]>[] = [];
  const check = async (response: Response): Promise<string[]> => {
    const url = response.url();
    const byName = markers.flatMap(({ file }) =>
      url.includes(file) || url.includes(file.replace('.', '-'))
        ? [`${file} by its URL ${url}`]
        : [],
    );
    const type = (await response.headerValue('content-type')) ?? '';
    if (!/javascript|json/.test(type)) {
      return byName;
    }
    const body = await response.text().catch(() => '');
    const byBody = markers.flatMap(({ file, names }) =>
      names.every((name) => body.includes(JSON.stringify(name)))
        ? [`${file} in the body of ${url}`]
        : [],
    );
    return [...byName, ...byBody];
  };
  page.on('response', (response) => checks.push(check(response)));
  return async () => (await Promise.all(checks)).flat();
}

/** Takes over the clock of the page and stops it, so the scan moves only when the test moves the time. */
async function stopClock(page: Page): Promise<void> {
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2000);
}

/**
 * Lets the scan run on for eight steps after a pick, which is more than two rounds of the three
 * groups of Needs, and gives each stop that is not a group or a cell of the board. The scan
 * starts again after a pick.
 */
async function stopsOffTheBoard(page: Page): Promise<string[]> {
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
  return stops.filter((stop) => stop !== 'board');
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
  await addTile(page, 'Juice', { find: 'drink', value: 'symbol:drink.svg' });
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
  await openBoard(page, 'needs', { ...SCAN, set: needsEndingWith(JUICE) });
  await stopClock(page);
  await pickByScan(page, 1, 4);
  expect((await marked(page, 'data-confirmed')).cells).toEqual(['Juice']);
  expect(await spokenTexts(page)).toEqual(['Juice']);
  expect(await stopsOffTheBoard(page)).toEqual([]);
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
  await expect(page.locator('main [data-picked]')).toHaveCount(0);
  await page.reload();
  await expect(title(page)).toHaveText('Needs');
  expect(await cellsByGroup(page)).toEqual(dragged);
});

test('ED8: a press on Help and then on Pain puts Help in the place of Pain', async ({ page }) => {
  await edit(page, 'needs');
  await pressCell(page, 'Help');
  const help = page.locator('main .slot', {
    has: page.locator('app-cell button[aria-label="Help"]'),
  });
  await expect(help).toHaveAttribute('data-picked', '');
  await pressCell(page, 'Pain');
  await expect
    .poll(async () => (await cellsByGroup(page))[0])
    .toEqual(['Back', 'Pain', 'Help', 'Toilet', 'Drink']);
  await expect(page.locator('main [role="status"]')).toHaveText('Help moved to column 1, place 3');
  await expect(page.locator('main [data-picked]')).toHaveCount(0);
  await expect(tool(page, 'Edit Help')).toBeFocused();
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
  await expect(addGroup(page, 'Add row')).toBeVisible();
  // Add row lies under the grid, where the new row goes, and inside the window.
  const gridBox = await boxOf(page.locator('main .grid'));
  const rowBox = await boxOf(addGroup(page, 'Add row'));
  expect(rowBox.y).toBeGreaterThanOrEqual(gridBox.y + gridBox.height);
  expect(rowBox.width).toBeCloseTo(gridBox.width, 0);
  expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
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
  await addGroup(page).click();
  await expect(page.locator('main .group')).toHaveCount(4);
  await page.locator('main .group').nth(3).getByRole('button', { name: 'Remove column' }).click();
  await expect(page.locator('main .group')).toHaveCount(3);
});

test('ED20: on a window 768px wide, Add column lies beside the grid and inside the window', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await edit(page, 'needs');
  const gridBox = await boxOf(page.locator('main .grid'));
  const addBox = await boxOf(addGroup(page));
  expect(addBox.x).toBeGreaterThanOrEqual(gridBox.x + gridBox.width);
  // The focus ring is 3px wide and lies 1px outside the box. The places are not whole pixels,
  // so half a pixel is allowed.
  expect(addBox.x + addBox.width + 4).toBeLessThanOrEqual(768.5);
  expect(addBox.width).toBeGreaterThanOrEqual(48);
});

test('ED21: the Add Tile dialog and the Add Board dialog are as wide and as high as the settings panel', async ({
  page,
}) => {
  await openBoard(page, 'needs');
  for (const size of [
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(size);
    // The settings button is hidden in edit mode, so the panel is measured before edit mode starts.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const panel = await boxOf(page.locator('dialog.panel[open]'));
    await page.getByRole('button', { name: 'Edit boards', exact: true }).click();
    await expect(page.locator('dialog.panel[open]')).toHaveCount(0);
    for (const action of ['Add Tile', 'Add Board']) {
      await editAction(page, action).click();
      const box = await boxOf(sheet(page));
      expect(box.width).toBeCloseTo(panel.width, 0);
      expect(box.height).toBeCloseTo(panel.height, 0);
      // The sheet lies inside the window, and Cancel and the confirm button are in view.
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height);
      for (const name of ['Cancel', 'Add']) {
        await expect(sheet(page).getByRole('button', { name, exact: true })).toBeInViewport({
          ratio: 1,
        });
      }
      await sheet(page).getByRole('button', { name: 'Cancel' }).click();
    }
    await editAction(page, 'Done').click();
  }
});

test('ED12: when Add column says it is disabled, no cell of the board is under 48px', async ({
  page,
}) => {
  await edit(page, 'needs');
  const add = addGroup(page);
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
    await expectContrast('app-footer, main .tool', `${theme} edit mode`);
    await tool(page, 'Edit Help').click();
    await expect(sheet(page)).toBeVisible();
    await expectContrast('dialog.sheet[open]', `${theme} tile dialog`);
  }
});

test('ED15: every edit button, footer button and dialog control is at least 48px high and wide', async ({
  page,
}) => {
  await edit(page, 'needs', { set: needsWithEmptyColumn() });
  expect(
    await smallControls(page.locator('main'), '.tool, .add-group, .add-tile, .remove-group'),
  ).toEqual([]);
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

test('ED16: Edit boards on the QWERTY keyboard opens home in edit mode, where Keyboards has Edit, Open and Remove buttons', async ({
  page,
}) => {
  await openBoard(page, 'keyboard');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Edit boards', exact: true }).click();
  await expect(title(page)).toHaveText('Home');
  await expect(footerButtons(page)).toHaveText(ACTIONS);
  await expect(tool(page, 'Edit Keyboards')).toBeVisible();
  await expect(tool(page, 'Open Keyboards')).toBeVisible();
  await expect(tool(page, 'Remove Keyboards')).toBeVisible();
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
  for (let pressCount = 0; pressCount < 14; pressCount++) {
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
    'Remove My boards',
    'Edit Needs',
    'Open Needs',
    'Remove Needs',
    'Edit Quick phrases',
    'Open Quick phrases',
    'Remove Quick phrases',
    'Edit Keyboards',
    'Open Keyboards',
    'Remove Keyboards',
    'Add column',
    'Add Board',
  ]);
  await switchKey(page, 'Enter');
  expect(await marked(page, 'data-scan')).toEqual({ groups: [], cells: [] });
  expect(await marked(page, 'data-confirmed')).toEqual({ groups: [], cells: [] });
});

test('ED18: out of edit mode an empty column shows no Add Tile button and the scan goes round the board', async ({
  page,
}) => {
  await openBoard(page, 'needs', { ...SCAN, set: needsWithEmptyColumn() });
  await expect(page.locator('main .group')).toHaveCount(4);
  const empty = page.locator('main .group').nth(3);
  await expect(empty.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add Tile' })).toHaveCount(0);
  await stopClock(page);
  await switchKey(page, 'Enter');
  // Two rounds over the three groups that hold cells. The scan then goes to rest.
  const highlighted: string[] = [];
  for (let step = 0; step < 6; step++) {
    highlighted.push(...(await marked(page, 'data-scan')).groups);
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

/** The radio buttons and the other controls of the Picture field that are measured for their size. */
const PICTURE_CONTROLS = 'button, input[type="text"], label:has(input[type="radio"])';

/** The Picture field of the tile dialog. */
const pictureField = (page: Page) =>
  sheet(page)
    .locator('fieldset')
    .filter({ has: page.locator('legend', { hasText: 'Picture' }) });

/**
 * Reads the control that has the focus: what it is, whether it is inside the open dialog, and
 * whether its focus ring is on show. A radio button is see-through, so its label draws the ring.
 * The ring is on show when the control matches `:focus-visible`, the element that draws the ring
 * has an outline, and its box lies inside the window and inside the part of each box around it
 * that scrolls and shows.
 */
async function focusReading(
  page: Page,
): Promise<{ name: string; value: string; inDialog: boolean; shown: boolean }> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return { name: 'none', value: '', inDialog: false, shown: false };
    }
    const radio = active instanceof HTMLInputElement && active.type === 'radio';
    const ring = (radio ? active.closest('label') : active) ?? active;
    const style = getComputedStyle(ring);
    const box = ring.getBoundingClientRect();
    let inView =
      box.width > 0 &&
      box.height > 0 &&
      box.left >= -1 &&
      box.top >= -1 &&
      box.right <= window.innerWidth + 1 &&
      box.bottom <= window.innerHeight + 1;
    for (let parent = ring.parentElement; parent && inView; parent = parent.parentElement) {
      if (getComputedStyle(parent).overflow !== 'visible') {
        const edge = parent.getBoundingClientRect();
        const left = edge.left + parent.clientLeft;
        const top = edge.top + parent.clientTop;
        inView =
          box.left >= left - 1 &&
          box.top >= top - 1 &&
          box.right <= left + parent.clientWidth + 1 &&
          box.bottom <= top + parent.clientHeight + 1;
      }
    }
    const label = active.closest('label')?.textContent ?? '';
    return {
      name: (active.getAttribute('aria-label') ?? (label || active.textContent || active.id))
        .replace(/\s+/g, ' ')
        .trim(),
      value: active instanceof HTMLInputElement ? active.value : '',
      inDialog: active.closest('dialog.sheet[open]') !== null,
      shown:
        active.matches(':focus-visible') &&
        style.outlineStyle !== 'none' &&
        parseFloat(style.outlineWidth) > 0 &&
        inView,
    };
  });
}

test('PI1: a tile with the symbol "Advent calendar" is on Needs after a reload, and its image has loaded', async ({
  page,
}) => {
  await edit(page, 'needs');
  await editAction(page, 'Add Tile').click();
  await sheet(page).getByLabel('Label').fill('Advent');
  await findBox(page).fill('advent calendar');
  await pictureNamed(page, 'Advent calendar').click();
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  await editAction(page, 'Done').click();
  await page.reload();
  await expect(title(page)).toHaveText('Needs');
  const image = cell(page, 'Advent').locator('img');
  await expect(image).toHaveAttribute('src', 'symbols/advent-calendar.svg');
  await expect.poll(() => imageLoaded(image)).toBe(true);
});

test('PI2: a tile with the icon "apple" is on Needs after a reload, and it draws the icon and no image', async ({
  page,
}) => {
  await edit(page, 'needs');
  await editAction(page, 'Add Tile').click();
  await sheet(page).getByLabel('Label').fill('Apple');
  await pictureKind(page, 'Icons').click();
  await findBox(page).fill('apple');
  await pictureNamed(page, 'apple').click();
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  await editAction(page, 'Done').click();
  await page.reload();
  await expect(title(page)).toHaveText('Needs');
  const apple = cell(page, 'Apple');
  await expect(apple).toBeVisible();
  // The drawing is the one of the Lucide icon, so the cell shows the icon that was picked.
  await expect
    .poll(() => drawnShapes(apple.locator('app-icon svg')))
    .toEqual(lucideShapes('apple'));
  expect(lucideShapes('apple').length).toBeGreaterThan(0);
  await expect(apple.locator('img')).toHaveCount(0);
});

test('PI3: the scan reaches the tile with the icon "apple" and speaks it, and never lands on an edit control', async ({
  page,
}) => {
  await openBoard(page, 'needs', { ...SCAN, set: needsEndingWith(APPLE) });
  await stopClock(page);
  await pickByScan(page, 1, 4);
  expect((await marked(page, 'data-confirmed')).cells).toEqual(['Apple']);
  expect(await spokenTexts(page)).toEqual(['Apple']);
  expect(await stopsOffTheBoard(page)).toEqual([]);
  await expect(page.locator('main .tool')).toHaveCount(0);
});

test('PI4: a board that is added from home with the symbol "dog" shows the symbol, and the scan opens it', async ({
  page,
}) => {
  await edit(page, 'home', SCAN);
  await editAction(page, 'Add Board').click();
  await sheet(page).getByLabel('Name').fill('Pets');
  await pictureKind(page, 'Symbols').click();
  // The empty box lists the symbols from "a", so "dog" is found by its name.
  await findBox(page).fill('dog');
  await pictureNamed(page, 'dog').click();
  await sheet(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  await editAction(page, 'Done').click();
  await expect(footerButtons(page)).toHaveCount(0);
  const image = cell(page, 'Pets').locator('img');
  await expect(image).toHaveAttribute('src', 'symbols/dog.svg');
  const groups = await cellsByGroup(page);
  const group = groups.findIndex((names) => names.includes('Pets'));
  await stopClock(page);
  await pickByScan(page, group, groups[group].indexOf('Pets'));
  await expect(title(page)).toHaveText('Pets');
});

test('PI5: the cell on home that opens Needs takes the icon "house" and keeps its Bleed style after a reload', async ({
  page,
}) => {
  await edit(page, 'home');
  await tool(page, 'Edit Needs').click();
  await expect(sheet(page).getByRole('heading')).toHaveText('Edit Needs');
  await findBox(page).fill('house');
  await pictureNamed(page, 'house').click();
  await sheet(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  await page.reload();
  await expect(title(page)).toHaveText('Home');
  const needs = page.locator('main app-cell button[aria-label="Needs"]');
  await expect(needs).toHaveClass(/\bbleed\b/);
  // The drawing is the Lucide house, so the cell no longer draws its heart.
  await expect
    .poll(() => drawnShapes(needs.locator('app-icon svg')))
    .toEqual(lucideShapes('house'));
  expect(lucideShapes('house').length).toBeGreaterThan(0);
});

test('PI6: after Show more is pressed twice the list holds 180 symbols, and each image in view has loaded', async ({
  page,
}) => {
  await edit(page, 'needs');
  await editAction(page, 'Add Tile').click();
  await expect(countLine(page)).toHaveText('Showing 60 of 3,437');
  const more = pictureList(page).getByRole('button', { name: 'Show more', exact: true });
  await more.click();
  await expect(countLine(page)).toHaveText('Showing 120 of 3,437');
  await more.click();
  await expect(countLine(page)).toHaveText('Showing 180 of 3,437');
  await expect(pictureList(page).locator('input[value^="symbol:"]')).toHaveCount(180);
  // The images load lazily, so the test waits for those that are in the part of the list on show.
  const images = () =>
    pictureList(page).evaluate((list) => {
      const edge = list.getBoundingClientRect();
      const top = edge.top + list.clientTop;
      const bottom = top + list.clientHeight;
      const inView = Array.from(list.querySelectorAll('img')).filter((image) => {
        const box = image.getBoundingClientRect();
        return box.bottom > top && box.top < bottom && box.bottom > 0 && box.top < innerHeight;
      });
      return {
        inView: inView.length,
        notLoaded: inView
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.getAttribute('src')),
      };
    });
  await expect.poll(async () => (await images()).notLoaded).toEqual([]);
  expect((await images()).inView).toBeGreaterThan(0);
});

test('PI7: home loads with nothing stored and fetches neither lucide.json nor symbols.json', async ({
  page,
}) => {
  const found = watchPictureFiles(page);
  await openBoard(page, 'home');
  await page.waitForLoadState('load');
  // Firebase calls are left without an answer, so the network never goes quiet. The app would
  // start a lazy load as soon as home is drawn, so a short wait is long enough to see one.
  await page.waitForTimeout(1500);
  expect(await found()).toEqual([]);
});

test('PI8: axe reports no WCAG 2.2 Level AA violation in the tile dialog on Symbols and on Icons, in any theme', async ({
  page,
}) => {
  test.slow();
  for (const theme of THEMES) {
    await edit(page, 'needs', { theme });
    await editAction(page, 'Add Tile').click();
    await expect(countLine(page)).toHaveText('Showing 60 of 3,437');
    expect(await axeViolations(page), `${theme} Symbols`).toEqual([]);
    await pictureKind(page, 'Icons').click();
    await expect(countLine(page)).toHaveText('Showing 60 of 2,110');
    expect(await axeViolations(page), `${theme} Icons`).toEqual([]);
  }
});

test('PI9: on Icons each control of the Picture field is at least 48px high and wide, and each name keeps its contrast', async ({
  page,
}) => {
  await edit(page, 'needs');
  await editAction(page, 'Add Tile').click();
  await pictureKind(page, 'Icons').click();
  await expect(countLine(page)).toHaveText('Showing 60 of 2,110');
  expect(await pictureField(page).locator(PICTURE_CONTROLS).count()).toBeGreaterThan(60);
  expect(await smallControls(pictureField(page), PICTURE_CONTROLS)).toEqual([]);
  // The pointer is moved off the list, so no picture shows its hover look.
  await page.mouse.move(1, 1);
  const names = (await drawnContrast(page, 'dialog.sheet[open] #tile-pictures')).filter(
    ({ what }) => what.startsWith('text '),
  );
  expect(names.length).toBeGreaterThan(0);
  const low = names
    .filter(({ ratio }) => ratio < 4.5)
    .map(({ what, ratio }) => `${what}: ${ratio.toFixed(2)} of 4.5`);
  expect(low).toEqual([]);
});

test('PI10: with the keyboard alone Tab reaches each part of the Picture field, the arrow keys pick, and the focus stays in the dialog and on show', async ({
  page,
}) => {
  await edit(page, 'needs');
  await editAction(page, 'Add Tile').click();
  await expect(countLine(page)).toHaveText('Showing 60 of 3,437');
  await expect(sheet(page).getByLabel('Label')).toBeFocused();
  const readings: Awaited<ReturnType<typeof focusReading>>[] = [];
  const press = async (key: string) => {
    await page.keyboard.press(key);
    const reading = await focusReading(page);
    readings.push(reading);
    return reading;
  };
  await press('Tab');
  await expect(sheet(page).getByLabel('Phrase')).toBeFocused();
  // Tab goes to the choice of Symbols or Icons, on the chosen one.
  const kind = await press('Tab');
  expect(kind.value).toBe('symbol');
  await press('Tab');
  await expect(findBox(page)).toBeFocused();
  // Tab goes to the list, on the chosen picture, which is "No picture" for a new tile.
  const first = await press('Tab');
  expect(first).toMatchObject({ name: 'No picture', value: '' });
  // Each arrow key moves to the next picture and picks it.
  const picked = [first.value];
  for (let step = 0; step < 4; step++) {
    const next = await press('ArrowDown');
    expect(picked, `step ${step + 1}`).not.toContain(next.value);
    expect(next.value).toMatch(/^symbol:/);
    await expect(sheet(page).locator(`input[name="tile-picture"]:checked`)).toHaveValue(next.value);
    picked.push(next.value);
  }
  const back = await press('ArrowUp');
  expect(back.value).toBe(picked[picked.length - 2]);
  await expect(sheet(page).locator(`input[name="tile-picture"]:checked`)).toHaveValue(back.value);
  // Tab goes from the list to Show more.
  const more = await press('Tab');
  expect(more.name).toBe('Show more');
  // Tab goes on round the dialog twice, and Shift with Tab goes back round it, and never leaves.
  for (let step = 0; step < 24; step++) {
    await press('Tab');
  }
  for (let step = 0; step < 12; step++) {
    await press('Shift+Tab');
  }
  expect(readings.filter(({ inDialog }) => !inDialog).map(({ name }) => name)).toEqual([]);
  expect(readings.filter(({ shown }) => !shown).map(({ name }) => name)).toEqual([]);
});
