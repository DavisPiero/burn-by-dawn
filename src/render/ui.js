// Panel chrome around the board. Reads state and map data, never mutates them
// (CLAUDE.md hard rule 7). The briefing captions, alert dial and turn counter
// that SPEC.md §1 lists for this file arrive with the milestones that need
// them; M1 needs a terrain readout and a legend.

import { terrainAt } from '../map.js';
import { terrainStyle } from './theme.js';

function describeCost(terrain) {
  return terrain.moveCost === null ? 'impassable' : `move ${terrain.moveCost}`;
}

/** One line about the selected hex, or the prompt to click one. */
export function renderReadout(element, state, map) {
  if (!state.selected) {
    element.textContent = 'No hex selected — click one.';
    return;
  }
  const { q, r } = state.selected;
  const terrain = terrainAt(map, q, r);
  if (!terrain) {
    element.textContent = `(${q}, ${r}) — off map`;
    return;
  }
  const parts = [
    describeCost(terrain),
    `cover ${terrain.cover}`,
    terrain.blocksLOS ? 'blocks line of sight' : 'no line of sight block',
  ];
  if (terrain.spotBonus) parts.push(`spot ${terrain.spotBonus > 0 ? '+' : ''}${terrain.spotBonus}`);
  element.textContent = `(${q}, ${r}) ${terrain.label} — ${parts.join(', ')}`;
}

/**
 * The legend, built entirely from the map's own legend and the terrain table.
 * It lists the character to type in map.json for each terrain, so a new
 * terrain type appears here without touching any code.
 */
export function renderLegend(element, map) {
  element.replaceChildren();
  for (const [char, terrainId] of Object.entries(map.legend)) {
    const terrain = map.terrain[terrainId];
    const style = terrainStyle(terrainId);

    const item = document.createElement('li');
    item.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = style.fill;
    swatch.style.color = style.ink;
    swatch.textContent = char;
    item.appendChild(swatch);

    const label = document.createElement('span');
    label.textContent = `${terrain.label} (${describeCost(terrain)})`;
    item.appendChild(label);

    element.appendChild(item);
  }
}

/** Data problems have to be loud, or a data-driven map is a guessing game. */
export function renderError(element, error) {
  element.hidden = false;
  element.textContent = error.message;
  console.error(error);
}
