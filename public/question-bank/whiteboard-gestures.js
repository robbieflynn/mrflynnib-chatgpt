(function (root) {
  'use strict';

  function bounds(points) {
    return points.reduce(function (box, p) {
      return { left: Math.min(box.left, p.x), right: Math.max(box.right, p.x), top: Math.min(box.top, p.y), bottom: Math.max(box.bottom, p.y) };
    }, { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
  }

  function distance(point, start, end) {
    var dx = end.x - start.x, dy = end.y - start.y;
    var t = dx || dy ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy))) : 0;
    return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
  }

  // Coordinates are paper pixels, independent of zoom and the number of sheets.
  // Require repeated substantial reversals over the same compact area, rather
  // than interpreting a strike-through, a letter or an ordinary zigzag as erase.
  function scribbleTargets(points, strokes) {
    if (points.length < 6 || points.length > 5000) return [];
    var box = bounds(points);
    var width = box.right - box.left, height = box.bottom - box.top;
    if (Math.max(width, height) > 360) return [];
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
    if (legs.length < 5) return [];
    return strokes.filter(function (stroke) {
      if (!stroke.points.length) return false;
      var target = bounds(stroke.points), padding = 12;
      // Do not delete a long graph/line that merely crosses the scribbled area.
      if (target.left < box.left - padding || target.right > box.right + padding || target.top < box.top - padding || target.bottom > box.bottom + padding) return false;
      var hits = legs.filter(function (leg) {
        var length = Math.hypot(leg[1].x - leg[0].x, leg[1].y - leg[0].y);
        var steps = Math.ceil(length / 4);
        for (var k = 0; k <= steps; k++) {
          var sample = { x: leg[0].x + (leg[1].x - leg[0].x) * k / steps, y: leg[0].y + (leg[1].y - leg[0].y) * k / steps };
          if (stroke.points.length === 1 && distance(sample, stroke.points[0], stroke.points[0]) <= 6) return true;
          for (var n = 1; n < stroke.points.length; n++) {
            if (distance(sample, stroke.points[n - 1], stroke.points[n]) <= 6) return true;
          }
        }
        return false;
      }).length;
      return hits >= 3;
    }).map(function (stroke) { return stroke.id; });
  }

  var api = { scribbleTargets: scribbleTargets };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MrFlynnWhiteboardGestures = api;
})(typeof window !== 'undefined' ? window : this);
