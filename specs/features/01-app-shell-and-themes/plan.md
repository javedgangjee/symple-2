# Feature 1: App shell and themes. Plan

The steps run in order. Each step names the files it creates or changes.

## Step 1. Create the Angular project

Run the Angular CLI 22 at the repo root with CSS styles, routing, Vitest, no server rendering, no new git repo and no generated agent instructions file. The existing files in the repo stay as they are.

- Creates `package.json`, `package-lock.json`, `angular.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `.gitignore`, `.editorconfig` and `README.md`.
- Creates `src/index.html`, `src/main.ts`, `src/styles.css`, `src/app/app.ts`, `src/app/app.html`, `src/app/app.css`, `src/app/app.config.ts`, `src/app/app.routes.ts` and `src/app/app.spec.ts`.
- Creates `public/favicon.ico` and the CLI's files in `.vscode/`.

Check that `tsconfig.json` has strict mode on. Set `lang="en"` and the product name in `src/index.html`. Add the `engines` field for Node 22 to `package.json`.

## Step 2. Add the linter and the formatter

Add angular-eslint 22 with its template accessibility rules, and add Prettier.

- Creates `eslint.config.js`, `.prettierrc` and `.prettierignore`.
- Changes `package.json` and `angular.json`.

The `.prettierignore` file lists `context/`, `specs/` and `.claude/`, so the formatter leaves the mockups and the specs alone.

## Step 3. Add the end to end test tools

Add Playwright and `@axe-core/playwright`. The config starts the dev server, runs Chromium only, and uses the two window sizes from the requirements.

- Creates `playwright.config.ts`.
- Creates `e2e/support/axe.ts`, which runs axe with the WCAG 2.0, 2.1 and 2.2 Level A and AA rule tags.
- Creates `e2e/support/contrast.ts`, which reads two colours from the page and returns their contrast ratio.
- Changes `package.json` and `.gitignore`.

## Step 4. Add the font

- Creates `public/fonts/LibreFranklin-Variable.woff2`, copied from `context/design/mockups/home/fonts/`.
- Creates `public/fonts/LibreFranklin-OFL.txt`, taken from the Libre Franklin project.
- Changes `src/styles.css` to declare the font face with weights 100 to 900.

## Step 5. Add the themes and the page styles

Copy the values from `context/design/home.html`.

- Creates `src/styles/themes.css`. It holds the palette for each of the five themes under `:root[data-theme="..."]`, with Blue also as the default. The values are `--canvas`, `--canvas-2`, `--canvas-3`, `--dark`, `--light`, `--soft1`, `--grey`, `--ink`, `--shade`, `--shc` and `--deep-c`.
- Creates `src/styles/glass.css`. It holds the glass values, the three colour patches for each theme, and the rule that gives solid surfaces when the device asks for less transparency.
- Creates `src/styles/cells.css`. It holds the four cell colour classes `dark`, `light`, `soft1` and `grey`, and the hue rules of the Colours theme for `c1` to `c5` and for recoloured cells. It holds no layout and no rules for one kind of cell.
- Changes `src/styles.css`. It holds the reset, the sizes `--gap`, `--pad`, `--ring` and `--radius`, the page background, the typeface, and the rule that stops transitions when the device asks for less motion.
- Changes `angular.json` if the three new style files need to be listed.

## Step 6. Add the theme service

- Creates `src/app/theme/theme.ts`. It lists the five theme names, reads the stored theme, falls back to Blue when the value is missing or unknown or when storage fails, sets `data-theme` on the `html` element, and stores a new theme when one is set.
- Creates `src/app/theme/theme.spec.ts`.
- Changes `src/app/app.config.ts` so that the theme is applied before the first screen is drawn.

## Step 7. Add the shell

- Creates `src/app/shell/logo.ts`. It draws the Symple icon from the mockup as an image named "Symple".
- Creates `src/app/shell/header.ts`, `header.html`, `header.css` and `header.spec.ts`. The header shows the logo, the screen title as the only `h1`, and the settings button. The button is disabled and carries the name "Settings".
- Creates `src/app/shell/footer.ts` and `footer.css`. The footer is empty and keeps its height.
- Creates `src/app/shell/screen-title.ts` and `screen-title.spec.ts`. It takes the title of the current route and gives it to the header. The page title stays "Symple".
- Changes `src/app/app.ts`, `app.html`, `app.css` and `app.spec.ts`. The app lays out the header, the main area with the router outlet, and the footer in three rows that fill the window.

## Step 8. Add the empty screen

- Creates `src/app/home/home.ts`. It is an empty screen. Feature 2 fills it.
- Changes `src/app/app.routes.ts`. The empty path opens the home screen with the title "Home", and any unknown path goes to it.

## Step 9. Write the end to end tests

- Creates `e2e/shell.spec.ts` with the cases in validation.md.

## Step 10. Add the Makefile

- Creates `Makefile` with the targets `install`, `start`, `build`, `test`, `e2e`, `lint`, `format-check` and `check`. Each one calls npm.

## Step 11. Run everything

Run `make check`. It runs the linter, the format check, the unit tests, the end to end tests and the build. Fix what fails.

## Step 12. Update the docs

- Changes `README.md`. It says what Symple is in two sentences and lists the npm scripts and the make targets.
- Changes `CLAUDE.md`. It gains a short section with the commands for build, test, end to end test and lint.

## Fixes from the review of 2026-11-16

Steps 13 to 17 fix the five findings in review.md.

## Step 13. Make the disabled settings button solid (finding 2)

- Changes `src/app/shell/header.css`. The disabled button is dimmed through its icon colour and keeps an opaque fill when the device asks for less transparency. It no longer uses `opacity`.
- Changes `src/styles/glass.css` if the rule belongs with the other less-transparency rules.
- Changes `e2e/shell.spec.ts` to add case E13.

## Step 14. Make T3 and T4 check the attribute (finding 3)

- Changes `src/app/theme/theme.spec.ts`. T3 and T4 also check that `html` has `data-theme="blue"`.

## Step 15. Type check the end to end tests (finding 1)

- Creates `tsconfig.e2e.json`. It covers `e2e/**/*.ts` and `playwright.config.ts` in strict mode.
- Changes `package.json` and `package-lock.json`. `@types/node` is added, and `npm run lint` also runs `tsc --noEmit -p tsconfig.e2e.json`.

## Step 16. Make the contrast helper refuse see-through colours (finding 4)

- Changes `e2e/support/contrast.ts`. It throws an error when a colour has alpha below 1, and its comment says so.
- Changes `e2e/shell.spec.ts` to add case E14.

## Step 17. Use a relative font URL (finding 5)

- Changes `src/styles.css` so that the font URL in the built CSS does not start with `/`.
- Changes `angular.json`, and moves the font file out of `public/fonts/` if the builder needs that to resolve the URL. The font and its licence text must both still ship, and cases E7 and E12 must still pass.
- Changes `specs/roadmap.md`. Feature 10 gains an open question: how Electron loads the build, because `index.html` uses a base href of `/`, and the font must be tested in the packaged Mac app.

## Step 18. Run everything again

Run `make check` and fix what fails.
