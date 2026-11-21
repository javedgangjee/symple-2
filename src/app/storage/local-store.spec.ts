import { TestBed } from '@angular/core/testing';
import { LocalStore } from './local-store';

const KEY = 'symple.test';

describe('LocalStore', () => {
  let store: LocalStore;

  beforeEach(() => {
    localStorage.clear();
    store = TestBed.inject(LocalStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('O1: reads the text stored under a key', () => {
    localStorage.setItem(KEY, 'abc');
    expect(store.read(KEY)).toBe('abc');
  });

  it('O2: reads nothing when nothing is stored', () => {
    expect(store.read(KEY)).toBeNull();
  });

  it('O3: reads nothing when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage is blocked.');
    });
    expect(() => store.read(KEY)).not.toThrow();
    expect(store.read(KEY)).toBeNull();
  });

  it('O4: writes a text under a key', () => {
    store.write(KEY, 'abc');
    expect(localStorage.getItem(KEY)).toBe('abc');
  });

  it('O5: does not throw when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage is full.');
    });
    expect(() => store.write(KEY, 'abc')).not.toThrow();
  });
});
