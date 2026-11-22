import { VoiceSource } from './voice-source';

/** One call that the fake got: a text to speak, or a stop. */
export type VoiceCall =
  { readonly kind: 'speak'; readonly text: string } | { readonly kind: 'stop' };

/**
 * A voice source for the unit tests. It makes no sound and records each call.
 * A speech runs until the test ends it or a stop comes.
 */
export class FakeVoiceSource implements VoiceSource {
  /** The calls made so far, in order. */
  readonly calls: VoiceCall[] = [];

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

  speak(text: string): Promise<void> {
    this.end();
    this.calls.push({ kind: 'speak', text });
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
