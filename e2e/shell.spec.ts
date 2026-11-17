import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from './support/axe';
import { contrastRatio } from './support/contrast';

const THEMES = ['colours', 'blue', 'purple', 'teal', 'dark'] as const;
type ThemeName = (typeof THEMES)[number];

// The value of --dark for each theme, from validation.md.
const EXPECTED_DARK: Record<ThemeName, string> = {
  blue: 'oklch(0.42 0.15 258)',
  purple: 'oklch(0.40 0.19 285)',
  teal: 'oklch(0.42 0.07 192)',
  dark: 'oklch(0.22 0.006 270)',
  colours: 'oklch(0.42 0.115 250)',
};

// Stores a theme and reloads, as a caregiver's choice would be read on the next start.
async function openWithTheme(page: Page, theme: ThemeName): Promise<void> {
  await page.goto('/');
  await page.evaluate((name) => localStorage.setItem('symple.theme', name), theme);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Home');
}

// Resolves two colours in the browser, so values that are written differently but are the same
// colour compare as equal. The first colour is read inside the element that matches `scope`.
async function resolveColours(
  page: Page,
  scope: string,
  actual: string,
  expected: string,
): Promise<[string, string]> {
  return page.evaluate(
    ([scopeSelector, first, second]) => {
      const host = document.querySelector(scopeSelector);
      if (!host) {
        throw new Error(`No element matches ${scopeSelector}`);
      }
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
    [scope, actual, expected] as const,
  );
}

// Adds an empty element with the given classes to the page, for checks on the cell colours.
async function addTestElement(page: Page, id: string, className: string): Promise<void> {
  await page.evaluate(
    ([elementId, classes]) => {
      const element = document.createElement('div');
      element.id = elementId;
      element.className = classes;
      document.body.appendChild(element);
    },
    [id, className] as const,
  );
}

test('E1: the empty screen shows the header, the main area and the footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.locator('h1')).toHaveText('Home');
  await expect(page).toHaveTitle('Symple');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blue');
});

