# Roadmap

Each feature lists its goal, the requirements it covers and its status. The requirement names are section headings in PRODUCT.md unless a line says otherwise.

Two rules apply to every feature. Each screen for the primary user must work by single switch scanning, and each screen must pass WCAG 2.2 Level AA.

## Core

1. **App shell and themes.** The Angular project builds, runs its tests and shows an empty screen with the shared header, the footer and the colour themes. Covers: Stack, Accessibility and Inclusion. Status: done.
2. **Home screen from data.** The home screen is drawn from `boards.json` and `tiles.json` as a small grid of large cells, each with a colour, a label and an icon. Covers: Capabilities (home screen, cell contents), Principles 3 and 4, the data rule in tech-stack.md. Status: planned.
3. **Scanning.** The app highlights rows and then cells in turn, and one switch or several switches pick a target, while caregiver controls are skipped. Covers: Capabilities (scanning), Principle 2, Accessibility and Inclusion. Status: planned.
4. **Speech.** The app speaks text through a voice source interface, with the system voices as the first source. Covers: Speech output. Status: planned.
5. **Communication boards.** A cell on the home screen opens a board, and picking a cell on the board speaks its phrase. The first boards are Needs, Quick phrases and My boards. Covers: Capabilities (communication boards), Product Purpose. Status: planned.
6. **Keyboard.** The user writes a message with a scanning keyboard and suggested words, then speaks it. Covers: Product Purpose (say something to the person in the room), the keyboard mockup. Status: planned.
7. **Settings.** The caregiver sets the scan time, the theme, and the voice with its rate, pitch and volume. Covers: Speech output (caregiver picks the voice), Principle 5. Status: planned.
8. **Board editing.** The caregiver adds, removes, moves and edits boards and cells on the device, and the changes are saved. Covers: Users (secondary user), Operating Context (caregiver configures on the same device), Principle 5. Status: planned.

## Packaging

9. **Mac app.** Electron packages the build as a Mac app that can stay open all day. Covers: Platform, Stack, Operating Context. Status: planned.
10. **iPad app.** Capacitor packages the build as an iPad app with the iOS system voices. Covers: Platform, Stack, Speech output. Status: planned.
11. **Head tracker and eye gaze.** Every screen can be used with a pointer that is driven by a head tracker or by eye gaze. Covers: Accessibility and Inclusion, Operating Context. Status: planned.

## Release

12. **Public release.** Symple is released to the public with a download link for the Mac app, a link to the public repo with its licence, and an App Store submission for the iPad app. Covers: the release step added on 2026-11-16, Platform. Status: planned.

## Activities

13. **Messaging.** The user reads messages from a contact and sends a reply written with the keyboard. Covers: the home and messaging mockups, added to scope on 2026-11-16. Status: planned.
14. **Music.** The user picks and plays music alone. Covers: Capabilities (activities), Product Purpose. Status: planned.
15. **Photos.** The user looks through photos alone. Covers: Capabilities (activities), Product Purpose. Status: planned.
16. **Video.** The user picks and watches a video alone. Covers: Capabilities (activities), Product Purpose. Status: planned.
17. **Games.** The user plays a small set of games by scanning. Covers: the home mockup, added to scope on 2026-11-16. Status: planned.
18. **Home control.** The user controls devices in the home from a board. Covers: Capabilities (activities), Product Purpose. Status: planned.

## Later

19. **Streaming services on Mac and iPad.** The Mac and iPad apps play music from Spotify and Apple Music and video from YouTube, as the web version already does. Covers: the media decision of 2026-11-16. Status: planned.

## Open questions

Each question must be answered in the plan of the feature it names.

- Feature 9: how Electron loads the build. `src/index.html` uses a base href of `/`, so the app may not load from disk as it is. The plan must also test that the font loads in the packaged Mac app.
- Feature 10: how switches reach the app on iPad.
- Feature 10: whether the iPad app works in portrait. Features before it are built and tested in landscape only.
- Feature 10: the end to end tests run in Chromium only until then. The plan must add WebKit.
- Feature 12: which licence the public repo uses. The Mulberry symbols are CC BY-SA 4.0, so the choice must allow for that.
- Feature 12: whether the Mac app also goes to the Mac App Store, or is offered only as a download.
- Feature 12: whether the patent attorney has confirmed the limits in tech-stack.md, because the release includes the generated suggestions of feature 6.
- Feature 13: where the Twilio keys are kept and how incoming texts reach the app. The two candidates are Firebase functions with Firestore, and Twilio Conversations.
- Feature 15: what the web version shows for photos, because a browser cannot read the device's photo library and no streaming service covers photos.
- Feature 17: when the timed games are added, and how slow they run.

## Decisions made on 2026-11-16

- Feature 5: the boards use the Mulberry symbols.
- Feature 6: a language model generates the suggested words. The patent limits in tech-stack.md apply. There are three sources: the Apple model on the device, Claude and Gemini. The caregiver picks the source in settings, and a bundled word list is the fallback.
- Feature 11: on iPad, the iPad's own pointer carries head tracking and eye gaze and does the dwell click. Symple receives a tap.
- Feature 13: Twilio carries the messages as text messages (SMS), so contacts use their own messaging app. The caregiver sets which contacts the user can message.
- Features 14, 15 and 16: on the Mac and iPad apps, music, photos and videos come from the device's own libraries by default. Streaming services come later for those apps, in feature 19.
- Features 14 and 16: the web version cannot read the device's libraries, so it gets streaming in these features. Music comes from Spotify and Apple Music, and video comes from YouTube.
- Feature 17: the games cover four kinds. They are turn based board games, word games, card and matching games, and timed games with a slow mode for scanning.
- Feature 17: the first set is untimed. It holds chess against the computer, a five letter word guessing game and memory pairs. Each is Symple's own version. The timed games wait until the slow mode has been tried with real users.
- Feature 18: home control connects through a Home Assistant hub in the home. The caregiver sets up the hub and links it to Symple.

## Not on the roadmap

- A second voice source is not on the roadmap, because none has been chosen.
- Languages other than English are not on the roadmap.
- Generative features other than the keyboard suggestions in feature 6 are not on the roadmap. Adding one needs the patent check first.
