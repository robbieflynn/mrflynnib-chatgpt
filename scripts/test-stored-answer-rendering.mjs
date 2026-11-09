import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const choices = require('../public/question-bank/assignment-choice-utils.js');
const read = path => readFileSync(path, 'utf8');
const bank = read('public/question-bank/ib-bank.html');
const embeddedKatex = [...bank.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(script => script.includes('KaTeX parse error'));
assert(embeddedKatex, 'Test the actual question-bank maths renderer');
const rendererModule = { exports: {} };
vm.runInThisContext("(function(module,exports){" + embeddedKatex + "\n})")(rendererModule, rendererModule.exports);
const katex = rendererModule.exports;
const igcseRenderer = [...read('public/question-bank/igcse-bank.html').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(script => script.includes('KaTeX parse error'));
assert.equal(igcseRenderer, embeddedKatex, 'Both banks must pass against the same renderer');
const catalog = JSON.parse(read('src/data/assignment-answer-configs.json'));
const fixes = JSON.parse(read('question-bank-data/reviewed-format-answer-fixes.json'));
// These were previously missed because word boundaries do not catch "ldotsi".
const commandLeak = /ldots|cdots|dfrac|tfrac|mathrm|mathcal|mathbf|displaystyle|textstyle|phantom|kern\d|[<>≤≥]slant/i;
const errors = [];
let options = 0;
let questions = 0;
const warnings = new Set();
const previousWarn = console.warn;
console.warn = message => warnings.add(message);
try {
  for (const bank of ['ib', 'igcse']) for (const q of Object.values(catalog[bank])) {
    questions++;
    for (const part of [q, ...q.parts]) for (const option of part.options) {
      options++;
      const location = `${bank} ${q.id} ${part.label || 'answer'}`;
      if (!option.startsWith('latex:') && commandLeak.test(option)) errors.push(`${location}: leaked command ${option}`);
      if (/�|\[object Object\]|\bNaN\b|&(?:amp|nbsp|lt|gt);/.test(option)) errors.push(`${location}: malformed text ${option}`);
      try {
        const html = katex.renderToString(choices.toLatex(option), { throwOnError: true, strict: 'ignore' });
        assert(!html.includes('katex-error'));
      } catch (error) { errors.push(`${location}: ${error.message}`); }
    }
  }
} finally { console.warn = previousWarn; }
assert.deepEqual(errors, [], 'Every stored answer choice must render successfully');
for (const [id, fix] of Object.entries(fixes)) for (const [label, expected] of Object.entries(fix.parts)) {
  const part = catalog.ib[id].parts.find(p => p.label === label);
  assert.deepEqual(part.options, expected.options);
  assert.deepEqual(part.acceptedAnswers, expected.answers);
  assert.equal(part.correctOption, expected.correctOption);
  if (expected.mode === "whiteboard") { assert.equal(part.mode, "whiteboard"); continue; }
  assert.equal(part.options.length, 5);
  assert.equal(new Set(part.options).size, 5);
  assert(part.acceptedAnswers.includes(part.options[part.correctOption]));
}
// Independent calculations for the corrected roots, exponential sum and binomial values.
const close = (a, b) => assert(Math.abs(a - b) < 1e-10);
close(Math.cos(3 * 5 * Math.PI / 6), 0);
close(Math.sin(3 * 5 * Math.PI / 6), 1);
close((2 / 3) ** 4, 16 / 81);
close((4 * (5 * Math.PI / 6 - Math.PI / 6)) % (2 * Math.PI), 2 * Math.PI / 3);
close(Math.hypot(Math.cos(.7) + Math.cos(1.3), Math.sin(.7) + Math.sin(1.3)), 2 * Math.cos(.3));
assert.equal((2 * Math.cos(.3)).toPrecision(3), '1.91');
close(Math.atan2(Math.sin(.7) + Math.sin(1.3), Math.cos(.7) + Math.cos(1.3)), 1);
assert.equal(5 * (4 / 5), 4);
assert.equal(3628800 / (120 * 120), 252);
assert.equal([1, 6, 15, 20, 15, 6, 1].reduce((sum, n) => sum + n*n, 0), 924);
// Complete complex solution sets: both roots square to 4i; all three rotated
// cube roots have the same cube. These checks are independent of extraction.
for (const angle of [Math.PI / 4, -3 * Math.PI / 4]) {
  close(4 * Math.cos(2 * angle), 0);
  close(4 * Math.sin(2 * angle), 4);
}
for (const angle of [8 * Math.PI / 9, -4 * Math.PI / 9, 2 * Math.PI / 9]) {
  close(64 * Math.cos(3 * angle), -32);
  close(64 * Math.sin(3 * angle), 32 * Math.sqrt(3));
}
close(13 * Math.sqrt(2) * Math.cos(-Math.PI / 4), 13);
close(13 * Math.sqrt(2) * Math.sin(-Math.PI / 4), -13);
close(2 * Math.sqrt(5) * Math.cos(Math.PI / 3), Math.sqrt(5));
close(2 * Math.sqrt(5) * Math.sin(Math.PI / 3), Math.sqrt(15));
close(Math.PI / 2 - Math.PI / 9, 7 * Math.PI / 18);
close(6 * .75 ** 2, 3.375);
close(7 * Math.PI / 18 + 2 * Math.PI / 9, 11 * Math.PI / 18);
// Numeric superscripts must end before adjacent coefficients and nested exponents stay grouped.
for (const value of ['e^(sqrt(x^2+6x-11))', 'B_n-0.1(0.300L_nB_n-1.92B_n)', '29.84 ($)', '-(1%)', 'h(t)_ min=4']) {
  assert.doesNotThrow(() => katex.renderToString(choices.toLatex(value), { throwOnError: true }));
}
const browser = {};
vm.runInNewContext(read('public/question-bank/assignment-choice-utils.js'), browser);
assert.deepEqual(Object.keys(browser.MrFlynnAssignmentChoices).sort(), ['renderAnswer', 'shuffled']);
const response = read('public/question-bank/assignment-response.js');
assert(!/repairStoredChoiceOptions|generateChoiceSet|extractAcceptedAnswers/.test(response));
assert(read('src/lib/assignment-answer-config.ts').includes('import fixedAssignmentConfigs from "@/data/assignment-answer-configs.json"'));
console.log(`PASS: all ${options} stored choices across ${questions} questions render; reviewed corrections match; browser exposes no answer generation or content repair.`);
console.log(`Renderer font-metric notices reviewed separately: ${warnings.size} distinct notices (not parse failures).`);
