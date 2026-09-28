// Sabotage: objectives, charges, fuses and explosions (SPEC.md §7), and the
// two ways over or round them that are not a charge — cutting the exchange
// line and swimming the canal once the bridge is down (§4 Actions).
//
// Pure functions over plain data. Where objectives stand is data/map.json;
// what each kind needs, how far it blasts and how loud it is lives in
// data/rules.json objectives. Nothing here knows an objective by id: the
// bridge is special only because its kind says its hexes become canal.

import { hexDistance, NEIGHBOR_DIRS } from './hex.js';
import { columnOf, hexKey, isInPlay, isPassable, terrainAt, terrainIdAt } from './map.js';
import { applyHit, makeNoise } from './enemy.js';
import { applyHook } from './traits.js';
import { canAct, chargeCapacity, isWounded, occupiedHexes, onBoard, result, woundedLine } from './units.js';

// --- setup -------------------------------------------------------------------

/**
 * Check map.json objectives and exfil against rules.json. Called with both
 * files in hand (state.js createInitialState), since the kinds live in one and
 * the placements in the other.
 */
export function validateSabotage(map, rules, mapUrl = 'data/map.json', rulesUrl = 'data/rules.json') {
  const kinds = rules.objectives;
  if (!kinds || typeof kinds !== 'object') throw new Error(`${rulesUrl}: expected an "objectives" object of kinds`);
  for (const [id, kind] of Object.entries(kinds)) {
    for (const field of ['chargesNeeded', 'blastRadius', 'killRadius', 'alert']) {
      if (!Number.isInteger(kind[field]) || kind[field] < 0) {
        throw new Error(`${rulesUrl}: objectives.${id}.${field} must be a non-negative integer`);
      }
    }
    if (kind.killRadius > kind.blastRadius) throw new Error(`${rulesUrl}: objectives.${id}.killRadius must be no more than its blastRadius`);
    if (kind.chargesNeeded < 1) throw new Error(`${rulesUrl}: objectives.${id}.chargesNeeded must be at least 1`);
    if (typeof kind.cutLine !== 'boolean') throw new Error(`${rulesUrl}: objectives.${id}.cutLine must be true or false`);
    if (kind.destroyedTerrain !== null && !legendCharFor(map, kind.destroyedTerrain)) {
      throw new Error(`${rulesUrl}: objectives.${id}.destroyedTerrain "${kind.destroyedTerrain}" has no character in ${mapUrl} legend`);
    }
  }

  const hexList = (list, where, needPassable) => {
    if (!Array.isArray(list) || list.length === 0) throw new Error(`${where} must be a non-empty list of [q, r]`);
    list.forEach((hex, i) => {
      if (!Array.isArray(hex) || hex.length !== 2 || !hex.every(Number.isInteger)) {
        throw new Error(`${where}[${i}] must be a [q, r] pair of integers`);
      }
      if (!isInPlay(map, hex[0], hex[1])) throw new Error(`${where}[${i}] (${hex}) is off the map or out of play`);
      if (needPassable && !isPassable(terrainAt(map, hex[0], hex[1]))) {
        throw new Error(`${where}[${i}] (${hex}) is ${terrainIdAt(map, hex[0], hex[1])}, which nobody can stand on`);
      }
    });
  };

  if (!Array.isArray(map.objectives) || map.objectives.length === 0) throw new Error(`${mapUrl}: needs an "objectives" list`);
  const ids = new Set();
  const chargeHexes = new Set();
  map.objectives.forEach((o, i) => {
    const where = `${mapUrl}: objectives[${i}]`;
    if (typeof o.id !== 'string' || ids.has(o.id)) throw new Error(`${where} needs a unique "id"`);
    ids.add(o.id);
    if (typeof o.label !== 'string' || o.label === '') throw new Error(`${where} needs a "label"`);
    if (!kinds[o.kind]) throw new Error(`${where} has kind "${o.kind}", which ${rulesUrl} objectives does not define`);
    if (typeof o.primary !== 'boolean') throw new Error(`${where} needs "primary": true or false`);
    hexList(o.hexes, `${where} hexes`, false);
    hexList(o.chargeHexes, `${where} chargeHexes`, true);
    if (o.chargeHexes.length < kinds[o.kind].chargesNeeded) {
      throw new Error(`${where} needs ${kinds[o.kind].chargesNeeded} charges on separate hexes but lists ${o.chargeHexes.length} chargeHexes`);
    }
    for (const [q, r] of o.chargeHexes) {
      if (chargeHexes.has(hexKey(q, r))) throw new Error(`${where} charge hex (${q}, ${r}) belongs to two objectives`);
      chargeHexes.add(hexKey(q, r));
    }
  });
  if (map.objectives.filter((o) => o.primary).length !== 1) throw new Error(`${mapUrl}: exactly one objective must be "primary"`);
  hexList(map.exfil, `${mapUrl}: exfil`, true);

  for (const [id, kind] of Object.entries(kinds)) {
    const payoff = kind.payoff;
    if (!payoff || typeof payoff.noReserve !== 'boolean' || !Number.isInteger(payoff.withdrawPatrols) || payoff.withdrawPatrols < 0) {
      throw new Error(`${rulesUrl}: objectives.${id}.payoff needs "noReserve" (true or false) and "withdrawPatrols" (a whole number, 0 for none)`);
    }
    if (!Number.isInteger(kind.reinforcements) || kind.reinforcements < 0) {
      throw new Error(`${rulesUrl}: objectives.${id} needs "reinforcements" (a whole number, 0 for none)`);
    }
  }

  const swim = rules.actions?.swim;
  if (!swim || !(swim.requiresDestroyed === null || kinds[swim.requiresDestroyed]) || !map.terrain[swim.across]) {
    throw new Error(`${rulesUrl}: actions.swim needs "requiresDestroyed" (an objective kind, or null for none) and "across" (a terrain id)`);
  }
  if (!rules.alert.states.some((s) => s.id === rules.explosionFloor)) {
    throw new Error(`${rulesUrl}: "explosionFloor" must be an alert state id`);
  }
}

