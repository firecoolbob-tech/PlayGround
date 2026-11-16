import * as THREE from './vendor/three.module.js';
import { clamp, mulberry32 } from './utils.js';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const SKY_TOP = 0x4f8fc4;
const SKY_HORIZON = 0xcfe6e2;
const FOG_COLOR = 0xc4dcda;

function makeTexture(width, height, paint, { clampEdge = false, repeat = null } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = clampEdge
    ? THREE.ClampToEdgeWrapping
    : THREE.RepeatWrapping;
  texture.anisotropy = 4;
  if (repeat) texture.repeat.set(repeat[0], repeat[1]);
  return texture;
}

function makeGrassTexture() {
  const rnd = mulberry32(9182);
  return makeTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#3b7c45';
    g.fillRect(0, 0, w, h);

    for (let i = 0; i < 9; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 30 + rnd() * 70;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rnd() < 0.5 ? 'rgba(18, 70, 34, 0.16)' : 'rgba(150, 203, 122, 0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = 'rgba(220, 255, 205, 0.035)';
    for (let i = -260; i < 520; i += 128) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 64, 0);
      g.lineTo(i + 64 + 256, 256);
      g.lineTo(i + 256, 256);
      g.closePath();
      g.fill();
    }

    for (let i = 0; i < 1700; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 0.5 + rnd() * 1.8;
      g.fillStyle = rnd() < 0.52 ? 'rgba(10, 48, 22, 0.5)' : 'rgba(135, 196, 110, 0.3)';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 80; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      g.strokeStyle = 'rgba(160, 220, 140, 0.24)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rnd() - 0.5) * 6, y - 4 - rnd() * 4);
      g.stroke();
    }
  }, { repeat: [34, 27] });
}

function makeAsphaltTexture() {
  const rnd = mulberry32(551);
  return makeTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#454b54';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4200; i++) {
      const v = rnd();
      g.fillStyle =
        v < 0.48
          ? 'rgba(20, 23, 28, 0.24)'
          : v < 0.84
            ? 'rgba(138, 146, 158, 0.15)'
            : 'rgba(210, 218, 224, 0.13)';
      const s = 0.5 + rnd() * 1.7;
      g.fillRect(rnd() * w, rnd() * h, s, s);
    }
    g.strokeStyle = 'rgba(19, 22, 27, 0.2)';
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = rnd() * h;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + (rnd() - 0.5) * 12);
      g.stroke();
    }
  });
}

function makeRampTexture() {
  const rnd = mulberry32(731);
  return makeTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#353b41';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) {
      const v = rnd();
      g.fillStyle =
        v < 0.5 ? 'rgba(16, 19, 22, 0.26)' : 'rgba(150, 158, 166, 0.14)';
      const s = 0.5 + rnd() * 1.6;
      g.fillRect(rnd() * w, rnd() * h, s, s);
    }

    // Hazard strips along both long edges.
    for (const y of [0, h - 13]) {
      g.fillStyle = '#e6b32c';
      g.fillRect(0, y, w, 13);
      g.fillStyle = '#1a1d1f';
      for (let x = -h; x < w + h; x += 26) {
        g.beginPath();
        g.moveTo(x, y + 13);
        g.lineTo(x + 13, y);
        g.lineTo(x + 24, y);
        g.lineTo(x + 11, y + 13);
        g.closePath();
        g.fill();
      }
    }

    // Forward-pointing chevrons.
    g.lineWidth = 12;
    g.lineJoin = 'miter';
    g.strokeStyle = '#f2c53b';
    for (let i = -1; i < 4; i++) {
      const x = 44 + i * 68;
      g.beginPath();
      g.moveTo(x - 30, 27);
      g.lineTo(x, 64);
      g.lineTo(x - 30, 101);
      g.stroke();
    }
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(255, 246, 205, 0.7)';
    for (let i = -1; i < 4; i++) {
      const x = 44 + i * 68;
      g.beginPath();
      g.moveTo(x - 30, 27);
      g.lineTo(x, 64);
      g.lineTo(x - 30, 101);
      g.stroke();
    }
  }, { clampEdge: true });
}

function makeCheckerTexture() {
  return makeTexture(128, 512, (g, w, h) => {
    g.fillStyle = '#f3efe4';
    g.fillRect(0, 0, w, h);
    const cols = 14;
    const rows = 2;
    const cw = w / rows;
    const ch = h / cols;
    g.fillStyle = '#14181a';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 !== 0) g.fillRect(r * cw, c * ch, cw, ch);
      }
    }
  }, { clampEdge: true });
}

function makeGlowTexture() {
  return makeTexture(128, 128, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.72)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }, { clampEdge: true });
}

function makeShadowTexture() {
  return makeTexture(128, 128, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }, { clampEdge: true });
}

function makeRoundelTexture(number) {
  return makeTexture(128, 128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = 'rgba(7, 16, 18, 0.66)';
    g.beginPath();
    g.arc(s / 2, s / 2, 54, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.88)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(s / 2, s / 2, 54, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = '800 68px "Arial Narrow", "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(number), s / 2, s / 2 + 2);
  }, { clampEdge: true });
}

function makeLabelTexture(label, color) {
  return makeTexture(512, 192, (g, w, h) => {
    g.fillStyle = '#0c1718';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 10;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = color;
    g.fillRect(8, h - 30, w - 16, 8);
    g.fillStyle = '#f5fbfa';
    g.font = '800 96px "Arial Narrow", "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, w / 2, h / 2 - 4);
  }, { clampEdge: true });
}

function makeBannerTexture() {
  return makeTexture(1024, 128, (g, w, h) => {
    g.fillStyle = '#0c1517';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2eee3';
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#3ae2ff';
    g.font = '900 72px "Arial Narrow", "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('APEX DRIFT', w / 2, h / 2 + 2);
  }, { clampEdge: true });
}

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Shared car geometry                                                 */
/* ------------------------------------------------------------------ */

