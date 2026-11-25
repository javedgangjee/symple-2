# Feature 23: Symbols and icons for a tile. Plan

The numbers in brackets are the items in requirements.md that a step covers.

## Step 1. Bring in the full Mulberry set (6, 9, 10, 11)

- Creates `scripts/import-mulberry.mjs`. It takes the path of the unpacked `mulberry-symbols.zip` of release 3.6.1. It keeps the 98 Mulberry files the app has, copies every other symbol under its new name, and writes `src/data/symbols.json` and `public/symbols/ATTRIBUTION.txt`. It reports any file it could not place.
- Changes `public/symbols/`, which gains about 3,338 files, and `public/symbols/ATTRIBUTION.txt` and `src/data/symbols.json`, which the script writes.
- Creates `scripts/check-pictures.mjs`, which checks that the list and the folder agree.
- This step needs the zip on the development Mac. The user downloads it, or allows the agent to.

## Step 2. Bring in the full Lucide set (6, 12)

- Changes `package.json` and `package-lock.json`. `lucide-static` 1.77.0 is added as a development package, with its exact version.
- Creates `scripts/import-lucide.mjs`, which writes `src/data/lucide.json` from the package. Each icon has its name and its drawing as a list of shapes.
- Creates `src/data/lucide.json`.
- Changes `scripts/check-pictures.mjs`, which also checks that the file holds every icon of the package.

## Step 3. Let a tile name any Lucide icon (5, 13, 14)

- Changes `src/app/boards/board-data.ts` and its `.spec.ts`. The type of an icon name takes the 18 names and the `lucide:` form. `loadBoards` checks the form, and it accepts a `symbol` tile that names an icon or a symbol.

## Step 4. Draw a Lucide icon from the data (3, 12, 13, 14, 15)

- Creates `src/app/cells/icon-set.ts` and its `.spec.ts`. The service fetches `lucide.json` the first time an icon needs it and gives the shapes of an icon by name.
- Changes `src/app/cells/icon.ts` and its `.spec.ts`. The 18 names are drawn as today. A `lucide:` name is drawn from the shapes of the service, with one template case for each of the seven kinds of shape, and with no HTML set from text.
- Changes `src/app/cells/cell.html`, `cell.css` and `cell.spec.ts`. A `symbol` cell with an icon draws the icon on the plate.

## Step 5. Store a picture with an edit (5, 14, 22)

- Changes `src/app/edit/board-edits.ts` and its `.spec.ts`. The fields of a cell hold one picture, which is a symbol, an icon or nothing. `tileFor` and `fieldsOf` follow items 14 and 22 of requirements.md, which say what each kind of cell stores and when a cell keeps its look.
- Changes `src/app/boards/board-screen.ts` if it names the old fields.

## Step 6. Write the search (2, 18, 19)

- Creates `src/app/edit/picture-search.ts` and its `.spec.ts`. One plain function takes a list of names and a text and gives the matches in order.
- Creates `src/app/edit/picture-list.ts` and its `.spec.ts`. The service fetches `symbols.json` and the names of `lucide.json` the first time the dialog opens.

## Step 7. Put the Picture field in the tile dialog (1, 2, 4, 15, 17, 20, 21)

- Changes `src/app/edit/tile-dialog.ts`, `.html`, `.css` and `.spec.ts`. The Symbol and Icon fields become the Picture field. `tile-dialog.ts` no longer imports `symbols.json`.
- Changes cases TD3, TD6 and TD7 of `tile-dialog.spec.ts`, which test the old filter of symbols, the old list of 12 icons and the fields of Edit Help. validation.md gives their new text.

## Step 8. Write the end to end tests (3, 4)

- Changes `e2e/editing.spec.ts` with the cases of validation.md, and its helper `addTile`, which looks for the old label "Find a symbol".
- Changes `e2e/support/boards.ts` if a case needs a stored set with a `lucide:` icon.

## Step 9. Update the documents (6, 12, 16, 23)

- Changes `specs/tech-stack.md`. The Data section names the two lists, the three scripts and the number of symbols. The Design reference section says how the Lucide set ships and how a tile names an icon.
- Changes `README.md`. The credits name the Mulberry release and `lucide-static`, and a short section says how to run the two import scripts.
- Changes `Makefile` and `package.json`, so `make check` also runs `scripts/check-pictures.mjs`.

## Step 10. Run everything

- Runs `make check` and fixes the failures.
