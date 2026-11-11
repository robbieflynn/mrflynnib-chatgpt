import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), choices=require('../public/question-bank/assignment-choice-utils.js'), katex=require('katex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const catalogue=read('src/data/assignment-answer-configs.json');
const review=read('docs/audits/solve-whiteboard-review.json');
const fixes=read('question-bank-data/reviewed-solve-answer-fixes.json');
const seeds=new Map(read('question-bank-data/ib-seed.json').map(q=>[q.id,q]));
const part=(id,label)=>catalogue.ib[id].type==='multipart'?catalogue.ib[id].parts.find(p=>p.label===label):catalogue.ib[id];
const answer=(id,label)=>{const p=part(id,label);return p.options[p.correctOption];};
const expect=(id,label,value)=>assert.equal(answer(id,label),value,id+' '+label);
const near=(a,b,tol=1e-9)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
// Direct substitution AND the algebraic branch count: not merely agreement with the source.
expect('N09TZ0SL_P1_Q6','answer','x=π');
const residual=x=>Math.cos(2*x)-3*Math.cos(x)-3-Math.cos(x)**2-Math.sin(x)**2;
near(residual(Math.PI),0);
for(const x of [0,2*Math.PI,Math.PI/2,3*Math.PI/2,2.5,-1]) assert(Math.abs(residual(x))>1e-6);
// 2c²-3c-5 has roots -1 and 2.5; only -1 is a cosine.
assert.deepEqual([(3-Math.sqrt(49))/4,(3+Math.sqrt(49))/4],[-1,2.5]);
expect('M19TZ2HL_P2_Q5','b','x=π/12; x=13π/12');
for(const x of [Math.PI/12,13*Math.PI/12])near((1+Math.sin(2*x))/Math.cos(2*x),Math.sqrt(3));
// tan(x)=2-sqrt(3), period pi, gives exactly these two roots on [0,2pi).
near(Math.atan(2-Math.sqrt(3)),Math.PI/12);
expect('M17TZ2SL_P1_Q7','answer','x=25π/12; x=29π/12');
for(const x of [25*Math.PI/12,29*Math.PI/12]) {assert(x>2*Math.PI&&x<2.5*Math.PI);near(Math.log2(2*Math.sin(x))+Math.log2(Math.cos(x)),-1);}
// Complete complex root sets, not just one successful power check.
for(const [id,label,r,angles,den,n,target] of [
 ['A_M25TZ3HL_P1_Q8','b',1,[-13,-1,11],18,3,[Math.sqrt(3)/2,-.5]],
 ['A_N25TZ1HL_P1_Q11','c',Math.sqrt(2),[-5,3],8,2,[-Math.sqrt(2),Math.sqrt(2)]],
 ['A_SPECTZ0HL_P1_Q11','b',Math.sqrt(2),[-8,-2,4],9,3,[-Math.sqrt(2),-Math.sqrt(6)]],
]) {
 const text=answer(id,label);
 assert.equal((text.match(/mathrm\{e\}/g)||[]).length,n);
 assert.equal(angles.length,n);assert.equal(new Set(angles).size,n);
 for(const a of angles) {assert(a/den>-1&&a/den<=1);assert(text.includes(`\\frac{${a}\\pi\\mathrm{i}}{${den}}`));near(r**n*Math.cos(n*a*Math.PI/den),target[0]);near(r**n*Math.sin(n*a*Math.PI/den),target[1]);}
}
for(const [label,sign] of [['b(i)',1],['b(ii)',-1]]) {
 const a=Math.sqrt(10)/2,b=sign*Math.sqrt(30)/2;
 near(a*a-b*b,-5);near(2*a*b,sign*5*Math.sqrt(3));
 const text=answer('A_M25TZ2HL_P1_Q12',label);assert.equal(text.split(';').length,2);assert(text.includes('sqrt(10)/2'));assert(text.includes('sqrt(30)/2'));
}
expect('A_M25TZ3HL_P1_Q12','c','w_1=1+i; w_2=4-2i');
for(const [u,v] of [[1,1],[4,-2]]) {near((u-4)**2+(v-1)**2,9);near((u+2)*(u-3)+v*v,-5*v);}
expect('A_N21TZ0HL_P1_Q7','a','k<0 or k>2/3');
expect('A_M25TZ2HL_P1_Q5','b','m<-12 or 4<m<6');
for(const k of [-20,-12,-1,0,.1,2/3,1,4,6,7,20]) {
 assert.equal(20*k*(3*k-2)>0,k<0||k>2/3);
 assert.equal((k*k+8*k-48)>0 && 12-2*k>0,k<-12||(k>4&&k<6));
}
expect('A_M23TZ1HL_P1_Q8','b','k=0 or 9≤k<16');
const gCount=c=>c===-4?1:(c>-4&&c<3?2:0);
for(const k of [-1,0,1,8,9,10,15,16,17]) {
 const count=k<0?0:k===0?gCount(0):gCount(Math.sqrt(k))+gCount(-Math.sqrt(k));
 assert.equal(count===2,k===0||(k>=9&&k<16));
}
expect('N20TZ0HL_P1_Q8','b','0<k≤2');
// Worked-solution prose is inserted as HTML before maths rendering. A literal
// '<k' would become a tag and silently swallow the corrected interval.
const solutionSource=readFileSync('public/question-bank/solutions/aa-hl/N20TZ0HL_P1_Q8.js','utf8');
const solution=JSON.parse(solutionSource.slice(solutionSource.indexOf('{'),solutionSource.lastIndexOf('}')+1));
const finalPart=solution.s.solution.find(p=>p.part==='b');
const {JSDOM}=require('jsdom');
for(const text of [finalPart.answer,finalPart.steps.at(-1).text,finalPart.steps.at(-1).work]) {
 const dom=new JSDOM('<div></div>');const element=dom.window.document.querySelector('div');element.innerHTML=text;
 assert.equal(element.textContent,text,'The final interval was swallowed as HTML');dom.window.close();
}

for(const k of [-100,-1,0,.1,1,1.9,2,2.1,100]) {
 const c=1/(k-1), exists=k!==1&&c>=-1&&c<=1&&c!==0&&c!==1;
 assert.equal(!exists,k>0&&k<=2);
}
expect('N12TZ0SL_P1_Q7','answer','-5/2<k<5/2');
expect('N13TZ0SL_P1_Q7','answer','k≠2');
expect('A_M24TZ2HL_P1_Q5','b(iii)','0<m<1/3');
expect('A_M22TZ1HL_P2_Q8','b','0<m<7');
expect('M17TZ2SL_P2_Q6','c','-1<k≤3');
expect('M18TZ2AISL_P2_Q6','f','6<k<7');
expect('M17TZ2AISL_P2_Q6','g','5<m<21');
expect('M17TZ1AISL_P1_Q12','c','-2<k<6');
// Direct numerical integration cross-check for the initial-value solution and Euler error.
const g=9.8,k=.000125;
const v=s=>Math.sqrt((g-(g-144*k)*Math.exp(-2*k*s))/k);
near(v(0),12);for(const s of [100,1000,10000])near(v(s)*(v(s+.001)-v(s-.001))/.002,g-k*v(s)**2,1e-6);
assert(answer('W_N23TZ0AIHL_P3_Q1','c(i)').includes('144k'));
let euler=1;for(let step=0;step<3;step++) {const t=step/10;euler+=.1*euler*Math.exp(Math.sin(t))*Math.cos(t);}
const exact=Math.exp(Math.exp(Math.sin(.3))-1),error=x=>(exact-x)/exact*100;
assert.equal(error(euler).toPrecision(3),'3.08');assert.equal(error(1.37).toPrecision(3),'2.86');
assert(answer('W_M21TZ2AIHL_P1_Q16','b').includes('2.86'));
const steady=[.2,.45,.35],T=[[.92,.02,.02],[.06,.95,.03],[.02,.03,.95]];
T.forEach((row,i)=>near(row.reduce((s,v,j)=>s+v*steady[j],0),steady[i]));
expect('W_M23TZ2AIHL_P2_Q5','c(ii)','matrix(0.2;0.45;0.35)');
expect('N18TZ0HL_P1_Q11','b(ii)','(sqrt(6)+sqrt(2))/4');near((Math.sqrt(6)+Math.sqrt(2))/4,Math.cos(Math.PI/12));
let converted=0,retained=0;
for(const entry of review) {
 const config=catalogue[entry.bank][entry.id],p=config.type==='multipart'?config.parts.find(p=>p.label===entry.label):config;
 if(entry.decision==='automatic_answer') {assert.equal(p.mode||p.type,'multiple_choice');converted++;}
 else {assert.deepEqual(p,entry.before,`Written-work task changed: ${entry.id} ${entry.label}`);retained++;}
}
assert.equal(converted,38);assert.equal(retained,99);
for(const [id,parts] of Object.entries(fixes)) for(const [label,f] of Object.entries(parts)) {
 const q=seeds.get(id);
 assert.equal(createHash('sha256').update(JSON.stringify([q.body||q.title||'',q.parts||[],q.markscheme])).digest('hex'),f.sourceSha256);
 const p=part(id,label);assert.deepEqual(p.acceptedAnswers,f.answers);assert(choices.validateChoiceSet(p.acceptedAnswers,p.options,p.correctOption));
 for(const option of p.options)katex.renderToString(choices.toLatex(option),{throwOnError:true,strict:false});
}
// Guard every untouched question and sibling, including the entire IGCSE catalogue.
for(const [id,parts] of Object.entries(fixes)) {
 const c=catalogue.ib[id];if(c.type==='multipart')c.parts=c.parts.filter(p=>!parts[p.label]);else catalogue.ib[id]={reviewedWholeQuestion:true};
}
assert.equal(createHash('sha256').update(JSON.stringify(catalogue)).digest('hex'),'de43639791b20610d645f265d2e325a2668da7a14a1f4824274c7c02373e0507','Unreviewed catalogue content changed');
console.log('PASS: 38 reviewed answers, complete root sets and domain boundaries, 99 retained written-work parts, all unaffected catalogue entries preserved.');
