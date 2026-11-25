// Checks the files of the public release, and looks for secrets before the repo is made public.
//
// Usage: node scripts/check-release.mjs
// It runs the cases of check A3 of specs/features/13-public-release/validation.md and exits with
// an error when any case fails. Cases RC4 and RC5 search for secrets. RC4 reads the tracked files
// and RC5 reads every commit that a branch or a tag of this clone can reach. That includes the
// branches it has fetched from GitHub.
//
// When a search reports a value that is safe to publish, add it to ALLOWED below with the reason.
// When it reports a real secret, taking the line out is not enough, because the old commit still
// holds it. Revoke the secret where it was issued, and remove it from the history.

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const REPO_ADDRESS = 'https://github.com/javedgangjee/symple-2';
const LIVE_ADDRESS = 'https://symple-2.web.app';
const VERSION = '0.1.0';
// The SHA-256 of the licence text that https://www.apache.org/licenses/LICENSE-2.0.txt serves.
const APACHE_SHA256 = 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30';
// The folder that `ng build` writes and Firebase Hosting serves.
const BUILD_FOLDER = 'dist/symple/browser';
const ONE_YEAR = 31536000;
// The files that `ng build` names with a hash: the scripts, the styles and the font in media/.
const HASHED_FILES = ['**/*.@(js|css)', '/media/**'];
// The endings of the files that the browser keeps for a year. A rewrite must never answer for one.
const NEVER_REWRITTEN = ['js', 'css', 'woff2'];

// What NOTICE must say about each of the three other licences: the work, its licence and the
// place in the repo that the licence covers.
const OTHER_LICENCES = [
  ['Mulberry', 'CC BY-SA 4.0', 'public/symbols/'],
  ['Lucide', 'ISC License', 'src/data/lucide.json'],
  ['Libre Franklin', 'SIL Open Font License', 'src/fonts/'],
];

// The licence texts and the credit that the app ships.
const SHIPPED_LICENCES = [
  'public/licenses/mulberry.txt',
  'public/licenses/lucide.txt',
  'public/fonts/LibreFranklin-OFL.txt',
  'public/symbols/ATTRIBUTION.txt',
];

// Each rule names a kind of secret and the text that gives it away.
const SECRET_RULES = [
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['a service account file', /"type"\s*:\s*"service_account"|"private_key(_id)?"\s*:/],
  ['a Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['a Google OAuth secret', /GOCSPX-[0-9A-Za-z_-]{20,}/],
  ['a Google refresh token', /\b1\/\/[0-9A-Za-z_-]{30,}/],
  ['a GitHub token', /\b(gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,})/],
  ['an npm token', /\bnpm_[0-9A-Za-z]{36}\b/],
  ['an AWS access key', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['a Slack token', /\bxox[abprs]-[0-9A-Za-z-]{10,}/],
  ['a Twilio key', /\b(SK|AC)[0-9a-f]{32}\b/],
  ['a model provider key', /\bsk-[0-9A-Za-z_-]{20,}/],
  ['a signed token', /\beyJ[0-9A-Za-z_-]{10,}\.eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/],
  ['a password in a web address', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@'"]+:[^\s/@'"]{3,}@/i],
  [
    // The name must start the word, so the package "@inquirer/password" in package-lock.json is
    // not reported.
    'a password or a token written into the file',
    /(?<![\w/@.-])(pass(word|wd)?|pwd|secret|token|api[_-]?key|client[_-]?secret|refresh[_-]?token)["']?\s*[:=]\s*["'`][^"'`\s]{6,}["'`]/i,
  ],
];

// A file with one of these names holds a secret whatever its text is.
const SECRET_FILES = [
  ['an env file', /(^|\/)\.env(\.[^/]*)?$/],
  ['a key file', /\.(pem|p12|pfx|key|keystore|jks)$/i],
  ['an SSH key', /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/],
  ['a service account file', /(^|\/)(service-?account[^/]*|[^/]*-firebase-adminsdk-[^/]*)\.json$/i],
];

// Values that the searches report and that are safe to publish. Each entry allows one exact text in
// one file. `file` is a path, or a pattern for a group of test files.
const ALLOWED = [
  {
    // This script holds the value too, in this entry.
    file: /^(src\/app\/firebase\/firebase-config\.ts|scripts\/check-release\.mjs)$/,
    text: 'AIzaSyDtSksujAq9TU3OwynWOcGQsvVLrwvoNV4',
    why: 'The web config of Firebase is not a secret. Every web app ships it to the browser.',
  },
  {
    file: /^e2e\/|\.spec\.ts$/,
    text: "'secret12'",
    why: 'The password of the test account. The account exists only in the fakes and the canned replies.',
  },
  {
    file: 'e2e/support/firebase.ts',
    text: "'test-refresh-token'",
    why: 'A canned reply of the end to end tests. No server issued this token.',
  },
];

// The picture files are not text, so the searches skip them.
const BINARY_FILE = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|pdf|zip)$/i;

const failures = [];
let cases = 0;

/** Runs one case and records each problem it finds. */
async function check(id, title, run) {
  cases += 1;
  const problems = [];
  try {
    await run(problems);
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

/** Runs git and calls `onLine` for each line of its output, so a long history never sits in memory. */
function gitLines(args, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
    createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', onLine);
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`git ${args[0]} ended with code ${code}`)),
    );
  });
}

