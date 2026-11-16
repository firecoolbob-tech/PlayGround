import { TAU, mulberry32, clamp, wrapAngle } from './utils.js';
import { WORLD } from './track.js';

const GRASS = '#2e6b3c';
const ASPHALT = '#3d434c';

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function trackPath(points) {
  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
  path.closePath();
  return path;
}

function edgePoints(track, offset) {
  return track.points.map((p, i) => {
    const n = track.normals[i];
    return { x: p.x + n.x * offset, y: p.y + n.y * offset };
  });
}

function makeGrassTile() {
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 180;
  const g = c.getContext('2d');
  g.fillStyle = GRASS;
  g.fillRect(0, 0, 180, 180);

  const rnd = mulberry32(9182);

  // Broad tonal patches keep the turf from looking like flat noise.
  for (let i = 0; i < 7; i++) {
    const x = rnd() * 180;
    const y = rnd() * 180;
    const r = 26 + rnd() * 48;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rnd() < 0.5 ? 'rgba(10, 40, 22, 0.14)' : 'rgba(116, 172, 102, 0.09)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }

  // Mowing stripes, subtle diagonal bands.
  g.fillStyle = 'rgba(210, 255, 200, 0.035)';
  for (let i = -200; i < 400; i += 90) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 44, 0);
    g.lineTo(i + 44 + 180, 180);
    g.lineTo(i + 180, 180);
    g.closePath();
    g.fill();
  }

  for (let i = 0; i < 1100; i++) {
    const x = rnd() * 180;
    const y = rnd() * 180;
    const r = 0.4 + rnd() * 1.5;
    g.fillStyle = rnd() < 0.52 ? 'rgba(9, 34, 19, 0.55)' : 'rgba(110, 174, 104, 0.28)';
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // Occasional pale grass tufts.
  for (let i = 0; i < 60; i++) {
    const x = rnd() * 180;
    const y = rnd() * 180;
    g.strokeStyle = 'rgba(127, 183, 112, 0.24)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 5, y - 3 - rnd() * 3);
    g.stroke();
  }
  return c;
}

function makeAsphaltPattern(ctx) {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#3b4048';
  g.fillRect(0, 0, 160, 160);
  const rnd = mulberry32(551);
  for (let i = 0; i < 2200; i++) {
    const v = rnd();
    g.fillStyle =
      v < 0.5
        ? 'rgba(18, 21, 26, 0.22)'
        : v < 0.85
          ? 'rgba(126, 134, 146, 0.14)'
          : 'rgba(196, 203, 210, 0.12)';
    const s = 0.5 + rnd() * 1.4;
    g.fillRect(rnd() * 160, rnd() * 160, s, s);
  }
  // Faint tarmac seams.
  g.strokeStyle = 'rgba(20, 23, 28, 0.18)';
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = rnd() * 160;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(160, y + (rnd() - 0.5) * 8);
    g.stroke();
  }
  return ctx.createPattern(c, 'repeat');
}

function drawTree(ctx, x, y, r, rnd) {
  ctx.fillStyle = 'rgba(4, 14, 8, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.36, r * 1.08, r * 0.92, 0.35, 0, TAU);
  ctx.fill();

  const pine = rnd() < 0.24;
  const dark = pine ? '#1a4227' : rnd() < 0.5 ? '#173a21' : '#1b4126';
  const mid = pine ? '#245a33' : rnd() < 0.5 ? '#23552e' : '#276036';
  const light = pine ? '#2e6c3d' : rnd() < 0.5 ? '#2f7039' : '#367b40';

  if (pine) {
    // Spiky conifer seen from above.
    const spikes = 12;
    ctx.fillStyle = dark;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * TAU + 0.15;
      const rr = i % 2 === 0 ? r * (0.98 + rnd() * 0.06) : r * 0.54;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = mid;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * TAU + 0.3;
      const rr = i % 2 === 0 ? r * 0.62 : r * 0.34;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(92, 150, 94, 0.4)';
    ctx.beginPath();
    ctx.arc(x - r * 0.16, y - r * 0.18, r * 0.28, 0, TAU);
    ctx.fill();
  } else {
    // Broadleaf canopy made of an irregular base with leaf clusters.
    ctx.fillStyle = dark;
    ctx.beginPath();
    const lobes = 9;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * TAU;
      const rr = r * (0.84 + rnd() * 0.22);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.94;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = mid;
    for (let i = 0; i < 4; i++) {
      const a = rnd() * TAU;
      const d = r * (0.15 + rnd() * 0.3);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.36 + rnd() * 0.2), 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.26, r * 0.42, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(150, 205, 128, 0.3)';
    for (let i = 0; i < 5; i++) {
      const a = rnd() * TAU;
      const d = r * (0.15 + rnd() * 0.5);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d - r * 0.12, y + Math.sin(a) * d - r * 0.14, r * 0.13, 0, TAU);
      ctx.fill();
    }
  }
}

