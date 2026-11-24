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
| BE9 | The cell that opens My boards is removed from home. | My boards and the eight boards that only it reaches are gone, with their tiles. The Back tile stays. |
| BE10 | The cell that opens Keyboards, a locked board, is removed. | The set does not change. |
| BE11 | The Back cell of Needs is removed, and in a second run edited. | The set does not change in either run. |
| BE12 | The second cell of the first group moves to the first place of the third group. | It is there, and the cells of both groups keep their order otherwise. |
| BE13 | A cell moves to the place of a cell in a group that is marked as having no room. | The two cells trade places. |
| BE14 | A group is added to a board. | The board has one more group, which is empty and last. |
| BE15 | An empty group is removed, and in a second run the only group of a board. | The first run removes it. The second changes nothing. |
| BE16 | A board named "Outings" is added from home with the Stage style, the Grey colour and the `place` icon. | The set has a new board with that title, three groups and a Back cell first. Home has a new cell that opens it with that style, colour and icon. |
| BE17 | The title of Needs is set to "Care" and its layout to rows. | The board has that title and that layout, and the cell on home that opens it reads "Care". |
| BE18 | Each set that cases BE1 to BE17 produce is given to `loadBoards`. | No fault is reported. |

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
| ES4 | Edit mode is on over Needs. | The Back cell has "Go back" and "Move Back", and no Edit or Remove button. |
| ES5 | "Remove Help" is pressed. | Help is gone, the status line reads "Help removed", and the focus is on the Remove button of the next cell. |
| ES6 | Edit mode is on over home. | The cell Keyboards has no Remove button. |
| ES7 | A board has an empty group, and edit mode is off. | The group shows a button named "Add tile" that carries `data-caregiver-control` and is not a tab stop. A press turns edit mode on and opens the tile dialog. |
| ES8 | Edit mode is on, and a group is empty. | The group shows "Add tile" and "Remove column". |
| ES9 | A press on Help, and then a press on Pain. | Help takes the place of Pain, "Move Help" carried `aria-pressed="true"` in between, and the status line tells the new place. |
| ES10 | A press on Help, and then Escape. | Help stays where it was, and nothing is picked up. |
| ES11 | "Move Help" has the focus, and Right is pressed, then Down. | Help is in the next column, then one place lower, and the focus stays on "Move Help". |
| ES12 | The board has the rows layout, "Move Help" has the focus, and Down is pressed. | Help is in the next row. |
| ES13 | The board has the rows layout and edit mode is on. | The footer button reads "Add row", and an empty group reads "Remove row". |
| ES14 | Needs is on show, and the set changes so that the cell on home that opens Needs is removed. This covers finding 1 of review.md, the empty screen with no Back cell. | The set has no board Needs, and home is on show. |
| ES15 | The mode is `step`, the scan highlights the first group of Needs, and the board Food is renamed in the set. This covers finding 3 of review.md, the scan that goes to rest on any change of the set. | The scan still highlights the first group. |
| ES16 | Needs has an empty fourth column. A press on Help, and then on Add tile of the fourth column. This covers finding 6 of review.md, the picked cell that moves when Add tile is pressed. | Help stays in the first column, the fourth column stays empty, and the tile dialog is open for the fourth column. |

The footer, in `src/app/edit/edit-actions.spec.ts` and `src/app/shell/footer.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| EA1 | Edit mode is off. | The footer holds no button. |
| EA2 | Edit mode is on. | The footer holds Add column, Add board, Add tile, Board settings and Done, in that order. |
| EA3 | Done is pressed. | Edit mode is off. |
| EA4 | Add column is pressed. | The board has one more group. |
| EA5 | No group has room for a cell. | Add tile and Add board carry `aria-disabled="true"` and are described by a line that says every column is full. A press changes nothing. |

The settings panel and the header, in `settings-panel.spec.ts` and `header.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| PA23 | The panel opens. | It has six tabs, Boards is the first, and Boards is chosen. |
| PA24 | Edit boards is pressed over Needs. | The panel is closed, and edit mode is on. |
| PA25 | Edit boards is pressed over the QWERTY keyboard, a locked board. | The panel is closed, home is on show, and edit mode is on. |
| H5 | Edit mode is on. | The header shows no settings button. |

