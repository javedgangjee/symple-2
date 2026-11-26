import { expect, type Locator, type Page } from '@playwright/test';
import { axeViolations } from './support/axe';
import { THEMES, askForLessTransparency, cell, openBoard } from './support/boards';
import { drawnContrast } from './support/contrast';
import { test } from './support/firebase';
import {
  SCAN_TIME,
  boardCells,
  cellAt,
  grid,
  groups,
  marked,
  pass,
  pickByScan,
  pointAt,
  switchKey,
  test as scanTest,
} from './support/scan';
import { VOICE_A, VOICE_B, spokenWithVoice } from './support/speech';

/** The six categories of the panel, in the order of the list. */
const TABS = ['Boards', 'Selection', 'Speech', 'Appearance', 'Account', 'About'] as const;
type TabName = (typeof TABS)[number];

const SAMPLE = 'Hello. This is my voice.';
const NOTHING = { groups: [], cells: [] };

const title = (page: Page) => page.locator('h1');
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Settings' });
const panel = (page: Page) => page.locator('dialog.panel');
const tab = (page: Page, name: TabName) => panel(page).getByRole('tab', { name, exact: true });
const pane = (page: Page, name: TabName) => page.locator(`#settings-pane-${name.toLowerCase()}`);
const done = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true });

/** Presses the settings button and waits for the panel, which opens on Boards. */
async function openPanel(page: Page): Promise<void> {
  await settingsButton(page).click();
  await expect(panel(page)).toHaveAttribute('open', '');
  await expect(tab(page, 'Boards')).toBeFocused();
}

/** Chooses a category of the open panel and waits for its settings. */
async function showTab(page: Page, name: TabName): Promise<void> {
  await tab(page, name).click();
  await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
  await expect(pane(page, name)).toBeVisible();
  // The chosen category fades its colours in. The checks read the colours once they have settled.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition)),
  );
}

/**
 * Opens the panel on a page whose clock is stopped, with the shortcut, and lets the app draw it.
 * The scanning tests open the panel this way, so no pointer rests anywhere.
 */
async function openPanelByShortcut(page: Page): Promise<void> {
  await page.keyboard.press('Control+Comma');
  await pass(page, 0);
  await expect(panel(page)).toHaveAttribute('open', '');
}

/** Presses a control of the panel on a page whose clock is stopped, and lets the app draw the change. */
async function press(page: Page, target: Locator): Promise<void> {
  await target.click();
  await pass(page, 0);
}

/** Closes the panel with Done on a page whose clock is stopped. */
async function closePanel(page: Page): Promise<void> {
  await press(page, done(page));
  await expect(panel(page)).not.toHaveAttribute('open');
}

/** Finds a cell of the board on show by its name, as a group and a place in the group. */
async function placeOf(page: Page, name: string): Promise<[number, number]> {
  const names = await boardCells(page);
  const group = names.findIndex((groupNames) => groupNames.includes(name));
  if (group === -1) {
    throw new Error(`The board has no cell named "${name}".`);
  }
  return [group, names[group].indexOf(name)];
}

/** What has the focus: whether it is inside the panel, and its name as a screen reader gives it. */
async function focusInPanel(page: Page): Promise<{ inside: boolean; name: string }> {
  return page.evaluate(() => {
    const active = document.activeElement;
    const dialog = document.querySelector('dialog.panel');
    if (!(active instanceof HTMLElement) || !dialog) {
      return { inside: false, name: 'none' };
    }
    const labelled =
      active.getAttribute('aria-label') ??
      (active instanceof HTMLInputElement || active instanceof HTMLSelectElement
        ? active.labels?.[0]?.textContent
        : undefined) ??
      active.textContent;
    const name = (labelled ?? '').replace(/\s+/g, ' ').trim();
    return {
      inside: dialog.contains(active),
      name: active.getAttribute('role') === 'tab' ? `tab ${name}` : name,
    };
  });
}

