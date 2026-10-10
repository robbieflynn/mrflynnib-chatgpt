import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const choices = require("../public/question-bank/assignment-choice-utils.js");

function extractSeed(path) {
  const source = readFileSync(path, "utf8");
  const marker = "var SEED = [";
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Question data was not found in ${path}`);
  const start = source.indexOf("[", markerIndex);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error(`Question data did not close in ${path}`);
}

function promptByPart(question) {
  const prompts = new Map();
  const parts = Array.isArray(question.parts) && question.parts.length
    ? question.parts
    : [["", question.body || question.title || ""]];
  for (const part of parts) prompts.set(String(part[0] || "").toLowerCase(), String(part[1] || ""));
  return prompts;
}

const banks = [
  ["IB", "public/question-bank/ib-bank.html"],
  ["IGCSE", "public/question-bank/igcse-bank.html"],
];

const wholeNumberExample = choices.generateChoiceSet(["25"], "audit-integer");
assert(wholeNumberExample);
assert.deepEqual(new Set(wholeNumberExample.options), new Set(["25", "28", "18", "53", "7"]));
const degreeExample = choices.generateChoiceSet(["42.5^circ"], "audit-degrees");
assert(degreeExample && degreeExample.options.every(choices.isDisplaySafe));
assert.equal(degreeExample.acceptedAnswers[0], "42.5°");
const areaExample = choices.generateChoiceSet(["31.0 (mathrmcm^2)"], "audit-area");
assert(areaExample && areaExample.options.every((option) => !/(?:mathrm|\\|\^circ)/i.test(option)));
const radicalExample = choices.generateChoiceSet(["sqrt(8)"], "audit-radical");
assert(radicalExample && radicalExample.options.every(choices.isDisplaySafe));
assert.equal(choices.generateChoiceSet(["1/4/2"], "audit-malformed"), null);

const lineAnswers = choices.extractAcceptedAnswers([[String.raw`\(y=-4x+25\)`, "A1"]], "Find the equation of the normal.");
assert.equal(lineAnswers[0], "y=-4x+25");
assert(choices.generateChoiceSet(lineAnswers, "audit-line-equation"));

const derivativeAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(\dfrac{dy}{dx}=\dfrac{2-k}{4k-1}\)`, "A1"]],
  "Find the derivative."
);
assert.equal(derivativeAnswers[0], "dy/dx=(2-k)/(4k-1)");
const derivativeLatex = choices.toLatex(derivativeAnswers[0]);
assert.equal(derivativeLatex, String.raw`\frac{dy}{dx}=\frac{\left(2-k\right)}{\left(4k-1\right)}`);
assert(!derivativeLatex.includes("/"));
assert(choices.generateChoiceSet(derivativeAnswers, "audit-implicit-differentiation"));

const constantAnswers = choices.extractAcceptedAnswers([[String.raw`\(k=\dfrac14\)`, "A1"]], "Find k.");
assert.equal(constantAnswers[0], "k=1/4");
assert.equal(choices.toLatex(constantAnswers[0]), String.raw`k=\frac{1}{4}`);
assert.equal(choices.toLatex("1/4 cm"), String.raw`\frac{1}{4}\,\mathrm{cm}`);
assert.deepEqual(choices.extractAcceptedAnswers([[String.raw`\(x=3\)`, "A1"]], "Show that x is 3."), []);

const integralAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(\displaystyle\int_1^2\left(f(x)\right)^2\,dx = \dfrac{31}{5}\ (= 6.2)\)`, "A1"]],
  String.raw`Find \(\displaystyle\int_1^2\left(f(x)\right)^2\,dx\).`
);
assert.equal(integralAnswers[0], "31/5");
assert(!integralAnswers.some((answer) => /(?:displaystyle|\bint\b)/i.test(answer)));
assert(choices.generateChoiceSet(integralAnswers, "audit-definite-integral"));

const pairedInterceptAnswers = choices.extractAcceptedAnswers(
  [
    [String.raw`recognizing \(f(x)=0\)`, "M1"],
    [String.raw`\(x=\pm\sqrt5\) (exact), \(x=\pm 2.24\)`, "A1A1"],
  ],
  String.raw`Find the \(x\)-coordinate of \(\mathrm{A}\) and of \(\mathrm{B}\).`,
);
assert(pairedInterceptAnswers.includes("x=±sqrt(5)"));
assert(pairedInterceptAnswers.includes("x=±2.24"));
const pairedInterceptChoices = choices.generateChoiceSet(pairedInterceptAnswers, "M14TZ2SL_P2_Q2:a");
assert(pairedInterceptChoices);
assert(pairedInterceptChoices.options.every((option) => !/^-?\([^)]*=/.test(option)));

let checked = 0;
let generated = 0;
let verifiedLineQuestion = false;
let verifiedPairedInterceptQuestion = false;
for (const [label, path] of banks) {
  const questions = extractSeed(path);
  let bankChecked = 0;
  let bankGenerated = 0;
  for (const question of questions) {
    const prompts = promptByPart(question);
    for (const [part, rows] of Array.isArray(question.markscheme) ? question.markscheme : []) {
      const prompt = prompts.get(String(part || "").toLowerCase()) || question.body || question.title || "";
      const accepted = choices.extractAcceptedAnswers(rows, prompt);
      if (question.id === "M15TZ2HL_P2_Q11" && part === "b") {
        assert.equal(accepted[0], "y = -4x+25");
        assert(choices.toLatex(accepted[0]).startsWith("y="));
        verifiedLineQuestion = true;
      }
      if (question.id === "M15TZ2HL_P2_Q11" && part === "c") {
        assert.equal(accepted[0], "2sqrt(2)");
      }
      if (question.id === "M14TZ2SL_P2_Q2" && part === "a") {
        assert(accepted.includes("x = ±sqrt(5)"));
        assert(accepted.includes("x = ±2.24"));
        assert(choices.generateChoiceSet(accepted, `${question.id}:${part}`));
        verifiedPairedInterceptQuestion = true;
      }
      if (!accepted.length) continue;
      bankChecked += 1;
      const set = choices.generateChoiceSet(accepted, `${question.id}:${part}`);
      if (!set) continue;
      if (!choices.validateChoiceSet(accepted, set.options, set.correctOption)) throw new Error(`Unsafe choices for ${question.id} ${part}`);
      if (set.options.some((option) => choices.toLatex(option).includes("/"))) throw new Error(`Unrendered fraction for ${question.id} ${part}`);
      bankGenerated += 1;
    }
  }
  checked += bankChecked;
  generated += bankGenerated;
  console.log(`${label}: ${bankGenerated}/${bankChecked} mark-scheme answer groups produced five safe choices.`);
}

assert(verifiedLineQuestion, "The real equation-of-a-normal regression question was not audited.");
assert(verifiedPairedInterceptQuestion, "The real paired-intercepts regression question was not audited.");
console.log(`Total: ${generated}/${checked} mark-scheme answer groups produced five safe choices; every generated set passed notation, duplicate and accepted-answer checks.`);
