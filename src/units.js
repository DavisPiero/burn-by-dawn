// Units: who they are, where they stand, and what a move costs them.
// SPEC.md §4 (action points) and §5 (roles).
//
// Pure functions. Nothing here touches the DOM, and nothing here knows a
// trooper by name — a trooper is a roster entry plus a role, the role picks
// the base numbers out of data/rules.json, and his traits modify them through
// the hooks in traits.js (CLAUDE.md rules 5 and 6).
//
// Whether a man can take an action (hide, suppress, throw a stone, stabilise,
// pick up a charge — SPEC.md §4 Actions) is worked out here, as a check that
// says why not. Taking it changes more than the man, so the transitions live
// in state.js. Placing charges, cutting the line and swimming need the
// objectives, so their checks live in sabotage.js.

import { hexDistance, inArc, neighbors } from './hex.js';
import { enterCost, findPath, hasLineOfSight, hexKey, isInPlay, reachableWithin, terrainAt } from './map.js';
import { applyHook } from './traits.js';

/**
 * The events a trooper speaks on (SPEC.md §5). These are dialogue keys, not
 * trait hooks: onWounded has no hook, and onLand and onPlaceCharge sharing a
 * name with hooks is only because they happen at the same moment.
 */
export const DIALOGUE_KEYS = ['onLand', 'onPlaceCharge', 'onWounded'];

/**
 * Lines a trooper may have but need not. onWoundedCarrying is said in place of
 * onWounded when he is hit still carrying a charge, which drops on his hex:
 * so a line about the charge is only ever said when there is one to fetch.
 * M26 added three more, said by the man himself as he acts: onKill (a gunner's
 * kill, or anyone's knife), onSpotted (the first sighting of him, not each turn
 * he stays in view) and onHide (going to ground). A man with none is silent.
 */
export const OPTIONAL_DIALOGUE_KEYS = ['onWoundedCarrying', 'onKill', 'onSpotted', 'onHide'];

/** What a man says when he is wounded; `unit` as he was just before the hit. */
export function woundedLine(unit) {
  const dialogue = unit.dialogue ?? {};
  return (unit.charges > 0 && dialogue.onWoundedCarrying) || dialogue.onWounded || null;
}

/**
 * Build the stick from the roster, the trait table and the rules table. Nobody
 * is on the board yet: the drop puts them there (drop.js landStick). Throws if
 * the data does not line up, because a trait silently never firing is worse
 * than a loud failure.
 */
export function createUnits(roster, traits, rules, rosterUrl = 'data/roster.json') {
  const troopers = roster?.troopers;
  if (!Array.isArray(troopers) || troopers.length === 0) {
    throw new Error(`${rosterUrl}: expected a non-empty "troopers" array`);
  }

  const units = troopers.map((trooper) => {
    const role = rules.roles?.[trooper.role];
    if (!role) {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" has role "${trooper.role}", which data/rules.json does not define`);
    }
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
      // Still in the aircraft until the drop lands him (SPEC.md §9).
      q: null,
      r: null,
      landed: false,
      turnsLost: 0, // turns still to lose to a bad landing, this one included
      trail: [], // hexes entered this turn, for the detection phase
      // SPEC.md §5 Wounds and §6 contact. `inContact`: spotted at the last
      // detection check, so spotted again means shot. `hidden`: gone to
      // ground, until he next spends AP (§4 Actions).
      hits: 0,
      dead: false,
      stabilised: false,
      inContact: false,
      // Spotted at any detection check this mission, for the stealth score
      // (SPEC.md §10, M11b). Never cleared.
      everSpotted: false,
      pinned: false, // shot at in heavy cover: his next pool is smaller
      out: false, // reached an exfil hex: off the board, safe (SPEC.md §10)
      hidden: false,
      apBase: role.actionPoints,
      apMax: role.actionPoints,
      ap: role.actionPoints,
    };
    // Loadout is fixed at creation: onChargeCapacity is called once, here.
    return { ...unit, charges: chargeCapacity(unit, rules) };
  });

  return fillActionPoints(units, rules);
}