function legendCharFor(map, terrainId) {
  return Object.keys(map.legend).find((c) => map.legend[c] === terrainId) ?? null;
}

/** The objectives as mission state: placement plus what has happened to them. */
export function createObjectives(map) {
  return map.objectives.map((o) => ({
    id: o.id,
    label: o.label,
    kind: o.kind,
    primary: o.primary,
    hexes: o.hexes.map(([q, r]) => ({ q, r })),
    chargeHexes: o.chargeHexes.map(([q, r]) => ({ q, r })),
    detonated: 0, // charges that have gone off on it
    destroyed: false,
    cut: false, // destroyed by a scout cutting the line, not by a charge
  }));
}

export function kindOf(objective, rules) {
  return rules.objectives[objective.kind];
}

const onHex = (hex) => (h) => h.q === hex.q && h.r === hex.r;

/** The objective this hex is a charge hex of, or null. */
export function objectiveForChargeHex(objectives, hex) {
  return objectives.find((o) => o.chargeHexes.some(onHex(hex))) ?? null;
}

/** The objective whose footprint or charge hexes include this hex, for hover. */
export function objectiveAt(objectives, hex) {
  return objectives.find((o) => o.hexes.some(onHex(hex))) ?? objectiveForChargeHex(objectives, hex);
}

export function isExfil(map, hex) {
  return map.exfil.some(([q, r]) => q === hex.q && r === hex.r);
}

// --- the map as the demolitions have left it -----------------------------------

const effectiveMaps = new WeakMap();

/**
 * The map with every destroyed objective's hexes turned into its kind's
 * `destroyedTerrain` (a blown bridge becomes canal). Everything that paths or
 * looks — troopers, enemies, the readout — should be handed this, not the
 * loaded map. The same objectives list always gives back the same map object,
 * so callers can compare by identity.
 */
