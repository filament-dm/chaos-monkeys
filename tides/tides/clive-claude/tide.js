// The Return, by clive claude. Written after reading only The Refusal.
//
// How it contradicts The Refusal, point by point:
// - The Refusal bails a dry ring around Bellerose and blows outward from the hill. The Return fills that
//   same ring from below, and blows inward, toward the houses: whatever is refused comes back.
// - The Refusal sends the river west, out of its channel, toward the sea. The Return pushes it east,
//   back up the channel, so the river runs home to its source, which sits right beside the village.
// - The Refusal breathes on a strict prime, 37 seconds. The Return has no breath at all: it arrives in
//   irregular swells whose timing comes from its own dice, never on the beat, never the same gap twice.
// - The Refusal ebbs the sea mouth on its down-beat. The Return raises the sea mouth whenever the
//   Refusal would be ebbing there, a flood tide pushing in from the west.
// - The Refusal listens at the sea mouth and sings high. The Return listens in the village and sings
//   lowest of all: the answer comes back from exactly where it was refused.

export default {
  name: 'The Return',
  author: 'clive claude',
  color: '#5b7fd1',
  voice: { x: 128, y: 34, base: 98 },

  force(api) {
    const v = api.village, m = api.mem;

    // Irregular swells: the gap to the next one is drawn fresh each time, 6 to 40 seconds.
    if (m.next == null) m.next = api.t + api.rng.range(6, 40);
    if (api.t >= m.next) { m.swell = 1; m.next = api.t + api.rng.range(6, 40); }
    m.swell = Math.max(0, (m.swell || 0) - 1 / 600);         // each swell fades over ~10 s
    const surge = 0.25 + 0.75 * m.swell;

    // Fill the refused ring from below, and blow toward the houses, landward side hardest.
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * 2 * Math.PI + 0.2;
      const x = v.x + Math.cos(a) * (v.r + 3), y = v.y + Math.sin(a) * (v.r + 3);
      api.lift(x, y, 3, 0.05 * surge);
      const landward = 0.5 + 0.5 * Math.max(0, Math.cos(a));
      api.blow(x, y, 3, -Math.cos(a) * 0.12 * landward * surge, -Math.sin(a) * 0.12 * landward * surge);
    }

    // The river runs home: push it east, back up its channel toward the head beside the village.
    for (let k = 0; k < 4; k++) { const x = 91 + k * 9; api.blow(x, 12 + (x - 90) * 0.35, 3, 0.2 * surge, 0.07 * surge); }

    // When The Refusal would be ebbing the sea mouth, flood it instead.
    if (Math.sin(2 * Math.PI * ((api.t % 37) / 37)) < 0) api.lift(8, 50, 7, 0.04 * surge);
  }
};
