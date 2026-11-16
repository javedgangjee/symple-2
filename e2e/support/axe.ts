import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

// These are the axe rule tags for WCAG 2.0, 2.1 and 2.2 at Level A and AA.
// axe has no separate tag for WCAG 2.2 Level A.
export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Runs axe on the whole page and returns the rules that failed.
export async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  return results.violations;
}
