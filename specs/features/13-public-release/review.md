# Feature 13: Public release. Review

Reviewed on 2026-11-25, on the branch `feature/13-public-release` against `main`.

## What was run and what was only read

- Run: `node scripts/check-release.mjs`, which passed all 9 cases in about 3 seconds.
- Run: `npm test`, which passed 475 tests, and `npm run lint`, which passed.
- Run: a test in a throwaway repo of how `git log` prints file names. It shows the faults of findings 2 and 3.
- Only read: the end to end tests, the build, `firebase.json` and the deploy. Nothing was deployed, so the claims about Firebase Hosting in findings 1, 7 and 10 come from its documents and from the comment in `scripts/check-release.mjs`, and were not seen on the live site.

## Findings

### 1. A request for a script that no longer exists gets `index.html`, with the order to keep it for a year

- Level: medium.
- Place: `firebase.json`, line 8, the rewrite, and line 15, the header rule for `**/*.@(js|css)`.
- Case: Symple stays open for most of the day. The owner deploys a new build while a tab still runs the old one. The old tab then asks for a lazy script of the old build, such as the chunk that holds `lucide.json` or the tile dialog. Hosting no longer has that file, so the rewrite for `**` answers with `index.html` and status 200. The header rule matches the path that was asked for, as the comment at line 277 of `scripts/check-release.mjs` says, so the answer carries `max-age=31536000, immutable`. The import fails, because the answer is HTML. The browser may keep that wrong answer for the address for a year.
- Suggested fix: make the rewrite skip paths that name a file, for example with the source `!**/*.@(js|css|json|svg|png|ico|woff2|txt)`, so a missing file gets a 404. Add a case to RC3, the check of `firebase.json`.

### 2. The search of the history misses a file under `context/` when git prints its name in quotes

- Level: medium.
- Place: `scripts/check-release.mjs`, lines 346 to 347 and line 375.
- Case: git prints a name that holds a letter outside ASCII, a quote or a tab in quotes, with escapes. A file `context/café.txt` is printed as `+++ "b/context/caf\303\251.txt"` in the patch and as `"context/caf\303\251.txt"` in the name list. Neither starts with `context/`, so case RC5, the search of the history, does not report it. The same holds for the names of secret files. The throwaway repo showed both lines.
- Suggested fix: run both `git log` calls with `-c core.quotePath=false`, and strip the quotes and escapes that are left, or read the names with `-z`.

### 3. An added line that starts with `++ ` is read as a file header, and the lines after it can be skipped

- Level: low.
- Place: `scripts/check-release.mjs`, line 345.
- Case: a commit adds a file with the line `++ b/pic.png` and then a line with a password. The patch shows the first line as `+++ b/pic.png`. The script takes it for the header of a file `pic.png`, which is a picture name, and skips every later line of that file. The throwaway repo showed this output.
- Suggested fix: take a `+++ ` line as a header only when it comes straight after a `--- ` line, or track the hunk headers.

### 4. The Privacy section says Symple keeps no other data, and Firebase Auth keeps more

- Level: medium.
- Place: `README.md`, lines 115 and 117.
- Case: line 115 says "Symple keeps the data below, and no other data about its users". Line 117 names only the email address and the password check for Firebase Auth. Firebase Auth also keeps the time of the account's creation and last sign in, and Google's privacy page for Firebase says it logs IP addresses and user agents of sign ins for a few weeks. A reader of a public privacy note takes the list as complete.
- Suggested fix: add the sign in times, the IP address and the user agent to the Firebase Auth line, or drop "and no other data".

### 5. `NOTICE` leaves out three files that hold Lucide drawings

- Level: low.
- Place: `NOTICE`, lines 22 to 25.
- Case: `NOTICE` lists `icon.ts`, `header.html`, `settings-panel.html` and `sign-in-screen.html`. Comments that name Lucide icons also sit in `src/app/boards/board-screen.html`, `src/app/edit/edit-actions.html` and `src/app/edit/tile-dialog.html`. Requirement 9, which sets the licence, says `NOTICE` says which files each licence covers. Case RC1, the check of `LICENSE` and `NOTICE`, only looks for `src/data/lucide.json`.
- Suggested fix: name the three files, or say "the inline icon drawings under `src/app/`" so the list does not go stale.

