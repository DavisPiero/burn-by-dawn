// What the board points at (M46): the enemies a man could strike, the men to
// get clear of a blast, the way out, and where the alert's points came from.
// Each must agree with the check the action or the turn will make.

import { alertOrigins, getClear, opportunities, wayOut } from '../src/cues.js';
import { facingToward } from '../src/hex.js';
import { loadJson, loadMap } from '../src/map.js';
import { blastEffect, blastHexesThisTurn, kindOf } from '../src/sabotage.js';
import { validateTraits } from '../src/traits.js';
import { checkKill, checkKnife, checkSuppress } from '../src/units.js';
import { landedState } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadAll() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(), loadJson('data/rules.json'), loadJson('data/traits.json'), loadJson('data/roster.json'),
  ]);
  return { map, rules, state: { ...landedState(roster, validateTraits(traitsJson), rules, map), phase: 'play' } };
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

export default [
  ['an enemy is marked only with what the man could do to it now, the quietest first', async () => {
    const { map, rules, state } = await loadAll();
    for (const unit of state.units) {
      // Beside him with its back turned, and another two hexes off under suppression.
      const behind = { q: unit.q + 1, r: unit.r };
      const back = enemy(behind.q, behind.r, (facingToward(behind, unit) + 3) % 6);
      const down = enemy(unit.q - 2, unit.r, 0, { suppressed: true });
      const s = { ...state, enemies: [back, down] };
      const marks = opportunities(map, rules, s, unit);
      for (const e of s.enemies) {
        const expected = checkKnife(unit, e, rules).ok ? 'knife'
          : checkKill(map, unit, e, rules).ok ? 'kill'
            : checkSuppress(map, unit, e, rules).ok ? 'fire' : undefined;
        assert(marks.get(e.id) === expected, `${unit.shortName} on ${e.id}: marked ${marks.get(e.id)}, the checks say ${expected}`);
      }
      assert(marks.get(back.id) === 'knife', `${unit.shortName}: a knife for the one with its back to him`);
      assert(opportunities(map, rules, s, { ...unit, ap: 0 }).size === 0, `${unit.shortName}: nothing with no AP left`);
      assert(opportunities(map, rules, { ...s, outcome: { kind: 'failed' } }, unit).size === 0, 'nothing once the mission is over');
    }
    const gunner = state.units.find((u) => rules.roles[u.role].kill);
    const marks = opportunities(map, rules, { ...state, enemies: [enemy(gunner.q - 2, gunner.r, 0, { suppressed: true })] }, gunner);
    assert([...marks.values()].every((m) => m === 'kill') || marks.size === 0, `a gunner's kill on a suppressed enemy he can see: ${[...marks.values()]}`);
  }],

  ['a man in a blast that goes off this turn is told, with the nearest clear hex he can reach', async () => {
    const { map, rules, state } = await loadAll();
    const bridge = state.objectives.find((o) => o.primary);
    const point = bridge.chargeHexes[0];
    const man = state.units[0];
    const units = state.units.map((u) => (u.id === man.id ? { ...u, q: point.q, r: point.r } : u));
    const burning = (fuse) => ({ ...state, units, charges: [{ objectiveId: bridge.id, q: point.q, r: point.r, fuse, unitId: man.id }] });
    assert(getClear(map, rules, burning(2)).length === 0, 'nobody while it burns past this turn');
    const now = burning(1);
    const caught = getClear(map, rules, now);
    assert(caught.length === 1 && caught[0].unitId === man.id && caught[0].effect === 'killed', `the man on the charge: ${JSON.stringify(caught)}`);
    const blasts = blastHexesThisTurn(now, rules);
    assert(caught[0].to && !blastEffect(blasts, caught[0].to), `sent to clear ground: ${JSON.stringify(caught[0].to)}`);
    const spent = { ...now, units: units.map((u) => (u.id === man.id ? { ...u, ap: 0 } : u)) };
    assert(getClear(map, rules, spent)[0].to === null, 'nowhere to send a man with no AP');
    assert(kindOf(bridge, rules).killRadius >= 1, 'the fixture stands him in the kill radius');
  }],

  ['GET OUT once the job is done, and a clock only for a man who cannot make the exfil', async () => {
    const { map, rules, state } = await loadAll();
    assert(!wayOut(map, rules, state).go && !wayOut(map, rules, state).closing, 'not on turn 1 with the bridge standing');
    const done = { ...state, objectives: state.objectives.map((o) => (o.primary ? { ...o, destroyed: true } : o)) };
    assert(wayOut(map, rules, done).go, 'the bridge down: go');
    assert(!wayOut(map, rules, { ...done, outcome: { kind: 'success' } }).go, 'not once it is over');
    const last = { ...done, turn: rules.turnLimit };
    const [eq, er] = map.exfil[0];
    const near = last.units.map((u, i) => (i === 0 ? { ...u, q: eq, r: er - 1 } : u));
    const out = wayOut(map, rules, { ...last, units: near });
    assert(out.closing, 'the last turn is closing');
    assert(!out.late.has(near[0].id), 'the man beside the exfil can make it');
    assert(near.slice(1).every((u) => out.late.has(u.id)), 'the men across the board cannot');
    assert(wayOut(map, rules, { ...done, turn: rules.turnLimit - 5 }).late.size === 0, 'no clocks before the last turns');
  }],

  ['the alert\'s new points are traced to the hexes that raised them', async () => {
    const { state } = await loadAll();
    const raised = (points) => ({ ...state.alert, points });
    assert(alertOrigins(state, state).length === 0, 'none when nothing rose');
    const stone = { ...state, alert: raised(1), noises: [...state.noises, { kind: 'stone', q: 4, r: 4 }] };
    assert(JSON.stringify(alertOrigins(state, stone)) === JSON.stringify([{ q: 4, r: 4 }]), 'a stone, from where it landed');
    const turn = { ...state, alert: raised(2), noises: [{ kind: 'found', q: 6, r: 2 }], report: [
      { kind: 'spotted', q: 3, r: 3, unitName: 'X', enemyIds: [] }, { kind: 'parachuteFound', q: 6, r: 2, name: 'X' }, { kind: 'alertRise', from: 'Calm', to: 'Suspicious' },
    ] };
    assert(alertOrigins(state, turn).length === 2, `a sighting and a find, each hex once: ${JSON.stringify(alertOrigins(state, turn))}`);
    const cut = { ...state, alert: raised(1) };
    assert(JSON.stringify(alertOrigins(state, cut, { q: 1, r: 1 })) === JSON.stringify([{ q: 1, r: 1 }]), 'a cut line, from the man who cut it');
    assert(alertOrigins(stone, { ...stone, alert: raised(0) }).length === 0, 'none when it eased');
  }],
];
