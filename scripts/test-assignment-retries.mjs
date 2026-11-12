import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<iframe src="http://localhost/?assignmentWork=1&assignmentView=detail"></iframe>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
const parent = dom.window;
const child = parent.document.querySelector('iframe').contentWindow;
child.document.write('<div id="qb-list"><article class="qb-card" data-id="q1"><div class="qb-body">IGCSE retry fixture</div></article></div>');
child.CSS = { escape: value => value };
child.requestAnimationFrame = () => 0;
child.eval(readFileSync('public/question-bank/assignment-response.js', 'utf8'));
const send = data => child.dispatchEvent(new child.MessageEvent('message', { origin: 'http://localhost', source: parent, data }));
const question = { questionId: 'q1', responseType: 'multiple_choice', responseOptions: ['30', '60', '90'], attemptCount: 1, isCorrect: false, response: { option: 0 } };
const state = (overrides = {}, feedbackMode = 'after_question') => send({ type: 'mrflynnib-assignment-response-state', feedbackMode, questions: [{ ...question, ...overrides }] });
const account = () => send({ type: 'mrflynnib-account-state', completedQuestionIds: ['q1'] });
const card = () => child.document.querySelector('.qb-card');
const radios = () => [...card().querySelectorAll('input[type="radio"]')];
const retryOpen = () => {
  assert.equal(radios().length, 3);
  assert.ok(radios().every(radio => !radio.disabled), 'first wrong answer must allow another choice even when progress says completed');
  assert.ok(card().classList.contains('qb-assignment-feedback-locked'), 'mark scheme stays hidden during retry');
  assert.match(card().querySelector('.qb-response-status').textContent, /one attempt left/);
};
// The save RPC historically marks progress completed on the first wrong answer.
// Both arrival orders occur when reopening or refreshing an assignment.
account(); state(); retryOpen();
state(); account(); retryOpen();
radios()[1].click(); assert.equal(radios()[1].checked, true);
const result = (value, isCorrect) => send({ type: 'mrflynnib-assignment-response-result', questionId: 'q1', response: { option: 1 }, ok: true, result: value, isCorrect });
result('retry', false); retryOpen();
result('retry', false); retryOpen(); // duplicated acknowledgement must not spend a retry
result('incorrect_final', false);
assert.ok(radios().every(radio => radio.disabled));
assert.equal(card().classList.contains('qb-assignment-feedback-locked'), false);
state({ attemptCount: 1, isCorrect: true });
assert.ok(radios().every(radio => radio.disabled));
assert.equal(card().classList.contains('qb-assignment-feedback-locked'), false);
state({}, 'hidden'); assert.ok(card().classList.contains('qb-assignment-feedback-locked'));
state({}, 'after_assignment'); assert.ok(card().classList.contains('qb-assignment-feedback-locked'));
state({}, 'immediate'); assert.equal(card().classList.contains('qb-assignment-feedback-locked'), false);
assert.ok(radios().every(radio => !radio.disabled));
state({ responseType: 'multipart', responseOptions: [{ label: 'a', mode: 'multiple_choice', options: ['30', '60', '90'] }, { label: 'b', mode: 'exact' }], response: { parts: { a: '30' }, _partStates: { a: { result: 'retry', attemptCount: 1, isCorrect: false } } } });
assert.ok(card().classList.contains('qb-assignment-feedback-locked'), 'incomplete multipart answer ignores completed flag');
assert.ok(radios().every(radio => !radio.disabled));
for (const responseType of ['numeric', 'exact']) {
  state({ responseType, response: { text: '30' } });
  assert.equal(card().querySelector('input[type="text"]').disabled, false);
  assert.ok(card().classList.contains('qb-assignment-feedback-locked'));
}
state({ responseType: 'teacher_review', response: { completedOffline: true }, isCorrect: null });
assert.equal(card().classList.contains('qb-assignment-feedback-locked'), false, 'saved paper work still unlocks feedback');
state({ readOnly: true, submitted: true });
assert.equal(radios().length, 0, 'submitted answers remain read-only');
dom.window.close();
console.log('Assignment retry regression passed: completion flags, repeated replies, choice changes, feedback modes, multipart and read-only.');
