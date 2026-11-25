import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tile } from '../boards/board-data';
import { Message } from '../keyboard/message';
import { Cell } from './cell';
import { LUCIDE_FILE } from './icon-set';

const NEEDS: Tile = {
  id: 'needs',
  label: 'Needs',
  colour: 'soft1',
  hue: 'c2',
  style: 'bleed',
  icon: 'heart',
  action: { type: 'open', board: 'needs' },
};
const BACK: Tile = {
  id: 'back',
  label: 'Back',
  colour: 'ink',
  style: 'stage',
  icon: 'back',
  action: { type: 'back' },
};
const HELP: Tile = {
  id: 'help',
  label: 'Help',
  colour: 'light',
  style: 'symbol',
  symbol: 'help.svg',
  action: { type: 'speak', phrase: 'I need help' },
};
const KEY_Q: Tile = {
  id: 'key-q',
  label: 'q',
  colour: 'light',
  style: 'key',
  action: { type: 'type', text: 'q' },
};
const FULL_STOP: Tile = {
  id: 'key-full-stop',
  label: '.',
  name: 'Full stop',
  colour: 'light',
  style: 'key',
  action: { type: 'type', text: '.' },
};
const CAPS: Tile = {
  id: 'key-caps',
  label: 'Caps lock',
  colour: 'soft1',
  style: 'key',
  icon: 'caps',
  action: { type: 'caps' },
};
const APPLE: Tile = {
  id: 'apple',
  label: 'Apple',
  colour: 'light',
  style: 'symbol',
  icon: 'lucide:apple',
  action: { type: 'speak', phrase: 'Apple' },
};
const DOG: Tile = {
  id: 'dog',
  label: 'Dog',
  colour: 'light',
  style: 'symbol',
  symbol: 'dog.svg',
  action: { type: 'speak', phrase: 'Dog' },
};
const MESSAGE: Tile = { id: 'message', label: 'Message', colour: 'light', style: 'message' };

describe('Cell', () => {
  let fixture: ComponentFixture<Cell>;

  async function draw(tile: Tile): Promise<HTMLButtonElement> {
    fixture = TestBed.createComponent(Cell);
    fixture.componentRef.setInput('tile', tile);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const buttons = element.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    return buttons[0];
  }

  const hueClasses = (button: HTMLElement) =>
    ['c1', 'c2', 'c3', 'c4', 'c5'].filter((hue) => button.classList.contains(hue));

  it('C1: the home tile Needs is one named button with its colour, hue and style', async () => {
    const button = await draw(NEEDS);
    expect(button.getAttribute('aria-label')).toBe('Needs');
    expect(button.textContent?.trim()).toBe('Needs');
    expect([...button.classList].sort()).toEqual(['bleed', 'c2', 'cell', 'soft1']);
    const icons = button.querySelectorAll('svg');
    expect(icons.length).toBe(1);
    expect(icons[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('C2: the Back tile is ink and stage with no hue', async () => {
    const button = await draw(BACK);
    expect(button.getAttribute('aria-label')).toBe('Back');
    expect([...button.classList].sort()).toEqual(['cell', 'ink', 'stage']);
    expect(hueClasses(button)).toEqual([]);
  });

  it('C3: a symbol tile shows its symbol file with empty alt text', async () => {
    const button = await draw(HELP);
    expect(button.getAttribute('aria-label')).toBe('Help');
    expect(button.classList.contains('symbol')).toBe(true);
    const images = button.querySelectorAll('img');
    expect(images.length).toBe(1);
    expect(images[0].getAttribute('src')).toMatch(/symbols\/help\.svg$/);
    expect(images[0].getAttribute('alt')).toBe('');
  });

  it('C4: the button is enabled and has the type button', async () => {
    const button = await draw(NEEDS);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('type')).toBe('button');
  });

  it('C5: a press is reported once with the tile', async () => {
    const button = await draw(HELP);
    const presses: Tile[] = [];
    fixture.componentInstance.press.subscribe((tile) => presses.push(tile));
    button.click();
    expect(presses).toEqual([HELP]);
  });

  it('C6: a letter key shows a capital while caps lock is on', async () => {
    const button = await draw(KEY_Q);
    expect(button.classList.contains('key')).toBe(true);
    expect(button.textContent?.trim()).toBe('q');
    expect(button.getAttribute('aria-label')).toBe('q');
    TestBed.inject(Message).toggleCaps();
    await fixture.whenStable();
    expect(button.textContent?.trim()).toBe('Q');
    expect(button.getAttribute('aria-label')).toBe('Q');
  });

  it('C7: the full stop key shows its sign and has a name in words', async () => {
    const button = await draw(FULL_STOP);
    expect(button.textContent?.trim()).toBe('.');
    expect(button.getAttribute('aria-label')).toBe('Full stop');
  });

  it('C8: the Caps lock key says whether it is pressed', async () => {
    const button = await draw(CAPS);
    expect(button.getAttribute('aria-label')).toBe('Caps lock');
    expect(button.querySelectorAll('svg').length).toBe(1);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    TestBed.inject(Message).toggleCaps();
    await fixture.whenStable();
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('C9: the message tile shows the message and a caret', async () => {
    TestBed.inject(Message).type('hi');
    const button = await draw(MESSAGE);
    expect(button.classList.contains('message')).toBe(true);
    expect(button.textContent?.trim()).toBe('hi');
    expect(button.getAttribute('aria-label')).toBe('hi');
    const caret = button.querySelector('.caret');
    expect(caret).not.toBeNull();
    expect(caret?.getAttribute('aria-hidden')).toBe('true');
  });

  it('CE1: a symbol tile with the icon lucide:apple and no symbol draws the icon on the plate', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LUCIDE_FILE,
          useValue: () =>
            Promise.resolve([{ name: 'apple', shapes: [{ tag: 'path', d: 'M2 2h20' }] }]),
        },
      ],
    });
    const button = await draw(APPLE);
    const plate = button.querySelector('.plate');
    expect(plate).not.toBeNull();
    expect(plate?.querySelectorAll('img').length).toBe(0);
    const icons = plate?.querySelectorAll('svg') ?? [];
    expect(icons.length).toBe(1);
    expect(icons[0].querySelectorAll('path').length).toBe(1);
    expect(button.querySelector('.label')?.textContent?.trim()).toBe('Apple');
  });

  it('CE2: a symbol tile with the symbol dog.svg shows that image on the plate', async () => {
    const button = await draw(DOG);
    const plate = button.querySelector('.plate');
    const images = plate?.querySelectorAll('img') ?? [];
    expect(images.length).toBe(1);
    expect(images[0].getAttribute('src')).toBe('symbols/dog.svg');
    expect(plate?.querySelectorAll('svg').length).toBe(0);
    expect(button.querySelector('.label')?.textContent?.trim()).toBe('Dog');
  });
});
