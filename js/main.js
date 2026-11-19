import { clamp, damp, formatTime, mod, TAU, wrapAngle } from './utils.js';
import { Track, WORLD } from './track.js';
import { Car } from './car.js';
import { AIDriver } from './ai.js';
import { GameAudio } from './audio.js';
import { Renderer3D, Garage3D } from './render3d.js';
import { Ramps, autoRampDefs } from './ramps.js';
import { LOCATIONS, getLocation } from './locations.js';

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
const titleTagline = document.getElementById('titleTagline');
const titleFoot = document.getElementById('titleFoot');
const titleKicker = document.getElementById('titleKicker');
const trackListEl = document.getElementById('trackList');
const trackWinsEl = document.getElementById('trackWins');
const garageSub = document.getElementById('garageSub');
const soundBtn = document.getElementById('soundBtn');
const pauseBtn = document.getElementById('pauseBtn');
const camBtn = document.getElementById('camBtn');
const builderBtn = document.getElementById('builderBtn');
const builderScreen = document.getElementById('builderScreen');
const builderGrid = document.getElementById('builderGrid');
const builderStatus = document.getElementById('builderStatus');
const builderRaceBtn = document.getElementById('builderRaceBtn');
const builderCancelBtn = document.getElementById('builderCancelBtn');
const builderCloseBtn = document.getElementById('builderCloseBtn');
const builderClearBtn = document.getElementById('builderClearBtn');
const builderPresetBtn = document.getElementById('builderPresetBtn');
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
/* Track layouts                                                       */
/* ------------------------------------------------------------------ */

const CUSTOM_COLS = 11;
const CUSTOM_ROWS = 7;
const CUSTOM_CELL = 300;
const CUSTOM_WIDTH = 164;

const keyOf = (cell) => `${cell.c},${cell.r}`;

function makePresetCells() {
  const cells = [];
  const left = 1;
  const right = 9;
  const top = 1;
  const bottom = 5;
  for (let c = left; c <= right; c++) {
    cells.push({ c, r: top, ramp: c === 4 });
    cells.push({ c, r: bottom, ramp: c === 6 });
  }
  for (let r = top + 1; r < bottom; r++) {
    cells.push({ c: left, r, ramp: false });
    cells.push({ c: right, r, ramp: false });
  }
  return cells;
}

