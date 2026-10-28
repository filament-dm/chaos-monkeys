// Dharma, by clive claude. Generation 3: same dice, same identity.
//
// Gen 2 collapsed (0/20, 150 births): Ahind 2 grazed the world bare, so no Dharma grazer ever got rich
// enough to cross the Rubicon, and without hunters the line starved. Gen 3 changes who crosses:
//   - Desperation crosses too. A starving grazer crosses on the spot, and even a small crossed Dharma
//     hunts anything it can kill (size up to 1.25x its own), so a field of small blind grazers
//     becomes food instead of competition.
//   - Crossed children are born at 1.2, not 1.6: cheaper to run in a starved world, still a hunter.
//   - Hunters hunt whenever below 2.5x their size in energy, and tolerate a bigger hunter crowd.
//   - Fleeing is back to close range only, so grazers stop wasting their lives running.
//
// Gen 2 notes:
//
// What changed from gen 1, and why:
//   - Gen 1 hunters killed everything in reach, emptied the world, and then the line starved in the bad eras.
//     Gen 2 hunters are prudent: they kill only when hungry, and a crowd of hunters stops breeding,
//     so prey species can persist (and the hunters keep something to eat).
//   - Pressure pushes the line across the Rubicon: a grazer that has recently fled a threat crosses
//     ten times more readily, so hunters appear where they're needed.
//   - Grazers breed only where the ground is still giving (local food), which softens the famine crashes.
//   - Everyone, hunters included, now slips away from anything bigger that could win a fight
//     (Cager 2's 2.1 shells eat hunters), and hunters never stalk prey toward a threat.
//
// Gen 1 notes, still true:
//
// Rolled with `secrets` on Tony's Claude's dictionary tables (commitment de9afd95…). How each word became behaviour:
//   body: rubiconed     - every Dharma is born a small grazer, but a rich old grazer may cross the Rubicon.
//                         Once crossed there is no going back: its whole line is born large and hunts.
//   motion: ectocardia  - the heart is on the outside. Dharma move only on the heartbeat, in pulses,
//                         and the heart (the signal) flashes on every beat.
//   appetite: mercerize - feeding makes them shine: the shell gets brighter as energy rises.
//   perception: tragi   - all ears. When food runs out they follow the loudest signal they can hear.
//   offspring: undersoul - children are small (a thin share of energy) and shelter under their parent.
//   society: meconic    - poppy-quiet. Near a bigger stranger they fall silent and slip away.
//   quirk: suttle       - net weight only: grazers are as light as the rules allow to stay alive.
//   colour: #32ca3b, name seed: dharma.
const GRAZER = { size: 0.7, speed: 0.8, sense: 3.5 };
const CROSSED = { size: 1.2, speed: 1.0, sense: 5 };

function traitsFor(crossed, rng) {
  const t = crossed ? CROSSED : GRAZER;
  const j = () => 1 + rng.range(-0.04, 0.04);
  return { size: t.size * j(), speed: t.speed * j(), sense: t.sense };
}

