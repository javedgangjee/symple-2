# Feature 13: Public release. Plan

The numbers in brackets are the items in requirements.md that a step covers. The agent does steps 1 to 5. The user does step 6, because the agent never pushes and never deploys.

## Step 1. Show where the source code is and that accounts are by invitation (2, 8, 12)

- Changes `src/app/settings/settings-panel.html` and `settings-panel.spec.ts`. The About category gets the row "Source code" with the address of the repo and the name of the licence.
- Changes `sign-in-screen.html`, `sign-in-screen.css` and `sign-in-screen.spec.ts` of `src/app/auth/`. The screen gets the line under the form that says Symple is in testing and accounts are by invitation, with the link "About Symple" to the repo.

## Step 2. Add the licence and the version (5, 9, 18)

- Creates `LICENSE`, which holds the text of the Apache License 2.0 unchanged.
- Creates `NOTICE`. It names the copyright holder and says which files the licences of Mulberry, Lucide and Libre Franklin cover.
- Changes `package.json` and `package-lock.json`. The version becomes `0.1.0`, and the field `license` is `Apache-2.0`.

## Step 3. Serve the build from Firebase Hosting (3, 4, 11, 19, 20)

- Changes `firebase.json`, which gets the hosting block.
- Changes `package.json`, which gets the script `deploy`. It builds the app and then sends the build to Firebase Hosting.
- Changes `Makefile`, which gets the target `deploy`. It calls `npm run deploy`, as every other target calls the npm script of its name, and it is added to the `.PHONY` line. The target `check` does not run it.

## Step 4. Check the release files and look for secrets (15, 20)

- Creates `scripts/check-release.mjs`. It checks the `LICENSE` and `NOTICE` files, the version, the hosting block and the links of step 1. It reads the tracked files and every commit of the history, and reports anything that looks like a private key, a service account file, a token or a password, and any file under `context/`.
- Changes `package.json`, which gets the script `check:release`, and `Makefile`, which gets the target `check-release`. The target `check` runs it.

## Step 5. Write the documents (1, 7, 13, 14, 15, 16, 20)

- Changes `README.md`. It gets the live address, what a visitor needs, that accounts are by invitation, a Privacy section and a Release section with the steps of step 6. It says that `context/` is kept on the development Mac and is not in the repo.
- Changes `specs/tech-stack.md` and `CLAUDE.md`. The hosting is added, and the lines on `context/` say that the folder is not in the repo.
- Changes `PRODUCT.md` only if the user asks. Its line on the first public release still names the Mac app and the iPad app, and the roadmap wins.

## Step 6. Release, done by the user (1, 4, 16)

1. In the Firebase console, check that account creation is off, turn on email enumeration protection, and add `symple-2.web.app` to the authorised domains if it is not there.
2. Run `make check`.
3. Run `make deploy`, and open the live address.
4. Push main, and make the repo public on GitHub.
5. Close the release `0.1.0` in `CHANGELOG.md` with the changelog skill.
