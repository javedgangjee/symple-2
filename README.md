# Symple

Symple is an app that lets people who cannot speak or point use a computer alone, by switch scanning. It is one Angular app that will ship as a Mac app, an iPad app and a web app.

## Setup

The app needs Node 22.22.3 or a later Node 22 release, and npm. Run `make install` once. It installs the packages and the Chromium browser that the end to end tests use.

## Firebase

The caregiver signs in through Firebase Auth, and Firestore holds a copy of the settings. The Firebase project is `symple-2`, and its web config is in `src/app/firebase/firebase-config.ts`. The config is not a secret.

The project needs this setup once, in the Firebase console.

- Turn on the Email and Password sign in method.
- Turn off account creation in the Auth settings, under User actions. The app has no sign up, and this stops anyone else from making an account with the web config.
- Make each caregiver account by hand.

The Firestore access rules are in `firestore.rules`. Deploy them with `npx firebase-tools deploy --only firestore:rules`. The deploy replaces the rules that the database has, so read those first.

The tests never reach Firebase. The end to end tests answer the Firebase Auth calls with canned replies and block the Firestore calls.

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

The boards use the Mulberry Symbols set, copyright 2018-2026 Steve Lee, licensed under Creative Commons Attribution-ShareAlike 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). The source is https://mulberrysymbols.org. The files in `public/symbols/` are unchanged apart from their names, and `public/symbols/ATTRIBUTION.txt` lists each file with its original name. One symbol, `stop.svg`, is from OpenMoji (https://openmoji.org) under the same licence.

Some line icons in `src/app/cells/icon.ts` are the outlined Material icons by Google, used under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0). The source is https://fonts.google.com/icons. The licence text ships with the app in `public/licenses/material-icons.txt`.

## Specs

The specs in `specs/` say what to build. `PRODUCT.md` is the product brief.
