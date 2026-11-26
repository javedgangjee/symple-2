# Changelog

This file records what changed in Symple for a person who reads or runs the project.

## Unreleased

## 0.1.0 (2026-11-25)

The first public release of Symple is the web app, with a link to the public repo and its licence.

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
- Feature 5 speaks the phrase of a cell aloud when the cell is picked on a board, in each of the five selection modes.
- Feature 5 speaks the message when the message tile is picked on a keyboard. The message stays after it is spoken, and an empty message or one of only spaces speaks nothing.
- Feature 5 adds a voice source interface with the system voices as its first source, which the web build reaches through the Web Speech API.
- Feature 5 uses the default voice of the browser when it is English, and otherwise the first English voice in the list. A voice that runs on a server, such as the Google voices of Chrome, is used like any other.
- Feature 5 stops the speech that runs when a new phrase is picked. A pick that opens a board, goes back or types a key does not stop it.
- Feature 5 writes a warning to the console and speaks nothing when the browser has no Web Speech API, has no English voice, does not load its voices within one second, or fails to speak.
- Feature 5 adds the action type `speak-message` to the tile data, and gives it to the message tile in `src/data/cells.json`.
- Feature 5 adds unit tests with a fake voice source, and end to end tests that put a stand-in for the Web Speech API on the page, so no test speaks aloud.
- Feature 8 adds the settings panel for the caregiver, with the categories Selection, Speech, Appearance, Account and About. The settings button in the header opens it, and so does Control with the comma key from any board.
- Feature 8 lets the caregiver set the selection mode, the scan time, the post click delay, the dwell time, the dwell style and whether the progress bar is shown. The times are set with a minus and a plus button in steps of 0.5 seconds.
- Feature 8 lets the caregiver pick the voice from the English voices of the device and set its rate, pitch and volume with a minus and a plus button in steps of 0.1. The four values are stored under `symple.voice`, `symple.voiceRate`, `symple.voicePitch` and `symple.voiceVolume`.
- Feature 8 adds a Play a sample button beside the list of voices, which speaks "Hello. This is my voice." with the chosen voice, rate, pitch and volume.
- Feature 8 lets the caregiver pick the theme in the panel.
- Feature 8 shows the email address of the signed in account in the panel, and the credits for the author, the Mulberry symbols and the Lucide icons.
- Feature 8 syncs the six scan values and the four voice values to the Firestore document `users/{uid}`, next to the theme and the layout, so the document holds twelve fields.
- Feature 8 adds `public/licenses/lucide.txt` with the ISC licence of the Lucide icons.
- Feature 8 adds unit tests for the panel, the voice values and the sync of the new values, and end to end tests in `e2e/settings.spec.ts`.
- Feature 9 adds edit mode for the caregiver. The settings panel gets a Boards category, first in the list, with an Edit boards button that closes the panel and turns edit mode on for the board on show.
- Feature 9 shows an Edit and a Remove button on each cell in edit mode, and an Open button on a cell that opens a board. The Back cell shows a Go back button and cannot be edited or removed.
- Feature 9 shows Add Board, Add Tile, Configure Board and Done in the footer in edit mode, and an Add column or Add row box beside the grid.
- Feature 9 adds the tile dialog, which adds or edits a cell that speaks with a label, a phrase, a Mulberry symbol and a colour, and adds or edits a board with a name, a style, a colour and an icon. The dialog shows a preview and has the size of the settings panel.
- Feature 9 lets the caregiver move a cell by dragging it, or by one press that picks it up and a second press that puts it down.
- Feature 9 adds the Board settings dialog, which sets the title of a board and its layout of columns or rows.
- Feature 9 tells screen readers each change in a status line, such as "Help moved to column 2, place 1".
- Feature 9 disables an Add button, and says why, when one more cell or group would make a cell smaller than 48px in the window in use.
- Feature 9 keeps the edited boards in local storage under `symple.boards` and `symple.tiles`, as two JSON texts in the shape of the built-in files. Nothing is stored until the first change.
- Feature 9 syncs the edited boards to the Firestore document `users/{uid}/data/boards`, which holds the whole set as the two texts `tiles` and `boards`.
- Feature 9 adds the optional field `locked` to a board in `boards.json`. The four keyboards and the Keyboards list carry it and cannot be edited.
- Feature 9 adds `src/data/symbols.json`, which lists the Mulberry symbols of `public/symbols/` by name for the symbol list of the tile dialog.
- Feature 9 adds `public/favicon.svg`, so the browser tab shows the black and white Symple icon.
- Feature 9 adds a Board editing section to `README.md`, and the six requests to try in the Rules Playground after each change of the Firestore rules.
- Feature 9 adds unit tests for the stored set, the changes to a set, edit mode, the dialogs, dragging and the sync of the boards, and end to end tests in `e2e/editing.spec.ts`.
- Feature 23 adds the full Mulberry Symbols set, release 3.6.1, to `public/symbols/`. The app now holds 3,437 symbols, which are the 3,436 of Mulberry and the stop symbol of Symple, and the folder grows from about 0.9 MB to about 34 MB.
- Feature 23 adds all 2,098 icons of Lucide 1.77.0 in `src/data/lucide.json`, which a script writes from the new development package `lucide-static`. The app still draws each icon inline and has no icon package at run time.
- Feature 23 adds a Picture field to the tile dialog, where the caregiver gives a tile a symbol or an icon. It holds a box named "Find a picture", a drop down that reads Symbols or Icons, a list of 60 pictures and a Show more button that adds 60 more.
- Feature 23 adds a search of the pictures by name. A picture matches when its name holds every typed word, and names that begin with the text come first.
- Feature 23 lets a tile store a Lucide icon in its `icon` field as `lucide:` followed by the Lucide name, such as `lucide:apple`. A tile that speaks draws the icon where a symbol would be, and a tile that opens a board can now take a symbol.
- Feature 23 fetches `symbols.json` and `lucide.json` only when they are first needed, so the first download of the app does not grow.
- Feature 23 lets the caregiver drop a tile on Add column in edit mode, or press Add column while a tile is picked up, which moves the tile into a new column or row at the end of the board.
- Feature 23 adds `scripts/import-mulberry.mjs` and `scripts/import-lucide.mjs`, which bring in the two sets, and `scripts/check-pictures.mjs`, which checks the lists against the files. `npm run check:pictures` runs the check, and `make check` includes it.
- Feature 23 adds `public/licenses/mulberry.txt`, which is the licence text of the Mulberry release, and an Importing the pictures section to `README.md`.
- Feature 23 adds unit tests for the loader, the icons, the edits, the search, the lists of names and the tile dialog, and end to end cases for the pictures and for the drop on Add column in `e2e/editing.spec.ts`.
- Feature 13 adds the `LICENSE` file with the text of the Apache License 2.0, and a `NOTICE` file that names the copyright holder and says which files the licences of Mulberry, Lucide and Libre Franklin cover.
- Feature 13 adds a hosting block to `firebase.json`, so Firebase Hosting serves the web app at https://symple-2.web.app. A missing script, style or font gets a 404, and every other path gets `index.html`.
- Feature 13 adds the npm script `deploy` and the target `make deploy`, which build the app and send it to Firebase Hosting. Only the owner of the project runs it.
- Feature 13 adds a row "Source code" to the About category of the settings panel, with a link to the repo and the name of the licence.
- Feature 13 adds a line under the form of the sign in screen, which says that Symple is in testing and that accounts are by invitation, with the link "About Symple" to the repo.
- Feature 13 adds `scripts/check-release.mjs`, which checks the release files and looks for secrets and for files under `context/` in the tracked files and in every commit. `make check` runs it with its own tests.
- Feature 13 adds the sections Try it, Privacy and Release to `README.md`.
- The release adds the domain `symple-aac.com`, which serves the same site as https://symple-2.web.app.

