/* ═══════════════════════════════════════════════════════════════
   RC RUSH — vector RC car renderer
   ═══════════════════════════════════════════════════════════════ */

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawRCCar(ctx, x, y, width, car, opts = {}) {
  const {
    rot = 0, boost = 0, brake = false, fog = 0, now = 0,
    opponent = false, steer = 0, drift = 0, scaleY = 1
  } = opts;
  const k = width / 620;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k, k * scaleY);
  ctx.translate(0, -390);

  // ground shadow
  ctx.save();
  ctx.globalAlpha = 0.5 * (1 - fog * 0.6);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(310, 401, 232, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // underglow
  if (!opponent) {
    const glow = ctx.createRadialGradient(310, 390, 10, 310, 390, 230);
    glow.addColorStop(0, `${car.accent}66`);
    glow.addColorStop(1, `${car.accent}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(310, 392, 220, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // wheels
  for (const wx of [82, 446]) {
    ctx.fillStyle = '#0a0c11';
    roundRect(ctx, wx, 242, 92, 150, 30); ctx.fill();
    ctx.fillStyle = '#1b1f28';
    roundRect(ctx, wx + 10, 252, 72, 130, 24); ctx.fill();
    const metal = ctx.createLinearGradient(0, 250, 0, 392);
    metal.addColorStop(0, '#5c6473');
    metal.addColorStop(1, '#181c24');
    ctx.fillStyle = metal;
    ctx.globalAlpha = 0.55;
    roundRect(ctx, wx + 18, 262, 56, 110, 20); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(wx + 22, 282 + i * 22);
      ctx.lineTo(wx + 70, 282 + i * 22);
      ctx.stroke();
    }
  }

  // rear wing
  ctx.fillStyle = '#10131b';
  roundRect(ctx, 146, 174, 328, 27, 9); ctx.fill();
  ctx.strokeStyle = '#3a4150'; ctx.lineWidth = 2;
  roundRect(ctx, 146, 174, 328, 27, 9); ctx.stroke();
  ctx.fillStyle = car.accent;
  ctx.globalAlpha = 0.9;
  roundRect(ctx, 158, 180, 304, 8, 4); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#151922';
  ctx.fillRect(188, 199, 18, 44);
  ctx.fillRect(414, 199, 18, 44);

  // chassis
  const body = ctx.createLinearGradient(0, 160, 0, 380);
  body.addColorStop(0, car.color);
  body.addColorStop(0.55, car.color);
  body.addColorStop(1, car.dark || '#7a1005');
  ctx.beginPath();
  ctx.moveTo(140, 342);
  ctx.quadraticCurveTo(132, 300, 160, 262);
  ctx.lineTo(196, 206);
  ctx.quadraticCurveTo(214, 178, 250, 170);
  ctx.lineTo(370, 170);
  ctx.quadraticCurveTo(406, 178, 424, 206);
  ctx.lineTo(460, 262);
  ctx.quadraticCurveTo(488, 300, 480, 342);
  ctx.quadraticCurveTo(478, 366, 452, 368);
  ctx.lineTo(168, 368);
  ctx.quadraticCurveTo(142, 366, 140, 342);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,8,5,.7)'; ctx.lineWidth = 3; ctx.stroke();

  // side skirts
  ctx.fillStyle = '#141821';
  ctx.beginPath(); ctx.moveTo(136, 330); ctx.quadraticCurveTo(130, 360, 156, 373); ctx.lineTo(206, 379); ctx.lineTo(200, 348); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(484, 330); ctx.quadraticCurveTo(490, 360, 464, 373); ctx.lineTo(414, 379); ctx.lineTo(420, 348); ctx.closePath(); ctx.fill();

  // cockpit
  const glass = ctx.createLinearGradient(0, 148, 0, 266);
  glass.addColorStop(0, 'rgba(220,255,255,.92)');
  glass.addColorStop(0.45, 'rgba(105,215,238,.82)');
  glass.addColorStop(1, 'rgba(15,32,46,.95)');
  ctx.beginPath();
  ctx.moveTo(236, 182);
  ctx.quadraticCurveTo(252, 152, 310, 148);
  ctx.quadraticCurveTo(368, 152, 384, 182);
  ctx.lineTo(400, 244);
  ctx.quadraticCurveTo(356, 266, 310, 266);
  ctx.quadraticCurveTo(264, 266, 220, 244);
  ctx.closePath();
  ctx.fillStyle = glass; ctx.fill();
  ctx.strokeStyle = '#071018'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = 'rgba(190,249,255,.16)';
  ctx.beginPath();
  ctx.moveTo(246, 190); ctx.quadraticCurveTo(266, 166, 310, 162);
  ctx.quadraticCurveTo(354, 166, 374, 190); ctx.lineTo(380, 208);
  ctx.quadraticCurveTo(350, 220, 310, 220); ctx.quadraticCurveTo(270, 220, 240, 208);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(7,16,24,.45)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(310, 162); ctx.lineTo(310, 220); ctx.stroke();

  // hood / deck details
  ctx.strokeStyle = 'rgba(0,0,0,.32)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(214, 268); ctx.quadraticCurveTo(250, 282, 310, 282); ctx.quadraticCurveTo(370, 282, 406, 268); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.moveTo(238, 292); ctx.lineTo(382, 292); ctx.lineTo(372, 314); ctx.lineTo(248, 314); ctx.closePath(); ctx.fill();

  // tail lights
  ctx.save();
  ctx.shadowColor = '#ff2b1a';
  ctx.shadowBlur = brake ? 26 : 12;
  ctx.fillStyle = brake ? '#ff6a4a' : '#ff2b1a';
  roundRect(ctx, 178, 318, 78, 16, 7); ctx.fill();
  roundRect(ctx, 364, 318, 78, 16, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,160,140,.55)';
  roundRect(ctx, 178, 318, 78, 7, 4); ctx.fill();
  roundRect(ctx, 364, 318, 78, 7, 4); ctx.fill();

  // number plate
  ctx.fillStyle = 'rgba(12,15,22,.9)';
  ctx.beginPath(); ctx.moveTo(268, 298); ctx.lineTo(352, 298); ctx.lineTo(344, 328); ctx.lineTo(276, 328); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 21px Arial Black, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('07', 310, 320);

  // exhausts
  ctx.fillStyle = '#0a0c11';
  roundRect(ctx, 226, 350, 34, 18, 8); ctx.fill();
  roundRect(ctx, 360, 350, 34, 18, 8); ctx.fill();
  ctx.fillStyle = car.accent;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.ellipse(243, 359, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(377, 359, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // antenna
  ctx.strokeStyle = '#0b0d12'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(420, 176); ctx.quadraticCurveTo(448, 120, 470, 92); ctx.stroke();
  ctx.fillStyle = car.accent;
  ctx.beginPath(); ctx.arc(470, 90, 8, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.beginPath(); ctx.arc(470, 90, 15, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // highlights
  ctx.strokeStyle = 'rgba(255,255,255,.48)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(164, 268); ctx.quadraticCurveTo(190, 218, 230, 200); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(456, 268); ctx.quadraticCurveTo(430, 218, 390, 200); ctx.stroke();

  // boost flames
  if (boost > 0.05) {
    const flick = 0.7 + Math.sin(now * 38) * 0.22 + Math.sin(now * 61) * 0.08;
    for (const ex of [243, 377]) {
      const flame = ctx.createLinearGradient(0, 366, 0, 366 + 90 * flick);
      flame.addColorStop(0, '#ffffff');
      flame.addColorStop(0.25, '#ffd36b');
      flame.addColorStop(0.65, '#ff6a2b');
      flame.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(ex - 13, 366);
      ctx.quadraticCurveTo(ex - 6, 400 + 30 * flick, ex, 366 + 95 * flick);
      ctx.quadraticCurveTo(ex + 6, 400 + 20 * flick, ex + 13, 366);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = car.accent;
    ctx.beginPath(); ctx.ellipse(310, 388, 150, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // drift lean / body flex
  if (drift > 0.2) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(310, 380, 180, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function drawOpponent(ctx, x, y, width, ai, fog, now) {
  drawRCCar(ctx, x, y, width, {
    color: ai.color,
    dark: '#16121e',
    accent: ai.color
  }, { opponent: true, fog, now });
}
