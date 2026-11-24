# Symple

Symple is an app that lets people who cannot speak or point use a computer alone, by switch scanning. It is one Angular app that will ship as a Mac app, an iPad app and a web app.

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

## Make targets

- `make install` installs the packages and Chromium.
- `make stop` ends the dev server on port 4200.
- `make start`, `make build`, `make test`, `make e2e` and `make lint` call the npm script of the same name.
- `make format-check` calls `npm run format:check`.
- `make check` runs lint, format-check, test, e2e and build in turn.

## Symbols

The boards use the Mulberry Symbols set, copyright 2018-2026 Steve Lee, licensed under Creative Commons Attribution-ShareAlike 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). The source is https://mulberrysymbols.org. The files in `public/symbols/` are unchanged apart from their names, and `public/symbols/ATTRIBUTION.txt` lists each file with its original name. One symbol, `stop.svg`, is not from Mulberry. It was drawn for Symple.

Every line icon in the app is copied from Lucide version 1.77.0, used under the ISC License. The source is https://lucide.dev. The icons are drawn inline in `src/app/cells/icon.ts`, `src/app/shell/header.html`, `src/app/settings/settings-panel.html` and `src/app/auth/sign-in-screen.html`, and each one names the Lucide icon it copies. A few Lucide icons come from the Feather project and are also under the MIT License, as the Lucide licence says. The licence text ships with the app in `public/licenses/lucide.txt`.

## Specs

The specs in `specs/` say what to build. `PRODUCT.md` is the product brief.
