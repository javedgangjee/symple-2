# Feature 4: Scanning. Review

The review looked at code practice and quality, and at code that is written more than once. It also looked for wrong behaviour on the way.

## What was run and what was only read

- I ran `npm test` with Node 22.23.5. All 247 unit tests passed.
- I ran `npm run lint` and `npm run format:check`. Both passed.
- I did not run `npm run build` or `npm run e2e`. The end to end tests were only read.
- I read the diff against `main`, and in full every file in `src/app/scan/`, the board screen, the cell component, `src/styles/cells.css`, `e2e/scanning.spec.ts` and the helpers in `e2e/support/`.
- No finding below was shown in a running browser. Each one comes from reading the code.

## Findings

### 1. The scan and the dwell do not notice a change of the selection mode

- Level: medium.
- Files: `src/app/scan/scan.ts` lines 203 to 208, `src/app/scan/dwell.ts` lines 104 to 116, `src/app/boards/board-screen.ts` lines 171 to 178.
- Case: The mode is `scan` and a group is highlighted. `ScanSettings.set({ selectionMode: 'touch' })` is called, as the settings of feature 8 will do and as unit case R15, which checks that no cursor is drawn in the other modes, already does. The timer stops after one more step, but the state stays `groups`. The group keeps its outline, its grey plate and the keyboard focus. Tab and Enter are no longer switches, and a pointer press does not send the scan to rest, because `onCellPress` rests it only in a switch mode. The highlight stays until another board opens. In the same way, a dwell that started in `dwell` mode still presses its cell after the mode has changed.
- Fix: Add an effect that reads the selection mode and sends the scan to rest and stops the dwell when the mode changes. Add a unit case for each service.

### 2. The end to end helper hides a lost sign in whose cause is not known

- Level: medium.
- File: `e2e/support/scan.ts` lines 66 to 77.
- Case: The `open` helper loads the board a second time when the first load shows the sign in screen. Its comment says that this happens about once in a hundred loads and that the cause was not found. If the cause is in the app, such as a race when the stored sign in is read at start, a real device shows the sign in screen now and then. The primary user cannot type a password, so that is a dead end for them. The second load makes the tests pass either way, and nobody reads the note it leaves on the test.
- Fix: Find the cause before the feature is merged. Until then, count the second loads and fail the run when there is one, or record a trace of the first load so the cause can be found.

### 3. Three helpers write settings to local storage, and five older cases load the app three times

- Level: low.
- Files: `e2e/support/boards.ts` lines 67 to 84, `e2e/support/scan.ts` lines 51 to 58 and lines 96 to 104.
- Case: `openBoard` writes the layout and the theme. The `open` helper of the scanning tests writes any setting with a loop. `storeAndReload` holds a second copy of that loop. Cases E4, E7, B8, Y8 and N15, which press Tab through the cells, call `openBoard` and then `storeAndReload`, so each loads the app three times to store one more value.
- Fix: Keep one function that writes a `StoredSettings` object, and pass it to both `addInitScript` and `page.evaluate`. Give `openBoard` the `StoredSettings` type, so the five cases pass `selectionMode: 'touch'` to it. Then delete `storeAndReload`.

### 4. `ScanSettings` names each of its six settings in seven places, and one of the lists can fall behind

- Level: low.
- File: `src/app/scan/scan-settings.ts` lines 15 to 123.
- Case: A setting is named in the interface, the storage keys, the defaults, the parsers, `SETTING_NAMES`, the six signals and `load`. The compiler checks all of them but `SETTING_NAMES`, because `satisfies` does not ask for every name. A seventh setting that is left out of that list compiles. `set` then never checks it and never stores it, but line 143 still puts the unchecked value into use.
- Fix: Take the names from `Object.keys(PARSERS)`, and build the values in `load` with a loop over them. One table that holds the key, the default and the parser of each setting would be shorter still.

### 5. The code that reads and writes local storage safely is in three services

