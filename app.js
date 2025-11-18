// app.js
import express from "express"; // for Node v20+, supports ES modules if "type":"module" in package.json
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files from "public"
app.use(express.static(path.join(__dirname, "public")));

// Load mixes.json data
const mixes = JSON.parse(
  readFileSync(path.join(__dirname, "data/mixes.json"))
);

// Homepage route — render index.ejs and pass mixes data
app.get("/", (req, res) => {
  res.render("index", { mixes });
});

app.listen(PORT, () => {
  console.log(`Tobar Na Cluas running at http://localhost:${PORT}`);
});
