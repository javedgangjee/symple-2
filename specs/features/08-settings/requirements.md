# Feature 8: Settings. Requirements

The mockup for this feature is `context/design/home-settings.html`. It also draws edit mode and a tile dialog, which belong to feature 9, board editing. This feature builds only the settings panel.

## What the feature must do

1. The settings button in the header opens a settings panel for the caregiver. Source: roadmap.md, feature 8. `src/app/shell/header.ts`, which keeps the button disabled until this feature.
2. The caregiver sets the scan time, the post click delay, the selection mode, the dwell time, the dwell style and whether the progress bar is shown. Source: roadmap.md, feature 8. tech-stack.md, Input.
3. The caregiver sets the theme. The layout control was removed on 2026-11-23, as item 36 says. Source: roadmap.md, feature 8, and the decision of 2026-11-16 that feature 8 adds the layout picker.
4. The caregiver picks the voice and sets its rate, pitch and volume. Source: roadmap.md, feature 8. PRODUCT.md, Speech output. tech-stack.md, Speech.
5. The panel shows the credit for the Mulberry symbols and for the Lucide icons. Source: roadmap.md, feature 8. tech-stack.md, Design reference, which says the app must credit Mulberry. The user's instruction of 2026-11-22 in item 35.
6. The Sign out button moves from the footer into the panel. Source: roadmap.md, feature 8, and the decision of 2026-11-17 on the temporary button.
7. The six scan values and the four voice values join the sync of feature 3, next to the theme and the layout. Source: roadmap.md, feature 8, and the decision of 2026-11-17 that feature 8 adds the other settings.
8. The panel is a caregiver screen. Scanning does not reach it, and the settings button keeps the attribute `data-caregiver-control`. Source: PRODUCT.md, Principle 5. roadmap.md, the decision of 2026-11-17 on caregiver controls.
9. The panel passes WCAG 2.2 Level AA, and every screen for the primary user still works by single switch scanning. Source: roadmap.md, the two rules for every feature.
10. The caregiver can open the panel and use every control in it with the keyboard alone. Source: roadmap.md, the first open question of feature 8. tech-stack.md, Input.
11. The panel looks like the settings dialog of the mockup. Source: the user's instruction of 2026-11-22. tech-stack.md, Design reference.
12. The feature adds no cloud service. It uses the Firestore document `users/{uid}` of feature 3. Source: CLAUDE.md, Rules.
13. **Patent check.** The panel stores choices and speaks one fixed sample. It generates no content and no suggestions, so the patent check of tech-stack.md, Patents, does not apply.

## The three open questions of the roadmap

14. **How the caregiver reaches the panel with the keyboard.** Control with the comma key opens the panel from any board, in every selection mode. The key is not a switch key, so it never moves the scan. The button names the shortcut in `aria-keyshortcuts` and in its tooltip. Inside the panel, Tab, Shift with Tab, the arrow keys, Space, Enter and Escape work as the browser gives them. The choice of key is mine. Command with comma is the Mac habit, but Chrome keeps it for its own settings.
15. **Whether Chrome cuts a server voice off after about 15 seconds.** I cannot answer this from the code. Chromium has had this fault for years, and I have not confirmed it in the Chrome in use. Check H5 of validation.md speaks a long text with a Google voice and with a voice on the device, and the result goes into tech-stack.md. This feature does not fix a cut. If the check shows one, the user decides whether a step is added that speaks a long text one sentence at a time.
16. **Whether a changed scan setting takes effect at once.** It does, with no reload. The scan rests while the panel is open, and it starts from rest with the new values when the panel closes.

## Not in the specs. Assumed, and open to change

The user settled items 17, 27 and 34 on 2026-11-22. Items 14, 22 and 23 change what the caregiver can do or what the user hears, so they are the ones still worth the user's eye. The rest follow the mockup or the code and stand unless the user changes them.

