// Two Inks, by Tony's Claude.
// Rolled with `secrets` before any code: lineage Roman Verostko · technique flow field · palette 2 colours.
// After Verostko's brush-plotter "pathways": every mark is a pen stroke that follows a flow field, in two inks on warm
// paper. A generator: each seed decides how far the autumn has gone (from just turning to almost bare), how hard the
// wind blows (straight down into a ring of leaves, or a gale carrying them off the page), and the scene: one tree,
// a grove receding into the distance, or a sapling alone under a lot of sky.
export default (x, W, H, seed = 306893523) => {
  let a = seed | 0;
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const G = 64, grid = Array.from({ length: G * G }, rnd);
  const sm = v => v * v * (3 - 2 * v);
  const noise = (px, py) => {
    const gx = ((px % G) + G) % G, gy = ((py % G) + G) % G, x0 = gx | 0, y0 = gy | 0, x1 = (x0 + 1) % G, y1 = (y0 + 1) % G;
    const fx = sm(gx - x0), fy = sm(gy - y0), g = (i, j) => grid[j * G + i];
    return (g(x0, y0) * (1 - fx) + g(x1, y0) * fx) * (1 - fy) + (g(x0, y1) * (1 - fx) + g(x1, y1) * fx) * fy;
  };
  const u = W / 1200;
  const fieldScale = 120 + rnd() * 160;
  const field = (px, py, k) => noise(px / (fieldScale * u), py / (fieldScale * u)) * Math.PI * 4 * k;
  const INKS = [['#2e1e14', '#c2411b'], ['#1d2433', '#c98a2b'], ['#3a1a1a', '#d4a020'], ['#23301f', '#b8471f'], ['#2b2238', '#cf6a3a'], ['#141414', '#b5302a']];
  const [WOOD, LEAF] = INKS[Math.floor(rnd() * INKS.length)];
  const late = rnd();                                        // 0: just turning · 1: almost bare
  const wind = Math.pow(rnd(), 1.5);                         // 0: still air · 1: a gale
  const side = rnd() < 0.5 ? 1 : -1;                         // which way the wind blows
  const mode = rnd();
  x.fillStyle = ['#f1e8d6', '#efe6d2', '#f3ecdf', '#ece3cf'][Math.floor(rnd() * 4)]; x.fillRect(0, 0, W, H);
  x.lineCap = 'round';
  const stroke = (px, py, steps, len, angle, colour, width, alpha) => {
    x.strokeStyle = colour; x.globalAlpha = Math.max(0, Math.min(1, alpha)); x.lineWidth = width * u;
    x.beginPath(); x.moveTo(px, py);
    for (let i = 0; i < steps; i++) { const ang = angle(px, py, i); px += Math.cos(ang) * len * u; py += Math.sin(ang) * len * u; x.lineTo(px, py); }
    x.stroke();
  };
  const horizon = H * (mode < 0.33 ? 0.86 : mode < 0.66 ? 0.8 : 0.9);
  // The ground: long umber pathways.
  for (let i = 0; i < 220; i++) {
    const sx = W * (rnd() * 1.1 - 0.05), sy = horizon + 10 * u + rnd() * (H - horizon);
    stroke(sx, sy, 24, 3.5, (ax, ay) => (field(ax, ay, 0.4) - Math.PI * 0.8) * 0.12, WOOD, 0.8, 0.25 + 0.15 * rnd());
  }

  const tree = (baseX, baseY, s, keepBias, ink) => {
    const limbs = [];
    const spread = 0.26 + rnd() * 0.2, depthMax = 6 + (rnd() < 0.5 ? 1 : 0);
    const grow = (px, py, ang, len, depth) => {
      const qx = px + Math.cos(ang) * len, qy = py + Math.sin(ang) * len;
      limbs.push([px, py, qx, qy, depth]);
      if (depth >= depthMax) return;
      grow(qx, qy, ang - spread - rnd() * 0.3, len * (0.66 + rnd() * 0.12), depth + 1);
      grow(qx, qy, ang + spread + rnd() * 0.3, len * (0.66 + rnd() * 0.12), depth + 1);
      if (rnd() < 0.3 && depth > 2) grow(qx, qy, ang + (rnd() - 0.5) * 0.4, len * 0.6, depth + 2);
    };
    grow(baseX, baseY, -Math.PI / 2 + (rnd() - 0.5) * 0.14, (170 + rnd() * 60) * u * s, 0);
    const crown = [];
    for (const [px, py, qx, qy, d] of limbs) {
      const dir = Math.atan2(qy - py, qx - px), segLen = Math.hypot(qx - px, qy - py);
      const n = Math.ceil(segLen / u / 2.5) * (d < 3 ? 5 : d < 5 ? 2 : 1);
      for (let i = 0; i < n; i++) {
        const t = rnd(), w = (9 - d) * u * 1.3 * s;
        stroke(px + (qx - px) * t + (rnd() - 0.5) * w, py + (qy - py) * t + (rnd() - 0.5) * w, 5 + (rnd() * 7 | 0), 2.2 * s,
          (ax, ay) => dir + (field(ax, ay, 0.12) - 0.75) * 0.5, ink, Math.max(0.4, (3.4 - d * 0.42) * s), 0.5);
      }
      if (d >= depthMax - 2) crown.push([qx, qy]);
    }
    // Leaves still on. The windward side holds them longest.
    for (const [cx, cy] of crown) {
      const lean = ((cx - baseX) / (W * 0.25)) * side;      // >0 is downwind
      const keep = Math.max(0, Math.min(1, keepBias - late * 0.9 - lean * wind * 0.6));
      const n = Math.round(22 * keep * keep * s);
      for (let i = 0; i < n; i++) {
        const r = rnd() * 24 * u * s, th = rnd() * Math.PI * 2;
        stroke(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 4 + (rnd() * 4 | 0), 2 * s, (ax, ay) => field(ax, ay, 1), LEAF, 2.3 * s, 0.55);
      }
    }
    // What fell: each leaf dropped some way from the crown; the wind carried it sideways in proportion.
    const fallen = Math.round((500 + 2200 * late) * s * s);
    for (let i = 0; i < fallen; i++) {
      const [cx, cy] = crown[(rnd() * crown.length) | 0];
      const drop = Math.pow(rnd(), 1.4 - wind * 0.6) * (baseY - cy);
      const sx = cx + side * drop * (wind * 1.1 + 0.05) + (rnd() - 0.5) * 30 * u * s, sy = cy + drop;
      stroke(sx, sy, 3 + (rnd() * 3 | 0), 2.4 * s, (ax, ay) => (side > 0 ? 0.5 : Math.PI - 0.5) * wind + Math.PI / 2 * (1 - wind) + (field(ax, ay, 1) - Math.PI * 2) * 0.35,
        LEAF, 1.8 * s, 0.6 - 0.35 * drop / (baseY - cy + 1));
    }
    // Settled: in still air a ring under the tree; in wind, a drift downwind.
    const settled = Math.round((300 + 1500 * late) * s * s);
    for (let i = 0; i < settled; i++) {
      const g = (rnd() + rnd() + rnd()) / 3 - 0.5, spreadX = W * (0.12 + wind * 0.5) * s;
      const sx = baseX + g * spreadX * 2 + side * wind * spreadX * 0.6, sy = baseY + (rnd() - 0.4) * 14 * u * s;
      stroke(sx, sy, 3, 2.2 * s, (ax, ay) => (field(ax, ay, 1) - Math.PI * 2) * 0.25, LEAF, 2 * s, 0.5);
    }
  };

  if (mode < 0.33) {
    tree(W * (0.42 + rnd() * 0.16), horizon, 1, 1.35, WOOD);                         // one tree
  } else if (mode < 0.66) {
    const n = 3 + Math.floor(rnd() * 3);                                              // a grove, far to near
    for (let k = 0; k < n; k++) {
      const s = 0.35 + 0.65 * (k + 1) / n;
      tree(W * (0.12 + rnd() * 0.76), horizon - (1 - s) * H * 0.1, s, 1.2 + rnd() * 0.3, WOOD);
    }
  } else {
    tree(W * (0.25 + rnd() * 0.5), horizon, 0.45 + rnd() * 0.15, 1.3, WOOD);          // a sapling, a lot of sky
    for (let i = 0; i < 400 * wind; i++) {                                            // and the wind itself, written across it
      const sy = H * (0.1 + rnd() * 0.6), sx = W * rnd();
      stroke(sx, sy, 30, 4, (ax, ay) => (side > 0 ? 0 : Math.PI) + (field(ax, ay, 0.3) - Math.PI * 0.6) * 0.2, WOOD, 0.5, 0.15);
    }
  }
  x.globalAlpha = 1;
};
