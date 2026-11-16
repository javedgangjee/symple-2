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
- Boards and cells come from `boards.json` and `tiles.json`. Do not hardcode them without a stated reason.
- Every screen for the primary user must work by single switch scanning. Scan order runs by row.
- Use Firebase if a cloud service is needed, and only when a feature plan calls for it.
