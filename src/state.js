// Game state shape and pure transitions. Every function here takes state and
// returns new state; nothing mutates what it was given, and rendering only
// ever reads (CLAUDE.md hard rule 7).
//
// Before turn 1 comes the drop (SPEC.md §9): `phase` is 'drop' until the
// player picks a run and jumps, and 'play' after. Nobody is on the board, and
// no turn can end, until then.
//
// SPEC.md §4 gives a turn five phases: player, detection, enemy, fuse, alert
// decay. endTurn runs everything after the player phase, then settleMission
// asks whether the mission is over (SPEC.md §10). Save/load arrives when there
// is a mission worth saving.
//
// The player-phase actions of SPEC.md §4 are here too. units.js says whether a
// man can take one; these take it.

import {
  createAlert, createEnemies, decayAlert, divertGarrison, makeNoise, runDetection, runEnemyPhase,
} from './enemy.js';
import { landStick, runById, scatterStick, validateDrop } from './drop.js';
import { createRng } from './rng.js';
import {
  applyPayoff, checkCutLine, checkPlaceCharge, checkSwim, createObjectives, effectiveMap, isExfil, runFusePhase, validateSabotage,
} from './sabotage.js';
import { finalOutcome, missionCheck } from './scoring.js';
import { applyHook } from './traits.js';
import {
  checkHide, checkKill, checkPackParachute, checkPassCharge, checkPickUpCharge, checkStabilise, checkSuppress, checkThrowStone,
  createUnits, fillActionPoints, onBoard, unitById,
} from './units.js';

/**
 * `traits` is the validated table from traits.js validateTraits. `seed` feeds
 * rng.js; the drop is the only thing that rolls, and the seed alone plus the
 * run chosen reproduces it.
 */
export function createInitialState(roster, traits, rules, map, seed = 0) {
  validateRules(rules);
  validateSabotage(map, rules);
  const units = createUnits(roster, traits, rules);
  validateDrop(map, rules, units.length);
  return {
    turn: 1,
    phase: 'drop',
    seed,
    // The run the player is looking at before jumping (SPEC.md §9).
    dropRunId: null,
    units,
    enemies: createEnemies(map),
    alert: createAlert(),
    // The most recent noise the garrison heard: { q, r, searched }, or null.
    // Every patrol hunts it at Alarmed (SPEC.md §6).
    contact: null,
    // Noises made since the last enemy phase, heard in it: { kind, q, r }.
    noises: [],
    // SPEC.md §5: the dead leave bodies; the wounded and the dead drop charges.
    bodies: [],
    droppedCharges: [],
    // SPEC.md §9: { unitId, name, q, r }, one per man until packed or found.
    parachutes: [],
    reserveDeployed: false,
    // A bonus target's payoff has kept the reserve away (SPEC.md §7, M11b).
    reserveCancelled: false,
    // SPEC.md §7: the objectives as they stand, and charges set and burning:
    // { objectiveId, q, r, fuse, unitId }. `explosions` counts bangs, for the
    // explosion floor (§6).
    objectives: createObjectives(map),
    charges: [],
    explosions: 0,
    diversionsCalled: 0, // the RAF diversion, rules.diversion.uses per mission (§4)
    // Null while the mission is on; set once by settleMission (§10).
    outcome: null,
    // What happened at the last turn boundary, for the turn report.
    report: [],
    // Dialogue on the board (SPEC.md §5, §11): { unitId, line }, at most one
    // per man, his latest. Set when a man lands, places a charge or is wounded.
    // The board shows it while he is selected or under the mouse; once the
    // player has looked away from him it is heard and goes (silenceUnits), and
    // any left unheard go at the turn boundary.
    speech: [],
    selectedUnitId: null,
    selectedHex: null, // hex inspection, from M0; survives alongside unit selection
    hoverHex: null,
    showRoutes: false, // the R overlay, SPEC.md §4
    // An action waiting for the player to click its target: 'suppress',
    // 'stone' or 'stabilise'. Interface state, like the hover.
    targeting: null,
  };
}

/**
 * The turn clock is a balance number like any other and lives in
 * data/rules.json. A missing one would silently make dawn never arrive.
 */
