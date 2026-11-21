# Feature 4: Scanning. Plan

The steps run in order. Each step names the files it creates or changes. The numbers in brackets are the items in requirements.md.

## Step 1. Read the stored scan settings (12, 14, 15, 22, 27, 29, 30)

- Creates `src/app/scan/scan-settings.ts` and `scan-settings.spec.ts`. The service reads the scan time, the post click delay, the selection mode, the dwell time, the dwell style and show progress bar from local storage, in the way that `src/app/layout/layout.ts` reads the layout. It gives each one as a signal and has a `set` for feature 8 to call. A value that is missing, not a number, out of range or unknown gives the default, and so does a storage that fails.
- Changes `src/app/app.config.ts` to load the settings at start, next to the theme and the layout.

## Step 2. Add the scan service (1, 2, 3, 6, 14, 15, 17, 18, 19, 20, 21)

- Creates `src/app/scan/scan.ts` and `scan.spec.ts`. The service is given the board on show as a list of group sizes. It keeps one state, which is rest, groups, cells or confirmed, with the index of the highlighted group and cell. It has three inputs, which are a switch press that picks, a switch press that moves, and a call that sends it to rest. It reports a pick with the group and the cell.
- The service runs its own timer for the scan time and for the post click delay. The tests drive the timer with the fake timers of Vitest.
- The service knows nothing about keys, cells or the page, so the unit tests need no screen.

## Step 3. Turn key presses into switch presses (7, 13, 14, 15, 23, 24)

- Creates `src/app/scan/switches.ts` and `switches.spec.ts`. The service listens for key presses on the document while a board is on show. In `scan` and `step` mode it passes Tab to the scan service as a move, Shift with Tab as a move back, and Enter as a pick. It stops the browser from moving the focus or pressing the focused button with the same key, and it stops Space from pressing the focused cell. In `cursor`, `touch` and `dwell` mode it passes nothing on and leaves the keys to the browser.
- The service leaves the keys alone while the focus is in a text field.
- The service ignores a key that repeats because it is held down.

## Step 4. Scan the board screen and fix the tab order (1, 3, 4, 5, 11, 16, 21, 23, 25)

- Changes `src/app/boards/board-screen.ts` and `board-screen.html`. The screen gives its board to the scan service when it opens and when the board changes, and it sends the scan to rest when it closes. It marks the grid with the scan state, and the highlighted group and cell with `data-scan`, and it moves the keyboard focus to the highlighted group or cell. At rest it takes the focus off the grid. Each group gets a name for screen readers and can take the focus from the app, but is not a tab stop. When the scan reports a pick, the screen runs the action of that cell through the `onPress` it already has. A pointer press on a cell sends the scan to rest.
- Changes `src/app/boards/board-screen.spec.ts`.
- Changes `src/app/shell/header.html`, `src/app/shell/footer.ts`, `header.spec.ts` and `footer.spec.ts`. The settings button and the Sign out button are taken out of the tab order.
- The switch listener is started by the board screen, so the sign in screen, which is not a board, is not scanned. The header and the footer are outside the grid, so their controls are never highlighted.

## Step 5. Add the dwell press (28, 31, 32, 33)

- Creates `src/app/scan/dwell.ts` and `dwell.spec.ts`. The service is told when the pointer enters a cell, moves and leaves it. It runs one timer for the dwell time and reports a press of the cell when the timer ends. It gives the cell that a dwell runs on as a signal. It starts no dwell in any other selection mode, in the post click delay, or after a press until the pointer has moved. The tests drive the timer with the fake timers of Vitest.
- Changes `src/app/boards/board-screen.ts` and `board-screen.html`. The screen passes the pointer events of its cells to the dwell service, leaves out a pointer of the touch kind, and marks the cell that a dwell runs on with `data-dwell`. It marks the grid with the dwell style and gives it the dwell time as a CSS variable. A dwell press runs through the `onPress` the screen already has and shows the confirmed look of step 6. A pointer press on a cell stops the dwell.
- Changes `src/app/boards/board-screen.spec.ts`.

## Step 6. Draw the scan states, the dwell styles and the scan time bar (8, 10, 26, 30, 34, 36)

- Changes `src/app/boards/board-screen.css`, `src/app/cells/cell.css` and `src/styles/cells.css`. The rules for the outline and the confirmed look are copied from `context/design/home.html` and use the theme tokens of feature 1. The dimming of the mockup is left out, because the user removed it on 2026-11-19.
- The same files get the two dwell styles. In `grow`, the marked cell scales up to 1.08 over the dwell time and is drawn above its neighbours. In `bar`, a strip across the bottom of the marked cell fills over the dwell time. Both run as CSS animations that last the dwell time.
- The same bar is drawn in `scan` mode across the bottom of the highlighted group or cell, when show progress bar is on. It is off by default. It empties over the scan time, which the grid gets as a CSS variable, and the animation starts again each time the highlight moves. No mockup shows the dwell styles, so the user checks the look by hand in check H7 of validation.md, which tries the dwell press.
- If a dimmed label, an outline or the progress bar fails the contrast of WCAG 2.2 Level AA in any theme, implement stops and asks before it changes the look of the mockup.

## Step 7. Write the end to end tests (9, 10, 11, 28 to 34, 36)

