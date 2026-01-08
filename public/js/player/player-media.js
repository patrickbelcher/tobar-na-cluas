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