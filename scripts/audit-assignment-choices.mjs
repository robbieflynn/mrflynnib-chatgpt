import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const choices = require("../public/question-bank/assignment-choice-utils.js");

assert.equal(choices.latexToPlain(String.raw`\dfrac12r^2\sin\theta`), "(1/2)*r^2sintheta");
assert.equal(choices.toLatex("(1/2)*r^2sintheta"), String.raw`\left(\frac{1}{2}\right)\times r^{2}\sin \theta `);
assert.equal(choices.latexToPlain(String.raw`x^{\frac12}`), "x^(1/2)");
const repairedCoefficientChoices = choices.repairStoredChoiceOptions([
  "1/2r^2sintheta", "-1/2r^2sintheta", "3/2r^2sintheta", "1/0r^2sintheta", "1/4r^2sintheta",
]);
assert.equal(repairedCoefficientChoices[0], "(1/2)*r^2sintheta");
assert(repairedCoefficientChoices.every((choice) => !choice.includes("/0")));

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
  let firstLaterPart = -1;
  rows.forEach((row, index) => {
    const match = plainText(Array.isArray(row) ? row[0] : "").match(/^\s*(?:METHOD\s*\d+\s*)?\(([ivxlcdm]+)\)/i);
    if (!match) return;
    if (firstLaterPart === -1 && match[1].toLowerCase() !== "i") firstLaterPart = index;
    if (match[1].toLowerCase() === label && start === -1) start = index;
    else if (start !== -1 && index > start && end === rows.length) end = index;
  });
  if (start === -1 && label === "i" && firstLaterPart > 0) return rows.slice(0, firstLaterPart);
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
  if (requiresWhiteboardTask(prompt)) return null;
  return choices.generateComparisonReasonChoiceSet(rows, prompt, seed)
    || choices.generateHypothesisChoiceSet(rows, prompt, seed)
    || choices.generateExplanationChoiceSet(rows, prompt, seed)
    || choices.generateConceptChoiceSet(rows, prompt, seed)
    || choices.generateParityChoiceSet(rows, prompt, seed)
    || choices.generateChoiceSet(choices.extractAcceptedAnswers(rows, prompt), seed, prompt);
}

const choiceQualityIssues = [];
const liveChoiceSamples = [];

function qualityIssue(kind, meta, prompt, option, rendered) {
  choiceQualityIssues.push({ kind, meta, prompt: plainText(prompt), option, rendered });
}

function hasParentheticalWorkingPrefix(value) {
  const answer = String(value || "").trim();
  if (!answer.startsWith("(")) return false;
  let depth = 0;
  for (let index = 0; index < answer.length; index += 1) {
    if (answer[index] === "(") depth += 1;
    else if (answer[index] === ")") depth -= 1;
    if (depth !== 0) continue;
    return /=\s*$/.test(answer.slice(1, index).trim()) && Boolean(answer.slice(index + 1).trim());
  }
  return false;
}

