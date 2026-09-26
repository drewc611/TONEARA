import { GenerationError } from '../app/generation-service.mjs';

/**
 * Server-side adapter for a hosted music-generation provider.
 *
 * The credential is read from the process environment and is never returned,
 * logged, or included in an error. Browser code must call this through the
 * application server, so a provider key never reaches a client.
 */
export const REQUIRED_ENVIRONMENT = Object.freeze(['TONEARA_PROVIDER_URL', 'TONEARA_PROVIDER_KEY']);

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_ATTEMPTS = 3;

export function readProviderConfig(environment = process.env) {
  const missing = REQUIRED_ENVIRONMENT.filter((name) => !environment[name]);
  if (missing.length) {
    throw new GenerationError(`Hosted provider is not configured. Missing: ${missing.join(', ')}.`, 'provider_unconfigured');
  }
  let endpoint;
  try {
    endpoint = new URL(environment.TONEARA_PROVIDER_URL);
  } catch {
    throw new GenerationError('TONEARA_PROVIDER_URL is not a valid URL.', 'provider_unconfigured');
  }
  if (endpoint.protocol !== 'https:') {
    throw new GenerationError('TONEARA_PROVIDER_URL must use HTTPS.', 'provider_insecure');
  }
  return {
    endpoint,
    key: environment.TONEARA_PROVIDER_KEY,
    timeoutMs: Number(environment.TONEARA_PROVIDER_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    maxAttempts: Math.min(5, Math.max(1, Number(environment.TONEARA_PROVIDER_MAX_ATTEMPTS) || DEFAULT_MAX_ATTEMPTS)),
  };
}

export function backoffDelayMs(attempt, { baseMs = 250, maxMs = 4_000, jitter = Math.random } = {}) {
  const exponential = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  return Math.round(exponential * (0.5 + jitter() * 0.5));
}

function linkAbort(signal, controller) {
  if (!signal) return () => {};
  if (signal.aborted) controller.abort();
  const forward = () => controller.abort();
  signal.addEventListener('abort', forward, { once: true });
  return () => signal.removeEventListener('abort', forward);
}

/**
 * @param {object} options
 * @param {typeof fetch} [options.fetchImpl] Injected for tests.
 * @param {(ms: number) => Promise<void>} [options.sleep]
 */
export function createHostedProvider({ config, fetchImpl = globalThis.fetch, sleep, metrics, id = 'hosted' } = {}) {
  const settings = config || readProviderConfig();
  const pause = sleep || ((ms) => new Promise((resolve) => { setTimeout(resolve, ms); }));

  async function attemptOnce(request, signal) {
    const controller = new AbortController();
    const unlink = linkAbort(signal, controller);
    const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetchImpl(settings.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${settings.key}`,
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = new GenerationError(
          `The music provider returned status ${response.status}.`,
          response.status === 429 ? 'provider_rate_limited' : 'provider_failed',
        );
        error.retryable = RETRYABLE_STATUS.has(response.status);
        throw error;
      }
      return await response.arrayBuffer();
    } finally {
      clearTimeout(timer);
      unlink();
    }
  }

  return {
    id,
    async generate(request, { signal } = {}) {
      const startedAt = Date.now();
      let lastError;

      for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
        if (signal?.aborted) {
          metrics?.record({ provider: id, outcome: 'cancelled', durationMs: Date.now() - startedAt });
          throw new GenerationError('Generation was cancelled.', 'cancelled');
        }
        try {
          const audio = await attemptOnce(request, signal);
          metrics?.record({ provider: id, outcome: 'completed', durationMs: Date.now() - startedAt });
          return { audio, mimeType: 'audio/mpeg', fileExtension: 'mp3' };
        } catch (error) {
          if (signal?.aborted) {
            metrics?.record({ provider: id, outcome: 'cancelled', durationMs: Date.now() - startedAt });
            throw new GenerationError('Generation was cancelled.', 'cancelled');
          }
          lastError = error;
          const timedOut = error?.name === 'AbortError' || error?.name === 'TimeoutError';
          const retryable = timedOut || error?.retryable === true || error?.code === 'ECONNRESET';
          if (!retryable || attempt === settings.maxAttempts) break;
          await pause(backoffDelayMs(attempt));
        }
      }

      const failure = lastError instanceof GenerationError
        ? lastError
        : new GenerationError('The music provider is unavailable.', 'provider_unavailable', { cause: lastError });
      metrics?.record({ provider: id, outcome: 'failed', durationMs: Date.now() - startedAt, code: failure.code });
      throw failure;
    },
  };
}
