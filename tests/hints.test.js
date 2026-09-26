// M7b: the briefing card's hints (SPEC.md §11), a pure function of the state.

import { hintsFor } from '../src/hints.js';
import { loadJson, loadMap } from '../src/map.js';
import { validateTraits } from '../src/traits.js';
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
];
