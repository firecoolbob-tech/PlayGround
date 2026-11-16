import { clamp, damp, formatTime, mod, TAU, wrapAngle } from './utils.js';
import { Track } from './track.js';
import { Car } from './car.js';
import { AIDriver } from './ai.js';
import { GameAudio } from './audio.js';
import { Renderer3D, Garage3D } from './render3d.js';

const LAPS = 3;
const STEP = 1 / 120;

/* ------------------------------------------------------------------ */
/* DOM                                                                 */
/* ------------------------------------------------------------------ */

const canvas = document.getElementById('game');
const hud = document.getElementById('hud');
const lapNowEl = document.getElementById('lapNow');
const lapTotalEl = document.getElementById('lapTotal');
const posNowEl = document.getElementById('posNow');
const lapTimeEl = document.getElementById('lapTime');
const bestTimeEl = document.getElementById('bestTime');
const lastTimeEl = document.getElementById('lastTime');
const bannerEl = document.getElementById('banner');
const countdownEl = document.getElementById('countdown');
const titleScreen = document.getElementById('titleScreen');
const resultsScreen = document.getElementById('resultsScreen');
const pauseScreen = document.getElementById('pauseScreen');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');
const resultTotal = document.getElementById('resultTotal');
const resultBest = document.getElementById('resultBest');
const resultSpeed = document.getElementById('resultSpeed');
const resultRows = document.getElementById('resultRows');
const resultKicker = document.getElementById('resultKicker');
const unlockNote = document.getElementById('unlockNote');
const garageScreen = document.getElementById('garageScreen');
const garageGrid = document.getElementById('garageGrid');
const garageProgress = document.getElementById('garageProgress');
const garageCanvas = document.getElementById('garageCanvas');
const garageViewName = document.getElementById('garageViewName');
const garageViewTag = document.getElementById('garageViewTag');
const garageBtn = document.getElementById('garageBtn');
const garageCloseBtn = document.getElementById('garageCloseBtn');
const garageBackBtn = document.getElementById('garageBackBtn');
const garageRaceBtn = document.getElementById('garageRaceBtn');
const titleCarName = document.getElementById('titleCarName');
const titleCarDot = document.getElementById('titleCarDot');
const soundBtn = document.getElementById('soundBtn');
const pauseBtn = document.getElementById('pauseBtn');
const startBtn = document.getElementById('startBtn');
const againBtn = document.getElementById('againBtn');
const resultGarageBtn = document.getElementById('resultGarageBtn');
const resultMenuBtn = document.getElementById('resultMenuBtn');
const pauseMenuBtn = document.getElementById('pauseMenuBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const gaugeCanvas = document.getElementById('gauge');
const gaugeCtx = gaugeCanvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas.getContext('2d');

lapTotalEl.textContent = String(LAPS);

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

const track = new Track();

/* ------------------------------------------------------------------ */
/* Cars                                                                */
/* ------------------------------------------------------------------ */

const carDefs = [
  { id: 'ripper', name: 'RIPPER', color: '#ff5a4f', accent: '#8c2119', number: 7, skill: 0.958, lane: -0.55 },
  { id: 'volt', name: 'VOLT', color: '#ffd24a', accent: '#8a6a0d', number: 3, skill: 0.944, lane: 0.5 },
  { id: 'ghost', name: 'GHOST', color: '#a77bff', accent: '#4a2a86', number: 9, skill: 0.928, lane: -0.15 },
  {
    id: 'player',
    name: 'YOU',
    color: '#3ae2ff',
    accent: '#0b7f96',
    number: 1,
    isPlayer: true,
    skill: 1,
    lane: 0,
  },
];

const grid = [
  [72, -48],
  [72, 48],
  [132, -48],
  [132, 48],
];

const cars = carDefs.map((def, i) => {
  const car = new Car(def);
  car.gridIndex = i;
  return car;
});
const playerCar = cars.find((c) => c.isPlayer);
const world3d = new Renderer3D(canvas, track, cars);

/* ------------------------------------------------------------------ */
/* Garage                                                              */
/* ------------------------------------------------------------------ */

const GARAGE_KEY = 'apex-drift-garage-v1';
const BASE_PLAYER_SPEED = 600;
const BASE_PLAYER_ACCEL = 720;
const BASE_PLAYER_GRIP = 7.6;

const PLAYER_CARS = [
  {
    id: 'apex',
    name: 'APEX',
    tag: 'Balanced',
    color: '#3ae2ff',
    accent: '#0b7f96',
    number: 1,
    speed: 1,
    accel: 1,
    grip: 1,
    stats: [6, 6, 6],
    unlock: null,
  },
  {
    id: 'jade',
    name: 'JADE',
    tag: 'Grip',
    color: '#86ef6a',
    accent: '#2f7a28',
    number: 14,
    speed: 0.98,
    accel: 1.02,
    grip: 1.08,
    stats: [6, 7, 9],
    unlock: { type: 'races', count: 1, label: 'Finish 1 race' },
  },
  {
    id: 'blaze',
    name: 'BLAZE',
    tag: 'Launch',
    color: '#ff8a3d',
    accent: '#8f3a0d',
    number: 23,
    speed: 1,
    accel: 1.12,
    grip: 0.95,
    stats: [7, 9, 5],
    unlock: { type: 'races', count: 3, label: 'Finish 3 races' },
  },
  {
    id: 'nova',
    name: 'NOVA',
    tag: 'Top end',
    color: '#ff5fd2',
    accent: '#7a1f62',
    number: 5,
    speed: 1.05,
    accel: 0.98,
    grip: 1.01,
    stats: [9, 6, 7],
    unlock: { type: 'wins', count: 1, label: 'Win 1 race' },
  },
  {
    id: 'onyx',
    name: 'ONYX',
    tag: 'Prototype',
    color: '#d5e0e2',
    accent: '#2a3437',
    number: 0,
    speed: 1.03,
    accel: 1.03,
    grip: 1.05,
    stats: [9, 9, 9],
    unlock: { type: 'wins', count: 3, label: 'Win 3 races' },
  },
];

const garageSave = {
  selected: 'apex',
  races: 0,
  wins: 0,
  unlocked: ['apex'],
};

const garage3d = new Garage3D(garageCanvas);

function isUnlocked(spec) {
  return !spec.unlock || garageSave.unlocked.includes(spec.id);
}

function selectedCarSpec() {
  const spec = PLAYER_CARS.find((car) => car.id === garageSave.selected);
  return spec && isUnlocked(spec) ? spec : PLAYER_CARS[0];
}

function meetsUnlock(spec) {
  if (!spec.unlock) return true;
  if (spec.unlock.type === 'races') return garageSave.races >= spec.unlock.count;
  if (spec.unlock.type === 'wins') return garageSave.wins >= spec.unlock.count;
  return false;
}

function saveGarage() {
  try {
    localStorage.setItem(GARAGE_KEY, JSON.stringify(garageSave));
  } catch {
    /* Storage can be unavailable in private mode; keep the session state. */
  }
}

function loadGarage() {
  try {
    const raw = localStorage.getItem(GARAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (typeof data.selected === 'string') garageSave.selected = data.selected;
        garageSave.races = Math.max(0, Number(data.races) || 0);
        garageSave.wins = Math.max(0, Number(data.wins) || 0);
        if (Array.isArray(data.unlocked)) {
          garageSave.unlocked = data.unlocked.filter((id) => typeof id === 'string');
        }
      }
    }
  } catch {
    /* Corrupt storage simply starts a fresh garage. */
  }
  if (!garageSave.unlocked.includes('apex')) garageSave.unlocked.push('apex');
  for (const spec of PLAYER_CARS) {
    if (spec.unlock && meetsUnlock(spec) && !garageSave.unlocked.includes(spec.id)) {
      garageSave.unlocked.push(spec.id);
    }
  }
  const chosen = PLAYER_CARS.find((car) => car.id === garageSave.selected);
  if (!chosen || !isUnlocked(chosen)) garageSave.selected = 'apex';
  saveGarage();
}

