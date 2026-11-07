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
