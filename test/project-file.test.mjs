import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectDocument, parseProject, serializeProject, PROJECT_SCHEMA } from '../app/project-file.mjs';

const track = { prompt: 'warm city drive', name: 'Midnight Circuit', genre: 'electronic', mood: 'focused', bpm: 96, seconds: 10, variation: 1, structure: 'build', energy: 'intense', createdAt: 1234 };

test('Toneara projects round trip without losing track settings', () => {
  const parsed = parseProject(serializeProject([track], { exportedAt: '2026-09-16T00:00:00.000Z' }));
  assert.equal(parsed.schema, PROJECT_SCHEMA);
  assert.deepEqual(parsed.tracks, [track]);
});

test('project imports discard unknown track fields', () => {
  const document = createProjectDocument([{ ...track, providerSecret: 'must-not-survive' }]);
  assert.equal('providerSecret' in document.tracks[0], false);
});

test('malformed JSON is rejected with a stable error code', () => {
  assert.throws(() => parseProject('{broken'), (error) => error.code === 'invalid_project_json');
});

test('files with an unknown schema are rejected', () => {
  assert.throws(() => parseProject(JSON.stringify({ schema: 'other.project', version: 1, tracks: [] })), (error) => error.code === 'invalid_project_schema');
});

test('future project versions are rejected safely', () => {
  assert.throws(() => parseProject(JSON.stringify({ schema: PROJECT_SCHEMA, version: 99, tracks: [] })), (error) => error.code === 'unsupported_project_version');
});
