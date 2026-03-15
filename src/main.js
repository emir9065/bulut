import './style.css';

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const MOBILE_VIEW_WIDTH = 640;
const GROUND_Y = 620;
const FIXED_DT = 1 / 60;
const MODES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  SHOP: 'shop',
  BIOME_COMPLETE: 'biome_complete',
  VICTORY: 'victory',
};

const BIOMES = [
  {
    id: 'forest',
    name: 'Forest',
    weapon: 'axe',
    worldWidth: 4400,
    objective: { type: 'kills', target: 50, label: 'Defeat animals' },
    enemy: { type: 'animal', hp: 60, speed: 130, touchDamage: 8, flying: false, color: '#95ff9e' },
    palette: {
      bgTop: '#224429',
      bgBottom: '#102618',
      ground: '#295135',
      accent: '#56ff8a',
      platform: '#356e44',
      hazard: '#cf3f35',
    },
  },
  {
    id: 'sea',
    name: 'Sea',
    weapon: 'harpoon',
    worldWidth: 4300,
    objective: { type: 'kills', target: 25, label: 'Defeat sharks' },
    enemy: { type: 'shark', hp: 75, speed: 145, touchDamage: 10, flying: false, color: '#7cefff' },
    palette: {
      bgTop: '#1a4e77',
      bgBottom: '#0c1f39',
      ground: '#15375a',
      accent: '#55d3ff',
      platform: '#235884',
      hazard: '#2fc4ff',
    },
  },
  {
    id: 'volcano',
    name: 'Volcano',
    weapon: 'fire_blade',
    worldWidth: 4200,
    objective: { type: 'chest', target: 1, label: 'Find the chest' },
    enemy: { type: 'ember', hp: 95, speed: 160, touchDamage: 12, flying: false, color: '#ff9b4d' },
    palette: {
      bgTop: '#602110',
      bgBottom: '#1f0804',
      ground: '#5a2a16',
      accent: '#ff7034',
      platform: '#8b3b1f',
      hazard: '#ff3e2b',
    },
  },
  {
    id: 'snow',
    name: 'Snow',
    weapon: 'spear',
    worldWidth: 4200,
    objective: { type: 'survive', target: 45, label: 'Survive the freeze' },
    enemy: { type: 'ice_wolf', hp: 80, speed: 155, touchDamage: 10, flying: false, color: '#a7e5ff' },
    palette: {
      bgTop: '#adcff6',
      bgBottom: '#4b6e9c',
      ground: '#e4f3ff',
      accent: '#90d9ff',
      platform: '#c9e5fb',
      hazard: '#9bd0ff',
    },
  },
  {
    id: 'cave',
    name: 'Cave',
    weapon: 'rifle',
    worldWidth: 4500,
    objective: { type: 'kills', target: 25, label: 'Defeat cave enemies' },
    enemy: { type: 'crawler', hp: 90, speed: 170, touchDamage: 12, flying: false, color: '#e5bc6f' },
    palette: {
      bgTop: '#2f2a38',
      bgBottom: '#0e0c12',
      ground: '#4b3d2a',
      accent: '#ffc066',
      platform: '#695037',
      hazard: '#b9602a',
    },
  },
  {
    id: 'space',
    name: 'Space',
    weapon: 'laser',
    worldWidth: 4700,
    objective: { type: 'kills', target: 50, label: 'Destroy space enemies' },
    enemy: { type: 'drone', hp: 80, speed: 180, touchDamage: 11, flying: true, color: '#f2a2ff' },
    palette: {
      bgTop: '#140f32',
      bgBottom: '#05020d',
      ground: '#271c45',
      accent: '#f482ff',
      platform: '#3d2a70',
      hazard: '#eb65ff',
    },
  },
];

const SHOP_ITEMS = [
  { id: 'skin_verdant', name: 'Verdant Echo', type: 'cosmetic', cost: 80, color: '#66ff94' },
  { id: 'skin_coral', name: 'Coral Surge', type: 'cosmetic', cost: 115, color: '#63d8ff' },
  { id: 'skin_star', name: 'Stardust Veil', type: 'cosmetic', cost: 145, color: '#f5a7ff' },
  {
    id: 'perk_momentum',
    name: 'Momentum Core',
    type: 'perk',
    cost: 185,
    color: '#ffd56a',
    perk: { moveMultiplier: 1.1 },
    perkText: '+10% move speed',
  },
  {
    id: 'perk_overclock',
    name: 'Overclock Edge',
    type: 'perk',
    cost: 230,
    color: '#ff8f7a',
    perk: { damageMultiplier: 1.12 },
    perkText: '+12% weapon damage',
  },
  {
    id: 'perk_phase',
    name: 'Phase Mesh',
    type: 'perk',
    cost: 280,
    color: '#9be8ff',
    perk: { defenseMultiplier: 0.85 },
    perkText: '-15% incoming damage',
  },
];

function getViewWidth() {
  return isLikelyMobilePlaySurface() ? MOBILE_VIEW_WIDTH : VIEW_WIDTH;
}

function getViewHeight() {
  return VIEW_HEIGHT;
}

const app = document.querySelector('#app');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = getViewWidth();
canvas.height = getViewHeight();
canvas.setAttribute('aria-label', 'Biome Combat Platformer');
app.append(canvas);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicClock = 0;
    this.musicIndex = 0;
    this.musicPattern = [220, 277, 311, 370, 330, 311, 277, 247];
  }

  touch() {
    if (!this.ctx) {
      this.ctx = new window.AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  tone(freq, duration = 0.12, type = 'sine', gain = 0.05) {
    if (!this.ctx || !this.master) {
      return;
    }
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(this.master);
    const start = this.ctx.currentTime;
    const end = start + duration;
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.start(start);
    osc.stop(end);
  }

  sfxAttack() {
    this.tone(420, 0.08, 'square', 0.045);
  }

  sfxHit() {
    this.tone(160, 0.2, 'sawtooth', 0.07);
  }

  sfxCollect() {
    this.tone(840, 0.08, 'triangle', 0.06);
    this.tone(1000, 0.06, 'triangle', 0.04);
  }

  sfxDash() {
    this.tone(520, 0.1, 'triangle', 0.05);
  }

  sfxBiomeClear() {
    this.tone(500, 0.1, 'triangle', 0.07);
    this.tone(660, 0.12, 'triangle', 0.06);
    this.tone(800, 0.18, 'triangle', 0.05);
  }

  updateMusic(dt, enabled) {
    if (!this.ctx || !enabled) {
      return;
    }
    this.musicClock += dt;
    if (this.musicClock >= 0.42) {
      this.musicClock = 0;
      const freq = this.musicPattern[this.musicIndex % this.musicPattern.length];
      this.musicIndex += 1;
      this.tone(freq, 0.28, 'sine', 0.018);
    }
  }
}

const sound = new SoundEngine();

const state = {
  mode: MODES.MENU,
  previousMode: MODES.MENU,
  biomeIndex: 0,
  score: 0,
  shopUnlocked: false,
  ownedItems: new Set(),
  equippedItemId: null,
  shopCursor: 0,
  campaignTime: 0,
  levelBonusGranted: false,
  keysDown: new Set(),
  keysPressed: new Set(),
  flashTextTimer: 0,
  cameraX: 0,
  biomeState: null,
  renderScaleX: 1,
  renderScaleY: 1,
  touch: {
    enabled: false,
    hold: {
      left: false,
      right: false,
      attack: false,
    },
    tap: {
      jump: false,
      dash: false,
      pause: false,
      shop: false,
      confirm: false,
      fullscreen: false,
      shopPrev: false,
      shopNext: false,
      shopSelect: false,
      shopClose: false,
    },
    ui: null,
  },
};

const TOUCH_HOLD_KEY_MAP = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  attack: 'KeyA',
};

