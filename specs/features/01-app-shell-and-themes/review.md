# Feature 1: App shell and themes. Review

## What I ran and what I only read

I ran `make check` with Node 22.23.5. Lint, the format check, 13 unit tests, 24 end to end tests and the build all passed.

I also ran three probes of my own, outside the repo. I ran `tsc` in strict mode over `e2e/` and `playwright.config.ts`. I loaded the built app in Playwright's Chromium with `prefers-reduced-transparency: reduce` emulated and read the settings button's computed styles. I read the font URL in the built CSS in `dist/`.

I read every new and changed file of the feature, the specs, PRODUCT.md and the parts of `context/design/home.html` that the code copies. I did not run the manual checks M1 to M3.

## Findings

### 1. The end to end tests and the Playwright config are never type checked

Claim: no step in `make check` type checks `e2e/` or `playwright.config.ts`, and the config fails a strict type check today.

File and line: `tsconfig.app.json` line 8 and `tsconfig.spec.json` line 8 include only `src/`. `playwright.config.ts` lines 14 and 15 use `process`.

Case: Playwright strips the types from test files without checking them, and the ESLint setup is not type aware. Running `tsc` in strict mode over these files gives error TS2591, "Cannot find name 'process'", on lines 14 and 15, because `@types/node` is not installed. A wrong argument type in a test helper would also go unnoticed. Requirement 1 asks for a strict TypeScript project that builds without errors, and the tests are the proof for every other requirement.

Fix: add `@types/node`, add a `tsconfig.e2e.json` that includes `e2e/**/*.ts` and `playwright.config.ts`, and run `tsc --noEmit -p tsconfig.e2e.json` as part of `npm run lint` or `make check`.

Level: low.

### 2. The disabled settings button stays see-through when the device asks for less transparency

Claim: the disabled state uses `opacity: 0.5`, so the button is half transparent even when glass.css makes its fill solid.

File and line: `src/app/shell/header.css` lines 61 to 64, with `src/styles/glass.css` lines 40 to 50.

Case: in Chromium with `prefers-reduced-transparency: reduce`, the button's background is `oklch(0.995 0.003 260)` and its backdrop filter is `none`, but its opacity is `0.5`. The page shows through the whole button. Manual check M2 expects "a solid background with no blur", and requirement 18 says these users get solid surfaces. The button stays disabled until feature 7, so every user who asks for less transparency sees this.

Fix: dim the disabled button with its icon colour, for example `color: color-mix(in oklab, var(--ink) 45%, transparent)`, and keep the fill opaque. Or set `opacity: 1` and a dimmed icon colour inside the reduced transparency media query.

Level: low.

### 3. Unit tests T3 and T4 pass even if `load()` ignores a bad stored value

Claim: T3 and T4 only check `theme.name()`, which already starts as `blue`, so they do not prove that the fallback theme is applied.

File and line: `src/app/theme/theme.spec.ts` lines 33 to 45. The starting value is set in `src/app/theme/theme.ts` line 24.

Case: if `load()` returned early when the stored value is unknown or storage throws, `name()` would still read `blue` and both tests would pass, while `html` would have no `data-theme` at all. T1 and T2 check the attribute, but T3 and T4 do not.

Fix: in T3 and T4 also assert that `html` has `data-theme="blue"`, as T1 does.

Level: low.

### 4. The contrast helper ignores transparency, while its comment says it takes any CSS colour

Claim: `contrastRatio` reads back the red, green and blue of a colour and drops its alpha, so a see-through colour is measured as if it were solid.

File and line: `e2e/support/contrast.ts` lines 27 to 38, and the comment on lines 3 to 6.

Case: `contrastRatio(page, '#cell', 'var(--on)', 'color-mix(in oklab, var(--bg) 58%, transparent)')` returns the same ratio as for the solid `var(--bg)`. The cells in the mockup are glass at 58% to 92%, and glass.css says dark cells keep white labels at 4.5 to 1. Feature 2 is likely to reuse this helper for that check, and it would pass without testing the glass.

Fix: throw an error when the computed colour has alpha below 1, or blend the colour over a given backdrop before working out the ratio. Change the comment to match.

Level: low.

### 5. The font URL is root relative and will not load when the build is opened from disk

Claim: the font face points at `/fonts/LibreFranklin-Variable.woff2`, and the built CSS keeps that path as it is.

File and line: `src/styles.css` line 9.

Case: the built file `dist/symple/browser/styles-*.css` holds `url(/fonts/LibreFranklin-Variable.woff2)`. tech-stack.md says all three targets use the same build. If Electron loads `index.html` from disk, this URL points at `file:///fonts/...` and the page falls back to the system font with no error. A CSS URL resolves against the stylesheet, so changing the base href does not fix it. The end to end tests and manual check M3 serve the app over HTTP, so none of them would catch it.

Fix: use a relative URL, such as `url('fonts/LibreFranklin-Variable.woff2')` with the font placed where the builder can resolve it, and add a note to the feature 9 plan to test the font in the packaged Mac app.

Level: low.

## Votes

Dated 2026-11-16. Five voters checked each finding against the code. All five findings are kept. None is dropped. The level is the middle value of the five voter levels.

1. Finding 2, the disabled settings button stays see-through. Votes: 5 valid. Level: low. No fact corrected.
2. Finding 3, T3 and T4 do not prove the fallback is applied. Votes: 5 valid. Level: low. No fact corrected.
3. Finding 1, the end to end tests and the Playwright config are never type checked. Votes: 5 valid. Level: low. No fact corrected. No voter ran `tsc`.
4. Finding 4, the contrast helper ignores transparency. Votes: 4 valid, 1 partly. Level: low. One voter noted that the helper may not return exactly the solid colour's ratio, as the finding says, because the canvas stores a see-through colour differently. The core claim stands.
5. Finding 5, the font URL is root relative. Votes: 5 partly. Level: low. Four voters corrected the framing. `src/index.html` has `<base href="/" />`, so the whole app would fail to load from disk and the font is one part of that. A relative font URL alone does not make the build load from disk. How Electron loads the build is a question for feature 9.

Findings 1 and 3 had the same average rank. Finding 3 is listed first because three voters ranked it higher.

The user asked on 2026-11-16 for every kept finding to be fixed. Steps 13 to 17 in plan.md and the matching checks in validation.md cover them.
