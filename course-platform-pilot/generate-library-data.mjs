import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const libraryId = "775873";
const snapshotPath = process.argv[2];
const expectedCatalogPath = process.argv[3] || process.env.EXPECTED_CATALOG_PATH;
const apiKeyPath = "/private/tmp/mrflynnib-bunny-api-key";
const eligibleCollection = /^(AA|AI)( HL)? - Topic ([1-5]) - (SL \+ HL|HL only)$/;
const courseOrder = ["AA SL", "AA HL", "AI SL", "AI HL"];

// The Teachable source catalogue contains the same 8:37 Change of base lesson
// twice in AI HL, at 1.7.3 and 1.9.2. Rob chose the HL-only 1.9.2 placement for
// the student course, so retain the source evidence but suppress 1.7.3 here.
const suppressedExpectedLessons = new Set([
  "AI HL|1.7.3 Change of base",
]);

// Student-facing corrections confirmed after the Teachable/Bunny audit. Keep
// source titles unchanged in the audit evidence, but present the corrected
// curriculum sequence in the course interface.
const presentationOverrides = new Map([
  ["d5c720d9-4540-4c45-b822-a0c84764b619", { code: "1.15.5" }],
  ["9507603b-0920-44ad-9e26-43451e801166", { code: "1.15.6" }],
  ["c4db88f7-5d17-4e3e-acf2-8b714152fe0f", { title: "Graphs of y = [f(x)]²" }],
  ["54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f", { title: "Eigenvalues and eigenvectors" }],
  ["ced2a712-ba39-44f5-a7dc-ef76f9c8a6ae", { title: "Arcs and sectors with radians" }],
]);

// These are intentionally not student-facing. The two older edits have verified
// replacements, while AA HL 3.11 was explicitly held back by Rob on 15 Oct 2026.
const suppressedVideoIds = new Set([
  "797e99ea-089e-4f25-84fd-e42aab742b4c",
  "7d82c17b-122c-4344-8640-28d5be087fa0",
  "b9adda93-c11b-4d8a-b61a-20e86f21e04b",
]);

const cleanTitle = (title) => String(title || "").replace(/\.(mov|m4v|mp4|avi|mkv|webm)$/i, "").trim();
const normalize = (value) => cleanTitle(value)
  .toLowerCase()
  .replace(/\s+[–—-]\s+teachable edit$/i, "")
  .replace(/standard deviation|std\.?\s*dev\.?/g, "standard deviation")
  .replace(/trigonometric/g, "trig")
  .replace(/three dimensional|3 dimensional/g, "3d")
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const lessonCode = (value) => (String(value || "").match(/^(\d+(?:\.\d+){1,2})\b/) || [])[1] || "";
const titleBody = (value) => normalize(value).replace(/^\d+(?: \d+){1,2}\s+/, "");
const canonicalTitleBody = (value) => titleBody(value).replace(/\s+combined$/, "").trim();
const splitTitle = (title) => {
  const cleaned = cleanTitle(title).replace(/\s+[–—-]\s+Teachable edit$/i, "");
  const match = cleaned.match(/^(\d+(?:\.\d+){0,2})\s*(.*)$/);
  return match ? { code: match[1], title: match[2] } : { code: "", title: cleaned };
};
const tokens = (value) => new Set(titleBody(value).split(" ").filter((token) => token.length > 1 && !["the", "and", "of", "a", "an", "with", "to", "in"].includes(token)));
const overlap = (left, right) => {
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.max(left.size, right.size, 1);
};
const durationSeconds = (value) => {
  const [minutes, seconds] = String(value || "0:00").split(":").map(Number);
  return (minutes * 60) + seconds;
};
const naturalSort = (a, b) => `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`, undefined, { numeric: true, sensitivity: "base" });

function preferredVideo(first, second) {
  const score = (video) => {
    let value = Number(video.length || 0);
    if (/Teachable edit/i.test(video.title)) value += 100000;
    if (/\bcombined\b/i.test(video.title)) value += 50000;
    return value;
  };
  return score(second) > score(first) ? second : first;
}

function matchScore(expected, video) {
  const expectedBody = titleBody(expected.title);
  const videoBody = titleBody(video.title);
  const expectedCanonicalBody = canonicalTitleBody(expected.title);
  const videoCanonicalBody = canonicalTitleBody(video.title);
  let score = overlap(tokens(expected.title), tokens(video.title)) * 500;
  if (expectedBody === videoBody) score += 900;
  else if (expectedCanonicalBody === videoCanonicalBody) score += 1000;
  if (lessonCode(expected.title) === lessonCode(video.title)) score += 280;
  const durationGap = Math.abs(durationSeconds(expected.duration) - Number(video.length || 0));
  if (durationGap <= 3) score += 220;
  else if (durationGap <= 15) score += 140;
  else if (durationGap <= 60) score += 70;
  else if (durationGap <= 180) score += 20;
  if (/Teachable edit/i.test(video.title)) score += 40;
  if (/\bcombined\b/i.test(video.title)) score += 30;
  return score;
}

