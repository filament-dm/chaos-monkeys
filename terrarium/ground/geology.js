// Geology: the ground under the Terrarium. Land, sea and plant food that change from era to era.
//
// Every parameter below was rolled with Python's `secrets` before this file was written and
// committed by hash in the chat (sha256 7524a456…cb36a56); the roll file is ground-roll.json.
// The engine fixes an era at 2000 ticks, so the rolled era lengths are used as how long each
// era's change takes to arrive instead.

const ROLL = {
  climates: ['monsoon', 'monsoon', 'monsoon', 'drought', 'ice', 'monsoon', 'volcanic', 'drought', 'drought'],
  shiftTicks: [300, 900, 900, 1200, 600, 600, 1200, 600, 450],
  catastrophes: { 2: 'ash winter', 4: 'rift', 8: 'rift' },
  seaLevel: 0.374,
  roughness: 0.356,
  regen: 0.0148 / 40, // scaled so food is scarce enough that species compete
};

// How each climate moves the sea, scales plant growth, and where plants prefer to grow.
const CLIMATE = {
  monsoon:  { sea: +0.05, grow: 1.5, wet: 2.0 },
  drought:  { sea: -0.08, grow: 0.45, wet: 3.0 },
  ice:      { sea: -0.04, grow: 0.25, wet: 0.5 },
  volcanic: { sea: 0.0,   grow: 1.2, wet: 1.0, high: true },
};

const state = new WeakMap(); // per world, so many worlds can run side by side

function noise(W, H, rng, rough) {
  // Value noise over four octaves, smoother when roughness is low.
  const out = new Float32Array(W * H);
  let amp = 1, total = 0;
  for (let o = 0, cell = 32; o < 4; o++, cell /= 2, amp *= rough) {
    const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
    const g = new Float32Array(gw * gh).map(() => rng());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = x / cell, fy = y / cell, x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
      out[y * W + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
    }
    total += amp;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function climateOf(era) { return CLIMATE[ROLL.climates[era % ROLL.climates.length]]; }

export default {
  name: 'Geology',
  author: 'Claudette',

  init(world, rng) {
    const { W, H, elev, food } = world;
    elev.set(noise(W, H, rng, ROLL.roughness));
    const c = climateOf(0);
    const st = { sea: ROLL.seaLevel + c.sea, from: ROLL.seaLevel + c.sea, to: ROLL.seaLevel + c.sea, era: 0, ash: 1 };
    state.set(world, st);
    setWater(world, st.sea);
    for (let i = 0; i < food.length; i++) food[i] = world.water[i] >= 1 ? 0 : 0.6 * rng();
  },

  step(world, rng) {
    const st = state.get(world);
    const { W, H, elev, water, food, tick } = world;
    const era = Math.floor(tick / 2000);

    // A new era: pick the climate's sea level to move toward, and strike any catastrophe now.
    if (era !== st.era) {
      st.era = era;
      st.from = st.sea;
      st.to = ROLL.seaLevel + climateOf(era).sea;
      st.ash = 1;
      const kind = ROLL.catastrophes[era % ROLL.climates.length];
      if (kind === 'ash winter') { st.ash = 0.35; for (let i = 0; i < food.length; i++) food[i] *= 0.3; }
      if (kind === 'rift') rift(world, rng);
    }

    // The sea moves gradually over the era's rolled shift time.
    const shift = ROLL.shiftTicks[era % ROLL.shiftTicks.length];
    const t = Math.min(1, (tick - era * 2000) / shift);
    const sea = st.from + (st.to - st.from) * t;
    const moving = Math.abs(sea - st.sea) > 1e-4;
    st.sea = sea;
    if (st.ash < 1) st.ash = Math.min(1, st.ash + 0.0004);

    // One pass: water if the sea moved, plant regrowth, and a little erosion on one row.
    const c = climateOf(era);
    const base = ROLL.regen * c.grow * st.ash;
    const erodeRow = rng.int(H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (moving) water[i] = waterAt(elev[i], sea);
      if (water[i] >= 1) { food[i] = 0; continue; }
      const wetness = 1 + c.wet * water[i];
      const height = c.high ? 0.5 + elev[i] : 1;
      food[i] = Math.min(1, food[i] + base * wetness * height);
      if (y === erodeRow && x > 0 && x < W - 1) {
        // Ridges wear down toward their neighbours, slowly.
        const avg = (elev[i - 1] + elev[i + 1]) / 2;
        elev[i] += (avg - elev[i]) * 0.02;
      }
    }
  }
};

function waterAt(e, sea) { return e < sea ? 1 : Math.max(0, 1 - (e - sea) * 12); }
function setWater(world, sea) { for (let i = 0; i < world.elev.length; i++) world.water[i] = waterAt(world.elev[i], sea); }

// A rift: a straight crack across the land drops it below the sea, splitting continents.
function rift(world, rng) {
  const { W, H, elev } = world;
  const x0 = rng() * W, y0 = rng() * H, ang = rng() * Math.PI, dx = Math.cos(ang), dy = Math.sin(ang);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.abs((x - x0) * dy - (y - y0) * dx);
    if (d < 2.5) elev[y * W + x] *= 0.35 + 0.25 * (d / 2.5);
  }
  setWater(world, state.get(world).sea);
}
