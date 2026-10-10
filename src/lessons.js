// The lesson engine (SPEC.md §15, MISSION-TRAINING.md; M47). A mission may
// carry lessons: each sets up its own small situation and walks the player
// through it a step at a time, and only what a step asks for does anything.
// Lessons are data (a file the mission names), and no code asks which
// mission is on. Pure functions over state: a lesson's start is rebuilt from
// its data, so going back a step, or taking a lesson again, is only a matter
// of which state is put on the board (CLAUDE.md rule 7).

import { createEnemies } from './enemy.js';
import { DIRECTION_NAMES } from './hex.js';
import { isInPlay } from './map.js';
import { fillActionPoints, onBoard } from './units.js';

// What a step may wait for: a short fixed list, in the spirit of the win
// conditions (missions.js) and the trait hooks. Each names what it needs.
//   selected      { unit }            that man is the one selected
//   movedTo       { unit?, hexes }    a man (that man) stands on one of the hexes
//   hovered       { hexes }           the mouse is on one of the hexes
//   hidden        { unit? }           a man (that man) has gone to ground
//   packed        { count? }          so many parachutes fewer than at the step's start (1)
//   turnEnded     {}                  the turn number has gone up
//   chargeSet     { objective? }      a charge more is burning (on that objective)
//   enemyDown     { enemy? }          an enemy fewer (that enemy gone)
//   destroyed     { objective }       that objective is destroyed
//   manOut        { unit? }           a man (that man) is out at the exfil
//   acknowledged  {}                  the player pressed on: a step that only shows
export const UNTIL_KINDS = ['selected', 'movedTo', 'hovered', 'hidden', 'packed', 'turnEnded', 'chargeSet', 'enemyDown', 'destroyed', 'manOut', 'acknowledged'];

const isHex = (h) => Array.isArray(h) && h.length === 2 && h.every(Number.isInteger);
const same = (a, b) => a.q === b.q && a.r === b.r;
const hexOf = ([q, r]) => ({ q, r });

/**
 * Check a lessons file against the mission's map and men, and say plainly
 * what is wrong. `known` is { map, unitIds, objectiveIds, actionIds }.
 * Returns the file.
 */