function inspectChoiceQuality(set, meta, prompt, rows = []) {
  if (!set) return;
  const correct = set.options[set.correctOption];
  const promptText = plainText(prompt);
  const finalInstruction = promptText.slice(Math.max(
    promptText.toLowerCase().lastIndexOf("find"),
    promptText.toLowerCase().lastIndexOf("calculate"),
    promptText.toLowerCase().lastIndexOf("determine"),
    promptText.toLowerCase().lastIndexOf("write down"),
    promptText.toLowerCase().lastIndexOf("state"),
    0,
  ));
  const asksForProbability = !/\b(?:explain|justify|give a reason|giving a reason|state why)\b/i.test(promptText)
    && (/\b(?:find|calculate|work out|determine|write down|state|estimate|deduce|obtain)\s+(?:the\s+)?(?:conditional\s+|steady state\s+)?probability\b/i.test(promptText)
      || /\b(?:find|calculate|determine|write down|state)\b[\s\S]*\bP\s*\([^)]*(?:[=<>|∩]|'\s*\))/i.test(promptText));
  set.options.forEach((option, index) => {
    const rendered = choices.toLatex(option);
    const role = index === set.correctOption ? "correct" : "wrong";
    if (rendered.includes("/") || /\\text\{[^}]*\b(?:sqrt|root|matrix|blackboard|math(?:bf|rm|cal|bb|frak)|mathrm|ldots|cdots|circ)\b/i.test(rendered)) {
      qualityIssue(`${role}: rendered notation`, meta, prompt, option, rendered);
    }
    if (/\b(?:award|follow through|method mark|answer only|correct answer|reasonable attempt|complete solution|cao|oe)\b|\([MABRGEN]\d+\)|\bft\b/i.test(option)) {
      qualityIssue(`${role}: marking language`, meta, prompt, option, rendered);
    }
    if (/^(?:\([ivxlcdm]+\)\s*)?(?:any\s+|one\s+|two\s+|a\s+|an\s+|the\s+|fully\s+)*(?:correct|valid|appropriate|acceptable|reasonable|consistent)\s+(?:expression|equation|formula|calculation|method|working|result|response|answer|manipulation|integration|substitution|approach)(?:\s+(?:or|and)\s+(?:values?|expressions?|equations?|formulae?|calculations?|results?|answers?))?(?:\s+(?:for|in|using|involving|with|which|that|to)\b[^=<>≤≥]*)?$/i.test(option.trim())) {
      qualityIssue(`${role}: internal answer placeholder`, meta, prompt, option, rendered);
    }
    if (hasParentheticalWorkingPrefix(option) || /\\lim[^=]*\\times|lim_\([^)]*\)\s*\*/i.test(`${option} ${rendered}`)) {
      qualityIssue(`${role}: optional working shown as the answer`, meta, prompt, option, rendered);
    }
    if (new RegExp(`^[-+]?\\d+(?:\\.\\d+)?\\s+[-+]?\\d+(?:\\.\\d+)?\\s+(?:minutes?|hours?|mins?|hrs?|s|cm|mm|km|m|kg|g|rad|ppm)$`, "i").test(option)) {
      qualityIssue(`${role}: unrounded value joined to final answer`, meta, prompt, option, rendered);
    }
    if (option.length > 260) qualityIssue(`${role}: too long`, meta, prompt, option, rendered);
    if (/\b(\w{3,})\s+\1\b/i.test(option)
      || /\bon the floor on the floor\b|\bbecause because\b|\bmight have (?:received no report|refused to respond|finished responding) to\b/i.test(option)
      || /^(?:\([ivxlcdm]+\)\s*)?(?:(?:biased|invalid|inconclusive|unreliable|valid|correct|appropriate|reasonable|consistent)\s+)?reason(?:ing)?\s+with reference to\b/i.test(option)
      || /\bexpression is not (?:biased|inconclusive|unreliable|invalid)\b|\b(?:minimum|maximum|initial|total) value \([^)]*\)|\b(?:complete|decisive|conclusive) evidence\b/i.test(option)) {
      qualityIssue(`${role}: awkward wording`, meta, prompt, option, rendered);
    }
    if (index !== set.correctOption && /\bfind\s+(?:the\s+)?value\s+of\s+[A-Za-zα-ω]\b/i.test(promptText)
      && /^[A-Za-zα-ω]\s*=/.test(correct) && /^[A-Za-zα-ω]\s*(?:≠|≤|≥|<|>)/.test(option)) {
      qualityIssue("wrong: implausible relation change", meta, prompt, option, rendered);
    }
    if (index !== set.correctOption
      && asksForProbability
      && (/^\s*-|=\s*-|\+\s*1\s*$|^\s*2\s*\*/.test(option))) {
      qualityIssue("wrong: probability outside 0 to 1", meta, prompt, option, rendered);
    }
  });
  if (/\b(?:find|determine|state|write down|give)\s+(?:an?\s+|the\s+)?equation\s+(?:of|for)\b/i.test(finalInstruction)
    && !/[=<>≤≥]/.test(correct)) {
    qualityIssue("correct: equation context missing", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\b(?:degrees?|°)\b/i.test(promptText) && /\brad\b/i.test(correct)) {
    qualityIssue("correct: radians used for degree request", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\bradians?\b/i.test(promptText) && /°/.test(correct)) {
    qualityIssue("correct: degrees used for radian request", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\b(?:find|write down|give|determine)\b[^.]*\bvector equation\b/i.test(finalInstruction)
    && !(correct.includes("=") && /(?:matrix\(|bold\(r\)|\br\s*=)/i.test(correct))) {
    qualityIssue("correct: incomplete vector equation", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\b(?:find|calculate|determine)\b[\s\S]*\bmean\b[\s\S]*\b(?:variance|standard deviation)\b/i.test(finalInstruction)
    && !(/mean|mu|bar\(/i.test(correct) && /variance|sigma|sd/i.test(correct))) {
    qualityIssue("correct: missing paired statistics", meta, prompt, correct, choices.toLatex(correct));
  }
  const justificationWords = correct.match(/\b[A-Za-z]{2,}\b/g) || [];
  const equalityCount = (correct.match(/=/g) || []).length;
  if (/\b(?:justify|giving a reason|give a reason)\b/i.test(finalInstruction)
    && equalityCount < 2
    && !/[<>≤≥≠]|\b(?:because|since|as|therefore|so|reason|theorem|gradient|derivative|concav|interpol|extrapol|evidence|reject|reliable|valid|increasing|decreasing|minimum|maximum|correct|possible|impossible|greater|less|equal|odd|even|independent|complies|supported|guaranteed|closer|further)\b|;/.test(correct)
    && justificationWords.length < 4) {
    qualityIssue("correct: missing justification", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\b(?:find|calculate|determine|write down)\s+(?:the\s+)?probability\b/i.test(finalInstruction)) {
    const directProbability = correct.match(/(?:^|=)\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (directProbability && (Number(directProbability[1]) < 0 || Number(directProbability[1]) > 1)) {
      qualityIssue("correct: probability outside 0 to 1", meta, prompt, correct, choices.toLatex(correct));
    }
  }
  if (/\b(?:obtain|attempt|transformation with correct|any correct|accept any|correct use of)\b/i.test(correct)
    || /^finding\b/i.test(correct)
    || (!correct.startsWith("latex:") && /\b(?:displaystyle)?int[_^(]/i.test(correct) && !choices.toLatex(correct).includes(String.raw`\int`))
    || /\broot\([^,=]+=/i.test(correct)) {
    qualityIssue("correct: working or malformed notation", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\b(?:find|calculate|determine|write down)\b[\s\S]*\bmodulus\s+and\s+(?:the\s+)?argument\b/i.test(finalInstruction)
    && !(/\bmodulus\s*=.*;\s*argument\s*=/i.test(correct) || /\|[^|]+\|=.*;\s*arg\(/i.test(correct))) {
    qualityIssue("correct: incomplete modulus and argument", meta, prompt, correct, choices.toLatex(correct));
  }
  const requestedVectorCount = (finalInstruction.match(/overrightarrow/g) || []).length;
  if (requestedVectorCount >= 2 && /\b(?:find|express|write down)\b[\s\S]*\b(?:vectors?|expressions?)\b/i.test(finalInstruction) && !/;/.test(correct)) {
    qualityIssue("correct: incomplete vector pair", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\bvector equation\b[\s\S]*\b(?:shortest )?distance\b/i.test(finalInstruction) && !/;/.test(correct)) {
    qualityIssue("correct: missing equation or distance", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\bcomplex numbers? represented by (?:the )?points?\b/i.test(finalInstruction) && /\band\b/i.test(finalInstruction) && !/;/.test(correct)) {
    qualityIssue("correct: incomplete complex-number pair", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\bgreatest volume\b[\s\S]*\bvalue of\b[\s\S]*\b(?:theta|θ)\b/i.test(finalInstruction) && !/;/.test(correct)) {
    qualityIssue("correct: missing volume or angle", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\bdimensions?\b/i.test(finalInstruction) && !/\bby\b/i.test(correct)) {
    qualityIssue("correct: incomplete dimensions", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\bfind the vectors?\s+(?:overrightarrow\([^)]*\)|vec\([^)]*\)|[A-Z]{2})\s+and\s+(?:overrightarrow\([^)]*\)|vec\([^)]*\)|[A-Z]{2})\b/i.test(finalInstruction) && !/;/.test(correct)) {
    qualityIssue("correct: incomplete vector pair", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\bnull and alternative hypotheses\b|\bhypotheses\b/i.test(finalInstruction) && !/;/.test(correct)) {
    qualityIssue("correct: incomplete hypotheses", meta, prompt, correct, choices.toLatex(correct));
  }
  if (/\b(?:find|determine|write down|state|give)\b[\s\S]*\b(?:the\s+)?(?:two|both)\s+(?:possible\s+)?values\s+of\b/i.test(finalInstruction) && !/;|±|\band\b/.test(correct)) {
    qualityIssue("correct: incomplete pair", meta, prompt, correct, choices.toLatex(correct));
  }
  const markschemeText = rows.map((row) => plainText(choices.latexToPlain(Array.isArray(row) ? row[0] : row))).join(" ");
  const markschemeAssignments = markschemeText.match(/\b[A-Za-zα-ω](?:_?\d+)?\s*=/g) || [];
  if (/\b(?:all|every)\s+(?:the\s+)?(?:values?|roots?|solutions?)\b/i.test(finalInstruction)
    && markschemeAssignments.length >= 2
    && !/[;±∈<>≤≥]/.test(correct)
    && !/\bonly\s+(?:admissible|valid)?\s*(?:angle|root|solution|value)\b/i.test(markschemeText)) {
    qualityIssue("correct: incomplete solution set", meta, prompt, correct, choices.toLatex(correct));
  }
  const normalizedInstruction = finalInstruction.replace(/\\[()[\]]/g, "");
  if (/\b(?:find|calculate|determine|write down)\b[\s\S]*\bcoordinates\s+of\b/i.test(normalizedInstruction)
    && !/\b[xy]-coordinates?\b/i.test(normalizedInstruction)
    && !/\b(?:justify|giving a reason|give a reason)\b/i.test(normalizedInstruction)) {
    const coordinatePieces = correct.split(/\s*;\s*/);
    const allTuples = coordinatePieces.every((piece) => /^(?:[A-Z]\s*)?\([^,]+,[^,]+(?:,[^,]+)?\)$/.test(piece));
    const renderedTuple = /^\\left\(.+,\\ .+\\right\)$/.test(choices.toLatex(correct));
    const labelledCoordinates = /(?:^|;)\s*x\s*=/.test(correct) && /(?:^|;)\s*y\s*=/.test(correct);
    if (!allTuples && !renderedTuple && !labelledCoordinates) {
      qualityIssue("correct: coordinate answer contains extra material", meta, prompt, correct, choices.toLatex(correct));
    }
  }
}

function looksObjective(prompt) {
  const text = plainText(prompt);
  return /\b(find|calculate|work out|write down|state|determine|solve|evaluate|express|give|estimate|deduce|obtain)\b/i.test(text)
    && !/\b(show that|prove|sketch|draw|construct|plot|explain|justify|give a reason|stat(?:e|ing) (?:your )?reasons?|describe|discuss|interpret|comment on|compar(?:e|ison)|conclusion|assumption|criticism|limitation|disadvantage|advantage)\b/i.test(text)
    && !/\bstate\s+(?:one\s+)?(?:feature|effect|reason)\b|\bstate\s+why\b/i.test(text);
}

function requiresWhiteboardTask(prompt) {
  const text = plainText(prompt);
  return /\b(show that|prove|verify that|sketch|draw|construct|plot|shade)\b/i.test(text)
    || /\bcomplete\b[\s\S]*\bdiagram\b/i.test(text);
}

function hasSharedWhiteboardInstruction(prompt) {
  return requiresWhiteboardTask(plainText(prompt).split(/\(i\)/i)[0]);
}

function looksExplanation(prompt) {
  const text = plainText(prompt);
  return (/\b(explain|justify|give a reason|giving a reason|stat(?:e|ing) (?:your )?reasons?|describe|discuss|interpret|comment on|why|whether|compar(?:e|ison)|conclusion|assumption|criticism|limitation|disadvantage|advantage)\b/i.test(text)
    || /\bstate\s+(?:one\s+)?(?:feature|effect|reason)\b|\b(?:state|give|write down)\b[\s\S]*\b(?:feature|effect)\b|\bstate\s+why\b/i.test(text))
    && !/\b(show that|prove|verify that|sketch|draw|construct|plot|shade)\b/i.test(text);
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
        const directlyLabelledRows = markschemeByPart.get(`${topLabel}(${nestedLabel})`) || [];
        const labelledRows = directlyLabelledRows.length ? directlyLabelledRows : rowsForSubpart(rows, nestedLabel);
        const nestedRows = labelledRows.length ? labelledRows : rows;
        const label = topLabel ? `${topLabel}(${nestedLabel})` : nestedLabel;
        const accepted = choices.extractAcceptedAnswers(nestedRows, nestedPrompt);
        configs.push({
          label,
          prompt: nestedPrompt,
          accepted,
          rows: nestedRows,
          choices: hasSharedWhiteboardInstruction(prompt) ? null : choiceSetForRows(nestedRows, nestedPrompt, `${question.id}:${label}`),
        });
      }
    } else {
      const label = topLabel || "answer";
      const accepted = choices.extractAcceptedAnswers(rows, prompt);
      if (question.id === "M17TZ1HL_P1_Q1" && part === "") {
        assert.deepEqual(accepted, ["60"], `An intermediate logarithm step was selected: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "M16TZ1HL_P2_Q8" && part === "") {
        assert.deepEqual(accepted, ["-6"], `The completed-square working was selected instead of the minimum: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "M11TZ1HL_P1_Q10" && part === "a") {
        assert.deepEqual(accepted, ["x≠ 0; x≠ 2a"], `The domain lost one of its exclusions: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "M10TZ0HL_P3_Q4" && part === "c") {
        assert.deepEqual(accepted, ["1/6"], `The limit working was selected instead of its value: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "M10TZ0HL_P3_Q4" && part === "d") {
        assert.equal(accepted[0], "0.25326; No, the approximation is not correct to the requested number of decimal places");
      }
      if (question.id === "A_M23TZ2SL_P2_Q3" && part === "a") {
        assert(choices.toLatex(accepted[0]).includes(String.raw`\mathrm{ppm}`), `ppm was not typeset as a unit: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "A_M23TZ2SL_P2_Q3" && part === "c") {
        assert.equal(choices.toLatex(accepted[0]), String.raw`T=13.9\,\mathrm{h}`);
      }
      if (question.id === "M10TZ2HL_P2_Q8" && part === "a") {
        assert(!choices.toLatex(accepted[0]).includes(String.raw`\n`), `n was rendered as a LaTeX command: ${JSON.stringify(accepted)}`);
      }
      configs.push({ label, prompt, accepted, rows, choices: choiceSetForRows(rows, prompt, `${question.id}:${label}`) });
    }
  }
  return configs;
}

const wholeNumberExample = choices.generateChoiceSet(["25"], "audit-integer");
assert(wholeNumberExample);
assert.deepEqual(new Set(wholeNumberExample.options), new Set(["25", "28", "18", "53", "7"]));
const positiveDecimalExample = choices.generateChoiceSet(["1.18"], "audit-positive-area", "Find the area of the region.");
assert(positiveDecimalExample);
assert.equal(positiveDecimalExample.options.length, 5);
const classificationExample = choices.generateChoiceSet(["Minimum"], "audit-classification", "Determine whether P is a maximum or minimum point.");
assert(classificationExample);
assert.equal(classificationExample.options.length, 5);
assert.deepEqual(
  choices.extractAcceptedAnswers([[String.raw`\(= -4\)`, "A1"]], String.raw`Evaluate \(u^n\) for this value of \(n\).`),
  ["u^n=-4"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [["C represents the complex number \\(1-2i\\)", "A2"], ["D represents the complex number \\(3+2i\\)", "A2"]],
    "Determine the complex numbers represented by the points C and D.",
  ),
  ["C=1-2i; D=3+2i"],
);
assert.deepEqual(choices.extractAcceptedAnswers([[String.raw`\(2/7\)`, "A1"]], "Complete the tree diagram."), []);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\({}^{12}\mathrm C_{10}p^{10}(1-p)^2\)`, "A1"], ["0.298565<br>0.299", "A1"]],
    "Given that at least 7 flights are on time, find the probability that exactly 10 flights are on time.",
  ),
  ["0.298565", "0.299"],
);
const degreeExample = choices.generateChoiceSet(["42.5^circ"], "audit-degrees");
assert(degreeExample && degreeExample.options.every(choices.isDisplaySafe));
assert.equal(degreeExample.acceptedAnswers[0], "42.5°");
const areaExample = choices.generateChoiceSet(["31.0 (mathrmcm^2)"], "audit-area");
assert(areaExample && areaExample.options.every((option) => !/(?:mathrm|\\|\^circ)/i.test(option)));
const radicalExample = choices.generateChoiceSet(["sqrt(8)"], "audit-radical");
assert(radicalExample && radicalExample.options.every(choices.isDisplaySafe));
const ratioExample = choices.generateChoiceSet(["sqrt(3):1"], "audit-ratio", "Find the exact value of the ratio R:r.");
assert(ratioExample && ratioExample.options.every(choices.isRatioAnswer));
assert.equal(ratioExample.options.filter((option) => choices.equivalent(option, "sqrt(3):1")).length, 1);
assert(!ratioExample.options.some((option) => /\([^)]*:[^)]*\)\s*[+\-*]/.test(option) || /^[-\d]+\s*\*\s*\([^)]*:[^)]*\)/.test(option)));
assert.deepEqual(
  choices.repairStoredChoiceOptions(["(sqrt(3):1)-3", "-(sqrt(3):1)", "2*(sqrt(3):1)", "sqrt(3):1", "(sqrt(3):1)+2"]).map(choices.isRatioAnswer),
  [true, true, true, true, true],
);
assert.equal(choices.generateChoiceSet(["1/4/2"], "audit-malformed"), null);
assert.equal(choices.isDisplaySafe("(a)(x))"), false);
assert.equal(choices.toLatex("2*x"), String.raw`2\times x`);
assert.equal(choices.toLatex("y - x"), "y-x");
assert.equal(choices.toLatex("ln x"), String.raw`\ln\left(x\right)`);
assert.equal(choices.latexToPlain(String.raw`\cos\varphi`), "cos(φ)");
assert.equal(choices.toLatex("sqrt(181 - 180cos(φ))"), String.raw`\sqrt{181-180\cos\left(\varphi \right)}`);
assert.equal(
  choices.toLatex("Since n > 1, n^2+n+1 > 2n+1 and n^2+n+1 > n^2-1"),
  String.raw`\text{Since }n>1,\ n^{2}+n+1>2n+1\text{ and }n^{2}+n+1>n^{2}-1`,
);
assert.equal(choices.toLatex("(n(n^2-15n+8))/6"), String.raw`\frac{\left(n\left(n^{2}-15n+8\right)\right)}{6}`);
assert.equal(choices.toLatex("C(0)=3.0 ppm"), String.raw`C(0)=3.0\,\mathrm{ppm}`);
assert.equal(choices.toLatex("1+1/2 x^2+3/8 x^4"), String.raw`1+\left(\frac{1}{2}\right)\times x^{2}+\left(\frac{3}{8}\right)\times x^{4}`);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [
      [String.raw`e.g. \(\dfrac{x}{5}=12\) OR \(\dfrac{x}{15}=2^2\)`, "(A1)"],
      [String.raw`\(x=60\)`, "A1"],
    ],
    String.raw`Find the solution of \(\log_2x-\log_25=2+\log_23\).`,
  ),
  ["60"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [
      [String.raw`OR \(b=a^2+4a-2=(a+2)^2-6\)`, "M1(A1)"],
      [String.raw`THEN \(b\ge-6\), hence the smallest possible value for \(b\) is \(-6\)`, "A1"],
    ],
    String.raw`Find the smallest possible value for \(b\).`,
  ),
  ["-6"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\(f(x-a)\ne b\)`, "(M1)"], [String.raw`\(x\ne0\) and \(x\ne2a\)`, "A1"]],
    String.raw`Find the largest possible domain of \(g\).`,
  ),
  ["x\u22600; x\u22602a"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\(\displaystyle\lim_{x\to0}\frac{x^6/6}{x^6}\)`, "M1"], [String.raw`\(=\dfrac16\)`, "A1"]],
    String.raw`Evaluate \(\displaystyle\lim_{x\to0}f(x)\).`,
  ),
  ["1/6"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [
      [String.raw`\(\displaystyle\lim_{x\to 0}\dfrac{2\mathrm{e}^{x}\cos 2x-2-2x+3x^{2}}{x^{3}}=\lim_{x\to 0}\left(-\dfrac{11}{3}-\dfrac{7}{12}x+\ldots\right)\)`, "(A1)"],
      [String.raw`\(=-\dfrac{11}{3}\ \left(=-3.66666\ldots\right)\)`, "A1"],
    ],
    String.raw`Hence, or otherwise, evaluate \(\displaystyle\lim_{x\to 0}\dfrac{2\mathrm{e}^{x}\cos 2x-2-2x+3x^{2}}{x^{3}}\).`,
  ),
  ["-11/3"],
);

const derivativeInterpretationChoices = choices.generateExplanationChoiceSet(
  [
    [String.raw`(i) \(\left(f'(100)=\right)\ 26.7\ (26.7059\ldots)\)`, "A1"],
    [String.raw`recognition that the value predicts the annual growth in 1990 as \(26.7\) thousands of people per year`, "A1"],
  ],
  String.raw`Find the value of \(f'(100)\) and interpret this value in context.`,
  "audit-derivative-interpretation",
);
assert(derivativeInterpretationChoices);
assert.equal(derivativeInterpretationChoices.acceptedAnswers[0], "f′(100) = 26.7, so the model predicts that the population was increasing in 1990 at about 26.7 thousand people per year");
assert(derivativeInterpretationChoices.options.every((option) => !hasParentheticalWorkingPrefix(option)));

const correlationExplanationChoices = choices.generateExplanationChoiceSet(
  [
    [String.raw`(ii) \((r =)\ -0.986\ (-0.985843\ldots)\)`, "A1"],
    ["a (very) strong negative linear correlation", "R1"],
  ],
  String.raw`Describe the correlation between \(D\) and \(C\), referring to the value of \(r\).`,
  "audit-correlation-explanation",
);
assert(correlationExplanationChoices);
assert.equal(correlationExplanationChoices.acceptedAnswers[0], "r = -0.986, so there is a very strong negative linear correlation");

const fairnessExplanationChoices = choices.generateExplanationChoiceSet(
  [[String.raw`\((\text{E}(G) =)\ 0\)`, "A1"], [String.raw`\(\text{E}(G) = 0\), therefore the challenge is fair`, "R1"]],
  "Determine whether this challenge is fair. Justify your answer.",
  "audit-fairness-explanation",
);
assert(fairnessExplanationChoices);
assert.equal(fairnessExplanationChoices.acceptedAnswers[0], "E(G) = 0, so the challenge is fair");

const outlierExplanationChoices = choices.generateExplanationChoiceSet(
  [[String.raw`\((150 - 1.5 \times 50 =)\ 75\ (\text{g})\)`, "A1"], [String.raw`\(55 < 75\), therefore it is an outlier`, "R1"]],
  "One of the potatoes has a mass of 55 g. Determine whether this mass is an outlier.",
  "audit-outlier-explanation",
);
assert(outlierExplanationChoices);
assert.equal(outlierExplanationChoices.acceptedAnswers[0], "The lower outlier boundary is 75 g; since 55 g < 75 g, the mass is an outlier");

const comparisonReasonChoices = choices.generateComparisonReasonChoiceSet(
  [["The approximate value is less than the actual value because dy/dx is actually an increasing function.", "R1"]],
  "Write down, giving a reason, whether the approximate value is greater than or less than the actual value.",
  "M11TZ0HL_P3_Q2:b",
);
assert(comparisonReasonChoices);
assert.equal(comparisonReasonChoices.acceptedAnswers[0], "Less than the actual value, because the gradient is increasing");
assert.equal(comparisonReasonChoices.options.length, 5);
assert(comparisonReasonChoices.options.every((option) => choices.toLatex(option).startsWith(String.raw`\text{`)));

const explanationChoices = choices.generateExplanationChoiceSet(
  [["Two planes meet in a line and the third plane is parallel to that line.", "A1"]],
  "Describe the geometrical relationship of the three planes.",
  "audit-explanation",
);
assert(explanationChoices);
assert.equal(explanationChoices.acceptedAnswers[0], "Two planes meet in a line and the third plane is parallel to that line");
assert.equal(explanationChoices.options.length, 5);
assert(explanationChoices.options.every((option) => choices.isDisplaySafe(option)));
const regressionExtrapolationChoices = choices.generateExplanationChoiceSet(
  [["18 is less than the lowest age in the survey OR extrapolation", "A1"]],
  "Diogo is 18 years old. Give a reason why the regression line should not be used.",
  "audit-regression-extrapolation",
);
assert(regressionExtrapolationChoices);
assert.equal(regressionExtrapolationChoices.acceptedAnswers[0], "18 is below the surveyed range, so this would be extrapolation");
const geometricReasonChoices = choices.generateExplanationChoiceSet(
  [["the ratio of consecutive terms is constant", "R1"], [String.raw`\(r=1.04\)`, "A1"]],
  "Explain why these terms form a geometric sequence, and state the common ratio.",
  "audit-geometric-reason",
);
assert(geometricReasonChoices);
assert.equal(geometricReasonChoices.acceptedAnswers[0], "The ratio of consecutive terms is constant; r = 1.04");
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [["stretch takes 3 to 1.5", "A1"], [String.raw`translation maps \((1.5,29)\) to \((4.5,19)\)`, "A1"]],
    "Find the coordinates of M'.",
  ),
  ["(4.5,19)"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`forming the inequality \(0\le x\le\sqrt3\)`, "A1"]],
    "Find the set of values of x.",
  ),
  ["0≤ x≤sqrt(3)"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`the sum is \(-\dfrac{41}{2}=-20.5\)`, "A1"]],
    "Find the sum of the roots.",
  ),
  ["-20.5"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\(\mathbf a=\begin{pmatrix}-1\\4\end{pmatrix}\)`, "A1"], [String.raw`\(\mathbf b=\begin{pmatrix}\dfrac53\\4\end{pmatrix}\)`, "A1"]],
    "Find the vectors a and b.",
  ),
  ["bold(a)=matrix(-1;4); bold(b)=matrix(5/3;4)"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\(H_0\): the spinner is fair, and \(H_1\): the spinner is not fair`, "A1"]],
    "Write down the null and alternative hypotheses.",
  ),
  ["H₀: the spinner is fair; H₁: the spinner is not fair"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers([[String.raw`\(k=4\)`, "A1"]], "Find the value of k."),
  ["k=4"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers([[String.raw`\(h=1\) and \(k=3\)`, "A2"]], "Write down the value of h and of k."),
  ["h=1; k=3"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers([[String.raw`\(x=\sqrt{31}\) or \(\sqrt{51}\)`, "A1"]], "Find the two possible values for the length."),
  ["sqrt(31); sqrt(51)"],
);
const arctangentAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(=\dfrac12\arctan\left(\dfrac{e^x+3}{2}\right)+c\)`, "A1"]],
  String.raw`Find \(\displaystyle\int \dfrac{e^x}{e^{2x}+6e^x+13}\,dx\).`,
);
assert(arctangentAnswers[0].startsWith("latex:"));
assert(choices.toLatex(arctangentAnswers[0]).includes(String.raw`\arctan`));
const asymptoteReasonChoices = choices.generateExplanationChoiceSet(
  [[String.raw`the curve has a vertical asymptote at \(x=\sqrt[4]{2}\ (=1.1892\ldots)\), just beyond \(x=1.15\)`, "R1"]],
  "Give a reason why the estimate is so far from the value.",
  "audit-asymptote-reason",
);
assert(asymptoteReasonChoices);
const secondDerivativeReasonChoices = choices.generateExplanationChoiceSet(
  [[String.raw`at \(\pi/4\), \(d^2A/d\theta^2<0\); maximum when \(f''(x)<0\)`, ""], [String.raw`finding second derivative \(d^2A/d\theta^2=-72\sin2\theta\)`, "A1"]],
  "Use the second derivative to justify that this value of theta gives a maximum.",
  "audit-second-derivative-reason",
);
assert(secondDerivativeReasonChoices);
const boundedProbabilityChoices = choices.generateChoiceSet(["0.358"], "audit-bounded-probability", "Find the probability.");
assert(boundedProbabilityChoices);
assert(boundedProbabilityChoices.options.every((option) => !/^-|\+1|2\*/.test(option)));
assert.equal(
  choices.generateExplanationChoiceSet(
    [["The derivative changes from positive to negative, so the function has a maximum.", "R1"]],
    "Show that the function has a maximum.",
    "audit-show-that",
  ),
  null,
);
assert.equal(
  choices.generateExplanationChoiceSet(
    [["The curve crosses the axis twice.", "R1"]],
    "Draw a diagram to explain the result.",
    "audit-diagram",
  ),
  null,
);
const derivativeExplanationChoices = choices.generateExplanationChoiceSet(
  [[String.raw`\(\dfrac{\mathrm{d}V}{\mathrm{d}x}\) changes from positive to negative, so \(V\) has a maximum.`, "R1"]],
  "Explain why V has a maximum.",
  "audit-derivative-explanation",
);
assert(derivativeExplanationChoices);
assert(derivativeExplanationChoices.options.every((option) => !choices.toLatex(option).includes("/")));

const monotonicityReasonChoices = choices.generateExplanationChoiceSet(
  [
    ["(ii) valid reason with reference to derivative", "R1"],
    [String.raw`e.g. \(f'(x) < 0\), derivative always negative`, ""],
  ],
  "Hence, explain why f is a decreasing function.",
  "audit-monotonicity-reason",
);
assert(monotonicityReasonChoices);
assert.equal(
  monotonicityReasonChoices.options[monotonicityReasonChoices.correctOption],
  String.raw`latex:f'(x) \lt 0\text{ for all }x\text{ in the domain, so }f\text{ is decreasing}`,
);
assert.equal(monotonicityReasonChoices.options.length, 5);
assert(monotonicityReasonChoices.options.every((option) => !/\b(?:valid|invalid|biased|inconclusive|unreliable) reason\b/i.test(option)));
assert.equal(
  choices.toLatex(monotonicityReasonChoices.options[monotonicityReasonChoices.correctOption]),
  String.raw`f'(x) \lt 0\text{ for all }x\text{ in the domain, so }f\text{ is decreasing}`,
);

assert.equal(choices.generateChoiceSet(["correct expression"], "audit-expression-placeholder"), null);
const recoveredExpressionAnswers = choices.extractAcceptedAnswers(
  [
    ["correct expression", "A1A1"],
    [String.raw`e.g. \({}^{7}\mathrm{C}_{4}p^4(1-p)^3\), \(35p^4(1-p)^3\)`, ""],
  ],
  String.raw`Write down an expression, in terms of \(p\), for the probability that he wins exactly four games.`,
);
assert.equal(recoveredExpressionAnswers.length, 1);
assert(choices.toLatex(recoveredExpressionAnswers[0]).includes("p^4"));
assert(!recoveredExpressionAnswers.some((answer) => /correct expression/i.test(answer)));
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [
      ["fully correct expression for the mean", "A1"],
      [String.raw`\(\dfrac{30(7.5 + 20 + 30 + 42.5)}{120}\)`, ""],
      [String.raw`\(25\) (minutes)`, "A1"],
    ],
    "Hence calculate an estimate of the mean waiting time of these patients.",
  ),
  ["25"],
);

