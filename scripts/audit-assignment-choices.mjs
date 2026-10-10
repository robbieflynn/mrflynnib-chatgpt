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

function plainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function romanSubparts(prompt) {
  const labels = [];
  const sequence = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  const pattern = /\(([ivxlcdm]+)\)/gi;
  let match;
  while ((match = pattern.exec(plainText(prompt)))) {
    const label = match[1].toLowerCase();
    if (label === sequence[labels.length]) labels.push(label);
  }
  return labels.includes("i") && labels.includes("ii") ? labels : [];
}

function rowsForSubpart(rows, label) {
  let start = -1;
  let end = rows.length;
  rows.forEach((row, index) => {
    const match = plainText(Array.isArray(row) ? row[0] : "").match(/^\s*\(([ivxlcdm]+)\)/i);
    if (!match) return;
    if (match[1].toLowerCase() === label && start === -1) start = index;
    else if (start !== -1 && index > start && end === rows.length) end = index;
  });
  return start === -1 ? [] : rows.slice(start, end);
}

function promptForSubpart(prompt, label) {
  const source = plainText(prompt);
  const marker = new RegExp(`\\(${label}\\)`, "i");
  const start = source.search(marker);
  if (start === -1) return source;
  const remainder = source.slice(start + label.length + 2);
  const labels = romanSubparts(prompt);
  const nextLabel = labels[labels.indexOf(label) + 1];
  const next = nextLabel ? remainder.search(new RegExp(`\\(${nextLabel}\\)`, "i")) : -1;
  return next === -1 ? remainder : remainder.slice(0, next);
}

function choiceSetForRows(rows, prompt, seed) {
  return choices.generateComparisonReasonChoiceSet(rows, prompt, seed)
    || choices.generateParityChoiceSet(rows, prompt, seed)
    || choices.generateChoiceSet(choices.extractAcceptedAnswers(rows, prompt), seed);
}

function looksObjective(prompt) {
  const text = plainText(prompt);
  return /\b(find|calculate|write down|state|determine|solve|evaluate|express|give)\b/i.test(text)
    && !/\b(show that|prove|sketch|draw|construct|plot|explain|justify|give a reason|describe|discuss|interpret|comment on)\b/i.test(text);
}

const banks = [
  ["IB", "public/question-bank/ib-bank.html"],
  ["IGCSE", "public/question-bank/igcse-bank.html"],
];

const progressManifest = JSON.parse(readFileSync("src/data/question-bank-progress.json", "utf8"));
const activeQuestionIds = {
  IB: new Set(Object.values(progressManifest.courses || {}).flatMap((course) => course.questionIds || [])),
  IGCSE: new Set(progressManifest.igcse && progressManifest.igcse.questionIds || []),
};

function assignmentPartConfigs(question) {
  if (!question || !Array.isArray(question.markscheme)) return [];
  const markschemeByPart = new Map(question.markscheme
    .filter(Array.isArray)
    .map((group) => [String(group[0] || "").toLowerCase(), Array.isArray(group[1]) ? group[1] : []]));
  const parts = Array.isArray(question.parts) && question.parts.length
    ? question.parts
    : [["", question.body || question.title || "", question.marks]];
  const configs = [];
  for (const part of parts) {
    const topLabel = String(part[0] || "").toLowerCase();
    const prompt = String(part[1] || "");
    const rows = markschemeByPart.get(topLabel) || [];
    const nested = romanSubparts(prompt);
    if (nested.length) {
      for (const nestedLabel of nested) {
        const nestedPrompt = promptForSubpart(prompt, nestedLabel);
        const labelledRows = rowsForSubpart(rows, nestedLabel);
        const nestedRows = labelledRows.length ? labelledRows : rows;
        const label = topLabel ? `${topLabel}(${nestedLabel})` : nestedLabel;
        const accepted = choices.extractAcceptedAnswers(nestedRows, nestedPrompt);
        configs.push({ label, prompt: nestedPrompt, accepted, rows: nestedRows, choices: choiceSetForRows(nestedRows, nestedPrompt, `${question.id}:${label}`) });
      }
    } else {
      const label = topLabel || "answer";
      const accepted = choices.extractAcceptedAnswers(rows, prompt);
      configs.push({ label, prompt, accepted, rows, choices: choiceSetForRows(rows, prompt, `${question.id}:${label}`) });
    }
  }
  return configs;
}

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
assert.equal(choices.isDisplaySafe("(a)(x))"), false);
assert.equal(choices.toLatex("2*x"), String.raw`2\times x`);

