import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AUTH_SOURCE } from '../auth/auth';
import { FakeAuthSource } from '../auth/fake-auth-source';
import { EditMode } from '../edit/edit-mode';
import { SCAN_STORAGE_KEYS, ScanSettingValues, ScanSettings } from '../scan/scan-settings';
import { FakeVoiceSource } from '../speech/fake-voice-source';
import { VOICE_STORAGE_KEYS, VoiceSettings } from '../speech/voice-settings';
import { VOICE_SOURCE, VoiceValues } from '../speech/voice-source';
import { SettingsOpen } from './settings-open';
import { SettingsPanel } from './settings-panel';
import { standInForDialog } from '../edit/dialog-stand-in';

@Component({ template: '' })
class Blank {}

const VOICE_A = { id: 'voice-a', name: 'Voice A' };
const VOICE_B = { id: 'voice-b', name: 'Voice B' };

describe('SettingsPanel', () => {
  let fixture: ComponentFixture<SettingsPanel>;
  let element: HTMLElement;
  let auth: FakeAuthSource;
  let voice: FakeVoiceSource;
  let state: SettingsOpen;
  let restoreDialog: () => void;

  /** Draws the panel and opens it. The settings are used as if they had been stored. */
  async function open(
    scan: Partial<ScanSettingValues> = {},
    voiceValues: Partial<VoiceValues> = {},
    email = FakeAuthSource.ACCOUNT.email,
  ): Promise<void> {
    auth = new FakeAuthSource();
    voice = new FakeVoiceSource();
    voice.voices.set([VOICE_A, VOICE_B]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        { provide: AUTH_SOURCE, useValue: auth },
        { provide: VOICE_SOURCE, useValue: voice },
      ],
    });
    auth.report({ id: FakeAuthSource.ACCOUNT.id, email });
    TestBed.inject(ScanSettings).set(scan);
    TestBed.inject(VoiceSettings).set(voiceValues);
    state = TestBed.inject(SettingsOpen);
    fixture = TestBed.createComponent(SettingsPanel);
    document.body.appendChild(fixture.nativeElement);
    state.open();
    await fixture.whenStable();
    element = fixture.nativeElement;
  }

  /** The one element that matches a selector. The test fails when there is none. */
  function one<T extends HTMLElement = HTMLElement>(selector: string): T {
    const found = element.querySelector<T>(selector);
    if (!found) {
      throw new Error(`Nothing matches "${selector}".`);
    }
    return found;
  }

  const dialog = () => one<HTMLDialogElement>('dialog');
  const tabs = () => Array.from(element.querySelectorAll<HTMLElement>('[role="tab"]'));
  const tabNames = () => tabs().map((tab) => tab.textContent?.trim());
  const chosenTab = () => one('[role="tab"][aria-selected="true"]');
  const shownPanes = () =>
    Array.from(element.querySelectorAll<HTMLElement>('[role="tabpanel"]'))
      .filter((pane) => !pane.hidden)
      .map((pane) => pane.querySelector('h3')?.textContent?.trim());
  const button = (name: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === name || candidate.textContent?.trim() === name,
    );
  const rowOf = (label: string) =>
    Array.from(element.querySelectorAll<HTMLElement>('.row')).find(
      (row) => row.querySelector('.what')?.textContent?.trim() === label,
    );
  /** The text of a time as it is drawn, such as "2.0 s". */
  const timeOf = (label: string) =>
    rowOf(label)?.querySelector('output [aria-hidden="true"]')?.textContent?.trim();

  async function press(name: string): Promise<void> {
    const found = button(name);
    if (!found) {
      throw new Error(`There is no button named "${name}".`);
    }
    found.click();
    await fixture.whenStable();
  }

  async function showTab(name: string): Promise<void> {
    const tab = tabs().find((candidate) => candidate.textContent?.trim() === name);
    if (!tab) {
      throw new Error(`There is no tab named "${name}".`);
    }
    tab.click();
    await fixture.whenStable();
  }

  async function key(target: HTMLElement, name: string): Promise<void> {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    await fixture.whenStable();
  }

  /** Picks an option of a drop-down by its value, as a caregiver does. */
  async function choose(selector: string, value: string): Promise<void> {
    const select = one<HTMLSelectElement>(selector);
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
  }

  /** Presses the radio button with a value. */
  async function pick(name: string, value: string): Promise<void> {
    one<HTMLInputElement>(`input[name="${name}"][value="${value}"]`).click();
    await fixture.whenStable();
  }

  /** Presses a button a number of times. */
  async function pressTimes(name: string, times: number): Promise<void> {
    for (let done = 0; done < times; done++) {
      await press(name);
    }
  }

  /** The text of a rate, a pitch or a volume as it is drawn, such as "1.5×". */
  const amountOf = (label: string) => rowOf(label)?.querySelector('output')?.textContent?.trim();

  const chosenVoice = () =>
    one<HTMLSelectElement>('#settings-voice').selectedOptions[0]?.textContent?.trim();

  beforeEach(() => {
    localStorage.clear();
    restoreDialog = standInForDialog();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    restoreDialog();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('PA1 and PA23: the panel opens as a dialog named Settings with six tabs, on Boards, which is the first', async () => {
    await open();
    expect(dialog().open).toBe(true);
    const title = dialog().getAttribute('aria-labelledby');
    expect(title && one(`#${title}`).textContent?.trim()).toBe('Settings');
    expect(tabNames()).toEqual(['Boards', 'Selection', 'Speech', 'Appearance', 'Account', 'About']);
    expect(chosenTab().textContent?.trim()).toBe('Boards');
    expect(shownPanes()).toEqual(['Boards']);
    expect(document.activeElement).toBe(chosenTab());
  });

  it('PA2: the Down arrow, End and Home choose a tab and give it the focus', async () => {
    await open();
    for (const [name, chosen] of [
      ['ArrowDown', 'Selection'],
      ['End', 'About'],
      ['Home', 'Boards'],
    ]) {
      await key(chosenTab(), name);
      expect(chosenTab().textContent?.trim(), name).toBe(chosen);
      expect(document.activeElement, name).toBe(chosenTab());
      expect(shownPanes(), name).toEqual([chosen]);
      // Only the chosen tab takes a Tab stop.
      expect(
        tabs().filter((tab) => tab.tabIndex === 0),
        name,
      ).toEqual([chosenTab()]);
    }
  });

  it('PA3: the mode Dwell is stored, and the dwell settings take the place of the scan settings', async () => {
    await open();
    expect(rowOf('Scan time')).toBeDefined();
    await choose('#settings-mode', 'dwell');
    expect(localStorage.getItem(SCAN_STORAGE_KEYS.selectionMode)).toBe('dwell');
    expect(element.querySelector('.note')).toBeNull();
    expect(rowOf('Dwell time')).toBeDefined();
    expect(rowOf('Dwell style')).toBeDefined();
    expect(rowOf('Scan time')).toBeUndefined();
    expect(rowOf('Show progress bar')).toBeUndefined();
    expect(rowOf('Post click delay')).toBeDefined();
  });

  it('PA4: Longer scan time adds half a second', async () => {
    await open({ scanTime: 1500 });
    await press('Longer scan time');
    expect(TestBed.inject(ScanSettings).scanTime()).toBe(2000);
    expect(timeOf('Scan time')).toBe('2.0 s');
  });

  it('PA5: Shorter scan time does nothing at the shortest time', async () => {
    await open({ scanTime: 500 });
    expect(button('Shorter scan time')?.getAttribute('aria-disabled')).toBe('true');
    await press('Shorter scan time');
    expect(TestBed.inject(ScanSettings).scanTime()).toBe(500);
    expect(timeOf('Scan time')).toBe('0.5 s');
  });

  it('PA6: the post click delay goes down to 0, and its button then says it is disabled', async () => {
    await open({ postClickDelay: 500 });
    expect(button('Shorter post click delay')?.getAttribute('aria-disabled')).toBe('false');
    await press('Shorter post click delay');
    expect(TestBed.inject(ScanSettings).postClickDelay()).toBe(0);
    expect(button('Shorter post click delay')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('PA7: a scan time that is not on a step moves to the next step', async () => {
    await open({ scanTime: 1250 });
    await press('Longer scan time');
    expect(TestBed.inject(ScanSettings).scanTime()).toBe(1500);
  });

  it('PA8: a press on Show progress bar turns it on and stores it', async () => {
    await open();
    const bar = one<HTMLInputElement>('input[role="switch"]');
    expect(bar.checked).toBe(false);
    bar.click();
    await fixture.whenStable();
    expect(localStorage.getItem(SCAN_STORAGE_KEYS.showProgressBar)).toBe('true');
    expect(bar.checked).toBe(true);
  });

  it('PA9: the dwell style Bar is stored', async () => {
    await open({ selectionMode: 'dwell' });
    await pick('settings-dwell-style', 'bar');
    expect(localStorage.getItem(SCAN_STORAGE_KEYS.dwellStyle)).toBe('bar');
  });

  it('PA22: Longer dwell time adds half a second', async () => {
    await open({ selectionMode: 'dwell', dwellTime: 1000 });
    await press('Longer dwell time');
    expect(TestBed.inject(ScanSettings).dwellTime()).toBe(1500);
    expect(timeOf('Dwell time')).toBe('1.5 s');
  });

  it('PA21: a press on the dimmed page closes the panel, and a drag out of the panel does not', async () => {
    await open();
    // Only the dimmed page gives the dialog itself as the target of a press.
    dialog().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(state.isOpen()).toBe(false);

    state.open();
    await fixture.whenStable();
    // A drag that starts on a control and ends on the dimmed page reports its click on the dialog.
    one('#settings-mode').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(state.isOpen()).toBe(true);
  });

  it('PA10: with no stored voice the list shows the default voice and stores nothing', async () => {
    await open();
    await showTab('Speech');
    const options = Array.from(one<HTMLSelectElement>('#settings-voice').options);
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Voice A', 'Voice B']);
    expect(chosenVoice()).toBe('Voice A');
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.voice)).toBeNull();
  });

  /** Case PA11: Voice B is chosen and the rate is set to 1.5. */
  async function chooseVoiceBAndRate(): Promise<void> {
    await open();
    await showTab('Speech');
    await choose('#settings-voice', VOICE_B.id);
    await pressTimes('Faster rate', 5);
  }

  it('PA11: a chosen voice and a rate are stored, and the rate is shown', async () => {
    await chooseVoiceBAndRate();
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.voice)).toBe(VOICE_B.id);
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.rate)).toBe('1.5');
    expect(amountOf('Rate')).toBe('1.5×');
  });

  it('PA12: the volume is shown as a percentage, and it stops at the ends of its range', async () => {
    await open();
    await showTab('Speech');
    expect(button('Higher volume')?.getAttribute('aria-disabled')).toBe('true');
    await press('Higher volume');
    expect(amountOf('Volume')).toBe('100%');
    await pressTimes('Lower volume', 5);
    expect(amountOf('Volume')).toBe('50%');
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.volume)).toBe('0.5');
    await pressTimes('Lower volume', 6);
    expect(amountOf('Volume')).toBe('0%');
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.volume)).toBe('0');
    expect(button('Lower volume')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('PA12b: every step of the rate and the pitch is stored with one decimal place', async () => {
    await open();
    await showTab('Speech');
    const stored: (string | null)[] = [];
    for (let step = 0; step < 5; step++) {
      await press('Slower rate');
      stored.push(localStorage.getItem(VOICE_STORAGE_KEYS.rate));
    }
    expect(stored).toEqual(['0.9', '0.8', '0.7', '0.6', '0.5']);
    await pressTimes('Higher pitch', 10);
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.pitch)).toBe('2');
    expect(amountOf('Pitch')).toBe('2.0');
  });

  it('PA13: Play a sample speaks the sample with the chosen voice and rate', async () => {
    await chooseVoiceBAndRate();
    await press('Play a sample');
    expect(voice.spoken).toEqual([
      { text: 'Hello. This is my voice.', voice: VOICE_B.id, rate: 1.5, pitch: 1, volume: 1 },
    ]);
  });

  it('PA14: a stored voice that the device lacks shows the default voice and is kept', async () => {
    await open({}, { voice: 'a-voice-of-another-device' });
    await showTab('Speech');
    expect(chosenVoice()).toBe('Voice A');
    expect(localStorage.getItem(VOICE_STORAGE_KEYS.voice)).toBe('a-voice-of-another-device');
  });

  it('PA15: the theme Teal applies, and the panel has no layout control', async () => {
    await open();
    await showTab('Appearance');
    await choose('#settings-theme', 'teal');
    expect(document.documentElement.getAttribute('data-theme')).toBe('teal');
    expect(rowOf('Layout')).toBeUndefined();
  });

  it('PA16: the Account tab shows the email address of the account', async () => {
    await open({}, {}, 'carer@example.com');
    await showTab('Account');
    expect(rowOf('Signed in as')?.querySelector('.val')?.textContent?.trim()).toBe(
      'carer@example.com',
    );
  });

  it('PA17: Sign out signs out once and closes the panel', async () => {
    await open();
    await showTab('Account');
    await press('Sign out');
    expect(auth.signOuts).toBe(1);
    expect(state.isOpen()).toBe(false);
    expect(dialog().open).toBe(false);
  });

  it('PA18: the About tab shows the three credits and does not name OpenMoji', async () => {
    await open();
    await showTab('About');
    const credits = Array.from(
      one('#settings-pane-about').querySelectorAll<HTMLElement>('.row'),
    ).map((row) => row.textContent ?? '');
    expect(credits.length).toBe(3);
    expect(credits[0]).toContain('Javed Gangjee');
    expect(credits[1]).toContain('Mulberry Symbols');
    expect(credits[1]).toContain('CC BY-SA 4.0');
    expect(credits[2]).toContain('Lucide');
    expect(credits[2]).toContain('ISC License');
    expect(element.textContent).not.toContain('OpenMoji');
    expect(element.textContent).not.toContain('Material');
  });

  it('PA19: Done closes the panel, and so does Escape', async () => {
    await open();
    await press('Done');
    expect(state.isOpen()).toBe(false);
    expect(dialog().open).toBe(false);

    state.open();
    await fixture.whenStable();
    expect(dialog().open).toBe(true);
    // A browser closes a modal dialog on Escape and then tells of it with a close event.
    dialog().close();
    await fixture.whenStable();
    expect(state.isOpen()).toBe(false);
  });

  it('PA20: the panel has no Keyboard tab', async () => {
    await open();
    expect(tabNames()).not.toContain('Keyboard');
  });

  it('PA24: Edit boards over Needs closes the panel and turns edit mode on', async () => {
    await open();
    const edit = TestBed.inject(EditMode);
    edit.show('needs');
    await press('Edit boards');
    expect(state.isOpen()).toBe(false);
    expect(dialog().open).toBe(false);
    expect(edit.isOn()).toBe(true);
  });

  it('PA25: Edit boards over the QWERTY keyboard, a locked board, opens home in edit mode', async () => {
    await open();
    const router = TestBed.inject(Router);
    const edit = TestBed.inject(EditMode);
    await router.navigateByUrl('/board/keyboard');
    edit.show('keyboard');
    await press('Edit boards');
    expect(state.isOpen()).toBe(false);
    expect(router.url).toBe('/');
    expect(edit.isOn()).toBe(true);
  });
});
