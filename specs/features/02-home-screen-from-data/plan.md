# Feature 2: Home screen and boards from data. Plan

The steps run in order. Each step names the files it creates or changes.

## Step 1. Add the symbols

- Creates `public/symbols/` with one SVG file for each symbol cell. The twelve Needs symbols are copied from `context/design/mockups/needs/symbols/`. The others are taken from the Mulberry Symbols set and are not changed apart from their names.
- Creates `public/symbols/ATTRIBUTION.txt`. It carries the credit and the licence, and it lists each file with its original Mulberry name.
- If no Mulberry symbol fits a cell, stop and ask the user.

## Step 2. Add the data files

- Creates `src/data/cells.json` with the home tiles of requirement 31, the Back tile of requirement 32, the Needs tiles from the mockup, the tiles of requirement 24 with their phrases, and the message tile and the keys of requirements 44 to 48.
- Creates `src/data/boards.json` with the fourteen boards: `home`, `needs`, `quick-phrases`, `my-boards`, `food`, `drinks`, `feelings`, `people`, `places`, `activities`, `yes-no`, `core-words`, `keyboard` and `keyboard-numbers`.
- Changes `tsconfig.json` if JSON imports need to be turned on.

## Step 3. Add the board data loader

- Creates `src/app/boards/board-data.ts`. It holds the types for a tile, a cell, a group and a board. It holds a function that takes the contents of the two files, checks them against requirements 16 to 30 and 42 to 46, and returns the boards with each cell joined to its tile. When the data breaks a rule it skips the faulty cell, tile or board, as requirement 36 says, and returns the list of faults with the boards. Each fault names what was skipped and why. It also holds a service that reads the two built in files once, writes each fault to the console as a warning, and gives a board by its id.
- Creates `src/app/boards/board-data.spec.ts`.

## Step 4. Add the layout service

- Creates `src/app/layout/layout.ts`. It follows the theme service. It reads `symple.layout`, falls back to `columns`, and stores a new value when one is set.
- Creates `src/app/layout/layout.spec.ts`.
- Changes `src/app/app.config.ts` so that the layout is read before the first screen is drawn.

## Step 5. Add the message

- Creates `src/app/keyboard/message.ts` and `message.spec.ts`. The service holds the message and the caps lock state. It adds text, removes the last character, empties the message and turns caps lock on and off.

## Step 6. Add the cell

- Creates `src/app/cells/icon.ts`. It draws one of the eighteen line icons by name. Four are copied from `context/design/home.html` and two from the keyboard mockup. Back, trash, check and cross are drawn new in the same style. The other eight are outlined Material icons. The icon is hidden from screen readers.
- Creates `src/app/cells/cell.ts`, `cell.html`, `cell.css` and `cell.spec.ts`. The cell is a button. Its name is the tile's `name`, or its label when it has no name. It takes its colour, hue and style classes from the tile. A symbol cell shows the symbol file as an image with empty alt text. A key cell shows its label or its icon, and a letter key shows a capital while caps lock is on. A message cell shows the message and a caret. The cell reports a press to its screen.
- Changes `src/styles/cells.css` to add the cell colour `ink`, which uses `--ink` as the fill and `--light` for the label and the icon disc.
- The bleed and signage rules are copied from the home mockup, with the glass fill, the rim, the shadows and the outline on hover and on focus. The symbol rules are copied from the Needs mockup, with the white plate. The dark picked look is left out. The key and message rules are copied from the keyboard mockup. The rules for `big`, `short`, `g1`, `g2`, `w2` and `w6` are left out, and the label and the icon are sized from the cell's own box.
- If `cell.css` goes over the 4kB style budget in `angular.json`, the rules move to a new file `src/styles/cell.css` that `src/styles.css` imports.

## Step 7. Add the board screen

- Creates `src/app/boards/board-screen.ts`, `board-screen.html`, `board-screen.css` and `board-screen.spec.ts`. The screen draws one board: one element for each group and one cell for each entry, in the order of the data. The grid carries `data-layout`, which is the board's own layout when it gives one and the stored layout when it does not. Each cell takes its share of the group from its size. One gap size, `--gap`, is used between groups and between cells.
- A press on a tile that opens a board goes to that board. A press on the Back tile goes to the previous screen. A press on a tile that speaks writes the phrase to a status region that only screen readers see. A press on a tile whose action type is `type`, `backspace`, `clear` or `caps` changes the message through the message service, and the new message is written to the status region. A press on any other tile does nothing.
- Deletes `src/app/home/home.ts`. The home screen is the board screen with the `home` board.
- Changes `src/app/app.routes.ts`. The empty path shows the `home` board, and `board/:id` shows the named board. The route title comes from the board's title. An unknown id or path goes to home.

## Step 8. Add the way back

- Creates `src/app/boards/back.ts` and `back.spec.ts`. It keeps the list of screens opened in this session and goes back one step, or to home when the list is empty. The board screen calls it when the Back tile is pressed.

## Step 9. Write the end to end tests

- Creates `e2e/home.spec.ts`, `e2e/boards.spec.ts` and `e2e/keyboard.spec.ts` with the cases in validation.md.
- Changes `e2e/shell.spec.ts`. Feature 1's case E6 is removed, because case E4 replaces it.
- Changes `specs/features/01-app-shell-and-themes/validation.md` to note that E6 was replaced by feature 2.

## Step 10. Update the docs