const TOUCH_TAP_KEY_MAP = {
  jump: 'Space',
  dash: 'ShiftLeft',
  pause: 'KeyP',
  shop: 'KeyK',
  confirm: 'Enter',
  fullscreen: 'KeyF',
  shopPrev: 'ArrowUp',
  shopNext: 'ArrowDown',
  shopSelect: 'Enter',
  shopClose: 'Escape',
};

function isLikelyMobilePlaySurface() {
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 900
  );
}

function setTouchHold(control, pressed) {
  if (!(control in state.touch.hold)) {
    return;
  }
  state.touch.hold[control] = pressed;
  const button = state.touch.ui?.buttons?.[control];
  if (button) {
    button.classList.toggle('active', pressed);
  }
}

function triggerTouchTap(control) {
  if (!(control in state.touch.tap)) {
    return;
  }
  state.touch.tap[control] = true;
  const button = state.touch.ui?.buttons?.[control];
  if (button) {
    button.classList.add('active');
    window.setTimeout(() => button.classList.remove('active'), 90);
  }
}

function releaseAllTouchHolds() {
  for (const control of Object.keys(state.touch.hold)) {
    setTouchHold(control, false);
  }
}

function syncTouchControlsToKeys() {
  for (const [control, code] of Object.entries(TOUCH_HOLD_KEY_MAP)) {
    if (state.touch.hold[control]) {
      state.keysDown.add(code);
    } else {
      state.keysDown.delete(code);
    }
  }

  for (const [control, code] of Object.entries(TOUCH_TAP_KEY_MAP)) {
    if (state.touch.tap[control]) {
      let mappedCode = code;
      if (control === 'confirm' && state.mode === MODES.PAUSED) {
        mappedCode = 'KeyP';
      }
      state.keysPressed.add(mappedCode);
      state.touch.tap[control] = false;
    }
  }
}

function setupTouchUi() {
  const root = document.createElement('div');
  root.id = 'touch-ui';
  root.classList.add('hidden');

  const makeButton = (control, label, wide = false) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `touch-btn${wide ? ' wide' : ''}`;
    button.dataset.control = control;
    button.textContent = label;
    return button;
  };

  const top = document.createElement('div');
  top.className = 'touch-top';
  const topLeft = document.createElement('div');
  topLeft.className = 'touch-side';
  const topRight = document.createElement('div');
  topRight.className = 'touch-side';

  const buttons = {
    confirm: makeButton('confirm', 'START', true),
    pause: makeButton('pause', 'PAUSE', true),
    shop: makeButton('shop', 'SHOP', true),
    fullscreen: makeButton('fullscreen', 'FULL', true),
    left: makeButton('left', 'LEFT'),
    right: makeButton('right', 'RIGHT'),
    jump: makeButton('jump', 'JUMP'),
    attack: makeButton('attack', 'ATK'),
    dash: makeButton('dash', 'DASH'),
    shopPrev: makeButton('shopPrev', 'UP'),
    shopNext: makeButton('shopNext', 'DOWN'),
    shopSelect: makeButton('shopSelect', 'BUY', true),
    shopClose: makeButton('shopClose', 'CLOSE', true),
  };

  topLeft.append(buttons.confirm, buttons.pause);
  topRight.append(buttons.shop, buttons.fullscreen);
  top.append(topLeft, topRight);

  const bottom = document.createElement('div');
  bottom.className = 'touch-bottom';
  const leftCluster = document.createElement('div');
  leftCluster.className = 'touch-side';
  leftCluster.append(buttons.left, buttons.right);
  const rightCluster = document.createElement('div');
  rightCluster.className = 'touch-side';
  rightCluster.append(buttons.jump, buttons.attack, buttons.dash);
  bottom.append(leftCluster, rightCluster);

  const shopRow = document.createElement('div');
  shopRow.className = 'touch-shop';
  shopRow.append(buttons.shopPrev, buttons.shopNext, buttons.shopSelect, buttons.shopClose);

  root.append(top, shopRow, bottom);
  app.append(root);

  const activePointers = new Map();
  const holdControls = new Set(['left', 'right', 'attack']);

  const handleDown = (event) => {
    event.preventDefault();
    const control = event.currentTarget.dataset.control;
    sound.touch();
    if (holdControls.has(control)) {
      setTouchHold(control, true);
      activePointers.set(event.pointerId, control);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    triggerTouchTap(control);
  };

  const handleUp = (event) => {
    const control = activePointers.get(event.pointerId);
    if (control) {
      setTouchHold(control, false);
      activePointers.delete(event.pointerId);
    }
  };

  for (const button of Object.values(buttons)) {
    button.addEventListener('pointerdown', handleDown);
    button.addEventListener('pointerup', handleUp);
    button.addEventListener('pointercancel', handleUp);
    button.addEventListener('pointerleave', handleUp);
  }

  canvas.addEventListener('pointerdown', () => {
    if (!state.touch.enabled) {
      return;
    }
    if (state.mode === MODES.MENU || state.mode === MODES.BIOME_COMPLETE || state.mode === MODES.VICTORY) {
      triggerTouchTap('confirm');
    } else if (state.mode === MODES.PAUSED) {
      triggerTouchTap('pause');
    }
  });

  window.addEventListener('blur', releaseAllTouchHolds);
  window.addEventListener('pointercancel', releaseAllTouchHolds);

  state.touch.ui = {
    root,
    shopRow,
    buttons,
  };
}

function updateTouchUiState() {
  if (!state.touch.ui) {
    return;
  }

  const enabled = isLikelyMobilePlaySurface();
  state.touch.enabled = enabled;
  state.touch.ui.root.classList.toggle('hidden', !enabled);
  app.classList.toggle('mobile-mode', enabled);

  if (!enabled) {
    releaseAllTouchHolds();
    return;
  }

  const { buttons, shopRow } = state.touch.ui;

  buttons.confirm.hidden = !(state.mode === MODES.MENU || state.mode === MODES.BIOME_COMPLETE || state.mode === MODES.VICTORY || state.mode === MODES.PAUSED);
  if (state.mode === MODES.MENU) {
    buttons.confirm.textContent = 'START';
  } else if (state.mode === MODES.BIOME_COMPLETE) {
    buttons.confirm.textContent = 'NEXT';
  } else if (state.mode === MODES.VICTORY) {
    buttons.confirm.textContent = 'RESTART';
  } else if (state.mode === MODES.PAUSED) {
    buttons.confirm.textContent = 'RESUME';
  }

  buttons.pause.hidden =
    state.mode === MODES.MENU ||
    state.mode === MODES.BIOME_COMPLETE ||
    state.mode === MODES.VICTORY ||
    state.mode === MODES.PAUSED;
  buttons.pause.textContent = state.mode === MODES.PAUSED ? 'PLAY' : 'PAUSE';
  buttons.shop.hidden = state.mode === MODES.SHOP;
  buttons.shop.disabled = !state.shopUnlocked;

  const inShop = state.mode === MODES.SHOP;
  shopRow.hidden = !inShop;
  buttons.shopSelect.textContent = 'BUY';
}

