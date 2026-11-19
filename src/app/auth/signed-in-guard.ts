import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, SIGN_IN_URL } from './auth';

/** Opens a screen only for a signed in caregiver. Anyone else gets the sign in screen. */
export const signedInGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  // The guard waits for the stored sign in, so a signed in device never sees the sign in screen.
  // A device that was signed in before waits a short time only, so a slow network does not hold the screen.
  await auth.ready();
  return auth.signedIn() ? true : router.parseUrl(SIGN_IN_URL);
};

/** Opens the sign in screen only when no one is signed in. A signed in caregiver gets the home screen. */
export const signedOutGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.ready();
  return auth.signedIn() ? router.parseUrl('/') : true;
};
