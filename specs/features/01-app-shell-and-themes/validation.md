# Feature 1: App shell and themes. Validation

The numbers in brackets are the items in requirements.md that a check covers.

## Automated checks

### A1. Build (1, 2, 14)

Command: `npm run build`

- The build ends with no errors and no warnings, and writes the app to `dist/`.

### A2. Lint and format (17)

Commands: `npm run lint` and `npm run format:check`

- Both end with no errors.

### A3. Unit tests (3, 4, 5, 8, 11, 15, 16, 19, 20)

Command: `npm test`

Theme service, in `src/app/theme/theme.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| T1 | Nothing is stored. | The theme is `blue`, and `html` has `data-theme="blue"`. |
| T2 | `symple.theme` holds `teal`. | The theme is `teal`, and `html` has `data-theme="teal"`. |
| T3 | `symple.theme` holds `pink`. | The theme is `blue`. |
| T4 | Reading storage throws an error. | The theme is `blue`, and no error is thrown. |
| T5 | The theme is set to `purple`. | `html` has `data-theme="purple"`, and `symple.theme` holds `purple`. |
| T6 | The theme is set to each of `colours`, `blue`, `purple`, `teal` and `dark` in turn. | `html` has the matching `data-theme` each time. |
| T7 | The theme is set to `purple` and writing storage throws an error. | `html` has `data-theme="purple"`, and no error is thrown. |

Header, in `src/app/shell/header.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| H1 | The title is "Home". | The header has one `h1` with the text "Home". |
| H2 | The header is drawn. | It holds an image with the name "Symple". |
| H3 | The header is drawn. | It holds a button with the name "Settings", and the button is disabled. |

Screen title, in `src/app/shell/screen-title.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| S1 | The route title is "Home". | The screen title is "Home". |
| S2 | The route has no title. | The screen title is empty. |

App, in `src/app/app.spec.ts`:

| Case | Input | Expected result |
| --- | --- | --- |
| P1 | The app is drawn. | It holds one header, one main area and one footer, in that order. |

### A4. End to end tests (3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 18, 21, 22, 23, 24, 26)

Command: `npm run e2e`

Every case runs in Chromium. The cases are in `e2e/shell.spec.ts`.

| Case | Input | Expected result |
| --- | --- | --- |
| E1 | Open `/` with nothing stored. | The header, the main area and the footer are visible. The `h1` reads "Home". The page title is "Symple". `html` has `lang="en"` and `data-theme="blue"`. |
| E2 | Store each of the five themes in turn and reload. | `html` has the matching `data-theme`. The value of `--dark` is the one in the table below. |
| E3 | Store each of the five themes in turn and reload. | axe reports no violations for WCAG 2.2 Level AA. |
| E4 | Store each of the five themes in turn and reload. | The title colour has a contrast of at least 4.5 to 1 against the page colour and against each of the three colour patches. |
| E5 | Open `/` at 1024 by 768 and at 1440 by 900. | The page does not scroll in either direction. The header is at least 64px high and the footer is at least 48px high. The footer's bottom edge is inside the window. |
| E6 | Open `/` and press Tab three times. | Focus does not land on any control. |
| E7 | Open `/` and wait for the fonts. | The `h1` uses Libre Franklin, the font is loaded, and the page made no request to another host. |
| E8 | Open `/`. | The gap between the header and the main area equals the gap between the main area and the footer. |
| E9 | Open `/some/unknown/path`. | The home screen shows with the `h1` "Home". |
| E10 | In each of the five themes, add a test element with each of the classes `dark`, `light`, `soft1` and `grey`. | The element's `--on` colour has a contrast of at least 4.5 to 1 against its `--bg` colour. |
| E11 | In the Colours theme, add test elements with the classes `c1`, `c2`, `c3` and `c4`. | Their `--bg` values are `oklch(0.42 0.115 250)`, `oklch(0.42 0.115 20)`, `oklch(0.42 0.115 190)` and `oklch(0.42 0.115 250)`. |
| E12 | Request `/fonts/LibreFranklin-OFL.txt`. | The file is served and holds the words "SIL Open Font License". |

Expected `--dark` for case E2:

| Theme | `--dark` |
| --- | --- |
| `blue` | `oklch(0.42 0.15 258)` |
| `purple` | `oklch(0.40 0.19 285)` |
| `teal` | `oklch(0.42 0.07 192)` |
| `dark` | `oklch(0.22 0.006 270)` |
| `colours` | `oklch(0.42 0.115 250)` |

### A5. Makefile (25, 27)

Command: `make check`

- The command runs lint, format-check, test, e2e and build in turn and ends with no errors.

## Manual checks

### M1. The look matches the mockup (5, 8, 18)

1. Run `npm start` and open `http://localhost:4200` in Safari on the Mac.
2. Open `context/design/home.html` in a second window of the same size.
3. Compare the header, the page background and the footer height. Ignore the cells in the mockup.
4. In the mockup, pick each theme in the settings panel. In the app, run `localStorage.setItem('symple.theme', 'teal')` in the console with each theme name and reload.

Expected result: in every theme the logo, the title, the settings button and the page background look the same in both windows. The app's settings button is dimmed and does nothing when pressed.

### M2. Less transparency (18)

1. On the Mac, open System Settings, then Accessibility, then Display, and turn on Reduce transparency.
2. Reload the app.

Expected result: the settings button has a solid background with no blur.

### M3. The font works offline (9)

1. Run `npm run build` and serve the `dist/` folder.
2. Turn off Wi-Fi and reload the app.

Expected result: the title is still drawn in Libre Franklin.

## Not checked in this feature

Safari and the iPad's WebKit are not tested by the automated checks. Manual check M1 uses Safari on the Mac.

Tech-stack.md asks for an end to end test that reaches each target by single switch scanning. This screen has no target for the primary user, and scanning is feature 3, so case E6 stands in for that test here.
