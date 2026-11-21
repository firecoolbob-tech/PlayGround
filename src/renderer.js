/* ═══════════════════════════════════════════════════════════════
   RC RUSH — pseudo-3D world renderer
   ═══════════════════════════════════════════════════════════════ */
import { DRAW_DISTANCE, interpolate } from './track.js';
import { mix, rgba, clamp } from './colors.js';
import { makeBackdrop } from './backdrop.js';
import { drawProp } from './props.js';
import { drawRCCar, drawOpponent } from './car.js';

const CAMERA_HEIGHT = 1320;
const FOG_FAR = DRAW_DISTANCE;

function project(p, cameraX, cameraY, cameraZ, depth, w, h, roadWidth) {
  // Track points only carry y/z; x is supplied per segment via cameraX.
  p.camera.x = (p.world.x || 0) - cameraX;
  p.camera.y = p.world.y - cameraY;
  p.camera.z = p.world.z - cameraZ;
  const scale = depth / p.camera.z;
  p.screen.scale = scale;
  p.screen.x = w * 0.5 + scale * p.camera.x * w * 0.5;
  p.screen.y = h * 0.5 - scale * p.camera.y * h * 0.5;
  p.screen.w = scale * roadWidth * w * 0.5;
}

function quad(ctx, x1, y1, x2, y2, x3, y3, x4, y4, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.w = 0; this.h = 0; this.dpr = 1;
    this.track = null;
    this.location = null;
    this.layers = [];
    this.bgScroll = 0;
    this.colorCache = new Map();
    this.bgCache = new Map();
    this.particles = [];
    this.particleKind = null;
    this.smoke = [];
    this.smokeTimer = 0;
    this.stars = [];
    this.clouds = [];
    this.speedLines = [];
    this.wet = 0;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    // Cap the backing-store scale: 2x on small phones costs 4x the pixels for
    // little visible gain in a fast-moving pseudo-3D scene.
    const cap = w < 700 ? 1.5 : 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, cap);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.particles = [];
    this.bgCache.clear();
  }

  setTrack(track, location) {
    this.track = track;
    this.padMap = new Map(track.boostPads.map(p => [p.index, p]));
    this.bgScroll = 0;
    this.particles = [];
    this.smoke = [];
    this.colorCache.clear();
    if (location !== this.location) {
      this.location = location;
      this.layers = [makeBackdrop(location, 0), makeBackdrop(location, 1)];
      this.bgCache.clear();
      this._makeDecor();
    }
  }

  _makeDecor() {
    const rnd = () => Math.random();
    this.stars = Array.from({ length: 90 }, () => ({
      x: rnd(), y: rnd() * 0.44, r: 0.5 + rnd() * 1.5, ph: rnd() * Math.PI * 2
    }));
    this.clouds = Array.from({ length: 9 }, () => ({
      x: rnd(), y: 0.09 + rnd() * 0.3, s: 0.5 + rnd() * 1.2, sp: 0.003 + rnd() * 0.006, a: 0.12 + rnd() * 0.2
    }));
    this.speedLines = Array.from({ length: 34 }, () => ({
      a: rnd() * Math.PI * 2, r: 0.18 + rnd() * 0.45, len: 0.05 + rnd() * 0.14, ph: rnd() * Math.PI * 2
    }));
  }

  mixCached(color, target, t) {
    const q = Math.round(clamp(t, 0, 1) * 24) / 24;
    const key = color + target + q;
    let v = this.colorCache.get(key);
    if (v === undefined) {
      v = mix(color, target, q);
      if (this.colorCache.size > 4000) this.colorCache.clear();
      this.colorCache.set(key, v);
    }
    return v;
  }

  render(race, dt, now) {
    const rect = this.canvas.getBoundingClientRect();
    if (Math.abs(rect.width - this.w) > 0.5 || Math.abs(rect.height - this.h) > 0.5) this.resize();
    if (this.track !== race.track) this.setTrack(race.track, race.location);

    const ctx = this.ctx;
    const w = this.w, h = this.h;
    const loc = this.location;
    const wp = race.weather.params();
    const ratio = race.speedRatio || 0;

    ctx.save();
    ctx.fillStyle = loc.ground || '#24351f';
    ctx.fillRect(0, 0, w, h);

    // Top-down view: keep the road centered on the player and rotate it into
    // the direction of travel. The existing segment/AI distances remain the
    // source of truth, so the race simulation is unchanged.
    const path = race.track.minimap;
    const progress = ((race.trackPos / race.track.length) * (path.length - 1));
    const i = Math.floor(progress);
    const t = progress - i;
    const p1 = path[i % path.length];
    const p2 = path[(i + 1) % path.length];
    const px = mix(p1.x, p2.x, t);
    const py = mix(p1.y, p2.y, t);

    const cx = w * 0.5;
    const cy = h * 0.56;
    const scale = Math.min(w, h) * 1.16;

    let heading = 0;
    if (i + 2 < path.length) {
      const ahead = path[Math.min(path.length - 1, i + 2)];
      heading = Math.atan2(ahead.y - p1.y, ahead.x - p1.x);
    }

    ctx.translate(cx, cy);
    ctx.rotate(-heading + Math.PI / 2);
    ctx.translate(-px * scale, -py * scale);

    // scenery grid
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    const grid = 54;
    const left = px * scale - w * 1.5;
    const top = py * scale - h * 1.5;
    ctx.beginPath();
    for (let gx = -((left % grid)); gx < w * 3; gx += grid) {
      ctx.moveTo(gx + left - w, top - h); ctx.lineTo(gx + left - w, top + h * 3);
    }
    for (let gy = -((top % grid)); gy < h * 3; gy += grid) {
      ctx.moveTo(left - w, gy + top - h); ctx.lineTo(left + w * 3, gy + top - h);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // road
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((p, n) => {
      const x = p.x * scale, y = p.y * scale;
      if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#252a31';
    ctx.lineWidth = Math.max(34, scale * 0.11);
    ctx.stroke();
    ctx.strokeStyle = '#4a5058';
    ctx.lineWidth = Math.max(24, scale * 0.075);
    ctx.stroke();

    // edge lines and lane markings
    ctx.setLineDash([scale * 0.018, scale * 0.018]);
    ctx.lineDashOffset = -(race.trackPos / race.track.segmentLength) * scale * 0.018;
    ctx.strokeStyle = 'rgba(255,255,255,.72)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // opponents
    for (const ai of race.ai) {
      const ap = (ai.distance % race.track.length) / race.track.length;
      const aiIndex = ap * (path.length - 1);
      const aiI = Math.floor(aiIndex);
      const aiT = aiIndex - aiI;
      const a1 = path[aiI % path.length];
      const a2 = path[(aiI + 1) % path.length];
      const ax = mix(a1.x, a2.x, aiT) * scale;
      const ay = mix(a1.y, a2.y, aiT) * scale;
      drawOpponent(ctx, ax, ay, Math.max(18, scale * 0.035), ai, 0, now);
    }

    // player at center after the track transform
    ctx.restore();

    const steer = race.input ? race.input.steer : 0;
    const carW = clamp(Math.min(w * 0.16, h * 0.18), 38, 76);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(steer * 0.12);
    this._drawPlayer(race, 0, 0, carW, steer * 0.075, now);
    ctx.restore();

    // Weather tint and speed effects remain lightweight in top-down mode.
    ctx.fillStyle = rgba(wp.tint, wp.tintAlpha * 0.28);
    ctx.fillRect(0, 0, w, h);
    this._drawVignette(race, ratio);
  }

  _drawSky(race, wp, now, horizon, fogColor) {
    const ctx = this.ctx, w = this.w, h = this.h, loc = this.location;
    let top = mix(loc.sky.top, '#05070c', wp.skyDim * 0.55);
    let mid = mix(loc.sky.mid, '#05070c', wp.skyDim * 0.42);
    let bot = mix(loc.sky.bottom, '#0a0d16', wp.skyDim * 0.32);
    top = mix(top, wp.tint, wp.tintAlpha * 0.55);
    mid = mix(mid, wp.tint, wp.tintAlpha * 0.45);
    bot = mix(bot, wp.tint, wp.tintAlpha * 0.38);

    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 2);
    sky.addColorStop(0, top);
    sky.addColorStop(0.52, mid);
    sky.addColorStop(1, bot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 3);

    // stars
    if (loc.stars) {
      const a = (1 - wp.skyDim * 0.75) * (0.45 + 0.35 * (1 - wp.tintAlpha * 3));
      for (const s of this.stars) {
        const tw = 0.55 + Math.sin(now * 1.4 + s.ph) * 0.45;
        ctx.globalAlpha = clamp(a * tw, 0, 1);
        ctx.fillStyle = '#eaf6ff';
        ctx.fillRect(s.x * w, s.y * horizon, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }

    // sun / moon
    const sx = loc.sun.x * w;
    const sy = horizon * (0.16 + loc.sun.y * 0.9);
    const sr = loc.sun.size * h;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 5.5);
    glow.addColorStop(0, rgba(loc.sun.color, 0.5 * (1 - wp.skyDim * 0.6)));
    glow.addColorStop(0.25, rgba(loc.sun.color, 0.16 * (1 - wp.skyDim * 0.6)));
    glow.addColorStop(1, rgba(loc.sun.color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(sx - sr * 6, sy - sr * 6, sr * 12, sr * 12);
    ctx.globalAlpha = 1 - wp.skyDim * 0.65;
    ctx.fillStyle = loc.sun.color;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    if (loc.sun.type === 'moon') {
      ctx.fillStyle = 'rgba(80,100,130,.16)';
      ctx.beginPath(); ctx.arc(sx - sr * 0.3, sy - sr * 0.2, sr * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + sr * 0.32, sy + sr * 0.24, sr * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + sr * 0.1, sy - sr * 0.42, sr * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // clouds
    if (loc.backdrop !== 'space') {
      const cloudColor = mix(loc.fog, wp.tint, 0.3);
      const stormy = wp.id === 'storm' || wp.id === 'rain';
      for (const c of this.clouds) {
        const cx = ((c.x + now * c.sp) % 1.25 - 0.12) * w;
        const cy = c.y * horizon;
        const cs = c.s * h * 0.05;
        ctx.fillStyle = rgba(cloudColor, c.a * (stormy ? 1.4 : 0.75));
        ctx.beginPath();
        ctx.ellipse(cx, cy, cs * 2.1, cs * 0.55, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + cs * 0.9, cy - cs * 0.25, cs * 1.2, cs * 0.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - cs * 0.9, cy + cs * 0.05, cs * 1.3, cs * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // horizon glow
    const hg = ctx.createLinearGradient(0, horizon - h * 0.09, 0, horizon + h * 0.04);
    hg.addColorStop(0, rgba(loc.accent, 0));
    hg.addColorStop(0.55, rgba(loc.accent, 0.1));
    hg.addColorStop(1, rgba(fogColor, 0.28));
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - h * 0.09, w, h * 0.13);
  }

  _drawBackdrop(race, horizon) {
    const ctx = this.ctx, w = this.w, h = this.h;
    for (let i = 0; i < this.layers.length; i++) {
      const img = this.layers[i];
      if (!img) continue;
      const layerH = h * (i === 0 ? 0.44 : 0.55);
      const lw = 2400 * (layerH / 620);
      const factor = i === 0 ? 0.28 : 0.58;
      const off = ((this.bgScroll * factor) % lw + lw) % lw;
      const y = horizon - layerH + h * 0.025;
      // Downscale each huge source layer once per viewport instead of
      // resampling a 2400px canvas several times every frame.
      const key = `${i}:${Math.round(lw)}:${Math.round(layerH)}`;
      let layer = this.bgCache.get(key);
      if (!layer) {
        layer = document.createElement('canvas');
        layer.width = Math.max(1, Math.round(lw * this.dpr));
        layer.height = Math.max(1, Math.round(layerH * this.dpr));
        const lctx = layer.getContext('2d');
        lctx.imageSmoothingEnabled = true;
        lctx.drawImage(img, 0, 0, layer.width, layer.height);
        this.bgCache.set(key, layer);
      }
      ctx.globalAlpha = i === 0 ? 0.9 : 1;
      for (let x = -off - lw; x < w + lw; x += lw) {
        ctx.drawImage(layer, x, y, lw, layerH);
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawGround(horizon, fogColor) {
    const ctx = this.ctx, w = this.w, h = this.h, loc = this.location;
    const g = ctx.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, mix(loc.ground[0], fogColor, 0.55));
    g.addColorStop(0.25, mix(loc.ground[0], fogColor, 0.28));
    g.addColorStop(1, mix(loc.ground[0], '#05070c', 0.24));
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, w, h - horizon + 2);
  }

  _drawRoad(race, wp, now, depth, playerY, fogColor, horizon) {
    const ctx = this.ctx, w = this.w, h = this.h, loc = this.location;
    const track = race.track;
    const segs = track.segments;
    const N = track.total;
    const len = track.length;
    const segLen = track.segmentLength;
    const pos = race.trackPos;
    const baseIndex = Math.floor(pos / segLen) % N;
    const basePct = (pos % segLen) / segLen;
    const base = segs[baseIndex];
    const playerX = race.playerX;

    let x = 0;
    let dx = -(base.curve * basePct);
    let maxy = h;
    const projected = new Map();
    const sprites = [];
    const drawDist = Math.min(FOG_FAR, N - 1);
    const fogBase = wp.fog * 2.9;

    for (let n = 0; n < drawDist; n++) {
      const seg = segs[(baseIndex + n) % N];
      const looped = seg.index < baseIndex;
      const camZ = pos - (looped ? len : 0);
      project(seg.p1, playerX * track.roadWidth - x, playerY + CAMERA_HEIGHT, camZ, depth, w, h, track.roadWidth);
      project(seg.p2, playerX * track.roadWidth - x - dx, playerY + CAMERA_HEIGHT, camZ, depth, w, h, track.roadWidth);
      x += dx;
      dx += seg.curve;

      if (seg.p1.camera.z <= depth || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;

      const fog = 1 - Math.exp(-Math.pow(n / drawDist, 2.15) * fogBase);
      this._drawSegment(seg, fog, fogColor, now);
      const p1 = { x: seg.p1.screen.x, y: seg.p1.screen.y, w: seg.p1.screen.w, scale: seg.p1.screen.scale };
      const p2 = { x: seg.p2.screen.x, y: seg.p2.screen.y, w: seg.p2.screen.w };
      projected.set(seg.index, { p1, p2, n, fog });

      if (seg.props.length) {
        const unit = seg.p1.screen.scale * h * 0.5;
        for (const prop of seg.props) {
          // Props that are almost on top of the camera balloon to several
          // screens tall and swallow the road. Cull them instead.
          const propPx = unit * 2000 * prop.size;
          const roadPx = seg.p1.screen.w;
          if (propPx > h * 2.2 || seg.p1.screen.y > h + 60) continue;
          // Big roadside props right next to the camera can span the road.
          if (Math.abs(prop.offset) < 2.05 && propPx > roadPx * 1.35) continue;
          sprites.push({
            n, kind: 'prop', prop, fog,
            x: seg.p1.screen.x + prop.offset * seg.p1.screen.w,
            y: seg.p1.screen.y,
            unit,
            roadPx: seg.p1.screen.w
          });
        }
      }

      maxy = seg.p2.screen.y;
    }
    return { projected, sprites };
  }

  _drawSegment(seg, fog, fogColor, now) {
    const ctx = this.ctx, w = this.w;
    const loc = this.location;
    const p1 = seg.p1.screen, p2 = seg.p2.screen;
    const y1 = p1.y, y2 = p2.y;
    if (y1 <= y2) return;
    const x1 = p1.x, x2 = p2.x;
    const w1 = p1.w, w2 = p2.w;
    const band = Math.floor(seg.index / 4) % 2;
    const roadBand = Math.floor(seg.index / 3) % 2;
    const rumbleBand = Math.floor(seg.index / 3) % 2;
    const ground = this.mixCached(loc.ground[band], fogColor, fog);
    const road = this.mixCached(loc.road[roadBand], fogColor, fog);
    const rumble = this.mixCached(loc.rumble[rumbleBand], fogColor, fog);
    const lane = this.mixCached(loc.lane, fogColor, fog);

    ctx.fillStyle = ground;
    ctx.fillRect(0, y2, w, y1 - y2 + 1);

    // rumble strips
    quad(ctx, x1 - w1, y1, x1 - w1 * 0.82, y1, x2 - w2 * 0.82, y2, x2 - w2, y2, rumble);
    quad(ctx, x1 + w1 * 0.82, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 * 0.82, y2, rumble);

    // road
    quad(ctx, x1 - w1 * 0.82, y1, x1 + w1 * 0.82, y1, x2 + w2 * 0.82, y2, x2 - w2 * 0.82, y2, road);

    // wet sheen
    if (this.wet > 0.1 || seg.wet) {
      const alpha = this.wet > 0.1 ? 0.07 + Math.sin(seg.index * 1.7) * 0.025 : 0.11;
      quad(ctx, x1 - w1 * 0.82, y1, x1 + w1 * 0.82, y1, x2 + w2 * 0.82, y2, x2 - w2 * 0.82, y2, rgba(loc.sky.bottom, alpha));
      if (seg.wet) {
        ctx.fillStyle = rgba(loc.sky.bottom, 0.16);
        ctx.beginPath();
        ctx.ellipse(x1 + (seg.wetSeed - 0.5) * w1 * 0.7, (y1 + y2) / 2, w1 * (0.14 + seg.wetSeed * 0.12), Math.max(1, (y1 - y2) * 0.24), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // edge lines
    const edge = rgba(lane, 0.55);
    quad(ctx, x1 - w1 * 0.82, y1, x1 - w1 * 0.79, y1, x2 - w2 * 0.79, y2, x2 - w2 * 0.82, y2, edge);
    quad(ctx, x1 + w1 * 0.79, y1, x1 + w1 * 0.82, y1, x2 + w2 * 0.82, y2, x2 + w2 * 0.79, y2, edge);

    // centre dash
    if (Math.floor(seg.index / 4) % 2 === 0 && !['sand', 'dirt', 'mud'].includes(loc.surface)) {
      quad(ctx, x1 - w1 * 0.018, y1, x1 + w1 * 0.018, y1, x2 + w2 * 0.018, y2, x2 - w2 * 0.018, y2, rgba(lane, 0.6));
    }

    // start / finish checker
    if (seg.finish) {
      const cols = 10, rows = 2;
      for (let r = 0; r < rows; r++) {
        const t0 = r / rows, t1 = (r + 1) / rows;
        const ya = y1 + (y2 - y1) * t0, yb = y1 + (y2 - y1) * t1;
        const wa = w1 + (w2 - w1) * t0, wb = w1 + (w2 - w1) * t1;
        const xa = x1 + (x2 - x1) * t0, xb = x1 + (x2 - x1) * t1;
        for (let c = 0; c < cols; c++) {
          const c0 = c / cols, c1 = (c + 1) / cols;
          const fill = (c + r) % 2 ? 'rgba(248,250,255,.92)' : 'rgba(12,16,24,.92)';
          quad(ctx,
            xa - wa * 0.82 + wa * 1.64 * c0, ya,
            xa - wa * 0.82 + wa * 1.64 * c1, ya,
            xb - wb * 0.82 + wb * 1.64 * c1, yb,
            xb - wb * 0.82 + wb * 1.64 * c0, yb,
            fill);
        }
      }
    }

    // boost pad
    const pad = this.padMap && this.padMap.get(seg.index);
    if (pad) this._drawPad(pad, p1, now);
  }

  _drawPad(pad, p1, now) {
    const ctx = this.ctx;
    const cx = p1.x + pad.x * p1.w;
    const cy = p1.y;
    const s = p1.w * 0.16;
    const pulse = 0.7 + Math.sin(now * 5 + pad.phase) * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = pad.cooldown > 0 ? 0.15 : 0.9 * pulse;
    ctx.strokeStyle = this.location.accent2;
    ctx.lineWidth = Math.max(1.2, s * 0.22);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const yy = -i * s * 0.55;
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, yy + s * 0.4);
      ctx.lineTo(0, yy);
      ctx.lineTo(s * 0.55, yy + s * 0.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.28 * pulse;
    ctx.fillStyle = this.location.accent2;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.3, s * 1.2, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawPlayer(race, x, y, width, rot, now) {
    const ctx = this.ctx;
    const bounce = Math.sin(now * 19) * race.speedRatio * 1.8 + (race.offroad ? Math.sin(now * 51) * 2.4 : 0);
    drawRCCar(ctx, x, y + bounce, width, race.car, {
      rot,
      boost: race.boosting ? 1 : 0,
      brake: race.input && race.input.brake,
      now,
      steer: race.input ? race.input.steer : 0,
      drift: race.drifting ? 1 : 0
    });
  }

  _updateSmoke(race, dt, carX, carBase, carW, now) {
    if (race.state === 'racing' && (race.drifting || race.offroad || race.boosting)) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.028;
        const color = race.boosting ? '#ffb03a' : race.offroad ? this.location.ground[1] : '#dbe9f5';
        const count = race.boosting ? 2 : 1;
        for (let i = 0; i < count; i++) {
          this.smoke.push({
            x: carX + (Math.random() * 2 - 1) * carW * 0.42,
            y: carBase - Math.random() * 10,
            vx: (Math.random() * 2 - 1) * 60 - (race.input ? race.input.steer : 0) * 90,
            vy: -18 - Math.random() * 42,
            life: 0.55 + Math.random() * 0.35,
            max: 0.9,
            size: carW * (0.05 + Math.random() * 0.07),
            color
          });
        }
      }
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;
      p.size += dt * 50;
      if (p.life <= 0) this.smoke.splice(i, 1);
    }
  }

  _drawSmoke() {
    const ctx = this.ctx;
    for (const p of this.smoke) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.32;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _updateParticles(race, dt, wp, ratio, now) {
    const w = this.w, h = this.h;
    const kind = wp.kind;
    const target = Math.min(340, Math.round(wp.particles * (w < 720 ? 0.7 : 1)));
    if (kind !== this.particleKind) {
      this.particleKind = kind;
      this.particles = [];
    }
    if (!kind || target <= 0) { this.particles.length = 0; return; }
    while (this.particles.length < target) {
      this.particles.push(this._newParticle(kind, w, h, true));
    }
    if (this.particles.length > target) this.particles.length = target;

    for (const p of this.particles) {
      if (kind === 'rain') {
        p.y += (760 + ratio * 950) * dt;
        p.x += wp.wind * dt * 0.85;
        if (p.y > h + 30) { p.y = -30 - Math.random() * h * 0.2; p.x = Math.random() * (w + 100); }
        if (p.x < -80) p.x = w + 60;
      } else if (kind === 'snow') {
        p.y += (45 + ratio * 95) * dt;
        p.x += Math.sin(now * 1.6 + p.ph) * 22 * dt + wp.wind * dt * 0.15;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
      } else if (kind === 'ash') {
        p.y += (35 + ratio * 55) * dt;
        p.x += Math.sin(now * 1.2 + p.ph) * 14 * dt + wp.wind * dt * 0.25;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
      } else if (kind === 'dust') {
        p.x += (wp.wind * 1.9 - 40 - ratio * 220) * dt;
        p.y += Math.sin(now * 2 + p.ph) * 12 * dt;
        if (p.x < -60) { p.x = w + Math.random() * w * 0.5; p.y = Math.random() * h; }
      } else if (kind === 'solar') {
        p.y -= (16 + ratio * 26) * dt;
        p.x += wp.wind * dt * 0.4;
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
      }
    }
  }

  _newParticle(kind, w, h, anywhere) {
    const p = {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -20,
      ph: Math.random() * Math.PI * 2,
      len: 10 + Math.random() * 20,
      size: 0.8 + Math.random() * 2.2,
      alpha: 0.3 + Math.random() * 0.5
    };
    if (kind === 'dust') { p.x = Math.random() * w; p.y = Math.random() * h; p.len = 18 + Math.random() * 52; }
    return p;
  }

  _drawParticles(wp, now) {
    const ctx = this.ctx, w = this.w, h = this.h;
    const kind = this.particleKind;
    if (!kind || !this.particles.length) return;

    if (kind === 'rain') {
      ctx.strokeStyle = 'rgba(196,228,255,.34)';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      for (const p of this.particles) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + wp.wind * 0.02, p.y + p.len);
      }
      ctx.stroke();
    } else if (kind === 'snow') {
      ctx.fillStyle = 'rgba(245,252,255,.78)';
      ctx.beginPath();
      for (const p of this.particles) {
        ctx.moveTo(p.x + p.size, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (kind === 'ash') {
      ctx.fillStyle = 'rgba(205,190,180,.6)';
      ctx.beginPath();
      for (const p of this.particles) {
        ctx.moveTo(p.x + p.size * 0.8, p.y);
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (kind === 'dust') {
      ctx.strokeStyle = 'rgba(238,196,140,.3)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const p of this.particles) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y - 1.5);
      }
      ctx.stroke();
    } else if (kind === 'solar') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        const r = p.size * (1.3 + Math.sin(now * 2 + p.ph) * 0.4);
        ctx.fillStyle = `rgba(180,130,255,${0.22 * p.alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(220,240,255,${p.alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawFog(wp, horizon, fogColor) {
    const ctx = this.ctx, w = this.w, h = this.h;
    const strength = clamp((wp.fog - 0.5) / 1.6, 0, 1);
    const grad = ctx.createLinearGradient(0, horizon - h * 0.14, 0, h);
    grad.addColorStop(0, rgba(fogColor, 0));
    grad.addColorStop(0.25, rgba(fogColor, 0.03 + strength * 0.11));
    grad.addColorStop(0.62, rgba(fogColor, 0.02 + strength * 0.06));
    grad.addColorStop(1, rgba(fogColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizon - h * 0.14, w, h);
    if (wp.tintAlpha > 0.01) {
      ctx.fillStyle = rgba(wp.tint, wp.tintAlpha * 0.42);
      ctx.fillRect(0, 0, w, h);
    }
  }

  _drawLightning(race, wp) {
    const flash = race.weather.flash;
    if (flash <= 0.01) return;
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.fillStyle = `rgba(225,240,255,${flash * 0.34})`;
    ctx.fillRect(0, 0, w, h);
    if (flash > 0.5) {
      ctx.strokeStyle = `rgba(240,250,255,${(flash - 0.5) * 1.3})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let x = w * 0.66, y = h * 0.08;
      ctx.moveTo(x, y);
      for (let i = 0; i < 5; i++) {
        x += (Math.random() * 2 - 1) * w * 0.035;
        y += h * 0.06;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  _drawSpeedLines(ratio, boosting, now) {
    const intensity = clamp((ratio - 0.72) / 0.3, 0, 1) * 0.55 + (boosting ? 0.55 : 0);
    if (intensity <= 0.01) return;
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.54);
    ctx.strokeStyle = `rgba(220,245,255,${0.16 * intensity})`;
    ctx.lineWidth = 1.3;
    for (const l of this.speedLines) {
      const pulse = 0.7 + Math.sin(now * 8 + l.ph) * 0.3;
      const r = (l.r + (now * 0.35 + l.ph * 0.1) % 0.5) * Math.max(w, h);
      const len = l.len * Math.max(w, h) * pulse;
      ctx.save();
      ctx.rotate(l.a);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(r + len, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawVignette(race, ratio) {
    const ctx = this.ctx, w = this.w, h = this.h;
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.76);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.72, 'rgba(0,0,0,.18)');
    vig.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (race.boosting) {
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.55, Math.min(w, h) * 0.25, w * 0.5, h * 0.55, Math.max(w, h) * 0.7);
      glow.addColorStop(0, 'rgba(255,120,30,0)');
      glow.addColorStop(1, 'rgba(255,100,20,.16)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

/* ── minimap ─────────────────────────────────────────────────── */
export function drawMinimap(canvas, track, race, location) {
  const ctx = canvas.getContext('2d');
  const S = canvas.width;
  const pad = S * 0.13;
  ctx.clearRect(0, 0, S, S);
  const pts = track.minimap.map(p => ({ x: pad + p.x * (S - pad * 2), y: pad + p.y * (S - pad * 2) }));

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // outline
  ctx.strokeStyle = 'rgba(4,8,14,.85)';
  ctx.lineWidth = S * 0.105;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  // track
  const grad = ctx.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, location.accent2);
  grad.addColorStop(1, location.accent);
  ctx.strokeStyle = grad;
  ctx.lineWidth = S * 0.045;
  ctx.globalAlpha = 0.9;
  ctx.stroke();

  // centre line
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = S * 0.012;
  ctx.setLineDash([S * 0.02, S * 0.02]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // start marker
  ctx.fillStyle = '#f2f6ff';
  ctx.fillRect(pts[0].x - S * 0.018, pts[0].y - S * 0.018, S * 0.036, S * 0.036);
  ctx.fillStyle = location.accent;
  ctx.fillRect(pts[0].x - S * 0.018, pts[0].y - S * 0.018, S * 0.018, S * 0.018);

  const dotAt = (frac, color, radius, glow) => {
    const i = clamp(Math.round(frac * (pts.length - 1)), 0, pts.length - 1);
    const p = pts[i];
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = S * 0.05;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  for (const ai of race.ai) {
    dotAt((ai.distance % track.length) / track.length, ai.color, S * 0.024, false);
  }
  dotAt((race.trackPos % track.length) / track.length, '#ffffff', S * 0.032, true);
  ctx.strokeStyle = location.accent;
  ctx.lineWidth = S * 0.014;
  const pi = clamp(Math.round(((race.trackPos % track.length) / track.length) * (pts.length - 1)), 0, pts.length - 1);
  ctx.beginPath();
  ctx.arc(pts[pi].x, pts[pi].y, S * 0.034, 0, Math.PI * 2);
  ctx.stroke();
}