test('ST1: the settings button opens the panel at 80 parts in 100 of the width of the window, all inside it', async ({
  page,
}) => {
  await openBoard(page, 'home');
  await openPanel(page);
  const layout = await panel(page).evaluate((dialog) => {
    const { left, top, right, bottom, width, height } = dialog.getBoundingClientRect();
    const outside = Array.from(dialog.querySelectorAll('*')).flatMap((element) => {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || element.closest('.sr-only') !== null) {
        return [];
      }
      return box.left < 0 ||
        box.top < 0 ||
        box.right > window.innerWidth ||
        box.bottom > window.innerHeight
        ? [element.outerHTML.slice(0, 80)]
        : [];
    });
    return {
      box: { left, top, right, bottom, width, height },
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      outside,
    };
  });
  expect(layout.box.width / layout.windowWidth).toBeCloseTo(0.8, 2);
  expect(layout.box.height / layout.windowHeight).toBeCloseTo(0.95, 2);
  expect(layout.box.left).toBeGreaterThanOrEqual(0);
  expect(layout.box.top).toBeGreaterThanOrEqual(0);
  expect(layout.box.right).toBeLessThanOrEqual(layout.windowWidth);
  expect(layout.box.bottom).toBeLessThanOrEqual(layout.windowHeight);
  expect(layout.outside).toEqual([]);
});

test('ST2: Control with comma opens the panel, Tab goes round inside it, and Escape closes it', async ({
  page,
}) => {
  await openBoard(page, 'home');
  await page.keyboard.press('Control+Comma');
  await expect(panel(page)).toHaveAttribute('open', '');
  const first = await focusInPanel(page);
  expect(first).toEqual({ inside: true, name: 'tab Boards' });
  const visited = [first.name];
  // The focus must come back to the chosen category. The count of presses has a limit, so a
  // focus that never comes back fails the test and does not hang it.
  for (let pressCount = 0; pressCount < 30; pressCount++) {
    await page.keyboard.press('Tab');
    const focus = await focusInPanel(page);
    expect(focus.inside, `after ${visited.join(', ')}`).toBe(true);
    if (focus.name === first.name) {
      break;
    }
    visited.push(focus.name);
  }
  expect(visited).toEqual(['tab Boards', 'Edit boards', 'Done']);
  await expect(tab(page, 'Boards')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel(page)).not.toHaveAttribute('open');
});

scanTest(
  'ST3: the scan never highlights the settings button and never opens the panel',
  async ({ open }) => {
    const page = await open('home', 'Home');
    const names = await boardCells(page);
    /** Checks the settings button and the panel after each step of the scan. */
    const check = async (step: string) => {
      const highlighted = await marked(page, 'data-scan');
      expect(highlighted.cells, step).not.toContain('Settings');
      await expect(settingsButton(page), step).not.toHaveAttribute('data-scan');
      await expect(settingsButton(page), step).not.toBeFocused();
      await expect(panel(page), step).not.toHaveAttribute('open');
    };

    // Two rounds of the groups. The scan then goes to rest by itself.
    await switchKey(page, 'Enter');
    for (let step = 0; step < 2 * names.length; step++) {
      await expect(groups(page).nth(step % names.length)).toHaveAttribute('data-scan', '');
      await check(`group step ${step}`);
      await pass(page, SCAN_TIME);
    }
    await expect(grid(page)).toHaveAttribute('data-state', 'rest');
    await check('at rest after the groups');

    // Two rounds of the cells of each group.
    for (const [group, groupNames] of names.entries()) {
      await switchKey(page, 'Enter');
      await pass(page, group * SCAN_TIME);
      await expect(groups(page).nth(group)).toHaveAttribute('data-scan', '');
      await switchKey(page, 'Enter');
      for (let step = 0; step < 2 * groupNames.length; step++) {
        await expect(cellAt(page, group, step % groupNames.length)).toHaveAttribute(
          'data-scan',
          '',
        );
        await check(`group ${group} cell step ${step}`);
        await pass(page, SCAN_TIME);
      }
      // After the cells the scan goes back to the groups or to rest, and is then sent to rest.
      await check(`after the cells of group ${group}`);
      for (let step = 0; step < 2 * names.length; step++) {
        if ((await grid(page).getAttribute('data-state')) === 'rest') {
          break;
        }
        await pass(page, SCAN_TIME);
        await check(`after the cells of group ${group}, step ${step}`);
      }
      await expect(grid(page)).toHaveAttribute('data-state', 'rest');
    }
    await expect(title(page)).toHaveText('Home');
  },
);

