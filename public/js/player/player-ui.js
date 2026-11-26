import { audio, playerState } from './player-state.js';
import {
  loadMix,
  playMix,
  togglePlayback,
  blockSeeking,
  persistPlayerState,
} from './player-core.js';
import { updateMediaSessionMetadata } from './player-media.js';

// --- SVG CONSTANTS ---

const playCircleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
  <path d="m383-310 267-170-267-170v340Zm97 230q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/>
</svg>`;

const pauseCircleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
  <path d="M370-320h60v-320h-60v320Zm160 0h60v-320h-60v320ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/>
</svg>`;

// --- DOM REFS ---
const playBtn     = document.getElementById('play-btn');
const playerIcon  = document.getElementById('player-icon');
const seekEl      = document.getElementById('seek');
const elapsedEl   = document.getElementById('elapsed-time');
const totalEl     = document.getElementById('total-time');
const formatBtn   = document.getElementById('format-toggle');
const downloadBtn = document.getElementById('download-btn');
const mixTitleEl  = document.getElementById('player-mix-title');

// --- HELPERS ---
// Returns the currently loaded mix image wrap, or null
function getLoadedWrap() {
  if (!playerState.loadedMixId) return null;
  return document.querySelector(`.mix-audio-control-zone[data-id="${playerState.loadedMixId}"]`);
}

function getMix(id) {
  return window.mixes[id] || null;
}

// --- PROGRESS UI ---
let draggingSeek = false; // true while the user drags the slider, so playback doesn't move it

export function updateProgressUI(time) {
  if (isNaN(audio.duration)) return;

  const percent = (time / audio.duration) * 100;
  seekEl.max = audio.duration;
  if (!draggingSeek) seekEl.value = time;
  seekEl.style.setProperty('--progress', percent + '%'); // CSS fill
  seekEl.setAttribute('aria-valuetext', `${spokenTime(time)} of ${spokenTime(audio.duration)}`);

  elapsedEl.textContent = formatTime(time);
  totalEl.textContent   = formatTime(audio.duration);
}

// "1 hour 2 minutes 5 seconds": how screen readers should say a time
function spokenTime(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  parts.push(`${s} second${s === 1 ? '' : 's'}`);
  return parts.join(' ');
}

function formatTime(seconds = 0) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// --- FOOTER TITLE ---
function updateFooterTitle(mix) {
  if (!mix) return;
  if (mixTitleEl) mixTitleEl.textContent = `${mix.who} : ${mix.title}`;
  downloadBtn.setAttribute('aria-label', `Download MP3: ${mix.who} : ${mix.title}`);
}

// --- IMAGE OVERLAY ---
// Sets all overlay icons in a given scope to play state (called after page inject)
function initOverlayIcons(scope = document) {
  scope.querySelectorAll('.overlay-play-icon').forEach(svg => {
    svg.innerHTML = playCircleSVG;
  });
}

// Syncs all mix image wraps on the current page to reflect player status
// idle   → no active-mix anywhere
// paused → active-mix + play icon on loaded wrap
// playing → active-mix + pause icon on loaded wrap
function syncImageUI() {
  // Reset all wraps first: play icon, "Play mix …" label
  document.querySelectorAll('.mix-audio-control-zone').forEach(wrap => {
    wrap.classList.remove('active-mix');
    const icon = wrap.querySelector('.overlay-play-icon');
    if (icon) icon.innerHTML = playCircleSVG;
    setCoverLabel(wrap, 'Play');
  });

  if (playerState.status === 'idle') return;

  // Apply state to the loaded wrap if it exists on this page
  const wrap = getLoadedWrap();
  if (!wrap) return;

  const playing = playerState.status === 'playing';
  wrap.classList.add('active-mix');
  const icon = wrap.querySelector('.overlay-play-icon');
  if (icon) icon.innerHTML = playing ? pauseCircleSVG : playCircleSVG;
  setCoverLabel(wrap, playing ? 'Pause' : 'Play');
}

// Screen-reader name for a cover button: says what a click will do
function setCoverLabel(wrap, action) {
  const mix = getMix(wrap.dataset.id);
  if (mix) wrap.setAttribute('aria-label', `${action} mix ${mix.who} : ${mix.title}`);
}

// Updates format toggle button state for the loaded mix
function syncFormatBtn() {
  const mix = getMix(playerState.loadedMixId);
  if (!mix) return;

  if (!mix.formats.flac) {
    playerState.currentFormat = 'mp3';
    formatBtn.textContent = 'MP3';
    formatBtn.disabled = true;
    formatBtn.setAttribute('aria-label', 'Audio format MP3');
  } else {
    const current = playerState.currentFormat.toUpperCase();
    const other = current === 'MP3' ? 'FLAC' : 'MP3';
    formatBtn.disabled = false;
    formatBtn.textContent = current;
    formatBtn.setAttribute('aria-label', `Audio format ${current}, switch to ${other}`);
  }
}

// --- CLICK HANDLERS ---
function bindMixImageClickHandlers() {
  document.querySelectorAll('.mix-audio-control-zone').forEach(wrap => {
    wrap.addEventListener('click', async () => {
      const mix = getMix(wrap.dataset.id);
      if (!mix) return;

      // Same mix — toggle play/pause
      if (playerState.loadedMixId === wrap.dataset.id) {
        togglePlayback();
        return;
      }

      // New mix — load and play
      playerState.currentFormat = 'mp3';
      updateMediaSessionMetadata(mix);
      loadMix(mix);
      updateFooterTitle(mix);
      syncFormatBtn();
      await playMix();
    });
  });
}

