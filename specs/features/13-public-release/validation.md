# Feature 13: Public release. Validation

The numbers in brackets are the items in requirements.md that a check covers. "The sign in screen" is the screen at `/sign-in`, and "the live address" is `https://symple-2.web.app`. Unless a case says otherwise, nobody is signed in.

## Automated checks

### A1. Build (1, 19)

Command: `npm run build`

- The build ends with no errors and no warnings, and it writes `dist/symple/browser/index.html`.

### A2. Lint and format

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. The release files (4, 5, 9, 12, 15, 18, 19, 20)

Command: `node scripts/check-release.mjs`

| Case | Input                                                                     | Expected result                                                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RC1  | `LICENSE` and `NOTICE`.                                                   | `LICENSE` holds the text of the Apache License 2.0. `NOTICE` names the copyright holder, and it names Mulberry with CC BY-SA 4.0, Lucide with the ISC License and Libre Franklin with the SIL Open Font License, each with the folder it covers. |
| RC2  | `package.json`.                                                           | The version is `0.1.0`, the field `license` is `Apache-2.0`, and the scripts `deploy` and `check:release` exist.                                                                                                                                 |
| RC3  | `firebase.json`.                                                          | The hosting block serves `dist/symple/browser`, sends every other path to `/index.html`, and sets the two cache rules of item 19 of requirements.md, which says how the site is served.                                                          |
| RC4  | The tracked files.                                                        | No file holds a private key, a service account file, a token or a password. The web config of Firebase and the canned replies of the tests are allowed by name.                                                                                  |
| RC5  | Every commit of the history.                                              | No commit adds a line that case RC4, the search of the tracked files, would report, and no commit holds a file under `context/`.                                                                                                                 |
| RC8  | `.gitignore` and the tracked files.                                       | `.gitignore` names `/context/`, and no tracked file is under `context/`.                                                                                                                                                                         |
| RC6  | `public/licenses/`, `public/fonts/` and `public/symbols/ATTRIBUTION.txt`. | The licence texts of Mulberry, Lucide and Libre Franklin and the attribution file are present.                                                                                                                                                   |
| RC7  | `README.md`, `settings-panel.html` and `sign-in-screen.html`.             | Each holds the address of the repo, and `README.md` holds the live address and the headings Privacy and Release.                                                                                                                                 |
| RC9  | `Makefile` and `README.md`.                                               | `Makefile` has the target `deploy`, which runs `npm run deploy` and is on the `.PHONY` line. The target `check` does not run it. The Release section of `README.md` names `make deploy`.                                                         |
| RC10 | The rewrite of `firebase.json`. | Its source leaves out every path that ends in `.js`, `.css` or `.woff2`, so a script, a style or a font that is missing gets a 404 and never `index.html`. Added for finding 1 of review.md, which says a request for a script that no longer exists gets `index.html` with the order to keep it for a year. |
| RC11 | The Privacy section of `README.md`. | It does not say that Symple keeps "no other data". The line on Firebase Auth names the time of the last sign in, the IP address and the browser. Added for finding 4 of review.md, which says the Privacy section says Symple keeps no other data while Firebase Auth keeps more. |
| RC12 | `NOTICE` and the tracked files under `src/app/`. | `NOTICE` names each file that holds a comment `<!-- Lucide`, by its own path or by a folder that holds it. Added for finding 5 of review.md, which says `NOTICE` leaves out three files that hold Lucide drawings. |
| RC13 | `.gitignore` and the tracked files. | `.gitignore` names `/.claude/skills/impeccable/`, and no tracked file is under that folder. Added for finding 6 of review.md, which says the repo holds the skill of another project with no licence text while `NOTICE` says three parts come from other projects. The user chose on 2026-11-25 to take the folder out of the repo. |

### A6. The search of the history, on made-up repos (15)

Command: `node --test scripts/check-release.test.mjs`. The script `check:release` runs it after check A3, the release files.

Each case makes a repo with one commit and runs case RC5, the search of the history, on it. The cases were added for finding 2 of review.md, which says the search misses a file under `context/` when git prints its name in quotes.

