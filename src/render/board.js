// Draws the hex grid into an <svg>. Reads state, never mutates it —
// CLAUDE.md hard rule 7. Click handling is delegated back to the caller
// via onHexClick; this module makes no game-state decisions itself.
//
// M0 is functional, not art — plain fills/strokes. The sprite registry in
// theme.js and the halftone/paper look land at M7.

import { axialToPixel, hexCorners } from '../hex.js';

const FILL_DEFAULT = '#e8e8e8';
const FILL_SELECTED = '#f2c14e';
const STROKE_DEFAULT = '#333333';
const STROKE_SELECTED = '#a8790a';

const SVG_NS = 'http://www.w3.org/2000/svg';

function cornersToPoints(center, corners) {
  return corners.map((c) => `${center.x + c.x},${center.y + c.y}`).join(' ');
}

/**
 * @param {SVGSVGElement} svg
 * @param {{selected: {q:number,r:number}|null}} state
 * @param {{width:number, height:number, hexSize:number}} config
 * @param {(q:number, r:number) => void} onHexClick
 */
export function renderBoard(svg, state, config, onHexClick) {
  const { width, height, hexSize } = config;
  const corners = hexCorners(hexSize);

  // Clear previous render. Rendering owns only DOM it created, never state.
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const grid = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(grid);

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
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
    }
  }
}

/**
 * Bounding box in pixels for a config's full grid, padded by one hex size
 * so edge hexes aren't clipped. Used to size the SVG viewBox.
 */
export function boardPixelBounds(config) {
  const { width, height, hexSize } = config;
  const topLeft = axialToPixel(0, 0, hexSize);
  const bottomRight = axialToPixel(width - 1, height - 1, hexSize);
  const pad = hexSize;
  return {
    minX: topLeft.x - pad,
    minY: topLeft.y - pad,
    maxX: bottomRight.x + pad,
    maxY: bottomRight.y + pad,
  };
}
