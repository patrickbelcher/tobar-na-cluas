import fs from 'fs';
import path from 'path';

function parseFolderName(folderName) {
  const match = folderName.match(/^(\d+)[-_ ]+(.*)$/);

  return {
    folder: folderName,
    base: match ? match[2] : folderName,
    order: match ? Number(match[1]) : 9999,
  };
}

export function loadMixes() {
  const mixesDir = "mixes";
  console.log("Loading mixes from:", mixesDir);

  if (!fs.existsSync(mixesDir)) {
    console.error("[ERROR] Mixes folder not found");
    return {};
  }

  // Sort folders based on folder index prefix (eg.2501-mix-name)
  const folders = fs.readdirSync(mixesDir)
    .filter(f => fs.statSync(path.join(mixesDir, f)).isDirectory())
    .map(parseFolderName)
    .sort((b, a) => a.order - b.order);

  console.log(
    "Found mix folders:",
    folders.map(f => f.folder)
  );

    const mixes = {};

  folders.forEach(({ folder, base, order }) => {
    const dir = path.join(mixesDir, folder);
    const files = fs.readdirSync(dir);

    // --- Detect formats ---
    const formats = {};
    if (files.includes(`${base}.mp3`)) formats.mp3 = `${base}.mp3`;
    if (files.includes(`${base}.flac`)) formats.flac = `${base}.flac`;

    // --- Tracklist ---
    const tracklistPath = path.join(dir, `${base}-tracklist.txt`);
    const tracklist = fs.existsSync(tracklistPath)
      ? fs.readFileSync(tracklistPath, 'utf-8')
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
      : [];

    // --- Metadata ---
    const metaPath = path.join(dir, `${base}-info.txt`);
    const meta = {};

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
      base,        // clean name 
      folder,      // actual folder name
      order,
      formats,
      image,
      ...meta,     // who, title, link, about, etc.
      tracklist,
    };
  });

  return mixes;
}