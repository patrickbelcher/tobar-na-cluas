import fs from 'fs';
import path from 'path';

export function loadMixes() {
  const mixesDir = "C:/Users/Patrick/Desktop/mixes"; 
  console.log("Loading mixes from:", mixesDir);

  if (!fs.existsSync(mixesDir)) {
    console.error("[ERROR] Mixes folder not found");
    return {};
  }

  const folders = fs.readdirSync(mixesDir)
    .filter(f => fs.statSync(path.join(mixesDir, f)).isDirectory());

  console.log("Found mix folders:", folders);

  const mixes = {};

  folders.forEach(base => {
    const folder = path.join(mixesDir, base);
    const files = fs.readdirSync(folder);
    console.log(`\nMix folder: ${base}, files:`, files);

    // --- Detect formats ---
    const formats = {};
    if (files.includes(`${base}.mp3`)) formats.mp3 = `${base}.mp3`;
    if (files.includes(`${base}.flac`)) formats.flac = `${base}.flac`;

    // --- Tracklist ---
    const tracklistPath = path.join(folder, `${base}-tracklist.txt`);
    const tracklist = fs.existsSync(tracklistPath)
      ? fs.readFileSync(tracklistPath, 'utf-8')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length)
      : [];

    // --- Metadata ---
    const metaPath = path.join(folder, `${base}-info.txt`);
    let meta = {};
    if (fs.existsSync(metaPath)) {
      const lines = fs.readFileSync(metaPath, 'utf-8').split('\n');
      lines.forEach(line => {
        const match = line.match(/\[\[(.+?)\]\]:\s*(.*)/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (value) meta[key] = value;
        }
      });
    }

    // --- Mix image ---
    const coverRegex = new RegExp(`^${base}\\.(jpg|jpeg|png|gif)$`, 'i');
    const image = files.find(f => coverRegex.test(f)) || null;


    // --- Build mix object ---
    mixes[base] = {
      base,
      formats,
      image,
      ...meta,  // optional metadata: who, link, about
      tracklist,
    };

    console.log(`Loaded mix: ${base}`, mixes[base]);
  });

  console.log("\nAll mixes loaded:", mixes);
  return mixes;
}

