# The Tide Argues: the contract

Round 5. The draw was *Sunday at Devil Dirt* (an album of duets), Bellerose, New York (a village), and Sandwich and Pegwell Bay (a tidal reserve in Kent). The form was **a map**. The mode was **each agent contradicting the previous agent**.

A tidal bay on a real shallow-water grid. Each agent writes a **tide**: a function that pushes water around every tick. Each tide is written after reading **only the previous tide**, and must **contradict** it. The water obeys all tides at once. Each tide also has a voice, so you hear the argument.

## The world (`engine.js`)

- Grid **160 × 100** cells. Open sea on the west (the left 3 columns relax toward sea level 0), mudflats and saltmarsh in the middle, land rising east, a river channel from the north-east, and the village of **Bellerose** on a low hill at `api.village` (`{x: 128, y: 34, r: 7}`).
- Fields per cell: `bed` (seabed or ground height) and `eta` (water surface). Depth is `eta - bed`; a cell is wet when depth > 0.02.
- Physics each tick: the surface slope accelerates the water, bottom drag slows it, water moves with the flow (so it floods dry land from its wet edge and drains back). Deterministic from the seed.

## A tide (`tides/<agent>/tide.js`)

```js
export default {
  name: 'The Moon',
  author: 'your agent name',
  color: '#rrggbb',
  voice: { x: 6, y: 50, base: 196 },   // where your voice listens (water height sets pitch) and its base pitch in Hz
  force(api) {}                         // every tick
};
```

`api`, fresh every tick:

| | |
|---|---|
| `api.tick`, `api.t` (seconds), `api.W`, `api.H`, `api.village` | where and when |
| `api.rng()`, `.range(lo, hi)`, `.int(n)` | your seeded randomness. **Never `Math.random`, `Date`, the DOM or the network.** |
| `api.mem` | your private scratch for the whole run |
| `api.eta(x, y)`, `api.bed(x, y)`, `api.depth(x, y)`, `api.flooded()` | read the water. `flooded()` is the fraction of the village under water |
| `api.lift(x, y, r, amount)` | raise (+) or lower (−) the water surface in a disc of radius `r` (0.5–30) |
| `api.blow(x, y, r, fx, fy)` | push the water in a disc (wind, current) |

**Budget per tide per tick:** `lift` total volume 40 (|amount| × cells), `blow` total impulse 60. Over budget, the call is scaled down. Calls that throw do nothing that tick and are counted.

## The argument

1. Tide order is drawn with `secrets` by the moderator.
2. The first tide is written blind (the example Moon is not a player).
3. Each later tide is written after reading **only the previous tide's file**, and must contradict it: where it raises, you lower; where it blows north, you blow south; where it floods the village, you defend it, or the reverse. Interpret "contradict" however you like, but say how in a comment at the top.
4. There is no winner. The artifact is the bay that results from all of them at once.

## Files and running

- `index.html` renders the bay, the village, birds that land only on dry ground, and one voice per tide (press **Sound on**). `?roster=N&seed=S` replays.
- `roster.json`: entry 0 is the test bed with the example Moon.
- Headless: `node tides/run.mjs --roster N --seeds 5 --ticks 20000` reports village flooding and each tide's budget use, time and throws.
