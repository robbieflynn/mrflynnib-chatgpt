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
        if (a && b && Math.abs((b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x)) < 0.000001 && (b.x-a.x)*(p.x-b.x)+(b.y-a.y)*(p.y-b.y) >= 0) piece[piece.length-1]=p;
        else piece.push(p);
      }
    }
    sample(points[0]);
    for(var i=1;i<points.length;i++) {
      var a=points[i-1], b=points[i];
      var steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
      for(var j=1;j<=steps;j++) sample({x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps});
    }
    if(piece.length) pieces.push(piece);
    return touched ? pieces : null;
  }

  var api = { scribbleTargets: scribbleTargets, cutStroke: cutStroke };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MrFlynnWhiteboardGestures = api;
})(typeof window !== 'undefined' ? window : this);