const comparisonReasonChoices = choices.generateComparisonReasonChoiceSet(
  [["The approximate value is less than the actual value because dy/dx is actually an increasing function.", "R1"]],
  "Write down, giving a reason, whether the approximate value is greater than or less than the actual value.",
  "M11TZ0HL_P3_Q2:b",
);
assert(comparisonReasonChoices);
assert.equal(comparisonReasonChoices.acceptedAnswers[0], "Less than the actual value, because the gradient is increasing");
assert.equal(comparisonReasonChoices.options.length, 5);
assert(comparisonReasonChoices.options.every((option) => choices.toLatex(option).startsWith(String.raw`\text{`)));

const angleMarkscheme = String.raw`\((\theta =)\ 28.1^\circ\ (28.0724\ldots^\circ)\) OR \(0.490\ (0.489957\ldots)\ rad\)`;
const angleAnswers = choices.extractAcceptedAnswers([[angleMarkscheme, "A1"]], "Find the angle.");
assert.deepEqual(angleAnswers, ["28.1°", "0.490 rad"]);
const angleChoices = choices.generateChoiceSet(angleAnswers, "audit-angle");
assert(angleChoices && angleChoices.options.every((option) => /°$/.test(option) && !/(?:ldots|…|\d\s*\(\s*\d)/.test(option)));
assert.deepEqual(choices.extractAcceptedAnswers([[angleMarkscheme, "A1"]], "Give the answer in radians."), ["0.490 rad"]);
assert.deepEqual(choices.extractAcceptedAnswers([[angleMarkscheme, "A1"]], "Give the answer in degrees."), ["28.1°"]);

const parityRows = [
  [String.raw`\(f(-x)=-f(x)\)`, "A1"],
  ["so f is odd", "A1"],
];
const parityChoices = choices.generateParityChoiceSet(
  parityRows,
  "State whether f is odd, even or neither. Justify your answer.",
  "audit-parity",
);
assert(parityChoices);
assert.equal(parityChoices.options[parityChoices.correctOption], "Odd, because f(-x) = -f(x)");
assert.equal(parityChoices.options.length, 5);

const coordinateRows = [[String.raw`\((0,0)\), \((2\sqrt2,0)\) and \((-2\sqrt2,0)\)`, "A1"]];
const coordinateAnswers = choices.extractAcceptedAnswers(
  coordinateRows,
  "State the coordinates of the points where the curve crosses the x-axis.",
);
assert.equal(coordinateAnswers[0], "(0,0); (2*sqrt(2),0); (-2*sqrt(2),0)");
assert(choices.generateChoiceSet(coordinateAnswers, "audit-coordinate-set"));
const turningPointAnswers = choices.extractAcceptedAnswers(
  [
    [String.raw`local maximum \((-1.22,\ 0.724)\)`, "A1"],
    [String.raw`local minimum \((1.22,\ -0.724)\)`, "A1"],
  ],
  "Write down the coordinates of the local maximum point and the local minimum point.",
);
assert.equal(turningPointAnswers[0], "(-1.22, 0.724); (1.22, -0.724)");
assert(choices.generateChoiceSet(turningPointAnswers, "audit-turning-points"));

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

const derivativeAtPointAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(f'(p)=-1\)`, "A2"]],
  String.raw`Write down \(f'(p)\).`,
);
assert.deepEqual(derivativeAtPointAnswers, ["-1"]);
assert(choices.generateChoiceSet(derivativeAtPointAnswers, "audit-derivative-at-point"));
for (const symbolicAnswer of [
  "2k",
  "12p",
  "theta",
  "-x/y",
  "dy/dx=e^x(sin x+cos x)",
  "2sinthetacostheta",
]) {
  const symbolicSet = choices.generateChoiceSet([symbolicAnswer], `audit-symbolic:${symbolicAnswer}`);
  assert(symbolicSet, `No safe symbolic choices were generated for ${symbolicAnswer}`);
  assert(symbolicSet.options.every(choices.isDisplaySafe));
  assert(symbolicSet.options.every((option) => !choices.toLatex(option).includes("/")));
}
assert(choices.toLatex("2sinthetacostheta").includes(String.raw`\sin \theta \cos \theta`));

const vectorRows = [[String.raw`\(\overrightarrow{\mathrm{AB}} = \begin{pmatrix}2\\-4\\-2\end{pmatrix}\)`, "A1"]];
const vectorAnswers = choices.extractAcceptedAnswers(vectorRows, String.raw`Find \(\overrightarrow{\mathrm{AB}}\).`);
assert.deepEqual(vectorAnswers, ["matrix(2;-4;-2)"]);
const vectorChoices = choices.generateChoiceSet(vectorAnswers, "audit-column-vector");
assert(vectorChoices);
assert(vectorChoices.options.every((option) => choices.toLatex(option).includes(String.raw`\begin{pmatrix}`)));

const vectorLineRows = [[String.raw`\(L_1:\ \mathbf{r} = \mathbf{i}-\mathbf{j}+4\mathbf{k}+s(\mathbf{i}-\mathbf{j}+\mathbf{k})\) or equivalent`, "A1"]];
const vectorLineAnswers = choices.extractAcceptedAnswers(vectorLineRows, String.raw`Find a vector equation of \(L_1\).`);
assert(vectorLineAnswers[0].includes("bold(r)"));
assert(!vectorLineAnswers.some((answer) => /math(?:bf|rm)|mathbf/i.test(answer)));
const vectorLineChoices = choices.generateChoiceSet(vectorLineAnswers, "audit-vector-line");
assert(vectorLineChoices);
assert(vectorLineChoices.options.every((option) => choices.toLatex(option).includes(String.raw`\mathbf`)));

const inverseFunctionRows = [[String.raw`\(f^{-1}(x) = \dfrac{-3x-1}{x-2}\ \left(= \dfrac{3x+1}{2-x},\ \dfrac{7}{2-x} - 3\right)\) (accept \(y =\))`, "A1"]];
const inverseFunctionAnswers = choices.extractAcceptedAnswers(inverseFunctionRows, String.raw`Find \(f^{-1}(x)\).`);
assert.equal(inverseFunctionAnswers[0], "f^-1(x) = (-3x-1)/(x-2)");
assert(choices.generateChoiceSet(inverseFunctionAnswers, "audit-inverse-function"));

const argumentRows = [[String.raw`\(\arg z = 0.9707\) (radians) \((=55.6197^\circ)\)`, "A1"]];
const argumentAnswers = choices.extractAcceptedAnswers(argumentRows, "Find the argument of z, giving your answer to 4 decimal places.");
assert.deepEqual(argumentAnswers, ["0.9707 rad"]);
assert(choices.generateChoiceSet(argumentAnswers, "audit-complex-argument"));

const extremumAnswers = choices.extractAcceptedAnswers(
  [["The graph has a minimum", "A1"]],
  "State whether the graph has a maximum or minimum.",
);
assert.deepEqual(extremumAnswers, ["Minimum"]);
assert(choices.generateChoiceSet(extremumAnswers, "audit-extremum-classification"));

assert.equal(choices.toLatex("0<x≤1/4"), String.raw`0<x\le \frac{1}{4}`);
assert.equal(
  choices.toLatex("h(x)=1/(e^(x^2)+3)"),
  String.raw`h\left(x\right)=\frac{1}{\left(e^{x^{2}}+3\right)}`,
);

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

const malformedProbabilityAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(P(T = 6) = \dfrac19\ (= 0.111\) 3 sf\()\)`, "A1"]],
  "Calculate the probability that Tim obtains a score of 6.",
);
assert.deepEqual(malformedProbabilityAnswers, ["1/9", "0.111"]);
assert(choices.generateChoiceSet(malformedProbabilityAnswers, "audit-malformed-probability"));

const intervalAnswers = choices.extractAcceptedAnswers(
  [[String.raw`range is \(\left[-3,\ \dfrac32\right]\)`, "A2"]],
  "State the range of f.",
);
assert.deepEqual(intervalAnswers, ["[-3, 3/2]"]);
assert(choices.generateChoiceSet(intervalAnswers, "audit-interval"));

const nestedRadicalAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(r=x\sqrt{\dfrac{3\sqrt3}{\pi}}\)`, "A1"]],
  "Find the radius in terms of x.",
);
assert(nestedRadicalAnswers[0].includes("sqrt"));
assert(choices.generateChoiceSet(nestedRadicalAnswers, "audit-nested-radical"));

