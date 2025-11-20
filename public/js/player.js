// DOM
const playBtn = document.getElementById('play-btn');
const playerIcon = document.getElementById('player-icon');
const progressBar = document.getElementById('progress-bar');
const elapsedEl = document.getElementById('elapsed-time');
const totalEl = document.getElementById('total-time');
const imageWraps = document.querySelectorAll('.image-hover-wrap');

// SVGs
const iconPlay = '/icons/play.svg';
const iconPause = '/icons/pause.svg';

// Audio
const audio = new Audio();
let activeImage = null;

// Load inline SVG icon into the footer button
async function setIcon(path) {
  const res = await fetch(path);
  const svgText = await res.text();
  playerIcon.innerHTML = svgText;
}

// Initial footer icon
setIcon(iconPlay);

// Smooth 150ms fade-out + fade-in to prevent clicks on seeking
function smoothSeek(audio, newTime) {
  const fadeDuration = 0.25; // seconds
  const originalVolume = audio.volume;

  // Fade out quickly
  audio.volume = originalVolume;
  const fadeOutSteps = 10;
  const fadeOutInterval = fadeDuration / fadeOutSteps;

  let step = 0;
  const fadeOut = setInterval(() => {
    step++;
    audio.volume = originalVolume * (1 - step / fadeOutSteps);

    if (step >= fadeOutSteps) {
      clearInterval(fadeOut);

      // Do the actual seek AFTER fade-out
      audio.currentTime = newTime;

      // Fade in
      let fadeInStep = 0;
      const fadeIn = setInterval(() => {
        fadeInStep++;
        audio.volume = (originalVolume * fadeInStep) / fadeOutSteps;

        if (fadeInStep >= fadeOutSteps) {
          audio.volume = originalVolume;
          clearInterval(fadeIn);
        }
      }, fadeOutInterval * 1000);
    }
  }, fadeOutInterval * 1000);
}


// Set the active image
function setActiveImage(wrap, isPlaying) {
  // Reset previous active
  if (activeImage && activeImage !== wrap) {
    const prevIcon = activeImage.querySelector('.play-icon');
    if (prevIcon) prevIcon.src = iconPlay;
    activeImage.classList.remove("active");
  }

  // Set new active
  activeImage = wrap;
  wrap.classList.add("active");

  // Set correct overlay play / pause icon
  const icon = wrap.querySelector('.play-icon');
  if (icon) {
    icon.src = isPlaying ? iconPause : iconPlay;
  }
}




// Switch audio source and play
async function loadAndPlay(mix) {
  const mp3 = `/audio/${mix.base}.${mix.formats.mp3}`;

  if (audio.src !== mp3) {
    audio.src = mp3;
  }

  await audio.play();
}


// Click on a mix-image
imageWraps.forEach(wrap => {
  wrap.addEventListener('click', async () => {
    const id = wrap.dataset.id;
    const mix = window.mixes.find(m => m.id === id);
    if (!mix) return;

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

// Click-to-seek
document.querySelector('.progress-wrapper').addEventListener('click', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const newTime = percent * audio.duration;

  smoothSeek(audio, newTime);  
});

