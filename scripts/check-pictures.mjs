// Checks that the lists of pictures agree with the picture files.
//
// Usage: node scripts/check-pictures.mjs
// It runs the cases of check A3 of specs/features/23-symbols-and-icons/validation.md and exits with
// an error when any case fails. Case PC3 reads the list as it was before feature 23 from git, and
// case PC5 reads the installed package lucide-static.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SYMBOLS = join(ROOT, 'public', 'symbols');
const LIST = join(ROOT, 'src', 'data', 'symbols.json');
const ATTRIBUTION = join(SYMBOLS, 'ATTRIBUTION.txt');

// The 3,436 symbols of Mulberry 3.6.1 and the stop symbol drawn for Symple.
const SYMBOL_COUNT = 3437;
const MULBERRY_COUNT = 3436;
const OWN_FILES = ['stop.svg'];
// The commit before feature 23, which holds the 99 symbols the app had.
const BEFORE = 'd9e3812';
// The rule of loadBoards for a symbol file.
const SYMBOL_FILE = /^[a-z0-9-]+\.svg$/;
// The Lucide release the app draws its icons from, its number of icons and its kinds of shape.
const LUCIDE = join(ROOT, 'src', 'data', 'lucide.json');
const LUCIDE_VERSION = '1.77.0';
const LUCIDE_COUNT = 2098;
const LUCIDE_TAGS = ['path', 'circle', 'rect', 'line', 'ellipse', 'polyline', 'polygon'];

const failures = [];

