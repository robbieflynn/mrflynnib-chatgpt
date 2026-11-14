import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const exports = {};
const compiled = ts.transpileModule(readFileSync('src/components/student-assignment-overview.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
new Function('require', 'exports', compiled)((id) => id === 'next/link' ? { __esModule: true, default: (props) => React.createElement('a', props) } : id.endsWith('.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) } : require(id), exports);
const item = (i) => ({ id: `assignment-${i}`, title: `Work ${i}`, className: 'Maths class', dateLabel: i ? 'No due date' : '29 days overdue', progressCount: i, questionCount: 20 });
function render(props) { return new JSDOM(renderToStaticMarkup(React.createElement(exports.StudentAssignmentOverview, { active: [], completed: [], assignmentsHref: '/assignments', ...props }))).window.document; }
for (const count of [0, 1, 4, 5, 40]) {
  for (const assignmentsHref of ['/assignments', '/igcse/assignments']) {
    const document = render({ active: Array.from({ length: count }, (_, i) => item(i)), assignmentsHref });
    const rows = [...document.querySelectorAll('.list .row')];
    assert.equal(rows.length, Math.min(count, 4), 'dashboard remains bounded as assignments grow');
    rows.forEach((row, i) => assert.equal(row.getAttribute('href'), `${assignmentsHref}/assignment-${i}`, 'due-date order and curriculum destination remain intact'));
    if (count > 4) assert.match(document.body.textContent, new RegExp(`View ${count - 4} more current`));
    if (count) assert.match(document.body.textContent, /29 days overdue/);
    if (count > 1) assert.match(document.body.textContent, /Continue/);
  }
}
const history = render({ completed: Array.from({ length: 12 }, (_, i) => item(i)) });
assert.equal(history.querySelector('details').open, false, 'submitted history is collapsed by default');
assert.equal(history.querySelectorAll('details .row').length, 3);
assert.match(history.querySelector('summary').textContent, /12/);
assert.match(history.body.textContent, /View all submitted work/);
assert.match(render({}).body.textContent, /No assignments yet/);
const failed = render({ loadError: true });
assert.ok(failed.querySelector('[role="alert"]'));
assert.doesNotMatch(failed.body.textContent, /up to date|No assignments yet/);
console.log('PASS: bounded assignment preview, original ordering, IB/IGCSE links, progress, collapsed history and empty/error states.');
