/**
 * Where the things the operator places by hand sit (M48k, data/layout.json):
 * the course's clipboard on the contents pages, and each mission's drop
 * cue and its rings' notes, (M58e) the hexes left clear of its ground
 * colour, and (M59d) its labels: each drop run's tab, each target's name and
 * EXFIL, and each place name, all moved by [x, y] hex radii. Art only: no rule reads it. Pure, so the layout
 * tool's moves and its Copy are tested headless; the dragging is
 * src/render/layout-tool.js.
 *
 * And (M59c) the terrain painter's: a map's `rows` with a hex painted, and
 * the rows as text. Those are rules, not art: the operator sends them to
 * Claude, who puts them in the map file after the tests and the bot.
 */

import { columnOf, inBounds } from './map.js';

/** The labels the tool moves (M59d), each a list in a mission's entry by what it is called on the board: a run's id, an objective's id or 'exfil', a place's name. */
export const LABELS = ['runTabs', 'names', 'places'];

const isPair = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

/** data/layout.json checked; `missions` (missions.json's ids), if given, are the only ones it may name. */
export function validateLayout(json, { missions = null } = {}) {
  const where = 'data/layout.json';
  if (!json || typeof json !== 'object') throw new Error(`${where} must be an object`);
  for (const key of ['clipboard']) {
    if (!isPair(json.contents?.[key])) throw new Error(`${where} contents.${key} must be [x, y] in pixels`);
  }
  if (!json.missions || typeof json.missions !== 'object') throw new Error(`${where} must have "missions"`);
  for (const [id, entry] of Object.entries(json.missions)) {
    if (id.startsWith('_')) continue;
    if (missions && !missions.includes(id)) throw new Error(`${where} names a mission missions.json does not have: "${id}"`);
    if (entry.dropCue !== null && entry.dropCue !== undefined && !isPair(entry.dropCue)) throw new Error(`${where} ${id}.dropCue must be [q, r]`);
    if (entry.clear !== undefined && !(Array.isArray(entry.clear) && entry.clear.every((h) => isPair(h) && h.every(Number.isInteger)))) {
      throw new Error(`${where} ${id}.clear must be a list of [q, r] hexes`);
    }
    for (const kind of ['notes', ...LABELS]) {
      for (const [key, nudge] of Object.entries(entry[kind] ?? {})) {
        if (!isPair(nudge)) throw new Error(`${where} ${id}.${kind}["${key}"] must be [x, y] in hex radii`);
      }
    }
  }
  return json;
}

/** The clipboard's offset in pixels: `which` is 'clipboard'. */
export function contentsOffset(layout, which) {
  return layout?.contents?.[which] ?? [0, 0];
}

/** A mission's drop cue, [q, r], or null to centre it on the runs' names. */
export function dropCueAt(layout, missionId) {
  return layout?.missions?.[missionId]?.dropCue ?? null;
}

/** How far a ring's note is moved, [x, y] hex radii: `key` is an objective's id, or 'exfil'. */
export function noteNudge(layout, missionId, key) {
  return layout?.missions?.[missionId]?.notes?.[key] ?? null;
}

/** A mission's labels (M59d) for the board: each of LABELS as { key: [x, y] }, and `layoutKey`, what the tool's keys for them begin with. */
export function labelsOf(layout, missionId) {
  const entry = layout?.missions?.[missionId] ?? {};
  return { ...Object.fromEntries(LABELS.map((kind) => [kind, entry[kind] ?? {}])), layoutKey: `mission:${missionId}` };
}

/** The hexes of a mission left bare paper whatever their ground (M58e), as a set of "q,r" keys. */
export function clearHexes(layout, missionId) {
  return new Set((layout?.missions?.[missionId]?.clear ?? []).map(([q, r]) => `${q},${r}`));
}

/** The layout with hex (q, r) of a mission switched between clear and its ground, as a new object; the list kept in order. */
export function toggledClear(layout, missionId, q, r) {
  const copy = structuredClone(layout);
  const entry = (copy.missions[missionId] ??= { notes: {} });
  const list = (entry.clear ?? []).filter(([cq, cr]) => cq !== q || cr !== r);
  if (list.length === (entry.clear ?? []).length) list.push([q, r]);
  list.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  if (list.length) entry.clear = list;
  else delete entry.clear;
  return copy;
}