/** The text of a file of the repo, or undefined with a recorded problem when it is missing. */
function read(path, problems) {
  if (!existsSync(join(ROOT, path))) {
    problems.push(`${path} is missing.`);
    return undefined;
  }
  return readFileSync(join(ROOT, path), 'utf8');
}

/** Records a problem for each of `texts` that `content` does not hold. */
function mustHold(path, content, texts, problems) {
  for (const text of texts) {
    if (!content.includes(text)) {
      problems.push(`${path} does not hold "${text}".`);
    }
  }
}

function isAllowed(path, found) {
  return ALLOWED.some(
    (entry) =>
      (typeof entry.file === 'string' ? entry.file === path : entry.file.test(path)) &&
      found.includes(entry.text),
  );
}

/** The kinds of secret that one line of a file holds. */
function secretsIn(path, line) {
  const kinds = [];
  for (const [kind, pattern] of SECRET_RULES) {
    const all = new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g');
    for (const match of line.matchAll(all)) {
      if (!isAllowed(path, match[0])) {
        kinds.push(kind);
        break;
      }
    }
  }
  return kinds;
}

/** The kind of secret that a file name gives away, or undefined. */
function secretFile(path) {
  return SECRET_FILES.find(([, pattern]) => pattern.test(path))?.[0];
}

/** The part of README.md under one `##` heading, or undefined when the heading is missing. */
function section(readme, heading) {
  const lines = readme.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) {
    return undefined;
  }
  const length = lines.slice(start + 1).findIndex((line) => line.startsWith('## '));
  return lines.slice(start + 1, length === -1 ? undefined : start + 1 + length).join('\n');
}

/** The command lines of one target of the Makefile, or undefined when the target is missing. */
function makeTarget(makefile, name) {
  const lines = makefile.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`${name}:`));
  if (start === -1) {
    return undefined;
  }
  const commands = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('\t')) {
      break;
    }
    commands.push(line.trim());
  }
  return commands;
}

await check('RC1', 'LICENSE and NOTICE', (problems) => {
  const licence = read('LICENSE', problems);
  if (licence !== undefined) {
    const hash = createHash('sha256').update(licence.replaceAll('\r\n', '\n')).digest('hex');
    if (hash !== APACHE_SHA256) {
      problems.push('LICENSE is not the unchanged text of the Apache License 2.0.');
    }
  }
  const notice = read('NOTICE', problems);
  if (notice !== undefined) {
    if (!/^Copyright (\(c\) |© )?\d{4}.* \S+/m.test(notice)) {
      problems.push('NOTICE has no line "Copyright", a year and the name of the holder.');
    }
    for (const texts of OTHER_LICENCES) {
      mustHold('NOTICE', notice, texts, problems);
    }
  }
});

await check('RC2', 'package.json', (problems) => {
  const text = read('package.json', problems);
  if (text === undefined) {
    return;
  }
  const pack = JSON.parse(text);
  if (pack.version !== VERSION) {
    problems.push(`The version is ${pack.version}, and it must be ${VERSION}.`);
  }
  if (pack.license !== 'Apache-2.0') {
    problems.push(`The field license is ${pack.license}, and it must be Apache-2.0.`);
  }
  for (const script of ['deploy', 'check:release']) {
    if (!pack.scripts?.[script]) {
      problems.push(`The script ${script} is missing.`);
    }
  }
});

