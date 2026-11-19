import * as THREE from './vendor/three.module.js';
import { clamp, mod, mulberry32 } from './utils.js';
import { getLocation } from './locations.js';

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

function makeSnowTexture() {
  const rnd = mulberry32(4417);
  return makeTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#dfeaf5';
    g.fillRect(0, 0, w, h);

    // Soft blue drifts.
    for (let i = 0; i < 14; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 24 + rnd() * 70;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rnd() < 0.5 ? 'rgba(106, 148, 184, 0.2)' : 'rgba(255, 255, 255, 0.24)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    // Wind-groomed ridges.
    g.strokeStyle = 'rgba(126, 162, 192, 0.18)';
    g.lineWidth = 1;
    for (let i = -2; i < 12; i++) {
      g.beginPath();
      g.moveTo(-20, i * 26 + rnd() * 8);
      g.bezierCurveTo(w * 0.3, i * 26 - 9, w * 0.66, i * 26 + 13, w + 20, i * 26 - 3);
      g.stroke();
    }

    // Ice crystals.
    for (let i = 0; i < 1200; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      g.fillStyle = rnd() < 0.5 ? 'rgba(255, 255, 255, 0.72)' : 'rgba(126, 169, 209, 0.34)';
      const s = 0.5 + rnd() * 1.5;
      g.fillRect(x, y, s, s);
    }
  }, { repeat: [31, 25] });
}

function makeSandTexture() {
  const rnd = mulberry32(7741);
  return makeTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#c98a57';
    g.fillRect(0, 0, w, h);

    // Layered sandstone bands.
    for (let i = 0; i < 10; i++) {
      const y = rnd() * h;
      g.fillStyle = rnd() < 0.5 ? 'rgba(112, 58, 31, 0.11)' : 'rgba(248, 198, 143, 0.14)';
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) {
        g.lineTo(x, y + Math.sin(x * 0.05 + i) * 4 + (rnd() - 0.5) * 3);
      }
      g.lineTo(w, y + 18);
      g.lineTo(0, y + 18);
      g.closePath();
      g.fill();
    }

    // Pebbles and grit.
    for (let i = 0; i < 1900; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const v = rnd();
      g.fillStyle = v < 0.45
        ? 'rgba(104, 54, 29, 0.4)'
        : v < 0.86
          ? 'rgba(238, 183, 126, 0.34)'
          : 'rgba(255, 226, 183, 0.28)';
      const s = 0.6 + rnd() * 2;
      g.fillRect(x, y, s, s);
    }
  }, { repeat: [34, 27] });
}

function makeCityGroundTexture() {
  const rnd = mulberry32(6613);
  return makeTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#222a33';
    g.fillRect(0, 0, w, h);

    // Concrete panels.
    g.strokeStyle = 'rgba(9, 13, 18, 0.5)';
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const p = (i * w) / 4;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, h);
      g.stroke();
      g.beginPath();
      g.moveTo(0, p);
      g.lineTo(w, p);
      g.stroke();
    }

    // Wet stains and neon reflections.
    for (let i = 0; i < 16; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 12 + rnd() * 42;
      const neon = rnd() < 0.5 ? [57, 244, 255] : [255, 79, 216];
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${neon[0]}, ${neon[1]}, ${neon[2]}, 0.14)`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    for (let i = 0; i < 2400; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const v = rnd();
      g.fillStyle = v < 0.55 ? 'rgba(8, 12, 18, 0.28)' : 'rgba(135, 153, 173, 0.14)';
      const s = 0.5 + rnd() * 1.6;
      g.fillRect(x, y, s, s);
    }
  }, { repeat: [36, 29] });
}

function makeCandyTexture() {
  const rnd = mulberry32(3121);
  return makeTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#fbe6f2';
    g.fillRect(0, 0, w, h);

    // Frosting swirls.
    for (let i = 0; i < 12; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 18 + rnd() * 46;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rnd() < 0.5 ? 'rgba(255, 176, 220, 0.34)' : 'rgba(255, 255, 255, 0.4)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    // Pink piping stripes.
    g.strokeStyle = 'rgba(255, 143, 203, 0.28)';
    g.lineWidth = 2;
    for (let i = -1; i < 7; i++) {
      g.beginPath();
      for (let x = -20; x <= w + 20; x += 8) {
        const y = i * 42 + Math.sin(x * 0.05 + i) * 7;
        if (x === -20) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }

    // Sprinkles.
    const palette = ['#ff6fb6', '#ffd54a', '#6fe8ff', '#a6ff7a', '#ff8f5c', '#ffffff'];
    for (let i = 0; i < 900; i++) {
      g.save();
      g.translate(rnd() * w, rnd() * h);
      g.rotate(rnd() * Math.PI);
      g.fillStyle = palette[Math.floor(rnd() * palette.length)];
      g.globalAlpha = 0.35 + rnd() * 0.45;
      g.fillRect(-2.5, -0.8, 5, 1.6);
      g.restore();
    }
    g.globalAlpha = 1;
  }, { repeat: [30, 25] });
}

function makeHauntTexture() {
  const rnd = mulberry32(6619);
  return makeTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#2c2838';
    g.fillRect(0, 0, w, h);

    // Cracked flagstones.
    g.strokeStyle = 'rgba(8, 7, 13, 0.48)';
    g.lineWidth = 2;
    for (let row = 0; row < 6; row++) {
      const y = (row * h) / 6;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
      const offset = row % 2 ? 0 : w / 10;
      for (let col = 0; col <= 5; col++) {
        const x = (col * w) / 5 + offset;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + h / 6);
        g.stroke();
      }
    }

    // Moss, damp patches and old leaves.
    for (let i = 0; i < 18; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 10 + rnd() * 38;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rnd() < 0.5 ? 'rgba(87, 120, 76, 0.18)' : 'rgba(70, 56, 92, 0.22)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(15, 12, 20, 0.3)' : 'rgba(140, 128, 162, 0.14)';
      const s = 0.6 + rnd() * 1.9;
      g.fillRect(rnd() * w, rnd() * h, s, s);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(115, 94, 58, 0.34)' : 'rgba(74, 86, 58, 0.3)';
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 3.4, 1 + rnd() * 2, rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat: [32, 27] });
}

function makeWindowTexture() {
  const rnd = mulberry32(9981);
  return makeTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#070b14';
    g.fillRect(0, 0, w, h);

    const cols = 6;
    const rows = 13;
    const cw = w / cols;
    const ch = h / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const lit = rnd();
        if (lit < 0.32) {
          const palette = ['#7fe8ff', '#ff6ad5', '#ffd58a', '#9ea8ff'];
          g.fillStyle = palette[Math.floor(rnd() * palette.length)];
          g.globalAlpha = 0.28 + rnd() * 0.5;
          g.fillRect(col * cw + 3, row * ch + 3, cw - 6, ch - 7);
        } else if (lit < 0.5) {
          g.fillStyle = 'rgba(122, 148, 190, 0.16)';
          g.fillRect(col * cw + 3, row * ch + 3, cw - 6, ch - 7);
        }
      }
    }
    g.globalAlpha = 1;

    // Vertical structure.
    g.fillStyle = 'rgba(3, 6, 11, 0.72)';
    for (let col = 0; col <= cols; col++) {
      g.fillRect(col * cw - 1, 0, 3, h);
    }
  }, { repeat: [1, 1] });
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

  // Soft additive underglow plane, just above the road. It sits inside the
  // car group so it tilts with the chassis on ramps and banked curves.
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.isPlayer ? 92 : 70, spec.isPlayer ? 54 : 42),
    new THREE.MeshBasicMaterial({
      map: GLOW_TEX,
      color: spec.color,
      transparent: true,
      opacity: spec.isPlayer ? 0.5 : 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.renderOrder = 2;
  group.add(ring);

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
  if (model.ring) model.ring.material.color.set(spec.color);
  if (model.roundelMat.map) model.roundelMat.map.dispose();
  model.roundelMat.map = makeRoundelTexture(spec.number);
  model.roundelMat.needsUpdate = true;
  model.spec = { ...spec };
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

function profileY(track, features, index, offset, baseY) {
  if (!features) return baseY;
  const half = Math.max(1, track.width / 2);
  const lateral = clamp(offset / half, -1, 1);
  return baseY + features.heightAtIndex(index) + features.bankAtIndex(index) * lateral;
}

function ribbonGeometry(track, offsetA, offsetB, y, vScale = 150, features = null) {
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
    positions.push(
      p.x + n.x * offsetA,
      profileY(track, features, index, offsetA, y),
      p.y + n.y * offsetA
    );
    positions.push(
      p.x + n.x * offsetB,
      profileY(track, features, index, offsetB, y),
      p.y + n.y * offsetB
    );
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

function kerbGeometry(track, side, step = 4, features = null) {
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
      positions.push(
        p.x + n.x * lo,
        profileY(track, features, index, lo, y),
        p.y + n.y * lo
      );
      positions.push(
        p.x + n.x * hi,
        profileY(track, features, index, hi, y),
        p.y + n.y * hi
      );
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

function wallGeometry(track, offset, height, features = null) {
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
    const base = profileY(track, features, index, offset, 0.15);
    positions.push(p.x + n.x * offset, base, p.y + n.y * offset);
    positions.push(p.x + n.x * offset, base + height, p.y + n.y * offset);
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
/* Post-processing                                                     */
/* ------------------------------------------------------------------ */

const FULLSCREEN_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAG = `
  uniform sampler2D tScene;
  uniform float threshold;
  uniform float knee;
  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(tScene, vUv).rgb;
    float brightness = max(color.r, max(color.g, color.b));
    float weight = smoothstep(threshold, threshold + knee, brightness);
    gl_FragColor = vec4(color * weight, 1.0);
  }
