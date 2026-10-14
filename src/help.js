// The ? pages' diagrams (M48i, SPEC.md §11 Cards): each page of how to play is
// a few lines and one small scene that plays over and over, drawn with the
// board's own counters. The scenes are data (data/help.json): a list of steps,
// each a thing done on a tiny board. This file turns the steps into frames, a
// whole picture each, so render/board.js only draws what it is given and the
// frames can be tested without a page. No rules are run here: what a step
// costs is read from the same terrain and rules tables the game reads, so the
// numbers in a diagram are the game's, and a test holds the walks to ground a
// man can cross.

import { hexDistance, rowQStart } from './hex.js';
import { hexKey } from './map.js';

const DIRECTIONS = ['NW', 'NE', 'E', 'SE', 'SW', 'W'];

/** [column, row] in a scene's rows to an axial hex, as the maps' rows are read. */
export function sceneHex([col, row]) {
  return { q: rowQStart(row) + col, r: row };
}

/**
 * A scene's tiny board, in the shape of a map, for the board's drawing and for
 * the costs: in tonight's country, the mission's `ground` over the legend.
 */
export function sceneMap(help, page, terrain, missionId = null) {
  const rows = page.scene.rows;
  return {
    width: rows[0].length, height: rows.length, hexSize: help.hexSize,
    legend: { ...help.legend, ...help.ground?.[missionId] }, rows, terrain,
  };
}

/** The terrain id under a hex of a scene, or null off it. */
function terrainOf(map, h) {
  const col = h.q - rowQStart(h.r);
  const ch = map.rows[h.r]?.[col];
  return ch === undefined ? null : map.legend[ch] ?? null;
}

/** What stepping onto a hex costs, from terrain.json, or null where nobody goes. */
export function stepCost(map, h) {
  const id = terrainOf(map, h);
  return id === null ? null : map.terrain[id]?.moveCost ?? null;
}

/** A value in the rules by its dotted path ("charges.fuseTurns"). */
function ruleAt(rules, path) {
  return path.split('.').reduce((at, key) => (at == null ? undefined : at[key]), rules);
}

/**
 * A page's lines in tonight's numbers: {charges.fuseTurns} is the rule's value,
 * and a line given as { text, if } or { text, unless } is said only where that
 * rule is set, or not.
 */
export function helpLines(page, rules) {
  return (page.lines ?? [])
    .filter((line) => typeof line === 'string'
      || (line.if ? Boolean(ruleAt(rules, line.if)) : true) && (line.unless ? !ruleAt(rules, line.unless) : true))
    .map((line) => (typeof line === 'string' ? line : line.text)
      .replace(/\{([a-zA-Z.]+)\}/g, (_, path) => String(ruleAt(rules, path) ?? `{${path}}`)));
}

