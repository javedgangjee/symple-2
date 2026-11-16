# Symple

Symple is an app that lets people who cannot speak or point use a computer alone, by switch scanning. It is one Angular app that will ship as a Mac app, an iPad app and a web app.

## Setup

The app needs Node 22.22.3 or a later Node 22 release, and npm. Run `make install` once. It installs the packages and the Chromium browser that the end to end tests use.

## npm scripts

- `npm start` serves the app at `http://localhost:4200`.
- `npm run build` builds the app into `dist/`.
- `npm test` runs the unit tests with Vitest.
- `npm run e2e` runs the end to end tests with Playwright and axe-core in Chromium. It starts its own server on port 4301.
- `npm run lint` checks the code and the templates with ESLint.
- `npm run format:check` checks the formatting with Prettier.

## Make targets

- `make install` installs the packages and Chromium.
- `make start`, `make build`, `make test`, `make e2e` and `make lint` call the npm script of the same name.
- `make format-check` calls `npm run format:check`.
- `make check` runs lint, format-check, test, e2e and build in turn.

## Specs

The specs in `specs/` say what to build. `PRODUCT.md` is the product brief.
