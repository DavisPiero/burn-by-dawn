// Enemies: where they look, who they see, how they move, and the garrison
// alert that drives them. SPEC.md §4 (turn phases) and §6.
//
// Pure functions over plain data. Nothing here touches the DOM, and no number
// is written down here: enemy types are data/enemies.json, placements and
// routes are data/map.json, detection and alert are data/rules.json.
//
// There are no dice. Detection is a sum compared to a threshold, so the hover
// readout can show the player exactly what the detection phase will do — "the
// player must see risk before committing" (§6).

import { DIRECTION_NAMES, directionOf, hexDistance, inArc } from './hex.js';
import { enterCost, findPath, forEachCell, hasLineOfSight, hexKey, isInPlay, terrainAt } from './map.js';
import { applyHook } from './traits.js';

const DIRECTIONS = DIRECTION_NAMES.length;

// --- setup -------------------------------------------------------------------

/** One enemy from a placement in map.json and its type from enemies.json. */
function makeEnemy(placement, type, at) {
  return {
    id: placement.id,
    label: placement.label,
    type: placement.type,
    typeLabel: type.label,
    visionRadius: type.visionRadius,
    arcDegrees: type.arcDegrees,
    detection: type.detection,
    speed: type.speed,
    q: at[0],
    r: at[1],
    facing: DIRECTION_NAMES.indexOf(placement.facing),
    route: placement.route ? placement.route.map(([q, r]) => ({ q, r })) : null,
    loop: placement.loop === true,
    // Index of the waypoint it is walking to, and which way along the route it
    // is going (a non-looping route turns round at either end).
    waypoint: 0,
    routeStep: 1,
  };
}

/** The starting enemies. map.js loadMap has already validated the placements. */
export function createEnemies(map) {
  return map.enemies.map((placement) => makeEnemy(
    placement,
    map.enemyTypes[placement.type],
    placement.route ? placement.route[0] : placement.at,
  ));
}

export function createAlert() {
  return { points: 0, quietTurns: 0, raisedThisTurn: false };
}

// --- alert -------------------------------------------------------------------

/** Index into rules.alert.states of the state these points are in. */
export function alertIndex(points, rules) {
  const states = rules.alert.states;
  let index = 0;
  states.forEach((s, i) => { if (points >= s.from) index = i; });
  return index;
}

export function alertStateOf(points, rules) {
  return rules.alert.states[alertIndex(points, rules)];
}

/**
 * Raise the alert. Points cap at the top state's threshold: past Alarmed
 * there is nowhere left to go, and uncapped points would make decay take
 * several quiet spells to shift a single step. Any raise, even one the cap
 * swallows, spoils the turn for decay.
 */
export function raiseAlert(alert, amount, rules) {
  const states = rules.alert.states;
  const cap = states[states.length - 1].from;
  return { ...alert, points: Math.min(cap, alert.points + amount), raisedThisTurn: true };
}

/**
 * Phase 5 (SPEC.md §4): after `quietTurnsToDecay` turns with no rise, drop to
 * the start of the state below. In Calm, points short of Suspicious fall to 0
 * without an event: the state has not changed. The explosion floor (never
 * below Suspicious once something has gone off) arrives with explosions at M5b.
 */
export function decayAlert(state, rules) {
  const events = [];
  let { points, quietTurns } = state.alert;
  quietTurns = state.alert.raisedThisTurn ? 0 : quietTurns + 1;
  const index = alertIndex(points, rules);
  if (quietTurns >= rules.alert.quietTurnsToDecay && index > 0) {
    const to = rules.alert.states[index - 1];
    events.push({ kind: 'alertDecay', from: rules.alert.states[index].label, to: to.label });
    points = to.from;
    quietTurns = 0;
  } else if (quietTurns >= rules.alert.quietTurnsToDecay && points > 0) {
    points = 0;
    quietTurns = 0;
  }
  return { state: { ...state, alert: { points, quietTurns, raisedThisTurn: false } }, events };
}

// --- vision ------------------------------------------------------------------

