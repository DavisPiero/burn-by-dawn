// M7: speech bubbles (SPEC.md §5 Dialogue, §11). The lines are data in
// roster.json; state.speech says who is saying what, and the board only draws it.

import { loadJson, loadMap } from '../src/map.js';
import { chooseDropRun, createInitialState, endTurn, holdUnit, jump, moveUnit, placeCharge } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { onBoard, planMove, unitById } from '../src/units.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadAll() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(), loadJson('data/rules.json'), loadJson('data/traits.json'), loadJson('data/roster.json'),
  ]);
  return { map, rules, traits: validateTraits(traitsJson), roster };
}

const lineOf = (state, unitId) => state.speech.find((s) => s.unitId === unitId)?.line ?? null;

export default [
  ['nobody speaks before the drop; everyone who lands says his landing line', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const start = createInitialState(roster, traits, rules, map, 42);
    equal(start.speech.length, 0, 'silent in the aircraft');
    const landed = jump(chooseDropRun(start, map, 'north'), map, rules);
    for (const unit of landed.units.filter(onBoard)) {
      const wet = landed.report.some((e) => e.kind === 'landed' && e.unitId === unit.id && e.outcome === 'wounds');
      equal(lineOf(landed, unit.id), wet ? unit.dialogue.onWounded : unit.dialogue.onLand, `${unit.shortName}'s line`);
    }
    equal(new Set(landed.speech.map((s) => s.unitId)).size, landed.speech.length, 'one line per man');
  }],

  ['a man stops talking when he spends AP, and everyone at the turn boundary', async () => {
    const { map, rules, traits, roster } = await loadAll();
    let s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 7), map, 'north'), map, rules);
    const mover = s.units.find((u) => onBoard(u) && u.ap > 0 && lineOf(s, u.id));
    assert(mover, 'someone can move');
    const others = s.speech.length;
    const target = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
      .map(([dq, dr]) => ({ q: mover.q + dq, r: mover.r + dr }))
      .map((h) => planMove(map, s.units, mover, h, rules, s.enemies))
      .find((p) => p && p.affordable);
    assert(target, 'a step he can afford');
    s = moveUnit(s, mover.id, target, map);
    equal(lineOf(s, mover.id), null, 'moved: silent');
    equal(s.speech.length, others - 1, 'the others still talking');
    s = holdUnit(s, s.units.find(onBoard).id);
    s = endTurn(s, rules, map);
    assert(s.speech.every((line) => s.report.some((e) => e.kind === 'wounded' && e.unitId === line.unitId)), 'only the newly wounded speak after the turn');
  }],

  ['placing a charge says his onPlaceCharge line', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const base = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 3), map, 'north'), map, rules);
    const primary = base.objectives.find((o) => o.primary);
    const sapper = base.units.find((u) => u.charges > 0);
    const at = primary.chargeHexes[0];
    const units = base.units.map((u, i) => (u.id === sapper.id
      ? { ...u, q: at.q, r: at.r, ap: u.apBase, apMax: u.apBase, turnsLost: 0 }
      : { ...u, q: 200 + i, r: 0 }));
    const placed = placeCharge({ ...base, units, enemies: [] }, sapper.id, rules);
    equal(placed.charges.length, 1, 'charge set');
    equal(lineOf(placed, sapper.id), unitById(placed.units, sapper.id).dialogue.onPlaceCharge, 'his line');
  }],
];