await check('RC3', 'firebase.json', (problems) => {
  const text = read('firebase.json', problems);
  if (text === undefined) {
    return;
  }
  const hosting = JSON.parse(text).hosting;
  if (!hosting) {
    problems.push('firebase.json has no hosting block.');
    return;
  }
  if (hosting.public !== BUILD_FOLDER) {
    problems.push(`The hosting block serves ${hosting.public}, and it must serve ${BUILD_FOLDER}.`);
  }
  const rewrites = hosting.rewrites ?? [];
  if (!rewrites.some((rule) => rule.destination === '/index.html')) {
    problems.push('No rewrite sends every other path to /index.html.');
  }
  const cacheOf = (rule) =>
    (rule.headers ?? []).find((header) => header.key.toLowerCase() === 'cache-control')?.value ??
    '';
  // Hosting matches a header rule against the path that the browser asked for, before the rewrite.
  // A reload on /needs is answered with index.html, and only a rule for every path covers it.
  // Where two rules set the same header the later one wins, so the rule for every path comes
  // first and the rules for the files with a hash in their name follow it.
  const headers = hosting.headers ?? [];
  const everyPath = headers.findIndex((rule) => rule.source === '**');
  if (everyPath === -1 || !cacheOf(headers[everyPath]).includes('no-cache')) {
    problems.push('No header rule for "**" makes the browser ask again for index.html.');
  }
  const forAYear = headers.filter((rule) => cacheOf(rule).includes(`max-age=${ONE_YEAR}`));
  for (const source of HASHED_FILES) {
    if (!forAYear.some((rule) => rule.source === source)) {
      problems.push(`No header rule lets the browser keep the files of "${source}" for a year.`);
    }
  }
  for (const rule of forAYear) {
    if (!HASHED_FILES.includes(rule.source)) {
      problems.push(
        `The rule for "${rule.source}" keeps files with no hash in their name for a year.`,
      );
    } else if (headers.indexOf(rule) < everyPath) {
      problems.push(
        `The rule for "${rule.source}" comes before the rule for "**", which then wins.`,
      );
    }
  }
});

await check('RC4', 'The tracked files hold no secret', (problems) => {
  const paths = git('ls-files', '-z').split('\0').filter(Boolean);
  for (const path of paths) {
    const named = secretFile(path);
    if (named) {
      problems.push(`${path} looks like ${named}.`);
    }
    const file = join(ROOT, path);
    if (BINARY_FILE.test(path) || !existsSync(file) || !statSync(file).isFile()) {
      continue;
    }
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const kind of secretsIn(path, line)) {
        problems.push(`${path}:${index + 1} looks like ${kind}.`);
      }
    });
  }
});

await check(
  'RC5',
  'No commit of the history holds a secret or a file under context/',
  async (problems) => {
    // Every commit that a local branch, a fetched branch or a tag can reach, with each line it adds. A merge is compared
    // with its first parent, so a line that only a merge adds is read too.
    const args = ['log', '--all', '--format=commit %h', '--patch', '--unified=0'];
    args.push('--no-color', '--no-ext-diff', '--no-textconv', '--diff-merges=first-parent');
    let commit = '';
    let path = '';
    const seen = new Set();
    const report = (problem) => {
      if (!seen.has(problem)) {
        seen.add(problem);
        problems.push(problem);
      }
    };
    await gitLines(args, (line) => {
      if (line.startsWith('commit ')) {
        commit = line.slice(7);
      } else if (line.startsWith('+++ ')) {
        path = line === '+++ /dev/null' ? '' : line.slice(6);
        if (path === 'context' || path.startsWith('context/')) {
          report(`The commit ${commit} holds ${path}.`);
        }
        const named = path && secretFile(path);
        if (named) {
          report(`The commit ${commit} holds ${path}, which looks like ${named}.`);
        }
      } else if (line.startsWith('+') && path && !BINARY_FILE.test(path)) {
        for (const kind of secretsIn(path, line.slice(1))) {
          report(`The commit ${commit} adds a line to ${path} that looks like ${kind}.`);
        }
      }
    });
    // A file that a commit adds without text, such as a picture, has no line "+++", so the names
    // are read on their own too.
    await gitLines(
      [
        'log',
        '--all',
        '--format=commit %h',
        '--name-only',
        // A commit that deletes a file does not hold it.
        '--diff-filter=d',
        '--diff-merges=first-parent',
      ],
      (line) => {
        if (line.startsWith('commit ')) {
          commit = line.slice(7);
        } else if (line === 'context' || line.startsWith('context/')) {
          report(`The commit ${commit} holds ${line}.`);
        } else if (line && secretFile(line)) {
          report(`The commit ${commit} holds ${line}, which looks like ${secretFile(line)}.`);
        }
      },
    );
  },
);

await check('RC6', 'The licences and the credit that the app ships', (problems) => {
  for (const path of SHIPPED_LICENCES) {
    const text = read(path, problems);
    if (text !== undefined && text.trim() === '') {
      problems.push(`${path} is empty.`);
    }
  }
});