/** Vision radius right now: type, plus the alert state, plus high ground. */
export function visionRadiusOf(map, enemy, alertPoints, rules) {
  const terrain = terrainAt(map, enemy.q, enemy.r);
  return enemy.visionRadius + alertStateOf(alertPoints, rules).visionBonus + (terrain?.spotBonus ?? 0);
}

/** Can this enemy see this hex: in range, in its arc, and a clear line. */
export function canSee(map, enemy, hex, radius) {
  const distance = hexDistance(enemy, hex);
  if (distance === 0 || distance > radius) return false;
  if (!inArc(enemy, enemy.facing, hex, enemy.arcDegrees)) return false;
  return hasLineOfSight(map, enemy, hex);
}

/** Every in-play hex this enemy can see, as a Map of hexKey -> {q, r}. */
export function visibleHexes(map, enemy, alertPoints, rules) {
  const radius = visionRadiusOf(map, enemy, alertPoints, rules);
  const seen = new Map();
  forEachCell(map, (q, r) => {
    if (!isInPlay(map, q, r) || hexDistance(enemy, { q, r }) > radius) return;
    if (canSee(map, enemy, { q, r }, radius)) seen.set(hexKey(q, r), { q, r });
  });
  return seen;
}

// --- detection ---------------------------------------------------------------

/**
 * The detection score one enemy gets against one trooper standing on one hex,
 * with every term of SPEC.md §6's sum kept so the readout can show the maths:
 *
 *   base(enemy) - cover(terrain) - concealment(trooper) + proximity
 *
 * then the onDetectionCheck hook. Null if the enemy cannot see the hex at all.
 */
export function detectionScore(map, rules, enemy, alertPoints, unit, hex) {
  const radius = visionRadiusOf(map, enemy, alertPoints, rules);
  if (!canSee(map, enemy, hex, radius)) return null;

  const distance = hexDistance(enemy, hex);
  const terrain = terrainAt(map, hex.q, hex.r);
  const cover = rules.detection.cover[terrain.cover] ?? 0;
  const concealment = rules.roles[unit.role].concealment;
  const proximity = rules.detection.proximity[distance] ?? 0;
  const raw = enemy.detection - cover - concealment + proximity;
  const hooked = applyHook(unit, 'onDetectionCheck', 'detection', raw);
  const threshold = rules.detection.threshold;

  return {
    enemyId: enemy.id,
    enemyLabel: enemy.label,
    distance,
    base: enemy.detection,
    cover,
    coverLabel: terrain.cover,
    concealment,
    proximity,
    trait: hooked.value - raw,
    score: hooked.value,
    threshold,
    spotted: hooked.value >= threshold,
  };
}

/**
 * The worst detection this trooper would face on this hex from any enemy: the
 * highest score, first enemy in data order on a tie. Null if nobody sees it.
 */
export function detectionAt(map, rules, enemies, alertPoints, unit, hex) {
  let worst = null;
  for (const enemy of enemies) {
    const result = detectionScore(map, rules, enemy, alertPoints, unit, hex);
    if (result && (!worst || result.score > worst.score)) worst = result;
  }
  return worst;
}

/**
 * The hexes a trooper is tested on this turn: every hex he entered, or the one
 * he is standing on if he never moved. The hex he started from is not tested
 * once he has left it — a patrol that walked up beside him in the enemy phase
 * had not seen him yet, and he gets his turn to slip away.
 */
export function testedHexes(unit) {
  return unit.trail && unit.trail.length > 0 ? unit.trail : [{ q: unit.q, r: unit.r }];
}

/**
 * Phase 2 (SPEC.md §4). Every enemy tests every trooper, against the arcs as
 * they stood all through the player phase. Each trooper spotted raises the
 * alert once, however many enemies or hexes saw him. The last known contact
 * is the hex of the surest sighting this turn — the highest score, and for
 * one man the latest hex he was seen on.
 */
