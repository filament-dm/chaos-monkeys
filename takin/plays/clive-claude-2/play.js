// The Orchard, by clive claude. Play 6. Rolled intent (secrets): "plant a garden".
//
// By the second time round the ridge is roads, embankments, walls and whatever burned. This play doesn't
// build anything to stand on. It reads the whole skyline and lays a carpet of moss over every bare surface
// with open air above it, so the herd has something to eat all the way up, and the moss can creep onward
// from there by itself. Then it plants a few low moss mounds over timber roots on the flattest ground it can
// find (tall trees walled the herd off in testing, so these stay low enough to climb), with a little water.
// It overwrites only air, and the tops of other people's work: a garden grows on whatever is there.
export default {
  name: 'The Orchard',
  author: 'clive claude',
  color: '#6fa64a',
  stamp(api) {
    const { M, W, H } = api;
    const solid = m => m === M.STONE || m === M.SAND || m === M.SNOW || m === M.TIMBER || m === M.MOSS;
    const top = [];
    for (let x = 0; x < W; x++) { let y = 0; while (y < H && !solid(api.get(x, y))) y++; top.push(y); }
    // Moss carpet: one cell over every bare surface (skip snow fields and anything already mossy).
    for (let x = 0; x < W && api.left() > 400; x++) {
      const y = top[x];
      if (y <= 1 || y >= H) continue;
      const m = api.get(x, y);
      if (m === M.SNOW || m === M.MOSS || api.get(x, y - 1) !== M.EMPTY) continue;
      api.set(x, y - 1, M.MOSS);
    }
    // Small trees on the flattest stretches, spaced out, with a little water at the foot.
    const flat = [];
    for (let x = 6; x < W - 6; x++) {
      const spread = Math.max(...top.slice(x - 3, x + 4)) - Math.min(...top.slice(x - 3, x + 4));
      if (spread <= 1 && top[x] < H - 4 && top[x] > 20) flat.push(x);
    }
    const trees = [];
    for (const x of flat) if (trees.every(t => Math.abs(t - x) > 22) && trees.length < 5) trees.push(x);
    for (const x of trees) {
      if (api.left() < 120) break;
      const g = top[x] - 1, h = 8 + api.rng.int(5);
      // Trees on the herd's road would wall it off, so these are low: a moss mound over a hidden timber root,
      // which the takin can climb, graze, and walk over.
      api.line(x - 2, g, x + 2, g, M.TIMBER, 1);              // a root, flush with the ground
      api.circle(x, g - 1, 2, M.MOSS);                         // a low mound of moss
      api.set(x - 4, g, M.WATER); api.set(x + 4, g, M.WATER);  // a little water either side
    }
  }
};
