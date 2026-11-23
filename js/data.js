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
  { id:'midnight-circuit', name:'Midnight Circuit', tag:'NIGHT RUN', price:260, color:'#ff3b6b', color2:'#4a0c30', tier:'STARTER', element:'neon', odds:[58,28,10,3,1], focus:['midnight-rx','nightfall-sovereign'] },
  { id:'tokyo-drift', name:'Tokyo Drift', tag:'TOUGE', price:320, color:'#47e0ff', color2:'#082a40', tier:'STARTER', element:'neon', odds:[56,29,11,3,1], focus:['tokyo-s13','neon-fuse'] },
  { id:'desert-dunes', name:'Desert Dunes', tag:'SAND', price:300, color:'#ffb03b', color2:'#3d2208', tier:'STARTER', element:'dust', odds:[60,27,10,2.5,0.5], focus:['dune-runner','canyon-dart'] },
  { id:'cyber-hacker', name:'Cyber Hacker', tag:'NETRUN', price:480, color:'#39ffc4', color2:'#052b22', tier:'STANDARD', element:'electric', odds:[40,34,17,7,2], focus:['cyber-vector','quantum-ray'] },
  { id:'blackhole-void', name:'Blackhole Void', tag:'EVENT HORIZON', price:620, color:'#9a5cff', color2:'#240a45', tier:'STANDARD', element:'cosmic', odds:[32,33,21,10,4], focus:['blackhole-wraith','void-shift'] },
  { id:'godly-celestial', name:'Godly Celestial', tag:'ASCEND', price:780, color:'#ffd76a', color2:'#3a2a08', tier:'PREMIUM', element:'solar', odds:[24,31,26,13,6], focus:['godly-seraph','celestial-king'] },
  { id:'arctic-ice', name:'Arctic Ice', tag:'SUB ZERO', price:360, color:'#b8f0ff', color2:'#0a2b3a', tier:'STARTER', element:'ice', odds:[58,28,10,3,1], focus:['ice-drift','arctic-hauler'] },
  { id:'volcanic-magma', name:'Volcanic Magma', tag:'MELTDOWN', price:520, color:'#ff5a2d', color2:'#3d0d05', tier:'STANDARD', element:'ember', odds:[44,32,16,6,2], focus:['magma-sting','solar-deity'] },
  { id:'monaco-harbor', name:'Monaco Harbor', tag:'GRAND PRIX', price:560, color:'#ffcf5c', color2:'#2b2208', tier:'STANDARD', element:'sparks', odds:[42,33,17,6.5,1.5], focus:['monaco-gt','harbor-sprint'] },
  { id:'red-rock-canyon', name:'Red Rock Canyon', tag:'DUST DEVIL', price:340, color:'#ff6b3d', color2:'#3a1408', tier:'STARTER', element:'dust', odds:[59,28,10,2.5,0.5], focus:['canyon-dart','rust-viper'] },
  { id:'rainforest-mud', name:'Rainforest Mud', tag:'WET LINE', price:380, color:'#7bff5c', color2:'#0d3008', tier:'STARTER', element:'rain', odds:[57,29,10,3,1], focus:['mud-claw','baja-mule'] },
  { id:'cyberpunk-industrial', name:'Cyberpunk Industrial', tag:'GRID 77', price:720, color:'#00e5ff', color2:'#04252e', tier:'PREMIUM', element:'electric', odds:[28,32,24,11,5], focus:['glitch-r','ion-tempest'] },
  { id:'apex-endurance', name:'Apex Endurance', tag:'24H', price:940, color:'#7cff9b', color2:'#0a2c14', tier:'ELITE', element:'sparks', odds:[18,29,29,16,8], focus:['apex-zero','overdrive-prime'] },
  { id:'neon-touge', name:'Neon Touge', tag:'DOWNHILL', price:860, color:'#ff2fd0', color2:'#2f0829', tier:'ELITE', element:'neon', odds:[22,31,27,14,6], focus:['neon-fuse','nightfall-sovereign'] },
  { id:'gravity-sink', name:'Gravity Sink', tag:'ZERO G', price:800, color:'#5a8cff', color2:'#0a1640', tier:'PREMIUM', element:'cosmic', odds:[24,31,26,13,6], focus:['singularity','eclipse-proto'] },
  { id:'glitch-overdrive', name:'Glitch Overdrive', tag:'SYS FAIL', price:680, color:'#b56bff', color2:'#220a3a', tier:'PREMIUM', element:'glitch', odds:[30,33,23,10,4], focus:['glitch-r','void-shift'] },
  { id:'baja-trophy', name:'Baja Trophy', tag:'DESERT RALLY', price:460, color:'#ff9a3d', color2:'#3a1c05', tier:'STANDARD', element:'dust', odds:[46,32,15,5,2], focus:['baja-mule','tundra-fang'] },
  { id:'solar-prototype', name:'Solar Prototype', tag:'STAR CORE', price:1100, color:'#ff8a2a', color2:'#3d1c04', tier:'ELITE', element:'solar', odds:[12,27,32,19,10], focus:['solar-deity','solaris-9'] },
];

