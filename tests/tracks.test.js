// M57: the engine for Gunnerside (MISSION-GUNNERSIDE.md): tracks in the snow
// (SPEC.md §9 Tracks), the no-shot clean run and the record of the first shot,
// all off in the files. No map has snow yet, so they are tried on France's map
// with its fields made to take prints and the rules patched.

import { runEnemyPhase } from '../src/enemy.js';
import { NEIGHBOR_DIRS, facingToward, hexDistance } from '../src/hex.js';
import { forEachCell, loadJson, loadMap, terrainAt } from '../src/map.js';
import { cleanRun } from '../src/scoring.js';
import { createInitialState, endTurn, killEnemy, moveUnit, suppressEnemy } from '../src/state.js';
import { agePrints, findsFrom, lookouts, printAge, printFillsTurn, printsFor, takesPrints, trailsFound } from '../src/tracks.js';
import { validateTraits } from '../src/traits.js';
import { unitById } from '../src/units.js';
import { landedState } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const TRACKS = { turns: 3, alert: 1, alertPerPhase: 1 };
const E = 2; // NEIGHBOR_DIRS index of east
const step = (h, d) => ({ q: h.q + NEIGHBOR_DIRS[d].q, r: h.r + NEIGHBOR_DIRS[d].r });

async function loadAll() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(), loadJson('data/rules.json'), loadJson('data/traits.json'), loadJson('data/roster.json'),
  ]);
  // France's fields as snow: the test board.
  const snowMap = { ...map, terrain: { ...map.terrain, field: { ...map.terrain.field, tracks: true } } };
  return { map, snowMap, rules, withTracks: { ...rules, tracks: TRACKS }, traits: validateTraits(traitsJson), roster };
}

// Four field hexes in a row going east, clear of the men and the garrison, so
// a path can be walked over open snow without asking the pathfinder.
function openRow(env, state) {
  let found = null;
  forEachCell(env.map, (q, r) => {
    if (found) return;
    const row = [0, 1, 2, 3].reduce((hexes) => [...hexes, hexes.length ? step(hexes.at(-1), E) : { q, r }], []);
    const field = row.every((h) => terrainAt(env.map, h.q, h.r)?.label === 'Field');
    const clear = row.every((h) => [...state.units, ...state.enemies].every((x) => hexDistance(x, h) > 2));
    if (field && clear) found = row;
  });
  return found;
}

// A man stood at the start of `path`, walking it as one move.
function walk(state, unitId, path, map, rules) {
  const placed = { ...state, units: state.units.map((u) => (u.id === unitId ? { ...u, q: path[0].q, r: path[0].r } : u)) };
  return moveUnit(placed, unitId, { path, total: path.length - 1 }, map, rules);
}

// Only one enemy, a post that stands still where it is put:
// a post standing on `hex`, looking at `toward` (M59b: prints are found ahead of it).
function postAt(state, hex, toward) {
  const facing = toward ? facingToward(hex, toward) : state.enemies.find((e) => e.speed === 0).facing;
  const enemy = { ...state.enemies.find((e) => e.speed === 0), q: hex.q, r: hex.r, facing, homeFacing: facing, sweep: null, holding: null, investigating: null };
  return { ...state, enemies: [enemy] };
}

