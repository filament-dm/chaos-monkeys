// Takin Ridge engine. A mountainside ruin made of falling sand, overwritten play by play, with a herd of takin on it.
// Pure logic: no DOM, no network. The rules are the contract in SPEC.md.

export const W = 200, H = 150;
export const SETTLE = 1800;                       // physics ticks between plays (~30 s at 60 fps)
export const BUDGET = 3000;                       // cells a play may stamp
export const HERD = 14;
export const M = { EMPTY: 0, STONE: 1, SAND: 2, WATER: 3, SNOW: 4, MOSS: 5, TIMBER: 6, FIRE: 7 };
export const NAMES = ['empty', 'stone', 'sand', 'water', 'snow', 'moss', 'timber', 'fire'];
export const SUMMIT = { x: 168, y: 26, r: 12 };   // where the herd is trying to get

export function hashSeed(s) { let h = 2166136261 >>> 0; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }
export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  rng.range = (lo, hi) => lo + (hi - lo) * rng(); rng.int = n => Math.floor(rng() * n);
  return rng;
}
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

export function createWorld({ seed = 'takin', plays = [] }) {
  const w = { tick: 0, seed, rng: makeRng(hashSeed(seed)), cell: new Uint8Array(W * H), layer: new Int8Array(W * H).fill(-1),
    plays, playIndex: -1, phaseTick: 0, snapshots: [], diagrams: [], stats: plays.map(() => ({ stamped: 0, throws: 0, firstError: null })),
    herd: [], summitVisits: 0 };
  // The mountain: a ridge rising to the north-east summit, with a ruined wall, a timber hall, moss and snow.
  for (let x = 0; x < W; x++) {
    const ground = Math.round(H - 18 - x * 0.62 - 10 * Math.sin(x / 17) - 4 * Math.sin(x / 5));
    for (let y = Math.max(0, ground); y < H; y++) w.cell[y * W + x] = M.STONE;
    if (x > 140) for (let y = Math.max(0, ground - 4); y < ground; y++) w.cell[y * W + x] = M.SNOW;
    else if (w.rng() < 0.5) w.cell[Math.max(0, ground - 1) * W + x] = M.MOSS;
  }
  const g = x => { for (let y = 0; y < H; y++) if (w.cell[y * W + x] === M.STONE) return y; return H; };
  // The ruin: four broken pillars of different heights, and a roof beam across the two tallest.
  const tops = [];
  for (let x = 70, n = 0; x < 120; x += 13, n++) { const gx = g(x), h = [16, 9, 20, 6][n]; tops.push(gx - h); for (let y = gx - h; y < gx; y++) for (let k = 0; k < 3; k++) w.cell[y * W + x + k] = M.STONE; }
  for (let x = 96; x < 112; x++) w.cell[Math.min(tops[2], tops[3]) * W + x] = M.TIMBER;
  for (let i = 0; i < HERD; i++) { const x = 6 + w.rng() * 30; w.herd.push({ x, y: g(x | 0) - 1, vx: 0, vy: 0, dir: 1, fed: 0, id: i }); }
  w.snapshots.push(w.cell.slice());
  return w;
}

function apiFor(w, i) {
  let left = BUDGET;
  const st = w.stats[i], marks = [];
  const put = (x, y, mat) => {
    x |= 0; y |= 0;
    if (!inb(x, y) || left <= 0 || !(mat >= 0 && mat <= 7)) return false;
    left--; st.stamped++;
    w.cell[y * W + x] = mat; w.layer[y * W + x] = i;
    return true;
  };
  const mark = (x, y, mat) => marks.push({ x: x | 0, y: y | 0, k: mat === M.WATER || mat === M.SAND || mat === M.SNOW || mat === M.EMPTY ? 'O' : 'X' });
  return {
    W, H, M, SUMMIT, play: i, rng: makeRng(hashSeed(w.seed + ':play:' + i)),
    get: (x, y) => inb(x | 0, y | 0) ? w.cell[(y | 0) * W + (x | 0)] : M.STONE,
    herd: () => w.herd.map(t => ({ x: t.x, y: t.y, fed: t.fed })),
    left: () => left,
    set(x, y, mat) { mark(x, y, mat); return put(x, y, mat); },
    rect(x, y, ww, hh, mat) { mark(x + ww / 2, y + hh / 2, mat); for (let j = 0; j < hh; j++) for (let k = 0; k < ww; k++) put(x + k, y + j, mat); },
    circle(cx, cy, r, mat) { mark(cx, cy, mat); for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) if (k * k + j * j <= r * r) put(cx + k, cy + j, mat); },
    line(x0, y0, x1, y1, mat, thick = 1) {
      mark((x0 + x1) / 2, (y0 + y1) / 2, mat);
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; for (let j = 0; j < thick; j++) for (let k = 0; k < thick; k++) put(x + k, y + j, mat); }
    },
    _marks: marks
  };
}

function runPlay(w) {
  w.playIndex++;
  const i = w.playIndex, p = w.plays[i];
  const api = apiFor(w, i);
  try { p.stamp(api); } catch (e) { w.stats[i].throws++; w.stats[i].firstError ??= String(e && e.message || e); }
  w.diagrams.push(api._marks.slice(0, 40));
}

