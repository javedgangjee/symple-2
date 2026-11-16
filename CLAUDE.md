# Symple

Symple is an app that lets people who cannot speak or point use a computer alone, by switch scanning.

## Where to look

- `specs/mission.md`, `specs/tech-stack.md` and `specs/roadmap.md` are the source of truth for what to build.
- `specs/features/` holds the plan, the requirements and the checks for each feature.
- `PRODUCT.md` is the product brief. If the specs and the brief disagree, stop and ask.
- `context/design/` holds the mockups. They are a guide to the look and layout and can be changed with a reason.
- `context/patents/` holds three patents. Check any feature that generates content or suggestions against them before writing code.

## Rules

- The user commits and merges. Do not commit.
- Boards and cells come from `boards.json` and `cells.json`. Do not hardcode them without a stated reason.
- Every screen for the primary user must work by single switch scanning. A group of cells is a column or a row. A stored setting picks which, and columns are the default. A board can fix its own layout, as the keyboard does.
- Use Firebase if a cloud service is needed, and only when a feature plan calls for it.

## Commands

The app needs Node 22.22.3 or a later Node 22 release.

- Build: `npm run build`
- Unit tests: `npm test`
- End to end tests: `npm run e2e`. Run `make install` first to get Chromium.
- Lint: `npm run lint`, and `npm run format:check` for formatting.
- All checks in turn: `make check`
