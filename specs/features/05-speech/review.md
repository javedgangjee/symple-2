# Feature 5: Speech. Review

This review was written on 2026-11-21 in the same session that wrote the code, so the reviewer and the author are the same. The five voters are the independent check.

## What was run and what was only read

- The unit tests were run with `npm test`. All 287 passed.
- The lint, the format check and the build were run. All three passed.
- The end to end tests were run twice with `npm run e2e`. The first run had 6 failures out of 215, all in the 1024 by 768 project and all within ten seconds of each other. They were timeouts and one `net::ERR_ABORTED` on a page load, in cases B10 and B11 of `e2e/boards.spec.ts`, cases E5, E6 and E8 of `e2e/home.spec.ts`, and case Y2 of `e2e/keyboard.spec.ts`. The second run passed all 215. The cause of the first run was not found.
- No real voice was heard. The code that talks to a real browser voice was only read. The manual checks M1, M2, M3, M4 and M7 of validation.md, which use a real voice in Chrome and Safari, have not been done.

## Findings

### 1. An end to end test of feature 2 now says the opposite of what the app does

- Claim: case Y7, "pressing the message changes nothing and asks for no speech", still passes although pressing the message now speaks it.
- Where: `e2e/keyboard.spec.ts:155`. The unit case S16 at `src/app/boards/board-screen.spec.ts:252` has the same kind of title.
- Case: Y7 counts calls to the real `speechSynthesis.speak`. `openBoard` now replaces `speechSynthesis` with the stand-in after Y7 patched it, so the counter stays at 0. The status text was "hi" before the press and is "hi" after it, so that check passes too. The test proves nothing and its title is false.
- Fix: remove case Y7, because case SE4 of `e2e/speech.spec.ts` covers the press of the message. Rename case S16 to say that a message tile with no action does nothing.
- Level: medium.

### 2. Two paths of the wait for the voices have no test

- Claim: the system voice source gives up after one second with no voices, and it drops a text that was overtaken while it waited, and no test covers either path.
- Where: `src/app/speech/system-voice-source.ts:67` to `76`, and `:124` to `126`.
- Case: the list of voices is empty. `speak('A')` waits, then `speak('B')` is called, then `voiceschanged` fires. Only "B" must be spoken. If the check `turn === this.turn` were removed, both would be spoken and every test would still pass. The same holds for the one second timer: no test lets it run out.
- Fix: add two unit cases. One lets one second pass with no voices and expects nothing spoken and one warning. The other calls `speak` twice while the list is empty and expects only the second text.
- Level: medium.

### 3. The first phrase after a load can be late, and the warning then names the wrong cause

- Claim: Chrome often gives an empty list from the first call to `getVoices()`, so the first pick after a load waits for `voiceschanged`, and if the list is still empty after one second the warning says there is no English voice.
- Where: `src/app/speech/system-voice-source.ts:118` to `126` and `:143`.
- Case: the page loads, and the first pick comes at once. `getVoices()` returns nothing, so the phrase is held until the browser has loaded its voices. If that takes longer than one second, nothing is spoken and the console says "this browser has no English voice", which is not the cause.
- Fix: call `getVoices()` once when the source is made, so the browser starts to load the list before the first pick. Give the timeout its own warning text.
- Level: low.

### 4. Each speech is cancelled twice

- Claim: `Speech.say` calls `stop()` and then `speak()`, and `speak()` calls `stop()` again, so `speechSynthesis.cancel()` runs twice before each utterance.
- Where: `src/app/speech/speech.ts:20` and `src/app/speech/system-voice-source.ts:117`.
- Case: any pick of a phrase. The log of the end to end stand-in shows two `cancel` entries before each `speak` entry. This is waste in Chrome. Whether a second cancel right before `speak` harms Safari could not be checked without a real voice.
- Fix: keep the stop in one place. The interface already says that `speak` stops the speech that runs, so `Speech.say` can drop its own `stop()`. Case SP4 of validation.md, which expects the fake to get a stop, would then change.
- Level: low.

### 5. A browser that cannot speak writes a warning for every pick

- Claim: item 23 of requirements.md says the app writes one warning, and the code writes one for each pick.
- Where: `src/app/speech/system-voice-source.ts:114`, `:143` and `:160`.
- Case: the app runs all day in a browser with no English voice. Each of several hundred picks adds a line to the console.
- Fix: write each of the three warnings once for the life of the source.
- Level: low.

