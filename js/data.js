// ── APEX//RIP game data ───────────────────────────────────────────────────────

export const RARITY_ORDER = ['stock', 'street', 'pro', 'prototype', 'apex'];

export const RARITIES = {
  stock:     { id: 'stock',     name: 'Stock',        short: 'STK', tier: 0, color: '#aab5c5', soft: 'rgba(170,181,197,.18)', trim: 0.35, scrap: 8,  stat: 1.00, maxLvl: 12 },
  street:    { id: 'street',    name: 'Street Tuned', short: 'STR', tier: 1, color: '#35e6ac', soft: 'rgba(53,230,172,.18)',  trim: 0.55, scrap: 12, stat: 1.10, maxLvl: 12 },
  pro:       { id: 'pro',       name: 'Pro Spec',     short: 'PRO', tier: 2, color: '#4fa6ff', soft: 'rgba(79,166,255,.18)',  trim: 0.70, scrap: 18, stat: 1.22, maxLvl: 12 },
  prototype: { id: 'prototype', name: 'Prototype',    short: 'PRT', tier: 3, color: '#b47bff', soft: 'rgba(180,123,255,.2)',  trim: 0.85, scrap: 26, stat: 1.38, maxLvl: 12 },
  apex:      { id: 'apex',      name: 'Apex',         short: 'APX', tier: 4, color: '#ffc247', soft: 'rgba(255,194,71,.2)',   trim: 1.00, scrap: 36, stat: 1.58, maxLvl: 12 },
};

export const TRAITS = {
  hacker: {
    id: 'hacker', name: 'Hacker', color: '#43ffa3', soft: 'rgba(67,255,163,.16)', mark: '</>',
    perk: '+10% RACE CREDITS', perk2: '+3 ACCEL',
    desc: 'Cracks the payout ledger and sharpens launch response.',
  },
  blackhole: {
    id: 'blackhole', name: 'Blackhole', color: '#a779ff', soft: 'rgba(167,121,255,.16)', mark: '◉',
    perk: '−18% NITRO DRAIN', perk2: '+4 GRIP',
    desc: 'Bends gravity around the chassis to hold impossible lines.',
  },
  godly: {
    id: 'godly', name: 'Godly', color: '#ffd15c', soft: 'rgba(255,209,92,.16)', mark: '✦',
    perk: '+5% TOP SPEED', perk2: '+5% WHEEL CREDITS',
    desc: 'A winged halo of downforce, fortune and pure gloss.',
  },
};

