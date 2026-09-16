// Draws the hex grid, the terrain, the counters and the hover path preview.
// Reads state and map data, never mutates them — CLAUDE.md hard rule 7. It
// makes no game-state decisions: pointer events are handed straight back to
// the caller, and the move plan it draws is computed elsewhere and passed in.
//
// Colour and sprites come from theme.js only. Terrain rules come from the map
// data only. Nothing about a terrain type is written down in here, so editing
// the JSON changes the map with no code change (SPEC.md §12, M1).
//
// The board is built in two passes. The terrain never changes during play, so
// it is drawn once; the pieces layer redraws on every state change, including
// every hover, and is small enough that doing so is free.

import { axialToPixel, hexCorners } from '../hex.js';
import { forEachCell, legendCharAt, terrainIdAt } from '../map.js';
import { COUNTER, GRID, PATH, SELECTION, counterFrameId, createSpriteDefs, roleSymbolId, terrainStyle } from './theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function cornersToPoints(center, corners) {
  return corners.map((c) => `${center.x + c.x},${center.y + c.y}`).join(' ');
}

/**
 * Build the static half of the board: sprite defs, terrain hexes and the
 * (empty) layers the pieces pass fills in. Call once.
 *
 * @param {SVGSVGElement} svg
 * @param {object} map loaded map data, see map.js loadMap
 * @param {{onHexClick:Function, onHexHover:Function, onHexLeave:Function}} handlers
 * @returns {object} layer references, to hand to renderPieces
 */
export function createBoard(svg, map, handlers) {
  const corners = hexCorners(map.hexSize);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.appendChild(createSpriteDefs());

  const terrain = el('g', {});
  // Everything below is overlay: it must never eat a pointer event meant for
  // the hex underneath it.
  const reachable = el('g', { 'pointer-events': 'none' });
  const path = el('g', { 'pointer-events': 'none' });
  const highlight = el('g', { 'pointer-events': 'none' });
  const counters = el('g', { 'pointer-events': 'none' });
  for (const layer of [terrain, reachable, path, highlight, counters]) svg.appendChild(layer);

  forEachCell(map, (q, r) => {
    const center = axialToPixel(q, r, map.hexSize);
    const style = terrainStyle(terrainIdAt(map, q, r));

    const hex = el('g', { 'data-q': q, 'data-r': r });
    hex.style.cursor = 'pointer';

    hex.appendChild(el('polygon', {
      points: cornersToPoints(center, corners),
      fill: style.fill,
      stroke: GRID.stroke,
      'stroke-width': GRID.strokeWidth,
      'stroke-opacity': GRID.strokeOpacity,
    }));

    hex.appendChild(text(legendCharAt(map, q, r), {
      x: center.x, y: center.y - 3, 'font-size': 16, 'font-weight': 'bold',
      fill: style.ink, 'fill-opacity': 0.8,
    }));
    hex.appendChild(text(`${q},${r}`, {
      x: center.x, y: center.y + 14, 'font-size': 9, fill: style.ink, 'fill-opacity': 0.4,
    }));

    hex.addEventListener('click', () => handlers.onHexClick(q, r));
    hex.addEventListener('mouseenter', () => handlers.onHexHover(q, r));
    terrain.appendChild(hex);
  });

  svg.addEventListener('mouseleave', () => handlers.onHexLeave());

  return { svg, map, corners, reachable, path, highlight, counters };
}

function text(content, attrs) {
  const node = el('text', {
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-family': 'monospace',
    'pointer-events': 'none',
    ...attrs,
  });
  node.textContent = content;
  return node;
}

/**
 * Redraw everything that changes: reachable tint, hover path, selection
 * outline and the counters.
 *
 * @param {object} layers from createBoard
 * @param {object} state
 * @param {{reachable: Map|null, plan: object|null}} view derived in main.js —
 *        pathing is a game rule and does not belong in a render module.
 */
export function renderPieces(layers, state, view) {
  const { corners, map } = layers;
  for (const layer of [layers.reachable, layers.path, layers.highlight, layers.counters]) {
    layer.replaceChildren();
  }

  if (view.reachable) {
    const inset = corners.map((c) => ({ x: c.x * PATH.reachableInset, y: c.y * PATH.reachableInset }));
    for (const { q, r, cost } of view.reachable.values()) {
      if (cost === 0) continue;
      const center = axialToPixel(q, r, map.hexSize);
      layers.reachable.appendChild(el('polygon', {
        points: cornersToPoints(center, corners),
        fill: PATH.reachableFill,
        'fill-opacity': PATH.reachableOpacity,
      }));
      layers.reachable.appendChild(el('polygon', {
        points: cornersToPoints(center, inset),
        fill: 'none',
        stroke: PATH.reachableStroke,
        'stroke-width': PATH.reachableStrokeWidth,
        'stroke-opacity': PATH.reachableStrokeOpacity,
      }));
    }
  }

  if (view.plan) drawPlan(layers, view.plan);

  if (state.selectedHex) {
    layers.highlight.appendChild(el('polygon', {
      points: cornersToPoints(axialToPixel(state.selectedHex.q, state.selectedHex.r, map.hexSize), corners),
      fill: 'none',
      stroke: SELECTION.stroke,
      'stroke-width': SELECTION.strokeWidth,
    }));
  }

  state.units.forEach((unit, i) => {
    // The number on the counter is the trooper's place in the roster, which is
    // also his 1-6 hotkey and his position in the panel. One ordering, shown
    // in three places.
    layers.counters.appendChild(drawCounter(unit, i + 1, map, unit.id === state.selectedUnitId));
  });
}

