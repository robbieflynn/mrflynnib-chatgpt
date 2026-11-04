import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const code = readFileSync('public/question-bank/navigation-memory.js', 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixture({ saved, query = '?embedded=1&course=AA+HL', storageBlocked = false } = {}) {
  const dom = new JSDOM(`<iframe src="http://localhost/question-bank/ib-bank.html${query.replaceAll('&', '&amp;')}"></iframe>`, { url: 'http://localhost/question-bank/aa-hl', runScripts: 'outside-only', pretendToBeVisual: true });
  const host = dom.window;
  const frame = host.document.querySelector('iframe');
  const child = frame.contentWindow;
  child.document.write('<div id="qb-controls"><input id="qb-search"></div><div id="qb-list"></div>');
  const list = child.document.getElementById('qb-list');
  const key = 'mrflynnib-bank-position:v1:/question-bank/aa-hl:' + child.location.search;
  if (saved) host.sessionStorage.setItem(key, JSON.stringify(saved));
  if (storageBlocked) Object.defineProperty(host, 'sessionStorage', { get() { throw new Error('blocked'); } });
  let rendered = 0, filters = {}, ready = false, height = 620, scrollCalls = 0;
  frame.getBoundingClientRect = () => ({ top: 400 - host.scrollY, height });
  host.scrollTo = ({ top }) => { host.scrollY = Math.min(top, 400 + height - 800); scrollCalls++; };
  const batch = () => {
    for (let i = rendered; i < Math.min(rendered + 25, 60); i++) {
      const card = child.document.createElement('article');
      card.className = 'qb-card'; card.dataset.id = `q${i + 1}`;
      card.getBoundingClientRect = () => ({ top: i * 500, bottom: (i + 1) * 500 });
      list.appendChild(card);
    }
    rendered = list.children.length;
  };
  child.mrflynnibBankNavigation = {
    ready: () => ready,
    filters: () => filters,
    restoreFilters: value => { filters = value; list.replaceChildren(); rendered = 0; batch(); },
    reveal: id => { const index = Number(id.slice(1)) - 1; if (index < 0 || index >= 60) return 'missing'; if (rendered <= index) { batch(); return 'loading'; } return 'ready'; }
  };
  batch();
  child.eval(code);
  return { dom, host, child, frame, key, start() { ready = true; }, size() { height = rendered * 500 + 100; }, resetFilters() { filters = {}; }, get filters() { return filters; }, get rendered() { return rendered; }, get calls() { return scrollCalls; } };
}
const saved = { id: 'q30', offset: -75, filters: { 'qb-topic': 'Calculus', 'qb-search': 'volume' } };
const f = fixture({ saved });
await pause(100);
assert.equal(f.calls, 0, 'wait for the asynchronous course data');
f.start();
await pause(180);
assert.equal(f.rendered, 50, 'load the batch containing question 30');
assert.deepEqual(JSON.parse(JSON.stringify(f.filters)), saved.filters);
f.size();
f.resetFilters(); // Browser history may restore form defaults after initial rendering.
await pause(1100);
assert.deepEqual(JSON.parse(JSON.stringify(f.filters)), saved.filters);
assert.equal(f.host.scrollY, 14975, 'restore question anchor after parent height settles');
f.host.scrollY = 17000;
f.host.dispatchEvent(new f.host.Event('scroll'));
await pause(150);
const next = JSON.parse(f.host.sessionStorage.getItem(f.key));
assert.equal(next.id, 'q34');
assert.equal(next.offset, -100);
assert.deepEqual(next.filters, saved.filters);
f.dom.window.close();
console.log('PASS: delayed course/batch/height restoration, question anchor and filters, subsequent scroll saves');
const missing = fixture({ saved: { ...saved, id: 'q999' } }); missing.start(); await pause(200); assert.equal(missing.calls, 0); missing.dom.window.close();
const ignored = fixture({ saved, query: '?embedded=1&assignmentWork=1&ids=q30' }); ignored.start(); await pause(200); assert.equal(ignored.calls, 0); ignored.dom.window.close();
const blocked = fixture({ storageBlocked: true }); blocked.start(); blocked.host.dispatchEvent(new blocked.host.Event('scroll')); await pause(150); blocked.dom.window.close();
const detached = fixture({ saved }); detached.start(); detached.frame.remove(); await pause(200); assert.equal(detached.calls, 0); detached.dom.window.close();
console.log('PASS: missing questions, assignment exclusion, unavailable storage and navigation cleanup');
const stars = fixture();
let refreshed = 0;
stars.child.mrflynnibRefreshQuestionFilters = () => { refreshed++; };
stars.child.eval(readFileSync('public/question-bank/starred.js', 'utf8'));
const account = signedIn => stars.child.dispatchEvent(new stars.child.MessageEvent('message', { origin: 'http://localhost', source: stars.host, data: { type: 'mrflynnib-account-state', configured: true, signedIn, starredQuestionIds: ['q30'] } }));
account(true);
assert.equal(refreshed, 0, 'late account data must not rebuild an unfiltered, scrolled list');
stars.child.mrflynnibRestoreStarredFilter();
assert.equal(stars.child.document.getElementById('qb-starred-filter').getAttribute('aria-pressed'), 'true');
assert.equal(refreshed, 1);
account(false);
assert.equal(refreshed, 2, 'sign-out exits the starred-only list');
stars.dom.window.close();
console.log('PASS: starred restoration and late account updates preserve the unfiltered list');
