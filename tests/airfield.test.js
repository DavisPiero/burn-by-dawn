// Mission 2, the airfield (SPEC.md §13, M29): its map and data, played under
// the same rules as France. Runs against the real data files.

import { applyDifficulty, levelById, validateDifficulty } from '../src/difficulty.js';
import { jumpPoints } from '../src/drop.js';
import { hexDistance } from '../src/hex.js';
import { hexKey, isInPlay, isPassable, loadJson, loadMap, reachableWithin, terrainAt, terrainIdAt } from '../src/map.js';
import {
  missionById, missionEnemyTypes, missionFromQuery, missionLevels, missionRoster, missionRules, ratingOf, validateMissions, winTargets, winWords,
} from '../src/missions.js';
import { blastEffect, blastHexesThisTurn, blastsOfCharge, caughtBy, checkPlaceCharge, defaultPencil, isExfil, laterBlasts, offeredPencil, pencils, runFusePhase } from '../src/sabotage.js';
import { chooseDropRun, createInitialState, endTurn, jump, placeCharge } from '../src/state.js';
import { cleanRun, scoreOf } from '../src/scoring.js';
import { validateTraits } from '../src/traits.js';
import { diversionPrompt, hintsFor } from '../src/hints.js';
import { boardEdges, boardPixelBounds, diversionTimeline, dropTimeline, pickDiversionLine } from '../src/render/board.js';
import { DRIVE_BY, DRIVE_BY_ART, DROP_SHOW, exfilArtId, objectiveArt, terrainArt } from '../src/render/theme.js';

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

// The stick on the airfield with only the men named on the board, at the
// hexes given, and no garrison unless given: the rest parked off it, alive.
async function onAirfield(placements, level = 'normal') {
  const { map, rules, traits, roster } = await loadAirfield(level);
  const start = { ...createInitialState(roster, traits, rules, map, 1), phase: 'play', turn: 1 };
  const units = start.units.map((u, i) => {
    const at = placements[u.id];
    // Pools are filled at landing, which this skips: a full one each.
    const pool = rules.roles[u.role].actionPoints;
    return at ? { ...u, q: at[0], r: at[1], trail: [], landed: true, ap: pool, apMax: pool } : { ...u, q: 200 + i, r: 0, trail: [], landed: true };
  });
  return { map, rules, state: { ...start, units, enemies: [] } };
}
const objectiveIn = (state, id) => state.objectives.find((o) => o.id === id);

const SEEDS = Array.from({ length: 30 }, (_, i) => i * 7919 + 3);

