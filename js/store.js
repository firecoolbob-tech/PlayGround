import {
  CARS, CARS_BY_ID, CARS_BY_RARITY, PACKS_BY_ID, RARITIES, RARITY_ORDER, TRACKS_BY_ID,
  TRAITS, WHEEL_REWARDS, WHEEL_COST, FREE_SPIN_MS, MAX_LEVEL, upgradeCost, carDisplayStats,
} from './data.js';

const SAVE_KEY = 'apexrip_save_v2';
const SAVE_VERSION = 2;
const listeners = new Set();

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const num = (v, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
};
const int = (v, fallback, min = 0, max = 1000000) => Math.round(num(v, fallback, min, max));
const safeId = (v, allowed) => (typeof v === 'string' && allowed.includes(v) ? v : allowed[0]);

function blankLevels() { return { speed: 0, accel: 0, grip: 0 }; }

function freshState() {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    credits: 1500,
    scraps: 0,
    fusionCores: 0,
    blueprints: {},
    owned: { 'civic-ghost': blankLevels() },
    selectedCar: 'civic-ghost',
    selectedPack: 'midnight-circuit',
    selectedTrack: 'midnight-touge',
    autoRip: false,
    lastSeen: now,
    pendingOffline: 0,
    wheel: { lastFree: 0, lastSpin: 0 },
    races: {},
    stats: { pulls: 0, races: 0, wins: 0, spins: 0, fusions: 0 },
    settings: { sound: true },
  };
}

function sanitizeLevels(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    speed: int(src.speed, 0, 0, MAX_LEVEL),
    accel: int(src.accel, 0, 0, MAX_LEVEL),
    grip: int(src.grip, 0, 0, MAX_LEVEL),
  };
}

function sanitize(raw) {
  const base = freshState();
  if (!raw || typeof raw !== 'object') return base;

  const owned = {};
  if (raw.owned && typeof raw.owned === 'object' && !Array.isArray(raw.owned)) {
    for (const [id, lv] of Object.entries(raw.owned)) {
      if (CARS_BY_ID[id]) owned[id] = sanitizeLevels(lv);
    }
  }
  // A save that has pulled before but somehow lost its cars should not brick progression.
  if (!Object.keys(owned).length && raw.owned && int(raw.stats?.pulls, 0) === 0) {
    owned['civic-ghost'] = blankLevels();
  }

  const blueprints = {};
  if (raw.blueprints && typeof raw.blueprints === 'object') {
    for (const [id, n] of Object.entries(raw.blueprints)) {
      if (CARS_BY_ID[id]) {
        const count = int(n, 0, 0, 9999);
        if (count > 0) blueprints[id] = count;
      }
    }
  }

  const races = {};
  if (raw.races && typeof raw.races === 'object') {
    for (const [id, t] of Object.entries(raw.races)) {
      if (TRACKS_BY_ID[id] && Number.isFinite(Number(t)) && Number(t) > 0) {
        races[id] = Math.min(Number(t), 3600);
      }
    }
  }

  const ownedIds = Object.keys(owned);
  const selectedCar = ownedIds.includes(raw.selectedCar) ? raw.selectedCar : (ownedIds[0] || 'civic-ghost');

  const wheelRaw = raw.wheel && typeof raw.wheel === 'object' ? raw.wheel : {};
  const now = Date.now();
  const lastSeen = num(raw.lastSeen, now, 0, now + 60000);

  return {
    version: SAVE_VERSION,
    credits: int(raw.credits, 1500, 0, 999999999),
    scraps: int(raw.scraps, 0, 0, 9999999),
    fusionCores: int(raw.fusionCores, 0, 0, 9999),
    blueprints,
    owned,
    selectedCar,
    selectedPack: PACKS_BY_ID[raw.selectedPack] ? raw.selectedPack : base.selectedPack,
    selectedTrack: TRACKS_BY_ID[raw.selectedTrack] ? raw.selectedTrack : base.selectedTrack,
    autoRip: raw.autoRip === true,
    lastSeen,
    pendingOffline: num(raw.pendingOffline, 0, 0, 5000),
    wheel: {
      lastFree: num(wheelRaw.lastFree, 0, 0, now + 86400000),
      lastSpin: num(wheelRaw.lastSpin, 0, 0, now + 86400000),
    },
    races,
    stats: {
      pulls: int(raw.stats?.pulls, 0, 0, 9999999),
      races: int(raw.stats?.races, 0, 0, 9999999),
      wins: int(raw.stats?.wins, 0, 0, 9999999),
      spins: int(raw.stats?.spins, 0, 0, 9999999),
      fusions: int(raw.stats?.fusions, 0, 0, 9999999),
    },
    settings: {
      sound: raw.settings?.sound !== false,
    },
  };
}

