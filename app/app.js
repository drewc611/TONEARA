import { createGenerationService, createLocalProvider, JOB_STATUS } from './generation-service.mjs';
import { describeWaveform, formatTime } from './music-engine.mjs';
import { parseProject, serializeProject } from './project-file.mjs';
import {
  activeProject, addProject, addTrack, createWorkspaceStore, deleteProject,
  MAX_PROJECT_NAME, renameProject, selectProject, setProjectArchived, setTracks,
} from './project-library.mjs';

const $ = (selector) => document.querySelector(selector);
const form = $('#musicForm');
const promptInput = $('#prompt');
const characterCount = $('#charCount');
const tempoInput = $('#tempo');
const tempoValue = $('#tempoValue');
const variationInput = $('#variation');
const variationValue = $('#variationValue');
const audio = $('#audioPlayer');
const playButton = $('#playBtn');
const seekBar = $('#seekBar');
const projectSelect = $('#projectSelect');

const store = createWorkspaceStore(globalThis.localStorage);
let workspace = store.read();
let objectUrl = null;
let activeController = null;
const generationService = createGenerationService({ primary: createLocalProvider() });
let installPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  $('#installBtn').hidden = false;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  $('#installBtn').hidden = true;
});

$('#installBtn').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  $('#installBtn').hidden = true;
});

promptInput.addEventListener('input', () => {
  characterCount.textContent = `${promptInput.value.length} / 180`;
});
tempoInput.addEventListener('input', () => {
  tempoValue.textContent = `${tempoInput.value} BPM`;
});
variationInput.addEventListener('input', () => {
  variationValue.textContent = String(variationInput.value).padStart(2, '0');
});

function titleFrom(text) {
  const clean = text.trim().split(/\s+/).slice(0, 5).join(' ');
  return clean ? clean.replace(/\b\w/g, (match) => match.toUpperCase()) : 'New Session';
}

function element(tag, properties = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('aria-')) node.setAttribute(key, value);
    else node[key] = value;
  }
  for (const child of children) node.append(child);
  return node;
}

function commit(next) {
  workspace = store.write(next);
  render();
}