function unlockNewCars() {
  const found = [];
  for (const spec of PLAYER_CARS) {
    if (spec.unlock && !garageSave.unlocked.includes(spec.id) && meetsUnlock(spec)) {
      garageSave.unlocked.push(spec.id);
      found.push(spec);
    }
  }
  if (found.length) saveGarage();
  return found;
}

function carIcon(spec) {
  return `<svg viewBox="0 0 64 96" aria-hidden="true">
    <ellipse cx="32" cy="87" rx="22" ry="7" fill="rgba(0,0,0,0.35)"/>
    <path d="M20 7 Q32 -2 44 7 L52 33 L54 70 Q54 88 32 92 Q10 88 10 70 L12 33 Z" fill="${spec.color}"/>
    <path d="M20 7 Q32 -2 44 7 L48 22 L16 22 Z" fill="${spec.accent}" opacity="0.9"/>
    <rect x="16" y="27" width="32" height="17" rx="7" fill="rgba(7,16,19,0.78)"/>
    <rect x="19" y="48" width="26" height="11" rx="5" fill="rgba(255,255,255,0.1)"/>
    <rect x="22" y="70" width="20" height="8" rx="3" fill="rgba(5,12,14,0.55)"/>
    <rect x="14" y="32" width="5" height="11" rx="2.5" fill="rgba(5,12,14,0.55)"/>
    <rect x="45" y="32" width="5" height="11" rx="2.5" fill="rgba(5,12,14,0.55)"/>
    <rect x="26" y="40" width="12" height="3" rx="1.5" fill="${spec.accent}" opacity="0.8"/>
  </svg>`;
}