scanTest(
  'IV5: the scan never lands on the row Source code or on any control of the settings panel',
  async ({ open }) => {
    for (const [id, name] of [
      ['home', 'Home'],
      ['needs', 'Needs'],
    ] as const) {
      const page = await open(id, name);
      // The caregiver has looked at the About category and closed the panel with Done.
      await openPanelByShortcut(page);
      await press(page, tab(page, 'About'));
      await expect(pane(page, 'About')).toBeVisible();
      await closePanel(page);
      // The panel is closed, so the link is looked up by its tag and not by its role.
      const link = pane(page, 'About').locator('a[href]');
      await expect(link).toHaveCount(1);

      /** Checks the panel, its controls and the row Source code after each step of the scan. */
      const check = async (step: string) => {
        const highlighted = await marked(page, 'data-scan');
        expect(highlighted.cells, step).not.toContain('Source code');
        expect(await panel(page).locator('[data-scan]').count(), step).toBe(0);
        expect((await focusInPanel(page)).inside, step).toBe(false);
        await expect(link, step).not.toBeFocused();
        await expect(panel(page), step).not.toHaveAttribute('open');
      };

      // One round of the groups. The scan then goes to rest by itself.
      const names = await boardCells(page);
      await switchKey(page, 'Enter');
      for (let step = 0; step < names.length; step++) {
        await expect(groups(page).nth(step), `${name} group step ${step}`).toHaveAttribute(
          'data-scan',
          '',
        );
        await check(`${name} group step ${step}`);
        await pass(page, SCAN_TIME);
      }
      await check(`${name} after the groups`);

      // One round of the cells of each group.
      for (const [group, groupNames] of names.entries()) {
        // The scan makes a second pass over the cells or the groups it is on, goes back to the
        // groups for two passes and then rests by itself. It is checked at each step.
        const most = 2 * Math.max(...names.map((cellNames) => cellNames.length)) + 2 * names.length;
        for (let step = 0; step < most; step++) {
          if ((await grid(page).getAttribute('data-state')) === 'rest') {
            break;
          }
          await pass(page, SCAN_TIME);
          await check(`${name} before group ${group}, step ${step}`);
        }
        await expect(grid(page)).toHaveAttribute('data-state', 'rest');
        await switchKey(page, 'Enter');
        await pass(page, group * SCAN_TIME);
        await expect(groups(page).nth(group)).toHaveAttribute('data-scan', '');
        if (groupNames.length === 1) {
          // A group of one cell has no cell step.
          await check(`${name} group ${group}`);
          await pass(page, SCAN_TIME);
          continue;
        }
        await switchKey(page, 'Enter');
        for (let step = 0; step < groupNames.length; step++) {
          await expect(cellAt(page, group, step)).toHaveAttribute('data-scan', '');
          await check(`${name} group ${group} cell step ${step}`);
          await pass(page, SCAN_TIME);
        }
        await check(`${name} after the cells of group ${group}`);
      }
      await expect(title(page)).toHaveText(name);
    }
  },
);

scanTest(
  'ST4: while the panel is open nothing is highlighted, and Tab and Enter are not switches',
  async ({ open }) => {
    const page = await open('home', 'Home');
    await openPanelByShortcut(page);
    await pass(page, 10 * SCAN_TIME);
    expect(await marked(page, 'data-scan')).toEqual(NOTHING);
    await expect(title(page)).toHaveText('Home');

    // The focus is on the chosen category, Boards. The Down arrow chooses Selection, Tab moves
    // the focus to its first control, and Enter is pressed there.
    await page.keyboard.press('ArrowDown');
    await pass(page, 0);
    await page.keyboard.press('Tab');
    await pass(page, 0);
    expect(await focusInPanel(page)).toEqual({ inside: true, name: 'Selection mode' });
    await page.keyboard.press('Enter');
    await pass(page, SCAN_TIME);
    expect(await marked(page, 'data-scan')).toEqual(NOTHING);
    await expect(grid(page)).toHaveAttribute('data-state', 'rest');
    await expect(title(page)).toHaveText('Home');
    await expect(panel(page)).toHaveAttribute('open', '');
  },
);

