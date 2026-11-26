# Feature 9: Board editing. Review

I read the specs of the feature, the whole diff against `main` and each new source file, with the code around the calls I had to follow. I did not run the unit tests, the lint or the end to end suite. I ran six throwaway Playwright checks against a dev server at 1024 by 768, from a config in the scratchpad, to test the claims marked as checked below. One more check disproved a claim of mine, that a drag released in the gap between two columns leaves the next press swallowed, so that claim is not here. Findings 2, 8 and 9 come from reading only.

1. **A set change that removes the board on show leaves the primary user on an empty screen with no way out.**
   File: `src/app/boards/board-screen.html` line 1 and `src/app/boards/board-screen.ts` line 163. The route guard `boardExists` runs only when a board is opened, and nothing reacts when `board()` turns undefined later.
   Case: the primary user is on Food on one device. The caregiver removes the Food cell from home on a second device, and the sync brings the new set. The screen then draws no cells and no Back cell, the scan has nothing to scan, and the header still reads "Food". The same happens when the first cloud report at start holds a set without the board on show. Checked: saving a set without Needs through the store while Needs was on show left the header on "Needs", zero cells and the same address.
   Fix: in the board screen, an effect that opens home (or goes back) when the board on show is no longer in the set.
   Level: high.

2. **The board sync saves the device's whole set over a cloud set that the device never took.**
   File: `src/app/sync/board-sync.ts` lines 100 to 108, with lines 127 to 132.
   Case one: a newer version saves a set with a field this version does not know. This version leaves that set alone, as item 19 of requirements.md asks, and keeps its own set, which can be the built-in one. The caregiver adds one tile, and the effect saves this device's whole set, so the newer device loses all its boards at its next report. Case two: on a device that has just signed in, the stored set is null until the first server report. A tile added before that report arrives, as on a slow or dropped network, saves the built-in set plus that tile over the account's set. Case BY5 of `board-sync.spec.ts`, which gives the sync a set that is not JSON, stops before any edit, so it does not catch case one.
   Fix: hold device saves until a server report has been handled, either a readable set or no document. While the last server report held a set this version cannot read, save nothing and tell the caregiver to update the app.
   Level: medium.

3. **Any change to the set sends the primary user's scan to rest, even a change to a board that is not on show.**
   File: `src/app/boards/board-screen.ts` lines 271 to 277, with `src/app/boards/board-data.ts` lines 464 to 471. `loadBoards` makes new board objects for every board on each change, so `board()` changes, and the effect calls `scan.show`, which rests the scan. In the post click delay it also drops the place of the pick.
   Case: the primary user is scanning Needs with the highlight on column 2. A caregiver renames the board Yes or no on another device. The highlight goes away, and the user has to start the scan again. Checked by saving such a set through the store while the scan was on column 2.
   Fix: call `scan.show` and `dwell.reset` only when the group sizes of the board on show change, and keep the old board object when its record and tiles are the same.
   Level: medium.

4. **Board settings can turn a board to rows when its cells would then be under 48px.**
   File: `src/app/edit/board-edits.ts` lines 569 to 580 and `src/app/boards/board-screen.ts` lines 616 to 620. Neither checks the room, and the board dialog does not either.
   Case: on Needs, Add column is pressed until it says it is disabled, which gives 15 columns at 1024 by 768. Board settings, Rows and Save then give 15 rows, and the smallest cell is 27.5px high. Checked in the browser.
   Fix: before a layout change is saved, work out the room for the other layout from the size of the grid, with `groupFits` and `cellFits`, and refuse the change with a line that says why.
   Level: medium.

5. **Out of edit mode, the Add tile button of an empty group reads the room of an earlier board and can refuse.**
   File: `src/app/boards/board-screen.ts` lines 521 to 528, with lines 861 to 863. The room is measured only in edit mode and is never cleared, and `addTileTo` checks it in the same tick that turns edit mode on.
   Case: the caregiver edits Needs while its column 2 is full, presses Done and goes to a board whose column 2 is empty. A press on that group's Add tile button turns edit mode on, says "Column 2 has no room for a tile." and opens no dialog. Checked in the browser.
   Fix: clear the room report when edit mode ends or the board changes, or let `addTileTo` treat an empty group as having room.
   Level: low.

