// The goods train (M34, SPEC.md §7): scenery with a timetable, and the score
// for dropping the Rail Bridge under it. Runs against the real data files.

import { loadJson, loadMap } from '../src/map.js';
import { missionById, missionEnemyTypes, missionRules, validateMissions } from '../src/missions.js';
import { scoreOf } from '../src/scoring.js';
import { createInitialState } from '../src/state.js';
import { railwayLine, trainAt, trainCaught, trainEvents, trainTimetable } from '../src/train.js';
import { validateTraits } from '../src/traits.js';
import { hintsFor } from '../src/hints.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function load(id) {
  const json = validateMissions(await loadJson('data/missions.json'));
  const mission = missionById(json, id);
  const map = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
  const rules = missionRules(mission, await loadJson('data/rules.json'));
  const traits = validateTraits(await loadJson('data/traits.json'));
  const state = { ...createInitialState(await loadJson(mission.roster), traits, rules, map, 1), phase: 'play' };
  return { map, rules, state };
}
// The mission at the start of `turn`, the bridge down on `down` (or standing).
const at = (state, turn, down = null) => ({
  ...state, turn,
  objectives: state.objectives.map((o) => (o.kind === 'bridge' && down !== null ? { ...o, destroyed: true, downTurn: down } : o)),
});
const heads = (state, rules, map, turns, down) => turns.map((t) => { const tr = trainAt(at(state, t, down), rules, map); return tr ? `${tr.status[0]}${tr.head}` : '-'; }).join(' ');

export default [
  ['France has a goods train on the Rail Bridge in turn 17 (M34b); the airfield has none', async () => {
    const { rules, state, map } = await load('france');
    equal(rules.train.turn, 17, 'turn 17');
    equal(rules.train.score, 5, 'five points');
    equal(rules.train.window, 1, 'within a turn');
    const table = trainTimetable(state, rules, map);
    equal(railwayLine(map).length, 18, 'the line runs the width of the board');
    equal(`${table.first}-${table.last}`, '11-13', 'the bridge is three hexes of it');
    equal(table.crossing, 12, 'the engine is mid-bridge when it is on it');
    const airfield = await load('airfield');
    equal(airfield.rules.train, null, 'no train on the airfield');
    equal(trainAt(airfield.state, airfield.rules, airfield.map), null, 'and none on its board');
    equal((await loadJson('data/rules.json')).train, null, 'none unless a mission gives one');
  }],

  ['it comes on from the west three turns before, is on the bridge after the garrison\'s turn 17, and is gone two turns later', async () => {
    const { rules, state, map } = await load('france');
    // The board in the player phase of each turn: after the enemy phase of the turn before.
    equal(heads(state, rules, map, [14, 15, 16, 17, 18, 19, 20], null), '- r0 r4 r8 r12 r16 r20'.replace(/\s+/g, ' '), 'four hexes a turn');
    const coming = trainAt(at(state, 15), rules, map);
    equal(`${coming.cars[0].q},${coming.cars[0].r}`, '-3,6', 'first seen on the west edge');
    equal(trainAt(at(state, 18), rules, map).cars.length, 5, 'five cars long');
    assert(trainAt(at(state, 19), rules, map).cars.some((c) => c.index === 12), 'its tail still on the bridge a turn after');
  }],

  ['the bridge down within a turn of it wrecks it and pays 5; earlier it stops short or never comes; later it has gone by', async () => {
    const { rules, state, map } = await load('france');
    for (const [down, caught] of [[9, false], [15, false], [16, true], [17, true], [18, true], [19, false]]) {
      equal(trainCaught(at(state, 20, down), rules), caught, `down on turn ${down}`);
      const line = scoreOf(at(state, 20, down), rules).lines.find((l) => l.label.includes('wrecked'));
      equal(line?.points ?? 0, caught ? 5 : 0, `scored, down on turn ${down}`);
    }
    equal(trainCaught(at(state, 20), rules), false, 'a bridge still standing catches nothing');
    // Down on 16, ahead of it: it runs on into the gap in the garrison's turn 17.
    equal(heads(state, rules, map, [17, 18, 19, 20], 16), 'r8 w11 w11 w11', 'into the gap');
    // Down on 17, under it; on 18, under its tail.
    equal(heads(state, rules, map, [18, 19, 20], 17), 'w12 w12 w12', 'down with it');
    equal(heads(state, rules, map, [19, 20], 18), 'w16 w16', 'its tail');
    // Down on 15, with the train already on the map: it stops at the west bank.
    equal(heads(state, rules, map, [16, 17, 18, 20], 15), 'h4 h8 h10 h10', 'stops short');
    // Down on 9, before it set out: no train.
    equal(heads(state, rules, map, [15, 17, 19], 9), '- - -', 'the line is cut: none comes');
  }],

  ['the turn report says it comes, crosses, stops or is wrecked; the turn card says when to set the charges', async () => {
    const { rules, state, map } = await load('france');
    const what = (turn, downBefore, downNow) => trainEvents(at(state, turn, downBefore), at(state, turn + 1, downNow ?? downBefore), rules, map).map((e) => e.what).join();
    equal(what(14), 'comes', 'it comes on in the garrison\'s turn 14');
    equal(what(15), '', 'nothing to say while it runs');
    equal(what(17), 'crosses', 'on the bridge in turn 17');
    equal(what(17, null, 17), 'wrecked', 'down under it');
    equal(what(17, 16), 'wrecked', 'into the gap');
    equal(what(15, null, 15), 'halts', 'stops when the bridge goes early');
    equal(trainEvents(at(state, 5), at(state, 6), { ...rules, train: null }, map).length, 0, 'no train, no lines');

    const early = hintsFor({ ...at(state, 5), parachutes: [] }, rules, {}, 10);
    assert(early.some((h) => h.includes('Charges set on turns 14 to 16')), `before: ${early.join(' | ')}`);
    const due = hintsFor({ ...at(state, 15), parachutes: [] }, rules, {}, 10);
    assert(due[0].includes('this turn goes off on turn 17'), `in the window it is said first: ${due[0]}`);
    const late = hintsFor({ ...at(state, 18), parachutes: [] }, rules, {}, 10);
    assert(!late.some((h) => h.toLowerCase().includes('goods train')), 'nothing once it cannot be caught');
  }],
];
