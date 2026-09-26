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
  callDiversion, checkDiversion, createInitialState, cutLine, endTurn, exfilWouldFail, moveUnit, passCharge, placeCharge, settleMission,
  swimAcross,
} from '../src/state.js';
import {
  blastHexesThisTurn, checkCutLine, checkPlaceCharge, checkSwim, effectiveMap, primaryShortfall, runFusePhase,
  swimTargets,
} from '../src/sabotage.js';
import { scoreOf } from '../src/scoring.js';
import { validateTraits } from '../src/traits.js';
import { landedState } from './fixtures.js';
import { checkPassCharge, onBoard, planMove, unitById } from '../src/units.js';

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

  ['a destroyed bridge is canal: nobody walks over it, and patrols turn back; swimming is gated only if the rules say so', async () => {
    const { map, rules, state } = await loadAll();
    const primary = primaryOf(state);
    const deck = primary.hexes;
    const west = { q: deck[0].q - 1, r: deck[0].r };
    const east = { q: deck[deck.length - 1].q + 1, r: deck[0].r };
    assert(findPath(map, west, east, null), 'the bridge is walkable while it stands');

    const vance = state.units.find((u) => u.role === 'scout');
    const bank = primary.chargeHexes[0];
    const intact = scenario(state, { [vance.id]: bank });
    // M11b: with no objective named, a man may swim with the bridge standing;
    // naming one gates it, as it was before.
    assert(checkSwim(map, intact, unitIn(intact, vance.id), null, rules).ok === (rules.actions.swim.requiresDestroyed === null), 'swim gate as rules.json says');
    const gated = { ...rules, actions: { ...rules.actions, swim: { ...rules.actions.swim, requiresDestroyed: primary.kind } } };
    assert(!checkSwim(map, intact, unitIn(intact, vance.id), null, gated).ok, 'no swimming while the bridge stands when gated on it');

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

  ['bonus payoffs (M11b): the exchange, cut or blown, keeps the reserve away; the fuel dump draws the nearest patrol off', async () => {
    const { map, rules, state } = await loadAll();
    const exchange = state.objectives.find((o) => rules.objectives[o.kind].payoff.noReserve);
    const scout = state.units.find((u) => rules.roles[u.role].cutLine);
    const cut = cutLine(scenario(state, { [scout.id]: exchange.chargeHexes[0] }), scout.id, rules);
    assert(cut.reserveCancelled, 'reserve cancelled by the cut');
    assert(cut.report.some((e) => e.kind === 'noReserve'), 'said in the report at once');
    const alarmed = rules.alert.states[rules.alert.states.length - 1].from;
    const after = runEnemyPhase({ ...cut, alert: { ...cut.alert, points: alarmed } }, map, rules).state;
    assert(!after.enemies.some((e) => e.id === map.reserve.id), 'no reserve at Alarmed');

    const dump = state.objectives.find((o) => rules.objectives[o.kind].payoff.withdrawPatrols > 0);
    const hex = dump.chargeHexes[0];
    const far = rules.objectives[dump.kind].blastRadius + 2;
    const s = {
      ...scenario(state, {}),
      charges: [{ objectiveId: dump.id, q: hex.q, r: hex.r, fuse: 1, unitId: null }],
      enemies: [
        { id: 'near', label: 'Near patrol', killable: true, speed: 3, q: hex.q + far, r: hex.r, facing: 0 },
        { id: 'further', label: 'Far patrol', killable: true, speed: 3, q: hex.q + far + 3, r: hex.r, facing: 0 },
        { id: 'post', label: 'Sentry', killable: true, speed: 0, q: hex.q, r: hex.r + far, facing: 0 },
        { id: 'reserve', label: 'Reserve squad', killable: false, speed: 4, q: hex.q, r: hex.r - far, facing: 0 },
      ],
    };
    const blown = runFusePhase(s, rules);
    equal(blown.state.enemies.map((e) => e.id).sort().join(), 'further,post,reserve', 'the nearest patrol leaves; sentries and the reserve stay');
    equal(blown.events.filter((e) => e.kind === 'withdrawn').length, rules.objectives[dump.kind].payoff.withdrawPatrols, 'reported');
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
    // M13b: his charge stays behind, on the hex he stepped off from.
    const carried = unitIn(s, unit.id).charges;
    assert(carried > 0, 'he was carrying one');
    equal(out.charges, 0, 'he takes none out');
    equal(moved.droppedCharges.filter((c) => c.q === eq && c.r === er - 1).length, carried, 'left where he stepped off');
  }],

  ['an exfil that would lose the mission is caught before it is made; one that leaves a carrier behind is not (M14)', async () => {
    const { map, rules, state } = await loadAll();
    const [eq, er] = map.exfil[0];
    const leaving = state.units.find((u) => u.charges > 0);
    const scout = state.units.find((u) => u.role === 'scout');
    const sapper = state.units.find((u) => u.charges > 0 && u.id !== leaving.id);
    // Everyone else is already out, so only the charges can end it.
    const setUp = (stays) => scenario(state, Object.fromEntries(state.units.map((u) => [u.id,
      u.id === leaving.id ? { q: eq, r: er - 1 } : u.id === stays.id ? { q: 0, r: 0 } : { q: eq, r: er, changes: { out: true, charges: 0 } }])));
    const plan = (s) => planMove(map, s.units, unitIn(s, leaving.id), { q: eq, r: er }, rules, s.enemies);

    const withScout = setUp(scout);
    const failure = exfilWouldFail(withScout, leaving.id, plan(withScout), rules, map);
    equal(failure?.kind, 'withdrawn', 'only a scout left, who cannot carry the charge he leaves');
    assert(failure.reason.includes('charges'), `says why: ${failure.reason}`);

    const withSapper = setUp(sapper);
    equal(exfilWouldFail(withSapper, leaving.id, plan(withSapper), rules, map), null, 'a sapper stays to pick it up');
    const notOut = { path: [{ q: eq, r: er - 1 }, { q: eq + 1, r: er - 1 }] };
    equal(exfilWouldFail(withScout, leaving.id, notOut, rules, map), null, 'not onto the exfil: never asked');
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

  ['passing a charge: to a man beside him who can carry it, for the giver\'s AP only (M11b)', async () => {
    const { rules, state } = await loadAll();
    const [a, b] = state.units.filter((u) => u.role === 'sapper');
    const scout = state.units.find((u) => u.role === 'scout');
    const cost = rules.actions.passCharge.apCost;
    // b has set his charge already, so he has room for one.
    let s = scenario(state, { [a.id]: { q: 3, r: 3 }, [b.id]: { q: 4, r: 3, changes: { charges: 0 } }, [scout.id]: { q: 3, r: 4 } });
    const giver = unitIn(s, a.id);
    assert(checkPassCharge(giver, unitIn(s, b.id), rules).ok, 'to a sapper beside him');
    assert(!checkPassCharge(giver, unitIn(s, scout.id), rules).ok, 'a scout carries no charges');
    s = passCharge(s, a.id, b.id, rules);
    equal(unitIn(s, a.id).charges, giver.charges - 1, 'one fewer');
    equal(unitIn(s, b.id).charges, 1, 'one more');
    equal(unitIn(s, a.id).ap, giver.ap - cost, 'the giver pays');
    equal(unitIn(s, b.id).ap, unitIn(state, b.id).ap, 'the taker does not');
    assert(!checkPassCharge(unitIn(s, a.id), unitIn(s, b.id), rules).ok, 'nothing left to pass');
    const apart = scenario(state, { [a.id]: { q: 3, r: 3 }, [b.id]: { q: 6, r: 3, changes: { charges: 0 } } });
    assert(!checkPassCharge(unitIn(apart, a.id), unitIn(apart, b.id), rules).ok, 'not beside him');
    const wounded = scenario(state, { [a.id]: { q: 3, r: 3 }, [b.id]: { q: 4, r: 3, changes: { charges: 0, hits: 1 } } });
    assert(!checkPassCharge(unitIn(wounded, a.id), unitIn(wounded, b.id), rules).ok, 'not to a wounded man');
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
    const before = scoreOf(s, rules).total;
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
    equal(scoreOf(called, rules).total, before - rules.scoring.clean, 'clean bonus gone');

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

    // M13: charges on the ground with nobody left who could carry one.
    const carriers = (u) => u.role === 'sapper' || u.charges > 0;
    const dropped = state.units.filter(carriers).map((u) => ({ q: u.q, r: u.r }));
    const stranded = {
      ...state,
      units: state.units.map((u) => (carriers(u) ? { ...u, dead: true, charges: 0 } : u)),
      droppedCharges: dropped,
    };
    assert(primaryShortfall(stranded, rules) > 0, 'charges nobody can carry do not count');
    equal(settleMission(stranded, rules, map).outcome.kind, 'withdrawn', 'withdrawn at once');
    const oneLeft = { ...stranded, units: stranded.units.map((u) => (u.role === 'sapper' && u.leader ? { ...u, dead: false } : u)) };
    equal(primaryShortfall(oneLeft, rules), 0, 'with a sapper alive they count again');

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
    // Three out and never seen: each pays twice (M11b), and no turns-left points.
    equal(settled.outcome.score.total, rules.scoring.primary + 3 * rules.scoring.perTrooperOut
      + 3 * rules.scoring.perTrooperUnseen + rules.scoring.clean, `score (${lines})`);
    const seen = settleMission({ ...s, units: s.units.map((u) => (u.out ? { ...u, everSpotted: true } : u)) }, rules, map);
    equal(seen.outcome.score.total, settled.outcome.score.total - 3 * rules.scoring.perTrooperUnseen, 'seen men pay once');
  }],
];
