// Tiny WebAudio synth — no assets, no autoplay errors.
export class AudioEngine {
  constructor(store) {
    this.store = store;
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._noise = null;
  }

  get on() { return this.store.state.settings.sound !== false; }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 1.2);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      this._noise = buf;
    } catch (err) {
      this.ctx = null;
    }
  }

  tone(freq, dur, type = 'sine', volume = 0.25, delay = 0, slide = null) {
    if (!this.ctx || !this.on) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  noise(dur, volume = 0.2, delay = 0, freq = 1200, q = 0.8) {
    if (!this.ctx || !this.on || !this._noise) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.25), t0 + dur);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  play(name) {
    if (!this.on) return;
    this.unlock();
    if (!this.ctx) return;
    try {
      switch (name) {
        case 'ui':
          this.tone(780, 0.045, 'triangle', 0.09);
          break;
        case 'tab':
          this.tone(520, 0.06, 'sine', 0.13, 0, 720);
          break;
        case 'rip':
          this.noise(0.45, 0.24, 0, 2000, 0.7);
          this.tone(180, 0.35, 'sawtooth', 0.12, 0, 720);
          break;
        case 'reveal':
          this.tone(523, 0.22, 'triangle', 0.18);
          this.tone(659, 0.24, 'triangle', 0.16, 0.08);
          this.tone(880, 0.4, 'triangle', 0.14, 0.16);
          this.noise(0.5, 0.1, 0.05, 4000, 0.5);
          break;
        case 'new':
          this.tone(880, 0.16, 'sine', 0.2);
          this.tone(1175, 0.2, 'sine', 0.18, 0.1);
          this.tone(1568, 0.4, 'sine', 0.14, 0.2);
          break;
        case 'upgrade':
          this.tone(440, 0.12, 'square', 0.12);
          this.tone(660, 0.12, 'square', 0.11, 0.08);
          this.tone(880, 0.3, 'triangle', 0.14, 0.16);
          break;
        case 'error':
          this.tone(180, 0.12, 'sawtooth', 0.1);
          this.tone(140, 0.18, 'sawtooth', 0.09, 0.08);
          break;
        case 'count':
          this.tone(440, 0.12, 'square', 0.12);
          break;
        case 'go':
          this.tone(880, 0.4, 'square', 0.16);
          this.tone(1320, 0.35, 'triangle', 0.1, 0.03);
          break;
        case 'hit':
          this.noise(0.3, 0.3, 0, 500, 0.6);
          this.tone(110, 0.28, 'sawtooth', 0.14);
          break;
        case 'nitro':
          this.noise(0.3, 0.16, 0, 3000, 1.2);
          this.tone(260, 0.3, 'sawtooth', 0.08, 0, 900);
          break;
        case 'lane':
          this.tone(420, 0.06, 'triangle', 0.08, 0, 520);
          break;
        case 'finish':
          [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.16, i * 0.1));
          this.noise(0.8, 0.08, 0.1, 3500, 0.5);
          break;
        case 'collect':
          [660, 880, 1100].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.14, i * 0.06));
          break;
        case 'spin':
          this.noise(0.8, 0.13, 0, 1600, 0.5);
          this.tone(160, 0.5, 'sawtooth', 0.06, 0, 480);
          break;
        case 'wheelWin':
          [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.13, i * 0.08));
          break;
        default:
          break;
      }
    } catch (err) {
      // never let sound break gameplay
    }
  }
}
