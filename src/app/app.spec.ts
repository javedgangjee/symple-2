import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AUTH_SOURCE } from './auth/auth';
import { FakeAuthSource } from './auth/fake-auth-source';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // The footer holds the Sign out button, which needs an auth source.
      providers: [provideRouter([]), { provide: AUTH_SOURCE, useValue: new FakeAuthSource() }],
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
