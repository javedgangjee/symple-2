# Tech stack

The versions below were set on 2026-11-16.

## Languages and frameworks

- The app is written in TypeScript with strict mode on.
- The interface is one Angular 22 app. All three targets use the same build.
- Electron 45 packages the build as the Mac app.
- Capacitor 8 packages the build as the iPad app. There is no iPhone layout.
- The web version is the Angular app served to a browser on a Mac. Firebase Hosting serves it at `https://symple-2.web.app`, from the hosting block of `firebase.json`. `make deploy` builds the app and deploys it, and only the user runs it. Added on 2026-11-25. The user's own domain `symple-aac.com` is connected to the same Hosting site and is in the authorised domains of Firebase Auth. Its DNS is at Cloudflare, with an A record that must stay on DNS only, because a proxied record stops Firebase from renewing the certificate. Added on 2026-11-25.

## Tools

- Node 22 runs the build, and npm is the package manager. Angular needs Node 22.22.3 or later, and `.nvmrc` pins 22.23.5.
- The Angular CLI builds and serves the app.
- Xcode is needed to build the iPad app. It is not installed on the development Mac yet.
- ESLint with angular-eslint 22 checks the code and the templates. Prettier formats the files. Added on 2026-11-16.
- `node scripts/check-release.mjs` checks the files of the public release, and it looks for secrets in the tracked files and in every commit of the history. `make check` runs it. Added on 2026-11-25.
- The code is under the Apache License 2.0. `LICENSE` holds its text, and `NOTICE` says which files the licences of Mulberry, Lucide and Libre Franklin cover. Decided on 2026-11-25.

## Tests

- Vitest runs the unit tests.
- Playwright runs the end to end tests in a browser.
- axe-core runs inside the Playwright tests and checks each screen against WCAG 2.2 Level AA.
- Every screen for the primary user has an end to end test that reaches each target by single switch scanning. The scanning tests store their settings before the app starts and move the clock of the page with the Playwright clock, in `e2e/support/scan.ts`, so no test waits in real time.
- The tests never reach Firebase, and they do not use the Firebase emulator, because the development Mac has no Java. The unit tests use fakes of the auth source and the cloud store. The end to end tests answer the Firebase Auth network calls with canned replies and block the Firestore calls, in `e2e/support/firebase.ts`. A setup project signs in once and saves the browser state, and the other tests start from it. The Firestore access rules are checked by hand.

## Data

- Boards and cells are data. The app loads them from `boards.json` and `cells.json`. A hardcoded board or cell is an exception and needs a stated reason.
- The data files are `src/data/boards.json` and `src/data/cells.json`, and they are built into the app. `src/data/symbols.json` lists each of the 3,437 symbols as a file and a name, and `src/data/lucide.json` holds the drawings of all 2,098 Lucide icons as a name and a list of shapes. The app fetches each list on demand and does not build it into the main bundle: `symbols.json` the first time the tile dialog opens, and `lucide.json` the first time a cell or the tile dialog needs it. A board carries `locked: true` when the caregiver cannot edit it, as the four keyboards and the Keyboards list do. The symbols are in `public/symbols/`, with the credit and the original file names in `ATTRIBUTION.txt`. Of the 3,437 files, 3,436 come from Mulberry Symbols release 3.6.1 and take 33.8 MB. The other one, `stop.svg`, is Symple's own drawing.
- Three scripts in `scripts/` keep the pictures in order. `node scripts/import-mulberry.mjs <folder>` copies the Mulberry symbols from an unpacked release and writes `symbols.json` and `ATTRIBUTION.txt`. `node scripts/import-lucide.mjs` writes `lucide.json` from the package `lucide-static`. `node scripts/check-pictures.mjs` checks the two lists against the files and the package, and `make check` runs it.
- Settings and edited boards are stored on the device. The service in `src/app/storage/local-store.ts` reads and writes local storage and does not throw when storage fails.
- The set is every board and every tile together. Once the caregiver changes a board, the app stores the whole set under `symple.boards` and `symple.tiles`, as two JSON texts in the shape of the two data files. Until then, and when a stored text cannot be read, the app uses the built-in files. `loadBoards` checks a stored set as it checks the files. The service in `src/app/boards/board-store.ts` reads and writes the set, and the functions in `src/app/edit/board-edits.ts` change it. A sign out removes the stored set from the device.
- Firebase is the cloud provider if a feature needs a cloud service. No feature uses one until its plan says so. The Firebase project id is `symple-2`, and the app uses the `firebase` npm package, version 13, with no AngularFire.
- Firebase Auth holds the caregiver accounts. The caregiver signs in with an email address and a password, and the sign in is kept on the device. The user makes each account in the Firebase console, and account creation is turned off in the project.
- Firestore holds a second copy of the settings in the document `users/{uid}`. The app syncs eleven fields, each saved as text: `theme`, `scanTime`, `postClickDelay`, `selectionMode`, `dwellTime`, `dwellStyle`, `showProgressBar`, `voice`, `voiceRate`, `voicePitch` and `voiceVolume`. A twelfth field, `layout`, stays in the document of an account that has it, and nothing reads it. One account holds one set of settings.
- Firestore holds a second copy of the set of boards in the document `users/{uid}/data/boards`, with the fields `tiles` and `boards` as JSON text. A set in the cloud replaces the set of the device, and a change on the device saves the whole set. When two devices change their boards with no network, the last save wins.
- The access rules in `firestore.rules` let an account reach only its own two documents. The settings document takes only its twelve known fields, each a text of at most 500 characters. The boards document takes only `tiles` and `boards`, each a text of at most 500,000 characters. No rule allows a delete.
- Auth and the cloud copy each sit behind an interface, as speech does, so the screens and the tests do not depend on Firebase.
- Messaging sends and receives text messages (SMS) through Twilio. The Twilio keys must stay on a server and never ship inside the app. Text messages are not end to end encrypted, and they pass through Twilio and the phone carriers.
- Music, photos and videos come from the device's own libraries. The Mac app reads them through Electron and the iPad app reads them through Capacitor.
- Home control talks to a Home Assistant hub on the home network. Symple does not talk to device brands directly.

