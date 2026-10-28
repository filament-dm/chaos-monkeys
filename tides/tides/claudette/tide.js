// The Surge, by Claudette. The first tide, written blind.
//
// The opening line of the duet: the sea calls the village. In long slow breaths it heaps water
// up offshore and drives it east across the mudflats, up the line of the bay toward Bellerose on
// its hill. Each call is louder than the last, so later surges reach higher. Between calls it
// goes quiet and pulls back, leaving room for an answer.
//
// What there is to contradict: it raises the west, it blows east and north-east, it wants the
// village under water, and it keeps a steady 50-second rhythm.

export default {
  name: 'The Surge',
  author: 'Claudette',
  color: '#3d7bb5',
  voice: { x: 128, y: 34, base: 165 },   // listening at the village: the pitch rises as the sea arrives

  force(api) {
    const m = api.mem;
    const period = 50;                                // seconds per call
    const phase = (api.t % period) / period;          // 0..1 through one breath
    const call = Math.floor(api.t / period);          // how many calls so far
    const strength = Math.min(1, 0.45 + call * 0.08); // each call a little louder

    if (phase < 0.6) {
      // Calling: heap the sea up offshore and drive it toward the village.
      const s = Math.sin(Math.PI * phase / 0.6) * strength;
      api.lift(8, 50, 9, 0.12 * s);                   // about 250 cells × 0.12: inside the lift budget
      const v = api.village;
      for (let k = 1; k <= 3; k++) {
        // Three gusts along the line from the sea mouth to Bellerose.
        const x = 8 + (v.x - 8) * k / 4, y = 50 + (v.y - 50) * k / 4;
        api.blow(x, y, 5, 0.25 * s, -0.04 * s);
      }
    } else {
      // Listening: a gentle ebb, as if holding its breath for the reply.
      const s = Math.sin(Math.PI * (phase - 0.6) / 0.4);
      api.lift(8, 50, 9, -0.04 * s);
    }
    m.calls = call;
  },
};
