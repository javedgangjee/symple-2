# Symple

Symple is an app that lets people who cannot speak or point use a computer alone, by switch scanning.

## Where to look

- `specs/mission.md`, `specs/tech-stack.md` and `specs/roadmap.md` are the source of truth for what to build.
- `specs/features/` holds the plan, the requirements and the checks for each feature.
- `PRODUCT.md` is the product brief. It is initial context only. If it disagrees with the roadmap, follow the roadmap.
- `context/design/` holds the mockups. They are a guide to the look and layout and can be changed with a reason.
- `context/patents/` holds three patents. Check any feature that generates content or suggestions against them before writing code.
- The folder `context/` is kept on the development Mac only. It is not in the repo, and `.gitignore` names it. Never add a file from it to a commit.

## Rules

- Ask the user before a commit or a merge, then do it yourself. One yes can cover a named set of commits, such as the plan steps of one implement run of the spec-driven skill or the fixes of one review. Keep commits small: one for each plan step, fix or change.
- Never push. The user pushes main.
- Boards and cells come from `boards.json` and `cells.json`. Do not hardcode them without a stated reason.
- Every screen for the primary user must work by single switch scanning. A group of cells is a column or a row. Each board sets its own layout, and columns are the default. The caregiver sets it in the board settings of edit mode.
- Use Firebase if a cloud service is needed, and only when a feature plan calls for it.

## Commands

The app needs Node 22.22.3 or a later Node 22 release.

- Build: `npm run build`
- Unit tests: `npm test`
- End to end tests: `npm run e2e`. Run `make install` first to get Chromium.
- Lint: `npm run lint`, and `npm run format:check` for formatting.
- All checks in turn: `make check`
- Deploy the web app: `make deploy`. Only the user runs it.
