// Hints for the briefing card (SPEC.md §11): up to three things worth doing
// next, worked out from the state. A pure function: it reads state and rules
// and returns words; it decides nothing and changes nothing (CLAUDE.md rule 7).
// Every number comes from data/rules.json (rule 5), and nobody is named in
// code: the leader is whoever carries the flag (rule 6).

import { alertIndex } from './enemy.js';
import { checkPassCharge, checkStabilise, onBoard } from './units.js';
import { chainFrom, checkCutLine, kindOf } from './sabotage.js';
import { hexDistance, inArc } from './hex.js';
import { winMet, winTargets, winTargetsLeft, winWords } from './missions.js';

const plural = (n, one, many) => (n === 1 ? one : many);
const capitalFirst = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;

/** "once", "twice", "3 times": how often something may be done. */
export const timesWord = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const names = (units) => {
  const list = units.map((u) => u.shortName);
  return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
};

/**
 * The leader's orders in words, from rules.json `command` (SPEC.md §5, M12):
 * "+2 AP beside him, +1 AP within 2 hexes of him".
 */
export function ordersWords(command) {
  const hexes = (n) => `${n} ${n === 1 ? 'hex' : 'hexes'}`;
  const far = `+${command.bonusActionPoints} AP within ${hexes(command.radius)} of him`;
  if (command.closeRadius == null) return far;
  const close = command.closeRadius === 1 ? 'beside him' : `within ${hexes(command.closeRadius)}`;
  return `+${command.closeBonusActionPoints} AP ${close}, ${far}`;
}

/** "one call left", "2 calls left": what is left of the RAF diversion. */
export function callsLeft(state, rules) {
  const left = Math.max(0, rules.diversion.uses - state.diversionsCalled);
  return left === 1 ? (rules.diversion.uses === 1 ? 'once only' : 'one call left') : `${left} calls left`;
}

/**
 * The two actions players do not find by themselves (M26, the operator's:
 * Stabilise and Pass a charge stay, so they must be easy to see): who could
 * take one right now, and beside whom. "Right now" is the same check the
 * button makes, so a man who has already spent AP is not offered a full-turn
 * stabilise, and no prompt outlives its use. Passing is only worth prompting
 * while the win still wants a charge: a target it needs with a charge still
 * to set (none set or gone off for it yet).
 * One prompt per man per kind.
 * @returns {{ kind: 'stabilise' | 'pass', unitId: string, otherId: string }[]}
 */
export function aidPrompts(state, rules) {
  if (state.outcome) return [];
  const men = state.units.filter(onBoard);
  const wanted = winTargetsLeft(state, rules).some((o) => (
    kindOf(o, rules).chargesNeeded - o.detonated - state.charges.filter((c) => c.objectiveId === o.id).length > 0
  ));
  const prompts = [];
  for (const man of men) {
    const patient = men.find((u) => checkStabilise(man, u).ok);
    if (patient) prompts.push({ kind: 'stabilise', unitId: man.id, otherId: patient.id });
    const taker = wanted && men.find((u) => checkPassCharge(man, u, rules).ok);
    if (taker) prompts.push({ kind: 'pass', unitId: man.id, otherId: taker.id });
  }
  return prompts;
}

/**
 * The team is in a pickle and the RAF diversion is still there to call (M26d,
 * the operator's): the garrison at rules.diversion.prompt.alertState or worse,
 * or that many men in contact at once, or that many wounded men in contact.
 * Says why in words, or null. `diversionOk` is the caller's checkDiversion.
 */
export function diversionPrompt(state, rules, diversionOk) {
  const prompt = rules.diversion.prompt;
  if (!prompt || !diversionOk || state.phase === 'drop' || state.outcome) return null;
  const men = state.units.filter(onBoard);
  const inContact = men.filter((u) => u.inContact);
  const wounded = inContact.filter((u) => u.hits > 0);
  const states = rules.alert.states;
  const at = alertIndex(state.alert.points, rules);
  const floor = states.findIndex((s) => s.id === prompt.alertState);
  if (prompt.woundedInContact != null && wounded.length >= prompt.woundedInContact) {
    return `${names(wounded)} ${plural(wounded.length, 'is', 'are')} wounded and in contact: one more hit kills`;
  }
  if (prompt.menInContact != null && inContact.length >= prompt.menInContact) return `${names(inContact)} are in contact`;
  if (floor >= 0 && at >= floor) return `the garrison is ${states[at].label.toUpperCase()}`;
  return null;
}

