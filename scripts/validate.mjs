import { access, readFile } from 'node:fs/promises';

const required = ['app/index.html', 'app/app.js', 'app/music-engine.mjs', 'app/styles.css', 'app/assets/toneara-logo.png'];
for (const file of required) await access(file);

const html = await readFile('app/index.html', 'utf8');
for (const reference of ['./styles.css', './app.js', './assets/toneara-logo.png']) {
  if (!html.includes(reference)) throw new Error(`Missing HTML reference: ${reference}`);
}
if (!html.includes('Toneara Studio')) throw new Error('Product title is missing.');
console.log('Repository validation passed.');
