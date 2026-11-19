import { clamp, mod } from './utils.js';

/* ------------------------------------------------------------------ */
/* Modular track features                                              */
/* ------------------------------------------------------------------ */

// Grounded pieces that modify the road profile, plus the covered garage and
// the split chicane barrier. Every feature is baked into per-sample height,
// bank and barrier tables so the 120 Hz physics loop only does array lookups.
export const FEATURE_TYPES = ['bank', 'dip', 'bridge', 'garage', 'chicane'];

export const FEATURE_INFO = {
  bank: { label: 'Banked curve', short: 'BANK', samples: 30, height: 0, color: '#6ee7ff' },
  dip: { label: 'Dip & climb', short: 'DIP', samples: 36, height: 22, color: '#8fa6ff' },
  bridge: { label: 'Bridge', short: 'BRIDGE', samples: 40, height: 34, color: '#ffcf6b' },
  garage: { label: 'Drive-through', short: 'GARAGE', samples: 28, height: 108, color: '#b6ff9a' },
  chicane: { label: 'Chicane', short: 'CHICANE', samples: 26, height: 0, color: '#ff8fa8' },
};

// The dip is built as a trough between two low crests rather than digging
// under the world plane. Roads can therefore never vanish beneath the terrain,
// and the profile is still a readable climb-dip-climb sequence.
const DIP_RISE = 24;
const DIP_FLOOR = 3;
const BRIDGE_HEIGHT = 34;
const BANK_AMOUNT = 12;
const GARAGE_HEIGHT = 108;

const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function featureSamples(type) {
  return (FEATURE_INFO[type] || FEATURE_INFO.bank).samples;
}

export class TrackFeatures {
  constructor(track, defs = []) {
    this.track = track;
    this.N = track.N;
    this.ds = track.ds;
    this.heights = new Float32Array(this.N);
    this.banks = new Float32Array(this.N);
    this.slopes = new Float32Array(this.N);
    this.list = [];
    this.barriers = [];
    this.garages = [];
    this._occupied = new Uint8Array(this.N);

    for (const def of defs) {
      if (!def || !FEATURE_TYPES.includes(def.type)) continue;
      const feature = this.prepare(def);
      if (!feature) continue;
      if (this.overlaps(feature.start, feature.length)) continue;
      this.occupy(feature.start, feature.length);
      this.list.push(feature);
    }
    this.buildProfiles();
    this.buildBarriers();
  }

  prepare(def) {
    const type = def.type;
    const fallback = featureSamples(type);
    const length = clamp(Math.round(def.samples || def.length || fallback), 14, 72);
    const index = mod(Math.round(def.index || 0), this.N);
    const start = mod(index - Math.floor(length / 2), this.N);
    const p = this.track.points[index];
    const t = this.track.tangents[index];
    const rotation = mod(Math.round(def.rotation || 0), 4);
    const side = rotation % 2 === 0 ? 1 : -1;
    return {
      type,
      index,
      start,
      length,
      rotation,
      side,
      x: p.x,
      z: p.y,
      tx: t.x,
      ty: t.y,
      yaw: -Math.atan2(t.y, t.x),
      lengthPx: length * this.ds,
      widthPx: this.track.width,
      heightPx: type === 'bridge' ? BRIDGE_HEIGHT : type === 'garage' ? GARAGE_HEIGHT : 0,
    };
  }

  overlaps(start, length) {
    for (let k = -2; k < length + 2; k++) {
      if (this._occupied[mod(start + k, this.N)]) return true;
    }
    return false;
  }

  occupy(start, length) {
    for (let k = 0; k < length; k++) {
      this._occupied[mod(start + k, this.N)] = 1;
    }
  }

  buildProfiles() {
    const N = this.N;
    for (const f of this.list) {
      const count = f.length;
      if (f.type === 'dip') {
        for (let k = 0; k < count; k++) {
          const p = (k + 0.5) / count;
          const entry = smoothstep(0, 0.2, p) * smoothstep(0, 0.2, 1 - p);
          const bowl = Math.sin(Math.PI * p) ** 2;
          this.heights[mod(f.start + k, N)] +=
            entry * (DIP_RISE - (DIP_RISE - DIP_FLOOR) * bowl);
        }
      } else if (f.type === 'bridge') {
        for (let k = 0; k < count; k++) {
          const p = (k + 0.5) / count;
          const climb = smoothstep(0, 0.18, p) * smoothstep(0, 0.18, 1 - p);
          this.heights[mod(f.start + k, N)] += BRIDGE_HEIGHT * climb;
        }
      } else if (f.type === 'bank') {
        for (let k = 0; k < count; k++) {
          const p = (k + 0.5) / count;
          const ramp = smoothstep(0, 0.24, p) * smoothstep(0, 0.24, 1 - p);
          const bank = f.side * BANK_AMOUNT * ramp;
          // Lift by the bank amount so the inside edge stays on the ground
          // instead of sinking under the terrain plane.
          this.banks[mod(f.start + k, N)] += bank;
          this.heights[mod(f.start + k, N)] += Math.abs(bank);
        }
      }
    }

    for (let i = 0; i < N; i++) {
      const prev = this.heights[mod(i - 1, N)];
      const next = this.heights[mod(i + 1, N)];
      this.slopes[i] = Math.atan2(next - prev, this.ds * 2);
    }
  }

