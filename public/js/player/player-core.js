import { audio, playerState } from './player-state.js';

// --- LOAD & PLAYBACK ---

export function loadMix(mix, startTime = 0) {
  const src = `/mixes/${mix.folder}/${mix.formats[playerState.currentFormat]}`;

  if (audio.src !== src) {
    audio.src = src;
  }

  audio.currentTime = startTime;
  playerState.loadedMixId = mix.base;
}

export async function playMix() {
  try {
    await audio.play();
    blockSeeking();
  } catch (err) {
    console.error('Audio play failed:', err);
  }
}

export function pauseMix() {
  audio.pause();
}

export function togglePlayback(forceState) {
  if (!audio.src) return;

  const shouldPlay =
    forceState === 'play'  ? true  :
    forceState === 'pause' ? false :
    audio.paused;

  if (shouldPlay) playMix();
  else pauseMix();
}

// --- SEEKING ---

export function blockSeeking() {
  playerState.seekingAllowed = false;
  setTimeout(() => { playerState.seekingAllowed = true; }, 250);
}

// --- PERSISTENCE ---

export function persistPlayerState() {
  if (!playerState.loadedMixId) return;
  if (isNaN(audio.currentTime)) return;

  localStorage.setItem('playerState', JSON.stringify({
    mixId:       playerState.loadedMixId,
    format:      playerState.currentFormat,
    currentTime: audio.currentTime,
  }));
}
