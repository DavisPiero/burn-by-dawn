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
import { onBoard, woundedLine } from './units.js';

/**
 * The map as the garrison walks it: the ground's own costs, without the
 * cheaper charge points (sabotage.js effectiveMap, M26d), which are for the
 * men placing charges. Without this the fuel dump's points sped up the patrols
 * that cross them and moved their timing (Normal West 80% to 70% in the bot).
 */
const grounds = new WeakMap();
function groundOf(map) {
  if (!map.moveCosts) return map;
  if (!grounds.has(map)) grounds.set(map, { ...map, moveCosts: null });
  return grounds.get(map);
}

const DIRECTIONS = DIRECTION_NAMES.length;

// --- setup -------------------------------------------------------------------

/** One enemy from a placement in map.json and its type from enemies.json. */
function makeEnemy(placement, type, at) {
  return {
    id: placement.id,
    label: placement.label,
    type: placement.type,
    typeLabel: type.label,
    // The name on its counter's strip, shorter where the label will not fit (M20).
    counterLabel: type.counterLabel ?? type.label,
    visionRadius: type.visionRadius,
    arcDegrees: type.arcDegrees,
    detection: type.detection,
    speed: type.speed,
    killable: type.killable,
    q: at[0],
    r: at[1],
    facing: DIRECTION_NAMES.indexOf(placement.facing),
    // Where a sentry looks when nothing has turned it (SPEC.md §6 Noise). The
    // reserve's is the way it faces at its guard post.
    homeFacing: DIRECTION_NAMES.indexOf(placement.guardFacing ?? placement.facing),
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
    // has him. `suppressed` is a gunner's fire, for one go (SPEC.md §4), and
    // `openToKill` is the player phase after it, when a gunner can still
    // finish him (§4 Kill).
    investigating: null,
    holding: null,
    watching: null,
    suppressed: false,
    openToKill: false,
    // The reserve's post beside the exfil (SPEC.md §6 Exfil watched): it
    // marches there, then stands as a sentry facing the exfil.
    guard: placement.guardHex ? { q: placement.guardHex[0], r: placement.guardHex[1] } : null,
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
  // `peak` is the highest the points have ever been, for the clean-run score
  // (SPEC.md §10): a diversion or decay lowers the points, never the peak.
  return { points: 0, quietTurns: 0, raisedThisTurn: false, peak: 0 };
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
  const points = Math.min(cap, alert.points + amount);
  return { ...alert, points, raisedThisTurn: true, peak: Math.max(alert.peak ?? 0, points) };
}

/**
 * The explosion floor (SPEC.md §6): once anything has exploded, the points
 * never fall below the start of rules.explosionFloor. 0 before the first bang.
 */
export function alertFloor(state, rules) {
  if (!state.explosions) return 0;
  return rules.alert.states.find((s) => s.id === rules.explosionFloor).from;
}

/**
 * Phase 5 (SPEC.md §4): after `quietTurnsToDecay` turns with no rise, drop to
 * the start of the state below. In Calm, points short of Suspicious fall to 0
 * without an event: the state has not changed. Never below the explosion
 * floor: at the floor, quiet turns change nothing.
 */
export function decayAlert(state, rules) {
  const events = [];
  let { points, quietTurns } = state.alert;
  quietTurns = state.alert.raisedThisTurn ? 0 : quietTurns + 1;
  if (quietTurns >= rules.alert.quietTurnsToDecay) {
    const dropped = decayTarget(state, rules);
    if (dropped < points) {
      const from = alertIndex(points, rules);
      const to = alertIndex(dropped, rules);
      if (from !== to) events.push({ kind: 'alertDecay', from: rules.alert.states[from].label, to: rules.alert.states[to].label });
      points = dropped;
    }
    quietTurns = 0;
  }
  return { state: { ...state, alert: { ...state.alert, points, quietTurns, raisedThisTurn: false } }, events };
}

/** Where the points fall to when the quiet turns run out: never below the explosion floor. */
export function decayTarget(state, rules) {
  return Math.max(alertFloor(state, rules), dropOneState(state.alert.points, rules));
}

/** The start of the state below this one, or 0 from anywhere in Calm. */
function dropOneState(points, rules) {
  const index = alertIndex(points, rules);
  return index > 0 ? rules.alert.states[index - 1].from : 0;
}

/**
 * The RAF diversion (SPEC.md §4): the alert drops `diversion.statesDown`
 * states, never below the explosion floor; every enemy drops its search, its
 * held contact and any turn toward a noise and goes back to its route or post;
 * the last known contact and any noise not yet heard are forgotten; every
 * trooper is out of contact. Wounds, bodies already found and the floor stand.
 */
export function divertGarrison(state, rules) {
  let points = state.alert.points;
  for (let i = 0; i < rules.diversion.statesDown; i++) points = dropOneState(points, rules);
  points = Math.max(alertFloor(state, rules), Math.min(points, state.alert.points));
  const events = [{ kind: 'diversion' }];
  const from = alertIndex(state.alert.points, rules);
  const to = alertIndex(points, rules);
  if (from !== to) events.push({ kind: 'alertDecay', from: rules.alert.states[from].label, to: rules.alert.states[to].label });
  return {
    state: {
      ...state,
      alert: { ...state.alert, points, quietTurns: 0 },
      enemies: state.enemies.map((e) => ({
        ...e, investigating: null, holding: null, watching: null,
        ...(e.turned ? { facing: e.homeFacing, turned: false } : {}),
      })),
      contact: null,
      noises: [],
      units: state.units.map((u) => (u.inContact ? { ...u, inContact: false } : u)),
    },
    events,
  };
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
 *     + alert (the alert state's detectionBonus)
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
  const alert = alertStateOf(alertPoints, rules).detectionBonus;
  const raw = enemy.detection - cover - concealment - hidden + proximity + alert;
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
    alert,
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
 * them is free to shoot (`firing`). A suppressed enemy has its head down: it
 * neither spots nor fires at the next detection check (SPEC.md §4; M15, it
 * spotted until then, and playtesters found suppression did not cover the
 * others). Whether he is actually shot depends on his being in contact
 * already — see runDetection.
 */
export function detectionAt(map, rules, enemies, alertPoints, unit, hex, busy = null) {
  let worst = null;
  const spotters = [];
  const firers = [];
  let firing = false;
  // How close the nearest enemy is that would fire on him here (M13b: a
  // shot from far off pins rather than hits).
  let firingDistance = null;
  for (const enemy of enemies) {
    if (enemy.suppressed) continue;
    const result = detectionScore(map, rules, enemy, alertPoints, unit, hex);
    if (!result) continue;
    if (result.spotted) {
      spotters.push(enemy.id);
      // An enemy fires at one man a turn (M26d): one busy with another
      // spots him, and does not fire at him.
      if (!result.suppressed && !busy?.(enemy, result.distance)) {
        firing = true;
        firers.push(enemy.id);
        firingDistance = Math.min(firingDistance ?? Infinity, result.distance);
      }
    }
    if (!worst || result.score > worst.score) worst = result;
  }
  return worst ? { ...worst, spotters, firers, firing, firingDistance } : null;
}

/**
 * Whom an enemy fires at (SPEC.md §6, M26d, the operator's): one man a turn,
 * of those already in contact it spots and is free to shoot. The man it
 * already has in its sights first, then the nearest, then the first in the
 * roster. So a man who holds its eye can draw its fire off another.
 *
 * `fireRivals` lists, for each enemy, every man in contact it would fire on as
 * things stand, on the hexes he is tested on (testedHexes), each at his
 * nearest. `busyFor` turns that into the `busy` test detectionAt takes for one
 * man: is this enemy firing at someone ahead of him, were he this far off?
 * Both the detection check and the hover readout use them, so the readout
 * never says a man is safe who is then shot, or the other way round.
 */
export function fireRivals(map, rules, state) {
  const rivals = new Map();
  state.units.forEach((unit, order) => {
    if (!onBoard(unit) || !unit.inContact) return;
    for (const enemy of state.enemies) {
      if (enemy.suppressed) continue;
      let nearest = null;
      for (const hex of testedHexes(unit)) {
        const result = detectionScore(map, rules, enemy, state.alert.points, unit, hex);
        if (result?.spotted && !result.suppressed) nearest = Math.min(nearest ?? Infinity, result.distance);
      }
      if (nearest === null) continue;
      const list = rivals.get(enemy.id) ?? [];
      list.push({ unitId: unit.id, distance: nearest, order });
      rivals.set(enemy.id, list);
    }
  });
  return rivals;
}

/** The man this enemy fires at of those in `rivals`, leaving `unitId` out, or null. */
export function fireTargetOf(rivals, state, enemy, unitId) {
  const others = (rivals.get(enemy.id) ?? []).filter((r) => r.unitId !== unitId);
  const best = others.find((r) => !busyFor(rivals, state, state.units[r.order])(enemy, r.distance));
  return best?.unitId ?? null;
}

export function busyFor(rivals, state, unit) {
  const order = state.units.findIndex((u) => u.id === unit.id);
  const eyeOn = (enemy) => (enemy.watching ?? enemy.holding)?.unitId ?? null;
  const rank = (enemy, r) => [eyeOn(enemy) === r.unitId ? 0 : 1, r.distance, r.order];
  const ahead = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  return (enemy, distance) => {
    const mine = rank(enemy, { unitId: unit.id, distance, order });
    return (rivals.get(enemy.id) ?? []).some((r) => r.unitId !== unit.id && ahead(rank(enemy, r), mine) < 0);
  };
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
 * What a shot does to a man standing on this detection result's hex: 'hit' or
 * 'pinned', by the cover there (SPEC.md §5 Wounds) — and since M13b by range:
 * if every enemy that would fire is more than `combat.hitRange` hexes off, a
 * shot that would hit only pins. No dice, so the hover readout and the
 * detection phase always agree.
 */
export function shotResultOf(result, rules) {
  const byCover = rules.combat.shotResult[result.coverLabel];
  const range = rules.combat.hitRange;
  if (byCover === 'hit' && range != null && result.firingDistance != null && result.firingDistance > range) return 'pinned';
  return byCover;
}

/**
 * Phase 2 (SPEC.md §4 and §6 "Contact and enemy fire"). Every enemy tests
 * every living trooper, against the arcs as they stood all through the
 * player phase.
 *
 * - A trooper spotted is in contact, and every enemy that spotted him holds
 *   and faces him in the enemy phase. A sighting is not a noise: nobody else
 *   comes.
 * - A first sighting raises the alert once, however many enemies or hexes saw
 *   him, and moves the last known contact to the surest one. A man already in
 *   contact was counted when he was first seen, and is not counted again.
 * - A trooper who was already in contact and is spotted again by an enemy
 *   that is not suppressed is shot, never more than once a turn: hit if any
 *   hex he would be shot on is open ground, pinned if all of them are cover.
 * - A trooper nobody spots is out of contact.
 */
export function runDetection(state, map, rules) {
  const events = [];
  let alert = state.alert;
  let contact = state.contact;
  // The player phase after a suppression is over: nobody is open to a kill now.
  let enemies = state.enemies.map((e) => ({ ...e, holding: null, watching: null, openToKill: false }));
  // Pinned lasts one pool; the pool has been filled since, so it is spent.
  let units = state.units.map((u) => (u.pinned ? { ...u, pinned: false } : u));
  let bodies = state.bodies;
  let droppedCharges = state.droppedCharges;
  let best = null;
  // One man a turn for each enemy to fire at (M26d): see fireRivals.
  const rivals = fireRivals(map, rules, state);
  // Whom each enemy fires at, and where: it holds and faces him.
  const firedAt = new Map();

  for (const unit of state.units) {
    if (!onBoard(unit)) continue;
    let seenAt = null;
    const shotResults = [];
    const firers = new Set();
    const busy = unit.inContact ? busyFor(rivals, state, unit) : null;
    for (const hex of testedHexes(unit)) {
      const result = detectionAt(map, rules, state.enemies, state.alert.points, unit, hex, busy);
      if (!result || !result.spotted) continue;
      seenAt = { hex, result };
      if (result.firing) shotResults.push(shotResultOf(result, rules));
      for (const id of result.spotters) {
        enemies = enemies.map((e) => (e.id === id ? { ...e, holding: { unitId: unit.id, q: hex.q, r: hex.r } } : e));
      }
      for (const id of result.firers) {
        firers.add(id);
        if (unit.inContact) firedAt.set(id, { unitId: unit.id, q: hex.q, r: hex.r });
      }
    }

    if (!seenAt) {
      if (unit.inContact) units = updateUnit(units, unit.id, { inContact: false });
      continue;
    }

    events.push({
      kind: 'spotted', unitId: unit.id, unitName: unit.shortName,
      enemyLabel: seenAt.result.enemyLabel, enemyIds: seenAt.result.spotters, q: seenAt.hex.q, r: seenAt.hex.r, score: seenAt.result.score,
      // Gone to ground and seen anyway, so the report can say why (M11):
      // 'here' on his hiding hex, 'before' on a hex crossed before he hid.
      hid: !unit.hidden ? null : seenAt.hex.q === unit.q && seenAt.hex.r === unit.r ? 'here' : 'before',
      // Not in contact until now (M26): the sighting he speaks on, not each turn he stays seen.
      first: !unit.inContact,
    });
    // Seeing a man spoils a quiet turn even when he is not counted again: the
    // garrison does not settle while it has someone in its sights (SPEC.md §6).
    alert = { ...alert, raisedThisTurn: true };
    units = updateUnit(units, unit.id, { everSpotted: true });

    if (!unit.inContact) {
      alert = raiseAlert(alert, rules.alert.spotted, rules);
      if (!best || seenAt.result.score >= best.result.score) best = seenAt;
      units = updateUnit(units, unit.id, { inContact: true });
      continue;
    }
    if (shotResults.length === 0) continue; // only suppressed enemies see him

    const by = state.enemies.filter((e) => firers.has(e.id)).map((e) => e.label);
    if (!shotResults.includes('hit')) {
      events.push({ kind: 'pinned', unitId: unit.id, unitName: unit.shortName, by });
      units = updateUnit(units, unit.id, { pinned: true });
      continue;
    }

    const shot = applyHit(unit, rules);
    events.push({
      kind: shot.dead ? 'killed' : 'wounded', unitId: unit.id, unitName: unit.shortName,
      by, line: shot.dead ? null : woundedLine(unit),
    });
    if (unit.charges > 0) {
      droppedCharges = [...droppedCharges, ...Array.from({ length: unit.charges }, () => ({ q: unit.q, r: unit.r }))];
    }
    if (shot.dead) bodies = [...bodies, { unitId: unit.id, name: unit.shortName, q: unit.q, r: unit.r, found: false }];
    units = updateUnit(units, unit.id, shot);
  }

  // An enemy that fired holds the man it fired at, whoever else it saw.
  enemies = enemies.map((e) => (firedAt.has(e.id) ? { ...e, holding: firedAt.get(e.id) } : e));
  // A dead man holds nobody's attention.
  const living = new Set(units.filter(onBoard).map((u) => u.id));
  enemies = enemies.map((e) => (e.holding && !living.has(e.holding.unitId) ? { ...e, holding: null } : e));

  // A repeat is not a new contact (SPEC.md §6).
  if (best && !(contact && !contact.searched && sameHex(contact, best.hex))) {
    contact = { q: best.hex.q, r: best.hex.r, searched: false };
  }

  pushAlertChange(events, state.alert.points, alert.points, rules);
  return { state: { ...state, alert, contact, enemies, units, bodies, droppedCharges }, events };
}

/**
 * One hit (SPEC.md §5 Wounds): the first wounds, `hitsToKill` kills. Either
 * way his charges leave him — runDetection drops them on his hex — and a
 * wounded man is no longer stabilised, because this is a new wound.
 */
export function applyHit(unit, rules) {
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
 * The last known contact while the garrison is hunting it (SPEC.md §6: every
 * patrol goes to it at Alarmed until one gets there), or null. Below Alarmed
 * it is only remembered, and nobody goes to it unless a noise sends them.
 */
export function huntedContact(state, rules) {
  const { contact } = state;
  if (!contact || contact.searched) return null;
  return alertStateOf(state.alert.points, rules).id === 'alarmed' ? contact : null;
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
 * A thrown stone turns the sentries in earshot at once, in the player phase
 * (M13b): each faces the stone, and holds it through the detection check;
 * `turned` sends it back to its post at the start of the enemy phase. Patrols
 * are left to walk over in the enemy phase, as before. Returns the enemies and
 * the ids it turned, which that noise then does not turn again.
 */
export function turnSentriesNow(enemies, kind, hex, alertPoints, rules) {
  const turned = [];
  const next = enemies.map((e) => {
    const sentry = e.speed === 0 || (e.guard && sameHex(e, e.guard));
    if (!sentry || e.holding || e.suppressed || hexDistance(e, hex) > hearingRadius(kind, alertPoints, rules)) return e;
    const facing = facingToward(e, hex);
    if (facing < 0) return e;
    turned.push(e.id);
    return { ...e, facing, turned: true };
  });
  return { enemies: next, turned };
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
    const repeat = enemies.some((e) => e.investigating && !e.investigating.searched && sameHex(e.investigating, noise))
      || (contact && !contact.searched && sameHex(contact, noise));
    if (repeat) continue;
    contact = { q: noise.q, r: noise.r, searched: false };

    // Sentries a stone already turned in the player phase are not turned again.
    const heard = new Set(
      listeners(enemies, noise.kind, noise, alertPoints, rules)
        .filter((e) => !e.holding && !(noise.turnedNow ?? []).includes(e.id)).map((e) => e.id),
    );
    if (heard.size === 0) continue;
    const labels = [];
    enemies = enemies.map((e) => {
      if (!heard.has(e.id)) return e;
      // A reserve still marching to its post keeps marching.
      if (e.guard && !sameHex(e, e.guard)) return e;
      labels.push(e.label);
      if (e.speed === 0 || e.guard) {
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
 *   reserve      marches to its guard hex beside the exfil and stands there
 *                facing it; it never hunts (SPEC.md §6 Exfil watched).
 *   Alarmed      every moving enemy hunts the last known contact.
 *   investigating walks to the noise it heard, sweeps, and goes back to its
 *                route from the next phase.
 *   Suspicious   walks, but stops and sweeps every `suspiciousPauseEvery`-th turn.
 *   otherwise    walks its route, from the enemy phase of turn `patrols.setOutTurn` on.
 *
 * Any enemy that comes onto or beside an unfound body or a parachute this phase
 * finds it (SPEC.md §5, §9): on or beside any hex it walks through, or the hex
 * it ends on, whether it moved or not. Alert up, a noise there, found once.
 * Enemies cannot pass through troopers or each other. Suppression wears off at
 * the end of the phase, leaving the enemy open to a kill through the player
 * phase that follows (SPEC.md §4 Kill).
 */
export function runEnemyPhase(state, map, rules) {
  const events = [];
  const stateId = alertStateOf(state.alert.points, rules).id;
  let enemies = state.enemies.map((e) => (e.turned ? { ...e, facing: e.homeFacing, turned: false } : e));
  let reserveDeployed = state.reserveDeployed;
  let alert = state.alert;
  let bodies = state.bodies;
  let parachutes = state.parachutes ?? [];
  let canisters = state.canisters ?? [];
  const alertBefore = state.alert.points;
  const noises = [];
  const living = state.units.filter(onBoard);

  // Not once a bonus target has cut the garrison's call for it (SPEC.md §7 payoffs).
  if (stateId === 'alarmed' && !reserveDeployed && !state.reserveCancelled) {
    const placed = deployReserve(map, living, enemies);
    if (placed) {
      enemies = [...enemies, placed];
      reserveDeployed = true;
      events.push({ kind: 'reserve', label: placed.label, q: placed.q, r: placed.r });
    }
  }

  // Squads a bang called up (M21b): on down the road, one to each post in turn.
  let reinforcementsDue = state.reinforcementsDue ?? 0;
  let reinforcementsSent = state.reinforcementsSent ?? 0;
  const help = map.reinforcements;
  while (help && reinforcementsDue > 0 && reinforcementsSent < help.posts.length) {
    const placed = deployReinforcement(help, reinforcementsSent, map, living, enemies);
    if (!placed) break;
    enemies = [...enemies, placed];
    reinforcementsSent++;
    reinforcementsDue--;
    events.push({ kind: 'reinforcements', label: placed.label, q: placed.q, r: placed.r });
  }
  if (!help || reinforcementsSent >= help.posts.length) reinforcementsDue = 0;

  const heard = hearNoises(enemies, state.noises, state.contact, state.alert.points, rules);
  enemies = heard.enemies;
  let contact = heard.contact;
  events.push(...heard.events);

  const hunting = stateId === 'alarmed' && contact && !contact.searched;
  const pauses = stateId === 'suspicious' && state.turn % rules.patrols.suspiciousPauseEvery === 0;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const blocked = blockedFor(living, enemies, enemy.id);
    let moved = enemy;
    let entered = []; // every hex it walks onto this go

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
    } else if (enemy.guard) {
      if (sameHex(enemy, enemy.guard)) {
        moved = enemy;
      } else {
        const result = walkToward(map, enemy, enemy.guard, blocked, enemy.speed, rules);
        moved = result.enemy;
        entered = result.steps;
        if (sameHex(moved, enemy.guard)) moved = { ...moved, facing: moved.homeFacing };
      }
    } else if (hunting) {
      const result = walkToward(map, enemy, contact, blocked, enemy.speed, rules);
      moved = result.enemy;
      entered = result.steps;
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
      entered = result.steps;
      if (result.arrived || result.stuck) {
        moved = { ...sweep(moved, rules), investigating: null };
        // The first to get there reports the search. Anyone else still on the
        // way keeps walking but has nothing new to report (SPEC.md §6 repeat).
        if (!goal.searched) {
          events.push({ kind: 'searched', label: enemy.label, q: goal.q, r: goal.r });
          enemies = enemies.map((e, j) => (
            j !== i && e.investigating && sameHex(e.investigating, goal)
              ? { ...e, investigating: { ...e.investigating, searched: true } }
              : e
          ));
        }
        if (contact && sameHex(contact, goal)) contact = { ...contact, searched: true };
      }
    } else if (pauses) {
      moved = sweep(enemy, rules);
    } else if (enemy.route && state.turn < rules.patrols.setOutTurn) {
      // The garrison has not set out yet (M36): it stands where the map put it.
      moved = enemy;
    } else if (enemy.route) {
      ({ enemy: moved, steps: entered } = walkRouteSteps(map, enemy, blocked, rules));
    }
    // `walked`: the hexes it walked onto this go, in order — display only, so
    // the board can show the garrison moving (M15), as a man's trail does.
    enemies = enemies.map((e, j) => (j === i ? { ...moved, walked: entered } : e));

    // Where it stood this go: every hex it walked through and where it ended.
    const stood = [...entered, moved];
    const walkedOn = (hex) => stood.some((at) => hexDistance(at, hex) <= 1);
    bodies = bodies.map((body) => {
      if (body.found || !walkedOn(body)) return body;
      alert = raiseAlert(alert, rules.alert.bodyFound, rules);
      noises.push({ kind: 'found', q: body.q, r: body.r });
      events.push({ kind: 'bodyFound', label: moved.label, enemyId: moved.id, name: body.name, q: body.q, r: body.r });
      return { ...body, found: true };
    });
    // A found parachute is gone: taken away as evidence (SPEC.md §9).
    parachutes = parachutes.filter((chute) => {
      if (!walkedOn(chute)) return true;
      alert = raiseAlert(alert, rules.alert.parachuteFound, rules);
      noises.push({ kind: 'found', q: chute.q, r: chute.r });
      events.push({ kind: 'parachuteFound', label: moved.label, enemyId: moved.id, name: chute.name, q: chute.q, r: chute.r });
      return false;
    });
    // A found canister stays where it is, its charges with it: found once (SPEC.md §9, M40).
    canisters = canisters.map((canister) => {
      if (canister.found || !walkedOn(canister)) return canister;
      alert = raiseAlert(alert, rules.alert.parachuteFound, rules);
      noises.push({ kind: 'found', q: canister.q, r: canister.r });
      events.push({ kind: 'canisterFound', label: moved.label, enemyId: moved.id, q: canister.q, r: canister.r });
      return { ...canister, found: true };
    });
  }

  enemies = enemies.map((e) => (e.suppressed ? { ...e, suppressed: false, openToKill: true } : e));
  pushAlertChange(events, alertBefore, alert.points, rules);
  return {
    state: { ...state, enemies, contact, reserveDeployed, reinforcementsDue, reinforcementsSent, alert, bodies, parachutes, canisters, noises },
    events,
  };
}

function deployReserve(map, units, enemies) {
  const reserve = map.reserve;
  const taken = blockedFor(units, enemies, null);
  const free = reserve.entryHexes.find(([q, r]) => !taken.has(hexKey(q, r)));
  return free ? makeEnemy(reserve, map.enemyTypes[reserve.type], free) : null;
}

/** The `index`-th squad of reinforcements, for the post of that number (M21b), or null if the road is blocked. */
function deployReinforcement(help, index, map, units, enemies) {
  const taken = blockedFor(units, enemies, null);
  const free = help.entryHexes.find(([q, r]) => !taken.has(hexKey(q, r)));
  if (!free) return null;
  const post = help.posts[index];
  const placement = { id: `${help.id}-${index + 1}`, label: help.label, type: help.type, facing: help.facing, guardHex: post.guardHex, guardFacing: post.guardFacing };
  return makeEnemy(placement, map.enemyTypes[help.type], free);
}

/** Hexes this enemy may not enter: every living trooper and every other enemy. */
function blockedFor(units, enemies, exceptId) {
  const blocked = new Set(units.filter(onBoard).map((u) => hexKey(u.q, u.r)));
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
 * Returns { enemy, spent, arrived, stuck, steps }: `arrived` is standing on the
 * goal or beside an occupied one; `stuck` is no route at all; `steps` is every
 * hex it walked onto, in order.
 */
export function walkToward(map, enemy, goal, blocked, budget, rules) {
  const goalKey = hexKey(goal.q, goal.r);
  const occupiedGoal = blocked.has(goalKey);
  const arrivedAt = (e) => (e.q === goal.q && e.r === goal.r) || (occupiedGoal && hexDistance(e, goal) === 1);
  if (arrivedAt(enemy)) return { enemy, spent: 0, arrived: true, stuck: false, steps: [] };

  // Path as if the goal were free, so an occupied goal still gives a route to
  // walk up to; the walk below stops before any hex that is actually taken.
  const open = new Set(blocked);
  open.delete(goalKey);
  const path = findPath(groundOf(map), enemy, goal, open);
  if (!path) return { enemy, spent: 0, arrived: false, stuck: true, steps: [] };

  let current = enemy;
  let spent = 0;
  const steps = [];
  for (let i = 1; i < path.length; i++) {
    const next = path[i];
    if (blocked.has(hexKey(next.q, next.r))) break;
    const cost = enterCost(groundOf(map), next.q, next.r, null);
    const firstStep = spent === 0 && rules.minimumStep;
    if (spent + cost > budget && !firstStep) break;
    current = { ...current, q: next.q, r: next.r, facing: directionOf(current, next) };
    steps.push({ q: next.q, r: next.r });
    spent += cost;
    if (spent >= budget) break;
  }
  return { enemy: current, spent, arrived: arrivedAt(current), stuck: false, steps };
}

/** Walk the route, carrying on past each waypoint while movement is left. */
export function walkRoute(map, enemy, blocked, rules) {
  return walkRouteSteps(map, enemy, blocked, rules).enemy;
}

/** walkRoute, plus every hex it walked onto: { enemy, steps }. */
function walkRouteSteps(map, enemy, blocked, rules) {
  let current = enemy;
  let budget = enemy.speed;
  const steps = [];
  // Each pass either reaches a waypoint or stops, so the route length bounds it.
  for (let guard = 0; guard <= current.route.length + 1; guard++) {
    const target = current.route[current.waypoint];
    if (current.q === target.q && current.r === target.r) {
      current = nextWaypoint(current);
      continue;
    }
    if (budget <= 0) break;
    const result = walkToward(map, current, target, blocked, budget, rules);
    // A waypoint it cannot reach at all — across a blown bridge, say — is
    // given up: it turns round, or goes on to the next one on a loop.
    if (result.stuck) {
      current = nextWaypoint(current.loop ? current : { ...current, routeStep: -current.routeStep });
      break;
    }
    current = result.enemy;
    steps.push(...result.steps);
    budget -= result.spent;
    if (current.q !== target.q || current.r !== target.r) break;
  }
  return { enemy: current, steps };
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
    const leg = findPath(groundOf(map), stops[i - 1], stops[i], null) ?? [stops[i - 1], stops[i]];
    hexes.push(...leg.slice(1));
  }
  return { hexes, waypoints: enemy.route };
}
