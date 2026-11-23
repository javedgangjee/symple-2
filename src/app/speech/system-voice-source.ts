import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Voice, VoiceSource, VoiceValues } from './voice-source';

/**
 * How long the source waits for the list of voices when the browser has not filled it yet,
 * in milliseconds. Chrome fills the list a moment after the page starts.
 */
export const VOICES_WAIT_MS = 1000;

/** What the source uses of an utterance of the Web Speech API. */
export interface WebUtterance {
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  addEventListener(type: 'end' | 'error', listener: (event: Event) => void): void;
}

/** What the source uses of `speechSynthesis`. */
export interface WebSynthesis {
  getVoices(): SpeechSynthesisVoice[];
  speak(utterance: WebUtterance): void;
  cancel(): void;
  addEventListener(type: 'voiceschanged', listener: () => void): void;
  removeEventListener(type: 'voiceschanged', listener: () => void): void;
}

/** The two parts of the Web Speech API that speak a text. */
export interface WebSpeech {
  readonly synthesis: WebSynthesis;
  readonly Utterance: new (text: string) => WebUtterance;
}

/** A window that may or may not have the Web Speech API. */
interface SpeechWindow {
  readonly speechSynthesis?: WebSynthesis;
  readonly SpeechSynthesisUtterance?: new (text: string) => WebUtterance;
}

/**
 * The Web Speech API of the browser, or null when the browser has none.
 * The unit tests replace it with a stand-in, so no test speaks aloud.
 */
export const WEB_SPEECH = new InjectionToken<WebSpeech | null>('WEB_SPEECH', {
  providedIn: 'root',
  factory: () => {
    const view: SpeechWindow | null = inject(DOCUMENT).defaultView;
    const synthesis = view?.speechSynthesis;
    const Utterance = view?.SpeechSynthesisUtterance;
    return synthesis && Utterance ? { synthesis, Utterance } : null;
  },
});

/** A language tag for English, such as "en", "en-GB" or "en_US". */
const ENGLISH = /^en([-_]|$)/i;

/** The English voices of a list, in the order of the list. */
function englishVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((voice) => ENGLISH.test(voice.lang));
}

/**
 * Picks the voice. The voice with the given id is used when the list has it among its English
 * voices. Otherwise the pick is the default voice of the browser when it is English, or else
 * the first English voice in the list. A voice that runs on a server is used like any other.
 */
export function englishVoice(
  voices: readonly SpeechSynthesisVoice[],
  id = '',
): SpeechSynthesisVoice | undefined {
  const english = englishVoices(voices);
  return (
    (id === '' ? undefined : english.find((voice) => voice.voiceURI === id)) ??
    english.find((voice) => voice.default) ??
    english[0]
  );
}

/** Gives the list of voices once the browser has filled it, or the list as it is after the wait. */
function voicesLoaded(synthesis: WebSynthesis): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synthesis.removeEventListener('voiceschanged', done);
      resolve(synthesis.getVoices());
    };
    const timer = setTimeout(done, VOICES_WAIT_MS);
    synthesis.addEventListener('voiceschanged', done);
  });
}

/**
 * Whether an `error` event says that the browser failed to speak. A speech that was stopped
 * to make way for the next one also ends with an `error` event, and that is no failure.
 */
function isFailure(event: Event): boolean {
  const reason: unknown = 'error' in event ? event.error : undefined;
  return reason !== 'interrupted' && reason !== 'canceled';
}

/**
 * Speaks with the voices of the system through the Web Speech API.
 * When the browser cannot speak, nothing is spoken, nothing is thrown and one warning goes to the console.
 */
@Injectable()
export class SystemVoiceSource implements VoiceSource {
  private readonly speech = inject(WEB_SPEECH);

  /**
   * The utterance that is being spoken. Chrome can drop an utterance that nothing holds
   * before it ends, and then its `end` event never comes.
   */
  private current: WebUtterance | null = null;

  /** Settles the promise of the speech that runs. It is null when no speech runs. */
  private settle: (() => void) | null = null;

  /**
   * The number of calls so far. A call that waited for the voices speaks only when
   * no other call came in the meantime.
   */
  private turn = 0;

  /** The English voices that the browser has now. */
  private readonly english = signal<readonly SpeechSynthesisVoice[]>([]);

  readonly voices = computed<readonly Voice[]>(() =>
    this.english().map((voice) => ({ id: voice.voiceURI, name: voice.name })),
  );

  constructor() {
    const synthesis = this.speech?.synthesis;
    if (!synthesis) {
      return;
    }
    // Chrome starts to load its list of voices on the first call, so the list is asked for
    // before the first pick. It tells of the loaded list, and of each later change, with an event.
    this.english.set(englishVoices(synthesis.getVoices()));
    const refill = () => this.english.set(englishVoices(synthesis.getVoices()));
    synthesis.addEventListener('voiceschanged', refill);
    inject(DestroyRef).onDestroy(() => synthesis.removeEventListener('voiceschanged', refill));
  }

  inUse(id: string): string {
    return englishVoice(this.english(), id)?.voiceURI ?? '';
  }

  speak(text: string, values: VoiceValues): Promise<void> {
    const speech = this.speech;
    if (!speech) {
      console.warn('Nothing was spoken: this browser has no Web Speech API.');
      return Promise.resolve();
    }
    this.stop();
    const voices = speech.synthesis.getVoices();
    if (voices.length > 0) {
      // The text is spoken in the same turn as the press, with no wait.
      return this.utter(speech, text, values, voices);
    }
    const turn = this.turn;
    return voicesLoaded(speech.synthesis).then((loaded) =>
      turn === this.turn ? this.utter(speech, text, values, loaded) : undefined,
    );
  }

  stop(): void {
    this.turn++;
    this.speech?.synthesis.cancel();
    // Not every browser tells an utterance that it was cancelled, so its promise is settled here.
    this.settle?.();
  }

  private utter(
    speech: WebSpeech,
    text: string,
    values: VoiceValues,
    voices: readonly SpeechSynthesisVoice[],
  ): Promise<void> {
    if (voices.length === 0) {
      // The list is empty only after the wait, because a call with no voices waits for them.
      console.warn('Nothing was spoken: the voices of this browser did not load.');
      return Promise.resolve();
    }
    // A stored voice that this device lacks, such as one synced from another device, gives the default voice.
    const voice = englishVoice(voices, values.voice);
    if (!voice) {
      console.warn('Nothing was spoken: this browser has no English voice.');
      return Promise.resolve();
    }
    const utterance = new speech.Utterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = values.rate;
    utterance.pitch = values.pitch;
    utterance.volume = values.volume;
    return new Promise((resolve) => {
      const done = () => {
        if (this.current === utterance) {
          this.current = null;
          this.settle = null;
        }
        resolve();
      };
      utterance.addEventListener('end', done);
      utterance.addEventListener('error', (event) => {
        if (isFailure(event)) {
          console.warn('Nothing was spoken: the browser failed to speak.');
        }
        done();
      });
      this.current = utterance;
      this.settle = done;
      speech.synthesis.speak(utterance);
    });
  }
}