const cleanAsymptoticAnswers = choices.extractAcceptedAnswers(
  [
    ["(i) considering large values of \\(t\\)", "(M1)"],
    [String.raw`(i) \(\left(\displaystyle\lim_{t\to\infty}\left(v(t)\right)=\right)6.25\ (\text{m s}^{-1})\)`, "A1"],
  ],
  "Write down the value that v(t) approaches as t becomes very large.",
);
assert.deepEqual(cleanAsymptoticAnswers, ["6.25 m/s"]);
assert.equal(choices.toLatex(cleanAsymptoticAnswers[0]), String.raw`6.25\,\mathrm{m}\,\mathrm{s}^{-1}`);
const cleanAsymptoticChoices = choices.generateChoiceSet(cleanAsymptoticAnswers, "audit-asymptotic-answer");
assert(cleanAsymptoticChoices);
assert(cleanAsymptoticChoices.options.every((option) => !/lim|=|\([^)]*m\/s[^)]*\)/i.test(option)));

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

const exampleVectorEquationAnswers = choices.extractAcceptedAnswers(
  [
    [String.raw`any correct equation in the form \(\boldsymbol{r}=\boldsymbol{a}+t\boldsymbol{b}\), where \(\boldsymbol{b}\) is a scalar multiple of \(\begin{pmatrix}1\\-1\\1\end{pmatrix}\)`, "A2"],
    [String.raw`e.g. \(\boldsymbol{r}=\begin{pmatrix}1\\-1\\4\end{pmatrix}+t\begin{pmatrix}1\\-1\\1\end{pmatrix}\)`, ""],
  ],
  String.raw`Find an equation for \(L_1\) in the form \(\boldsymbol{r}=\boldsymbol{a}+t\boldsymbol{b}\).`,
);
assert(exampleVectorEquationAnswers[0].includes("bold(r)="));
assert(choices.generateChoiceSet(exampleVectorEquationAnswers, "audit-example-vector-equation"));

const notedEquationAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(g(x)=-4+6(x-3)-(x-3)^2\) <b>Note:</b> accept any equivalent form; award M1A0 for \((x+3)\).`, "M1A1"]],
  "Determine the equation of the new graph.",
);
assert.equal(notedEquationAnswers[0], "g(x)=-4+6(x-3)-(x-3)^2");
assert(!notedEquationAnswers.some((answer) => /award|equivalent/i.test(answer)));

assert.equal(
  choices.validateChoiceSet(
    ["The value is higher"],
    ["The value is higher", "The value is lower", "The value is equal", "The value is zero", "The value is unrelated than the other value"],
    0,
  ),
  false,
);
assert(!choices.toLatex("Since n > 1, sqrt(3) is positive").includes(String.raw`\Sin`));
assert(choices.toLatex("Since n > 1, sqrt(3) is positive").includes(String.raw`\sqrt{3}`));

const inverseFunctionRows = [[String.raw`\(f^{-1}(x) = \dfrac{-3x-1}{x-2}\ \left(= \dfrac{3x+1}{2-x},\ \dfrac{7}{2-x} - 3\right)\) (accept \(y =\))`, "A1"]];
const inverseFunctionAnswers = choices.extractAcceptedAnswers(inverseFunctionRows, String.raw`Find \(f^{-1}(x)\).`);
assert.equal(inverseFunctionAnswers[0], "f^-1(x) = (-3x-1)/(x-2)");
assert(choices.generateChoiceSet(inverseFunctionAnswers, "audit-inverse-function"));

const argumentRows = [[String.raw`\(\arg z = 0.9707\) (radians) \((=55.6197^\circ)\)`, "A1"]];
const argumentAnswers = choices.extractAcceptedAnswers(argumentRows, "Find the argument of z, giving your answer to 4 decimal places.");
assert.deepEqual(argumentAnswers, ["0.9707 rad"]);
assert(choices.generateChoiceSet(argumentAnswers, "audit-complex-argument"));

const finalProbabilityAnswers = choices.extractAcceptedAnswers(
  [
    ["correct use of the binomial distribution with their probability", "A1"],
    [String.raw`\(0.490\) \((0.490317\ldots)\)`, "A1"],
  ],
  "Find the probability that no tickets are bought during the week.",
);
assert.deepEqual(finalProbabilityAnswers, ["0.490"]);

const twoObservationChoices = choices.generateExplanationChoiceSet(
  [
    [String.raw`finding the median \((=3)\), the quartiles \((Q_1=2\) and \(Q_3=5)\), or the interquartile range \(\text{IQR}=3\)`, "(A1)"],
    ["any two of the following statements: the median in both seasons is 3 ; in both seasons the lower quartile is 2 and the upper quartile is 5, so the interquartile range is 3 ; both distributions are skewed to the right", "R1R1"],
  ],
  "State two observations that support the conclusion.",
  "audit-two-observations",
);
assert(twoObservationChoices);
assert(twoObservationChoices.options[twoObservationChoices.correctOption].includes(";"));

const isoscelesReasonChoices = choices.generateExplanationChoiceSet(
  [[String.raw`Use isosceles triangle BOD to obtain \(38^\circ\).`, "A1"]],
  "Work out angle OBD. Give a reason for each stage of your working.",
  "audit-isosceles-reason",
);
assert(isoscelesReasonChoices);
assert.equal(isoscelesReasonChoices.options[isoscelesReasonChoices.correctOption], "38°, because triangle BOD is isosceles");

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
assert.deepEqual(choices.extractAcceptedAnswers([[String.raw`\(x=3\)`, "A1"]], "Shade the region where x is greater than 3."), []);

assert.deepEqual(
  choices.extractAcceptedAnswers(
    [
      [String.raw`\(i\) root \(\Rightarrow -i\) is a second root`, "A1"],
      [String.raw`the other two roots are \(2\) and \(3\)`, "A1A1"],
    ],
    "Find the other roots of this equation.",
  ),
  ["-i; 2; 3"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\(p=100,\ q=10,\ r=1\)`, "A1"]],
    String.raw`Determine \(p\), \(q\) and \(r\).`,
  ),
  ["p=100; q=10; r=1"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [["3112.84<br>3110 [3110, 3120] (dollars)", "A1"]],
    "Estimate the mean monthly income.",
  ),
  ["3112.84"],
);
assert(choices.toLatex(String.raw`P(left before 07:00|late) = 3/8`).includes("|"));

const labelledRoundedAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\((\text{TM} =)\ 7.81\text{ m}\ (\sqrt{61}\text{ m},\ 7.81024\ldots\text{ m})\)`, "A1"]],
  "Find TM.",
);
assert.deepEqual(labelledRoundedAnswers, ["7.81 m"]);
assert(choices.generateChoiceSet(labelledRoundedAnswers, "audit-labelled-rounded"));

const lineBreakRoundedAnswers = choices.extractAcceptedAnswers(
  [["4.71104<br>4.71 (minutes)", "A2 N3"]],
  "How long will it take for the barrel to be half-full?",
);
assert.deepEqual(lineBreakRoundedAnswers, ["4.71 minutes"]);
const lineBreakRoundedChoices = choices.generateChoiceSet(lineBreakRoundedAnswers, "audit-line-break-rounded");
assert(lineBreakRoundedChoices);
assert(lineBreakRoundedChoices.options.every((option) => !/^[-+]?\d+(?:\.\d+)?\s+[-+]?\d/.test(option)));

const distributionAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(\overline{X}\sim N\left(\mu,\dfrac{\sigma^2}{100}\right)\)`, "A1"]],
  "State the distribution of the sample mean.",
);
assert.equal(distributionAnswers[0], "overline(X)~ N(mu,(sigma^2)/100)");
assert(choices.generateChoiceSet(distributionAnswers, "audit-distribution"));

