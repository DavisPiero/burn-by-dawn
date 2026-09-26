// M5b: charges, fuses, explosions, the explosion floor, the line cut, swimming,
// exfil and the reserve watching it, the RAF diversion, and how a mission ends
// (SPEC.md §4 Actions, §6, §7, §10, §12).
//
// Runs against the real data files. Scenarios move troopers and enemies in
// memory; where a test depends on the map it finds what it needs in map.json
// rather than assuming coordinates.

import { alertIndex, runEnemyPhase } from '../src/enemy.js';
import { hexDistance } from '../src/hex.js';
import { findPath, isPassable, loadJson, loadMap, terrainAt, terrainIdAt } from '../src/map.js';
import {
  callDiversion, checkDiversion, createInitialState, cutLine, endTurn, moveUnit, placeCharge, settleMission,
  swimAcross,
} from '../src/state.js';
import {
  blastHexesThisTurn, checkCutLine, checkPlaceCharge, checkSwim, effectiveMap, primaryShortfall, runFusePhase,
  swimTargets,
} from '../src/sabotage.js';
import { scoreOf } from '../src/scoring.js';
import { validateTraits } from '../src/traits.js';
import { landedState } from './fixtures.js';
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
  const traits = validateTraits(traitsJson);
  return { map, rules, state: landedState(roster, traits, rules, map) };
}

const unitIn = (state, id) => unitById(state.units, id);
const byTrait = (state, traitId) => state.units.find((u) => u.traits.some((t) => t.id === traitId));
const primaryOf = (state) => state.objectives.find((o) => o.primary);
const objectiveIn = (state, id) => state.objectives.find((o) => o.id === id);

/**
 * Only the named troopers on the board, where given; everyone else parked far
 * off it and still alive (so the mission does not end on its own), and no
 * enemies unless given.
 */
function scenario(state, placements, enemies = []) {
  const units = state.units.map((u, i) => {
    const at = placements[u.id];
    return at ? { ...u, q: at.q, r: at.r, trail: [], ...(at.changes ?? {}) } : { ...u, q: 200 + i, r: 0, trail: [] };
  });
  return { ...state, units, enemies };
}

/** End turns with nobody moving until `predicate` holds or `limit` turns pass. */
function endTurnsUntil(state, rules, map, predicate, limit = 10) {
  let s = state;
  for (let i = 0; i < limit && !predicate(s); i++) s = endTurn(s, rules, map);
  return s;
}

