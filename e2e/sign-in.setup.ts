import { expect } from '@playwright/test';
import { SIGNED_IN_STATE, fillSignIn, test } from './support/firebase';

// Signs in once through the form and saves the browser state. The other tests start from it,
// as a device does after the caregiver has signed in. Firebase keeps the sign in in IndexedDB.
test('sign in and save the browser state', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/sign-in$/);
  await fillSignIn(page);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('h1')).toHaveText('Home');
  await page.context().storageState({ path: SIGNED_IN_STATE, indexedDB: true });
});