function renderGarage() {
  const statLabels = ['SPD', 'ACC', 'GRP'];
  garageGrid.innerHTML = PLAYER_CARS.map((spec) => {
    const unlocked = isUnlocked(spec);
    const selected = garageSave.selected === spec.id;
    const bars = spec.stats
      .map(
        (value, i) =>
          `<span class="car-stat"><span>${statLabels[i]}</span><i><b style="width:${value * 10}%"></b></i></span>`
      )
      .join('');
    const state = unlocked
      ? `<span class="car-state">${selected ? 'Selected' : 'Unlocked'}</span>`
      : `<span class="car-state">Locked</span><span class="car-req">${spec.unlock.label}</span>`;
    return `<button class="car-card${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}" data-car="${spec.id}" type="button" style="--car:${spec.color}" ${unlocked ? '' : 'disabled'}>
      <span class="car-card-art">${carIcon(spec)}</span>
      <span class="car-card-name">${spec.name}</span>
      <span class="car-card-tag">${spec.tag}</span>
      <span class="car-stats">${bars}</span>
      ${state}
    </button>`;
  }).join('');
  const races = garageSave.races;
  const wins = garageSave.wins;
  garageProgress.textContent = `${races} race${races === 1 ? '' : 's'} · ${wins} win${wins === 1 ? '' : 's'}`;
  const active = selectedCarSpec();
  garageViewName.textContent = active.name;
  garageViewTag.textContent = active.tag;
  garageCanvas.setAttribute('aria-label', `${active.name} 3D preview`);
}

function applyPlayerSetup() {
  const spec = selectedCarSpec();
  playerCar.name = spec.name;
  playerCar.color = spec.color;
  playerCar.accent = spec.accent;
  playerCar.number = spec.number;
  playerCar.maxSpeed = BASE_PLAYER_SPEED * spec.speed;
  playerCar.accel = BASE_PLAYER_ACCEL * spec.accel;
  playerCar.grip = BASE_PLAYER_GRIP * spec.grip;
  titleCarName.textContent = spec.name;
  titleCarDot.style.background = spec.color;
  titleCarDot.style.color = spec.color;
  world3d.setCarStyle(playerCar);
  garage3d.setCar(spec);
}

function selectCar(id) {
  const spec = PLAYER_CARS.find((car) => car.id === id);
  if (!spec || !isUnlocked(spec)) return;
  garageSave.selected = id;
  saveGarage();
  applyPlayerSetup();
  renderGarage();
}

function openGarage() {
  if (state.mode !== 'title' && state.mode !== 'results') return;
  renderGarage();
  garageScreen.classList.remove('hidden');
  garage3d.setCar(selectedCarSpec());
  garage3d.setActive(true);
  garage3d.resize();
  requestAnimationFrame(() => garage3d.resize());
}

function closeGarage() {
  garageScreen.classList.add('hidden');
  garage3d.setActive(false);
}

function recordRaceResult(pos) {
  garageSave.races += 1;
  if (pos === 1) garageSave.wins += 1;
  const unlocked = unlockNewCars();
  saveGarage();
  renderGarage();
  return unlocked;
}

const aiDrivers = new Map();
carDefs.forEach((def, i) => {
  if (!def.isPlayer) {
    aiDrivers.set(cars[i], new AIDriver(cars[i], track, { skill: def.skill, lane: def.lane }));
  }
});

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  mode: 'title',
  modeBeforePause: 'racing',
  countdown: 0,
  lastCount: 0,
  raceTime: 0,
  resultsTimer: 0,
  bannerTimer: 0,
  attract: track.length * 0.32,
  hudAccum: 0,
  hudCanvasAccum: 0,
  shake: 0,
  finishPosition: 0,
  goTimer: 0,
  started: false,
};

const camera = { x: track.points[0].x, y: track.points[0].y, zoom: 1 };
const particles = [];
const audio = new GameAudio();
const touch = { left: false, right: false, throttle: false, brake: false, drift: false };
const keys = Object.create(null);

let viewW = 1;
let viewH = 1;
let dprScale = 1;

/* ------------------------------------------------------------------ */
/* Canvas sizing                                                       */
/* ------------------------------------------------------------------ */

function resize() {
  viewW = Math.max(1, window.innerWidth);
  viewH = Math.max(1, window.innerHeight);
  dprScale = Math.min(2, window.devicePixelRatio || 1);
  world3d.resize(viewW, viewH, dprScale);
  garage3d.resize();
}

function baseZoom() {
  return clamp(Math.sqrt(viewW * viewH) / 980, 0.9, 1.12);
}

/* ------------------------------------------------------------------ */
/* Race setup                                                          */
/* ------------------------------------------------------------------ */

function resetRace() {
  cars.forEach((car, i) => {
    const [behind, lateral] = grid[i];
    const slot = track.gridSlot(behind, lateral);
    car.reset(slot);
    car.prog = -behind / track.ds;
    car.progIndex = slot.index;
    car.prevIndex = slot.index;
    car.lapStart = 0;
    car.smokeTimer = 0;
    car.dustTimer = 0;
    const ai = aiDrivers.get(car);
    if (ai) ai.reset();
  });
  state.raceTime = 0;
  state.countdown = 0;
  state.lastCount = 0;
  state.resultsTimer = 0;
  state.bannerTimer = 0;
  state.shake = 0;
  state.finishPosition = 0;
  state.goTimer = 0;
  state.started = false;
  state.hudAccum = 0;
  state.hudCanvasAccum = 0;
  particles.length = 0;
  world3d.clearSkids();
  bannerEl.classList.remove('show');
  countdownEl.className = 'countdown';
  countdownEl.textContent = '';
  camera.x = playerCar.pos.x;
  camera.y = playerCar.pos.y;
  camera.zoom = baseZoom() * 1.02;
  updateHud(0, true);
  drawGauge(0, false);
}

