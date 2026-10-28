// The Tide Argues: engine. Pure logic, deterministic, browser and Node.
// A shallow-water bay on a grid. Water surface `eta` over a seabed `bed`; flow `u` (x faces), `v` (y faces).
// Tides act only through the api: raising or lowering water in a disc, or blowing on it.

export const W = 160, H = 100;              // cells
export const G = 9.8, DT = 0.06, DX = 1;    // gravity, timestep, cell size (stable for depths up to ~3)
export const FRICTION = 0.004;              // bottom drag
export const BUDGET = { lift: 40, blow: 60 }; // per tide, per tick: total |lift| volume and total |blow| impulse
export const SEA_EDGE = 3;                  // columns on the left that relax toward sea level (the open sea)

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
const I = (x, y) => y * W + x;

// The bay: open sea to the west, mudflats and saltmarsh in the middle, rising land to the east,
// a river mouth from the north-east, and a village (Bellerose) on a low hill.
export const VILLAGE = { x: 128, y: 34, r: 7 };
function makeBed(rng) {
  const bed = new Float32Array(W * H);
  const bumps = Array.from({ length: 14 }, () => [rng() * W, rng() * H, 4 + rng() * 10, rng.range(-0.25, 0.25)]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let b = -1.0 + 2.2 * (x / W);                         // deep west, land east
    b += 0.35 * Math.sin(y / 9 + x / 23) * (x / W);               // creeks
    for (const [bx, by, br, bh] of bumps) { const d = Math.hypot(x - bx, y - by); if (d < br) b += bh * (1 - d / br); }
    const rv = Math.abs(y - (12 + (x - 90) * 0.35));              // the river channel cutting in from the north-east
    if (x > 90 && rv < 3) b = Math.min(b, -0.15 - 0.1 * (3 - rv));
    const dv = Math.hypot(x - VILLAGE.x, y - VILLAGE.y);          // the village hill
    if (dv < VILLAGE.r + 6) b = Math.max(b, 0.55 - 0.02 * dv);
    bed[I(x, y)] = b;
  }
  return bed;
}

export function createWorld({ seed = 'tide', tides = [] }) {
  const rng = makeRng(hashSeed(seed));
  const bed = makeBed(rng);
  const eta = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) eta[i] = Math.max(0, bed[i]);   // sea level 0; land starts dry
  return {
    seed, tick: 0, t: 0, bed, eta,
    u: new Float32Array((W + 1) * H), v: new Float32Array(W * (H + 1)),
    tides, mems: tides.map(() => ({})), rngs: tides.map((_, k) => makeRng(hashSeed(seed + ':tide:' + k))),
    stats: tides.map(() => ({ lift: 0, blow: 0, ms: 0, throws: 0, firstError: null })),
    flooded: 0, history: []
  };
}

export const depth = (w, x, y) => Math.max(0, w.eta[I(x, y)] - w.bed[I(x, y)]);

function apiFor(w, k) {
  const left = { lift: BUDGET.lift, blow: BUDGET.blow };
  const st = w.stats[k];
  const disc = (x, y, r, fn) => {
    const x0 = clamp(Math.floor(x - r), 0, W - 1), x1 = clamp(Math.ceil(x + r), 0, W - 1);
    const y0 = clamp(Math.floor(y - r), 0, H - 1), y1 = clamp(Math.ceil(y + r), 0, H - 1);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const d = Math.hypot(xx - x, yy - y);
      if (d <= r) fn(xx, yy, 1 - d / (r + 1e-9));
    }
  };
  return {
    tick: w.tick, t: w.t, W, H, village: VILLAGE,
    rng: w.rngs[k], mem: w.mems[k],
    eta: (x, y) => w.eta[I(clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1))],
    bed: (x, y) => w.bed[I(clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1))],
    depth: (x, y) => depth(w, clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1)),
    flooded: () => w.flooded,
    // Raise (amount > 0) or lower (< 0) the water surface in a disc. Lowering never goes below the seabed.
    lift(x, y, r, amount) {
      r = clamp(+r || 0, 0.5, 30); amount = +amount || 0;
      let cells = 0; disc(x, y, r, () => cells++);
      const want = Math.abs(amount) * cells, give = Math.min(want, left.lift);
      if (give <= 0) return 0;
      const a = amount * (give / want);
      disc(x, y, r, (xx, yy, f) => { const i = I(xx, yy); w.eta[i] = Math.max(w.bed[i], w.eta[i] + a * (0.5 + 0.5 * f)); });
      left.lift -= give; st.lift += give;
      return a;
    },
    // Wind: push the water in a disc by (fx, fy).
    blow(x, y, r, fx, fy) {
      r = clamp(+r || 0, 0.5, 40);
      const m = Math.hypot(fx, fy) || 0; if (!m) return 0;
      let cells = 0; disc(x, y, r, () => cells++);
      const want = m * cells, give = Math.min(want, left.blow);
      if (give <= 0) return 0;
      const s = give / want;
      disc(x, y, r, (xx, yy, f) => { w.u[yy * (W + 1) + xx + 1] += fx * s * f; w.v[(yy + 1) * W + xx] += fy * s * f; });
      left.blow -= give; st.blow += give;
      return s;
    }
  };
}

