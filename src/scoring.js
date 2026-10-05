// The end of the mission: whether it is over, how it came out, who got home,
// and the score (SPEC.md §10).
//
// Pure functions. Numbers are rules.json scoring and mission; what has to be
// destroyed is the mission's win condition (missions.js). state.js decides
// when to ask.

import { winMet, winShortfall, winTargets, winWords } from './missions.js';
import { kindOf } from './sabotage.js';
import { trainCaught } from './train.js';
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
 *   too few charges left to meet the win condition  withdrawn
 */
export function missionCheck(state, rules, { dawn = false } = {}) {
  const alive = state.units.filter((u) => !u.dead);
  const minimum = rules.mission.minimumOut;
  if (alive.length === 0) return { kind: 'failed', reason: 'every man is dead', withdraw: false };
  if (dawn) {
    return succeeded(state, rules)
      ? { kind: 'success', reason: `${nightEnd(rules)}: the job is done`, withdraw: false }
      : { kind: 'failed', reason: failedAtDawn(state, rules), withdraw: false };
  }
  if (!state.units.some(onBoard)) {
    return { kind: 'withdrawn', reason: 'nobody is left in the field', withdraw: false };
  }
  if (alive.length < minimum) {
    return { kind: 'withdrawn', reason: `fewer than ${minimum} men left to get out`, withdraw: true };
  }
  if (winShortfall(state, rules) > 0) {
    return { kind: 'withdrawn', reason: `not enough charges left for ${winWords(state, rules)}`, withdraw: true };
  }
  return null;
}

/** What ends the night, in the outcome's words: dawn, or where the way out is a boat that stays only so long (M41b), its going. */
function nightEnd(rules) {
  return rules.exfil?.openFor ? 'the boat has gone' : 'dawn';
}

function succeeded(state, rules) {
  return winMet(state, rules) && state.units.filter((u) => u.out).length >= rules.mission.minimumOut;
}

function failedAtDawn(state, rules) {
  if (!winMet(state, rules)) {
    const words = winWords(state, rules);
    return winTargets(state, rules).needed === 1 ? `${nightEnd(rules)}, and ${words} still stands` : `${nightEnd(rules)}, and fewer than ${words} destroyed`;
  }
  return `${nightEnd(rules)}, and fewer than ${rules.mission.minimumOut} men got out`;
}

/**
 * The final outcome once any burning charges have gone off: success if the
 * win condition is met and enough men are out, failed if every man is dead or it is
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
  return { kind, reason, turn, fates, score: scoreOf(state, rules) };
}

/**
 * SPEC.md §10 (numbers as of M18): each objective destroyed pays its kind's
 * `score` (M28: France's bridge 10, the others 4), and meeting the win
 * condition pays `scoring.win` on top (France 0), then 2 per man out
 * unhurt and 1 per man out who was hit, 1 more for each of
 * them never spotted all mission, 1 per enemy knifed or shot and 1 back for
 * each of their bodies found (M16), and 3 for a clean run — never reached
 * Alarmed and never called the RAF diversion. Stealth is paid for, not speed
 * (M11b): a point per turn to spare paid players to rush.
 */
/**
 * The salvo (M33, SPEC.md §10): the most of the win's targets that went up in
 * one fuse phase, set off by a neighbour or by their own charges timed to the
 * same turn. A mission's `scoring.salvo` { count, points } pays for that many
 * or more; null (France, with one fuse and one primary) pays nothing.
 */
export function bestSalvo(state, rules) {
  const { targets } = winTargets(state, rules);
  const byPhase = new Map();
  for (const o of targets) {
    if (o.destroyed && o.wentUp) byPhase.set(o.wentUp, (byPhase.get(o.wentUp) ?? 0) + 1);
  }
  return { count: Math.max(0, ...byPhase.values()), label: targets[0] ? kindOf(targets[0], rules).label : '' };
}

/**
 * The clean run (SPEC.md §10): the garrison never reached
 * `scoring.cleanNeverReached` and the diversion was never called. Where a
 * mission sets `scoring.cleanUntil` to "firstExplosion" (M32, the airfield,
 * whose garrison is Alarmed by the end of every raid), only the night before
 * the first bang is asked about: the stick got in and set its charges before
 * the alarm went up. `kept` is whether it still stands, `label` the back
 * page's line for it.
 */
export function cleanRun(state, rules) {
  const s = rules.scoring;
  const top = rules.alert.states.find((st) => st.id === s.cleanNeverReached);
  const untilBang = s.cleanUntil === 'firstExplosion';
  const peak = untilBang && state.explosions > 0 ? state.alert.peakBeforeBang ?? 0 : state.alert.peak ?? 0;
  return {
    kept: peak < top.from && state.diversionsCalled === 0,
    label: untilBang ? 'quiet to first bang, no diversion' : `never ${top.label}, no diversion`,
  };
}

export function scoreOf(state, rules) {
  const s = rules.scoring;
  const lines = [];
  // Targets of one name are one line (M32: eight aircraft, a line each, ran
  // the airfield's back page off its foot): "3 Stukas destroyed".
  const downed = new Map();
  for (const o of state.objectives) {
    if (!o.destroyed) continue;
    const key = `${o.label}${o.cut ? ' (line cut)' : ''}`;
    const line = downed.get(key) ?? { label: o.label, cut: o.cut, count: 0, points: 0 };
    downed.set(key, { ...line, count: line.count + 1, points: line.points + kindOf(o, rules).score });
  }
  for (const d of downed.values()) {
    lines.push({ label: `${d.count > 1 ? `${d.count} ${d.label}s` : d.label} destroyed${d.cut ? ' (line cut)' : ''}`, points: d.points });
  }
  if (s.win > 0 && winMet(state, rules)) lines.push({ label: `The job done: ${winWords(state, rules)}`, points: s.win });
  // The goods train (M34): the bridge down within a turn of it.
  if (rules.train && trainCaught(state, rules)) lines.push({ label: `${rules.train.label} wrecked with it`, points: rules.train.score });
  const salvo = bestSalvo(state, rules);
  if (s.salvo && salvo.count >= s.salvo.count) lines.push({ label: `${salvo.count} ${salvo.label} up in one bang`, points: s.salvo.points });
  const out = state.units.filter((u) => u.out);
  const men = (n) => `${n} m${n === 1 ? 'a' : 'e'}n`;
  // M18: a man who was hit, dressed or not, pays less than one who came through whole.
  const whole = out.filter((u) => !(u.hits > 0)).length;
  const hurt = out.length - whole;
  if (whole > 0) lines.push({ label: `${men(whole)} out unhurt`, points: whole * s.perTrooperOut });
  if (hurt > 0) lines.push({ label: `${men(hurt)} out wounded`, points: hurt * s.perTrooperOutWounded });
  const unseen = out.filter((u) => !u.everSpotted).length;
  if (unseen > 0) lines.push({ label: `${unseen} of them never seen`, points: unseen * s.perTrooperUnseen });
  // M16: kills by knife or gunner are the enemy bodies; a blast leaves none.
  const kills = state.bodies.filter((b) => b.enemyId);
  if (kills.length > 0) lines.push({ label: `${kills.length} ${kills.length === 1 ? 'enemy' : 'enemies'} killed`, points: kills.length * s.perKill });
  const found = kills.filter((b) => b.found).length;
  if (found > 0) lines.push({ label: `${found} ${found === 1 ? 'body' : 'bodies'} found`, points: found * s.perKillFound });
  const clean = cleanRun(state, rules);
  if (clean.kept) lines.push({ label: clean.label, points: s.clean });
  return { lines, total: lines.reduce((n, l) => n + l.points, 0) };
}
