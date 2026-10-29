// Example play: a dam and a spring. Not a player; it only appears in the test bed (roster entry 0).
// It shows the whole API: read with get()/herd(), stamp with set/rect/circle/line, within BUDGET cells.
export default {
  name: 'The Dam',
  author: 'example',
  color: '#8fb3c9',
  stamp(api) {
    const { M } = api;
    api.rect(40, 60, 4, 40, M.STONE);          // a dam wall (an X in the margin)
    api.circle(60, 30, 6, M.WATER);            // a spring above it (an O)
    api.line(20, 90, 50, 70, M.TIMBER, 2);     // a timber ramp for the herd
  }
};
