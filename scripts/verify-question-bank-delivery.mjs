import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const manifest = JSON.parse(await readFile("public/question-bank/data/manifest.json", "utf8"));
const ibQuestions = JSON.parse(await readFile("question-bank-data/ib-seed.json", "utf8"));
const igcseQuestions = JSON.parse(await readFile("question-bank-data/igcse-seed.json", "utf8"));
const ibHtml = await readFile("public/question-bank/ib-bank.html", "utf8");
const igcseHtml = await readFile("public/question-bank/igcse-bank.html", "utf8");

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
  console.log(`${course}: ${delivered.length} source records preserved`);
}

assert(igcseHtml.includes(`var SEED = [{`), "IGCSE compact seed is missing");
console.log(`IGCSE: ${igcseQuestions.length} source records preserved`);
console.log("Question-bank delivery verification passed.");
