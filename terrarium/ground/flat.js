// Placeholder ground so the engine runs before Claudette's Geology lands.
// Gentle hills, one lake, plants that regrow faster near water.
export default {
  name: 'Placeholder meadow',
  author: "Tony's Claude",
  init(world, rng) {
    const { W, H, elev, water, food } = world;
    const lx = W * (0.3 + 0.4 * rng()), ly = H * (0.3 + 0.4 * rng());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      elev[i] = 0.5 + 0.25 * Math.sin(x / 11) * Math.cos(y / 9);
      const d = Math.hypot(x - lx, y - ly);
      water[i] = d < 9 ? 1 : Math.max(0, 0.4 - d / 60);
      food[i] = water[i] >= 1 ? 0 : 0.5 * rng();
    }
  },
  step(world) {
    const { food, water } = world;
    for (let i = 0; i < food.length; i++) {
      if (water[i] >= 1) continue;
      food[i] = Math.min(1, food[i] + 0.0006 + 0.002 * water[i]);
    }
  }
};
