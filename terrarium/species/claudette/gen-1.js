// Ahind, generation 1. Rolled with `secrets` on clive claude's tables and committed by hash
// before it was written (sha256 e23b9bfc…62173d9); the roll file is species-roll.json.
//
//   body: radial star          movement: burrows            diet: eats the terrain itself
//   senses: kin only           reproduction: copies a neighbour's species
//   social: herds              palette: acid green          quirk: sings when it eats
//   name seed: "ahind"
//
// How the dice became rules:
// - Burrows: slow, never enters water, and stays put (dug in) while there is food under it.
// - Eats the terrain: grazes the high ground, preferring ridges over valleys.
// - Kin only: it cannot perceive any other species at all, so it never flees and never hunts.
// - Copies a neighbour: a child takes its traits from the nearest kin it can sense, not
//   its parent, so the herd shares one body plan that drifts as a whole.
// - Herds: drifts toward the middle of the kin it can sense, keeping a little room.
// - Sings: its signal is 1 while it eats, and it draws the song as rings.

const jitter = (v, rng, d) => v + (rng() * 2 - 1) * d;

export default {
  name: 'Ahind',
  author: 'Claudette',
  color: '#a6e22e',
  founders: 36,

  create(rng) {
    return { traits: { size: jitter(1.1, rng, 0.1), speed: jitter(0.45, rng, 0.05), sense: 3 }, genome: { ridge: jitter(0.6, rng, 0.1) } };
  },

  child(parent, rng) {
    // The nearest kin's body, remembered by the parent when it last looked.
    const model = parent.mem.neighbour || { size: parent.size, speed: parent.speed, sense: parent.sense, ridge: parent.genome.ridge };
    return {
      traits: { size: jitter(model.size, rng, 0.05), speed: jitter(model.speed, rng, 0.03), sense: model.sense },
      genome: { ridge: Math.min(1, Math.max(0, jitter(model.ridge, rng, 0.04))) },
    };
  },

  think(me, sense, rng) {
    const kin = sense.near.filter(o => o.kin);
    if (kin.length) {
      let best = kin[0];
      for (const o of kin) if (o.dx * o.dx + o.dy * o.dy < best.dx * best.dx + best.dy * best.dy) best = o;
      me.mem.neighbour = { size: best.size, speed: me.speed, sense: me.sense, ridge: me.genome.ridge };
    }
    const reproduce = me.energy > 2.6 * me.size ? 0.45 : 0;

    // Dug in: eat and sing while there is food here.
    if (sense.here.food > 0.06 && sense.here.water < 0.3) return { eat: true, signal: 1, reproduce };

    // Otherwise burrow toward high, dry ground with food, pulled toward the herd.
    let bx = 0, by = 0, bestScore = -1;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, r = 1 + rng() * 2;
      const dx = Math.cos(a) * r, dy = Math.sin(a) * r, c = sense.look(dx, dy);
      if (!c || c.water >= 0.3) continue;
      const score = c.food * (1 - me.genome.ridge + me.genome.ridge * c.elev * 2);
      if (score > bestScore) { bestScore = score; bx = dx; by = dy; }
    }
    let hx = 0, hy = 0;
    for (const o of kin) {
      const d = Math.hypot(o.dx, o.dy) || 1;
      hx += o.dx / d * (d > 1.5 ? 1 : -1); hy += o.dy / d * (d > 1.5 ? 1 : -1);
    }
    if (kin.length) { hx /= kin.length; hy /= kin.length; }
    return { dx: bx + 0.6 * hx, dy: by + 0.6 * hy, eat: true, signal: 0, reproduce };
  },

  draw(ctx, me, px, py, scale) {
    const r = 1.2 * me.size * scale, arms = 5;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((me.age % 400) / 400 * Math.PI * 2 / arms);
    ctx.fillStyle = '#a6e22e';
    ctx.beginPath();
    for (let k = 0; k < arms * 2; k++) {
      const rr = k % 2 ? r * 0.4 : r, a = (k / (arms * 2)) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    if (me.signal > 0) {
      ctx.strokeStyle = 'rgba(166,226,46,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.4 + 0.6 * ((me.age % 30) / 30)), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  },
};
