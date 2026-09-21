import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describeWaveform } from '../app/music-engine.mjs';

const html = await readFile('app/index.html', 'utf8');
const css = await readFile('app/styles.css', 'utf8');

/** Minimal tag scanner. Enough for a structural smoke test on a single known page. */
function tags(name = '[a-zA-Z][a-zA-Z0-9-]*') {
  const found = [];
  const pattern = new RegExp(`<(${name})\\b([^>]*)>`, 'g');
  for (const match of html.matchAll(pattern)) {
    const attributes = {};
    for (const attribute of match[2].matchAll(/([a-zA-Z-]+)(?:\s*=\s*"([^"]*)")?/g)) {
      attributes[attribute[1].toLowerCase()] = attribute[2] ?? '';
    }
    found.push({ tag: match[1].toLowerCase(), attributes, raw: match[0], index: match.index });
  }
  return found;
}

/**
 * Collects the characters that sit outside angle brackets, which is the visible
 * text of a fragment. Written as a scan rather than a tag-stripping replace:
 * that shape is an incomplete sanitizer, and it reads as one even where, as
 * here, nothing untrusted is involved.
 */
function visibleText(markup) {
  let depth = 0;
  let text = '';
  for (const character of markup) {
    if (character === '<') depth += 1;
    else if (character === '>') depth = Math.max(0, depth - 1);
    else if (depth === 0) text += character;
  }
  return text.trim();
}

const identifiers = new Set(tags().map((node) => node.attributes.id).filter(Boolean));

test('the page declares a language and a single top-level heading', () => {
  assert.match(html, /<html lang="[a-z]{2}(-[A-Za-z]+)?"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
});

test('heading levels are not skipped', () => {
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(levels[index] - levels[index - 1] <= 1, `heading jumps from h${levels[index - 1]} to h${levels[index]}`);
  }
});

test('a skip link reaches a real landmark', () => {
  const skip = tags('a').find((node) => node.attributes.class?.includes('skip-link'));
  assert.ok(skip, 'a skip link is present');
  assert.equal(identifiers.has(skip.attributes.href.replace('#', '')), true);
  assert.match(css, /\.skip-link:focus\{[^}]*top:/, 'the skip link becomes visible on focus');
});

test('every form control has an accessible name', () => {
  const labelled = new Set([...html.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map((match) => match[1]));
  for (const node of tags('input|select|textarea')) {
    if (node.attributes.type === 'hidden' || 'hidden' in node.attributes) continue;
    const named = labelled.has(node.attributes.id)
      || 'aria-label' in node.attributes
      || 'aria-labelledby' in node.attributes;
    assert.ok(named, `control #${node.attributes.id || node.raw} has no accessible name`);
  }
});

test('every button has a discernible name', () => {
  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const hasAria = /aria-label(ledby)?\s*=/.test(match[1]);
    const text = visibleText(match[2]);
    assert.ok(hasAria || text.length > 0, `button has no name: ${match[0].slice(0, 80)}`);
  }
});

test('images are either described or explicitly decorative', () => {
  for (const node of tags('img')) assert.ok('alt' in node.attributes, `<img> without alt: ${node.raw}`);
});

test('the waveform canvas exposes a role and a text description', () => {
  const canvas = tags('canvas').find((node) => node.attributes.id === 'waveform');
  assert.equal(canvas.attributes.role, 'img');
  assert.ok(canvas.attributes['aria-label']);
  assert.equal(identifiers.has(canvas.attributes['aria-describedby']), true);
});

test('every aria reference points at an element that exists', () => {
  for (const node of tags()) {
    for (const attribute of ['aria-describedby', 'aria-labelledby', 'aria-controls']) {
      const value = node.attributes[attribute];
      if (!value) continue;
      for (const reference of value.split(/\s+/)) {
        assert.equal(identifiers.has(reference), true, `${attribute}="${reference}" has no matching id`);
      }
    }
  }
});

test('no element traps keyboard users with a positive tabindex', () => {
  for (const node of tags()) {
    if (!('tabindex' in node.attributes)) continue;
    assert.ok(Number(node.attributes.tabindex) <= 0, `positive tabindex on ${node.raw}`);
  }
});

test('interactive controls keep a visible focus indicator', () => {
  assert.match(css, /:focus-visible\{outline:3px solid var\(--accent\);outline-offset:3px\}/);
  for (const selector of ['.skip', '.section-marker', '#projectSelect', '.scrub']) {
    assert.ok(css.includes(`${selector}:focus-visible`), `${selector} has no focus-visible rule`);
  }
});

test('motion is reduced when the visitor asks for it', () => {
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});

test('live regions announce generation and library state', () => {
  const resultCard = tags('section').find((node) => node.attributes.id === 'resultCard');
  assert.equal(resultCard.attributes['aria-busy'], 'false');
  assert.equal(resultCard.attributes['aria-live'], 'polite');
  assert.match(html, /id="libraryStatus"[^>]*role="status"/);
});

test('project controls are reachable and labelled', () => {
  for (const id of ['projectSelect', 'newProjectBtn', 'renameProjectBtn', 'archiveProjectBtn', 'deleteProjectBtn']) {
    assert.equal(identifiers.has(id), true, `missing project control #${id}`);
  }
});

test('the waveform description names spans, loudness, and the peak', () => {
  const samples = new Float32Array(22050 * 10);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin(index / 40) * (index > samples.length * 0.75 ? 0.95 : 0.08);
  }
  const description = describeWaveform(samples, 10);
  assert.match(description, /0:00 to 0:01/);
  assert.match(description, /near silence/);
  assert.match(description, /peak volume/);
  assert.match(description, /Loudest around 0:07/);
});

test('the waveform description degrades safely with no audio', () => {
  assert.equal(describeWaveform(new Float32Array(0), 10), 'No audio to describe yet.');
  assert.equal(describeWaveform(new Float32Array(10), 0), 'No audio to describe yet.');
});
