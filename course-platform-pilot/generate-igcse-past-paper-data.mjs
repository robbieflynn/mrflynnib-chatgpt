import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.resolve("public/learn/igcse-past-paper-data.js");
const accessPath = process.argv[4] || path.resolve("src/data/course-video-access.json");

if (!inputPath) {
  throw new Error("Usage: node generate-igcse-past-paper-data.mjs <igcse-past-paper-audit.csv> [output.js] [course-video-access.json]");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift();
  return rows
    .filter((item) => item.length > 1)
    .map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index] ?? ""])));
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const rows = parseCsv(fs.readFileSync(inputPath, "utf8"))
  .filter((row) => row.bunnyStatus === "Ready" && /^[0-9a-f-]{36}$/i.test(row.bunnyGuid));

const papers = rows.map((row) => {
  const match = row.title.match(/^(\d{4})\s+(January|May|June|November)\s+(?:Paper\s+)?(\d+)(H|HR)$/i);
  if (!match) throw new Error(`Unrecognised paper title: ${row.title}`);
  const [, year, month, paperNumber, tier] = match;
  const paper = `Paper ${paperNumber}${tier.toUpperCase()}`;
  return {
    id: `igcse-${slug(`${month}-${year}-${paper}`)}`,
    session: `${month} ${year}`,
    timezone: "",
    paper,
    collection: row.bunnyCollection,
    fullPaper: true,
    questions: [{
      id: row.bunnyGuid,
      title: "Complete worked solution",
      seconds: Number(row.bunnyLengthSeconds) || 0,
    }],
  };
});

const data = {
  libraryId: "775873",
  source: "Verified Teachable IGCSE full-paper videos matched to ready Bunny assets",
  generatedAt: new Date().toISOString(),
  stats: { IGCSE: { papers: papers.length, questions: papers.length } },
  courses: { IGCSE: papers },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `window.MR_FLYNN_IGCSE_PAST_PAPERS = ${JSON.stringify(data)};\n`);

const access = JSON.parse(fs.readFileSync(accessPath, "utf8"));
if (!access.courses?.igcse) throw new Error("The IGCSE video access map is missing");
access.courses.igcse.pastPapers = rows.map((row) => row.bunnyGuid);
access.courses.igcse.freePastPapers = [];
fs.writeFileSync(accessPath, `${JSON.stringify(access, null, 2)}\n`);

console.log(`Generated ${papers.length} IGCSE full-paper video entries.`);
