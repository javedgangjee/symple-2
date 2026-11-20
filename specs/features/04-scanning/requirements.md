# Feature 4: Scanning. Requirements

## What the feature must do

1. The app highlights the groups of a board in turn, and then the cells of the picked group in turn. A switch press picks the highlighted group or cell. Source: roadmap.md, feature 4. PRODUCT.md, Terms.
2. Scanning works with a single switch and with several switches. Source: PRODUCT.md, Capabilities and Accessibility and Inclusion.
3. A group is a column in the columns layout and a row in the rows layout. The scan follows the groups in the order of the data, and then the cells of a group in the order of the data. A board that fixes its own layout, as the keyboard does, is scanned in that layout. Source: tech-stack.md, Design reference.
4. Scanning skips caregiver controls. These are the settings button and the Sign out button, which carry the attribute `data-caregiver-control`. Source: PRODUCT.md, Principle 2. roadmap.md, decisions of 2026-11-17.
5. The sign in screen is not scanned. Source: roadmap.md, feature 4.
6. After a pick, the scan waits for a set time, called the post click delay, before it starts again. Switch presses in that time are ignored. Source: roadmap.md, feature 4. PRODUCT.md, Capabilities.
7. A switch reaches the app as a key press or a pointer press. Scanning is built in the app and does not use the scanning of the operating system. Source: tech-stack.md, Input.
8. The highlight follows the scan states of the home mockup, `context/design/home.html`. A highlighted group or cell has an ink outline. The cells outside the highlighted group are dimmed. While the cells of a group are scanned, the other cells of that group are dimmed less. A picked cell takes the confirmed look, with its colours swapped. Source: the home mockup.
9. Every screen for the primary user has an end to end test that reaches each target by single switch scanning. Today these screens are the home screen, the boards and the keyboards. Source: tech-stack.md, Tests.
10. Every scan state passes WCAG 2.2 Level AA in every theme. This covers the contrast of dimmed labels and of the outline. Source: PRODUCT.md, Accessibility and Inclusion.
11. Every cell can be reached and pressed with the keyboard alone, in the order it has on screen, and can be pressed with a pointer. Source: feature 2, requirement 6. WCAG 2.1.1.
12. The caregiver sets the scan time and the post click delay in feature 8. This feature reads the stored values and shows no control for them. Source: roadmap.md, features 4 and 8.

## Not in the specs. Assumed, and open to change

Items 13 to 36 are my choices, apart from the parts the user set on 2026-11-19. Those parts are the names of the selection modes in items 14 and 15, the keys and the tab order of items 13 and 23, the dwell press of item 28, the two dwell styles of item 30 and the scan time bar of item 36. Each other one needs the user's yes or a change. There is no item 35, because the user removed it on 2026-11-19.

13. **The switch keys.** Tab and Enter are the switches. Tab moves the highlight and Enter picks. Shift with Tab moves the highlight back by one. Space is not a switch, and on a board in `scan` and `step` mode it does nothing. A key that is held down counts once. The user set Tab in place of Space on 2026-11-19.
14. **The selection mode.** A stored setting named the selection mode says how the primary user selects. It has five values, which are `scan`, `step`, `cursor`, `touch` and `dwell`. The first four are in mission.md, and the user added `dwell` on 2026-11-19. It is stored on the device under `symple.selectionMode`, and `scan` is used when nothing is stored. Feature 8 needs a picker for it, which the roadmap line of feature 8 does not list yet.
    - **`scan`, for one switch.** The highlight moves by itself after each scan time, and Enter picks. Tab also moves the highlight on by one, and the scan time then starts again.
    - **`step`, for two switches.** Tab moves the highlight by one and Enter picks. Nothing moves by itself.
15. **`cursor`, `touch` and `dwell`.** In these three modes no group and no cell gets the scan highlight, and Tab and Enter are not switches. Tab moves the focus from cell to cell in the order of the data, with no group step, and Enter and Space press the focused cell, as the browser does by itself. The user presses a cell with a pointer or a finger, as today. `cursor` and `touch` behave the same in this feature, and feature 12, head tracker and eye gaze, gives `cursor` its own behaviour. `dwell` adds the dwell press of items 28 to 34.
16. **Pointer press in `scan` and `step`.** A pointer press on a cell presses that cell at once, as it does today, and the scan goes to rest with nothing in focus. A pointer press anywhere else does nothing. This feature does not treat a pointer press as a switch, although requirement 7 allows it, because the app cannot tell a switch from a tap on a cell.
17. **Rest.** When the app starts, nothing is highlighted and nothing moves. This is the rest state of the mockup. The first press starts the scan at the first group, and that press picks nothing.
18. **Passes with no pick.** In `scan` mode, when the highlight has gone through the cells of a group twice with no pick, the scan returns to the groups and carries on from that group. When it has gone through the groups twice with no pick, the scan goes to rest.
19. **Leaving a group in `step` mode.** A move past the last cell of a group returns to the groups, with that group highlighted. A move past the last group highlights the first group again.
20. **Short cuts.** Picking a group that holds one cell picks that cell. On a board with one group that holds cells, the scan goes through the cells with no group step. A group with no cells is skipped. A board with no cells stays at rest.
21. **A pick.** A pick runs the action of the cell at once, as a press does today. The cell shows the confirmed look for the post click delay. When the delay ends, the scan starts again by itself at the first group of the board on show, which is a new board when the cell opened one.
22. **Times.** The scan time is 1.5 seconds when nothing is stored, as in the settings panel of the mockup, and runs from 0.5 to 5 seconds. The post click delay is 0.5 seconds when nothing is stored, and runs from 0 to 5 seconds. Both are stored on the device in milliseconds, under `symple.scanTime` and `symple.postClickDelay`. A stored value that is missing, not a number or out of range gives the default.
23. **The highlight is the focus.** In `scan` and `step` mode the keyboard focus moves with the highlight. A highlighted group holds the focus, and so does a highlighted cell. This holds when Tab moves the highlight and when the scan time moves it. At rest nothing holds the focus. Each group can take the focus from the app but is not a tab stop of its own, and it has a name for screen readers, such as "Column 1 of 2" or "Row 1 of 2". The user asked on 2026-11-19 that Tab moves the focus.
    - **The tab order.** The settings button, the Sign out button and anything else outside the grid are not in the tab order, in every selection mode. Tab never leaves the grid. Set by the user on 2026-11-19.
    - **What this costs.** A caregiver can then reach the settings button and the Sign out button only with a pointer or a tap. That does not meet WCAG 2.1.1, Keyboard, for those two controls, which requirement 10 and the roadmap rule on WCAG 2.2 Level AA ask for. The user's instruction is followed, and the gap is written here so that it is known.
    - **The sign in screen.** The sign in screen has no grid and keeps the tab order of the browser.
