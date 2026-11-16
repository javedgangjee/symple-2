# Tech stack

The versions below were set on 2026-11-16.

## Languages and frameworks

- The app is written in TypeScript with strict mode on.
- The interface is one Angular 22 app. All three targets use the same build.
- Electron 45 packages the build as the Mac app.
- Capacitor 8 packages the build as the iPad app. There is no iPhone layout.
- The web version is the Angular app served to a browser on a Mac.

## Tools

- Node 22 runs the build, and npm is the package manager.
- The Angular CLI builds and serves the app.
- Xcode is needed to build the iPad app. It is not installed on the development Mac yet.

## Tests

- Vitest runs the unit tests.
- Playwright runs the end to end tests in a browser.
- axe-core runs inside the Playwright tests and checks each screen against WCAG 2.2 Level AA.
- Every screen for the primary user has an end to end test that reaches each target by single switch scanning.

## Data

- Boards and cells are data. The app loads them from `boards.json` and `tiles.json`. A hardcoded board or cell is an exception and needs a stated reason.
- Settings and edited boards are stored on the device.
- Firebase is the cloud provider if a feature needs a cloud service. No feature uses one until its plan says so.
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
- Scan order runs by row, left to right and then top to bottom. One gap size is used across a screen.

## Patents

- The three patents in `context/patents/` cover generative content, generative messaging and an effector for brain computer interfaces.
- Synchron Australia owns the two generative patents, US 12,260,774 and US 12,675,164.
- Any feature that generates content or suggestions must be checked against these patents during its plan, before any code is written.
- The two generative patents were read on 2026-11-16. The limits below come from that reading. It is not a legal opinion, and a patent attorney should confirm it before feature 6 is built.
- Generated suggestions must not carry an emotion or a tone. Symple does not label, colour, group or offer them by emotion or tone, and the user never picks a mood first.
- Symple does not accept input from a brain computer interface, and its documents do not offer one. This includes an EEG headset used as a switch.
- Symple does not classify the topic of a message as a separate step, and it does not record the speech of the other person.
- The plan for feature 6 must state what data goes to the model. Data about the user, such as past messages or a profile, raises the risk and needs a stated reason.