`;

const BLUR_FRAG = `
  uniform sampler2D tInput;
  uniform vec2 direction;
  varying vec2 vUv;

  void main() {
    vec3 sum = texture2D(tInput, vUv).rgb * 0.2270270270;
    sum += (texture2D(tInput, vUv + direction).rgb + texture2D(tInput, vUv - direction).rgb) * 0.1945945946;
    sum += (texture2D(tInput, vUv + direction * 2.0).rgb + texture2D(tInput, vUv - direction * 2.0).rgb) * 0.1216216216;
    sum += (texture2D(tInput, vUv + direction * 3.0).rgb + texture2D(tInput, vUv - direction * 3.0).rgb) * 0.0540540541;
    sum += (texture2D(tInput, vUv + direction * 4.0).rgb + texture2D(tInput, vUv - direction * 4.0).rgb) * 0.0162162162;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const COMPOSITE_FRAG = `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform vec2 sceneTexel;
  uniform float exposure;
  uniform float bloomStrength;
  uniform float blurPixels;
  varying vec2 vUv;

  vec3 apexRRTAndODTFit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }

  vec3 acesFilm(vec3 color) {
    const mat3 inputMat = mat3(
      vec3(0.59719, 0.07600, 0.02840),
      vec3(0.35458, 0.90834, 0.13383),
      vec3(0.04823, 0.01566, 0.83777)
    );
    const mat3 outputMat = mat3(
      vec3(1.60475, -0.10208, -0.00327),
      vec3(-0.53108, 1.10813, -0.07276),
      vec3(-0.07367, -0.00605, 1.07602)
    );
    color *= exposure / 0.6;
    color = inputMat * color;
    color = apexRRTAndODTFit(color);
    color = outputMat * color;
    return clamp(color, 0.0, 1.0);
  }

  vec3 linearToSRGB(vec3 color) {
    vec3 low = color * 12.92;
    vec3 high = pow(max(color, vec3(0.0)), vec3(0.41666)) * 1.055 - 0.055;
    return mix(high, low, vec3(lessThanEqual(color, vec3(0.0031308))));
  }

  void main() {
    vec2 o = sceneTexel * blurPixels;
    vec3 color = texture2D(tScene, vUv).rgb * 0.36;
    color += texture2D(tScene, vUv + vec2(o.x, 0.0)).rgb * 0.16;
    color += texture2D(tScene, vUv - vec2(o.x, 0.0)).rgb * 0.16;
    color += texture2D(tScene, vUv + vec2(0.0, o.y)).rgb * 0.16;
    color += texture2D(tScene, vUv - vec2(0.0, o.y)).rgb * 0.16;
    color += texture2D(tBloom, vUv).rgb * bloomStrength;
    color = acesFilm(color);
    gl_FragColor = vec4(linearToSRGB(color), 1.0);
  }
`;

class WorldPostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.exposure = 1.1;
    this.bloomStrength = 1;
    this.blurPixels = 1.25;

    const canFloat =
      renderer.capabilities.isWebGL2 &&
      (renderer.extensions.has('EXT_color_buffer_float') ||
        renderer.extensions.has('EXT_color_buffer_half_float'));
    this.bufferType = canFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;

    const targetOptions = {
      type: this.bufferType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    };
    this.sceneTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
    this.brightTarget = new THREE.WebGLRenderTarget(1, 1, {
      ...targetOptions,
      depthBuffer: false,
    });
    this.blurTargetA = new THREE.WebGLRenderTarget(1, 1, {
      ...targetOptions,
      depthBuffer: false,
    });
    this.blurTargetB = new THREE.WebGLRenderTarget(1, 1, {
      ...targetOptions,
      depthBuffer: false,
    });

    this.fxScene = new THREE.Scene();
    this.fxCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.fxScene.add(this.quad);

    const base = {
      vertexShader: FULLSCREEN_VERT,
      depthTest: false,
      depthWrite: false,
    };

    this.brightMaterial = new THREE.ShaderMaterial({
      ...base,
      uniforms: {
        tScene: { value: null },
        threshold: { value: 0.8 },
        knee: { value: 0.22 },
      },
      fragmentShader: BRIGHT_FRAG,
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      ...base,
      uniforms: {
        tInput: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
      },
      fragmentShader: BLUR_FRAG,
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      ...base,
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        sceneTexel: { value: new THREE.Vector2(1, 1) },
        exposure: { value: this.exposure },
        bloomStrength: { value: this.bloomStrength },
        blurPixels: { value: this.blurPixels },
      },
      fragmentShader: COMPOSITE_FRAG,
    });

    this.blurRadius = 1.15;
    this.bloomTexel = new THREE.Vector2(1, 1);
    this.enabled = true;

    for (const target of [this.sceneTarget, this.brightTarget, this.blurTargetA, this.blurTargetB]) {
      target.texture.generateMipmaps = false;
    }
  }

  setSize(width, height, pixelRatio) {
    const w = Math.max(1, Math.floor(width * pixelRatio));
    const h = Math.max(1, Math.floor(height * pixelRatio));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;

    this.sceneTarget.setSize(w, h);
    const bw = Math.max(1, Math.floor(w / 4));
    const bh = Math.max(1, Math.floor(h / 4));
    this.bloomWidth = bw;
    this.bloomHeight = bh;
    this.brightTarget.setSize(bw, bh);
    this.blurTargetA.setSize(bw, bh);
    this.blurTargetB.setSize(bw, bh);
    this.compositeMaterial.uniforms.sceneTexel.value.set(1 / w, 1 / h);
    this.bloomTexel.set(1 / bw, 1 / bh);
  }

  setLook(look) {
    this.exposure = look.exposure ?? 1.1;
    this.bloomStrength = look.bloomStrength ?? 1;
    this.blurPixels = look.blurPixels ?? 1.25;
    this.blurRadius = look.blurRadius ?? 1.15;
    this.brightMaterial.uniforms.threshold.value = look.threshold ?? 0.8;
    this.brightMaterial.uniforms.knee.value = look.knee ?? 0.22;
    this.compositeMaterial.uniforms.exposure.value = this.exposure;
    this.compositeMaterial.uniforms.bloomStrength.value = this.bloomStrength;
    this.compositeMaterial.uniforms.blurPixels.value = this.blurPixels;
  }

  render(scene, camera) {
    const renderer = this.renderer;

    renderer.setRenderTarget(this.sceneTarget);
    renderer.clear();
    renderer.render(scene, camera);

    // Bright pass at quarter resolution.
    this.quad.material = this.brightMaterial;
    this.brightMaterial.uniforms.tScene.value = this.sceneTarget.texture;
    renderer.setRenderTarget(this.brightTarget);
    renderer.render(this.fxScene, this.fxCamera);

    // Two separable gaussian passes give a wide, soft bloom at low cost.
    this.quad.material = this.blurMaterial;
    let source = this.brightTarget;
    let destination = this.blurTargetA;
    for (let pass = 0; pass < 2; pass++) {
      this.blurMaterial.uniforms.tInput.value = source.texture;
      this.blurMaterial.uniforms.direction.value.set(
        this.bloomTexel.x * this.blurRadius,
        0
      );
      renderer.setRenderTarget(destination);
      renderer.render(this.fxScene, this.fxCamera);

      this.blurMaterial.uniforms.tInput.value = destination.texture;
      this.blurMaterial.uniforms.direction.value.set(
        0,
        this.bloomTexel.y * this.blurRadius
      );
      renderer.setRenderTarget(source);
      renderer.render(this.fxScene, this.fxCamera);
    }

    this.quad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.tScene.value = this.sceneTarget.texture;
    this.compositeMaterial.uniforms.tBloom.value = source.texture;
    renderer.setRenderTarget(null);
    renderer.render(this.fxScene, this.fxCamera);
  }
}

/* ------------------------------------------------------------------ */
/* Main 3D world                                                       */
/* ------------------------------------------------------------------ */

