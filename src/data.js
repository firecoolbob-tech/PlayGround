/* ═══════════════════════════════════════════════════════════════
   RC RUSH — content data
   ═══════════════════════════════════════════════════════════════ */

export const WEATHER = {
  clear: {
    id: 'clear', label: 'CLEAR', short: 'CLEAR', icon: 'i-weather-clear',
    grip: 1.0, fog: 0.55, particles: 0, kind: null,
    tint: '#000000', tintAlpha: 0, wind: 0, skyDim: 0, lightning: false,
    desc: 'Dry line, maximum grip.'
  },
  rain: {
    id: 'rain', label: 'LIGHT RAIN', short: 'RAIN', icon: 'i-weather-rain',
    grip: 0.84, fog: 1.0, particles: 210, kind: 'rain',
    tint: '#1b2b4a', tintAlpha: 0.24, wind: -150, skyDim: 0.24, lightning: false,
    desc: 'Wet asphalt. Smooth steering wins.'
  },
  storm: {
    id: 'storm', label: 'THUNDERSTORM', short: 'STORM', icon: 'i-weather-storm',
    grip: 0.7, fog: 1.2, particles: 320, kind: 'rain',
    tint: '#1a1030', tintAlpha: 0.34, wind: -330, skyDim: 0.4, lightning: true,
    desc: 'Standing water. Visibility low.'
  },
  snow: {
    id: 'snow', label: 'SNOWFALL', short: 'SNOW', icon: 'i-weather-snow',
    grip: 0.64, fog: 1.05, particles: 200, kind: 'snow',
    tint: '#e8f4ff', tintAlpha: 0.13, wind: -80, skyDim: 0.08, lightning: false,
    desc: 'Powder over ice. Brake early.'
  },
  fog: {
    id: 'fog', label: 'DENSE FOG', short: 'FOG', icon: 'i-weather-fog',
    grip: 0.86, fog: 1.95, particles: 0, kind: 'mist',
    tint: '#9aa6b8', tintAlpha: 0.24, wind: -20, skyDim: 0.18, lightning: false,
    desc: 'Corner markers vanish quickly.'
  },
  ash: {
    id: 'ash', label: 'ASH FALL', short: 'ASH', icon: 'i-weather-ash',
    grip: 0.9, fog: 1.35, particles: 130, kind: 'ash',
    tint: '#4a2a1a', tintAlpha: 0.22, wind: -50, skyDim: 0.3, lightning: false,
    desc: 'Warm grit. Traction is patchy.'
  },
  dust: {
    id: 'dust', label: 'SANDSTORM', short: 'DUST', icon: 'i-weather-dust',
    grip: 0.78, fog: 1.25, particles: 190, kind: 'dust',
    tint: '#b07a42', tintAlpha: 0.24, wind: -270, skyDim: 0.15, lightning: false,
    desc: 'Blowing sand. Hold the wheel.'
  },
  solar: {
    id: 'solar', label: 'SOLAR FLARE', short: 'SOLAR', icon: 'i-weather-solar',
    grip: 1.04, fog: 0.6, particles: 110, kind: 'solar',
    tint: '#5a2a8a', tintAlpha: 0.18, wind: -35, skyDim: 0.1, lightning: false,
    desc: 'Charged air. Extra downforce.'
  }
};

export const CARS = [
  {
    id: 'stinger', name: 'STINGER GT', klass: 'ALL-ROUNDER',
    color: '#ff4a2b', dark: '#8f1208', accent: '#35e6ff',
    stats: { speed: 7, accel: 8, grip: 8, boost: 7 },
    desc: 'The league benchmark. Sharp everywhere, forgiving in the wet.'
  },
  {
    id: 'sidewinder', name: 'SIDEWINDER', klass: 'OFF-ROAD',
    color: '#ffb03a', dark: '#8a4a05', accent: '#d6ff4b',
    stats: { speed: 6, accel: 8, grip: 10, boost: 8 },
    desc: 'Long travel, fat tyres. Laughs at sand, mud and gravel.'
  },
  {
    id: 'glacier', name: 'GLACIER', klass: 'ICE SPEC',
    color: '#35e6ff', dark: '#0a5a74', accent: '#eaffff',
    stats: { speed: 9, accel: 7, grip: 7, boost: 9 },
    desc: 'Studded tyres and a low nose. Built for frozen apexes.'
  },
  {
    id: 'voltage', name: 'VOLTAGE', klass: 'PROTOTYPE',
    color: '#9d7bff', dark: '#3c1c8a', accent: '#ff7ac8',
    stats: { speed: 10, accel: 10, grip: 6, boost: 10 },
    desc: 'Battery rocket. Monstrous top end, knife-edge cornering.'
  }
];

const DIFF = ['ROOKIE', 'CLUB', 'PRO', 'EXPERT', 'INSANE'];

