# Roadmap

Each feature lists its goal, the requirements it covers and its status. The requirement names are section headings in PRODUCT.md unless a line says otherwise.

Two rules apply to every feature. Each screen for the primary user must work by single switch scanning, and each screen must pass WCAG 2.2 Level AA.

## Core

1. **App shell and themes.** The Angular project builds, runs its tests and shows an empty screen with the shared header, the footer and the colour themes. Covers: Stack, Accessibility and Inclusion. Status: done.
2. **Home screen and boards from data.** The home screen, the communication boards and the keyboard are drawn from `boards.json` and `cells.json` as grids of cells, each with a colour, a label and an icon or a symbol. A cell on the home screen opens a board, and a Back tile leads back. The first boards are Needs, Quick phrases, My boards and the keyboard, whose letters are tiles that write a message. Covers: Capabilities (home screen, cell contents, communication boards), Product Purpose, Principles 3 and 4, the keyboard mockup, the data rule in tech-stack.md. Status: in progress.
3. **Sign in.** The caregiver signs in to Symple through Firebase Auth. Covers: the sign in step added on 2026-11-16, the cloud rule in tech-stack.md. Status: planned.
4. **Scanning.** The app highlights rows and then cells in turn, and one switch or several switches pick a target, while caregiver controls are skipped. Covers: Capabilities (scanning), Principle 2, Accessibility and Inclusion. Status: planned.
5. **Speech.** The app speaks text through a voice source interface, with the system voices as the first source. Picking a cell on a board speaks its phrase and shows the dark picked look of the Needs mockup while it speaks, and picking the message on the keyboard speaks the message. Covers: Speech output, Product Purpose. Status: planned.
6. **Removed.** Communication boards were merged into feature 2 on 2026-11-16, and speaking a phrase moved to feature 5. The number is kept so that the other feature numbers do not change.
7. **Word suggestions.** The keyboard shows suggested words for the word being typed. The keyboard itself was merged into feature 2 on 2026-11-16, and speaking the message moved to feature 5. Covers: Product Purpose (say something to the person in the room), the keyboard mockup. Status: planned.
8. **Settings.** The caregiver sets the scan time, the theme, the layout of columns or rows, and the voice with its rate, pitch and volume. The settings panel shows the credit for the Mulberry symbols and for the Material icons. Covers: Speech output (caregiver picks the voice), Principle 5. Status: planned.
9. **Board editing.** The caregiver adds, removes, moves and edits boards and cells on the device, and the changes are saved. An empty board and an empty group show an Add button, which is a caregiver control that scanning skips. Covers: Users (secondary user), Operating Context (caregiver configures on the same device), Principle 5. Status: planned.

## Packaging

10. **Mac app.** Electron packages the build as a Mac app that can stay open all day. Covers: Platform, Stack, Operating Context. Status: planned.
11. **iPad app.** Capacitor packages the build as an iPad app with the iOS system voices. Covers: Platform, Stack, Speech output. Status: planned.
12. **Head tracker and eye gaze.** Every screen can be used with a pointer that is driven by a head tracker or by eye gaze. Covers: Accessibility and Inclusion, Operating Context. Status: planned.

## Release

13. **Public release.** Symple is released to the public with a download link for the Mac app, a link to the public repo with its licence, and an App Store submission for the iPad app. Covers: the release step added on 2026-11-16, Platform. Status: planned.

## Media

14. **Music.** The user picks and plays music alone. Covers: Capabilities (activities), Product Purpose. Status: planned.
15. **Photos.** The user looks through photos alone. Covers: Capabilities (activities), Product Purpose. Status: planned.
16. **Video.** The user picks and watches a video alone. Covers: Capabilities (activities), Product Purpose. Status: planned.

## Activities

17. **Games.** The user plays a small set of games by scanning. Covers: the home mockup, added to scope on 2026-11-16. Status: planned.
18. **Messaging.** The user reads messages from a contact and sends a reply written with the keyboard. Covers: the home and messaging mockups, added to scope on 2026-11-16. Status: planned.
19. **Home control.** The user controls devices in the home from a board. Covers: Capabilities (activities), Product Purpose. Status: planned.

## Later

20. **Streaming services on Mac and iPad.** The Mac and iPad apps play music from Spotify and Apple Music and video from YouTube, as the web version already does. Covers: the media decision of 2026-11-16. Status: planned.

## Open questions

Each question must be answered in the plan of the feature it names.

