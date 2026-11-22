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
- Feature 4 adds scanning on the home screen, the boards and the keyboards. The app highlights the groups of a board in turn and then the cells of the picked group, and a switch press picks the highlighted group or cell.
- Feature 4 makes Tab and Enter the switch keys. Tab moves the highlight, Shift with Tab moves it back, and Enter picks.
- Feature 4 adds the selection mode, which the app reads from `symple.selectionMode` in local storage. Its values are `scan`, `step`, `cursor`, `touch` and `dwell`, and it falls back to `scan`.
- Feature 4 adds the `scan` mode for one switch, where the highlight moves by itself after each scan time, and the `step` mode for two switches, where only Tab moves it.
- Feature 4 adds the scan time and the post click delay, which the app reads in milliseconds from `symple.scanTime` and `symple.postClickDelay`. They fall back to 1.5 seconds and 0.5 seconds.
- Feature 4 shows a picked cell with its colours swapped for the post click delay, ignores switch presses in that time, and then starts the scan again on the board on show.
- Feature 4 draws a highlighted group with an ink outline on a dark grey plate, and a highlighted cell with an ink outline.
- Feature 4 adds the dwell press of the `dwell` mode, where a pointer that rests on a cell for the dwell time presses it. The app reads the dwell time from `symple.dwellTime` and falls back to 1 second.
- Feature 4 adds the dwell styles `grow` and `bar`, which the app reads from `symple.dwellStyle`. The cell grows or fills a bar while the dwell time runs, and `grow` is the fallback.
- Feature 4 adds a bar that counts down the scan time on the highlighted group or cell in `scan` mode. It is shown only when `symple.showProgressBar` is `true`.
- Feature 4 adds a round cursor in `cursor` mode, which follows the pointer over the whole page of a board screen in place of the system arrow.
- Feature 4 gives each group a name for screen readers, such as "Column 1 of 2", and moves the keyboard focus with the highlight.
- Feature 4 adds unit tests for the scan, the switches, the dwell press and the stored settings, and end to end tests that reach each target by single switch scanning.
- Feature 4 adds a Scanning section to `README.md`, which says how to try scanning and how to change the scan settings in local storage.

### Changed

- Feature 3 marks the settings button and the Sign out button with the attribute `data-caregiver-control`, so that scanning in feature 4 can skip them.
- Feature 3 makes the end to end tests start from a saved signed in browser state, which a Playwright setup project writes to `e2e/.auth/`.
- Feature 4 takes the settings button and the Sign out button out of the tab order, so Tab never leaves the grid of a board. A caregiver reaches the two buttons with a pointer or a tap only.
- Feature 4 makes Tab stop on a group before its cells in `scan` and `step` mode. In `cursor`, `touch` and `dwell` mode Tab still goes from cell to cell.
- Feature 4 moves the safe reading and writing of local storage into one service, which the theme, the layout and the scan settings use.
- Feature 4 changes `CLAUDE.md` to say that `PRODUCT.md` is initial context only and that the roadmap wins when the two disagree.
