# Feature 3: Sign in. Validation

The numbers in brackets are the items in requirements.md that a check covers.

## Automated checks

### A1. Build (7, 18, 31)

Command: `npm run build`

- The build ends with no errors and no warnings. This includes the 500 kB warning for the first load.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. Unit tests (1, 3, 4, 5, 8, 9, 13, 14, 16, 19, 20, 22, 23, 24, 25, 27)

Command: `npm test`

Firebase error codes, in `src/app/auth/firebase-auth-source.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| M1 | Each of the codes `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` and `auth/invalid-email`. | The kind is `wrong`. |
| M2 | The code `auth/network-request-failed`. | The kind is `network`. |
| M3 | The code `auth/too-many-requests`. | The kind is `too-many`. |
| M4 | The code `auth/user-disabled`. | The kind is `disabled`. |
| M5 | The code `auth/internal-error`, and an error with no code. | The kind is `unknown`. |

The auth service with a fake source, in `src/app/auth/auth.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| U1 | The source reports no account. | The service's account is empty. |
| U2 | The source reports an account. | The service gives that account's id and email. |
| U3 | The service signs out. | The source's sign out is called, and the account is empty. |
| U4 | The source reports that the account went away while the `needs` board is open. | The app goes to `/sign-in`. |

The footer with a fake source, in `src/app/shell/footer.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| O1 | The footer is drawn. | It shows one button named Sign out, and the button carries the caregiver control mark that the settings button carries. |
| O2 | Sign out is pressed. | The source's sign out is called once. |

The guards with a fake source, in `src/app/auth/signed-in-guard.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| G1 | No account, and the home route is opened. | The app goes to `/sign-in`. |
| G2 | No account, and `board/needs` is opened. | The app goes to `/sign-in`. |
| G3 | An account, and the home route is opened. | The route opens. |
| G4 | An account, and `/sign-in` is opened. | The app goes to the home route. |
| G5 | No account, and `/sign-in` is opened. | The route opens. |
| G6 | The source has not yet read the stored sign in, and the home route is opened. | The guard gives no answer until the source is ready. |

