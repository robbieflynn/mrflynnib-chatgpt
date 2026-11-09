import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import katex from 'katex';

const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(await readFile(resolve(root, 'question-bank-data/formula-booklets.json'), 'utf8'));
const directory = resolve(root, 'public/question-bank/formula-booklets');
await mkdir(directory, { recursive: true });
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const math = (text, display = true) => katex.renderToString(text, { output: 'mathml', displayMode: display, throwOnError: true, strict: 'error' });
const rich = (text) => text.split(/(\\\([\s\S]*?\\\))/g).map((part) => part.startsWith('\\(') ? math(part.slice(2, -2), false) : escape(part)).join('');

for (const [course, topics] of Object.entries(data.courses)) {
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${course} Formula booklet</title><link rel="stylesheet" href="/question-bank/formula-booklet-content.css?v=1"><script defer src="/question-bank/formula-booklet-content.js?v=1"></script></head><body data-formula-booklet="${course}"><h1 class="sr-only">${course} Formula booklet</h1><nav aria-label="Formula booklet topics">`;
  html += data.topics.map((name, index) => `<a href="#topic-${index + 1}" title="${escape(name)}">Topic ${index + 1}</a>`).join('');
  html += '</nav><main>';
  topics.forEach((groups, topic) => {
    html += `<section id="topic-${topic + 1}"><h2>Topic ${topic + 1}: ${data.topics[topic]} – ${course.slice(-2)}</h2>`;
    groups.forEach((group, index) => {
      const id = `topic-${topic + 1}-group-${index}`;
      html += `<div class="group" role="group" aria-labelledby="${id}"><h3 id="${id}">${escape(group.section)}${group.section === 'Prior learning' ? ' – ' + course.slice(-2) : ''}</h3>`;
      for (const item of group.items) {
        html += `<div class="row${item.formulas.length ? '' : ' heading'}"><div class="label">${rich(item.label)}</div><div class="body">${item.before ? `<div class="before">${rich(item.before)}</div>` : ''}`;
        item.formulas.forEach((formula, position) => {
          if (item.formula_labels) html += `<div class="subrow"><div>${rich(item.formula_labels[position])}</div><div>`;
          if (position && item.join) html += `<div class="join">${escape(item.join)}</div>`;
          html += `<div class="formula">${math(formula)}</div>`;
          if (item.formula_notes?.[position]) html += `<p class="note">${rich(item.formula_notes[position])}</p>`;
          if (item.formula_labels) html += '</div></div>';
        });
        if (item.note) html += `<p class="note">${rich(item.note)}</p>`;
        html += '</div></div>';
      }
      html += '</div>';
    });
    html += '</section>';
  });
  html += '</main></body></html>\n';
  const slug = course.toLowerCase().replace(' ', '-');
  await writeFile(resolve(directory, `${slug}.html`), html);
  console.log(`${course}: ${topics.reduce((n, groups) => n + groups.length, 0)} source groups`);
}
