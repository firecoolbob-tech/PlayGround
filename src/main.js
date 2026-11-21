/* ═══════════════════════════════════════════════════════════════
   RC RUSH — app controller
   ═══════════════════════════════════════════════════════════════ */
import {
  LOCATIONS, LOCATION_BY_ID, CARS, CAR_BY_ID, WEATHER,
  difficultyLabel, loadSave, persist
} from './data.js';
import { Race } from './race.js';
import { Renderer, drawMinimap } from './renderer.js';
import { drawLocationThumb } from './backdrop.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { formatTime } from './track.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const save = loadSave();
const audio = new AudioEngine();
const input = new Input();
const renderer = new Renderer($('#game'));

let selectedLoc = LOCATION_BY_ID[save.locationId] || LOCATIONS[0];
let selectedCar = CAR_BY_ID[save.carId] || CARS[0];
let currentRace = null;
let currentSeed = 0;
let raf = null;
let lastT = 0;
let paused = false;
let finishHandled = false;
let finishTimer = null;
let lastMini = 0;
let lastWeatherIcon = '';
let lastLapShown = 0;
let bannerTimer = null;

const hud = {
  lap: $('#hud-lap'), pos: $('#hud-pos'), time: $('#hud-time'), laptime: $('#hud-laptime'),
  speed: $('#hud-speed'), speedFill: $('#speed-fill'), boostFill: $('#boost-fill'),
  boostPct: $('#boost-pct'), progress: $('#race-progress'), progressLabel: $('#progress-label'),
  weatherLabel: $('#hud-weather-label'), weatherIcon: $('#hud-weather .weather-icon use'),
  lapDots: $('#lap-dots'), drift: $('#drift-badge'), offroad: $('#offroad-warn'),
  minimap: $('#minimap'), minimapLabel: $('#minimap-label')
};

/* ── helpers ─────────────────────────────────────────────────── */
function ordinal(n) { return ['ST', 'ND', 'RD', 'TH'][Math.min(3, n - 1)] || 'TH'; }
function fmtCoins(n) { return n.toLocaleString('en-US'); }
function haptic(ms = 20) {
  if (save.haptics && navigator.vibrate) navigator.vibrate(ms);
}
function toast(text, ms = 1800) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), ms);
}
function weatherIconId(id) {
  return (WEATHER[id] && WEATHER[id].icon) || 'i-weather-clear';
}
function locationMeta(loc) {
  const w = WEATHER[loc.weather[0]];
  return `${w.short} · ${loc.surfaceLabel} · ${difficultyLabel(loc.difficulty)}`;
}

/* ── screens ─────────────────────────────────────────────────── */
function showScreen(name) {
  for (const el of $$('.screen')) el.classList.toggle('is-active', el.dataset.screen === name);
  document.body.dataset.screen = name;
  if (name !== 'race') {
    input.enabled = false;
    input.releaseAll();
  }
  if (name === 'race') requestAnimationFrame(() => renderer.resize());
  if (name === 'menu') syncMenu();
  if (name === 'maps') syncLocation();
  if (name === 'garage') syncCar();
}

/* ── sync UI ─────────────────────────────────────────────────── */
function syncCar() {
  selectedCar = CAR_BY_ID[save.carId] || CARS[0];
  const root = document.documentElement;
  root.style.setProperty('--car-color', selectedCar.color);
  root.style.setProperty('--car-dark', selectedCar.dark);
  root.style.setProperty('--car-accent', selectedCar.accent);
  $('#menu-car-name').textContent = selectedCar.name;
  $('#menu-car-class').textContent = selectedCar.klass;
  $('#menu-car-stats').innerHTML = statBars(selectedCar, false);
  for (const card of $$('.garage-card')) {
    card.classList.toggle('is-selected', card.dataset.car === selectedCar.id);
    const pick = card.querySelector('.garage-pick');
    if (pick) pick.textContent = card.dataset.car === selectedCar.id ? 'SELECTED' : 'SELECT';
  }
}

function statBars(car, compact = false) {
  const rows = [['SPEED', car.stats.speed], ['ACCEL', car.stats.accel], ['GRIP', car.stats.grip], ['NITRO', car.stats.boost]];
  return rows.map(([label, value]) => `
    <div class="stat-row">
      <label>${label}</label>
      <div class="track"><i style="width:${value * 10}%"></i></div>
      <b>${value}</b>
    </div>`).join('');
}