The sign in screen with a fake source, in `src/app/auth/sign-in-screen.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| F1 | The screen is drawn. | It shows the logo, the heading "Sign in", a field named Email of type `email` with `autocomplete="email"`, a field named Password of type `password` with `autocomplete="current-password"`, a button named Sign in and a control named Forgot password. It shows no control that makes an account. |
| F2 | Sign in is pressed with an empty email. Then with the email `anna`. | Each time the message is "Enter your email address.", the Email field is marked invalid, and the source is not called. |
| F3 | Sign in is pressed with the email `anna@example.com` and an empty password. | The message is "Enter your password.", and the source is not called. |
| F4 | Sign in is pressed with the email ` anna@example.com ` and the password `secret12`. | The source is asked to sign in with `anna@example.com` and `secret12`. Until it answers, the button is disabled and reads "Signing in". |
| F5 | The source accepts the sign in. | The app goes to the home route. |
| F6 | The source fails with `wrong`. | The message is "The email or password is wrong.", the button is enabled again, and the two fields keep their text. |
| F7 | The source fails with `network`. | The message is "Symple cannot reach the network. Connect and try again." |
| F8 | The source fails with `too-many`. | The message is "Too many tries. Wait a few minutes and try again." |
| F9 | The source fails with `disabled`. | The message is "This account is turned off." |
| F10 | The source fails with `unknown`. | The message is "Sign in failed. Try again." |
| F11 | Forgot password is pressed with an empty email. | The message is "Enter your email address, then press Forgot password.", and the source is not called. |
| F12 | Forgot password is pressed with the email `anna@example.com`. | The source is asked to send a reset email to that address, and the message is "An email has been sent to the associated account." |
| F13 | Forgot password is pressed, and the source fails with `wrong`. | The message is the same as in case F12, which checks a reset email request for a known address. |
| F14 | Forgot password is pressed, and the source fails with `network`. | The message is "Symple cannot reach the network. Connect and try again." |
| F15 | A message that reports a fault is shown, then a second one, then the reset message of case F12, which checks a reset email request for a known address. | Each fault sits in a region with `role="alert"`, and the reset message sits in a region with `role="status"`. Screen readers announce both. Only one message is on screen at a time. The user asked for the alert role on 2026-11-17, so this case no longer asks for a single region. |

The settings sync with a fake cloud store, in `src/app/sync/settings-sync.spec.ts`. The device starts with the theme `blue` and the layout `columns` unless a case says otherwise.

| Case | Input | Expected result |
| --- | --- | --- |
| Y1 | No account. | The store is not watched and not written. |
| Y2 | An account signs in, and its document holds the theme `teal` and the layout `rows`. | The device uses `teal` and `rows`, local storage holds both, and nothing is written to the store. |
| Y3 | An account signs in, and it has no document. | The store is asked to save the theme `blue` and the layout `columns`. |
| Y4 | An account signs in, and its document holds only the theme `dark`. | The device uses `dark`, and the store is asked to save only the layout `columns`. |
| Y5 | An account signs in, and its document holds the theme `pink` and the layout `rows`. | The device keeps `blue` and uses `rows`, and nothing is written to the store. |
| Y6 | After case Y2, which checks a document with both settings, the theme is set to `dark` on the device. | The store is asked to save only the theme `dark`. |
| Y7 | After case Y2, the layout is set to `columns` on the device. | The store is asked to save only the layout `columns`. |
| Y8 | After case Y2, the store reports that the document now holds the theme `purple`. | The device uses `purple`, and nothing is written to the store. |
| Y9 | After case Y2, the account signs out, and then the theme is set to `dark`. | The watch is stopped, and nothing is written to the store. |
| Y10 | The store fails to save. | No error escapes, and the device keeps the new value. |
| Y11 | Account A signs out and account B signs in. | Only the document of account B is watched. |

The cases below were added after the review of 2026-11-17. Each names the finding of review.md that it covers.

The auth service on a device that was signed in before, in `src/app/auth/auth.spec.ts`. They cover finding 1, which says the first screen waits on the network.

| Case | Input | Expected result |
| --- | --- | --- |
| U5 | The signed in flag is set on the device, and the source reports nothing for 1 second. | `ready()` resolves, `signedIn` is true and the account is still empty. |
| U6 | After case U5, which checks a start with no report, the source reports no account. | The app goes to `/sign-in`, `signedIn` is false and the flag is cleared. |
| U7 | After case U5, the source reports an account. | The service gives that account, and the app stays on its route. |
| U8 | The flag is not set, and the source reports nothing for 1 second. | `ready()` has not resolved, and `signedIn` is false. |
| U9 | The source reports an account, and later reports none. | The flag is set after the first report and cleared after the second. The flag never holds the account id or the email. |

The guards on a device that was signed in before, in `src/app/auth/signed-in-guard.spec.ts`. They cover finding 1.

| Case | Input | Expected result |
| --- | --- | --- |
| G7 | The flag is set, the source reports nothing, and the home route is opened. | The route opens after 1 second. |
| G8 | The flag is set, the source reports nothing, and `/sign-in` is opened. | The app goes to the home route after 1 second. |

The settings sync with a report from the device cache, in `src/app/sync/settings-sync.spec.ts`. They cover finding 2, which says the rule that a cache report never writes to the cloud has no test.

| Case | Input | Expected result |
| --- | --- | --- |
| Y12 | An account signs in, and the store reports from the device cache that it has no document. | Nothing is written to the store. |
| Y13 | An account signs in, and the store reports from the device cache a document that holds only the theme `dark`. | The device uses `dark`, and nothing is written to the store. |
| Y14 | After case Y13, which checks a cache report with a missing field, the store reports the same document from the cloud. | The store is asked to save only the layout `columns`. |
| Y15 | An account signs in, and its document holds only the theme `dark`. Then the theme is set to `teal` on the device. | The layout is saved with the save that writes only what the cloud lacks. The theme is saved with the plain save. This was added after check H5 failed on 2026-11-17. |

The Firestore store with a stand-in for Firestore, in `src/app/sync/firestore-cloud-store.spec.ts`. Cases C1 to C4 cover finding 2. Cases C5 to C7 cover finding 4, which says a Firestore failure stops the sync and leaves no trace.

| Case | Input | Expected result |
| --- | --- | --- |
| C1 | Firestore reports a document from its cache. | The listener gets the fields, and `fromCloud` is false. |
| C2 | Firestore reports a document from the server. | The listener gets the fields, and `fromCloud` is true. |
| C3 | Firestore reports that the document does not exist. | The listener gets no fields. |
| C4 | A watch is stopped before Firestore has loaded. | Firestore is never asked to watch the document. |
| C5 | The load of Firestore fails once, and then a save is made. | The load is tried again, and the save reaches Firestore. |
| C6 | The watch fails with the code `permission-denied`. | One warning is written to the console. It holds the code, and it does not hold the account id. |
| C7 | The load of Firestore fails. | One warning is written to the console, and no error escapes. |
| C8 | The server holds the theme `teal`, and the store is asked to save the missing fields theme `blue` and layout `columns`. | Only the layout `columns` is written. This and the next two cases were added after check H5 failed on 2026-11-17. |
| C9 | The server holds the theme `teal` and the layout `rows`, and the store is asked to save the same two missing fields. | Nothing is written. |
| C10 | The server has no document, and the store is asked to save the same two missing fields. | Both fields are written. |

### A4. End to end tests (1, 4, 9, 10, 11, 16, 17, 20, 21, 23, 24, 25)

Command: `npm run e2e`

The cases are in `e2e/sign-in.spec.ts`. Each runs at 1024 by 768 and at 1440 by 900. The Firebase Auth calls get canned replies, and the Firestore calls are blocked. Each case starts on a device with no stored sign in unless it says otherwise.

| Case | Input | Expected result |
| --- | --- | --- |
| N1 | Open `/`. | The address is `/sign-in`. The card shows, and the page has no header, no footer and no cells. |
| N2 | Open `/board/needs`. | The address is `/sign-in`. |
| N3 | Type an email and a password and press Sign in. The reply accepts them. | The home screen shows with the title "Home" and its four cells. |
| N4 | After case N3, which checks a sign in that is accepted, load the page again. | The home screen shows, and the sign in screen never appears. |
| N5 | After case N3, block every call to Firebase and load the page again. Then open `/board/needs`. | The home screen shows, then the Needs board. |
| N6 | Type an email and a password and press Sign in. The reply is `INVALID_LOGIN_CREDENTIALS`. | The message "The email or password is wrong." shows, and the address is still `/sign-in`. |
| N7 | Block every call to Firebase. Type an email and a password and press Sign in. | The message "Symple cannot reach the network. Connect and try again." shows. |
| N8 | Type the email `anna@example.com` and press Forgot password. | One call asks Firebase for a password reset for `anna@example.com`, and the message "An email has been sent to the associated account." shows. |
| N9 | Press Tab four times from the top of the page. Then type in the two fields and press Enter in the Password field. | The focus lands on Email, Password, Sign in and Forgot password, in that order. Enter sends the sign in. |
| N10 | In each of the five themes, run axe on the screen, and again with the message of case N6 on screen. | axe reports no WCAG 2.2 Level AA violation. |
| N11 | Measure the page and the card. | The page does not scroll in either direction, and the whole card is inside the window. |
| N12 | On a signed in device, open `/sign-in`. | The home screen shows. |
| N13 | Ask for less transparency. | The card has a solid background and no blur. |
| N14 | On a signed in device, open the home screen and press Sign out. Then load the page again. | The sign in screen shows after the press, and again after the load. |
| N15 | On a signed in device, measure the Sign out button on the home screen and on the Needs board. | It sits in the bottom right corner inside the footer, it is at least 24 by 24 CSS pixels, and it comes after every cell in the tab order. |
| N16 | On a signed in device, run axe on the home screen in each of the five themes. | axe reports no WCAG 2.2 Level AA violation with the Sign out button on screen. |
| N17 | On a signed in device, leave every Firebase Auth call with no answer and load the page. | The home screen shows within 3 seconds. This covers finding 1 of review.md, which says the first screen waits on the network. |
| N18 | Open the sign in screen and note where the card, the Password field and the two buttons sit. Then show the message of case N6, which checks a sign in that Firebase refuses, and then the reset message of case N8, which checks a reset email request. | The message region is rendered while it is empty, so its `display` is not `none`. Nothing moves when either message shows. The refused sign in shows one error icon in the alert region, and the reset message shows none and sits in the status region. This covers finding 3 of review.md, which says screen readers may not announce a message. The user asked on 2026-11-17 for the fixed layout and the icon, so the first form of this case, which asked for a height of 0, was replaced. |

The end to end cases of features 1 and 2 also run, on a signed in device, and all pass. One case changed, with the user's approval on 2026-11-17. Case E7 of feature 1, which checks that the title font loads from the app, now checks only the font requests, because a signed in device calls Firebase Auth at each start.

## Manual checks

These use the real Firebase project and the caregiver account from step 1 of the plan. Run `npm start` and use a browser profile with no Symple data.

### H1. Real sign in (1, 3, 25)

1. Open `http://localhost:4200`. Expected: the sign in screen.
2. Enter the account's email and a wrong password, and press Sign in. Expected: "The email or password is wrong."
3. Enter the right password and press Sign in. Expected: the home screen.
4. Quit the browser, open it again and open the same address. Expected: the home screen with no sign in.
5. Press Sign out in the bottom right corner. Expected: the sign in screen. Sign in again before the next check.