async function fetchAll(endpoint, headers) {
  const items = [];
  let page = 1;
  while (true) {
    const response = await fetch(`${endpoint}?page=${page}&itemsPerPage=1000`, { headers });
    if (!response.ok) throw new Error(`Bunny metadata request failed (${response.status}).`);
    const payload = await response.json();
    items.push(...(payload.items || []));
    if (items.length >= Number(payload.totalItems || items.length) || !(payload.items || []).length) break;
    page += 1;
  }
  return items;
}

async function loadBunnyLibrary() {
  if (snapshotPath) return JSON.parse(readFileSync(snapshotPath, "utf8")).videos;
  const apiKey = process.env.BUNNY_API_KEY
    || (existsSync(apiKeyPath) ? readFileSync(apiKeyPath, "utf8").trim() : "")
    || execFileSync("pbpaste", { encoding: "utf8" }).trim();
  if (!apiKey) throw new Error("No Bunny API key or snapshot path is available.");
  const headers = { AccessKey: apiKey };
  const apiRoot = `https://video.bunnycdn.com/library/${libraryId}`;
  const [videos, collections] = await Promise.all([fetchAll(`${apiRoot}/videos`, headers), fetchAll(`${apiRoot}/collections`, headers)]);
  const collectionNames = new Map(collections.map((collection) => [collection.guid, collection.name]));
  return videos.map((video) => ({ ...video, collectionName: collectionNames.get(video.collectionId) || "" }));
}

if (!expectedCatalogPath) throw new Error("Pass the expected-catalog.json path as the second argument after the Bunny snapshot.");
const expectedCatalog = JSON.parse(readFileSync(expectedCatalogPath, "utf8")).videos
  .filter((item) => item.category === "topic_lesson" && courseOrder.includes(item.course));
const sourceVideos = await loadBunnyLibrary();
const readyCandidates = sourceVideos.filter((video) => (
  eligibleCollection.test(video.collectionName)
  && Number(video.status) === 4
  && Number(video.length) > 0
  && !suppressedVideoIds.has(video.guid)
));

const deduplicatedCandidates = new Map();
for (const video of readyCandidates) {
  const key = `${video.collectionName}|${normalize(video.title)}`;
  const existing = deduplicatedCandidates.get(key);
  deduplicatedCandidates.set(key, existing ? preferredVideo(existing, video) : video);
}
const candidateVideos = [...deduplicatedCandidates.values()];

