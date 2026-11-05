// Inner Enemies (અંતઃશત્રુ વિજય) – pure game logic, no DOM. Rendering lives in shatru.js.
export const W = 360;
export const H = 640;

// Six faults. `gem` = index into GEMS of the virtue gem that drops when it is destroyed.
export const FAULTS = [
  { id: 'kam', gu: 'કામ', en: 'Kaam', color: '#D9534F', gem: 1, hp: 1 },
  { id: 'krodh', gu: 'ક્રોધ', en: 'Krodh', color: '#E8742A', gem: 0, hp: 1 },
  { id: 'lobh', gu: 'લોભ', en: 'Lobh', color: '#C9A227', gem: 2, hp: 2 },
  { id: 'moh', gu: 'મોહ', en: 'Moh', color: '#8E5BC8', gem: 1, hp: 2 },
  { id: 'mad', gu: 'મદ', en: 'Mad', color: '#3F8FB8', gem: 3, hp: 1 },
  { id: 'matsar', gu: 'મત્સર', en: 'Matsar', color: '#4E9A62', gem: 3, hp: 1 },
];
// Four virtue gems; three of a kind trigger a power.
export const GEMS = [
  { id: 'kshama', gu: 'ક્ષમા', en: 'Forgiveness', power: 'shield', color: '#5DB7E8', icon: '🛡' },
  { id: 'vivek', gu: 'વિવેક', en: 'Discernment', power: 'power', color: '#F5C542', icon: '✧' },
  { id: 'santosh', gu: 'સંતોષ', en: 'Contentment', power: 'magnet', color: '#6CC27A', icon: '◈' },
  { id: 'satsang', gu: 'સત્સંગ', en: 'Satsang', power: 'rain', color: '#F58AB8', icon: '☀' },
];
export const POWER_SECONDS = { shield: 6, power: 8, magnet: 8 };
export const TOTAL_WAVES = 5;

const COLS = 6;
const CELL_X = 50;
const CELL_Y = 46;
const ENEMY_R = 18;
const SHIP_Y = H - 70;
const SHIP_HALF = 20;
const BURN_RADIUS = 62;

export function createRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function waveConfig(w) {
  return {
    rows: Math.min(2 + w, 5),
    speed: 28 + 8 * w,
    drop: 16,
    flameChance: Math.min(0.14 + 0.035 * w, 0.4),
    shotEvery: Math.max(1.5, 3.4 - 0.35 * w),
    hpBonus: w >= 4 ? 1 : 0,
  };
}

export function createState({ wave = 1, rng = createRng(7), score = 0, lives = 3 } = {}) {
  const s = {
    rng, wave, score, lives,
    t: 0, phase: 'play', // play | won | lost | cleared
    ship: { x: W / 2, hit: 0 },
    bullets: [], orbs: [], gems: [], enemies: [], effects: [],
    power: { shield: 0, power: 0, magnet: 0 },
    gemCount: [0, 0, 0, 0],
    fireCd: 0, shotCd: 2, dir: 1, offX: 0, offY: 0,
    kills: 0, events: [],
  };
  spawnWave(s);
  return s;
}

function spawnWave(s) {
  const cfg = waveConfig(s.wave);
  s.enemies = [];
  const x0 = (W - (COLS - 1) * CELL_X) / 2;
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const type = Math.floor(s.rng() * FAULTS.length);
      const hp = FAULTS[type].hp + cfg.hpBonus;
      s.enemies.push({
        type, hp, maxHp: hp, bx: x0 + c * CELL_X, by: 70 + r * CELL_Y,
        flame: s.rng() < cfg.flameChance, burn: -1, dead: false,
      });
    }
  }
  s.offX = 0; s.offY = 0; s.dir = 1; s.bullets = []; s.orbs = []; s.gems = [];
  s.shotCd = 2;
}

export const enemyPos = (s, e) => ({ x: e.bx + s.offX, y: e.by + s.offY });

function damageEnemy(s, e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  if (e.hp > 0) return;
  e.dead = true;
  s.kills += 1;
  s.score += 10 * s.wave;
  const p = enemyPos(s, e);
  const g = FAULTS[e.type].gem;
  s.gems.push({ x: p.x, y: p.y, kind: g, vy: 90 });
  s.effects.push({ x: p.x, y: p.y, t: 0, life: 0.45, color: FAULTS[e.type].color, flame: e.flame });
  s.events.push({ type: 'kill', fault: e.type });
  if (e.flame) {
    for (const o of s.enemies) {
      if (o.dead || o.burn >= 0) continue;
      const q = enemyPos(s, o);
      if (Math.hypot(q.x - p.x, q.y - p.y) <= BURN_RADIUS) o.burn = 0.14;
    }
  }
}

function collectGem(s, kind) {
  s.score += 5;
  s.gemCount[kind] += 1;
  s.events.push({ type: 'gem', kind });
  if (s.gemCount[kind] >= 3) {
    s.gemCount[kind] = 0;
    const power = GEMS[kind].power;
    if (power === 'rain') {
      for (const e of s.enemies) damageEnemy(s, e, 2);
      s.effects.push({ x: W / 2, y: H / 2, t: 0, life: 0.7, color: '#FFE7A0', rain: true });
    } else s.power[power] = POWER_SECONDS[power];
    s.events.push({ type: 'power', power });
  }
}

