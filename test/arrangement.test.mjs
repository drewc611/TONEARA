import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGenerationRequest } from '../app/generation-service.mjs';
import { createSamples, createWavBlob, SAMPLE_RATE } from '../app/music-engine.mjs';
import { parseProject, serializeProject } from '../app/project-file.mjs';
import { activeProject, addTrack, mergeTracks, normalizeWorkspace } from '../app/project-library.mjs';

const STRUCTURES = ['loop', 'build', 'versechorus'];
const ENERGIES = ['gentle', 'balanced', 'intense'];
const base = { prompt: 'warm city drive', name: 'Matrix', genre: 'electronic', mood: 'focused', bpm: 96, seconds: 10, variation: 1 };
const matrix = STRUCTURES.flatMap((structure) => ENERGIES.map((energy) => createGenerationRequest({ ...base, structure, energy })));

test('every arrangement renders distinct, finite, unclipped audio and a valid WAV', async () => {
  const digests = new Set();
  const power = new Map();

  for (const track of matrix) {
    const samples = createSamples(track);
    assert.equal(samples.length, SAMPLE_RATE * track.seconds);

    let sum = 0;
    let peak = 0;
    for (const sample of samples) {
      assert.ok(Number.isFinite(sample), `${track.structure}/${track.energy} produced a non-finite sample`);
      peak = Math.max(peak, Math.abs(sample));
      sum += sample ** 2;
    }
    assert.ok(peak < 1, `${track.structure}/${track.energy} clips at ${peak}`);
    assert.ok(peak > 0.01, `${track.structure}/${track.energy} is silent`);

    const wav = await createWavBlob(samples).arrayBuffer();
    const view = new DataView(wav);
    assert.equal(wav.byteLength, 44 + samples.length * 2);
    assert.equal(view.getUint32(24, true), SAMPLE_RATE);
    assert.equal(view.getUint32(40, true), samples.length * 2);

    digests.add(createHash('sha256').update(Buffer.from(wav)).digest('hex'));
    power.set(`${track.structure}/${track.energy}`, Math.sqrt(sum / samples.length));
  }

  assert.equal(digests.size, 9, 'all nine arrangements must export different audio');
  for (const structure of STRUCTURES) {
    assert.ok(power.get(`${structure}/gentle`) < power.get(`${structure}/balanced`));
    assert.ok(power.get(`${structure}/balanced`) < power.get(`${structure}/intense`));
  }
});

test('all nine arrangements survive saving, export and re-import', () => {
  let workspace = normalizeWorkspace(null);
  const id = activeProject(workspace).id;
  for (const track of matrix) workspace = addTrack(workspace, id, track);

  const saved = activeProject(workspace).tracks;
  assert.equal(saved.length, 9, 'saving nine arrangements of one brief must keep nine tracks');

  const imported = parseProject(serializeProject(saved)).tracks;
  assert.deepEqual(
    [...imported].map(({ structure, energy }) => `${structure}/${energy}`).sort(),
    matrix.map(({ structure, energy }) => `${structure}/${energy}`).sort(),
  );
  assert.equal(mergeTracks(imported, saved).length, 9, 're-importing an export must not duplicate tracks');
});
