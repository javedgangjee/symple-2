# Tech stack

The versions below were set on 2026-11-16.

## Languages and frameworks

- The app is written in TypeScript with strict mode on.
- The interface is one Angular 22 app. All three targets use the same build.
- Electron 45 packages the build as the Mac app.
- Capacitor 8 packages the build as the iPad app. There is no iPhone layout.
- The web version is the Angular app served to a browser on a Mac.

## Tools

- Node 22 runs the build, and npm is the package manager. Angular needs Node 22.22.3 or later, and `.nvmrc` pins 22.23.5.
- The Angular CLI builds and serves the app.
- Xcode is needed to build the iPad app. It is not installed on the development Mac yet.
- ESLint with angular-eslint 22 checks the code and the templates. Prettier formats the files. Added on 2026-11-16.

## Tests

- Vitest runs the unit tests.
- Playwright runs the end to end tests in a browser.
- axe-core runs inside the Playwright tests and checks each screen against WCAG 2.2 Level AA.
- Every screen for the primary user has an end to end test that reaches each target by single switch scanning.
- The tests never reach Firebase, and they do not use the Firebase emulator, because the development Mac has no Java. The unit tests use fakes of the auth source and the cloud store. The end to end tests answer the Firebase Auth network calls with canned replies and block the Firestore calls, in `e2e/support/firebase.ts`. A setup project signs in once and saves the browser state, and the other tests start from it. The Firestore access rules are checked by hand.

## Data

- Boards and cells are data. The app loads them from `boards.json` and `cells.json`. A hardcoded board or cell is an exception and needs a stated reason.
- The data files are `src/data/boards.json` and `src/data/cells.json`, and they are built into the app. The symbols are in `public/symbols/`, with the credit and the original file names in `ATTRIBUTION.txt`.
- Settings and edited boards are stored on the device.
- Firebase is the cloud provider if a feature needs a cloud service. No feature uses one until its plan says so. The Firebase project id is `symple-2`, and the app uses the `firebase` npm package, version 13, with no AngularFire.
- Firebase Auth holds the caregiver accounts. The caregiver signs in with an email address and a password, and the sign in is kept on the device. The user makes each account in the Firebase console, and account creation is turned off in the project.
- Firestore holds a second copy of the settings in the document `users/{uid}`, with the fields `theme` and `layout` for now. The access rules in `firestore.rules` let an account reach only its own document. One account holds one set of settings.
- Auth and the cloud copy each sit behind an interface, as speech does, so the screens and the tests do not depend on Firebase.
- Messaging sends and receives text messages (SMS) through Twilio. The Twilio keys must stay on a server and never ship inside the app. Text messages are not end to end encrypted, and they pass through Twilio and the phone carriers.
- Music, photos and videos come from the device's own libraries. The Mac app reads them through Electron and the iPad app reads them through Capacitor.
- Home control talks to a Home Assistant hub on the home network. Symple does not talk to device brands directly.

## Speech

- Speech goes through one voice source interface, so a second source can be added without changing the screens.
- The only voice source for now is the system voices. The web and Mac builds reach them through the Web Speech API. The iPad build reaches the iOS voices through Capacitor.

## Suggested words

- Keyboard suggestions go through one suggestion source interface, so a source can be added or removed without changing the screens.
- The first source is the Apple model on the device, reached through the Foundation Models framework. The iPad app reaches it through a Swift plugin for Capacitor, and the Mac app reaches it through a native helper. The web version cannot use it.
- The second source is Claude Haiku 5.5, called through a Firebase function that holds the key.
- The third source is Gemini, called through Firebase's model service.
- The caregiver picks the source in settings. There is no fixed default.
- A bundled English word list is the fallback when the chosen source cannot be reached.
- With Claude or Gemini, the text being typed leaves the device. The settings screen must say so next to the choice.

## Input

- A switch reaches the app as a key press or a pointer press. Scanning is built in the app and does not rely on the scanning of the operating system.
- On iPad, the iPad's own pointer carries head tracking and eye gaze and does the dwell click. Symple receives a tap.
- How switches reach the app on iPad is not decided.

## Design reference

- The mockups in `context/design/` show the intended look and layout. They are a guide and can be changed when a feature plan gives a reason.
- The product typeface is Libre Franklin, as in the mockups. The font file ships with the app, so it works offline.
- Red Hat Display is stored next to it in `context/design/mockups/home/fonts/` for later use. No screen uses it until the user says so.
- The boards use the Mulberry symbol set, which is licensed CC BY-SA 4.0. The app must credit it, and any changed symbol must be shared under the same licence.
- A group of cells is a column or a row. In the columns layout each group is a column, read top to bottom. In the rows layout each group is a row, read left to right. A stored setting picks the layout, and columns are the default. A board can fix its own layout, as the keyboard does with rows. Scan order follows the groups and then the cells of a group.
- One gap size is used across a screen.

## Patents

- The three patents in `context/patents/` cover generative content, generative messaging and an effector for brain computer interfaces.
- Synchron Australia owns the two generative patents, US 12,260,774 and US 12,675,164.
- Any feature that generates content or suggestions must be checked against these patents during its plan, before any code is written.
- The two generative patents were read on 2026-11-16. The limits below come from that reading. It is not a legal opinion, and a patent attorney should confirm it before feature 7 is built.
- Generated suggestions must not carry an emotion or a tone. Symple does not label, colour, group or offer them by emotion or tone, and the user never picks a mood first.
- Symple does not accept input from a brain computer interface, and its documents do not offer one. This includes an EEG headset used as a switch.
- Symple does not classify the topic of a message as a separate step, and it does not record the speech of the other person.
- The plan for feature 7 must state what data goes to the model. Data about the user, such as past messages or a profile, raises the risk and needs a stated reason.
