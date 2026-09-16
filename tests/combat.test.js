// M5a: contact and combat (SPEC.md §4 Actions, §5 Wounds, §6 Noise and
// Contact and enemy fire, §12).
//
// Runs against the real data files. Scenarios put an enemy and a trooper on
// open field in memory, so they do not depend on where map.json puts anyone.

import {
  detectionAt, hearingRadius, listeners, runDetection, runEnemyPhase, walkRoute,
} from '../src/enemy.js';
import { DIRECTION_NAMES, facingToward, hexDistance } from '../src/hex.js';
import { isInPlay, loadJson, loadMap, terrainIdAt } from '../src/map.js';
import {
  createInitialState, deselect, endTurn, hideUnit, moveUnit, pickUpCharge, setTargeting,
  stabiliseUnit, suppressEnemy, throwStone,
} from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import {
  checkStabilise, checkSuppress, checkThrowStone, fillActionPoints, occupiedHexes, planMove, unitById,
} from '../src/units.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadAll() {
  const [map, rules, traitsJson, roster] = await Promise.all([
    loadMap(),
    loadJson('data/rules.json'),
    loadJson('data/traits.json'),
    loadJson('data/roster.json'),
  ]);
  const traits = validateTraits(traitsJson);
  return { map, rules, traits, roster, state: createInitialState(roster, traits, rules, map) };
}

const facing = (name) => DIRECTION_NAMES.indexOf(name);

function enemy(q, r, facingName, extra = {}) {
  return {
    id: `test-${q},${r}`, label: `Test ${q},${r}`, type: 'patrol', typeLabel: 'Patrol',
    visionRadius: 3, arcDegrees: 120, detection: 3, speed: 3,
    q, r, facing: facing(facingName), homeFacing: facing(facingName), turned: false,
    route: null, loop: false, waypoint: 0, routeStep: 1,
    investigating: null, holding: null, watching: null, suppressed: false,
    ...extra,
  };
}

/** A hex with `length` field hexes running east from it, on one row. */
function openRow(map, length) {
  for (let r = 0; r < map.height; r++) {
    for (let q = -r; q < map.width; q++) {
      const ok = Array.from({ length }, (_, i) => i)
        .every((i) => isInPlay(map, q + i, r) && terrainIdAt(map, q + i, r) === 'field');
      if (ok) return { q, r };
    }
  }
  throw new Error(`no ${length} field hexes in a row in map.json`);
}

/**
 * One trooper of the given role standing at `at`, every other trooper parked
 * far off the board, and only `enemies` on it.
 */
function scenario(state, role, at, enemies, changes = {}) {
  const unit = state.units.find((u) => u.role === role);
  const units = state.units.map((u, i) => (
    u.id === unit.id ? { ...u, q: at.q, r: at.r, trail: [], ...changes } : { ...u, q: 200 + i, r: 0 }
  ));
  return { state: { ...state, units, enemies }, unitId: unit.id };
}

const unitIn = (state, id) => unitById(state.units, id);