function loseLife(s) {
  if (s.ship.hit > 0) return;
  if (s.power.shield > 0) { s.ship.hit = 0.6; s.events.push({ type: 'blocked' }); return; }
  s.lives -= 1;
  s.ship.hit = 1.6;
  s.events.push({ type: 'hit' });
  if (s.lives <= 0) s.phase = 'lost';
}

/** input: { targetX?: number, left?: boolean, right?: boolean } */
export function update(s, dt, input = {}) {
  s.events = [];
  if (s.phase !== 'play') return s;
  dt = Math.min(dt, 0.05);
  s.t += dt;
  const cfg = waveConfig(s.wave);

  // Ship movement
  const speed = 420;
  if (typeof input.targetX === 'number') {
    const d = input.targetX - s.ship.x;
    s.ship.x += Math.max(-speed * dt, Math.min(speed * dt, d));
  } else if (input.left || input.right) {
    s.ship.x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * speed * dt;
  }
  s.ship.x = Math.max(SHIP_HALF, Math.min(W - SHIP_HALF, s.ship.x));
  if (s.ship.hit > 0) s.ship.hit = Math.max(0, s.ship.hit - dt);
  for (const k of Object.keys(s.power)) if (s.power[k] > 0) s.power[k] = Math.max(0, s.power[k] - dt);

  // Auto fire
  s.fireCd -= dt;
  if (s.fireCd <= 0) {
    const strong = s.power.power > 0;
    s.fireCd = strong ? 0.17 : 0.3;
    s.bullets.push({ x: s.ship.x, y: SHIP_Y - 18, dmg: strong ? 2 : 1, strong });
  }

  // Formation movement
  const alive = s.enemies.filter((e) => !e.dead);
  if (alive.length) {
    const minX = Math.min(...alive.map((e) => e.bx)) + s.offX;
    const maxX = Math.max(...alive.map((e) => e.bx)) + s.offX;
    s.offX += s.dir * cfg.speed * dt;
    if (maxX + ENEMY_R > W - 8 && s.dir > 0) { s.dir = -1; s.offY += cfg.drop; }
    else if (minX - ENEMY_R < 8 && s.dir < 0) { s.dir = 1; s.offY += cfg.drop; }
  }

  // Burning chain
  for (const e of s.enemies) {
    if (!e.dead && e.burn >= 0) {
      e.burn -= dt;
      if (e.burn < 0) { e.burn = -2; damageEnemy(s, e, 1); }
    }
  }

  // Enemy shots
  s.shotCd -= dt;
  if (s.shotCd <= 0 && alive.length) {
    s.shotCd = cfg.shotEvery * (0.7 + s.rng() * 0.6);
    const shooter = alive[Math.floor(s.rng() * alive.length)];
    const p = enemyPos(s, shooter);
    s.orbs.push({ x: p.x, y: p.y + 14, vy: 150 + 12 * s.wave, color: FAULTS[shooter.type].color });
  }

  // Bullets vs enemies
  for (const b of s.bullets) {
    b.y -= 560 * dt;
    if (b.y < -10) { b.dead = true; continue; }
    for (const e of s.enemies) {
      if (e.dead) continue;
      const p = enemyPos(s, e);
      if (Math.abs(b.x - p.x) < ENEMY_R + (b.strong ? 5 : 2) && Math.abs(b.y - p.y) < ENEMY_R) {
        damageEnemy(s, e, b.dmg);
        b.dead = true;
        break;
      }
    }
  }
  s.bullets = s.bullets.filter((b) => !b.dead);

  // Enemy orbs vs ship
  for (const o of s.orbs) {
    o.y += o.vy * dt;
    if (o.y > H + 10) o.dead = true;
    else if (Math.abs(o.x - s.ship.x) < SHIP_HALF - 2 && Math.abs(o.y - SHIP_Y) < 18) { o.dead = true; loseLife(s); }
  }
  s.orbs = s.orbs.filter((o) => !o.dead);

  // Gems
  for (const g of s.gems) {
    if (s.power.magnet > 0) {
      const dx = s.ship.x - g.x; const dy = SHIP_Y - g.y; const d = Math.hypot(dx, dy) || 1;
      g.x += (dx / d) * 260 * dt; g.y += (dy / d) * 260 * dt;
    } else g.y += g.vy * dt;
    if (Math.abs(g.x - s.ship.x) < 24 && Math.abs(g.y - SHIP_Y) < 24) { g.dead = true; collectGem(s, g.kind); }
    else if (g.y > H + 10) g.dead = true;
  }
  s.gems = s.gems.filter((g) => !g.dead);

  // Effects
  for (const f of s.effects) f.t += dt;
  s.effects = s.effects.filter((f) => f.t < f.life);

  // Enemies reaching the ship line
  for (const e of s.enemies) {
    if (e.dead) continue;
    if (enemyPos(s, e).y + ENEMY_R >= SHIP_Y - 20) {
      loseLife(s);
      s.offY = Math.max(0, s.offY - 140);
      break;
    }
  }

  s.enemies = s.enemies.filter((e) => !e.dead);

  if (s.phase === 'play' && s.enemies.length === 0) {
    if (s.wave >= TOTAL_WAVES) { s.phase = 'won'; s.events.push({ type: 'won' }); }
    else { s.phase = 'cleared'; s.events.push({ type: 'cleared' }); }
  }
  return s;
}

export function nextWave(s) {
  s.wave += 1;
  s.phase = 'play';
  s.ship.hit = 1;
  spawnWave(s);
}
