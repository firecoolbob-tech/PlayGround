/* ═══════════════════════════════════════════════════════════════
   RC RUSH — parallax backdrops & circuit thumbnails
   ═══════════════════════════════════════════════════════════════ */
import { mulberry32 } from './track.js';
import { mix, rgba, hashString } from './colors.js';
import { drawRCCar } from './car.js';
import { CARS } from './data.js';

/* ── reusable scenery shapes ─────────────────────────────────── */
function tree(g, x, baseY, h, trunk, canopy, rng) {
  g.fillStyle = trunk;
  g.fillRect(x - h * 0.035, baseY - h * 0.52, h * 0.07, h * 0.52);
  g.fillStyle = canopy;
  for (let i = 0; i < 3; i++) {
    const r = h * (0.2 + rng() * 0.12);
    g.beginPath();
    g.arc(x + (rng() * 2 - 1) * h * 0.16, baseY - h * (0.55 + i * 0.14), r, 0, Math.PI * 2);
    g.fill();
  }
}

function pine(g, x, baseY, h, trunk, canopy) {
  g.fillStyle = trunk;
  g.fillRect(x - h * 0.025, baseY - h * 0.2, h * 0.05, h * 0.2);
  g.fillStyle = canopy;
  for (let i = 0; i < 3; i++) {
    const yy = baseY - h * (0.18 + i * 0.24);
    const ww = h * (0.26 - i * 0.055);
    g.beginPath();
    g.moveTo(x, yy - h * 0.36);
    g.lineTo(x + ww, yy);
    g.lineTo(x - ww, yy);
    g.closePath();
    g.fill();
  }
}

function palm(g, x, baseY, h, trunk, canopy, rng) {
  g.strokeStyle = trunk;
  g.lineWidth = Math.max(2, h * 0.035);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, baseY);
  g.quadraticCurveTo(x + h * 0.1, baseY - h * 0.45, x + (rng() * 2 - 1) * h * 0.12, baseY - h * 0.8);
  g.stroke();
  const tx = x + (rng() * 2 - 1) * h * 0.1;
  const ty = baseY - h * 0.8;
  g.strokeStyle = canopy;
  g.lineWidth = Math.max(1.5, h * 0.028);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i / 5) * Math.PI;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * h * 0.22, ty + Math.sin(a) * h * 0.2 - h * 0.04,
      tx + Math.cos(a) * h * 0.38, ty + Math.sin(a) * h * 0.3);
    g.stroke();
  }
}

