import { Injectable, inject } from '@angular/core';
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { FIREBASE_APP } from '../firebase/firebase-app';
import { Account, AuthFailure, AuthFailureKind, AuthSource } from './auth';

/** The Firebase error codes that each kind of failure covers. Any other code is `unknown`. */
const KIND_OF_CODE: Readonly<Record<string, AuthFailureKind>> = {
  'auth/invalid-credential': 'wrong',
  'auth/wrong-password': 'wrong',
  'auth/user-not-found': 'wrong',
  'auth/invalid-email': 'wrong',
  'auth/network-request-failed': 'network',
  'auth/too-many-requests': 'too-many',
  'auth/user-disabled': 'disabled',
};

/** Turns an error from Firebase Auth into one of the five kinds of failure. */
export function failureKind(error: unknown): AuthFailureKind {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'unknown';
  }
  const code = error.code;
  return typeof code === 'string' && Object.hasOwn(KIND_OF_CODE, code)
    ? KIND_OF_CODE[code]
    : 'unknown';
}

/** Runs a Firebase Auth request and throws an `AuthFailure` in place of the Firebase error. */
async function request(run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    // The Firebase error is dropped here. Its text can hold the email address, so it is never logged.
    throw new AuthFailure(failureKind(error));
  }
}

/** The auth source that uses Firebase Auth with an email address and a password. */
@Injectable()
export class FirebaseAuthSource implements AuthSource {
  /**
   * The sign in is kept on the device, so it lasts across restarts. IndexedDB is tried first.
   * Only email and password sign in is used, so the code for popups and redirects is left out.
   */
  private readonly auth = initializeAuth(inject(FIREBASE_APP), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });

  watch(listener: (account: Account | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) =>
      listener(user ? { id: user.uid, email: user.email } : null),
    );
  }

  signIn(email: string, password: string): Promise<void> {
    return request(() => signInWithEmailAndPassword(this.auth, email, password));
  }

  sendPasswordReset(email: string): Promise<void> {
    return request(() => sendPasswordResetEmail(this.auth, email));
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