scanTest(
  'ST5: a scan time of 3.0 s set in the panel applies at the next scan',
  async ({ open }) => {
    const page = await open('home', 'Home');
    await openPanelByShortcut(page);
    await press(page, tab(page, 'Selection'));
    const longer = panel(page).getByRole('button', { name: 'Longer scan time' });
    const reading = panel(page).getByRole('group', { name: 'Scan time' }).locator('output');
    // The scanning tests store a scan time of 1.0 s, and each press adds half a second.
    await expect(reading).toContainText('1.0 s');
    for (const shown of ['1.5 s', '2.0 s', '2.5 s', '3.0 s']) {
      await press(page, longer);
      await expect(reading).toContainText(shown);
    }
    await closePanel(page);

    await switchKey(page, 'Enter');
    await expect(groups(page).nth(0)).toHaveAttribute('data-scan', '');
    // The key press lets 1 ms pass, and each wait lets 1 ms more pass to draw the page, so the
    // clock is now 2999 ms after the press.
    await pass(page, 3000 - 3);
    await expect(groups(page).nth(0)).toHaveAttribute('data-scan', '');
    await expect(groups(page).nth(1)).not.toHaveAttribute('data-scan');
    // The clock now reaches 3000 ms after the press, and the next millisecond draws the page.
    await pass(page, 1);
    await expect(groups(page).nth(1)).toHaveAttribute('data-scan', '');
    await expect(groups(page).nth(0)).not.toHaveAttribute('data-scan');
  },
);

scanTest('ST6: the mode Step applies when the panel closes, with no reload', async ({ open }) => {
  const page = await open('home', 'Home');
  // A reload would lose this mark.
  await page.evaluate(() => Object.assign(window, { noReload: true }));
  await openPanelByShortcut(page);
  await press(page, tab(page, 'Selection'));
  await panel(page).locator('#settings-mode').selectOption('step');
  await pass(page, 0);
  await expect(panel(page).locator('#settings-mode')).toHaveValue('step');
  await closePanel(page);

  await switchKey(page, 'Tab');
  await expect(groups(page).nth(0)).toHaveAttribute('data-scan', '');
  await pass(page, 5 * SCAN_TIME);
  await expect(groups(page).nth(0)).toHaveAttribute('data-scan', '');
  await switchKey(page, 'Tab');
  await expect(groups(page).nth(1)).toHaveAttribute('data-scan', '');
  await pass(page, 5 * SCAN_TIME);
  await expect(groups(page).nth(1)).toHaveAttribute('data-scan', '');
  expect(await page.evaluate(() => Reflect.get(window, 'noReload'))).toBe(true);
});

test('ST7: the theme Purple applies at once and stays after a reload', async ({ page }) => {
  await openBoard(page, 'home');
  await openPanel(page);
  await showTab(page, 'Appearance');
  await panel(page).locator('#settings-theme').selectOption('purple');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'purple');
  await page.reload();
  await expect(title(page)).toHaveText('Home');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'purple');
});

scanTest(
  'ST9: Help is spoken with the voice, the rate, the pitch and the volume set in the panel',
  async ({ open }) => {
    const page = await open('needs', 'Needs');
    await openPanelByShortcut(page);
    await press(page, tab(page, 'Speech'));
    await panel(page).locator('#settings-voice').selectOption(VOICE_B.voiceURI);
    await pass(page, 0);
    for (const [name, presses] of [
      ['Faster rate', 5],
      ['Lower pitch', 2],
      ['Lower volume', 5],
    ] as const) {
      for (let done = 0; done < presses; done++) {
        await panel(page).getByRole('button', { name }).click();
        await pass(page, 0);
      }
    }
    await expect(panel(page).getByRole('group', { name: 'Rate' }).locator('output')).toHaveText(
      '1.5×',
    );
    await expect(panel(page).getByRole('group', { name: 'Volume' }).locator('output')).toHaveText(
      '50%',
    );
    await closePanel(page);

    await pickByScan(page, ...(await placeOf(page, 'Help')));
    expect((await spokenWithVoice(page)).at(-1)).toEqual({
      text: 'I need help',
      voice: VOICE_B.voiceURI,
      rate: 1.5,
      pitch: 0.8,
      volume: 0.5,
    });
  },
);

test('ST10: Play a sample speaks the sample', async ({ page }) => {
  await openBoard(page, 'home');
  await openPanel(page);
  await showTab(page, 'Speech');
  // Nothing is stored for the voice, so the list shows the default voice.
  await expect(panel(page).locator('#settings-voice')).toHaveValue(VOICE_A.voiceURI);
  await panel(page).getByRole('button', { name: 'Play a sample' }).click();
  await expect
    .poll(async () => (await spokenWithVoice(page)).map(({ text }) => text))
    .toEqual([SAMPLE]);
});

test('ST11: axe reports no WCAG 2.2 Level AA violation on any tab in any theme', async ({
  page,
}) => {
  test.slow();
  for (const theme of THEMES) {
    await openBoard(page, 'home', { theme });
    await openPanel(page);
    for (const name of TABS) {
      await showTab(page, name);
      expect(await axeViolations(page), `${theme} ${name}`).toEqual([]);
    }
  }
});

