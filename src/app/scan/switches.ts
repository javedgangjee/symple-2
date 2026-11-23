import { DOCUMENT, Injectable, inject } from '@angular/core';
import { SettingsOpen } from '../settings/settings-open';
import { Scan } from './scan';
import { ScanSettings, isSwitchMode } from './scan-settings';

/** Space is not a switch, but on a board it must not press the cell that holds the focus. */
const KEYS = ['Tab', 'Enter', ' '];

/** The input types that take no text. Every other input is a text field. */
const BUTTON_INPUTS = ['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file'];

/** Whether the focus is in a field that needs Tab and Enter for itself. */
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target instanceof HTMLInputElement) {
    return !BUTTON_INPUTS.includes(target.type);
  }
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/**
 * The key that opens the settings panel when it is pressed with Control. Chrome keeps Command
 * with comma, the habit of the Mac, for its own settings.
 */
const SETTINGS_KEY = ',';

/** What `aria-keyshortcuts` says for the shortcut of the settings panel. */
export const SETTINGS_SHORTCUT = `Control+${SETTINGS_KEY}`;

/**
 * Turns key presses into switch presses while a board is on show. In `scan` and `step` mode
 * Tab moves the highlight, Shift with Tab moves it back, and Enter picks. The browser does
 * nothing with those keys then. In the other modes the keys are left to the browser.
 * While the settings panel is open no key is a switch, so the caregiver has Tab and Enter.
 * Control with the comma key opens the panel in every mode. It is the caregiver's way to the
 * panel with the keyboard, because nothing outside the grid is in the tab order.
 */
@Injectable({ providedIn: 'root' })
export class Switches {
  private readonly document = inject(DOCUMENT);
  private readonly scan = inject(Scan);
  private readonly settings = inject(ScanSettings);
  private readonly panel = inject(SettingsOpen);

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.isSettingsShortcut(event)) {
      event.preventDefault();
      this.panel.open();
      return;
    }
    if (!this.isSwitchKey(event)) {
      return;
    }
    // The browser must not move the focus or press the focused button with the same key.
    event.preventDefault();
    if (event.repeat) {
      // A key that is held down counts once.
      return;
    }
    if (event.key === 'Tab') {
      this.scan.move(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Enter') {
      this.scan.press();
    }
  };

  /** Some browsers press a focused button when Space is let go, so that is stopped too. */
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.isSwitchKey(event)) {
      event.preventDefault();
    }
  };

  /** Starts to listen. The board screen calls this when it opens. */
  start(): void {
    this.document.addEventListener('keydown', this.onKeyDown);
    this.document.addEventListener('keyup', this.onKeyUp);
  }

  /** Stops listening. The board screen calls this when it closes. */
  stop(): void {
    this.document.removeEventListener('keydown', this.onKeyDown);
    this.document.removeEventListener('keyup', this.onKeyUp);
  }

  private isSettingsShortcut(event: KeyboardEvent): boolean {
    return (
      event.key === SETTINGS_KEY &&
      event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.shiftKey
    );
  }

  private isSwitchKey(event: KeyboardEvent): boolean {
    return (
      !this.panel.isOpen() &&
      isSwitchMode(this.settings.selectionMode()) &&
      KEYS.includes(event.key) &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !isTextField(event.target)
    );
  }
}
