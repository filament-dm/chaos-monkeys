// Terrarium engine. Pure logic: no DOM, no network, runs in the browser and in Node.
// The rules here are the contract described in SPEC.md. Change them only by PR with everyone's review.

export const W = 128, H = 80;
export const ERA_TICKS = 2000;
export const CAP_TOTAL = 1500, CAP_SPECIES = 600;
export const TRAIT_BOUNDS = { size: [0.5, 3], speed: [0.2, 2], sense: [2, 8] };
const REACH = 1.0;

export function hashSeed(s) {
  let h = 2166136261 >>> 0;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}
export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + (hi - lo) * rng();
  rng.int = n => Math.floor(rng() * n);
  return rng;
}

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const idx = (x, y) => (clamp(y | 0, 0, H - 1)) * W + clamp(x | 0, 0, W - 1);
function fixTraits(t = {}) {
  const out = {};
  for (const k in TRAIT_BOUNDS) out[k] = clamp(Number(t[k]) || TRAIT_BOUNDS[k][0], ...TRAIT_BOUNDS[k]);
  return out;
}

export function createWorld({ seed = 'terrarium', ground, species }) {
  const rng = makeRng(hashSeed(seed));
  const world = {
    W, H, tick: 0, era: 0, seed,
    elev: new Float32Array(W * H), water: new Float32Array(W * H), food: new Float32Array(W * H),
    creatures: [], nextId: 1, species, ground, rng,
    history: species.map(() => []), extinctAt: species.map(() => null), born: species.map(() => 0)
  };
  ground.init(world, makeRng(hashSeed(seed + ':ground:0')));
  species.forEach((sp, s) => {
    const n = clamp(sp.founders | 0 || 30, 1, 60);
    for (let i = 0; i < n; i++) spawn(world, s, sp.create(rng), rng() * W, rng() * H, 3 * 1);
  });
  return world;
}

function spawn(world, s, gene, x, y, energy) {
  const traits = fixTraits(gene && gene.traits);
  world.creatures.push({
    id: world.nextId++, s, x: clamp(x, 0, W - 0.01), y: clamp(y, 0, H - 0.01),
    energy, age: 0, ...traits, genome: gene ? gene.genome : null, mem: {}, signal: 0, alive: true
  });
  world.born[s]++;
}

function senseFor(world, me, grid) {
  const r = me.sense;
  const near = [];
  const cx = (me.x / 8) | 0, cy = (me.y / 8) | 0, span = Math.ceil(r / 8);
  for (let gy = cy - span; gy <= cy + span; gy++) for (let gx = cx - span; gx <= cx + span; gx++) {
    const bucket = grid.get(gy * 1000 + gx);
    if (!bucket) continue;
    for (const o of bucket) {
      if (o === me || !o.alive) continue;
      const dx = o.x - me.x, dy = o.y - me.y;
      if (dx * dx + dy * dy <= r * r) near.push({ id: o.id, dx, dy, species: world.species[o.s].name, kin: o.s === me.s, size: o.size, energy: Math.round(o.energy * 10) / 10, signal: o.signal });
    }
  }
  const look = (dx, dy) => {
    if (dx * dx + dy * dy > r * r) return null;
    const i = idx(me.x + dx, me.y + dy);
    return { elev: world.elev[i], water: world.water[i], food: world.food[i] };
  };
  const i = idx(me.x, me.y);
  return { here: { elev: world.elev[i], water: world.water[i], food: world.food[i] }, look, near, tick: world.tick, era: world.era };
}