### H2. No network (4)

1. After check H1, which signs in for real, turn off Wi-Fi.
2. Load the page again and open Needs. Expected: the home screen, then the Needs board.
3. Turn Wi-Fi on again.

### H3. Reset email (24)

1. In a second browser profile, open the app, enter the account's email and press Forgot password. Expected: the reset message on screen, and a reset email from Firebase in the inbox.

### H4. The device writes the cloud copy (5, 13, 27)

1. After check H1, open Firestore in the Firebase console. Expected: the document `users/{uid}` of the account holds `theme: "blue"` and `layout: "columns"`.

### H5. The cloud copy reaches a device (5, 13, 27, 28)

1. With the app open, change `theme` to `teal` in the console. Expected: the app turns teal within a few seconds, with no reload.
2. Sign in to the same account in the second browser profile. Expected: the app is teal.

### H6. Access rules (29)

1. Deploy the rules with `npx firebase-tools deploy --only firestore:rules`.
2. In the Rules Playground of the console, read `users/abc` as a signed in account with the id `abc`. Expected: allowed.
3. Read and write `users/abc` as the id `xyz`. Expected: both refused.
4. Read `users/abc` with no account. Expected: refused.

### H7. No account creation (14, 30)

1. In the Firebase console, open the Auth settings and User actions. Expected: account creation is off.

