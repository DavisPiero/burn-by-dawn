// Missions (SPEC.md §12 M27): the game is an engine plus a mission. A mission
// is data only — data/missions.json names its map and roster, patches the
// rules and enemy types as a difficulty level does, and picks its win
// condition from the short fixed list below. No code asks which mission is on.
//
// Pure functions. Nothing here touches the DOM.

import { deepMerge } from './difficulty.js';
import { chainFrom, kindOf } from './sabotage.js';
import { chargeRoom, onBoard } from './units.js';

export const MISSION_STATUSES = ['playable', 'draft', 'coming'];

// A mission that can be played: `playable`, or `draft` (M28), which the
// contents page stamps as coming but `?mission=` still opens.
const PLAYS = ['playable', 'draft'];
export const canPlay = (m) => PLAYS.includes(m?.status);

// The mission's own phrases, which the engine's text needs (SPEC.md §10).
const WORDS = ['lineGoesDead', 'lineIsDown', 'diversionName', 'diversionKicker', 'diversionLog'];

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
    if (m.panel !== undefined && (typeof m.panel !== 'string' || !m.panel)) throw new Error(`${where} "panel" must name a picture`);
    if (!canPlay(m)) continue;
    // A mission's own pictures (M29b its portraits, M43 its garrison's chips):
    // each a folder, optional.
    for (const key of ['portraits', 'enemyChips']) {
      if (m[key] !== undefined && (typeof m[key] !== 'string' || !m[key])) throw new Error(`${where} "${key}" must name a folder`);
    }
    // Its garrison drawn in a kit of its own until painted (M48g: the umpires), optional.
    if (m.enemyKit !== undefined && (typeof m.enemyKit !== 'string' || !m.enemyKit)) throw new Error(`${where} "enemyKit" must name a drawn kit`);
    // A word printed by its line on the contents page (M48g: START HERE), optional.
    if (m.flag !== undefined && (typeof m.flag !== 'string' || !m.flag)) throw new Error(`${where} "flag" must be a word or two`);
    // A course (M47, SPEC.md §15): the file its lessons are in, optional.
    if (m.lessons !== undefined && (typeof m.lessons !== 'string' || !m.lessons)) throw new Error(`${where} "lessons" must name a lessons file`);
    for (const key of ['tagline', 'map', 'roster', 'briefing', 'titleCard']) {
      if (typeof m[key] !== 'string' || !m[key]) throw new Error(`${where} can be played, so needs a "${key}"`);
    }
    for (const key of ['rules', 'enemies', 'words']) {
      if (typeof m[key] !== 'object' || m[key] === null || Array.isArray(m[key])) throw new Error(`${where} "${key}" must be an object`);
    }
    for (const key of WORDS) {
      if (typeof m.words[key] !== 'string') throw new Error(`${where} "words" needs "${key}"`);
    }
    // The orders' line about the clean run (M32c), optional.
    if (m.words.cleanOrders !== undefined && (typeof m.words.cleanOrders !== 'string' || !m.words.cleanOrders)) throw new Error(`${where} "words.cleanOrders" must be words`);
    // The rest of the optional words: the orders' own line, the first turn's, who fired first,
    // and the diversion's device, verb and card (M60, the heavy water plant).
    for (const key of ['cleanBonus', 'ordersLine', 'firstTurn', 'firstShotHeard', 'diversionDevice', 'diversionVerb', 'diversionWorked', 'diversionSpent']) {
      if (m.words[key] !== undefined && (typeof m.words[key] !== 'string' || !m.words[key])) throw new Error(`${where} "words.${key}" must be words`);
    }
    for (const key of ['levels', 'dialogue']) {
      if (m[key] !== undefined && (typeof m[key] !== 'object' || m[key] === null || Array.isArray(m[key]))) throw new Error(`${where} "${key}" must be an object`);
    }
    for (const [id, part] of Object.entries(m.levels ?? {})) {
      if (part.summary !== undefined && (typeof part.summary !== 'string' || !part.summary)) throw new Error(`${where} levels.${id}.summary must be words`);
      for (const key of ['rules', 'enemies']) {
        if (part[key] !== undefined && (typeof part[key] !== 'object' || part[key] === null || Array.isArray(part[key]))) throw new Error(`${where} levels.${id}.${key} must be an object`);
      }
    }
    // Cues played in place of the usual ones (M60): { usual: its own }.
    if (m.cues !== undefined && (typeof m.cues !== 'object' || m.cues === null || Array.isArray(m.cues) || Object.values(m.cues).some((c) => typeof c !== 'string' || !c))) throw new Error(`${where} "cues" must map cue names to cue names`);
    if (m.diversionSound !== undefined && (typeof m.diversionSound !== 'string' || !m.diversionSound)) throw new Error(`${where} "diversionSound" must name a sound cue`);
    for (const [moment, panel] of Object.entries(m.comicPanels ?? {})) {
      // One file, or a list tried in order (M55): the mission's own, then the shared one.
      const art = [panel?.art].flat();
      if (!art.length || art.some((a) => typeof a !== 'string' || !a)) throw new Error(`${where} comicPanels.${moment} needs "art", a file or a list of files`);
      if (panel.caption !== undefined && typeof panel.caption !== 'string') throw new Error(`${where} comicPanels.${moment}.caption must be words`);
    }
    if (m.titleCardLettered !== undefined && typeof m.titleCardLettered !== 'boolean') throw new Error(`${where} "titleCardLettered" must be true or false`);
    if (typeof m.endSounds?.success !== 'string' || typeof m.endSounds?.otherwise !== 'string') {
      throw new Error(`${where} "endSounds" needs "success" and "otherwise" cues`);
    }
    if (m.music !== undefined && (typeof m.music !== 'string' || !m.music)) throw new Error(`${where} "music" must name a music track`);
    validateWin(m.win, `${where}.win`);
    if (m.ratings !== undefined) {
      if (!Array.isArray(m.ratings) || m.ratings.length === 0) throw new Error(`${where} "ratings" must be a non-empty list`);
      for (const [n, r] of m.ratings.entries()) {
        if (!Number.isInteger(r?.from) || typeof r.label !== 'string' || !r.label) throw new Error(`${where} ratings[${n}] needs a whole "from" score and a "label"`);
        if (n === 0 ? r.from !== 0 : r.from <= m.ratings[n - 1].from) throw new Error(`${where} "ratings" must start from 0 and rise`);
      }
    }
  }
  const chosen = json.missions.find((m) => m.id === json.default);
  if (!canPlay(chosen)) throw new Error(`${url}: "default" must be a playable mission's id, got ${JSON.stringify(json.default)}`);
  return json;
}

