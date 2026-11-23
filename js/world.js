import * as THREE from 'three';
import { RARITIES, TRAITS, PACKS_BY_ID, WHEEL_REWARDS } from './data.js';
import {
  makeCardTexture, makeCardBackTexture, makePackTexture, makeWheelLabelTexture,
  makeGlowTexture, makeShadowTexture, makeSparkTexture, makeFoilTexture,
  makeEnvTexture, makeSignTexture,
} from './art.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rand = (a, b) => a + Math.random() * (b - a);

// Per-element pack motion: every series gets a distinct spin, tilt, wind-up and
// burst feel without building separate scenes or extra draw calls.
const ELEMENT_STYLE = {
  neon:     { spin: 1.15, tilt: 0.055, tiltSpeed: 0.90, bob: 0.075, bobSpeed: 1.20, jitter: 0.050, jitterFreq: 62, sway: 0.040, swayFreq: 52, swell: 0.24, burst: 1.00 },
  ember:    { spin: 0.78, tilt: 0.075, tiltSpeed: 1.35, bob: 0.105, bobSpeed: 1.75, jitter: 0.070, jitterFreq: 48, sway: 0.030, swayFreq: 42, swell: 0.30, burst: 1.25 },
  ice:      { spin: 0.52, tilt: 0.035, tiltSpeed: 0.62, bob: 0.060, bobSpeed: 0.85, jitter: 0.035, jitterFreq: 36, sway: 0.030, swayFreq: 28, swell: 0.18, burst: 0.80 },
  electric: { spin: 1.55, tilt: 0.040, tiltSpeed: 2.10, bob: 0.055, bobSpeed: 2.40, jitter: 0.085, jitterFreq: 88, sway: 0.060, swayFreq: 76, swell: 0.22, burst: 1.35 },
  cosmic:   { spin: 0.62, tilt: 0.095, tiltSpeed: 0.55, bob: 0.090, bobSpeed: 0.72, jitter: 0.030, jitterFreq: 30, sway: 0.055, swayFreq: 24, swell: 0.28, burst: 1.10 },
  dust:     { spin: 0.68, tilt: 0.090, tiltSpeed: 0.72, bob: 0.085, bobSpeed: 0.95, jitter: 0.045, jitterFreq: 34, sway: 0.080, swayFreq: 26, swell: 0.20, burst: 0.90 },
  solar:    { spin: 0.90, tilt: 0.050, tiltSpeed: 0.80, bob: 0.080, bobSpeed: 1.05, jitter: 0.035, jitterFreq: 40, sway: 0.035, swayFreq: 34, swell: 0.32, burst: 1.20 },
  rain:     { spin: 0.72, tilt: 0.045, tiltSpeed: 1.50, bob: 0.060, bobSpeed: 1.90, jitter: 0.060, jitterFreq: 58, sway: 0.045, swayFreq: 62, swell: 0.22, burst: 1.00 },
  glitch:   { spin: 1.85, tilt: 0.030, tiltSpeed: 3.20, bob: 0.040, bobSpeed: 3.10, jitter: 0.115, jitterFreq: 104, sway: 0.090, swayFreq: 96, swell: 0.34, burst: 1.45 },
  prism:    { spin: 1.05, tilt: 0.065, tiltSpeed: 1.10, bob: 0.085, bobSpeed: 1.35, jitter: 0.055, jitterFreq: 54, sway: 0.050, swayFreq: 46, swell: 0.26, burst: 1.15 },
  sparks:   { spin: 0.95, tilt: 0.060, tiltSpeed: 1.00, bob: 0.075, bobSpeed: 1.25, jitter: 0.055, jitterFreq: 52, sway: 0.045, swayFreq: 44, swell: 0.24, burst: 1.10 },
};
const elementStyle = (id) => ELEMENT_STYLE[id] || ELEMENT_STYLE.neon;
const asColor = (value, fallback = 0xffffff) => {
  try { return new THREE.Color(value || fallback); } catch { return new THREE.Color(fallback); }
};

// ── Shared geometry & materials (reused by every stage) ─────────────────────
const G = {};
const M = {};

function buildBodyGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-1.12, 0.17);
  s.lineTo(-1.06, 0.45);
  s.quadraticCurveTo(-0.72, 0.58, -0.34, 0.60);
  s.lineTo(0.42, 0.58);
  s.quadraticCurveTo(0.92, 0.53, 1.12, 0.30);
  s.lineTo(1.12, 0.15);
  s.quadraticCurveTo(0.70, 0.02, 0.0, 0.02);
  s.quadraticCurveTo(-0.72, 0.02, -1.12, 0.17);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.82, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07,
    bevelSegments: 3, steps: 1, curveSegments: 10,
  });
  geo.translate(0, 0, -0.41);
  geo.computeVertexNormals();
  return geo;
}

function buildCabinGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.62, 0.56);
  s.lineTo(-0.40, 0.93);
  s.quadraticCurveTo(-0.34, 0.99, -0.22, 0.99);
  s.lineTo(0.22, 0.99);
  s.quadraticCurveTo(0.40, 0.98, 0.47, 0.91);
  s.lineTo(0.65, 0.58);
  s.lineTo(0.58, 0.55);
  s.quadraticCurveTo(0.0, 0.50, -0.62, 0.56);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.68, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035,
    bevelSegments: 2, steps: 1, curveSegments: 8,
  });
  geo.translate(0, 0, -0.34);
  geo.computeVertexNormals();
  return geo;
}

