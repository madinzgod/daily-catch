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

## How a shift plays

A shift is 150 seconds. Tickets land on the order board two at a time, then faster;
each one names a dish, shows its price, and drains a timer bar as its patience runs
out. Serve a ticket in time and you bank its price plus a tip that grows with the
time left on its clock; let the bar empty and the guest walks, costing you $4.

Every dish is a route. Raw pieces come from the six bins on the back counter;
tomatoes, lettuce and potatoes go under the knife at the chopping boards; fillets
and prawns go on the grill; cut potato goes in the fryer — and everything on heat
burns if you leave it. Pieces are assembled on a plate at the plating counter, the
resting island in the middle of the room holds work-in-progress while you fetch the
next piece, and finished dishes leave through the serve window.

The pressure is the clock, not new chores: as the shift deepens the board holds
more tickets at once (up to five), the bigger plates unlock, combo tickets start
asking for chips on the side, and tempers get a little shorter. When the 150
seconds run out the shutters come down and the game tells the shift's story —
what you took, what you served dish by dish, how much work the stations did, and
a kitchen grade for the run.

## The menu

| Dish | Price | Built from |
| --- | ---: | --- |
| Grilled Fillet | $9 | a fillet off the grill |
| Garden Salad | $8 | cut lettuce + tomato slices |
| Fish Butty | $12 | bread roll + grilled fillet + cut lettuce |
| Harbour Plate | $13 | grilled fillet + cut lettuce + tomato slices |
| Prawn Greens | $14 | grilled prawns + cut lettuce + tomato slices |
| Chips | $6 | cut potato, straight from the fryer |

Combo tickets pair one of the plates with chips on the same ticket — one route,
two lines, a bigger tip.

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
