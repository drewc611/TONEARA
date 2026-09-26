/**
 * Generation instrumentation.
 *
 * Deliberately records only the shape of a job: which provider ran, whether it
 * succeeded, how long it took, and the failure code. Prompts, track names, and
 * any other creative content are never accepted by this module, so telemetry
 * cannot widen the data the product collects.
 */
const ALLOWED_OUTCOMES = new Set(['completed', 'failed', 'cancelled', 'rate_limited']);

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index];
}

export function createMetrics({ sampleLimit = 500 } = {}) {
  const counters = new Map();
  const durations = new Map();

  function record({ provider, outcome, durationMs, code }) {
    if (!ALLOWED_OUTCOMES.has(outcome)) throw new RangeError(`Unknown outcome: ${outcome}`);
    const providerId = String(provider || 'unknown').slice(0, 32);
    const key = `${providerId}:${outcome}${code ? `:${String(code).slice(0, 48)}` : ''}`;
    counters.set(key, (counters.get(key) || 0) + 1);

    if (!Number.isFinite(durationMs)) return;
    const samples = durations.get(providerId) || [];
    samples.push(Math.max(0, Math.round(durationMs)));
    if (samples.length > sampleLimit) samples.shift();
    durations.set(providerId, samples);
  }

  function snapshot() {
    const providers = {};
    for (const [providerId, samples] of durations) {
      const sorted = [...samples].sort((a, b) => a - b);
      providers[providerId] = {
        samples: sorted.length,
        p50Ms: percentile(sorted, 0.5),
        p95Ms: percentile(sorted, 0.95),
        maxMs: sorted.at(-1) ?? 0,
      };
    }
    return { counters: Object.fromEntries(counters), latency: providers };
  }

  return { record, snapshot };
}