function validateRules(rules, rulesUrl = 'data/rules.json') {
  if (!Number.isInteger(rules?.turnLimit) || rules.turnLimit <= 0) {
    throw new Error(`${rulesUrl}: "turnLimit" must be a positive integer, got ${JSON.stringify(rules?.turnLimit)}`);
  }
  if (!rules.roles || typeof rules.roles !== 'object') {
    throw new Error(`${rulesUrl}: expected a "roles" object`);
  }
  for (const [id, role] of Object.entries(rules.roles)) {
    if (!Number.isInteger(role.actionPoints) || role.actionPoints <= 0) {
      throw new Error(`${rulesUrl}: role "${id}" needs a positive integer "actionPoints", got ${JSON.stringify(role.actionPoints)}`);
    }
    requireCount(role.spotRadius, `role "${id}" "spotRadius"`, rulesUrl);
    requireCount(role.charges, `role "${id}" "charges"`, rulesUrl);
  }
  // The bases the trait hooks modify (SPEC.md §5). Nothing acts on most of
  // them until M4–M6, which is exactly when a missing one would go unnoticed.
  requireCount(rules.charges?.placeApCost, '"charges.placeApCost"', rulesUrl);
  requireCount(rules.charges?.fuseTurns, '"charges.fuseTurns"', rulesUrl);
  requireCount(rules.alert?.gunfire, '"alert.gunfire"', rulesUrl);
  requireCount(rules.alert?.silenced, '"alert.silenced"', rulesUrl);
  requireCount(rules.landing?.badLandingTurnsLost, '"landing.badLandingTurnsLost"', rulesUrl);
  for (const id of Object.keys(rules.roles)) {
    requireCount(rules.roles[id].concealment, `role "${id}" "concealment"`, rulesUrl);
  }

  // Detection and alert, SPEC.md §6.
  requireCount(rules.detection?.threshold, '"detection.threshold"', rulesUrl);
  for (const cover of ['none', 'light', 'heavy']) {
    requireCount(rules.detection?.cover?.[cover], `"detection.cover.${cover}"`, rulesUrl);
  }
  if (!Array.isArray(rules.detection?.proximity)) {
    throw new Error(`${rulesUrl}: "detection.proximity" must be an array of bonuses by distance`);
  }
  rules.detection.proximity.forEach((v, i) => requireCount(v, `"detection.proximity[${i}]"`, rulesUrl));
  requireCount(rules.alert.spotted, '"alert.spotted"', rulesUrl);
  requireCount(rules.alert.quietTurnsToDecay, '"alert.quietTurnsToDecay"', rulesUrl);
  // The behaviours in enemy.js key off these four ids; their thresholds and
  // bonuses are free to change.
  const ids = ['calm', 'suspicious', 'alert', 'alarmed'];
  const states = rules.alert.states;
  if (!Array.isArray(states) || states.map((s) => s?.id).join() !== ids.join()) {
    throw new Error(`${rulesUrl}: "alert.states" must be the four states ${ids.join(', ')}, in that order`);
  }
  states.forEach((s, i) => {
    requireCount(s.from, `"alert.states[${i}].from"`, rulesUrl);
    requireCount(s.visionBonus, `"alert.states[${i}].visionBonus"`, rulesUrl);
    requireCount(s.detectionBonus, `"alert.states[${i}].detectionBonus"`, rulesUrl);
    if (i === 0 ? s.from !== 0 : s.from <= states[i - 1].from) {
      throw new Error(`${rulesUrl}: "alert.states" must start from 0 and rise, got ${states.map((x) => x.from).join(', ')}`);
    }
  });
  if (!Number.isInteger(rules.patrols?.suspiciousPauseEvery) || rules.patrols.suspiciousPauseEvery < 1) {
    throw new Error(`${rulesUrl}: "patrols.suspiciousPauseEvery" must be a positive integer`);
  }
  requireCount(rules.patrols.sweepRotation, '"patrols.sweepRotation"', rulesUrl);
  states.forEach((s, i) => requireCount(s.hearingBonus, `"alert.states[${i}].hearingBonus"`, rulesUrl));
  requireCount(rules.alert.stone, '"alert.stone"', rulesUrl);
  requireCount(rules.alert.bodyFound, '"alert.bodyFound"', rulesUrl);
  requireCount(rules.alert.parachuteFound, '"alert.parachuteFound"', rulesUrl);

  // Noise, contact and wounds, SPEC.md §5 and §6.
  for (const kind of ['found', 'stone', 'gunfire', 'silenced']) {
    requireCount(rules.noise?.[kind], `"noise.${kind}"`, rulesUrl);
  }
  if (!Number.isInteger(rules.combat?.hitsToKill) || rules.combat.hitsToKill < 1) {
    throw new Error(`${rulesUrl}: "combat.hitsToKill" must be a positive integer`);
  }
  requireCount(rules.combat.woundedActionPoints, '"combat.woundedActionPoints"', rulesUrl);
  requireCount(rules.combat.pinnedApLoss, '"combat.pinnedApLoss"', rulesUrl);
  for (const cover of ['none', 'light', 'heavy']) {
    if (!['hit', 'pinned'].includes(rules.combat.shotResult?.[cover])) {
      throw new Error(`${rulesUrl}: "combat.shotResult.${cover}" must be "hit" or "pinned"`);
    }
  }

  // Actions, SPEC.md §4.
  requireCount(rules.actions?.hide?.apCost, '"actions.hide.apCost"', rulesUrl);
  requireCount(rules.actions.hide.concealment, '"actions.hide.concealment"', rulesUrl);
  requireCount(rules.actions?.suppress?.apCost, '"actions.suppress.apCost"', rulesUrl);
  requireCount(rules.actions?.kill?.apCost, '"actions.kill.apCost"', rulesUrl);
  requireCount(rules.actions?.throwStone?.apCost, '"actions.throwStone.apCost"', rulesUrl);
  requireCount(rules.actions.throwStone.range, '"actions.throwStone.range"', rulesUrl);
  requireCount(rules.actions?.pickUpCharge?.apCost, '"actions.pickUpCharge.apCost"', rulesUrl);
  requireCount(rules.actions?.packParachute?.apCost, '"actions.packParachute.apCost"', rulesUrl);

  // Sabotage, exfil, the diversion and the score, SPEC.md §4, §7, §10. The
  // objectives themselves are checked against map.json in sabotage.js.
  requireCount(rules.noise.explosion, '"noise.explosion"', rulesUrl);
  for (const key of ['primary', 'secondary', 'perTrooperOut', 'perTrooperUnseen', 'clean']) {
    requireCount(rules.scoring?.[key], `"scoring.${key}"`, rulesUrl);
  }
  if (!rules.alert.states.some((s) => s.id === rules.scoring.cleanNeverReached)) {
    throw new Error(`${rulesUrl}: "scoring.cleanNeverReached" must be an alert state id`);
  }
  requireCount(rules.mission?.minimumOut, '"mission.minimumOut"', rulesUrl);
  requireCount(rules.diversion?.uses, '"diversion.uses"', rulesUrl);
  requireCount(rules.diversion.statesDown, '"diversion.statesDown"', rulesUrl);
  for (const [id, role] of Object.entries(rules.roles)) {
    for (const flag of ['suppress', 'kill', 'cutLine']) {
      if (role[flag] !== undefined && typeof role[flag] !== 'boolean') {
        throw new Error(`${rulesUrl}: role "${id}" "${flag}" must be true or false`);
      }
    }
  }
}

