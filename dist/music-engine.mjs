export const SAMPLE_RATE = 22050;

export function hashText(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function createSamples(options) {
  const sampleCount = SAMPLE_RATE * options.seconds;
  const output = new Float32Array(sampleCount);
  const structure = options.structure || 'loop';
  const energy = options.energy || 'balanced';
  const random = seededRandom(hashText(`${options.prompt}${options.genre}${options.mood}${options.variation}${structure}${energy}`));
  const beat = 60 / options.bpm;
  const roots = { electronic: 55, hiphop: 49, ambient: 65.41, cinematic: 43.65 };
  const scales = {
    focused: [0, 3, 5, 7, 10],
    uplifting: [0, 4, 7, 9, 12],
    dark: [0, 1, 5, 7, 8],
    dreamy: [0, 4, 7, 11, 14],
  };
  const base = roots[options.genre];
  const scale = scales[options.mood];
  const shift = Math.floor(random() * scale.length);
  const energyGain = { gentle: 0.72, balanced: 1, intense: 1.28 }[energy];

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const position = time / options.seconds;
    const sectionGain = structure === 'build'
      ? 0.5 + position * 0.75
      : structure === 'versechorus'
        ? [0.68, 1.12, 0.78, 1.24][Math.min(3, Math.floor(position * 4))]
        : 1;
    const step = Math.floor(time / (beat / 2));
    const frequency = base * Math.pow(2, scale[(step + shift) % scale.length] / 12);
    const phase = time * frequency * Math.PI * 2;
    let value = (Math.sin(phase) + 0.35 * Math.sin(phase * 2.01) + 0.16 * Math.sin(phase * 0.5)) * 0.18;
    const local = (time % (beat / 2)) / (beat / 2);
    value *= Math.exp(-local * (options.genre === 'ambient' ? 1.1 : 3.8));
    const kickTime = time % beat;
    if (kickTime < 0.16) value += Math.sin(2 * Math.PI * (95 - 300 * kickTime) * kickTime) * Math.exp(-kickTime * 24) * 0.52;
    const snareTime = (time - beat) % (beat * 2);
    if (snareTime >= 0 && snareTime < 0.12) value += (random() * 2 - 1) * Math.exp(-snareTime * 35) * 0.16;
    if (options.genre === 'ambient') value += Math.sin(phase * 0.25) * 0.09;
    if (options.genre === 'cinematic') value += Math.sin(phase * 0.125) * 0.12;
    const fade = Math.min(1, time / 0.3, (options.seconds - time) / 0.5);
    output[index] = Math.tanh(value * 1.4 * energyGain * sectionGain) * Math.max(0, fade);
  }
  return output;
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

export function createWavBlob(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 32767, true));
  return new Blob([view], { type: 'audio/wav' });
}

export function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
