# Feature 8: Settings. Plan

The steps run in order. Each step names the files it creates or changes. The numbers in brackets are the items in requirements.md.

## Step 1. Store the four voice values (4, 23, 25)

- Creates `src/app/speech/voice-settings.ts` and `voice-settings.spec.ts`. The `VoiceSettings` service holds the voice id, the rate, the pitch and the volume as signals, with `load` and `set`, in the way that `src/app/scan/scan-settings.ts` holds the scan values. A value that is missing or out of range gives its default.
- Changes `src/app/app.config.ts` to load the voice values before the first screen is drawn.

## Step 2. Let the voice source list voices and take the four values (4, 22)

- Changes `src/app/speech/voice-source.ts`. The interface gains `voices`, a signal of the English voices with a name and an id each, and `inUse(id)`, which gives the id of the voice that a text would be spoken with. `speak` takes the voice id, the rate, the pitch and the volume next to the text.
- Changes `src/app/speech/system-voice-source.ts` and `system-voice-source.spec.ts`. The source fills the list when it is made and again on each `voiceschanged` event. It speaks with the voice of the given id, or with the voice of the rule of feature 5 when the id is empty or not in the list. It sets the rate, the pitch and the volume on the utterance.
- Changes `src/app/speech/fake-voice-source.ts`, which records the four values with each text and holds a list of voices that a test sets.
- Changes `src/app/speech/speech.ts` and `speech.spec.ts`. `say` passes the values of `VoiceSettings` to the source.

## Step 3. Let the sync cover the ten new values (7, 25, 26)

- Changes `src/app/scan/scan-settings.ts` and `scan-settings.spec.ts`. A new method takes one value as text, as the cloud holds it, and uses and stores it only when `load` would accept it. The comment that says the values are not synced is removed.
- Changes `src/app/sync/settings-sync.ts` and `settings-sync.spec.ts`. The six scan values and the four voice values join the table of synced settings.
- `src/app/sync/cloud-store.ts`, `firestore-cloud-store.ts` and `firestore.rules` do not change, because every field is still text in the same document.

## Step 4. Say when the panel is open, and quiet the board behind it (8, 16, 19)

- Creates `src/app/settings/settings-open.ts`. The service holds one signal that says whether the panel is open, with `open` and `close`.
- Changes `src/app/scan/scan.ts` and `scan.spec.ts`. The scan goes to rest when the panel opens and stays at rest until the panel is closed.
- Changes `src/app/scan/switches.ts` and `switches.spec.ts`. While the panel is open, no key is a switch key. Control with the comma key opens the panel, and it is never a switch key.
- Changes `src/app/scan/dwell.ts` and `dwell.spec.ts`. No dwell starts while the panel is open, and a dwell that runs is dropped when it opens.
- Changes `src/app/boards/board-screen.ts` and `board-screen.spec.ts`. The round cursor is not drawn and the page loses `data-cursor` while the panel is open.

## Step 5. Build the panel (1 to 6, 10, 11, 17 to 24, 27 to 31)

- Creates `src/app/settings/settings-panel.ts`, `settings-panel.html`, `settings-panel.css` and `settings-panel.spec.ts`. The panel is a native modal `dialog`, as in the mockup, so the browser makes the page behind it inert and closes it on Escape. It holds the list of five categories as tabs and the settings of the chosen category. The markup, the class names and the rules come from the mockup.
- The controls read and write `ScanSettings`, `VoiceSettings`, `Theme` and `Layout` directly, so each change applies at once. Play a sample calls `Speech.say`. Sign out calls `Auth.signOut` and closes the panel.
- The labels, the notes and the credits are written in the template. They are not boards or cells, so the data rule of tech-stack.md does not cover them.
- Changes `src/styles/glass.css`, which gains the value for the glass of the panel of item 29 of requirements.md, and its solid value for people who ask for less transparency.

## Step 6. Wire the panel into the shell (1, 6, 8, 14, 28)

- Changes `src/app/shell/header.ts`, `header.html`, `header.css` and `header.spec.ts`. The settings button is no longer disabled. A press opens the panel. The button keeps `data-caregiver-control` and stays out of the tab order, and it gains `aria-haspopup`, `aria-expanded`, `aria-keyshortcuts` and a tooltip that names the shortcut.
- Changes `src/app/app.ts` and `app.html`. The shell draws the panel once, outside the header, on every screen that is not bare.
- Changes `src/app/shell/footer.ts`, `footer.css` and `footer.spec.ts`. The Sign out button and its rules are removed. The footer stays, empty, with its height.