test('IV6: axe reports no WCAG 2.2 Level AA violation on the About category in any theme', async ({
  page,
}) => {
  for (const theme of THEMES) {
    await openBoard(page, 'home', { theme });
    await openPanel(page);
    await showTab(page, 'About');
    await expect(
      pane(page, 'About').getByRole('link', { name: 'github.com/javedgangjee/symple-2' }),
    ).toBeVisible();
    expect(await axeViolations(page), theme).toEqual([]);
  }
});

test('ST12: the text and the borders of the controls keep their contrast over the Needs board', async ({
  page,
}) => {
  // The case takes 25 screenshots and reads each one in the page, which is slow when the other
  // tests run at the same time.
  test.setTimeout(300_000);
  for (const theme of THEMES) {
    await openBoard(page, 'needs', { theme });
    await openPanel(page);
    for (const name of TABS) {
      await showTab(page, name);
      // The pointer is moved off the panel, so no control shows its hover look.
      await page.mouse.move(1, 1);
      const readings = await drawnContrast(page, 'dialog.panel');
      expect(readings.length, `${theme} ${name}`).toBeGreaterThan(0);
      const low = readings
        .filter(({ ratio, needed }) => ratio < needed)
        .map(({ what, ratio, needed }) => `${what}: ${ratio.toFixed(2)} of ${needed}`);
      expect(low, `${theme} ${name}`).toEqual([]);
    }
  }
});

test('ST13: every button, list, switch row and tab is at least 48px high and wide', async ({
  page,
}) => {
  await openBoard(page, 'home');
  await openPanel(page);
  for (const name of TABS) {
    await showTab(page, name);
    const small = await panel(page).evaluate((dialog) =>
      Array.from(
        dialog.querySelectorAll('button, select, label.row, [role="tab"], .seg label'),
      ).flatMap((control) => {
        const { width, height } = control.getBoundingClientRect();
        if (width === 0 && height === 0) {
          // The control is in a category that is not shown.
          return [];
        }
        const label = (control.getAttribute('aria-label') ?? control.textContent ?? '').trim();
        return width < 48 || height < 48 ? [`${label}: ${width} by ${height}`] : [];
      }),
    );
    expect(small, name).toEqual([]);
  }
});

test.describe('in a window 800 by 768', () => {
  test.use({ viewport: { width: 800, height: 768 } });

  test('ST14: the tabs lie in one row above the settings, and the Right arrow moves along them', async ({
    page,
  }) => {
    await openBoard(page, 'home');
    await openPanel(page);
    const tablist = panel(page).getByRole('tablist');
    await expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
    const boxes = await panel(page).evaluate((dialog) => {
      const box = (element: Element | null) => {
        if (!element) {
          throw new Error('The panel lacks a part.');
        }
        const { left, top, right, bottom } = element.getBoundingClientRect();
        return { left, top, right, bottom };
      };
      return {
        tabs: Array.from(dialog.querySelectorAll('[role="tab"]')).map(box),
        panes: box(dialog.querySelector('.panes')),
      };
    });
    expect(boxes.tabs).toHaveLength(TABS.length);
    for (const [index, box] of boxes.tabs.entries()) {
      expect(box.top, TABS[index]).toBeCloseTo(boxes.tabs[0].top, 0);
      expect(box.bottom, TABS[index]).toBeLessThanOrEqual(boxes.panes.top);
      if (index > 0) {
        expect(box.left, TABS[index]).toBeGreaterThan(boxes.tabs[index - 1].left);
      }
    }
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'Selection')).toBeFocused();
    await expect(tab(page, 'Selection')).toHaveAttribute('aria-selected', 'true');
    await expect(pane(page, 'Selection')).toBeVisible();
  });
});

test('ST15: the panel is solid with no blur when less transparency is asked for', async ({
  page,
}) => {
  await askForLessTransparency(page);
  await openBoard(page, 'home');
  expect(
    await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches),
  ).toBe(true);
  await openPanel(page);
  const surface = await panel(page).evaluate((dialog) => {
    const style = getComputedStyle(dialog);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('The canvas has no 2D context.');
    }
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return {
      alpha: context.getImageData(0, 0, 1, 1).data[3],
      backdropFilter: style.backdropFilter,
    };
  });
  expect(surface.alpha).toBe(255);
  expect(surface.backdropFilter).toBe('none');
});

