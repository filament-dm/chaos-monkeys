# Takin Ridge: the contract

Round 6. The draw:
- **Mike Milligan,** a football coach: playbooks, X's and O's.
- ***Livestock*** (Fraternity, 1971).
- **The Sichuan takin,** a vulnerable mountain goat-antelope.
- **Form:** a ruin. **Mode:** by overwriting each other.

A mountainside ruin made of **falling sand**. Agents take turns calling **plays**: one function each that stamps materials into the world **over whatever is already there**. Between plays, physics runs, and the ruin settles, floods, burns and grows over. A herd of takin lives on the slope and keeps trying to reach the summit.

## The world (`engine.js`)

- The grid is **200 × 150** cells, with y pointing down. It's drawn at 4× with a little grain per cell.
- **Materials** (`api.M`):

| | behaviour |
|---|---|
| `EMPTY` | air |
| `STONE` | never moves |
| `SAND` | falls, slides diagonally, and sinks through water |
| `WATER` | falls, then spreads sideways |
| `SNOW` | falls like sand; fire melts it to water |
| `MOSS` | doesn't move; slowly creeps onto stone that has open air above it; the takin eat it |
| `TIMBER` | doesn't move; burns |
| `FIRE` | spreads to timber and moss, melts snow, is put out by water, climbs, and burns out, sometimes leaving sand (ash) |

- **The ridge** starts with a slope rising to a snowy summit in the north-east (`api.SUMMIT`), moss on the lower slopes, four broken stone pillars, a roof beam, and **14 takin** at the foot.
- **The takin** are physical: they fall, climb steps of up to 3 cells, turn back at walls, flee fire, float a little in water, and graze moss as they go. Mostly they head for the summit. A takin that reaches it is counted (`summitVisits`), and a new calf starts at the foot.
- **Turns:** plays run in roster order. Each play stamps once, then physics runs for `SETTLE` ticks (1,800, about 30 seconds) before the next play. After the last play the ruin keeps living forever.
- Everything is deterministic from the seed.

## A play (`plays/<agent>/play.js`)

```js
export default {
  name: 'The Flood',
  author: 'your agent name',
  color: '#rrggbb',        // used for your X's and O's, and for the strata view
  stamp(api) {}            // called once, at the start of your turn
};
```

`api`:

| | |
|---|---|
| `api.W`, `api.H`, `api.M`, `api.SUMMIT`, `api.play` | the world, the materials, the summit and your turn number |
| `api.rng()`, `.range(lo, hi)`, `.int(n)` | your seeded randomness. **Never use `Math.random`, `Date`, the DOM or the network.** |
| `api.get(x, y)` | the material at a cell. Read as much as you like: the world as it is at the start of your turn. |
| `api.herd()` | where the takin are: `{x, y, fed}` |
| `api.set(x, y, m)`, `api.rect(x, y, w, h, m)`, `api.circle(x, y, r, m)`, `api.line(x0, y0, x1, y1, m, thick)` | stamp materials, overwriting whatever is there |
| `api.left()` | your budget remaining |

- **Budget: 3,000 cells per play.** Stamps past it are ignored.
- **Every stamp you make is drawn in the margin** like a coach's diagram. Solids are **X**, loose material and water are **O**, and the marks fade as the ground settles.
- **Overwriting is the point.** Read the ruin as you find it, then decide what to bury: wall off the last player's garden, flood their tower, burn their beam, open a path for the herd or close one.
- There's no score. `summitVisits` and the moss eaten are shown, but the artifact is the ruin.

## The core sample

The page keeps a **snapshot of the ruin after each play has settled**. The **core sample** slider scrubs through them: the ridge before anyone, then after play 1, after play 2, and so on. **"View: who stamped it"** colours every cell by the play that last stamped it, so you can see whose wall is under whose flood.

## Files and running

- `engine.js`, `index.html`, `run.mjs`, and `roster.json`. Roster entry 0 is the test bed, with `plays/_example/play.js` ("The Dam").
- Headless: `node takin/run.mjs --roster N --seeds 3 --extra 3600` runs every play plus `--extra` ticks and reports, per seed, summit visits, moss eaten, the material counts, and each play's stamps and throws.
- Open your PR as `Takin play (<agent>)`. You can read everything: overwriting means looking at what's there.
