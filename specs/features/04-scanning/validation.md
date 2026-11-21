# Feature 4: Scanning. Validation

The numbers in brackets are the items in requirements.md that a check covers.

In the tables, "a press" is a press of Enter, which is the switch that picks, and "a move" is a press of Tab, which is the switch that moves. Unless a case says otherwise, the selection mode is `scan`, the scan time is 1000 ms and the post click delay is 500 ms.

## Automated checks

### A1. Build

Command: `npm run build`

- The build ends with no errors and no warnings.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. Unit tests (1, 2, 3, 6, 7, 12 to 24, 28 to 33, 36, 37, 38)

Command: `npm test`

The stored settings, in `src/app/scan/scan-settings.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| T1 | Nothing is stored. | The scan time is 1500 ms, the post click delay is 500 ms and the selection mode is `scan`. |
| T2 | `symple.scanTime` holds `2500`, `symple.postClickDelay` holds `0` and `symple.selectionMode` holds `step`. | The three values are 2500 ms, 0 ms and `step`. |
| T3 | `symple.scanTime` holds each of `499`, `5001`, `abc` and an empty text. | The scan time is 1500 ms each time. |
| T4 | `symple.postClickDelay` holds each of `-1`, `5001` and `abc`. | The post click delay is 500 ms each time. |
| T5 | `symple.selectionMode` holds each of `fast`, `auto` and an empty text. | The selection mode is `scan` each time. |
| T8 | `symple.selectionMode` holds `cursor`, then `touch`, then `dwell`. | The selection mode is `cursor`, then `touch`, then `dwell`. |
| T6 | Reading local storage throws. | The three defaults are used. |
| T9 | Nothing is stored. | The dwell time is 1000 ms and the dwell style is `grow`. |
| T10 | `symple.dwellTime` holds `2000` and `symple.dwellStyle` holds `bar`. | The two values are 2000 ms and `bar`. |
| T11 | `symple.dwellTime` holds each of `499`, `5001` and `abc`, and `symple.dwellStyle` holds `shrink`. | The dwell time is 1000 ms each time, and the dwell style is `grow`. |
| T12 | Nothing is stored. Then `symple.showProgressBar` holds each of `true`, `false`, `yes` and an empty text. | Show progress bar is off with nothing stored. It is on for `true` and off for the three other values. |
| T13 | `set` is called with show progress bar on. | Show progress bar is on and `symple.showProgressBar` holds `true`. |
| T7 | `set` is called with a scan time of 3000 ms. | The scan time is 3000 ms and `symple.scanTime` holds `3000`. |

The scan service in `scan` mode, in `src/app/scan/scan.spec.ts`. The board has two groups of two cells, as the home board has:

| Case | Input | Expected result |
| --- | --- | --- |
| S1 | The board is given and no press is made, and 10 seconds pass. | The state is rest and nothing is highlighted. |
| S2 | One press at rest. | Group 1 is highlighted and no pick is reported. |
| S3 | After case S2, 1000 ms pass. | Group 2 is highlighted. |
| S4 | After case S2, 2000 ms pass. | Group 1 is highlighted again. |
| S5 | After case S2, 4000 ms pass with no press. | The state is rest, because the groups were scanned twice. |
| S6 | A press while group 2 is highlighted. | Cell 1 of group 2 is highlighted and no pick is reported. |
| S7 | After case S6, 1000 ms pass. | Cell 2 of group 2 is highlighted. |
| S8 | After case S6, 4000 ms pass with no press. | The groups are scanned again and group 2 is highlighted, because the cells were scanned twice. |
| S9 | After case S8, 4000 ms pass with no press. | The state is rest, so the count of passes started again in case S8. |
| S10 | A press while cell 2 of group 2 is highlighted. | One pick of group 2, cell 2 is reported, and the state is confirmed with that cell marked. |
| S11 | After case S10, a press at 499 ms. | No pick is reported and the state is still confirmed. |
| S12 | After case S10, 500 ms pass. | Group 1 is highlighted, so the scan started again by itself. |
| S13 | After case S10, a new board is given at 200 ms, and 300 ms more pass. | Group 1 of the new board is highlighted. |
| S14 | The post click delay is 0 ms, and a cell is picked. | The pick is reported and group 1 is highlighted at once. |
| S15 | The scan is sent to rest while a cell is highlighted, and 10 seconds pass. | The state is rest and nothing moves. |
| S16 | A new board is given while group 2 is highlighted. | The state is rest. |

The short cuts, in the same file:

| Case | Input | Expected result |
| --- | --- | --- |
| S17 | The groups hold 1, 1 and 1 cells, as the Yes or no board does. A press at rest, 1000 ms, and a press. | One pick of group 2, cell 1 is reported, with no cell step. |
| S18 | The board has one group of three cells. A press at rest. | Cell 1 is highlighted with no group step. |
| S19 | After case S18, 6000 ms pass with no press. | The state is rest. |
| S20 | The groups hold 2, 0 and 2 cells. A press at rest and 1000 ms. | Group 3 is highlighted, so the empty group was skipped. |
| S21 | The board has no groups, or only empty groups. A press. | The state is rest and no pick is reported. |

The scan service in `step` mode, in the same file. The board has two groups of two cells:

| Case | Input | Expected result |
| --- | --- | --- |
| P1 | A move at rest, and 10 seconds pass. | Group 1 is highlighted and nothing moves by itself. |
| P2 | After case P1, a move. | Group 2 is highlighted. |
| P3 | After case P2, a move. | Group 1 is highlighted again. |
| P4 | A press at rest. | Group 1 is highlighted and no pick is reported. |
| P5 | A press while group 2 is highlighted, and then a move. | Cell 2 of group 2 is highlighted. |
| P6 | After case P5, a move. | The groups are shown again with group 2 highlighted. |
| P7 | A press while cell 1 of group 2 is highlighted. | One pick of group 2, cell 1 is reported, and the state is confirmed. |
| P8 | After case P7, a move and a press within 500 ms. | Nothing changes and no pick is reported. |
| P9 | After case P7, 500 ms pass. | Group 1 is highlighted. |

The dwell service, in `src/app/scan/dwell.spec.ts`. The selection mode is `dwell`, the dwell time is 1000 ms and the post click delay is 500 ms:

| Case | Input | Expected result |
| --- | --- | --- |
| D1 | The pointer enters cell A, and 999 ms pass. | A dwell runs on cell A and no press is reported. |
| D2 | After case D1, 1 ms more passes. | One press of cell A is reported, and no dwell runs. |
| D3 | The pointer enters cell A, and leaves it at 600 ms. Then 1000 ms pass. | No press is reported and no dwell runs. |
| D4 | The pointer enters cell A, leaves it at 600 ms and enters cell B. Then 999 ms pass, and then 1 ms. | No press is reported at 999 ms, and one press of cell B is reported after it, so the dwell started from zero. |
| D5 | The pointer enters cell A and moves inside it at 300 ms and at 700 ms. | One press of cell A is reported at 1000 ms, so a move inside the cell did not start the dwell again. |
| D6 | After the press of case D2, the pointer stays still for 10 seconds. | No second press is reported. |
| D7 | After the press of case D2, the pointer moves inside cell A at 300 ms, and 2000 ms pass. | No press is reported, because the move came within the post click delay. |
| D8 | After the press of case D2, the pointer moves inside cell A at 600 ms. | A dwell runs on cell A, and one press is reported at 1600 ms. |
| D9 | After the press of case D2, a new board is given and the pointer stays still for 10 seconds. | No press is reported on the new board. |
| D10 | The pointer enters cell A, and the service is told at 400 ms that the cell was pressed with the pointer. | The dwell stops and no dwell press is reported. |
| D11 | The selection mode is each of `scan`, `step`, `cursor` and `touch`. The pointer enters cell A and 5 seconds pass. | No dwell runs and no press is reported. |

The switch keys, in `src/app/scan/switches.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| W1 | Enter is pressed with the focus on the page body, in `scan` mode. | The scan gets one press. |
| W2 | Tab is pressed in `scan` mode, and then Shift with Tab. | The scan gets one move and then one move back, and the browser does not move the focus by itself. |
| W3 | Tab and then Enter are pressed in `step` mode. | The scan gets one move and then one press. |
| W4 | Tab is held down, so the key event repeats five times. Then Enter is held down in the same way. | The scan gets one move and then one press. |
| W5 | A cell holds the focus in `scan` mode, and Space is pressed. | The scan gets no press and no move, and the cell is not pressed by the key. |
| W6 | A cell holds the focus in `scan` mode, and Enter is pressed. | The scan gets one press, and the browser does not press the cell a second time. |
| W8 | The focus is in a text field, and Tab and Enter are pressed. | The scan gets no press and no move, and the browser handles both keys. |
| W9 | The keys A, Space, Escape and the arrow keys are pressed. | The scan gets no press and no move. |
| W10 | The selection mode is `cursor`, then `touch`, then `dwell`. Tab and Enter are pressed with the focus on the page body. | The scan gets no press and no move in any of the three modes, and the browser handles both keys. |
| W7 | The selection mode is `touch`. A cell is pressed with the pointer, so it holds the focus, and Enter is pressed. | The cell is pressed by the key, as the browser does by itself, and the scan gets no press. |

