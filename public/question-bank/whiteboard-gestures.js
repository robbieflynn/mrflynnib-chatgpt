(function (root) {
  'use strict';

  function bounds(points) {
    return points.reduce(function (box, p) {
      return { left: Math.min(box.left, p.x), right: Math.max(box.right, p.x), top: Math.min(box.top, p.y), bottom: Math.max(box.bottom, p.y) };
    }, { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
  }

  // Coordinates are paper pixels, independent of zoom and the number of sheets.
  // Require repeated substantial reversals over the same area, rather
  // than interpreting a strike-through, a letter or an ordinary zigzag as erase.
  function scribbleTargets(points, strokes) {
    if (points.length < 6 || points.length > 10000) return [];
    var box = bounds(points);
    var width = box.right - box.left, height = box.bottom - box.top;
    // A vertical scrub can travel sideways across a word. Check reversals on
    // both axes instead of assuming the longest dimension is the scrub direction.
    var horizontal = targetsOnAxis(points, strokes, box, 'x', width);
    var vertical = targetsOnAxis(points, strokes, box, 'y', height);
    return Array.from(new Set(horizontal.concat(vertical)));
  }

  function targetsOnAxis(points, strokes, box, axis, extent) {
    if (extent < 24) return [];
    var threshold = Math.max(12, extent * .35);
    var turning = [points[0]], extreme = points[0], direction = 0;
    for (var i = 1; i < points.length; i++) {
      var point = points[i], delta = point[axis] - extreme[axis];
      if (!direction) {
        if (Math.abs(delta) >= threshold) { direction = Math.sign(delta); extreme = point; }
      } else if (delta * direction > 0) {
        extreme = point;
      } else if (-delta * direction >= threshold) {
        turning.push(extreme);
        direction = -direction;
        extreme = point;
      }
    }
    turning.push(extreme);
    if (turning.length < 6) return [];
    var legs = [];
    for (var j = 1; j < turning.length; j++) {
      if (Math.abs(turning[j][axis] - turning[j - 1][axis]) >= threshold) legs.push([turning[j - 1], turning[j]]);
    }
    if (legs.length < 6) return [];
    return strokes.filter(function (stroke) {
      if (!stroke.points.length) return false;
      var target = bounds(stroke.points), padding = 12;
      // Do not delete a long graph/line that merely crosses the scribbled area.
      if (target.left < box.left - padding || target.right > box.right + padding || target.top < box.top - padding || target.bottom > box.bottom + padding) return false;
      return true;
    }).map(function (stroke) { return stroke.id; });
  }

  // Split a polyline against the swept circular eraser, including sparse
  // two-point straight lines. Return null when there was no intersection.
  function cutStroke(points, eraser, radius) {
    if (!points.length || !eraser.length) return null;
    var box = bounds(eraser), target = bounds(points);
    if (target.right < box.left - radius || target.left > box.right + radius || target.bottom < box.top - radius || target.top > box.bottom + radius) return null;
    function erased(p) {
      for (var i = 0; i < eraser.length; i++) {
        var a = eraser[Math.max(0, i - 1)], b = eraser[i];
        if (p.x < Math.min(a.x,b.x)-radius || p.x > Math.max(a.x,b.x)+radius || p.y < Math.min(a.y,b.y)-radius || p.y > Math.max(a.y,b.y)+radius) continue;
        var dx=b.x-a.x, dy=b.y-a.y, length=dx*dx+dy*dy;
        var t=length ? Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)) : 0;
        if (Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy) <= radius) return true;
      }
      return false;
    }
    var pieces=[], piece=[], touched=false;
    function sample(p) {
      if (erased(p)) { touched=true; if(piece.length) pieces.push(piece); piece=[]; }
      else {
        // Keep original bends without storing hundreds of collinear samples.
        var a=piece[piece.length-2], b=piece[piece.length-1];
        var pressureLinear = !Number.isFinite(p.p) || (a && b && Math.abs(b.p - (a.p + (p.p - a.p) * Math.hypot(b.x-a.x,b.y-a.y) / (Math.hypot(p.x-a.x,p.y-a.y) || 1))) < .002);
        if (a && b && pressureLinear && Math.abs((b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x)) < 0.000001 && (b.x-a.x)*(p.x-b.x)+(b.y-a.y)*(p.y-b.y) >= 0) piece[piece.length-1]=p;
        else piece.push(p);
      }
    }
    sample(points[0]);
    for(var i=1;i<points.length;i++) {
      var a=points[i-1], b=points[i];
      var steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
      for(var j=1;j<=steps;j++) {
        var point={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps};
        if (Number.isFinite(a.p) || Number.isFinite(b.p)) {
          var pa=Number.isFinite(a.p) ? a.p : .5, pb=Number.isFinite(b.p) ? b.p : .5;
          point.p=pa+(pb-pa)*j/steps;
        }
        sample(point);
      }
    }
    if(piece.length) pieces.push(piece);
    return touched ? pieces : null;
  }

  function holdShape(points) {
    if (points.length < 2) return null;
    var first=points[0], last=points[points.length-1], box=bounds(points);
    var width=box.right-box.left, height=box.bottom-box.top, cx=(box.left+box.right)/2, cy=(box.top+box.bottom)/2;
    var radius=(width+height)/4, path=0;
    for(var i=1;i<points.length;i++) path+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    var distance=Math.hypot(last.x-first.x,last.y-first.y);
    if(points.length>=12 && radius>=12 && width/height>.75 && width/height<1.33 && distance<radius*.4 && path>radius*5 && path<radius*8) {
      var error=0, sectors=new Set(), winding=0;
      for(var j=0;j<points.length;j++) {
        var p=points[j], angle=Math.atan2(p.y-cy,p.x-cx);
        error+=Math.pow(Math.hypot(p.x-cx,p.y-cy)-radius,2);
        sectors.add(Math.floor((angle+Math.PI)*6/Math.PI)%12);
        if(j) { var prev=points[j-1]; winding+=(prev.x-cx)*(p.y-cy)-(p.x-cx)*(prev.y-cy); }
      }
      if(Math.sqrt(error/points.length)<radius*.18 && sectors.size>=11) {
        var start=Math.atan2(first.y-cy,first.x-cx), circle=[];
        for(var k=0;k<=64;k++) { var a=start+(winding<0?-1:1)*Math.PI*2*k/64; circle.push({x:cx+radius*Math.cos(a),y:cy+radius*Math.sin(a)}); }
        return {type:'circle',points:circle};
      }
    }
    if(distance>=24 && path<=distance*1.2) {
      var deviation=points.every(function(p){return Math.abs((last.x-first.x)*(first.y-p.y)-(first.x-p.x)*(last.y-first.y))/distance<=Math.max(8,distance*.12);});
      if(deviation) return {type:'line',points:[first,last]};
    }
    return null;
  }

  var api = { holdShape: holdShape, scribbleTargets: scribbleTargets, cutStroke: cutStroke };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MrFlynnWhiteboardGestures = api;
})(typeof window !== 'undefined' ? window : this);
