import { TestBed } from '@angular/core/testing';
import {
  SystemVoiceSource,
  WEB_SPEECH,
  WebSpeech,
  WebSynthesis,
  WebUtterance,
} from './system-voice-source';

function voice(name: string, lang: string, options: { default?: true; server?: true } = {}) {
  const made: SpeechSynthesisVoice = {
    name,
    lang,
    voiceURI: name,
    default: options.default === true,
    localService: options.server !== true,
  };
  return made;
}

/** An utterance that makes no sound. The test fires its events. */
class StandInUtterance extends EventTarget implements WebUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';

  constructor(readonly text: string) {
    super();
  }
}

/** A stand-in for `speechSynthesis`. It records each call in order and speaks nothing. */
class StandInSynthesis extends EventTarget implements WebSynthesis {
  /** Each call in order: "speak:" with the text, or "cancel". */
  readonly log: string[] = [];
  readonly spoken: StandInUtterance[] = [];

  constructor(public voices: SpeechSynthesisVoice[]) {
    super();
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  speak(utterance: StandInUtterance): void {
    this.log.push(`speak:${utterance.text}`);
    this.spoken.push(utterance);
  }

  cancel(): void {
    this.log.push('cancel');
  }

  /** Fires an event on the utterance that was spoken last. */
  fire(type: 'end' | 'error'): void {
    this.spoken.at(-1)?.dispatchEvent(new Event(type));
  }
}

describe('SystemVoiceSource', () => {
  const ENGLISH = voice('Daniel', 'en-GB', { default: true });
  let warn: ReturnType<typeof vi.spyOn>;

  function sourceWith(speech: WebSpeech | null): SystemVoiceSource {
    TestBed.configureTestingModule({
      providers: [SystemVoiceSource, { provide: WEB_SPEECH, useValue: speech }],
    });
    return TestBed.inject(SystemVoiceSource);
  }

  /** Makes a source that speaks through a stand-in with these voices. */
  function sourceWithVoices(voices: SpeechSynthesisVoice[]) {
    const synthesis = new StandInSynthesis(voices);
    return { synthesis, source: sourceWith({ synthesis, Utterance: StandInUtterance }) };
  }

  /** Follows a promise, so a test can tell whether it has settled. */
  function follow(promise: Promise<void>): { settled: boolean } {
    const state = { settled: false };
    void promise.then(() => {
      state.settled = true;
    });
    return state;
  }

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
    vi.useRealTimers();
  });

  it('VS1: a text is spoken as one utterance with the default English voice', () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    void source.speak('I need help');
    expect(synthesis.spoken.length).toBe(1);
    expect(synthesis.spoken[0].text).toBe('I need help');
    expect(synthesis.spoken[0].voice).toBe(ENGLISH);
  });

  it('VS2: the promise settles when the speech ends', async () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    const promise = source.speak('I need help');
    const state = follow(promise);
    await Promise.resolve();
    expect(state.settled).toBe(false);
    synthesis.fire('end');
    await expect(promise).resolves.toBeUndefined();
  });

  it('VS3: the promise settles when the speech fails, and nothing is thrown', async () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    const promise = source.speak('I need help');
    expect(() => synthesis.fire('error')).not.toThrow();
    await expect(promise).resolves.toBeUndefined();
  });

  it('VS4: a default English voice that runs on a server is used before one on the device', () => {
    const server = voice('Google UK English Female', 'en-GB', { default: true, server: true });
    const { synthesis, source } = sourceWithVoices([voice('Samantha', 'en-US'), server]);
    void source.speak('I need help');
    expect(synthesis.spoken[0].voice).toBe(server);
  });

  it('VS5: the first English voice is used when the default voice is not English', () => {
    const english = voice('Samantha', 'en-US');
    const { synthesis, source } = sourceWithVoices([
      voice('Thomas', 'fr-FR', { default: true }),
      english,
    ]);
    void source.speak('I need help');
    expect(synthesis.spoken[0].voice).toBe(english);
  });

  it('VS10: with no English voice nothing is spoken, and one warning is written', async () => {
    const { synthesis, source } = sourceWithVoices([voice('Thomas', 'fr-FR', { default: true })]);
    await expect(source.speak('I need help')).resolves.toBeUndefined();
    expect(synthesis.spoken).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('VS6: a text waits for the voices when the list is empty at first', async () => {
    vi.useFakeTimers();
    const { synthesis, source } = sourceWithVoices([]);
    void source.speak('I need help');
    expect(synthesis.spoken).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    synthesis.voices = [ENGLISH];
    synthesis.dispatchEvent(new Event('voiceschanged'));
    await vi.advanceTimersByTimeAsync(0);
    expect(synthesis.spoken.map((utterance) => utterance.text)).toEqual(['I need help']);
    expect(synthesis.spoken[0].voice).toBe(ENGLISH);
  });

  it('VS7: with no Web Speech API nothing is thrown, and the promise settles at once', async () => {
    const source = sourceWith(null);
    await expect(source.speak('I need help')).resolves.toBeUndefined();
    expect(() => source.stop()).not.toThrow();
  });

  it('VS8: a second text cancels the first speech before it starts', () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    void source.speak('I need help');
    const before = synthesis.log.length;
    void source.speak('I am in pain');
    expect(synthesis.log.slice(before)).toEqual(['cancel', 'speak:I am in pain']);
  });

  it('VS9: a stop cancels the speech that runs', async () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    const promise = source.speak('I need help');
    const before = synthesis.log.length;
    source.stop();
    expect(synthesis.log.slice(before)).toEqual(['cancel']);
    await expect(promise).resolves.toBeUndefined();
  });
});
