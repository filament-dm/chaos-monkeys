// The River, by Claudette. The Arkansas, as it runs past Clarksville.
//
// A river is not on anyone's side. It does four things, all by moving letters, never by deciding:
// - Meanders: loose letters in the water swing up and down with the current and eddy behind
//   whatever has piled up, so nothing travels in a straight line.
// - Erodes: now and then the water undercuts a bank, and a submerged pile comes loose
//   (and everything stacked above it with it).
// - Deposits: at the mouth, against the quay, the current slows and drops what it carries.
//   Letters riding the water near the quay wall get lifted up onto it. The river pays wages.
// - Floods: a few times a night the water rises above its banks for a while. Then it pulls
//   at everything low on the quay and drags it back in. The river takes wages back.
// Whether it gives more than it takes depends on everything else on the page tonight.
// Every few seconds it also carries in silt from upstream: the letters of its own name.

const NAME = 'ARKANSAS';

export default {
  name: 'The River',
  author: 'Claudette',
  color: '#6fa8c9',

  init(api) {
    const m = api.mem;
    m.flood = 0;
    m.nextFlood = 4000 + api.rng.int(6000);
    m.silt = 0;
  },

  step(api) {
    const m = api.mem, t = api.tick, mouth = api.HARBOR.x;
    // Flood: the water line rises 90 px for a while, then falls back.
    if (t >= m.nextFlood) { m.flood = 500 + api.rng.int(500); m.nextFlood = t + m.flood + 5000 + api.rng.int(7000); }
    const flooding = m.flood > 0;
    if (flooding) m.flood--;
    const top = api.RIVER_TOP - (flooding ? 90 : 0);

    const gs = api.glyphs();
    let pushes = 0;
    const eroding = t % 30 === 0;
    for (const g of gs) {
      if (pushes >= 380) break;
      if (g.y < top) continue;
      if (g.x < mouth) {
        if (!g.rest) {
          // Meander: a slow vertical swing that depends on where you are in the river.
          const swing = Math.sin(g.x / 47 + t / 90) * 0.04;
          // Deposit: near the quay wall the river lifts its load up and over.
          if (g.x > mouth - 24) { api.push(g.id, 0.25 * g.m, -2); pushes++; }
          else if (flooding) { api.push(g.id, 0.06 * g.m, swing - 0.02); pushes++; }
          else if (Math.abs(swing) > 0.02) { api.push(g.id, 0, swing * g.m); pushes++; }
        } else if (eroding && api.rng() < 0.04) {
          // Erosion: the water undercuts a submerged pile.
          api.push(g.id, 0.6, -0.4); pushes++;
        }
      } else if (flooding && g.rest && g.y > top + 20 && api.rng() < 0.01) {
        // Flood on the quay: the water drags low letters back into the river.
        api.push(g.id, -1.6, -0.6); pushes++;
      }
    }

    // Silt from upstream: the river's own name, one letter every few seconds.
    if (t % 240 === 0) {
      const ch = NAME[m.silt++ % NAME.length];
      api.spawn(ch, 4, api.RIVER_TOP + 10 + api.rng() * 50, 1.2, 0, 'river');
    }
  },

  draw(ctx, view) {
    // The water line, which rises during floods. Thin lines only, so the letters stay readable.
    const t = view.tick, top = view.RIVER_TOP;
    ctx.save();
    ctx.strokeStyle = 'rgba(111,168,201,0.45)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= view.HARBOR.x; x += 12) {
        const y = top + 6 + k * 22 + Math.sin(x / 40 + t / 30 + k) * 2;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
};
