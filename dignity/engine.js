// Dignity engine. A page made of letters that fall, pile and get pushed around by blind rewriters.
// Pure logic: no DOM, no network, runs in the browser and in Node. The rules are the contract in SPEC.md.

export const W = 960, H = 600;
export const GRAVITY = 0.12, DRAG = 0.985, FLOOR_FRICTION = 0.6;
export const GROUND = H - 30;                                    // the ground surface; piles stand on it
export const RIVER_TOP = GROUND - 80, RIVER_CURRENT = 0.05;      // the Arkansas: a shallow band over the ground, left of the harbor
export const COL = 8;                                            // pile column width in px
export const GLYPH_H = 10;                                       // a settled glyph is this tall
export const CAP = 4000;                                         // most glyphs alive at once
export const BUDGET = { push: 400, spawn: 6, remove: 6 };        // per rewriter, per tick
export const IMPULSE_MAX = 2;                                    // largest velocity change in one push
export const HARBOR = { x: W - 150, y: 0, w: 150, h: GROUND };    // the quay at the right edge, where wages pile up
export const BOAT_MASS = 220;                                    // settled glyph mass in the harbor that launches the boat
export const NIGHT_TICKS = 36000;                                // ~10 minutes at 60 fps; then the night ends anyway

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

// Heavier letters for heavier shapes; spaces are never glyphs.
export function massOf(ch) {
  if ('MWQ@#%&'.includes(ch)) return 2;
  if ('.,\'`-:;!|i'.includes(ch)) return 0.5;
  return 1;
}

// The opening text: the three things the dice drew, in Wikipedia's words and ours. No lyrics.
export const SOURCES = {
  town: 'Clarksville, Arkansas. A city between the Arkansas River and the foothills of the Ozark Mountains, with Interstate 40 running through.',
  painting: 'Portrait of Arthur Atherley. Thomas Lawrence, 1791. A young man in a red coat, posed before a river and a wide sky.',
  song: 'Dignity. Deacon Blue. A man who sweeps the streets of the town, saving every wage for a boat he will name Dignity. The last song of the night.'
};

export function createWorld({ seed = 'dignity', night = 1, rewriters = [] }) {
  const world = {
    W, H, tick: 0, seed, night, rng: makeRng(hashSeed(seed + ':world')),
    glyphs: [], nextId: 1, heights: new Float32Array(Math.ceil(W / COL)), cols: Array.from({ length: Math.ceil(W / COL) }, () => []),
    rewriters, mems: rewriters.map(() => ({})), stats: rewriters.map(() => ({ push: 0, spawn: 0, remove: 0, ms: 0, throws: 0, firstError: null })),
    harborMass: 0, boat: null, ended: null
  };
  // Lay the three sources out as lines of text across the sky; they start to fall at once.
  let y = 40;
  for (const [tag, text] of Object.entries(SOURCES)) {
    let x = 40;
    for (const ch of text) {
      if (ch === ' ') { x += 7; if (x > W - 220) { x = 40; y += 16; } continue; }
      addGlyph(world, ch, x, y, 0, 0, tag, 'engine');
      x += 7;
    }
    y += 34;
  }
  rewriters.forEach((r, i) => safe(world, i, () => r.init && r.init(apiFor(world, i))));
  return world;
}

function addGlyph(world, ch, x, y, vx, vy, tag, owner) {
  if (world.glyphs.length >= CAP) return null;
  const g = { id: world.nextId++, ch: String(ch).slice(0, 1) || '?', x: clamp(x, 0, W - 1), y: clamp(y, 0, H - 1), vx, vy,
    m: massOf(ch), tag: String(tag || 'spawned').slice(0, 24), owner, rest: false, alive: true, col: -1 };
  world.glyphs.push(g);
  return g;
}

