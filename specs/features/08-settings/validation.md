# Feature 8: Settings. Validation

The numbers in brackets are the items in requirements.md that a check covers. Unless a case says otherwise, the selection mode is `scan`, the theme is `blue`, the layout is `columns`, and the tests offer two English voices named Voice A and Voice B and one French voice. Voice A is the default voice. "The panel" is the settings panel.

## Automated checks

### A1. Build

Command: `npm run build`

- The build ends with no errors and no warnings.
- `specs/tech-stack.md` names the style budget of a component, a warning at 8 kB and an error at 16 kB, and says why it was raised. This covers finding 6 of review.md.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. Unit tests (1 to 8, 14, 16, 18 to 28)

Command: `npm test`

The voice values, in `src/app/speech/voice-settings.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| VO1 | Nothing is stored. `load()`. | The voice id is empty, and the rate, the pitch and the volume are 1. |
| VO2 | `symple.voice` holds "b", `symple.voiceRate` "1.5", `symple.voicePitch` "0.8" and `symple.voiceVolume` "0.5". `load()`. | The four values are "b", 1.5, 0.8 and 0.5. |
| VO3 | The stored rate is "3", the stored pitch is "-1" and the stored volume is "loud". `load()`. | The rate, the pitch and the volume are 1. |
| VO4 | `set({ rate: 0.5 })`. | The rate is 0.5, and `symple.voiceRate` holds "0.5". |
| VO5 | `set({ rate: 2.5 })`. | The rate does not change, and nothing is stored. |
| VO6 | Writing storage throws. `set({ volume: 0.3 })`. | The volume is 0.3, and nothing is thrown. |

The system voice source, in `src/app/speech/system-voice-source.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| VS13 | The source is made with the three voices. | `voices` holds Voice A and Voice B with their ids, and not the French voice. |
| VS14 | The list of voices is empty, and `voiceschanged` then brings the three voices. | `voices` is empty first, and then holds Voice A and Voice B. |
| VS15 | `speak` with the text "Hello", the id of Voice B, a rate of 1.5, a pitch of 0.8 and a volume of 0.5. | One utterance is spoken with Voice B and those three values. |
| VS16 | `speak` with an id that is not in the list. | The utterance uses Voice A, the voice of the rule of feature 5. |
| VS17 | `inUse('')`, and `inUse` with the id of Voice B. | The results are the id of Voice A and the id of Voice B. |

The speech service, in `src/app/speech/speech.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| SP8 | The voice values are the id of Voice B, 1.5, 0.8 and 0.5. `say('Hello')`. | The fake gets "Hello" with those four values. |

The scan values, in `src/app/scan/scan-settings.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| T16 | The text "2000" is given for the scan time, as the cloud holds it. | The scan time is 2000, `symple.scanTime` holds "2000", and the method says the value was used. |
| T17 | The text "99999" is given for the scan time, and "maybe" for Show progress bar. | Neither value changes, nothing is stored, and the method says the values were not used. |

