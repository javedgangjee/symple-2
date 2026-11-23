import type { Page } from '@playwright/test';

// Reads two colours inside the element that matches `scope` and returns their contrast ratio.
// Each colour is any solid CSS colour, such as `var(--ink)` or `currentColor`, so theme values
// resolve as they do on the page. The browser draws each colour on a canvas to turn it into sRGB,
// then the ratio is worked out with the WCAG formula.
// The helper throws an error when either colour has an alpha below 1. A see-through colour takes
// its look from what lies behind it, so its ratio cannot be worked out from the colour alone.
export async function contrastRatio(
  page: Page,
  scope: string,
  foreground: string,
  background: string,
): Promise<number> {
  return page.evaluate(
    ([scopeSelector, fg, bg]) => {
      const host = document.querySelector(scopeSelector);
      if (!host) {
        throw new Error(`No element matches ${scopeSelector}`);
      }
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('The canvas has no 2D context.');
      }

      const toRgb = (colour: string): [number, number, number] => {
        const probe = document.createElement('span');
        probe.style.color = colour;
        host.appendChild(probe);
        const computed = getComputedStyle(probe).color;
        probe.remove();
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = computed;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
        if (alpha < 255) {
          throw new Error(
            `The colour ${colour} is see-through, so its contrast cannot be measured.`,
          );
        }
        return [r, g, b];
      };

      const luminance = ([r, g, b]: [number, number, number]): number => {
        const channel = (value: number) => {
          const c = value / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };

      const a = luminance(toRgb(fg));
      const b = luminance(toRgb(bg));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    },
    [scope, foreground, background] as const,
  );
}

/** One measured contrast: what was measured, its lowest ratio and the ratio it needs. */
export interface Reading {
  what: string;
  ratio: number;
  needed: number;
}

/** A colour that a test measures, and the places of the page where it meets its background. */
interface Target {
  what: string;
  needed: number;
  /** The colour of the text or of the border, as the browser gives it. */
  colour: string;
  /** The points where the background is read, in pixels of the window. */
  points: [number, number][];
}

/**
 * Lists what a contrast test measures inside the elements that match a selector, with the
 * points where each one meets its background. An element that matches is measured too. Text is read over the line boxes of each text, inside its own element. The border
 * of a control is read against the pixels just inside it and just outside it. A control that has
 * no border but a solid fill, such as the switch, Done and the chosen category, is read against
 * the pixels just outside it. A control that is turned off at the end of its range is left out,
 * as WCAG 1.4.11 allows.
 */
function listTargets(selector: string): Target[] {
  const roots = Array.from(document.querySelectorAll(selector));
  if (roots.length === 0) {
    throw new Error(`Nothing matches ${selector}.`);
  }
  /** The elements inside the roots that match, and the roots that match themselves. */
  const within = (matching: string) =>
    roots.flatMap((root) => [
      ...(root.matches(matching) ? [root] : []),
      ...root.querySelectorAll(matching),
    ]);
  const targets: Target[] = [];
  const shown = (element: Element) =>
    element.getClientRects().length > 0 && element.closest('.sr-only, option') === null;
  const fill = (rect: DOMRect, inset: number): [number, number][] => {
    const points: [number, number][] = [];
    for (let y = Math.ceil(rect.top + inset); y < rect.bottom - inset; y++) {
      for (let x = Math.ceil(rect.left + inset); x < rect.right - inset; x++) {
        points.push([x, y]);
      }
    }
    return points;
  };
  // The part of a box that shows. A box that scrolls cuts off what lies outside it, and what is
  // cut off is not drawn, so it is not measured.
  const inView = (rect: DOMRect, element: Element): DOMRect => {
    let { left, top, right, bottom } = rect;
    for (let box = element.parentElement; box; box = box.parentElement) {
      if (getComputedStyle(box).overflow !== 'visible') {
        // The box shows its contents inside its border.
        const edge = box.getBoundingClientRect();
        left = Math.max(left, edge.left + box.clientLeft);
        top = Math.max(top, edge.top + box.clientTop);
        right = Math.min(right, edge.left + box.clientLeft + box.clientWidth);
        bottom = Math.min(bottom, edge.top + box.clientTop + box.clientHeight);
      }
    }
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  };
  // Points on a ring at a distance from the edge of a box: outside it when the distance is
  // above 0 and inside it when it is below. Only the middle half of each side is read, so the
  // rounded corners are left out. Of a round control only the middle of each side is read,
  // because its edge curves away from its box everywhere else.
  const ring = (rect: DOMRect, distance: number, round = false): [number, number][] => {
    const points: [number, number][] = [];
    const left = Math.floor(rect.left - distance);
    const right = Math.ceil(rect.right + distance) - 1;
    const top = Math.floor(rect.top - distance);
    const bottom = Math.ceil(rect.bottom + distance) - 1;
    const part = round ? 2 : 4;
    for (let x = rect.left + rect.width / part; x <= rect.right - rect.width / part; x++) {
      points.push([Math.round(x), top], [Math.round(x), bottom]);
    }
    for (let y = rect.top + rect.height / part; y <= rect.bottom - rect.height / part; y++) {
      points.push([left, Math.round(y)], [right, Math.round(y)]);
    }
    return points;
  };
  const nameOf = (element: Element) =>
    (element.getAttribute('aria-label') ?? element.textContent ?? element.tagName)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);

  // Each text: the text nodes, and the text of each drop-down list.
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim() || !shown(parent)) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      const points = Array.from(range.getClientRects()).flatMap((rect) =>
        fill(inView(rect, parent), 1),
      );
      if (points.length > 0) {
        targets.push({
          what: `text "${node.textContent.trim().slice(0, 40)}"`,
          needed: 4.5,
          colour: getComputedStyle(parent).color,
          points,
        });
      }
    }
  }
  for (const select of within('select')) {
    if (!(select instanceof HTMLSelectElement) || !shown(select)) {
      continue;
    }
    // The text of a list sits in its content box, inside the border and the padding.
    const style = getComputedStyle(select);
    const box = select.getBoundingClientRect();
    const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    const content = new DOMRect(left, box.top + 4, right - left, box.height - 8);
    targets.push({
      what: `text of the list ${select.id}`,
      needed: 4.5,
      colour: style.color,
      points: fill(content, 0),
    });
  }

  // Each control: its border, or the edge of its solid fill.
  const alphaOf = (colour: string) => {
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
  };
  const solid = (colour: string) => alphaOf(colour) === 255;
  for (const control of within('button, select, input, .seg')) {
    if (!shown(control) || control.closest('[aria-disabled="true"]') !== null) {
      continue;
    }
    if (control instanceof HTMLInputElement && control.type === 'radio') {
      // A radio button is hidden inside its label, and the segmented control around it is read.
      continue;
    }
    const style = getComputedStyle(control);
    const box = control.getBoundingClientRect();
    const seen = inView(box, control);
    if (seen.width < box.width - 1 || seen.height < box.height - 1) {
      // A control that a scrolling box cuts off shows no whole edge to measure.
      continue;
    }
    const border = parseFloat(style.borderTopWidth);
    const round = parseFloat(style.borderTopLeftRadius) >= Math.min(box.width, box.height) / 2 - 1;
    // A border that is see-through, as the border of a filled button is, is no border.
    const bordered =
      border >= 1 && style.borderTopStyle !== 'none' && alphaOf(style.borderTopColor) > 0;
    if (bordered) {
      targets.push({
        what: `border of ${nameOf(control)}`,
        needed: 3,
        colour: style.borderTopColor,
        points: [...ring(box, 2, round), ...ring(box, -(border + 1), round)],
      });
    } else if (solid(style.backgroundColor)) {
      targets.push({
        what: `edge of ${nameOf(control)}`,
        needed: 3,
        colour: style.backgroundColor,
        points: ring(box, 2),
      });
    }
  }
  return targets;
}

