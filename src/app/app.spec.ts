import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AUTH_SOURCE } from './auth/auth';
import { FakeAuthSource } from './auth/fake-auth-source';
import { FakeVoiceSource } from './speech/fake-voice-source';
import { VOICE_SOURCE } from './speech/voice-source';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // The settings panel holds the Sign out button and the voice list, which need an auth
      // source and a voice source.
      providers: [
        provideRouter([]),
        { provide: AUTH_SOURCE, useValue: new FakeAuthSource() },
        { provide: VOICE_SOURCE, useValue: new FakeVoiceSource() },
      ],
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
