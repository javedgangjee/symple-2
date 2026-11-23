import { type BrowserContext, type Page } from '@playwright/test';

/**
 * What a page has in place of the Web Speech API. `voice` is a stand-in that makes no sound,
 * with two English voices and one French voice. `none` is a browser with no Web Speech API at all.
 */
export type SpeechKind = 'voice' | 'none';

/** The event that tells the stand-in that the voice has finished. */
const END_EVENT = 'speech-stand-in-end';

/** A voice of the stand-in, as the browser describes one. The app stores a voice by its `voiceURI`. */
export interface StandInVoice {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
  localService: boolean;
}

/** The first English voice. It is the default voice of the stand-in. */
export const VOICE_A: StandInVoice = {
  name: 'Voice A',
  lang: 'en-GB',
  voiceURI: 'stand-in-voice-a',
  default: true,
  localService: true,
};

/** The second English voice. */
export const VOICE_B: StandInVoice = {
  name: 'Voice B',
  lang: 'en-US',
  voiceURI: 'stand-in-voice-b',
  default: false,
  localService: true,
};

/** The French voice. The app lists only English voices, so it never shows this one. */
export const FRENCH_VOICE: StandInVoice = {
  name: 'Voix française',
  lang: 'fr-FR',
  voiceURI: 'stand-in-voice-fr',
  default: false,
  localService: true,
};

/** One text that the app asked the stand-in to speak, with the voice and the three values it set. */
export interface SpokenText {
  text: string;
  /** The `voiceURI` of the voice of the utterance, or an empty text when it had none. */
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
}

/**
 * Puts the stand-in on the page before the app starts. It runs in the page, so it uses nothing
 * from this file. The stand-in records each call in `speechStandIn.log` as "speak:" with the
 * text, or as "cancel". It also records each spoken text in `speechStandIn.spoken`, with the
 * voice, the rate, the pitch and the volume of its utterance. A speech runs until the test ends
 * it or the app cancels it.
 */
function install({
  kind,
  endEvent,
  voices,
}: {
  kind: SpeechKind;
  endEvent: string;
  voices: StandInVoice[];
}): void {
  if ('speechStandIn' in window) {
    // A test that opens several boards in one page asks for the stand-in each time.
    return;
  }
  const put = (name: string, value: unknown) =>
    Object.defineProperty(window, name, { value, configurable: true, writable: true });
  if (kind === 'none') {
    put('speechSynthesis', undefined);
    put('SpeechSynthesisUtterance', undefined);
    put('speechStandIn', { log: [], spoken: [] });
    return;
  }

  // The defaults are those of the Web Speech API.
  class Utterance extends EventTarget {
    voice: { voiceURI: string } | null = null;
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;

    constructor(readonly text: string) {
      super();
    }
  }

  const log: string[] = [];
  const spoken: {
    text: string;
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
  }[] = [];
  let running: Utterance | null = null;
  /** Ends the speech that runs with an event, as the browser does. */
  const finish = (event: Event) => {
    const utterance = running;
    running = null;
    utterance?.dispatchEvent(event);
  };
  const synthesis = Object.assign(new EventTarget(), {
    getVoices: () => voices,
    speak(utterance: Utterance) {
      log.push(`speak:${utterance.text}`);
      spoken.push({
        text: utterance.text,
        voice: utterance.voice?.voiceURI ?? '',
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume,
      });
      running = utterance;
    },
    cancel() {
      log.push('cancel');
      // The browser tells a cancelled utterance with an error that names the reason.
      finish(Object.assign(new Event('error'), { error: 'interrupted' }));
    },
  });
  window.addEventListener(endEvent, () => finish(new Event('end')));

  put('speechSynthesis', synthesis);
  put('SpeechSynthesisUtterance', Utterance);
  put('speechStandIn', { log, spoken });
}

/**
 * Gives every page load of a page, or of a browser context, the stand-in for the Web Speech API,
 * so the real system voice source of the app runs and no test speaks aloud.
 */
export async function standInForSpeech(
  target: Page | BrowserContext,
  kind: SpeechKind = 'voice',
): Promise<void> {
  await target.addInitScript(install, {
    kind,
    endEvent: END_EVENT,
    voices: [VOICE_A, VOICE_B, FRENCH_VOICE],
  });
}

/** Every call that the app made to the stand-in, in order: "speak:" with the text, or "cancel". */
export async function speechLog(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const standIn: unknown = Reflect.get(window, 'speechStandIn');
    const log: unknown =
      typeof standIn === 'object' && standIn !== null ? Reflect.get(standIn, 'log') : undefined;
    if (!Array.isArray(log)) {
      throw new Error('The page has no stand-in for the Web Speech API.');
    }
    return log.map(String);
  });
}

/** The texts that the app asked the stand-in to speak, in order. */
export async function spokenTexts(page: Page): Promise<string[]> {
  const log = await speechLog(page);
  return log.flatMap((call) => (call.startsWith('speak:') ? [call.slice('speak:'.length)] : []));
}

/** Each text that the app asked the stand-in to speak, in order, with its voice and its three values. */
export async function spokenWithVoice(page: Page): Promise<SpokenText[]> {
  const records = await page.evaluate(() => {
    const standIn: unknown = Reflect.get(window, 'speechStandIn');
    const spoken: unknown =
      typeof standIn === 'object' && standIn !== null ? Reflect.get(standIn, 'spoken') : undefined;
    if (!Array.isArray(spoken)) {
      throw new Error('The page has no stand-in for the Web Speech API.');
    }
    const read = (record: unknown, name: string): unknown =>
      typeof record === 'object' && record !== null ? Reflect.get(record, name) : undefined;
    return spoken.map((record: unknown) => ({
      text: String(read(record, 'text')),
      voice: String(read(record, 'voice')),
      rate: Number(read(record, 'rate')),
      pitch: Number(read(record, 'pitch')),
      volume: Number(read(record, 'volume')),
    }));
  });
  return records;
}

/** Ends the speech that runs, as a voice that has finished does. */
export async function endSpeech(page: Page): Promise<void> {
  await page.evaluate((name) => window.dispatchEvent(new Event(name)), END_EVENT);
}