test('E2: each stored theme sets data-theme and its --dark colour', async ({ page }) => {
  for (const theme of THEMES) {
    await openWithTheme(page, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const [actual, expected] = await resolveColours(
      page,
      'html',
      'var(--dark)',
      EXPECTED_DARK[theme],
    );
    expect(actual, theme).toBe(expected);
  }
});

test('E3: axe reports no WCAG 2.2 Level AA violations in any theme', async ({ page }) => {
  for (const theme of THEMES) {
    await openWithTheme(page, theme);
    expect(await axeViolations(page), theme).toEqual([]);
  }
});

test('E4: the title keeps 4.5:1 against the page and each colour patch', async ({ page }) => {
  for (const theme of THEMES) {
    await openWithTheme(page, theme);
    for (const background of ['var(--canvas)', 'var(--blob1)', 'var(--blob2)', 'var(--blob3)']) {
      const ratio = await contrastRatio(page, 'h1', 'currentColor', background);
      expect(ratio, `${theme} against ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('E5: the page fits the window at both sizes', async ({ page }) => {
  for (const size of [
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Home');

    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const header = document.querySelector('header')?.getBoundingClientRect();
      const footer = document.querySelector('footer')?.getBoundingClientRect();
      return {
        scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
        scrollHeight: Math.max(root.scrollHeight, document.body.scrollHeight),
        width: root.clientWidth,
        height: root.clientHeight,
        headerHeight: header?.height ?? 0,
        footerHeight: footer?.height ?? 0,
        footerBottom: footer?.bottom ?? Infinity,
        windowHeight: window.innerHeight,
      };
    });

    const label = `${size.width} by ${size.height}`;
    expect(layout.scrollWidth, label).toBeLessThanOrEqual(layout.width);
    expect(layout.scrollHeight, label).toBeLessThanOrEqual(layout.height);
    expect(layout.headerHeight, label).toBeGreaterThanOrEqual(64);
    expect(layout.footerHeight, label).toBeGreaterThanOrEqual(48);
    expect(layout.footerBottom, label).toBeLessThanOrEqual(layout.windowHeight);
  }
});

// Case E6 said that Tab lands on no control. Feature 2 added the cells, and case E4 in
// e2e/home.spec.ts replaces it.

test('E7: the title uses Libre Franklin from the app itself', async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on('request', (request) => hosts.add(new URL(request.url()).host));

  await page.goto('/');
  await page.waitForFunction(() =>
    Array.from(document.fonts).some(
      (font) => font.family.replace(/["']/g, '') === 'Libre Franklin' && font.status === 'loaded',
    ),
  );

  const family = await page
    .locator('h1')
    .evaluate((h1) => getComputedStyle(h1).fontFamily.split(',')[0].replace(/["']/g, '').trim());
  expect(family).toBe('Libre Franklin');
  expect(await page.evaluate(() => document.fonts.check('1em "Libre Franklin"'))).toBe(true);
  expect([...hosts]).toEqual([new URL(baseURL ?? '').host]);
});

test('E8: the gaps above and below the main area are equal', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Home');
  const gaps = await page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`No element matches ${selector}`);
      }
      return element.getBoundingClientRect();
    };
    const header = box('header');
    const main = box('main');
    const footer = box('footer');
    return { above: main.top - header.bottom, below: footer.top - main.bottom };
  });
  expect(gaps.above).toBeCloseTo(gaps.below, 1);
});

test('E9: an unknown path shows the home screen', async ({ page }) => {
  await page.goto('/some/unknown/path');
  await expect(page.locator('h1')).toHaveText('Home');
});

test('E10: each cell colour keeps 4.5:1 between its text and its fill', async ({ page }) => {
  for (const theme of THEMES) {
    await openWithTheme(page, theme);
    for (const colour of ['dark', 'light', 'soft1', 'grey']) {
      const id = `test-${colour}`;
      await addTestElement(page, id, colour);
      const ratio = await contrastRatio(page, `#${id}`, 'var(--on)', 'var(--bg)');
      expect(ratio, `${theme} ${colour}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('E11: the Colours theme gives c1 to c4 their hues', async ({ page }) => {
  await openWithTheme(page, 'colours');
  const expected: Record<string, string> = {
    c1: 'oklch(0.42 0.115 250)',
    c2: 'oklch(0.42 0.115 20)',
    c3: 'oklch(0.42 0.115 190)',
    c4: 'oklch(0.42 0.115 250)',
  };
  for (const [className, value] of Object.entries(expected)) {
    const id = `test-${className}`;
    await addTestElement(page, id, className);
    const [actual, wanted] = await resolveColours(page, `#${id}`, 'var(--bg)', value);
    expect(actual, className).toBe(wanted);
  }
});

test('E12: the font licence is served', async ({ request }) => {
  const response = await request.get('/fonts/LibreFranklin-OFL.txt');
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('SIL Open Font License');
});

test('E13: the settings button is solid when less transparency is asked for', async ({ page }) => {
  // Playwright cannot emulate this media feature, so the test asks Chromium for it directly.
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Home');
  expect(
    await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches),
  ).toBe(true);

  const button = page.getByRole('button', { name: 'Settings' });
  const style = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      opacity: computed.opacity,
      backdropFilter: computed.backdropFilter,
      background: computed.backgroundColor,
    };
  });
  expect(style.opacity).toBe('1');
  expect(style.backdropFilter).toBe('none');

  // Drawing the colour on a canvas gives its alpha as a number from 0 to 255.
  const alpha = await page.evaluate((colour) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('The canvas has no 2D context.');
    }
    context.fillStyle = colour;
    context.fillRect(0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3];
  }, style.background);
  expect(alpha, style.background).toBe(255);
});

test('E14: the contrast helper refuses a see-through colour', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Home');
  await expect(contrastRatio(page, 'h1', 'currentColor', 'oklch(0.5 0 0 / 0.5)')).rejects.toThrow();
});
