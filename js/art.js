import * as THREE from '../vendor/three.module.js';
import { RARITIES, TRAITS, carSvg, parseHex, rgba, lighten, darken } from './data.js';

const FONT = '"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
const textures = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function fitFont(ctx, text, maxWidth, startSize, weight = 900, family = FONT) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size > 10);
  return size;
}
function wrapLines(ctx, text, maxWidth, maxLines = 3) {
  const words = String(text).toUpperCase().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    } else line = test;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export function drawCarSide(ctx, car, x, y, scale = 1) {
  const rar = RARITIES[car.rarity] || RARITIES.street;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // ground shadow
  const sg = ctx.createRadialGradient(62, 44, 3, 62, 44, 48);
  sg.addColorStop(0, 'rgba(0,0,0,.55)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(62, 43, 48, 5, 0, 0, Math.PI * 2); ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, 12, 0, 42);
  bodyGrad.addColorStop(0, lighten(car.color, 0.52));
  bodyGrad.addColorStop(0.32, car.color);
  bodyGrad.addColorStop(0.78, darken(car.color, 0.18));
  bodyGrad.addColorStop(1, darken(car.color, 0.55));

  ctx.beginPath();
  ctx.moveTo(12, 33);
  ctx.quadraticCurveTo(12, 27, 20, 27);
  ctx.lineTo(27, 26);
  ctx.lineTo(37, 17);
  ctx.quadraticCurveTo(41, 13, 48, 13);
  ctx.lineTo(64, 13);
  ctx.quadraticCurveTo(71, 13, 76, 17);
  ctx.lineTo(82, 24);
  ctx.lineTo(97, 27);
  ctx.quadraticCurveTo(104, 28, 106, 32);
  ctx.lineTo(106, 36);
  ctx.quadraticCurveTo(106, 39, 102, 39);
  ctx.lineTo(16, 39);
  ctx.quadraticCurveTo(12, 39, 12, 33);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = `rgba(255,255,255,.38)`;
  ctx.stroke();

  // windows
  ctx.beginPath();
  ctx.moveTo(38, 25);
  ctx.lineTo(45, 17);
  ctx.quadraticCurveTo(47, 15, 51, 15);
  ctx.lineTo(63, 15);
  ctx.quadraticCurveTo(68, 15, 71, 18);
  ctx.lineTo(75, 24);
  ctx.closePath();
  const gg = ctx.createLinearGradient(38, 15, 76, 25);
  gg.addColorStop(0, 'rgba(155,215,255,.32)');
  gg.addColorStop(0.5, 'rgba(7,14,26,.96)');
  gg.addColorStop(1, 'rgba(90,150,220,.18)');
  ctx.fillStyle = gg; ctx.fill();

  // window split + highlight
  ctx.strokeStyle = 'rgba(190,225,255,.24)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(57, 15); ctx.lineTo(57, 24.4); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.moveTo(15, 29); ctx.lineTo(103, 29); ctx.stroke();

  // side vent + door
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(48, 27); ctx.lineTo(48, 37); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(64, 27); ctx.lineTo(64, 37); ctx.stroke();

  // rarity side trim
  ctx.strokeStyle = rar.color;
  ctx.lineWidth = 1.1;
  ctx.shadowColor = rar.color; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.moveTo(20, 35.6); ctx.lineTo(38, 35.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(86, 35.6); ctx.lineTo(101, 35.6); ctx.stroke();
  ctx.shadowBlur = 0;

  // wheels
  for (const cx of [32, 90]) {
    ctx.beginPath(); ctx.arc(cx, 36, 8.6, 0, Math.PI * 2);
    ctx.fillStyle = '#06090f'; ctx.fill();
    ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(205,220,240,.25)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 36, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = '#111826'; ctx.fill();
    ctx.lineWidth = 1.1; ctx.strokeStyle = rar.color; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 36, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#d8e6f7'; ctx.fill();
  }

  // lights
  ctx.fillStyle = '#fff3c8';
  ctx.shadowColor = '#ffe8ad'; ctx.shadowBlur = 8;
  ctx.fillRect(103, 29.5, 3.2, 2.3);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff4b74';
  ctx.shadowColor = '#ff2a55'; ctx.shadowBlur = 7;
  ctx.fillRect(12.4, 31, 2.3, 1.8);
  ctx.shadowBlur = 0;

  // gloss streak
  ctx.beginPath();
  ctx.moveTo(24, 22);
  ctx.lineTo(54, 17);
  ctx.lineTo(46, 20);
  ctx.lineTo(26, 25);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fill();
  ctx.restore();
}

export function makeCardTexture(car) {
  const key = `card:${car.id}`;
  if (textures.has(key)) return textures.get(key);
  const rar = RARITIES[car.rarity];
  const trait = car.trait ? TRAITS[car.trait] : null;
  const W = 512, H = 720;
  const c = canvas(W, H), ctx = c.getContext('2d');

  ctx.fillStyle = '#060910';
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#121a2a');
  bg.addColorStop(0.35, '#090d16');
  bg.addColorStop(1, '#04060b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // rarity aura
  const aura = ctx.createRadialGradient(256, 140, 0, 256, 140, 330);
  aura.addColorStop(0, rgba(rar.color, 0.34));
  aura.addColorStop(0.45, rgba(rar.color, 0.1));
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura; ctx.fillRect(0, 0, W, H);

  // micro grid
  ctx.strokeStyle = 'rgba(255,255,255,.028)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // diagonal foil streaks
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = -2; i < 8; i++) {
    const g = ctx.createLinearGradient(0, i * 110, 320, i * 110 + 180);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, i % 3 === 0 ? 'rgba(255,255,255,.05)' : 'rgba(120,220,255,.035)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.save(); ctx.translate(0, i * 120); ctx.rotate(-0.46);
    ctx.fillRect(-100, -30, 800, 34); ctx.restore();
  }
  ctx.restore();

  // frame
  const frame = ctx.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, rar.color);
  frame.addColorStop(0.5, 'rgba(255,255,255,.5)');
  frame.addColorStop(1, rar.color);
  ctx.strokeStyle = frame;
  ctx.lineWidth = 4;
  roundRect(ctx, 10, 10, W - 20, H - 20, 22); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, 19, 19, W - 38, H - 38, 16); ctx.stroke();

  // header
  ctx.fillStyle = '#f2f7ff';
  ctx.font = `900 22px ${FONT}`;
  ctx.fillText('APEX', 34, 56);
  const apexW = ctx.measureText('APEX').width;
  ctx.fillStyle = '#ff3d86';
  ctx.fillText('//RIP', 34 + apexW, 56);
  ctx.font = `800 11px ${FONT}`;
  ctx.fillStyle = 'rgba(190,205,230,.55)';
  ctx.textAlign = 'right';
  ctx.fillText('SERIES 02', W - 36, 48);
  ctx.fillText('TRADING CARD', W - 36, 63);
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath(); ctx.moveTo(34, 78); ctx.lineTo(W - 34, 78); ctx.stroke();

  // rarity
  ctx.font = `800 10px ${FONT}`;
  ctx.fillStyle = 'rgba(190,205,230,.55)';
  ctx.fillText('RARITY TIER', 36, 105);
  ctx.font = `900 34px ${FONT}`;
  ctx.fillStyle = rar.color;
  ctx.shadowColor = rgba(rar.color, 0.7); ctx.shadowBlur = 16;
  ctx.fillText(rar.name.toUpperCase(), 34, 140);
  ctx.shadowBlur = 0;
  ctx.fillStyle = rar.color;
  ctx.fillRect(36, 152, 54, 3);
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.fillRect(94, 152, W - 130, 1);

  // car art
  ctx.save();
  ctx.globalAlpha = 0.95;
  drawCarSide(ctx, car, 58, 200, 3.32);
  ctx.restore();
  const floor = ctx.createLinearGradient(0, 352, 0, 376);
  floor.addColorStop(0, rgba(rar.color, 0.2));
  floor.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = floor; ctx.fillRect(40, 352, W - 80, 34);

  // name
  ctx.font = `900 38px ${FONT}`;
  const nameSize = fitFont(ctx, car.name.toUpperCase(), W - 72, 38, 900);
  ctx.font = `900 ${nameSize}px ${FONT}`;
  ctx.fillStyle = '#f6f9ff';
  ctx.fillText(car.name.toUpperCase(), 36, 420);

  // trait or stock
  if (trait) {
    ctx.font = `900 12px ${FONT}`;
    const tw = ctx.measureText(trait.name.toUpperCase()).width + 44;
    roundRect(ctx, 36, 440, tw, 30, 8);
    ctx.fillStyle = rgba(trait.color, 0.16); ctx.fill();
    ctx.strokeStyle = rgba(trait.color, 0.5); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(49, 455, 4, 0, Math.PI * 2);
    ctx.fillStyle = trait.color; ctx.shadowColor = trait.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = trait.color;
    ctx.fillText(trait.name.toUpperCase(), 59, 459);
    ctx.font = `700 9px ${FONT}`;
    ctx.fillStyle = 'rgba(220,232,250,.55)';
    ctx.fillText(trait.perk, 36 + tw + 10, 459);
  } else {
    ctx.font = `800 11px ${FONT}`;
    ctx.fillStyle = 'rgba(190,205,230,.4)';
    ctx.fillText('NO SIGNATURE TRAIT', 36, 458);
  }

  // stats
  const stats = [
    ['SPEED', car.speed, '#4fe3ff'],
    ['ACCEL', car.accel, '#ff9d3d'],
    ['GRIP', car.grip, '#43ffa3'],
  ];
  stats.forEach(([label, value, color], i) => {
    const y = 500 + i * 40;
    ctx.font = `800 11px ${FONT}`;
    ctx.fillStyle = 'rgba(200,214,238,.62)';
    ctx.fillText(label, 38, y);
    const bx = 116, bw = 308;
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    roundRect(ctx, bx, y - 9, bw, 7, 4); ctx.fill();
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, color);
    grad.addColorStop(1, lighten(color, 0.35));
    ctx.fillStyle = grad;
    roundRect(ctx, bx, y - 9, bw * (Math.min(100, value) / 100), 7, 4); ctx.fill();
    ctx.font = `900 12px ${FONT}`;
    ctx.fillStyle = '#eef4ff';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(value)), W - 38, y);
    ctx.textAlign = 'left';
  });

  // footer
  ctx.strokeStyle = 'rgba(255,255,255,.13)';
  ctx.beginPath(); ctx.moveTo(34, 632); ctx.lineTo(W - 34, 632); ctx.stroke();
  ctx.font = `800 10px ${FONT}`;
  ctx.fillStyle = 'rgba(185,205,232,.5)';
  ctx.fillText('APEX//RIP · AUTHENTIC DROP', 36, 656);
  ctx.textAlign = 'right';
  ctx.fillStyle = rar.color;
  ctx.fillText(`N° ${String(hashCode(car.id) % 9999).padStart(4, '0')} / ${rar.short}`, W - 36, 656);
  ctx.textAlign = 'left';

  ctx.fillStyle = rgba(rar.color, 0.7);
  ctx.fillRect(34, 674, W - 68, 2);

  // final glass sheen
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, 'rgba(255,255,255,.08)');
  sheen.addColorStop(0.16, 'rgba(255,255,255,.01)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, W, H);

  const texture = tex(c);
  textures.set(key, texture);
  return texture;
}

