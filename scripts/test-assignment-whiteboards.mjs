import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const root = process.env.WHITEBOARD_TEST_ROOT || process.cwd();
const lateBoard = process.argv.includes('--late-board');
const read = path => readFileSync(`${root}/${path}`, 'utf8');
const dom = new JSDOM('<iframe src="http://localhost/?assignmentWork=1&amp;assignmentView=detail"></iframe>', { url:'http://localhost/', runScripts:'outside-only', pretendToBeVisual:true });
const w=dom.window;
// The actual scripts run in a child document, as they do inside an assignment.
const frame = w.document.querySelector('iframe');
const child=frame.contentWindow;

child.document.write('<div id="qb-list"><article class="qb-card" data-id="q1"><div class="qb-body"><p>Fixture question</p><div class="qb-diagram"><svg></svg></div></div></article></div>');
let drawn=[];
const ctx=new Proxy({ strokeStyle:'',stroke(){drawn.push(this.strokeStyle);},measureText(){return {width:10}} },{get(t,k){return k in t?t[k]:()=>{};}});
child.HTMLCanvasElement.prototype.getContext=()=>ctx;
child.HTMLElement.prototype.getBoundingClientRect=()=>({width:800,height:600,left:0,top:0,right:800,bottom:600});
child.matchMedia=()=>({matches:false});
child.CSS={escape:s=>s};
child.requestAnimationFrame=()=>0;
child.eval(read('public/question-bank/progress.js'));
if (!lateBoard) child.eval(read('public/question-bank/whiteboard.js'));
child.eval(read('public/question-bank/assignment-response.js'));
const send=data=>child.dispatchEvent(new child.MessageEvent('message',{origin:'http://localhost',source:w,data}));
const account=readOnly=>send({type:'mrflynnib-account-state',configured:true,signedIn:true,readOnly,completedQuestionIds:[]});
const state=readOnly=>send({type:'mrflynnib-assignment-response-state',questions:[{questionId:'q1',responseType:'multipart',responseOptions:['a','b','c'].map(label=>({label,mode:'exact'})),readOnly,position:0,response:{parts:{a:'1',b:'2',c:'3'}}}]});
const stroke=colour=>({version:5,paper:'squared',pages:2,columns:2,actions:[{type:'stroke',id:colour,colour,points:[{x:.1,y:.1},{x:.2,y:.2}]}]});
const data={version:6,parts:{a:stroke('#2563eb'),b:stroke('#dc2626'),c:stroke('#15803d')}};
const load=document=>send({type:'mrflynnib-whiteboard-data',questionId:'q1',ok:true,document});
const buttons=()=>Array.from(child.document.querySelectorAll('.qb-whiteboard-part-button'));
const selected=()=>child.document.querySelector('.qb-whiteboard-part-button[aria-pressed="true"]')?.textContent;
const action=name=>child.document.querySelector(`[data-whiteboard-action="${name}"]`);
account(true);state(true);
if (lateBoard) {
  child.eval(read('public/question-bank/whiteboard.js'));
  await new Promise(resolve => setTimeout(resolve, 350));
}
assert.equal(buttons().length,3,'teacher review exposes every part before loading');
load(data);
for(const [i,colour] of ['#2563eb','#dc2626','#15803d'].entries()){
 if(i) drawn=[];buttons()[i].click();assert.equal(selected(),`(${['a','b','c'][i]})`);assert.ok(drawn.includes(colour),'selected part restores its own strokes');
 for(const name of ['undo','clear','add-page','add-space-right','copy-question','pen']) assert.equal(action(name).disabled,true,`${name} remains disabled after part restoration`);
}
assert.equal(action('expand').disabled,false);
assert.equal(child.document.querySelector('svg').getAttribute('aria-disabled'),'true');
console.log('PASS: read-only teacher parts, distinct drawings, editing restrictions and zoom/expand controls');
// Same UI is used for a submitted student's read-only answers.
account(false);state(false);
child.dispatchEvent(new child.CustomEvent('mrflynnib-whiteboard-parts',{detail:{questionId:'q1',parts:['a','b','c'],partKey:'c',open:true}}));
load(data);assert.equal(selected(),'(c)','late load preserves requested C');
drawn=[];buttons()[0].click();assert.ok(drawn.includes('#2563eb'));buttons()[2].click();
load({version:6,parts:{a:data.parts.a}});assert.equal(selected(),'(c)','unsaved C remains selected instead of jumping to A');
assert.equal(action('undo').disabled,true,'new part is blank');
buttons()[0].click();assert.equal(action('undo').disabled,false,'student drawing controls remain available');
console.log('PASS: delayed load preserves selected and unsaved parts; student controls restore');
// Re-rendering a checked answer must preserve an unsent neighbouring part.
const partInput = key => child.document.querySelector(`.qb-response-part[data-part-key="${key}"] input`);
partInput('b').value='unsent B';
partInput('b').dispatchEvent(new child.Event('input'));
send({type:'mrflynnib-assignment-response-result',questionId:'q1',ok:true,response:{partKey:'a',partAnswer:'1'},result:'correct',isCorrect:true});
assert.equal(partInput('b').value,'unsent B');
assert.equal(partInput('a').disabled,true);
assert.equal(partInput('b').disabled,false);
// A student edit serialises every part and preserves unrelated saved work.
load(data);
buttons()[0].click();
const saved = new Promise(resolve => w.addEventListener('message', event => {
  if(event.data?.type==='mrflynnib-whiteboard-save') resolve(event.data.document);
}));
action('clear').click();
const savedDocument=await Promise.race([saved,new Promise((_,reject)=>setTimeout(()=>reject(new Error('No save emitted')),2500))]);
assert.equal(savedDocument.version,6);
assert.equal(savedDocument.parts.a.actions.at(-1).type,'clear');
assert.deepEqual(JSON.parse(JSON.stringify(savedDocument.parts.b)),data.parts.b);
assert.deepEqual(JSON.parse(JSON.stringify(savedDocument.parts.c)),data.parts.c);
console.log('PASS: unsent answers survive adjacent checks; editing one board preserves other saved parts');
dom.window.close();
