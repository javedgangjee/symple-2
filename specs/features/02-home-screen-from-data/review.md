# Feature 2: Home screen and boards from data. Review

## What I ran and what I only read

I ran `make check` with Node 22.23.5. Lint, the format check, 96 unit tests, 96 end to end tests and the build all passed. A first run with Node 22.22.1 stopped at lint, because the Angular CLI refuses that version.

I ran one probe script of my own, outside the repo. It served the built app from `dist/` and drove it in Playwright's Chromium at 1024 by 768. It pressed Back twice in a row, pressed the same phrase cell twice while watching the status region, and pressed a symbol image, moved the pointer 14px and released. Findings 1, 2 and 3 quote its output.

I ran a script over `cells.json` and `boards.json` that listed every board and tile and checked that each symbol file exists and is listed in `ATTRIBUTION.txt`.

I read every new and changed source file, the three end to end files and their helpers, the four smaller unit test files, the specs and PRODUCT.md. In `board-data.spec.ts` I read the case names and not each test body. I did not run the manual checks M1 to M6, and I did not test in Safari. I did not compare the Mulberry files with the originals, apart from three files that match the copies in the Needs mockup.

## Findings

### 1. Two fast presses of Back skip a screen

Claim: `back()` removes the current screen from its list before the navigation ends, so a second press that arrives in that time removes one more.

File and line: `src/app/boards/back.ts` lines 38 to 41.

Case: open home, My boards, then Food. Double click Back on Food. The probe ended on Home, and the user wanted My boards. A switch that bounces or a hand with a tremor gives two presses close together. On the keyboard the same double press throws the user out to home, two screens away from the message they were writing. No test presses Back twice without waiting. K3 and B6 wait for each screen.

Fix: do not pop. Go to `this.trail.at(-2) ?? '/'`. The `NavigationEnd` handler already cuts the list back to a screen that is in it, so the list stays right, and a second press asks for the same screen again. Add a unit case that calls `back()` twice without awaiting the first.

Level: medium.

### 2. A press that starts on a symbol and moves a little is lost

Claim: the symbol image is draggable, so pressing it and moving the pointer before release starts an image drag and no click reaches the cell.

File and line: `src/app/cells/cell.html` line 11, with `src/app/cells/cell.css` lines 171 to 177.

Case: on Needs, the probe pressed the mouse on the Pain symbol, moved 14px and released. The page got `dragstart` on the `IMG` and no `click`, and the status region stayed empty. The same press on the Toilet label gave a `click`. The symbol plate is most of a symbol cell, so this is the usual place to press. The mission lists cursor and touch as ways to select, and people who cannot point precisely rarely hold the pointer still. The end to end tests click without moving, so they miss it. I saw this in Chromium only.

Fix: set `draggable="false"` on the image, or `pointer-events: none` on `.plate img`. Add an end to end case that presses on a symbol, moves a few pixels, releases and expects the phrase in the status region.

Level: medium.

### 3. Picking the same phrase twice tells screen readers nothing the second time

Claim: the status region is set to the phrase, and setting it to the text it already holds changes nothing in the page, so no second announcement is made.

File and line: `src/app/boards/board-screen.ts` lines 61 to 64.

Case: on Needs, press Help, then Help again. The probe counted one change to the status region after the first press and still one after the second. Requirement 21 says screen readers get the phrase when a cell is picked. Saying a thing twice is common, such as Yes, Yes or Help, Help. Clear on an empty message and Backspace on an empty message are silent in the same way. Feature 5 adds speech, but the status region stays as the only route for a screen reader.

Fix: empty the region and set the text on the next turn, or add and remove a hidden changing mark so the node changes each press. Add a unit case that presses a speak tile twice and expects the region to change twice.

Level: low.

### 4. The warning for a second tile says the first is kept when the first was skipped

Claim: when the first of two tiles with one id is faulty, both are dropped, and the warning for the second says the first was kept.

File and line: `src/app/boards/board-data.ts` lines 292 to 295. The boards have the same code at line 317.

