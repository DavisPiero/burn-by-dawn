// Mission 3, the aqueduct (SPEC.md §14, MISSION-AQUEDUCT.md, M41): its map and
// data as a draft, with the two rules M40 gave the engine switched on. Runs
// against the real data files.

import { boatAt, boatEvents } from '../src/boat.js';
import { applyDifficulty, levelById, validateDifficulty } from '../src/difficulty.js';
import { hexDistance } from '../src/hex.js';
import { hexKey, isInPlay, isPassable, loadJson, loadMap, reachableWithin, terrainAt, terrainIdAt } from '../src/map.js';
import { missionById, missionEnemyTypes, missionFromQuery, missionLevels, missionRoster, missionRules, validateMissions, winTargets } from '../src/missions.js';
import { applyPayoff, effectiveMap, exfilOpen, isExfil, kindOf } from '../src/sabotage.js';
import { chooseDropRun, createInitialState, endTurn, jump } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { chargeCapacity, chargeRoom } from '../src/units.js';
import { hintsFor } from '../src/hints.js';
import { exfilArtId, objectiveArt, terrainArt } from '../src/render/theme.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadAqueduct(levelId = 'normal') {
  const json = validateMissions(await loadJson('data/missions.json'));
  const mission = missionById(json, 'aqueduct');
  const loadedMap = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
  const loadedRules = missionRules(mission, await loadJson('data/rules.json'));
  const difficulty = missionLevels(mission, validateDifficulty(await loadJson('data/difficulty.json'), loadedRules, { types: loadedMap.enemyTypes }), loadedRules, loadedMap.enemyTypes);
  const { rules, map } = applyDifficulty(levelById(difficulty, levelId), loadedRules, loadedMap);
  const traits = validateTraits(await loadJson('data/traits.json'));
  const roster = missionRoster(mission, await loadJson(mission.roster));
  return { json, mission, map, rules, traits, roster };
}

const SEEDS = Array.from({ length: 30 }, (_, i) => i * 7919 + 3);

