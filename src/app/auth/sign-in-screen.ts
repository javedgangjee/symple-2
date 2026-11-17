import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, AuthFailure, AuthFailureKind } from './auth';

/** The messages that the screen shows for each kind of failure. */
const FAILURE_MESSAGES: Readonly<Record<AuthFailureKind, string>> = {
  wrong: 'The email or password is wrong.',
  network: 'Symple cannot reach the network. Connect and try again.',
  'too-many': 'Too many tries. Wait a few minutes and try again.',
  disabled: 'This account is turned off.',
  unknown: 'Sign in failed. Try again.',
};

const ENTER_EMAIL = 'Enter your email address.';
const ENTER_PASSWORD = 'Enter your password.';
const ENTER_EMAIL_FOR_RESET = 'Enter your email address, then press Forgot password.';
const RESET_SENT = 'If an account uses this address, a reset email is on its way.';

function failureOf(error: unknown): AuthFailureKind {
  return error instanceof AuthFailure ? error.kind : 'unknown';
}

/** A usable address has text and an `@`. Firebase does the full check. */
function isEmail(value: string): boolean {
  return value.includes('@');
}

/**
 * The sign in screen. It is a caregiver screen, so it works with a keyboard and a pointer
 * and scanning does not reach it. The app has no way to make an account.
 */
@Component({
  selector: 'app-sign-in-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in-screen.html',
  styleUrl: './sign-in-screen.css',
})
export class SignInScreen {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  /** The request that is running, if any. A second request cannot start until it ends. */
  protected readonly busy = signal<'sign-in' | 'reset' | null>(null);

  /**
   * The one message on screen. Each new message gets a new number, so a screen reader
   * hears a message again when it is the same as the one before.
   */
  protected readonly message = signal({ text: '', count: 0 });

  /** The field that the message is about, if any. It is marked invalid. */
  protected readonly invalid = signal<'email' | 'password' | null>(null);

  /**
   * Signs in with the text of the two fields. The fields are read when the form is sent,
   * so text that a password manager filled in is used, and the password is never kept by the screen.
   */
  protected async signIn(email: HTMLInputElement, password: HTMLInputElement): Promise<void> {
    if (this.busy()) {
      return;
    }
    const address = email.value.trim();
    if (!isEmail(address)) {
      this.say(ENTER_EMAIL, 'email');
      email.focus();
      return;
    }
    if (password.value === '') {
      this.say(ENTER_PASSWORD, 'password');
      password.focus();
      return;
    }

    this.say('');
    this.busy.set('sign-in');
    try {
      await this.auth.signIn(address, password.value);
    } catch (error) {
      this.busy.set(null);
      this.say(FAILURE_MESSAGES[failureOf(error)]);
      this.keepFocus(password);
      return;
    }
    // The button stays disabled while the home screen opens.
    // The address is replaced, so the browser's Back button does not return here.
    await this.router.navigateByUrl('/', { replaceUrl: true });
    this.busy.set(null);
  }

  /** Asks for a reset email to the address in the Email field. */
  protected async forgotPassword(email: HTMLInputElement): Promise<void> {
    if (this.busy()) {
      return;
    }
    const address = email.value.trim();
    if (!isEmail(address)) {
      this.say(ENTER_EMAIL_FOR_RESET, 'email');
      email.focus();
      return;
    }

    this.say('');
    this.busy.set('reset');
    let failure: AuthFailureKind | null = null;
    try {
      await this.auth.sendPasswordReset(address);
    } catch (error) {
      failure = failureOf(error);
    }
    this.busy.set(null);
    // An address with no account and an account that is turned off get the same message
    // as a reset that was sent, so the screen does not reveal who has an account.
    const sent = failure === null || failure === 'wrong' || failure === 'disabled';
    this.say(sent ? RESET_SENT : FAILURE_MESSAGES[failure ?? 'unknown']);
    this.keepFocus(email);
  }

  private say(text: string, invalid: 'email' | 'password' | null = null): void {
    this.invalid.set(invalid);
    this.message.update((said) => ({ text, count: said.count + 1 }));
  }

  /**
   * A button that is disabled while it has focus drops the focus to the page.
   * When that has happened, the focus goes to a field, so a keyboard user is not sent back to the top.
   */
  private keepFocus(field: HTMLInputElement): void {
    const active = this.document.activeElement;
    if (active === null || active === this.document.body) {
      field.focus();
    }
  }
}
