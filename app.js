// app.js
import express from "express"; // for Node v20+, supports ES modules if "type":"module" in package.json
import expressLayouts from "express-ejs-layouts";
import path from "path";
import { fileURLToPath } from "url";
import { mixloader }  from "./lib/mixloader.js";

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

// Load mixes.json data and tracklists
const mixes = mixloader();

// Homepage route — render index.ejs and pass mixes data
app.get("/", (req, res) => {
  res.render("index", { title: "Home", mixes });
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About" });
});

app.get("/download/:id", async (req, res) => {
  const id = req.params.id;
  const format = req.query.format;

  // Rate limit
  if (tooManyDownloads(req.ip)) {
    return res.status(429).send("Too many downloads");
  }

  // Lookup mix
  const mix = mixes.find(m => m.id === id);
  if (!mix) return res.status(404).end();

  const fileUrl = `https://mycdn.example.com/audio/${mix.base}.${mix.formats[format]}`;

  // Stream securely
  const response = await fetch(fileUrl);
  res.setHeader("Content-Disposition", `attachment; filename="${mix.title}.${format}"`);

  response.body.pipe(res);
});


app.listen(PORT, () => {
  console.log(`Tobar Na Cluas running at http://localhost:${PORT}`);
});
