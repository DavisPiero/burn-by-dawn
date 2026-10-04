// Terrain loading, lookup, pathing and line of sight (SPEC.md §1, §2).
//
// Pure functions plus one fetch. Nothing here touches the DOM.

import { DIRECTION_NAMES, hexDistance, hexLine, neighbors, rowQStart } from './hex.js';

/**
 * Load and validate the map, the terrain table and the enemy types.
 * Returns a map object: the raw JSON plus resolved `terrain` and `enemyTypes`
 * tables. Enemy types ride along with the map for the same reason terrain
 * does: the map's placements name them, and they are checked together.
 * Throws with a human-readable message if the data is unusable — a
 * data-driven map is only useful if a typo says so out loud. `patchEnemyTypes`
 * is the mission's patch over the enemy types (missions.js, M27), applied
 * before the placements are checked against them.
 */
export async function loadMap(
  mapUrl = 'data/map.json', terrainUrl = 'data/terrain.json', enemiesUrl = 'data/enemies.json', patchEnemyTypes = (types) => types,
) {
  const [map, terrain, loadedEnemies] = await Promise.all([loadJson(mapUrl), loadJson(terrainUrl), loadJson(enemiesUrl)]);
  const enemies = { ...loadedEnemies, types: patchEnemyTypes(loadedEnemies.types) };
  validate(map, terrain, mapUrl, terrainUrl);
  const loaded = { ...map, terrain: terrain.types };
  validateEnemyTypes(enemies, enemiesUrl);
  validateEnemies(loaded, enemies.types, mapUrl, enemiesUrl);
  return { ...loaded, enemyTypes: enemies.types };
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
  // The railway (SPEC.md §11) is art only, like the church: waypoints the
  // line is drawn through, straight between them. It changes no rule.
  if (map.railway !== undefined) {
    if (!Array.isArray(map.railway) || map.railway.length < 2) {
      throw new Error(`${mapUrl}: "railway" must be a list of at least two [q, r] waypoints`);
    }
    for (const hex of map.railway) {
      if (!Array.isArray(hex) || hex.length !== 2 || !hex.every(Number.isInteger) || !inBounds(map, hex[0], hex[1])) {
        throw new Error(`${mapUrl}: "railway" waypoint ${JSON.stringify(hex)} must be a [q, r] pair on the map`);
      }
    }
  }
  // Place names (SPEC.md §11) are art only too.
  for (const place of map.places ?? []) {
    const at = place?.at;
    if (typeof place?.name !== 'string' || place.name === '' || !Array.isArray(at) || at.length !== 2
      || !at.every(Number.isInteger) || !inBounds(map, at[0], at[1])) {
      throw new Error(`${mapUrl}: every "places" entry needs a "name" and an "at" [q, r] on the map, got ${JSON.stringify(place)}`);
    }
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
}

const ENEMY_TYPE_FIELDS = ['visionRadius', 'arcDegrees', 'detection', 'speed'];

function validateEnemyTypes(json, url) {
  if (!json || typeof json.types !== 'object' || Array.isArray(json.types)) {
    throw new Error(`${url}: expected a "types" object of id -> enemy type`);
  }
  for (const [id, type] of Object.entries(json.types)) {
    if (typeof type.label !== 'string' || type.label === '') throw new Error(`${url}: type "${id}" needs a "label"`);
    for (const field of ENEMY_TYPE_FIELDS) {
      if (!Number.isInteger(type[field]) || type[field] < 0) {
        throw new Error(`${url}: type "${id}" "${field}" must be a non-negative integer, got ${JSON.stringify(type[field])}`);
      }
    }
    if (typeof type.killable !== 'boolean') throw new Error(`${url}: type "${id}" "killable" must be true or false`);
  }
}

/**
 * Enemy placements (SPEC.md §6). A post stands on `at` and never moves — it
 * may stand on an emplacement, which §3 calls an enemy position and nobody
 * else may enter. A patrol walks `route`, a list of waypoints, starting on the
 * first: `loop` true goes last-to-first, false walks back the way it came.
 * Every leg of a route must actually be walkable, or the patrol silently
 * stands still forever.
 */
function validateEnemies(map, types, mapUrl, enemiesUrl) {
  if (!Array.isArray(map.enemies)) throw new Error(`${mapUrl}: "enemies" must be an array`);
  const ids = new Set();
  const standing = new Map();

  const checkHex = (hex, where, needPassable) => {
    if (!Array.isArray(hex) || hex.length !== 2 || !hex.every(Number.isInteger)) {
      throw new Error(`${where} must be a [q, r] pair of integers, got ${JSON.stringify(hex)}`);
    }
    const [q, r] = hex;
    if (!isInPlay(map, q, r)) throw new Error(`${where} (${q}, ${r}) is off the map or out of play`);
    if (needPassable && !isPassable(terrainAt(map, q, r))) {
      throw new Error(`${where} (${q}, ${r}) is ${terrainIdAt(map, q, r)}, which is impassable`);
    }
  };
  const checkFacing = (facing, where) => {
    if (!DIRECTION_NAMES.includes(facing)) {
      throw new Error(`${where} "facing" must be one of ${DIRECTION_NAMES.join(', ')}, got ${JSON.stringify(facing)}`);
    }
  };

  map.enemies.forEach((enemy, i) => {
    const where = `${mapUrl}: enemies[${i}]`;
    if (typeof enemy.id !== 'string' || enemy.id === '') throw new Error(`${where} needs an "id"`);
    if (ids.has(enemy.id)) throw new Error(`${where} id "${enemy.id}" is used twice`);
    ids.add(enemy.id);
    if (typeof enemy.label !== 'string' || enemy.label === '') throw new Error(`${where} needs a "label"`);
    const type = types[enemy.type];
    if (!type) throw new Error(`${where} has type "${enemy.type}", which ${enemiesUrl} does not define`);
    checkFacing(enemy.facing, where);

    let start;
    if (enemy.route !== undefined) {
      if (enemy.at !== undefined) throw new Error(`${where} has both "at" and "route"; a post has one, a patrol the other`);
      if (type.speed === 0) throw new Error(`${where} walks a route, but type "${enemy.type}" has speed 0`);
      if (!Array.isArray(enemy.route) || enemy.route.length < 2) throw new Error(`${where} "route" needs at least two waypoints`);
      if (typeof enemy.loop !== 'boolean') throw new Error(`${where} needs "loop": true or false`);
      enemy.route.forEach((hex, w) => checkHex(hex, `${where} route[${w}]`, true));
      const legs = enemy.route.map((hex, w) => [hex, enemy.route[w + 1] ?? (enemy.loop ? enemy.route[0] : null)]);
      for (const [a, b] of legs) {
        if (!b) continue;
        if (!findPath(map, { q: a[0], r: a[1] }, { q: b[0], r: b[1] }, null)) {
          throw new Error(`${where} cannot walk from (${a}) to (${b})`);
        }
      }
      start = enemy.route[0];
    } else {
      checkHex(enemy.at, `${where} "at"`, false);
      start = enemy.at;
    }
    const key = hexKey(start[0], start[1]);
    if (standing.has(key)) throw new Error(`${where} starts on (${start}), already taken by ${standing.get(key)}`);
    standing.set(key, `enemies[${i}]`);
  });

  // The reserve squad of SPEC.md §6, which enters from the road edge at Alarmed.
  const reserve = map.reserve;
  if (!reserve) throw new Error(`${mapUrl}: needs a "reserve" object`);
  const where = `${mapUrl}: reserve`;
  if (typeof reserve.id !== 'string' || ids.has(reserve.id)) throw new Error(`${where} needs a unique "id"`);
  if (typeof reserve.label !== 'string' || reserve.label === '') throw new Error(`${where} needs a "label"`);
  if (!types[reserve.type]) throw new Error(`${where} has type "${reserve.type}", which ${enemiesUrl} does not define`);
  checkFacing(reserve.facing, where);
  if (!Array.isArray(reserve.entryHexes) || reserve.entryHexes.length === 0) {
    throw new Error(`${where} needs at least one "entryHexes" [q, r]`);
  }
  reserve.entryHexes.forEach((hex, i) => checkHex(hex, `${where} entryHexes[${i}]`, true));
  // Where it stands watching the exfil once it is on (SPEC.md §6 Exfil watched).
  checkHex(reserve.guardHex, `${where} guardHex`, true);
  checkFacing(reserve.guardFacing, `${where} guard`);
  if (!findPath(map, { q: reserve.entryHexes[0][0], r: reserve.entryHexes[0][1] }, { q: reserve.guardHex[0], r: reserve.guardHex[1] }, null)) {
    throw new Error(`${where} cannot walk from entryHexes[0] to guardHex`);
  }

  // Reinforcements (M21b, SPEC.md §6): optional; squads called up when a target goes up.
  const help = map.reinforcements;
  if (help === undefined) return;
  const at = `${mapUrl}: reinforcements`;
  if (typeof help.id !== 'string' || ids.has(help.id) || help.id === reserve.id) throw new Error(`${at} needs a unique "id"`);
  if (typeof help.label !== 'string' || help.label === '') throw new Error(`${at} needs a "label"`);
  if (!types[help.type]) throw new Error(`${at} has type "${help.type}", which ${enemiesUrl} does not define`);
  checkFacing(help.facing, at);
  if (!Array.isArray(help.entryHexes) || help.entryHexes.length === 0) throw new Error(`${at} needs at least one "entryHexes" [q, r]`);
  help.entryHexes.forEach((hex, i) => checkHex(hex, `${at} entryHexes[${i}]`, true));
  if (!Array.isArray(help.posts) || help.posts.length === 0) throw new Error(`${at} needs at least one of "posts"`);
  help.posts.forEach((post, i) => {
    checkHex(post.guardHex, `${at} posts[${i}] guardHex`, true);
    checkFacing(post.guardFacing, `${at} posts[${i}] guard`);
    if (!findPath(map, { q: help.entryHexes[0][0], r: help.entryHexes[0][1] }, { q: post.guardHex[0], r: post.guardHex[1] }, null)) {
      throw new Error(`${at} cannot walk from entryHexes[0] to posts[${i}]`);
    }
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
  // An exfil that has not opened yet is no ground at all (sabotage.js effectiveMap, M40).
  if (map.closed?.has(hexKey(q, r))) return null;
  // A charge point may cost less than its ground (sabotage.js effectiveMap).
  const cost = map.moveCosts?.get(hexKey(q, r)) ?? terrain.moveCost;
  return adjust ? adjust(cost) : cost;
}

/** What entering this hex costs before any trait: its ground's, or a charge point's own. */
export function moveCostAt(map, q, r) {
  const terrain = terrainAt(map, q, r);
  if (!isPassable(terrain) || map.closed?.has(hexKey(q, r))) return null;
  return map.moveCosts?.get(hexKey(q, r)) ?? terrain.moveCost;
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

// ---------------------------------------------------------------------------
// Line of sight. SPEC.md §2: a hex line, blocked by terrain whose blocksLOS is
// set (wood, farmhouse, ridge in data/terrain.json).
//
// Only the hexes strictly between the two ends block. The viewer's own hex
// does not — a sentry on a ridge sees off it — and neither does the target's:
// a man standing in a wood is behind heavy cover, which the detection score
// already counts, and letting the wood block too would count it twice and make
// him invisible from every angle. Units never block.

export function hasLineOfSight(map, from, to) {
  const line = hexLine(from, to);
  for (let i = 1; i < line.length - 1; i++) {
    const terrain = terrainAt(map, line[i].q, line[i].r);
    if (terrain && terrain.blocksLOS) return false;
  }
  return true;
}