assert.deepEqual(choices.extractAcceptedAnswers([["one", "A1"]], "Write down the number of points of inflexion."), ["1"]);
assert.deepEqual(choices.extractAcceptedAnswers([[String.raw`\(=5.63\) cm\(^2\)`, "A1"]], "Find the area."), ["5.63"]);

let checked = 0;
let generated = 0;
let nestedChecked = 0;
let nestedGenerated = 0;
let verifiedLineQuestion = false;
let verifiedPairedInterceptQuestion = false;
let verifiedContinuousRandomVariableQuestion = false;
let verifiedDerivativeAtPointQuestion = false;
let verifiedColumnVectorQuestion = false;
let verifiedVectorLineQuestion = false;
let verifiedComplexArgumentQuestion = false;
let verifiedInverseFunctionQuestion = false;
let verifiedComparisonReasonQuestion = false;
let verifiedMaclaurinSeriesQuestion = false;
const objectiveFallbacks = [];
for (const [label, path] of banks) {
  const questions = extractSeed(path);
  let bankChecked = 0;
  let bankGenerated = 0;
  let bankNestedChecked = 0;
  let bankNestedGenerated = 0;
  for (const question of questions) {
    const prompts = promptByPart(question);
    for (const [part, rows] of Array.isArray(question.markscheme) ? question.markscheme : []) {
      const prompt = prompts.get(String(part || "").toLowerCase()) || question.body || question.title || "";
      const nested = romanSubparts(prompt);
      for (const nestedLabel of nested) {
        const nestedPrompt = promptForSubpart(prompt, nestedLabel);
        const labelledRows = rowsForSubpart(rows, nestedLabel);
        const nestedRows = labelledRows.length ? labelledRows : rows;
        const nestedAccepted = choices.extractAcceptedAnswers(nestedRows, nestedPrompt);
        if (nestedAccepted.length) bankNestedChecked += 1;
        const nestedSet = choiceSetForRows(nestedRows, nestedPrompt, `${question.id}:${part}(${nestedLabel})`);
        if (!nestedSet && looksObjective(nestedPrompt)) objectiveFallbacks.push(`${label} ${question.id} ${part}(${nestedLabel}): ${plainText(nestedPrompt)}`);
        if (nestedSet) {
          if (!choices.validateChoiceSet(nestedSet.acceptedAnswers, nestedSet.options, nestedSet.correctOption)) {
            throw new Error(`Unsafe nested choices for ${question.id} ${part}(${nestedLabel})`);
          }
          if (nestedSet.options.some((option) => choices.toLatex(option).includes("/"))) {
            throw new Error(`Unrendered nested fraction for ${question.id} ${part}(${nestedLabel})`);
          }
          bankNestedGenerated += 1;
        }

        if (question.id === "M14TZ1HL_P2_Q11" && part === "b" && nestedLabel === "i") {
          assert.equal(nestedSet, null);
        }
        if (question.id === "M14TZ1HL_P2_Q11" && part === "b" && nestedLabel === "ii") {
          assert.deepEqual(nestedAccepted.slice(0, 2), ["b=76-30mu", "76-30mu"]);
          assert(nestedSet);
          assert(choices.toLatex(nestedAccepted[0]).includes(String.raw`\mu`));
        }
        if (question.id === "M14TZ1HL_P2_Q11" && part === "c" && nestedLabel === "i") {
          assert.deepEqual(nestedAccepted, ["2.34", "295/126"]);
          assert(nestedSet);
        }
        if (question.id === "M14TZ1HL_P2_Q11" && part === "c" && nestedLabel === "ii") {
          assert.deepEqual(nestedAccepted, ["0.241"]);
          assert(nestedSet);
          verifiedContinuousRandomVariableQuestion = true;
        }
        if ((question.id === "M08TZ2SL_P1_Q8" || question.id === "M09TZ1SL_P1_Q9") && part === "a") {
          assert(nestedSet, `Column-vector answer was not generated for ${question.id} ${part}(${nestedLabel})`);
          assert(nestedSet.options.every((option) => choices.toLatex(option).includes(String.raw`\begin{pmatrix}`)));
          verifiedColumnVectorQuestion = true;
        }
      }
      const accepted = choices.extractAcceptedAnswers(rows, prompt);
      const comparisonReasonSet = choices.generateComparisonReasonChoiceSet(rows, prompt, `${question.id}:${part}`);
      if ((question.id === "M11TZ0HL_P3_Q2" || question.id === "H_M11TZ0HL_P3_Q2") && part === "b") {
        assert(comparisonReasonSet, `Reason-based comparison choices were not generated for ${question.id}`);
        assert.equal(comparisonReasonSet.acceptedAnswers[0], "Less than the actual value, because the gradient is increasing");
        verifiedComparisonReasonQuestion = true;
      }
      if (question.id === "M15TZ2HL_P2_Q11" && part === "b") {
        assert.equal(accepted[0], "y = -4x+25");
        assert(choices.toLatex(accepted[0]).startsWith("y="));
        verifiedLineQuestion = true;
      }
      if (question.id === "M15TZ2HL_P2_Q11" && part === "c") {
        assert.equal(accepted[0], "2*sqrt(2)");
      }
      if (question.id === "M15TZ2SL_P2_Q8" && part === "b") {
        assert.deepEqual(accepted, ["-1"]);
        assert(choices.generateChoiceSet(accepted, `${question.id}:${part}`));
        verifiedDerivativeAtPointQuestion = true;
      }
      if (question.id === "M14TZ2SL_P2_Q2" && part === "a") {
        assert(accepted.includes("x = ±sqrt(5)"));
        assert(accepted.includes("x = ±2.24"));
        assert(choices.generateChoiceSet(accepted, `${question.id}:${part}`));
        verifiedPairedInterceptQuestion = true;
      }
      if (question.id === "M08TZ2HL_P1_Q11" && part === "b") {
        assert(accepted[0].includes("bold(r)"));
        assert(!accepted.some((answer) => /math(?:bf|rm)|mathbf/i.test(answer)));
        assert(choices.generateChoiceSet(accepted, `${question.id}:${part}`));
        verifiedVectorLineQuestion = true;
      }
      if (question.id === "M18TZ2HL_P2_Q1" && part === "c") {
        assert.deepEqual(accepted, ["0.9707 rad"]);
        assert(choices.generateChoiceSet(accepted, `${question.id}:${part}`));
        verifiedComplexArgumentQuestion = true;
      }
      if (question.id === "M19TZ1SL_P1_Q4" && part === "b") {
        assert.equal(accepted[0], "f^-1(x) = (-3x-1)/(x-2)");
        assert(choices.generateChoiceSet(accepted, `${question.id}:${part}`));
        verifiedInverseFunctionQuestion = true;
      }
      if (question.id === "N15TZ0HL_P3_Q2" && part === "b") {
        assert.equal(accepted[0], "f(x)=x+x^2+x^3/3-x^5/30");
        const seriesSet = choices.generateChoiceSet(accepted, `${question.id}:${part}`);
        assert(seriesSet);
        assert(seriesSet.options.every((option) => choices.toLatex(option).includes("x")));
        verifiedMaclaurinSeriesQuestion = true;
      }
      if (!accepted.length) {
        if (looksObjective(prompt) && !nested.length) objectiveFallbacks.push(`${label} ${question.id} ${part}: ${plainText(prompt)}`);
        continue;
      }
      bankChecked += 1;
      const set = choices.generateChoiceSet(accepted, `${question.id}:${part}`);
      if (!set && looksObjective(prompt)) objectiveFallbacks.push(`${label} ${question.id} ${part}: ${plainText(prompt)}`);
      if (!set) continue;
      if (!choices.validateChoiceSet(accepted, set.options, set.correctOption)) throw new Error(`Unsafe choices for ${question.id} ${part}`);
      if (set.options.some((option) => choices.toLatex(option).includes("/"))) throw new Error(`Unrendered fraction for ${question.id} ${part}`);
      bankGenerated += 1;
    }
  }
  checked += bankChecked;
  generated += bankGenerated;
  nestedChecked += bankNestedChecked;
  nestedGenerated += bankNestedGenerated;
  console.log(`${label}: ${bankGenerated}/${bankChecked} mark-scheme answer groups produced five safe choices.`);
  console.log(`${label}: ${bankNestedGenerated}/${bankNestedChecked} objective nested parts produced five safe choices.`);
}

