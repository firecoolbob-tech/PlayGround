import * as THREE from '../vendor/three.module.js';
import { CARS, RARITIES, RACE_LENGTH, TRACKS_BY_ID } from './data.js';
import { makeCarVisual, animateAccents } from './world.js';
import { makeGlowTexture, makeSparkTexture } from './art.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const LANES = [-2.15, 0, 2.15];

// shared geometry (never disposed)
const RG = {};
let DASH_TEX = null;
let CHECK_TEX = null;
let FINISH_TEX = null;

function initRaceShared() {
  if (RG.box) return;
  RG.box = new THREE.BoxGeometry(1, 1, 1);
  RG.cone = new THREE.ConeGeometry(1, 1, 7);
  RG.cone4 = new THREE.ConeGeometry(1, 1, 4);
  RG.cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  RG.cylLow = new THREE.CylinderGeometry(1, 1, 1, 6);
  RG.octa = new THREE.OctahedronGeometry(1, 0);
  RG.ico = new THREE.IcosahedronGeometry(1, 0);
  RG.torus = new THREE.TorusGeometry(1, 0.03, 6, 32);
  RG.plane = new THREE.PlaneGeometry(1, 1);
  RG.ring = new THREE.RingGeometry(1, 1.1, 32);
  RG.sphere = new THREE.SphereGeometry(1, 10, 8);

  const dc = document.createElement('canvas');
  dc.width = 32; dc.height = 128;
  const dctx = dc.getContext('2d');
  dctx.clearRect(0, 0, 32, 128);
  const dg = dctx.createLinearGradient(0, 0, 0, 56);
  dg.addColorStop(0, 'rgba(255,255,255,0)');
  dg.addColorStop(0.2, 'rgba(255,255,255,.95)');
  dg.addColorStop(0.8, 'rgba(255,255,255,.95)');
  dg.addColorStop(1, 'rgba(255,255,255,0)');
  dctx.fillStyle = dg;
  dctx.fillRect(6, 0, 20, 56);
  DASH_TEX = new THREE.CanvasTexture(dc);
  DASH_TEX.wrapS = DASH_TEX.wrapT = THREE.RepeatWrapping;
  DASH_TEX.repeat.set(1, 86);
  DASH_TEX.colorSpace = THREE.SRGBColorSpace;

  const cc = document.createElement('canvas');
  cc.width = 256; cc.height = 64;
  const cctx = cc.getContext('2d');
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 16; x++) {
      cctx.fillStyle = (x + y) % 2 ? '#eef4ff' : '#090d15';
      cctx.fillRect(x * 16, y * 16, 16, 16);
    }
  }
  CHECK_TEX = new THREE.CanvasTexture(cc);
  CHECK_TEX.colorSpace = THREE.SRGBColorSpace;
  CHECK_TEX.wrapS = CHECK_TEX.wrapT = THREE.RepeatWrapping;
  CHECK_TEX.repeat.set(4, 1);

  const fc = document.createElement('canvas');
  fc.width = 1024; fc.height = 256;
  const fctx = fc.getContext('2d');
  fctx.clearRect(0, 0, 1024, 256);
  fctx.textAlign = 'center';
  fctx.font = '900 132px Arial, sans-serif';
  fctx.fillStyle = '#ffffff';
  fctx.shadowColor = 'rgba(79,227,255,.8)'; fctx.shadowBlur = 32;
  fctx.fillText('FINISH', 512, 158);
  fctx.shadowBlur = 0;
  fctx.font = '800 26px Arial, sans-serif';
  fctx.fillStyle = 'rgba(255,255,255,.55)';
  fctx.fillText('APEX//RIP  ·  SPRINT', 512, 208);
  FINISH_TEX = new THREE.CanvasTexture(fc);
  FINISH_TEX.colorSpace = THREE.SRGBColorSpace;
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.32, ...opts });
}
function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
}

export class RaceGame {
  constructor(world, store, callbacks = {}) {
    initRaceShared();
    this.world = world;
    this.store = store;
    this.cbs = callbacks;
    this.group = world.groups.race;
    this.envGroup = new THREE.Group();
    this.carGroup = new THREE.Group();
    this.hazardGroup = new THREE.Group();
    this.group.add(this.envGroup, this.carGroup, this.hazardGroup);
    this.track = null;
    this.phase = 'idle';
    this.time = 0;
    this.dist = 0;
    this.speed = 0;
    this.nitro = 1;
    this.boostT = 0;
    this.lane = 1;
    this.laneX = 0;
    this.shake = 0;
    this._hits = 0;
    this._hudTimer = 0;
    this._nitroDrain = 0.012;
    this._cam = new THREE.Vector3(0, 3.2, 9.4);
    this._look = new THREE.Vector3(0, 1.1, -6);
    this._countShown = null;
    this._transition = 0;
    this._ai = [];
    this._hazards = [];
    this._tiles = [];
    this._finishGroup = null;
    this._finishLine = null;
    this._dashMats = [];
    this._playerVisual = null;
    this._playerObj = null;
    this._aiVisuals = [];
    this._exhaust = [];
    this._exhaustLight = null;
    this._startResources = null;
    this._idleTime = 0;
    this._lastResult = null;
    this._autoTimer = 0;
    this._autoNitro = 0;
  }

