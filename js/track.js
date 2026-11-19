import { TAU, clamp, mod, wrapAngle } from './utils.js';

// Fallback world bounds. Each Track also exposes `world`, which is derived
// from its own geometry so circuits of different sizes still have room for
// their run-off areas.
export const WORLD = { w: 2600, h: 1650 };

const SAMPLE_COUNT = 480;
const TRACK_WIDTH = 208;

const DEFAULT_HARMONICS = [
  [2, 0.118, 0.6, 0],
  [3, 0.062, -1.15, 0],
  [5, 0.03, 0.3, 1],
  [7, 0.018, 1.7, 0],
];

function chaikin(points, iterations = 1) {
  let out = points;
  for (let pass = 0; pass < iterations; pass++) {
    const next = [];
    const n = out.length;
    for (let i = 0; i < n; i++) {
      const a = out[i];
      const b = out[(i + 1) % n];
      next.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 }
      );
    }
    out = next;
  }
  return out;
}

export class Track {
  constructor(layout = {}) {
    this.layout = layout || {};
    this.width = this.layout.width || TRACK_WIDTH;
    this.N = this.layout.samples || SAMPLE_COUNT;
    this.build();
  }

  build() {
    const layout = this.layout;
    const cx = Number.isFinite(layout.cx) ? layout.cx : WORLD.w / 2;
    const cy = Number.isFinite(layout.cy) ? layout.cy : WORLD.h / 2;
    const raw = [];

    if (Array.isArray(layout.points) && layout.points.length >= 3) {
      // Builder circuits arrive as a closed list of cell centres. Chaikin
      // smoothing turns the blocky path into racing corners before the
      // regular resample pass.
      let points = layout.points.map((p) => ({ x: p.x, y: p.y }));
      if (layout.chaikin) points = chaikin(points, layout.chaikin);
      raw.push(...points);
    } else {
      // A closed loop built from a modulated ellipse: varied corner radii, no
      // self-intersections, and a natural rhythm of slow and fast bends.
      const rx = Number.isFinite(layout.rx) ? layout.rx : 880;
      const ry = Number.isFinite(layout.ry) ? layout.ry : 520;
      const harmonics = Array.isArray(layout.harmonics) ? layout.harmonics : DEFAULT_HARMONICS;
      const rawCount = layout.rawCount || 2400;
      for (let i = 0; i < rawCount; i++) {
        const th = (i / rawCount) * TAU;
        let r = 1;
        for (const [freq, amp, phase, cos] of harmonics) {
          r += amp * (cos ? Math.cos(freq * th + phase) : Math.sin(freq * th + phase));
        }
        raw.push({ x: cx + Math.cos(th) * rx * r, y: cy + Math.sin(th) * ry * r });
      }
    }

    let pts = this.resample(raw, this.N);
    const smoothPasses = Number.isFinite(layout.smoothPasses) ? layout.smoothPasses : 2;
    for (let pass = 0; pass < smoothPasses; pass++) pts = this.smooth(pts);

    const start = this.straightestIndex(pts, 46);
    this.points = pts.slice(start).concat(pts.slice(0, start));

    const N = this.N;
    const segLengths = [];
    for (let i = 0; i < N; i++) {
      const a = this.points[i];
      const b = this.points[(i + 1) % N];
      segLengths.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.ds = segLengths.reduce((sum, l) => sum + l, 0) / N;
    this.length = N * this.ds;

    this.tangents = [];
    this.normals = [];
    for (let i = 0; i < N; i++) {
      const a = this.points[(i - 1 + N) % N];
      const b = this.points[(i + 1) % N];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const tx = (b.x - a.x) / len;
      const ty = (b.y - a.y) / len;
      this.tangents.push({ x: tx, y: ty });
      this.normals.push({ x: -ty, y: tx });
    }

    let curvature = [];
    for (let i = 0; i < N; i++) {
      const a = this.tangents[(i - 1 + N) % N];
      const b = this.tangents[(i + 1) % N];
      curvature.push(wrapAngle(Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) / (2 * this.ds));
    }
    // Smooth curvature so the AI's speed target does not flicker.
    for (let pass = 0; pass < 3; pass++) {
      const next = new Array(N);
      for (let i = 0; i < N; i++) {
        next[i] =
          curvature[(i - 1 + N) % N] * 0.25 +
          curvature[i] * 0.5 +
          curvature[(i + 1) % N] * 0.25;
      }
      curvature = next;
    }
    this.curvature = curvature;

    const maxLat = layout.maxLat || 1750;
    const brakeDecel = 1500;
    const topSpeed = 600;
    const profile = curvature.map((k) =>
      clamp(Math.sqrt(maxLat / Math.max(Math.abs(k), 1e-4)), 170, topSpeed)
    );
    // Backwards braking-distance pass, repeated to close the loop.
    for (let pass = 0; pass < 4; pass++) {
      for (let i = N - 1; i >= 0; i--) {
        const nxt = profile[(i + 1) % N];
        profile[i] = Math.min(profile[i], Math.sqrt(nxt * nxt + 2 * brakeDecel * this.ds));
      }
    }
    this.speedProfile = profile;

    // Bounds for the minimap and camera framing.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    this.bounds = { minX, minY, maxX, maxY };
    this.world = {
      minX: minX - 900,
      minY: minY - 900,
      maxX: maxX + 900,
      maxY: maxY + 900,
    };

    this.startAngle = Math.atan2(this.tangents[0].y, this.tangents[0].x);
  }

  resample(points, count) {
    const segLengths = [];
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segLengths.push(len);
      total += len;
    }
    const step = total / count;
    const out = [];
    let seg = 0;
    let segStartDist = 0;
    for (let i = 0; i < count; i++) {
      const target = i * step;
      while (seg < segLengths.length - 1 && segStartDist + segLengths[seg] < target) {
        segStartDist += segLengths[seg];
        seg++;
      }
      const a = points[seg];
      const b = points[(seg + 1) % points.length];
      const t = segLengths[seg] > 1e-6 ? (target - segStartDist) / segLengths[seg] : 0;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    return out;
  }

  smooth(points) {
    const n = points.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = points[(i - 1 + n) % n];
      const b = points[i];
      const c = points[(i + 1) % n];
      out.push({
        x: b.x * 0.58 + (a.x + c.x) * 0.21,
        y: b.y * 0.58 + (a.y + c.y) * 0.21,
      });
    }
    return out;
  }