/**
 * The back page's verdict on a mission accomplished (M32, SPEC.md §10): the
 * mission's `ratings` are score bands, lowest first, each `{ from, label }`.
 * Returns the whole ladder with each band's span and which one `total` earns,
 * or null where the mission has none. Only a success is rated: the outcome's
 * own word is the verdict on the rest.
 */
export function ratingOf(mission, total) {
  const ratings = mission?.ratings;
  if (!ratings) return null;
  let earned = 0;
  ratings.forEach((r, i) => { if (total >= r.from) earned = i; });
  const ladder = ratings.map((r, i) => ({ label: r.label, from: r.from, to: i + 1 < ratings.length ? ratings[i + 1].from - 1 : null, earned: i === earned }));
  return { label: ratings[earned].label, ladder };
}

/** The mission asked for by `?mission=<id>`, if it can be played (a draft too), or null. */
export function missionFromQuery(search, json) {
  const raw = new URLSearchParams(search).get('mission');
  return json.missions.some((m) => m.id === raw && canPlay(m)) ? raw : null;
}

/** The mission with this id if it can be played, or the default one. */
export function missionById(json, id) {
  return json.missions.find((m) => m.id === id && canPlay(m)) ?? json.missions.find((m) => m.id === json.default);
}

/**
 * data/difficulty.json with the mission's own part of each level (M28): its
 * `rules` and `enemies` patches carried on the level as `mission`, which
 * difficulty.js applyDifficulty merges after the level's own, and its summary
 * printed before the level's. Every key must already exist in the files as
 * the mission and the level have patched them, and a level the mission names
 * must exist. The input is left as it was.
 */