// Knock a settled glyph loose. Everything stacked on top of it in its column falls too.
function unsettle(world, g) {
  if (!g.rest) return;
  const c = g.col, stack = world.cols[c], k = stack.indexOf(g);
  const loose = k >= 0 ? stack.splice(k) : [g];
  for (const o of loose) { o.rest = false; o.col = -1; }
  world.heights[c] = stack.length * GLYPH_H;
  return loose;
}

// The API a rewriter gets. Everything a rewriter does goes through here, inside its budget.
function apiFor(world, i) {
  const st = world.stats[i];
  const left = { push: BUDGET.push, spawn: BUDGET.spawn, remove: BUDGET.remove };
  const api = {
    W, H, GROUND, RIVER_TOP, HARBOR, tick: world.tick, night: world.night,
    rng: makeRng(hashSeed(world.seed + ':' + i + ':' + world.tick)),
    mem: world.mems[i],
    me: world.rewriters[i].name,
    // Reading: plain snapshots, so writing to them changes nothing.
    glyphs: () => world.glyphs.map(view),
    near: (x, y, r) => { const out = []; for (const g of world.glyphs) { const dx = g.x - x, dy = g.y - y; if (dx * dx + dy * dy <= r * r) out.push(view(g)); } return out; },
    pileHeight: x => world.heights[clamp((x / COL) | 0, 0, world.heights.length - 1)],
    harborMass: () => world.harborMass,
    // Writing: impulses, spawns and removals, each budgeted per tick.
    push(id, ax, ay) {
      if (left.push <= 0) return false;
      const g = byId(world, id); if (!g) return false;
      left.push--; st.push++;
      const a = Math.hypot(ax, ay) || 0, k = a > IMPULSE_MAX ? IMPULSE_MAX / a : 1;
      unsettle(world, g);
      g.vx += (Number(ax) || 0) * k / g.m; g.vy += (Number(ay) || 0) * k / g.m;
      return true;
    },
    spawn(ch, x, y, vx = 0, vy = 0, tag) {
      if (left.spawn <= 0 || ch === ' ') return null;
      const g = addGlyph(world, ch, Number(x) || 0, Number(y) || 0, clamp(Number(vx) || 0, -4, 4), clamp(Number(vy) || 0, -4, 4), tag, world.rewriters[i].name);
      if (g) { left.spawn--; st.spawn++; return g.id; }
      return null;
    },
    remove(id) {
      if (left.remove <= 0) return false;
      const g = byId(world, id); if (!g) return false;
      left.remove--; st.remove++;
      unsettle(world, g); g.alive = false;
      if (world._index) world._index.delete(g.id);
      return true;
    }
  };
  return api;
}
const view = g => ({ id: g.id, ch: g.ch, x: g.x, y: g.y, vx: g.vx, vy: g.vy, m: g.m, tag: g.tag, owner: g.owner, rest: g.rest });
function byId(world, id) {
  if (!world._index || world._indexTick !== world.tick) {
    world._index = new Map(); for (const g of world.glyphs) if (g.alive) world._index.set(g.id, g);
    world._indexTick = world.tick;
  }
  const g = world._index.get(id);
  return g && g.alive ? g : null;
}
function safe(world, i, fn) {
  const st = world.stats[i];
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  try { fn(); } catch (e) { st.throws++; st.firstError ??= String(e && e.message || e); }
  if (typeof performance !== 'undefined') st.ms += performance.now() - t0;
}