export class Renderer3D {
  constructor(canvas, track, cars, ramps = null, features = null) {
    this.canvas = canvas;
    this.track = track;
    this.cars = cars;
    this.ramps = ramps;
    this.features = features;
    this.hazards = [];
    this.hazardMeshes = [];
    this.garageMeshes = [];
    this.camSmooth = new THREE.Vector3();
    this.lookSmooth = new THREE.Vector3();
    this.camGoal = new THREE.Vector3();
    this.lookGoal = new THREE.Vector3();
    this.camMode = null;
    this.camReady = false;
    this.time = 0;
    this.skidCursor = 0;
    this.skidCount = 0;
    this.skidMax = 2200;
    this.skidLast = new Map();
    this.carModels = new Map();
    this.particleSprites = [];
    this.particleCursor = 0;
    this.location = getLocation('ridge');
    this.theme = {};
    this.groundMaps = {
      grass: makeGrassTexture(),
      snow: makeSnowTexture(),
      sand: makeSandTexture(),
      city: makeCityGroundTexture(),
      candy: makeCandyTexture(),
      haunt: makeHauntTexture(),
    };
    this.scenery = null;
    this.sceneryPalettes = {
      candy: {
        broadleaf: [0xff8fcb, 0xffd0e8, 0xff6fb6, 0xffe3f0],
        pine: [0xff7ac0, 0xffb3e0, 0xff5cae, 0xffd9ef],
        bush: [0xff9ad4, 0xffc4e6, 0xff6fb6, 0xffe6f6],
      },
      haunt: {
        broadleaf: [0x574d68, 0x463e56, 0x635876, 0x3a3347],
        pine: [0x3b3448, 0x4a4258, 0x322c3e, 0x554b66],
        bush: [0x4a4356, 0x3d3648, 0x5a516e, 0x463e52],
      },
    };

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

    // Custom post chain: HDR scene target -> bright pass -> blur -> composite.
    this.postfx = new WorldPostFX(renderer);

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
    this.buildFeatures();
    this.buildRamps();
    this.buildScenery();
    this.buildLocationDecor();
    this.buildAtmosphere();
    this.buildStart();
    this.buildCars(cars);
    this.buildSkids();
    this.buildParticlePool();

    this.viewW = 1;
    this.viewH = 1;
    this.setLocation(this.location);
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

  /**
   * Swap the live circuit without throwing away the renderer or post chain.
   * Every track-dependent mesh is rebuilt into a fresh scene; persistent
   * resources (ground textures, car geometry, glow sprites) are retained.
   */
  setTrack(track, ramps = this.ramps, features = this.features) {
    if (!track) return;
    if (track === this.track && ramps === this.ramps && features === this.features) return;

    const oldScene = this.scene;
    this.track = track;
    this.ramps = ramps;
    this.features = features;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(FOG_COLOR, 950, 3000);
    this.theme = {};
    this.scenery = null;
    this.garageMeshes = [];
    this.hazards = [];
    this.hazardMeshes = [];
    this.carModels.clear();
    this.particleSprites = [];
    this.particleCursor = 0;
    this.skidLast.clear();
    this.skidCursor = 0;
    this.skidCount = 0;
    this.camReady = false;

    this.buildSky();
    this.buildLights();
    this.buildGround();
    this.buildTrack();
    this.buildFeatures();
    this.buildRamps();
    this.buildScenery();
    this.buildLocationDecor();
    this.buildAtmosphere();
    this.buildStart();
    this.buildCars(this.cars);
    this.buildSkids();
    this.buildParticlePool();
    this.setLocation(this.location);
    this.camera.position.set(track.points[0].x, 120, track.points[0].y);
    this.disposeScene(oldScene);
  }

  disposeScene(scene) {
    if (!scene) return;
    const keepGeometry = new Set(Object.values(CAR_GEO));
    const keepTextures = new Set([
      GLOW_TEX,
      SHADOW_TEX,
      this.smokeTexture,
      this.dustTexture,
      ...Object.values(this.groundMaps),
    ]);
    const seenMaterials = new Set();
    scene.traverse((object) => {
      if (object.geometry && !keepGeometry.has(object.geometry)) {
        object.geometry.dispose();
      }
      const materials = Array.isArray(object.material)
        ? object.material
        : object.material
          ? [object.material]
          : [];
      for (const material of materials) {
        if (!material || seenMaterials.has(material)) continue;
        seenMaterials.add(material);
        for (const key of ['map', 'emissiveMap', 'alphaMap', 'bumpMap']) {
          const texture = material[key];
          if (texture && !keepTextures.has(texture)) texture.dispose();
        }
        material.dispose();
      }
    });
  }


  /* ------------------------------ world ----------------------------- */

  buildSky() {
    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;
    this.skyMat = new THREE.ShaderMaterial({
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
    });
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(5200, 32, 16),
      this.skyMat
    );
    sky.position.set(cx, 0, cz);
    sky.frustumCulled = false;
    this.scene.add(sky);
  }

  buildLights() {
    this.hemiLight = new THREE.HemisphereLight(0xd9efff, 0x28452c, 1.55);
    this.scene.add(this.hemiLight);
    this.sunLight = new THREE.DirectionalLight(0xfff0d0, 2.5);
    this.sunLight.position.set(-620, 900, 420);
    this.scene.add(this.sunLight);
    this.fillLight = new THREE.DirectionalLight(0xbfe3ff, 0.55);
    this.fillLight.position.set(500, 320, -640);
    this.scene.add(this.fillLight);
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    this.scene.add(this.ambientLight);
  }

  buildGround() {
    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;

    this.theme.outerGround = new THREE.MeshStandardMaterial({
      color: 0x1d4228,
      roughness: 1,
    });
    const outer = new THREE.Mesh(
      new THREE.PlaneGeometry(26000, 26000),
      this.theme.outerGround
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(cx, -0.62, cz);
    this.scene.add(outer);

    this.theme.ground = new THREE.MeshStandardMaterial({
      map: this.groundMaps.grass,
      roughness: 1,
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.maxX - bounds.minX + 1100, bounds.maxY - bounds.minY + 1100),
      this.theme.ground
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, -0.16, cz);
    this.scene.add(ground);
  }

  buildTrack() {
    const track = this.track;
    const W = track.width;

    // Shoulder beneath the asphalt.
    this.theme.shoulder = new THREE.MeshStandardMaterial({
      color: 0x2f2b21,
      roughness: 0.98,
    });
    const shoulder = new THREE.Mesh(
      ribbonGeometry(track, -W / 2 - 16, W / 2 + 16, 0.02, 180, this.features),
      this.theme.shoulder
    );
    shoulder.receiveShadow = false;
    this.scene.add(shoulder);

    // Road surface.
    this.theme.road = new THREE.MeshStandardMaterial({
      map: makeAsphaltTexture(),
      roughness: 0.94,
      metalness: 0.03,
    });
    const road = new THREE.Mesh(
      ribbonGeometry(track, -W / 2, W / 2, 0.08, 150, this.features),
      this.theme.road
    );
    this.scene.add(road);

    // Edge lines.
    this.theme.line = new THREE.MeshStandardMaterial({
      color: 0xf1eee2,
      roughness: 0.65,
      emissive: 0x2a2a22,
      emissiveIntensity: 0.25,
    });
    const lineMaterial = this.theme.line;
    for (const side of [1, -1]) {
      const a = side * (W / 2 - 10.5);
      const b = side * (W / 2 - 6);
      this.scene.add(
        new THREE.Mesh(ribbonGeometry(track, Math.min(a, b), Math.max(a, b), 0.11, 90, this.features), lineMaterial)
      );
    }

    // Kerbs.
    this.theme.kerb = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
    });
    const kerbMaterial = this.theme.kerb;
    this.scene.add(new THREE.Mesh(kerbGeometry(track, 1, 4, this.features), kerbMaterial));
    this.scene.add(new THREE.Mesh(kerbGeometry(track, -1, 4, this.features), kerbMaterial));