const CAR_GEO = {
  chassis: new THREE.BoxGeometry(44, 6, 26),
  nose: new THREE.BoxGeometry(16, 4.6, 20),
  noseTip: new THREE.BoxGeometry(8, 3.6, 14),
  sidepod: new THREE.BoxGeometry(30, 4.4, 3.2),
  cabin: new THREE.BoxGeometry(19, 7, 17),
  roof: new THREE.BoxGeometry(12, 2.2, 15),
  stripe: new THREE.BoxGeometry(38, 0.5, 3.6),
  wing: new THREE.BoxGeometry(5, 1.7, 29),
  wingSupport: new THREE.BoxGeometry(3, 5, 3.2),
  light: new THREE.BoxGeometry(1.6, 2.4, 5.6),
  wheel: new THREE.CylinderGeometry(5.4, 5.4, 4.2, 18),
  hub: new THREE.CylinderGeometry(2.5, 2.5, 4.4, 12),
  roundel: new THREE.PlaneGeometry(9.5, 9.5),
  shadow: new THREE.PlaneGeometry(1, 1),
};

const GLOW_TEX = makeGlowTexture();
const SHADOW_TEX = makeShadowTexture();

function buildCarModel(spec) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const paint = new THREE.MeshStandardMaterial({
    color: spec.color,
    metalness: 0.38,
    roughness: 0.36,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: spec.accent,
    metalness: 0.32,
    roughness: 0.46,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x11181c,
    metalness: 0.55,
    roughness: 0.48,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x10252b,
    metalness: 0.86,
    roughness: 0.14,
    emissive: 0x092027,
    emissiveIntensity: 0.7,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xc9d6d6,
    metalness: 0.92,
    roughness: 0.22,
  });
  const tyre = new THREE.MeshStandardMaterial({
    color: 0x101317,
    metalness: 0.1,
    roughness: 0.92,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff6d6,
    emissive: 0xffefb0,
    emissiveIntensity: 2.4,
    roughness: 0.28,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x5c0d0a,
    emissive: 0xff2a1c,
    emissiveIntensity: 1.15,
    roughness: 0.4,
  });

  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    body.add(mesh);
    return mesh;
  };

  // Chassis and tapered nose.
  add(CAR_GEO.chassis, paint, 0, 7.4, 0);
  add(CAR_GEO.nose, paint, 17, 7.2, 0);
  add(CAR_GEO.noseTip, paint, 23, 7.0, 0);

  // Side pods in the accent colour.
  add(CAR_GEO.sidepod, accent, -2, 6.4, 13.1);
  add(CAR_GEO.sidepod, accent, -2, 6.4, -13.1);

  // Cockpit, roof and livery stripe.
  add(CAR_GEO.cabin, glass, -4, 13.4, 0);
  add(CAR_GEO.roof, paint, -5, 17.0, 0);
  add(
    CAR_GEO.stripe,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.6,
    }),
    2,
    10.72,
    0
  );

  // Rear wing.
  add(CAR_GEO.wing, dark, -22, 15.2, 0);
  add(CAR_GEO.wingSupport, dark, -20.5, 12.2, 8.5);
  add(CAR_GEO.wingSupport, dark, -20.5, 12.2, -8.5);

  // Lights.
  add(CAR_GEO.light, headMat, 26.4, 8.5, 7.4);
  add(CAR_GEO.light, headMat, 26.4, 8.5, -7.4);
  add(CAR_GEO.light, tailMat, -22.5, 8.5, 7.4);
  add(CAR_GEO.light, tailMat, -22.5, 8.5, -7.4);

  // Wheels.
  const wheelGroups = [];
  for (const wx of [15, -15]) {
    for (const wz of [-12.2, 12.2]) {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, 5.4, wz);
      body.add(wheelGroup);

      const wheel = new THREE.Mesh(CAR_GEO.wheel, tyre);
      wheel.rotation.x = Math.PI / 2;
      wheelGroup.add(wheel);

      const hub = new THREE.Mesh(CAR_GEO.hub, chrome);
      hub.rotation.x = Math.PI / 2;
      wheelGroup.add(hub);

      if (wx > 0) wheelGroups.push(wheelGroup);
    }
  }

  // Tail light glow sprites.
  const tailGlowMat = new THREE.SpriteMaterial({
    map: GLOW_TEX,
    color: 0xff2f22,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (const wz of [-7.4, 7.4]) {
    const sprite = new THREE.Sprite(tailGlowMat);
    sprite.position.set(-23.6, 8.5, wz);
    sprite.scale.set(10, 10, 1);
    body.add(sprite);
  }

  // Number roundel on the nose.
  const roundelMat = new THREE.MeshBasicMaterial({
    map: makeRoundelTexture(spec.number),
    transparent: true,
    depthWrite: false,
  });
  const roundel = new THREE.Mesh(CAR_GEO.roundel, roundelMat);
  roundel.rotation.x = -Math.PI / 2;
  roundel.position.set(22.5, 9.1, 0);
  body.add(roundel);

  // Soft ground shadow.
  const shadow = new THREE.Mesh(
    CAR_GEO.shadow,
    new THREE.MeshBasicMaterial({
      map: SHADOW_TEX,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.07;
  shadow.scale.set(62, 40, 1);
  group.add(shadow);

  // Player underglow ring.
  let ring = null;
  if (spec.isPlayer) {
    ring = new THREE.Mesh(
      new THREE.RingGeometry(17, 21, 40),
      new THREE.MeshBasicMaterial({
        color: 0x3ae2ff,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    group.add(ring);
  }

  const model = {
    group,
    body,
    paint,
    accent,
    glass,
    tailMat,
    tailGlowMat,
    wheelGroups,
    roundel,
    roundelMat,
    ring,
    spec: { ...spec },
    styleKey: `${spec.color}|${spec.accent}|${spec.number}`,
  };
  applyCarStyle(model, spec, true);
  return model;
}

function applyCarStyle(model, spec, force = false) {
  const key = `${spec.color}|${spec.accent}|${spec.number}`;
  if (!force && model.styleKey === key) return;
  model.styleKey = key;
  model.paint.color.set(spec.color);
  model.accent.color.set(spec.accent);
  if (model.roundelMat.map) model.roundelMat.map.dispose();
  model.roundelMat.map = makeRoundelTexture(spec.number);
  model.roundelMat.needsUpdate = true;
  model.spec = { ...spec };
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

function ribbonGeometry(track, offsetA, offsetB, y, vScale = 150) {
  const N = track.N;
  const positions = [];
  const uvs = [];
  const indices = [];
  let distance = 0;

  for (let i = 0; i <= N; i++) {
    const index = i % N;
    const p = track.points[index];
    const n = track.normals[index];
    if (i > 0) {
      const prev = track.points[(i - 1) % N];
      distance += Math.hypot(p.x - prev.x, p.y - prev.y);
    }
    positions.push(p.x + n.x * offsetA, y, p.y + n.y * offsetA);
    positions.push(p.x + n.x * offsetB, y, p.y + n.y * offsetB);
    uvs.push(0, distance / vScale, 1, distance / vScale);
  }

  for (let i = 0; i < N; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function kerbGeometry(track, side, step = 4) {
  const W = track.width;
  const lo = Math.min(side * (W / 2 - 0.5), side * (W / 2 + 12.5));
  const hi = Math.max(side * (W / 2 - 0.5), side * (W / 2 + 12.5));
  const y = 0.12;
  const positions = [];
  const colors = [];
  const indices = [];

  const red = new THREE.Color(0xd4463f);
  const white = new THREE.Color(0xf1ecdf);
  let vertex = 0;

  for (let start = 0; start < track.N; start += step) {
    const color = Math.floor(start / step) % 2 === 0 ? red : white;
    const before = vertex;
    for (let k = 0; k <= step; k++) {
      const index = (start + k) % track.N;
      const p = track.points[index];
      const n = track.normals[index];
      positions.push(p.x + n.x * lo, y, p.y + n.y * lo);
      positions.push(p.x + n.x * hi, y, p.y + n.y * hi);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
      vertex += 2;
    }
    for (let k = 0; k < step; k++) {
      const a = before + k * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function wallGeometry(track, offset, height) {
  const N = track.N;
  const positions = [];
  const uvs = [];
  const indices = [];
  let distance = 0;

  for (let i = 0; i <= N; i++) {
    const index = i % N;
    const p = track.points[index];
    const n = track.normals[index];
    if (i > 0) {
      const prev = track.points[(i - 1) % N];
      distance += Math.hypot(p.x - prev.x, p.y - prev.y);
    }
    positions.push(p.x + n.x * offset, 0.15, p.y + n.y * offset);
    positions.push(p.x + n.x * offset, height, p.y + n.y * offset);
    uvs.push(distance / 90, 0, distance / 90, 1);
  }

  for (let i = 0; i < N; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function quadGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5],
      3
    )
  );
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

function makeInstanced(geometry, material, items) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const dummy = new THREE.Object3D();
  items.forEach((item, index) => {
    dummy.position.set(item.x, item.y || 0, item.z);
    dummy.rotation.set(0, item.rot || 0, 0);
    dummy.scale.set(item.sx || 1, item.sy || 1, item.sz || 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (item.color) mesh.setColorAt(index, item.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Main 3D world                                                       */
/* ------------------------------------------------------------------ */

export class Renderer3D {
  constructor(canvas, track, cars, ramps = null) {
    this.canvas = canvas;
    this.track = track;
    this.cars = cars;
    this.ramps = ramps;
    this.time = 0;
    this.skidCursor = 0;
    this.skidCount = 0;
    this.skidMax = 2200;
    this.skidLast = new Map();
    this.carModels = new Map();
    this.particleSprites = [];
    this.particleCursor = 0;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(FOG_COLOR, 950, 3000);

    this.camera = new THREE.PerspectiveCamera(58, 1, 1, 7500);
    this.camera.position.set(track.points[0].x, 120, track.points[0].y);

    this.glowTexture = GLOW_TEX;
    this.smokeTexture = this.makeSoftTexture();
    this.dustTexture = this.smokeTexture;

    this.buildSky();
    this.buildLights();
    this.buildGround();
    this.buildTrack();
    this.buildRamps();
    this.buildScenery();
    this.buildStart();
    this.buildCars(cars);
    this.buildSkids();
    this.buildParticlePool();

    this.viewW = 1;
    this.viewH = 1;
  }

  makeSoftTexture() {
    return makeTexture(96, 96, (g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(245, 250, 246, 0.62)');
      grad.addColorStop(0.45, 'rgba(230, 238, 234, 0.32)');
      grad.addColorStop(1, 'rgba(214, 224, 220, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    }, { clampEdge: true });
  }

  /* ------------------------------ world ----------------------------- */

  buildSky() {
    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(5200, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: new THREE.Color(SKY_TOP) },
          horizonColor: { value: new THREE.Color(SKY_HORIZON) },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorldPosition = world.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = clamp(vWorldPosition.y / 1500.0, 0.0, 1.0);
            vec3 color = mix(horizonColor, topColor, pow(h, 0.62));
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      })
    );
    sky.position.set(cx, 0, cz);
    sky.frustumCulled = false;
    this.scene.add(sky);
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xd9efff, 0x28452c, 1.55));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.5);
    sun.position.set(-620, 900, 420);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbfe3ff, 0.55);
    fill.position.set(500, 320, -640);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  }

  buildGround() {
    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;

    const outer = new THREE.Mesh(
      new THREE.PlaneGeometry(14000, 14000),
      new THREE.MeshStandardMaterial({ color: 0x1d4228, roughness: 1 })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(cx, -0.62, cz);
    this.scene.add(outer);

    const grassTexture = makeGrassTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.maxX - bounds.minX + 1100, bounds.maxY - bounds.minY + 1100),
      new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, -0.16, cz);
    this.scene.add(ground);
  }

  buildTrack() {
    const track = this.track;
    const W = track.width;

    // Shoulder beneath the asphalt.
    const shoulder = new THREE.Mesh(
      ribbonGeometry(track, -W / 2 - 16, W / 2 + 16, 0.02, 180),
      new THREE.MeshStandardMaterial({ color: 0x2f2b21, roughness: 0.98 })
    );
    shoulder.receiveShadow = false;
    this.scene.add(shoulder);

    // Road surface.
    const road = new THREE.Mesh(
      ribbonGeometry(track, -W / 2, W / 2, 0.08, 150),
      new THREE.MeshStandardMaterial({
        map: makeAsphaltTexture(),
        roughness: 0.94,
        metalness: 0.03,
      })
    );
    this.scene.add(road);

    // Edge lines.
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1eee2,
      roughness: 0.65,
      emissive: 0x2a2a22,
      emissiveIntensity: 0.25,
    });
    for (const side of [1, -1]) {
      const a = side * (W / 2 - 10.5);
      const b = side * (W / 2 - 6);
      this.scene.add(
        new THREE.Mesh(ribbonGeometry(track, Math.min(a, b), Math.max(a, b), 0.11, 90), lineMaterial)
      );
    }

    // Kerbs.
    const kerbMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
    });
    this.scene.add(new THREE.Mesh(kerbGeometry(track, 1), kerbMaterial));
    this.scene.add(new THREE.Mesh(kerbGeometry(track, -1), kerbMaterial));

    // Guardrails.
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0xa7b5b3,
      metalness: 0.62,
      roughness: 0.34,
      side: THREE.DoubleSide,
    });
    const railOffset = W / 2 + 26;
    const railHeight = 13;
    for (const side of [1, -1]) {
      this.scene.add(
        new THREE.Mesh(wallGeometry(track, side * railOffset, railHeight), railMaterial)
      );
      this.scene.add(
        new THREE.Mesh(
          ribbonGeometry(track, side * railOffset - 2.5, side * railOffset + 2.5, railHeight, 70),
          railMaterial
        )
      );
    }

    // Rail posts and reflectors.
    const posts = [];
    const reflectors = [];
    const postColor = new THREE.Color(0x3d4a49);
    const red = new THREE.Color(0xd44a42);
    const pale = new THREE.Color(0xe7e1d2);
    for (const side of [1, -1]) {
      for (let i = 0; i < track.N; i += 12) {
        const p = track.points[i];
        const n = track.normals[i];
        const t = track.tangents[i];
        const x = p.x + n.x * railOffset * side;
        const z = p.y + n.y * railOffset * side;
        posts.push({ x, z, rot: -Math.atan2(t.y, t.x), sx: 3, sy: 15, sz: 3, color: postColor });
        reflectors.push({
          x: x - n.x * 2.2 * side,
          z: z - n.y * 2.2 * side,
          y: railHeight - 2.4,
          rot: -Math.atan2(t.y, t.x),
          sx: 2.2,
          sy: 3.2,
          sz: 6.2,
          color: (i / 12) % 2 === 0 ? pale : red,
        });
      }
    }
    const postMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.25 }),
      posts
    );
    if (postMesh) this.scene.add(postMesh);
    const reflectorMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.4,
        emissive: 0x222222,
        emissiveIntensity: 0.4,
      }),
      reflectors
    );
    if (reflectorMesh) this.scene.add(reflectorMesh);

    // Painted grid boxes.
    const grid = [
      [72, -48],
      [72, 48],
      [132, -48],
      [132, 48],
    ];
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0xebe9dc,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    for (const [behind, lateral] of grid) {
      const slot = track.gridSlot(behind, lateral);
      const box = new THREE.Mesh(new THREE.PlaneGeometry(52, 40), gridMaterial);
      box.rotation.x = -Math.PI / 2;
      box.rotation.z = -slot.angle;
      box.position.set(slot.x, 0.1, slot.y);
      this.scene.add(box);
    }
  }

  buildRamps() {
    if (!this.ramps || !this.ramps.list.length) return;

    const deckMaterial = new THREE.MeshStandardMaterial({
      map: makeRampTexture(),
      roughness: 0.86,
      metalness: 0.05,
    });
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3034,
      roughness: 0.92,
      metalness: 0.08,
    });
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0c23a,
      emissive: 0xffa412,
      emissiveIntensity: 0.55,
      roughness: 0.45,
      metalness: 0.15,
    });
    const lipMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd75a,
      emissive: 0xff8c00,
      emissiveIntensity: 1.15,
      roughness: 0.38,
    });
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: 0xf2c53b,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    for (const ramp of this.ramps.list) {
      const group = new THREE.Group();
      group.position.set(ramp.x, 0.08, ramp.z);
      group.rotation.y = ramp.yaw;

      // Solid wedge: a right-triangle profile extruded across the track.
      const profile = new THREE.Shape();
      profile.moveTo(-ramp.halfL, 0);
      profile.lineTo(ramp.halfL, 0);
      profile.lineTo(ramp.halfL, ramp.height);
      profile.lineTo(-ramp.halfL, 0);
      const wedge = new THREE.Mesh(
        new THREE.ExtrudeGeometry(profile, { depth: ramp.width, bevelEnabled: false }),
        bodyMaterial
      );
      wedge.position.z = -ramp.halfW;
      group.add(wedge);

      // Textured deck, laid exactly along the slope.
      const slopeLength = Math.hypot(ramp.length, ramp.height);
      const deckPivot = new THREE.Group();
      deckPivot.position.y = ramp.height / 2 + 0.22;
      deckPivot.rotation.z = ramp.slope;
      const deck = new THREE.Mesh(
        new THREE.PlaneGeometry(slopeLength, ramp.width - 10),
        deckMaterial
      );
      deck.rotation.x = -Math.PI / 2;
      deckPivot.add(deck);
      group.add(deckPivot);

      // Glowing edge rails and lip bar make the launch line readable.
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(slopeLength, 5.5, 5.5),
          railMaterial
        );
        rail.position.set(0, ramp.height / 2 + 2.8, side * (ramp.halfW - 3));
        rail.rotation.z = ramp.slope;
        group.add(rail);
      }
      const lip = new THREE.Mesh(
        new THREE.BoxGeometry(6, 6, ramp.width),
        lipMaterial
      );
      lip.position.set(ramp.halfL - 1, ramp.height + 1.4, 0);
      group.add(lip);

      // Hazard bars on the run-up.
      for (const behind of [10, 26]) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(7, 0.45, ramp.width - 8),
          baseMaterial
        );
        bar.position.set(-ramp.halfL - behind, 0.05, 0);
        group.add(bar);
      }

      this.scene.add(group);
    }
  }

  buildStart() {
    const track = this.track;
    const W = track.width;
    const sp = track.points[0];
    const angle = track.startAngle;

    // Checker band.
    const checker = new THREE.Mesh(
      new THREE.PlaneGeometry(38, W),
      new THREE.MeshStandardMaterial({
        map: makeCheckerTexture(),
        roughness: 0.72,
        metalness: 0.02,
      })
    );
    checker.rotation.x = -Math.PI / 2;
    checker.rotation.z = -angle;
    checker.position.set(sp.x, 0.115, sp.y);
    this.scene.add(checker);

    // Overhead gantry.
    const gantry = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({
      color: 0x39484a,
      metalness: 0.55,
      roughness: 0.42,
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(8, 8, W + 124), metal);
    beam.position.y = 64;
    gantry.add(beam);
    for (const side of [1, -1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(6, 64, 6), metal);
      post.position.set(0, 32, side * (W / 2 + 59));
      gantry.add(post);
    }
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 110, 17),
      new THREE.MeshBasicMaterial({ map: makeBannerTexture(), side: THREE.DoubleSide })
    );
    banner.rotation.y = -Math.PI / 2;
    banner.position.set(-4.5, 51, 0);
    gantry.add(banner);
    gantry.position.set(sp.x, 0, sp.y);
    gantry.rotation.y = -angle;
    this.scene.add(gantry);

    // Starting lights on the gantry underside.
    const lightBox = new THREE.Mesh(
      new THREE.BoxGeometry(4, 6, 46),
      new THREE.MeshStandardMaterial({ color: 0x0c1113, roughness: 0.6 })
    );
    lightBox.position.set(0, 53, 0);
    gantry.add(lightBox);
    for (let i = -2; i <= 2; i++) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0x571512,
          emissive: 0xff2a1a,
          emissiveIntensity: 1.6,
          roughness: 0.3,
        })
      );
      lamp.position.set(-2.4, 53, i * 8);
      gantry.add(lamp);
    }
  }

  buildScenery() {
    const track = this.track;
    const W = track.width;
    const bounds = track.bounds;
    const rnd = mulberry32(424242);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minY + bounds.maxY) / 2;

    const trees = [];
    const bushes = [];
    const rocks = [];
    const tires = [];
    const placed = [];

    const sp = track.points[0];
    const sn = track.normals[0];
    const outward =
      (sp.x - centerX) * sn.x + (sp.y - centerZ) * sn.y > 0 ? 1 : -1;
    const standX = sp.x + sn.x * (W / 2 + 155) * outward;
    const standZ = sp.y + sn.y * (W / 2 + 155) * outward;

    const awayFromTrack = (x, z, pad) => track.nearest(x, z).dist > W / 2 + pad;
    const awayFromProps = (x, z, pad) => {
      for (const p of placed) {
        if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + pad) ** 2) return false;
      }
      return true;
    };

    let attempts = 0;
    while (placed.length < 190 && attempts < 3600) {
      attempts++;
      const x = 40 + rnd() * (bounds.maxX - bounds.minX + 220) - 110;
      const z = 40 + rnd() * (bounds.maxY - bounds.minY + 220) - 110;
      const roll = rnd();
      const radius = roll < 0.55 ? 16 + rnd() * 20 : 10 + rnd() * 12;
      if (!awayFromTrack(x, z, radius + 46)) continue;
      if (!awayFromProps(x, z, radius * 0.7 + 12)) continue;
      if ((x - standX) ** 2 + (z - standZ) ** 2 < 225 ** 2) continue;

      placed.push({ x, z, r: radius });

      if (roll < 0.55) {
        trees.push({
          x,
          z,
          r: radius,
          pine: rnd() < 0.24,
          tone: rnd(),
          height: 14 + rnd() * 16,
        });
      } else if (roll < 0.8) {
        bushes.push({ x, z, r: radius * 0.85, tone: rnd() });
      } else if (roll < 0.9) {
        tires.push({ x, z, r: radius * 0.55, rot: rnd() * TAU });
      } else {
        rocks.push({ x, z, r: radius * 0.6, tone: rnd() });
      }
    }

    // Dense forest border.
    for (let i = 0; i < 260; i++) {
      const side = i % 4;
      let x;
      let z;
      if (side === 0) {
        x = bounds.minX - 130 + rnd() * (bounds.maxX - bounds.minX + 260);
        z = bounds.minY - 120 + rnd() * 110;
      } else if (side === 1) {
        x = bounds.minX - 130 + rnd() * (bounds.maxX - bounds.minX + 260);
        z = bounds.maxY + 10 + rnd() * 110;
      } else if (side === 2) {
        x = bounds.minX - 120 + rnd() * 110;
        z = bounds.minY - 120 + rnd() * (bounds.maxY - bounds.minY + 240);
      } else {
        x = bounds.maxX + 10 + rnd() * 110;
        z = bounds.minY - 120 + rnd() * (bounds.maxY - bounds.minY + 240);
      }
      if (!awayFromTrack(x, z, 52)) continue;
      trees.push({
        x,
        z,
        r: 18 + rnd() * 22,
        pine: rnd() < 0.3,
        tone: rnd(),
        height: 16 + rnd() * 18,
      });
    }

    // Trees: trunks, broadleaf canopies, pine canopies.
    const trunkItems = [];
    const broadleaf = [];
    const pines = [];
    const broadleafColors = [0x2b6b38, 0x347c40, 0x256232, 0x3d8a46];
    const pineColors = [0x1f5730, 0x256638, 0x1a4c2a, 0x2d7440];
    for (const tree of trees) {
      const tone = tree.tone;
      trunkItems.push({
        x: tree.x,
        z: tree.z,
        y: 0,
        sx: tree.r * 0.9,
        sy: tree.height,
        sz: tree.r * 0.9,
      });
      if (tree.pine) {
        pines.push({
          x: tree.x,
          z: tree.z,
          y: tree.height * 0.62,
          sx: tree.r * 0.85,
          sy: tree.r * 1.25,
          sz: tree.r * 0.85,
          color: new THREE.Color(pineColors[Math.floor(tone * pineColors.length)]),
        });
      } else {
        broadleaf.push({
          x: tree.x,
          z: tree.z,
          y: tree.height + tree.r * 0.52,
          sx: tree.r,
          sy: tree.r * 0.82,
          sz: tree.r,
          color: new THREE.Color(broadleafColors[Math.floor(tone * broadleafColors.length)]),
        });
      }
    }

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const trunkMesh = makeInstanced(
      trunkGeo,
      new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.95 }),
      trunkItems
    );
    if (trunkMesh) this.scene.add(trunkMesh);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      flatShading: true,
    });
    const broadleafMesh = makeInstanced(new THREE.IcosahedronGeometry(1, 1), leafMat, broadleaf);
    if (broadleafMesh) this.scene.add(broadleafMesh);
    const pineMesh = makeInstanced(new THREE.ConeGeometry(1, 2.2, 8), leafMat, pines);
    if (pineMesh) this.scene.add(pineMesh);

    const bushItems = bushes.map((bush) => ({
      x: bush.x,
      z: bush.z,
      y: bush.r * 0.5,
      sx: bush.r,
      sy: bush.r * 0.7,
      sz: bush.r,
      color: new THREE.Color(
        [0x357b3d, 0x2c6c36, 0x408a48, 0x34733a][Math.floor(bush.tone * 4)]
      ),
    }));
    const bushMesh = makeInstanced(new THREE.IcosahedronGeometry(1, 0), leafMat, bushItems);
    if (bushMesh) this.scene.add(bushMesh);

    const rockItems = rocks.map((rock) => ({
      x: rock.x,
      z: rock.z,
      y: rock.r * 0.35,
      sx: rock.r,
      sy: rock.r * 0.8,
      sz: rock.r,
      rot: rock.tone * TAU,
      color: new THREE.Color(0x7b7f78),
    }));
    const rockMesh = makeInstanced(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }),
      rockItems
    );
    if (rockMesh) this.scene.add(rockMesh);

    const tireItems = [];
    for (const stack of tires) {
      for (let i = 0; i < 3; i++) {
        tireItems.push({
          x: stack.x,
          z: stack.z,
          y: 2 + i * 4.2,
          sx: stack.r * 0.9,
          sy: 4,
          sz: stack.r * 0.9,
          rot: stack.rot + i * 0.4,
        });
      }
    }
    const tireMesh = makeInstanced(
      new THREE.CylinderGeometry(1, 1, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0x171b1e, roughness: 0.92 }),
      tireItems
    );
    if (tireMesh) this.scene.add(tireMesh);

    this.buildGrandstand(standX, standZ, -Math.atan2(track.tangents[0].y, track.tangents[0].x));
    this.buildBillboards();
  }

  buildGrandstand(x, z, rotation) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x3b4547,
      roughness: 0.8,
      metalness: 0.1,
    });
    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x2c6d8f,
      roughness: 0.7,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xa9b6b4,
      roughness: 0.5,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(160, 12, 52), baseMat);
    base.position.y = 6;
    group.add(base);

    for (let row = 0; row < 5; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(150, 7, 10), seatMat);
      step.position.set(0, 12 + row * 6.4, 18 - row * 8);
      group.add(step);
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(170, 2.2, 62), roofMat);
    roof.position.set(0, 53, 2);
    roof.rotation.x = -0.06;
    group.add(roof);

    for (const px of [-72, 72]) {
      for (const pz of [-22, 24]) {
        const support = new THREE.Mesh(new THREE.BoxGeometry(3.4, 43, 3.4), baseMat);
        support.position.set(px, 30, pz);
        group.add(support);
      }
    }

    this.scene.add(group);
  }

  buildBillboards() {
    const track = this.track;
    const W = track.width;
    const boards = [
      { label: 'APEX', color: '#ff5a4f' },
      { label: 'TURBO', color: '#3ae2ff' },
      { label: 'NITRO', color: '#ffd24a' },
      { label: 'GRIP', color: '#a77bff' },
    ];

    let boardIndex = 0;
    for (let i = 40; i < track.N - 40 && boardIndex < boards.length; i += 23) {
      const curvature = Math.abs(track.curvature[i]);
      if (curvature > 0.0011) continue;
      if (!boards[boardIndex]) break;

      const board = boards[boardIndex++];
      const p = track.points[i];
      const n = track.normals[i];
      const t = track.tangents[i];
      const side = boardIndex % 2 === 0 ? 1 : -1;
      const offset = side * (W / 2 + 108);
      const group = new THREE.Group();
      group.position.set(p.x + n.x * offset, 0, p.y + n.y * offset);
      group.rotation.y = -Math.atan2(t.y, t.x) + (side > 0 ? Math.PI : 0);

      const postMat = new THREE.MeshStandardMaterial({
        color: 0x394446,
        roughness: 0.65,
        metalness: 0.4,
      });
      for (const pz of [-31, 31]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(3, 38, 3), postMat);
        post.position.set(0, 19, pz);
        group.add(post);
      }
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(88, 33),
        new THREE.MeshStandardMaterial({
          map: makeLabelTexture(board.label, board.color),
          roughness: 0.55,
          metalness: 0.1,
          side: THREE.DoubleSide,
          emissive: 0x111111,
          emissiveIntensity: 0.28,
        })
      );
      panel.position.y = 38;
      group.add(panel);
      this.scene.add(group);
    }
  }

  /* ------------------------------- cars ----------------------------- */

  buildCars(cars) {
    for (const car of cars) {
      const model = buildCarModel(car);
      model.group.position.set(car.pos.x, 0, car.pos.y);
      model.group.rotation.y = -car.angle;
      this.scene.add(model.group);
      this.carModels.set(car, model);
    }
  }

  setCarStyle(car) {
    const model = this.carModels.get(car);
    if (model) applyCarStyle(model, car);
  }

  /* ----------------------------- particles -------------------------- */

  buildParticlePool() {
    this.smokeSprites = [];
    this.sparkSprites = [];
    const add = (target, texture, blending, count) => {
      for (let i = 0; i < count; i++) {
        const material = new THREE.SpriteMaterial({
          map: texture,
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending,
        });
        const sprite = new THREE.Sprite(material);
        sprite.visible = false;
        sprite.frustumCulled = false;
        this.scene.add(sprite);
        target.push(sprite);
      }
    };
    add(this.smokeSprites, this.smokeTexture, THREE.NormalBlending, 240);
    add(this.sparkSprites, this.glowTexture, THREE.AdditiveBlending, 100);
    this.particleSprites = [...this.smokeSprites, ...this.sparkSprites];
  }

  updateParticles(particles) {
    for (const sprite of this.particleSprites) {
      sprite.visible = false;
    }
    let smokeIndex = 0;
    let sparkIndex = 0;

    for (const particle of particles) {
      if (particle.life <= 0) continue;
      const t = clamp(particle.life / particle.maxLife, 0, 1);

      if (particle.kind === 'spark') {
        if (sparkIndex >= this.sparkSprites.length) continue;
        const sprite = this.sparkSprites[sparkIndex++];
        sprite.material.color.set(0xffd27a);
        sprite.material.opacity = 0.95 * t;
        sprite.position.set(
          particle.x,
          (particle.height || 0) + 3.4 + (1 - t) * 6,
          particle.y
        );
        const size = 5 + (1 - t) * 4;
        sprite.scale.set(size, size, 1);
        sprite.visible = true;
        continue;
      }

      if (smokeIndex >= this.smokeSprites.length) continue;
      const sprite = this.smokeSprites[smokeIndex++];

      if (particle.kind === 'dust') {
        sprite.material.color.set(particle.tint === 'green' ? 0x7f9a62 : 0xbba97f);
        sprite.material.opacity = 0.4 * t;
        sprite.position.set(
          particle.x,
          (particle.height || 0) + 2 + (1 - t) * 4,
          particle.y
        );
        const size = particle.size * (1.35 - t * 0.4) * 2.2;
        sprite.scale.set(size, size, 1);
      } else {
        sprite.material.color.set(0xe8efec);
        sprite.material.opacity = 0.46 * t;
        sprite.position.set(particle.x, 4 + (1 - t) * 15, particle.y);
        const size = particle.size * (2.1 - t * 0.55) * 2.1;
        sprite.scale.set(size, size, 1);
      }
      sprite.visible = true;
    }
  }

  /* ------------------------------ skids ----------------------------- */

  buildSkids() {
    const material = new THREE.MeshBasicMaterial({
      color: 0x0c0f10,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(quadGeometry(), material, this.skidMax);
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.skidMesh = mesh;
    this.skidDummy = new THREE.Object3D();
  }

  clearSkids() {
    this.skidCursor = 0;
    this.skidCount = 0;
    this.skidLast.clear();
    if (this.skidMesh) this.skidMesh.count = 0;
  }

  laySkid(car) {
    if (!this.skidMesh) return;
    const last = this.skidLast.get(car);
    if (last) {
      const moved = Math.hypot(car.pos.x - last.x, car.pos.y - last.y);
      if (moved < 5.5) return;
    }
    this.skidLast.set(car, { x: car.pos.x, y: car.pos.y });

    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);
    const rearX = car.pos.x - cos * car.length * 0.24;
    const rearY = car.pos.y - sin * car.length * 0.24;
    const nx = -sin;
    const ny = cos;
    const spread = car.width * 0.38;
    const length = 9;

    for (const side of [-1, 1]) {
      const x = rearX + nx * spread * side;
      const z = rearY + ny * spread * side;
      this.skidDummy.position.set(x, 0.095, z);
      this.skidDummy.rotation.set(0, -car.angle, 0);
      this.skidDummy.scale.set(length, 1, 3.1);
      this.skidDummy.updateMatrix();
      this.skidMesh.setMatrixAt(this.skidCursor, this.skidDummy.matrix);
      this.skidCursor = (this.skidCursor + 1) % this.skidMax;
      this.skidCount = Math.min(this.skidCount + 1, this.skidMax);
    }
    this.skidMesh.count = this.skidCount;
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  /* ------------------------------ camera ---------------------------- */

  resize(width, height, dpr = 1) {
    this.viewW = Math.max(1, width);
    this.viewH = Math.max(1, height);
    this.dpr = dpr;
    this.renderer.setPixelRatio(Math.min(dpr || 1, 2));
    this.renderer.setSize(this.viewW, this.viewH, false);
    this.camera.aspect = this.viewW / this.viewH;
    this.camera.updateProjectionMatrix();
  }

  updateCamera(playerCar, state, camera) {
    const cam = this.camera;
    const track = this.track;

    if (state.mode === 'title') {
      const near = track.nearest(camera.x, camera.y);
      const t = track.tangents[near.index];
      const n = track.normals[near.index];
      const speed = 190;
      const back = 170;
      const height = 104;
      cam.position.set(
        camera.x - t.x * back + n.x * 28,
        height + Math.sin(this.time * 0.7) * 2.4,
        camera.y - t.y * back + n.y * 28
      );
      cam.lookAt(
        camera.x + t.x * speed,
        10,
        camera.y + t.y * speed
      );
      cam.fov = 56;
      cam.updateProjectionMatrix();
      return;
    }

    const speedRatio = clamp(playerCar.speed / playerCar.maxSpeed, 0, 1);
    const back = 158 + speedRatio * 38;
    const height = 92 + speedRatio * 10;
    const cos = Math.cos(playerCar.angle);
    const sin = Math.sin(playerCar.angle);
    const focusX = camera.x;
    const focusY = camera.y;
    const carY = playerCar.y || 0;

    cam.position.set(
      focusX - cos * back,
      height + carY * 0.55,
      focusY - sin * back
    );

    if (state.shake > 0.001) {
      const shake = state.shake * 9;
      cam.position.x += (Math.random() - 0.5) * shake;
      cam.position.y += (Math.random() - 0.5) * shake * 0.6;
      cam.position.z += (Math.random() - 0.5) * shake;
    }

    cam.lookAt(
      focusX + cos * 92,
      9 + carY * 0.85,
      focusY + sin * 92
    );

    const targetFov = 58 + speedRatio * 11;
    cam.fov += (targetFov - cam.fov) * 0.08;
    cam.updateProjectionMatrix();
  }

  updateCars(cars, state) {
    for (const car of cars) {
      const model = this.carModels.get(car);
      if (!model) continue;
      model.group.position.set(car.pos.x, car.y || 0, car.pos.y);
      model.group.rotation.y = -car.angle;
      model.group.rotation.z = car.pitch || 0;

      const bounce = car.bump * 1.6;
      model.body.position.y = bounce;
      const roll =
        clamp(-car.steerVisual * 0.05 - clamp(car.slip / 900, 0, 0.04), -0.075, 0.075);
      model.body.rotation.x = roll;
      model.body.rotation.z =
        clamp(car.input.brake * -0.038 + car.input.throttle * 0.016, -0.05, 0.03);

      for (const wheel of model.wheelGroups) {
        wheel.rotation.y = -car.steerVisual * 0.42;
      }

      const braking = car.braking;
      model.tailMat.emissiveIntensity = braking ? 4.4 : 1.05;
      model.tailGlowMat.opacity = braking ? 0.7 : 0.16;

      if (model.ring) {
        model.ring.material.opacity =
          0.2 + Math.sin(this.time * 3.4) * 0.05 + (car.isPlayer ? 0.04 : 0);
        model.ring.visible = state.mode !== 'title' || car.isPlayer;
      }
    }
  }

  render({ cars, playerCar, particles, state, camera, dt }) {
    this.time += dt || 0;
    this.updateCars(cars, state);
    this.updateCamera(playerCar, state, camera);
    this.updateParticles(particles || []);
    this.renderer.render(this.scene, this.camera);
  }
}

/* ------------------------------------------------------------------ */
/* Garage showcase                                                     */
/* ------------------------------------------------------------------ */

export class Garage3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = false;
    this.time = 0;
    this.spec = null;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600);
    this.camera.position.set(70, 34, 76);
    this.camera.lookAt(0, 10, 0);

    this.scene.add(new THREE.HemisphereLight(0xd8f2ff, 0x101a1c, 1.9));

    const key = new THREE.DirectionalLight(0xfff1d6, 3.1);
    key.position.set(70, 110, 60);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x6fe6ff, 1.2);
    fill.position.set(-90, 40, 40);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0xff5fd2, 120, 260);
    rim.position.set(-40, 30, -90);
    this.scene.add(rim);

    const cool = new THREE.PointLight(0x3ae2ff, 160, 280);
    cool.position.set(80, 26, -60);
    this.scene.add(cool);

    // Turntable.
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(56, 62, 5, 64),
      new THREE.MeshStandardMaterial({
        color: 0x111c1f,
        metalness: 0.72,
        roughness: 0.32,
      })
    );
    platform.position.y = -2.4;
    this.scene.add(platform);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(57, 0.9, 10, 96),
      new THREE.MeshBasicMaterial({
        color: 0x3ae2ff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    this.scene.add(ring);
    this.ring = ring;

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(48, 64),
      new THREE.MeshBasicMaterial({
        color: 0x0b5a66,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    this.scene.add(glow);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshBasicMaterial({ color: 0x050b0c })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5.1;
    this.scene.add(floor);

    this.holder = new THREE.Group();
    this.holder.position.y = 0.15;
    this.scene.add(this.holder);

    this.model = buildCarModel({
      id: 'preview',
      name: 'APEX',
      color: '#3ae2ff',
      accent: '#0b7f96',
      number: 1,
      isPlayer: true,
    });
    this.holder.add(this.model.group);
    this.model.group.rotation.y = -0.62;
  }

  setCar(spec) {
    this.spec = spec;
    if (!this.model) return;
    applyCarStyle(this.model, spec);
  }

  setActive(active) {
    this.active = active;
    if (active) this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (!width || !height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    if (!this.active) return;
    this.time += dt;
    if (this.model) {
      this.model.group.rotation.y = 0.72 + Math.sin(this.time * 0.34) * 0.7 + this.time * 0.12;
      this.model.body.position.y = Math.sin(this.time * 1.5) * 0.18;
      this.model.body.rotation.z = Math.sin(this.time * 1.1) * 0.006;
      if (this.model.ring) {
        this.model.ring.material.opacity = 0.2 + Math.sin(this.time * 3) * 0.05;
      }
    }
    if (this.ring) this.ring.material.opacity = 0.66 + Math.sin(this.time * 2.1) * 0.18;
    this.renderer.render(this.scene, this.camera);
  }
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */
