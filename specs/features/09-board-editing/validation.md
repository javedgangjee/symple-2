# Feature 9: Board editing. Validation

The numbers in brackets are the items in requirements.md that a check covers. Unless a case says otherwise, the selection mode is `scan`, the theme is `blue`, nothing is stored for the boards, and the board on show is Needs, which has three columns and whose first cell is Back. "The set" is every board and every tile together. "The tile dialog" is the dialog that adds or edits a cell.

## Automated checks

### A1. Build

Command: `npm run build`

- The build ends with no errors and no warnings.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. Unit tests (1 to 6, 8, 11 to 13, 15, 16, 18 to 39)

Command: `npm test`

The stored set, in `src/app/boards/board-store.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| BS1 | Nothing is stored. | The set is the built-in files, and nothing is written. |
| BS2 | A set is saved. | `symple.tiles` and `symple.boards` hold it as JSON text, and the signal gives it. |
| BS3 | `symple.boards` holds a text that is not JSON. | The set is the built-in files, and the stored text is left as it is. |
| BS4 | Writing storage throws, and a set is saved. | The set is used, and nothing is thrown. |
| BS5 | A set is stored, and the store is told to forget it. | Both keys are removed, and the set is the built-in files. |

The boards, in `src/app/boards/board-data.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| BD1 | The store holds a set in which Needs is titled "Care". | The board Needs has the title "Care". |
| BD2 | The set changes after the boards were read. | The board that a screen holds changes with it. |
| BD3 | A board carries `locked: true`, and a second board carries `locked: "yes"`. | The first is read as locked. The second is skipped with a line that names the field. |

The changes to a set, in `src/app/edit/board-edits.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| BE1 | A cell that speaks, with the label "Juice", the phrase "I want juice" and the symbol `drink.svg`, is added to Needs. | The set has one new tile with those values, and the new cell is the last cell of the group of Needs with the fewest cells. |
| BE2 | Two groups of a board tie for the fewest cells, and a cell is added. | The first of the two gets it. |
| BE3 | A cell is added with a group named. | It is the last cell of that group. |
| BE4 | A cell is added with no phrase and no symbol. | Its tile speaks its label and has the `key` style. |
| BE5 | The label of a cell is edited, and no other cell uses its tile. | The tile has the new label and keeps its id. |
| BE6 | The label of a cell is edited, and a second cell uses the same tile. | The edited cell has a new tile with the new label, and the second cell is unchanged. |
| BE7 | A cell that opens the board Food is renamed "Meals". | The tile reads "Meals", and the board Food has the title "Meals". |
| BE8 | A cell that speaks is removed. | The cell is gone, and so is its tile, which no cell uses. |
| BE9 | The cell that opens My boards is removed from home. | The cell and its tile are gone. My boards and the eight boards it opens stay in the set, with their tiles. |
| BE10 | The cell that opens Keyboards, a locked board, is removed from home. | The cell and its tile are gone. Keyboards and the four keyboards stay in the set, with their tiles. |
| BE11 | The Back cell of Needs is removed, and in a second run edited. | The set does not change in either run. |
| BE12 | The second cell of the first group moves to the first place of the third group. | It is there, and the cells of both groups keep their order otherwise. |
| BE13 | A cell moves to the place of a cell in a group that is marked as having no room. | The two cells trade places. |
| BE14 | A group is added to a board. | The board has one more group, which is empty and last. |
| BE15 | An empty group is removed, and in a second run the only group of a board. | The first run removes it. The second changes nothing. |
| BE16 | A board named "Outings" is added from home with the Stage style, the Grey colour and the `place` icon. | The set has a new board with that title, three groups and a Back cell first. Home has a new cell that opens it with that style, colour and icon, and with the hue `c3` of the Grey swatch. |
| BE17 | The title of Needs is set to "Care" and its layout to rows. | The board has that title and that layout, and the cell on home that opens it reads "Care". |
| BE18 | Each set that cases BE1 to BE17 produce is given to `loadBoards`. | No fault is reported. |
| BE19 | A cell is added in each of the four colours of the tile dialog, and the colour of Help is set to Grey and then to Dark. | The Soft tile has the hue `c2` and the Grey tile the hue `c3`, which are the red and the green of their swatches in the Colours theme. The Dark and the White tile have no hue. Help has the hue `c3` and then none. |

Edit mode and the board behind it, in `edit-mode.spec.ts` of `src/app/edit/` and in `scan.spec.ts`, `switches.spec.ts`, `dwell.spec.ts` of `src/app/scan/`:

| Case | Input | Expected result |
| --- | --- | --- |
| EM1 | The scan highlights the second group, and edit mode turns on. | The scan is at rest, and it stays at rest after ten scan times. |
| EM2 | Edit mode is on, and Tab and then Enter are pressed. | The scan does not move, nothing is picked, and neither key has its default action stopped. |
| EM3 | The mode is `dwell`, a dwell runs on a cell, and edit mode turns on. | The dwell is dropped, and no cell is pressed after the dwell time. |
| EM4 | Edit mode turns off, and Enter is pressed. | The scan starts at the first group. |
| EM5 | A change is told in edit mode, edit mode turns off, and it turns on again. This covers finding 7 of review.md, the status line that repeats an old change. | The status text is empty. |

The board screen in edit mode, in `src/app/boards/board-screen.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| ES1 | Edit mode turns on over Needs. | Each cell but Back has buttons named "Edit" and "Remove" with its label, such as "Edit Help". No cell can be pressed or takes the focus. |
| ES2 | Edit mode is off. | The screen has no edit button. |
| ES3 | Edit mode is on over home. | The cell My boards has a button named "Open My boards", and a press on it opens that board with edit mode still on. |
| ES4 | Edit mode is on over Needs. | The Back cell has "Go back", and no Edit or Remove button. |
| ES5 | "Remove Help" is pressed. | Help is gone, the status line reads "Help removed", and the focus is on the Remove button of the next cell. |
| ES6 | Edit mode is on over home. | The cell Keyboards, which opens a locked board, has "Edit Keyboards", "Open Keyboards" and "Remove Keyboards". |
| ES7 | A board has an empty group, and edit mode is off. | The group shows a button named "Add Tile" that carries `data-caregiver-control` and is not a tab stop. A press turns edit mode on and opens the tile dialog. |
| ES8 | Edit mode is on, and a group is empty. | The group shows "Add Tile" and "Remove column". |
| ES9 | A press on Help, and then a press on Pain. | Help takes the place of Pain, the slot of Help carried `data-picked` in between, the status line tells the new place, and the focus is on "Edit Help". |
| ES10 | A press on Help, and then Escape. | Help stays where it was, and nothing is picked up. |
| ES13 | The board has the rows layout and edit mode is on. | The button beside the grid is named "Add row", and an empty group reads "Remove row". |
| ES14 | Needs is on show, and a set that lacks the board Needs is saved, as a sync from another device can do. This covers finding 1 of review.md, the empty screen with no Back cell. | The set has no board Needs, and home is on show. |
| ES18 | "Remove Needs" is pressed on home. | No dialog opens. The cell Needs is gone, the status line reads "Needs removed", and the board Needs is still in the set. |
| ES15 | The mode is `step`, the scan highlights the first group of Needs, and the board Food is renamed in the set. This covers finding 3 of review.md, the scan that goes to rest on any change of the set. | The scan still highlights the first group. |
| ES16 | Needs has an empty fourth column. A press on Help, and then on Add Tile of the fourth column. This covers finding 6 of review.md, the picked cell that moves when Add Tile is pressed. | Help stays in the first column, the fourth column stays empty, and the tile dialog is open for the fourth column. |
| ES17 | Edit mode is on over home, and "Open Keyboards" is pressed. | The Keyboards list opens, and edit mode is off once that locked board is on show. |

ES11 and ES12 tested the arrow keys on the Move button of a cell. They were removed with the button on 2026-11-23.

The footer, in `src/app/edit/edit-actions.spec.ts` and `src/app/shell/footer.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| EA1 | Edit mode is off. | The footer holds no button. |
| EA2 | Edit mode is on. | The footer holds Add Board, Add Tile, Configure Board and Done, in that order. |
| EA3 | Done is pressed. | Edit mode is off. |
| EA4 | Add column, the button beside the grid, is pressed. This case and cases EA6 and EA7 are in `board-screen.spec.ts`. | The board has one more group, the status line reads "Column 4 added", and the footer holds no Add column button. |
| EA6 | The board has no room for a group. | Add column carries `aria-disabled="true"` and is described by a line that says the board has no room for another column. A press changes nothing. |
| EA7 | Edit mode is off. | The screen has no Add column button. |
| EA5 | No group has room for a cell. | Add Tile and Add Board carry `aria-disabled="true"` and are described by a line that says every column is full. A press changes nothing. |

The settings panel and the header, in `settings-panel.spec.ts` and `header.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| PA23 | The panel opens. | It has six tabs, Boards is the first, and Boards is chosen. |
| PA24 | Edit boards is pressed over Needs. | The panel is closed, and edit mode is on. |
| PA25 | Edit boards is pressed over the QWERTY keyboard, a locked board. | The panel is closed, home is on show, and edit mode is on. |
| H5 | Edit mode is on. | The header shows no settings button. |