function requireCount(value, what, rulesUrl) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${rulesUrl}: ${what} must be a non-negative integer, got ${JSON.stringify(value)}`);
  }
}

// --- the drop (SPEC.md §9) -------------------------------------------------------

/** Look at a drop run before committing to it; null looks at none. */
export function chooseDropRun(state, map, runId) {
  if (state.phase !== 'drop') return state;
  if (runId !== null && !runById(map, runId)) return state;
  return { ...state, dropRunId: runId };
}

/**
 * Jump on the chosen run: scatter the stick with the seeded RNG, put everyone
 * on the ground, and start turn 1. `map` is the loaded map.
 */
export function jump(state, map, rules) {
  if (state.phase !== 'drop') return state;
  const run = runById(map, state.dropRunId);
  if (!run) return state;
  const landings = scatterStick(map, rules, run, state.units, state.enemies, createRng(state.seed));
  const landed = landStick(state, landings, map, rules);
  return { ...landed.state, speech: speechFrom(landed.events, landed.state.units) };
}

/**
 * The lines said at a turn boundary or a landing: a man coming down says his
 * onLand line, or his wounded line if he came down wounded; a man hit says
 * his wounded line (units.js woundedLine: onWoundedCarrying if he still had a
 * charge and has that line). The event carries the line, chosen when it
 * happened, as by now his charge is already on the ground. The dead say nothing.
 */
function speechFrom(events, units) {
  let speech = [];
  for (const event of events) {
    const unit = units.find((u) => u.id === event.unitId);
    if (!unit || !onBoard(unit)) continue;
    let line = null;
    if (event.kind === 'landed' || event.kind === 'wounded') line = event.line;
    if (line) speech = say(speech, unit.id, line);
  }
  return speech;
}

/** Give a man a line, replacing any he was already saying; null silences him. */
function say(speech, unitId, line) {
  const others = (speech ?? []).filter((s) => s.unitId !== unitId);
  return line ? [...others, { unitId, line }] : others;
}

/**
 * These men's lines have been heard: the player selected or hovered each of
 * them and has since moved on, so the lines go and are not shown again.
 */
export function silenceUnits(state, unitIds) {
  const heard = new Set(unitIds);
  if (!state.speech.some((s) => heard.has(s.unitId))) return state;
  return { ...state, speech: state.speech.filter((s) => !heard.has(s.unitId)) };
}

export function selectUnit(state, unitId) {
  const unit = unitById(state.units, unitId);
  if (!unit || !onBoard(unit)) return state;
  return { ...state, selectedUnitId: unitId, selectedHex: null, targeting: null };
}

export function selectHex(state, q, r) {
  return { ...state, selectedHex: { q, r } };
}

/** Esc and right-click: back out of targeting first, then out of the selection. */
export function deselect(state) {
  if (state.targeting) return { ...state, targeting: null };
  return { ...state, selectedUnitId: null, selectedHex: null };
}

export function setHover(state, hex) {
  return { ...state, hoverHex: hex };
}

/**
 * Commit a move plan from units.js planMove. The plan already knows the move
 * is legal and affordable; this only spends the AP and puts the man down.
 *
 * A minimum-step move costs more than the unit has, so AP floors at zero
 * rather than going negative. Unused AP is not banked (SPEC.md §4) — the
 * refill at endTurn is unconditional.
 *
 * A man who ends his move on an exfil hex is out (SPEC.md §10): off the board
 * at once, safe, and never tested on the way — he is gone before the
 * detection phase. `map` may be omitted where exfil does not matter.
 */
export function moveUnit(state, unitId, plan, map = null) {
  const destination = plan.path[plan.path.length - 1];
  if (map && isExfil(map, destination)) {
    return {
      ...state,
      units: state.units.map((unit) => (
        unit.id === unitId
          ? { ...unit, q: destination.q, r: destination.r, ap: 0, out: true, hidden: false, inContact: false, trail: [] }
          : unit
      )),
      selectedUnitId: state.selectedUnitId === unitId ? null : state.selectedUnitId,
    };
  }
  return {
    ...state,
    units: state.units.map((unit) => (
      unit.id === unitId
        ? {
          ...unit,
          q: destination.q,
          r: destination.r,
          ap: Math.max(0, unit.ap - plan.total),
          hidden: false, // spending AP brings him out of hiding (SPEC.md §4)
          // Every hex he entered, for the detection phase (enemy.js testedHexes).
          trail: [...unit.trail, ...plan.path.slice(1)],
        }
        : unit
    )),
  };
}

/** Hold position: this man is done for the turn. SPEC.md §4, the `H` key. */
export function holdUnit(state, unitId) {
  return {
    ...state,
    units: state.units.map((unit) => (unit.id === unitId ? { ...unit, ap: 0 } : unit)),
  };
}

// --- actions (SPEC.md §4) -------------------------------------------------------
//
// Each takes the check from units.js first and returns the state unchanged if
// it fails, so a stray key press can never make an illegal move. Spending AP
// on anything but hiding brings a man out of hiding.

function spend(state, unitId, cost, changes = {}) {
  return {
    ...state,
    units: state.units.map((u) => (
      u.id === unitId ? { ...u, ap: Math.max(0, u.ap - cost), hidden: false, ...changes } : u
    )),
  };
}

/** Go to ground: pay the cost, lose the rest of the turn, hidden on this hex. */
export function hideUnit(state, unitId, rules) {
  const unit = unitById(state.units, unitId);
  if (!checkHide(unit, rules).ok) return state;
  return spend(state, unitId, unit.ap, { hidden: true });
}

/**
 * A gunner fires on an enemy: it will not fire at the next detection check or
 * move in the next enemy phase. Gunfire is loud — the onFire hook sets how
 * loud — and is heard from the gunner's hex.
 */
export function suppressEnemy(state, unitId, enemyId, map, rules) {
  const unit = unitById(state.units, unitId);
  const enemy = state.enemies.find((e) => e.id === enemyId);
  const check = checkSuppress(map, unit, enemy, rules);
  if (!check.ok) return state;
  const alert = applyHook(unit, 'onFire', 'alert', rules.alert.gunfire).value;
  const fired = {
    ...spend(state, unitId, check.cost),
    enemies: state.enemies.map((e) => (e.id === enemyId ? { ...e, suppressed: true } : e)),
  };
  return makeNoise(fired, 'gunfire', unit, alert, rules).state;
}

/**
 * A gunner kills an enemy under suppression (SPEC.md §4 Kill). It is gone from
 * the board, and whoever it had in its sights is free of it; its body is left
 * where it fell for the rest of the garrison to find. One aimed shot from a
 * silenced Sten: quieter than the suppressing burst, through the same onFire
 * hook.
 */
export function killEnemy(state, unitId, enemyId, map, rules) {
  const unit = unitById(state.units, unitId);
  const enemy = state.enemies.find((e) => e.id === enemyId);
  const check = checkKill(map, unit, enemy, rules);
  if (!check.ok) return state;
  const alert = applyHook(unit, 'onFire', 'alert', rules.alert.silenced).value;
  const fired = {
    ...spend(state, unitId, check.cost),
    enemies: state.enemies.filter((e) => e.id !== enemyId),
    bodies: [...state.bodies, { enemyId, name: `the ${enemy.label.toLowerCase()}`, q: enemy.q, r: enemy.r, found: false }],
  };
  return makeNoise(fired, 'silenced', unit, alert, rules).state;
}

/** Throw a stone: a noise on that hex for the next enemy phase. */
export function throwStone(state, unitId, hex, map, rules) {
  const unit = unitById(state.units, unitId);
  const check = checkThrowStone(map, unit, hex, rules);
  if (!check.ok) return state;
  return makeNoise(spend(state, unitId, check.cost), 'stone', hex, rules.alert.stone, rules).state;
}

/** Spend a full turn dressing a wound: his pool and his charges come back next turn. */
export function stabiliseUnit(state, unitId, patientId) {
  const unit = unitById(state.units, unitId);
  const patient = unitById(state.units, patientId);
  const check = checkStabilise(unit, patient);
  if (!check.ok) return state;
  const spent = spend(state, unitId, check.cost);
  return {
    ...spent,
    units: spent.units.map((u) => (u.id === patientId ? { ...u, stabilised: true } : u)),
  };
}

/** Pack up his own parachute from the hex he stands on (SPEC.md §9). */
export function packParachute(state, unitId, rules) {
  const unit = unitById(state.units, unitId);
  if (!checkPackParachute(state.parachutes, unit, rules).ok) return state;
  return {
    ...spend(state, unitId, rules.actions.packParachute.apCost),
    parachutes: state.parachutes.filter((p) => p.unitId !== unitId),
  };
}

/** Pick up one dropped charge from his own hex. */
export function pickUpCharge(state, unitId, rules) {
  const unit = unitById(state.units, unitId);
  const check = checkPickUpCharge(state.droppedCharges, unit, rules);
  if (!check.ok) return state;
  const index = state.droppedCharges.findIndex((c) => c.q === unit.q && c.r === unit.r);
  return {
    ...spend(state, unitId, check.cost, { charges: unit.charges + 1 }),
    droppedCharges: state.droppedCharges.filter((_, i) => i !== index),
  };
}

/** Hand one charge to the man beside him (SPEC.md §4, M11b): the giver pays, the taker does not. */
export function passCharge(state, giverId, receiverId, rules) {
  const giver = unitById(state.units, giverId);
  const receiver = unitById(state.units, receiverId);
  const check = checkPassCharge(giver, receiver, rules);
  if (!check.ok) return state;
  const next = spend(state, giverId, check.cost, { charges: giver.charges - 1 });
  return { ...next, units: next.units.map((u) => (u.id === receiverId ? { ...u, charges: u.charges + 1 } : u)) };
}

/**
 * Set a charge on the objective this man is standing beside (SPEC.md §7). The
 * onPlaceCharge hook sets what it costs him and how long its fuse burns.
 */
export function placeCharge(state, unitId, rules) {
  const unit = unitById(state.units, unitId);
  const check = checkPlaceCharge(state, unit, rules);
  if (!check.ok) return state;
  const spent = spend(state, unitId, check.cost, { charges: unit.charges - 1 });
  return {
    ...spent,
    speech: say(spent.speech, unitId, unit.dialogue?.onPlaceCharge ?? null),
    charges: [...state.charges, { objectiveId: check.objective.id, q: unit.q, r: unit.r, fuse: check.fuse, unitId }],
  };
}

/** A scout cuts the exchange line: a full turn, destroyed at once, silently. */
export function cutLine(state, unitId, rules) {
  const unit = unitById(state.units, unitId);
  const check = checkCutLine(state, unit, rules);
  if (!check.ok) return state;
  const cut = {
    ...spend(state, unitId, check.cost),
    objectives: state.objectives.map((o) => (o.id === check.objective.id ? { ...o, destroyed: true, cut: true } : o)),
  };
  // Destroyed silently, but it pays back all the same (SPEC.md §7), said in
  // the report at once, as the RAF diversion is.
  const paid = applyPayoff(cut, check.objective, rules);
  return { ...paid.state, report: [...state.report, ...paid.events] };
}

/**
 * Swim the canal (SPEC.md §4): a full turn, and he comes out on the far bank,
 * where the detection phase tests him like any hex he entered. `map` is the
 * effective map, where a blown bridge is water.
 */
export function swimAcross(state, unitId, target, map, rules) {
  const unit = unitById(state.units, unitId);
  if (!checkSwim(map, state, unit, target, rules).ok) return state;
  const spent = spend(state, unitId, unit.ap);
  return {
    ...spent,
    units: spent.units.map((u) => (u.id === unitId ? { ...u, q: target.q, r: target.r, trail: [...u.trail, target] } : u)),
  };
}

/** Can the RAF diversion be called now (SPEC.md §4)? { ok, reason }. */
export function checkDiversion(state, rules) {
  if (state.outcome) return { ok: false, reason: 'the mission is over' };
  if (state.phase === 'drop') return { ok: false, reason: 'not before the drop' };
  if (rules.diversion.uses < 1) return { ok: false, reason: 'not on this mission' };
  if (state.diversionsCalled >= rules.diversion.uses) return { ok: false, reason: rules.diversion.uses === 1 ? 'already called' : 'all called' };
  if (!state.units.some((u) => u.leader && !u.dead)) return { ok: false, reason: 'the leader carried the radio, and he is dead' };
  return { ok: true, reason: null };
}

/** Call the RAF diversion: no AP, up to diversion.uses times, while the leader lives. */
export function callDiversion(state, rules) {
  if (!checkDiversion(state, rules).ok) return state;
  const diverted = divertGarrison(state, rules);
  return { ...diverted.state, diversionsCalled: state.diversionsCalled + 1, report: [...state.report, ...diverted.events] };
}

/** Wait for a click on the target of an action; null cancels. */
export function setTargeting(state, action) {
  return { ...state, targeting: action };
}

/** Show or hide every patrol route. SPEC.md §4, the `R` key. */
export function toggleRoutes(state) {
  return { ...state, showRoutes: !state.showRoutes };
}

/**
 * End the player phase and run the rest of the turn, then see whether the
 * mission is over. Turn 20 is the last playable turn: ending it is dawn
 * (SPEC.md §10), and the clock does not go past it.
 */
export function endTurn(state, rules, map) {
  if (state.outcome || state.phase !== 'play') return state;
  const dawn = isDawn(state, rules);
  return settleMission(playOutTurn(state, rules, map, dawn), rules, map, { dawn });
}

/**
 * The phases after the player phase, in SPEC.md §4's order: detection, enemy
 * phase, fuses, alert decay. `map` is the loaded map; each phase gets the map
 * as the demolitions have left it.
 */
function playOutTurn(state, rules, baseMap, dawn) {
  const map = effectiveMap(baseMap, state.objectives, rules);
  const detected = runDetection(state, map, rules);
  const moved = runEnemyPhase(detected.state, map, rules);
  // Detection before the enemy phase, so a man shot and killed is gone before
  // anyone walks up to him — and the enemy beside him then finds the body.
  const fused = runFusePhase(moved.state, rules);
  const decayed = decayAlert(fused.state, rules);
  const next = decayed.state;

  return {
    ...next,
    turn: dawn ? state.turn : state.turn + 1,
    report: [...detected.events, ...moved.events, ...fused.events, ...decayed.events],
    speech: speechFrom(detected.events, next.units),
    // Pools are refilled from where everyone is standing at the turn boundary,
    // so the leader's command radius is measured now, not mid-turn.
    // A turn lost to a bad landing is spent now.
    units: fillActionPoints(next.units.map(spendLostTurn), rules).map((unit) => ({ ...unit, trail: [] })),
    selectedHex: null,
    targeting: null,
    // A dead man cannot stay selected.
    selectedUnitId: next.units.some((u) => u.id === state.selectedUnitId && onBoard(u)) ? state.selectedUnitId : null,
  };
}

function spendLostTurn(unit) {
  return unit.turnsLost > 0 ? { ...unit, turnsLost: unit.turnsLost - 1 } : unit;
}

/**
 * Is the mission over (scoring.js missionCheck)? If so, settle it: men who
 * withdraw get out, charges still burning play out turn by turn until they
 * have all gone off or dawn comes, and the outcome is recorded. Called after
 * every turn and after every player action — the last man stepping onto the
 * exfil ends the mission there and then.
 */
export function settleMission(state, rules, map, { dawn = false } = {}) {
  if (state.outcome || state.phase !== 'play') return state;
  const check = missionCheck(state, rules, { dawn });
  if (!check) return state;

  let next = state;
  if (check.withdraw) {
    next = { ...next, units: next.units.map((u) => (onBoard(u) ? { ...u, out: true, withdrew: true } : u)) };
  }
  const report = [...next.report];
  let endedAtDawn = dawn;
  while (!endedAtDawn && next.charges.length > 0) {
    endedAtDawn = isDawn(next, rules);
    next = playOutTurn(next, rules, map, endedAtDawn);
    report.push(...next.report);
  }
  return {
    ...next,
    report,
    outcome: finalOutcome(next, rules, check, next.turn, endedAtDawn),
    selectedUnitId: null,
    targeting: null,
  };
}

export function isDawn(state, rules) {
  return state.turn >= rules.turnLimit;
}

export function selectedUnit(state) {
  return state.selectedUnitId === null ? null : unitById(state.units, state.selectedUnitId);
}

/**
 * The next trooper after the currently selected one, for Tab. Prefers troopers
 * with AP left, because cycling onto a man who cannot move is a wasted press;
 * falls back to plain order once everyone is spent.
 */
export function nextUnitId(state) {
  const units = state.units.filter(onBoard);
  if (units.length === 0) return null;
  const from = units.findIndex((u) => u.id === state.selectedUnitId);

  for (const onlyWithAp of [true, false]) {
    for (let i = 1; i <= units.length; i++) {
      const candidate = units[(from + i + units.length) % units.length];
      if (!onlyWithAp || candidate.ap > 0) return candidate.id;
    }
  }
  return units[0].id;
}