assert(verifiedLineQuestion, "The real equation-of-a-normal regression question was not audited.");
assert(verifiedPairedInterceptQuestion, "The real paired-intercepts regression question was not audited.");
assert(verifiedContinuousRandomVariableQuestion, "The continuous-random-variable nested-part regression question was not audited.");
assert(verifiedDerivativeAtPointQuestion, "The real derivative-at-a-point regression question was not audited.");
assert(verifiedColumnVectorQuestion, "The real column-vector regression questions were not audited.");
assert(verifiedVectorLineQuestion, "The real vector-line regression question was not audited.");
assert(verifiedComplexArgumentQuestion, "The real complex-argument regression question was not audited.");
assert(verifiedInverseFunctionQuestion, "The real inverse-function regression question was not audited.");
assert(verifiedComparisonReasonQuestion, "The real Euler comparison-and-reason question was not audited.");
assert(verifiedMaclaurinSeriesQuestion, "The real Maclaurin-series regression question was not audited.");
console.log(`Total: ${generated}/${checked} mark-scheme answer groups produced five safe choices; every generated set passed notation, duplicate and accepted-answer checks.`);
console.log(`Nested parts: ${nestedGenerated}/${nestedChecked} objective parts produced five safe choices; proof and show-that parts remained whiteboard tasks.`);
let allActiveQuestions = 0;
let allAnswerParts = 0;
let allWhiteboardParts = 0;
let allQuestionsWithWhiteboard = 0;
const objectiveFailureKinds = new Map();
const objectiveFailureVerbs = new Map();
const activeObjectiveFallbacks = [];
let objectiveWhiteboardParts = 0;
const objectiveWhiteboardQuestions = new Set();
for (const [label, path] of banks) {
  const questions = extractSeed(path).filter((question) => activeQuestionIds[label].has(String(question.id || "")));
  let bankAnswerParts = 0;
  let bankWhiteboardParts = 0;
  let bankQuestionsWithWhiteboard = 0;
  for (const question of questions) {
    const configs = assignmentPartConfigs(question);
    const whiteboardParts = configs.filter((config) => !config.choices);
    bankAnswerParts += configs.length;
    bankWhiteboardParts += whiteboardParts.length;
    if (whiteboardParts.length) bankQuestionsWithWhiteboard += 1;
    for (const config of whiteboardParts.filter((part) => looksObjective(part.prompt))) {
      objectiveWhiteboardParts += 1;
      objectiveWhiteboardQuestions.add(`${label}:${question.id}`);
      const kind = config.accepted.length ? "accepted answer found, but four safe alternatives were not generated" : "mark-scheme answer was not extracted";
      objectiveFailureKinds.set(kind, (objectiveFailureKinds.get(kind) || 0) + 1);
      const verb = plainText(config.prompt).match(/\b(find|calculate|write down|state|determine|solve|evaluate|express|give)\b/i);
      const key = verb ? verb[1].toLowerCase() : "other";
      objectiveFailureVerbs.set(key, (objectiveFailureVerbs.get(key) || 0) + 1);
      activeObjectiveFallbacks.push({ bank: label, id: question.id, part: config.label, prompt: plainText(config.prompt), accepted: config.accepted, rows: config.rows });
    }
  }
  allActiveQuestions += questions.length;
  allAnswerParts += bankAnswerParts;
  allWhiteboardParts += bankWhiteboardParts;
  allQuestionsWithWhiteboard += bankQuestionsWithWhiteboard;
  console.log(`${label} assignment inventory: ${bankWhiteboardParts}/${bankAnswerParts} answer parts use whiteboard or paper, across ${bankQuestionsWithWhiteboard}/${questions.length} active questions.`);
}
console.log(`Combined assignment inventory: ${allWhiteboardParts}/${allAnswerParts} answer parts use whiteboard or paper, across ${allQuestionsWithWhiteboard}/${allActiveQuestions} active questions.`);
console.log(`Objective-looking whiteboard inventory: ${objectiveWhiteboardParts} parts across ${objectiveWhiteboardQuestions.size} active questions.`);
console.log(`Objective fallback causes: ${Array.from(objectiveFailureKinds, ([kind, count]) => `${count} ${kind}`).join("; ")}.`);
console.log(`Objective fallback prompt verbs: ${Array.from(objectiveFailureVerbs.entries()).sort((left, right) => right[1] - left[1]).map(([verb, count]) => `${verb} ${count}`).join(", ")}.`);
if (process.env.ASSIGNMENT_AUDIT_DETAILS === "1") {
  console.log(`Objective-looking whiteboard fallbacks: ${objectiveFallbacks.length}`);
  objectiveFallbacks.slice(0, 120).forEach((item) => console.log(`- ${item}`));
}
if (process.env.ASSIGNMENT_AUDIT_DETAILS === "2") {
  activeObjectiveFallbacks.slice(0, 100).forEach((item) => {
    console.log(`\n${item.bank} ${item.id} ${item.part}: ${item.prompt}`);
    console.log(`accepted=${JSON.stringify(item.accepted)} rows=${JSON.stringify(item.rows.slice(-4))}`);
  });
}
