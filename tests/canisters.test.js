// M40: the aqueduct's two engine rules (SPEC.md §9 Supply canisters, §10 The
// way out on a timetable), off in both playable missions. Tried here on
// France's map with the rules patched, since no playable mission has them yet.

import { canisterPoints, jumpPoints, landCanisters } from '../src/drop.js';
import { runEnemyPhase } from '../src/enemy.js';
import { hexDistance } from '../src/hex.js';
import { forEachCell, hexKey, isInPlay, isPassable, loadJson, loadMap, terrainAt } from '../src/map.js';
import { effectiveMap, exfilOpen, isExfil } from '../src/sabotage.js';
import { chooseDropRun, createInitialState, jump, pickUpCharge } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { chargeCapacity, overloadApLoss, planMove, unitById } from '../src/units.js';
import { landedState } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const CANISTERS = { count: 3, charges: 2, scatterWeights: [0, 4, 4, 2, 1] };
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);

async function loadAll() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(), loadJson('data/rules.json'), loadJson('data/traits.json'), loadJson('data/roster.json'),
  ]);
  return { map, rules, withCanisters: { ...rules, canisters: CANISTERS }, traits: validateTraits(traitsJson), roster };
}

function dropOn({ map, traits, roster }, rules, runId, seed) {
  return jump(chooseDropRun(createInitialState(roster, traits, rules, map, seed), map, runId), map, rules);
}

