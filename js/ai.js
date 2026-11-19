import { clamp, wrapAngle } from './utils.js';

/**
 * Lightweight racing AI.
 *
 * The driver tracks a point on the centreline a speed-dependent distance
 * ahead (pure pursuit), follows the circuit's precomputed corner-speed
 * profile and only changes lane when another car is genuinely in its path.
 * It never uses the handbrake and never orbits a waypoint, which keeps the
 * field spread out and moving forward on every circuit size.
 */
export class AIDriver {
  constructor(car, track, { skill = 0.95, lane = 0, features = null } = {}) {
    this.car = car;
    this.track = track;
    this.features = features;
    this.skill = skill;
    this.lane = lane;
    this.stuckTimer = 0;
    this.reverseTimer = 0;
    this.avoidShift = 0;
    this.reaction = 0;
    this.hesitation = 0;
  }

  reset() {
    this.stuckTimer = 0;
    this.reverseTimer = 0;
    this.avoidShift = 0;
    this.reaction = 0;
    this.hesitation = 0;
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

    // --- Traffic: prefer a clean side, lift when truly boxed in ----------
    this.reaction = Math.max(0, this.reaction - dt);
    let blocked = false;
    let desiredShift = 0;
    let nearestAhead = Infinity;
    for (const other of cars) {
      if (other === car) continue;
      const dx = other.pos.x - car.pos.x;
      const dy = other.pos.y - car.pos.y;
      const fwd = dx * cos + dy * sin;
      const side = -dx * sin + dy * cos;
      if (fwd < 4 || fwd > 190) continue;
      if (Math.abs(side) > 58) continue;
      if (fwd < nearestAhead) {
        nearestAhead = fwd;
        blocked = true;
        // Drift to whichever side has more room, biased by the car's lane.
        desiredShift = side >= car.width * 0.35 ? -1 : side <= -car.width * 0.35 ? 1 : (this.lane >= 0 ? 1 : -1);
        if (fwd < 94 && speed > other.speed - 8) {
          throttle = 0;
          brake = clamp((94 - fwd) / 120, 0.18, 0.72);
        }
      }
    }
    const shiftGoal = desiredShift * Math.min(96, track.width * 0.42);
    this.avoidShift += (shiftGoal - this.avoidShift) * Math.min(1, dt * 3.6);
    if (!blocked) this.avoidShift *= Math.exp(-2.4 * dt);

    // --- Pure pursuit toward the racing line ----------------------------
    const lookSamples = clamp(
      Math.round((86 + speed * 0.62) / track.ds),
      10,
      58
    );
    const ti = (i + lookSamples) % N;
    const p = track.points[ti];
    const n = track.normals[ti];
    const t = track.tangents[ti];
    const laneLimit = Math.max(20, track.width / 2 - 34);
    let lanePx = clamp(
      this.lane * track.width * 0.32 + this.avoidShift,
      -laneLimit,
      laneLimit
    );

    // Chicane barriers leave a gap on one side. Aim for that gap well before
    // the wall arrives so the field flows through the slalom instead of
    // pinning itself against the barrier island.
    if (this.features && this.features.barriers.length) {
      let nearest = null;
      let nearestAhead = Infinity;
      for (const barrier of this.features.barriers) {
        const ahead = ((barrier.index - i + N) % N) * track.ds;
        if (ahead > 2 && ahead < 300 && ahead < nearestAhead) {
          nearest = barrier;
          nearestAhead = ahead;
        }
      }
      if (nearest) {
        const gap = -nearest.side * (track.width / 2 - nearest.halfWidth * 0.82);
        const weight = clamp(1 - nearestAhead / 300, 0.35, 1);
        lanePx = clamp(lanePx * (1 - weight) + gap * weight, -laneLimit, laneLimit);
      }
    }
    let tx = p.x + n.x * lanePx;
    let ty = p.y + n.y * lanePx;

    if (car.surface === 'grass') {
      // Aim for the middle of the road a little closer to the car.
      const center = track.points[(i + Math.round(lookSamples * 0.62)) % N];
      tx = center.x;
      ty = center.y;
    }

    const desired = Math.atan2(ty - car.pos.y, tx - car.pos.x);
    const diff = wrapAngle(desired - car.angle);
    steer = clamp(diff * 2.6, -1, 1);

    // Feed-forward from the corner's tangent keeps the nose pointed down
    // the road rather than cutting across the inside of long bends.
    const tangentError = wrapAngle(Math.atan2(t.y, t.x) - car.angle);
    if (Math.abs(diff) < 0.5) steer = clamp(steer + tangentError * 0.55, -1, 1);

    // --- Corner speed ----------------------------------------------------
    let skill = this.skill;
    if (player && !car.finished && !player.finished) {
      const gap = car.prog - player.prog;
      // Gentle rubber band, capped so the AI never teleports or crawls.
      if (gap < -52) skill += Math.min(0.055, (-gap - 52) * 0.0009);
      else if (gap > 64) skill -= Math.min(0.06, (gap - 64) * 0.0008);
    }
    skill = clamp(skill, 0.86, 1.03);

    const profileAhead = track.speedProfile[(i + Math.round(lookSamples * 0.55)) % N];
    const profileHere = track.speedProfile[i];
    let speedTarget = Math.min(profileAhead, profileHere * 1.18) * skill;
    speedTarget = Math.min(speedTarget, car.maxSpeed * (0.96 + skill * 0.04));

    if (Math.abs(diff) > 0.62) brake = Math.max(brake, 0.28);
    if (Math.abs(diff) > 1.05) brake = Math.max(brake, 0.56);

    if (car.surface === 'grass') {
      throttle = Math.max(throttle, 0.86);
      brake = Math.min(brake, 0.1);
    } else if (speed < speedTarget * 0.94) {
      throttle = Math.max(throttle, 1);
      brake = 0;
    } else if (speed > speedTarget * 1.045) {
      const over = (speed - speedTarget) / 135;
      brake = Math.max(brake, clamp(over, 0.25, 1));
      throttle = 0;
    } else {
      // Hold a light throttle to prevent constant lift-off oscillation.
      throttle = Math.max(throttle, 0.5);
    }

    if (blocked && nearestAhead < 70 && brake > 0) throttle = 0;
    if (blocked && nearestAhead >= 70) throttle = Math.max(throttle, 0.55);

    // --- Recovery: reverse out, then rejoin facing forward --------------
    if (speed < 22) this.stuckTimer += dt;
    else this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2.2);

    if (this.reverseTimer > 0) {
      this.reverseTimer -= dt;
      throttle = 0;
      brake = 1;
      steer = -Math.sign(steer || 1) * 0.8;
    } else if (this.stuckTimer > 0.9) {
      this.reverseTimer = 0.7;
      this.stuckTimer = 0;
    }

    if (car.finished) {
      throttle = speed > 120 ? 0 : 0.22;
      brake = speed > 180 ? 0.35 : 0;
    }

    return {
      steer: clamp(steer, -1, 1),
      throttle: clamp(throttle, 0, 1),
      brake: clamp(brake, 0, 1),
      handbrake: false,
    };
  }
}
