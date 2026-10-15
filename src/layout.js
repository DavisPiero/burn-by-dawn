/**
 * Where the things the operator places by hand sit (M48k, data/layout.json):
 * START HERE and the clipboard on the contents pages, and each mission's drop
 * cue and its rings' notes. Art only: no rule reads it. Pure, so the layout
 * tool's moves and its Copy are tested headless; the dragging is
 * src/render/layout-tool.js.
 */

const isPair = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

/** data/layout.json checked; `missions` (missions.json's ids), if given, are the only ones it may name. */
export function validateLayout(json, { missions = null } = {}) {
  const where = 'data/layout.json';
  if (!json || typeof json !== 'object') throw new Error(`${where} must be an object`);
  for (const key of ['flag', 'clipboard']) {
    if (!isPair(json.contents?.[key])) throw new Error(`${where} contents.${key} must be [x, y] in pixels`);
  }
  if (!json.missions || typeof json.missions !== 'object') throw new Error(`${where} must have "missions"`);
  for (const [id, entry] of Object.entries(json.missions)) {
    if (id.startsWith('_')) continue;
    if (missions && !missions.includes(id)) throw new Error(`${where} names a mission missions.json does not have: "${id}"`);
    if (entry.dropCue !== null && entry.dropCue !== undefined && !isPair(entry.dropCue)) throw new Error(`${where} ${id}.dropCue must be [q, r]`);
    for (const [key, nudge] of Object.entries(entry.notes ?? {})) {
      if (!isPair(nudge)) throw new Error(`${where} ${id}.notes.${key} must be [x, y] in hex radii`);
    }
  }
  return json;
}

/** START HERE's or the clipboard's offset in pixels: `which` is 'flag' or 'clipboard'. */
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

/** Where each thing the tool can place lives in the file, by the key the board and page mark it with. */
export function layoutPath(key) {
  const [scope, name, sub] = key.split(':');
  if (scope === 'contents') return ['contents', name];
  if (sub === 'dropCue') return ['missions', name, 'dropCue'];
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
    for (const which of ['flag', 'clipboard']) found.set(`contents:${which}`, contentsOffset(layout, which));
    for (const [id, entry] of Object.entries(layout.missions ?? {})) {
      if (id.startsWith('_')) continue;
      found.set(`mission:${id}:dropCue`, entry.dropCue ?? null);
      for (const [note, nudge] of Object.entries(entry.notes ?? {})) found.set(`mission:${id}:${note}`, nudge);
    }
    return found;
  };
  const was = pairs(before);
  let count = 0;
  for (const [key, value] of pairs(after)) if (JSON.stringify(value) !== JSON.stringify(was.get(key) ?? null)) count++;
  return count;
}

/** The whole file as text, to paste over data/layout.json: two spaces, each [x, y] on one line. */
export function layoutText(layout) {
  return `${JSON.stringify(layout, null, 2).replace(/\[\s+(-?[\d.e+-]+),\s+(-?[\d.e+-]+)\s+\]/g, '[$1, $2]')}\n`;
}