export function effectiveMap(map, objectives, rules) {
  const cached = effectiveMaps.get(objectives);
  if (cached && cached.base === map) return cached.map;
  let rows = map.rows;
  for (const o of objectives) {
    const terrain = kindOf(o, rules).destroyedTerrain;
    if (!o.destroyed || terrain === null) continue;
    const char = legendCharFor(map, terrain);
    rows = rows.map((row, r) => {
      const hexes = o.hexes.filter((h) => h.r === r);
      if (hexes.length === 0) return row;
      const chars = row.split('');
      for (const h of hexes) chars[columnOf(h.q, r)] = char;
      return chars.join('');
    });
  }
  const damaged = rows === map.rows ? map : { ...map, rows };
  effectiveMaps.set(objectives, { base: map, map: damaged });
  return damaged;
}

// --- checks --------------------------------------------------------------------

/** What placing a charge would cost this man and how long its fuse would be. */
export function chargeNumbers(unit, rules) {
  return {
    apCost: applyHook(unit, 'onPlaceCharge', 'apCost', rules.charges.placeApCost).value,
    fuse: applyHook(unit, 'onPlaceCharge', 'fuse', rules.charges.fuseTurns).value,
  };
}

/**
 * Place a charge (SPEC.md §4, §7): carrying one, on a charge hex of an
 * objective that still needs charges, with no charge already on that hex.
 * Adds `objective` and `fuse` to the usual { ok, cost, reason }.
 */
export function checkPlaceCharge(state, unit, rules) {
  const { apCost, fuse } = chargeNumbers(unit, rules);
  const out = (reason, objective = null) => ({ ...result(apCost, reason), fuse, objective });
  const busy = canAct(unit, apCost);
  if (busy) return out(busy);
  if (unit.charges <= 0) return out('carrying no charge');
  const objective = objectiveForChargeHex(state.objectives, unit);
  if (!objective) return out('not on a charge hex');
  if (objective.destroyed) return out(`${objective.label} is already destroyed`, objective);
  if (state.charges.some(onHex(unit))) return out('a charge is already set here', objective);
  const set = state.charges.filter((c) => c.objectiveId === objective.id).length;
  if (objective.detonated + set >= kindOf(objective, rules).chargesNeeded) return out(`${objective.label} has all the charges it needs`, objective);
  return out(null, objective);
}

/** A full turn: nothing spent yet, and it takes the whole pool. */
function fullTurn(unit) {
  if (!unit || !onBoard(unit)) return 'not on the board';
  if (unit.ap === 0 || unit.ap < unit.apMax) return 'takes a full turn — he has already spent AP';
  return null;
}

/** Cut the line (SPEC.md §4, §7): a scout, a full turn, on a charge hex of a cuttable objective. */
export function checkCutLine(state, unit, rules) {
  const cost = unit ? unit.apMax : 0;
  if (!unit || !rules.roles[unit.role].cutLine) return result(cost, `a ${unit ? unit.roleLabel.toLowerCase() : 'trooper'} cannot cut the line`);
  const objective = objectiveForChargeHex(state.objectives, unit);
  if (!objective || !kindOf(objective, rules).cutLine) {
    const cuttable = state.objectives.find((o) => kindOf(o, rules).cutLine);
    return result(cost, `not on a charge point of ${cuttable ? `the ${cuttable.label.toLowerCase()}` : 'anything he can cut'}`);
  }
  if (objective.destroyed) return result(cost, `${objective.label} is already destroyed`);
  if (state.charges.some((c) => c.objectiveId === objective.id)) return result(cost, 'a charge is already set on it');
  // Said plainly (M20: a playtester took it for being seen, as a man who has
  // just walked onto the point is often spotted there): it wants a whole turn.
  const busy = fullTurn(unit);
  if (busy && onBoard(unit) && unit.ap > 0) return { ...result(cost, 'it takes his whole turn, and he has spent AP getting here — stay on this point and cut it at the start of next turn'), objective };
  return { ...result(cost, busy), objective };
}

