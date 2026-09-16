// Units: who they are, where they stand, and what a move costs them.
// SPEC.md §4 (action points) and §5 (roles).
//
// Pure functions. Nothing here touches the DOM, and nothing here knows a
// trooper by name — a trooper is a roster entry plus a role, and the role
// picks the numbers out of data/rules.json (CLAUDE.md rules 5 and 6).
//
// Actions other than movement (place charge, cut wire, suppress, hide,
// stabilise) arrive with the milestones that need them.

import { neighbors } from './hex.js';
import { enterCost, findPath, hexKey, reachableWithin, terrainAt } from './map.js';

/**
 * Build the starting unit list from the roster, the rules table and the map's
 * deployment hexes. Throws if the data does not line up, because a trooper
 * silently missing from the board is worse than a loud failure.
 */
export function createUnits(roster, rules, startHexes, rosterUrl = 'data/roster.json') {
  const troopers = roster?.troopers;
  if (!Array.isArray(troopers) || troopers.length === 0) {
    throw new Error(`${rosterUrl}: expected a non-empty "troopers" array`);
  }
  if (startHexes.length < troopers.length) {
    throw new Error(
      `data/map.json: ${troopers.length} troopers in ${rosterUrl} but only ${startHexes.length} startHexes`,
    );
  }

  return troopers.map((trooper, i) => {
    const role = rules.roles?.[trooper.role];
    if (!role) {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" has role "${trooper.role}", which data/rules.json does not define`);
    }
    const [q, r] = startHexes[i];
    return {
      id: trooper.id,
      name: trooper.name,
      shortName: trooper.shortName,
      role: trooper.role,
      roleLabel: role.label,
      // Drives which counter frame is drawn, nothing else. See data/roster.json.
      leader: trooper.leader === true,
      q,
      r,
      ap: role.actionPoints,
      apMax: role.actionPoints,
    };
  });
}

export function unitAt(units, q, r) {
  return units.find((u) => u.q === q && u.r === r) ?? null;
}

export function unitById(units, id) {
  return units.find((u) => u.id === id) ?? null;
}

/**
 * Hexes another trooper is standing in. A trooper blocks a hex for everyone
 * else — you cannot walk through a man and you cannot stand on him. SPEC.md
 * does not say so either way; this is the conventional reading, and it is what
 * makes the regroup problem of SPEC.md §9 mean anything.
 */
export function occupiedHexes(units, exceptId = null) {
  const blocked = new Set();
  for (const unit of units) {
    if (unit.id !== exceptId) blocked.add(hexKey(unit.q, unit.r));
  }
  return blocked;
}

/**
 * Can this unit afford a path of this cost?
 *
 * `minimumStep` in data/rules.json: a unit at full AP may always take one step,
 * however expensive, spending its whole pool. Without it a 2 AP sapper can
 * never enter a 3 AP marsh hex and two thirds of the roster are locked out of
 * the canal towpath approach (SPEC.md §8). Unused AP is still never banked.
 */
export function affordability(unit, cost, steps, rules) {
  if (steps === 0) return { affordable: false, reason: 'already there' };
  if (cost <= unit.ap) return { affordable: true, minimumStep: false };
  if (rules.minimumStep && steps === 1 && unit.ap === unit.apMax) {
    return { affordable: true, minimumStep: true };
  }
  if (unit.ap === 0) return { affordable: false, reason: 'no AP left this turn' };
  return { affordable: false, reason: `needs ${cost} AP, has ${unit.ap}` };
}

/**
 * Work out the move a unit would make to reach a target hex, without making
 * it. Returns a plan the renderer can draw and main.js can commit:
 *
 *   { path, costs, total, affordable, affordableUpTo, minimumStep, reason }
 *
 * `path` includes the origin. `costs[i]` is the running cost to reach
 * `path[i]`. `affordableUpTo` is the index of the last hex on the path this
 * unit could actually reach this turn, so the renderer can draw the reachable
 * part of a long path differently from the rest.
 */
export function planMove(map, units, unit, target, rules) {
  const blocked = occupiedHexes(units, unit.id);
  const path = findPath(map, unit, target, blocked);
  if (!path) return null;

  const costs = runningCosts(map, path);
  const total = costs[costs.length - 1];
  const steps = path.length - 1;
  const { affordable, minimumStep = false, reason = null } = affordability(unit, total, steps, rules);

  let affordableUpTo = 0;
  for (let i = 1; i < costs.length; i++) {
    if (costs[i] <= unit.ap) affordableUpTo = i;
  }
  if (affordable) affordableUpTo = path.length - 1;

  return { path, costs, total, steps, affordable, affordableUpTo, minimumStep, reason };
}

function runningCosts(map, path) {
  const costs = [0];
  for (let i = 1; i < path.length; i++) {
    costs.push(costs[i - 1] + terrainAt(map, path[i].q, path[i].r).moveCost);
  }
  return costs;
}

/**
 * Every hex this unit could move to this turn, as a Map of hexKey -> {q,r,cost}.
 * Includes the minimum-step neighbours: at full AP a unit can always step once,
 * so those hexes are reachable even when they cost more than the whole pool.
 */
export function reachableFor(map, units, unit, rules) {
  const blocked = occupiedHexes(units, unit.id);
  const reachable = reachableWithin(map, unit, unit.ap, blocked);
  if (rules.minimumStep && unit.ap === unit.apMax) {
    for (const step of neighbourPlans(map, units, unit, rules)) {
      if (!reachable.has(step.key)) reachable.set(step.key, step.entry);
    }
  }
  return reachable;
}

function neighbourPlans(map, units, unit, rules) {
  const blocked = occupiedHexes(units, unit.id);
  const out = [];
  for (const next of neighbors(unit.q, unit.r)) {
    const cost = enterCost(map, next.q, next.r, blocked);
    if (cost === null) continue;
    if (!affordability(unit, cost, 1, rules).affordable) continue;
    out.push({ key: hexKey(next.q, next.r), entry: { q: next.q, r: next.r, cost } });
  }
  return out;
}
