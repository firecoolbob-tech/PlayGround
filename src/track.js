/* ═══════════════════════════════════════════════════════════════
   RC RUSH — procedural track builder
   Pseudo-3D segment road with seeded random layouts.
   ═══════════════════════════════════════════════════════════════ */

export const SEGMENT_LENGTH = 200;
export const ROAD_WIDTH = 1000;
export const DRAW_DISTANCE = 150;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeIn = (a, b, p) => a + (b - a) * Math.pow(p, 2);
const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

export function generateTrack(location, seed = Date.now()) {
  const rng = mulberry32(seed);
  const segments = [];
  let currentY = 0;

  const addSegment = (curve, y) => {
    const n = segments.length;
    segments.push({
      index: n,
      curve,
      y,
      props: [],
      wet: false,
      p1: { world: { y: 0, z: n * SEGMENT_LENGTH }, camera: {}, screen: {} },
      p2: { world: { y: 0, z: (n + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} }
    });
    // fill y values (p1 = previous point y)
    const prevY = n === 0 ? y : segments[n - 1].y;
    segments[n].p1.world.y = prevY;
    segments[n].p2.world.y = y;
  };

  const addRoad = (enter, hold, leave, curve, hill) => {
    const startY = currentY;
    const endY = startY + hill * SEGMENT_LENGTH;
    const total = Math.max(1, enter + hold + leave);
    for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / Math.max(1, enter)), easeInOut(startY, endY, n / total));
    for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / Math.max(1, leave)), easeInOut(startY, endY, (enter + hold + n) / total));
    currentY = endY;
  };

  // opening straight
  addRoad(10, 42, 10, 0, 0);

  const sectionCount = 9 + Math.floor(rng() * 4); // 9–12
  const diff = location.difficulty;
  for (let s = 0; s < sectionCount; s++) {
    const isSCurve = rng() < 0.24;
    const isHairpin = !isSCurve && rng() < 0.13 + diff * 0.01;
    const dir = rng() < 0.5 ? -1 : 1;

    let curve = (1.5 + rng() * 2.6) * dir;
    if (isHairpin) curve = (4.2 + rng() * 1.1) * dir;
    curve *= 0.86 + diff * 0.045;

    let hill = (rng() * 2 - 1) * (14 + diff * 3.2);
    if (Math.abs(currentY) > 14000) hill = -Math.sign(currentY) * (10 + rng() * 14);
    if (Math.abs(currentY) > 24000) hill = -Math.sign(currentY) * 28;

    const scale = 0.8 + rng() * 0.55;
    const enter = Math.round((16 + rng() * 24) * scale);
    const hold = Math.round((20 + rng() * 46) * scale);
    const leave = Math.round((16 + rng() * 24) * scale);

    if (isSCurve) {
      const c = 2.2 + rng() * 2.2;
      addRoad(enter, hold, 8, c * dir, hill);
      addRoad(8, hold * 0.85, leave, -c * dir, -hill * 0.4);
    } else {
      addRoad(enter, hold, leave, curve, hill);
    }

    // occasional short breather / crest
    if (rng() < 0.35) {
      addRoad(10, 18 + Math.floor(rng() * 20), 10, 0, (rng() * 2 - 1) * (8 + diff * 2));
    }
  }

  // bring elevation back to zero for a seamless loop
  if (Math.abs(currentY) > 120) {
    const hill = -currentY / SEGMENT_LENGTH;
    addRoad(24, 46, 24, 0, hill);
  }
  // closing straight
  addRoad(8, 38, 8, 0, 0);

  // guarantee enough track
  while (segments.length < 900) addRoad(10, 40, 10, (rng() * 2 - 1) * 2.4, (rng() * 2 - 1) * 8);

  const total = segments.length;
  const length = total * SEGMENT_LENGTH;

  // ── props & scenery ─────────────────────────────────────────
  const markerTypes = { neon: 'lamp', dunes: 'flag', frost: 'flag', coast: 'buoy', redwood: 'sign', magma: 'vent', glacier: 'flag', dockyard: 'barrel', sunset: 'lamp', bayou: 'firefly', toy: 'block', orbital: 'sign' };

  for (let i = 6; i < total - 4; i++) {
    const seg = segments[i];
    const density = location.density;
    if (rng() < density) {
      const side = rng() < 0.5 ? -1 : 1;
      const type = pick(rng, location.props);
      const isBuilding = type === 'building' || type === 'container' || type === 'crane';
      const offset = side * (isBuilding ? 2.0 + rng() * 2.4 : 1.32 + rng() * 2.1);
      seg.props.push({
        type,
        offset,
        size: 0.72 + rng() * 1.15,
        seed: Math.floor(rng() * 100000),
        side
      });
    }
    // marker lights / edge furniture
    if (i % 11 === 0) {
      const side = i % 22 === 0 ? -1 : 1;
      seg.props.push({
        type: markerTypes[location.id] || 'flag',
        offset: side * 1.18,
        size: 0.34 + rng() * 0.12,
        seed: Math.floor(rng() * 100000),
        side,
        marker: true
      });
    }
  }

  // start gantry and finish strip
  segments[10].props.push({ type: 'gantry', offset: 0, size: 1.5, seed: 7, side: 0 });
  segments[10].props.push({ type: 'startlight', offset: 0.62, size: 0.55, seed: 9, side: 0 });
  for (let i = 0; i < 3; i++) segments[i].finish = true;

  // puddles / wet patches
  for (let i = 0; i < 26; i++) {
    const idx = Math.floor(rng() * total);
    segments[idx].wet = true;
    segments[idx].wetSeed = rng();
  }

  // boost pads
  const boostPads = [];
  const padCount = 7 + Math.floor(rng() * 3);
  for (let k = 0; k < padCount; k++) {
    const idx = Math.floor((k + 0.55 + rng() * 0.35) * total / padCount) % total;
    boostPads.push({ index: idx, x: (rng() * 1.35 - 0.675), active: true, cooldown: 0, phase: rng() * Math.PI * 2 });
  }

  // ── minimap path ────────────────────────────────────────────
  const points = [];
  let hx = 0, hy = 0, heading = 0;
  const samples = Math.ceil(total / 3);
  let turn = 0;
  for (let i = 0; i < total; i += 3) turn += segments[i].curve * 0.0072;
  // Bias the heading so one lap always completes a full turn; without this
  // balanced left/right layouts collapse the minimap into a straight line.
  const bias = (Math.PI * 2 - turn) / Math.max(1, samples);
  for (let i = 0; i < total; i += 3) {
    points.push({ x: hx, y: hy });
    heading += segments[i].curve * 0.0072 + bias;
    hx += Math.cos(heading);
    hy += Math.sin(heading);
  }
  // Shear the path so the final sample lands back on the start; otherwise
  // the minimap closes with a long straight chord across the layout.
  const lastPt = points[points.length - 1];
  const gapX = lastPt.x, gapY = lastPt.y;
  for (let i = 0; i < points.length; i++) {
    const t = i / Math.max(1, points.length - 1);
    points[i].x -= gapX * t;
    points[i].y -= gapY * t;
  }
  points.push({ x: 0, y: 0 });

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const span = Math.max(spanX, spanY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const norm = points.map(p => ({ x: 0.5 + (p.x - cx) / span, y: 0.5 + (p.y - cy) / span }));

  return {
    location,
    seed,
    segments,
    total,
    length,
    segmentLength: SEGMENT_LENGTH,
    roadWidth: ROAD_WIDTH,
    boostPads,
    minimap: norm,
    laps: 3
  };
}

export function segmentAt(track, z) {
  const total = track.length;
  let pos = z % total;
  if (pos < 0) pos += total;
  return track.segments[Math.floor(pos / track.segmentLength) % track.total];
}

export function curveAt(track, z) {
  return segmentAt(track, z).curve / 5;
}

export function percentRemaining(n, total) {
  return (n % total) / total;
}

export function interpolate(a, b, p) {
  return a + (b - a) * p;
}

export function wrapPosition(z, length) {
  let v = z % length;
  if (v < 0) v += length;
  return v;
}

export function formatTime(seconds, showMinutes = true) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  if (!showMinutes) return `${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