function setLibraryStatus(message, isError = false) {
  const status = $('#libraryStatus');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

// --- Projects ----------------------------------------------------------------

function renderProjectSelect() {
  const current = activeProject(workspace);
  projectSelect.replaceChildren(...workspace.projects.map((project) => element('option', {
    value: project.id,
    textContent: project.archived ? `${project.name} (archived)` : project.name,
    selected: project.id === current.id,
  })));
  $('#archivedNote').hidden = !current.archived;
  $('#archiveProjectBtn').textContent = current.archived ? 'Restore' : 'Archive';
  $('#deleteProjectBtn').disabled = workspace.projects.length === 1 && current.tracks.length === 0;
}

projectSelect.addEventListener('change', () => commit(selectProject(workspace, projectSelect.value)));

$('#newProjectBtn').addEventListener('click', () => {
  const name = window.prompt('Name this project', 'Untitled project');
  if (name === null) return;
  try {
    commit(addProject(workspace, name.slice(0, MAX_PROJECT_NAME)));
    setLibraryStatus(`Created ${activeProject(workspace).name}.`);
  } catch (error) {
    setLibraryStatus(error.message, true);
  }
});

$('#renameProjectBtn').addEventListener('click', () => {
  const current = activeProject(workspace);
  const name = window.prompt('Rename this project', current.name);
  if (name === null) return;
  commit(renameProject(workspace, current.id, name.slice(0, MAX_PROJECT_NAME)));
  setLibraryStatus(`Renamed to ${activeProject(workspace).name}.`);
});

$('#archiveProjectBtn').addEventListener('click', () => {
  const current = activeProject(workspace);
  commit(setProjectArchived(workspace, current.id, !current.archived));
  setLibraryStatus(current.archived ? `Restored ${current.name}.` : `Archived ${current.name}.`);
});

$('#deleteProjectBtn').addEventListener('click', () => {
  const current = activeProject(workspace);
  const summary = current.tracks.length === 1 ? '1 track' : `${current.tracks.length} tracks`;
  if (!window.confirm(`Delete "${current.name}" and its ${summary}? This cannot be undone.`)) return;
  commit(deleteProject(workspace, current.id));
  setLibraryStatus('Project deleted.');
});

// --- Library -----------------------------------------------------------------

function renderLibrary() {
  const project = activeProject(workspace);
  const tracks = project.tracks;
  $('#libraryEmpty').hidden = tracks.length > 0;
  $('#clearLibraryBtn').hidden = tracks.length === 0;
  $('#libraryTitle').textContent = `${project.name} · ${tracks.length === 1 ? '1 track' : `${tracks.length} tracks`}`;

  $('#trackList').replaceChildren(...tracks.map((track, index) => element('article', { className: 'library-track' }, [
    element('button', {
      className: 'mini-play', type: 'button', textContent: '▶',
      dataset: { play: String(index) }, 'aria-label': `Play ${track.name}`,
    }),
    element('div', { className: 'library-meta' }, [
      element('strong', { textContent: track.name }),
      element('span', { textContent: `${track.genre} · ${track.mood} · ${track.bpm} BPM · ${formatTime(track.seconds)}` }),
    ]),
    element('button', {
      className: 'remix', type: 'button', textContent: 'Open settings',
      dataset: { remix: String(index) }, 'aria-label': `Open settings for ${track.name}`,
    }),
    element('button', {
      className: 'delete-track', type: 'button', textContent: '×',
      dataset: { delete: String(index) }, 'aria-label': `Delete ${track.name}`,
    }),
  ])));
}

function render() {
  renderProjectSelect();
  renderLibrary();
}

function trackAt(index) {
  const tracks = activeProject(workspace).tracks;
  return Number.isInteger(index) && index >= 0 && index < tracks.length ? tracks[index] : null;
}

function loadSettings(track) {
  if (!track) return;
  promptInput.value = track.prompt;
  characterCount.textContent = `${track.prompt.length} / 180`;
  $('#trackName').value = track.name;
  $('#genre').value = track.genre;
  $('#mood').value = track.mood;
  tempoInput.value = track.bpm;
  tempoValue.textContent = `${track.bpm} BPM`;
  $('#duration').value = track.seconds;
  variationInput.value = track.variation || 1;
  variationValue.textContent = String(track.variation || 1).padStart(2, '0');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Waveform ----------------------------------------------------------------

function renderSectionMarkers(samples, seconds, sliceCount = 6) {
  const markers = $('#sectionMarkers');
  markers.replaceChildren(...Array.from({ length: sliceCount }, (unused, slice) => {
    const at = (slice * seconds) / sliceCount;
    return element('li', {}, [element('button', {
      type: 'button', className: 'section-marker', textContent: formatTime(at),
      dataset: { seek: String(at) }, 'aria-label': `Jump to ${formatTime(at)}`,
    })]);
  }));
}

$('#sectionMarkers').addEventListener('click', (event) => {
  const marker = event.target.closest('[data-seek]');
  if (!marker || !audio.duration) return;
  audio.currentTime = Math.min(audio.duration, Number(marker.dataset.seek));
});

function drawWave(samples) {
  const canvas = $('#waveform');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#ffb23e';
  context.lineWidth = 2;
  context.beginPath();
  const step = Math.ceil(samples.length / canvas.width);
  for (let x = 0; x < canvas.width; x += 1) {
    let maximum = 0;
    for (let offset = 0; offset < step; offset += 1) maximum = Math.max(maximum, Math.abs(samples[x * step + offset] || 0));
    const height = maximum * canvas.height * 0.43;
    context.moveTo(x, canvas.height / 2 - height);
    context.lineTo(x, canvas.height / 2 + height);
  }
  context.stroke();
}

// --- Generation --------------------------------------------------------------

function fileStem(options) {
  return (options.name || titleFrom(options.prompt)).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'toneara-track';
}

async function generate(save = true) {
  const options = {
    prompt: promptInput.value.trim(),
    name: $('#trackName').value.trim(),
    genre: $('#genre').value,
    mood: $('#mood').value,
    bpm: Number(tempoInput.value),
    seconds: Number($('#duration').value),
    variation: Number(variationInput.value),
  };
  if (!options.prompt) return promptInput.focus();

  activeController?.abort();
  activeController = new AbortController();
  $('#emptyState').classList.add('hidden');
  $('#playerState').classList.add('hidden');
  $('#progressState').classList.remove('hidden');
  $('#resultCard').setAttribute('aria-busy', 'true');
  $('#generateBtn').disabled = true;
  $('#generateText').textContent = 'Generating…';
  $('#statusText').textContent = 'Building your track';

  let result;
  try {
    result = await generationService.generate(options, {
      signal: activeController.signal,
      onUpdate: (job) => {
        if (job.status === JOB_STATUS.QUEUED || job.status === JOB_STATUS.PROCESSING) {
          $('#progressTitle').textContent = job.title;
          $('#progressDetail').textContent = job.detail;
          $('#progressBar').style.width = `${job.progress || 0}%`;
          $('#statusText').textContent = job.status === JOB_STATUS.QUEUED ? 'Queued' : `Generating with ${job.provider}`;
        }
      },
    });
  } catch (error) {
    if (error.code === 'cancelled') return;
    $('#progressState').classList.add('hidden');
    $('#emptyState').classList.remove('hidden');
    $('#emptyState h3').textContent = 'Generation failed';
    $('#emptyState p').textContent = error.message;
    $('#statusText').textContent = 'Try again';
    $('#resultCard').setAttribute('aria-busy', 'false');
    $('#generateBtn').disabled = false;
    $('#generateText').textContent = 'Generate track';
    return;
  }

  const { samples, audio: blob } = result;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  audio.src = objectUrl;

  const stem = fileStem(options);
  $('#downloadBtn').href = objectUrl;
  $('#downloadBtn').download = `${stem}.wav`;
  $('#trackTitle').textContent = options.name || titleFrom(options.prompt);
  $('#durationBadge').textContent = formatTime(options.seconds);
  $('#totalTime').textContent = formatTime(options.seconds);
  $('#trackTags').replaceChildren(...[options.genre, options.mood, `${options.bpm} BPM`, `Variation ${options.variation}`]
    .map((value) => element('span', { textContent: value[0].toUpperCase() + value.slice(1) })));

  drawWave(samples);
  $('#waveformDescription').textContent = describeWaveform(samples, options.seconds);
  $('#waveform').setAttribute('aria-label', `Waveform for ${options.name || titleFrom(options.prompt)}`);
  renderSectionMarkers(samples, options.seconds);

  $('#progressState').classList.add('hidden');
  $('#playerState').classList.remove('hidden');
  $('#resultCard').setAttribute('aria-busy', 'false');
  $('#statusText').textContent = `Ready to play · ${result.provider} provider`;
  $('#generateBtn').disabled = false;
  $('#generateText').textContent = 'Generate track';

  if (!save) return;
  const project = activeProject(workspace);
  if (project.archived) return setLibraryStatus('This project is archived, so the track was not saved.', true);
  try {
    commit(addTrack(workspace, project.id, { ...options, name: options.name || titleFrom(options.prompt), createdAt: Date.now() }));
  } catch (error) {
    setLibraryStatus(error.message, true);
  }
}

form.addEventListener('submit', (event) => { event.preventDefault(); generate(); });
$('#regenerateBtn').addEventListener('click', () => {
  variationInput.value = (Number(variationInput.value) % 12) + 1;
  variationValue.textContent = String(variationInput.value).padStart(2, '0');
  generate();
});

// --- Transport ---------------------------------------------------------------

playButton.addEventListener('click', () => { if (audio.paused) audio.play(); else audio.pause(); });
audio.addEventListener('play', () => { playButton.textContent = '❚❚'; playButton.setAttribute('aria-label', 'Pause track'); });
audio.addEventListener('pause', () => { playButton.textContent = '▶'; playButton.setAttribute('aria-label', 'Play track'); });
audio.addEventListener('ended', () => { playButton.textContent = '▶'; playButton.setAttribute('aria-label', 'Play track'); });
audio.addEventListener('timeupdate', () => {
  $('#currentTime').textContent = formatTime(audio.currentTime);
  seekBar.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
  seekBar.setAttribute('aria-valuetext', `${formatTime(audio.currentTime)} of ${formatTime(audio.duration || 0)}`);
});
seekBar.addEventListener('input', () => { if (audio.duration) audio.currentTime = (Number(seekBar.value) / 1000) * audio.duration; });

const nudge = (offset) => {
  if (!audio.duration) return;
  audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + offset));
};
$('#skipBackBtn').addEventListener('click', () => nudge(-5));
$('#skipForwardBtn').addEventListener('click', () => nudge(5));

