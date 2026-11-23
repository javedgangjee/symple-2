import { DEFAULT_LAYOUT, LAYOUT_NAMES, isLayoutName } from './layout';

describe('Layout', () => {
  it('L1: a board that gives no layout is drawn in columns', () => {
    expect(DEFAULT_LAYOUT).toBe('columns');
  });

  it('L2: columns and rows are the two layouts', () => {
    expect(LAYOUT_NAMES).toEqual(['columns', 'rows']);
    expect(isLayoutName('columns')).toBe(true);
    expect(isLayoutName('rows')).toBe(true);
  });

  it('L3: any other value is not a layout', () => {
    expect(isLayoutName('diagonal')).toBe(false);
    expect(isLayoutName(undefined)).toBe(false);
  });
});
