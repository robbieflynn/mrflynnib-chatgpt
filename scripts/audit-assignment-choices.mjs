import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

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
    .replace(/\\left|\\right/g, "")
    .replace(/\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\(?:leq|le)/g, "≤").replace(/\\(?:geq|ge)/g, "≥")
    .replace(/\\neq/g, "≠").replace(/\\pm/g, "±").replace(/\\infty/g, "∞")
    .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
    .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/[{}]/g, ""))
    .replace(/^=\s*/, "")
    .trim();
}

function acceptedFromRows(rows) {
  const answerRows = (Array.isArray(rows) ? rows : []).filter((row) => Array.isArray(row) && /(?:A\d|B\d|M\d|R\d|G\d|N\d|E\d|AG)/.test(String(row[1] || "")));
  if (!answerRows.length) return [];
  const final = String(answerRows.at(-1)[0] || "");
  const alternatives = final.split(/(?:<br\s*\/?>\s*<b>\s*OR\s*<\/b>\s*<br\s*\/?>|\s+or\s+)/i);
  const answers = [];
  for (const alternative of alternatives) {
    const fragments = Array.from(alternative.matchAll(/\\\(([\s\S]*?)\\\)/g), (match) => match[1]);
    const answer = fragments.length === 1 ? latexToPlain(fragments[0]) : plain(alternative);
    if (answer && answer.length <= 140 && !answers.some((item) => choices.equivalent(item, answer))) answers.push(answer);
  }
  return answers;
}

const banks = [
  ["IB", "public/question-bank/ib-bank.html"],
  ["IGCSE", "public/question-bank/igcse-bank.html"],
];

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

console.log(`Total: ${generated}/${checked} mark-scheme answer groups produced five safe choices; every generated set passed duplicate and accepted-answer checks.`);
