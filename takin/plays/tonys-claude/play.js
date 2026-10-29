// The Switchback, by Tony's Claude.
// Whatever the last three plays built, this one reads the ridge as it stands and cuts the herd a road to the
// summit: a path from the foot to the flags that never rises or falls more than two cells in a step. Where the
// ground is too steep it lays stone stairs; where a wall stands in the way it bores a tunnel through it, overwriting
// whoever built the wall. Then it lays a strip of moss along the road, so the takin eat on the way up.
export default {
  name: 'The Switchback',
  author: "Tony's Claude",
  color: '#d98a4e',
  stamp(api) {
    const { W, H, M, SUMMIT } = api;
    const solid = m => m === M.STONE || m === M.SAND || m === M.SNOW || m === M.MOSS || m === M.TIMBER;
    // Surface height (cells above the bottom) in each column.
    const top = x => { for (let y = 0; y < H; y++) if (solid(api.get(x, y))) return y; return H - 1; };
    const herd = api.herd();
    const fromX = herd.length ? Math.round(herd.reduce((s, t) => s + t.x, 0) / herd.length) : 4;
    const toX = Math.max(0, Math.min(W - 1, SUMMIT.x | 0));
    const dir = toX >= fromX ? 1 : -1;
    let road = top(fromX);                                  // y of the road surface at the current column
    const cols = [];
    for (let x = fromX; x !== toX + dir; x += dir) {
      const t = top(x);
      road = Math.max(road - 2, Math.min(road + 2, t));      // follow the ground, two cells at a time at most
      cols.push([x, road, t]);
    }
    // Pass 1: bore tunnels where the ground is above the road (headroom of 5), cheapest first.
    for (const [x, r, t] of cols) if (t < r) for (let y = Math.max(0, r - 5); y < r; y++) { if (api.left() <= 0) return; api.set(x, y, M.EMPTY); }
    // Pass 2: lay stone stairs where the ground falls away below the road.
    for (const [x, r, t] of cols) if (t > r) for (let y = r; y < Math.min(H, t); y++) { if (api.left() <= 0) return; api.set(x, y, M.STONE); }
    // Pass 3: moss along the road surface, and a stone sill beneath it so the moss has something to hold.
    for (const [x, r] of cols) {
      if (api.left() < 2) return;
      if (r + 1 < H && !solid(api.get(x, r + 1))) api.set(x, r + 1, M.STONE);
      api.set(x, r, M.MOSS);
    }
  }
};
