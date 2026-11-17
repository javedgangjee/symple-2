import { Injectable, signal } from '@angular/core';

/**
 * The one message that the keyboard writes, and the caps lock state.
 * The message is kept while the user moves between boards and is lost when the app is closed.
 */
@Injectable({ providedIn: 'root' })
export class Message {
  private readonly current = signal('');
  private readonly capsOn = signal(false);

  /** The message so far. */
  readonly text = this.current.asReadonly();

  /** Whether caps lock is on. */
  readonly caps = this.capsOn.asReadonly();

  /** Adds text to the end of the message. Letters are added as capitals while caps lock is on. */
  type(text: string): void {
    this.current.update((message) => message + this.cased(text));
  }

  /** Removes the last character. An empty message stays empty. */
  backspace(): void {
    // The spread splits by character, so a sign made of two code units is removed whole.
    this.current.update((message) => [...message].slice(0, -1).join(''));
  }

  /** Empties the message. */
  clear(): void {
    this.current.set('');
  }

  /** Turns caps lock on or off. It stays that way until this is called again. */
  toggleCaps(): void {
    this.capsOn.update((on) => !on);
  }

  /** Gives the text as it is typed now: in capitals while caps lock is on. */
  cased(text: string): string {
    return this.capsOn() ? text.toUpperCase() : text;
  }
}
