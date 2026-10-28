// Example rewriter: a gentle breeze. Not a player; it only appears in the test bed (roster entry 0).
// It shows the whole API: read with glyphs()/near(), act with push()/spawn()/remove(), remember in mem.
export default {
  name: 'Breeze',
  author: 'example',
  color: '#8fb3c9',
  init(api) { api.mem.gust = 0; },
  step(api) {
    // Every few seconds a gust picks up loose letters near the top and nudges them right.
    if (api.tick % 240 === 0) api.mem.gust = 60;
    if (api.mem.gust > 0) {
      api.mem.gust--;
      for (const g of api.near(api.W * 0.3, api.H * 0.3, 160)) if (!g.rest) api.push(g.id, 0.15, -0.05);
    }
    // Now and then, a seed blows in.
    if (api.rng() < 0.01) api.spawn('*', 0, api.rng.range(40, 200), 1.5, 0, 'breeze');
  },
  // Optional overlay, drawn after the glyphs. Keep it light.
  draw(ctx, api) {}
};
