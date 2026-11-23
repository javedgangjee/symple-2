import { TestBed } from '@angular/core/testing';
import { FakeVoiceSource } from './fake-voice-source';
import { Speech } from './speech';
import { VoiceSettings } from './voice-settings';
import { VOICE_SOURCE } from './voice-source';

describe('Speech', () => {
  let source: FakeVoiceSource;
  let speech: Speech;

  beforeEach(() => {
    localStorage.clear();
    source = new FakeVoiceSource();
    TestBed.configureTestingModule({ providers: [{ provide: VOICE_SOURCE, useValue: source }] });
    speech = TestBed.inject(Speech);
  });

  it('SP1: a text goes to the voice source', () => {
    speech.say('I need help');
    expect(source.texts).toEqual(['I need help']);
  });

  it('SP4: a second text stops the first speech and is then spoken', () => {
    speech.say('I need help');
    const before = source.calls.length;
    speech.say('I am in pain');
    expect(source.calls.slice(before)).toEqual([
      { kind: 'stop' },
      { kind: 'speak', text: 'I am in pain' },
    ]);
  });

  it('SP6: an empty text is not spoken and stops nothing', () => {
    speech.say('');
    expect(source.calls).toEqual([]);
  });

  it('SP7: a text of only spaces is not spoken and stops nothing', () => {
    speech.say('   ');
    expect(source.calls).toEqual([]);
  });

  it('SP8: a text goes to the voice source with the voice, the rate, the pitch and the volume', () => {
    TestBed.inject(VoiceSettings).set({ voice: 'voice-b', rate: 1.5, pitch: 0.8, volume: 0.5 });
    speech.say('Hello');
    expect(source.spoken).toEqual([
      { text: 'Hello', voice: 'voice-b', rate: 1.5, pitch: 0.8, volume: 0.5 },
    ]);
  });
});
