# Feature 9: Board editing. Plan

The numbers in brackets are the items in requirements.md that a step covers. The two fixes left over from feature 8, which item 14 of requirements.md describes, are already on this branch and are not a step here.

## Step 1. Make the boards a stored set that can change (3, 8, 18, 39)

- Creates `src/app/boards/board-store.ts` and its `.spec.ts`. The store reads `symple.tiles` and `symple.boards` through `LocalStore`, gives the built-in files when nothing usable is stored, and writes both texts on a change. It holds the set as a signal.
- Changes `src/app/boards/board-data.ts` and its `.spec.ts`. `BoardData` loads the set of the store and loads it again when the set changes, so a screen redraws after an edit. `loadBoards` accepts the board field `locked`.
- Changes `src/data/boards.json`. The four keyboards and the Keyboards list get `locked: true`.
- Changes `src/app/app.routes.ts`, so the title of a board in the header follows a rename.

## Step 2. Give each board its own layout (2, 15)

- Changes `src/app/layout/layout.ts` and its `.spec.ts`. The service keeps the names of the layouts and the default, and loses the stored value.
- Changes `src/app/boards/board-screen.ts` and `board-screen.html`, which use the layout of the board or columns.
- Changes `src/app/sync/settings-sync.ts` and its `.spec.ts`, which drop the field `layout`.
- Changes `src/app/app.config.ts`, which no longer loads the layout.
- Changes `e2e/support/boards.ts`. The helper that opens a board in the rows layout stores a set in which that board has the layout, so the cases of `e2e/boards.spec.ts`, `home.spec.ts` and `scanning.spec.ts` that use it keep their meaning.

## Step 3. Write the changes to a set as plain functions (1, 11, 23, 25 to 31)

- Creates `src/app/edit/board-edits.ts` and its `.spec.ts`. Each function takes a set and gives a new one: add a cell, edit a cell, remove a cell, move a cell, add a group, remove a group, add a board, remove a board with the boards that only it reaches, and set the title and the layout of a board.
- New tiles and boards get an id from `crypto.randomUUID`. A new board gets a Back cell. A tile that no cell uses leaves the set.

## Step 4. Add edit mode and quiet the board behind it (6, 20, 21)

- Creates `src/app/edit/edit-mode.ts` and its `.spec.ts`. The service says whether edit mode is on.
- Changes `scan.ts`, `switches.ts` and `dwell.ts` of `src/app/scan/`, with their `.spec.ts` files, and `src/app/boards/board-screen.ts`. They rest in edit mode as they do while the settings panel is open.
- Changes `src/app/shell/header.ts` and `header.html`, which hide the settings button in edit mode, and `header.spec.ts`.

## Step 5. Add the Boards category to the settings panel (20)

- Changes `src/app/settings/settings-panel.ts`, `.html`, `.css` and `.spec.ts`. Boards is the first category, and the panel opens on it. Edit boards closes the panel and turns edit mode on. On a locked board it opens home first.
- Changes the cases of `e2e/settings.spec.ts` that expect five categories and Selection first.

## Step 6. Draw the edit buttons on the cells and the buttons of the footer (22, 23, 24, 31, 32, 38)

- Changes `src/app/boards/board-screen.ts`, `.html`, `.css` and `.spec.ts`. Each cell lies in a slot with its Edit, Remove, Move and Open buttons. An empty group shows its outline, Add tile and Remove column.
- Creates `src/app/edit/edit-actions.ts`, `.html`, `.css` and `.spec.ts`, with Add column, Add board, Add tile, Board settings and Done.
- Changes `src/app/shell/footer.ts`, `footer.css` and `footer.spec.ts`, which show those buttons in edit mode and keep the height of the footer.
- Changes `src/app/cells/icon.ts` if a button needs a Lucide icon that is not drawn yet. Each new drawing names its Lucide icon.

## Step 7. Add the tile dialog (25 to 29)

- Creates `src/data/symbols.json`, which lists each file of `public/symbols/` with a name.
- Creates `src/app/edit/tile-dialog.ts`, `.html`, `.css` and `.spec.ts`. It is a native modal dialog with the preview, the fields of its type, Cancel and Add or Save.

## Step 8. Add the remove dialog and the board settings dialog (30, 36)

- Creates `src/app/edit/remove-dialog.ts` and `board-dialog.ts`, each with its `.html`, `.css` and `.spec.ts`. The two share the styles of the tile dialog.

## Step 9. Move a cell in the three ways (12, 33, 34, 35)

- Changes `src/app/boards/board-screen.ts`, `.html`, `.css` and `.spec.ts` for the pick up and put down and for the arrow keys.
- Creates `src/app/edit/drag.ts` and its `.spec.ts`, which follow the pointer, find the group and the place under it, and slide the other cells.

## Step 10. Enforce the 48px rule (11)

- Creates `src/app/edit/room.ts` and its `.spec.ts`. It measures the grid and says whether a group can take one more cell and whether the board can take one more group.
- Changes `edit-actions.ts` and `board-screen.ts`, which turn off an Add button with no room and say why.

## Step 11. Sync the set (4, 9, 16, 19)

- Changes `src/app/sync/cloud-store.ts` and `firestore-cloud-store.ts`, with the `.spec.ts`, so that the store can watch and save the document `users/{uid}/data/boards`.
- Creates `src/app/sync/board-sync.ts` and its `.spec.ts`, with a fake of the cloud store.
- Changes `src/app/auth/auth.ts` and its `.spec.ts`. A sign out removes the stored set.
- Changes `src/app/app.config.ts`, which starts the board sync.
- Changes `e2e/support/firebase.ts` if the blocked Firestore calls need the new address.

## Step 12. Tighten the Firestore rules (17)

- Changes `firestore.rules` with the checks of item 17.
- Changes the Firebase section of `README.md`, which says how to deploy and check the rules.

## Step 13. Write the end to end tests (7)

- Creates `e2e/editing.spec.ts` with the cases of validation.md.
- Changes `e2e/support/boards.ts` with helpers that turn edit mode on and read the set.

## Step 14. Update the documents (15, 16, 17)

- Changes `CLAUDE.md`. The rule on groups says that each board sets its layout and that columns are the default.
- Changes `specs/tech-stack.md`. The Data section names the stored set, the boards document and the checks of the rules. The Design reference section says that each board sets its layout. The Input section says what rests in edit mode.
- Changes `README.md` with a short section on board editing.

## Step 15. Run everything

- Runs `make check` and fixes the failures.