function getEquippedItem() {
  return SHOP_ITEMS.find((item) => item.id === state.equippedItemId) || null;
}

function getStatModifiers() {
  const item = getEquippedItem();
  const perk = item?.perk;
  return {
    moveMultiplier: perk?.moveMultiplier ?? 1,
    damageMultiplier: perk?.damageMultiplier ?? 1,
    defenseMultiplier: perk?.defenseMultiplier ?? 1,
  };
}

function makePlayer() {
  return {
    x: 120,
    y: 500,
    w: 46,
    h: 66,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyoteTime: 0,
    jumpBufferTime: 0,
    dashTime: 0,
    dashCooldown: 0,
    hp: 100,
    maxHp: 100,
    invulnTime: 0,
    attackCooldown: 0,
    touchDamageCooldown: 0,
  };
}

function generatePlatforms(worldWidth, biomeIndex) {
  const rng = mulberry32(1000 + biomeIndex * 177);
  const platforms = [{ x: 0, y: GROUND_Y, w: worldWidth, h: getViewHeight() - GROUND_Y }];

  let x = 250;
  while (x < worldWidth - 220) {
    const width = 170 + Math.floor(rng() * 140);
    const y = 360 + Math.floor(rng() * 180);
    platforms.push({ x, y, w: width, h: 26 });
    x += 220 + Math.floor(rng() * 260);
  }

  return platforms;
}

function generateHazards(biome) {
  const hazards = [];
  if (biome.id === 'forest') {
    for (let i = 0; i < 9; i += 1) {
      hazards.push({ x: 360 + i * 410, y: GROUND_Y - 20, w: 80, h: 20, damagePerSecond: 24, kind: 'spikes' });
    }
  }
  if (biome.id === 'sea') {
    for (let i = 0; i < 8; i += 1) {
      hazards.push({ x: 440 + i * 420, y: GROUND_Y - 44, w: 70, h: 44, damagePerSecond: 20, kind: 'current' });
    }
  }
  if (biome.id === 'volcano') {
    for (let i = 0; i < 10; i += 1) {
      hazards.push({ x: 300 + i * 360, y: GROUND_Y - 18, w: 120, h: 18, damagePerSecond: 30, kind: 'lava' });
    }
  }
  if (biome.id === 'cave') {
    for (let i = 0; i < 11; i += 1) {
      hazards.push({ x: 350 + i * 350, y: GROUND_Y - 26, w: 62, h: 26, damagePerSecond: 22, kind: 'stalagmite' });
    }
  }
  if (biome.id === 'space') {
    for (let i = 0; i < 9; i += 1) {
      hazards.push({ x: 360 + i * 430, y: GROUND_Y - 88, w: 86, h: 88, damagePerSecond: 24, kind: 'meteor' });
    }
  }
  return hazards;
}

function makeBiomeState(biomeIndex) {
  const biome = BIOMES[biomeIndex];
  const platforms = generatePlatforms(biome.worldWidth, biomeIndex);
  const hazards = generateHazards(biome);
  return {
    biome,
    player: makePlayer(),
    platforms,
    hazards,
    enemies: [],
    projectiles: [],
    particles: [],
    objectiveProgress: 0,
    spawnedEnemies: 0,
    spawnTick: 0,
    freezeMeter: 0,
    freezeTick: 0,
    objectiveTimer: biome.objective.type === 'survive' ? biome.objective.target : 0,
    exitGate: {
      x: biome.worldWidth - 84,
      y: GROUND_Y - 114,
      w: 64,
      h: 114,
      reached: false,
    },
    chest: biome.objective.type === 'chest'
      ? { x: biome.worldWidth - 240, y: GROUND_Y - 52, w: 44, h: 34, found: false }
      : null,
  };
}

function startCampaign() {
  state.mode = MODES.PLAYING;
  state.biomeIndex = 0;
  state.score = 0;
  state.shopUnlocked = false;
  state.campaignTime = 0;
  state.levelBonusGranted = false;
  state.biomeState = makeBiomeState(state.biomeIndex);
}

function restartCurrentBiome() {
  state.biomeState = makeBiomeState(state.biomeIndex);
  state.mode = MODES.PLAYING;
  state.levelBonusGranted = false;
  state.flashTextTimer = 0.9;
}

function goToNextBiome() {
  if (state.biomeIndex + 1 >= BIOMES.length) {
    state.mode = MODES.VICTORY;
    return;
  }
  state.biomeIndex += 1;
  state.biomeState = makeBiomeState(state.biomeIndex);
  state.levelBonusGranted = false;
  state.mode = MODES.PLAYING;
}

function worldRect(entity) {
  return { x: entity.x, y: entity.y, w: entity.w, h: entity.h };
}

function applyPlatformCollisions(entity, platforms) {
  entity.onGround = false;

  entity.x += entity.vx * FIXED_DT;
  for (const p of platforms) {
    const rect = { x: entity.x, y: entity.y, w: entity.w, h: entity.h };
    if (!intersects(rect, p)) {
      continue;
    }
    if (entity.vx > 0) {
      entity.x = p.x - entity.w;
      entity.vx = 0;
    } else if (entity.vx < 0) {
      entity.x = p.x + p.w;
      entity.vx = 0;
    }
  }

  entity.y += entity.vy * FIXED_DT;
  for (const p of platforms) {
    const rect = { x: entity.x, y: entity.y, w: entity.w, h: entity.h };
    if (!intersects(rect, p)) {
      continue;
    }
    if (entity.vy > 0) {
      entity.y = p.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
    } else if (entity.vy < 0) {
      entity.y = p.y + p.h;
      entity.vy = 0;
    }
  }
}

function spawnEnemy() {
  const bState = state.biomeState;
  const biome = bState.biome;
  const target = biome.objective.target;
  if (biome.objective.type !== 'kills') {
    return;
  }
  if (bState.spawnedEnemies >= target) {
    return;
  }
  if (bState.enemies.length >= 8) {
    return;
  }

  const seed = state.biomeIndex * 1000 + bState.spawnedEnemies * 33 + Math.floor(state.campaignTime * 17);
  const rng = mulberry32(seed);
  const side = rng() > 0.5 ? 1 : -1;
  const spawnX = clamp(
    bState.player.x + side * (480 + rng() * 220),
    60,
    biome.worldWidth - 60,
  );

  const enemy = {
    id: `${biome.id}-${bState.spawnedEnemies}`,
    x: spawnX,
    y: biome.enemy.flying ? 240 + rng() * 220 : GROUND_Y - 58,
    w: 46,
    h: 54,
    vx: 0,
    vy: 0,
    onGround: false,
    hp: biome.enemy.hp,
    maxHp: biome.enemy.hp,
    speed: biome.enemy.speed,
    touchDamage: biome.enemy.touchDamage,
    flying: biome.enemy.flying,
    color: biome.enemy.color,
    touchCooldown: 0,
  };
  bState.enemies.push(enemy);
  bState.spawnedEnemies += 1;
}

function addParticle(x, y, color, life = 0.35, size = 6) {
  const seed = Math.floor(x * 13 + y * 17 + life * 1000);
  const rng = mulberry32(seed);
  state.biomeState.particles.push({
    x,
    y,
    vx: (rng() - 0.5) * 260,
    vy: -80 - rng() * 120,
    life,
    maxLife: life,
    color,
    size,
  });
}

