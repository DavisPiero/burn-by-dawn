// M7b: the briefing card's hints (SPEC.md §11), a pure function of the state.

import { aidPrompts, aidWords, hintsFor } from '../src/hints.js';
import { orderReport } from '../src/render/ui.js';
import { loadJson, loadMap } from '../src/map.js';
import { validateTraits } from '../src/traits.js';
import { chargeCapacity } from '../src/units.js';
import { landedState } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function start() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(), loadJson('data/rules.json'), loadJson('data/traits.json'), loadJson('data/roster.json'),
  ]);
  return { rules, state: landedState(roster, validateTraits(traitsJson), rules, map) };
}

const has = (hints, words) => hints.some((h) => h.includes(words));
const chargeRoom = (unit, rules) => chargeCapacity(unit, rules);

export default [
  ['never more than three hints, and always at least one', async () => {
    const { rules, state } = await start();
    const hints = hintsFor(state, rules);
    assert(hints.length >= 1 && hints.length <= 3, `got ${hints.length}`);
    const quiet = hintsFor({ ...state, turn: 9, parachutes: [] }, rules);
    assert(quiet.length === 1 && has(quiet, 'Hover an enemy'), `a quiet turn falls back to the general hint: ${quiet}`);
  }],
  ['a charge about to go off comes before anything else', async () => {
    const { rules, state } = await start();
    const bridge = state.objectives.find((o) => o.primary);
    const hints = hintsFor({ ...state, charges: [{ objectiveId: bridge.id, q: 9, r: 5, fuse: 1 }] }, rules);
    assert(hints[0].includes('goes off at the end of this turn'), hints[0]);
  }],
  ['a wounded man is named, and the leader by his flag, never by name in code', async () => {
    const { rules, state } = await start();
    const units = state.units.map((u, i) => (i === 1 ? { ...u, hits: 1, stabilised: false } : u));
    const hints = hintsFor({ ...state, turn: 1, units }, rules);
    assert(has(hints, `${units[1].shortName} is wounded`), hints.join(' | '));
    const leader = units.find((u) => u.leader);
    const regroup = hintsFor({ ...state, turn: 1, parachutes: [] }, rules);
    assert(has(regroup, `${leader.shortName}'s orders`), regroup.join(' | '));
    assert(has(regroup, `+${rules.command.closeBonusActionPoints} AP beside him, +${rules.command.bonusActionPoints} AP within ${rules.command.radius} hexes of him`), regroup.join(' | '));
  }],
  ['with the primary down, it counts the men still to get out and the turns left', async () => {
    const { rules, state } = await start();
    const objectives = state.objectives.map((o) => (o.primary ? { ...o, destroyed: true } : o));
    const hints = hintsFor({ ...state, turn: 15, objectives }, rules);
    assert(has(hints, `Get ${rules.mission.minimumOut} more men onto the exfil`) && has(hints, `${rules.turnLimit - 15} turns left`), hints[0]);
  }],
  ['a scout starting his turn on the exchange\'s charge point is told he can cut the line, seen or not (M20)', async () => {
    const { rules, state } = await start();
    const exchange = state.objectives.find((o) => rules.objectives[o.kind].cutLine);
    const point = exchange.chargeHexes[0];
    const scout = state.units.find((u) => rules.roles[u.role].cutLine);
    const units = state.units.map((u) => (u.id === scout.id ? { ...u, q: point.q, r: point.r, ap: u.apMax, inContact: true } : u));
    const hints = hintsFor({ ...state, turn: 9, parachutes: [], units }, rules);
    assert(has(hints, `${scout.shortName} is on a charge point`) && has(hints, 'cut all the same'), hints.join(' | '));
    const spent = units.map((u) => (u.id === scout.id ? { ...u, ap: 0 } : u));
    assert(!has(hintsFor({ ...state, turn: 9, parachutes: [], units: spent }, rules), 'is on a charge point'), 'not once he has spent his AP');
  }],
  ['Stabilise is prompted to the man beside a wounded one, only while he has his whole turn (M26)', async () => {
    const { rules, state } = await start();
    const [a, b, c] = state.units;
    const place = (unit, q, r, extra = {}) => ({ ...unit, q, r, ap: unit.apMax, ...extra });
    const units = state.units.map((u) => {
      if (u.id === a.id) return place(u, 5, 5);
      if (u.id === b.id) return place(u, 6, 5, { hits: 1, stabilised: false });
      if (u.id === c.id) return place(u, 5, 9);
      return { ...u, q: 20 + state.units.indexOf(u), r: 0 };
    });
    const stabilise = (units) => aidPrompts({ ...state, units }, rules).filter((p) => p.kind === 'stabilise');
    const open = stabilise(units);
    assert(open.length === 1 && open[0].unitId === a.id && open[0].otherId === b.id, `beside him: ${JSON.stringify(open)}`);
    assert(aidWords(open[0], units, rules).includes(`${b.shortName} is wounded`), aidWords(open[0], units, rules));
    assert(stabilise(units.map((u) => (u.id === a.id ? { ...u, ap: u.apMax - 1 } : u))).length === 0, 'not once he has spent AP');
    assert(stabilise(units.map((u) => (u.id === a.id ? { ...u, q: 4, r: 8 } : u))).length === 0, 'not when he is not beside him');
    assert(stabilise(units.map((u) => (u.id === b.id ? { ...u, stabilised: true } : u))).length === 0, 'not once he is dressed');
    assert(aidPrompts({ ...state, units, outcome: { kind: 'success' } }, rules).length === 0, 'none once the mission is over');
    const hints = hintsFor({ ...state, turn: 3, parachutes: [], units }, rules);
    assert(has(hints, `${a.shortName} can stabilise`), `the turn card names who can: ${hints.join(' | ')}`);
  }],
  ['Pass is prompted to a carrier beside a man with room, while the primary stands (M26)', async () => {
    const { rules, state } = await start();
    const giver = state.units.find((u) => u.charges > 0);
    const taker = state.units.find((u) => u.id !== giver.id && chargeCapacity(u, rules) > 0);
    const far = (u, i) => ({ ...u, q: 20 + i, r: 0, ap: u.apMax });
    const units = state.units.map((u, i) => {
      if (u.id === giver.id) return { ...u, q: 5, r: 5, ap: u.apMax, charges: 1 };
      if (u.id === taker.id) return { ...u, q: 6, r: 5, ap: u.apMax, charges: 0 };
      return far(u, i);
    });
    const pass = (s) => aidPrompts(s, rules).filter((p) => p.kind === 'pass');
    const open = pass({ ...state, units });
    assert(open.length === 1 && open[0].unitId === giver.id && open[0].otherId === taker.id, `beside a man with room: ${JSON.stringify(open)}`);
    assert(aidWords(open[0], units, rules).includes(`${taker.shortName} is beside him`), aidWords(open[0], units, rules));
    assert(pass({ ...state, units: units.map((u) => (u.id === taker.id ? { ...u, charges: chargeRoom(u, rules) } : u)) }).length === 0, 'not when he has no room');
    assert(pass({ ...state, units: units.map((u) => (u.id === taker.id ? { ...u, hits: 1, stabilised: false } : u)) }).length === 0, 'not to a wounded man');
    const objectives = state.objectives.map((o) => (o.primary ? { ...o, destroyed: true } : o));
    assert(pass({ ...state, units, objectives }).length === 0, 'not once the primary is down');
    const bridge = state.objectives.find((o) => o.primary);
    const full = Array.from({ length: rules.objectives[bridge.kind].chargesNeeded }, (_, i) => ({ objectiveId: bridge.id, q: 9, r: 5 + i, fuse: 3 }));
    assert(pass({ ...state, units, charges: full }).length === 0, 'not once it has every charge it wants');
  }],
  ['the turn report keeps each man together, worst news first, his death last (M13)', async () => {
    const events = [
      { kind: 'alertRise' }, { kind: 'killed', unitId: 'a' }, { kind: 'spotted', unitId: 'b' },
      { kind: 'spotted', unitId: 'a' }, { kind: 'heard' },
    ];
    const order = orderReport(events).map((e) => `${e.kind}${e.unitId ?? ''}`).join(' ');
    assert(order === 'spotteda killeda spottedb alertRise heard', order);
  }],
];
