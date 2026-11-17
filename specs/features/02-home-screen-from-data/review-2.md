# Feature 2: Home screen and boards from data. Second review

This review looks at code practice, code quality and repeated code. The first review, in review.md, looked at behaviour. Its findings are fixed and are not repeated here.

## What I ran and what I only read

I ran `make check` with Node 22.23.5 on commit `b149661`. Lint, the format check, 103 unit tests, 106 end to end tests and the build all passed.

I read in full every source file under `src/app/boards`, `src/app/cells`, `src/app/keyboard`, `src/app/layout` and `src/app/theme`, the route and config files, `src/styles/cells.css` and `src/styles/glass.css`, and the three files under `e2e/support`. I read `e2e/boards.spec.ts`, `e2e/home.spec.ts` and `e2e/keyboard.spec.ts` in full. In `board-data.spec.ts`, `cell.spec.ts` and `e2e/shell.spec.ts` I read parts and searched the rest. I counted the repeats in finding 7 with grep.

I wrote no code for this review.

## Findings

### 1. Theme and Layout are the same stored setting written twice

Claim: the two services repeat the same code to read a value from local storage, check it against a list of names, fall back to a default and store a new value.

File and line: `src/app/layout/layout.ts` lines 30 to 53, and `src/app/theme/theme.ts` lines 29 to 57.

Case: the two `readStored` methods differ only in the key. The two `set` methods differ only in the key and in one call. `isLayoutName` and `isThemeName` are the same function over two lists. Feature 8 adds the scan time and the voice with its rate, pitch and volume. Written this way that is five more copies of the try and catch blocks, and a fix to one, such as storage that throws on read, must be made in each.

Fix: add one small helper that takes a key, a check and a default, and gives `read()` and `write(value)`. Theme and Layout keep their signals and their own names, and Theme keeps the line that sets `data-theme`.

Level: medium.

### 2. The end to end tests keep their own copy of the board list

Claim: the ids, the titles and the fixed layouts of the boards are written by hand in the test helpers, and the number of boards is written in a unit test, so each new board needs the same fact typed in several places.

File and line: `e2e/support/boards.ts` lines 10 to 35, and `src/app/boards/board-data.spec.ts` line 273.

Case: adding the three keyboard boards on 2026-11-16 needed four new lines in `BOARDS`, two in `FIXED_LAYOUTS` and a change from 14 to 17 in case D7. A board left out of `BOARDS` is not an error. It only means that B3, B9, B10 and B11 skip that board without saying so. A title changed in `boards.json` and not in `BOARDS` fails every test that opens the board.

Fix: build `BOARDS` and `FIXED_LAYOUTS` in the helper from `src/data/boards.json`. Drop the count from D7, since the line after it already compares the boards reached with the boards loaded.

Level: low.

### 3. The loader reads the tiles and the boards with the same loop written twice

Claim: steps 1 and 2 of `loadBoards` are one loop copied, with the words tile and board swapped.

File and line: `src/app/boards/board-data.ts` lines 281 to 304 and lines 306 to 329.

Case: each loop checks that the input is a list, takes the id, skips an item with no id, skips a second item with the same id, reads the item, and files it or writes a fault. The first review's finding 4 had to change the wording of the duplicate warning in both loops. `loadBoards` is 113 lines long, and step 4 nests a callback in a callback in a loop.

Fix: add one function that takes the input, the file name, the noun and the reader, and gives the map of sound items and the set of ids seen. Move step 4's cell reader into a function of its own that returns a cell or a fault line, in the way `readTile` and `readBoardShell` do.

Level: low.

### 4. The action types are listed in four places, and a missing one fails without a sign

Claim: adding an action type means changing a type, a list, a map and a switch, and the compiler does not point at the one that was forgotten.

File and line: `src/app/boards/board-data.ts` lines 45 to 54 and line 150, and `src/app/boards/board-screen.ts` lines 57 to 91.

Case: `TileAction` is the union, `ACTION_TYPES` is the list for the check, `fields` names the extra field of three of them, and `onPress` has the switch. The `default` branch of `onPress` is there for a tile with no action, and it also catches any type that the switch does not name. Feature 5 adds an action that speaks the message. If its case is left out of `onPress`, the tile loads with no fault and a press does nothing. In the same switch the `type`, `backspace` and `clear` cases each end with the same `this.say(this.message.text())`.

Fix: derive `ACTION_TYPES` from one record that maps each type to its extra field or to none, and check it against `TileAction` with `satisfies`. In `onPress`, return early for a tile with no action and end the switch with a `never` check, so a new type does not compile until it has a case. Give the three message cases one shared ending.

Level: low.

### 5. Nothing checks that each icon name has a drawing

Claim: the icon names are a list in one file and the drawings are a switch in another, and no test ties them together.

File and line: `src/app/boards/board-data.ts` lines 19 to 38, and `src/app/cells/icon.ts` lines 17 to 119.

Case: a name added to `ICON_NAMES` with no `@case` passes the loader, raises no fault and draws an empty `svg`. On a bleed or a stage tile that is a cell with a label and no picture. Nothing in `cell.spec.ts` or the end to end tests goes over `ICON_NAMES`.

Fix: add one unit case that draws each name in `ICON_NAMES` and expects the `svg` to hold at least one shape.

Level: low.

### 6. The two contrast helpers repeat the canvas and the luminance code

