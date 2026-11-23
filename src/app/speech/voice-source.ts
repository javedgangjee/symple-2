import { InjectionToken, Signal } from '@angular/core';

/** One voice that the caregiver can pick. */
export interface Voice {
  /** The id that the source gives the voice. It is what the app stores. */
  readonly id: string;
  /** The name that the list shows. */
  readonly name: string;
}

/** How a text is spoken. */
export interface VoiceValues {
  /** The id of the chosen voice. It is empty when the caregiver has not picked one. */
  readonly voice: string;
  /** The speed, where 1 is the normal speed of the voice. */
  readonly rate: number;
  /** The pitch, where 1 is the normal pitch of the voice. */
  readonly pitch: number;
  /** The volume, from 0 for silent to 1 for full. */
  readonly volume: number;
}

/**
 * A voice that speaks text aloud. The system voices are the only source for now.
 * The screens never speak through it directly. They use the `Speech` service.
 */
export interface VoiceSource {
  /** The English voices that the source has now. The list can fill a moment after the app starts. */
  readonly voices: Signal<readonly Voice[]>;

  /**
   * The id of the voice that a text would be spoken with for a stored id. That is the voice
   * of the stored id when the source has it, and the default voice of the source when the id
   * is empty or unknown. It is empty when the source has no voice.
   */
  inUse(id: string): string;

  /**
   * Speaks one text with the given voice, rate, pitch and volume. A speech that still runs is
   * stopped first, so one text is heard at a time. The promise resolves when the speech ends,
   * is stopped or fails. It never rejects, and a source that cannot speak resolves it at once.
   */
  speak(text: string, values: VoiceValues): Promise<void>;

  /** Stops the speech that runs. It does nothing when no speech runs. */
  stop(): void;
}

/** The voice source in use. The app config provides the system source, and the unit tests provide a fake. */
export const VOICE_SOURCE = new InjectionToken<VoiceSource>('VOICE_SOURCE');
