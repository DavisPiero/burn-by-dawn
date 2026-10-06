// Hints for the briefing card (SPEC.md §11): up to three things worth doing
// next, worked out from the state. A pure function: it reads state and rules
// and returns words; it decides nothing and changes nothing (CLAUDE.md rule 7).
// Every number comes from data/rules.json (rule 5), and nobody is named in
// code: the leader is whoever carries the flag (rule 6).

import { alertIndex } from './enemy.js';
import { chargeCapacity, checkPassCharge, checkStabilise, onBoard } from './units.js';
import { boatLands, chainFrom, checkCutLine, kindOf, lastTurn } from './sabotage.js';
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
 * to set (none set or gone off for it yet), and toward a man who carries
 * charges by his loadout.
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
    // Prompted only toward a man whose loadout is charges (M37): any man can
    // take one now, and a prompt for every man beside a carrier would never stop.
    const taker = wanted && men.find((u) => chargeCapacity(u, rules) > 0 && checkPassCharge(man, u, rules).ok);
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
 * @returns {string[]} most pressing first, at most `max`. The turn card shows one (M44),
 *   so each is a line or two: what to do, and its key.
 */
export function hintsFor(state, rules, { diversionOk = false, diversionName = 'RAF diversion' } = {}, max = 3) {
  const hints = [];
  const men = state.units.filter(onBoard);
  const out = state.units.filter((u) => u.out).length;
  const won = winMet(state, rules);
  const single = rules.mission.win.condition === 'destroyPrimary';
  const turnsLeft = lastTurn(state, rules) - state.turn;
  const leader = men.find((u) => u.leader);

  // The win is in reach: say how far off it is.
  if (won && out < rules.mission.minimumOut) {
    const need = rules.mission.minimumOut - out;
    const job = single ? `The ${winTargets(state, rules).targets[0].label} is down` : `${capitalFirst(winWords(state, rules))} are down`;
    // Where the way out opens on a turn (M41) and has not yet: when, and what to do till then.
    const opens = boatLands(state, rules);
    if (opens !== null && state.turn < opens) hints.push(`${job}. The boat is in on turn ${opens}, in ${opens - state.turn} ${plural(opens - state.turn, 'turn', 'turns')}: get ${need} ${plural(need, 'man', 'men')} to the shore and lie low.`);
    else hints.push(`${job}. Get ${need} more ${plural(need, 'man', 'men')} onto the exfil ${rules.exfil?.openFor ? 'before the boat goes' : 'before dawn'}: ${turnsLeft} ${plural(turnsLeft, 'turn', 'turns')} left.`);
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
    hints.push(`The charge on the ${label} ${when}. Get everyone clear of the blast!`);
  }

  // In a pickle (M26d): the diversion next, after any charge about to blow.
  const pickle = leader ? diversionPrompt(state, rules, diversionOk) : null;
  if (pickle) {
    hints.push(`In a pickle: ${pickle}. Call the ${diversionName} [D] now.`);
  }

  // A scout starting his turn on a point he can cut (M20: a playtester could
  // not tell why he had not been able to; it takes the whole turn). Being seen
  // does not stop him, but he cannot also get out of sight.
  const cutter = men.find((u) => checkCutLine(state, u, rules).ok);
  if (cutter) {
    const { objective } = checkCutLine(state, cutter, rules);
    const seen = cutter.inContact ? ' He will be fired on, but the line is cut all the same.' : '';
    hints.push(`${cutter.shortName} is on a charge point of the ${objective.label}: cut the line now [X], a whole turn.${seen}`);
  }

  const inContact = men.filter((u) => u.inContact);
  if (inContact.length) {
    hints.push(`${names(inContact)} ${plural(inContact.length, 'is', 'are')} in contact and will be fired on: get out of view, hide [H], or ${rules.actions.returnFire ? 'fire back [S]' : 'have a gunner suppress [S]'}.`);
  }

  const wounded = men.filter((u) => u.hits > 0 && !u.stabilised);
  if (wounded.length) {
    // Who can do it now, if anyone (M26); otherwise the general advice.
    const aiders = aidPrompts(state, rules).filter((p) => p.kind === 'stabilise');
    const who = names(aiders.map((p) => state.units.find((u) => u.id === p.unitId)));
    const help = aiders.length
      ? `${who} can stabilise ${plural(wounded.length, 'him', 'them')} [A]`
      : `A man beside ${plural(wounded.length, 'him', 'them')} can stabilise [A]`;
    hints.push(`${names(wounded)} ${plural(wounded.length, 'is', 'are')} wounded. ${help}: a whole turn.`);
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
      hints.push(`${man.shortName} is behind the ${back.label.toLowerCase()}, unseen: knife it [N]${rules.actions.knife.fullTurn ? ' before he moves' : ''}. It leaves a body${rules.bodyFound.reinforcements > 0 ? ', and a body found brings reinforcements' : ''}.`);
      break;
    }
  }

  const alert = alertIndex(state.alert.points, rules);
  if (alert >= 2 && diversionOk && leader && !pickle) {
    const label = rules.alert.states[alert].label;
    hints.push(`The garrison is ${label.toUpperCase()}. The ${diversionName} [D] drops it a level: ${callsLeft(state, rules)}.`);
  }

  // Before the canisters since M44, when the card took one hint: a chute is
  // found by a patrol; a canister is ringed on the board already.
  const chutes = state.parachutes.length;
  if (chutes > 0 && state.turn <= 4) {
    // How to pack one is said once, on the first turn; after that, just the count.
    // Where the patrols have not set out yet (M36, the airfield), this is the turn to do it.
    const wait = state.turn < rules.patrols.setOutTurn ? ` The patrols set out at the end of turn ${rules.patrols.setOutTurn}.` : '';
    const how = state.turn === 1 ? ` Stand on one and pack it [U] before a patrol finds it.${wait}` : '';
    hints.push(`${chutes} ${plural(chutes, 'parachute lies', 'parachutes lie')} where the men landed.${how}`);
  }

  // Supply canisters (SPEC.md §9, M41): where the charges are, while any are left in one.
  const canisters = (state.canisters ?? []).length;
  if (canisters > 0 && state.turn <= 4) {
    const inside = state.droppedCharges.filter((c) => state.canisters.some((k) => k.q === c.q && k.r === c.r)).length;
    const how = state.turn === 1 ? ' Stand a man on one and Pick up [P].' : '';
    hints.push(`${inside} ${plural(inside, 'charge is', 'charges are')} still in ${canisters} ${plural(canisters, 'canister', 'canisters')}.${how}`);
  }

  if (state.turn === 1 && leader) {
    hints.push(`Regroup: ${leader.shortName}'s orders give ${ordersWords(rules.command)}.`);
  }

  if (state.turn <= 2) {
    const carriers = men.filter((u) => u.charges > 0);
    if (carriers.length) {
      // Where charges take a timer (M31), the second step is said too.
      const timer = rules.charges.fuseChoice ? ', then pick a timer' : '';
      hints.push(`${names(carriers)} ${plural(carriers.length, 'carries', 'carry')} the charges: stand on a red dashed charge point and press [C]${timer}.`);
    }
    // Whatever sets off its neighbours (M31, the airfield's bowser), while it
    // still stands and would take something with it.
    for (const setter of state.objectives) {
      if (setter.destroyed || !kindOf(setter, rules).setsOff) continue;
      const caught = chainFrom(state.objectives, setter, setter.chargeHexes, rules);
      if (caught.length === 0) continue;
      const labels = [...new Set(caught.map((c) => c.objective.label))];
      const what = labels.length === 1 && caught.length > 1 ? `${caught.length} ${labels[0]}s` : caught.length === 1 ? labels[0] : `${caught.length} targets`;
      hints.push(`The ${setter.label} sets off the ${what} beside it: ${caught.length + 1} for one charge.`);
    }
  }

  // The goods train (M34): its turn, and when the charges must be set to
  // catch it, while it can still be caught. Said first on the turns a charge
  // set now would do it.
  const crossed = rules.train ? state.objectives.find((o) => o.kind === rules.train.objective) : null;
  if (crossed && !crossed.destroyed) {
    const { turn, window, score, label } = rules.train;
    const burn = rules.charges.fuseTurns - 1;
    const from = turn - window - burn, to = turn + window - burn;
    if (state.turn >= from && state.turn <= to) {
      hints.unshift(`A charge set on the ${crossed.label} this turn goes off on turn ${state.turn + burn}: under the ${label.toLowerCase()}, +${score}.`);
    } else if (state.turn < from) {
      hints.push(`The ${label.toLowerCase()} crosses the ${crossed.label} on turn ${turn}. Charges set on turns ${from} to ${to} bring it down under the train: +${score}.`);
    }
  }

  hints.push('Hover an enemy to see what it sees and where it walks.');
  return hints.slice(0, max);
}
