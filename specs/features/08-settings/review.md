# Feature 8: Settings. Review

## What I ran and what I only read

I ran these on the uncommitted work of the branch `feature/08-settings`:

- `npm test`: 27 files and 337 tests passed.
- `npm run lint` and `npm run format:check`: both clean.
- `npm run build`: no errors and no warnings.
- `npm run e2e`: 249 tests passed.
- Five probe tests of my own, in a scratch folder outside the repo with a Playwright config of its own, against the dev server. They pressed, dragged and read pixels in the open panel. They changed no file of the repo.

The probes cleared two suspicions. A dwell does not start on the cell under a still pointer when the panel closes, and a slider drag that ends past the edge of the panel leaves the panel open.

I read the specs, the whole diff against `main` and the new files. I did not do the manual checks H1 to H7 of validation.md. I did not use VoiceOver, and I did not compare the panel with the mockup by eye.

## Findings

### 1. The unfilled part of each voice slider has a border of about 2:1, and case ST12 leaves the sliders out

- **File:** `src/app/settings/settings-panel.css`, lines 468 to 475, and `e2e/settings.spec.ts`, lines 254 to 261.
- **Case:** On the Speech tab over the Needs board, with the volume at 20%, I read the pixels of the slider. The thumb and the filled part are dark. The rest of the track is drawn by Chrome as a pale grey bar with a border of rgb(178, 178, 178) on a card of rgb(251, 251, 253). That is about 2.05 to 1, under the 3 to 1 of WCAG 1.4.11. At a low value most of the track is this faint bar, so the caregiver cannot see where the range ends. Case ST12, which checks that each label keeps 4.5 to 1 and the border of each control keeps 3 to 1, skips every range input with the comment that CSS cannot read its colours. So the check passes while the sliders do not meet what it claims.
- **Fix:** Style the track with `::-webkit-slider-runnable-track` and the thumb with `::-webkit-slider-thumb`, using `--line` for the track border as the other controls do. Then let ST12 read the track by its known colours in place of skipping it.
- **Level:** medium.

### 2. A drag that starts inside the panel and ends on the dimmed page closes the panel

- **File:** `src/app/settings/settings-panel.ts`, lines 195 to 200, and `src/app/settings/settings-panel.html`, line 12.
- **Case:** The caregiver selects the note under Selection mode with the mouse, to copy it, and lets go a little to the left of the panel. Chrome sends the click to the nearest element that holds both ends of the drag, which is the dialog. `onDialogClick` sees the dialog as the target and closes the panel. My probe confirmed this. The same happens to any drag that ends in the margin round the panel, such as selecting the email address on the Account tab. Item 18 of requirements.md says a press on the dimmed page closes the panel, and no test at any level presses the dimmed page, so this path has no test at all.
- **Fix:** Note the target of `pointerdown` on the dialog, and close only when both the pointer down and the click had the dialog itself as the target. Add an end to end case that presses the dimmed page and one that drags from the panel onto it.
- **Level:** low.

### 3. A stored time that is not on a step is shown rounded, so the panel shows a value the scan does not use

- **File:** `src/app/settings/settings-panel.ts`, lines 246 to 249.
- **Case:** `seconds` uses `toFixed(1)`. A scan time of 1250 ms shows as "1.3 s", and a screen reader hears "1.3 seconds", while the scan moves every 1.25 seconds. One press on "Shorter scan time" then goes to "1.0 s", a step of 0.3 on screen where every other press is 0.5. Such a time comes from the sync or from local storage, which README.md still tells the reader to edit in milliseconds. Case PA7, which checks that 1250 moves to 1500 on a press of "Longer scan time", tests the press and not the text shown before it.
- **Fix:** Show two decimal places when the time is not a whole tenth of a second, or move the time to the nearest step when it is loaded. Add the shown text to case PA7.
- **Level:** low.

### 4. The markup of the time stepper is written out three times

- **File:** `src/app/settings/settings-panel.html`, lines 116 to 143, 171 to 197 and 229 to 255.
- **Case:** The scan time, the dwell time and the post click delay each repeat about 28 lines: two buttons, their labels, `aria-disabled`, the two icons and the `output` with its hidden unit. They differ only in the name of the time and its label. A fix to one, such as the rounding of finding 3 or a change to what a screen reader hears, has to be made three times, and one copy is easy to miss. The sliders in the same file already come from one `@for` over `SLIDERS`.
- **Fix:** Draw the stepper from one `@for` over a list of the three times with their labels, as the sliders do, or move it into a small component. The `@if` blocks for the scan mode and the dwell mode can choose which times go in.
- **Level:** low.

### 5. The empty footer is still a landmark, so screen readers list a footer with nothing in it

- **File:** `src/app/shell/footer.ts`, line 10.
- **Case:** The template is now `<footer></footer>` at the top level of the page, which gives it the role of the content information landmark. A VoiceOver user who moves through the landmarks of home finds a footer, enters it and hears nothing. Item 28 of requirements.md keeps the footer for its height until feature 9 puts buttons in it, which is fine for the layout but gives a screen reader an empty stop.
- **Fix:** Give the element `role="presentation"`, or use a `div` with the same class, until feature 9 adds the board editing buttons.
- **Level:** low.

### 6. The style budget of every component was doubled, and the plan does not say so

- **File:** `angular.json`, lines 41 and 42.
- **Case:** The limit for the styles of one component went from a warning at 4 kB and an error at 8 kB to a warning at 8 kB and an error at 16 kB. The change was needed for the CSS of the panel, but it applies to every component, so a header or a cell can now grow to twice its old size without a warning. Neither plan.md nor tech-stack.md records the change or its reason.
- **Fix:** Note the change and its reason in the plan, and keep the lower limit for the other components if the build allows it, for example by moving the shared rules of the panel into a global stylesheet.
- **Level:** low.

## Votes, 2026-11-23

Five voters checked each finding against the code. None of them ran the app, so the measured contrast in finding 1 and the drag in finding 2 rest on the reviewer's own runs.

Kept findings, in order:

1. Finding 1, the unfilled part of each voice slider has a border of about 2:1 and case ST12, which checks the contrast of the panel, leaves the sliders out. Votes: 3 valid, 2 partly, 0 invalid. Level: medium. The voters corrected one fact: the cited line numbers in `settings-panel.css` are off by a few lines.
2. Finding 2, a drag that starts inside the panel and ends on the dimmed page closes the panel. Votes: 5 valid. Level: low.
3. Finding 3, a stored time that is not on a step is shown rounded, so the panel shows a value the scan does not use. Votes: 3 valid, 2 partly. Level: low. Two voters noted that the panel itself only writes times on a step, so the case needs a value edited by hand or synced.
4. Finding 6, the style budget of every component was doubled and the plan does not say so. Votes: 4 valid, 1 partly. Level: low.
5. Finding 5, the empty footer is still a landmark, so screen readers list a footer with nothing in it. Votes: 2 valid, 3 partly. Level: low. Three voters noted that item 28 of requirements.md keeps the footer empty on purpose until feature 9, and that a fix now would be undone then.
6. Finding 4, the markup of the time stepper is written out three times. Votes: 5 valid. Level: low.

Dropped findings: none.

The voters found no statement of fact in the review that is false.