- Creates `e2e/support/scan.ts`. It sets the scan time, the post click delay, the selection mode, the dwell time and the dwell style in local storage before the app starts, and it moves the clock of the page with the Playwright clock, so no test waits in real time.
- Creates `e2e/scanning.spec.ts` with the cases of validation.md.
- Changes `e2e/home.spec.ts`, `e2e/boards.spec.ts` and `e2e/keyboard.spec.ts`. Three cases of feature 2 press Tab and expect it to reach each cell in turn. They are case E4 on the home screen, case B8 on the Needs board and case Y8 on the keyboard. In `scan` mode Tab now stops on a group first, so the three cases are changed to store the selection mode `touch`, where Tab still goes from cell to cell. They also check that Tab never reaches the settings button or the Sign out button. A fourth case, N15 of feature 3, expects Tab to land on Sign out after the last cell. It is changed to check the place of the button in the corner only, and that Tab does not reach it. If any other case of features 1 to 3 fails because of the keys or the tab order, implement stops and asks before it changes the case.

## Step 8. Update the docs

- Changes `specs/tech-stack.md`. The Input section gains the switch keys, the five selection modes, the dwell press and the five storage keys.
- Changes `specs/roadmap.md`. The line of feature 8 gains the controls for the selection mode, the dwell time and the dwell style. The line of feature 12 gains a note that the dwell press was built in feature 4.
- Changes `README.md` with one short section on how to try scanning.

## Step 9. Run everything

- Runs `make check` and fixes the failures.

## Steps from the review of 2026-11-20

The user picked eight findings of review.md to fix. Each step below names its finding. The steps change how the code is written and add tests. Apart from steps 11 and 15, they do not change what the app does.

## Step 10. Find why a first load can lose the stored sign in (finding 2)

- Changes `e2e/support/scan.ts`. The `open` helper no longer loads the board a second time when the first load shows the sign in screen. It fails the test with a message that names the board, and it keeps a trace of that load.
- Finds the cause with the trace. If the cause is in the test setup, the fix goes in `e2e/support/scan.ts` or `e2e/support/firebase.ts`. If the cause is in the app, implement stops and asks before it changes any file in `src/`.

## Step 11. Send the scan to rest and stop the dwell when the selection mode changes (finding 1)

- Changes `src/app/scan/scan.ts` and `scan.spec.ts`. When the selection mode changes, the scan goes to rest.
- Changes `src/app/scan/dwell.ts` and `dwell.spec.ts`. When the selection mode changes, the dwell stops and nothing is pressed.
- Changes `src/app/boards/board-screen.spec.ts` with one case for the screen.

## Step 12. Add the unit cases for the move back and for `set` (finding 6)

- Changes `src/app/scan/scan.spec.ts` and `src/app/scan/scan-settings.spec.ts` with the cases of validation.md. No source file changes unless a case shows a fault. If one does, implement stops and asks.

## Step 13. Keep the safe local storage code in one place (finding 5)

- Creates `src/app/storage/local-store.ts` and `local-store.spec.ts`. The service has `read(key)`, which gives the stored text or nothing, and `write(key, text)`. Neither throws when storage fails. The file name is my choice.
- Changes `src/app/theme/theme.ts`, `src/app/layout/layout.ts` and `src/app/scan/scan-settings.ts` to use it. Their own tests stay as they are and must still pass.
- `src/app/auth/auth.ts` holds a fourth copy, which also removes a key. The review missed it, so it is left as it is unless the user asks for it.

## Step 14. Name each scan setting once (finding 4)

- Changes `src/app/scan/scan-settings.ts`. One table holds the storage key, the default and the parser of each setting. `load` and `set` loop over the table, and the separate list `SETTING_NAMES` is removed. The exported names `SCAN_STORAGE_KEYS` and `DEFAULT_SCAN_SETTINGS` and the six signals stay, so no other file changes.

## Step 15. Put the scan, dwell and cursor looks in one file and write the bar once (finding 9)

- Creates `src/styles/scan.css` and changes `src/styles.css` to import it.
- Changes `src/app/boards/board-screen.css` and `src/styles/cells.css`. The rules for the highlight, the grey plate, the confirmed look, the two dwell styles, the bars and the hidden arrow of `cursor` mode move to the new file. `cells.css` holds colours only again.
- The bar is written once for a group, for a cell in `scan` mode and for a cell in the `bar` dwell style. Custom properties give its colour and its distance from the bottom. The bar of a group and the bar of a cell in `scan` mode take one height from one property, so they are as tall as each other, as item 36 of requirements.md says. The track of every bar is mixed at one strength. This is the one change of look in these steps, and it is small.
- Plan step 6 named `src/app/cells/cell.css`. That file was not changed and is not changed here.

## Step 16. Write the stored settings of the end to end tests in one place (finding 3)

- Changes `e2e/support/boards.ts` and `e2e/support/scan.ts`. One function writes a `StoredSettings` object to local storage. `openBoard` and the `open` helper both use it, and `openBoard` takes any stored setting. `storeAndReload` is removed.
- Changes `e2e/home.spec.ts`, `e2e/boards.spec.ts`, `e2e/keyboard.spec.ts` and `e2e/sign-in.spec.ts`. Cases E4, E7, B8, Y8 and N15, which press Tab through the cells, pass the selection mode `touch` to `openBoard`. What each case checks does not change.

## Step 17. Compare two cell places with one function (finding 10)

- Changes `src/app/scan/scan.ts` to export one function that says whether two places are the same cell.
- Changes `src/app/scan/dwell.ts`, `src/app/boards/board-screen.ts` and `board-screen.html` to use it in place of `same`, `isAt` and the test written in the template.

## Step 18. Run everything again

- Runs `make check` and fixes the failures.
