/* ═══════════════════════════════════════════════════════════════
   RC RUSH — dynamic weather system
   ═══════════════════════════════════════════════════════════════ */
import { WEATHER } from './data.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

export class WeatherSystem {
  constructor(location, onChange = null) {
    this.location = location;
    this.onChange = onChange;
    this.reset();
  }

  reset() {
    const pool = this.location.weather;
    this.type = pool[Math.floor(Math.random() * pool.length)];
    this.prev = this.type;
    this.blend = 1;
    this.timer = 18 + Math.random() * 12;
    this.flash = 0;
    this.justChanged = null;
    this.races = 0;
    this.totalTime = 0;
  }

  update(dt) {
    this.totalTime += dt;
    this.timer -= dt;
    this.flash = Math.max(0, this.flash - dt * 1.6);

    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt / 4.2);

    if (this.timer <= 0 && this.blend >= 1) {
      const pool = this.location.weather;
      const options = pool.filter(w => w !== this.type);
      const next = options.length ? options[Math.floor(Math.random() * options.length)] : pool[0];
      this.prev = this.type;
      this.type = next;
      this.blend = 0;
      this.timer = 18 + Math.random() * 14;
      this.justChanged = WEATHER[next];
      if (this.onChange) this.onChange(WEATHER[next]);
    }

    const cur = WEATHER[this.type];
    if (cur.lightning && Math.random() < dt * 0.22) this.flash = 1;
  }

  params() {
    const a = WEATHER[this.prev];
    const b = WEATHER[this.type];
    const t = smooth(this.blend);
    return {
      grip: lerp(a.grip, b.grip, t),
      fog: lerp(a.fog, b.fog, t),
      particles: lerp(a.particles, b.particles, t),
      tintAlpha: lerp(a.tintAlpha, b.tintAlpha, t),
      tint: t < 0.5 ? a.tint : b.tint,
      wind: lerp(a.wind, b.wind, t),
      skyDim: lerp(a.skyDim, b.skyDim, t),
      kind: t < 0.55 ? a.kind : b.kind,
      lightning: (t < 0.5 ? a : b).lightning,
      label: (t < 0.5 ? a : b).label,
      icon: (t < 0.5 ? a : b).icon,
      id: (t < 0.5 ? a : b).id,
      from: a, to: b, blend: t
    };
  }

  get current() { return WEATHER[this.type]; }
}
