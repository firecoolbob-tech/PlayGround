/* ═══════════════════════════════════════════════════════════════
   RC RUSH — procedural WebAudio engine, skids, weather & music
   ═══════════════════════════════════════════════════════════════ */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.sound = true;
    this.music = true;
    this.engineGain = null;
    this.engineOsc = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.windGain = null;
    this.skidGain = null;
    this.master = null;
    this.musicGain = null;
    this.noise = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.musicOn = false;
    this.root = 110;
    this.raceActive = false;
    this.lastSpeed = 0;
  }

  ensure() {
    if (this.ready) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.sound ? 0.8 : 0;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.music ? 0.16 : 0;
      this.musicGain.connect(this.master);

      // engine bus
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 520;
      this.engineFilter.Q.value = 4;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 70;
      this.engineOsc.connect(this.engineFilter);
      this.engineOsc.start();

      this.engineSub = this.ctx.createOscillator();
      this.engineSub.type = 'square';
      this.engineSub.frequency.value = 35;
      const subGain = this.ctx.createGain();
      subGain.gain.value = 0.35;
      this.engineSub.connect(subGain);
      subGain.connect(this.engineFilter);
      this.engineSub.start();

      // noise buffer
      const len = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;

      // wind
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = buffer; windSrc.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass'; windFilter.frequency.value = 650; windFilter.Q.value = 0.6;
      this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0;
      windSrc.connect(windFilter); windFilter.connect(this.windGain); this.windGain.connect(this.master);
      windSrc.start();

      // skid
      const skidSrc = this.ctx.createBufferSource();
      skidSrc.buffer = buffer; skidSrc.loop = true;
      const skidFilter = this.ctx.createBiquadFilter();
      skidFilter.type = 'bandpass'; skidFilter.frequency.value = 1900; skidFilter.Q.value = 2.4;
      this.skidGain = this.ctx.createGain(); this.skidGain.gain.value = 0;
      skidSrc.connect(skidFilter); skidFilter.connect(this.skidGain); this.skidGain.connect(this.master);
      skidSrc.start();

      this.ready = true;
      return this.ctx;
    } catch {
      this.ready = false;
      return null;
    }
  }

  async unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* ignore */ } }
  }

  setSettings({ sound, music }) {
    this.sound = sound; this.music = music;
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(sound ? 0.8 : 0, now + 0.12);
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.linearRampToValueAtTime(music ? 0.16 : 0, now + 0.2);
  }

  startRace() {
    this.raceActive = true;
    this.ensure();
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setTargetAtTime(0.05, now, 0.2);
    this.musicOn = true;
    this.nextNoteTime = now + 0.15;
    this.step = 0;
  }

  stopRace() {
    this.raceActive = false;
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, now, 0.25);
    this.windGain.gain.setTargetAtTime(0, now, 0.25);
    this.skidGain.gain.setTargetAtTime(0, now, 0.2);
    this.musicOn = false;
  }

  pauseRace(paused) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(paused ? 0 : 0.05, now, 0.15);
    this.musicOn = !paused;
    if (!paused) this.nextNoteTime = Math.max(this.nextNoteTime, now + 0.1);
  }

  setTheme(index) {
    const roots = [110, 98, 130.8, 123.5, 87.3, 82.4, 116.5, 103.8, 92.5, 146.8, 138.6, 73.4];
    this.root = roots[index % roots.length];
  }

  update(dt, speedRatio = 0, boosting = false, offroad = false, drifting = 0) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const ratio = Math.max(0, Math.min(1.3, speedRatio));
    const targetFreq = 52 + ratio * 170 + (boosting ? 34 : 0);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
    this.engineSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(380 + ratio * 1150 + (boosting ? 700 : 0), now, 0.06);
    const base = this.raceActive ? 0.036 + ratio * 0.028 : 0;
    this.engineGain.gain.setTargetAtTime(base + (boosting ? 0.018 : 0), now, 0.08);
    this.windGain.gain.setTargetAtTime(this.raceActive ? ratio * 0.025 + (offroad ? 0.03 : 0) : 0, now, 0.12);
    this.skidGain.gain.setTargetAtTime(this.raceActive ? drifting * 0.05 + (offroad ? 0.028 : 0) : 0, now, 0.07);

    if (this.musicOn && this.music) this._scheduleMusic(now);
  }

  _scheduleMusic(now) {
    if (this.nextNoteTime < now) this.nextNoteTime = now + 0.05;
    const stepDur = 0.19;
    while (this.nextNoteTime < now + 0.25) {
      const t = this.nextNoteTime;
      const seq = [0, 7, 3, 10, 5, 12, 7, 3, 0, 7, 10, 15, 12, 10, 7, 3];
      const note = seq[this.step % seq.length];
      const freq = this.root * Math.pow(2, note / 12);
      this._pluck(freq, t, 0.14, 0.055, 'triangle');
      if (this.step % 4 === 0) this._pluck(this.root / 2, t, 0.34, 0.075, 'sine');
      if (this.step % 8 === 4) this._pluck(this.root * 1.5, t, 0.2, 0.035, 'sine');
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }

  _pluck(freq, t, dur, vol, type = 'triangle') {
    if (!this.ready) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  beep(freq = 660, dur = 0.12, vol = 0.18, type = 'square') {
    this.ensure();
    if (!this.ready || !this.sound) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  countdown(n) {
    if (n > 0) this.beep(440 + (3 - n) * 80, 0.13, 0.2, 'square');
    else {
      this.beep(880, 0.1, 0.22, 'square');
      setTimeout(() => this.beep(1320, 0.28, 0.2, 'square'), 90);
    }
  }

  boost() {
    this.ensure();
    if (!this.ready || !this.sound) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(300, t); filter.frequency.exponentialRampToValueAtTime(3200, t + 0.28); filter.Q.value = 1.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.45);
  }

  pickup() {
    this.beep(980, 0.07, 0.13, 'triangle');
    setTimeout(() => this.beep(1480, 0.12, 0.12, 'triangle'), 60);
  }

  weatherChange(id) {
    this.ensure();
    if (!this.ready || !this.sound) return;
    if (id === 'storm' || id === 'rain') {
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + 1.7);
    } else {
      this.beep(520, 0.16, 0.07, 'sine');
    }
  }

  finish(win) {
    this.ensure();
    if (!this.ready || !this.sound) return;
    const notes = win ? [523, 659, 784, 1047, 1319] : [392, 523, 659, 784];
    notes.forEach((f, i) => setTimeout(() => this.beep(f, 0.26, 0.16, 'triangle'), i * 110));
  }

  ui() {
    this.ensure();
    this.beep(720, 0.045, 0.05, 'sine');
  }

  crash() {
    this.ensure();
    if (!this.ready || !this.sound) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.24);
  }
}
