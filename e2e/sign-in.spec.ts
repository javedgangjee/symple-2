import { expect, type Locator, type Page } from '@playwright/test';
import { axeViolations } from './support/axe';
import {
  NEEDS_LABELS,
  THEMES,
  askForLessTransparency,
  cellNames,
  focusedName,
  openBoard,
  type ThemeName,
} from './support/boards';
import {
  ACCOUNT,
  SIGNED_IN_STATE,
  SIGNED_OUT_STATE,
  blockFirebase,
  fillSignIn,
  hangFirebase,
  isResetRequest,
  refuseSignIn,
  test,
} from './support/firebase';
import { storeAndReload } from './support/scan';

const HOME_CELLS = ['My boards', 'Needs', 'Quick phrases', 'Keyboards'];
const WRONG = 'The email or password is wrong.';

const card = (page: Page) => page.locator('app-sign-in-screen');
const signInButton = (page: Page) => page.getByRole('button', { name: 'Sign in' });
const signOutButton = (page: Page) => page.getByRole('button', { name: 'Sign out' });
/** The box that holds the one message of the screen, in its alert region or its status region. */
const message = (page: Page) => card(page).locator('.message');

/** Opens the app on a device with no stored sign in and waits for the sign in screen. */
async function openSignIn(page: Page, theme?: ThemeName): Promise<void> {
  await page.goto('/');
  if (theme) {
    await page.evaluate((name) => localStorage.setItem('symple.theme', name), theme);
    await page.reload();
  }
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(card(page)).toBeVisible();
}

/** Signs in through the form and waits for the home screen. */
async function signIn(page: Page): Promise<void> {
  await openSignIn(page);
  await fillSignIn(page);
  await signInButton(page).click();
  await expect(page.locator('h1')).toHaveText('Home');
}

/** The name of the control that has focus: its label for a field, and its text for a button. */
async function focusedControl(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement) {
      return active.labels?.[0]?.textContent?.trim() ?? '';
    }
    return active?.textContent?.trim() ?? '';
  });
}

/** The alpha of the background of an element, from 0 to 255, and its backdrop filter. */
async function readSurface(target: Locator): Promise<{ alpha: number; backdropFilter: string }> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
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
}

test.describe('on a device with no stored sign in', () => {
  test.use({ storageState: SIGNED_OUT_STATE });

  test('N1: the home address opens the sign in screen alone', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(card(page)).toBeVisible();
    await expect(page.locator('header')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);
    await expect(page.locator('app-cell')).toHaveCount(0);
  });

  test('N2: a board address opens the sign in screen', async ({ page }) => {
    await page.goto('/board/needs');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('N3: a sign in that is accepted shows the home screen', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('h1')).toHaveText('Home');
    expect(await cellNames(page)).toEqual(HOME_CELLS);
  });

  test('N4: a signed in device stays signed in after a reload', async ({ page }) => {
    await signIn(page);
    const addresses: string[] = [];
    page.on('framenavigated', (frame) => addresses.push(frame.url()));
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Home');
    await expect(card(page)).toHaveCount(0);
    expect(addresses.filter((address) => address.includes('/sign-in'))).toEqual([]);
  });

  test('N5: a signed in device works with every call to Firebase blocked', async ({ page }) => {
    await signIn(page);
    await blockFirebase(page);
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Home');
    expect(await cellNames(page)).toEqual(HOME_CELLS);
    await page.goto('/board/needs');
    await expect(page.locator('h1')).toHaveText('Needs');
    expect(await cellNames(page)).toEqual(['Back', ...NEEDS_LABELS]);
  });

  test('N6: a sign in that Firebase refuses shows the message', async ({ page }) => {
    await refuseSignIn(page);
    await openSignIn(page);
    await fillSignIn(page);
    await signInButton(page).click();
    await expect(message(page)).toHaveText(WRONG);
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('N7: a sign in with Firebase blocked shows the network message', async ({ page }) => {
    await blockFirebase(page);
    await openSignIn(page);
    await fillSignIn(page);
    await signInButton(page).click();
    await expect(message(page)).toHaveText(
      'Symple cannot reach the network. Connect and try again.',
    );
  });

  test('N8: Forgot password asks Firebase for one reset email', async ({ page }) => {
    const resets: unknown[] = [];
    page.on('request', (request) => {
      if (isResetRequest(request)) {
        resets.push(request.postDataJSON());
      }
    });
    await openSignIn(page);
    await page.getByLabel('Email').fill(ACCOUNT.email);
    await page.getByRole('button', { name: 'Forgot password' }).click();
    await expect(message(page)).toHaveText('An email has been sent to the associated account.');
    expect(resets).toEqual([
      expect.objectContaining({ requestType: 'PASSWORD_RESET', email: ACCOUNT.email }),
    ]);
  });

  test('N9: Tab reaches the four controls in order, and Enter sends the sign in', async ({
    page,
  }) => {
    await openSignIn(page);
    for (const name of ['Email', 'Password', 'Sign in', 'Forgot password']) {
      await page.keyboard.press('Tab');
      expect(await focusedControl(page)).toBe(name);
    }
    await fillSignIn(page);
    await page.getByLabel('Password').press('Enter');
    await expect(page.locator('h1')).toHaveText('Home');
  });

  test('N10: axe reports no WCAG 2.2 Level AA violation in any theme', async ({ page }) => {
    await refuseSignIn(page);
    for (const theme of THEMES) {
      await openSignIn(page, theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await axeViolations(page), theme).toEqual([]);

      // And again with the message of case N6, which checks a sign in that Firebase refuses.
      await fillSignIn(page);
      await signInButton(page).click();
      await expect(message(page)).toHaveText(WRONG);
      expect(await axeViolations(page), `${theme} with the message`).toEqual([]);
    }
  });

  test('N11: the page does not scroll and the whole card is inside the window', async ({
    page,
  }) => {
    await openSignIn(page);
    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const box = document.querySelector('app-sign-in-screen')?.getBoundingClientRect();
      if (!box) {
        throw new Error('There is no card.');
      }
      return {
        scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
        scrollHeight: Math.max(root.scrollHeight, document.body.scrollHeight),
        width: root.clientWidth,
        height: root.clientHeight,
        card: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height);
    expect(layout.card.left).toBeGreaterThanOrEqual(0);
    expect(layout.card.top).toBeGreaterThanOrEqual(0);
    expect(layout.card.right).toBeLessThanOrEqual(layout.width);
    expect(layout.card.bottom).toBeLessThanOrEqual(layout.height);
  });

  test('N13: the card is solid with no blur when less transparency is asked for', async ({
    page,
  }) => {
    await askForLessTransparency(page);
    await openSignIn(page);
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches),
    ).toBe(true);
    const surface = await readSurface(card(page));
    expect(surface.alpha).toBe(255);
    expect(surface.backdropFilter).toBe('none');
  });

  test('N18: the message region is always rendered, and a message moves nothing', async ({
    page,
  }) => {
    await refuseSignIn(page);
    await openSignIn(page);
    /** The places of the parts of the card that sit above and below the message. */
    const places = () =>
      page.evaluate(() =>
        ['app-sign-in-screen', '#sign-in-password', 'button[type=submit]', 'button.link'].map(
          (selector) => {
            const box = document.querySelector(selector)?.getBoundingClientRect();
            if (!box) {
              throw new Error(`No element matches ${selector}`);
            }
            return { top: box.top, bottom: box.bottom };
          },
        ),
      );

    await expect(message(page)).toHaveText('');
    expect(await message(page).evaluate((element) => getComputedStyle(element).display)).not.toBe(
      'none',
    );
    const empty = await places();

    await fillSignIn(page);
    await signInButton(page).click();
    await expect(message(page)).toHaveText(WRONG);
    await expect(card(page).getByRole('alert')).toHaveText(WRONG);
    await expect(message(page).locator('svg')).toHaveCount(1);
    expect(await places()).toEqual(empty);

    // The longest message of the screen. It reports no fault, so it has no error icon.
    await page.getByRole('button', { name: 'Forgot password' }).click();
    await expect(message(page)).toHaveText('An email has been sent to the associated account.');
    await expect(card(page).getByRole('status')).toHaveText(
      'An email has been sent to the associated account.',
    );
    await expect(card(page).getByRole('alert')).toHaveText('');
    await expect(message(page).locator('svg')).toHaveCount(0);
    expect(await places()).toEqual(empty);
  });
});