/** A prompt in words, from the helper's side: "Barrow is wounded beside him: dress it [A]…". */
export function aidWords(prompt, units, rules) {
  const other = units.find((u) => u.id === prompt.otherId);
  if (prompt.kind === 'stabilise') {
    return `${other.shortName} is wounded, right beside him: [A] to stabilise him. It takes the whole turn, and ${other.shortName} gets his full AP back.`;
  }
  return `${other.shortName} is beside him and can take a charge: [E] to pass one over, ${rules.actions.passCharge.apCost} AP of his own.`;
}

/**
 * @param {object} state
 * @param {object} rules data/rules.json
 * @param {{ diversionOk?: boolean, diversionName?: string }} [extra] what the caller has already
 *   worked out, and the mission's name for its diversion (words.diversionName, M31)
 * @returns {string[]} most pressing first, at most `max`
 */
export function hintsFor(state, rules, { diversionOk = false, diversionName = 'RAF diversion' } = {}, max = 3) {
  const hints = [];
  const men = state.units.filter(onBoard);
  const out = state.units.filter((u) => u.out).length;
  const won = winMet(state, rules);
  const single = rules.mission.win.condition === 'destroyPrimary';
  const turnsLeft = rules.turnLimit - state.turn;
  const leader = men.find((u) => u.leader);

  // The win is in reach: say how far off it is.
  if (won && out < rules.mission.minimumOut) {
    const need = rules.mission.minimumOut - out;
    const job = single ? `The ${winTargets(state, rules).targets[0].label} is down` : `${capitalFirst(winWords(state, rules))} are down`;
    hints.push(`${job}. Get ${need} more ${plural(need, 'man', 'men')} onto the exfil before dawn: ${turnsLeft} ${plural(turnsLeft, 'turn', 'turns')} left.`);
  }

  // Charges burning: the soonest on each objective.
  const burning = new Map();
  for (const charge of state.charges) {
    const soonest = burning.get(charge.objectiveId);
    if (soonest === undefined || charge.fuse < soonest) burning.set(charge.objectiveId, charge.fuse);
  }
  for (const [objectiveId, fuse] of burning) {
    const label = state.objectives.find((o) => o.id === objectiveId)?.label ?? 'objective';
    const when = fuse <= 1 ? 'goes off at the end of this turn' : `goes off in ${fuse} turns`;
    hints.push(`The charge on the ${label} ${when}. Get everyone clear of the blast: hover the ${label} to see how far it reaches.`);
  }

  // In a pickle (M26d): the diversion next, after any charge about to blow.
  const pickle = leader ? diversionPrompt(state, rules, diversionOk) : null;
  if (pickle) {
    hints.push(`In a pickle: ${pickle}. Call the ${diversionName} [D] now: the garrison drops a level and lets go of everyone it has in its sights. ${capitalFirst(callsLeft(state, rules))}.`);
  }

  // A scout starting his turn on a point he can cut (M20: a playtester could
  // not tell why he had not been able to; it takes the whole turn). Being seen
  // does not stop him, but he cannot also get out of sight.
  const cutter = men.find((u) => checkCutLine(state, u, rules).ok);
  if (cutter) {
    const { objective } = checkCutLine(state, cutter, rules);
    const seen = cutter.inContact ? ' He is in contact, so an enemy will fire on him at the end of the turn, but the line is cut all the same.' : '';
    hints.push(`${cutter.shortName} is on a charge point of the ${objective.label}: he can cut the line now [X]. It takes his whole turn.${seen}`);
  }

  const inContact = men.filter((u) => u.inContact);
  if (inContact.length) {
    hints.push(`${names(inContact)} ${plural(inContact.length, 'is', 'are')} in contact: an enemy has ${plural(inContact.length, 'him', 'them')} in its sights and will fire. Get out of its view, hide in cover [H], or have a gunner suppress it [S].`);
  }

  const wounded = men.filter((u) => u.hits > 0 && !u.stabilised);
  if (wounded.length) {
    // Who can do it now, if anyone (M26); otherwise the general advice.
    const aiders = aidPrompts(state, rules).filter((p) => p.kind === 'stabilise');
    const who = names(aiders.map((p) => state.units.find((u) => u.id === p.unitId)));
    const help = aiders.length
      ? `${who} can stabilise ${plural(wounded.length, 'him', 'them')} [A]`
      : `A man beside ${plural(wounded.length, 'him', 'them')} can stabilise [A]`;
    hints.push(`${names(wounded)} ${plural(wounded.length, 'is', 'are')} wounded. ${help}; it takes his whole turn.`);
  }

  if (!won && turnsLeft <= 5) {
    const { targets, needed } = winTargets(state, rules);
    const toGo = needed - targets.filter((o) => o.destroyed).length;
    const still = single ? `the ${targets[0].label} still stands` : `${toGo} more ${kindOf(targets[0], rules).label} still to go`;
    hints.push(`Dawn in ${turnsLeft} ${plural(turnsLeft, 'turn', 'turns')}, and ${still}.`);
  }

  // A man behind an enemy (M12b): the knife is there to be used.
  for (const man of men) {
    if (man.inContact || man.ap < rules.actions.knife.apCost) continue;
    const back = state.enemies.find((e) => e.killable && hexDistance(e, man) === 1 && !inArc(e, e.facing, man, e.arcDegrees));
    if (back) {
      hints.push(`${man.shortName} is right behind the ${back.label.toLowerCase()}, and it cannot see him: he can knife it [N], silently${rules.actions.knife.fullTurn ? ', if he does it before he moves' : ''}. It leaves a body.`);
      break;
    }
  }

  const alert = alertIndex(state.alert.points, rules);
  if (alert >= 2 && diversionOk && leader && !pickle) {
    const label = rules.alert.states[alert].label;
    hints.push(`The garrison is ${label.toUpperCase()}. The ${diversionName} [D] can reduce it by one level: ${callsLeft(state, rules)}, and only while ${leader.shortName} lives.`);
  }

  const chutes = state.parachutes.length;
  if (chutes > 0 && state.turn <= 4) {
    // How to pack one is said once, on the first turn; after that, just the count.
    const how = state.turn === 1 ? ' Any man standing on one can pack it up [U] before a patrol finds it.' : '';
    hints.push(`${chutes} ${plural(chutes, 'parachute still lies', 'parachutes still lie')} where the men came down.${how}`);
  }

  if (state.turn === 1 && leader) {
    hints.push(`Regroup: ${leader.shortName}'s orders, at the start of each turn: ${ordersWords(rules.command)}.`);
  }

  if (state.turn <= 2) {
    const carriers = men.filter((u) => u.charges > 0);
    if (carriers.length) {
      // Where charges take a timer (M31), the second step is said too.
      const timer = rules.charges.fuseChoice ? ', then pick a timer' : '';
      hints.push(`${names(carriers)} ${plural(carriers.length, 'carries', 'carry')} the charges. Stand one on a red dashed charge point and press [C]${timer}.`);
    }
    // Whatever sets off its neighbours (M31, the airfield's bowser), while it
    // still stands and would take something with it.
    for (const setter of state.objectives) {
      if (setter.destroyed || !kindOf(setter, rules).setsOff) continue;
      const caught = chainFrom(state.objectives, setter, setter.chargeHexes, rules);
      if (caught.length === 0) continue;
      const labels = [...new Set(caught.map((c) => c.objective.label))];
      const what = labels.length === 1 && caught.length > 1 ? `${caught.length} ${labels[0]}s` : caught.length === 1 ? labels[0] : `${caught.length} targets`;
      hints.push(`The ${setter.label} sets off the ${what} beside it: ${caught.length + 1} for one charge. Hover it to see which.`);
    }
  }

  hints.push('Hover an enemy to see what it can see and where it walks. On a move, the dots under a hex are how near he is to being seen there: fill them all, a red cross, and he is spotted.');
  return hints.slice(0, max);
}
