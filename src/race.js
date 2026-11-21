/* ═══════════════════════════════════════════════════════════════
   RC RUSH — race simulation
   ═══════════════════════════════════════════════════════════════ */
import { generateTrack, curveAt, formatTime } from './track.js';
import { WeatherSystem } from './weather.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const AI_NAMES = [
  { name: 'KIRA', color: '#9d7bff', car: 'voltage', skill: 0.9 },
  { name: 'DEX', color: '#ffb03a', car: 'sidewinder', skill: 0.94 },
  { name: 'NOVA', color: '#35e6ff', car: 'glacier', skill: 0.98 }
];

export class Race {
  constructor({ location, car, seed, input, audio, onEvent }) {
    this.location = location;
    this.car = car;
    this.seed = seed;
    this.input = input;
    this.audio = audio;
    this.onEvent = onEvent || (() => {});

    this.track = generateTrack(location, seed);
    this.weather = new WeatherSystem(location, meta => {
      this.onEvent('weather', meta);
    });

    const s = car.stats;
    this.maxSpeed = 10400 + s.speed * 280;
    this.accel = 3450 + s.accel * 235;
    this.boostFactor = 1.155 + s.boost * 0.0135;
    this.gripBase = 0.82 + s.grip * 0.025;

    this.state = 'countdown';
    this.countdown = 3.25;
    this.lastCount = 4;
    this.time = 0;
    this.distance = 0;
    this.trackPos = 0;
    this.speed = 0;
    this.playerX = 0;
    this.boost = 100;
    this.boosting = false;
    this.drifting = false;
    this.offroad = false;
    this.grip = 1;
    this.rank = 4;
    this.lap = 1;
    this.laps = this.track.laps;
    this.lapStartTime = 0;
    this.lapTimes = [];
    this.topSpeed = 0;
    this.shake = 0;
    this.bumpCooldown = 0;
    this.driftTime = 0;
    this.pickups = 0;
    this.wrongWay = false;
    this.finishTime = 0;
    this.finalRank = 4;
    this.boostFlash = 0;

    this.ai = AI_NAMES.map((meta, i) => ({
      ...meta,
      distance: 900 + i * 900,
      speed: 0,
      x: (i - 1) * 0.18,
      phase: Math.random() * Math.PI * 2,
      lap: 1,
      finished: false,
      finishTime: 0
    }));

    this.weather.reset();
  }

  get speedRatio() { return this.speed / this.maxSpeed; }
  get kmh() { return Math.round(this.speed / 52); }
  get currentLapTime() { return Math.max(0, this.time - this.lapStartTime); }
  get lapProgress() { return clamp(this.trackPos / this.track.length, 0, 1); }
  get progressTotal() { return clamp(this.distance / (this.track.length * this.laps), 0, 1); }

  start() {
    this.state = 'countdown';
    this.countdown = 3.25;
    this.lastCount = 4;
    if (this.audio) this.audio.startRace();
  }

  update(dt) {
    dt = Math.min(dt, 0.05);

    if (this.state === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastCount && n >= 1 && n <= 3) {
        this.lastCount = n;
        if (this.audio) this.audio.countdown(n);
        this.onEvent('count', n);
      }
      if (this.countdown <= 0) {
        this.state = 'racing';
        this.countdown = 0;
        this.time = 0;
        this.lapStartTime = 0;
        if (this.audio) this.audio.countdown(0);
        this.onEvent('go');
      }
      this.weather.update(dt * 0.4);
      this._updateShake(dt);
      return;
    }

    if (this.state !== 'racing') {
      this._updateShake(dt);
      return;
    }

    this.time += dt;
    this.weather.update(dt);
    const wp = this.weather.params();
    this.grip = this.location.grip * wp.grip * this.gripBase;

    const steer = this.input.update(dt);
    const curve = curveAt(this.track, this.trackPos);
    this.curveVisual = curve;
    const ratio = this.speedRatio;
    this.offroad = Math.abs(this.playerX) > 1.035;
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    this.boostFlash = Math.max(0, this.boostFlash - dt);

