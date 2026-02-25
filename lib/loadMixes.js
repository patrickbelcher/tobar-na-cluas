import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const CDN = process.env.CDN_BASE_URL;

async function listBucketKeys() {
  const keys = new Set();
  let continuationToken;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
    }));

    response.Contents?.forEach(obj => keys.add(obj.Key));
    continuationToken = response.IsTruncated ? response.NextContinuationToken : null;

  } while (continuationToken);

  return keys;
}

function parseFolderName(folderName) {
  const match = folderName.match(/^(\d+)[-_ ]+(.*)$/);
  return {
    folder: folderName,
    base: match ? match[2] : folderName,
    order: match ? Number(match[1]) : 9999,
  };
}

export async function loadMixes() {
  const keys = await listBucketKeys();

  // Extract unique top-level mix folders from mixes/ prefix
  const folders = new Set();
  keys.forEach(key => {
    const match = key.match(/^mixes\/([^/]+)\//);
    if (match) folders.add(match[1]);
  });

  const parsed = [...folders]
    .map(parseFolderName)
    .sort((a, b) => b.order - a.order);

  const mixes = {};

  for (const { folder, base, order } of parsed) {
    const prefix = `mixes/${folder}/`;

    // helper to find a key case-insensitively
    const find = (filename) => {
      const lower = filename.toLowerCase();
      for (const key of keys) {
        if (key.startsWith(prefix) && key.slice(prefix.length).toLowerCase() === lower) {
          return key;
        }
      }
      return null;
    };

    // --- Detect formats ---
    const formats = {};
    const mp3Key = find(`${base}.mp3`);
    const flacKey = find(`${base}.flac`);
    if (mp3Key) formats.mp3 = `${CDN}/${mp3Key}`;
    if (flacKey) formats.flac = `${CDN}/${flacKey}`;

    // --- Cover image ---
    let image = null;
    for (const ext of ['jpg', 'jpeg', 'png', 'gif']) {
      const imgKey = find(`${base}.${ext}`);
      if (imgKey) { image = `${CDN}/${imgKey}`; break; }
    }

    // --- Fetch and parse info.txt ---
    const meta = {};
    const infoKey = find(`${base}-info.txt`);
    if (infoKey) {
      const res = await fetch(`${CDN}/${infoKey}`);
      if (res.ok) {
        const text = await res.text();
        text.split('\n').forEach(line => {
          const match = line.match(/\[\[(.+?)\]\]:\s*(.*)/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (value) meta[key] = value;
          }
        });
      }
    }

    // --- Fetch tracklist ---
    let tracklist = [];
    const tracklistKey = find(`${base}-tracklist.txt`);
    if (tracklistKey) {
      const res = await fetch(`${CDN}/${tracklistKey}`);
      if (res.ok) {
        const text = await res.text();
        tracklist = text.split('\n').map(l => l.trim()).filter(Boolean);
      }
    }

    mixes[base] = {
      base,
      folder,
      order,
      formats,
      image,
      ...meta,
      tracklist,
    };
  }

  return mixes;
}