Claim: the tests work out a contrast ratio in two places with the same steps, and resolve a CSS colour through a probe element in three.

File and line: `e2e/support/contrast.ts` lines 20 to 55, and `e2e/support/boards.ts` lines 151 to 229.

Case: `contrastRatio` and `readGlass` each make a one pixel canvas, paint colours on it and apply the same WCAG channel formula. `toRgb`, `resolve` inside `readGlass`, and `read` inside `resolveColours` each append a span, read its computed colour and remove it. These helpers decide whether the app meets 4.5 to 1, so a mistake in the formula that is fixed in one copy leaves the other tests passing on the wrong number.

Fix: keep one browser side function for the probe and one for the luminance, in one file, and pass it to each `evaluate` call. `contrastRatio` and `readGlass` keep their own rules about see-through colours.

Level: low.

### 7. The end to end specs repeat the same few steps, and one of them hides a race

Claim: five small patterns are written out again in each test that needs them, and the click helper does not wait for the next screen.

File and line: `e2e/keyboard.spec.ts` line 34, `e2e/boards.spec.ts` lines 57 to 62 and 192 to 198, `e2e/home.spec.ts` lines 29 to 36 and 60 to 66, and the lines counted below.

Case: these are the counts in `e2e/`.

- The stored layout argument, `stored === 'rows' ? { layout: stored } : {}`, is written 7 times.
- The check that boxes are the same size within 2px is written on 14 lines across the three spec files.
- The loop that presses Tab and reads the focused name is written in E4, B8 and Y8.
- The measurement of the page's scroll size is written in B9 and Y9.
- `await expect(page.locator('h1')).toHaveText(...)` is written 37 times.

The race is in `press` in `keyboard.spec.ts`. It clicks and returns at once. Cases Y12 and Y13 failed on their first runs on 2026-11-16, because they measured the page before the new board was drawn. Each was fixed by adding a wait for the title by hand, and the next test that clicks and then measures will meet the same fault.

Fix: add helpers to `e2e/support/boards.ts`: one that gives the stored layout argument, one that checks boxes for the same size, one that checks a Tab order, one that reads the scroll size, and one that presses a cell that opens a board and waits for its title.

Level: low.

### 8. The four keyboard boards repeat their top row and their bottom row in the data

Claim: `boards.json` writes the same two groups out in each keyboard board, so a change to either row is four edits.

File and line: `src/data/boards.json`, in the boards `keyboard`, `keyboard-abc`, `keyboard-vowels` and `keyboard-numbers`.

Case: each of the four boards starts with Back at size 1 and the message at size 9. Three of them end with 123, Space and Clear at sizes 2, 6 and 2, and the fourth differs by one key. Feature 5 makes the message speak and feature 7 adds a row of suggested words, and both will touch these rows. Cases D11, D14 and D15 guard the top row today by comparing it with the QWERTY board, and no check fails if the bottom rows drift apart by design.

Fix: this needs a decision from the user, because it changes the data format. One way is to let a board name a shared group by id, with the shared groups listed once. The other is to leave the data as it is and accept the four edits, since the tests catch a top row that differs.

Level: low.

## Votes

Tallied on 2026-11-16. Five voters checked each finding against the code. None of them ran the tests.

### Kept, in order

1. **Finding 4. The action types are listed in four places, and a missing one fails without a sign.** One voted valid and four voted partly. Level: low. The voters said the `never` check and the early return are cheap and worth having, and that building the list from one record is more than the app needs. One correction: the loader does refuse a type that is missing from `ACTION_TYPES`. Only a type that is in the list and has no case in `onPress` fails without a sign.
2. **Finding 5. Nothing checks that each icon name has a drawing.** Five voted valid. Level: low. Two voters called it the best value of the eight, because it is one test and the fault is a cell with no picture.
3. **Finding 1. Theme and Layout are the same stored setting written twice.** Five voted valid. Level: low. All five gave low, against the reviewer's medium. Two copies are cheap today, and the helper pays off when feature 8 adds more settings.
4. **Finding 7. The end to end specs repeat the same few steps, and one of them hides a race.** Five voted partly. Level: low. The voters said the click helper that waits for the title is the part worth doing, and the rest is harmless test code. One correction: the scroll size is also measured in `e2e/shell.spec.ts` at line 122, so it is written three times. Three voters counted fewer than 7 uses of the stored layout argument. The count of 7 is right. Five lines spell it with `stored` and two spell it with `layout`, at `home.spec.ts` line 60 and `boards.spec.ts` line 192.
5. **Finding 3. The loader reads the tiles and the boards with the same loop written twice.** Five voted valid. Level: low. One voter measured `loadBoards` at 112 lines. One said a level of none could also be argued, because the code is stable and covered by tests.
6. **Finding 2. The end to end tests keep their own copy of the board list.** Five voted valid. Level: low. One voter noted that a list typed by hand is also a second check on the data. Two could not confirm that a board left out of `BOARDS` is skipped without a sign.
7. **Finding 6. The two contrast helpers repeat the canvas and the luminance code.** One voted valid and four voted partly. Level: low. The voters said the fix costs more than the review suggests, because the code runs inside `page.evaluate` and cannot be shared by a plain import.
8. **Finding 8. The four keyboard boards repeat their top row and their bottom row in the data.** Two voted valid and three voted partly. Level: none. The voters confirmed the repeat and said a shared group would add more to the loader than it saves at this stage.

### Dropped

None.
