import { access, readFile } from 'node:fs/promises';

const required = ['app/index.html', 'app/app.js', 'app/generation-service.mjs', 'app/music-engine.mjs', 'app/project-file.mjs', 'app/styles.css', 'app/assets/toneara-logo.png'];
for (const file of required) await access(file);

const html = await readFile('app/index.html', 'utf8');
for (const reference of ['./styles.css', './app.js', './assets/toneara-logo.png']) {
  if (!html.includes(reference)) throw new Error(`Missing HTML reference: ${reference}`);
}
if (!html.includes('Toneara Studio')) throw new Error('Product title is missing.');
for (const accessibilityHook of ['aria-live="polite"', 'aria-busy="false"', 'aria-label="Track position"']) {
  if (!html.includes(accessibilityHook)) throw new Error(`Missing accessibility hook: ${accessibilityHook}`);
}
for (const projectControl of ['id="importProjectBtn"', 'id="exportProjectBtn"', 'id="projectFileInput"']) {
  if (!html.includes(projectControl)) throw new Error(`Missing project control: ${projectControl}`);
}
console.log('Repository validation passed.');
