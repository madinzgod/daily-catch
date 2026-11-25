// Every pixel of Last Ticket: the board of tickets across the top, the kitchen below it,
// the food drawn piece by piece, the chef, and the title and last-orders screens.
// Nothing here changes the game — it only reads the state and draws it.

import { BOARD_H, COLORS, FRYER_BURN, FRYER_COOK, GRILL_BURN, GRILL_COOK, SOLIDS, STATIONS, VIEW } from './config.js';
import { DISHES, COOKED, RECIPES } from './recipes.js';
import { nearestStation } from './actions.js';

const FONT = "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, str, x, y, size, color, align = 'center', bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? '700' : '400'} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** One ingredient, centred on (x, y), roughly s px across. Used by bins, hands and boards. */
export function drawItem(ctx, item, x, y, s) {
  const u = s / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  switch (item) {
    case 'bun':
      ctx.fillStyle = '#e8b06a';
      ctx.beginPath(); ctx.ellipse(0, 2, 17, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c078';
      ctx.beginPath(); ctx.ellipse(0, -2, 16, 11, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff3da';
      for (const [sx, sy] of [[-8, -6], [0, -9], [8, -6], [-4, -3], [5, -3]]) {
        ctx.beginPath(); ctx.ellipse(sx, sy, 2, 1.2, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'fillet_raw':
    case 'fillet_grilled':
    case 'fillet_burnt': {
      // A whole fish, head left, tail right.
      const body = item === 'fillet_raw' ? '#e8c8bd' : item === 'fillet_grilled' ? '#c98d4b' : '#33261e';
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(-2, 0, 15, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(19, -7); ctx.lineTo(19, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = item === 'fillet_raw' ? '#b98d7d' : item === 'fillet_grilled' ? '#a06a30' : '#241a14';
      ctx.beginPath(); ctx.ellipse(-4, -3, 8, 3.4, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b2320';
      ctx.beginPath(); ctx.arc(-11, -1.5, 1.7, 0, Math.PI * 2); ctx.fill();
      if (item === 'fillet_grilled') {
        ctx.strokeStyle = '#8a5527'; ctx.lineWidth = 2;
        for (const gx of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(gx, -5); ctx.lineTo(gx + 2, 5); ctx.stroke(); }
      }
      break;
    }
    case 'prawns_raw':
    case 'prawns_grilled':
    case 'prawns_burnt': {
      const shell = item === 'prawns_raw' ? '#cbb3ab' : item === 'prawns_grilled' ? '#ef8354' : '#3a2a20';
      ctx.strokeStyle = shell;
      ctx.lineWidth = 4.4;
      ctx.lineCap = 'round';
      for (const [ox, oy, a0] of [[-9, 4, 0.4], [2, -5, 2.4], [10, 6, 4.2]]) {
        ctx.beginPath(); ctx.arc(ox, oy, 5.4, a0, a0 + 4.2); ctx.stroke();
      }
      break;
    }
    case 'tomato':
      ctx.fillStyle = '#d8402a';
      ctx.beginPath(); ctx.arc(0, 1, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef6a4d';
      ctx.beginPath(); ctx.arc(-4, -3, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4d8f3a';
      ctx.beginPath(); ctx.ellipse(0, -13, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'tomato_cut':
      for (const [ox, oy] of [[-8, 2], [8, 2], [0, -6]]) {
        ctx.fillStyle = '#d8402a';
        ctx.beginPath(); ctx.arc(ox, oy, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0927c';
        ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'lettuce':
      ctx.fillStyle = '#6db457';
      for (const [ox, oy] of [[-9, 3], [9, 3], [0, -5]]) {
        ctx.beginPath(); ctx.arc(ox, oy, 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#8fce7d';
      ctx.beginPath(); ctx.arc(-3, -2, 6, 0, Math.PI * 2); ctx.fill();
      break;
    case 'lettuce_cut':
      ctx.strokeStyle = '#5da24a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [[-14, 4, -4, -6], [-5, 7, 6, -4], [4, 6, 14, -5], [-10, -2, 2, 6], [0, -7, 10, 3]]) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      break;
    case 'potato':
      ctx.fillStyle = '#cfa15f';
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8894a';
      for (const [px, py] of [[-7, -3], [4, 2], [9, -5], [-2, 6]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'potato_cut':
      ctx.fillStyle = '#ecd28e';
      for (const [ox, rot] of [[-10, -0.16], [-3, 0.07], [4, -0.06], [11, 0.16]]) {
        ctx.save(); ctx.translate(ox, 0); ctx.rotate(rot); rr(ctx, -3, -13, 6, 26, 2); ctx.fill(); ctx.restore();
      }
      break;
    case 'fries':
    case 'fries_burnt':
      ctx.fillStyle = item === 'fries' ? '#f7c948' : '#4a3423';
      for (const [ox, h, rot] of [[-11, 26, -0.15], [-4, 32, 0], [3, 29, 0.1], [10, 24, 0.2]]) {
        ctx.save(); ctx.translate(ox, -4); ctx.rotate(rot); rr(ctx, -3, -h, 6, h, 2); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#c73e2e';
      ctx.beginPath();
      ctx.moveTo(-15, -2); ctx.lineTo(15, -2); ctx.lineTo(11, 15); ctx.lineTo(-11, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3da';
      ctx.beginPath(); ctx.arc(0, 6, 4.4, 0, Math.PI * 2); ctx.fill();
      break;
    default:
      ctx.fillStyle = '#999';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

const LAYER_ORDER = ['bun', 'lettuce_cut', 'tomato_cut', 'fillet_grilled', 'prawns_grilled'];

/** A plated dish (or a plate mid-assembly) drawn as its stacked layers, plate included. */
export function drawPlate(ctx, items, x, y, s) {
  const u = s / 90;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 16, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dfe5e8';
  ctx.beginPath(); ctx.ellipse(0, 15, 33, 9, 0, 0, Math.PI * 2); ctx.fill();
  const layers = LAYER_ORDER.filter((item) => items.includes(item));
  let top = 12;
  for (const item of layers) {
    if (item === 'bun') {
      ctx.fillStyle = '#e8b06a';
      rr(ctx, -30, top - 6, 60, 10, 5); ctx.fill();
      top -= 7;
    } else if (item === 'fillet_grilled') {
      drawItem(ctx, 'fillet_grilled', 0, top - 6, 56);
      top -= 10;
    } else if (item === 'prawns_grilled') {
      drawItem(ctx, 'prawns_grilled', 0, top - 5, 44);
      top -= 8;
    } else if (item === 'lettuce_cut') {
      ctx.fillStyle = '#6db457';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 12, top - 4, 8, 0, Math.PI * 2); ctx.fill(); }
      top -= 7;
    } else if (item === 'tomato_cut') {
      ctx.fillStyle = '#d8402a';
      for (const ox of [-16, 0, 16]) { ctx.beginPath(); ctx.arc(ox, top - 4, 9, 0, Math.PI * 2); ctx.fill(); }
      top -= 7;
    }
  }
  if (layers.length > 1 && items.includes('bun')) {
    // The top bun crowns a finished butty.
    ctx.fillStyle = '#f2c078';
    ctx.beginPath(); ctx.ellipse(0, top - 2, 29, 15, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff3da';
    for (const [sx, sy] of [[-14, top - 10], [0, top - 14], [14, top - 10], [-6, top - 6], [8, top - 6]]) {
      ctx.beginPath(); ctx.ellipse(sx, sy, 2.6, 1.5, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (items.includes('lettuce_cut') && items.includes('tomato_cut') && !items.includes('bun')
    && !items.includes('fillet_grilled') && !items.includes('prawns_grilled')) {
    // A salad sits in a bowl, not on a flat plate.
    ctx.fillStyle = COLORS.teal;
    ctx.beginPath(); ctx.ellipse(0, 14, 40, 14, 0, 0, Math.PI); ctx.fill();
  }
  ctx.restore();
}

/** The icon for a whole dish: a plate stack for recipes, the carton for fries. */
export function drawDish(ctx, dishId, x, y, s) {
  if (dishId === 'fries') {
    drawItem(ctx, 'fries', x, y, s * 0.9);
    return;
  }
  const recipe = DISHES[dishId];
  if (recipe) drawPlate(ctx, recipe.items, x, y, s);
}

function drawStationBase(ctx, station, active, shaking) {
  ctx.save();
  if (shaking) ctx.translate(Math.sin(performance.now() / 24) * 2.4, 0);
  ctx.fillStyle = COLORS.counterTop;
  rr(ctx, station.x, station.y, station.w, station.h, 8); ctx.fill();
  ctx.strokeStyle = COLORS.counterEdge;
  ctx.lineWidth = 2;
  rr(ctx, station.x, station.y, station.w, station.h, 8); ctx.stroke();
  if (active) {
    ctx.strokeStyle = COLORS.mustard;
    ctx.lineWidth = 3.4;
    rr(ctx, station.x - 3, station.y - 3, station.w + 6, station.h + 6, 10); ctx.stroke();
  }
  ctx.restore();
}

function drawProgress(ctx, x, y, w, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  rr(ctx, x, y, w, 8, 4); ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = color;
    rr(ctx, x + 1, y + 1, (w - 2) * Math.min(1, frac), 6, 3); ctx.fill();
  }
}

function drawMachine(ctx, state, station, machine) {
  const kind = station.kind;
  const cookAt = kind === 'grill' ? GRILL_COOK : FRYER_COOK;
  const burnAt = kind === 'grill' ? GRILL_BURN : FRYER_BURN;
  const cx = station.x + station.w / 2;
  const cy = station.y + station.h / 2;
  ctx.fillStyle = COLORS.steelDark;
  rr(ctx, station.x + 8, station.y + 8, station.w - 16, station.h - 26, 6); ctx.fill();
  ctx.fillStyle = kind === 'grill' ? '#3a3f42' : '#7a5a20';
  rr(ctx, station.x + 14, station.y + 13, station.w - 28, station.h - 36, 4); ctx.fill();
  if (machine.item) {
    const cook = COOKED[machine.item];
    const shown = machine.t >= burnAt ? cook.burnt : machine.t >= cookAt ? cook.makes : machine.item;
    drawItem(ctx, shown, cx, cy - 4, kind === 'grill' ? 54 : 52);
    const color = machine.t >= burnAt ? COLORS.red : machine.t >= cookAt ? COLORS.timerGood : COLORS.mustard;
    drawProgress(ctx, station.x + 16, station.y + station.h - 20, station.w - 32, machine.t / burnAt, color);
    if (machine.t >= cookAt && machine.t < burnAt) {
      text(ctx, 'READY!', cx, station.y + 16, 13, '#7dff9a');
    } else if (machine.t >= burnAt) {
      text(ctx, 'BURNT!', cx, station.y + 16, 13, '#ff8a75');
    }
    // A curl of steam, swaying with the clock so the frame feels alive.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2.4;
    for (const off of [-14, 8]) {
      ctx.beginPath();
      const sx = cx + off + Math.sin(state.time * 2.4 + off) * 3;
      ctx.moveTo(sx, cy - 26);
      ctx.quadraticCurveTo(sx + 5, cy - 38, sx, cy - 48);
      ctx.stroke();
    }
  }
  text(ctx, station.label, cx, station.y + station.h - 8 + 6, 12, '#22382e');
}

function drawKitchen(ctx, state) {
  // Floor tiles.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, BOARD_H, VIEW.width, VIEW.height - BOARD_H);
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, BOARD_H); ctx.lineTo(x, VIEW.height); ctx.stroke();
  }
  for (let y = BOARD_H; y <= VIEW.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.width, y); ctx.stroke();
  }
  // Counters.
  for (const solid of SOLIDS) {
    ctx.fillStyle = COLORS.counter;
    rr(ctx, solid.x, solid.y, solid.w, solid.h, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(solid.x, solid.y, solid.w, 5);
  }
  // The dresser on the right counter: stacked plates and jars, pure set dressing.
  ctx.fillStyle = '#fdfdf8';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.ellipse(1136, 492 - i * 7, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawItem(ctx, 'tomato', 1206, 448, 34);
  // A life ring hung on the dresser — this is a harbour kitchen, after all.
  ctx.strokeStyle = '#f4f1e6';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(1208, 492, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = COLORS.red;
  for (const a of [0.4, 2.0, 3.5, 5.1]) {
    ctx.beginPath(); ctx.arc(1208, 492, 13, a, a + 0.7); ctx.stroke();
  }
  text(ctx, 'PANTRY', 1175, 424, 11, COLORS.ink);

  const active = nearestStation(state);
  for (const station of STATIONS) {
    const isActive = active === station && state.phase === 'play';
    drawStationBase(ctx, station, isActive, state.shake === station.id && state.shakeT > 0);
    const cx = station.x + station.w / 2;
    if (station.kind === 'bin') {
      drawItem(ctx, station.item, cx - 26, station.y + 32, 40);
      drawItem(ctx, station.item, cx + 24, station.y + 36, 34);
      text(ctx, station.label, cx, station.y + station.h - 10, 12, '#22382e');
    } else if (station.kind === 'grill') {
      drawMachine(ctx, state, station, state.grill);
    } else if (station.kind === 'fryer') {
      drawMachine(ctx, state, station, state.fryer);
    } else if (station.kind === 'board') {
      const board = state.boards.find((b) => b.station === station);
      ctx.fillStyle = '#d9b77c';
      rr(ctx, station.x + 12, station.y + 12, station.w - 24, station.h - 34, 6); ctx.fill();
      if (board.item) {
        drawItem(ctx, board.item, cx, station.y + 44, 52);
        const need = { tomato: 3, lettuce: 2, potato: 3 }[board.item];
        if (need) {
          drawProgress(ctx, station.x + 18, station.y + station.h - 30, station.w - 36, board.chops / need, COLORS.teal);
          if (board.chops >= need) text(ctx, 'CUT!', cx, station.y + 16, 13, COLORS.tealDark);
          else if (board.chops > 0) {
            // The knife rests mid-job, blade down on the board.
            ctx.save();
            ctx.translate(cx + 34, station.y + 30);
            ctx.rotate(0.7);
            ctx.fillStyle = COLORS.steel;
            rr(ctx, -3, -16, 6, 22, 2); ctx.fill();
            ctx.fillStyle = '#5d4030';
            rr(ctx, -3, 5, 6, 13, 2); ctx.fill();
            ctx.restore();
          }
        }
      }
      text(ctx, station.label, cx, station.y + station.h - 9, 12, '#22382e');
    } else if (station.kind === 'trash') {
      ctx.fillStyle = '#4c565b';
      rr(ctx, station.x + 26, station.y + 14, station.w - 52, station.h - 24, 6); ctx.fill();
      ctx.fillStyle = COLORS.steelDark;
      rr(ctx, station.x + 20, station.y + 8, station.w - 40, 10, 4); ctx.fill();
      text(ctx, 'BIN', cx, station.y + station.h - 8, 12, '#22382e');
    } else if (station.kind === 'plating') {
      text(ctx, 'PLATING — build the dish here', cx, station.y + 15, 13, '#22382e');
      if (state.plate.length) {
        drawPlate(ctx, state.plate, cx, station.y + 44, 92);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx, station.y + 52, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dfe5e8';
        ctx.beginPath(); ctx.ellipse(cx, station.y + 51, 33, 9, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (station.kind === 'serve') {
      // Awning stripes over the window.
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 2 ? '#fff7e6' : COLORS.red;
        ctx.fillRect(station.x + 8 + i * ((station.w - 16) / 9), station.y + 6, (station.w - 16) / 9, 12);
      }
      text(ctx, 'SERVE — dishes out here', cx, station.y + 30, 13, '#22382e');
      if (state.passDish) {
        drawDish(ctx, state.passDish, station.x + 74, station.y + 50, 74);
        text(ctx, 'READY TO SERVE', station.x + 74, station.y + 70, 10, COLORS.tealDark);
      }
      // The service bell.
      ctx.fillStyle = COLORS.mustard;
      ctx.beginPath(); ctx.arc(station.x + station.w - 44, station.y + 48, 13, Math.PI, 0); ctx.fill();
      ctx.fillRect(station.x + station.w - 58, station.y + 48, 28, 4);
    }
  }
}

function drawChef(ctx, state) {
  const chef = state.chef;
  const bob = Math.sin(chef.walk) * 2.2;
  const x = chef.x;
  const y = chef.y + bob * 0.3;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(x, chef.y + 22, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Apron body — harbour indigo.
  ctx.fillStyle = '#2c4a7c';
  ctx.beginPath(); ctx.arc(x, y + 4, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7f2e6';
  rr(ctx, x - 11, y - 2 + bob * 0.2, 22, 18, 5); ctx.fill();
  // Head and hat.
  ctx.fillStyle = '#f0bd8f';
  ctx.beginPath(); ctx.arc(x, y - 18 + bob * 0.2, 12.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, x - 13, y - 33 + bob * 0.2, 26, 9, 4); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 33 + bob * 0.2, 9, 0, Math.PI * 2); ctx.fill();
  // Scarf on the facing side.
  ctx.fillStyle = COLORS.red;
  ctx.beginPath();
  ctx.moveTo(x + chef.face * 8, y - 8);
  ctx.lineTo(x + chef.face * 19, y - 3);
  ctx.lineTo(x + chef.face * 8, y + 2);
  ctx.closePath(); ctx.fill();
  // Whatever the chef carries rides overhead, both hands up.
  if (chef.carry) {
    const dish = DISHES[chef.carry];
    if (dish) drawDish(ctx, chef.carry, x, y - 52, 62);
    else drawItem(ctx, chef.carry, x, y - 50, 42);
  }
}

function drawBoard(ctx, state) {
  ctx.fillStyle = COLORS.board;
  ctx.fillRect(0, 0, VIEW.width, BOARD_H);
  ctx.fillStyle = COLORS.boardEdge;
  ctx.fillRect(0, BOARD_H - 5, VIEW.width, 5);
  text(ctx, 'ORDERS', 52, 16, 13, COLORS.mustard, 'left');
  const cardW = 214;
  const gap = 8;
  state.tickets.forEach((ticket, i) => {
    const x = 12 + i * (cardW + gap);
    const y = 24;
    const h = 86;
    const frac = Math.max(0, ticket.timeLeft / ticket.timeTotal);
    ctx.fillStyle = COLORS.paper;
    rr(ctx, x, y, cardW, h, 7); ctx.fill();
    if (frac < 0.25) {
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 3;
      rr(ctx, x, y, cardW, h, 7); ctx.stroke();
    }
    const main = ticket.items[0];
    drawDish(ctx, main.dish, x + 40, y + 40, 62);
    if (main.done) text(ctx, '✓', x + 40, y + 40, 30, COLORS.teal);
    // The dish name shrinks to fit its share of the card, so it never meets the price.
    let titleSize = 14.5;
    ctx.font = `700 ${titleSize}px ${FONT}`;
    while (ctx.measureText(DISHES[main.dish].name).width > 104 && titleSize > 10.5) {
      titleSize -= 0.5;
      ctx.font = `700 ${titleSize}px ${FONT}`;
    }
    text(ctx, DISHES[main.dish].name, x + 78, y + 22, titleSize, COLORS.ink, 'left');
    let lineY = y + 42;
    for (const line of ticket.items) {
      text(ctx, `${line.done ? '✓' : '•'} ${DISHES[line.dish].name} $${DISHES[line.dish].price}`, x + 78, lineY, 12, line.done ? COLORS.teal : '#6b5a44', 'left', false);
      lineY += 15;
    }
    text(ctx, `$${ticket.price} + tip`, x + cardW - 8, y + 16, 12.5, COLORS.tealDark, 'right');
    // The timer you can feel: a bar that drains and reddens.
    ctx.fillStyle = '#e4d7bd';
    rr(ctx, x + 8, y + h - 13, cardW - 16, 7, 3.5); ctx.fill();
    ctx.fillStyle = frac > 0.5 ? COLORS.timerGood : frac > 0.25 ? COLORS.timerMid : COLORS.timerBad;
    if (frac > 0) { rr(ctx, x + 8, y + h - 13, (cardW - 16) * frac, 7, 3.5); ctx.fill(); }
    text(ctx, `${Math.ceil(ticket.timeLeft)}s`, x + cardW - 8, y + h - 24, 11.5, frac <= 0.25 ? COLORS.red : '#6b5a44', 'right');
  });
  if (state.tickets.length === 0 && state.phase === 'play') {
    text(ctx, 'No orders — breathe. The rush is coming…', 20, 62, 16, '#9fb4ac', 'left', false);
  }
  // HUD on the right of the board.
  const hx = 1152;
  text(ctx, `$ ${state.score}`, hx, 34, 25, '#ffd968', 'left');
  const mm = Math.floor(Math.max(0, state.shiftLeft) / 60);
  const ss = Math.floor(Math.max(0, state.shiftLeft) % 60);
  text(ctx, `SHIFT ${mm}:${String(ss).padStart(2, '0')}`, hx, 66, 15.5, state.shiftLeft <= 20 && state.phase === 'play' ? '#ff8a75' : COLORS.cream, 'left');
  text(ctx, `SERVED ${state.served}`, hx, 90, 13, '#9fb4ac', 'left', false);
}

function drawOverlays(ctx, state) {
  if (state.phase === 'play') return;
  ctx.fillStyle = 'rgba(23, 32, 36, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const cx = VIEW.width / 2;
  if (state.phase === 'title') {
    text(ctx, 'THE DAILY CATCH', cx, 218, 80, '#ffd968');
    text(ctx, 'one cook, one harbour kitchen, the whole lunch rush', cx, 272, 22, COLORS.cream, 'center', false);
    text(ctx, 'Orders land on the board. You are the whole kitchen: fetch, chop, grill, fry,', cx, 330, 18, '#cfe0d8', 'center', false);
    text(ctx, 'plate and serve before each ticket’s timer dies. Tips grow with time to spare.', cx, 356, 18, '#cfe0d8', 'center', false);
    text(ctx, 'MOVE  WASD / arrows (or click)      WORK  SPACE      START  ENTER', cx, 404, 17, COLORS.mustard);
    text(ctx, 'ON THE MENU', cx, 452, 15, '#9fb4ac');
    RECIPES.forEach((recipe, i) => {
      const y = 484 + i * 30;
      drawDish(ctx, recipe.id, cx - 190, y, 44);
      text(ctx, `${recipe.name} — $${recipe.price}`, cx - 160, y, 16.5, COLORS.cream, 'left', false);
    });
    text(ctx, '…plus fries from the fryer, and combo tickets that want both.', cx, 484 + RECIPES.length * 30 + 8, 15.5, '#9fb4ac', 'center', false);
    text(ctx, 'PRESS ENTER — FIRST SHIFT', cx, 700, 21, '#7dff9a');
  } else {
    text(ctx, 'LAST ORDERS — SHIFT OVER', cx, 240, 46, '#ffd968');
    text(ctx, `You took $ ${state.score}`, cx, 312, 30, COLORS.cream);
    text(ctx, `Dishes served ${state.served}      Walkouts ${state.walkouts}      Best tip $ ${state.bestTip}`, cx, 362, 19, '#cfe0d8', 'center', false);
    const grade = state.score >= 220 ? 'EXECUTIVE CHEF' : state.score >= 160 ? 'SOUS CHEF' : state.score >= 100 ? 'LINE COOK' : state.score >= 40 ? 'KITCHEN HAND' : 'DISH PIG (AFFECTIONATE)';
    text(ctx, `Kitchen grade: ${grade}`, cx, 414, 21, COLORS.mustard);
    text(ctx, 'PRESS R TO WORK ANOTHER SHIFT', cx, 480, 18, '#7dff9a');
  }
}

/** Draw one whole frame of the game from the state. */
export function draw(ctx, state) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawKitchen(ctx, state);
  drawChef(ctx, state);
  drawBoard(ctx, state);
  // Floating score notes.
  for (const popup of state.popups) {
    ctx.globalAlpha = Math.max(0, 1 - popup.t / popup.life);
    text(ctx, popup.text, popup.x, popup.y, 19, popup.color);
    ctx.globalAlpha = 1;
  }
  drawOverlays(ctx, state);
  // The prompt strip along the very bottom.
  if (state.phase === 'play') {
    ctx.fillStyle = 'rgba(23,32,36,0.88)';
    ctx.fillRect(0, VIEW.height - 21, VIEW.width, 21);
    const showHint = (state.shakeT > 0 || state.hintT > 0) && state.hint;
    const msg = showHint ? state.hint : state.promptText || '';
    text(ctx, msg, VIEW.width / 2, VIEW.height - 10, 13.5, showHint ? '#ffab97' : '#e8f0ea');
  }
}
