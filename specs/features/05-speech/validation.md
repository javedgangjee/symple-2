# Feature 5: Speech. Validation

The numbers in brackets are the items in requirements.md that a check covers. Unless a case says otherwise, the selection mode is `scan`, the scan time is 1000 ms and the post click delay is 500 ms. "The speech ends" means that the test tells the fake or the stand-in that the voice has finished.

The checks were changed on 2026-11-21 after two decisions of the user. A voice that runs on a server is allowed, and a cell that speaks has no look of its own. Some case numbers are missing because their cases were removed.

## Automated checks

### A1. Build

Command: `npm run build`

- The build ends with no errors and no warnings.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. Unit tests (1 to 6, 17 to 20, 23, 25, 26, 27, 30)

Command: `npm test`

The system voice source, in `src/app/speech/system-voice-source.spec.ts`. Each case gives the source a stand-in for `speechSynthesis`:

| Case | Input | Expected result |
| --- | --- | --- |
| VS1 | The voices are one English voice, which is the default. `speak('I need help')`. | One utterance is spoken with the text "I need help" and that voice. |
| VS2 | After case VS1, the stand-in fires `end`. | The promise settles. |
| VS3 | The stand-in fires `error` in place of `end`. | The promise settles and nothing is thrown. |
| VS4 | The default voice is English and runs on a server, and a second English voice runs on the device. | The default voice is used. |
| VS5 | The default voice is not English, and a second voice is English. | The second voice is used. |
| VS10 | No voice is English. | Nothing is spoken, the promise settles at once and one warning goes to the console. |
| VS6 | The list of voices is empty, and `voiceschanged` brings an English voice 200 ms later. | The text is spoken with that voice. |
| VS7 | The page has no `speechSynthesis`. | Nothing is thrown, and the promise settles at once. |
| VS8 | A speech runs, and `speak` is called with a second text. | The first speech is cancelled before the second starts. |
| VS9 | `stop()` while a speech runs. | The speech is cancelled. |
| VS11 | The source is made, and nothing is spoken yet. Added for finding 3 of review.md. | The stand-in got one call to `getVoices()`. |
| VS12 | The list of voices is empty and stays empty. `speak('I need help')`, and one second passes. Added for finding 3 of review.md. | Nothing is spoken, the promise settles, and one warning goes to the console. The warning says that the voices did not load and does not say that there is no English voice. |

The speech service, in `src/app/speech/speech.spec.ts`, with the fake voice source:

| Case | Input | Expected result |
| --- | --- | --- |
| SP1 | `say('I need help')`. | The fake gets "I need help". |
| SP4 | After case SP1, `say('I am in pain')`. | The fake gets a stop and then "I am in pain". |
| SP6 | `say('')`. | The fake gets no text and no stop. |
| SP7 | `say('   ')`, a text of three spaces. Added for finding 8 of review.md. | The fake gets no text and no stop. |