function syncLocation() {
  selectedLoc = LOCATION_BY_ID[save.locationId] || LOCATIONS[0];
  for (const card of $$('.map-card')) card.classList.toggle('is-selected', card.dataset.loc === selectedLoc.id);
  $('#menu-circuit-name').textContent = selectedLoc.name;
  $('#menu-circuit-meta').textContent = locationMeta(selectedLoc);
  $('#map-footer-name').textContent = selectedLoc.name;
  $('#map-footer-meta').textContent = `${WEATHER[selectedLoc.weather[0]].short} · ${selectedLoc.surfaceLabel} · ${difficultyLabel(selectedLoc.difficulty)}`;
  const thumb = $('#map-footer-thumb');
  thumb.innerHTML = '';
  const c = document.createElement('canvas');
  drawLocationThumb(c, selectedLoc, LOCATIONS.indexOf(selectedLoc) + 1);
  thumb.appendChild(c);
  updateMapBests();
}

function updateMapBests() {
  for (const el of $$('[data-best]')) {
    const id = el.dataset.best;
    const best = save.bestTimes[id];
    if (best) {
      el.textContent = formatTime(best);
      el.classList.remove('new');
    } else {
      el.innerHTML = '<span class="new">NEW LAYOUT</span>';
    }
  }
}

function syncCoins() {
  $('#menu-coins').textContent = fmtCoins(save.coins);
  for (const el of $$('.coin-value')) el.textContent = fmtCoins(save.coins);
}

function syncBest() {
  const entries = Object.entries(save.bestTimes).sort((a, b) => a[1] - b[1]);
  if (!entries.length) {
    $('#menu-best-time').textContent = '--:--.--';
    $('#menu-best-map').textContent = 'NO RECORD YET';
    return;
  }
  const [id, time] = entries[0];
  $('#menu-best-time').textContent = formatTime(time);
  $('#menu-best-map').textContent = (LOCATION_BY_ID[id] || selectedLoc).name;
}

function syncSound() {
  for (const use of $$('[data-sound-toggle] use')) use.setAttribute('href', save.sound ? '#i-sound' : '#i-muted');
  audio.setSettings({ sound: save.sound, music: save.music });
}

function syncMenu() {
  syncCar();
  syncLocation();
  syncBest();
  syncCoins();
}

/* ── build dynamic content ───────────────────────────────────── */
function buildMaps() {
  const grid = $('#map-grid');
  grid.innerHTML = '';
  LOCATIONS.forEach((loc, i) => {
    const card = document.createElement('button');
    card.className = 'map-card';
    card.dataset.loc = loc.id;
    card.setAttribute('aria-label', `Select ${loc.name}`);
    const canvas = document.createElement('canvas');
    card.appendChild(canvas);
    drawLocationThumb(canvas, loc, i + 1);

    const weathers = [...new Set(loc.weather)].slice(0, 2);
    const icons = weathers.map(w => `<svg class="icon"><use href="#${WEATHER[w].icon}" /></svg>`).join('');
    const dots = Array.from({ length: 5 }, (_, d) => `<i class="${d < loc.difficulty ? 'on' : ''}"></i>`).join('');
    card.insertAdjacentHTML('beforeend', `
      <span class="map-index">${String(i + 1).padStart(2, '0')}</span>
      <span class="map-weather-icons">${icons}</span>
      <span class="map-select-mark"><svg class="icon"><use href="#i-bolt" /></svg></span>
      <span class="map-body">
        <span class="map-name">${loc.name}</span>
        <span class="map-sub"><span>${loc.region}</span><span class="dotsep">·</span><span class="surface">${loc.surfaceLabel}</span><span class="map-diff">${dots}</span></span>
        <span class="map-best"><span>BEST</span><b data-best="${loc.id}"></b></span>
      </span>`);
    card.addEventListener('click', () => {
      save.locationId = loc.id;
      persist(save);
      selectedLoc = loc;
      syncLocation();
      audio.ui();
      haptic(8);
    });
    grid.appendChild(card);
  });
  updateMapBests();
}