export function validateLessons(json, known, url = 'lessons') {
  const { map, unitIds, objectiveIds, actionIds } = known;
  if (!Array.isArray(json?.lessons) || json.lessons.length === 0) throw new Error(`${url}: expected a non-empty "lessons" list`);
  const ids = new Set();
  const onMap = (h, where) => {
    if (!isHex(h) || !isInPlay(map, h[0], h[1])) throw new Error(`${where}: ${JSON.stringify(h)} is not a hex on the map`);
  };
  const man = (id, where) => {
    if (!unitIds.includes(id)) throw new Error(`${where}: no man "${id}" in the roster`);
  };
  for (const [i, lesson] of json.lessons.entries()) {
    const at = `${url}: lessons[${i}]`;
    if (typeof lesson.id !== 'string' || !lesson.id) throw new Error(`${at} needs an "id"`);
    if (ids.has(lesson.id)) throw new Error(`${at} id "${lesson.id}" is used twice`);
    ids.add(lesson.id);
    for (const key of ['title', 'qualification']) {
      if (typeof lesson[key] !== 'string' || !lesson[key]) throw new Error(`${at} needs a "${key}"`);
    }
    const start = lesson.start;
    if (typeof start !== 'object' || start === null) throw new Error(`${at} needs a "start"`);
    const men = Object.entries(start.men ?? {});
    if (men.length === 0) throw new Error(`${at}.start needs at least one of the "men"`);
    const taken = new Set();
    for (const [id, m] of men) {
      man(id, `${at}.start.men`);
      onMap(m.at, `${at}.start.men.${id}.at`);
      if (taken.has(String(m.at))) throw new Error(`${at}.start: two counters on ${JSON.stringify(m.at)}`);
      taken.add(String(m.at));
    }
    for (const [n, e] of (start.enemies ?? []).entries()) {
      const where = `${at}.start.enemies[${n}]`;
      if (typeof e.id !== 'string' || typeof e.label !== 'string') throw new Error(`${where} needs an "id" and a "label"`);
      if (!map.enemyTypes[e.type]) throw new Error(`${where}: no enemy type "${e.type}"`);
      if (!DIRECTION_NAMES.includes(e.facing)) throw new Error(`${where}: "facing" must be one of ${DIRECTION_NAMES.join(' ')}`);
      const first = e.route ? e.route[0] : e.at;
      onMap(first, `${where}`);
      for (const h of e.route ?? []) onMap(h, `${where}.route`);
      if (taken.has(String(first))) throw new Error(`${at}.start: two counters on ${JSON.stringify(first)}`);
      taken.add(String(first));
    }
    for (const [n, p] of (start.parachutes ?? []).entries()) onMap(p.at, `${at}.start.parachutes[${n}].at`);
    if (!Array.isArray(lesson.steps) || lesson.steps.length === 0) throw new Error(`${at} needs "steps"`);
    for (const [n, step] of lesson.steps.entries()) {
      const where = `${at}.steps[${n}]`;
      if (typeof step.say !== 'string' || !step.say) throw new Error(`${where} needs a pen line, "say"`);
      // The pen says a few words (ROADMAP.md Phase 5); the sentence is `tell`'s.
      if (step.say.split(/\s+/).length > 7) throw new Error(`${where}: "say" is a pen line, seven words at most: ${JSON.stringify(step.say)}`);
      if (step.tell !== undefined && typeof step.tell !== 'string') throw new Error(`${where}: "tell" must be words`);
      if (step.at !== undefined) onMap(step.at, `${where}.at`);
      for (const h of Array.isArray(step.ring) ? step.ring : []) onMap(h, `${where}.ring`);
      if (step.ring !== undefined && !Array.isArray(step.ring) && step.ring !== 'men') throw new Error(`${where}: "ring" is a list of hexes, or "men"`);
      const until = step.until;
      if (!UNTIL_KINDS.includes(until?.kind)) throw new Error(`${where}: "until.kind" must be one of ${UNTIL_KINDS.join(', ')}`);
      if (until.unit !== undefined) man(until.unit, `${where}.until`);
      if (until.kind === 'selected' && until.unit === undefined) throw new Error(`${where}: "selected" needs a "unit"`);
      if (['movedTo', 'hovered'].includes(until.kind)) {
        if (!Array.isArray(until.hexes) || until.hexes.length === 0) throw new Error(`${where}: "${until.kind}" needs "hexes"`);
        for (const h of until.hexes) onMap(h, `${where}.until.hexes`);
      }
      if (until.kind === 'destroyed' && !objectiveIds.includes(until.objective)) throw new Error(`${where}: no objective "${until.objective}"`);
      if (until.objective !== undefined && !objectiveIds.includes(until.objective)) throw new Error(`${where}: no objective "${until.objective}"`);
      const allow = step.allow ?? {};
      for (const id of Array.isArray(allow.select) ? allow.select : []) man(id, `${where}.allow.select`);
      for (const h of Array.isArray(allow.move) ? allow.move : []) onMap(h, `${where}.allow.move`);
      if (allow.move !== undefined && !Array.isArray(allow.move) && allow.move !== 'any') throw new Error(`${where}: "allow.move" is a list of hexes, or "any"`);
      for (const id of allow.actions ?? []) {
        if (!actionIds.includes(id)) throw new Error(`${where}.allow.actions: no action "${id}"`);
      }
    }
  }
  return json;
}

/**
 * A lesson's own small situation (its `start`), built on a fresh state of the
 * mission (`base`, state.js createInitialState): only the men it names are on
 * the board, where it puts them and as it describes them; its garrison in
 * place of the map's; its parachutes; its turn. Play has begun: no drop.
 */
export function lessonStart(base, lesson, map, rules) {
  const { start } = lesson;
  const placed = base.units.map((unit) => {
    const m = start.men[unit.id];
    if (!m) return { ...unit, landed: false };
    const hits = m.hits ?? 0;
    return {
      ...unit, q: m.at[0], r: m.at[1], landed: true, trail: [], turnsLost: 0,
      charges: m.charges ?? unit.charges, hits, stabilised: false, hidden: Boolean(m.hidden), inContact: false,
    };
  });
  // Pools as a turn would fill them (the leader's orders among them), then
  // what the lesson says a man has left of his.
  const units = fillActionPoints(placed, rules).map((unit) => {
    const ap = start.men[unit.id]?.ap;
    return ap === undefined ? unit : { ...unit, ap: Math.min(ap, unit.apMax) };
  });
  const nameOf = (id) => units.find((u) => u.id === id)?.shortName ?? 'A';
  return {
    ...base,
    phase: 'play',
    turn: start.turn ?? 1,
    dropRunId: null,
    units,
    enemies: createEnemies({ ...map, enemies: start.enemies ?? [] }),
    alert: { ...base.alert, points: start.alert ?? 0, peak: start.alert ?? 0 },
    parachutes: (start.parachutes ?? []).map((p) => ({ unitId: p.unit ?? null, name: nameOf(p.unit), q: p.at[0], r: p.at[1] })),
    droppedCharges: (start.droppedCharges ?? []).map(hexOf),
    report: [],
    speech: [],
    selectedUnitId: null,
    selectedHex: null,
    hoverHex: null,
    targeting: null,
  };
}

