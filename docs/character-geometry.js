(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlatlandCharacters = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
  const freezePoints = points => Object.freeze(points.map(point => Object.freeze(point)));
  function centroid(points) {
    let area2 = 0, x = 0, y = 0;
    points.forEach(([ax, ay], i) => {
      const [bx, by] = points[(i + 1) % points.length], cross = ax * by - bx * ay;
      area2 += cross; x += (ax + bx) * cross; y += (ay + by) * cross;
    });
    return {x: x / (3 * area2), y: y / (3 * area2)};
  }
  const original = [[-68, 32], [-55, -45], [0, -86], [72, 18], [43, 69]].map(([x, y]) => [x * .68, y * .68]);
  const originalCentroid = centroid(original);
  const shapes = Object.freeze({
    child: freezePoints(original.map(([x, y]) => [x - originalCentroid.x, y - originalCentroid.y])),
    father: freezePoints([[-95, 0], [0, -95], [95, 0], [0, 95]]),
    mother: freezePoints([[-4, -95], [4, -95], [4, 95], [-4, 95]])
  });
  const headIndex = 2;
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function pointSegmentDistance(p, a, b) {
    const x = b[0] - a[0], y = b[1] - a[1], length2 = x * x + y * y;
    const t = length2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * x + (p[1] - a[1]) * y) / length2)) : 0;
    return Math.hypot(p[0] - a[0] - t * x, p[1] - a[1] - t * y);
  }
  function flatten(from, control, to, output, depth = 0) {
    if (depth >= 7 || pointSegmentDistance(control, from, to) <= .4) {output.push(to); return;}
    const a = midpoint(from, control), b = midpoint(control, to), middle = midpoint(a, b);
    flatten(from, a, middle, output, depth + 1); flatten(middle, b, to, output, depth + 1);
  }
  function sample(segments) {
    const points = [segments[0].from];
    segments.forEach(edge => flatten(edge.from, edge.control, edge.to, points));
    points.pop(); return points;
  }
  class Character {
    constructor(kind, vertices, headIndex) {
      this.kind = kind; this.vertices = freezePoints(vertices.map(point => [...point])); this.headIndex = headIndex;
      this.height = 4;
      this.edges = vertices.map(() => ({bend: 0, stretch: 1}));
      this.state = {bend: 0, strain: 0, bounce: 0};
    }
    localSegments(body = {}) {
      const bend = clamp(body.bend ?? body.fear ?? this.state.bend), strain = clamp(body.strain ?? (body.speed === undefined ? this.state.strain : Math.abs(body.speed) / 80));
      const bounce = Math.max(-.03, Math.min(.03, body.bounce ?? this.state.bounce));
      const axial = Math.max(-.15, Math.min(.32, body.axialStretch ?? 0));
      const vertices = this.vertices.map(point => [...point]);
      this.edges.forEach((edge, i) => {
        const a = vertices[i], b = vertices[(i + 1) % vertices.length], stretch = Math.max(.85, Math.min(1.15, body.edgeStretch?.[i] ?? edge.stretch)) - 1;
        const dx = (b[0] - a[0]) * stretch / 2, dy = (b[1] - a[1]) * stretch / 2;
        a[0] -= dx; a[1] -= dy; b[0] += dx; b[1] += dy;
      });
      const head = this.vertices[this.headIndex], axisLength = Math.hypot(...head), fx = head[0] / axisLength, fy = head[1] / axisLength;
      const points = vertices.map(([x, y]) => {
        const forward = (x * fx + y * fy) * (1 + .04 * strain) * (1 + axial), side = (-x * fy + y * fx) * (1 - .04 * strain + bounce) / (1 + axial);
        return [forward * fx - side * fy, forward * fy + side * fx];
      });
      const segments = points.map((from, i) => {
        const to = points[(i + 1) % points.length], dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy);
        const amount = clamp(bend + (body.edgeBends?.[i] ?? this.edges[i].bend)) * (this.kind === 'mother' ? Math.min(3.2, length * .35) : this.kind === 'father' ? 28 : 12);
        return {from: [...from], control: [(from[0] + to[0]) / 2 - dy / length * amount, (from[1] + to[1]) / 2 + dx / length * amount], to: [...to]};
      });
      // Curved and stretched silhouettes keep their area centroid at the body origin.
      const center = centroid(sample(segments));
      return segments.map(edge => Object.fromEntries(Object.entries(edge).map(([key, [x, y]]) => [key, [x - center.x, y - center.y]])));
    }
    outline(body = {}) {return sample(this.localSegments(body)).map(point => transform(point, body));}
    localPath(body = {}) {
      if (typeof Path2D === 'undefined') return null;
      const segments = this.localSegments(body), path = new Path2D();
      path.moveTo(...segments[0].from); segments.forEach(edge => path.quadraticCurveTo(...edge.control, ...edge.to)); path.closePath(); return path;
    }
    headAxis(body = {}) {
      const point = this.localSegments(body)[this.headIndex].from, x = point[0] * (body.sx ?? 1), y = point[1] * (body.sy ?? 1);
      return {x, y, angle: Math.atan2(y, x)};
    }
    headPoint(body) {return transform(this.localSegments(body)[this.headIndex].from, body);}
  }
  class PolygonCharacter extends Character {
    constructor(kind) {
      if (typeof kind === 'object' && kind !== null) {
        const {sides, radius = 60, regular = true, headIndex = 0} = kind;
        if (!Number.isInteger(sides) || sides < 3 || !Number.isFinite(radius) || radius <= 0 || !Number.isInteger(headIndex) || headIndex < 0 || headIndex >= sides) throw new Error('Polygon requires sides >= 3, positive radius and an existing headIndex.');
        const points = Array.from({length: sides}, (_, i) => {const angle = i * Math.PI * 2 / sides - Math.PI / 2, r = radius * (!regular && i % 2 ? .92 : 1); return [Math.cos(angle) * r, Math.sin(angle) * r];});
        const center = centroid(points);
        super('polygon', points.map(([x, y]) => [x - center.x, y - center.y]), headIndex);
        this.form = regular ? 'regular' : 'uncorrected';
      } else {super(kind, shapes[kind], 2); this.form = kind === 'child' ? 'uncorrected' : 'regular';}
    }
  }
  class ThinRectangleCharacter extends Character {
    constructor() {super('mother', shapes.mother, 0); this.width = 8; this.length = 190;}
  }
  function create(kind) {if (typeof kind === 'object' && kind !== null) return new PolygonCharacter(kind); if (kind === 'mother') return new ThinRectangleCharacter(); if (kind === 'child' || kind === 'father') return new PolygonCharacter(kind); throw new Error('Unknown Flatland character: ' + kind);}
  const actors = {child: create('child'), father: create('father'), mother: create('mother')};
  function localSegments(kind, body) {return actors[kind].localSegments(body);}
  function transform(point, body = {}) {
    const angle = body.angle || 0, cos = Math.cos(angle), sin = Math.sin(angle);
    const x = point[0] * (body.sx ?? 1), y = point[1] * (body.sy ?? 1);
    return [(body.x || 0) + x * cos - y * sin, (body.y || 0) + x * sin + y * cos];
  }
  function outline(kind, body) {return actors[kind].outline(body);}
  function localPath(kind, body) {return actors[kind].localPath(body);}
  function headAxis(body) {return actors.child.headAxis(body);}
  function headPoint(body) {return actors.child.headPoint(body);}
  function contains(point, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function segmentIntersects(a, b, c, d) {
    const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const ac = cross(a, b, c), ad = cross(a, b, d), ca = cross(c, d, a), cb = cross(c, d, b);
    if (ac * ad < 0 && ca * cb < 0) return true;
    return (Math.abs(ac) < 1e-8 && pointSegmentDistance(c, a, b) < 1e-8) || (Math.abs(ad) < 1e-8 && pointSegmentDistance(d, a, b) < 1e-8) || (Math.abs(ca) < 1e-8 && pointSegmentDistance(a, c, d) < 1e-8) || (Math.abs(cb) < 1e-8 && pointSegmentDistance(b, c, d) < 1e-8);
  }
  function intersects(a, b) {
    if (Math.max(...a.map(p => p[0])) < Math.min(...b.map(p => p[0])) || Math.max(...b.map(p => p[0])) < Math.min(...a.map(p => p[0])) || Math.max(...a.map(p => p[1])) < Math.min(...b.map(p => p[1])) || Math.max(...b.map(p => p[1])) < Math.min(...a.map(p => p[1]))) return false;
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (segmentIntersects(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true;
    return contains(a[0], b) || contains(b[0], a);
  }
  function pointDistance(point, points) {
    if (contains(point, points)) return 0;
    return Math.min(...points.map((a, i) => pointSegmentDistance(point, a, points[(i + 1) % points.length])));
  }
  function closestBoundary(kind, body, point) {
    let best = {distance: Infinity, edgeIndex: -1, point: null};
    localSegments(kind, body).forEach((edge, edgeIndex) => {
      const points = [edge.from]; flatten(edge.from, edge.control, edge.to, points);
      const world = points.map(p => transform(p, body));
      for (let i = 0; i < world.length - 1; i++) {
        const a = world[i], b = world[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], length2 = dx * dx + dy * dy;
        const t = length2 ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2)) : 0;
        const candidate = [a[0] + t * dx, a[1] + t * dy], distance = Math.hypot(point[0] - candidate[0], point[1] - candidate[1]);
        if (distance < best.distance) best = {distance, edgeIndex, point: candidate};
      }
    });
    return best;
  }
  function penetrates(a, b) {
    if (!intersects(a, b)) return false;
    const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
      const aa = a[i], ab = a[(i + 1) % a.length], ba = b[j], bb = b[(j + 1) % b.length];
      if (cross(aa, ab, ba) * cross(aa, ab, bb) < -1e-12 && cross(ba, bb, aa) * cross(ba, bb, ab) < -1e-12) return true;
    }
    // Boundary contact is allowed; only interior overlap stops the child.
    const inside = (point, poly) => contains(point, poly) && Math.min(...poly.map((edge, i) => pointSegmentDistance(point, edge, poly[(i + 1) % poly.length]))) > 1e-6;
    if(a.some(point => inside(point, b)) || b.some(point => inside(point, a)))return true;
    // Coincident outlines and collinear partial overlaps have no strictly interior vertex.
    for(const [first,second] of [[a,b],[b,a]]){
      if(first.some((point,i)=>inside(midpoint(point,first[(i+1)%first.length]),second)))return true;
      const center=centroid(first),point=[center.x,center.y];
      if(inside(point,first)&&inside(point,second))return true;
    }
    return false;
  }
  function distance(a, b) {
    if (intersects(a, b)) return 0;
    return Math.min(...a.map(point => pointDistance(point, b)), ...b.map(point => pointDistance(point, a)));
  }
  const geometry = Object.freeze({width: 1600, height: 1000, childPoints: shapes.child, fatherPoints: shapes.father, motherPoints: shapes.mother, childScale: .68, fatherRadius: 95, motherLength: 190, motherWidth: 8, headIndex, headAxis: Object.freeze(headAxis()), centroid: Object.freeze(originalCentroid), coordinateNote: 'Each body x/y is its current curved silhouette area centroid. Fixed vertex 2 is the child head. localSegments/localPath and outline use the same inward quadratic edges; outline error is at most 0.4 local pixels.'});
  return {Character, PolygonCharacter, ThinRectangleCharacter, create, actors, geometry, localSegments, localPath, outline, headAxis, headPoint, intersects, penetrates, contains, pointDistance, closestBoundary, distance};
});
