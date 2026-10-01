// The goods train (SPEC.md §7, M34): scenery with a timetable. Where a mission
// has one (rules.train; France's), a train runs the map's railway from its
// first waypoint's edge and is on its objective (the Rail Bridge) in the enemy
// phase of rules.train.turn. It sees nobody, raises nothing and blocks no hex:
// its one rule is the score for dropping the bridge under it.
//
// Pure functions. Where the train is follows from the turn and from when the
// bridge went down (the objective's `downTurn`, set in the fuse phase); nothing
// about it is kept in state.

import { hexLine } from './hex.js';

/** The railway's hexes in running order, from the map's waypoints. */
export function railwayLine(map) {
  const points = (map.railway ?? []).map(([q, r]) => ({ q, r }));
  const line = [];
  for (let i = 1; i < points.length; i++) {
    for (const h of hexLine(points[i - 1], points[i])) {
      if (!line.some((l) => l.q === h.q && l.r === h.r)) line.push(h);
    }
  }
  return line;
}

/** The objective the train crosses, or null. */
export function trainObjective(state, rules) {
  return rules.train ? state.objectives.find((o) => o.kind === rules.train.objective) ?? null : null;
}

/**
 * The timetable against the map: the line, the stretch of it that is the
 * objective (first and last index), and where the engine stands on it once it
 * is "on the bridge" (the middle of that stretch). Null where there is no
 * train, no railway, or the railway misses the objective.
 */
export function trainTimetable(state, rules, map) {
  const objective = trainObjective(state, rules);
  if (!objective) return null;
  const line = railwayLine(map);
  const on = line.map((h, i) => (objective.hexes.some((o) => o.q === h.q && o.r === h.r) ? i : -1)).filter((i) => i >= 0);
  if (on.length === 0) return null;
  const first = on[0], last = on[on.length - 1];
  return { objective, line, first, last, crossing: Math.floor((first + last) / 2) };
}

/** Did the bridge go down under the train: within `window` turns of its turn? */
export function trainCaught(state, rules) {
  const objective = trainObjective(state, rules);
  if (!objective?.destroyed || objective.downTurn == null) return false;
  return Math.abs(objective.downTurn - rules.train.turn) <= rules.train.window;
}

/**
 * The train as it stands once the enemy phase of turn `after` is over (the
 * board during turn after + 1's player phase), or null if it is not on the
 * map: not yet come, gone by, or never coming because the line was cut before
 * it set out.
 *
 *   status 'running'   on its way, or crossing
 *          'halted'    the bridge went before it was close: it stops short
 *          'wrecked'   the bridge went under it, or just ahead of it, or under its tail
 *
 * `cars` are the hexes it covers, engine first; `head` the engine's index on
 * the line (it may be past the line's end: the engine is then off the map and
 * only its tail shows).
 */
export function trainAt(state, rules, map, after = state.turn - 1) {
  const table = trainTimetable(state, rules, map);
  if (!table) return null;
  const { turn, speed, length } = rules.train;
  const { objective, line, first, crossing } = table;
  const headAt = (t) => crossing - speed * (turn - t);
  const down = objective.destroyed ? objective.downTurn ?? -Infinity : null;
  const caught = trainCaught(state, rules);

  let head = headAt(after);
  let status = 'running';
  if (down !== null && down <= after) {
    if (caught) {
      // Down ahead of it: it runs on to the gap. Down under it: it stops where it was.
      status = 'wrecked';
      head = down < turn ? Math.min(headAt(after), first) : headAt(down);
      // Still short of the gap this turn: it has not got there yet.
      if (down < turn && headAt(after) < first) status = 'running';
    } else if (down < turn) {
      // The line cut before it set out: no train tonight.
      if (headAt(down) < 0) return null;
      status = 'halted';
      head = Math.min(headAt(after), first - 1);
    }
    // Down after it had gone by: it runs on as if nothing had happened.
  }
  const cars = [];
  for (let i = head; i > head - length; i--) {
    if (i >= 0 && i < line.length) cars.push({ ...line[i], index: i });
  }
  if (cars.length === 0) return null;
  return { status, head, cars, label: rules.train.label, crossesOn: turn, objective };
}

/**
 * What the train did in the turn just ended, for the turn report: it comes
 * on, it is wrecked, it halts, it has crossed. `before` and `after` are the
 * states either side of the turn's phases.
 */
export function trainEvents(before, after, rules, map) {
  if (!rules.train) return [];
  const was = trainAt(before, rules, map, before.turn - 1);
  const now = trainAt(after, rules, map, before.turn);
  const events = [];
  const at = now?.cars[0] ?? was?.cars[0];
  const event = (what) => events.push({ kind: 'train', what, label: rules.train.label, target: (now ?? was).objective.label, crossesOn: rules.train.turn, q: at.q, r: at.r });
  if (!was && now) event('comes');
  if (now?.status === 'wrecked' && was?.status !== 'wrecked') event('wrecked');
  else if (now?.status === 'halted' && was?.status !== 'halted') event('halts');
  else if (now?.status === 'running' && before.turn === rules.train.turn) event('crosses');
  return events;
}
