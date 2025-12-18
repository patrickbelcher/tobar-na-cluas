// Download protection middleware for Express

// Rolling window download counters (RAM only)
const recentDownloads = new Map();   // ip -> timestamps[]
const dailyDownloads = new Map();    // ip -> { date: "YYYY-MM-DD", count }

// Config
const RATE_LIMIT_MAX = 1;            // max downloads
const RATE_LIMIT_WINDOW_MS = 10_000; // per 10 seconds
const DAILY_LIMIT_MAX = 3;          // per day

const ALLOWED_REFERERS = [
  "localhost",
  "127.0.0.1",
  "tobarnacluas.ie",
  "www.tobarnacluas.ie"
];

// Utility
function todayString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Ensure client is coming from your site (simple hotlink protection)
function refererAllowed(req) {
  const ref = req.get("Referer");
  if (!ref) return true; // Browsers may omit referer; allow.

  try {
    const url = new URL(ref);
    return ALLOWED_REFERERS.some(domain => url.hostname.includes(domain));
  } catch {
    return false;
  }
}

// Rolling window rate limiter
function passesRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  if (!recentDownloads.has(ip)) {
    recentDownloads.set(ip, [now]);
    return true;
  }

  const timestamps = recentDownloads.get(ip);

  // Remove old timestamps outside window
  const filtered = timestamps.filter(t => t > windowStart);
  filtered.push(now);

  recentDownloads.set(ip, filtered);

  return filtered.length <= RATE_LIMIT_MAX;
}

// Daily quota limit
function passesDailyQuota(ip) {
  const today = todayString();

  if (!dailyDownloads.has(ip)) {
    dailyDownloads.set(ip, { date: today, count: 1 });
    return true;
  }

  const entry = dailyDownloads.get(ip);

  // Reset if new day
  if (entry.date !== today) {
    dailyDownloads.set(ip, { date: today, count: 1 });
    return true;
  }

  // Same day, check quota
  entry.count += 1;
  return entry.count <= DAILY_LIMIT_MAX;
}

// Main middleware
export function validateDownloadRequest(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;

  // 1. Hotlink protection
  if (!refererAllowed(req)) {
    console.warn(`[DownloadGuard] Blocked hotlink from ${req.get("Referer")}`);
    return res.status(403).send("Forbidden");
  }

  // 2. Rolling rate limit
  if (!passesRateLimit(ip)) {
    console.warn(`[DownloadGuard] Rate limit exceeded for ${ip}`);
    return res.status(429).send("Too many downloads — slow down.");
  }

  // 3. Daily quota
  if (!passesDailyQuota(ip)) {
    console.warn(`[DownloadGuard] Daily quota exceeded for ${ip}`);
    return res.status(429).send("Daily download limit reached.");
  }

  // All checks OK
  next();
}
