// Order tickets: dealing them onto the board, running their timers down, matching a
// served dish to the ticket that asked for it, and paying out price plus tip.

import { WALKOUT_FINE, stationById } from './config.js';
import { DISHES, makeTicket } from './recipes.js';
import { addPopup, heat } from './kitchen.js';

/** How many tickets the board can hold right now — the rush builds as the shift goes on. */
export function ticketCap(state) {
  return Math.min(5, 2 + Math.floor(heat(state) * 4));
}

/** Deal a fresh ticket if the board has room. */
export function spawnTicket(state) {
  if (state.tickets.length >= ticketCap(state)) return;
  const ticket = makeTicket(state.rng, heat(state), state.nextTicketId);
  state.nextTicketId += 1;
  state.tickets.push(ticket);
}

/**
 * Run every ticket's clock down. A ticket that hits zero walks out: the fine comes off
 * the score, the walkout is counted, and the board feels it.
 */
export function updateTickets(state, dt) {
  const serve = stationById('serve');
  for (const ticket of state.tickets) ticket.timeLeft -= dt;
  const gone = state.tickets.filter((t) => t.timeLeft <= 0);
  for (const ticket of gone) {
    state.walkouts += 1;
    state.score -= WALKOUT_FINE;
    addPopup(state, serve.x + serve.w / 2, serve.y - 26, `-$${WALKOUT_FINE} WALKOUT`, '#d84a2f');
  }
  if (gone.length) state.tickets = state.tickets.filter((t) => t.timeLeft > 0);
}

/**
 * Hand a finished dish to the window. Finds the oldest ticket still waiting for it,
 * ticks that line off, and when the ticket is complete pays price + a tip that grows
 * with the time left on its clock. Returns true when a ticket wanted the dish.
 */
export function serveDish(state, dishId) {
  for (const ticket of state.tickets) {
    const line = ticket.items.find((i) => i.dish === dishId && !i.done);
    if (!line) continue;
    line.done = true;
    if (ticket.items.every((i) => i.done)) {
      const tip = Math.round(ticket.price * 0.5 * (ticket.timeLeft / ticket.timeTotal));
      state.score += ticket.price + tip;
      state.served += 1;
      state.bestTip = Math.max(state.bestTip, tip);
      state.tickets = state.tickets.filter((t) => t !== ticket);
      const serve = stationById('serve');
      addPopup(state, serve.x + serve.w / 2, serve.y - 30, `+$${ticket.price + tip}${tip >= 6 ? ' TOP TIP!' : ''}`, '#1f7a6d');
    }
    return true;
  }
  return false;
}

/** The dish a ticket is still waiting for, for hints and highlights. */
export function ticketWants(ticket, dishId) {
  return ticket.items.some((i) => i.dish === dishId && !i.done);
}

export function dishName(dishId) {
  return DISHES[dishId] ? DISHES[dishId].name : dishId;
}
