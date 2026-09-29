// M6: the drop and parachutes (SPEC.md §9, §12).
//
// Runs against the real data files. Scenarios that need a man on particular
// ground find that ground in map.json rather than assuming coordinates.

import { runEnemyPhase } from '../src/enemy.js';
import { canLandOn, jumpPoints, landStick, resolveLanding } from '../src/drop.js';
import { DIRECTION_NAMES, NEIGHBOR_DIRS, axialToPixel, hexDistance, hexRing } from '../src/hex.js';
import { forEachCell, hexKey, isInPlay, isPassable, loadJson, loadMap, terrainAt } from '../src/map.js';
import { createRng } from '../src/rng.js';
import { isExfil } from '../src/sabotage.js';
import {
  chooseDropRun, createInitialState, endTurn, jump, moveUnit, packParachute,
} from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { checkPackParachute, commandBonus, isWounded, planMove, unitById } from '../src/units.js';
import { landedState } from './fixtures.js';
import { boardPixelBounds, dropTimeline } from '../src/render/board.js';
import { DROP_SHOW } from '../src/render/theme.js';

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
  return { map, rules, traits, roster };
}

function dropOn(env, runId, seed) {
  const { map, rules, traits, roster } = env;
  const start = createInitialState(roster, traits, rules, map, seed);
  return jump(chooseDropRun(start, map, runId), map, rules);
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);

/** The first in-play hex of a terrain with room around it: no enemy near, no exfil. */
function findGround(map, rules, enemies, predicate) {
  let found = null;
  forEachCell(map, (q, r) => {
    if (found || !isInPlay(map, q, r) || !predicate(terrainAt(map, q, r))) return;
    if (enemies.some((e) => hexDistance(e, { q, r }) <= rules.landing.enemyClearance + 2)) return;
    found = { q, r };
  });
  if (!found) throw new Error('no suitable hex in map.json');
  return found;
}

/** A state where only the named man is landed, at `hex`, and nobody else is on the board. */
function landOne(env, unitPick, hex) {
  const { map, rules, traits, roster } = env;
  const state = createInitialState(roster, traits, rules, map);
  const unit = unitPick(state.units);
  return { unit, result: landStick({ ...state, enemies: [] }, [{ unitId: unit.id, q: hex.q, r: hex.r }], map, rules) };
}

