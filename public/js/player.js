// Player initialising - check window.mixes object
if (!window.mixes) {
  console.error('(audio)player.js: window.mixes is undefined');
} else {
  console.log('Initialising player.');
  //console.log('Reading mixes JSON:', window.mixes);
}

// DOM
const playBtn = document.getElementById('play-btn');
const playerIcon = document.getElementById('player-icon');
const progressBar = document.getElementById('progress-bar');
const elapsedEl = document.getElementById('elapsed-time');
const totalEl = document.getElementById('total-time');
const imageWraps = document.querySelectorAll('.mix-audio-control-zone');
const nowPlaying = document.getElementById('current-track');
const downloadBtn = document.getElementById("download-btn");
const formatBtn = document.getElementById('format-toggle');

// INLINE SVG CONSTANTS
const playCircleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
  <path d="m383-310 267-170-267-170v340Zm97 230q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/>
</svg>`;

const pauseCircleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
  <path d="M370-320h60v-320h-60v320Zm160 0h60v-320h-60v320ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/>
</svg>`;

// --- CONSTANTS ---
let activeImage = null;
let currentFormat = "mp3"; // default format
let seekingAllowed = true;
let saveInterval = null;

// --- AUDIO ---
const audio = new Audio();
audio.preload = "metadata";

// --- INIT AUDIO PLAYER + PAGE ---

// Set player icon
playerIcon.innerHTML = playCircleSVG;

// set mix image icons
initOverlayIcons(document);

function initOverlayIcons(scope = document) {
  scope.querySelectorAll('.overlay-play-icon').forEach(svg => {
    svg.innerHTML = playCircleSVG;
  });
}

// Recall saved / persistent state
const savedState = JSON.parse(localStorage.getItem("playerState"));

if (savedState?.mixId && window.mixes[savedState.mixId]) {
  const mix = window.mixes[savedState.mixId];

  loadMix(mix, savedState.currentTime || 0);

  const wrap = document.querySelector(
    `.mix-audio-control-zone[data-id="${savedState.mixId}"]`
  );

  if (wrap) {
    setActiveImage(wrap, false);
  }
}

// --- HELPERS ---

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

// --- MEDIA SESSION SETUP ---
if ('mediaSession' in navigator) {

  navigator.mediaSession.setActionHandler('play', async () => {
    togglePlayback('play');
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    togglePlayback('pause');
  });

  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (!audio.duration || isNaN(details.seekTime)) return;

    // Clamp
    const time = Math.min(
      Math.max(details.seekTime, 0),
      audio.duration
    );

    audio.currentTime = time;

    // Keep your UI in sync
    updateProgressUI(time);
    persistPlayerState();
  });

  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    const offset = details.seekOffset || 10;
    audio.currentTime = Math.max(audio.currentTime - offset, 0);
  });

  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    const offset = details.seekOffset || 10;
    audio.currentTime = Math.min(audio.currentTime + offset, audio.duration);
  });
}

// Media Session maintain
function updateMediaSessionMetadata(mix) {
  if (!('mediaSession' in navigator) || !mix) return;

  // only include artwork if image exists
  const artwork = mix.image
    ? [
      {
        src: new URL(`/mixes/${mix.folder}/${mix.image}`, window.location.origin).href,
        sizes: '512x512',
        type: 'image/png'
      }
    ]
    : []; // fallback empty array

  navigator.mediaSession.metadata = new MediaMetadata({
    title: mix.title || 'Unknown title',
    artist: mix.who || 'Tobar na Cluas',
    album: 'Tobar na Cluas',
    artwork: artwork
  });
}

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

// Progress bar
function updateProgressUI(time) {
  if (isNaN(audio.duration)) return;

  const percent = (time / audio.duration) * 100;
  progressBar.style.width = percent + '%';

  elapsedEl.textContent = formatTime(time);
  totalEl.textContent = formatTime(audio.duration);
}

function formatTime(seconds = 0) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
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

// --- MIX-IMAGE FUNCTIONS ---
// Click on a mix-image event handlers
imageWraps.forEach(wrap => {
  wrap.addEventListener('click', async () => {

    // If active mix image clicked -> toggle
    if (activeImage === wrap) {
      if (audio.paused) audio.play();
      else audio.pause();
      return;
    }

    const id = wrap.dataset.id;
    const mix = window.mixes[id];
    console.log('Clicked mix image, data-id:', id, 'Mix object:', mix);
    if (!mix) {
      console.log('Mix not found');
      return;
    }

    // Otherwise switch tracks
    setActiveImage(wrap, true);
    loadMix(mix);
    await playMix();
  });
});

// Update image overlay for active mix
function setActiveImage(wrap, isPlaying) {

  if (activeImage && activeImage !== wrap) {
    activeImage.classList.remove("active-mix");

    const prevIcon = activeImage.querySelector('.overlay-play-icon');
    if (prevIcon) prevIcon.innerHTML = playCircleSVG;
  }

  activeImage = wrap;
  wrap.classList.add("active-mix");

  const icon = wrap.querySelector('.overlay-play-icon');
  if (icon) icon.innerHTML = isPlaying ? pauseCircleSVG : playCircleSVG;

  // --- Update format toggle button ---
  const mixId = wrap.dataset.id;
  const mix = window.mixes[mixId];
  if (!mix) return;

  // If only mp3 exists, force mp3 and disable toggle
  if (!mix.formats.flac) {
    currentFormat = "mp3";
    formatBtn.textContent = "MP3";
    formatBtn.disabled = true;

  } else {
    // FLAC available → enable toggle
    formatBtn.disabled = false;
    formatBtn.title = "";
  }
}

