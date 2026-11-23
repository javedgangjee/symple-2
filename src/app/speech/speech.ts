import { Injectable, inject } from '@angular/core';
import { VoiceSettings } from './voice-settings';
import { VOICE_SOURCE } from './voice-source';

/**
 * Speaks text aloud for the screens, through the voice source in use, with the voice,
 * the rate, the pitch and the volume that the caregiver set.
 * It keeps no state, because no look depends on whether a speech runs.
 */
@Injectable({ providedIn: 'root' })
export class Speech {
  private readonly source = inject(VOICE_SOURCE);
  private readonly settings = inject(VoiceSettings);

  /**
   * Speaks a text from its start. A speech that still runs is stopped first.
   * An empty text, or one of only white space, is not spoken and stops nothing.
   */
  say(text: string): void {
    if (text.trim() === '') {
      return;
    }
    this.source.stop();
    // The source settles its promise when the speech ends and never rejects it. Nothing waits for it.
    void this.source.speak(text, this.settings.values());
  }
}
