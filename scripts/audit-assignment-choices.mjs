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

function plain(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function latexToPlain(value) {
  return plain(String(value || "")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/(\d+)\s*\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1 $2/$3")
    .replace(/(\d+)\s*\\(?:d?frac)\s*(\d)\s*(\d)/g, "$1 $2/$3")
    .replace(/\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\(?:d?frac)\s*(\d)\s*(\d)/g, "$1/$2")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s*([A-Za-z0-9.]+)/g, "sqrt($1)")
    .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\(?:leq|le)/g, "≤").replace(/\\(?:geq|ge)/g, "≥")
    .replace(/\^\s*\\circ/g, "°").replace(/\\circ/g, "°")
    .replace(/\\neq/g, "≠").replace(/\\pm/g, "±").replace(/\\infty/g, "∞")
    .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
    .replace(/\\therefore/g, "")
    .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/[{}]/g, ""))
    .replace(/^=\s*/, "")
    .trim();
}

function addAnswer(list, value) {
  const answer = choices.clean(latexToPlain(value)).replace(/[.;,]+$/, "").trim();
  if (!answer || answer.length > 140) return;
  if (/\b(method|attempt|award|working|substitution|curve|diagram|sketch|proof|explanation)\b/i.test(answer)) return;
  const alternatives = answer.split(/\s+or\s+/i).filter(Boolean);
  if (alternatives.length > 1) {
    alternatives.forEach((alternative) => addAnswer(list, alternative));
    return;
  }
  if (answer.includes("=") && !/[<>&≤≥]/.test(answer)) {
    const rightSide = answer.slice(answer.lastIndexOf("=") + 1).trim();
    if (rightSide && rightSide.length < answer.length) addAnswer(list, rightSide);
  }
  if (!list.some((item) => choices.equivalent(item, answer))) list.push(answer);
}

function acceptedFromRows(rows) {
  const answerRows = (Array.isArray(rows) ? rows : []).filter((row) => Array.isArray(row) && /(?:A\d|B\d|M\d|R\d|G\d|N\d|E\d|AG)/.test(String(row[1] || "")));
  if (!answerRows.length) return [];
  const final = String(answerRows.at(-1)[0] || "");
  const alternatives = final.split(/(?:<br\s*\/?>\s*<b>\s*OR\s*<\/b>\s*<br\s*\/?>|\s+or\s+)/i);
  const answers = [];
  for (const alternative of alternatives) {
    const fragments = Array.from(alternative.matchAll(/\\\(([\s\S]*?)\\\)/g), (match) => match[1]);
    if (fragments.length === 1) addAnswer(answers, fragments[0]);
    else addAnswer(answers, plain(alternative));
  }
  return answers;
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

let checked = 0;
let generated = 0;
for (const [label, path] of banks) {
  const questions = extractSeed(path);
  let bankChecked = 0;
  let bankGenerated = 0;
  for (const question of questions) {
    for (const [part, rows] of Array.isArray(question.markscheme) ? question.markscheme : []) {
      const accepted = acceptedFromRows(rows);
      if (!accepted.length) continue;
      bankChecked += 1;
      const set = choices.generateChoiceSet(accepted, `${question.id}:${part}`);
      if (!set) continue;
      if (!choices.validateChoiceSet(accepted, set.options, set.correctOption)) throw new Error(`Unsafe choices for ${question.id} ${part}`);
      bankGenerated += 1;
    }
  }
  checked += bankChecked;
  generated += bankGenerated;
  console.log(`${label}: ${bankGenerated}/${bankChecked} mark-scheme answer groups produced five safe choices.`);
}

console.log(`Total: ${generated}/${checked} mark-scheme answer groups produced five safe choices; every generated set passed notation, duplicate and accepted-answer checks.`);