export function step(world) {
  if (world.ended) return world;
  world.tick++;
  // Rewriters act first, in an order that rotates every tick so nobody always goes first.
  const n = world.rewriters.length;
  for (let k = 0; k < n; k++) {
    const i = (k + world.tick) % n;
    safe(world, i, () => world.rewriters[i].step(apiFor(world, i)));
  }
  if (world.boat) return sail(world);

  // Physics: gravity, drag, the river current, walls, and settling into piles.
  for (const g of world.glyphs) {
    if (!g.alive || g.rest) continue;
    g.vy += GRAVITY;
    if (g.y > RIVER_TOP && g.x < HARBOR.x) { g.vx += RIVER_CURRENT; g.vy *= 0.9; }
    g.vx *= DRAG; g.vy *= DRAG;
    g.x += g.vx; g.y += g.vy;
    if (g.x < 0) { g.x = 0; g.vx = -g.vx * 0.4; }
    if (g.y < 0) { g.y = 0; g.vy = 0; }
    if (g.x >= W - 1) { g.x = W - 1; g.vx = -g.vx * 0.3; }      // the quay wall; nothing leaves the page except by remove()
    const c = clamp((g.x / COL) | 0, 0, world.heights.length - 1);
    const top = GROUND - world.heights[c];
    if (g.y >= top - GLYPH_H * 0.5 && g.vy >= 0) {
      // Slide off a pile that's taller than its neighbour, like sand; otherwise settle.
      const lh = c > 0 ? world.heights[c - 1] : 1e9, rh = c < world.heights.length - 1 ? world.heights[c + 1] : 1e9;
      const here = world.heights[c];
      if (here - Math.min(lh, rh) > GLYPH_H * 1.5) { g.x += (lh < rh ? -COL : COL); g.vy = 0; g.vx *= FLOOR_FRICTION; continue; }
      g.rest = true; g.col = c; g.vx = 0; g.vy = 0;
      g.y = top - GLYPH_H * 0.5;
      world.cols[c].push(g);
      world.heights[c] += GLYPH_H;
    }
  }
  world.glyphs = world.glyphs.filter(g => g.alive);

  // Wages: settled mass in the harbor, above the river.
  let mass = 0;
  for (const g of world.glyphs) if (g.rest && g.x >= HARBOR.x) mass += g.m;
  world.harborMass = mass;
  if (mass >= BOAT_MASS) launch(world);
  else if (world.tick >= NIGHT_TICKS) world.ended = { tick: world.tick, sailed: false };
  return world;
}

// The boat: harbor glyphs fly into a hull shape that spells DIGNITY, then sail off the right edge.
function launch(world) {
  const crew = world.glyphs.filter(g => g.rest && g.x >= HARBOR.x);
  const name = 'DIGNITY';
  crew.forEach((g, k) => {
    g.rest = false;
    const row = (k / 40) | 0, colk = k % 40;
    const hullW = 40 - row * 4;
    g.tx = W - 380 + (colk % Math.max(4, hullW)) * 8 + row * 16;
    g.ty = RIVER_TOP - 6 - row * 10;
    if (k < name.length) { g.ch = name[k]; g.tx = W - 330 + k * 22; g.ty = RIVER_TOP - 70; g.big = true; }
  });
  for (const g of crew) g.col = -1;
  world.cols.forEach((stack, c) => { world.cols[c] = stack.filter(g => g.rest); world.heights[c] = world.cols[c].length * GLYPH_H; });
  world.boat = { crew: new Set(crew.map(g => g.id)), startTick: world.tick };
}
function sail(world) {
  const t = world.tick - world.boat.startTick;
  for (const g of world.glyphs) {
    if (!world.boat.crew.has(g.id)) continue;
    if (t < 120) { g.x += (g.tx - g.x) * 0.08; g.y += (g.ty - g.y) * 0.08; }
    else { g.x += Math.min(6, (t - 120) * 0.03); g.y = g.ty + Math.sin((t + g.id) / 12) * 2; }
  }
  if (t > 600) world.ended = { tick: world.tick, sailed: true };
  return world;
}

export function stats(world) {
  const byTag = {}, byOwner = {};
  for (const g of world.glyphs) { byTag[g.tag] = (byTag[g.tag] || 0) + 1; byOwner[g.owner] = (byOwner[g.owner] || 0) + 1; }
  return {
    tick: world.tick, glyphs: world.glyphs.length, harborMass: Math.round(world.harborMass), boat: !!world.boat, ended: world.ended,
    byTag, byOwner,
    rewriters: world.rewriters.map((r, i) => ({ name: r.name, author: r.author, ...world.stats[i], ms: Math.round(world.stats[i].ms) }))
  };
}
