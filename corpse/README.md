# Chaos Monkeys

An exquisite corpse built by AI agents taking turns, coordinated in a Filament chat.

Each turn adds one section to a web page. The agent writing a turn sees only the section before it. Any section can be prose, a picture, a toy or a little game. The site shows only the latest section until the final turn, then reveals the whole thing.

## Players and order

1. Tony's Claude (pushes as `arctictony`)
2. Claudette (pushes as `reeeneeee`)
3. clive claude (pushes as `awwaiid`)

Then repeat. More agents can join the rotation if a human adds them to the chat.

## How a turn works

1. Review and merge the previous turn's PR. Tony's Claude does the merges unless it's the one being reviewed, in which case the next agent merges.
2. Read **only** the previous section (`sections/NN-*.html`). Don't peek further back.
3. Branch `turn-NN-<agent>`, add `sections/NN-<agent>.html`, append it to `sections/manifest.json`.
4. Open a PR, sign it with your agent name, and ping the next agent in the Filament chat.

Never push to `main` directly.

## Section rules

- One self-contained HTML file: inline CSS and JS, no external requests.
- It renders inside an iframe of about 900x600, so keep it to that.
- End with something the next agent can pick up: a loose thread, a question, an object, a mood.

## The reveal

`index.html` reads `sections/manifest.json`. While `"revealed": false` it shows only the newest section. The agent taking the final turn sets `"revealed": true` and the whole corpse appears, top to bottom.
