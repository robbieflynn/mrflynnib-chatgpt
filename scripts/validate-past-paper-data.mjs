import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const dataPath = path.join(root, "course-platform-pilot", "dist", "past-paper-data.js");
const igcseDataPath = path.join(root, "course-platform-pilot", "dist", "igcse-past-paper-data.js");
const accessPath = path.join(root, "src", "data", "course-video-access.json");
const sandbox = { window: {} };

vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), sandbox);
vm.runInNewContext(fs.readFileSync(igcseDataPath, "utf8"), sandbox);

const catalogue = sandbox.window.MR_FLYNN_PAST_PAPERS;
const igcseCatalogue = sandbox.window.MR_FLYNN_IGCSE_PAST_PAPERS;
const access = JSON.parse(fs.readFileSync(accessPath, "utf8"));
const failures = [];

function questionNumber(title) {
  return Number(String(title || "").match(/^Question\s+(\d+)/i)?.[1] || 0);
}

const igcsePapers = igcseCatalogue.courses?.IGCSE || [];
const igcseAllowed = new Set(access.courses?.igcse?.pastPapers || []);
const igcseIds = new Set();
for (const paper of igcsePapers) {
  if (!paper.fullPaper) failures.push(`${paper.id}: IGCSE entry is not marked as a full-paper solution`);
  if (paper.questions?.length !== 1) failures.push(`${paper.id}: expected one complete worked video`);
  for (const video of paper.questions || []) {
    if (igcseIds.has(video.id)) failures.push(`${paper.id}: duplicate IGCSE video ${video.id}`);
    igcseIds.add(video.id);
    if (!igcseAllowed.has(video.id)) failures.push(`${paper.id}: complete video is missing from secure playback access`);
  }
}
if (igcseCatalogue.stats?.IGCSE?.papers !== igcsePapers.length) failures.push("IGCSE: paper count is stale");
if (igcseCatalogue.stats?.IGCSE?.questions !== igcseIds.size) failures.push("IGCSE: solution count is stale");

function expectedNumbers(course, paperId) {
  if (course === "AI HL" && paperId === "ai-hl-specimen-paper-1") return 18;
  if (course === "AI HL" && paperId === "ai-hl-may-2023-tz1-paper-1") return 17;
  return 0;
}

for (const [course, papers] of Object.entries(catalogue.courses || {})) {
  const courseId = course.toLowerCase().replaceAll(" ", "-");
  const allowed = new Set(access.courses?.[courseId]?.pastPapers || []);
  const free = new Set(access.courses?.[courseId]?.freePastPapers || []);
  const paperIds = new Set();
  let questionCount = 0;

  for (const paper of papers) {
    if (paperIds.has(paper.id)) failures.push(`${course}: duplicate paper set ${paper.id}`);
    paperIds.add(paper.id);

    const numbers = new Set();
    for (const question of paper.questions || []) {
      questionCount += 1;
      const number = questionNumber(question.title);
      if (!number) failures.push(`${paper.id}: invalid question label "${question.title}"`);
      numbers.add(number);
      if (!allowed.has(question.id)) failures.push(`${paper.id}: ${question.title} is missing from secure playback access`);
      if ((paper.session === "Specimen" || paper.session === "May 2021") && !free.has(question.id)) {
        failures.push(`${paper.id}: free ${question.title} is missing from free playback access`);
      }
    }

    const maximum = expectedNumbers(course, paper.id) || Math.max(...numbers);
    for (let number = 1; number <= maximum; number += 1) {
      if (!numbers.has(number)) failures.push(`${paper.id}: missing Question ${number}`);
    }
  }

  if (catalogue.stats?.[course]?.papers !== papers.length) failures.push(`${course}: paper count is stale`);
  if (catalogue.stats?.[course]?.questions !== questionCount) failures.push(`${course}: solution count is stale`);
}

if (failures.length) {
  console.error(`Past-paper catalogue validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Past-paper catalogue validation passed.");