scanTest('ST16: in cursor mode no round cursor is drawn over the panel', async ({ open }) => {
  const page = await open('home', 'Home', { selectionMode: 'cursor' });
  await pointAt(page, cell(page, 'Needs'));
  await expect(page.locator('.cursor')).toHaveCount(1);
  await openPanelByShortcut(page);
  await pointAt(page, panel(page));
  await expect(page.locator('.cursor')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-cursor');
});

scanTest(
  'ST17: in dwell mode a pointer that rests on Done leaves the panel open',
  async ({ open }) => {
    const page = await open('home', 'Home', { selectionMode: 'dwell', dwellTime: 1000 });
    await openPanelByShortcut(page);
    await pointAt(page, done(page));
    await pass(page, 5000);
    await expect(panel(page)).toHaveAttribute('open', '');
    await expect(page.locator('[data-dwell]')).toHaveCount(0);
  },
);

test('ST18: the footer holds no button, and the main area is as high as with Sign out', async ({
  page,
}) => {
  await openBoard(page, 'home');
  const footer = page.locator('footer');
  await expect(footer.locator('button')).toHaveCount(0);
  const mainHeight = () =>
    page.locator('main').evaluate((main) => main.getBoundingClientRect().height);
  const empty = await mainHeight();
  // The Sign out button of feature 3 is put back into the footer, with the size rules it had,
  // to measure the main area as it was.
  await footer.evaluate((element) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Sign out';
    Object.assign(button.style, {
      minHeight: '48px',
      padding: '0 1.25rem',
      border: '0',
      borderRadius: '24px',
      font: 'inherit',
      fontWeight: '600',
    });
    element.appendChild(button);
  });
  expect(await mainHeight()).toBe(empty);
});

test('ST19: the stop cell shows the symbol of Symple at its full size, and nothing names OpenMoji', async ({
  page,
  request,
}) => {
  await openBoard(page, 'core-words');
  const stop = cell(page, 'stop').locator('img');
  await expect(stop).toHaveJSProperty('complete', true);
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>('main img')).map((image) => ({
      file: new URL(image.currentSrc || image.src).pathname,
      natural: image.naturalWidth,
      width: image.getBoundingClientRect().width,
      height: image.getBoundingClientRect().height,
    })),
  );
  const stopSize = sizes.find(({ file }) => file.endsWith('/stop.svg'));
  const others = sizes.filter(({ file }) => !file.endsWith('/stop.svg'));
  if (!stopSize) {
    throw new Error('The stop cell has no symbol.');
  }
  expect(stopSize.natural).toBeGreaterThan(0);
  // Every cell of Core words is the same size, so every symbol is drawn at the same size.
  for (const other of others) {
    expect(Math.abs(stopSize.width - other.width), other.file).toBeLessThanOrEqual(1);
    expect(Math.abs(stopSize.height - other.height), other.file).toBeLessThanOrEqual(1);
  }

  const svg = await request.get('/symbols/stop.svg');
  expect(svg.ok()).toBe(true);
  expect(await svg.text()).not.toMatch(/id=["']emoji["']/);
  const attribution = await request.get('/symbols/ATTRIBUTION.txt');
  expect(attribution.ok()).toBe(true);
  expect(await attribution.text()).not.toContain('OpenMoji');
});

test('ST20: a press on the dimmed page next to the panel closes it', async ({ page }) => {
  await openBoard(page, 'home');
  await openPanel(page);
  const box = await panel(page).boundingBox();
  if (!box) {
    throw new Error('The panel has no box.');
  }
  // The panel sits in the middle, so the dimmed page shows to its left.
  await page.mouse.click(box.x / 2, box.y + box.height / 2);
  await expect(panel(page)).not.toHaveAttribute('open');
});

test('ST21: a drag from the panel onto the dimmed page leaves the panel open', async ({ page }) => {
  await openBoard(page, 'home');
  await openPanel(page);
  await showTab(page, 'Selection');
  const box = await panel(page).boundingBox();
  const label = await panel(page).locator('label[for="settings-mode"]').boundingBox();
  if (!box || !label) {
    throw new Error('The panel or the label of Selection mode has no box.');
  }
  await page.mouse.move(label.x + label.width / 2, label.y + label.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x / 2, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(panel(page)).toHaveAttribute('open', '');
  // The panel still closes on a press that starts and ends on the dimmed page.
  await page.mouse.click(box.x / 2, box.y + box.height / 2);
  await expect(panel(page)).not.toHaveAttribute('open');
});
