// Hints for the briefing card (SPEC.md §11): up to three things worth doing
// next, worked out from the state. A pure function: it reads state and rules
// and returns words; it decides nothing and changes nothing (CLAUDE.md rule 7).
// Every number comes from data/rules.json (rule 5), and nobody is named in
// code: the leader is whoever carries the flag (rule 6).

import { alertIndex } from './enemy.js';
import { onBoard } from './units.js';

const plural = (n, one, many) => (n === 1 ? one : many);

/** "once", "twice", "3 times": how often something may be done. */
export const timesWord = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const names = (units) => {
  const list = units.map((u) => u.shortName);
  return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
};

/** "one call left", "2 calls left": what is left of the RAF diversion. */
export function callsLeft(state, rules) {
  const left = Math.max(0, rules.diversion.uses - state.diversionsCalled);
  return left === 1 ? (rules.diversion.uses === 1 ? 'once only' : 'one call left') : `${left} calls left`;
}

/**
 * @param {object} state
 * @param {object} rules data/rules.json
 * @param {{ diversionOk?: boolean }} [extra] what the caller has already worked out
 * @returns {string[]} most pressing first, at most `max`
 */
export function hintsFor(state, rules, { diversionOk = false } = {}, max = 3) {
  const hints = [];
  const men = state.units.filter(onBoard);
  const out = state.units.filter((u) => u.out).length;
  const primary = state.objectives.find((o) => o.primary);
  const turnsLeft = rules.turnLimit - state.turn;
  const leader = men.find((u) => u.leader);

  // The win is in reach: say how far off it is.
  if (primary?.destroyed && out < rules.mission.minimumOut) {
    const need = rules.mission.minimumOut - out;
    hints.push(`The ${primary.label.toLowerCase()} is down. Get ${need} more ${plural(need, 'man', 'men')} onto the exfil before dawn: ${turnsLeft} ${plural(turnsLeft, 'turn', 'turns')} left.`);
  }

  // Charges burning: the soonest on each objective.
  const burning = new Map();
  for (const charge of state.charges) {
    const soonest = burning.get(charge.objectiveId);
    if (soonest === undefined || charge.fuse < soonest) burning.set(charge.objectiveId, charge.fuse);
  }
  for (const [objectiveId, fuse] of burning) {
    const label = state.objectives.find((o) => o.id === objectiveId)?.label.toLowerCase() ?? 'objective';
    const when = fuse <= 1 ? 'goes off at the end of this turn' : `goes off in ${fuse} turns`;
    hints.push(`The charge on the ${label} ${when}. Get everyone clear of the blast: hover the ${label} to see how far it reaches.`);
  }

  const inContact = men.filter((u) => u.inContact);
  if (inContact.length) {
    hints.push(`${names(inContact)} ${plural(inContact.length, 'is', 'are')} in contact: an enemy has ${plural(inContact.length, 'him', 'them')} in its sights and will fire. Get out of its view, hide in cover [G], or have a gunner suppress it [S].`);
  }

  const wounded = men.filter((u) => u.hits > 0 && !u.stabilised);
  if (wounded.length) {
    hints.push(`${names(wounded)} ${plural(wounded.length, 'is', 'are')} wounded. A man beside ${plural(wounded.length, 'him', 'them')} can stabilise [A]; it takes his whole turn.`);
  }

  if (primary && !primary.destroyed && turnsLeft <= 5) {
    hints.push(`Dawn in ${turnsLeft} ${plural(turnsLeft, 'turn', 'turns')}, and the ${primary.label.toLowerCase()} still stands.`);
  }

  const alert = alertIndex(state.alert.points, rules);
  if (alert >= 2 && diversionOk && leader) {
    const label = rules.alert.states[alert].label;
    hints.push(`The garrison is ${label}. The RAF diversion [D] knocks it down a state: ${callsLeft(state, rules)}, and only while ${leader.shortName} lives.`);
  }

  const chutes = state.parachutes.length;
  if (chutes > 0 && state.turn <= 4) {
    hints.push(`${chutes} ${plural(chutes, 'parachute still lies', 'parachutes still lie')} where the men came down. A man standing on his own can pack it up [U] before a patrol finds it.`);
  }

  if (state.turn === 1 && leader) {
    hints.push(`Regroup: at the start of each turn, every man within ${rules.command.radius} ${plural(rules.command.radius, 'hex', 'hexes')} of ${leader.shortName} gets +${rules.command.bonusActionPoints} AP.`);
  }

  if (state.turn <= 2) {
    const carriers = men.filter((u) => u.charges > 0);
    if (carriers.length) {
      hints.push(`${names(carriers)} ${plural(carriers.length, 'carries', 'carry')} the charges. Stand one on a red dashed charge point and press [C].`);
    }
  }

  hints.push('Hover an enemy to see what it can see and where it walks. A red cross on a move means he would be spotted there.');
  return hints.slice(0, max);
}
