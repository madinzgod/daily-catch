# The Daily Catch

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/madinzgod/daily-catch/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/madinzgod/daily-catch/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**One cook, one harbour kitchen, the whole lunch rush.** The Daily Catch is a small
cooking game that runs in a desktop browser from its own files — no build step, no
network. Order tickets land on the board; you are the entire kitchen staff: fetch the
fish, chop the salad, mind the grill before it burns, drop the chips, build each plate
piece by piece and serve it before its ticket's timer dies.

## How to play

- **Move:** WASD or arrow keys (or click where to walk)
- **Work:** SPACE (E works too) — one button that does what the counter in front of
  you needs: take, set down, chop, lift, plate, serve, bin
- **Start:** ENTER · **Another shift:** R

A shift is 150 seconds. Every ticket carries a timer and pays a tip that grows with
the time left on its clock; a ticket that runs out walks, and costs you $4. As the
shift deepens the board fills faster and the tickets grow — bigger plates, chips on
the side — but the job never changes: route yourself well and nothing burns.

## The menu

Grilled Fillet · Garden Salad · Fish Butty · Harbour Plate · Prawn Greens — plus
chips from the fryer, and combo tickets that want a plate and chips together. Every
dish is assembled from raw pieces: fillets and prawns off the grill, tomatoes,
lettuce and potatoes under the knife, rolls from the bin.

## Running it

```sh
node serve.ts            # serves game/ at http://localhost:8080
node main.ts             # hands the game in: copies game/ + screenshots/ to
                         # /output (or $MAKEFUN_OUTPUT_DIR) and writes dossier.json
```

Requires Node 22.18 or later; everything is the standard library and plain static
files. The screenshots in `screenshots/` are reproducible renders of the game's own
shot scenes: serve the game and open `?shot=cover`, `?shot=title`, `?shot=rush` or
`?shot=end` (see `shots.json`).

## Layout

- `main.ts` — the hand-in program; `serve.ts` — the local dev server
- `vendor/makefun-game.ts` — the make.fun dossier library, vendored unchanged
- `game/index.html` + `game/src/` — the game, one job per file:
  `config.js` (the room and the clock), `recipes.js` (the menu), `kitchen.js`
  (the state), `orders.js` (tickets and tips), `actions.js` (hands and the update),
  `input.js`, `sound.js` (synthesized, no audio files), `render.js` (every pixel),
  `shots.js` (the screenshot scenes), `main.js` (boot and the frame loop)

MIT licensed — see `LICENSE`.