function startRace() {
  audio.init();
  titleScreen.classList.add('hidden');
  resultsScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  garageScreen.classList.add('hidden');
  resetRace();
  state.mode = 'countdown';
  state.countdown = 3.0;
  state.lastCount = 3;
  state.attract = track.length * 0.32;
  hud.classList.add('live');
  showCountdown('3');
  audio.countdown(3);
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

function readInput() {
  const left = Boolean(keys.KeyA || keys.ArrowLeft || touch.left);
  const right = Boolean(keys.KeyD || keys.ArrowRight || touch.right);
  const up = Boolean(keys.KeyW || keys.ArrowUp || touch.throttle);
  const down = Boolean(keys.KeyS || keys.ArrowDown || touch.brake);
  const drift = Boolean(keys.Space || touch.drift);
  return {
    steer: (right ? 1 : 0) - (left ? 1 : 0),
    throttle: up ? 1 : 0,
    brake: down ? 1 : 0,
    handbrake: drift,
  };
}

function clearKeys() {
  for (const key of Object.keys(keys)) keys[key] = false;
  for (const key of Object.keys(touch)) touch[key] = false;
  document.querySelectorAll('.touch-btn.active').forEach((btn) => btn.classList.remove('active'));
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  keys[event.code] = true;
  if (event.repeat) return;

  if (event.code === 'KeyR' && state.mode !== 'title') startRace();
  if (event.code === 'KeyM') toggleSound();
  if (event.code === 'Escape' && !garageScreen.classList.contains('hidden')) {
    closeGarage();
    return;
  }
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (state.mode === 'paused') resumeGame();
    else pauseGame();
  }
  if ((event.code === 'Enter' || event.code === 'NumpadEnter') && state.mode === 'title') {
    startRace();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});
window.addEventListener('blur', clearKeys);

document.querySelectorAll('[data-act]').forEach((btn) => {
  const act = btn.dataset.act;
  const down = (event) => {
    event.preventDefault();
    touch[act] = true;
    btn.classList.add('active');
    if (btn.setPointerCapture && event.pointerId !== undefined) {
      try { btn.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    }
  };
  const up = (event) => {
    event.preventDefault();
    touch[act] = false;
    btn.classList.remove('active');
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', (event) => event.preventDefault());
});

document.addEventListener('contextmenu', (event) => {
  if (event.target.closest('.touch')) event.preventDefault();
});

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

function showCountdown(text) {
  countdownEl.textContent = text;
  countdownEl.className = 'countdown';
  void countdownEl.offsetWidth;
  countdownEl.classList.add('show');
  if (text === 'GO!') countdownEl.classList.add('go');
}

function showBanner(text, duration = 1.8) {
  bannerEl.textContent = text;
  bannerEl.classList.add('show');
  state.bannerTimer = duration;
}

function toggleSound() {
  audio.init();
  const muted = audio.toggleMute();
  soundBtn.classList.toggle('muted', muted);
  soundBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
  if (!muted) audio.beep(660, 0.08, 'square', 0.04);
}

function pauseGame() {
  if (!['racing', 'countdown', 'finished'].includes(state.mode)) return;
  state.modeBeforePause = state.mode;
  state.mode = 'paused';
  pauseScreen.classList.remove('hidden');
  audio.idle();
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  state.mode = state.modeBeforePause;
  pauseScreen.classList.add('hidden');
}

function showTitle() {
  if (state.mode === 'title') return;
  state.mode = 'title';
  state.attract = track.length * 0.32;
  state.shake = 0;
  titleScreen.classList.remove('hidden');
  resultsScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  garageScreen.classList.add('hidden');
  garage3d.setActive(false);
  hud.classList.remove('live');
  clearKeys();
  audio.idle();
}

function showResults() {
  state.mode = 'results';
  const order = standings();
  state.finishPosition = order.indexOf(playerCar) + 1;
  const pos = state.finishPosition;

  const titles = ['VICTORY', 'P2', 'P3', 'P4'];
  const subs = [
    'First across the line. Clean and quick.',
    'So close. The line came up a corner too soon.',
    'On the podium. There is more pace in the car.',
    'Brought it home. Time to find some grip.',
  ];
  resultKicker.innerHTML = '<span class="kicker-rule"></span>Race complete';
  resultTitle.textContent = pos === 1 ? 'VICTORY' : titles[pos - 1] || 'FINISH';
  resultSub.textContent = subs[pos - 1] || 'Race complete.';
  resultTotal.textContent = formatTime(playerCar.finishTime ?? state.raceTime);
  resultBest.textContent = playerCar.bestLap ? formatTime(playerCar.bestLap) : '--:--.---';
  resultSpeed.textContent = `${playerCar.topSpeed} km/h`;

  resultRows.innerHTML = '';
  order.forEach((car, i) => {
    const tr = document.createElement('tr');
    if (car.isPlayer) tr.className = 'you';
    const chip = `<span class="driver-chip" style="background:${car.color}"></span>`;
    const best = car.bestLap ? formatTime(car.bestLap) : '--:--.---';
    tr.innerHTML = `<td>${i + 1}</td><td><span class="driver-cell">${chip}${car.name}</span></td><td>${best}</td>`;
    resultRows.appendChild(tr);
  });

  const unlocked = recordRaceResult(pos);
  if (unlocked.length) {
    const names = unlocked.map((car) => car.name).join(' & ');
    unlockNote.innerHTML = `<b>New car unlocked</b> — ${names}. Open the garage to drive it.`;
    unlockNote.classList.remove('hidden');
  } else {
    unlockNote.classList.add('hidden');
  }

  resultsScreen.classList.remove('hidden');
  pauseScreen.classList.add('hidden');
  bannerEl.classList.remove('show');
  audio.idle();
}

startBtn.addEventListener('click', startRace);
againBtn.addEventListener('click', startRace);
resultGarageBtn.addEventListener('click', openGarage);
resultMenuBtn.addEventListener('click', showTitle);
pauseMenuBtn.addEventListener('click', showTitle);
resumeBtn.addEventListener('click', resumeGame);
restartBtn.addEventListener('click', startRace);
garageBtn.addEventListener('click', openGarage);
garageCloseBtn.addEventListener('click', closeGarage);
garageBackBtn.addEventListener('click', closeGarage);
garageRaceBtn.addEventListener('click', () => {
  closeGarage();
  startRace();
});
garageGrid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-car]');
  if (card) selectCar(card.dataset.car);
});
garageScreen.addEventListener('click', (event) => {
  if (event.target === garageScreen) closeGarage();
});
pauseBtn.addEventListener('click', () => {
  if (state.mode === 'paused') resumeGame();
  else pauseGame();
});
soundBtn.addEventListener('click', toggleSound);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