Case: `cells.json` holds a tile `help` with the colour `pink`, then a sound tile `help`. The warnings read "The tile "help" was skipped: its colour "pink" is not known." and "A second tile "help" was skipped: the first tile with that id is kept." No tile `help` is kept, and every Help cell is gone. Requirement 36 says the first is kept, and it does not say what happens when the first is faulty. The person fixing the data reads a line that is false. R2 and R3 only cover two sound tiles.

Fix: either keep the first sound tile with an id, or change the text to say that the id was already used. Add a case for a faulty first tile.

Level: low.

### 5. The Material icons ship without a copy of their licence

Claim: the Apache License 2.0 asks that anyone who gets the work also gets a copy of the licence, and the built app carries the icon drawings with no licence text and no credit.

File and line: `src/app/cells/icon.ts` from line 56, where the eight Material cases start, and `README.md` line 29.

Case: the README names the licence and links to it. The build in `dist/` holds the eight Material drawings and nothing about them. `public/symbols/ATTRIBUTION.txt` ships with the app and covers Mulberry and OpenMoji only. Feature 8 plans a visible credit for Mulberry, and no feature or open question tracks the Material icons. This matters at the public release in feature 13. I am not a lawyer.

Fix: add a licence file that ships with the app, such as `public/licenses/material-icons.txt` with the Apache text and the source, and add the Material credit to the feature 8 line in `specs/roadmap.md`.

Level: low.

### 6. plan.md and validation.md still describe the feature before the later decisions

Claim: three lines in the feature's own files give counts that the code no longer matches.

File and line: `specs/features/02-home-screen-from-data/plan.md` lines 14 and 34, `validation.md` line 161.

Case: the plan says twelve boards and seven line icons. The data has fourteen boards and `icon.ts` draws eighteen icons, after requirements 51 to 53. validation.md says "Every board" means home and the eleven other boards, while the tests cover fourteen and check M3 in the same file says fourteen. The specs are the source of truth, and validate reads these lines next.

Fix: change the three lines to fourteen boards, eighteen icons and thirteen other boards, and add `yes-no` and `core-words` to the list in plan step 2.

Level: low.

## Votes

Tallied on 2026-11-16. Five voters checked each finding against the code. None of them ran the probe.

### Kept, in order

1. **Finding 1. Two fast presses of Back skip a screen.** Five voted valid. Level: medium. No corrections.
2. **Finding 2. A press that starts on a symbol and moves a little is lost.** Five voted valid. Level: medium. Four gave medium and one gave low, because the fault touches pointer users and not the switch path. One voter noted that touch is less likely to hit it than a mouse.
3. **Finding 4. The warning for a second tile says the first is kept when the first was skipped.** Five voted valid. Level: low. One voter read the `pink` tile as a claim about the shipped data. It is an example input. The shipped `cells.json` has no such tile.
4. **Finding 3. Picking the same phrase twice tells screen readers nothing the second time.** Five voted valid. Level: low. No corrections.
5. **Finding 5. The Material icons ship without a copy of their licence.** One voted valid and four voted partly. Level: low. The voters confirmed that no licence text ships and that no roadmap item tracks it. They said the duty only bites at the public release in feature 13, and one said the wording on the legal need is a little strong. One voter counted nine cases from line 56 of `icon.ts`. The ninth is `caps`, which is copied from the keyboard mockup and is not a Material icon.
6. **Finding 6. plan.md and validation.md still describe the feature before the later decisions.** Five voted valid. Level: low. Manual check M3 is at line 238 of validation.md and its step is at line 240.

### Dropped

None.

## After the fixes

The six findings were fixed on 2026-11-16, and `make check` passes with 99 unit tests and 100 end to end tests. The probe was run again on the new build.

Finding 1 is only partly solved. Two presses in the same instant now land on My boards. A real double click still lands on Home. The first click opens My boards before the second click arrives, and the Back tile of My boards sits in the same place, so the second click presses it. The code does what it is told. Stopping this needs a rule that ignores presses for a short time after a screen changes, and no spec sets one.
