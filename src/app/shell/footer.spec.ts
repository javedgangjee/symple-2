import { TestBed } from '@angular/core/testing';
import { EditMode } from '../edit/edit-mode';
import { Footer } from './footer';

describe('Footer', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function draw(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('O1 and EA1: out of edit mode the footer holds no button', async () => {
    const element = await draw();
    expect(element.querySelector('footer')).not.toBeNull();
    expect(element.querySelectorAll('button').length).toBe(0);
  });

  it('EA2: in edit mode the footer holds Add Board, Add Tile, Configure Board and Done', async () => {
    TestBed.inject(EditMode).start();
    const element = await draw();
    const names = Array.from(element.querySelectorAll('footer button'), (button) =>
      button.textContent?.trim(),
    );
    expect(names).toEqual(['Add Board', 'Add Tile', 'Configure Board', 'Done']);
  });
});