export const CARS = [
  // Stock
  { id:'dune-runner', name:'Dune Runner', rarity:'stock', color:'#c9a46c', speed:42, accel:40, grip:46, trait:null },
  { id:'civic-ghost', name:'Civic Ghost', rarity:'stock', color:'#aab7c9', speed:44, accel:44, grip:42, trait:null },
  { id:'arctic-hauler', name:'Arctic Hauler', rarity:'stock', color:'#7fa8c9', speed:38, accel:36, grip:50, trait:null },
  { id:'rust-viper', name:'Rust Viper', rarity:'stock', color:'#b0643c', speed:50, accel:42, grip:38, trait:null },
  { id:'harbor-sprint', name:'Harbor Sprint', rarity:'stock', color:'#5f8f9c', speed:46, accel:48, grip:44, trait:null },
  { id:'baja-mule', name:'Baja Mule', rarity:'stock', color:'#94945f', speed:40, accel:38, grip:52, trait:null },
  // Street Tuned
  { id:'midnight-rx', name:'Midnight RX', rarity:'street', color:'#ff3b6b', speed:56, accel:62, grip:58, trait:null },
  { id:'tokyo-s13', name:'Tokyo S13', rarity:'street', color:'#47e0ff', speed:60, accel:58, grip:62, trait:null },
  { id:'neon-fuse', name:'Neon Fuse', rarity:'street', color:'#ff6ee0', speed:64, accel:66, grip:54, trait:null },
  { id:'mud-claw', name:'Mud Claw', rarity:'street', color:'#9cff5a', speed:54, accel:55, grip:68, trait:null },
  { id:'canyon-dart', name:'Canyon Dart', rarity:'street', color:'#ff9a3d', speed:66, accel:60, grip:56, trait:null },
  { id:'ice-drift', name:'Ice Drift', rarity:'street', color:'#b8f0ff', speed:58, accel:64, grip:66, trait:null },
  // Pro Spec
  { id:'cyber-vector', name:'Cyber Vector', rarity:'pro', color:'#2fe8b7', speed:72, accel:74, grip:68, trait:'hacker' },
  { id:'monaco-gt', name:'Monaco GT', rarity:'pro', color:'#ffcf5c', speed:76, accel:70, grip:72, trait:null },
  { id:'magma-sting', name:'Magma Sting', rarity:'pro', color:'#ff5a2d', speed:74, accel:68, grip:78, trait:null },
  { id:'solaris-9', name:'Solaris 9', rarity:'pro', color:'#ffb020', speed:78, accel:76, grip:66, trait:'godly' },
  { id:'tundra-fang', name:'Tundra Fang', rarity:'pro', color:'#86e4ff', speed:70, accel:72, grip:80, trait:'blackhole' },
  { id:'glitch-r', name:'Glitch R', rarity:'pro', color:'#b56bff', speed:75, accel:80, grip:70, trait:'hacker' },
  // Prototype
  { id:'blackhole-wraith', name:'Blackhole Wraith', rarity:'prototype', color:'#7d5cff', speed:84, accel:82, grip:88, trait:'blackhole' },
  { id:'godly-seraph', name:'Godly Seraph', rarity:'prototype', color:'#ffd76a', speed:88, accel:84, grip:80, trait:'godly' },
  { id:'void-shift', name:'Void Shift', rarity:'prototype', color:'#5a3bd0', speed:82, accel:86, grip:84, trait:'blackhole' },
  { id:'quantum-ray', name:'Quantum Ray', rarity:'prototype', color:'#39ffc4', speed:86, accel:88, grip:78, trait:'hacker' },
  { id:'eclipse-proto', name:'Eclipse Proto', rarity:'prototype', color:'#ff4fd8', speed:80, accel:80, grip:90, trait:null },
  { id:'ion-tempest', name:'Ion Tempest', rarity:'prototype', color:'#4fc3ff', speed:85, accel:83, grip:82, trait:'godly' },
  // Apex
  { id:'apex-zero', name:'Apex Zero', rarity:'apex', color:'#f2f6ff', speed:94, accel:92, grip:90, trait:'godly' },
  { id:'celestial-king', name:'Celestial King', rarity:'apex', color:'#ffcf6b', speed:92, accel:88, grip:94, trait:'godly' },
  { id:'singularity', name:'Singularity', rarity:'apex', color:'#9a5cff', speed:93, accel:94, grip:88, trait:'blackhole' },
  { id:'solar-deity', name:'Solar Deity', rarity:'apex', color:'#ff8a2a', speed:96, accel:90, grip:86, trait:'godly' },
  { id:'nightfall-sovereign', name:'Nightfall Sovereign', rarity:'apex', color:'#ff3d6e', speed:90, accel:93, grip:93, trait:'hacker' },
  { id:'overdrive-prime', name:'Overdrive Prime', rarity:'apex', color:'#39ffd0', speed:91, accel:96, grip:90, trait:'hacker' },
];

export const CARS_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));
export const CARS_BY_RARITY = RARITY_ORDER.reduce((acc, r) => {
  acc[r] = CARS.filter(c => c.rarity === r);
  return acc;
}, {});

