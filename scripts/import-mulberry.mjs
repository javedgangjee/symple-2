// Copies the Mulberry symbols into public/symbols and writes the list and the credits.
//
// Usage: node scripts/import-mulberry.mjs <folder>
// The folder is the unpacked mulberry-symbols.zip of the Mulberry release 3.6.1.
// It holds EN-symbols/, LICENSE.txt and VERSION.txt.
//
// The files the app already has keep their file names and their names, so no stored tile breaks.
// The script reads them from public/symbols/ATTRIBUTION.txt and src/data/symbols.json.
// Every other symbol is copied under a new name: its Mulberry name in lower case, with each run
// of other characters turned into one hyphen. A name that is taken gets a number at its end.
// The script writes src/data/symbols.json and public/symbols/ATTRIBUTION.txt, and it reports any
// file it could not place. Running it a second time changes nothing.

import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RELEASE = '3.6.1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SYMBOLS = join(ROOT, 'public', 'symbols');
const ATTRIBUTION = join(SYMBOLS, 'ATTRIBUTION.txt');
const LIST = join(ROOT, 'src', 'data', 'symbols.json');

// The symbol that was drawn for Symple and is not from Mulberry.
const OWN_FILES = ['stop.svg'];

function fail(message) {
  console.error(`import-mulberry: ${message}`);
  process.exit(1);
}

const source = process.argv[2];
if (!source) {
  fail(
    'give the folder of the unpacked mulberry-symbols.zip, such as\n  node scripts/import-mulberry.mjs ~/Downloads/mulberry-symbols',
  );
}
const symbolsFolder = join(source, 'EN-symbols');
if (!existsSync(symbolsFolder)) {
  fail(`${symbolsFolder} does not exist. Give the folder that holds EN-symbols/.`);
}
const versionFile = join(source, 'VERSION.txt');
const version = existsSync(versionFile) ? readFileSync(versionFile, 'utf8').trim() : '';
if (!version.endsWith(RELEASE)) {
  fail(
    `the folder holds "${version || 'no VERSION.txt'}", but this script is for release ${RELEASE}.`,
  );
}

