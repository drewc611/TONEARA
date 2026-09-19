import { access, readFile } from 'node:fs/promises';

const required = ['app/index.html', 'app/app.js', 'app/generation-service.mjs', 'app/manifest.webmanifest', 'app/music-engine.mjs', 'app/project-file.mjs', 'app/sw.js', 'app/styles.css', 'app/assets/toneara-icon-192.png', 'app/assets/toneara-logo.png'];
for (const file of required) await access(file);

const html = await readFile('app/index.html', 'utf8');
for (const reference of ['./styles.css', './app.js', './manifest.webmanifest', './assets/toneara-logo.png']) {
  if (!html.includes(reference)) throw new Error(`Missing HTML reference: ${reference}`);
}
const externalResource = /<(?:audio|img|link|script|source)\b[^>]*(?:href|src)\s*=\s*["']https?:\/\//i;
if (externalResource.test(html)) throw new Error('Release build must not request third-party resources.');
if (!html.includes('Content-Security-Policy')) throw new Error('Content Security Policy is missing.');
if (!html.includes('Toneara Studio')) throw new Error('Product title is missing.');
for (const accessibilityHook of ['aria-live="polite"', 'aria-busy="false"', 'aria-label="Track position"']) {
  if (!html.includes(accessibilityHook)) throw new Error(`Missing accessibility hook: ${accessibilityHook}`);
}
for (const projectControl of ['id="importProjectBtn"', 'id="exportProjectBtn"', 'id="projectFileInput"']) {
  if (!html.includes(projectControl)) throw new Error(`Missing project control: ${projectControl}`);
}
for (const arrangementControl of ['id="structure"', 'id="energy"']) {
  if (!html.includes(arrangementControl)) throw new Error(`Missing arrangement control: ${arrangementControl}`);
}
console.log('Repository validation passed.');
