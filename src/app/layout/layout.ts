/** The two layouts. In `columns` each group of cells is a column. In `rows` each group is a row. */
export const LAYOUT_NAMES = ['columns', 'rows'] as const;

export type LayoutName = (typeof LAYOUT_NAMES)[number];

/** The layout of a board that gives none. */
export const DEFAULT_LAYOUT: LayoutName = 'columns';

export function isLayoutName(value: unknown): value is LayoutName {
  return LAYOUT_NAMES.some((name) => name === value);
}
