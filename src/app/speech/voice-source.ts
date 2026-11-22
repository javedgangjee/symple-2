import { InjectionToken } from '@angular/core';

/**
 * A voice that speaks text aloud. The system voices are the only source for now.
 * The screens never use it directly. They use the `Speech` service.
 * Feature 8 adds the list of voices and the rate, the pitch and the volume.
 */
export interface VoiceSource {
  /**
   * Speaks one text. A speech that still runs is stopped first, so one text is heard at a time.
   * The promise resolves when the speech ends, is stopped or fails. It never rejects,
   * and a source that cannot speak resolves it at once.
   */
  speak(text: string): Promise<void>;

  /** Stops the speech that runs. It does nothing when no speech runs. */
  stop(): void;
}

/** The voice source in use. The app config provides the system source, and the unit tests provide a fake. */
export const VOICE_SOURCE = new InjectionToken<VoiceSource>('VOICE_SOURCE');
