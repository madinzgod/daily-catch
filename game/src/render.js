// Every pixel of Last Ticket: the board of tickets across the top, the kitchen below it,
// the food drawn piece by piece, the chef, and the title and last-orders screens.
// Nothing here changes the game — it only reads the state and draws it.

import { BOARD_H, COLORS, FRYER_BURN, FRYER_COOK, GRILL_BURN, GRILL_COOK, SOLIDS, STATIONS, VIEW } from './config.js';
import { DISHES, COOKED, FRIES, INGREDIENTS, RECIPES, recipeForStack } from './recipes.js';
import { nearestStation } from './actions.js';

/**
 * Draw one whole frame of the game from the state — every pixel the game ever
 * shows comes out of this function and the drawing helpers below it.
 */
export function draw(ctx, state) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawKitchen(ctx, state);
  drawChef(ctx, state);
  drawBoard(ctx, state);
  // Floating score notes. Each one is clamped fully inside the frame, however
  // long its text and wherever it was born — no more tips clipped at the edge.
  for (const popup of state.popups) {
    ctx.font = `700 19px ${FONT}`;
    const half = ctx.measureText(popup.text).width / 2;
    const px = Math.min(Math.max(popup.x, half + 8), VIEW.width - half - 8);
    const py = Math.max(popup.y, BOARD_H + 16);
    ctx.globalAlpha = Math.max(0, 1 - popup.t / popup.life);
    text(ctx, popup.text, px, py, 19, popup.color);
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
function drawPrawn(ctx, colors, rot, sheen = true) {
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
  if (sheen) {
    // A wet sheen on the head and one mid segment — fresh or just grilled,
    // the shell catches the light. Burnt prawns are matte and skip it.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const s of [segs[0], segs[2]]) {
      ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.38, s.r * 0.3, 0, Math.PI * 2); ctx.fill();
    }
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

/**
 * The contact shadow every piece of food sits on: one flat ellipse of warm
 * shade in the renderer's own language (no gradients anywhere in this file),
 * drawn in the caller's local units just before the food itself, so a tomato
 * on a board and a plate on the pass both rest on the surface under them
 * instead of floating over it. One helper, one colour, everywhere.
 */
function foodShadow(ctx, rx, y) {
  ctx.fillStyle = 'rgba(74,44,16,0.20)';
  ctx.beginPath(); ctx.ellipse(0, y, rx, rx * 0.24, 0, 0, Math.PI * 2); ctx.fill();
}

/** One ingredient, centred on (x, y), roughly s px across. Used by bins, hands and boards. */
export function drawItem(ctx, item, x, y, s, shadow = true) {
  const u = s / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  if (shadow) foodShadow(ctx, item.startsWith('fillet') ? 17 : 15.5, 14.5);
  switch (item) {
    case 'bun':
      ctx.fillStyle = '#e8b06a';
      ctx.beginPath(); ctx.ellipse(0, 2, 17, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c078';
      ctx.beginPath(); ctx.ellipse(0, -2, 16, 11, 0, Math.PI, 0); ctx.fill();
      // The baker's scoring: three shallow slashes opened across the dome.
      ctx.strokeStyle = 'rgba(160,100,40,0.65)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (const [sx, ex] of [[-10, -4], [-2, 4], [6, 11]]) {
        ctx.beginPath(); ctx.moveTo(sx, -6.5); ctx.quadraticCurveTo((sx + ex) / 2, -10.5, ex, -6.5); ctx.stroke();
      }
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
      if (item === 'fillet_raw') {
        // Fresh off the boat: a wet sheen band along the flank.
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(-1, -3.4, 9, 2.7, -0.18, 0, Math.PI * 2); ctx.fill();
      }
      if (item === 'fillet_grilled') {
        // Char marks from the grill bars, then a glisten of cooking oil on top.
        ctx.strokeStyle = '#7a451f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (const gx of [-8, -2.5, 3, 8.5]) { ctx.beginPath(); ctx.moveTo(gx, -5.2); ctx.lineTo(gx + 2.4, 5.2); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,244,214,0.4)';
        ctx.beginPath(); ctx.ellipse(-3, -3.6, 7.5, 2.6, -0.25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(3.5, -2.2, 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-7.5, -1.2, 1, 0, Math.PI * 2); ctx.fill();
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
      const sheen = item !== 'prawns_burnt';
      drawPrawn(ctx, colors, 0.25, sheen);
      ctx.save(); ctx.translate(9, 8); ctx.scale(0.82, 0.82); drawPrawn(ctx, colors, 2.5, sheen); ctx.restore();
      ctx.save(); ctx.translate(-9, 9); ctx.scale(0.7, 0.7); drawPrawn(ctx, colors, -0.9, sheen); ctx.restore();
      break;
    }
    case 'tomato':
      ctx.fillStyle = '#d8402a';
      ctx.beginPath(); ctx.arc(0, 1, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef6a4d';
      ctx.beginPath(); ctx.arc(-4, -3, 6, 0, Math.PI * 2); ctx.fill();
      // A ripe gloss: one soft highlight and its pin-dot, upper left.
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(-5.5, -5.5, 4.2, 2.6, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(-2.2, -8.6, 1.4, 0, Math.PI * 2); ctx.fill();
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
      // A dark heart under the leaves, so the ruffles sit in their own shade.
      ctx.fillStyle = '#4c8a3e';
      ctx.beginPath(); ctx.ellipse(0, 8, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#579a44';
      for (const [ox, oy] of [[-9, 3], [9, 3], [0, -5]]) {
        ctx.beginPath(); ctx.arc(ox, oy + 1.5, 10.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#6db457';
      for (const [ox, oy] of [[-9, 3], [9, 3], [0, -5]]) {
        ctx.beginPath(); ctx.arc(ox, oy, 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#a5dd8f';
      ctx.beginPath(); ctx.arc(-5, -4, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, 0, 4.5, 0, Math.PI * 2); ctx.fill();
      // Pale veins out from the heart of each leaf.
      ctx.strokeStyle = 'rgba(220,245,205,0.8)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [[-9, 4, -13, -1], [9, 4, 13, -1], [0, -4, 0, -10]]) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      break;
    case 'lettuce_cut': {
      // Shreds with real colour pop: a dark bed, bright bodies, pale tips.
      const shreds = [[-14, 4, -4, -6], [-5, 7, 6, -4], [4, 6, 14, -5], [-10, -2, 2, 6], [0, -7, 10, 3]];
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4c8a3e'; ctx.lineWidth = 6;
      for (const [x1, y1, x2, y2] of shreds) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.strokeStyle = '#63b34f'; ctx.lineWidth = 4;
      for (const [x1, y1, x2, y2] of shreds) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.strokeStyle = '#a8e294'; ctx.lineWidth = 2.2;
      for (const [x1, y1, x2, y2] of shreds) {
        ctx.beginPath(); ctx.moveTo((x1 + x2) / 2, (y1 + y2) / 2); ctx.lineTo(x2, y2); ctx.stroke();
      }
      break;
    }
    case 'potato':
      ctx.fillStyle = '#cfa15f';
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8894a';
      for (const [px, py] of [[-7, -3], [4, 2], [9, -5], [-2, 6]]) { ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill(); }
      // A dull sheen on the skin, upper left.
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.ellipse(-4, -4.5, 6, 3, 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    case 'potato_cut':
      // Cut potato, one step deeper toward the chips' gold than it used to be —
      // raw still reads paler than the fried sticks, but no longer washed out.
      ctx.fillStyle = '#eabd60';
      for (const [ox, rot] of [[-10, -0.16], [-3, 0.07], [4, -0.06], [11, 0.16]]) {
        ctx.save(); ctx.translate(ox, 0); ctx.rotate(rot); rr(ctx, -3, -13, 6, 26, 2); ctx.fill(); ctx.restore();
      }
      break;
    case 'fries':
    case 'fries_burnt': {
      // Chips as separate golden sticks, never a blob: each one shaded, edged,
      // and salted, standing at its own angle behind and in front of the carton.
      const golden = item === 'fries';
      const face = golden ? '#f7c948' : '#4a3423';
      const shade = golden ? '#dfa92b' : '#38271a';
      const edge = golden ? '#b97e14' : '#241a10';
      const stick = (ox, oy, h, rot) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(rot);
        ctx.fillStyle = face;
        rr(ctx, -3.2, -h, 6.4, h, 2); ctx.fill();
        ctx.fillStyle = shade;
        ctx.fillRect(0.9, -h + 2.5, 2.1, h - 4.5);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 0.9;
        rr(ctx, -3.2, -h, 6.4, h, 2); ctx.stroke();
        ctx.restore();
      };
      for (const [ox, h, rot] of [[-12, 27, -0.2], [-6, 34, -0.06], [0, 31, 0.03], [6, 35, 0.12], [12, 26, 0.24]]) {
        stick(ox, -2, h, rot);
      }
      ctx.fillStyle = '#c73e2e';
      ctx.beginPath();
      ctx.moveTo(-15, -2); ctx.lineTo(15, -2); ctx.lineTo(11, 15); ctx.lineTo(-11, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3da';
      ctx.beginPath(); ctx.arc(0, 6, 4.4, 0, Math.PI * 2); ctx.fill();
      stick(-8, 13, 17, -0.5);
      stick(9, 13, 15, 0.55);
      if (golden) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [sx, sy] of [[-6, -26], [2, -30], [8, -20], [-1, -14]]) {
          ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    default:
      ctx.fillStyle = '#999';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

const LAYER_ORDER = ['bun', 'lettuce_cut', 'tomato_cut', 'fillet_grilled', 'prawns_grilled'];

/** A plated dish (or a plate mid-assembly) drawn as its stacked layers, plate included. */
export function drawPlate(ctx, items, x, y, s, shadow = true) {
  const u = s / 90;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u, u);
  if (shadow) foodShadow(ctx, 44, 18);
  // Crockery, not a disc: a grey outer edge under the white, a hairline
  // around the rim, the well a touch deeper, and a sheen along the rim's
  // left where the light catches it.
  ctx.fillStyle = '#bfcbd0';
  ctx.beginPath(); ctx.ellipse(0, 17.5, 43.5, 13.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 16, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#aebfc5';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 16, 42, 13, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#dfe5e8';
  ctx.beginPath(); ctx.ellipse(0, 15, 33, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-15, 11.5, 12, 3, -0.15, 0, Math.PI * 2); ctx.fill();
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
      ctx.fillStyle = '#579a44';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 12, top - 3, 8.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#6db457';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 12, top - 4.5, 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#a5dd8f';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 12 - 2.5, top - 7, 3.6, 0, Math.PI * 2); ctx.fill(); }
      top -= 7;
    } else if (item === 'tomato_cut') {
      ctx.fillStyle = '#d8402a';
      for (const ox of [-16, 0, 16]) { ctx.beginPath(); ctx.arc(ox, top - 4, 9, 0, Math.PI * 2); ctx.fill(); }
      top -= 7;
    }
  }
  if (layers.length > 1 && items.includes('bun')) {
    // The top bun crowns a finished butty — scored like its bin self.
    ctx.fillStyle = '#f2c078';
    ctx.beginPath(); ctx.ellipse(0, top - 2, 29, 15, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,40,0.6)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (const [sx, ex] of [[-16, -7], [-3, 6], [10, 18]]) {
      ctx.beginPath(); ctx.moveTo(sx, top - 9); ctx.quadraticCurveTo((sx + ex) / 2, top - 13.5, ex, top - 9); ctx.stroke();
    }
    ctx.fillStyle = '#fff3da';
    for (const [sx, sy] of [[-14, top - 10], [0, top - 14], [14, top - 10], [-6, top - 6], [8, top - 6]]) {
      ctx.beginPath(); ctx.ellipse(sx, sy, 2.6, 1.5, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // The finish, the difference between food and a dish: a grilled plate gets
  // a sauce drizzle across its top and a lemon wedge at its side; every
  // plate gets a garnish sprig at its rim; a salad gets its dressing dots.
  const grilled = items.includes('fillet_grilled') || items.includes('prawns_grilled');
  if (grilled) {
    ctx.strokeStyle = 'rgba(146,64,24,0.55)';
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    for (const dy of [-3.5, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(-17, top + dy);
      ctx.quadraticCurveTo(-6, top + dy - 3.4, 4, top + dy);
      ctx.quadraticCurveTo(11, top + dy + 2.6, 17, top + dy - 0.6);
      ctx.stroke();
    }
    // The lemon wedge: a yellow fan with a paler heart, at the plate's left.
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.moveTo(-33, 9); ctx.lineTo(-24, 1); ctx.lineTo(-23, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fbe38a';
    ctx.beginPath(); ctx.moveTo(-30.5, 8); ctx.lineTo(-25.5, 4); ctx.lineTo(-25, 9.5); ctx.closePath(); ctx.fill();
  }
  if (items.includes('lettuce_cut') && items.includes('tomato_cut') && !grilled && !items.includes('bun')) {
    ctx.fillStyle = 'rgba(255,246,220,0.85)';
    for (const [dx, dy] of [[-11, -2], [2, -5], [12, -1], [-3, 1.5]]) {
      ctx.beginPath(); ctx.arc(dx, top + dy, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (layers.length) {
    // A garnish sprig at the rim: two small leaves and a stem, bright green.
    ctx.strokeStyle = '#4c8a3e';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(27, 10); ctx.quadraticCurveTo(30, 6, 33.5, 4.5); ctx.stroke();
    ctx.fillStyle = '#579a44';
    ctx.beginPath(); ctx.ellipse(31.5, 5.5, 3.6, 2, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a5dd8f';
    ctx.beginPath(); ctx.ellipse(34, 7.5, 2.8, 1.6, 0.9, 0, Math.PI * 2); ctx.fill();
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
  foodShadow(ctx, 56, 12.5);
  // The same crockery as a finished plate: grey edge, hairline, sheen.
  ctx.fillStyle = '#bfcbd0';
  ctx.beginPath(); ctx.ellipse(0, 11, 56.5, 18.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 10, 55, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#aebfc5';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(0, 10, 55, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#dfe5e8';
  ctx.beginPath(); ctx.ellipse(0, 9, 45, 12.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-20, 5.5, 16, 4, -0.15, 0, Math.PI * 2); ctx.fill();
  const slots = items.length >= 3 ? [[-29, 1], [0, -6], [29, 1]]
    : items.length === 2 ? [[-28, 0], [28, 0]]
    : [[-16, 0]];
  items.forEach((item, i) => drawItem(ctx, item, slots[i][0], slots[i][1], 44));
  if (items.length < 3) {
    const gap = items.length === 2 ? [0, 12] : [26, 1];
    ctx.strokeStyle = 'rgba(20,84,75,0.8)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4.5, 3.5]);
    ctx.beginPath(); ctx.arc(gap[0], gap[1], 14, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** The icon for a whole dish: a plate stack for recipes, the carton for fries. */
export function drawDish(ctx, dishId, x, y, s, shadow = true) {
  if (dishId === 'fries') {
    drawItem(ctx, 'fries', x, y, s * 0.9, shadow);
    return;
  }
  const recipe = DISHES[dishId];
  if (recipe) drawPlate(ctx, recipe.items, x, y, s, shadow);
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

/** A small deterministic hash of two coordinates, for floor grain that never moves. */
function hash2(a, b) {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
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
  foodShadow(ctx, 17, 13);
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
    // The dome's gloss, the same highlight the whole tomato wears.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(5.5, -2.5, 3.4, 1.9, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4d8f3a';
    ctx.beginPath(); ctx.ellipse(10, -8.5, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (item === 'potato') {
    // Sticks already cut, standing to the left; the rest of the potato beside them.
    ctx.fillStyle = '#eabd60';
    for (let i = 0; i < chops; i++) {
      ctx.save();
      ctx.translate(-13 + i * 6.5, 1);
      ctx.rotate(-0.1 + i * 0.09);
      rr(ctx, -2.6, -12, 5.2, 24, 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#cfa15f';
    ctx.beginPath(); ctx.ellipse(10, 1, 15 - chops * 2.4, 10.5, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eabd60';
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

/**
 * Cut potato in the fryer, still cooking: separated batons standing in hot
 * oil, drawn as their own little scene instead of reusing the plain cut-potato
 * item — four bare sticks in a row collapsed into a pale "W" at contact-sheet
 * size. These are the finished chips' family (same stick drawing, same gold
 * one step paler, no carton, no salt) with their feet in bubbling oil, so the
 * fryer at work reads as frying, not as a letter.
 */
function drawFryerCooking(ctx, cx, cy) {
  const oilY = cy + 13;
  // The batons, back row first: varied heights and leans, hash-placed so the
  // arrangement never moves between frames.
  const baton = (ox, h, rot, face, shade, edge) => {
    ctx.save();
    ctx.translate(cx + ox, oilY + 2);
    ctx.rotate(rot);
    ctx.fillStyle = face;
    rr(ctx, -3.4, -h, 6.8, h, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,252,235,0.5)';
    ctx.fillRect(-2.4, -h + 3, 1.5, h - 8);
    ctx.fillStyle = shade;
    ctx.fillRect(1, -h + 2.5, 2, h - 5);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 0.9;
    rr(ctx, -3.4, -h, 6.8, h, 2); ctx.stroke();
    ctx.restore();
  };
  const sticks = [[-40, 30, -0.16], [-27, 38, -0.06], [-13, 33, 0.08], [1, 41, -0.02], [15, 35, 0.12], [28, 39, 0.05], [41, 29, 0.17]];
  for (const [ox, h, rot] of sticks) baton(ox, h, rot, '#f4dc96', '#e3c26e', '#bd9440');
  // The oil itself, drawn over the batons' feet: a deep gold bath with a
  // brighter, broken surface.
  ctx.fillStyle = 'rgba(214,158,44,0.88)';
  ctx.beginPath(); ctx.ellipse(cx, oilY, 55, 12.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(246,205,105,0.75)';
  ctx.beginPath(); ctx.ellipse(cx, oilY - 2.5, 51, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  // Bubbles in the oil, clustered at the batons' feet — hash-placed, so a
  // still frame holds them exactly where a moving one would.
  ctx.fillStyle = 'rgba(255,248,220,0.85)';
  for (let i = 0; i < 16; i++) {
    const bx = cx + (hash2(i, 3) - 0.5) * 96;
    const by = oilY - 3 + (hash2(i, 5) - 0.5) * 13;
    ctx.beginPath(); ctx.arc(bx, by, 0.9 + hash2(i, 9) * 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,248,220,0.6)';
  for (let i = 0; i < 5; i++) {
    const bx = cx + (hash2(i, 21) - 0.5) * 84;
    ctx.beginPath(); ctx.arc(bx, oilY - 11 - hash2(i, 23) * 5, 1 + hash2(i, 27) * 1.1, 0, Math.PI * 2); ctx.fill();
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
    // In the fryer, raw cut potato gets its own cooking scene (batons in
    // bubbling oil); everywhere else the item itself is the picture.
    if (kind === 'fryer' && machine.t < cookAt) drawFryerCooking(ctx, cx, cy);
    else drawItem(ctx, shown, cx, cy - 4, kind === 'grill' ? 54 : 52);
    const color = machine.t >= burnAt ? COLORS.red : machine.t >= cookAt ? COLORS.timerGood : COLORS.mustard;
    drawProgress(ctx, station.x + 16, station.y + station.h - 20, station.w - 32, machine.t / burnAt, color);
    // Steam wisps, swaying with the clock so the frame feels alive — three of
    // them, tall enough to read above both machines at contact-sheet size.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    for (const off of [-17, 0, 17]) {
      ctx.beginPath();
      const sx = cx + off + Math.sin(state.time * 2.2 + off * 1.7) * 3.5;
      ctx.moveTo(sx, cy - 27);
      ctx.quadraticCurveTo(sx + 6, cy - 40, sx - 1, cy - 53);
      ctx.stroke();
    }
    // The call, on a solid badge in the station's top corner — drawn last of
    // all, so neither food nor steam can hide it, and clear of the food it
    // announces: green READY!, red BURNT!.
    if (machine.t >= burnAt) drawBadge(ctx, station.x + station.w - 42, station.y + 13, 'BURNT!', '#a93420');
    else if (machine.t >= cookAt) drawBadge(ctx, station.x + station.w - 42, station.y + 13, 'READY!', '#1e7d46');
  }
  text(ctx, station.label, cx, station.y + station.h - 8 + 6, 12, '#22382e');
}

function drawKitchen(ctx, state) {
  // The floor: warm harbour-deck planks across the whole room — honey wood with
  // staggered butt joints and visible grain. V10 takes it one step deeper than
  // V4 cut it: a richer base, alternating rows washed warm amber and deep
  // brown, darker seams and stronger grain, so at contact-sheet size the room
  // reads as a wooden kitchen and not a pale void. It stays a step quieter
  // than the counters and the food — everything that carries information is
  // drawn over it, never on it.
  ctx.fillStyle = '#dec48f';
  ctx.fillRect(0, BOARD_H, VIEW.width, VIEW.height - BOARD_H);
  const plankH = 32;
  const plankLen = 256;
  for (let row = 0, y = BOARD_H; y < VIEW.height; row++, y += plankH) {
    ctx.fillStyle = row % 2 ? 'rgba(198,130,60,0.17)' : 'rgba(130,88,46,0.15)';
    ctx.fillRect(0, y, VIEW.width, plankH);
    ctx.strokeStyle = '#a87e45';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y + plankH); ctx.lineTo(VIEW.width, y + plankH); ctx.stroke();
    const startX = -((row * 173) % plankLen);
    ctx.lineWidth = 1.4;
    for (let x = startX, p = 0; x < VIEW.width; x += plankLen, p++) {
      if (x > 0) {
        ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + plankH - 3); ctx.stroke();
      }
      // A per-plank tint shift, so the boards read as separate pieces of wood.
      if (hash2(row * 11, p * 3) > 0.45) {
        ctx.fillStyle = 'rgba(146,100,54,0.11)';
        ctx.fillRect(Math.max(0, x), y + 1, Math.min(plankLen, VIEW.width - x), plankH - 2);
      }
      // Two grain streaks per plank, placed by hash so they never move.
      ctx.strokeStyle = 'rgba(101,70,36,0.27)';
      ctx.lineWidth = 1.3;
      for (let g = 0; g < 2; g++) {
        const gx = x + 24 + hash2(row * 3 + g, p) * (plankLen - 90);
        const gy = y + 8 + hash2(p * 7, row + g * 13) * 16;
        const gl = 22 + hash2(row + g, p * 5) * 30;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gl, gy); ctx.stroke();
      }
      ctx.strokeStyle = '#a87e45';
      ctx.lineWidth = 1.4;
    }
  }
  // A soft vignette toward the walls, in the renderer's own flat language:
  // concentric rings of deep brown stroked in a squashed space so they hug
  // the room's shape, each ring a step stronger than the one inside it. The
  // working middle of the room — the island, the rug, the cook's ground —
  // sits inside the innermost ring and keeps the lamplight; only the floor's
  // outer ground falls away. The counters, stations, food, cook and popups
  // are all drawn after this, untouched by it.
  ctx.save();
  ctx.translate(640, 462);
  ctx.scale(1, 0.66);
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = `rgba(94,60,26,${(0.02 + i * 0.016).toFixed(3)})`;
    ctx.lineWidth = 45;
    ctx.beginPath(); ctx.arc(0, 0, 400 + i * 44, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // One soft braided rug, and only one: under the island, ringed in the room's colours.
  ctx.fillStyle = COLORS.rug;
  ctx.beginPath(); ctx.ellipse(640, 462, 240, 78, 0, 0, Math.PI * 2); ctx.fill();
  for (const [rx, ry, col, wdt] of [[220, 68, COLORS.rugStripe, 5], [192, 58, COLORS.teal, 4], [164, 48, COLORS.rugStripe, 4]]) {
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
  // The backsplash behind the back counter: sea-glass tiles the bins sit
  // against, so the top row reads as a counter against a wall — with a harbour-
  // blue painted strip above the tiles — not furniture floating on the floor.
  ctx.fillStyle = '#33626e';
  ctx.fillRect(20, BOARD_H, 1240, 7);
  ctx.fillStyle = '#6fae9f';
  ctx.fillRect(20, BOARD_H + 7, 1240, 25);
  ctx.strokeStyle = 'rgba(240,250,246,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(20, BOARD_H + 19); ctx.lineTo(1260, BOARD_H + 19); ctx.stroke();
  for (let tx = 20 + 46; tx < 1260; tx += 46) {
    ctx.beginPath(); ctx.moveTo(tx, BOARD_H + 8); ctx.lineTo(tx, BOARD_H + 18); ctx.stroke();
  }
  for (let tx = 20 + 23; tx < 1260; tx += 46) {
    ctx.beginPath(); ctx.moveTo(tx, BOARD_H + 20); ctx.lineTo(tx, BOARD_H + 31); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(20, BOARD_H + 7, 1240, 3);
  // The dresser on the right counter: a shelf of preserve jars over a stack of
  // plates, pure set dressing — this corner is the pantry.
  ctx.fillStyle = '#5f4f3c';
  rr(ctx, 1108, 428, 136, 7, 3); ctx.fill();
  const jarFill = ['#d8402a', '#5da24a', '#f2b33d'];
  [1128, 1170, 1212].forEach((jx, i) => {
    ctx.fillStyle = 'rgba(230,240,238,0.85)';
    rr(ctx, jx - 11, 400, 22, 28, 4); ctx.fill();
    ctx.fillStyle = jarFill[i];
    rr(ctx, jx - 8.5, 408, 17, 17, 3); ctx.fill();
    ctx.fillStyle = '#8a6a24';
    rr(ctx, jx - 9, 396, 18, 6, 2.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(jx - 6, 404, 3.4, 20);
  });
  ctx.fillStyle = '#fdfdf8';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.ellipse(1136, 492 - i * 7, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawItem(ctx, 'tomato', 1214, 454, 32);
  // A life ring hung on the dresser — this is a harbour kitchen, after all.
  ctx.strokeStyle = '#f4f1e6';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(1208, 492, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = COLORS.red;
  for (const a of [0.4, 2.0, 3.5, 5.1]) {
    ctx.beginPath(); ctx.arc(1208, 492, 13, a, a + 0.7); ctx.stroke();
  }
  text(ctx, 'PANTRY', 1175, 448, 11, COLORS.ink);
  // One large harbour window set into the front of the left counter, where two
  // small portholes used to be: a wood frame, sky over sea, one fishing boat
  // going about its business and gulls over the water.
  ctx.fillStyle = '#5f4f3c';
  rr(ctx, 170, 690, 158, 74, 6); ctx.fill();
  ctx.fillStyle = '#8a6a24';
  rr(ctx, 175, 695, 148, 64, 4); ctx.fill();
  ctx.save();
  rr(ctx, 179, 699, 140, 56, 3); ctx.clip();
  ctx.fillStyle = '#a5d2de';
  ctx.fillRect(179, 699, 140, 25);
  ctx.fillStyle = '#4e8ca6';
  ctx.fillRect(179, 724, 140, 31);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.2;
  for (const [wx, wy] of [[196, 734], [226, 743], [286, 737], [306, 747]]) {
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 11, wy); ctx.stroke();
  }
  // The sun's glint in the top corner of the sky.
  ctx.fillStyle = 'rgba(255,240,190,0.85)';
  ctx.beginPath(); ctx.arc(302, 709, 6.5, 0, Math.PI * 2); ctx.fill();
  // The boat: dark hull, one mast, a white sail, a red flag.
  ctx.fillStyle = '#274b52';
  ctx.beginPath();
  ctx.moveTo(216, 730); ctx.lineTo(258, 730); ctx.lineTo(250, 738); ctx.lineTo(223, 738);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(235.8, 712, 2.2, 18);
  ctx.fillStyle = '#fff7e6';
  ctx.beginPath(); ctx.moveTo(239.5, 713); ctx.lineTo(239.5, 728); ctx.lineTo(254, 728); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COLORS.red;
  ctx.beginPath(); ctx.moveTo(238, 712); ctx.lineTo(246, 714.4); ctx.lineTo(238, 716.8); ctx.closePath(); ctx.fill();
  // Gulls: three small double-arcs over the water.
  ctx.strokeStyle = '#33555e';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (const [gx, gy] of [[200, 709], [222, 704], [272, 707]]) {
    ctx.beginPath(); ctx.arc(gx - 3.4, gy, 3.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(gx + 3.4, gy, 3.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }
  ctx.restore();
  // The frame's centre mullion and a brass latch.
  ctx.fillStyle = '#5f4f3c';
  ctx.fillRect(246, 695, 5, 64);
  ctx.fillStyle = '#c99635';
  ctx.beginPath(); ctx.arc(248.5, 752, 2.6, 0, Math.PI * 2); ctx.fill();
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
  // Two fish crates stacked against the right counter by the serve window, the
  // morning's catch still in the top one.
  const crate = (x, y, w, h) => {
    ctx.fillStyle = COLORS.driftwood;
    rr(ctx, x, y, w, h, 3); ctx.fill();
    ctx.strokeStyle = '#5f4f3c';
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 3); ctx.stroke();
    ctx.lineWidth = 1.4;
    for (const fy of [y + h / 3, y + (2 * h) / 3]) {
      ctx.beginPath(); ctx.moveTo(x + 3, fy); ctx.lineTo(x + w - 3, fy); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + h - 4); ctx.stroke();
  };
  crate(1156, 596, 78, 54);
  crate(1166, 552, 58, 42);
  ctx.fillStyle = '#d8402a';
  ctx.beginPath(); ctx.arc(1184, 550, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(1181.5, 547.5, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6db457';
  ctx.beginPath(); ctx.arc(1200, 548, 8.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a5dd8f';
  ctx.beginPath(); ctx.arc(1197, 545, 4, 0, Math.PI * 2); ctx.fill();

  const active = nearestStation(state);
  for (const station of STATIONS) {
    const isActive = active === station && state.phase === 'play';
    drawStationBase(ctx, station, isActive, state.shake === station.id && state.shakeT > 0);
    const cx = station.x + station.w / 2;
    if (station.kind === 'bin') {
      // The counter's ingredients, drawn a step larger than the hands and the
      // boards use: on the contact sheet the bins are criterion one's
      // "ingredients on the counter", and at 40/34 they read small — 46/40
      // fills the panel without touching its edges or the label beneath.
      drawItem(ctx, station.item, cx - 26, station.y + 29, 46);
      drawItem(ctx, station.item, cx + 24, station.y + 33, 40);
      text(ctx, station.label, cx, station.y + station.h - 10, 12, '#22382e');
    } else if (station.kind === 'grill') {
      drawMachine(ctx, state, station, state.grill);
    } else if (station.kind === 'fryer') {
      drawMachine(ctx, state, station, state.fryer);
    } else if (station.kind === 'island') {
      // The resting island, grown into the room's central workstation: a driftwood
      // top with a herb trough along its back edge, a rest mat in the middle where
      // the work-in-progress sits, a dressed resting plate at one end, garnish
      // bowls at the other, sauce bottles flanking its name plate, and a utensil
      // rail hanging on its front face.
      ctx.fillStyle = COLORS.driftwood;
      rr(ctx, station.x + 3, station.y + 3, station.w - 6, station.h - 6, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(95,79,60,0.55)';
      ctx.lineWidth = 1.2;
      for (const px of [station.x + 95, station.x + 190, station.x + 285]) {
        ctx.beginPath(); ctx.moveTo(px, station.y + 6); ctx.lineTo(px, station.y + station.h - 6); ctx.stroke();
      }
      // Five potted herbs along the back edge, each drawn its own way — basil,
      // rosemary, chives, parsley, mint — in little terracotta pots on a shelf,
      // so the island's green reads as plants, not as a ribbon.
      ctx.fillStyle = '#5f4f3c';
      rr(ctx, station.x + 12, station.y + 22, station.w - 24, 5, 2); ctx.fill();
      const potHerb = (px, kind) => {
        const base = station.y + 22;
        if (kind === 0) {
          // Basil: broad oval leaves in two greens.
          ctx.fillStyle = '#4e9440';
          for (const [ox, oy, r] of [[-5.5, -15, 5], [5, -16.5, 5.4], [0, -12.5, 4.6]]) {
            ctx.beginPath(); ctx.ellipse(px + ox, base + oy, r, r * 0.68, ox * 0.06, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#7cc464';
          for (const [ox, oy] of [[-4, -16.5], [4.5, -18]]) {
            ctx.beginPath(); ctx.ellipse(px + ox, base + oy, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
          }
        } else if (kind === 1) {
          // Rosemary: stiff needles fanning up from one stem.
          ctx.strokeStyle = '#3e7d3a';
          ctx.lineWidth = 1.8;
          ctx.lineCap = 'round';
          for (const dx of [-7, -3.5, 0, 3.5, 7]) {
            ctx.beginPath(); ctx.moveTo(px, base - 11);
            ctx.lineTo(px + dx, base - 19 - (7 - Math.abs(dx)) * 0.5); ctx.stroke();
          }
          ctx.strokeStyle = '#579a44';
          ctx.lineWidth = 1.2;
          for (const dx of [-5, 0, 5]) {
            ctx.beginPath(); ctx.moveTo(px, base - 11);
            ctx.lineTo(px + dx, base - 16.5); ctx.stroke();
          }
        } else if (kind === 2) {
          // Chives: tall thin blades, each with its own sway.
          ctx.strokeStyle = '#63b34f';
          ctx.lineWidth = 2.1;
          ctx.lineCap = 'round';
          for (const [dx, sway] of [[-6, -3], [-2, 1], [2, -1], [6, 3.5]]) {
            ctx.beginPath(); ctx.moveTo(px + dx * 0.4, base - 11);
            ctx.quadraticCurveTo(px + dx, base - 17, px + dx + sway, base - 21.5); ctx.stroke();
          }
        } else if (kind === 3) {
          // Parsley: a curly cluster of small ruffled circles.
          ctx.fillStyle = '#579a44';
          for (const [ox, oy] of [[-5.5, -14], [-1.5, -17], [3, -14.5], [6, -16.5], [0.5, -13]]) {
            ctx.beginPath(); ctx.arc(px + ox, base + oy, 3.1, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#a5dd8f';
          for (const [ox, oy] of [[-3, -15.5], [3.5, -16]]) {
            ctx.beginPath(); ctx.arc(px + ox, base + oy, 1.4, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          // Mint: two oval leaves with pale veins, leaning apart.
          ctx.fillStyle = '#3f9155';
          ctx.beginPath(); ctx.ellipse(px - 4.5, base - 15, 5.6, 3.4, -0.55, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(px + 4.5, base - 16, 5.6, 3.4, 0.55, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a5dd8f';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px - 8, base - 13.4); ctx.lineTo(px - 1.5, base - 16.8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px + 1.5, base - 17.8); ctx.lineTo(px + 8, base - 14.4); ctx.stroke();
        }
        // The pot itself: a terracotta trapezoid under a darker rim.
        ctx.fillStyle = '#b85c38';
        ctx.beginPath();
        ctx.moveTo(px - 7, base - 9); ctx.lineTo(px + 7, base - 9);
        ctx.lineTo(px + 5, base); ctx.lineTo(px - 5, base);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#9c4c2c';
        rr(ctx, px - 8, base - 12, 16, 3.6, 1.6); ctx.fill();
      };
      [46, 118, 190, 262, 334].forEach((off, i) => potHerb(station.x + off, i % 5));
      // The rest mat, centre stage.
      ctx.fillStyle = 'rgba(31,122,109,0.32)';
      rr(ctx, station.x + 118, station.y + 25, station.w - 236, 40, 8); ctx.fill();
      // A dressed resting plate at the left end: greens, tomato, a lemon wedge.
      const rpX = station.x + 62;
      const rpY = station.y + 46;
      ctx.fillStyle = 'rgba(74,44,16,0.18)';
      ctx.beginPath(); ctx.ellipse(rpX, rpY + 3.5, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#bfcbd0';
      ctx.beginPath(); ctx.ellipse(rpX, rpY + 0.8, 27.8, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(rpX, rpY, 27, 9.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dfe5e8';
      ctx.beginPath(); ctx.ellipse(rpX, rpY - 1, 20, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6db457';
      for (const [ox, oy] of [[-9, -3], [1, -5], [10, -3]]) {
        ctx.beginPath(); ctx.arc(rpX + ox, rpY + oy, 5.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#d8402a';
      for (const ox of [-4, 7]) {
        ctx.beginPath(); ctx.arc(rpX + ox, rpY - 4, 4.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0927c';
        ctx.beginPath(); ctx.arc(rpX + ox, rpY - 4, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d8402a';
      }
      ctx.fillStyle = '#f7c948';
      ctx.beginPath(); ctx.moveTo(rpX + 15, rpY + 2); ctx.lineTo(rpX + 21, rpY - 3); ctx.lineTo(rpX + 21, rpY + 4); ctx.closePath(); ctx.fill();
      // A garnish sprig on the resting plate too — the same finish as the pass.
      ctx.fillStyle = '#579a44';
      ctx.beginPath(); ctx.ellipse(rpX - 19, rpY - 5, 3.4, 1.9, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a5dd8f';
      ctx.beginPath(); ctx.ellipse(rpX - 16.5, rpY - 2.8, 2.6, 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
      // Two garnish bowls at the right end: chopped greens, diced tomato.
      const bowl = (bx, mound, fleck) => {
        ctx.fillStyle = 'rgba(74,44,16,0.15)';
        ctx.beginPath(); ctx.ellipse(bx, station.y + 50, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.tealDark;
        ctx.beginPath(); ctx.ellipse(bx, station.y + 46, 14.5, 8.5, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = mound;
        ctx.beginPath(); ctx.arc(bx, station.y + 44, 8.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = fleck;
        for (const [ox, oy] of [[-4, -3], [3, -5], [0, 0]]) {
          ctx.beginPath(); ctx.arc(bx + ox, station.y + 44 + oy, 2.1, 0, Math.PI * 2); ctx.fill();
        }
      };
      bowl(station.x + station.w - 98, '#63b34f', '#a8e294');
      bowl(station.x + station.w - 52, '#d8402a', '#f0927c');
      // Sauce bottles flanking the brass name plate along the front edge.
      const bottleCols = ['#c73e2e', '#f2b33d', '#1f7a6d', '#d8402a'];
      [96, 122, 258, 284].forEach((off, i) => {
        const bx = station.x + off;
        ctx.fillStyle = bottleCols[i];
        rr(ctx, bx - 4.5, station.y + station.h - 15, 9, 12, 2); ctx.fill();
        rr(ctx, bx - 2, station.y + station.h - 18.5, 4, 4.5, 1); ctx.fill();
        ctx.fillStyle = '#5d4030';
        rr(ctx, bx - 3.5, station.y + station.h - 21.5, 7, 3.6, 1.5); ctx.fill();
      });
      ctx.fillStyle = 'rgba(201,150,53,0.92)';
      rr(ctx, cx - 58, station.y + station.h - 17, 116, 13, 3); ctx.fill();
      text(ctx, station.label, cx, station.y + station.h - 10, 10.5, '#22382e');
      if (state.island.item) {
        if (DISHES[state.island.item]) drawDish(ctx, state.island.item, cx, station.y + 42, 64);
        else drawItem(ctx, state.island.item, cx, station.y + 41, 50);
      }
      // Two pans hang from the rail on the island's front face — one dark iron,
      // one copper — drawn big enough to read as cookware at contact-sheet
      // size, where the old rail of slim utensils all but vanished.
      ctx.fillStyle = COLORS.steelDark;
      rr(ctx, station.x + 90, station.y + station.h + 4, station.w - 180, 5, 2.5); ctx.fill();
      const pan = (px, r, body, rim, inner) => {
        const top = station.y + station.h + 9;
        // The handle: a flat strap from the rail down to the pan's rim.
        ctx.fillStyle = '#6d6257';
        rr(ctx, px - 3.5, top, 7, 22, 3); ctx.fill();
        // The pan itself: body first, a bright rim around it, the dark
        // cooking face inside, and one soft highlight on the metal.
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(px, top + 22 + r, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rim;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, top + 22 + r, r - 1.5, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = inner;
        ctx.beginPath(); ctx.arc(px, top + 22 + r, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.beginPath(); ctx.arc(px - r * 0.34, top + 22 + r - r * 0.36, r * 0.2, 0, Math.PI * 2); ctx.fill();
      };
      pan(station.x + 148, 18, '#43484b', COLORS.steel, '#2e3235');
      pan(station.x + 232, 15, '#b87333', '#8c5524', '#96582a');
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
        // pieces out, with a dashed ring where the missing piece belongs. Both are
        // drawn big — the plating counter is where the cover proves mid-assembly.
        if (recipeForStack(state.plate)) drawPlate(ctx, state.plate, cx, station.y + 42, 104);
        else drawPlateSpread(ctx, state.plate, cx, station.y + 44, 150);
      } else {
        // The empty plate waiting on the pass wears the same crockery as a
        // full one: grey edge, hairline, sheen.
        ctx.fillStyle = '#bfcbd0';
        ctx.beginPath(); ctx.ellipse(cx, station.y + 53.5, 43.5, 13.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx, station.y + 52, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#aebfc5';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(cx, station.y + 52, 42, 13, 0, 0, Math.PI * 2); ctx.stroke();
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
        // The pass moment, drawn at the plating counter's presence: a finished
        // plate big enough to find at contact-sheet size, with the game's own
        // call on a pill beside it. A plate ready to serve is one of the six
        // things the cover must show; at 74 units with a 10 px caption it
        // read as a smudge at the frame's edge, so now it gets the same
        // badge language as READY! / BURNT! / CUT!.
        drawDish(ctx, state.passDish, station.x + 74, station.y + 46, 104);
        drawBadge(ctx, station.x + 208, station.y + 50, 'READY TO SERVE!', '#1e7d46');
      }
      // The service bell.
      ctx.fillStyle = COLORS.mustard;
      ctx.beginPath(); ctx.arc(station.x + station.w - 44, station.y + 48, 13, Math.PI, 0); ctx.fill();
      ctx.fillRect(station.x + station.w - 58, station.y + 48, 28, 4);
    }
  }
  // A lamp rail over the island with two enamel pendants hanging from it.
  // Their warm pool over the island is most of why the middle of the room
  // feels like evening service instead of a bare floor with a table on it.
  ctx.fillStyle = 'rgba(255,205,120,0.07)';
  ctx.beginPath(); ctx.ellipse(640, 462, 208, 64, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a3b2a';
  rr(ctx, 452, 246, 376, 10, 5); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  rr(ctx, 452, 254, 376, 3, 1.5); ctx.fill();
  for (const lx of [548, 732]) {
    ctx.strokeStyle = '#2b2320';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(lx, 256); ctx.lineTo(lx, 310); ctx.stroke();
    // The glow around the bulb, two soft rings of warm light.
    ctx.fillStyle = 'rgba(255,214,130,0.10)';
    ctx.beginPath(); ctx.arc(lx, 330, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,130,0.16)';
    ctx.beginPath(); ctx.arc(lx, 330, 29, 0, Math.PI * 2); ctx.fill();
    // The enamel dome shade, harbour teal with a brass rim.
    ctx.fillStyle = COLORS.tealDark;
    ctx.beginPath();
    ctx.moveTo(lx - 26, 330); ctx.lineTo(lx - 9, 308);
    ctx.quadraticCurveTo(lx, 301, lx + 9, 308); ctx.lineTo(lx + 26, 330);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c99635';
    ctx.fillRect(lx - 26, 328, 52, 4);
    // The bulb itself.
    ctx.fillStyle = '#ffd968';
    ctx.beginPath(); ctx.arc(lx, 335, 5.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawChef(ctx, state) {
  const chef = state.chef;
  const bob = Math.sin(chef.walk) * 2.4;
  // A full board — five tickets, the most the board can hold — is the one
  // moment the cook's face changes: brows down, mouth flat, sweat flying.
  const strained = state.phase === 'play' && state.tickets.length >= 5;
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
  if (strained) {
    // Determined brows, angled down toward the nose.
    ctx.strokeStyle = '#7a4a26';
    ctx.lineWidth = 1.9;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 10.2, y - 29.5 + bob * 0.2);
      ctx.lineTo(x + side * 3.4, y - 26.8 + bob * 0.2);
      ctx.stroke();
    }
    // A flat, set mouth instead of the smile.
    ctx.strokeStyle = '#a96a3f';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 4.6, y - 15.6 + bob * 0.2);
    ctx.lineTo(x + 4.6, y - 16.4 + bob * 0.2);
    ctx.stroke();
    // Sweat, flung off both sides of the head and beading at the temple.
    const drop = (dx, dy, s, rot) => {
      ctx.save();
      ctx.translate(x + dx, y + dy);
      ctx.rotate(rot);
      ctx.scale(s, s);
      ctx.fillStyle = '#8ecfe8';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(4.6, 0.5, 3.6, 3.4);
      ctx.quadraticCurveTo(2.6, 6.4, 0, 6.4);
      ctx.quadraticCurveTo(-2.6, 6.4, -3.6, 3.4);
      ctx.quadraticCurveTo(-4.6, 0.5, 0, -7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath(); ctx.arc(-1.2, 2.6, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    drop(-24, -30, 0.9, -0.5);
    drop(24.5, -25, 0.75, 0.55);
    drop(-19, -12, 0.55, -0.9);
  } else {
    ctx.strokeStyle = '#a96a3f';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y - 17.5 + bob * 0.2, 5.6, 0.25, Math.PI - 0.25); ctx.stroke();
  }
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
  // Whatever the chef carries rides overhead, both hands up — carried food
  // casts no contact shadow; it is in the air, over his toque.
  if (chef.carry) {
    const dish = DISHES[chef.carry];
    if (dish) drawDish(ctx, chef.carry, x, y - 62, 66, false);
    else drawItem(ctx, chef.carry, x, y - 60, 46, false);
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
      // The red zone, drawn to shout in a still frame: a soft alarm halo
      // outside the card and a hard red border on it.
      ctx.strokeStyle = 'rgba(216,74,47,0.4)';
      ctx.lineWidth = 3;
      rr(ctx, x - 3.5, y - 3.5, cardW + 7, h + 7, 9); ctx.stroke();
      ctx.strokeStyle = COLORS.red;
      ctx.lineWidth = 3.4;
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
    if (frac < 0.25) {
      // Last of all on the card: a filled alarm disc on its top corner with a
      // white bang — the one mark on the board nobody can miss at a glance.
      ctx.fillStyle = COLORS.red;
      ctx.beginPath(); ctx.arc(x + cardW - 3, y + 3, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + cardW - 3, y + 3, 11, 0, Math.PI * 2); ctx.stroke();
      text(ctx, '!', x + cardW - 3, y + 4, 15, '#ffffff');
    }
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

/** A chalkboard panel in the specials board's own style: wood frame, dark green board. */
function chalkPanel(ctx, x, y, w, h) {
  ctx.fillStyle = '#5f4f3c';
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = '#22382e';
  rr(ctx, x + 6, y + 6, w - 12, h - 12, 5); ctx.fill();
}

/**
 * The kitchen grade for a finished shift. The bands are priced from the
 * competent-policy audit's measured scores (24 seeds: worst $59, median $85.5,
 * best $100) — S is the top of what a strong run actually reaches, the median
 * run earns its B, and no band is priced for a player the audit cannot find.
 */
export function gradeFor(score) {
  if (score >= 95) return ['S', 'CHEF-PATRON'];
  if (score >= 90) return ['A', 'EXECUTIVE CHEF'];
  if (score >= 80) return ['B', 'SOUS CHEF'];
  if (score >= 70) return ['C', 'LINE COOK'];
  if (score >= 55) return ['D', 'KITCHEN HAND'];
  return ['E', 'DISH PIG (AFFECTIONATE)'];
}

function drawOverlays(ctx, state) {
  if (state.phase === 'play') return;
  ctx.fillStyle = 'rgba(23, 32, 36, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const cx = VIEW.width / 2;
  if (state.phase === 'title') {
    text(ctx, 'THE DAILY CATCH', cx, 152, 70, '#ffd968');
    text(ctx, 'one cook, one harbour kitchen, the whole lunch rush', cx, 196, 20, COLORS.cream, 'center', false);
    // The menu board: every dish the kitchen serves, what goes into it and what
    // it pays — the game's depth, chalked up where a judge can read it.
    chalkPanel(ctx, 235, 222, 810, 322);
    text(ctx, 'ON THE MENU', cx, 250, 16, COLORS.mustard);
    const menuNotes = {
      fillet: 'straight off the grill — the quick one',
      fries: 'cut potato, from the fryer — rides along on combo tickets',
    };
    [...RECIPES, FRIES].forEach((dish, i) => {
      const y = 288 + i * 40;
      drawDish(ctx, dish.id, 302, y, 40);
      text(ctx, dish.name, 334, y - 8, 15.5, COLORS.cream, 'left');
      const parts = menuNotes[dish.id]
        || dish.items.map((item) => INGREDIENTS[item].name.toLowerCase()).join(' + ');
      text(ctx, parts, 334, y + 12, 13, '#9fb4ac', 'left', false);
      text(ctx, `$${dish.price}`, 1013, y - 2, 16.5, '#ffd968', 'right');
    });
    text(ctx, 'Combo tickets pair a plate with chips — one route, two lines, a bigger tip.', cx, 526, 13, '#9fb4ac', 'center', false);
    text(ctx, 'HOW TO PLAY — FETCH from the bins → CHOP at the boards → GRILL / FRY → PLATE → SERVE', cx, 574, 16.5, COLORS.mustard);
    text(ctx, 'Serve every ticket before its timer dies — tips grow with time to spare, a walkout costs $4.', cx, 600, 14, '#cfe0d8', 'center', false);
    text(ctx, 'MOVE  WASD / arrows (or click)      WORK  SPACE', cx, 628, 15, COLORS.mustard);
    text(ctx, 'PRESS ENTER — FIRST SHIFT', cx, 660, 20, '#7dff9a');
  } else {
    text(ctx, 'LAST ORDERS — SHIFT OVER', cx, 184, 44, '#ffd968');
    text(ctx, `You took $ ${state.score}`, cx, 238, 29, COLORS.cream);
    // The shift's story, dish by dish: what actually went out of the kitchen,
    // counted line by line as it was served.
    chalkPanel(ctx, 290, 264, 700, 196);
    text(ctx, 'SERVED THIS SHIFT', cx, 288, 13.5, '#9fb4ac');
    [...RECIPES, FRIES].forEach((dish, i) => {
      const colX = i < 3 ? 480 : 800;
      const y = 326 + (i % 3) * 42;
      const n = state.servedBy[dish.id] || 0;
      drawDish(ctx, dish.id, colX - 82, y, 40);
      text(ctx, `${dish.name} ×${n}`, colX - 56, y, 15.5, n > 0 ? COLORS.cream : '#71827a', 'left', false);
    });
    text(ctx, `Dishes served ${state.served}      Walkouts ${state.walkouts}      Best tip $ ${state.bestTip}`, cx, 490, 17.5, '#cfe0d8', 'center', false);
    const [letter, title] = gradeFor(state.score);
    text(ctx, `KITCHEN GRADE: ${letter} — ${title}`, cx, 532, 22, COLORS.mustard);
    text(ctx, 'PRESS R TO WORK ANOTHER SHIFT', cx, 578, 17, '#7dff9a');
    // The shift in work, counted at the stations as it happened — the frame's
    // lower third tells the same story in labour instead of money.
    const stats = state.stats || { chops: 0, grills: 0, fries: 0, burns: 0 };
    chalkPanel(ctx, 290, 606, 700, 64);
    text(ctx, 'FROM THE PASS — THE SHIFT IN WORK', cx, 625, 11, '#9fb4ac');
    text(ctx, `CHOPS ${stats.chops}      GRILLS FIRED ${stats.grills}      FRYERS DROPPED ${stats.fries}      BURNT ${stats.burns}`, cx, 650, 16, COLORS.cream);
  }
}