6. **The Add tile button of an empty group, pressed while a cell is picked up, moves that cell into the group and also opens the tile dialog.**
   File: `src/app/boards/board-screen.html` lines 36 and 158, and `src/app/boards/board-screen.ts` lines 666 to 672. The click on the button bubbles to the group, and `onGroupClick` still sees the picked cell.
   Case: on Needs with an empty fourth column, a press on Help and then on Add tile of the fourth column leaves Help in the fourth column with the Add tile dialog open. Checked in the browser.
   Fix: let `onGroupClick` ignore clicks that come from a button, or clear the picked cell in `addTileTo`.
   Level: low.

7. **The status line tells the last change of an earlier edit session again when edit mode turns on.**
   File: `src/app/boards/board-screen.ts` line 312 and `src/app/edit/edit-mode.ts` lines 56 to 59. `stop` keeps the last text, and the switch between the two counters draws it as new.
   Case: Remove Pain, Done, then Edit boards again. The status line holds "Pain removed" at once, so a screen reader says that Pain was removed when nothing changed. Checked in the browser.
   Fix: clear the text of `EditMode.status` in `start` or `stop`.
   Level: low.

8. **The tile dialog, the remove dialog and a picked cell hold a cell by its place, so a sync while they are open makes them act on another cell.**
   File: `src/app/edit/edit-mode.ts` lines 9 to 19, `src/app/boards/board-screen.ts` lines 550 to 584 and `src/app/edit/remove-dialog.ts`, whose effect closes the dialog only when no cell is left at the place.
   Case: the caregiver opens Edit Pain, the third cell of column 1. Another device removes Help, and the sync moves Toilet to that place. The title turns to "Edit Toilet" while the fields still hold Pain's, and Save writes them to Toilet. Unchecked in a browser.
   Fix: keep the tile id with the place when a dialog opens or a cell is picked, and close the dialog or drop the pick when the cell at the place no longer has that tile.
   Level: low.

9. **Case ED19 of `e2e/editing.spec.ts`, which checks that no cell slides under reduced motion, would also pass if the slide never ran.**
   File: `e2e/editing.spec.ts` lines 480 to 500. No test checks that a cell slides when motion is allowed, and `getAnimations` leaves out an animation that has ended, so a slide that ends before the read is not counted either.
   Case: delete the call to `slide` in `board-screen.ts` line 889. Case ED19 still passes, and no unit test or other end to end case reads the slide. Unchecked by a run: I found this by searching the tests for `slide` and `getAnimations`.
   Fix: add the same case without reduced motion, which reads the animations right after the second press and expects at least one.
   Level: low.

## Votes, 2026-11-23

Five voters checked each finding against the code of commit cae9044. They read the code and ran nothing, so none of them repeated the reviewer's browser checks. No voter found a false statement of fact in the review. Each level below is the middle value of the five levels the voters gave.

### Kept findings, in order

