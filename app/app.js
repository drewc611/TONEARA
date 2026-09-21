import { createGenerationService, createLocalProvider, JOB_STATUS } from './generation-service.mjs';
import { formatTime } from './music-engine.mjs';
import { parseProject, serializeProject } from './project-file.mjs';

import { mergeTracks } from './track-library.mjs';

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
const libraryKey = 'toneara-library-v1';
const libraryLimit = 100;
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

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function getLibrary() {
  try {
    return JSON.parse(localStorage.getItem(libraryKey) || '[]');
  } catch {
    return [];
  }
}

function saveLibrary(items) {
  localStorage.setItem(libraryKey, JSON.stringify(items.slice(0, libraryLimit)));
}

function setLibraryStatus(message, isError = false) {
  const status = $('#libraryStatus');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function renderLibrary() {
  const items = getLibrary();
  $('#libraryEmpty').hidden = items.length > 0;
  $('#clearLibraryBtn').hidden = items.length === 0;
  $('#trackList').innerHTML = items.map((track, index) => `
    <article class="library-track">
      <button class="mini-play" data-play="${index}" aria-label="Play ${escapeHtml(track.name)}">▶</button>
      <div class="library-meta">
        <strong>${escapeHtml(track.name)}</strong>
        <span>${escapeHtml(track.genre)} · ${escapeHtml(track.mood)} · ${track.bpm} BPM · ${formatTime(track.seconds)}</span>
      </div>
      <button class="remix" data-remix="${index}">Open settings</button>
      <button class="delete-track" data-delete="${index}" aria-label="Delete ${escapeHtml(track.name)}">×</button>
    </article>
  `).join('');
}

function saveCurrent(options) {
  const items = getLibrary();
  const item = { ...options, name: options.name || titleFrom(options.prompt), createdAt: Date.now() };
  saveLibrary(mergeTracks([item], items, libraryLimit));
  renderLibrary();
}

function loadSettings(track) {
  promptInput.value = track.prompt;
  characterCount.textContent = `${track.prompt.length} / 180`;
  $('#trackName').value = track.name;
  $('#genre').value = track.genre;
  $('#mood').value = track.mood;
  tempoInput.value = track.bpm;
  tempoValue.textContent = `${track.bpm} BPM`;
  $('#duration').value = track.seconds;
  $('#structure').value = track.structure || 'loop';
  $('#energy').value = track.energy || 'balanced';
  variationInput.value = track.variation || 1;
  variationValue.textContent = String(track.variation || 1).padStart(2, '0');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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

async function generate(save = true) {
  const options = {
    prompt: promptInput.value.trim(),
    name: $('#trackName').value.trim(),
    genre: $('#genre').value,
    mood: $('#mood').value,
    bpm: Number(tempoInput.value),
    seconds: Number($('#duration').value),
    variation: Number(variationInput.value),
    structure: $('#structure').value,
    energy: $('#energy').value,
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
  $('#downloadBtn').href = objectUrl;
  $('#downloadBtn').download = `${(options.name || titleFrom(options.prompt)).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.wav`;
  $('#trackTitle').textContent = options.name || titleFrom(options.prompt);
  $('#durationBadge').textContent = formatTime(options.seconds);
  $('#totalTime').textContent = formatTime(options.seconds);
  const arrangementLabel = { loop: 'Steady loop', build: 'Rising build', versechorus: 'Verse and chorus' }[options.structure];
  $('#trackTags').innerHTML = [options.genre, options.mood, options.energy, arrangementLabel, `${options.bpm} BPM`, `Variation ${options.variation}`]
    .map((value) => `<span>${value[0].toUpperCase() + value.slice(1)}</span>`).join('');
  drawWave(samples);
  $('#progressState').classList.add('hidden');
  $('#playerState').classList.remove('hidden');
  $('#resultCard').setAttribute('aria-busy', 'false');
  $('#statusText').textContent = `Ready to play · ${result.provider} provider`;
  $('#generateBtn').disabled = false;
  $('#generateText').textContent = 'Generate track';
  if (save) saveCurrent(options);
}

form.addEventListener('submit', (event) => { event.preventDefault(); generate(); });
$('#regenerateBtn').addEventListener('click', () => {
  variationInput.value = (Number(variationInput.value) % 12) + 1;
  variationValue.textContent = String(variationInput.value).padStart(2, '0');
  generate();
});
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
$('#trackList').addEventListener('click', (event) => {
  const items = getLibrary();
  const play = event.target.closest('[data-play]');
  const remix = event.target.closest('[data-remix]');
  const remove = event.target.closest('[data-delete]');
  if (play) { loadSettings(items[Number(play.dataset.play)]); generate(false); }
  if (remix) loadSettings(items[Number(remix.dataset.remix)]);
  if (remove) { items.splice(Number(remove.dataset.delete), 1); saveLibrary(items); renderLibrary(); }
});
$('#clearLibraryBtn').addEventListener('click', () => { saveLibrary([]); renderLibrary(); });
$('#exportProjectBtn').addEventListener('click', () => {
  const items = getLibrary();
  if (!items.length) return setLibraryStatus('Generate or import a track before exporting.', true);
  const blob = new Blob([serializeProject(items)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `toneara-project-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setLibraryStatus(`Exported ${items.length} track${items.length === 1 ? '' : 's'}.`);
});
$('#importProjectBtn').addEventListener('click', () => $('#projectFileInput').click());
$('#projectFileInput').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  if (file.size > 1_000_000) return setLibraryStatus('Project files must be smaller than 1 MB.', true);
  try {
    const imported = parseProject(await file.text()).tracks;
    const current = getLibrary();
    const merged = mergeTracks(imported, current, libraryLimit);
    saveLibrary(merged);
    renderLibrary();
    setLibraryStatus(`Imported ${imported.length} track${imported.length === 1 ? '' : 's'}.`);
  } catch (error) {
    setLibraryStatus(error.message || 'Toneara could not import this project.', true);
  }
});
renderLibrary();
