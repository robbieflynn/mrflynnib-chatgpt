import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import vm from "node:vm";

const manifest = JSON.parse(await readFile("public/question-bank/data/manifest.json", "utf8"));
const ibQuestions = JSON.parse(await readFile("question-bank-data/ib-seed.json", "utf8"));
const igcseQuestions = JSON.parse(await readFile("question-bank-data/igcse-seed.json", "utf8"));
const ibHtml = await readFile("public/question-bank/ib-bank.html", "utf8");
const igcseHtml = await readFile("public/question-bank/igcse-bank.html", "utf8");
const nextConfig = await readFile("next.config.ts", "utf8");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

assert.equal(await exists("public/question-bank/ai-bank.html"), false, "Legacy AI bank must not be deployed as a duplicate payload");
assert.equal(await exists("public/question-bank/bank.html"), false, "Legacy generic bank must not be deployed as a duplicate payload");
assert(nextConfig.includes('{ source: "/question-bank/ai-bank.html", destination: "/question-bank", permanent: false }'), "Legacy AI bank lost its safe redirect");
assert(nextConfig.includes('{ source: "/question-bank/bank.html", destination: "/question-bank", permanent: false }'), "Legacy generic bank lost its safe redirect");
assert(nextConfig.includes('source: "/question-bank/ib-bank.html"'), "IB bank lost its CDN cache policy");
assert(nextConfig.includes('source: "/question-bank/igcse-bank.html"'), "IGCSE bank lost its CDN cache policy");

function banksOf(question) {
  return question.banks === undefined ? [question.course] : question.banks;
}

function assertUniqueIds(label, questions) {
  const ids = questions.map((question) => String(question.id));
  assert.equal(new Set(ids).size, ids.length, `${label} contains duplicate question IDs`);
}

assertUniqueIds("IB source", ibQuestions);
assertUniqueIds("IGCSE source", igcseQuestions);
assert.equal(manifest.ib.sourceQuestions, ibQuestions.length);
assert.equal(manifest.igcse.sourceQuestions, igcseQuestions.length);
assert.equal((ibHtml.match(/QUESTION_BANK_DATA_LOADER/g) || []).length, 1, "IB must contain one data loader");
assert.equal((igcseHtml.match(/QUESTION_BANK_DATA_LOADER/g) || []).length, 0, "IGCSE must stay self-contained");
assert(ibHtml.includes('/question-bank/starred.js'), "IB shell lost the account-wide starred-question feature");
assert(igcseHtml.includes('/question-bank/starred.js'), "IGCSE shell lost the account-wide starred-question feature");
assert(ibHtml.includes('/question-bank/whiteboard.js'), "IB shell lost the shared whiteboard");
assert(igcseHtml.includes('/question-bank/whiteboard.js'), "IGCSE shell lost the shared whiteboard");
assert(ibHtml.includes('id="qb-search"'), "IB shell lost question search");
assert(igcseHtml.includes('id="qb-search"'), "IGCSE shell lost question search");
assert(ibHtml.includes("root.offsetTop + root.scrollHeight"), "IB shell lost the footer-clipping height guard");
assert(igcseHtml.includes("root.offsetTop + root.scrollHeight"), "IGCSE shell lost the footer-clipping height guard");
assert(ibHtml.includes("var deliveryCounts = window.__MR_FLYNN_QB_COUNTS__"), "IB course chooser lost full-bank counts");
assert(ibHtml.includes("return loader(c).then(function(questions)"), "IB course switching no longer loads the selected bank");

const courses = {
  "AA HL": "aahl",
  "AA SL": "aasl",
  "AI HL": "aihl",
  "AI SL": "aisl",
};

for (const [course, key] of Object.entries(courses)) {
  const assetUrl = manifest.ib.assets[key];
  assert(assetUrl, `Missing generated asset for ${course}`);
  assert(ibHtml.includes(assetUrl), `IB loader does not reference the current ${course} asset`);

  const sandbox = { window: {} };
  vm.runInNewContext(await readFile(`public${assetUrl}`, "utf8"), sandbox);
  const delivered = sandbox.window.__MR_FLYNN_QB_DATA__?.[key];
  assert(Array.isArray(delivered), `${course} asset did not register its question data`);

  const expectedIds = ibQuestions.filter((question) => banksOf(question).includes(course)).map((question) => question.id);
  assert.deepEqual(Array.from(delivered, (question) => question.id), expectedIds, `${course} IDs or ordering changed`);
  assert(delivered.some((question) => question.id === "N12TZ0HL_P1_Q7") === expectedIds.includes("N12TZ0HL_P1_Q7"), `${course} lost retained assignment question IDs`);
  console.log(`${course}: ${delivered.length} source records preserved`);
}

assert(igcseHtml.includes(`var SEED = [{`), "IGCSE compact seed is missing");

const correctedNonRightIds = [
  "4MA1_2018M_2H_Q18",
  "4MA1_2019J_2HR_Q19",
  "4MA1_2020J_1H_Q14",
  "4MA1_2021M_2H_Q18",
  "4MA1_2021N_2H_Q18",
  "4MA1_2022M_1H_Q18",
  "4MA1_2022M_1HR_Q17",
  "4MA1_2023J_1H_Q16",
];
for (const id of correctedNonRightIds) {
  const question = igcseQuestions.find((candidate) => candidate.id === id);
  assert(question, `IGCSE classification audit lost ${id}`);
  assert(
    question.topics?.some((topic) => topic.sub === "Non-right-angled trigonometry"),
    `IGCSE classification audit put ${id} back into right-angled trigonometry`,
  );
}

console.log(`IGCSE: ${igcseQuestions.length} source records preserved`);
console.log("Question-bank delivery verification passed.");
