import test from 'node:test';
import assert from 'node:assert/strict';
import { backoffDelayMs, createHostedProvider, readProviderConfig, REQUIRED_ENVIRONMENT } from '../server/hosted-provider.mjs';
import { createRateLimiter } from '../server/rate-limit.mjs';
import { createMetrics } from '../server/metrics.mjs';

const environment = {
  TONEARA_PROVIDER_URL: 'https://provider.example/generate',
  TONEARA_PROVIDER_KEY: 'secret-key-value',
};
const request = { prompt: 'warm city drive', genre: 'electronic', mood: 'focused', bpm: 96, seconds: 10, variation: 1 };
const config = { ...readProviderConfig(environment), maxAttempts: 3, timeoutMs: 50 };
const noSleep = () => Promise.resolve();

test('provider configuration is required and must be HTTPS', () => {
  assert.deepEqual(REQUIRED_ENVIRONMENT, ['TONEARA_PROVIDER_URL', 'TONEARA_PROVIDER_KEY']);
  assert.throws(() => readProviderConfig({}), /Missing: TONEARA_PROVIDER_URL, TONEARA_PROVIDER_KEY/);
  assert.throws(() => readProviderConfig({ ...environment, TONEARA_PROVIDER_URL: 'http://provider.example' }), /must use HTTPS/);
  assert.throws(() => readProviderConfig({ ...environment, TONEARA_PROVIDER_URL: 'not a url' }), /not a valid URL/);
});

test('the provider credential travels in the request and never in an error', async () => {
  let seenAuthorization = null;
  const provider = createHostedProvider({
    config,
    sleep: noSleep,
    fetchImpl: async (url, options) => {
      seenAuthorization = options.headers.authorization;
      return { ok: false, status: 401 };
    },
  });
  const error = await provider.generate(request).catch((failure) => failure);
  assert.equal(seenAuthorization, 'Bearer secret-key-value');
  assert.equal(JSON.stringify({ message: error.message, code: error.code }).includes('secret-key-value'), false);
});

test('retryable failures are retried up to the configured bound, then give up', async () => {
  let attempts = 0;
  const provider = createHostedProvider({
    config,
    sleep: noSleep,
    fetchImpl: async () => { attempts += 1; return { ok: false, status: 503 }; },
  });
  await assert.rejects(provider.generate(request), /status 503/);
  assert.equal(attempts, 3, 'stops at maxAttempts rather than retrying forever');
});

test('a client error is not retried', async () => {
  let attempts = 0;
  const provider = createHostedProvider({
    config,
    sleep: noSleep,
    fetchImpl: async () => { attempts += 1; return { ok: false, status: 400 }; },
  });
  await assert.rejects(provider.generate(request));
  assert.equal(attempts, 1);
});

test('a transient failure followed by success returns audio', async () => {
  let attempts = 0;
  const provider = createHostedProvider({
    config,
    sleep: noSleep,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) return { ok: false, status: 429 };
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    },
  });
  const output = await provider.generate(request);
  assert.equal(attempts, 2);
  assert.equal(output.mimeType, 'audio/mpeg');
});

test('a hanging provider is abandoned at the timeout', async () => {
  const provider = createHostedProvider({
    config: { ...config, timeoutMs: 20, maxAttempts: 1 },
    sleep: noSleep,
    fetchImpl: (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    }),
  });
  await assert.rejects(provider.generate(request), /unavailable/);
});

test('cancellation is reported as cancellation, not as a provider failure', async () => {
  const controller = new AbortController();
  const provider = createHostedProvider({
    config,
    sleep: noSleep,
    fetchImpl: (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
      controller.abort();
    }),
  });
  const error = await provider.generate(request, { signal: controller.signal }).catch((failure) => failure);
  assert.equal(error.code, 'cancelled');
});

test('backoff grows but stays bounded and jittered', () => {
  assert.equal(backoffDelayMs(1, { jitter: () => 1 }), 250);
  assert.equal(backoffDelayMs(2, { jitter: () => 1 }), 500);
  assert.equal(backoffDelayMs(1, { jitter: () => 0 }), 125);
  assert.equal(backoffDelayMs(20, { jitter: () => 1 }), 4000, 'capped');
});

test('the rate limiter admits a bounded number of jobs per window', () => {
  let clock = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => clock });
  assert.equal(limiter.take('a').allowed, true);
  assert.equal(limiter.take('a').allowed, true);

  const blocked = limiter.take('a');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);
  assert.equal(limiter.take('b').allowed, true, 'keys are independent');

  clock = 1000;
  assert.equal(limiter.take('a').allowed, true, 'a new window resets the budget');
});

test('metrics record job shape and refuse unknown outcomes', () => {
  const metrics = createMetrics();
  metrics.record({ provider: 'hosted', outcome: 'completed', durationMs: 120 });
  metrics.record({ provider: 'hosted', outcome: 'completed', durationMs: 480 });
  metrics.record({ provider: 'hosted', outcome: 'failed', durationMs: 90, code: 'provider_unavailable' });
  assert.throws(() => metrics.record({ provider: 'hosted', outcome: 'prompt_logged' }), /Unknown outcome/);

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.counters['hosted:completed'], 2);
  assert.equal(snapshot.counters['hosted:failed:provider_unavailable'], 1);
  assert.equal(snapshot.latency.hosted.samples, 3);
  assert.equal(snapshot.latency.hosted.maxMs, 480);
});

test('metrics cannot carry prompt text', () => {
  const metrics = createMetrics();
  metrics.record({ provider: 'hosted', outcome: 'completed', durationMs: 10, prompt: 'warm city drive' });
  assert.equal(JSON.stringify(metrics.snapshot()).includes('warm city drive'), false);
});