export function makeCardBackTexture() {
  const key = 'card:back';
  if (textures.has(key)) return textures.get(key);
  const W = 512, H = 720;
  const c = canvas(W, H), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#111a2b'); g.addColorStop(0.5, '#080b14'); g.addColorStop(1, '#0c1422');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
  for (let i = 0; i < 30; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * 26); ctx.lineTo(W, i * 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 22, 0); ctx.lineTo(i * 22, H); ctx.stroke();
  }
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.5);
  ctx.strokeStyle = 'rgba(79,227,255,.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(0, 0, 90 + i * 42, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
  roundRect(ctx, 12, 12, W - 24, H - 24, 22); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `900 52px ${FONT}`;
  ctx.fillStyle = '#f2f7ff';
  ctx.fillText('APEX', W / 2, H / 2 - 10);
  ctx.fillStyle = '#ff3d86';
  ctx.fillText('//RIP', W / 2, H / 2 + 44);
  ctx.font = `800 12px ${FONT}`;
  ctx.fillStyle = 'rgba(180,205,230,.45)';
  ctx.fillText('SEALED · AUTHENTIC · GLOSSY', W / 2, H / 2 + 88);
  ctx.textAlign = 'left';
  const t = tex(c);
  textures.set(key, t);
  return t;
}

export function makePackTexture(pack) {
  const key = `pack:${pack.id}`;
  if (textures.has(key)) return textures.get(key);
  const W = 512, H = 768;
  const c = canvas(W, H), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, darken(pack.color2, 0.25));
  g.addColorStop(0.45, pack.color2);
  g.addColorStop(1, '#04060b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const aura = ctx.createRadialGradient(W * 0.78, H * 0.16, 0, W * 0.78, H * 0.16, 430);
  aura.addColorStop(0, rgba(pack.color, 0.55));
  aura.addColorStop(0.35, rgba(pack.color, 0.16));
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura; ctx.fillRect(0, 0, W, H);

  // circuit traces
  ctx.strokeStyle = rgba(pack.color, 0.2);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    let x = 0, y = 120 + i * 82;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += 70 + (i % 3) * 20;
      y += ((i + j) % 2 ? 26 : -26);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
  for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.moveTo(i * 26, 0); ctx.lineTo(i * 26, H); ctx.stroke(); }

  // big ghost glyph
  ctx.save();
  ctx.translate(W / 2, H * 0.64);
  ctx.rotate(-0.14);
  ctx.textAlign = 'center';
  ctx.font = `900 260px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  ctx.fillText(pack.name.split(' ')[0].slice(0, 1), 0, 60);
  ctx.restore();

  // header
  ctx.fillStyle = '#f4f8ff';
  ctx.font = `900 24px ${FONT}`;
  ctx.fillText('APEX', 36, 58);
  const aw = ctx.measureText('APEX').width;
  ctx.fillStyle = '#ff3d86';
  ctx.fillText('//RIP', 36 + aw, 58);
  ctx.font = `800 11px ${FONT}`;
  ctx.fillStyle = 'rgba(225,238,255,.6)';
  ctx.textAlign = 'right';
  ctx.fillText('SEALED DROP', W - 36, 44);
  ctx.fillText(pack.tier, W - 36, 60);
  ctx.textAlign = 'left';
  ctx.strokeStyle = rgba(pack.color, 0.6);
  ctx.beginPath(); ctx.moveTo(36, 82); ctx.lineTo(W - 36, 82); ctx.stroke();

  // title
  ctx.font = `900 55px ${FONT}`;
  const lines = wrapLines(ctx, pack.name, W - 90, 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = rgba(pack.color, 0.6); ctx.shadowBlur = 22;
  let ty = 178;
  for (const line of lines) {
    const sz = fitFont(ctx, line, W - 80, 55, 900);
    ctx.font = `900 ${sz}px ${FONT}`;
    ctx.fillText(line, 38, ty);
    ty += sz * 1.02;
  }
  ctx.shadowBlur = 0;

  // tagline
  ctx.font = `900 15px ${FONT}`;
  ctx.fillStyle = pack.color;
  ctx.fillText(pack.tag, 40, ty + 6);
  ctx.fillStyle = rgba(pack.color, 0.35);
  ctx.fillRect(40, ty + 17, 160, 2);

  // feature car silhouette
  const car = pack.focus && pack.focus[0];
  if (car) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawCarSide(ctx, { id: car, name: car, color: pack.color, rarity: 'apex' }, 42, 432, 3.5);
    ctx.restore();
  }

  // rarity bar
  ctx.font = `800 10px ${FONT}`;
  ctx.fillStyle = 'rgba(220,235,255,.5)';
  ctx.fillText('PULL ODDS', 38, 540);
  let x = 38;
  const rarNames = ['STK', 'STR', 'PRO', 'PRT', 'APX'];
  pack.odds.forEach((odd, i) => {
    const w = 88;
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    roundRect(ctx, x, 552, w - 6, 8, 3); ctx.fill();
    const col = ['#aab5c5', '#35e6ac', '#4fa6ff', '#b47bff', '#ffc247'][i];
    ctx.fillStyle = col;
    roundRect(ctx, x, 552, Math.max(2, (w - 6) * (odd / 100) * 1.8), 8, 3); ctx.fill();
    ctx.fillStyle = 'rgba(220,235,255,.55)';
    ctx.fillText(`${rarNames[i]} ${odd}%`, x, 578);
    x += w;
  });

  // footer
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath(); ctx.moveTo(36, 624); ctx.lineTo(W - 36, 624); ctx.stroke();
  ctx.font = `900 17px ${FONT}`;
  ctx.fillStyle = '#f2f7ff';
  ctx.fillText('5 RARITIES', 38, 660);
  ctx.font = `800 10px ${FONT}`;
  ctx.fillStyle = 'rgba(220,235,255,.5)';
  ctx.fillText('SIGNATURE TRAITS · GLOSS SERIES', 38, 680);
  ctx.textAlign = 'right';
  ctx.fillStyle = pack.color;
  ctx.font = `900 13px ${FONT}`;
  ctx.fillText('DO NOT BEND', W - 38, 660);
  ctx.textAlign = 'left';

  // gloss
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const gl = ctx.createLinearGradient(0, 0, W, 200);
  gl.addColorStop(0, 'rgba(255,255,255,0)');
  gl.addColorStop(0.4, 'rgba(255,255,255,.1)');
  gl.addColorStop(0.5, 'rgba(255,255,255,.2)');
  gl.addColorStop(0.6, 'rgba(255,255,255,.04)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.save(); ctx.rotate(-0.5); ctx.translate(-200, 100); ctx.fillRect(0, 0, 900, 150); ctx.restore();
  ctx.restore();

  // frame
  const fr = ctx.createLinearGradient(0, 0, W, H);
  fr.addColorStop(0, pack.color);
  fr.addColorStop(0.5, 'rgba(255,255,255,.45)');
  fr.addColorStop(1, pack.color);
  ctx.strokeStyle = fr; ctx.lineWidth = 4;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
  roundRect(ctx, 18, 18, W - 36, H - 36, 14); ctx.stroke();

  const t = tex(c);
  textures.set(key, t);
  return t;
}

export function makeWheelLabelTexture(reward) {
  const key = `wheel:${reward.id}`;
  if (textures.has(key)) return textures.get(key);
  const c = canvas(256, 96), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 96);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = reward.label;
  ctx.font = `900 27px ${FONT}`;
  const size = fitFont(ctx, label, 232, 27, 900);
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 8;
  ctx.fillText(label, 128, 40);
  ctx.shadowBlur = 0;
  ctx.font = `800 11px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillText(reward.short, 128, 68);
  const t = tex(c);
  textures.set(key, t);
  return t;
}