export const COSMETIC_PACK = {
  id: 'cosmetics-drop', name: 'Cosmetics Drop', tag: 'STYLE LAB', price: 520,
  color: '#ff7ae0', color2: '#2a0924', tier: 'COSMETIC', element: 'prism',
  kind: 'cosmetic', odds: [0, 0, 0, 0, 0], focus: [],
};

export const PACKS_BY_ID = Object.fromEntries(PACKS.map(p => [p.id, p]));
PACKS_BY_ID[COSMETIC_PACK.id] = COSMETIC_PACK;

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
  { id:'sunset-coast', name:'Sunset Coast Sprint', theme:'harbor', reward:160, ai:32.5, diff:2, color:'#ff9a5a', color2:'#3a1808', bg:'#0d0704', fog:'#2a160a', road:'#211912', sky:'#3a1a0a' },
  { id:'alpine-frost', name:'Alpine Frost Pass', theme:'ice', reward:175, ai:33.0, diff:2, color:'#9fe8ff', color2:'#0b2a38', bg:'#041018', fog:'#0a2838', road:'#18262e', sky:'#0a3040' },
  { id:'lunar-terminus', name:'Lunar Terminus', theme:'void', reward:230, ai:35.6, diff:3, color:'#b9a6ff', color2:'#1c1238', bg:'#04030a', fog:'#161028', road:'#171522', sky:'#1c1436' },
  { id:'dockside-night', name:'Dockside Night Run', theme:'industry', reward:185, ai:33.8, diff:2, color:'#5ce0ff', color2:'#06242c', bg:'#03090c', fog:'#071c22', road:'#11181c', sky:'#08242c' },
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