export class Store {
  constructor() {
    this.state = freshState();
    this.lastError = '';
    this._hiddenAt = 0;
    this._lastSave = 0;
    this.load();
  }

  load() {
    let raw = null;
    try {
      const text = localStorage.getItem(SAVE_KEY);
      if (text) raw = JSON.parse(text);
    } catch (err) {
      this.lastError = 'Save was unreadable; starting with a clean garage.';
      raw = null;
    }
    const now = Date.now();
    this.state = sanitize(raw);
    if (raw && this.state.lastSeen > 0) {
      const mins = clamp((now - this.state.lastSeen) / 60000, 0, 480);
      this.state.pendingOffline = clamp(this.state.pendingOffline + mins * this.passiveRate(), 0, this.offlineCap());
    }
    this.state.lastSeen = now;
    this.save(true);
  }

  save(force = false) {
    const now = Date.now();
    if (!force && now - this._lastSave < 400) return;
    this._lastSave = now;
    this.state.lastSeen = now;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (err) {
      this.lastError = 'Could not write save data.';
    }
  }

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    this.state = freshState();
    this.save(true);
    this.emit('reset');
  }

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  emit(type = 'change', payload = null) {
    for (const fn of listeners) {
      try { fn(type, payload, this.state); } catch (err) { console.error(err); }
    }
  }

  // ── Derived helpers ───────────────────────────────────────────────────────
  levels(carId) { return this.state.owned[carId] || blankLevels(); }
  isOwned(carId) { return Boolean(this.state.owned[carId]); }
  displayStats(car) { return carDisplayStats(car, this.levels(car.id)); }
  blueprintCount(carId) { return this.state.blueprints[carId] || 0; }
  ownedCount() { return Object.keys(this.state.owned).length; }
  passiveRate() {
    const n = this.ownedCount();
    return Math.round((0.4 + n * 0.32) * 100) / 100;
  }
  offlineCap() { return 900; }
  offlinePending() { return Math.max(0, Math.round(this.state.pendingOffline || 0)); }

  lineup() {
    return Object.keys(this.state.owned)
      .map(id => CARS_BY_ID[id])
      .filter(Boolean)
      .sort((a, b) => {
        const ra = RARITIES[a.rarity].tier;
        const rb = RARITIES[b.rarity].tier;
        if (rb !== ra) return rb - ra;
        return this.power(b.id) - this.power(a.id);
      })
      .slice(0, 6);
  }

  power(carId) {
    const car = CARS_BY_ID[carId];
    if (!car) return 0;
    const s = this.displayStats(car);
    return s.speed + s.accel + s.grip;
  }

  bestCar() {
    const ids = Object.keys(this.state.owned).filter(id => CARS_BY_ID[id]);
    if (!ids.length) return null;
    ids.sort((a, b) => (RARITIES[CARS_BY_ID[b].rarity].tier - RARITIES[CARS_BY_ID[a].rarity].tier) || (this.power(b) - this.power(a)));
    return CARS_BY_ID[ids[0]];
  }

  selectedCar() {
    const id = this.state.selectedCar;
    if (id && this.state.owned[id]) return CARS_BY_ID[id];
    return this.bestCar();
  }

  setSelectedCar(id) {
    if (this.state.owned[id]) {
      this.state.selectedCar = id;
      this.save();
      this.emit('selected');
    }
  }
  setSelectedPack(id) {
    if (PACKS_BY_ID[id]) { this.state.selectedPack = id; this.save(); this.emit('selected'); }
  }
  setSelectedTrack(id) {
    if (TRACKS_BY_ID[id]) { this.state.selectedTrack = id; this.save(); this.emit('selected'); }
  }
  toggleAutoRip() {
    this.state.autoRip = !this.state.autoRip;
    this.save();
    this.emit('selected');
    return this.state.autoRip;
  }
  toggleSound() {
    this.state.settings.sound = !this.state.settings.sound;
    this.save();
    this.emit('settings');
    return this.state.settings.sound;
  }

  // ── Pack ripping ──────────────────────────────────────────────────────────
  canBuy(packId) {
    const pack = PACKS_BY_ID[packId];
    return Boolean(pack && this.state.credits >= pack.price);
  }

  pull(packId) {
    const pack = PACKS_BY_ID[packId];
    if (!pack) return { ok: false, reason: 'Unknown pack.' };
    if (this.state.credits < pack.price) return { ok: false, reason: 'Not enough credits.' };

    this.state.credits -= pack.price;
    this.state.stats.pulls += 1;

    // Weighted rarity roll.
    let roll = Math.random() * 100;
    let rarity = 'stock';
    for (let i = 0; i < RARITY_ORDER.length; i++) {
      roll -= pack.odds[i];
      if (roll <= 0) { rarity = RARITY_ORDER[i]; break; }
    }

    let pool = CARS_BY_RARITY[rarity] || CARS;
    if (!pool.length) pool = CARS;
    const focusPool = pool.filter(c => pack.focus.includes(c.id));
    const car = (focusPool.length && Math.random() < 0.55)
      ? focusPool[Math.floor(Math.random() * focusPool.length)]
      : pool[Math.floor(Math.random() * pool.length)];

    const rarityDef = RARITIES[car.rarity];
    let isNew = false;
    let blueprints = 0;
    let scraps = 0;
    if (!this.state.owned[car.id]) {
      isNew = true;
      this.state.owned[car.id] = blankLevels();
      this.state.selectedCar = car.id;
    } else {
      blueprints = 1 + (Math.random() < rarityDef.tier * 0.06 ? 1 : 0);
      scraps = 2 + Math.floor(Math.random() * (rarityDef.tier + 2));
      this.state.blueprints[car.id] = this.blueprintCount(car.id) + blueprints;
      this.state.scraps += scraps;
    }

    this.save(true);
    this.emit('pull', { car, isNew, blueprints, scraps, pack });
    return { ok: true, car, isNew, blueprints, scraps, pack, rarity: car.rarity };
  }

  // ── Upgrades / fusion / vault ─────────────────────────────────────────────
  upgrade(carId, stat) {
    if (!['speed', 'accel', 'grip'].includes(stat)) return { ok: false, reason: 'Unknown stat.' };
    const car = CARS_BY_ID[carId];
    if (!car || !this.state.owned[carId]) return { ok: false, reason: 'Car not owned.' };
    const lv = this.state.owned[carId][stat];
    if (lv >= MAX_LEVEL) return { ok: false, reason: 'Already maxed.' };
    const cost = upgradeCost(lv);
    if (this.state.credits < cost) return { ok: false, reason: 'Not enough credits.' };
    const hasBp = this.blueprintCount(carId) > 0;
    const hasCore = this.state.fusionCores > 0;
    if (!hasBp && !hasCore) return { ok: false, reason: 'Need a blueprint or fusion core.' };

    this.state.credits -= cost;
    if (hasBp) this.state.blueprints[carId] -= 1;
    else this.state.fusionCores -= 1;
    if (this.state.blueprints[carId] <= 0) delete this.state.blueprints[carId];
    this.state.owned[carId][stat] = lv + 1;
    this.state.selectedCar = carId;
    this.save(true);
    this.emit('upgrade', { car, stat, level: lv + 1, cost });
    return { ok: true, level: lv + 1, cost, usedCore: !hasBp };
  }

  fuse(carId) {
    const car = CARS_BY_ID[carId];
    if (!car) return { ok: false, reason: 'Unknown car.' };
    if (this.blueprintCount(carId) < 3) return { ok: false, reason: 'Need 3 blueprints.' };
    if (this.state.scraps < 20) return { ok: false, reason: 'Need 20 scraps.' };
    this.state.blueprints[carId] -= 3;
    if (this.state.blueprints[carId] <= 0) delete this.state.blueprints[carId];
    this.state.scraps -= 20;
    this.state.fusionCores += 1;
    this.state.stats.fusions += 1;
    this.save(true);
    this.emit('fusion', { car, cores: this.state.fusionCores });
    return { ok: true };
  }

  scrapBlueprint(carId) {
    const car = CARS_BY_ID[carId];
    if (!car) return { ok: false, reason: 'Unknown car.' };
    const count = this.blueprintCount(carId);
    if (count < 1) return { ok: false, reason: 'No blueprints.' };
    const amount = Math.max(2, Math.ceil(RARITIES[car.rarity].scrap / 3));
    this.state.blueprints[carId] = count - 1;
    if (this.state.blueprints[carId] <= 0) delete this.state.blueprints[carId];
    this.state.scraps += amount;
    this.save(true);
    this.emit('vault', { car, amount });
    return { ok: true, amount };
  }

  // ── Wheel ────────────────────────────────────────────────────────────────
  freeSpinReady() {
    return Date.now() - (this.state.wheel.lastFree || 0) >= FREE_SPIN_MS;
  }
  freeSpinRemaining() {
    return Math.max(0, FREE_SPIN_MS - (Date.now() - (this.state.wheel.lastFree || 0)));
  }
  spin(useFree) {
    const free = Boolean(useFree && this.freeSpinReady());
    const cost = free ? 0 : WHEEL_COST;
    if (this.state.credits < cost) return { ok: false, reason: 'Not enough credits.' };
    this.state.credits -= cost;
    this.state.stats.spins += 1;
    const now = Date.now();
    if (free) this.state.wheel.lastFree = now;
    this.state.wheel.lastSpin = now;
    const index = Math.floor(Math.random() * WHEEL_REWARDS.length);
    this.save(true);
    this.emit('spinStart', { index, free, cost });
    return { ok: true, index, reward: WHEEL_REWARDS[index], free, cost };
  }

  grantWheelReward(reward) {
    const result = { credits: 0, scraps: 0, core: 0, blueprint: null };
    const godly = this.selectedCar()?.trait === 'godly';
    if (reward.kind === 'credits') {
      result.credits = Math.round(reward.amount * (godly ? 1.05 : 1));
      this.state.credits += result.credits;
    } else if (reward.kind === 'scrap') {
      result.scraps = reward.amount;
      this.state.scraps += reward.amount;
    } else if (reward.kind === 'core') {
      result.core = reward.amount;
      this.state.fusionCores += reward.amount;
    } else if (reward.kind === 'blueprint') {
      const ids = Object.keys(this.state.owned);
      if (ids.length) {
        const id = ids[Math.floor(Math.random() * ids.length)];
        this.state.blueprints[id] = this.blueprintCount(id) + reward.amount;
        result.blueprint = CARS_BY_ID[id];
      } else {
        result.credits = 60;
        this.state.credits += 60;
      }
    }
    this.save(true);
    this.emit('wheelReward', result);
    return result;
  }

  // ── Offline income ───────────────────────────────────────────────────────
  accrueOffline(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    this.state.pendingOffline = clamp(this.state.pendingOffline + minutes * this.passiveRate(), 0, this.offlineCap());
    this.save(true);
  }
  collectOffline() {
    const amount = this.offlinePending();
    if (amount < 1) return { ok: false, reason: 'Nothing to collect yet.' };
    this.state.credits += amount;
    this.state.pendingOffline = 0;
    this.save(true);
    this.emit('offlineCollect', { amount });
    return { ok: true, amount };
  }

  // ── Races ────────────────────────────────────────────────────────────────
  finishRace(trackId, placement, time) {
    const track = TRACKS_BY_ID[trackId];
    if (!track) return null;
    placement = clamp(int(placement, 1, 1, 3), 1, 3);
    time = num(time, 999, 0.1, 9999);
    const car = this.selectedCar();
    const hacker = car?.trait === 'hacker';
    const placeMult = placement === 1 ? 1 : placement === 2 ? 0.62 : 0.38;
    let credits = Math.round((track.reward * placeMult * (hacker ? 1.1 : 1)) / 5) * 5;
    let firstWinBonus = 0;
    const prevBest = this.state.races[trackId];
    if (placement === 1 && !prevBest) {
      firstWinBonus = 40;
      credits += firstWinBonus;
    }
    if (!prevBest || time < prevBest) this.state.races[trackId] = Math.round(time * 100) / 100;
    this.state.credits += credits;
    const scraps = placement === 1 ? 8 : placement === 2 ? 4 : 2;
    this.state.scraps += scraps;
    this.state.stats.races += 1;
    if (placement === 1) this.state.stats.wins += 1;

    let blueprintCar = null;
    const bpChance = placement === 1 ? 0.55 : placement === 2 ? 0.28 : 0.1;
    if (Math.random() < bpChance) {
      const ids = Object.keys(this.state.owned);
      if (ids.length) {
        const id = ids[Math.floor(Math.random() * ids.length)];
        this.state.blueprints[id] = this.blueprintCount(id) + 1;
        blueprintCar = CARS_BY_ID[id];
      }
    }
    this.save(true);
    this.emit('raceFinish', { placement, credits, scraps, blueprintCar, track });
    return { credits, scraps, blueprintCar, firstWinBonus, best: this.state.races[trackId] };
  }
}

export const store = new Store();
export { SAVE_KEY, MAX_LEVEL, TRAITS };