### H8. A screen reader speaks the message (23)

This check was added after the review of 2026-11-17. It covers finding 3 of review.md, which says screen readers may not announce a message.

1. Turn on VoiceOver with Command and F5, and open the sign in screen.
2. Enter the account's email and a wrong password, and press Sign in. Expected: VoiceOver says "The email or password is wrong." at once.

## Requirements with no check in this feature

- Item 6 of requirements.md, which says sign in protects the cloud functions, has nothing to check until a cloud function exists.

## Results, 2026-11-17

All automated checks ran on the branch `feature/03-sign-in` under Node 22.23.5. No check reached the real Firebase project. The manual checks did not run.

### Automated checks

- Check A1, the build: pass. It ends with no errors and no warnings. The first load is 395.92 kB, or 103.46 kB in transfer, which is under the 500 kB warning. Firestore is a lazy chunk of 589.44 kB.
- Check A2, lint and format: pass. Lint reports that all files pass, and Prettier reports that all files match its style.
- Check A3, the unit tests: pass. 164 tests in 18 files passed and none failed.
- Check A4, the end to end tests: pass. 143 tests passed and none failed. That is the setup sign in plus 71 cases at each of the two window sizes. Each of cases N1 to N18, the sign in cases, ran at both sizes. Firestore wrote its own "could not reach" errors to the dev server log, which is expected while its calls are held.

### Each case against its spec file

Every case in the tables of checks A3 and A4, from case M1, which checks the Firebase codes for a wrong email or password, to case N18, which checks the empty message region, has a test with its label in the file that this document names. Each test checks the input and the result stated in its table, apart from the three gaps below. None of them is a failure.

- Case U1, which checks that the account is empty when the source reports no account, is weaker than stated. The account is empty before any report, so the test would also pass if the report were never handled. It is in `src/app/auth/auth.spec.ts` at line 20.
- Case G8, which checks that `/sign-in` goes to the home route after 1 second on a device that was signed in before, does not check the wait. It moves the clock 1 second and then checks the address, so it would also pass if the guard answered at once. Case G7, which checks the home route on the same kind of device, does check that nothing happens before 1 second, and both guards wait on the same `ready()`. It is in `src/app/auth/signed-in-guard.spec.ts` at line 83.
- Case N17, which checks that the home screen shows when Firebase Auth does not answer, starts its 3 second limit when `page.goto` returns at the load event. The time from the start of the load to that event is not counted. It is in `e2e/sign-in.spec.ts` at line 315.