export function makeGlowTexture() {
  const key = 'glow';
  if (textures.has(key)) return textures.get(key);
  const c = canvas(256, 256), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,.75)');
  g.addColorStop(0.55, 'rgba(255,255,255,.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = tex(c);
  textures.set(key, t);
  return t;
}

export function makeShadowTexture() {
  const key = 'shadow';
  if (textures.has(key)) return textures.get(key);
  const c = canvas(256, 256), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 126);
  g.addColorStop(0, 'rgba(0,0,0,.85)');
  g.addColorStop(0.45, 'rgba(0,0,0,.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = tex(c, false);
  textures.set(key, t);
  return t;
}

export function makeSparkTexture() {
  const key = 'spark';
  if (textures.has(key)) return textures.get(key);
  const c = canvas(64, 64), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = tex(c);
  textures.set(key, t);
  return t;
}

export function makeFoilTexture() {
  const key = 'foil';
  if (textures.has(key)) return textures.get(key);
  const c = canvas(256, 256), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, 'rgba(255,0,128,.0)');
  g.addColorStop(0.2, 'rgba(255,80,180,.35)');
  g.addColorStop(0.35, 'rgba(80,220,255,.38)');
  g.addColorStop(0.5, 'rgba(255,255,160,.3)');
  g.addColorStop(0.68, 'rgba(120,255,170,.32)');
  g.addColorStop(0.85, 'rgba(150,100,255,.3)');
  g.addColorStop(1, 'rgba(255,0,128,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = tex(c);
  textures.set(key, t);
  return t;
}