The board screen with the scan, in `src/app/boards/board-screen.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| R1 | The home board is drawn and nothing is pressed. | The grid is marked as at rest, and no group and no cell carries `data-scan`. |
| R2 | One switch press. | The grid is marked as scanning groups, only the first group carries `data-scan`, and that group holds the keyboard focus and has the name "Column 1 of 2". |
| R3 | A second press, and then 1000 ms. | The grid is marked as scanning cells, and only the cell Needs carries `data-scan`. |
| R4 | A press while the cell Needs is highlighted. | The app opens `board/needs`. |
| R5 | On Quick phrases, the cell of a phrase is picked. | The status text holds the phrase, the cell is marked as confirmed, and the board stays open. |
| R6 | A cell is pressed with the pointer while a group is highlighted. | The action of the cell runs, the grid is marked as at rest, and nothing in the grid holds the focus. |
| R7 | The board is drawn in the rows layout, and one switch press is made. | The first group carries `data-scan` and has the name "Row 1 of 2", so the groups are the rows. |
| R13 | The selection mode is `scan` and nothing is stored for show progress bar. One switch press, and then a second. | The first group and then the cell My boards carry `data-scan`. Nothing is marked to show the bar, and the grid is not marked to keep room for it. |
| R11 | The selection mode is `scan`, show progress bar is on and the scan time is 1000 ms. One switch press, and then a second. | The grid is marked to keep room for the bar and carries a scan time of 1000 ms. The first group is marked to show the bar after the first press, and the cell My boards after the second. |
| R12 | The selection mode is `step` and show progress bar is on. One move. | The first group carries `data-scan`, nothing is marked to show the bar, and the grid is not marked to keep room for it. |
| R14 | The selection mode is `cursor`. The mouse pointer moves over the page to 120, 80 and then to 300, 210, and then leaves the window. | A round cursor is drawn at 120, 80 and then at 300, 210, hidden from screen readers, and the page is marked to hide the arrow of the system. No cursor is drawn before the first move or after the pointer leaves. |
| R15 | The selection mode is `cursor` and a pointer of the touch kind moves over the page. Then the mode is each of `scan`, `step`, `touch` and `dwell` and the mouse pointer moves over the page. | No cursor is drawn for the finger or in the four other modes, and the page is not marked to hide the arrow in those modes. |
| R8 | The selection mode is `dwell` and the dwell style is `bar`. The mouse pointer enters the cell Needs. | Only the cell Needs carries `data-dwell`, and the grid is marked with the style `bar` and a dwell time of 1000 ms. |
| R9 | After case R8, 1000 ms pass. | The app opens `board/needs`. |
| R10 | The selection mode is `dwell`. A pointer of the touch kind enters the cell Needs, and 5 seconds pass. | No cell carries `data-dwell` and no board opens. |

### A4. End to end tests (1, 3, 4, 5, 8, 9, 10, 11, 23, 28 to 34, 36, 37, 38)

Command: `npm run e2e`

The tests are in `e2e/scanning.spec.ts`. They store a scan time of 1000 ms and a post click delay of 500 ms, and they move the clock of the page.

| Case | Input | Expected result |
| --- | --- | --- |
| K1 | The home screen. For each of its four cells, the test starts the scan with Enter, waits for the group, presses Enter, waits for the cell and presses Enter. | Each cell opens its own board. This is the check that single switch scanning reaches every target of the home screen. |
| K2 | The same steps for each of the thirteen cells of the Needs board, in the columns layout and in the rows layout. | Each cell is reached and marked as confirmed, and the Back cell opens the home screen. |
| K3 | The same steps for each of the thirty five cells of the QWERTY keyboard. | Each cell is reached. After the keys H and I are picked, the message reads "hi". |
| K4 | The same steps for one cell of each other board in `boards.json`. | The cell is reached on every board, so no board is left out of scanning. |
| K5 | On the home screen, the scan runs for 20 seconds with no press. Then, in each of the five selection modes, Tab is pressed 12 times. | The settings button and the Sign out button never carry `data-scan` and never hold the focus. Both have a tab index of -1. |
| K6 | On the sign in screen, with no stored sign in, the Email field holds the focus. Tab is pressed, and 5 seconds pass. | Nothing carries `data-scan`, and the Password field holds the focus, so the sign in screen keeps the tab order of the browser. |
| K7 | On Quick phrases, a phrase is picked, and Enter is pressed 300 ms later. | Nothing more is picked. After 500 ms the first group is highlighted again. |
| K8 | On the home screen, in each of the five themes, with a group highlighted and then with a cell highlighted. | The outline of the highlighted group and cell is ink and at least 4 px wide. No label is dimmed, because the user removed the dimming on 2026-11-19. |
| K9 | On the home screen and on Needs, in each theme, in the groups state and the cells state, and on Needs in the confirmed state. A pick on the home screen opens a board at once, so the home screen has no confirmed state to check. | axe reports no WCAG 2.2 Level AA violation. |
| K10 | On the home screen in `scan` mode, the scan is started with Enter and runs through both groups and then the cells of the second group. | At each step the highlighted group or cell holds the keyboard focus, and the first group has the name "Column 1 of 2". After the two passes that end the scan, nothing holds the focus. |
| K22 | The selection mode is `touch`. On the home screen, Tab is pressed four times and then Enter. | The focus goes to My boards, Needs, Quick phrases and Keyboards in turn, with no stop on a group, and Enter opens the Keyboards list. |
| K11 | On the home screen, the scan is started, and then the cell Keyboards is clicked. | The Keyboards list opens with nothing highlighted and nothing in focus. |
| K12 | The selection mode is `step`. On the home screen, Tab is pressed twice, then Enter, then Tab, then Enter. | The focus goes to the first column, the second column, Quick phrases and Keyboards in turn, and the Keyboards list opens. After 10 seconds with no press, nothing has moved by itself. |
| K23 | The selection mode is `step`. On the home screen, Tab is pressed twice and then Shift with Tab. | The first column holds the focus again. |
| K13 | The selection mode is `cursor`, then `touch`, then `dwell`. On the home screen, 5 seconds pass, and then the cell Needs is clicked. | Nothing carries `data-scan` at any time, and the click opens the Needs board. |
| K14 | The selection mode is `dwell`, with a dwell time of 1000 ms. On the home screen, the pointer moves onto Needs and rests for 1000 ms. | The Needs board opens. With the pointer still, 5 more seconds pass and no cell of Needs is pressed. |
| K15 | The same mode. On Quick phrases, the pointer moves onto a phrase, leaves it at 600 ms, and 2 seconds pass. | Nothing is pressed and no cell carries `data-dwell`. |
| K16 | The same mode. On the QWERTY keyboard, the pointer rests on L for 1000 ms, moves inside L after 600 ms more, and rests for 1000 ms. | The message reads "ll". |
| K17 | The dwell style is `grow`. On the home screen, the pointer rests on Needs for 500 ms. | The cell Needs is drawn larger than at rest and at most 1.08 times its size, and the three other cells have not moved or changed size. |
| K18 | The dwell style is `bar`. On the home screen, the pointer rests on Needs for 500 ms, in each of the five themes. | A bar across the bottom of the cell is about half filled, and its colour has a contrast of at least 3 to 1 against the cell. |
| K20 | The selection mode is `dwell`. The pointer rests on the settings button and then on the Sign out button for 5 seconds each. | Neither button is pressed, and neither carries `data-dwell`. |
| K21 | The selection mode is `dwell`, in each dwell style and in each theme, while a dwell runs on Needs. | axe reports no WCAG 2.2 Level AA violation. |
| K24 | The selection mode is `scan` and show progress bar is on, in each of the five themes. On the home screen, the scan is started and 500 ms pass. | A bar across the bottom of the first column is about half full, and its colour has a contrast of at least 3 to 1 against what is behind it. |
| K25 | After case K24, 500 ms more pass, and then 250 ms. | The bar is on the second column and about three quarters full, so it started full again when the highlight moved. |
| K26 | The selection mode is `scan` and show progress bar is on. A cell of Quick phrases is picked. | No bar is drawn while the cell shows the confirmed look. |
| K27 | The selection mode is `scan`, show progress bar is on, and the browser asks for less motion. The scan is started. | The bar is drawn on the first group and empties over the scan time. |
| K28 | The selection mode is `scan` and nothing is stored for show progress bar. On Needs, in the columns layout and in the rows layout, a group is highlighted and then a cell. | No bar is drawn on the group or on the cell. No group keeps room for a bar, and no cell has moved. |
| K29 | The same steps with show progress bar on. | Each group keeps room for the bar before the scan starts. The bar is marked on the group and then on the cell, and no cell has moved. |
| K30 | The selection mode is `cursor`. On the home screen, the pointer moves onto My boards, then onto the title, then onto the Sign out button. Then the cell Keyboards is clicked. | At each place a circle is drawn with its middle at the pointer, and what is under it shows no arrow of the system. Nothing carries `data-scan`. The click opens the Keyboards list, and the circle is still drawn. |
| K31 | The selection mode is each of `scan`, `step`, `touch` and `dwell`. The pointer moves onto My boards. | No circle is drawn, and the cell shows the hand of the system. |

The end to end tests of features 1 to 3 run in the same command and must still pass.

## Manual checks

### H1. One switch in `scan` mode, at the default times (1, 14, 17, 21, 22)

1. Clear `symple.scanTime`, `symple.postClickDelay`, `symple.selectionMode` and `symple.showProgressBar` in the local storage of the browser, and run `make start`.
2. Sign in and leave the home screen alone for 10 seconds. Expected: nothing is highlighted.
3. Press Enter once. Expected: the first column is outlined and lies on a dark grey plate, no cell is dimmed, and the outline moves every 1.5 seconds. No progress bar is shown. No cell moves when the outline comes or goes.
4. Press Enter on the second column, and again on Keyboards. Expected: the Keyboards list opens, and half a second later the scan starts by itself.
5. Open the QWERTY keyboard and write "hello" with Enter alone. Expected: the message reads "hello".

### H8. The progress bar (36, 37)

1. Set `symple.showProgressBar` to `true` in the local storage of the browser and reload.
2. Press Enter once. Expected: a white bar under the cells of the outlined column, inside the outline, empties in 1.5 seconds and starts full again on the next column. No cell moves when the outline comes or goes.
3. Press Enter on a column. Expected: a bar inside the outlined cell empties in the same time.
4. Set `symple.layout` to `rows` and reload. Expected: the space between two rows is bigger than the gap between cells, and the bar of a row lies in it.

### H2. The look against the mockup (8)

1. Open `context/design/home.html` next to the app.
2. Compare the groups state, the cells state and the confirmed state in each of the five themes. Expected: the outline and the swapped colours of a picked cell match the mockup. The app does not dim the other cells, as the mockup does, and it puts a dark grey plate under the highlighted group, which the mockup does not have. In the dark theme, check that a grey cell such as Quick phrases still stands out from the plate.

### H3. A real switch (7, 13)

1. Connect a switch box that sends Enter.
2. Open Needs and pick three cells with the switch. Expected: each press picks the highlighted group or cell, and a press held down picks once.

### H4. Two switches in `step` mode (2, 14, 19)

1. Set `symple.selectionMode` to `step` in the local storage of the browser and reload.
2. Move with Tab and pick with Enter on the home screen and on Needs. Expected: nothing moves by itself, a move past the last cell of a group shows the groups again, and Tab never lands on the settings button or on Sign out.

### H5. Less motion (26)

1. Turn on Reduce motion in the macOS settings.
2. Start the scan. Expected: the outline changes with no fade.

### H6. The `cursor` and `touch` modes (15)

1. Set `symple.selectionMode` to `touch` in the local storage of the browser and reload.
2. Wait 5 seconds, and then click Needs. Expected: nothing is highlighted, and the click opens the Needs board.
3. Reload and press Tab four times. Expected: the focus goes through the four cells in turn and never lands on the settings button or on Sign out.
4. Repeat with `cursor`. Expected: the same results, and a round cursor follows the trackpad over the whole page in place of the arrow, on the header and the footer too. It is easy to see on dark cells, on light cells and on the page in each of the five themes, and a press of the trackpad presses the cell under its middle.

### H7. The dwell press and its two styles (28 to 34)

1. Set `symple.selectionMode` to `dwell` in the local storage of the browser and reload.
2. Rest the pointer on Needs. Expected: the cell slowly grows for 1 second above the cells next to it, and then the Needs board opens.
3. Keep the pointer still for 5 seconds. Expected: nothing is pressed on the Needs board.
4. Move the pointer onto a cell and off it before the second ends. Expected: the cell returns to its size and nothing is pressed.
5. Set `symple.dwellStyle` to `bar` and reload. Rest the pointer on a cell. Expected: a bar fills across the bottom of the cell for 1 second, and then the cell is pressed.
6. Look at both styles in each of the five themes. Expected: the growth and the bar are easy to see, and no label is covered.

## Checks from the review of 2026-11-20

These checks cover the eight findings of review.md that the user picked. Each one names its finding and its plan step.

### V1. The new unit cases (findings 1 and 6, plan steps 11 and 12)

Command: `npm test`

The scan service, in `src/app/scan/scan.spec.ts`. The board has two groups of two cells unless a case says otherwise:

| Case | Input | Expected result |
| --- | --- | --- |
| S22 | The mode is `scan` and group 2 is highlighted. The selection mode is set to `touch`, and 10 seconds pass. | The state is rest and nothing moves. |
| S23 | The mode is `step` and cell 1 of group 2 is highlighted. The selection mode is set to `scan`, and 10 seconds pass. | The state is rest and nothing moves, so any change of the mode sends the scan to rest. |
| P10 | The mode is `step` and cell 2 of group 2 is highlighted. A move back. | Cell 1 of group 2 is highlighted. |
| P11 | After case P10, a move back. | The groups are shown again with group 2 highlighted. |
| P12 | The mode is `step` and group 1 is highlighted. A move back. | Group 2 is highlighted, so a move back from the first group goes round to the last. |
| P13 | The mode is `step` and the board has one group of three cells. Cell 1 is highlighted. A move back. | Cell 3 is highlighted. |

The dwell service, in `src/app/scan/dwell.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| D12 | The pointer enters cell A. At 400 ms the selection mode is set to `touch`, and 5 seconds pass. | No dwell runs and no press is reported. |

