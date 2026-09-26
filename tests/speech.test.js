// M7: speech bubbles (SPEC.md §5 Dialogue, §11). The lines are data in
// roster.json; state.speech says who last said what this turn, and the board
// only draws it.

import { loadJson, loadMap } from '../src/map.js';
import {
  chooseDropRun, createInitialState, endTurn, holdUnit, jump, moveUnit, placeCharge, silenceUnits,
} from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { onBoard, planMove, unitById, woundedLine } from '../src/units.js';

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
      const carrying = start.units.find((u) => u.id === unit.id).charges > 0;
      const woundedLine = (carrying && unit.dialogue.onWoundedCarrying) || unit.dialogue.onWounded;
      equal(lineOf(landed, unit.id), wet ? woundedLine : unit.dialogue.onLand, `${unit.shortName}'s line`);
    }
    equal(new Set(landed.speech.map((s) => s.unitId)).size, landed.speech.length, 'one line per man');
  }],

  ['his line goes when he moves off the hex, the others keep theirs, and lines are replaced at the turn boundary (M14)', async () => {
    const { map, rules, traits, roster } = await loadAll();
    let s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 7), map, 'north'), map, rules);
    const mover = s.units.find((u) => onBoard(u) && u.ap > 0 && lineOf(s, u.id));
    assert(mover, 'someone can move');
    const others = s.speech.filter((l) => l.unitId !== mover.id).length;
    assert(others > 0, 'someone else has a line');
    const target = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
      .map(([dq, dr]) => ({ q: mover.q + dq, r: mover.r + dr }))
      .map((h) => planMove(map, s.units, mover, h, rules, s.enemies))
      .find((p) => p && p.affordable);
    assert(target, 'a step he can afford');
    s = moveUnit(s, mover.id, target, map);
    equal(lineOf(s, mover.id), null, 'moved off his hex: his line goes');
    equal(s.speech.length, others, 'the others keep theirs');
    s = holdUnit(s, s.units.find(onBoard).id);
    s = endTurn(s, rules, map);
    assert(s.speech.every((line) => s.report.some((e) => e.kind === 'wounded' && e.unitId === line.unitId)), 'only the newly wounded speak after the turn');
  }],

  ['a heard line goes and is not said again; the others keep theirs', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const s = jump(chooseDropRun(createInitialState(roster, traits, rules, map, 7), map, 'north'), map, rules);
    const [first, second] = s.speech;
    assert(first && second, 'two men speaking');
    const heard = silenceUnits(s, [first.unitId]);
    equal(lineOf(heard, first.unitId), null, 'heard: gone');
    equal(lineOf(heard, second.unitId), second.line, 'not heard: kept');
    equal(silenceUnits(heard, [first.unitId]), heard, 'silencing a silent man changes nothing');
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

  ['a man hit still carrying a charge says his carrying line if he has one; without a charge, his plain wounded line', async () => {
    const { map, rules, traits, roster } = await loadAll();
    const start = createInitialState(roster, traits, rules, map, 1);
    const carriers = start.units.filter((u) => u.dialogue.onWoundedCarrying);
    assert(carriers.length > 0, 'the roster has carrying lines');
    for (const u of carriers) {
      assert(u.charges > 0, `${u.shortName} starts with a charge to talk about`);
      equal(woundedLine(u), u.dialogue.onWoundedCarrying, `${u.shortName} carrying`);
      equal(woundedLine({ ...u, charges: 0 }), u.dialogue.onWounded, `${u.shortName} with his charge gone`);
    }
    const plain = start.units.find((u) => !u.dialogue.onWoundedCarrying);
    equal(woundedLine({ ...plain, charges: 1 }), plain.dialogue.onWounded, 'no carrying line: the plain one, charge or not');
  }],
];
