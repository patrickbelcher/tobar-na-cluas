import fs from 'fs';
import path from 'path';

export function loadMixes() {
  const dataDir = path.join(process.cwd(), 'data');         // mixes.json lives here
  const mixesJson = JSON.parse(fs.readFileSync(path.join(dataDir, 'mixes.json'), 'utf8'));

  const tracklistDir = path.join(process.cwd(), 'public', 'tracklists');

  return mixesJson.map(mix => {
    const ext = mix.formats.tracklist || 'txt';
    const txtPath = path.join(tracklistDir, `${mix.base}.${ext}`);

    if (fs.existsSync(txtPath)) {
      mix.tracklist = fs.readFileSync(txtPath, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
    } else {
      mix.tracklist = [];
    }

    return mix;
  });
}
