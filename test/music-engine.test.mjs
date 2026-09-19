import test from 'node:test';
import assert from 'node:assert/strict';
import { createSamples, createWavBlob, formatTime, SAMPLE_RATE } from '../app/music-engine.mjs';

const base = { prompt: 'warm city drive', genre: 'electronic', mood: 'focused', bpm: 96, seconds: 1, variation: 1 };

test('generation is deterministic for the same brief', () => {
  assert.deepEqual(createSamples(base), createSamples(base));
});

test('variations produce different output', () => {
  assert.notDeepEqual(createSamples(base), createSamples({ ...base, variation: 2 }));
});

test('arrangement structures produce different audio shapes', () => {
  assert.notDeepEqual(createSamples({ ...base, structure: 'loop' }), createSamples({ ...base, structure: 'build' }));
  assert.notDeepEqual(createSamples({ ...base, structure: 'build' }), createSamples({ ...base, structure: 'versechorus' }));
});

test('intense energy produces a stronger signal than gentle energy', () => {
  const averagePower = (samples) => samples.reduce((total, sample) => total + sample ** 2, 0) / samples.length;
  const gentle = averagePower(createSamples({ ...base, energy: 'gentle' }));
  const intense = averagePower(createSamples({ ...base, energy: 'intense' }));
  assert.ok(intense > gentle);
});

test('sample duration and WAV header are valid', async () => {
  const samples = createSamples(base);
  assert.equal(samples.length, SAMPLE_RATE);
  const bytes = new Uint8Array(await createWavBlob(samples).arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
});

test('time formatting is stable', () => assert.equal(formatTime(70), '1:10'));