function sanitizeCells(input) {
  if (!Array.isArray(input)) return null;
  const seen = new Set();
  const cells = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const c = Math.round(Number(raw.c));
    const r = Math.round(Number(raw.r));
    if (!Number.isFinite(c) || !Number.isFinite(r)) continue;
    if (c < 0 || c >= CUSTOM_COLS || r < 0 || r >= CUSTOM_ROWS) continue;
    const key = `${c},${r}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push({ c, r, ramp: Boolean(raw.ramp) });
  }
  return cells;
}

/**
 * A valid builder loop is a single connected cycle of four-way neighbours.
 * Each tile must touch exactly two other tiles. This rejects blobs, branches,
 * diagonal joins and open lines before they become an undrivable circuit.
 */
function traceBuilderLoop(cells) {
  if (!Array.isArray(cells) || cells.length < 8) {
    return { ok: false, error: 'Paint at least 8 track tiles to make a loop.' };
  }
  const map = new Map();
  for (const cell of cells) map.set(keyOf(cell), cell);

  const neighbours = (cell) =>
    [
      map.get(`${cell.c + 1},${cell.r}`),
      map.get(`${cell.c - 1},${cell.r}`),
      map.get(`${cell.c},${cell.r + 1}`),
      map.get(`${cell.c},${cell.r - 1}`),
    ].filter(Boolean);

  for (const cell of cells) {
    if (neighbours(cell).length !== 2) {
      return {
        ok: false,
        error: 'Every tile needs exactly two neighbours. Erase branches or fill diagonal gaps.',
      };
    }
  }

  const route = [];
  let previous = null;
  let current = cells[0];
  let closed = false;
  for (let guard = 0; guard <= cells.length; guard++) {
    route.push(current);
    const options = neighbours(current).filter((cell) => cell !== previous);
    const next = options[0];
    if (!next) break;
    if (next === route[0]) {
      closed = true;
      break;
    }
    if (route.includes(next)) break;
    previous = current;
    current = next;
  }

  if (!closed || route.length !== cells.length) {
    return { ok: false, error: 'The tiles must form one closed loop, not separate paths.' };
  }
  return { ok: true, route };
}

function layoutFromCells(cells) {
  const trace = traceBuilderLoop(cells);
  if (!trace.ok) throw new Error(trace.error);
  const route = trace.route;
  let minC = Infinity;
  let maxC = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;
  for (const cell of route) {
    minC = Math.min(minC, cell.c);
    maxC = Math.max(maxC, cell.c);
    minR = Math.min(minR, cell.r);
    maxR = Math.max(maxR, cell.r);
  }
  const averageC = (minC + maxC) / 2;
  const averageR = (minR + maxR) / 2;
  const toWorld = (cell) => ({
    x: WORLD.w / 2 + (cell.c - averageC) * CUSTOM_CELL,
    y: WORLD.h / 2 + (cell.r - averageR) * CUSTOM_CELL,
  });
  const points = route.map(toWorld);
  const rampAnchors = route.filter((cell) => cell.ramp).map(toWorld);
  return {
    layout: {
      cx: WORLD.w / 2,
      cy: WORLD.h / 2,
      points,
      width: CUSTOM_WIDTH,
      chaikin: 3,
      smoothPasses: 1,
      rawCount: points.length * 8,
    },
    rampAnchors,
  };
}

function makeCustomTrackData(cells) {
  try {
    return layoutFromCells(cells);
  } catch {
    return layoutFromCells(makePresetCells());
  }
}

let customCells = makePresetCells();
let customTrackData = makeCustomTrackData(customCells);

function createTrackForLocation(loc) {
  if (loc.id === 'custom') {
    return new Track(customTrackData.layout);
  }
  return new Track(loc.layout);
}

function createRampsForLocation(loc, nextTrack) {
  if (loc.id === 'custom' && customTrackData.rampAnchors.length) {
    const defs = customTrackData.rampAnchors.map((anchor, index) => {
      const near = nextTrack.nearest(anchor.x, anchor.y);
      return {
        index: near.index,
        offset: 0,
        width: nextTrack.width * 0.74,
        length: 158,
        height: 32 + (index % 2) * 4,
      };
    });
    // Two builder ramp tiles can land on the same sample after smoothing.
    const unique = [];
    const used = new Set();
    for (const def of defs) {
      if (!used.has(def.index)) {
        used.add(def.index);
        unique.push(def);
      }
    }
    return new Ramps(nextTrack, unique);
  }
  return new Ramps(nextTrack, autoRampDefs(nextTrack, loc.rampCount || 3));
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

let track = createTrackForLocation(getLocation('ridge'));
let ramps = createRampsForLocation(getLocation('ridge'), track);

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
const world3d = new Renderer3D(canvas, track, cars, ramps);

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
  {
    id: 'talon',
    name: 'TALON',
    tag: 'Night runner',
    color: '#37e0a1',
    accent: '#0c6d4d',
    number: 11,
    speed: 1.02,
    accel: 1.02,
    grip: 1.04,
    stats: [8, 7, 8],
    unlock: { type: 'trackWins', track: 'neon', count: 1, label: 'Win at Neon Bay' },
  },
  {
    id: 'ember',
    name: 'EMBER',
    tag: 'Desert heat',
    color: '#ff7043',
    accent: '#7d2a12',
    number: 44,
    speed: 1.05,
    accel: 1.05,
    grip: 0.97,
    stats: [9, 8, 6],
    unlock: { type: 'trackWins', track: 'canyon', count: 1, label: 'Win at Canyon Dawn' },
  },
  {
    id: 'frost',
    name: 'FROST',
    tag: 'Ice grip',
    color: '#8fdcff',
    accent: '#28607a',
    number: 18,
    speed: 0.99,
    accel: 1,
    grip: 1.13,
    stats: [7, 8, 10],
    unlock: { type: 'trackWins', track: 'alpine', count: 1, label: 'Win at Alpine Night' },
  },
  {
    id: 'viper',
    name: 'VIPER',
    tag: 'Neon outlaw',
    color: '#b6ff3d',
    accent: '#4d7a0c',
    number: 77,
    speed: 1.07,
    accel: 1.07,
    grip: 1,
    stats: [10, 9, 7],
    unlock: { type: 'trackWins', track: 'neon', count: 2, label: 'Win twice at Neon Bay' },
  },
  {
    id: 'spectre',
    name: 'SPECTRE',
    tag: 'Circuit master',
    color: '#c9b6ff',
    accent: '#4a3a8f',
    number: 13,
    speed: 1.08,
    accel: 1.06,
    grip: 1.1,
    stats: [10, 10, 10],
    unlock: {
      type: 'tour',
      tracks: ['neon', 'alpine', 'canyon'],
      label: 'Win at Neon, Alpine & Canyon',
    },
  },
  {
    id: 'gumdrop',
    name: 'GUMDROP',
    tag: 'Sugar grip',
    color: '#ff86c8',
    accent: '#8f2d61',
    number: 21,
    speed: 0.98,
    accel: 1.05,
    grip: 1.17,
    stats: [7, 8, 10],
    unlock: { type: 'trackWins', track: 'candy', count: 1, label: 'Win at Candyland' },
  },
  {
    id: 'wraith',
    name: 'WRAITH',
    tag: 'Mansion phantom',
    color: '#9dffb0',
    accent: '#2d7a48',
    number: 66,
    speed: 1.09,
    accel: 1.03,
    grip: 1.06,
    stats: [10, 8, 8],
    unlock: { type: 'trackWins', track: 'haunt', count: 1, label: 'Win at Haunted House' },
  },
  {
    id: 'prism',
    name: 'PRISM',
    tag: 'Factory prototype',
    color: '#ffd7f2',
    accent: '#a13d8f',
    number: 99,
    speed: 1.06,
    accel: 1.1,
    grip: 1.12,
    stats: [10, 10, 9],
    unlock: { type: 'wins', count: 5, label: 'Win 5 races' },
  },
];

const garageSave = {
  selected: 'apex',
  races: 0,
  wins: 0,
  unlocked: ['apex'],
  trackWins: {},
  track: 'ridge',
  custom: [],
};

let selectedLocation = 'ridge';

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
  if (spec.unlock.type === 'trackWins') {
    return (garageSave.trackWins[spec.unlock.track] || 0) >= spec.unlock.count;
  }
  if (spec.unlock.type === 'tour') {
    return spec.unlock.tracks.every(
      (track) => (garageSave.trackWins[track] || 0) >= 1
    );
  }
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
        if (data.trackWins && typeof data.trackWins === 'object') {
          for (const loc of LOCATIONS) {
            garageSave.trackWins[loc.id] = Math.max(0, Number(data.trackWins[loc.id]) || 0);
          }
        }
        if (typeof data.track === 'string' && LOCATIONS.some((loc) => loc.id === data.track)) {
          selectedLocation = data.track;
        }
        if (Array.isArray(data.custom)) {
          const clean = sanitizeCells(data.custom);
          if (clean && traceBuilderLoop(clean).ok) customCells = clean;
        }
        if (Array.isArray(data.unlocked)) {
          garageSave.unlocked = data.unlocked.filter((id) => typeof id === 'string');
        }
      }
    }
  } catch {
    /* Corrupt storage simply starts a fresh garage. */
  }
  if (!garageSave.unlocked.includes('apex')) garageSave.unlocked.push('apex');
  for (const loc of LOCATIONS) {
    garageSave.trackWins[loc.id] = Math.max(0, Number(garageSave.trackWins[loc.id]) || 0);
  }
  garageSave.track = selectedLocation;
  customTrackData = makeCustomTrackData(customCells);
  garageSave.custom = customCells.map((cell) => ({ c: cell.c, r: cell.r, ramp: Boolean(cell.ramp) }));
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
  const circuitWins = LOCATIONS.filter((loc) => (garageSave.trackWins[loc.id] || 0) > 0).length;
  garageProgress.textContent = `${races} race${races === 1 ? '' : 's'} · ${wins} win${wins === 1 ? '' : 's'} · ${circuitWins}/${LOCATIONS.length} circuits won`;
  const remaining = PLAYER_CARS.filter((spec) => !isUnlocked(spec)).length;
  garageSub.textContent =
    remaining === 0
      ? 'Every car is in the garage. Pick a favourite and defend the line.'
      : `${remaining} car${remaining === 1 ? '' : 's'} still locked. Win races across every circuit to bring them home.`;
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

function hexColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function renderTrackList() {
  trackListEl.innerHTML = LOCATIONS.map((loc) => {
    const wins = garageSave.trackWins[loc.id] || 0;
    const selected = loc.id === selectedLocation;
    return `<button class="track-chip${selected ? ' selected' : ''}" data-track="${loc.id}" type="button"
      style="--loc:${loc.accent};--sky-a:${hexColor(loc.sky.top)};--sky-b:${hexColor(loc.sky.horizon)}"
      aria-pressed="${selected ? 'true' : 'false'}" aria-label="${loc.name}, ${loc.tag}">
      <span class="track-swatch" aria-hidden="true"><i class="track-orb"></i>${loc.night ? '<i class="track-star"></i>' : ''}</span>
      <span class="track-copy"><b>${loc.short}</b><small>${loc.chip || loc.tag}</small></span>
      ${wins ? `<span class="track-wins">${wins}W</span>` : ''}
    </button>`;
  }).join('');
  const loc = getLocation(selectedLocation);
  const wins = garageSave.trackWins[loc.id] || 0;
  trackWinsEl.textContent = wins
    ? `${wins} win${wins === 1 ? '' : 's'} here`
    : 'No wins here yet';
}

function applyLocationUI() {
  const loc = getLocation(selectedLocation);
  titleKicker.textContent = `3D arcade racing · ${loc.tag}`;
  titleTagline.textContent = loc.blurb;
  titleFoot.textContent = `${loc.name} · 3 LAPS · 4 DRIVERS`;
  renderTrackList();
}

function swapTrackForLocation(loc) {
  track = createTrackForLocation(loc);
  ramps = createRampsForLocation(loc, track);
  world3d.setTrack(track, ramps);
  aiDrivers.forEach((driver) => {
    driver.track = track;
  });
  state.attract = track.length * 0.32;
  camera.x = track.points[0].x;
  camera.y = track.points[0].y;
  camera.zoom = baseZoom();
  setupMinimap();
  world3d.setLocation(loc);
  resetRace();
  state.attract = track.length * 0.12;
}

/* ------------------------------------------------------------------ */
/* Track builder                                                       */
/* ------------------------------------------------------------------ */

let builderCells = [];
let builderTool = 'track';
let builderPainting = false;

function openBuilder() {
  if (state.mode !== 'title' && state.mode !== 'results') return;
  builderCells = customCells.map((cell) => ({ ...cell }));
  builderTool = 'track';
  builderScreen.classList.remove('hidden');
  builderRaceBtn.disabled = false;
  document.querySelectorAll('[data-build-tool]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.buildTool === builderTool);
  });
  renderBuilderGrid();
}

function closeBuilder() {
  builderScreen.classList.add('hidden');
  builderPainting = false;
}

function renderBuilderGrid() {
  const trace = traceBuilderLoop(builderCells);
  const map = new Map(builderCells.map((cell) => [keyOf(cell), cell]));
  const start = trace.ok ? trace.route[0] : null;
  const parts = [];
  for (let r = 0; r < CUSTOM_ROWS; r++) {
    for (let c = 0; c < CUSTOM_COLS; c++) {
      const cell = map.get(`${c},${r}`);
      const classes = ['build-cell'];
      if (cell) classes.push('on');
      if (cell && cell.ramp) classes.push('ramp');
      if (start && cell === start) classes.push('start');
      parts.push(
        `<button class="${classes.join(' ')}" data-c="${c}" data-r="${r}" type="button" aria-label="Grid ${c + 1}, ${r + 1}${cell ? (cell.ramp ? ', ramp tile' : ', track tile') : ', empty'}">
          <span>${cell ? (cell.ramp ? 'R' : start && cell === start ? 'S' : '') : ''}</span>
        </button>`
      );
    }
  }
  builderGrid.innerHTML = parts.join('');
  updateBuilderStatus(trace);
}

function updateBuilderStatus(trace = traceBuilderLoop(builderCells)) {
  if (trace.ok) {
    const ramps = builderCells.filter((cell) => cell.ramp).length;
    builderStatus.textContent = `Loop ready · ${builderCells.length} tiles · ${ramps} ramp${ramps === 1 ? '' : 's'}`;
    builderStatus.classList.remove('error');
    builderRaceBtn.disabled = false;
  } else {
    builderStatus.textContent = trace.error;
    builderStatus.classList.add('error');
    builderRaceBtn.disabled = true;
  }
}

function applyBuilderTool(c, r) {
  const index = builderCells.findIndex((cell) => cell.c === c && cell.r === r);
  let changed = false;
  if (builderTool === 'erase') {
    if (index >= 0) {
      builderCells.splice(index, 1);
      changed = true;
    }
  } else if (builderTool === 'track') {
    if (index < 0) {
      builderCells.push({ c, r, ramp: false });
      changed = true;
    }
  } else if (builderTool === 'ramp') {
    if (index < 0) {
      builderCells.push({ c, r, ramp: true });
      changed = true;
    } else if (!builderCells[index].ramp) {
      builderCells[index].ramp = true;
      changed = true;
    }
  }
  if (changed) renderBuilderGrid();
}

function buildAndRace() {
  const trace = traceBuilderLoop(builderCells);
  if (!trace.ok) {
    updateBuilderStatus(trace);
    audio.beep(140, 0.16, 'sawtooth', 0.04);
    return;
  }
  customCells = builderCells.map((cell) => ({ ...cell }));
  customTrackData = makeCustomTrackData(customCells);
  garageSave.custom = customCells.map((cell) => ({
    c: cell.c,
    r: cell.r,
    ramp: Boolean(cell.ramp),
  }));
  selectedLocation = 'custom';
  garageSave.track = 'custom';
  saveGarage();
  closeBuilder();
  swapTrackForLocation(getLocation('custom'));
  applyLocationUI();
  startRace();
}

const CAMERA_MODES = ['chase', 'top', 'hood'];
const CAMERA_LABELS = { chase: 'CHASE', top: 'TOP-DOWN', hood: 'HOOD' };

function cycleCamera() {
  const index = CAMERA_MODES.indexOf(state.cameraMode);
  state.cameraMode = CAMERA_MODES[(index + 1) % CAMERA_MODES.length];
  const label = CAMERA_LABELS[state.cameraMode];
  if (state.mode !== 'title') showBanner(`CAMERA · ${label}`, 1.1);
  if (camBtn) camBtn.setAttribute('aria-label', `Camera: ${label}`);
  audio.beep(760, 0.05, 'square', 0.03);
}

function selectLocation(id) {
  if (!LOCATIONS.some((loc) => loc.id === id)) return;
  if (id === selectedLocation && state.mode === 'title') return;
  selectedLocation = id;
  garageSave.track = id;
  saveGarage();
  swapTrackForLocation(getLocation(id));
  applyLocationUI();
  audio.init();
  audio.beep(680, 0.06, 'triangle', 0.03);
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
  if (pos === 1) {
    garageSave.wins += 1;
    garageSave.trackWins[selectedLocation] =
      (garageSave.trackWins[selectedLocation] || 0) + 1;
  }
  const unlocked = unlockNewCars();
  saveGarage();
  renderGarage();
  renderTrackList();
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
  cameraMode: 'chase',
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
  const loc = getLocation(selectedLocation);
  world3d.setLocation(loc);
  titleScreen.classList.add('hidden');
  resultsScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  garageScreen.classList.add('hidden');
  builderScreen.classList.add('hidden');
  resetRace();
  state.mode = 'countdown';
  state.countdown = 3.0;
  state.lastCount = 3;
  state.attract = track.length * 0.32;
  hud.classList.add('live');
  showBanner(`${loc.name} · 3 LAPS`, 2.4);
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
  if (event.code === 'KeyC' && state.mode !== 'title') cycleCamera();
  if (event.code === 'Escape' && !builderScreen.classList.contains('hidden')) {
    closeBuilder();
    return;
  }
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
  builderScreen.classList.add('hidden');
  garage3d.setActive(false);
  hud.classList.remove('live');
  clearKeys();
  applyLocationUI();
  audio.idle();
}

function showResults() {
  state.mode = 'results';
  const order = standings();
  state.finishPosition = order.indexOf(playerCar) + 1;
  const pos = state.finishPosition;
  const loc = getLocation(selectedLocation);

  const titles = ['VICTORY', 'P2', 'P3', 'P4'];
  const subs = [
    `First across the line at ${loc.short}. Clean and quick.`,
    `So close at ${loc.short}. The line came up a corner too soon.`,
    `On the podium at ${loc.short}. There is more pace in the car.`,
    `Brought it home at ${loc.short}. Time to find some grip.`,
  ];
  resultKicker.innerHTML = `<span class="kicker-rule"></span>${loc.name} · Race complete`;
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
trackListEl.addEventListener('click', (event) => {
  const card = event.target.closest('[data-track]');
  if (card) selectLocation(card.dataset.track);
});
garageScreen.addEventListener('click', (event) => {
  if (event.target === garageScreen) closeGarage();
});
builderBtn.addEventListener('click', openBuilder);
builderCloseBtn.addEventListener('click', closeBuilder);
builderCancelBtn.addEventListener('click', closeBuilder);
builderScreen.addEventListener('click', (event) => {
  if (event.target === builderScreen) closeBuilder();
});
builderClearBtn.addEventListener('click', () => {
  builderCells = [];
  renderBuilderGrid();
});
builderPresetBtn.addEventListener('click', () => {
  builderCells = makePresetCells();
  renderBuilderGrid();
});
builderRaceBtn.addEventListener('click', buildAndRace);
document.querySelectorAll('[data-build-tool]').forEach((btn) => {
  btn.addEventListener('click', () => {
    builderTool = btn.dataset.buildTool;
    document.querySelectorAll('[data-build-tool]').forEach((other) => {
      other.classList.toggle('active', other === btn);
    });
  });
});
builderGrid.addEventListener('pointerdown', (event) => {
  const cell = event.target.closest('[data-c]');
  if (!cell) return;
  event.preventDefault();
  builderPainting = true;
  applyBuilderTool(Number(cell.dataset.c), Number(cell.dataset.r));
});
builderGrid.addEventListener('pointerover', (event) => {
  if (!builderPainting) return;
  const cell = event.target.closest('[data-c]');
  if (!cell) return;
  applyBuilderTool(Number(cell.dataset.c), Number(cell.dataset.r));
});
window.addEventListener('pointerup', () => {
  builderPainting = false;
});
camBtn.addEventListener('click', cycleCamera);
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

    // Touchdown: a burst of sparks and dust, scaled by fall speed.
    if (car.landImpact > 45) {
      const impact = car.landImpact;
      car.landImpact = 0;
      const count = Math.round(clamp(impact / 38, 4, 14));
      for (let k = 0; k < count; k++) {
        const ang = (k / count) * TAU + Math.random() * 0.5;
        const push = 70 + Math.random() * 150;
        spawnParticle(
          'spark',
          car.pos.x + Math.cos(ang) * 12,
          car.pos.y + Math.sin(ang) * 12,
          Math.cos(ang) * push,
          Math.sin(ang) * push,
          1,
          0.18 + Math.random() * 0.24,
          { height: car.y }
        );
        if (k % 2 === 0) {
          spawnParticle(
            'dust',
            car.pos.x + Math.cos(ang) * 16,
            car.pos.y + Math.sin(ang) * 16,
            Math.cos(ang) * push * 0.55,
            Math.sin(ang) * push * 0.55,
            6 + Math.random() * 6,
            0.55 + Math.random() * 0.35,
            { tint: 'dirt', height: car.y }
          );
        }
      }
      if (car.isPlayer) {
        state.shake = Math.max(state.shake, clamp(impact / 520, 0.14, 0.55));
        if (car.wallSoundCd <= 0) {
          audio.beep(72, 0.12, 'triangle', 0.05);
          car.wallSoundCd = 0.22;
        }
      }
    }

    if (car.airborne || car.ramp) continue;
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
      car.update(dt, input, track, ramps);
    } else {
      const driver = aiDrivers.get(car);
      const ai = driver ? driver.update(dt, cars, playerCar) : { steer: 0, throttle: 0, brake: 0, handbrake: false };
      car.update(dt, ai, track, ramps);
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
const miniPad = 28;
let miniScale = 1;
let miniOffX = 0;
let miniOffY = 0;
let miniPath = null;
let startMini = { x: 0, y: 0 };
let miniBase = null;

function setupMinimap() {
  const bounds = track.bounds;
  miniScale = Math.min(
    (miniW - miniPad * 2) / (bounds.maxX - bounds.minX),
    (miniH - miniPad * 2) / (bounds.maxY - bounds.minY)
  );
  miniOffX = (miniW - (bounds.maxX - bounds.minX) * miniScale) / 2 - bounds.minX * miniScale;
  miniOffY = (miniH - (bounds.maxY - bounds.minY) * miniScale) / 2 - bounds.minY * miniScale;
  miniPath = new Path2D();
  track.points.forEach((p, i) => {
    const x = p.x * miniScale + miniOffX;
    const y = p.y * miniScale + miniOffY;
    if (i === 0) miniPath.moveTo(x, y);
    else miniPath.lineTo(x, y);
  });
  miniPath.closePath();

  startMini = {
    x: track.points[0].x * miniScale + miniOffX,
    y: track.points[0].y * miniScale + miniOffY,
  };

  // Bake the outline once per circuit; only the car markers are redrawn at
  // runtime. Thick dashed strokes are costly on software-rendered canvases.
  miniBase = document.createElement('canvas');
  miniBase.width = miniW;
  miniBase.height = miniH;
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
  if (!miniBase) return;
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
customTrackData = makeCustomTrackData(customCells);
if (selectedLocation !== 'ridge') {
  swapTrackForLocation(getLocation(selectedLocation));
} else {
  setupMinimap();
}
world3d.setLocation(getLocation(selectedLocation));
unlockNewCars();
applyPlayerSetup();
renderGarage();
applyLocationUI();
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
  get track() { return track; },
  state,
  camera,
  playerCar,
  get ramps() { return ramps; },
  startRace,
  world3d,
  garage3d,
  renderer3d: world3d,
  locations: LOCATIONS,
  selectLocation,
  garageSave,
  recordRaceResult,
  cycleCamera,
  swapTrackForLocation,
  customCells: () => customCells,
  builderCells: () => builderCells,
  traceBuilderLoop,
  openBuilder,
  buildAndRace,
};
