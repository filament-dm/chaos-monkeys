// The Improvements engine. A palace-stadium of load-bearing blocks, improved every decade by blind agents,
// until the sum of good ideas brings it down. Pure logic: no DOM, no network. The contract is SPEC.md.

export const W = 160, H = 100;
export const GROUND = H - 6;
export const START = 1780, DECADES = 20;                  // 1780 to 1980
export const BUDGET = 400;                                // blocks an improvement may add per decade
export const SETTLE_STEPS = 40;                           // statics/collapse iterations per decade
// Materials: [name, weight, strength, colour]. Strength is how much load (its own weight included) a block can carry.
export const MAT = {
  AIR: 0, STONE: 1, BRICK: 2, TIMBER: 3, GILT: 4, CONCRETE: 5, STEEL: 6, GLASS: 7, RUBBLE: 8
};
export const PROPS = [
  ['air', 0, 0, '#000'],
  ['stone', 2.0, 60, '#b9b2a4'],
  ['brick', 1.4, 34, '#a65a42'],
  ['timber', 0.6, 14, '#8a6238'],
  ['gilt', 1.2, 10, '#d8b24a'],
  ['concrete', 2.4, 70, '#9a9a96'],
  ['steel', 1.8, 120, '#5d6b78'],
  ['glass', 0.5, 25, '#9fc9dc'],
  ['rubble', 1.5, 9999, '#6e655a']
];

export function hashSeed(s) { let h = 2166136261 >>> 0; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }
export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  rng.range = (lo, hi) => lo + (hi - lo) * rng(); rng.int = n => Math.floor(rng() * n);
  return rng;
}
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

export function createWorld({ seed = 'improvements', improvements = [] }) {
  const N = W * H;
  const w = { seed, decade: 0, year: START, rng: makeRng(hashSeed(seed)), improvements,
    mat: new Uint8Array(N), owner: new Int8Array(N).fill(-1), age: new Uint16Array(N), crack: new Uint8Array(N),
    load: new Float32Array(N), snapshots: [], log: [], stats: improvements.map(() => ({ added: 0, throws: 0, firstError: null })), collapsed: 0 };
  const put = (x, y, m) => { if (inb(x, y)) { w.mat[y * W + x] = m; w.owner[y * W + x] = -1; } };
  // The ground.
  for (let y = GROUND; y < H; y++) for (let x = 0; x < W; x++) put(x, y, MAT.STONE);
  // Pacassi's palace on the left: a rusticated base, a piano nobile of brick, pilasters, a timber roof.
  for (let x = 14; x < 74; x++) {
    for (let y = GROUND - 8; y < GROUND; y++) put(x, y, MAT.STONE);
    for (let y = GROUND - 22; y < GROUND - 8; y++) put(x, y, (x - 14) % 6 === 0 ? MAT.STONE : ((y % 5 === 1 && (x - 14) % 6 > 1 && (x - 14) % 6 < 5) ? MAT.GLASS : MAT.BRICK));
    const roofH = Math.max(0, 6 - Math.abs(x - 44) / 5) | 0;
    for (let y = GROUND - 23 - roofH; y < GROUND - 22; y++) put(x, y, MAT.TIMBER);
  }
  // The 1927 stadium on the right: raked concrete stands on columns.
  for (let x = 88; x < 148; x++) {
    const tier = Math.min(18, ((x - 88) / 3) | 0);
    for (let y = GROUND - tier - 2; y < GROUND - tier; y++) put(x, y, MAT.CONCRETE);
    if ((x - 88) % 4 === 0) for (let y = GROUND - tier; y < GROUND; y++) put(x, y, MAT.CONCRETE);
  }
  w.snapshots.push(snapshot(w));
  return w;
}

function snapshot(w) { return { year: w.year, mat: w.mat.slice(), owner: w.owner.slice(), crack: w.crack.slice() }; }

// The API one improvement gets for one decade.
function apiFor(w, i) {
  let left = BUDGET;
  const st = w.stats[i];
  return {
    W, H, GROUND, MAT, year: w.year, decade: w.decade, rng: makeRng(hashSeed(w.seed + ':' + i + ':' + w.decade)), mem: (w['mem' + i] ??= {}),
    get: (x, y) => inb(x | 0, y | 0) ? w.mat[(y | 0) * W + (x | 0)] : MAT.STONE,
    load: (x, y) => inb(x | 0, y | 0) ? w.load[(y | 0) * W + (x | 0)] : 0,
    cracked: (x, y) => inb(x | 0, y | 0) ? w.crack[(y | 0) * W + (x | 0)] > 0 : false,
    strength: m => PROPS[m] ? PROPS[m][2] : 0,
    weight: m => PROPS[m] ? PROPS[m][1] : 0,
    left: () => left,
    // Add one block. You may only build into air or rubble; you can't delete other people's work.
    add(x, y, m) {
      x |= 0; y |= 0;
      if (left <= 0 || !inb(x, y) || !(m >= 1 && m <= 7)) return false;
      const k = y * W + x;
      if (w.mat[k] !== MAT.AIR && w.mat[k] !== MAT.RUBBLE) return false;
      w.mat[k] = m; w.owner[k] = i; w.age[k] = 0; w.crack[k] = 0; left--; st.added++;
      return true;
    },
    // Shore up: reset the crack on a block (a repair costs 3 budget).
    repair(x, y) { x |= 0; y |= 0; const k = y * W + x; if (left < 3 || !inb(x, y) || !w.crack[k]) return false; w.crack[k] = 0; left -= 3; return true; }
  };
}

