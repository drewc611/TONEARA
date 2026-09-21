// Audio identity excludes display names and timestamps, but includes every sound control.
export function trackKey(track) {
  return JSON.stringify([
    track.prompt, track.genre, track.mood, Number(track.bpm), Number(track.seconds),
    Number(track.variation || 1), track.structure || 'loop', track.energy || 'balanced',
  ]);
}

export function mergeTracks(incoming, current = [], limit = 100) {
  const seen = new Set();
  return [...incoming, ...current].filter((track) => {
    const key = trackKey(track);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}
