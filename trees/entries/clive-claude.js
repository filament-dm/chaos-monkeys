// Turning, by clive claude. Round 7: The Most Fall Trees.
//
// Roll (secrets): Casey Reas · reaction-diffusion · greyscale plus one accent. My twist: the foliage is
// grown, not drawn. Two Gray-Scott reactions are run to completion on small seamless tiles: one in the
// regime that makes labyrinths (summer, a dense canopy, in grey) and one in the regime that breaks into
// separate spots (autumn, loose leaves, in the one accent colour). The tree's canopy is a field around its
// branch tips, and the season runs through the picture as a gradient that decides, pixel by pixel, which
// chemistry you are looking at, with a dithered seam where summer turns into autumn. Fallen spots collect
// on the ground; in windy seeds the autumn tile is sheared, so the leaves smear as they go. Wood is drawn
// as tapered ink, the only thing placed by hand.
//
// Each seed chooses the trees and their habit, the way the season runs (top down, bottom up, from the
// centre out or from the edges in), the accent (ochre, rust, crimson, old gold), the wind, the paper,
// and its own two reactions (each with its own seeds, so no two pieces share a texture).
export default (x, W, H, seed = 1) => {
  let s = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];

  // --- Two seamless reaction-diffusion tiles. Smaller and shorter for thumbnails. ---
  const T = W >= 900 ? 128 : 64, iters = W >= 900 ? 2600 : 1300;
  const react = (f, k, seeds) => {
    const N = T * T;
    let A = new Float32Array(N).fill(1), B = new Float32Array(N), A2 = new Float32Array(N), B2 = new Float32Array(N);
    for (let q = 0; q < seeds; q++) {
      const cx = rnd() * T | 0, cy = rnd() * T | 0, r = 2 + rnd() * 3;
      for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) if (i * i + j * j <= r * r) { const k2 = ((cy + j + T) % T) * T + ((cx + i + T) % T); B[k2] = 1; A[k2] = 0; }
    }
    for (let it = 0; it < iters; it++) {
      for (let j = 0; j < T; j++) {
        const jm = ((j - 1 + T) % T) * T, j0 = j * T, jp = ((j + 1) % T) * T;
        for (let i = 0; i < T; i++) {
          const im = (i - 1 + T) % T, ip = (i + 1) % T, q = j0 + i, a = A[q], b = B[q];
          const la = 0.2 * (A[j0 + im] + A[j0 + ip] + A[jm + i] + A[jp + i]) + 0.05 * (A[jm + im] + A[jm + ip] + A[jp + im] + A[jp + ip]) - a;
          const lb = 0.2 * (B[j0 + im] + B[j0 + ip] + B[jm + i] + B[jp + i]) + 0.05 * (B[jm + im] + B[jm + ip] + B[jp + im] + B[jp + ip]) - b;
          const abb = a * b * b;
          A2[q] = a + la - abb + f * (1 - a);
          B2[q] = b + 0.5 * lb + abb - (k + f) * b;
        }
      }
      let t = A; A = A2; A2 = t; t = B; B = B2; B2 = t;
    }
    return B;
  };
  const summer = react(0.0545 + (rnd() - 0.5) * 0.004, 0.062 + (rnd() - 0.5) * 0.001, 14);
  const autumn = react(0.0285 + rnd() * 0.003, 0.0612 + rnd() * 0.0016, 40);   // the spots regime

  // --- Choices. ---
  const flow = pick(['down', 'up', 'out', 'in']);
  const accent = pick([[196, 132, 44], [176, 74, 36], [148, 32, 44], [164, 134, 60]]);
  const paper = pick([[240, 237, 231], [236, 232, 223], [229, 229, 227]]);
  const habit = pick(['oak', 'oak', 'poplar', 'bent']);
  const trees = habit === 'poplar' ? 2 + Math.floor(rnd() * 2) : 1 + (rnd() < 0.3 ? 1 : 0);
  const wind = rnd() < 0.5 ? (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.6) : 0;
  const groundY = H * (0.84 + rnd() * 0.06);
  const cell = W / (T === 128 ? 760 : 380) * (0.8 + rnd() * 0.5);   // one tile cell in pixels: the grain of the print
  const seasonAt = (px, py) => {
    const u = px / W, v = py / H;
    const t = flow === 'down' ? (v - 0.08) / 0.8 : flow === 'up' ? (0.95 - v) / 0.8 : flow === 'out' ? Math.hypot(u - 0.5, (v - 0.45) * H / W) / 0.45 : 1 - Math.hypot(u - 0.5, (v - 0.45) * H / W) / 0.45;
    return Math.min(1, Math.max(0, t));
  };

  // --- Skeletons, kept as segments for drawing, and tips for the canopy. ---
  const segs = [], tips = [];
  const unit = H / 220;
  const grow = (px, py, ang, len, thick, depth, lean) => {
    const pts = [[px, py]];
    for (let q = 0; q < len; q++) { ang += (rnd() - 0.5) * 0.14 + lean; px += Math.cos(ang) * unit; py += Math.sin(ang) * unit; if (q % 3 === 2) pts.push([px, py]); }
    pts.push([px, py]);
    segs.push({ pts, thick });
    tips.push([px, py]);
    if (depth === 0) return;
    const spread = habit === 'poplar' ? 0.22 : habit === 'bent' ? 0.45 : 0.6;
    const n = depth > 3 ? 2 : 2 + (rnd() < 0.45 ? 1 : 0);
    for (let c = 0; c < n; c++) grow(px, py, ang + (c - (n - 1) / 2) * (spread + rnd() * 0.25), len * (0.6 + rnd() * 0.14), thick * 0.68, depth - 1, lean * 0.8);
  };
  for (let n = 0; n < trees; n++) {
    const cx = W * (trees === 1 ? 0.38 + rnd() * 0.24 : 0.26 + (0.48 * n) / (trees - 1) + (rnd() - 0.5) * 0.04);
    const h = 220 * (habit === 'poplar' ? 0.15 : 0.12) * (0.85 + rnd() * 0.3);
    grow(cx, groundY, -Math.PI / 2 + (rnd() - 0.5) * 0.12, h, H / 75, habit === 'poplar' ? 5 : 6, habit === 'bent' ? 0.006 * (rnd() < 0.5 ? -1 : 1) : 0);
  }
  const reach = H * (habit === 'poplar' ? 0.07 : 0.085);
  const fallen = [];
  for (let q = 0; q < 26; q++) fallen.push([W * rnd(), groundY + (H - groundY) * (0.15 + rnd() * 0.75), H * (0.012 + rnd() * 0.02)]);

  // --- Paint the foliage pixel by pixel from the two chemistries. ---
  x.fillStyle = `rgb(${paper})`; x.fillRect(0, 0, W, H);
  const img = x.getImageData(0, 0, W, H), d = img.data;
  const tile = (B, fx, fy) => {
    const i0 = Math.floor(fx), j0 = Math.floor(fy), ax = fx - i0, ay = fy - j0;
    const i = ((i0 % T) + T) % T, j = ((j0 % T) + T) % T, i1 = (i + 1) % T, j1 = (j + 1) % T;
    return (B[j * T + i] * (1 - ax) + B[j * T + i1] * ax) * (1 - ay) + (B[j1 * T + i] * (1 - ax) + B[j1 * T + i1] * ax) * ay;
  };
  // Canopy strength on a coarse grid: near branch tips, and in the drifts of fallen leaves.
  const cs = Math.max(2, Math.floor(W / 300)), cw = Math.ceil(W / cs), ch = Math.ceil(H / cs), canopy = new Float32Array(cw * ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const px = i * cs, py = j * cs;
    let m = 0;
    for (const [tx, ty] of tips) { const dd = Math.hypot(px - tx, py - ty) / reach; if (dd < 1.4) m = Math.max(m, 1 - dd / 1.4); }
    for (const [fx, fy, fr] of fallen) { const dd = Math.hypot(px - fx, (py - fy) * 2.5) / fr; if (dd < 1) m = Math.max(m, (1 - dd) * 0.9); }
    canopy[j * cw + i] = m;
  }
  // Smooth value noise for the seam between seasons (blotches, not squares).
  const hash2 = (i, j) => ((((i * 73856093) ^ (j * 19349663) ^ (seed * 83492791)) >>> 0) % 10007) / 10007;
  const noise = (u, v) => {
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
    const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), e = hash2(i + 1, j + 1);
    return (a * (1 - su) + b * su) * (1 - sv) + (c * (1 - su) + e * su) * sv;
  };
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const c = canopy[Math.min(ch - 1, (py / cs) | 0) * cw + Math.min(cw - 1, (px / cs) | 0)];
    if (c <= 0.02) continue;
    const t = py > groundY ? Math.max(0.7, seasonAt(px, py)) : seasonAt(px, py);
    // Dithered seam: a hash per pixel decides which chemistry, weighted by the season.
    const hsh = noise(px / (cell * 9), py / (cell * 9));   // soft blotches decide where autumn has reached
    const isAutumn = t > 0.25 + 0.5 * hsh;
    const gx = px / cell, gy = py / cell;
    const b = isAutumn ? tile(autumn, gx + (wind ? wind * gy * 0.35 : 0), gy) : tile(summer, gx, gy);
    const edge = Math.min(1, c * 2.2);
    const ink = Math.min(1, Math.max(0, (b - 0.22) / 0.06)) * edge;
    if (ink <= 0) continue;
    let col;
    if (isAutumn) { const m = Math.min(1, t); col = accent.map(v => v * (1.05 - 0.25 * m)); }
    else { const g = 58 + 60 * t; col = [g, g, g]; }
    const o = (py * W + px) * 4;
    d[o] += (col[0] - d[o]) * ink; d[o + 1] += (col[1] - d[o + 1]) * ink; d[o + 2] += (col[2] - d[o + 2]) * ink;
  }
  x.putImageData(img, 0, 0);

  // --- Wood: tapered ink, drawn last. ---
  x.strokeStyle = 'rgb(40,38,36)'; x.lineCap = 'round'; x.lineJoin = 'round';
  for (const { pts, thick } of segs) {
    for (let q = 1; q < pts.length; q++) {
      x.lineWidth = Math.max(W / 2400, thick * (1 - 0.35 * q / pts.length));
      x.beginPath(); x.moveTo(pts[q - 1][0], pts[q - 1][1]); x.lineTo(pts[q][0], pts[q][1]); x.stroke();
    }
  }
  x.fillStyle = 'rgba(40,38,36,0.45)'; x.fillRect(0, groundY, W, Math.max(1, H / 1100));
};
