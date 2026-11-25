# Feature 23: Symbols and icons for a tile. Review

## What I ran and what I only read

I ran `npm test` (465 tests pass), `node scripts/check-pictures.mjs` (cases PC1 to PC5 pass), `npm run build` (no warnings, and `lucide-json` and `symbols-json` are lazy chunks), `npm run lint` and `npm run format:check`. I wrote one scratch unit test for finding 1, ran it, and deleted it. I did not run `npm run e2e`.

I read the diff of the branch against main and each changed source file in full. I also read `src/app/sync/board-sync.ts`, `src/styles/themes.css`, `public/licenses/lucide.txt` and parts of `src/data/cells.json`, `src/data/symbols.json` and `public/symbols/ATTRIBUTION.txt`.

I left out the eight points the brief already lists.

## Findings

### 1. A cell already on screen never gets its icon back after a failed load of the Lucide set.

- File: `src/app/cells/icon-set.ts`, lines 131 to 149, in `load`.
- Case: a board shows a cell with the icon `lucide:house`, and the first load of `lucide.json` fails, for example on a bad network or after a new deploy has removed the old chunk. The catch sets `started` back to false, but the `icons` signal stays null and nothing writes to it. The `lucide` value of the `Icon` component read that signal, so it is never worked out again. The cell keeps an empty picture for the rest of the session. It only recovers when some other `Icon` with a `lucide:` name is created and its load succeeds. I proved this with a scratch test. The first load rejects, the icon on screen has 0 shapes after change detection, and it gets its shape only once a second `Icon` is created. A primary user who cannot read and cannot reload the page loses the picture of that cell.
- What the tests miss: no unit test covers a failed load in `IconSet`. Case IC4 of validation.md, which checks that an unknown icon draws nothing, is the closest one, and it uses a load that succeeds.
- Fix: on failure, write to a signal that `shapes` reads, such as a `failures` counter, so each `Icon` asks again and starts a new load. Or retry from the service on a timer or on the `online` event. Add a unit test where the first load rejects and the second resolves, and check that the icon already on screen gets its shapes.
- Level: medium.

### 2. Three pairs of symbols have the same name, so the dialog lists two pictures called "drink", two called "hot" and two called "open".

- File: `scripts/import-mulberry.mjs`, line 148, which takes the kept name of an old file and builds the name of a new file from its Mulberry name. The result is in `src/data/symbols.json` at lines 4111 and 4151 (`drink-2.svg` and `drink.svg`), 7219 and 7243 (`hot-2.svg` and `hot.svg`), and 8955 and 8979 (`open-3.svg` and `open.svg`).
- Case: the caregiver types "drink" in "Find a picture". The list shows "drink" and then "drink" again. The first one is `drink-2.svg`, which is the Mulberry `drink.svg`. The second one is `drink.svg`, which is the picture the Needs board uses, and whose Mulberry name was `drink_,_to.svg`. The two names give the caregiver no way to tell them apart, and VoiceOver reads two radio buttons with the same name. Manual check H2, which says "drink" shows the symbol that Needs already uses and at least one other, will pass while the caregiver still cannot say which is which from the names. The same happens for "hot", where Needs uses the "hot person" picture, and for "open".
- What the tests miss: `scripts/check-pictures.mjs` does not check that names are unique. Case PC1, which checks that the list and the folder agree, looks at files only.
- Fix: when a new name is already the name of a kept file, build the new name from the new file name, so the three become "drink 2", "hot 2" and "open 3". The 98 old names stay as they are, so case PC3, which checks that the 99 old symbols keep their names, still passes. Add a case to `check-pictures.mjs` that fails when two symbols share a name without regard to case.
- Level: low.

### 3. The licence notes that ship with the app do not match the new sets.

- Files: `public/licenses/lucide.txt`, lines 1 and 2, and `scripts/import-mulberry.mjs`, lines 38 to 48.
- Case: lines 1 and 2 of `lucide.txt` say the app's Lucide icons are copied from Lucide and list the 18 core icons and a few icons of the settings panel. The app now ships all 2,098 Lucide drawings in `lucide.json`, from the package `lucide-static`, so the note no longer says what is in the app. For Mulberry, requirement 6, which says the app ships the licence of each set, is met only by the link to CC BY-SA 4.0 in `ATTRIBUTION.txt`. The release zip holds `LICENSE.txt`, and the import script checks the folder but does not copy that file. The link is enough for CC BY-SA 4.0, but it does not do what requirement 6 says.
- Fix: change the opening lines of `lucide.txt` to say that the app holds the drawings of every icon of Lucide 1.77.0, taken from `lucide-static`. Either have `import-mulberry.mjs` copy `LICENSE.txt` of the release to `public/licenses/mulberry.txt`, or change requirement 6 to say that the link in `ATTRIBUTION.txt` is the licence for Mulberry.
- Level: low.

## Votes (2026-11-24)

Five voters checked each finding against the code. All three findings are kept, and none is dropped.

1. Finding 1, which says a cell already on screen never gets its icon back after a failed load of the Lucide set, is kept. Five voters voted valid. Its level is medium, the middle of three votes of medium and two of low. The voters corrected nothing. They noted that the fault needs a failed fetch of the lazy chunk, and that the cell still shows its label.
2. Finding 2, which says three pairs of symbols share the names "drink", "hot" and "open", is kept. Five voters voted valid. Its level is low. One voter added that `open-2.svg` has the name "open 2", so the pair with the shared name is `open.svg` and `open-3.svg`.
3. Finding 3, which says the licence notes that ship with the app do not match the new sets, is kept. Five voters voted partly. Its level is low. The voters said the ISC text in `lucide.txt` is still correct and only its opening lines are out of date, and that whether a link meets requirement 6, which says the app ships the licence of each set, is a judgement call.

