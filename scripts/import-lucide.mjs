// Writes src/data/lucide.json from the package lucide-static.
//
// Usage: node scripts/import-lucide.mjs
// It reads icon-nodes.json of the installed package, which holds every icon once, without the
// old alias names. The file it writes lists each icon by name, in the order of the alphabet, with
// its drawing as a list of shapes. A shape is an object with its tag and its attributes, such as
// { "tag": "circle", "cx": "12", "cy": "12", "r": "10" }.
// The app draws each kind of shape with its own template case, so the script stops when an icon
// uses a tag or an attribute that the list below does not name.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const VERSION = '1.77.0';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'src', 'data', 'lucide.json');

// The seven kinds of shape, each with the attributes the app can draw.
const SHAPES = {
  path: ['d'],
  circle: ['cx', 'cy', 'r', 'fill'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  polyline: ['points'],
  polygon: ['points'],
};

function fail(message) {
  console.error(`import-lucide: ${message}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const packageFolder = dirname(require.resolve('lucide-static/package.json'));
const { version } = JSON.parse(readFileSync(join(packageFolder, 'package.json'), 'utf8'));
if (version !== VERSION) {
  fail(
    `lucide-static ${version} is installed, but this script is for ${VERSION}. Run npm install.`,
  );
}
const nodes = JSON.parse(readFileSync(join(packageFolder, 'icon-nodes.json'), 'utf8'));

const problems = [];
const icons = Object.keys(nodes)
  .sort()
  .map((name) => ({
    name,
    shapes: nodes[name].map(([tag, attributes]) => {
      const known = SHAPES[tag];
      if (!known) {
        problems.push(`${name} uses the tag ${tag}.`);
      } else {
        for (const attribute of Object.keys(attributes)) {
          if (!known.includes(attribute)) {
            problems.push(`${name} gives its ${tag} the attribute ${attribute}.`);
          }
        }
      }
      return { tag, ...attributes };
    }),
  }));
if (problems.length > 0) {
  fail(
    `nothing was written, because the app cannot draw these shapes:\n  ${problems.join('\n  ')}`,
  );
}

// The layout is the one Prettier gives the file, so the format check passes.
const options = await prettier.resolveConfig(OUTPUT);
const text = await prettier.format(JSON.stringify(icons), { ...options, parser: 'json' });
writeFileSync(OUTPUT, text);
console.log(`lucide.json holds the ${icons.length} icons of lucide-static ${VERSION}.`);
