# Feature 13: Public release. Requirements

"The release" is the first public version of Symple. "The live address" is the web address where the public opens the web app. "The repo" is the Git repository of this project on GitHub. "The sign in screen" is the screen at `/sign-in`.

The user was away while this plan was first written, and decided items 8, 9, 11, 15 and 18 on 2026-11-25. Each item still marked **Proposal** is my choice and not the user's. The user confirms the proposals by approving the plan, or changes them first.

## What the feature must do

1. The release holds the web app and the public repo with its licence, and nothing else. The Mac app and the iPad app are not part of it. Source: roadmap.md, feature 13, and the user's decision of 2026-11-25.
2. Every screen for the primary user still works by single switch scanning, and every screen passes WCAG 2.2 Level AA. A new control or link for the caregiver is a caregiver control that scanning does not reach. Source: roadmap.md, the two rules for every feature.
3. Firebase is the only cloud service. This plan calls for Firebase Hosting, in the Firebase project `symple-2` that the app already uses. Source: CLAUDE.md, Rules. tech-stack.md, Data.
4. The agent never pushes and never deploys. The user pushes main, makes the repo public and runs the deploy with `make deploy`. Source: CLAUDE.md, Rules.
5. The app credits Mulberry and Lucide and ships the licence of each, as it does today. Source: tech-stack.md, Design reference.
6. **Patent check.** The feature generates no content and no suggestions, so the patent check of tech-stack.md, Patents, does not apply.

## The open questions of the roadmap

7. **What the release holds.** It holds what is built today, which is features 1, 2, 3, 4, 5, 8, 9 and 23. Word suggestions, which is feature 7, are not built and are not in it. **Proposal.**
8. **Whether a caregiver can sign up in the app.** No. The user decided on 2026-11-25 that testers are invited only. The user makes each account by hand in the Firebase console, as today, and account creation stays off in the Firebase project. A member of the public who opens the live address sees the sign in screen and cannot get past it without an invitation. The sign in screen says so, in the line of item 12.
9. **Which licence the repo uses.** The code is under the Apache License 2.0, which the user chose on 2026-11-25. It gives each user a licence to any patent of a contributor that the contribution needs. It gives no right to a patent that a contributor does not own, such as the two generative patents that Synchron Australia owns, as tech-stack.md says. The Mulberry symbols stay under CC BY-SA 4.0, the Lucide icons under the ISC License and the Libre Franklin font under the SIL Open Font License. A code licence does not change those. `LICENSE` holds the text of the Apache License 2.0 unchanged, and a `NOTICE` file names the copyright holder and says which files each of the other licences covers.
10. **Whether the patent attorney has confirmed the limits in tech-stack.md.** The roadmap asked this because the release was to include the generated suggestions of feature 7. The release has no generated content, so the question does not block it. It stays open for feature 7.
11. **Where the web app is hosted and at which address.** Firebase Hosting serves the build, and the live address is `https://symple-2.web.app`. The release has no domain of its own. The user confirmed Firebase Hosting on 2026-11-25.

## Things neither source covers

Items 13, 19 and 20 are each a **Proposal**. The other items say what they are.

12. **The link to the repo.** The About category of the settings panel gets a row "Source code" with the address of the repo and the name of the licence. The sign in screen gets one line under the form. It says that Symple is in testing and that accounts are by invitation, and it holds the link "About Symple" that opens the repo, because a visitor sees that screen first. `README.md` gets the live address and says that accounts are by invitation. Nothing in the app or in `README.md` says how to ask for one, which the user decided on 2026-11-25. **Proposal**, apart from that decision.
13. **What a visitor needs.** The web app is made for a browser on a Mac, as mission.md says. `README.md` says so, with the fact that speech uses the voices of the device.
14. **A privacy note.** `README.md` gets a Privacy section. It says the app stores the email address of the account in Firebase Auth, and a copy of the settings and the boards in Firestore. It says a voice that runs on a server sends the spoken text to the maker of that voice. **Proposal.**
15. **What becomes public with the repo.** The whole history becomes public, with `specs/`, `PRODUCT.md` and the skills in `.claude/`. The folder `context/`, which holds the mockups and the three patent files, is not in the repo. The user had it removed from every commit and from GitHub on 2026-11-25, and `.gitignore` now names it, so it is kept on the development Mac only. `CLAUDE.md`, `README.md` and `specs/tech-stack.md` still point at it, and step 5 of plan.md, the documents, makes them say that it is not in the repo. A script checks the tracked files and the history for secrets, and for any file under `context/`, before the repo is made public. The web config in `src/app/firebase/firebase-config.ts` is not a secret, as its comment says.
16. **The accounts.** Account creation stays off, so only the user makes accounts. The user turns on email enumeration protection in the Firebase console and looks at the plan limits of the Firebase project before the release. **Proposal.**
17. **No change to signing in.** The sign in form, its messages and Forgot password stay as they are.
18. **The version.** `package.json` gets the version `0.1.0`, which the user confirmed on 2026-11-25. The user closes the release in `CHANGELOG.md` with the changelog skill after the deploy.
19. **How the site is served.** `firebase.json` gets a hosting block. It serves `dist/symple/browser`, sends every path that is not a file to `index.html`, lets the browser keep the files with a hash in their name for a year, and makes it ask again for `index.html`.
20. **File names.** `LICENSE` holds the licence, and `NOTICE` holds the notes on the other licences. `scripts/check-release.mjs` checks the release files and looks for secrets. The npm script `deploy` builds the app and runs `npx firebase-tools deploy --only hosting`. The make target `deploy` calls that script, and it is the command the user runs to deploy, which the user asked for on 2026-11-25. It does not run the checks first, so the user runs `make check` before it. `README.md` gets a Release section with the steps the user runs, and it names `make deploy`.

## Left for later features

- The download link for the Mac app waits for feature 10, and the App Store submission for the iPad app waits for feature 11.
- A sign up in the app is not in this feature. Testers are invited.
- A domain of its own and a page that presents Symple are not in this feature.
