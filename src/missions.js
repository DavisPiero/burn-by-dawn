// Missions (SPEC.md §12 M27): the game is an engine plus a mission. A mission
// is data only — data/missions.json names its map and roster, patches the
// rules and enemy types as a difficulty level does, and picks its win
// condition from the short fixed list below. No code asks which mission is on.
//
// Pure functions. Nothing here touches the DOM.

import { deepMerge } from './difficulty.js';
import { kindOf } from './sabotage.js';
import { chargeCapacity, onBoard } from './units.js';

export const MISSION_STATUSES = ['playable', 'coming'];

/**
 * The win conditions, in the same spirit as the trait hooks: a short
 * vocabulary, never a branch for one mission. `targets` are the objectives
 * that count toward it and `needed` how many of them must be destroyed.
 *   destroyPrimary                 the objective map.json marks primary
 *   destroyCount { kind, count }   any `count` objectives of that kind
 */
export const WIN_CONDITIONS = {
  destroyPrimary: {
    targets: (state) => state.objectives.filter((o) => o.primary),
    needed: () => 1,
  },
  destroyCount: {
    targets: (state, win) => state.objectives.filter((o) => o.kind === win.kind),
    needed: (win) => win.count,
  },
};

/** Throws unless `win` names a known condition with what that condition needs. */
export function validateWin(win, where) {
  const condition = WIN_CONDITIONS[win?.condition];
  if (!condition) throw new Error(`${where}: "condition" must be one of ${Object.keys(WIN_CONDITIONS).join(', ')}, got ${JSON.stringify(win?.condition)}`);
  if (win.condition === 'destroyCount') {
    if (typeof win.kind !== 'string' || !win.kind) throw new Error(`${where}: destroyCount needs the objective "kind" it counts`);
    if (!Number.isInteger(win.count) || win.count < 1) throw new Error(`${where}: destroyCount needs a whole "count" of 1 or more`);
  }
  return win;
}

/**
 * Check data/missions.json. A playable mission must name everything the
 * engine loads for it; a coming one only what the contents page prints.
 */
export function validateMissions(json, url = 'data/missions.json') {
  if (!Array.isArray(json?.missions) || json.missions.length === 0) throw new Error(`${url}: expected a non-empty "missions" list`);
  const ids = new Set();
  for (const [i, m] of json.missions.entries()) {
    const where = `${url}: missions[${i}]`;
    if (typeof m.id !== 'string' || !m.id) throw new Error(`${where} needs an "id"`);
    if (ids.has(m.id)) throw new Error(`${where} id "${m.id}" is used twice`);
    ids.add(m.id);
    if (!MISSION_STATUSES.includes(m.status)) throw new Error(`${where} "status" must be one of ${MISSION_STATUSES.join(', ')}, got ${JSON.stringify(m.status)}`);
    for (const key of ['title', 'place', 'blurb']) {
      if (typeof m[key] !== 'string' || !m[key]) throw new Error(`${where} needs a "${key}"`);
    }
    if (!Number.isInteger(m.page)) throw new Error(`${where} needs a "page" number for the contents page`);
    if (m.status !== 'playable') continue;
    for (const key of ['tagline', 'map', 'roster', 'briefing', 'titleCard']) {
      if (typeof m[key] !== 'string' || !m[key]) throw new Error(`${where} is playable, so needs a "${key}"`);
    }
    for (const key of ['rules', 'enemies', 'words']) {
      if (typeof m[key] !== 'object' || m[key] === null || Array.isArray(m[key])) throw new Error(`${where} "${key}" must be an object`);
    }
    for (const key of ['lineGoesDead', 'lineIsDown']) {
      if (typeof m.words[key] !== 'string') throw new Error(`${where} "words" needs "${key}"`);
    }
    if (typeof m.endSounds?.success !== 'string' || typeof m.endSounds?.otherwise !== 'string') {
      throw new Error(`${where} "endSounds" needs "success" and "otherwise" cues`);
    }
    validateWin(m.win, `${where}.win`);
  }
  const chosen = json.missions.find((m) => m.id === json.default);
  if (chosen?.status !== 'playable') throw new Error(`${url}: "default" must be a playable mission's id, got ${JSON.stringify(json.default)}`);
  return json;
}

