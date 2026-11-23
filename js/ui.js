import {
  CARS, CARS_BY_ID, PACKS, PACKS_BY_ID, RARITIES, RARITY_ORDER, TRACKS, TRACKS_BY_ID,
  TRAITS, WHEEL_REWARDS, WHEEL_COST, MAX_LEVEL, upgradeCost, statWithLevel,
  carDisplayStats, formatNum, formatTime, carSvg, rgba, lighten,
  WEATHERS, WEATHERS_BY_ID, BACKGROUND_THEMES, THEMES_BY_ID,
  COSMETICS, COSMETICS_BY_ID, COSMETIC_PACK,
} from './data.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export class UI {
  constructor(store, world, race, audio) {
    this.store = store;
    this.world = world;
    this.race = race;
    this.audio = audio;
    this.tab = 'rip';
    this.garageFilter = 'all';
    this.fusionCarId = null;
    this.revealing = false;
    this.spinning = false;
    this.raceView = false;
    this.inspectCar = null;
    this.inspectReturn = 'garage';
    this.lastRipPack = null;
    this.autoTimer = null;
    this.revealTimer = null;
    this.raceToken = 0;
    this.raceHintTimer = null;
    this._hiddenAt = 0;
    this._lastHUD = null;
    this._modalDismissible = false;
    this._lastPanelTab = null;
    this.carFuseId = null;

    this.app = document.getElementById('app');
    this.featureBtn = document.getElementById('feature-btn');
    this.featureMenu = document.getElementById('feature-menu');
    this.raceHud = document.getElementById('race-hud');
    this.raceFx = document.getElementById('race-fx');
    this.revealTag = document.getElementById('reveal-tag');
    this.inspect = document.getElementById('inspect');
    this.sheetLayer = document.getElementById('sheet-layer');
    this.sheet = document.getElementById('sheet');
    this.sheetTitle = document.getElementById('sheet-title');
    this.sheetBody = document.getElementById('sheet-body');
    this.modalLayer = document.getElementById('modal');
    this.modalCard = document.getElementById('modal-card');
    this.toasts = document.getElementById('toasts');

    this._bindGlobal();
    store.subscribe((type, payload) => this._onStore(type, payload));
    race.cbs = this.raceCallbacks();
    world.onRaceGesture = (g) => this.race.handleGesture(g);
    world.cosmeticFor = (carId) => this.store.equippedCosmeticFor(carId);
    world.setTheme(this.store.activeTheme());
    world.setWeather(this.store.activeWeather());
    this.renderHUD();
    this.setTab('rip', true);
    if (this.store.state.autoRip) {
      setTimeout(() => { if (this.tab === 'rip' && !this.revealing) this._scheduleAutoRip(); }, 1600);
    }
    this._wheelInterval = setInterval(() => this._tickWheelUI(), 1000);
  }

  // ── Boot / global events ──────────────────────────────────────────────────
  _bindGlobal() {
    $$('.tab').forEach(btn => btn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.play('tab');
      this.setTab(btn.dataset.tab);
    }));
    $('#settings-btn').addEventListener('click', () => { this.audio.unlock(); this.audio.play('ui'); this.showSettings(); });
    if (this.featureBtn) {
      this.featureBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.unlock();
        this.audio.play('ui');
        this.toggleFeatureMenu();
      });
    }
    if (this.featureMenu) {
      this.featureMenu.addEventListener('click', (e) => {
        const item = e.target.closest('[data-feature]');
        if (!item) return;
        this.closeFeatureMenu();
        this.openFeature(item.dataset.feature);
      });
    }
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#feature-menu') && !e.target.closest('#feature-btn')) this.closeFeatureMenu();
    });
    $('#inspect-close').addEventListener('click', () => this.closeInspect());
    $('#sheet-layer').addEventListener('click', (e) => {
      if (e.target.closest('[data-close-sheet]')) this.hideSheet();
    });
    this.modalLayer.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop') && this._modalDismissible) this.hideModal();
      const btn = e.target.closest('[data-modal-action]');
      if (btn) this._onModalAction(btn.dataset.modalAction);
    });
    $('#nitro-btn').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.audio.unlock();
      this.race.tap();
    });
    $('#lane-left').addEventListener('click', () => { this.audio.play('lane'); this.race.moveLane(-1); });
    $('#lane-right').addEventListener('click', () => { this.audio.play('lane'); this.race.moveLane(1); });
    $('#inspect-body').addEventListener('click', (e) => this._onInspectClick(e));
    this.sheetBody.addEventListener('click', (e) => this._onSheetClick(e));
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!this.modalLayer.hidden && this._modalDismissible) this.hideModal();
      else if (!this.sheetLayer.hidden) this.hideSheet();
      else if (this.featureMenu && !this.featureMenu.hidden) this.closeFeatureMenu();
      else if (!this.inspect.hidden) this.closeInspect();
    });
    document.addEventListener('visibilitychange', () => this._onVisibility());
    window.addEventListener('pagehide', () => this.store.save(true));
    for (const panel of $$('.panel')) {
      panel.addEventListener('click', (e) => this._onPanelClick(e));
      panel.addEventListener('change', (e) => this._onPanelChange(e));
    }
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
  }

  _onVisibility() {
    if (document.hidden) {
      this._hiddenAt = Date.now();
      this.store.save(true);
    } else if (this._hiddenAt) {
      const mins = (Date.now() - this._hiddenAt) / 60000;
      this._hiddenAt = 0;
      if (mins > 0.5) {
        const before = this.store.offlinePending();
        this.store.accrueOffline(mins);
        if (this.tab === 'wheel') this.renderWheel();
        if (this.store.offlinePending() > before + 1) {
          this.toast(`Offline income: +${formatNum(this.store.offlinePending())} CR ready`, 'good');
        }
      }
      this.store.save(true);
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  setTab(tab, initial = false) {
    if (!tab) return;
    if (this.tab === 'race' && tab !== 'race') this.leaveRace();
    if (!initial) this.audio.play('ui');
    this.applyTab(tab);
  }

  applyTab(tab) {
    if (this.inspectCar) this.closeInspect(true);
    this.hideSheet();
    if (tab !== 'rip') this.hideRevealTag();
    this.tab = tab;
    $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    this.app.classList.remove('racing', 'inspecting');

    if (tab === 'rip') {
      const pack = PACKS_BY_ID[this.store.state.selectedPack] || PACKS[0];
      if (this.lastRipPack !== pack.id) {
        this.world.setRipPack(pack);
        this.lastRipPack = pack.id;
      }
      this.world.setStage('rip');
      this.renderRip();
    } else if (tab === 'garage') {
      this.world.setLineup(this.store.lineup());
      this.world.setStage('garage');
      this.renderGarage();
    } else if (tab === 'workshop') {
      this.world.setWorkshopCar(this.store.selectedCar());
      this.world.setStage('workshop');
      this.renderWorkshop();
    } else if (tab === 'race') {
      this.world.setWorkshopCar(null);
      const track = TRACKS_BY_ID[this.store.state.selectedTrack] || TRACKS[0];
      this.race.enter(track);
      this.renderRace();
    } else if (tab === 'wheel') {
      this.world.setStage('wheel');
      this.renderWheel();
    }
    this.renderHUD();
  }

  // ── Feature menu (corner glass button) ────────────────────────────────────
  toggleFeatureMenu(force) {
    if (!this.featureMenu) return;
    const next = typeof force === 'boolean' ? force : this.featureMenu.hidden;
    this.featureMenu.hidden = !next;
    this.featureBtn?.classList.toggle('open', next);
    this.app.classList.toggle('menu-open', next);
  }

  closeFeatureMenu() {
    this.toggleFeatureMenu(false);
  }

  openFeature(feature) {
    if (feature === 'weather') this.openWeatherShop();
    else if (feature === 'themes') this.openThemeShop();
    else if (feature === 'cosmetics') this.openCosmeticsSheet();
    else if (feature === 'carfuse') this.openCarFuseSheet();
    else if (feature === 'cosmetic-pack') {
      this.store.setSelectedPack(COSMETIC_PACK.id);
      this.world.setRipPack(COSMETIC_PACK);
      this.lastRipPack = COSMETIC_PACK.id;
      this.setTab('rip');
    }
  }

  // ── Weather shop ──────────────────────────────────────────────────────────
  _shopItem(entry, owned, active, action) {
    const color = entry.color || '#4fe3ff';
    const price = entry.price;
    const state = active ? 'ACTIVE' : owned ? 'EQUIP' : `${formatNum(price)} CR`;
    return `<div class="shop-row${active ? ' active' : ''}${owned ? '' : ' locked'}" style="--sc:${color}">
      <i class="shop-dot"></i>
      <div class="shop-copy"><b>${esc(entry.name)}</b><span>${esc(entry.desc || '')}</span></div>
      <button class="shop-btn${active ? ' on' : ''}" data-sheet-action="${action}" data-id="${entry.id}" ${active ? 'disabled' : ''}>${state}</button>
    </div>`;
  }

  openWeatherShop() {
    const s = this.store.state;
    const active = s.activeWeather;
    const standard = WEATHERS.filter(w => !w.mystical).map(w => this._shopItem(w, this.store.ownsWeather(w.id), w.id === active, 'weather-buy')).join('');
    const mystic = WEATHERS.filter(w => w.mystical).map(w => this._shopItem(w, this.store.ownsWeather(w.id), w.id === active, 'weather-buy')).join('');
    const current = WEATHERS_BY_ID[active] || WEATHERS[0];
    this.openSheet('WEATHER SHOP', `
      <div class="shop-head" style="--sc:${current.color}">
        <div><span class="eyebrow">ACTIVE WEATHER</span><b>${esc(current.name)}</b><small>${esc(current.desc)}</small></div>
        <span class="pill">${formatNum(s.credits)} CR</span>
      </div>
      <div class="shop-section"><span class="eyebrow">STANDARD CONDITIONS</span><div class="shop-list">${standard}</div></div>
      <div class="shop-section"><span class="eyebrow" style="color:var(--violet)">MYSTICAL CONDITIONS</span><div class="shop-list">${mystic}</div></div>
      <div class="sheet-actions"><button class="btn btn-ghost" data-close-sheet>DONE</button></div>
    `);
  }

  // ── Global themes ─────────────────────────────────────────────────────────
  openThemeShop() {
    const s = this.store.state;
    const active = s.activeTheme;
    const rows = BACKGROUND_THEMES.map(t => this._shopItem(t, this.store.ownsTheme(t.id), t.id === active, 'theme-buy')).join('');
    const current = THEMES_BY_ID[active] || BACKGROUND_THEMES[0];
    this.openSheet('BACKGROUND THEMES', `
      <div class="shop-head" style="--sc:${current.color}">
        <div><span class="eyebrow">GLOBAL THEME</span><b>${esc(current.name)}</b><small>${esc(current.desc)}</small></div>
        <span class="pill">${formatNum(s.credits)} CR</span>
      </div>
      <div class="shop-list">${rows}</div>
      <div class="small-note" style="margin-top:8px">Themes repaint the sky, fog and ambient light across menus and all 3D views.</div>
      <div class="sheet-actions"><button class="btn btn-ghost" data-close-sheet>DONE</button></div>
    `);
  }

  // ── Cosmetics locker ──────────────────────────────────────────────────────
  openCosmeticsSheet() {
    const car = this.store.selectedCar();
    const owned = COSMETICS.filter(c => this.store.ownsCosmetic(c.id));
    const equipped = car ? this.store.state.equippedCosmetics[car.id] : null;
    const rows = COSMETICS.map(c => {
      const have = this.store.ownsCosmetic(c.id);
      const on = equipped === c.id;
      return `<div class="shop-row${on ? ' active' : ''}${have ? '' : ' locked'}" style="--sc:${c.color}">
        <i class="shop-dot"></i>
        <div class="shop-copy"><b>${esc(c.name)}</b><span>${esc(c.slot)} · ${esc(c.desc)}</span></div>
        ${have
          ? `<button class="shop-btn${on ? ' on' : ''}" data-sheet-action="cosmetic-equip" data-id="${c.id}" ${!car || on ? 'disabled' : ''}>${on ? 'ON' : 'EQUIP'}</button>`
          : `<span class="shop-tag">PACK DROP</span>`}
      </div>`;
    }).join('');
    this.openSheet('COSMETICS LOCKER', `
      <div class="shop-head" style="--sc:#ff7ae0">
        <div><span class="eyebrow">STYLE LAB · ${owned.length}/${COSMETICS.length}</span><b>${car ? esc(car.name) : 'NO CAR SELECTED'}</b><small>Fuses cosmetics onto the active build. Finish drops repaint the clearcoat.</small></div>
        <span class="pill">${this.store.state.stats.cosmeticPulls} DROPS</span>
      </div>
      <div class="shop-list">${rows}</div>
      <div class="sheet-actions">
        <button class="btn btn-primary" data-sheet-action="goto-cosmetic">GET COSMETIC PACK</button>
        <button class="btn btn-ghost" data-close-sheet>CLOSE</button>
      </div>
    `);
  }

  // ── Car fuse ──────────────────────────────────────────────────────────────
  openCarFuseSheet() {
    const owned = CARS.filter(c => this.store.isOwned(c.id));
    if (!this.carFuseId || !this.store.isOwned(this.carFuseId)) {
      this.carFuseId = this.store.state.selectedCar || owned[0]?.id || null;
    }
    const car = this.carFuseId ? CARS_BY_ID[this.carFuseId] : null;
    const level = car ? this.store.carFusionLevel(car.id) : 0;
    const cost = car ? this.store.carFusionCost(car.id) : null;
    const stats = car ? this.store.displayStats(car) : null;
    const bp = car ? this.store.blueprintCount(car.id) : 0;
    const can = Boolean(car && cost && bp >= cost.blueprints && this.store.state.scraps >= cost.scraps
      && this.store.state.fusionCores >= cost.cores && this.store.state.credits >= cost.credits);
    const rows = owned.map(c => {
      const r = RARITIES[c.rarity];
      return `<button class="fusion-car${c.id === this.carFuseId ? ' active' : ''}" data-sheet-action="car-fuse-select" data-id="${c.id}">
        <i class="vr-dot" style="background:${r.color};box-shadow:0 0 6px ${r.color}"></i><b>${esc(c.name)}</b><span>RANK ${this.store.carFusionLevel(c.id)}/3</span>
      </button>`;
    }).join('');
    this.openSheet('CAR FUSE', `
      <div class="shop-head" style="--sc:${car ? RARITIES[car.rarity].color : '#4fe3ff'}">
        <div><span class="eyebrow">RARITY FORGE</span><b>${car ? esc(car.name) : 'NO CARS'}</b><small>${car ? `Fusion rank ${level}/3 · +${Math.round(level * 5.5)}% all stats` : 'Rip a pack to add a car.'}</small></div>
        <span class="pill">RANK ${level}/3</span>
      </div>
      ${stats ? `<div class="fuse-stats"><span>SPD <b>${stats.speed}</b></span><span>ACC <b>${stats.accel}</b></span><span>GRP <b>${stats.grip}</b></span></div>` : ''}
      <div class="eyebrow" style="margin:7px 0 6px">SELECT BUILD</div>
      <div class="fusion-cars">${rows || `<div class="empty-note"><b>NO CARS YET</b>Rip a pack first.</div>`}</div>
      ${cost ? `<div class="fuse-cost">
        <span class="${bp >= cost.blueprints ? 'ok' : ''}">${cost.blueprints} BP</span>
        <span class="${this.store.state.scraps >= cost.scraps ? 'ok' : ''}">${cost.scraps} SC</span>
        <span class="${this.store.state.fusionCores >= cost.cores ? 'ok' : ''}">${cost.cores} CORE</span>
        <span class="${this.store.state.credits >= cost.credits ? 'ok' : ''}">${formatNum(cost.credits)} CR</span>
      </div>` : `<div class="small-note">Rank 3 reached. This build is fully fused.</div>`}
      <button class="btn btn-gold btn-block" data-sheet-action="car-fuse-go" ${can ? '' : 'disabled'}>${cost ? 'FUSE BUILD' : 'MAX RANK'}</button>
      <div class="small-note" style="margin-top:8px;text-align:center">Duplicates feed blueprints. Fusion spends spare blueprints, scraps, cores and credits for permanent stats.</div>
      <div class="sheet-actions"><button class="btn btn-ghost" data-close-sheet>CLOSE</button></div>
    `);
  }

  // ── Store events ──────────────────────────────────────────────────────────
  _onStore(type, payload) {
    this.renderHUD();
    if (type === 'pull' && payload) {
      if (this.tab === 'garage') {
        this.world.setLineup(this.store.lineup());
        this.renderGarage();
      }
      if (this.store.selectedCar()?.id !== this.world.workshopCar?.userData?.car?.id) {
        if (this.tab === 'workshop') {
          this.world.setWorkshopCar(this.store.selectedCar());
          this.renderWorkshop();
        }
      }
    } else if (type === 'upgrade' || type === 'fusion' || type === 'vault' || type === 'carFusion') {
      if (this.tab === 'workshop') this.renderWorkshop();
      if (this.tab === 'garage') this.renderGarage();
    } else if (type === 'weather') {
      this.world.setWeather(this.store.activeWeather());
    } else if (type === 'theme') {
      this.world.setTheme(this.store.activeTheme());
    } else if (type === 'cosmetic') {
      this.world.setLineup(this.store.lineup());
      this.world.setWorkshopCar(this.store.selectedCar());
      if (this.tab === 'garage') this.renderGarage();
    } else if (type === 'selected') {
      if (this.tab === 'workshop') {
        this.world.setWorkshopCar(this.store.selectedCar());
        this.renderWorkshop();
      }
      if (this.tab === 'garage') this.renderGarage();
    } else if (type === 'offlineCollect' || type === 'wheelReward') {
      if (this.tab === 'wheel') this.renderWheel();
    } else if (type === 'raceFinish') {
      if (this.tab === 'race') this.renderHUD();
    }
  }

  renderHUD() {
    const credits = $('#hud-credits');
    const scraps = $('#hud-scraps');
    if (credits) credits.textContent = formatNum(this.store.state.credits);
    if (scraps) scraps.textContent = formatNum(this.store.state.scraps);
  }

  // ── RIP panel ─────────────────────────────────────────────────────────────
  renderRip() {
    const pack = PACKS_BY_ID[this.store.state.selectedPack] || PACKS[0];
    const price = pack.price;
    const can = this.store.state.credits >= price;
    const disabled = !can || this.revealing;
    const odds = pack.odds.map((o, i) => {
      const r = RARITIES[RARITY_ORDER[i]];
      return `<span class="odds-chip"><i class="rar-dot" style="color:${r.color}"></i>${r.short} <b>${o}%</b></span>`;
    }).join('');
    const featured = pack.kind === 'cosmetic'
      ? `${COSMETICS.length} COSMETICS · MYSTIC 30%`
      : (pack.focus || []).map(id => CARS_BY_ID[id]?.name).filter(Boolean).join(' · ');
    const packList = [COSMETIC_PACK, ...PACKS];
    const packCards = packList.map(p => {
      const sel = p.id === pack.id;
      const dots = RARITY_ORDER.map((r, i) => `<i style="background:${RARITIES[r].color};opacity:${Math.min(1, 0.2 + p.odds[i] / 22)}"></i>`).join('');
      const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return `<button type="button" class="pack-card${sel ? ' selected' : ''}" style="--pk-a:${p.color2};--pk-b:#05070b;--pk-sel:${p.color};--pk-glow:${rgba(p.color, 0.28)}" data-action="pack" data-id="${p.id}">
        <div class="pk-art"><span class="pk-code">${p.tier}</span><span class="pk-glyph">${initials}</span></div>
        <div class="pk-body">
          <div class="pk-name">${esc(p.name)}</div>
          <div class="pk-foot"><span class="pk-cost">${formatNum(p.price)} CR</span><span class="pk-odds">${dots}</span></div>
        </div>
      </button>`;
    }).join('');
    const el = $('#panel-rip');
    el.innerHTML = `
      <div class="rip-top">
        <div class="rip-title"><h2>PACK DROP</h2><span>${packList.length} SERIES · 5 RARITIES · ${COSMETICS.length} COSMETICS</span></div>
        <div class="rip-price"><b>${formatNum(price)}<small>CR</small></b><span>${pack.tier} SERIES</span></div>
      </div>
      <div class="scroll-x pack-strip">${packCards}</div>
      <div class="odds-line">${pack.kind === 'cosmetic' ? `<span class="odds-title">DROP</span><div class="odds-chips"><span class="odds-chip">FINISH · GLOW · AERO · MYSTIC <b>30%</b></span></div>` : `<span class="odds-title">ODDS</span><div class="odds-chips">${odds}</div>`}</div>
      <div class="rip-actions">
        <button class="btn btn-primary btn-lg" data-action="rip" ${disabled ? 'disabled' : ''}>
          ${this.revealing ? 'RIPPING…' : 'RIP PACK'} <span class="sub">${formatNum(price)} CR</span>
        </button>
        <div class="auto-box">
          <label class="toggle"><input type="checkbox" id="auto-rip" ${this.store.state.autoRip ? 'checked' : ''}><span class="track"></span><span class="toggle-lbl">AUTO RIP</span></label>
          <span class="auto-state">${this.store.state.autoRip ? 'CHAIN ON' : 'CHAIN OFF'}</span>
        </div>
      </div>
      <div class="rip-meta">
        <span>PULLS <b>${formatNum(this.store.state.stats.pulls)}</b></span>
        <span class="pack-feature">FEATURED <b>${esc(featured)}</b></span>
        <span>DUPLICATES <b>→ BP</b></span>
      </div>`;
    this._centerSelected('.pack-strip');
  }

  rip() {
    if (this.revealing) return;
    const pack = PACKS_BY_ID[this.store.state.selectedPack];
    if (!pack) return;
    const result = this.store.pull(pack.id);
    if (!result.ok) {
      this.audio.play('error');
      this.toast(result.reason || 'Could not rip that pack.', 'warn');
      return;
    }
    this.revealing = true;
    this.hideRevealTag();
    this.audio.play('rip');
    this.renderRip();
    this.renderHUD();
    this.world.playRipReveal(result.car, () => {
      this.revealing = false;
      this.audio.play(result.isNew ? 'new' : 'reveal');
      this.showRevealTag(result);
      this.renderRip();
      this.renderHUD();
      if (this.tab === 'garage') {
        this.world.setLineup(this.store.lineup());
        this.renderGarage();
      }
      if (result.isNew) this.toast(`NEW ${RARITIES[result.car.rarity].name.toUpperCase()} · ${result.car.name}`, 'good');
      else this.toast(`Duplicate · +${result.blueprints} blueprint${result.blueprints > 1 ? 's' : ''}, +${result.scraps} scrap`, 'good');
      if (this.store.state.autoRip) this._scheduleAutoRip();
    });
  }

  _scheduleAutoRip() {
    clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => {
      if (this.tab !== 'rip' || this.revealing || !this.store.state.autoRip) return;
      const pack = PACKS_BY_ID[this.store.state.selectedPack];
      if (!pack) return;
      if (this.store.state.credits < pack.price) {
        this.store.toggleAutoRip();
        this.renderRip();
        this.toast('Auto Rip paused — not enough credits', 'warn');
        return;
      }
      this.rip();
    }, 1050);
  }

  showRevealTag(result) {
    clearTimeout(this.revealTimer);
    const rar = RARITIES[result.car.rarity];
    const trait = result.car.trait ? TRAITS[result.car.trait] : null;
    this.revealTag.innerHTML = `
      <div class="rt-badge" style="color:${rar.color};border-color:${rgba(rar.color, 0.55)};background:${rgba(rar.color, 0.1)}">${rar.short}<br>${trait ? trait.mark : '—'}</div>
      <div class="rt-copy"><b>${esc(result.car.name)}</b><span style="color:${rar.color}">${esc(rar.name)}${trait ? ' · ' + esc(trait.name) : ''}</span></div>
      <span class="${result.isNew ? 'rt-new' : 'rt-dup'}">${result.isNew ? 'NEW' : '+' + result.blueprints + ' BP'}</span>`;
    this.revealTag.hidden = false;
    this.revealTimer = setTimeout(() => this.hideRevealTag(), 6500);
  }

  hideRevealTag() {
    clearTimeout(this.revealTimer);
    this.revealTag.hidden = true;
  }

  // ── GARAGE panel ──────────────────────────────────────────────────────────
  renderGarage() {
    const lineup = this.store.lineup();
    let list = CARS.slice();
    if (this.garageFilter === 'owned') list = list.filter(c => this.store.isOwned(c.id));
    else if (this.garageFilter !== 'all') list = list.filter(c => c.rarity === this.garageFilter);
    list.sort((a, b) => {
      const oa = this.store.isOwned(a.id) ? 0 : 1;
      const ob = this.store.isOwned(b.id) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      const ta = RARITIES[a.rarity].tier, tb = RARITIES[b.rarity].tier;
      if (ta !== tb) return tb - ta;
      return a.name.localeCompare(b.name);
    });
    const filters = [
      ['all', 'ALL'], ['owned', 'OWNED'], ['stock', 'STOCK'], ['street', 'STREET'],
      ['pro', 'PRO'], ['prototype', 'PROTO'], ['apex', 'APEX'],
    ].map(([id, label]) => `<button class="chip${this.garageFilter === id ? ' active' : ''}" data-action="filter" data-id="${id}">${label}</button>`).join('');
    const cards = list.length ? list.map(car => this._carCard(car)).join('') : `<div class="empty-note"><b>NO CARS HERE</b>Change the filter or rip another pack.</div>`;
    const bpTotal = Object.values(this.store.state.blueprints).reduce((a, b) => a + b, 0);
    const best = this.store.bestCar();
    const el = $('#panel-garage');
    el.innerHTML = `
      <div class="section-head">
        <div class="section-title"><i class="tick"></i>SHOWROOM</div>
        <span class="section-sub">${lineup.length}/6 SLOTS FILLED</span>
      </div>
      <div class="garage-note"><span>${lineup.length ? 'TOP RARITY LINEUP ON STAGE' : 'RIP A PACK TO FILL THE STAGE'}</span><span>TAP A CARD TO INSPECT IN 3D</span></div>
      <div class="filter-row">${filters}</div>
      <div class="roster">${cards}</div>
      <div class="garage-note"><span>BLUEPRINTS <b>${formatNum(bpTotal)}</b></span><span>BEST <b>${esc(best ? best.name : '—')}</b></span><span>OWNED <b>${this.store.ownedCount()}</b></span></div>`;
    this._centerSelected('.roster');
  }

  _carCard(car) {
    const rar = RARITIES[car.rarity];
    const owned = this.store.isOwned(car.id);
    const selected = owned && this.store.state.selectedCar === car.id;
    const trait = car.trait ? TRAITS[car.trait] : null;
    const stats = carDisplayStats(car, this.store.levels(car.id));
    const bp = this.store.blueprintCount(car.id);
    const bar = (v, cls) => `<span class="cc-stat"><i class="${cls}" style="width:${Math.min(100, (v / 120) * 100)}%"></i></span>`;
    return `<button type="button" class="car-card${owned ? '' : ' locked'}${selected ? ' selected' : ''}" style="--rar:${rar.color};--rar-soft:${rar.soft}" data-action="inspect" data-id="${car.id}">
      <div class="cc-top">
        <span class="cc-rar"><i class="rar-dot" style="color:${rar.color}"></i>${rar.short}</span>
        ${trait ? `<span class="cc-trait" style="color:${trait.color};background:${rgba(trait.color, 0.12)};border:1px solid ${rgba(trait.color, 0.35)}">${trait.mark}</span>` : ''}
        ${carSvg(car, 86, 34)}
      </div>
      <div class="cc-body">
        <div class="cc-name">${esc(car.name)}</div>
        <div class="cc-stats">${bar(stats.speed, 'sp')}${bar(stats.accel, 'ac')}${bar(stats.grip, 'gr')}</div>
        <div class="cc-foot"><span>${owned ? 'OWNED' : 'LOCKED'}</span><span class="bp-chip">${bp ? bp + ' BP' : ''}</span></div>
      </div>
    </button>`;
  }

  openInspect(car) {
    if (!car) return;
    this.inspectReturn = this.tab === 'workshop' ? 'workshop' : 'garage';
    this.inspectCar = car;
    this.world.openCard(car);
    this.app.classList.add('inspecting');
    this.inspect.hidden = false;
    this.renderInspect();
    this.audio.play('ui');
  }

  renderInspect() {
    const car = this.inspectCar;
    if (!car) return;
    const rar = RARITIES[car.rarity];
    const owned = this.store.isOwned(car.id);
    const stats = carDisplayStats(car, this.store.levels(car.id));
    const levels = this.store.levels(car.id);
    const trait = car.trait ? TRAITS[car.trait] : null;
    const bp = this.store.blueprintCount(car.id);
    const traitBadge = trait
      ? `<span class="badge trait-${trait.id}"><i class="bdot"></i>${trait.name}</span>`
      : `<span class="pill">NO TRAIT</span>`;
    const statRow = (label, val, max, cls, lv) => `
      <div class="inspect-stat"><span class="is-lbl">${label}</span><span class="meter ${cls}"><i style="width:${Math.min(100, (val / 120) * 100)}%"></i></span><span class="is-val">${val} <em style="color:var(--dim);font-style:normal;font-size:7px">L${lv}</em></span></div>`;
    $('#inspect-rarity').innerHTML = `<span style="color:${rar.color}"><i class="rar-dot" style="color:${rar.color};display:inline-block;margin-right:4px"></i>${rar.name.toUpperCase()}</span>`;
    $('#inspect-body').innerHTML = `
      <div class="inspect-head">
        <div class="inspect-name">
          <span class="eyebrow">${owned ? 'IN YOUR GARAGE' : 'NOT YET OWNED'} · CARD N° ${String(car.id.length * 37 + car.speed).slice(0, 4)}</span>
          <h2>${esc(car.name)}</h2>
          <div class="trait-line">${traitBadge}${trait ? `<span class="pill" style="color:${trait.color};border-color:${rgba(trait.color, 0.3)}">${esc(trait.perk)}</span>` : ''}</div>
        </div>
        <div class="inspect-badge">${owned ? 'BLUEPRINTS' : 'RARITY'}<b>${owned ? bp : rar.short}</b></div>
      </div>
      <div class="inspect-stats">
        ${statRow('SPEED', stats.speed, 120, '', levels.speed)}
        ${statRow('ACCEL', stats.accel, 120, 'accel', levels.accel)}
        ${statRow('GRIP', stats.grip, 120, 'grip', levels.grip)}
      </div>
      <div class="inspect-actions">
        ${owned ? `<button class="btn btn-primary" data-inspect="workshop">WORKSHOP</button>
          <button class="btn btn-ghost" data-inspect="feature">FEATURED</button>` :
          `<button class="btn btn-primary" data-inspect="rip">FIND IN PACKS</button>`}
        <button class="btn btn-ghost btn-icon-only" data-inspect="close" aria-label="Close">✕</button>
      </div>`;
  }

  _onInspectClick(e) {
    const btn = e.target.closest('[data-inspect]');
    if (!btn) return;
    const action = btn.dataset.inspect;
    if (action === 'close') return this.closeInspect();
    if (action === 'feature' && this.inspectCar) {
      this.store.setSelectedCar(this.inspectCar.id);
      this.audio.play('ui');
      this.toast(`${this.inspectCar.name} featured for races`, 'good');
      this.renderInspect();
      return;
    }
    if (action === 'workshop' && this.inspectCar) {
      const id = this.inspectCar.id;
      this.store.setSelectedCar(id);
      this.closeInspect(true);
      this.setTab('workshop');
      return;
    }
    if (action === 'rip') {
      this.closeInspect(true);
      this.setTab('rip');
    }
  }

  closeInspect(silent = false) {
    this.inspectCar = null;
    this.inspect.hidden = true;
    this.app.classList.remove('inspecting');
    if (this.inspectReturn === 'workshop') {
      this.world.setWorkshopCar(this.store.selectedCar());
      if (this.tab === 'workshop') this.world.setStage('workshop');
    } else if (this.tab === 'garage') {
      this.world.setStage('garage');
      this.renderGarage();
    } else if (this.tab === 'rip') {
      this.world.setStage('rip');
    }
    if (!silent) this.audio.play('ui');
  }

  // ── WORKSHOP panel ────────────────────────────────────────────────────────
  renderWorkshop() {
    const car = this.store.selectedCar();
    const el = $('#panel-workshop');
    if (!car) {
      el.innerHTML = `<div class="section-head"><div class="section-title"><i class="tick"></i>WORKSHOP</div></div>
        <div class="empty-note"><b>NO CAR IN THE BAY</b>Rip a pack to add a car, then tune it here.<div class="divider"></div><button class="btn btn-primary btn-sm" data-action="goto-rip">GO TO RIP</button></div>`;
      return;
    }
    const rar = RARITIES[car.rarity];
    const trait = car.trait ? TRAITS[car.trait] : null;
    const levels = this.store.levels(car.id);
    const stats = carDisplayStats(car, levels);
    const totalLv = levels.speed + levels.accel + levels.grip;
    const bp = this.store.blueprintCount(car.id);
    const cores = this.store.state.fusionCores;
    const row = (stat, label, cls) => {
      const lv = levels[stat];
      const cur = stats[stat];
      const next = lv < MAX_LEVEL ? statWithLevel(car[stat], lv + 1) : cur;
      const cost = upgradeCost(lv);
      const maxed = lv >= MAX_LEVEL;
      const need = maxed ? 'FULL' : bp > 0 ? '1 BP' : cores > 0 ? '1 CORE' : 'NO BP';
      return `<div class="upgrade-row${maxed ? ' maxed' : ''}">
        <div class="up-label"><b>${label}</b><span>LV ${lv}/${MAX_LEVEL}</span></div>
        <div class="up-mid">
          <div class="meter ${cls} up-meter"><i style="width:${Math.min(100, (cur / 120) * 100)}%"></i></div>
          <div class="up-nums"><span>${cur}</span><b class="hot">${maxed ? 'MAX' : '→ ' + next}</b></div>
        </div>
        <button class="up-btn${!maxed && bp === 0 && cores === 0 ? ' need' : ''}" data-action="upgrade" data-stat="${stat}" ${maxed ? 'disabled' : ''}>
          <b>${maxed ? 'MAX' : formatNum(cost) + ' CR'}</b><span>${need}</span>
        </button>
      </div>`;
    };
    el.innerHTML = `
      <div class="section-head">
        <div class="section-title"><i class="tick"></i>WORKSHOP</div>
        <span class="section-sub">INSPECTION BAY 01</span>
      </div>
      <div class="ws-head">
        <div class="ws-thumb" style="--rar-soft:${rar.soft}">${carSvg(car, 40, 20)}</div>
        <div class="ws-copy"><b>${esc(car.name)}</b><span style="color:${rar.color}"><i class="rar-dot" style="color:${rar.color}"></i>${rar.name.toUpperCase()}${trait ? ' · ' + trait.name.toUpperCase() : ''}</span><span>${bp} BP · ${cores} CORE${cores === 1 ? '' : 'S'} · ${formatNum(this.store.state.scraps)} SC</span></div>
        <div class="ws-level">TUNE<b>${totalLv}/${MAX_LEVEL * 3}</b></div>
      </div>
      <div class="upgrade-list">
        ${row('speed', 'SPEED', '')}
        ${row('accel', 'ACCEL', 'accel')}
        ${row('grip', 'GRIP', 'grip')}
      </div>
      <div class="ws-links">
        <button class="ws-link" data-action="fusion"><span class="li">⚛</span><span class="lc"><b>FUSION</b><span>3 BP + 20 SC → CORE</span></span><span class="la">›</span></button>
        <button class="ws-link vault" data-action="vault"><span class="li">▤</span><span class="lc"><b>BLUEPRINT VAULT</b><span>${formatNum(bp)} BP · ${formatNum(this.store.state.scraps)} SC</span></span><span class="la">›</span></button>
      </div>
      <div class="small-note" style="margin-top:7px">Upgrades need 1 blueprint <b style="color:#9fefff">or</b> 1 fusion core plus credits. Fusion cores work on any car. Your garage, your rules.</div>`;
  }

  _upgrade(stat) {
    const car = this.store.selectedCar();
    if (!car) return;
    const res = this.store.upgrade(car.id, stat);
    if (!res.ok) {
      this.audio.play('error');
      this.toast(res.reason || 'Upgrade unavailable.', 'warn');
      return;
    }
    this.audio.play('upgrade');
    this.world.setWorkshopCar(car);
    this.world.pulseWorkshop();
    this.renderWorkshop();
    this.renderHUD();
    this.toast(`${stat.toUpperCase()} upgraded to LV ${res.level}${res.usedCore ? ' · used core' : ''}`, 'good');
  }

  openFusionSheet() {
    const withBp = CARS.filter(c => this.store.blueprintCount(c.id) > 0);
    if (!this.fusionCarId || this.store.blueprintCount(this.fusionCarId) === 0) {
      this.fusionCarId = withBp[0]?.id || this.store.selectedCar()?.id || null;
    }
    const car = this.fusionCarId ? CARS_BY_ID[this.fusionCarId] : null;
    const bp = car ? this.store.blueprintCount(car.id) : 0;
    const can = bp >= 3 && this.store.state.scraps >= 20;
    const rows = withBp.length
      ? withBp.map(c => {
        const r = RARITIES[c.rarity];
        const n = this.store.blueprintCount(c.id);
        return `<button class="fusion-car${c.id === this.fusionCarId ? ' active' : ''}" data-sheet-action="fuse-select" data-id="${c.id}">
          <i class="vr-dot" style="background:${r.color};box-shadow:0 0 6px ${r.color}"></i><b>${esc(c.name)}</b><span>${n} BP</span>
        </button>`;
      }).join('')
      : `<div class="empty-note"><b>NO BLUEPRINTS YET</b>Rip duplicate cars to stack blueprints.</div>`;
    this.openSheet('FUSION', `
      <div class="fusion-box">
        <div class="fb-top"><b>CONVERT SPARES</b><span>${formatNum(this.store.state.fusionCores)} CORES</span></div>
        <p>Fusion compresses spare blueprints into a universal core. A core upgrades any stat on any car when you are out of that car's blueprints.</p>
        <div class="fusion-recipe"><span class="fr-item">3 × BP</span><i>+</i><span class="fr-item">20 SC</span><i>→</i><span class="fr-item">1 × FUSION CORE</span></div>
      </div>
      <div class="eyebrow" style="margin:4px 0 6px">SELECT BLUEPRINT STACK</div>
      <div class="fusion-cars">${rows}</div>
      <div class="fusion-recipe">${car ? `<span class="fr-item">${esc(car.name)} · ${bp} BP available</span>` : ''}</div>
      <button class="btn btn-gold btn-block" data-sheet-action="fuse-go" ${can ? '' : 'disabled'}>${car ? `FUSE ${esc(car.name)} STACK` : 'FUSE'}</button>
      <div class="small-note" style="margin-top:8px;text-align:center">Each car keeps its own blueprint stack. Fusion is optional.</div>
    `);
  }

  openVaultSheet() {
    const rows = CARS.filter(c => this.store.blueprintCount(c.id) > 0).map(c => {
      const r = RARITIES[c.rarity];
      const n = this.store.blueprintCount(c.id);
      const owned = this.store.isOwned(c.id);
      return `<div class="vault-row${owned ? '' : ' unowned'}">
        <i class="vr-dot" style="background:${r.color};box-shadow:0 0 6px ${r.color}"></i>
        <div><div class="vr-name">${esc(c.name)}</div><div class="vr-rar" style="color:${r.color}">${r.name}</div></div>
        <span class="vr-count">${n} BP</span>
        <button class="btn btn-ghost" data-sheet-action="vault-scrap" data-id="${c.id}">+${Math.max(2, Math.ceil(r.scrap / 3))} SC</button>
      </div>`;
    }).join('');
    const totalBp = Object.values(this.store.state.blueprints).reduce((a, b) => a + b, 0);
    this.openSheet('BLUEPRINT VAULT', `
      <div class="vault-summary">
        <div class="vs-box"><b>${formatNum(totalBp)}</b><span>Blueprints</span></div>
        <div class="vs-box"><b>${formatNum(this.store.state.fusionCores)}</b><span>Fusion cores</span></div>
        <div class="vs-box"><b>${formatNum(this.store.state.scraps)}</b><span>Scraps</span></div>
      </div>
      <div class="small-note" style="margin-bottom:9px">Every duplicate pull adds blueprints for that car. Keep them for upgrades, fuse 3 into a universal core, or convert a spare into scraps.</div>
      <div class="vault-list">${rows || `<div class="empty-note"><b>VAULT EMPTY</b>Duplicate pulls land here automatically.</div>`}</div>
      <div class="sheet-actions"><button class="btn btn-ghost" data-close-sheet>DONE</button></div>
    `);
  }

  _onSheetClick(e) {
    const btn = e.target.closest('[data-sheet-action]');
    if (!btn) return;
    const action = btn.dataset.sheetAction;
    if (action === 'fuse-select') {
      this.fusionCarId = btn.dataset.id;
      this.audio.play('ui');
      this.openFusionSheet();
    } else if (action === 'fuse-go') {
      if (!this.fusionCarId) return;
      const res = this.store.fuse(this.fusionCarId);
      if (!res.ok) { this.audio.play('error'); this.toast(res.reason, 'warn'); return; }
      this.audio.play('upgrade');
      this.toast('Fusion complete · +1 universal core', 'good');
      this.openFusionSheet();
      this.renderWorkshop();
      this.renderHUD();
    } else if (action === 'vault-scrap') {
      const res = this.store.scrapBlueprint(btn.dataset.id);
      if (!res.ok) { this.audio.play('error'); this.toast(res.reason, 'warn'); return; }
      this.audio.play('ui');
      this.toast(`Converted 1 blueprint → +${res.amount} SC`, 'good');
      this.openVaultSheet();
      this.renderWorkshop();
      this.renderHUD();
    } else if (action === 'reset-open') {
      this.openResetConfirm();
    }
  }

  openResetConfirm() {
    this.showModal(`
      <div class="result-kicker">DESTRUCTIVE ACTION</div>
      <div class="wheel-result" style="margin-top:8px">
        <div class="wr-ico" style="color:#ff8f98;background:rgba(255,90,99,.12);border-color:rgba(255,90,99,.3)">!</div>
        <h2>RESET EVERYTHING?</h2>
        <p>Garage, credits, blueprints and records will be wiped.</p>
      </div>
      <div class="result-actions" style="margin-top:14px">
        <button class="btn btn-ghost" data-modal-action="reset-cancel">KEEP MY GARAGE</button>
        <button class="btn btn-primary" style="background:linear-gradient(135deg,#ff5a63,#a80f36)" data-modal-action="reset-confirm">RESET</button>
      </div>
    `, { dismissible: true });
  }

  // ── RACE panel ────────────────────────────────────────────────────────────
  renderRace() {
    const track = TRACKS_BY_ID[this.store.state.selectedTrack] || TRACKS[0];
    const best = this.store.state.races[track.id];
    const selectedCar = this.store.selectedCar();
    const cards = TRACKS.map((t, i) => {
      const sel = t.id === track.id;
      const diff = Array.from({ length: 3 }, (_, d) => `<i class="${d < t.diff ? 'on' : ''}"></i>`).join('');
      const initials = t.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return `<button type="button" class="track-card${sel ? ' selected' : ''}" style="--t1:${t.color2};--t2:${t.bg};--tacc:${t.color}" data-action="track" data-id="${t.id}">
        <div class="tk-art"><span class="tk-glyph">${initials}</span><span class="tk-num">T${String(i + 1).padStart(2, '0')}</span></div>
        <div class="tk-body">
          <div class="tk-name">${esc(t.name)}</div>
          <div class="tk-meta"><span>${formatNum(t.reward)} CR</span><span class="tk-diff">${diff}</span></div>
        </div>
      </button>`;
    }).join('');
    const el = $('#panel-race');
    el.innerHTML = `
      <div class="section-head">
        <div class="section-title"><i class="tick"></i>SPRINT SELECT</div>
        <span class="section-sub">12 LOCATIONS · 3 LANES</span>
      </div>
      <div class="scroll-x">${cards}</div>
      <div class="race-info">
        <div class="race-loc"><b style="color:${track.color}">${esc(track.name)}</b><span>${track.theme.toUpperCase()} · PAYOUT ${formatNum(track.reward)} CR · AI ${track.ai.toFixed(1)}</span></div>
        <div class="race-best"><span>BEST TIME</span><b>${best ? formatTime(best) : '—'}</b></div>
      </div>
      <div class="race-launch">
        <button class="btn btn-primary btn-lg" data-action="start-race">START SPRINT <span class="sub">TAP NITRO TO WIN</span></button>
      </div>
      <div class="race-empty-tip"><span>SWIPE OR USE ‹ › TO CHANGE LANE · AVOID HAZARDS</span><b>${selectedCar ? esc(selectedCar.name) : 'LOANER'}</b></div>`;
    this._centerSelected('.scroll-x');
    $('#race-hud') && (this.raceHud.hidden = true);
  }

  startRace() {
    if (!this.store.selectedCar()) {
      this.toast('Rip a pack to get a car first.', 'warn');
      return;
    }
    this.hideSheet();
    this.hideModal();
    this.beginRaceView();
    const started = this.race.start();
    if (!started) return;
    this.audio.play('ui');
  }

  beginRaceView() {
    this.raceView = true;
    this.app.classList.add('racing');
    this.app.classList.remove('inspecting');
    this.raceHud.hidden = false;
    this.hideRevealTag();
    this.hideModal();
    const track = TRACKS_BY_ID[this.store.state.selectedTrack];
    if (track) {
      const nameEl = $('#race-track-name');
      if (nameEl) nameEl.textContent = track.name.toUpperCase();
    }
    this._setNitroUI({ nitro: 1, boost: false });
    const hint = $('#race-hint');
    if (hint) {
      hint.style.opacity = '1';
      clearTimeout(this.raceHintTimer);
      this.raceHintTimer = setTimeout(() => { if (hint) hint.style.opacity = '0'; }, 5200);
    }
    this.raceToken += 1;
  }

  leaveRace() {
    clearTimeout(this.raceHintTimer);
    clearTimeout(this.raceResultTimer);
    this.raceToken += 1;
    this.raceView = false;
    this.app.classList.remove('racing');
    this.raceHud.hidden = true;
    this.hideModal();
    if (this.tab === 'race') this.race.exit();
  }

  endRaceView() {
    clearTimeout(this.raceResultTimer);
    this.raceToken += 1;
    this.raceView = false;
    this.app.classList.remove('racing');
    this.raceHud.hidden = true;
    this.hideModal();
    const track = TRACKS_BY_ID[this.store.state.selectedTrack];
    if (track) this.race.enter(track);
    this.renderRace();
  }

  raceCallbacks() {
    return {
      onHUD: (u) => this.updateRaceHUD(u),
      onCountdown: (text) => this.showCountdown(text),
      onFinish: (res) => this.onRaceFinish(res),
      onNitro: (active) => this._setNitroUI({ nitro: this._lastHUD?.nitro ?? 1, boost: active }),
      onHit: () => this.raceHit(),
      onStart: () => { if (!this.raceView) this.beginRaceView(); },
      onEvent: (evt) => this.audio.play(evt),
    };
  }

  updateRaceHUD(u) {
    this._lastHUD = u;
    if (u.track) {
      const nameEl = $('#race-track-name');
      if (nameEl) nameEl.textContent = u.track.name.toUpperCase();
    }
    const pos = $('#race-pos');
    if (pos) pos.textContent = `${u.position}/3`;
    const speed = $('#race-speed');
    if (speed) speed.textContent = String(Math.round(u.speed * 4.35));
    const time = $('#race-time');
    if (time) time.textContent = u.time.toFixed(2);
    const pct = Math.max(0, Math.min(100, (u.dist / u.length) * 100));
    const fill = $('#race-progress-fill');
    if (fill) fill.style.width = pct + '%';
    const dot = $('#race-progress-dot');
    if (dot) dot.style.left = pct + '%';
    const dist = $('#race-dist');
    if (dist) dist.textContent = `${Math.floor(u.dist)} / ${u.length} M`;
    this._setNitroUI(u);
  }

  _setNitroUI(u) {
    const fill = $('#nitro-fill');
    const btn = $('#nitro-btn');
    if (fill) fill.style.width = `${Math.max(0, Math.min(1, u.nitro ?? 0)) * 100}%`;
    if (btn) {
      const ready = (u.nitro ?? 0) >= 0.3;
      btn.classList.toggle('empty', !ready);
      btn.classList.toggle('ready', ready);
      btn.classList.toggle('boosting', Boolean(u.boost));
    }
  }

  showCountdown(text) {
    const el = document.createElement('div');
    el.className = 'race-count' + (text === 'GO' ? ' go' : '');
    el.textContent = text;
    this.app.appendChild(el);
    setTimeout(() => el.remove(), 980);
  }

  raceHit() {
    this.audio.play('hit');
    const flash = document.createElement('div');
    flash.className = 'race-hit-flash';
    this.app.appendChild(flash);
    setTimeout(() => flash.remove(), 380);
    this.toast('Hazard hit · speed cut', 'warn');
    this.raceFx.classList.add('on');
    setTimeout(() => this.raceFx.classList.remove('on'), 250);
  }

  onRaceFinish(res) {
    const token = this.raceToken;
    this.updateRaceHUD({
      phase: 'done', dist: this.race?._last ?? 480, length: 480,
      speed: 0, nitro: 0, position: res.placement, time: res.time,
      boost: false, track: res.track,
    });
    this.renderHUD();
    this.raceResultTimer = setTimeout(() => {
      if (token !== this.raceToken || this.tab !== 'race') return;
      this.showRaceResult(res);
    }, 850);
  }

  showRaceResult(res) {
    const place = res.placement;
    const placeLabel = place === 1 ? 'VICTORY' : place === 2 ? 'SECOND PLACE' : 'THIRD PLACE';
    const medal = place === 1 ? '' : place === 2 ? ' silver' : ' bronze';
    const best = this.store.state.races[res.track.id];
    const bpRow = res.blueprintCar ? `<div class="result-reward-row bp"><span>BLUEPRINT</span><b>${esc(res.blueprintCar.name)} +1</b></div>` : '';
    const bonusRow = res.firstWinBonus ? `<div class="result-reward-row bp"><span>FIRST WIN BONUS</span><b>+${formatNum(res.firstWinBonus)} CR</b></div>` : '';
    this.showModal(`
      <div class="result-kicker">${esc(res.track.name.toUpperCase())} · SPRINT COMPLETE</div>
      <div class="result-hero"><div class="result-medal${medal}">${place}</div></div>
      <div class="result-place${place === 1 ? ' gold' : ''}">${placeLabel}</div>
      <div class="result-sub">${place === 1 ? 'CLEAN RUN. BIG PAYOUT.' : 'GOOD RUN. TUNE UP AND TAKE THE WIN.'}</div>
      <div class="result-stats">
        <div class="result-stat"><b>${res.time.toFixed(2)}s</b><span>Time</span></div>
        <div class="result-stat"><b>${place}/3</b><span>Position</span></div>
        <div class="result-stat"><b>${best ? formatTime(best) : '—'}</b><span>Best</span></div>
      </div>
      <div class="result-rewards">
        <div class="result-reward-row"><span>RACE CREDITS</span><b>+${formatNum(res.credits)} CR</b></div>
        <div class="result-reward-row"><span>SCRAPS</span><b>+${formatNum(res.scraps)} SC</b></div>
        ${bonusRow}${bpRow}
      </div>
      <div class="result-actions">
        <button class="btn btn-primary" data-modal-action="race-again">RACE AGAIN</button>
        <button class="btn btn-ghost" data-modal-action="race-tracks">TRACK LIST</button>
      </div>
    `, { dismissible: false });
  }

  // ── WHEEL panel ───────────────────────────────────────────────────────────
  renderWheel() {
    const free = this.store.freeSpinReady();
    const pending = this.store.offlinePending();
    const canSpin = !this.spinning && (free || this.store.state.credits >= WHEEL_COST);
    const rewards = WHEEL_REWARDS.map(r => {
      const cls = r.kind === 'credits' ? '' : r.kind === 'blueprint' ? ' bp' : r.kind === 'core' ? ' core' : ' scrap';
      return `<div class="reward-tile${cls}"><b>${esc(r.label)}</b><span>${esc(r.short)}</span></div>`;
    }).join('');
    const timer = free ? 'READY' : this._freeIn();
    const el = $('#panel-wheel');
    el.innerHTML = `
      <div class="offline-card${pending < 1 ? ' collected' : ''}">
        <div class="offline-icon"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3v7l4 4M12 5v2M12 19v-2M5 12h2M17 12h2"/></svg></div>
        <div class="offline-copy"><b>OFFLINE EARNINGS</b><span><em>${formatNum(pending)} CR</em> ready · ${this.store.passiveRate().toFixed(2)} CR/min · cap ${formatNum(this.store.offlineCap())} CR</span></div>
        <button class="btn btn-cyan" data-action="collect-offline" ${pending < 1 ? 'disabled' : ''}>COLLECT</button>
      </div>
      <div class="section-head" style="margin-bottom:4px">
        <div class="section-title"><i class="tick"></i>PRIZE WHEEL</div>
        <span class="section-sub">8 BALANCED SLOTS</span>
      </div>
      <div class="wheel-grid">${rewards}</div>
      <div class="spin-row">
        <button class="btn btn-primary spin-btn${this.spinning ? ' spinning' : ''}" id="spin-main" data-action="spin" ${canSpin ? '' : 'disabled'}>${this.spinning ? 'SPINNING…' : free ? 'FREE SPIN' : 'SPIN WHEEL'}</button>
        <div class="spin-cost"><span>${free ? 'NEXT PAID SPIN' : 'ENTRY COST'}</span><b id="spin-cost-value" class="${free ? 'free' : ''}">${free ? 'FREE' : formatNum(WHEEL_COST) + ' CR'}</b></div>
      </div>
      <div class="wheel-note"><span>FREE SPIN IN <b id="free-timer">${timer}</b></span><span>GODLY CARS +5% CR</span></div>`;
  }

  _freeIn() {
    const ms = this.store.freeSpinRemaining();
    if (ms <= 0) return 'READY';
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  _tickWheelUI() {
    if (this.tab !== 'wheel' || this.spinning) return;
    const free = this.store.freeSpinReady();
    const timer = $('#free-timer');
    if (!timer) return;
    timer.textContent = free ? 'READY' : this._freeIn();
    const btn = $('#spin-main');
    const cost = $('#spin-cost-value');
    if (btn) {
      btn.textContent = free ? 'FREE SPIN' : 'SPIN WHEEL';
      btn.disabled = !free && this.store.state.credits < WHEEL_COST;
    }
    if (cost) {
      cost.textContent = free ? 'FREE' : `${formatNum(WHEEL_COST)} CR`;
      cost.classList.toggle('free', free);
    }
  }

  collectOffline() {
    const res = this.store.collectOffline();
    if (!res.ok) { this.audio.play('error'); this.toast(res.reason || 'Nothing to collect.', 'warn'); return; }
    this.audio.play('collect');
    this.toast(`Collected ${formatNum(res.amount)} CR from the garage`, 'good');
    this.renderHUD();
    this.renderWheel();
  }

  spinWheel() {
    if (this.spinning) return;
    const free = this.store.freeSpinReady();
    const res = this.store.spin(free);
    if (!res.ok) {
      this.audio.play('error');
      this.toast(res.reason || 'Not enough credits.', 'warn');
      return;
    }
    this.spinning = true;
    this.audio.play('spin');
    this.world.setStage('wheel');
    this.renderHUD();
    this.renderWheel();
    const started = this.world.spinWheel(res.index, () => {
      const grant = this.store.grantWheelReward(res.reward);
      this.spinning = false;
      this.audio.play('wheelWin');
      this.renderHUD();
      this.renderWheel();
      if (this.tab === 'wheel') this.showWheelResult(res.reward, grant);
      else this.toast(`Wheel: ${res.reward.label}`, 'good');
    });
    if (!started) {
      this.spinning = false;
      this.renderWheel();
    }
  }

  showWheelResult(reward, grant) {
    const extra = [];
    if (grant.credits) extra.push(`+${formatNum(grant.credits)} CR`);
    if (grant.scraps) extra.push(`+${formatNum(grant.scraps)} SC`);
    if (grant.core) extra.push(`+${formatNum(grant.core)} fusion core`);
    if (grant.blueprint) extra.push(`+1 blueprint · ${esc(grant.blueprint.name)}`);
    const icon = reward.kind === 'credits' ? '$' : reward.kind === 'blueprint' ? '▤' : reward.kind === 'core' ? '⚛' : '◈';
    this.showModal(`
      <div class="wheel-result">
        <div class="wr-ico">${icon}</div>
        <h2 style="color:${reward.kind === 'credits' ? 'var(--gold)' : 'var(--cyan)'}">${esc(reward.label)}</h2>
        <p>PRIZE WHEEL PAYOUT</p>
        ${extra.length ? `<div class="wr-extra">${extra.join(' · ')}</div>` : ''}
      </div>
      <div class="result-actions" style="margin-top:14px">
        <button class="btn btn-primary" data-modal-action="spin-again">SPIN AGAIN</button>
        <button class="btn btn-ghost" data-modal-action="close-modal">NICE</button>
      </div>
    `, { dismissible: true });
  }

  // ── Sheets, modal, settings, toasts ──────────────────────────────────────
  openSheet(title, html) {
    this.sheetTitle.textContent = title;
    this.sheetBody.innerHTML = html;
    this.sheetLayer.hidden = false;
    this.sheetBody.scrollTop = 0;
  }

  hideSheet() {
    this.sheetLayer.hidden = true;
  }

  showModal(html, { dismissible = true } = {}) {
    this.modalCard.innerHTML = html;
    this.modalLayer.hidden = false;
    this._modalDismissible = dismissible;
  }

  hideModal() {
    this.modalLayer.hidden = true;
    this._modalDismissible = false;
  }

  _onModalAction(action) {
    if (action === 'close-modal') { this.audio.play('ui'); this.hideModal(); }
    else if (action === 'spin-again') {
      this.hideModal();
      if (this.spinning) return;
      this.spinWheel();
    } else if (action === 'race-again') {
      this.hideModal();
      this.audio.play('ui');
      this.beginRaceView();
      this.race.start();
    } else if (action === 'race-tracks') {
      this.audio.play('ui');
      this.endRaceView();
    } else if (action === 'reset-confirm') {
      this.hideModal();
      this._doReset();
    } else if (action === 'reset-cancel') {
      this.hideModal();
    }
  }

  showSettings() {
    const s = this.store.state;
    this.openSheet('GARAGE SETTINGS', `
      <div class="settings-list">
        <div class="settings-row">
          <div class="sr-copy"><b>SYNTH SOUND</b><span>Short, lightweight WebAudio SFX</span></div>
          <label class="toggle"><input type="checkbox" id="sound-toggle" ${s.settings.sound ? 'checked' : ''}><span class="track"></span></label>
        </div>
        <div class="settings-row">
          <div class="sr-copy"><b>SAVE SLOT</b><span>Local device · validated on boot</span></div>
          <span class="pill">V2 · ${formatNum(s.credits)} CR</span>
        </div>
        <div class="settings-row">
          <div class="sr-copy"><b>CAREER</b><span>${formatNum(s.stats.pulls)} pulls · ${formatNum(s.stats.races)} races · ${formatNum(s.stats.wins)} wins</span></div>
          <span class="pill">${this.store.ownedCount()} CARS</span>
        </div>
        <button class="settings-row" data-sheet-action="reset-open" style="width:100%;cursor:pointer">
          <div class="sr-copy" style="text-align:left"><b style="color:#ff9aa0">RESET GARAGE</b><span>Wipe save and restart at 1,500 CR</span></div>
          <span class="pill" style="color:#ff9aa0;border-color:rgba(255,90,99,.3)">RESET</span>
        </button>
      </div>
      <div class="save-meta">All values are sanitized with finite checks at startup.<br>Render cap: DPR ≤ 2 · ${this.store.lastError ? esc(this.store.lastError) : 'Save is healthy.'}</div>
      <div class="sheet-actions"><button class="btn btn-ghost" data-close-sheet>CLOSE</button></div>
    `);
    const sound = $('#sound-toggle');
    if (sound) sound.addEventListener('change', () => {
      this.store.toggleSound();
      if (this.store.state.settings.sound) this.audio.play('ui');
    });
  }

  _doReset() {
    this.audio.play('error');
    this.lastRipPack = null;
    this.revealing = false;
    this.spinning = false;
    clearTimeout(this.autoTimer);
    this.race.exit();
    this.raceView = false;
    this.store.reset();
    this.world.resetRip();
    this.world.setLineup(this.store.lineup());
    this.world.setWorkshopCar(this.store.selectedCar());
    this.hideSheet();
    this.hideModal();
    this.hideRevealTag();
    this.app.classList.remove('racing', 'inspecting');
    this.garageFilter = 'all';
    this.fusionCarId = null;
    this.tab = 'garage';
    this.applyTab('rip');
    this.toast('Save reset · fresh garage at 1,500 CR', 'good');
  }

  toast(text, type = '') {
    if (!text) return;
    while (this.toasts.children.length >= 2) this.toasts.removeChild(this.toasts.firstChild);
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="tic"></i><span>${esc(text)}</span>`;
    this.toasts.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 280);
    }, 2700);
  }

  // ── panel event routing ───────────────────────────────────────────────────
  _onPanelClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'pack') {
      const id = target.dataset.id;
      if (!PACKS_BY_ID[id]) return;
      this.store.setSelectedPack(id);
      this.world.setRipPack(PACKS_BY_ID[id]);
      this.lastRipPack = id;
      this.hideRevealTag();
      this.audio.play('ui');
      this.renderRip();
    } else if (action === 'rip') {
      this.audio.unlock();
      this.rip();
    } else if (action === 'filter') {
      this.garageFilter = target.dataset.id || 'all';
      this.audio.play('ui');
      this.renderGarage();
    } else if (action === 'inspect') {
      const car = CARS_BY_ID[target.dataset.id];
      if (car) this.openInspect(car);
    } else if (action === 'upgrade') {
      this._upgrade(target.dataset.stat);
    } else if (action === 'fusion') {
      this.audio.play('ui');
      this.openFusionSheet();
    } else if (action === 'vault') {
      this.audio.play('ui');
      this.openVaultSheet();
    } else if (action === 'goto-rip') {
      this.setTab('rip');
    } else if (action === 'track') {
      const id = target.dataset.id;
      const track = TRACKS_BY_ID[id];
      if (!track) return;
      this.store.setSelectedTrack(id);
      this.audio.play('ui');
      this.race.enter(track);
      this.renderRace();
    } else if (action === 'start-race') {
      this.startRace();
    } else if (action === 'collect-offline') {
      this.collectOffline();
    } else if (action === 'spin') {
      this.spinWheel();
    }
  }

  _onPanelChange(e) {
    if (e.target.id === 'auto-rip') {
      const on = this.store.toggleAutoRip();
      this.audio.play('ui');
      const box = e.target.closest('.auto-box');
      const state = box?.querySelector('.auto-state');
      if (state) state.textContent = on ? 'CHAIN ON' : 'CHAIN OFF';
      this.toast(on ? 'Auto Rip armed · chains after each reveal' : 'Auto Rip off', on ? 'good' : '');
      if (on && this.tab === 'rip' && !this.revealing) this._scheduleAutoRip();
    }
  }

  _centerSelected(selector) {
    requestAnimationFrame(() => {
      const panel = this.app.querySelector('.panel.active');
      if (!panel) return;
      const row = panel.querySelector(selector);
      if (!row) return;
      const sel = row.querySelector('.selected');
      if (!sel) return;
      row.scrollLeft = Math.max(0, sel.offsetLeft - row.clientWidth / 2 + sel.clientWidth / 2);
    });
  }
}
