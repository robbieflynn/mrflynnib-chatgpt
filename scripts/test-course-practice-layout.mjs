import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
for (const base of ['public/learn','course-platform-pilot/dist']) {
 const html=fs.readFileSync(`${base}/index.html`,'utf8');
 const dom=new JSDOM(html,{url:'https://example.test/learn/index.html',runScripts:'outside-only',pretendToBeVisual:true});
 const host=dom.window,doc=host.document,frame=doc.getElementById('practiceFrame');
 frame.src='https://example.test/question-bank/ib-bank.html?embedded=1&practice=1';
 const child=frame.contentWindow;
 child.document.write('<div id="qbank-root"><article class="qb-card"><button data-whiteboard-action="expand">Expand</button><canvas data-saved-work="kept"></canvas></article></div>');
 child.scrollTo=()=>{};host.scrollTo=()=>{};child.requestAnimationFrame=fn=>{fn();return 1;};
 const postToHost=(data,origin=host.location.origin,source=child)=>host.dispatchEvent(new host.MessageEvent('message',{data,origin,source}));
 const postToChild=(data,origin=host.location.origin,source=host)=>child.dispatchEvent(new child.MessageEvent('message',{data,origin,source}));
 host.postMessage=data=>postToHost(data);child.postMessage=data=>postToChild(data);
 const source=fs.readFileSync(`${base}/app.js`,'utf8');
 const functions=source.slice(source.indexOf('function syncPracticeFrameScroll('),source.indexOf('function renderLessonList('));
 const handler=source.slice(source.indexOf('window.addEventListener("message", async (event)'),source.indexOf('  if (message.type === "mrflynnib-account-required")'))+'});';
 host.eval('function sendPracticeAccountState() {}\n'+functions+'\n'+handler);
 child.eval(fs.readFileSync('public/question-bank/practice-frame.js','utf8'));
 const card=child.document.querySelector('.qb-card'),button=child.document.querySelector('button'),canvas=child.document.querySelector('canvas');
 button.onclick=()=>{card.classList.remove('qb-whiteboard-expanded');postToHost({type:'mrflynnib-whiteboard-expanded',expanded:false});};
 const expanded=()=>doc.getElementById('lessonPractice').classList.contains('is-expanded');
 // Inline content must never be truncated by the former 5200px cap.
 postToHost({type:'mrflynnib-question-bank-height',height:8000});assert.equal(doc.getElementById('practiceFrameWrap').style.height,'8032px');
 postToHost({type:'mrflynnib-question-bank-height',height:Infinity});assert.equal(doc.getElementById('practiceFrameWrap').style.height,'8032px');
 postToHost({type:'mrflynnib-whiteboard-expanded',expanded:true},'https://untrusted.test');assert.equal(expanded(),false);
 postToHost({type:'mrflynnib-whiteboard-expanded',expanded:true},host.location.origin,host);assert.equal(expanded(),false);
 host.setPracticeExpanded(true);assert(expanded());assert.equal(child.document.documentElement.style.overflowY,'auto');assert.equal(child.document.body.style.overflow,'visible');
 postToHost({type:'mrflynnib-question-bank-height',height:500});assert.equal(doc.getElementById('practiceFrameWrap').style.height,'8032px','expanded reflows cannot overwrite the inline height');
 card.classList.add('qb-whiteboard-expanded');postToHost({type:'mrflynnib-whiteboard-expanded',expanded:true});button.click();assert(expanded(),'whiteboard collapse retains manually expanded practice');
 host.setPracticeExpanded(false);assert.equal(expanded(),false);assert.equal(child.document.documentElement.style.overflowY,'hidden');
 card.classList.add('qb-whiteboard-expanded');postToHost({type:'mrflynnib-whiteboard-expanded',expanded:true});assert(expanded(),'inline whiteboard opens the containing frame');button.click();assert.equal(expanded(),false,'collapse returns to inline practice');
 card.classList.add('qb-whiteboard-expanded');postToHost({type:'mrflynnib-whiteboard-expanded',expanded:true});host.setPracticeExpanded(false);assert.equal(card.classList.contains('qb-whiteboard-expanded'),false);assert.equal(expanded(),false);assert.equal(child.document.querySelector('canvas'),canvas,'the original frame and drawing DOM survive every transition');
 postToChild({type:'mrflynnib-question-bank-scroll',enabled:true},'https://untrusted.test');assert.equal(child.document.documentElement.style.overflowY,'hidden');
 host.setPracticeExpanded(true);child.document.dispatchEvent(new child.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(expanded(),false,'Escape inside practice closes the parent view');
 assert(doc.querySelector('.topbar .topbar-account'));assert(doc.querySelector('.course-hero #teacherCourseSwitcher'));assert.equal(doc.getElementById('topbarLearningHomeLink'),null);assert.equal(doc.getElementById('courseBackButton'),null);assert.equal(doc.getElementById('lessonPractice').closest('.player-column'),null,'practice is no longer confined to the video column');
 dom.window.close();
}
// Non-practice bank and assignment embeds must ignore this protocol.
const other=new JSDOM('<iframe src="https://example.test/question-bank/ib-bank.html?embedded=1"></iframe>',{url:'https://example.test',runScripts:'outside-only'});
const child=other.window.document.querySelector('iframe').contentWindow;child.document.write('<body></body>');child.document.documentElement.style.overflowY='hidden';child.eval(fs.readFileSync('public/question-bank/practice-frame.js','utf8'));child.dispatchEvent(new child.MessageEvent('message',{data:{type:'mrflynnib-question-bank-scroll',enabled:true},origin:'https://example.test',source:other.window}));assert.equal(child.document.documentElement.style.overflowY,'hidden');other.window.close();
console.log('PASS: practice scrolling, uncapped inline height, nested expansion/collapse, Escape, retained frame/drawing, trusted message source, non-practice isolation and simplified course header in both player copies.');
