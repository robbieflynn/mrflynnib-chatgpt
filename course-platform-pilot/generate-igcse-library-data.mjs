import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, "igcse-lessons.json");
const destinationPath = resolve(here, "dist/igcse-library-data.js");
const source = JSON.parse(await readFile(sourcePath, "utf8"));

const topicNames = Object.fromEntries(
  source.map((lesson) => [
    lesson.topic,
    lesson.section.replace(/^\d+\.\s*/, ""),
  ]),
);

const lessons = source.map((lesson) => ({
  id: lesson.id,
  topic: lesson.topic,
  section: lesson.section,
  code: lesson.code,
  title: lesson.title,
  seconds: lesson.bunnyLengthSeconds,
  scope: lesson.section,
  status: 4,
}));

const payload = {
  libraryId: "775873",
  topicNames,
  lessons,
  stats: {
    videos: lessons.length,
    seconds: lessons.reduce((total, lesson) => total + lesson.seconds, 0),
  },
};

await writeFile(
  destinationPath,
  `window.MR_FLYNN_IGCSE_LIBRARY = ${JSON.stringify(payload, null, 2)};\n`,
  "utf8",
);

console.log(`Wrote ${lessons.length} IGCSE lessons to ${destinationPath}`);