export const LOCATIONS = [
  {
    id: 'neon', name: 'NEON ROOFTOPS', region: 'TOKYO · JAPAN', subtitle: 'Rooftop sprint above the sprawl',
    difficulty: 2, surface: 'asphalt', surfaceLabel: 'ASPHALT', grip: 0.96,
    weather: ['rain', 'storm', 'clear'], accent: '#ff4a6b', accent2: '#35e6ff',
    sky: { top: '#070c22', mid: '#251a45', bottom: '#4b2450' },
    sun: { type: 'moon', x: 0.74, y: 0.28, color: '#ffe7c0', size: 0.052 },
    stars: true, fog: '#2b2c54',
    ground: ['#10142a', '#151a33'], road: ['#1c2234', '#242b42'],
    rumble: ['#ff4a6b', '#f2f6ff'], lane: '#c8d4ff',
    backdrop: 'city', props: ['building', 'lamp', 'sign', 'antenna', 'crate', 'billboard'],
    density: 0.13, propColors: { a: '#171b35', b: '#222a4a', c: '#35e6ff', d: '#ff4a6b' },
    blurb: 'Rain-slick rooftops, neon haze and a skyline that never ends.'
  },
  {
    id: 'dunes', name: 'SUN DUNES', region: 'SAHARA · MOROCCO', subtitle: 'Golden hour sand circuit',
    difficulty: 2, surface: 'sand', surfaceLabel: 'SAND', grip: 0.82,
    weather: ['dust', 'clear', 'dust'], accent: '#ffb03a', accent2: '#ffe6a1',
    sky: { top: '#5a2a4a', mid: '#d9633c', bottom: '#ffc46b' },
    sun: { type: 'sun', x: 0.68, y: 0.4, color: '#fff1b8', size: 0.075 },
    stars: false, fog: '#e7b77b',
    ground: ['#8a5b32', '#a06c3d'], road: ['#6e4b2d', '#7a5533'],
    rumble: ['#e8b35c', '#fff1c9'], lane: '#f4d79a',
    backdrop: 'dunes', props: ['cactus', 'rock', 'sign', 'skull', 'flag'],
    density: 0.09, propColors: { a: '#6d4726', b: '#8c5e33', c: '#ffb03a', d: '#fff1c9' },
    blurb: 'Soft sand, blind crests and a wall of heat haze.'
  },
  {
    id: 'frost', name: 'FROST PEAK', region: 'ALPS · SWITZERLAND', subtitle: 'High-altitude snow pass',
    difficulty: 4, surface: 'snow', surfaceLabel: 'SNOW', grip: 0.7,
    weather: ['snow', 'fog', 'snow'], accent: '#7dd8ff', accent2: '#ffffff',
    sky: { top: '#0b1d3a', mid: '#4b7ea8', bottom: '#b8d6e8' },
    sun: { type: 'moon', x: 0.7, y: 0.3, color: '#eaf8ff', size: 0.045 },
    stars: true, fog: '#c9d9e8',
    ground: ['#d7e5f2', '#c3d6e6'], road: ['#8fa3b6', '#9bb0c2'],
    rumble: ['#ff5a4a', '#f8fbff'], lane: '#eef7ff',
    backdrop: 'mountains', props: ['pine', 'rock', 'sign', 'snowman', 'flag'],
    density: 0.12, propColors: { a: '#5c7d7a', b: '#dcecf5', c: '#7dd8ff', d: '#ff5a4a' },
    blurb: 'A thin ribbon of grip carved through a frozen mountain.'
  },
  {
    id: 'coast', name: 'PALM COAST', region: 'GOLD COAST · AUSTRALIA', subtitle: 'Salt air and ocean spray',
    difficulty: 1, surface: 'asphalt', surfaceLabel: 'ASPHALT', grip: 0.94,
    weather: ['clear', 'rain', 'fog'], accent: '#ffca5a', accent2: '#35e6ff',
    sky: { top: '#0d6fa8', mid: '#54b6cf', bottom: '#ffd28a' },
    sun: { type: 'sun', x: 0.3, y: 0.3, color: '#fff1b8', size: 0.06 },
    stars: false, fog: '#ffe0b0',
    ground: ['#d9c089', '#e6cfa0'], road: ['#4b4f5c', '#555a68'],
    rumble: ['#ff7a3d', '#fdfbf2'], lane: '#fff6de',
    backdrop: 'coast', props: ['palm', 'rock', 'sign', 'umbrella', 'buoy'],
    density: 0.1, propColors: { a: '#7b5a35', b: '#3f8f5b', c: '#ffca5a', d: '#35e6ff' },
    blurb: 'Wide sweepers with the ocean on one side and palms on the other.'
  },
  {
    id: 'redwood', name: 'REDWOOD RUSH', region: 'PACIFIC NORTHWEST · USA', subtitle: 'Damp forest logging road',
    difficulty: 3, surface: 'dirt', surfaceLabel: 'DIRT', grip: 0.84,
    weather: ['fog', 'rain', 'clear'], accent: '#a8e063', accent2: '#e7c76b',
    sky: { top: '#12291f', mid: '#365b42', bottom: '#8fae7c' },
    sun: { type: 'sun', x: 0.38, y: 0.34, color: '#e9ffc0', size: 0.045 },
    stars: false, fog: '#6d8a6d',
    ground: ['#2f4b2c', '#38582f'], road: ['#4a3b2a', '#554432'],
    rumble: ['#d7a45a', '#f3e6c8'], lane: '#d9c28d',
    backdrop: 'forest', props: ['tree', 'pine', 'rock', 'sign', 'log'],
    density: 0.17, propColors: { a: '#1f3a27', b: '#2f5233', c: '#a8e063', d: '#d7a45a' },
    blurb: 'Giant trees, greasy dirt and fog that swallows the next corner.'
  },
  {
    id: 'magma', name: 'MAGMA WORKS', region: 'REYKJANES · ICELAND', subtitle: 'Volcanic service loop',
    difficulty: 4, surface: 'asphalt', surfaceLabel: 'BASALT', grip: 0.92,
    weather: ['ash', 'storm', 'clear'], accent: '#ff6b2c', accent2: '#ffd36b',
    sky: { top: '#170b12', mid: '#4d1613', bottom: '#a3311c' },
    sun: { type: 'moon', x: 0.24, y: 0.36, color: '#ff8a4a', size: 0.04 },
    stars: true, fog: '#5b2a20',
    ground: ['#2a1a18', '#331e1a'], road: ['#2b2326', '#332a2d'],
    rumble: ['#ff6b2c', '#1a1113'], lane: '#ffb27a',
    backdrop: 'volcano', props: ['rock', 'lava', 'vent', 'sign', 'pipe'],
    density: 0.11, propColors: { a: '#241716', b: '#3a2320', c: '#ff6b2c', d: '#ffd36b' },
    blurb: 'Ash on the racing line and a glow on the horizon.'
  },
  {
    id: 'glacier', name: 'GLACIER CAVE', region: 'VATNAJÖKULL · ICELAND', subtitle: 'Blue ice underground',
    difficulty: 5, surface: 'ice', surfaceLabel: 'ICE', grip: 0.56,
    weather: ['snow', 'fog', 'snow'], accent: '#35e6ff', accent2: '#d6f6ff',
    sky: { top: '#08182d', mid: '#1d4f6b', bottom: '#4f8fa6' },
    sun: { type: 'moon', x: 0.5, y: 0.24, color: '#c8f4ff', size: 0.035 },
    stars: true, fog: '#a7cfdf',
    ground: ['#bfe0ee', '#a9d3e6'], road: ['#6d94a9', '#7aa2b6'],
    rumble: ['#35e6ff', '#f4ffff'], lane: '#e8feff',
    backdrop: 'ice', props: ['crystal', 'ice', 'rock', 'flag', 'icicle'],
    density: 0.15, propColors: { a: '#5b8fa6', b: '#bfe9f5', c: '#35e6ff', d: '#eaffff' },
    blurb: 'Zero grip, total commitment. The cave rewards the brave.'
  },
  {
    id: 'dockyard', name: 'DOCKYARD 9', region: 'ROTTERDAM · NETHERLANDS', subtitle: 'Container maze after dark',
    difficulty: 3, surface: 'concrete', surfaceLabel: 'CONCRETE', grip: 0.9,
    weather: ['fog', 'rain', 'storm'], accent: '#ffb03a', accent2: '#35e6ff',
    sky: { top: '#101720', mid: '#333e46', bottom: '#6f787c' },
    sun: { type: 'moon', x: 0.78, y: 0.3, color: '#ffe6b0', size: 0.035 },
    stars: false, fog: '#7e8588',
    ground: ['#3a3d3c', '#434747'], road: ['#373b3d', '#3f4446'],
    rumble: ['#ffb03a', '#1a1d1e'], lane: '#e8e2c8',
    backdrop: 'dock', props: ['container', 'crane', 'barrel', 'sign', 'pipe'],
    density: 0.13, propColors: { a: '#2b3032', b: '#474d4e', c: '#ffb03a', d: '#35e6ff' },
    blurb: 'Tight container chicanes under sodium lights and drizzle.'
  },
  {
    id: 'sunset', name: 'SUNSET FREEWAY', region: 'LOS ANGELES · USA', subtitle: 'Neon highway at dusk',
    difficulty: 2, surface: 'asphalt', surfaceLabel: 'ASPHALT', grip: 0.97,
    weather: ['clear', 'dust', 'clear'], accent: '#ff4a6b', accent2: '#ffd36b',
    sky: { top: '#1a1035', mid: '#7a2a55', bottom: '#ff6a4a' },
    sun: { type: 'sun', x: 0.52, y: 0.42, color: '#ffd36b', size: 0.085 },
    stars: true, fog: '#8a4a5a',
    ground: ['#3b2b3a', '#463243'], road: ['#26232e', '#2e2a36'],
    rumble: ['#ff4a6b', '#ffe8d1'], lane: '#ffe3c4',
    backdrop: 'highway', props: ['lamp', 'sign', 'billboard', 'palm', 'car'],
    density: 0.11, propColors: { a: '#2c2238', b: '#44304d', c: '#ff4a6b', d: '#ffd36b' },
    blurb: 'Long, fast, glowing. The easiest place to find top speed.'
  },
  {
    id: 'bayou', name: 'BAYOU BLACKOUT', region: 'LOUISIANA · USA', subtitle: 'Swamp run during a blackout',
    difficulty: 5, surface: 'mud', surfaceLabel: 'MUD', grip: 0.68,
    weather: ['storm', 'fog', 'rain'], accent: '#9ac24a', accent2: '#35e6ff',
    sky: { top: '#0a1513', mid: '#1f352c', bottom: '#435a45' },
    sun: { type: 'moon', x: 0.66, y: 0.26, color: '#d8ffb0', size: 0.03 },
    stars: true, fog: '#4f6355',
    ground: ['#26362a', '#2d3f2e'], road: ['#3c3427', '#463d2d'],
    rumble: ['#9ac24a', '#1b211a'], lane: '#c8c48a',
    backdrop: 'swamp', props: ['tree', 'moss', 'rock', 'sign', 'firefly'],
    density: 0.16, propColors: { a: '#1b2a22', b: '#33452f', c: '#9ac24a', d: '#35e6ff' },
    blurb: 'Black water, lightning and a surface that moves under you.'
  },
  {
    id: 'toy', name: 'TOY TURF', region: 'THE PLAYROOM · EARTH', subtitle: 'Indoor micro grand prix',
    difficulty: 1, surface: 'plastic', surfaceLabel: 'PLASTIC', grip: 0.92,
    weather: ['clear', 'dust', 'clear'], accent: '#ff7ac8', accent2: '#d6ff4b',
    sky: { top: '#1d2340', mid: '#3e3c6e', bottom: '#7168a8' },
    sun: { type: 'sun', x: 0.28, y: 0.26, color: '#fff0a8', size: 0.05 },
    stars: false, fog: '#6a63a0',
    ground: ['#3e3a63', '#4a4572'], road: ['#56517f', '#615b8c'],
    rumble: ['#ff7ac8', '#fff2ff'], lane: '#fff0ff',
    backdrop: 'toy', props: ['block', 'pencil', 'domino', 'sign', 'ball'],
    density: 0.14, propColors: { a: '#4d467e', b: '#6c63a8', c: '#ff7ac8', d: '#d6ff4b' },
    blurb: 'Book ramps, pencil chicanes and a rug that feels like a runway.'
  },
  {
    id: 'orbital', name: 'ORBITAL RING', region: 'LOW EARTH ORBIT', subtitle: 'Zero-G cargo ring',
    difficulty: 4, surface: 'metal', surfaceLabel: 'METAL', grip: 0.88,
    weather: ['solar', 'clear', 'solar'], accent: '#9d7bff', accent2: '#35e6ff',
    sky: { top: '#03030d', mid: '#0c1230', bottom: '#26306a' },
    sun: { type: 'moon', x: 0.82, y: 0.24, color: '#c9d8ff', size: 0.075 },
    stars: true, fog: '#2a2f5e',
    ground: ['#11142a', '#171b33'], road: ['#232841', '#2a3050'],
    rumble: ['#9d7bff', '#d6f6ff'], lane: '#bfe8ff',
    backdrop: 'space', props: ['satellite', 'pipe', 'crystal', 'sign', 'antenna'],
    density: 0.12, propColors: { a: '#1b2040', b: '#2b3260', c: '#9d7bff', d: '#35e6ff' },
    blurb: 'No sky, no runoff, no second chances. Pure orbital speed.'
  }
];

export function difficultyLabel(n) { return DIFF[Math.min(4, Math.max(0, n - 1))]; }

export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));
export const CAR_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));

export const STORAGE_KEY = 'rcrush.save.v1';

export function defaultSave() {
  return {
    carId: 'stinger',
    locationId: 'neon',
    coins: 1240,
    bestTimes: {},
    bestLaps: {},
    races: 0,
    wins: 0,
    sound: true,
    music: true,
    haptics: true,
    seenHowTo: false
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch { return defaultSave(); }
}

export function persist(save) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch { /* private mode */ }
}