function damagePlayer(amount) {
  const bState = state.biomeState;
  const player = bState.player;
  if (player.invulnTime > 0) {
    return;
  }

  const modifiers = getStatModifiers();
  const adjusted = amount * modifiers.defenseMultiplier;
  player.hp -= adjusted;
  player.invulnTime = 0.5;
  sound.sfxHit();
  addParticle(player.x + player.w / 2, player.y + 12, '#ff6355', 0.42, 8);
  if (player.hp <= 0) {
    restartCurrentBiome();
  }
}

function grantBiomeCompletion() {
  if (state.levelBonusGranted) {
    return;
  }
  state.score += 25;
  state.shopUnlocked = state.score >= 175;
  state.levelBonusGranted = true;
  state.mode = MODES.BIOME_COMPLETE;
  sound.sfxBiomeClear();
}

function applyWeaponAttack() {
  const bState = state.biomeState;
  const player = bState.player;
  const modifiers = getStatModifiers();
  const weapon = bState.biome.weapon;
  const facing = player.facing;
  const damageScale = modifiers.damageMultiplier;

  function meleeHit(range, height, damage, color) {
    const hitBox = {
      x: facing > 0 ? player.x + player.w : player.x - range,
      y: player.y + (player.h - height) / 2,
      w: range,
      h: height,
    };

    let hitAny = false;
    for (const enemy of bState.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }
      if (intersects(hitBox, worldRect(enemy))) {
        enemy.hp -= damage * damageScale;
        enemy.vx += facing * 160;
        hitAny = true;
        addParticle(enemy.x + enemy.w / 2, enemy.y + 16, color, 0.3, 5);
      }
    }
    if (hitAny) {
      sound.sfxCollect();
    }
  }

  function spawnProjectile(speed, damage, color, radius = 7, life = 1.2) {
    bState.projectiles.push({
      x: player.x + player.w / 2 + facing * 18,
      y: player.y + player.h * 0.45,
      vx: facing * speed,
      vy: 0,
      r: radius,
      damage: damage * damageScale,
      life,
      color,
    });
  }

  if (weapon === 'axe') {
    player.attackCooldown = 0.32;
    meleeHit(92, 56, 32, '#8cff9f');
    sound.sfxAttack();
    return;
  }

  if (weapon === 'harpoon') {
    player.attackCooldown = 0.28;
    spawnProjectile(780, 30, '#72e7ff', 7, 1.6);
    sound.sfxAttack();
    return;
  }

  if (weapon === 'fire_blade') {
    player.attackCooldown = 0.26;
    meleeHit(86, 62, 26, '#ffb066');
    spawnProjectile(680, 18, '#ff7f4d', 6, 0.8);
    sound.sfxAttack();
    return;
  }

  if (weapon === 'spear') {
    player.attackCooldown = 0.24;
    meleeHit(126, 42, 28, '#d0f3ff');
    sound.sfxAttack();
    return;
  }

  if (weapon === 'rifle') {
    player.attackCooldown = 0.19;
    spawnProjectile(1100, 24, '#ffd17b', 5, 1.1);
    sound.sfxAttack();
    return;
  }

  if (weapon === 'laser') {
    player.attackCooldown = 0.16;
    const range = 520;
    let closest = null;
    let closestDist = Infinity;
    const originX = player.x + player.w / 2;
    const originY = player.y + player.h * 0.48;
    for (const enemy of bState.enemies) {
      const ex = enemy.x + enemy.w / 2;
      const ey = enemy.y + enemy.h / 2;
      const dy = Math.abs(ey - originY);
      if (dy > 38) {
        continue;
      }
      const dx = ex - originX;
      if (Math.sign(dx) !== facing || Math.abs(dx) > range) {
        continue;
      }
      const dist = Math.abs(dx);
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
    if (closest) {
      closest.hp -= 38 * damageScale;
      addParticle(closest.x + closest.w / 2, closest.y + 12, '#ff8dff', 0.4, 7);
      sound.sfxCollect();
    }
    bState.projectiles.push({
      x: originX,
      y: originY,
      vx: 0,
      vy: 0,
      r: 0,
      damage: 0,
      life: 0.07,
      color: '#f48fff',
      beamLength: range,
      facing,
      beam: true,
    });
    sound.sfxAttack();
  }
}

function updatePlayer() {
  const bState = state.biomeState;
  const player = bState.player;
  const modifiers = getStatModifiers();

  const left = state.keysDown.has('ArrowLeft');
  const right = state.keysDown.has('ArrowRight');
  const jumpPressed =
    state.keysPressed.has('ArrowUp') || state.keysPressed.has('Space');
  const dashPressed = state.keysPressed.has('ShiftLeft') || state.keysPressed.has('ShiftRight');
  const attackHeld = state.keysDown.has('KeyA');

  const moving = Number(right) - Number(left);
  const baseMove = 360 * modifiers.moveMultiplier;
  const snowSlow = bState.biome.id === 'snow' ? lerp(1, 0.56, clamp(bState.freezeMeter / 5, 0, 1)) : 1;
  const maxMoveSpeed = baseMove * snowSlow;
  const accel = 2700 * snowSlow;

  if (player.dashCooldown > 0) {
    player.dashCooldown -= FIXED_DT;
  }
  if (player.attackCooldown > 0) {
    player.attackCooldown -= FIXED_DT;
  }
  if (player.invulnTime > 0) {
    player.invulnTime -= FIXED_DT;
  }
  if (player.touchDamageCooldown > 0) {
    player.touchDamageCooldown -= FIXED_DT;
  }

  if (player.onGround) {
    player.coyoteTime = 0.12;
  } else {
    player.coyoteTime -= FIXED_DT;
  }

  if (jumpPressed) {
    player.jumpBufferTime = 0.12;
  } else {
    player.jumpBufferTime -= FIXED_DT;
  }

  if (dashPressed && player.dashCooldown <= 0) {
    player.dashTime = 0.14;
    player.dashCooldown = 0.95;
    player.vy = 0;
    player.vx = (player.facing || 1) * (850 * modifiers.moveMultiplier);
    player.invulnTime = Math.max(player.invulnTime, 0.15);
    sound.sfxDash();
  }

  if (player.dashTime > 0) {
    player.dashTime -= FIXED_DT;
  } else {
    if (moving !== 0) {
      player.facing = moving;
      player.vx += moving * accel * FIXED_DT;
    } else {
      player.vx *= 0.84;
      if (Math.abs(player.vx) < 4) {
        player.vx = 0;
      }
    }

    player.vx = clamp(player.vx, -maxMoveSpeed, maxMoveSpeed);

    if (player.jumpBufferTime > 0 && player.coyoteTime > 0) {
      player.vy = -760;
      player.onGround = false;
      player.coyoteTime = 0;
      player.jumpBufferTime = 0;
      sound.sfxAttack();
    }

    const gravity = bState.biome.id === 'space' ? 1250 : 1900;
    player.vy += gravity * FIXED_DT;
    player.vy = clamp(player.vy, -1000, 980);
  }

  if (attackHeld && player.attackCooldown <= 0 && state.mode === MODES.PLAYING) {
    applyWeaponAttack();
  }

  applyPlatformCollisions(player, bState.platforms);
  player.x = clamp(player.x, 0, bState.biome.worldWidth - player.w);

  for (const hazard of bState.hazards) {
    if (intersects(worldRect(player), hazard)) {
      damagePlayer(hazard.damagePerSecond * FIXED_DT);
    }
  }

  if (bState.chest && !bState.chest.found && intersects(worldRect(player), bState.chest)) {
    bState.chest.found = true;
    bState.objectiveProgress = 1;
    state.score += 20;
    sound.sfxCollect();
    grantBiomeCompletion();
  }

  if (
    bState.exitGate &&
    (intersects(worldRect(player), bState.exitGate) || player.x >= bState.biome.worldWidth - player.w - 4)
  ) {
    if (!bState.exitGate.reached) {
      bState.exitGate.reached = true;
      state.score += 10;
      sound.sfxCollect();
    }
    grantBiomeCompletion();
  }
}

