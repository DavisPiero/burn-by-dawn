// What the board shows of seeing and being seen (M45): the danger wash, who
// is fired on, and whether hiding saves a man. Each must agree with the sums
// the detection check does, or the board would promise what the turn breaks.

import { detectionAt } from '../src/enemy.js';
import { DIRECTION_NAMES, facingToward } from '../src/hex.js';
import { hexKey, loadJson, loadMap } from '../src/map.js';
import { dangerWash, firedOn, hideSaves } from '../src/sight.js';
import { validateTraits } from '../src/traits.js';
import { planMove, reachableFor } from '../src/units.js';
import { landedState } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadAll() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(), loadJson('data/rules.json'), loadJson('data/traits.json'), loadJson('data/roster.json'),
  ]);
  const traits = validateTraits(traitsJson);
  return { map, rules, state: landedState(roster, traits, rules, map) };
}

function enemy(q, r, facing, extra = {}) {
  return {
    id: `test-${q},${r}`, label: `Test ${q},${r}`, type: 'patrol', typeLabel: 'Patrol',
    visionRadius: 3, arcDegrees: 120, detection: 3, speed: 3,
    q, r, facing, homeFacing: facing, turned: false,
    route: null, loop: false, waypoint: 0, routeStep: 1,
    suppressed: false, killable: true, watching: null,
    ...extra,
  };
}

/** One enemy two hexes from the man, looking straight at him. */
function watched(state, unit, extra = {}) {
  const at = { q: unit.q + 2, r: unit.r };
  return { ...state, enemies: [enemy(at.q, at.r, facingToward(at, unit), extra)] };
}

export default [
  ['the wash is the detection check\'s own answer for the path the game would take', async () => {
    const { map, rules, state } = await loadAll();
    for (const unit of state.units) {
      const s = watched(state, unit);
      const reachable = reachableFor(map, s.units, unit, rules, s.enemies);
      const wash = dangerWash(map, rules, s, unit, reachable);
      for (const hex of reachable.values()) {
        if (hex.cost === 0) {
          assert(!wash.has(hexKey(hex.q, hex.r)), `${unit.shortName}: his own hex is left out`);
          continue;
        }
        const plan = planMove(map, s.units, unit, hex, rules, s.enemies);
        const seen = plan.path.slice(1).some((step) => detectionAt(map, rules, s.enemies, s.alert.points, { ...unit, hidden: false }, step)?.spotted);
        assert((wash.get(hexKey(hex.q, hex.r)) === 'spotted') === seen, `${unit.shortName} to ${hex.q},${hex.r}: wash ${wash.get(hexKey(hex.q, hex.r))}, check ${seen}`);
      }
    }
    const anyRed = state.units.some((unit) => {
      const s = watched(state, unit);
      return [...dangerWash(map, rules, s, unit, reachableFor(map, s.units, unit, rules, s.enemies)).values()].includes('spotted');
    });
    assert(anyRed, 'an enemy two hexes off, looking at him, reddens something for someone');
  }],

  ['with nobody to see him the wash is blue, and green for a man in contact', async () => {
    const { map, rules, state } = await loadAll();
    const quiet = { ...state, enemies: [] };
    const unit = quiet.units[0];
    const reachable = reachableFor(map, quiet.units, unit, rules, []);
    assert([...dangerWash(map, rules, quiet, unit, reachable).values()].every((k) => k === null), 'nothing to say');
    const seen = { ...unit, inContact: true };
    const contact = { ...quiet, units: quiet.units.map((u) => (u.id === unit.id ? seen : u)) };
    assert([...dangerWash(map, rules, contact, seen, reachable).values()].every((k) => k === 'clear'), 'every hex breaks contact');
  }],

  ['a man in contact is marked as fired on only while a free enemy would spot him again', async () => {
    const { map, rules, state } = await loadAll();
    // The first man an enemy two hexes off would spot where he stands.
    const unit = state.units.find((u) => detectionAt(map, rules, watched(state, u).enemies, 0, u, u)?.spotted);
    assert(unit, 'someone landed where he can be seen');
    const inContact = (s) => ({ ...s, units: s.units.map((u) => (u.id === unit.id ? { ...u, inContact: true } : u)) });
    assert(firedOn(map, rules, watched(state, unit)).size === 0, 'not before he is in contact');
    assert(firedOn(map, rules, inContact(watched(state, unit))).has(unit.id), 'in contact and still in view');
    assert(!firedOn(map, rules, inContact(watched(state, unit, { suppressed: true }))).has(unit.id), 'not with its head down');
    const away = (DIRECTION_NAMES.length + facingToward({ q: unit.q + 2, r: unit.r }, unit) + 3) % DIRECTION_NAMES.length;
    const turned = inContact({ ...state, enemies: [enemy(unit.q + 2, unit.r, away)] });
    assert(!firedOn(map, rules, turned).has(unit.id), 'not once it looks the other way');
  }],

  ['Hide is urged only where it turns spotted into unseen', async () => {
    const { map, rules, state } = await loadAll();
    assert(state.units.every((u) => !hideSaves(map, rules, { ...state, enemies: [] }, u)), 'never with nobody looking');
    for (const unit of state.units) {
      const s = watched(state, unit);
      const at = (man) => detectionAt(map, rules, s.enemies, s.alert.points, man, unit);
      const expected = Boolean(at({ ...unit, hidden: false })?.spotted) && !at({ ...unit, hidden: true })?.spotted;
      assert(hideSaves(map, rules, s, unit) === expected, `${unit.shortName}: urged ${!expected}, the check says ${expected}`);
      assert(!hideSaves(map, rules, s, { ...unit, hidden: true }), `${unit.shortName}: not once he is hidden`);
    }
  }],
];
