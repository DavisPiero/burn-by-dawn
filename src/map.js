// Terrain loading and lookup. Pathing and line of sight also belong in this
// file (SPEC.md §1) but arrive at M2 and M4 — M1 only loads terrain.
//
// Pure functions plus one fetch. Nothing here touches the DOM.

import { rowQStart } from './hex.js';

/**
 * Load and validate the map and the terrain table.
 * Returns a map object: the raw JSON plus a resolved `terrain` table.
 * Throws with a human-readable message if the data is unusable — a
 * data-driven map is only useful if a typo says so out loud.
 */
export async function loadMap(mapUrl = 'data/map.json', terrainUrl = 'data/terrain.json') {
  const [map, terrain] = await Promise.all([fetchJson(mapUrl), fetchJson(terrainUrl)]);
  validate(map, terrain, mapUrl, terrainUrl);
  return { ...map, terrain: terrain.types };
}

async function fetchJson(url) {
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
}

// Column index of an axial coord within its row. Rows are shifted so the
// board is rectangular — see hex.js rowQStart.
export function columnOf(q, r) {
  return q - rowQStart(r);
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