  // ── Track build ───────────────────────────────────────────────────────────
  enter(track) {
    initRaceShared();
    if (!track) return;
    this.world.setStage('race');
    this.world.setEnvironment(track.bg, track.fog, 18, 118);
    this.world.fillCyan.color.set(track.color);
    this.world.fillPink.color.set(track.color2).multiplyScalar(2.2);
    this.world.key.color.set(0xffffff);

    if (!this.track || this.track.id !== track.id) {
      this.buildTrack(track);
    }
    this.track = track;
    this.phase = 'idle';
    this.time = 0;
    this.dist = 0;
    this.speed = 0;
    this.nitro = 1;
    this.boostT = 0;
    this.lane = 1;
    this.laneX = 0;
    this.shake = 0;
    this._hits = 0;
    this._lastResult = null;
    this._countShown = null;
    this._setupCars();
    this._resetHazards();
    this._updateFinishGate();
    this._snapPreviewCamera();
    this._emitHUD();
  }

  buildTrack(track) {
    this._clearEnv();
    const accent = new THREE.Color(track.color);
    const mats = {
      road: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(track.road), metalness: 0.35, roughness: 0.48,
        clearcoat: 0.45, clearcoatRoughness: 0.25, envMapIntensity: 0.8,
      }),
      shoulder: mat(new THREE.Color(track.road).multiplyScalar(0.55), { roughness: 0.8, metalness: 0.15 }),
      rail: mat(0x10151f, { metalness: 0.8, roughness: 0.3 }),
      accent: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.3 }),
      accentSoft: new THREE.MeshStandardMaterial({ color: accent.clone().multiplyScalar(0.5), emissive: accent, emissiveIntensity: 0.28, metalness: 0.3, roughness: 0.5 }),
      accentBasic: basic(track.color),
      accentGlow: new THREE.MeshBasicMaterial({ map: makeGlowTexture(), color: accent, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending }),
      dark: mat(0x0b0f17, { metalness: 0.5, roughness: 0.55 }),
      rock: mat(themeRock(track.theme), { roughness: 0.88, metalness: 0.12, flatShading: true }),
      rock2: mat(themeRock2(track.theme), { roughness: 0.9, metalness: 0.08, flatShading: true }),
      prop: mat(themeProp(track.theme), { roughness: 0.72, metalness: 0.2, flatShading: true }),
      glow: basic(track.color),
      white: basic(0xfff7de),
      red: basic(0xff355c),
    };
    this._ownedMats = Object.values(mats);

    const env = this.envGroup;

    // road
    const road = new THREE.Mesh(RG.plane, mats.road);
    road.rotation.x = -Math.PI / 2;
    road.scale.set(9.2, 720, 1);
    road.position.set(0, 0, -330);
    env.add(road);
    for (const sx of [-1, 1]) {
      const shoulder = new THREE.Mesh(RG.box, mats.shoulder);
      shoulder.scale.set(2.6, 0.08, 720);
      shoulder.position.set(sx * 5.9, 0.01, -330);
      env.add(shoulder);
      const rail = new THREE.Mesh(RG.box, mats.rail);
      rail.scale.set(0.14, 0.5, 720);
      rail.position.set(sx * 4.72, 0.26, -330);
      env.add(rail);
      const railGlow = new THREE.Mesh(RG.box, mats.accent);
      railGlow.scale.set(0.055, 0.035, 720);
      railGlow.position.set(sx * 4.66, 0.52, -330);
      env.add(railGlow);
    }
    // lane dashes (texture-scrolled planes)
    const dashMat = new THREE.MeshBasicMaterial({
      map: DASH_TEX, transparent: true, opacity: 0.62, depthWrite: false,
      color: 0xdbe9ff, side: THREE.DoubleSide,
    });
    this._dashMats = [dashMat];
    for (const dx of [-1.08, 1.08]) {
      const dash = new THREE.Mesh(RG.plane, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.scale.set(0.13, 700, 1);
      dash.position.set(dx, 0.035, -320);
      env.add(dash);
    }
    const edgeMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.6, depthWrite: false });
    this._ownedMats.push(edgeMat);
    for (const ex of [-4.55, 4.55]) {
      const edge = new THREE.Mesh(RG.plane, edgeMat);
      edge.rotation.x = -Math.PI / 2;
      edge.scale.set(0.07, 700, 1);
      edge.position.set(ex, 0.045, -320);
      env.add(edge);
    }

    // start line
    const startLine = new THREE.Mesh(RG.plane, new THREE.MeshBasicMaterial({ map: CHECK_TEX, transparent: false, side: THREE.DoubleSide }));
    this._ownedMats.push(startLine.material);
    startLine.rotation.x = -Math.PI / 2;
    startLine.scale.set(9.0, 1.3, 1);
    startLine.position.set(0, 0.05, 8.4);
    env.add(startLine);

    // distant glow / sun
    const farGlow = new THREE.Mesh(RG.plane, mats.accentGlow);
    farGlow.scale.set(44, 44, 1);
    farGlow.position.set(-15, 19, -220);
    env.add(farGlow);

    // scrolling side tiles
    this._tiles = [];
    for (let i = 0; i < 3; i++) {
      const tile = new THREE.Group();
      tile.position.z = 18 - i * 42;
      this._buildTile(tile, track, mats);
      env.add(tile);
      this._tiles.push(tile);
    }

    // finish gate
    const finish = new THREE.Group();
    const postMat = mats.dark;
    for (const x of [-4.35, 4.35]) {
      const post = new THREE.Mesh(RG.box, postMat);
      post.scale.set(0.28, 4.5, 0.28);
      post.position.set(x, 2.25, 0);
      finish.add(post);
      const strip = new THREE.Mesh(RG.box, mats.accent);
      strip.scale.set(0.06, 4.1, 0.06);
      strip.position.set(x + (x < 0 ? 0.18 : -0.18), 2.25, 0.16);
      finish.add(strip);
    }
    const beam = new THREE.Mesh(RG.box, postMat);
    beam.scale.set(9.2, 0.56, 0.4);
    beam.position.set(0, 4.45, 0);
    finish.add(beam);
    const banner = new THREE.Mesh(RG.plane, new THREE.MeshBasicMaterial({ map: FINISH_TEX, transparent: true, depthWrite: false }));
    this._ownedMats.push(banner.material);
    banner.scale.set(7.4, 1.85, 1);
    banner.position.set(0, 3.95, 0.25);
    finish.add(banner);
    const glow = new THREE.Mesh(RG.plane, mats.accentGlow);
    glow.scale.set(16, 7, 1);
    glow.position.set(0, 3.4, -0.4);
    finish.add(glow);
    finish.visible = false;
    env.add(finish);
    this._finishGroup = finish;

    const finishLine = new THREE.Mesh(RG.plane, new THREE.MeshBasicMaterial({ map: CHECK_TEX, side: THREE.DoubleSide }));
    this._ownedMats.push(finishLine.material);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.scale.set(9.0, 1.4, 1);
    finishLine.position.y = 0.055;
    finishLine.visible = false;
    finish.add(finishLine);
    this._finishLine = finishLine;

    // hazards
    this._clearGroup(this.hazardGroup);
    this._hazards = [];
    const hazardMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a1105, metalness: 0.4, roughness: 0.3,
      clearcoat: 0.9, clearcoatRoughness: 0.12, emissive: 0xff6a1f, emissiveIntensity: 0.16,
    });
    const hazardGlow = new THREE.MeshBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
    const hg = new THREE.Group();
    const body = new THREE.Mesh(RG.box, hazardMat);
    body.scale.set(1.25, 0.56, 0.9);
    body.position.y = 0.34;
    hg.add(body);
    const cap = new THREE.Mesh(RG.box, hazardGlow);
    cap.scale.set(1.05, 0.06, 0.7);
    cap.position.y = 0.65;
    hg.add(cap);
    const ring = new THREE.Mesh(RG.torus, hazardGlow);
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(0.75);
    ring.position.y = 0.44;
    hg.add(ring);
    const hazardGlowPlane = new THREE.Mesh(RG.plane, new THREE.MeshBasicMaterial({ map: makeGlowTexture(), color: 0xff6a1f, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    hazardGlowPlane.rotation.x = -Math.PI / 2;
    hazardGlowPlane.scale.set(3, 3, 1);
    hazardGlowPlane.position.y = 0.03;
    hg.add(hazardGlowPlane);

    for (let i = 0; i < 7; i++) {
      const mesh = hg.clone(true);
      mesh.visible = false;
      this.hazardGroup.add(mesh);
      this._hazards.push({ dist: 75 + i * 58, lane: Math.floor(Math.random() * 3), mesh, hit: false });
    }

    // cars group stays, just reset visuals
    this.carGroup.position.set(0, 0, 0);
  }

  _buildTile(tile, track, mats) {
    const theme = track.theme;
    // checkpoint arch
    const arch = new THREE.Group();
    for (const x of [-4.6, 4.6]) {
      const post = new THREE.Mesh(RG.box, mats.rail);
      post.scale.set(0.18, 3.3, 0.18);
      post.position.set(x, 1.65, 0);
      arch.add(post);
    }
    const beam = new THREE.Mesh(RG.box, mats.rail);
    beam.scale.set(9.36, 0.16, 0.2);
    beam.position.set(0, 3.28, 0);
    arch.add(beam);
    const neon = new THREE.Mesh(RG.box, mats.accent);
    neon.scale.set(9.1, 0.05, 0.045);
    neon.position.set(0, 3.18, 0.11);
    arch.add(neon);
    const archGlow = new THREE.Mesh(RG.plane, mats.accentGlow);
    archGlow.scale.set(12, 1.9, 1);
    archGlow.position.set(0, 3.0, 0.02);
    arch.add(archGlow);
    arch.position.z = -12;
    tile.add(arch);

    // roadside markers
    for (let i = 0; i < 4; i++) {
      const z = 4 - i * 11;
      for (const sx of [-1, 1]) {
        const marker = new THREE.Mesh(RG.box, mats.accentSoft);
        marker.scale.set(0.08, 0.55, 0.08);
        marker.position.set(sx * 4.85, 0.3, z);
        tile.add(marker);
        const cap = new THREE.Mesh(RG.box, mats.accent);
        cap.scale.set(0.13, 0.08, 0.13);
        cap.position.set(sx * 4.85, 0.61, z);
        tile.add(cap);
      }
    }

    const add = (geo, material, x, y, z, sx, sy, sz, ry = 0) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.rotation.y = ry;
      tile.add(m);
      return m;
    };

    if (theme === 'mountain') {
      for (let i = 0; i < 2; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.cone, mats.rock, sx * rand(9, 15), rand(2, 4), rand(-20, 12), rand(4, 7), rand(7, 13), rand(4, 7), rand(0, 3));
        add(RG.cone4, mats.rock2, sx * rand(6.5, 9), 1.2, rand(-18, 8), 2.2, 4.5, 2.2, rand(0, 3));
      }
      for (let i = 0; i < 4; i++) add(RG.cone, mats.prop, (i % 2 ? 1 : -1) * rand(5.4, 6.8), 1.1, rand(-17, 13), 0.8, 2.4, 0.8);
    } else if (theme === 'city') {
      for (let i = 0; i < 3; i++) {
        const sx = i % 2 ? 1 : -1;
        const h = rand(4, 11);
        add(RG.box, mats.dark, sx * rand(7.5, 11), h / 2, rand(-20, 12), rand(2.4, 4.2), h, rand(2.4, 4.2), rand(-.2, .2));
        add(RG.box, mats.accentSoft, sx * rand(6.4, 7.4), h * 0.62, rand(-19, 11), 0.13, h * 0.45, 0.13);
        add(RG.box, mats.accent, sx * rand(7.0, 8.2), h * 0.72, rand(-18, 9), 0.08, h * 0.2, 1.1);
      }
      for (let i = 0; i < 3; i++) add(RG.torus, mats.accentSoft, (i % 2 ? 1 : -1) * rand(6, 8), rand(2, 5), rand(-16, 10), rand(1.2, 2), rand(1.2, 2), rand(1.2, 2));
    } else if (theme === 'desert') {
      for (let i = 0; i < 3; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.cylLow, mats.rock2, sx * rand(8, 14), rand(1, 2.5), rand(-20, 12), rand(3, 6), rand(2, 5), rand(3, 6), rand(0, 3));
      }
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 ? 1 : -1) * rand(5.4, 7.5);
        add(RG.cyl, mats.prop, x, 0.9, rand(-17, 12), 0.16, 1.8, 0.16);
        add(RG.cyl, mats.prop, x + 0.18, 1.3, rand(-17, 12), 0.13, 1.1, 0.13);
      }
    } else if (theme === 'ice') {
      for (let i = 0; i < 4; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.cone4, mats.rock2, sx * rand(6.5, 12), 1.5, rand(-20, 12), rand(1.2, 3), rand(3, 8), rand(1.2, 3), rand(0, 3));
        add(RG.octa, mats.accentSoft, sx * rand(5.2, 6.8), rand(0.8, 2.2), rand(-18, 11), 0.6, 1.5, 0.6);
      }
      add(RG.plane, mats.accentSoft, -7, 0.005, -2, 4, 30, 1).rotation.x = -Math.PI / 2;
    } else if (theme === 'volcano') {
      for (let i = 0; i < 3; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.ico, mats.rock, sx * rand(6.5, 12), rand(0.8, 2), rand(-20, 12), rand(1.4, 3.6), rand(1.4, 3.2), rand(1.4, 3.6), rand(0, 3));
      }
      for (let i = 0; i < 3; i++) {
        const sx = i % 2 ? 1 : -1;
        const pool = add(RG.cylLow, mats.accent, sx * rand(5.3, 7.5), 0.03, rand(-18, 10), rand(1, 2.4), 0.03, rand(1, 2.4));
        pool.material = mats.accent;
      }
      add(RG.cone, mats.rock2, -11, 4, -22, 8, 12, 8);
      add(RG.cone, mats.rock2, 12, 3.5, -14, 7, 10, 7);
    } else if (theme === 'jungle') {
      for (let i = 0; i < 6; i++) {
        const sx = i % 2 ? 1 : -1;
        const z = rand(-20, 12);
        const h = rand(3, 7);
        add(RG.cyl, mats.prop, sx * rand(5.5, 9), h / 2, z, 0.22, h, 0.22);
        add(RG.cone, mats.rock2, sx * rand(5.5, 9), h + 1.2, z, rand(1.4, 2.6), rand(2, 4), rand(1.4, 2.6));
      }
      for (let i = 0; i < 3; i++) add(RG.sphere, mats.rock2, (i % 2 ? 1 : -1) * rand(5.2, 6.2), 0.4, rand(-18, 11), 1.4, 0.7, 1.2);
    } else if (theme === 'harbor') {
      const water = new THREE.Mesh(RG.plane, new THREE.MeshPhysicalMaterial({ color: 0x06121f, metalness: 0.65, roughness: 0.18, clearcoat: 0.7, clearcoatRoughness: 0.12 }));
      this._ownedMats.push(water.material);
      water.rotation.x = -Math.PI / 2;
      water.scale.set(16, 40, 1);
      water.position.set(-11, 0.01, -4);
      tile.add(water);
      for (let i = 0; i < 4; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.cyl, mats.rail, sx * 5.2, 1.4, rand(-19, 12), 0.09, 2.8, 0.09);
        add(RG.sphere, mats.white, sx * 5.2, 2.85, rand(-19, 12), 0.16, 0.16, 0.16);
        if (sx > 0) add(RG.box, mats.dark, sx * 8.5, 0.5, rand(-18, 10), 2.2, 0.6, 0.9);
      }
      add(RG.box, mats.accentSoft, 8.8, 2.4, -6, 0.2, 4.8, 0.4);
    } else if (theme === 'stadium') {
      for (let i = 0; i < 2; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.box, mats.dark, sx * 9.5, 1.5, -6, 2.4, 3, 30);
        add(RG.box, mats.accentSoft, sx * 8.2, 3.05, -6, 0.18, 0.18, 30);
      }
      for (let i = 0; i < 3; i++) {
        add(RG.cyl, mats.rail, (i % 2 ? 1 : -1) * 7.4, 3.0, rand(-18, 8), 0.15, 6, 0.15);
        add(RG.plane, mats.white, (i % 2 ? 1 : -1) * 7.4, 6.2, rand(-18, 8), 2.4, 1.0, 1);
      }
    } else if (theme === 'digital') {
      const wire = new THREE.MeshBasicMaterial({ color: track.color, wireframe: true, transparent: true, opacity: 0.65 });
      this._ownedMats.push(wire);
      for (let i = 0; i < 4; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.box, wire, sx * rand(6, 10), rand(1, 4), rand(-20, 12), rand(1.5, 3), rand(1.5, 4), rand(1.5, 3), rand(0, 3));
        add(RG.torus, mats.accentSoft, sx * rand(5.2, 7), rand(1, 3.4), rand(-18, 10), rand(1, 2), rand(1, 2), 1);
      }
      add(RG.plane, mats.accentSoft, 0, 0.002, -2, 18, 40, 1).rotation.x = -Math.PI / 2;
    } else if (theme === 'void') {
      for (let i = 0; i < 4; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.torus, mats.accent, sx * rand(6, 9), rand(1.5, 5), rand(-20, 11), rand(1.2, 2.6), rand(1.2, 2.6), rand(1.2, 2.6), rand(0, 2));
        add(RG.octa, mats.rock2, sx * rand(5.2, 7), rand(0.7, 2.4), rand(-18, 10), rand(0.5, 1.2), rand(0.5, 1.2), rand(0.5, 1.2));
      }
    } else if (theme === 'industry') {
      for (let i = 0; i < 3; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.cyl, mats.rock, sx * rand(7, 10), 3, rand(-20, 11), rand(1, 1.8), 6, rand(1, 1.8));
        add(RG.box, mats.dark, sx * rand(7, 10), 1.4, rand(-20, 11), rand(2.4, 4), 2.8, rand(2.4, 4));
        add(RG.box, mats.accentSoft, sx * rand(5.6, 7), rand(1, 4), rand(-18, 10), 0.16, 2.8, 0.16);
      }
      for (let i = 0; i < 5; i++) add(RG.box, mats.rail, (i % 2 ? 1 : -1) * rand(5.4, 7), 0.5, rand(-18, 12), 2.6, 0.2, 0.2);
    } else if (theme === 'canyon') {
      for (let i = 0; i < 4; i++) {
        const sx = i % 2 ? 1 : -1;
        add(RG.cone, mats.rock, sx * rand(7, 12), rand(1, 3), rand(-20, 12), rand(2, 4.5), rand(4, 9), rand(2, 4.5), rand(0, 3));
        add(RG.box, mats.rock2, sx * rand(5.5, 7), rand(0.7, 1.8), rand(-18, 11), rand(1, 2.4), rand(1, 3), rand(1, 2.4));
      }
    }
  }

  _clearEnv() {
    this._clearGroup(this.envGroup);
    if (this._ownedMats) {
      for (const m of this._ownedMats) {
        if (m && m.dispose) m.dispose();
      }
    }
    this._ownedMats = [];
    this._tiles = [];
    this._finishGroup = null;
    this._finishLine = null;
    this._dashMats = [];
  }

  _clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
    }
  }

  _resetHazards() {
    for (const h of this._hazards) {
      h.hit = false;
      h.mesh.visible = false;
      h.mesh.scale.setScalar(1);
    }
  }

  _setupCars() {
    this._clearGroup(this.carGroup);
    this._aiVisuals = [];
    this._exhaust = [];
    this._exhaustLight = null;

    let car = this.store.selectedCar();
    if (!car) car = CARS.find(c => c.id === 'civic-ghost') || CARS[0];
    const stats = this.store.displayStats(car);
    const trait = car.trait;
    if (trait === 'hacker') stats.accel += 3;
    if (trait === 'blackhole') stats.grip += 4;
    this._trait = trait;
    this._nitroDrain = trait === 'blackhole' ? 0.012 * 0.82 : 0.012;
    let top = 23 + stats.speed * 0.20;
    if (trait === 'godly') top *= 1.05;
    this._playerObj = car;
    this._playerStats = stats;
    this._topSpeed = top;
    this._accelRate = 1.05 + stats.accel * 0.012;
    this._grip = stats.grip;

    const player = makeCarVisual(car, 0.95, this.store.equippedCosmeticFor ? this.store.equippedCosmeticFor(car.id) : null);
    player.rotation.y = Math.PI / 2;
    player.position.set(0, 0.02, 3.4);
    this.carGroup.add(player);
    this._playerVisual = player;

    // exhaust flames
    for (const z of [-0.26, 0.26]) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.55, 8), new THREE.MeshBasicMaterial({
        color: 0x7de8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      flame.rotation.z = Math.PI / 2;
      flame.position.set(-1.28, 0.34, z);
      flame.visible = false;
      player.add(flame);
      this._exhaust.push(flame);
    }
    const el = new THREE.PointLight(0x4fe3ff, 0, 5, 2);
    el.position.set(-1.4, 0.5, 0);
    player.add(el);
    this._exhaustLight = el;

    const pool = CARS.filter(c => c.id !== car.id && c.rarity !== 'stock');
    const picks = [];
    while (picks.length < 2) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      if (p && !picks.some(x => x.id === p.id)) picks.push(p);
    }
    picks.forEach((aiCar, i) => {
      const visual = makeCarVisual(aiCar, 0.92, this.store.equippedCosmeticFor ? this.store.equippedCosmeticFor(aiCar.id) : null);
      visual.rotation.y = Math.PI / 2;
      visual.position.set(LANES[i === 0 ? 0 : 2], 0.02, 3.4 + rand(-1.5, -0.4));
      this.carGroup.add(visual);
      this._aiVisuals.push(visual);
    });

    this._ai = [0, 1].map((i) => ({
      dist: 0,
      speed: 0,
      lane: i === 0 ? 0 : 2,
      laneX: LANES[i === 0 ? 0 : 2],
      targetX: LANES[i === 0 ? 0 : 2],
      base: this.track ? this.track.ai + rand(-0.4, 0.8) : 32,
      timer: rand(1.5, 4),
      finished: false,
    }));

    this._resetRacePositions();
  }

  _resetRacePositions() {
    this.dist = 0;
    this.speed = 0;
    this.nitro = 1;
    this.boostT = 0;
    this.lane = 1;
    this.laneX = 0;
    this.shake = 0;
    this._hits = 0;
    this._countShown = null;
    this._hudTimer = 0;
    if (this._playerVisual) {
      this._playerVisual.position.set(0, 0.02, 3.4);
      this._playerVisual.rotation.set(0, Math.PI / 2, 0);
    }
    for (let i = 0; i < this._ai.length; i++) {
      this._ai[i].dist = 0;
      this._ai[i].speed = 0;
      this._ai[i].lane = i === 0 ? 0 : 2;
      this._ai[i].laneX = LANES[i === 0 ? 0 : 2];
      this._ai[i].targetX = LANES[i === 0 ? 0 : 2];
      this._ai[i].finished = false;
      const v = this._aiVisuals[i];
      if (v) { v.position.set(this._ai[i].laneX, 0.02, 3.4 + rand(-1.8, -0.6)); v.rotation.set(0, Math.PI / 2, 0); }
    }
    this._hazards.forEach((h, i) => {
      h.dist = 75 + i * 58 + rand(-10, 10);
      h.lane = Math.floor(Math.random() * 3);
      h.hit = false;
      h.mesh.visible = false;
    });
    this._updateGates();
    this._emitHUD();
  }

  start() {
    if (!this.track) return false;
    if (this.phase === 'running' || this.phase === 'countdown') return false;
    this._setupCars();
    this.phase = 'countdown';
    this.countdown = 3.4;
    this.time = 0;
    this._lastResult = null;
    this._snapChaseCamera();
    this.cbs.onStart?.();
    this._emitHUD();
    return true;
  }

  abort() {
    if (this.phase === 'running' || this.phase === 'countdown') {
      this.phase = 'idle';
      this.speed = 0;
      this.boostT = 0;
      this._emitHUD();
    }
  }

  exit() {
    this.abort();
    this.phase = 'idle';
    this.world.fillCyan.color.set(0x4fe3ff);
    this.world.fillPink.color.set(0xff3d86);
    this.world.key.color.set(0xffffff);
  }

  tap() {
    this._activateNitro();
  }

  _activateNitro() {
    if (this.phase !== 'running') return;
    if (this.nitro < 0.3 || this.boostT > 0.25) return;
    this.nitro = Math.max(0, this.nitro - 0.32);
    this.boostT = 1.45;
    this.shake = Math.max(this.shake, 0.5);
    this.cbs.onNitro?.(true);
    this.cbs.onEvent?.('nitro');
  }

  moveLane(dir) {
    if (this.phase !== 'running' && this.phase !== 'countdown') return;
    const next = clamp(this.lane + dir, 0, LANES.length - 1);
    if (next === this.lane) return;
    this.lane = next;
    this.cbs.onEvent?.('lane');
  }

  handleGesture(g) {
    if (!g) return;
    if (g.type === 'tap') this.tap();
    else if (g.type === 'swipe') this.moveLane(g.dir);
  }

  _snapPreviewCamera() {
    const cam = this.world.camera;
    cam.position.set(5.6, 3.5, 10.8);
    cam.fov = 52;
    cam.updateProjectionMatrix();
    cam.lookAt(0, 1.1, 1.6);
    this._cam.copy(cam.position);
    this._look.set(0, 1.1, 1.6);
  }

  _snapChaseCamera() {
    const cam = this.world.camera;
    cam.position.set(0, 2.9, 8.8);
    cam.fov = 58;
    cam.updateProjectionMatrix();
    cam.lookAt(0, 1.1, -8);
    this._cam.copy(cam.position);
    this._look.set(0, 1.1, -8);
  }

  // ── Update loop ───────────────────────────────────────────────────────────
  update(dt, t) {
    if (this.world.stage !== 'race') return;
    dt = Math.min(dt, 0.05);
    this._idleTime += dt;

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(Math.min(3, this.countdown));
      if (n !== this._countShown && n > 0) {
        this._countShown = n;
        this.cbs.onCountdown?.(String(n));
        this.cbs.onEvent?.('count');
      }
      this.speed = Math.max(0, this.speed - dt * 6);
      if (this.countdown <= 0) {
        this.phase = 'running';
        this.time = 0;
        this.speed = 8;
        this.cbs.onCountdown?.('GO');
        this.cbs.onEvent?.('go');
      }
      this._updateCars(dt, t);
      this._updateChaseCamera(dt, t, 2.6);
      this._updateEnvironment(0, dt);
    } else if (this.phase === 'running') {
      this.time += dt;
      this._stepRace(dt, t);
      this._updateCars(dt, t);
      this._updateChaseCamera(dt, t, 0);
      this._updateEnvironment(this.speed, dt);
      this._emitHUDThrottled(dt);
    } else if (this.phase === 'done') {
      this.time += dt;
      this.speed = Math.max(0, this.speed - dt * 7);
      this.dist = Math.min(RACE_LENGTH, this.dist + this.speed * dt);
      this._updateCars(dt, t);
      this._updateChaseCamera(dt, t, 4);
      this._updateEnvironment(this.speed, dt);
    } else {
      // idle preview
      const cam = this.world.camera;
      const az = 0.52 + Math.sin(t * 0.22) * 0.12;
      const cx = Math.sin(az) * 7.4;
      const cz = 4.2 + Math.cos(az) * 7.4;
      this._cam.lerp(new THREE.Vector3(cx, 3.3, cz), 1 - Math.exp(-3 * dt));
      this._look.lerp(new THREE.Vector3(0, 1.05, 1.5), 1 - Math.exp(-3 * dt));
      cam.position.copy(this._cam);
      cam.lookAt(this._look);
      cam.fov += (52 - cam.fov) * (1 - Math.exp(-3 * dt));
      cam.updateProjectionMatrix();
      this._updateCars(dt, t);
      this._updateEnvironment(0, dt);
      if (Math.random() < dt * 0.7) this._updateFinishGate();
    }
  }

  _stepRace(dt, t) {
    const grip = this._grip;
    const laneSpeed = 5.5 + grip * 0.055;
    this.laneX = lerp(this.laneX, LANES[this.lane], 1 - Math.exp(-laneSpeed * dt));

    if (this.store.state.autoRace) this._autoDrive(dt);

    if (this.boostT > 0) {
      this.boostT = Math.max(0, this.boostT - dt);
      this.nitro = Math.max(0, this.nitro - dt * this._nitroDrain);
      if (this.boostT <= 0) this.cbs.onNitro?.(false);
    } else {
      this.nitro = Math.min(1, this.nitro + dt * 0.072);
    }

    const boosting = this.boostT > 0;
    const target = this._topSpeed * (boosting ? 1.48 : 1);
    const rate = boosting ? 3.6 : this._accelRate;
    this.speed += (target - this.speed) * Math.min(1, rate * dt);
    this.speed = Math.max(10, this.speed);
    this.dist += this.speed * dt;

    for (const ai of this._ai) {
      if (ai.finished) continue;
      const rubber = clamp((this.dist - ai.dist) * 0.012, -1.1, 1.1);
      const aiTarget = ai.base + rubber;
      ai.speed += (aiTarget - ai.speed) * Math.min(1, 1.25 * dt);
      ai.dist += ai.speed * dt;
      ai.timer -= dt;
      if (ai.timer <= 0) {
        ai.timer = rand(2.2, 4.6);
        ai.lane = Math.floor(Math.random() * 3);
        ai.targetX = LANES[ai.lane];
      }
      ai.laneX = lerp(ai.laneX, ai.targetX, 1 - Math.exp(-2.4 * dt));
      if (ai.dist >= RACE_LENGTH && !ai.finished) ai.finished = true;
    }

    // hazards
    for (const h of this._hazards) {
      if (h.hit) continue;
      if (h.dist > this.dist - this.speed * dt && h.dist <= this.dist) {
        if (h.lane === this.lane) {
          if (boosting) {
            h.hit = true;
            h.mesh.visible = false;
            this.shake = Math.max(this.shake, 0.25);
          } else {
            h.hit = true;
            h.mesh.visible = false;
            this.speed = Math.max(11, this.speed * 0.52);
            this.boostT = 0;
            this.shake = 1;
            this._hits += 1;
            this.cbs.onNitro?.(false);
            this.cbs.onHit?.(this._hits);
            this.cbs.onEvent?.('hit');
          }
        }
      }
    }

    if (this.dist >= RACE_LENGTH) this._finishRace();

    this.shake = Math.max(0, this.shake - dt * 1.8);
    this._updateGates();
  }

  _autoDrive(dt) {
    this._autoTimer -= dt;
    this._autoNitro -= dt;
    if (this._autoTimer > 0) return;
    this._autoTimer = 0.24;

    const ahead = (h) => h.dist - this.dist;
    const current = this._hazards.filter(h => !h.hit && h.lane === this.lane && ahead(h) > -1 && ahead(h) < 27);
    if (current.length) {
      const candidates = [0, 1, 2]
        .filter(l => l !== this.lane)
        .map(l => {
          const nearest = this._hazards.reduce((best, h) => {
            if (h.hit || h.lane !== l) return best;
            const d = ahead(h);
            return d > -1 && d < 34 ? Math.min(best, d) : best;
          }, Infinity);
          return { lane: l, distance: nearest === Infinity ? 999 : nearest };
        })
        .sort((a, b) => (b.distance - a.distance) || (Math.abs(a.lane - this.lane) - Math.abs(b.lane - this.lane)));
      const pick = candidates[0];
      if (pick && pick.lane !== this.lane) {
        this.lane = pick.lane;
        this.cbs.onEvent?.('lane');
      }
    }

    if (this._autoNitro <= 0 && this.nitro >= 0.3 && this.boostT <= 0.25) {
      const clear = !this._hazards.some(h => !h.hit && ahead(h) > -1 && ahead(h) < 20);
      if (clear) {
        this._activateNitro();
        this._autoNitro = 1.1;
      }
    }
  }

  _finishRace() {
    if (this.phase !== 'running') return;
    const placement = 1 + this._ai.filter(a => a.dist >= RACE_LENGTH).length;
    this.phase = 'done';
    this.speed = Math.max(this.speed, 26);
    const time = this.time;
    const summary = this.store.finishRace(this.track.id, placement, time);
    this._lastResult = { ...summary, placement, time, track: this.track };
    this.cbs.onNitro?.(false);
    this.cbs.onFinish?.(this._lastResult);
    this.cbs.onEvent?.('finish');
    this._emitHUD();
  }

  _updateCars(dt, t) {
    if (this._playerVisual) {
      const p = this._playerVisual;
      const delta = LANES[this.lane] - this.laneX;
      p.position.x = lerp(p.position.x, this.laneX, 1 - Math.exp(-10 * dt));
      p.position.y = 0.02 + Math.sin(t * 11) * 0.006 * Math.min(1, this.speed / 20);
      p.rotation.y = Math.PI / 2 + delta * 0.045;
      p.rotation.z = -delta * 0.035;
      animateAccents(p, t, dt);
      const boost = this.boostT > 0;
      for (const f of this._exhaust) {
        f.visible = boost;
        f.scale.setScalar(boost ? 0.8 + Math.sin(t * 40) * 0.2 : 0.001);
      }
      if (this._exhaustLight) this._exhaustLight.intensity = boost ? 12 : 0;
    }
    for (let i = 0; i < this._ai.length; i++) {
      const ai = this._ai[i];
      const v = this._aiVisuals[i];
      if (!v) continue;
      const rel = (ai.dist - this.dist);
      const z = 3.4 - rel;
      v.visible = z < 13 && z > -78;
      v.position.set(ai.laneX, 0.02, z);
      v.rotation.y = Math.PI / 2;
      v.rotation.z = (ai.targetX - ai.laneX) * -0.03;
      animateAccents(v, t + i, dt);
    }
    // hazards
    for (const h of this._hazards) {
      const z = 3.4 - (h.dist - this.dist);
      const near = z < 16 && z > -72 && !h.hit;
      h.mesh.visible = near;
      if (near) {
        h.mesh.position.set(LANES[h.lane], 0, z);
        h.mesh.rotation.y = Math.sin(t * 1.2 + h.dist) * 0.1;
        h.mesh.scale.setScalar(1 + Math.sin(t * 2.2 + h.dist) * 0.03);
      }
    }
  }

  _updateEnvironment(speed, dt = 0) {
    const move = speed * dt;
    for (const tile of this._tiles) {
      tile.position.z += move;
      if (tile.position.z > 60) tile.position.z -= 126;
    }
    for (const m of this._dashMats) {
      if (m.map) m.map.offset.y -= move / 8;
    }
    this._updateGates();
  }

  _updateGates() {
    if (!this._finishGroup) return;
    const z = 3.4 - (RACE_LENGTH - this.dist);
    this._finishGroup.position.z = z;
    const near = z > -120;
    this._finishGroup.visible = near;
    if (this._finishLine) {
      this._finishLine.position.z = 0;
      this._finishLine.visible = true;
    }
  }

  _updateFinishGate() { this._updateGates(); }

  _updateChaseCamera(dt, t, extraPull) {
    const boost = this.boostT > 0;
    const shake = this.shake * 0.14 + (boost ? 0.028 : 0.008) * Math.min(1, this.speed / 28);
    const desired = new THREE.Vector3(
      this.laneX * 0.36 + Math.sin(t * 39) * shake,
      2.95 + Math.sin(t * 31) * shake * 0.55 + extraPull * 0.08,
      8.9 + extraPull + (boost ? 0.6 : 0),
    );
    this._cam.lerp(desired, 1 - Math.exp(-6.5 * dt));
    const look = new THREE.Vector3(this.laneX * 0.48, 1.05, -9.5);
    this._look.lerp(look, 1 - Math.exp(-7 * dt));
    const cam = this.world.camera;
    cam.position.copy(this._cam);
    cam.lookAt(this._look);
    const targetFov = 56 + Math.min(12, this.speed * 0.22) + (boost ? 7 : 0) + extraPull;
    cam.fov += (targetFov - cam.fov) * (1 - Math.exp(-4 * dt));
    cam.updateProjectionMatrix();
  }

  currentPosition() {
    let pos = 1;
    for (const a of this._ai) if (a.dist > this.dist) pos++;
    return pos;
  }

  _emitHUDThrottled(dt) {
    this._hudTimer += dt;
    if (this._hudTimer < 0.08) return;
    this._hudTimer = 0;
    this._emitHUD();
  }

  _emitHUD() {
    this.cbs.onHUD?.({
      phase: this.phase,
      dist: this.dist,
      length: RACE_LENGTH,
      speed: this.speed,
      nitro: this.nitro,
      position: this.currentPosition(),
      time: this.time,
      boost: this.boostT > 0,
      track: this.track,
    });
  }
}

function themeRock(theme) {
  return ({ mountain: 0x1a2030, desert: 0x6b4a2b, ice: 0x46748c, volcano: 0x2a1c1a, jungle: 0x1c3018, harbor: 0x1c2733, stadium: 0x2a2d38, digital: 0x0a2a1e, void: 0x18102a, industry: 0x24262e, canyon: 0x7a3c24 })[theme] || 0x2a3244;
}
function themeRock2(theme) {
  return ({ mountain: 0x2a364c, desert: 0x8f6a3f, ice: 0x8fd6ef, volcano: 0x5a2418, jungle: 0x2f5a25, harbor: 0x2f4150, stadium: 0x3a3f4c, digital: 0x0f4a32, void: 0x2c1b4e, industry: 0x3b3e46, canyon: 0xa5542e })[theme] || 0x3a445c;
}
function themeProp(theme) {
  return ({ mountain: 0x1f5a3a, desert: 0x6f7a3a, ice: 0xbfeaff, volcano: 0xff7a2a, jungle: 0x2f8a3a, harbor: 0x3d6b7a, stadium: 0x445064, digital: 0x39ff88, void: 0x6442b8, industry: 0x555b68, canyon: 0x8f4a2c })[theme] || 0x3a5160;
}