  buildBarriers() {
    const W = this.track.width;
    for (const f of this.list) {
      if (f.type !== 'chicane') continue;
      const halfWall = W * 0.3;
      const direction = f.rotation % 2 === 0 ? 1 : -1;
      for (let k = -1; k <= 1; k++) {
        const idx = mod(f.index + k * Math.round(f.length / 3.4), this.N);
        const p = this.track.points[idx];
        const n = this.track.normals[idx];
        const t = this.track.tangents[idx];
        const side = (k % 2 === 0 ? 1 : -1) * direction;
        const lateral = side * (W / 2 - halfWall + 2);
        this.barriers.push({
          x: p.x + n.x * lateral,
          z: p.y + n.y * lateral,
          tx: t.x,
          ty: t.y,
          yaw: -Math.atan2(t.y, t.x),
          halfLen: Math.max(8, f.lengthPx * 0.08),
          halfWidth: halfWall,
          side,
          index: idx,
        });
      }
    }
    this.garages = this.list.filter((f) => f.type === 'garage');
  }

  heightAtIndex(index) {
    return this.heights[mod(Math.round(index), this.N)];
  }

  bankAtIndex(index) {
    return this.banks[mod(Math.round(index), this.N)];
  }

  slopeAtIndex(index) {
    return this.slopes[mod(Math.round(index), this.N)];
  }

  groundHeight(index, offset = 0, width = this.track.width) {
    const bank = this.bankAtIndex(index);
    const lateral = clamp(offset / Math.max(1, width / 2), -1, 1);
    return this.heightAtIndex(index) + bank * lateral;
  }

  gripBonus(index) {
    return 1 + Math.min(0.18, Math.abs(this.bankAtIndex(index)) * 0.012);
  }

  featureAt(index) {
    const i = mod(Math.round(index), this.N);
    for (const f of this.list) {
      const offset = mod(i - f.start, this.N);
      if (offset < f.length) return { feature: f, progress: offset / f.length };
    }
    return null;
  }

  garageAt(index, offset) {
    const i = mod(Math.round(index), this.N);
    for (const f of this.garages) {
      const within = mod(i - f.start, this.N);
      if (within < f.length && Math.abs(offset) < this.track.width * 0.54) return f;
    }
    return null;
  }

  /**
   * Barriers are solid below deck height. The push-out uses the same 120 Hz
   * step as the rest of the physics, so there is no tunnelling.
   */
  resolveSolids(car) {
    if (car.airborne || car.y > 18) return;
    for (const b of this.barriers) {
      const dx = car.pos.x - b.x;
      const dz = car.pos.y - b.z;
      const lx = dx * b.tx + dz * b.ty;
      if (Math.abs(lx) > b.halfLen + car.radius) continue;
      const lz = -dx * b.ty + dz * b.tx;
      if (Math.abs(lz) > b.halfWidth + car.radius) continue;

      const penX = b.halfLen + car.radius - Math.abs(lx);
      const penZ = b.halfWidth + car.radius - Math.abs(lz);
      if (penX < penZ) {
        const sign = lx >= 0 ? 1 : -1;
        car.pos.x += b.tx * sign * penX;
        car.pos.y += b.ty * sign * penX;
        const v = car.vel.x * b.tx + car.vel.y * b.ty;
        if (v * sign < 0) {
          const delta = -v * 1.18;
          car.vel.x += b.tx * delta;
          car.vel.y += b.ty * delta;
          car.wallHit = Math.max(car.wallHit, Math.abs(v));
          car.bump = Math.max(car.bump, 0.62);
        }
      } else {
        const sign = lz >= 0 ? 1 : -1;
        car.pos.x += -b.ty * sign * penZ;
        car.pos.y += b.tx * sign * penZ;
        const v = -car.vel.x * b.ty + car.vel.y * b.tx;
        if (v * sign < 0) {
          const delta = -v * 1.18;
          car.vel.x += -b.ty * delta;
          car.vel.y += b.tx * delta;
          car.wallHit = Math.max(car.wallHit, Math.abs(v));
          car.bump = Math.max(car.bump, 0.62);
        }
      }
      car.vel.x *= 0.84;
      car.vel.y *= 0.84;
    }
  }
}
