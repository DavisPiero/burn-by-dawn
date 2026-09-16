// Game state shape and pure transitions. Every function here takes state and
// returns new state; nothing mutates what it was given, and rendering only
// ever reads (CLAUDE.md hard rule 7).
//
// SPEC.md §4 gives a turn five phases: player, detection, enemy, fuse, alert
// decay. endTurn runs everything after the player phase. The fuse phase
// arrives with charges at M5b. Save/load arrives when there is a mission worth
// saving.
//
// The player-phase actions of SPEC.md §4 are here too. units.js says whether a
// man can take one; these take it.

import { createAlert, createEnemies, decayAlert, makeNoise, runDetection, runEnemyPhase } from './enemy.js';
import { applyHook } from './traits.js';
import {
  checkHide, checkPickUpCharge, checkStabilise, checkSuppress, checkThrowStone,
  createUnits, fillActionPoints, unitById,
} from './units.js';

/** `traits` is the validated table from traits.js validateTraits. */
export function createInitialState(roster, traits, rules, map) {
  validateRules(rules);
  return {
    turn: 1,
    units: createUnits(roster, traits, rules, map.startHexes),
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
    reserveDeployed: false,
    // What happened at the last turn boundary, for the turn report.
    report: [],
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

  // Noise, contact and wounds, SPEC.md §5 and §6.
  for (const kind of ['found', 'stone', 'gunfire']) {
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
  requireCount(rules.actions?.throwStone?.apCost, '"actions.throwStone.apCost"', rulesUrl);
  requireCount(rules.actions.throwStone.range, '"actions.throwStone.range"', rulesUrl);
  requireCount(rules.actions?.pickUpCharge?.apCost, '"actions.pickUpCharge.apCost"', rulesUrl);
}

function requireCount(value, what, rulesUrl) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${rulesUrl}: ${what} must be a non-negative integer, got ${JSON.stringify(value)}`);
  }
}

export function selectUnit(state, unitId) {
  if (unitById(state.units, unitId)?.dead) return state;
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
 */
export function moveUnit(state, unitId, plan) {
  const destination = plan.path[plan.path.length - 1];
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

/** Wait for a click on the target of an action; null cancels. */
export function setTargeting(state, action) {
  return { ...state, targeting: action };
}

/** Show or hide every patrol route. SPEC.md §4, the `R` key. */
export function toggleRoutes(state) {
  return { ...state, showRoutes: !state.showRoutes };
}

/**
 * End the player phase and run the rest of the turn, in SPEC.md §4's order:
 * detection, enemy phase, (fuses at M5), alert decay. Dawn arrives on turn 20
 * and that is the last playable turn, so the clock stops there. What happens
 * at dawn — win, lose, medal rating — is M5.
 */
export function endTurn(state, rules, map) {
  if (isDawn(state, rules)) return state;

  const detected = runDetection(state, map, rules);
  const moved = runEnemyPhase(detected.state, map, rules);
  // Detection before the enemy phase, so a man shot and killed is gone before
  // anyone walks up to him — and the enemy beside him then finds the body.
  const decayed = decayAlert(moved.state, rules);
  const next = decayed.state;

  return {
    ...next,
    turn: state.turn + 1,
    report: [...detected.events, ...moved.events, ...decayed.events],
    // Pools are refilled from where everyone is standing at the turn boundary,
    // so the leader's command radius is measured now, not mid-turn.
    units: fillActionPoints(next.units, rules).map((unit) => ({ ...unit, trail: [] })),
    selectedHex: null,
    targeting: null,
    // A dead man cannot stay selected.
    selectedUnitId: next.units.find((u) => u.id === state.selectedUnitId)?.dead ? null : state.selectedUnitId,
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
  const units = state.units.filter((u) => !u.dead);
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