// --- AUDIO EVENT LISTENERS ---
audio.addEventListener('loadedmetadata', () => {
  seekEl.disabled = false; // a mix is loaded: the slider can be used
  updateProgressUI(audio.currentTime);
});

audio.addEventListener('timeupdate', () => {
  updateProgressUI(audio.currentTime);

  if ('mediaSession' in navigator && audio.duration) {
    navigator.mediaSession.setPositionState({
      duration:     audio.duration,
      playbackRate: audio.playbackRate,
      position:     audio.currentTime,
    });
  }
});

audio.addEventListener('play', () => {
  playerState.status = 'playing';
  playerIcon.innerHTML = pauseCircleSVG;
  playBtn.setAttribute('aria-label', 'Pause');
  syncImageUI();

  playerState.saveInterval = setInterval(persistPlayerState, 15000);
});

audio.addEventListener('pause', () => {
  playerState.status = 'paused';
  playerIcon.innerHTML = playCircleSVG;
  playBtn.setAttribute('aria-label', 'Play');
  syncImageUI();

  persistPlayerState();
  clearInterval(playerState.saveInterval);
  playerState.saveInterval = null;
});

audio.addEventListener('ended', () => {
  playerState.status = 'paused';
  syncImageUI();

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'none';
  }
});

// --- FOOTER CONTROLS ---
playBtn.addEventListener('click', () => {
  togglePlayback();
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;

  // Space on a button or link already "presses" it; inputs need their own Space.
  // Only act when focus is somewhere neutral (the page, <main>, a tracklist...)
  const el = document.activeElement;
  if (el && (
    el.tagName === 'BUTTON'   ||
    el.tagName === 'A'        ||
    (el.tagName === 'INPUT' && el !== seekEl) || // the seek slider has no Space action of its own
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'   ||
    el.isContentEditable
  )) return;

  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (!audio.src) return;

  e.preventDefault();
  togglePlayback();
});

// --- FORMAT TOGGLE ---
formatBtn.addEventListener('click', async () => {
  if (playerState.status === 'idle') return;
  if (!playerState.seekingAllowed) return;

  const mix = getMix(playerState.loadedMixId);
  if (!mix) return;

  const nextFormat = playerState.currentFormat === 'mp3' ? 'flac' : 'mp3';
  if (!mix.formats[nextFormat]) return;

  const currentTime = audio.currentTime;
  const wasPlaying = playerState.status === 'playing';

  playerState.currentFormat = nextFormat;
  syncFormatBtn(); // button text and label

  loadMix(mix, currentTime);
  if (wasPlaying) await playMix();
  blockSeeking();
});

// --- DOWNLOAD ---
downloadBtn.addEventListener('click', () => {
  if (playerState.status === 'idle') return;

  const mix = getMix(playerState.loadedMixId);
  if (!mix) return;

  const a = document.createElement('a');
  a.href = `/download/${mix.base}`;
  a.download = `${mix.title}.mp3`;
  a.click();
});

// --- SEEK SLIDER ---
// 'input' fires continuously while dragging: move the fill and times, but don't
// seek yet. 'change' fires on release (and on each Home/End key): seek then.
seekEl.addEventListener('input', () => {
  draggingSeek = true;
  updateProgressUI(Number(seekEl.value));
});

seekEl.addEventListener('change', () => {
  draggingSeek = false;
  audio.currentTime = Number(seekEl.value);
  persistPlayerState();
});

// Arrow keys jump 10 seconds, Page Up/Down 1 minute (Home/End: browser default)
seekEl.addEventListener('keydown', (e) => {
  const jumps = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10, PageUp: 60, PageDown: -60 };
  if (!(e.key in jumps) || isNaN(audio.duration)) return;
  e.preventDefault();
  audio.currentTime = Math.min(Math.max(audio.currentTime + jumps[e.key], 0), audio.duration);
  updateProgressUI(audio.currentTime);
});

// --- PAGE CHANGE HANDLER ---
document.addEventListener('player:pagechanged', (e) => {
  const scope = e.detail?.scope || document;

  // Init play icons onto freshly injected DOM
  initOverlayIcons(scope);

  // Re-bind clicks to new elements
  bindMixImageClickHandlers();

  // Sync loaded mix with images (image wraps) on current page
  syncImageUI();

  // Restore footer title if a mix is loaded
  if (playerState.loadedMixId) {
    const mix = getMix(playerState.loadedMixId);
    if (mix) updateFooterTitle(mix);
  }
});

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  playerIcon.innerHTML = playCircleSVG;
  initOverlayIcons(document);
  bindMixImageClickHandlers();

  // Restore saved state from localStorage — no autoplay
  const saved = JSON.parse(localStorage.getItem('playerState'));

  if (saved?.mixId && getMix(saved.mixId)) {
    const mix = getMix(saved.mixId);

    playerState.currentFormat = saved.format || 'mp3';
    playerState.status = 'paused';
    playerState.loadedMixId = saved.mixId;

    loadMix(mix, saved.currentTime || 0);
    updateFooterTitle(mix);
    syncFormatBtn();
    syncImageUI();
  }
});
