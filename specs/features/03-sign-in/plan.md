# Feature 3: Sign in. Plan

The steps run in order. Each step names the files it creates or changes. The numbers in brackets are the items in requirements.md.

## Step 1. The user prepares the Firebase project (14, 15, 30)

This step is the user's. It changes no files.

- The project id is `symple-2`. It already has a web app and a Firestore database.
- The user turns on the Email and Password sign in method.
- The user turns off account creation in the Firebase Auth settings, under User actions.
- The user makes one caregiver account in the console for the manual checks.

## Step 2. Add Firebase (7, 18, 30)

- Changes `package.json` and `package-lock.json` to add `firebase` version 13.
- Creates `src/app/firebase/firebase-config.ts` with the web config of the project. The config is read with `npx firebase-tools apps:sdkconfig web`, or the user pastes it.
- Creates `src/app/firebase/firebase-app.ts`. It starts the Firebase app once and gives it to the two sources.

## Step 3. Add the auth service (1, 3, 6, 16, 19, 25)

- Creates `src/app/auth/auth.ts`. It holds the auth source interface, which can wait until the stored sign in is read, report the signed in account, sign in with an email and a password, send a reset email and sign out. It holds the five kinds of failure of item 23. It holds the `Auth` service that the screens use, which gives the account as a signal and opens the sign in screen when the account goes away.
- Creates `src/app/auth/firebase-auth-source.ts`. It is the Firebase source. It keeps the sign in on the device, and it turns each Firebase error code into one of the five kinds.
- Creates `src/app/auth/auth.spec.ts` and `src/app/auth/firebase-auth-source.spec.ts`.
- Changes `src/app/app.config.ts` to provide the Firebase source, and to wait for the stored sign in before the first screen is drawn.

## Step 4. Add the guard and the routes (4, 20)

- Creates `src/app/auth/signed-in-guard.ts` and `signed-in-guard.spec.ts`. One guard sends a visitor with no account to `/sign-in`. A second guard sends a signed in caregiver from `/sign-in` to the home screen.
- Changes `src/app/app.routes.ts`. The route `sign-in` is added before the catch-all route, and the home route and the board route get the first guard.

## Step 5. Add the sign in screen (9, 10, 11, 12, 21, 22, 23, 24)

- Creates `src/app/auth/sign-in-screen.ts`, `sign-in-screen.html`, `sign-in-screen.css` and `sign-in-screen.spec.ts`. The card rules are copied from the login mockup and use the theme tokens of feature 1, so the card follows each theme. People who ask for less transparency get a solid card with no blur.
- Changes `public/` to add the logo file that the card shows, if the logo of the header cannot be reused.
- Changes `src/app/app.ts`, `app.html` and `app.css`. The header and the footer are left out on the sign in route, and the main area fills the window.

## Step 6. Add the temporary Sign out button (16)

- Changes `src/app/shell/footer.ts` and `footer.css`. The footer shows a Sign out button at its right edge, drawn as glass like the settings button, with a text label. A press calls the sign out of the auth service, and the auth service opens the sign in screen. The button is marked as a caregiver control in the same way as the settings button, so feature 4 skips it.
- Creates `src/app/shell/footer.spec.ts`.
- Changes `e2e/shell.spec.ts` only if a case of feature 1 counts the controls of the footer. If one does, implement stops and asks before it changes the case.

## Step 7. Add the sync (5, 8, 13, 19, 26, 27, 28, 31)

- Creates `src/app/sync/cloud-store.ts`. It holds the cloud store interface, which watches the settings document of an account and saves fields to it.
- Creates `src/app/sync/firestore-cloud-store.ts`. It is the Firestore store for `users/{uid}`. It loads Firestore on first use, turns on the cache on the device, and merges saved fields into the document.
- Creates `src/app/sync/settings-sync.ts` and `settings-sync.spec.ts`. The service follows the rules of item 27. It reads the theme and the layout from the `Theme` and `Layout` services and sets them through the same services, so those two files do not change.
- Changes `src/app/app.config.ts` to provide the Firestore store and to start the sync.

## Step 8. Add the access rules (29)

- Creates `firestore.rules` with the rule of item 29.
- Creates `firebase.json` and `.firebaserc`, which name the rules file and the project.
- The user deploys the rules with `npx firebase-tools deploy --only firestore:rules`. Implement does not deploy. The deploy replaces the rules that the database has had since 2026-07-01, so the user reads the old rules first.

## Step 9. Write the end to end tests (17)

- Creates `e2e/support/firebase.ts`. It holds the canned replies for the Firebase Auth calls, the block on the Firestore calls, and a `test` object that applies both to every test.
- Creates `e2e/sign-in.setup.ts`. It signs in once through the form and saves the browser state, with IndexedDB, to `e2e/.auth/`.
- Creates `e2e/sign-in.spec.ts` with the cases in validation.md. It starts with no saved state.
- Changes `playwright.config.ts`. A setup project runs first, and the two Chromium projects start from the saved state.
- Changes `e2e/shell.spec.ts`, `home.spec.ts`, `boards.spec.ts` and `keyboard.spec.ts` to take `test` from `e2e/support/firebase.ts`. Their cases do not change.
- Changes `.gitignore` to leave out `e2e/.auth/`.

## Step 10. Update the docs

- Changes `specs/tech-stack.md`. The Tests section says how the tests stand in for Firebase. The Data section says that Firebase Auth holds the caregiver accounts and that Firestore holds a copy of the settings in `users/{uid}`.
- Changes `specs/roadmap.md`. The feature 3 line gains the sync of the theme and the layout. Feature 4 gains the note that the sign in screen is not scanned. Feature 8 gains the move of the Sign out button into the settings panel and the sync of its settings. Feature 9 gains the sync of edited boards. Features 10 and 11 each gain an open question on whether Firebase Auth keeps the sign in inside the wrapper. Feature 13 gains an open question on sign up in the app. The decisions of 2026-11-17 are added.
- Changes `README.md` to name the Firebase project setup and the rules deploy command.
- PRODUCT.md does not mention sign in or sync. The user decides whether to add them there.

## Step 11. Run everything

Run `make check` and fix what fails.