- Level: low.
- Files: `src/app/scan/scan-settings.ts` lines 152 to 167, `src/app/layout/layout.ts` lines 37 to 53, `src/app/theme/theme.ts` lines 36 to 57.
- Case: Each service has the same `try` and `catch` around `getItem` and around `setItem`, with the same comment. A fourth service for a stored value would copy it again.
- Fix: Add one small service with `read(key)` and `write(key, text)`, and use it in the three. This changes `theme.ts` and `layout.ts`, which the plan of this feature does not name.

### 6. The move back has no unit case, and `set` has none for a refused value or a failed storage

- Level: low.
- Files: `src/app/scan/scan.ts` lines 99 to 116, `src/app/scan/scan-settings.ts` lines 129 to 144.
- Case: `Scan.move(-1)` has three paths: back from the first cell of a group to the group, back from the first group round to the last, and round inside a board with one group. No unit case calls `move(-1)`. Case W2, which checks the switch keys, only shows that Shift with Tab passes `-1` on, and end to end case K23 goes back from the second group to the first. A wrong sign in line 140 or line 114 would pass every test. `set` drops a value that is out of range, and no case shows that. No case shows that `set` still applies a value when storage throws, as case L6 does for the layout.
- Fix: Add the cases to validation.md and to the two spec files.

### 7. The contrast code of the end to end tests is written three times

- Level: low.
- Files: `e2e/support/scan.ts` lines 243 to 271, `e2e/support/boards.ts` lines 190 to 220, `e2e/support/contrast.ts` lines 21 to 57.
- Case: `readBar`, `readGlass` and `contrastRatio` each build a canvas, resolve a colour with a probe element, work out the luminance and apply the WCAG formula. `resolveColours` holds a fourth copy of the probe. A fix to the formula in one would leave the others as they are.
- Fix: Put the page side helpers in one function that is installed on the page once, for example with `addInitScript`, and call it from the three readers.

### 8. Small parts of the end to end tests are repeated

- Level: low.
- Files: `e2e/scanning.spec.ts` lines 64 to 70, 264 to 282, 624 to 626, 642 to 644 and 663 to 669, `e2e/home.spec.ts` lines 19 and 106 to 116, `e2e/sign-in.spec.ts` lines 25 and 30, `e2e/boards.spec.ts` lines 221 to 224.
- Case: `HOME_CELLS` is declared in three spec files and `signOutButton` in two. The outline check of case K8, which checks the outline of the highlight, is a copy of the one in case E7, which checks the outline of the focused cell. Its function is named `switchKeyAndCheckOutline` but presses no key. The bottom padding of a group is read by the same three lines in cases K28, K29 and B9. Case K30, which checks the round cursor, repeats the box check of `pointAt`.
- Fix: Move the constants and the locators to `e2e/support/boards.ts`. Add `expectInkOutline(target)` and `barRoom(page)` to the helpers, and give `pointAt` the part of the box to aim at.

### 9. The bar is drawn by two near copies of one rule, and the scan look is spread over two files

- Level: low.
- Files: `src/app/boards/board-screen.css` lines 30 to 64, `src/styles/cells.css` lines 109 to 202.
- Case: The bar of a group and the bar of a cell each set the content, the place, the radius, the gradient and the animation. The comment says that the two bars are as tall as each other, but one height is `clamp(4px, 0.9vmin, 8px)` and the other is `clamp(4px, 2.4cqmin, 8px)`, and the track is mixed at 20 percent in one and 22 percent in the other. The rules for a highlighted group are in the board screen file, the rule for its cells is in the global file, and each file points at the other in a comment. The rule that hides the arrow in `cursor` mode sits among the cell rules. Plan step 6, which draws the scan states, also names `src/app/cells/cell.css`, and that file was not changed.
- Fix: Put the scan, dwell and cursor looks in one global file, such as `src/styles/scan.css`. Write the bar once for the three selectors, with custom properties for its colour, its height and its distance from the bottom.

### 10. The same test for "is this the cell" is written three times