function drawBush(ctx, x, y, r, rnd) {
  ctx.fillStyle = 'rgba(4, 14, 8, 0.24)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.36, r * 1.1, r * 0.8, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = rnd() * TAU;
    const d = r * 0.4;
    ctx.fillStyle = i % 2 ? '#2b6236' : '#23522c';
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.55 + rnd() * 0.3), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(122, 180, 102, 0.35)';
  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.24, r * 0.34, 0, TAU);
  ctx.fill();
}

function drawTireStack(ctx, x, y, rnd) {
  ctx.fillStyle = 'rgba(4, 12, 8, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 6, 13, 10, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? '#151a1b' : i === 1 ? '#20272a' : '#2b3336';
    ctx.beginPath();
    ctx.arc(x - i * 2, y - i * 2, 12 - i * 1.5, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#d24b3f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, 6.5, 0, TAU);
  ctx.stroke();
  if (rnd() < 0.5) {
    ctx.fillStyle = '#f0e7d5';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2.2, 0, TAU);
    ctx.fill();
  }
}

function drawRock(ctx, x, y, size, rnd) {
  ctx.fillStyle = 'rgba(4, 10, 8, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 6, size * 1.1, size * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rnd() < 0.5 ? '#5a5f58' : '#686b60';
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const rr = size * (0.72 + rnd() * 0.4);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.8;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 196, 186, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x - size * 0.2, y - size * 0.25, size * 0.38, size * 0.24, -0.5, 0, TAU);
  ctx.fill();
}

