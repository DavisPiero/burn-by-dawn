// Draws the hex grid and its terrain into an <svg>. Reads state and map data,
// never mutates them — CLAUDE.md hard rule 7. Click handling is delegated back
// to the caller via onHexClick; this module makes no game-state decisions.
//
// Colour comes from theme.js only. Terrain rules come from the map data only.
// Nothing about a terrain type is written down in here, so editing the JSON
// changes the map with no code change (SPEC.md §12, M1).

import { axialToPixel, hexCorners } from '../hex.js';
import { forEachCell, legendCharAt, terrainIdAt } from '../map.js';
import { GRID, SELECTION, terrainStyle } from './theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function cornersToPoints(center, corners) {
  return corners.map((c) => `${center.x + c.x},${center.y + c.y}`).join(' ');
}

function el(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/**
 * @param {SVGSVGElement} svg
 * @param {{selected: {q:number,r:number}|null}} state
 * @param {object} map loaded map data, see map.js loadMap
 * @param {(q:number, r:number) => void} onHexClick
 */
export function renderBoard(svg, state, map, onHexClick) {
  const corners = hexCorners(map.hexSize);

  // Clear previous render. Rendering owns only DOM it created, never state.
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const grid = el('g', {});
  // Selected hex outline is drawn last so neighbouring hexes cannot overdraw it.
  const highlight = el('g', {});
  svg.appendChild(grid);
  svg.appendChild(highlight);

  forEachCell(map, (q, r) => {
    const center = axialToPixel(q, r, map.hexSize);
    const points = cornersToPoints(center, corners);
    const style = terrainStyle(terrainIdAt(map, q, r));
    const isSelected = state.selected && state.selected.q === q && state.selected.r === r;

    const hex = el('g', { 'data-q': q, 'data-r': r });
    hex.style.cursor = 'pointer';

    hex.appendChild(el('polygon', {
      points,
      fill: style.fill,
      stroke: GRID.stroke,
      'stroke-width': GRID.strokeWidth,
      'stroke-opacity': GRID.strokeOpacity,
    }));

    const code = el('text', {
      x: center.x,
      y: center.y - 3,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-size': 16,
      'font-family': 'monospace',
      'font-weight': 'bold',
      fill: style.ink,
      'fill-opacity': 0.8,
    });
    code.textContent = legendCharAt(map, q, r);
    hex.appendChild(code);

    const coords = el('text', {
      x: center.x,
      y: center.y + 14,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-size': 9,
      'font-family': 'monospace',
      fill: style.ink,
      'fill-opacity': 0.4,
    });
    coords.textContent = `${q},${r}`;
    hex.appendChild(coords);

    hex.addEventListener('click', () => onHexClick(q, r));
    grid.appendChild(hex);

    if (isSelected) {
      highlight.appendChild(el('polygon', {
        points,
        fill: 'none',
        stroke: SELECTION.stroke,
        'stroke-width': SELECTION.strokeWidth,
        'pointer-events': 'none',
      }));
    }
  });
}

/**
 * Bounding box in pixels for the whole board, padded by one hex size so edge
 * hexes aren't clipped. Used to size the SVG viewBox. Scans actual cell centres
 * rather than assuming q starts at 0 on every row, since rows are shifted
 * (hex.js rowQStart) to keep the map rectangular.
 */
export function boardPixelBounds(map) {
  const pad = map.hexSize;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  forEachCell(map, (q, r) => {
    const { x, y } = axialToPixel(q, r, map.hexSize);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}
