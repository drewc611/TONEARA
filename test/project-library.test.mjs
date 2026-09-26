import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeProject, addProject, addTrack, createWorkspaceStore, deleteProject,
  LEGACY_LIBRARY_KEY, MAX_PROJECTS, normalizeWorkspace, renameProject,
  selectProject, setProjectArchived, setTracks, WORKSPACE_KEY,
} from '../app/project-library.mjs';

const track = { prompt: 'warm city drive', name: 'Midnight', genre: 'electronic', mood: 'focused', bpm: 96, seconds: 10, variation: 1 };

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    get raw() { return map; },
  };
}

test('a fresh device starts with one usable project', () => {
  const workspace = createWorkspaceStore(fakeStorage()).read();
  assert.equal(workspace.projects.length, 1);
  assert.equal(activeProject(workspace).tracks.length, 0);
  assert.equal(workspace.activeProjectId, workspace.projects[0].id);
});

test('a v1 flat library migrates into a named project', () => {
  const storage = fakeStorage({ [LEGACY_LIBRARY_KEY]: JSON.stringify([track]) });
  const workspace = createWorkspaceStore(storage).read();
  assert.equal(activeProject(workspace).tracks.length, 1);
  assert.equal(activeProject(workspace).tracks[0].prompt, 'warm city drive');
});

test('stored tracks are re-validated, so tampered storage cannot smuggle fields in', () => {
  const tampered = {
    version: 2,
    activeProjectId: 'a',
    projects: [{
      id: 'a',
      name: 'Tampered',
      tracks: [
        { ...track, injected: '<img src=x onerror=alert(1)>' },
        { ...track, genre: 'not-a-genre', variation: 2 },
        { ...track, bpm: 9000, variation: 3 },
        'not an object',
      ],
    }],
  };
  const workspace = createWorkspaceStore(fakeStorage({ [WORKSPACE_KEY]: JSON.stringify(tampered) })).read();
  const tracks = activeProject(workspace).tracks;
  assert.equal(tracks.length, 1, 'entries failing the generation contract are dropped');
  assert.equal('injected' in tracks[0], false, 'unknown fields never reach storage');
});

test('unreadable storage degrades to an empty workspace instead of throwing', () => {
  const hostile = { getItem() { throw new Error('blocked'); }, setItem() {} };
  assert.equal(createWorkspaceStore(hostile).read().projects.length, 1);
  const corrupt = fakeStorage({ [WORKSPACE_KEY]: '{not json' });
  assert.equal(createWorkspaceStore(corrupt).read().projects.length, 1);
});

test('projects can be created, renamed, archived, restored, and deleted', () => {
  let workspace = createWorkspaceStore(fakeStorage()).read();
  workspace = addProject(workspace, '  Film  cues  ');
  assert.equal(activeProject(workspace).name, 'Film cues', 'whitespace is collapsed');
  assert.equal(workspace.projects.length, 2);

  const id = activeProject(workspace).id;
  workspace = renameProject(workspace, id, 'Trailer beds');
  assert.equal(activeProject(workspace).name, 'Trailer beds');

  workspace = setProjectArchived(workspace, id, true);
  assert.equal(workspace.projects.find((p) => p.id === id).archived, true);
  assert.notEqual(workspace.activeProjectId, id, 'archiving moves focus to an open project');

  workspace = setProjectArchived(workspace, id, false);
  workspace = deleteProject(workspace, id);
  assert.equal(workspace.projects.some((p) => p.id === id), false);
});

test('deleting the last project leaves a usable empty one', () => {
  let workspace = createWorkspaceStore(fakeStorage()).read();
  workspace = deleteProject(workspace, workspace.projects[0].id);
  assert.equal(workspace.projects.length, 1);
  assert.equal(workspace.projects[0].tracks.length, 0);
});

test('project and track counts are bounded', () => {
  let workspace = createWorkspaceStore(fakeStorage()).read();
  while (workspace.projects.length < MAX_PROJECTS) workspace = addProject(workspace, 'Filler');
  assert.throws(() => addProject(workspace, 'One too many'), /up to 24 projects/);

  const id = workspace.projects[0].id;
  const many = Array.from({ length: 140 }, (unused, index) => ({ ...track, variation: (index % 12) + 1 }));
  assert.equal(activeProject(setTracks(workspace, id, many)).tracks.length <= 100, true);
});

test('adding a track replaces the same prompt and variation instead of duplicating it', () => {
  let workspace = createWorkspaceStore(fakeStorage()).read();
  const id = activeProject(workspace).id;
  workspace = addTrack(workspace, id, track);
  workspace = addTrack(workspace, id, { ...track, name: 'Renamed' });
  const tracks = activeProject(workspace).tracks;
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].name, 'Renamed');
});

test('selecting an unknown project is ignored', () => {
  const workspace = createWorkspaceStore(fakeStorage()).read();
  assert.equal(selectProject(workspace, 'nope').activeProjectId, workspace.activeProjectId);
});

test('a workspace with no usable projects is rebuilt', () => {
  assert.equal(normalizeWorkspace({ version: 2, projects: [] }).projects.length, 1);
  assert.equal(normalizeWorkspace(null).projects.length, 1);
});

test('a full device surfaces a readable error', () => {
  const full = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
  const store = createWorkspaceStore(full);
  assert.throws(() => store.write(store.read()), /no room left/);
});
