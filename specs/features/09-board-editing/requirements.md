# Feature 9: Board editing. Requirements

The mockup for this feature is `context/design/home.html`. Open it with `?edit` to see edit mode, and with `?edit&tile=Needs` to see the tile dialog. It draws edit mode on the home screen only. The settings mockup, `context/design/home-settings.html`, draws the Boards category with the Edit boards button.

"Tile" and "cell" mean the same thing, as PRODUCT.md says. The buttons use the word "tile", as the mockup does.

## What the feature must do

1. The caregiver adds, removes, moves and edits boards and cells on the device. Source: roadmap.md, feature 9. PRODUCT.md, Users and Operating Context.
2. The caregiver sets the layout of each board to columns or rows. Source: roadmap.md, feature 9, and the user's decision of 2026-11-23.
3. The changes are saved on the device. Source: roadmap.md, feature 9. tech-stack.md, Data.
4. The changes join the sync of feature 3. Source: roadmap.md, feature 9, and the decision of 2026-11-17 that feature 9 adds the edited boards.
5. An empty board and an empty group show an Add button. It is a caregiver control that scanning skips. Source: roadmap.md, feature 9, and the decision of 2026-11-16 on empty boards.
6. Edit mode is for the caregiver. The primary user's path does not change, and scanning never reaches an edit control. Source: PRODUCT.md, Principles 2 and 5.
7. Every screen still works by single switch scanning after an edit, and passes WCAG 2.2 Level AA in edit mode and out of it. Source: roadmap.md, the two rules for every feature.
8. Edited boards and cells stay data in the shape of `boards.json` and `cells.json`. Source: CLAUDE.md, Rules. tech-stack.md, Data.
9. The feature adds no cloud service. It uses Firestore under `users/{uid}`, as feature 3 does. Source: CLAUDE.md, Rules.
10. **Patent check.** The feature stores what the caregiver types and picks. It generates no content and no suggestions, so the patent check of tech-stack.md, Patents, does not apply.

## The user's answers of 2026-11-23

11. **No fixed limit.** A board can hold any number of groups, and a group any number of cells, as the decision of 2026-11-16 says. An Add button does nothing when one more cell or group would make a cell smaller than 48px in the window in use. It then says it is disabled and why.
12. **Three ways to move a cell.** The caregiver drags a cell with the pointer, or picks it up with one press and puts it down with a second, or uses the arrow keys on its Move button. The last two meet WCAG 2.5.7, which asks for a way without dragging.
13. **The keyboards are not edited.** Edit mode does not turn on for the four keyboards or for the Keyboards list. The Keyboards cell on home can be moved and edited like any cell that opens a board, and it cannot be removed.
14. **The two fixes left over from feature 8 are done first.** They are finding 2 of the review of feature 8, a drag out of the settings panel that closed it, and finding 4, the minus and plus buttons that were written out four times. They were fixed on this branch on 2026-11-23, before the plan, with their cases PA21, PA22, ST20 and ST21 of the validation.md of feature 8. This plan does not repeat them.

## The open questions of the roadmap

Each answer below is my proposal. The user confirms them by approving the plan.

15. **How a board stores its layout.** A board has an optional `layout` field, which `boards.json` already allows. A board with no layout is drawn in columns. The stored setting `symple.layout` is no longer read or written, the `Layout` service loses its stored value, and the sync no longer covers `layout`. The field `layout` stays in the Firestore document of an account that has it, and nothing reads it. The rule in CLAUDE.md and the lines in tech-stack.md that say a stored setting picks the layout change to say that each board does.
16. **Whether the device forgets the boards at sign out.** At sign out the app removes the stored boards from local storage, so a second account on the same device never sees or uploads the first account's phrases. The Firestore cache on the device is not cleared. It is keyed by `users/{uid}`, so one account does not read what another left there, and clearing it means shutting the Firestore client down and starting it again. One limit follows: an edit made with no network and followed by a sign out before the network returns can be lost.
17. **Whether `firestore.rules` checks what an account writes.** It does after this feature. The settings document takes only its twelve known fields, each a text of at most 500 characters. The boards document takes only the fields `tiles` and `boards`, each a text of at most 500,000 characters. The rules are still checked by hand, because the tests do not use the Firebase emulator.

## Things neither source covers

These are my choices. Each one can change before implement.