24. **Other keys and fields.** The scan takes no key but Tab and Enter. It takes neither while the focus is in a text field.
25. **Screen readers.** A screen reader tells the name of each group and cell as the highlight reaches it, because the highlight is the focus. The status text of feature 2, which tells the phrase or the message after a press, also follows a pick.
26. **Motion.** The highlight changes with the short colour transition that cells already have, and with no transition for people who ask for less motion.
27. **Sync.** The five stored values of items 14, 22, 29 and 30 are not synced in this feature. Feature 8 adds them to the sync of feature 3.

## The dwell press

28. **The dwell press.** In `dwell` mode, a pointer that rests on a cell for a set time, called the dwell time, presses that cell. The press runs the action of the cell, as a pointer press does. Set by the user on 2026-11-19.
29. **The dwell time.** The dwell time is 1 second when nothing is stored, and runs from 0.5 to 5 seconds. It is stored on the device in milliseconds under `symple.dwellTime`. A stored value that is missing, not a number or out of range gives the default.
30. **The dwell styles.** A stored setting named the dwell style says how the cell shows the dwell time running. It has two values, which the user set on 2026-11-19. It is stored under `symple.dwellStyle`, and `grow` is used when nothing is stored.
    - **`grow`.** The cell slowly expands for the length of the dwell time. It grows to 1.08 times its size and is drawn above the cells next to it, so no other cell moves.
    - **`bar`.** A progress bar across the bottom of the cell fills from left to right for the length of the dwell time.
31. **Leaving a cell.** When the pointer leaves the cell before the dwell time ends, the dwell stops, the cell returns to its normal look, and nothing is pressed. A dwell on the next cell starts from zero. A pointer that moves inside one cell does not start the dwell again, because a head tracker and eye gaze never hold still.
32. **After a dwell press.** The cell shows the confirmed look for the post click delay, and no dwell starts in that time. After it, a new dwell starts only when the pointer has moved. This stops a cell from being pressed again and again, and it stops a board that has just opened from pressing the cell that lands under the pointer.
33. **Other presses in `dwell` mode.** A pointer press or a tap on a cell still presses it at once and stops the dwell. A pointer of the touch kind starts no dwell. Caregiver controls are never pressed by a dwell.
34. **Contrast and screen readers.** The progress bar has a contrast of at least 3 to 1 against its cell in every theme. The bar and the growth are not announced to screen readers.

## The scan time bar

36. **The scan time bar.** In `scan` mode, the progress bar of the `bar` dwell style counts down the scan time. Set by the user on 2026-11-19. The parts below are my choices.
    - The bar is drawn across the bottom of what is highlighted, which is the group while the groups are scanned and the cell while the cells are scanned.
    - The bar starts full and empties over the scan time. It starts full again each time the highlight moves, by itself or by Tab.
    - The bar is shown whatever the dwell style is, because the dwell style belongs to the `dwell` mode.
    - No bar is shown at rest, in the confirmed look, or in `step` mode, where no time runs.
    - The bar is still shown for people who ask for less motion, and it meets the contrast of item 34.

## File names

- `src/app/scan/scan.ts` holds the scan service, which keeps the state and the timer.
- `src/app/scan/scan-settings.ts` reads the five stored values.
- `src/app/scan/switches.ts` turns key presses into switch presses.
- `src/app/scan/dwell.ts` holds the dwell service, which keeps the dwell timer.
- `e2e/scanning.spec.ts` holds the end to end tests, with helpers in `e2e/support/scan.ts`.

## Left for later features

- Feature 5, speech, speaks the phrase of a picked cell and shows the picked look of the Needs mockup while it speaks.
- Feature 8, settings, adds the controls for the scan time, the post click delay, the selection mode, the dwell time and the dwell style, and syncs them.
- Feature 11, the iPad app, decides how switches reach the app on iPad.
- Feature 12, head tracker and eye gaze, covers the pointer that is driven by a head tracker or by eye gaze. It can reuse the dwell press of this feature. On iPad the iPad's own pointer does the dwell click, so the `dwell` mode is not needed there.
