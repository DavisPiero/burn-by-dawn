// Difficulty levels (SPEC.md §10, M9). A level is data only: a patch over
// data/rules.json and data/enemies.json, merged once when the mission starts.
// Nothing downstream is told which level is on; it just sees the numbers.
//
// Pure functions. Nothing here touches the DOM.

/**
 * Check data/difficulty.json. Every key a patch names must already exist in
 * the file it patches, so a mistyped key fails here instead of quietly
 * changing nothing. `rules` is data/rules.json, `enemies` data/enemies.json.
 */
export function validateDifficulty(json, rules, enemies, url = 'data/difficulty.json') {
  if (!Array.isArray(json?.levels) || json.levels.length === 0) throw new Error(`${url}: expected a non-empty "levels" list`);
  const ids = new Set();
  for (const [i, level] of json.levels.entries()) {
    const where = `${url}: levels[${i}]`;
    if (typeof level.id !== 'string' || !level.id) throw new Error(`${where} needs an "id"`);
    if (ids.has(level.id)) throw new Error(`${where} id "${level.id}" is used twice`);
    ids.add(level.id);
    if (typeof level.label !== 'string' || !level.label) throw new Error(`${where} needs a "label"`);
    if ('musicTempo' in level && !(typeof level.musicTempo === 'number' && level.musicTempo > 0)) throw new Error(`${where} "musicTempo" must be a number above 0`);
    requireKnownKeys(level.rules ?? {}, rules, `${where}.rules`);
    requireKnownKeys(level.enemies ?? {}, enemies, `${where}.enemies`);
  }
  if (!ids.has(json.default)) throw new Error(`${url}: "default" must be one of the level ids, got ${JSON.stringify(json.default)}`);
  return json;
}

function requireKnownKeys(patch, base, where) {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) throw new Error(`${where} must be an object`);
  for (const [key, value] of Object.entries(patch)) {
    if (!base || typeof base !== 'object' || !(key in base)) throw new Error(`${where}.${key} is not in the file it patches`);
    if (isPlainObject(value)) requireKnownKeys(value, base[key], `${where}.${key}`);
  }
}

/** The level asked for by `?difficulty=<id>`, or null if none or not a level. */
export function difficultyFromQuery(search, json) {
  const raw = new URLSearchParams(search).get('difficulty');
  return json.levels.some((l) => l.id === raw) ? raw : null;
}

/** The level with this id, or the default one. */
export function levelById(json, id) {
  return json.levels.find((l) => l.id === id) ?? json.levels.find((l) => l.id === json.default);
}

/**
 * `rules` and the map's `enemyTypes` with the level's patches merged over
 * them. The inputs are left as they were, so switching level before the drop
 * starts again from the files as loaded.
 */
export function applyDifficulty(level, rules, map) {
  return {
    rules: deepMerge(rules, level.rules ?? {}),
    map: { ...map, enemyTypes: deepMerge({ types: map.enemyTypes }, level.enemies ?? {}).types },
  };
}

/** Objects merge key by key; anything else, arrays included, replaces. */
export function deepMerge(base, patch) {
  if (!isPlainObject(patch)) return patch;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) out[key] = deepMerge(base?.[key], value);
  return out;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