export default [
  ['all three are off in the files: no tracks rule, no ground takes prints but the snow, the first shot fired at once', async () => {
    const env = await loadAll();
    equal(env.rules.tracks, null, 'tracks');
    equal(env.rules.scoring.cleanNoShot, false, 'scoring.cleanNoShot');
    equal(env.rules.confirmShot, false, 'confirmShot');
    const terrain = await loadJson('data/terrain.json');
    const marked = Object.entries(terrain.types).filter(([, t]) => t.tracks).map(([id]) => id);
    equal(marked.join(), 'snowfield,drift', 'only the snowfield and the drift take prints');
    const s = landedState(env.roster, env.traits, env.rules, env.snowMap);
    const row = openRow(env, s);
    const moved = walk(s, s.units[0].id, row, env.snowMap, env.rules);
    equal(moved.prints.length, 0, 'no prints where the mission has no tracks');
    assert(!takesPrints(env.snowMap, env.rules, row[1]), 'takesPrints is off too');
  }],

  ['a move over open snow lays a print on each snow hex after the first, turned the way he walked', async () => {
    const env = await loadAll();
    const s = landedState(env.roster, env.traits, env.withTracks, env.snowMap);
    equal(s.prints.length, 0, 'landing lays none');
    const row = openRow(env, s);
    const man = s.units[2];
    const moved = walk(s, man.id, row, env.snowMap, env.withTracks);
    equal(moved.prints.length, 3, 'the three hexes he stepped onto');
    assert(!moved.prints.some((p) => p.q === row[0].q && p.r === row[0].r), 'none where he started');
    for (const p of moved.prints) {
      equal(p.unitId, man.id, 'his');
      equal(p.name, man.shortName, 'his name');
      equal(p.turn, 1, 'laid on turn 1');
      equal(p.inDir, 5, 'in from the west edge');
      equal(p.outDir, E, 'out by the east edge, the last straight on');
    }
    equal(new Set(moved.prints.map((p) => p.trail)).size, 1, 'one move, one trail');
    equal(s.prints.length, 0, 'the state it was given is untouched');
  }],

  ['a bend is turned in the hex, ground that takes no prints is skipped, and a hex walked again keeps the newest', async () => {
    const env = await loadAll();
    const s = landedState(env.roster, env.traits, env.withTracks, env.snowMap);
    const row = openRow(env, s);
    const bend = printsFor(env.snowMap, env.withTracks, s.units[0], [row[0], row[1], step(row[1], 3)], 1, 't');
    equal(bend[0].inDir, 5, 'in from the west');
    equal(bend[0].outDir, 3, 'out to the south-east');
    const hedgeMap = { ...env.snowMap, terrain: { ...env.snowMap.terrain, field: { ...env.snowMap.terrain.field, tracks: false } } };
    equal(printsFor(hedgeMap, env.withTracks, s.units[0], row, 1, 't').length, 0, 'none off the snow');
    const first = walk(s, s.units[0].id, row, env.snowMap, env.withTracks);
    const back = [row[3], row[2], row[1]];
    const again = walk(first, s.units[1].id, back, env.snowMap, env.withTracks);
    equal(again.prints.length, 3, 'two of the first trail are overwritten');
    const mid = again.prints.filter((p) => p.q === row[2].q && p.r === row[2].r);
    equal(mid.length, 1, 'one print a hex');
    equal(mid[0].unitId, s.units[1].id, 'the newest');
    equal(again.trailsLaid, 2, 'two trails laid');
  }],

  ['prints laid in turn N are on the board through turn N+2 and gone at its end', async () => {
    const env = await loadAll();
    const p = { q: 0, r: 0, trail: 't', turn: 5 };
    equal(agePrints([p], 5, env.withTracks).length, 1, 'end of N');
    equal(agePrints([p], 6, env.withTracks).length, 1, 'end of N+1');
    equal(agePrints([p], 7, env.withTracks).length, 0, 'end of N+2');
    equal(printFillsTurn(p, env.withTracks), 7, 'fills in turn N+2');
    equal(printAge(p, 6), 1, 'its age the turn after');
    equal(agePrints([p], 9, env.rules).length, 1, 'never aged where there are no tracks');
    // And through whole turns, with nobody near them.
    let s = landedState(env.roster, env.traits, env.withTracks, env.snowMap);
    s = { ...s, enemies: [] };
    s = walk(s, s.units[0].id, openRow(env, s), env.snowMap, env.withTracks);
    const counts = [];
    for (let i = 0; i < 3; i++) {
      s = endTurn(s, env.withTracks, env.snowMap);
      counts.push(s.prints.length);
    }
    equal(counts.join(), '3,3,0', 'after turns 1, 2 and 3');
  }],

  ['an enemy beside one print, facing it, finds the whole trail: alert +1, a noise where it found it, reported', async () => {
    const env = await loadAll();
    let s = landedState(env.roster, env.traits, env.withTracks, env.snowMap);
    const row = openRow(env, s);
    s = walk(s, s.units[0].id, row, env.snowMap, env.withTracks);
    const at = step(row[3], 1); // beside only the last print
    const away = postAt(s, at, step(at, 1));
    equal(runEnemyPhase(away, env.snowMap, env.withTracks).state.prints.length, 3, 'facing away, it finds nothing (M59b)');
    s = postAt(s, at, row[3]);
    const before = s.alert.points;
    const after = runEnemyPhase(s, env.snowMap, env.withTracks);
    equal(after.state.prints.length, 0, 'the whole trail goes');
    equal(after.state.alert.points, before + TRACKS.alert, 'alert +1');
    const found = after.events.filter((e) => e.kind === 'tracksFound');
    equal(found.length, 1, 'one find');
    equal(found[0].name, s.units[0].shortName, 'whose');
    equal(`${found[0].q},${found[0].r}`, `${row[3].q},${row[3].r}`, 'found at the print beside it');
    equal(found[0].hexes.length, 3, 'every hex of the trail, for the board to flash');
    const noise = after.state.noises.find((n) => n.kind === 'found');
    assert(noise && noise.q === row[3].q && noise.r === row[3].r, 'a noise where it was found');
  }],

  ['two trails found in one enemy phase raise the alert once, and a trail nobody comes near is left', async () => {
    const env = await loadAll();
    let s = landedState(env.roster, env.traits, env.withTracks, env.snowMap);
    const row = openRow(env, s);
    s = walk(s, s.units[0].id, [row[0], row[1]], env.snowMap, env.withTracks);
    s = walk(s, s.units[1].id, [row[3], row[2]], env.snowMap, env.withTracks);
    s = postAt(s, row[2], row[1]); // on the second trail's print, looking at the first's
    const far = { q: s.enemies[0].q + 6, r: s.enemies[0].r, unitId: s.units[2].id, name: s.units[2].shortName, trail: 'far', turn: 1, inDir: 5, outDir: E };
    s = { ...s, prints: [...s.prints, far] };
    const before = s.alert.points;
    const after = runEnemyPhase(s, env.snowMap, env.withTracks);
    equal(after.events.filter((e) => e.kind === 'tracksFound').length, 2, 'both trails found');
    equal(after.state.alert.points, before + TRACKS.alert, 'raised once');
    equal(after.state.noises.filter((n) => n.kind === 'found').length, 2, 'a noise at each');
    equal(after.state.prints.map((p) => p.trail).join(), 'far', 'a trail far off is left');
  }],

  ['trailsFound takes each trail once, at the first print the walker found ahead of him', async () => {
    const prints = [
      { q: 0, r: 0, trail: 'a' }, { q: 1, r: 0, trail: 'a' }, { q: 5, r: 0, trail: 'b' },
    ];
    const rules = { tracks: { findRange: 1 } };
    const west = { facing: 5, arcDegrees: 110 };
    const found = trailsFound(null, rules, prints, [{ q: 2, r: 0, ...west }, { q: 1, r: 0, ...west }]);
    equal(found.length, 1, 'only a');
    equal(`${found[0].at.q}`, '1', 'at the print ahead of the first hex it stood on');
    equal(found[0].hexes.length, 2, 'both of its prints');
  }],

  ['prints behind an enemy are not found (M59b): only underfoot, or ahead in its arc within findRange', async () => {
    const rules = { tracks: { findRange: 2 } };
    const at = { q: 0, r: 0, facing: 2, arcDegrees: 110 }; // facing E
    assert(findsFrom(null, rules, at, { q: 0, r: 0 }), 'underfoot');
    assert(findsFrom(null, rules, at, { q: 1, r: 0 }), 'the hex ahead');
    assert(findsFrom(null, rules, at, { q: 2, r: 0 }), 'two ahead, within findRange');
    assert(!findsFrom(null, rules, at, { q: 3, r: 0 }), 'three ahead is past findRange');
    assert(!findsFrom(null, rules, at, { q: -1, r: 0 }), 'not the hex behind');
    assert(!findsFrom(null, rules, at, { q: 0, r: -1 }), 'not a hex to its side');
    const walked = lookouts({ q: 0, r: 0, facing: 5 }, [{ q: 1, r: 0 }, { q: 2, r: 0 }], { q: 2, r: 0, facing: 0, arcDegrees: 110 });
    equal(walked.map((l) => l.facing).join(), '2,2,0', 'it looks the way it walked, then the way it ends facing');
  }],

  ['the first shot is recorded once, by suppress or kill; the no-shot clean run asks it', async () => {
    const env = await loadAll();
    const s = landedState(env.roster, env.traits, env.rules, env.map);
    equal(s.firstShot, null, 'nobody has fired');
    const gunner = s.units.find((u) => u.role === 'gunner');
    const enemy = { ...s.enemies.find((e) => e.speed > 0), q: gunner.q + 1, r: gunner.r, facing: 0 };
    const ready = { ...s, turn: 4, enemies: [enemy] };
    const shot = suppressEnemy(ready, gunner.id, enemy.id, env.map, env.rules);
    assert(shot !== ready, 'the suppress was legal');
    equal(JSON.stringify(shot.firstShot), JSON.stringify({ unitId: gunner.id, turn: 4 }), 'who and when');
    const later = killEnemy({ ...shot, turn: 5, units: shot.units.map((u) => (u.id === gunner.id ? { ...u, ap: 3 } : u)) }, gunner.id, enemy.id, env.map, env.rules);
    assert(later.enemies.length === 0, 'the kill was legal');
    equal(later.firstShot.turn, 4, 'the first is kept');
    assert(cleanRun(shot, env.rules).kept, 'where the mission does not ask, a shot keeps the clean run');
    const noShot = { ...env.rules, scoring: { ...env.rules.scoring, cleanNoShot: true } };
    assert(cleanRun(ready, noShot).kept, 'no shot: clean');
    assert(!cleanRun(shot, noShot).kept, 'a shot loses it');
    assert(cleanRun(ready, noShot).label.includes('not a shot fired'), 'and the back page says so');
    equal(unitById(shot.units, gunner.id).ap, 1, 'the suppress cost what it always did');
  }],

  ['the tracks rule is checked when the game starts', async () => {
    const env = await loadAll();
    let threw = false;
    try {
      createInitialState(env.roster, env.traits, { ...env.rules, tracks: { turns: 0, alert: 1, alertPerPhase: 1 } }, env.map);
    } catch {
      threw = true;
    }
    assert(threw, 'turns 0 is refused');
  }],
];
