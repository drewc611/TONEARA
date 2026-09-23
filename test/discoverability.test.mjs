import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (name) => readFile(new URL(`../app/${name}`, import.meta.url), 'utf8');

const html = await read('index.html');
const robots = await read('robots.txt');
const sitemap = await read('sitemap.xml');
const notFound = await read('404.html');

const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)[1];
const structured = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(([, body]) => JSON.parse(body));
const faq = structured.find((entry) => entry['@type'] === 'FAQPage');

const collapse = (value) => value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

test('the canonical URL, sitemap and robots.txt all name the same site', () => {
  assert.match(canonical, /^https:\/\/[^\s"]+\/$/);
  assert.equal(sitemap.match(/<loc>([^<]+)<\/loc>/)[1], canonical);
  assert.equal(robots.match(/^Sitemap:\s*(\S+)$/m)[1], `${canonical}sitemap.xml`);
});

test('robots.txt lets crawlers reach every path', () => {
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \/\s*$/m);
});

test('the page title and description are long enough to describe the product', () => {
  const title = html.match(/<title>([^<]*)<\/title>/)[1];
  assert.ok(title.length > 24, `title too short: ${title}`);
  const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.ok(description.length >= 120 && description.length <= 320, `description is ${description.length} characters`);
});

test('exactly one h1 introduces the page', () => {
  assert.equal([...html.matchAll(/<h1[\s>]/g)].length, 1);
});

test('the software listing describes this deployment', () => {
  const application = structured.find((entry) => entry['@type'] === 'SoftwareApplication');
  assert.ok(application, 'SoftwareApplication JSON-LD is missing');
  assert.equal(application.url, canonical);
  assert.ok(application.featureList.length >= 4);
});

test('every structured FAQ answer is text the page actually shows', () => {
  assert.ok(faq, 'FAQPage JSON-LD is missing');
  const visible = collapse(html.match(/<dl class="faq"[\s\S]*?<\/dl>/)[0]);
  assert.ok(faq.mainEntity.length >= 5, 'too few questions to be worth marking up');
  for (const entry of faq.mainEntity) {
    assert.ok(visible.includes(collapse(entry.name)), `question is not on the page: ${entry.name}`);
    assert.ok(
      visible.includes(collapse(entry.acceptedAnswer.text)),
      `answer is not on the page: ${entry.name}`,
    );
  }
});

test('the FAQ does not claim capabilities the studio lacks', () => {
  const answers = faq.mainEntity.map((entry) => entry.acceptedAnswer.text).join(' ');
  assert.match(answers, /MP3 export is not available yet/);
  assert.match(answers, /deterministic synthesis engine, not a trained model/);
});

test('the 404 page is styled, unindexed and links back to the studio', () => {
  assert.match(notFound, /<meta name="robots" content="noindex/);
  assert.match(notFound, /href="\.\/styles\.css"/);
  assert.match(notFound, /<a href="\.\/">/);
  assert.match(notFound, /Content-Security-Policy/);
});

test('no asset reference escapes the deployment subdirectory', () => {
  for (const page of [html, notFound]) {
    for (const [, reference] of page.matchAll(/(?:href|src)="(\/[^/][^"]*)"/g)) {
      assert.fail(`absolute path breaks the /TONEARA/ subpath: ${reference}`);
    }
  }
});