function buildGarage() {
  const grid = $('#garage-grid');
  grid.innerHTML = '';
  CARS.forEach((car, i) => {
    const card = document.createElement('button');
    card.className = 'garage-card';
    card.dataset.car = car.id;
    card.style.setProperty('--car-color', car.color);
    card.style.setProperty('--car-dark', car.dark);
    card.style.setProperty('--car-accent', car.accent);
    card.innerHTML = `
      <span class="garage-card-top">
        <span><small>MACHINE ${String(i + 1).padStart(2, '0')}</small><b>${car.name}</b></span>
        <span class="garage-class">${car.klass}</span>
      </span>
      <span class="garage-art"><svg viewBox="0 0 620 450" class="car-svg"><use href="#car-art" /></svg></span>
      <span class="garage-stats">${statBars(car, true)}</span>
      <span class="garage-actions"><span class="garage-desc">${car.desc}</span><span class="garage-pick">SELECT</span></span>`;
    card.addEventListener('click', () => {
      save.carId = car.id;
      persist(save);
      selectedCar = car;
      syncCar();
      audio.ui();
      haptic(10);
    });
    grid.appendChild(card);
  });
  syncCar();
}

/* ── modals ──────────────────────────────────────────────────── */
function openModal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal">${html}</div>`;
  root.classList.add('open');
}
function closeModal() {
  const root = $('#modal-root');
  root.classList.remove('open');
  root.innerHTML = '';
}
$('#modal-root').addEventListener('click', e => {
  if (e.target === $('#modal-root') || e.target.closest('[data-close]')) closeModal();
});

function openHowTo() {
  openModal(`
    <div class="modal-head">
      <div><small>60 SECOND BRIEFING</small><h3>HOW TO RACE</h3></div>
      <button class="modal-close" data-close aria-label="Close"><svg class="icon"><use href="#i-close" /></svg></button>
    </div>
    <p>Auto-throttle is on. Steer with your thumbs, tap <b>NITRO</b> for a burst and feather the brake when the weather turns.</p>
    <div class="how-grid">
      <div class="how-card"><svg class="icon"><use href="#i-back" /></svg><b>STEER</b><span>Hold left or right. Release to straighten up.</span></div>
      <div class="how-card"><svg class="icon"><use href="#i-bolt" /></svg><b>NITRO</b><span>Drift and grab pads to refill. Hold to boost.</span></div>
      <div class="how-card"><svg class="icon"><use href="#i-weather-rain" /></svg><b>WEATHER</b><span>Rain, snow and ice reduce grip mid-race.</span></div>
      <div class="how-card"><svg class="icon"><use href="#i-trophy" /></svg><b>3 LAPS</b><span>Every circuit is rebuilt from a fresh random seed.</span></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" data-close><span>GOT IT</span><svg class="icon"><use href="#i-arrow" /></svg></button>
    </div>`);
}

function openSettings() {
  openModal(`
    <div class="modal-head">
      <div><small>DRIVER PREFERENCES</small><h3>SETTINGS</h3></div>
      <button class="modal-close" data-close aria-label="Close"><svg class="icon"><use href="#i-close" /></svg></button>
    </div>
    <div class="setting-row"><div><b>SOUND FX</b><small>Engine, skids, weather</small></div><button class="switch ${save.sound ? 'on' : ''}" data-setting="sound" aria-label="Toggle sound"></button></div>
    <div class="setting-row"><div><b>MUSIC</b><small>Procedural race soundtrack</small></div><button class="switch ${save.music ? 'on' : ''}" data-setting="music" aria-label="Toggle music"></button></div>
    <div class="setting-row"><div><b>HAPTICS</b><small>Bumps and weather alerts</small></div><button class="switch ${save.haptics ? 'on' : ''}" data-setting="haptics" aria-label="Toggle haptics"></button></div>
    <div class="setting-row"><div><b>TRACK RECORDS</b><small>${Object.keys(save.bestTimes).length} circuits logged</small></div><button class="btn btn-ghost" style="min-height:38px;padding:0 14px;font-size:9px" data-reset>RESET</button></div>
    <div class="modal-actions"><button class="btn btn-primary" data-close><span>DONE</span></button></div>`);

  const root = $('#modal-root');
  for (const btn of root.querySelectorAll('[data-setting]')) {
    btn.addEventListener('click', () => {
      const key = btn.dataset.setting;
      save[key] = !save[key];
      btn.classList.toggle('on', save[key]);
      persist(save);
      syncSound();
      audio.ui();
      haptic(10);
    });
  }
  const reset = root.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', () => {
    save.bestTimes = {};
    save.bestLaps = {};
    persist(save);
    syncBest();
    updateMapBests();
    toast('TRACK RECORDS CLEARED');
    closeModal();
  });
}