// --- GLOBAL HELPERS ---
function blockSeeking() {
  seekingAllowed = false;
  console.log('Block seeking')
  setTimeout(() => seekingAllowed = true, 250);
}

// --- EVENT LISTENERS ---

// UI metadata updates
audio.addEventListener('loadedmetadata', () => {
  updateProgressUI(audio.currentTime);
});

// FOOTER: Play/Pause button
playBtn.addEventListener('click', () => {
  togglePlayback();
});

// Play
audio.addEventListener('play', () => {
  playerIcon.innerHTML = pauseCircleSVG;

  if (activeImage) {
    const icon = activeImage.querySelector('.overlay-play-icon');
    if (icon) icon.innerHTML = pauseCircleSVG;
    activeImage.classList.add("active-mix");
  }

  // MediaSession 
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing';
  }

  saveInterval = setInterval(persistPlayerState, 15000);
});

// Pause
audio.addEventListener('pause', () => {
  playerIcon.innerHTML = playCircleSVG;

  if (activeImage) {
    const icon = activeImage.querySelector('.overlay-play-icon');
    if (icon) icon.innerHTML = playCircleSVG;
  }

  // MediaSession
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }

  persistPlayerState();
  clearInterval(saveInterval);
});

// Ended
audio.addEventListener('ended', () => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'none';
  }
});

audio.addEventListener('timeupdate', () => {
  updateProgressUI(audio.currentTime);

  if ('mediaSession' in navigator && audio.duration) {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: audio.currentTime
    });
  }
});

// Keyboard play / pause
document.addEventListener('keydown', (e) => {
  // Only spacebar
  if (e.code !== 'Space') return;

  // Don’t interfere with typing
  const el = document.activeElement;
  if (
    el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable)
  ) {
    return;
  }

  // Ignore modifier keys
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

  // Only if audio is loaded
  if (!audio.src) return;

  e.preventDefault(); // stop page scroll

  togglePlayback();
});


// --- CLICK / DRAG SEEK SETUP ---
const progressWrapper = document.querySelector('.progress-wrapper');

if (progressWrapper) {

  function disableUserSelect() {
    document.body.style.userSelect = 'none';
  }

  function enableUserSelect() {
    document.body.style.userSelect = '';
  }

  function seekTo(e) {
    if (!audio.src || isNaN(audio.duration)) return;
    if (!seekingAllowed) return;

    const rect = progressWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);

    // update audio
    audio.currentTime = percent * audio.duration;

    // update UI instantly
    progressBar.style.width = (percent * 100) + '%';
    blockSeeking();
  }

  // Mouse
  let dragging = false;

  progressWrapper.addEventListener('mousedown', (e) => {
    if (!seekingAllowed) return; // block rapid seeking
    dragging = true;
    disableUserSelect();
    progressWrapper.classList.add('dragging');
    seekTo(e);
    blockSeeking();
  });

  document.addEventListener('mousemove', (e) => {
    if (dragging) seekTo(e);
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      enableUserSelect();
      progressWrapper.classList.remove('dragging');
      persistPlayerState();
    }
  });

  // Touch
  progressWrapper.addEventListener('touchstart', (e) => {
    dragging = true;
    disableUserSelect();
    progressWrapper.classList.add('dragging');
    seekTo(e.touches[0]);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (dragging) {
      seekTo(e.touches[0]);
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    dragging = false;
    enableUserSelect();
    progressWrapper.classList.remove('dragging');
  });
}

// --- FORMAT TOGGLE BUTTON ---
formatBtn.addEventListener("click", async () => {
  if (!activeImage) return;
  if (!seekingAllowed) return;

  const mixId = activeImage.dataset.id;
  const mix = window.mixes[mixId];
  if (!mix) return;

  const currentTime = audio.currentTime;

  // Determine the next format (toggle)
  let nextFormat = currentFormat === "mp3" ? "flac" : "mp3";

  // Check if the next format exists
  if (!mix.formats[nextFormat]) {
    return;
  }

  // Toggle format
  currentFormat = nextFormat;
  formatBtn.textContent = currentFormat.toUpperCase();
  formatBtn.title = ""; // clear tooltip

  // Reload track in new format from current time
  loadMix(mix, currentTime);
  await playMix();

  blockSeeking();
});

// --- DOWNLOAD BUTTON ---
downloadBtn.addEventListener("click", () => {
  if (!activeImage) return;
  const id = activeImage.dataset.id;
  const mix = window.mixes[id]

  if (!mix) return;

  const format = 'mp3';

  // Safe: request your backend, not the CDN
  const url = `/download/${mix.folder}?format=${format}`;

  window.location.href = url;
});

// Re-bind click handlers for newly injected pages
window.bindMixImageClickHandlers = function () {
  const imageWraps = document.querySelectorAll('.mix-audio-control-zone');

  imageWraps.forEach(wrap => {
    wrap.addEventListener('click', async () => {
      const id = wrap.dataset.id;
      const mix = window.mixes[id];
      if (!mix) return;

      if (activeImage === wrap) {
        if (audio.paused) audio.play();
        else audio.pause();
        return;
      }

      setActiveImage(wrap, true);
      loadMix(mix);
      await playMix();
    });
  });
};

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

window.initOverlayIcons = initOverlayIcons;