The stored settings, in `src/app/scan/scan-settings.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| T14 | `set` is called with a scan time of 100 ms. | The scan time is still 1500 ms and nothing is stored under `symple.scanTime`. |
| T15 | Writing local storage throws, and `set` is called with a scan time of 3000 ms. | Nothing is thrown and the scan time is 3000 ms. |

The board screen, in `src/app/boards/board-screen.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| R16 | The mode is `scan` and one switch press is made. The selection mode is set to `touch`. | The grid is marked as at rest, nothing carries `data-scan`, and nothing in the grid holds the focus. |

### V2. The local storage service (finding 5, plan step 13)

Command: `npm test`

The cases are in `src/app/storage/local-store.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| O1 | The key `symple.test` holds `abc`, and it is read. | The result is `abc`. |
| O2 | Nothing is stored, and the key is read. | The result is nothing. |
| O3 | Reading local storage throws, and the key is read. | Nothing is thrown and the result is nothing. |
| O4 | `abc` is written under the key. | Local storage holds `abc` under the key. |
| O5 | Writing local storage throws, and a text is written. | Nothing is thrown. |

- The unit tests of the theme, the layout and the scan settings pass with no change to their cases, apart from cases T14 and T15 above.

### V3. One place for each thing (findings 4, 5, 9, 10 and 3, plan steps 13 to 17)

Command: `grep -rnE "SETTING_NAMES|storeAndReload|isAt\(|function same\(" src e2e`

- The command prints nothing, so the second list of setting names, the second reload helper and the two copies of the cell test are gone.

Command: `grep -rn "localStorage" src/app --include="*.ts" --exclude="*.spec.ts"`

- The command prints lines of `src/app/storage/local-store.ts` and `src/app/auth/auth.ts` only. The sign in service keeps its own storage code, because the review did not cover it.

Command: `grep -cE "scan|dwell|cursor" src/styles/cells.css`

- The command prints 0, so the scan, dwell and cursor looks are in `src/styles/scan.css`.

### V4. The bars after the move (finding 9, plan step 15)

Command: `npm run e2e`

One new case, in `e2e/scanning.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| K32 | The selection mode is `scan` and show progress bar is on. On the home screen, the scan is started and the height of the bar of the first group is read. Then the group is picked and the height of the bar of the cell My boards is read. | The two heights are the same. |

- Cases K8, K9, K17, K18, K21 and K24 to K29, which check the outline, the dwell styles and the bars, pass with no change.
- Manual checks H2, H7 and H8, which compare the look by eye, are done again.

### V5. The end to end tests after the helper changes (findings 2 and 3, plan steps 10 and 16)

Command: `npm run e2e`

- Every end to end test of features 1 to 4 passes. Cases E4, E7, B8, Y8 and N15, which press Tab through the cells, pass with the selection mode given to `openBoard`.

Command: `npx playwright test e2e/scanning.spec.ts --repeat-each=3`

- Every test passes in all three runs, and no load shows the sign in screen. The `open` helper holds no second load, so a lost sign in would fail its test.
- The cause of the lost sign in is written in a comment in the helper, next to its fix.
