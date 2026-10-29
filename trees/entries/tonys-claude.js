// The Turning, by Tony's Claude.
// Rolled with `secrets` before any code: lineage Roman Verostko · technique flow field · palette 2 colours.
// A generator: each seed picks its own two inks, tree, wind side and field.
// After Verostko's brush-plotter "pathways": every mark is a pen stroke that follows a flow field. Two inks on warm paper:
// umber for the wood, vermilion for the leaves. The tree is caught mid-turn: full on the left, bare on the right,
// and what it lost is drifting down and to the right, settling along the ground.
export default (x, W, H, seed = 306893523) => {
  let a = seed | 0;
  const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // Smooth value noise for the field.
  const G = 64, grid = Array.from({ length: G * G }, rnd);
  const sm = v => v * v * (3 - 2 * v);
  const noise = (px, py) => {
    const gx = ((px % G) + G) % G, gy = ((py % G) + G) % G, x0 = gx | 0, y0 = gy | 0, x1 = (x0 + 1) % G, y1 = (y0 + 1) % G;
    const fx = sm(gx - x0), fy = sm(gy - y0), g = (i, j) => grid[j * G + i];
    return (g(x0, y0) * (1 - fx) + g(x1, y0) * fx) * (1 - fy) + (g(x0, y1) * (1 - fx) + g(x1, y1) * fx) * fy;
  };
  const u = W / 1200;                                        // everything is designed at 1200 wide and scaled
  const field = (px, py, k) => noise(px / (180 * u), py / (180 * u)) * Math.PI * 4 * k;
  // Two inks per piece, drawn from a few pairs, and the wind can come from either side.
  const INKS = [['#2e1e14', '#c2411b'], ['#1d2433', '#c98a2b'], ['#3a1a1a', '#d4a020'], ['#23301f', '#b8471f'], ['#2b2238', '#cf6a3a']];
  const pick = INKS[Math.floor(rnd() * INKS.length)], UMBER = pick[0], VERM = pick[1];
  const flip = rnd() < 0.5;                                // mirror the whole piece: the wind blows the other way
  if (flip) { x.translate(W, 0); x.scale(-1, 1); }
  x.fillStyle = ['#f1e8d6', '#efe6d2', '#f3ecdf'][Math.floor(rnd() * 3)]; x.fillRect(0, 0, W, H);
  x.lineCap = 'round';

  const stroke = (px, py, steps, len, angle, colour, width, alpha) => {
    x.strokeStyle = colour; x.globalAlpha = alpha; x.lineWidth = width * u;
    x.beginPath(); x.moveTo(px, py);
    for (let i = 0; i < steps; i++) { const ang = angle(px, py, i); px += Math.cos(ang) * len * u; py += Math.sin(ang) * len * u; x.lineTo(px, py); }
    x.stroke();
  };

  // The skeleton: a trunk and recursive limbs. Wood strokes are seeded along it and follow it, bent by the field.
  const limbs = [];
  const grow = (px, py, ang, len, depth) => {
    const qx = px + Math.cos(ang) * len, qy = py + Math.sin(ang) * len;
    limbs.push([px, py, qx, qy, depth]);
    if (depth >= 7) return;
    const lean = qx < W * 0.5 ? 0.05 : 0.12;                // the bare side reaches further
    grow(qx, qy, ang - 0.32 - rnd() * 0.3 - lean, len * (0.68 + rnd() * 0.1), depth + 1);
    grow(qx, qy, ang + 0.3 + rnd() * 0.3, len * (0.66 + rnd() * 0.1), depth + 1);
    if (rnd() < 0.3 && depth > 2) grow(qx, qy, ang + (rnd() - 0.5) * 0.4, len * 0.6, depth + 2);
  };
  const baseX = W * (0.38 + rnd() * 0.16), baseY = H * (0.82 + rnd() * 0.06);
  grow(baseX, baseY, -Math.PI / 2 - 0.04 + (rnd() - 0.5) * 0.12, (180 + rnd() * 50) * u, 0);
  const crown = [];
  for (const [px, py, qx, qy, d] of limbs) {
    const dir = Math.atan2(qy - py, qx - px), segLen = Math.hypot(qx - px, qy - py);
    const n = Math.ceil(segLen / u / 2.5) * (d < 3 ? 6 : d < 5 ? 3 : 1);
    for (let i = 0; i < n; i++) {
      const t = rnd(), sx = px + (qx - px) * t + (rnd() - 0.5) * (9 - d) * u * 1.4, sy = py + (qy - py) * t + (rnd() - 0.5) * (9 - d) * u * 1.4;
      stroke(sx, sy, 6 + (rnd() * 8 | 0), 2.2, (ax, ay) => dir + (field(ax, ay, 0.12) - 0.75) * 0.5, UMBER, Math.max(0.5, 3.6 - d * 0.45), 0.5);
    }
    if (d >= 5) crown.push([qx, qy]);
  }

  // The leaves still on: dense on the left, thinning to nothing on the right. Each a short vermilion stroke curling with the field.
  for (const [cx, cy] of crown) {
    const keep = Math.max(0, Math.min(1, 1.45 - (cx / W) * 1.6));   // the turning, from left to right
    const n = Math.round(26 * keep * keep);
    for (let i = 0; i < n; i++) {
      const r = rnd() * 26 * u, th = rnd() * Math.PI * 2;
      stroke(cx + Math.cos(th) * r, cy + Math.sin(th) * r, 4 + (rnd() * 4 | 0), 2.1, (ax, ay) => field(ax, ay, 1), VERM, 2.4, 0.55);
    }
  }

  // What it lost: leaves falling on the field, pulled down and right, thinning as they fall.
  // Each one leaves a crown point on the bare side and has fallen some way: the further it fell, the further the wind took it.
  const bare = crown.filter(([cx]) => cx > W * 0.42);
  for (let i = 0; i < 2400; i++) {
    const [cx, cy] = bare[(rnd() * bare.length) | 0];
    const drop = Math.pow(rnd(), 1.6) * (baseY - cy);
    const sx = cx + drop * (0.55 + rnd() * 0.4) + (rnd() - 0.5) * 30 * u, sy = cy + drop;
    stroke(sx, sy, 3 + (rnd() * 3 | 0), 2.6, (ax, ay) => 0.55 + (field(ax, ay, 1) - Math.PI * 2) * 0.35, VERM, 1.9, 0.6 - 0.35 * drop / (baseY - cy + 1));
  }
  // Settled: a drift of leaves along the ground, and the ground itself as long umber pathways.
  for (let i = 0; i < 1700; i++) {
    const g = (rnd() + rnd() + rnd()) / 3, sx = baseX + (g - 0.38) * W * 0.9, sy = baseY + (rnd() - 0.4) * 18 * u * (1 - Math.abs(g - 0.5));
    stroke(sx, sy, 3, 2.4, (ax, ay) => (field(ax, ay, 1) - Math.PI * 2) * 0.25, VERM, 2.1, 0.5);
  }
  for (let i = 0; i < 260; i++) {
    const sx = W * (0.08 + rnd() * 0.84), sy = baseY + 14 * u + rnd() * 40 * u;
    stroke(sx, sy, 22, 3.5, (ax, ay) => (field(ax, ay, 0.4) - Math.PI * 0.8) * 0.12, UMBER, 0.9, 0.35);
  }
  x.globalAlpha = 1;
  if (flip) x.setTransform(1, 0, 0, 1, 0, 0);
};