const swap = (c, a, b) => { const t = c[a]; c[a] = c[b]; c[b] = t; };
function physics(w) {
  const c = w.cell, L = w.layer, r = w.rng, flip = w.tick & 1;
  const mv = (a, b) => { swap(c, a, b); const t = L[a]; L[a] = L[b]; L[b] = t; };
  for (let y = H - 2; y >= 0; y--) {
    for (let k = 0; k < W; k++) {
      const x = flip ? k : W - 1 - k, i = y * W + x, m = c[i];
      if (m === M.EMPTY || m === M.STONE) continue;
      const below = i + W;
      if (m === M.SAND || m === M.SNOW) {
        if (c[below] === M.EMPTY || c[below] === M.WATER) { mv(i, below); continue; }
        const d = r() < 0.5 ? -1 : 1;
        if (inb(x + d, y + 1) && (c[below + d] === M.EMPTY || c[below + d] === M.WATER)) mv(i, below + d);
        else if (inb(x - d, y + 1) && (c[below - d] === M.EMPTY || c[below - d] === M.WATER)) mv(i, below - d);
      } else if (m === M.WATER) {
        if (c[below] === M.EMPTY) { mv(i, below); continue; }
        const d = r() < 0.5 ? -1 : 1;
        if (inb(x + d, y + 1) && c[below + d] === M.EMPTY) mv(i, below + d);
        else if (inb(x + d, y) && c[i + d] === M.EMPTY) mv(i, i + d);
        else if (inb(x - d, y) && c[i - d] === M.EMPTY) mv(i, i - d);
      } else if (m === M.FIRE) {
        // Fire eats timber and moss next to it, melts snow, is put out by water, and burns out on its own.
        let out = r() < 0.04;
        for (const n of [i - 1, i + 1, i - W, i + W]) {
          if (n < 0 || n >= c.length) continue;
          if (c[n] === M.WATER) out = true;
          else if ((c[n] === M.TIMBER || c[n] === M.MOSS) && r() < 0.06) c[n] = M.FIRE;
          else if (c[n] === M.SNOW && r() < 0.1) c[n] = M.WATER;
        }
        if (out) c[i] = r() < 0.4 ? M.SAND : M.EMPTY;        // ash, sometimes
        else if (y > 0 && c[i - W] === M.EMPTY && r() < 0.3) mv(i, i - W);    // flames climb
      } else if (m === M.MOSS && r() < 0.0015) {
        // Moss creeps onto stone that has open air above it.
        const d = r() < 0.5 ? -1 : 1, n = i + d;
        if (inb(x + d, y) && c[n] === M.STONE && y > 0 && c[n - W] === M.EMPTY) c[n - W] = M.MOSS;
      }
    }
  }
}

function herdStep(w) {
  const c = w.cell, r = w.rng;
  const solid = (x, y) => !inb(x | 0, y | 0) || [M.STONE, M.TIMBER, M.SAND, M.SNOW, M.MOSS].includes(c[(y | 0) * W + (x | 0)]);
  for (const t of w.herd) {
    // Gravity, and water holds you up a little.
    const inWater = inb(t.x | 0, t.y | 0) && c[(t.y | 0) * W + (t.x | 0)] === M.WATER;
    if (!solid(t.x, t.y + 1)) { t.vy = Math.min(2, t.vy + (inWater ? 0.03 : 0.2)); } else t.vy = 0;
    t.y += t.vy; while (solid(t.x, t.y) && t.y > 0) t.y -= 1;
    if (inb(t.x | 0, t.y | 0) && c[(t.y | 0) * W + (t.x | 0)] === M.FIRE) { t.x -= t.dir * 3; t.dir = -t.dir; }   // flee fire
    // Head for the summit, wander a little, and climb steps of up to 3 cells.
    if (r() < 0.02) t.dir = r() < 0.75 ? Math.sign(SUMMIT.x - t.x) || 1 : -t.dir;
    if (solid(t.x, t.y + 1) && r() < 0.5) {
      const nx = t.x + t.dir * 0.6;
      let step = 0; while (step <= 3 && solid(nx, t.y - step)) step++;
      if (step <= 3) { t.x = Math.max(0, Math.min(W - 1, nx)); t.y -= step; } else t.dir = -t.dir;
    }
    // Graze moss underfoot or just ahead.
    for (const [dx, dy] of [[0, 1], [t.dir, 0], [t.dir, 1]]) {
      const x = (t.x + dx) | 0, y = (t.y + dy) | 0;
      if (inb(x, y) && c[y * W + x] === M.MOSS && r() < 0.05) { c[y * W + x] = M.EMPTY; t.fed++; break; }
    }
    if (Math.hypot(t.x - SUMMIT.x, t.y - SUMMIT.y) < SUMMIT.r) { w.summitVisits++; t.x = 6 + r() * 20; t.y = 0; t.vy = 0; }  // reached it: a new calf starts low
  }
}

export function step(w) {
  if (w.phaseTick === 0 && w.playIndex + 1 < w.plays.length) runPlay(w);
  physics(w);
  herdStep(w);
  w.tick++; w.phaseTick++;
  if (w.phaseTick >= SETTLE) {
    w.phaseTick = 0;
    if (w.snapshots.length <= w.plays.length) w.snapshots.push(w.cell.slice());
  }
  return w;
}

export function stats(w) {
  const count = new Array(8).fill(0); for (const m of w.cell) count[m]++;
  return { tick: w.tick, play: w.playIndex, summitVisits: w.summitVisits, fed: w.herd.reduce((a, t) => a + t.fed, 0),
    materials: Object.fromEntries(NAMES.map((n, k) => [n, count[k]])), plays: w.plays.map((p, i) => ({ name: p.name, author: p.author, ...w.stats[i] })) };
}