### Changed

- Feature 3 marks the settings button and the Sign out button with the attribute `data-caregiver-control`, so that scanning in feature 4 can skip them.
- Feature 3 makes the end to end tests start from a saved signed in browser state, which a Playwright setup project writes to `e2e/.auth/`.
- Feature 4 takes the settings button and the Sign out button out of the tab order, so Tab never leaves the grid of a board. A caregiver reaches the two buttons with a pointer or a tap only.
- Feature 4 makes Tab stop on a group before its cells in `scan` and `step` mode. In `cursor`, `touch` and `dwell` mode Tab still goes from cell to cell.
- Feature 4 moves the safe reading and writing of local storage into one service, which the theme, the layout and the scan settings use.
- Feature 4 changes `CLAUDE.md` to say that `PRODUCT.md` is initial context only and that the roadmap wins when the two disagree.
- Feature 8 enables the settings button in the header, which was disabled since feature 1.
- Feature 8 applies a changed setting at once, with no reload. The scan rests while the panel is open, and it starts from rest at the first switch press after the panel closes.
- Feature 8 moves the Sign out button from the footer into the Account category of the panel, so the footer holds no button.
- Feature 8 replaces every line icon in the app with a Lucide icon, drawn inline from Lucide 1.77.0.
- Feature 8 replaces the OpenMoji stop symbol in `public/symbols/stop.svg` with a drawing made for Symple, a red octagon with a white hand.
- Feature 8 raises the style budget of a component in `angular.json` to a warning at 8 kB and an error at 16 kB, because the styles of the panel are larger than 4 kB.
- Feature 8 changes the Scanning section of `README.md` to describe the panel, and its Symbols section to credit Lucide.
- Feature 9 makes the layout of columns or rows a setting of each board. The stored setting `symple.layout` is no longer read or written, and the sync no longer covers it.
- Feature 9 removes the stored boards from the device at sign out, so a second account on the same device does not see them.
- Feature 9 makes `firestore.rules` check what an account writes. The settings document takes only its twelve known fields, each a text of at most 500 characters, and the boards document takes only `tiles` and `boards`, each a text of at most 500,000 characters.
- Feature 9 opens the settings panel on the Boards category, and hides the settings button while edit mode is on.
- Feature 9 rests the scan and the dwell press while edit mode is on, and the scan starts from rest at the first switch press after Done.
- Feature 9 opens home when the stored set no longer holds the board on show, as a sync from another device can cause.
- Feature 9 raises the bundle size budget in `angular.json` to a warning at 1 MB and an error at 2 MB.
- Feature 9 changes the rule in `CLAUDE.md` so that the agent asks before a commit or a merge and then does it, and never pushes.
- Feature 23 replaces the Symbol field and the Icon field of the tile dialog with the Picture field. The preview, the label or name, the phrase, the style and the colour are on the left of the dialog, and the Picture field is on the right with Cancel and Add or Save under it.
- Feature 23 makes Style in Add Board a drop down with the options Cropped Icon, Icon in Circle and Centered Icon, and shows it only while the picture is an icon.
- Feature 23 names three symbols "drink 2", "hot 2" and "open 3", so no two symbols share a name.
- Feature 23 reads the Lucide set again after a failed read, so an icon that is already on screen gets its shapes.
- Feature 23 puts the Remove, Edit and Open buttons of a cell in a row at the top left of the cell in edit mode.
- Feature 23 names the selection modes "Scan" and "Step" in the settings panel, in place of "Scan, one switch" and "Step, two switches".
- Feature 23 makes Sign out a button with an outline at the end of the Signed in as row of the settings panel.
- Feature 23 changes `public/licenses/lucide.txt`, `public/symbols/ATTRIBUTION.txt`, `README.md` and `specs/tech-stack.md` to describe the full sets.
- Feature 13 sets the version in `package.json` to `0.1.0` and the field `license` to `Apache-2.0`.
- Feature 13 makes `CLAUDE.md`, `README.md` and `specs/tech-stack.md` say that the folder `context/` is kept on the development Mac and is not in the repo.

### Fixed

- Feature 9 fixes a drag that started in the settings panel and ended outside it, which closed the panel. This was finding 2 of the review of feature 8.

### Removed

- Feature 5 removes the end to end case Y7 of `e2e/keyboard.spec.ts`, which said that pressing the message asks for no speech.
- Feature 8 removes `public/licenses/material-icons.txt` and every credit for the Material icons and for OpenMoji.
- Feature 8 removes the end to end case N15 of `e2e/sign-in.spec.ts`, which checked that Sign out sits in the bottom right corner of the footer, and the unit case O2 of the footer, which pressed Sign out there.
- Feature 9 removes the recoloured cell rules in `src/styles/cells.css` that no cell used.
- Feature 13 removes the folder `.claude/skills/impeccable/` from the repo, because it is the skill of another project, and `.gitignore` now names it.