| Case | Input | Expected result |
| ---- | ----- | --------------- |
| HS1 | The commit holds `notes.md` with one plain line. | The search passes. |
| HS2 | The commit holds the text file `context/café.txt`. | The search fails and names `context/café.txt`. |
| HS3 | The commit holds the picture `context/é.png`. | The search fails and names `context/é.png`. |
| HS4 | The commit holds the text file `context/say "hi".txt`. | The search fails and names `context/say "hi".txt`. |
| HS5 | The commit holds `notes.md`, with the line `++ b/pic.png` and then the line `password = "hunter2hunter2"`. | The search fails and says that the commit adds a line to `notes.md` that looks like a password. Added for finding 3 of review.md, which says an added line that starts with `++ ` is read as a file header. |

### A4. Unit tests (2, 8, 12, 17)

Command: `npm test`

The sign in screen, in `src/app/auth/sign-in-screen.spec.ts`:

| Case | Input                 | Expected result                                                                                                                                      |
| ---- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| IV1  | The screen is opened. | Under the form a line says that Symple is in testing and that accounts are by invitation. It holds the link "About Symple", which leads to the repo. |
| IV2  | The screen is opened. | It has no control that makes an account. Sign in and Forgot password are there as before.                                                            |

The settings panel, in `src/app/settings/settings-panel.spec.ts`:

| Case | Input                         | Expected result                                                                                                            |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AB1  | The About category is opened. | It holds the row "Source code" with a link to the repo and the name "Apache License 2.0", after the three rows of credits. |

### A5. End to end tests (2, 12, 17)

Command: `npm run e2e`

The cases are in `e2e/sign-in.spec.ts` and `e2e/settings.spec.ts`. The cases of the earlier features still pass, which shows that signing in did not change.

| Case | Input                                                                        | Expected result                                                                                                                    |
| ---- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| IV3  | The sign in screen is on show in each of the five themes.                    | axe reports no WCAG 2.2 Level AA violation, the new line keeps 4.5 to 1, and the link is at least 24px high.                       |
| IV4  | Only the keyboard is used on the sign in screen.                             | Tab reaches the address, the password, Sign in, Forgot password and "About Symple" in that order, and the focus is always on show. |
| IV5  | A caregiver is signed in, and the scan runs on home and on Needs.            | The scan never lands on the row "Source code" or on any control of the settings panel.                                             |
| IV6  | The About category of the settings panel is open in each of the five themes. | axe reports no WCAG 2.2 Level AA violation.                                                                                        |

## Manual checks

### Rules for Claude

Claude gives the user the steps of one check at a time and asks for the result. Claude does not mark a manual check as passed from the code alone.

### H1. The live web app (1, 3, 11, 13, 19)

1. Do steps 1 to 3 of step 6 of plan.md, which is the release by the user.
2. Open the live address in Chrome on a Mac, in a window with no stored sign in.
3. Sign in with an account that the user made in the Firebase console.
4. Open Needs, and pick a cell by scanning. Reload the page on Needs.

Expected result: the sign in screen loads with the logo, the font and the line that says accounts are by invitation. Home is on show after the sign in. The cell is spoken, the symbols are drawn, and the reload shows Needs again and not an error page.

### H2. A second device (3, 11)

1. Open the live address in a second browser and sign in with the account of check H1, the live web app.
2. Change the theme in one browser.

Expected result: the theme changes in the other browser.

### H3. The public repo (1, 9, 12, 15)

1. Push main, and make the repo public on GitHub.
2. Open the repo in a window that is not signed in to GitHub.
3. In the app, open the About category of the settings panel and follow the link of "Source code". On the sign in screen, follow "About Symple".
4. Search the repo on GitHub for "patents" in file paths, and open the commit list.

Expected result: the repo opens without a sign in, GitHub names the licence beside the file list, and both links lead to it. The repo shows no folder `context/` in any commit.

### H4. The Firebase console (8, 16)

1. Open the Auth settings of the project `symple-2`.

Expected result: account creation is off, email enumeration protection is on, and `symple-2.web.app` is an authorised domain.
