# Symple

Symple is an app that lets people who cannot speak or point use a computer alone, by switch scanning. A switch is a single button. The app moves a highlight over the choices, and a press of the switch picks the highlighted one.

Symple is one Angular app. The web app is live, and a Mac app and an iPad app will follow.

## Try it

The web app is at https://symple-2.web.app, and the code is at https://github.com/javedgangjee/symple-2.

- Symple is in testing, and accounts are by invitation. Without an account you can open the sign in screen and nothing more.
- The web app is made for a browser on a Mac.
- Speech uses the voices of your device, so the voices you can pick depend on your Mac and your browser.
- A clone of this repo signs in to the same Firebase project, so it needs an invitation too. To run a copy of your own, make a Firebase project, set it up as the Firebase section says, and put its web config in `src/app/firebase/firebase-config.ts` and its id in `.firebaserc`.

## Setup

The app needs Node 22.22.3 or a later Node 22 release, and npm. Run `make install` once. It installs the packages and the Chromium browser that the end to end tests use.

## Firebase

The caregiver signs in through Firebase Auth, and Firestore holds a copy of the settings and of the boards. The Firebase project is `symple-2`, and its web config is in `src/app/firebase/firebase-config.ts`. The config is not a secret.

The project needs this setup once, in the Firebase console.

- Turn on the Email and Password sign in method.
- Turn off account creation in the Auth settings, under User actions. The app has no sign up, and this stops anyone else from making an account with the web config.
- Make each caregiver account by hand.

Each account has two documents in Firestore. The settings are `users/{uid}`, and the boards are `users/{uid}/data/boards`, which holds the whole set as the two JSON texts `tiles` and `boards`.

The Firestore access rules are in `firestore.rules`. An account reaches only its own two documents, and any other document is refused. The settings document takes only its twelve known fields, each a string of at most 500 characters. The list still names `layout`, because older documents hold it. The boards document takes only `tiles` and `boards`, each a string of at most 500,000 characters. The app never deletes a document, so the rules refuse a delete.

Deploy the rules with `npx firebase-tools deploy --only firestore:rules`. The deploy replaces the rules that the database has, so read those first.

The tests never reach Firebase, so they do not run the rules. Check the rules by hand after each change, in the Rules Playground of the Firebase console, under Firestore Database and then Rules. Turn on Authenticated and give a uid such as `test-uid` for each try below.

1. A create of `users/test-uid` with the twelve known fields, each a string. It is allowed.
2. A create of `users/test-uid/data/boards` with `tiles` and `boards`, each a string. It is allowed.
3. A create of `users/test-uid` with a thirteenth field, such as `colour`. It is refused.
4. A create of `users/test-uid` with a `theme` of 600 characters. It is refused.
5. A create of `users/test-uid/data/boards` with a third field, such as `extra`. It is refused.
6. A get of `users/other-uid/data/boards`. It is refused.

The end to end tests answer the Firebase Auth calls with canned replies and block the Firestore calls.

## Scanning

Sign in, then press Enter on the home screen. The first column is outlined, and the outline moves by itself. Press Enter to pick the outlined column, and again to pick the outlined cell. Tab moves the outline by one, and Shift with Tab moves it back.

The caregiver changes the settings in the settings panel. The settings button in the header opens it, and so does Control with the comma key. Each change applies at once and syncs to the account. The scan settings are also kept in the local storage of the browser. `symple.selectionMode` is `scan`, `step`, `cursor`, `touch` or `dwell`. `symple.scanTime`, `symple.postClickDelay` and `symple.dwellTime` are times in milliseconds. `symple.dwellStyle` is `grow` or `bar`. `symple.showProgressBar` is `true` to show a bar that counts down the scan time, and the bar is hidden without it.

## Board editing

The caregiver changes the boards in edit mode. Open the settings panel and press Edit boards in the Boards category. Each cell then shows an Edit and a Remove button, and the footer shows Add Board, Add Tile, Configure Board and Done. Add column is the dashed box with a plus beside the grid. A cell moves with a pointer only, by a drag or by a press on it and then on a second cell. The keyboard cannot move a cell. Board settings holds the title of the board and its layout of columns or rows. Each change applies at once, and Done ends edit mode. The keyboards cannot be edited, so edit mode ends when one comes on show. The Keyboards cell on home can still be edited, opened and removed like any cell that opens a board. Remove on a cell that opens a board takes away the cell only, and the board stays in the set.

Once a board has changed, the whole set of boards is kept in the local storage of the browser under `symple.boards` and `symple.tiles`, and it syncs to the account. A sign out removes it from the device.

## npm scripts

- `npm start` serves the app at `http://localhost:4200`.
- `npm run build` builds the app into `dist/`.
- `npm test` runs the unit tests with Vitest.
- `npm run e2e` runs the end to end tests with Playwright and axe-core in Chromium. It starts its own server on port 4301.
- `npm run lint` checks the code and the templates with ESLint.
- `npm run format:check` checks the formatting with Prettier.
- `npm run check:pictures` checks the lists of symbols and icons against their files.
- `npm run check:release` checks the files of the release and looks for secrets. The Release section says more.
- `npm run deploy` builds the app and sends the build to Firebase Hosting.

## Make targets

- `make install` installs the packages and Chromium.
- `make stop` ends the dev server on port 4200.
- `make start`, `make build`, `make test`, `make e2e` and `make lint` call the npm script of the same name.
- `make format-check` calls `npm run format:check`, `make check-pictures` calls `npm run check:pictures` and `make check-release` calls `npm run check:release`.
- `make check` runs lint, format-check, check-pictures, check-release, test, e2e and build in turn. It stops at the first one that fails.
- `make deploy` calls `npm run deploy`. It is not part of `make check`.

