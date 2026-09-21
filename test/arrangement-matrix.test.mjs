import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSamples, createWavBlob, SAMPLE_RATE } from '../app/music-engine.mjs';
import { mergeTracks } from '../app/track-library.mjs';
import { serializeProject, parseProject } from '../app/project-file.mjs';

const base = { prompt: 'warm city drive', name: 'Matrix', genre: 'electronic', mood: 'focused', bpm: 96, seconds: 10, variation: 1 };
const matrix = ['loop', 'build', 'versechorus'].flatMap(structure => ['gentle', 'balanced', 'intense'].map(energy => ({ ...base, structure, energy })));

test('all nine arrangements survive saving and project import without duplicates', () => {
  let saved = [];
  for (const track of matrix) saved = mergeTracks([track], saved);
  assert.equal(saved.length, 9);
  const imported = parseProject(serializeProject(saved)).tracks;
  assert.equal(mergeTracks(imported, saved).length, 9);
  assert.deepEqual(imported.map(({ structure, energy }) => [structure, energy]), saved.map(({ structure, energy }) => [structure, energy]));
});

test('legacy defaults deduplicate and all sound controls distinguish tracks', () => {
  assert.equal(mergeTracks([{ ...base, structure: 'loop', energy: 'balanced' }], [base]).length, 1);
  for (const change of [{ genre: 'ambient' }, { mood: 'dark' }, { bpm: 100 }, { seconds: 20 }, { variation: 2 }]) {
    assert.equal(mergeTracks([{ ...base, ...change }], [base]).length, 2);
  }
  assert.equal(mergeTracks(matrix, [], 4).length, 4);
});

test('nine-track matrix is distinct, finite, unclipped, audible and exports valid PCM', async () => {
  const hashes = new Set();
  const powers = new Map();
  for (const track of matrix) {
    const samples = createSamples(track);
    assert.equal(samples.length, SAMPLE_RATE * track.seconds);
    let sum = 0, peak = 0;
    for (const sample of samples) {
      assert.ok(Number.isFinite(sample));
      peak = Math.max(peak, Math.abs(sample));
      sum += sample ** 2;
    }
    assert.ok(peak < 1 && peak > 0.01);
    const rms = Math.sqrt(sum / samples.length);
    assert.ok(rms > 0.01);
    const wav = await createWavBlob(samples).arrayBuffer();
    const view = new DataView(wav);
    assert.equal(view.getUint32(24, true), SAMPLE_RATE);
    assert.equal(view.getUint32(40, true), samples.length * 2);
    assert.equal(wav.byteLength, 44 + samples.length * 2);
    hashes.add(createHash('sha256').update(Buffer.from(wav)).digest('hex'));
    powers.set(`${track.structure}/${track.energy}`, rms);
    console.log(`${track.structure}/${track.energy}: RMS=${rms.toFixed(4)}, peak=${peak.toFixed(4)}, PCM PASS`);
  }
  assert.equal(hashes.size, 9);
  for (const structure of ['loop', 'build', 'versechorus']) {
    assert.ok(powers.get(`${structure}/gentle`) < powers.get(`${structure}/balanced`));
    assert.ok(powers.get(`${structure}/balanced`) < powers.get(`${structure}/intense`));
  }
});