/* ------------------------------------------------------------------ */
/* Race logic                                                          */
/* ------------------------------------------------------------------ */

function finishCar(car) {
  if (car.finished) return;
  car.finished = true;
  car.finishTime = state.raceTime;
  if (car.isPlayer) {
    state.mode = 'finished';
    state.resultsTimer = 1.25;
    showBanner('FINISH', 2.2);
    audio.finish(true);
    state.shake = Math.max(state.shake, 0.35);
  }
}

function updateProgress() {
  const N = track.N;
  for (const car of cars) {
    let delta = car.prevIndex - car.progIndex;
    delta = ((delta + N / 2 + N * 2) % N) - N / 2;
    car.prog += delta;
    car.progIndex = car.prevIndex;

    if (car.finished) continue;
    const laps = Math.max(0, Math.floor(car.prog / N));
    while (car.laps < laps) {
      car.laps++;
      const lapTime = state.raceTime - car.lapStart;
      if (lapTime > 2) {
        car.lapTimes.push(lapTime);
        if (car.bestLap === null || lapTime < car.bestLap) car.bestLap = lapTime;
      }
      car.lapStart = state.raceTime;
      if (car.isPlayer && car.laps < LAPS) {
        if (car.laps === LAPS - 1) showBanner('FINAL LAP', 2.4);
        else showBanner(`LAP ${car.laps + 1} / ${LAPS}`, 1.5);
        audio.beep(720, 0.1, 'triangle', 0.05);
      }
      if (car.laps >= LAPS) {
        finishCar(car);
        break;
      }
    }
  }
}