/**
 * The hexes this man could swim to (SPEC.md §4, M16): any free hex on the far
 * bank that shares a hex of water with his own — across one canal hex, at any
 * angle, not only straight over (straight over offered one landing, often not
 * the nearest). Never onto a crossing (`swim.crossings`, the bridge and the
 * lock): that is not a bank, and the lock sits in the water, so it offered a
 * swim onto water. The far bank is the ground he cannot walk to without a
 * crossing. A man on a crossing walks off it to swim.
 */
export function swimTargets(map, state, unit, rules) {
  const { across, crossings } = rules.actions.swim;
  const isCrossing = (q, r) => crossings.includes(terrainIdAt(map, q, r));
  if (isCrossing(unit.q, unit.r)) return [];
  const blocked = occupiedHexes(state.units, unit.id, state.enemies);
  const bank = bankOf(map, unit, isCrossing);
  const targets = new Map();
  for (const d of NEIGHBOR_DIRS) {
    const water = { q: unit.q + d.q, r: unit.r + d.r };
    if (terrainIdAt(map, water.q, water.r) !== across) continue;
    for (const e of NEIGHBOR_DIRS) {
      const land = { q: water.q + e.q, r: water.r + e.r };
      const key = hexKey(land.q, land.r);
      if (targets.has(key) || bank.has(key)) continue;
      if (!isInPlay(map, land.q, land.r) || !isPassable(terrainAt(map, land.q, land.r))) continue;
      if (isCrossing(land.q, land.r) || blocked.has(key)) continue;
      targets.set(key, land);
    }
  }
  return [...targets.values()];
}

