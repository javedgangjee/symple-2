# Changelog

This file records what changed in Symple for a person who reads or runs the project.

## Unreleased

### Added

- Feature 1 adds the Angular app, which shows an empty home screen with the shared header, the main area and the footer.
- Feature 1 adds the five colour themes named `colours`, `blue`, `purple`, `teal` and `dark`. The app reads the theme from `symple.theme` in local storage and falls back to `blue`.
- Feature 1 adds the cell colour classes `dark`, `light`, `soft1` and `grey` and the hue rules of the Colours theme, ready for the cells of feature 2.
- Feature 1 bundles the Libre Franklin font and its licence text, so the title is drawn in that font with no network.
- Feature 1 shows the settings button in the header as disabled, and gives it a solid background when the system asks for less transparency.
- Feature 1 adds unit tests and Playwright end to end tests in Chromium at two window sizes, which include WCAG 2.2 Level AA checks with axe and contrast checks in every theme.
- Feature 1 adds linting, a Prettier format check and a `Makefile` whose `check` target runs every check in turn.
- Feature 1 adds an `.nvmrc` file that pins Node 22.23.5.
- Feature 2 draws the home screen and the boards from `src/data/boards.json` and `src/data/cells.json` as grids of cells, each with a colour, a label and an icon or a symbol.
- Feature 2 adds the Needs, Quick phrases, My boards, Yes or no and Core words boards, and the topic boards under My boards.
- Feature 2 adds a Keyboards list with the QWERTY, ABC and Vowels keyboards, which share one board of numbers and symbols and whose letter tiles write a message.
- Feature 2 adds a Back tile to every board except home, which returns to the screen that opened the board.
- Feature 2 adds the columns and rows layouts. The app reads the layout from `symple.layout` in local storage and falls back to `columns`.
- Feature 2 adds the Mulberry symbols in `public/symbols/`, with their credit in `ATTRIBUTION.txt`.
- Feature 2 adds unit tests and end to end tests for the boards, the cells, the keyboards and the layouts.
- Feature 3 adds a sign in screen at `/sign-in`, where the caregiver signs in through Firebase Auth with an email address and a password. Every other route opens it until someone is signed in.
- Feature 3 keeps the sign in on the device, so the app starts and works with no network after the first sign in.
- Feature 3 adds a Forgot password control, which sends the Firebase password reset email to the address in the Email field.
- Feature 3 adds a temporary Sign out button in the bottom right corner of the footer. One press signs the caregiver out.
- Feature 3 syncs the theme and the layout to the Firestore document `users/{uid}` of the signed in account, and a change in that document reaches an open app.
- Feature 3 adds `firestore.rules`, which let an account reach only its own document, with `firebase.json` and `.firebaserc` for the project `symple-2`.
- Feature 3 adds the `firebase` npm package, version 13, and loads Firestore only after sign in.
- Feature 3 adds unit tests with fakes of the auth source and the cloud store, and end to end tests that answer the Firebase Auth calls with canned replies and block the Firestore calls.
- Feature 3 adds a Firebase section to `README.md` with the one time setup in the Firebase console and the command that deploys the rules.
- Feature 3 adds `make stop`, which ends the dev server on port 4200.

### Changed

- Feature 3 marks the settings button and the Sign out button with the attribute `data-caregiver-control`, so that scanning in feature 4 can skip them.
- Feature 3 makes the end to end tests start from a saved signed in browser state, which a Playwright setup project writes to `e2e/.auth/`.
