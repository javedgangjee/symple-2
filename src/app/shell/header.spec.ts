import { TestBed } from '@angular/core/testing';
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

  it('H3: holds a disabled button named "Settings" that is not a tab stop', async () => {
    const element = await draw();
    const button = element.querySelector('button[aria-label="Settings"]');
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button?.hasAttribute('disabled')).toBe(true);
    expect(button?.getAttribute('tabindex')).toBe('-1');
  });
});