// ── Weather ──────────────────────────────────────────────────────────────────
// kind drives shared lightweight particle motion; tint/fog values are blended
// into the live 3D atmosphere so races and menus stay in the same mood.
export const WEATHERS = [
  { id:'midnight-clear', name:'Midnight Clear', kind:'clear', price:0, color:'#4fe3ff', color2:'#07131f', tint:'#07111d', mystical:false, desc:'Cold stars, clean air and maximum visibility.', fogNear:30, fogFar:78 },
  { id:'neon-rain', name:'Neon Rain & Wet Asphalt', kind:'rain', price:220, color:'#ff3dd0', color2:'#140525', tint:'#160826', mystical:false, desc:'Neon sheets and mirror-wet tarmac.', fogNear:24, fogFar:62 },
  { id:'dense-fog', name:'Dense Fog / Night Mist', kind:'fog', price:240, color:'#9fb4cf', color2:'#0a1018', tint:'#131a24', mystical:false, desc:'Low visibility with soft silver haze.', fogNear:10, fogFar:34 },
  { id:'desert-sandstorm', name:'Desert Sandstorm / Dust Haze', kind:'sand', price:260, color:'#ffb03b', color2:'#2a1705', tint:'#221407', mystical:false, desc:'Blowing grit and a burnt amber horizon.', fogNear:15, fogFar:48 },
  { id:'arctic-blizzard', name:'Arctic Blizzard / Snowfall', kind:'snow', price:280, color:'#c8f6ff', color2:'#0a2230', tint:'#0b1c28', mystical:false, desc:'Drifting flakes and frozen whiteout air.', fogNear:14, fogFar:44 },
  { id:'thunderstorm', name:'Thunderstorm & Lightning Flashes', kind:'storm', price:340, color:'#aabfff', color2:'#0a0e22', tint:'#0b1024', mystical:false, desc:'Heavy rain, rolling cloud and hard lightning.', fogNear:16, fogFar:50 },
  { id:'aurora-borealis', name:'Aurora Borealis Night', kind:'aurora', price:420, color:'#43ffc4', color2:'#081f24', tint:'#071c22', mystical:true, desc:'A slow green-violet curtain across the sky.', fogNear:26, fogFar:72 },
  { id:'volcanic-ash', name:'Volcanic Ash & Ember Drift', kind:'ash', price:320, color:'#ff6a2a', color2:'#2a0c04', tint:'#1f0904', mystical:false, desc:'Rising sparks under a charcoal ash veil.', fogNear:18, fogFar:54 },
  { id:'acid-cyber-rain', name:'Acid / Cyber Grid Rain', kind:'acid', price:360, color:'#a8ff3d', color2:'#0c2205', tint:'#0c1e08', mystical:false, desc:'Corrosive drizzle over a humming data grid.', fogNear:18, fogFar:52 },
  { id:'gravity-distortion', name:'Gravity Distortion / Cosmic Dust', kind:'cosmic', price:480, color:'#9a6bff', color2:'#160a30', tint:'#100826', mystical:true, desc:'Orbiting motes and bent-light dust lanes.', fogNear:22, fogFar:64 },
  { id:'monsoon-downpour', name:'Monsoon Downpour', kind:'monsoon', price:300, color:'#6bc8ff', color2:'#061a2c', tint:'#071a2a', mystical:false, desc:'Warm vertical rain with a silver curtain.', fogNear:12, fogFar:40 },
  { id:'sunset-dusk', name:'Sunset / Golden Dusk Glow', kind:'sunset', price:260, color:'#ffb15c', color2:'#2a1407', tint:'#221208', mystical:false, desc:'Golden rim light and a soft copper horizon.', fogNear:28, fogFar:76 },
  { id:'canyon-heat', name:'Canyon Heat Shimmer', kind:'heat', price:280, color:'#ffad4f', color2:'#281305', tint:'#211006', mystical:false, desc:'Rising heat waves and floating dust.', fogNear:22, fogFar:58 },
  { id:'industrial-smog', name:'Industrial Smog & Steam Plumes', kind:'smog', price:300, color:'#b9c4cf', color2:'#10151a', tint:'#171c22', mystical:false, desc:'Thick steam, oily haze and sodium glow.', fogNear:12, fogFar:38 },
  { id:'rainforest-mist', name:'Rainforest Mist & Drizzling Canopy', kind:'mist', price:280, color:'#74ffb7', color2:'#062015', tint:'#071e12', mystical:false, desc:'Warm drizzle threading through wet leaves.', fogNear:14, fogFar:42 },
  { id:'black-ice', name:'Black Ice / Glazed Frost', kind:'ice', price:380, color:'#bfefff', color2:'#081a24', tint:'#081822', mystical:false, desc:'Glass frost, pale mist and frozen sparkle.', fogNear:18, fogFar:52 },
  { id:'solar-flare', name:'Solar Flare / Golden Rim', kind:'solar', price:520, color:'#ffd15c', color2:'#2a1c05', tint:'#261a05', mystical:true, desc:'A radiant gold rim and drifting solar sparks.', fogNear:26, fogFar:74 },
  { id:'overcast-slate', name:'Overcast Slate Storm', kind:'overcast', price:200, color:'#9eaec2', color2:'#0d1218', tint:'#141a20', mystical:false, desc:'Flat slate light with a threat of rain.', fogNear:20, fogFar:56 },
  { id:'meteor-shower', name:'Meteor Shower Night', kind:'meteor', price:460, color:'#ffd8a0', color2:'#120c22', tint:'#0e0a1c', mystical:true, desc:'Fast falling streaks under a deep indigo sky.', fogNear:28, fogFar:80 },
  { id:'low-cloud-ridge', name:'Low-Cloud Mountain Ridge', kind:'clouds', price:240, color:'#a9c0d8', color2:'#0b131c', tint:'#121a22', mystical:false, desc:'Cloud banks clinging to a cold ridge line.', fogNear:16, fogFar:48 },
  { id:'astral-eclipse', name:'Astral Eclipse & Spirit Mist', kind:'eclipse', price:620, color:'#c39bff', color2:'#170a2a', tint:'#150929', mystical:true, desc:'A dark corona and pale spirit fog.', fogNear:20, fogFar:58 },
  { id:'arcane-rune-storm', name:'Arcane Rune Storm', kind:'arcane', price:680, color:'#ff73ff', color2:'#220826', tint:'#200826', mystical:true, desc:'Rune-lit rain and flickering violet glyphs.', fogNear:16, fogFar:48 },
  { id:'celestial-starfall', name:'Celestial Starfall & Nebula Veil', kind:'starfall', price:760, color:'#ffd8ff', color2:'#180a24', tint:'#170a24', mystical:true, desc:'Starfall sparks inside a soft nebula veil.', fogNear:26, fogFar:76 },
  { id:'phantom-wisp', name:'Phantom Wisp Fog', kind:'phantom', price:560, color:'#8dffe4', color2:'#061b1a', tint:'#081d1c', mystical:true, desc:'Green wisps breathing through low mist.', fogNear:10, fogFar:34 },
  { id:'chrono-rift', name:'Chrono Rift / Prism Shards', kind:'chrono', price:880, color:'#7fe8ff', color2:'#0a1a2a', tint:'#0a1828', mystical:true, desc:'Fractured time, prism shards and blue static.', fogNear:18, fogFar:58 },
];

