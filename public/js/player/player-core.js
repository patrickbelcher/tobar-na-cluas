// Player initialising - check window.mixes object
if (!window.mixes) {
  console.error('(audio)player.js: window.mixes is undefined');
} else {
  console.log('Initialising player.');
  //console.log('Reading mixes JSON:', window.mixes);
}

// --- AUDIO ---
const audio = new Audio();
audio.preload = "metadata";

let currentFormat = "mp3"; // default format
let seekingAllowed = true;
let saveInterval = null;

// --- AUDIO PLAYER CORE FUNCTIONS ---
// Set audio source
function loadMix(mix, startTime = 0) {
  const format = currentFormat;
  const src = `/mixes/${mix.folder}/${mix.formats[format]}`;
  updateMediaSessionMetadata(mix);

  console.log(`Loading mix: ${mix.base}, format: ${currentFormat}, src: ${src}`);

  // Check against currently loaded mix. If new ->
  if (audio.src !== src) {
    audio.src = src;

    // Set SPA global var 
    window.activeMixId = mix.base;

    nowPlaying.innerHTML =
      `playing : <span id="player-mix-title">${mix.title}</span>`;

    progressBar.style.width = '0%';
    elapsedEl.textContent = '0:00';
    totalEl.textContent = '0:00';
  }

  audio.currentTime = startTime;
}

// Audio Play
async function playMix() {
  try {
    await audio.play();
    blockSeeking();
  } catch (err) {
    console.error("Audio play failed:", err);
  }
}

// Play / Pause
function togglePlayback(forceState) {
  if (!audio.src) return;

  const shouldPlay =
    forceState === 'play' ? true :
      forceState === 'pause' ? false :
        audio.paused;

  if (shouldPlay) {
    audio.play();
  } else {
    audio.pause();
  }
}

// localStorage function
function persistPlayerState() {
  if (!window.activeMixId) return;
  if (isNaN(audio.currentTime)) return;

  localStorage.setItem("playerState", JSON.stringify({
    mixId: window.activeMixId,
    format: currentFormat,
    currentTime: audio.currentTime
  }));
}

// Restore active mix based on localStorage
window.restoreActiveMixState = async function () {
  const savedState = JSON.parse(localStorage.getItem("playerState"));
  if (!savedState || !savedState.mixId) return;

  const mixId = savedState.mixId;
  const mix = window.mixes[mixId];
  if (!mix) return;

  // Re-highlight correct image if it exists on the injected page
  const wrap = document.querySelector(`.mix-audio-control-zone[data-id="${mixId}"]`);
  if (wrap) {
    setActiveImage(wrap, !audio.paused);
  }

  // If audio has no source yet, restore it
  if (!audio.src) {
    loadMix(mix, savedState.currentTime || 0);
    await playMix();
  }
};