function initShared() {
  if (G.body) return;
  G.body = buildBodyGeometry();
  G.cabin = buildCabinGeometry();
  G.wheel = new THREE.CylinderGeometry(0.265, 0.265, 0.17, 18, 1);
  G.rim = new THREE.CylinderGeometry(0.148, 0.148, 0.178, 14, 1);
  G.spoiler = new THREE.BoxGeometry(0.30, 0.045, 0.76);
  G.spoilerPost = new THREE.BoxGeometry(0.05, 0.20, 0.04);
  G.headlight = new THREE.BoxGeometry(0.06, 0.075, 0.18);
  G.taillight = new THREE.BoxGeometry(0.035, 0.075, 0.64);
  G.trim = new THREE.BoxGeometry(1.48, 0.022, 0.018);
  G.splitter = new THREE.BoxGeometry(1.9, 0.055, 0.94);
  G.underglow = new THREE.PlaneGeometry(2.9, 2.0);
  G.shadow = new THREE.PlaneGeometry(2.9, 1.9);
  G.pad = new THREE.CylinderGeometry(0.98, 1.08, 0.13, 36);
  G.padRing = new THREE.TorusGeometry(1.0, 0.018, 5, 48);
  G.platform = new THREE.CylinderGeometry(2.45, 2.6, 0.26, 48);
  G.platformRing = new THREE.TorusGeometry(2.5, 0.022, 6, 64);
  G.flare = new THREE.PlaneGeometry(5.4, 5.4);
  G.packBody = new THREE.BoxGeometry(1.50, 2.10, 0.12);
  G.packFront = new THREE.PlaneGeometry(1.41, 2.00);
  G.packCrimp = new THREE.BoxGeometry(1.54, 0.075, 0.15);
  G.cardBody = new THREE.BoxGeometry(1.86, 2.56, 0.045);
  G.cardFace = new THREE.PlaneGeometry(1.78, 2.48);
  G.cardGlow = new THREE.PlaneGeometry(2.7, 3.5);
  G.torusHalo = new THREE.TorusGeometry(0.5, 0.016, 6, 40);
  G.torusVoid = new THREE.TorusGeometry(1.26, 0.018, 6, 56);
  G.torusVoid2 = new THREE.TorusGeometry(1.02, 0.012, 6, 48);
  G.diamond = new THREE.OctahedronGeometry(0.09, 0);
  G.ico = new THREE.IcosahedronGeometry(0.42, 0);
  G.holoShard = new THREE.OctahedronGeometry(0.11, 0);
  G.lightBar = new THREE.BoxGeometry(0.10, 3.2, 0.10);
  G.mirror = new THREE.BoxGeometry(0.16, 0.045, 0.10);
  G.arch = new THREE.TorusGeometry(0.355, 0.05, 5, 16, Math.PI);
  G.rimSpoke = new THREE.BoxGeometry(0.045, 0.028, 0.26);
  G.caliper = new THREE.BoxGeometry(0.045, 0.10, 0.14);
  G.scoop = new THREE.BoxGeometry(0.26, 0.065, 0.30);
  G.canard = new THREE.BoxGeometry(0.24, 0.022, 0.11);
  G.diffuserFin = new THREE.BoxGeometry(0.30, 0.09, 0.025);
  G.blade = new THREE.BoxGeometry(0.035, 0.05, 0.26);
  G.tailBar = new THREE.BoxGeometry(0.035, 0.055, 1.02);
  G.orbitRing = new THREE.TorusGeometry(0.92, 0.012, 5, 48);
  G.orbitRing2 = new THREE.TorusGeometry(1.06, 0.008, 5, 56);
  G.winglet = new THREE.BoxGeometry(0.20, 0.018, 0.26);
  G.shard = new THREE.TetrahedronGeometry(0.11, 0);
  G.weatherRing = new THREE.TorusGeometry(8.2, 0.018, 4, 64);
  G.flame = new THREE.ConeGeometry(0.10, 0.55, 8);

  M.wheel = new THREE.MeshStandardMaterial({ color: 0x070a10, roughness: 0.78, metalness: 0.2 });
  M.tire = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.62, metalness: 0.35 });
  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0x081120, metalness: 0.92, roughness: 0.055,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.85, transparent: true, opacity: 0.9,
  });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xdbe7f7, metalness: 1, roughness: 0.18 });
  M.darkChrome = new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.95, roughness: 0.25 });
  M.headlight = new THREE.MeshBasicMaterial({ color: 0xfff4c9 });
  M.taillight = new THREE.MeshBasicMaterial({ color: 0xff3158 });
  M.shadow = new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, opacity: 0.7, depthWrite: false });
  M.glow = new THREE.MeshBasicMaterial({ map: makeGlowTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  M.floor = new THREE.MeshPhysicalMaterial({
    color: 0x070a11, metalness: 0.72, roughness: 0.28,
    clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.9,
  });
  M.floorDark = new THREE.MeshStandardMaterial({ color: 0x05070c, metalness: 0.5, roughness: 0.6 });
  M.wall = new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 0.9, metalness: 0.25, side: THREE.BackSide });
  M.wallFront = new THREE.MeshStandardMaterial({ color: 0x080b13, roughness: 0.85, metalness: 0.3 });
  M.ringDark = new THREE.MeshStandardMaterial({ color: 0x141a26, metalness: 0.8, roughness: 0.32 });
  M.foil = new THREE.MeshPhysicalMaterial({ color: 0x1d2434, metalness: 0.95, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1 });
  M.gold = new THREE.MeshPhysicalMaterial({ color: 0xffc247, metalness: 1, roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  M.cardEdge = new THREE.MeshStandardMaterial({ color: 0xc5d2e6, metalness: 1, roughness: 0.2 });
  M.cardBack = new THREE.MeshPhysicalMaterial({
    map: makeCardBackTexture(), metalness: 0.6, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08,
  });
  M.packLight = new THREE.PointLight(0xffffff, 24, 7, 2);
}

const bodyMats = new Map();
function bodyMat(color, cosmetic = null) {
  const key = `${color}:${cosmetic ? cosmetic.id : 'base'}`;
  if (!bodyMats.has(key)) {
    const finish = cosmetic && (cosmetic.slot === 'FINISH' || ['prism', 'runes', 'chrono'].includes(cosmetic.kind));
    bodyMats.set(key, new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cosmetic?.bodyColor || color),
      metalness: finish ? 0.94 : 0.86,
      roughness: finish ? 0.06 : 0.15,
      clearcoat: 1, clearcoatRoughness: 0.08,
      envMapIntensity: cosmetic?.mystical ? 2.0 : 1.7,
    }));
  }
  return bodyMats.get(key);
}
const rimMats = new Map();
function rimMat(color) {
  if (!rimMats.has(color)) {
    rimMats.set(color, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), metalness: 1, roughness: 0.22,
      emissive: new THREE.Color(color), emissiveIntensity: 0.08,
    }));
  }
  return rimMats.get(color);
}
const trimMats = new Map();
function trimMat(color) {
  if (!trimMats.has(color)) {
    trimMats.set(color, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), emissive: new THREE.Color(color),
      emissiveIntensity: 0.85, metalness: 0.5, roughness: 0.3,
    }));
  }
  return trimMats.get(color);
}
const traitMats = new Map();
function traitMat(color) {
  if (!traitMats.has(color)) {
    traitMats.set(color, new THREE.MeshBasicMaterial({
      color: new THREE.Color(color), transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  }
  return traitMats.get(color);
}
const glowMats = new Map();
function glowMat(color, opacity = 0.55) {
  const key = `${color}:${opacity}`;
  if (!glowMats.has(key)) {
    glowMats.set(key, new THREE.MeshBasicMaterial({
      map: makeGlowTexture(), color: new THREE.Color(color), transparent: true,
      opacity, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
  }
  return glowMats.get(key);
}
const wireMats = new Map();
function wireMat(color) {
  if (!wireMats.has(color)) {
    wireMats.set(color, new THREE.MeshBasicMaterial({
      color: new THREE.Color(color), wireframe: true, transparent: true, opacity: 0.3, depthWrite: false,
    }));
  }
  return wireMats.get(color);
}

export function animateAccents(car, t, dt) {
  if (!car || !car.userData.accents) return;
  for (const a of car.userData.accents) {
    if (a.mesh) {
      if (a.spin) a.mesh.rotation.z += dt * a.spin;
      if (a.spinY) a.mesh.rotation.y += dt * a.spinY;
      if (a.bob) a.mesh.position.y = a.baseY + Math.sin(t * 1.6 + a.phase) * a.bob;
      if (a.scalePulse) a.mesh.scale.setScalar(a.baseScale * (0.82 + Math.sin(t * 34 + a.phase) * 0.18));
    }
  }
}

export function makeCarVisual(car, scale = 1, cosmetic = null) {
  initShared();
  const rar = RARITIES[car.rarity] || RARITIES.street;
  const trait = car.trait ? TRAITS[car.trait] : null;
  const look = cosmetic || null;
  const root = new THREE.Group();
  const accents = [];

  const shadow = new THREE.Mesh(G.shadow, M.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.006;
  shadow.scale.set(1.05, 1, 1);
  root.add(shadow);

  const under = new THREE.Mesh(G.underglow, glowMat(rar.color, 0.5));
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.012;
  root.add(under);

  const body = new THREE.Mesh(G.body, bodyMat(car.color, look));
  body.position.y = 0.10;
  if (look && look.kind === 'widebody') body.scale.set(1.01, 1.02, 1.10);
  root.add(body);

  const cabin = new THREE.Mesh(G.cabin, M.glass);
  cabin.position.y = 0.10;
  root.add(cabin);

  // satin roof spine gives the cabin a finished, glossy edge
  const roof = new THREE.Mesh(G.trim, bodyMat(car.color, look));
  roof.scale.set(0.52, 1, 5.8);
  roof.position.set(-0.03, 1.108, 0);
  root.add(roof);

  const splitter = new THREE.Mesh(G.splitter, M.darkChrome);
  splitter.position.set(0.02, 0.115, 0);
  if (look && look.kind === 'aero') {
    splitter.scale.set(1.04, 1.35, 1.02);
    for (const z of [0.66, -0.66]) {
      const canard = new THREE.Mesh(G.canard, M.darkChrome);
      canard.position.set(0.94, 0.24, z);
      canard.rotation.z = -0.16;
      root.add(canard);
    }
  }
  transient(splitter);
  root.add(splitter);

  // wheels + rarity rims, sculpted arches and brake hardware
  for (const x of [0.69, -0.69]) {
    for (const z of [0.505, -0.505]) {
      const tire = new THREE.Mesh(G.wheel, M.wheel);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, 0.285, z);
      root.add(tire);
      const rim = new THREE.Mesh(G.rim, rimMat(rar.color));
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, 0.285, z * 1.015);
      root.add(rim);

      const spokeCount = look && look.kind === 'wheels' ? 6 : 4;
      for (let s = 0; s < spokeCount; s++) {
        const spoke = new THREE.Mesh(G.rimSpoke, look && look.kind === 'wheels' ? trimMat(look.color) : rimMat(rar.color));
        spoke.position.set(x, 0.285, z * 1.035);
        spoke.rotation.z = (s / spokeCount) * TAU;
        spoke.scale.set(0.62, 6.4, 0.42);
        root.add(spoke);
      }

      if (look && (look.kind === 'widebody' || car.rarity !== 'stock')) {
        const arch = new THREE.Mesh(G.arch, bodyMat(car.color, look));
        arch.position.set(x, 0.285, z * 1.025);
        arch.scale.setScalar(look && look.kind === 'widebody' ? 1.14 : 1.02);
        root.add(arch);
      }
      if (look && look.kind === 'calipers') {
        const caliper = new THREE.Mesh(G.caliper, trimMat(look.color));
        caliper.position.set(x + 0.08, 0.285, z * 1.05);
        root.add(caliper);
      }
    }
  }

  // lights
  const headL = new THREE.Mesh(G.headlight, M.headlight);
  headL.position.set(1.04, 0.38, 0.30);
  root.add(headL);
  const headR = headL.clone();
  headR.position.z = -0.30;
  root.add(headR);
  const tail = new THREE.Mesh(G.taillight, M.taillight);
  tail.position.set(-1.105, 0.39, 0);
  root.add(tail);

  // spoiler
  if (car.rarity !== 'stock' || (look && look.kind === 'wing')) {
    const spoiler = new THREE.Mesh(G.spoiler, bodyMat(car.color, look));
    spoiler.position.set(-0.96, 0.80, 0);
    if (look && look.kind === 'wing') {
      spoiler.scale.set(1.2, 1.35, 1.06);
      spoiler.position.y = 0.90;
      for (const z of [0.27, -0.27]) {
        const post = new THREE.Mesh(G.spoilerPost, M.darkChrome);
        post.position.set(-0.95, 0.79, z);
        post.scale.set(1.1, 1.45, 1);
        post.rotation.z = -0.24;
        root.add(post);
      }
      for (const z of [0.49, -0.49]) {
        const winglet = new THREE.Mesh(G.winglet, M.darkChrome);
        winglet.position.set(-0.98, 0.93, z);
        root.add(winglet);
      }
    } else {
      root.add(spoiler);
      for (const z of [0.27, -0.27]) {
        const post = new THREE.Mesh(G.spoilerPost, M.darkChrome);
        post.position.set(-0.95, 0.70, z);
        root.add(post);
      }
    }
  }

  if (look && look.kind === 'roof') {
    const scoop = new THREE.Mesh(G.scoop, bodyMat(car.color, look));
    scoop.position.set(-0.16, 1.08, 0);
    root.add(scoop);
    for (const z of [0.30, -0.30]) {
      const rail = new THREE.Mesh(G.trim, M.darkChrome);
      rail.position.set(-0.04, 1.08, z);
      root.add(rail);
    }
  }
  if (look && look.kind === 'diffuser') {
    for (const z of [-0.32, -0.16, 0, 0.16, 0.32]) {
      const fin = new THREE.Mesh(G.diffuserFin, M.darkChrome);
      fin.position.set(-1.08, 0.13, z);
      root.add(fin);
    }
  }

  // glossy rarity side trim
  for (const z of [0.478, -0.478]) {
    const trim = new THREE.Mesh(G.trim, trimMat(rar.color));
    trim.position.set(0.02, 0.36, z);
    root.add(trim);
  }

  // signature trait 3D accents
  if (trait) {
    if (car.trait === 'hacker') {
      const halo = new THREE.Mesh(G.torusHalo, traitMat(trait.color));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 1.22;
      root.add(halo);
      accents.push({ mesh: halo, spin: 0.9, bob: 0.03, baseY: 1.22, phase: 0 });
      for (const x of [-0.42, 0.42]) {
        const node = new THREE.Mesh(G.diamond, traitMat(trait.color));
        node.position.set(x, 1.26, 0);
        node.scale.setScalar(0.55);
        root.add(node);
        accents.push({ mesh: node, spinY: 1.4, bob: 0.06, baseY: 1.26, phase: x });
      }
    } else if (car.trait === 'blackhole') {
      const ring = new THREE.Mesh(G.torusVoid, traitMat(trait.color));
      ring.rotation.set(1.14, 0.35, 0.2);
      ring.position.y = 0.62;
      root.add(ring);
      accents.push({ mesh: ring, spin: 0.42 });
      const ring2 = new THREE.Mesh(G.torusVoid2, traitMat(trait.color));
      ring2.rotation.set(0.66, -0.5, -0.3);
      ring2.position.y = 0.68;
      root.add(ring2);
      accents.push({ mesh: ring2, spin: -0.6 });
    } else if (car.trait === 'godly') {
      const halo = new THREE.Mesh(G.torusHalo, M.gold);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 1.20;
      root.add(halo);
      accents.push({ mesh: halo, spin: 1.1, bob: 0.025, baseY: 1.20, phase: 1 });
      for (let i = 0; i < 3; i++) {
        const gem = new THREE.Mesh(G.diamond, traitMat(trait.color));
        const ang = (i / 3) * TAU;
        gem.position.set(Math.cos(ang) * 0.72, 1.32, Math.sin(ang) * 0.42);
        gem.scale.setScalar(0.75);
        root.add(gem);
        accents.push({ mesh: gem, spinY: 1.2, bob: 0.08, baseY: 1.32, phase: i * 2 });
      }
    }
  }

  // cosmetic hardware: each drop adds real geometry, not just a recolour
  if (look) {
    const ccolor = look.color || rar.color;
    const add = (mesh, extra = null) => {
      root.add(mesh);
      if (extra) accents.push(extra);
      return mesh;
    };
    switch (look.kind) {
      case 'underglow':
      case 'spirit': {
        const glow = new THREE.Mesh(G.underglow, glowMat(ccolor, look.kind === 'spirit' ? 0.7 : 0.52));
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.022;
        glow.scale.set(1.04, 1.04, 1);
        add(glow);
        break;
      }
      case 'headlights': {
        for (const z of [0.30, -0.30]) {
          const blade = new THREE.Mesh(G.blade, trimMat(ccolor));
          blade.position.set(1.075, 0.395, z);
          blade.scale.set(1, 1.2, 1.1);
          add(blade);
        }
        break;
      }
      case 'taillight': {
        const bar = new THREE.Mesh(G.tailBar, trimMat(ccolor));
        bar.position.set(-1.118, 0.405, 0);
        add(bar);
        break;
      }
      case 'exhaust': {
        for (const z of [0.24, -0.24]) {
          const flame = new THREE.Mesh(G.flame, glowMat(ccolor, 0.8));
          flame.rotation.z = Math.PI / 2;
          flame.position.set(-1.42, 0.30, z);
          flame.scale.setScalar(0.001);
          add(flame, { mesh: flame, scalePulse: true, baseScale: 0.42, phase: z * 10 });
        }
        break;
      }
      case 'matrix': {
        const shell = new THREE.Mesh(G.body, wireMat(ccolor));
        shell.position.y = 0.10;
        shell.scale.setScalar(1.018);
        add(shell);
        break;
      }
      case 'orbit': {
        const ring = new THREE.Mesh(G.orbitRing, traitMat(ccolor));
        ring.rotation.set(1.14, 0.35, 0.2);
        ring.position.y = 0.62;
        add(ring, { mesh: ring, spin: 0.5 });
        const ring2 = new THREE.Mesh(G.orbitRing2, traitMat(ccolor));
        ring2.rotation.set(0.62, -0.45, -0.28);
        ring2.position.y = 0.70;
        add(ring2, { mesh: ring2, spin: -0.72 });
        break;
      }
      case 'halo': {
        const halo = new THREE.Mesh(G.torusHalo, glowMat(ccolor, 0.85));
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 1.24;
        add(halo, { mesh: halo, spin: 1.2, bob: 0.03, baseY: 1.24, phase: 0.5 });
        for (const z of [0.78, -0.78]) {
          const tip = new THREE.Mesh(G.winglet, trimMat(ccolor));
          tip.position.set(-0.22, 0.76, z);
          add(tip);
        }
        break;
      }
      case 'trail': {
        for (let i = 0; i < 3; i++) {
          const trail = new THREE.Mesh(G.underglow, glowMat(ccolor, 0.34 - i * 0.08));
          trail.rotation.y = Math.PI / 2;
          trail.position.set(-1.46 - i * 0.42, 0.36, 0);
          trail.scale.set(0.20 + i * 0.06, 0.76, 1);
          add(trail);
        }
        break;
      }
      case 'runes':
      case 'prism':
      case 'chrono': {
        const count = look.kind === 'runes' ? 6 : 8;
        for (let i = 0; i < count; i++) {
          const shard = new THREE.Mesh(G.shard, traitMat(ccolor));
          const a = (i / count) * TAU;
          shard.position.set(Math.cos(a) * 0.86, 0.48 + (i % 3) * 0.17, Math.sin(a) * 0.52);
          shard.scale.setScalar(0.45 + (i % 2) * 0.18);
          add(shard, { mesh: shard, spinY: 1.5 + (i % 3) * 0.4, bob: 0.045, baseY: shard.position.y, phase: i });
        }
        break;
      }
      case 'celestial': {
        const halo = new THREE.Mesh(G.torusHalo, M.gold);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 1.26;
        add(halo, { mesh: halo, spin: 1.35, bob: 0.024, baseY: 1.26, phase: 1.4 });
        for (let i = 0; i < 3; i++) {
          const gem = new THREE.Mesh(G.diamond, traitMat(ccolor));
          const a = (i / 3) * TAU;
          gem.position.set(Math.cos(a) * 0.76, 1.34, Math.sin(a) * 0.44);
          gem.scale.setScalar(0.8);
          add(gem, { mesh: gem, spinY: 1.4, bob: 0.06, baseY: 1.34, phase: i * 2 });
        }
        break;
      }
      case 'phantom': {
        const glow = new THREE.Mesh(G.underglow, glowMat(ccolor, 0.62));
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.024;
        add(glow);
        const tail = new THREE.Mesh(G.tailBar, trimMat(ccolor));
        tail.position.set(-1.12, 0.42, 0);
        add(tail);
        break;
      }
    }
  }

  root.userData.accents = accents;
  root.userData.baseRotY = 0;
  root.scale.setScalar(scale);
  return root;
}

function transient(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
}

function neonBar(color, height = 3.2, width = 0.1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.85 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), mat);
  group.add(bar);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 9, height * 1.15), glowMat(color, 0.3));
  glow.position.z = 0.02;
  group.add(glow);
  return group;
}

function makeTextPlane(texture, width, height, opacity = 0.9) {
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

function makeWheelGeometry(index, segments) {
  const gap = 0.012;
  const a0 = (index / segments) * TAU + gap;
  const a1 = ((index + 1) / segments) * TAU - gap;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.absarc(0, 0, 1.82, a0, a1, false);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.26, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018,
    bevelSegments: 1, curveSegments: 14,
  });
  geo.translate(0, 0, -0.13);
  return geo;
}

