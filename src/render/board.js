// Draws the hex grid into an <svg>. Reads state, never mutates it —
// CLAUDE.md hard rule 7. Click handling is delegated back to the caller
// via onHexClick; this module makes no game-state decisions itself.
//
// M0 is functional, not art — plain fills/strokes. The sprite registry in
// theme.js and the halftone/paper look land at M7.

import { axialToPixel, hexCorners, rowQStart } from '../hex.js';

const FILL_DEFAULT = '#e8e8e8';
const FILL_SELECTED = '#f2c14e';
const STROKE_DEFAULT = '#333333';
const STROKE_SELECTED = '#a8790a';

const SVG_NS = 'http://www.w3.org/2000/svg';

function cornersToPoints(center, corners) {
  return corners.map((c) => `${center.x + c.x},${center.y + c.y}`).join(' ');
}

// Every (q, r) in the map, row by row, with each row's q shifted so the
// map's bounding box is a rectangle rather than a parallelogram — see
// hex.js rowQStart.
function forEachCell(config, callback) {
  const { width, height } = config;
  for (let r = 0; r < height; r++) {
    const qStart = rowQStart(r);
    for (let i = 0; i < width; i++) {
      callback(qStart + i, r);
    }
  }
}

/**
 * @param {SVGSVGElement} svg
 * @param {{selected: {q:number,r:number}|null}} state
 * @param {{width:number, height:number, hexSize:number}} config
 * @param {(q:number, r:number) => void} onHexClick
 */
export function renderBoard(svg, state, config, onHexClick) {
  const { hexSize } = config;
  const corners = hexCorners(hexSize);

  // Clear previous render. Rendering owns only DOM it created, never state.
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const grid = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(grid);

  forEachCell(config, (q, r) => {
    const center = axialToPixel(q, r, hexSize);
    const isSelected = state.selected && state.selected.q === q && state.selected.r === r;

    const hex = document.createElementNS(SVG_NS, 'g');
    hex.setAttribute('data-q', String(q));
    hex.setAttribute('data-r', String(r));
    hex.style.cursor = 'pointer';

    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', cornersToPoints(center, corners));
    polygon.setAttribute('fill', isSelected ? FILL_SELECTED : FILL_DEFAULT);
    polygon.setAttribute('stroke', isSelected ? STROKE_SELECTED : STROKE_DEFAULT);
    polygon.setAttribute('stroke-width', isSelected ? '3' : '1');
    hex.appendChild(polygon);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(center.x));
    label.setAttribute('y', String(center.y));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-family', 'monospace');
    label.setAttribute('fill', isSelected ? '#3a2a00' : '#888888');
    label.textContent = `${q},${r}`;
    hex.appendChild(label);

    hex.addEventListener('click', () => onHexClick(q, r));

    grid.appendChild(hex);
  });
}

/**
 * Bounding box in pixels for a config's full grid, padded by one hex size
 * so edge hexes aren't clipped. Used to size the SVG viewBox. Scans actual
 * cell centers rather than assuming q starts at 0 on every row, since rows
 * are shifted (rowQStart) to keep the map rectangular.
 */
export function boardPixelBounds(config) {
  const { hexSize } = config;
  const pad = hexSize;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  forEachCell(config, (q, r) => {
    const { x, y } = axialToPixel(q, r, hexSize);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}