- Level: low.
- Files: `src/app/scan/dwell.ts` line 8, `src/app/boards/board-screen.ts` line 162, `src/app/boards/board-screen.html` line 30.
- Case: `same` in the dwell service, `isAt` in the board screen and the inline test in the template all compare a group index and a cell index.
- Fix: Export one function from `src/app/scan/scan.ts` and use it in the three places.

### 11. The pointer listeners run in every selection mode

- Level: low.
- Files: `src/app/boards/board-screen.ts` lines 40 to 44, `src/app/boards/board-screen.html` lines 41 to 43.
- Case: The screen listens for `pointermove` on the document and on every cell in all five modes. In `scan`, `step` and `touch` mode the handlers change nothing, but each event still marks the screen to be checked again. On the QWERTY keyboard that is three method calls for each of 35 cells on every move of the pointer. I did not measure the cost.
- Fix: Listen on the document only in `cursor` mode and on the cells only in `dwell` mode, for example by adding the listeners in an effect.

### 12. The grid carries a `data-dwell-style` attribute that nothing reads

- Level: low.
- File: `src/app/boards/board-screen.html` line 12.
- Case: No style rule and no code reads `data-dwell-style`. Each cell already carries the style as the value of `data-dwell`. Only unit case R8, which checks the marks of a dwell, looks at the attribute. Plan step 5, which adds the dwell press, asked for it.
- Fix: Remove the attribute and its line in case R8, or use it in the styles and make `data-dwell` a plain mark.

### 13. The fake timer set up is copied between two unit spec files

- Level: low.
- Files: `src/app/scan/scan.spec.ts` lines 25 to 52, `src/app/scan/dwell.spec.ts` lines 10 to 48.
- Case: Both files keep a subscription and a list of what was reported, define the same `pass`, and have the same `beforeEach` and `afterEach`.
- Fix: Move the shared part to a small helper in `src/app/scan/`, or leave it, since each copy is short.

## Votes, 2026-11-20

Five voters checked each finding against the code. No voter called any finding invalid, so all 13 are kept. The level of each is the middle of the five levels the voters gave. Within a level the order follows the average place the voters gave.

### Kept findings, in order

1. **Finding 2, the end to end helper that hides a lost sign in whose cause is not known.** Three voters said valid and two said partly. Level: medium. Correction: the comment in the helper places the cause in the test setup. That the cause could be in the app is the reviewer's guess, and no voter could check it.
2. **Finding 1, the scan and the dwell that do not notice a change of the selection mode.** Four voters said valid and one said partly. Level: low, where the reviewer gave medium. Correction: nothing in the app can change the mode while a board is on show until feature 8, settings, is built. If the settings screen takes the place of the board, the scan goes to rest anyway. The fault is real only if settings lies over a board.
3. **Finding 6, the move back that has no unit case, and `set` that has none for a refused value or a failed storage.** Four voters said valid and one said partly. Level: low. Correction: the two lines named for a wrong sign, 140 and 114, are both in `src/app/scan/scan.ts`. Line 107 of that file also uses the direction.
4. **Finding 4, `ScanSettings` naming each setting in seven places.** Five voters said valid. Level: low.
5. **Finding 9, the bar drawn by two near copies of one rule.** Three voters said valid and two said partly. Level: low. Correction: the comment that says the two bars are as tall as each other is at lines 40 and 41 of `board-screen.css`. One voter noted that the two bars differ partly on purpose, because one lies on the grey plate and one on a cell.
6. **Finding 3, the three helpers that write settings to local storage.** Five voters said valid. Level: low.
7. **Finding 11, the pointer listeners that run in every selection mode.** Five voters said partly. Level: low, and three voters said it is close to none. Correction: the sentence "three method calls for each of 35 cells on every move of the pointer" is wrong as written. A pointer move runs the handler of the one cell under the pointer and the handler of the document. What the reviewer meant is that the template is then checked again for every cell, and that cost was not measured. One voter noted that `Dwell.pointer` keeps the last place of the pointer in every mode, so taking the listeners away would change that.
8. **Finding 5, the safe local storage code in three services.** Five voters said valid. Level: low. One voter noted that the plan told the settings service to read storage "in the way that `layout.ts` reads the layout", so the copy was the plan's choice.
9. **Finding 12, the `data-dwell-style` attribute that nothing reads.** Four voters said valid and one said partly. Level: low. Correction: case R8 in validation.md, which checks the marks of a dwell, also asks for the attribute, so the fix changes the plan and that case as well as the code.
10. **Finding 7, the contrast code written three times.** Two voters said valid and three said partly. Level: low. The three who said partly had not read all three files.
11. **Finding 8, the small repeated parts of the end to end tests.** Four voters said valid and one said partly. Level: low.
12. **Finding 10, the test for "is this the cell" written three times.** Five voters said valid. Level: low.
13. **Finding 13, the fake timer set up copied between two unit spec files.** Four voters said valid and one said partly. Level: low. Every voter placed it last, and the finding itself says it can be left.