Two small differences between this document and the code:

- The intro to check A4 says the Firestore calls are blocked. `e2e/support/firebase.ts` holds them with no answer, and it refuses any other Google call that has no canned reply. Cases N5 and N7, which block every Firebase call, refuse the calls at once.
- Forgot password shows the reset message when the source fails with `disabled`, as it does for `wrong`. That keeps to item 24 of requirements.md, but no case tests the `disabled` path. Case F13, which checks a reset request that fails, tests only `wrong`.

### Requirement coverage

Each item of requirements.md is named by at least one check above, apart from the five below.

- Item 2, which says only the caregiver signs in, has no check. The app has one sign in screen and no sign in for the primary user, so there is nothing more to test today.
- Item 6, which says sign in protects the cloud functions, has no check, as the section above says.
- Item 12, which says the interface is in English, is named by no check. Cases F2 to F15, which check the sign in screen messages, compare every message with its English text, so it is covered in practice.
- Item 15, which says the Firebase project `symple-2` already exists, is named by no check. `.firebaserc` and `src/app/firebase/firebase-config.ts` both name `symple-2`, and the manual checks H1 to H7 use that project.
- Item 26, which says one account holds one settings document at `users/{uid}`, is named by no check. Case C1, which checks a cache report from Firestore, checks the path `users/uid-anna`. Manual check H4, which looks at the document in the console, checks the two fields.

### Manual checks

- Check H1, a real sign in, sign out and restart against the real project: waiting for the user.
- Check H2, a signed in device with Wi-Fi off: waiting for the user.
- Check H3, a real reset email from Forgot password: waiting for the user.
- Check H4, the device writes `theme` and `layout` to `users/{uid}`: waiting for the user.
- Check H5, a change in the console reaches an open app and a second browser: waiting for the user.
- Check H6, the Firestore access rules in the Rules Playground after a deploy: waiting for the user.
- Check H7, account creation is off in the Firebase Auth settings: waiting for the user.
- Check H8, VoiceOver speaks the wrong password message: waiting for the user.

### Change after these results

The user ran part of check H1, which signs in for real, and saw the message push the fields up. The message region now keeps room for two lines, and a message that reports a fault shows a small error icon. Case N18, which checks the message region, was rewritten for this. All of `make check` passed again after the change.

The user then asked for `role="alert"` on a message that reports a fault. The reset message keeps `role="status"`. Case F15, which checks the message regions, and case N18 were changed to match, and all of `make check` passed again.

### Manual results so far

- Check H1, which signs in for real, signs out and checks a wrong password: pass, reported by the user on 2026-11-17.
- Check H2, which loads the app and opens Needs with Wi-Fi off: pass, reported by the user on 2026-11-17.
- Check H3, which asks for a reset email: pass, reported by the user on 2026-11-17.
- Check H7, which looks in the Firebase console that account creation is off: pass, reported by the user on 2026-11-17.
- Check H8, which listens for the message with VoiceOver: skipped for now by the user.
- Check H4, which looks in the Firebase console for the theme and the layout in the account's document: pass, reported by the user on 2026-11-17.
- Check H5, which changes the theme to teal in the Firebase console and expects the app to turn teal: not run yet. The failure reported on 2026-11-17 came from a different test. The theme was set to teal in the local storage of the browser, the cloud still held blue, and the app took the value of the cloud at start. That is what requirement 27 asks for. Run as written afterwards: pass, reported by the user on 2026-11-17.
- Check H6, which tests the access rules in the Rules Playground: skipped by the user on 2026-11-19.
- The two skipped checks, H6 and H8, are logged in the Skipped checks section of `specs/roadmap.md`.

The user also changed the reset message to "An email has been sent to the associated account." The requirement, the cases that name the message and the tests were updated, and all of `make check` passed again.

After check H5 failed, the write that fills a field the document lacks was changed to ask the server first. Cases Y15 and C8 to C10 were added for it. The trace of the sync later showed that the failure was not a fault, as the note on check H5 above says. The change stays as a safeguard, and check H5 must still run as written.
