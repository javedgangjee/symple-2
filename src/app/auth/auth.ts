import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BoardStore } from '../boards/board-store';

/** The address of the sign in screen. */
export const SIGN_IN_URL = '/sign-in';

/**
 * The local storage key of the flag that says this device was signed in when it last heard
 * from the auth source. The flag holds no account id and no email.
 */
export const SIGNED_IN_STORAGE_KEY = 'symple.signedIn';

/**
 * How long a device that was signed in waits for the auth source at start, in milliseconds.
 * Firebase asks its server about the stored account first, and a network that does not answer
 * can hold that for 30 seconds. After this wait the first screen is drawn without the answer.
 */
export const READY_WAIT_MS = 1000;

/** The caregiver account that is signed in on this device. */
export interface Account {
  /** The id that Firebase Auth gives the account. The cloud copy of the settings and the boards is stored under it. */
  readonly id: string;
  /** The email address of the account. It is null when the account has none. */
  readonly email: string | null;
}

/**
 * The five kinds of failure that the sign in screen tells apart.
 * `wrong` covers a wrong email and a wrong password alike, so the screen never says which one it was.
 */
export type AuthFailureKind = 'wrong' | 'network' | 'too-many' | 'disabled' | 'unknown';

/** The error that an auth source throws when a request fails. It carries the kind and nothing else. */
export class AuthFailure extends Error {
  constructor(readonly kind: AuthFailureKind) {
    super(`The auth request failed: ${kind}.`);
    this.name = 'AuthFailure';
  }
}

/**
 * The service that holds the accounts. Firebase Auth is the only one for now.
 * The screens never use it directly. They use the `Auth` service.
 */
export interface AuthSource {
  /**
   * Reports the signed in account, or null when no one is signed in.
   * The first report comes once the stored sign in has been read, and one more follows each change.
   * The returned function stops the reports.
   */
  watch(listener: (account: Account | null) => void): () => void;

  /** Signs in. It throws an `AuthFailure` when the sign in fails. */
  signIn(email: string, password: string): Promise<void>;

  /** Asks for a password reset email. It throws an `AuthFailure` when the request fails. */
  sendPasswordReset(email: string): Promise<void>;

  /** Signs out on this device. */
  signOut(): Promise<void>;
}

/** The auth source in use. The app config provides the Firebase source, and the unit tests provide a fake. */
export const AUTH_SOURCE = new InjectionToken<AuthSource>('AUTH_SOURCE');

function sameAccount(a: Account | null, b: Account | null): boolean {
  return a?.id === b?.id && a?.email === b?.email;
}

/**
 * Gives the screens the signed in account and the sign in and sign out requests.
 * When the account goes away, whether the caregiver signed out or Firebase ended the session,
 * it removes the stored boards and opens the sign in screen.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly source = inject(AUTH_SOURCE);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly boards = inject(BoardStore);
  private readonly current = signal<Account | null>(null, { equal: sameAccount });

  /**
   * Whether the device was signed in before and the source has not reported yet.
   * It turns false at the first report and stays false.
   */
  private readonly presumed = signal(this.readFlag());

  /**
   * The signed in account, or null when no one is signed in. Later features read it to call the cloud.
   * It stays null until the source reports, so nothing calls the cloud for an account that is only presumed.
   */
  readonly account = this.current.asReadonly();

  /**
   * Whether the screens of the app are open to this device. It is true with an account.
   * It is also true while a device that was signed in before waits for the source.
   * It guards no data. The boards stored on the device belong to the account that signed in
   * last and are removed at sign out, and the cloud checks the account itself.
   */
  readonly signedIn = computed(() => this.current() !== null || this.presumed());

  private readonly firstScreen: Promise<void>;

  constructor() {
    // Whether the first screen may be drawn. After that, a lost account opens the sign in screen.
    let settled = false;
    let resolve: () => void = () => undefined;
    this.firstScreen = new Promise<void>((done) => (resolve = done));
    const settle = () => {
      settled = true;
      resolve();
    };

    const timer = this.presumed() ? setTimeout(settle, READY_WAIT_MS) : undefined;

    const stop = this.source.watch((account) => {
      const wasSignedIn = this.signedIn();
      this.current.set(account);
      if (account === null) {
        // A second account on this device must never see or upload the boards of the first.
        // The account is already null, so the board sync saves nothing for this change.
        this.boards.forget();
      }
      this.presumed.set(false);
      this.writeFlag(account !== null);
      clearTimeout(timer);
      const drawn = settled;
      settle();
      if (drawn && wasSignedIn && account === null) {
        // The address is replaced, so the browser's Back button does not return to a guarded screen.
        void this.router.navigateByUrl(SIGN_IN_URL, { replaceUrl: true });
      }
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(timer);
      stop();
    });
  }

  /**
   * Resolves once the first screen can be chosen. That is when the stored sign in has been read,
   * or after `READY_WAIT_MS` on a device that was signed in before.
   */
  ready(): Promise<void> {
    return this.firstScreen;
  }

  signIn(email: string, password: string): Promise<void> {
    return this.source.signIn(email, password);
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.source.sendPasswordReset(email);
  }

  signOut(): Promise<void> {
    return this.source.signOut();
  }

  private readFlag(): boolean {
    try {
      return this.document.defaultView?.localStorage.getItem(SIGNED_IN_STORAGE_KEY) === '1';
    } catch {
      // Storage can be blocked. The device then waits for the source at each start.
      return false;
    }
  }

  private writeFlag(signedIn: boolean): void {
    try {
      const storage = this.document.defaultView?.localStorage;
      if (signedIn) {
        storage?.setItem(SIGNED_IN_STORAGE_KEY, '1');
      } else {
        storage?.removeItem(SIGNED_IN_STORAGE_KEY);
      }
    } catch {
      // Storage can be full or blocked. The device then waits for the source at each start.
    }
  }
}
