// Enemies: where they look, who they see, who they shoot, how they move, what
// they hear, and the garrison alert that drives them. SPEC.md §4 (turn phases),
// §5 (wounds) and §6.
//
// Pure functions over plain data. Nothing here touches the DOM, and no number
// is written down here: enemy types are data/enemies.json, placements and
// routes are data/map.json, detection and alert are data/rules.json.
//
// There are no dice. Detection is a sum compared to a threshold, so the hover
// readout can show the player exactly what the detection phase will do — "the
// player must see risk before committing" (§6).

import { DIRECTION_NAMES, directionOf, facingToward, hexDistance, inArc } from './hex.js';
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
    // Where a sentry looks when nothing has turned it (SPEC.md §6 Noise).
    homeFacing: DIRECTION_NAMES.indexOf(placement.facing),
    turned: false,
    route: placement.route ? placement.route.map(([q, r]) => ({ q, r })) : null,
    loop: placement.loop === true,
    // Index of the waypoint it is walking to, and which way along the route it
    // is going (a non-looping route turns round at either end).
    waypoint: 0,
    routeStep: 1,
    // SPEC.md §6. `investigating` is a noise it is walking to; `holding` is the
    // trooper it spotted at the detection check, and `watching` is the same
    // man through the player phase that follows, so the board can show who
    // has him. `suppressed` is a gunner's fire, for one go (SPEC.md §4).
    investigating: null,
    holding: null,
    watching: null,
    suppressed: false,
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
 *   base(enemy) - cover(terrain) - concealment(trooper) - hidden + proximity
 *
 * then the onDetectionCheck hook. `hidden` is the hide action's concealment,
 * and only counts on the hex he is hiding on (SPEC.md §4): hexes he walked
 * through earlier are tested without it. Null if the enemy cannot see the hex.
 */
