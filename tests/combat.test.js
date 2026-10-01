// M5a: contact and combat (SPEC.md §4 Actions, §5 Wounds, §6 Noise and
// Contact and enemy fire, §12).
//
// Runs against the real data files. Scenarios put an enemy and a trooper on
// open field in memory, so they do not depend on where map.json puts anyone.

import {
  busyFor, detectionAt, fireRivals, hearingRadius, listeners, runDetection, runEnemyPhase, walkRoute,
} from '../src/enemy.js';
import { DIRECTION_NAMES, facingToward, hexDistance } from '../src/hex.js';
import { isInPlay, loadJson, loadMap, terrainIdAt } from '../src/map.js';
import {
  createInitialState, deselect, endTurn, hideUnit, moveUnit, pickUpCharge, setTargeting,
  killEnemy, knifeEnemy, stabiliseUnit, suppressEnemy, throwStone,
} from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { landedState } from './fixtures.js';
import {
  chargeCapacity, chargeRoom, checkKill, checkKnife, checkStabilise, checkSuppress, checkThrowStone, fillActionPoints, occupiedHexes, planMove, unitById, woundedLine,
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
  return { map, rules, traits, roster, state: landedState(roster, traits, rules, map) };
}

const facing = (name) => DIRECTION_NAMES.indexOf(name);

