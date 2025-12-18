if (!window.mixes) {
  console.error('(audio)player.js: window.mixes is undefined');
} else {
  console.log('Initializing player. Reading mixes JSON:', window.mixes);
}

// INLINE SVG CONSTANTS
const playCircleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
  <path d="m383-310 267-170-267-170v340Zm97 230q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/>
</svg>`;

const pauseCircleSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
  <path d="M370-320h60v-320h-60v320Zm160 0h60v-320h-60v320ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/>
</svg>`;

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

// set default image overlay icons
function initOverlayIcons(scope = document) {
  scope.querySelectorAll('.overlay-play-icon').forEach(svg => {
    svg.innerHTML = playCircleSVG;
  });
}

// Audio
const audio = new Audio();
let activeImage = null;
let currentFormat = "mp3"; // default format
let seekingAllowed = true;

// Init player + overlay play/pause icon
playerIcon.innerHTML = playCircleSVG;
initOverlayIcons(document);

// Persistent states
const savedState = JSON.parse(localStorage.getItem("playerState")) || {};
let activeMixId = savedState.mixId || null;
currentFormat = savedState.format || "mp3";

// Persistent active-mix state
if (activeMixId && window.mixes[activeMixId]) {
  const mix = window.mixes[activeMixId];
  loadAndPlay(mix, savedState.currentTime || 0);

  // Find the corresponding image overlay and set it active
  const wrap = document.querySelector(`.mix-audio-control-zone[data-id="${activeMixId}"]`);
  if (wrap) setActiveImage(wrap, !audio.paused);
}

// Restore active tile & icon after SPA page injection
async function restoreActiveMixState() {
  if (!activeMixId) return;

  const wrap = document.querySelector(`.mix-audio-control-zone[data-id="${activeMixId}"]`);
  if (!wrap) return;

  // Mark correct image as active
  setActiveImage(wrap, !audio.paused);

  // Ensure correct Now Playing text after injection
  const mix = window.mixes[activeMixId];
  if (mix) {
    nowPlaying.innerHTML = `playing : <span class="mix-title">${mix.title}</span>`;
  }
}

// Set audio source and play
async function loadAndPlay(mix, startTime = 0) {
  const format = currentFormat;
  const src = `/mixes/${mix.base}/${mix.formats[format]}`;

  console.log(`Loading and playing mix: ${mix.base}, format: ${currentFormat}, src: ${src}`);

  // Check against currently loaded mix. If new ->
  if (audio.src !== src) {
    audio.src = src;

    // Set SPA global var 
    window.activeMixId = mix.base; 

    // Persist to localStorage
    localStorage.setItem("playerState", JSON.stringify({
      mixId: mix.base,
      format: currentFormat,
      currentTime: audio.currentTime
    }));

    nowPlaying.innerHTML = `playing : <span id="player-mix-title">${mix.title}</span>`;

    progressBar.style.width = '0%';
    elapsedEl.textContent = '0:00';
    totalEl.textContent = '0:00';
  }

  // Start from specified time
  audio.currentTime = startTime;

  try {
    await audio.play();
  } catch (err) {
    console.error("Audio play failed: ", err);
  }

  blockSeeking();
}

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
    await loadAndPlay(mix);
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

// FOOTER: Play/Pause button
playBtn.addEventListener('click', () => {
  if (!audio.src) return;

  if (audio.paused) audio.play();
  else audio.pause();
});


audio.addEventListener('play', () => {
  playerIcon.innerHTML = pauseCircleSVG;

  if (activeImage) {
    const icon = activeImage.querySelector('.overlay-play-icon');
    if (icon) icon.innerHTML = pauseCircleSVG;
    activeImage.classList.add("active-mix");
  }
});

audio.addEventListener('pause', () => {
  playerIcon.innerHTML = playCircleSVG;

  if (activeImage) {
    const icon = activeImage.querySelector('.overlay-play-icon');
    if (icon) icon.innerHTML = playCircleSVG;
  }
});

// Metadata loaded → Show total duration
audio.addEventListener('loadedmetadata', () => {
  const totalMin = Math.floor(audio.duration / 60);
  const totalSec = Math.floor(audio.duration % 60).toString().padStart(2, '0');
  totalEl.textContent = `${totalMin}:${totalSec}`;
});

// Progress + elapsed
audio.addEventListener('timeupdate', () => {
  const percent = (audio.currentTime / audio.duration) * 100;
  progressBar.style.width = percent + '%';

  const elapsedMin = Math.floor(audio.currentTime / 60);
  const elapsedSec = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
  elapsedEl.textContent = `${elapsedMin}:${elapsedSec}`;
});

// --- GLOBAL ---
function blockSeeking() {
  seekingAllowed = false;
  console.log('Block seeking')
  setTimeout(() => seekingAllowed = true, 250);
  console.log
}


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

  // ---- MOUSE ----
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
    }
  });

  // ---- TOUCH ----
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
    await loadAndPlay(mix, currentTime);

    blockSeeking();
  });

  // --- DOWNLOAD BUTTON ---
  downloadBtn.addEventListener("click", () => {
    if (!activeImage) return;
    const id = activeImage.dataset.id;
    const mix = window.mixes.find(m => m.base === id);
    if (!mix) return;

    const format = 'mp3';

    // Safe: request your backend, not the CDN
    const url = `/download/${mix.base}?format=${format}`;

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
      await loadAndPlay(mix);
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
    await loadAndPlay(mix, savedState.currentTime || 0);
  }
};

window.initOverlayIcons = initOverlayIcons;

}