/* ── full-size parallax layer ────────────────────────────────── */
export function makeBackdrop(location, variant) {
  const W = 2400, H = 620;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const rng = mulberry32(hashString(location.id) + variant * 7919 + 31);
  const pc = location.propColors;
  const far = variant === 0;
  const base = mix(pc.a, location.fog, far ? 0.55 : 0.18);
  const mid = mix(pc.b, location.fog, far ? 0.42 : 0.08);
  const accent = pc.c;
  const light = pc.d;

  g.clearRect(0, 0, W, H);

  const type = location.backdrop;
  if (type === 'city' || type === 'highway') {
    let x = -60;
    while (x < W + 60) {
      const bw = (far ? 55 : 80) + rng() * (far ? 100 : 150);
      const bh = (far ? 60 : 110) + rng() * (far ? 230 : 360);
      const y = H - bh;
      g.fillStyle = rng() < 0.4 ? mid : base;
      g.fillRect(x, y, bw, bh);
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.fillRect(x, y, bw, 5);
      const cols = Math.max(2, Math.floor(bw / 17));
      const rows = Math.max(2, Math.floor(bh / 21));
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          if (rng() < 0.14) {
            g.fillStyle = rgba(accent, 0.18 + rng() * 0.5);
            g.fillRect(x + 5 + cx * (bw - 8) / cols, y + 8 + ry * (bh - 12) / rows, Math.max(2, (bw - 8) / cols * 0.44), Math.max(2, (bh - 12) / rows * 0.38));
          }
        }
      }
      if (rng() < 0.3) {
        const ax = x + bw * (0.25 + rng() * 0.5);
        const ah = 14 + rng() * 50;
        g.fillStyle = mid;
        g.fillRect(ax, y - ah, 3, ah);
        g.fillStyle = rgba(accent, 0.8);
        g.fillRect(ax - 1.5, y - ah - 3, 6, 6);
      }
      x += bw + 4 + rng() * 16;
    }
    if (type === 'highway') {
      // overhead sign gantries
      for (let i = 0; i < 3; i++) {
        const gx = 300 + i * 760 + rng() * 200;
        g.fillStyle = mid;
        g.fillRect(gx, H - 230, 7, 230);
        g.fillRect(gx + 190, H - 230, 7, 230);
        g.fillRect(gx, H - 236, 197, 8);
        g.fillStyle = rgba(accent, 0.55);
        g.fillRect(gx + 30, H - 270, 130, 34);
      }
    }
  } else if (type === 'mountains') {
    const peaks = [];
    const n = far ? 5 : 4;
    for (let i = 0; i < n; i++) {
      peaks.push({ x: (i + 0.15 + rng() * 0.5) * W / n, h: (far ? 170 : 250) + rng() * (far ? 150 : 230), w: 250 + rng() * 300 });
    }
    g.fillStyle = base;
    g.beginPath(); g.moveTo(-40, H);
    for (const p of peaks) {
      g.lineTo(p.x - p.w * 0.5, H - p.h * 0.45);
      g.lineTo(p.x, H - p.h);
      g.lineTo(p.x + p.w * 0.5, H - p.h * 0.45);
    }
    g.lineTo(W + 40, H); g.closePath(); g.fill();
    for (const p of peaks) {
      g.fillStyle = rgba(light, far ? 0.35 : 0.65);
      g.beginPath();
      g.moveTo(p.x, H - p.h);
      g.lineTo(p.x + p.w * 0.16, H - p.h * 0.62);
      g.lineTo(p.x + p.w * 0.06, H - p.h * 0.66);
      g.lineTo(p.x, H - p.h * 0.58);
      g.lineTo(p.x - p.w * 0.06, H - p.h * 0.68);
      g.lineTo(p.x - p.w * 0.16, H - p.h * 0.62);
      g.closePath(); g.fill();
    }
  } else if (type === 'dunes') {
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = layer === 0 ? base : mix(mid, base, layer / 3);
      g.beginPath();
      g.moveTo(0, H);
      let y = H - 60 - layer * 60;
      g.lineTo(0, y);
      for (let x = 0; x <= W; x += 160) {
        g.quadraticCurveTo(x + 80, y - 60 - rng() * 80, x + 160, y - rng() * 20);
      }
      g.lineTo(W, H); g.closePath(); g.fill();
    }
  } else if (type === 'forest') {
    const count = far ? 48 : 34;
    for (let i = 0; i < count; i++) {
      const x = rng() * W;
      const h = (far ? 100 : 180) + rng() * (far ? 130 : 260);
      if (rng() < 0.3) pine(g, x, H - rng() * 40, h, base, rng() < 0.5 ? base : mid);
      else tree(g, x, H - rng() * 40, h, base, rng() < 0.5 ? base : mid, rng);
    }
  } else if (type === 'volcano') {
    g.fillStyle = base;
    for (let i = 0; i < 2; i++) {
      const cx = i === 0 ? W * 0.36 : W * 0.82;
      const vh = 320 + rng() * 180;
      g.beginPath();
      g.moveTo(cx - 360, H);
      g.lineTo(cx - 80, H - vh);
      g.lineTo(cx + 60, H - vh);
      g.lineTo(cx + 380, H);
      g.closePath(); g.fill();
      // lava glow
      const grd = g.createRadialGradient(cx, H - vh, 4, cx, H - vh, 130);
      grd.addColorStop(0, rgba(accent, 0.9));
      grd.addColorStop(0.4, rgba(accent, 0.35));
      grd.addColorStop(1, rgba(accent, 0));
      g.fillStyle = grd;
      g.beginPath(); g.arc(cx, H - vh, 130, 0, Math.PI * 2); g.fill();
      g.fillStyle = rgba(accent, 0.8);
      g.fillRect(cx - 55, H - vh, 110, 7);
      // smoke
      for (let s = 0; s < 5; s++) {
        g.fillStyle = rgba(mid, 0.18);
        g.beginPath();
        g.arc(cx + (rng() * 2 - 1) * 90, H - vh - 40 - s * 38, 26 + s * 12, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (type === 'ice') {
    for (let i = 0; i < (far ? 22 : 14); i++) {
      const x = rng() * W;
      const h = (far ? 90 : 170) + rng() * (far ? 160 : 260);
      const w = 30 + rng() * 70;
      g.fillStyle = rng() < 0.5 ? base : mid;
      g.beginPath();
      g.moveTo(x - w, H);
      g.lineTo(x - w * 0.2, H - h * 0.75);
      g.lineTo(x, H - h);
      g.lineTo(x + w * 0.3, H - h * 0.6);
      g.lineTo(x + w, H);
      g.closePath(); g.fill();
      g.fillStyle = rgba(light, 0.35);
      g.beginPath();
      g.moveTo(x, H - h);
      g.lineTo(x + w * 0.3, H - h * 0.6);
      g.lineTo(x + w * 0.1, H);
      g.closePath(); g.fill();
    }
  } else if (type === 'dock') {
    // cranes
    for (let i = 0; i < 4; i++) {
      const x = 180 + i * 600 + rng() * 100;
      const h = 280 + rng() * 170;
      g.strokeStyle = base;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(x, H); g.lineTo(x, H - h);
      g.lineTo(x + 240, H - h);
      g.moveTo(x + 80, H - h); g.lineTo(x + 80, H - h + 90);
      g.stroke();
      g.fillStyle = rgba(accent, 0.5);
      g.fillRect(x + 62, H - h + 88, 36, 14);
    }
    // containers
    for (let i = 0; i < (far ? 34 : 22); i++) {
      const x = rng() * W;
      const w = 70 + rng() * 70;
      const h = 26 + rng() * 22;
      const stack = 1 + Math.floor(rng() * 3);
      for (let s = 0; s < stack; s++) {
        g.fillStyle = rng() < 0.3 ? rgba(accent, 0.32) : (s % 2 ? mid : base);
        g.fillRect(x, H - 24 - s * h, w, h - 4);
      }
    }
  } else if (type === 'swamp') {
    for (let i = 0; i < (far ? 34 : 24); i++) {
      const x = rng() * W;
      const h = 120 + rng() * 260;
      g.strokeStyle = base;
      g.lineWidth = 8 + rng() * 10;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x, H);
      g.quadraticCurveTo(x + (rng() * 2 - 1) * 60, H - h * 0.55, x + (rng() * 2 - 1) * 40, H - h);
      g.stroke();
      g.fillStyle = mid;
      g.beginPath();
      g.arc(x + (rng() * 2 - 1) * 40, H - h, 40 + rng() * 55, 0, Math.PI * 2);
      g.fill();
      // hanging moss
      g.strokeStyle = rgba(accent, 0.25);
      g.lineWidth = 2;
      for (let m = 0; m < 4; m++) {
        const mx = x + (rng() * 2 - 1) * 60;
        g.beginPath(); g.moveTo(mx, H - h + 20); g.lineTo(mx + rng() * 10 - 5, H - h + 60 + rng() * 70); g.stroke();
      }
    }
    // mist bands
    for (let i = 0; i < 3; i++) {
      g.fillStyle = rgba(location.fog, 0.12);
      g.beginPath();
      g.ellipse(rng() * W, H - 40 - i * 40, 400, 26, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else if (type === 'toy') {
    for (let i = 0; i < (far ? 26 : 18); i++) {
      const x = rng() * W;
      const w = 70 + rng() * 130;
      const h = 80 + rng() * 220;
      g.fillStyle = rng() < 0.5 ? base : mid;
      g.fillRect(x, H - h, w, h);
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(x, H - h, w, 8);
      if (rng() < 0.5) {
        g.fillStyle = rgba(accent, 0.5);
        for (let d = 0; d < 4; d++) {
          g.beginPath();
          g.arc(x + w * 0.3 + (d % 2) * w * 0.35, H - h * 0.65 + Math.floor(d / 2) * h * 0.25, 5, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // pencils
    for (let i = 0; i < 5; i++) {
      const x = rng() * W;
      const h = 200 + rng() * 220;
      g.save();
      g.translate(x, H);
      g.rotate((rng() * 2 - 1) * 0.16);
      g.fillStyle = rgba(accent, 0.5);
      g.fillRect(-11, -h, 22, h);
      g.fillStyle = light;
      g.beginPath(); g.moveTo(-11, -h); g.lineTo(0, -h - 34); g.lineTo(11, -h); g.closePath(); g.fill();
      g.restore();
    }
  } else if (type === 'space') {
    // planet
    const px = W * 0.68, py = H - 260, pr = 150;
    const pg = g.createRadialGradient(px - 40, py - 40, 10, px, py, pr);
    pg.addColorStop(0, rgba(light, 0.6));
    pg.addColorStop(0.6, rgba(accent, 0.35));
    pg.addColorStop(1, rgba(mid, 0.7));
    g.fillStyle = pg;
    g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = rgba(accent, 0.4);
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * 0.32, -0.28, 0, Math.PI * 2); g.stroke();
    // station modules
    for (let i = 0; i < 6; i++) {
      const x = 180 + rng() * (W - 360);
      const y = H - 120 - rng() * 220;
      g.fillStyle = base;
      g.fillRect(x, y, 90 + rng() * 80, 18 + rng() * 14);
      g.fillStyle = rgba(accent, 0.6);
      g.fillRect(x + 10, y + 5, 20, 5);
    }
  } else if (type === 'coast') {
    g.fillStyle = rgba(mix(location.fog, '#1a5d7a', 0.4), 0.4);
    g.beginPath();
    g.moveTo(0, H - 60);
    for (let x = 0; x <= W; x += 220) g.quadraticCurveTo(x + 110, H - 60 - rng() * 50, x + 220, H - 50 - rng() * 20);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    for (let i = 0; i < (far ? 26 : 18); i++) {
      palm(g, rng() * W, H - 10, 150 + rng() * 180, base, mid, rng);
    }
  }

  // base haze to blend into horizon
  const haze = g.createLinearGradient(0, H - 130, 0, H);
  haze.addColorStop(0, rgba(location.fog, 0));
  haze.addColorStop(1, rgba(location.fog, far ? 0.35 : 0.16));
  g.fillStyle = haze;
  g.fillRect(0, H - 130, W, 130);

  return canvas;
}

/* ── compact scene for circuit cards ─────────────────────────── */
export function drawLocationThumb(canvas, location, seed = 1) {
  const W = 480, H = 340;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const rng = mulberry32(hashString(location.id) + seed * 977);
  const horizon = H * 0.55;

  // sky
  const sky = g.createLinearGradient(0, 0, 0, horizon + 10);
  sky.addColorStop(0, location.sky.top);
  sky.addColorStop(0.55, location.sky.mid);
  sky.addColorStop(1, location.sky.bottom);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, horizon + 10);

  // sun / moon
  const sx = W * location.sun.x, sy = horizon * (0.28 + location.sun.y * 0.7);
  const sr = W * location.sun.size * 0.55;
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 5);
  glow.addColorStop(0, rgba(location.sun.color, 0.8));
  glow.addColorStop(0.2, rgba(location.sun.color, 0.28));
  glow.addColorStop(1, rgba(location.sun.color, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, W, horizon + 10);
  g.fillStyle = location.sun.color;
  g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();

  // stars
  if (location.stars) {
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 46; i++) {
      g.globalAlpha = 0.25 + rng() * 0.6;
      g.fillRect(rng() * W, rng() * horizon * 0.7, 1.3, 1.3);
    }
    g.globalAlpha = 1;
  }

  // backdrop silhouettes
  const pc = location.propColors;
  const base = mix(pc.a, location.fog, 0.3);
  const mid = mix(pc.b, location.fog, 0.18);
  const accent = pc.c;
  const type = location.backdrop;

  if (type === 'city' || type === 'highway') {
    let x = -10;
    while (x < W) {
      const bw = 16 + rng() * 36;
      const bh = 20 + rng() * 70;
      g.fillStyle = rng() < 0.4 ? mid : base;
      g.fillRect(x, horizon - bh, bw, bh);
      for (let i = 0; i < 5; i++) {
        if (rng() < 0.4) {
          g.fillStyle = rgba(accent, 0.5);
          g.fillRect(x + 4 + rng() * (bw - 8), horizon - bh + 6 + rng() * (bh - 10), 2, 3);
        }
      }
      x += bw + 3 + rng() * 8;
    }
  } else if (type === 'mountains') {
    g.fillStyle = base;
    g.beginPath(); g.moveTo(0, horizon);
    for (let i = 0; i < 5; i++) {
      g.lineTo(W * (i + 0.5) / 5, horizon - 40 - rng() * 70);
      g.lineTo(W * (i + 1) / 5, horizon);
    }
    g.lineTo(W, horizon); g.closePath(); g.fill();
    g.fillStyle = rgba('#ffffff', 0.5);
    for (let i = 0; i < 5; i++) {
      const cx = W * (i + 0.5) / 5, cy = horizon - 40 - rng() * 40;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 13, cy + 20); g.lineTo(cx - 13, cy + 20); g.closePath(); g.fill();
    }
  } else if (type === 'dunes') {
    for (let l = 0; l < 3; l++) {
      g.fillStyle = l === 0 ? base : mix(mid, base, l / 3);
      g.beginPath(); g.moveTo(0, horizon);
      for (let x = 0; x <= W; x += 60) g.quadraticCurveTo(x + 30, horizon - 18 - rng() * 24, x + 60, horizon);
      g.lineTo(W, horizon + 4); g.lineTo(0, horizon + 4); g.closePath(); g.fill();
    }
  } else if (type === 'forest') {
    for (let i = 0; i < 26; i++) tree(g, rng() * W, horizon + 2, 36 + rng() * 70, base, rng() < 0.5 ? base : mid, rng);
  } else if (type === 'volcano') {
    g.fillStyle = base;
    g.beginPath(); g.moveTo(W * 0.18, horizon); g.lineTo(W * 0.46, horizon - 120); g.lineTo(W * 0.58, horizon - 120); g.lineTo(W * 0.86, horizon); g.closePath(); g.fill();
    const grd = g.createRadialGradient(W * 0.52, horizon - 120, 2, W * 0.52, horizon - 120, 60);
    grd.addColorStop(0, rgba(accent, 0.8)); grd.addColorStop(1, rgba(accent, 0));
    g.fillStyle = grd; g.beginPath(); g.arc(W * 0.52, horizon - 120, 60, 0, Math.PI * 2); g.fill();
    g.fillStyle = rgba(accent, 0.85); g.fillRect(W * 0.48, horizon - 121, 26, 4);
  } else if (type === 'ice') {
    for (let i = 0; i < 12; i++) {
      const x = rng() * W, h = 26 + rng() * 78, w = 9 + rng() * 22;
      g.fillStyle = rng() < 0.5 ? base : mid;
      g.beginPath(); g.moveTo(x - w, horizon); g.lineTo(x, horizon - h); g.lineTo(x + w, horizon); g.closePath(); g.fill();
    }
  } else if (type === 'dock') {
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * 150 + rng() * 30;
      g.strokeStyle = base; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x, horizon); g.lineTo(x, horizon - 70); g.lineTo(x + 80, horizon - 70); g.stroke();
    }
    for (let i = 0; i < 16; i++) {
      g.fillStyle = rng() < 0.3 ? rgba(accent, 0.4) : (i % 2 ? base : mid);
      g.fillRect(rng() * W, horizon - 12 - rng() * 20, 22 + rng() * 20, 12 + rng() * 8);
    }
  } else if (type === 'swamp') {
    for (let i = 0; i < 18; i++) {
      const x = rng() * W, h = 40 + rng() * 80;
      g.strokeStyle = base; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x, horizon); g.quadraticCurveTo(x + 20, horizon - h * 0.5, x + (rng() * 2 - 1) * 16, horizon - h); g.stroke();
      g.fillStyle = mid; g.beginPath(); g.arc(x + (rng() * 2 - 1) * 16, horizon - h, 14 + rng() * 18, 0, Math.PI * 2); g.fill();
    }
  } else if (type === 'toy') {
    for (let i = 0; i < 12; i++) {
      const w = 20 + rng() * 40, h = 20 + rng() * 60;
      g.fillStyle = rng() < 0.5 ? base : mid;
      g.fillRect(rng() * W, horizon - h, w, h);
    }
    for (let i = 0; i < 3; i++) {
      const x = rng() * W;
      g.fillStyle = rgba(accent, 0.6); g.fillRect(x, horizon - 90, 7, 90);
      g.fillStyle = pc.d; g.beginPath(); g.moveTo(x, horizon - 90); g.lineTo(x + 3.5, horizon - 105); g.lineTo(x + 7, horizon - 90); g.closePath(); g.fill();
    }
  } else if (type === 'space') {
    const px = W * 0.7, py = horizon - 80, pr = 46;
    const pg = g.createRadialGradient(px - 12, py - 12, 2, px, py, pr);
    pg.addColorStop(0, rgba(pc.d, 0.7)); pg.addColorStop(0.6, rgba(accent, 0.5)); pg.addColorStop(1, rgba(mid, 0.7));
    g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = rgba(accent, 0.5); g.lineWidth = 2;
    g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * 0.3, -0.3, 0, Math.PI * 2); g.stroke();
  } else if (type === 'coast') {
    g.fillStyle = rgba('#1b6e8a', 0.4);
    g.beginPath(); g.moveTo(0, horizon - 12);
    for (let x = 0; x <= W; x += 80) g.quadraticCurveTo(x + 40, horizon - 24 - rng() * 12, x + 80, horizon - 12);
    g.lineTo(W, horizon); g.lineTo(0, horizon); g.closePath(); g.fill();
    for (let i = 0; i < 8; i++) palm(g, rng() * W, horizon, 40 + rng() * 40, base, mid, rng);
  }

  // ground
  const ground = g.createLinearGradient(0, horizon, 0, H);
  ground.addColorStop(0, mix(location.ground[0], location.fog, 0.4));
  ground.addColorStop(1, location.ground[0]);
  g.fillStyle = ground;
  g.fillRect(0, horizon, W, H - horizon);

  // road
  const curve = (rng() * 2 - 1) * 70;
  const topY = horizon + 2, bottomY = H + 6;
  const topCX = W * 0.5 + curve;
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const y0 = topY + (bottomY - topY) * Math.pow(t0, 2.1);
    const y1 = topY + (bottomY - topY) * Math.pow(t1, 2.1);
    const w0 = 8 + 190 * Math.pow(t0, 1.65);
    const w1 = 8 + 190 * Math.pow(t1, 1.65);
    const c0 = topCX + (W * 0.5 - topCX) * Math.pow(t0, 1.25);
    const c1 = topCX + (W * 0.5 - topCX) * Math.pow(t1, 1.25);
    const roadColor = location.road[i % 2];
    g.fillStyle = mix(roadColor, location.fog, 0.1 + t0 * 0.15);
    g.beginPath();
    g.moveTo(c0 - w0 * 0.82, y0); g.lineTo(c0 + w0 * 0.82, y0);
    g.lineTo(c1 + w1 * 0.82, y1); g.lineTo(c1 - w1 * 0.82, y1);
    g.closePath(); g.fill();
    g.fillStyle = mix(location.rumble[i % 2], location.fog, 0.12);
    g.beginPath();
    g.moveTo(c0 - w0, y0); g.lineTo(c0 - w0 * 0.82, y0); g.lineTo(c1 - w1 * 0.82, y1); g.lineTo(c1 - w1, y1);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(c0 + w0 * 0.82, y0); g.lineTo(c0 + w0, y0); g.lineTo(c1 + w1, y1); g.lineTo(c1 + w1 * 0.82, y1);
    g.closePath(); g.fill();
    if (i % 3 === 0 && t0 > 0.2) {
      g.fillStyle = rgba(location.lane, 0.55);
      g.beginPath();
      g.moveTo(c0 - w0 * 0.015, y0); g.lineTo(c0 + w0 * 0.015, y0);
      g.lineTo(c1 + w1 * 0.015, y1); g.lineTo(c1 - w1 * 0.015, y1);
      g.closePath(); g.fill();
    }
  }

  // finish strip
  g.fillStyle = 'rgba(245,248,255,.9)';
  g.fillRect(W * 0.5 - 80, H - 24, 160, 6);
  g.fillStyle = 'rgba(10,14,22,.9)';
  for (let i = 0; i < 8; i++) g.fillRect(W * 0.5 - 80 + i * 20, H - 24, 10, 6);

  // car
  const car = CARS[seed % CARS.length];
  drawRCCar(g, W * 0.5 + 4, H - 10, 62, car, { fog: 0, now: 0 });

  // weather
  const weather = location.weather[0];
  if (weather === 'rain' || weather === 'storm') {
    g.strokeStyle = 'rgba(200,235,255,.4)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 60; i++) {
      const x = rng() * W, y = rng() * H;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 14); g.stroke();
    }
    if (weather === 'storm') {
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(W * 0.72, 20); g.lineTo(W * 0.66, 62); g.lineTo(W * 0.72, 62); g.lineTo(W * 0.62, 108); g.stroke();
    }
  } else if (weather === 'snow') {
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 48; i++) {
      g.beginPath(); g.arc(rng() * W, rng() * H, 0.8 + rng() * 2, 0, Math.PI * 2); g.fill();
    }
  } else if (weather === 'dust') {
    g.strokeStyle = 'rgba(255,220,170,.32)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 34; i++) {
      const x = rng() * W, y = rng() * H;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + rng() * 26, y - 2); g.stroke();
    }
  } else if (weather === 'ash') {
    g.fillStyle = 'rgba(210,190,180,.55)';
    for (let i = 0; i < 34; i++) {
      g.beginPath(); g.arc(rng() * W, rng() * H, 0.7 + rng() * 1.8, 0, Math.PI * 2); g.fill();
    }
  } else if (weather === 'fog') {
    g.fillStyle = 'rgba(190,205,220,.2)';
    g.fillRect(0, horizon - 60, W, H - horizon + 60);
  } else if (weather === 'solar') {
    g.fillStyle = 'rgba(180,130,255,.65)';
    for (let i = 0; i < 22; i++) {
      g.beginPath(); g.arc(rng() * W, rng() * H, 1 + rng() * 2.2, 0, Math.PI * 2); g.fill();
    }
  }

  // weather tint + vignette
  const tint = location.weather[0];
  const tintColors = { rain: 'rgba(20,35,60,.2)', storm: 'rgba(16,10,30,.28)', snow: 'rgba(230,245,255,.1)', fog: 'rgba(170,185,200,.16)', ash: 'rgba(60,35,25,.18)', dust: 'rgba(180,120,60,.18)', solar: 'rgba(90,40,140,.14)', clear: 'rgba(0,0,0,0)' };
  g.fillStyle = tintColors[tint] || 'rgba(0,0,0,0)';
  g.fillRect(0, 0, W, H);

  const vig = g.createRadialGradient(W / 2, H * 0.48, H * 0.2, W / 2, H * 0.48, H * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
}
