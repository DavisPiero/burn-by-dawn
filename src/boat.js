// The boat (SPEC.md §10 The way out on a timetable, §14; M41): scenery with a
// timetable, as the goods train is. Where a mission's exfil opens on a turn
// (rules.exfil.opensTurn) and its map draws a `boatRun`, a boat is seen coming
// in along that line for the turns before, and is on the beach from the turn
// the exfil opens. It sees nobody, raises nothing and blocks no hex: the rule
// is the exfil's opening turn (sabotage.js exfilOpen), and this only shows it.
//
// Pure functions. Where the boat is follows from the turn; nothing is kept in
// state.

// The turns before the exfil opens that the boat is on the board coming in.
const TURNS_OUT = 2;

/** The turn the way out opens, or null where it is open all night. */
export function boatTurn(rules) {
  return rules.exfil?.opensTurn ?? null;
}

/**
 * The boat as it stands in the player phase of `turn`: { q, r, here, opens },
 * its place along the map's `boatRun` (a point between hexes while it is
 * coming), or null where there is none to draw yet.
 */
export function boatAt(turn, rules, map) {
  const opens = boatTurn(rules);
  const run = map.boatRun;
  if (opens === null || !run || turn < opens - TURNS_OUT) return null;
  const t = Math.min(1, 1 - (opens - turn) / TURNS_OUT);
  const [fq, fr] = run.from, [tq, tr] = run.to;
  return { q: fq + (tq - fq) * t, r: fr + (tr - fr) * t, here: turn >= opens, opens };
}

/**
 * What the boat did at the turn boundary, for the turn report: it is sighted
 * coming in, or it is in and the way out is open. `before` and `after` are the
 * states either side of the turn's phases.
 */
export function boatEvents(before, after, rules, map) {
  const opens = boatTurn(rules);
  if (opens === null || after.turn === before.turn) return [];
  const [q, r] = map.exfil[Math.floor(map.exfil.length / 2)];
  const event = (what) => [{ kind: 'boat', what, opens, leaves: rules.turnLimit, q, r }];
  if (after.turn === opens) return event('in');
  if (after.turn === opens - TURNS_OUT && map.boatRun) return event('sighted');
  return [];
}