### Dropped findings

None.

# Second review, 2026-11-21

This review looked at the code as it stands after the fixes of the first review. It looked at code practice and quality, and it left out small points. It does not raise again the five findings of the first review that the user chose not to fix.

## What was run and what was only read

- I ran `npm test` with Node 22.23.5. All 262 unit tests passed.
- I ran `npm run lint`, `npm run format:check` and `npm run build`. All three passed.
- I did not run `npm run e2e`. The end to end tests were only read.
- I read the diff against `main`, and in full every file in `src/app/scan/`, `src/app/storage/local-store.ts`, the board screen, `src/styles/scan.css`, `e2e/scanning.spec.ts` and `e2e/support/scan.ts`.
- For finding B1 I took the two lines 92 and 93 out of `src/app/scan/scan.ts`, ran `npm test`, and put them back. All 262 tests still passed.
- No finding below was shown in a running browser.

## Findings

### B1. No test covers a board that arrives after the scan has started again

- Level: medium.
- File: `src/app/scan/scan.ts` lines 92 and 93, with the `resumed` flag at lines 59, 105, 123, 144, 185 and 238.
- Case: A pick opens a board. When the post click delay is 0, or when the new board arrives later than the delay, the scan has already started again on the old board. The `resumed` flag is there so that `show` then starts the scan on the new board and does not send it to rest. With those two lines removed, every unit test passes. Unit case S13, which gives a new board inside the delay, takes the other branch, and unit case S14, which sets the delay to 0, gives no new board. The end to end tests store a delay of 500 ms, so they most likely take the other branch too. If this branch broke, a primary user with a delay of 0 would have to press once more after every cell that opens a board, and no test would say so.
- Fix: Add two unit cases to `scan.spec.ts`. One sets the delay to 0, picks, gives a new board and expects the first group of the new board. The other gives the new board after the delay has ended. Add one for the path through an empty board, which is what the closing screen gives first.

### B2. The cause of the lost sign in is still not known, and the check in validation.md says it is

- Level: medium.
- Files: `e2e/support/scan.ts` lines 18 to 58 and 100 to 124, `specs/features/04-scanning/validation.md` line 323.
- Case: Plan step 10, which was to find why a first load can show the sign in screen, ended with a comment that says "The cause was not found". Check V5 in validation.md, which covers the end to end tests after the helper changes, expects that "the cause of the lost sign in is written in a comment in the helper, next to its fix". That check cannot pass as written. The helper now keeps about 60 lines to note the browser state and to trace the load, and it starts a Playwright trace on every load of every scanning test and throws it away. I did not measure what that costs.
- Fix: The user decides one of two things. Either the question stays open, and then check V5 is reworded to say so and the question gets a line in the roadmap so it is not lost. Or the search goes on before the merge. In both cases, measure the run time of `e2e/scanning.spec.ts` with and without the trace, and drop the trace if it costs much.

### B3. The switch listener and the board of the scan belong to no screen, so a second board screen would break the first