The dialogs, in `tile-dialog.spec.ts` and `board-dialog.spec.ts` of `src/app/edit/`:

| Case | Input | Expected result |
| --- | --- | --- |
| TD1 | Add Tile is pressed. | A dialog named "Add Tile" shows Label, Phrase, Symbol and Colour, with a preview. |
| TD2 | The label "Juice" is typed. | The preview reads "Juice". |
| TD3 | "dri" is typed in the box that filters the symbols. | The list holds only the symbols whose name has "dri" in it. |
| TD4 | Add is pressed with an empty label. | The dialog stays open, the Label field is marked invalid, and a line says that a label is needed. |
| TD5 | A label of 25 characters is typed. | The field holds the first 24. |
| TD6 | Add Board is pressed. | A dialog named "Add Board" shows Name, Style, Colour and Icon. The icons do not include back, backspace, caps, trash, check or cross. |
| TD7 | "Edit Help" is pressed. | The dialog is named "Edit Help" and is filled in with the label, the phrase, the symbol and the colour of Help. It has no choice of type. |
| TD8 | Cancel is pressed, and in a second run Escape. | The dialog is closed each time, the set did not change, and the focus is back on the button that opened the dialog. |
| BG1 | Configure Board is pressed over Needs. | A dialog shows the title "Needs" and the layout Columns as chosen. |
| BG2 | Rows is chosen and Save is pressed. | The board has the rows layout, and the grid carries `data-layout="rows"`. |

RD1, RD2 and RD3 tested the dialog that asked before a cell took boards with it. They were removed with the dialog on 2026-11-23, when Remove was changed to take away only the cell.

Dragging and room, in `drag.spec.ts` and `room.spec.ts` of `src/app/edit/`:

| Case | Input | Expected result |
| --- | --- | --- |
| DR1 | The pointer goes down on a cell and moves 2px. | Nothing is dragged, and the release is a press. |
| DR2 | The pointer goes down on a cell and moves over the middle of the third group, above the middle of its first cell. | The place is the third group, first place. |
| DR3 | The pointer is over a group with no room. | The place is the cell's own place. |
| DR4 | The pointer goes up after a drag. | One move is asked for, and the click that follows picks nothing up. |
| RM1 | A group is 400px long with a gap of 16px and holds 5 cells. | It has room for one more cell. |
| RM2 | The same group holds 7 cells. | It has no room, because 8 cells would each be under 48px. |
| RM3 | A grid is 300px across with a gap of 16px and holds 5 groups. | It has no room for one more group. |