## Speech

- Speech goes through one voice source interface, so a second source can be added without changing the screens.
- The only voice source for now is the system voices. The web and Mac builds reach them through the Web Speech API. The iPad build reaches the iOS voices through Capacitor.
- The code is in `src/app/speech/`. `voice-source.ts` holds the interface and its injection token, `system-voice-source.ts` holds the Web Speech source, `fake-voice-source.ts` holds the fake for the unit tests, `speech.ts` holds the `Speech` service that the screens call, and `voice-settings.ts` holds the chosen voice with its rate, pitch and volume.
- The system source uses the default voice of the browser when that voice is English. Otherwise it uses the first English voice in the list. The source asks for the list of voices when it is made, and a pick that finds the list empty waits up to one second for it. With no English voice, or with no voices after the wait, nothing is spoken and one warning goes to the console.
- The caregiver picks the voice and sets its rate, pitch and volume in the settings panel. The four values are stored under `symple.voice`, `symple.voiceRate`, `symple.voicePitch` and `symple.voiceVolume`, and they are synced. The voice is stored as the id that the browser gives it. The list holds the English voices only. Until a voice is picked, and when the stored voice is not on the device, for example after a sync from another device, the rule above picks the voice and the stored choice is kept.
- A voice that runs on a server, such as the Google voices of Chrome, is used like any other. With such a voice, speech needs a network and the spoken text leaves the device.
- As far as is known, Chrome speaks only after the page has had a key press, a click or a tap since it was loaded. This has not been confirmed by hand. If it holds, in `dwell` mode with a head tracker, a pointer that only moves does not count, and after a reload nothing is spoken until someone presses a key or clicks once. Feature 10 can lift this in Electron.
- The `Speech` service does not speak a text that is empty or holds only white space.
- The end to end tests put a stand-in for the Web Speech API on every page that the helpers `openBoard` and `open` load, in `e2e/support/speech.ts`, so no test speaks aloud. A page that a test opens with `page.goto` does not get it.

## Suggested words

- Keyboard suggestions go through one suggestion source interface, so a source can be added or removed without changing the screens.
- The first source is the Apple model on the device, reached through the Foundation Models framework. The iPad app reaches it through a Swift plugin for Capacitor, and the Mac app reaches it through a native helper. The web version cannot use it.
- The second source is Claude Haiku 5.5, called through a Firebase function that holds the key.
- The third source is Gemini, called through Firebase's model service.
- The caregiver picks the source in settings. There is no fixed default.
- A bundled English word list is the fallback when the chosen source cannot be reached.
- With Claude or Gemini, the text being typed leaves the device. The settings screen must say so next to the choice.

## Input