export function runDetection(state, map, rules) {
  const events = [];
  let alert = state.alert;
  let contact = state.contact;
  let best = null;

  for (const unit of state.units) {
    let seenAt = null;
    for (const hex of testedHexes(unit)) {
      const result = detectionAt(map, rules, state.enemies, state.alert.points, unit, hex);
      if (result && result.spotted) seenAt = { hex, result };
    }
    if (!seenAt) continue;

    events.push({
      kind: 'spotted', unitId: unit.id, unitName: unit.shortName,
      enemyLabel: seenAt.result.enemyLabel, q: seenAt.hex.q, r: seenAt.hex.r, score: seenAt.result.score,
    });
    alert = raiseAlert(alert, rules.alert.spotted, rules);
    if (!best || seenAt.result.score > best.result.score) best = seenAt;
  }

  if (best) contact = { q: best.hex.q, r: best.hex.r, searched: false };
  pushAlertChange(events, state.alert.points, alert.points, rules);
  return { state: { ...state, alert, contact }, events };
}

function pushAlertChange(events, before, after, rules) {
  const from = alertIndex(before, rules);
  const to = alertIndex(after, rules);
  if (from !== to) {
    events.push({ kind: 'alertRise', from: rules.alert.states[from].label, to: rules.alert.states[to].label });
  }
}

// --- enemy phase -------------------------------------------------------------

/**
 * Phase 3 (SPEC.md §4). What each enemy does depends on the alert state:
 *
 *   Calm        walk the route.
 *   Suspicious  walk, but stop and sweep every `suspiciousPauseEvery`-th turn.
 *   Alert       the `alertConverge` nearest moving enemies head for the last
 *               known contact; the rest walk.
 *   Alarmed     every moving enemy heads for it, and the reserve squad enters.
 *
 * Whoever reaches the contact sweeps, the contact is marked searched, and from
 * the next phase everyone goes back to their route. Enemies move one at a time
 * in data order and cannot pass through troopers or each other.
 */
export function runEnemyPhase(state, map, rules) {
  const events = [];
  const stateId = alertStateOf(state.alert.points, rules).id;
  let enemies = state.enemies;
  let reserveDeployed = state.reserveDeployed;

  if (stateId === 'alarmed' && !reserveDeployed) {
    const placed = deployReserve(map, state.units, enemies);
    if (placed) {
      enemies = [...enemies, placed];
      reserveDeployed = true;
      events.push({ kind: 'reserve', label: placed.label, q: placed.q, r: placed.r });
    }
  }

  const hunters = chooseHunters(enemies, state.contact, stateId, rules);
  const pauses = stateId === 'suspicious' && state.turn % rules.patrols.suspiciousPauseEvery === 0;
  let contact = state.contact;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.speed === 0) continue;
    const blocked = blockedFor(state.units, enemies, enemy.id);
    let moved = enemy;

    if (hunters.has(enemy.id)) {
      const result = walkToward(map, enemy, state.contact, blocked, enemy.speed, rules);
      moved = result.enemy;
      if (result.arrived || result.stuck) {
        moved = sweep(moved, rules);
        if (!contact.searched) {
          contact = { ...contact, searched: true };
          events.push({ kind: 'searched', label: enemy.label, q: contact.q, r: contact.r });
        }
      }
    } else if (pauses) {
      moved = sweep(enemy, rules);
    } else if (enemy.route) {
      moved = walkRoute(map, enemy, blocked, rules);
    }
    enemies = enemies.map((e, j) => (j === i ? moved : e));
  }

  return { state: { ...state, enemies, contact, reserveDeployed }, events };
}

function chooseHunters(enemies, contact, stateId, rules) {
  if (!contact || contact.searched) return new Set();
  const mobile = enemies.filter((e) => e.speed > 0);
  if (stateId === 'alarmed') return new Set(mobile.map((e) => e.id));
  if (stateId !== 'alert') return new Set();
  // Nearest by hex distance; Array.sort is stable, so ties go to data order.
  return new Set(
    [...mobile]
      .sort((a, b) => hexDistance(a, contact) - hexDistance(b, contact))
      .slice(0, rules.patrols.alertConverge)
      .map((e) => e.id),
  );
}

function deployReserve(map, units, enemies) {
  const reserve = map.reserve;
  const taken = blockedFor(units, enemies, null);
  const free = reserve.entryHexes.find(([q, r]) => !taken.has(hexKey(q, r)));
  return free ? makeEnemy(reserve, map.enemyTypes[reserve.type], free) : null;
}

