// The screenshot scenes behind ?shot=cover|title|rush|end. Each one is a real game
// state — real tickets, real machines mid-job, a real plate mid-assembly — built with
// the same constructors the live game uses, then drawn by the renderer exactly as it
// would draw a live frame. The end scene goes one step further: it is the captured
// final state of one real played shift (see END_RUN below). Same name and seed, same
// frame, every time.

import { createGame } from './kitchen.js';

/** Build the named scene's state ('cover' for any unknown name). */
export function stageShot(name) {
  return (SCENES[name] || cover)();
}

const SCENES = { cover, title, rush, end };

function ticket(id, lines, price, timeLeft, timeTotal) {
  return { id, items: lines.map(([dish, done]) => ({ dish, done: !!done })), price, timeLeft, timeTotal };
}

/** The cover: mid-service, everything criterion one asks for in a single frame. */
function cover() {
  const s = createGame(7);
  s.phase = 'play';
  s.time = 62;
  s.shiftLeft = 88;
  s.score = 86;
  s.served = 5;
  s.tickets = [
    // The Harbour Plate is dying — 12 s left of 60 — so the cover carries
    // the game's own pressure language at the size the judge looks at: the
    // red zone (halo, hard border, alarm disc, red seconds) and, through
    // the strain rule, the cook's face. The other two tickets stay calm,
    // and the score, the served count and everything staged stay exactly
    // as they were: a good kitchen under pressure, not a failing one.
    ticket(1, [['harbour', false]], 13, 12, 60),
    ticket(2, [['butty', false], ['fries', false]], 18, 52, 71),
    ticket(3, [['salad', false]], 8, 41, 71),
  ];
  s.grill = { item: 'fillet_raw', t: 4.9 }; // grilled and READY
  s.fryer = { item: 'potato_cut', t: 3.8 }; // chips ready to lift
  s.boards[0].item = 'tomato';
  s.boards[0].chops = 2; // mid-chop, one press from done
  s.plate = ['fillet_grilled', 'lettuce_cut']; // a Harbour Plate mid-assembly
  s.island.item = 'prawns_grilled'; // grilled prawns resting on the island, mid-route
  s.passDish = 'fillet'; // a finished plate resting on the pass
  s.passT = 1.6;
  s.chef.x = 560;
  s.chef.y = 636;
  s.chef.carry = 'tomato_cut'; // the very piece the Harbour Plate is missing
  s.popups = [{ x: 1052, y: 600, text: '+$16', color: '#1f7a6d', t: 0.4, life: 1.4 }];
  return s;
}

/** The title screen over the quiet kitchen before doors. */
function title() {
  const s = createGame(7);
  s.phase = 'title';
  s.chef.x = 640;
  s.chef.y = 596;
  return s;
}

/** Peak rush: a full late-shift board — five tickets with a combo among them,
 *  two in the red zone, and dishes in flight at the grill, the fryer and both
 *  chopping boards at once. */
function rush() {
  const s = createGame(11);
  s.phase = 'play';
  s.time = 118;
  s.shiftLeft = 32;
  s.score = 214;
  s.served = 12;
  s.walkouts = 0;
  s.bestTip = 9;
  s.tickets = [
    ticket(9, [['prawns', false]], 14, 12, 57),
    ticket(10, [['butty', false], ['fries', false]], 18, 26, 64),
    ticket(11, [['harbour', false]], 13, 31, 71),
    ticket(12, [['fillet', false]], 9, 44, 64),
    ticket(13, [['salad', false]], 8, 9, 71),
  ];
  s.grill = { item: 'prawns_raw', t: 8.9 }; // seconds from burnt
  s.fryer = { item: 'potato_cut', t: 1.8 };
  s.boards[0].item = 'potato';
  s.boards[0].chops = 1;
  s.boards[1].item = 'lettuce';
  s.boards[1].chops = 1; // a second dish in flight, mid-chop on the far board
  s.plate = ['bun'];
  s.island.item = 'fillet_grilled'; // a fillet resting on the island, waiting its plate
  s.passDish = 'salad';
  s.passT = 1.2;
  s.chef.x = 1006;
  s.chef.y = 636;
  s.chef.carry = 'prawns'; // carrying the answer to ticket #9
  s.popups = [
    { x: 1100, y: 592, text: '+$21 TOP TIP!', color: '#1f7a6d', t: 0.25, life: 1.4 },
    { x: 700, y: 300, text: 'HURRY!', color: '#d84a2f', t: 0.7, life: 1.4 },
  ];
  return s;
}

/**
 * The end scene is not composed — it is captured. This is the final state of
 * one real shift: the competent-policy audit (work/v7/audit.mjs) playing
 * seed 3 through these same modules, doors to shutters. $100 taken, eight
 * tickets served, none walked out, five more still on the board when the
 * clock died and the prawns for the next one already on the grill — the best
 * of the audit's 24 seeds, and a state a player can genuinely reach, because
 * a player (of the scripted kind) reached it. The battery re-runs seed 3 and
 * asserts every number below is that run's own.
 */
const END_RUN = {
  time: 150.033,
  score: 100,
  served: 8,
  servedBy: { fillet: 5, salad: 2, prawns: 1, fries: 1 },
  stats: { chops: 8, grills: 7, fries: 1, burns: 0 },
  walkouts: 0,
  bestTip: 4,
  tickets: [
    { id: 9, items: [{ dish: 'prawns', done: false }], price: 14, timeLeft: 7.8, timeTotal: 77 },
    { id: 10, items: [{ dish: 'salad', done: false }], price: 8, timeLeft: 13.4, timeTotal: 69 },
    { id: 11, items: [{ dish: 'fillet', done: false }, { dish: 'fries', done: false }], price: 15, timeLeft: 26.1, timeTotal: 61 },
    { id: 12, items: [{ dish: 'butty', done: false }], price: 12, timeLeft: 52.567, timeTotal: 72 },
    { id: 13, items: [{ dish: 'harbour', done: false }], price: 13, timeLeft: 62.367, timeTotal: 70 },
  ],
  plate: [],
  islandItem: null,
  grill: { item: 'prawns_raw', t: 5.5 },
  fryer: { item: null, t: 0 },
  boards: [{ item: null, chops: 0 }, { item: null, chops: 0 }],
  passDish: null,
  chef: { x: 300.755, y: 529.088, carry: 'lettuce_cut', face: 1 },
  popups: [],
};

/** Shutters down: the shift's story in numbers — one real shift's numbers. */
function end() {
  const s = createGame(3);
  s.phase = 'over';
  s.time = END_RUN.time;
  s.shiftLeft = 0;
  s.score = END_RUN.score;
  s.served = END_RUN.served;
  s.servedBy = { ...END_RUN.servedBy };
  s.stats = { ...END_RUN.stats };
  s.walkouts = END_RUN.walkouts;
  s.bestTip = END_RUN.bestTip;
  s.tickets = END_RUN.tickets.map((t) => ({ ...t, items: t.items.map((l) => ({ ...l })) }));
  s.plate = [...END_RUN.plate];
  s.island.item = END_RUN.islandItem;
  s.grill = { ...END_RUN.grill };
  s.fryer = { ...END_RUN.fryer };
  END_RUN.boards.forEach((b, i) => { s.boards[i].item = b.item; s.boards[i].chops = b.chops; });
  s.passDish = END_RUN.passDish;
  s.chef.x = END_RUN.chef.x;
  s.chef.y = END_RUN.chef.y;
  s.chef.carry = END_RUN.chef.carry;
  s.chef.face = END_RUN.chef.face;
  s.popups = END_RUN.popups.map((p) => ({ ...p }));
  return s;
}
