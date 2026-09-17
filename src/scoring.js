// The end of the mission: whether it is over, how it came out, who got home,
// and the score (SPEC.md §10).
//
// Pure functions. Numbers are rules.json scoring and mission; which objective
// is the primary is map.json. state.js decides when to ask.

import { primaryShortfall } from './sabotage.js';
import { onBoard } from './units.js';

/**
 * Has the mission reached an end it cannot play on from? Asked after every
 * player action and every turn. Returns null to play on, or
 * { kind: 'success' | 'withdrawn' | 'failed', reason, withdraw } where
 * `withdraw` means the men still on the board get out. Burning charges are
 * state.js's to settle before the outcome is final.
 *
 *   everyone dead                                   failed
 *   dawn (the last turn has been played)            success, or failed
 *   nobody left on the board                        success, or withdrawn
 *   fewer than minimumOut alive or already out      withdrawn
 *   too few charges left to finish the primary      withdrawn
 */
export function missionCheck(state, rules, { dawn = false } = {}) {
  const alive = state.units.filter((u) => !u.dead);
  const minimum = rules.mission.minimumOut;
  if (alive.length === 0) return { kind: 'failed', reason: 'every man is dead', withdraw: false };
  if (dawn) {
    return succeeded(state, rules)
      ? { kind: 'success', reason: 'dawn: the job is done', withdraw: false }
      : { kind: 'failed', reason: failedAtDawn(state, rules), withdraw: false };
  }
  if (!state.units.some(onBoard)) {
    return { kind: 'withdrawn', reason: 'nobody is left in the field', withdraw: false };
  }
  if (alive.length < minimum) {
    return { kind: 'withdrawn', reason: `fewer than ${minimum} men left to get out`, withdraw: true };
  }
  if (primaryShortfall(state, rules) > 0) {
    const primary = state.objectives.find((o) => o.primary);
    return { kind: 'withdrawn', reason: `not enough charges left for the ${primary.label.toLowerCase()}`, withdraw: true };
  }
  return null;
}

function succeeded(state, rules) {
  const primary = state.objectives.find((o) => o.primary);
  return primary.destroyed && state.units.filter((u) => u.out).length >= rules.mission.minimumOut;
}

function failedAtDawn(state, rules) {
  const primary = state.objectives.find((o) => o.primary);
  if (!primary.destroyed) return `dawn, and the ${primary.label.toLowerCase()} still stands`;
  return `dawn, and fewer than ${rules.mission.minimumOut} men got out`;
}

/**
 * The final outcome once any burning charges have gone off: success if the
 * primary is down and enough men are out, failed if every man is dead or it is
 * dawn, withdrawn otherwise. `turn` is the turn it ended on, `dawn` whether
 * the last turn was played out.
 */
export function finalOutcome(state, rules, check, turn, dawn) {
  let { kind, reason } = check;
  if (state.units.every((u) => u.dead)) {
    kind = 'failed';
    reason = 'every man is dead';
  } else if (succeeded(state, rules)) {
    kind = 'success';
    reason = check.kind === 'success' ? reason : 'the job is done and the men are out';
  } else if (dawn) {
    kind = 'failed';
    reason = failedAtDawn(state, rules);
  }
  const fates = state.units.map((u) => ({
    id: u.id,
    name: u.name,
    fate: u.dead ? 'killed' : u.out ? 'out' : 'left behind',
  }));
  return { kind, reason, turn, fates, score: scoreOf(state, rules, turn, dawn) };
}

/**
 * SPEC.md §10: primary 3, each secondary 2, 1 per man out, 1 per 2 turns left,
 * and 3 for a clean run — never reached Alarmed and never called the RAF
 * diversion. Turns left are counted from the turn the mission ended on; at
 * dawn there are none.
 */
export function scoreOf(state, rules, turn, dawn = false) {
  const s = rules.scoring;
  const lines = [];
  for (const o of state.objectives) {
    if (o.destroyed) lines.push({ label: `${o.label} destroyed${o.cut ? ' (line cut)' : ''}`, points: o.primary ? s.primary : s.secondary });
  }
  const out = state.units.filter((u) => u.out).length;
  if (out > 0) lines.push({ label: `${out} m${out === 1 ? 'a' : 'e'}n out`, points: out * s.perTrooperOut });
  const turnsLeft = dawn ? 0 : Math.max(0, rules.turnLimit - turn);
  const turnPoints = Math.floor(turnsLeft / s.turnsPerPoint);
  if (turnPoints > 0) lines.push({ label: `${turnsLeft} turns to spare`, points: turnPoints });
  const clean = rules.alert.states.find((st) => st.id === s.cleanNeverReached);
  if ((state.alert.peak ?? 0) < clean.from && !state.diversionUsed) {
    lines.push({ label: `never ${clean.label}, no diversion`, points: s.clean });
  }
  return { lines, total: lines.reduce((n, l) => n + l.points, 0) };
}
