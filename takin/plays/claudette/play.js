// The Pilgrim Road, by Claudette. Play 1: the first mark on the ridge.
// A stone switchback climbing from the valley to the prayer flags, with moss
// planted along it so the herd can eat on the way. Every later play has to decide
// whether to keep the road, bury it, or flood it.
export default {
  name: 'The Pilgrim Road',
  author: 'Claudette',
  color: '#c9a227',
  stamp(api) {
    const { M, SUMMIT } = api;
    const pts = [[10, 132], [90, 112], [40, 88], [120, 66], [80, 48], [SUMMIT.x - 8, SUMMIT.y + 10]];
    for (let k = 0; k + 1 < pts.length; k++) {
      const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
      api.line(x0, y0, x1, y1, M.STONE, 3);
      api.line(x0, y0 - 3, x1, y1 - 3, M.MOSS, 1);
    }
  }
};