// ── Packs ────────────────────────────────────────────────────────────────────
// odds are percentages aligned to RARITY_ORDER and must total 100.
export const PACKS = [
  { id:'midnight-circuit', name:'Midnight Circuit', tag:'NIGHT RUN', price:260, color:'#ff3b6b', color2:'#4a0c30', tier:'STARTER', odds:[58,28,10,3,1], focus:['midnight-rx','nightfall-sovereign'] },
  { id:'tokyo-drift', name:'Tokyo Drift', tag:'TOUGE', price:320, color:'#47e0ff', color2:'#082a40', tier:'STARTER', odds:[56,29,11,3,1], focus:['tokyo-s13','neon-fuse'] },
  { id:'desert-dunes', name:'Desert Dunes', tag:'SAND', price:300, color:'#ffb03b', color2:'#3d2208', tier:'STARTER', odds:[60,27,10,2.5,0.5], focus:['dune-runner','canyon-dart'] },
  { id:'cyber-hacker', name:'Cyber Hacker', tag:'NETRUN', price:480, color:'#39ffc4', color2:'#052b22', tier:'STANDARD', odds:[40,34,17,7,2], focus:['cyber-vector','quantum-ray'] },
  { id:'blackhole-void', name:'Blackhole Void', tag:'EVENT HORIZON', price:620, color:'#9a5cff', color2:'#240a45', tier:'STANDARD', odds:[32,33,21,10,4], focus:['blackhole-wraith','void-shift'] },
  { id:'godly-celestial', name:'Godly Celestial', tag:'ASCEND', price:780, color:'#ffd76a', color2:'#3a2a08', tier:'PREMIUM', odds:[24,31,26,13,6], focus:['godly-seraph','celestial-king'] },
  { id:'arctic-ice', name:'Arctic Ice', tag:'SUB ZERO', price:360, color:'#b8f0ff', color2:'#0a2b3a', tier:'STARTER', odds:[58,28,10,3,1], focus:['ice-drift','arctic-hauler'] },
  { id:'volcanic-magma', name:'Volcanic Magma', tag:'MELTDOWN', price:520, color:'#ff5a2d', color2:'#3d0d05', tier:'STANDARD', odds:[44,32,16,6,2], focus:['magma-sting','solar-deity'] },
  { id:'monaco-harbor', name:'Monaco Harbor', tag:'GRAND PRIX', price:560, color:'#ffcf5c', color2:'#2b2208', tier:'STANDARD', odds:[42,33,17,6.5,1.5], focus:['monaco-gt','harbor-sprint'] },
  { id:'red-rock-canyon', name:'Red Rock Canyon', tag:'DUST DEVIL', price:340, color:'#ff6b3d', color2:'#3a1408', tier:'STARTER', odds:[59,28,10,2.5,0.5], focus:['canyon-dart','rust-viper'] },
  { id:'rainforest-mud', name:'Rainforest Mud', tag:'WET LINE', price:380, color:'#7bff5c', color2:'#0d3008', tier:'STARTER', odds:[57,29,10,3,1], focus:['mud-claw','baja-mule'] },
  { id:'cyberpunk-industrial', name:'Cyberpunk Industrial', tag:'GRID 77', price:720, color:'#00e5ff', color2:'#04252e', tier:'PREMIUM', odds:[28,32,24,11,5], focus:['glitch-r','ion-tempest'] },
  { id:'apex-endurance', name:'Apex Endurance', tag:'24H', price:940, color:'#7cff9b', color2:'#0a2c14', tier:'ELITE', odds:[18,29,29,16,8], focus:['apex-zero','overdrive-prime'] },
  { id:'neon-touge', name:'Neon Touge', tag:'DOWNHILL', price:860, color:'#ff2fd0', color2:'#2f0829', tier:'ELITE', odds:[22,31,27,14,6], focus:['neon-fuse','nightfall-sovereign'] },
  { id:'gravity-sink', name:'Gravity Sink', tag:'ZERO G', price:800, color:'#5a8cff', color2:'#0a1640', tier:'PREMIUM', odds:[24,31,26,13,6], focus:['singularity','eclipse-proto'] },
  { id:'glitch-overdrive', name:'Glitch Overdrive', tag:'SYS FAIL', price:680, color:'#b56bff', color2:'#220a3a', tier:'PREMIUM', odds:[30,33,23,10,4], focus:['glitch-r','void-shift'] },
  { id:'baja-trophy', name:'Baja Trophy', tag:'DESERT RALLY', price:460, color:'#ff9a3d', color2:'#3a1c05', tier:'STANDARD', odds:[46,32,15,5,2], focus:['baja-mule','tundra-fang'] },
  { id:'solar-prototype', name:'Solar Prototype', tag:'STAR CORE', price:1100, color:'#ff8a2a', color2:'#3d1c04', tier:'ELITE', odds:[12,27,32,19,10], focus:['solar-deity','solaris-9'] },
];

export const PACKS_BY_ID = Object.fromEntries(PACKS.map(p => [p.id, p]));