await check('RC7', 'The address of the repo and the live address', (problems) => {
  const pages = ['src/app/settings/settings-panel.html', 'src/app/auth/sign-in-screen.html'];
  for (const path of pages) {
    const text = read(path, problems);
    if (text !== undefined) {
      mustHold(path, text, [REPO_ADDRESS], problems);
    }
  }
  const readme = read('README.md', problems);
  if (readme !== undefined) {
    mustHold('README.md', readme, [REPO_ADDRESS, LIVE_ADDRESS], problems);
    for (const heading of ['Privacy', 'Release']) {
      if (section(readme, heading) === undefined) {
        problems.push(`README.md has no heading "## ${heading}".`);
      }
    }
  }
});

await check('RC8', 'The folder context/ is ignored and not tracked', (problems) => {
  const ignore = read('.gitignore', problems);
  if (ignore !== undefined && !ignore.split('\n').some((line) => line.trim() === '/context/')) {
    problems.push('.gitignore does not name /context/.');
  }
  const tracked = git('ls-files', '-z', '--', 'context').split('\0').filter(Boolean);
  for (const path of tracked.slice(0, 5)) {
    problems.push(`${path} is tracked.`);
  }
  if (tracked.length > 5) {
    problems.push(`${tracked.length - 5} more files under context/ are tracked.`);
  }
});

await check('RC9', 'make deploy', (problems) => {
  const makefile = read('Makefile', problems);
  if (makefile !== undefined) {
    const deploy = makeTarget(makefile, 'deploy');
    if (deploy === undefined) {
      problems.push('Makefile has no target deploy.');
    } else if (deploy.length !== 1 || deploy[0] !== 'npm run deploy') {
      problems.push('The target deploy must run `npm run deploy` and nothing else.');
    }
    const phony = makefile.split('\n').find((line) => line.startsWith('.PHONY:')) ?? '';
    if (!phony.split(/\s+/).includes('deploy')) {
      problems.push('The .PHONY line does not name deploy.');
    }
    const all = makeTarget(makefile, 'check') ?? [];
    if (all.some((command) => /\bdeploy\b/.test(command))) {
      problems.push('The target check runs the deploy, and it must not.');
    }
  }
  const readme = read('README.md', problems);
  if (readme !== undefined && !section(readme, 'Release')?.includes('make deploy')) {
    problems.push('The Release section of README.md does not name `make deploy`.');
  }
});

await check(
  'RC10',
  'A missing script, style or font is not answered with index.html',
  (problems) => {
    const text = read('firebase.json', problems);
    if (text === undefined) {
      return;
    }
    // A tab that still runs an old build asks for scripts that a new deploy has removed. A rewrite
    // that answers with index.html would send it with the header rule of the path that was asked
    // for, so the browser would keep the wrong answer for a year. The source of the rewrite must
    // leave those paths out, in the form "!**/*.@(js|css|...)".
    for (const rule of JSON.parse(text).hosting?.rewrites ?? []) {
      const left = /^!\*\*\/\*\.@\(([a-z0-9|]+)\)$/.exec(rule.source ?? '')?.[1].split('|') ?? [];
      for (const ending of NEVER_REWRITTEN) {
        if (!left.includes(ending)) {
          problems.push(`The rewrite for "${rule.source}" also answers a missing .${ending} file.`);
        }
      }
    }
  },
);

await check('RC11', 'The Privacy section names what Firebase Auth keeps', (problems) => {
  const readme = read('README.md', problems);
  const privacy = readme === undefined ? undefined : section(readme, 'Privacy');
  if (privacy === undefined) {
    return;
  }
  if (privacy.includes('no other data')) {
    problems.push('The Privacy section says "no other data", and no list of it can be complete.');
  }
  const auth = privacy.split('\n').find((line) => line.startsWith('- Firebase Auth')) ?? '';
  mustHold('The line on Firebase Auth', auth, ['last sign in', 'IP address', 'browser'], problems);
});

await check('RC12', 'NOTICE covers every file that holds a Lucide drawing', (problems) => {
  const notice = read('NOTICE', problems);
  if (notice === undefined) {
    return;
  }
  // The folders that NOTICE names, such as "src/app/". A file in one of them is covered.
  const folders = notice.match(/[\w./-]+\//g) ?? [];
  // A template names each icon it copies in a comment that starts with "Lucide".
  const paths = git('grep', '-l', '-z', '-e', '<!-- Lucide', '--', 'src/app').split('\0');
  for (const path of paths.filter(Boolean)) {
    if (!notice.includes(path) && !folders.some((folder) => path.startsWith(folder))) {
      problems.push(`NOTICE does not name ${path}, which holds a Lucide drawing.`);
    }
  }
});

if (failures.length > 0) {
  console.log(`\n${failures.length} of ${cases} cases failed: ${failures.join(', ')}.`);
  process.exit(1);
}
console.log(`\nAll ${cases} cases passed.`);