export default [
  ['the RNG is seeded: one seed, one sequence; weights of zero are never picked', async () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const c = createRng(1235);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    const seqC = Array.from({ length: 20 }, () => c.next());
    equal(JSON.stringify(seqA), JSON.stringify(seqB), 'same seed');
    assert(JSON.stringify(seqA) !== JSON.stringify(seqC), 'different seed, different sequence');
    assert(seqA.every((x) => x >= 0 && x < 1), 'floats in [0, 1)');
    const rng = createRng(9);
    for (let i = 0; i < 500; i++) assert(rng.weighted([0, 3, 0, 1]) % 2 === 1, 'picked a zero weight');
    equal(rng.weighted([0, 0]), -1, 'all zero');
  }],

  ['a hex ring has 6 × radius hexes, all at that distance', async () => {
    const centre = { q: 3, r: 4 };
    for (const radius of [0, 1, 2, 3]) {
      const ring = hexRing(centre, radius);
      equal(ring.length, radius === 0 ? 1 : 6 * radius, `ring ${radius} size`);
      assert(ring.every((h) => hexDistance(h, centre) === radius), `ring ${radius} distances`);
      equal(new Set(ring.map((h) => hexKey(h.q, h.r))).size, ring.length, `ring ${radius} has no repeats`);
    }
  }],

  ['there are three drop runs, and a seed and a run always land the stick the same way', async () => {
    const env = await loadAll();
    equal(env.map.dropRuns.length, 3, 'three runs');
    for (const run of env.map.dropRuns) {
      const a = dropOn(env, run.id, 42);
      const b = dropOn(env, run.id, 42);
      const at = (s) => s.units.map((u) => `${u.q},${u.r}`).join(' ');
      equal(at(a), at(b), `${run.id}: replayed`);
      const differs = SEEDS.some((seed) => at(dropOn(env, run.id, seed)) !== at(a));
      assert(differs, `${run.id}: every seed landed the same`);
    }
  }],

  ['before the jump nobody is on the board and no turn can end; after it, turn 1 begins', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const start = createInitialState(roster, traits, rules, map, 5);
    equal(start.phase, 'drop', 'starts in the drop');
    assert(start.units.every((u) => !u.landed), 'nobody landed');
    equal(endTurn(start, rules, map), start, 'End Turn does nothing');
    equal(jump(start, map, rules), start, 'no jump without a run');
    const dropped = jump(chooseDropRun(start, map, 'north'), map, rules);
    equal(dropped.phase, 'play', 'play begins');
    equal(dropped.turn, 1, 'turn 1');
    assert(dropped.units.every((u) => u.landed), 'everyone landed');
    equal(dropped.outcome, null, 'the mission is on');
  }],

  ['scatter is 1–2 hexes, rarely 3, and every man lands somewhere he can', async () => {
    const env = await loadAll();
    const { map, rules } = env;
    const counts = [0, 0, 0, 0];
    for (const run of map.dropRuns) {
      for (const seed of SEEDS) {
        const s = dropOn(env, run.id, seed);
        const taken = new Set();
        for (const event of s.report.filter((e) => e.kind === 'landed')) {
          assert(event.distance >= 1 && event.distance <= 3, `${run.id} seed ${seed}: scattered ${event.distance}`);
          counts[event.distance]++;
          const at = { q: event.q, r: event.r };
          assert(isInPlay(map, at.q, at.r) && isPassable(terrainAt(map, at.q, at.r)), `${run.id} seed ${seed}: ${event.unitName} on unusable ground`);
          assert(!isExfil(map, at), `${run.id} seed ${seed}: landed on the exfil`);
          assert(!taken.has(hexKey(at.q, at.r)), `${run.id} seed ${seed}: two men on one hex`);
          taken.add(hexKey(at.q, at.r));
          if (event.outcome !== 'wounds') {
            assert(s.enemies.every((e) => hexDistance(e, at) > rules.landing.enemyClearance), `${run.id} seed ${seed}: landed beside an enemy`);
          }
        }
      }
    }
    assert(counts[3] < counts[1] && counts[3] < counts[2], `3 hexes should be rare: ${counts}`);
    assert(counts[3] > 0, 'but it happens');
  }],

  ['the wind leans the scatter: more men land downwind than upwind', async () => {
    const env = await loadAll();
    const { map } = env;
    let down = 0;
    let up = 0;
    for (const run of map.dropRuns) {
      const points = jumpPoints(run, env.roster.troopers.length);
      const dir = NEIGHBOR_DIRS[DIRECTION_NAMES.indexOf(run.wind)];
      const wind = axialToPixel(dir.q, dir.r, 1);
      for (const seed of SEEDS) {
        const s = dropOn(env, run.id, seed);
        s.report.filter((e) => e.kind === 'landed' && e.outcome !== 'wounds').forEach((e) => {
          const i = s.units.findIndex((u) => u.id === e.unitId);
          const v = axialToPixel(e.q - points[i].q, e.r - points[i].r, 1);
          const dot = v.x * wind.x + v.y * wind.y;
          if (dot > 0) down++;
          if (dot < 0) up++;
        });
      }
    }
    assert(down > up, `downwind ${down}, upwind ${up}`);
  }],

  ['every man leaves his parachute on the hex he lands on', async () => {
    const env = await loadAll();
    const s = dropOn(env, 'west', 99);
    equal(s.parachutes.length, s.units.length, 'one each');
    for (const unit of s.units) {
      const chute = s.parachutes.find((p) => p.unitId === unit.id);
      equal(`${chute.q},${chute.r}`, `${unit.q},${unit.r}`, `${unit.id}'s parachute`);
    }
  }],

  ['a bad landing costs his first turn — not with Treetops — and he is back to a full pool on turn 2', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const state = createInitialState(roster, traits, rules, map);
    const wood = findGround(map, rules, state.enemies, (t) => t.landing === 'bad');
    const treetops = (units) => units.find((u) => u.traits.some((t) => t.id === 'treetops'));
    const other = (units) => units.find((u) => !u.traits.some((t) => t.hook === 'onLand'));

    const { unit, result } = landOne(env, other, wood);
    const landed = unitById(result.state.units, unit.id);
    equal(landed.turnsLost, rules.landing.badLandingTurnsLost, 'turns lost');
    equal(landed.apMax, 0, 'no pool on turn 1');
    const neighbour = hexRing(landed, 1).find((h) => isInPlay(map, h.q, h.r) && isPassable(terrainAt(map, h.q, h.r)));
    const plan = planMove(map, result.state.units, landed, neighbour, rules);
    assert(!plan.affordable, 'he cannot take even the minimum step');
    const turn2 = endTurn(result.state, rules, map);
    const later = unitById(turn2.units, unit.id);
    equal(later.turnsLost, 0, 'spent');
    equal(later.apMax, rules.roles[later.role].actionPoints, 'full pool on turn 2');

    const lucky = landOne(env, treetops, wood);
    const barrow = unitById(lucky.result.state.units, lucky.unit.id);
    equal(barrow.turnsLost, 0, 'Treetops loses nothing');
    assert(barrow.apMax > 0, 'Treetops has his pool');
    equal(lucky.result.events[0].outcome, 'bad', 'it was still a bad landing');
  }],

  ['landing in the canal wounds him; he comes out on the nearest bank with his parachute, and his charge drops there', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const state = createInitialState(roster, traits, rules, map);
    const water = findGround(map, rules, state.enemies, (t) => t.landing === 'wounds');
    const sapper = (units) => units.find((u) => u.role === 'sapper' && u.charges > 0);
    const { unit, result } = landOne(env, sapper, water);
    const man = unitById(result.state.units, unit.id);
    assert(isWounded(man), 'wounded');
    assert(!man.inContact, 'nobody has seen him');
    equal(hexDistance(man, water), 1, 'on the nearest bank');
    assert(isPassable(terrainAt(map, man.q, man.r)) && terrainAt(map, man.q, man.r).landing !== 'wounds', 'on dry ground');
    const chute = result.state.parachutes[0];
    equal(`${chute.q},${chute.r}`, `${man.q},${man.r}`, 'parachute with him');
    equal(man.charges, 0, 'not carrying');
    equal(result.state.droppedCharges.length, unit.charges, 'charge dropped');
    equal(`${result.state.droppedCharges[0].q},${result.state.droppedCharges[0].r}`, `${man.q},${man.r}`, 'where he came out');
    equal(man.apMax, rules.combat.woundedActionPoints, 'a wounded man’s pool');
    const settled = resolveLanding(map, rules, water, new Set(), []);
    equal(settled.kind, 'wounds', 'resolveLanding says wounds');
  }],

  ['nobody lands on the exfil, an emplacement or beside an enemy', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const state = createInitialState(roster, traits, rules, map);
    const [q, r] = map.exfil[0];
    assert(!canLandOn(map, rules, { q, r }, new Set(), []), 'exfil');
    const post = state.enemies.find((e) => e.speed === 0);
    assert(!canLandOn(map, rules, post, new Set(), []), 'emplacement');
    const near = hexRing(post, rules.landing.enemyClearance).find((h) => isInPlay(map, h.q, h.r) && isPassable(terrainAt(map, h.q, h.r)));
    assert(!canLandOn(map, rules, near, new Set(), state.enemies), 'inside the clearance');
    assert(canLandOn(map, rules, near, new Set(), []), 'but fine with nobody there');
  }],

  ['onLand scatterDistance is a real hook: set to 0, he lands on his jump point', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const withTrait = {
      ...traits,
      'test-pinpoint': { name: 'Pinpoint', hook: 'onLand', modifier: { stat: 'scatterDistance', op: 'set', value: 0 } },
    };
    const edited = structuredClone(roster);
    for (const run of map.dropRuns) {
      const index = jumpPoints(run, edited.troopers.length)
        .findIndex((p, i) => i === 0 && canLandOn(map, rules, p, new Set(), createInitialState(roster, traits, rules, map).enemies)
          && terrainAt(map, p.q, p.r).landing !== 'wounds');
      if (index !== 0) continue;
      edited.troopers[0].traits = ['test-pinpoint'];
      const start = createInitialState(edited, withTrait, rules, map, 3);
      const s = jump(chooseDropRun(start, map, run.id), map, rules);
      const point = jumpPoints(run, edited.troopers.length)[0];
      equal(`${s.units[0].q},${s.units[0].r}`, `${point.q},${point.r}`, `${run.id}: on his mark`);
      return;
    }
    throw new Error('no run has a first jump point anyone could land on');
  }],

  ['the orders are strongest beside the leader: +2 beside him, +1 two hexes off, nothing further (M12)', async () => {
    const { rules } = await loadAll();
    const man = (id, q, leader = false) => ({ id, q, r: 0, leader, landed: true });
    const leader = man('leader', 0, true);
    const at = (q) => commandBonus(man('x', q), [leader, man('x', q)], rules);
    equal(at(1), rules.command.closeBonusActionPoints, 'beside him');
    equal(at(rules.command.radius), rules.command.bonusActionPoints, 'at the edge of his radius');
    equal(at(rules.command.radius + 1), 0, 'past it');
    equal(commandBonus(leader, [leader], rules), 0, 'never himself');
    equal(commandBonus(man('x', 1), [{ ...leader, dead: true }, man('x', 1)], rules), 0, 'not from a dead leader');
  }],

  ['the command radius is measured where they land', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const s = landedState(roster, traits, rules, map);
    for (const unit of s.units) {
      const d = Math.min(Infinity, ...s.units.filter((o) => o.leader && o.id !== unit.id).map((o) => hexDistance(o, unit)));
      // Strongest beside him (M12), then the ordinary band.
      const bonus = d <= rules.command.closeRadius ? rules.command.closeBonusActionPoints : d <= rules.command.radius ? rules.command.bonusActionPoints : 0;
      equal(unit.commandBonus, !unit.leader && !unit.hits ? bonus : 0, `${unit.id} orders`);
    }
  }],

  ['packing a parachute: 1 AP, anyone\'s on his hex (M15), and it is gone', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const s = landedState(roster, traits, rules, map);
    const [a, b] = s.units;
    equal(checkPackParachute(s.parachutes, a, rules).ok, true, 'on his own');
    const moved = { ...s, units: s.units.map((u) => (u.id === b.id ? { ...u, q: a.q + 50, r: a.r } : u)) };
    const onOthers = { ...moved, parachutes: moved.parachutes.map((p) => (p.unitId === a.id ? p : { ...p, q: 300, r: 300 })) };
    const bStand = { ...onOthers, units: onOthers.units.map((u) => (u.id === b.id ? { ...u, q: a.q, r: a.r } : u)) };
    const helped = packParachute(bStand, b.id, rules);
    assert(!helped.parachutes.some((p) => p.unitId === a.id), "he packs someone else's on his hex");
    equal(helped.parachutes.length, bStand.parachutes.length - 1, 'only that one');

    const packed = packParachute(s, a.id, rules);
    equal(unitById(packed.units, a.id).ap, a.ap - rules.actions.packParachute.apCost, 'costs its AP');
    assert(!packed.parachutes.some((p) => p.unitId === a.id), 'gone');
    equal(packed.parachutes.length, s.parachutes.length - 1, 'only his');
    equal(checkPackParachute(packed.parachutes, unitById(packed.units, a.id), rules).reason, 'no parachute on this hex', 'not twice');

    const plan = planMove(map, s.units, a, hexRing(a, 1).find((h) => isPassable(terrainAt(map, h.q, h.r)) && !s.units.some((u) => u.q === h.q && u.r === h.r)), rules);
    const walkedOff = moveUnit(s, a.id, plan, map);
    equal(checkPackParachute(walkedOff.parachutes, unitById(walkedOff.units, a.id), rules).ok, false, 'not from another hex');
  }],

  ['a parachute is found by an enemy beside it or walking past it, not two hexes off: alert +1, a noise, the last known contact, once', async () => {
    const env = await loadAll();
    const { map, rules, traits, roster } = env;
    const s = landedState(roster, traits, rules, map);
    let row = null;
    forEachCell(map, (q, r) => {
      if (row) return;
      const ok = [0, 1, 2, 3, 4, 5].every((i) => isInPlay(map, q + i, r) && terrainAt(map, q + i, r).moveCost === 1);
      if (ok) row = { q, r };
    });
    const parked = s.units.map((u, i) => ({ ...u, q: 200 + i, r: 0 }));
    const chute = { unitId: parked[0].id, name: parked[0].shortName, q: row.q + 2, r: row.r };
    const base = { ...s, units: parked, parachutes: [chute], noises: [], contact: null, alert: { ...s.alert, points: 0 } };
    const enemyAt = (q, extra) => ({
      id: 'test', label: 'Test patrol', type: 'patrol', typeLabel: 'Patrol',
      visionRadius: 3, arcDegrees: 120, detection: 3, speed: 3,
      q, r: row.r, facing: 2, homeFacing: 2, turned: false,
      route: null, loop: false, waypoint: 0, routeStep: 1,
      investigating: null, holding: null, watching: null, suppressed: false, ...extra,
    });

    const far = runEnemyPhase({ ...base, enemies: [enemyAt(row.q, { speed: 0, type: 'sentry' })] }, map, rules);
    equal(far.state.parachutes.length, 1, 'two hexes off: not found');
    const beside = runEnemyPhase({ ...base, enemies: [enemyAt(row.q + 1, { speed: 0, type: 'sentry' })] }, map, rules);
    equal(beside.state.parachutes.length, 0, 'beside it: found');

    const route = [{ q: row.q, r: row.r }, { q: row.q + 5, r: row.r }];
    const walked = runEnemyPhase({ ...base, enemies: [enemyAt(row.q, { route, waypoint: 1 })] }, map, rules);
    equal(walked.state.parachutes.length, 0, 'found and removed');
    equal(walked.state.alert.points, rules.alert.parachuteFound, 'alert +parachuteFound');
    equal(walked.events.filter((e) => e.kind === 'parachuteFound').length, 1, 'reported');
    const noise = walked.state.noises.at(-1);
    equal(`${noise.kind} ${noise.q},${noise.r}`, `found ${chute.q},${chute.r}`, 'a noise where it lay');
    const heard = runEnemyPhase(walked.state, map, rules);
    equal(`${heard.state.contact.q},${heard.state.contact.r}`, `${chute.q},${chute.r}`, 'it becomes the last known contact');
    equal(heard.events.filter((e) => e.kind === 'parachuteFound').length, 0, 'found once');
  }],

  ['the drop aircraft flies in from off the board and out past its far edge on every run (M27b: the East run stopped mid-map)', async () => {
    const map = await loadMap();
    const b = boardPixelBounds(map);
    const clear = DROP_SHOW.aircraftSize / 2;
    const off = (p) => p.x <= b.minX - clear + 0.5 || p.x >= b.maxX + clear - 0.5 || p.y <= b.minY - clear + 0.5 || p.y >= b.maxY + clear - 0.5;
    for (const run of map.dropRuns) {
      const t = dropTimeline(map, { from: { q: run.from[0], r: run.from[1] }, to: { q: run.to[0], r: run.to[1] }, jumps: [] });
      assert(off(t.start), `${run.id} starts off the board`);
      assert(off(t.end), `${run.id} ends off the board`);
    }
  }],
];