/** Every hex a man with `ap` could walk to from `from`, cheapest first (the board's blue). */
function reach(map, from, ap, blocked) {
  const best = new Map([[hexKey(from.q, from.r), 0]]);
  const queue = [{ ...from, cost: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const at = queue.shift();
    for (let dir = 0; dir < 6; dir++) {
      const next = neighbour(at, dir);
      const step = stepCost(map, next);
      if (step == null || blocked.has(hexKey(next.q, next.r))) continue;
      const cost = at.cost + step;
      if (cost > ap || cost >= (best.get(hexKey(next.q, next.r)) ?? Infinity)) continue;
      best.set(hexKey(next.q, next.r), cost);
      queue.push({ ...next, cost });
    }
  }
  return [...best].filter(([, cost]) => cost > 0).map(([key]) => key);
}

const STEPS = [{ q: 0, r: -1 }, { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }];
function neighbour(h, dir) {
  return { q: h.q + STEPS[dir].q, r: h.r + STEPS[dir].r };
}

/**
 * The frames of a page's scene: a whole picture each, with how long it stays.
 * `rules` gives the costs and the fuse; `apOf(role)` a man's AP in tonight's
 * roster; `missionId` the country it is printed in. A frame: { ms, men, enemies, bodies, charges, objective, exfil,
 * sight, selected, path, wash, cursor, notes, blast, out, turn, corner }:
 * `corner` is a word said for a moment where the turn is kept (SPACE).
 */
export function helpFrames(help, page, { terrain, rules, apOf, missionId = null }) {
  const map = sceneMap(help, page, terrain, missionId);
  const scene = page.scene;
  const hexes = (list) => (list ?? []).map(sceneHex);
  let frame = {
    ms: 0, men: [], enemies: [], bodies: [], charges: [], selected: null, path: null, wash: false, cursor: null,
    notes: [], blast: null, out: 0, turn: 1, turns: Boolean(scene.turns),
    sight: hexes(scene.sight).map((h) => hexKey(h.q, h.r)),
    exfil: hexes(scene.exfil),
    objective: scene.objective ? {
      label: scene.objective.label, hexes: hexes(scene.objective.hexes), points: hexes(scene.objective.points),
      blast: hexes(scene.objective.blast), destroyed: false,
    } : null,
  };
  const frames = [];
  const man = (id) => frame.men.find((m) => m.id === id);
  const enemy = (id) => frame.enemies.find((e) => e.id === id);
  const set = (changes) => { frame = { ...frame, ...changes }; };
  const setMan = (id, changes) => set({ men: frame.men.map((m) => (m.id === id ? { ...m, ...changes } : m)) });
  const setEnemy = (id, changes) => set({ enemies: frame.enemies.map((e) => (e.id === id ? { ...e, ...changes } : e)) });
  const emit = (ms, extra = {}) => frames.push({ ...frame, ms, corner: null, ...extra });
  // The selected man's blue, with the garrison's sight in red, as the board's danger wash.
  const washFor = () => {
    const m = frame.selected && man(frame.selected);
    if (!m) return null;
    const blocked = new Set([...frame.men.filter((o) => o.id !== m.id), ...frame.enemies].map((o) => hexKey(o.q, o.r)));
    return reach(map, m, m.ap, blocked).map((key) => ({ key, seen: frame.sight.includes(key) }));
  };

  for (const step of scene.steps) {
    // Every step begins clean of the last one's pen notes.
    set({ notes: [] });
    if (step.men) {
      set({ men: step.men.map((m) => {
        const ap = m.ap ?? apOf(m.role);
        return { id: m.id, role: m.role, ...sceneHex(m.at), ap, apMax: ap, charges: m.charges ?? 0, spotted: false, hidden: false };
      }) });
    }
    if (step.enemies) {
      set({ enemies: step.enemies.map((e) => ({ id: e.id, type: e.type, ...sceneHex(e.at), facing: DIRECTIONS.indexOf(e.facing), suppressed: false, openToKill: false })) });
    }
    // A click on him: the mouse over his counter, and his move range.
    if (step.select !== undefined) set({ selected: step.select, path: null, cursor: step.select ? man(step.select) : null });
    if (step.face) setEnemy(step.face.enemy, { facing: DIRECTIONS.indexOf(step.face.facing) });
    if (step.hover) {
      const m = man(frame.selected);
      const path = [{ q: m.q, r: m.r }, ...hexes(step.hover)];
      let spent = 0;
      const costs = path.map((h, i) => (i === 0 ? 0 : (spent += stepCost(map, h))));
      set({ path: { hexes: path, costs, seen: path.map((h, i) => i > 0 && frame.sight.includes(hexKey(h.q, h.r))) }, cursor: path.at(-1) });
    }
    set({ wash: washFor() });
    if (step.walk) {
      // He goes a hex a frame, his AP spent as he goes, seen on the red.
      const { hexes: path, costs, seen } = frame.path;
      const id = frame.selected;
      set({ cursor: null, wash: null });
      for (let i = 1; i < path.length; i++) {
        const h = path[i];
        const m = man(id);
        setMan(id, { q: h.q, r: h.r, ap: m.ap - stepCost(map, h), spotted: m.spotted || seen[i] });
        // Onto the way out, he is out (SPEC.md §10): off the board.
        if (frame.exfil.some((x) => x.q === h.q && x.r === h.r)) {
          set({ men: frame.men.filter((o) => o.id !== id), selected: null, path: null, out: frame.out + 1, notes: [{ ...h, text: 'OUT' }] });
          emit(step.ms ?? help.walkMs);
          break;
        }
        // The line ahead of him, its count from where he stands.
        set({ path: { hexes: path.slice(i), costs: costs.slice(i).map((c) => c - costs[i]), seen: seen.slice(i) } });
        emit(step.ms ?? help.walkMs);
      }
      set({ path: null, wash: washFor() });
      continue;
    }
    // A key pressed: the letter in the pen beside whoever pressed it.
    if (step.key) {
      const m = man(step.key.by) ?? man(frame.selected);
      set({ notes: [{ q: m.q, r: m.r, text: step.key.text }], cursor: null });
    }
    if (step.charge) {
      const m = man(step.charge);
      const fuse = rules.charges.fuseTurns;
      set({ charges: [...frame.charges, { q: m.q, r: m.r, fuse, length: fuse }] });
      setMan(step.charge, { charges: m.charges - 1, ap: m.ap - rules.charges.placeApCost });
    }
    if (step.suppress) {
      setEnemy(step.suppress.enemy, { suppressed: true });
      setMan(step.suppress.by, { ap: man(step.suppress.by).ap - rules.actions.suppress.apCost });
    }
    if (step.kill) {
      const e = enemy(step.kill.enemy);
      set({ enemies: frame.enemies.filter((o) => o.id !== e.id), bodies: [...frame.bodies, { q: e.q, r: e.r }] });
      setMan(step.kill.by, { ap: man(step.kill.by).ap - rules.actions.kill.apCost });
    }
    if (step.note) set({ notes: [{ ...sceneHex(step.note.at), text: step.note.text }] });
    if (step.endTurn) {
      // SPACE, said in the corner, then the garrison's go: the fuses burn
      // down and every man's AP comes back. A man still on the red is seen
      // again; off it, contact ends (§6). A suppressed enemy keeps its head
      // down through its go and is open to a kill after it (§4). "untilBlast"
      // goes on turning until the last charge goes off, however long tonight's fuse.
      do {
        emit(help.spaceMs, { corner: 'SPACE' });
        const burnt = frame.charges.map((c) => ({ ...c, fuse: c.fuse - 1 }));
        const blows = burnt.some((c) => c.fuse <= 0) && frame.objective;
        set({
          turn: frame.turn + 1,
          charges: burnt.filter((c) => c.fuse > 0),
          men: frame.men.map((m) => ({ ...m, ap: m.apMax, spotted: m.spotted && frame.sight.includes(hexKey(m.q, m.r)) })),
          enemies: frame.enemies.map((e) => ({ ...e, suppressed: false, openToKill: e.suppressed })),
          blast: blows ? frame.objective.blast : null,
          objective: blows ? { ...frame.objective, destroyed: true } : frame.objective,
          selected: null, path: null, cursor: null, wash: null,
        });
        if (step.endTurn === 'untilBlast' && frame.charges.length) emit(help.holdMs);
      } while (step.endTurn === 'untilBlast' && frame.charges.length);
    }
    if (step.clearBlast) set({ blast: null });
    emit(step.ms ?? help.holdMs);
  }
  return frames;
}

/** True when two hexes are side by side: a walk goes a hex at a time. */
export function besideEachOther(a, b) {
  return hexDistance(a, b) === 1;
}
