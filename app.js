// app.js
import express from "express"; // for Node v20+, supports ES modules if "type":"module" in package.json
import expressLayouts from "express-ejs-layouts";
import path from "path";
import 'dotenv/config';
import { fileURLToPath } from "url";
import { loadMixes, getDownloadUrl } from "./lib/loadMixes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Production address, used for canonical links, link previews and the sitemap
const SITE_URL = process.env.SITE_URL || "https://tobarnacluas.ie";
const DEFAULT_DESCRIPTION = "Sporadic recordings from SW. Ireland. Lesser trodden selections. Electronic leaning. New, old, Irish stuff.";

// Search engines show about 155–160 characters of a description
function describeMix(mix) {
  const text = mix.about
    || `A mix by ${mix.who}. Tracks from ${mix.tracklist.slice(0, 3).join(", ")} and more.`;
  return text.length > 160 ? text.slice(0, 157).trimEnd() + "…" : text;
}

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");
app.disable('x-powered-by');

// Cache rules for files in /public.
// Images and icons rarely change: browsers keep them for 30 days.
// Everything else (CSS, JS, manifest, robots.txt): browsers check for a newer
// version every time; the ETag makes that a tiny "not modified" reply if nothing changed.
const LONG_CACHE = /\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i;

app.use(express.static(path.join(__dirname, "public"), {
  setHeaders(res, filePath) {
    res.setHeader("Cache-Control", LONG_CACHE.test(filePath)
      ? "public, max-age=2592000"
      : "no-cache");
  },
}));

// Helper: SPA requests send custom header "X-SPA: true"
// If present -> return partial; otherwise -> full layout.
function render(req, res, view, data = {}) {
  // Same URL returns two different bodies, so caches must key on X-SPA
  res.vary("X-SPA");

  if (req.headers["x-spa"] === "true") {
    // Page title for nav.js to set (headers must be plain ASCII, so encode it)
    res.set("X-Page-Title", encodeURIComponent(`Tobar na Cluas | ${data.title}`));
    // Return only the inner HTML for <main>
    return res.render(view, { ...data, layout: false });
  }
  // Normal navigation → full layout
  return res.render(view, data);
}

// 404 for both SPA and full-page requests
function notFound(req, res) {
  res.status(404);
    return render(req, res, "404", { title: "404 - Not Found", noindex: true });
}

// Load mixes.json data and tracklists
async function start() {
  const mixes = await loadMixes();

  if (Object.keys(mixes).length === 0) {
    console.warn("[Express] No mixes loaded — R2 may be unreachable. Site will start with empty mixes.");
  }

  console.log("[Express] loaded mixes:", mixes);


  app.use((req, res, next) => {
    res.locals.mixes = mixes;
    // Defaults for the <head> tags in layout.ejs; routes can override them
    res.locals.description = DEFAULT_DESCRIPTION;
    res.locals.canonicalUrl = SITE_URL + req.path;
    res.locals.ogImage = Object.values(mixes)[0]?.image; // newest mix cover
    res.locals.noindex = false;
    next();
  });

  app.get("/", (req, res) => {
    render(req, res, "index", { title: "Mixes" });
  });

  app.get("/about", (req, res) => {
    render(req, res, "about", { title: "About" });
  });

  app.get('/mix/:base', (req, res) => {
    const base = req.params.base;
    const mix = mixes[base];

    if (!mix) return notFound(req, res);

    render(req, res, "mix", {
      mix,
      title: mix.title,
      description: describeMix(mix),
      ogImage: mix.image,
    });
  });

  app.get("/download/:id", async (req, res) => {
    const mix = mixes[req.params.id];
    if (!mix?.fileKeys?.mp3) return notFound(req, res);

    const url = await getDownloadUrl(mix.fileKeys.mp3, `${mix.who} - ${mix.title}.mp3`);
    res.redirect(302, url);
  });

  // Sitemap for search engines: every page, built from the loaded mixes
  app.get("/sitemap.xml", (req, res) => {
    const paths = ["/", "/about", ...Object.keys(mixes).map(base => `/mix/${encodeURIComponent(base)}`)];
    const urls = paths.map(p => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n");
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    );
  });

  // Catch-all 404 — must be the last route
  app.use(notFound);

  app.listen(PORT, () => {
    console.log(`Tobar na Cluas running at http://localhost:${PORT}`);
  });
}

start();

