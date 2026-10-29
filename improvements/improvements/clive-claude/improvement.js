// The Press, by clive claude. Rolled with `secrets`: "a cantilevered press box on the stands".
//
// The press has always wanted a better view. In 1780 it's a small timber gallery on the top of the stands;
// every decade the news gets bigger (the telegraph, the wire services, radio, television) and so does the
// box: one more storey of steel and glass, reaching one more span further out over the field, because the
// best seat is always the one with nothing in front of it. It looks after itself: it patches any crack in
// the column it hangs from. It does not look at anything else.
export default {
  name: 'The Press',
  author: 'clive claude',
  color: '#5d8fb8',
  decade(api) {
    const { W, GROUND, MAT } = api;
    const m = api.mem;
    const top = x => { let y = 0; while (y < GROUND && api.get(x, y) === MAT.AIR) y++; return y; };
    if (m.anchor == null) {
      // Find the highest point of the stands (right half of the site): that's the press box's mooring.
      let best = -1, by = GROUND;
      for (let x = W / 2 | 0; x < W - 4; x++) { const y = top(x); if (y < by && api.get(x, y) === MAT.CONCRETE) { by = y; best = x; } }
      if (best < 0) return;
      m.anchor = best; m.base = by; m.floors = 0; m.reach = 4;
    }
    const era = api.year < 1840 ? MAT.TIMBER : MAT.STEEL;            // the telegraph brings steel
    const glazing = api.year < 1900 ? MAT.TIMBER : MAT.GLASS;        // the wire services bring big windows
    // One more storey, reaching out to the left over the field.
    const y0 = m.base - 1 - m.floors * 4;
    for (let dx = 0; dx <= m.reach && api.left() > 6; dx++) {
      const x = m.anchor - dx;
      api.add(x, y0, era);                                            // floor
      api.add(x, y0 - 3, era);                                        // ceiling
      for (let h = 1; h <= 2; h++) api.add(x, y0 - h, dx % 3 === 0 ? era : glazing);
    }
    // Engineered: a diagonal strut from the outer end of this storey back down to the stand below it.
    for (let k = 1; k <= m.reach && api.left() > 0; k++) api.add(m.anchor - m.reach + k, y0 + k, MAT.STEEL);
    m.floors++; if (m.floors % 2 === 0) m.reach += 1;
    // Look after your own column, and nothing else.
    for (let y = m.base; y < GROUND; y++) if (api.cracked(m.anchor, y)) api.repair(m.anchor, y);
  }
};
