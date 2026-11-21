/* ═══════════════════════════════════════════════════════════════
   RC RUSH — roadside prop illustrations
   ═══════════════════════════════════════════════════════════════ */
import { mix, rgba } from './colors.js';

function rr(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

export function drawProp(ctx, prop, sx, sy, unit, location, fog, fogColor, now, roadPx) {
  const type = prop.type;

  if (type === 'gantry') {
    drawGantry(ctx, sx, sy, unit, location, fogColor, fog, roadPx, now);
    return;
  }

  const s = unit * 2000 * prop.size;
  if (s < 1.2) return;

  const pc = location.propColors;
  const base = mix(pc.a, fogColor, fog * 0.88);
  const mid = mix(pc.b, fogColor, fog * 0.88);
  const accent = mix(pc.c, fogColor, fog * 0.8);
  const light = mix(pc.d, fogColor, fog * 0.8);
  const dark = mix('#0b0e15', fogColor, fog * 0.85);

  ctx.save();
  ctx.translate(sx, sy);

  // contact shadow
  ctx.fillStyle = `rgba(0,0,0,${0.28 * (1 - fog)})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.28, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(s, -s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'tree': {
      ctx.fillStyle = base;
      ctx.fillRect(-0.035, 0, 0.07, 0.58);
      ctx.fillStyle = mid;
      ctx.beginPath(); ctx.arc(-0.07, 0.66, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.11, 0.72, 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = base;
      ctx.beginPath(); ctx.arc(0.02, 0.88, 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(light, 0.25);
      ctx.beginPath(); ctx.arc(-0.02, 0.93, 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'pine': {
      ctx.fillStyle = dark;
      ctx.fillRect(-0.03, 0, 0.06, 0.22);
      for (let i = 0; i < 3; i++) {
        const yy = 0.18 + i * 0.28;
        const ww = 0.34 - i * 0.075;
        ctx.fillStyle = i === 2 ? mid : base;
        ctx.beginPath();
        ctx.moveTo(0, yy + 0.46);
        ctx.lineTo(ww, yy);
        ctx.lineTo(-ww, yy);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'palm': {
      ctx.strokeStyle = base;
      ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.09, 0.45, 0.04, 0.9); ctx.stroke();
      ctx.strokeStyle = mid;
      ctx.lineWidth = 0.026;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI + (i / 5) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(0.04, 0.9);
        ctx.quadraticCurveTo(0.04 + Math.cos(a) * 0.22, 0.9 + Math.sin(a) * 0.2 + 0.04,
          0.04 + Math.cos(a) * 0.4, 0.9 + Math.sin(a) * 0.32);
        ctx.stroke();
      }
      break;
    }
    case 'cactus': {
      ctx.fillStyle = mid;
      rr(ctx, -0.08, 0, 0.16, 0.82, 0.08); ctx.fill();
      rr(ctx, -0.22, 0.38, 0.15, 0.09, 0.045); ctx.fill();
      rr(ctx, -0.22, 0.38, 0.075, 0.24, 0.035); ctx.fill();
      rr(ctx, 0.09, 0.5, 0.14, 0.08, 0.04); ctx.fill();
      rr(ctx, 0.165, 0.5, 0.065, 0.2, 0.03); ctx.fill();
      ctx.fillStyle = rgba(light, 0.2);
      ctx.fillRect(-0.035, 0.15, 0.02, 0.55);
      break;
    }
    case 'rock': {
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(-0.28, 0); ctx.lineTo(-0.2, 0.24); ctx.lineTo(-0.05, 0.34);
      ctx.lineTo(0.12, 0.28); ctx.lineTo(0.27, 0.09); ctx.lineTo(0.22, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(light, 0.16);
      ctx.beginPath(); ctx.moveTo(-0.05, 0.34); ctx.lineTo(0.12, 0.28); ctx.lineTo(0.05, 0.14); ctx.closePath(); ctx.fill();
      break;
    }
    case 'sign': {
      ctx.fillStyle = dark;
      ctx.fillRect(-0.018, 0, 0.036, 0.68);
      ctx.fillStyle = mid;
      rr(ctx, -0.28, 0.58, 0.56, 0.32, 0.03); ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.025;
      rr(ctx, -0.26, 0.6, 0.52, 0.28, 0.02); ctx.stroke();
      ctx.fillStyle = rgba(light, 0.7);
      ctx.fillRect(-0.18, 0.71, 0.36, 0.025);
      ctx.fillRect(-0.18, 0.77, 0.24, 0.025);
      break;
    }
    case 'lamp': {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.05); ctx.quadraticCurveTo(0, 1.15, 0.14, 1.15); ctx.stroke();
      const grd = ctx.createRadialGradient(0.15, 1.1, 0.005, 0.15, 1.1, 0.22);
      grd.addColorStop(0, rgba(accent, 0.95));
      grd.addColorStop(0.35, rgba(accent, 0.4));
      grd.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0.15, 1.1, 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.arc(0.15, 1.1, 0.035, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'building': {
      const bw = 0.62, bh = 1.55 + (prop.seed % 7) * 0.12;
      ctx.fillStyle = base;
      ctx.fillRect(-bw / 2, 0, bw, bh);
      ctx.fillStyle = rgba(dark, 0.5);
      ctx.fillRect(-bw / 2, bh - 0.05, bw, 0.05);
      const cols = 4, rows = Math.max(3, Math.floor(bh / 0.2));
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          if ((cx * 7 + ry * 11 + prop.seed) % 5 < 2) {
            ctx.fillStyle = rgba(accent, 0.2 + ((prop.seed + cx * 3 + ry) % 5) * 0.1);
            ctx.fillRect(-bw / 2 + 0.06 + cx * (bw - 0.1) / cols, 0.1 + ry * (bh - 0.18) / rows, 0.065, 0.05);
          }
        }
      }
      ctx.fillStyle = mid;
      ctx.fillRect(-0.02, bh, 0.04, 0.24);
      ctx.fillStyle = accent;
      ctx.fillRect(-0.03, bh + 0.24, 0.06, 0.03);
      break;
    }
    case 'billboard': {
      ctx.fillStyle = dark;
      ctx.fillRect(-0.16, 0, 0.035, 0.72);
      ctx.fillRect(0.125, 0, 0.035, 0.72);
      ctx.fillStyle = mid;
      rr(ctx, -0.48, 0.66, 0.96, 0.45, 0.03); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.03;
      rr(ctx, -0.46, 0.68, 0.92, 0.41, 0.02); ctx.stroke();
      ctx.fillStyle = rgba(light, 0.85);
      ctx.fillRect(-0.32, 0.83, 0.64, 0.05);
      ctx.fillRect(-0.32, 0.92, 0.42, 0.04);
      ctx.fillStyle = rgba(accent, 0.7);
      ctx.fillRect(-0.32, 0.73, 0.2, 0.03);
      break;
    }
    case 'container': {
      const w = 0.78, h = 0.42;
      ctx.fillStyle = base;
      ctx.fillRect(-w / 2, 0, w, h);
      ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 0.012;
      for (let i = 1; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo(-w / 2 + i * w / 7, 0); ctx.lineTo(-w / 2 + i * w / 7, h); ctx.stroke();
      }
      ctx.fillStyle = rgba(accent, 0.35);
      ctx.fillRect(-w / 2 + 0.04, h - 0.09, w - 0.08, 0.05);
      ctx.fillStyle = rgba(light, 0.18);
      ctx.fillRect(-w / 2, h - 0.02, w, 0.02);
      break;
    }
    case 'crane': {
      ctx.strokeStyle = base;
      ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.5); ctx.lineTo(0.85, 1.5); ctx.stroke();
      ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.moveTo(0, 0.7); ctx.lineTo(0.85, 1.5); ctx.moveTo(0.85, 0.75); ctx.lineTo(0, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.55, 1.5); ctx.lineTo(0.55, 1.08); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(0.49, 1.04, 0.12, 0.05);
      ctx.fillStyle = light;
      ctx.fillRect(-0.02, 1.52, 0.04, 0.04);
      break;
    }
    case 'barrel': {
      ctx.fillStyle = mid;
      rr(ctx, -0.11, 0, 0.22, 0.4, 0.04); ctx.fill();
      ctx.fillStyle = rgba(accent, 0.6);
      ctx.fillRect(-0.11, 0.12, 0.22, 0.03);
      ctx.fillRect(-0.11, 0.26, 0.22, 0.03);
      ctx.fillStyle = rgba(light, 0.25);
      ctx.fillRect(-0.07, 0.02, 0.03, 0.36);
      break;
    }
    case 'crystal': {
      const heights = [0.55, 0.85, 0.62];
      const offs = [-0.14, 0, 0.16];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 1 ? light : mid;
        ctx.beginPath();
        ctx.moveTo(offs[i] - 0.09, 0);
        ctx.lineTo(offs[i], heights[i]);
        ctx.lineTo(offs[i] + 0.09, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(accent, 0.3);
        ctx.beginPath();
        ctx.moveTo(offs[i], heights[i]);
        ctx.lineTo(offs[i] + 0.09, 0);
        ctx.lineTo(offs[i] + 0.03, 0);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'ice': {
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(-0.3, 0); ctx.lineTo(-0.18, 0.3); ctx.lineTo(-0.05, 0.52); ctx.lineTo(0.16, 0.2); ctx.lineTo(0.3, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(light, 0.4);
      ctx.beginPath(); ctx.moveTo(-0.05, 0.52); ctx.lineTo(0.16, 0.2); ctx.lineTo(0.02, 0); ctx.closePath(); ctx.fill();
      break;
    }
    case 'vent': {
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(-0.34, 0); ctx.quadraticCurveTo(-0.12, 0.3, 0.02, 0.3); ctx.quadraticCurveTo(0.2, 0.28, 0.34, 0);
      ctx.closePath(); ctx.fill();
      const grd = ctx.createRadialGradient(0.02, 0.28, 0.01, 0.02, 0.28, 0.2);
      grd.addColorStop(0, rgba(accent, 0.9)); grd.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0.02, 0.28, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.5); ctx.lineWidth = 0.015;
      ctx.beginPath(); ctx.moveTo(-0.1, 0.1); ctx.lineTo(0.05, 0.22); ctx.stroke();
      break;
    }
    case 'lava': {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-0.32, 0); ctx.lineTo(-0.18, 0.24); ctx.lineTo(0.04, 0.3); ctx.lineTo(0.25, 0.16); ctx.lineTo(0.32, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.85); ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.moveTo(-0.16, 0.03); ctx.lineTo(-0.04, 0.2); ctx.lineTo(0.06, 0.1); ctx.lineTo(0.18, 0.22); ctx.stroke();
      ctx.fillStyle = rgba(accent, 0.16);
      ctx.beginPath(); ctx.arc(0, 0.16, 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'block': {
      ctx.fillStyle = mid;
      rr(ctx, -0.2, 0, 0.4, 0.4, 0.035); ctx.fill();
      ctx.fillStyle = rgba(light, 0.18);
      ctx.beginPath(); ctx.moveTo(-0.2, 0.4); ctx.lineTo(-0.12, 0.48); ctx.lineTo(0.28, 0.48); ctx.lineTo(0.2, 0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(accent, 0.7);
      ctx.beginPath(); ctx.arc(-0.06, 0.22, 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.07, 0.14, 0.035, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'pencil': {
      ctx.fillStyle = mid;
      ctx.fillRect(-0.07, 0, 0.14, 0.95);
      ctx.fillStyle = rgba(accent, 0.7);
      ctx.fillRect(-0.07, 0.55, 0.14, 0.05);
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.moveTo(-0.07, 0.95); ctx.lineTo(0, 1.15); ctx.lineTo(0.07, 0.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(-0.018, 1.07); ctx.lineTo(0, 1.15); ctx.lineTo(0.018, 1.07); ctx.closePath(); ctx.fill();
      break;
    }
    case 'domino': {
      ctx.fillStyle = base;
      rr(ctx, -0.12, 0, 0.24, 0.62, 0.025); ctx.fill();
      ctx.fillStyle = rgba(light, 0.7);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(i % 2 ? 0.045 : -0.045, 0.14 + Math.floor(i / 2) * 0.3, 0.022, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'ball': {
      const grd = ctx.createRadialGradient(-0.06, 0.28, 0.02, 0, 0.22, 0.22);
      grd.addColorStop(0, light); grd.addColorStop(0.7, mid); grd.addColorStop(1, base);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0.22, 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.7); ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.arc(0, 0.22, 0.17, 0.4, 2.2); ctx.stroke();
      break;
    }
    case 'satellite': {
      ctx.fillStyle = mid;
      rr(ctx, -0.16, 0.35, 0.32, 0.18, 0.03); ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-0.52, 0.39, 0.3, 0.1);
      ctx.fillRect(0.22, 0.39, 0.3, 0.1);
      ctx.strokeStyle = dark; ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.moveTo(-0.22, 0.44); ctx.lineTo(-0.16, 0.44); ctx.moveTo(0.16, 0.44); ctx.lineTo(0.22, 0.44); ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.arc(0, 0.66, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(0, 0.66, 0.05, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'antenna': {
      ctx.strokeStyle = base; ctx.lineWidth = 0.03;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.35); ctx.stroke();
      ctx.lineWidth = 0.018;
      ctx.beginPath(); ctx.moveTo(-0.12, 1.05); ctx.lineTo(0.12, 1.05); ctx.moveTo(-0.08, 0.82); ctx.lineTo(0.08, 0.82); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(0, 1.36, 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(0, 1.36, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'snowman': {
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.arc(0, 0.16, 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0.42, 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0.61, 0.085, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-0.09, 0.68, 0.18, 0.025);
      ctx.fillRect(-0.06, 0.68, 0.12, 0.11);
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(-0.03, 0.63, 0.012, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.03, 0.63, 0.012, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'umbrella': {
      ctx.strokeStyle = dark; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.75); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(0, 0.75, 0.42, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(light, 0.55);
      ctx.beginPath(); ctx.arc(0, 0.75, 0.42, Math.PI, Math.PI * 1.5); ctx.fill();
      break;
    }
    case 'buoy': {
      ctx.fillStyle = accent;
      rr(ctx, -0.14, 0, 0.28, 0.2, 0.09); ctx.fill();
      ctx.fillStyle = light;
      ctx.fillRect(-0.14, 0.11, 0.28, 0.035);
      ctx.strokeStyle = dark; ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.lineTo(0, 0.36); ctx.stroke();
      ctx.fillStyle = rgba(accent, 0.4);
      ctx.beginPath(); ctx.arc(0, 0.37, 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'skull': {
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.arc(0, 0.24, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-0.12, 0.08, 0.24, 0.13);
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(-0.07, 0.26, 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.07, 0.26, 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-0.03, 0.13, 0.06, 0.05);
      break;
    }
    case 'log': {
      ctx.fillStyle = base;
      rr(ctx, -0.42, 0, 0.84, 0.18, 0.09); ctx.fill();
      ctx.fillStyle = mid;
      ctx.beginPath(); ctx.ellipse(-0.42, 0.09, 0.05, 0.09, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(light, 0.25); ctx.lineWidth = 0.012;
      ctx.beginPath(); ctx.moveTo(-0.3, 0.09); ctx.lineTo(0.3, 0.09); ctx.stroke();
      break;
    }
    case 'firefly': {
      const pulse = 0.6 + Math.sin(now * 3 + prop.seed) * 0.4;
      const grd = ctx.createRadialGradient(0, 0.5, 0.01, 0, 0.5, 0.24);
      grd.addColorStop(0, rgba(accent, 0.9 * pulse));
      grd.addColorStop(0.4, rgba(accent, 0.3 * pulse));
      grd.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0.5, 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.arc(0, 0.5, 0.025, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'moss': {
      ctx.strokeStyle = rgba(accent, 0.4);
      ctx.lineWidth = 0.012;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-0.16 + i * 0.08, 0.65);
        ctx.quadraticCurveTo(-0.14 + i * 0.08, 0.4, -0.2 + i * 0.08, 0.22);
        ctx.stroke();
      }
      break;
    }
    case 'flag': {
      ctx.strokeStyle = dark; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.75); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(0, 0.74); ctx.lineTo(0.34, 0.64); ctx.lineTo(0, 0.52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(light, 0.6);
      ctx.fillRect(-0.04, 0.74, 0.08, 0.03);
      break;
    }
    case 'startlight': {
      ctx.strokeStyle = dark; ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.95); ctx.stroke();
      ctx.fillStyle = dark;
      rr(ctx, -0.18, 0.95, 0.36, 0.13, 0.02); ctx.fill();
      const cols = ['#ff3b2b', '#ffb03a', '#45f0a2'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cols[i];
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(-0.1 + i * 0.1, 1.015, 0.026, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    default: {
      ctx.fillStyle = mid;
      ctx.beginPath(); ctx.arc(0, 0.25, 0.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawGantry(ctx, sx, sy, unit, location, fogColor, fog, roadPx, now) {
  const h = unit * 2000 * 1.5;
  if (h < 4) return;
  const half = Math.max(roadPx * 1.06, 20);
  const dark = mix('#141924', fogColor, fog * 0.85);
  const accent = mix(location.propColors.c, fogColor, fog * 0.7);
  const light = mix('#f2f6ff', fogColor, fog * 0.6);

  ctx.save();
  ctx.translate(sx, sy);

  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(2, h * 0.035);
  ctx.beginPath();
  ctx.moveTo(-half, 0); ctx.lineTo(-half, -h * 0.88);
  ctx.moveTo(half, 0); ctx.lineTo(half, -h * 0.88);
  ctx.stroke();

  // truss
  ctx.lineWidth = Math.max(1, h * 0.012);
  for (let i = 0; i < 4; i++) {
    const x = -half + (half * 2) * i / 4;
    ctx.beginPath(); ctx.moveTo(x, -h * 0.88); ctx.lineTo(x + half * 0.5, -h * 0.94); ctx.stroke();
  }

  // banner
  const bh = h * 0.16;
  ctx.fillStyle = dark;
  ctx.fillRect(-half, -h * 0.96, half * 2, bh);
  ctx.fillStyle = accent;
  ctx.fillRect(-half, -h * 0.96, half * 2, Math.max(1, bh * 0.08));
  ctx.fillRect(-half, -h * 0.81, half * 2, Math.max(1, bh * 0.05));

  const fs = Math.max(6, Math.min(h * 0.1, half * 0.22));
  ctx.fillStyle = light;
  ctx.font = `900 ${fs}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RC RUSH', 0, -h * 0.875);

  // start lights
  for (let i = 0; i < 3; i++) {
    const on = (Math.floor(now * 2) % 3) === i;
    ctx.fillStyle = on ? '#ff3b2b' : 'rgba(255,59,43,.18)';
    ctx.beginPath();
    ctx.arc(-half * 0.55 + i * half * 0.55, -h * 0.75, Math.max(2, h * 0.022), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