18. **Where the edits are kept.** The app keeps the whole set, every board and every tile, in local storage under `symple.boards` and `symple.tiles`, as two JSON texts in the shape of the built-in files. Nothing is stored until the first change. Until then, and when a stored text cannot be read, the app uses the built-in files. The loader of feature 2 checks a stored set as it checks the files.
19. **The sync.** The set is one Firestore document, `users/{uid}/data/boards`, with the fields `tiles` and `boards` as JSON text. The rules of feature 3 apply to the set as a whole. A set in the cloud replaces the set of the device. A change on the device saves the whole set. A device with stored boards fills a cloud that has none. A set that this version cannot read is left alone. When two devices change their boards with no network, the last save wins, and the other device's changes are lost.
20. **How edit mode starts and ends.** The settings panel gets a Boards category, first in the list as in the mockup, with an Edit boards button. The button closes the panel and turns edit mode on for the board on show. On a keyboard or on the Keyboards list it opens home first. Done in the footer turns edit mode off. Edit mode stays on while the caregiver goes from board to board.
21. **What rests in edit mode.** The scan rests, Tab and Enter are not switches, no dwell runs and the round cursor is not drawn, as while the settings panel is open. The cells do nothing and take no focus. The settings button is hidden. The scan starts from rest at the first switch press after Done.
22. **The buttons on a cell.** Each cell shows an Edit button at its top left corner and a Remove button at its top right corner. A Move button sits beside Remove and shows only when the keyboard puts the focus on it. A cell that opens a board also shows an Open button, which goes to that board with edit mode still on. Each button is 48px wide and high and is named after its cell, such as "Edit Help".
23. **The Back cell.** A board other than home keeps its Back cell. The Back cell can be moved. It cannot be edited or removed, and in edit mode it shows a Go back button that goes to the previous board. A new board gets a Back cell as its first cell.
24. **The buttons in the footer.** In edit mode the footer shows Add column, Add board, Add tile, Board settings and Done at its right edge. Add column reads Add row on a board in the rows layout. The footer keeps its height, so the cells do not change size when edit mode turns on.
25. **Add board.** It opens the tile dialog with Name, Style, Colour and Icon, as in the mockup. The styles are Bleed, Signage and Stage, and the colours are Dark, Soft, Grey and White. The icons are the line icons of `src/app/cells/icon.ts` apart from the six that stand for a key or a control. Add makes a new board with that title and a cell that opens it. The new board has three groups, and its first group holds the Back cell.
26. **Add tile.** It opens the tile dialog for a cell that speaks. The fields are Label, Phrase, Symbol and Colour. An empty Phrase speaks the label. The Symbol list holds the Mulberry symbols of `public/symbols/` by name, with a box that filters them, and a choice of no symbol, which draws the label alone. The list comes from a new data file, `src/data/symbols.json`.
27. **Where a new cell goes.** A new cell goes to the end of the group with the fewest cells on the board on show. When groups tie, the first of them gets it. The Add button of an empty group puts the new cell in that group.
28. **Edit.** The Edit button opens the tile dialog filled in with the cell. The type cannot change. Renaming a cell that opens a board also renames the board. An edit changes only that cell. When another cell uses the same tile, the edited cell gets a tile of its own.
29. **The limits of the fields.** A label and a name hold 1 to 24 characters, as in the mockup, and a phrase holds up to 200. The dialog shows a preview of the cell, and each change of a field redraws it. Cancel and Escape close the dialog with no change.
30. **Remove.** A cell that speaks is removed at once. A cell that opens a board asks first, in a dialog that names the board and says how many cells go with it, because the board and every board that can only be reached through it are removed too. A cell that opens a board that cannot be edited, such as Keyboards, has no Remove button. A tile that no cell uses any more leaves the set.
31. **Groups.** Add column puts an empty group at the end of the board. An empty group shows a dashed outline, an Add tile button and a Remove column button. The last group of a board cannot be removed.
32. **The Add button out of edit mode.** An empty group shows its Add tile button out of edit mode too, as the roadmap says. A press turns edit mode on and opens the tile dialog for that group. The button carries `data-caregiver-control`, so the scan and the dwell press skip it.
33. **Moving with two presses.** A press on a cell picks it up, and its Move button says it is pressed. A press on a second cell puts the first in that cell's place, and the second cell and the cells after it move on by one. When that group has no room, as item 11 defines it, the two cells trade places. A press on an empty group puts the cell there. Escape puts the cell back.
34. **Moving with the keys.** While a Move button has the focus, the arrow keys move its cell. In the columns layout, Up and Down move it in its group, and Left and Right move it to the next group. In the rows layout the two pairs swap.
35. **Moving by dragging.** The cell follows the pointer once the pointer has moved a few pixels. It joins the group under the pointer, before the first cell whose middle lies past the pointer. A group with no room is skipped. The other cells slide out of the way, and they jump with no slide when the system asks for reduced motion.
36. **Board settings.** The button opens a dialog with the Title of the board on show, 1 to 24 characters, and its Layout, Columns or Rows.
37. **No Save.** Each change applies, is stored and is synced at once, as in the settings panel. A status line tells screen readers each change, such as "Help moved to column 2, place 1".
38. **The focus.** A dialog that closes sends the focus back to the button that opened it. After a removal the focus goes to the Remove button of the next cell, then of the cell before, then to Add tile. Tab goes through the edit buttons in the order of the cells, and then through the footer.
39. **Which boards cannot be edited.** A board carries `locked: true` in `boards.json` when it cannot be edited. The four keyboards and the Keyboards list carry it. The app does not name those boards in its code.
40. **File names.** `src/app/edit/` holds edit mode: `edit-mode.ts`, the service that says whether it is on, `board-edits.ts`, the changes to a set as plain functions, `tile-dialog.ts`, `board-dialog.ts`, `remove-dialog.ts` and `edit-actions.ts`, the buttons of the footer, each with its `.html`, `.css` and `.spec.ts` where it has them. `src/app/boards/board-store.ts` reads and writes the stored set, and `src/app/sync/board-sync.ts` syncs it. `e2e/editing.spec.ts` holds the end to end cases.

## Left for later features

- A way to put the built-in boards back is not in this feature. Neither source asks for it.
- A cell cannot be moved from one board to another.
- The size of a cell, small, medium or large, is kept when a cell is edited and cannot be changed in the dialog.
- The caregiver cannot add a symbol or a photo of their own.
- Feature 7, word suggestions, decides whether the keyboards can be edited.
- Feature 21, OBF support, imports and exports boards.