The sync, in `src/app/sync/settings-sync.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| Y16 | The cloud reports a document with all twelve fields, with a scan time of "2000", a selection mode of "dwell" and a rate of "1.5". | The device uses 2000, `dwell` and 1.5, and nothing is saved. |
| Y17 | The cloud reports a document with only a theme and a layout. | The ten new fields are saved with the values of the device, each as text, and only if the cloud still lacks them. |
| Y18 | The scan time is set to 2500 on the device. | One save holds only `scanTime` with "2500". |
| Y19 | The volume is set to 0.4 on the device. | One save holds only `voiceVolume` with "0.4". |
| Y20 | The cloud reports a scan time of "99999" and a dwell style of "spin". | The device keeps its scan time and its dwell style, and neither is saved back. |
| Y21, added during implement | The scan time is set to 2000 and then to 2500 on the device, and the cloud reports a scan time of "2000" before it has answered the two saves. | The device keeps 2500. After the cloud has answered, a reported scan time of "3000" is used. This case covers a fault that the end to end tests found: the report of a save undid the next change. |

The board behind the panel, in `scan.spec.ts`, `switches.spec.ts`, `dwell.spec.ts` of `src/app/scan/` and in `src/app/boards/board-screen.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| PB1 | The scan highlights the second group, and the panel opens. | The scan is at rest, and it stays at rest after ten scan times. |
| PB2 | The panel is open, and Tab and then Enter are pressed. | The scan does not move, nothing is picked, and neither key has its default action stopped. |
| PB3 | The panel is closed, and Control with comma is pressed. | The panel is open, and the scan did not move. |
| PB4 | The panel closes, and Enter is pressed. | The scan starts at the first group, as it does after a load. |
| PB5 | The mode is `dwell`, a dwell runs on a cell, and the panel opens. | The dwell is dropped, and no cell is pressed after the dwell time. |
| PB6 | The mode is `cursor`, the pointer has moved, and the panel opens. | No round cursor is drawn, and the page has no `data-cursor`. Both come back when the panel closes. |
| PB7 | The scan time is set to 3000 while the scan runs, with the panel closed. | The next step of the scan comes 3000 ms after the last one. |

The panel, in `src/app/settings/settings-panel.spec.ts`, with the fakes of the auth source and the voice source:

| Case | Input | Expected result |
| --- | --- | --- |
| PA1 | The panel opens. | A dialog named "Settings" is shown with the five tabs Selection, Speech, Appearance, Account and About. Selection is chosen and holds the focus. |
| PA2 | The Down arrow is pressed on the Selection tab, and then End and Home. | Speech, About and Selection are chosen in turn, each takes the focus, and only the settings of the chosen tab are shown. |
| PA3 | The selection mode is changed to "Dwell". | The stored mode is `dwell`, the panel shows no note, the dwell time and the dwell style show, and the scan time and Show progress bar do not. |
| PA4 | The scan time is 1500, and "Longer scan time" is pressed once. | The scan time is 2000, and the control reads "2.0 s". |
| PA5 | The scan time is 500. | "Shorter scan time" carries `aria-disabled="true"`, and a press on it changes nothing. |
| PA6 | The post click delay is 500, and "Shorter post click delay" is pressed once. | The delay is 0, and the button carries `aria-disabled="true"`. |
| PA7 | The scan time is stored as 1250, and "Longer scan time" is pressed once. | The scan time is 1500. |
| PA8 | Show progress bar is pressed. | The stored value is `true`, and the switch is checked. |
| PA9 | In `dwell` mode, the dwell style "Bar" is chosen. | The stored dwell style is `bar`. |
| PA10 | Nothing is stored for the voice, and the Speech tab is opened. | The list holds Voice A and Voice B, Voice A is chosen, and `symple.voice` is still empty. |
| PA11 | Voice B is chosen, and "Faster rate" is pressed five times. | The stored voice is the id of Voice B, the stored rate is 1.5, and the text between the buttons reads "1.5×". |
| PA12 | "Higher volume" is pressed at 100%. Then "Lower volume" is pressed five times, and then six times more. | "Higher volume" says it is disabled and the volume stays at "100%". After five presses the text reads "50%" and the stored volume is 0.5. After the rest the text reads "0%", the stored volume is 0, and "Lower volume" says it is disabled. |
| PA12b | "Slower rate" is pressed five times, and "Higher pitch" ten times. | The stored rate is 0.9, 0.8, 0.7, 0.6 and 0.5 in turn, with no rounding error. The stored pitch is 2 and the text reads "2.0". |
| PA13 | After case PA11, Play a sample is pressed. | The fake gets "Hello. This is my voice." with Voice B and a rate of 1.5. |
| PA14 | The stored voice id is not in the list. | Voice A is chosen in the list, and the stored id does not change. |
| PA15 | On the Appearance tab, the theme "Teal" is chosen. | The html element carries `data-theme="teal"`, and the tab has no Layout row. |
| PA16 | The account has the email address "carer@example.com", and the Account tab is opened. | The tab shows "Signed in as" with that address. |
| PA17 | Sign out is pressed. | The fake auth source gets one sign out, and the panel is closed. |
| PA18 | The About tab is opened. | It shows the three credits of item 27 of requirements.md, with "Javed Gangjee", "Mulberry Symbols", "CC BY-SA 4.0", "Lucide" and "ISC License" in them. The words "OpenMoji" and "Material" are not in the panel. This case named "Apache License 2.0" until item 35 of requirements.md replaced the Material icons. |
| PA19 | Done is pressed, and in a second run Escape is pressed. | The panel is closed each time. |
| PA20 | The panel is drawn. | It has no tab named Boards and no tab named Keyboard. |
| PA21, added after the review | A press starts on the dimmed page and ends there. In a second run, a press starts on a control of the panel and its click reaches the dimmed page. | The panel is closed after the first run, and it stays open after the second. This case covers finding 2 of review.md, a drag out of the panel that closed it. |
| PA22, added after the review | In `dwell` mode the dwell time is 1000, and "Longer dwell time" is pressed once. | The dwell time is 1500, and the control reads "1.5 s". With cases PA4 to PA7, which press the steppers of the scan time and the post click delay, this case shows that the three steppers still work after finding 4 of review.md joined their markup. |