// Statics: load flows down. Each block carries its own weight plus what rests on it, and passes it on to the
// blocks under it (straight down first, then the diagonals). A block with nothing under it is a cantilever:
// it hands its load sideways to a neighbour, at a 1.5x penalty. A block with no support at all falls.
function statics(w) {
  const { mat, load } = w;
  load.fill(0);
  const solid = k => mat[k] && mat[k] !== MAT.RUBBLE;
  for (let y = 0; y < GROUND; y++) {
    const row = y * W;
    // 1. Own weight, plus whatever arrived from above.
    for (let x = 0; x < W; x++) { const k = row + x; if (solid(k)) load[k] += PROPS[mat[k]][1] * (1 + w.age[k] / 900); }
    // 2. Spans: a block with nothing under it hands its load along the row to the nearest supported block
    //    (within 8 cells), carried at a small penalty per cell of span. Nothing within reach: it falls.
    const supported = x => { const k = row + x; return y + 1 >= GROUND || solid(k + W) || (x > 0 && solid(k + W - 1)) || (x < W - 1 && solid(k + W + 1)); };
    for (let x = 0; x < W; x++) {
      const k = row + x;
      if (!solid(k) || supported(x)) continue;
      let best = -1, bd = 99;
      for (let d = 1; d <= 8; d++) {
        for (const nx of [x - d, x + d]) {
          if (nx < 0 || nx >= W || best >= 0) continue;
          // The span has to be continuous solid material between here and the support.
          let ok = true; for (let t = Math.min(x, nx); t <= Math.max(x, nx); t++) if (!solid(row + t)) { ok = false; break; }
          if (ok && supported(nx)) { best = nx; bd = d; }
        }
        if (best >= 0) break;
      }
      if (best >= 0) { load[row + best] += load[k] * (1 + 0.08 * bd); load[k] *= 0.2; }   // the span still carries a little itself
      else (w.loose ||= []).push(k);
    }
    // 3. Down: straight down first, then the diagonals.
    for (let x = 0; x < W; x++) {
      const k = row + x;
      if (!solid(k) || y + 1 >= GROUND) continue;
      const below = solid(k + W) ? [k + W] : [], diag = [];
      if (x > 0 && solid(k + W - 1)) diag.push(k + W - 1);
      if (x < W - 1 && solid(k + W + 1)) diag.push(k + W + 1);
      if (below.length) { load[below[0]] += load[k] * (diag.length ? 0.7 : 1); for (const d of diag) load[d] += load[k] * 0.3 / diag.length; }
      else for (const d of diag) load[d] += load[k] / diag.length;
    }
  }
}

// One settle step: overloaded blocks crack, cracked blocks that are still overloaded crumble to rubble,
// unsupported blocks fall, and rubble falls like sand.
function settle(w, r) {
  w.loose = [];
  statics(w);
  let changed = 0;
  const { mat, load, crack } = w;
  for (let k = 0; k < GROUND * W; k++) {
    const m = mat[k];
    if (!m || m === MAT.RUBBLE) continue;
    const strength = PROPS[m][2] * (m === MAT.TIMBER ? Math.max(0.45, 1 - w.age[k] / 260) : 1);   // timber rots
    if (load[k] > strength) {
      if (crack[k] > 2 + r() * 3) { mat[k] = MAT.RUBBLE; crack[k] = 0; changed++; w.collapsed++; }
      else crack[k]++;
    }
  }
  for (const k of w.loose) if (mat[k] && mat[k] !== MAT.RUBBLE) { mat[k] = MAT.RUBBLE; changed++; w.collapsed++; }
  // Rubble falls and piles.
  for (let y = GROUND - 2; y >= 0; y--) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (mat[k] !== MAT.RUBBLE) continue;
    const mv = t => { mat[t] = MAT.RUBBLE; mat[k] = MAT.AIR; w.owner[t] = w.owner[k]; w.owner[k] = -1; changed++; };
    if (!mat[k + W]) mv(k + W);
    else { const d = r() < 0.5 ? -1 : 1; if (x + d >= 0 && x + d < W && !mat[k + W + d]) mv(k + W + d); }
  }
  return changed;
}

export function stepDecade(w) {
  if (w.decade >= DECADES) return false;
  w.improvements.forEach((imp, i) => {
    try { imp.decade(apiFor(w, i)); } catch (e) { w.stats[i].throws++; w.stats[i].firstError ??= String(e && e.message || e); }
  });
  const before = w.collapsed;
  for (let s = 0; s < SETTLE_STEPS; s++) if (!settle(w, w.rng) && s > 4) break;
  for (let k = 0; k < w.age.length; k++) if (w.mat[k] && w.mat[k] !== MAT.RUBBLE) w.age[k] = Math.min(65535, w.age[k] + 10);
  w.decade++; w.year += 10;
  w.log.push({ year: w.year, fell: w.collapsed - before, standing: countStanding(w), cracked: countCracked(w) });
  w.snapshots.push(snapshot(w));
  return true;
}

function countStanding(w) { let n = 0; for (let k = 0; k < GROUND * W; k++) if (w.mat[k] && w.mat[k] !== MAT.RUBBLE) n++; return n; }
function countCracked(w) { let n = 0; for (let k = 0; k < GROUND * W; k++) if (w.crack[k]) n++; return n; }

export function stats(w) {
  return { year: w.year, standing: countStanding(w), cracked: countCracked(w), collapsed: w.collapsed, log: w.log,
    improvements: w.improvements.map((p, i) => ({ name: p.name, author: p.author, ...w.stats[i] })) };
}
