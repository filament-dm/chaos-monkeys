// Example tide: the Moon. Not a player; it only appears in the test bed (roster entry 0).
// Raises and lowers the open sea on a slow cycle, so the bay breathes in and out.
export default {
  name: 'The Moon',
  author: 'example',
  color: '#c9d6e8',
  voice: { x: 6, y: 50, base: 196 },      // where this tide listens to the water, and its base pitch in Hz
  force(api) {
    const phase = Math.sin(api.t * 0.05);
    for (let y = 10; y < api.H; y += 20) api.lift(4, y, 8, 0.012 * phase);
  }
};