The sync and the sign out, in `src/app/sync/board-sync.spec.ts` and `src/app/auth/auth.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| BY1 | The cloud reports a boards document with a set in which Needs is titled "Care". | The device uses and stores that set, and nothing is saved. |
| BY2 | The device has a stored set, and the cloud reports no boards document. | The set is saved to the cloud, only if the cloud still lacks it. |
| BY3 | Nothing is stored on the device, and the cloud reports no boards document. | Nothing is saved. |
| BY4 | A cell is added on the device. | One save holds the fields `tiles` and `boards` with the whole set. |
| BY5 | The cloud reports a document whose `boards` field is not JSON. | The device keeps its set, and nothing is saved back. |
| BY6 | Two changes are made on the device, and the cloud reports the set from before them while the saves are unanswered. | The device keeps its newest set. |
| BY8 | The cloud reports a set in which each board has a field this version does not know, and a cell is then added on the device. The cloud then reports a set this version can read, and a second cell is added. This covers the first case of finding 2 of review.md, the save over a newer version's set. | The first change is not saved, and the sync says that the set of the cloud cannot be read. The device takes the readable set, and the second change is one save. |
| BY9 | The caregiver is signed in, the cloud has not reported yet, and a cell is added. The cloud then reports no boards document. This covers the second case of finding 2 of review.md, the save before the first report. | Nothing is saved before the report. After it, the set of the device is saved only if the cloud still lacks one. |
| BY7 | The settings sync is given a document with a `layout` field. | The field is not used and not saved. |
| AU1 | A set is stored, and the caregiver signs out. | `symple.tiles` and `symple.boards` are removed. |

### A4. End to end tests (1 to 7, 11 to 13, 20 to 38)

Command: `npm run e2e`

The cases are in `e2e/editing.spec.ts` and run at both window sizes, 1024 by 768 and 1440 by 900.

| Case | Input | Expected result |
| --- | --- | --- |
| ED1 | On Needs, the panel is opened and Edit boards is pressed. | The panel closes, each cell shows its edit buttons, the footer shows its four buttons, Add column shows beside the grid, and the settings button is gone. The cells are the same size as before. |
| ED2 | In edit mode, Add Tile is pressed, the label "Juice" is typed, the symbol "drink" is picked and Add is pressed. Done is pressed, and the page is reloaded. | Needs holds a cell "Juice" after the reload. |
| ED3 | After case ED2, the scan runs on Needs. | The scan reaches "Juice", a pick speaks "Juice", and the scan never lands on an edit control. |
| ED4 | Add Board is pressed on home, the name "Outings" is typed and Add is pressed. Open Outings is pressed. | The board Outings is on show in edit mode, with the title "Outings" in the header and a Back cell. |
| ED5 | Help is edited to "Help me" with the phrase "Please help me". Done is pressed, and Help me is picked by scan. | The stand-in for speech records "Please help me". |
| ED6 | Remove Pain is pressed. | Pain is gone, and it is still gone after a reload. |
| ED7 | Help is dragged from the first column to the top of the third. | Help is the first cell of the third column, and the order holds after a reload. |
| ED8 | Help is pressed, and then Pain. | Help is in the place of Pain, and the focus is on "Edit Help". |
| ED10 | Configure Board is pressed, Rows is chosen and Save is pressed. | The groups of Needs are rows, and they still are after a reload. Add row lies under the grid, as wide as the grid and inside the window. Home is still drawn in columns. |
| ED11 | Add column is pressed, and then Remove column on the new group. | The board has four columns, and then three. |
| ED12 | Add column is pressed until it says it is disabled. | No cell of the board is under 48px wide or high. |
| ED13 | Edit mode is on over home, on Needs and in the tile dialog, in each of the five themes. | axe reports no WCAG 2.2 Level AA violation. |
| ED14 | Edit mode is on, and the tile dialog is open, with the Needs board behind. | Each label keeps 4.5 to 1, and the border of each edit button and each control keeps 3 to 1. |
| ED15 | Edit mode is on. | Every edit button, footer button and dialog control is at least 48px high and wide. |
| ED16 | Edit boards is pressed on the QWERTY keyboard. | Home is on show in edit mode. The Keyboards cell has an Edit, an Open and a Remove button. |
| ED17 | In edit mode, ten scan times pass, and Tab and Enter are pressed. | No group and no cell is highlighted. Tab moves the focus through the edit buttons in the order of the cells and then to the footer. |
| ED18 | A board with an empty column is on show, out of edit mode, and the scan runs for two rounds. | The scan never lands on the Add Tile button of the empty column. |
| ED20 | The window is 768px wide and 1024px high, and edit mode is on over Needs. | Add column lies to the right of the grid, is at least 48px wide, and lies inside the window with its focus ring. |
| ED19 | Reduced motion is asked for, and a cell is moved with two presses. | No cell is animated. |

ED9 tested the arrow keys on the Move button of a cell. It was removed with the button on 2026-11-23.

Changed cases in other files:

| Case | Input | Expected result |
| --- | --- | --- |
| The cases of `e2e/boards.spec.ts`, `home.spec.ts` and `scanning.spec.ts` that open a board in the rows layout | The board is given the rows layout in a stored set, in place of `symple.layout`. | Each case passes as before. |
| ST1 and ST2 of `e2e/settings.spec.ts` | The panel opens. | It opens on Boards, and Tab goes round the Boards settings. |
| N14 of `e2e/sign-in.spec.ts` | A set is stored, and the caregiver signs out through the panel. | The sign in screen shows, and local storage holds no stored boards. |

## Manual checks

Claude runs these checks in Chrome, through the Claude in Chrome extension. The user keeps two tabs open and signed in: the Symple tab, which shows the app from `npm start` at `http://localhost:4200`, and the Firestore tab, which shows the database of the project in the Firebase console. A step marked "The user" is done by the user, and Claude waits for it.

### Rules for Claude

The Symple tab is signed in to a real account, so each edit there is saved to the real Firestore document. These rules keep the account and the database as they were.

