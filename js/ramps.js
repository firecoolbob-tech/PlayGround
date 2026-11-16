import { clamp } from './utils.js';

/* ------------------------------------------------------------------ */
/* Ramp definitions                                                    */
/* ------------------------------------------------------------------ */

// Each ramp is anchored to a track sample and centred on its normal. The
// wedge rises from 0 at the base to `height` at the lip along the racing
// direction, so a car crossing it is launched forward and upward.
export const RAMP_DEFS = [
  { index: 46, offset: 0, width: 142, length: 160, height: 34 },
  { index: 114, offset: 12, width: 138, length: 155, height: 30 },
  { index: 307, offset: -8, width: 144, length: 165, height: 38 },
];

const GRAVITY = 560;
const STEP_HEIGHT = 6;

/* ------------------------------------------------------------------ */
/* Analytical ramp world                                               */
/* ------------------------------------------------------------------ */

export class Ramps {
  constructor(track, defs = RAMP_DEFS) {
    this.list = defs.map((def) => {
      const index = ((def.index % track.N) + track.N) % track.N;
      const p = track.points[index];
      const t = track.tangents[index];
      const n = track.normals[index];
      return {
        ...def,
        index,
        x: p.x + n.x * def.offset,
        z: p.y + n.y * def.offset,
        tx: t.x,
        ty: t.y,
        yaw: -Math.atan2(t.y, t.x),
        slope: Math.atan2(def.height, def.length),
        slopeTan: def.height / def.length,
        halfL: def.length / 2,
        halfW: def.width / 2,
      };
    });
    this._hit = { ramp: null, lx: 0, lz: 0, progress: 0, surface: 0 };
  }

  reset() {
    this._hit.ramp = null;
  }

  // Footprint support query. These allocations are avoided by reusing
  // _hit; callers copy the values they need immediately.
  query(x, z) {
    const hit = this._hit;
    for (const ramp of this.list) {
      const dx = x - ramp.x;
      const dz = z - ramp.z;
      const lx = dx * ramp.tx + dz * ramp.ty;
      if (lx < -ramp.halfL || lx > ramp.halfL) continue;
      const lz = -dx * ramp.ty + dz * ramp.tx;
      if (Math.abs(lz) > ramp.halfW) continue;
      const progress = clamp((lx + ramp.halfL) / ramp.length, 0, 1);
      hit.ramp = ramp;
      hit.lx = lx;
      hit.lz = lz;
      hit.progress = progress;
      hit.surface = ramp.height * progress;
      return hit;
    }
    return null;
  }

  supportHeight(x, z) {
    const hit = this.query(x, z);
    return hit ? hit.surface : 0;
  }

  /**
   * Treat the sides and the vertical lip face as solid walls whenever the
   * car is below the local slope height. The base stays open so the car
   * can drive on from behind. This is a cheap circle-ish vs. oriented box
   * test, run at the fixed 120 Hz physics rate so tunnelling is impossible.
   */
  resolveSolids(car) {
    const nose = car.length / 2;
    for (const ramp of this.list) {
      const dx = car.pos.x - ramp.x;
      const dz = car.pos.y - ramp.z;
      const lx = dx * ramp.tx + dz * ramp.ty;
      if (lx < -ramp.halfL || lx > ramp.halfL + nose) continue;
      const lz = -dx * ramp.ty + dz * ramp.tx;
      if (Math.abs(lz) > ramp.halfW + car.radius) continue;

      const progress = clamp((lx + ramp.halfL) / ramp.length, 0, 1);
      const surface = ramp.height * progress;
      if (car.y + STEP_HEIGHT >= surface) continue;

      let pushLx = 0;
      let pushLz = 0;

      if (lx > ramp.halfL) {
        // Vertical face at the lip. Use the nose length so the body cannot
        // poke through the face before its centre reaches the wall.
        pushLx = ramp.halfL + nose - lx;
      } else {
        // Left or right flank.
        const sign = lz >= 0 ? 1 : -1;
        pushLz = sign * (ramp.halfW + car.radius) - lz;
        if (Math.abs(pushLz) < 0.001) pushLz = sign * (ramp.halfW + car.radius);
      }

      if (pushLz !== 0) {
        car.pos.x += -ramp.ty * pushLz;
        car.pos.y += ramp.tx * pushLz;
        const vLocalZ = -car.vel.x * ramp.ty + car.vel.y * ramp.tx;
        const outward = pushLz >= 0 ? 1 : -1;
        if (vLocalZ * outward < 0) {
          const bounced = -vLocalZ * 0.22;
          const delta = bounced - vLocalZ;
          car.vel.x += -ramp.ty * delta;
          car.vel.y += ramp.tx * delta;
          car.wallHit = Math.max(car.wallHit, Math.abs(vLocalZ));
          car.bump = Math.max(car.bump, 0.55);
        }
      } else if (pushLx > 0) {
        car.pos.x += ramp.tx * pushLx;
        car.pos.y += ramp.ty * pushLx;
        const vLocalX = car.vel.x * ramp.tx + car.vel.y * ramp.ty;
        if (vLocalX < 0) {
          const bounced = -vLocalX * 0.22;
          const delta = bounced - vLocalX;
          car.vel.x += ramp.tx * delta;
          car.vel.y += ramp.ty * delta;
          car.wallHit = Math.max(car.wallHit, Math.abs(vLocalX));
          car.bump = Math.max(car.bump, 0.55);
        }
      }
    }
  }