## Release

Firebase Hosting serves the web app at https://symple-2.web.app, from the Firebase project `symple-2`. The owner of the project releases by hand.

Release from `main`. Merge the work first, and start with nothing uncommitted, so that the build you deploy is the code you push. Then follow these steps in order.

1. Check the Firebase project in the Firebase console.
   - Open Authentication and then Settings. Account creation must be off under User actions.
   - On the same page, email enumeration protection must be on.
   - On the same page, `symple-2.web.app` must be in the authorised domains.
   - Open Usage and billing, and check the use of the project against the limits of its plan.
2. Run `make check`. Every check must pass.
3. Run `make deploy`. It builds the app and sends the folder `dist/symple/browser` to Firebase Hosting. It does not run the checks, which is why step 2 comes first. The first run asks to install `firebase-tools`, and the answer is yes. If it says you are not signed in, run `npx firebase-tools login` once and run `make deploy` again.
4. Open https://symple-2.web.app in a private window. Sign in, open a board, and reload the page. The board must come back.
5. Close the release in `CHANGELOG.md`, and commit it.
6. Push `main`. For the first release, also make the repo public on GitHub.

The version is in two places. For a later release, change `version` in `package.json` and `VERSION` in `scripts/check-release.mjs` to the new number before step 2.

### How the site is served

The hosting block of `firebase.json` sets three things.

- Any path that is not a file gets `index.html`, so a reload on a board such as `/needs` works.
- Every file without a hash in its name, such as `index.html` and the symbols, is checked with the server on each load. A new release shows on the next load.
- The scripts, the styles and the font have a hash in their file name, which changes when the file changes. The browser keeps them for a year.

### What the release check looks at

`make check-release` runs `scripts/check-release.mjs`. It checks that `LICENSE` and `NOTICE` are in place, that the version and the hosting block are right, and that the links to the repo are there. It then looks for secrets, such as a private key, a service account file, a token or a password. It reads the tracked files and every commit of the history, because a public repo shows both. It also fails if any commit holds a file under `context/`.

If the search reports a value that is safe to publish, add an entry to `ALLOWED` in `scripts/check-release.mjs` with the file, the exact text and the reason. If it reports a real secret, deleting the line is not enough, because the old commit still holds it. Revoke the secret where it was issued. Then remove it from the history, for example with `git filter-repo`, before the repo is public.

## Privacy

Symple keeps the data below, and no other data about its users. It has no adverts and no analytics.

- Firebase Auth holds the email address of each account and checks its password.
- Firestore holds a copy of the settings and of the boards of each account, so they follow the account to another device. The access rules let an account read and write its own copy only.
- The browser keeps the sign in, the settings and the boards on the device. A sign out removes the sign in and the boards.
- Speech uses the voices of the device. Most of them run on the device. A voice that runs on a server, such as the Google voices of Chrome, sends the spoken text to the maker of that voice.
- Firebase Hosting serves the app, and like any web host it sees the IP address of each request.

## Licence

The code of Symple is under the Apache License 2.0, and `LICENSE` holds its text. The symbols, the icons and the font come from other projects and keep their own licences. `NOTICE` says which files each licence covers. The Symbols section below gives the credits of the symbols and the icons. The font is Libre Franklin, copyright 2015 Impallari Type, under the SIL Open Font License 1.1, and `public/fonts/LibreFranklin-OFL.txt` holds the text of that licence.

## Symbols

The boards use the Mulberry Symbols set, release 3.6.1 with 3,436 files, copyright 2018-2026 Steve Lee, licensed under Creative Commons Attribution-ShareAlike 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). The source is https://mulberrysymbols.org. The files in `public/symbols/` are unchanged apart from their names, and `public/symbols/ATTRIBUTION.txt` lists each file with its original name. One symbol, `stop.svg`, is not from Mulberry. It was drawn for Symple. The licence text ships with the app in `public/licenses/mulberry.txt`.

Every line icon in the app comes from Lucide version 1.77.0, through the package `lucide-static`, used under the ISC License. The source is https://lucide.dev. The icons are drawn inline in `src/app/cells/icon.ts`, `src/app/shell/header.html`, `src/app/settings/settings-panel.html` and `src/app/auth/sign-in-screen.html`, and each one names the Lucide icon it copies. A few Lucide icons come from the Feather project and are also under the MIT License, as the Lucide licence says. The licence text ships with the app in `public/licenses/lucide.txt`.

## Importing the pictures

The symbols and the Lucide icons come from two import scripts. Run each with the Node of `.nvmrc`.

- `node scripts/import-mulberry.mjs <folder>` copies the symbols into `public/symbols/` and writes `src/data/symbols.json` and `public/symbols/ATTRIBUTION.txt`. The folder is the unpacked `mulberry-symbols.zip` of release v3.6.1 from https://github.com/mulberrysymbols/mulberry-symbols. A second run changes nothing.
- `node scripts/import-lucide.mjs` writes `src/data/lucide.json` from the installed `lucide-static`.
- `node scripts/check-pictures.mjs` checks the two lists against the files and the package. `npm run check:pictures` runs it too.

## Specs

The specs in `specs/` say what to build. `PRODUCT.md` is the product brief.

The specs and `CLAUDE.md` point at a folder `context/`, which holds the design mockups and the patent files. It is kept on the development Mac and is not in the repo, so those paths lead nowhere in a clone.