export function missionLevels(mission, difficulty, rules, enemyTypes, url = 'data/missions.json') {
  for (const id of Object.keys(mission.levels ?? {})) {
    if (!difficulty.levels.some((l) => l.id === id)) throw new Error(`${url}: ${mission.id}.levels.${id} is not a level in data/difficulty.json`);
  }
  return {
    ...difficulty,
    levels: difficulty.levels.map((level) => {
      const part = mission.levels?.[level.id];
      const levelRules = deepMerge(rules, level.rules ?? {});
      if (!part) return { ...level, summary: fillSummary(level.summary, levelRules) };
      const levelTypes = deepMerge({ types: enemyTypes }, level.enemies ?? {});
      requireKnownKeys(part.rules ?? {}, levelRules, `${url}: ${mission.id}.levels.${level.id}.rules`, []);
      requireKnownKeys(part.enemies ?? {}, levelTypes, `${url}: ${mission.id}.levels.${level.id}.enemies`, []);
      const own = fillSummary(level.summary, deepMerge(levelRules, part.rules ?? {}));
      return {
        ...level,
        summary: part.summary ? `${part.summary} ${own}` : own,
        mission: { rules: part.rules ?? {}, enemies: part.enemies ?? {} },
      };
    }),
  };
}

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/**
 * A level's summary with its numbers filled in from the rules it plays by
 * (M59b): `{minimumOut}` is how many men must get out, as a word, so a mission
 * whose own part of a level asks for a different number is not told the
 * level's (Gunnerside's Hard asks three, every other mission's four).
 */
function fillSummary(summary, levelRules) {
  const out = levelRules.mission?.minimumOut;
  return summary.replace('{minimumOut}', COUNT_WORDS[out] ?? String(out));
}

/**
 * The roster with the mission's `dialogue` (M28) over each man's lines: the
 * same six men, with lines that fit where they are. A man it names must be in
 * the roster, and it may only replace lines, not his other particulars.
 */
