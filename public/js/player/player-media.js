import { audio, playerState } from './player-state.js';
import { togglePlayback, persistPlayerState } from './player-core.js';
import { updateProgressUI } from './player-ui.js';

// --- MEDIA SESSION HANDLERS ---
if ('mediaSession' in navigator) {

  navigator.mediaSession.setActionHandler('play', () => {
    togglePlayback('play');
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    togglePlayback('pause');
  });

  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (!audio.duration || isNaN(details.seekTime)) return;

    const time = Math.min(Math.max(details.seekTime, 0), audio.duration);
    audio.currentTime = time;

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

// --- METADATA ---

export function updateMediaSessionMetadata(mix) {
  if (!('mediaSession' in navigator) || !mix) return;

  const artwork = mix.image
    ? [{
        src:   new URL(`/mixes/${mix.folder}/${mix.image}`, window.location.origin).href,
        sizes: '512x512',
        type:  'image/png',
      }]
    : [];

  navigator.mediaSession.metadata = new MediaMetadata({
    title:   mix.title || 'Unknown title',
    artist:  mix.who   || 'Tobar na Cluas',
    album:   'tobarnacluas.ie',
    artwork,
  });
}
