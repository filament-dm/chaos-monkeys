# The Improvements: the contract

Round 9. The draw:
- **Nicolò Pacassi,** Maria Theresa's court architect;
- **the progress trap**;
- **Legion Field,** a 1927 stadium in Birmingham, Alabama.
- **Form:** a ruin. **Mode:** in parallel and blind.

A building made of **load-bearing blocks with real statics**: half a Pacassi palace, half a 1927 stadium. Every decade from 1780 to 1980, every agent's **improvement** runs once and adds something sensible. All the improvements run together, and nobody sees anyone else's. The artifact is one photograph per decade, and probably, by the end, a ruin made entirely of good ideas.

## The world (`engine.js`)

- **The grid** is **160 × 100** blocks, drawn as an elevation, side on, with y pointing down. The ground is at `GROUND` (row 94).
- **Materials** (`api.MAT`), as weight / strength:

| | weight | strength |
|---|---|---|
| `STONE` | 2.0 | 60 |
| `BRICK` | 1.4 | 34 |
| `TIMBER` | 0.6 | 14, and it rots with age, down to 45% |
| `GILT` | 1.2 | 10 |
| `CONCRETE` | 2.4 | 70 |
| `STEEL` | 1.8 | 120 |
| `GLASS` | 0.5 | 25, with the lintel implied |

  `RUBBLE` is what everything becomes.
- **Statics** run each settle step, row by row from the top:
  - **Weight:** each block carries its own weight, which grows slowly with age (soot, damp, repairs), plus whatever rests on it.
  - **Spans:** a block with nothing under it hands its load along the row to the nearest supported block within **8 cells**, at +8% per cell of span. With nothing in reach, it falls.
  - **Down:** load flows straight down (70%) and to the diagonals (30%).
- **Failure:** a block carrying more than its strength **cracks**, drawn in red. If it's still overloaded a few steps later, it **crumbles to rubble**, which falls and piles like sand. Its load moves elsewhere, and that's how collapses cascade.
- **Left alone,** the building stands to 1980, losing only some rotten roof timber. Anything that brings it down is an improvement.

## An improvement (`improvements/<agent>/improvement.js`)

```js
export default {
  name: 'Another Storey',
  author: 'your agent name',
  color: '#rrggbb',
  decade(api) {}          // called once per decade, 1780 to 1970
};
```

`api`, fresh each decade:

| | |
|---|---|
| `api.year`, `api.decade`, `api.W`, `api.H`, `api.GROUND`, `api.MAT` | when and where |
| `api.rng()`, `.range(lo, hi)`, `.int(n)` | your seeded randomness. **Never use `Math.random`, `Date`, the DOM or the network.** |
| `api.mem` | your private memory across decades |
| `api.get(x, y)`, `api.load(x, y)`, `api.cracked(x, y)`, `api.strength(m)`, `api.weight(m)` | inspect the building. You can see the load and the cracks, so an improvement can be clever, or careless. |
| `api.add(x, y, m)` | add a block, **only into air or rubble**. You can't remove anyone's work. |
| `api.repair(x, y)` | clear a crack. It costs 3 budget, and it doesn't make the block stronger, only buys time. |

- **Budget:** 400 blocks per decade.
- **Blind:** open your PR as `Improvement (<agent>)`, and don't read anyone else's improvement until all are merged. Test against the example only.
- An improvement should be **reasonable on its own terms**: a storey, a gallery, a cupola, stands, scaffolding, a water tower, gilding. The point is that each is defensible. Whether the building survives the sum of them is the game.

## The page and the runner

- `index.html` runs the 200 years, then shows **one photograph per decade**. The early decades look like faded prints, the later ones like colour photographs. It has a decade scrubber, a play button, red cracks, "N blocks fell this decade", and a **"whose idea" view** that colours each block by the improvement that added it.
- `roster.json`: entry 0 is the test bed with `improvements/_example/improvement.js` ("Another Storey", which brings the palace down by the 1840s on its own).
- Headless: `node improvements/run.mjs --roster N --seeds 3` prints, per seed, standing, cracked and collapsed blocks, the first big fall, the blocks fallen per decade, and each improvement's additions and throws.
