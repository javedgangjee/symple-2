# Feature 5: Speech. Plan

The steps run in order. Each step names the files it creates or changes. The numbers in brackets are the items in requirements.md.

The plan was changed on 2026-11-21 after two decisions of the user. A voice that runs on a server is allowed, and a cell that speaks has no look of its own. The steps that drew a speaking look and that changed the scan while a cell speaks were removed. The user also decided to ignore the findings of the second review of feature 4, so the steps that fixed them were removed.

## Step 1. Add the voice source interface and its fake (1, 17, 30, 33)

- Creates `src/app/speech/voice-source.ts`. It holds the `VoiceSource` interface with `speak(text)` and `stop()`, and the injection token `VOICE_SOURCE`, in the way that `src/app/auth/auth.ts` holds `AuthSource` and `AUTH_SOURCE`.
- Creates `src/app/speech/fake-voice-source.ts`. The fake records each text it is given and each stop. A test ends or fails the speech that runs, as `FakeAuthSource` does with its requests.

## Step 2. Add the system voice source (2, 9, 11, 18, 23, 24)

- Creates `src/app/speech/system-voice-source.ts` and `system-voice-source.spec.ts`. The source speaks one text with `speechSynthesis` and a `SpeechSynthesisUtterance`. It stops the speech that runs before it starts a new one. Its promise settles on the `end` event and on the `error` event, so a refusal of the browser settles it too.
- It picks the voice of item 18 of requirements.md, which is the default voice when it is English, or else the first English voice in the list. It does not look at whether a voice runs on the device or on a server. It waits for the `voiceschanged` event when the list is still empty, and gives up after one second.
- When the browser has no Web Speech API or no English voice, the promise settles at once and one warning goes to the console. Nothing throws.
- The unit tests give the source a stand-in for `speechSynthesis`, so no test speaks aloud.
- Changes `src/app/app.config.ts` to provide the system source for `VOICE_SOURCE`.

## Step 3. Add the speech service (1, 17, 19, 20, 23)

- Creates `src/app/speech/speech.ts` and `speech.spec.ts`. The screens call `say(text)`, which stops the speech that runs and starts the new one. An empty text is not spoken and stops nothing.
- The service keeps no state for the screens, because no look depends on whether a speech runs.
- The tests use the fake of step 1.

## Step 4. Give the message tile an action (5, 25, 26, 27)

- Changes `src/app/boards/board-data.ts` and `board-data.spec.ts`. The action type `speak-message` joins the list of action types. It takes no other field.
- Changes `src/data/cells.json`. The message tile gets the action `{ "type": "speak-message" }`.

## Step 5. Speak from the board screen (3, 4, 5, 6, 20, 26, 28)

- Changes `src/app/boards/board-screen.ts`. A `speak` action calls `say` with the phrase, and a `speak-message` action calls it with the message. Both still write the status text.
- A pick by the scan, by a dwell and by a pointer all pass through `onPress`, so the five selection modes speak with no other change. The confirmed look and the post click delay of feature 4 stay as they are, so no style file and no scan file changes.
- The comments that say feature 5 adds the speech are removed.
- Changes `src/app/boards/board-screen.spec.ts` with the cases of validation.md.

## Step 6. Write the end to end tests (3 to 7, 30)

- Creates `e2e/support/speech.ts`. Before the app starts, it puts a stand-in for `speechSynthesis` and `SpeechSynthesisUtterance` on the page. The stand-in offers one English voice, records each text, and ends the speech that runs when the test calls a helper.
- Changes `e2e/support/boards.ts` and `e2e/support/scan.ts`, so `openBoard` and the `open` helper put the stand-in on every page and no test speaks aloud.
- Creates `e2e/speech.spec.ts` with the cases of validation.md.

## Step 7. Update the docs (2, 11, 18, 24)

- Changes `specs/tech-stack.md`. The Speech section gains the four file names, the rule for the voice of item 18 of requirements.md, the note that a voice on a server needs a network and sends the spoken text off the device, and the limit of item 24 of requirements.md for `dwell` mode.

## Step 8. Run everything

- Runs `make check` and fixes the failures.

## Steps added after the review of 2026-11-21

The user picked findings 1, 3 and 8 of review.md. Each step below fixes one of them.

## Step 9. Remove the end to end case that says the message asks for no speech (finding 1)

- Changes `e2e/keyboard.spec.ts`. Case Y7, "pressing the message changes nothing and asks for no speech", is removed. It still passes but proves nothing, because the stand-in for the Web Speech API replaces the object that it counts on. Case SE4 of `e2e/speech.spec.ts`, which picks the message by scan and expects "hi" to be spoken, covers the press of the message.
- Changes `src/app/boards/board-screen.spec.ts`. Unit case S16 keeps its checks, and its title changes to "a message tile with no action does nothing when pressed", because the message tile of the data now has an action.

## Step 10. Load the voices early and name the right cause in the warning (finding 3)

- Changes `src/app/speech/system-voice-source.ts`. The source calls `getVoices()` once when it is made, so the browser starts to load its list before the first pick. When the list is still empty after the wait of one second, the warning says that the voices did not load, and no longer says that there is no English voice.
- Changes `src/app/speech/system-voice-source.spec.ts` with cases VS11 and VS12 of validation.md.

## Step 11. Treat a text of only white space as empty (finding 8)

- Changes `src/app/speech/speech.ts`. A text that holds only white space is not spoken and stops nothing, as an empty text does. This widens item 26 of requirements.md, which covers the empty message, to a message of only spaces.
- Changes `src/app/speech/speech.spec.ts` with case SP7 of validation.md.

## Step 12. Run everything again

- Runs `make check` and fixes the failures.
