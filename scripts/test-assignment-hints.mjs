import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
// Compile the actual loader so tests exercise source without a second implementation.
const moduleCode = ts.transpileModule(readFileSync('src/lib/assignment-hints.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { getAssignmentHints } = await import(`data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`);
const courses = { 'aa-hl': 'AA HL', 'aa-sl': 'AA SL', 'ai-hl': 'AI HL', 'ai-sl': 'AI SL', 'igcse-higher': 'IGCSE Higher' };
let checked = 0;
for (const [dir, course] of Object.entries(courses)) {
  for (const file of readdirSync(`public/question-bank/solutions/${dir}`).filter(file => file.endsWith('.js'))) {
    const hints = await getAssignmentHints(course, file.slice(0, -3));
    for (const hint of hints) {
      assert.deepEqual(Object.keys(hint), ['part','step','title','text','work','figure']);
      assert.ok(hint.step > 0);
    }
    checked++;
  }
}
assert.deepEqual(await getAssignmentHints('AA HL', '../secrets'), []);
assert.deepEqual(await getAssignmentHints('Unknown', 'Q1'), []);
assert.deepEqual(await getAssignmentHints('AA HL', 'missing_question'), []);
const source = readFileSync('public/question-bank/assignment-hints.js', 'utf8');
const wait = () => new Promise(resolve => setTimeout(resolve, 45));
const make = (view='step') => {
  const dom = new JSDOM(`<iframe src="http://localhost/?assignmentWork=1&assignmentView=${view}&assignmentId=task"></iframe>`, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const child = dom.window.document.querySelector('iframe').contentWindow;
  child.document.write('<div id="qb-list"><article class="qb-card qb-assignment-current" data-id="q1"><p>Question</p><div class="qb-assignment-response">Answer remains</div></article><article class="qb-card" data-id="q2"></article></div>');
  return { dom, child };
};
const steps = [{part:'a',step:1,title:'First step',text:'Authored words',work:'',figure:''}, {part:'b',step:1,title:'Second step',text:'Later words',work:'',figure:''}];
let count=0, calls=0, loseResponse=false, enabled=true, submitted=false;
const mockFetch = async (_url, options) => {
  calls++;
  if (options.method === 'POST') {
    const body = JSON.parse(options.body);
    assert.equal(body.questionId, 'q1');
    if (body.expectedCount === count) count++;
    if (loseResponse) { loseResponse=false; throw new Error('Connection interrupted'); }
  }
  return { ok:true, json:async()=>({ steps:steps.slice(0,count), enabled, submitted, total:2, canReveal:enabled&&!submitted&&count<2 }) };
};
let {dom,child}=make(); child.fetch=mockFetch;child.eval(source);await wait();
assert.equal(calls,1,'only active question loads');
assert.equal(child.document.querySelectorAll('.qb-hint-step').length,0,'unrequested steps are absent');
assert.equal(child.document.querySelector('.qb-hints button').textContent,'Get a hint');
const button=child.document.querySelector('.qb-hints button');button.click();button.click();await wait();
assert.equal(count,1,'rapid double click reveals only one step');
assert.equal(child.document.querySelectorAll('.qb-hint-step').length,1);
assert.ok(!child.document.querySelector('.qb-hints').textContent.includes('Later words'));
assert.equal(child.document.querySelector('.qb-assignment-response').textContent,'Answer remains');
const submissionMessage = (value, origin='http://localhost') => child.dispatchEvent(new child.MessageEvent('message', { origin, source:dom.window, data:{type:'mrflynnib-assignment-response-state',assignmentSubmitted:value,questions:[]} }));
submissionMessage(true,'https://untrusted.example');
assert(child.document.querySelector('.qb-hints button'),'untrusted messages cannot change submission state');
submissionMessage(true);
assert.equal(child.document.querySelector('.qb-hints button'),null,'submission removes stale reveal control immediately');
assert.match(child.document.querySelector('.qb-hints').textContent,/Assignment submitted/);
assert.equal(child.document.querySelectorAll('.qb-hint-step').length,1,'submission preserves revealed steps');
submissionMessage(false); await wait();
assert(child.document.querySelector('.qb-hints button'),'returned work refreshes hint availability');
loseResponse=true;child.document.querySelector('.qb-hints button').click();await wait();
assert.equal(count,2);assert.match(child.document.querySelector('.qb-hints').textContent,/Connection interrupted/);
child.document.querySelector('.qb-hints button').click();await wait();
assert.equal(count,2,'retry after lost response does not consume another hint');
assert.equal(child.document.querySelectorAll('.qb-hint-step').length,2);
assert.equal(child.document.querySelector('.qb-hints button'),null,'last step removes reveal button');
const panel=child.document.querySelector('.qb-hints');panel.remove();await wait();
assert.equal(child.document.querySelector('.qb-hints'),panel,'card rerender restores same panel');
dom.window.close();
({dom,child}=make()); enabled=false;child.fetch=mockFetch;child.eval(source);await wait();
assert.equal(child.document.querySelectorAll('.qb-hint-step').length,2,'refresh restores revealed hints after disabling');
assert.equal(child.document.querySelector('.qb-hints button'),null);dom.window.close();
({dom,child}=make());count=0;child.fetch=mockFetch;child.eval(source);await wait();
assert.equal(child.document.querySelector('.qb-hints').hidden,true,'off assignments do not advertise hints');dom.window.close();
({dom,child}=make('overview'));child.fetch=()=>{throw new Error('Teacher view must not request student hints');};child.eval(source);await wait();assert.equal(child.document.querySelector('.qb-hints'),null);dom.window.close();
console.log(`PASS: ${checked} solution files, lazy loading, step isolation, double clicks, lost-response retries, history, disabled settings and teacher-view isolation.`);
