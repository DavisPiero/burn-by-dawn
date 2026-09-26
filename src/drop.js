// The drop (SPEC.md §9): three runs to choose from, seeded scatter, where each
// man comes down and what the ground does to him, and the parachute he leaves.
//
// Pure functions. The only randomness is the generator handed in, made from
// the seed in state (rng.js), so a seed and a chosen run always land the stick
// the same way. Numbers are data/rules.json `landing`; which terrain is a bad
// landing or wounds is data/terrain.json `landing`; the runs are data/map.json.
//
// A run is a flight line from `from` to `to`. The men jump in roster order
// from the `jumpAt`-th hex of that line, one every `spacing` hexes, so a
// seventh man needs no map edit — he jumps one further along. Each man then
// scatters 1–2 hexes, rarely 3 (`scatterWeights`), leaning downwind
// (`windWeights`), onto ground he can come down on.

import { applyHit } from './enemy.js';
import { DIRECTION_NAMES, NEIGHBOR_DIRS, axialToPixel, hexDistance, hexLine, hexRing } from './hex.js';
import { hexKey, inBounds, isInPlay, isPassable, terrainAt } from './map.js';
import { isExfil } from './sabotage.js';
import { applyHook } from './traits.js';
import { fillActionPoints, woundedLine } from './units.js';

const LANDING_KINDS = ['bad', 'wounds'];

/**
 * Check the drop runs in map.json, the landing numbers in rules.json and the
 * `landing` field in terrain.json, for a stick of `count` men. Throws naming
 * the file and the run, because a run whose jump points walk off the map would
 * put a man nowhere.
 */
export function validateDrop(map, rules, count, mapUrl = 'data/map.json', rulesUrl = 'data/rules.json') {
  const landing = rules.landing;
  const weights = landing?.scatterWeights;
  if (!Array.isArray(weights) || weights.length === 0 || !weights.every((w) => Number.isInteger(w) && w >= 0) || !weights.some((w) => w > 0)) {
    throw new Error(`${rulesUrl}: "landing.scatterWeights" must be a list of non-negative integers, one per scatter distance from 0, with at least one above 0`);
  }
  for (const key of ['downwind', 'across', 'upwind']) {
    if (!Number.isInteger(landing.windWeights?.[key]) || landing.windWeights[key] < 0) {
      throw new Error(`${rulesUrl}: "landing.windWeights.${key}" must be a non-negative integer`);
    }
  }
  if (!Number.isInteger(landing.enemyClearance) || landing.enemyClearance < 0) {
    throw new Error(`${rulesUrl}: "landing.enemyClearance" must be a non-negative integer`);
  }
  for (const [id, terrain] of Object.entries(map.terrain)) {
    if (terrain.landing !== undefined && !LANDING_KINDS.includes(terrain.landing)) {
      throw new Error(`data/terrain.json: "${id}" "landing" must be one of ${LANDING_KINDS.join(', ')}, got ${JSON.stringify(terrain.landing)}`);
    }
  }

  const runs = map.dropRuns;
  if (!Array.isArray(runs) || runs.length === 0) throw new Error(`${mapUrl}: needs a "dropRuns" list`);
  const ids = new Set();
  runs.forEach((run, i) => {
    const where = `${mapUrl}: dropRuns[${i}]`;
    if (typeof run.id !== 'string' || run.id === '' || ids.has(run.id)) throw new Error(`${where} needs a unique "id"`);
    ids.add(run.id);
    for (const key of ['label', 'description']) {
      if (typeof run[key] !== 'string' || run[key] === '') throw new Error(`${where} needs a "${key}"`);
    }
    for (const key of ['from', 'to']) {
      const hex = run[key];
      if (!Array.isArray(hex) || hex.length !== 2 || !hex.every(Number.isInteger) || !inBounds(map, hex[0], hex[1])) {
        throw new Error(`${where} "${key}" must be a [q, r] on the map, got ${JSON.stringify(hex)}`);
      }
    }
    if (!Number.isInteger(run.jumpAt) || run.jumpAt < 0) throw new Error(`${where} "jumpAt" must be a non-negative integer`);
    if (!Number.isInteger(run.spacing) || run.spacing < 1) throw new Error(`${where} "spacing" must be a positive integer`);
    if (!DIRECTION_NAMES.includes(run.wind)) throw new Error(`${where} "wind" must be one of ${DIRECTION_NAMES.join(', ')}`);
    const line = flightLine(run);
    const last = run.jumpAt + (count - 1) * run.spacing;
    if (last >= line.length) {
      throw new Error(`${where} "${run.id}": ${count} men need ${last + 1} hexes of flight line, and it has ${line.length}`);
    }
    jumpPoints(run, count).forEach((p, n) => {
      if (!isInPlay(map, p.q, p.r)) throw new Error(`${where} "${run.id}": man ${n + 1} would jump over (${p.q}, ${p.r}), which is out of play`);
    });
  });
}

