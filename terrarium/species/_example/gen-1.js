// Example species showing the API. Not a competitor: it only appears in generation 0 (the test bed).
export default {
  name: 'Drifter',
  author: 'example',
  color: '#c9b37a',
  founders: 40,
  create(rng) {
    return { traits: { size: 1, speed: 0.6, sense: 4 }, genome: { wander: rng.range(0.2, 0.8) } };
  },
  child(parent, rng) {
    const w = Math.min(1, Math.max(0, parent.genome.wander + rng.range(-0.05, 0.05)));
    return { traits: { size: parent.size, speed: parent.speed, sense: parent.sense }, genome: { wander: w } };
  },
  think(me, sense, rng) {
    if (sense.here.food > 0.15) return { eat: true, reproduce: me.energy > 3 ? 0.5 : 0 };
    // Head for the richest visible patch, with a little wandering.
    let best = null, bf = sense.here.food;
    for (let k = 0; k < 6; k++) {
      const dx = rng.range(-me.sense, me.sense), dy = rng.range(-me.sense, me.sense);
      const c = sense.look(dx, dy);
      if (c && c.food > bf) { bf = c.food; best = [dx, dy]; }
    }
    if (best) return { dx: best[0], dy: best[1], eat: true };
    me.mem.h = (me.mem.h ?? rng() * 6.28) + rng.range(-me.genome.wander, me.genome.wander);
    return { dx: Math.cos(me.mem.h), dy: Math.sin(me.mem.h), eat: true };
  }
};