### 6. The repo holds a fourth work from another project, and `NOTICE` says there are three

- Level: low.
- Place: `NOTICE`, line 7, and the folder `.claude/skills/impeccable/`.
- Case: `skills-lock.json` says the skill comes from the GitHub repo `pbakaus/impeccable`. Its files are tracked and become public with the repo, with no licence text beside them. `NOTICE` says three parts come from other projects, so a reader takes the skill for Apache licensed code of Symple. The licence of the skill was not checked.
- Suggested fix: check the licence of the skill. Then name it in `NOTICE` with its licence, or take the folder out of the repo.

### 7. Every symbol is checked with the server on each load, and the requirement asks that only for `index.html`

- Level: low.
- Place: `firebase.json`, lines 11 to 13.
- Case: requirement 19, which says how the site is served, asks the browser to ask again for `index.html`. The rule for `**` sets `no-cache` on every file with no hash, which includes the 3,437 symbols. Each symbol on a board costs one request on each load. With no network the browser cannot ask, so a symbol it already holds may not be drawn.
- Suggested fix: add a rule for `/symbols/**` after the rule for `**` that lets the browser keep a symbol for a day or longer.

### 8. The deploy runs whichever version of `firebase-tools` is newest on the day

- Level: low.
- Place: `package.json`, line 12.
- Case: `npx firebase-tools deploy` downloads the latest release each time the cache is empty. A release with a breaking change, or a bad release, runs with the owner's Firebase sign in at the moment of a release.
- Suggested fix: add `firebase-tools` to `devDependencies` at a fixed version, so `package-lock.json` pins it.

### 9. The owner's private email address is in every commit that becomes public

- Level: low.
- Place: the history. All 112 commits carry the author's Gmail address.
- Case: requirement 15, which says what becomes public, lists the history but does not name the address. Once the repo is public the address cannot be taken back.
- Suggested fix: this is the user's choice. Either accept it, or rewrite the author to the GitHub noreply address before step 6 of plan.md, the release by the user. No code changes.

### 10. The site sends no header that stops another site from framing the sign in screen

- Level: low.
- Place: `firebase.json`, lines 10 to 22.
- Case: any site can load `https://symple-2.web.app/sign-in` in a frame and lay its own page over it. Requirement 19, which says how the site is served, does not ask for such a header, and does not rule it out.
- Suggested fix: add `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` to the rule for `**`. This grows the hosting block past requirement 19, so it needs the user's yes.

## Votes

Tallied on 2026-11-25. Five voters checked each finding against the code. All ten findings are kept. The level is the middle of the five levels the voters gave, and the order within a level follows the voters' average rank.

### Kept findings, in order

1. Finding 1, a request for a script that no longer exists gets `index.html` with the order to keep it for a year. Votes: 5 valid. Level: medium. No voter could see the behaviour on live Hosting, so the year of caching still rests on the Hosting documents. Two voters put the comment in `scripts/check-release.mjs` a few lines above line 277.
2. Finding 4, the Privacy section says Symple keeps no other data. Votes: 4 valid, 1 partly. Level: medium, with three votes for medium and two for low. The voters confirmed the sign in times from their own knowledge. None checked Google's page on the logs of IP addresses and user agents.
3. Finding 6, the repo holds a fourth work from another project and `NOTICE` says three. Votes: 5 valid. Level: low, with one vote for medium. The voters counted 69 tracked files in the folder and no licence file. None checked the licence of the skill.
4. Finding 5, `NOTICE` leaves out three files that hold Lucide drawings. Votes: 4 valid, 1 partly. Level: low. One voter added that the Symbols section of `README.md`, near line 131, holds the same short list.
5. Finding 2, the search of the history misses a file under `context/` when git prints its name in quotes. Votes: 5 valid. Level: low, with two votes for medium. The reviewer gave medium. The voters say the folder is already out of the history and a name outside ASCII is unlikely.
6. Finding 7, every symbol is checked with the server on each load. Votes: 1 valid, 4 partly. Level: low. The voters confirmed the cost of one request for each symbol. They say the claim that a held symbol may not be drawn with no network is not proven, and that an answer of 304 is cheap.
7. Finding 10, the site sends no header that stops framing. Votes: 4 valid, 1 partly. Level: low.
8. Finding 9, the owner's private email address is in every commit. Votes: 5 valid. Level: low. The voters call it a note for the user and not a fault of the code.
9. Finding 3, an added line that starts with `++ ` is read as a file header. Votes: 4 valid, 1 partly. Level: low. The voters say it needs an odd or crafted file.
10. Finding 8, the deploy runs the newest `firebase-tools`. Votes: 5 valid. Level: low, and three voters said none is arguable. Requirement 20, which sets the file names and the deploy command, names `npx firebase-tools deploy --only hosting` on purpose, so a pin changes what the requirement says.