## Step 7. Write the end to end tests (1 to 10, 14, 16 to 24, 27 to 32)

- Changes `e2e/support/speech.ts` as item 32 of requirements.md says.
- Creates `e2e/settings.spec.ts` with the cases of validation.md.
- Changes `e2e/sign-in.spec.ts`. Case N14, which signs out and reloads, opens the panel and presses Sign out in the Account category. Case N15, which checks that Sign out sits in the bottom right corner of the footer, is removed, because the button is no longer there.
- Changes `e2e/scanning.spec.ts`. Case K20, which checks that a dwell never presses a caregiver control, points only at the settings button and expects the panel to stay closed.

## Step 8. Replace the stop symbol (27, 34)

- Replaces `public/symbols/stop.svg`. The OpenMoji drawing is deleted, and a new drawing made for Symple takes the same file name: a red octagon with a white raised hand, in a square view box like the Mulberry files.
- Changes `public/symbols/ATTRIBUTION.txt`. The five lines on OpenMoji are removed, and one line says that `stop.svg` was drawn for Symple.
- `src/data/cells.json` does not change, because the tile `core-stop` still names `stop.svg`.
- The mockup files under `context/design/` keep their own copies and their credit line, because they are not part of the app.

## Step 9. Update the docs (7, 14, 15, 16, 25, 34)

- Changes `specs/tech-stack.md`. The Data section lists the twelve fields of the Firestore document. The Input section says that all the values are synced, names the shortcut, and drops the sentence that says the caregiver controls do not meet WCAG 2.1.1. The Speech section names `voice-settings.ts`, the four keys and the rule for a stored voice that the device lacks.
- Changes `README.md` if it describes the Sign out button in the footer or the disabled settings button, and removes any credit for OpenMoji from it.

## Step 11. Replace every icon with a Lucide icon (35)

This step was added on 2026-11-22, during implement, on the user's instruction.

- Changes `src/app/cells/icon.ts`, `src/app/shell/header.html`, `src/app/settings/settings-panel.ts` and `settings-panel.html`, and `src/app/auth/sign-in-screen.html` and `sign-in-screen.css`. Each drawing is copied from Lucide 1.77.0 and names its Lucide icon in a comment.
- Creates `public/licenses/lucide.txt` and deletes `public/licenses/material-icons.txt`.
- Changes `README.md`, the Icons line of the About category and case PA18 of `settings-panel.spec.ts`, which checks the three credits.
- Changes case B18 of `e2e/boards.spec.ts`, which checks that the licence of the icons is served.

## Step 12. Fix four findings of the review (9, 18)

This step was added on 2026-11-23, after the review. The user picked findings 1, 2, 4 and 6 of review.md. Finding 3, a stored time that is shown rounded, and finding 5, the empty footer that is still a landmark, stay as they are.

- Finding 1 no longer applies. The sliders were replaced by minus and plus buttons on 2026-11-23, as item 36 of requirements.md says. The fix planned before that was: the unfilled part of each voice slider has a border of about 2 to 1. Changes `src/app/settings/settings-panel.css`. The panel draws the track and the thumb of each slider itself, with the WebKit and the Firefox pseudo elements. The border of the track uses `--line`, as the other controls do, and the thumb uses `--dark`. The slider keeps its height of 48px and its focus ring. Changes case ST12 of `e2e/settings.spec.ts`, which checks the contrast of the panel, so that it no longer leaves the sliders out.
- Finding 2, a drag that starts inside the panel and ends on the dimmed page closes the panel. Changes `src/app/settings/settings-panel.ts` and `settings-panel.html`. The panel notes where a press started, and it closes only when the press started and ended on the dimmed page. Changes `settings-panel.spec.ts` and `e2e/settings.spec.ts` with the new cases of validation.md.
- Finding 4, the markup of the time stepper is written out three times. Changes `src/app/settings/settings-panel.ts` and `settings-panel.html`. One block of markup draws the stepper, and the scan time, the dwell time and the post click delay each use it with their own name and label. What the caregiver sees and what a screen reader hears do not change. Changes `settings-panel.spec.ts` with the new case of validation.md.
- Finding 6, the style budget of every component was doubled and no document says so. Step 5 raised the `anyComponentStyle` budget in `angular.json` from a warning at 4 kB and an error at 8 kB to a warning at 8 kB and an error at 16 kB, because the styles of the panel are larger than 4 kB. Angular has one such budget for all components, so the panel cannot have a limit of its own. Changes `specs/tech-stack.md`, which records the limit and its reason.

## Step 10. Run everything

- Runs `make check` and fixes the failures.