export default [
  ['the airfield is playable (M31b, the operator\'s): picked on the contents page, or by ?mission=airfield', async () => {
    const { json, mission } = await loadAirfield();
    equal(mission.id, 'airfield', 'picked by id');
    equal(mission.status, 'playable', 'announced');
    equal(missionFromQuery('?mission=airfield', json), 'airfield', 'the address opens it');
    equal(json.default, 'france', 'France still opens by default');
  }],

  ['any N of the eight aircraft is the job: 3 on Easy, 5 on Normal, 6 on Hard (M30); five bombs in the stick', async () => {
    for (const [level, count] of [['easy', 3], ['normal', 5], ['hard', 6]]) {
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
    equal(winWords(createInitialState(roster, traits, rules, map, 1), rules), '5 of the 8 Aircraft', 'said in words');
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
    // M30: Hard's car sees no further than Normal's (the North run, which it drives past, fell to 19%).
    const hard = await loadAirfield('hard');
    equal(hard.map.enemyTypes.vehicle.visionRadius, car.visionRadius, 'Hard: the car sees as far as on Normal');
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

  ['time pencils (M30): 2 to 6 turns, the default 4 first (M30b); Steady Hands a turn off each; after dawn struck out', async () => {
    const { rules, state } = await onAirfield({});
    const sapper = state.units.find((u) => u.role === 'sapper' && !u.traits.some((t) => t.id === 'steady-hands'));
    const dutch = state.units.find((u) => u.traits.some((t) => t.id === 'steady-hands'));
    equal(pencils(state, sapper, rules).map((p) => p.fuse).join(), '2,3,4,5,6', 'a sapper\'s pencils');
    equal(pencils(state, dutch, rules).map((p) => p.fuse).join(), '1,2,3,4,5', 'Dutch\'s, a turn shorter');
    equal(defaultPencil(state, sapper, rules).fuse, 4, 'the default is the airfield\'s fuseTurns');
    equal(defaultPencil(state, dutch, rules).fuse, 3, 'his default, hooked');
    const late = { ...state, turn: 17 };
    equal(pencils(late, sapper, rules).map((p) => `${p.fuse}${p.afterDawn ? 'x' : ''}`).join(), '2,3,4,5x,6x', 'turn 17: 5 would blow on turn 21');
    equal(pencils(late, sapper, rules)[1].blows, 19, 'a 3-turn pencil set on 17 blows at the end of 19');
    equal(defaultPencil({ ...state, turn: 19 }, sapper, rules).fuse, 2, 'turn 19: the default is struck out, so the longest still in time');
    equal(defaultPencil({ ...state, turn: 20 }, sapper, rules), null, 'turn 20: every pencil is after dawn for him');
    equal(defaultPencil({ ...state, turn: 20 }, dutch, rules).fuse, 1, 'but not for Dutch');
  }],

  ['a charge is set with the pencil picked; one after dawn, or not in the box, is refused', async () => {
    const stuka = (await loadAirfield()).map.objectives.find((o) => o.id === 'stuka-1');
    const { state: bare } = await onAirfield({});
    const sapper = bare.units.find((u) => u.role === 'sapper' && !u.traits.some((t) => t.id === 'steady-hands'));
    const { rules, state } = await onAirfield({ [sapper.id]: stuka.chargeHexes[0] });
    const set = placeCharge(state, sapper.id, rules, 5);
    equal(set.charges.length, 1, 'set');
    equal(set.charges[0].fuse, 5, 'with the 5-turn pencil');
    equal(placeCharge(state, sapper.id, rules).charges[0].fuse, 4, 'none picked: the default');
    equal(placeCharge(state, sapper.id, rules, 7), state, 'no 7-turn pencil');
    const late = { ...state, turn: 18 };
    equal(checkPlaceCharge(late, late.units.find((u) => u.id === sapper.id), rules, 4).reason, 'a 4-turn pencil would go off after dawn', 'after dawn');
    // It burns its whole length: set on turn 1 with 5, still standing after 4 turns, gone after the 5th.
    let s = set;
    for (let t = 0; t < 4; t++) s = endTurn(s, rules, (await loadAirfield()).map);
    assert(!objectiveIn(s, 'stuka-1').destroyed, 'still standing at the end of turn 4');
    s = endTurn(s, rules, (await loadAirfield()).map);
    assert(objectiveIn(s, 'stuka-1').destroyed, 'gone at the end of turn 5');
  }],

  ['France has one pencil, its fuse as before, and dawn does not strike it out', async () => {
    const [map, rules, traits, roster] = await Promise.all([loadMap(), loadJson('data/rules.json'), loadJson('data/traits.json'), loadJson('data/roster.json')]);
    const state = createInitialState(roster, validateTraits(traits), rules, map, 1);
    equal(rules.charges.fuseChoice, null, 'no choice in France');
    const man = state.units.find((u) => u.role === 'sapper' && !u.traits.some((t) => t.id === 'steady-hands'));
    const late = { ...state, turn: 20 };
    equal(pencils(late, man, rules).length, 1, 'one pencil');
    equal(defaultPencil(late, man, rules).fuse, 3, 'three turns, even on the last');
  }],

  ['the bowser sets off the two Ju 52s beside it: one explosion, one alert rise, each scored and counted, their charges spent', async () => {
    const { map: m } = await loadAirfield();
    const bowser = m.objectives.find((o) => o.kind === 'bowser');
    const { rules, state } = await onAirfield({});
    const inBowser = (o) => o.kind === 'aircraft' && o.hexes.some((h) => bowser.chargeHexes.some(([q, r]) => Math.abs(q - h[0]) + Math.abs(r - h[1]) + Math.abs(q + r - h[0] - h[1]) <= 2 * rules.objectives.bowser.blastRadius));
    const caughtIds = m.objectives.filter(inBowser).map((o) => o.id);
    equal(caughtIds.length, 2, 'two aircraft in reach');
    const [cq, cr] = bowser.chargeHexes[0];
    const other = m.objectives.find((o) => o.id === caughtIds[0]);
    const primed = {
      ...state,
      charges: [
        { objectiveId: bowser.id, q: cq, r: cr, fuse: 1, unitId: 'x' },
        { objectiveId: other.id, q: other.chargeHexes[0][0], r: other.chargeHexes[0][1], fuse: 3, unitId: 'y' },
      ],
    };
    const warned = blastHexesThisTurn(primed, rules);
    for (const id of caughtIds) {
      const o = objectiveIn(primed, id);
      assert(o.hexes.every((h) => warned.some((b) => b.q === h.q && b.r === h.r)), `the warning includes ${id}'s own blast`);
    }
    const { state: after, events } = runFusePhase(primed, rules);
    for (const id of [bowser.id, ...caughtIds]) assert(objectiveIn(after, id).destroyed, `${id} destroyed`);
    equal(after.objectives.filter((o) => o.destroyed).length, 3, 'nothing else');
    equal(after.explosions, 1, 'one explosion');
    equal(after.alert.points - primed.alert.points, rules.objectives.bowser.alert, 'the bowser\'s alert only');
    equal(after.noises.length - primed.noises.length, 1, 'one noise');
    equal(events.filter((e) => e.kind === 'explosion' && e.setOffBy).length, 2, 'two set off, said so');
    equal(after.charges.length, 0, 'the charge on the caught aircraft is spent');
    const scored = scoreOf(after, rules).lines.filter((l) => l.label.endsWith('destroyed'));
    // M32: targets of one name share a line ("2 Ju 52s destroyed"), each still paid its own score.
    equal(scored.length, 2, 'the bowser, and the two Ju 52s on one line');
    assert(scored.some((l) => l.label === '2 Ju 52s destroyed' && l.points === 2 * rules.objectives.aircraft.score), `each scored as its own: ${scored.map((l) => l.label).join(' | ')}`);
  }],

  ['a man beside a set-off aircraft is killed by its blast, though out of the bowser\'s', async () => {
    const { map: m, rules, state: bare } = await onAirfield({});
    const bowser = m.objectives.find((o) => o.kind === 'bowser');
    const [cq, cr] = bowser.chargeHexes[0];
    const from = { q: cq, r: cr };
    const plane = bare.objectives.find((o) => o.kind === 'aircraft' && o.hexes.some((h) => hexDistance(h, from) === rules.objectives.bowser.blastRadius));
    let spot = null;
    for (let dq = -1; dq <= 1 && !spot; dq++) for (let dr = -1; dr <= 1 && !spot; dr++) {
      const h = { q: plane.hexes[0].q + dq, r: plane.hexes[0].r + dr };
      if (hexDistance(h, plane.hexes[0]) === 1 && hexDistance(h, from) > rules.objectives.bowser.blastRadius && isPassable(terrainAt(m, h.q, h.r))) spot = h;
    }
    assert(spot, 'a hex beside the far aircraft, out of the bowser\'s blast');
    const man = bare.units[0];
    const { state } = await onAirfield({ [man.id]: [spot.q, spot.r] });
    const primed = { ...state, charges: [{ objectiveId: bowser.id, q: cq, r: cr, fuse: 1, unitId: 'x' }] };
    equal(blastEffect(blastHexesThisTurn(primed, rules), spot), 'killed', 'warned');
    const { state: after, events } = runFusePhase(primed, rules);
    assert(after.units.find((u) => u.id === man.id).dead, 'killed');
    equal(events.find((e) => e.kind === 'blastKilled').label, plane.label, 'by the aircraft\'s blast');
  }],

  ['a bowser still standing counts toward what the stick can still do: one bomb for three', async () => {
    const { rules, state } = await onAirfield({}, 'normal');
    const { winShortfall } = await import('../src/missions.js');
    // Normal wants five; four bombs left in the stick is enough with the bowser.
    let left = 4;
    const units = state.units.map((u) => { const c = Math.min(u.charges, left); left -= c; return { ...u, charges: c }; });
    const fewer = { ...state, units };
    equal(units.reduce((n, u) => n + u.charges, 0), 4, 'four bombs');
    equal(winShortfall(fewer, rules), 0, 'three aircraft by bomb, two with the bowser');
    const { state: hard, rules: hardRules } = await onAirfield({}, 'hard');
    equal(winShortfall(hard, hardRules), 0, 'Hard wants six of five bombs: the bowser and four more');
    equal(winShortfall({ ...hard, objectives: hard.objectives.map((o) => (o.kind === 'bowser' ? { ...o, destroyed: true } : o)) }, hardRules), 1, 'Hard without the bowser: one short');
    const gone = { ...fewer, objectives: fewer.objectives.map((o) => (o.kind === 'bowser' ? { ...o, destroyed: true } : o)) };
    equal(winShortfall(gone, rules), 1, 'without it, one short');
  }],

  ['a timer too short for a man to get clear is named; the one offered is the shortest safe one from the default (M30b)', async () => {
    const { map: m } = await loadAirfield();
    const bowser = m.objectives.find((o) => o.kind === 'bowser');
    const [bq, br] = bowser.chargeHexes[0];
    const { state: bare } = await onAirfield({});
    const setter = bare.units.find((u) => u.role === 'sapper' && !u.traits.some((t) => t.id === 'steady-hands'));
    const other = bare.units.find((u) => u.role === 'gunner' && u.charges > 0);
    // Beside the bowser's point, with no AP now and one a turn: slow to get clear.
    const { map, rules, state } = await onAirfield({ [setter.id]: [bq, br], [other.id]: [bq - 1, br] });
    const slow = { ...state, units: state.units.map((u) => (u.id === other.id ? { ...u, ap: 0, apMax: 1 } : u)) };
    const target = slow.objectives.find((o) => o.id === bowser.id);
    const me = slow.units.find((u) => u.id === setter.id);
    const blasts = blastsOfCharge(slow, target, me, rules);
    assert(slow.objectives.filter((o) => o.kind === 'aircraft').every((o) => o.hexes.some((h) => blasts.some((b) => b.q === h.q && b.r === h.r)) === ['ju52-2', 'ju52-3'].includes(o.id)), 'the preview includes the two Ju 52s\' own blasts');
    assert(caughtBy(slow, map, me, target, 2, rules).includes(other.shortName), 'two turns: he is caught');
    equal(caughtBy(slow, map, me, target, 6, rules).join(), '', 'six turns: everyone gets clear');
    const offered = offeredPencil(slow, map, me, rules);
    assert(offered.fuse >= rules.charges.fuseTurns, 'never shorter than the default');
    equal(caughtBy(slow, map, me, target, offered.fuse, rules).length, 0, 'the one offered lets them all get clear');
    equal(offeredPencil(state, map, me, rules).fuse, rules.charges.fuseTurns, 'with nobody slow, the default');
  }],

  ['a charge burning past this turn shows its blast to come, the chain\'s too, with the turn it goes off (M30b)', async () => {
    const { map: m } = await loadAirfield();
    const bowser = m.objectives.find((o) => o.kind === 'bowser');
    const [bq, br] = bowser.chargeHexes[0];
    const { rules, state } = await onAirfield({});
    const set = { ...state, turn: 5, charges: [{ objectiveId: bowser.id, q: bq, r: br, fuse: 3, length: 4, unitId: 'x' }] };
    const later = laterBlasts(set, rules);
    assert(later.every((b) => b.blows === 7), 'goes off at the end of turn 7');
    assert(later.some((b) => b.label === 'Ju 52'), 'the Ju 52s it sets off are in it');
    equal(laterBlasts({ ...set, charges: [{ ...set.charges[0], fuse: 1 }] }, rules).length, 0, 'not once it is this turn\'s');
  }],

  ['its words (M31): the jeep raid is its diversion, with its own sound, back-page sounds and title card; lines that named France replaced', async () => {
    const { mission, roster } = await loadAirfield();
    equal(mission.words.diversionName, 'jeep raid', 'the diversion\'s name');
    equal(mission.diversionSound, 'jeepRaid', 'its sound');
    equal(mission.titleCard, 'assets/title/title-card-airfield.jpg', 'its own title card (France\'s until painted)');
    const said = roster.troopers.flatMap((t) => Object.values(t.dialogue)).join(' ');
    for (const word of ['church', 'France', 'bridge', 'cabbages', 'mud']) assert(!said.includes(word), `nobody says "${word}" in the desert`);
  }],

  ['the jeep drives from off the board to off it, outside the wire, on the line clearest of counters (M31b)', async () => {
    const { map } = await loadAirfield();
    const run = map.diversionRun;
    assert(DRIVE_BY_ART[run.art], `${run.art} has a picture`);
    equal(run.lines.map((l) => l.id).join(), 'north,south,west', 'top, bottom and side');
    const edge = boardPixelBounds(map);
    for (const line of run.lines) {
      const t = diversionTimeline(map, { line });
      const off = (p) => p.x < edge.minX || p.x > edge.maxX || p.y < edge.minY || p.y > edge.maxY;
      assert(off(t.start) && off(t.end), `${line.id}: in from off the board and out past it`);
      equal(t.length, DRIVE_BY.driveMs + DRIVE_BY.tailMs, 'its length');
    }
    equal(pickDiversionLine(map, []).id, 'north', 'the north on a clear board');
    equal(pickDiversionLine(map, [{ q: 8, r: 1 }]).id, 'south', 'a counter on the north scrub sends it south');
    equal(pickDiversionLine(map, [{ q: 8, r: 1 }, { q: 3, r: 11 }]).id, 'west', 'and one on the south sand, west');
    // The West line runs a jeep's half-width inside the board's left edge (M31d), so these stand on it.
    equal(pickDiversionLine(map, [{ q: 8, r: 1 }, { q: 3, r: 11 }, { q: -1, r: 4 }, { q: -2, r: 6 }]).id, 'north', 'fewest wins');
    // Across its way, the whole jeep stays on the board (M31d, the operator's: on the West line it was half off).
    const inside = boardEdges(map);
    for (const line of run.lines) {
      const { start, end } = diversionTimeline(map, { line });
      const upright = Math.abs(end.y - start.y) > Math.abs(end.x - start.x);
      for (const p of [start, end]) {
        const across = upright ? [p.x - DRIVE_BY.size / 2, p.x + DRIVE_BY.size / 2, inside.left, inside.right] : [p.y - DRIVE_BY.size / 2, p.y + DRIVE_BY.size / 2, inside.top, inside.bottom];
        assert(across[0] >= across[2] && across[1] <= across[3], `${line.id}: the jeep within the board's edge across its way`);
      }
    }
  }],

  ['the turn card says to pick a timer, and what the bowser sets off (M31)', async () => {
    const { state, rules } = await onAirfield({ holloway: [5, 12] });
    const hints = hintsFor({ ...state, turn: 2, parachutes: [] }, rules, {}, 10);
    assert(hints.some((h) => h.includes('then pick a timer')), `the timer: ${hints.join(' | ')}`);
    assert(hints.some((h) => h.includes('The Bowser sets off the 2 Ju 52s beside it: 3 for one charge')), `the bowser: ${hints.join(' | ')}`);
  }],

  ['the clean run here (M32): below Alert when the first bang goes, whatever comes after; France asks about the whole night', async () => {
    const { state, rules } = await onAirfield({ fitch: [4, 4] });
    const alertFrom = rules.alert.states.find((st) => st.id === 'alert').from;
    equal(rules.scoring.cleanUntil, 'firstExplosion', 'only the night before the first bang');
    equal(rules.scoring.cleanNeverReached, 'alert', 'and it must be below Alert');
    const quiet = { ...state, alert: { ...state.alert, points: alertFrom - 1, peak: alertFrom - 1 } };
    assert(cleanRun(quiet, rules).kept, 'Suspicious and no bang yet: still clean');
    const set = placeCharge(quiet, 'fitch', rules, 2);
    let after = set;
    for (let i = 0; i < 2; i++) after = runFusePhase(after, rules).state;
    assert(objectiveIn(after, 'stuka-1').destroyed, 'the Stuka goes up');
    equal(after.alert.peakBeforeBang, alertFrom - 1, 'the alert before the bang is kept');
    const alarmed = { ...after, alert: { ...after.alert, points: 7, peak: 7 } };
    assert(cleanRun(alarmed, rules).kept, 'Alarmed after the first bang does not spoil it');
    assert(scoreOf(alarmed, rules).lines.some((l) => l.points === rules.scoring.clean && l.label.includes('first bang')), 'and the back page pays it');
    assert(!cleanRun({ ...alarmed, diversionsCalled: 1 }, rules).kept, 'the jeep raid still costs it');
    const { json: all } = await loadAirfield();
    assert(all.missions.find((m) => m.id === 'airfield').words.cleanOrders.startsWith('Getting in with'), 'the orders say so, of getting in');
    assert(all.missions.find((m) => m.id === 'france').words.cleanOrders.startsWith('Getting in and out'), 'France\'s of in and out');
    const loud = { ...state, alert: { ...state.alert, points: alertFrom, peak: alertFrom } };
    assert(!cleanRun(loud, rules).kept, 'Alert before any bang: gone');
    let late = placeCharge(loud, 'fitch', rules, 2);
    for (let i = 0; i < 2; i++) late = runFusePhase(late, rules).state;
    assert(!cleanRun(late, rules).kept, 'and it stays gone once the bang comes');

    const france = await loadJson('data/rules.json');
    equal(france.scoring.cleanUntil, null, 'France: the whole night');
    equal(france.scoring.cleanNeverReached, 'alarmed', 'France: never Alarmed');
    const fr = { explosions: 1, diversionsCalled: 0, alert: { peak: 7, peakBeforeBang: 0 } };
    assert(!cleanRun(fr, france).kept, 'France: Alarmed after the bridge still spoils it');
  }],

  ['the jeep raid is urged for men in contact, never for the Alarmed garrison (M32: it is Alarmed in every raid)', async () => {
    const { state, rules } = await onAirfield({ fitch: [4, 4], vance: [5, 3] });
    equal(rules.diversion.prompt.alertState, null, 'no alert state prompts it');
    const alarmed = { ...state, alert: { ...state.alert, points: 7, peak: 7 } };
    equal(diversionPrompt(alarmed, rules, true), null, 'Alarmed alone: no prompt');
    const two = { ...alarmed, units: alarmed.units.map((u) => (u.id === 'fitch' || u.id === 'vance' ? { ...u, inContact: true } : u)) };
    assert(diversionPrompt(two, rules, true)?.includes('in contact'), 'two men in contact: urged');
  }],

  ['the back page rates a mission accomplished against the mission\'s score bands (M32)', async () => {
    const { json, mission } = await loadAirfield();
    for (const m of json.missions.filter((x) => x.status === 'playable')) {
      assert(m.ratings?.length >= 2 && m.ratings[0].from === 0, `${m.id} has its bands, from 0`);
    }
    const bands = mission.ratings;
    equal(ratingOf(mission, 0).label, bands[0].label, 'the lowest band from nought');
    equal(ratingOf(mission, bands[1].from - 1).label, bands[0].label, 'one short of the next');
    equal(ratingOf(mission, bands[1].from).label, bands[1].label, 'on the line is in');
    equal(ratingOf(mission, 999).label, bands.at(-1).label, 'the top has no ceiling');
    const ladder = ratingOf(mission, bands[1].from).ladder;
    equal(ladder.filter((b) => b.earned).length, 1, 'one band earned');
    equal(ladder[0].to, bands[1].from - 1, 'a band runs to one below the next');
    equal(ladder.at(-1).to, null, 'the top runs on');
    equal(ratingOf({ ...mission, ratings: undefined }, 30), null, 'a mission with none is not rated');
    const bad = (ratings) => { try { validateMissions({ ...json, missions: json.missions.map((m) => (m.id === 'airfield' ? { ...m, ratings } : m)) }); return false; } catch { return true; } };
    assert(bad([{ from: 5, label: 'X' }]), 'must start from 0');
    assert(bad([{ from: 0, label: 'X' }, { from: 0, label: 'Y' }]), 'must rise');
    assert(bad([{ from: 0 }]), 'needs a label');
  }],
];
