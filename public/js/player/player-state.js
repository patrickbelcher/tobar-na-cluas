// --- AUDIO INSTANCE ---
export const audio = new Audio();
audio.preload = 'metadata';

// --- SHARED PLAYER STATE ---
export const playerState = {
  loadedMixId:    null,     // string: mix.base of currently loaded mix
  currentFormat:  'mp3',    // 'mp3' | 'flac'
  status:         'idle',   // 'idle' | 'playing' | 'paused'
  seekingAllowed: true,     // debounce flag to prevent rapid seek events
  saveInterval:   null,     // setInterval handle for periodic localStorage writes
};