/** Hexes this enemy may not enter: every trooper and every other enemy. */
function blockedFor(units, enemies, exceptId) {
  const blocked = new Set(units.map((u) => hexKey(u.q, u.r)));
  for (const e of enemies) if (e.id !== exceptId) blocked.add(hexKey(e.q, e.r));
  return blocked;
}

function sweep(enemy, rules) {
  return { ...enemy, facing: (enemy.facing + rules.patrols.sweepRotation) % DIRECTIONS };
}

/**
 * Walk toward `goal` for up to `budget` movement points, on the same terrain
 * costs a trooper pays, facing the way it last stepped. If the goal itself is
 * occupied it walks up beside it. `minimumStep` applies as it does to
 * troopers: with nothing spent yet, one step is always allowed.
 *
 * Returns { enemy, spent, arrived, stuck }: `arrived` is standing on the goal
 * or beside an occupied one; `stuck` is no route at all.
 */
export function walkToward(map, enemy, goal, blocked, budget, rules) {
  const goalKey = hexKey(goal.q, goal.r);
  const occupiedGoal = blocked.has(goalKey);
  const arrivedAt = (e) => (e.q === goal.q && e.r === goal.r) || (occupiedGoal && hexDistance(e, goal) === 1);
  if (arrivedAt(enemy)) return { enemy, spent: 0, arrived: true, stuck: false };

  // Path as if the goal were free, so an occupied goal still gives a route to
  // walk up to; the walk below stops before any hex that is actually taken.
  const open = new Set(blocked);
  open.delete(goalKey);
  const path = findPath(map, enemy, goal, open);
  if (!path) return { enemy, spent: 0, arrived: false, stuck: true };

  let current = enemy;
  let spent = 0;
  for (let i = 1; i < path.length; i++) {
    const next = path[i];
    if (blocked.has(hexKey(next.q, next.r))) break;
    const cost = enterCost(map, next.q, next.r, null);
    const firstStep = spent === 0 && rules.minimumStep;
    if (spent + cost > budget && !firstStep) break;
    current = { ...current, q: next.q, r: next.r, facing: directionOf(current, next) };
    spent += cost;
    if (spent >= budget) break;
  }
  return { enemy: current, spent, arrived: arrivedAt(current), stuck: false };
}

/** Walk the route, carrying on past each waypoint while movement is left. */
export function walkRoute(map, enemy, blocked, rules) {
  let current = enemy;
  let budget = enemy.speed;
  // Each pass either reaches a waypoint or stops, so the route length bounds it.
  for (let guard = 0; guard <= current.route.length + 1; guard++) {
    const target = current.route[current.waypoint];
    if (current.q === target.q && current.r === target.r) {
      current = nextWaypoint(current);
      continue;
    }
    if (budget <= 0) break;
    const result = walkToward(map, current, target, blocked, budget, rules);
    current = result.enemy;
    budget -= result.spent;
    if (current.q !== target.q || current.r !== target.r) break;
  }
  return current;
}

function nextWaypoint(enemy) {
  const n = enemy.route.length;
  if (enemy.loop) return { ...enemy, waypoint: (enemy.waypoint + 1) % n };
  let step = enemy.routeStep;
  if (enemy.waypoint + step < 0 || enemy.waypoint + step >= n) step = -step;
  return { ...enemy, waypoint: enemy.waypoint + step, routeStep: step };
}

/**
 * The ground a patrol's route actually covers, hex by hex: the path between
 * each pair of waypoints, closed back to the start if it loops. Troopers are
 * ignored, since they come and go; this is the route the player should expect
 * the patrol to walk. Null for an enemy with no route.
 */
export function routePath(map, enemy) {
  if (!enemy.route) return null;
  const stops = enemy.loop ? [...enemy.route, enemy.route[0]] : enemy.route;
  const hexes = [stops[0]];
  for (let i = 1; i < stops.length; i++) {
    const leg = findPath(map, stops[i - 1], stops[i], null) ?? [stops[i - 1], stops[i]];
    hexes.push(...leg.slice(1));
  }
  return { hexes, waypoints: enemy.route };
}