/** The playable mission asked for by `?mission=<id>`, or null if none or not one. */
export function missionFromQuery(search, json) {
  const raw = new URLSearchParams(search).get('mission');
  return json.missions.some((m) => m.id === raw && m.status === 'playable') ? raw : null;
}

/** The playable mission with this id, or the default one. */
export function missionById(json, id) {
  return json.missions.find((m) => m.id === id && m.status === 'playable') ?? json.missions.find((m) => m.id === json.default);
}

/**
 * The rules with the mission's patch merged over them, and its win condition
 * in `rules.mission.win`. A key must already exist in rules.json, as for a
 * difficulty level, except that a mission may add a new objective kind. The
 * input is left as it was.
 */
export function missionRules(mission, rules, url = 'data/missions.json') {
  requireKnownKeys(mission.rules, rules, `${url}: ${mission.id}.rules`, ['objectives']);
  const patched = deepMerge(rules, mission.rules);
  return { ...patched, mission: { ...patched.mission, win: mission.win } };
}

/**
 * The enemy types (enemies.json `types`) with the mission's patch merged over
 * them; a mission may add a new type. Handed to map.js loadMap, so the map's
 * placements are checked against the types the mission plays with.
 */
export function missionEnemyTypes(mission, types, url = 'data/missions.json') {
  requireKnownKeys(mission.enemies, { types }, `${url}: ${mission.id}.enemies`, ['types']);
  return deepMerge({ types }, mission.enemies).types;
}

function requireKnownKeys(patch, base, where, open, path = '') {
  for (const [key, value] of Object.entries(patch)) {
    const here = path ? `${path}.${key}` : key;
    if (open.includes(path)) continue;
    if (!base || typeof base !== 'object' || !(key in base)) throw new Error(`${where}.${here} is not in the file it patches`);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) requireKnownKeys(value, base[key], where, open, here);
  }
}

// --- the win condition, asked by the rules ----------------------------------------

function winOf(rules) {
  return rules.mission.win;
}

/** The objectives that count toward the win, and how many must go. */
export function winTargets(state, rules) {
  const win = winOf(rules);
  const condition = WIN_CONDITIONS[win.condition];
  return { targets: condition.targets(state, win), needed: condition.needed(win) };
}

/** Is the win condition met: enough of its targets destroyed? */
export function winMet(state, rules) {
  const { targets, needed } = winTargets(state, rules);
  return targets.filter((o) => o.destroyed).length >= needed;
}

/**
 * How many charges short the stick is of meeting the win condition: 0 while
 * it can still be met. Charges that could still count are carried by men in
 * the field, lying dropped, or set and burning on a target. A charge on the
 * ground counts only while a man still in the field could carry it (M13): with
 * both sappers and Ox dead, a scout or gunner can never pick one up, and the
 * mission must end rather than drag on. The cheapest targets left are the
 * ones counted.
 */
export function winShortfall(state, rules) {
  const { targets, needed } = winTargets(state, rules);
  const toGo = needed - targets.filter((o) => o.destroyed).length;
  if (toGo <= 0) return 0;
  const wants = targets
    .filter((o) => !o.destroyed)
    .map((o) => Math.max(0, kindOf(o, rules).chargesNeeded - o.detonated - state.charges.filter((c) => c.objectiveId === o.id).length))
    .sort((a, b) => a - b);
  if (wants.length < toGo) return Infinity;
  const want = wants.slice(0, toGo).reduce((n, w) => n + w, 0);
  const carried = state.units.filter(onBoard).reduce((n, u) => n + u.charges, 0);
  const carrier = state.units.some((u) => onBoard(u) && chargeCapacity(u, rules) > 0);
  return Math.max(0, want - carried - (carrier ? state.droppedCharges.length : 0));
}

/**
 * The job in words: "the Rail Bridge", or "3 of the 6 Aircraft". `upper` sets
 * the target's name in capitals, as the orders name places.
 */
export function winWords(state, rules, { upper = false } = {}) {
  const { targets, needed } = winTargets(state, rules);
  const name = (label) => (upper ? label.toUpperCase() : label);
  if (winOf(rules).condition === 'destroyPrimary') return `the ${name(targets[0].label)}`;
  return `${needed} of the ${targets.length} ${name(kindOf(targets[0], rules).label)}`;
}
