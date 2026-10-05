// The boat (SPEC.md §10 The way out on a timetable, §14; M41): scenery with a
// timetable, as the goods train is. Where a mission's exfil opens on a turn
// (rules.exfil.opensTurn) and its map draws a `boatRun`, a boat is seen coming
// in along that line for the turns before, and is on the beach from the turn
// the exfil opens. It sees nobody, raises nothing and blocks no hex: the rule
// is the exfil's opening turn (sabotage.js exfilOpen), and this only shows it.
//
// Pure functions. Where the boat is follows from the turn and from when it was
// signalled, if it was (state.boatCalledTurn, M41b).

import { boatLands, lastTurn } from './sabotage.js';

// The turns before it lands that the boat is seen coming where nobody can call
// it; where it can be called, the call's own lead (rules.exfil.call.leadTurns).
const TURNS_OUT = 2;

const turnsOut = (rules) => rules.exfil?.call?.leadTurns ?? TURNS_OUT;

/**
 * The boat as it stands in the player phase of `state.turn`: { q, r, here,
 * lands, leaves }, its place along the map's `boatRun` (a point between hexes
 * while it is coming), or null where there is none to draw yet.
 */
export function boatAt(state, rules, map) {
  const lands = boatLands(state, rules);
  const run = map.boatRun;
  const out = turnsOut(rules);
  if (lands === null || !run || state.turn < lands - out) return null;
  const t = Math.min(1, 1 - (lands - state.turn) / out);
  const [fq, fr] = run.from, [tq, tr] = run.to;
  return { q: fq + (tq - fq) * t, r: fr + (tr - fr) * t, here: state.turn >= lands, lands, leaves: lastTurn(state, rules) };
}

/**
 * What the boat did at the turn boundary, for the turn report: it has the
 * signal, it is sighted coming in, or it is in and the way out is open.
 * `before` and `after` are the states either side of the turn's phases.
 */
export function boatEvents(before, after, rules, map) {
  const lands = boatLands(after, rules);
  if (lands === null || after.turn === before.turn) return [];
  const [q, r] = map.exfil[Math.floor(map.exfil.length / 2)];
  const event = (what) => [{ kind: 'boat', what, opens: lands, leaves: lastTurn(after, rules), q, r }];
  if (after.turn === lands) return event('in');
  if (before.boatCalledTurn === before.turn) return event('called');
  if (after.turn === lands - turnsOut(rules) && map.boatRun) return event('sighted');
  return [];
}