// --- hover path preview -----------------------------------------------------
// SPEC.md §4: hovering a hex with a trooper selected draws the path and shows
// the total AP cost. The detection risk readout the same paragraph asks for
// needs enemies, so it arrives at M4.

function drawPlan(layers, plan) {
  const { map } = layers;
  const points = plan.path.map((hex) => axialToPixel(hex.q, hex.r, map.hexSize));
  const split = plan.affordableUpTo;

  if (split > 0) {
    layers.path.appendChild(polyline(points.slice(0, split + 1), {
      stroke: PATH.lineStroke,
      'stroke-width': PATH.lineWidth,
    }));
  }
  if (split < points.length - 1) {
    layers.path.appendChild(polyline(points.slice(split), {
      stroke: PATH.overspendStroke,
      'stroke-opacity': PATH.overspendOpacity,
      'stroke-width': PATH.lineWidth,
      'stroke-dasharray': PATH.overspendDash,
    }));
  }

  points.forEach((point, i) => {
    if (i === 0) return;
    const withinReach = i <= split;
    layers.path.appendChild(el('circle', {
      cx: point.x,
      cy: point.y,
      r: PATH.stepRadius,
      fill: withinReach ? PATH.lineStroke : 'none',
      stroke: withinReach ? PATH.lineStroke : PATH.overspendStroke,
      'stroke-opacity': withinReach ? 1 : PATH.overspendOpacity,
      'stroke-width': 2,
    }));
  });

  const end = points[points.length - 1];
  if (end) drawCostBadge(layers.path, end, plan);
}

function drawCostBadge(layer, at, plan) {
  const label = plan.minimumStep ? `${plan.total} AP — all of it` : `${plan.total} AP`;
  const width = label.length * 6.4 + 12;
  const y = at.y - 30;

  const badge = el('g', {});
  badge.appendChild(el('rect', {
    x: at.x - width / 2, y: y - 11, width, height: 20, rx: 4,
    fill: plan.affordable ? PATH.badgeFill : PATH.blockedStroke,
  }));
  badge.appendChild(text(label, {
    x: at.x, y: y - 1, 'font-size': 11, 'font-weight': 'bold', fill: PATH.badgeText,
  }));
  layer.appendChild(badge);
}

function polyline(points, attrs) {
  return el('polyline', {
    points: points.map((p) => `${p.x},${p.y}`).join(' '),
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...attrs,
  });
}

// --- counters ---------------------------------------------------------------
// All art is <use> of a registry symbol (CLAUDE.md rule 8). The AP pips and
// the selection ring are drawn here as geometry, the same way the hex outlines
// are: they are readouts of state, not artwork, and they have no asset id.

function drawCounter(unit, number, map, isSelected) {
  const center = axialToPixel(unit.q, unit.r, map.hexSize);
  const size = COUNTER.size;
  const group = el('g', {
    transform: `translate(${center.x - size / 2}, ${center.y - size / 2})`,
    opacity: unit.ap === 0 ? COUNTER.spentOpacity : 1,
  });

  group.appendChild(el('use', { href: `#${counterFrameId(unit)}`, width: size, height: size }));
  group.appendChild(el('use', { href: `#${roleSymbolId(unit.role)}`, x: 16, y: 12, width: 24, height: 24 }));

  // Roster number, boxed off at the left of the name strip.
  group.appendChild(el('rect', {
    x: 1, y: 38, width: COUNTER.nameBoxLeft - 1, height: 15,
    fill: COUNTER.numberFill, 'fill-opacity': 0.85,
  }));
  group.appendChild(text(String(number), {
    x: COUNTER.nameBoxLeft / 2, y: 46.5,
    'font-size': COUNTER.nameSize, 'font-weight': 'bold', fill: COUNTER.numberText,
  }));

  // Scaled as whole type, never stretched: a long name comes out smaller, not
  // condensed, so lettering keeps the same proportions on every counter.
  const room = COUNTER.nameBoxRight - COUNTER.nameBoxLeft;
  const fitted = room / Math.max(1, unit.shortName.length * COUNTER.nameAspect);
  group.appendChild(text(unit.shortName, {
    x: (COUNTER.nameBoxLeft + COUNTER.nameBoxRight) / 2, y: 46.5,
    'font-size': Math.min(COUNTER.nameSize, fitted).toFixed(2),
    'font-weight': 'bold', fill: COUNTER.nameFill,
  }));

  for (let i = 0; i < unit.apMax; i++) {
    const spent = i >= unit.ap;
    group.appendChild(el('circle', {
      cx: 27 - ((unit.apMax - 1) * 8) / 2 + i * 8,
      cy: 7.5,
      r: COUNTER.pipRadius,
      fill: spent ? 'none' : COUNTER.pipFill,
      stroke: COUNTER.pipFill,
      'stroke-width': 1,
      'stroke-opacity': spent ? 0.5 : 1,
    }));
  }

  if (isSelected) {
    group.appendChild(el('rect', {
      x: -2, y: -2, width: size, height: size, rx: 7,
      fill: 'none',
      stroke: COUNTER.selectedStroke,
      'stroke-width': COUNTER.selectedStrokeWidth,
    }));
  }

  return group;
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