/**
 * The leader's command radius: a trooper within `command.radius` hexes of a
 * trooper flagged `leader` has been given his orders and gets
 * `command.bonusActionPoints` for the turn, or `command.closeBonusActionPoints`
 * within `command.closeRadius` (M12: strongest beside him).
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

  // The nearest leader on the board, if any; his orders are strongest close
  // to him (M12): `closeBonusActionPoints` within `closeRadius`.
  const distances = units
    .filter((other) => other.leader && onBoard(other) && other.id !== unit.id)
    .map((other) => hexDistance(other, unit));
  if (distances.length === 0) return 0;
  const nearest = Math.min(...distances);
  if (command.closeRadius != null && nearest <= command.closeRadius) return command.closeBonusActionPoints;
  return nearest <= command.radius ? command.bonusActionPoints : 0;
}

/**
 * Refill every trooper's pool for a new turn. The pool is the role's own
 * number plus any command bonus earned by where he is standing *now*, so
 * `apMax` is this turn's pool and `apBase` is the role's. Unused AP is never
 * carried over (SPEC.md §4).
 */
export function fillActionPoints(units, rules) {
  return units.map((unit) => {
    if (!onBoard(unit)) return { ...unit, commandBonus: 0, apMax: 0, ap: 0 };
    // A bad landing costs him whole turns (SPEC.md §9): nothing to spend.
    if (unit.turnsLost > 0) return { ...unit, commandBonus: 0, apMax: 0, ap: 0 };
    // A wounded man drops to a flat pool until he is stabilised (SPEC.md §5).
    // Orders do not lift it: the point of the wound is that he is slow.
    if (isWounded(unit)) {
      const pool = pinnedPool(unit, rules.combat.woundedActionPoints, rules);
      return { ...unit, commandBonus: 0, apMax: pool, ap: pool };
    }
    // Trait first, then orders: onActionPoints modifies the man's own pool,
    // and command is added on top of whatever that pool turned out to be.
    const own = applyHook(unit, 'onActionPoints', 'actionPoints', unit.apBase).value;
    const bonus = commandBonus(unit, units, rules);
    const pool = pinnedPool(unit, own + bonus, rules);
    return { ...unit, commandBonus: bonus, apMax: pool, ap: pool };
  });
}

/** Shot at in heavy cover last turn (SPEC.md §5): a smaller pool, but never below 1. */
function pinnedPool(unit, pool, rules) {
  return unit.pinned ? Math.max(Math.min(pool, 1), pool - rules.combat.pinnedApLoss) : pool;
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
    if (!DIALOGUE_KEYS.includes(key) && !OPTIONAL_DIALOGUE_KEYS.includes(key)) {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" has dialogue key "${key}"; the keys are ${[...DIALOGUE_KEYS, ...OPTIONAL_DIALOGUE_KEYS].join(', ')}`);
    }
    if (typeof dialogue[key] !== 'string' || dialogue[key] === '') {
      throw new Error(`${rosterUrl}: trooper "${trooper.id}" has an empty "dialogue.${key}" line`);
    }
  }
  return { ...dialogue };
}

// --- trait-modified numbers ---------------------------------------------------
//
// Where each hook gets its base value. The systems that act on most of these
// arrive later (charges M5, gunfire M5, the drop M6); they call
// these, or applyHook with their own base, rather than reading rules.json raw.

/** Charges carried. SPEC.md §5 loadout, onChargeCapacity. */
export function chargeCapacity(unit, rules) {
  return applyHook(unit, 'onChargeCapacity', 'charges', rules.roles[unit.role].charges).value;
}

/**
 * How many charges he has room for: his loadout, and never fewer than
 * `charges.carryAtLeast` (M37, the operator's: a gunner could not pick up a
 * charge left lying at the exfil). The loadout is what he jumps with; any man
 * can carry one he picks up or is handed.
 */