function drawGrandstand(ctx, track, rnd) {
  const p = track.points[0];
  const n = track.normals[0];
  const outward = (p.x - WORLD.w / 2) * n.x + (p.y - WORLD.h / 2) * n.y > 0 ? 1 : -1;
  const dist = track.width / 2 + 148;
  const x = p.x + n.x * dist * outward;
  const y = p.y + n.y * dist * outward;
  const angle = track.startAngle;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(3, 9, 7, 0.35)';
  roundRect(ctx, -170 + 12, -64 + 16, 340, 128, 10);
  ctx.fill();

  // Structure
  ctx.fillStyle = '#1a2124';
  roundRect(ctx, -170, -64, 340, 128, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 190, 190, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Seating rows
  const colors = ['#3ae2ff', '#ffd24a', '#ff5a5a', '#e9f4f2', '#7b8ff0', '#ff9a4a'];
  for (let row = 0; row < 5; row++) {
    const ry = -46 + row * 21;
    ctx.fillStyle = row % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.16)';
    ctx.fillRect(-158, ry, 316, 18);
    for (let c = 0; c < 40; c++) {
      if (rnd() < 0.16) continue;
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      ctx.globalAlpha = 0.65 + rnd() * 0.3;
      ctx.fillRect(-155 + c * 7.85, ry + 5 + rnd() * 4, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  // Roof edge / barriers
  ctx.fillStyle = '#0e1416';
  ctx.fillRect(-170, 55, 340, 9);
  ctx.fillStyle = '#c9d6d4';
  for (let i = 0; i < 17; i++) {
    ctx.fillStyle = i % 2 ? '#d6e2df' : '#b23a34';
    ctx.fillRect(-168 + i * 20, 58, 10, 4);
  }
  ctx.fillStyle = 'rgba(58, 226, 255, 0.6)';
  ctx.fillRect(-170, -64, 340, 3);

  ctx.restore();
}

function drawBillboard(ctx, x, y, angle, side, label, color) {
  ctx.save();
  ctx.translate(x, y);
  // Keep sign faces readable in the fixed north-up camera.
  const readable = Math.abs(wrapAngle(angle)) > Math.PI / 2 ? angle + Math.PI : angle;
  ctx.rotate(readable);
  ctx.fillStyle = 'rgba(3, 9, 7, 0.3)';
  ctx.fillRect(-78 + 5, -16 + 6, 156, 32);
  ctx.fillStyle = '#11181a';
  ctx.fillRect(-78, -16, 156, 32);
  ctx.fillStyle = color;
  ctx.fillRect(-78, -16, 156, 4);
  ctx.fillStyle = '#f2f8f6';
  ctx.font = '800 19px Bahnschrift, "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-78, -16, 156, 32);
  // Support posts
  if (side > 0) {
    ctx.fillStyle = '#2a3234';
    ctx.fillRect(-62, 16, 5, 16);
    ctx.fillRect(57, 16, 5, 16);
  }
  ctx.restore();
}

export function buildWorld(track) {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.w;
  canvas.height = WORLD.h;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(424242);

  // Ground
  const grassTile = makeGrassTile();
  const grass = ctx.createPattern(grassTile, 'repeat');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  const path = trackPath(track.points);
  const W = track.width;

  // Mowed verge, then the dark shoulder under the asphalt edge.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(21, 48, 27, 0.5)';
  ctx.lineWidth = W + 82;
  ctx.stroke(path);

  ctx.strokeStyle = 'rgba(38, 33, 24, 0.9)';
  ctx.lineWidth = W + 30;
  ctx.stroke(path);

  // Asphalt
  ctx.strokeStyle = ASPHALT;
  ctx.lineWidth = W;
  ctx.stroke(path);

  // Tarmac grain, clipped tightly to the surface.
  ctx.save();
  ctx.lineWidth = W - 2;
  ctx.strokeStyle = makeAsphaltPattern(ctx);
  ctx.globalAlpha = 0.9;
  ctx.stroke(path);
  ctx.restore();

  // Slight sheen down the middle and darker track edges.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = W * 0.46;
  ctx.stroke(path);

  const lineOffset = W / 2 - 9;
  ctx.strokeStyle = 'rgba(240, 238, 226, 0.62)';
  ctx.lineWidth = 4;
  ctx.stroke(trackPath(edgePoints(track, lineOffset)));
  ctx.stroke(trackPath(edgePoints(track, -lineOffset)));

  // Kerbs: alternating red/white blocks on both edges.
  const kerbOffset = W / 2 + 6;
  const edges = [edgePoints(track, kerbOffset), edgePoints(track, -kerbOffset)];
  const step = 4;
  for (let e = 0; e < 2; e++) {
    const pts = edges[e];
    ctx.lineWidth = 13;
    ctx.lineCap = 'butt';
    for (let i = 0; i < track.N; i += step) {
      const j = (i + step) % track.N;
      ctx.strokeStyle = Math.floor(i / step) % 2 === 0 ? '#d4463f' : '#f1ecdf';
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    }
  }

  // Start / finish checker band.
  const sp = track.points[0];
  const sa = track.startAngle;
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(sa);
  const bandLen = 38;
  ctx.fillStyle = '#f2eee3';
  ctx.fillRect(-bandLen / 2, -W / 2, bandLen, W);
  const cols = 14;
  const cellW = W / cols;
  const cellL = bandLen / 2;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) continue;
      ctx.fillStyle = '#141719';
      ctx.fillRect(-bandLen / 2 + r * cellL, -W / 2 + c * cellW, cellL, cellW);
    }
  }
  ctx.restore();

  // Grid boxes.
  const grid = [
    [72, -48],
    [72, 48],
    [132, -48],
    [132, 48],
  ];
  for (const [behind, lateral] of grid) {
    const slot = track.gridSlot(behind, lateral);
    ctx.save();
    ctx.translate(slot.x, slot.y);
    ctx.rotate(slot.angle);
    ctx.strokeStyle = 'rgba(238, 238, 226, 0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -20, 52, 40);
    ctx.fillStyle = 'rgba(238, 238, 226, 0.28)';
    ctx.fillRect(16, -20, 4, 40);
    ctx.restore();
  }

  // Interior trees, bushes and props.
  const placed = [];
  const standP = track.points[0];
  const standN = track.normals[0];
  const standOut = (standP.x - WORLD.w / 2) * standN.x + (standP.y - WORLD.h / 2) * standN.y > 0 ? 1 : -1;
  const standX = standP.x + standN.x * (W / 2 + 148) * standOut;
  const standY = standP.y + standN.y * (W / 2 + 148) * standOut;

  const tooCloseToTrack = (x, y, pad) => {
    const near = track.nearest(x, y);
    return near.dist < W / 2 + pad;
  };
  const tooCloseToProp = (x, y, pad) => {
    for (const p of placed) {
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < (p.r + pad) ** 2) return true;
    }
    return false;
  };

  let attempts = 0;
  while (placed.length < 190 && attempts < 3000) {
    attempts++;
    const x = 40 + rnd() * (WORLD.w - 80);
    const y = 40 + rnd() * (WORLD.h - 80);
    const roll = rnd();
    const r = roll < 0.55 ? 14 + rnd() * 20 : 10 + rnd() * 10;
    if (tooCloseToTrack(x, y, r + 34)) continue;
    if (tooCloseToProp(x, y, r * 0.8 + 10)) continue;
    if ((x - standX) ** 2 + (y - standY) ** 2 < 240 ** 2) continue;

    placed.push({ x, y, r });
    if (roll < 0.55) drawTree(ctx, x, y, r, rnd);
    else if (roll < 0.8) drawBush(ctx, x, y, r * 0.9, rnd);
    else if (roll < 0.9) drawTireStack(ctx, x, y, rnd);
    else drawRock(ctx, x, y, r * 0.55, rnd);
  }

  // Dense forest border so the world has a natural edge.
  for (let i = 0; i < 220; i++) {
    const side = i % 4;
    let x, y;
    if (side === 0) { x = rnd() * WORLD.w; y = -10 + rnd() * 95; }
    else if (side === 1) { x = rnd() * WORLD.w; y = WORLD.h - 95 + rnd() * 95; }
    else if (side === 2) { x = -10 + rnd() * 95; y = rnd() * WORLD.h; }
    else { x = WORLD.w - 95 + rnd() * 95; y = rnd() * WORLD.h; }
    if (tooCloseToTrack(x, y, 60)) continue;
    drawTree(ctx, x, y, 18 + rnd() * 22, rnd);
  }

  drawGrandstand(ctx, track, rnd);

  // Billboards on straights.
  const boards = [
    { label: 'APEX', color: '#ff5a4f' },
    { label: 'TURBO', color: '#3ae2ff' },
    { label: 'NITRO', color: '#ffd24a' },
    { label: 'GRIP', color: '#a77bff' },
  ];
  let boardIndex = 0;
  for (let i = 20; i < track.N - 20 && boardIndex < boards.length; i += 7) {
    const idx = (i * 3) % track.N;
    if (Math.abs(track.curvature[idx]) > 0.0011) continue;
    if (idx < 24 || idx > track.N - 24) continue;
    const b = boards[boardIndex++];
    const side = boardIndex % 2 === 0 ? 1 : -1;
    const p = track.points[idx];
    const n = track.normals[idx];
    const off = W / 2 + 118;
    drawBillboard(
      ctx,
      p.x + n.x * off * side,
      p.y + n.y * off * side,
      Math.atan2(track.tangents[idx].y, track.tangents[idx].x),
      side,
      b.label,
      b.color
    );
  }

  return { canvas, grassTile };
}

