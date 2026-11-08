import assert from 'node:assert/strict';
import gestures from '../public/question-bank/whiteboard-gestures.js';
const { scribbleTargets } = gestures;
const p = (x,y) => ({x,y});
const zig = [p(30,40),p(130,45),p(30,50),p(130,55),p(30,60),p(130,65),p(30,70)];
const target = {id:'writing',points:[p(80,35),p(80,75)]};
assert.deepEqual(scribbleTargets(zig,[target]),['writing']);
assert.deepEqual(scribbleTargets(zig,[{id:'elsewhere',points:[p(180,40),p(180,70)]}]),[]);
assert.deepEqual(scribbleTargets(zig,[{id:'long-graph',points:[p(80,0),p(80,400)]}]),[]);
for (const ordinary of [[p(30,40),p(130,70)],zig.slice(0,4),[p(30,40),p(60,65),p(90,40),p(120,65),p(150,40),p(180,65)]]) {
 assert.deepEqual(scribbleTargets(ordinary,[target]),[], 'ordinary lines, letters and advancing zigzags remain ink');
}
const rotate = p => ({x:p.y,y:p.x});
assert.deepEqual(scribbleTargets(zig.map(rotate),[{id:'vertical',points:target.points.map(rotate)}]),['vertical']);
assert.deepEqual(scribbleTargets(zig,[]),[], 'scribbling on blank paper remains ink');
console.log('PASS: scribble recognition, vertical gesture, normal writing and nearby/long-line protection');

const wideVertical = [p(30,30),p(50,100),p(70,30),p(90,100),p(110,30),p(130,100),p(150,30)];
const word = {id:'word',points:[p(40,65),p(140,65)]};
assert.deepEqual(scribbleTargets(wideVertical,[word]),['word'], 'vertical scrubbing across a wide word');
assert.deepEqual(scribbleTargets(wideVertical.map(rotate),[{id:'word',points:word.points.map(rotate)}]),['word'], 'horizontal scrubbing across tall writing');
assert.deepEqual(scribbleTargets(wideVertical,[{id:'axis',points:[p(0,65),p(500,65)]}]),[], 'protect crossing graph axes');

const letters = [45, 85, 125].map((x,i) => ({id: String(i), points: [p(x,50), p(x,80)]}));
assert.deepEqual(scribbleTargets(wideVertical, letters), ['0','1','2'], 'all separate letters inside the scrub are removed');
