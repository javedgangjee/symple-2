import { TestBed } from '@angular/core/testing';
import { Footer } from './footer';

describe('Footer', () => {
  it('O1: holds no button', async () => {
    const fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('footer')).not.toBeNull();
    expect(element.querySelectorAll('button').length).toBe(0);
  });
});