export function chargeRoom(unit, rules) {
  return Math.max(chargeCapacity(unit, rules), rules.charges.carryAtLeast);
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

/** A trooper on this hex. The dead and the men already out are off the board. */
export function unitAt(units, q, r) {
  return units.find((u) => onBoard(u) && u.q === q && u.r === r) ?? null;
}

export function unitById(units, id) {
  return units.find((u) => u.id === id) ?? null;
}

/**
 * Hexes another trooper or any enemy is standing in. A trooper blocks a hex
 * for everyone else — you cannot walk through a man and you cannot stand on
 * him. SPEC.md does not say so either way; this is the conventional reading,
 * and it is what makes the regroup problem of SPEC.md §9 mean anything. An
 * enemy blocks the same way.
 */
export function occupiedHexes(units, exceptId = null, enemies = []) {
  const blocked = new Set();
  for (const unit of units) {
    if (unit.id !== exceptId && onBoard(unit)) blocked.add(hexKey(unit.q, unit.r));
  }
  for (const enemy of enemies) blocked.add(hexKey(enemy.q, enemy.r));
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
  if (rules.minimumStep && steps === 1 && unit.apMax > 0 && unit.ap === unit.apMax) {
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
export function planMove(map, units, unit, target, rules, enemies = []) {
  const blocked = occupiedHexes(units, unit.id, enemies);
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
export function reachableFor(map, units, unit, rules, enemies = []) {
  const blocked = occupiedHexes(units, unit.id, enemies);
  const reachable = reachableWithin(map, unit, unit.ap, blocked, moveCostFor(unit));
  if (rules.minimumStep && unit.apMax > 0 && unit.ap === unit.apMax) {
    for (const step of neighbourPlans(map, blocked, unit, rules)) {
      if (!reachable.has(step.key)) reachable.set(step.key, step.entry);
    }
  }
  return reachable;
}

function neighbourPlans(map, blocked, unit, rules) {
  const out = [];
  for (const next of neighbors(unit.q, unit.r)) {
    const cost = enterCost(map, next.q, next.r, blocked, moveCostFor(unit));
    if (cost === null) continue;
    if (!affordability(unit, cost, 1, rules).affordable) continue;
    out.push({ key: hexKey(next.q, next.r), entry: { q: next.q, r: next.r, cost } });
  }
  return out;
}

// --- condition ------------------------------------------------------------------

/** Still in the field: landed, not dead, and not out at the exfil (SPEC.md §9, §10). */
export function onBoard(unit) {
  return unit.landed === true && !unit.dead && !unit.out;
}

/** Hit and not yet stabilised: the 1 AP man of SPEC.md §5. */
export function isWounded(unit) {
  return !unit.dead && unit.hits > 0 && !unit.stabilised;
}

/** A wounded man cannot carry a charge until he is stabilised (SPEC.md §5). */
export function canCarryCharges(unit) {
  return !unit.dead && !isWounded(unit);
}

/**
 * How far this trooper sees, for suppress: his role's radius through the
 * onSpotRadius hook, plus the high ground he is standing on.
 */
export function spotRadiusOf(map, unit, rules) {
  const own = applyHook(unit, 'onSpotRadius', 'spotRadius', rules.roles[unit.role].spotRadius).value;
  return own + (terrainAt(map, unit.q, unit.r)?.spotBonus ?? 0);
}

// --- action checks ---------------------------------------------------------------
//
// Each returns { ok, cost, reason }. `reason` is a short phrase for the
// readout when `ok` is false. They only look; state.js does. canAct and result
// are shared with the sabotage checks.

export function canAct(unit, cost) {
  if (!unit || !onBoard(unit)) return 'not on the board';
  if (unit.ap < cost) return unit.ap === 0 ? 'no AP left this turn' : `needs ${cost} AP, has ${unit.ap}`;
  return null;
}

export function result(cost, reason) {
  return { ok: reason === null, cost, reason };
}

/** Go to ground (SPEC.md §4): 1 AP, ends his turn. */
export function checkHide(unit, rules) {
  const cost = rules.actions.hide.apCost;
  if (unit?.hidden) return result(cost, 'already hidden');
  return result(cost, canAct(unit, cost));
}

/**
 * The knife (SPEC.md §4, M12b): any trooper, not in contact, an enemy beside
 * him that cannot see him — he is outside its arc (beside it, the range and
 * the line are never the question) — and of a type that can be killed.
 */
export function checkKnife(unit, enemy, rules) {
  const cost = rules.actions.knife.apCost;
  const busy = canAct(unit, cost);
  if (busy) return result(cost, busy);
  if (rules.actions.knife.fullTurn && unit.ap < unit.apMax) return result(cost, 'takes a full turn — he has already spent AP');
  if (unit.inContact) return result(cost, 'he has been seen — an enemy has him in its sights');
  if (!enemy) return result(cost, 'pick an enemy beside him');
  const name = `the ${enemy.label.toLowerCase()}`;
  if (!enemy.killable) return result(cost, `${name} cannot be killed — suppress it to get past`);
  if (hexDistance(unit, enemy) !== 1) return result(cost, `${name} is not beside him`);
  if (inArc(enemy, enemy.facing, unit, enemy.arcDegrees)) return result(cost, `${name} is looking his way — get behind it`);
  return result(cost, null);
}

/** Does a suppress by this man count as returning fire: he is no gunner, and the rule is on (SPEC.md §4, M36)? */
export function returnsFire(unit, rules) {
  return Boolean(unit && !rules.roles[unit.role].suppress && rules.actions.returnFire);
}

/** Does this enemy have this man in its sights: the one it spotted and is watching? */
export function hasInSights(enemy, unit) {
  return (enemy.watching ?? enemy.holding)?.unitId === unit.id;
}

/**
 * Suppress (SPEC.md §4): a visible enemy — in spot radius, clear line. A
 * gunner fires at any such enemy. Anyone else can only return fire (M36):
 * he must be in contact, and the enemy must be one that has him in its sights.
 */
export function checkSuppress(map, unit, enemy, rules) {
  const back = returnsFire(unit, rules);
  const cost = back ? rules.actions.returnFire.apCost : rules.actions.suppress.apCost;
  if (!unit || (!rules.roles[unit.role].suppress && !back)) return result(cost, `a ${unit ? unit.roleLabel.toLowerCase() : 'trooper'} cannot suppress`);
  if (back && onBoard(unit) && !unit.inContact) return result(cost, 'nobody has seen him — only a gunner fires first');
  const busy = canAct(unit, cost);
  if (busy) return result(cost, busy);
  if (!enemy) return result(cost, 'pick an enemy');
  if (back && !hasInSights(enemy, unit)) return result(cost, `the ${enemy.label.toLowerCase()} has not seen him — only a gunner fires first`);
  if (enemy.suppressed) return result(cost, `${enemy.label} is already suppressed`);
  const radius = spotRadiusOf(map, unit, rules);
  if (hexDistance(unit, enemy) > radius) return result(cost, `out of range — he sees ${radius} hex${radius === 1 ? '' : 'es'}`);
  if (!hasLineOfSight(map, unit, enemy)) return result(cost, 'no clear line of sight');
  return result(cost, null);
}

/**
 * Kill (SPEC.md §4): gunners only, the same visible target as suppress, which
 * must be of a killable type and still under suppression — suppressed this
 * player phase, or open to a kill from the one before.
 */
export function checkKill(map, unit, enemy, rules) {
  const cost = rules.actions.kill.apCost;
  if (!unit || !rules.roles[unit.role].kill) return result(cost, `a ${unit ? unit.roleLabel.toLowerCase() : 'trooper'} cannot kill`);
  const busy = canAct(unit, cost);
  if (busy) return result(cost, busy);
  if (!enemy) return result(cost, 'pick an enemy');
  if (!enemy.killable) return result(cost, `the ${enemy.label.toLowerCase()} cannot be killed — suppress it to get past`);
  if (!enemy.suppressed && !enemy.openToKill) return result(cost, `suppress the ${enemy.label.toLowerCase()} first`);
  const radius = spotRadiusOf(map, unit, rules);
  if (hexDistance(unit, enemy) > radius) return result(cost, `out of range — he sees ${radius} hex${radius === 1 ? '' : 'es'}`);
  if (!hasLineOfSight(map, unit, enemy)) return result(cost, 'no clear line of sight');
  return result(cost, null);
}

/** Throw a stone (SPEC.md §4): any hex up to `range` away, no line of sight needed. */
export function checkThrowStone(map, unit, hex, rules) {
  const { apCost: cost, range } = rules.actions.throwStone;
  const busy = canAct(unit, cost);
  if (busy) return result(cost, busy);
  if (!hex || !isInPlay(map, hex.q, hex.r)) return result(cost, 'pick a hex on the map');
  const distance = hexDistance(unit, hex);
  if (distance === 0) return result(cost, 'not at his own feet');
  if (distance > range) return result(cost, `too far — ${range} hexes at most`);
  return result(cost, null);
}

/**
 * Stabilise (SPEC.md §4): a full turn beside a wounded man. "Full turn" means
 * the helper has not spent any AP yet, and it costs his whole pool.
 */
export function checkStabilise(unit, patient) {
  const cost = unit ? unit.apMax : 0;
  if (!unit || !onBoard(unit)) return result(cost, 'not on the board');
  if (!patient || patient.id === unit.id) return result(cost, 'pick a wounded man beside him');
  if (!isWounded(patient)) return result(cost, `${patient.shortName} is not wounded`);
  if (hexDistance(unit, patient) !== 1) return result(cost, `${patient.shortName} is not beside him`);
  if (unit.ap === 0 || unit.ap < unit.apMax) return result(cost, 'takes a full turn — he has already spent AP');
  return result(cost, null);
}

/**
 * Pack up a parachute (SPEC.md §9): 1 AP, only his own, only standing on it.
 * Returns the usual check plus `parachute` when there is one here to pack.
 */
export function checkPackParachute(parachutes, unit, rules) {
  const cost = rules.actions.packParachute.apCost;
  const busy = canAct(unit, cost);
  if (busy) return result(cost, busy);
  // Anyone's, not only his own (M15, the operator's): a man on the hex packs it.
  if (!parachutes.some((p) => p.q === unit.q && p.r === unit.r)) return result(cost, 'no parachute on this hex');
  return result(cost, null);
}

/** Pick up a charge (SPEC.md §4): 1 AP, from his own hex, if he can carry one more. */
/**
 * Pass a charge (SPEC.md §4, M11b): the giver hands one of his charges to a
 * man beside him who can carry it. It costs the giver `passCharge.apCost`; the
 * man taking it pays nothing. With no `receiver`, whether he could pass to
 * anyone at all is the caller's to ask of each man in turn.
 */
export function checkPassCharge(giver, receiver, rules) {
  const cost = rules.actions.passCharge.apCost;
  const busy = canAct(giver, cost);
  if (busy) return result(cost, busy);
  if (giver.charges <= 0) return result(cost, 'carrying no charge');
  if (!receiver || receiver.id === giver.id) return result(cost, 'pick a man beside him');
  if (!onBoard(receiver)) return result(cost, `${receiver.shortName} is not on the board`);
  if (hexDistance(giver, receiver) !== 1) return result(cost, `${receiver.shortName} is not beside him`);
  if (!canCarryCharges(receiver)) return result(cost, `${receiver.shortName} is wounded — stabilise him first`);
  const room = chargeRoom(receiver, rules);
  if (room === 0) return result(cost, `${receiver.shortName} is a ${receiver.roleLabel.toLowerCase()}: he carries no charges`);
  if (receiver.charges >= room) return result(cost, `${receiver.shortName} cannot carry any more`);
  return result(cost, null);
}

export function checkPickUpCharge(droppedCharges, unit, rules) {
  const cost = rules.actions.pickUpCharge.apCost;
  const busy = canAct(unit, cost);
  if (busy) return result(cost, busy);
  if (!droppedCharges.some((c) => c.q === unit.q && c.r === unit.r)) return result(cost, 'no charge on this hex');
  if (!canCarryCharges(unit)) return result(cost, 'wounded — stabilise him first');
  if (unit.charges >= chargeRoom(unit, rules)) return result(cost, 'cannot carry any more');
  return result(cost, null);
}