export default [
  ['both rules are off in the files: no canisters, the men jump with their loadout, the exfil open all night', async () => {
    const env = await loadAll();
    equal(env.rules.canisters, null, 'canisters');
    equal(env.rules.exfil.opensTurn, null, 'exfil.opensTurn');
    const s = dropOn(env, env.rules, env.map.dropRuns[0].id, 3);
    equal(s.canisters.length, 0, 'none on the board');
    for (const u of s.units) if (u.hits === 0) equal(u.charges, chargeCapacity(u, env.rules), `${u.id} jumps with his loadout`);
    assert(exfilOpen({ turn: 1 }, env.rules), 'open on turn 1');
    equal(effectiveMap(env.map, s.objectives, env.rules, { turn: 1 }), effectiveMap(env.map, s.objectives, env.rules), 'the same map with or without the turn');
  }],

  ['canisters leave the aircraft spread through the stick: after the second, fourth and sixth man of six', async () => {
    const env = await loadAll();
    const run = env.map.dropRuns[0];
    const men = jumpPoints(run, 6);
    const at = (p) => `${p.q},${p.r}`;
    equal(canisterPoints(run, 6, 3).map(at).join(' '), [men[1], men[3], men[5]].map(at).join(' '), 'three among six');
    equal(canisterPoints(run, 6, 1).map(at).join(' '), at(men[5]), 'one goes last');
  }],

  ['with canisters the men jump empty-handed, land exactly as they would without, and every charge is in a canister', async () => {
    const env = await loadAll();
    for (const run of env.map.dropRuns) {
      for (const seed of SEEDS) {
        const plain = dropOn(env, env.rules, run.id, seed);
        const s = dropOn(env, env.withCanisters, run.id, seed);
        const at = (st) => st.units.map((u) => `${u.q},${u.r}`).join(' ');
        equal(at(s), at(plain), `${run.id} seed ${seed}: the men's landings`);
        assert(s.units.every((u) => u.charges === 0), 'nobody jumps with a charge');
        equal(s.canisters.length, CANISTERS.count, 'canisters down');
        equal(s.droppedCharges.length, CANISTERS.count * CANISTERS.charges, 'charges on the ground');
        const seen = new Set(s.units.map((u) => hexKey(u.q, u.r)));
        for (const c of s.canisters) {
          const key = hexKey(c.q, c.r);
          assert(!seen.has(key), `${run.id} seed ${seed}: a canister on a man or another canister`);
          seen.add(key);
          assert(isInPlay(env.map, c.q, c.r) && isPassable(terrainAt(env.map, c.q, c.r)), 'on ground a man can stand on');
          assert(!isExfil(env.map, c), 'not on the exfil');
          assert(s.enemies.every((e) => hexDistance(e, c) > env.rules.landing.enemyClearance), 'clear of the garrison');
          equal(s.droppedCharges.filter((d) => d.q === c.q && d.r === c.r).length, CANISTERS.charges, 'its charges lie on its hex');
          equal(c.found, false, 'not found yet');
        }
        equal(s.report.filter((e) => e.kind === 'canisterLanded').length, CANISTERS.count, 'reported');
      }
    }
    const a = dropOn(env, env.withCanisters, env.map.dropRuns[0].id, 42);
    const b = dropOn(env, env.withCanisters, env.map.dropRuns[0].id, 42);
    equal(JSON.stringify(a.canisters), JSON.stringify(b.canisters), 'a seed lands the canisters the same way');
  }],

  ['a canister is picked from with the ordinary Pick up, and is gone when the last charge is taken; a charge past his loadout slows him', async () => {
    const env = await loadAll();
    const { map, withCanisters: rules, traits, roster } = env;
    const s0 = landedState(roster, traits, rules, map);
    const sapper = s0.units.find((u) => u.role === 'sapper');
    const scout = s0.units.find((u) => u.role === 'scout');
    equal(sapper.charges, 0, 'the sapper landed with none');
    const here = { q: sapper.q, r: sapper.r };
    let s = landCanisters(s0, [{ id: 'canister-1', q: here.q, r: here.r }], rules).state;
    s = pickUpCharge(s, sapper.id, rules);
    equal(unitById(s.units, sapper.id).charges, 1, 'he has one');
    equal(overloadApLoss(unitById(s.units, sapper.id), rules), 0, 'within his loadout: no weight');
    equal(s.canisters.length, 1, 'one charge left: the canister stays');
    // The scout comes for the other.
    s = { ...s, units: s.units.map((u) => (u.id === scout.id ? { ...u, q: here.q, r: here.r } : u.id === sapper.id ? { ...u, q: 300, r: 300 } : u)) };
    s = pickUpCharge(s, scout.id, rules);
    equal(unitById(s.units, scout.id).charges, 1, 'the scout has the other');
    equal(overloadApLoss(unitById(s.units, scout.id), rules), rules.charges.overloadApLoss, 'more than he would have jumped with: its weight');
    equal(s.canisters.length, 0, 'emptied: gone');
    equal(s.droppedCharges.length, 0, 'nothing left lying');
  }],

  ['a canister is found like a parachute, once, and keeps its charges; an emptied one is not there to find', async () => {
    const env = await loadAll();
    const { map, withCanisters: rules, traits, roster } = env;
    const s = landedState(roster, traits, rules, map);
    let row = null;
    forEachCell(map, (q, r) => {
      if (row) return;
      if ([0, 1, 2, 3].every((i) => isInPlay(map, q + i, r) && terrainAt(map, q + i, r).moveCost === 1)) row = { q, r };
    });
    const parked = s.units.map((u, i) => ({ ...u, q: 200 + i, r: 0 }));
    const sentry = (q) => ({
      id: 'test', label: 'Test post', type: 'sentry', typeLabel: 'Sentry',
      visionRadius: 3, arcDegrees: 120, detection: 3, speed: 0,
      q, r: row.r, facing: 2, homeFacing: 2, turned: false,
      route: null, loop: false, waypoint: 0, routeStep: 1,
      investigating: null, holding: null, watching: null, suppressed: false,
    });
    const base = { ...s, units: parked, parachutes: [], noises: [], contact: null, alert: { ...s.alert, points: 0 } };
    const down = landCanisters(base, [{ id: 'canister-1', q: row.q + 2, r: row.r }], rules).state;

    const far = runEnemyPhase({ ...down, enemies: [sentry(row.q)] }, map, rules);
    equal(far.state.canisters[0].found, false, 'two hexes off: not found');
    equal(far.state.alert.points, 0, 'no alert');

    const beside = runEnemyPhase({ ...down, enemies: [sentry(row.q + 1)] }, map, rules);
    equal(beside.state.canisters[0].found, true, 'beside it: found');
    equal(beside.state.alert.points, rules.alert.parachuteFound, 'alert, as for a parachute');
    equal(beside.events.filter((e) => e.kind === 'canisterFound').length, 1, 'reported');
    equal(beside.state.droppedCharges.length, CANISTERS.charges, 'its charges stay');
    const again = runEnemyPhase({ ...beside.state, noises: [] }, map, rules);
    equal(again.state.alert.points, rules.alert.parachuteFound, 'found once');
    equal(again.events.filter((e) => e.kind === 'canisterFound').length, 0, 'not reported twice');
  }],

  ['an exfil with an opening turn cannot be entered before it, and is the way out from then on', async () => {
    const env = await loadAll();
    const { map, traits, roster } = env;
    const rules = { ...env.rules, exfil: { ...env.rules.exfil, opensTurn: 5 } };
    const s = landedState(roster, traits, rules, map);
    const [eq, er] = map.exfil[0];
    const man = s.units[0];
    const units = s.units.map((u, i) => (u.id === man.id ? { ...u, q: eq, r: er - 1 } : { ...u, q: 200 + i, r: 0 }));
    assert(!exfilOpen({ turn: 4 }, rules) && exfilOpen({ turn: 5 }, rules), 'shut on turn 4, open on turn 5');

    const shut = effectiveMap(map, s.objectives, rules, { turn: 4 });
    equal(planMove(shut, units, unitById(units, man.id), { q: eq, r: er }, rules, []), null, 'turn 4: no way onto it');
    assert(effectiveMap(map, s.objectives, rules, { turn: 3 }) === shut, 'still shut the turn before: the same map back');
    const open = effectiveMap(map, s.objectives, rules, { turn: 5 });
    const plan = planMove(open, units, unitById(units, man.id), { q: eq, r: er }, rules, []);
    assert(plan && plan.affordable, 'turn 5: he can step onto it');
  }],

  ['an opening turn after dawn, or canisters with nothing in them, are refused', async () => {
    const env = await loadAll();
    const { map, traits, roster } = env;
    const tryWith = (patch) => {
      try { createInitialState(roster, traits, { ...env.rules, ...patch }, map); return null; } catch (error) { return error.message; }
    };
    assert(/exfil\.opensTurn/.test(tryWith({ exfil: { ...env.rules.exfil, opensTurn: env.rules.turnLimit + 1 } }) ?? ''), 'an opening turn after dawn');
    assert(/canisters\.charges/.test(tryWith({ canisters: { ...CANISTERS, charges: 0 } }) ?? ''), 'empty canisters');
    assert(/canisters\.scatterWeights/.test(tryWith({ canisters: { count: 3, charges: 2 } }) ?? ''), 'no scatter');
    equal(tryWith({ canisters: CANISTERS, exfil: { ...env.rules.exfil, opensTurn: 5 } }), null, 'both on is fine');
  }],
];
