import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";

const read = (file) => readFileSync(file, "utf8");
const html = read("public/question-bank/ib-bank.html");
const loader = html.split("<!-- QUESTION_BANK_DATA_LOADER:")[1].split("<script>")[1].split("</script>")[0];
const manifest = JSON.parse(read("public/question-bank/data/manifest.json"));
const source = JSON.parse(read("question-bank-data/ib-seed.json"));
const data = { window: {} };
for (const file of ["public/learn/library-data.js", "public/learn/igcse-library-data.js", "public/learn/practice-data.js", "public/question-bank/authored-practice-data.js"]) {
  vm.runInNewContext(read(file), data);
}
const authored = data.window.MR_FLYNN_AUTHORED_PRACTICE;
const canonical = new Map([...source, ...authored].map((question) => [question.id, question]));
const plain = (value) => JSON.parse(JSON.stringify(value));
const solutionIndex = JSON.parse(html.match(/  var SOLUTION_INDEX = (.*);/)[1]);
const solutionFunctions = html.slice(html.indexOf("  function solutionCourse(q){"), html.indexOf("  function loadSolution(q, ok, fail){"));
const solutionContext = vm.createContext({
  state: { course: "AA SL" }, IS_PRACTICE: true, REQUESTED_IDS: new Set(),
  COURSE_ORDER: Object.keys(solutionIndex),
  SOLUTION_HAS: Object.fromEntries(Object.entries(solutionIndex).map(([course, entry]) => [course, Object.fromEntries(entry.ids.map((id) => [id, 1]))])),
  banksOf: (question) => question.banks ?? [question.course],
});
vm.runInContext(solutionFunctions, solutionContext);

function fixture(course, ids = [], { practice = true, failSupplement = false } = {}) {
  const params = new URLSearchParams({ course });
  if (practice) params.set("practice", "1");
  if (ids.length) params.set("ids", ids.join(","));
  const requests = [];
  let fail = failSupplement;
  const context = vm.createContext({
    URLSearchParams,
    window: { location: { search: `?${params}` }, MR_FLYNN_AUTHORED_PRACTICE: authored },
    document: {
      write(markup) { load(markup.match(/src="([^"]+)"/)[1]); },
      createElement() { return {}; },
      head: { appendChild(script) {
        if (fail && script.src === manifest.ib.assets.practice) {
          fail = false;
          requests.push(script.src);
          queueMicrotask(() => script.onerror());
        } else {
          load(script.src);
          queueMicrotask(() => script.onload());
        }
      } },
    },
  });
  function load(url) {
    requests.push(url);
    vm.runInContext(read(`public${url}`), context);
  }
  vm.runInContext(loader, context);
  return { requests, context, load: (selected = course) => context.window.__MR_FLYNN_QB_LOAD_COURSE__(selected) };
}

let placements = 0;
for (const [course, lessons] of Object.entries(data.window.MR_FLYNN_LIBRARY.courses)) {
  const selections = lessons.map((lesson) => data.window.MR_FLYNN_PRACTICE.lessons[lesson.id]).filter(Boolean);
  const ids = [...new Set(selections.flatMap((practice) => Array.from(practice.questionIds)))];
  const bank = fixture(course, ids);
  const questions = await bank.load();
  const byId = new Map(questions.map((question) => [question.id, question]));
  solutionContext.state.course = course;
  solutionContext.REQUESTED_IDS = new Set(ids);
  assert.equal(byId.size, questions.length, `${course}: duplicate IDs`);
  for (const practice of selections) {
    placements++;
    for (const id of practice.questionIds) {
      assert(byId.has(id), `${course}: selected practice question ${id} is missing`);
      assert.deepEqual(plain(byId.get(id)), plain(canonical.get(id)), `${id}: content or difficulty changed`);
      const solutionCourse = solutionContext.solutionCourse(byId.get(id));
      if (Object.values(solutionIndex).some((entry) => entry.ids.includes(id))) {
        assert(solutionCourse, `${course}: worked solution missing for ${id}`);
        assert(existsSync(`public/question-bank/solutions/${solutionIndex[solutionCourse].dir}/${id}.js`));
      }
    }
  }
  const publicBank = fixture(course, ids, { practice: false });
  const ordinary = await publicBank.load();
  const expected = source.filter((question) => (question.banks ?? [question.course]).includes(course));
  assert.deepEqual(plain(ordinary), expected, `${course}: public delivery changed`);
  assert.equal(publicBank.requests.length, 1, "Ordinary banks and assignments must not load the practice supplement");
  // Switching away must not put supplemental records into the cached course asset.
  for (const [name, key] of Object.entries({ "AA HL": "aahl", "AA SL": "aasl", "AI HL": "aihl", "AI SL": "aisl" })) {
    await publicBank.load(name);
    assert.deepEqual(plain(publicBank.context.window.__MR_FLYNN_QB_DATA__[key]), source.filter((q) => (q.banks ?? [q.course]).includes(name)));
  }
}

const inflationIds = ["A_M25TZ2HL_P2_Q4", "W_M22TZ2AIHL_P1_Q11"];
const inflation = fixture("AA SL", inflationIds);
const result = await inflation.load();
assert.equal(result.filter((question) => inflationIds.includes(question.id)).length, 2);
assert.equal(inflation.requests.filter((url) => url === manifest.ib.assets.practice).length, 1);
await inflation.load();
assert.equal(inflation.requests.length, 2, "Repeated loads reuse the course and supplemental asset");
const ownId = source.find((q) => (q.banks ?? [q.course]).includes("AA SL")).id;
const own = fixture("AA SL", [ownId]);
await own.load();
assert.equal(own.requests.length, 1, "Existing course questions need no extra download");
const retry = fixture("AA SL", inflationIds, { failSupplement: true });
await assert.rejects(retry.load(), /Could not load/);
assert.equal((await retry.load()).filter((q) => inflationIds.includes(q.id)).length, 2, "Failed downloads can retry");
const unknown = fixture("AA SL", ["missing-qa-id"]);
await assert.rejects(unknown.load(), /Some lesson practice questions/, "Unknown IDs must fail clearly instead of silently disappearing");
solutionContext.IS_PRACTICE = false;
solutionContext.state.course = "AA SL";
assert.equal(solutionContext.solutionCourse(canonical.get(inflationIds[0])), "", "Public bank solution selection must not cross course boundaries");
const igcseIds = new Set([...JSON.parse(read("question-bank-data/igcse-seed.json")), ...authored].map((q) => q.id));
let igcsePlacements = 0;
for (const lesson of data.window.MR_FLYNN_IGCSE_LIBRARY.lessons) {
  const practice = data.window.MR_FLYNN_PRACTICE.lessons[lesson.id];
  if (!practice) continue;
  igcsePlacements++;
  for (const id of practice.questionIds) assert(igcseIds.has(id), `IGCSE practice missing ${id}`);
}
console.log(`PASS: every selected question in ${placements} IB lesson placements is delivered with unchanged content and difficulty.`);
console.log(`PASS: existing worked solutions resolve in the viewing course or their source bank; ${igcsePlacements} IGCSE practice selections remain available.`);
console.log("PASS: public bank and assignment payloads unchanged; course switches, authored cards, caching and retry preserved.");