test.describe('on a signed in device', () => {
  test.use({ storageState: SIGNED_IN_STATE });

  test('N12: the sign in address opens the home screen', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('h1')).toHaveText('Home');
    await expect(page).not.toHaveURL(/\/sign-in$/);
    await expect(card(page)).toHaveCount(0);
  });

  test('N14: Sign out shows the sign in screen, and it stays after a reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Home');
    await signOutButton(page).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(card(page)).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(card(page)).toBeVisible();
  });

  test('N15: Sign out sits in the bottom right corner, and Tab does not reach it', async ({
    page,
  }) => {
    for (const id of ['home', 'needs']) {
      await openBoard(page, id);
      const boxes = await page.evaluate(() => {
        const box = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) {
            throw new Error(`No element matches ${selector}`);
          }
          const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        };
        return {
          button: box('footer button'),
          footer: box('footer'),
          main: box('main'),
          windowHeight: window.innerHeight,
        };
      });
      const { button, footer, main } = boxes;
      // The button is inside the footer, at its right edge, and the footer is the bottom row.
      expect(button.top, id).toBeGreaterThanOrEqual(footer.top);
      expect(button.bottom, id).toBeLessThanOrEqual(footer.bottom);
      expect(button.left, id).toBeGreaterThanOrEqual(footer.left);
      expect(Math.abs(button.right - footer.right), id).toBeLessThanOrEqual(1);
      expect(footer.top, id).toBeGreaterThanOrEqual(main.bottom);
      expect(footer.bottom, id).toBeLessThanOrEqual(boxes.windowHeight);
      expect(button.width, id).toBeGreaterThanOrEqual(24);
      expect(button.height, id).toBeGreaterThanOrEqual(24);

      // Sign out is a caregiver control, so it is not in the tab order. In `touch` mode Tab
      // goes from cell to cell, and one press more than there are cells does not land on it.
      await storeAndReload(page, { selectionMode: 'touch' });
      const names = await cellNames(page);
      for (const name of names) {
        await page.keyboard.press('Tab');
        expect(await focusedName(page), id).toBe(name);
      }
      await page.keyboard.press('Tab');
      await expect(signOutButton(page)).not.toBeFocused();
    }
  });

  test('N16: axe reports no WCAG 2.2 Level AA violation on home in any theme', async ({ page }) => {
    for (const theme of THEMES) {
      await openBoard(page, 'home', { theme });
      await expect(signOutButton(page)).toBeVisible();
      expect(await axeViolations(page), theme).toEqual([]);
    }
  });

  test('N17: the home screen shows when Firebase Auth does not answer', async ({ page }) => {
    await hangFirebase(page);
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Home', { timeout: 3000 });
    expect(await cellNames(page)).toEqual(HOME_CELLS);
  });
});