// ── Tracks ───────────────────────────────────────────────────────────────────
export const TRACKS = [
  { id:'midnight-touge', name:'Midnight Touge', theme:'mountain', reward:140, ai:31.5, diff:1, color:'#ff3b6b', color2:'#2c0b1a', bg:'#080510', fog:'#160818', road:'#15121b', sky:'#1a0a16' },
  { id:'baja-dust', name:'Baja Dust Dunes', theme:'desert', reward:120, ai:31.8, diff:1, color:'#ffb03b', color2:'#3a2207', bg:'#0d0804', fog:'#2a1a08', road:'#241b12', sky:'#2c1c0a' },
  { id:'neon-tokyo', name:'Neon Tokyo Grid', theme:'city', reward:170, ai:33.0, diff:2, color:'#ff2fd0', color2:'#260828', bg:'#070412', fog:'#1b0720', road:'#141221', sky:'#1c0824' },
  { id:'cyberpunk-industrial', name:'Cyberpunk Industrial', theme:'industry', reward:180, ai:33.6, diff:2, color:'#00e5ff', color2:'#06242c', bg:'#030a0c', fog:'#051c22', road:'#121619', sky:'#062a32' },
  { id:'arctic-ice', name:'Arctic Ice Sprint', theme:'ice', reward:150, ai:32.4, diff:2, color:'#9fe8ff', color2:'#0b2a38', bg:'#06131c', fog:'#0b2838', road:'#1a2830', sky:'#0d3142' },
  { id:'red-rock-canyon', name:'Red Rock Canyon', theme:'canyon', reward:130, ai:31.9, diff:1, color:'#ff6b3d', color2:'#351309', bg:'#0b0503', fog:'#260d07', road:'#1c1512', sky:'#2c1008' },
  { id:'monaco-harbor', name:'Monaco Harbor Circuit', theme:'harbor', reward:190, ai:34.3, diff:3, color:'#ffd04a', color2:'#2e2608', bg:'#050b14', fog:'#0b1c30', road:'#141923', sky:'#0a1f36' },
  { id:'apex-endurance', name:'Apex Endurance Track', theme:'stadium', reward:220, ai:35.3, diff:3, color:'#7cff9b', color2:'#0b2c14', bg:'#040c07', fog:'#0a2814', road:'#141b17', sky:'#0b3018' },
  { id:'hacker-digital-void', name:'Hacker Digital Void', theme:'digital', reward:200, ai:34.8, diff:3, color:'#39ff88', color2:'#052a18', bg:'#020c06', fog:'#042014', road:'#0e1712', sky:'#062a18' },
  { id:'blackhole-gravity-sink', name:'Blackhole Gravity Sink', theme:'void', reward:210, ai:35.0, diff:3, color:'#a05cff', color2:'#1d0738', bg:'#05020d', fog:'#130826', road:'#12101d', sky:'#180a30' },
  { id:'rainforest-mud', name:'Rainforest Mud Run', theme:'jungle', reward:140, ai:32.2, diff:2, color:'#7bff5c', color2:'#0a2607', bg:'#040b04', fog:'#0b2008', road:'#161c13', sky:'#0c2608' },
  { id:'volcanic-magma', name:'Volcanic Magma Crater', theme:'volcano', reward:200, ai:34.6, diff:3, color:'#ff5a1f', color2:'#3a0c03', bg:'#0b0302', fog:'#2a0a04', road:'#1d1412', sky:'#300c05' },
];

export const TRACKS_BY_ID = Object.fromEntries(TRACKS.map(t => [t.id, t]));

// ── Wheel ────────────────────────────────────────────────────────────────────
export const WHEEL_REWARDS = [
  { id:'cr60',  kind:'credits', amount:60,  label:'60 CR',    short:'CASH',   color:'#2b2f55' },
  { id:'cr120', kind:'credits', amount:120, label:'120 CR',   short:'CASH',   color:'#3d2547' },
  { id:'bp',    kind:'blueprint', amount:1, label:'BLUEPRINT',short:'BLUE',   color:'#173f52' },
  { id:'cr200', kind:'credits', amount:200, label:'200 CR',   short:'CASH',   color:'#402b4e' },
  { id:'scrap', kind:'scrap',   amount:25,  label:'25 SCRAP', short:'SCRAP',  color:'#1e4636' },
  { id:'cr80',  kind:'credits', amount:80,  label:'80 CR',    short:'CASH',   color:'#333057' },
  { id:'core',  kind:'core',    amount:1,   label:'FUSION CORE', short:'CORE',color:'#3b2a5e' },
  { id:'cr350', kind:'credits', amount:350, label:'350 CR',   short:'JACKPOT',color:'#523712' },
];