- Level: low.
- Files: `src/app/scan/switches.ts` lines 62 to 71, `src/app/boards/board-screen.ts` lines 90 to 97.
- Case: `Switches`, `Scan` and `Dwell` are single services for the whole app, and each board screen starts them when it is made and stops them when it is destroyed. This works only because the router destroys the old screen before it makes the new one. If two board screens are alive for a moment, the first to close removes the key listeners of the other, because both use the same handler, and it gives the scan an empty board. The switches then do nothing until the next screen opens. A route animation would do this, and so would a board drawn inside the settings panel of feature 8.
- Fix: Have `start` return a function that stops only that start, or count the starts. Have the closing screen clear the board only if the scan still holds the board that this screen gave. A comment that states the rule is the smallest fix.

### B4. The focus finds its target by a class name and by counting buttons

- Level: low.
- File: `src/app/boards/board-screen.ts` lines 210 and 211.
- Case: `moveFocus` takes the group as the nth element with the class `group`, and the cell as the nth `button` inside it. That is right only while each cell draws exactly one button. A cell that later holds a second button, such as a message cell with its own clear button, moves every later cell by one, and the focus and the screen reader then name the wrong cell while the outline shows the right one. The screen already knows its cells as components.
- Fix: Read the groups and the cells with `viewChildren`, and give the cell component a `focus()` method. Or have `moveFocus` count `app-cell` elements and focus the button inside the one it wants.

### B5. `src/styles/scan.css` sets rules for the bare class names `.group` and `.cursor` on every page

- Level: low.
- File: `src/styles/scan.css` lines 9 to 15 and 143 to 156.
- Case: The file is global, because it must reach into the cells. Its rules for `.group` and `.cursor` are not tied to the grid of a board. Any later element with the class `group`, such as a group of fields in the settings panel of feature 8, gets `position: relative`, the rounded corners and a see-through outline with no warning. The other rules in the file start at `.grid` or at `app-cell` and do not leak.
- Fix: Write `.grid .group` at line 9, and give the cursor a name of its own, such as `.scan-cursor`.

## Votes on the second review, 2026-11-21

Five voters checked each finding against the code. No voter called any finding invalid, so all five are kept. The level of each is the middle of the five levels the voters gave. Within a level the order follows the average place the voters gave. No voter ran the tests, so the result of taking out lines 92 and 93 rests on the reviewer's run.

### Kept findings, in order

1. **Finding B1, the board that arrives after the scan has started again, which no test covers.** Five voters said valid. Level: medium. Four voters gave medium and one gave low. Correction: the sentence that the end to end tests most likely take the other branch is a guess, and no voter could check it. One voter called the extra case for the empty board padding.
2. **Finding B2, the cause of the lost sign in that is still not known while validation.md says it is.** Three voters said valid and two said partly. Level: low, where the reviewer gave medium. Four voters gave low and one gave medium. The voters agree that check V5, which covers the end to end tests after the helper changes, cannot pass as written. They see the fix as a new wording of that check and a note of the open question. Plan step 10, which was to find the cause, planned the trace, so the helper follows the plan.
3. **Finding B3, the switch listener and the board of the scan that belong to no screen.** Five voters said partly. Level: low. Three voters gave low and two gave none. Correction: no second board screen can be alive today, and the route animation and the board inside the settings panel are guesses about later work. The comment at lines 93 and 94 of `board-screen.ts` already states part of the rule. The voters say a comment is fix enough.
4. **Finding B5, the bare class names `.group` and `.cursor` in the global style file.** Five voters said partly. Level: low. Three voters gave low and two gave none. Correction: the sentence that the other rules in the file do not leak is overstated, because lines 75 and 91 of `scan.css` also start at a bare `.group`. Only `board-screen.html` uses the two class names today, so nothing is hurt now.
5. **Finding B4, the focus that finds its target by a class name and by counting buttons.** Five voters said partly. Level: none. Three voters gave none and two gave low. Each cell draws one button today, and the cell with a second button is a guess. The voters say to fix it when such a cell is planned.

### Dropped findings

None.