    // ── steering & centrifugal drift ─────────────────────────
    const steerRate = (0.58 + 0.9 * Math.min(1, ratio)) * clamp(this.grip, 0.6, 1.25);
    this.playerX += steer * steerRate * dt * 1.28;
    this.playerX -= curve * ratio * ratio * 0.78 * dt / clamp(this.grip, 0.62, 1.2);
    // Gentle lane assist when the player is not steering keeps casual
    // mobile races from drifting into the scenery on long straights.
    if (Math.abs(steer) < 0.05) this.playerX -= this.playerX * Math.min(1, dt * 0.85);
    this.playerX = clamp(this.playerX, -1.7, 1.7);
    if (Math.abs(this.playerX) > 1.56) {
      this.playerX += Math.sign(this.playerX) * -1.8 * dt;
    }

    // ── boost ────────────────────────────────────────────────
    const wantBoost = this.input.boost && this.boost > 0.5 && this.speed > 1600;
    this.boosting = wantBoost;
    if (wantBoost) {
      this.boost = Math.max(0, this.boost - 27 * dt);
      if (this.boostFlash <= 0) {
        this.boostFlash = 0.6;
        if (this.audio) this.audio.boost();
        this.onEvent('boost');
      }
    } else {
      const regen = this.drifting ? 9 : 4.2;
      this.boost = Math.min(100, this.boost + regen * dt);
    }

    // ── drift state ──────────────────────────────────────────
    const wasDrifting = this.drifting;
    this.drifting = Math.abs(steer) > 0.52 && ratio > 0.42 && !this.offroad;
    if (this.drifting && !wasDrifting) this.onEvent('drift-start');
    if (this.drifting) {
      this.driftTime += dt;
      if (!this.boosting) this.boost = Math.min(100, this.boost + 10.5 * dt);
    } else {
      this.driftTime = Math.max(0, this.driftTime - dt * 2);
    }

    // ── longitudinal physics ─────────────────────────────────
    let cap = this.maxSpeed * (this.boosting ? this.boostFactor : 1);
    if (this.offroad) cap *= 0.5;
    if (this.input.brake) {
      this.speed = Math.max(0, this.speed - 15500 * dt);
    } else if (this.speed < cap) {
      const headroom = 1 - Math.min(1, this.speed / this.maxSpeed);
      this.speed += this.accel * (0.7 + headroom * 0.42) * dt;
      if (this.boosting) this.speed += this.accel * 0.55 * dt;
    } else {
      this.speed -= ((this.speed - cap) * 2.2 + 120) * dt;
    }
    if (this.offroad) this.speed = Math.max(0, this.speed - 5200 * dt);
    this.speed = clamp(this.speed, 0, this.maxSpeed * this.boostFactor * 1.04);
    this.topSpeed = Math.max(this.topSpeed, this.speed);

    // ── advance ──────────────────────────────────────────────
    const prevPos = this.trackPos;
    const prevDist = this.distance;
    this.distance += this.speed * dt;
    this.trackPos = this.distance % this.track.length;

    // lap crossing
    const newLap = Math.min(this.laps, Math.floor(this.distance / this.track.length) + 1);
    if (newLap > this.lap) {
      const lapTime = this.time - this.lapStartTime;
      this.lapTimes.push(lapTime);
      this.lapStartTime = this.time;
      this.lap = newLap;
      this.onEvent('lap', { lap: newLap, lapTime });
      if (this.audio) this.audio.beep(newLap === this.laps ? 760 : 620, 0.14, 0.12, 'triangle');
    }

    // finish
    if (this.distance >= this.track.length * this.laps) {
      this._finish();
      return;
    }

    this._updateAI(dt);
    this._checkPads(prevPos, this.trackPos);
    this._checkCollisions();
    this._updateStandings();
    this._updateShake(dt);