const currencyAnswers = choices.extractAcceptedAnswers([["($)37.40", "A1"]], "Find the amount charged.");
assert.deepEqual(currencyAnswers, ["37.40"]);
assert(choices.generateChoiceSet(currencyAnswers, "audit-currency"));

const centralLimitChoices = choices.generateConceptChoiceSet(
  [["For n sufficiently large, the sample mean is approximately normally distributed.", "A1"]],
  "State the central limit theorem.",
  "audit-central-limit-theorem",
);
assert(centralLimitChoices);
assert.equal(centralLimitChoices.options.length, 5);

const integralAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(\displaystyle\int_1^2\left(f(x)\right)^2\,dx = \dfrac{31}{5}\ (= 6.2)\)`, "A1"]],
  String.raw`Find \(\displaystyle\int_1^2\left(f(x)\right)^2\,dx\).`
);
assert.equal(integralAnswers[0], "31/5");
assert(!integralAnswers.some((answer) => /(?:displaystyle|\bint\b)/i.test(answer)));
assert(choices.generateChoiceSet(integralAnswers, "audit-definite-integral"));
const integralExpressionAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(A=\displaystyle\int_0^1 f(x)\,dx\)`, "A1"]],
  "Write down an integral that represents the area.",
);
assert.equal(integralExpressionAnswers[0], String.raw`latex:A=\displaystyle\int_0^1 f(x)\,dx`);
assert(choices.toLatex(integralExpressionAnswers[0]).includes(String.raw`\int`));
assert(choices.generateChoiceSet(integralExpressionAnswers, "audit-integral-expression"));
const labelledIntegralAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(d=\int_0^9 v\,dt\)`, "A1"]],
  "Write down an expression for d.",
);
assert(choices.toLatex(labelledIntegralAnswers[0]).includes(String.raw`\int`));
assert.deepEqual(
  choices.extractAcceptedAnswers([[String.raw`\(=18\)`, "A1"]], String.raw`Evaluate \(\displaystyle\int_{0.1}^{1}|f(x)|\,dx\).`),
  ["18"],
);
const showWorkingAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(=2738.4\text{ kg/m}^3\)`, "A1"]],
  "Work out the upper bound for the density. Show your working clearly.",
);
assert.deepEqual(showWorkingAnswers, ["2738.4 kg/m^3"]);
assert(choices.generateChoiceSet(showWorkingAnswers, "audit-show-working"));

