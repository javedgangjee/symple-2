# Feature 23: Symbols and icons for a tile. Validation

The numbers in brackets are the items in requirements.md that a check covers. Unless a case says otherwise, the selection mode is `scan`, the theme is `blue`, nothing is stored for the boards, and the board on show is Needs. "The set" is every board and every tile together. "The tile dialog" is the dialog that adds or edits a cell, and "the Picture field" is its field that holds the choice of Symbols or Icons, the box "Find a picture" and the list.

## Automated checks

### A1. Build (16)

Command: `npm run build`

- The build ends with no errors and no warnings. The first download stays inside the budget of `angular.json`, which warns at 1 MB.
- The output lists `symbols.json` and `lucide.json` in lazy chunks and not in the first download.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. The pictures and their lists (6, 9 to 12)

Command: `node scripts/check-pictures.mjs`

| Case | Input | Expected result |
| --- | --- | --- |
| PC1 | `src/data/symbols.json` and `public/symbols/`. | The list holds 3,437 symbols. Each one names a file that is in the folder, and each `.svg` file of the folder is in the list once. |
| PC2 | The file names of the list. | Each one is made of lower case letters, digits and hyphens and ends in `.svg`. |
| PC3 | The 99 symbols that the list held before this feature. | Each one is still in the list with the same file and the same name, and its file has not changed. |
| PC4 | `public/symbols/ATTRIBUTION.txt`. | It gives an original name for each of the 3,436 Mulberry files, and it says that `stop.svg` was drawn for Symple. |
| PC5 | `src/data/lucide.json` and the package `lucide-static`. | The file holds each of the 2,098 icons of version 1.77.0 with the shapes of the package. |
| PC6 | The names of the list. This case comes from finding 2 of the review, which says three pairs of symbols share the names "drink", "hot" and "open". | No two symbols have the same name without regard to case. `drink-2.svg` is named "drink 2", `hot-2.svg` is named "hot 2" and `open-3.svg` is named "open 3". |
| PC7 | `public/licenses/mulberry.txt` and `public/licenses/lucide.txt`. This case comes from finding 3 of the review, which says the licence notes that ship with the app do not match the new sets. | `mulberry.txt` is the `LICENSE.txt` of the Mulberry release: it names the Mulberry Symbol set, Steve Lee and the Creative Commons Attribution-Share Alike licence, and it links to CC BY-SA 4.0. `lucide.txt` says the app holds every icon of Lucide 1.77.0 from the package `lucide-static`, it no longer lists a few icons as the ones copied, and it still holds the ISC License. |

### A4. Unit tests (1, 2, 5, 13 to 15, 17 to 22)

Command: `npm test`

The loader, in `src/app/boards/board-data.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| LI1 | A tile has the icon `lucide:apple`. | The tile is read with that icon. |
| LI2 | Three tiles have the icons `lucide:`, `lucide:Apple` and `apple`. | Each is skipped with a line that names its icon. |
| LI3 | A tile has the icon `heart`. | The tile is read, as it is today. |
| LI4 | A `symbol` tile names the icon `lucide:apple` and no symbol. | The tile is read. |
| LI5 | A `symbol` tile names no symbol and no icon. | The tile is skipped with a line that says a symbol tile must name a symbol or an icon. |
| LI6 | A tile that opens a board has the style `symbol` and the symbol `dog.svg`. | The tile is read. |

The icon, in `icon-set.spec.ts` and `icon.spec.ts` of `src/app/cells/`:

| Case | Input | Expected result |
| --- | --- | --- |
| IC1 | The icon `heart` is drawn, and the Lucide set was never fetched. | The drawing is the one of today, and nothing is fetched. |
| IC2 | The icon `lucide:apple` is drawn. | The set is fetched once, and the icon holds the shapes that `lucide.json` gives for `apple`. |
| IC3 | Two icons with `lucide:` names are drawn one after the other. | The set is fetched once. |
| IC4 | The icon `lucide:no-such-icon` is drawn. | The icon is empty, and nothing is thrown. |
| IC5 | The icon `lucide:group` and the icon `group` are drawn. | The first has the shapes of the Lucide icon `group`, and the second has the drawing of today. |
| IC6 | An icon is drawn whose shapes are a path, a circle, a rect, a line, an ellipse, a polyline and a polygon. | The icon holds one element of each kind with its attributes. |
| IC7 | The icon `lucide:apple` is drawn, and the first read of the set fails. Time passes, and the next read succeeds. This case comes from finding 1 of the review, which says a cell already on screen never gets its icon back after a failed read of the Lucide set. | The icon is empty after the failed read, and the set is not read again for one second. Then the set is read a second time, and the icon already drawn holds the shapes of `apple`, with no new icon made. |

The cell, in `src/app/cells/cell.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| CE1 | A `symbol` tile has the icon `lucide:apple` and no symbol. | The plate holds the icon and no image, and the label is shown. |
| CE2 | A `symbol` tile has the symbol `dog.svg`. | The plate holds the image `symbols/dog.svg`, as today. |

