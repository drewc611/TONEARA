import { createGenerationRequest, GenerationError } from './generation-service.mjs';

export const WORKSPACE_KEY = 'toneara-workspace-v2';
export const LEGACY_LIBRARY_KEY = 'toneara-library-v1';
export const WORKSPACE_VERSION = 2;
export const MAX_PROJECTS = 24;
export const MAX_TRACKS_PER_PROJECT = 100;
export const MAX_PROJECT_NAME = 60;

const DEFAULT_PROJECT_NAME = 'First project';

function identifier() {
  const random = globalThis.crypto?.randomUUID?.();
  return random || `project-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function normalizeProjectName(value, fallback = DEFAULT_PROJECT_NAME) {
  const name = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROJECT_NAME);
  return name || fallback;
}

/**
 * Re-validates a stored track through the generation contract. Anything that no
 * longer satisfies the contract is dropped rather than repaired, so tampered or
 * corrupted local storage cannot reintroduce unvalidated fields.
 */
export function normalizeStoredTrack(track) {
  if (!track || typeof track !== 'object') return null;
  try {
    const request = createGenerationRequest(track);
    return {
      ...request,
      name: request.name.slice(0, 48),
      createdAt: Number.isFinite(Number(track.createdAt)) ? Number(track.createdAt) : Date.now(),
    };
  } catch {
    return null;
  }
}

export function normalizeTracks(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks.map(normalizeStoredTrack).filter(Boolean).slice(0, MAX_TRACKS_PER_PROJECT);
}

function normalizeProject(project, index) {
  if (!project || typeof project !== 'object') return null;
  const createdAt = Number.isFinite(Number(project.createdAt)) ? Number(project.createdAt) : Date.now();
  return {
    id: typeof project.id === 'string' && project.id ? project.id.slice(0, 64) : identifier(),
    name: normalizeProjectName(project.name, `Project ${index + 1}`),
    createdAt,
    updatedAt: Number.isFinite(Number(project.updatedAt)) ? Number(project.updatedAt) : createdAt,
    archived: project.archived === true,
    tracks: normalizeTracks(project.tracks),
  };
}

export function createProject(name) {
  const now = Date.now();
  return { id: identifier(), name: normalizeProjectName(name), createdAt: now, updatedAt: now, archived: false, tracks: [] };
}

function emptyWorkspace() {
  const project = createProject(DEFAULT_PROJECT_NAME);
  return { version: WORKSPACE_VERSION, activeProjectId: project.id, projects: [project] };
}

export function normalizeWorkspace(candidate) {
  if (!candidate || typeof candidate !== 'object') return emptyWorkspace();
  const projects = Array.isArray(candidate.projects)
    ? candidate.projects.map(normalizeProject).filter(Boolean).slice(0, MAX_PROJECTS)
    : [];
  if (!projects.length) return emptyWorkspace();
  const active = projects.find((project) => project.id === candidate.activeProjectId)
    || projects.find((project) => !project.archived)
    || projects[0];
  return { version: WORKSPACE_VERSION, activeProjectId: active.id, projects };
}

/** Folds a v1 flat track array into a single named project. */
export function migrateLegacyLibrary(tracks) {
  const workspace = emptyWorkspace();
  workspace.projects[0].tracks = normalizeTracks(tracks);
  return workspace;
}

export function createWorkspaceStore(storage) {
  function read() {
    let raw = null;
    try {
      raw = storage?.getItem(WORKSPACE_KEY);
    } catch {
      return emptyWorkspace();
    }

    if (!raw) {
      let legacy = null;
      try {
        legacy = storage?.getItem(LEGACY_LIBRARY_KEY);
      } catch {
        legacy = null;
      }
      if (!legacy) return emptyWorkspace();
      try {
        return migrateLegacyLibrary(JSON.parse(legacy));
      } catch {
        return emptyWorkspace();
      }
    }

    try {
      return normalizeWorkspace(JSON.parse(raw));
    } catch {
      return emptyWorkspace();
    }
  }

  function write(workspace) {
    const normalized = normalizeWorkspace(workspace);
    try {
      storage?.setItem(WORKSPACE_KEY, JSON.stringify(normalized));
    } catch (error) {
      throw new GenerationError('This device has no room left to save tracks.', 'storage_full', { cause: error });
    }
    return normalized;
  }

  return { read, write };
}

export function activeProject(workspace) {
  return workspace.projects.find((project) => project.id === workspace.activeProjectId) || workspace.projects[0];
}

function touch(project) {
  return { ...project, updatedAt: Date.now() };
}

function replaceProject(workspace, id, transform) {
  const projects = workspace.projects.map((project) => (project.id === id ? touch(transform(project)) : project));
  return normalizeWorkspace({ ...workspace, projects });
}

export function addProject(workspace, name) {
  if (workspace.projects.length >= MAX_PROJECTS) {
    throw new GenerationError(`Toneara keeps up to ${MAX_PROJECTS} projects on this device.`, 'too_many_projects');
  }
  const project = createProject(name);
  return normalizeWorkspace({ ...workspace, activeProjectId: project.id, projects: [project, ...workspace.projects] });
}

export function renameProject(workspace, id, name) {
  return replaceProject(workspace, id, (project) => ({ ...project, name: normalizeProjectName(name, project.name) }));
}

export function setProjectArchived(workspace, id, archived) {
  const next = replaceProject(workspace, id, (project) => ({ ...project, archived: archived === true }));
  const active = next.projects.find((project) => project.id === next.activeProjectId);
  if (!active?.archived) return next;
  const open = next.projects.find((project) => !project.archived);
  return normalizeWorkspace({ ...next, activeProjectId: open ? open.id : next.activeProjectId });
}

export function deleteProject(workspace, id) {
  const projects = workspace.projects.filter((project) => project.id !== id);
  if (!projects.length) return emptyWorkspace();
  return normalizeWorkspace({ ...workspace, activeProjectId: projects[0].id, projects });
}

export function selectProject(workspace, id) {
  if (!workspace.projects.some((project) => project.id === id)) return workspace;
  return normalizeWorkspace({ ...workspace, activeProjectId: id });
}

export function setTracks(workspace, id, tracks) {
  return replaceProject(workspace, id, (project) => ({ ...project, tracks: normalizeTracks(tracks) }));
}

export function addTrack(workspace, id, track) {
  const normalized = normalizeStoredTrack(track);
  if (!normalized) throw new GenerationError('This track could not be saved.', 'invalid_track');
  return replaceProject(workspace, id, (project) => ({
    ...project,
    tracks: [normalized, ...project.tracks.filter((existing) =>
      !(existing.prompt === normalized.prompt && existing.variation === normalized.variation))],
  }));
}
