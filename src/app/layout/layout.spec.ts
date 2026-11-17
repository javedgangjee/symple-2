import { TestBed } from '@angular/core/testing';
import { LAYOUT_STORAGE_KEY, Layout } from './layout';

describe('Layout', () => {
  let layout: Layout;

  beforeEach(() => {
    localStorage.clear();
    layout = TestBed.inject(Layout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('L1: uses columns when nothing is stored', () => {
    layout.load();
    expect(layout.name()).toBe('columns');
  });

  it('L2: uses the stored layout', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, 'rows');
    layout.load();
    expect(layout.name()).toBe('rows');
  });

  it('L3: uses columns when the stored layout is unknown', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, 'diagonal');
    layout.load();
    expect(layout.name()).toBe('columns');
  });

  it('L4: uses columns when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage is blocked.');
    });
    expect(() => layout.load()).not.toThrow();
    expect(layout.name()).toBe('columns');
  });

  it('L5: uses and stores a layout that is set', () => {
    layout.set('rows');
    expect(layout.name()).toBe('rows');
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe('rows');
  });

  it('L6: uses a layout when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage is full.');
    });
    expect(() => layout.set('rows')).not.toThrow();
    expect(layout.name()).toBe('rows');
  });
});