export const WHEEL_COST = 150;
export const FREE_SPIN_MS = 12 * 60 * 1000;

export const RACE_LENGTH = 480;
export const MAX_LEVEL = 12;

export const UPGRADE_BASE_COST = 75;
export const UPGRADE_COST_STEP = 45;

export function upgradeCost(level) {
  return Math.round((UPGRADE_BASE_COST + Math.max(0, level) * UPGRADE_COST_STEP) / 5) * 5;
}

export function statWithLevel(base, level) {
  return Math.round((base + Math.max(0, Math.min(MAX_LEVEL, level)) * 1.8) * 10) / 10;
}

export function carDisplayStats(car, levels) {
  const lv = levels || { speed:0, accel:0, grip:0 };
  return {
    speed: statWithLevel(car.speed, lv.speed),
    accel: statWithLevel(car.accel, lv.accel),
    grip: statWithLevel(car.grip, lv.grip),
  };
}

export function formatNum(n) {
  n = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.round(n).toLocaleString('en-US');
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, '0')}` : `${s.toFixed(2)}s`;
}

export function carSvg(car, w = 120, h = 48) {
  const glass = '#0a1220';
  return `<svg viewBox="0 0 120 48" width="${w}" height="${h}" aria-hidden="true">
    <defs><linearGradient id="g-${car.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lighten(car.color, 0.35)}"/><stop offset=".55" stop-color="${car.color}"/><stop offset="1" stop-color="${darken(car.color, 0.45)}"/>
    </linearGradient></defs>
    <ellipse cx="60" cy="42" rx="46" ry="4" fill="rgba(0,0,0,.45)"/>
    <path d="M12 33c0-4 3-6 7-6l7-1 10-9c3-3 7-4 11-4h15c5 0 9 2 12 6l5 6 15 3c4 1 7 3 7 6v3c0 2-2 3-4 3H16c-3 0-4-2-4-4v-3Z" fill="url(#g-${car.id})" stroke="rgba(255,255,255,.24)" stroke-width=".7"/>
    <path d="M38 26l8-7c2-2 5-3 8-3h9c4 0 7 1 9 4l4 5H38Z" fill="${glass}" opacity=".92"/>
    <path d="M56 17v9" stroke="rgba(180,220,255,.2)" stroke-width=".8"/>
    <path d="M12 32h93" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
    <circle cx="32" cy="36" r="8.5" fill="#080b10" stroke="rgba(255,255,255,.18)" stroke-width="1.2"/>
    <circle cx="32" cy="36" r="3.6" fill="${car.rarity === 'apex' ? '#ffc247' : '#b9c6d7'}"/>
    <circle cx="91" cy="36" r="8.5" fill="#080b10" stroke="rgba(255,255,255,.18)" stroke-width="1.2"/>
    <circle cx="91" cy="36" r="3.6" fill="${car.rarity === 'apex' ? '#ffc247' : '#b9c6d7'}"/>
    <path d="M106 27l7 2" stroke="#fff2c4" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M13 29l-3 1" stroke="#ff5577" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  </svg>`;
}

export function lighten(hex, amt = 0.25) {
  const c = parseHex(hex);
  return `rgb(${Math.min(255, Math.round(c[0] + (255 - c[0]) * amt))},${Math.min(255, Math.round(c[1] + (255 - c[1]) * amt))},${Math.min(255, Math.round(c[2] + (255 - c[2]) * amt))})`;
}
export function darken(hex, amt = 0.3) {
  const c = parseHex(hex);
  return `rgb(${Math.max(0, Math.round(c[0] * (1 - amt)))},${Math.max(0, Math.round(c[1] * (1 - amt)))},${Math.max(0, Math.round(c[2] * (1 - amt)))})`;
}
export function parseHex(hex) {
  const h = String(hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex, a = 1) {
  const c = parseHex(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
