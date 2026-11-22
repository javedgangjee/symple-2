import { TestBed } from '@angular/core/testing';
import { FakeVoiceSource } from './fake-voice-source';
import { Speech } from './speech';
import { VOICE_SOURCE } from './voice-source';

describe('Speech', () => {
  let source: FakeVoiceSource;
  let speech: Speech;

  beforeEach(() => {
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
});
