import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Auth } from '../auth/auth';
import {
  DWELL_STYLES,
  DwellStyle,
  SELECTION_MODES,
  ScanSettings,
  SelectionMode,
  TIME_LIMITS,
} from '../scan/scan-settings';
import { Speech } from '../speech/speech';
import { VOICE_RANGES, VoiceSettings } from '../speech/voice-settings';
import { VOICE_SOURCE } from '../speech/voice-source';
import { THEME_NAMES, Theme, ThemeName } from '../theme/theme';
import { SettingsOpen } from './settings-open';

/**
 * The five categories of the panel, in the order of the list.
 * The template draws the icon of each one by its id, because a Lucide icon can have several parts.
 */
const TABS = [
  { id: 'selection', label: 'Selection' },
  { id: 'speech', label: 'Speech' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'account', label: 'Account' },
  { id: 'about', label: 'About' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** The category that the panel shows each time it opens. */
const FIRST_TAB: TabId = 'selection';

/** The name of each selection mode in the list, and the note that says what the mode does. */
const MODES: Readonly<Record<SelectionMode, { readonly label: string; readonly note: string }>> = {
  scan: { label: 'Scan, one switch', note: 'The highlight moves by itself, and one switch picks.' },
  step: {
    label: 'Step, two switches',
    note: 'One switch moves the highlight, and a second switch picks.',
  },
  cursor: {
    label: 'Cursor',
    note: 'A pointer presses a cell. A round cursor shows where the pointer is.',
  },
  touch: { label: 'Touch', note: 'A finger or a pointer presses a cell.' },
  dwell: { label: 'Dwell', note: 'A pointer that rests on a cell presses it.' },
};

const DWELL_STYLE_LABELS: Readonly<Record<DwellStyle, string>> = { grow: 'Grow', bar: 'Bar' };

const THEME_LABELS: Readonly<Record<ThemeName, string>> = {
  colours: 'Colours',
  blue: 'Blue',
  purple: 'Purple',
  teal: 'Teal',
  dark: 'Dark',
};

/** One press of a minus or a plus button changes a time by this much, in milliseconds. */
const TIME_STEP = 500;

type TimeName = keyof typeof TIME_LIMITS;

/**
 * The three amounts of the voice. Each is set with a minus and a plus button, as a time is.
 * `less` and `more` name the two buttons, and `text` shows the value.
 */
const AMOUNTS = [
  {
    name: 'rate',
    label: 'Rate',
    less: 'Slower rate',
    more: 'Faster rate',
    text: (value: number) => `${value.toFixed(1)}×`,
  },
  {
    name: 'pitch',
    label: 'Pitch',
    less: 'Lower pitch',
    more: 'Higher pitch',
    text: (value: number) => value.toFixed(1),
  },
  {
    name: 'volume',
    label: 'Volume',
    less: 'Lower volume',
    more: 'Higher volume',
    text: (value: number) => `${Math.round(value * 100)}%`,
  },
] as const;

type AmountName = (typeof AMOUNTS)[number]['name'];

/** Two values of the voice closer than this are the same value. It hides the rounding of decimals. */
const CLOSE = 1e-6;

/** The text that Play a sample speaks. */
export const VOICE_SAMPLE = 'Hello. This is my voice.';

/** Under this width the categories lie in a row above the settings. settings-panel.css uses the same width. */
const NARROW = '(width < 52rem)';

/** The keys that move between the categories, and where each one goes from the category at `at`. */
const TAB_KEYS: Readonly<Record<string, (at: number) => number>> = {
  ArrowDown: (at) => at + 1,
  ArrowRight: (at) => at + 1,
  ArrowUp: (at) => at - 1,
  ArrowLeft: (at) => at - 1,
  Home: () => 0,
  End: () => TABS.length - 1,
};

/**
 * The settings panel. It is a caregiver screen, so scanning does not reach it. The caregiver
 * uses it with a pointer, or with the keyboard as the browser gives it.
 *
 * It is a native modal dialog. The browser makes the page behind it inert and closes it on
 * Escape. Each change applies and is stored at once, so the panel has no Save and no Cancel.
 */
@Component({
  selector: 'app-settings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.css',
})
export class SettingsPanel {
  private readonly state = inject(SettingsOpen);
  private readonly auth = inject(Auth);
  private readonly speech = inject(Speech);
  private readonly source = inject(VOICE_SOURCE);
  private readonly themeService = inject(Theme);
  protected readonly scan = inject(ScanSettings);
  protected readonly voice = inject(VoiceSettings);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly tabs = TABS;
  protected readonly modes = SELECTION_MODES;
  protected readonly modeText = MODES;
  protected readonly dwellStyles = DWELL_STYLES;
  protected readonly dwellStyleLabels = DWELL_STYLE_LABELS;
  protected readonly themes = THEME_NAMES;
  protected readonly themeLabels = THEME_LABELS;
  protected readonly amounts = AMOUNTS;

  /** The chosen category. Only its settings are shown. */
  protected readonly tab = signal<TabId>(FIRST_TAB);

  /** Whether the categories lie in a row, as they do in a narrow window. Screen readers are told. */
  protected readonly narrow = signal(false);

  protected readonly theme = this.themeService.name;

  /** The voices in the list. */
  protected readonly voices = this.source.voices;

  /**
   * The voice that the list shows as chosen. Until the caregiver picks one, and when the stored
   * voice is not on this device, it is the voice that the source speaks with.
   */
  protected readonly voiceInUse = computed(() => this.source.inUse(this.voice.voice()));

  /** The email address of the account, or nothing when the account has none. */
  protected readonly email = computed(() => this.auth.account()?.email ?? null);

  constructor() {
    this.watchWidth();

    // The panel opens on the first category each time.
    effect(() => {
      if (this.state.isOpen()) {
        untracked(() => this.tab.set(FIRST_TAB));
      }
    });

    // The dialog follows the open state. This runs after the page is drawn, so the chosen
    // category can take the focus, and a screen reader starts at the top of the dialog.
    afterRenderEffect(() => {
      const open = this.state.isOpen();
      const dialog = this.dialog().nativeElement;
      untracked(() => {
        if (open && !dialog.open) {
          dialog.showModal();
          this.focusTab(this.tab());
        } else if (!open && dialog.open) {
          dialog.close();
        }
      });
    });

    // A panel that is taken away while it is open, as at a sign out, leaves nothing marked open.
    inject(DestroyRef).onDestroy(() => this.state.close());
  }

  /** Closes the panel. Done, Escape and a press on the dimmed page all end here. */
  protected close(): void {
    this.state.close();
  }

  /** A press on the dimmed page closes the panel. Only the backdrop gives the dialog itself as the target. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  /**
   * Tab goes round inside the panel. From the last control it goes to the first, and Shift with
   * Tab goes the other way, so the focus never leaves for the browser's own buttons.
   */
  protected onDialogKey(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const stops = this.tabStops();
    const first = stops.at(0);
    const last = stops.at(-1);
    const active = this.dialog().nativeElement.ownerDocument.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  protected showTab(id: TabId): void {
    this.tab.set(id);
  }

  /** The arrow keys, Home and End choose another category and give it the focus. */
  protected onTabKey(event: KeyboardEvent, at: number): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const to = TAB_KEYS[event.key]?.(at);
    if (to === undefined) {
      return;
    }
    event.preventDefault();
    const { id } = TABS[(to + TABS.length) % TABS.length];
    this.tab.set(id);
    this.focusTab(id);
  }

  protected setMode(value: string): void {
    this.scan.setFromText('selectionMode', value);
  }

  /** A time as the panel shows it, in seconds with one decimal place. */
  protected seconds(ms: number): string {
    return (ms / 1000).toFixed(1);
  }

  /** The unit of a time for screen readers, which hear the whole word. */
  protected unit(ms: number): string {
    return ms === 1000 ? 'second' : 'seconds';
  }

  /** Whether a time is at its shortest (`-1`) or at its longest (`1`), so that button does nothing. */
  protected atLimit(name: TimeName, direction: 1 | -1): boolean {
    const value = this.scan[name]();
    const { min, max } = TIME_LIMITS[name];
    return direction === 1 ? value >= max : value <= min;
  }

  /**
   * Makes a time one step shorter or longer. A time that is not on a step moves to the next
   * step in that direction. The buttons stay in the tab order at the ends of the range, so the
   * focus is not lost there, and a press at the end changes nothing.
   */
  protected stepTime(name: TimeName, direction: 1 | -1): void {
    if (this.atLimit(name, direction)) {
      return;
    }
    const value = this.scan[name]();
    const { min, max } = TIME_LIMITS[name];
    const next =
      direction === 1
        ? Math.floor(value / TIME_STEP) * TIME_STEP + TIME_STEP
        : Math.ceil(value / TIME_STEP) * TIME_STEP - TIME_STEP;
    this.scan.setFromText(name, String(Math.min(max, Math.max(min, next))));
  }

  /** Whether the rate, the pitch or the volume is at its lowest (`-1`) or at its highest (`1`). */
  protected atVoiceLimit(name: AmountName, direction: 1 | -1): boolean {
    const value = this.voice[name]();
    const { min, max } = VOICE_RANGES[name];
    return direction === 1 ? value >= max - CLOSE : value <= min + CLOSE;
  }

  /**
   * Makes the rate, the pitch or the volume one step lower or higher. A value that is not on a
   * step moves to the next step in that direction. A press at the end of the range changes nothing.
   */
  protected stepVoice(name: AmountName, direction: 1 | -1): void {
    if (this.atVoiceLimit(name, direction)) {
      return;
    }
    const { min, max, step } = VOICE_RANGES[name];
    const steps = this.voice[name]() / step;
    const next =
      (direction === 1 ? Math.floor(steps + CLOSE) + 1 : Math.ceil(steps - CLOSE) - 1) * step;
    // Two decimal places drop the rounding error of the sum, so 0.7000000000000001 is stored as 0.7.
    this.voice.setFromText(name, String(Number(Math.min(max, Math.max(min, next)).toFixed(2))));
  }

  protected setTheme(value: string): void {
    const name = THEME_NAMES.find((theme) => theme === value);
    if (name) {
      this.themeService.set(name);
    }
  }

  /** Speaks the sample with the chosen voice, rate, pitch and volume. It stops a speech that runs. */
  protected playSample(): void {
    this.speech.say(VOICE_SAMPLE);
  }

  /** Signs the caregiver out and closes the panel. The auth service then opens the sign in screen. */
  protected signOut(): void {
    this.close();
    // A sign out only clears the sign in stored on this device, so there is no failure to show.
    void this.auth.signOut().catch(() => undefined);
  }

  private focusTab(id: TabId): void {
    this.dialog().nativeElement.querySelector<HTMLElement>(`#settings-tab-${id}`)?.focus();
  }

  /** The controls that Tab stops on, in order. A group of radio buttons takes one stop, on the chosen one. */
  private tabStops(): HTMLElement[] {
    const candidates = this.dialog().nativeElement.querySelectorAll<HTMLElement>(
      'button, select, input, [tabindex]',
    );
    return Array.from(candidates).filter(
      (element) =>
        element.tabIndex >= 0 &&
        element.closest('[hidden]') === null &&
        !(element instanceof HTMLInputElement && element.type === 'radio' && !element.checked),
    );
  }

  /** Follows the width of the window, where the browser can tell of it. */
  private watchWidth(): void {
    const view = inject(DOCUMENT).defaultView;
    if (typeof view?.matchMedia !== 'function') {
      return;
    }
    const query = view.matchMedia(NARROW);
    const update = () => this.narrow.set(query.matches);
    update();
    query.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', update));
  }
}
