import { createGenerationRequest, GenerationError } from './generation-service.mjs';

export const PROJECT_SCHEMA = 'toneara.project';
export const PROJECT_VERSION = 1;
export const MAX_PROJECT_TRACKS = 100;

function normalizeTrack(track) {
  const request = createGenerationRequest(track);
  return {
    ...request,
    name: request.name.slice(0, 48),
    createdAt: Number.isFinite(Number(track.createdAt)) ? Number(track.createdAt) : Date.now(),
  };
}

export function createProjectDocument(tracks, { exportedAt = new Date().toISOString() } = {}) {
  if (!Array.isArray(tracks)) throw new GenerationError('Project tracks must be a list.', 'invalid_project');
  if (tracks.length > MAX_PROJECT_TRACKS) throw new GenerationError(`Projects can contain up to ${MAX_PROJECT_TRACKS} tracks.`, 'project_too_large');
  return {
    schema: PROJECT_SCHEMA,
    version: PROJECT_VERSION,
    exportedAt,
    tracks: tracks.map(normalizeTrack),
  };
}

export function serializeProject(tracks, options) {
  return `${JSON.stringify(createProjectDocument(tracks, options), null, 2)}\n`;
}

export function parseProject(text) {
  let document;
  try {
    document = JSON.parse(String(text));
  } catch {
    throw new GenerationError('This is not a valid Toneara project file.', 'invalid_project_json');
  }
  if (document?.schema !== PROJECT_SCHEMA) throw new GenerationError('This file is not a Toneara project.', 'invalid_project_schema');
  if (document.version !== PROJECT_VERSION) throw new GenerationError(`Toneara project version ${document.version} is not supported.`, 'unsupported_project_version');
  return createProjectDocument(document.tracks, { exportedAt: document.exportedAt });
}