/** Runs one case and records each problem it finds. */
function check(id, title, run) {
  const problems = [];
  try {
    run(problems);
  } catch (error) {
    problems.push(`it could not run: ${error.message}`);
  }
  if (problems.length === 0) {
    console.log(`ok   ${id} ${title}`);
    return;
  }
  console.log(`FAIL ${id} ${title}`);
  const shown = problems.slice(0, 20);
  for (const problem of shown) {
    console.log(`       ${problem}`);
  }
  if (problems.length > shown.length) {
    console.log(`       and ${problems.length - shown.length} more.`);
  }
  failures.push(id);
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const list = JSON.parse(readFileSync(LIST, 'utf8'));
const folder = readdirSync(SYMBOLS).filter((file) => file.endsWith('.svg'));

check('PC1', 'The list and the symbols folder agree.', (problems) => {
  if (list.length !== SYMBOL_COUNT) {
    problems.push(`the list holds ${list.length} symbols, and it should hold ${SYMBOL_COUNT}.`);
  }
  const inFolder = new Set(folder);
  const seen = new Map();
  for (const entry of list) {
    if (typeof entry.file !== 'string' || typeof entry.name !== 'string' || entry.name === '') {
      problems.push(`the entry ${JSON.stringify(entry)} needs a file and a name.`);
      continue;
    }
    seen.set(entry.file, (seen.get(entry.file) ?? 0) + 1);
    if (!inFolder.has(entry.file)) {
      problems.push(`${entry.file} is in the list but not in the folder.`);
    }
  }
  for (const file of folder) {
    const times = seen.get(file) ?? 0;
    if (times !== 1) {
      problems.push(`${file} is in the folder and ${times} times in the list.`);
    }
  }
});

check('PC2', 'Each file name is lower case letters, digits and hyphens.', (problems) => {
  for (const entry of list) {
    if (!SYMBOL_FILE.test(entry.file)) {
      problems.push(`${entry.file} is not a name such as "advent-calendar.svg".`);
    }
  }
});

check('PC3', `The symbols the list held at ${BEFORE} are unchanged.`, (problems) => {
  const before = JSON.parse(git('show', `${BEFORE}:src/data/symbols.json`));
  const now = new Map(list.map((entry) => [entry.file, entry.name]));
  // The blob of each file at that commit, and the blob of each file in the folder now.
  const blobs = new Map();
  for (const line of git('ls-tree', BEFORE, 'public/symbols/').trim().split('\n')) {
    const [meta, path] = line.split('\t');
    blobs.set(path.slice('public/symbols/'.length), meta.split(' ')[2]);
  }
  const present = before
    .map((entry) => entry.file)
    .filter((file) => existsSync(join(SYMBOLS, file)));
  const hashes = present.length
    ? git('hash-object', ...present.map((file) => join('public', 'symbols', file)))
        .trim()
        .split('\n')
    : [];
  const current = new Map(present.map((file, i) => [file, hashes[i]]));
  for (const { file, name } of before) {
    if (!now.has(file)) {
      problems.push(`${file} is no longer in the list.`);
    } else if (now.get(file) !== name) {
      problems.push(`${file} was named "${name}" and is now named "${now.get(file)}".`);
    }
    if (!current.has(file)) {
      problems.push(`${file} is no longer in the folder.`);
    } else if (current.get(file) !== blobs.get(file)) {
      problems.push(`${file} has changed since ${BEFORE}.`);
    }
  }
  if (before.length !== 99) {
    problems.push(`the list at ${BEFORE} held ${before.length} symbols, and 99 were expected.`);
  }
});

check('PC4', 'ATTRIBUTION.txt gives the original name of each Mulberry file.', (problems) => {
  const originals = new Map();
  const drawn = new Set();
  for (const line of readFileSync(ATTRIBUTION, 'utf8').split('\n')) {
    const mulberry = /^(\S+\.svg)\s+(\S+\.svg)$/.exec(line);
    const own = /^(\S+\.svg)\s+drawn for Symple$/.exec(line);
    if (mulberry) {
      if (originals.has(mulberry[1])) {
        problems.push(`${mulberry[1]} is given an original name twice.`);
      }
      originals.set(mulberry[1], mulberry[2]);
    } else if (own) {
      drawn.add(own[1]);
    }
  }
  for (const file of OWN_FILES) {
    if (!drawn.has(file)) {
      problems.push(`it does not say that ${file} was drawn for Symple.`);
    }
  }
  const mulberryFiles = list.map((entry) => entry.file).filter((file) => !OWN_FILES.includes(file));
  for (const file of mulberryFiles) {
    if (!originals.has(file)) {
      problems.push(`${file} has no original name.`);
    }
  }
  const listed = new Set(mulberryFiles);
  for (const file of originals.keys()) {
    if (!listed.has(file)) {
      problems.push(`${file} has an original name but is not in the list.`);
    }
  }
  if (originals.size !== MULBERRY_COUNT) {
    problems.push(
      `it names ${originals.size} Mulberry files, and it should name ${MULBERRY_COUNT}.`,
    );
  }
  const unique = new Set(originals.values());
  if (unique.size !== originals.size) {
    problems.push(
      `${originals.size - unique.size} original names are given to more than one file.`,
    );
  }
});

check('PC5', `lucide.json holds every icon of lucide-static ${LUCIDE_VERSION}.`, (problems) => {
  const require = createRequire(import.meta.url);
  const packageFolder = dirname(require.resolve('lucide-static/package.json'));
  const { version } = JSON.parse(readFileSync(join(packageFolder, 'package.json'), 'utf8'));
  if (version !== LUCIDE_VERSION) {
    problems.push(`lucide-static ${version} is installed, and ${LUCIDE_VERSION} is expected.`);
  }
  const nodes = JSON.parse(readFileSync(join(packageFolder, 'icon-nodes.json'), 'utf8'));
  const drawings = readdirSync(join(packageFolder, 'icons'));
  const icons = JSON.parse(readFileSync(LUCIDE, 'utf8'));
  const seen = new Set();
  for (const { name, shapes } of icons) {
    if (seen.has(name)) {
      problems.push(`${name} is in lucide.json twice.`);
    }
    seen.add(name);
    if (!nodes[name]) {
      problems.push(`${name} is in lucide.json but not in the package.`);
      continue;
    }
    if (!drawings.includes(`${name}.svg`)) {
      problems.push(`${name} has no file in the icons folder of the package.`);
    }
    const expected = nodes[name].map(([tag, attributes]) => ({ tag, ...attributes }));
    if (JSON.stringify(shapes) !== JSON.stringify(expected)) {
      problems.push(`${name} does not have the shapes of the package.`);
    }
    for (const shape of shapes ?? []) {
      if (!LUCIDE_TAGS.includes(shape.tag)) {
        problems.push(`${name} has a shape with the tag ${shape.tag}.`);
      }
    }
  }
  for (const name of Object.keys(nodes)) {
    if (!seen.has(name)) {
      problems.push(`${name} is in the package but not in lucide.json.`);
    }
  }
  if (icons.length !== LUCIDE_COUNT) {
    problems.push(`lucide.json holds ${icons.length} icons, and it should hold ${LUCIDE_COUNT}.`);
  }
});

check('PC6', 'No two symbols have the same name.', (problems) => {
  const files = new Map();
  for (const { file, name } of list) {
    const key = String(name).toLowerCase();
    files.set(key, [...(files.get(key) ?? []), file]);
  }
  for (const [name, shared] of files) {
    if (shared.length > 1) {
      problems.push(`the name "${name}" is given to ${shared.join(', ')}.`);
    }
  }
  const names = new Map(list.map((entry) => [entry.file, entry.name]));
  for (const [file, name] of [
    ['drink-2.svg', 'drink 2'],
    ['hot-2.svg', 'hot 2'],
    ['open-3.svg', 'open 3'],
  ]) {
    if (names.get(file) !== name) {
      problems.push(`${file} is named "${names.get(file)}", and it should be named "${name}".`);
    }
  }
});

check('PC7', 'The licence notes of the two sets ship with the app.', (problems) => {
  const licenses = join(ROOT, 'public', 'licenses');
  const mulberry = join(licenses, 'mulberry.txt');
  if (!existsSync(mulberry)) {
    problems.push('public/licenses/mulberry.txt does not exist.');
  } else {
    // The import copies LICENSE.txt of the release unchanged, so the file holds its lines.
    const text = readFileSync(mulberry, 'utf8');
    for (const line of [
      'The Mulberry Symbol set',
      'Copyright 2018-2026 Steve Lee',
      'Creative Commons Attribution-Share Alike License',
      'https://creativecommons.org/licenses/by-sa/4.0/',
    ]) {
      if (!text.includes(line)) {
        problems.push(`mulberry.txt does not hold "${line}".`);
      }
    }
  }
  const lucide = readFileSync(join(licenses, 'lucide.txt'), 'utf8');
  if (!lucide.includes('lucide-static') || !lucide.includes(LUCIDE_VERSION)) {
    problems.push(`lucide.txt does not name the package lucide-static ${LUCIDE_VERSION}.`);
  }
  if (lucide.includes('They are board, heart')) {
    problems.push('lucide.txt still lists a few icons as the ones the app copied.');
  }
  if (!lucide.includes('ISC License')) {
    problems.push('lucide.txt no longer holds the ISC License.');
  }
});

if (failures.length > 0) {
  console.error(`check-pictures: ${failures.length} case(s) failed: ${failures.join(', ')}.`);
  process.exit(1);
}
console.log('check-pictures: every case passed.');
