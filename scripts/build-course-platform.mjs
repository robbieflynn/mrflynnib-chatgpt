import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "course-platform-pilot", "dist");
const destination = path.join(root, "public", "learn");
const files = ["index.html", "app.js", "styles.css", "library-data.js", "igcse-library-data.js", "past-paper-data.js", "igcse-past-paper-data.js", "practice-data.js"];

fs.mkdirSync(destination, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(source, file), path.join(destination, file));
fs.cpSync(path.join(source, "assets"), path.join(destination, "assets"), { recursive: true });