export function runById(map, id) {
  return map.dropRuns.find((run) => run.id === id) ?? null;
}

/** Every hex the aircraft crosses, from `from` to `to`. */
export function flightLine(run) {
  return hexLine({ q: run.from[0], r: run.from[1] }, { q: run.to[0], r: run.to[1] });
}

/** Where each of `count` men jumps, in roster order. */
export function jumpPoints(run, count) {
  const line = flightLine(run);
  return Array.from({ length: count }, (_, i) => line[run.jumpAt + i * run.spacing]);
}

/**
 * Can a man come down on this hex? In play, not the exfil, ground he can stand
 * on or water that wounds him, nobody already there, and not within
 * `enemyClearance` hexes of an enemy — a man who has lost his turn to a marsh
 * beside a patrol would be shot before he could do anything, which is the
 * unfair turn 1 SPEC.md §9 rules out. Vision arcs are allowed: the player sees
 * them and has turn 1 to get out.
 */
export function canLandOn(map, rules, hex, taken, enemies, { clearance = true } = {}) {
  if (!isInPlay(map, hex.q, hex.r) || isExfil(map, hex)) return false;
  const terrain = terrainAt(map, hex.q, hex.r);
  if (!isPassable(terrain) && terrain.landing !== 'wounds') return false;
  if (taken.has(hexKey(hex.q, hex.r))) return false;
  if (clearance && enemies.some((e) => hexDistance(e, hex) <= rules.landing.enemyClearance)) return false;
  return true;
}

/**
 * Where a man who came down on `hex` ends up, and how: `clean`, `bad` (he
 * loses turns) or `wounds` (in the water: wounded, and he drags himself out on
 * the nearest bank he could have landed on). Null if he somehow cannot get out
 * at all.
 */
export function resolveLanding(map, rules, hex, taken, enemies) {
  const terrain = terrainAt(map, hex.q, hex.r);
  if (terrain.landing !== 'wounds') return { q: hex.q, r: hex.r, kind: terrain.landing ?? 'clean', splash: null };
  const dry = (h, clearance) => canLandOn(map, rules, h, taken, enemies, { clearance })
    && terrainAt(map, h.q, h.r).landing !== 'wounds';
  // Nearest bank first; clear of the garrison if there is one, anywhere dry if not.
  for (const clearance of [true, false]) {
    for (let d = 1; d <= map.width + map.height; d++) {
      const ashore = hexRing(hex, d).find((h) => dry(h, clearance));
      if (ashore) return { q: ashore.q, r: ashore.r, kind: 'wounds', splash: { q: hex.q, r: hex.r } };
    }
  }
  return null;
}

/**
 * Roll where every man comes down on this run. Returns one landing per man in
 * roster order: { unitId, aim, rolled, distance, q, r } — the hex he came down
 * on, before any water puts him ashore (landStick does that).
 *
 * Distance: rolled from `scatterWeights`, then the onLand hook's
 * scatterDistance. If nowhere at that distance will take him, the nearest
 * distance that will, closer first.
 * Direction: among the hexes at that distance, weighted by `windWeights` —
 * downwind within 60° of the wind, upwind within 60° of against it, across
 * otherwise.
 */
export function scatterStick(map, rules, run, units, enemies, rng) {
  const points = jumpPoints(run, units.length);
  const taken = new Set();
  const wind = axialToPixel(NEIGHBOR_DIRS[DIRECTION_NAMES.indexOf(run.wind)].q, NEIGHBOR_DIRS[DIRECTION_NAMES.indexOf(run.wind)].r, 1);
  const { windWeights } = rules.landing;

  return units.map((unit, i) => {
    const aim = points[i];
    const rolled = rng.weighted(rules.landing.scatterWeights);
    const distance = applyHook(unit, 'onLand', 'scatterDistance', rolled).value;
    const limit = map.width + map.height;
    const tries = [distance];
    for (let step = 1; step <= limit; step++) {
      if (distance - step >= 0) tries.push(distance - step);
      tries.push(distance + step);
    }

    for (const d of tries) {
      const ring = hexRing(aim, d).filter((h) => canLandOn(map, rules, h, taken, enemies));
      const weights = ring.map((h) => windWeight(aim, h, wind, windWeights));
      const pick = rng.weighted(weights);
      if (pick < 0) continue;
      const hex = ring[pick];
      const settled = resolveLanding(map, rules, hex, taken, enemies);
      if (!settled) continue;
      taken.add(hexKey(settled.q, settled.r));
      return { unitId: unit.id, aim, rolled, distance: d, q: hex.q, r: hex.r };
    }
    throw new Error(`${run.label}: nowhere on the map for ${unit.shortName} to land`);
  });
}