- Changes `specs/tech-stack.md`. The scan order rule now says that a group of cells is a column or a row, that a stored setting picks which, that columns are the default, and that a board can fix its own layout, as the keyboard does. The Data section gains the paths of the data files and the symbols.
- Changes `CLAUDE.md`. The scan order rule gets the same wording.
- Changes `specs/roadmap.md`. Feature 8 gains the layout picker and the visible Mulberry credit. Feature 9 gains the Add button for an empty board and an empty group. Feature 10 gains an open question on whether the symbol images load in the packaged Mac app. The decisions of 2026-11-16 gain the items of requirements 13 to 23 and 40.
- Changes `README.md` to credit the Mulberry symbols and name their licence.

## Step 11. Run everything

Run `make check` and fix what fails.

## Steps added by the review on 2026-11-16

The numbers in brackets are the findings in review.md.

### Step 12. Make a second press of Back harmless (1)

- Changes `src/app/boards/back.ts`. `back()` no longer removes the current screen from the list. It goes to the screen before the current one, or to home when there is none. The list is still cut back when the navigation ends.
- Changes `src/app/boards/back.spec.ts` to add case K6.

### Step 13. Stop the symbol image from being dragged (2)

- Changes `src/app/cells/cell.html` to set `draggable="false"` on the symbol image.
- Changes `src/app/cells/cell.css` to set `pointer-events: none` on `.plate img`, so the press always reaches the button.
- Changes `e2e/boards.spec.ts` to add case B17.

### Step 14. Tell screen readers a repeated phrase (3)

- Changes `src/app/boards/board-screen.ts` and `board-screen.html`. Each press that writes to the status region gets a new number, and the region draws its text again for each number, so the same text twice changes the page twice.
- Changes `src/app/boards/board-screen.spec.ts` to add case S17.

### Step 15. Correct the warning for an id that is used twice (4)

- Changes `src/app/boards/board-data.ts`. The warning for a second tile or board says that the id is already used by an earlier one. It no longer says that the first is kept. Which items are kept does not change.
- Changes `src/app/boards/board-data.spec.ts` to add case R28.

### Step 16. Ship the licence of the Material icons (5)

- Creates `public/licenses/material-icons.txt`. It holds the credit to Google, the source, and the full text of the Apache License 2.0.
- Changes `README.md` to name that file.
- Changes `specs/roadmap.md`. The feature 8 line gains the credit for the Material icons next to the Mulberry credit.
- Changes `e2e/boards.spec.ts` to add case B18.

### Step 17. Bring the counts in the feature files up to date (6)

- Changes step 2 of this file to say fourteen boards and to add `yes-no` and `core-words` to the list.
- Changes step 6 of this file to say eighteen line icons, with the sources that the comment in `src/app/cells/icon.ts` gives.
- Changes `validation.md`. "Every board" means home and the thirteen other boards.

### Step 18. Run everything again

Run `make check` and fix what fails.

## Steps added with the keyboard list on 2026-11-16

### Step 19. Add the list of keyboards and two more keyboards (54, 55, 56, 57)

- Changes `src/data/cells.json`. The Keyboards tile opens `keyboards`. The tiles `keyboard-qwerty`, `keyboard-abc` and `keyboard-vowels` are added. The ABC key of the numbers board takes the `back` action.
- Changes `src/data/boards.json`. The boards `keyboards`, `keyboard-abc` and `keyboard-vowels` are added, which makes seventeen boards. The title of `keyboard` becomes "QWERTY keyboard".
- Changes `src/app/boards/board-data.spec.ts` to add cases D13 to D15 and to bring D2, D7, D8, D9 and D11 up to date.
- Changes `e2e/keyboard.spec.ts` to add cases Y12 to Y14 and to bring Y1, Y6 and Y11 up to date. Changes `e2e/home.spec.ts` for case E8 and `e2e/support/boards.ts` for the list of boards.
- No code outside the tests changes.

### Step 20. Give each board cells of its own

- Changes `src/app/boards/board-screen.html`. The groups and the cells are tracked as themselves. The old key was built from the board id, and it read the new id for the old groups too, so a move between two boards reused the old cells. The reused cells faded from the old tile's colours to the new ones and showed the old symbols until the new ones loaded.
- Changes `src/app/boards/board-screen.spec.ts` to add case S18.

## Steps added by the second review on 2026-11-16

The numbers in brackets are the findings in review-2.md.

### Step 21. Cut the board list of the end to end tests to one board of each kind (2)

- Changes `e2e/support/boards.ts`. `BOARDS` holds seven sample boards and `FIXED_LAYOUTS` holds the three of them that fix a layout. The user chose this over building the list from `boards.json`.
- Changes `e2e/boards.spec.ts` to name the sample boards in the titles of B3, B9 and B11.
- Changes `validation.md` to say what "Every board" means in the end to end cases.
- The cases B3, B9, B10 and B11 no longer open the six topic boards, Quick phrases, the list of keyboards, the ABC keyboard or the numbers board. A label that is cut off on one of those is no longer caught by a test.

### Step 22. Make a new action type fail to compile until it has a case (4)

- Changes `src/app/boards/board-screen.ts`. `onPress` returns early for a tile with no action, and its switch ends with a `never` check. The three cases that change the message share one ending. The list of types in `board-data.ts` stays as it is, as the voters advised.

### Step 23. Check that each icon name has a drawing (5)

- Creates `src/app/cells/icon.spec.ts` with case I1.

### Step 24. Wait for the next board after a press that opens one (7)

- Changes `e2e/support/boards.ts` to add `pressTo`, which presses a cell and waits for the title of the board it opens.
- Changes `e2e/keyboard.spec.ts` to use it for each press that opens a board. The other repeats of finding 7 stay as they are.

### Not taken from the second review

Findings 1, 3, 6 and 8 are left. Finding 1 is to be done at the start of feature 8, when more stored settings arrive.