- Feature 10: how Electron loads the build. `src/index.html` uses a base href of `/`, so the app may not load from disk as it is. The plan must also test that the font loads in the packaged Mac app.
- Feature 10: whether the symbol images load in the packaged Mac app. Their addresses are relative, such as `symbols/help.svg`.
- Feature 11: how switches reach the app on iPad.
- Feature 11: whether the iPad app works in portrait. Features before it are built and tested in landscape only.
- Feature 11: the end to end tests run in Chromium only until then. The plan must add WebKit.
- Feature 13: which licence the public repo uses. The Mulberry symbols are CC BY-SA 4.0, so the choice must allow for that.
- Feature 13: whether the Mac app also goes to the Mac App Store, or is offered only as a download.
- Feature 13: whether the patent attorney has confirmed the limits in tech-stack.md, because the release includes the generated suggestions of feature 7.
- Feature 15: what the web version shows for photos, because a browser cannot read the device's photo library and no streaming service covers photos.
- Feature 17: when the timed games are added, and how slow they run.
- Feature 18: where the Twilio keys are kept and how incoming texts reach the app. The two candidates are Firebase functions with Firestore, and Twilio Conversations.

## Decisions made on 2026-11-16

- Feature 3: only the caregiver signs in.
- Feature 3: the caregiver signs in with an email address and a password.
- Feature 3: sign in protects the cloud functions, syncs boards and settings across devices, and backs them up.
- Feature 3: the caregiver must sign in once before the app can be used. After that the app works with no network.
- Feature 2: the boards use the Mulberry symbols.
- Feature 2: a screen has two layouts. In the columns layout each group of cells is a column, and in the rows layout each group is a row. A stored setting picks the layout, and columns are the default. This replaced the rule that scan order runs by row.
- Feature 2: the feature reads the stored layout and shows no picker. Feature 8 adds the picker.
- Feature 2: the home screen draws four cells, which are My boards, Needs, Quick phrases and Keyboards. The other cells of the mockup wait for their own features.
- Feature 2: `cells.json` holds a list of tiles and `boards.json` holds a list of boards. A board has groups, a group has cells, and a cell names a tile and can give a size.
- Feature 2: the grid flexes with the tiles. The groups fill the main area equally, and the cells of a group fill it by their sizes. Large is 5 parts, medium is 4 and small is 3, and a number is that many parts.
- Feature 2: a board can hold any number of groups, and a group any number of cells. Keeping the cells few and large is up to the person who writes the data.
- Feature 2: a board with no groups and a group with no cells are allowed and are drawn empty. Feature 9 puts an Add button there.
- Feature 2: communication boards are part of feature 2, and feature 6 was removed.
- Feature 2: picking a cell that holds a phrase makes no sound until feature 5. Screen readers get the phrase.
- Feature 2: Back is a tile in the data. It goes to the previous screen, and it is the first cell of every board except home.
- Feature 2: My boards holds typical topic boards, as found in Proloquo2Go or Grid 3.
- Feature 2: the keyboard is a board in the data that is always drawn in the rows layout, and its letters are tiles.
- Feature 2: the Keyboards tile opens a list of three keyboards, which are QWERTY, ABC and Vowels. They share one board of numbers and symbols.
- Feature 2: seven labels of the first boards were changed because Mulberry has no symbol for them. Please, Thank you and Goodbye became More, Good and Finished. Bored and Uncomfortable became Worried and Hungry. Friend and Everyone became Grandparents and Parents.
- Feature 7: a language model generates the suggested words. The patent limits in tech-stack.md apply. There are three sources: the Apple model on the device, Claude and Gemini. The caregiver picks the source in settings, and a bundled word list is the fallback.
- Feature 12: on iPad, the iPad's own pointer carries head tracking and eye gaze and does the dwell click. Symple receives a tap.
- Features 14, 15 and 16: on the Mac and iPad apps, music, photos and videos come from the device's own libraries by default. Streaming services come later for those apps, in feature 20.
- Features 14 and 16: the web version cannot read the device's libraries, so it gets streaming in these features. Music comes from Spotify and Apple Music, and video comes from YouTube.
- Feature 17: the games cover four kinds. They are turn based board games, word games, card and matching games, and timed games with a slow mode for scanning.
- Feature 17: the first set is untimed. It holds chess against the computer, a five letter word guessing game and memory pairs. Each is Symple's own version. The timed games wait until the slow mode has been tried with real users.
- Feature 18: Twilio carries the messages as text messages (SMS), so contacts use their own messaging app. The caregiver sets which contacts the user can message.
- Feature 19: home control connects through a Home Assistant hub in the home. The caregiver sets up the hub and links it to Symple.

## Not on the roadmap

- A second voice source is not on the roadmap, because none has been chosen.
- Languages other than English are not on the roadmap.
- Generative features other than the keyboard suggestions in feature 7 are not on the roadmap. Adding one needs the patent check first.
