// Terrain loading, lookup and pathing. Line of sight also belongs in this file
// (SPEC.md §1) but arrives at M4.
//
// Pure functions plus one fetch. Nothing here touches the DOM.

import { hexDistance, neighbors, rowQStart } from './hex.js';

/**
 * Load and validate the map and the terrain table.
 * Returns a map object: the raw JSON plus a resolved `terrain` table.
 * Throws with a human-readable message if the data is unusable — a
 * data-driven map is only useful if a typo says so out loud.
 */
export async function loadMap(mapUrl = 'data/map.json', terrainUrl = 'data/terrain.json') {
  const [map, terrain] = await Promise.all([loadJson(mapUrl), loadJson(terrainUrl)]);
  validate(map, terrain, mapUrl, terrainUrl);
  return { ...map, terrain: terrain.types };
}

/**
 * Fetch and parse a JSON data file. Exported because every /data file wants
 * the same cache behaviour and the same loud failure, and map.js is where
 * that behaviour already lived.
 */
export async function loadJson(url) {
  let response;
  try {
    // no-cache, not the default: the whole point of M1 is that editing the
    // JSON and reloading changes the map, and a cached copy silently breaks
    // that. This revalidates, so unchanged files still come back as a 304.
    response = await fetch(url, { cache: 'no-cache' });
  } catch (cause) {
    throw new Error(`Could not fetch ${url}. Is the game being served by ./run.sh?`, { cause });
  }
  if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status} ${response.statusText}`);
  try {
    return await response.json();
  } catch (cause) {
    throw new Error(`${url} is not valid JSON: ${cause.message}`, { cause });
  }
}

function validate(map, terrain, mapUrl, terrainUrl) {
  for (const key of ['width', 'height', 'hexSize']) {
    if (!Number.isInteger(map[key]) || map[key] <= 0) {
      throw new Error(`${mapUrl}: "${key}" must be a positive integer, got ${JSON.stringify(map[key])}`);
    }
  }
  if (!terrain || typeof terrain.types !== 'object') {
    throw new Error(`${terrainUrl}: expected a "types" object`);
  }
  if (!Array.isArray(map.rows) || map.rows.length !== map.height) {
    throw new Error(`${mapUrl}: expected ${map.height} rows, got ${Array.isArray(map.rows) ? map.rows.length : 'none'}`);
  }
  for (const [char, id] of Object.entries(map.legend ?? {})) {
    if (char.length !== 1) throw new Error(`${mapUrl}: legend key "${char}" must be a single character`);
    if (!terrain.types[id]) throw new Error(`${mapUrl}: legend "${char}" names terrain "${id}", which ${terrainUrl} does not define`);
  }
  map.rows.forEach((row, r) => {
    if (typeof row !== 'string' || row.length !== map.width) {
      throw new Error(`${mapUrl}: row ${r} must be ${map.width} characters, got ${typeof row === 'string' ? row.length : typeof row}`);
    }
    for (let i = 0; i < row.length; i++) {
      if (!map.legend?.[row[i]]) {
        throw new Error(`${mapUrl}: row ${r}, column ${i}: "${row[i]}" is not in the legend`);
      }
    }
  });
  // After the rows, so a start hex can trust the grid it indexes into.
  validateStartHexes(map, terrain, mapUrl);
}

// Deployment hexes are placeholders until the drop phase at M6, but a trooper
// standing in a canal is a silent bug, so check them now.
function validateStartHexes(map, terrain, mapUrl) {
  if (!Array.isArray(map.startHexes)) {
    throw new Error(`${mapUrl}: "startHexes" must be an array of [q, r] pairs`);
  }
  const seen = new Set();
  map.startHexes.forEach((hex, i) => {
    if (!Array.isArray(hex) || hex.length !== 2 || !hex.every(Number.isInteger)) {
      throw new Error(`${mapUrl}: startHexes[${i}] must be a [q, r] pair of integers, got ${JSON.stringify(hex)}`);
    }
    const [q, r] = hex;
    if (!inBounds(map, q, r)) {
      throw new Error(`${mapUrl}: startHexes[${i}] (${q}, ${r}) is off the map`);
    }
    if (!isInPlay(map, q, r)) {
      throw new Error(`${mapUrl}: startHexes[${i}] (${q}, ${r}) is an edge hex that is out of play`);
    }
    const id = map.legend[map.rows[r][columnOf(q, r)]];
    if (terrain.types[id].moveCost === null) {
      throw new Error(`${mapUrl}: startHexes[${i}] (${q}, ${r}) is ${id}, which is impassable`);
    }
    const key = `${q},${r}`;
    if (seen.has(key)) throw new Error(`${mapUrl}: startHexes[${i}] (${q}, ${r}) is already used by another trooper`);
    seen.add(key);
  });
}

// Column index of an axial coord within its row. Rows are shifted so the
// board is rectangular — see hex.js rowQStart.
export function columnOf(q, r) {
  return q - rowQStart(r);
}

/**
 * Is this hex actually in play?
 *
 * Because odd rows are sheared half a hex to the right (see hex.js rowQStart),
 * a rectangular grid has a serrated left and right edge. The board is drawn
 * clipped to a straight border, which cuts exactly one hex per row in half:
 * column 0 on even rows, the last column on odd rows — 13 of 234. Those are
 * retired from play rather than left as half-hexes a trooper could stand on
 * and be drawn sliced down the middle. Every in-play hex is a whole hex.
 *
 * The top and bottom borders need no such thing: clipping there only removes
 * the hexes' pointed tips, so those rows stay whole and playable.
 */
export function isInPlay(map, q, r) {
  if (!inBounds(map, q, r)) return false;
  const i = columnOf(q, r);
  return r % 2 === 0 ? i > 0 : i < map.width - 1;
}

export function inBounds(map, q, r) {
  if (r < 0 || r >= map.height) return false;
  const i = columnOf(q, r);
  return i >= 0 && i < map.width;
}

/** Terrain id at an axial coord, or null if the coord is off the map. */
export function terrainIdAt(map, q, r) {
  if (!inBounds(map, q, r)) return null;
  return map.legend[map.rows[r][columnOf(q, r)]];
}

/** Terrain definition at an axial coord, or null if off the map. */
export function terrainAt(map, q, r) {
  const id = terrainIdAt(map, q, r);
  return id === null ? null : map.terrain[id];
}

/** The legend character at an axial coord, or null if off the map. */
export function legendCharAt(map, q, r) {
  if (!inBounds(map, q, r)) return null;
  return map.rows[r][columnOf(q, r)];
}

export function isPassable(terrainDef) {
  return Boolean(terrainDef) && terrainDef.moveCost !== null;
}

/** Every (q, r) on the map, row by row, top-left to bottom-right. */
export function forEachCell(map, callback) {
  for (let r = 0; r < map.height; r++) {
    const qStart = rowQStart(r);
    for (let i = 0; i < map.width; i++) {
      callback(qStart + i, r);
    }
  }
}

// ---------------------------------------------------------------------------
// Pathing. SPEC.md §2: A* over hex neighbours, cost from the terrain table.
// Line of sight also belongs in this file but arrives at M4.
//
// Terrain cost is never written down here — it is read from the loaded terrain
// table, so editing data/terrain.json changes pathing with no code change.

/** Stable string key for an axial coord. Used for visited sets and cost maps. */
export function hexKey(q, r) {
  return `${q},${r}`;
}

/**
 * Cost to enter a hex, or null if it cannot be entered at all — off the map,
 * impassable terrain, or listed in `blocked` (occupied hexes, supplied by the
 * caller; map.js knows nothing about units).
 *
 * `adjust`, if given, turns the terrain's cost into this mover's cost. It is
 * how the onMoveCost trait hook reaches pathing without map.js knowing what a
 * trait is. It never sees impassable hexes, so no trait can make a canal
 * walkable. It must not return less than 1, or the A* heuristic overestimates.
 */
export function enterCost(map, q, r, blocked, adjust = null) {
  if (blocked && blocked.has(hexKey(q, r))) return null;
  if (!isInPlay(map, q, r)) return null;
  const terrain = terrainAt(map, q, r);
  if (!isPassable(terrain)) return null;
  return adjust ? adjust(terrain.moveCost) : terrain.moveCost;
}

/**
 * Cheapest path from `from` to `to`, as an array of coords starting with
 * `from` and ending with `to`. Returns null if no path exists. `blocked` is a
 * Set of hexKey()s that may not be entered. Unbounded by AP — affordability is
 * a unit rule and lives in units.js. `adjust` as for enterCost.
 */
export function findPath(map, from, to, blocked, adjust = null) {
  const startKey = hexKey(from.q, from.r);
  const goalKey = hexKey(to.q, to.r);
  if (startKey === goalKey) return [{ q: from.q, r: from.r }];
  if (enterCost(map, to.q, to.r, blocked, adjust) === null) return null;

  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  // Small board (18x13), so a scanned open list is faster than a heap and
  // very much easier to read.
  const open = [{ q: from.q, r: from.r, f: hexDistance(from, to) }];

  while (open.length > 0) {
    let bestAt = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bestAt].f) bestAt = i;
    const current = open.splice(bestAt, 1)[0];
    const currentKey = hexKey(current.q, current.r);

    if (currentKey === goalKey) return reconstruct(cameFrom, current);

    for (const next of neighbors(current.q, current.r)) {
      const step = enterCost(map, next.q, next.r, blocked, adjust);
      if (step === null) continue;
      const tentative = gScore.get(currentKey) + step;
      const nextKey = hexKey(next.q, next.r);
      if (gScore.has(nextKey) && tentative >= gScore.get(nextKey)) continue;
      gScore.set(nextKey, tentative);
      cameFrom.set(nextKey, current);
      // Every step costs at least 1 — the cheapest terrain, and the onMoveCost
      // floor in traits.js — so plain hex distance never overestimates.
      open.push({ q: next.q, r: next.r, f: tentative + hexDistance(next, to) });
    }
  }
  return null;
}

function reconstruct(cameFrom, end) {
  const path = [{ q: end.q, r: end.r }];
  let cursor = end;
  while (cameFrom.has(hexKey(cursor.q, cursor.r))) {
    cursor = cameFrom.get(hexKey(cursor.q, cursor.r));
    path.unshift({ q: cursor.q, r: cursor.r });
  }
  return path;
}

/**
 * Every hex reachable from `from` for `budget` or less, as a Map of
 * hexKey -> { q, r, cost }. The origin is included at cost 0. Dijkstra, not
 * A*, because there is no single goal. `adjust` as for enterCost.
 */
export function reachableWithin(map, from, budget, blocked, adjust = null) {
  const found = new Map([[hexKey(from.q, from.r), { q: from.q, r: from.r, cost: 0 }]]);
  const frontier = [{ q: from.q, r: from.r, cost: 0 }];

  while (frontier.length > 0) {
    let bestAt = 0;
    for (let i = 1; i < frontier.length; i++) if (frontier[i].cost < frontier[bestAt].cost) bestAt = i;
    const current = frontier.splice(bestAt, 1)[0];

    for (const next of neighbors(current.q, current.r)) {
      const step = enterCost(map, next.q, next.r, blocked, adjust);
      if (step === null) continue;
      const cost = current.cost + step;
      if (cost > budget) continue;
      const key = hexKey(next.q, next.r);
      if (found.has(key) && found.get(key).cost <= cost) continue;
      const entry = { q: next.q, r: next.r, cost };
      found.set(key, entry);
      frontier.push(entry);
    }
  }
  return found;
}