export default [
  ['objectives load from map.json: one primary, bridge charge hexes on the west-bank marsh', async () => {
    const { map, rules, state } = await loadAll();
    const primary = primaryOf(state);
    equal(primary.kind, 'bridge', 'the bridge is the primary');
    equal(primary.chargeHexes.length, rules.objectives.bridge.chargesNeeded, 'one hex per charge');
    for (const h of primary.chargeHexes) equal(terrainIdAt(map, h.q, h.r), 'marsh', `(${h.q},${h.r}) terrain`);
    equal(state.charges.length, 0, 'nothing set');
    assert(map.exfil.length > 0, 'exfil hexes');
  }],

  ['place a charge: on a charge hex, carrying one, the hook sets cost and fuse, one per hex', async () => {
    const { rules, state } = await loadAll();
    const dutch = byTrait(state, 'steady-hands');
    const fitch = byTrait(state, 'quick-work');
    const [a, b] = primaryOf(state).chargeHexes;

    const off = scenario(state, { [dutch.id]: { q: a.q + 5, r: a.r } });
    equal(checkPlaceCharge(off, unitIn(off, dutch.id), rules).reason, 'not on a charge hex', 'needs a charge hex');

    const s = scenario(state, { [dutch.id]: a, [fitch.id]: b });
    const dutchCheck = checkPlaceCharge(s, unitIn(s, dutch.id), rules);
    assert(dutchCheck.ok, dutchCheck.reason);
    equal(dutchCheck.fuse, rules.charges.fuseTurns - 1, 'Steady Hands: fuse −1');
    equal(checkPlaceCharge(s, unitIn(s, fitch.id), rules).cost, 0, 'Quick Work: costs nothing');

    const placed = placeCharge(s, dutch.id, rules);
    equal(placed.charges.length, 1, 'a charge set');
    equal(unitIn(placed, dutch.id).charges, 0, 'no longer carried');
    equal(unitIn(placed, dutch.id).ap, unitIn(s, dutch.id).ap - rules.charges.placeApCost, 'AP spent');
    const again = { ...placed, units: placed.units.map((u) => (u.id === dutch.id ? { ...u, charges: 1 } : u)) };
    equal(checkPlaceCharge(again, unitIn(again, dutch.id), rules).reason, 'a charge is already set here', 'one per hex');
  }],

  ['a 3-turn fuse placed on turn N goes off in the fuse phase of turn N+2', async () => {
    const { map, rules, state } = await loadAll();
    const fitch = byTrait(state, 'quick-work');
    const [a] = primaryOf(state).chargeHexes;
    let s = placeCharge(scenario(state, { [fitch.id]: a }), fitch.id, rules);
    s = scenario(s, {}); // walk him off the board so the blast does not matter
    equal(s.charges[0].fuse, rules.charges.fuseTurns, 'default fuse');
    for (let turn = 1; turn < rules.charges.fuseTurns; turn++) {
      s = endTurn(s, rules, map);
      equal(s.charges.length, 1, `still burning after ${turn} fuse phase(s)`);
    }
    s = endTurn(s, rules, map);
    equal(s.charges.length, 0, 'gone off');
    equal(primaryOf(s).detonated, 1, 'counted');
    assert(!primaryOf(s).destroyed, 'the bridge needs two');
    assert(s.report.some((e) => e.kind === 'explosion'), 'reported');
  }],

  ['two bridge charges going off together are one explosion; a turn apart they are two', async () => {
    const { rules, state } = await loadAll();
    const [a, b] = primaryOf(state).chargeHexes;
    const charge = (hex, fuse) => ({ objectiveId: primaryOf(state).id, q: hex.q, r: hex.r, fuse, unitId: null });
    const together = runFusePhase({ ...scenario(state, {}), charges: [charge(a, 1), charge(b, 1)] }, rules);
    equal(together.events.filter((e) => e.kind === 'explosion').length, 1, 'one explosion');
    equal(together.state.alert.points, rules.objectives.bridge.alert, 'alert raised once');
    equal(together.state.explosions, 1, 'one bang');
    assert(primaryOf(together.state).destroyed, 'bridge destroyed');
    equal(together.state.noises.filter((n) => n.kind === 'explosion').length, 1, 'heard once');

    const first = runFusePhase({ ...scenario(state, {}), charges: [charge(a, 1), charge(b, 2)] }, rules);
    assert(!primaryOf(first.state).destroyed, 'one charge is not enough');
    const second = runFusePhase({ ...first.state, noises: [] }, rules);
    assert(primaryOf(second.state).destroyed, 'the second finishes it');
    equal(second.state.explosions, 2, 'two bangs');
    equal(second.state.alert.points, 2 * rules.objectives.bridge.alert, 'alert raised twice');
  }],

  ['a blast kills anyone in its radius: a trooper leaves a body, a killable enemy leaves none, the reserve is spared', async () => {
    const { rules, state } = await loadAll();
    const dump = state.objectives.find((o) => o.kind === 'fuelDump');
    const hex = dump.chargeHexes[0];
    const radius = rules.objectives.fuelDump.blastRadius;
    const [inside, outside] = state.units;
    const s = {
      ...scenario(state, { [inside.id]: { q: hex.q, r: hex.r + radius }, [outside.id]: { q: hex.q, r: hex.r + radius + 1 } }),
      charges: [{ objectiveId: dump.id, q: hex.q, r: hex.r, fuse: 1, unitId: null }],
      enemies: [
        { id: 'near', label: 'Patrol', killable: true, q: hex.q + 1, r: hex.r, facing: 0 },
        { id: 'reserve', label: 'Reserve squad', killable: false, q: hex.q, r: hex.r + 1, facing: 0 },
        { id: 'far', label: 'Sentry', killable: true, q: hex.q + radius + 1, r: hex.r, facing: 0 },
      ],
    };
    equal(blastHexesThisTurn(s, rules).length, 1, 'the readout knows it goes off this turn');
    const result = runFusePhase(s, rules);
    assert(unitIn(result.state, inside.id).dead, 'inside the radius dies');
    assert(!unitIn(result.state, outside.id).dead, 'outside lives');
    equal(result.state.bodies.length, 1, 'one body: the trooper\'s, none for the enemy');
    equal(result.state.enemies.map((e) => e.id).sort().join(), 'far,reserve', 'the patrol in the blast dies; the reserve and the sentry outside live');
    equal(result.events.filter((e) => e.kind === 'enemyBlastKilled').length, 1, 'reported once');
    assert(objectiveIn(result.state, dump.id).destroyed, 'dump destroyed');
    equal(result.state.alert.points, rules.objectives.fuelDump.alert, 'fuel dump alert');
  }],

  ['a destroyed bridge is canal: nobody walks over it, patrols turn back, and only then can a man swim', async () => {
    const { map, rules, state } = await loadAll();
    const primary = primaryOf(state);
    const deck = primary.hexes;
    const west = { q: deck[0].q - 1, r: deck[0].r };
    const east = { q: deck[deck.length - 1].q + 1, r: deck[0].r };
    assert(findPath(map, west, east, null), 'the bridge is walkable while it stands');

    const vance = state.units.find((u) => u.role === 'scout');
    const bank = primary.chargeHexes[0];
    const intact = scenario(state, { [vance.id]: bank });
    assert(!checkSwim(map, intact, unitIn(intact, vance.id), null, rules).ok, 'no swimming while the bridge stands');

    const blown = { ...intact, objectives: state.objectives.map((o) => (o.primary ? { ...o, destroyed: true } : o)) };
    const live = effectiveMap(map, blown.objectives, rules);
    equal(effectiveMap(map, blown.objectives, rules), live, 'same objectives, same map');
    for (const h of deck) equal(terrainIdAt(live, h.q, h.r), rules.actions.swim.across, 'deck is water');
    assert(!findPath(live, west, east, null), 'no path over');

    const targets = swimTargets(live, blown, unitIn(blown, vance.id), rules);
    assert(targets.length > 0, `somewhere to swim to from (${bank.q},${bank.r})`);
    const target = targets[0];
    assert(hexDistance(target, bank) === 2 && isPassable(terrainAt(live, target.q, target.r)), 'the far bank');
    assert(checkSwim(live, blown, unitIn(blown, vance.id), target, rules).ok, 'can swim now');
    const swum = swimAcross(blown, vance.id, target, live, rules);
    equal(`${unitIn(swum, vance.id).q},${unitIn(swum, vance.id).r}`, `${target.q},${target.r}`, 'across');
    equal(unitIn(swum, vance.id).ap, 0, 'a full turn');
    const wounded = { ...blown, units: blown.units.map((u) => (u.id === vance.id ? { ...u, hits: 1, ap: 1, apMax: 1 } : u)) };
    assert(!checkSwim(live, wounded, unitIn(wounded, vance.id), target, rules).ok, 'wounded cannot swim');

    const patrol = state.enemies.find((e) => e.route && e.route.some((w) => w.q > deck[0].q) && e.route.some((w) => w.q < deck[0].q));
    assert(patrol, 'a patrol crosses the bridge');
    let s = { ...blown, enemies: [{ ...patrol, q: west.q, r: west.r }] };
    const seen = new Set();
    for (let i = 0; i < 8; i++) {
      s = { ...runEnemyPhase(s, live, rules).state, turn: s.turn + 1 };
      const e = s.enemies[0];
      seen.add(`${e.q},${e.r}`);
      assert(e.q <= deck[0].q, `patrol stayed on its side, at (${e.q},${e.r})`);
    }
    assert(seen.size > 1, 'and kept walking');
  }],

  ['after an explosion the alert never decays below the floor state', async () => {
    const { map, rules, state } = await loadAll();
    const floor = rules.alert.states.findIndex((st) => st.id === rules.explosionFloor);
    const high = rules.alert.states[floor + 1].from;
    let s = { ...scenario(state, { [state.units[0].id]: { q: 200, r: 5 } }), alert: { ...state.alert, points: high }, explosions: 1 };
    s = endTurnsUntil(s, rules, map, () => false, rules.alert.quietTurnsToDecay * 3);
    equal(alertIndex(s.alert.points, rules), floor, 'stopped at the floor');
    let never = { ...s, explosions: 0 };
    never = endTurnsUntil(never, rules, map, () => false, rules.alert.quietTurnsToDecay * 2);
    equal(never.alert.points, 0, 'without an explosion it would settle');
  }],

  ['cutting the line: a scout, a full turn, destroyed at once with no alert and no noise', async () => {
    const { rules, state } = await loadAll();
    const exchange = state.objectives.find((o) => rules.objectives[o.kind].cutLine);
    const scout = state.units.find((u) => rules.roles[u.role].cutLine);
    const sapper = state.units.find((u) => u.role === 'sapper');
    const s = scenario(state, { [scout.id]: exchange.chargeHexes[0], [sapper.id]: exchange.chargeHexes[1] });
    assert(!checkCutLine(s, unitIn(s, sapper.id), rules).ok, 'a sapper cannot');
    const tired = { ...s, units: s.units.map((u) => (u.id === scout.id ? { ...u, ap: u.ap - 1 } : u)) };
    assert(!checkCutLine(tired, unitIn(tired, scout.id), rules).ok, 'not after spending AP');
    const cut = cutLine(s, scout.id, rules);
    const after = objectiveIn(cut, exchange.id);
    assert(after.destroyed && after.cut, 'destroyed by a cut');
    equal(cut.alert.points, 0, 'no alert');
    equal(cut.noises.length, 0, 'no noise');
    equal(cut.explosions, 0, 'not an explosion');
    equal(unitIn(cut, scout.id).ap, 0, 'his whole turn');
  }],

  ['ending a move on an exfil hex takes him off the board, untested', async () => {
    const { map, rules, state } = await loadAll();
    const [eq, er] = map.exfil[0];
    const unit = state.units[0];
    const next = state.units[1];
    const s = scenario(state, { [unit.id]: { q: eq, r: er - 1 }, [next.id]: { q: 0, r: 0 } });
    const plan = planMove(map, s.units, unitIn(s, unit.id), { q: eq, r: er }, rules, s.enemies);
    assert(plan && plan.affordable, 'can step onto exfil');
    const moved = moveUnit(s, unit.id, plan, map);
    const out = unitIn(moved, unit.id);
    assert(out.out && !onBoard(out), 'out');
    equal(out.trail.length, 0, 'nothing left to test');
    equal(settleMission(moved, rules, map).outcome, null, 'others still in the field, mission goes on');
  }],

  ['at Alarmed the reserve marches to its guard hex and stands facing the exfil, not hunting', async () => {
    const { map, rules, state } = await loadAll();
    const alarmed = rules.alert.states[rules.alert.states.length - 1].from;
    let s = { ...scenario(state, {}), alert: { ...state.alert, points: alarmed }, contact: { q: 0, r: 0, searched: false } };
    for (let i = 0; i < 12; i++) s = { ...runEnemyPhase(s, map, rules).state, turn: s.turn + 1 };
    const reserve = s.enemies.find((e) => e.id === map.reserve.id);
    assert(reserve, 'deployed');
    equal(`${reserve.q},${reserve.r}`, `${map.reserve.guardHex[0]},${map.reserve.guardHex[1]}`, 'at its guard hex');
    equal(reserve.facing, reserve.homeFacing, 'facing its guard facing');
  }],

  ['the RAF diversion: once, only while the leader lives, drops a state, clears contact, forfeits the clean score', async () => {
    const { map, rules, state } = await loadAll();
    const alert = rules.alert.states[2].from;
    const leader = state.units.find((u) => u.leader);
    const other = state.units.find((u) => !u.leader);
    const s = {
      ...state,
      alert: { ...state.alert, points: alert, peak: alert },
      contact: { q: 1, r: 1, searched: false },
      noises: [{ kind: 'stone', q: 1, r: 1 }],
      enemies: state.enemies.map((e, i) => (i === 0 ? { ...e, investigating: { q: 1, r: 1 } } : e)),
      units: state.units.map((u) => (u.id === other.id ? { ...u, inContact: true } : u)),
    };
    const before = scoreOf(s, rules, s.turn).total;
    const called = callDiversion(s, rules);
    equal(alertIndex(called.alert.points, rules), 1, 'down one state');
    equal(called.alert.points, rules.alert.states[1].from, 'to its start');
    equal(called.contact, null, 'contact dropped');
    equal(called.noises.length, 0, 'unheard noises dropped');
    assert(called.enemies.every((e) => !e.investigating && !e.holding), 'searches dropped');
    assert(!unitIn(called, other.id).inContact, 'out of contact');
    equal(called.diversionsCalled, 1, 'counted');
    assert(!checkDiversion(called, rules).ok, 'once');
    const twice = { ...rules, diversion: { ...rules.diversion, uses: 2 } };
    assert(checkDiversion(called, twice).ok, 'a second call when the level allows two');
    assert(!checkDiversion(callDiversion(called, twice), twice).ok, 'and no third');
    equal(scoreOf(called, rules, s.turn).total, before - rules.scoring.clean, 'clean bonus gone');

    const floored = callDiversion({ ...s, explosions: 1, alert: { ...s.alert, points: rules.alert.states[1].from } }, rules);
    equal(floored.alert.points, rules.alert.states[1].from, 'never below the explosion floor');

    const noLeader = { ...s, units: s.units.map((u) => (u.id === leader.id ? { ...u, dead: true } : u)) };
    assert(!checkDiversion(noLeader, rules).ok, 'the radio died with the leader');
    void map;
  }],

  ['outcomes: everyone dead fails; too few left or too few charges withdraws the rest; dawn without the bridge fails', async () => {
    const { map, rules, state } = await loadAll();
    const dead = { ...state, units: state.units.map((u) => ({ ...u, dead: true })) };
    equal(settleMission(dead, rules, map).outcome.kind, 'failed', 'all dead');

    const few = { ...state, units: state.units.map((u, i) => (i < 4 ? { ...u, dead: true } : u)) };
    const withdrawn = settleMission(few, rules, map).outcome;
    equal(withdrawn.kind, 'withdrawn', 'fewer than minimum alive');
    equal(withdrawn.fates.filter((f) => f.fate === 'out').length, 2, 'the two left get out');

    const noCharges = { ...state, units: state.units.map((u) => ({ ...u, charges: 0 })) };
    assert(primaryShortfall(noCharges, rules) > 0, 'short');
    equal(settleMission(noCharges, rules, map).outcome.kind, 'withdrawn', 'too few charges');

    let dawn = { ...state, turn: rules.turnLimit };
    dawn = endTurn(dawn, rules, map);
    equal(dawn.outcome.kind, 'failed', 'dawn with the bridge standing');
    equal(dawn.turn, rules.turnLimit, 'the clock stops at dawn');
    assert(dawn.outcome.fates.some((f) => f.fate === 'left behind'), 'men left behind');
    equal(endTurn(dawn, rules, map), dawn, 'nothing happens after the end');
  }],

  ['the last men out with the bridge charges burning: the fuses play out, then success', async () => {
    const { map, rules, state } = await loadAll();
    const primary = primaryOf(state);
    const s = {
      ...state,
      units: state.units.map((u, i) => (i < 3 ? { ...u, out: true, charges: 0 } : { ...u, dead: true })),
      charges: primary.chargeHexes.map((h) => ({ objectiveId: primary.id, q: h.q, r: h.r, fuse: 2, unitId: null })),
      turn: 10,
    };
    const settled = settleMission(s, rules, map);
    equal(settled.outcome.kind, 'success', settled.outcome.reason);
    equal(settled.charges.length, 0, 'every fuse played out');
    equal(settled.outcome.turn, 12, 'two turns of fuses');
    const lines = settled.outcome.score.lines.map((l) => l.label).join('; ');
    equal(settled.outcome.score.total, rules.scoring.primary + 3 * rules.scoring.perTrooperOut
      + Math.floor((rules.turnLimit - 12) / rules.scoring.turnsPerPoint) + rules.scoring.clean, `score (${lines})`);
  }],
];