No finding was dropped.

## Fixes (2026-11-24)

The user picked all three kept findings. `make check` passed after each fix, with 466 unit tests, 311 end to end tests and cases PC1 to PC7 of the check of the pictures.

1. Finding 1, which says a cell already on screen never gets its icon back after a failed load of the Lucide set, is fixed in commit `09354f7`. The fix changed `src/app/cells/icon-set.ts` and `src/app/cells/icon-set.spec.ts`. After a failed read the service waits one second, and twice as long after each further failure up to 60 seconds, and then each icon on screen asks again. Case IC7 of validation.md covers it. That case fails the first read of the set, lets the next one succeed, and expects the icon already drawn to hold the shapes of `apple`.
2. Finding 2, which says three pairs of symbols share the names "drink", "hot" and "open", is fixed in commit `2fe8e92`. The fix changed `scripts/import-mulberry.mjs`, `scripts/check-pictures.mjs`, `src/data/symbols.json` and one comment in `e2e/editing.spec.ts`. The new symbols are now named "drink 2", "hot 2" and "open 3". Case PC6 of validation.md covers it. That case expects that no two symbols have the same name without regard to case.
3. Finding 3, which says the licence notes that ship with the app do not match the new sets, is fixed in commit `e89e133`. The fix changed `public/licenses/lucide.txt`, `scripts/import-mulberry.mjs`, `scripts/check-pictures.mjs`, `README.md` and `specs/tech-stack.md`, and it added `public/licenses/mulberry.txt`, which is the unchanged `LICENSE.txt` of the Mulberry release. Case PC7 of validation.md covers it. That case expects the Mulberry licence file to be there and `lucide.txt` to name `lucide-static` 1.77.0.

Every kept finding was fixed.

## Second review (2026-11-25)

The scope was the seven commits after `e89e133` and the changes to `src/app/settings/settings-panel.html` and `settings-panel.css` that are not yet committed. I ran `npm test` (466 tests pass), `npm run lint` and `npm run format:check`, which both pass. I read the diff and each changed source file in full, and I did not run the end to end tests or open the app, because the server on port 4200 serves another app.

### 4. On a narrow cell the third edit button runs past the right edge of the cell, and the first button of the next cell covers it.

- File: `src/app/boards/board-screen.css`, lines 124 to 132, which place the second button at 46px and the third at 102px from the left edge whatever the width of the cell.
- Case: the caregiver opens Core words in edit mode at 1024 by 768 and presses Add Board. Core words has seven columns, so each cell is about 118px wide with a gap of 13px. The new cell goes to the first column, under Back, because that column has the fewest cells, and its top lines up with the fourth cell of the second column. Its Open button spans 102px to 150px from the left edge of the cell. The Remove button of the cell beside it starts at 121px, comes later in the page and has the same z-index, so it is drawn on top of 29px of the 48px Open button. A click on the right half of what looks like Open removes the cell beside it at once. The same happens on any cell with three buttons that is narrower than about 150px, such as one in a board of six columns at 1024 by 768, and on a cell with two buttons that is narrower than about 95px.
- Fix: keep the buttons inside the width of the cell. One way is to make `.slot` a size container (`container-type: inline-size`) and, below a width of about 160px, put the third button under the first (`top: 46px; left: -10px`). Add an end to end case that adds a board to Core words and checks that no two edit buttons overlap.
- Level: medium.

### 5. The CSS for the class `small` is left with nothing that uses it.

- File: `src/app/edit/tile-dialog.css`, lines 83 to 93, where `.small` shares a rule with `.hint` and has a rule of its own.
- Case: the only element with the class `small` was the label "Find a picture", which commit `889f29b` removed. No template in `src/app` uses the class now, and `board-dialog.html`, which shares this file, does not use it either.
- Fix: drop `.small` from the selector on line 84 and delete the rule on lines 91 to 93.
- Level: low.

## Votes on the second review (2026-11-25)

Five voters checked findings 4 and 5 against the code. Both are kept, and none is dropped.

1. Finding 4, which says the third edit button of a narrow cell runs past the cell and is covered by the Remove button of the next cell, is kept. Five voters voted valid. Its level is medium, the middle of three votes of medium and two of low. Each voter redid the sums for Core words at 1024 by 768 and got the same 29px of overlap. The voters corrected two numbers. A cell with three buttons overlaps when it is narrower than about 147px, where the review says about 150px, and a cell with two buttons when it is narrower than about 91px, where the review says about 95px. On a board of six columns the overlap is only about 7px. Two voters said a container query is more than the fix needs.
2. Finding 5, which says the `.small` CSS of the tile dialog has nothing using it, is kept. Five voters voted valid. Its level is low. The voters corrected nothing, and said it is a removal of a few lines.

No finding was dropped.

## Fixes of the second review (2026-11-25)

1. Finding 5, which says the `.small` CSS of the tile dialog has nothing using it, is fixed in commit `7138d0f`. The fix changed `src/app/edit/tile-dialog.css`. No test can show unused CSS, so no check was added. The 466 unit tests and the 311 end to end tests pass after the removal.
2. Finding 4, which says the third edit button of a narrow cell is covered by the Remove button of the next cell, is kept and not fixed. The user did not pick it.
