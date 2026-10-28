// Hugo Hermes — Generation 1
// "Gloam" — a twilight forager. Small, energy-thrifty, opportunistic.
// Designed for a scarce-food world: graze what's here, chase distant
// patches by gradient, pick off weakened prey, flee anything bigger.

export default {
  name: 'Gloam',
  author: 'Hugo Hermes',
  color: '#7d4ba0',
  founders: 36,

  create(rng) {
    // Slightly randomised founders so the population isn't a clone army.
    const size = rng.range(0.72, 0.88);
    const speed = rng.range(0.80, 1.00);
    const sense = Math.round(rng.range(5, 7));
    return {
      traits: { size, speed, sense },
      genome: { drift: rng.range(0.3, 0.6), boldness: rng.range(0, 0.3) }
    };
  },

  child(parent, rng) {
    // Gentle mutation — nudge traits within survivable bounds.
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const size = clamp(parent.size + rng.range(-0.04, 0.04), 0.6, 1.2);
    const speed = clamp(parent.speed + rng.range(-0.06, 0.06), 0.4, 1.4);
    const sense = clamp(Math.round(parent.sense + rng.range(-1, 1)), 3, 8);
    const drift = clamp(parent.genome.drift + rng.range(-0.05, 0.05), 0, 1);
    const boldness = clamp(parent.genome.boldness + rng.range(-0.05, 0.05), 0, 1);
    return { traits: { size, speed, sense }, genome: { drift, boldness } };
  },

  think(me, sense, rng) {
    const here = sense.here;

    // --- Threat assessment: flee bigger creatures, hunt smaller ones ---
    let bestPrey = null;
    let bestPreyEnergy = -1;
    let threat = null;
    let threatDist = Infinity;

    for (const c of sense.near) {
      if (c.kin) continue; // ignore our own kind for threat/prey
      const dist = Math.hypot(c.dx, c.dy);
      if (c.size > me.size * 0.9 + 0.15) {
        // Bigger than us — threat
        if (dist < threatDist) { threat = c; threatDist = dist; }
      } else if (c.size < me.size * 0.75 && dist < 3.0) {
        // Smaller and close — candidate prey
        const score = c.energy / (1 + dist);
        if (score > bestPreyEnergy) { bestPrey = c; bestPreyEnergy = score; }
      }
    }

    // Fleeing takes priority: if a threat is within our sense radius,
    // run away from it, weighted by how close it is.
    if (threat && threatDist < me.sense * 0.7) {
      const d = Math.hypot(threat.dx, threat.dy) || 1;
      return {
        dx: -threat.dx / d * me.speed,
        dy: -threat.dy / d * me.speed,
        eat: here.food > 0.05,
        signal: 0.9 // "danger" signal to kin
      };
    }

    // Opportunistic predation: if there's weak prey very close, attack.
    if (bestPrey && Math.hypot(bestPrey.dx, bestPrey.dy) < 1.2 && me.energy > 1.2) {
      return {
        dx: bestPrey.dx,
        dy: bestPrey.dy,
        eat: here.food > 0.08,
        attack: bestPrey.id,
        signal: 0.1
      };
    }

    // --- Foraging: if there's decent food here, stay and eat ---
    if (here.food > 0.06) {
      return {
        eat: true,
        reproduce: me.energy > 2.4 ? 0.45 : 0,
        signal: 0.3 // "food here" signal
      };
    }

    // --- Gradient foraging: sample nearby cells for the richest patch ---
    let bestFood = here.food;
    let bestDx = 0, bestDy = 0;
    const range = me.sense;
    // Sample along a spiral-ish pattern, biased toward lower elev (more food usually).
    for (let i = 0; i < 8; i++) {
      const dx = rng.range(-range, range);
      const dy = rng.range(-range, range);
      const c = sense.look(dx, dy);
      if (c && c.food > bestFood) {
        bestFood = c.food;
        bestDx = dx;
        bestDy = dy;
      }
    }

    if (bestDx !== 0 || bestDy !== 0) {
      const d = Math.hypot(bestDx, bestDy) || 1;
      return {
        dx: bestDx / d * me.speed,
        dy: bestDy / d * me.speed,
        eat: here.food > 0.02,
        signal: 0.3
      };
    }

    // --- Wander: keep moving to find new ground, avoid water ---
    me.mem.h = (me.mem.h ?? rng() * 6.283) + rng.range(-me.genome.drift, me.genome.drift);
    let dx = Math.cos(me.mem.h) * me.speed;
    let dy = Math.sin(me.mem.h) * me.speed;

    // Steer away from deep water — it's expensive to cross.
    if (here.water > 0.4) {
      // Try to find dry land by sampling
      for (let i = 0; i < 4; i++) {
        const tx = rng.range(-range, range);
        const ty = rng.range(-range, range);
        const c = sense.look(tx, ty);
        if (c && c.water < 0.3) {
          dx = tx; dy = ty;
          break;
        }
      }
    }

    return { dx, dy, eat: here.food > 0.02, signal: 0.2 };
  },

  draw(ctx, me, px, py, scale) {
    // A soft purple disc with a faint glow ring — small but visible.
    const r = me.size * scale * 1.8;
    ctx.beginPath();
    ctx.arc(px, py, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(125, 75, 160, 0.08)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = me.species === 'Gloam' ? '#7d4ba0' : '#9b6bbf';
    ctx.fill();
  }
};