function updateProjectiles() {
  const bState = state.biomeState;
  for (let i = bState.projectiles.length - 1; i >= 0; i -= 1) {
    const shot = bState.projectiles[i];
    shot.life -= FIXED_DT;
    if (shot.life <= 0) {
      bState.projectiles.splice(i, 1);
      continue;
    }
    if (shot.beam) {
      continue;
    }

    shot.x += shot.vx * FIXED_DT;
    shot.y += shot.vy * FIXED_DT;

    if (shot.x < -80 || shot.x > bState.biome.worldWidth + 80 || shot.y < -80 || shot.y > getViewHeight() + 80) {
      bState.projectiles.splice(i, 1);
      continue;
    }

    const hitRect = { x: shot.x - shot.r, y: shot.y - shot.r, w: shot.r * 2, h: shot.r * 2 };
    let consumed = false;
    for (const enemy of bState.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }
      if (intersects(hitRect, worldRect(enemy))) {
        enemy.hp -= shot.damage;
        enemy.vx += Math.sign(shot.vx || 1) * 130;
        addParticle(enemy.x + enemy.w / 2, enemy.y + 14, shot.color, 0.28, 5);
        consumed = true;
        break;
      }
    }

    if (consumed) {
      bState.projectiles.splice(i, 1);
    }
  }
}

function updateEnemies() {
  const bState = state.biomeState;
  const player = bState.player;

  bState.spawnTick += FIXED_DT;
  if (bState.spawnTick >= 0.7) {
    bState.spawnTick = 0;
    spawnEnemy();
  }

  for (let i = bState.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = bState.enemies[i];

    if (enemy.hp <= 0) {
      bState.enemies.splice(i, 1);
      bState.objectiveProgress += 1;
      state.score += 2;
      state.shopUnlocked = state.score >= 175;
      addParticle(enemy.x + enemy.w / 2, enemy.y + 20, '#f9ff8b', 0.4, 8);
      continue;
    }

    const dx = player.x - enemy.x;
    const dir = Math.sign(dx) || 1;
    if (!enemy.flying) {
      enemy.vx = lerp(enemy.vx, dir * enemy.speed, 0.06);
      enemy.vy += 1800 * FIXED_DT;
      enemy.vy = clamp(enemy.vy, -900, 860);
      applyPlatformCollisions(enemy, bState.platforms);
    } else {
      enemy.vx = lerp(enemy.vx, dir * enemy.speed, 0.04);
      const targetY = player.y - 70;
      const dy = targetY - enemy.y;
      enemy.vy = lerp(enemy.vy, dy * 1.8, 0.06);
      enemy.x += enemy.vx * FIXED_DT;
      enemy.y += enemy.vy * FIXED_DT;
      enemy.x = clamp(enemy.x, 30, bState.biome.worldWidth - 30 - enemy.w);
      enemy.y = clamp(enemy.y, 80, GROUND_Y - 120);
    }

    if (enemy.touchCooldown > 0) {
      enemy.touchCooldown -= FIXED_DT;
    }

    if (intersects(worldRect(enemy), worldRect(player)) && enemy.touchCooldown <= 0) {
      damagePlayer(enemy.touchDamage);
      enemy.touchCooldown = 0.7;
      player.vx += dir * 150;
    }
  }

  if (bState.biome.objective.type === 'kills' && bState.objectiveProgress >= bState.biome.objective.target) {
    grantBiomeCompletion();
  }
}

function updateSnowEffect() {
  const bState = state.biomeState;
  if (bState.biome.id !== 'snow' || state.mode !== MODES.PLAYING) {
    return;
  }

  bState.objectiveTimer = Math.max(0, bState.objectiveTimer - FIXED_DT);

  const speed = Math.abs(bState.player.vx);
  if (speed < 50) {
    bState.freezeMeter = clamp(bState.freezeMeter + FIXED_DT * 1.15, 0, 5);
  } else {
    bState.freezeMeter = clamp(bState.freezeMeter - FIXED_DT * 1.3, 0, 5);
  }

  bState.freezeTick += FIXED_DT;
  if (bState.freezeTick >= 1) {
    bState.freezeTick = 0;
    const coldDamage = 2 + bState.freezeMeter * 1.5;
    damagePlayer(coldDamage);
  }

  if (bState.objectiveTimer <= 0) {
    bState.objectiveProgress = bState.biome.objective.target;
    grantBiomeCompletion();
  }
}

