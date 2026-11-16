import { TestBed } from '@angular/core/testing';
import { THEME_NAMES, THEME_STORAGE_KEY, Theme } from './theme';

describe('Theme', () => {
  const html = document.documentElement;
  let theme: Theme;

  beforeEach(() => {
    localStorage.clear();
    html.removeAttribute('data-theme');
    theme = TestBed.inject(Theme);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    html.removeAttribute('data-theme');
  });

  it('T1: uses blue when nothing is stored', () => {
    theme.load();
    expect(theme.name()).toBe('blue');
    expect(html.getAttribute('data-theme')).toBe('blue');
  });

  it('T2: uses the stored theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'teal');
    theme.load();
    expect(theme.name()).toBe('teal');
    expect(html.getAttribute('data-theme')).toBe('teal');
  });

  it('T3: uses blue when the stored theme is unknown', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'pink');
    theme.load();
    expect(theme.name()).toBe('blue');
    expect(html.getAttribute('data-theme')).toBe('blue');
  });

  it('T4: uses blue when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage is blocked.');
    });
    expect(() => theme.load()).not.toThrow();
    expect(theme.name()).toBe('blue');
    expect(html.getAttribute('data-theme')).toBe('blue');
  });

  it('T5: applies and stores a theme that is set', () => {
    theme.set('purple');
    expect(html.getAttribute('data-theme')).toBe('purple');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('purple');
  });

  it('T6: applies each of the five themes in turn', () => {
    for (const name of THEME_NAMES) {
      theme.set(name);
      expect(html.getAttribute('data-theme')).toBe(name);
    }
  });

  it('T7: applies a theme when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage is full.');
    });
    expect(() => theme.set('purple')).not.toThrow();
    expect(html.getAttribute('data-theme')).toBe('purple');
  });
});