/* ── race lifecycle ──────────────────────────────────────────── */
function stopRaceLoop() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  input.enabled = false;
  input.releaseAll();
  audio.stopRace();
}

function startRace(location, seed = null) {
  clearTimeout(finishTimer);
  stopRaceLoop();
  closeModal();
  selectedLoc = location;
  save.locationId = location.id;
  persist(save);

  currentSeed = seed == null ? ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) : seed;
  paused = false;
  finishHandled = false;
  lastLapShown = 0;
  lastWeatherIcon = '';

  showScreen('race');
  renderer.resize();
  currentRace = new Race({
    location, car: selectedCar, seed: currentSeed, input, audio,
    onEvent: handleRaceEvent
  });
  renderer.setTrack(currentRace.track, location);
  currentRace.start();
  audio.setTheme(LOCATIONS.indexOf(location));
  audio.startRace();
  input.reset();
  input.enabled = true;
  setupHUD();
  showCountdown(3);
  lastT = performance.now();
  lastMini = 0;
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function loop(t) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
  lastT = t;
  if (!currentRace) return;
  if (!paused) currentRace.update(dt);
  renderer.render(currentRace, paused ? 0 : dt, t / 1000);
  updateHUD();
  if (t - lastMini > 90) {
    drawMinimap(hud.minimap, currentRace.track, currentRace, currentRace.location);
    lastMini = t;
  }
}

function setupHUD() {
  hud.lap.textContent = '1';
  hud.pos.textContent = '4';
  hud.time.textContent = '00:00.00';
  hud.laptime.textContent = '00:00.00';
  hud.speed.textContent = '0';
  hud.speedFill.style.width = '0%';
  hud.boostFill.style.width = '100%';
  hud.boostPct.textContent = '100%';
  hud.progress.style.width = '0%';
  hud.progressLabel.textContent = `LAP 1 / ${currentRace.laps}`;
  hud.lapDots.innerHTML = Array.from({ length: currentRace.laps }, (_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  hud.drift.classList.remove('show');
  hud.offroad.classList.remove('show');
  hud.minimapLabel.textContent = currentRace.location.name;
  $('#race-banner').classList.remove('show');
  $('#countdown').classList.remove('show', 'go');
  $('#countdown').innerHTML = '';
  $('#hud-weather-label').textContent = WEATHER[currentRace.location.weather[0]].label;
  hud.weatherIcon.setAttribute('href', `#${weatherIconId(currentRace.location.weather[0])}`);
  lastLapShown = 1;
}

function updateHUD() {
  const r = currentRace;
  if (!r) return;
  hud.lap.textContent = String(r.lap);
  hud.pos.textContent = String(r.rank);
  hud.time.textContent = formatTime(r.time);
  hud.laptime.textContent = formatTime(r.currentLapTime);
  hud.speed.textContent = String(r.kmh);
  hud.speedFill.style.width = `${Math.min(100, (r.kmh / 260) * 100)}%`;
  hud.boostFill.style.width = `${r.boost}%`;
  hud.boostPct.textContent = `${Math.round(r.boost)}%`;
  hud.progress.style.width = `${r.progressTotal * 100}%`;
  hud.progressLabel.textContent = `LAP ${r.lap} / ${r.laps}`;

  const wp = r.weather.params();
  if (wp.icon !== lastWeatherIcon) {
    lastWeatherIcon = wp.icon;
    hud.weatherIcon.setAttribute('href', `#${wp.icon}`);
    hud.weatherLabel.textContent = wp.label;
  }

  if (r.lap !== lastLapShown) {
    lastLapShown = r.lap;
    hud.lapDots.innerHTML = Array.from({ length: r.laps }, (_, i) => `<i class="${i < r.lap ? 'on' : ''}"></i>`).join('');
  }

  hud.drift.classList.toggle('show', r.drifting && r.state === 'racing');
  hud.offroad.classList.toggle('show', r.offroad && r.state === 'racing');
}

function showCountdown(n) {
  const el = $('#countdown');
  el.classList.add('show');
  el.classList.remove('go');
  el.innerHTML = `<span>${n}</span>`;
}

function showGo() {
  const el = $('#countdown');
  el.classList.add('show', 'go');
  el.innerHTML = '<span>GO!</span>';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.remove('show', 'go');
    el.innerHTML = '';
  }, 850);
}