The data, in `src/app/boards/board-data.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| BD1 | A tile with the action `{ "type": "speak-message" }`. | The tile is read with that action and no fault. |
| BD2 | A tile with the action `{ "type": "speak-message", "phrase": "Hi" }`. | The tile is skipped with a fault that names the unknown field "phrase". |
| BD3 | The built in `cells.json`. | The message tile has the action `speak-message`, and no fault is written. |

The board screen, in `src/app/boards/board-screen.spec.ts`, with the fake voice source:

| Case | Input | Expected result |
| --- | --- | --- |
| BS1 | On Needs, the scan picks Help. | The fake gets "I need help", the status region holds the phrase, and the cell carries `data-confirmed` for the post click delay, as any picked cell does. |
| BS2 | After case BS1, 500 ms pass while the speech still runs. | No cell carries `data-confirmed`, and the first group is highlighted again. |
| BS4 | On Needs, Help is picked, and then Pain is picked while Help speaks. | The fake got a stop before "I am in pain". |
| BS5 | On Needs, Help is picked, and Back is picked while it speaks. | The home board is drawn, and the fake got no stop. |
| BS6 | On the keyboard, the keys H and I are pressed, and then the message is picked. | The fake gets "hi", and the message still reads "hi". |
| BS7 | On the keyboard, the message is empty and is picked. | The fake gets nothing, and the cell carries `data-confirmed`. |
| BS8 | The selection mode is each of `step`, `touch` and `dwell`. Help is picked by a move and a press, by a pointer press, and by a dwell. | The fake gets "I need help" each time. |

### A4. End to end tests (3 to 7, 23, 30)

Command: `npm run e2e`

The cases are in `e2e/speech.spec.ts`. They use the stand-in of `e2e/support/speech.ts` and move the clock of the page, as the scanning tests do.

| Case | Input | Expected result |
| --- | --- | --- |
| SE1 | On Needs, the scan picks each of its twelve phrase cells in turn, and the speech of each ends before the next pick. | The stand-in records the twelve phrases of `cells.json` in order, starting with "I need help" for Help and including "I am cold. I need a blanket" for Blanket, as in the Needs mockup. |
| SE2 | On Needs, the scan picks Help, and the speech is held. 500 ms pass. | Help has the confirmed look until the post click delay ends, and the first group is highlighted after it, while the speech still runs. |
| SE4 | On the QWERTY keyboard, the scan picks H, I and then the message. | The stand-in records "hi". |
| SE5 | On Yes or no, the scan picks Yes, and then No while Yes speaks. | The stand-in records "Yes" and then "No", and it cancels between them. |
| SE7 | The selection mode is `dwell`. On Needs, the pointer rests on Pain for the dwell time. | The stand-in records "I am in pain". |
| SE8 | The page has no `speechSynthesis`. On Needs, Help is picked. | No error reaches the page, the status region holds "I need help", and the scan starts again after the post click delay. |

The end to end tests of features 1 to 4 run in the same command and must still pass with no change, apart from case Y7 of `e2e/keyboard.spec.ts`, which said that pressing the message asks for no speech. Finding 1 of review.md removes it. This includes the contrast and axe cases of feature 4, which cover the confirmed look. No test speaks aloud.

### A5. The false case is gone (finding 1 of review.md)

Command: `grep -c "Y7" e2e/keyboard.spec.ts`

- The command prints 0, so case Y7, which said that pressing the message asks for no speech, is no longer in the file.
- Case SE4 of check A4, which picks the message by scan and expects "hi" to be spoken, passes.

## Manual checks

### M1. A real voice in Chrome on a Mac (2, 3, 4, 5, 9, 18)

1. Run `make start`, open the app in Chrome on a Mac, and sign in.
2. Open Needs and pick Help with Enter alone. Expected: a voice says "I need help" in English. Help shows the confirmed look for half a second, as any picked cell does, and the scan then starts again while the voice goes on.
3. Pick Blanket, and pick Pain before the voice ends. Expected: the voice stops and says "I am in pain".
4. Open the QWERTY keyboard, write "hello" with Enter alone and pick the message. Expected: the voice says "hello", and the message still reads "hello".

### M2. Safari on a Mac (2, 3)

1. Repeat steps 1 and 2 of check M1 in Safari. Expected: the same results.

### M3. `dwell` mode after a reload (6, 24)

1. Set `symple.selectionMode` to `dwell` in the local storage of the browser, and reload.
2. Without a click or a key press, rest the pointer on Help for the dwell time. Expected, as item 24 of requirements.md says: Chrome may say nothing. Write down what happens.
3. Click once anywhere on the page, and rest the pointer on Pain. Expected: the voice says "I am in pain".

### M4. No network (11, 18)

1. Check in the system settings that the default voice of the Mac is an English voice on the device. Turn off Wi-Fi, reload, and pick Help. Expected: the voice says "I need help".

### M7. A Google voice in Chrome (11, 18)

1. In the console of Chrome, run `speechSynthesis.getVoices().filter(v => !v.localService).map(v => v.name)`. Expected: the list names the Google voices, so the app can reach them. Feature 8, settings, adds the picker that chooses one.
2. Speak a text of about 40 words with a Google voice from the console. Expected: the whole text is spoken. As far as I know, Chrome can cut a server voice off after about 15 seconds, so write down what happens.
