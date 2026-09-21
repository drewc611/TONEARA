import { execFileSync } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

// --- Application surface -----------------------------------------------------

const required = [
  'app/index.html', 'app/app.js', 'app/generation-service.mjs', 'app/manifest.webmanifest',
  'app/music-engine.mjs', 'app/project-file.mjs', 'app/project-library.mjs',
  'app/sitemap.xml', 'app/sw.js', 'app/styles.css', 'app/assets/toneara-icon-192.png', 'app/assets/toneara-logo.png',
];
for (const file of required) {
  try {
    await access(file);
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

const html = await readFile('app/index.html', 'utf8');
for (const reference of ['./styles.css', './app.js', './manifest.webmanifest', './assets/toneara-logo.png']) {
  check(html.includes(reference), `Missing HTML reference: ${reference}`);
}
// Only flag elements the browser actually fetches. A canonical or alternate
// link is metadata for crawlers and is never requested, so it is not a
// third-party runtime resource.
const FETCHING_LINK_RELS = /\b(?:stylesheet|icon|apple-touch-icon|manifest|preload|modulepreload|prefetch|preconnect|dns-prefetch)\b/i;
for (const element of html.matchAll(/<(audio|img|link|script|source)\b([^>]*)>/gi)) {
  const [, tag, attributes] = element;
  if (!/(?:href|src)\s*=\s*["']https?:\/\//i.test(attributes)) continue;
  const rel = attributes.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
  if (tag.toLowerCase() === 'link' && !FETCHING_LINK_RELS.test(rel)) continue;
  failures.push(`Release build must not request third-party resources: ${element[0].slice(0, 80)}`);
}
check(html.includes('Content-Security-Policy'), 'Content Security Policy is missing.');
check(html.includes('Toneara Studio'), 'Product title is missing.');
check(!/\son[a-z]+\s*=\s*["']/i.test(html), 'Inline event handlers are not permitted under the Content Security Policy.');

for (const hook of ['aria-live="polite"', 'aria-busy="false"', 'aria-label="Track position"']) {
  check(html.includes(hook), `Missing accessibility hook: ${hook}`);
}
for (const control of ['id="importProjectBtn"', 'id="exportProjectBtn"', 'id="projectFileInput"']) {
  check(html.includes(control), `Missing project control: ${control}`);
}

// --- Discoverability ---

const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];
check(Boolean(canonical), 'A canonical URL is required so the hosted demo indexes as one page.');
if (canonical) {
  const sitemap = await readFile('app/sitemap.xml', 'utf8');
  const location = sitemap.match(/<loc>([^<]+)<\/loc>/)?.[1];
  check(location === canonical, `sitemap.xml lists ${location}, but the canonical URL is ${canonical}.`);
  for (const property of ['og:url', 'og:title', 'og:description', 'og:image', 'twitter:card']) {
    check(html.includes(`"${property}"`), `Missing social metadata: ${property}`);
  }
}

// --- Supply chain ------------------------------------------------------------

const workflowDir = '.github/workflows';
for (const entry of await readdir(workflowDir)) {
  if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue;
  const workflow = await readFile(`${workflowDir}/${entry}`, 'utf8');

  check(/^permissions:$/m.test(workflow), `${entry} must declare a top-level permissions block.`);

  for (const line of workflow.split('\n')) {
    const used = line.match(/^\s*-?\s*uses:\s*(\S+)/);
    if (!used) continue;
    const reference = used[1];
    if (reference.startsWith('./')) continue;
    check(/@[0-9a-f]{40}$/.test(reference), `${entry} pins an action by tag, not commit SHA: ${reference}`);
  }
}

// --- Repository hygiene ------------------------------------------------------

try {
  const tracked = execFileSync('git', ['ls-files', 'dist'], { encoding: 'utf8' }).trim();
  check(tracked === '', 'Build output under dist/ must not be tracked in git.');
} catch {
  // Not a git checkout (for example a source tarball); nothing to verify.
}

// --- Result ------------------------------------------------------------------

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  throw new Error(`Repository validation failed with ${failures.length} problem(s).`);
}
console.log('Repository validation passed.');
