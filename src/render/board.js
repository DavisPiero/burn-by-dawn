// Draws the hex grid, the terrain, the counters, the enemies and their vision,
// patrol routes, and the hover path preview with its detection risk pips.
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

import { NEIGHBOR_DIRS, axialToPixel, hexCorners } from '../hex.js';
import { forEachCell, hexKey, isInPlay, legendCharAt, terrainIdAt } from '../map.js';
import {
  CONTACT, COUNTER, ENEMY, GRID, MARKER, NOISE, PATH, RISK, ROUTE, SELECTION, TARGET, VISION, WATCH,
  counterFrameId, createSpriteDefs, enemySymbolId, roleSymbolId, terrainStyle,
} from './theme.js';

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

  const defs = createSpriteDefs();
  // A straight printed border instead of a serrated one. Only the terrain is
  // clipped: counters overhang the top and bottom edges by a few pixels, which
  // reads as a chit laid near the edge of the page, and clipping them would
  // slice them instead.
  const edge = boardEdges(map);
  const clip = el('clipPath', { id: 'board-edge' });
  clip.appendChild(el('rect', {
    x: edge.left, y: edge.top, width: edge.right - edge.left, height: edge.bottom - edge.top,
  }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const terrain = el('g', { 'clip-path': 'url(#board-edge)' });
  // Everything below is overlay: it must never eat a pointer event meant for
  // the hex underneath it.
  const vision = el('g', { 'pointer-events': 'none' });
  const reachable = el('g', { 'pointer-events': 'none' });
  const routes = el('g', { 'pointer-events': 'none' });
  const path = el('g', { 'pointer-events': 'none' });
  const highlight = el('g', { 'pointer-events': 'none' });
  const counters = el('g', { 'pointer-events': 'none' });
  const risk = el('g', { 'pointer-events': 'none' });
  for (const layer of [terrain, vision, reachable, routes, path, highlight, counters, risk]) svg.appendChild(layer);

  forEachCell(map, (q, r) => {
    const center = axialToPixel(q, r, map.hexSize);
    const style = terrainStyle(terrainIdAt(map, q, r));
    const inPlay = isInPlay(map, q, r);

    const hex = el('g', { 'data-q': q, 'data-r': r });

    hex.appendChild(el('polygon', {
      points: cornersToPoints(center, corners),
      fill: style.fill,
      'fill-opacity': inPlay ? 1 : GRID.outOfPlayOpacity,
      stroke: GRID.stroke,
      'stroke-width': GRID.strokeWidth,
      'stroke-opacity': inPlay ? GRID.strokeOpacity : GRID.strokeOpacity * GRID.outOfPlayOpacity,
    }));

    // The half-hexes past the border get terrain and nothing else: no labels
    // to be sliced by the clip, and no pointer events, so they cannot be
    // hovered, selected or moved to.
    if (!inPlay) {
      terrain.appendChild(hex);
      return;
    }

    hex.style.cursor = 'pointer';
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

  return { svg, map, corners, vision, reachable, routes, path, highlight, counters, risk };
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
 * Redraw everything that changes: vision, reachable tint, routes, hover path
 * and its risk pips, selection outline, contact and noise rings, who is
 * watching whom, bodies and dropped charges, action targets, and the counters
 * with their markers.
 *
 * @param {object} layers from createBoard
 * @param {object} state
 * @param {object} view derived in main.js — pathing, vision and detection are
 *        game rules and do not belong in a render module.
 */
export function renderPieces(layers, state, view) {
  const { corners, map } = layers;
  for (const layer of [layers.vision, layers.reachable, layers.routes, layers.path, layers.highlight, layers.counters, layers.risk]) {
    layer.replaceChildren();
  }

  drawVision(layers, view.visionById, view.hoverEnemy);

  if (view.reachable) drawReachable(layers, view.reachable);

  for (const route of view.routes) drawRoute(layers, route);

  if (view.targets) drawTargets(layers, view.targets);

  if (view.plan) drawPlan(layers, view.plan);
  if (view.plan && view.risk) drawRisk(layers, view.plan, view.risk);

  for (const hex of view.searchHexes) drawContact(layers, hex);
  for (const noise of state.noises) drawNoise(layers, noise);
  for (const body of state.bodies) drawOnGround(layers, 'marker-body', body, -1);
  for (const charge of state.droppedCharges) drawOnGround(layers, 'marker-charge', charge, 1);
  for (const enemy of state.enemies) if (enemy.watching) drawWatch(layers, enemy);

  if (state.selectedHex) {
    layers.highlight.appendChild(el('polygon', {
      points: cornersToPoints(axialToPixel(state.selectedHex.q, state.selectedHex.r, map.hexSize), corners),
      fill: 'none',
      stroke: SELECTION.stroke,
      'stroke-width': SELECTION.strokeWidth,
    }));
  }

  for (const enemy of state.enemies) {
    const hovered = enemy.id === view.hoverEnemy?.id;
    const counter = drawEnemy(enemy, map, hovered, view.hearsIds?.has(enemy.id));
    if (enemy.suppressed) counter.appendChild(marker('marker-suppressed', 38, -12));
    layers.counters.appendChild(counter);
  }

  state.units.forEach((unit, i) => {
    if (unit.dead) return;
    // The number on the counter is the trooper's place in the roster, which is
    // also his 1-6 hotkey and his position in the panel. One ordering, shown
    // in three places.
    const counter = drawCounter(unit, i + 1, map, unit.id === state.selectedUnitId);
    // In contact top right, where the eye goes first; his condition top left.
    if (unit.inContact) counter.appendChild(marker('marker-spotted', 38, -12));
    if (unit.hits > 0 && !unit.stabilised) counter.appendChild(marker('marker-wounded', -6, -12));
    if (unit.hidden) counter.appendChild(marker('marker-hidden', 38, 38));
    layers.counters.appendChild(counter);
  });
}

function marker(id, x, y) {
  return el('use', { href: `#${id}`, x, y, width: MARKER.size, height: MARKER.size });
}

// Things left on the ground sit in a lower corner of their hex, a body to one
// side and dropped charges to the other, so both show when they share it.
function drawOnGround(layers, id, at, side) {
  const p = axialToPixel(at.q, at.r, layers.map.hexSize);
  const size = MARKER.groundSize;
  layers.highlight.appendChild(el('use', {
    href: `#${id}`, x: p.x + side * 18 - size / 2, y: p.y + 14 - size / 2, width: size, height: size,
  }));
}

// SPEC.md §6: an enemy holding contact faces its man, and the board says who
// has whom with a dashed line to the hex it saw him on.
function drawWatch(layers, enemy) {
  const { map } = layers;
  const a = axialToPixel(enemy.q, enemy.r, map.hexSize);
  const b = axialToPixel(enemy.watching.q, enemy.watching.r, map.hexSize);
  layers.routes.appendChild(polyline([a, b], { stroke: WATCH.casing, 'stroke-width': WATCH.casingWidth }));
  layers.routes.appendChild(polyline([a, b], {
    stroke: WATCH.stroke, 'stroke-width': WATCH.width, 'stroke-dasharray': WATCH.dash,
  }));
}

// A noise made this turn, heard in the enemy phase.
function drawNoise(layers, noise) {
  const p = axialToPixel(noise.q, noise.r, layers.map.hexSize);
  for (const [stroke, width] of [[NOISE.casing, NOISE.casingWidth], [NOISE.stroke, NOISE.width]]) {
    layers.highlight.appendChild(el('circle', { cx: p.x, cy: p.y, r: NOISE.radius, fill: 'none', stroke, 'stroke-width': width }));
  }
  layers.highlight.appendChild(text('!', {
    x: p.x, y: p.y - NOISE.radius - 2, 'font-size': 18, 'font-weight': 'bold', fill: NOISE.text,
  }));
}

// Where the action being aimed can go.
function drawTargets(layers, targets) {
  drawAreaEdge(layers, layers.reachable, targets, [
    [TARGET.casing, TARGET.casingWidth],
    [TARGET.stroke, TARGET.width],
  ]);
}

// --- vision, routes, contact ------------------------------------------------
// SPEC.md §4: hovering an enemy highlights its vision arc and patrol route.
// Every arc is drawn faintly all the time as well — there is no fog of war
// (§6), and "arcs draw" is the M4 done-criterion.

function drawVision(layers, visionById, hoverEnemy) {
  const { corners, map } = layers;
  const all = new Map();
  for (const seen of visionById.values()) for (const [key, hex] of seen) all.set(key, hex);
  for (const { q, r } of all.values()) {
    layers.vision.appendChild(el('polygon', {
      points: cornersToPoints(axialToPixel(q, r, map.hexSize), corners),
      fill: VISION.fill,
      'fill-opacity': VISION.opacity,
    }));
  }
  if (!hoverEnemy) return;
  const mine = visionById.get(hoverEnemy.id);
  for (const { q, r } of mine.values()) {
    layers.vision.appendChild(el('polygon', {
      points: cornersToPoints(axialToPixel(q, r, map.hexSize), corners),
      fill: VISION.fill,
      'fill-opacity': VISION.hoverOpacity,
    }));
  }
  drawAreaEdge(layers, layers.vision, mine, [
    [VISION.edgeCasing, VISION.edgeCasingWidth],
    [VISION.edge, VISION.edgeWidth],
  ]);
}

function drawRoute(layers, route) {
  const { map } = layers;
  const points = route.hexes.map((h) => axialToPixel(h.q, h.r, map.hexSize));
  layers.routes.appendChild(polyline(points, { stroke: ROUTE.casing, 'stroke-width': ROUTE.casingWidth }));
  layers.routes.appendChild(polyline(points, {
    stroke: ROUTE.stroke, 'stroke-width': ROUTE.width, 'stroke-dasharray': ROUTE.dash,
  }));
  for (const w of route.waypoints) {
    const p = axialToPixel(w.q, w.r, map.hexSize);
    const size = ROUTE.waypointSize;
    layers.routes.appendChild(el('rect', {
      x: p.x - size / 2, y: p.y - size / 2, width: size, height: size,
      fill: ROUTE.casing, stroke: ROUTE.stroke, 'stroke-width': 2,
    }));
  }
}

function drawContact(layers, contact) {
  const p = axialToPixel(contact.q, contact.r, layers.map.hexSize);
  layers.highlight.appendChild(el('circle', {
    cx: p.x, cy: p.y, r: CONTACT.radius,
    fill: 'none', stroke: CONTACT.stroke, 'stroke-width': CONTACT.width, 'stroke-dasharray': CONTACT.dash,
  }));
  layers.highlight.appendChild(text('?', {
    x: p.x + CONTACT.radius - 4, y: p.y - CONTACT.radius + 4,
    'font-size': 18, 'font-weight': 'bold', fill: CONTACT.text,
  }));
}

// --- detection risk pips ------------------------------------------------------
// SPEC.md §4 and §6: a detection readout for every hex on the hover path, as
// pips. One pip per point of the threshold; filled pips are the score. Red
// means that hex gets him spotted. A hex no enemy can see gets no pips.

function drawRisk(layers, plan, risk) {
  const { map } = layers;
  plan.path.forEach((hex, i) => {
    const result = risk[i];
    if (!result) return;
    const at = axialToPixel(hex.q, hex.r, map.hexSize);
    const count = result.threshold;
    const filled = Math.max(0, Math.min(count, result.score));
    const width = count * RISK.pipGap + 6;
    const y = at.y + 20;

    layers.risk.appendChild(el('rect', {
      x: at.x - width / 2, y: y - 7, width, height: 14, rx: 7,
      fill: RISK.badgeFill,
      stroke: result.spotted ? RISK.spottedStroke : RISK.badgeStroke,
      'stroke-width': result.spotted ? 2.5 : 1.2,
    }));
    if (result.shot) {
      // What the shot does there: HIT in the open, PINNED in cover (SPEC.md §5).
      const label = result.shotResult === 'hit' ? 'HIT' : 'PINNED';
      const tagWidth = label.length * 6 + 8;
      layers.risk.appendChild(el('rect', {
        x: at.x - tagWidth / 2, y: y + 8, width: tagWidth, height: 13, rx: 2,
        fill: result.shotResult === 'hit' ? RISK.shotFill : RISK.pinnedFill,
      }));
      layers.risk.appendChild(text(label, {
        x: at.x, y: y + 15, 'font-size': 9, 'font-weight': 'bold', fill: RISK.shotText,
      }));
    }
    for (let p = 0; p < count; p++) {
      const colour = result.spotted ? RISK.spottedFill : RISK.pipFill;
      layers.risk.appendChild(el('circle', {
        cx: at.x - ((count - 1) * RISK.pipGap) / 2 + p * RISK.pipGap,
        cy: y,
        r: RISK.pipRadius,
        fill: p < filled ? colour : 'none',
        stroke: colour,
        'stroke-width': 1.2,
      }));
    }
  });
}

// --- move range ---------------------------------------------------------------

/**
 * For each neighbour direction, the two corner indices of the edge shared with
 * the neighbour that way. Worked out from the geometry — the two corners that
 * point furthest toward the neighbour's centre — rather than written out by
 * hand, because the corner order and the SPEC.md §2 direction order do not
 * line up and a hand-made table is an easy thing to get subtly wrong.
 */
function edgeCorners(corners, size) {
  return NEIGHBOR_DIRS.map((d) => {
    const toward = axialToPixel(d.q, d.r, size);
    return corners
      .map((c, i) => ({ i, dot: c.x * toward.x + c.y * toward.y }))
      .sort((a, b) => b.dot - a.dot)
      .slice(0, 2)
      .map((c) => c.i);
  });
}

/**
 * Tint every hex the selected trooper can reach this turn, then draw one
 * line round the outside of the area: every hex edge whose neighbour is not
 * reachable. The trooper's own hex counts as inside, so the line never cuts
 * between him and his range.
 */
function drawReachable(layers, reachable) {
  const { corners, map } = layers;
  for (const { q, r, cost } of reachable.values()) {
    if (cost === 0) continue;
    layers.reachable.appendChild(el('polygon', {
      points: cornersToPoints(axialToPixel(q, r, map.hexSize), corners),
      fill: PATH.reachableFill,
      'fill-opacity': PATH.reachableOpacity,
    }));
  }
  drawAreaEdge(layers, layers.reachable, reachable, [
    [PATH.reachableEdgeCasing, PATH.reachableEdgeCasingWidth],
    [PATH.reachableEdge, PATH.reachableEdgeWidth],
  ]);
}

/**
 * One line round the outside of a set of hexes (a Map keyed by hexKey): every
 * hex edge whose neighbour is not in the set, stroked once per [colour, width]
 * pair, widest first, so the line can be cased.
 */
function drawAreaEdge(layers, layer, area, strokes) {
  const { corners, map } = layers;
  const edges = edgeCorners(corners, map.hexSize);
  let outline = '';
  for (const { q, r } of area.values()) {
    const center = axialToPixel(q, r, map.hexSize);
    NEIGHBOR_DIRS.forEach((d, dir) => {
      if (area.has(hexKey(q + d.q, r + d.r))) return;
      const [a, b] = edges[dir].map((i) => corners[i]);
      outline += `M${center.x + a.x},${center.y + a.y} L${center.x + b.x},${center.y + b.y} `;
    });
  }
  if (!outline) return;
  for (const [stroke, width] of strokes) {
    layer.appendChild(el('path', {
      d: outline, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round',
    }));
  }
}

// --- hover path preview -----------------------------------------------------
// SPEC.md §4: hovering a hex with a trooper selected draws the path and shows
// the total AP cost. The risk pips for the same path are drawRisk, above.

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

  // Hovering his own hex is not a move: no badge. It would sit under his
  // counter, and "0 AP" says nothing. The risk pips for standing still stay.
  const end = points[points.length - 1];
  if (end && plan.steps > 0) drawCostBadge(layers.path, end, plan);
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
    opacity: unit.hidden ? MARKER.hiddenOpacity : unit.ap === 0 ? COUNTER.spentOpacity : 1,
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

// Enemy counters: frame, type, a strip naming the type, and a wedge outside
// the counter pointing the way it faces.
function drawEnemy(enemy, map, isHovered, hears) {
  const center = axialToPixel(enemy.q, enemy.r, map.hexSize);
  const size = COUNTER.size;
  const group = el('g', { transform: `translate(${center.x - size / 2}, ${center.y - size / 2})` });

  const d = NEIGHBOR_DIRS[enemy.facing];
  const toward = axialToPixel(d.q, d.r, 1);
  const len = Math.hypot(toward.x, toward.y);
  const ux = toward.x / len, uy = toward.y / len;
  const tip = { x: size / 2 + ux * (ENEMY.facingDistance + ENEMY.facingSize), y: size / 2 + uy * (ENEMY.facingDistance + ENEMY.facingSize) };
  const base = { x: size / 2 + ux * ENEMY.facingDistance, y: size / 2 + uy * ENEMY.facingDistance };
  const w = ENEMY.facingSize;
  group.appendChild(el('polygon', {
    points: `${tip.x},${tip.y} ${base.x - uy * w},${base.y + ux * w} ${base.x + uy * w},${base.y - ux * w}`,
    fill: ENEMY.facingFill, stroke: ENEMY.facingStroke, 'stroke-width': 1.5,
  }));

  group.appendChild(el('use', { href: '#counter-frame-enemy', width: size, height: size }));
  group.appendChild(el('use', { href: `#${enemySymbolId(enemy.type)}`, width: size, height: size }));

  const label = enemy.typeLabel.toUpperCase();
  const room = ENEMY.labelBoxRight - ENEMY.labelBoxLeft;
  const fitted = room / Math.max(1, label.length * COUNTER.nameAspect);
  group.appendChild(text(label, {
    x: (ENEMY.labelBoxLeft + ENEMY.labelBoxRight) / 2, y: 45.5,
    'font-size': Math.min(ENEMY.labelSize, fitted).toFixed(2), 'font-weight': 'bold', fill: ENEMY.labelFill,
  }));

  if (isHovered) {
    group.appendChild(el('rect', {
      x: -2, y: -2, width: size, height: size, rx: 9,
      fill: 'none', stroke: COUNTER.selectedStroke, 'stroke-width': COUNTER.selectedStrokeWidth,
    }));
  }
  if (hears) {
    group.appendChild(el('circle', {
      cx: size / 2, cy: size / 2, r: size / 2 + 6,
      fill: 'none', stroke: TARGET.hearsStroke, 'stroke-width': TARGET.hearsWidth, 'stroke-dasharray': '4 3',
    }));
  }
  return group;
}

/**
 * The straight border the board is clipped to, in pixels.
 *
 * Left and right are the bounding box of the in-play hexes, so every in-play
 * hex is whole and only the retired edge hexes are cut. Top and bottom are the
 * hexes' shoulder line, which trims the pointed tips off the first and last
 * rows without costing any playable area.
 */
export function boardEdges(map) {
  const half = map.hexSize * Math.sqrt(3) / 2; // half a hex width
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;

  forEachCell(map, (q, r) => {
    const { x, y } = axialToPixel(q, r, map.hexSize);
    top = Math.min(top, y - map.hexSize / 2);
    bottom = Math.max(bottom, y + map.hexSize / 2);
    if (!isInPlay(map, q, r)) return;
    left = Math.min(left, x - half);
    right = Math.max(right, x + half);
  });

  return { left, right, top, bottom };
}

/**
 * The SVG viewBox. The board itself is flush to boardEdges; this adds a few
 * pixels of margin so a counter standing on the top or bottom row, which
 * overhangs the border slightly, is not cut off by the edge of the SVG.
 */
export function boardPixelBounds(map) {
  const pad = 8;
  const edge = boardEdges(map);
  return {
    minX: edge.left - pad,
    minY: edge.top - pad,
    maxX: edge.right + pad,
    maxY: edge.bottom + pad,
  };
}
