// M3: the trait hook system and the six (SPEC.md §5, §12).
//
// Runs against the real data files, so "all six traits fire" is checked on
// the roster the game actually loads, not on a copy of it.

import { loadJson, loadMap } from '../src/map.js';
import { createInitialState } from '../src/state.js';
import { applyHook, HOOKS, validateTraits } from '../src/traits.js';
import { hookBase, planMove, traitEffects, unitById } from '../src/units.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function throws(fn, pattern, message) {
  try {
    fn();
  } catch (error) {
    if (pattern.test(error.message)) return;
    throw new Error(`${message}: threw "${error.message}", which does not match ${pattern}`);
  }
  throw new Error(`${message}: did not throw`);
}

const clone = (value) => structuredClone(value);

async function loadAll() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(),
    loadJson('data/rules.json'),
    loadJson('data/traits.json'),
    loadJson('data/roster.json'),
  ]);
  return { map, rules, traitsJson, traits: validateTraits(traitsJson), roster };
}

/** A trooper with the same role and no traits, to compare a traited man against. */
function untraited(unit) {
  return { ...unit, traits: [] };
}

function trait(hook, stat, op, value) {
  return { name: 'Test', description: '', hook, modifier: { stat, op, value } };
}

export default [
  ['real traits.json validates', async () => {
    const { traitsJson } = await loadAll();
    const traits = validateTraits(traitsJson);
    equal(Object.keys(traits).length, 6, 'trait count');
  }],

  ['every trooper in roster.json has a trait that changes one of his numbers', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const state = createInitialState(roster, traits, rules, map);
    for (const unit of state.units) {
      const effects = traitEffects(unit, rules);
      assert(effects.length > 0, `${unit.id} has no traits`);
      for (const effect of effects) {
        assert(effect.base !== null, `${unit.id} ${effect.id}: no base value to fire against`);
        assert(effect.value !== effect.base, `${unit.id} ${effect.id}: ${effect.hook}.${effect.stat} stayed at ${effect.base}`);
        const plain = applyHook(untraited(unit), effect.hook, effect.stat, effect.base).value;
        equal(plain, effect.base, `${unit.id} without traits`);
      }
    }
  }],

  ['the six traits do what SPEC.md §5 says', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const state = createInitialState(roster, traits, rules, map);
    const byTrait = (id) => state.units.find((u) => u.traits.some((t) => t.id === id));
    const fire = (id, hook, stat) => {
      const unit = byTrait(id);
      assert(unit, `nobody carries ${id}`);
      return applyHook(unit, hook, stat, hookBase(unit, hook, stat, rules));
    };

    equal(fire('steady-hands', 'onPlaceCharge', 'fuse').value, rules.charges.fuseTurns - 1, 'Steady Hands fuse');
    equal(fire('quick-work', 'onPlaceCharge', 'apCost').value, 0, 'Quick Work AP cost');
    equal(fire('cats-eyes', 'onSpotRadius', 'spotRadius').value, rules.roles.scout.spotRadius + 1, "Cat's Eyes spot radius");
    equal(fire('treetops', 'onLand', 'landingPenalty').value, 0, 'Treetops landing penalty');
    equal(fire('cool-head', 'onFire', 'alert').value, rules.alert.gunfire - 1, 'Cool Head gunfire alert');
    equal(fire('ox', 'onChargeCapacity', 'charges').value, rules.roles.gunner.charges + 1, 'Ox charges');
  }],

  ['a trait fires only on its own hook and stat', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const state = createInitialState(roster, traits, rules, map);
    const holloway = state.units.find((u) => u.traits.some((t) => t.id === 'steady-hands'));
    equal(applyHook(holloway, 'onPlaceCharge', 'apCost', 1).value, 1, 'Steady Hands leaves AP cost alone');
    equal(applyHook(holloway, 'onFire', 'alert', 2).value, 2, 'Steady Hands leaves gunfire alone');
  }],

  ['Ox is in the loadout: a gunner with Ox starts carrying a charge', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const state = createInitialState(roster, traits, rules, map);
    const ox = state.units.find((u) => u.traits.some((t) => t.id === 'ox'));
    const otherGunner = state.units.find((u) => u.role === ox.role && u.id !== ox.id);
    equal(ox.charges, 1, 'Ox charges carried');
    equal(otherGunner.charges, 0, 'other gunner charges carried');
  }],

  ['a seventh trooper needs data only', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const seventh = {
      id: 'test-seventh',
      name: 'Pte. Test Seventh',
      shortName: 'SEVENTH',
      role: 'scout',
      traits: ['ox'],
      dialogue: { onLand: 'a', onPlaceCharge: 'b', onWounded: 'c' },
    };
    const bigger = clone(roster);
    bigger.troopers.push(seventh);
    // One more start hex: a free, passable, in-play hex next to the last one.
    const taken = new Set(map.startHexes.map(([q, r]) => `${q},${r}`));
    let extra = null;
    for (const [q, r] of map.startHexes) {
      for (const [dq, dr] of [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]]) {
        const probe = { ...map, startHexes: [[q + dq, r + dr]] };
        if (taken.has(`${q + dq},${r + dr}`)) continue;
        try {
          createInitialState({ troopers: [seventh] }, traits, rules, probe);
          extra = [q + dq, r + dr];
          break;
        } catch { /* not a usable hex */ }
      }
      if (extra) break;
    }
    assert(extra, 'no free hex next to the start hexes');

    const state = createInitialState(bigger, traits, rules, { ...map, startHexes: [...map.startHexes, extra] });
    equal(state.units.length, 7, 'unit count');
    const unit = unitById(state.units, 'test-seventh');
    equal(unit.charges, rules.roles.scout.charges + 1, 'his Ox fired');
    equal(unit.apMax >= rules.roles.scout.actionPoints, true, 'he has a scout AP pool');
  }],

  ['a seventh trooper with no start hex fails loudly', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const bigger = clone(roster);
    bigger.troopers.push({ ...clone(roster.troopers[1]), id: 'extra' });
    throws(() => createInitialState(bigger, traits, rules, map), /startHexes/, 'missing start hex');
  }],

  ['onActionPoints modifies the pool, and command stacks on top', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const withTrait = { ...traits, 'test-ap': trait('onActionPoints', 'actionPoints', 'add', 2) };
    const edited = clone(roster);
    const plain = createInitialState(edited, traits, rules, map);
    edited.troopers[1].traits = ['test-ap'];
    const state = createInitialState(edited, withTrait, rules, map);
    const before = unitById(plain.units, edited.troopers[1].id);
    const after = unitById(state.units, edited.troopers[1].id);
    equal(after.apMax, before.apMax + 2, 'AP pool with +2 trait');
    equal(after.commandBonus, before.commandBonus, 'command bonus unchanged');
  }],

  ['onMoveCost reaches pathing', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const withTrait = { ...traits, 'test-slow': trait('onMoveCost', 'moveCost', 'add', 1) };
    const edited = clone(roster);
    const plainState = createInitialState(edited, traits, rules, map);
    edited.troopers[0].traits = ['test-slow'];
    const slowState = createInitialState(edited, withTrait, rules, map);
    const id = edited.troopers[0].id;
    const plainUnit = unitById(plainState.units, id);
    const slowUnit = unitById(slowState.units, id);

    // Any hex a few steps away that both can path to.
    const target = { q: plainUnit.q + 3, r: plainUnit.r };
    const a = planMove(map, plainState.units, plainUnit, target, rules);
    const b = planMove(map, slowState.units, slowUnit, target, rules);
    assert(a && b, `no path to (${target.q}, ${target.r})`);
    assert(b.total > a.total, `slow total ${b.total} should exceed plain ${a.total}`);
  }],

  ['onMoveCost cannot drop a step below 1', () => {
    const unit = { traits: [{ id: 'x', ...trait('onMoveCost', 'moveCost', 'set', 0) }] };
    equal(applyHook(unit, 'onMoveCost', 'moveCost', 2).value, 1, 'floored move cost');
  }],

  ['modifiers apply in listed order', () => {
    const unit = {
      traits: [
        { id: 'a', ...trait('onPlaceCharge', 'fuse', 'set', 5) },
        { id: 'b', ...trait('onPlaceCharge', 'fuse', 'add', -1) },
      ],
    };
    const result = applyHook(unit, 'onPlaceCharge', 'fuse', 3);
    equal(result.value, 4, 'set then add');
    equal(result.applied.join(), 'a,b', 'applied trait ids');
  }],

  ['every hook is callable on every stat it declares', () => {
    for (const [hook, stats] of Object.entries(HOOKS)) {
      for (const stat of Object.keys(stats)) {
        equal(applyHook({ traits: [] }, hook, stat, 2).value, 2, `${hook}.${stat} with no traits`);
      }
    }
  }],

  ['validation: unknown hook', () => {
    throws(() => validateTraits({ traits: { t: trait('onSneeze', 'x', 'add', 1) } }), /hook "onSneeze"/, 'unknown hook');
  }],

  ['validation: stat the hook does not own', () => {
    throws(() => validateTraits({ traits: { t: trait('onFire', 'fuse', 'add', 1) } }), /cannot modify "fuse"/, 'wrong stat');
  }],

  ['validation: op other than add or set', () => {
    throws(() => validateTraits({ traits: { t: trait('onFire', 'alert', 'multiply', 2) } }), /"op"/, 'bad op');
  }],

  ['validation: a usage limit is not a modifier', () => {
    const coolHeadAsFirstWritten = trait('onFire', 'alert', 'set', 0);
    coolHeadAsFirstWritten.modifier.uses = 1;
    throws(() => validateTraits({ traits: { t: coolHeadAsFirstWritten } }), /field "uses"/, 'usage limit');
  }],

  ['validation: a condition on the trait is rejected', () => {
    const conditional = { ...trait('onMoveCost', 'moveCost', 'add', -1), when: { terrain: 'wood' } };
    throws(() => validateTraits({ traits: { t: conditional } }), /field "when"/, 'condition');
  }],

  ['validation: roster naming a trait that does not exist', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const edited = clone(roster);
    edited.troopers[0].traits = ['no-such-trait'];
    throws(() => createInitialState(edited, traits, rules, map), /"no-such-trait"/, 'missing trait');
  }],

  ['validation: roster trooper missing a dialogue line', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const edited = clone(roster);
    delete edited.troopers[2].dialogue.onWounded;
    throws(() => createInitialState(edited, traits, rules, map), /dialogue\.onWounded/, 'missing line');
  }],
];
