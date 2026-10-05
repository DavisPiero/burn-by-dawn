// Mission 3, the aqueduct (SPEC.md §14, MISSION-AQUEDUCT.md, M41): its map and
// data as a draft, with the two rules M40 gave the engine switched on. Runs
// against the real data files.

import { boatAt, boatEvents } from '../src/boat.js';
import { runEnemyPhase } from '../src/enemy.js';
import { applyDifficulty, levelById, validateDifficulty } from '../src/difficulty.js';
import { hexDistance } from '../src/hex.js';
import { hexKey, isInPlay, isPassable, loadJson, loadMap, reachableWithin, terrainAt, terrainIdAt } from '../src/map.js';
import { missionById, missionEnemyTypes, missionFromQuery, missionLevels, missionRoster, missionRules, validateMissions, winTargets } from '../src/missions.js';
import { applyPayoff, boatLands, checkSignalBoat, effectiveMap, exfilOpen, isExfil, kindOf, lastTurn, offeredPencil, pencilWithTheOthers } from '../src/sabotage.js';
import { chooseDropRun, createInitialState, endTurn, isDawn, jump, knifeEnemy, placeCharge, signalBoat } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { chargeCapacity, chargeRoom } from '../src/units.js';
import { hintsFor } from '../src/hints.js';
import { CUE_NAMES } from '../src/render/sound.js';
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
  ['the aqueduct is playable (M41d, the operator\'s): picked on the contents page with its panel, or by ?mission=aqueduct', async () => {
    const { json, mission } = await loadAqueduct();
    equal(mission.status, 'playable', 'announced');
    equal(mission.panel, 'assets/title/contents-aqueduct.jpg', 'its painting beside its line');
    equal(missionFromQuery('?mission=aqueduct', json), 'aqueduct', 'the address opens it');
    equal(json.default, 'france', 'France still opens by default');
  }],

  ['one primary that takes four charges of eight points (three on Easy, five on Hard), six charges in three canisters, nobody carrying one', async () => {
    for (const [level, charges, squads] of [['easy', 3, 0], ['normal', 4, 1], ['hard', 5, 2]]) {
      const { map, rules, traits, roster } = await loadAqueduct(level);
      const state = createInitialState(roster, traits, rules, map, 1);
      const { targets } = winTargets(state, rules);
      equal(targets.map((o) => o.id).join(), 'aqueduct', `${level}: the win is the aqueduct`);
      equal(kindOf(targets[0], rules).chargesNeeded, charges, `${level}: charges it takes`);
      equal(kindOf(targets[0], rules).reinforcements, squads, `${level}: squads it calls`);
      equal(targets[0].chargeHexes.length, 8, `${level}: eight charge points`);
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
    const open = effectiveMap(map, createInitialState(roster, traits, rules, map, 1).objectives, rules, { turn: rules.exfil.opensTurn });
    for (const run of map.dropRuns) {
      const s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 5), map, run.id), map, rules);
      const reach = reachableWithin(open, s.units[0], 999, null);
      for (const o of s.objectives) assert(o.chargeHexes.every((h) => reach.has(hexKey(h.q, h.r))), `${run.id}: the ${o.label}'s points`);
      assert(map.exfil.every(([q, r]) => reach.has(hexKey(q, r))), `${run.id}: the beach`);
    }
  }],

  ['the beach is shut until turn 15, the boat is seen coming for two turns before and stays three: the night ends with turn 17', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const start = createInitialState(roster, traits, rules, map, 1);
    const at = (turn, extra = {}) => ({ ...start, turn, ...extra });
    equal(`${rules.exfil.opensTurn} ${rules.exfil.openFor} ${rules.turnLimit}`, '15 3 17', 'in on 15, three turns, dawn at 17');
    assert(!exfilOpen(at(14), rules) && exfilOpen(at(15), rules), 'shut on 14, open on 15');
    equal(lastTurn(at(3), rules), 17, 'unsignalled, the last turn is 17');
    equal(boatAt(at(12), rules, map), null, 'nothing to see on turn 12');
    const coming = boatAt(at(13), rules, map), nearer = boatAt(at(14), rules, map), there = boatAt(at(15), rules, map);
    assert(coming && !coming.here && nearer && !nearer.here, 'coming in on 13 and 14');
    const [eq, er] = map.boatRun.to;
    const off = (b) => Math.hypot(b.q - eq, b.r - er);
    assert(off(coming) > off(nearer) && off(nearer) > 0, 'nearer each turn');
    assert(there.here && off(there) === 0 && isExfil(map, { q: eq, r: er }), 'on the beach on 15');
    equal(boatEvents(at(12), at(13), rules, map)[0]?.what, 'sighted', 'sighted as turn 13 begins');
    equal(boatEvents(at(14), at(15), rules, map)[0]?.what, 'in', 'in as turn 15 begins');
    equal(boatEvents(at(13), at(14), rules, map).length, 0, 'nothing said in between');
    // Nothing but sea lies between the boat's line and the beach it lands on.
    assert(map.exfil.every(([q, r]) => terrainIdAt(map, q, r) === 'shingle'), 'the exfil is beach');
    assert(map.exfil.some(([q, r]) => terrainIdAt(map, q + 1, r) === 'sea'), 'with the sea beside it');
  }],

  ['a man beside the water can signal the boat in early: it lands two turns on, stays three, and the night ends with it', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const landed = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 4), map, 'north'), map, rules);
    const man = landed.units[0];
    const [eq, er] = map.exfil[0];
    const beside = { q: eq, r: er - 1 };
    const place = (state, hex) => ({ ...state, units: state.units.map((u) => (u.id === man.id ? { ...u, ...hex, ap: u.apMax } : u)) });
    const inland = { ...landed, turn: 6 };
    equal(checkSignalBoat(inland, inland.units[0], rules, map).reason, 'he must be beside the water at the exfil', 'not from up the valley');
    const onBeach = place(inland, beside);
    const check = checkSignalBoat(onBeach, onBeach.units[0], rules, map);
    assert(check.ok, 'from beside the exfil he can');
    equal(`${check.lands} ${check.leaves}`, '8 10', 'signalled on 6: in on 8, gone with turn 10');
    const called = signalBoat(onBeach, man.id, rules, map);
    equal(called.boatCalledTurn, 6, 'the signal is kept');
    equal(called.units[0].ap, onBeach.units[0].ap - rules.exfil.call.apCost, 'it costs him its AP');
    equal(`${boatLands(called, rules)} ${lastTurn(called, rules)}`, '8 10', 'the boat and the night follow it');
    assert(!exfilOpen({ ...called, turn: 7 }, rules) && exfilOpen({ ...called, turn: 8 }, rules), 'shut on 7, open on 8');
    assert(!isDawn({ ...called, turn: 9 }, rules) && isDawn({ ...called, turn: 10 }, rules), 'turn 10 is the last');
    assert(boatAt(called, rules, map) && !boatAt(called, rules, map).here, 'the boat is on the board at once, coming');
    equal(checkSignalBoat(called, called.units[0], rules, map).ok, false, 'not twice');
    equal(boatEvents(called, { ...called, turn: 7 }, rules, map)[0]?.what, 'called', 'the turn report says it has the signal');
    // Too late to bring it forward: it is coming anyway.
    const late = place({ ...landed, turn: 13 }, beside);
    equal(checkSignalBoat(late, late.units[0], rules, map).ok, false, 'no signal once it is already on its way');
    // France has no boat to call.
    const france = await loadJson('data/rules.json');
    equal(checkSignalBoat(landed, man, france, map).reason, 'no boat to signal', 'nothing to signal where the exfil is open all night');
  }],

  ['each post sweeps: one way, then the other, turn and turn about, and back', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const start = { ...createInitialState(roster, traits, rules, map, 1), phase: 'play' };
    const parked = { ...start, units: start.units.map((u, i) => ({ ...u, q: 200 + i, r: 0, landed: true })) };
    const facingOf = (state, id) => state.enemies.find((e) => e.id === id).facing;
    for (const id of ['post-aqueduct', 'post-bridge', 'post-coast']) {
      const post = parked.enemies.find((e) => e.id === id);
      assert(post.sweep && post.sweep[0] !== post.sweep[1], `${id} has two facings`);
      equal(post.facing, post.sweep[0], `${id}: its first on turn 1`);
      const two = runEnemyPhase(parked, map, rules).state;
      equal(facingOf(two, id), post.sweep[1], `${id}: its other on turn 2`);
      const three = runEnemyPhase({ ...two, turn: 2 }, map, rules).state;
      equal(facingOf(three, id), post.sweep[0], `${id}: back again on turn 3`);
    }
  }],

  ['the reserve can be killed here, and one more squad comes for it: once', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    equal(map.enemyTypes.reserve.killable, true, 'killable on this map');
    equal(rules.reserve.replacements, 1, 'one replacement');
    const start = { ...createInitialState(roster, traits, rules, map, 1), phase: 'play' };
    const alarmed = { ...start, units: start.units.map((u, i) => ({ ...u, q: 200 + i, r: 0, landed: true })), alert: { ...start.alert, points: rules.alert.states.at(-1).from } };
    const out = runEnemyPhase(alarmed, map, rules).state;
    const first = out.enemies.find((e) => e.isReserve);
    assert(first && out.reserveDeployed, 'the reserve comes at Alarmed');
    // A man beside it, behind it, knifes it.
    const knifer = out.units[0];
    const behind = { ...out, units: out.units.map((u) => (u.id === knifer.id ? { ...u, q: first.q, r: first.r - 1, ap: 3, apMax: 3 } : u)), enemies: out.enemies.map((e) => (e.isReserve ? { ...e, facing: 3 } : e)) };
    const killed = knifeEnemy(behind, knifer.id, first.id, rules);
    assert(!killed.enemies.some((e) => e.isReserve), 'it is dead');
    equal(`${killed.reserveDeployed} ${killed.reserveReplaced}`, 'false 1', 'and the garrison may send another');
    const again = runEnemyPhase({ ...killed, units: alarmed.units }, map, rules).state;
    const second = again.enemies.find((e) => e.isReserve);
    assert(second, 'another comes down the road');
    const twice = knifeEnemy({ ...again, units: again.units.map((u) => (u.id === knifer.id ? { ...u, q: second.q, r: second.r - 1, ap: 3, apMax: 3 } : u)), enemies: again.enemies.map((e) => (e.isReserve ? { ...e, facing: 3 } : e)) }, knifer.id, second.id, rules);
    equal(twice.reserveDeployed, true, 'that one is the last');
    // France's reserve is as it was.
    equal((await loadMap()).enemyTypes.reserve.killable, false, 'France: cannot be killed');
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

  ['the tin offers the longest timer first, and then the one that goes off with the charges already set (M42): one bang', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const start = { ...createInitialState(roster, traits, rules, map, 1), phase: 'play', turn: 5 };
    const aqueduct = start.objectives.find((o) => o.primary);
    const [a, b, c] = aqueduct.chargeHexes;
    // Three men who are no Steady Hands, each on a pier foot with two charges (enough between
    // them for the job, or the mission would end as lost); the rest far off.
    const setters = start.units.filter((u) => !u.traits.some((t) => t.hook === 'onPlaceCharge' && t.modifier?.stat === 'fuse')).slice(0, 3);
    const at = new Map(setters.map((u, i) => [u.id, [a, b, c][i]]));
    const placed = (state) => ({ ...state, units: state.units.map((u, i) => (at.has(u.id) ? { ...u, ...at.get(u.id), landed: true, charges: 2, ap: 3, apMax: 3 } : { ...u, q: 14 + (i % 2), r: 5, landed: true })) });
    let state = placed(start);
    const first = state.units.find((u) => u.id === setters[0].id);
    equal(pencilWithTheOthers(state, first, rules), null, 'nothing burning yet: no pencil goes with the others');
    equal(offeredPencil(state, map, first, rules).fuse, 6, 'the first is offered the longest, the aqueduct\'s default');
    state = placeCharge(state, first.id, rules, offeredPencil(state, map, first, rules).fuse);
    // Two turns on, the second man's offer goes off with the first charge.
    state = { ...endTurn(endTurn(state, rules, map), rules, map) };
    state = { ...state, units: state.units.map((u) => (at.has(u.id) ? { ...u, ap: 3 } : u)) };
    const second = state.units.find((u) => u.id === setters[1].id);
    const burning = state.charges[0];
    equal(state.turn + burning.fuse - 1, 10, 'the first charge goes at the end of turn 10');
    equal(offeredPencil(state, map, second, rules).blows, 10, 'the second man is offered the pencil for turn 10');
    equal(pencilWithTheOthers(state, second, rules).fuse, burning.fuse, 'as long as the first has left to burn');
    // France has one fuse and no choice.
    const france = missionRules(missionById(validateMissions(await loadJson('data/missions.json')), null), await loadJson('data/rules.json'));
    equal(pencilWithTheOthers(state, second, france), null, 'where there is no choice of timer there is none to offer');
  }],

  ['M42\'s map: four pier feet a side, two either side of the torrent; a mule track up the west bank; on Hard the boat stays two turns', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    const aqueduct = createInitialState(roster, traits, rules, map, 1).objectives.find((o) => o.primary);
    const north = aqueduct.chargeHexes.filter((h) => h.r === 2);
    const south = aqueduct.chargeHexes.filter((h) => h.r === 4);
    equal(`${north.length} ${south.length}`, '4 4', 'four on each side');
    const torrent = 5; // the arch the torrent runs under is at q 5 on the aqueduct's row
    equal(`${north.filter((h) => h.q < torrent).length} ${south.filter((h) => h.q + 1 < torrent).length}`, '2 2', 'two west of the torrent on each side');
    for (const h of aqueduct.chargeHexes) equal(terrainIdAt(map, h.q, h.r), 'arch', `(${h.q},${h.r}) is a pier foot`);
    // The mule track: a way up the west bank at a track's pace, from the road to the piers.
    for (const r of [5, 6, 7, 8, 9]) equal(terrainIdAt(map, 3, r), 'track', `(3,${r}) is the mule track`);
    equal(rules.charges.fuseTurns, 6, 'the default timer is the longest');
    equal(`${rules.exfil.opensTurn} ${rules.exfil.openFor}`, '15 3', 'Normal: in on 15 for three turns');
    const hard = (await loadAqueduct('hard')).rules;
    equal(`${hard.exfil.opensTurn} ${hard.exfil.openFor}`, '15 2', 'Hard: in on 15 for two');
    equal(lastTurn({ turn: 1 }, hard), 16, 'so Hard\'s night ends with turn 16');
  }],

  ['an enemy found dead calls up a squad to stand where he fell (M42b, M42c), up to the limit and while the road bridge stands; in France a body calls nobody', async () => {
    const { map, rules, traits, roster } = await loadAqueduct();
    equal(`${rules.bodyFound.reinforcements} ${rules.bodyFound.limit}`, '1 4', 'one squad a body, four in a night');
    const start = { ...createInitialState(roster, traits, rules, map, 1), phase: 'play', turn: 3 };
    const away = start.units.map((u, i) => ({ ...u, q: 14 + (i % 2), r: 6 + (i % 3), landed: true }));
    const patrol = start.enemies.find((e) => e.route);
    const dead = (state, n) => ({ ...state, units: away, bodies: Array.from({ length: n }, (_, i) => ({ enemyId: `gone-${i}`, name: 'Sentry', q: patrol.q, r: patrol.r, found: false, facing: 5 })) });
    const found = runEnemyPhase(dead(start, 1), map, rules);
    assert(found.events.some((e) => e.kind === 'bodyFound'), 'the patrol finds it');
    assert(found.events.some((e) => e.kind === 'reinforcementsCalled' && e.body && e.count === 1), 'and a squad is called for it');
    equal(found.state.bodySquadsDue.length, 1, 'due next turn');
    equal(found.state.reinforcementsDue, 0, 'not one of the bang\'s squads: the beach posts are theirs');
    const on = runEnemyPhase({ ...found.state, turn: 4 }, map, rules);
    assert(on.events.some((e) => e.kind === 'reinforcements' && e.toBody), 'it comes on down the road in the next enemy phase');
    const squad = on.state.enemies.find((e) => /body/.test(e.id));
    equal(`${squad.guard.q},${squad.guard.r} ${squad.homeFacing}`, `${patrol.q},${patrol.r} 5`, 'making for where the body lay, to look the way the dead man looked');
    equal(`${on.state.bodySquadsDue.length} ${on.state.bodySquadsSent}`, '0 1', 'and it is counted');
    // No more squads than the limit, in a night.
    const many = runEnemyPhase(dead(start, 6), map, rules);
    equal(many.state.bodySquadsDue.length, 4, 'six bodies, four squads');
    const spent = runEnemyPhase({ ...dead(start, 1), bodySquadsSent: 4 }, map, rules);
    equal(spent.state.bodySquadsDue.length, 0, 'four already sent: no more');
    // One of ours found dead calls nobody, and nor does anything once the road is cut.
    const ours = runEnemyPhase({ ...dead(start, 0), bodies: [{ unitId: 'x', name: 'DUTCH', q: patrol.q, r: patrol.r, found: false }] }, map, rules);
    equal(ours.state.bodySquadsDue.length, 0, 'a man of ours found: no squad');
    const cut = runEnemyPhase({ ...dead(start, 1), reserveCancelled: true }, map, rules);
    equal(cut.state.bodySquadsDue.length, 0, 'the road bridge down: no squad');
    const france = missionRules(missionById(validateMissions(await loadJson('data/missions.json')), null), await loadJson('data/rules.json'));
    equal(france.bodyFound.reinforcements, 0, 'France: none');
  }],

  ['the drawn roads (M42b) are art: no hex under them is a track, and the farm is off the aqueduct\'s east end', async () => {
    const { map } = await loadAqueduct();
    assert(map.roadArt.length === 3, 'three drawn roads');
    equal(map.roadArt[1].nudge[1], -0.2, 'the two beside the aqueduct lifted to its channel');
    for (const [q, r] of [[1, 3], [0, 3], [-1, 3], [8, 3], [9, 2], [10, 1], [11, 0]]) assert(terrainIdAt(map, q, r) !== 'track', `(${q},${r}) is not a track`);
    equal(terrainIdAt(map, 8, 3), 'hillside', 'the hex the way leaves the aqueduct by is open hillside');
    equal(terrainIdAt(map, 8, 4), 'farmhouse', 'the farmhouse that stood on it is down and to the right');
  }],

  ['its words, sounds and pictures (M43): Italian cries, lines that named France replaced, its own folders for chips and portraits, its own title card', async () => {
    const { json, mission, roster } = await loadAqueduct();
    const said = roster.troopers.flatMap((t) => Object.values(t.dialogue)).join(' ');
    for (const word of ['church', 'France', 'bridge', 'cabbages', 'spare']) assert(!said.includes(word), `nobody says "${word}" in Italy`);
    assert(mission.words.cries.spotted.includes('ALLARME!'), 'the garrison cries out in Italian');
    equal(mission.enemyChips, 'assets/enemies/italian', 'its garrison\'s chips have a folder of their own');
    equal(mission.portraits, 'assets/portraits/winter', 'and the six in winter kit');
    equal(mission.titleCard, 'assets/title/title-card-aqueduct.jpg', 'its own title card (France\'s until painted)');
    for (const cue of ['canister', 'boatComing', 'boatIn', mission.endSounds.success, mission.endSounds.otherwise]) assert(CUE_NAMES.includes(cue), `the cue ${cue} is scored`);
    const broken = { ...json, missions: json.missions.map((m) => (m.id === 'aqueduct' ? { ...m, enemyChips: '' } : m)) };
    let threw = false;
    try { validateMissions(broken); } catch { threw = true; }
    assert(threw, 'a chip folder with no name is refused');
  }],
];