function windWeight(aim, hex, wind, weights) {
  const v = axialToPixel(hex.q - aim.q, hex.r - aim.r, 1);
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return weights.across;
  const cos = (v.x * wind.x + v.y * wind.y) / (len * Math.hypot(wind.x, wind.y));
  if (cos >= 0.5 - 1e-9) return weights.downwind;
  if (cos <= -0.5 + 1e-9) return weights.upwind;
  return weights.across;
}

/**
 * Every hex a man on this run could come down on, for the drop preview: within
 * his furthest scatter of his jump point and somewhere he could land. It shows
 * the spread, never the roll.
 */
export function dropArea(map, rules, run, units, enemies) {
  const points = jumpPoints(run, units.length);
  const furthest = rules.landing.scatterWeights.findLastIndex((w) => w > 0);
  const area = new Map();
  units.forEach((unit, i) => {
    const reach = applyHook(unit, 'onLand', 'scatterDistance', furthest).value;
    for (let d = 0; d <= reach; d++) {
      for (const h of hexRing(points[i], d)) {
        if (canLandOn(map, rules, h, new Set(), enemies)) area.set(hexKey(h.q, h.r), h);
      }
    }
  });
  return area;
}

/**
 * Put the stick on the ground. `landings` is scatterStick's list, or any list
 * of { unitId, q, r } — tests land men exactly where they need them. In roster
 * order each man:
 *   - on a `bad` terrain loses the onLand hook's landingPenalty turns (from
 *     rules.json landing.badLandingTurnsLost);
 *   - in `wounds` water is hit once (his charges drop where he gets out) and
 *     comes ashore on the nearest bank;
 *   - leaves his parachute on the hex he ends up on (SPEC.md §9).
 * Then pools are filled — the command radius is measured where they landed —
 * and play begins. Returns { state, events }.
 */
export function landStick(state, landings, map, rules) {
  const taken = new Set();
  const events = [];
  let droppedCharges = state.droppedCharges;
  let bodies = state.bodies;
  const parachutes = [];
  const byId = new Map(landings.map((l) => [l.unitId, l]));

  const units = state.units.map((unit) => {
    const landing = byId.get(unit.id);
    if (!landing) return unit;
    const settled = resolveLanding(map, rules, landing, taken, state.enemies);
    if (!settled) throw new Error(`${unit.shortName} cannot get out of the water at (${landing.q}, ${landing.r})`);
    taken.add(hexKey(settled.q, settled.r));
    const terrain = terrainAt(map, landing.q, landing.r);
    let next = { ...unit, q: settled.q, r: settled.r, landed: true, trail: [] };
    const event = {
      kind: 'landed', unitId: unit.id, unitName: unit.shortName, q: settled.q, r: settled.r,
      terrain: terrain.label, outcome: settled.kind, distance: landing.distance ?? null, turnsLost: 0, splash: settled.splash,
      line: unit.dialogue?.onLand ?? null,
    };

    if (settled.kind === 'bad') {
      const lost = applyHook(unit, 'onLand', 'landingPenalty', rules.landing.badLandingTurnsLost).value;
      next = { ...next, turnsLost: lost };
      event.turnsLost = lost;
    } else if (settled.kind === 'wounds') {
      const hit = applyHit(unit, rules);
      event.line = woundedLine(unit);
      if (unit.charges > 0) {
        droppedCharges = [...droppedCharges, ...Array.from({ length: unit.charges }, () => ({ q: settled.q, r: settled.r }))];
      }
      next = { ...next, ...hit, inContact: false };
      if (hit.dead) {
        bodies = [...bodies, { unitId: unit.id, name: unit.shortName, q: settled.q, r: settled.r, found: false }];
        event.dead = true;
      }
    }
    parachutes.push({ unitId: unit.id, name: unit.shortName, q: settled.q, r: settled.r });
    events.push(event);
    return next;
  });

  return {
    state: {
      ...state,
      phase: 'play',
      units: fillActionPoints(units, rules),
      parachutes,
      droppedCharges,
      bodies,
      report: events,
      selectedUnitId: null,
      hoverHex: null,
    },
    events,
  };
}
