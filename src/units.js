// Units: who they are, where they stand, and what a move costs them.
// SPEC.md §4 (action points) and §5 (roles).
//
// Pure functions. Nothing here touches the DOM, and nothing here knows a
// trooper by name — a trooper is a roster entry plus a role, the role picks
// the base numbers out of data/rules.json, and his traits modify them through
// the hooks in traits.js (CLAUDE.md rules 5 and 6).
//
// Actions other than movement (place charge, cut wire, suppress, hide,
// stabilise) arrive with the milestones that need them.

import { hexDistance, neighbors } from './hex.js';
import { enterCost, findPath, hexKey, reachableWithin } from './map.js';
import { applyHook } from './traits.js';

/**
 * The events a trooper speaks on (SPEC.md §5). These are dialogue keys, not
 * trait hooks: onWounded has no hook, and onLand and onPlaceCharge sharing a
 * name with hooks is only because they happen at the same moment.
 */
export const DIALOGUE_KEYS = ['onLand', 'onPlaceCharge', 'onWounded'];

/**
 * Build the starting unit list from the roster, the trait table, the rules
 * table and the map's deployment hexes. Throws if the data does not line up,
 * because a trooper silently missing from the board — or a trait silently
 * never firing — is worse than a loud failure.
 */
export function createUnits(roster, traits, rules, startHexes, rosterUrl = 'data/roster.json') {
  const troopers = roster?.troopers;
  if (!Array.isArray(troopers) || troopers.length === 0) {
    throw new Error(`${rosterUrl}: expected a non-empty "troopers" array`);
  }
  if (startHexes.length < troopers.length) {
    throw new Error(
      `data/map.json: ${troopers.length} troopers in ${rosterUrl} but only ${startHexes.length} startHexes`,
    );
  }

  const units = troopers.map((trooper, i) => {
    const role = rules.roles?.[trooper.role];
    if (!role) {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" has role "${trooper.role}", which data/rules.json does not define`);
    }
    const [q, r] = startHexes[i];
    const unit = {
      id: trooper.id,
      name: trooper.name,
      shortName: trooper.shortName,
      role: trooper.role,
      roleLabel: role.label,
      // Picks his counter frame, and marks him as the source of the command
      // bonus below. See data/roster.json.
      leader: trooper.leader === true,
      // Resolved copies of his trait definitions, each carrying its id, so a
      // hook call needs only the unit and state stays plain data.
      traits: resolveTraits(trooper, traits, rosterUrl),
      dialogue: validateDialogue(trooper, rosterUrl),
      q,
      r,
      apBase: role.actionPoints,
      apMax: role.actionPoints,
      ap: role.actionPoints,
    };
    // Loadout is fixed at creation: onChargeCapacity is called once, here.
    return { ...unit, charges: chargeCapacity(unit, rules) };
  });

  // Everyone has to be on the board before the command radius can be measured.
  return fillActionPoints(units, rules);
}

/**
 * The leader's command radius: a trooper within `command.radius` hexes of a
 * trooper flagged `leader` has been given his orders and gets
 * `command.bonusActionPoints` for the turn.
 *
 * This is a rule in data/rules.json rather than a trait, and deliberately so.
 * Every hook in SPEC.md §5 modifies the trooper who owns the trait; this
 * modifies *other* troopers, which the hook system has no way to express and
 * which §5 explicitly refuses to extend it to cover. Nothing here branches on
 * anybody's name — move the `leader` flag in roster.json and the bonus moves
 * with it (CLAUDE.md rule 6).
 */
export function commandBonus(unit, units, rules) {
  const command = rules.command;
  if (!command?.bonusActionPoints) return 0;
  if (unit.leader && !command.leaderReceivesOwnBonus) return 0;

  const led = units.some((other) => (
    other.leader && other.id !== unit.id && hexDistance(other, unit) <= command.radius
  ));
  return led ? command.bonusActionPoints : 0;
}

/**
 * Refill every trooper's pool for a new turn. The pool is the role's own
 * number plus any command bonus earned by where he is standing *now*, so
 * `apMax` is this turn's pool and `apBase` is the role's. Unused AP is never
 * carried over (SPEC.md §4).
 */