function enemy(q, r, facingName, extra = {}) {
  return {
    id: `test-${q},${r}`, label: `Test ${q},${r}`, type: 'patrol', typeLabel: 'Patrol',
    visionRadius: 3, arcDegrees: 120, detection: 3, speed: 3,
    q, r, facing: facing(facingName), homeFacing: facing(facingName), turned: false,
    route: null, loop: false, waypoint: 0, routeStep: 1,
    investigating: null, holding: null, watching: null, suppressed: false, openToKill: false, killable: true,
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

/** The alert one shot from this gunner raises, through his onFire trait if he has one. */
function gunfireOf(unit, rules, base = rules.alert.gunfire) {
  const trait = unit.traits.find((t) => t.hook === 'onFire');
  return Math.max(0, base + (trait ? trait.modifier.value : 0));
}

/** Both gunners on one field row, `gap` apart, and only `enemies` on the board. */
function twoGunners(state, row, enemies) {
  const gunners = state.units.filter((u) => u.role === 'gunner');
  const units = state.units.map((u, i) => {
    const g = gunners.indexOf(u);
    return g >= 0 ? { ...u, q: row.q + g, r: row.r, trail: [] } : { ...u, q: 200 + i, r: 0 };
  });
  return { state: { ...state, units, enemies }, ids: gunners.map((g) => g.id) };
}

export default [
  ['spotted once is a warning: in contact, alert up, no hit, contact where he was seen, no noise', async () => {
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
    equal(`${result.state.contact.q},${result.state.contact.r}`, `${row.q + 2},${row.r}`, 'last known contact');
    equal(result.state.noises.length, 0, 'a sighting is not a noise');
    // Who saw him, for the "!" on its counter in the garrison's turn (M15).
    equal(result.events.find((ev) => ev.kind === 'spotted').enemyIds.join(), e.id, 'names its spotter');
  }],

  ['a man already in contact is not counted again when he is seen again', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E'); // sees him again, and fires: the shot raises nothing either
    const { state: s, unitId } = scenario(state, 'sapper', { q: row.q + 2, r: row.r }, [e], { inContact: true });
    const result = runDetection(s, map, rules);
    equal(result.state.alert.points, 0, 'no alert rise');
    assert(result.state.alert.raisedThisTurn, 'but not a quiet turn');
    assert(unitIn(result.state, unitId).inContact, 'still in contact');
    equal(result.state.contact, s.contact, 'contact not moved');
  }],

  ['shot in cover he is pinned, not hit: one AP less next turn, never below 1', async () => {
    const { map, rules, state } = await loadAll();
    // Blocking sight hides only what lies beyond a hex, never the hex itself,
    // so an adjacent enemy sees into any cover (M20: hedgerows block it too).
    const coverId = Object.keys(map.terrain).find((id) => rules.combat.shotResult[map.terrain[id].cover] === 'pinned'
      && map.terrain[id].moveCost !== null);
    // An enemy two hexes west of a cover hex, looking east, on in-play ground.
    let spot = null;
    for (let r = 0; r < map.height && !spot; r++) {
      for (let q = -r; q < map.width && !spot; q++) {
        if (isInPlay(map, q, r) && terrainIdAt(map, q, r) === coverId && isInPlay(map, q - 2, r)
          && terrainIdAt(map, q - 1, r) === 'field' && terrainIdAt(map, q - 2, r) === 'field') spot = { q, r };
      }
    }
    assert(spot, `no ${coverId} hex with open field to its west`);
    const e = enemy(spot.q - 1, spot.r, 'E'); // adjacent, so cover still gets him spotted
    const { state: s, unitId } = scenario(state, 'sapper', spot, [e], { inContact: true });
    const before = unitIn(s, unitId);
    const result = runDetection(s, map, rules);
    const unit = unitIn(result.state, unitId);
    assert(result.events.some((ev) => ev.kind === 'pinned'), 'pinned event');
    equal(unit.hits, 0, 'not hit');
    equal(unit.charges, before.charges, 'kept his charge');
    const pool = unitIn({ units: fillActionPoints(result.state.units, rules) }, unitId);
    const plain = unitIn({ units: fillActionPoints(result.state.units.map((u) => ({ ...u, pinned: false })), rules) }, unitId);
    equal(pool.apMax, Math.max(1, plain.apMax - rules.combat.pinnedApLoss), 'smaller pool');
    const wounded = unitIn({ units: fillActionPoints(result.state.units.map((u) => ({ ...u, hits: 1 })), rules) }, unitId);
    equal(wounded.apMax, 1, 'a pinned wounded man keeps 1 AP');
    const again = runDetection({ ...result.state, enemies: [e] }, map, rules);
    assert(!unitIn(again.state, unitId).pinned || again.events.some((ev) => ev.kind === 'pinned'), 'pinned lasts one pool');
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
    equal(wound.line, before.dialogue.onWoundedCarrying ?? before.dialogue.onWounded, 'carrying a charge: his carrying line if he has one');
    const refilled = fillActionPoints(result.state.units, rules);
    equal(unitIn({ units: refilled }, unitId).apMax, rules.combat.woundedActionPoints, 'wounded pool');
  }],

  ['an enemy fires at one man a turn: the one it has in its sights, else the nearest; the other is seen, not shot (M26d)', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E');
    const near = { q: row.q + 1, r: row.r }, far = { q: row.q + 3, r: row.r };
    const [a, b] = state.units.filter((u) => u.role === 'sapper');
    const place = (enemies, at) => ({
      ...state, enemies,
      units: state.units.map((u, i) => (at[u.id] ? { ...u, ...at[u.id], trail: [], inContact: true } : { ...u, q: 200 + i, r: 0 })),
    });

    // Nobody in its sights: the nearest is shot.
    const plain = runDetection(place([e], { [a.id]: near, [b.id]: far }), map, rules);
    equal(unitIn(plain.state, a.id).hits, 1, 'the nearer man is hit');
    equal(unitIn(plain.state, b.id).hits, 0, 'the further man is not');
    assert(unitIn(plain.state, b.id).inContact, 'but he is still seen');
    equal(plain.state.enemies[0].holding.unitId, a.id, 'it holds the man it fired at');

    // It has the further man in its sights: he draws its fire, the nearer man is spared.
    const watched = runDetection(place([{ ...e, watching: { unitId: b.id, ...far } }], { [a.id]: near, [b.id]: far }), map, rules);
    equal(unitIn(watched.state, b.id).hits, 1, 'the man in its sights is hit');
    equal(unitIn(watched.state, a.id).hits, 0, 'the other is not');

    // The readout agrees: for the spared man, the enemy is busy.
    const s = place([{ ...e, watching: { unitId: b.id, ...far } }], { [a.id]: near, [b.id]: far });
    const busy = busyFor(fireRivals(map, rules, s), s, unitIn(s, a.id));
    const seen = detectionAt(map, rules, s.enemies, s.alert.points, unitIn(s, a.id), near, busy);
    assert(seen.spotted && !seen.firing, 'spotted, and not fired on');

    // Two enemies, one man each.
    const e2 = enemy(row.q + 4, row.r, 'W');
    const both = runDetection(place([e, e2], { [a.id]: near, [b.id]: far }), map, rules);
    equal(unitIn(both.state, a.id).hits + unitIn(both.state, b.id).hits, 2, 'each enemy hits the man nearest it');
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

  ['a suppressed enemy neither spots nor fires (M15), does not move, and recovers after its enemy phase', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E', { suppressed: true });
    const { state: s, unitId } = scenario(state, 'sapper', { q: row.q + 2, r: row.r }, [e], { inContact: true });
    const detected = runDetection(s, map, rules);
    const unit = unitIn(detected.state, unitId);
    equal(unit.hits, 0, 'not hit');
    assert(!unit.inContact, 'out of contact: nobody sees him');
    equal(detectionAt(map, rules, [e], 0, unit, unit), null, 'head down: sees nothing');
    const fresh = scenario(state, 'sapper', { q: row.q + 2, r: row.r }, [e]);
    equal(runDetection(fresh.state, map, rules).state.alert.points, 0, 'a man walking past it is not spotted');
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

  ['a thrown stone: patrols in earshot go to look, a sentry turns at once until the enemy phase (M13b), the rest walk on', async () => {
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

    equal(thrown.enemies.find((e) => e.id === 'sentry').facing, facingToward(sentry, stone), 'the sentry faces the stone at once');
    equal(thrown.enemies.find((e) => e.id === nearPatrol.id).facing, nearPatrol.facing, 'a patrol does not turn yet');
    const phase = runEnemyPhase(thrown, map, rules);
    const near = phase.state.enemies.find((e) => e.id === nearPatrol.id);
    assert(hexDistance(near, stone) < hexDistance(nearPatrol, stone), 'near patrol walked toward the stone');
    equal(phase.state.enemies.find((e) => e.id === 'sentry').facing, sentry.homeFacing, 'the sentry is back at its post after the enemy phase');
    const far = phase.state.enemies.find((e) => e.id === 'far');
    const planned = walkRoute(map, farPatrol, new Set(), rules);
    equal(`${far.q},${far.r}`, `${planned.q},${planned.r}`, 'far patrol kept to its route');
    equal(`${phase.state.contact.q},${phase.state.contact.r}`, `${stone.q},${stone.r}`, 'the stone is the last known contact');

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

  ['a body is found by an enemy on or beside it, standing or walking past: alert up, a noise, and only once', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 6);
    const body = { unitId: 'x', name: 'X', q: row.q + 2, r: row.r, found: false };
    const parked = state.units.map((u, i) => ({ ...u, q: 200 + i, r: 0 }));

    const post = enemy(row.q + 1, row.r, 'E', { speed: 0, type: 'sentry' });
    const beside = runEnemyPhase({ ...state, units: parked, enemies: [post], bodies: [body] }, map, rules);
    assert(beside.state.bodies[0].found, 'a sentry beside it finds it');
    const away = enemy(row.q - 2, row.r, 'E', { speed: 0, type: 'sentry' });
    const far = runEnemyPhase({ ...state, units: parked, enemies: [away], bodies: [body] }, map, rules);
    assert(!far.state.bodies[0].found, 'two hexes off, nobody finds it');

    // A patrol that walks past it along the row and ends two hexes beyond it.
    const lying = { ...body, q: row.q + 1, r: row.r + 1 };
    const route = [{ q: row.q, r: row.r }, { q: row.q + 5, r: row.r }];
    const patrol = enemy(row.q, row.r, 'E', { route, waypoint: 1 });
    const s = { ...state, units: parked, enemies: [patrol], bodies: [lying] };
    const first = runEnemyPhase(s, map, rules);
    assert(hexDistance(first.state.enemies[0], lying) > 1, 'the patrol ended past it');
    assert(first.state.bodies[0].found, 'found on the way past');
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

  ['any man can carry one charge he picks up, whatever his loadout (M37: a gunner at charges left by the exfil)', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 2);
    const bare = state.units.filter((u) => chargeCapacity(u, rules) === 0);
    assert(bare.length >= 3, 'France: the scouts and one gunner jump with none');
    for (const man of bare) {
      equal(man.charges, 0, `${man.shortName} jumps with none`);
      equal(chargeRoom(man, rules), rules.charges.carryAtLeast, `${man.shortName} has room for one`);
      const on = {
        ...state, enemies: [], droppedCharges: [{ q: row.q, r: row.r }, { q: row.q, r: row.r }],
        units: state.units.map((u, i) => (u.id === man.id ? { ...u, q: row.q, r: row.r } : { ...u, q: 200 + i, r: 0 })),
      };
      const picked = pickUpCharge(on, man.id, rules);
      equal(unitIn(picked, man.id).charges, 1, `${man.shortName} picks one up`);
      equal(pickUpCharge(picked, man.id, rules).droppedCharges.length, 1, 'and no more than one');
      const none = { ...rules, charges: { ...rules.charges, carryAtLeast: 0 } };
      equal(pickUpCharge(on, man.id, none).droppedCharges.length, 2, 'carryAtLeast 0: he carries none, as before');
    }
  }],

  ['kill: only a gunner, only an enemy under suppression; two gunners can do it in one turn, and it leaves a body', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const target = enemy(row.q + 2, row.r, 'W');
    const { state: s, ids: [first, second] } = twoGunners(state, row, [target]);
    assert(!checkKill(map, unitIn(s, first), target, rules).ok, 'not before it is suppressed');
    equal(checkKill(map, unitIn(s, first), target, rules).reason, 'suppress the test ' + `${target.q},${target.r}` + ' first', 'says why');

    const suppressed = suppressEnemy(s, first, target.id, map, rules);
    const shaken = suppressed.enemies[0];
    assert(!checkKill(map, unitIn(suppressed, first), shaken, rules).ok, 'the same gunner has too little AP left this turn');
    const other = state.units.find((u) => u.role !== 'gunner');
    assert(!checkKill(map, { ...other, q: row.q + 1, r: row.r }, shaken, rules).ok, `a ${other.role} cannot kill`);
    assert(checkKill(map, unitIn(suppressed, second), shaken, rules).ok, 'the other gunner can');

    const killed = killEnemy(suppressed, second, target.id, map, rules);
    equal(killed.enemies.length, 0, 'gone from the board');
    equal(unitIn(killed, second).ap, unitIn(suppressed, second).ap - rules.actions.kill.apCost, 'AP spent');
    equal(killed.alert.points, gunfireOf(unitIn(s, first), rules) + gunfireOf(unitIn(s, second), rules, rules.alert.silenced), 'a loud burst, then a silenced shot');
    const noise = killed.noises.at(-1);
    equal(`${noise.kind} ${noise.q},${noise.r}`, `silenced ${row.q + 1},${row.r}`, 'a muffled shot, heard from the gunner');
    const body = killed.bodies.at(-1);
    equal(`${body.enemyId} ${body.q},${body.r} ${body.found}`, `${target.id} ${target.q},${target.r} false`, 'a body where it fell');
  }],

  ['M26 dialogue: a kill or a knife says onKill, going to ground says onHide, a man with no line stays silent', async () => {
    const { map, rules, state } = await loadAll();
    const lineOf = (s, id) => s.speech.find((l) => l.unitId === id)?.line ?? null;
    const row = openRow(map, 5);
    // A gunner's kill.
    const target = enemy(row.q + 2, row.r, 'W');
    const { state: pair, ids: [first, second] } = twoGunners(state, row, [target]);
    const killed = killEnemy(suppressEnemy(pair, first, target.id, map, rules), second, target.id, map, rules);
    equal(lineOf(killed, second), unitIn(killed, second).dialogue.onKill, 'the killer says his kill line');
    equal(lineOf(killed, first), null, 'the other gunner says nothing');
    // Anyone's knife.
    const behind = enemy(row.q + 1, row.r, 'E');
    const { state: k, unitId: knifer } = scenario(state, 'sapper', row, [behind]);
    equal(lineOf(knifeEnemy(k, knifer, behind.id, rules), knifer), unitIn(k, knifer).dialogue.onKill, 'the knife says it too');
    // Going to ground.
    const { state: h, unitId: hider } = scenario(state, 'sapper', { q: row.q + 3, r: row.r }, [enemy(row.q, row.r, 'E')]);
    equal(lineOf(hideUnit(h, hider, rules), hider), unitIn(h, hider).dialogue.onHide, 'hiding says his hide line');
    // No line, no words.
    const mute = (s, id) => ({ ...s, units: s.units.map((u) => (u.id === id ? { ...u, dialogue: { ...u.dialogue, onKill: undefined, onHide: undefined } } : u)) });
    equal(lineOf(knifeEnemy(mute(k, knifer), knifer, behind.id, rules), knifer), null, 'a man with no kill line is silent');
    equal(lineOf(hideUnit(mute(h, hider), hider, rules), hider), null, 'a man with no hide line is silent');
  }],

  ['M26 dialogue: a man first seen says onSpotted at the turn; seen again in contact he does not; hit, he says his wounded line', async () => {
    const { map, rules, state } = await loadAll();
    const lineOf = (s, id) => s.speech.find((l) => l.unitId === id)?.line ?? null;
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E');
    const at = { q: row.q + 2, r: row.r };
    const { state: fresh, unitId } = scenario(state, 'sapper', at, [e]);
    const man = unitIn(fresh, unitId);
    const first = runDetection(fresh, map, rules).events.find((ev) => ev.kind === 'spotted');
    equal(first.first, true, 'the sighting is marked as his first');
    equal(lineOf(endTurn(fresh, rules, map), unitId), man.dialogue.onSpotted, 'he says his spotted line');
    // Already in contact: seen again is not a new sighting, so no spotted line. If the
    // shot lands he says his wounded line, as before M26.
    const { state: held } = scenario(state, 'sapper', at, [e], { inContact: true });
    equal(runDetection(held, map, rules).events.find((ev) => ev.kind === 'spotted').first, false, 'seen again is not first');
    const shot = endTurn(held, rules, map);
    assert(shot.report.some((ev) => ev.kind === 'wounded' && ev.unitId === unitId), 'a man in contact and seen again is hit');
    equal(lineOf(shot, unitId), woundedLine(unitIn(held, unitId)), 'he says his wounded line, not his spotted one');
    const pinned = endTurn(scenario(state, 'sapper', at, [{ ...e, q: row.q - 1 }], { inContact: true }).state, rules, map);
    assert(lineOf(pinned, unitId) !== man.dialogue.onSpotted, 'never the spotted line for a man already in contact');
  }],

  ['a shot from beyond hitRange pins a man in the open; within it, it hits (M13b)', async () => {
    const loaded = await loadAll();
    const { map, state } = loaded;
    // Set inside the enemies' sight, whatever the level's number (Normal's is 3 since M14).
    const rules = { ...loaded.rules, combat: { ...loaded.rules.combat, hitRange: 2 } };
    const row = openRow(map, 5);
    for (const [gap, expected] of [[rules.combat.hitRange + 1, 'pinned'], [rules.combat.hitRange, 'wounded']]) {
      const e = enemy(row.q + gap, row.r, 'W');
      const { state: s, unitId } = scenario(state, 'sapper', row, [e], { inContact: true });
      const { events } = runDetection(s, map, rules);
      assert(events.some((ev) => ev.kind === expected && ev.unitId === unitId), `${gap} hexes off: ${expected} (${events.map((ev) => ev.kind).join(', ')})`);
    }
  }],

  ['knife (M12b): any man, beside an enemy looking the other way, kills it silently, leaves a body and ends his turn', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    // The enemy faces east; the man stands just west of it, behind it.
    const target = enemy(row.q + 1, row.r, 'E');
    for (const role of ['sapper', 'scout', 'gunner']) {
      const { state: s, unitId } = scenario(state, role, row, [target]);
      assert(checkKnife(unitIn(s, unitId), target, rules).ok, `a ${role} can knife it from behind`);
    }
    const { state: s, unitId } = scenario(state, 'sapper', row, [target]);
    const knifed = knifeEnemy(s, unitId, target.id, rules);
    equal(knifed.enemies.length, 0, 'gone from the board');
    equal(unitIn(knifed, unitId).ap, 0, 'his turn is over');
    equal(knifed.alert.points, s.alert.points, 'no alert');
    equal(knifed.noises.length, s.noises.length, 'no noise');
    const body = knifed.bodies.at(-1);
    equal(`${body.enemyId} ${body.q},${body.r} ${body.found}`, `${target.id} ${target.q},${target.r} false`, 'a body where it fell');

    const facing = enemy(row.q + 1, row.r, 'W');
    const faced = checkKnife(unitIn(scenario(state, 'sapper', row, [facing]).state, unitId), facing, rules);
    assert(!faced.ok && faced.reason.includes('looking his way'), `not from in front: ${faced.reason}`);
    const far = enemy(row.q + 2, row.r, 'E');
    assert(!checkKnife(unitIn(scenario(state, 'sapper', row, [far]).state, unitId), far, rules).ok, 'not from two hexes off');
    const spotted = scenario(state, 'sapper', row, [target], { inContact: true });
    assert(!checkKnife(unitIn(spotted.state, spotted.unitId), target, rules).ok, 'not while he is in contact');
    const tired = scenario(state, 'sapper', row, [target], { ap: rules.actions.knife.apCost - 1 });
    assert(!checkKnife(unitIn(tired.state, tired.unitId), target, rules).ok, 'not without the AP');
    const squad = enemy(row.q + 1, row.r, 'E', { label: 'Reserve squad', killable: false });
    const reserve = checkKnife(unitIn(scenario(state, 'sapper', row, [squad]).state, unitId), squad, rules);
    assert(!reserve.ok && reserve.reason.includes('cannot be killed'), `not the reserve: ${reserve.reason}`);
  }],

  ['a suppressed enemy stays open to a kill through the next player phase, then is back to normal', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const target = enemy(row.q + 2, row.r, 'E'); // facing away, so nobody is spotted
    const { state: s, ids: [gunnerId] } = twoGunners(state, row, [target]);
    const suppressed = suppressEnemy(s, gunnerId, target.id, map, rules);
    const detected = runDetection(suppressed, map, rules).state;
    assert(detected.enemies[0].suppressed, 'still suppressed at its detection check');
    const after = runEnemyPhase(detected, map, rules).state;
    const shaken = after.enemies[0];
    assert(!shaken.suppressed && shaken.openToKill, 'suppression over, open to a kill');
    const refilled = { ...after, units: after.units.map((u) => ({ ...u, ap: u.apMax })) };
    assert(checkKill(map, unitIn(refilled, gunnerId), shaken, rules).ok, 'next turn the same gunner can kill');
    const recovered = runDetection(refilled, map, rules).state.enemies[0];
    assert(!recovered.openToKill, 'recovered at the next detection check');
    assert(!checkKill(map, unitIn(refilled, gunnerId), recovered, rules).ok, 'too late to kill');
  }],

  ['the reserve squad cannot be killed but can be suppressed, and the data says so', async () => {
    const { map, rules, state } = await loadAll();
    equal(map.enemyTypes.reserve.killable, false, 'reserve not killable');
    assert(map.enemyTypes.sentry.killable && map.enemyTypes.patrol.killable, 'sentries and patrols are');
    const row = openRow(map, 5);
    const squad = enemy(row.q + 2, row.r, 'E', { label: 'Reserve squad', killable: false });
    const { state: s, ids: [first, second] } = twoGunners(state, row, [squad]);
    assert(checkSuppress(map, unitIn(s, first), squad, rules).ok, 'can be suppressed');
    const suppressed = suppressEnemy(s, first, squad.id, map, rules);
    const check = checkKill(map, unitIn(suppressed, second), suppressed.enemies[0], rules);
    assert(!check.ok && check.reason.includes('cannot be killed'), `says it cannot be killed: ${check.reason}`);
    equal(killEnemy(suppressed, second, squad.id, map, rules), suppressed, 'nothing happens');
  }],

  ['a killed enemy\'s body is found by the rest of the garrison like a para\'s', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const finder = enemy(row.q + 3, row.r, 'W');
    const { state: s } = twoGunners(state, { q: row.q - 100, r: row.r }, [finder]);
    const withBody = { ...s, bodies: [{ enemyId: 'dead', name: 'the bridge post', q: row.q + 2, r: row.r, found: false }] };
    const { state: after, events } = runEnemyPhase(withBody, map, rules);
    assert(after.bodies[0].found, 'found');
    equal(after.alert.points, rules.alert.bodyFound, 'alert up');
    assert(events.some((e) => e.kind === 'bodyFound' && e.name === 'the bridge post'), 'reported');
  }],

  ['a roused garrison looks harder: each alert state adds its detectionBonus to the sum', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const e = enemy(row.q, row.r, 'E');
    const { state: s, unitId } = scenario(state, 'sapper', { q: row.q + 3, r: row.r }, [e]);
    const unit = unitIn(s, unitId);
    for (const st of rules.alert.states) {
      const d = detectionAt(map, rules, [e], st.from, unit, unit);
      equal(d.alert, st.detectionBonus, `${st.id} term`);
      const calm = detectionAt(map, rules, [e], 0, unit, unit);
      equal(d.score - calm.score, st.detectionBonus - rules.alert.states[0].detectionBonus, `${st.id} score`);
    }
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
  ['return fire (M36): a man who is no gunner may suppress the enemy that has him in its sights, and no other', async () => {
    const { map, rules, state } = await loadAll();
    const row = openRow(map, 5);
    const otherRole = Object.keys(rules.roles).find((id) => !rules.roles[id].suppress);
    const man = state.units.find((u) => u.role === otherRole);
    const sights = { unitId: man.id, q: row.q, r: row.r };
    const watcher = enemy(row.q + 2, row.r, 'W', { watching: sights });
    const bystander = enemy(row.q + 1, row.r, 'E');
    const farWatcher = enemy(row.q + 4, row.r, 'W', { watching: sights });

    const { state: quiet, unitId } = scenario(state, otherRole, row, [watcher, bystander]);
    assert(!checkSuppress(map, unitIn(quiet, unitId), watcher, rules).ok, 'not while nobody has seen him: only a gunner fires first');

    const { state: s } = scenario(state, otherRole, row, [watcher, bystander, farWatcher], { inContact: true });
    const seen = unitIn(s, unitId);
    const check = checkSuppress(map, seen, watcher, rules);
    assert(check.ok, `he can fire back at the enemy watching him: ${check.reason}`);
    equal(check.cost, rules.actions.returnFire.apCost, 'at return fire\'s own cost');
    assert(!checkSuppress(map, seen, bystander, rules).ok, 'not at an enemy that has not seen him');
    assert(!checkSuppress(map, seen, farWatcher, rules).ok, 'not past his spot radius');

    const fired = suppressEnemy(s, unitId, watcher.id, map, rules);
    assert(fired.enemies.find((e) => e.id === watcher.id).suppressed, 'it keeps its head down');
    equal(unitIn(fired, unitId).ap, seen.ap - rules.actions.returnFire.apCost, 'AP spent, the rest his to move with');
    equal(fired.alert.points, gunfireOf(seen, rules), 'it is gunfire to the alert');
    equal(fired.noises.at(-1).kind, 'gunfire', 'and is heard as gunfire');
    equal(suppressEnemy(s, unitId, bystander.id, map, rules), s, 'an illegal shot changes nothing');

    // Turned off in the data, only gunners fire, as before M36.
    const off = { ...rules, actions: { ...rules.actions, returnFire: null } };
    assert(!checkSuppress(map, seen, watcher, off).ok, 'returnFire: null turns it off');
    // A gunner needs no contact: he fires first, at anything he can see.
    const gunnerRole = Object.keys(rules.roles).find((id) => rules.roles[id].suppress);
    const { state: g, unitId: gunnerId } = scenario(state, gunnerRole, row, [bystander]);
    assert(checkSuppress(map, unitIn(g, gunnerId), bystander, rules).ok, 'a gunner still fires first');
  }],
];
