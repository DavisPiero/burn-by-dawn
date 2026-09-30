// Mission 2, the airfield (SPEC.md §13, M29): its map and data, played under
// the same rules as France. Runs against the real data files.

import { applyDifficulty, levelById, validateDifficulty } from '../src/difficulty.js';
import { jumpPoints } from '../src/drop.js';
import { hexDistance } from '../src/hex.js';
import { hexKey, isInPlay, isPassable, loadJson, loadMap, reachableWithin, terrainAt, terrainIdAt } from '../src/map.js';
import {
  missionById, missionEnemyTypes, missionFromQuery, missionLevels, missionRoster, missionRules, validateMissions, winTargets, winWords,
} from '../src/missions.js';
import { isExfil } from '../src/sabotage.js';
import { chooseDropRun, createInitialState, jump } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { boardPixelBounds, dropTimeline } from '../src/render/board.js';
import { DROP_SHOW, exfilArtId, objectiveArt, terrainArt } from '../src/render/theme.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadAirfield(levelId = 'normal') {
  const json = validateMissions(await loadJson('data/missions.json'));
  const mission = missionById(json, 'airfield');
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
  ['the airfield is a draft: stamped NEXT YEAR\'S ANNUAL on the contents page, but ?mission=airfield plays it', async () => {
    const { json, mission } = await loadAirfield();
    equal(mission.id, 'airfield', 'picked by id');
    equal(mission.status, 'draft', 'a draft, not yet announced');
    equal(missionFromQuery('?mission=airfield', json), 'airfield', 'the address opens it');
    equal(json.default, 'france', 'France still opens by default');
  }],

  ['any N of the eight aircraft is the job: 3 on Easy, 4 on Normal, 5 on Hard; five bombs in the stick', async () => {
    for (const [level, count] of [['easy', 3], ['normal', 4], ['hard', 5]]) {
      const { map, rules, traits, roster } = await loadAirfield(level);
      const state = createInitialState(roster, traits, rules, map, 1);
      const { targets, needed } = winTargets(state, rules);
      equal(targets.length, 8, `${level}: eight aircraft`);
      equal(needed, count, `${level}: how many`);
      assert(state.objectives.every((o) => !o.primary), `${level}: no primary`);
      equal(state.units.reduce((n, u) => n + u.charges, 0), 5, `${level}: five bombs`);
      // M29b, the operator's: spread one a man so the scouts have a job here.
      const byRole = (role) => state.units.filter((u) => u.role === role).map((u) => u.charges);
      equal(byRole('sapper').join(), '1,1', `${level}: a sapper carries one`);
      equal(byRole('scout').join(), '1,1', `${level}: a scout carries one`);
    }
    const { map, rules, traits, roster } = await loadAirfield();
    equal(winWords(createInitialState(roster, traits, rules, map, 1), rules), '4 of the 8 Aircraft', 'said in words');
  }],

  ['each aircraft stands on its own hex with one charge point in its pen beside it', async () => {
    const { map } = await loadAirfield();
    const aircraft = map.objectives.filter((o) => o.kind === 'aircraft');
    for (const o of aircraft) {
      equal(o.hexes.length, 1, `${o.id} is one hex`);
      equal(terrainIdAt(map, ...o.hexes[0]), 'aircraft', `${o.id} stands on an aircraft hex`);
      equal(o.chargeHexes.length, 1, `${o.id} has one charge point`);
      const [pen] = o.chargeHexes;
      equal(terrainIdAt(map, ...pen), 'pen', `${o.id}'s point is in a pen`);
      equal(hexDistance({ q: pen[0], r: pen[1] }, { q: o.hexes[0][0], r: o.hexes[0][1] }), 1, `${o.id}'s pen is beside it`);
    }
  }],

  ['the bowser\'s blast from its charge point takes in exactly two aircraft (for M30\'s rule that it sets them off)', async () => {
    const { map, rules } = await loadAirfield();
    const bowser = map.objectives.find((o) => o.kind === 'bowser');
    const reach = rules.objectives.bowser.blastRadius;
    for (const [q, r] of bowser.chargeHexes) {
      const caught = map.objectives.filter((o) => o.kind === 'aircraft' && o.hexes.some(([aq, ar]) => hexDistance({ q, r }, { q: aq, r: ar }) <= reach));
      equal(caught.length, 2, `from (${q}, ${r})`);
    }
  }],

  ['every charge point and the exfil can be walked to from every drop run', async () => {
    const { map } = await loadAirfield();
    for (const run of map.dropRuns) {
      const start = jumpPoints(run, 6).find((h) => isInPlay(map, h.q, h.r) && isPassable(terrainAt(map, h.q, h.r)));
      assert(start, `${run.id}: a jump point on usable ground`);
      const reach = reachableWithin(map, start, 999, null);
      const at = (q, r) => reach.has(hexKey(q, r));
      for (const o of map.objectives) {
        assert(o.chargeHexes.some(([q, r]) => at(q, r)), `${run.id}: ${o.id} can be reached`);
      }
      assert(map.exfil.every(([q, r]) => at(q, r)), `${run.id}: the exfil can be reached`);
    }
  }],

  ['every run lands the whole stick on usable ground, off the exfil, clear of the garrison', async () => {
    const { map, rules, traits, roster } = await loadAirfield();
    for (const run of map.dropRuns) {
      for (const seed of SEEDS) {
        const s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, seed), map, run.id), map, rules);
        const landed = s.report.filter((e) => e.kind === 'landed');
        equal(landed.length, 6, `${run.id} seed ${seed}: six men down`);
        for (const e of landed) {
          assert(isInPlay(map, e.q, e.r) && isPassable(terrainAt(map, e.q, e.r)), `${run.id} seed ${seed}: ${e.unitName} on usable ground`);
          assert(!isExfil(map, e), `${run.id} seed ${seed}: on the exfil`);
          assert(s.enemies.every((en) => hexDistance(en, e) > rules.landing.enemyClearance), `${run.id} seed ${seed}: ${e.unitName} beside an enemy`);
        }
      }
    }
  }],

  ['the perimeter car is fast and cannot be killed; it drives the track round inside the wire', async () => {
    const { map, rules, traits, roster } = await loadAirfield();
    const car = createInitialState(roster, traits, rules, map, 1).enemies.find((e) => e.type === 'vehicle');
    assert(car, 'there is one');
    equal(car.speed, 6, 'speed');
    equal(car.killable, false, 'not killable');
    for (const [q, r] of map.enemies.find((e) => e.id === car.id).route) equal(terrainIdAt(map, q, r) === 'track' || terrainIdAt(map, q, r) === 'wadi', true, `waypoint (${q}, ${r}) on the track`);
    const hard = await loadAirfield('hard');
    equal(hard.map.enemyTypes.vehicle.visionRadius, 4, 'Hard: the car sees further too');
  }],

  ['the desert has art for every terrain, target and the trucks, and no water for a swim', async () => {
    const { map, rules } = await loadAirfield();
    for (const id of new Set(Object.values(map.legend))) assert(terrainArt(id).base !== null, `${id} has art`);
    for (const o of map.objectives) {
      for (const state of [{}, { destroyed: true }, { destroyed: true, cut: true }]) {
        assert(objectiveArt({ ...o, ...state }), `${o.id} ${JSON.stringify(state)} has art`);
      }
    }
    equal(exfilArtId(map.exfilArt), 'objective-trucks', 'the trucks at the rendezvous');
    assert(!Object.values(map.legend).includes(rules.actions.swim.across), 'no canal, so no swim is offered');
  }],

  ['the drop aircraft flies in from off the board and out past it on every run', async () => {
    const { map } = await loadAirfield();
    const b = boardPixelBounds(map);
    const clear = DROP_SHOW.aircraftSize / 2;
    const off = (p) => p.x <= b.minX - clear + 0.5 || p.x >= b.maxX + clear - 0.5 || p.y <= b.minY - clear + 0.5 || p.y >= b.maxY + clear - 0.5;
    for (const run of map.dropRuns) {
      const t = dropTimeline(map, { from: { q: run.from[0], r: run.from[1] }, to: { q: run.to[0], r: run.to[1] }, jumps: [] });
      assert(off(t.start) && off(t.end), `${run.id} flies off the board`);
    }
  }],
];