export function detectionScore(map, rules, enemy, alertPoints, unit, hex) {
  const radius = visionRadiusOf(map, enemy, alertPoints, rules);
  if (!canSee(map, enemy, hex, radius)) return null;

  const distance = hexDistance(enemy, hex);
  const terrain = terrainAt(map, hex.q, hex.r);
  const cover = rules.detection.cover[terrain.cover] ?? 0;
  const concealment = rules.roles[unit.role].concealment;
  const hidden = unit.hidden && unit.q === hex.q && unit.r === hex.r ? rules.actions.hide.concealment : 0;
  const proximity = rules.detection.proximity[distance] ?? 0;
  const raw = enemy.detection - cover - concealment - hidden + proximity;
  const hooked = applyHook(unit, 'onDetectionCheck', 'detection', raw);
  const threshold = rules.detection.threshold;

  return {
    enemyId: enemy.id,
    enemyLabel: enemy.label,
    suppressed: enemy.suppressed === true,
    distance,
    base: enemy.detection,
    cover,
    coverLabel: terrain.cover,
    concealment,
    hidden,
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
 *
 * It also carries who would spot him there (`spotters`) and whether any of
 * them is free to shoot (`firing`): a suppressed enemy still spots, but does
 * not fire (SPEC.md §4). Whether he is actually shot depends on his being in
 * contact already — see runDetection.
 */
export function detectionAt(map, rules, enemies, alertPoints, unit, hex) {
  let worst = null;
  const spotters = [];
  let firing = false;
  for (const enemy of enemies) {
    const result = detectionScore(map, rules, enemy, alertPoints, unit, hex);
    if (!result) continue;
    if (result.spotted) {
      spotters.push(enemy.id);
      if (!result.suppressed) firing = true;
    }
    if (!worst || result.score > worst.score) worst = result;
  }
  return worst ? { ...worst, spotters, firing } : null;
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
 * Phase 2 (SPEC.md §4 and §6 "Contact and enemy fire"). Every enemy tests
 * every living trooper, against the arcs as they stood all through the
 * player phase.
 *
 * - A trooper spotted raises the alert once, however many enemies or hexes
 *   saw him, makes a noise where he was seen, and is in contact. Every enemy
 *   that spotted him holds and faces him in the enemy phase.
 * - A trooper who was already in contact and is spotted again by an enemy
 *   that is not suppressed is shot: one hit, never more than one a turn.
 * - A trooper nobody spots is out of contact.
 *
 * The noises are queued for the enemy phase, surest sighting last, so it is
 * the one that becomes the last known contact.
 */
export function runDetection(state, map, rules) {
  const events = [];
  let alert = state.alert;
  let enemies = state.enemies.map((e) => ({ ...e, holding: null, watching: null }));
  let units = state.units;
  let bodies = state.bodies;
  let droppedCharges = state.droppedCharges;
  const sightings = [];

  for (const unit of state.units) {
    if (unit.dead) continue;
    let seenAt = null;
    let firing = false;
    const firers = new Set();
    for (const hex of testedHexes(unit)) {
      const result = detectionAt(map, rules, state.enemies, state.alert.points, unit, hex);
      if (!result || !result.spotted) continue;
      seenAt = { hex, result };
      if (result.firing) firing = true;
      for (const id of result.spotters) {
        enemies = enemies.map((e) => (e.id === id ? { ...e, holding: { unitId: unit.id, q: hex.q, r: hex.r } } : e));
        if (!state.enemies.find((e) => e.id === id).suppressed) firers.add(id);
      }
    }

    if (!seenAt) {
      if (unit.inContact) units = updateUnit(units, unit.id, { inContact: false });
      continue;
    }

    events.push({
      kind: 'spotted', unitId: unit.id, unitName: unit.shortName,
      enemyLabel: seenAt.result.enemyLabel, q: seenAt.hex.q, r: seenAt.hex.r, score: seenAt.result.score,
    });
    alert = raiseAlert(alert, rules.alert.spotted, rules);
    sightings.push(seenAt);

    if (unit.inContact && firing) {
      const shot = applyHit(unit, rules);
      const labels = state.enemies.filter((e) => firers.has(e.id)).map((e) => e.label);
      events.push({
        kind: shot.dead ? 'killed' : 'wounded', unitId: unit.id, unitName: unit.shortName,
        by: labels, line: shot.dead ? null : unit.dialogue?.onWounded ?? null,
      });
      if (unit.charges > 0) {
        droppedCharges = [...droppedCharges, ...Array.from({ length: unit.charges }, () => ({ q: unit.q, r: unit.r }))];
      }
      if (shot.dead) bodies = [...bodies, { unitId: unit.id, name: unit.shortName, q: unit.q, r: unit.r, found: false }];
      units = updateUnit(units, unit.id, shot);
    } else {
      units = updateUnit(units, unit.id, { inContact: true });
    }
  }

  // A dead man holds nobody's attention.
  const living = new Set(units.filter((u) => !u.dead).map((u) => u.id));
  enemies = enemies.map((e) => (e.holding && !living.has(e.holding.unitId) ? { ...e, holding: null } : e));

  sightings.sort((a, b) => a.result.score - b.result.score);
  const noises = [...state.noises, ...sightings.map((s) => ({ kind: 'spotted', q: s.hex.q, r: s.hex.r }))];

  pushAlertChange(events, state.alert.points, alert.points, rules);
  return { state: { ...state, alert, enemies, units, bodies, droppedCharges, noises }, events };
}

/**
 * One hit (SPEC.md §5 Wounds): the first wounds, `hitsToKill` kills. Either
 * way his charges leave him — runDetection drops them on his hex — and a
 * wounded man is no longer stabilised, because this is a new wound.
 */
function applyHit(unit, rules) {
  const hits = unit.hits + 1;
  const dead = hits >= rules.combat.hitsToKill;
  return {
    hits, dead, stabilised: false, charges: 0, hidden: false, inContact: !dead,
    ...(dead ? { ap: 0, apMax: 0 } : {}),
  };
}

function updateUnit(units, id, changes) {
  return units.map((u) => (u.id === id ? { ...u, ...changes } : u));
}

function pushAlertChange(events, before, after, rules) {
  const from = alertIndex(before, rules);
  const to = alertIndex(after, rules);
  if (from !== to) {
    events.push({ kind: 'alertRise', from: rules.alert.states[from].label, to: rules.alert.states[to].label });
  }
}

// --- noise -------------------------------------------------------------------

/** How far a noise of this kind carries right now. */
export function hearingRadius(kind, alertPoints, rules) {
  return rules.noise[kind] + alertStateOf(alertPoints, rules).hearingBonus;
}

/**
 * Who would react to a noise at `hex`: every enemy in earshot that is free to,
 * which is not a suppressed one. Sentries turn; everyone else goes to look.
 * Used by the enemy phase and by the hover readout for a thrown stone, so the
 * two cannot disagree.
 */
export function listeners(enemies, kind, hex, alertPoints, rules) {
  const radius = hearingRadius(kind, alertPoints, rules);
  return enemies.filter((e) => !e.suppressed && hexDistance(e, hex) <= radius);
}

/**
 * Queue a noise for the next enemy phase and raise the alert for it. The
 * actions of the player phase (a stone, gunfire) call this.
 */
export function makeNoise(state, kind, hex, alertAmount, rules) {
  const events = [];
  const alert = raiseAlert(state.alert, alertAmount, rules);
  pushAlertChange(events, state.alert.points, alert.points, rules);
  return {
    state: { ...state, alert, noises: [...state.noises, { kind, q: hex.q, r: hex.r }] },
    events,
  };
}

/**
 * Hand the queued noises out to the enemies that hear them (SPEC.md §6
 * "Noise"). Each noise in turn becomes the last known contact — unless it is
 * a repeat: a noise on a hex enemies are already heading to or searching
 * updates that contact rather than starting a new one, so nobody new sets off
 * and the report says it once.
 */
function hearNoises(enemies, noises, contact, alertPoints, rules) {
  const events = [];
  for (const noise of noises) {
    const repeat = enemies.some((e) => e.investigating && sameHex(e.investigating, noise))
      || (contact && !contact.searched && sameHex(contact, noise));
    if (repeat) continue;
    contact = { q: noise.q, r: noise.r, searched: false };

    const heard = new Set(
      listeners(enemies, noise.kind, noise, alertPoints, rules).filter((e) => !e.holding).map((e) => e.id),
    );
    if (heard.size === 0) continue;
    const labels = [];
    enemies = enemies.map((e) => {
      if (!heard.has(e.id)) return e;
      labels.push(e.label);
      if (e.speed === 0) {
        const facing = facingToward(e, noise);
        return facing < 0 ? e : { ...e, facing, turned: true };
      }
      return { ...e, investigating: { q: noise.q, r: noise.r } };
    });
    events.push({ kind: 'heard', noise: noise.kind, q: noise.q, r: noise.r, labels });
  }
  return { enemies, contact, events };
}

function sameHex(a, b) {
  return a.q === b.q && a.r === b.r;
}

// --- enemy phase -------------------------------------------------------------

/**
 * Phase 3 (SPEC.md §4). Before anyone moves, sentries turned last phase face
 * their post again, the reserve comes on at Alarmed, and the queued noises are
 * heard. Then each enemy, one at a time in data order:
 *
 *   suppressed   does nothing at all.
 *   holding      stays put and faces the man it spotted; the player sees who
 *                has him (`watching`) until the next detection check.
 *   sentry       holds its post.
 *   Alarmed      every moving enemy hunts the last known contact.
 *   investigating walks to the noise it heard, sweeps, and goes back to its
 *                route from the next phase.
 *   Suspicious   walks, but stops and sweeps every `suspiciousPauseEvery`-th turn.
 *   otherwise    walks its route.
 *
 * Any enemy that ends its go on or beside an unfound body finds it (SPEC.md §5).
 * Enemies cannot pass through troopers or each other. Suppression wears off at
 * the end of the phase.
 */
export function runEnemyPhase(state, map, rules) {
  const events = [];
  const stateId = alertStateOf(state.alert.points, rules).id;
  let enemies = state.enemies.map((e) => (e.turned ? { ...e, facing: e.homeFacing, turned: false } : e));
  let reserveDeployed = state.reserveDeployed;
  let alert = state.alert;
  let bodies = state.bodies;
  const alertBefore = state.alert.points;
  const noises = [];
  const living = state.units.filter((u) => !u.dead);

  if (stateId === 'alarmed' && !reserveDeployed) {
    const placed = deployReserve(map, living, enemies);
    if (placed) {
      enemies = [...enemies, placed];
      reserveDeployed = true;
      events.push({ kind: 'reserve', label: placed.label, q: placed.q, r: placed.r });
    }
  }

  const heard = hearNoises(enemies, state.noises, state.contact, state.alert.points, rules);
  enemies = heard.enemies;
  let contact = heard.contact;
  events.push(...heard.events);

  const hunting = stateId === 'alarmed' && contact && !contact.searched;
  const pauses = stateId === 'suspicious' && state.turn % rules.patrols.suspiciousPauseEvery === 0;
  const searchedHexes = new Set();

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const blocked = blockedFor(living, enemies, enemy.id);
    let moved = enemy;

    if (enemy.suppressed) {
      moved = { ...enemy, holding: null };
    } else if (enemy.holding) {
      const facing = facingToward(enemy, enemy.holding);
      moved = {
        ...enemy,
        facing: facing < 0 ? enemy.facing : facing,
        turned: enemy.speed === 0,
        watching: enemy.holding,
        holding: null,
      };
    } else if (enemy.speed === 0) {
      moved = enemy;
    } else if (hunting) {
      const result = walkToward(map, enemy, contact, blocked, enemy.speed, rules);
      moved = result.enemy;
      if (result.arrived || result.stuck) {
        moved = { ...sweep(moved, rules), investigating: null };
        if (!contact.searched) {
          contact = { ...contact, searched: true };
          events.push({ kind: 'searched', label: enemy.label, q: contact.q, r: contact.r });
        }
      }
    } else if (enemy.investigating) {
      const goal = enemy.investigating;
      const result = walkToward(map, enemy, goal, blocked, enemy.speed, rules);
      moved = result.enemy;
      if (result.arrived || result.stuck) {
        moved = { ...sweep(moved, rules), investigating: null };
        const key = hexKey(goal.q, goal.r);
        if (!searchedHexes.has(key)) {
          searchedHexes.add(key);
          events.push({ kind: 'searched', label: enemy.label, q: goal.q, r: goal.r });
        }
        if (contact && sameHex(contact, goal)) contact = { ...contact, searched: true };
      }
    } else if (pauses) {
      moved = sweep(enemy, rules);
    } else if (enemy.route) {
      moved = walkRoute(map, enemy, blocked, rules);
    }
    enemies = enemies.map((e, j) => (j === i ? moved : e));

    bodies = bodies.map((body) => {
      if (body.found || hexDistance(moved, body) > 1) return body;
      alert = raiseAlert(alert, rules.alert.bodyFound, rules);
      noises.push({ kind: 'found', q: body.q, r: body.r });
      events.push({ kind: 'bodyFound', label: moved.label, name: body.name, q: body.q, r: body.r });
      return { ...body, found: true };
    });
  }

  enemies = enemies.map((e) => (e.suppressed ? { ...e, suppressed: false } : e));
  pushAlertChange(events, alertBefore, alert.points, rules);
  return {
    state: { ...state, enemies, contact, reserveDeployed, alert, bodies, noises },
    events,
  };
}

function deployReserve(map, units, enemies) {
  const reserve = map.reserve;
  const taken = blockedFor(units, enemies, null);
  const free = reserve.entryHexes.find(([q, r]) => !taken.has(hexKey(q, r)));
  return free ? makeEnemy(reserve, map.enemyTypes[reserve.type], free) : null;
}

/** Hexes this enemy may not enter: every living trooper and every other enemy. */
function blockedFor(units, enemies, exceptId) {
  const blocked = new Set(units.filter((u) => !u.dead).map((u) => hexKey(u.q, u.r)));
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
