// Game state shape and pure transitions. Every function here takes state and
// returns new state; nothing mutates what it was given, and rendering only
// ever reads (CLAUDE.md hard rule 7).
//
// SPEC.md §4 gives a turn five phases: player, detection, enemy, fuse, alert
// decay. endTurn runs everything after the player phase. The fuse phase
// arrives with charges at M5. Save/load arrives when there is a mission worth
// saving.

import { createAlert, createEnemies, decayAlert, runDetection, runEnemyPhase } from './enemy.js';
import { createUnits, fillActionPoints, unitById } from './units.js';

/** `traits` is the validated table from traits.js validateTraits. */
export function createInitialState(roster, traits, rules, map) {
  validateRules(rules);
  return {
    turn: 1,
    units: createUnits(roster, traits, rules, map.startHexes),
    enemies: createEnemies(map),
    alert: createAlert(),
    // Where the garrison last saw a trooper: { q, r, searched }, or null.
    contact: null,
    reserveDeployed: false,
    // What happened at the last turn boundary, for the turn report.
    report: [],
    selectedUnitId: null,
    selectedHex: null, // hex inspection, from M0; survives alongside unit selection
    hoverHex: null,
    showRoutes: false, // the R overlay, SPEC.md §4
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
  requireCount(rules.patrols.alertConverge, '"patrols.alertConverge"', rulesUrl);
}

function requireCount(value, what, rulesUrl) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${rulesUrl}: ${what} must be a non-negative integer, got ${JSON.stringify(value)}`);
  }
}

export function selectUnit(state, unitId) {
  return { ...state, selectedUnitId: unitId, selectedHex: null };
}

export function selectHex(state, q, r) {
  return { ...state, selectedHex: { q, r } };
}

export function deselect(state) {
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
  const { units } = state;
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
