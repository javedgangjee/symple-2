# Changelog

This file records what changed in Symple for a person who reads or runs the project.

## Unreleased

### Added

- Feature 1 adds the Angular app, which shows an empty home screen with the shared header, the main area and the footer.
- Feature 1 adds the five colour themes named `colours`, `blue`, `purple`, `teal` and `dark`. The app reads the theme from `symple.theme` in local storage and falls back to `blue`.
- Feature 1 adds the cell colour classes `dark`, `light`, `soft1` and `grey` and the hue rules of the Colours theme, ready for the cells of feature 2.
- Feature 1 bundles the Libre Franklin font and its licence text, so the title is drawn in that font with no network.
- Feature 1 shows the settings button in the header as disabled, and gives it a solid background when the system asks for less transparency.
- Feature 1 adds unit tests and Playwright end to end tests in Chromium at two window sizes, which include WCAG 2.2 Level AA checks with axe and contrast checks in every theme.
- Feature 1 adds linting, a Prettier format check and a `Makefile` whose `check` target runs every check in turn.
- Feature 1 adds an `.nvmrc` file that pins Node 22.23.5.
