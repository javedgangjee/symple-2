import { TestBed } from '@angular/core/testing';
import { EditMode } from '../edit/edit-mode';
import { SettingsOpen } from '../settings/settings-open';
import { Header } from './header';

describe('Header', () => {
  async function draw(title = 'Home'): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Header);
    fixture.componentRef.setInput('title', title);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('H1: shows the title "Home" as the only h1', async () => {
    const element = await draw('Home');
    const headings = element.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Home');
  });

  it('H2: holds an image named "Symple"', async () => {
    const element = await draw();
    expect(element.querySelector('[role="img"][aria-label="Symple"]')).not.toBeNull();
  });

  it('H3: holds an enabled button named "Settings" that is not a tab stop', async () => {
    const element = await draw();
    const button = element.querySelector('button[aria-label="Settings"]');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.hasAttribute('disabled')).toBe(false);
    expect(button?.getAttribute('tabindex')).toBe('-1');
    expect(button?.hasAttribute('data-caregiver-control')).toBe(true);
    expect(button?.getAttribute('aria-keyshortcuts')).toBe('Control+,');
  });

  it('H4: a press on the settings button opens the panel', async () => {
    const fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>('button[aria-label="Settings"]');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    button?.click();
    await fixture.whenStable();
    expect(TestBed.inject(SettingsOpen).isOpen()).toBe(true);
    expect(button?.getAttribute('aria-expanded')).toBe('true');
  });

  it('H5: in edit mode the header shows no settings button and keeps its title', async () => {
    TestBed.inject(EditMode).start();
    const element = await draw('Needs');
    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Needs');
  });
});