17. **The categories.** The panel has five categories: Selection, Speech, Appearance, Account and About. It opens on Selection. The mockup also has Boards, with an Edit boards button, and Keyboard, with the source of the word suggestions. Those two wait for feature 9, board editing, and feature 7, word suggestions. The user confirmed on 2026-11-22 that the panel leaves out what is not built yet.
18. **No Save and no Cancel.** Each change applies and is stored at once. Done, Escape and a press on the dimmed page close the panel.
19. **The page behind the panel.** While the panel is open the scan rests, Tab and Enter are not switches, no dwell runs, and the round cursor of `cursor` mode is not drawn, so the caregiver sees the arrow of the system. When the panel closes the scan is at rest, as it is after a load.
20. **The times.** Each time is set with a minus button and a plus button in steps of 0.5 seconds and is shown in seconds. The scan time and the dwell time run from 0.5 to 5.0 seconds, and the post click delay from 0 to 5.0 seconds. These are the limits that `src/app/scan/scan-settings.ts` already holds. A stored time that is not on a step moves to the next step on the first press.
21. **What shows in which mode.** The scan time and Show progress bar show only in `scan` mode. The dwell time and the dwell style show only in `dwell` mode. The post click delay shows in every mode. A note under the selection mode says what the mode does, in the words of the mockup.
22. **The voice list.** The list holds the English voices of the device by name. Nothing is stored until the caregiver picks one, and until then the list shows the voice that the rule of feature 5 picks. The choice is stored as the id that the browser gives the voice. If the stored voice is not on the device, for example after a sync from another device, the rule of feature 5 picks the voice and the stored choice is kept.
23. **Rate, pitch and volume.** Each is set with a minus and a plus button in steps of 0.1, as item 36 says. The rate runs from 0.5 to 2.0, the pitch from 0 to 2.0 and the volume from 0 to 1.0, shown as a percentage. Each starts at 1.0. These are the ranges of the mockup. A volume of 0 makes the user silent, and the user may want a higher lowest value.
24. **The sample.** Play a sample speaks "Hello. This is my voice." with the chosen voice, rate, pitch and volume. It stops a speech that runs, as any new phrase does.
25. **Where the values are kept.** The four voice values use the local storage keys `symple.voice`, `symple.voiceRate`, `symple.voicePitch` and `symple.voiceVolume`. The ten new fields of the Firestore document are `scanTime`, `postClickDelay`, `selectionMode`, `dwellTime`, `dwellStyle`, `showProgressBar`, `voice`, `voiceRate`, `voicePitch` and `voiceVolume`. Each is saved as text, as the theme and the layout are, so the cloud store interface does not change.
26. **The sync rules.** The rules of feature 3 apply to the new fields. A value of the cloud replaces the value of the device. A change on the device is saved. A field that the cloud lacks is filled from the device. A value that this version cannot use is left alone.
27. **The credits.** The About category shows three lines: Created by Javed Gangjee, the Mulberry symbols with their copyright and licence, and the Lucide icons with their licence, as item 35 says. The mockup has a fourth line for the stop symbol of OpenMoji. The app does not show it, because item 34 removes that symbol.
28. **The account.** The Account category shows the email address of the account and the Sign out button. One press signs out, closes the panel and shows the sign in screen, with no question first, as today. The footer stays and is empty, and it keeps its height for the buttons of feature 9.
29. **The glass of the panel.** The panel is 92 parts in 100 solid, as in the mockup, so its text keeps its contrast over any board. The sign in card stays at 80, so the panel gets a value of its own in `src/styles/glass.css`.
30. **A narrow window.** Under a width of 52rem the categories lie in a row above the settings, as in the mockup.
31. **The sizes.** Titles are 22px, labels are 17px and notes are 15px, set in rem. Every control is at least 48px high and wide.
32. **The tests make no sound.** The stand-in for the Web Speech API in `e2e/support/speech.ts` also records the voice, the rate, the pitch and the volume of each text, and offers two English voices and one French voice.
33. **File names.** `src/app/settings/` holds the panel: `settings-panel.ts`, `.html`, `.css` and `.spec.ts`, and `settings-open.ts`, a small service that says whether the panel is open. `src/app/speech/voice-settings.ts` holds the four voice values. `e2e/settings.spec.ts` holds the end to end cases.

34. **The stop symbol.** The user decided on 2026-11-22 that the OpenMoji file `public/symbols/stop.svg` is removed and that Symple gets a stop symbol of its own. The new drawing is a red octagon with a white raised hand, drawn from nothing and copied from no other set. It keeps the file name `stop.svg`, so the tile `core-stop` of `cells.json` does not change and the symbol still sits with the Mulberry symbols on the Core words board. The shape and the file name are my choice. `ATTRIBUTION.txt` says that the file is Symple's own, and nothing in the app names OpenMoji after that.

35. **The icons.** The user decided on 2026-11-22, during implement, that every line icon in the app is a Lucide icon. The icons that were copied from the mockups, the icons that were drawn by hand and the eight Material icons are all replaced, in `src/app/cells/icon.ts`, the header, the settings panel and the sign in screen. The drawings are copied from Lucide 1.77.0 and stay inline, so the app gains no package. `public/licenses/lucide.txt` holds the ISC licence of Lucide, and `public/licenses/material-icons.txt` is removed. Nothing in the app names the Material icons after that. The mockups under `context/design/` keep their own drawings.
36. **The changes of 2026-11-23.** The user decided these things after the first commit of the feature. Where an earlier item disagrees, this item wins.
    - The panel has no layout control. The layout is to be a setting of each board, which feature 9 adds. Until then the stored layout stays as it is, columns by default, and it still syncs. This replaces item 3 for the layout.
    - The rate, the pitch and the volume are each set with a minus and a plus button, as the scan time is, in steps of 0.1. A button at the end of its range stays in the tab order and does nothing. This replaces the sliders of item 23. The ranges do not change.
    - Play a sample is a square button with the play icon, beside the list of voices. It shows only when the device has an English voice.
    - The panel has no notes. The grey lines under the settings are removed on every tab, with the note under the selection mode of item 21.
    - The panel is 80 parts in 100 of the width of the window. Its height stays at 95 parts in 100.
    - Each row of the panel is a fifth higher, at least 4.2rem in place of 3.5rem.

## Left for later features

- Feature 7, word suggestions, adds the Keyboard category with the source of the suggestions.
- Feature 9, board editing, adds the Boards category with the Edit boards button, and edit mode.
- Feature 10, the Mac app, can give the panel the Command with comma shortcut.