export function fillActionPoints(units, rules) {
  return units.map((unit) => {
    // Trait first, then orders: onActionPoints modifies the man's own pool,
    // and command is added on top of whatever that pool turned out to be.
    const own = applyHook(unit, 'onActionPoints', 'actionPoints', unit.apBase).value;
    const bonus = commandBonus(unit, units, rules);
    return { ...unit, commandBonus: bonus, apMax: own + bonus, ap: own + bonus };
  });
}

function resolveTraits(trooper, traits, rosterUrl) {
  const ids = trooper.traits ?? [];
  if (!Array.isArray(ids)) {
    throw new Error(`${rosterUrl}: trooper "${trooper.id}" "traits" must be an array of trait ids`);
  }
  return ids.map((id) => {
    if (!Object.hasOwn(traits, id)) {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" has trait "${id}", which data/traits.json does not define`);
    }
    return { id, ...traits[id] };
  });
}

function validateDialogue(trooper, rosterUrl) {
  const dialogue = trooper.dialogue;
  for (const key of DIALOGUE_KEYS) {
    if (typeof dialogue?.[key] !== 'string' || dialogue[key] === '') {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" needs a "dialogue.${key}" line`);
    }
  }
  for (const key of Object.keys(dialogue)) {
    if (!DIALOGUE_KEYS.includes(key)) {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" has dialogue key "${key}"; the keys are ${DIALOGUE_KEYS.join(', ')}`);
    }
  }
  return { ...dialogue };
}

// --- trait-modified numbers ---------------------------------------------------
//
// Where each hook gets its base value. The systems that act on most of these
// arrive later (charges M5, gunfire M4/M5, the drop M6, vision M4); they call
// these, or applyHook with their own base, rather than reading rules.json raw.

/** Charges carried. SPEC.md §5 loadout, onChargeCapacity. */
export function chargeCapacity(unit, rules) {
  return applyHook(unit, 'onChargeCapacity', 'charges', rules.roles[unit.role].charges).value;
}

/**
 * The base value a hook stat starts from for this unit, or null where the
 * base depends on the situation rather than the man — the hex being entered,
 * the enemy looking, the scatter the RNG rolls.
 */
export function hookBase(unit, hook, stat, rules) {
  const role = rules.roles[unit.role];
  switch (`${hook}.${stat}`) {
    case 'onActionPoints.actionPoints': return role.actionPoints;
    case 'onSpotRadius.spotRadius': return role.spotRadius;
    case 'onChargeCapacity.charges': return role.charges;
    case 'onPlaceCharge.apCost': return rules.charges.placeApCost;
    case 'onPlaceCharge.fuse': return rules.charges.fuseTurns;
    case 'onFire.alert': return rules.alert.gunfire;
    case 'onLand.landingPenalty': return rules.landing.badLandingTurnsLost;
    default: return null;
  }
}

/**
 * What each of this unit's traits does to its numbers, one entry per trait:
 * { id, name, description, hook, stat, modifier, base, value }. `base` and
 * `value` are null when the base is situational (see hookBase).
 */
export function traitEffects(unit, rules) {
  return (unit.traits ?? []).map((trait) => {
    const { stat } = trait.modifier;
    const base = hookBase(unit, trait.hook, stat, rules);
    const value = base === null ? null : applyHook(unit, trait.hook, stat, base).value;
    return {
      id: trait.id,
      name: trait.name,
      description: trait.description,
      hook: trait.hook,
      stat,
      modifier: trait.modifier,
      base,
      value,
    };
  });
}

/** This unit's cost to enter terrain of a given cost: the onMoveCost hook. */
export function moveCostFor(unit) {
  return (terrainCost) => applyHook(unit, 'onMoveCost', 'moveCost', terrainCost).value;
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
  const path = findPath(map, unit, target, blocked, moveCostFor(unit));
  if (!path) return null;

  const costs = runningCosts(map, path, unit);
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

function runningCosts(map, path, unit) {
  const adjust = moveCostFor(unit);
  const costs = [0];
  for (let i = 1; i < path.length; i++) {
    costs.push(costs[i - 1] + enterCost(map, path[i].q, path[i].r, null, adjust));
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
  const reachable = reachableWithin(map, unit, unit.ap, blocked, moveCostFor(unit));
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
    const cost = enterCost(map, next.q, next.r, blocked, moveCostFor(unit));
    if (cost === null) continue;
    if (!affordability(unit, cost, 1, rules).affordable) continue;
    out.push({ key: hexKey(next.q, next.r), entry: { q: next.q, r: next.r, cost } });
  }
  return out;
}
