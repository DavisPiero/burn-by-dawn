// Game state shape and pure transitions. Every function here takes state and
// returns new state; nothing mutates what it was given, and rendering only
// ever reads (CLAUDE.md hard rule 7).
//
// SPEC.md §4 gives a turn five phases: player, detection, enemy, fuse, alert
// decay. M2 has only the player phase — there is nothing to detect, patrol,
// fuse or escalate yet — so endTurn is the whole turn boundary for now.
// Save/load arrives when there is a mission worth saving.

import { createUnits, fillActionPoints, unitById } from './units.js';

export function createInitialState(roster, rules, map) {
  validateRules(rules);
  return {
    turn: 1,
    units: createUnits(roster, rules, map.startHexes),
    selectedUnitId: null,
    selectedHex: null, // hex inspection, from M0; survives alongside unit selection
    hoverHex: null,
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
        ? { ...unit, q: destination.q, r: destination.r, ap: Math.max(0, unit.ap - plan.total) }
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

/**
 * End the player phase. Dawn arrives on turn 20 (SPEC.md §4) and that is the
 * last playable turn, so the clock stops there. What happens at dawn — win,
 * lose, medal rating — is M5.
 */
export function endTurn(state, rules) {
  if (isDawn(state, rules)) return state;
  return {
    ...state,
    turn: state.turn + 1,
    // Pools are refilled from where everyone is standing at the turn boundary,
    // so the leader's command radius is measured now, not mid-turn.
    units: fillActionPoints(state.units, rules),
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
