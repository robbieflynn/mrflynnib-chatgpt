import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const dist = path.join(root, "course-platform-pilot", "dist");

function readBrowserData(file, key) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(dist, file), "utf8"), sandbox);
  return sandbox.window[key];
}

const library = readBrowserData("library-data.js", "MR_FLYNN_LIBRARY");
const igcse = readBrowserData("igcse-library-data.js", "MR_FLYNN_IGCSE_LIBRARY");
const papers = readBrowserData("past-paper-data.js", "MR_FLYNN_PAST_PAPERS");
const practice = readBrowserData("practice-data.js", "MR_FLYNN_PRACTICE");
const courses = {};

function sampleLessons(lessons, topicNumbers) {
  return topicNumbers.map((topicNumber) => lessons.find((lesson) => lesson.topic === topicNumber && practice.lessons?.[lesson.id]))
    .filter(Boolean)
    .map((lesson) => lesson.id);
}

for (const [code, lessons] of Object.entries(library.courses || {})) {
  const id = code.toLowerCase().replaceAll(" ", "-");
  courses[id] = {
    lessons: lessons.map((lesson) => lesson.id),
    samples: sampleLessons(lessons, [1, 3, 5]),
    pastPapers: (papers.courses?.[code] || []).flatMap((paper) => paper.questions.map((question) => question.id)),
  };
}

courses.igcse = {
  lessons: (igcse.lessons || []).map((lesson) => lesson.id),
  samples: sampleLessons(igcse.lessons || [], [1, 4, 6]),
  pastPapers: (papers.courses?.IGCSE || []).flatMap((paper) => paper.questions.map((question) => question.id)),
};

fs.mkdirSync(path.join(root, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(root, "src", "data", "course-video-access.json"), `${JSON.stringify({ libraryId: String(library.libraryId), courses }, null, 2)}\n`);
