import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
function parser(source) {
 const start=source.indexOf('  var SUBPART_RE =');
 const end=source.indexOf('  function partLabel(', start);
 assert(start>0 && end>start);
 const context={}; vm.runInNewContext(source.slice(start,end),context);
 return context.stackSubParts;
}
let total=0, changed=[];
for(const bank of ['ib','igcse']) {
 const path=`public/question-bank/${bank}-bank.html`;
 const current=parser(readFileSync(path,'utf8'));
 const old=parser(execFileSync('git',['show',`8a2dc2e0f:${path}`],{maxBuffer:100*1024*1024}).toString());
 const cases=[
  ['In parts (a)(i) and (a)(ii), use exponential form.<br>(i) Find z.<br>(ii) Find w.',2],
  ['In parts (i) and (ii), give exact values. (i) Find x. (ii) Find y.',2],
  ['Write your answer to part (a)<br>(i) to two decimal places;<br>(ii) to three significant figures.',2],
  ['Find (i) the area; (ii) the volume.',2],
  ['(i) Find x. (ii) Using part (i), find y. (iii) Find z.',3],
  ['Use parts (i) and (ii) to find x.',0],
  ['(ii) Find x. (iii) Find y.',2],
  ['<table><tr><td>(i) x</td><td>(ii) y</td></tr></table>',0],
 ];
 for(const [input,count] of cases) assert.equal((current(input).match(/<li>/g)||[]).length,count,input);
 const seed=JSON.parse(readFileSync(`question-bank-data/${bank}-seed.json`,'utf8'));
 for(const q of seed) for(const [label,content] of q.parts||[]) {
  total++; const input=String(content),output=current(input);
  if(output!==old(input)) changed.push(`${bank} ${q.id} ${label}`);
  // Removing only our inserted layout must recover the original text exactly,
  // apart from whitespace/line breaks around genuine list markers.
  const plain=s=>s.replace(/<\/?(?:br|b|i|em|strong|table|thead|tbody|tr|td|th|sup|sub|span|div|p|ul|ol|li)(?=[\s/>])[^<>]*>/gi,'').replace(/\s|&nbsp;/g,'');
  assert.equal(plain(output),plain(input),`${bank} ${q.id} ${label}: text lost`);
  if(q.id==='W_M21TZ2AIHL_P1_Q12' && label==='a') {
   assert(output.startsWith('In parts (a)(i) and (a)(ii)'));
   assert.equal((output.match(/<li>/g)||[]).length,2);
   assert(output.includes('Find the value'));
  }
 }
}
console.log(`PASS: ${total} source question parts preserve their text; inline lists, cross-references and tables checked.`);
console.log('Changed layouts:',JSON.stringify(changed));