export function missionRoster(mission, roster, url = 'data/missions.json') {
  const dialogue = mission.dialogue ?? {};
  for (const id of Object.keys(dialogue)) {
    if (!roster.troopers?.some((t) => t.id === id)) throw new Error(`${url}: ${mission.id}.dialogue.${id} is not a man in ${mission.roster}`);
  }
  if (Object.keys(dialogue).length === 0) return roster;
  return {
    ...roster,
    troopers: roster.troopers.map((t) => (dialogue[t.id] ? { ...t, dialogue: { ...t.dialogue, ...dialogue[t.id] } } : t)),
  };
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
    // A null in the file is "none here", which a patch may fill in whole (M30: charges.fuseChoice).
    if (base[key] === null) continue;
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

/** Does this objective count toward the win? */
export function isWinTarget(state, rules, objective) {
  return winTargets(state, rules).targets.some((o) => o.id === objective.id);
}

/**
 * The job's targets still to do: every one while the condition can pick any
 * `needed` of them, none once it is met.
 */
export function winTargetsLeft(state, rules) {
  if (winMet(state, rules)) return [];
  return winTargets(state, rules).targets.filter((o) => !o.destroyed);
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
 * ones counted. An intact objective that sets its neighbours off (M30, the
 * bowser) is one more way: its charges for every target it would take; and
 * any set of them together (M33, the bomb store beside it).
 */
export function winShortfall(state, rules) {
  const want = chargesForWin(state, rules);
  if (want === 0) return 0;
  const carried = state.units.filter(onBoard).reduce((n, u) => n + u.charges, 0);
  const carrier = state.units.some((u) => onBoard(u) && chargeRoom(u, rules) > 0);
  return Math.max(0, want - carried - (carrier ? state.droppedCharges.length : 0));
}

/** The charges still to set for the win, by its cheapest way (winShortfall). */
function chargesForWin(state, rules) {
  const { targets, needed } = winTargets(state, rules);
  const toGo = needed - targets.filter((o) => o.destroyed).length;
  if (toGo <= 0) return 0;
  const still = (o) => stillWanted(state, rules, o);
  const cheapest = (left, count) => {
    const wants = left.map(still).sort((a, b) => a - b);
    return wants.length < count ? Infinity : wants.slice(0, count).reduce((n, w) => n + w, 0);
  };
  const intact = targets.filter((o) => !o.destroyed);
  let want = cheapest(intact, toGo);
  // Blowing setters from any of their charge points: what each set of them
  // would take for its charges (M33: the airfield has two, and Hard's count
  // wants both; one at a time said the job could not be done before it began).
  const ways = state.objectives.filter((o) => !o.destroyed && kindOf(o, rules).setsOff)
    .flatMap((setter) => setter.chargeHexes.map((from) => {
      const taken = new Set(chainFrom(state.objectives, setter, [from], rules).map((l) => l.objective.id));
      if (targets.includes(setter)) taken.add(setter.id);
      return { setter, taken, cost: still(setter) };
    }));
  const tryWays = (index, used, taken, cost) => {
    if (used.size > 0) {
      const rest = intact.filter((o) => !taken.has(o.id));
      want = Math.min(want, cost + cheapest(rest, Math.max(0, toGo - (intact.length - rest.length))));
    }
    for (let i = index; i < ways.length; i++) {
      const way = ways[i];
      // One charge point a setter, and not a setter another's blast already takes.
      if (used.has(way.setter.id) || taken.has(way.setter.id)) continue;
      tryWays(i + 1, new Set([...used, way.setter.id]), new Set([...taken, ...way.taken]), cost + way.cost);
    }
  };
  tryWays(0, new Set(), new Set(), 0);
  return want;
}

/** Charges an objective still wants: its need, less what went off and what is set on it. */
function stillWanted(state, rules, objective) {
  return Math.max(0, kindOf(objective, rules).chargesNeeded - objective.detonated - state.charges.filter((c) => c.objectiveId === objective.id).length);
}

/**
 * Can the stick blow this bonus target and still do the job (M53, the
 * operator's: Hard's aqueduct takes all six charges, and the orders still
 * offered the road bridge)? Its own charges and the job's cheapest way after
 * them, against every charge the stick has: carried, lying, set, and before
 * the drop those still in the canisters. A target the job's way blows anyway
 * (the airfield's bowser) costs nothing extra, nor one a scout can cut.
 */
export function chargeToSpareFor(state, rules, objective) {
  const before = state.phase === 'drop';
  const inField = (u) => (before ? !u.dead && !u.out : onBoard(u));
  const carried = state.units.filter(inField).reduce((n, u) => n + u.charges, 0);
  const carrier = state.units.some((u) => inField(u) && chargeRoom(u, rules) > 0);
  const lying = carrier ? state.droppedCharges.length : 0;
  const unlanded = before && rules.canisters && state.canisters.length === 0 ? rules.canisters.count * rules.canisters.charges : 0;
  // A line a scout can cut takes no charge at all (the airfield's signals tent on Hard).
  if (kindOf(objective, rules).cutLine && state.units.some((u) => inField(u) && rules.roles[u.role].cutLine)) return true;
  const own = stillWanted(state, rules, objective);
  const set = { ...state, charges: [...state.charges, ...Array.from({ length: own }, () => ({ objectiveId: objective.id }))] };
  return own + chargesForWin(set, rules) <= carried + lying + unlanded;
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
