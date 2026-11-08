import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const choices=require('../public/question-bank/assignment-choice-utils.js');
const katex=require('katex');
const catalogue=JSON.parse(readFileSync('src/data/assignment-answer-configs.json','utf8'));
const inventory=JSON.parse(readFileSync('docs/audits/shared-mark-scheme-candidates.json','utf8'));
const review=JSON.parse(readFileSync('docs/audits/shared-mark-scheme-review.json','utf8'));
const get=(id,label)=>catalogue[id.startsWith('4MA1_')?'igcse':'ib'][id].parts.find(p=>p.label===label);
const correct=(id,label)=>{const p=get(id,label); assert.equal(p?.mode,'multiple_choice',id+' '+label);return p.options[p.correctOption];};
const expect=(id,label,value)=>assert.equal(correct(id,label),value,id+' '+label);
// Independent calculations, not values extracted from the shared mark schemes.
expect('A_M24TZ1SL_P1_Q7','a(i)','3x^2-10x+3'); // d/dx(x³-5x²+3x+2)
expect('A_M23TZ1SL_P1_Q8','a(i)',String(5*3**2+3));
expect('A_N23TZ1SL_P2_Q1','a(i)',String(2*3-7));
expect('A_M23TZ1SL_P2_Q8','a(i)',String(80-64));
expect('M14TZ2HL_P1_Q11','a(ii)',String(.6*.02+.4*.01));
expect('M14TZ2HL_P2_Q1','a(i)',String(Array.from({length:27},(_,i)=>14+7*i).reduce((a,b)=>a+b,0)));
expect('A_N22TZ0SL_P1_Q8','a(i)',String(Math.round(Math.log(1/125)/Math.log(5))));
expect('A_N22TZ0SL_P1_Q8','a(ii)','1/3'); // 64^(1/3)=4
expect('4MA1_2019M_1HR_Q21','a(i)',`(${4+5},3)`);
expect('4MA1_2022J_1H_Q23','i',`(${5-9},${7})`);
const choose=(n,k)=>{let c=1;for(let i=1;i<=k;i++)c=c*(n-i+1)/i;return c;};
const binomial=(n,k,p)=>choose(n,k)*p**k*(1-p)**(n-k);
expect('A_M25TZ3HL_P2_Q11','a(i)',Array.from({length:5},(_,k)=>binomial(40,k,.12)).reduce((a,b)=>a+b,0).toPrecision(3));
expect('A_N23TZ1SL_P2_Q9','c(ii)',(binomial(90,18,.3)/Array.from({length:30},(_,k)=>binomial(90,k,.3)).reduce((a,b)=>a+b,0)).toPrecision(3));
const B=Math.asin(44*Math.sin(33*Math.PI/180)/25)*180/Math.PI;
expect('A_M24TZ1SL_P2_Q9','a(i)',`${(180-33-B).toFixed(1)}°; ${(B-33).toFixed(1)}°`);
expect('4MA1_2023J_2H_Q14','a(i)',`${180-40}°`);
const sumSquares=144+276/Math.tan(33*Math.PI/180), product=138/Math.sin(33*Math.PI/180);
const longer=(Math.sqrt(sumSquares+2*product)+Math.sqrt(sumSquares-2*product))/2;
const shorter=(Math.sqrt(sumSquares+2*product)-Math.sqrt(sumSquares-2*product))/2;
expect('A_M24TZ1SL_P2_Q9','c',`${longer.toPrecision(3)} m; ${shorter.toPrecision(3)} m`);
// Independently recorded symbolic / complete-set expectations from the review.
for(const [id,label,value] of [
 ['M14TZ1HL_P2_Q12','a(i)','-1'],['M14TZ1HL_P2_Q12','d(i)','x=-3; x=-1; x=1; x=3'],
 ['M14TZ1HL_P2_Q12','d(ii)','x=-4; x=-2; x=0; x=2; x=4'],['M14TZ1HL_P2_Q12','e(i)','N=2n+1'],
 ['M14TZ2HL_P1_Q14','c(i)','0'],['M14TZ2HL_P1_Q14','d(ii)','-π/2'],
 ['M14TZ2HL_P2_Q6','a(i)','0.0138'],['M14TZ2HL_P2_Q11','c(i)','0.860'],
 ['M14TZ2HL_P2_Q12','b(i)','k*(5x/sqrt(202500+x^2)-1)'],['M14TZ2HL_P2_Q12','e(i)','260'],
 ['A_M25TZ3HL_P2_Q11','c(i)','0.104'],['H_M16TZ2HL_P1_Q11','b(i)','2/(π*(3cos(2h)+4)^2)'],
 ['H_M14TZ1SL_P1_Q8','d(i)','matrix(0;-1;1)'],['A_M22TZ1SL_P1_Q8','b(ii)','-2/5'],
 ['A_M23TZ2SL_P2_Q9','a(i)','6/n'],['W_M24TZ1AIHL_P2_Q4','a(i)','0.8'],
 ['W_M24TZ1AIHL_P2_Q4','a(ii)','0.4'],['W_M24TZ1AIHL_P2_Q4','a(iii)','0.6'],
 ['V_M24TZ1AISL_P2_Q4','a(i)','0.8'],['V_M24TZ1AISL_P2_Q4','a(ii)','0.25'],
 ['4MA1_2019J_2HR_Q5','b(i)','154 m'],['4MA1_2019J_2HR_Q14','a(i)','a^2'],
 ['4MA1_2019J_2HR_Q14','a(ii)','a*b^4'],['4MA1_2019M_1H_Q22','b(i)','(x-3)^2+1'],
 ['4MA1_2020J_1HR_Q18','a(i)','-0.6'],['4MA1_2021M_2H_Q9','i','(x+6)*(x-4)'],
 ['4MA1_2021N_1H_Q9','i','-2≤x<4'],['4MA1_2021N_1H_Q14','a(i)','b-a'],
 ['4MA1_2021N_1H_Q14','a(ii)','4b-2a'],['4MA1_2021N_2H_Q8','b(i)','(x+4)*(x-9)'],
 ['4MA1_2022J_1H_Q6','b(i)','(y-7)*(y+5)'],['4MA1_2023J_1HR_Q8','b(ii)','y=6; y=-3'],
 ['A_M23TZ2SL_P1_Q8','a(i)','sqrt(7)/4']
]) expect(id,label,value);
assert(correct('M14TZ2HL_P2_Q13','b(i)').includes('v=\\sqrt{2}e^{-\\frac{i\\pi}{4}}'));
assert(correct('A_N21TZ0HL_P2_Q11','a(i)').includes('3\\\\-5\\\\-2'));
let unchanged=0, repaired=0;
for (const old of inventory) {
 const decision=review.find(r=>r.question===old.id && r.part===old.label);
 const next=get(old.id,old.label);
 if(['matches_source','whiteboard'].includes(decision.status)) {
  assert.deepEqual(next,old.answer,`Unrelated sibling changed: ${old.id} ${old.label}`);unchanged++;
 } else if(decision.status==='false_subpart') {
  assert.equal(next,undefined,`Bogus subpart remains: ${old.id} ${old.label}`);repaired++;
 } else {
  assert(next,`Missing repaired part: ${old.id} ${old.label}`);
  assert.notDeepEqual(next,old.answer,`Unrepaired finding: ${old.id} ${old.label}`);repaired++;
 }
 if(next?.mode==='multiple_choice') {
  assert(choices.validateChoiceSet(next.acceptedAnswers,next.options,next.correctOption));
  for(const option of next.options) katex.renderToString(choices.toLatex(option), {throwOnError:true, strict:false});
 }
}
assert.equal(repaired,59);assert.equal(unchanged,116);
assert.equal(get('N20TZ0AISL_P2_Q2','e').mode,'whiteboard');
assert.equal(get('N11TZ0AISL_P2_Q2','b').mode,'whiteboard');
const seeds=JSON.parse(readFileSync('question-bank-data/ib-seed.json','utf8'));
for(const [id,label] of [['N20TZ0AISL_P2_Q2','e'],['N11TZ0AISL_P2_Q2','b']]) {
 assert(!/\((?:i|ii|iii)\)/.test(seeds.find(q=>q.id===id).parts.find(p=>p[0]===label)[1]));
}
console.log('PASS: independent calculations and expected answers; all 59 audited findings plus the later two-length answer repaired; 116 unaffected audited siblings unchanged.');