function updateParticles() {
  const particles = state.biomeState.particles;
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= FIXED_DT;
    p.x += p.vx * FIXED_DT;
    p.y += p.vy * FIXED_DT;
    p.vy += 380 * FIXED_DT;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateCamera() {
  const bState = state.biomeState;
  const playerCenter = bState.player.x + bState.player.w / 2;
  const viewWidth = getViewWidth();
  const targetX = playerCenter - viewWidth * 0.45;
  state.cameraX = clamp(lerp(state.cameraX, targetX, 0.08), 0, bState.biome.worldWidth - viewWidth);
}

function processGlobalInputs() {
  const escapePressed = state.keysPressed.has('Escape');
  if (escapePressed && document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }

  if (state.keysPressed.has('KeyF')) {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  if ((escapePressed || state.keysPressed.has('KeyP')) && state.mode === MODES.PLAYING) {
    state.mode = MODES.PAUSED;
    state.previousMode = MODES.PLAYING;
  } else if ((escapePressed || state.keysPressed.has('KeyP')) && state.mode === MODES.PAUSED) {
    state.mode = MODES.PLAYING;
  }

  if (state.keysPressed.has('KeyK') && state.shopUnlocked) {
    if (state.mode === MODES.PLAYING || state.mode === MODES.PAUSED || state.mode === MODES.MENU) {
      state.previousMode = state.mode;
      state.mode = MODES.SHOP;
    }
  }

  if (state.mode === MODES.SHOP) {
    if (state.keysPressed.has('ArrowDown')) {
      state.shopCursor = (state.shopCursor + 1) % SHOP_ITEMS.length;
    }
    if (state.keysPressed.has('ArrowUp')) {
      state.shopCursor = (state.shopCursor - 1 + SHOP_ITEMS.length) % SHOP_ITEMS.length;
    }
    if (state.keysPressed.has('Enter')) {
      const item = SHOP_ITEMS[state.shopCursor];
      if (state.ownedItems.has(item.id)) {
        state.equippedItemId = item.id;
      } else if (state.score >= item.cost) {
        state.score -= item.cost;
        state.ownedItems.add(item.id);
        state.equippedItemId = item.id;
        sound.sfxCollect();
      }
    }
    if (escapePressed) {
      state.mode = state.previousMode;
    }
  }

  if (state.mode === MODES.MENU && state.keysPressed.has('Enter')) {
    startCampaign();
  }

  if (state.mode === MODES.BIOME_COMPLETE && state.keysPressed.has('Enter')) {
    goToNextBiome();
  }

  if (state.mode === MODES.VICTORY && state.keysPressed.has('Enter')) {
    startCampaign();
  }
}

function updateGame() {
  if (state.mode === MODES.PLAYING) {
    state.campaignTime += FIXED_DT;
    updatePlayer();
    updateProjectiles();
    updateEnemies();
    updateSnowEffect();
    updateParticles();
    updateCamera();
  }

  if (state.flashTextTimer > 0) {
    state.flashTextTimer -= FIXED_DT;
  }

  sound.updateMusic(
    FIXED_DT,
    state.mode === MODES.PLAYING || state.mode === MODES.MENU || state.mode === MODES.SHOP,
  );

  state.keysPressed.clear();
}

function drawBackground(biome) {
  const viewWidth = getViewWidth();
  const viewHeight = getViewHeight();
  const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
  gradient.addColorStop(0, biome.palette.bgTop);
  gradient.addColorStop(1, biome.palette.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  if (biome.id === 'forest') {
    for (let i = 0; i < 20; i += 1) {
      const x = (i * 220 - state.cameraX * 0.45) % (viewWidth + 260) - 130;
      const y = 210 + (i % 3) * 40;
      ctx.fillStyle = '#234f2d';
      ctx.fillRect(x + 20, y + 90, 14, 120);
      ctx.beginPath();
      ctx.moveTo(x - 30, y + 110);
      ctx.lineTo(x + 90, y + 110);
      ctx.lineTo(x + 30, y);
      ctx.closePath();
      ctx.fillStyle = '#3ea159';
      ctx.fill();
    }
  }

  if (biome.id === 'sea') {
    ctx.fillStyle = 'rgba(109, 216, 255, 0.15)';
    for (let i = 0; i < 16; i += 1) {
      const x = (i * 160 - state.cameraX * 0.38) % (viewWidth + 180) - 90;
      const y = 180 + Math.sin((state.campaignTime * 2) + i) * 18;
      ctx.beginPath();
      ctx.ellipse(x, y, 70, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (biome.id === 'volcano') {
    for (let i = 0; i < 9; i += 1) {
      const x = (i * 240 - state.cameraX * 0.42) % (viewWidth + 280) - 140;
      ctx.beginPath();
      ctx.moveTo(x, 360);
      ctx.lineTo(x + 140, 130 + (i % 3) * 40);
      ctx.lineTo(x + 280, 360);
      ctx.closePath();
      ctx.fillStyle = '#7c2f1d';
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 120, 50, 0.23)';
      ctx.fillRect(x + 132, 170, 16, 200);
    }
  }

  if (biome.id === 'snow') {
    ctx.fillStyle = 'rgba(235, 249, 255, 0.58)';
    for (let i = 0; i < 120; i += 1) {
      const x = (i * 33 + state.campaignTime * 40) % viewWidth;
      const y = (i * 51 + state.campaignTime * 28) % viewHeight;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  if (biome.id === 'cave') {
    ctx.fillStyle = '#1e1728';
    for (let i = 0; i < 17; i += 1) {
      const x = i * 86;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 28, 110 + (i % 3) * 40);
      ctx.lineTo(x + 56, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (biome.id === 'space') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (let i = 0; i < 140; i += 1) {
      const x = (i * 71 - state.cameraX * 0.18) % (viewWidth + 80) - 40;
      const y = (i * 127) % viewHeight;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = 'rgba(196, 120, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(1100, 120, 56, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWorld() {
  const bState = state.biomeState;
  const biome = bState.biome;

  drawBackground(biome);

  ctx.save();
  ctx.translate(-state.cameraX, 0);

  ctx.fillStyle = biome.palette.platform;
  for (const p of bState.platforms) {
    if (p.y >= GROUND_Y) {
      ctx.fillStyle = biome.palette.ground;
    } else {
      ctx.fillStyle = biome.palette.platform;
    }
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  for (const hazard of bState.hazards) {
    ctx.fillStyle = biome.palette.hazard;
    ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
  }

  if (bState.chest && !bState.chest.found) {
    ctx.fillStyle = '#ffd56e';
    ctx.fillRect(bState.chest.x, bState.chest.y, bState.chest.w, bState.chest.h);
    ctx.fillStyle = '#a05e22';
    ctx.fillRect(bState.chest.x, bState.chest.y + 14, bState.chest.w, 10);
  }

  if (!bState.exitGate.reached) {
    const gate = bState.exitGate;
    ctx.fillStyle = `${biome.palette.accent}99`;
    ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
    ctx.strokeStyle = '#dff9ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
    ctx.fillStyle = '#dff9ff';
    ctx.font = '16px Trebuchet MS';
    ctx.fillText('EXIT', gate.x + 11, gate.y - 8);
  }

  const player = bState.player;
  const equipped = getEquippedItem();
  const playerColor = equipped?.color || biome.palette.accent;

  for (const enemy of bState.enemies) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = '#1d0f1a';
    ctx.fillRect(enemy.x + 8, enemy.y - 10, 30, 6);
    ctx.fillStyle = '#ff5d62';
    ctx.fillRect(enemy.x + 8, enemy.y - 10, (enemy.hp / enemy.maxHp) * 30, 6);
  }

  for (const shot of bState.projectiles) {
    if (shot.beam) {
      ctx.strokeStyle = shot.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x + shot.beamLength * shot.facing, shot.y);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = shot.color;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of bState.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = `${p.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }

  ctx.fillStyle = player.invulnTime > 0 ? '#ffaeaa' : playerColor;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#05090f';
  ctx.fillRect(player.x + (player.facing > 0 ? 30 : 8), player.y + 20, 8, 6);

  if (state.flashTextTimer > 0) {
    ctx.fillStyle = 'rgba(255, 120, 120, 0.85)';
    ctx.font = '20px Trebuchet MS';
    ctx.fillText('Biome restart', player.x - 20, player.y - 18);
  }

  ctx.restore();
}

function objectiveText() {
  const bState = state.biomeState;
  const objective = bState.biome.objective;
  if (objective.type === 'kills') {
    return `${objective.label}: ${bState.objectiveProgress}/${objective.target} | Reach EXIT`;
  }
  if (objective.type === 'chest') {
    return `${objective.label}: ${bState.chest?.found ? 'Found' : 'Searching'} | Reach EXIT`;
  }
  return `${objective.label}: ${bState.objectiveTimer.toFixed(1)}s | Reach EXIT`;
}

function drawHud() {
  const bState = state.biomeState;
  const player = bState.player;
  const viewWidth = getViewWidth();
  const mobile = state.touch.enabled;
  const pad = mobile ? 10 : 12;

  if (mobile) {
    const hudTop = 88;
    const hudHeight = 118;
    const hpWidth = 132;
    const hpX = viewWidth - hpWidth - 14;
    const objective = bState.biome.objective;
    let compactObjective = 'Reach EXIT';
    if (objective.type === 'kills') {
      compactObjective = `Obj ${bState.objectiveProgress}/${objective.target} -> EXIT`;
    } else if (objective.type === 'chest') {
      compactObjective = `Chest ${bState.chest?.found ? 'found' : 'search'} -> EXIT`;
    } else {
      compactObjective = `Survive ${bState.objectiveTimer.toFixed(0)}s -> EXIT`;
    }

    ctx.fillStyle = 'rgba(6, 14, 28, 0.72)';
    ctx.fillRect(pad, hudTop, viewWidth - pad * 2, hudHeight);
    ctx.strokeStyle = bState.biome.palette.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, hudTop, viewWidth - pad * 2, hudHeight);

    ctx.fillStyle = '#dff4ff';
    ctx.font = '18px Trebuchet MS';
    ctx.fillText(`${bState.biome.name} | Score ${Math.floor(state.score)}`, pad + 12, hudTop + 30);
    ctx.font = '17px Trebuchet MS';
    ctx.fillText(compactObjective, pad + 12, hudTop + 58);
    ctx.fillText(`Weapon ${bState.biome.weapon.replace('_', ' ')} | Shop ${state.shopUnlocked ? 'ON' : 'LOCKED'}`, pad + 12, hudTop + 84);

    ctx.fillStyle = '#281319';
    ctx.fillRect(hpX, hudTop + 20, hpWidth, 18);
    ctx.fillStyle = '#ff6373';
    ctx.fillRect(hpX, hudTop + 20, hpWidth * (player.hp / player.maxHp), 18);
    ctx.strokeStyle = '#ffe7eb';
    ctx.strokeRect(hpX, hudTop + 20, hpWidth, 18);
    ctx.fillStyle = '#f9f9ff';
    ctx.font = '16px Trebuchet MS';
    ctx.fillText(`HP ${Math.max(0, Math.ceil(player.hp))}`, hpX, hudTop + 60);
    return;
  }

  const hudTop = 12;
  const hudHeight = 108;
  ctx.fillStyle = 'rgba(6, 14, 28, 0.68)';
  ctx.fillRect(pad, hudTop, viewWidth - pad * 2, hudHeight);
  ctx.strokeStyle = bState.biome.palette.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, hudTop, viewWidth - pad * 2, hudHeight);

  ctx.fillStyle = '#dff4ff';
  ctx.font = '24px Trebuchet MS';
  ctx.fillText(`${bState.biome.name} Biome`, pad + 16, hudTop + 34);
  ctx.font = '18px Trebuchet MS';
  ctx.fillText(`Weapon: ${bState.biome.weapon.replace('_', ' ')}`, pad + 16, hudTop + 60);
  ctx.fillText(objectiveText(), pad + 16, hudTop + 88);

  ctx.fillStyle = '#dff4ff';
  ctx.fillText(`Score: ${Math.floor(state.score)}`, 520, hudTop + 34);
  ctx.fillText(`Skin: ${getEquippedItem()?.name || 'Default Neon'}`, 520, hudTop + 60);
  ctx.fillText(`Shop: ${state.shopUnlocked ? 'Unlocked (K)' : 'Locked at 175'}`, 520, hudTop + 88);

  const hpWidth = 260;
  const hpX = viewWidth - hpWidth - 40;
  ctx.fillStyle = '#281319';
  ctx.fillRect(hpX, hudTop + 18, hpWidth, 20);
  ctx.fillStyle = '#ff6373';
  ctx.fillRect(hpX, hudTop + 18, hpWidth * (player.hp / player.maxHp), 20);
  ctx.strokeStyle = '#ffe7eb';
  ctx.strokeRect(hpX, hudTop + 18, hpWidth, 20);
  ctx.fillStyle = '#f9f9ff';
  ctx.fillText(`HP ${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`, hpX, hudTop + 64);
}

function drawOverlay() {
  const bState = state.biomeState;
  const viewWidth = getViewWidth();
  const viewHeight = getViewHeight();
  const centerX = viewWidth / 2;
  const mobile = state.touch.enabled;

  if (state.mode === MODES.MENU) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.fillStyle = '#8af4ff';
    ctx.font = `${mobile ? 44 : 58}px Trebuchet MS`;
    ctx.textAlign = 'center';
    ctx.fillText('Biome Combat Platformer', centerX, mobile ? 210 : 170);
    ctx.font = `${mobile ? 22 : 25}px Trebuchet MS`;
    ctx.fillStyle = '#f2fbff';
    if (mobile) {
      ctx.fillText('Touch controls: LEFT/RIGHT + JUMP/ATK/DASH', centerX, 300);
      ctx.fillText('Top buttons: START, PAUSE, SHOP, FULL', centerX, 340);
      ctx.fillText('Tap START to begin', centerX, 404);
      ctx.fillText('Biomes: Forest, Sea, Volcano, Snow, Cave, Space', centerX, 454);
    } else {
      ctx.fillText('Arrow Keys = Move | A = Attack | Shift = Dash', centerX, 250);
      ctx.fillText('Esc/P = Pause | F = Fullscreen | K = Shop (when unlocked)', centerX, 290);
      ctx.fillText('Press Enter to Start', centerX, 380);
      ctx.fillText('Mobile: Use on-screen controls and tap START', centerX, 420);
      ctx.fillText('Objective order: Forest, Sea, Volcano, Snow, Cave, Space', centerX, 470);
    }
    ctx.textAlign = 'start';
    return;
  }

  if (state.mode === MODES.PAUSED) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.fillStyle = '#a9f0ff';
    ctx.font = `${mobile ? 42 : 54}px Trebuchet MS`;
    ctx.textAlign = 'center';
    ctx.fillText('Paused', centerX, 280);
    ctx.font = `${mobile ? 22 : 24}px Trebuchet MS`;
    ctx.fillText(mobile ? 'Tap RESUME to continue' : 'Press Esc or P to resume', centerX, 335);
    ctx.textAlign = 'start';
    return;
  }

  if (state.mode === MODES.BIOME_COMPLETE) {
    ctx.fillStyle = 'rgba(5, 12, 20, 0.66)';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.fillStyle = bState.biome.palette.accent;
    ctx.font = `${mobile ? 42 : 56}px Trebuchet MS`;
    ctx.textAlign = 'center';
    ctx.fillText(`${bState.biome.name} Cleared`, centerX, 255);
    ctx.font = `${mobile ? 22 : 26}px Trebuchet MS`;
    ctx.fillStyle = '#e9f8ff';
    ctx.fillText('Biome bonus: +25 points', centerX, 305);
    ctx.fillText(mobile ? 'Tap NEXT to continue' : 'Press Enter for next biome', centerX, 350);
    ctx.textAlign = 'start';
    return;
  }

  if (state.mode === MODES.VICTORY) {
    ctx.fillStyle = 'rgba(6, 10, 26, 0.72)';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.fillStyle = '#f69dff';
    ctx.font = `${mobile ? 40 : 58}px Trebuchet MS`;
    ctx.textAlign = 'center';
    ctx.fillText('Victory Across All Biomes', centerX, 250);
    ctx.font = `${mobile ? 22 : 28}px Trebuchet MS`;
    ctx.fillStyle = '#e8f8ff';
    ctx.fillText(`Final Score: ${Math.floor(state.score)}`, centerX, 308);
    ctx.fillText(mobile ? 'Tap RESTART to play again' : 'Press Enter to restart campaign', centerX, 360);
    ctx.textAlign = 'start';
    return;
  }

  if (state.mode === MODES.SHOP) {
    ctx.fillStyle = 'rgba(3, 8, 14, 0.86)';
    const panelX = mobile ? 22 : 90;
    const panelY = mobile ? 48 : 60;
    const panelW = viewWidth - (mobile ? 44 : 180);
    const panelH = viewHeight - (mobile ? 104 : 120);
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#7ce5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    ctx.fillStyle = '#8bf1ff';
    ctx.font = `${mobile ? 34 : 46}px Trebuchet MS`;
    ctx.textAlign = 'center';
    ctx.fillText('Neon Skin Shop', centerX, mobile ? 100 : 120);
    ctx.font = `${mobile ? 18 : 24}px Trebuchet MS`;
    ctx.fillStyle = '#f2fbff';
    ctx.fillText(
      mobile ? `Score: ${Math.floor(state.score)} (Touch UP/DOWN/BUY)` : `Score: ${Math.floor(state.score)}   (Arrow keys + Enter)`,
      centerX,
      mobile ? 130 : 162,
    );

    for (let i = 0; i < SHOP_ITEMS.length; i += 1) {
      const item = SHOP_ITEMS[i];
      const y = (mobile ? 168 : 208) + i * (mobile ? 68 : 70);
      const selected = i === state.shopCursor;
      const owned = state.ownedItems.has(item.id);
      const equipped = state.equippedItemId === item.id;
      ctx.fillStyle = selected ? 'rgba(71, 207, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(panelX + 24, y - 30, panelW - 48, 54);
      ctx.fillStyle = item.color;
      ctx.fillRect(panelX + 38, y - 17, 22, 22);
      ctx.fillStyle = '#e8f8ff';
      ctx.font = `${mobile ? 17 : 22}px Trebuchet MS`;
      const perk = item.perkText ? ` (${item.perkText})` : '';
      ctx.textAlign = 'start';
      ctx.fillText(`${item.name}${perk}`, panelX + 76, y);
      let status = owned ? 'Owned' : `${item.cost} pts`;
      if (equipped) {
        status = 'Equipped';
      }
      ctx.fillStyle = owned ? '#99ffcb' : '#ffd9a6';
      ctx.fillText(status, panelX + panelW - (mobile ? 118 : 142), y);
    }

    ctx.fillStyle = '#cdefff';
    ctx.textAlign = 'center';
    ctx.font = `${mobile ? 16 : 22}px Trebuchet MS`;
    ctx.fillText(mobile ? 'Tap CLOSE to leave shop' : 'Esc: close', centerX, viewHeight - (mobile ? 64 : 92));
    ctx.textAlign = 'start';
  }
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(state.renderScaleX, 0, 0, state.renderScaleY, 0, 0);

  if (!state.biomeState) {
    const fallbackBiome = BIOMES[0];
    drawBackground(fallbackBiome);
  } else {
    drawWorld();
    const showHud = state.mode === MODES.PLAYING || state.mode === MODES.PAUSED || state.mode === MODES.SHOP;
    if (showHud) {
      drawHud();
    }
  }
  drawOverlay();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function tick() {
  updateTouchUiState();
  syncTouchControlsToKeys();
  processGlobalInputs();
  if (state.mode !== MODES.SHOP && state.mode !== MODES.PAUSED && state.mode !== MODES.MENU && state.mode !== MODES.VICTORY && state.mode !== MODES.BIOME_COMPLETE && !state.biomeState) {
    state.biomeState = makeBiomeState(state.biomeIndex);
  }
  updateGame();
  draw();
}

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    tick();
  }
};

window.render_game_to_text = () => {
  if (!state.biomeState) {
    return JSON.stringify({ mode: state.mode, note: 'No biome loaded yet' });
  }
  const bState = state.biomeState;
  const viewportMinX = state.cameraX;
  const viewportMaxX = state.cameraX + getViewWidth();
  const visibleEnemies = bState.enemies
    .filter((enemy) => enemy.x + enemy.w > viewportMinX && enemy.x < viewportMaxX)
    .map((enemy) => ({
      type: enemy.flying ? 'flying' : 'ground',
      x: Number(enemy.x.toFixed(1)),
      y: Number(enemy.y.toFixed(1)),
      hp: Number(enemy.hp.toFixed(1)),
    }));
  const visibleProjectiles = bState.projectiles
    .filter((shot) => shot.beam || (shot.x > viewportMinX && shot.x < viewportMaxX))
    .map((shot) => ({
      x: Number(shot.x.toFixed(1)),
      y: Number(shot.y.toFixed(1)),
      beam: Boolean(shot.beam),
      life: Number(shot.life.toFixed(2)),
    }));

  const objective = bState.biome.objective;
  let objectiveProgress;
  if (objective.type === 'kills') {
    objectiveProgress = { current: bState.objectiveProgress, target: objective.target };
  } else if (objective.type === 'chest') {
    objectiveProgress = { found: Boolean(bState.chest?.found) };
  } else {
    objectiveProgress = {
      timerRemaining: Number(bState.objectiveTimer.toFixed(2)),
      targetSeconds: objective.target,
    };
  }

  const payload = {
    coordinateSystem: 'origin top-left, +x right, +y down',
    mode: state.mode,
    biome: bState.biome.name,
    mobileControlsEnabled: state.touch.enabled,
    objectiveProgress,
    score: Math.floor(state.score),
    hp: Number(bState.player.hp.toFixed(1)),
    player: {
      x: Number(bState.player.x.toFixed(1)),
      y: Number(bState.player.y.toFixed(1)),
      vx: Number(bState.player.vx.toFixed(1)),
      vy: Number(bState.player.vy.toFixed(1)),
      dashReady: bState.player.dashCooldown <= 0,
    },
    statusEffects: {
      freezeMeter: Number(bState.freezeMeter.toFixed(2)),
      invulnerable: bState.player.invulnTime > 0,
    },
    visibleEnemies,
    visibleProjectiles,
    pickups: [
      ...(bState.chest && !bState.chest.found
        ? [{ type: 'chest', x: bState.chest.x, y: bState.chest.y }]
        : []),
      ...(!bState.exitGate.reached
        ? [{ type: 'exit_gate', x: bState.exitGate.x, y: bState.exitGate.y }]
        : []),
    ],
  };

  return JSON.stringify(payload);
};

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const mobileFullscreen = isLikelyMobilePlaySurface();

  if (mobileFullscreen) {
    const cssWidth = Math.max(1, Math.floor(window.innerWidth));
    const cssHeight = Math.max(1, Math.floor(window.innerHeight));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
  } else {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const scale = Math.min(window.innerWidth / viewWidth, window.innerHeight / viewHeight);
    const cssWidth = Math.max(1, Math.floor(viewWidth * scale));
    const cssHeight = Math.max(1, Math.floor(viewHeight * scale));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
  }

  state.renderScaleX = canvas.width / getViewWidth();
  state.renderScaleY = canvas.height / getViewHeight();
  updateTouchUiState();
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('fullscreenchange', resizeCanvas);

window.addEventListener('keydown', (event) => {
  sound.touch();
  state.keysDown.add(event.code);
  state.keysPressed.add(event.code);

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  state.keysDown.delete(event.code);
});

window.addEventListener('mousedown', () => {
  sound.touch();
});

state.biomeState = makeBiomeState(0);
setupTouchUi();
resizeCanvas();
updateTouchUiState();

tick();

let lastFrame = performance.now();
function gameLoop(now) {
  const elapsed = now - lastFrame;
  if (elapsed >= 1000 / 60) {
    lastFrame = now;
    tick();
  }
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
