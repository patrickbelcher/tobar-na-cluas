// app.js
import express from "express"; // for Node v20+, supports ES modules if "type":"module" in package.json
import expressLayouts from "express-ejs-layouts";
import path from "path";
import { fileURLToPath } from "url";
import { loadMixes }  from "./lib/loadMixes.js";
import { validateDownloadRequest } from "./lib/downloadGuard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

// Serve static files from "public"
app.use(express.static(path.join(__dirname, "public")));

// Helper: SPA requests send a custom header "X-SPA: true"
// If present → return partial; otherwise → full layout.
function render(req, res, view, data = {}) {
  const isSPA = req.headers["x-spa"] === "true";

  console.log(`
  [REQUEST]
  URL: ${req.method} ${req.url}
  SPA: ${isSPA}
  View rendered: ${view}
  Data keys: ${Object.keys(data).join(", ")}
  `);

  if (req.headers["x-spa"] === "true") {
    // Return only the inner HTML for <main>
    return res.render(view, { ...data, layout: false });
  }
  // Normal navigation → full layout
  return res.render(view, data);
}

// Load mixes.json data and tracklists
const mixes = loadMixes();
console.log("[Express] loaded mixes:", mixes);

// Homepage route — render index.ejs and pass mixes data
app.get("/", (req, res) => {
  console.log("Route: / (homepage)");
  render(req, res, "index", { title: "Home", mixes });
});


app.get("/about", (req, res) => {
  console.log("Route: /about");
  render(req, res, "about", { title: "About", mixes });
});

app.get('/mix/:base', (req, res) => {
  const mix = mixes.find(m => m.base === req.params.base);
  console.log(`Route: /mix/${req.params.base}`);

  if (!mix) {
    return res.status(404).render('404', { message: 'Mix not found' });
  }

  render(req, res, "mix", { title: mix.title, mixes});
});

// Placeholder for CDN downloads
app.get("/download/:id", validateDownloadRequest, async (req, res) => {
  const id = req.params.id;
  const format = req.query.format;

  // Find mix
  const mix = mixes.find(m => m.base === id);
  if (!mix) return res.status(404).send("Mix not found");

  const ext = mix.formats[format];
  if (!ext) return res.status(400).send("Invalid format");

  const fileUrl = `https://mycdn.example.com/audio/${mix.base}.${ext}`;

  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      console.error(`CDN error for ${fileUrl}`);
      return res.status(502).send("Audio file not available");
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${mix.title}.${format}"`
    );

    response.body.pipe(res);
  } catch (err) {
    console.error("CDN fetch error:", err);
    res.status(500).send("Download failed");
  }
});

app.listen(PORT, () => {
  console.log(`Tobar na Cluas running at http://localhost:${PORT}`);
});