// The ground a man can walk to from where he stands without using a crossing:
// his own bank.
function bankOf(map, from, isCrossing) {
  const seen = new Set([hexKey(from.q, from.r)]);
  const queue = [from];
  while (queue.length) {
    const h = queue.pop();
    for (const d of NEIGHBOR_DIRS) {
      const n = { q: h.q + d.q, r: h.r + d.r };
      const key = hexKey(n.q, n.r);
      if (seen.has(key) || !isInPlay(map, n.q, n.r) || !isPassable(terrainAt(map, n.q, n.r)) || isCrossing(n.q, n.r)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

/** Swim (SPEC.md §4): a full turn, not wounded, and only once `requiresDestroyed` is down if it names one. */
export function checkSwim(map, state, unit, target, rules) {
  const cost = unit ? unit.apMax : 0;
  const needed = rules.actions.swim.requiresDestroyed;
  if (needed && !state.objectives.some((o) => o.kind === needed && o.destroyed)) {
    return result(cost, `only once the ${rules.objectives[needed].label.toLowerCase()} is down`);
  }
  const busy = fullTurn(unit);
  if (busy) return result(cost, busy);
  if (isWounded(unit)) return result(cost, 'wounded — he would drown');
  const targets = swimTargets(map, state, unit, rules);
  if (rules.actions.swim.crossings.includes(terrainIdAt(map, unit.q, unit.r))) return result(cost, `he is on the ${terrainAt(map, unit.q, unit.r).label.toLowerCase()} — step onto a bank to swim`);
  if (targets.length === 0) return result(cost, 'no far bank one hex of water away');
  if (target && !targets.some(onHex(target))) return result(cost, 'pick a hex on the far bank');
  return result(cost, null);
}

// --- the charges that are enough to finish the primary ------------------------

/**
 * Charges that could still end up on the primary: carried by men in the field,
 * lying dropped, or already set on it and burning. With the ones that have
 * gone off, if that is short of what it needs the mission cannot succeed.
 */
export function primaryShortfall(state, rules) {
  const primary = state.objectives.find((o) => o.primary);
  if (primary.destroyed) return 0;
  const carried = state.units.filter(onBoard).reduce((n, u) => n + u.charges, 0);
  const set = state.charges.filter((c) => c.objectiveId === primary.id).length;
  // A charge on the ground counts only while a man still in the field could
  // carry it (M13): with both sappers and Ox dead, a scout or gunner can never
  // pick one up, and the mission must end rather than drag on.
  const carrier = state.units.some((u) => onBoard(u) && chargeCapacity(u, rules) > 0);
  const have = primary.detonated + set + carried + (carrier ? state.droppedCharges.length : 0);
  return Math.max(0, kindOf(primary, rules).chargesNeeded - have);
}

// --- fuse phase ----------------------------------------------------------------

/**
 * Phase 4 (SPEC.md §4, §7). Every fuse burns down one; a charge at 0 goes off.
 * Charges on one objective going off in the same phase are one explosion: one
 * alert rise, one noise, heard from the objective in the next enemy phase. An
 * objective is destroyed once as many of its charges have gone off as its kind
 * needs. A trooper within the kind's killRadius of a charge that goes off
 * dies, wounded or not, leaving a body; one further off but inside its blast
 * radius takes a hit (M20). An enemy of a killable type anywhere in the blast
 * dies, with no body, since the explosion itself is what the garrison hears.
 * An enemy that cannot be killed (the reserve, enemies.json) is not harmed.
 */
export function runFusePhase(state, rules) {
  const events = [];
  const burning = state.charges.map((c) => ({ ...c, fuse: c.fuse - 1 }));
  const going = burning.filter((c) => c.fuse <= 0);
  let next = { ...state, charges: burning.filter((c) => c.fuse > 0) };
  if (going.length === 0) return { state: next, events };

  for (const objective of state.objectives) {
    const charges = going.filter((c) => c.objectiveId === objective.id);
    if (charges.length === 0) continue;
    const kind = kindOf(objective, rules);
    const detonated = objective.detonated + charges.length;
    const destroyed = detonated >= kind.chargesNeeded;
    next = {
      ...next,
      explosions: next.explosions + 1,
      objectives: next.objectives.map((o) => (o.id === objective.id ? { ...o, detonated, destroyed } : o)),
    };
    // Every charge that went off, and its blast radius, so the board can
    // show each bang where it happened, as big as it was (M11).
    events.push({
      kind: 'explosion', label: objective.label, destroyed, q: charges[0].q, r: charges[0].r,
      at: charges.map((c) => ({ q: c.q, r: c.r })), blastRadius: kind.blastRadius,
    });

    const centre = objective.hexes[Math.floor(objective.hexes.length / 2)];
    const noise = makeNoise(next, 'explosion', centre, kind.alert, rules);
    next = noise.state;
    events.push(...noise.events);

    for (const unit of next.units) {
      if (!onBoard(unit)) continue;
      const effect = blastEffect(charges.map((c) => ({ q: c.q, r: c.r, radius: kind.blastRadius, killRadius: kind.killRadius })), unit);
      if (!effect) continue;
      const hit = effect === 'wounded' ? applyHit(unit, rules) : null;
      if (hit && !hit.dead) {
        // The edge of the blast (M20): a hit, as from a shot, but nobody has
        // him in their sights for it. His charges drop on his hex.
        next = woundInBlast(next, unit, { ...hit, inContact: unit.inContact });
        events.push({ kind: 'blastWounded', unitId: unit.id, unitName: unit.shortName, label: objective.label, line: woundedLine(unit) });
        continue;
      }
      next = killInBlast(next, unit);
      events.push({ kind: 'blastKilled', unitId: unit.id, unitName: unit.shortName, label: objective.label });
    }
    const caught = next.enemies.filter((e) => e.killable && charges.some((c) => hexDistance(c, e) <= kind.blastRadius));
    if (caught.length > 0) {
      next = { ...next, enemies: next.enemies.filter((e) => !caught.includes(e)) };
      for (const e of caught) events.push({ kind: 'enemyBlastKilled', enemyId: e.id, enemyLabel: e.label, label: objective.label, q: e.q, r: e.r });
    }
    if (destroyed) {
      const paid = applyPayoff(next, objective, rules);
      next = paid.state;
      events.push(...paid.events);
    }
  }
  return { state: next, events };
}

/**
 * What destroying a bonus target does for the stick (SPEC.md §7, M11b), by
 * its kind's `payoff` in rules.json — never a branch for one objective. Called
 * once, when it is destroyed, whether blown or cut. `noReserve`: the reserve
 * is never called up (one already out stays). `withdrawPatrols`: that many
 * patrols, nearest the objective first, leave the board. And its cost
 * (M21b, Hard): `reinforcements` squads are called up, to come on in the next
 * enemy phase — none once the exchange's noReserve has cut the telephones.
 */
export function applyPayoff(state, objective, rules) {
  const { noReserve, withdrawPatrols } = kindOf(objective, rules).payoff;
  const calls = kindOf(objective, rules).reinforcements ?? 0;
  const events = [];
  let next = state;
  const centre = objective.hexes[Math.floor(objective.hexes.length / 2)];
  if (noReserve && !next.reserveCancelled) {
    next = { ...next, reserveCancelled: true };
    events.push({ kind: 'noReserve', label: objective.label, deployed: next.reserveDeployed, q: centre.q, r: centre.r });
  }
  if (withdrawPatrols > 0) {
    const leaving = next.enemies
      .filter((e) => e.speed > 0 && e.killable)
      .sort((a, b) => hexDistance(a, centre) - hexDistance(b, centre))
      .slice(0, withdrawPatrols);
    if (leaving.length) {
      next = { ...next, enemies: next.enemies.filter((e) => !leaving.includes(e)) };
      for (const e of leaving) events.push({ kind: 'withdrawn', enemyId: e.id, enemyLabel: e.label, label: objective.label, q: e.q, r: e.r });
    }
  }
  if (calls > 0 && !next.reserveCancelled) {
    next = { ...next, reinforcementsDue: (next.reinforcementsDue ?? 0) + calls };
    events.push({ kind: 'reinforcementsCalled', count: calls, label: objective.label, q: centre.q, r: centre.r });
  }
  return { state: next, events };
}

function killInBlast(state, unit) {
  return {
    ...state,
    units: state.units.map((u) => (
      u.id === unit.id ? { ...u, dead: true, ap: 0, apMax: 0, charges: 0, hidden: false, inContact: false } : u
    )),
    bodies: [...state.bodies, { unitId: unit.id, name: unit.shortName, q: unit.q, r: unit.r, found: false }],
    droppedCharges: [...state.droppedCharges, ...Array.from({ length: unit.charges }, () => ({ q: unit.q, r: unit.r }))],
  };
}

function woundInBlast(state, unit, hit) {
  return {
    ...state,
    units: state.units.map((u) => (u.id === unit.id ? { ...u, ...hit } : u)),
    droppedCharges: [...state.droppedCharges, ...Array.from({ length: unit.charges }, () => ({ q: unit.q, r: unit.r }))],
  };
}

/** The charges going off in the coming fuse phase, each with how far it blasts and how far it kills a man. */
export function blastHexesThisTurn(state, rules) {
  const hexes = [];
  for (const c of state.charges) {
    if (c.fuse > 1) continue;
    const kind = kindOf(state.objectives.find((o) => o.id === c.objectiveId), rules);
    hexes.push({ q: c.q, r: c.r, radius: kind.blastRadius, killRadius: kind.killRadius });
  }
  return hexes;
}

export function inBlast(blasts, hex) {
  return blasts.some((b) => hexDistance(b, hex) <= b.radius);
}

/**
 * What these blasts do to a trooper on this hex: 'killed' within any one's
 * killRadius, 'wounded' elsewhere inside one (a hit: it kills a man already
 * wounded), or null outside them all.
 */
export function blastEffect(blasts, hex) {
  if (blasts.some((b) => hexDistance(b, hex) <= (b.killRadius ?? b.radius))) return 'killed';
  return inBlast(blasts, hex) ? 'wounded' : null;
}
