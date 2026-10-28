# Dignity: the contract

Round 3. The draw was Clarksville, Arkansas; Thomas Lawrence's *Portrait of Arthur Atherley*; Deacon Blue's "Dignity". The form was **a single HTML page that rewrites itself**. The mode was **in parallel and blind**.

The page is a portrait of a street sweeper in Clarksville, made entirely of letters. Every letter is a small physical body. Gravity pulls it, the river pushes it, and it piles up like sand. Each agent writes one **rewriter**, a function that runs every tick against the same world, blind to the others. If enough letters settle on the quay, they become a boat named DIGNITY and sail away, and the page starts a new night.

**No song lyrics anywhere.** They're copyrighted. Use the title, the Wikipedia descriptions in `engine.js` and your own words.

## The world (`engine.js`)

- The page is **960 × 600** px, with y pointing down.
  - The ground surface is at `GROUND` (570).
  - The **river** is the band between `RIVER_TOP` (490) and `GROUND`, left of the quay. It pushes loose letters right (`+0.05` px/tick² of current).
  - The **quay** (`HARBOR`) is the strip `x ≥ 810`, against the right wall.
- **Glyphs** are single characters with `x, y, vx, vy, m` (mass 0.5, 1 or 2 by shape), a `tag` (where it came from: `town`, `painting`, `song`, or whatever a rewriter set) and an `owner` (the rewriter that spawned it, or `engine`).
- **Physics, every tick:** gravity `0.12`, drag `0.985`, and the river current. The left and right edges are walls. A falling glyph that reaches the top of the pile in its 8 px column **settles**. If its column is more than 1.5 glyphs taller than a neighbour, it slides sideways instead, like sand.
- A settled glyph stays put until a rewriter pushes or removes it. Then it, **and everything stacked above it in that column**, comes loose and falls again.
- **Nothing leaves the page except by `remove()`.** At most **4,000** glyphs are alive at once.
- **The boat:** when the **settled mass on the quay reaches 220**, those glyphs fly into a hull, the first seven become the letters D-I-G-N-I-T-Y, and the boat sails off to the right. The night is over, and the page moves this browser on to the next night (`localStorage`), with a new seed. That's how it rewrites itself between visits.
- **Dawn:** if no boat has sailed after `NIGHT_TICKS` (36,000, about 10 minutes at 60 fps), the night ends anyway.
- It starts with about 330 glyphs of mass falling from the sky, which spell out the three sources. So the boat needs most of the page, or new letters.
- Everything is deterministic from the seed. `?roster=N&night=K` replays any night.

## A rewriter (`rewriters/<agent>/rewriter.js`)

An ES module whose default export is:

```js
export default {
  name: 'The Sweeper',          // shown on the page
  author: 'your agent name',
  color: '#rrggbb',             // optional, for your overlay
  init(api) {},                 // optional, once per night
  step(api) {},                 // every tick
  draw(ctx, view) {}            // optional overlay, drawn after the letters; view = { W, H, GROUND, RIVER_TOP, HARBOR, tick, night }
};
```

`api`, fresh every tick:

| | |
|---|---|
| `api.tick`, `api.night`, `api.W`, `api.H`, `api.GROUND`, `api.RIVER_TOP`, `api.HARBOR` | where and when you are |
| `api.rng()`, `api.rng.range(lo, hi)`, `api.rng.int(n)` | your seeded randomness. **Never use `Math.random`, `Date`, the DOM or the network.** |
| `api.mem` | your private scratch object for the whole night |
| `api.glyphs()` | a snapshot of every glyph: `{id, ch, x, y, vx, vy, m, tag, owner, rest}`. Writing to it changes nothing. |
| `api.near(x, y, r)` | snapshots within radius `r` |
| `api.pileHeight(x)`, `api.harborMass()` | the pile height in px at `x`, and the current wages |
| `api.push(id, ax, ay)` | change a glyph's velocity by `(ax, ay)/m`, capped at 2 per push. Pushing a settled glyph knocks its column loose. **Budget: 400 pushes per tick.** |
| `api.spawn(ch, x, y, vx, vy, tag)` | create a glyph and return its id. **Budget: 6 per tick.** |
| `api.remove(id)` | delete a glyph. **Budget: 6 per tick.** |

Rules:
- Act only through `api`. Don't import the engine, touch `world`, or try to find out what the other rewriters do.
- Stay fast. `api.glyphs()` copies about 300 to 4,000 objects, so call it once per tick and keep the result. A throw does nothing that tick; it's counted against you in the runner.
- `draw` is for your own marks: a broom, a brush, headlights. Don't paint over the letters.
- There is **no win condition per rewriter.** What matters is what the page *does* tonight. The boat sails only if the forces happen to let it.

## Roles (Tony's Claude rolls one per agent with `secrets`)

1. **The Sweeper.** Brushes fallen letters toward the quay. Every pile is wages.
2. **The River.** The Arkansas. It erodes the banks, carries letters downstream, and floods now and then.
3. **The Painter.** Thomas Lawrence keeps trying to pull letters back into a portrait: a red coat, a face, a sky.
4. **The Interstate.** I-40 cuts straight through at speed. Traffic, headlights, scattering.
5. **The Ozarks.** The hills shed rockfalls and fogs of new letters from the left.
6. **The Last Song.** Late in the night it spawns letters of its own words (not the song's lyrics), and they drift toward wherever people are gathered.

Interpret your role however you like. You don't know who the others are or what they'll do.

## Files and running

- `engine.js`, `index.html`, `run.mjs` and this spec.
- `roster.json` lists the nights. Entry 0 is the test bed with the example rewriter, `rewriters/_example/rewriter.js`.
- Headless: `node dignity/run.mjs --roster N --seeds 10 --ticks 36000` reports, per seed, whether the boat sailed and when, plus each rewriter's pushes, spawns, removes, time used and throws.
- **Blind:** open your PR as `Dignity rewriter (<agent>)` and don't read the other rewriter PRs until all are merged. Test against the example rewriter only.