The dialogs, in `tile-dialog.spec.ts`, `remove-dialog.spec.ts` and `board-dialog.spec.ts` of `src/app/edit/`:

| Case | Input | Expected result |
| --- | --- | --- |
| TD1 | Add tile is pressed. | A dialog named "Add tile" shows Label, Phrase, Symbol and Colour, with a preview. |
| TD2 | The label "Juice" is typed. | The preview reads "Juice". |
| TD3 | "dri" is typed in the box that filters the symbols. | The list holds only the symbols whose name has "dri" in it. |
| TD4 | Add is pressed with an empty label. | The dialog stays open, the Label field is marked invalid, and a line says that a label is needed. |
| TD5 | A label of 25 characters is typed. | The field holds the first 24. |
| TD6 | Add board is pressed. | A dialog named "Add board" shows Name, Style, Colour and Icon. The icons do not include back, backspace, caps, trash, check or cross. |
| TD7 | "Edit Help" is pressed. | The dialog is named "Edit Help" and is filled in with the label, the phrase, the symbol and the colour of Help. It has no choice of type. |
| TD8 | Cancel is pressed, and in a second run Escape. | The dialog is closed each time, the set did not change, and the focus is back on the button that opened the dialog. |
| RD1 | "Remove My boards" is pressed on home. | A dialog names My boards and says that 9 boards and their cells will be removed. Cancel leaves the set as it was. |
| RD2 | Remove is pressed in that dialog. | The boards are gone. |
| BG1 | Board settings is pressed over Needs. | A dialog shows the title "Needs" and the layout Columns as chosen. |
| BG2 | Rows is chosen and Save is pressed. | The board has the rows layout, and the grid carries `data-layout="rows"`. |

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
| BY7 | The settings sync is given a document with a `layout` field. | The field is not used and not saved. |
| AU1 | A set is stored, and the caregiver signs out. | `symple.tiles` and `symple.boards` are removed. |

### A4. End to end tests (1 to 7, 11 to 13, 20 to 38)

Command: `npm run e2e`

The cases are in `e2e/editing.spec.ts` and run at both window sizes, 1024 by 768 and 1440 by 900.

| Case | Input | Expected result |
| --- | --- | --- |
| ED1 | On Needs, the panel is opened and Edit boards is pressed. | The panel closes, each cell shows its edit buttons, the footer shows its five buttons, and the settings button is gone. The cells are the same size as before. |
| ED2 | In edit mode, Add tile is pressed, the label "Juice" is typed, the symbol "drink" is picked and Add is pressed. Done is pressed, and the page is reloaded. | Needs holds a cell "Juice" after the reload. |
| ED3 | After case ED2, the scan runs on Needs. | The scan reaches "Juice", a pick speaks "Juice", and the scan never lands on an edit control. |
| ED4 | Add board is pressed on home, the name "Outings" is typed and Add is pressed. Open Outings is pressed. | The board Outings is on show in edit mode, with the title "Outings" in the header and a Back cell. |
| ED5 | Help is edited to "Help me" with the phrase "Please help me". Done is pressed, and Help me is picked by scan. | The stand-in for speech records "Please help me". |
| ED6 | Remove Pain is pressed. | Pain is gone, and it is still gone after a reload. |
| ED7 | Help is dragged from the first column to the top of the third. | Help is the first cell of the third column, and the order holds after a reload. |
| ED8 | Help is pressed, and then Pain. | Help is in the place of Pain. |
| ED9 | Tab reaches "Move Help", and Right is pressed. | Help is in the second column. |
| ED10 | Board settings is opened, Rows is chosen and Save is pressed. | The groups of Needs are rows, and they still are after a reload. Home is still drawn in columns. |
| ED11 | Add column is pressed, and then Remove column on the new group. | The board has four columns, and then three. |
| ED12 | Add column is pressed until it says it is disabled. | No cell of the board is under 48px wide or high. |
| ED13 | Edit mode is on over home, on Needs and in the tile dialog, in each of the five themes. | axe reports no WCAG 2.2 Level AA violation. |
| ED14 | Edit mode is on, and the tile dialog is open, with the Needs board behind. | Each label keeps 4.5 to 1, and the border of each edit button and each control keeps 3 to 1. |
| ED15 | Edit mode is on. | Every edit button, footer button and dialog control is at least 48px high and wide. |
| ED16 | Edit boards is pressed on the QWERTY keyboard. | Home is on show in edit mode. The Keyboards cell has no Remove button and no Open button. |
| ED17 | In edit mode, ten scan times pass, and Tab and Enter are pressed. | No group and no cell is highlighted. Tab moves the focus through the edit buttons in the order of the cells and then to the footer. |
| ED18 | A board with an empty column is on show, out of edit mode, and the scan runs for two rounds. | The scan never lands on the Add tile button of the empty column. |
| ED19 | Reduced motion is asked for, and a cell is moved with two presses. | No cell is animated. |

