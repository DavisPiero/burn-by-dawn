// Tracks in the snow (SPEC.md §9 Tracks, M57; MISSION-GUNNERSIDE.md, Its two
// rules). A man who steps onto ground that takes prints (`tracks: true` in
// terrain.json) leaves them there; they fill in after `rules.tracks.turns`
// turns; an enemy that comes onto or beside one finds the whole trail that
// move laid, as it would a parachute. `rules.tracks` null (every mission but
// Gunnerside) turns all of it off.
//
// Pure functions over plain data, as enemy.js is. A print is
// { q, r, unitId, name, trail, turn, inDir, outDir }: `trail` names the one
// move that laid it, `turn` the turn it was laid, and `inDir` / `outDir` the
// hex edges (indexes into NEIGHBOR_DIRS) he came in by and went out by, which
// is all the board needs to turn it the way he walked.

import { directionOf, hexDistance, neighbors } from './hex.js';
import { hexKey, terrainAt } from './map.js';

/** Does this hex take prints? Off where the mission has no tracks. */
export function takesPrints(map, rules, hex) {
  return Boolean(rules?.tracks && map && terrainAt(map, hex.q, hex.r)?.tracks);
}

/**
 * The prints one move lays: on every hex of `path` after the first that takes
 * them, each turned from the hex he came from to the hex he went to next (on
 * the last, straight on the way he came in). Nothing where tracks are off.
 */
export function printsFor(map, rules, unit, path, turn, trail) {
  if (!rules?.tracks || !map) return [];
  const prints = [];
  for (let i = 1; i < path.length; i++) {
    const hex = path[i];
    if (!takesPrints(map, rules, hex)) continue;
    const inDir = directionOf(hex, path[i - 1]);
    const outDir = i + 1 < path.length ? directionOf(hex, path[i + 1]) : (inDir + 3) % 6;
    prints.push({ q: hex.q, r: hex.r, unitId: unit.id, name: unit.shortName, trail, turn, inDir, outDir });
  }
  return prints;
}

/** Lay a move's prints: a hex walked again keeps only the newest. */
export function layPrints(prints, laid) {
  if (laid.length === 0) return prints;
  const fresh = (p) => !laid.some((n) => n.q === p.q && n.r === p.r);
  return [...prints.filter(fresh), ...laid];
}

/**
 * At the end of turn `turn`, the prints laid `tracks.turns - 1` or more turns
 * before are filled in by the wind and the falling snow: laid in turn N, with
 * `turns` 3, they last through the enemy phases of N, N+1 and N+2.
 */
export function agePrints(prints, turn, rules) {
  if (!rules?.tracks || prints.length === 0) return prints;
  return prints.filter((p) => turn - p.turn < rules.tracks.turns - 1);
}

/** How old a print is, 0 the turn it was laid; the board fades it by this. */
export function printAge(print, turn) {
  return turn - print.turn;
}

/** The last turn a print is on the board: it is gone at the end of it. */
export function printFillsTurn(print, rules) {
  return print.turn + rules.tracks.turns - 1;
}

/**
 * The trails an enemy finds where it stood this go (`stood`, the hexes it
 * walked onto in order and where it ended): each trail one of whose prints is
 * on or beside one of those hexes, once, at the first print it came beside.
 * Returns [{ trail, at, hexes }]: `at` the print it found, `hexes` every print
 * of that trail, all of which go.
 */
export function trailsFound(prints, stood) {
  const found = [];
  for (const hex of stood) {
    for (const p of prints) {
      if (hexDistance(hex, p) > 1 || found.some((f) => f.trail === p.trail)) continue;
      found.push({ trail: p.trail, at: p, hexes: prints.filter((o) => o.trail === p.trail) });
    }
  }
  return found;
}

/**
 * The snow where prints laid now would be found next turn (M58c, the
 * operator's: avoiding a find felt like luck): every hex that takes prints on
 * or beside where an enemy stands now, walks through in the coming enemy
 * phase, or ends its go. `before` and `after` are the enemies either side of
 * that phase (main.js's forecast, the same sum the turn will do). A Set of
 * hexKeys; null where the mission has no tracks.
 */
export function watchedSnow(map, rules, before, after) {
  if (!rules?.tracks) return null;
  const stood = [...before, ...after.flatMap((e) => [...(e.walked ?? []), e])];
  const watched = new Set();
  for (const at of stood) {
    for (const hex of [at, ...neighbors(at.q, at.r)]) {
      if (takesPrints(map, rules, hex)) watched.add(hexKey(hex.q, hex.r));
    }
  }
  return watched;
}