/**
 * Has the step's condition been met? `from` is the state the step began
 * from, `now` the state as it stands; `acknowledged` is set when the player
 * pressed on.
 */
export function stepMet(step, from, now, { acknowledged = false } = {}) {
  const until = step.until;
  const men = now.units.filter((u) => until.unit === undefined || u.id === until.unit);
  switch (until.kind) {
    case 'selected': return now.selectedUnitId === until.unit;
    case 'movedTo': return men.some((u) => onBoard(u) && until.hexes.some((h) => same(u, hexOf(h))));
    case 'hovered': return Boolean(now.hoverHex) && until.hexes.some((h) => same(now.hoverHex, hexOf(h)));
    case 'hidden': return men.some((u) => onBoard(u) && u.hidden);
    case 'packed': return from.parachutes.length - now.parachutes.length >= (until.count ?? 1);
    case 'turnEnded': return now.turn > from.turn;
    case 'chargeSet': {
      const on = (s) => s.charges.filter((c) => until.objective === undefined || c.objectiveId === until.objective).length;
      return on(now) > on(from);
    }
    case 'enemyDown': return until.enemy === undefined
      ? now.enemies.length < from.enemies.length
      : from.enemies.some((e) => e.id === until.enemy) && !now.enemies.some((e) => e.id === until.enemy);
    case 'destroyed': return Boolean(now.objectives.find((o) => o.id === until.objective)?.destroyed);
    case 'manOut': return men.some((u) => u.out);
    case 'acknowledged': return acknowledged;
    default: return false;
  }
}

/**
 * May the player do this now? Only what the step lists does anything
 * (MISSION-TRAINING.md: idiot proof). `input` is one of
 *   { kind: 'select', unitId }      picking a man
 *   { kind: 'move', to: { q, r } }  moving the selected man
 *   { kind: 'action', id }          an action's button or key (its target click goes with it)
 *   { kind: 'endTurn' }
 * Looking is always allowed: hovering, the routes, how to play.
 */
export function allows(step, input) {
  const allow = step.allow ?? {};
  switch (input.kind) {
    case 'select': return allow.select === true || (Array.isArray(allow.select) && allow.select.includes(input.unitId));
    case 'move': return allow.move === 'any' || (Array.isArray(allow.move) && allow.move.some((h) => same(input.to, hexOf(h))));
    case 'action': return (allow.actions ?? []).includes(input.id);
    case 'endTurn': return allow.endTurn === true;
    default: return false;
  }
}

/**
 * Caught out: what went wrong for one of ours since the step began, in the
 * umpire's words, or null: a man seen, hit or killed. A step that is about
 * being seen says `mayBeSeen`, and only a hit or worse stops it. (Nothing
 * else can go wrong: a course's mission is an exercise, rules.json
 * `mission.exercise`, and is never settled.)
 */
export function caughtOut(step, from, now) {
  const before = new Map(from.units.map((u) => [u.id, u]));
  for (const unit of now.units) {
    const was = before.get(unit.id);
    if (!was) continue;
    if (unit.dead && !was.dead) return `${unit.shortName} would be dead.`;
    if (unit.hits > was.hits) return `${unit.shortName} was hit.`;
    if (!step.mayBeSeen && unit.inContact && !was.inContact) return `${unit.shortName} was seen.`;
  }
  return null;
}

/**
 * Where the player is in a lesson: { lessonId, step, starts }, where
 * `starts[i]` is the state step i began from. The functions below are the
 * whole of going on, going back and starting again.
 */
export function beginLesson(lesson, startState) {
  return { lessonId: lesson.id, step: 0, starts: [startState] };
}

/** On to the next step, which begins from the state as it stands. Past the last, `done`. */
export function advance(progress, lesson, now) {
  const step = progress.step + 1;
  if (step >= lesson.steps.length) return { ...progress, step, done: true };
  return { ...progress, step, starts: [...progress.starts.slice(0, step), now] };
}

/** Back a step: to the step before, as it began. At the first step, to its own start. */
export function back(progress) {
  const step = Math.max(0, progress.step - 1);
  return { ...progress, step, starts: progress.starts.slice(0, step + 1), done: false };
}

/** The state the current step began from: what Back, and the umpire's whistle, put on the board. */
export function stepStart(progress) {
  return progress.starts[Math.min(progress.step, progress.starts.length - 1)];
}
