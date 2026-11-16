import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('P1: holds one header, one main area and one footer, in that order', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const regions = Array.from(element.querySelectorAll('header, main, footer'));
    expect(regions.map((region) => region.tagName.toLowerCase())).toEqual([
      'header',
      'main',
      'footer',
    ]);
  });
});