/**
 * Reads the screenshot in the page and gives, for each target, its lowest contrast against the
 * pixels at its points. A colour with alpha is laid over each pixel first, as the browser draws it.
 */
async function lowestRatios(page: Page, png: Buffer, targets: Target[]): Promise<Reading[]> {
  return page.evaluate(
    async ([data, list]) => {
      const bitmap = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${data}`)).blob(),
      );
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('The canvas has no 2D context.');
      }
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const rgba = (colour: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = colour;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };
      const luminance = (r: number, g: number, b: number) => {
        const channel = (value: number) => {
          const c = value / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      return list.map(({ what, needed, colour, points }) => {
        const [fr, fg, fb, alpha] = rgba(colour);
        let ratio = Infinity;
        for (const [x, y] of points) {
          if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) {
            continue;
          }
          const at = (y * bitmap.width + x) * 4;
          const [br, bg, bb] = [pixels[at], pixels[at + 1], pixels[at + 2]];
          const front = luminance(
            fr * alpha + br * (1 - alpha),
            fg * alpha + bg * (1 - alpha),
            fb * alpha + bb * (1 - alpha),
          );
          const back = luminance(br, bg, bb);
          ratio = Math.min(ratio, (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05));
        }
        return { what, ratio, needed };
      });
    },
    [png.toString('base64'), targets] as const,
  );
}

/**
 * Measures the contrast of the texts and the controls inside the elements that match a
 * selector, such as an open dialog, against what is really drawn behind each one. Glass is
 * see-through, so its colour on screen depends on the board behind it, the dimmed page and the
 * blur. The colours are listed first. Then every text and icon of those elements is hidden, a
 * screenshot is taken and the background is read from its pixels. Each text and border is
 * measured against the worst pixel of its own background.
 */
export async function drawnContrast(page: Page, selector: string): Promise<Reading[]> {
  const targets = await page.evaluate(listTargets, selector);
  await page.evaluate((scope) => {
    const style = document.createElement('style');
    style.dataset['hideText'] = '';
    const each = scope
      .split(',')
      .flatMap((one) => [one, `${one} *`, `${one} *::before`, `${one} *::after`]);
    style.textContent = `${each.join(', ')} {
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      transition: none !important;
    }`;
    document.head.appendChild(style);
  }, selector);
  const png = await page.screenshot({ scale: 'css', animations: 'disabled', caret: 'hide' });
  await page.evaluate(() => document.querySelector('style[data-hide-text]')?.remove());
  return lowestRatios(page, png, targets);
}