The shell, in `src/app/shell/header.spec.ts` and `footer.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| H3, changed | The header is drawn. | The button named "Settings" is enabled, is not a tab stop, and carries `data-caregiver-control` and `aria-keyshortcuts="Control+,"`. |
| H4 | The settings button is pressed. | The panel is open, and the button carries `aria-expanded="true"`. |
| O1, changed | The footer is drawn. | It holds no button. |
| O2, removed | This case pressed Sign out in the footer. Case PA17 takes its place. | |

### A4. End to end tests (1 to 10, 14, 16 to 24, 27 to 31, 34)

Command: `npm run e2e`

The cases are in `e2e/settings.spec.ts` and run at both window sizes, 1024 by 768 and 1440 by 900.

| Case | Input | Expected result |
| --- | --- | --- |
| ST1 | On home, the settings button is pressed. | The panel is shown at about 80 parts in 100 of the width of the window and 95 of its height, and nothing in it runs past the window. |
| ST2 | On home, Control with comma is pressed. Then Tab is pressed until the focus comes round, and Escape is pressed. | The panel opens. The focus visits the chosen tab, each control of the Selection settings and Done, and never leaves the panel. Escape closes it. |
| ST3 | On home in `scan` mode, the scan runs through every group and cell for two rounds. | The highlight never lands on the settings button, and the panel never opens. |
| ST4 | The panel is open on home, and ten scan times pass. Then Tab and Enter are pressed on a control of the panel. | No group and no cell is highlighted, and the title still reads "Home". |
| ST5 | The scan time is set to 3.0 s in the panel, the panel is closed, and Enter starts the scan. | The highlight moves to the second group after 3000 ms and not before. |
| ST6 | The selection mode is changed to "Step, two switches", and the panel is closed. | Tab moves the highlight and no time moves it, with no reload. |
| ST7 | The theme "Purple" is chosen. | The page behind the panel carries `data-theme="purple"` at once, and it still does after a reload. |
| ST8 | Removed on 2026-11-23 with the layout control. | Cases B2 and the others of `e2e/boards.spec.ts` still check the two layouts from the stored value. |
| ST9 | Voice B is chosen, and a rate of 1.5, a pitch of 0.8 and a volume of 0.5 are set with the minus and the plus buttons, the panel is closed, and Help is picked on Needs by scan. | The stand-in records "I need help" with Voice B and those three values. |
| ST10 | Play a sample is pressed. | The stand-in records "Hello. This is my voice." |
| ST11 | Each of the five tabs is opened in each of the five themes. | axe reports no WCAG 2.2 Level AA violation. |
| ST12, changed after the review | Each of the five tabs is opened in each of the five themes, with the Needs board behind the panel. | Each label and value keeps 4.5 to 1 against the panel, and the border of each control keeps 3 to 1. The voice sliders of finding 1 of review.md were replaced by buttons on 2026-11-23, and the check reads those buttons like any other. |
| ST13 | Each tab is opened. | Every button, list, switch row and tab is at least 48px high and wide. |
| ST14 | The window is 800 by 768, and the panel is opened. | The tabs lie in one row above the settings, the list of tabs says it is horizontal, and the Right arrow moves to the next tab. |
| ST15 | Less transparency is asked for, and the panel is opened. | The panel is solid and has no blur. |
| ST16 | The mode is `cursor`, and the panel is opened. | No round cursor is drawn over the panel. |
| ST17 | The mode is `dwell`, the panel is open, and the pointer rests on Done for 5000 ms. | The panel stays open. |
| ST18 | The footer of home is drawn. | It holds no button, and the main area is as high as it was with the Sign out button. |
| ST19 | The Core words board is opened, and the files `symbols/stop.svg` and `symbols/ATTRIBUTION.txt` are fetched. | The stop cell shows its symbol at its full size. The svg file does not hold the id "emoji" of the OpenMoji drawing, and the attribution file does not hold the word "OpenMoji". |
| ST20, added after the review | The panel is open, and the dimmed page next to it is pressed. | The panel is closed. |
| ST21, added after the review | The panel is open. The pointer goes down on the label of Selection mode, moves onto the dimmed page and goes up there. | The panel stays open. This case and case ST20 cover finding 2 of review.md. |

Changed cases in other files:

| Case | Input | Expected result |
| --- | --- | --- |
| N14 of `e2e/sign-in.spec.ts`, changed | The panel is opened, the Account tab is chosen, and Sign out is pressed. The page is then reloaded. | The sign in screen shows, and it stays after the reload. |
| N15 of `e2e/sign-in.spec.ts`, removed | This case checked that Sign out sits in the bottom right corner of the footer. Cases ST18 and ST2 take its place. | |
| B18 of `e2e/boards.spec.ts`, changed | The file `licenses/lucide.txt` is fetched. | The file is served and holds "ISC License". This case fetched the licence of the Material icons until item 35 of requirements.md removed them. |
| K20 of `e2e/scanning.spec.ts`, changed | In `dwell` mode the pointer rests on the settings button for 5000 ms. | No dwell runs, the panel stays closed, and the title reads "Home". |

## Manual checks

Run `npm start`, open the app in Chrome on the Mac and sign in.

### H1. The look (11, 27, 29, 30, 31, 34)

1. Open `context/design/home-settings.html?open=selection` in a second window.
2. In the app, open the panel and go through the five categories in each of the five themes.
3. Expected: the panel matches the mockup in layout, sizes and colours. The app has no Boards and no Keyboard category, it opens on Selection, and About has no line for the stop symbol.
4. Open the Core words board and look at the stop cell.
5. Expected: the cell shows a red octagon with a white hand, which reads as stop next to the Mulberry symbols.

### H2. The keyboard and a screen reader (9, 10, 14)

1. Turn VoiceOver on. On home, press Control with comma.
2. Go through every category and change one control in each, with the keyboard only. Close the panel with Escape.
3. Expected: VoiceOver says "Settings" and the chosen category when the panel opens. It says the name and the new value of every control, with times as "seconds". The focus never leaves the panel while it is open.

### H3. Changes take effect at once (2, 3, 16, 18)

1. With a real switch or the Enter key, start the scan on Needs.
2. Open the panel, set the scan time to 3.0 s and turn Show progress bar on. Close the panel and press the switch.
3. Expected: the scan rested while the panel was open. It now moves every 3 seconds and shows the bar, with no reload.

### H4. The voice (4, 22, 23, 24)

1. On the Speech tab, pick a second voice and press Play a sample. Change the rate, the pitch and the volume, and play it after each change.
2. Close the panel and pick Help on Needs.
3. Expected: the sample and the phrase use the chosen voice and the three values. The list holds only English voices.

### H5. A long text with a server voice (15)

1. Pick a Google voice in the list. On the keyboard, write a message that takes more than 20 seconds to speak, and pick the message.
2. Do the same with a voice of the Mac, such as Samantha.
3. Expected: write down, for each voice, whether the message was spoken to its end. This check passes when both results are written down in tech-stack.md. A cut is not a failure of this feature.

### H6. The sync (7, 26)

1. In the Firebase console, open the document `users/{uid}` of the account.
2. In the app, change the scan time, the selection mode and the rate.
3. In the console, change `theme` to "teal" and `scanTime` to "2500".
4. Expected: after step 2 the document holds the twelve fields as text, with the new values. After step 3 the app turns teal and the panel shows a scan time of 2.5 s, with no reload.

### H7. Sign out (6, 28)

1. Open the panel, go to Account and check the email address. Press Sign out.
2. Expected: the address is the one of the account. The sign in screen shows, and the footer of home held no button before.

## Results, 2026-11-23

The checks ran on Node 22.23.5, the version in `.nvmrc`, on commit d92bb5f of the branch `feature/08-settings`. That commit holds the seven changes of item 36 of requirements.md, which lists the user's decisions of 2026-11-23. Step 12 of plan.md, which fixes four findings of the review, has not been implemented yet.

### Automated checks

- Check A1, the build: fail. `npm run build` ended with no errors and no warnings. The second point fails: `specs/tech-stack.md` does not name the style budget of a component or say why it was raised, which finding 6 of review.md asks for.
- Check A2, lint and format: pass. `npm run lint` and `npm run format:check` both ended with no errors.
- Check A3, the unit tests: fail. All 338 tests in 27 files passed, but two listed cases have no test. Case PA21, which checks that a press on the dimmed page closes the panel and a drag out of the panel does not, is missing. Case PA22, which checks the stepper of the dwell time after the three steppers share one block of markup, is missing.
- Check A4, the end to end tests: fail. All 247 tests passed in one run, with no retry, but two listed cases have no test. Case ST20, which presses the dimmed page next to the panel and expects the panel to close, is missing. Case ST21, which drags from the label of Selection mode onto the dimmed page and expects the panel to stay open, is missing.
- The four changed cases in other files pass: case N14, which signs out through the panel, case B18, which fetches the Lucide licence, case K20, which rests the pointer on the settings button in `dwell` mode, and the removal of case N15, which checked the place of Sign out in the footer.

### Manual checks

Checks H1 to H7 were not run. H1 compares the look with the mockup, H2 uses the keyboard and VoiceOver, H3 checks that changes apply at once, H4 checks the voice, H5 speaks a long text with a server voice, H6 checks the sync in the Firebase console, and H7 checks Sign out. The automated checks already fail, and the fixes of step 12 of plan.md change the panel again, so the user would have to repeat each manual check after them.

Two manual checks need a note before they are run. Check H1 expects the panel to match the mockup, and the panel now differs from it on purpose in the ways that item 36 of requirements.md lists. Check H4 changes the rate, the pitch and the volume, which is now done with the minus and the plus buttons.

### Requirements

- Items 1 to 8, 14, 16 and 18 to 28 are covered by passing unit cases, and items 9, 10, 17, 29, 30, 31 and 34 by passing end to end cases. Item 18 says that Done, Escape and a press on the dimmed page close the panel. Case PA19 passes for Done and Escape. The press on the dimmed page has no passing check, because cases PA21, ST20 and ST21 are missing.
- Item 36, the decisions of 2026-11-23, passes through cases PA3, PA11, PA12, PA12b and PA15 of the unit tests and cases ST1, ST9 and ST10 of the end to end tests. Its last point, that each row is a fifth higher, has no check. `src/app/settings/settings-panel.css` sets the least height of a row to 4.2rem.
- Item 35, the Lucide icons, passes through case PA18, which reads the credits, and case B18, which fetches the licence.
- Items 11 and 15 have manual checks only, H1 and H5, which were not run.
- Items 12, 13, 32 and 33 have no check of their own. Item 12 says the feature adds no cloud service, item 13 records the patent check, item 32 says the tests make no sound, and item 33 names files that exist.

### Verdict

The feature is not ready. Three things stand in the way.

1. Step 12 of plan.md is not implemented. It fixes finding 2 of review.md, a drag out of the panel that closes it, and finding 4, the stepper markup that is written out three times, and it records the style budget in `specs/tech-stack.md` for finding 6. Cases PA21, PA22, ST20 and ST21 come with it. The stepper markup is now written out four times, because the rate, the pitch and the volume use a fourth copy.
2. The press on the dimmed page, part of item 18 of requirements.md, has no passing check until those cases exist.
3. The manual checks H1 to H7 have not been run.

## Results of the manual checks, 2026-11-23

The user reported these results after the merge, with no other detail. They replace the line of the section above that says checks H1 to H7 were not run. The automated results above do not change.

- Check H1, which compares the look of the panel with the mockup and looks at the stop symbol: pass.
- Check H2, which uses the panel with the keyboard only and listens with VoiceOver: not run. It is the only check of this file that was not run.
- Check H3, which checks that a changed scan time and the progress bar apply at once: pass.
- Check H4, which plays the sample and a phrase with the chosen voice, rate, pitch and volume: pass.
- Check H5, which speaks a long text with a Google voice and with a voice of the Mac: pass. The user did not report whether either voice was cut off, so `specs/tech-stack.md` still has no answer on a cut after about 15 seconds.
- Check H6, which checks the sync of the twelve fields in the Firebase console: pass.
- Check H7, which checks the email address and Sign out on the Account tab: pass.

Items 11 and 15 of requirements.md, the look of the panel and the answer on a cut of a server voice, now have a passing check. Items 9, 10 and 14, on the keyboard and screen readers, keep their passing end to end cases ST2, which goes round the panel with Tab, and ST11, the axe check, and wait for check H2 to be heard with VoiceOver.

## Results of step 12, 2026-11-23

Step 12 of plan.md was implemented after the merge, on the branch `feature/09-board-editing`, on the user's instruction. The checks ran on Node 22.23.5.

- Finding 2 of review.md, a drag out of the panel that closed it: fixed. The panel closes only when a press starts and ends on the dimmed page. Case PA21 of the unit tests and cases ST20 and ST21 of the end to end tests pass. They press the dimmed page, and drag from the label of Selection mode onto it.
- Finding 4 of review.md, the markup of the minus and plus buttons: fixed. One component, `src/app/settings/stepper.ts`, draws the three times and the rate, the pitch and the volume. Case PA22, which presses "Longer dwell time", passes with cases PA4 to PA7 and PA11 to PA12b, which press the other steppers.
- Finding 6 of review.md, the style budget: `specs/tech-stack.md` has named the budget and its reason since the replan after this feature, so the second point of check A1 passes.
- Check A3, the unit tests: pass. All 340 tests in 27 files passed.
- Check A4, the end to end tests: pass. The 41 tests of `e2e/settings.spec.ts` passed after case ST5, which reads the scan time in the panel, was pointed at the new component. The full run before that change had 249 passes and 2 failures, both case ST5 at the two window sizes.

Every automated check of this file now passes, and the press on the dimmed page of item 18 of requirements.md has a passing check. Check H2, the keyboard and VoiceOver, is still not run.
