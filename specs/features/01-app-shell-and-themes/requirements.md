# Feature 1: App shell and themes. Requirements

## What the feature must do

1. One Angular 22 project in TypeScript strict mode builds without errors. Source: PRODUCT.md, Stack. tech-stack.md, Languages and frameworks.
2. Node 22 and npm run the build, and the Angular CLI builds and serves the app. Source: tech-stack.md, Tools.
3. Vitest runs the unit tests, Playwright runs the end to end tests, and axe-core runs inside the Playwright tests. Source: tech-stack.md, Tests.
4. The app shows one empty screen with a header, a main area and a footer. Source: roadmap.md, feature 1.
5. The header holds the Symple icon at the left, the screen title in the middle and the settings button at the right. The header is at least 64px high. Source: `context/design/home.html`, and the same header in the Needs, Keyboard and Messaging mockups.
6. The footer is empty and keeps a height of at least 48px, so later screens can put caregiver buttons in it without moving the main area. Source: `context/design/home.html`.
7. The screen fills the window and does not scroll. Source: `context/design/home.html`.
8. The app has five themes named Colours, Blue, Purple, Teal and Dark. Each theme sets the page colours from the values in the mockup. Source: roadmap.md, feature 1. `context/design/home.html`.
9. The typeface is Libre Franklin, and the font file ships with the app so that it works offline. Source: PRODUCT.md, Brand Commitments. tech-stack.md, Design reference.
10. One gap size is used across the screen. Source: tech-stack.md, Design reference.
11. The settings button is a caregiver control, so scanning must skip it. The screen has no target for the primary user yet. Source: PRODUCT.md, Principle 2.
12. The screen passes WCAG 2.2 Level AA in every theme. Source: PRODUCT.md, Accessibility and Inclusion. roadmap.md, the rules for every feature.
13. The interface is in English. Source: PRODUCT.md, Speech output.

## Answered by the user on 2026-11-16

These points are not in the specs. The user decided each one during planning.

14. The Angular project sits at the repo root.
15. The theme is read from a value stored on the device. Blue is used when no value is stored. Feature 1 shows no theme picker. Feature 7 adds the picker and uses the same theme service.
16. The settings button is drawn as in the mockup and is disabled until feature 7.
17. ESLint with angular-eslint 22 checks the code, and Prettier formats it. tech-stack.md now lists both.
18. The shell uses the glass look of `home.html`. The page has three pale colour patches, and the settings button is glass. People who ask their device for less transparency get solid surfaces with no blur.

19. The stored theme uses the browser's local storage under the key `symple.theme`. The stored values are `colours`, `blue`, `purple`, `teal` and `dark`.
20. The theme is applied as a `data-theme` attribute on the `html` element, as in the mockup.
21. The page title in the browser is always `Symple`. It does not change with the screen.
22. The end to end tests run in Chromium only. Safari and the iPad's WebKit are not tested until feature 10.
23. The tests use two window sizes, 1024 by 768 and 1440 by 900. Both are landscape. Whether the iPad app works in portrait is now an open question for feature 10 in roadmap.md.
24. The Libre Franklin licence text ships with the app as `public/fonts/LibreFranklin-OFL.txt`, because the Open Font License asks for it to travel with the font. Since the review fix of 2026-11-16 the font file itself is in `src/fonts/`, so the two files ship in the same build but in different folders.
25. The npm scripts are `build`, `start`, `test`, `e2e`, `lint` and `format:check`. A `Makefile` at the repo root offers the same commands.
26. The cell colours are added in this feature, although no cell is drawn until feature 2. They are the four colour classes `dark`, `light`, `soft1` and `grey`, and the hue rules of the Colours theme.
27. The `Makefile` has the targets `install`, `start`, `build`, `test`, `e2e`, `lint`, `format-check` and `check`. Each one calls the npm script of the same name. The `check` target runs lint, format-check, test, e2e and build in turn.
28. The cell colour rules for one kind of cell stay out of this feature. These are the rules for the games, contact, music and photo cells in the mockup. They come with the feature that draws each cell.

## Out of this feature

- Scanning is feature 3. This feature only checks that the screen holds no control that a switch user could land on.
- The settings panel and the theme picker are feature 7.
- Electron and Capacitor are features 9 and 10.
- No patent check is needed, because this feature generates no content and no suggestions.
