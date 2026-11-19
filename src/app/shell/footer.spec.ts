import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AUTH_SOURCE } from '../auth/auth';
import { FakeAuthSource } from '../auth/fake-auth-source';
import { Footer } from './footer';
import { Header } from './header';

@Component({ template: '' })
class Blank {}

describe('Footer', () => {
  let source: FakeAuthSource;
  let fixture: ComponentFixture<Footer>;
  let element: HTMLElement;

  beforeEach(async () => {
    source = new FakeAuthSource();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        { provide: AUTH_SOURCE, useValue: source },
      ],
    });
    source.report(FakeAuthSource.ACCOUNT);
    fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  it('O1: shows one button named Sign out with the caregiver control mark', async () => {
    const buttons = element.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent?.trim()).toBe('Sign out');
    expect(buttons[0].hasAttribute('data-caregiver-control')).toBe(true);

    // The settings button carries the same mark.
    const header = TestBed.createComponent(Header);
    await header.whenStable();
    const settings = (header.nativeElement as HTMLElement).querySelector(
      'button[aria-label="Settings"]',
    );
    expect(settings?.hasAttribute('data-caregiver-control')).toBe(true);
  });

  it('O2: a press on Sign out calls the sign out of the source once', async () => {
    element.querySelector('button')?.click();
    await fixture.whenStable();
    expect(source.signOuts).toBe(1);
  });
});