Changed cases in other files:

| Case | Input | Expected result |
| --- | --- | --- |
| The cases of `e2e/boards.spec.ts`, `home.spec.ts` and `scanning.spec.ts` that open a board in the rows layout | The board is given the rows layout in a stored set, in place of `symple.layout`. | Each case passes as before. |
| ST1 and ST2 of `e2e/settings.spec.ts` | The panel opens. | It opens on Boards, and Tab goes round the Boards settings. |
| N14 of `e2e/sign-in.spec.ts` | A set is stored, and the caregiver signs out through the panel. | The sign in screen shows, and local storage holds no stored boards. |

## Manual checks

Run `npm start`, open the app in Chrome on the Mac and sign in.

### H1. The look (22, 24, 25, 31)

1. Open `context/design/home.html?edit` in a second window, and `context/design/home.html?edit&tile=Needs` in a third.
2. In the app, turn edit mode on over home and open the tile dialog for Needs, in each of the five themes.
3. Expected: the edit buttons, the footer and the dialog match the mockup in place, size and colour. The footer also holds Board settings, which the mockup does not have.

### H2. The keyboard and a screen reader (7, 34, 37, 38)

1. Turn VoiceOver on. Open the panel with Control and comma, and press Edit boards.
2. With the keyboard only, add a tile, edit it, move it with the arrow keys and remove it. Press Done.
3. Expected: VoiceOver says the name of each button with its cell, says each change, and the focus is never lost.

### H3. Dragging with a mouse and with a finger (12, 35)

1. Drag a cell to another column with the mouse, and then on a touch screen or in the device mode of Chrome.
2. Expected: the cell follows the pointer, the other cells slide out of the way, and the cell lands where it was dropped.

### H4. The sync (4, 19)

1. Sign in on two browsers with the same account. Add a tile on the first.
2. In the Firebase console, open the document `users/{uid}/data/boards`.
3. Expected: the second browser shows the new tile with no reload, and the document holds the fields `tiles` and `boards` as text.

### H5. The Firestore rules (17)

1. Deploy the rules with the command in `README.md`. Open the Rules Playground in the Firebase console.
2. Try a write to the settings document of the signed in account with a thirteenth field, and one with a `theme` of 600 characters. Try a write to the boards document with a third field. Try a read of another account's boards document.
3. Expected: each of the four is refused. A write of the twelve known fields and a write of `tiles` and `boards` are allowed.

### H6. A second account (16)

1. Edit a board, and sign out. Sign in with a second account.
2. Expected: the second account sees the built-in boards or its own, and never the first account's edit.
