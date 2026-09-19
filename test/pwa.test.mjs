import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../app/manifest.webmanifest', import.meta.url), 'utf8'));
const serviceWorker = await readFile(new URL('../app/sw.js', import.meta.url), 'utf8');

test('web manifest defines an installable standalone application', () => {
  assert.equal(manifest.name, 'Toneara Studio');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
});

test('service worker pre-caches every critical application module', () => {
  for (const asset of ['index.html', 'app.js', 'generation-service.mjs', 'music-engine.mjs', 'project-file.mjs', 'manifest.webmanifest']) {
    assert.match(serviceWorker, new RegExp(asset.replace('.', '\\.')));
  }
});

test('service worker restricts interception to same-origin GET requests', () => {
  assert.match(serviceWorker, /request\.method !== 'GET'/);
  assert.match(serviceWorker, /origin !== self\.location\.origin/);
});
