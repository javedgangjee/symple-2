# Feature 5: Speech. Requirements

## What the feature must do

1. The app speaks text through one voice source interface, so a second source can be added later without changing the screens. Source: roadmap.md, feature 5. tech-stack.md, Speech. PRODUCT.md, Speech output.
2. The system voices are the first and only voice source. The web build reaches them through the Web Speech API. The iPad build reaches the iOS voices through Capacitor in feature 11, the iPad app. Source: tech-stack.md, Speech. roadmap.md, feature 11.
3. Picking a cell on a board speaks the phrase of the cell. Source: roadmap.md, feature 5. PRODUCT.md, Speech output. roadmap.md, the decision of 2026-11-16 that a phrase makes no sound until feature 5.
4. A cell that speaks shows the confirmed look of feature 4, with its colours swapped, for the post click delay, as any picked cell does. It has no look of its own, and the look does not wait for the speech to end. The user set this on 2026-11-21. It replaces the dark picked look of the Needs mockup, which the roadmap line of feature 5 named until then. Source: the user.
5. Picking the message on the keyboard speaks the message. Source: roadmap.md, features 5 and 7.
6. A pick speaks in each of the five selection modes, which are `scan`, `step`, `cursor`, `touch` and `dwell`. Source: tech-stack.md, Input. mission.md, What the system does.
7. Every screen for the primary user still works by single switch scanning, and speech adds no target. Source: roadmap.md, the two rules for every feature. CLAUDE.md, Rules.
8. Speech adds no new look, so the contrast checks of feature 4 still cover every state of a cell. Source: PRODUCT.md, Accessibility and Inclusion.
9. Speech is in English. Source: PRODUCT.md, Speech output.
10. The caregiver picks the voice and sets its rate, pitch and volume in feature 8, settings. This feature uses the default voice and shows no control. Source: roadmap.md, feature 8.
11. Speech works with no network when the voice runs on the device. A voice that runs on a server, such as the Google voices of Chrome, needs a network. Source: mission.md, What the system does. The user's decision of 2026-11-21 on item 18.
12. No feature 5 code calls Firebase. Source: CLAUDE.md, Rules.
13. **Patent check.** Feature 5 speaks only text that the user picked or typed. It generates no content and no suggestions, so the patent check of tech-stack.md, Patents, does not apply.

## The second review of feature 4

14. The user decided on 2026-11-21 to ignore the five findings of the second review of feature 4, which are findings B1 to B5 of its review.md. This feature fixes none of them. That includes finding B2, the lost sign in of the end to end tests, whose cause is still not known. The `open` helper of `e2e/support/scan.ts` still fails a test that loses the sign in and keeps a trace of the load. There are no items 15 and 16, which were questions that this decision and item 4 answer.

## Not in the specs. Assumed, and open to change

Items 17 to 33 are my choices, apart from item 18, which the user set on 2026-11-21. Items 19, 20, 24 and 28 change what the primary user hears, so they are the ones worth the user's eye. The rest are routine and stand unless the user changes them. There are no items 21, 22, 29, 31 and 32. They were about a look of its own for a speaking cell, which the user removed on 2026-11-21.

17. **The interface.** A voice source has `speak(text)`, which gives a promise that settles when the speech ends or fails, and `stop()`. Feature 8 adds the list of voices and the rate, pitch and volume. The screens use a `Speech` service and never the source, as they use `Auth` and never the auth source.
18. **The voice.** The system source uses the default voice of the browser when that voice is English. Otherwise it uses the first English voice in the list. A voice that runs on a server, such as the Google voices of Chrome, is used like any other. The user set this on 2026-11-21 and will use those voices on the web. With such a voice the spoken text leaves the device and speech needs a network. With no English voice, nothing is spoken. The rate, pitch and volume are the browser defaults.
19. **A new pick while a cell speaks.** The new speech stops the old one and starts at once, as the Needs mockup does. A second pick of the same cell speaks it again from the start.
20. **Other picks.** A pick that opens a board, goes back or types a key does not stop the speech. The speech goes on when the screen changes.
23. **When speech cannot run.** If the browser has no Web Speech API, has no English voice, or refuses to speak, nothing is spoken. The app shows no message to the primary user and writes one warning to the console. The status text for screen readers still tells the phrase.
24. **The browser asks for a key press or a click first.** As far as I know, Chrome speaks only after the page has had a key press, a click or a tap since it was loaded. Implement confirms this in check M3 of validation.md, which tries `dwell` mode after a reload. In `scan` and `step` mode the first switch press gives this. In `dwell` mode with a head tracker, a pointer that only moves does not, so after a reload nothing is spoken until someone presses a key or clicks once. This feature records the limit and checks it by hand in check M3 of validation.md. Feature 10, the Mac app, can lift it in Electron.
25. **The message action.** The message tile in `cells.json` gets the action `{ "type": "speak-message" }`, so the data says what the tile does. The action type is added to `src/app/boards/board-data.ts`. The name is my choice.
26. **An empty message.** Picking the message when it is empty speaks nothing, and the cell shows the confirmed look.
27. **The message after speech.** The message stays after it is spoken. The Clear key empties it, as today.
28. **Screen readers.** The status text that tells the phrase or the message after a press stays as it is. A screen reader user hears the phrase twice, once from the screen reader and once from the voice.
30. **The tests make no sound.** The unit tests use a fake voice source, as they use fakes of the auth source and the cloud store. The end to end tests put a stand-in for the Web Speech API on every page before the app starts. The stand-in records each text and ends the speech when the test says, so the real system source code runs and no test speaks aloud or waits in real time.
33. **File names.** `src/app/speech/voice-source.ts` holds the interface and its injection token. `src/app/speech/system-voice-source.ts` holds the Web Speech source. `src/app/speech/fake-voice-source.ts` holds the fake for the unit tests. `src/app/speech/speech.ts` holds the `Speech` service. `e2e/support/speech.ts` holds the stand-in, and `e2e/speech.spec.ts` holds the end to end cases.

## Left for later features

- Feature 8, settings, adds the voice picker with the rate, pitch and volume, and syncs them.
- Feature 10, the Mac app, checks the voices inside Electron and can lift the limit of item 24.
- Feature 11, the iPad app, adds the Capacitor path to the iOS voices behind the same interface.