- A switch reaches the app as a key press. A pointer press on a cell presses that cell and is not treated as a switch, because the app cannot tell a switch from a tap on a cell. Scanning is built in the app and does not rely on the scanning of the operating system.
- Tab and Enter are the switch keys. Tab moves the highlight, Shift with Tab moves it back, and Enter picks. The keyboard focus moves with the highlight.
- A stored setting, the selection mode, says how the primary user selects. It has five values, and `scan` is the default. In `scan` the highlight moves by itself after each scan time, for one switch. In `step` Tab moves it, for two switches. In `cursor` and `touch` the user presses a cell with a pointer or a finger, and `cursor` draws a round cursor over the whole page at the place of the pointer. `dwell` adds the dwell press.
- In the dwell press, a pointer that rests on a cell for the dwell time presses it. The dwell style says how the cell shows the time running, and is `grow` or `bar`.
- The settings button and anything else outside the grid are not in the tab order, so Tab never leaves the grid. Control with the comma key opens the settings panel from any board, in every selection mode, and it is never a switch key. The button names the shortcut. Inside the panel, Tab, the arrow keys, Space, Enter and Escape work as the browser gives them.
- While the settings panel is open the scan rests, Tab and Enter are not switches, no dwell runs and the round cursor is not drawn. A changed setting takes effect at once, with no reload. The scan starts from rest at the first switch press after the panel is closed.
- The same things rest in edit mode. The cells then do nothing and take no focus, the settings button is hidden, and Control with the comma key does nothing. The scan starts from rest at the first switch press after Done.
- Six values are stored on the device and are synced, like every other setting. They are `symple.scanTime`, `symple.postClickDelay`, `symple.selectionMode`, `symple.dwellTime`, `symple.dwellStyle` and `symple.showProgressBar`. The times are in milliseconds.
- Show progress bar says whether the highlight shows a bar that counts down the scan time in `scan` mode. It is off by default.
- On iPad, the iPad's own pointer carries head tracking and eye gaze and does the dwell click. Symple receives a tap.
- How switches reach the app on iPad is not decided.

## Design reference

- The mockups in `context/design/` show the intended look and layout. They are a guide and can be changed when a feature plan gives a reason. The folder `context/` is kept on the development Mac and is not in the repo.
- The product typeface is Libre Franklin, as in the mockups. The font file ships with the app, so it works offline.
- The tab icon is the black and white Symple icon of `src/app/shell/logo.ts`. `public/favicon.svg` holds it with the letter drawn as a path, and `public/favicon.ico` is made from it.
- Red Hat Display is stored next to it in `context/design/mockups/home/fonts/` for later use. No screen uses it until the user says so.
- The boards use the Mulberry symbol set, release 3.6.1, which is licensed CC BY-SA 4.0. The app must credit it, and any changed symbol must be shared under the same licence. `public/licenses/mulberry.txt` holds its text.
- Every line icon is a Lucide icon from Lucide 1.77.0. The app has no icon package at run time. The 18 icons of `src/app/cells/icon.ts` keep their drawings in the code. Any other Lucide icon is drawn inline from `lucide.json`. The package `lucide-static` is a development package that only the import script reads. A tile names a Lucide icon in its `icon` field as `lucide:` plus the Lucide name, such as `lucide:apple`. Lucide is under the ISC licence, and `public/licenses/lucide.txt` holds its text. Decided on 2026-11-22.
- The settings panel is 80 parts in 100 of the width of the window and 95 of its height. The tile dialog of edit mode has the same size, and both read it from `--panel-width` and `--panel-height` in `src/styles.css`. The Board settings dialog stays narrow. It has no notes under its settings, and it has no layout control. The rate, the pitch and the volume are set with a minus and a plus button, as the times are.
- The style budget of a component in `angular.json` is a warning at 8 kB and an error at 16 kB. It was raised from 4 kB and 8 kB in feature 8, because the styles of the settings panel are larger than 4 kB. Angular has one such budget for all components.
- A group of cells is a column or a row. In the columns layout each group is a column, read top to bottom. In the rows layout each group is a row, read left to right. Each board sets its own layout in its `layout` field, and a board with none is drawn in columns. The caregiver sets it in the board settings of edit mode. Scan order follows the groups and then the cells of a group.
- A board can hold any number of groups and a group any number of cells, as long as no cell gets smaller than 48px in the window in use. An Add button of edit mode with no room says that it is disabled and why.
- The edit buttons of a cell carry a light ring round their ink border, which the mockup does not have, so the border keeps its contrast on a dark cell.
- The scan highlight follows the home mockup with two changes. No cell is dimmed, and a highlighted group lies on a plate in the dark grey of the theme. The rules for the scan, the dwell styles and the round cursor are in `src/styles/scan.css`.
- One gap size is used across a screen. While the scan time bar is shown, each group also keeps room under its cells for it, so in the rows layout the space between two rows is bigger than the gap.

## Patents

- The three patents in `context/patents/` cover generative content, generative messaging and an effector for brain computer interfaces. The folder is kept on the development Mac and is not in the repo.
- Synchron Australia owns the two generative patents, US 12,260,774 and US 12,675,164.
- Any feature that generates content or suggestions must be checked against these patents during its plan, before any code is written.
- The two generative patents were read on 2026-11-16. The limits below come from that reading. It is not a legal opinion, and a patent attorney should confirm it before feature 7 is built.
- Generated suggestions must not carry an emotion or a tone. Symple does not label, colour, group or offer them by emotion or tone, and the user never picks a mood first.
- Symple does not accept input from a brain computer interface, and its documents do not offer one. This includes an EEG headset used as a switch.
- Symple does not classify the topic of a message as a separate step, and it does not record the speech of the other person.
- The plan for feature 7 must state what data goes to the model. Data about the user, such as past messages or a profile, raises the risk and needs a stated reason.
