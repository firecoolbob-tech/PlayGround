import { store } from './store.js';
import { World } from './world.js';
import { RaceGame } from './race.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';

const boot = document.getElementById('boot');
const fatal = document.getElementById('fatal');
const fatalMsg = document.getElementById('fatal-msg');
const canvas = document.getElementById('gl');
const app = document.getElementById('app');

let world = null;
let race = null;
let ui = null;
let raf = 0;
let lastFrame = 0;
let running = false;

function showFatal(message) {
  running = false;
  cancelAnimationFrame(raf);
  if (boot) boot.classList.add('done');
  if (fatalMsg) fatalMsg.textContent = message;
  if (fatal) fatal.hidden = false;
  if (app) app.classList.add('faulted');
}

function dismissBoot() {
  if (!boot || boot.classList.contains('done')) return;
  boot.classList.add('done');
  setTimeout(() => { if (boot) boot.remove(); }, 650);
}

function tick(now) {
  if (!running) return;
  raf = requestAnimationFrame(tick);
  const dt = Math.min(Math.max(0, now - lastFrame) / 1000 || 0.016, 0.05);
  lastFrame = now;
  const t = now / 1000;
  try {
    world.update(dt, t);
    race.update(dt, t);
    world.render();
  } catch (err) {
    console.error('Frame failure', err);
    showFatal('The 3D scene hit a rendering fault. Reload to recover.');
  }
}

function bootGame() {
  if (!canvas) throw new Error('Missing 3D canvas.');
  if (app) app.classList.add('booting');

  world = new World(canvas);
  world.resize();

  race = new RaceGame(world, store);
  const audio = new AudioEngine(store);
  ui = new UI(store, world, race, audio);
  window.__apex = { store, world, race, ui, audio };

  // Keep the canvas flush with the app shell on every layout change.
  world.resize();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => world.resize());
    ro.observe(app || document.documentElement);
  }
  window.addEventListener('resize', () => world.resize(), { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(() => world.resize(), 120), { passive: true });

  // Periodic autosave alongside the visibility/pagehide save hooks.
  setInterval(() => store.save(), 15000);

  if (app) {
    app.classList.remove('booting');
    app.classList.add('ready');
  }
  requestAnimationFrame(() => {
    world.resize();
    dismissBoot();
  });

  running = true;
  lastFrame = performance.now();
  raf = requestAnimationFrame(tick);
}

function wireFatalActions() {
  const reload = document.getElementById('fatal-reload');
  const reset = document.getElementById('fatal-reset');
  if (reload) reload.addEventListener('click', () => window.location.reload());
  if (reset) reset.addEventListener('click', () => {
    try { localStorage.removeItem('apexrip_save_v2'); } catch {}
    window.location.reload();
  });
}

wireFatalActions();

window.addEventListener('error', (e) => {
  if (running || !world) return;
  showFatal(e.message || 'Unexpected startup error.');
});
window.addEventListener('unhandledrejection', (e) => {
  if (running) return;
  showFatal(e.reason?.message || 'Unexpected startup error.');
});

try {
  bootGame();
} catch (err) {
  console.error('APEX//RIP failed to start', err);
  showFatal(
    err?.message?.includes('WebGL')
      ? 'WebGL could not start on this device. Try a different browser or reset the save.'
      : 'The garage could not be assembled. Reload the page or reset the save.'
  );
}
