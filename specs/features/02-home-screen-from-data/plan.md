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