export default [
  ['the aqueduct is a draft: played by its address, stamped on the contents page, France still the default', async () => {
    const { json, mission } = await loadAqueduct();
    equal(mission.status, 'draft', 'not announced yet');
    equal(missionFromQuery('?mission=aqueduct', json), 'aqueduct', 'the address opens it');
    equal(json.default, 'france', 'France still opens by default');
  }],

  ['one primary that takes four charges of six points (three on Easy, five on Hard), six charges in three canisters, nobody carrying one', async () => {
    for (const [level, charges, squads] of [['easy', 3, 0], ['normal', 4, 1], ['hard', 5, 2]]) {
      const { map, rules, traits, roster } = await loadAqueduct(level);
      const state = createInitialState(roster, traits, rules, map, 1);
      const { targets } = winTargets(state, rules);
      equal(targets.map((o) => o.id).join(), 'aqueduct', `${level}: the win is the aqueduct`);
      equal(kindOf(targets[0], rules).chargesNeeded, charges, `${level}: charges it takes`);
      equal(kindOf(targets[0], rules).reinforcements, squads, `${level}: squads it calls`);
      equal(targets[0].chargeHexes.length, 6, `${level}: six charge points`);
      equal(rules.canisters.count * rules.canisters.charges, 6, `${level}: six charges in the canisters`);
      assert(state.units.every((u) => u.charges === 0), `${level}: nobody jumps with one`);
    }
  }],

  ['a sapper has room for two at full pace, Nunn for one, and anyone else one that slows him', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const state = createInitialState(roster, traits, rules, map, 1);
    const full = (id) => chargeCapacity(state.units.find((u) => u.id === id), rules);
    equal(`${full('holloway')} ${full('fitch')} ${full('nunn')}`, '2 2 1', 'at full pace');
    for (const id of ['vance', 'barrow', 'speers']) {
      const man = state.units.find((u) => u.id === id);
      equal(`${chargeCapacity(man, rules)} ${chargeRoom(man, rules)}`, '0 1', `${id}: none at full pace, room for one`);
    }
  }],

  ['every charge point is ground a man can stand on, beside what it brings down; the road bridge down is ravine and stops the reserve', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const state = createInitialState(roster, traits, rules, map, 1);
    for (const o of state.objectives) {
      for (const h of o.chargeHexes) {
        assert(isPassable(terrainAt(map, h.q, h.r)), `${o.id}: (${h.q}, ${h.r}) can be stood on`);
        assert(o.hexes.some((x) => hexDistance(x, h) === 1), `${o.id}: (${h.q}, ${h.r}) is beside it`);
      }
      assert(objectiveArt(o), `${o.id} has a picture`);
      assert(objectiveArt({ ...o, destroyed: true }), `${o.id} has a picture of its ruin`);
    }
    const bridge = state.objectives.find((o) => o.id === 'road-bridge');
    equal(kindOf(bridge, rules).payoff.noReserve, true, 'its payoff stops the reserve');
    const down = { ...state, objectives: state.objectives.map((o) => (o === bridge ? { ...o, destroyed: true } : o)) };
    equal(terrainIdAt(effectiveMap(map, down.objectives, rules), bridge.hexes[0].q, bridge.hexes[0].r), 'ravine', 'down, its hex is ravine');
    equal(applyPayoff(down, down.objectives.find((o) => o.id === 'road-bridge'), rules).state.reserveCancelled, true, 'and no reserve comes');
  }],

  ['every terrain on the map is drawn, and the exfil is the boat', async () => {
    const { map } = await loadAqueduct();
    for (const id of new Set(Object.values(map.legend))) assert(terrainArt(id).fill, `${id} has a style`);
    for (const id of ['hillside', 'crag', 'ravine', 'terrace', 'olives', 'plough', 'aqueduct', 'arch', 'shingle', 'rocks', 'sea']) {
      assert(Object.values(map.legend).includes(id), `${id} is on the map`);
    }
    equal(exfilArtId(map.exfilArt), 'objective-boat', 'the boat');
  }],

  ['on every run and seed the six land on the board, clear of the sea and the crags, with three canisters down', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    equal(map.dropRuns.map((r) => r.tag).join(), 'quiet,steady,fast', 'the three runs');
    for (const run of map.dropRuns) {
      for (const seed of SEEDS) {
        const s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, seed), map, run.id), map, rules);
        for (const at of [...s.units, ...s.canisters]) {
          assert(isInPlay(map, at.q, at.r) && isPassable(terrainAt(map, at.q, at.r)), `${run.id} seed ${seed}: something came down where nobody can stand`);
          assert(!isExfil(map, at), `${run.id} seed ${seed}: on the exfil`);
        }
        equal(s.canisters.length, 3, `${run.id} seed ${seed}: canisters`);
        equal(new Set([...s.units, ...s.canisters].map((x) => hexKey(x.q, x.r))).size, 9, `${run.id} seed ${seed}: nine hexes, nothing sharing`);
      }
    }
  }],

  ['a man can walk from every run to the aqueduct, the road bridge and the beach', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const open = effectiveMap(map, createInitialState(roster, traits, rules, map, 1).objectives, rules, rules.exfil.opensTurn);
    for (const run of map.dropRuns) {
      const s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 5), map, run.id), map, rules);
      const reach = reachableWithin(open, s.units[0], 999, null);
      for (const o of s.objectives) assert(o.chargeHexes.every((h) => reach.has(hexKey(h.q, h.r))), `${run.id}: the ${o.label}'s points`);
      assert(map.exfil.every(([q, r]) => reach.has(hexKey(q, r))), `${run.id}: the beach`);
    }
  }],

  ['the beach is shut until turn 15, the boat is seen coming for two turns before, and dawn is the end of turn 18', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    equal(rules.exfil.opensTurn, 15, 'the boat is in on 15');
    equal(rules.turnLimit, 18, 'dawn');
    assert(!exfilOpen(14, rules) && exfilOpen(15, rules), 'shut on 14, open on 15');
    equal(boatAt(12, rules, map), null, 'nothing to see on turn 12');
    const coming = boatAt(13, rules, map), nearer = boatAt(14, rules, map), there = boatAt(15, rules, map);
    assert(coming && !coming.here && nearer && !nearer.here, 'coming in on 13 and 14');
    const [eq, er] = map.boatRun.to;
    const off = (b) => Math.hypot(b.q - eq, b.r - er);
    assert(off(coming) > off(nearer) && off(nearer) > 0, 'nearer each turn');
    assert(there.here && off(there) === 0 && isExfil(map, { q: eq, r: er }), 'on the beach on 15');
    assert(boatAt(18, rules, map).here, 'and still there at dawn');
    // The turn report says so as it happens.
    const at = (turn) => ({ ...createInitialState(roster, traits, rules, map, 1), turn });
    equal(boatEvents(at(12), at(13), rules, map)[0]?.what, 'sighted', 'sighted as turn 13 begins');
    equal(boatEvents(at(14), at(15), rules, map)[0]?.what, 'in', 'in as turn 15 begins');
    equal(boatEvents(at(13), at(14), rules, map).length, 0, 'nothing said in between');
  }],

  ['the first turn card says where the charges are; with the job done and the beach shut it says when the boat comes', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const landed = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 4), map, 'north'), map, rules);
    assert(hintsFor(landed, rules, {}, 9).some((h) => /6 charges are still in 3 canisters/.test(h)), 'the canisters, on turn 1');
    const done = { ...landed, turn: 12, objectives: landed.objectives.map((o) => (o.primary ? { ...o, destroyed: true } : o)) };
    assert(hintsFor(done, rules, {}, 9).some((h) => /boat is in on turn 15, in 3 turns/.test(h)), 'the boat, once the aqueduct is down');
    // A whole turn can be played out with both rules on.
    equal(endTurn(landed, rules, map).turn, 2, 'turn 1 ends');
  }],
];