| Order | Finding | Claim | Votes | Level | What the voters said |
| --- | --- | --- | --- | --- | --- |
| 1 | Finding 1 | A set change that removes the board on show leaves an empty screen with no Back cell. | 5 valid | Medium | The reviewer gave high. Four voters gave medium, because the case needs a second device to remove the very board that is on show. |
| 2 | Finding 2 | The board sync saves the device's set over a cloud set that the device never took. | 5 valid | Medium | The case of a set from a newer version is confirmed. Three voters said the case of an edit before the first report is partly accepted by item 19 of requirements.md, which says the last save wins. |
| 3 | Finding 3 | Any change to the set sends the scan to rest, also a change to a board that is not on show. | 5 valid | Medium | Two voters gave low, because it needs a sync or an edit while the primary user scans. |
| 4 | Finding 4 | Board settings can switch a board to a layout in which its cells are under 48px. | 5 valid | Low | The reviewer gave medium. Item 11 of requirements.md limits only the Add buttons, and the caregiver can switch back. No voter checked the figure of 27.5px. |
| 5 | Finding 6 | Add tile in an empty group while a cell is picked up moves that cell and opens the tile dialog. | 5 valid | Low | The voters confirmed it in the code. |
| 6 | Finding 5 | Out of edit mode the Add tile button of an empty group reads the room of an earlier board. | 4 valid, 1 partly | Low | One voter could not confirm that the room report is never cleared. |
| 7 | Finding 7 | The status line repeats the last change of an earlier edit session when edit mode turns on again. | 5 valid | Low | The voters confirmed it in the code. |
| 8 | Finding 8 | A dialog and a picked cell hold a cell by its place, so a sync while one is open makes it act on another cell. | 4 valid, 1 partly | Low | It stays unchecked in a browser, as the reviewer said. |
| 9 | Finding 9 | Case ED19, the reduced motion check, would also pass if the slide never ran. | 5 valid | Low | No voter searched every test for another check of the slide. |

### Dropped findings

No finding was dropped.

## Fixes, 2026-11-23

The user picked findings 1, 2, 3, 6 and 7. Each fix has a unit test that failed before the fix and passes after it. The end to end suite was not run after the fixes, at the user's request, so validate has to run it.

### Fixed findings

| Finding | Commit | What the fix did | Files | Check in validation.md |
| --- | --- | --- | --- | --- |
| Finding 1, the empty screen when a set change removes the board on show | 68cefe6 | The board screen opens home when the board on show is no longer in the set. | `src/app/boards/board-screen.ts` | Case ES14, which removes the cell that opens Needs while Needs is on show and expects home. |
| Finding 2, the board sync that saves over a cloud set the device never took | 3b1bd8c | The sync saves a change only after it has handled the boards document of the account: it took a readable set, or the cloud itself reported no set. While the document holds a set this version cannot read, nothing is saved, and the Boards tab of the settings panel says so. | `src/app/sync/board-sync.ts`, `src/app/sync/board-sync-state.ts`, `src/app/settings/settings-panel.ts`, `.html` and `.css` | Case BY8, which adds a cell while the cloud holds a newer version's set and expects no save. Case BY9, which adds a cell before the first report and expects no save. |
| Finding 3, the scan that goes to rest on any change of the set | 68cefe6 | The scan is given the board again only when another board comes on show or the sizes of its groups change. | `src/app/boards/board-screen.ts` | Case ES15, which renames the board Food while the scan highlights the first group of Needs and expects the highlight to stay. |
| Finding 6, the picked cell that moves when Add Tile of an empty group is pressed | 68cefe6 | A press on a button inside a group no longer counts as a press on the group. | `src/app/boards/board-screen.ts` and `.html` | Case ES16, which presses Help and then Add Tile of an empty column and expects Help to stay. |
| Finding 7, the status line that repeats the last change of an earlier edit session | 33e624b | Edit mode empties its status text when it turns on. | `src/app/edit/edit-mode.ts` | Case EM5, which tells a change, turns edit mode off and on, and expects an empty status text. |

Two points differ from the fixes the review suggested.

- The fix of finding 3 does not keep the old board object when its record and tiles are the same. The effect that starts the scan now reads only the id of the board and the sizes of its groups, which stops the fault without that second change.
- The fix of finding 2 holds a change made before the first report. If the cloud then reports a set, that set replaces the set of the device and the held change is lost, as item 19 of requirements.md has it for a set in the cloud. If the cloud reports no set, the set of the device fills it, with the held change.

### Kept findings that were not fixed

| Finding | Reason |
| --- | --- |
| Finding 4, the board settings that can switch a board to a layout with cells under 48px | The user did not pick it. |
| Finding 5, the Add Tile button of an empty group that reads the room of an earlier board | The user did not pick it. |
| Finding 8, the dialog and the picked cell that hold a cell by its place | The user did not pick it. |
| Finding 9, the reduced motion case ED19 that would pass if the slide never ran | The user did not pick it. |
