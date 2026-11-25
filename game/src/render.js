// Every pixel of Last Ticket: the board of tickets across the top, the kitchen below it,
// the food drawn piece by piece, the chef, and the title and last-orders screens.
// Nothing here changes the game — it only reads the state and draws it.

import { BOARD_H, COLORS, FRYER_BURN, FRYER_COOK, GRILL_BURN, GRILL_COOK, SOLIDS, STATIONS, VIEW } from './config.js';
import { DISHES, COOKED, RECIPES, recipeForStack } from './recipes.js';
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

/**
 * One prawn, drawn to be recognised at thumbnail size: a curled, segmented body —
 * fat at the head, slimming ring by ring to a fanned tail — with an eye and feelers.
 * Centred on the origin, roughly 36 units wide before the caller's scale.
 */
function drawPrawn(ctx, colors, rot) {
  ctx.save();
  ctx.rotate(rot);
  const segs = [];
  for (let i = 0; i < 5; i++) {
    const a = -2.05 + i * 0.62;
    segs.push({ x: Math.cos(a) * 10.5, y: Math.sin(a) * 10.5 + 3, r: 6.4 - i * 0.72 });
  }
  // The tail fan, at the slim end of the curl.
  const tail = segs[segs.length - 1];
  ctx.fillStyle = colors.body;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1.1;
  for (const f of [-0.45, 0.4]) {
    ctx.save();
    ctx.translate(tail.x, tail.y);
    ctx.rotate(f + 0.9);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9.5, -3.4); ctx.lineTo(9.5, 3.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // The segments, tail first so the head sits on top.
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    ctx.fillStyle = colors.body;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, -0.5, 2.1); ctx.stroke();
  }
  // The head: one dark eye and two long feelers sweeping back.
  const head = segs[0];
  ctx.fillStyle = '#2b2320';
  ctx.beginPath(); ctx.arc(head.x - 3.2, head.y - 2.8, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (const f of [-0.5, -1.0]) {
    ctx.beginPath();
    ctx.moveTo(head.x - 4, head.y - 3);
    ctx.quadraticCurveTo(head.x - 11, head.y - 6 + f * 4, head.x - 15, head.y - 3 + f * 9);
    ctx.stroke();
  }
  ctx.restore();
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
      // A little pile of proper prawns, not curls: segmented, fanned, feelers out.
      const colors = item === 'prawns_raw' ? { body: '#e8ab90', line: '#bd7f63' }
        : item === 'prawns_grilled' ? { body: '#f4834f', line: '#c25227' }
        : { body: '#503a2c', line: '#2e2019' };
      drawPrawn(ctx, colors, 0.25);
      ctx.save(); ctx.translate(9, 8); ctx.scale(0.82, 0.82); drawPrawn(ctx, colors, 2.5); ctx.restore();
      ctx.save(); ctx.translate(-9, 9); ctx.scale(0.7, 0.7); drawPrawn(ctx, colors, -0.9); ctx.restore();
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

/**
 * A plate still being built, for the plating counter only: the pieces sit side by
 * side instead of stacked, so what is already on reads at a glance — and one dashed
 * ring marks the empty place where the next piece belongs.
 */
function drawPlateSpread(ctx, items, x, y, s) {
  const u = s / 110;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 10, 52, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dfe5e8';
  ctx.beginPath(); ctx.ellipse(0, 9, 42, 12, 0, 0, Math.PI * 2); ctx.fill();
  const slots = items.length >= 3 ? [[-27, 2], [0, -5], [27, 2]]
    : items.length === 2 ? [[-25, 0], [25, 0]]
    : [[-14, 0]];
  items.forEach((item, i) => drawItem(ctx, item, slots[i][0], slots[i][1], 40));
  if (items.length < 3) {
    const gap = items.length === 2 ? [0, 12] : [24, 2];
    ctx.strokeStyle = 'rgba(20,84,75,0.8)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4.5, 3.5]);
    ctx.beginPath(); ctx.arc(gap[0], gap[1], 13.5, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
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

/**
 * A call on a solid pill badge — READY!, BURNT!, CUT! — drawn after everything else
 * on its station, so no food or steam can ever hide it, and big enough to read on
 * the contact sheet.
 */
function drawBadge(ctx, x, y, label, bg) {
  ctx.font = `700 13.5px ${FONT}`;
  const w = Math.max(62, ctx.measureText(label).width + 24);
  ctx.fillStyle = bg;
  rr(ctx, x - w / 2, y - 11.5, w, 23, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.6;
  rr(ctx, x - w / 2, y - 11.5, w, 23, 7); ctx.stroke();
  text(ctx, label, x, y + 0.5, 13.5, '#ffffff');
}

/** A woven floor runner: terracotta ground, pale stripes, a light border. */
function drawRug(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.rug;
  rr(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = COLORS.rugStripe;
  ctx.lineWidth = 3;
  for (let sx = x + 16; sx < x + w - 8; sx += 36) {
    ctx.beginPath(); ctx.moveTo(sx, y + 4); ctx.lineTo(sx, y + h - 4); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,247,230,0.55)';
  ctx.lineWidth = 1.4;
  rr(ctx, x + 3, y + 3, w - 6, h - 6, 4); ctx.stroke();
}

/**
 * An ingredient caught part-way through the knife: some pieces already cut and
 * fanned aside, the rest still whole with a flat cut face — and the knife itself,
 * blade down over the work. Drawn in drawItem's 40-unit box.
 */
function drawMidChop(ctx, item, chops, x, y, s) {
  const u = s / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  if (item === 'tomato') {
    // Slices already off, fanned to the left.
    for (let i = 0; i < chops; i++) {
      const ox = -14 + i * 7.5;
      const oy = 7 - i * 2;
      ctx.fillStyle = '#d8402a';
      ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0927c';
      ctx.beginPath(); ctx.arc(ox, oy, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8402a';
      ctx.beginPath(); ctx.arc(ox, oy, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // The remaining half, dome up, cut face showing.
    ctx.fillStyle = '#d8402a';
    ctx.beginPath(); ctx.arc(10, 4, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0927c';
    ctx.beginPath(); ctx.ellipse(10, 4, 11, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8402a';
    for (const [sx, sy] of [[4, 4], [10, 5.4], [16, 4]]) {
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#4d8f3a';
    ctx.beginPath(); ctx.ellipse(10, -8.5, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'potato') {
    // Sticks already cut, standing to the left; the rest of the potato beside them.
    ctx.fillStyle = '#ecd28e';
    for (let i = 0; i < chops; i++) {
      ctx.save();
      ctx.translate(-13 + i * 6.5, 1);
      ctx.rotate(-0.1 + i * 0.09);
      rr(ctx, -2.6, -12, 5.2, 24, 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#cfa15f';
    ctx.beginPath(); ctx.ellipse(10, 1, 15 - chops * 2.4, 10.5, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecd28e';
    ctx.beginPath(); ctx.ellipse(1.5, 0, 3, 8.4, 0.25, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'lettuce') {
    // A growing pile of shreds, and the leaf it came from, shrinking.
    ctx.strokeStyle = '#5da24a';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    const strokes = [[-15, 5, -6, -4], [-8, 8, 3, -2], [-12, -3, -3, 6], [-4, 4, 6, -5]];
    for (let i = 0; i < chops * 2 && i < strokes.length; i++) {
      const [x1, y1, x2, y2] = strokes[i];
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.fillStyle = '#6db457';
    ctx.beginPath(); ctx.arc(11, 0, 11 - chops * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fce7d';
    ctx.beginPath(); ctx.arc(8, -3, Math.max(2.5, 6 - chops * 1.6), 0, Math.PI * 2); ctx.fill();
  }
  // The knife, caught mid-work above the board: long blade, dark handle.
  ctx.save();
  ctx.translate(15, -13);
  ctx.rotate(-0.62);
  ctx.fillStyle = COLORS.steel;
  ctx.beginPath();
  ctx.moveTo(-23, -3.4); ctx.lineTo(8, -3.4); ctx.lineTo(12.5, 0); ctx.lineTo(8, 3); ctx.lineTo(-23, 3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eef3f4';
  ctx.fillRect(-23, 1.1, 33, 1.6);
  ctx.fillStyle = '#5d4030';
  rr(ctx, 12, -3.4, 13.5, 6.8, 3); ctx.fill();
  ctx.restore();
  ctx.restore();
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
    // The call, on a solid badge drawn last of all, so neither the food nor the
    // steam can hide it: green READY!, red BURNT!.
    if (machine.t >= burnAt) drawBadge(ctx, cx, station.y + 17, 'BURNT!', '#a93420');
    else if (machine.t >= cookAt) drawBadge(ctx, cx, station.y + 17, 'READY!', '#1e7d46');
  }
  text(ctx, station.label, cx, station.y + station.h - 8 + 6, 12, '#22382e');
}

function drawKitchen(ctx, state) {
  // The floor: sea-washed deck planks laid across the room, butt joints staggered.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, BOARD_H, VIEW.width, VIEW.height - BOARD_H);
  const plankH = 32;
  for (let row = 0, y = BOARD_H; y < VIEW.height; row++, y += plankH) {
    if (row % 2) {
      ctx.fillStyle = 'rgba(31,122,109,0.05)';
      ctx.fillRect(0, y, VIEW.width, plankH);
    }
    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, y + plankH); ctx.lineTo(VIEW.width, y + plankH); ctx.stroke();
    ctx.lineWidth = 1;
    for (let x = ((row * 397) % 640) + 180; x < VIEW.width; x += 640) {
      ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + plankH - 3); ctx.stroke();
    }
  }
  // Woven runners where the cook wears the floor: before the back counter, before the pass.
  drawRug(ctx, 60, 240, 1160, 30);
  drawRug(ctx, 210, 622, 860, 34);
  // A round braided rug under the island, ringed in the room's colours.
  ctx.fillStyle = COLORS.rug;
  ctx.beginPath(); ctx.ellipse(640, 462, 198, 72, 0, 0, Math.PI * 2); ctx.fill();
  for (const [rx, ry, col, wdt] of [[178, 62, COLORS.rugStripe, 5], [152, 51, COLORS.teal, 4], [126, 41, COLORS.rugStripe, 4]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wdt;
    ctx.beginPath(); ctx.ellipse(640, 462, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
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
  // Two portholes in the front of the pass, looking out at the harbour: brass rims,
  // a strip of sky, the sea, and one small boat going about its business.
  for (const px of [206, 282]) {
    ctx.fillStyle = '#c99635';
    ctx.beginPath(); ctx.arc(px, 728, 21, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(px, 728, 16.5, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#8fc3d4';
    ctx.fillRect(px - 17, 711, 34, 13);
    ctx.fillStyle = '#5b93a8';
    ctx.fillRect(px - 17, 724, 34, 21);
    ctx.fillStyle = '#274b52';
    ctx.beginPath();
    ctx.moveTo(px - 8, 727); ctx.lineTo(px + 8, 727); ctx.lineTo(px + 5, 731); ctx.lineTo(px - 5, 731);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(px - 0.8, 718, 1.6, 9);
    ctx.fillStyle = '#fff7e6';
    ctx.beginPath(); ctx.moveTo(px + 1.6, 719); ctx.lineTo(px + 1.6, 726); ctx.lineTo(px + 7.5, 726); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#8a6a24';
    for (const a of [0.78, 2.36, 3.93, 5.5]) {
      ctx.beginPath(); ctx.arc(px + Math.cos(a) * 18.6, 728 + Math.sin(a) * 18.6, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // The specials board, chalked on the pass between plating and serve.
  ctx.fillStyle = '#22382e';
  rr(ctx, 796, 694, 80, 66, 4); ctx.fill();
  ctx.strokeStyle = '#5f4f3c';
  ctx.lineWidth = 3;
  rr(ctx, 796, 694, 80, 66, 4); ctx.stroke();
  text(ctx, 'SPECIALS', 836, 707, 10.5, '#ffd968');
  text(ctx, 'Harbour', 836, 725, 10.5, '#fff7e6', 'center', false);
  text(ctx, 'Plate $13', 836, 740, 10.5, '#fff7e6', 'center', false);
  text(ctx, 'Prawn $14', 836, 752, 10.5, '#9fb4ac', 'center', false);

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
    } else if (station.kind === 'island') {
      // The resting island: a driftwood top over the sea-glass base, a herb trough
      // along its back edge, and one rest mat where the work-in-progress sits.
      ctx.fillStyle = COLORS.driftwood;
      rr(ctx, station.x + 3, station.y + 3, station.w - 6, station.h - 6, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(95,79,60,0.55)';
      ctx.lineWidth = 1.2;
      for (const px of [station.x + 76, station.x + 150, station.x + 224]) {
        ctx.beginPath(); ctx.moveTo(px, station.y + 6); ctx.lineTo(px, station.y + station.h - 6); ctx.stroke();
      }
      ctx.fillStyle = '#5f4f3c';
      rr(ctx, station.x + 10, station.y + 7, station.w - 20, 13, 4); ctx.fill();
      for (let hx = station.x + 22, i = 0; hx < station.x + station.w - 14; hx += 21, i++) {
        ctx.fillStyle = i % 2 ? '#6db457' : '#5da24a';
        ctx.beginPath(); ctx.arc(hx, station.y + 12, 6.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(31,122,109,0.32)';
      rr(ctx, station.x + 72, station.y + 26, station.w - 144, station.h - 44, 8); ctx.fill();
      if (state.island.item) {
        if (DISHES[state.island.item]) drawDish(ctx, state.island.item, cx, station.y + 45, 60);
        else drawItem(ctx, state.island.item, cx, station.y + 44, 46);
      }
      text(ctx, station.label, cx, station.y + station.h - 9, 12, '#22382e');
    } else if (station.kind === 'board') {
      const board = state.boards.find((b) => b.station === station);
      ctx.fillStyle = '#d9b77c';
      rr(ctx, station.x + 12, station.y + 12, station.w - 24, station.h - 34, 6); ctx.fill();
      if (board.item) {
        const need = { tomato: 3, lettuce: 2, potato: 3 }[board.item];
        if (need && board.chops >= need) {
          // Done: what lies on the board is the cut pieces themselves.
          drawItem(ctx, { tomato: 'tomato_cut', lettuce: 'lettuce_cut', potato: 'potato_cut' }[board.item], cx, station.y + 44, 52);
        } else if (need && board.chops > 0) {
          // Mid-job: part cut, part whole, the knife caught in the work.
          drawMidChop(ctx, board.item, board.chops, cx, station.y + 44, 52);
        } else {
          drawItem(ctx, board.item, cx, station.y + 44, 52);
        }
        if (need) {
          drawProgress(ctx, station.x + 18, station.y + station.h - 30, station.w - 36, board.chops / need, COLORS.teal);
          if (board.chops >= need) drawBadge(ctx, cx, station.y + 16, 'CUT!', COLORS.tealDark);
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
      // Basil pots at the two corners of the pass.
      for (const px of [station.x + 26, station.x + station.w - 26]) {
        ctx.fillStyle = '#b85c38';
        ctx.beginPath();
        ctx.moveTo(px - 8, station.y + 36); ctx.lineTo(px + 8, station.y + 36);
        ctx.lineTo(px + 5.5, station.y + 52); ctx.lineTo(px - 5.5, station.y + 52);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5da24a';
        for (const [ox, oy] of [[-5, 32], [0, 27], [5, 32]]) {
          ctx.beginPath(); ctx.arc(px + ox, station.y + oy, 4.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (state.plate.length) {
        // A finished plate stacks up as a dish; one still being built spreads its
        // pieces out, with a dashed ring where the missing piece belongs.
        if (recipeForStack(state.plate)) drawPlate(ctx, state.plate, cx, station.y + 44, 92);
        else drawPlateSpread(ctx, state.plate, cx, station.y + 46, 112);
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
  const bob = Math.sin(chef.walk) * 2.4;
  const x = chef.x;
  const y = chef.y + bob * 0.3;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(x, chef.y + 27, 26, 7.5, 0, 0, Math.PI * 2); ctx.fill();
  // Arms: both up under whatever he carries, or resting at his sides.
  ctx.strokeStyle = '#f0bd8f';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    if (chef.carry) {
      ctx.moveTo(x + side * 20, y + 8);
      ctx.lineTo(x + side * 12, y - 40);
    } else {
      ctx.moveTo(x + side * 23, y + 2);
      ctx.lineTo(x + side * 27, y + 16);
    }
    ctx.stroke();
  }
  // Apron body — harbour indigo, a cream apron front with a pocket.
  ctx.fillStyle = '#2c4a7c';
  ctx.beginPath(); ctx.arc(x, y + 6, 25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7f2e6';
  rr(ctx, x - 13.5, y - 1 + bob * 0.2, 27, 23, 6); ctx.fill();
  ctx.strokeStyle = '#d8cfb8';
  ctx.lineWidth = 1.4;
  rr(ctx, x + 2, y + 10 + bob * 0.2, 9, 8, 2); ctx.stroke();
  // Head and face.
  ctx.fillStyle = '#f0bd8f';
  ctx.beginPath(); ctx.arc(x, y - 21 + bob * 0.2, 15.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2320';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.arc(x + side * 5.6, y - 22 + bob * 0.2, 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#a96a3f';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y - 17.5 + bob * 0.2, 5.6, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.fillStyle = 'rgba(216,74,47,0.32)';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.arc(x + side * 10.5, y - 17 + bob * 0.2, 2.8, 0, Math.PI * 2); ctx.fill();
  }
  // A tall toque: band, dome and two side puffs.
  ctx.fillStyle = '#ffffff';
  rr(ctx, x - 14.5, y - 40 + bob * 0.2, 29, 8.5, 4); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 41 + bob * 0.2, 11.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 8, y - 39 + bob * 0.2, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 39 + bob * 0.2, 7.5, 0, Math.PI * 2); ctx.fill();
  // Neckerchief, knotted on the facing side.
  ctx.fillStyle = COLORS.red;
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 9);
  ctx.lineTo(x + chef.face * 13, y - 4);
  ctx.lineTo(x - 2, y + 1);
  ctx.closePath(); ctx.fill();
  // Whatever the chef carries rides overhead, both hands up.
  if (chef.carry) {
    const dish = DISHES[chef.carry];
    if (dish) drawDish(ctx, chef.carry, x, y - 62, 66);
    else drawItem(ctx, chef.carry, x, y - 60, 46);
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
    drawDish(ctx, main.dish, x + 36, y + 33, 54);
    if (main.done) text(ctx, '✓', x + 36, y + 33, 26, COLORS.teal);
    // The dish name owns the top row and shrinks to fit it; the price no longer
    // shares that row — it sits on the bottom row, so the two can never collide.
    let titleSize = 14.5;
    ctx.font = `700 ${titleSize}px ${FONT}`;
    while (ctx.measureText(DISHES[main.dish].name).width > 132 && titleSize > 10.5) {
      titleSize -= 0.5;
      ctx.font = `700 ${titleSize}px ${FONT}`;
    }
    text(ctx, DISHES[main.dish].name, x + 70, y + 19, titleSize, COLORS.ink, 'left');
    let lineY = y + 36;
    for (const line of ticket.items) {
      text(ctx, `${line.done ? '✓' : '•'} ${DISHES[line.dish].name} $${DISHES[line.dish].price}`, x + 70, lineY, 12, line.done ? COLORS.teal : '#6b5a44', 'left', false);
      lineY += 14.5;
    }
    // The bottom row: what the ticket pays on the left, the seconds left on the right.
    text(ctx, `$${ticket.price} + tip`, x + 10, y + h - 21, 12.5, COLORS.tealDark, 'left');
    text(ctx, `${Math.ceil(ticket.timeLeft)}s`, x + cardW - 8, y + h - 21, 11.5, frac <= 0.25 ? COLORS.red : '#6b5a44', 'right');
    // The timer you can feel: a bar that drains and reddens along the card's foot.
    ctx.fillStyle = '#e4d7bd';
    rr(ctx, x + 8, y + h - 13, cardW - 16, 7, 3.5); ctx.fill();
    ctx.fillStyle = frac > 0.5 ? COLORS.timerGood : frac > 0.25 ? COLORS.timerMid : COLORS.timerBad;
    if (frac > 0) { rr(ctx, x + 8, y + h - 13, (cardW - 16) * frac, 7, 3.5); ctx.fill(); }
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
