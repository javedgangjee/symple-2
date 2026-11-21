import { TestBed } from '@angular/core/testing';
import { Scan } from './scan';
import { ScanSettings, SelectionMode } from './scan-settings';
import { Switches } from './switches';

describe('Switches', () => {
  let switches: Switches;
  const scan = { press: vi.fn(), move: vi.fn() };
  let added: HTMLElement[];

  function setUp(mode: SelectionMode): void {
    TestBed.inject(ScanSettings).set({ selectionMode: mode });
    switches = TestBed.inject(Switches);
    switches.start();
  }

  /** Sends a key press to an element, as the browser does, and returns the key down event. */
  function key(
    name: string,
    target: HTMLElement = document.body,
    init: KeyboardEventInit = {},
  ): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    target.dispatchEvent(event);
    target.dispatchEvent(
      new KeyboardEvent('keyup', { key: name, bubbles: true, cancelable: true, ...init }),
    );
    return event;
  }

  /** Adds an element to the page and gives it the focus. */
  function focused<T extends HTMLElement>(element: T): T {
    document.body.appendChild(element);
    added.push(element);
    element.focus();
    return element;
  }

  /** A cell, as a button that counts its presses. */
  function focusedCell(): { button: HTMLButtonElement; clicks: ReturnType<typeof vi.fn> } {
    const button = document.createElement('button');
    const clicks = vi.fn();
    button.addEventListener('click', clicks);
    return { button: focused(button), clicks };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: Scan, useValue: scan }] });
    localStorage.clear();
    scan.press.mockClear();
    scan.move.mockClear();
    added = [];
  });

  afterEach(() => {
    switches.stop();
    added.forEach((element) => element.remove());
    localStorage.clear();
  });

  it('W1: Enter on the page body is one press in scan mode', () => {
    setUp('scan');
    key('Enter');
    expect(scan.press).toHaveBeenCalledTimes(1);
    expect(scan.move).not.toHaveBeenCalled();
  });

  it('W2: Tab is a move and Shift with Tab is a move back, and the browser moves no focus', () => {
    setUp('scan');
    const forward = key('Tab');
    const back = key('Tab', document.body, { shiftKey: true });
    expect(scan.move.mock.calls).toEqual([[1], [-1]]);
    expect(forward.defaultPrevented).toBe(true);
    expect(back.defaultPrevented).toBe(true);
  });

  it('W3: Tab is a move and Enter is a press in step mode', () => {
    setUp('step');
    key('Tab');
    expect(scan.move.mock.calls).toEqual([[1]]);
    expect(scan.press).not.toHaveBeenCalled();
    key('Enter');
    expect(scan.press).toHaveBeenCalledTimes(1);
  });

  it('W4: a key that is held down counts once', () => {
    setUp('scan');
    for (const name of ['Tab', 'Enter']) {
      key(name);
      for (let count = 0; count < 5; count++) {
        const repeated = key(name, document.body, { repeat: true });
        // The browser must not act on a repeated key either.
        expect(repeated.defaultPrevented).toBe(true);
      }
    }
    expect(scan.move).toHaveBeenCalledTimes(1);
    expect(scan.press).toHaveBeenCalledTimes(1);
  });

  it('W5: Space on a focused cell does nothing in scan mode', () => {
    setUp('scan');
    const { button, clicks } = focusedCell();
    const event = key(' ', button);
    expect(scan.press).not.toHaveBeenCalled();
    expect(scan.move).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(clicks).not.toHaveBeenCalled();
  });

  it('W6: Enter on a focused cell is one press, and the browser does not press the cell', () => {
    setUp('scan');
    const { button, clicks } = focusedCell();
    const event = key('Enter', button);
    expect(scan.press).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(clicks).not.toHaveBeenCalled();
  });

  it('W8: Tab and Enter in a text field are left to the browser', () => {
    setUp('scan');
    const field = focused(document.createElement('input'));
    const tab = key('Tab', field);
    const enter = key('Enter', field);
    expect(scan.press).not.toHaveBeenCalled();
    expect(scan.move).not.toHaveBeenCalled();
    expect(tab.defaultPrevented).toBe(false);
    expect(enter.defaultPrevented).toBe(false);
  });

  it('W9: other keys are not switches', () => {
    setUp('scan');
    for (const name of ['a', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      key(name);
    }
    expect(scan.press).not.toHaveBeenCalled();
    expect(scan.move).not.toHaveBeenCalled();
  });

  it('W10: Tab and Enter are left to the browser in cursor, touch and dwell mode', () => {
    for (const mode of ['cursor', 'touch', 'dwell'] as const) {
      setUp(mode);
      const tab = key('Tab');
      const enter = key('Enter');
      expect(scan.press, mode).not.toHaveBeenCalled();
      expect(scan.move, mode).not.toHaveBeenCalled();
      expect(tab.defaultPrevented, mode).toBe(false);
      expect(enter.defaultPrevented, mode).toBe(false);
      switches.stop();
    }
  });

  it('W7: Enter on a focused cell is left to the browser in touch mode', () => {
    setUp('touch');
    const { button, clicks } = focusedCell();
    button.click();
    const event = key('Enter', button);
    // The test page does not press a button for a key as a browser does. The key is left alone,
    // and case K22 of the end to end tests checks that the browser then presses the cell.
    expect(event.defaultPrevented).toBe(false);
    expect(clicks).toHaveBeenCalledTimes(1);
    expect(scan.press).not.toHaveBeenCalled();
  });
});