export function drawCarShadow(ctx, car) {
  ctx.save();
  ctx.translate(car.pos.x + 6, car.pos.y + 8);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(3, 10, 7, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 0, car.length * 0.55, car.width * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawCar(ctx, car, time) {
  const L = car.length;
  const W = car.width;

  ctx.save();
  ctx.translate(car.pos.x, car.pos.y);
  ctx.rotate(car.angle);

  // Wheels
  const wheelSteer = car.steerVisual * 0.5;
  ctx.fillStyle = '#121519';
  const drawWheel = (wx, wy, turn) => {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(turn);
    roundRect(ctx, -5, -2.9, 10, 5.8, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(-3, -0.7, 6, 1.2);
    ctx.fillStyle = '#121519';
    ctx.restore();
  };
  drawWheel(14, -W / 2 + 1.5, wheelSteer);
  drawWheel(14, W / 2 - 1.5, wheelSteer);
  drawWheel(-14, -W / 2 + 1.5, 0);
  drawWheel(-14, W / 2 - 1.5, 0);

  // Rear wing
  ctx.fillStyle = '#161b1f';
  roundRect(ctx, -L / 2 - 3, -W / 2 + 2, 6.5, W - 4, 2);
  ctx.fill();

  // Body
  const bodyGrad = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  bodyGrad.addColorStop(0, 'rgba(255,255,255,0.38)');
  bodyGrad.addColorStop(0.34, 'rgba(255,255,255,0.06)');
  bodyGrad.addColorStop(0.62, 'rgba(0,0,0,0.05)');
  bodyGrad.addColorStop(1, 'rgba(0,0,0,0.42)');

  ctx.fillStyle = car.color;
  roundRect(ctx, -L / 2, -W / 2, L, W, 8);
  ctx.fill();
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Nose taper highlight + livery stripe
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = car.accent;
  ctx.beginPath();
  ctx.moveTo(L / 2 - 8, -W / 2 + 3.5);
  ctx.lineTo(L / 2 - 3, 0);
  ctx.lineTo(L / 2 - 8, W / 2 - 3.5);
  ctx.lineTo(L / 2 - 14, W / 2 - 3.5);
  ctx.lineTo(L / 2 - 14, -W / 2 + 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Racing stripe
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(-L / 2 + 4, -2.2, L - 12, 4.4);

  // Cockpit
  ctx.fillStyle = 'rgba(8, 14, 17, 0.9)';
  roundRect(ctx, -9, -W / 2 + 5, 19, W - 10, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(150, 220, 228, 0.38)';
  roundRect(ctx, -5, -W / 2 + 6.5, 11, W - 13, 4.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-7.5, -W / 2 + 7.5, 2.2, W - 15);

  // Roll hoop
  ctx.fillStyle = 'rgba(20, 26, 30, 0.9)';
  ctx.fillRect(-11, -W / 2 + 5, 3.6, W - 10);

  // Number roundel on the nose
  ctx.fillStyle = 'rgba(8, 14, 16, 0.3)';
  ctx.beginPath();
  ctx.arc(L / 2 - 11, 0, 4.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '700 7px "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(car.number), L / 2 - 11, 0.5);

  // Headlights
  ctx.fillStyle = 'rgba(255, 249, 214, 0.95)';
  roundRect(ctx, L / 2 - 4.5, -W / 2 + 2, 3, 5, 1.5);
  ctx.fill();
  roundRect(ctx, L / 2 - 4.5, W / 2 - 7, 3, 5, 1.5);
  ctx.fill();

  // Tail lights
  const braking = car.braking;
  if (braking) {
    ctx.fillStyle = 'rgba(255, 60, 55, 0.22)';
    ctx.beginPath();
    ctx.ellipse(-L / 2 - 2, 0, 9, 13, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = braking ? '#ff4a44' : 'rgba(190, 45, 40, 0.75)';
  roundRect(ctx, -L / 2 + 0.5, -W / 2 + 3.5, 3.5, 5, 1.5);
  ctx.fill();
  roundRect(ctx, -L / 2 + 0.5, W / 2 - 8.5, 3.5, 5, 1.5);
  ctx.fill();

  // Player marker: subtle cyan rim glow
  if (car.isPlayer) {
    ctx.strokeStyle = 'rgba(140, 248, 255, 0.55)';
    ctx.lineWidth = 1.2;
    roundRect(ctx, -L / 2 - 1, -W / 2 - 1, L + 2, W + 2, 9);
    ctx.stroke();
  }

  ctx.restore();
}

let smokeSprite = null;
function getSmokeSprite() {
  if (smokeSprite) return smokeSprite;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(48, 48, 2, 48, 48, 46);
  grad.addColorStop(0, 'rgba(242, 247, 243, 0.62)');
  grad.addColorStop(0.45, 'rgba(226, 234, 230, 0.3)');
  grad.addColorStop(1, 'rgba(214, 224, 220, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 96, 96);
  smokeSprite = c;
  return c;
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    const t = clamp(p.life / p.maxLife, 0, 1);
    if (p.kind === 'smoke') {
      const r = p.size * (2.1 - t * 0.55);
      ctx.globalAlpha = 0.5 * t;
      ctx.drawImage(getSmokeSprite(), p.x - r, p.y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    } else if (p.kind === 'dust') {
      const r = p.size * (1.35 - t * 0.4);
      ctx.fillStyle = p.tint === 'green' ? `rgba(96, 126, 70, ${0.4 * t})` : `rgba(156, 140, 98, ${0.46 * t})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'spark') {
      ctx.strokeStyle = `rgba(255, 214, 120, ${0.9 * t})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      ctx.stroke();
    }
  }
}
