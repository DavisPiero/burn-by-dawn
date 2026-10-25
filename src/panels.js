// Comic panels' triggers (M61; MISSION-GUNNERSIDE-WORDS.md, Comic panels). A
// panel in a mission's `comicPanels` with a `when` shows the first time its
// moment comes, from a short fixed list, in the spirit of the win conditions:
//
//   { "firstEnter": "<terrain id>" }       a man first steps onto, or through, that ground
//   { "firstShot": true }                  the night's first shot (state.firstShot)
//   { "objectiveDestroyed": "<id>" }       that objective blown or cut; "primary" for the primary
//   { "outcome": ["failed", "withdrawn"] } the night ends so
//
// The Dakota, the landing and mission accomplished keep their own moments
// (main.js) and have no `when`. Pure functions over plain data: main.js shows
// what they name, and the game's state is never touched.

import { terrainIdAt } from './map.js';

export const PANEL_TRIGGERS = ['firstEnter', 'firstShot', 'objectiveDestroyed', 'outcome'];
const OUTCOMES = ['success', 'withdrawn', 'failed'];

/** Throws unless `when` is one trigger, well formed. `where` names it. */
export function validatePanelWhen(when, where) {
  if (typeof when !== 'object' || when === null || Array.isArray(when)) throw new Error(`${where} must be an object`);
  const keys = Object.keys(when);
  if (keys.length !== 1 || !PANEL_TRIGGERS.includes(keys[0])) throw new Error(`${where} needs one of ${PANEL_TRIGGERS.join(', ')}`);
  const [key] = keys;
  const value = when[key];
  if (key === 'firstShot' && value !== true) throw new Error(`${where}.firstShot must be true`);
  if ((key === 'firstEnter' || key === 'objectiveDestroyed') && (typeof value !== 'string' || !value)) throw new Error(`${where}.${key} must name one`);
  if (key === 'outcome' && (!Array.isArray(value) || !value.length || value.some((o) => !OUTCOMES.includes(o)))) {
    throw new Error(`${where}.outcome must list some of ${OUTCOMES.join(', ')}`);
  }
}

/** Throws unless every trigger's terrain and objective is on this map. */
export function checkPanelNames(mission, map) {
  for (const [moment, panel] of Object.entries(mission.comicPanels ?? {})) {
    const { firstEnter, objectiveDestroyed } = panel.when ?? {};
    if (firstEnter && !map.terrain[firstEnter]) throw new Error(`${mission.id} comicPanels.${moment}: no terrain "${firstEnter}"`);
    if (objectiveDestroyed && objectiveDestroyed !== 'primary' && !map.objectives.some((o) => o.id === objectiveDestroyed)) {
      throw new Error(`${mission.id} comicPanels.${moment}: no objective "${objectiveDestroyed}"`);
    }
  }
}

function hasCome(when, state, map) {
  if (when.firstShot) return Boolean(state.firstShot);
  if (when.outcome) return Boolean(state.outcome && when.outcome.includes(state.outcome.kind));
  if (when.objectiveDestroyed) {
    const named = when.objectiveDestroyed;
    return state.objectives.some((o) => o.destroyed && (named === 'primary' ? o.primary : o.id === named));
  }
  if (when.firstEnter) {
    // Every hex a man entered this turn is on his trail; checked after every
    // action, so passing through counts. Landing on it does not.
    return state.units.some((u) => (u.trail ?? []).some((h) => terrainIdAt(map, h.q, h.r) === when.firstEnter));
  }
  return false;
}

/** The moments with a `when` that have come in `state` and are not in `seen`, in the order written. */
export function panelsDue(mission, state, map, seen) {
  return Object.entries(mission.comicPanels ?? {})
    .filter(([moment, panel]) => panel.when && !seen.has(moment) && hasCome(panel.when, state, map))
    .map(([moment]) => moment);
}
