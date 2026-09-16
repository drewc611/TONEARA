import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGenerationRequest,
  createGenerationService,
  createLocalProvider,
  GenerationError,
  JOB_STATUS,
} from '../app/generation-service.mjs';

const request = { prompt: 'warm city drive', name: '', genre: 'electronic', mood: 'focused', bpm: 96, seconds: 10, variation: 1 };

test('generation requests are normalized and immutable', () => {
  const normalized = createGenerationRequest({ ...request, prompt: '  warm city drive  ' });
  assert.equal(normalized.prompt, 'warm city drive');
  assert.equal(Object.isFrozen(normalized), true);
});

test('invalid requests fail before a provider is called', async () => {
  const service = createGenerationService({ primary: createLocalProvider({ stageDelay: 0 }) });
  await assert.rejects(() => service.generate({ ...request, bpm: 900 }), (error) => error instanceof GenerationError && error.code === 'invalid_bpm');
});

test('local generation reports a complete job lifecycle', async () => {
  const updates = [];
  const service = createGenerationService({ primary: createLocalProvider({ stageDelay: 0 }) });
  const result = await service.generate(request, { onUpdate: (update) => updates.push(update) });
  assert.equal(updates[0].status, JOB_STATUS.QUEUED);
  assert.equal(updates.at(-1).status, JOB_STATUS.COMPLETED);
  assert.equal(result.provider, 'local');
  assert.equal(result.audio.type, 'audio/wav');
});

test('generation falls back when the primary provider fails', async () => {
  const primary = { id: 'hosted', generate: async () => { throw new Error('provider offline'); } };
  const service = createGenerationService({ primary, fallback: createLocalProvider({ stageDelay: 0 }) });
  const result = await service.generate(request);
  assert.equal(result.provider, 'local');
});

test('an aborted job stops before audio is returned', async () => {
  const controller = new AbortController();
  controller.abort();
  const service = createGenerationService({ primary: createLocalProvider({ stageDelay: 0 }) });
  await assert.rejects(() => service.generate(request, { signal: controller.signal }), (error) => error.code === 'cancelled');
});
