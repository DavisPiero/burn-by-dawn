// M4: enemies, patrol routes, vision arcs, detection and alert (SPEC.md §6, §12).
//
// Runs against the real data files. Scenarios that need an enemy somewhere
// particular put one there in memory rather than editing map.json.

import {
  alertIndex, canSee, decayAlert, detectionAt, detectionScore, raiseAlert, runDetection,
  runEnemyPhase, visibleHexes, walkRoute,
} from '../src/enemy.js';
import { DIRECTION_NAMES, NEIGHBOR_DIRS, hexDistance, hexLine, inArc } from '../src/hex.js';
import { hasLineOfSight, isInPlay, loadJson, loadMap, terrainIdAt } from '../src/map.js';
import { createInitialState, endTurn, moveUnit } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { planMove } from '../src/units.js';

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

/** A bare enemy for scenarios. */
function enemy(q, r, facingName, extra = {}) {
  return {
    id: `test-${q},${r}`, label: 'Test', type: 'patrol', typeLabel: 'Patrol',
    visionRadius: 3, arcDegrees: 120, detection: 3, speed: 3,
    q, r, facing: facing(facingName), route: null, loop: false, waypoint: 0, routeStep: 1,
    ...extra,
  };
}

/** Find an in-play hex of a terrain whose six neighbours satisfy `test`. */
function findHex(map, predicate) {
  for (let r = 0; r < map.height; r++) {
    for (let q = -r; q < map.width; q++) {
      if (isInPlay(map, q, r) && predicate(q, r)) return { q, r };
    }
  }
  return null;
}

/** State with the troopers moved out of the way and only these enemies. */
function scenario(state, enemies, units) {
  return { ...state, enemies, units: units ?? state.units };
}