export default [
  ['spotted once is a warning: in contact, alert up, no hit, a noise where he was seen', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E');
    const { state: s, unitId } = scenario(state, 'sapper', { q: row.q + 2, r: row.r }, [e]);
    const result = runDetection(s, map, rules);
    const unit = unitIn(result.state, unitId);
    assert(unit.inContact, 'in contact');
    equal(unit.hits, 0, 'not hit');
    equal(result.state.alert.points, rules.alert.spotted, 'alert +spotted');
    equal(result.state.enemies[0].holding.unitId, unitId, 'the spotter holds him');
    equal(result.state.noises.at(-1).kind, 'spotted', 'noise queued');
  }],

  ['spotted again next turn by a free enemy he is shot: wounded, charge dropped, 1 AP, and he says so', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const at = { q: row.q + 2, r: row.r };
    const { state: s, unitId } = scenario(state, 'sapper', at, [enemy(row.q, row.r, 'E')], { inContact: true });
    const before = unitIn(s, unitId);
    assert(before.charges > 0, 'the sapper carries a charge');
    const result = runDetection(s, map, rules);
    const unit = unitIn(result.state, unitId);
    equal(unit.hits, 1, 'one hit');
    assert(!unit.dead, 'alive');
    equal(unit.charges, 0, 'charge gone');
    equal(result.state.droppedCharges.filter((c) => c.q === at.q && c.r === at.r).length, before.charges, 'charge on his hex');
    const wound = result.events.find((ev) => ev.kind === 'wounded');
    equal(wound.line, before.dialogue.onWounded, 'onWounded line');
    const refilled = fillActionPoints(result.state.units, rules);
    equal(unitIn({ units: refilled }, unitId).apMax, rules.combat.woundedActionPoints, 'wounded pool');
  }],

  ['two enemies firing still make one hit, and the second hit kills and leaves a body', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const at = { q: row.q + 2, r: row.r };
    const enemies = [enemy(row.q, row.r, 'E'), enemy(row.q + 4, row.r, 'W')];
    const { state: s, unitId } = scenario(state, 'gunner', at, enemies, { inContact: true });
    const once = runDetection(s, map, rules);
    equal(unitIn(once.state, unitId).hits, 1, 'one hit from two guns');
    const twice = runDetection({ ...once.state, enemies }, map, rules);
    const unit = unitIn(twice.state, unitId);
    assert(unit.dead, 'dead at hitsToKill');
    equal(twice.state.bodies.length, 1, 'a body');
    equal(`${twice.state.bodies[0].q},${twice.state.bodies[0].r}`, `${at.q},${at.r}`, 'on his hex');
    assert(!occupiedHexes(twice.state.units).has(`${at.q},${at.r}`), 'the dead do not block');
    assert(twice.state.enemies.every((e) => !e.holding), 'nobody holds a dead man');
  }],

  ['breaking contact: out of sight at the next check means no hit and no contact', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const behind = { q: row.q - 2, r: row.r };
    const e = enemy(row.q, row.r, 'E');
    const { state: s, unitId } = scenario(state, 'sapper', behind, [e], { inContact: true });
    const result = runDetection(s, map, rules);
    const unit = unitIn(result.state, unitId);
    equal(unit.hits, 0, 'not hit');
    assert(!unit.inContact, 'contact broken');
  }],

  ['a suppressed enemy spots but does not fire, does not move, and recovers after its enemy phase', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E', { suppressed: true });
    const { state: s, unitId } = scenario(state, 'sapper', { q: row.q + 2, r: row.r }, [e], { inContact: true });
    const detected = runDetection(s, map, rules);
    const unit = unitIn(detected.state, unitId);
    equal(unit.hits, 0, 'not hit');
    assert(unit.inContact, 'still in contact');
    assert(detectionAt(map, rules, [e], 0, unit, unit).spotted, 'still spots');
    const moved = runEnemyPhase(detected.state, map, rules);
    const after = moved.state.enemies[0];
    equal(`${after.q},${after.r},${after.facing}`, `${e.q},${e.r},${e.facing}`, 'did not move or turn');
    assert(!after.suppressed, 'suppression wore off');
  }],

  ['the spotter holds and faces its man instead of walking on', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const route = [{ q: row.q, r: row.r }, { q: row.q - 3, r: row.r }];
    const e = enemy(row.q, row.r, 'SE', { route, loop: false });
    const at = { q: row.q + 1, r: row.r + 1 };
    const { state: s } = scenario(state, 'sapper', at, [{ ...e, facing: facing('SE') }]);
    const detected = runDetection(s, map, rules);
    assert(detected.state.enemies[0].holding, 'holding after detection');
    const moved = runEnemyPhase(detected.state, map, rules).state.enemies[0];
    equal(`${moved.q},${moved.r}`, `${e.q},${e.r}`, 'stayed put');
    equal(moved.facing, facingToward(e, at), 'faces him');
    assert(moved.watching, 'watching him through the player phase');
  }],

  ['hide: ends his turn, helps only on the hex he stops on, and moving ends it', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E');
    const at = { q: row.q + 3, r: row.r }; // open field at the edge of vision: spotted in the open
    const { state: s, unitId } = scenario(state, 'sapper', at, [e]);
    assert(detectionAt(map, rules, [e], 0, unitIn(s, unitId), at).spotted, 'spotted standing');
    const hidden = hideUnit(s, unitId, rules);
    const unit = unitIn(hidden, unitId);
    assert(unit.hidden, 'hidden');
    equal(unit.ap, 0, 'turn over');
    const here = detectionAt(map, rules, [e], 0, unit, at);
    equal(here.hidden, rules.actions.hide.concealment, 'hide term in the sum');
    assert(!here.spotted, 'not spotted hidden');
    const elsewhere = detectionAt(map, rules, [e], 0, unit, { q: row.q + 2, r: row.r });
    equal(elsewhere.hidden, 0, 'no hide term on another hex');
    equal(runDetection(hidden, map, rules).events.filter((ev) => ev.kind === 'spotted').length, 0, 'unseen at the check');
    equal(unitIn(endTurn(hidden, rules, map), unitId).hidden, true, 'still hidden next turn');
    const next = endTurn(hidden, rules, map);
    const mover = unitIn(next, unitId);
    const target = { q: mover.q + 1, r: mover.r };
    const plan = planMove(map, next.units, mover, target, rules, []);
    assert(plan && plan.affordable, 'can step');
    assert(!unitIn(moveUnit(next, unitId, plan), unitId).hidden, 'moving ends it');
  }],

  ['suppress: gunners only, in spot radius with a clear line; gunfire raises the alert through onFire', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const near = enemy(row.q + 2, row.r, 'W');
    const far = enemy(row.q + 4, row.r, 'W');
    const gunnerRole = Object.keys(rules.roles).find((id) => rules.roles[id].suppress);
    const otherRole = Object.keys(rules.roles).find((id) => !rules.roles[id].suppress);
    const { state: s, unitId } = scenario(state, gunnerRole, row, [near, far]);
    const gunner = unitIn(s, unitId);
    assert(checkSuppress(map, gunner, near, rules).ok, 'can suppress in range');
    assert(!checkSuppress(map, gunner, far, rules).ok, 'cannot out of range');
    const { state: s2, unitId: otherId } = scenario(state, otherRole, row, [near]);
    assert(!checkSuppress(map, unitIn(s2, otherId), near, rules).ok, `a ${otherRole} cannot suppress`);

    const fired = suppressEnemy(s, unitId, near.id, map, rules);
    assert(fired.enemies.find((e) => e.id === near.id).suppressed, 'suppressed');
    equal(unitIn(fired, unitId).ap, gunner.ap - rules.actions.suppress.apCost, 'AP spent');
    const expected = gunner.traits.some((t) => t.hook === 'onFire')
      ? rules.alert.gunfire + gunner.traits.find((t) => t.hook === 'onFire').modifier.value
      : rules.alert.gunfire;
    equal(fired.alert.points, expected, 'alert from gunfire, through the hook');
    equal(fired.noises.at(-1).kind, 'gunfire', 'gunfire is heard');
  }],

  ['Cool Head raises less alert than the other gunner', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const target = enemy(row.q + 2, row.r, 'W');
    const gunners = state.units.filter((u) => rules.roles[u.role].suppress);
    const points = gunners.map((g) => {
      const units = state.units.map((u, i) => (u.id === g.id ? { ...u, q: row.q, r: row.r } : { ...u, q: 200 + i, r: 0 }));
      return suppressEnemy({ ...state, units, enemies: [target] }, g.id, target.id, map, rules).alert.points;
    });
    assert(points[0] !== points[1], `gunfire alert differs between gunners: ${points}`);
  }],

  ['a thrown stone: patrols in earshot go to look, a sentry turns for one turn, the rest walk on', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 7);
    const stone = { q: row.q + 3, r: row.r };
    const radius = hearingRadius('stone', 0, rules);
    const nearPatrol = enemy(row.q + 3 - radius, row.r, 'W');
    const sentry = enemy(row.q + 3 + 1, row.r, 'E', { id: 'sentry', type: 'sentry', speed: 0 });
    const farRoute = [{ q: row.q, r: row.r + 6 }, { q: row.q + 3, r: row.r + 6 }];
    const farPatrol = enemy(row.q, row.r + 6, 'E', { id: 'far', route: farRoute, loop: false });
    const { state: s, unitId } = scenario(state, 'scout', { q: row.q + 1, r: row.r + 2 }, [nearPatrol, sentry, farPatrol]);
    assert(checkThrowStone(map, unitIn(s, unitId), stone, rules).ok, 'in range');
    assert(!checkThrowStone(map, unitIn(s, unitId), { q: row.q + 1 + rules.actions.throwStone.range + 1, r: row.r + 2 }, rules).ok, 'out of range');

    const thrown = throwStone(s, unitId, stone, map, rules);
    equal(thrown.alert.points, rules.alert.stone, 'alert +stone');
    const heardBy = listeners(thrown.enemies, 'stone', stone, thrown.alert.points, rules).map((e) => e.id);
    assert(heardBy.includes(nearPatrol.id) && heardBy.includes('sentry') && !heardBy.includes('far'), `listeners ${heardBy}`);

    const phase = runEnemyPhase(thrown, map, rules);
    const near = phase.state.enemies.find((e) => e.id === nearPatrol.id);
    assert(hexDistance(near, stone) < hexDistance(nearPatrol, stone), 'near patrol walked toward the stone');
    const turned = phase.state.enemies.find((e) => e.id === 'sentry');
    equal(turned.facing, facingToward(sentry, stone), 'sentry faces the stone');
    const far = phase.state.enemies.find((e) => e.id === 'far');
    const planned = walkRoute(map, farPatrol, new Set(), rules);
    equal(`${far.q},${far.r}`, `${planned.q},${planned.r}`, 'far patrol kept to its route');
    equal(`${phase.state.contact.q},${phase.state.contact.r}`, `${stone.q},${stone.r}`, 'the stone is the last known contact');

    const later = runEnemyPhase({ ...phase.state, noises: [] }, map, rules);
    equal(later.state.enemies.find((e) => e.id === 'sentry').facing, sentry.homeFacing, 'sentry back to its post facing');
  }],

  ['hearing carries further at Alert', async () => {
    const { rules } = await loadAll();
    const calm = hearingRadius('stone', 0, rules);
    const alert = hearingRadius('stone', rules.alert.states[2].from, rules);
    equal(alert - calm, rules.alert.states[2].hearingBonus, 'hearing bonus');
    assert(alert > calm, 'further');
  }],

  ['a repeat noise on a hex already being searched sends nobody new and is reported once', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 7);
    const hex = { q: row.q + 3, r: row.r };
    const going = enemy(row.q, row.r, 'E', { investigating: hex });
    const idle = enemy(row.q + 6, row.r, 'W', { id: 'idle' });
    const s = { ...state, units: state.units.map((u, i) => ({ ...u, q: 200 + i, r: 0 })), enemies: [going, idle],
      noises: [{ kind: 'stone', ...hex }] };
    const phase = runEnemyPhase(s, map, rules);
    equal(phase.events.filter((e) => e.kind === 'heard').length, 0, 'no new heard report');
    equal(phase.state.enemies.find((e) => e.id === 'idle').investigating, null, 'nobody new set off');
  }],

  ['two patrols sent to one noise: the first to arrive reports the search, the second does not, even a turn later', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 7);
    const hex = { q: row.q + 3, r: row.r };
    const close = enemy(row.q + 2, row.r, 'E', { id: 'close', investigating: hex });
    const far = enemy(row.q - 3, row.r, 'E', { id: 'far', speed: 1, investigating: hex });
    const s = { ...state, units: state.units.map((u, i) => ({ ...u, q: 200 + i, r: 0 })), enemies: [close, far] };
    let phase = runEnemyPhase(s, map, rules);
    let reports = phase.events.filter((e) => e.kind === 'searched').length;
    for (let turn = 0; turn < 8; turn++) {
      phase = runEnemyPhase({ ...phase.state, noises: [] }, map, rules);
      reports += phase.events.filter((e) => e.kind === 'searched').length;
    }
    equal(reports, 1, 'searched reported once');
  }],

  ['a body is found by an enemy that ends beside it: alert up, a noise, and only once', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const body = { unitId: 'x', name: 'X', q: row.q + 1, r: row.r, found: false };
    const post = enemy(row.q, row.r, 'E', { speed: 0, type: 'sentry' });
    const s = { ...state, units: state.units.map((u, i) => ({ ...u, q: 200 + i, r: 0 })), enemies: [post], bodies: [body] };
    const first = runEnemyPhase(s, map, rules);
    assert(first.state.bodies[0].found, 'found');
    equal(first.state.alert.points, rules.alert.bodyFound, 'alert +bodyFound');
    equal(first.state.noises.at(-1).kind, 'found', 'noise queued');
    const second = runEnemyPhase(first.state, map, rules);
    equal(second.events.filter((e) => e.kind === 'bodyFound').length, 0, 'not found twice');
  }],

  ['stabilise takes a full turn beside him, gives his pool and carrying back, but not the hit', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 3);
    const [a, b] = state.units.filter((u) => u.role !== 'scout');
    const units = state.units.map((u, i) => {
      if (u.id === a.id) return { ...u, q: row.q, r: row.r };
      if (u.id === b.id) return { ...u, q: row.q + 1, r: row.r, hits: 1, charges: 0 };
      return { ...u, q: 200 + i, r: 0 };
    });
    const s = { ...state, units: fillActionPoints(units, rules), enemies: [] };
    equal(unitIn(s, b.id).apMax, rules.combat.woundedActionPoints, 'wounded pool');
    const helper = unitIn(s, a.id);
    assert(checkStabilise(helper, unitIn(s, b.id)).ok, 'can stabilise at full AP');
    assert(!checkStabilise({ ...helper, ap: helper.ap - 1 }, unitIn(s, b.id)).ok, 'not after spending AP');
    const done = stabiliseUnit(s, a.id, b.id);
    equal(unitIn(done, a.id).ap, 0, 'whole turn spent');
    const next = endTurn(done, rules, map);
    const patient = unitIn(next, b.id);
    equal(patient.hits, 1, 'still one hit from death');
    equal(patient.apMax, patient.apBase + patient.commandBonus, 'full pool back');
  }],

  ['pick up a dropped charge: 1 AP, not while wounded, not past capacity', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 2);
    const sapper = state.units.find((u) => u.role === 'sapper');
    const place = (changes) => ({
      ...state,
      enemies: [],
      droppedCharges: [{ q: row.q, r: row.r }],
      units: state.units.map((u, i) => (u.id === sapper.id ? { ...u, q: row.q, r: row.r, ...changes } : { ...u, q: 200 + i, r: 0 })),
    });
    const empty = place({ charges: 0 });
    const picked = pickUpCharge(empty, sapper.id, rules);
    equal(unitIn(picked, sapper.id).charges, 1, 'picked up');
    equal(picked.droppedCharges.length, 0, 'gone from the ground');
    equal(unitIn(picked, sapper.id).ap, sapper.ap - rules.actions.pickUpCharge.apCost, 'AP spent');
    equal(pickUpCharge(place({ charges: sapper.charges }), sapper.id, rules).droppedCharges.length, 1, 'full: stays on the ground');
    equal(pickUpCharge(place({ charges: 0, hits: 1 }), sapper.id, rules).droppedCharges.length, 1, 'wounded: stays on the ground');
  }],

  ['Esc backs out of targeting before it drops the selection', async () => {
    const { state } = await loadAll();
    const selected = { ...state, selectedUnitId: state.units[0].id };
    const aiming = setTargeting(selected, 'stone');
    const once = deselect(aiming);
    equal(once.targeting, null, 'targeting cancelled');
    equal(once.selectedUnitId, state.units[0].id, 'still selected');
    equal(deselect(once).selectedUnitId, null, 'then deselected');
  }],
];
