// Missions (M27): data/missions.json names each mission's files and patches
// and picks its win condition from a fixed list; France is mission 1 and must
// play exactly as the files did before missions existed.

import {
  WIN_CONDITIONS, missionById, missionEnemyTypes, missionFromQuery, missionRules, validateMissions, winMet, winShortfall, winWords,
} from '../src/missions.js';
import { loadJson, loadMap } from '../src/map.js';
import { settleMission } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { landedState } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function throws(fn, pattern, message) {
  try {
    fn();
  } catch (error) {
    assert(pattern.test(error.message), `${message}: threw "${error.message}"`);
    return;
  }
  throw new Error(`${message}: did not throw`);
}

async function loadFrance() {
  const json = validateMissions(await loadJson('data/missions.json'));
  const mission = missionById(json, 'france');
  const map = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
  const rules = missionRules(mission, await loadJson('data/rules.json'));
  const traits = validateTraits(await loadJson('data/traits.json'));
  const roster = await loadJson(mission.roster);
  return { json, mission, map, rules, traits, roster };
}

export default [
  ['France is the default mission, and its patches leave the files exactly as they are', async () => {
    const { json, mission, map, rules } = await loadFrance();
    equal(json.default, 'france', 'the default');
    equal(mission.status, 'playable', 'France can be played');
    equal(JSON.stringify(rules), JSON.stringify(await loadJson('data/rules.json')), 'rules unchanged, win condition included');
    equal(JSON.stringify(map), JSON.stringify(await loadMap()), 'map and enemy types unchanged');
  }],

  ['the contents page lists every mission; a coming one needs only what is printed, and cannot be picked', async () => {
    const { json } = await loadFrance();
    assert(json.missions.some((m) => m.status === 'coming'), 'at least one mission stamped for next year');
    equal(missionFromQuery('?mission=france', json), 'france', '?mission= picks a playable one');
    const coming = json.missions.find((m) => m.status === 'coming');
    equal(missionFromQuery(`?mission=${coming.id}`, json), null, 'a coming one cannot be picked');
    equal(missionFromQuery('?mission=nowhere', json), null, 'nor an unknown one');
    equal(missionById(json, coming.id).id, json.default, 'asked for anyway, the default plays');
  }],

  ['bad mission data fails loudly', async () => {
    const { json } = await loadFrance();
    const france = json.missions.find((m) => m.id === 'france');
    const withMission = (patch) => ({ ...json, missions: [{ ...france, ...patch }] });
    throws(() => validateMissions(withMission({ status: 'soon' })), /status/, 'an unknown status');
    throws(() => validateMissions(withMission({ map: undefined })), /"map"/, 'a playable mission without its map');
    throws(() => validateMissions(withMission({ win: { condition: 'winEverything' } })), /condition/, 'an unknown win condition');
    throws(() => validateMissions(withMission({ win: { condition: 'destroyCount', kind: 'fuelDump' } })), /count/, 'destroyCount without its count');
    throws(() => validateMissions({ ...json, default: json.missions.find((m) => m.status === 'coming').id }), /default/, 'a default that cannot be played');
    const rules = await loadJson('data/rules.json');
    throws(() => missionRules({ ...france, rules: { turnLimt: 16 } }, rules), /turnLimt/, 'a mistyped rules key');
    const added = missionRules({ ...france, rules: { objectives: { aircraft: { label: 'Aircraft', chargesNeeded: 1 } } } }, rules);
    equal(added.objectives.aircraft.chargesNeeded, 1, 'a new objective kind may be added');
    equal(added.objectives.bridge.chargesNeeded, rules.objectives.bridge.chargesNeeded, 'the others kept');
  }],

  ['the win conditions are a fixed list', async () => {
    equal(Object.keys(WIN_CONDITIONS).join(), 'destroyPrimary,destroyCount', 'the vocabulary');
  }],

  ['destroyPrimary: the Rail Bridge down is the win, as before', async () => {
    const { map, rules, traits, roster } = await loadFrance();
    const state = landedState(roster, traits, rules, map);
    equal(winWords(state, rules), 'the Rail Bridge', 'named in words');
    equal(winMet(state, rules), false, 'standing');
    const down = { ...state, objectives: state.objectives.map((o) => (o.primary ? { ...o, destroyed: true } : o)) };
    equal(winMet(down, rules), true, 'down');
  }],

  ['destroyCount: any N of a kind, and the charges short counted on the cheapest left', async () => {
    const { map, rules: france, traits, roster } = await loadFrance();
    // France's two secondaries as stand-ins: destroy either of them.
    const rules = { ...france, mission: { ...france.mission, win: { condition: 'destroyCount', kind: 'fuelDump', count: 1 } } };
    const state = landedState(roster, traits, rules, map);
    equal(winWords(state, rules), '1 of the 1 Fuel Dump', 'named in words');
    equal(winShortfall(state, rules), 0, 'the stick carries enough');
    const empty = { ...state, units: state.units.map((u) => ({ ...u, charges: 0 })) };
    equal(winShortfall(empty, rules), 1, 'one charge short with none carried');
    const dump = state.objectives.find((o) => o.kind === 'fuelDump');
    const done = { ...empty, objectives: empty.objectives.map((o) => (o.id === dump.id ? { ...o, destroyed: true } : o)) };
    equal(winMet(done, rules), true, 'met once the dump is down');
    equal(winShortfall(done, rules), 0, 'and nothing short');
    const two = { ...rules, mission: { ...rules.mission, win: { condition: 'destroyCount', kind: 'fuelDump', count: 2 } } };
    equal(winShortfall(state, two), Infinity, 'more than there are can never be met');
    equal(settleMission(state, two, map).outcome.kind, 'withdrawn', 'so the mission withdraws');
  }],
];