const courseLessons = {};
const matches = [];
for (const course of courseOrder) {
  const family = course.slice(0, 2);
  const level = course.slice(3);
  const usedInCourse = new Set();
  courseLessons[course] = [];
  for (const expected of expectedCatalog.filter((item) => item.course === course)) {
    const expectedKey = `${course}|${cleanTitle(expected.title)}`;
    if (suppressedExpectedLessons.has(expectedKey)) {
      matches.push({
        course,
        section: expected.section,
        expectedTitle: expected.title,
        expectedDuration: expected.duration,
        teachableUrl: expected.url,
        status: "suppressed_by_review",
        reason: "Duplicate curriculum placement removed from the student preview",
      });
      continue;
    }
    const topic = Number((expected.section.match(/Topic (\d)/) || [])[1]);
    const eligibleForLesson = candidateVideos.filter((video) => {
      const collection = video.collectionName.match(eligibleCollection);
      return collection
        && Number(collection[3]) === topic
        && (level === "HL" || collection[4] === "SL + HL")
        && !usedInCourse.has(video.guid);
    });
    // Shared AA/AI assets are common. Consider both families, but prefer the
    // course-local record when title and duration evidence is otherwise equal.
    // This lets an exact-duration shared asset beat a local older edit.
    const ranked = eligibleForLesson
      .map((video) => ({
        video,
        score: matchScore(expected, video) + (video.collectionName.startsWith(family) ? 50 : 0),
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score < 350) {
      matches.push({ course, expectedTitle: expected.title, status: "unmatched", score: best?.score || 0, candidateTitle: best?.video.title || "" });
      continue;
    }

    usedInCourse.add(best.video.guid);
    const parsed = splitTitle(expected.title);
    const presentation = presentationOverrides.get(best.video.guid) || {};
    courseLessons[course].push({
      id: best.video.guid,
      code: presentation.code || parsed.code,
      title: presentation.title || parsed.title,
      seconds: Number(best.video.length) || durationSeconds(expected.duration),
      status: Number(best.video.status),
      topic,
      scope: /HL only$/.test(best.video.collectionName) ? "HL extension" : "SL + HL foundation",
    });
    const expectedSeconds = durationSeconds(expected.duration);
    const actualSeconds = Number(best.video.length) || 0;
    const durationDeltaSeconds = actualSeconds - expectedSeconds;
    const expectedNormalized = normalize(expected.title);
    const candidateNormalized = normalize(best.video.title);
    const expectedBody = titleBody(expected.title);
    const candidateBody = titleBody(best.video.title);
    const tokenOverlap = overlap(tokens(expected.title), tokens(best.video.title));
    const exactTitle = expectedNormalized === candidateNormalized;
    const sameTitleBody = expectedBody === candidateBody;
    const sameCode = lessonCode(expected.title) === lessonCode(best.video.title);
    const exactDuration = Math.abs(durationDeltaSeconds) <= 1;
    const closeDuration = Math.abs(durationDeltaSeconds) <= 3;
    let auditStatus = "needs_review";
    if (exactTitle && exactDuration) auditStatus = "exact_match";
    else if (closeDuration && (sameTitleBody || sameCode || tokenOverlap >= 0.75)) auditStatus = "verified_equivalent";

    matches.push({
      course,
      section: expected.section,
      expectedTitle: expected.title,
      expectedDuration: expected.duration,
      expectedSeconds,
      teachableUrl: expected.url,
      status: best.score >= 750 ? "verified" : "reviewed_match",
      auditStatus,
      score: Math.round(best.score),
      videoId: best.video.guid,
      candidateCollection: best.video.collectionName,
      candidateTitle: best.video.title,
      candidateSeconds: actualSeconds,
      durationDeltaSeconds,
      exactTitle,
      sameTitleBody,
      sameCode,
      tokenOverlap: Number(tokenOverlap.toFixed(3)),
      crossFamilyReuse: !best.video.collectionName.startsWith(family),
      bunnyStatus: Number(best.video.status),
      bunnyStorageSize: Number(best.video.storageSize) || 0,
    });
  }
  courseLessons[course].sort((a, b) => (a.topic - b.topic) || naturalSort(a, b));
}

const uniqueVideoIds = new Set(Object.values(courseLessons).flat().map((lesson) => lesson.id));
const selectedVideos = candidateVideos.filter((video) => uniqueVideoIds.has(video.guid));
const collections = {};
for (const video of selectedVideos) {
  const parsed = splitTitle(video.title);
  const presentation = presentationOverrides.get(video.guid) || {};
  (collections[video.collectionName] ??= []).push({ id: video.guid, code: presentation.code || parsed.code, title: presentation.title || parsed.title, seconds: Number(video.length) || 0, status: Number(video.status) });
}
for (const lessons of Object.values(collections)) lessons.sort(naturalSort);

const data = {
  libraryId,
  generatedAt: new Date().toISOString(),
  stats: {
    videos: selectedVideos.length,
    seconds: selectedVideos.reduce((sum, video) => sum + (Number(video.length) || 0), 0),
    storageBytes: selectedVideos.reduce((sum, video) => sum + (Number(video.storageSize) || 0), 0),
  },
  topicNames: { 1: "Number and algebra", 2: "Functions", 3: "Geometry and trigonometry", 4: "Statistics and probability", 5: "Calculus" },
  courses: courseLessons,
  collections,
};

const unmatched = matches.filter((item) => item.status === "unmatched");
const audit = {
  generatedAt: data.generatedAt,
  source: snapshotPath || "Bunny Stream API",
  expectedCatalogPath,
  sourceVideos: sourceVideos.length,
  readyCourseCandidates: readyCandidates.length,
  uniqueStudentFacingVideos: selectedVideos.length,
  courseLessonCounts: Object.fromEntries(courseOrder.map((course) => [course, courseLessons[course].length])),
  suppressedVideoIds: [...suppressedVideoIds],
  suppressedExpectedLessons: [...suppressedExpectedLessons],
  duplicateCandidatesRemoved: readyCandidates.length - candidateVideos.length,
  unmatchedCount: unmatched.length,
  reviewedMatchCount: matches.filter((item) => item.status === "reviewed_match").length,
  crossFamilyReuse: matches.filter((item) => {
    const family = item.course?.slice(0, 2);
    return item.candidateCollection && !item.candidateCollection.startsWith(family);
  }),
  unmatched,
  reviewedMatches: matches.filter((item) => item.status === "reviewed_match"),
  placements: matches,
};

writeFileSync(new URL("./dist/library-data.js", import.meta.url), `window.MR_FLYNN_LIBRARY = ${JSON.stringify(data, null, 2)};\n`);
writeFileSync(new URL("./dist/video-audit-data.js", import.meta.url), `window.MR_FLYNN_VIDEO_AUDIT = ${JSON.stringify(audit, null, 2)};\n`);
writeFileSync(new URL("./library-data-audit.json", import.meta.url), `${JSON.stringify(audit, null, 2)}\n`);
console.log(`Generated ${data.stats.videos} unique ready videos; ${matches.filter((item) => item.status === "suppressed_by_review").length} duplicate catalogue placement(s) suppressed by review.`);
if (unmatched.length) process.exitCode = 1;
