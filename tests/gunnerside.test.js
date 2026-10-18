// Mission 4, the heavy water plant (SPEC.md §16, MISSION-GUNNERSIDE.md, M58):
// its map and data as a draft, with M57's engine switched on. Runs against the
// real data files.

import { applyDifficulty, levelById, validateDifficulty } from '../src/difficulty.js';
import { hexDistance } from '../src/hex.js';
import { findPath, hexKey, isPassable, loadJson, loadMap, terrainAt, terrainIdAt } from '../src/map.js';
import { canPlay, missionById, missionEnemyTypes, missionFromQuery, missionLevels, missionRoster, missionRules, validateMissions, winTargets } from '../src/missions.js';
import { kindOf } from '../src/sabotage.js';
import { chooseDropRun, createInitialState, jump } from '../src/state.js';
import { takesPrints, watchedSnow } from '../src/tracks.js';
import { runDetection, runEnemyPhase } from '../src/enemy.js';
import { validateTraits } from '../src/traits.js';
import { largestPool, planMove } from '../src/units.js';
import { describePlan } from '../src/render/ui.js';
import { exfilArtId, hasSprite, objectiveArt, terrainArt, terrainMotifId } from '../src/render/theme.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadGunnerside(levelId = 'normal') {
  const json = validateMissions(await loadJson('data/missions.json'));
  const mission = missionById(json, 'gunnerside');
  const loadedMap = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
  const loadedRules = missionRules(mission, await loadJson('data/rules.json'));
  const difficulty = missionLevels(mission, validateDifficulty(await loadJson('data/difficulty.json'), loadedRules, { types: loadedMap.enemyTypes }), loadedRules, loadedMap.enemyTypes);
  const { rules, map } = applyDifficulty(levelById(difficulty, levelId), loadedRules, loadedMap);
  const traits = validateTraits(await loadJson('data/traits.json'));
  const roster = missionRoster(mission, await loadJson(mission.roster));
  return { json, mission, map, rules, traits, roster };
}

// The board's rows (MISSION-GUNNERSIDE.md, The map): the plateau above the
// gorge's three rows, the shelf below them.
const GORGE_ROWS = [5, 6, 7];
const SEEDS = Array.from({ length: 30 }, (_, i) => i * 7919 + 3);

// A sapper standing at (q, r) with `ap` of his 3 AP left, landed.
function sapperAt(state, q, r, ap = 3) {
  const unit = state.units.find((u) => u.role === 'sapper');
  return { ...unit, q, r, ap, apMax: 3, landed: true };
}

