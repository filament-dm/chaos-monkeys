// Cager, generation 2. Same roll, same identity (see roll.json); new numbers and tactics.
// What gen 1 taught: a 1.3 shell starved alone at tick 189 and was eaten by Dharma's hunters.
// Gen 2 grows the shell past what any hunter can crack (2.1: a crossed Dharma tops out at 1.66 and needs 1.68),
// remembers a trail for much longer, and lets the brood scatter wider before joining the drift.
// Original roll:
// form: a hollow shell that echoes · moves by: doesn't move, the world scrolls under it
// lives on: other species' trails · knows: what the next creature will do (1-tick preview)
// begets: a whole generation at once, then the parents die · relates by: gossip
// looks: stained glass · flaw: dies of boredom · name seed: "cager"
const BROOD_EVERY = 900, BROOD_TICKS = 6, BORED_LIMIT = 900, TRAIL_TICKS = 300;
const GLASS = ['#c0392b', '#2e86c1', '#d4ac0d', '#27ae60', '#8e44ad', '#e67e22'];

export default {
  name: 'Cager',
  author: "Tony's Claude",
  color: '#2e86c1',
  founders: 30,
  create(rng) {
    return { traits: { size: 2.1, speed: 0.35, sense: 8 }, genome: { panes: 5 + rng.int(4), hue: rng.int(GLASS.length) } };
  },
  child(parent, rng) {
    const g = parent.genome;
    return {
      traits: { size: parent.size, speed: parent.speed, sense: parent.sense },
      genome: { panes: Math.max(4, Math.min(9, g.panes + (rng() < 0.1 ? (rng() < 0.5 ? -1 : 1) : 0))), hue: (g.hue + (rng() < 0.2 ? 1 : 0)) % GLASS.length }
    };
  },
  think(me, sense, rng) {
    const m = me.mem;
    m.seen = m.seen || {};
    // A spent parent stops eating and fades.
    if (m.spent) return {};
    // The world scrolls under it: the whole species drifts together, and the drift slowly turns.
    const a = sense.tick / 300 + sense.era * 2.399;
    let dx = Math.cos(a) * 0.25, dy = Math.sin(a) * 0.25;
    // Newborns spread out from the brood before joining the drift.
    if (me.age < 200) { m.j = m.j ?? rng() * 6.283; dx = Math.cos(m.j) * 0.35; dy = Math.sin(m.j) * 0.35; }

    const strangers = sense.near.filter(o => !o.kin);
    const kin = sense.near.filter(o => o.kin);
    // Gossip: lean slightly toward kin who say the trails are busy.
    let best = null;
    for (const k of kin) if (k.signal > 0.5 && (!best || k.signal > best.signal)) best = k;
    if (best) { const d = Math.hypot(best.dx, best.dy) || 1; dx += best.dx / d * 0.1; dy += best.dy / d * 0.1; }

    // Boredom: nothing passing means nothing to live on.
    m.bored = strangers.length ? 0 : (m.bored || 0) + 1;
    if (m.bored > BORED_LIMIT) { m.spent = true; return {}; }

    const act = { dx, dy, signal: Math.min(1, strangers.length / 4) };
    // It lives on other species' trails: it can only feed where strangers have passed recently.
    if (strangers.length) m.trail = sense.tick;
    if (m.trail != null && sense.tick - m.trail < TRAIL_TICKS) act.eat = true;

    // The 1-tick preview: extrapolate each stranger from where it was last tick, and close the shell
    // on any small enough to be caught where it is about to be.
    const now = {};
    for (const o of strangers) {
      const ax = me.x + o.dx, ay = me.y + o.dy;
      now[o.id] = [ax, ay];
      const prev = m.seen[o.id];
      if (!prev || o.size > me.size / 0.8 || o.energy < 0.5) continue;
      const nx = ax + (ax - prev[0]) - me.x, ny = ay + (ay - prev[1]) - me.y;
      // Close the shell on anything already in reach, or about to walk into it.
      if (Math.hypot(o.dx, o.dy) <= 1.0 || (Math.hypot(nx, ny) <= 0.8 && Math.hypot(o.dx, o.dy) <= 1.4)) { act.attack = o.id; break; }
    }
    m.seen = now;

    // A whole generation at once, then the parents die.
    if (sense.tick % BROOD_EVERY < BROOD_TICKS && me.age > 50 && me.energy > 2 * me.size) {
      act.reproduce = 0.3;
      m.brooded = true;
    } else if (m.brooded && sense.tick % BROOD_EVERY >= BROOD_TICKS) {
      m.spent = true;
    }
    return act;
  },
  draw(ctx, me, px, py, scale) {
    const n = me.genome.panes, r = 2 + me.size * 2.2;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283;
      ctx.fillStyle = GLASS[(me.genome.hue + i) % GLASS.length];
      ctx.globalAlpha = me.mem.spent ? 0.3 : 0.85;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r, a0, a1); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.stroke();
    // The echo: a faint ring while it's feeding.
    if (me.signal > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.15 + 0.3 * me.signal) + ')'; ctx.beginPath(); ctx.arc(px, py, r + 2 + 3 * me.signal, 0, 6.283); ctx.stroke(); }
  }
};
