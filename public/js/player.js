// DOM
const playBtn = document.getElementById('play-btn');
const playerIcon = document.getElementById('player-icon');
const progressBar = document.getElementById('progress-bar');
const elapsedEl = document.getElementById('elapsed-time');
const totalEl = document.getElementById('total-time');
const imageWraps = document.querySelectorAll('.image-hover-wrap');
const nowPlaying = document.getElementById('current-track');
const downloadBtn = document.getElementById("download-btn");
const formatBtn = document.getElementById('format-toggle');

// SVGs
const iconPlay = '/icons/play_circle.svg';
const iconPause = '/icons/pause_circle.svg';

// Audio
const audio = new Audio();
let activeImage = null;
let currentFormat = "mp3"; // default format
let seekingAllowed = true;

// Load inline SVG icon into the footer button
async function setIcon(path) {
  const res = await fetch(path);
  const svgText = await res.text();
  playerIcon.innerHTML = svgText;
}

// Initial footer icon
setIcon(iconPlay);

if (!window.mixes) {
  console.error('window.mixes is undefined');
} else {
  console.log('Initializing player. Reading mixes JSON:', window.mixes);
}


// Switch audio source and play
async function loadAndPlay(mix, startTime = 0) {
  const format = currentFormat;
  const src = `/audio/${mix.base}.${mix.formats[format]}`;

  console.log('Load and play');

  if (audio.src !== src) {
    audio.src = src;

    nowPlaying.innerHTML = `playing : <span class="mix-title">${mix.title}</span>`;

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


// Click on a mix-image events
imageWraps.forEach(wrap => {
  wrap.addEventListener('click', async () => {
    const id = wrap.dataset.id;
    console.log('Mix selected: ' + id);
    const mix = window.mixes.find(m => m.base === id);
    if (!mix) {
      console.log('Mix not found');
      return;
    }

    // If same image clicked → toggle
    if (activeImage === wrap) {
      if (audio.paused) audio.play();
      else audio.pause();
      return;
    }

    // Otherwise switch tracks
    setActiveImage(wrap, true);
    await loadAndPlay(mix);
  });
});

// Set the active image
// function setActiveImage(wrap, isPlaying) {
//   // Reset previous active
//   if (activeImage && activeImage !== wrap) {
//     const prevIcon = activeImage.querySelector('.play-icon');
//     if (prevIcon) prevIcon.src = iconPlay;
//     activeImage.classList.remove("active");
//   }

//   // Set new active

//   activeImage = wrap;
//   wrap.classList.add("active");

//   // Set correct overlay play / pause icon
//   const icon = wrap.querySelector('.play-icon');
//   if (icon) {
//     icon.src = isPlaying ? iconPause : iconPlay;
//   }
// }

function setActiveImage(wrap, isPlaying) {
  // --- existing logic ---
  activeImage = wrap;
  wrap.classList.add("active");

  const icon = wrap.querySelector('.play-icon');
  if (icon) icon.src = isPlaying ? iconPause : iconPlay;

  // --- NEW: update format toggle button ---
  const mixId = wrap.dataset.id;
  const mix = window.mixes.find(m => m.base === mixId);
  if (!mix) return;

  // If only mp3 exists, force mp3 and disable toggle
  if (!mix.formats.flac) {
    currentFormat = "mp3";
    formatBtn.textContent = "MP3";
    formatBtn.disabled = true;
    // formatBtn.title = "FLAC not available for this mix";
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


// AUDIO EVENTS
audio.addEventListener('play', () => {
  setIcon(iconPause);

  if (activeImage) {
    const icon = activeImage.querySelector('.play-icon');
    if (icon) icon.src = iconPause;
    activeImage.classList.add("active");
  }
});

audio.addEventListener('pause', () => {
  setIcon(iconPlay);

  if (activeImage) {
    const icon = activeImage.querySelector('.play-icon');
    if (icon) icon.src = iconPlay;
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
    const mix = window.mixes.find(m => m.base === mixId);
    if (!mix) return;

    const currentTime = audio.currentTime;

    // Determine the next format (toggle)
    let nextFormat = currentFormat === "mp3" ? "flac" : "mp3";

    // Check if the next format exists
    if (!mix.formats[nextFormat]) {
      console.warn(`Mix "${mix.title}" does not have a ${nextFormat} file.`);
      // Optionally: show a tooltip / flash message
      formatBtn.title = `${nextFormat.toUpperCase()} not available for this mix`;
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

}
