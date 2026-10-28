// The Ozarks, by Tony's Claude. Role drawn with `secrets`.
// The Boston Mountains stand to the west of Clarksville. Two things come down off them:
// - Rockfalls: every so often a slope gives way. Heavy letters (the rock names, in capitals) pour in
//   from the left, and the impact knocks the foot of the existing pile loose. More mass for the page,
//   but it lands wherever the slope sends it, not where anyone wants it.
// - Fog: now and then a bank of light marks rolls in high and slow. Some of it settles, even on the
//   quay, and counts as wages while it lasts. Then the sun comes up on it and it burns off.
// The Ozarks don't care about the boat. They only shed.
const ROCKS = ['SANDSTONE', 'SHALE', 'CHERT', 'LIMESTONE', 'BOSTON MOUNTAINS', 'OZARK', 'MW'];
const FOG = ['.', ',', "'", '`', ':', '-'];
const MAX_ALIVE = 3400;

export default {
  name: 'The Ozarks',
  author: "Tony's Claude",
  color: '#8a7f6a',

  init(api) {
    const m = api.mem;
    m.nextFall = 900 + api.rng.int(1500);
    m.nextFog = 3000 + api.rng.int(3000);
    m.queue = [];        // rock letters waiting to tumble in
    m.fogQueue = 0;      // fog marks waiting to roll in
    m.fog = [];          // [id, burnsOffAt]
    m.alive = 330;
  },

  step(api) {
    const m = api.mem, t = api.tick;

    // How crowded is the page? Checked rarely, because glyphs() is a big copy.
    if (t % 120 === 0) m.alive = api.glyphs().length;
    const room = m.alive < MAX_ALIVE;

    // A slope gives way.
    if (t >= m.nextFall) {
      const word = ROCKS[api.rng.int(ROCKS.length)];
      const times = 1 + api.rng.int(3);
      for (let k = 0; k < times; k++) for (const ch of word) if (ch !== ' ') m.queue.push(ch);
      // The impact: shake the foot of the pile at the hills' edge loose, so it slides east.
      const footY = api.GROUND - api.pileHeight(24);
      let shoved = 0;
      for (const g of api.near(24, footY, 70)) {
        if (shoved >= 60) break;
        if (g.rest) { api.push(g.id, api.rng.range(0.4, 1.2), -api.rng.range(0.2, 0.8)); shoved++; }
      }
      m.nextFall = t + 1200 + api.rng.int(2400);
    }

    // Rocks tumble in from the left, fast and low, a few per tick.
    if (m.queue.length && room) {
      for (let k = 0; k < 4 && m.queue.length; k++) {
        const ch = m.queue.shift();
        const y = api.GROUND - api.pileHeight(10) - 30 - api.rng.range(0, 140);
        api.spawn(ch, 2 + api.rng.range(0, 10), Math.max(10, y), api.rng.range(1.2, 3.2), -api.rng.range(0.5, 2), 'ozarks rock');
      }
    }

    // A fog bank forms.
    if (t >= m.nextFog) {
      m.fogQueue += 40 + api.rng.int(50);
      m.nextFog = t + 4000 + api.rng.int(5000);
    }
    if (m.fogQueue > 0 && room) {
      for (let k = 0; k < 2 && m.fogQueue > 0; k++, m.fogQueue--) {
        const id = api.spawn(FOG[api.rng.int(FOG.length)], 1 + api.rng.range(0, 6), api.rng.range(30, 260), api.rng.range(0.6, 1.6), -api.rng.range(0, 0.6), 'ozarks fog');
        if (id != null) m.fog.push([id, t + 900 + api.rng.int(1500)]);
      }
    }

    // The sun burns the oldest fog off.
    let burned = 0;
    while (m.fog.length && m.fog[0][1] <= t && burned < 4) {
      api.remove(m.fog.shift()[0]);
      burned++;
    }
    if (m.fog.length > 1 && t % 60 === 0) m.fog.sort((a, b) => a[1] - b[1]);
  },

  draw(ctx, view) {
    // A faint ridge line at the far left, behind which the hills sit.
    ctx.strokeStyle = 'rgba(138,127,106,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, view.GROUND - 160);
    ctx.quadraticCurveTo(30, view.GROUND - 230, 60, view.GROUND - 170);
    ctx.quadraticCurveTo(80, view.GROUND - 140, 96, view.GROUND - 150);
    ctx.stroke();
  }
};
