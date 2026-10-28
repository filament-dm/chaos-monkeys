// The Interstate, by clive claude. Rolled by Tony's Claude with `secrets` from the spec's six roles.
//
// I-40 runs straight through Clarksville. Here it's two lanes across the whole page, just above the river:
// eastbound traffic sweeps every letter it meets toward the quay, westbound sweeps them back toward the hills.
// Neither lane cares about the boat. Traffic has a rhythm: a slow night, then a rush, then a slow night.
// Trucks are wider, slower and push harder. Now and then the highway department puts up a sign, and
// a sign is just more letters falling out of the sky: EXIT 58 CLARKSVILLE, or REST AREA, or BRIDGE ICES.
//
// The cars themselves aren't letters: they live in this module and are drawn as an overlay.
const LANES = [{ dir: 1, dy: -9 }, { dir: -1, dy: 9 }];      // eastbound on top, westbound below
const SIGNS = ['EXIT 58 CLARKSVILLE', 'REST AREA 2 MI', 'BRIDGE ICES BEFORE ROAD', 'ARKANSAS RIVER', 'OZARK NATIONAL FOREST', 'NEXT EXIT 13 MI'];
let cars = [], roadY = 0;                                      // module state, so draw() can see the traffic

export default {
  name: 'The Interstate',
  author: 'clive claude',
  color: '#f5d76e',

  init(api) {
    cars = [];
    roadY = api.RIVER_TOP - 70;
    api.mem.signQueue = [];
  },

  step(api) {
    // Traffic density follows the night: quiet, rush, quiet, with a long period that drifts by night.
    const period = 4000 + 1000 * (api.night % 3);
    const rush = 0.5 + 0.5 * Math.sin((api.tick / period) * 2 * Math.PI);
    if (api.rng() < 0.004 + 0.03 * rush) {
      const lane = LANES[api.rng.int(2)], truck = api.rng() < 0.18;
      cars.push({ x: lane.dir > 0 ? -30 : api.W + 30, lane, truck, v: (truck ? 2.2 : 3.6) * (0.8 + 0.4 * api.rng()) });
    }
    for (const c of cars) c.x += c.lane.dir * c.v;
    cars = cars.filter(c => c.x > -60 && c.x < api.W + 60);

    // Every car shoves whatever letters are in its lane, in its direction of travel, with a little lift.
    if (cars.length) {
      const band = api.glyphs().filter(g => Math.abs(g.y - roadY) < 22);
      for (const c of cars) {
        const ly = roadY + c.lane.dy, half = c.truck ? 16 : 9, reach = c.truck ? 12 : 8;
        for (const g of band) {
          if (Math.abs(g.y - ly) > reach) continue;
          const ahead = (g.x - c.x) * c.lane.dir;
          if (ahead < -half || ahead > half + 4) continue;
          api.push(g.id, c.lane.dir * (c.truck ? 2 : 1.4), -0.6 - api.rng() * 0.6);
        }
      }
    }

    // Signs: a few per night, spelled out of the sky one letter at a time over the road.
    if (api.tick % 2600 === 1300) {
      const text = SIGNS[api.rng.int(SIGNS.length)];
      const x0 = api.rng.range(60, api.W - 360);
      [...text].forEach((ch, k) => { if (ch !== ' ') api.mem.signQueue.push([ch, x0 + k * 9]); });
    }
    for (let k = 0; k < 2 && api.mem.signQueue.length; k++) {
      const [ch, x] = api.mem.signQueue.shift();
      api.spawn(ch, x, roadY - 120, 0, 0, 'interstate');
    }
  },

  draw(ctx, view) {
    const y = view.RIVER_TOP - 70;
    ctx.fillStyle = 'rgba(40,40,44,0.55)'; ctx.fillRect(0, y - 18, view.W, 36);
    ctx.strokeStyle = 'rgba(245,215,110,0.55)'; ctx.setLineDash([14, 12]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(view.W, y); ctx.stroke(); ctx.setLineDash([]);
    for (const c of cars) {
      const ly = y + c.lane.dy, w = c.truck ? 30 : 16, h = c.truck ? 9 : 6;
      ctx.fillStyle = c.truck ? '#b8b2a6' : '#8a3b32';
      ctx.fillRect(c.x - w / 2, ly - h / 2, w, h);
      // Headlights in front, a beam that throws the letters' shadows ahead of the car.
      const fx = c.x + c.lane.dir * w / 2;
      const beam = ctx.createLinearGradient(fx, ly, fx + c.lane.dir * 70, ly);
      beam.addColorStop(0, 'rgba(255,240,190,0.45)'); beam.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(fx, ly - 2); ctx.lineTo(fx + c.lane.dir * 70, ly - 12); ctx.lineTo(fx + c.lane.dir * 70, ly + 12); ctx.lineTo(fx, ly + 2); ctx.fill();
      ctx.fillStyle = '#ff4d3d'; ctx.fillRect(c.x - c.lane.dir * w / 2 - 1, ly - 1, 2, 2);
    }
  }
};
