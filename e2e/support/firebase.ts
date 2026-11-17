import { test as base, type Page, type Request, type Route } from '@playwright/test';

/**
 * The end to end tests never reach the real Firebase project. The Firebase Auth calls get
 * the canned replies below, and every other call to Google, which includes Firestore, is blocked.
 */

/** The caregiver account of the tests. It exists only in the canned replies. */
export const ACCOUNT = { id: 'uid-anna', email: 'anna@example.com', password: 'secret12' } as const;

/** The file that holds the browser state of a signed in device. The setup project writes it. */
export const SIGNED_IN_STATE = 'e2e/.auth/caregiver.json';

/** The browser state of a device that has never signed in. */
export const SIGNED_OUT_STATE = { cookies: [], origins: [] };

/** Every Firebase service that the app calls is on a host of this domain. */
const FIREBASE_CALLS = /^https:\/\/[a-z0-9.-]+\.googleapis\.com\//;

const FIRESTORE_HOST = 'firestore.googleapis.com';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const base64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An ID token in the shape of a real one. It is not signed, and no server ever checks it. */
function idToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: 'https://securetoken.google.com/symple-2',
    aud: 'symple-2',
    auth_time: now,
    user_id: ACCOUNT.id,
    sub: ACCOUNT.id,
    iat: now,
    exp: now + 3600,
    email: ACCOUNT.email,
    email_verified: false,
    firebase: { identities: { email: [ACCOUNT.email] }, sign_in_provider: 'password' },
  };
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(claims)}.test`;
}

/** The canned reply for one Firebase Auth call, or undefined when the call has none. */
function cannedReply(url: URL): object | undefined {
  switch (url.pathname) {
    case '/v1/accounts:signInWithPassword':
      return {
        kind: 'identitytoolkit#VerifyPasswordResponse',
        localId: ACCOUNT.id,
        email: ACCOUNT.email,
        displayName: '',
        idToken: idToken(),
        registered: true,
        refreshToken: 'test-refresh-token',
        expiresIn: '3600',
      };
    case '/v1/accounts:lookup':
      return {
        kind: 'identitytoolkit#GetAccountInfoResponse',
        users: [
          {
            localId: ACCOUNT.id,
            email: ACCOUNT.email,
            emailVerified: false,
            providerUserInfo: [
              {
                providerId: 'password',
                federatedId: ACCOUNT.email,
                email: ACCOUNT.email,
                rawId: ACCOUNT.email,
              },
            ],
            validSince: '1763337600',
            lastLoginAt: '1763337600000',
            createdAt: '1763337600000',
          },
        ],
      };
    case '/v1/token':
      return {
        access_token: idToken(),
        id_token: idToken(),
        refresh_token: 'test-refresh-token',
        expires_in: '3600',
        token_type: 'Bearer',
        user_id: ACCOUNT.id,
        project_id: '255678554384',
      };
    case '/v1/accounts:sendOobCode':
      return { kind: 'identitytoolkit#GetOobConfirmationCodeResponse', email: ACCOUNT.email };
    default:
      return undefined;
  }
}

async function answer(route: Route): Promise<void> {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  const url = new URL(request.url());
  if (url.hostname === FIRESTORE_HOST) {
    // A Firestore call is blocked by never answering it, as a network that drops packets does.
    // A call that is refused makes Chromium write an error to the console at once,
    // and the cases that check the console would then depend on timing.
    return;
  }
  const reply = cannedReply(url);
  if (reply === undefined) {
    // A Firebase call that the tests do not expect is refused.
    await route.abort();
    return;
  }
  await route.fulfill({ status: 200, headers: CORS_HEADERS, json: reply });
}

/** Gives the Firebase Auth calls of a page their canned replies and blocks the other Firebase calls. */
export async function standInForFirebase(page: Page): Promise<void> {
  await page.route(FIREBASE_CALLS, answer);
}

/** Blocks every call to Firebase, as a device with no network would. */
export async function blockFirebase(page: Page): Promise<void> {
  await page.route(FIREBASE_CALLS, (route) => route.abort());
}

/** Leaves every call to Firebase with no answer, as a network that is up but does not reply would. */
export async function hangFirebase(page: Page): Promise<void> {
  await page.route(FIREBASE_CALLS, () => undefined);
}

/** Makes Firebase refuse the next sign ins, as it does for a wrong email or password. */
export async function refuseSignIn(page: Page): Promise<void> {
  await page.route(/\/v1\/accounts:signInWithPassword/, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 400,
      headers: CORS_HEADERS,
      json: {
        error: {
          code: 400,
          message: 'INVALID_LOGIN_CREDENTIALS',
          errors: [{ message: 'INVALID_LOGIN_CREDENTIALS', domain: 'global', reason: 'invalid' }],
        },
      },
    });
  });
}

/** Whether a request asks Firebase for a password reset email. */
export function isResetRequest(request: Request): boolean {
  return (
    request.method() === 'POST' && new URL(request.url()).pathname === '/v1/accounts:sendOobCode'
  );
}

/** Types the email and the password of the test account into the sign in screen. */
export async function fillSignIn(page: Page): Promise<void> {
  await page.getByLabel('Email').fill(ACCOUNT.email);
  await page.getByLabel('Password').fill(ACCOUNT.password);
}

/** The `test` object of every end to end test. Each page it gives stands in for Firebase. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await standInForFirebase(page);
    await use(page);
  },
});
