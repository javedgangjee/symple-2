# Feature 3: Sign in. Review

The review covers the working tree of the branch `feature/03-sign-in` against `main`, because the feature is not committed yet.

## What was run and what was only read

- I ran `npm test` (147 tests passed), `npm run lint` (no errors), `npm run format:check` (no errors), `npm run build` (no warnings, with an initial load of 394.87 kB) and `npm run e2e` (139 tests passed). All ran under Node 22.23.5.
- I read the diff against `main` and every changed and new file in full. I read the code of `@firebase/auth` 1.13.11 in `node_modules` to check how the first auth report and the request timeout work.
- I did not run anything against the real Firebase project. The Firestore rules and the sync against a real Firestore were only read.

## Findings

### 1. A signed in device can show a blank window for 30 seconds or more at each start on a network that does not answer

- File: `src/app/app.config.ts` line 44, with `src/app/auth/signed-in-guard.ts` line 10 and `src/app/auth/auth.ts` line 76.
- Claim: the app initializer waits for `Auth.ready()`, and Firebase sends its first auth report only after it has asked the server about the stored account, so the first screen waits on the network.
- Case: in `@firebase/auth`, `onAuthStateChanged` waits for `_initializationPromise`, which calls `reloadAndSetCurrentUserOrClear`. That calls `getIdToken()` and then `accounts:lookup`. Each request times out after 30 seconds when the browser thinks it is online. On hotel or clinic Wi-Fi with a sign in page, or on a router with no internet, the browser is online but the requests hang. The window stays blank for 30 seconds, or about 60 seconds when the ID token is more than an hour old and must be refreshed first. Requirement 4 of requirements.md says the app works with no network after the first sign in. Case N5 of validation.md, which checks a signed in device with Firebase blocked, passes only because `route.abort()` fails the requests at once.
- Fix: do not hold the first screen on the server check. One way is to keep a flag on the device, set by the auth report and cleared at sign out, and let the guard use it when Firebase has not reported within a second or two. The later report still sends the caregiver to the sign in screen if the session has ended. The guard protects no data, since the boards are built into the app, so this loses nothing. Add an end to end case in which the Firebase Auth calls never answer and the home screen must still show quickly.
- Level: medium.

### 2. The rule that a report from the device cache never writes to the cloud has no test

- File: `src/app/sync/settings-sync.ts` line 110. The fake is in `src/app/sync/settings-sync.spec.ts` line 38.
- Claim: the check on `document.fromCloud` is what stops a new device from overwriting the cloud copy, and no test would fail if it were removed.
- Case: the fake store's `report` always sends `fromCloud: true`, and `src/app/sync/firestore-cloud-store.ts` has no test at all. Take a device that signs in once, goes offline before the first cloud reply, and is then restarted. Firestore reports from an empty cache that the document does not exist. Without the check, the device queues its defaults, `blue` and `columns`, and the write reaches Firestore last when the network returns. That replaces the caregiver's real theme and layout on every device. All of cases Y1 to Y11 in validation.md, which check the sync, would still pass.
- Fix: let the fake report a cache copy, and add a case in which a cache report with no document, and one with a missing field, writes nothing. Then a cloud report of the same document writes the missing fields. Add a small test of `FirestoreCloudStore` that checks the mapping of `metadata.fromCache` to `fromCloud` and the stop before Firestore has loaded.
- Level: medium.

### 3. The message region is hidden with `display: none` whenever it is empty, so screen readers may not announce a message

- File: `src/app/auth/sign-in-screen.css` line 95, with `src/app/auth/sign-in-screen.html` line 35.
- Claim: `.message:empty { display: none; }` takes the `role="status"` region out of the accessibility tree, which defeats the comment in the template that the region is always on the page.
- Case: `say('')` runs before each sign in request, so the region is empty and hidden when the request starts. When the request fails, the region is shown and filled in the same update. A live region that appears with its text already in it is often not announced, for example by VoiceOver and NVDA. The caregiver who uses a screen reader then hears nothing after "The email or password is wrong." Requirement 23 asks for a region that screen readers announce. Case F15 in validation.md, which checks the message region, only checks that `role="status"` exists. I did not test this with a screen reader.
- Fix: keep the region rendered when it is empty and remove its space another way, for example with a negative margin equal to the grid gap or a zero height that grows with its text.
- Level: medium.

### 4. A Firestore failure stops the sync for the rest of the session and leaves no trace

