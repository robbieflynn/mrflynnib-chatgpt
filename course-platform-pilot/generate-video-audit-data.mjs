import fs from "node:fs";

const courseAuditPath = process.argv[2];
const pastPaperDataPath = process.argv[3];
const reconciliationPath = process.argv[4];
const snapshotPath = process.argv[5];
const outputPath = process.argv[6] || new URL("./dist/video-audit-data.js", import.meta.url);

if (!courseAuditPath || !pastPaperDataPath || !reconciliationPath || !snapshotPath) {
  throw new Error("Usage: node generate-video-audit-data.mjs <course-audit.json> <past-paper-data.js> <reconciliation.json> <bunny-snapshot.json> [output.js]");
}

const courseAudit = JSON.parse(fs.readFileSync(courseAuditPath, "utf8"));
const pastPaperData = JSON.parse(fs.readFileSync(pastPaperDataPath, "utf8")
  .replace(/^window\.MR_FLYNN_PAST_PAPERS\s*=\s*/, "")
  .replace(/;\s*$/, ""));
const reconciliation = JSON.parse(fs.readFileSync(reconciliationPath, "utf8"));
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const liveById = new Map(snapshot.videos.map((video) => [video.guid, video]));
const ibCourses = new Set(["AA SL", "AA HL", "AI SL", "AI HL"]);

const durationSeconds = (value) => String(value || "").split(":").reduce((total, part) => (total * 60) + Number(part || 0), 0);
const normalize = (value) => String(value || "")
  .toLowerCase()
  .replace(/\.(mov|m4v|mp4|avi|mkv|webm)$/i, "")
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const cleanBunnyQuestionTitle = (video) => {
  const prefix = `${video.collectionName} – `;
  return String(video.title || "")
    .replace(prefix, "")
    .replace(/\s*\([^)]*sl\)\s*/gi, " ")
    .replace(/\s+complete\s*$/i, "")
    .trim();
};

const websitePastPaperMap = new Map();
for (const [course, sets] of Object.entries(pastPaperData.courses || {})) {
  for (const set of sets) {
    for (const question of set.questions) {
      websitePastPaperMap.set(`${course}|${set.collection}|${normalize(question.title)}`, { course, set, question });
    }
  }
}

const coursePlacements = courseAudit.placements.map((row) => ({
  ...row,
  contentType: "Course lesson",
  previewPresent: true,
  topic: String(row.section || "").replace(/^Topic\s+/i, ""),
}));

const pastPaperPlacements = reconciliation
  .filter((row) => row.category === "past_paper" && ibCourses.has(row.courses))
  .map((row) => {
    const key = `${row.courses}|${row.bunnyCollection}|${normalize(row.teachableTitle)}`;
    const selected = websitePastPaperMap.get(key);
    if (!selected) {
      return {
        contentType: "Past-paper solution",
        course: row.courses,
        section: row.section,
        topic: row.section,
        expectedTitle: row.teachableTitle,
        expectedDuration: row.teachableDuration,
        expectedSeconds: durationSeconds(row.teachableDuration),
        teachableUrl: row.teachableUrl,
        previewPresent: false,
        auditStatus: "missing_from_preview",
        sourceReconciliationStatus: row.status,
        suggestedVideoId: row.videoId || "",
        suggestedBunnyTitle: row.bunnyTitle || "",
        suggestedCollection: row.bunnyCollection || "",
        score: Number(row.score) || 0,
      };
    }

    const video = liveById.get(selected.question.id) || {
      guid: selected.question.id,
      title: row.bunnyTitle,
      collectionName: selected.set.collection,
      length: selected.question.seconds,
      status: 4,
      storageSize: 0,
    };
    const expectedSeconds = durationSeconds(row.teachableDuration);
    const actualSeconds = Number(video.length || selected.question.seconds) || 0;
    const durationDeltaSeconds = actualSeconds - expectedSeconds;
    const cleanedBunnyTitle = cleanBunnyQuestionTitle(video);
    const exactTitle = normalize(cleanedBunnyTitle) === normalize(row.teachableTitle);
    const closeDuration = Math.abs(durationDeltaSeconds) <= 3;
    let auditStatus = "needs_review";
    if (exactTitle && closeDuration) auditStatus = "exact_match";
    else if (closeDuration && row.status === "verified_match") auditStatus = "verified_equivalent";
    return {
      contentType: "Past-paper solution",
      course: row.courses,
      section: row.section,
      topic: row.section,
      expectedTitle: row.teachableTitle,
      expectedDuration: row.teachableDuration,
      expectedSeconds,
      teachableUrl: row.teachableUrl,
      previewPresent: true,
      auditStatus,
      sourceReconciliationStatus: row.status,
      videoId: video.guid,
      candidateCollection: video.collectionName || selected.set.collection,
      candidateTitle: video.title || row.bunnyTitle,
      candidateSeconds: actualSeconds,
      durationDeltaSeconds,
      exactTitle,
      sameTitleBody: exactTitle,
      sameCode: true,
      tokenOverlap: exactTitle ? 1 : 0,
      crossFamilyReuse: false,
      bunnyStatus: Number(video.status) || 4,
      bunnyStorageSize: Number(video.storageSize) || 0,
      score: Number(row.score) || 0,
    };
  });

const placements = [...coursePlacements, ...pastPaperPlacements];
const counts = {};
for (const row of placements) counts[row.auditStatus] = (counts[row.auditStatus] || 0) + 1;
const output = {
  generatedAt: new Date().toISOString(),
  sourceSnapshotGeneratedAt: snapshot.summary?.generatedAt || "",
  libraryId: pastPaperData.libraryId || "775873",
  source: "Private course preview compared with the Teachable-aligned catalogue and Bunny snapshot",
  counts,
  placements,
};

fs.writeFileSync(outputPath, `window.MR_FLYNN_VIDEO_AUDIT = ${JSON.stringify(output, null, 2)};\n`);
console.log(JSON.stringify({ outputPath: String(outputPath), placements: placements.length, counts }, null, 2));