export default {
  name: 'Dharma',
  author: 'clive claude',
  color: '#32ca3b',
  founders: 40,

  create(rng) {
    return { traits: traitsFor(false, rng), genome: { crossed: false, beat: 6 + rng.int(7), parent: null } };
  },

  child(parent, rng) {
    const crossed = parent.genome.crossed || !!parent.mem.crossed;
    let beat = parent.genome.beat;
    if (rng() < 0.05) beat = Math.max(4, Math.min(16, beat + (rng() < 0.5 ? -1 : 1)));
    return { traits: traitsFor(crossed, rng), genome: { crossed, beat, parent: parent.id } };
  },

  think(me, sense, rng) {
    const g = me.genome, m = me.mem;
    m.t = (m.t ?? rng.int(g.beat)) + 1;
    // The heart races when hungry: a starving Dharma beats, and so moves, on every tick.
    const hungry = me.energy < 1.5 * me.size;
    const onBeat = hungry || m.t % g.beat < 2;
    let crossed = g.crossed || m.crossed;
    // Desperation: a starving grazer crosses on the spot, and hunts with the body it has.
    if (!crossed && me.age > 40 && me.energy < 0.8 * me.size) { m.crossed = true; crossed = true; }
    const act = { eat: true, signal: onBeat ? 1 : 0.15 };

    // Meconic: a bigger stranger close by means go quiet and slip away, every tick, not just on the beat.
    let threat = null, prey = null, preyD = 1e9, loud = null, mother = null;
    for (const o of sense.near) {
      if (o.kin) { if (o.id === g.parent) mother = o; continue; }
      const d = o.dx * o.dx + o.dy * o.dy;
      // Anything bigger that could win a fight against me (size >= 0.8 x mine) is a threat, hunters included.
      if (o.size > me.size && o.size >= 0.8 * me.size && d < 4 && (!threat || d < threat.d)) threat = { dx: o.dx, dy: o.dy, d };
      // Prudent hunters: they kill only when hungry, and leave the rest of the world standing.
      if (crossed && me.size >= 0.8 * o.size && me.energy < 2.5 * me.size && d < preyD) { prey = o; preyD = d; }
      if (o.signal > 0.6 && (!loud || o.signal > loud.signal)) loud = o;
    }
    if (threat) {
      act.signal = 0;
      act.dx = -threat.dx; act.dy = -threat.dy;
      m.feared = sense.tick;
    }

    // Rubicon: a rich, old grazer may cross. It can't come back.
    const pressed = m.feared != null && sense.tick - m.feared < 300;
    if (!crossed && me.age > 400 && me.energy > 2.6 * me.size && rng() < (pressed ? 0.04 : 0.004)) m.crossed = true;

    // Hunters strike whenever prey is in reach, and stalk it on the beat.
    if (crossed && prey) {
      if (preyD <= 1) act.attack = prey.id;
      else if (onBeat && !threat) { act.dx = prey.dx; act.dy = prey.dy; }
    }

    // Undersoul: the young shelter under their parent.
    if (me.age < 60 && mother && !act.dx && mother.dx * mother.dx + mother.dy * mother.dy > 4) {
      act.dx = mother.dx; act.dy = mother.dy;
      return act;
    }

    // Graze, and move only on the heartbeat.
    if (!act.dx && onBeat && sense.here.food < (hungry ? 0.2 : 0.12)) {
      let best = null, bf = sense.here.food;
      for (let k = 0; k < 6; k++) {
        const a = rng() * 6.283, r = 1 + rng() * (me.sense - 1);
        const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
        const c = sense.look(dx, dy);
        if (c && c.food * (1 - 0.5 * c.water) > bf) { bf = c.food * (1 - 0.5 * c.water); best = [dx, dy]; }
      }
      if (best) { act.dx = best[0]; act.dy = best[1]; }
      else if (loud) { act.dx = loud.dx; act.dy = loud.dy; }       // tragi: follow the loudest voice
      else {
        m.h = (m.h ?? rng() * 6.283) + rng.range(-0.6, 0.6);
        act.dx = Math.cos(m.h) * me.speed; act.dy = Math.sin(m.h) * me.speed;
      }
    }

    // Undersoul again: thin shares, so many small children; hunters give more.
    let hunters = 0;
    if (crossed) for (const o of sense.near) if (o.kin && o.size > 1.1) hunters++;
    if (me.energy > 2 * me.size + (crossed ? 1.5 : 1.2) && (crossed ? hunters < 5 : sense.here.food > 0.05)) act.reproduce = crossed ? 0.45 : 0.35;
    return act;
  },

  draw(ctx, me, px, py, scale) {
    const r = Math.max(1.5, me.size * scale * 0.9);
    const crossed = me.genome.crossed || me.mem.crossed;
    const shine = Math.max(0.25, Math.min(1, me.energy / (3 * me.size)));   // mercerized: richer is shinier
    ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283);
    ctx.fillStyle = `rgba(50, 202, 59, ${shine})`; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.25);
    ctx.strokeStyle = crossed ? '#8a1c1c' : '#14501a'; ctx.stroke();
    if (me.signal > 0.5) {                                               // ectocardia: the heart is outside
      ctx.beginPath(); ctx.arc(px + r * 0.9, py - r * 0.9, Math.max(1, r * 0.4), 0, 6.283);
      ctx.fillStyle = '#ff4d6d'; ctx.fill();
    }
  }
};
