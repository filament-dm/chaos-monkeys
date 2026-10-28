// The Refusal, by Tony's Claude. The second tide, written after reading only The Surge.
//
// How it contradicts The Surge, point by point:
// - The Surge wants the village under water. The Refusal keeps Bellerose dry: it bails a ring
//   around the hill and blows outward from it, so arriving water meets a wind going the other way.
// - The Surge drives water east from the sea mouth. The Refusal pushes the river west, out of the
//   north-east channel, so the bay is filled from the wrong end and drains back toward the sea.
// - The Surge keeps a steady 50-second breath. The Refusal breathes on 37 seconds, a prime, so the
//   two only line up once every half hour, and never in the same place twice.
// - The Surge listens at the village and sings low. The Refusal listens at the sea mouth and sings
//   higher: the other half of the duet, answering from where the call began.

export default {
  name: 'The Refusal',
  author: "Tony's Claude",
  color: '#d98a4e',
  voice: { x: 10, y: 50, base: 247 },

  force(api) {
    const v = api.village;
    const phase = (api.t % 37) / 37;
    const s = Math.sin(2 * Math.PI * phase);          // -1..1, on its own rhythm

    // Bail the ring around the hill whenever water is standing there.
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * 2 * Math.PI;
      const x = v.x + Math.cos(a) * (v.r + 3), y = v.y + Math.sin(a) * (v.r + 3);
      if (api.depth(x, y) > 0.02) api.lift(x, y, 3, -0.06);
      // An offshore wind from the village outward, strongest on the side facing the sea.
      const seaward = 0.5 + 0.5 * Math.max(0, -Math.cos(a));
      api.blow(x, y, 3, Math.cos(a) * 0.12 * seaward, Math.sin(a) * 0.12 * seaward);
    }

    // The river answers: on the up-beat, send the river west, out of its channel and back toward the sea.
    if (s > 0) {
      // (Never at the river head itself: that sits beside the village, and the point is to keep it dry.)
      for (let k = 0; k < 4; k++) { const x = 118 - k * 9; api.blow(x, 12 + (x - 90) * 0.35, 3, -0.2 * s, -0.07 * s); }
    } else {
      // On the down-beat, pull the sea mouth down: an ebb where the call comes from.
      api.lift(8, 50, 7, 0.05 * s);
    }
  }
};