    if (this.audio) {
      this.audio.update(dt, ratio, this.boosting, this.offroad, this.drifting ? 1 : 0);
    }
  }

  _updateAI(dt) {
    const trackLen = this.track.length;
    for (const ai of this.ai) {
      if (ai.finished) continue;
      const curve = Math.abs(curveAt(this.track, ai.distance));
      const wp = this.weather.params();
      const diff = this.distance - ai.distance;
      const rubber = clamp(diff / 30000, -0.075, 0.065);
      const base = this.maxSpeed * (0.82 + ai.skill * 0.13);
      const target = base * (1 - curve * 0.075) * clamp(wp.grip, 0.78, 1.05) * (1 + rubber);
      ai.speed += (target - ai.speed) * Math.min(1, dt * 1.6);
      if (ai.speed < target) ai.speed += 3800 * dt;
      ai.distance += ai.speed * dt;

      const targetX = clamp(-curve * 0.55 + Math.sin(ai.distance * 0.00045 + ai.phase) * 0.12, -0.82, 0.82);
      ai.x += (targetX - ai.x) * Math.min(1, dt * 1.4);
      ai.lap = Math.floor(ai.distance / trackLen) + 1;
      if (ai.distance >= trackLen * this.laps) {
        ai.distance = trackLen * this.laps;
        ai.finished = true;
        ai.finishTime = this.time;
      }
    }
  }

  _checkPads(prevPos, currPos) {
    const segLen = this.track.segmentLength;
    const total = this.track.total;
    const prevIdx = Math.floor(prevPos / segLen);
    const currIdx = Math.floor(currPos / segLen);
    const wrapped = currIdx < prevIdx;
    for (const pad of this.track.boostPads) {
      pad.cooldown = Math.max(0, pad.cooldown - 0.016);
      if (pad.cooldown > 0) continue;
      let crossed = false;
      if (!wrapped) crossed = pad.index >= prevIdx && pad.index <= currIdx;
      else crossed = pad.index >= prevIdx || pad.index <= currIdx;
      if (!crossed) continue;
      if (Math.abs(this.playerX - pad.x) > 0.34) continue;
      pad.cooldown = 5;
      this.boost = Math.min(100, this.boost + 26);
      this.pickups++;
      this.onEvent('pickup', { x: pad.x });
      if (this.audio) this.audio.pickup();
    }
  }

  _checkCollisions() {
    if (this.bumpCooldown > 0) return;
    for (const ai of this.ai) {
      let dz = ai.distance - this.distance;
      if (dz > this.track.length / 2) dz -= this.track.length;
      if (dz < -this.track.length / 2) dz += this.track.length;
      if (Math.abs(dz) < 360 && Math.abs(ai.x - this.playerX) < 0.32) {
        this.speed *= 0.94;
        this.playerX += Math.sign(this.playerX - ai.x || 1) * 0.07;
        ai.x -= Math.sign(this.playerX - ai.x || 1) * 0.07;
        this.bumpCooldown = 0.7;
        this.shake = Math.max(this.shake, 0.55);
        this.onEvent('bump');
        if (this.audio) this.audio.crash();
        if (navigator.vibrate) navigator.vibrate(28);
        return;
      }
    }
  }

  _updateStandings() {
    const list = this.getStandings();
    this.rank = list.findIndex(r => r.isPlayer) + 1;
  }

  getStandings() {
    const list = this.ai.map(a => ({
      name: a.name, color: a.color, distance: a.distance, isPlayer: false,
      finished: a.finished, finishTime: a.finishTime, car: a.car
    }));
    list.push({
      name: 'YOU', color: this.car.color, distance: this.distance, isPlayer: true,
      finished: this.state === 'finished', finishTime: this.finishTime, car: this.car.id
    });
    list.sort((a, b) => b.distance - a.distance);
    return list;
  }

  _finish() {
    this.state = 'finished';
    this.finishTime = this.time;
    if (this.lapTimes.length < this.laps) {
      this.lapTimes.push(this.time - this.lapStartTime);
    }
    const standings = this.getStandings();
    this.finalRank = standings.findIndex(r => r.isPlayer) + 1;
    this.rank = this.finalRank;
    this.speed *= 0.7;
    if (this.audio) {
      this.audio.stopRace();
      this.audio.finish(this.finalRank === 1);
    }
    this.onEvent('finish', {
      rank: this.finalRank,
      time: this.finishTime,
      lapTimes: [...this.lapTimes],
      topSpeed: this.kmh,
      standings,
      weather: this.weather.current
    });
  }

  _updateShake(dt) {
    this.shake = Math.max(0, this.shake - dt * 1.8);
    if (this.offroad && this.speed > 3000) this.shake = Math.max(this.shake, 0.25);
    if (this.boosting) this.shake = Math.max(this.shake, 0.18);
  }

  bestLap() {
    return this.lapTimes.length ? Math.min(...this.lapTimes) : 0;
  }

  statusLine() {
    if (this.state === 'countdown') return 'GET READY';
    return formatTime(this.time);
  }
}
