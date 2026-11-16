import { clamp } from './utils.js';

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineGain = null;
    this.tyreGain = null;
    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.6;
    master.connect(ctx.destination);
    this.master = master;

    // Engine: two detuned oscillators through a low-pass filter.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 1.1;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0.0001;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 60;
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 30;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.55;

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    osc1.start();
    osc2.start();

    this.filter = filter;
    this.engineGain = engineGain;
    this.osc1 = osc1;
    this.osc2 = osc2;

    // Tyre screech: band-passed noise.
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1450;
    band.Q.value = 0.85;

    const tyreGain = ctx.createGain();
    tyreGain.gain.value = 0.0001;

    noise.connect(band);
    band.connect(tyreGain);
    tyreGain.connect(master);
    noise.start();

    this.tyreGain = tyreGain;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.03);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  update({ speedRatio = 0, throttle = 0, slip = 0, active = true, surface = 'asphalt' }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freq = 54 + speedRatio * 172 + throttle * 12;
    this.osc1.frequency.setTargetAtTime(freq, now, 0.06);
    this.osc2.frequency.setTargetAtTime(freq * 0.5, now, 0.06);
    this.filter.frequency.setTargetAtTime(
      300 + speedRatio * 1050 + throttle * 220 + (surface === 'grass' ? 160 : 0),
      now,
      0.08
    );
    this.engineGain.gain.setTargetAtTime(active ? 0.055 + throttle * 0.05 + speedRatio * 0.02 : 0.012, now, 0.12);
    const slipAmount = clamp(slip / 520, 0, 1);
    this.tyreGain.gain.setTargetAtTime(active ? slipAmount * 0.14 : 0.0001, now, 0.07);
  }

  idle() {
    if (!this.ctx) return;
    this.update({ speedRatio: 0, throttle: 0, slip: 0, active: false });
  }

  beep(freq = 440, duration = 0.12, type = 'square', volume = 0.07) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  countdown(step) {
    this.beep(step > 0 ? 520 : 880, step > 0 ? 0.14 : 0.42, 'square', 0.09);
    if (step === 0) this.beep(1320, 0.5, 'triangle', 0.05);
  }

  finish(win = false) {
    if (!this.ctx) return;
    const notes = win ? [523.25, 659.25, 783.99, 1046.5] : [392, 493.88, 587.33];
    notes.forEach((freq, i) => {
      setTimeout(() => this.beep(freq, 0.24, 'triangle', 0.08), i * 130);
    });
  }
}
