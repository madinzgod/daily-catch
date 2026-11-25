// The screenshot scenes behind ?shot=cover|title|rush|end. Each one composes a real game
// state — real tickets, real machines mid-job, a real plate mid-assembly — with the same
// constructors the live game uses, then the renderer draws it exactly as it would a live
// frame. Same name and seed, same frame, every time.

import { createGame } from './kitchen.js';

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
    ticket(1, [['harbour', false]], 13, 33, 60),
    ticket(2, [['butty', false], ['fries', false]], 18, 52, 71),
    ticket(3, [['salad', false]], 8, 41, 71),
  ];
  s.grill = { item: 'fillet_raw', t: 4.9 }; // grilled and READY
  s.fryer = { item: 'potato_cut', t: 3.8 }; // chips ready to lift
  s.boards[0].item = 'tomato';
  s.boards[0].chops = 2; // mid-chop, one press from done
  s.plate = ['fillet_grilled', 'lettuce_cut']; // a Harbour Plate mid-assembly
  s.passDish = 'fillet'; // a finished plate resting on the pass
  s.passT = 1.6;
  s.chef.x = 560;
  s.chef.y = 636;
  s.chef.carry = 'tomato_cut'; // the very piece the Harbour Plate is missing
  s.popups = [{ x: 1062, y: 640, text: '+$16', color: '#1f7a6d', t: 0.4, life: 1.4 }];
  return s;
}

/** The title screen over the quiet kitchen before doors. */
function title() {
  const s = createGame(7);
  s.phase = 'title';
  s.chef.x = 640;
  s.chef.y = 470;
  return s;
}

/** Peak rush: five tickets, two in the red, everything on the heat at once. */
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
  s.plate = ['bun'];
  s.passDish = 'salad';
  s.passT = 1.2;
  s.chef.x = 1006;
  s.chef.y = 636;
  s.chef.carry = 'prawns'; // carrying the answer to ticket #9
  s.popups = [
    { x: 1062, y: 636, text: '+$21 TOP TIP!', color: '#1f7a6d', t: 0.25, life: 1.4 },
    { x: 700, y: 300, text: 'HURRY!', color: '#d84a2f', t: 0.7, life: 1.4 },
  ];
  return s;
}

/** Shutters down: the shift's story in numbers. */
function end() {
  const s = createGame(11);
  s.phase = 'over';
  s.score = 236;
  s.served = 14;
  s.walkouts = 1;
  s.bestTip = 9;
  s.shiftLeft = 0;
  s.chef.x = 640;
  s.chef.y = 470;
  return s;
}

const SCENES = { cover, title, rush, end };

/** Build the named scene's state ('cover' for any unknown name). */
export function stageShot(name) {
  return (SCENES[name] || cover)();
}
