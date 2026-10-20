(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./character-geometry.js'));
  else root.FlatlandMotion = factory(root.FlatlandCharacters);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (characters) {
  'use strict';
  if (!characters) throw new Error('Load character-geometry.js before motion.js.');
  const geometry = characters.geometry, duration = 20, contactTempo = 30;
  const clamp = t => Math.max(0, Math.min(1, t));
  const ease = t => {t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10);};
  const easeSpeed = t => t <= 0 || t >= 1 ? 0 : 30 * t * t * (1 - t) * (1 - t);
  function bounce(p, stop) {const t = (p - stop) / .05; return t <= 0 || t >= 1 ? 0 : .03 * Math.sin(Math.PI * t) ** 2;}
  const events = {father: null, mother: null};
  const impacts = {father: null, mother: null};
  function cubic(points, t) {
    const u = 1 - t, [a, b, c, d] = points;
    return {
      x: u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      y: u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      dx: 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]),
      dy: 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1])
    };
  }
  function route(curves) {
    let lastHeading;
    const unwrap = angle => {if (lastHeading !== undefined) angle += Math.round((lastHeading - angle) / (2 * Math.PI)) * 2 * Math.PI; lastHeading = angle; return angle;};
    const segments = curves.map(points => {
      const lengths = [0]; let previous = cubic(points, 0);
      const headings = [unwrap(Math.atan2(previous.dy, previous.dx))];
      for (let i = 1; i <= 40; i++) {const point = cubic(points, i / 40); lengths.push(lengths[i - 1] + Math.hypot(point.x - previous.x, point.y - previous.y)); headings.push(unwrap(Math.atan2(point.dy, point.dx))); previous = point;}
      return {points, lengths, headings, length: lengths[40]};
    });
    return {segments, length: segments.reduce((sum, segment) => sum + segment.length, 0)};
  }
  const fatherRoute = route([[[800, 550], [800, 500], [710, 470], [632, 470]]]);
  let motherRoute, motherDeparture;
  function travel(path, fraction) {
    let distance = clamp(fraction) * path.length, segment = path.segments[path.segments.length - 1];
    for (const current of path.segments) {segment = current; if (distance <= current.length) break; distance -= current.length;}
    const values = segment.lengths; let index = 1;
    while (index < 40 && distance > values[index]) index++;
    const t = (index - 1 + clamp((distance - values[index - 1]) / (values[index] - values[index - 1]))) / 40;
    const point = cubic(segment.points, t), reference = segment.headings[index - 1];
    point.heading = Math.atan2(point.dy, point.dx);
    point.heading += Math.round((reference - point.heading) / (2 * Math.PI)) * 2 * Math.PI;
    return point;
  }
  function pulse(p, time) {
    if (time === null || p < time) return 0;
    const elapsed = p - time;
    return elapsed < .006 ? 1 - (1 - elapsed / .006) ** 3 : 1 - ease((elapsed - .012) / .035);
  }
  function departureTravel(p) {
    const route = motherDeparture.route, total = (motherDeparture.end - .34) * duration;
    const t = Math.max(0, Math.min(total, (p - .34) * duration)), rise = .26, settle = .36, endSpeed = motherDeparture.endSpeed;
    const cruise = (route.length - endSpeed * settle / 2) / (total - (rise + settle) / 2);
    if (t < rise) {
      const u = t / rise;
      return {distance: cruise * rise * (u ** 3 - u ** 4 / 2), speed: cruise * u * u * (3 - 2 * u)};
    }
    const distance = cruise * (t - rise / 2);
    if (t <= total - settle) return {distance, speed: cruise};
    const u = (t - total + settle) / settle;
    return {distance: distance + (endSpeed - cruise) * settle * (u ** 3 - u ** 4 / 2), speed: cruise + (endSpeed - cruise) * u * u * (3 - 2 * u)};
  }
  function parent(kind, p) {
    const isFather = kind === 'father', time = events[kind], elapsed = time === null ? -1 : p - time, t = clamp(elapsed / .008), retreat = 1 - (1 - t) ** 3, fear = pulse(p, time);
    const speed = elapsed <= 0 || t >= 1 ? 0 : Math.hypot(isFather ? 44 : 46, isFather ? -18 : 28) * 3 * (1 - t) ** 2 / (.008 * duration);
    const edgeBends = Array(4).fill(0);
    if (impacts[kind]) edgeBends[impacts[kind].edgeIndex] = fear;
    return {x: (isFather ? 510 : 1090) + (isFather ? -44 : 46) * retreat, y: 470 + (isFather ? -18 : 28) * retreat, angle: (isFather ? Math.PI / 4 : 0) + (isFather ? -.08 : .08) * retreat, sx: 1, sy: 1, fear, bend: 0, edgeBends, speed, strain: clamp(speed * duration / contactTempo / 80) * ease(elapsed / .003), bounce: time === null ? 0 : bounce(p, time + .008)};
  }
  function childAt(p, fear) {
    const second = p > .34, kind = second ? 'mother' : 'father', path = second ? motherRoute : fatherRoute, impact = impacts[kind], stopped = impact && p >= impact.time;
    const span = second ? .37 : .18, travelTime = stopped ? impact.travelTime : p;
    const t = (travelTime + (second && motherDeparture ? motherDeparture.advance : 0) - (second ? .34 : .06)) / span;
    let point = travel(path, ease(t)), speed = stopped ? 0 : path.length * easeSpeed(t) / (span * duration);
    if (second && motherDeparture && travelTime < motherDeparture.end) {
      const departure = departureTravel(travelTime);
      point = travel(motherDeparture.route, departure.distance / motherDeparture.route.length);
      speed = stopped ? 0 : departure.speed;
    }
    const heading = point.heading;
    // Keep the chosen contact silhouettes while playing the same motion faster.
    const strain = stopped ? impact.strain * (1 - ease((p - impact.time) / .008)) : clamp(speed * duration / contactTempo / 80);
    const body = {x: point.x, y: point.y, angle: 0, sx: 1, sy: 1, fear, bend: fear * .2, speed, strain, bounce: impact ? bounce(p, impact.time) : 0};
    const ready=clamp(p/.06),envelope=p<.06?Math.sin(Math.PI*ready)**2:0;
    if(p<.06){const breath=.035*Math.sin(2*Math.PI*ready)*Math.sin(Math.PI*ready);body.sx=body.sy=1-breath;}
    body.angle = heading - characters.headAxis(body).angle;
    body.angle += .045*Math.sin(4*Math.PI*ready)*envelope;
    return body;
  }
  function childFear(p) {return Math.max(pulse(p, events.father), pulse(p, events.mother));}
  function findContact(kind, start, end) {
    const touches = p => {
      const child = childAt(p, childFear(p)), adult = parent(kind, p), head = characters.headPoint(child);
      return characters.contains(head, characters.outline(kind, adult)) || characters.closestBoundary(kind, adult, head).distance < 1e-8;
    };
    let previous = start;
    for (let i = 1; i <= 64; i++) {
      const p = start + (end - start) * i / 64;
      if (touches(p)) {
        let low = previous, high = p;
        for (let step = 0; step < 25; step++) {const middle = (low + high) / 2; if (touches(middle)) high = middle; else low = middle;}
        const child = childAt(low, childFear(low)), boundary = characters.closestBoundary(kind, parent(kind, low), characters.headPoint(child));
        return {time: high, travelTime: low, edgeIndex: boundary.edgeIndex, point: boundary.point, strain: child.strain, child};
      }
      previous = p;
    }
    throw new Error('The head never touched the ' + kind + ' boundary.');
  }
  impacts.father = findContact('father', .06, .24); events.father = impacts.father.time;
  const start = impacts.father.child, heading = start.angle + characters.headAxis(start).angle, bottom = start.y + 180;
  motherRoute = route([
    [[start.x, start.y], [start.x + Math.cos(heading) * 65, start.y + Math.sin(heading) * 65], [start.x - 65, bottom], [start.x, bottom]],
    [[start.x, bottom], [start.x + 65, bottom], [935, 470], [1031, 470]]
  ]);
  impacts.mother = findContact('mother', .34, .71); events.mother = impacts.mother.time;
  // Keep the approved contact's final approach and silhouette; enliven only the departure.
  const advance = .6 / duration, joinTime = 12.9 / duration, joinT = (joinTime - .34) / .37;
  const join = travel(motherRoute, ease(joinT)), lowTurn = start.y + 112, turn = [start.x + 18, lowTurn];
  motherDeparture = {
    advance, end: joinTime - advance,
    endSpeed: motherRoute.length * easeSpeed(joinT) / (.37 * duration),
    route: route([
      [[start.x, start.y], [start.x + Math.cos(heading) * 42, start.y + Math.sin(heading) * 42], [start.x - 45, lowTurn], turn],
      [turn, [start.x + 145, lowTurn], [join.x - Math.cos(join.heading) * 85, join.y - Math.sin(join.heading) * 85], [join.x, join.y]]
    ])
  };
  impacts.mother.time -= advance; impacts.mother.travelTime -= advance; events.mother = impacts.mother.time;

  function guardedChild(p, father, mother, fear) {
    const parents = [characters.outline('father', father), characters.outline('mother', mother)];
    const safe = body => {const contour = characters.outline('child', body); return parents.every(other => !characters.penetrates(contour, other));};
    const current = childAt(p, fear);
    if (safe(current)) return current;
    // Deterministic path rollback is only a safety stop, not a physics solver.
    let low = p, high = p;
    for (let step = .002; step <= .512; step *= 2) {low = Math.max(0, p - step); if (safe(childAt(low, fear))) break;}
    for (let i = 0; i < 9; i++) {const middle = (low + high) / 2; if (safe(childAt(middle, fear))) low = middle; else high = middle;}
    return childAt(low, fear);
  }
  function pose(progress) {
    const p = clamp(typeof progress === 'number' && Number.isFinite(progress) ? progress : 0), father = parent('father', p), mother = parent('mother', p), fear = childFear(p);
    const phase = p < .06 ? 'settle' : p < events.father ? 'approach-father' : p < .34 ? 'pause-father' : p < .50 ? 'turn-to-mother' : p < events.mother ? 'approach-mother' : 'pause-mother';
    return {phase, child: guardedChild(p, father, mother, fear), father, mother, reaction: {father: father.fear, mother: mother.fear, child: fear}};
  }
  // Sprint distance is linear; only player input can change its playback rate.
  function chaseProgress(time){
    return{q:clamp((time-122)/10),qSpeed:time<122||time>132?0:.1,effort:0,preload:0};
  }
  const contacts = Object.freeze(Object.fromEntries(Object.entries(impacts).map(([kind, impact]) => [kind, Object.freeze({time: impact.time, edgeIndex: impact.edgeIndex, point: Object.freeze([...impact.point])})])));
  return {pose, geometry, duration, chaseProgress, contactTimes: Object.freeze({...events}), contacts};
});