    // Guardrails.
    this.theme.rail = new THREE.MeshStandardMaterial({
      color: 0xa7b5b3,
      metalness: 0.62,
      roughness: 0.34,
      side: THREE.DoubleSide,
    });
    const railMaterial = this.theme.rail;
    const railOffset = W / 2 + 26;
    const railHeight = 13;
    for (const side of [1, -1]) {
      this.scene.add(
        new THREE.Mesh(wallGeometry(track, side * railOffset, railHeight, this.features), railMaterial)
      );
      this.scene.add(
        new THREE.Mesh(
          ribbonGeometry(track, side * railOffset - 2.5, side * railOffset + 2.5, railHeight, 70, this.features),
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
        const base = this.features ? this.features.heightAtIndex(i) : 0;
        posts.push({ x, z, y: base, rot: -Math.atan2(t.y, t.x), sx: 3, sy: 15, sz: 3, color: postColor });
        reflectors.push({
          x: x - n.x * 2.2 * side,
          z: z - n.y * 2.2 * side,
          y: base + railHeight - 2.4,
          rot: -Math.atan2(t.y, t.x),
          sx: 2.2,
          sy: 3.2,
          sz: 6.2,
          color: (i / 12) % 2 === 0 ? pale : red,
        });
      }
    }
    this.theme.post = new THREE.MeshStandardMaterial({
      color: 0x3d4a49,
      roughness: 0.72,
      metalness: 0.25,
    });
    const postMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      this.theme.post,
      posts
    );
    if (postMesh) this.scene.add(postMesh);
    this.theme.reflector = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: 0x222222,
      emissiveIntensity: 0.4,
    });
    const reflectorMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      this.theme.reflector,
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

  buildFeatures() {
    this.garageMeshes = [];
    const list = this.features?.list || [];
    if (!list.length) return;

    const track = this.track;
    const W = track.width;
    this.theme.featureSolid = new THREE.MeshStandardMaterial({
      color: 0x313b40,
      roughness: 0.82,
      metalness: 0.12,
    });
    this.theme.featureGlow = new THREE.MeshStandardMaterial({
      color: 0x8ff6ff,
      emissive: 0x39d8ff,
      emissiveIntensity: 0.85,
      roughness: 0.42,
      metalness: 0.2,
    });
    this.theme.featureGlass = new THREE.MeshStandardMaterial({
      color: 0xbfe8e6,
      emissive: 0x2ea7b8,
      emissiveIntensity: 0.26,
      transparent: true,
      opacity: 0.72,
      roughness: 0.25,
      metalness: 0.18,
      side: THREE.DoubleSide,
    });
    // A dimmer accent for the large structures. The thin rails keep the
    // brighter glow, but roofs and lintels must not bloom into white slabs.
    this.theme.featureTrim = new THREE.MeshStandardMaterial({
      color: 0x9fffe8,
      emissive: 0x2ea7b8,
      emissiveIntensity: 0.24,
      roughness: 0.46,
      metalness: 0.32,
    });

    const solid = this.theme.featureSolid;
    const glow = this.theme.featureGlow;
    const trim = this.theme.featureTrim;
    const pillars = [];
    const rails = [];
    const chevrons = [];
    const barriers = [];
    const garageGroups = [];

    for (const f of list) {
      if (f.type === 'dip') {
        // The trough sits above the world plane; short retaining walls close
        // the gap between the raised approach and the ground on both sides.
        for (let k = 0; k < f.length; k += 2) {
          const idx = mod(f.start + k, track.N);
          const p = track.points[idx];
          const n = track.normals[idx];
          const t = track.tangents[idx];
          const y = this.features.heightAtIndex(idx);
          if (y < 1.2) continue;
          for (const side of [-1, 1]) {
            pillars.push({
              x: p.x + n.x * side * (W / 2 + 15),
              z: p.y + n.y * side * (W / 2 + 15),
              y: y / 2,
              sx: 6,
              sy: y,
              sz: Math.max(8, track.ds * 2.6),
              rot: -Math.atan2(t.y, t.x),
            });
          }
        }
        for (const end of [1, f.length - 2]) {
          const idx = mod(f.start + end, track.N);
          const p = track.points[idx];
          const t = track.tangents[idx];
          chevrons.push({
            x: p.x,
            z: p.y,
            y: this.features.heightAtIndex(idx) + 0.5,
            sx: W - 12,
            sy: 0.7,
            sz: 7,
            rot: -Math.atan2(t.y, t.x),
          });
        }
      } else if (f.type === 'bridge') {
        // Support pillars under the elevated deck.
        for (let k = 4; k < f.length - 3; k += 7) {
          const idx = mod(f.start + k, track.N);
          const p = track.points[idx];
          const n = track.normals[idx];
          const t = track.tangents[idx];
          const deck = this.features.heightAtIndex(idx);
          for (const side of [-1, 1]) {
            pillars.push({
              x: p.x + n.x * side * (W / 2 - 16),
              z: p.y + n.y * side * (W / 2 - 16),
              y: deck / 2,
              sx: 11,
              sy: Math.max(4, deck),
              sz: 11,
              rot: -Math.atan2(t.y, t.x),
            });
          }
        }
        for (const end of [2, f.length - 3]) {
          const idx = mod(f.start + end, track.N);
          const p = track.points[idx];
          const n = track.normals[idx];
          const t = track.tangents[idx];
          for (const side of [-1, 1]) {
            rails.push({
              x: p.x + n.x * side * (W / 2 + 5),
              z: p.y + n.y * side * (W / 2 + 5),
              y: this.features.heightAtIndex(idx) + 14,
              sx: 7,
              sy: 8,
              sz: 16,
              rot: -Math.atan2(t.y, t.x),
            });
          }
        }
      } else if (f.type === 'bank') {
        // Support wall under the raised outside edge, then bright chevrons
        // sitting on top of it.
        for (let k = 0; k < f.length; k += 2) {
          const idx = mod(f.start + k, track.N);
          const p = track.points[idx];
          const n = track.normals[idx];
          const t = track.tangents[idx];
          const edge = this.features.heightAtIndex(idx) + this.features.bankAtIndex(idx) * f.side;
          if (edge < 1.2) continue;
          pillars.push({
            x: p.x + n.x * f.side * (W / 2 + 14),
            z: p.y + n.y * f.side * (W / 2 + 14),
            y: edge / 2,
            sx: 6,
            sy: edge,
            sz: Math.max(8, track.ds * 2.6),
            rot: -Math.atan2(t.y, t.x),
          });
        }
        for (let k = 3; k < f.length - 2; k += 6) {
          const idx = mod(f.start + k, track.N);
          const p = track.points[idx];
          const n = track.normals[idx];
          const t = track.tangents[idx];
          const off = f.side * (W / 2 - 7);
          rails.push({
            x: p.x + n.x * off,
            z: p.y + n.y * off,
            y: this.features.heightAtIndex(idx) + this.features.bankAtIndex(idx) * f.side + 3,
            sx: 16,
            sy: 4,
            sz: 9,
            rot: -Math.atan2(t.y, t.x),
          });
        }
      } else if (f.type === 'chicane') {
        for (const b of this.features.barriers) {
          if (mod(b.index - f.start, track.N) < f.length) barriers.push(b);
        }
      } else if (f.type === 'garage') {
        const group = new THREE.Group();
        group.position.set(f.x, 0, f.z);
        group.rotation.y = f.yaw;
        const depth = Math.max(140, f.lengthPx);
        const roofY = 168;
        const sideZ = W / 2 + 16;
        const roofMat = this.theme.featureGlass.clone();
        roofMat.opacity = 0.44;
        roofMat.emissiveIntensity = 0.1;
        roofMat.depthWrite = false;

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(depth + 40, 5, W + 60),
          roofMat
        );
        roof.position.y = roofY;
        group.add(roof);

        // Low side walls keep the tunnel feeling enclosed without ever
        // blocking the chase or hood camera.
        for (const sz of [-1, 1]) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(depth + 24, 56, 8),
            solid
          );
          wall.position.set(0, 28, sz * sideZ);
          group.add(wall);
          const strip = new THREE.Mesh(
            new THREE.BoxGeometry(depth + 16, 3, 3.4),
            trim
          );
          strip.position.set(0, 58, sz * sideZ);
          group.add(strip);
        }

        // Structural columns at the four corners.
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const column = new THREE.Mesh(
              new THREE.BoxGeometry(10, roofY, 10),
              solid
            );
            column.position.set(sx * (depth / 2 - 2), roofY / 2, sz * sideZ);
            group.add(column);
          }
        }

        // Long accent beams under the roof line.
        for (const sz of [-1, 1]) {
          const beam = new THREE.Mesh(
            new THREE.BoxGeometry(depth + 20, 5, 4),
            trim
          );
          beam.position.set(0, roofY - 10, sz * sideZ);
          group.add(beam);
        }

        // Entry and exit lintels sit above the chase camera.
        for (const sx of [-1, 1]) {
          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(6, 18, W + 44),
            trim
          );
          frame.position.set(sx * (depth / 2), roofY - 16, 0);
          group.add(frame);
        }

        // Ceiling light strips read as a lit garage from inside and out.
        for (const sz of [-1, 1]) {
          const light = new THREE.Mesh(
            new THREE.BoxGeometry(depth * 0.68, 1.6, 4),
            glow
          );
          light.position.set(0, roofY - 7, sz * (W * 0.22));
          group.add(light);
        }

        group.traverse((object) => {
          if (object.isMesh) object.castShadow = false;
        });
        garageGroups.push({ group, roofMat, feature: f });
        this.scene.add(group);
      }
    }

    if (pillars.length) {
      this.scene.add(makeInstanced(new THREE.BoxGeometry(1, 1, 1), solid, pillars));
    }
    if (rails.length) {
      this.scene.add(makeInstanced(new THREE.BoxGeometry(1, 1, 1), glow, rails));
    }
    if (chevrons.length) {
      this.scene.add(makeInstanced(new THREE.BoxGeometry(1, 1, 1), glow, chevrons));
    }
    if (barriers.length) {
      const stripe = new THREE.MeshStandardMaterial({
        color: 0xffe7ea,
        emissive: 0xff6a8a,
        emissiveIntensity: 0.55,
        roughness: 0.52,
      });
      this.theme.chicane = stripe;
      for (const b of barriers) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(b.halfLen * 2, 16, b.halfWidth * 2),
          stripe
        );
        mesh.position.set(b.x, 8, b.z);
        mesh.rotation.y = b.yaw;
        this.scene.add(mesh);
      }
    }

    this.garageMeshes = garageGroups;
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
    this.theme.rampDeck = deckMaterial;
    this.theme.rampBody = bodyMaterial;
    this.theme.rampRail = railMaterial;
    this.theme.rampLip = lipMaterial;
    this.theme.rampBase = baseMaterial;

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
          tone,
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
          tone,
          color: new THREE.Color(broadleafColors[Math.floor(tone * broadleafColors.length)]),
        });
      }
    }

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    this.theme.trunk = new THREE.MeshStandardMaterial({
      color: 0x4a3524,
      roughness: 0.95,
    });
    const trunkMesh = makeInstanced(trunkGeo, this.theme.trunk, trunkItems);
    if (trunkMesh) this.scene.add(trunkMesh);

    this.theme.leaf = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      flatShading: true,
    });
    for (const item of broadleaf) item.tone = item.tone ?? 0.5;
    for (const item of pines) item.tone = item.tone ?? 0.5;
    const leafMat = this.theme.leaf;
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
      tone: bush.tone,
      color: new THREE.Color(
        [0x357b3d, 0x2c6c36, 0x408a48, 0x34733a][Math.floor(bush.tone * 4)]
      ),
    }));
    const bushMesh = makeInstanced(new THREE.IcosahedronGeometry(1, 0), leafMat, bushItems);
    if (bushMesh) this.scene.add(bushMesh);

    // Keep the foliage instances around so candy and haunted circuits can
    // repaint them without rebuilding the whole scene.
    this.scenery = {
      broadleaf: {
        mesh: broadleafMesh,
        items: broadleaf,
        palette: broadleafColors,
      },
      pine: {
        mesh: pineMesh,
        items: pines,
        palette: pineColors,
      },
      bush: {
        mesh: bushMesh,
        items: bushItems,
        palette: [0x357b3d, 0x2c6c36, 0x408a48, 0x34733a],
      },
    };

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
    this.theme.rock = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      flatShading: true,
    });
    const rockMesh = makeInstanced(
      new THREE.DodecahedronGeometry(1, 0),
      this.theme.rock,
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
    this.theme.tire = new THREE.MeshStandardMaterial({
      color: 0x171b1e,
      roughness: 0.92,
    });
    const tireMesh = makeInstanced(
      new THREE.CylinderGeometry(1, 1, 1, 12),
      this.theme.tire,
      tireItems
    );
    if (tireMesh) this.scene.add(tireMesh);

    this.buildGrandstand(standX, standZ, -Math.atan2(track.tangents[0].y, track.tangents[0].x));
    this.buildBillboards();
  }

  buildLocationDecor() {
    this.decor = {
      ridge: null,
      neon: this.buildNeonCity(),
      alpine: this.buildAlpinePeaks(),
      canyon: this.buildCanyonMesas(),
      candy: this.buildCandyFactory(),
      haunt: this.buildHauntedMansion(),
    };
    this.buildStars();
    this.buildCelestial();
  }

  buildNeonCity() {
    const bounds = this.track.bounds;
    const rnd = mulberry32(771);
    const windowTexture = makeWindowTexture();
    const group = new THREE.Group();
    group.visible = false;

    const cyan = [];
    const magenta = [];
    const palette = [0x2b3d63, 0x24304f, 0x354166, 0x1e2946, 0x3b3260];

    for (let i = 0; i < 64; i++) {
      const side = i % 4;
      const along = rnd();
      const inset = 560 + rnd() * 900;
      const width = 70 + rnd() * 130;
      const depth = 70 + rnd() * 130;
      const height = 110 + rnd() * 360;
      let x;
      let z;
      if (side === 0) {
        x = bounds.minX + along * (bounds.maxX - bounds.minX);
        z = bounds.minY - inset;
      } else if (side === 1) {
        x = bounds.minX + along * (bounds.maxX - bounds.minX);
        z = bounds.maxY + inset;
      } else if (side === 2) {
        x = bounds.minX - inset;
        z = bounds.minY + along * (bounds.maxY - bounds.minY);
      } else {
        x = bounds.maxX + inset;
        z = bounds.minY + along * (bounds.maxY - bounds.minY);
      }
      const item = {
        x,
        z,
        y: height / 2 - 0.4,
        sx: width,
        sy: height,
        sz: depth,
        rot: 0,
        color: new THREE.Color(palette[Math.floor(rnd() * palette.length)]),
      };
      if (rnd() < 0.5) cyan.push(item);
      else magenta.push(item);
    }

    const makeCityMaterial = (emissive) =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: windowTexture,
        emissive,
        emissiveMap: windowTexture,
        emissiveIntensity: 0.75,
        roughness: 0.74,
        metalness: 0.24,
      });

    const cyanMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      makeCityMaterial(0x7fe8ff),
      cyan
    );
    const magentaMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      makeCityMaterial(0xff6ad5),
      magenta
    );
    if (cyanMesh) group.add(cyanMesh);
    if (magentaMesh) group.add(magentaMesh);

    // Rooftop beacons give the skyline a few bright points for the bloom.
    const beaconMaterial = new THREE.SpriteMaterial({
      map: GLOW_TEX,
      color: 0x8ff6ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 10; i++) {
      const item = [...cyan, ...magenta][Math.floor(rnd() * (cyan.length + magenta.length))];
      if (!item) continue;
      const beacon = new THREE.Sprite(beaconMaterial);
      beacon.position.set(item.x, item.sy + 10, item.z);
      beacon.scale.set(24, 24, 1);
      group.add(beacon);
    }

    this.scene.add(group);
    return group;
  }

  buildAlpinePeaks() {
    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;
    const rnd = mulberry32(5533);
    const group = new THREE.Group();
    group.visible = false;

    const peaks = [];
    const caps = [];
    const peakColors = [0x4d6684, 0x5a738f, 0x405a76, 0x627c97];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * TAU + (rnd() - 0.5) * 0.16;
      const radius = 1750 + rnd() * 900;
      const x = cx + Math.cos(angle) * radius * 1.22;
      const z = cz + Math.sin(angle) * radius * 0.82;
      const height = 300 + rnd() * 620;
      const base = 260 + rnd() * 360;
      peaks.push({
        x,
        z,
        y: height / 2 - 40,
        sx: base,
        sy: height,
        sz: base,
        rot: rnd() * TAU,
        color: new THREE.Color(peakColors[Math.floor(rnd() * peakColors.length)]),
      });
      caps.push({
        x,
        z,
        y: height * 0.7,
        sx: base * 0.43,
        sy: height * 0.58,
        sz: base * 0.43,
        rot: rnd() * TAU,
        color: new THREE.Color(0xe7f2ff),
      });
    }

    const peakMesh = makeInstanced(
      new THREE.ConeGeometry(1, 1, 7),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.94,
        flatShading: true,
      }),
      peaks
    );
    const capMesh = makeInstanced(
      new THREE.ConeGeometry(1, 1, 7),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.82,
        flatShading: true,
      }),
      caps
    );
    if (peakMesh) group.add(peakMesh);
    if (capMesh) group.add(capMesh);

    this.scene.add(group);
    return group;
  }

  buildCanyonMesas() {
    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;
    const rnd = mulberry32(8821);
    const group = new THREE.Group();
    group.visible = false;

    const mesas = [];
    const colors = [0x9d4f30, 0xb8653d, 0x8d452b, 0xc47a4d, 0xa65436];
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * TAU + (rnd() - 0.5) * 0.2;
      const radius = 1550 + rnd() * 1000;
      const x = cx + Math.cos(angle) * radius * 1.2;
      const z = cz + Math.sin(angle) * radius * 0.84;
      const height = 110 + rnd() * 330;
      const base = 190 + rnd() * 340;
      mesas.push({
        x,
        z,
        y: height / 2 - 30,
        sx: base,
        sy: height,
        sz: base,
        rot: rnd() * TAU,
        color: new THREE.Color(colors[Math.floor(rnd() * colors.length)]),
      });
    }

    const mesaMesh = makeInstanced(
      new THREE.CylinderGeometry(0.68, 1, 1, 7),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.96,
        flatShading: true,
      }),
      mesas
    );
    if (mesaMesh) group.add(mesaMesh);

    // A handful of glowing dust sprites catch the low sun.
    const dustMaterial = new THREE.SpriteMaterial({
      map: GLOW_TEX,
      color: 0xffb36b,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 14; i++) {
      const item = mesas[Math.floor(rnd() * mesas.length)];
      if (!item) continue;
      const sprite = new THREE.Sprite(dustMaterial);
      sprite.position.set(
        item.x + (rnd() - 0.5) * 300,
        40 + rnd() * 180,
        item.z + (rnd() - 0.5) * 300
      );
      sprite.scale.set(240 + rnd() * 260, 160 + rnd() * 160, 1);
      group.add(sprite);
    }

    this.scene.add(group);
    return group;
  }

  buildCandyFactory() {
    const track = this.track;
    const W = track.width;
    const bounds = track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;
    const rnd = mulberry32(20261);
    const group = new THREE.Group();
    group.visible = false;

    // Striped candy-cane arches spanning the circuit make the factory
    // location read instantly from the chase and hood cameras.
    const stripeTexture = makeTexture(128, 64, (g, w, h) => {
      g.fillStyle = '#fff6fb';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ff4f9f';
      for (let i = -h; i < w + h; i += 26) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + 13, 0);
        g.lineTo(i + 13 + h, h);
        g.lineTo(i + h, h);
        g.closePath();
        g.fill();
      }
    }, { repeat: [10, 2] });
    const archMaterial = new THREE.MeshStandardMaterial({
      map: stripeTexture,
      roughness: 0.48,
      metalness: 0.08,
      emissive: 0x511028,
      emissiveIntensity: 0.25,
    });
    const archRadius = W / 2 + 34;
    const archGeo = new THREE.TorusGeometry(archRadius, 7.5, 8, 28, Math.PI);
    for (let k = 0; k < 5; k++) {
      const idx = Math.floor(((k + 1) / 6) * track.N) % track.N;
      const p = track.points[idx];
      const t = track.tangents[idx];
      const arch = new THREE.Mesh(archGeo, archMaterial);
      arch.position.set(p.x, 0, p.y);
      arch.rotation.y = -Math.atan2(t.y, t.x) + Math.PI / 2;
      group.add(arch);
    }

    // Candy-cane pillars.
    const caneItems = [];
    const caneCapItems = [];
    for (let i = 0; i < 26; i++) {
      const idx = Math.floor((i / 26) * track.N);
      const p = track.points[idx];
      const n = track.normals[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = W / 2 + 92 + rnd() * 150;
      caneItems.push({
        x: p.x + n.x * dist * side,
        z: p.y + n.y * dist * side,
        y: 46 + rnd() * 26,
        sx: 7,
        sy: 92 + rnd() * 52,
        sz: 7,
      });
      caneCapItems.push({
        x: p.x + n.x * dist * side,
        z: p.y + n.y * dist * side,
        y: 98 + rnd() * 54,
        sx: 15,
        sy: 7,
        sz: 15,
      });
    }
    const caneMat = new THREE.MeshStandardMaterial({ color: 0xfff4fb, roughness: 0.44 });
    const caneStripeMat = new THREE.MeshStandardMaterial({ color: 0xff4f9f, roughness: 0.4 });
    const caneMesh = makeInstanced(new THREE.CylinderGeometry(1, 1, 1, 10), caneMat, caneItems);
    if (caneMesh) group.add(caneMesh);
    const stripeMesh = makeInstanced(
      new THREE.CylinderGeometry(1.12, 1.12, 0.16, 10),
      caneStripeMat,
      caneItems.map((item, index) => ({ ...item, y: item.y - item.sy / 2 + (index % 4) * (item.sy / 4) }))
    );
    if (stripeMesh) group.add(stripeMesh);
    const capMesh = makeInstanced(new THREE.CylinderGeometry(1, 1, 1, 10), caneStripeMat, caneCapItems);
    if (capMesh) group.add(capMesh);

    // Lollipop grove.
    const lollipopPalette = [0xff5fae, 0xffd34d, 0x6fe8ff, 0xa9ff7a, 0xff8b5c];
    for (let i = 0; i < 16; i++) {
      const idx = Math.floor(rnd() * track.N);
      const p = track.points[idx];
      const n = track.normals[idx];
      const side = rnd() < 0.5 ? 1 : -1;
      const dist = W / 2 + 150 + rnd() * 260;
      const x = p.x + n.x * dist * side;
      const z = p.y + n.y * dist * side;
      const height = 46 + rnd() * 55;
      const candy = new THREE.Group();
      candy.position.set(x, 0, z);
      candy.rotation.y = rnd() * TAU;
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.6, height, 8),
        new THREE.MeshStandardMaterial({ color: 0xfff6ee, roughness: 0.5 })
      );
      stick.position.y = height / 2;
      candy.add(stick);
      const color = lollipopPalette[Math.floor(rnd() * lollipopPalette.length)];
      const headMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.12,
        roughness: 0.34,
        metalness: 0.08,
      });
      const head = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 4.4, 22), headMat);
      head.position.y = height + 14;
      head.rotation.x = Math.PI / 2;
      candy.add(head);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(18, 2.2, 6, 22),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
      );
      rim.position.y = height + 14;
      candy.add(rim);
      group.add(candy);
    }

    // Gumdrops and sugar silos.
    const gumdrops = [];
    const silos = [];
    for (let i = 0; i < 24; i++) {
      const angle = rnd() * TAU;
      const radius = 980 + rnd() * 900;
      gumdrops.push({
        x: cx + Math.cos(angle) * radius,
        z: cz + Math.sin(angle) * radius * 0.72,
        y: 20,
        sx: 42 + rnd() * 46,
        sy: 40 + rnd() * 56,
        sz: 42 + rnd() * 46,
        rot: rnd() * TAU,
        color: new THREE.Color(lollipopPalette[Math.floor(rnd() * lollipopPalette.length)]),
      });
    }
    const gumdropMesh = makeInstanced(
      new THREE.ConeGeometry(1, 1, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.04 }),
      gumdrops
    );
    if (gumdropMesh) group.add(gumdropMesh);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU + 0.3;
      silos.push({
        x: cx + Math.cos(angle) * (1450 + rnd() * 260),
        z: cz + Math.sin(angle) * (1100 + rnd() * 220),
        y: 130,
        sx: 130,
        sy: 260,
        sz: 130,
      });
    }
    const siloMesh = makeInstanced(
      new THREE.CylinderGeometry(1, 1, 1, 18),
      new THREE.MeshStandardMaterial({ color: 0xffe3f0, roughness: 0.6, metalness: 0.12 }),
      silos
    );
    if (siloMesh) group.add(siloMesh);

    // Low factory perimeter walls.
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x7a2c58,
      roughness: 0.7,
      metalness: 0.12,
      emissive: 0x3a0d27,
      emissiveIntensity: 0.35,
    });
    const wallSpanX = bounds.maxX - bounds.minX + 1300;
    const wallSpanZ = bounds.maxY - bounds.minY + 1100;
    for (const [x, z, sx, sz] of [
      [cx, bounds.minY - 470, wallSpanX, 36],
      [cx, bounds.maxY + 470, wallSpanX, 36],
      [bounds.minX - 560, cz, 36, wallSpanZ],
      [bounds.maxX + 560, cz, 36, wallSpanZ],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 220, sz), wallMat);
      wall.position.set(x, 110, z);
      group.add(wall);
    }

    // Roof and strip lights close the factory around the circuit.
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(wallSpanX + 240, wallSpanZ + 240),
      new THREE.MeshStandardMaterial({
        color: 0x3d1630,
        roughness: 0.92,
        side: THREE.DoubleSide,
        emissive: 0x1b0714,
        emissiveIntensity: 0.5,
      })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(cx, 980, cz);
    group.add(ceiling);

    const stripItems = [];
    for (let row = -3; row <= 3; row++) {
      stripItems.push({
        x: cx,
        z: cz + row * 310,
        y: 962,
        sx: Math.min(wallSpanX * 0.82, 2600),
        sy: 6,
        sz: 10,
      });
    }
    const stripMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0xffd3ec,
        emissive: 0xff7ac8,
        emissiveIntensity: 2.2,
        roughness: 0.4,
      }),
      stripItems
    );
    if (stripMesh) group.add(stripMesh);

    this.scene.add(group);
    return group;
  }

  buildHauntedMansion() {
    const track = this.track;
    const W = track.width;
    const bounds = track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;
    const rnd = mulberry32(13131);
    const group = new THREE.Group();
    group.visible = false;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x3b3448,
      roughness: 0.92,
      metalness: 0.05,
    });
    const darkStone = new THREE.MeshStandardMaterial({
      color: 0x241f30,
      roughness: 0.94,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1b1526,
      roughness: 0.86,
      metalness: 0.08,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xd7ffd0,
      emissive: 0x9dff7a,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    });
    const amberMat = new THREE.MeshStandardMaterial({
      color: 0xffcf8a,
      emissive: 0xff9a3c,
      emissiveIntensity: 1.6,
      roughness: 0.42,
    });

    // The mansion sits in the middle of the circuit if there is room.
    const manorSpace = track.nearest(cx, cz).dist;
    if (manorSpace > W / 2 + 250) {
      const manor = new THREE.Group();
      manor.position.set(cx, 0, cz);
      const body = new THREE.Mesh(new THREE.BoxGeometry(360, 170, 240), stoneMat);
      body.position.y = 85;
      manor.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(250, 130, 4), roofMat);
      roof.position.y = 234;
      roof.rotation.y = Math.PI / 4;
      manor.add(roof);
      const wingGeo = new THREE.BoxGeometry(130, 125, 180);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(wingGeo, stoneMat);
        wing.position.set(side * 236, 62, 18);
        manor.add(wing);
        const wingRoof = new THREE.Mesh(new THREE.ConeGeometry(112, 96, 4), roofMat);
        wingRoof.position.set(side * 236, 172, 18);
        wingRoof.rotation.y = Math.PI / 4;
        manor.add(wingRoof);
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(54, 64, 250, 10), darkStone);
        tower.position.set(side * 168, 125, -150);
        manor.add(tower);
        const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(72, 150, 10), roofMat);
        towerRoof.position.set(side * 168, 318, -150);
        manor.add(towerRoof);
      }
      const door = new THREE.Mesh(new THREE.BoxGeometry(58, 88, 9), amberMat);
      door.position.set(0, 44, 123);
      manor.add(door);
      for (let row = 0; row < 2; row++) {
        for (let col = -2; col <= 2; col++) {
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(32, 46, 6),
            col % 2 === row ? windowMat : amberMat
          );
          win.position.set(col * 66, 106, 122);
          manor.add(win);
        }
      }
      // Front columns.
      for (const side of [-1, 1]) {
        const column = new THREE.Mesh(new THREE.CylinderGeometry(16, 19, 150, 8), stoneMat);
        column.position.set(side * 88, 75, 146);
        manor.add(column);
      }
      group.add(manor);
    }

    const away = (x, z, pad) => track.nearest(x, z).dist > W / 2 + pad;

    // Dead trees.
    const trunks = [];
    const limbs = [];
    let attempts = 0;
    while (trunks.length < 30 && attempts < 400) {
      attempts++;
      const angle = rnd() * TAU;
      const radius = 720 + rnd() * 900;
      const x = cx + Math.cos(angle) * radius * 1.08;
      const z = cz + Math.sin(angle) * radius * 0.76;
      if (!away(x, z, 80)) continue;
      const height = 70 + rnd() * 90;
      trunks.push({ x, z, y: height / 2, sx: 8, sy: height, sz: 8 });
      for (let k = 0; k < 3; k++) {
        limbs.push({
          x: x + (rnd() - 0.5) * 40,
          z: z + (rnd() - 0.5) * 40,
          y: height * (0.55 + rnd() * 0.3),
          sx: 3.2,
          sy: 26 + rnd() * 30,
          sz: 3.2,
          rot: rnd() * TAU,
        });
      }
    }
    const trunkMesh = makeInstanced(
      new THREE.CylinderGeometry(0.6, 1, 1, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2434, roughness: 0.95 }),
      trunks
    );
    if (trunkMesh) group.add(trunkMesh);
    const limbMesh = makeInstanced(
      new THREE.CylinderGeometry(0.45, 0.9, 1, 5),
      new THREE.MeshStandardMaterial({ color: 0x241f2e, roughness: 0.95 }),
      limbs
    );
    if (limbMesh) group.add(limbMesh);

    // Gravestones.
    const stones = [];
    for (let i = 0; i < 34; i++) {
      const angle = rnd() * TAU;
      const radius = 560 + rnd() * 720;
      const x = cx + Math.cos(angle) * radius;
      const z = cz + Math.sin(angle) * radius * 0.74;
      if (!away(x, z, 55)) continue;
      stones.push({
        x,
        z,
        y: 18 + rnd() * 8,
        sx: 18 + rnd() * 12,
        sy: 30 + rnd() * 22,
        sz: 6,
        rot: (rnd() - 0.5) * 0.5,
        color: new THREE.Color(rnd() < 0.5 ? 0x5b5368 : 0x453e52),
      });
    }
    const stoneMesh = makeInstanced(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
      stones
    );
    if (stoneMesh) group.add(stoneMesh);

    // Candle posts along the circuit.
    const poleItems = [];
    for (let i = 0; i < 18; i++) {
      const idx = Math.floor((i / 18) * track.N);
      const p = track.points[idx];
      const n = track.normals[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = W / 2 + 74;
      poleItems.push({
        x: p.x + n.x * dist * side,
        z: p.y + n.y * dist * side,
        y: 34,
        sx: 3.2,
        sy: 68,
        sz: 3.2,
      });
    }
    const poleMesh = makeInstanced(
      new THREE.CylinderGeometry(1, 1.3, 1, 6),
      new THREE.MeshStandardMaterial({ color: 0x17131f, roughness: 0.9 }),
      poleItems
    );
    if (poleMesh) group.add(poleMesh);
    const flameMaterial = new THREE.SpriteMaterial({
      map: GLOW_TEX,
      color: 0xa9ff86,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const pole of poleItems) {
      const flame = new THREE.Sprite(flameMaterial);
      flame.position.set(pole.x, 76, pole.z);
      flame.scale.set(24, 30, 1);
      group.add(flame);
    }

    // Mansion hall perimeter and ceiling. The circuit threads through the
    // great hall rather than sitting outdoors.
    const hallSpanX = bounds.maxX - bounds.minX + 1200;
    const hallSpanZ = bounds.maxY - bounds.minY + 1000;
    const hallWallMat = new THREE.MeshStandardMaterial({
      color: 0x2b2438,
      roughness: 0.9,
      metalness: 0.06,
      emissive: 0x090610,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    for (const [x, z, sx, sz] of [
      [cx, bounds.minY - 440, hallSpanX, 30],
      [cx, bounds.maxY + 440, hallSpanX, 30],
      [bounds.minX - 520, cz, 30, hallSpanZ],
      [bounds.maxX + 520, cz, 30, hallSpanZ],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 430, sz), hallWallMat);
      wall.position.set(x, 215, z);
      group.add(wall);
    }
    const hallCeiling = new THREE.Mesh(
      new THREE.PlaneGeometry(hallSpanX + 220, hallSpanZ + 220),
      new THREE.MeshStandardMaterial({
        color: 0x140f1d,
        roughness: 0.94,
        side: THREE.DoubleSide,
        emissive: 0x05030a,
        emissiveIntensity: 0.7,
      })
    );
    hallCeiling.rotation.x = Math.PI / 2;
    hallCeiling.position.set(cx, 1060, cz);
    group.add(hallCeiling);

    // Chandeliers hang above the hall.
    for (let i = 0; i < 5; i++) {
      const chandelier = new THREE.Group();
      chandelier.position.set(
        cx + (rnd() - 0.5) * (bounds.maxX - bounds.minX) * 0.7,
        760,
        cz + (rnd() - 0.5) * (bounds.maxY - bounds.minY) * 0.7
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(34, 3.4, 6, 18),
        new THREE.MeshStandardMaterial({
          color: 0x5f516f,
          emissive: 0x2b2136,
          emissiveIntensity: 0.5,
          roughness: 0.55,
          metalness: 0.4,
        })
      );
      ring.rotation.x = Math.PI / 2;
      chandelier.add(ring);
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * TAU;
        const flame = new THREE.Sprite(flameMaterial);
        flame.position.set(Math.cos(angle) * 34, 8, Math.sin(angle) * 34);
        flame.scale.set(22, 28, 1);
        chandelier.add(flame);
      }
      group.add(chandelier);
    }

    // Floating spirits.
    const spiritMaterial = new THREE.SpriteMaterial({
      map: GLOW_TEX,
      color: 0xb8ffdc,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 14; i++) {
      const angle = rnd() * TAU;
      const radius = 260 + rnd() * 900;
      const spirit = new THREE.Sprite(spiritMaterial);
      spirit.position.set(
        cx + Math.cos(angle) * radius,
        40 + rnd() * 90,
        cz + Math.sin(angle) * radius * 0.8
      );
      spirit.scale.set(48 + rnd() * 40, 70 + rnd() * 60, 1);
      group.add(spirit);
    }

    this.scene.add(group);
    return group;
  }

  /**
   * Low-cost themed air: a single Points cloud, tinted per location, gives
   * each circuit a distinct mood (neon dust, alpine snow, canyon grit,
   * candy sparkle, haunted motes) without per-particle draw calls.
   */
  buildAtmosphere() {
    const bounds = this.track.bounds;
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    const count = 260;
    const positions = new Float32Array(count * 3);
    const rnd = mulberry32(9127);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = bounds.minX - 120 + rnd() * (w + 240);
      positions[i * 3 + 1] = 8 + rnd() * 170;
      positions[i * 3 + 2] = bounds.minY - 120 + rnd() * (h + 240);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x9fe8ff,
      size: 3.1,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.atmosphere = points;
    this.atmosphereBase = positions.slice();
    this.scene.add(points);
  }

  buildStars() {
    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;
    const rnd = mulberry32(31337);
    const positions = [];
    const sizes = [];
    for (let i = 0; i < 1700; i++) {
      const theta = rnd() * TAU;
      const phi = Math.acos(0.05 + rnd() * 0.95);
      const radius = 4350;
      positions.push(
        cx + Math.cos(theta) * Math.sin(phi) * radius,
        Math.cos(phi) * radius + 260,
        cz + Math.sin(theta) * Math.sin(phi) * radius
      );
      sizes.push(0.55 + rnd() * 1.4);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    this.stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xdcecff,
        size: 10,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.stars.frustumCulled = false;
    this.stars.visible = false;
    this.scene.add(this.stars);
  }

  buildCelestial() {
    this.celestial = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: GLOW_TEX,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.celestial.frustumCulled = false;
    this.scene.add(this.celestial);
  }

  /**
   * Repaint instanced foliage for themed venues. Candyland gets frosting
   * pinks, the mansion grounds go grey-violet, and every other circuit uses
   * its own tint with the original forest palette.
   */
  tintScenery(loc) {
    if (!this.scenery) return;
    const special =
      loc.id === 'candy' || loc.id === 'haunt'
        ? this.sceneryPalettes[loc.id]
        : null;
    for (const [key, entry] of Object.entries(this.scenery)) {
      if (!entry.mesh || !entry.items.length) continue;
      const palette = special ? special[key] : entry.palette;
      entry.items.forEach((item, index) => {
        const tone = Number.isFinite(item.tone) ? item.tone : 0.5;
        const pick = palette[Math.floor(tone * palette.length) % palette.length];
        entry.mesh.setColorAt(index, new THREE.Color(pick));
      });
      if (entry.mesh.instanceColor) entry.mesh.instanceColor.needsUpdate = true;
    }
    if (this.theme.leaf) {
      this.theme.leaf.color.set(special ? 0xffffff : loc.leafTint);
    }
  }

  setLocation(idOrLocation) {
    const loc = typeof idOrLocation === 'string' ? getLocation(idOrLocation) : idOrLocation;
    if (!loc) return;
    this.location = loc;

    const bounds = this.track.bounds;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minY + bounds.maxY) / 2;

    this.skyMat.uniforms.topColor.value.set(loc.sky.top);
    this.skyMat.uniforms.horizonColor.value.set(loc.sky.horizon);
    this.scene.fog.color.set(loc.fog.color);
    this.scene.fog.near = loc.fog.near;
    this.scene.fog.far = loc.fog.far;

    // Keep the renderer exposure in sync even though the composite shader
    // owns the actual tone mapping for the post chain.
    this.renderer.toneMappingExposure = loc.exposure;
    this.postfx.setLook({
      exposure: loc.exposure,
      bloomStrength: loc.bloom.strength,
      blurPixels: 1.35,
      blurRadius: loc.bloom.radius,
      threshold: loc.bloom.threshold,
      knee: loc.bloom.knee,
    });

    this.hemiLight.color.set(loc.hemi.sky);
    this.hemiLight.groundColor.set(loc.hemi.ground);
    this.hemiLight.intensity = loc.hemi.intensity;
    this.sunLight.color.set(loc.sun.color);
    this.sunLight.intensity = loc.sun.intensity;
    this.sunLight.position.set(...loc.sun.position);
    this.fillLight.color.set(loc.fill.color);
    this.fillLight.intensity = loc.fill.intensity;
    this.ambientLight.intensity = loc.ambient;

    const t = this.theme;
    t.ground.map = this.groundMaps[loc.ground.kind];
    t.ground.color.set(loc.ground.tint);
    t.ground.needsUpdate = true;
    t.outerGround.color.set(loc.ground.outer);

    t.road.color.set(loc.road.tint);
    t.road.roughness = loc.road.roughness;
    t.road.metalness = loc.road.metalness;
    t.shoulder.color.set(loc.shoulder);
    t.line.color.set(loc.line);
    t.line.emissive.set(loc.line);
    t.line.emissiveIntensity = loc.night ? 0.5 : 0.16;
    t.rail.color.set(loc.rail);
    t.kerb.color.set(loc.kerb);
    t.post.color.set(loc.rail).multiplyScalar(loc.night ? 0.42 : 0.62);
    t.reflector.emissive.set(loc.accent);
    t.reflector.emissiveIntensity = loc.night ? 1.1 : 0.4;

    if (t.rampRail) {
      t.rampRail.color.set(loc.rampGlow);
      t.rampRail.emissive.set(loc.rampGlow);
      t.rampRail.emissiveIntensity = loc.night ? 1.1 : 0.85;
      t.rampLip.color.set(loc.rampLip);
      t.rampLip.emissive.set(loc.rampGlow);
      t.rampLip.emissiveIntensity = loc.night ? 1.35 : 1.2;
      t.rampBase.color.set(loc.rampRail);
    }

    if (t.featureGlow) {
      t.featureGlow.color.set(loc.kerb);
      t.featureGlow.emissive.set(loc.kerb);
      t.featureGlow.emissiveIntensity = loc.night ? 0.85 : 0.55;
      t.featureSolid.color.set(loc.shoulder).multiplyScalar(1.35);
      t.featureGlass.color.set(loc.kerb);
      t.featureGlass.emissive.set(loc.accent);
      t.featureGlass.emissiveIntensity = loc.night ? 0.3 : 0.16;
      if (t.featureTrim) {
        t.featureTrim.color.set(loc.rail).lerp(new THREE.Color(loc.kerb), 0.42);
        t.featureTrim.emissive.set(loc.accent);
        t.featureTrim.emissiveIntensity = loc.night ? 0.4 : 0.22;
      }
      for (const entry of this.garageMeshes) {
        entry.roofMat.color.set(loc.rail).lerp(new THREE.Color(loc.kerb), 0.25);
        entry.roofMat.emissive.set(loc.accent);
        entry.roofMat.emissiveIntensity = loc.night ? 0.18 : 0.1;
      }
      if (t.chicane) {
        t.chicane.emissive.set(loc.accent);
        t.chicane.color.set(loc.kerb).lerp(new THREE.Color(0xffffff), 0.35);
      }
    }

    t.leaf.color.set(loc.leafTint);
    t.trunk.color.set(loc.trunkTint);
    t.rock.color.set(loc.rockTint);
    t.tire.color.set(loc.night ? 0x0d1118 : 0x171b1e);
    this.tintScenery(loc);

    if (this.atmosphere) {
      this.atmosphere.material.color.set(loc.accent);
      this.atmosphere.material.opacity = loc.night ? 0.72 : 0.42;
      this.atmosphere.visible = true;
    }

    for (const [key, group] of Object.entries(this.decor)) {
      if (group) group.visible = key === loc.props;
    }

    if (this.stars) {
      this.stars.visible = loc.stars > 0;
      this.stars.material.opacity = clamp(loc.stars / 1500, 0.32, 0.92);
    }

    if (this.celestial) {
      const c = loc.celestial;
      const dir = new THREE.Vector3(...c.position).normalize();
      this.celestial.position.set(
        cx + dir.x * 4100,
        Math.max(420, dir.y * 4100),
        cz + dir.z * 4100
      );
      this.celestial.scale.set(c.size, c.size, 1);
      this.celestial.material.color.set(c.color);
      this.celestial.material.opacity = c.opacity;
      this.celestial.material.color.multiplyScalar(c.power);
      this.celestial.material.needsUpdate = true;
    }
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

      if (particle.kind === 'fire') {
        if (sparkIndex >= this.sparkSprites.length) continue;
        const sprite = this.sparkSprites[sparkIndex++];
        sprite.material.color.set(t > 0.55 ? 0xffe08a : 0xff6a24);
        sprite.material.opacity = 0.9 * t;
        sprite.position.set(
          particle.x,
          (particle.height || 0) + 5 + (1 - t) * 18,
          particle.y
        );
        const size = particle.size * (1.5 + (1 - t) * 1.6);
        sprite.scale.set(size, size, 1);
        sprite.visible = true;
        continue;
      }

      if (smokeIndex >= this.smokeSprites.length) continue;
      const sprite = this.smokeSprites[smokeIndex++];

      if (particle.kind === 'dust') {
        const kind = this.location?.ground?.kind;
        let dustColor = 0xbba97f;
        if (kind === 'snow') dustColor = 0xe6f2ff;
        else if (kind === 'sand') dustColor = 0xd8a878;
        else if (kind === 'city') dustColor = 0x8b98a7;
        else if (particle.tint === 'green') dustColor = 0x7f9a62;
        sprite.material.color.set(dustColor);
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
    const ratio = Math.min(dpr || 1, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.viewW, this.viewH, false);
    this.postfx.setSize(this.viewW, this.viewH, ratio);
    this.camera.aspect = this.viewW / this.viewH;
    this.camera.updateProjectionMatrix();
  }

  updateCamera(playerCar, state, camera, dt = 1 / 60) {
    const cam = this.camera;
    const track = this.track;
    cam.up.set(0, 1, 0);

    if (state.mode === 'title') {
      const near = track.nearest(camera.x, camera.y);
      const t = track.tangents[near.index];
      const n = track.normals[near.index];
      const speed = 190;
      const back = 170;
      const height = 104;
      this.camGoal.set(
        camera.x - t.x * back + n.x * 28,
        height + Math.sin(this.time * 0.7) * 2.4,
        camera.y - t.y * back + n.y * 28
      );
      this.lookGoal.set(camera.x + t.x * speed, 10, camera.y + t.y * speed);
      if (!this.camReady) {
        this.camSmooth.copy(this.camGoal);
        this.lookSmooth.copy(this.lookGoal);
        this.camReady = true;
      }
      const k = 1 - Math.exp(-3.2 * dt);
      this.camSmooth.lerp(this.camGoal, k);
      this.lookSmooth.lerp(this.lookGoal, k);
      cam.position.copy(this.camSmooth);
      cam.lookAt(this.lookSmooth);
      cam.fov += (56 - cam.fov) * 0.1;
      cam.updateProjectionMatrix();
      return;
    }

    const speedRatio = clamp(playerCar.speed / playerCar.maxSpeed, 0, 1);
    const cos = Math.cos(playerCar.angle);
    const sin = Math.sin(playerCar.angle);
    const focusX = camera.x;
    const focusY = camera.y;
    const carY = playerCar.y || 0;
    const mode = state.cameraMode || 'chase';

    if (mode !== this.camMode) {
      this.camMode = mode;
      this.camReady = false;
    }

    let fovTarget = 58;
    let followRate = 5.5;
    let lookRate = 7;

    if (mode === 'hood') {
      // True 3D hood mount just ahead of the nose. High follow rate keeps
      // it glued to the car without the body geometry blocking the road.
      this.camGoal.set(
        playerCar.pos.x + cos * 30,
        22 + carY * 0.92,
        playerCar.pos.y + sin * 30
      );
      this.lookGoal.set(
        playerCar.pos.x + cos * 165,
        13 + carY + (playerCar.pitch || 0) * 28,
        playerCar.pos.y + sin * 165
      );
      fovTarget = 68 + speedRatio * 7;
      followRate = 16;
      lookRate = 18;
    } else if (mode === 'overview') {
      // Wide 3D overview: high 3/4 chase with a little lateral offset so
      // the whole car and the next corner stay in frame. No flat top-down.
      const nx = -sin;
      const ny = cos;
      this.camGoal.set(
        focusX - cos * 330 + nx * 118,
        255 + carY * 0.7 + speedRatio * 20,
        focusY - sin * 330 + ny * 118
      );
      this.lookGoal.set(
        focusX + cos * 120,
        8 + carY * 0.8,
        focusY + sin * 120
      );
      fovTarget = 60 + speedRatio * 8;
      followRate = 3.4;
      lookRate = 5.2;
    } else {
      const back = 158 + speedRatio * 38;
      const height = 92 + speedRatio * 10;
      this.camGoal.set(
        focusX - cos * back,
        height + carY * 0.55,
        focusY - sin * back
      );
      this.lookGoal.set(
        focusX + cos * 92,
        9 + carY * 0.85,
        focusY + sin * 92
      );
      fovTarget = 58 + speedRatio * 11;
    }

    if (!this.camReady) {
      this.camSmooth.copy(this.camGoal);
      this.lookSmooth.copy(this.lookGoal);
      this.camReady = true;
    }
    const follow = 1 - Math.exp(-followRate * dt);
    const look = 1 - Math.exp(-lookRate * dt);
    this.camSmooth.lerp(this.camGoal, follow);
    this.lookSmooth.lerp(this.lookGoal, look);

    cam.position.copy(this.camSmooth);
    if (state.shake > 0.001) {
      const shake = state.shake * (mode === 'hood' ? 5 : mode === 'overview' ? 6 : 9);
      cam.position.x += (Math.random() - 0.5) * shake;
      cam.position.y += (Math.random() - 0.5) * shake * 0.6;
      cam.position.z += (Math.random() - 0.5) * shake;
    }
    cam.lookAt(this.lookSmooth);
    cam.fov += (fovTarget - cam.fov) * Math.min(1, dt * 6);
    cam.updateProjectionMatrix();
  }

  updateCars(cars, state) {
    for (const car of cars) {
      const model = this.carModels.get(car);
      if (!model) continue;
      model.group.position.set(car.pos.x, car.y || 0, car.pos.y);
      model.group.rotation.y = -car.angle;
      model.group.rotation.z = car.pitch || 0;

      // Match the chassis to the road's cross-slope so the wheels sit on a
      // banked curve. Local +Z maps to the track normal, so a positive bank
      // raises that side and needs a negative rotation about local X.
      const bank = this.features && !car.airborne && !car.ramp
        ? this.features.bankAtIndex(car.prevIndex)
        : 0;
      model.group.rotation.x = -Math.atan2(bank, this.track.width / 2);

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
        // Soft additive pool on the road. It fades away when the wheels
        // leave the ground, so jumps do not carry a fake glow into the air.
        const fade = car.airborne ? 0.05 : car.ramp ? 0.8 : 1;
        const base = car.isPlayer ? 0.5 : 0.3;
        model.ring.material.opacity =
          (base + Math.sin(this.time * 3.4) * 0.035) * fade;
        model.ring.visible = state.mode !== 'title' || car.isPlayer;
      }
    }

    // Covered garages fade their roof while the player is underneath.
    if (this.garageMeshes.length) {
      const player = cars.find((car) => car.isPlayer);
      for (const entry of this.garageMeshes) {
        let inside = false;
        if (player && this.features) {
          const near = this.track.nearest(player.pos.x, player.pos.y, player.prevIndex);
          inside = Boolean(this.features.garageAt(near.index, near.offset));
        }
        const target = inside ? 0.16 : 0.62;
        entry.roofMat.opacity += (target - entry.roofMat.opacity) * 0.12;
      }
    }
  }

  /* ------------------------------ hazards --------------------------- */

  clearHazardMeshes() {
    if (!this.hazardMeshes) {
      this.hazardMeshes = [];
      return;
    }
    for (const mesh of this.hazardMeshes) {
      this.scene.remove(mesh);
      mesh.traverse?.((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) material.dispose?.();
        }
      });
    }
    this.hazardMeshes.length = 0;
  }

  setHazards(hazards) {
    if (!this.hazardMeshes) this.hazardMeshes = [];
    this.clearHazardMeshes();
    const bodyGeo = new THREE.CylinderGeometry(9, 10, 23, 10);
    const bandGeo = new THREE.CylinderGeometry(10.4, 10.4, 5, 10);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xc8442e,
      emissive: 0x3a0d06,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.24,
    });
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xffe27a,
      emissive: 0xffa41e,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      map: GLOW_TEX,
      color: 0xffb347,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    for (const hazard of hazards) {
      const group = new THREE.Group();
      group.position.set(hazard.x, 0, hazard.z);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 12;
      group.add(body);
      for (const y of [6, 17]) {
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = y;
        group.add(band);
      }
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.18;
      group.add(ring);
      hazard.mesh = group;
      hazard.ringMesh = ring;
      this.scene.add(group);
      this.hazardMeshes.push(group);
    }
    this.hazards = hazards;
  }

  updateHazards(hazards, dt) {
    for (const hazard of hazards) {
      if (!hazard.mesh) continue;
      if (!hazard.alive) {
        hazard.mesh.visible = false;
        continue;
      }
      hazard.mesh.visible = true;
      const pulse = 1 + Math.sin(this.time * 4.2 + hazard.phase) * 0.06;
      hazard.mesh.scale.set(pulse, 1, pulse);
      if (hazard.ringMesh) {
        const warn = 0.34 + Math.abs(Math.sin(this.time * 3.1 + hazard.phase)) * 0.4;
        hazard.ringMesh.material.opacity = warn;
        hazard.ringMesh.rotation.z = this.time * 0.6;
      }
    }
  }

  render({ cars, playerCar, particles, state, camera, dt }) {
    this.time += dt || 0;
    if (this.atmosphere) {
      this.atmosphere.rotation.y = this.time * 0.006;
      this.atmosphere.material.opacity =
        (state.mode === 'title' ? 0.4 : 0.55) *
        (0.7 + Math.sin(this.time * 0.8) * 0.12);
    }
    this.updateCars(cars, state);
    this.updateCamera(playerCar, state, camera, dt || 1 / 60);
    this.updateParticles(particles || []);
    this.postfx.render(this.scene, this.camera);
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
