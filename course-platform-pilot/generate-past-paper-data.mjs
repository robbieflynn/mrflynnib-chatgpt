import fs from "node:fs";
import path from "node:path";

const sourcePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve("course-platform-pilot/dist/past-paper-data.js");
const snapshotPath = process.argv[4];

if (!sourcePath) {
  throw new Error("Usage: node generate-past-paper-data.mjs <teachable-to-live-bunny.json> [output.js] [bunny-library-snapshot.json]");
}

const rows = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const snapshot = snapshotPath ? JSON.parse(fs.readFileSync(snapshotPath, "utf8")) : null;
const liveVideos = snapshot?.videos || [];
const courseCodes = ["AA HL", "AA SL", "AI HL", "AI SL"];

const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const normalizeQuestion = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function cleanBunnyQuestionTitle(video) {
  const prefix = `${video.collectionName} – `;
  return String(video.title || "")
    .replace(prefix, "")
    .replace(/\s*\([^)]*sl\)\s*/gi, " ")
    .replace(/\s+[–—-]\s+(?:combined|complete)\s*$/i, "")
    .replace(/\s+(?:combined|complete)\s*$/i, "")
    .trim();
}

function isUsableFullVideo(video) {
  return video?.hasUsableUpload === true
    && Number(video.status) === 4
    && Number(video.storageSize) > 0
    && !/\bpart\s*\d+\b/i.test(video.title || "");
}

function directLiveMatch(row) {
  const expected = normalizeQuestion(row.teachableTitle);
  if (!expected || !row.bunnyCollection) return null;
  const expectedSeconds = String(row.teachableDuration || "").split(":").reduce((total, value) => total * 60 + Number(value || 0), 0);
  return liveVideos
    .filter((video) => video.collectionName === row.bunnyCollection && isUsableFullVideo(video))
    .filter((video) => normalizeQuestion(cleanBunnyQuestionTitle(video)) === expected)
    .sort((a, b) => {
      const completePreference = Number(/\bcomplete\b/i.test(b.title || "")) - Number(/\bcomplete\b/i.test(a.title || ""));
      return completePreference || Math.abs(Number(a.length) - expectedSeconds) - Math.abs(Number(b.length) - expectedSeconds);
    })[0] || null;
}

function parseCollection(collectionName) {
  const parts = String(collectionName || "").split(" – ");
  if (parts.length < 4 || parts[0] !== "IB Past Papers") return null;
  const course = parts[1];
  const paper = parts.at(-1);
  const timezone = parts.at(-2)?.startsWith("TZ") ? parts.at(-2) : "";
  const sessionParts = timezone ? parts.slice(2, -2) : parts.slice(2, -1);
  const session = sessionParts.join(" ");
  if (!courseCodes.includes(course) || !paper?.startsWith("Paper ") || !session) return null;
  return { course, session, timezone, paper };
}

function sessionRank(session) {
  if (session === "Specimen") return 0;
  const year = Number(session.match(/\b(20\d{2})\b/)?.[1] || 0);
  const month = /November/i.test(session) ? 2 : /May/i.test(session) ? 1 : 0;
  return year * 10 + month;
}

const grouped = new Map();
for (const row of rows) {
  if (row.category !== "past_paper") continue;
  const parsed = parseCollection(row.bunnyCollection);
  if (!parsed) continue;
  const directMatch = directLiveMatch(row);
  const video = row.status === "verified_match" && row.videoId
    ? { guid: row.videoId, length: Number(row.bunnyLengthSeconds) || 0 }
    : directMatch;
  if (!video?.guid) continue;
  const setKey = `${parsed.course}|${row.bunnyCollection}`;
  if (!grouped.has(setKey)) grouped.set(setKey, { ...parsed, collection: row.bunnyCollection, questions: new Map() });
  const questionKey = normalizeQuestion(row.teachableTitle);
  if (!questionKey) continue;
  const set = grouped.get(setKey);
  if (!set.questions.has(questionKey)) {
    set.questions.set(questionKey, {
      id: video.guid,
      title: row.teachableTitle,
      seconds: Number(video.length) || 0,
    });
  }
}

const courses = Object.fromEntries(courseCodes.map((course) => {
  const sets = [...grouped.values()]
    .filter((set) => set.course === course)
    .map((set) => ({
      id: `${course}-${set.session}-${set.timezone}-${set.paper}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      session: set.session,
      timezone: set.timezone,
      paper: set.paper,
      collection: set.collection,
      questions: [...set.questions.values()].sort((a, b) => naturalSort(a.title, b.title)),
    }))
    .sort((a, b) => sessionRank(b.session) - sessionRank(a.session)
      || naturalSort(a.timezone, b.timezone)
      || naturalSort(a.paper, b.paper));
  return [course, sets];
}));

const stats = Object.fromEntries(courseCodes.map((course) => [course, {
  papers: courses[course].length,
  questions: courses[course].reduce((total, set) => total + set.questions.length, 0),
}]));

const output = {
  libraryId: "775873",
  source: "Verified and exact same-collection Teachable-to-Bunny mappings",
  generatedAt: new Date().toISOString(),
  stats,
  courses,
};

fs.writeFileSync(outputPath, `window.MR_FLYNN_PAST_PAPERS = ${JSON.stringify(output)};\n`);
console.log(`Generated ${outputPath}`);
for (const course of courseCodes) console.log(`${course}: ${stats[course].papers} papers, ${stats[course].questions} solutions`);