/** Where each thing the tool can place lives in the file, by the key the board and page mark it with. */
export function layoutPath(key) {
  // A place's name is the rest of the key, whatever it holds.
  const [scope, name, sub, ...rest] = key.split(':');
  if (scope === 'contents') return ['contents', name];
  if (sub === 'dropCue') return ['missions', name, 'dropCue'];
  if (LABELS.includes(sub)) return ['missions', name, sub, rest.join(':')];
  return ['missions', name, 'notes', sub];
}

/** A pixel drag as hex radii (a note's units). */
export function pixelsToRadii([dx, dy], hexSize) {
  return [dx / hexSize, dy / hexSize];
}

/** A pixel drag as axial [q, r] (the drop cue's units; SPEC.md §2, inverted). */
export function pixelsToAxial([dx, dy], hexSize) {
  const r = (2 / 3) * dy / hexSize;
  return [dx / (hexSize * Math.sqrt(3)) - r / 2, r];
}

const round = (value) => Math.round(value * 100) / 100 || 0;

/**
 * The layout with one thing moved by `delta` (in its own units), as a new
 * object: `key` as layoutPath reads it, `from` where it stood if the file did
 * not say (a drop cue centred on the names, or no nudge).
 */
export function moved(layout, key, delta, from = [0, 0]) {
  const path = layoutPath(key);
  const copy = structuredClone(layout);
  let at = copy;
  for (const step of path.slice(0, -1)) at = at[step] ??= {};
  const last = path.at(-1);
  const was = at[last] ?? from;
  at[last] = [round(was[0] + delta[0]), round(was[1] + delta[1])];
  return copy;
}

/** How many things stand somewhere other than in `before`. */
export function movedCount(before, after) {
  const pairs = (layout) => {
    const found = new Map();
    for (const which of ['clipboard']) found.set(`contents:${which}`, contentsOffset(layout, which));
    for (const [id, entry] of Object.entries(layout.missions ?? {})) {
      if (id.startsWith('_')) continue;
      found.set(`mission:${id}:dropCue`, entry.dropCue ?? null);
      for (const [note, nudge] of Object.entries(entry.notes ?? {})) found.set(`mission:${id}:${note}`, nudge);
      for (const kind of LABELS) for (const [label, nudge] of Object.entries(entry[kind] ?? {})) found.set(`mission:${id}:${kind}:${label}`, nudge);
      for (const [q, r] of entry.clear ?? []) found.set(`clear:${id}:${q},${r}`, true);
    }
    return found;
  };
  const was = pairs(before), now = pairs(after);
  let count = 0;
  for (const key of new Set([...was.keys(), ...now.keys()])) if (JSON.stringify(now.get(key) ?? null) !== JSON.stringify(was.get(key) ?? null)) count++;
  return count;
}

/** The whole file as text, to paste over data/layout.json: two spaces, each [x, y] on one line. */
export function layoutText(layout) {
  return `${JSON.stringify(layout, null, 2).replace(/\[\s+(-?[\d.e+-]+),\s+(-?[\d.e+-]+)\s+\]/g, '[$1, $2]')}\n`;
}

/** The ground the painter offers for a map (M59c): its legend's, in the legend's order, as { char, id, label }. */
export function groundSwatches(map) {
  return Object.entries(map.legend).map(([char, id]) => ({ char, id, label: map.terrain?.[id]?.label ?? id }));
}

/** A map's rows with hex (q, r) given the legend letter `char`, as a new list; the same list if it is that already, or off the map. */
export function paintedRows(map, q, r, char) {
  if (!inBounds(map, q, r) || !map.legend[char]) return map.rows;
  const i = columnOf(q, r);
  const row = map.rows[r];
  if (row[i] === char) return map.rows;
  const rows = [...map.rows];
  rows[r] = `${row.slice(0, i)}${char}${row.slice(i + 1)}`;
  return rows;
}

/** How many hexes differ between two maps' rows of the same size. */
export function paintedCount(before, after) {
  let count = 0;
  before.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== after[r][i]) count++;
  });
  return count;
}

/** The objectives whose own ground hex (q, r) is (what its ruins replace when it goes up), by label. */
export function targetsOn(map, q, r) {
  return (map.objectives ?? []).filter((o) => o.hexes.some(([oq, or]) => oq === q && or === r)).map((o) => o.label);
}

/** The rows as the map file has them, to send to Claude: `"rows": [ ... ]`, a row a line. */
export function rowsText(rows) {
  return `  "rows": [\n${rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]\n`;
}