The edits, in `src/app/edit/board-edits.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| PE1 | A cell that speaks is added with the symbol `advent-calendar.svg`. | Its tile has the style `symbol` and that symbol, and no icon. |
| PE2 | A cell that speaks is added with the icon `lucide:apple`. | Its tile has the style `symbol` and that icon, and no symbol. |
| PE3 | A cell that speaks is added with no picture. | Its tile has the style `key`, and no symbol and no icon. |
| PE4 | A board is added with the symbol `dog.svg`. | The cell that opens it has the style `symbol` and that symbol, and no icon. |
| PE5 | A board is added with the Stage style and the icon `lucide:house`. | The cell that opens it has the style `stage` and that icon. |
| PE6 | The picture of Help, which has a symbol, is set to the icon `lucide:apple`. | The tile has that icon and no symbol, and keeps its id, its phrase and its colour. |
| PE7 | The cell on home that opens Needs, which has the Bleed style and the icon `heart`, gets the symbol `dog.svg`, and then the icon `lucide:house` with the Signage style. | The tile has the style `symbol` and the symbol, and then the style `signage` and the icon, with no symbol. |
| PE8 | The label of a `key` tile that speaks and shows the icon `check` is edited, and the picture is left alone. | The tile keeps its style and its icon. |
| PE9 | `fieldsOf` reads a tile with a symbol, a tile with the icon `lucide:apple`, a tile with the icon `heart` and a tile with no picture. | The picture is the symbol, the icon, the icon and nothing. |
| PE10 | Each set that cases PE1 to PE8 produce is given to `loadBoards`. | No fault is reported. |

The search, in `src/app/edit/picture-search.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| PS1 | The names are "hot dog", "dog", "dog basket" and "cat", and the text is "dog". | The matches are "dog", "dog basket" and "hot dog", in that order. |
| PS2 | The same names, and the text is " DOG ". | The matches are the ones of case PS1, which searches for "dog". |
| PS3 | The names are "apple juice", "juice" and "apple", and the text is "juice apple". | The only match is "apple juice". |
| PS4 | The same names, and the text is empty. | Every name matches, in the order of the alphabet. |
| PS5 | The same names, and the text is "zebra". | Nothing matches. |
| PS6 | The 3,437 names of `symbols.json`, and the text is "advent". | The matches include "Advent" and "Advent calendar", and "Advent" is first. |

