import { defineConfig, devices } from '@playwright/test';

// The end to end tests run in Chromium only until feature 11 adds WebKit.
// Every test runs at the two landscape window sizes from the requirements.
// The tests start their own dev server on a port of their own, so they never test another app
// that happens to run on the usual port 4200.
// The tests never reach Firebase. `e2e/support/firebase.ts` answers the Firebase Auth calls and blocks the rest.
// A setup project signs in once and saves the browser state, and the other projects start from it.
const PORT = 4301;
const BASE_URL = `http://localhost:${PORT}`;
const SIGNED_IN_STATE = 'e2e/.auth/caregiver.json';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: '**/*.setup.ts', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium-1024x768',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        storageState: SIGNED_IN_STATE,
      },
    },
    {
      name: 'chromium-1440x900',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: SIGNED_IN_STATE,
      },
    },
  ],
  webServer: {
    command: `npm start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