function standings() {
  return [...cars].sort((a, b) => {
    if (a.finished && b.finished) {
      if (a.finishTime !== b.finishTime) return a.finishTime - b.finishTime;
      return b.prog - a.prog;
    }
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.prog - a.prog;
  });
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

function spawnParticle(kind, x, y, vx, vy, size, maxLife, extra = {}) {
  if (particles.length > 280) particles.shift();
  particles.push({
    kind,
    x,
    y,
    vx,
    vy,
    size,
    life: maxLife,
    maxLife,
    ...extra,
  });
}

function laySkid(car) {
  world3d.laySkid(car);
}

function updateEffects(dt) {
  for (const car of cars) {
    car.wallSoundCd = Math.max(0, car.wallSoundCd - dt);

    // Barrier scrape: throw sparks and shake the camera on a hard hit.
    if (car.wallHit > 45) {
      const impact = car.wallHit;
      car.wallHit = 0;
      const count = Math.round(clamp(impact / 55, 2, 9));
      for (let k = 0; k < count; k++) {
        spawnParticle(
          'spark',
          car.pos.x + (Math.random() - 0.5) * 18,
          car.pos.y + (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 300,
          (Math.random() - 0.5) * 300,
          1,
          0.22 + Math.random() * 0.3
        );
      }
      if (car.isPlayer) state.shake = Math.max(state.shake, clamp(impact / 320, 0.18, 0.6));
      if (car.wallSoundCd <= 0 && impact > 110) {
        audio.beep(110, 0.06, 'sawtooth', 0.03);
        car.wallSoundCd = 0.2;
      }
    }

    if (car.speed < 40) continue;
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);
    const rearX = car.pos.x - cos * car.length * 0.28;
    const rearY = car.pos.y - sin * car.length * 0.28;

    const smoking = car.speed > 110 && (car.input.handbrake || car.slip > 85);
    if (smoking) {
      laySkid(car);
      car.smokeTimer = (car.smokeTimer || 0) - dt;
      if (car.smokeTimer <= 0) {
        car.smokeTimer = 0.028;
        const side = Math.random() < 0.5 ? -1 : 1;
        const nx = -sin;
        const ny = cos;
        spawnParticle(
          'smoke',
          rearX + nx * 10 * side + (Math.random() - 0.5) * 8,
          rearY + ny * 10 * side + (Math.random() - 0.5) * 8,
          -cos * 26 + (Math.random() - 0.5) * 46,
          -sin * 26 + (Math.random() - 0.5) * 46,
          7 + Math.random() * 7,
          0.72 + Math.random() * 0.45
        );
      }
    }

    if (car.surface === 'grass' && car.speed > 70) {
      car.dustTimer = (car.dustTimer || 0) - dt;
      if (car.dustTimer <= 0) {
        car.dustTimer = 0.055;
        spawnParticle(
          'dust',
          car.pos.x - cos * 18 + (Math.random() - 0.5) * 16,
          car.pos.y - sin * 18 + (Math.random() - 0.5) * 16,
          -cos * 24 + (Math.random() - 0.5) * 40,
          -sin * 24 + (Math.random() - 0.5) * 40,
          6 + Math.random() * 6,
          0.65 + Math.random() * 0.35,
          { tint: Math.random() < 0.5 ? 'green' : 'dirt' }
        );
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const drag = Math.exp(-1.8 * dt);
    p.vx *= drag;
    p.vy *= drag;
  }

  state.shake = Math.max(0, state.shake - dt * 2.0);
  if (state.bannerTimer > 0) {
    state.bannerTimer -= dt;
    if (state.bannerTimer <= 0) bannerEl.classList.remove('show');
  }
}

/* ------------------------------------------------------------------ */
/* Car collisions                                                      */
/* ------------------------------------------------------------------ */

function collideCars() {
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;
      let dist = Math.hypot(dx, dy);
      const minDist = (a.radius + b.radius) * 1.05;
      if (dist >= minDist) continue;
      if (dist < 0.0001) {
        dx = 1;
        dy = 0;
        dist = 1;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      a.pos.x -= nx * overlap * 0.5;
      a.pos.y -= ny * overlap * 0.5;
      b.pos.x += nx * overlap * 0.5;
      b.pos.y += ny * overlap * 0.5;

      const rel = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny;
      if (rel < 0) {
        const impulse = -rel * 0.55;
        a.vel.x -= nx * impulse;
        a.vel.y -= ny * impulse;
        b.vel.x += nx * impulse;
        b.vel.y += ny * impulse;
        if (-rel > 70) {
          const mx = (a.pos.x + b.pos.x) / 2;
          const my = (a.pos.y + b.pos.y) / 2;
          for (let k = 0; k < 5; k++) {
            spawnParticle(
              'spark',
              mx,
              my,
              (Math.random() - 0.5) * 260,
              (Math.random() - 0.5) * 260,
              1,
              0.25 + Math.random() * 0.25
            );
          }
          if (a.isPlayer || b.isPlayer) state.shake = Math.max(state.shake, 0.55);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

function updateCamera(dt) {
  if (state.mode === 'title') {
    state.attract += dt * 190;
    const dist = mod(state.attract, track.length);
    const idx = Math.floor(dist / track.ds) % track.N;
    const p = track.points[idx];
    const t = track.tangents[idx];
    const targetX = p.x + t.x * 165;
    const targetY = p.y + t.y * 165;
    camera.x = damp(camera.x, targetX, 2.0, dt);
    camera.y = damp(camera.y, targetY, 2.0, dt);
    camera.zoom = damp(camera.zoom, baseZoom() * (1.0 + Math.sin(state.attract * 0.0011) * 0.035), 1.2, dt);
    return;
  }

  const look = state.mode === 'countdown' ? 0.02 : 0.14;
  const targetX = playerCar.pos.x + playerCar.vel.x * look;
  const targetY = playerCar.pos.y + playerCar.vel.y * look;
  camera.x = damp(camera.x, targetX, 6.0, dt);
  camera.y = damp(camera.y, targetY, 6.0, dt);

  const speedRatio = clamp(playerCar.speed / playerCar.maxSpeed, 0, 1);
  let zoomTarget = baseZoom() * (1 - 0.1 * speedRatio);
  if (state.mode === 'countdown') zoomTarget *= 1.04;
  camera.zoom = damp(camera.zoom, zoomTarget, 2.6, dt);
}

/* ------------------------------------------------------------------ */
/* Simulation step                                                     */
/* ------------------------------------------------------------------ */

function step(dt) {
  if (state.mode === 'title') {
    updateCamera(dt);
    return;
  }

  if (state.mode === 'paused' || state.mode === 'results') return;

  if (state.mode === 'countdown') {
    state.countdown -= dt;
    if (state.countdown <= 0) {
      state.countdown = 0;
      state.mode = 'racing';
      state.started = true;
      state.raceTime = 0;
      cars.forEach((car) => { car.lapStart = 0; });
      showCountdown('GO!');
      audio.countdown(0);
    } else {
      const label = Math.ceil(state.countdown);
      if (label !== state.lastCount) {
        state.lastCount = label;
        showCountdown(String(label));
        audio.countdown(label);
      }
    }
    updateCamera(dt);
    updateEffects(dt);
    state.hudAccum += dt;
    return;
  }

  if (state.mode === 'finished') {
    state.resultsTimer -= dt;
    if (state.resultsTimer <= 0) {
      showResults();
      return;
    }
  }

  // Inputs
  for (const car of cars) {
    if (car.isPlayer) {
      const input = state.mode === 'racing' ? readInput() : { steer: 0, throttle: 0, brake: 0.5, handbrake: false };
      car.update(dt, input, track);
    } else {
      const driver = aiDrivers.get(car);
      const ai = driver ? driver.update(dt, cars, playerCar) : { steer: 0, throttle: 0, brake: 0, handbrake: false };
      car.update(dt, ai, track);
    }
  }

  collideCars();

  if (state.mode === 'racing') {
    state.raceTime += dt;
    updateProgress();
  }

  updateEffects(dt);
  state.hudAccum += dt;

  if (state.mode === 'racing' && state.raceTime > 0.1) updateCamera(dt);
  else if (state.mode === 'finished') updateCamera(dt);
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

function playerPosition() {
  return standings().indexOf(playerCar) + 1;
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

function updateHud(dt, force = false) {
  if (!force && state.hudAccum < 0.06) return;
  state.hudAccum = 0;

  const lap = clamp(playerCar.laps + 1, 1, LAPS);
  setText(lapNowEl, String(lap));
  setText(posNowEl, String(playerPosition()));

  let currentLap = 0;
  if (state.mode === 'countdown' || state.mode === 'title') currentLap = 0;
  else if (playerCar.finished) currentLap = playerCar.lapTimes[playerCar.lapTimes.length - 1] || 0;
  else currentLap = Math.max(0, state.raceTime - playerCar.lapStart);
  setText(lapTimeEl, formatTime(currentLap));

  setText(bestTimeEl, playerCar.bestLap ? formatTime(playerCar.bestLap) : '--:--.---');
  const last = playerCar.lapTimes[playerCar.lapTimes.length - 1];
  setText(lastTimeEl, last ? formatTime(last) : '--:--.---');

  const bestEl = bestTimeEl;
  bestEl.classList.toggle('record', Boolean(playerCar.bestLap));
}

/* ------------------------------------------------------------------ */
/* Gauge                                                               */
/* ------------------------------------------------------------------ */

function drawGauge(kmh, reverse) {
  const g = gaugeCtx;
  const S = 360;
  g.clearRect(0, 0, S, S);
  g.save();
  g.translate(S / 2, S / 2);

  g.beginPath();
  g.arc(0, 0, 168, 0, TAU);
  g.fillStyle = 'rgba(5, 13, 13, 0.55)';
  g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  g.lineWidth = 1.5;
  g.stroke();

  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
  g.beginPath();
  g.arc(0, 0, 134, start, end);
  g.strokeStyle = 'rgba(255, 255, 255, 0.075)';
  g.lineWidth = 15;
  g.lineCap = 'round';
  g.stroke();

  const ratio = clamp(kmh / 280, 0, 1);
  if (ratio > 0.002) {
    const grad = g.createLinearGradient(-140, 0, 140, 0);
    grad.addColorStop(0, '#3ae2ff');
    grad.addColorStop(0.55, '#9fe86a');
    grad.addColorStop(0.82, '#ffd24a');
    grad.addColorStop(1, '#ff5a4f');
    g.beginPath();
    g.arc(0, 0, 134, start, start + (end - start) * ratio);
    g.strokeStyle = grad;
    g.lineWidth = 11;
    g.stroke();
  }

  // Tick marks
  for (let i = 0; i <= 16; i++) {
    const a = start + ((end - start) * i) / 16;
    const major = i % 4 === 0;
    const r1 = 150;
    const r2 = major ? 162 : 157;
    g.beginPath();
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    g.strokeStyle = major ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)';
    g.lineWidth = major ? 2.5 : 1.5;
    g.stroke();
  }

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#f4fbfa';
  g.font = '700 84px ui-monospace, "SF Mono", Menlo, monospace';
  g.fillText(String(kmh), 0, -4);

  g.fillStyle = 'rgba(184, 208, 208, 0.72)';
  g.font = '700 15px Bahnschrift, "Arial Narrow", sans-serif';
  g.fillText('KM/H', 0, 52);

  if (reverse) {
    g.fillStyle = 'rgba(255, 210, 74, 0.9)';
    g.font = '800 17px Bahnschrift, "Arial Narrow", sans-serif';
    g.fillText('REVERSE', 0, 92);
  } else if (playerCar.handbrake) {
    g.fillStyle = 'rgba(255, 210, 74, 0.9)';
    g.font = '800 17px Bahnschrift, "Arial Narrow", sans-serif';
    g.fillText('DRIFT', 0, 92);
  }

  g.restore();
}

/* ------------------------------------------------------------------ */
/* Minimap                                                             */
/* ------------------------------------------------------------------ */

const miniW = miniCanvas.width;
const miniH = miniCanvas.height;
const miniBounds = track.bounds;
const miniPad = 28;
const miniScale = Math.min(
  (miniW - miniPad * 2) / (miniBounds.maxX - miniBounds.minX),
  (miniH - miniPad * 2) / (miniBounds.maxY - miniBounds.minY)
);
const miniOffX = (miniW - (miniBounds.maxX - miniBounds.minX) * miniScale) / 2 - miniBounds.minX * miniScale;
const miniOffY = (miniH - (miniBounds.maxY - miniBounds.minY) * miniScale) / 2 - miniBounds.minY * miniScale;
const miniPath = new Path2D();
track.points.forEach((p, i) => {
  const x = p.x * miniScale + miniOffX;
  const y = p.y * miniScale + miniOffY;
  if (i === 0) miniPath.moveTo(x, y);
  else miniPath.lineTo(x, y);
});
miniPath.closePath();

const startMini = {
  x: track.points[0].x * miniScale + miniOffX,
  y: track.points[0].y * miniScale + miniOffY,
};

// The track outline never changes, so bake it once and only redraw the
// car markers each frame. Thick dashed strokes are surprisingly costly on
// software-rendered canvases.
const miniBase = document.createElement('canvas');
miniBase.width = miniW;
miniBase.height = miniH;
{
  const g = miniBase.getContext('2d');
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  g.lineWidth = 30;
  g.stroke(miniPath);

  g.strokeStyle = '#5d6a72';
  g.lineWidth = 20;
  g.stroke(miniPath);

  g.strokeStyle = 'rgba(196, 209, 210, 0.32)';
  g.lineWidth = 2;
  g.setLineDash([5, 9]);
  g.stroke(miniPath);
  g.setLineDash([]);

  // Start/finish marker
  const sp = track.points[0];
  const sn = track.normals[0];
  g.strokeStyle = '#f4f1e6';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(
    (sp.x - sn.x * track.width * 0.55) * miniScale + miniOffX,
    (sp.y - sn.y * track.width * 0.55) * miniScale + miniOffY
  );
  g.lineTo(
    (sp.x + sn.x * track.width * 0.55) * miniScale + miniOffX,
    (sp.y + sn.y * track.width * 0.55) * miniScale + miniOffY
  );
  g.stroke();

  g.beginPath();
  g.arc(startMini.x, startMini.y, 2.4, 0, TAU);
  g.fillStyle = 'rgba(58, 226, 255, 0.9)';
  g.fill();
}

function drawMinimap() {
  const g = miniCtx;
  g.clearRect(0, 0, miniW, miniH);
  g.drawImage(miniBase, 0, 0);

  // Car markers
  for (const car of cars) {
    const x = car.pos.x * miniScale + miniOffX;
    const y = car.pos.y * miniScale + miniOffY;
    if (car.isPlayer) {
      g.beginPath();
      g.arc(x, y, 10, 0, TAU);
      g.fillStyle = 'rgba(58, 226, 255, 0.22)';
      g.fill();
      g.beginPath();
      g.arc(x, y, 6.4, 0, TAU);
      g.fillStyle = car.color;
      g.fill();
      g.lineWidth = 2.2;
      g.strokeStyle = '#ffffff';
      g.stroke();
    } else {
      g.beginPath();
      g.arc(x, y, 5.6, 0, TAU);
      g.fillStyle = car.color;
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.lineWidth = 1.6;
      g.stroke();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

function render(dt) {
  world3d.render({ cars, playerCar, particles, state, camera, dt });
}

/* ------------------------------------------------------------------ */
/* Frame loop                                                          */
/* ------------------------------------------------------------------ */

let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (!Number.isFinite(dt) || dt < 0) dt = 0;
  dt = Math.min(dt, 0.1);

  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < 12) {
    step(STEP);
    accumulator -= STEP;
    steps++;
  }
  if (steps === 12) accumulator = 0;

  updateHud(dt);

  // HUD canvases are hidden on the title screen and don't need to run at
  // display refresh rate. 20 Hz keeps the needle and map smooth while
  // cutting a big chunk of per-frame canvas work on low-end devices.
  state.hudCanvasAccum += dt;
  if (state.mode !== 'title' && state.hudCanvasAccum >= 0.05) {
    state.hudCanvasAccum = 0;
    const kmh = playerCar.kmh;
    drawGauge(kmh, playerCar.input.brake > 0.1 && playerCar.speed < 5);
    drawMinimap();
  }

  render(dt);
  garage3d.update(dt);
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

resize();
window.addEventListener('resize', resize);
loadGarage();
unlockNewCars();
applyPlayerSetup();
renderGarage();
resetRace();
state.attract = track.length * 0.12;

// Start the attract camera somewhere interesting rather than on the grid.
{
  const idx = Math.floor((state.attract / track.ds)) % track.N;
  const p = track.points[idx];
  camera.x = p.x;
  camera.y = p.y;
  camera.zoom = baseZoom();
}

drawGauge(0, false);
drawMinimap();
requestAnimationFrame(frame);

// Debug handle used for automated visual/behaviour checks.
window.__apex = {
  cars,
  track,
  state,
  camera,
  playerCar,
  startRace,
  world3d,
  garage3d,
  renderer3d: world3d,
};