export function step(world) {
  const { rng, species } = world;
  world.tick++;
  const era = Math.floor(world.tick / ERA_TICKS);
  if (era !== world.era) world.era = era;
  world.ground.step(world, makeRng(hashSeed(world.seed + ':ground:' + world.tick)));

  const live = world.creatures;
  const grid = new Map();
  for (const c of live) { const k = ((c.y / 8) | 0) * 1000 + ((c.x / 8) | 0); (grid.get(k) || grid.set(k, []).get(k)).push(c); }
  const byId = new Map(live.map(c => [c.id, c]));
  const counts = species.map(() => 0);
  for (const c of live) counts[c.s]++;

  // Shuffle so no species always moves first.
  const order = live.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = rng.int(i + 1); [order[i], order[j]] = [order[j], order[i]]; }

  for (const me of order) {
    if (!me.alive) continue;
    let act = {};
    try { act = species[me.s].think(me, senseFor(world, me, grid), rng) || {}; } catch (e) { act = {}; }
    const i0 = idx(me.x, me.y);
    // Upkeep: being big, fast and perceptive all cost energy every tick.
    me.energy -= 0.004 * me.size * me.size + 0.003 * me.speed * me.speed + 0.0015 * me.sense;
    // Movement.
    let dx = Number(act.dx) || 0, dy = Number(act.dy) || 0;
    const v = Math.hypot(dx, dy);
    if (v > me.speed) { dx *= me.speed / v; dy *= me.speed / v; }
    const v2 = dx * dx + dy * dy;
    if (v2 > 0) {
      me.energy -= 0.01 * me.size * v2 * (1 + 2 * world.water[i0]);
      me.x = clamp(me.x + dx, 0, W - 0.01); me.y = clamp(me.y + dy, 0, H - 0.01);
    }
    me.signal = clamp(Number(act.signal) || 0, 0, 1);
    const i = idx(me.x, me.y);
    // Eating plants.
    if (act.eat) {
      const bite = Math.min(world.food[i], 0.08 * me.size);
      world.food[i] -= bite; me.energy += bite;
    }
    // Attacking: succeeds if you are at least 80% of the target's size.
    if (act.attack != null) {
      const t = byId.get(act.attack);
      me.energy -= 0.02 * me.size;
      if (t && t.alive && t !== me && Math.hypot(t.x - me.x, t.y - me.y) <= REACH && me.size >= 0.8 * t.size) {
        me.energy += 0.7 * Math.max(0, t.energy) + 0.3 * t.size; t.alive = false; t.energy = 0;
      }
    }
    // Reproduction: needs energy above twice your size. The parent chooses what share to give.
    if (act.reproduce && me.energy > 2 * me.size && counts[me.s] < CAP_SPECIES && world.creatures.length < CAP_TOTAL) {
      const share = clamp(Number(act.reproduce) || 0.5, 0.2, 0.8);
      const gift = me.energy * share;
      me.energy -= gift + 0.1 * me.size;
      let gene = null;
      try { gene = species[me.s].child(me, rng); } catch (e) { gene = { traits: me, genome: me.genome }; }
      spawn(world, me.s, gene, me.x + rng.range(-0.5, 0.5), me.y + rng.range(-0.5, 0.5), gift);
      counts[me.s]++;
    }
    me.age++;
    if (me.energy <= 0 || me.age > 4000 * me.size) me.alive = false;
  }
  // The dead feed the ground.
  for (const c of world.creatures) if (!c.alive) { const i = idx(c.x, c.y); world.food[i] = Math.min(1, world.food[i] + 0.2 * c.size + 0.5 * Math.max(0, c.energy)); }
  world.creatures = world.creatures.filter(c => c.alive);
  const pop = species.map(() => 0);
  for (const c of world.creatures) pop[c.s]++;
  pop.forEach((n, s) => { world.history[s].push(n); if (n === 0 && world.extinctAt[s] === null) world.extinctAt[s] = world.tick; });
  return world;
}

export function stats(world) {
  return world.species.map((sp, s) => {
    const h = world.history[s];
    return {
      name: sp.name, author: sp.author,
      final: h[h.length - 1] || 0, peak: Math.max(0, ...h),
      mean: h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0,
      extinctAt: world.extinctAt[s], born: world.born[s]
    };
  });
}