// --- Downloads ---------------------------------------------------------------

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// --- Track list and project files -------------------------------------------

$('#trackList').addEventListener('click', (event) => {
  const play = event.target.closest('[data-play]');
  const remix = event.target.closest('[data-remix]');
  const remove = event.target.closest('[data-delete]');
  if (play) {
    const track = trackAt(Number(play.dataset.play));
    if (track) { loadSettings(track); generate(false); }
  }
  if (remix) loadSettings(trackAt(Number(remix.dataset.remix)));
  if (remove) {
    const index = Number(remove.dataset.delete);
    if (!trackAt(index)) return;
    const project = activeProject(workspace);
    const tracks = project.tracks.slice();
    tracks.splice(index, 1);
    commit(setTracks(workspace, project.id, tracks));
  }
});

$('#clearLibraryBtn').addEventListener('click', () => {
  const project = activeProject(workspace);
  if (!window.confirm(`Remove every track from "${project.name}"?`)) return;
  commit(setTracks(workspace, project.id, []));
});

$('#exportProjectBtn').addEventListener('click', () => {
  const project = activeProject(workspace);
  if (!project.tracks.length) return setLibraryStatus('Generate or import a track before exporting.', true);
  const filename = `${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'toneara-project'}-${new Date().toISOString().slice(0, 10)}.json`;
  saveBlob(new Blob([serializeProject(project.tracks)], { type: 'application/json' }), filename);
  setLibraryStatus(`Exported ${project.tracks.length} track${project.tracks.length === 1 ? '' : 's'}.`);
});

$('#importProjectBtn').addEventListener('click', () => $('#projectFileInput').click());
$('#projectFileInput').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  if (file.size > 1_000_000) return setLibraryStatus('Project files must be smaller than 1 MB.', true);
  try {
    const imported = parseProject(await file.text()).tracks;
    const project = activeProject(workspace);
    const merged = [...imported, ...project.tracks].filter((track, index, all) =>
      index === all.findIndex((candidate) => candidate.prompt === track.prompt && candidate.variation === track.variation));
    commit(setTracks(workspace, project.id, merged));
    setLibraryStatus(`Imported ${imported.length} track${imported.length === 1 ? '' : 's'} into ${project.name}.`);
  } catch (error) {
    setLibraryStatus(error.message || 'Toneara could not import this project.', true);
  }
});

render();
