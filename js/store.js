import {
  CARS, CARS_BY_ID, CARS_BY_RARITY, PACKS, PACKS_BY_ID, RARITIES, RARITY_ORDER, TRACKS_BY_ID,
  TRAITS, WHEEL_REWARDS, WHEEL_COST, FREE_SPIN_MS, MAX_LEVEL, upgradeCost, carDisplayStats, statWithLevel,
  COSMETIC_PACK, COSMETICS_BY_ID, WEATHERS_BY_ID, THEMES_BY_ID,
  blueprintCost, starMultiplier, STAR_MAX,
} from './data.js';

const SAVE_KEY = 'apexrip_save_v2';
const SAVE_VERSION = 2;
const listeners = new Set();
const DAILY_BONUS_MS = 24 * 60 * 60 * 1000;
const SAFETY_CRATE_MS = 8 * 60 * 1000;

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
    stars: { 'civic-ghost': 1 },
    apexTokens: 0,
    pinnedCar: null,
    selectedCar: 'civic-ghost',
    selectedPack: 'midnight-circuit',
    selectedTrack: 'midnight-touge',
    autoRip: false,
    autoRace: false,
    lastSeen: now,
    pendingOffline: 0,
    wheel: { lastFree: 0, lastSpin: 0 },
    daily: { last: 0 },
    safety: { last: 0 },
    races: {},
    carFusion: {},
    cosmetics: {},
    equippedCosmetics: {},
    weatherOwned: { 'midnight-clear': true },
    activeWeather: 'midnight-clear',
    themeOwned: { 'midnight-void': true },
    activeTheme: 'midnight-void',
    stats: { pulls: 0, races: 0, wins: 0, spins: 0, fusions: 0, carFusions: 0, cosmeticPulls: 0, stars: 0, salvaged: 0 },
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

  const stars = {};
  for (const id of Object.keys(owned)) {
    const saved = raw.stars && typeof raw.stars === 'object' ? raw.stars[id] : 1;
    stars[id] = int(saved, 1, 1, STAR_MAX);
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

  const cosmetics = {};
  if (raw.cosmetics && typeof raw.cosmetics === 'object' && !Array.isArray(raw.cosmetics)) {
    for (const [id, n] of Object.entries(raw.cosmetics)) {
      if (COSMETICS_BY_ID[id]) {
        const count = int(n, 0, 0, 999);
        if (count > 0) cosmetics[id] = count;
      }
    }
  }

  const equippedCosmetics = {};
  if (raw.equippedCosmetics && typeof raw.equippedCosmetics === 'object' && !Array.isArray(raw.equippedCosmetics)) {
    for (const [carId, cosmeticId] of Object.entries(raw.equippedCosmetics)) {
      if (owned[carId] && cosmetics[cosmeticId]) equippedCosmetics[carId] = cosmeticId;
    }
  }

  const carFusion = {};
  if (raw.carFusion && typeof raw.carFusion === 'object' && !Array.isArray(raw.carFusion)) {
    for (const [id, n] of Object.entries(raw.carFusion)) {
      if (owned[id]) {
        const level = int(n, 0, 0, 3);
        if (level > 0) carFusion[id] = level;
      }
    }
  }

  const weatherOwned = { 'midnight-clear': true };
  if (raw.weatherOwned && typeof raw.weatherOwned === 'object' && !Array.isArray(raw.weatherOwned)) {
    for (const id of Object.keys(raw.weatherOwned)) {
      if (WEATHERS_BY_ID[id]) weatherOwned[id] = true;
    }
  }
  const activeWeather = weatherOwned[raw.activeWeather] ? raw.activeWeather : 'midnight-clear';

  const themeOwned = { 'midnight-void': true };
  if (raw.themeOwned && typeof raw.themeOwned === 'object' && !Array.isArray(raw.themeOwned)) {
    for (const id of Object.keys(raw.themeOwned)) {
      if (THEMES_BY_ID[id]) themeOwned[id] = true;
    }
  }
  const activeTheme = themeOwned[raw.activeTheme] ? raw.activeTheme : 'midnight-void';

  const ownedIds = Object.keys(owned);
  const selectedCar = ownedIds.includes(raw.selectedCar) ? raw.selectedCar : (ownedIds[0] || 'civic-ghost');

  const wheelRaw = raw.wheel && typeof raw.wheel === 'object' ? raw.wheel : {};
  const dailyRaw = raw.daily && typeof raw.daily === 'object' ? raw.daily : {};
  const safetyRaw = raw.safety && typeof raw.safety === 'object' ? raw.safety : {};
  const now = Date.now();
  const lastSeen = num(raw.lastSeen, now, 0, now + 60000);

  return {
    version: SAVE_VERSION,
    credits: int(raw.credits, 1500, 0, 999999999),
    scraps: int(raw.scraps, 0, 0, 9999999),
    fusionCores: int(raw.fusionCores, 0, 0, 9999),
    blueprints,
    owned,
    stars,
    apexTokens: int(raw.apexTokens, 0, 0, 99999999),
    pinnedCar: CARS_BY_ID[raw.pinnedCar] ? raw.pinnedCar : null,
    selectedCar,
    selectedPack: (PACKS_BY_ID[raw.selectedPack] ? raw.selectedPack : base.selectedPack),
    selectedTrack: TRACKS_BY_ID[raw.selectedTrack] ? raw.selectedTrack : base.selectedTrack,
    autoRip: raw.autoRip === true,
    autoRace: raw.autoRace === true,
    lastSeen,
    pendingOffline: num(raw.pendingOffline, 0, 0, 5000),
    wheel: {
      lastFree: num(wheelRaw.lastFree, 0, 0, now + 86400000),
      lastSpin: num(wheelRaw.lastSpin, 0, 0, now + 86400000),
    },
    daily: { last: num(dailyRaw.last, 0, 0, now + 86400000) },
    safety: { last: num(safetyRaw.last, 0, 0, now + 86400000) },
    races,
    carFusion,
    cosmetics,
    equippedCosmetics,
    weatherOwned,
    activeWeather,
    themeOwned,
    activeTheme,
    stats: {
      pulls: int(raw.stats?.pulls, 0, 0, 9999999),
      races: int(raw.stats?.races, 0, 0, 9999999),
      wins: int(raw.stats?.wins, 0, 0, 9999999),
      spins: int(raw.stats?.spins, 0, 0, 9999999),
      fusions: int(raw.stats?.fusions, 0, 0, 9999999),
      carFusions: int(raw.stats?.carFusions, 0, 0, 9999999),
      cosmeticPulls: int(raw.stats?.cosmeticPulls, 0, 0, 9999999),
      stars: int(raw.stats?.stars, 0, 0, 9999999),
      salvaged: int(raw.stats?.salvaged, 0, 0, 9999999),
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
  starRank(carId) { return this.isOwned(carId) ? (this.state.stars[carId] || 1) : 0; }
  displayStats(car) {
    const stats = carDisplayStats(car, this.levels(car.id));
    const mult = (1 + this.carFusionLevel(car.id) * 0.055) * starMultiplier(this.starRank(car.id));
    return {
      speed: Math.round(stats.speed * mult * 10) / 10,
      accel: Math.round(stats.accel * mult * 10) / 10,
      grip: Math.round(stats.grip * mult * 10) / 10,
    };
  }
  blueprintCount(carId) { return this.state.blueprints[carId] || 0; }
  blueprintGoal(carId) {
    const car = CARS_BY_ID[carId];
    if (!car) return null;
    const count = this.blueprintCount(carId);
    if (!this.isOwned(carId)) {
      const need = blueprintCost(car, 0);
      return { mode: 'unlock', count, need, star: 1, label: 'UNLOCK 1★' };
    }
    const star = this.starRank(carId);
    if (star >= STAR_MAX) return { mode: 'max', count, need: 0, star: STAR_MAX, label: 'MAX STAR' };
    return { mode: 'star', count, need: blueprintCost(car, star), star: star + 1, label: `${star + 1}★ UPGRADE` };
  }
  blueprintProgress(carId) {
    const goal = this.blueprintGoal(carId);
    if (!goal) return null;
    const pct = goal.need > 0 ? Math.min(100, (goal.count / goal.need) * 100) : 100;
    return { ...goal, pct };
  }
  togglePinnedCar(carId) {
    if (!CARS_BY_ID[carId]) return null;
    this.state.pinnedCar = this.state.pinnedCar === carId ? null : carId;
    this.save(true);
    this.emit('pin', { car: CARS_BY_ID[carId] });
    return this.state.pinnedCar;
  }
  unlockCar(carId) {
    const car = CARS_BY_ID[carId];
    if (!car) return { ok: false, reason: 'Unknown car.' };
    if (this.isOwned(carId)) return { ok: false, reason: 'Car already unlocked.' };
    const need = blueprintCost(car, 0);
    if (this.blueprintCount(carId) < need) return { ok: false, reason: `Need ${need} blueprints.` };
    this.state.blueprints[carId] -= need;
    if (this.state.blueprints[carId] <= 0) delete this.state.blueprints[carId];
    this.state.owned[carId] = blankLevels();
    this.state.stars[carId] = 1;
    this.state.selectedCar = carId;
    this.state.stats.stars += 1;
    this.save(true);
    this.emit('unlock', { car, star: 1 });
    return { ok: true, car, star: 1 };
  }
  starUp(carId) {
    const car = CARS_BY_ID[carId];
    if (!car || !this.isOwned(carId)) return { ok: false, reason: 'Car not owned.' };
    const star = this.starRank(carId);
    if (star >= STAR_MAX) return { ok: false, reason: 'Already at 3 stars.' };
    const need = blueprintCost(car, star);
    if (this.blueprintCount(carId) < need) return { ok: false, reason: `Need ${need} blueprints.` };
    this.state.blueprints[carId] -= need;
    if (this.state.blueprints[carId] <= 0) delete this.state.blueprints[carId];
    this.state.stars[carId] = star + 1;
    this.state.selectedCar = carId;
    this.state.stats.stars += 1;
    let apexTokens = 0;
    if (this.state.stars[carId] >= STAR_MAX) {
      const spare = this.blueprintCount(carId);
      if (spare > 0) {
        apexTokens = spare * (RARITIES[car.rarity].tier + 1);
        this.state.apexTokens += apexTokens;
        delete this.state.blueprints[carId];
      }
    }
    this.save(true);
    this.emit('starUp', { car, star: star + 1, apexTokens });
    return { ok: true, car, star: star + 1, apexTokens };
  }
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
  toggleAutoRace() {
    this.state.autoRace = !this.state.autoRace;
    this.save();
    this.emit('selected');
    return this.state.autoRace;
  }
  toggleSound() {
    this.state.settings.sound = !this.state.settings.sound;
    this.save();
    this.emit('settings');
    return this.state.settings.sound;
  }

  // ── Weather & themes ──────────────────────────────────────────────────────
  weather(id) { return WEATHERS_BY_ID[id] || WEATHERS_BY_ID['midnight-clear']; }
  activeWeather() { return this.weather(this.state.activeWeather); }
  ownsWeather(id) { return Boolean(this.state.weatherOwned[id]); }
  buyWeather(id) {
    const weather = WEATHERS_BY_ID[id];
    if (!weather) return { ok: false, reason: 'Unknown weather.' };
    if (this.state.weatherOwned[id]) {
      this.state.activeWeather = id;
      this.save(true); this.emit('weather'); return { ok: true, equipped: true, weather };
    }
    if (this.state.credits < weather.price) return { ok: false, reason: 'Not enough credits.' };
    this.state.credits -= weather.price;
    this.state.weatherOwned[id] = true;
    this.state.activeWeather = id;
    this.save(true);
    this.emit('weather', { weather });
    return { ok: true, weather };
  }
  equipWeather(id) {
    if (this.state.weatherOwned[id] && WEATHERS_BY_ID[id]) {
      this.state.activeWeather = id;
      this.save(true);
      this.emit('weather');
      return true;
    }
    return false;
  }
  theme(id) { return THEMES_BY_ID[id] || THEMES_BY_ID['midnight-void']; }
  activeTheme() { return this.theme(this.state.activeTheme); }
  ownsTheme(id) { return Boolean(this.state.themeOwned[id]); }
  buyTheme(id) {
    const theme = THEMES_BY_ID[id];
    if (!theme) return { ok: false, reason: 'Unknown theme.' };
    if (this.state.themeOwned[id]) {
      this.state.activeTheme = id;
      this.save(true); this.emit('theme'); return { ok: true, equipped: true, theme };
    }
    if (this.state.credits < theme.price) return { ok: false, reason: 'Not enough credits.' };
    this.state.credits -= theme.price;
    this.state.themeOwned[id] = true;
    this.state.activeTheme = id;
    this.save(true);
    this.emit('theme', { theme });
    return { ok: true, theme };
  }
  equipTheme(id) {
    if (this.state.themeOwned[id] && THEMES_BY_ID[id]) {
      this.state.activeTheme = id;
      this.save(true);
      this.emit('theme');
      return true;
    }
    return false;
  }

  // ── Cosmetics & car fusion ────────────────────────────────────────────────
  cosmeticCount(id) { return this.state.cosmetics[id] || 0; }
  ownsCosmetic(id) { return this.cosmeticCount(id) > 0; }
  equippedCosmeticFor(carId) {
    const id = this.state.equippedCosmetics[carId];
    return id && this.ownsCosmetic(id) ? COSMETICS_BY_ID[id] || null : null;
  }
  equipCosmetic(carId, cosmeticId) {
    if (!this.state.owned[carId] || !this.ownsCosmetic(cosmeticId)) return false;
    this.state.equippedCosmetics[carId] = cosmeticId;
    this.save(true);
    this.emit('cosmetic');
    return true;
  }
  pullCosmetic(pack = COSMETIC_PACK) {
    if (!pack || this.state.credits < pack.price) return { ok: false, reason: 'Not enough credits.' };
    this.state.credits -= pack.price;
    this.state.stats.pulls += 1;
    this.state.stats.cosmeticPulls += 1;
    const mysticPool = Object.values(COSMETICS_BY_ID).filter(c => c.mystical);
    const standardPool = Object.values(COSMETICS_BY_ID).filter(c => !c.mystical);
    const pool = Math.random() < 0.3 ? mysticPool : standardPool;
    const cosmetic = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !this.ownsCosmetic(cosmetic.id);
    let scraps = 0;
    if (isNew) this.state.cosmetics[cosmetic.id] = 1;
    else {
      this.state.cosmetics[cosmetic.id] += 1;
      scraps = cosmetic.mystical ? 28 : 12;
      this.state.scraps += scraps;
    }
    const selected = this.state.selectedCar;
    if (isNew && selected && !this.state.equippedCosmetics[selected]) {
      this.state.equippedCosmetics[selected] = cosmetic.id;
    }
    this.save(true);
    this.emit('cosmeticPull', { cosmetic, isNew, scraps, pack });
    return { ok: true, cosmetic, isNew, scraps, pack, kind: 'cosmetic' };
  }
  carFusionLevel(carId) { return this.state.carFusion[carId] || 0; }
  carFusionCost(carId) {
    const level = this.carFusionLevel(carId);
    if (level >= 3) return null;
    return {
      blueprints: 2 + level,
      scraps: 30 + level * 30,
      cores: level === 0 ? 0 : level,
      credits: 100 + level * 150,
    };
  }
  fuseCar(carId) {
    const car = CARS_BY_ID[carId];
    if (!car || !this.state.owned[carId]) return { ok: false, reason: 'Car not owned.' };
    const cost = this.carFusionCost(carId);
    if (!cost) return { ok: false, reason: 'Fusion rank is maxed.' };
    if (this.blueprintCount(carId) < cost.blueprints) return { ok: false, reason: `Need ${cost.blueprints} blueprints.` };
    if (this.state.scraps < cost.scraps) return { ok: false, reason: `Need ${cost.scraps} scraps.` };
    if (this.state.fusionCores < cost.cores) return { ok: false, reason: `Need ${cost.cores} fusion core${cost.cores > 1 ? 's' : ''}.` };
    if (this.state.credits < cost.credits) return { ok: false, reason: 'Not enough credits.' };
    this.state.blueprints[carId] -= cost.blueprints;
    if (this.state.blueprints[carId] <= 0) delete this.state.blueprints[carId];
    this.state.scraps -= cost.scraps;
    this.state.fusionCores -= cost.cores;
    this.state.credits -= cost.credits;
    const level = this.carFusionLevel(carId) + 1;
    this.state.carFusion[carId] = level;
    this.state.stats.carFusions += 1;
    this.state.selectedCar = carId;
    this.save(true);
    this.emit('carFusion', { car, level });
    return { ok: true, level, cost };
  }
  traitRank(carId) {
    const fused = this.carFusionLevel(carId);
    return fused >= 3 ? 2 : fused >= 1 ? 1 : 0;
  }
  statAtLevel(car, stat, level) {
    const base = statWithLevel(car[stat], Math.max(0, Math.min(MAX_LEVEL, level)));
    const mult = (1 + this.carFusionLevel(car.id) * 0.055) * starMultiplier(this.starRank(car.id));
    return Math.round(base * mult * 10) / 10;
  }

  // ── Pack ripping ──────────────────────────────────────────────────────────
  canBuy(packId) {
    const pack = PACKS_BY_ID[packId];
    return Boolean(pack && this.state.credits >= pack.price);
  }

  pull(packId) {
    const pack = PACKS_BY_ID[packId];
    if (!pack) return { ok: false, reason: 'Unknown pack.' };
    if (pack.kind === 'cosmetic') return this.pullCosmetic(pack);
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
    const wasOwned = this.isOwned(car.id);
    const maxed = wasOwned && this.starRank(car.id) >= STAR_MAX;
    const drop = (wasOwned ? 1 : 2) + Math.floor(Math.random() * (2 + rarityDef.tier));
    let isNew = false;
    let blueprints = 0;
    let apexTokens = 0;
    let scraps = 0;

    if (maxed) {
      // A maxed build turns every spare blueprint into Apex Tokens.
      apexTokens = drop * (rarityDef.tier + 1);
      this.state.apexTokens += apexTokens;
      scraps = 2 + Math.floor(Math.random() * (rarityDef.tier + 2));
      this.state.scraps += scraps;
    } else {
      blueprints = drop;
      this.state.blueprints[car.id] = this.blueprintCount(car.id) + blueprints;
      if (wasOwned) {
        scraps = 2 + Math.floor(Math.random() * (rarityDef.tier + 2));
        this.state.scraps += scraps;
      } else {
        // Blueprints, not instant cars: the final blueprint completes the 1-star unlock.
        const need = blueprintCost(car, 0);
        if (this.blueprintCount(car.id) >= need) {
          this.state.blueprints[car.id] -= need;
          if (this.state.blueprints[car.id] <= 0) delete this.state.blueprints[car.id];
          this.state.owned[car.id] = blankLevels();
          this.state.stars[car.id] = 1;
          this.state.selectedCar = car.id;
          this.state.stats.stars += 1;
          isNew = true;
        }
      }
    }

    const progress = this.blueprintProgress(car.id);
    this.save(true);
    this.emit('pull', { car, isNew, blueprints, apexTokens, scraps, pack, progress });
    return { ok: true, car, isNew, blueprints, apexTokens, scraps, pack, progress, rarity: car.rarity };
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

  // ── Salvage / sell ───────────────────────────────────────────────────────
  carSalvageValue(carId) {
    const car = CARS_BY_ID[carId];
    if (!car || !this.isOwned(carId)) return null;
    const rar = RARITIES[car.rarity];
    const levels = this.levels(carId);
    const lvSum = levels.speed + levels.accel + levels.grip;
    const fusion = this.carFusionLevel(carId);
    const star = this.starRank(carId);
    return {
      credits: Math.max(50, Math.round((rar.scrap * 12 + lvSum * 16 + fusion * 50 + star * 35) / 5) * 5),
      scraps: Math.max(4, Math.round(rar.scrap * 0.9 + lvSum * 1.5 + fusion * 8)),
      apexTokens: this.blueprintCount(carId),
    };
  }
  salvageCar(carId) {
    const car = CARS_BY_ID[carId];
    if (!car || !this.isOwned(carId)) return { ok: false, reason: 'Car not owned.' };
    if (this.ownedCount() <= 1) return { ok: false, reason: 'Keep at least one car in the garage.' };
    const value = this.carSalvageValue(carId);
    if (!value) return { ok: false, reason: 'Nothing to salvage.' };
    delete this.state.owned[carId];
    delete this.state.stars[carId];
    delete this.state.carFusion[carId];
    delete this.state.equippedCosmetics[carId];
    delete this.state.blueprints[carId];
    if (this.state.pinnedCar === carId) this.state.pinnedCar = null;
    this.state.credits += value.credits;
    this.state.scraps += value.scraps;
    this.state.apexTokens += value.apexTokens;
    this.state.stats.salvaged += 1;
    if (this.state.selectedCar === carId) {
      const next = this.bestCar();
      this.state.selectedCar = next ? next.id : '';
    }
    this.save(true);
    this.emit('salvage', { car, ...value });
    return { ok: true, car, ...value };
  }
  cosmeticSalvageValue(cosmeticId) {
    const cosmetic = COSMETICS_BY_ID[cosmeticId];
    if (!cosmetic) return null;
    return {
      credits: cosmetic.mystical ? 90 : 35,
      scraps: cosmetic.mystical ? 18 : 7,
    };
  }
  salvageCosmetic(cosmeticId) {
    const cosmetic = COSMETICS_BY_ID[cosmeticId];
    if (!cosmetic) return { ok: false, reason: 'Unknown cosmetic.' };
    if (this.cosmeticCount(cosmeticId) <= 1) return { ok: false, reason: 'Keep one copy of this cosmetic.' };
    const value = this.cosmeticSalvageValue(cosmeticId);
    this.state.cosmetics[cosmeticId] -= 1;
    this.state.credits += value.credits;
    this.state.scraps += value.scraps;
    this.save(true);
    this.emit('cosmeticSell', { cosmetic, ...value });
    return { ok: true, cosmetic, ...value };
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
    const result = { credits: 0, scraps: 0, core: 0, blueprint: null, apexTokens: 0 };
    const car = this.selectedCar();
    const godly = car?.trait === 'godly';
    const godlyRank = car ? this.traitRank(car.id) : 0;
    if (reward.kind === 'credits') {
      result.credits = Math.round(reward.amount * (godly ? 1.05 + godlyRank * 0.01 : 1));
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
        if (this.starRank(id) >= STAR_MAX) {
          result.apexTokens = reward.amount * (RARITIES[CARS_BY_ID[id].rarity].tier + 1);
          this.state.apexTokens += result.apexTokens;
          result.blueprint = CARS_BY_ID[id];
        } else {
          this.state.blueprints[id] = this.blueprintCount(id) + reward.amount;
          result.blueprint = CARS_BY_ID[id];
        }
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

  // ── Daily / safety loops ─────────────────────────────────────────────────
  cheapestPackPrice() {
    return Math.min(...PACKS.map(p => p.price));
  }
  dailyReady() {
    return Date.now() - (this.state.daily.last || 0) >= DAILY_BONUS_MS;
  }
  dailyRemaining() {
    return Math.max(0, DAILY_BONUS_MS - (Date.now() - (this.state.daily.last || 0)));
  }
  dailyAmount() {
    const best = this.bestCar();
    const tier = best ? RARITIES[best.rarity].tier : 0;
    return 300 + this.ownedCount() * 40 + tier * 120;
  }
  claimDaily() {
    if (!this.dailyReady()) return { ok: false, reason: 'Daily bonus is still cooling down.' };
    const amount = this.dailyAmount();
    this.state.credits += amount;
    this.state.daily.last = Date.now();
    this.save(true);
    this.emit('daily', { amount });
    return { ok: true, amount };
  }
  safetyCrateReady() {
    return this.state.credits < this.cheapestPackPrice()
      && Date.now() - (this.state.safety.last || 0) >= SAFETY_CRATE_MS;
  }
  safetyCrateRemaining() {
    return Math.max(0, SAFETY_CRATE_MS - (Date.now() - (this.state.safety.last || 0)));
  }
  claimSafetyCrate() {
    const cheapest = this.cheapestPackPrice();
    if (this.state.credits >= cheapest) return { ok: false, reason: 'Safety crate unlocks below the cheapest pack price.' };
    const remain = this.safetyCrateRemaining();
    if (remain > 0) return { ok: false, reason: `Crate cooling down for ${Math.ceil(remain / 1000)}s.` };
    const targetId = this.state.pinnedCar || this.selectedCar()?.id || Object.keys(this.state.owned)[0] || null;
    const blueprints = targetId ? 1 : 0;
    if (targetId) this.state.blueprints[targetId] = this.blueprintCount(targetId) + blueprints;
    const scraps = 12;
    this.state.credits += cheapest;
    this.state.scraps += scraps;
    this.state.safety.last = Date.now();
    this.save(true);
    this.emit('safety', { credits: cheapest, scraps, blueprints, car: targetId ? CARS_BY_ID[targetId] : null });
    return { ok: true, credits: cheapest, scraps, blueprints, car: targetId ? CARS_BY_ID[targetId] : null };
  }

  // ── Races ────────────────────────────────────────────────────────────────
  finishRace(trackId, placement, time) {
    const track = TRACKS_BY_ID[trackId];
    if (!track) return null;
    placement = clamp(int(placement, 1, 1, 3), 1, 3);
    time = num(time, 999, 0.1, 9999);
    const car = this.selectedCar();
    const hacker = car?.trait === 'hacker';
    const hackerRank = car ? this.traitRank(car.id) : 0;
    const placeMult = placement === 1 ? 1 : placement === 2 ? 0.62 : 0.38;
    let credits = Math.round((track.reward * placeMult * (hacker ? 1.1 + hackerRank * 0.015 : 1)) / 5) * 5;
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

    // Every sprint tops up the offline bank too. Harder tracks and higher
    // ranked builds pay more, so racing keeps the idle loop self-sustaining.
    const carRank = car ? RARITIES[car.rarity].tier + this.starRank(car.id) + this.carFusionLevel(car.id) : 0;
    const offlineCredits = Math.max(4, Math.round(track.diff * 12 + carRank * 6 + (placement === 1 ? 16 : 6)));
    this.state.pendingOffline = clamp(this.state.pendingOffline + offlineCredits, 0, this.offlineCap());

    let blueprintCar = null;
    let apexTokens = 0;
    const bpChance = placement === 1 ? 0.55 : placement === 2 ? 0.28 : 0.1;
    if (Math.random() < bpChance) {
      const ids = Object.keys(this.state.owned);
      if (ids.length) {
        const id = ids[Math.floor(Math.random() * ids.length)];
        if (this.starRank(id) >= STAR_MAX) {
          apexTokens = 1;
          this.state.apexTokens += apexTokens;
        } else {
          this.state.blueprints[id] = this.blueprintCount(id) + 1;
          blueprintCar = CARS_BY_ID[id];
        }
      }
    }
    this.save(true);
    this.emit('raceFinish', { placement, credits, scraps, blueprintCar, apexTokens, offlineCredits, track });
    return { credits, scraps, blueprintCar, apexTokens, offlineCredits, firstWinBonus, best: this.state.races[trackId] };
  }
}

export const store = new Store();
export { SAVE_KEY, MAX_LEVEL, TRAITS };