### Dropped findings

None.

## Fixes

Made on 2026-11-25. The user picked findings 1, 4, 6, 5, 2 and 3. After each fix, `npm run check:release`, `npm test`, `npm run lint` and `npm run format:check` passed. The end to end tests were not run, because no fix changes the code of the app.

### Fixed findings

- Finding 1, a request for a script that no longer exists gets `index.html` with the order to keep it for a year. Commit `9c9ee73`. Files: `firebase.json`, `README.md`, `scripts/check-release.mjs`. The rewrite now leaves out each path that ends in `.js`, `.css`, `.json`, `.svg`, `.png`, `.ico`, `.woff2` or `.txt`. Check: case RC10 of check A3, the release files, which says the rewrite leaves out the scripts, the styles and the fonts. The Hosting documents show a rewrite source that starts with `!`. They do not say which headers a 404 gets, so check H1, the live web app, is the place to see it.
- Finding 4, the Privacy section says Symple keeps no other data. Commit `e78fbab`. Files: `README.md`, `scripts/check-release.mjs`. Google's privacy page for Firebase was read for this fix. It lists passwords, email addresses, user agents and IP addresses for Firebase Auth, and says the logged IP addresses are kept for a few weeks. Check: case RC11 of check A3, which says the line on Firebase Auth names the last sign in, the IP address and the browser.
- Finding 6, the repo holds a fourth work from another project and `NOTICE` says three. Commit `b35ce1d`. Files: `.gitignore`, `scripts/check-release.mjs`, and the 69 files of `.claude/skills/impeccable/`, which are no longer tracked and stay on the development Mac. The skill is under the Apache License 2.0, copyright 2025 Paul Bakaus, and two of its files come from a third project under the MIT licence. The user chose to take the folder out. The old commits still hold the files, so they still become public with the history. Check: case RC13 of check A3, which says the folder is ignored and not tracked.
- Finding 5, `NOTICE` leaves out three files that hold Lucide drawings. Commit `934a210`. Files: `NOTICE`, `README.md`, `scripts/check-release.mjs`. `NOTICE` now covers every icon drawn inline under `src/app/`. Check: case RC12 of check A3, which says `NOTICE` covers each file with a comment `<!-- Lucide`.
- Finding 2, the search of the history misses a file under `context/` when git prints its name in quotes. Commit `7a8c1db`. Files: `scripts/check-release.mjs`, `package.json`, and the new `scripts/check-release.test.mjs`. The script got the form `--history <folder>`, which runs the search alone on another repo, so that a test can try it. Check: cases HS1 to HS4 of check A6, the search of the history on made-up repos.
- Finding 3, an added line that starts with `++ ` is read as a file header. Commits `5aebce6` and `8015ec8`. Files: `scripts/check-release.mjs`, `scripts/check-release.test.mjs`. The second commit allows the made-up password of the test by name, because the first commit made case RC4, the search of the tracked files, fail on it. Check: case HS5 of check A6.

### Kept findings that were not fixed

- Finding 7, every symbol is checked with the server on each load. The user did not pick it.
- Finding 10, the site sends no header that stops framing. The user did not pick it, and a fix changes requirement 19, which says how the site is served.
- Finding 9, the owner's private email address is in every commit. The user did not pick it. It has no code fix, and it is the user's choice before the repo is made public.
- Finding 8, the deploy runs the newest `firebase-tools`. The user did not pick it, and a fix changes requirement 20, which names the deploy command.
