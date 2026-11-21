import { TestBed } from '@angular/core/testing';
import { SCAN_STORAGE_KEYS, ScanSettings } from './scan-settings';

describe('ScanSettings', () => {
  let settings: ScanSettings;

  beforeEach(() => {
    localStorage.clear();
    settings = TestBed.inject(ScanSettings);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('T1: uses the defaults for the times and the mode when nothing is stored', () => {
    settings.load();
    expect(settings.scanTime()).toBe(1500);
    expect(settings.postClickDelay()).toBe(500);
    expect(settings.selectionMode()).toBe('scan');
  });

  it('T2: uses the stored times and the stored mode', () => {
    localStorage.setItem(SCAN_STORAGE_KEYS.scanTime, '2500');
    localStorage.setItem(SCAN_STORAGE_KEYS.postClickDelay, '0');
    localStorage.setItem(SCAN_STORAGE_KEYS.selectionMode, 'step');
    settings.load();
    expect(settings.scanTime()).toBe(2500);
    expect(settings.postClickDelay()).toBe(0);
    expect(settings.selectionMode()).toBe('step');
  });

  it('T3: uses the default scan time when the stored one is out of range or not a number', () => {
    for (const stored of ['499', '5001', 'abc', '']) {
      localStorage.setItem(SCAN_STORAGE_KEYS.scanTime, stored);
      settings.load();
      expect(settings.scanTime(), `"${stored}"`).toBe(1500);
    }
  });

  it('T4: uses the default post click delay when the stored one is out of range or not a number', () => {
    for (const stored of ['-1', '5001', 'abc']) {
      localStorage.setItem(SCAN_STORAGE_KEYS.postClickDelay, stored);
      settings.load();
      expect(settings.postClickDelay(), `"${stored}"`).toBe(500);
    }
  });

  it('T5: uses scan when the stored mode is unknown', () => {
    for (const stored of ['fast', 'auto', '']) {
      localStorage.setItem(SCAN_STORAGE_KEYS.selectionMode, stored);
      settings.load();
      expect(settings.selectionMode(), `"${stored}"`).toBe('scan');
    }
  });

  it('T8: uses the stored modes cursor, touch and dwell', () => {
    for (const stored of ['cursor', 'touch', 'dwell']) {
      localStorage.setItem(SCAN_STORAGE_KEYS.selectionMode, stored);
      settings.load();
      expect(settings.selectionMode()).toBe(stored);
    }
  });

  it('T6: uses the defaults when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage is blocked.');
    });
    expect(() => settings.load()).not.toThrow();
    expect(settings.scanTime()).toBe(1500);
    expect(settings.postClickDelay()).toBe(500);
    expect(settings.selectionMode()).toBe('scan');
  });

  it('T9: uses the defaults for the dwell time and the dwell style when nothing is stored', () => {
    settings.load();
    expect(settings.dwellTime()).toBe(1000);
    expect(settings.dwellStyle()).toBe('grow');
  });

  it('T10: uses the stored dwell time and the stored dwell style', () => {
    localStorage.setItem(SCAN_STORAGE_KEYS.dwellTime, '2000');
    localStorage.setItem(SCAN_STORAGE_KEYS.dwellStyle, 'bar');
    settings.load();
    expect(settings.dwellTime()).toBe(2000);
    expect(settings.dwellStyle()).toBe('bar');
  });

  it('T11: uses the dwell defaults when the stored values are not usable', () => {
    localStorage.setItem(SCAN_STORAGE_KEYS.dwellStyle, 'shrink');
    for (const stored of ['499', '5001', 'abc']) {
      localStorage.setItem(SCAN_STORAGE_KEYS.dwellTime, stored);
      settings.load();
      expect(settings.dwellTime(), `"${stored}"`).toBe(1000);
      expect(settings.dwellStyle()).toBe('grow');
    }
  });

  it('T12: hides the progress bar unless `true` is stored', () => {
    settings.load();
    expect(settings.showProgressBar()).toBe(false);
    for (const [stored, shown] of [
      ['true', true],
      ['false', false],
      ['yes', false],
      ['', false],
    ] as const) {
      localStorage.setItem(SCAN_STORAGE_KEYS.showProgressBar, stored);
      settings.load();
      expect(settings.showProgressBar(), `"${stored}"`).toBe(shown);
    }
  });

  it('T13: uses and stores a choice to show the progress bar', () => {
    settings.set({ showProgressBar: true });
    expect(settings.showProgressBar()).toBe(true);
    expect(localStorage.getItem(SCAN_STORAGE_KEYS.showProgressBar)).toBe('true');
  });

  it('T7: uses and stores a scan time that is set', () => {
    settings.set({ scanTime: 3000 });
    expect(settings.scanTime()).toBe(3000);
    expect(localStorage.getItem(SCAN_STORAGE_KEYS.scanTime)).toBe('3000');
  });

  it('T14: refuses a scan time that is out of range and stores nothing', () => {
    settings.set({ scanTime: 100 });
    expect(settings.scanTime()).toBe(1500);
    expect(localStorage.getItem(SCAN_STORAGE_KEYS.scanTime)).toBeNull();
  });

  it('T15: uses a scan time that is set when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage is full.');
    });
    expect(() => settings.set({ scanTime: 3000 })).not.toThrow();
    expect(settings.scanTime()).toBe(3000);
  });
});