export const WEATHERS_BY_ID = Object.fromEntries(WEATHERS.map(w => [w.id, w]));

// ── Global background themes ────────────────────────────────────────────────
export const BACKGROUND_THEMES = [
  { id:'midnight-void', name:'Midnight Void', price:0, color:'#4fe3ff', bg:'#05060b', fog:'#090c15', hemiSky:'#5b83b8', hemiGround:'#05060a', key:'#ffffff', dust:'#9bd8ff', desc:'The original cold chrome void.' },
  { id:'neon-metro', name:'Neon Metro', price:300, color:'#ff3d86', bg:'#080414', fog:'#180a2c', hemiSky:'#8b63ff', hemiGround:'#08050e', key:'#ffe4ff', dust:'#ff8fe0', desc:'Magenta haze and violet city bounce.' },
  { id:'solar-dusk', name:'Solar Dusk', price:320, color:'#ffb03b', bg:'#0c0603', fog:'#2a1508', hemiSky:'#ff9a5a', hemiGround:'#0c0704', key:'#ffe3b0', dust:'#ffcb8a', desc:'Warm amber key light and dusk bronze.' },
  { id:'arctic-glass', name:'Arctic Glass', price:340, color:'#9fe8ff', bg:'#041018', fog:'#0a2a3a', hemiSky:'#8fe4ff', hemiGround:'#041016', key:'#ffffff', dust:'#c8f6ff', desc:'Pale ice bounce and blue-black air.' },
  { id:'ember-core', name:'Ember Core', price:360, color:'#ff5a2d', bg:'#0c0402', fog:'#2a0a04', hemiSky:'#ff6a3a', hemiGround:'#0c0402', key:'#ffd0b0', dust:'#ff9a6a', desc:'Furnace glow with carbon shadows.' },
  { id:'arcane-violet', name:'Arcane Violet', price:480, color:'#b47bff', bg:'#080314', fog:'#1c0a2e', hemiSky:'#a06bff', hemiGround:'#070312', key:'#f0d9ff', dust:'#cba8ff', desc:'Rune-violet ambient and soft occult glow.' },
  { id:'verdant-signal', name:'Verdant Signal', price:380, color:'#43ffa3', bg:'#030c06', fog:'#0a2814', hemiSky:'#5cff9d', hemiGround:'#030c06', key:'#eafff2', dust:'#9dffd0', desc:'Bio-lime signals in a deep forest dark.' },
  { id:'chrome-storm', name:'Chrome Storm', price:500, color:'#cfe4ff', bg:'#050810', fog:'#101a2a', hemiSky:'#9fb6d9', hemiGround:'#050810', key:'#ffffff', dust:'#dbe9ff', desc:'Steel overcast with electric chrome rim.' },
];

