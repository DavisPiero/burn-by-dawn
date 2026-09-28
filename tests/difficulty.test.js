// Difficulty levels (SPEC.md §10, M9): data/difficulty.json patches the rules
// and the enemy types, and nothing else knows which level is on.

import { applyDifficulty, difficultyFromQuery, levelById, validateDifficulty } from '../src/difficulty.js';
import { loadJson, loadMap } from '../src/map.js';
import { callDiversion, checkDiversion, createInitialState } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { landedState } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadAll() {
  const map = await loadMap();
  const rules = await loadJson('data/rules.json');
  const json = validateDifficulty(await loadJson('data/difficulty.json'), rules, { types: map.enemyTypes });
  const traits = validateTraits(await loadJson('data/traits.json'));
  const roster = await loadJson('data/roster.json');
  return { map, rules, json, traits, roster };
}

export default [
  ['data/version.json names the build the margin shows (M21c: an empty one stopped the game loading)', async () => {
    const { version } = await loadJson('data/version.json');
    assert(typeof version === 'string' && /^M\d+[a-z]?$/.test(version), `a milestone like M21c, got ${JSON.stringify(version)}`);
  }],

  ['the default level is the files as they are', async () => {
    const { map, rules, json } = await loadAll();
    const normal = applyDifficulty(levelById(json, json.default), rules, map);
    equal(JSON.stringify(normal.rules), JSON.stringify(rules), 'rules unchanged');
    equal(JSON.stringify(normal.map.enemyTypes), JSON.stringify(map.enemyTypes), 'enemy types unchanged');
  }],

  ['a level patches only the numbers it names, and leaves the loaded files alone', async () => {
    const { map, rules } = await loadAll();
    const before = JSON.stringify(rules);
    const level = { id: 't', label: 'T', rules: { mission: { minimumOut: 5 } }, enemies: { types: { sentry: { visionRadius: 9 } } } };
    const out = applyDifficulty(level, rules, map);
    equal(out.rules.mission.minimumOut, 5, 'patched');
    equal(out.rules.turnLimit, rules.turnLimit, 'the rest kept');
    equal(out.map.enemyTypes.sentry.visionRadius, 9, 'enemy patched');
    equal(out.map.enemyTypes.sentry.detection, map.enemyTypes.sentry.detection, 'enemy rest kept');
    equal(out.map.enemyTypes.patrol.visionRadius, map.enemyTypes.patrol.visionRadius, 'other types kept');
    equal(JSON.stringify(rules), before, 'rules.json as loaded is untouched');
    equal(out.map.terrain, map.terrain, 'the board is the same board');
  }],

  ['a mistyped key or a missing default fails loudly', async () => {
    const { map, rules } = await loadAll();
    const enemies = { types: map.enemyTypes };
    const bad = (json) => {
      try { validateDifficulty(json, rules, enemies); } catch { return true; }
      return false;
    };
    assert(bad({ default: 'a', levels: [{ id: 'a', label: 'A', rules: { mission: { minimumout: 2 } } }] }), 'unknown rules key');
    assert(bad({ default: 'a', levels: [{ id: 'a', label: 'A', enemies: { types: { tank: { visionRadius: 2 } } } }] }), 'unknown enemy type');
    assert(bad({ default: 'b', levels: [{ id: 'a', label: 'A' }] }), 'default not a level');
    assert(bad({ default: 'a', levels: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B' }] }), 'duplicate id');
    assert(!bad({ default: 'a', levels: [{ id: 'a', label: 'A', rules: { diversion: { uses: 2 } } }] }), 'a good one passes');
  }],

  ['?difficulty= picks a level; anything else is the default', async () => {
    const { json } = await loadAll();
    equal(difficultyFromQuery('?seed=4&difficulty=easy', json), 'easy', 'named');
    equal(difficultyFromQuery('?difficulty=impossible', json), null, 'not a level');
    equal(difficultyFromQuery('', json), null, 'none');
    equal(levelById(json, null).id, json.default, 'falls back to the default');
  }],

  ['the shipped levels: easy is kinder than normal, hard is harsher', async () => {
    const { map, rules, json } = await loadAll();
    const at = (id) => applyDifficulty(levelById(json, id), rules, map);
    const easy = at('easy');
    const hard = at('hard');
    assert(easy.rules.objectives.bridge.chargesNeeded < rules.objectives.bridge.chargesNeeded, 'easy bridge takes fewer charges');
    assert(easy.rules.mission.minimumOut < rules.mission.minimumOut, 'easy needs fewer out');
    assert(easy.rules.diversion.uses > rules.diversion.uses, 'easy has more diversions');
    assert(easy.rules.command.radius > rules.command.radius, 'easy orders reach further');
    assert(hard.rules.mission.minimumOut > rules.mission.minimumOut, 'hard needs more out');
    for (const [type, t] of Object.entries(hard.map.enemyTypes)) {
      assert(t.visionRadius > map.enemyTypes[type].visionRadius, `hard ${type} sees further`);
    }
  }],

  ['a patched level starts a whole mission: enemies carry its vision, the diversion its uses', async () => {
    const { map, rules, json, traits, roster } = await loadAll();
    const hard = applyDifficulty(levelById(json, 'hard'), rules, map);
    const state = createInitialState(roster, traits, hard.rules, hard.map, 1);
    for (const e of state.enemies) equal(e.visionRadius, hard.map.enemyTypes[e.type].visionRadius, `${e.id} vision`);

    const easy = applyDifficulty(levelById(json, 'easy'), rules, map);
    let s = { ...landedState(roster, traits, easy.rules, easy.map, 1), phase: 'play' };
    for (let i = 0; i < easy.rules.diversion.uses; i++) {
      assert(checkDiversion(s, easy.rules).ok, `call ${i + 1} allowed`);
      s = callDiversion(s, easy.rules);
    }
    assert(!checkDiversion(s, easy.rules).ok, 'no call past the level’s uses');
  }],
];
