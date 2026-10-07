// What the board shows of seeing and being seen (SPEC.md §4, §6; M45), worked
// out from the state by the same sums the detection check will do. Pure
// functions: they read state and rules and decide nothing (CLAUDE.md rule 7).
// The readout says the same things a hex at a time; these say them for every
// hex at once, so the risk is seen without hovering.

import { busyFor, detectionAt, fireRivals, testedHexes } from './enemy.js';
import { hexKey } from './map.js';
import { checkHide, onBoard, planMove } from './units.js';

/** The test detectionAt takes for this man: is an enemy firing at another ahead of him (SPEC.md §6)? */
function busyOf(map, rules, state, unit) {
  return unit.inContact ? busyFor(fireRivals(map, rules, state), state, unit) : null;
}

/**
 * The danger wash: for every hex the man can reach this turn (`reachable`,
 * units.js reachableFor), what going there by the path the game would take
 * does to him. Every hex he enters is tested (enemy.js testedHexes), so a
 * safe hex reached over open ground is as red as the ground.
 *   'spotted'  an enemy spots him on the way or there
 *   'shot'     he is in contact, and one that spots him is free to fire
 *   'clear'    he is in contact, and nobody spots him: it breaks contact
 *   null       nobody spots him, and he was not in contact
 * Returns a Map by hexKey. His own hex is left out: see firedOn.
 */
export function dangerWash(map, rules, state, unit, reachable) {
  const busy = busyOf(map, rules, state, unit);
  const mover = { ...unit, hidden: false };
  const at = (hex) => detectionAt(map, rules, state.enemies, state.alert.points, mover, hex, busy);
  const worse = (a, b) => (a === 'shot' || b === 'shot' ? 'shot' : a ?? b);
  const kindOf = (d) => (d?.spotted ? (unit.inContact && d.firing ? 'shot' : 'spotted') : null);
  // Hexes he has already entered this turn are tested whatever he does next.
  const already = (unit.trail ?? []).reduce((kind, h) => worse(kind, kindOf(at(h))), null);
  const wash = new Map();
  for (const hex of reachable.values()) {
    if (hex.cost === 0) continue;
    const plan = planMove(map, state.units, unit, hex, rules, state.enemies);
    if (!plan) continue;
    const kind = plan.path.slice(1).reduce((k, step) => worse(k, kindOf(at(step))), already);
    wash.set(hexKey(hex.q, hex.r), kind ?? (unit.inContact ? 'clear' : null));
  }
  return wash;
}

/**
 * The men in contact who will be fired on at the end of this turn as things
 * stand: a free enemy spots him again on a hex he is tested on. A Set of ids.
 */
export function firedOn(map, rules, state) {
  const rivals = fireRivals(map, rules, state);
  const ids = new Set();
  for (const unit of state.units) {
    if (!onBoard(unit) || !unit.inContact) continue;
    const busy = busyFor(rivals, state, unit);
    const shot = testedHexes(unit).some((h) => {
      const d = detectionAt(map, rules, state.enemies, state.alert.points, unit, h, busy);
      return Boolean(d?.spotted && d.firing);
    });
    if (shot) ids.add(unit.id);
  }
  return ids;
}

/**
 * Would hiding now turn spotted into unseen? He can hide, nobody spots him on
 * a hex he crossed to get here (hiding covers only the hex he stops on), and
 * he is spotted standing here but not once hidden.
 */
export function hideSaves(map, rules, state, unit) {
  if (!unit || !onBoard(unit) || unit.hidden || !checkHide(unit, rules).ok) return false;
  const busy = busyOf(map, rules, state, unit);
  const at = (man, hex) => detectionAt(map, rules, state.enemies, state.alert.points, man, hex, busy);
  const onTheWay = testedHexes(unit).filter((h) => h.q !== unit.q || h.r !== unit.r);
  if (onTheWay.some((h) => at(unit, h)?.spotted)) return false;
  return Boolean(at({ ...unit, hidden: false }, unit)?.spotted) && !at({ ...unit, hidden: true }, unit)?.spotted;
}