export const THEMES_BY_ID = Object.fromEntries(BACKGROUND_THEMES.map(t => [t.id, t]));

// ── Car cosmetics ───────────────────────────────────────────────────────────
export const COSMETICS = [
  { id:'wet-mirror', name:'Wet Mirror Clearcoat', slot:'FINISH', kind:'finish', mystical:false, color:'#dff4ff', desc:'Liquid-glass clearcoat with razor reflections.' },
  { id:'holo-prism', name:'Holographic Prismatic Foil', slot:'FINISH', kind:'prism', mystical:true, color:'#ff8df0', desc:'Shift-through-spectrum foil wrap.' },
  { id:'forged-carbon', name:'Forged Carbon Weave', slot:'FINISH', kind:'finish', bodyColor:'#252a31', mystical:false, color:'#b9c6d7', desc:'Matte-forged carbon under a deep gloss.' },
  { id:'candy-crimson', name:'Candy Crimson Chrome', slot:'FINISH', kind:'finish', bodyColor:'#b30d35', mystical:false, color:'#ff3d6e', desc:'Layered candy red over mirror chrome.' },
  { id:'obsidian-void', name:'Obsidian Void Gloss', slot:'FINISH', kind:'finish', bodyColor:'#07080e', mystical:true, color:'#a779ff', desc:'Black-hole black with violet edge reflections.' },
  { id:'neon-underglow', name:'Neon Underglow', slot:'GLOW', kind:'underglow', mystical:false, color:'#4fe3ff', desc:'Cyan floor glow that outlines the chassis.' },
  { id:'afterburner', name:'Afterburner Exhaust Flames', slot:'EXHAUST', kind:'exhaust', mystical:true, color:'#ff8a2a', desc:'Twin jet flames on every throttle blip.' },
  { id:'swan-wing', name:'GT Swan-Neck Wing', slot:'WING', kind:'wing', mystical:false, color:'#b9c6d7', desc:'Sculpted swan-neck rear wing.' },
  { id:'widebody', name:'Widebody Fenders', slot:'BODY', kind:'widebody', mystical:false, color:'#d9e4f7', desc:'Flared arches over every wheel.' },
  { id:'splitter-canards', name:'Front Splitter & Canards', slot:'AERO', kind:'aero', mystical:false, color:'#b9c6d7', desc:'Aggressive splitter and twin canards.' },
  { id:'turbine-rims', name:'Deep-Dish / Turbine Rims', slot:'WHEELS', kind:'wheels', mystical:false, color:'#ffe0a0', desc:'Deep-dish rims with turbine spokes.' },
  { id:'glow-calipers', name:'Glowing Brake Calipers & Rotors', slot:'BRAKES', kind:'calipers', mystical:false, color:'#ff5a2d', desc:'Incandescent calipers behind each rim.' },
  { id:'cyber-blades', name:'Cyber Blade Headlights', slot:'LIGHTS', kind:'headlights', mystical:true, color:'#8dffff', desc:'Split blade beams with cold cyan edge.' },
  { id:'neon-tail-bar', name:'Full-Width Neon Taillight Bar', slot:'TAIL', kind:'taillight', mystical:false, color:'#ff3d86', desc:'One continuous neon rear bar.' },
  { id:'roof-scoop', name:'Roof Scoop / Vortex Roof Rails', slot:'ROOF', kind:'roof', mystical:false, color:'#d9e4f7', desc:'Roof scoop and vortex rails.' },
  { id:'louver-diffuser', name:'Louvered Rear Window / Diffuser', slot:'DIFFUSER', kind:'diffuser', mystical:false, color:'#20252e', desc:'Rear louvres and a finned diffuser.' },
  { id:'matrix-overlay', name:'Hacker Matrix Wireframe Overlay', slot:'OVERLAY', kind:'matrix', mystical:true, color:'#43ffa3', desc:'Live wireframe shell and mono glyph rings.' },
  { id:'gravity-orbit', name:'Blackhole Gravity Orbit Ring', slot:'ORBIT', kind:'orbit', mystical:true, color:'#a779ff', desc:'Two counter-spinning gravity rings.' },
  { id:'godly-halo', name:'Godly Radiant Halo & Wingtips', slot:'HALO', kind:'halo', mystical:true, color:'#ffd15c', desc:'Gold halo and luminous wingtips.' },
  { id:'slipstream', name:'Speed-Line Slipstream Trail', slot:'TRAIL', kind:'trail', mystical:true, color:'#8de7ff', desc:'Frozen speed lines trailing the body.' },
  { id:'astral-underglow', name:'Astral Spirit Underglow', slot:'SPIRIT', kind:'spirit', mystical:true, color:'#8dffe4', desc:'Ghost-green aura under the chassis.' },
  { id:'rune-gloss', name:'Rune-Etched Gloss Clearcoat', slot:'RUNES', kind:'runes', mystical:true, color:'#c39bff', desc:'Etched runes lit under a gloss surface.' },
  { id:'celestial-trail', name:'Celestial Halo & Star-Trail Spoils', slot:'CELESTIAL', kind:'celestial', mystical:true, color:'#ffe4a0', desc:'Halo, gems and a star-trail wake.' },
  { id:'phantom-rim', name:'Phantom Specter Rim & Tail Glow', slot:'PHANTOM', kind:'phantom', mystical:true, color:'#b8ffef', desc:'Specter rims and a breathing tail glow.' },
  { id:'chrono-prism', name:'Chrono Prism Foil', slot:'PRISM', kind:'chrono', mystical:true, color:'#7fe8ff', desc:'Fractured prism foil with time-slip shimmer.' },
];

export const COSMETICS_BY_ID = Object.fromEntries(COSMETICS.map(c => [c.id, c]));
export const COSMETIC_PACK_PRICE = COSMETIC_PACK.price;

export const RACE_LENGTH = 480;
export const MAX_LEVEL = 12;

// Blueprint progression. A car is unlocked at 1 star, then spends its own
// blueprints to reach 2 and 3 stars. Rarer cars ask for a little more.
export const BP_UNLOCK_1STAR = 4;
export const BP_UPGRADE_2STAR = 9;
export const BP_UPGRADE_3STAR = 16;
export const STAR_MAX = 3;

export function blueprintCost(car, star = 0) {
  const tier = RARITIES[car?.rarity]?.tier || 0;
  const base = star <= 0 ? BP_UNLOCK_1STAR : star === 1 ? BP_UPGRADE_2STAR : BP_UPGRADE_3STAR;
  return base + tier * 2;
}

export function starMultiplier(stars) {
  return 1 + Math.max(0, Math.min(STAR_MAX, Number(stars) || 0) - 1) * 0.04;
}

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