export function makeEnvTexture() {
  const key = 'env';
  if (textures.has(key)) return textures.get(key);
  const W = 1024, H = 512;
  const c = canvas(W, H), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1524');
  g.addColorStop(0.34, '#18283e');
  g.addColorStop(0.5, '#101a2a');
  g.addColorStop(0.62, '#070b12');
  g.addColorStop(1, '#020307');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // soft studio ceiling strips
  const strip = ctx.createLinearGradient(0, 48, 0, 178);
  strip.addColorStop(0, 'rgba(255,255,255,0)');
  strip.addColorStop(0.45, 'rgba(235,248,255,.92)');
  strip.addColorStop(0.55, 'rgba(190,235,255,.72)');
  strip.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = strip;
  ctx.fillRect(80, 42, 360, 150);
  ctx.fillRect(600, 62, 300, 130);

  const neon = (x, y, w, h, color) => {
    const gr = ctx.createLinearGradient(x, y, x + w, y);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.2, color);
    gr.addColorStop(0.8, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.globalAlpha = 0.8;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  };
  neon(20, 205, 260, 5, '#36e8ff');
  neon(480, 180, 260, 4, '#ff2f8e');
  neon(760, 225, 220, 3, '#ffbd4a');
  neon(180, 250, 160, 2, '#9c6bff');
  // floor light pools
  const floor = ctx.createLinearGradient(0, 280, 0, 420);
  floor.addColorStop(0, 'rgba(60,130,190,.25)');
  floor.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = floor; ctx.fillRect(0, 280, W, 180);

  // a few window glows
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,90,160,.34)' : 'rgba(70,210,255,.28)';
    const w = 8 + Math.random() * 26;
    ctx.fillRect(Math.random() * W, 190 + Math.random() * 120, w, 3);
  }

  const t = tex(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  textures.set(key, t);
  return t;
}

export function makeSignTexture(line1 = 'APEX//RIP', line2 = 'SHOWROOM') {
  const key = `sign:${line1}:${line2}`;
  if (textures.has(key)) return textures.get(key);
  const c = canvas(1024, 256), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 256);
  ctx.textAlign = 'center';
  ctx.font = `900 96px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(79,227,255,.65)'; ctx.shadowBlur = 30;
  ctx.fillText(line1, 512, 112);
  ctx.shadowBlur = 0;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillStyle = 'rgba(150,220,255,.6)';
  ctx.fillText(line2, 512, 172);
  ctx.strokeStyle = 'rgba(79,227,255,.35)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(272, 204); ctx.lineTo(752, 204); ctx.stroke();
  const t = tex(c);
  textures.set(key, t);
  return t;
}

export function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function preloadCard(car) { return makeCardTexture(car); }
export function preloadPack(pack) { return makePackTexture(pack); }
