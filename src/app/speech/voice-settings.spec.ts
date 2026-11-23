import { TestBed } from '@angular/core/testing';
import { VOICE_STORAGE_KEYS, VoiceSettings } from './voice-settings';

describe('VoiceSettings', () => {
  let settings: VoiceSettings;

  beforeEach(() => {
    localStorage.clear();
    settings = TestBed.inject(VoiceSettings);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('VO1: uses no voice and a rate, a pitch and a volume of 1 when nothing is stored', () => {
    settings.load();
    expect(settings.voice()).toBe('');
    expect(settings.rate()).toBe(1);
    expect(settings.pitch()).toBe(1);
    expect(settings.volume()).toBe(1);
  });

  it('VO2: uses the four stored values', () => {
    localStorage.setItem(VOICE_STORAGE_KEYS.voice, 'b');
    localStorage.setItem(VOICE_STORAGE_KEYS.rate, '1.5');
    localStorage.setItem(VOICE_STORAGE_KEYS.pitch, '0.8');
    localStorage.setItem(VOICE_STORAGE_KEYS.volume, '0.5');
    settings.load();
    expect(settings.values()).toEqual({ voice: 'b', rate: 1.5, pitch: 0.8, volume: 0.5 });
  });

  it('VO3: uses 1 for a stored rate, pitch or volume that is out of range or not a number', () => {
    localStorage.setItem(VOICE_STORAGE_KEYS.rate, '3');
    localStorage.setItem(VOICE_STORAGE_KEYS.pitch, '-1');
    localStorage.setItem(VOICE_STORAGE_KEYS.volume, 'loud');
    settings.load();
    expect(settings.rate()).toBe(1);
    expect(settings.pitch()).toBe(1);
    expect(settings.volume()).toBe(1);
  });

  it('VO4: a set value is used and stored', () => {
    settings.set({ rate: 0.5 });
    expect(settings.rate()).toBe(0.5);
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.rate)).toBe('0.5');
  });

  it('VO5: a set value that is out of range changes nothing and is not stored', () => {
    settings.set({ rate: 2.5 });
    expect(settings.rate()).toBe(1);
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.rate)).toBeNull();
  });

  it('VO6: a set value is used when writing storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('The storage is full.');
    });
    expect(() => settings.set({ volume: 0.3 })).not.toThrow();
    expect(settings.volume()).toBe(0.3);
  });
});
