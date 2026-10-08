// What the board points at (SPEC.md §4, §11; M46): the enemies the selected
// man could strike now, the men standing in a blast that goes off this turn
// and the nearest ground clear of it, whether it is time to get out and who
// can no longer reach the way out, and where the alert's points came from.
// Pure functions: they read state and rules and decide nothing (CLAUDE.md
// rule 7). Each asks the same check the action or the turn will make, so the
// board never points at something that cannot be done.

import { hexKey, findPath, reachableWithin } from './map.js';
import { winMet } from './missions.js';
import { blastEffect, blastHexesThisTurn, exfilOpen, lastTurn } from './sabotage.js';
import { checkKill, checkKnife, checkSuppress, moveCostFor, onBoard, reachableFor, returnsFire } from './units.js';

/**
 * The enemies this man could strike right now, by enemy id: 'knife' (silent),
 * else 'kill' (a gunner's, on one under suppression), else 'fire' (a gunner's
 * suppress, or anyone's return fire at the enemy that has him). One mark an
 * enemy, the quietest.
 */
export function opportunities(map, rules, state, unit) {
  const marks = new Map();
  if (!unit || !onBoard(unit) || state.outcome) return marks;
  const fires = rules.roles[unit.role].suppress || returnsFire(unit, rules);
  for (const enemy of state.enemies) {
    if (checkKnife(unit, enemy, rules).ok) marks.set(enemy.id, 'knife');
    else if (checkKill(map, unit, enemy, rules).ok) marks.set(enemy.id, 'kill');
    else if (fires && checkSuppress(map, unit, enemy, rules).ok) marks.set(enemy.id, 'fire');
  }
  return marks;
}

/**
 * The men standing in a blast that goes off at the end of this turn: what it
 * would do to each ('killed' or 'wounded', sabotage.js blastEffect), and the
 * nearest hex clear of every such blast that he can still reach this turn
 * (`to`, null if he cannot get off the ground at all).
 * @returns {{ unitId: string, q: number, r: number, effect: string, to: { q: number, r: number } | null }[]}
 */
export function getClear(map, rules, state) {
  if (state.outcome || state.phase === 'drop') return [];
  const blasts = blastHexesThisTurn(state, rules);
  if (blasts.length === 0) return [];
  const caught = [];
  for (const unit of state.units) {
    if (!onBoard(unit)) continue;
    const effect = blastEffect(blasts, unit);
    if (!effect) continue;
    const safe = [...reachableFor(map, state.units, unit, rules, state.enemies).values()]
      .filter((h) => h.cost > 0 && !blastEffect(blasts, h))
      .sort((a, b) => a.cost - b.cost)[0] ?? null;
    caught.push({ unitId: unit.id, q: unit.q, r: unit.r, effect, to: safe && { q: safe.q, r: safe.r } });
  }
  return caught;
}

/**
 * The way out (SPEC.md §10). `go`: the job is done and the exfil is open, so
 * every turn from here is for getting out. `closing`: the night's last
 * `turns` turns are here. `late`: while it is closing and open, the men who
 * can no longer reach an exfil hex before it ends: this turn's AP and a full
 * pool each turn after, over the ground's costs, or a step a turn where the
 * ground costs more than his pool (rules.json `minimumStep`).
 */
export function wayOut(map, rules, state, turns = 3) {
  const none = { go: false, closing: false, late: new Set() };
  if (state.outcome || state.phase === 'drop') return none;
  const open = exfilOpen(state, rules);
  const after = lastTurn(state, rules) - state.turn;
  const closing = after < turns;
  const late = new Set();
  if (open && closing) {
    for (const unit of state.units) {
      if (!onBoard(unit)) continue;
      const reach = reachableWithin(map, unit, unit.ap + after * unit.apMax, null, moveCostFor(unit));
      if (map.exfil.some(([q, r]) => reach.has(hexKey(q, r)))) continue;
      // One hex a turn whatever it costs, from a full pool.
      const steps = rules.minimumStep
        ? Math.min(...map.exfil.map(([q, r]) => (findPath(map, unit, { q, r }, null, moveCostFor(unit))?.length ?? Infinity) - 1))
        : Infinity;
      if (steps > after + (unit.ap === unit.apMax ? 1 : 0)) late.add(unit.id);
    }
  }
  return { go: open && winMet(state, rules) && state.units.some(onBoard), closing, late };
}

// What puts points on the alert and happens at a hex (SPEC.md §6).
const RAISES = new Set(['spotted', 'bodyFound', 'parachuteFound', 'canisterFound', 'explosion']);

/**
 * Where the alert's new points came from, between two states: the hexes of
 * the noises made and the sightings, finds and bangs reported since `before`,
 * each hex once. Empty if the alert did not rise; `fallback` (the man who
 * acted) if it rose with nothing to point at, as when a line is cut.
 */
export function alertOrigins(before, after, fallback = null) {
  if (after.alert.points <= before.alert.points) return [];
  const made = [
    ...after.noises.filter((n) => !before.noises.includes(n)),
    ...after.report.filter((e) => !before.report.includes(e) && RAISES.has(e.kind) && Number.isInteger(e.q) && Number.isInteger(e.r)),
  ];
  const seen = new Set();
  const origins = [];
  for (const { q, r } of made) {
    if (seen.has(hexKey(q, r))) continue;
    seen.add(hexKey(q, r));
    origins.push({ q, r });
  }
  if (origins.length === 0 && fallback) origins.push({ q: fallback.q, r: fallback.r });
  return origins;
}
