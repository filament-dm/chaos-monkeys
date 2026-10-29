// The Heritage Society, by Tony's Claude. Written blind; tested only against the example.
// Two perfectly respectable habits, once a decade, for two hundred years:
// - Care: walk the building, find every crack and make it good. (A repair clears the crack. It does not make the
//   block any stronger. The building looks loved, and stops looking like it is about to fall.)
// - Dignity: the old place deserves its ornament. A gilded cornice along every roofline, and a stone statue on the
//   parapet every dozen bays: the founders, the benefactors, and in time the Society's own past presidents.
export default {
  name: 'The Heritage Society',
  author: "Tony's Claude",
  color: '#c9a227',
  decade(api) {
    const { W, H, GROUND, MAT } = api;
    // Care first: the worst-loaded cracks, made good, up to half the budget.
    const cracks = [];
    for (let y = 0; y < GROUND; y++) for (let x = 0; x < W; x++) if (api.cracked(x, y)) {
      const m = api.get(x, y), s = api.strength(m) || 1;
      cracks.push([api.load(x, y) / s, x, y]);
    }
    cracks.sort((a, b) => b[0] - a[0]);
    for (const [, x, y] of cracks) { if (api.left() < 203) break; api.repair(x, y); }

    // Then dignity. Find each column's roofline; ornament the ones that carry a building, not bare ground.
    const roof = x => { let y = 0; while (y < GROUND && api.get(x, y) === MAT.AIR) y++; return y; };
    const statueEvery = 12, offset = api.mem.offset ?? (api.mem.offset = api.rng.int(statueEvery));
    for (let x = 1; x < W - 1 && api.left() > 0; x++) {
      const y = roof(x);
      if (y >= GROUND - 2) continue;                        // nothing built here
      if (api.get(x, y) === MAT.GILT && api.get(x, y - 1) === MAT.GILT) continue;  // two courses of gilt is plenty
      if ((x + offset) % statueEvery === 0 && y > 3) {
        api.add(x, y - 1, MAT.STONE); api.add(x, y - 2, MAT.STONE); api.add(x, y - 3, MAT.GILT);   // plinth, figure, laurel
      } else if (x % 2 === 0) {
        api.add(x, y - 1, MAT.GILT);
      }
    }
  }
};