/** Turns a Mulberry file name into a file name that loadBoards accepts. */
function fileNameOf(original) {
  const base = original
    .replace(/\.svg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base;
}

/** Turns a Mulberry file name into the name the tile dialog shows. */
function displayNameOf(original) {
  return original.replace(/\.svg$/i, '').replace(/_/g, ' ');
}

// The files the app has now, with their Mulberry originals, read from the credits.
const kept = new Map();
for (const line of readFileSync(ATTRIBUTION, 'utf8').split('\n')) {
  const match = /^(\S+\.svg)\s+(\S+\.svg)$/.exec(line);
  if (match) {
    kept.set(match[2], match[1]);
  }
}

// The names that the list gives the files the app has now.
const oldList = JSON.parse(readFileSync(LIST, 'utf8'));
const oldNames = new Map(oldList.map((entry) => [entry.file, entry.name]));

const originals = readdirSync(symbolsFolder).sort();
const problems = [];
const unplaced = [];

// A kept file must still be in the release, unchanged, or the script stops before it writes.
for (const [original, file] of kept) {
  if (!originals.includes(original)) {
    problems.push(`${file}: its original ${original} is not in the release.`);
  } else if (
    !readFileSync(join(SYMBOLS, file)).equals(readFileSync(join(symbolsFolder, original)))
  ) {
    problems.push(`${file}: it differs from its original ${original}.`);
  }
  if (!oldNames.has(file)) {
    problems.push(`${file}: it is in ATTRIBUTION.txt but not in symbols.json.`);
  }
}
if (problems.length > 0) {
  fail(`nothing was written, because of these files:\n  ${problems.join('\n  ')}`);
}

// The names already in use: the kept files, the files drawn for Symple, and in a first pass the
// plain name of each new file. A plain name is given to the first file in sorted order that has it.
const taken = new Set([...kept.values(), ...OWN_FILES].map((file) => file.replace(/\.svg$/, '')));
const placed = new Map(); // original name to file name
const waiting = [];
for (const original of originals) {
  if (kept.has(original)) {
    placed.set(original, kept.get(original));
    continue;
  }
  const base = /\.svg$/i.test(original) ? fileNameOf(original) : '';
  if (base === '') {
    unplaced.push(original);
  } else if (taken.has(base)) {
    waiting.push([original, base]);
  } else {
    taken.add(base);
    placed.set(original, `${base}.svg`);
  }
}
// In a second pass each file whose plain name was taken gets the first free number, from 2 up.
const numbered = [];
for (const [original, base] of waiting) {
  let n = 2;
  while (taken.has(`${base}-${n}`)) {
    n += 1;
  }
  taken.add(`${base}-${n}`);
  placed.set(original, `${base}-${n}.svg`);
  numbered.push(`${original} -> ${base}-${n}.svg`);
}

// Copy each new file. A kept file is already in the folder and is left alone.
let copied = 0;
for (const [original, file] of placed) {
  if (kept.has(original)) {
    continue;
  }
  const target = join(SYMBOLS, file);
  const bytes = readFileSync(join(symbolsFolder, original));
  if (!existsSync(target) || !readFileSync(target).equals(bytes)) {
    copyFileSync(join(symbolsFolder, original), target);
    copied += 1;
  }
}

// The list: every Mulberry file and every file drawn for Symple, sorted by file name.
// A file whose name ends in a number took that number because its plain name was taken. If its
// name is taken too, the name gets the same number at its end, such as "drink 2" for drink-2.svg.
// The files without a number are named first, so the names the app had before stay as they are.
const list = [];
const takenNames = new Set(
  [
    ...[...placed].map(([original, file]) => [file, displayNameOf(original)]),
    ...OWN_FILES.map((file) => [file, file.replace(/\.svg$/, '')]),
  ]
    .filter(([file]) => !/-\d+\.svg$/.test(file))
    .map(([file, name]) => (oldNames.get(file) ?? name).toLowerCase()),
);
for (const [original, file] of placed) {
  let name = oldNames.get(file) ?? displayNameOf(original);
  const number = /-(\d+)\.svg$/.exec(file);
  if (number) {
    if (takenNames.has(name.toLowerCase())) {
      name = `${name} ${number[1]}`;
    }
    takenNames.add(name.toLowerCase());
  }
  list.push({ file, name });
}
for (const file of OWN_FILES) {
  list.push({ file, name: oldNames.get(file) ?? file.replace(/\.svg$/, '') });
}
list.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
// The layout is the one Prettier gives the file, so the format check passes.
writeFileSync(LIST, `${JSON.stringify(list, null, 2)}\n`);

// The credits, with the original name of each file.
const rows = [...placed].map(([original, file]) => [file, original]);
rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
const width = Math.max(...rows.map(([file]) => file.length), ...OWN_FILES.map((f) => f.length)) + 2;
const count = rows.length.toLocaleString('en-GB');
const credits = [
  `The ${count} Mulberry files in this folder are from the Mulberry Symbols set, release ${RELEASE}.`,
  'Copyright 2018-2026 Steve Lee.',
  'Licensed under Creative Commons Attribution-ShareAlike 4.0.',
  'https://creativecommons.org/licenses/by-sa/4.0/',
  'Source: https://mulberrysymbols.org',
  '',
  'The files are unchanged apart from their names. Original names:',
  ...rows.map(([file, original]) => `${file.padEnd(width)}${original}`),
  '',
  'The file below is not from the Mulberry Symbols set. It was drawn for Symple.',
  ...OWN_FILES.map((file) => `${file.padEnd(width)}drawn for Symple`),
  '',
];
writeFileSync(ATTRIBUTION, credits.join('\n'));

console.log(`Mulberry release ${RELEASE}: ${originals.length} files in the release.`);
console.log(`Kept ${kept.size} files under their names, copied ${copied} new or changed files.`);
console.log(`symbols.json lists ${list.length} symbols.`);
if (numbered.length > 0) {
  console.log(
    `These files took a number because their name was taken:\n  ${numbered.join('\n  ')}`,
  );
}
if (unplaced.length > 0) {
  console.error(`These files could not be placed and were left out:\n  ${unplaced.join('\n  ')}`);
  process.exit(1);
}
