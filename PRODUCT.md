# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

One custom Symple interface, built once in Angular. It ships as a macOS app, an iPad app and a web app. It does not follow Apple conventions on the Mac or on iOS, so the platform value stays `web`.

## Stack

Angular. Electron packages the same build as the macOS app. Capacitor packages it as the iOS app. The web version is the Angular app served to a browser.

The iOS build is for iPad only. There is no iPhone version.

There is no Android app.

History: on 2026-11-10 the plan moved from Angular with Capacitor to Flutter, then to Angular with Electron. iOS and Android were in the original brief and were removed on the same day. iOS was added back on 2026-11-15, for iPad only, with Capacitor as its wrapper.

## Users

**Primary user.** A person who cannot speak clearly and cannot point precisely. Common causes are ALS, cerebral palsy and traumatic brain injury. Most select with a single switch, a head tracker or eye gaze.

**Secondary user.** The caregiver or clinician who sets up the boards and the settings.

## Product Purpose

Symple lets the primary user do everyday things without asking a helper: say something to the person in the room, play music, watch a video, look at photos, or control something in the home.

Success means the user completes these activities alone.

## Positioning

Grid 3, CoughDrop, TD Snap and Proloquo2Go are built around communication boards. Symple differs in two ways:

- The home screen puts every activity on equal footing. Communication boards are one cell among several.
- Each screen holds a few large cells, sized for people with the least motor control, where the alternatives use dense grids.

This version is a rewrite of SYMPLE, which Javed Gangjee built at the SpeakYourMind Foundation in the 2010s. "symple-2" is the project folder name. The product name is Symple.

## Operating Context

- Runs on a Mac as a desktop app, on an iPad as an app, or in a web browser on a Mac.
- Stays open for most of the day.
- The user is usually talking to someone in the same room.
- Input comes from a single switch, multiple switches, a head tracker, or eye gaze.
- A caregiver or clinician configures boards and settings on the same device, then the primary user works alone.

## Capabilities and Constraints

**Confirmed**

- The home screen is a small grid of large cells. Each cell opens one activity.
- Activities: communication boards, music, video, photos, home control.
- Web browsing is out of scope. The original brief listed it and it was dropped on 2026-11-10.
- Every screen must work by scanning, with a single switch or with multiple switches.
- Each cell carries a colour, a label and an icon.

**Speech output**

- Symple speaks the user's words aloud with text to speech (TTS).
- Symple will support more than one voice source. The app treats a voice source as a replaceable part, so adding one later does not change the screens.
- The first voice source is the system voices of the device. On a Mac these are the macOS system voices. On an iPad these are the iOS system voices. They include the voices already installed, plus any the caregiver downloads in the device's settings.
- The system voices are the only voice source for now. No second source has been chosen. Decided on 2026-11-15.
- The caregiver picks the voice in settings and can set its rate, pitch and volume. The primary user does not have to choose a voice to speak.
- The interface, the boards and the speech are in English only for now. Other languages are later work.
- The web version is supported only in a browser on a Mac for now, because the voices come from macOS. Other computers wait until a second voice source exists.

**Terms**

- Cell: one selectable target on a screen. "Tile" means the same thing. This file uses "cell".
- Board: a communication screen of cells.
- Scanning: the app highlights targets in turn and the user triggers a switch to pick one.
- Voice source: a system or service that supplies TTS voices, such as the system voices of a Mac or an iPad.

**Not decided**

- How home control connects to devices. Reviewed on 2026-11-15 and left open until home control is designed.
- iOS build: how switches, head tracking and eye gaze reach the app on iPad. Set aside on 2026-11-15.

## Brand Commitments

- The name is Symple.
- It continues the SYMPLE product from the SpeakYourMind Foundation.
- No logo, voice guide or other brand assets have been supplied.

## Product Principles

1. **Independence is the measure.** A feature that needs a helper to operate has not met the goal.
2. **Switch access comes first.** Every screen is designed for single-switch scanning first, then for the other input methods. No screen may contain a target meant for the primary user that scanning cannot reach. Caregiver controls, such as the settings button, are skipped by scanning.
3. **Few, large targets.** Each added cell costs the user scan time and accuracy, so each one has to justify its place.
4. **Activities share one home screen.** Music, video, photos and home control sit in the same grid as speech and are reached the same way. Speech may take more cells because it is used most and most urgently.
5. **Setup belongs to the caregiver, use belongs to the user.** Configuration stays out of the primary user's path.

## Accessibility & Inclusion

Accessibility is the product. Required on every screen:

- Operable by scanning, with a single switch or with multiple switches.
- Usable with a head tracker and eye gaze.

The target standard is WCAG 2.2 Level AA.