function showBanner(small, text, ms = 2200) {
  const el = $('#race-banner');
  el.querySelector('small').textContent = small;
  el.querySelector('b').textContent = text;
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function flashScreen() {
  const el = $('#race-flash');
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function handleRaceEvent(type, payload) {
  if (!currentRace) return;
  if (type === 'count') {
    showCountdown(payload);
    haptic(18);
  } else if (type === 'go') {
    showGo();
    haptic([18, 40, 30]);
  } else if (type === 'weather') {
    showBanner('WEATHER UPDATE', payload.label, 2600);
    audio.weatherChange(payload.id);
    haptic([24, 50, 24]);
    flashScreen();
  } else if (type === 'lap') {
    const final = payload.lap === currentRace.laps;
    showBanner(final ? 'FINAL LAP' : `LAP ${payload.lap} / ${currentRace.laps}`, final ? 'PUSH FOR THE LINE' : 'KEEP IT CLEAN', 1800);
    haptic(20);
  } else if (type === 'pickup') {
    toast('NITRO +26', 900);
  } else if (type === 'bump') {
    flashScreen();
    haptic(35);
  } else if (type === 'finish') {
    if (finishHandled) return;
    finishHandled = true;
    input.enabled = false;
    input.releaseAll();
    const rank = payload.rank;
    showBanner('RACE COMPLETE', `P${rank} · ${ordinal(rank)} PLACE`, 1900);
    clearTimeout(finishTimer);
    finishTimer = setTimeout(() => showResults(payload), 1500);
  }
}

function showResults(result) {
  if (!currentRace) return;
  const loc = currentRace.location;
  const car = currentRace.car;
  const bestLap = result.lapTimes && result.lapTimes.length ? Math.min(...result.lapTimes.filter(v => v > 0)) : 0;
  const prevBest = save.bestTimes[loc.id];
  const prevLap = save.bestLaps[loc.id];
  const isRecord = !prevBest || result.time < prevBest;
  const isLapRecord = bestLap > 0 && (!prevLap || bestLap < prevLap);

  if (isRecord) save.bestTimes[loc.id] = result.time;
  if (isLapRecord) save.bestLaps[loc.id] = bestLap;
  const base = [520, 340, 240, 160][result.rank - 1] || 120;
  const bonus = Math.round((result.topSpeed / 260) * 70);
  const coins = base + bonus;
  save.coins += coins;
  save.races += 1;
  if (result.rank === 1) save.wins += 1;
  persist(save);

  const titles = ['CLEAN SWEEP.', 'SO CLOSE.', 'ON THE BOX.', 'TOUGH RUN.'];
  const subs = [
    `You owned ${loc.name}. The weather never stood a chance.`,
    `P2 at ${loc.name}. One corner away from the win.`,
    `A podium at ${loc.name}. The top step is next.`,
    `P4 at ${loc.name}. New layout, new chance.`
  ];
  $('#result-rank').innerHTML = `${result.rank}<span>${ordinal(result.rank)}</span>`;
  $('#result-title').textContent = titles[result.rank - 1] || 'RACE COMPLETE';
  $('#result-sub').textContent = subs[result.rank - 1] || '';
  $('#result-time').textContent = formatTime(result.time);
  $('#result-best-lap').textContent = formatTime(bestLap);
  $('#result-top-speed').innerHTML = `${result.topSpeed}<em>KM/H</em>`;
  $('#result-coins').textContent = `+${coins}`;
  $('#result-weather').textContent = result.weather.label;

  const standings = result.standings || [];
  const leader = standings[0];
  $('#standings-list').innerHTML = standings.map((row, i) => {
    const gap = i === 0 ? 'LEADER' : `+${Math.max(0, (leader.distance - row.distance) / 9000).toFixed(2)}s`;
    return `<div class="standing-row ${row.isPlayer ? 'is-player' : ''}">
      <span class="place">${i + 1}</span>
      <span class="swatch" style="background:${row.color}"></span>
      <span class="name">${row.isPlayer ? `${row.name} · ${car.name}` : row.name}</span>
      <span class="gap">${row.isPlayer && i === 0 ? 'WINNER' : gap}</span>
    </div>`;
  }).join('');

  $('#results-hint').textContent = isRecord
    ? 'NEW PERSONAL BEST · A FRESH RANDOM LAYOUT IS READY'
    : 'NEW RANDOM LAYOUT GENERATED FOR THE NEXT RACE';

  syncCoins();
  syncBest();
  updateMapBests();
  syncLocation();
  stopRaceLoop();
  showScreen('results');
  $('#result-rank').animate(
    [{ transform: 'scale(1.35) skewX(-5deg)', opacity: 0 }, { transform: 'scale(1) skewX(-5deg)', opacity: 1 }],
    { duration: 520, easing: 'cubic-bezier(.2,1.3,.4,1)' }
  );
  if (isRecord) toast('NEW PERSONAL BEST', 2400);
  haptic([30, 60, 30, 60, 50]);
}

function togglePause(force = null) {
  if (!currentRace || currentRace.state === 'finished') return;
  const next = force == null ? !paused : force;
  if (next === paused) return;
  paused = next;
  if (paused) {
    input.enabled = false;
    input.releaseAll();
    audio.pauseRace(true);
    openModal(`
      <div class="modal-head">
        <div><small>RACE ON HOLD</small><h3>PAUSED</h3></div>
        <button class="modal-close" data-close aria-label="Close"><svg class="icon"><use href="#i-close" /></svg></button>
      </div>
      <p>${currentRace.location.name} · ${WEATHER[currentRace.location.weather[0]].short} · Lap ${currentRace.lap} of ${currentRace.laps}</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="pause-resume"><span>RESUME</span><svg class="icon"><use href="#i-play" /></svg></button>
        <button class="btn btn-ghost" id="pause-restart">RESTART LAYOUT</button>
        <button class="btn btn-ghost" id="pause-quit">QUIT TO CIRCUITS</button>
      </div>`);
    $('#pause-resume').addEventListener('click', () => togglePause(false));
    $('#pause-restart').addEventListener('click', () => startRace(currentRace.location, currentSeed));
    $('#pause-quit').addEventListener('click', () => {
      closeModal();
      paused = false;
      stopRaceLoop();
      currentRace = null;
      showScreen('maps');
    });
  } else {
    closeModal();
    input.enabled = true;
    audio.pauseRace(false);
    lastT = performance.now();
  }
}

/* ── wiring ──────────────────────────────────────────────────── */
function init() {
  buildMaps();
  buildGarage();
  syncMenu();
  syncSound();
  syncCoins();
  input.bindButtons(document);
  input.onPause = () => togglePause();
  input.onAny = () => audio.unlock();
  $('#hud-weather-label').textContent = WEATHER[selectedLoc.weather[0]].label;

  $('#btn-start').addEventListener('click', () => {
    audio.unlock();
    audio.ui();
    haptic(12);
    showScreen('menu');
  });
  $('#btn-title-how').addEventListener('click', () => { audio.unlock(); openHowTo(); });
  $('#btn-menu-how').addEventListener('click', openHowTo);
  $('#btn-menu-settings').addEventListener('click', openSettings);

  for (const btn of $$('[data-sound-toggle]')) {
    btn.addEventListener('click', () => {
      save.sound = !save.sound;
      persist(save);
      syncSound();
      audio.unlock();
      audio.ui();
      toast(save.sound ? 'SOUND ON' : 'SOUND MUTED', 1100);
      haptic(10);
    });
  }

  for (const btn of $$('[data-nav]')) {
    btn.addEventListener('click', () => {
      audio.ui();
      showScreen(btn.dataset.nav);
    });
  }

  $('#btn-quick-race').addEventListener('click', () => { audio.unlock(); startRace(selectedLoc); });
  $('#btn-race').addEventListener('click', () => { audio.unlock(); startRace(selectedLoc); });
  $('#btn-race-again').addEventListener('click', () => startRace(selectedLoc));
  $('#btn-results-maps').addEventListener('click', () => showScreen('maps'));
  $('#btn-results-menu').addEventListener('click', () => showScreen('menu'));
  $('#btn-pause').addEventListener('click', () => togglePause());

  window.addEventListener('resize', () => renderer.resize());
  window.addEventListener('orientationchange', () => setTimeout(() => renderer.resize(), 180));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentRace && !paused && currentRace.state !== 'finished') togglePause(true);
  });

  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // prevent iOS rubber-banding on race controls
  document.addEventListener('touchmove', e => {
    if (document.body.dataset.screen === 'race') e.preventDefault();
  }, { passive: false });
}

init();
