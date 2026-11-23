import { TestBed } from '@angular/core/testing';
import { DEFAULT_VOICE_SETTINGS } from './voice-settings';
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
  rate = 1;
  pitch = 1;
  volume = 1;

  constructor(readonly text: string) {
    super();
  }
}

/** A stand-in for `speechSynthesis`. It records each call in order and speaks nothing. */
class StandInSynthesis extends EventTarget implements WebSynthesis {
  /** Each call in order: "speak:" with the text, or "cancel". */
  readonly log: string[] = [];
  readonly spoken: StandInUtterance[] = [];
  /** How many times the list of voices was asked for. */
  voiceCalls = 0;

  constructor(public voices: SpeechSynthesisVoice[]) {
    super();
  }

  getVoices(): SpeechSynthesisVoice[] {
    this.voiceCalls += 1;
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

/** No chosen voice, and a rate, a pitch and a volume of 1. */
const PLAIN = DEFAULT_VOICE_SETTINGS;

describe('SystemVoiceSource', () => {
  const ENGLISH = voice('Daniel', 'en-GB', { default: true });
  const VOICE_A = voice('Voice A', 'en-US', { default: true });
  const VOICE_B = voice('Voice B', 'en-GB');
  const FRENCH = voice('Voix', 'fr-FR');
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
    void source.speak('I need help', PLAIN);
    expect(synthesis.spoken.length).toBe(1);
    expect(synthesis.spoken[0].text).toBe('I need help');
    expect(synthesis.spoken[0].voice).toBe(ENGLISH);
  });

  it('VS2: the promise settles when the speech ends', async () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    const promise = source.speak('I need help', PLAIN);
    const state = follow(promise);
    await Promise.resolve();
    expect(state.settled).toBe(false);
    synthesis.fire('end');
    await expect(promise).resolves.toBeUndefined();
  });

  it('VS3: the promise settles when the speech fails, and nothing is thrown', async () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    const promise = source.speak('I need help', PLAIN);
    expect(() => synthesis.fire('error')).not.toThrow();
    await expect(promise).resolves.toBeUndefined();
  });

  it('VS4: a default English voice that runs on a server is used before one on the device', () => {
    const server = voice('Google UK English Female', 'en-GB', { default: true, server: true });
    const { synthesis, source } = sourceWithVoices([voice('Samantha', 'en-US'), server]);
    void source.speak('I need help', PLAIN);
    expect(synthesis.spoken[0].voice).toBe(server);
  });

  it('VS5: the first English voice is used when the default voice is not English', () => {
    const english = voice('Samantha', 'en-US');
    const { synthesis, source } = sourceWithVoices([
      voice('Thomas', 'fr-FR', { default: true }),
      english,
    ]);
    void source.speak('I need help', PLAIN);
    expect(synthesis.spoken[0].voice).toBe(english);
  });

  it('VS10: with no English voice nothing is spoken, and one warning is written', async () => {
    const { synthesis, source } = sourceWithVoices([voice('Thomas', 'fr-FR', { default: true })]);
    await expect(source.speak('I need help', PLAIN)).resolves.toBeUndefined();
    expect(synthesis.spoken).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('VS6: a text waits for the voices when the list is empty at first', async () => {
    vi.useFakeTimers();
    const { synthesis, source } = sourceWithVoices([]);
    void source.speak('I need help', PLAIN);
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
    await expect(source.speak('I need help', PLAIN)).resolves.toBeUndefined();
    expect(() => source.stop()).not.toThrow();
  });

  it('VS8: a second text cancels the first speech before it starts', () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    void source.speak('I need help', PLAIN);
    const before = synthesis.log.length;
    void source.speak('I am in pain', PLAIN);
    expect(synthesis.log.slice(before)).toEqual(['cancel', 'speak:I am in pain']);
  });

  it('VS9: a stop cancels the speech that runs', async () => {
    const { synthesis, source } = sourceWithVoices([ENGLISH]);
    const promise = source.speak('I need help', PLAIN);
    const before = synthesis.log.length;
    source.stop();
    expect(synthesis.log.slice(before)).toEqual(['cancel']);
    await expect(promise).resolves.toBeUndefined();
  });

  it('VS11: the source asks for the voices once when it is made', () => {
    const { synthesis } = sourceWithVoices([ENGLISH]);
    expect(synthesis.voiceCalls).toBe(1);
    expect(synthesis.log).toEqual([]);
  });

  it('VS12: voices that never load give a warning that says so', async () => {
    vi.useFakeTimers();
    const { synthesis, source } = sourceWithVoices([]);
    const state = follow(source.speak('I need help', PLAIN));
    await vi.advanceTimersByTimeAsync(1000);
    expect(synthesis.spoken).toEqual([]);
    expect(state.settled).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('did not load'));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('no English voice'));
  });

  it('VS13: the list holds the English voices with their ids', () => {
    const { source } = sourceWithVoices([VOICE_A, VOICE_B, FRENCH]);
    expect(source.voices()).toEqual([
      { id: VOICE_A.voiceURI, name: 'Voice A' },
      { id: VOICE_B.voiceURI, name: 'Voice B' },
    ]);
  });

  it('VS14: the list fills when the browser tells of its voices', () => {
    const { synthesis, source } = sourceWithVoices([]);
    expect(source.voices()).toEqual([]);
    synthesis.voices = [VOICE_A, VOICE_B, FRENCH];
    synthesis.dispatchEvent(new Event('voiceschanged'));
    expect(source.voices().map((listed) => listed.name)).toEqual(['Voice A', 'Voice B']);
  });

  it('VS15: a text is spoken with the given voice, rate, pitch and volume', () => {
    const { synthesis, source } = sourceWithVoices([VOICE_A, VOICE_B, FRENCH]);
    void source.speak('Hello', { voice: VOICE_B.voiceURI, rate: 1.5, pitch: 0.8, volume: 0.5 });
    expect(synthesis.spoken.length).toBe(1);
    const [utterance] = synthesis.spoken;
    expect(utterance.voice).toBe(VOICE_B);
    expect(utterance.rate).toBe(1.5);
    expect(utterance.pitch).toBe(0.8);
    expect(utterance.volume).toBe(0.5);
  });

  it('VS16: an id that is not in the list gives the voice of the rule of feature 5', () => {
    const { synthesis, source } = sourceWithVoices([VOICE_A, VOICE_B, FRENCH]);
    void source.speak('Hello', { ...PLAIN, voice: 'A voice of another device' });
    expect(synthesis.spoken[0].voice).toBe(VOICE_A);
  });

  it('VS17: the voice in use is the default voice for no id, and the voice of a known id', () => {
    const { source } = sourceWithVoices([VOICE_A, VOICE_B, FRENCH]);
    expect(source.inUse('')).toBe(VOICE_A.voiceURI);
    expect(source.inUse(VOICE_B.voiceURI)).toBe(VOICE_B.voiceURI);
  });
});
