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

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");
app.disable('x-powered-by');

// Serve static files from "public"
app.use(express.static(path.join(__dirname, "public")));

// Helper: SPA requests send custom header "X-SPA: true"
// If present -> return partial; otherwise -> full layout.
function render(req, res, view, data = {}) {
  // Same URL returns two different bodies, so caches must key on X-SPA
  res.vary("X-SPA");

  if (req.headers["x-spa"] === "true") {
    // Return only the inner HTML for <main>
    return res.render(view, { ...data, layout: false });
  }
  // Normal navigation → full layout
  return res.render(view, data);
}

// 404 for both SPA and full-page requests
function notFound(req, res) {
  res.status(404);
  return render(req, res, "404", { title: "404 - Not Found" });
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
    });
  });

  app.get("/download/:id", async (req, res) => {
    const mix = mixes[req.params.id];
    if (!mix?.fileKeys?.mp3) return notFound(req, res);

    const url = await getDownloadUrl(mix.fileKeys.mp3, `${mix.who} - ${mix.title}.mp3`);
    res.redirect(302, url);
  });

  // Catch-all 404 — must be the last route
  app.use(notFound);

  app.listen(PORT, () => {
    console.log(`Tobar na Cluas running at http://localhost:${PORT}`);
  });
}

start();

