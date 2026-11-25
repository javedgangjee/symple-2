// Tries the search of the history of scripts/check-release.mjs on made-up repos.
//
// Usage: node --test scripts/check-release.test.mjs
// Each case makes a repo in the temp folder of the system, commits some files to it and runs
// `node scripts/check-release.mjs --history <folder>`, which runs case RC5 alone on that repo.
// The cases are those of check A6 of specs/features/13-public-release/validation.md.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-release.mjs');

/** Makes a repo with one commit that holds `files`, runs the search on it and gives the result. */
function search(files) {
  const repo = mkdtempSync(join(tmpdir(), 'symple-history-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
    git('init', '--quiet');
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), content);
    }
    git('add', '--all');
    const who = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com'];
    git(...who, '-c', 'commit.gpgsign=false', 'commit', '--quiet', '--message', 'One');
    const run = spawnSync('node', [SCRIPT, '--history', repo], { encoding: 'utf8' });
    return { code: run.status, output: run.stdout };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

test('HS1: a repo with nothing to report passes', () => {
  const { code, output } = search({ 'notes.md': 'Nothing to see.\n' });
  assert.equal(code, 0, output);
});

test('HS2: a text file under context/ with a letter outside ASCII in its name is reported', () => {
  const { code, output } = search({ 'context/café.txt': 'A note.\n' });
  assert.equal(code, 1, output);
  assert.match(output, /holds context\/café\.txt\./);
});

test('HS3: a picture under context/ with a letter outside ASCII in its name is reported', () => {
  const { code, output } = search({ 'context/é.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1]) });
  assert.equal(code, 1, output);
  assert.match(output, /holds context\/é\.png\./);
});

test('HS4: a file under context/ with a quote and a space in its name is reported', () => {
  const { code, output } = search({ 'context/say "hi".txt': 'A note.\n' });
  assert.equal(code, 1, output);
  assert.match(output, /holds context\/say "hi"\.txt\./);
});