export default [
  ['hexLine runs end to end, one hex per step', async () => {
    const line = hexLine({ q: 0, r: 0 }, { q: 3, r: -1 });
    equal(line.length, 4, 'length');
    equal(`${line[0].q},${line[0].r}`, '0,0', 'start');
    equal(`${line[3].q},${line[3].r}`, '3,-1', 'end');
    for (let i = 1; i < line.length; i++) equal(hexDistance(line[i - 1], line[i]), 1, `step ${i}`);
  }],

  ['a 120° arc facing E takes in the NE, E and SE neighbours and nothing behind', async () => {
    const at = { q: 0, r: 0 };
    const inside = NEIGHBOR_DIRS.map((d) => inArc(at, facing('E'), d, 120));
    equal(inside.filter(Boolean).length, 3, 'half the ring');
    assert(inArc(at, facing('E'), NEIGHBOR_DIRS[facing('NE')], 120), 'NE');
    assert(inArc(at, facing('E'), NEIGHBOR_DIRS[facing('SE')], 120), 'SE');
    assert(!inArc(at, facing('E'), NEIGHBOR_DIRS[facing('W')], 120), 'not W');
  }],

  ['line of sight is blocked by blocking terrain between, not at either end', async () => {
    const { map } = await loadAll();
    const blocks = (q, r) => Boolean(map.terrain[terrainIdAt(map, q, r)]?.blocksLOS);
    const open = (q, r) => isInPlay(map, q, r) && terrainIdAt(map, q, r) !== null && !blocks(q, r);
    // A blocking hex with open hexes on opposite sides of it, along any axis.
    let found = null;
    findHex(map, (q, r) => {
      if (!blocks(q, r)) return false;
      const axis = NEIGHBOR_DIRS.slice(0, 3).find((d) => open(q + d.q, r + d.r) && open(q - d.q, r - d.r));
      if (axis) found = { q, r, d: axis };
      return Boolean(axis);
    });
    assert(found, 'no blocking hex between two open hexes on this map');
    const a = { q: found.q - found.d.q, r: found.r - found.d.r };
    const b = { q: found.q + found.d.q, r: found.r + found.d.r };
    assert(!hasLineOfSight(map, a, b), 'blocking terrain between blocks');
    assert(hasLineOfSight(map, a, found), 'blocking terrain at the target does not block');
    assert(hasLineOfSight(map, found, b), 'blocking terrain at the viewer does not block');
  }],

  ['detection is base − cover − concealment + proximity, and the scout gets one step', async () => {
    const { map, rules, state } = await loadAll();
    const sapper = state.units.find((u) => u.role === 'sapper');
    const scout = state.units.find((u) => u.role === 'scout');
    // Open field two hexes east of an enemy facing east, with a clear line.
    const spot = findHex(map, (q, r) => terrainIdAt(map, q + 2, r) === 'field'
      && terrainIdAt(map, q + 1, r) === 'field' && terrainIdAt(map, q, r) === 'field');
    const e = enemy(spot.q, spot.r, 'E');
    const target = { q: spot.q + 2, r: spot.r };
    const d = detectionScore(map, rules, e, 0, sapper, target);
    equal(d.cover, rules.detection.cover.none, 'cover');
    equal(d.proximity, rules.detection.proximity[2], 'proximity at 2');
    equal(d.score, e.detection - d.cover - 0 + d.proximity, 'sum');
    const s = detectionScore(map, rules, e, 0, scout, target);
    equal(s.score, d.score - rules.roles.scout.concealment, 'scout concealment');
    equal(detectionScore(map, rules, { ...e, facing: facing('W') }, 0, sapper, target), null, 'behind it: unseen');
  }],

  ['alert raises vision radius through the state bonus', async () => {
    const { map, rules } = await loadAll();
    const open = findHex(map, (q, r) => [0, 1, 2, 3, 4].every((i) => ['field', 'track'].includes(terrainIdAt(map, q + i, r))));
    const e = enemy(open.q, open.r, 'E');
    const far = { q: open.q + 4, r: open.r };
    assert(!canSee(map, e, far, e.visionRadius), 'out of range when calm');
    const suspicious = rules.alert.states[1].from;
    assert(visibleHexes(map, e, suspicious, rules).has(`${far.q},${far.r}`), 'in range when suspicious');
  }],

  ['nobody is spotted where the six start', async () => {
    const { map, rules, state } = await loadAll();
    for (const unit of state.units) {
      const d = detectionAt(map, rules, state.enemies, 0, unit, unit);
      assert(!d || !d.spotted, `${unit.id} is spotted on turn 1`);
    }
    const { events } = runDetection(state, map, rules);
    equal(events.length, 0, 'no events');
  }],

  ['a trooper who walks through an arc is spotted there, even if he ends out of it', async () => {
    const { map, rules, state } = await loadAll();
    const unit = state.units[0];
    // Enemy looking east along open ground; the trooper crosses its view.
    const spot = findHex(map, (q, r) => [-2, -1, 0, 1, 2].every((i) => terrainIdAt(map, q + i, r) === 'field'));
    const e = enemy(spot.q, spot.r, 'E');
    // Seen at (q+2, r); ends two hexes behind the enemy, outside its arc.
    const behind = { q: spot.q - 2, r: spot.r };
    const mover = { ...unit, ...behind, trail: [{ q: spot.q + 2, r: spot.r }, behind] };
    const s = scenario(state, [e], [mover]);
    const result = runDetection(s, map, rules);
    equal(result.events.filter((ev) => ev.kind === 'spotted').length, 1, 'spotted once');
    equal(result.state.alert.points, rules.alert.spotted, 'alert +spotted');
    equal(`${result.state.contact.q},${result.state.contact.r}`, `${spot.q + 2},${spot.r}`, 'contact is where he was seen');
  }],

  ['a trooper who starts in an arc and walks out of it is not tested where he started', async () => {
    const { map, rules, state } = await loadAll();
    const unit = state.units[0];
    const spot = findHex(map, (q, r) => [-2, -1, 0, 1, 2].every((i) => terrainIdAt(map, q + i, r) === 'field'));
    const e = enemy(spot.q, spot.r, 'E');
    const start = { q: spot.q + 2, r: spot.r };
    const behind = { q: spot.q - 2, r: spot.r };
    assert(detectionAt(map, rules, [e], 0, unit, start).spotted, 'the start hex would be spotted');
    const stayed = runDetection(scenario(state, [e], [{ ...unit, ...start, trail: [] }]), map, rules);
    equal(stayed.events.length > 0, true, 'standing still there he is spotted');
    const left = runDetection(scenario(state, [e], [{ ...unit, ...behind, trail: [behind] }]), map, rules);
    equal(left.events.length, 0, 'having left he is not');
  }],

  ['moving records the trail and ending the turn clears it', async () => {
    const { map, rules, state } = await loadAll();
    const unit = state.units[0];
    const target = { q: unit.q + 1, r: unit.r };
    const plan = planMove(map, state.units, unit, target, rules, state.enemies);
    const moved = moveUnit(state, unit.id, plan);
    equal(moved.units[0].trail.length, plan.steps, 'trail length');
    const next = endTurn(moved, rules, map);
    equal(next.units[0].trail.length, 0, 'cleared');
  }],

  ['troopers cannot move onto an enemy', async () => {
    const { map, rules, state } = await loadAll();
    const unit = state.units[0];
    const next = { q: unit.q + 1, r: unit.r };
    const blocked = planMove(map, state.units, unit, next, rules, [enemy(next.q, next.r, 'W')]);
    equal(blocked, null, 'no path onto the enemy');
  }],

  ['one spot is not a whole alert step, and quiet turns clear it', async () => {
    const { rules, state } = await loadAll();
    let s = { ...state, alert: raiseAlert(state.alert, rules.alert.spotted, rules) };
    equal(alertIndex(s.alert.points, rules), 0, 'still calm');
    s = decayAlert(s, rules).state; // the turn it rose is not quiet
    for (let i = 0; i < rules.alert.quietTurnsToDecay - 1; i++) s = decayAlert(s, rules).state;
    equal(s.alert.points, 1, 'not yet cleared');
    const cleared = decayAlert(s, rules);
    equal(cleared.state.alert.points, 0, 'cleared');
    equal(cleared.events.length, 0, 'no event: the state never changed');
  }],

  ['reaching Suspicious raises the alert one step, and it eases after the quiet turns', async () => {
    const { rules, state } = await loadAll();
    let s = { ...state, alert: raiseAlert(state.alert, rules.alert.states[1].from, rules) };
    equal(alertIndex(s.alert.points, rules), 1, 'suspicious');
    s = decayAlert(s, rules).state; // the turn it rose is not quiet
    for (let i = 0; i < rules.alert.quietTurnsToDecay - 1; i++) {
      s = decayAlert(s, rules).state;
      equal(alertIndex(s.alert.points, rules), 1, `still suspicious after ${i + 1} quiet`);
    }
    const last = decayAlert(s, rules);
    equal(alertIndex(last.state.alert.points, rules), 0, 'calm again');
    equal(last.events[0].kind, 'alertDecay', 'event');
  }],

  ['alert caps at Stand-To', async () => {
    const { rules, state } = await loadAll();
    const alert = raiseAlert(state.alert, 99, rules);
    equal(alert.points, rules.alert.states[rules.alert.states.length - 1].from, 'capped');
  }],

  ['a patrol walks its route at its speed, faces the way it steps, and turns round at the end', async () => {
    const { map, rules, state } = await loadAll();
    const patrol = state.enemies.find((e) => e.route && !e.loop);
    assert(patrol, 'no out-and-back patrol in map.json');
    let current = patrol;
    const start = { q: current.q, r: current.r };
    let reachedEnd = false;
    let cameBack = false;
    for (let turn = 0; turn < 20; turn++) {
      const before = current;
      current = walkRoute(map, current, new Set(), rules);
      assert(hexDistance(before, current) <= current.speed, 'moved no further than its speed');
      const end = current.route[current.route.length - 1];
      if (current.q === end.q && current.r === end.r) reachedEnd = true;
      if (reachedEnd && current.q === start.q && current.r === start.r) cameBack = true;
    }
    assert(reachedEnd, 'reached the far waypoint');
    assert(cameBack, 'walked back to the start');
  }],

  ['patrols walk when calm and nothing mutates the state it was given', async () => {
    const { map, rules, state } = await loadAll();
    const before = JSON.stringify(state);
    const next = endTurn(state, rules, map);
    equal(JSON.stringify(state), before, 'input state untouched');
    const moved = next.enemies.filter((e, i) => e.q !== state.enemies[i].q || e.r !== state.enemies[i].r);
    equal(moved.length, state.enemies.filter((e) => e.speed > 0).length, 'every patrol moved');
    for (const post of next.enemies.filter((e) => e.speed === 0)) {
      const was = state.enemies.find((e) => e.id === post.id);
      equal(`${post.q},${post.r},${post.facing}`, `${was.q},${was.r},${was.facing}`, `${post.id} held`);
    }
  }],

  ['Suspicious patrols stop and sweep on alternate turns', async () => {
    const { map, rules, state } = await loadAll();
    const suspicious = { ...state.alert, points: rules.alert.states[1].from };
    const every = rules.patrols.suspiciousPauseEvery;
    const pauseTurn = { ...state, alert: suspicious, turn: every };
    const walkTurn = { ...state, alert: suspicious, turn: every + 1 };
    const paused = runEnemyPhase(pauseTurn, map, rules).state;
    const walked = runEnemyPhase(walkTurn, map, rules).state;
    state.enemies.forEach((e, i) => {
      if (e.speed === 0) return;
      equal(`${paused.enemies[i].q},${paused.enemies[i].r}`, `${e.q},${e.r}`, `${e.id} paused`);
      equal(paused.enemies[i].facing, (e.facing + rules.patrols.sweepRotation) % 6, `${e.id} swept`);
      assert(walked.enemies[i].q !== e.q || walked.enemies[i].r !== e.r, `${e.id} walked`);
    });
  }],

  ['Alarmed sends the nearest patrols to the contact, and the one that gets there searches it', async () => {
    const { map, rules, state } = await loadAll();
    const mobile = state.enemies.filter((e) => e.speed > 0);
    const target = mobile[0];
    // A contact one step from the first patrol, which is then surely nearest.
    const step = NEIGHBOR_DIRS
      .map((d) => ({ q: target.q + d.q, r: target.r + d.r }))
      .find((h) => isInPlay(map, h.q, h.r) && map.terrain[terrainIdAt(map, h.q, h.r)].moveCost !== null
        && !state.enemies.some((e) => e.q === h.q && e.r === h.r));
    const alarmed = {
      ...state,
      units: state.units.map((u) => ({ ...u, q: 100 + u.q, r: u.r })), // off the board, out of the way
      alert: { ...state.alert, points: rules.alert.states[2].from },
      contact: { ...step, searched: false },
    };
    const byDistance = [...mobile].sort((a, b) => hexDistance(a, step) - hexDistance(b, step));
    const hunters = new Set(byDistance.slice(0, rules.patrols.alarmedConverge).map((e) => e.id));
    const result = runEnemyPhase(alarmed, map, rules);
    const arrived = result.state.enemies.find((e) => e.id === target.id);
    equal(`${arrived.q},${arrived.r}`, `${step.q},${step.r}`, 'nearest patrol reached the contact');
    assert(result.state.contact.searched, 'contact searched');
    assert(result.events.some((e) => e.kind === 'searched'), 'searched event');
    for (const e of mobile) {
      if (hunters.has(e.id)) continue;
      const after = result.state.enemies.find((x) => x.id === e.id);
      const planned = walkRoute(map, e, new Set(), rules);
      equal(`${after.q},${after.r}`, `${planned.q},${planned.r}`, `${e.id} kept to its route`);
    }
  }],

  ['Stand-To brings the reserve squad on once', async () => {
    const { map, rules, state } = await loadAll();
    const standTo = { ...state, alert: { ...state.alert, points: rules.alert.states[3].from } };
    const first = runEnemyPhase(standTo, map, rules);
    equal(first.state.enemies.length, state.enemies.length + 1, 'reserve added');
    assert(first.state.reserveDeployed, 'flagged');
    const second = runEnemyPhase(first.state, map, rules);
    equal(second.state.enemies.length, first.state.enemies.length, 'not added twice');
  }],
];