const limitationChoices = choices.generateExplanationChoiceSet(
  [["The model ignores air resistance.", "R1"]],
  "Write down one limitation of the model.",
  "audit-limitation",
);
assert(limitationChoices);
assert.equal(limitationChoices.acceptedAnswers[0], "The model ignores air resistance");
const transformationChoices = choices.generateExplanationChoiceSet(
  [
    [String.raw`Translation through \(\begin{pmatrix}2\\0\end{pmatrix}\)`, "A1"],
    [String.raw`EITHER a stretch scale factor \(\dfrac12\) parallel to the \(y\)-axis, then a translation through \(\begin{pmatrix}0\\-4\end{pmatrix}\)`, "A2"],
  ],
  "State each of the transformations in the order in which they are applied.",
  "audit-transformations",
);
assert(transformationChoices);
assert.equal(transformationChoices.options.length, 5);
assert(transformationChoices.options.every((option) => !/skew|coincident|intersecting at one point/i.test(option)));
const modelReasonChoices = choices.generateExplanationChoiceSet(
  [[String.raw`a comparison of the coefficients of determination, \(0.922\ (0.921787\ldots)\) for the power model and \(0.999\ (0.998836\ldots)\) for the exponential model`, "R1"]],
  "State a reason why Jonas's model is a better fit than Ines's model.",
  "audit-model-comparison",
);
assert(modelReasonChoices);
assert(modelReasonChoices.acceptedAnswers[0].includes("closer to 1"));
assert(modelReasonChoices.options.every((option) => !/-0\.922|2\.922/.test(option)));
assert.deepEqual(choices.extractAcceptedAnswers([["B.", "B1"]], "Write down the letter of the graph."), ["B"]);
assert(choices.generateChoiceSet(["B"], "audit-letter-choice", "Write down the letter of the graph."));
assert.deepEqual(choices.extractAcceptedAnswers([["any correct Hamiltonian cycle, e.g. ABCDEFA", "A1"]], "Write down a Hamiltonian cycle for this graph."), ["ABCDEFA"]);
assert(choices.generateChoiceSet(["ABCDEFA"], "audit-cycle", "Write down a Hamiltonian cycle for this graph."));

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
assert.deepEqual(
  choices.extractAcceptedAnswers([[String.raw`\(n=10\)`, "A1"]], "Find n, given that the probability that a student passes is 0.8."),
  ["n=10"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\(h(-x)=h(x)=-h(x)\Rightarrow 2h(x)=0\Rightarrow h(x)=0\)`, "M1A1"]],
    String.raw`The function h is both odd and even. Find \(h(x)\).`,
  ),
  ["h(x)=0"],
);
assert.deepEqual(
  choices.extractAcceptedAnswers(
    [[String.raw`\(z_1=3\sqrt3+i\), \(z_2=-3\sqrt3+i\), \(z_3=-8i\)`, "A1"]],
    "Determine the roots of the equation.",
  ),
  ["z=3*sqrt(3)+i; z=-3*sqrt(3)+i; z=-8i"],
);
const pairedHypotheses = choices.extractAcceptedAnswers(
  [[String.raw`\(H_0:p=0.4\)`, "A1"], [String.raw`\(H_1:p>0.4\)`, "A1"]],
  "State the null and alternative hypotheses.",
);
assert.equal(pairedHypotheses[0], "H_0:p=0.4; H_1:p>0.4");
assert(choices.generateChoiceSet(pairedHypotheses, "audit-hypotheses"));
const rawLatexSet = choices.generateChoiceSet([String.raw`latex:f^{-1}(x)=\frac{3x+1}{2-x}`], "audit-raw-latex");
assert(rawLatexSet);
assert(rawLatexSet.options.every((option) => !choices.toLatex(option).includes("latex:")));

const intervalAnswers = choices.extractAcceptedAnswers(
  [[String.raw`range is \(\left[-3,\ \dfrac32\right]\)`, "A2"]],
  "State the range of f.",
);
assert.deepEqual(intervalAnswers, ["[-3, 3/2]"]);
assert(choices.generateChoiceSet(intervalAnswers, "audit-interval"));

const unrestrictedDomain = choices.generateChoiceSet(
  ["x∈blackboard(R)"],
  "audit-unrestricted-domain",
  "State the domain of f.",
);
assert(unrestrictedDomain);
assert(unrestrictedDomain.options.every((option) => !/blackboard\([QZNC]\)/.test(option)));
assert(unrestrictedDomain.options.some((option) => option === "x≠0"));

const unrestrictedRange = choices.generateChoiceSet(
  ["f(x)∈blackboard(R)"],
  "audit-unrestricted-range",
  "State the range of f.",
);
assert(unrestrictedRange);
assert(unrestrictedRange.options.every((option) => !/blackboard\([QZNC]\)/.test(option)));
assert(unrestrictedRange.options.some((option) => option === "-1≤f(x)≤1"));

const yInterceptAnswers = choices.extractAcceptedAnswers(
  [[String.raw`\(y\)-intercept is \(-\dfrac13\) (exact), \(-0.333\), \(\left(0,-\dfrac13\right)\)`, "A1"]],
  String.raw`Find the \(y\)-intercept.`,
);
assert.deepEqual(yInterceptAnswers, ["(0,-1/3)"]);
const yInterceptChoices = choices.generateChoiceSet(yInterceptAnswers, "audit-y-intercept", "Find the y-intercept.");
assert(yInterceptChoices);
assert(yInterceptChoices.options.every((option) => /^\(0,/.test(option)));

const evaluatedFunctionAnswers = choices.extractAcceptedAnswers(
  [
    [String.raw`\(f(1) = 1-\arctan1 = 1-\dfrac{\pi}{4}\)`, "A1"],
    [String.raw`\(f\left(-\sqrt3\right) = -\sqrt3-\arctan\left(-\sqrt3\right) = -\sqrt3+\dfrac{\pi}{3}\)`, "A1"],
  ],
  String.raw`Find \(f(1)\) and \(f\left(-\sqrt3\right)\).`,
);
assert.deepEqual(evaluatedFunctionAnswers, ["f(1)=1-π/4; f(-sqrt(3))=-sqrt(3)+π/3"]);
const evaluatedFunctionChoices = choices.generateChoiceSet(
  evaluatedFunctionAnswers,
  "audit-evaluated-functions",
  String.raw`Find \(f(1)\) and \(f\left(-\sqrt3\right)\).`,
);
assert(evaluatedFunctionChoices);
assert.equal(evaluatedFunctionChoices.options[evaluatedFunctionChoices.correctOption], evaluatedFunctionAnswers[0]);
assert(evaluatedFunctionChoices.options.every((option) => /^f\(1\)=.+; f\(-sqrt\(3\)\)=/.test(option)));

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
let verifiedMonotonicityReasonQuestion = false;
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
        const directlyLabelledRows = new Map((Array.isArray(question.markscheme) ? question.markscheme : [])
          .filter(Array.isArray)
          .map((group) => [String(group[0] || "").toLowerCase(), Array.isArray(group[1]) ? group[1] : []]))
          .get(`${String(part || "").toLowerCase()}(${nestedLabel})`) || [];
        const labelledRows = directlyLabelledRows.length ? directlyLabelledRows : rowsForSubpart(rows, nestedLabel);
        const nestedRows = labelledRows.length ? labelledRows : rows;
        const nestedAccepted = choices.extractAcceptedAnswers(nestedRows, nestedPrompt);
        const nestedSet = hasSharedWhiteboardInstruction(prompt)
          ? null
          : choiceSetForRows(nestedRows, nestedPrompt, `${question.id}:${part}(${nestedLabel})`);
        if (nestedAccepted.length || nestedSet) bankNestedChecked += 1;
        if (!nestedSet && looksObjective(nestedPrompt)) objectiveFallbacks.push(`${label} ${question.id} ${part}(${nestedLabel}): ${plainText(nestedPrompt)}`);
        if (nestedSet) {
          if (!choices.validateChoiceSet(nestedSet.acceptedAnswers, nestedSet.options, nestedSet.correctOption)) {
            throw new Error(`Unsafe nested choices for ${question.id} ${part}(${nestedLabel})`);
          }
          const unrenderedNestedOption = nestedSet.options.find((option) => choices.toLatex(option).includes("/"));
          if (unrenderedNestedOption) {
            throw new Error(`Unrendered nested fraction for ${question.id} ${part}(${nestedLabel}): ${JSON.stringify(unrenderedNestedOption)} -> ${JSON.stringify(choices.toLatex(unrenderedNestedOption))}`);
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
        if (question.id === "N14TZ0HL_P1_Q13" && part === "a" && nestedLabel === "iii") {
          assert(nestedAccepted.some((answer) => /i\*tan\(π\/8\)/.test(answer)), `Malformed trigonometric root: ${JSON.stringify(nestedAccepted)}`);
          assert(nestedSet);
        }
        if ((question.id === "M08TZ2SL_P1_Q8" || question.id === "M09TZ1SL_P1_Q9") && part === "a") {
          assert(nestedSet, `Column-vector answer was not generated for ${question.id} ${part}(${nestedLabel})`);
          assert(nestedSet.options.every((option) => choices.toLatex(option).includes(String.raw`\begin{pmatrix}`)));
          verifiedColumnVectorQuestion = true;
        }
        if (question.id === "M10TZ1SL_P2_Q9" && part === "c" && nestedLabel === "ii") {
          assert(nestedSet, "The real decreasing-function explanation did not produce choices.");
          assert.equal(
            choices.toLatex(nestedSet.options[nestedSet.correctOption]),
            String.raw`f'(x) \lt 0\text{ for all }x\text{ in the domain, so }f\text{ is decreasing}`,
          );
          assert.equal(nestedSet.options.length, 5);
          verifiedMonotonicityReasonQuestion = true;
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
        assert(accepted.some((answer) => answer.replace(/\s/g, "") === "x=±sqrt(5)"), JSON.stringify(accepted));
        assert(accepted.some((answer) => answer.replace(/\s/g, "") === "x=±2.24"), JSON.stringify(accepted));
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
      if ((question.id === "M11TZ2SL_P2_Q8" || question.id === "H_M11TZ2SL_P2_Q8") && part === "b") {
        assert(accepted[0] && accepted[0].replace(/\s/g, "").includes("bold(r)="), `Vector-line equation was reduced to a direction vector: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "N15TZ0HL_P1_Q11" && part === "a") {
        assert(accepted[0] && accepted[0].includes("-2i") && accepted[0].includes("sqrt(3)"), `Not all requested cube roots were retained: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "M12TZ1HL_P1_Q9" && part === "") {
        assert(!accepted.some((answer) => /^\(a,\s*b\)/i.test(answer)), `Generic coordinate leaked into the answer: ${JSON.stringify(accepted)}`);
      }
      if (question.id === "N12TZ0HL_P2_Q4" && part === "") {
        assert.deepEqual(accepted, ["mean=10.7; variance=1.37"]);
        assert(choices.generateChoiceSet(accepted, `${question.id}:${part}`, prompt));
      }
      if (question.id === "M19TZ1AISL_P1_Q11" && part === "a") {
        const tableSet = choices.generateConceptChoiceSet(rows, prompt, `${question.id}:${part}`);
        assert(tableSet);
        assert.equal(tableSet.options[tableSet.correctOption], "C; D");
      }
      if (question.id === "N15TZ0HL_P3_Q2" && part === "b") {
        assert.equal(accepted[0], "f(x)=x+x^2+(1/3)*x^3-(1/30)*x^5");
        const seriesSet = choices.generateChoiceSet(accepted, `${question.id}:${part}`);
        assert(seriesSet);
        assert(seriesSet.options.every((option) => choices.toLatex(option).includes("x")));
        verifiedMaclaurinSeriesQuestion = true;
      }
      const set = choiceSetForRows(rows, prompt, `${question.id}:${part}`);
      if (!accepted.length && !set) {
        if (looksObjective(prompt) && !nested.length) objectiveFallbacks.push(`${label} ${question.id} ${part}: ${plainText(prompt)}`);
        continue;
      }
      bankChecked += 1;
      if (!set && looksObjective(prompt)) objectiveFallbacks.push(`${label} ${question.id} ${part}: ${plainText(prompt)}`);
      if (!set) continue;
      if (!choices.validateChoiceSet(set.acceptedAnswers, set.options, set.correctOption)) throw new Error(`Unsafe choices for ${question.id} ${part}`);
      const unrenderedOption = set.options.find((option) => choices.toLatex(option).includes("/"));
      if (unrenderedOption) throw new Error(`Unrendered fraction for ${question.id} ${part}: ${JSON.stringify(unrenderedOption)} -> ${JSON.stringify(choices.toLatex(unrenderedOption))}`);
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
assert(verifiedMonotonicityReasonQuestion, "The real decreasing-function explanation question was not audited.");
console.log(`Total: ${generated}/${checked} mark-scheme answer groups produced five safe choices; every generated set passed notation, duplicate and accepted-answer checks.`);
console.log(`Nested parts: ${nestedGenerated}/${nestedChecked} answerable parts produced five safe choices; drawing, proof and show-that parts remained whiteboard tasks.`);
let allActiveQuestions = 0;
let allAnswerParts = 0;
let allWhiteboardParts = 0;
let allQuestionsWithWhiteboard = 0;
const objectiveFailureKinds = new Map();
const objectiveFailureVerbs = new Map();
const objectiveFailureShapes = new Map();
const activeObjectiveFallbacks = [];
const explanationFallbacks = [];
const whiteboardReasonCounts = new Map();
let objectiveWhiteboardParts = 0;
const objectiveWhiteboardQuestions = new Set();
let verifiedIgcseNestedMarkschemeLabels = false;
for (const [label, path] of banks) {
  const questions = extractSeed(path).filter((question) => activeQuestionIds[label].has(String(question.id || "")));
  let bankAnswerParts = 0;
  let bankWhiteboardParts = 0;
  let bankQuestionsWithWhiteboard = 0;
  for (const question of questions) {
    const configs = assignmentPartConfigs(question);
    if (label === "IGCSE" && question.id === "4MA1_2020N_1H_Q7") {
      const nestedSolution = configs.find((config) => config.label === "c(ii)");
      assert(nestedSolution?.choices, "The separately labelled IGCSE c(ii) mark scheme did not produce choices.");
      assert(nestedSolution.choices.acceptedAnswers.some((answer) => /y=8/.test(answer) && /y=-6/.test(answer)), "The IGCSE c(ii) solution set was incomplete.");
      verifiedIgcseNestedMarkschemeLabels = true;
    }
    for (const config of configs.filter((part) => part.choices)) {
      inspectChoiceQuality(config.choices, `${label} ${question.id} ${config.label}`, config.prompt, config.rows);
      liveChoiceSamples.push({ bank: label, id: question.id, part: config.label, prompt: plainText(config.prompt), choices: config.choices, rows: config.rows });
    }
    const whiteboardParts = configs.filter((config) => !config.choices);
    bankAnswerParts += configs.length;
    bankWhiteboardParts += whiteboardParts.length;
    if (whiteboardParts.length) bankQuestionsWithWhiteboard += 1;
    for (const config of whiteboardParts) {
      const reason = requiresWhiteboardTask(config.prompt)
        ? "proof, show-that or drawing task"
        : looksExplanation(config.prompt)
          ? "open explanation without a complete choice set"
          : looksObjective(config.prompt)
            ? "objective-looking part still needing an answer"
            : "other open or source-incomplete response";
      whiteboardReasonCounts.set(reason, (whiteboardReasonCounts.get(reason) || 0) + 1);
    }
    for (const config of whiteboardParts.filter((part) => looksObjective(part.prompt))) {
      objectiveWhiteboardParts += 1;
      objectiveWhiteboardQuestions.add(`${label}:${question.id}`);
      const kind = config.accepted.length ? "accepted answer found, but four safe alternatives were not generated" : "mark-scheme answer was not extracted";
      objectiveFailureKinds.set(kind, (objectiveFailureKinds.get(kind) || 0) + 1);
      let shape = "accepted answer needs distractors";
      if (!config.accepted.length) {
        const awardedRows = config.rows.filter((row) => Array.isArray(row) && /(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(row[1] || "")));
        if (!config.rows.length) shape = "no mark-scheme rows";
        else if (!awardedRows.length) shape = "no credited answer row";
        else if (!awardedRows.some((row) => /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/.test(String(row[0] || "")))) shape = "credited prose answer";
        else shape = "credited mathematical answer not parsed";
      }
      objectiveFailureShapes.set(shape, (objectiveFailureShapes.get(shape) || 0) + 1);
      const verb = plainText(config.prompt).match(/\b(find|calculate|write down|state|determine|solve|evaluate|express|give)\b/i);
      const key = verb ? verb[1].toLowerCase() : "other";
      objectiveFailureVerbs.set(key, (objectiveFailureVerbs.get(key) || 0) + 1);
      activeObjectiveFallbacks.push({ bank: label, id: question.id, part: config.label, prompt: plainText(config.prompt), accepted: config.accepted, rows: config.rows });
    }
    for (const config of whiteboardParts.filter((part) => looksExplanation(part.prompt))) {
      explanationFallbacks.push({ bank: label, id: question.id, part: config.label, prompt: plainText(config.prompt), accepted: config.accepted, rows: config.rows });
    }
  }
  allActiveQuestions += questions.length;
  allAnswerParts += bankAnswerParts;
  allWhiteboardParts += bankWhiteboardParts;
  allQuestionsWithWhiteboard += bankQuestionsWithWhiteboard;
  console.log(`${label} assignment inventory: ${bankWhiteboardParts}/${bankAnswerParts} answer parts use whiteboard or paper, across ${bankQuestionsWithWhiteboard}/${questions.length} active questions.`);
}
assert(verifiedIgcseNestedMarkschemeLabels, "The IGCSE nested mark-scheme label regression question was not audited.");
console.log(`Combined assignment inventory: ${allWhiteboardParts}/${allAnswerParts} answer parts use whiteboard or paper, across ${allQuestionsWithWhiteboard}/${allActiveQuestions} active questions.`);
const qualityIssueCounts = new Map();
choiceQualityIssues.forEach((issue) => qualityIssueCounts.set(issue.kind, (qualityIssueCounts.get(issue.kind) || 0) + 1));
console.log(`Live assignment-choice quality review: ${choiceQualityIssues.length} flagged options or answer-format mismatches.`);
if (choiceQualityIssues.length) {
  console.log(`Live choice-quality flags: ${Array.from(qualityIssueCounts.entries()).sort((left, right) => right[1] - left[1]).map(([kind, count]) => `${kind} ${count}`).join(", ")}.`);
}
console.log(`Objective-looking whiteboard inventory: ${objectiveWhiteboardParts} parts across ${objectiveWhiteboardQuestions.size} active questions.`);
console.log(`Objective fallback causes: ${Array.from(objectiveFailureKinds, ([kind, count]) => `${count} ${kind}`).join("; ")}.`);
console.log(`Objective fallback shapes: ${Array.from(objectiveFailureShapes, ([shape, count]) => `${count} ${shape}`).join("; ")}.`);
console.log(`Objective fallback prompt verbs: ${Array.from(objectiveFailureVerbs.entries()).sort((left, right) => right[1] - left[1]).map(([verb, count]) => `${verb} ${count}`).join(", ")}.`);
console.log(`Explanation-style whiteboard inventory: ${explanationFallbacks.length} parts.`);
console.log(`Whiteboard reason breakdown: ${Array.from(whiteboardReasonCounts.entries()).map(([reason, count]) => `${count} ${reason}`).join("; ")}.`);
const auditDetailModes = String(process.env.ASSIGNMENT_AUDIT_DETAILS || "");
if (auditDetailModes.includes("1")) {
  console.log(`Objective-looking whiteboard fallbacks: ${objectiveFallbacks.length}`);
  objectiveFallbacks.slice(0, 120).forEach((item) => console.log(`- ${item}`));
}
if (auditDetailModes.includes("2")) {
  activeObjectiveFallbacks.slice(0, 100).forEach((item) => {
    console.log(`\n${item.bank} ${item.id} ${item.part}: ${item.prompt}`);
    console.log(`accepted=${JSON.stringify(item.accepted)} rows=${JSON.stringify(item.rows.slice(-4))}`);
  });
}
if (auditDetailModes.includes("3")) {
  explanationFallbacks.slice(0, 200).forEach((item) => {
    console.log(`\n${item.bank} ${item.id} ${item.part}: ${item.prompt}`);
    console.log(`accepted=${JSON.stringify(item.accepted)} rows=${JSON.stringify(item.rows.slice(-6))}`);
  });
}
if (auditDetailModes.includes("4")) {
  choiceQualityIssues.slice(0, 300).forEach((item) => {
    console.log(`\n${item.kind} | ${item.meta}: ${item.prompt}`);
    console.log(`option=${JSON.stringify(item.option)} rendered=${JSON.stringify(item.rendered)}`);
  });
}
if (auditDetailModes.includes("5")) {
  var stride = Math.max(1, Math.floor(liveChoiceSamples.length / 80));
  liveChoiceSamples.filter((_item, index) => index % stride === 0).slice(0, 80).forEach((item) => {
    console.log(`\n${item.bank} ${item.id} ${item.part}: ${item.prompt}`);
    console.log(`correct=${JSON.stringify(item.choices.options[item.choices.correctOption])}`);
    console.log(`wrong=${JSON.stringify(item.choices.options.filter((_option, index) => index !== item.choices.correctOption))}`);
  });
}
if (auditDetailModes.includes("6")) {
  const filter = String(process.env.ASSIGNMENT_AUDIT_FILTER || "").trim();
  const filters = filter.split(",").map((value) => value.trim()).filter(Boolean);
  activeObjectiveFallbacks
    .concat(liveChoiceSamples.map((item) => ({ ...item, accepted: item.choices.acceptedAnswers })))
    .filter((item) => !filters.length || filters.some((value) => item.id.includes(value)))
    .slice(0, 80)
    .forEach((item) => {
      console.log(`\n${item.bank} ${item.id} ${item.part}: ${item.prompt}`);
      console.log(`accepted=${JSON.stringify(item.accepted || [])} rows=${JSON.stringify((item.rows || []).slice(-10))}`);
    });
}
