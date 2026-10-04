// Missions (M27): data/missions.json names each mission's files and patches
// and picks its win condition from a fixed list; France is mission 1 and must
// play exactly as the files did before missions existed.

import {
  WIN_CONDITIONS, isWinTarget, missionById, missionEnemyTypes, missionFromQuery, missionLevels, missionRoster, missionRules, validateMissions, winMet, winShortfall, winWords,
} from '../src/missions.js';
import { applyDifficulty, levelById, validateDifficulty } from '../src/difficulty.js';
import { runFusePhase } from '../src/sabotage.js';
import { loadJson, loadMap } from '../src/map.js';
import { createInitialState, settleMission } from '../src/state.js';
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

// A mission printed on the contents page and not yet playable: all it needs.
const COMING = { id: 'someday', status: 'coming', title: 'Someday', place: 'Somewhere', page: 99, blurb: 'Not yet.' };

export default [
  ['France is the default mission, and its patch leaves the files as they are but for its goods train (M34) and its dawn (M38)', async () => {
    const { json, mission, map, rules } = await loadFrance();
    equal(json.default, 'france', 'the default');
    equal(mission.status, 'playable', 'France can be played');
    // M38b: its own dawn too, turn 16 (15 in M38); the files' is 20, and the airfield keeps it.
    equal(Object.keys(mission.rules).join(), 'turnLimit,train', 'its patch is its dawn and the train');
    const files = await loadJson('data/rules.json');
    equal(rules.turnLimit, 16, 'dawn at the end of turn 16');
    equal(files.turnLimit, 20, 'the files\' dawn is 20');
    equal(JSON.stringify({ ...rules, train: null, turnLimit: files.turnLimit }), JSON.stringify(files), 'the rest unchanged, win condition included');
    equal(JSON.stringify(map), JSON.stringify(await loadMap()), 'map and enemy types unchanged');
  }],

  ['the contents page lists every mission; a coming one needs only what is printed, and cannot be picked', async () => {
    // M41: the aqueduct became a draft, so the file may have no coming mission; one is added here.
    const { json: file } = await loadFrance();
    const json = validateMissions({ ...file, missions: [...file.missions, COMING] });
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
    throws(() => validateMissions({ ...json, missions: [...json.missions, COMING], default: COMING.id }), /default/, 'a default that cannot be played');
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
    const { map: withPrimary, rules: france, traits, roster } = await loadFrance();
    // France's two secondaries as stand-ins: destroy either of them. A
    // destroyCount mission has no primary (M28).
    const map = { ...withPrimary, objectives: withPrimary.objectives.map((o) => ({ ...o, primary: false })) };
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

  ['a mission carries its own part of each level (M28): France\'s bridge on Easy and reinforcements on Hard, after the level\'s own', async () => {
    const { mission, map, rules } = await loadFrance();
    const plain = validateDifficulty(await loadJson('data/difficulty.json'), rules, { types: map.enemyTypes });
    const json = missionLevels(mission, plain, rules, map.enemyTypes);
    const at = (id) => applyDifficulty(levelById(json, id), rules, map).rules;
    equal(at('easy').objectives.bridge.chargesNeeded, 1, 'Easy: the bridge takes one charge');
    equal(at('easy').mission.minimumOut, 2, 'and the level\'s own patch still applies');
    equal(at('hard').objectives.bridge.reinforcements, 2, 'Hard: two squads for the bridge');
    equal(at('hard').objectives.fuelDump.reinforcements, 1, 'one for the fuel dump');
    equal(JSON.stringify(at('normal')), JSON.stringify(rules), 'Normal: the files as they are');
    assert(levelById(json, 'easy').summary.startsWith('The bridge takes one charge. '), 'the mission\'s words first');
    equal(applyDifficulty(levelById(plain, 'easy'), rules, map).rules.objectives.bridge.chargesNeeded, rules.objectives.bridge.chargesNeeded, 'difficulty.json alone no longer touches the bridge');
    throws(() => missionLevels({ ...mission, levels: { brutal: {} } }, plain, rules, map.enemyTypes), /brutal/, 'a level that is not there');
    throws(() => missionLevels({ ...mission, levels: { easy: { rules: { objectives: { bridge: { chargesNeded: 1 } } } } } }, plain, rules, map.enemyTypes), /chargesNeded/, 'a mistyped key');
  }],

  ['a draft mission is stamped on the contents page, but ?mission= plays it (M28)', async () => {
    const { json } = await loadFrance();
    const france = json.missions.find((m) => m.id === 'france');
    const draft = { ...france, id: 'trial', status: 'draft' };
    const withDraft = validateMissions({ ...json, missions: [...json.missions, draft] });
    equal(missionFromQuery('?mission=trial', withDraft), 'trial', 'picked from the address');
    equal(missionById(withDraft, 'trial').id, 'trial', 'and played');
    throws(() => validateMissions({ ...json, missions: [...json.missions, { ...draft, map: undefined }] }), /"map"/, 'a draft needs everything a playable one does');
  }],

  ['a mission may give the men lines of their own (M28): only the lines it names change', async () => {
    const { mission, roster } = await loadFrance();
    equal(missionRoster(mission, roster), roster, 'France changes nothing');
    const vance = roster.troopers.find((t) => t.id === 'vance');
    const desert = missionRoster({ ...mission, dialogue: { vance: { onLand: 'Sand. Lots of it.' } } }, roster);
    const moved = desert.troopers.find((t) => t.id === 'vance');
    equal(moved.dialogue.onLand, 'Sand. Lots of it.', 'the line replaced');
    equal(moved.dialogue.onWounded, vance.dialogue.onWounded, 'the rest kept');
    equal(moved.traits.join(), vance.traits.join(), 'his particulars untouched');
    equal(vance.dialogue.onLand, roster.troopers.find((t) => t.id === 'vance').dialogue.onLand, 'the roster file as loaded is left alone');
    throws(() => missionRoster({ ...mission, dialogue: { smith: { onLand: 'Hello' } } }, roster), /smith/, 'a man who is not in the roster');
  }],

  ['destroyCount plays through (M28): no primary, the job pays scoring.win, the rest are bonus', async () => {
    const { map: withPrimary, rules: france, traits, roster } = await loadFrance();
    const map = { ...withPrimary, objectives: withPrimary.objectives.map((o) => ({ ...o, primary: false })) };
    const rules = {
      ...france,
      mission: { ...france.mission, win: { condition: 'destroyCount', kind: 'fuelDump', count: 1 } },
      scoring: { ...france.scoring, win: 10 },
    };
    throws(() => createInitialState(roster, traits, rules, withPrimary, 1), /no "primary"/, 'a destroyCount map has no primary');
    const twoDumps = { ...rules, mission: { ...rules.mission, win: { ...rules.mission.win, count: 2 } } };
    throws(() => createInitialState(roster, traits, twoDumps, map, 1), /wants 2/, 'nor fewer targets than it counts');
    throws(() => createInitialState(roster, traits, france, map, 1), /exactly one/, 'while destroyPrimary still wants its one');

    let state = landedState(roster, traits, rules, map);
    const dump = state.objectives.find((o) => o.kind === 'fuelDump');
    const bridge = state.objectives.find((o) => o.kind === 'bridge');
    assert(isWinTarget(state, rules, dump) && !isWinTarget(state, rules, bridge), 'the dump counts; the bridge is a bonus');
    const at = dump.chargeHexes[0];
    state = { ...state, charges: [{ objectiveId: dump.id, q: at.q, r: at.r, fuse: 1, unitId: null }] };
    state = runFusePhase(state, rules).state;
    assert(winMet(state, rules), 'the dump blown is the job done');
    const out = state.units.map((u, i) => (i < rules.mission.minimumOut ? { ...u, out: true } : { ...u, dead: true }));
    const settled = settleMission({ ...state, units: out }, rules, map);
    equal(settled.outcome.kind, 'success', 'and with enough men out, a success');
    const lines = settled.outcome.score.lines;
    const job = lines.find((l) => l.label.startsWith('The job done'));
    equal(job?.points, 10, 'the job pays scoring.win');
    equal(lines.find((l) => l.label.startsWith('Fuel Dump'))?.points, rules.objectives.fuelDump.score, 'and the target its own score');
  }],
];