  /**
   * Vertical state for one car. Mounts the ramp surface, launches off the
   * lip using the climb rate, and integrates a cheap ballistic arc in the
   * air. No rigid-body solver, no raycasts.
   */
  updateCar(car, dt) {
    const hit = this.query(car.pos.x, car.pos.y);

    if (hit && (!car.airborne || car.y <= hit.surface + 2)) {
      // Touching the slope: snap to the exact surface height.
      car.airborne = false;
      car.ramp = hit.ramp;
      car.rampProgress = hit.progress;
      car.y = hit.surface;
      const forward = car.vel.x * hit.ramp.tx + car.vel.y * hit.ramp.ty;
      car.vy = forward * hit.ramp.slopeTan;
      car.climbRate = car.vy;
      this.updatePitch(car, dt);
      return;
    }

    if (hit && car.airborne) {
      // Sailing above a ramp; fall until its deck catches the car.
      this.integrateAir(car, dt, hit.surface);
      if (!car.airborne) {
        car.ramp = hit.ramp;
        car.rampProgress = hit.progress;
      }
      this.updatePitch(car, dt);
      return;
    }

    if (car.ramp) {
      // The centre has left the footprint. If it crossed the lip with
      // height underneath it, carry the climb rate into a jump.
      const ramp = car.ramp;
      const dx = car.pos.x - ramp.x;
      const dz = car.pos.y - ramp.z;
      const lx = dx * ramp.tx + dz * ramp.ty;
      const lz = -dx * ramp.ty + dz * ramp.tx;
      const overLip = lx > ramp.halfL && Math.abs(lz) <= ramp.halfW + 12;
      const height = car.y;
      car.ramp = null;
      car.rampProgress = 0;
      if (height > 1.5) {
        car.airborne = true;
        car.vy = overLip ? Math.max(car.climbRate, 0) : 0;
        car.y = height;
        this.integrateAir(car, dt, 0);
      } else {
        car.y = 0;
        car.vy = 0;
        car.airborne = false;
      }
      this.updatePitch(car, dt);
      return;
    }

    if (car.airborne) {
      this.integrateAir(car, dt, 0);
      this.updatePitch(car, dt);
      return;
    }

    car.y = 0;
    car.vy = 0;
    this.updatePitch(car, dt);
  }

  integrateAir(car, dt, ground) {
    car.vy -= GRAVITY * dt;
    car.y += car.vy * dt;
    if (car.y <= ground) {
      const impact = -car.vy;
      car.y = ground;
      car.vy = 0;
      car.airborne = false;
      if (impact > 45) {
        car.landImpact = Math.max(car.landImpact, impact);
        car.bump = Math.max(car.bump, 0.75);
      }
    }
  }

  updatePitch(car, dt) {
    let target = 0;
    if (car.ramp) {
      const ramp = car.ramp;
      const dot =
        Math.cos(car.angle) * ramp.tx + Math.sin(car.angle) * ramp.ty;
      target = ramp.slope * dot;
    }
    const rate = car.airborne ? 3.0 : car.ramp ? 14 : 9;
    car.pitch += (target - car.pitch) * Math.min(1, rate * dt);
    if (Math.abs(car.pitch) < 0.0002) car.pitch = 0;
  }
}
