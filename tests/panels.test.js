// Comic panels' triggers (M61, src/panels.js): each of the heavy water plant's
// new moments comes when its `when` says, and only then; a bad `when` is
// refused when the missions load.

import { forEachCell, loadJson, loadMap, terrainIdAt } from '../src/map.js';
import { missionById, missionEnemyTypes, validateMissions } from '../src/missions.js';
import { checkPanelNames, panelsDue } from '../src/panels.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadGunnerside() {
  const json = validateMissions(await loadJson('data/missions.json'));
  const mission = missionById(json, 'gunnerside');
  const map = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
  return { json, mission, map };
}

function hexOf(map, terrain) {
  let found = null;
  forEachCell(map, (q, r) => { if (!found && terrainIdAt(map, q, r) === terrain) found = { q, r }; });
  return found;
}

// A quiet night: nobody has moved, fired or blown anything.
function quiet(map) {
  return {
    units: [{ id: 'a', q: 0, r: 0, trail: [] }],
    objectives: map.objectives.map((o) => ({ id: o.id, primary: o.primary ?? false, destroyed: false })),
    firstShot: null,
    outcome: null,
  };
}

const due = (mission, state, map, seen = new Set()) => panelsDue(mission, state, map, seen).join();

export default [
  ['the heavy water plant has five moments, each on this map: nothing is due on a quiet night', async () => {
    const { mission, map } = await loadGunnerside();
    checkPanelNames(mission, map);
    equal(Object.keys(mission.comicPanels).filter((m) => mission.comicPanels[m].when).join(), 'climb,inside,firstShot,bang,failed', 'its moments');
    equal(due(mission, quiet(map), map), '', 'nothing yet');
  }],

  ['a man onto the gorge side, or through the duct, brings the climb or inside; standing on it after the turn does not', async () => {
    const { mission, map } = await loadGunnerside();
    const cliff = hexOf(map, 'gorgeSide');
    const duct = hexOf(map, 'duct');
    assert(cliff && duct, 'both on the map');
    const night = quiet(map);
    equal(due(mission, { ...night, units: [{ id: 'a', ...cliff, trail: [cliff] }] }, map), 'climb', 'the climb');
    equal(due(mission, { ...night, units: [{ id: 'a', q: 0, r: 0, trail: [duct, { q: 0, r: 0 }] }] }, map), 'inside', 'passing through the duct counts');
    equal(due(mission, { ...night, units: [{ id: 'a', ...duct, trail: [] }] }, map), '', 'landed or left there from last turn: no');
    equal(due(mission, { ...night, units: [{ id: 'a', ...cliff, trail: [cliff] }] }, map, new Set(['climb'])), '', 'once a game');
  }],

  ['the first shot, the hall blown and a night lost each bring their own; a win brings no failed panel', async () => {
    const { mission, map } = await loadGunnerside();
    const night = quiet(map);
    equal(due(mission, { ...night, firstShot: { unitId: 'speers', turn: 9 } }, map), 'firstShot', 'the shot');
    const blown = night.objectives.map((o) => (o.primary ? { ...o, destroyed: true } : o));
    equal(due(mission, { ...night, objectives: blown }, map), 'bang', 'the cells');
    const line = night.objectives.map((o) => (o.primary ? o : { ...o, destroyed: true }));
    equal(due(mission, { ...night, objectives: line }, map), '', 'the telephone cut is not the bang');
    equal(due(mission, { ...night, outcome: { kind: 'failed' } }, map), 'failed', 'failed');
    equal(due(mission, { ...night, outcome: { kind: 'withdrawn' } }, map), 'failed', 'withdrawn');
    equal(due(mission, { ...night, objectives: blown, outcome: { kind: 'success' } }, map), 'bang', 'a win: the bang, and success has its own slot');
  }],

  ['a `when` that is not one of the four triggers, or names nothing on the map, is refused', async () => {
    const { json, map } = await loadGunnerside();
    const withPanel = (when) => {
      const copy = structuredClone(json);
      missionById(copy, 'gunnerside').comicPanels.extra = { art: 'x.jpg', when };
      return copy;
    };
    for (const when of [{}, { firstShot: false }, { outcome: ['lost'] }, { firstEnter: 'snow', firstShot: true }, { dawn: true }]) {
      let refused = false;
      try { validateMissions(withPanel(when)); } catch { refused = true; }
      assert(refused, `refused: ${JSON.stringify(when)}`);
    }
    for (const when of [{ firstEnter: 'lava' }, { objectiveDestroyed: 'barracks' }]) {
      let refused = false;
      try { checkPanelNames(missionById(withPanel(when), 'gunnerside'), map); } catch { refused = true; }
      assert(refused, `refused: ${JSON.stringify(when)}`);
    }
  }],
];
