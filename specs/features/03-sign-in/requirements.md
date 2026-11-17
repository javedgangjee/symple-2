# Feature 3: Sign in. Requirements

## What the feature must do

1. The caregiver signs in to Symple through Firebase Auth. Source: roadmap.md, feature 3.
2. Only the caregiver signs in. The primary user never signs in. Source: roadmap.md, decisions of 2026-11-16.
3. The caregiver signs in with an email address and a password. Source: roadmap.md, decisions of 2026-11-16.
4. The caregiver must sign in once before the app can be used. After that the app works with no network. Source: roadmap.md, decisions of 2026-11-16.
5. Sign in syncs boards and settings across devices and backs them up. Source: roadmap.md, decisions of 2026-11-16.
6. Sign in protects the cloud functions. No cloud function exists yet, so this feature only makes the signed in account available to later features. Source: roadmap.md, decisions of 2026-11-16.
7. Firebase is the cloud provider. Source: tech-stack.md, Data. CLAUDE.md, Rules.
8. Settings stay stored on the device. The cloud holds a second copy. Source: tech-stack.md, Data.
9. The sign in screen follows `context/design/mockups/login/login-blue-card.html`. It is a card with the logo, the heading "Sign in", an Email field, a Password field, a Sign in button and a Forgot password control. Source: the login mockup.
10. The sign in screen passes WCAG 2.2 Level AA in every theme, fills the window and does not scroll. Source: PRODUCT.md, Accessibility and Inclusion. Feature 1, requirement 7.
11. The sign in screen is a caregiver screen. It works with a keyboard and a pointer, and scanning does not have to reach it. Source: PRODUCT.md, Principles 2 and 5.
12. The interface is in English. Source: PRODUCT.md, Speech output.

## Decided by the user on 2026-11-17

13. The sync is built in this feature. It covers the two settings that exist today, which are the theme and the layout, and it uses Firestore. Feature 8 adds the other settings to it, and feature 9 adds the edited boards.
14. The user makes each caregiver account by hand in the Firebase console. The app has no way to make an account. Sign up in the app waits for the public release, feature 13.
15. A Firebase project for Symple already exists. Its project id is `symple-2`. On 2026-11-17 it had one web app and a Firestore database, which was made on 2026-07-01.
16. This feature adds a temporary Sign out button in the bottom right corner, inside the footer that feature 1 kept for caregiver buttons. It is a caregiver control, so scanning skips it. A press signs the caregiver out and shows the sign in screen. Feature 8 moves the button into the settings panel. This replaced the first answer, which was to wait for feature 8.
    - The button reads "Sign out", to match "Sign in" on the sign in screen.
    - One press signs out, with no second step. A primary user who uses a pointer can press it by mistake, and then needs the caregiver to sign in again. This risk lasts until feature 8 moves the button.
17. The tests do not use the Firebase emulator, because this Mac has no Java. The end to end tests answer the Firebase Auth network calls with canned replies and block the Firestore calls. The Firestore access rules are checked by hand.

## Not in the specs. Assumed, and open to change

Items 18 to 31 are my choices, apart from item 26, which the user confirmed.

18. The app uses the `firebase` npm package, version 13, directly. AngularFire is left out, because its latest release supports Angular 21 and TypeScript below 6.
19. Auth and the cloud copy each sit behind an interface, as speech does in tech-stack.md. The unit tests use fakes of the two interfaces.
20. The sign in screen is the route `/sign-in`. Any other route opens it when no one is signed in. A signed in caregiver who opens `/sign-in` gets the home screen. After a sign in the app shows the home screen.
21. The sign in screen shows the card alone on the theme background, as the mockup does. The header and the footer are not drawn on it.
22. The Email field uses `autocomplete="email"` and the Password field uses `autocomplete="current-password"`. The mockup turns autocomplete off. The change is needed for WCAG 1.3.5, Identify Input Purpose, and it lets a password manager fill the form.
23. The Sign in button is disabled and reads "Signing in" while a request runs. The screen shows one message at a time, in a region that screen readers announce. The table gives the messages.

    | Event | Message |
    | --- | --- |
    | The email is empty or has no `@`. | Enter your email address. |
    | The password is empty. | Enter your password. |
    | Firebase rejects the email or the password. | The email or password is wrong. |
    | Firebase cannot be reached. | Symple cannot reach the network. Connect and try again. |
    | Firebase reports too many attempts. | Too many tries. Wait a few minutes and try again. |
    | The account is disabled. | This account is turned off. |
    | Any other failure. | Sign in failed. Try again. |
    | Forgot password is pressed with an empty email. | Enter your email address, then press Forgot password. |
    | A reset email was requested. | If an account uses this address, a reset email is on its way. |

24. Forgot password sends the Firebase password reset email to the address in the Email field. The message is the same whether or not an account uses that address, so the screen does not reveal who has an account.
25. A device stays signed in across restarts. If Firebase ends the session, for example when the account is disabled or its password changes, the app shows the sign in screen.
26. **Confirmed by the user on 2026-11-17.** One account holds one set of settings, in the Firestore document `users/{uid}` with the fields `theme` and `layout`. A clinician with several clients needs one account for each client. This is accepted for now.
27. The sync follows these rules.
    - The app listens to the account's document from sign in, and from each start on a signed in device.
    - When the document holds a known theme or layout, the device uses it and stores it.
    - When the document does not exist or lacks a field, the device writes the value it uses to the document.
    - When the document holds a value this version does not know, the device keeps its own value and writes nothing, so a newer version's value is not lost.
    - When the theme or the layout changes on the device, the device writes the new value to the document. With no network, Firestore keeps the write on the device and sends it later.
    - When two devices change the same setting, the write that reaches Firestore last wins.
    - The sync stops at sign out.
28. No screen changes the theme or the layout until feature 8. In this feature the only change a person can see arrives from the cloud document.
29. The Firestore access rules let an account read and write only `users/{uid}` and the documents under it, where `uid` is its own. Everyone else is refused. The rules are in `firestore.rules`, and the user deploys them.
30. The Firebase web config is in the source. It is not a secret. The access rules and Auth protect the data. The user turns off account creation in the Firebase Auth settings, so that the web config cannot be used to make accounts.
31. Firebase Auth is part of the first load, because the app needs it before the first screen. Firestore is loaded after sign in. If the first load still passes the 500 kB warning in `angular.json`, implement stops and asks.

## File names

- `src/app/firebase/firebase-config.ts` and `firebase-app.ts` hold the web config and start Firebase once.
- `src/app/auth/` holds `auth.ts`, `firebase-auth-source.ts`, `signed-in-guard.ts` and the sign in screen.
- `src/app/sync/` holds `cloud-store.ts`, `firestore-cloud-store.ts` and `settings-sync.ts`.
- `firebase.json`, `.firebaserc` and `firestore.rules` sit in the repo root.

## Left for later features

- Feature 4, scanning, must not scan the sign in screen.
- Feature 8, settings, moves the Sign out button from the footer into the settings panel and adds the other settings to the sync.
- Feature 9, board editing, adds the edited boards to the sync.
- Features 10 and 11, the Mac app and the iPad app, must each check that Firebase Auth keeps the sign in inside Electron and inside Capacitor.
