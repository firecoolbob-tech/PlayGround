import { clamp, wrapAngle } from './utils.js';

export class AIDriver {
  constructor(car, track, { skill = 0.95, lane = 0 } = {}) {
    this.car = car;
    this.track = track;
    this.skill = skill;
    this.lane = lane;
    this.stuckTimer = 0;
    this.reverseTimer = 0;
    this.avoidShift = 0;
    this.reaction = 0;
  }

  reset() {
    this.stuckTimer = 0;
    this.reverseTimer = 0;
    this.avoidShift = 0;
    this.reaction = 0;
  }

  update(dt, cars, player) {
    const car = this.car;
    const track = this.track;
    const N = track.N;
    const i = car.prevIndex;
    const speed = car.speed;
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);

    let steer = 0;
    let throttle = 0;
    let brake = 0;

    // --- Avoid slower cars directly ahead -------------------------------
    this.reaction = Math.max(0, this.reaction - dt);
    let blocked = false;
    let desiredShift = 0;
    for (const other of cars) {
      if (other === car) continue;
      const dx = other.pos.x - car.pos.x;
      const dy = other.pos.y - car.pos.y;
      const fwd = dx * cos + dy * sin;
      const side = -dx * sin + dy * cos;
      if (fwd > 8 && fwd < 155 && Math.abs(side) < 48) {
        blocked = true;
        desiredShift = side >= 0 ? -1 : 1;
        if (fwd < 72 && speed > other.speed - 15) {
          throttle = 0;
          brake = 0.55;
        }
        break;
      }
    }
    this.avoidShift += (desiredShift * 82 - this.avoidShift) * Math.min(1, dt * 4);

    // --- Steering toward a point on the racing line ahead ---------------
    const lookSamples = clamp(Math.round((72 + speed * 0.5) / track.ds), 9, 46);
    const ti = (i + lookSamples) % N;
    const p = track.points[ti];
    const n = track.normals[ti];
    const lanePx = this.lane * track.width * 0.34 + this.avoidShift;
    let tx = p.x + n.x * lanePx;
    let ty = p.y + n.y * lanePx;

    if (car.surface === 'grass') {
      // Aim straight back to the middle of the track.
      const center = track.points[(i + Math.round(lookSamples * 0.6)) % N];
      tx = center.x;
      ty = center.y;
      throttle = Math.min(throttle || 1, 0.85);
    }

    const desired = Math.atan2(ty - car.pos.y, tx - car.pos.x);
    const diff = wrapAngle(desired - car.angle);
    steer = clamp(diff * 2.45, -1, 1);

    // --- Speed target from the precomputed corner speed profile ---------
    let skill = this.skill;
    if (player && !car.finished && !player.finished) {
      const gap = car.prog - player.prog;
      if (gap < -46) skill += 0.035;
      else if (gap > 52) skill -= 0.045;
    }
    const speedTarget = track.speedProfile[(i + 16) % N] * skill;

    if (car.surface !== 'grass') {
      if (speed < speedTarget * 0.985) throttle = Math.max(throttle, 1);
      if (speed > speedTarget * 1.07) {
        brake = Math.max(brake, clamp((speed - speedTarget) / 130, 0.35, 1));
      }
    } else {
      throttle = Math.max(throttle, 0.9);
    }

    if (blocked && throttle === 0 && brake === 0) throttle = 0.25;

    // --- Recovery: reverse out if beached or facing the wrong way --------
    if (speed < 24) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
    }
    if (this.reverseTimer > 0) {
      this.reverseTimer -= dt;
      throttle = 0;
      brake = 1;
      steer = -steer;
    } else if (this.stuckTimer > 1.1) {
      this.reverseTimer = 0.85;
      this.stuckTimer = 0;
    }

    if (car.finished) {
      throttle = 0.25;
      brake = 0;
    }

    return {
      steer: clamp(steer, -1, 1),
      throttle: clamp(throttle, 0, 1),
      brake: clamp(brake, 0, 1),
      handbrake: false,
    };
  }
}
