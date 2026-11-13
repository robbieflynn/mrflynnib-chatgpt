import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<iframe src="http://localhost/?embedded=1"></iframe>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
const host = dom.window, w = host.document.querySelector('iframe').contentWindow;
w.document.write('<div id="qb-list"></div>');
const list = w.document.querySelector('#qb-list');
const source = readFileSync('public/question-bank/whiteboard.js', 'utf8');
let contexts = 0, drawn = 0, frames = [];
w.HTMLCanvasElement.prototype.getContext = () => {
  contexts++;
  return new Proxy({ stroke() { drawn++; } }, { get: (o, k) => k in o ? o[k] : () => {} });
};
w.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
host.scrollTo = () => {};
w.matchMedia = () => ({ matches: false });
w.CSS = { escape: s => s };
w.requestAnimationFrame = fn => (frames.push(fn), frames.length);
w.cancelAnimationFrame = () => {};
const listeners = new Set();
for (const target of [w, w.document]) {
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
  target.addEventListener = (name, handler, options) => { listeners.add(handler); add(name, handler, options); };
  target.removeEventListener = (name, handler, options) => { listeners.delete(handler); remove(name, handler, options); };
}
const settle = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
  for (let i = 0; frames.length && i < 25; i++) { const batch = frames; frames = []; batch.forEach(fn => fn()); }
  assert.equal(frames.length, 0);
};
const insert = id => { list.innerHTML = `<article class="qb-card" data-id="${id}"><div class="qb-body"><p>Question</p></div></article>`; };
const message = data => w.dispatchEvent(new w.MessageEvent('message', { origin: 'http://localhost', source: host, data }));
w.eval(source);
await settle();
const baseline = listeners.size;
insert('q1'); await settle();
assert.equal(contexts, 0, 'unused boards allocate no drawing contexts');
assert.ok([...list.querySelectorAll('canvas')].every(c => c.width === 0 && c.height === 0));
const activeListeners = listeners.size;
const toggle = () => list.querySelector('.qb-whiteboard-open-button').click();
toggle(); await settle();
message({ type: 'mrflynnib-whiteboard-data', questionId: 'q1', ok: true, document: { version: 5, paper: 'squared', pages: 2, columns: 2, actions: [{ type: 'stroke', id: 'ink', colour: '#000000', points: [{ x: .1, y: .1 }, { x: .2, y: .2 }] }] } });
await settle();
assert.ok(drawn > 0, 'saved working renders');
for (let i = 0; i < 10; i++) {
  toggle(); await settle();
  assert.ok([...list.querySelectorAll('canvas')].every(c => c.width === 0 && c.height === 0), 'close releases both buffers');
  const before = drawn;
  toggle(); await settle();
  assert.ok(drawn > before, 'reopen redraws the same working without a new load');
  assert.equal(listeners.size, activeListeners, 'opening never duplicates global listeners');
}
list.querySelector('[data-whiteboard-action="undo"]').click();
assert.equal(list.querySelector('[data-whiteboard-action="undo"]').disabled, true, 'undo history survives reopen');
const saves = [];
host.postMessage = data => saves.push(data);
w.__mrflynnibAccountState = { signedIn: true, readOnly: false };
for (let i = 0; i < 50; i++) {
  const oldCanvases = [...list.querySelectorAll('canvas')];
  insert('replacement-' + i); await settle();
  assert.equal(listeners.size, activeListeners, 'filter replacement does not retain old listeners');
  assert.ok(oldCanvases.every(c => c.width === 0 && c.height === 0), 'removed boards release buffers');
}
assert.ok(saves.some(data => data.type === 'mrflynnib-whiteboard-save' && data.questionId === 'q1'), 'removal flushes unsaved changes before disposal');
// Replacing only the body must also retire the previous controller.
const oldBodyCanvases = [...list.querySelectorAll('canvas')];
list.querySelector('.qb-body').innerHTML = '<p>Updated question body</p>';
await settle();
assert.equal(listeners.size, activeListeners);
assert.ok(oldBodyCanvases.every(c => c.width === 0));
list.replaceChildren(); await settle();
assert.equal(listeners.size, baseline, 'all per-board global listeners are removed');
console.log('PASS: lazy contexts, close/reopen working and undo, 50 replacements, zero retained board listeners');
dom.window.close();