### 6. Case BS5 does not check that the home board is drawn

- Claim: validation.md expects that the home board is drawn after Back, and the unit test checks only that the address changes.
- Where: `src/app/boards/board-screen.spec.ts:573` to `588`.
- Case: the way back is a stand-in in this file, so the test makes it navigate itself. A fault in the real `Back` service while a speech runs would not fail this test.
- Fix: accept the weaker check and say so in validation.md, or add an end to end case that picks Back while a phrase speaks and checks the title "Home" and that no cancel came.
- Level: low.

### 7. Case SE8 looks only at uncaught errors

- Claim: validation.md expects that no error reaches the page, and the test does not look at errors written to the console.
- Where: `e2e/speech.spec.ts:118` to `130`.
- Case: a future change logs an error with `console.error` when the Web Speech API is missing. Case SE8 would still pass.
- Fix: also collect console messages of the type `error`, and leave out the Firestore lines that the blocked network writes.
- Level: low.

### 8. A message of only spaces stops the speech and says nothing

- Claim: `Speech.say` refuses only the empty text, so a message of spaces cancels the phrase that is being spoken and then speaks silence.
- Where: `src/app/speech/speech.ts:17`.
- Case: a phrase is being spoken. The user picks Space once on the keyboard and then picks the message. The phrase is cut off and nothing is heard.
- Fix: treat a text of only white space as empty.
- Level: low.

### 9. Pages opened without the helpers get no stand-in

- Claim: item 30 of requirements.md says every page gets the stand-in, and the tests that call `page.goto` themselves do not get it.
- Where: `e2e/support/boards.ts:99` and `e2e/support/scan.ts:102` are the only two places that add it. `e2e/shell.spec.ts` and parts of `e2e/sign-in.spec.ts` open pages with `page.goto`.
- Case: a later test in `e2e/shell.spec.ts` opens a board with `page.goto` and clicks a phrase. It would use the real voice of the browser.
- Fix: add the stand-in in the `page` fixture of `e2e/support/firebase.ts`, which every test page already passes through.
- Level: low.

## Votes, 2026-11-21

Five voters checked each finding against the code. They ran nothing. All nine findings are kept, and none is dropped. The level is the middle of the five levels the voters gave, and the order within a level is the average of the voters' ranks.

### Kept

1. Finding 1, the end to end case Y7 that says pressing the message asks for no speech. Votes: 5 valid. Level: medium. Average rank 1.4. Correction: all five voters said the part about unit case S16 is overstated. S16 uses a message tile with no action, so its title is true for that tile and a rename is optional.
2. Finding 2, the two untested paths of the wait for the voices. Votes: 5 valid. Level: medium. Average rank 1.6.
3. Finding 3, the first phrase after a load that can be late, with a warning that names the wrong cause. Votes: 3 valid, 2 partly. Level: low. Average rank 3.6. Correction: the wrong warning text is confirmed. The claim that the first phrase is often late has no evidence, because nobody measured how fast Chrome fills the list.
4. Finding 8, a message of only spaces that stops the speech and says nothing. Votes: 5 valid. Level: low. Average rank 3.6.
5. Finding 6, case BS5 that does not check that the home board is drawn. Votes: 5 valid. Level: low. Average rank 5.0.
6. Finding 4, each speech cancelled twice. Votes: 5 valid. Level: low. Average rank 6.6. Correction: the stop in `Speech.say` is what case SP4 of validation.md asks for, so the plan chose it. A fix would also change case BS4, which expects a stop before the second phrase.
7. Finding 9, pages opened without the helpers that get no stand-in. Votes: 5 partly. Level: low. Average rank 6.6. Correction: no test of today clicks a phrase on such a page, so this is a risk for later tests only.
8. Finding 5, a warning for every pick in a browser that cannot speak. Votes: 1 valid, 4 partly. Level: low. Average rank 8.2. Correction: "one warning" in item 23 of requirements.md can mean one for each failed speech, and cases VS7 and VS10 test it that way. The review read it more strictly than the specs do.
9. Finding 7, case SE8 that looks only at uncaught errors. Votes: 4 valid, 1 partly. Level: low. Average rank 8.4. Correction: an uncaught error is a fair reading of "no error reaches the page", so the gap is small.

### Dropped

None.