export function step(w) {
  const { eta, bed, u, v } = w;
  // 1. The tides act.
  w.tides.forEach((td, k) => {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
    try { td.force(apiFor(w, k)); }
    catch (e) { w.stats[k].throws++; w.stats[k].firstError ??= String(e && e.message || e); }
    w.stats[k].ms += (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  });
  // 2. Momentum: the surface slope accelerates the water; bottom drag slows it. Dry faces carry nothing.
  for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) {
    const a = I(x - 1, y), b = I(x, y), j = y * (W + 1) + x;
    const da = eta[a] - bed[a], db = eta[b] - bed[b];
    if (da <= 1e-3 && db <= 1e-3) { u[j] = 0; continue; }
    u[j] = (u[j] - G * DT * (eta[b] - eta[a]) / DX) * (1 - FRICTION);
    u[j] = clamp(u[j], -3, 3);
  }
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const a = I(x, y - 1), b = I(x, y), j = y * W + x;
    const da = eta[a] - bed[a], db = eta[b] - bed[b];
    if (da <= 1e-3 && db <= 1e-3) { v[j] = 0; continue; }
    v[j] = (v[j] - G * DT * (eta[b] - eta[a]) / DX) * (1 - FRICTION);
    v[j] = clamp(v[j], -3, 3);
  }
  // 3. Continuity: water moves with the flow, carried by the upwind depth (so dry land floods from its wet edge).
  const next = eta.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    const flux = (j, uu, from, to) => uu * Math.max(0, uu > 0 ? eta[from] - bed[from] : eta[to] - bed[to]);
    const fl = x > 0 ? flux(y * (W + 1) + x, u[y * (W + 1) + x], I(x - 1, y), i) : 0;
    const fr = x < W - 1 ? flux(y * (W + 1) + x + 1, u[y * (W + 1) + x + 1], i, I(x + 1, y)) : 0;
    const ft = y > 0 ? flux(y * W + x, v[y * W + x], I(x, y - 1), i) : 0;
    const fb = y < H - 1 ? flux((y + 1) * W + x, v[(y + 1) * W + x], i, I(x, y + 1)) : 0;
    next[i] = Math.max(bed[i], eta[i] + DT * (fl - fr + ft - fb) / DX);
  }
  eta.set(next);
  // 4. The open sea at the west edge relaxes toward sea level, so the bay can't fill or empty for ever.
  for (let y = 0; y < H; y++) for (let x = 0; x < SEA_EDGE; x++) { const i = I(x, y); eta[i] += (0 - eta[i]) * 0.05; }
  // 5. Is the village wet?
  let wet = 0, n = 0;
  for (let y = VILLAGE.y - VILLAGE.r; y <= VILLAGE.y + VILLAGE.r; y++) for (let x = VILLAGE.x - VILLAGE.r; x <= VILLAGE.x + VILLAGE.r; x++) {
    if (Math.hypot(x - VILLAGE.x, y - VILLAGE.y) > VILLAGE.r) continue;
    n++; if (eta[I(x, y)] - bed[I(x, y)] > 0.02) wet++;
  }
  w.flooded = wet / n;
  w.tick++; w.t = w.tick * DT;
  if (w.tick % 30 === 0) w.history.push(w.flooded);
  return w;
}
