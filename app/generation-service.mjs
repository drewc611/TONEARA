import { createSamples, createWavBlob } from './music-engine.mjs';

export const JOB_STATUS = Object.freeze({
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

const ALLOWED_GENRES = new Set(['electronic', 'hiphop', 'ambient', 'cinematic']);
const ALLOWED_MOODS = new Set(['focused', 'uplifting', 'dark', 'dreamy']);

export class GenerationError extends Error {
  constructor(message, code = 'generation_failed', options = {}) {
    super(message, options);
    this.name = 'GenerationError';
    this.code = code;
  }
}

export function createGenerationRequest(input) {
  const request = {
    prompt: String(input.prompt || '').trim(),
    name: String(input.name || '').trim(),
    genre: String(input.genre || ''),
    mood: String(input.mood || ''),
    bpm: Number(input.bpm),
    seconds: Number(input.seconds),
    variation: Number(input.variation),
  };

  if (!request.prompt || request.prompt.length > 180) throw new GenerationError('Enter a prompt of 180 characters or fewer.', 'invalid_prompt');
  if (!ALLOWED_GENRES.has(request.genre)) throw new GenerationError('Choose a supported genre.', 'invalid_genre');
  if (!ALLOWED_MOODS.has(request.mood)) throw new GenerationError('Choose a supported mood.', 'invalid_mood');
  if (!Number.isInteger(request.bpm) || request.bpm < 68 || request.bpm > 144) throw new GenerationError('Tempo must be between 68 and 144 BPM.', 'invalid_bpm');
  if (![10, 20, 30].includes(request.seconds)) throw new GenerationError('Length must be 10, 20, or 30 seconds.', 'invalid_duration');
  if (!Number.isInteger(request.variation) || request.variation < 1 || request.variation > 12) throw new GenerationError('Variation must be between 1 and 12.', 'invalid_variation');
  return Object.freeze(request);
}

function wait(milliseconds, signal) {
  if (!milliseconds) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new GenerationError('Generation was cancelled.', 'cancelled'));
    }, { once: true });
  });
}

function assertActive(signal) {
  if (signal?.aborted) throw new GenerationError('Generation was cancelled.', 'cancelled');
}

export function createLocalProvider({ stageDelay = 420 } = {}) {
  return {
    id: 'local',
    async generate(request, { signal, reportProgress } = {}) {
      const stages = [
        ['Reading your brief', 'Extracting rhythm and mood…', 18],
        ['Building the arrangement', 'Composing melody and drums…', 54],
        ['Mixing the track', 'Balancing the final sound…', 82],
        ['Preparing preview', 'Rendering your WAV file…', 100],
      ];

      for (const [title, detail, progress] of stages) {
        assertActive(signal);
        reportProgress?.({ title, detail, progress });
        await wait(stageDelay, signal);
      }

      assertActive(signal);
      const samples = createSamples(request);
      return {
        samples,
        audio: createWavBlob(samples),
        mimeType: 'audio/wav',
        fileExtension: 'wav',
      };
    },
  };
}

export function createGenerationService({ primary, fallback } = {}) {
  const defaultProvider = primary || createLocalProvider();
  let sequence = 0;

  async function generate(input, { signal, onUpdate } = {}) {
    const request = createGenerationRequest(input);
    const jobId = `toneara-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
    const startedAt = new Date().toISOString();
    const publish = (status, data = {}) => onUpdate?.({ jobId, status, provider: data.provider, ...data });
    publish(JOB_STATUS.QUEUED, { progress: 0, title: 'Generation queued', detail: 'Preparing the music engine…' });

    const providers = fallback && fallback.id !== defaultProvider.id ? [defaultProvider, fallback] : [defaultProvider];
    let lastError;

    for (const provider of providers) {
      try {
        assertActive(signal);
        publish(JOB_STATUS.PROCESSING, { provider: provider.id, progress: 1, title: 'Generation started', detail: `Using the ${provider.id} provider…` });
        const output = await provider.generate(request, {
          signal,
          reportProgress: (progress) => publish(JOB_STATUS.PROCESSING, { provider: provider.id, ...progress }),
        });
        const result = { jobId, status: JOB_STATUS.COMPLETED, provider: provider.id, request, startedAt, completedAt: new Date().toISOString(), ...output };
        publish(JOB_STATUS.COMPLETED, result);
        return result;
      } catch (error) {
        lastError = error;
        if (error?.code === 'cancelled') {
          publish(JOB_STATUS.CANCELLED, { provider: provider.id, error: error.message });
          throw error;
        }
      }
    }

    const failure = lastError instanceof GenerationError
      ? lastError
      : new GenerationError('The music provider could not complete this track.', 'provider_failed', { cause: lastError });
    publish(JOB_STATUS.FAILED, { error: failure.message, code: failure.code });
    throw failure;
  }

  return { generate };
}
