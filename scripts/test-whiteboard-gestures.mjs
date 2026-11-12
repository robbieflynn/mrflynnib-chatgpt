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

for (const scale of [4, 8]) {
 const scaled = point => p(point.x * scale, point.y * scale);
 assert.deepEqual(scribbleTargets(zig.map(scaled), [{id:'large',points:[p(80,45),p(80,65)].map(scaled)}]), ['large'], 'large scribbles erase');
 assert.deepEqual(scribbleTargets(zig.map(scaled).slice(0,4), [{id:'large',points:[p(80,45),p(80,65)].map(scaled)}]), [], 'large ordinary zigzags remain ink');
}
const {cutStroke} = gestures;
const pieces = cutStroke([p(0,50),p(200,50)], [p(100,0),p(100,100)], 12);
assert.equal(pieces.length,2,'a sparse straight line is cut into two pieces');
assert(pieces[0].at(-1).x < 88 && pieces[1][0].x > 112);
assert.equal(cutStroke([p(0,0),p(200,0)],[p(50,100)],12),null,'unaffected ink stays unchanged');
assert.deepEqual(cutStroke([p(50,50)],[p(50,50)],12),[],'a dot can be erased');
assert.equal(cutStroke([p(0,50),p(200,50)],[p(50,50),p(150,50)],12).length,2,'eraser cuts along its full path');
console.log('PASS: large scribbles and precision cuts on sparse lines, dots and swept erasers');

const loop=Array.from({length:49},(_,i)=>p(100+60*Math.cos(i*Math.PI/24),100+60*Math.sin(i*Math.PI/24)));
assert.equal(gestures.holdShape(loop).type,'circle');
assert.equal(gestures.holdShape(loop.map((v,i)=>p(v.x+Math.sin(i*3)*3,v.y+Math.cos(i*4)*3))).type,'circle');
assert.equal(gestures.holdShape(loop.slice(0,30)),null,'open arcs stay handwriting');
assert.equal(gestures.holdShape(loop.map(v=>p(v.x*2,v.y))),null,'elongated ovals do not become circles');
assert.equal(gestures.holdShape(zig),null,'scribbles do not become shapes');
assert.equal(gestures.holdShape([p(10,10),p(50,12),p(100,10)]).type,'line');
console.log('PASS: held circles/lines and conservative rejection of arcs, ovals and scribbles');

function outline(vertices) {
 return vertices.flatMap((a,i)=>{const b=vertices[(i+1)%vertices.length];return Array.from({length:12},(_,j)=>p(a.x+(b.x-a.x)*j/12,a.y+(b.y-a.y)*j/12));}).concat([vertices[0]]);
}
for(const [type,vertices] of [
 ['square',[p(30,30),p(130,30),p(130,130),p(30,130)]],
 ['rectangle',[p(30,30),p(210,30),p(210,130),p(30,130)]],
 ['triangle',[p(30,160),p(100,30),p(200,160)]]
]) {
 for(const angle of [0,.42,1.3]) for(const direction of [1,-1]) for(const start of [0,7]) {
  let trace=outline(vertices).slice(0,-1).map((v,i)=>p(v.x+Math.sin(i*2)*1.5,v.y+Math.cos(i*3)*1.5));
  trace=trace.slice(start).concat(trace.slice(0,start));if(direction<0) trace.reverse();trace.push(trace[0]);
  trace=trace.map(v=>p(v.x*Math.cos(angle)-v.y*Math.sin(angle),v.x*Math.sin(angle)+v.y*Math.cos(angle)));
  const shape=gestures.holdShape(trace);
  assert.equal(shape?.type,type,`${type}, rotated ${angle}, direction ${direction}, start ${start}`);
  assert.equal(shape.points.length,type==='triangle'?4:5);
  assert.deepEqual(shape.points[0],shape.points.at(-1));
  if(type!=='triangle') {
   const [a,b,c]=shape.points, ab=p(b.x-a.x,b.y-a.y),bc=p(c.x-b.x,c.y-b.y);
   assert.ok(Math.abs(ab.x*bc.x+ab.y*bc.y)<1e-8,'rectangle corners are perpendicular');
   if(type==='square') assert.ok(Math.abs(Math.hypot(ab.x,ab.y)-Math.hypot(bc.x,bc.y))<1e-8);
  }
 }
}
assert.equal(gestures.holdShape(outline([p(0,0),p(160,160),p(0,160),p(160,0)])),null,'crossed bow tie remains ink');
assert.equal(gestures.holdShape(outline([p(0,0),p(200,0),p(140,100),p(60,100)])),null,'trapezium is not forced into a rectangle');
console.log('PASS: noisy rotated squares, rectangles and triangles, both directions and mid-side starts; rejected crossed/unsupported shapes');
