// app.js
import express from "express"; // for Node v20+, supports ES modules if "type":"module" in package.json
import expressLayouts from "express-ejs-layouts";
import path from "path";
import 'dotenv/config';
import { fileURLToPath } from "url";
import { loadMixes } from "./lib/loadMixes.js";

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
  const isSPA = req.headers["x-spa"] === "true";

  // console.log(`
  // [REQUEST]
  // URL: ${req.method} ${req.url}
  // SPA: ${isSPA}
  // View rendered: ${view}
  // Data keys: ${Object.keys(data).join(", ")}
  // `);

  if (req.headers["x-spa"] === "true") {
    // Return only the inner HTML for <main>
    return res.render(view, { ...data, layout: false });
  }
  // Normal navigation → full layout
  return res.render(view, data);
}

// Load mixes.json data and tracklists
async function start() {
  const mixes = await loadMixes();
  console.log("[Express] loaded mixes:", mixes);

  app.use((req, res, next) => {
    res.locals.mixes = mixes;
    next();
  });

  app.get("/", (req, res) => {
    render(req, res, "index", { title: "Home" });
  });

  app.get("/about", (req, res) => {
    render(req, res, "about", { title: "About" });
  });

  app.get('/mix/:base', (req, res) => {
    const base = req.params.base;
    const mix = mixes[base];

    if (!mix) {
      return res.status(404).render("404", {
        title: "404 - Not Found",
        message: "Mix not found",
        mixes
      });
    }

    render(req, res, "mix", {
      mix,
      title: mix.title,
      mixes
    });
  });

  app.get("/download/:id", (req, res) => {
    const mix = mixes[req.params.id];
    if (!mix) return res.status(404).send("Mix not found");

    const fileUrl = mix.formats.mp3;
    if (!fileUrl) return res.status(404).send("MP3 not available");

    res.redirect(302, fileUrl);
  });

  app.listen(PORT, () => {
    console.log(`Tobar na Cluas running at http://localhost:${PORT}`);
  });

  app.use((req, res) => {
  res.status(404).render("404", {
    title: "404 - Not Found",
    message: "Page not found",
    mixes
  });
});
}

start();