export default [
  ['the heavy water plant is a draft (M58): stamped on the contents page, opened by ?mission=gunnerside', async () => {
    const { json, mission } = await loadGunnerside();
    equal(mission.status, 'draft', 'not yet announced');
    assert(canPlay(mission), 'a draft can be played');
    equal(missionFromQuery('?mission=gunnerside', json), 'gunnerside', 'the address opens it');
    equal(json.default, 'france', 'France still opens by default');
  }],

  ['its rules patch turns M57\'s engine on: tracks, the no-shot clean run worth 5, the first shot asked; the shot +4 and heard everywhere; a 20-turn night', async () => {
    const { rules } = await loadGunnerside();
    equal(rules.turnLimit, 20, 'dawn');
    equal(rules.tracks.turns, 3, 'prints last');
    equal(rules.tracks.alertPerPhase, 1, 'prints raise the alert once a phase at most');
    equal(rules.scoring.cleanNoShot, true, 'NOT A SHOT FIRED');
    equal(rules.scoring.clean, 5, 'its bonus');
    equal(rules.confirmShot, true, 'the first shot asks');
    equal(rules.alert.gunfire, 4, 'a shot\'s alert');
    assert(rules.noise.gunfire >= 18, 'a shot is heard across the board');
    equal(rules.roles.sapper.charges, 2, 'a sapper jumps with two');
    equal(rules.canisters ?? null, null, 'no canisters');
  }],

  ['the cell hall takes three charges of four points (two on Easy, four on Hard) and calls 1 squad (0, 2); the telephone line can be cut and stops the reserve', async () => {
    for (const [level, charges, squads] of [['easy', 2, 0], ['normal', 3, 1], ['hard', 4, 2]]) {
      const { map, rules, traits, roster } = await loadGunnerside(level);
      const state = createInitialState(roster, traits, rules, map, 1);
      const { targets } = winTargets(state, rules);
      equal(targets.map((o) => o.id).join(), 'cell-hall', `${level}: the win is the cell hall`);
      equal(kindOf(targets[0], rules).chargesNeeded, charges, `${level}: charges it takes`);
      equal(kindOf(targets[0], rules).reinforcements, squads, `${level}: squads it calls`);
      equal(targets[0].chargeHexes.length, 4, `${level}: four charge points`);
      const phone = state.objectives.find((o) => o.kind === 'telephone');
      assert(kindOf(phone, rules).cutLine && kindOf(phone, rules).payoff.noReserve, `${level}: the telephone line is cut and stops the reserve`);
    }
  }],

  ['the hall: its charge points are on the hall floor beside the cells, inside the kill radius; the duct is the quiet way in and outside it', async () => {
    const { map, rules, traits, roster } = await loadGunnerside();
    const state = createInitialState(roster, traits, rules, map, 1);
    const hall = state.objectives.find((o) => o.primary);
    const kill = kindOf(hall, rules).killRadius;
    for (const point of hall.chargeHexes) {
      equal(terrainIdAt(map, point.q, point.r), 'hall', 'a charge point is hall floor');
      assert(hall.hexes.some((h) => hexDistance(h, point) <= kill), 'a man on a charge point is in the kill radius');
    }
    const ducts = [];
    for (let r = 0; r < map.height; r++) for (let q = -r; q < map.width; q++) if (terrainIdAt(map, q, r) === 'duct') ducts.push({ q, r });
    equal(ducts.length, 1, 'one cable duct');
    assert(hall.hexes.every((h) => hexDistance(h, ducts[0]) > kill), 'the duct is clear of the bang');
  }],

  ['every run lands everyone north of the shelf (a man may come down on a gorge side, a bad landing), never on the way out', async () => {
    const { map, rules, traits, roster } = await loadGunnerside();
    const exfil = new Set(map.exfil.map(([q, r]) => hexKey(q, r)));
    for (const run of map.dropRuns) {
      for (const seed of SEEDS) {
        const s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, seed), map, run.id), map, rules);
        for (const u of s.units) {
          assert(u.r <= GORGE_ROWS[GORGE_ROWS.length - 1], `${run.id} seed ${seed}: ${u.id} landed on row ${u.r}, south of the gorge`);
          assert(!exfil.has(hexKey(u.q, u.r)), `${run.id} seed ${seed}: ${u.id} landed on the way out`);
        }
      }
    }
  }],

  ['the gorge: its sides cost more than any pool, so a climb is the minimum step, a whole turn at full AP, worded so; the ice between is 1 AP', async () => {
    const { map, rules, traits, roster } = await loadGunnerside();
    const side = terrainAt(map, 4, 5);
    equal(terrainIdAt(map, 4, 5), 'gorgeSide', 'row 5 is a gorge side');
    assert(side.moveCost > largestPool(rules), 'dearer than any pool, the leader\'s bonus counted');
    equal(terrainIdAt(map, 3, 6), 'ice', 'row 6 is the ice');
    const state = createInitialState(roster, traits, rules, map, 1);
    // From the rim at (4, 4) down onto the side at (4, 5).
    const full = sapperAt(state, 4, 4, 3);
    const down = planMove(map, [full], full, { q: 4, r: 5 }, rules);
    assert(down.affordable && down.minimumStep && down.climb, 'at full AP he can climb down');
    equal(describePlan(down, full), 'climb · his whole turn, all 3 AP', 'the hover gives the turn, never the 30');
    const tired = sapperAt(state, 4, 4, 2);
    const not = planMove(map, [tired], tired, { q: 4, r: 5 }, rules);
    assert(!not.affordable, 'with any AP spent he cannot');
    assert(/whole turn/.test(describePlan(not, tired)), 'and the hover says why');
    // On the side at full AP: onto the ice is 1 AP, and the far side needs a full pool again.
    const onSide = sapperAt(state, 4, 5, 3);
    const toIce = planMove(map, [onSide], onSide, { q: 3, r: 6 }, rules);
    assert(toIce.affordable && toIce.total === 1, 'onto the ice for 1 AP');
    const onIce = sapperAt(state, 3, 6, 2);
    assert(!planMove(map, [onIce], onIce, { q: 3, r: 7 }, rules).affordable, 'and not up the far side in the same turn');
  }],

  ['the garrison never climbs: a walk from the rim to the shelf goes round by the bridge', async () => {
    const { map } = await loadGunnerside();
    const path = findPath(map, { q: 4, r: 3 }, { q: -1, r: 8 }, null);
    assert(path.some((h) => terrainIdAt(map, h.q, h.r) === 'bridge'), 'over the bridge');
    assert(!path.some((h) => terrainIdAt(map, h.q, h.r) === 'gorgeSide'), 'never down a gorge side');
  }],

  ['the snowfield and the drift take prints; the pines, the rock, the railway and the road take none', async () => {
    const { map, rules } = await loadGunnerside();
    const first = (id) => {
      for (let r = 0; r < map.height; r++) for (let q = -r; q < map.width; q++) if (terrainIdAt(map, q, r) === id) return { q, r };
      throw new Error(`no ${id} on the map`);
    };
    for (const id of ['snowfield', 'drift']) assert(takesPrints(map, rules, first(id)), `${id} takes prints`);
    for (const id of ['pines', 'rock', 'railway', 'track', 'bridge', 'ice']) assert(!takesPrints(map, rules, first(id)), `${id} takes none`);
  }],

  ['every ground on the map is drawn, the bridge printed as the suspension deck; the cells, the junction box and the ski trail have their pictures', async () => {
    const { map, rules, traits, roster } = await loadGunnerside();
    const ids = new Set();
    for (let r = 0; r < map.height; r++) for (let q = -r; q < map.width; q++) if (terrainAt(map, q, r)) ids.add(map.printedAs?.[terrainIdAt(map, q, r)] ?? terrainIdAt(map, q, r));
    for (const id of ids) {
      const art = terrainArt(id);
      assert(art.fill !== '#FF00FF', `${id} has art`);
      for (let v = 0; v < 40; v++) {
        const motif = terrainMotifId(art, v, v * 3);
        if (motif) assert(hasSprite(motif), `${id}'s motif ${motif} is drawn`);
        if (motif && art.shadows) assert(hasSprite(`${motif}-shadow`), `${id}'s ${motif} has its shadow`);
      }
    }
    equal(map.printedAs.bridge, 'suspension', 'the bridge is printed as the deck');
    const state = createInitialState(roster, traits, rules, map, 1);
    for (const o of state.objectives) {
      for (const destroyed of [false, true]) {
        const art = objectiveArt({ ...o, destroyed, cut: destroyed && o.kind === 'telephone' });
        assert(art && hasSprite(art.id), `${o.id} ${destroyed ? 'destroyed' : 'intact'} has a picture`);
      }
    }
    equal(exfilArtId(map.exfilArt), 'objective-ski-trail', 'the ski trail at the way out');
    assert(map.exfil.every(([q, r]) => isPassable(terrainAt(map, q, r))), 'the way out can be walked onto');
  }],

  ['the footprint wash (M58c): the snow on or beside where the garrison stands or walks next turn, only ground that takes prints, nothing without tracks', async () => {
    const { map, rules, traits, roster } = await loadGunnerside();
    const state = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 3), map, 'north'), map, rules);
    const detected = runDetection(state, map, rules).state;
    const after = runEnemyPhase(detected, map, rules).state.enemies;
    const watched = watchedSnow(map, rules, detected.enemies, after);
    assert(watched.size > 0, 'some snow is watched');
    for (const key of watched) {
      const [q, r] = key.split(',').map(Number);
      assert(takesPrints(map, rules, { q, r }), `${key} takes prints`);
      const stood = [...detected.enemies, ...after.flatMap((e) => [...(e.walked ?? []), e])];
      assert(stood.some((e) => hexDistance(e, { q, r }) <= 1), `${key} is beside the garrison's walk`);
    }
    equal(watchedSnow(map, { ...rules, tracks: null }, detected.enemies, after), null, 'off without tracks');
  }],
];