  straightestIndex(points, windowSize) {
    const n = points.length;
    const turns = [];
    for (let i = 0; i < n; i++) {
      const a = points[(i - 1 + n) % n];
      const b = points[(i + 1) % n];
      turns.push(Math.atan2(b.y - a.y, b.x - a.x));
    }
    const window = Math.max(8, Math.round(windowSize));
    let bestScore = Infinity;
    let bestIndex = 0;
    for (let i = 0; i < n; i++) {
      let score = 0;
      for (let k = -window / 2; k <= window / 2; k++) {
        const j = (i + k + n) % n;
        score += Math.abs(wrapAngle(turns[(j + 1) % n] - turns[j])) + Math.abs(wrapAngle(turns[j] - turns[(j - 1 + n) % n]));
      }
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  /**
   * Find the nearest centerline sample. Pass a previous index to search only a
   * local window; omit it for a full scan.
   */
  nearest(x, y, hint = null) {
    const N = this.N;
    let bestDist = Infinity;
    let bestIndex = 0;
    if (hint === null || hint === undefined) {
      for (let i = 0; i < N; i++) {
        const p = this.points[i];
        const dx = x - p.x;
        const dy = y - p.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      }
    } else {
      const span = 58;
      for (let k = -span; k <= span; k++) {
        const i = (hint + k + N * 2) % N;
        const p = this.points[i];
        const dx = x - p.x;
        const dy = y - p.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      }
    }
    const p = this.points[bestIndex];
    const n = this.normals[bestIndex];
    const offset = (x - p.x) * n.x + (y - p.y) * n.y;
    return { index: bestIndex, dist: Math.sqrt(bestDist), offset };
  }

  gridSlot(behindPx, lateralPx) {
    const index = mod(-Math.round(behindPx / this.ds), this.N);
    const p = this.points[index];
    const n = this.normals[index];
    const t = this.tangents[index];
    return {
      x: p.x + n.x * lateralPx,
      y: p.y + n.y * lateralPx,
      angle: Math.atan2(t.y, t.x),
      index,
      behind: behindPx,
    };
  }
}
