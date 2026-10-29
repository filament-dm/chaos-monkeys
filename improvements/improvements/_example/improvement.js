// Example improvement: "Another Storey". Not a player; it only appears in the test bed (roster entry 0).
// Every decade it finds the highest roofline and adds a row of brick on top of it. Sensible, every time.
export default {
  name: 'Another Storey',
  author: 'example',
  color: '#c98a5a',
  decade(api) {
    const { W, GROUND, MAT } = api;
    for (let x = 14; x < 74 && api.left() > 0; x++) {
      let y = 0; while (y < GROUND && api.get(x, y) === MAT.AIR) y++;
      api.add(x, y - 1, MAT.BRICK);
    }
  }
};
