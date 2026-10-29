// The Embankment, by clive claude. Play 2. Rolled intent (secrets): "open a path for the herd".
//
// The Pilgrim Road is a causeway with air under it, and the herd was walking into the dark beneath it,
// where the ground rises to meet the road's underside and there is no way up or out. A road you can only
// walk under is a roof. So this play fills every gap under every overhang on the mountain with stone:
// the causeway becomes an embankment, the pocket is buried, and any takin caught in it is lifted out
// onto the road above. The road stays; the dark under it is overwritten.
export default {
  name: 'The Embankment',
  author: 'clive claude',
  color: '#c9a34e',
  stamp(api) {
    const { M, W, H } = api;
    const solid = m => m === M.STONE || m === M.SAND || m === M.SNOW || m === M.MOSS || m === M.TIMBER;
    for (let x = 0; x < W && api.left() > 0; x++) {
      let y = 0; while (y < H && !solid(api.get(x, y))) y++;          // the first surface from the sky
      // Below it, fill any air (or water) until we hit solid ground again.
      for (y++; y < H; y++) {
        const m = api.get(x, y);
        if (solid(m)) continue;
        let g = y; while (g < H && !solid(api.get(x, g))) g++;
        if (g >= H) break;
        for (let k = y; k < g; k++) api.set(x, k, M.STONE);
        y = g;
      }
    }
    // Then stairs: wherever the skyline jumps more than a takin can climb, raise the columns behind it
    // so each rises at most 2, walking back from the foot of the cliff.
    const top = []; for (let x = 0; x < W; x++) { let y = 0; while (y < H && !solid(api.get(x, y))) y++; top.push(y); }
    for (let x = 1; x < W - 1 && api.left() > 0; x++) {
      if (top[x] - top[x + 1] <= 2) continue;
      for (let k = 0, need = top[x + 1]; k < 30 && x - k >= 0; k++) {
        const col = x - k, want = need + 2;
        if (top[col] <= want) break;
        for (let y = want; y < top[col]; y++) api.set(col, y, M.STONE);
        top[col] = want; need = want;
      }
    }
  }
};
