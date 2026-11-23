import { signal } from '@angular/core';
import { Voice, VoiceSource, VoiceValues } from './voice-source';

/** One call that the fake got: a text to speak, or a stop. */
export type VoiceCall =
  { readonly kind: 'speak'; readonly text: string } | { readonly kind: 'stop' };

/** One text that the fake was given, with the voice, the rate, the pitch and the volume for it. */
export interface SpokenText extends VoiceValues {
  readonly text: string;
}

/**
 * A voice source for the unit tests. It makes no sound and records each call.
 * A speech runs until the test ends it or a stop comes.
 */
export class FakeVoiceSource implements VoiceSource {
  /** The voices of the fake. A test sets them, and the first one is the default voice. */
  readonly voices = signal<readonly Voice[]>([]);

  /** The calls made so far, in order. */
  readonly calls: VoiceCall[] = [];

  /** The texts that the fake was given, in order, each with its four values. */
  readonly spoken: SpokenText[] = [];

  /** Settles the promise of the speech that runs. It is null when no speech runs. */
  private settle: (() => void) | null = null;

  /** The texts that the fake was given, in order. */
  get texts(): string[] {
    return this.calls.flatMap((call) => (call.kind === 'speak' ? [call.text] : []));
  }

  /** The number of stops so far. */
  get stops(): number {
    return this.calls.filter((call) => call.kind === 'stop').length;
  }

  /** Whether a speech runs. */
  get speaking(): boolean {
    return this.settle !== null;
  }

  inUse(id: string): string {
    const voices = this.voices();
    return (voices.find((voice) => voice.id === id) ?? voices.at(0))?.id ?? '';
  }

  speak(text: string, values: VoiceValues): Promise<void> {
    this.end();
    this.calls.push({ kind: 'speak', text });
    this.spoken.push({ text, ...values });
    return new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  stop(): void {
    this.calls.push({ kind: 'stop' });
    this.end();
  }

  /**
   * Ends the speech that runs, as a voice that has finished does. A speech that fails settles
   * its promise in the same way, so the fake has no separate call for a failure.
   */
  end(): void {
    this.settle?.();
    this.settle = null;
  }
}
