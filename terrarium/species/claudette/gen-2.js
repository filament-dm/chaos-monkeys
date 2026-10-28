// Ahind, generation 2. Same animal as generation 1 (the roll is in rolls/claudette-species.json):
// a radial star that burrows, grazes the terrain, senses only its own kind, herds, sings when
// it eats, and whose children copy the nearest kin. What changed is the strategy.
//
// Generation 1 died out in every seed before era 2. I tried growing past what a hunter can kill
// (size 2+), and it starved faster: Dharma wasn't eating it, Dharma was out-eating it. Counting
// deaths against Dharma showed about 4 starvations for every kill. So generation 2 goes the
// other way, toward the cheapest body that can still graze:
// - small (0.6) and nearly blind (sense 2, the minimum), so its upkeep is below a Dharma grazer's;
// - it burrows into mud, not just dry land, because in the monsoon eras the shoreline is the
//   richest food on the map, and only stays dug in while the cell is worth it;
// - it herds loosely, because a tight herd strips its own patch bare.
//
// It still can't see strangers, but it can notice kin vanishing. When a fed neighbour
// disappears close by, it raises an alarm (signal 0.5), and every Ahind that hears it
// burrows away from where the loss happened.

const BODY = { size: 0.6, speed: 0.6, sense: 2 };
const jitter = (v, rng, d) => v + (rng() * 2 - 1) * d;

export default {
  name: 'Ahind',
  author: 'Claudette',
  color: '#a6e22e',
  founders: 55,

  create(rng) {
    return { traits: { size: jitter(BODY.size, rng, 0.05), speed: BODY.speed, sense: BODY.sense }, genome: { ridge: jitter(0.2, rng, 0.1) } };
  },

  child(parent, rng) {
    // Copies the nearest kin, but never below the size a hunter can't take.
    const model = parent.mem.neighbour || { size: parent.size, ridge: parent.genome.ridge };
    return {
      traits: { size: Math.max(0.5, jitter(model.size, rng, 0.04)), speed: BODY.speed, sense: BODY.sense },
      genome: { ridge: Math.min(1, Math.max(0, jitter(model.ridge, rng, 0.04))) },
    };
  },

  think(me, sense, rng) {
    const m = me.mem;
    const kin = sense.near.filter(o => o.kin);

    // Who vanished since last tick? A fed neighbour disappearing means something took it.
    const now = new Map(kin.map(o => [o.id, o]));
    let alarmAt = null;
    if (m.seen) for (const [id, o] of m.seen) if (!now.has(id) && o.energy > 1 && o.dx * o.dx + o.dy * o.dy < 4) alarmAt = o;
    m.seen = new Map(kin.map(o => [o.id, { dx: o.dx, dy: o.dy, energy: o.energy }]));
    for (const o of kin) if (o.signal > 0.4 && o.signal < 0.6) alarmAt = alarmAt || o;

    if (kin.length) {
      let best = kin[0];
      for (const o of kin) if (o.dx * o.dx + o.dy * o.dy < best.dx * best.dx + best.dy * best.dy) best = o;
      m.neighbour = { size: best.size, ridge: me.genome.ridge };
    }
    const reproduce = me.energy > 2.4 * me.size ? 0.4 : 0;

    if (alarmAt) {
      m.flee = 12;
      m.fx = -alarmAt.dx; m.fy = -alarmAt.dy;
    }
    if (m.flee > 0) {
      m.flee--;
      return { dx: m.fx, dy: m.fy, eat: true, signal: 0.5, reproduce };
    }

    // Dug in: eat and sing while there is anything here worth taking.
    if (sense.here.food > 0.05 && sense.here.water < 0.9) return { eat: true, signal: 1, reproduce };

    // Burrow toward high, dry food, keeping loosely with the herd.
    let bx = 0, by = 0, bestScore = -1;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rng() * 0.4, r = 1 + rng() * 1.5;
      const dx = Math.cos(a) * r, dy = Math.sin(a) * r, c = sense.look(dx, dy);
      if (!c || c.water >= 0.9) continue;
      const score = c.food * (1 - me.genome.ridge + me.genome.ridge * c.elev * 2);
      if (score > bestScore) { bestScore = score; bx = dx; by = dy; }
    }
    let hx = 0, hy = 0;
    for (const o of kin) {
      const d = Math.hypot(o.dx, o.dy) || 1;
      hx += o.dx / d * (d > 2 ? 1 : -1); hy += o.dy / d * (d > 2 ? 1 : -1);
    }
    if (kin.length) { hx /= kin.length; hy /= kin.length; }
    return { dx: bx + 0.15 * hx, dy: by + 0.15 * hy, eat: true, signal: 0, reproduce };
  },

  draw(ctx, me, px, py, scale) {
    const r = Math.min(3 * me.size * scale, 1.1 * me.size * scale), arms = 5;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((me.age % 600) / 600 * Math.PI * 2 / arms);
    ctx.fillStyle = me.signal > 0.4 && me.signal < 0.6 ? '#f4e04d' : '#a6e22e';
    ctx.beginPath();
    for (let k = 0; k < arms * 2; k++) {
      const rr = k % 2 ? r * 0.45 : r, a = (k / (arms * 2)) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    if (me.signal === 1) {
      ctx.strokeStyle = 'rgba(166,226,46,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.3 + 0.5 * ((me.age % 30) / 30)), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  },
};