// ── World ───────────────────────────────────────────────────────────────────
const STAGE_CAMS = {
  rip:      { pos: [0.0, 2.15, 7.9], look: [0, 1.02, 0], fov: 45 },
  garage:   { pos: [0.0, 5.15, 13.6], look: [0, -1.15, 0.1], fov: 47 },
  workshop: { pos: [0.25, 2.2, 9.0], look: [0, -0.65, 0], fov: 46 },
  wheel:    { pos: [0.0, 2.55, 13.2], look: [0, 1.45, 0], fov: 45 },
  card:     { pos: [0.0, 2.5, 6.6], look: [0, 1.30, 0], fov: 40 },
  race:     { pos: [0, 3.2, 9.4], look: [0, 1.2, -8], fov: 58 },
};

export class World {
  constructor(canvas) {
    initShared();
    this.canvas = canvas;
    this.stage = 'rip';
    this.time = 0;
    this.orbit = { az: 0, el: 0 };
    this.pointer = null;
    this.onRaceGesture = null;
    this._camLook = new THREE.Vector3(0, 1, 0);
    this._camPos = new THREE.Vector3(0, 2, 8);
    this._initialized = false;
    this._confetti = null;
    this._wheelSpin = null;
    this._pointerPulse = 0;
    this.cosmeticFor = null;
    this.weather = null;
    this.theme = null;
    this._raceEnv = null;
    this._flash = 0;
    this._weatherT = 0;
    this._setupRenderer();
    this._setupScene();
    this._buildRip();
    this._buildGarage();
    this._buildWorkshop();
    this._buildWheel();
    this._buildCardStage();
    this._bindPointer();
    this.setStage('rip', true);
    this._initialized = true;
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: true, alpha: false,
      powerPreference: 'high-performance', stencil: false, depth: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x05060b, 1);
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060b);
    this.scene.fog = new THREE.Fog(0x05060b, 22, 60);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
    this.camera.position.set(0, 2.2, 8);

    // studio environment for glossy clearcoat reflections
    try {
      const envTex = makeEnvTexture();
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      pmrem.compileEquirectangularShader();
      const env = pmrem.fromEquirectangular(envTex).texture;
      this.scene.environment = env;
      this.scene.environmentIntensity = 0.9;
      pmrem.dispose();
    } catch (err) {
      console.warn('Environment map fallback', err);
    }

    this.hemi = new THREE.HemisphereLight(0x5b83b8, 0x05060a, 1.35);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 2.4);
    this.key.position.set(4.5, 9, 7);
    this.scene.add(this.key);
    this.fillCyan = new THREE.PointLight(0x4fe3ff, 36, 26, 2);
    this.fillCyan.position.set(6, 4.2, 5);
    this.scene.add(this.fillCyan);
    this.fillPink = new THREE.PointLight(0xff3d86, 30, 26, 2);
    this.fillPink.position.set(-6, 3.4, 4);
    this.scene.add(this.fillPink);
    this.topLight = new THREE.PointLight(0xfff1d0, 22, 22, 2);
    this.topLight.position.set(0, 7, 3);
    this.scene.add(this.topLight);

    this.groups = {
      rip: new THREE.Group(),
      garage: new THREE.Group(),
      workshop: new THREE.Group(),
      wheel: new THREE.Group(),
      card: new THREE.Group(),
      race: new THREE.Group(),
    };
    for (const key of Object.keys(this.groups)) {
      this.groups[key].visible = false;
      this.scene.add(this.groups[key]);
    }

    // ambient dust / bokeh shared by showroom stages
    const count = 130;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = rand(3.5, 12);
      const a = rand(0, TAU);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = rand(0.3, 7);
      pos[i * 3 + 2] = Math.sin(a) * r * 0.7 - 1.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x9bd8ff, size: 0.045, transparent: true, opacity: 0.45,
      depthWrite: false, blending: THREE.AdditiveBlending, map: makeSparkTexture(),
    });
    this.dust = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dust);

    this.defaultBg = new THREE.Color(0x05060b);
    this.defaultFog = new THREE.Color(0x05060b);

    // Global weather layer. One reusable point cloud does rain, snow, dust,
    // embers, orbital motes and prism static; kinds only change motion + tint.
    const wCount = 220;
    const wPos = new Float32Array(wCount * 3);
    const wSeed = new Float32Array(wCount);
    for (let i = 0; i < wCount; i++) {
      wPos[i * 3] = rand(-13, 13);
      wPos[i * 3 + 1] = rand(0.2, 12);
      wPos[i * 3 + 2] = rand(-12, 8);
      wSeed[i] = rand(0, TAU);
    }
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
    const wMat = new THREE.PointsMaterial({
      color: 0x9bd8ff, size: 0.07, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, map: makeSparkTexture(),
    });
    this.weatherFx = { mesh: new THREE.Points(wGeo, wMat), count: wCount, seed: wSeed };
    this.weatherFx.mesh.visible = false;
    this.scene.add(this.weatherFx.mesh);
  }

  // ── Atmosphere: global theme + weather ────────────────────────────────────
  setTheme(theme) {
    this.theme = theme || null;
    this._applyAtmosphere();
  }

  setWeather(weather) {
    this.weather = weather || null;
    const kind = weather?.kind || 'clear';
    if (this.weatherFx) {
      this.weatherFx.mesh.visible = kind !== 'clear';
      this.weatherFx.mesh.material.color.copy(asColor(weather?.color, 0x9bd8ff));
      this.weatherFx.mesh.material.size = ['rain', 'monsoon', 'acid', 'storm'].includes(kind) ? 0.06 : 0.085;
      this.weatherFx.mesh.material.opacity = weather?.mystical ? 0.7 : 0.55;
    }
    this._flash = 0;
    this._applyAtmosphere();
  }

  _applyAtmosphere() {
    if (!this.scene) return;
    const theme = this.theme || {
      bg: '#05060b', fog: '#090c15', hemiSky: '#5b83b8', hemiGround: '#05060a',
      key: '#ffffff', dust: '#9bd8ff',
    };
    const weather = this.weather;
    const race = this.stage === 'race' && this._raceEnv;
    const bg = asColor(race ? this._raceEnv.bg : theme.bg, 0x05060b);
    const fog = asColor(race ? this._raceEnv.fog : theme.fog, 0x090c15);
    if (weather?.tint) {
      bg.lerp(asColor(weather.tint, 0x05060b), 0.34);
      fog.lerp(asColor(weather.tint, 0x05060b), 0.5);
    }
    this.defaultBg.copy(bg);
    this.defaultFog.copy(fog);
    this.scene.background = bg;
    const clear = !weather || weather.kind === 'clear';
    const near = clear ? (race ? this._raceEnv.near : 22) : weather.fogNear;
    const far = clear ? (race ? this._raceEnv.far : 60) : weather.fogFar;
    this.scene.fog = new THREE.Fog(fog, Math.max(4, near), Math.max(near + 8, far));
    if (this.hemi) {
      this.hemi.color.copy(asColor(theme.hemiSky, 0x5b83b8));
      this.hemi.groundColor.copy(asColor(theme.hemiGround, 0x05060a));
    }
    if (this.key) this.key.color.copy(asColor(theme.key, 0xffffff));
    if (this.dust) {
      this.dust.material.color.copy(asColor(theme.dust, 0x9bd8ff));
      this.dust.visible = this.stage !== 'race';
    }
  }

  _makeBackdrop(radius, height, y, color = 0x070a12) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.28, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    return mesh;
  }

  _makeFloor(radius, y = 0, color = 0x070a11) {
    const group = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), M.floor);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = y;
    group.add(disc);
    const grid = new THREE.GridHelper(radius * 2, 28, 0x2a4260, 0x152034);
    grid.position.y = y + 0.006;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    grid.material.depthWrite = false;
    group.add(grid);
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.42, radius * 0.425, 72), new THREE.MeshBasicMaterial({ color: 0x2f8fbf, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = y + 0.01;
    group.add(ring);
    return group;
  }

  // ── RIP stage ─────────────────────────────────────────────────────────────
  _buildRip() {
    const g = this.groups.rip;
    g.add(this._makeBackdrop(20, 14, 4));
    g.add(this._makeFloor(16));

    const glow = new THREE.Mesh(G.flare, glowMat(0xff3d86, 0.32));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    g.add(glow);
    this.ripGlow = glow;

    const barL = neonBar(0x4fe3ff, 4.4, 0.07); barL.position.set(-4.2, 2.3, -3.4); barL.rotation.y = 0.35; g.add(barL);
    const barR = neonBar(0xff3d86, 4.4, 0.07); barR.position.set(4.2, 2.3, -3.4); barR.rotation.y = -0.35; g.add(barR);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.018, 6, 72), new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.5 }));
    arch.position.set(0, 2.25, -3.1);
    g.add(arch);
    this.ripArch = arch;

    const table = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.18, 2.33, 0.20, 64), M.floorDark);
    base.position.y = 0.10;
    table.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.10, 2.10, 0.055, 64), M.ringDark);
    top.position.y = 0.225;
    table.add(top);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3d86, transparent: true, opacity: 0.95 });
    this.ripRingMat = ringMat;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.022, 6, 84), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.255;
    table.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.20, 2.24, 72), new THREE.MeshBasicMaterial({ color: 0xff3d86, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.256;
    table.add(ring2);
    this.ripRing2 = ring2;
    g.add(table);
    this.ripTable = table;

    const packAnchor = new THREE.Group();
    packAnchor.position.y = 1.60;
    g.add(packAnchor);
    this.packAnchor = packAnchor;

    const revealAnchor = new THREE.Group();
    revealAnchor.position.y = 0;
    g.add(revealAnchor);
    this.revealAnchor = revealAnchor;

    // holo shards orbiting the pack
    this.holoShards = [];
    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(G.holoShard, new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x4fe3ff : 0xff3d86, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      shard.position.set(rand(-1.8, 1.8), rand(1.2, 3.4), rand(-1.2, 1.0));
      shard.scale.setScalar(rand(0.5, 1.4));
      g.add(shard);
      this.holoShards.push(shard);
    }

    this.packLight = new THREE.PointLight(0xff3d86, 30, 9, 2);
    this.packLight.position.set(0, 2.0, 0.6);
    g.add(this.packLight);

    // confetti burst geometry (reused)
    const count = 150;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      c.setHSL(rand(0, 1), 0.9, 0.6);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    cg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const cm = new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending, map: makeSparkTexture(),
    });
    this._confetti = {
      mesh: new THREE.Points(cg, cm),
      vel: new Float32Array(count * 3),
      life: 0,
      count,
    };
    this._confetti.mesh.visible = false;
    g.add(this._confetti.mesh);

    // Elemental backdrop floating behind the rotating pack.
    const fxCount = 120;
    const fxPos = new Float32Array(fxCount * 3);
    const fxSeed = new Float32Array(fxCount);
    for (let i = 0; i < fxCount; i++) {
      fxPos[i * 3] = rand(-2.5, 2.5);
      fxPos[i * 3 + 1] = rand(0.25, 3.5);
      fxPos[i * 3 + 2] = rand(-2.2, -0.25);
      fxSeed[i] = rand(0, TAU);
    }
    const fxGeo = new THREE.BufferGeometry();
    fxGeo.setAttribute('position', new THREE.BufferAttribute(fxPos, 3));
    const fxMat = new THREE.PointsMaterial({
      color: 0xff3d86, size: 0.075, transparent: true, opacity: 0.7,
      depthWrite: false, blending: THREE.AdditiveBlending, map: makeSparkTexture(),
    });
    this._packFx = { mesh: new THREE.Points(fxGeo, fxMat), count: fxCount, seed: fxSeed };
    g.add(this._packFx.mesh);

    this._ripFlash = new THREE.Mesh(G.flare, new THREE.MeshBasicMaterial({
      map: makeGlowTexture(), color: 0xffffff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this._ripFlash.position.set(0, 1.7, -0.4);
    g.add(this._ripFlash);
    this._ripFlashT = 1;

    this.rip = {
      pack: null,
      element: 'neon',
      style: elementStyle('neon'),
      burstDone: false,
      reveal: { active: false, t: 0, done: false, card: null, cb: null },
      defaultRing: 0xff3d86,
    };
  }

  setRipPack(pack) {
    initShared();
    if (!pack) return;
    const anchor = this.packAnchor;
    while (anchor.children.length) anchor.remove(anchor.children[0]);
    if (this.rip.reveal.card) {
      this.revealAnchor.remove(this.rip.reveal.card);
      this.rip.reveal.card = null;
    }
    this.rip.reveal.active = false;
    this.rip.reveal.done = false;

    const group = new THREE.Group();
    // Spinning body is separated from the stage glow/light so the pack can turn
    // continuously while its backdrop stays put.
    const body = new THREE.Group();
    group.add(body);
    group.userData.body = body;

    const foil = new THREE.Mesh(G.packBody, new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(pack.color2), metalness: 0.94, roughness: 0.15,
      clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.4,
    }));
    body.add(foil);

    const map = makePackTexture(pack);
    const frontMat = new THREE.MeshPhysicalMaterial({
      map, metalness: 0.35, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.1, envMapIntensity: 1.1,
    });
    const front = new THREE.Mesh(G.packFront, frontMat);
    front.position.z = 0.062;
    body.add(front);
    const back = new THREE.Mesh(G.packFront, frontMat);
    back.position.z = -0.062;
    back.rotation.y = Math.PI;
    body.add(back);

    for (const y of [1.055, -1.055]) {
      const crimp = new THREE.Mesh(G.packCrimp, M.chrome);
      crimp.position.y = y;
      body.add(crimp);
    }

    // foil rim edges
    const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(pack.color), transparent: true, opacity: 0.85 });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.54, 2.14, 0.02), rimMat);
    edge.position.z = -0.055;
    body.add(edge);

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), glowMat(pack.color, 0.5));
    glow.position.z = -0.16;
    group.add(glow);

    const light = new THREE.PointLight(new THREE.Color(pack.color), 26, 6, 2);
    light.position.set(0, 0.1, 0.7);
    group.add(light);

    group.position.y = 0.06;
    anchor.add(group);
    this.rip.pack = group;

    // recolor stage accents
    const col = new THREE.Color(pack.color);
    this.rip.color = col.clone();
    this.ripRingMat.color.copy(col);
    this.ripRing2.material.color.copy(col);
    this.ripGlow.material.color.copy(col);
    this.ripArch.material.color.copy(col);
    this.packLight.color.copy(col);
    this.rip.defaultRing = pack.color;
    this.rip.element = pack.element || 'neon';
    this.rip.style = elementStyle(this.rip.element);
    this.rip.burstDone = false;
    if (this._packFx) {
      this._packFx.mesh.material.color.copy(asColor(pack.color, 0xff3d86));
      this._packFx.mesh.material.size = this.rip.element === 'ice' ? 0.09 : 0.075;
    }
    if (this._ripFlash) this._ripFlash.material.color.copy(asColor(pack.color, 0xffffff));
    if (this.dust) this.dust.material.color.copy(col);
  }

  playRipReveal(car, cb) {
    if (!car) return;
    const rev = this.rip.reveal;
    if (rev.card) this.revealAnchor.remove(rev.card);
    const card = this._makeCard(car, 1.0);
    card.visible = false;
    card.position.set(0, 0.9, 0);
    card.rotation.set(0, Math.PI, 0);
    card.scale.setScalar(0.72);
    this.revealAnchor.add(card);
    rev.card = card;
    rev.active = true;
    rev.t = 0;
    rev.done = false;
    rev.cb = cb || null;
    this.rip.burstDone = false;
    this._ripFlashT = 1;
    this._tintConfetti(this.rip.color || this.rip.defaultRing);
    if (this._ripFlash) this._ripFlash.material.opacity = 0;
    if (this.rip.pack) {
      this.rip.pack.visible = true;
      this.rip.pack.rotation.set(0, 0, 0);
      this.rip.pack.position.x = 0;
      this.rip.pack.scale.setScalar(1);
    }
  }

  _tintConfetti(color) {
    if (!this._confetti) return;
    const c = asColor(color, 0xff3d86);
    const colors = this._confetti.mesh.geometry.attributes.color.array;
    for (let i = 0; i < this._confetti.count; i++) {
      const v = 0.55 + Math.random() * 0.45;
      colors[i * 3] = Math.min(1, c.r * v + 0.08);
      colors[i * 3 + 1] = Math.min(1, c.g * v + 0.08);
      colors[i * 3 + 2] = Math.min(1, c.b * v + 0.08);
    }
    this._confetti.mesh.geometry.attributes.color.needsUpdate = true;
  }

  _burstConfetti() {
    if (!this._confetti) return;
    const { mesh, vel, count } = this._confetti;
    const style = this.rip.style || elementStyle('neon');
    const pos = mesh.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rand(-0.2, 0.2);
      pos[i * 3 + 1] = 1.9 + rand(-0.2, 0.2);
      pos[i * 3 + 2] = rand(-0.2, 0.2);
      const a = rand(0, TAU);
      const speed = rand(0.8, 3.1) * style.burst;
      vel[i * 3] = Math.cos(a) * speed * 0.55;
      vel[i * 3 + 1] = rand(1.3, 4.2) * (0.8 + style.burst * 0.2);
      vel[i * 3 + 2] = Math.sin(a) * speed * 0.55;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.material.opacity = 1;
    mesh.visible = true;
    this._confetti.life = 0;
  }

  resetRip() {
    const rev = this.rip.reveal;
    if (rev.card) this.revealAnchor.remove(rev.card);
    rev.card = null;
    rev.active = false;
    rev.done = false;
    rev.cb = null;
    if (this.rip.pack) this.rip.pack.visible = true;
    if (this._confetti) this._confetti.mesh.visible = false;
  }

  // ── Garage stage ──────────────────────────────────────────────────────────
  _buildGarage() {
    const g = this.groups.garage;
    g.add(this._makeBackdrop(18, 13, 4.5, 0x060911));
    g.add(this._makeFloor(17));
    const sign = makeTextPlane(makeSignTexture('APEX//RIP', 'GLOSS SHOWROOM'), 5.0, 1.25, 0.92);
    sign.position.set(0, 4.35, -7.4);
    g.add(sign);
    const signGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.0), glowMat(0x4fe3ff, 0.15));
    signGlow.position.set(0, 4.35, -7.45);
    g.add(signGlow);

    for (const [x, color] of [[-5.4, 0x4fe3ff], [5.4, 0xff3d86]]) {
      const bar = neonBar(color, 7.4, 0.09);
      bar.position.set(x, 3.7, -4.4);
      g.add(bar);
    }
    for (const [x, color] of [[-3.1, 0x2f6bff], [3.1, 0xff7a2f]]) {
      const bar = neonBar(color, 5.2, 0.05);
      bar.position.set(x, 2.6, -6.4);
      g.add(bar);
    }

    this.garagePads = [];
    const positions = [
      [-1.72, -1.35], [0, -1.55], [1.72, -1.35],
      [-1.85, 1.65], [0, 1.9], [1.85, 1.65],
    ];
    for (let i = 0; i < positions.length; i++) {
      const pad = new THREE.Group();
      pad.position.set(positions[i][0], 0, positions[i][1]);
      const disc = new THREE.Mesh(G.pad, M.ringDark);
      disc.position.y = 0.065;
      pad.add(disc);
      const rim = new THREE.Mesh(G.padRing, new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.6 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.135;
      pad.add(rim);
      const flareMat = glowMat(0x4fe3ff, 0.22).clone();
      const flare = new THREE.Mesh(G.flare, flareMat);
      flare.rotation.x = -Math.PI / 2;
      flare.scale.setScalar(0.55);
      flare.position.y = 0.14;
      pad.add(flare);
      pad.userData = { rim, flare, car: null, empty: null };
      g.add(pad);
      this.garagePads.push(pad);
    }
  }

  setLineup(cars) {
    if (!this.garagePads) return;
    for (const pad of this.garagePads) {
      if (pad.userData.car) {
        pad.remove(pad.userData.car);
        pad.userData.car = null;
      }
      if (pad.userData.empty) {
        pad.remove(pad.userData.empty);
        pad.userData.empty = null;
      }
    }
    const used = new Set();
    const order = [4, 1, 3, 5, 0, 2];
    (cars || []).slice(0, 6).forEach((car, i) => {
      const pad = this.garagePads[order[i]];
      if (!pad) return;
      used.add(pad);
      const rar = RARITIES[car.rarity];
      pad.userData.rim.material.color.set(rar.color);
      pad.userData.flare.material.color.set(rar.color);
      pad.userData.flare.material.opacity = 0.26;
      const visual = makeCarVisual(car, 0.82, this.cosmeticFor ? this.cosmeticFor(car.id) : null);
      visual.position.y = 0.15;
      visual.rotation.y = rand(0, TAU);
      visual.userData.baseRotY = visual.rotation.y;
      pad.add(visual);
      pad.userData.car = visual;
    });
    for (const pad of this.garagePads) {
      if (used.has(pad)) continue;
      pad.userData.rim.material.color.set(0x2a3d57);
      pad.userData.flare.material.color.set(0x2a3d57);
      pad.userData.flare.material.opacity = 0.12;
      const ghost = new THREE.Mesh(G.ico, new THREE.MeshBasicMaterial({ color: 0x3d5878, wireframe: true, transparent: true, opacity: 0.55 }));
      ghost.position.y = 0.75;
      pad.add(ghost);
      pad.userData.empty = ghost;
    }
  }

  // ── Workshop stage ────────────────────────────────────────────────────────
  _buildWorkshop() {
    const g = this.groups.workshop;
    g.add(this._makeBackdrop(16, 12, 4, 0x060911));
    g.add(this._makeFloor(14));

    const platform = new THREE.Mesh(G.platform, M.floorDark);
    platform.position.y = 0.13;
    const ring = new THREE.Mesh(G.platformRing, new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.27;
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.6, 64), new THREE.MeshBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0.38, side: THREE.DoubleSide }));
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.275;
    g.add(platform, ring, ring2);
    this.workshopRing = ring;
    this.workshopRing2 = ring2;

    // bay frame
    const pillarMat = new THREE.MeshPhysicalMaterial({ color: 0x131a26, metalness: 0.8, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.15 });
    for (const x of [-3.45, 3.45]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 5.4, 0.34), pillarMat);
      pillar.position.set(x, 2.7, -2.1);
      g.add(pillar);
      const strip = neonBar(x < 0 ? 0x4fe3ff : 0xff7a2f, 4.6, 0.045);
      strip.position.set(x + (x < 0 ? 0.16 : -0.16), 2.6, -1.9);
      g.add(strip);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.26, 0.36), pillarMat);
    beam.position.set(0, 5.35, -2.1);
    g.add(beam);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.06, 0.18), new THREE.MeshBasicMaterial({ color: 0xfff6dc }));
    bar.position.set(0, 5.18, -2.0);
    g.add(bar);
    const barGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.5), glowMat(0xffe9bd, 0.22));
    barGlow.position.set(0, 4.7, -2.0);
    g.add(barGlow);

    // tool benches
    for (const x of [-4.7, 4.7]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.6), M.floorDark);
      bench.position.set(x, 0.45, -1.2);
      g.add(bench);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.48), new THREE.MeshBasicMaterial({ color: 0x0b2a30 }));
      screen.position.set(x, 1.25, -1.15);
      screen.rotation.x = -0.25;
      g.add(screen);
    }

    const carAnchor = new THREE.Group();
    carAnchor.position.set(0, 0.28, 0);
    g.add(carAnchor);
    this.workshopCarAnchor = carAnchor;

    this.upgradePulse = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 1.86, 64),
      new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    this.upgradePulse.rotation.x = -Math.PI / 2;
    this.upgradePulse.position.y = 0.3;
    g.add(this.upgradePulse);
    this._pulseT = 1;

    this.workshopCar = null;
  }

  setWorkshopCar(car) {
    const anchor = this.workshopCarAnchor;
    while (anchor.children.length) anchor.remove(anchor.children[0]);
    this.workshopCar = null;
    if (!car) return;
    const visual = makeCarVisual(car, 0.96, this.cosmeticFor ? this.cosmeticFor(car.id) : null);
    visual.rotation.y = 2.32;
    visual.position.y = 0;
    anchor.add(visual);
    this.workshopCar = visual;
    const rar = RARITIES[car.rarity];
    this.workshopRing.material.color.set(rar.color);
    this.workshopRing2.material.color.set(car.trait ? TRAITS[car.trait].color : rar.color);
    this.upgradePulse.material.color.set(rar.color);
  }

  pulseWorkshop() {
    this._pulseT = 0;
  }

  // ── Wheel stage ───────────────────────────────────────────────────────────
  _buildWheel() {
    const g = this.groups.wheel;
    g.add(this._makeBackdrop(17, 13, 4.5, 0x07060e));
    g.add(this._makeFloor(15, 0, 0x07070f));
    for (const [x, color] of [[-5.6, 0x4fe3ff], [5.6, 0xff3d86]]) {
      const bar = neonBar(color, 6.8, 0.08);
      bar.position.set(x, 3.3, -4.6);
      g.add(bar);
    }

    const wheelRoot = new THREE.Group();
    wheelRoot.position.set(0, 2.78, 0);
    g.add(wheelRoot);
    this.wheelRoot = wheelRoot;

    const back = new THREE.Mesh(new THREE.CircleGeometry(1.94, 64), new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 0.4, metalness: 0.7 }));
    back.position.z = -0.18;
    wheelRoot.add(back);

    const wheel = new THREE.Group();
    wheelRoot.add(wheel);
    this.wheel = wheel;

    const segs = WHEEL_REWARDS.length;
    for (let i = 0; i < segs; i++) {
      const reward = WHEEL_REWARDS[i];
      const geo = makeWheelGeometry(i, segs);
      const col = new THREE.Color(reward.color);
      const mat = new THREE.MeshPhysicalMaterial({
        color: col, metalness: 0.5, roughness: 0.28,
        clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 1.1,
        emissive: col, emissiveIntensity: 0.1,
      });
      const wedge = new THREE.Mesh(geo, mat);
      wheel.add(wedge);
      const a = ((i + 0.5) / segs) * TAU;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.32),
        new THREE.MeshBasicMaterial({ map: makeWheelLabelTexture(reward), transparent: true, depthWrite: false, opacity: 0.95 })
      );
      label.position.set(Math.cos(a) * 1.16, Math.sin(a) * 1.16, 0.16);
      label.rotation.z = a - Math.PI / 2;
      wheel.add(label);
    }

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.055, 10, 96), M.gold);
    rim.position.z = 0.05;
    wheelRoot.add(rim);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 8, 64), M.chrome);
    rim2.position.z = 0.18;
    wheelRoot.add(rim2);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.34, 36), new THREE.MeshPhysicalMaterial({ color: 0x141b28, metalness: 0.9, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }));
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.16;
    wheelRoot.add(hub);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 32), M.gold);
    hubCap.rotation.x = Math.PI / 2;
    hubCap.position.z = 0.2;
    wheelRoot.add(hubCap);
    const hubLogo = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshBasicMaterial({ color: 0x05070c }));
    hubLogo.position.z = 0.39;
    wheelRoot.add(hubLogo);

    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 3), M.gold);
    pointer.position.set(0, 2.10, 0.3);
    pointer.rotation.z = Math.PI;
    wheelRoot.add(pointer);
    this.wheelPointer = pointer;

    const wheelGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), glowMat(0xffc247, 0.18));
    wheelGlow.position.z = -0.7;
    wheelRoot.add(wheelGlow);
    this.wheelGlow = wheelGlow;

    const light = new THREE.PointLight(0xffc247, 30, 12, 2);
    light.position.set(0, 1.6, 2.2);
    g.add(light);
    this.wheelLight = light;

    this._wheelSpin = null;
    this._pointerPulse = 0;
  }

  spinWheel(index, onDone) {
    if (!this.wheel) return false;
    if (this._wheelSpin) return false;
    const segs = WHEEL_REWARDS.length;
    const seg = TAU / segs;
    const from = this.wheel.rotation.z;
    const targetMod = Math.PI / 2 - (index + 0.5) * seg;
    let delta = ((targetMod - from) % TAU + TAU) % TAU;
    const to = from + TAU * 5 + delta;
    this._wheelSpin = { from, to, t: 0, dur: 4.6, onDone: onDone || null };
    this._pointerPulse = 0;
    return true;
  }

  // ── Card inspect stage ────────────────────────────────────────────────────
  _buildCardStage() {
    const g = this.groups.card;
    g.add(this._makeBackdrop(14, 11, 4, 0x060810));
    g.add(this._makeFloor(12));
    for (const [x, color] of [[-4.2, 0x4fe3ff], [4.2, 0xff3d86]]) {
      const bar = neonBar(color, 5.5, 0.07);
      bar.position.set(x, 2.7, -3.0);
      g.add(bar);
    }
    const anchor = new THREE.Group();
    anchor.position.set(0, 2.18, 0);
    g.add(anchor);
    this.inspectAnchor = anchor;
    this.inspectCard = null;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 4.6), glowMat(0x4fe3ff, 0.22));
    glow.position.set(0, 2.18, -0.65);
    g.add(glow);
    this.inspectGlow = glow;
    this.inspectSign = makeTextPlane(makeSignTexture('CARD INSPECTION', 'DRAG TO ORBIT'), 3.6, 0.9, 0.6);
    this.inspectSign.position.set(0, 0.7, -4.5);
    g.add(this.inspectSign);
  }

  _makeCard(car, scale = 1) {
    initShared();
    const group = new THREE.Group();
    const rar = RARITIES[car.rarity];
    const edge = new THREE.Mesh(G.cardBody, new THREE.MeshStandardMaterial({ color: rar.color, metalness: 1, roughness: 0.18, emissive: rar.color, emissiveIntensity: 0.16 }));
    group.add(edge);
    const front = new THREE.Mesh(G.cardFace, new THREE.MeshPhysicalMaterial({
      map: makeCardTexture(car), metalness: 0.22, roughness: 0.25,
      clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.2,
    }));
    front.position.z = 0.026;
    group.add(front);
    const back = new THREE.Mesh(G.cardFace, M.cardBack);
    back.position.z = -0.026;
    back.rotation.y = Math.PI;
    group.add(back);
    const foil = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 2.42), new THREE.MeshBasicMaterial({
      map: makeFoilTexture(), transparent: true, opacity: 0.13,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    foil.position.z = 0.031;
    group.add(foil);
    const glow = new THREE.Mesh(G.cardGlow, glowMat(rar.color, 0.34));
    glow.position.z = -0.1;
    group.add(glow);
    group.scale.setScalar(scale);
    group.userData.car = car;
    group.userData.foil = foil;
    return group;
  }

  openCard(car) {
    if (!car) return;
    if (this.inspectCard) this.inspectAnchor.remove(this.inspectCard);
    const card = this._makeCard(car, 1.08);
    card.rotation.set(0.03, -0.04, 0);
    this.inspectAnchor.add(card);
    this.inspectCard = card;
    const rar = RARITIES[car.rarity];
    this.inspectGlow.material.color.set(rar.color);
    this.setStage('card');
  }

  closeCard() {
    this.setStage('garage');
  }

  // ── Stage + camera ────────────────────────────────────────────────────────
  setStage(name, instant = false) {
    if (!this.groups[name]) return;
    this.stage = name;
    for (const key of Object.keys(this.groups)) {
      this.groups[key].visible = key === name;
    }
    if (this.dust) this.dust.visible = name !== 'race';
    this.orbit.az = 0;
    this.orbit.el = 0;
    if (name !== 'race') this._raceEnv = null;
    this._applyAtmosphere();
    if (instant) {
      const cfg = STAGE_CAMS[name];
      const pos = new THREE.Vector3(...cfg.pos);
      const look = new THREE.Vector3(...cfg.look);
      this._camPos.copy(pos);
      this._camLook.copy(look);
      this.camera.position.copy(pos);
      this.camera.fov = cfg.fov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(look);
    }
  }

  _updateCamera(dt) {
    if (this.stage === 'race') return;
    const cfg = STAGE_CAMS[this.stage] || STAGE_CAMS.rip;
    const look = new THREE.Vector3(...cfg.look);
    const base = new THREE.Vector3(...cfg.pos);
    const dist = base.distanceTo(look);
    const dx = base.x - look.x;
    const dy = base.y - look.y;
    const dz = base.z - look.z;
    const baseAz = Math.atan2(dx, dz);
    const baseEl = Math.asin(clamp(dy / dist, -1, 1));
    const az = baseAz + this.orbit.az;
    const el = clamp(baseEl + this.orbit.el, 0.03, 1.15);
    const desired = new THREE.Vector3(
      look.x + Math.cos(el) * Math.sin(az) * dist,
      look.y + Math.sin(el) * dist,
      look.z + Math.cos(el) * Math.cos(az) * dist,
    );
    const k = this._initialized ? 1 - Math.exp(-7 * dt) : 1;
    this._camPos.lerp(desired, k);
    this._camLook.lerp(look, k);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
    const fovK = 1 - Math.exp(-6 * dt);
    this.camera.fov += (cfg.fov - this.camera.fov) * fovK;
    this.camera.updateProjectionMatrix();
  }

  _bindPointer() {
    const el = this.canvas;
    const down = (e) => {
      if (this.pointer) return;
      this.pointer = {
        id: e.pointerId, x: e.clientX, y: e.clientY,
        sx: e.clientX, sy: e.clientY, moved: false,
      };
      try { el.setPointerCapture(e.pointerId); } catch {}
      if (e.cancelable) e.preventDefault();
    };
    const move = (e) => {
      const p = this.pointer;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (Math.abs(e.clientX - p.sx) + Math.abs(e.clientY - p.sy) > 7) p.moved = true;
      if (this.stage !== 'race' && p.moved) {
        this.orbit.az = clamp(this.orbit.az - dx * 0.0052, -1.05, 1.05);
        this.orbit.el = clamp(this.orbit.el + dy * 0.0034, -0.22, 0.34);
      }
      if (e.cancelable) e.preventDefault();
    };
    const up = (e) => {
      const p = this.pointer;
      if (!p || p.id !== e.pointerId) return;
      this.pointer = null;
      try { el.releasePointerCapture(e.pointerId); } catch {}
      if (this.stage === 'race' && this.onRaceGesture) {
        const dx = e.clientX - p.sx;
        const dy = e.clientY - p.sy;
        if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) {
          this.onRaceGesture({ type: 'swipe', dir: dx > 0 ? 1 : -1 });
        } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          this.onRaceGesture({ type: 'tap' });
        }
      }
    };
    const cancel = () => { this.pointer = null; };
    el.addEventListener('pointerdown', down, { passive: false });
    el.addEventListener('pointermove', move, { passive: false });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  resize() {
    const app = document.getElementById('app');
    const w = Math.max(1, app ? app.clientWidth : window.innerWidth);
    const h = Math.max(1, app ? app.clientHeight : window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this._initialized) {
      this.setStage(this.stage, true);
      this._initialized = true;
    }
  }

  // ── Frame update ──────────────────────────────────────────────────────────
  update(dt, time) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const t = this.time;
    this._updateCamera(dt);
    if (this.dust && this.dust.visible) this.dust.rotation.y += dt * 0.012;
    this._updateWeather(dt, t);

    if (this.groups.rip.visible) this._updateRip(dt, t);
    if (this.groups.garage.visible) this._updateGarage(dt, t);
    if (this.groups.workshop.visible) this._updateWorkshop(dt, t);
    if (this.groups.wheel.visible) this._updateWheel(dt, t);
    if (this.groups.card.visible) this._updateCardStage(dt, t);
  }

  _updateRip(dt, t) {
    if (this.ripTable) this.ripTable.rotation.y += dt * 0.08;
    if (this.ripRing2) this.ripRing2.rotation.z -= dt * 0.16;
    for (let i = 0; i < this.holoShards.length; i++) {
      const s = this.holoShards[i];
      const a = t * 0.25 + i * 1.05;
      s.position.x = Math.cos(a) * (1.9 + i * 0.12);
      s.position.z = Math.sin(a) * 0.9;
      s.position.y = 1.55 + Math.sin(t * 0.8 + i) * 0.55;
      s.rotation.x += dt * 0.7;
      s.rotation.y += dt * 0.9;
    }

    const rev = this.rip.reveal;
    const style = this.rip.style || elementStyle('neon');
    if (this.rip.pack) {
      if (!rev.active || rev.t < 0.42) {
        const body = this.rip.pack.userData.body || this.rip.pack;
        body.rotation.y += dt * (0.6 * style.spin);
        body.rotation.x = Math.sin(t * style.tiltSpeed) * style.tilt;
        this.rip.pack.position.y = 0.06 + Math.sin(t * style.bobSpeed) * style.bob;
        if (rev.active && rev.t < 0.42) {
          const wind = rev.t;
          const glitch = this.rip.element === 'glitch';
          this.rip.pack.rotation.z = Math.sin(wind * style.jitterFreq) * style.jitter + (glitch ? rand(-0.06, 0.06) : 0);
          this.rip.pack.position.x = Math.sin(wind * style.swayFreq) * style.sway;
          this.rip.pack.scale.setScalar(1 + wind * style.swell + (glitch ? rand(-0.03, 0.03) : 0));
        } else {
          this.rip.pack.position.x *= (1 - Math.min(1, dt * 8));
          this.rip.pack.scale.setScalar(lerp(this.rip.pack.scale.x, 1, 1 - Math.exp(-6 * dt)));
        }
      }
    }

    // elemental backdrop behind the pack
    if (this._packFx) {
      const fx = this._packFx;
      const pos = fx.mesh.geometry.attributes.position.array;
      const seed = fx.seed;
      const element = this.rip.element;
      for (let i = 0; i < fx.count; i++) {
        const ix = i * 3;
        if (element === 'ice' || element === 'rain') {
          pos[ix + 1] -= dt * (element === 'ice' ? 0.32 : 0.85);
          pos[ix] += Math.sin(t * 0.9 + seed[i]) * dt * 0.22;
          if (pos[ix + 1] < 0.12) pos[ix + 1] = 3.6;
        } else if (element === 'ember' || element === 'solar' || element === 'sparks') {
          pos[ix + 1] += dt * (0.45 + (i % 4) * 0.08);
          pos[ix] += Math.sin(t * 0.75 + seed[i]) * dt * 0.2;
          if (pos[ix + 1] > 3.7) pos[ix + 1] = 0.18;
        } else if (element === 'cosmic' || element === 'glitch' || element === 'prism') {
          const radius = 1.15 + (i % 8) * 0.18;
          const angle = seed[i] + t * (element === 'glitch' ? 0.9 : 0.32);
          pos[ix] = Math.cos(angle) * radius;
          pos[ix + 1] = 1.65 + Math.sin(t * 0.5 + seed[i]) * 1.25;
          pos[ix + 2] = -1.05 + Math.sin(angle) * radius * 0.6;
        } else if (element === 'dust') {
          pos[ix] += dt * 0.34;
          pos[ix + 1] += Math.sin(t + seed[i]) * dt * 0.12;
          if (pos[ix] > 2.6) pos[ix] = -2.6;
        } else {
          pos[ix + 1] += Math.sin(t * style.bobSpeed + seed[i]) * dt * 0.14;
          pos[ix] += Math.sin(t * 0.5 + seed[i]) * dt * 0.12;
        }
      }
      fx.mesh.geometry.attributes.position.needsUpdate = true;
    }

    if (rev.active) {
      rev.t += dt;
      if (rev.t < 0.44) {
        // element-specific wind-up handled by the pack transform above
      } else {
        if (!this.rip.burstDone) {
          this.rip.burstDone = true;
          this._ripFlashT = 0;
          if (this._ripFlash) {
            this._ripFlash.scale.setScalar(0.45);
            this._ripFlash.material.opacity = 0.85;
          }
          this._burstConfetti();
        }
        if (this.rip.pack) this.rip.pack.visible = false;
        if (rev.card) {
          rev.card.visible = true;
          const p = clamp((rev.t - 0.44) / 0.85, 0, 1);
          const e = easeOut(p);
          rev.card.scale.setScalar(lerp(0.7, 1.08, e));
          rev.card.position.y = lerp(0.85, 1.82, e) + Math.sin(p * Math.PI) * 0.22;
          rev.card.rotation.y = Math.PI * (1 - e);
          rev.card.rotation.z = Math.sin(p * Math.PI) * 0.08;
        }
      }
      if (!rev.done && rev.t > 1.15) {
        rev.done = true;
        if (rev.cb) { const cb = rev.cb; rev.cb = null; cb(); }
      }
      if (rev.card && rev.t > 1.35) {
        rev.card.rotation.y += dt * 0.22;
        rev.card.position.y = 1.82 + Math.sin((rev.t - 1.35) * 1.25) * 0.045;
        if (rev.card.userData.foil) rev.card.userData.foil.material.opacity = 0.13 + Math.sin(t * 2.2) * 0.04;
      }
    }

    if (this._ripFlash && this._ripFlash.material.opacity > 0.002) {
      this._ripFlashT += dt;
      const p = clamp(this._ripFlashT / 0.55, 0, 1);
      this._ripFlash.scale.setScalar(0.45 + p * 2.7);
      this._ripFlash.material.opacity = (1 - p) * 0.85;
    }

    if (this._confetti && this._confetti.mesh.visible) {
      const c = this._confetti;
      c.life += dt;
      const pos = c.mesh.geometry.attributes.position.array;
      for (let i = 0; i < c.count; i++) {
        c.vel[i * 3 + 1] -= 4.2 * dt;
        pos[i * 3] += c.vel[i * 3] * dt;
        pos[i * 3 + 1] += c.vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += c.vel[i * 3 + 2] * dt;
      }
      c.mesh.geometry.attributes.position.needsUpdate = true;
      c.mesh.material.opacity = Math.max(0, 1 - c.life / 2.4);
      if (c.life > 2.5) c.mesh.visible = false;
    }
  }

  _updateWeather(dt, t) {
    const w = this.weather;
    const fx = this.weatherFx;
    if (!fx || !w || w.kind === 'clear') {
      if (this.key) this.key.intensity += (2.4 - this.key.intensity) * (1 - Math.exp(-3 * dt));
      if (this.hemi) this.hemi.intensity += (1.35 - this.hemi.intensity) * (1 - Math.exp(-3 * dt));
      return;
    }
    const kind = w.kind;
    const pos = fx.mesh.geometry.attributes.position.array;
    const seed = fx.seed;
    const falling = ['rain', 'monsoon', 'acid', 'storm', 'snow', 'ice', 'mist', 'overcast', 'clouds', 'fog'].includes(kind);
    const rising = ['ash', 'solar', 'heat'].includes(kind);
    const orbital = ['cosmic', 'aurora', 'meteor', 'eclipse', 'arcane', 'starfall', 'phantom', 'chrono'].includes(kind);
    const fallSpeed = kind === 'monsoon' ? 8.5 : kind === 'storm' ? 7.2 : kind === 'acid' ? 6.2 : kind === 'snow' ? 0.95 : kind === 'ice' ? 0.8 : 2.4;
    for (let i = 0; i < fx.count; i++) {
      const ix = i * 3;
      if (falling) {
        pos[ix + 1] -= fallSpeed * dt;
        pos[ix] += Math.sin(t * 0.7 + seed[i]) * dt * 0.4;
        if (pos[ix + 1] < 0.08) {
          pos[ix] = rand(-13, 13);
          pos[ix + 1] = rand(9, 12.5);
          pos[ix + 2] = rand(-12, 8);
        }
      } else if (rising) {
        pos[ix + 1] += (kind === 'solar' ? 0.9 : 1.5) * dt;
        pos[ix] += Math.sin(t * 0.55 + seed[i]) * dt * 0.35;
        if (pos[ix + 1] > 12) {
          pos[ix] = rand(-13, 13);
          pos[ix + 1] = 0.15;
          pos[ix + 2] = rand(-12, 8);
        }
      } else if (orbital) {
        const radius = 3.4 + (i % 9) * 0.95;
        const angle = seed[i] + t * (0.10 + (i % 5) * 0.025);
        pos[ix] = Math.cos(angle) * radius;
        pos[ix + 1] = 1.1 + (i % 7) * 0.55 + Math.sin(t * 0.32 + seed[i] * 2.2) * 1.5;
        pos[ix + 2] = -2.5 + Math.sin(angle) * radius * 0.62;
      } else {
        pos[ix] += dt * (kind === 'sand' ? 2.3 : kind === 'sunset' ? 0.35 : 0.75);
        pos[ix + 1] += Math.sin(t + seed[i]) * dt * 0.18;
        if (pos[ix] > 14) {
          pos[ix] = -14;
          pos[ix + 1] = rand(0.2, 12);
          pos[ix + 2] = rand(-12, 8);
        }
      }
    }
    fx.mesh.geometry.attributes.position.needsUpdate = true;

    const stormy = ['storm', 'arcane', 'overcast', 'eclipse'].includes(kind);
    if (stormy) {
      this._flash = Math.max(0, this._flash - dt * 2.8);
      if (Math.random() < dt * (kind === 'storm' ? 0.75 : 0.3)) this._flash = 1;
      if (this.key) this.key.intensity = 2.4 + this._flash * 4.2;
      if (this.hemi) this.hemi.intensity = 1.35 + this._flash * 1.6;
    } else {
      if (this.key) this.key.intensity += (2.4 - this.key.intensity) * (1 - Math.exp(-3 * dt));
      if (this.hemi) this.hemi.intensity += (1.35 - this.hemi.intensity) * (1 - Math.exp(-3 * dt));
    }
  }

  _updateGarage(dt, t) {
    for (const pad of this.garagePads) {
      if (pad.userData.car) {
        pad.userData.car.rotation.y += dt * 0.34;
        animateAccents(pad.userData.car, t, dt);
        pad.userData.car.position.y = 0.15 + Math.sin(t * 0.9 + pad.position.x) * 0.012;
      }
      if (pad.userData.empty) {
        pad.userData.empty.rotation.y += dt * 0.5;
        pad.userData.empty.rotation.x += dt * 0.18;
        pad.userData.empty.position.y = 0.8 + Math.sin(t * 1.1 + pad.position.z) * 0.09;
      }
    }
  }

  _updateWorkshop(dt, t) {
    if (this.workshopCar) {
      this.workshopCar.rotation.y = 2.32 + Math.sin(t * 0.35) * 0.06;
      this.workshopCar.position.y = Math.sin(t * 0.8) * 0.012;
      animateAccents(this.workshopCar, t, dt);
    }
    if (this.workshopRing2) this.workshopRing2.rotation.z += dt * 0.22;
    if (this._pulseT < 1) {
      this._pulseT = Math.min(1, this._pulseT + dt * 1.4);
      const p = easeOut(this._pulseT);
      this.upgradePulse.scale.setScalar(1 + p * 1.6);
      this.upgradePulse.material.opacity = (1 - p) * 0.7;
    }
    if (this.upgradePulse) this.upgradePulse.rotation.z += dt * 0.15;
  }

  _updateWheel(dt, t) {
    if (this._wheelSpin) {
      const s = this._wheelSpin;
      s.t += dt;
      const p = clamp(s.t / s.dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);
      this.wheel.rotation.z = s.from + (s.to - s.from) * e;
      if (this.wheelLight) this.wheelLight.intensity = 30 + Math.sin(p * Math.PI * 16) * 12 * (1 - p * 0.5);
      if (p >= 1) {
        this.wheel.rotation.z = s.to;
        this._wheelSpin = null;
        this._pointerPulse = 1;
        if (s.onDone) s.onDone();
      }
    } else if (this.wheelLight) {
      this.wheelLight.intensity += (30 - this.wheelLight.intensity) * (1 - Math.exp(-4 * dt));
    }
    if (this._pointerPulse > 0) {
      this._pointerPulse = Math.max(0, this._pointerPulse - dt * 1.7);
      const p = this._pointerPulse;
      this.wheelPointer.scale.set(1 + Math.sin(p * Math.PI) * 0.24, 1 + Math.sin(p * Math.PI) * 0.24, 1);
      this.wheelPointer.rotation.z = Math.PI + Math.sin(p * Math.PI * 2) * 0.12;
    }
    if (this.wheelGlow) this.wheelGlow.material.opacity = 0.16 + Math.sin(t * 1.2) * 0.035;
  }

  _updateCardStage(dt, t) {
    if (this.inspectCard) {
      this.inspectCard.position.y = Math.sin(t * 0.9) * 0.035;
      this.inspectCard.rotation.y = -0.04 + Math.sin(t * 0.35) * 0.055;
      this.inspectCard.rotation.x = 0.03 + Math.sin(t * 0.27) * 0.02;
      const foil = this.inspectCard.userData.foil;
      if (foil) foil.material.opacity = 0.13 + Math.sin(t * 1.6) * 0.045;
      animateAccents(this.inspectCard, t, dt);
    }
  }

  setEnvironment(bg, fogColor, near = 28, far = 115) {
    this._raceEnv = { bg, fog: fogColor, near, far };
    this._applyAtmosphere();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
