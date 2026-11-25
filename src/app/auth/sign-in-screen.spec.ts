import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AUTH_SOURCE, AuthFailureKind } from './auth';
import { FakeAuthSource } from './fake-auth-source';
import { SignInScreen } from './sign-in-screen';

@Component({ template: '' })
class Blank {}

const RESET_SENT = 'An email has been sent to the associated account.';
const NO_NETWORK = 'Symple cannot reach the network. Connect and try again.';
const REPO = 'https://github.com/javedgangjee/symple-2';

describe('SignInScreen', () => {
  let source: FakeAuthSource;
  let fixture: ComponentFixture<SignInScreen>;
  let element: HTMLElement;
  let router: Router;

  const field = (name: 'Email' | 'Password'): HTMLInputElement => {
    const label = Array.from(element.querySelectorAll('label')).find(
      (candidate) => candidate.textContent?.trim() === name,
    );
    const input = label ? element.querySelector(`#${label.htmlFor}`) : null;
    if (!(input instanceof HTMLInputElement)) {
      throw new Error(`There is no field named "${name}".`);
    }
    return input;
  };
  const buttons = () => Array.from(element.querySelectorAll('button'));
  const signInButton = (): HTMLButtonElement => {
    const button = element.querySelector('button[type="submit"]');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('There is no Sign in button.');
    }
    return button;
  };
  const forgotButton = (): HTMLButtonElement => {
    const button = buttons().find((b) => b.textContent?.trim() === 'Forgot password');
    if (!button) {
      throw new Error('There is no Forgot password control.');
    }
    return button;
  };
  const regions = () => Array.from(element.querySelectorAll('[role="status"], [role="alert"]'));
  const alertRegion = () => element.querySelector('[role="alert"]');
  const statusRegion = () => element.querySelector('[role="status"]');
  /** The one message on screen, from whichever region holds it. */
  const message = () =>
    regions()
      .map((region) => region.textContent?.trim() ?? '')
      .join('');

  function fill(email: string, password = ''): void {
    field('Email').value = email;
    field('Password').value = password;
  }

  async function pressSignIn(): Promise<void> {
    signInButton().click();
    await fixture.whenStable();
  }

  async function pressForgot(): Promise<void> {
    forgotButton().click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    source = new FakeAuthSource();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'sign-in', component: Blank },
        ]),
        { provide: AUTH_SOURCE, useValue: source },
      ],
    });
    router = TestBed.inject(Router);
    await router.navigateByUrl('/sign-in');
    fixture = TestBed.createComponent(SignInScreen);
    // The screen is added to the page, so a press on a button sends the form as in a browser.
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    element = fixture.nativeElement;
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it('F1: shows the logo, the heading, the two fields and the two controls', () => {
    expect(element.querySelector('img[alt="Symple"]')).not.toBeNull();
    const headings = element.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Sign in');

    expect(field('Email').type).toBe('email');
    expect(field('Email').getAttribute('autocomplete')).toBe('email');
    expect(field('Password').type).toBe('password');
    expect(field('Password').getAttribute('autocomplete')).toBe('current-password');

    // There is no control that makes an account.
    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      'Sign in',
      'Forgot password',
    ]);
    // The one link is About Symple, which case IV1 checks.
    expect(
      Array.from(element.querySelectorAll('a')).map((link) => link.textContent?.trim()),
    ).toEqual(['About Symple']);
    expect(element.querySelectorAll('input').length).toBe(2);
  });

  it('F2: an empty email and an email with no @ ask for the email address', async () => {
    for (const email of ['', 'anna']) {
      fill(email, 'secret12');
      await pressSignIn();
      expect(message(), email).toBe('Enter your email address.');
      expect(field('Email').getAttribute('aria-invalid'), email).toBe('true');
      expect(source.signIns, email).toEqual([]);
    }
  });

  it('F3: an empty password asks for the password', async () => {
    fill('anna@example.com');
    await pressSignIn();
    expect(message()).toBe('Enter your password.');
    expect(source.signIns).toEqual([]);
  });

  it('F4: signs in with the trimmed email, and the button is disabled until the answer', async () => {
    let release: () => void = () => undefined;
    source.hold = new Promise<void>((resolve) => (release = resolve));
    fill(' anna@example.com ', 'secret12');
    await pressSignIn();
    expect(source.signIns).toEqual([{ email: 'anna@example.com', password: 'secret12' }]);
    expect(signInButton().disabled).toBe(true);
    expect(signInButton().textContent?.trim()).toBe('Signing in');
    release();
    await vi.waitFor(() => expect(signInButton().disabled).toBe(false));
  });

  it('F5: goes to the home route when the source accepts the sign in', async () => {
    expect(router.url).toBe('/sign-in');
    fill('anna@example.com', 'secret12');
    await pressSignIn();
    await vi.waitFor(() => expect(router.url).toBe('/'));
  });

  it('F6: a wrong email or password shows the message and keeps the fields', async () => {
    source.failWith = 'wrong';
    fill('anna@example.com', 'secret12');
    await pressSignIn();
    await vi.waitFor(() => expect(message()).toBe('The email or password is wrong.'));
    expect(signInButton().disabled).toBe(false);
    expect(signInButton().textContent?.trim()).toBe('Sign in');
    expect(field('Email').value).toBe('anna@example.com');
    expect(field('Password').value).toBe('secret12');
  });

  const failures: [string, AuthFailureKind, string][] = [
    ['F7', 'network', NO_NETWORK],
    ['F8', 'too-many', 'Too many tries. Wait a few minutes and try again.'],
    ['F9', 'disabled', 'This account is turned off.'],
    ['F10', 'unknown', 'Sign in failed. Try again.'],
  ];
  for (const [id, kind, text] of failures) {
    it(`${id}: a failure of the kind "${kind}" shows its message`, async () => {
      source.failWith = kind;
      fill('anna@example.com', 'secret12');
      await pressSignIn();
      await vi.waitFor(() => expect(message()).toBe(text));
    });
  }

  it('F11: Forgot password with an empty email asks for the email address', async () => {
    await pressForgot();
    expect(message()).toBe('Enter your email address, then press Forgot password.');
    expect(source.resets).toEqual([]);
  });

  it('F12: Forgot password asks the source for a reset email to the address', async () => {
    fill('anna@example.com');
    await pressForgot();
    expect(source.resets).toEqual(['anna@example.com']);
    await vi.waitFor(() => expect(message()).toBe(RESET_SENT));
  });

  it('F13: Forgot password shows the same message when the source fails with "wrong"', async () => {
    source.failWith = 'wrong';
    fill('anna@example.com');
    await pressForgot();
    await vi.waitFor(() => expect(message()).toBe(RESET_SENT));
  });

  it('F14: Forgot password shows the network message when the source fails with "network"', async () => {
    source.failWith = 'network';
    fill('anna@example.com');
    await pressForgot();
    await vi.waitFor(() => expect(message()).toBe(NO_NETWORK));
  });

  it('IV1: a line under the form says that accounts are by invitation and links to the repo', () => {
    const form = element.querySelector('form');
    const line = element.querySelector('p.invite');
    if (!form || !line) {
      throw new Error('There is no form, or no line under it.');
    }
    // The line comes after the form and is not part of it.
    expect(form.contains(line)).toBe(false);
    expect(form.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = (line.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(text).toContain('Symple is in testing');
    expect(text).toContain('accounts are by invitation');

    const links = Array.from(line.querySelectorAll('a'));
    expect(links.map((link) => link.textContent?.trim())).toEqual(['About Symple']);
    expect(links[0].getAttribute('href')).toBe(REPO);
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('IV2: no control makes an account, and Sign in and Forgot password are there as before', async () => {
    const controls = Array.from(element.querySelectorAll('button, a, input'));
    for (const control of controls) {
      const name = control.textContent ?? '';
      expect(name).not.toMatch(/sign up|create|register|new account|make an account/i);
    }
    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      'Sign in',
      'Forgot password',
    ]);
    expect(signInButton().disabled).toBe(false);
    expect(forgotButton().type).toBe('button');

    // Both still work as before.
    fill('anna@example.com', 'secret12');
    await pressSignIn();
    expect(source.signIns).toEqual([{ email: 'anna@example.com', password: 'secret12' }]);
    await vi.waitFor(() => expect(router.url).toBe('/'));
    await pressForgot();
    expect(source.resets).toEqual(['anna@example.com']);
  });

  it('F15: a message sits in one region that screen readers announce', async () => {
    // A fault sits in the alert region, and the status region stays empty.
    await pressSignIn();
    expect(regions().length).toBe(2);
    expect(alertRegion()?.textContent?.trim()).toBe('Enter your email address.');
    expect(statusRegion()?.textContent?.trim()).toBe('');

    // A second message takes the place of the first.
    source.failWith = 'wrong';
    fill('anna@example.com', 'secret12');
    await pressSignIn();
    await vi.waitFor(() =>
      expect(alertRegion()?.textContent?.trim()).toBe('The email or password is wrong.'),
    );
    expect(alertRegion()?.children.length).toBe(1);
    expect(statusRegion()?.children.length).toBe(0);

    // The reset message reports no fault. It sits in the status region and takes the place of the fault.
    source.failWith = null;
    await pressForgot();
    await vi.waitFor(() => expect(statusRegion()?.textContent?.trim()).toBe(RESET_SENT));
    expect(alertRegion()?.children.length).toBe(0);
    expect(statusRegion()?.children.length).toBe(1);
  });
});
