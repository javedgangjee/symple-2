import { type BrowserContext, type Page } from '@playwright/test';

/**
 * What a page has in place of the Web Speech API. `voice` is a stand-in with one English voice
 * that makes no sound. `none` is a browser with no Web Speech API at all.
 */
export type SpeechKind = 'voice' | 'none';

/** The event that tells the stand-in that the voice has finished. */
const END_EVENT = 'speech-stand-in-end';

/**
 * Puts the stand-in on the page before the app starts. It runs in the page, so it uses nothing
 * from this file. The stand-in records each call in `speechStandIn.log` as "speak:" with the
 * text, or as "cancel". A speech runs until the test ends it or the app cancels it.
 */
function install({ kind, endEvent }: { kind: SpeechKind; endEvent: string }): void {
  if ('speechStandIn' in window) {
    // A test that opens several boards in one page asks for the stand-in each time.
    return;
  }
  const put = (name: string, value: unknown) =>
    Object.defineProperty(window, name, { value, configurable: true, writable: true });
  if (kind === 'none') {
    put('speechSynthesis', undefined);
    put('SpeechSynthesisUtterance', undefined);
    put('speechStandIn', { log: [] });
    return;
  }

  class Utterance extends EventTarget {
    voice: unknown = null;
    lang = '';

    constructor(readonly text: string) {
      super();
    }
  }

  const log: string[] = [];
  const voice = {
    name: 'Stand-in voice',
    lang: 'en-GB',
    voiceURI: 'stand-in',
    default: true,
    localService: true,
  };
  let running: Utterance | null = null;
  /** Ends the speech that runs with an event, as the browser does. */
  const finish = (event: Event) => {
    const utterance = running;
    running = null;
    utterance?.dispatchEvent(event);
  };
  const synthesis = Object.assign(new EventTarget(), {
    getVoices: () => [voice],
    speak(utterance: Utterance) {
      log.push(`speak:${utterance.text}`);
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
  put('speechStandIn', { log });
}

/**
 * Gives every page load of a page, or of a browser context, the stand-in for the Web Speech API,
 * so the real system voice source of the app runs and no test speaks aloud.
 */
export async function standInForSpeech(
  target: Page | BrowserContext,
  kind: SpeechKind = 'voice',
): Promise<void> {
  await target.addInitScript(install, { kind, endEvent: END_EVENT });
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

/** Ends the speech that runs, as a voice that has finished does. */
export async function endSpeech(page: Page): Promise<void> {
  await page.evaluate((name) => window.dispatchEvent(new Event(name)), END_EVENT);
}