1. Use the Symple tab, the Firestore tab and tabs that Claude opens itself. Do not close, reload or change any other tab of the user.
2. The Firebase console is for reading. Do not add, edit or delete a document, a field or a collection. Do not publish or edit the rules, and do not change a setting of the project. In the Rules Playground press Run only, which tries a request against the rules and writes nothing.
3. Do not sign in or out, and do not type a password. Ask the user when a check needs it.
4. Before the first check, write down the theme, the cells of Needs in their order, and the layout of Needs. Every check ends with the app in that state.
5. Make changes only with a tile that the check itself adds, named "Test juice". Do not edit, move or remove another cell, unless a step names that cell and the same check puts it back. Never remove a cell that opens a board, such as My boards or Keyboards. Its board stays in the set, but the app has no way to put the cell back.
6. If the app or the console shows something that the steps do not expect, stop and tell the user what is on the screen. Do not try another way.
7. After the last check, read the document `users/{uid}/data/boards` in the Firestore tab and confirm that no tile named "Test juice" is left in it. Record a pass or a fail for each check, with what was seen.

### H1. The look (22, 24, 25, 31)

1. In the Symple tab, open the settings panel and press Edit boards over home. Take a screenshot. Open Needs with its Open button and take a second one.
2. Press Add Tile, take a screenshot of the tile dialog, and press Cancel.
3. Press Done, set the next theme in the settings panel, and repeat steps 1 and 2. Do this for each of the five themes, and set the first theme again at the end.
4. Expected in every theme: each cell but Back shows a round Edit button at its top left and a round Remove button at its top right, and no third button. The footer shows Add Board, Add Tile, Configure Board and Done at its right edge, and the first three have one width. A dashed box with a plus stands in the right margin, as high as the grid, and the grid does not move when edit mode turns on or off. Every label can be read against its background.
5. Open `context/design/home.html?edit` from the repo in a new tab, as a file. If Chrome does not let Claude open the file, say so, and the user compares it. Expected: the edit buttons, the footer buttons and the tile dialog match the mockup in shape and colour. Four differences are meant: the app has Configure Board, it has Add column beside the grid in place of the footer, its labels are in capitals, and it has no Move button.

### H2. The keyboard and the names for screen readers (7, 34, 37, 38)

Claude cannot hear VoiceOver. It reads the names of the controls and the text of the status line from the page, which is what VoiceOver says.

1. In the Symple tab, open Needs, press Control and comma to open the settings panel, and press Edit boards with the keyboard.
2. With the keyboard only, press Add Tile, type the label "Test juice", and press Add. Tab to "Edit Test juice", press Enter, change the phrase to "Test", and press Save. Tab to "Remove Test juice" and press Enter. Press Done.
3. After each press, read the element that has the focus and the text of the status line.
4. Expected: each edit button has a name that holds the label of its cell, such as "Edit Help". The status line tells each change, such as "Test juice removed". The focus is always on a control and never on the page body. Tab stops on no Move button, and the arrow keys move no cell.
5. The user, if they wish: repeat step 2 with VoiceOver on, and confirm that it says the same names and changes.

### H3. Dragging with a mouse (12, 35)

1. In edit mode over Needs, drag Help from the first column to the top of the third column with the mouse.
2. Expected: the cell follows the pointer, the other cells make room, and Help is the first cell of the third column.
3. Drag Help back to its place under Back, and check the order of the cells against the order written down at the start.

### H4. The sync (4, 19)

1. Open the app in a second tab, at `http://localhost:4200/board/needs`. It uses the same account.
2. In the first Symple tab, add the tile "Test juice" to Needs and press Done.
3. Expected: the second tab shows "Test juice" on Needs with no reload.
4. In the Firestore tab, open the document `users/{uid}/data/boards`. Expected: it holds the two fields `tiles` and `boards` as text, and the text of `tiles` holds "Test juice".
5. In the first Symple tab, remove "Test juice" and press Done. Expected: the second tab loses the tile with no reload. Close the second tab.

### H5. The Firestore rules (17)

1. The user: deploy the rules with the command in `README.md`, and say when it is done. Claude does not deploy.
2. In the Firestore tab, open Rules and then the Rules Playground. Each try below is one press on Run, with the account of the Symple tab as the signed in user.
3. Try a write to `users/{uid}/data/settings` with a thirteenth field, and one with a `theme` of 600 characters. Try a write to `users/{uid}/data/boards` with a third field. Try a read of the boards document under another uid.
4. Expected: each of the four is refused. A write of the twelve known fields and a write of `tiles` and `boards` are allowed.
5. Leave the Playground without a press on Publish.

### H6. A second account (16)

Claude does not sign in or out, so the user does the two steps that need it.

1. Claude adds the tile "Test juice" to Needs and presses Done.
2. The user: sign out, and sign in with a second account.
3. Claude opens Needs. Expected: the second account sees the built-in Needs or its own, and no "Test juice".
4. The user: sign out, and sign in with the first account again.
5. Claude removes "Test juice" from Needs and presses Done.