The lists of names, in `src/app/edit/picture-list.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| PL1 | The lists are asked for twice. | Each file is fetched once. |
| PL2 | The list of icons is read. | It holds 2,098 icons, and the icon `arrow-down` has the name "arrow down". |

The tile dialog, in `src/app/edit/tile-dialog.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| TD3 | Add Tile is pressed, and "dog" is typed in "Find a picture". This replaces case TD3 of feature 9, which filtered the 99 symbols. | Symbols is chosen. Every picture in the list has "dog" in its name, and the first is "dog". |
| TD6 | Add Board is pressed. This replaces case TD6 of feature 9, which listed 12 icons. | A dialog named "Add Board" shows Name, Style, Colour and Picture. Style is a drop down named by its label "Style", and its options read "Cropped Icon", "Icon in Circle" and "Centered Icon", with Cropped Icon chosen. The user changed the Style control from three boxes to a drop down on 2026-11-24. Icons is chosen, and the first picture in the list is "Grid", which is chosen. |
| TD7 | "Edit Help" is pressed. This replaces case TD7 of feature 9. | The dialog is filled in with the label, the phrase and the colour of Help. Symbols is chosen, and the first picture in the list is "help", which is chosen. It has no choice of type. |
| TD9 | Add Tile is pressed with an empty box. | The list holds "No picture" and 60 symbols, and Show more is on show. No line counts the pictures, and the box is named "Find a picture" with no row for its name. The user removed that row and the line that counts on 2026-11-24. |
| TD10 | After case TD9, Show more is pressed. | The list holds 120 symbols. |
| TD11 | "advent" is typed. | The list holds the matches, which are fewer than 60, and Show more is not on show. |
| TD12 | "apple" is typed, and Icons is chosen. | The box still holds "apple", the list holds the icon "apple", and the two choices read "Symbols" and "Icons" with no number. The user removed the numbers on 2026-11-24. |
| TD13 | The icon "apple" is picked in Add Tile. | The preview draws the icon on the plate, and Add emits the icon `lucide:apple`. |
| TD14 | In Add Board, Symbols is chosen and "dog" is picked. | The Style field is gone, the preview draws the symbol, and Add emits the symbol `dog.svg`. |
| TD15 | In Add Board, Icons is chosen again after case TD14. | The Style field is back. |
| TD16 | "Edit Help" is pressed, and "zebra crossing sign" is typed, a text that no symbol name holds. | The list holds "No picture" and "help", which is chosen, and a note at the end of the list says that no symbol has that name. |
| TD17 | Add Tile is pressed, and "No picture" is picked after a symbol was picked. | The preview shows the label alone, and Add emits no picture. |
| TD18 | Enter is pressed in "Find a picture". | The dialog stays open, and nothing is emitted. |

### A5. End to end tests (1 to 5, 15)

Command: `npm run e2e`

The cases are in `e2e/editing.spec.ts`. The cases of feature 9 in that file still pass, with their helper changed to use "Find a picture".

| Case | Input | Expected result |
| --- | --- | --- |
| PI1 | In edit mode, Add Tile is pressed, the label "Advent" is typed, "advent calendar" is typed in "Find a picture", "Advent calendar" is picked and Add is pressed. Done is pressed, and the page is reloaded. | Needs holds a cell "Advent" whose image is `symbols/advent-calendar.svg`, and the image has loaded. |
| PI2 | Add Tile is pressed, the label "Apple" is typed, Icons is chosen, "apple" is typed, "apple" is picked and Add is pressed. Done is pressed, and the page is reloaded. | Needs holds a cell "Apple" that draws an icon with at least one shape, and no image. |
| PI3 | After case PI2, the scan runs on Needs. | The scan reaches "Apple", a pick speaks "Apple", and the scan never lands on an edit control. |
| PI4 | On home, Add Board is pressed, the name "Pets" is typed, Symbols is chosen, "dog" is picked and Add is pressed. Done is pressed, and Pets is picked by scan. | The cell "Pets" shows the image `symbols/dog.svg`, and the board Pets is on show. |
| PI5 | On home, the cell that opens Needs is edited, "house" is typed in "Find a picture", the icon "house" is picked and Save is pressed. The page is reloaded. | The cell Needs draws an icon with at least one shape and keeps its Bleed style. |
| PI6 | Add Tile is pressed with an empty box, and Show more is pressed twice. | The list holds 180 symbols, and each image that is in view has loaded. |
| PI7 | The page is loaded on home with nothing stored. | No request is made for `lucide.json` or `symbols.json`, in any chunk. |
| PI8 | The tile dialog is open with the Picture field on Symbols and then on Icons, in each of the five themes. | axe reports no WCAG 2.2 Level AA violation. |
| PI9 | The tile dialog is open with the Picture field on Icons. | Each control of the Picture field is at least 48px high and wide, and each name in the list keeps 4.5 to 1. |
| PI10 | The tile dialog is open, and only the keyboard is used. Tab goes from the label to the phrase and the colour, then to the choice of Symbols or Icons, to the box, to the list and to Show more, and the arrow keys move in the list. Tab goes on to Cancel and Add and back to the label. The user changed the layout on 2026-11-24, so the colour now comes before the Picture field. | The focus is always on show, the picked picture changes with the arrow keys, and Tab never leaves the dialog. |
