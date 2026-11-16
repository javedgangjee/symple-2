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
