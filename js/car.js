import { clamp, damp } from './utils.js';
import { WORLD } from './track.js';

const PX_PER_KMH = 0.42;

export class Car {
  constructor({ id, name, color, accent, isPlayer = false, number = 1 }) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.accent = accent;
    this.isPlayer = isPlayer;
    this.number = number;

    this.length = 50;
    this.width = 27;
    this.radius = 16;

    this.maxSpeed = isPlayer ? 762 : 742;
    this.accel = isPlayer ? 720 : 690;
    this.brakePower = 1680;
    this.reverseMax = 205;
    this.reverseAccel = 520;
    this.grip = 7.6;

    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.angle = 0;
    this.steer = 0;
    this.steerVisual = 0;

    this.speed = 0;
    this.slip = 0;
    this.drifting = false;
    this.surface = 'asphalt';
    this.surfaceMax = this.maxSpeed;
    this.prevIndex = 0;
    this.nearOffset = 0;
    this.input = { steer: 0, throttle: 0, brake: 0, handbrake: false };
    this.braking = false;
    this.throttle = 0;
    this.handbrake = false;
    this.bump = 0;
    this.wheelTurn = 0;

    // Race state
    this.prog = 0;
    this.progIndex = 0;
    this.laps = 0;
    this.finished = false;
    this.finishTime = null;
    this.lapStart = 0;
    this.lapTimes = [];
    this.bestLap = null;
    this.topSpeed = 0;

    this.reset({ x: 0, y: 0, angle: 0, index: 0, behind: 0 });
  }

  reset(slot) {
    this.pos.x = slot.x;
    this.pos.y = slot.y;
    this.angle = slot.angle;
    this.vel.x = 0;
    this.vel.y = 0;
    this.steer = 0;
    this.steerVisual = 0;
    this.speed = 0;
    this.slip = 0;
    this.drifting = false;
    this.surface = 'asphalt';
    this.prevIndex = slot.index;
    this.progIndex = slot.index;
    this.prog = -(slot.behind || 0) / 10;
    this.laps = 0;
    this.finished = false;
    this.finishTime = null;
    this.lapStart = 0;
    this.lapTimes = [];
    this.bestLap = null;
    this.topSpeed = 0;
    this.bump = 0;
    this.input = { steer: 0, throttle: 0, brake: 0, handbrake: false };
  }

  get kmh() {
    return Math.round(this.speed * PX_PER_KMH);
  }

  update(dt, input, track) {
    this.input = input;
    const steerTarget = clamp(input.steer, -1, 1);
    this.steer = damp(this.steer, steerTarget, steerTarget === 0 ? 12 : 9, dt);
    this.steerVisual = damp(this.steerVisual, this.steer, 14, dt);

    let vx = this.vel.x;
    let vy = this.vel.y;
    let cosA = Math.cos(this.angle);
    let sinA = Math.sin(this.angle);
    let vLong = vx * cosA + vy * sinA;

    const near = track.nearest(this.pos.x, this.pos.y, this.prevIndex);
    this.prevIndex = near.index;
    this.nearOffset = near.offset;
    const edge = Math.abs(near.offset);
    const half = track.width / 2;
    this.surface = edge > half + 7 ? 'grass' : edge > half - 7 ? 'kerb' : 'asphalt';

    let grip = this.grip;
    let surfaceMax = this.maxSpeed;
    if (this.surface === 'grass') {
      grip = 3.9;
      surfaceMax = this.maxSpeed * 0.4;
    } else if (this.surface === 'kerb') {
      grip = 6.4;
      surfaceMax = this.maxSpeed * 0.94;
    }

    const throttle = clamp(input.throttle, 0, 1);
    const brake = clamp(input.brake, 0, 1);
    const handbrake = Boolean(input.handbrake);
    this.throttle = throttle;
    this.handbrake = handbrake;
    this.braking = brake > 0.12 || handbrake;

    if (handbrake) grip *= 0.24;

    let drive = 0;
    if (brake > 0.05) {
      if (vLong > 2) drive = -this.brakePower * brake;
      else drive = -this.reverseAccel * brake;
    } else if (throttle > 0.05) {
      if (vLong >= -3) {
        const headroom = 1 - 0.52 * Math.pow(clamp(vLong / surfaceMax, 0, 1), 2);
        drive = this.accel * throttle * headroom;
      } else {
        drive = this.brakePower * throttle;
      }
    }

    vx += cosA * drive * dt;
    vy += sinA * drive * dt;

    let drag = 0;
    if (throttle < 0.05 && brake < 0.05) drag += 0.72;
    if (this.surface === 'grass') drag += 1.25;
    if (drag > 0) {
      const f = Math.exp(-drag * dt);
      vx *= f;
      vy *= f;
    }

    let speed = Math.hypot(vx, vy);
    if (this.surface !== 'asphalt' && speed > surfaceMax) {
      const target = damp(speed, surfaceMax, 3.6, dt);
      const f = target / speed;
      vx *= f;
      vy *= f;
      speed = target;
    }
    if (speed > this.maxSpeed) {
      const f = this.maxSpeed / speed;
      vx *= f;
      vy *= f;
      speed = this.maxSpeed;
    }

    vLong = vx * cosA + vy * sinA;
    if (vLong < -this.reverseMax) {
      const excess = vLong + this.reverseMax;
      vx -= cosA * excess;
      vy -= sinA * excess;
      vLong = -this.reverseMax;
    }

    // Steering: less lock at speed, minimal authority when nearly stopped.
    const absLong = Math.abs(vLong);
    const lowSpeed = clamp(absLong / 115, 0, 1);
    const speedRatio = clamp(absLong / this.maxSpeed, 0, 1);
    const turnRate = 3.18 * lowSpeed * (1 - 0.4 * speedRatio) * (handbrake ? 1.26 : 1);
    const direction = vLong < -3 ? -1 : 1;
    this.angle += this.steer * turnRate * direction * dt;

    // Tyre grip removes sideways velocity; low grip keeps the car sliding.
    cosA = Math.cos(this.angle);
    sinA = Math.sin(this.angle);
    const longV = vx * cosA + vy * sinA;
    let latV = -vx * sinA + vy * cosA;
    latV *= Math.exp(-grip * dt);

    vx = cosA * longV - sinA * latV;
    vy = sinA * longV + cosA * latV;

    this.vel.x = vx;
    this.vel.y = vy;
    this.pos.x += vx * dt;
    this.pos.y += vy * dt;

    // World bounds — the forest edge acts as a soft wall.
    const margin = 30;
    let bumped = false;
    if (this.pos.x < margin) { this.pos.x = margin; if (vx < 0) { vx *= -0.22; bumped = true; } }
    if (this.pos.x > WORLD.w - margin) { this.pos.x = WORLD.w - margin; if (vx > 0) { vx *= -0.22; bumped = true; } }
    if (this.pos.y < margin) { this.pos.y = margin; if (vy < 0) { vy *= -0.22; bumped = true; } }
    if (this.pos.y > WORLD.h - margin) { this.pos.y = WORLD.h - margin; if (vy > 0) { vy *= -0.22; bumped = true; } }
    if (bumped) this.bump = 1;

    this.vel.x = vx;
    this.vel.y = vy;
    this.speed = Math.hypot(vx, vy);
    this.slip = Math.abs(latV);
    this.drifting =
      (this.slip > 52 && this.speed > 140) ||
      (handbrake && this.speed > 170);
    this.topSpeed = Math.max(this.topSpeed, this.kmh);
    this.bump = Math.max(0, this.bump - dt * 3.2);

    return this;
  }
}