- File: `src/app/sync/firestore-cloud-store.ts` lines 25, 53 and 56.
- Claim: the first failed load of `firebase/firestore` is kept in `this.loading` for good, and every watch error is dropped with no log.
- Case: the plan says the user deploys `firestore.rules` by hand, and the database had older rules from 2026-07-01. If those deny access, `onSnapshot` fails with `permission-denied`, the watch ends, and the save fails too. The app looks fine, the cloud copy never changes, and the console shows nothing that names the cause. If the lazy chunk fails to load once, every later `watch` and `save` fails until the app restarts.
- Fix: clear `this.loading` when the import fails, so the next call tries again. Log the Firebase error code alone with `console.warn`. The code holds no email and no settings.
- Level: low.

### 5. The Firestore cache on the device keeps the account's document after sign out

- File: `src/app/sync/firestore-cloud-store.ts` line 28.
- Claim: `persistentLocalCache` writes `users/{uid}` to IndexedDB, and nothing clears it at sign out.
- Case: a caregiver signs out of a shared Mac. The IndexedDB of the site still holds the theme and the layout of the account under its uid. That is harmless today. Feature 9 adds the edited boards to the same document tree, and those hold the user's own phrases, which would then stay on the device after sign out.
- Fix: decide the rule now and write it into requirement 27. If the cache must go, call `terminate` and `clearIndexedDbPersistence` at sign out before the next sign in.
- Level: low.

### 6. The Firestore rules accept any field, any type and any size

- File: `firestore.rules` lines 11 to 15.
- Claim: `allow read, write: if isOwner(uid)` lets an account write anything to its own document and to any number of documents under it.
- Case: anyone who holds a caregiver's password can write a 1 MB document or fill a subcollection with data, which costs storage and reads. Account creation is off, so the risk is limited to known accounts.
- Fix: check that `theme` and `layout`, when present, are strings of a short length. Leave other keys allowed, so that the rule in requirement 27 that keeps a newer version's value still holds. Features 8 and 9 add their own checks.
- Level: low.

### 7. The end to end tests stop only calls to `googleapis.com`, so a call to any other Google host would reach the real project

- File: `e2e/support/firebase.ts` line 18.
- Claim: tech-stack.md says the tests never reach Firebase, but the fixture blocks only the pattern `*.googleapis.com` and lets every other request through.
- Case: Firebase Auth loads an iframe from `symple-2.firebaseapp.com` when a popup or redirect resolver is added, and a future SDK can call another host. Such a call would go to the real project with no test failing.
- Fix: in the fixture, also abort every request whose host is not `localhost` and not matched by the canned replies.
- Level: low.

## Votes, 2026-11-17

Five voters checked the findings on their own. The level of each finding is the middle of the five levels the voters gave.

### Kept findings, in order

1. Finding 2, that the rule that a cache report never writes to the cloud has no test. Votes: 5 valid. Level: medium. No fact was corrected. The voters confirmed that `fromCloud` is never false in any test and that `FirestoreCloudStore` has no spec.
2. Finding 1, that a signed in device can show a blank window for 30 seconds or more at each start. Votes: 5 valid. Level: medium. The voters confirmed the 30 second timeout. They added that a browser that knows it is offline times out in 5 seconds or fails at once, so the wait needs a network that is up but does not answer. Two voters could not confirm the figure of about 60 seconds for an old token. The SDK does call `getIdToken()` before the lookup, so the figure rests on two requests in a row.
3. Finding 3, that the message region is hidden with `display: none` when empty, so screen readers may not announce a message. Votes: 5 valid. Level: medium, with one voter at low. No voter tested it with a screen reader. Several noted that `aria-describedby` on an invalid field also points at the message, which lowers the harm for the field messages.
4. Finding 4, that a Firestore failure stops the sync for the session and leaves no trace. Votes: 4 valid and 1 partly. Level: low. The voters corrected two facts. The specs say only that the database was made on 2026-07-01 and has had rules since then, so whether those rules deny access is unknown. The Firestore SDK may log some failures itself, so "the console shows nothing" is too strong.
5. Finding 5, that the Firestore cache keeps the account's document after sign out. Votes: 1 valid and 4 partly. Level: low. The voters said the harm is in the future, since today the cache holds only the theme and the layout. They saw it as a rule to settle before feature 9, which adds the edited boards.
6. Finding 7, that the end to end tests block only `googleapis.com`. Votes: 5 partly. Level: low. The voters corrected the example. The app adds no popup or redirect resolver, so no `firebaseapp.com` iframe loads today, and every call the app makes now is on `googleapis.com`. The point is hardening against a future change.
7. Finding 6, that the Firestore rules accept any field, type and size. Votes: 5 partly. Level: low. The voters said that requirement 29 chose the scope of `users/{uid}` and the documents under it on purpose. Only the type and size checks are new, and only a holder of a caregiver's password could abuse the gap.

### Dropped findings

None. No finding had three or more invalid votes.
