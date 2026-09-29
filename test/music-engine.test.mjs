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

test('sample duration and WAV header are valid', async () => {
  const samples = createSamples(base);
  assert.equal(samples.length, SAMPLE_RATE);
  const bytes = new Uint8Array(await createWavBlob(samples).arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
});

test('time formatting is stable', () => assert.equal(formatTime(70), '1:10'));

test('each arrangement shapes the audio differently', () => {
  const loop = createSamples({ ...base, structure: 'loop' });
  assert.notDeepEqual(loop, createSamples({ ...base, structure: 'build' }));
  assert.notDeepEqual(createSamples({ ...base, structure: 'build' }), createSamples({ ...base, structure: 'versechorus' }));
  assert.deepEqual(loop, createSamples(base), 'a brief with no arrangement renders as a steady loop');
});

test('energy raises the signal level in order', () => {
  const power = (samples) => samples.reduce((total, sample) => total + sample ** 2, 0) / samples.length;
  const gentle = power(createSamples({ ...base, energy: 'gentle' }));
  const balanced = power(createSamples({ ...base, energy: 'balanced' }));
  const intense = power(createSamples({ ...base, energy: 'intense' }));
  assert.ok(gentle < balanced, `gentle ${gentle} should sit below balanced ${balanced}`);
  assert.ok(balanced < intense, `balanced ${balanced} should sit below intense ${intense}`);
});

// Peak amplitude saturates through tanh, so loudness is measured as RMS per
// quarter. The closing quarter always carries the release fade, which is why a
// build is compared against its third quarter rather than its last.
function quarterLoudness(options) {
  const samples = createSamples({ ...base, seconds: 4, ...options });
  const width = Math.floor(samples.length / 4);
  return Array.from({ length: 4 }, (unused, quarter) => {
    let sum = 0;
    for (let index = quarter * width; index < (quarter + 1) * width; index += 1) sum += samples[index] ** 2;
    return Math.sqrt(sum / width);
  });
}

test('a rising build grows louder as it plays', () => {
  const [first, , third] = quarterLoudness({ structure: 'build' });
  assert.ok(first < third, `build opened at ${first} and should be louder by ${third}`);
});

test('verse and chorus lifts on each chorus', () => {
  const [verse, chorus, secondVerse, secondChorus] = quarterLoudness({ structure: 'versechorus' });
  assert.ok(verse < chorus, `verse ${verse} should sit below chorus ${chorus}`);
  assert.ok(secondVerse < secondChorus, `verse ${secondVerse} should sit below chorus ${secondChorus}`);
});

test('a steady loop holds an even level', () => {
  const quarters = quarterLoudness({ structure: 'loop' });
  assert.ok(Math.max(...quarters) / Math.min(...quarters) < 1.4, `loop drifted across ${quarters.join(', ')}`);
});

test('arrangement re-shapes the take a brief already had', () => {
  // Gain shaping is always positive, so every sample keeps its sign. A seed that
  // depended on arrangement would re-roll the take and break that.
  const gentle = createSamples({ ...base, energy: 'gentle' });
  const intense = createSamples({ ...base, structure: 'build', energy: 'intense' });
  let differences = 0;
  for (let index = 0; index < gentle.length; index += 1) {
    assert.equal(Math.sign(gentle[index]), Math.sign(intense[index]), `sample ${index} changed sign`);
    if (gentle[index] !== intense[index]) differences += 1;
  }
  assert.ok(differences > gentle.length / 2, 'the two renders should still differ in level');
});
