// Draws the board: the printed terrain, the objectives and exfil, the enemies
// and their vision, patrol routes, the hover path preview with its detection
// risk pips, the counters, the drop runs and parachutes, and the speech
// bubbles of SPEC.md §11.
// Reads state and map data, never mutates them — CLAUDE.md hard rule 7. It
// makes no game-state decisions: pointer events are handed straight back to
// the caller, and the move plan it draws is computed elsewhere and passed in.
//
// Colour and art come from theme.js only, by sprite id (CLAUDE.md rule 8).
// Terrain rules come from the map data only.
//
// The board is built in two passes. The terrain never changes during play, so
// it is drawn once; the pieces layer redraws on every state change, including
// every hover, and is small enough that doing so is free.
//
// The only thing this module remembers between draws is how things looked
// last time — where each counter stood and when a blast went off — so a move
// and a blast play out once rather than again on every hover. That is drawing
// memory, not game state.

import { DIRECTION_NAMES, NEIGHBOR_DIRS, axialToPixel, hexCorners, hexLine } from '../hex.js';
import { forEachCell, hexKey, inBounds, isInPlay, terrainIdAt } from '../map.js';
import {
  BLAST, CONTACT, COUNTER, DROP, DROP_SHOW, ENEMY, HEDGE, RINGS, EXFIL, GRID, HIGHLIGHT, MARKER, MOTION, NOISE, OBJECTIVE, PATH, RAIL, RISK, ROAD, ROUTE,
  SELECTION, SPEECH, TARGET, THROW, TYPE, VISION, WATCH, counterFrameId, createSpriteDefs, enemySymbolId, fuseMarkerId,
  AREA, PLACE, objectiveArt, portraitId, roleSymbolId, speechBubble, terrainArt, terrainMotifId, toneClass, wobbleAt,
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

/** Degrees, in pixel space, from a hex centre toward its neighbour in direction `dir`. */
function directionAngle(dir) {
  const d = NEIGHBOR_DIRS[dir];
  const v = axialToPixel(d.q, d.r, 1);
  return (Math.atan2(v.y, v.x) * 180) / Math.PI;
}

/**
 * Build the static half of the board: sprite defs, terrain hexes and the
 * (empty) layers the pieces pass fills in. Call once.
 *
 * @param {SVGSVGElement} svg
 * @param {object} map loaded map data, see map.js loadMap
 * @param {{onHexClick:Function, onHexHover:Function, onHexLeave:Function,
 *   onRunHover?:Function, onRunLeave?:Function}} handlers
 * @returns {object} layer references, to hand to renderPieces
 */
export function createBoard(svg, map, handlers) {
  const corners = hexCorners(map.hexSize);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const defs = createSpriteDefs();
  // A straight printed border instead of a serrated one. Only the terrain is
  // clipped: counters overhang the top and bottom edges by a few pixels, which
  // reads as a chit laid near the edge of the page.
  const edge = boardEdges(map);
  const clip = el('clipPath', { id: 'board-edge' });
  clip.appendChild(el('rect', {
    x: edge.left, y: edge.top, width: edge.right - edge.left, height: edge.bottom - edge.top,
  }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const terrain = el('g', { 'clip-path': 'url(#board-edge)' });
  // Everything below is overlay: it must never eat a pointer event meant for
  // the hex underneath it, except the drop runs' names, which have rollovers.
  const overlay = (clipped) => el('g', { 'pointer-events': 'none', ...(clipped ? { 'clip-path': 'url(#board-edge)' } : {}) });
  const art = overlay(true);
  const vision = overlay(true);
  const sites = overlay(true);
  const reachable = overlay(true);
  const routes = overlay(false);
  const path = overlay(false);
  const highlight = overlay(false);
  const counters = overlay(false);
  // Burning charges sit over the counters: a man standing on his own charge
  // must not hide how long it has left.
  const tokens = overlay(false);
  const risk = overlay(false);
  const effects = overlay(false);
  const speech = overlay(false);
  const layerList = [terrain, art, vision, sites, reachable, routes, path, highlight, counters, tokens, risk, effects, speech];
  for (const layer of layerList) svg.appendChild(layer);

  // An objective's own art stands in for the terrain motif on its footprint:
  // the exchange's farmhouse hexes would otherwise print a cottage under it.
  const underArt = new Set((map.objectives ?? []).flatMap((o) => o.hexes.map((h) => (Array.isArray(h) ? hexKey(h[0], h[1]) : hexKey(h.q, h.r)))));
  forEachCell(map, (q, r) => {
    const center = axialToPixel(q, r, map.hexSize);
    const terrainId = terrainIdAt(map, q, r);
    const style = terrainArt(terrainId);
    const inPlay = isInPlay(map, q, r);
    const points = cornersToPoints(center, corners);

    const hex = el('g', { 'data-q': q, 'data-r': r });

    // Printed in plates: the flat base, a flat tint and a halftone screen over
    // it where the terrain has them, and the motif. Area terrain is printed
    // over all the hexes at once, below; the grid rule goes over everything.
    hex.appendChild(el('polygon', { points, fill: style.fill }));
    if (!style.area) {
      if (style.tint) hex.appendChild(el('polygon', { points, fill: style.tintFill, 'fill-opacity': style.tint[1] }));
      if (style.tone) hex.appendChild(el('polygon', { points, class: toneClass(...style.tone) }));
      if (style.banks) drawBanks(hex, map, q, r, center, style.banks);
      const motif = underArt.has(hexKey(q, r)) || (style.hedge && hedgeLinks(map, q, r).length > 0) ? null : terrainMotifId(style, q, r);
      if (motif) hex.appendChild(el('use', { href: `#${motif}`, x: center.x - 40, y: center.y - 46, width: 80, height: 92 }));
    }

    // The half-hexes past the border get no pointer events, so they cannot be
    // hovered, selected or moved to.
    if (!inPlay) {
      terrain.appendChild(hex);
      return;
    }
    hex.style.cursor = 'pointer';
    hex.addEventListener('click', () => handlers.onHexClick(q, r));
    hex.addEventListener('mouseenter', () => handlers.onHexHover(q, r));
    terrain.appendChild(hex);
  });

  // Over the hexes and under the grid, none of it taking the mouse: area
  // terrain, the grid rule, the dead wash over the half-hexes past the border,
  // then roads and the railway.
  const areas = el('g', { 'pointer-events': 'none' });
  drawAreas(areas, defs, map, corners);
  terrain.appendChild(areas);
  const grid = el('g', { 'pointer-events': 'none' });
  forEachCell(map, (q, r) => {
    const points = cornersToPoints(axialToPixel(q, r, map.hexSize), corners);
    grid.appendChild(el('polygon', {
      points, fill: 'none', stroke: GRID.stroke, 'stroke-width': GRID.strokeWidth, 'stroke-opacity': GRID.strokeOpacity,
    }));
    if (!isInPlay(map, q, r)) grid.appendChild(el('polygon', { points, fill: GRID.deadWash, 'fill-opacity': 1 - GRID.outOfPlayOpacity }));
  });
  terrain.appendChild(grid);

  const lines = el('g', { 'pointer-events': 'none' });
  const railway = railwayHexes(map);
  drawHedges(lines, map);
  drawRoads(lines, map, edge, railway);
  drawRailway(lines, map, edge);
  drawPlaces(lines, map);
  terrain.appendChild(lines);

  terrain.appendChild(el('rect', {
    x: edge.left, y: edge.top, width: edge.right - edge.left, height: edge.bottom - edge.top,
    fill: 'none', stroke: GRID.border, 'stroke-width': GRID.borderWidth, 'pointer-events': 'none',
  }));

  svg.addEventListener('mouseleave', () => handlers.onHexLeave());

  return {
    svg, map, corners, handlers, art, vision, sites, reachable, routes, path, highlight, counters, tokens, risk, effects, speech,
    // Drawing memory: where each counter was last drawn, and recent blasts.
    motion: new Map(),
    blasts: { report: null, list: [] },
  };
}

// --- area terrain (SPEC.md §11) --------------------------------------------------
// Woods, orchards, marsh and the ridge are printed as one shape over each run
// of neighbouring hexes of the same terrain, the way a map draws a wood, not
// as a tile per hex. The rules still read each hex; the shape is only ink.

/**
 * Every run of neighbouring hexes of each area terrain, drawn as its outline
 * (see AREA in theme.js) filled with the terrain's colour, with the terrain's
 * motif scattered over it hex by hex.
 */
function drawAreas(layer, defs, map, corners) {
  const edges = edgeCorners(corners, map.hexSize);
  const seen = new Set();
  let clips = 0;
  const motifs = [];
  forEachCell(map, (q0, r0) => {
    const id = terrainIdAt(map, q0, r0);
    const style = terrainArt(id);
    if (!style.area || seen.has(hexKey(q0, r0))) return;
    // The run of hexes, and each edge of it that faces something else, in
    // the hexes' own corner order so every loop goes the same way round.
    const run = [];
    const stack = [{ q: q0, r: r0 }];
    seen.add(hexKey(q0, r0));
    while (stack.length) {
      const h = stack.pop();
      run.push(h);
      for (const d of NEIGHBOR_DIRS) {
        const n = { q: h.q + d.q, r: h.r + d.r };
        if (seen.has(hexKey(n.q, n.r)) || terrainIdAt(map, n.q, n.r) !== id) continue;
        seen.add(hexKey(n.q, n.r));
        stack.push(n);
      }
    }
    const segments = [];
    for (const h of run) {
      const c = axialToPixel(h.q, h.r, map.hexSize);
      NEIGHBOR_DIRS.forEach((d, dir) => {
        if (terrainIdAt(map, h.q + d.q, h.r + d.r) === id) return;
        let [i, j] = edges[dir];
        if (j !== (i + 1) % 6) [i, j] = [j, i];
        segments.push({ a: { x: c.x + corners[i].x, y: c.y + corners[i].y }, b: { x: c.x + corners[j].x, y: c.y + corners[j].y } });
      });
      const motif = terrainMotifId(style, h.q, h.r);
      if (motif) motifs.push(el('use', { href: `#${motif}`, x: c.x - 40, y: c.y - 46, width: 80, height: 92 }));
    }
    const d = areaOutline(segments);
    const area = style.area;
    if (area.fill) {
      layer.appendChild(el('path', { d, class: area.fill, 'fill-rule': 'evenodd' }));
      if (area.tone) layer.appendChild(el('path', { d, class: toneClass(...area.tone), 'fill-rule': 'evenodd' }));
    }
    if (area.tint) layer.appendChild(el('path', { d, fill: area.tintFill, 'fill-opacity': area.tint[1], 'fill-rule': 'evenodd' }));
    if (area.rim) {
      const clipId = `area-clip-${clips++}`;
      const clip = el('clipPath', { id: clipId });
      clip.appendChild(el('path', { d, 'fill-rule': 'evenodd' }));
      defs.appendChild(clip);
      layer.appendChild(el('path', {
        d, fill: 'none', class: 'stroke-paper', 'stroke-width': area.rim.width, 'stroke-opacity': area.rim.opacity,
        'stroke-linejoin': 'round', 'clip-path': `url(#${clipId})`,
      }));
    }
    if (area.outline) {
      layer.appendChild(el('path', {
        d, fill: 'none', class: area.outlineClass ?? 'stroke-ink', 'stroke-width': area.outline,
        'stroke-linejoin': 'round', 'stroke-opacity': area.outlineOpacity ?? 1, ...(area.dash ? { 'stroke-dasharray': area.dash } : {}),
      }));
    }
  });
  for (const motif of motifs) layer.appendChild(motif);
}

/**
 * Chain boundary edges into closed loops and draw each as a rounded, wobbled
 * outline: through the middle of every edge, pushed along its normal, curving
 * round each corner.
 */
function areaOutline(segments) {
  const key = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  const from = new Map();
  for (const s of segments) {
    const k = key(s.a);
    if (!from.has(k)) from.set(k, []);
    from.get(k).push(s);
  }
  const used = new Set();
  const f = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = '';
  for (const start of segments) {
    if (used.has(start)) continue;
    const loop = [];
    let s = start;
    while (s && !used.has(s)) {
      used.add(s);
      loop.push(s);
      s = (from.get(key(s.b)) ?? []).find((n) => !used.has(n));
    }
    const mids = loop.map(({ a, b }) => {
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const push = wobbleAt(m.x, m.y) * AREA.wobble;
      return { x: m.x - ((b.y - a.y) / len) * push, y: m.y + ((b.x - a.x) / len) * push };
    });
    d += `M${f(mids[mids.length - 1])} `;
    loop.forEach((seg, i) => { d += `Q${f(seg.a)} ${f(mids[i])} `; });
    d += 'Z ';
  }
  return d;
}

// --- roads and the railway (SPEC.md §11) ---------------------------------------
// Drawn once, over the terrain, as continuous lines: a road is one smooth line
// through its hexes, never a motif stamped per hex, so a road running down the
// board's offset rows waves gently instead of zigzagging.

/** Every hex the railway's line passes through, keyed by hexKey. */
function railwayHexes(map) {
  const hexes = new Map();
  const points = (map.railway ?? []).map(([q, r]) => ({ q, r }));
  for (let i = 1; i < points.length; i++) {
    for (const h of hexLine(points[i - 1], points[i])) hexes.set(hexKey(h.q, h.r), h);
  }
  return hexes;
}

/** The point halfway from a hex's centre to its neighbour's: the middle of their shared edge. */
function edgeMiddle(map, q, r, dir) {
  const d = NEIGHBOR_DIRS[dir];
  const a = axialToPixel(q, r, map.hexSize), b = axialToPixel(q + d.q, r + d.r, map.hexSize);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Each road hex joins the middles of the edges its road leaves by: through its
 * centre as one curve when it leaves by two, as spokes from the centre at a
 * junction or an end. Neighbouring hexes meet at the same edge middle heading
 * the same way, so the lines join smoothly. A road that runs to the edge of
 * the map keeps going off it. Under the railway a road hex is drawn as the
 * railway; a road that meets the line runs straight up to it, a crossing.
 */
function drawRoads(layer, map, edge, railway) {
  const isRoad = (q, r) => Boolean(terrainArt(terrainIdAt(map, q, r)).road);
  // Where a road may end: a building, an objective, the exfil.
  const roadEnds = new Set([
    ...(map.objectives ?? []).flatMap((o) => o.hexes.map(([q, r]) => hexKey(q, r))),
    ...(map.exfil ?? []).map(([q, r]) => hexKey(q, r)),
  ]);
  forEachCell(map, (q, r) => { if (terrainArt(terrainIdAt(map, q, r)).building) roadEnds.add(hexKey(q, r)); });
  const f = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = '';
  forEachCell(map, (q, r) => {
    // A road hex under the railway is drawn as the railway.
    if (!isRoad(q, r) || railway.has(hexKey(q, r))) return;
    const links = [];
    let crossing = null;
    NEIGHBOR_DIRS.forEach((n, dir) => {
      if (!isRoad(q + n.q, r + n.r)) return;
      // A road meets the railway once, at one crossing, however many of the
      // line's hexes it touches.
      if (railway.has(hexKey(q + n.q, r + n.r))) {
        if (crossing !== null) return;
        crossing = dir;
      }
      links.push(dir);
    });
    // A road never stops in the middle of a hex. One that ends runs on out
    // of it the way it was going: off the board, or up to the building, the
    // objective or the exfil it leads to, or at least to the hex's far edge.
    let arrival = null;
    if (links.length === 1) {
      const away = (links[0] + 3) % 6;
      const n = NEIGHBOR_DIRS[away];
      const next = { q: q + n.q, r: r + n.r };
      links.push(away);
      if (inBounds(map, next.q, next.r) && roadEnds.has(hexKey(next.q, next.r))) arrival = axialToPixel(next.q, next.r, map.hexSize);
    }
    const c = axialToPixel(q, r, map.hexSize);
    const mids = links.map((dir) => edgeMiddle(map, q, r, dir));
    if (mids.length === 2) d += `M${f(mids[0])} Q${f(c)} ${f(mids[1])} `;
    else for (const m of mids) d += `M${f(m)} L${f(c)} `;
    if (arrival) d += `M${f(mids[1])} L${f(arrival)} `;
    if (crossing !== null) {
      const n = NEIGHBOR_DIRS[crossing];
      d += `M${f(edgeMiddle(map, q, r, crossing))} L${f(axialToPixel(q + n.q, r + n.r, map.hexSize))} `;
    }
  });
  if (!d) return;
  layer.appendChild(el('path', { d, fill: 'none', stroke: ROAD.edge, 'stroke-width': ROAD.edgeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  layer.appendChild(el('path', { d, fill: 'none', stroke: ROAD.fill, 'stroke-width': ROAD.fillWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

/**
 * Which hedgerow hexes are joined by a hedge: a spanning tree of each run of
 * neighbouring hedgerow hexes, found breadth first in a fixed order, so a
 * clump of three touching hexes draws as a bend, never a little triangle.
 * Keyed by hexKey, each a list of directions.
 */
function hedgeTree(map) {
  const isHedge = (q, r) => Boolean(terrainArt(terrainIdAt(map, q, r)).hedge);
  const links = new Map();
  const seen = new Set();
  const join = (a, dir) => {
    const k = hexKey(a.q, a.r);
    if (!links.has(k)) links.set(k, []);
    links.get(k).push(dir);
  };
  forEachCell(map, (q0, r0) => {
    if (!isHedge(q0, r0) || seen.has(hexKey(q0, r0))) return;
    seen.add(hexKey(q0, r0));
    const queue = [{ q: q0, r: r0 }];
    while (queue.length) {
      const h = queue.shift();
      NEIGHBOR_DIRS.forEach((n, dir) => {
        const next = { q: h.q + n.q, r: h.r + n.r };
        if (!isHedge(next.q, next.r) || seen.has(hexKey(next.q, next.r))) return;
        seen.add(hexKey(next.q, next.r));
        join(h, dir);
        join(next, (dir + 3) % 6);
        queue.push(next);
      });
    }
  });
  return links;
}

/** Place names, printed on the map under everything that moves. */
function drawPlaces(layer, map) {
  for (const place of map.places ?? []) {
    const style = PLACE[place.kind] ?? PLACE.other;
    const c = axialToPixel(place.at[0], place.at[1], map.hexSize);
    const y = c.y + (place.dy ?? 0) * map.hexSize;
    const attrs = {
      x: c.x, y, 'font-family': PLACE.font, 'font-size': style.size, 'font-weight': style.weight,
      'font-style': style.italic ? 'italic' : 'normal', 'letter-spacing': style.spacing,
      ...(place.angle ? { transform: `rotate(${place.angle} ${c.x} ${y})` } : {}),
    };
    const name = style.capitals ? place.name.toUpperCase() : place.name;
    if (style.halo !== false) {
      layer.appendChild(text(name, { ...attrs, fill: 'none', stroke: PLACE.halo, 'stroke-width': PLACE.haloWidth, 'stroke-linejoin': 'round', 'stroke-opacity': 0.85 }));
    }
    layer.appendChild(text(name, { ...attrs, fill: style.fill, 'fill-opacity': style.opacity ?? 1 }));
  }
}

/** The directions from a hedgerow hex to the hedgerow hexes its hedge joins. */
// Worked out once per map: drawing memory, never written onto the map itself.
const hedgeTrees = new WeakMap();

function hedgeLinks(map, q, r) {
  if (!hedgeTrees.has(map)) hedgeTrees.set(map, hedgeTree(map));
  return [...(hedgeTrees.get(map).get(hexKey(q, r)) ?? [])];
}

/**
 * Hedgerows as hedges: each hedgerow hex joins the middles of the edges its
 * hedge leaves by, like a road. A hedge that ends in a hex runs on through it
 * to the far edge, so it never stops short in the middle of a field.
 */
function drawHedges(layer, map) {
  const f = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = '';
  forEachCell(map, (q, r) => {
    if (!terrainArt(terrainIdAt(map, q, r)).hedge) return;
    const links = hedgeLinks(map, q, r);
    if (links.length === 0) return;
    if (links.length === 1) links.push((links[0] + 3) % 6);
    const c = axialToPixel(q, r, map.hexSize);
    const mids = links.map((dir) => edgeMiddle(map, q, r, dir));
    if (mids.length === 2) d += `M${f(mids[0])} Q${f(c)} ${f(mids[1])} `;
    else for (const m of mids) d += `M${f(m)} L${f(c)} `;
  });
  if (!d) return;
  const stroke = (cls, width, extra = {}) => el('path', {
    d, fill: 'none', class: cls, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra,
  });
  layer.appendChild(stroke('stroke-ink', HEDGE.edgeWidth));
  layer.appendChild(stroke('stroke-ink', HEDGE.lumpEdgeWidth, { 'stroke-dasharray': HEDGE.lumpSpacing }));
  layer.appendChild(stroke('stroke-green', HEDGE.width));
  layer.appendChild(stroke('stroke-green', HEDGE.lumpWidth, { 'stroke-dasharray': HEDGE.lumpSpacing }));
}

/**
 * The railway: straight through its waypoints' centres, carried on past the
 * first and last to the board's edge, as a bed, two rails and the sleepers across them.
 */
function drawRailway(layer, map, edge) {
  const points = (map.railway ?? []).map(([q, r]) => axialToPixel(q, r, map.hexSize));
  if (points.length < 2) return;
  const reach = (edge.right - edge.left) + (edge.bottom - edge.top);
  const extend = (from, to) => {
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    return { x: to.x + ((to.x - from.x) / len) * reach, y: to.y + ((to.y - from.y) / len) * reach };
  };
  const line = [extend(points[1], points[0]), ...points, extend(points.at(-2), points.at(-1))];
  layer.appendChild(polyline(line, { stroke: RAIL.bed, 'stroke-width': RAIL.bedWidth, 'stroke-opacity': RAIL.bedOpacity, 'stroke-linecap': 'butt' }));
  layer.appendChild(polyline(line, { stroke: RAIL.rail, 'stroke-width': RAIL.railWidth, 'stroke-linecap': 'butt' }));
  layer.appendChild(polyline(line, { stroke: RAIL.gauge, 'stroke-width': RAIL.gaugeWidth, 'stroke-linecap': 'butt' }));
  layer.appendChild(polyline(line, { stroke: RAIL.sleeper, 'stroke-width': RAIL.sleeperWidth, 'stroke-dasharray': RAIL.sleeperDash, 'stroke-linecap': 'butt' }));
}

/** Water gets a bank on every edge that faces dry land on the board. */
function drawBanks(hex, map, q, r, center, water) {
  NEIGHBOR_DIRS.forEach((d, dir) => {
    const next = terrainIdAt(map, q + d.q, r + d.r);
    if (next === null || water.includes(next)) return;
    const g = el('g', { transform: `translate(${center.x - 40} ${center.y - 46}) rotate(${directionAngle(dir)} 40 46)` });
    g.appendChild(el('use', { href: '#terrain-canal-edge', width: 80, height: 92 }));
    hex.appendChild(g);
  });
}

function text(content, attrs) {
  const node = el('text', {
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-family': TYPE.typewriter,
    'pointer-events': 'none',
    ...attrs,
  });
  node.textContent = content;
  return node;
}

/**
 * Redraw everything that changes.
 *
 * @param {object} layers from createBoard
 * @param {object} state
 * @param {object} view derived in main.js — pathing, vision and detection are
 *        game rules and do not belong in a render module.
 */
export function renderPieces(layers, state, view) {
  const { corners, map } = layers;
  for (const layer of [layers.art, layers.vision, layers.sites, layers.reachable, layers.routes, layers.path, layers.highlight, layers.counters, layers.tokens, layers.risk, layers.effects, layers.speech]) {
    layer.replaceChildren();
  }
  const now = performance.now();

  drawArt(layers, state, view);
  drawVision(layers, view.visionById, view.hoverEnemy);
  drawSites(layers, state, view);
  if (view.drop) drawDrop(layers, view.drop);

  if (view.reachable) drawReachable(layers, view.reachable);

  for (const route of view.routes) drawRoute(layers, route);

  if (view.targets) drawTargets(layers, view.targets);
  if (view.throwPreview) drawThrow(layers, view.throwPreview);

  if (view.plan) drawPlan(layers, view.plan, view.risk);
  if (view.plan && view.risk) drawRisk(layers, view.plan, view.risk);

  for (const hex of view.searchHexes) drawContact(layers, hex);
  for (const noise of state.noises) drawNoise(layers, noise);
  for (const body of state.bodies) drawOnGround(layers, body.enemyId ? 'marker-body-enemy' : 'marker-body', body, -1);
  const show = view.dropShow ? dropTimeline(map, view.dropShow) : null;
  const elapsed = show ? now - view.dropShow.since : 0;
  for (const chute of state.parachutes) appear(drawParachute(layers, chute), show?.byUnit.get(chute.unitId), elapsed);
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
  if (view.highlightHex) drawHighlight(layers, view.highlightHex);

  for (const enemy of state.enemies) {
    const hovered = enemy.id === view.hoverEnemy?.id;
    const counter = drawEnemy(enemy, map, hovered, view.hearsIds?.has(enemy.id));
    // Suppressed, or still open to a kill after it (SPEC.md §4): both are
    // under the gunner's fire, and the hover says which.
    if (enemy.suppressed || enemy.openToKill) counter.appendChild(marker('marker-suppressed', 38, -12));
    if (!enemy.killable) counter.appendChild(marker('marker-no-kill', -10, -12));
    layers.counters.appendChild(counter);
  }

  state.units.forEach((unit, i) => {
    if (!unit.landed || unit.dead || unit.out) {
      layers.motion.delete(`unit:${unit.id}`);
      return;
    }
    // The number on the counter is the trooper's place in the roster, which is
    // also his 1-6 hotkey and his position in the panel. One ordering, shown
    // in three places.
    const counter = drawCounter(unit, i + 1, map, unit.id === state.selectedUnitId);
    // In contact top right, where the eye goes first; his condition top left.
    if (unit.inContact) counter.appendChild(marker('marker-spotted', 38, -12));
    if (unit.hits > 0 && !unit.stabilised) counter.appendChild(marker('marker-wounded', -6, -12));
    if (unit.hidden) counter.appendChild(marker('marker-hidden', 38, 38));
    const mover = el('g', {});
    mover.appendChild(counter);
    layers.counters.appendChild(mover);
    travel(layers, mover, unit, now);
    appear(counter, show?.byUnit.get(unit.id), elapsed);
  });

  drawBlasts(layers, state, now);
  drawTargetRings(layers, view.targetRings, now);
  if (show) drawDropShow(layers, view.dropShow, show, elapsed);
  // Nobody speaks until the stick is down.
  else drawSpeech(layers, state, view.speakers ?? new Set());
}

// --- target rings (SPEC.md §11) --------------------------------------------------

/**
 * Marker-pen rings round the targets and the exfil, before a drop run is
 * picked. Each is drawn on once, in turn; a redraw part-way carries on. When
 * they go, the drawing memory goes with them, so they draw on again if the
 * player goes back to no run.
 */
function drawTargetRings(layers, rings, now) {
  if (!rings) {
    layers.ringsSince = null;
    return;
  }
  layers.ringsSince ??= now;
  const elapsed = now - layers.ringsSince;
  const { map } = layers;
  const edge = boardEdges(map);
  const midX = (edge.left + edge.right) / 2;
  rings.forEach((ring, i) => {
    const points = ring.hexes.map((h) => axialToPixel(h.q, h.r, map.hexSize));
    const half = { x: map.hexSize * Math.sqrt(3) / 2, y: map.hexSize };
    const left = Math.min(...points.map((p) => p.x)) - half.x, right = Math.max(...points.map((p) => p.x)) + half.x;
    const top = Math.min(...points.map((p) => p.y)) - half.y, bottom = Math.max(...points.map((p) => p.y)) + half.y;
    const c = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const rx = (right - left) / 2 + RINGS.margin, ry = (bottom - top) / 2 + RINGS.margin;
    const colour = RINGS[ring.colour] ?? RINGS.red;
    const loops = ring.primary ? 2 : 1;
    for (let loop = 0; loop < loops; loop++) {
      const start = -2.2 + loop * 0.9 + wobbleAt(c.x, c.y);
      const phase = (wobbleAt(c.y + loop, c.x) + 1) * Math.PI;
      const turns = 1 + RINGS.overshoot;
      let d = '';
      const steps = 64;
      for (let k = 0; k <= steps; k++) {
        const t = start + (k / steps) * turns * Math.PI * 2;
        // The pen drifts outward as it goes round, so the ends pass each other.
        // A hand's sway, not pen noise: two slow waves, phased by where it is.
        const sway = Math.sin(2 * t + phase) * 0.6 + Math.sin(3 * t + phase * 2) * 0.4;
        const grow = 1 + (k / steps) * 0.07 + loop * 0.05 + sway * RINGS.wobble;
        const x = c.x + Math.cos(t) * rx * grow, y = c.y + Math.sin(t) * ry * grow;
        d += `${k === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      const path = el('path', { d, fill: 'none', stroke: colour, 'stroke-width': RINGS.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, opacity: 0.9 });
      layers.effects.appendChild(path);
      playFrom(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        delay: (i + loop * 0.5) * RINGS.staggerMs, duration: RINGS.drawMs,
      }, elapsed);
    }
    // The note, on the side of the ring toward the middle of the board. It may
    // be several lines; the last sits just above the ring.
    const east = c.x < midX;
    const x = east ? c.x + rx * 0.75 : c.x - rx * 0.75;
    const lines = [].concat(ring.note);
    const note = text('', {
      'text-anchor': east ? 'start' : 'end', 'font-family': SPEECH.font, 'font-weight': 'bold',
      'font-size': RINGS.noteSize, fill: colour, stroke: RINGS.halo, 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round',
    });
    lines.forEach((words, k) => {
      const span = el('tspan', { x, y: c.y - ry - 8 - (lines.length - 1 - k) * RINGS.noteSize * RINGS.noteLeading });
      span.textContent = words;
      note.appendChild(span);
    });
    layers.effects.appendChild(note);
    playFrom(note, [{ opacity: 0 }, { opacity: 1 }], { delay: i * RINGS.staggerMs + RINGS.drawMs, duration: 120 }, elapsed);
  });
}

// --- the drop shown (SPEC.md §11) ----------------------------------------------
// Display only: the rules have already put every man down, and this plays the
// aircraft's pass and the canopies coming down to where they are. Like a
// move, it is drawing memory: redrawn mid-way (the mouse moving), each piece
// carries on from where it was, by `elapsed` since the jump.

/**
 * When everything in the drop happens, from where the aircraft crosses each
 * man's jump point. `show` is { from, to, jumps: [{ unitId, jump, land }] }
 * in hexes. Exported so main.js knows when it is over.
 */
export function dropTimeline(map, show) {
  const px = (h) => axialToPixel(h.q, h.r, map.hexSize);
  const a = px(show.from), b = px(show.to);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  const runIn = DROP_SHOW.runIn * map.hexSize * Math.sqrt(3);
  const start = { x: a.x - ux * runIn, y: a.y - uy * runIn };
  const end = { x: b.x + ux * runIn, y: b.y + uy * runIn };
  const total = len + runIn * 2;
  const byUnit = new Map();
  let last = DROP_SHOW.flightMs;
  for (const j of show.jumps) {
    const p = px(j.jump);
    const along = (p.x - start.x) * ux + (p.y - start.y) * uy;
    const jumpAt = Math.max(0, (along / total) * DROP_SHOW.flightMs);
    const landAt = jumpAt + DROP_SHOW.openMs + DROP_SHOW.driftMs;
    byUnit.set(j.unitId, { jumpAt, landAt, from: p, to: px(j.land) });
    last = Math.max(last, landAt + DROP_SHOW.collapseMs);
  }
  return { start, end, angle: (Math.atan2(uy, ux) * 180) / Math.PI, byUnit, length: last + DROP_SHOW.tailMs };
}

/** Hide something until its man is down, then show it at once. */
function appear(node, timing, elapsed) {
  if (!timing || elapsed >= timing.landAt || typeof node.animate !== 'function') return;
  const animation = node.animate([{ opacity: 0 }, { opacity: 1 }], {
    delay: timing.landAt, duration: DROP_SHOW.appearMs, fill: 'both', easing: 'linear',
  });
  animation.currentTime = elapsed;
}

/** Run `frames` on `node` as if it had started `elapsed` ago. */
function playFrom(node, frames, options, elapsed) {
  if (typeof node.animate !== 'function') return;
  const animation = node.animate(frames, { fill: 'both', easing: 'linear', ...options });
  animation.currentTime = elapsed;
}

function drawDropShow(layers, show, timeline, elapsed) {
  const { start, end, angle } = timeline;
  const size = DROP_SHOW.aircraftSize;
  const at = (p, extra = '') => `translate(${p.x}px, ${p.y}px) rotate(${angle}deg)${extra}`;

  // Each canopy, and its shadow on the ground closing in as it comes down.
  const canopy = DROP_SHOW.canopySize;
  const open = DROP_SHOW.openMs, drift = DROP_SHOW.driftMs, collapse = DROP_SHOW.collapseMs;
  const whole = open + drift + collapse;
  for (const t of timeline.byUnit.values()) {
    if (elapsed >= t.landAt + collapse) continue;
    const move = (p, scale, opacity) => ({ transform: `translate(${p.x}px, ${p.y}px) scale(${scale})`, opacity });
    const shadow = el('g', {});
    shadow.appendChild(el('use', { href: '#parachute-canopy-shadow', x: -canopy / 2, y: -canopy / 2, width: canopy, height: canopy, opacity: 0.18 }));
    const off = DROP_SHOW.shadowStart;
    const shifted = (p, d) => ({ x: p.x + d, y: p.y + d });
    playFrom(shadow, [
      { ...move(shifted(t.from, off), 0.3, 0), offset: 0 },
      { ...move(shifted(t.from, off), 0.9, 1), offset: open / whole },
      { ...move(shifted(t.to, 2), 0.8, 1), offset: (open + drift) / whole },
      { ...move(shifted(t.to, 2), 0.4, 0), offset: 1 },
    ], { delay: t.jumpAt, duration: whole }, elapsed);
    const body = el('g', {});
    body.appendChild(el('use', { href: '#parachute-canopy', x: -canopy / 2, y: -canopy / 2, width: canopy, height: canopy }));
    playFrom(body, [
      { ...move(t.from, 0.3, 0), offset: 0 },
      { ...move(t.from, 1, 1), offset: open / whole },
      { ...move(t.to, 0.8, 1), offset: (open + drift) / whole },
      { ...move(t.to, 0.4, 0), offset: 1 },
    ], { delay: t.jumpAt, duration: whole }, elapsed);
    layers.effects.append(shadow, body);
  }

  // The aircraft over everything, its shadow far below it.
  if (elapsed < DROP_SHOW.flightMs) {
    const s = DROP_SHOW.aircraftShadow;
    const shadow = el('g', {});
    shadow.appendChild(el('use', { href: '#aircraft-dakota-shadow', x: -size / 2, y: -size / 2, width: size, height: size, opacity: s.opacity }));
    playFrom(shadow, [
      { transform: at({ x: start.x + s.x, y: start.y + s.y }) },
      { transform: at({ x: end.x + s.x, y: end.y + s.y }) },
    ], { duration: DROP_SHOW.flightMs }, elapsed);
    const plane = el('g', {});
    plane.appendChild(el('use', { href: '#aircraft-dakota', x: -size / 2, y: -size / 2, width: size, height: size }));
    playFrom(plane, [{ transform: at(start) }, { transform: at(end) }], { duration: DROP_SHOW.flightMs }, elapsed);
    layers.effects.append(shadow, plane);
  }
}

// --- motion (SPEC.md §11: stepped, never eased) --------------------------------

/**
 * A man who has just moved travels his path to where he now stands: quickly,
 * at a steady pace, and stops dead — no easing (SPEC.md §11). The path is the
 * hexes he entered this turn after the one he was last drawn on. A redraw
 * part-way through carries the journey on from where it was. A man appearing
 * for the first time (the drop) simply appears.
 */
function travel(layers, mover, unit, now) {
  const key = `unit:${unit.id}`;
  const where = hexKey(unit.q, unit.r);
  const last = layers.motion.get(key);
  if (!last) {
    layers.motion.set(key, { where, since: -Infinity, path: [], at: { q: unit.q, r: unit.r } });
    return;
  }
  if (last.where !== where) {
    const trail = unit.trail ?? [];
    const from = trail.map((h) => hexKey(h.q, h.r)).lastIndexOf(last.where);
    let steps = trail.slice(from + 1);
    if (steps.length === 0 || hexKey(steps.at(-1).q, steps.at(-1).r) !== where) steps = [{ q: unit.q, r: unit.r }];
    layers.motion.set(key, { where, since: now, path: [last.at, ...steps] });
  }
  layers.motion.get(key).at = { q: unit.q, r: unit.r };

  const journey = layers.motion.get(key);
  const duration = (journey.path.length - 1) * MOTION.travelMsPerHex;
  const elapsed = now - journey.since;
  if (!(duration > 0) || elapsed >= duration || typeof mover.animate !== 'function') return;
  const end = axialToPixel(unit.q, unit.r, layers.map.hexSize);
  const frames = journey.path.map((h) => {
    const p = axialToPixel(h.q, h.r, layers.map.hexSize);
    return { transform: `translate(${p.x - end.x}px, ${p.y - end.y}px)` };
  });
  const animation = mover.animate(frames, { duration, easing: 'linear' });
  animation.currentTime = elapsed;
}

// A starburst where each charge went off, revealed in steps and then gone.
function drawBlasts(layers, state, now) {
  if (layers.blasts.report !== state.report) {
    layers.blasts = {
      report: state.report,
      list: state.report.filter((e) => e.kind === 'explosion').map((e) => ({ q: e.q, r: e.r, since: now })),
    };
  }
  for (const blast of layers.blasts.list) {
    const elapsed = now - blast.since;
    if (elapsed >= MOTION.blastMs) continue;
    const p = axialToPixel(blast.q, blast.r, layers.map.hexSize);
    const size = BLAST.artSize;
    const outer = el('g', { transform: `translate(${p.x - size / 2} ${p.y - size / 2})` });
    const inner = el('g', { class: 'nd-blast' });
    inner.style.animationDelay = `${-Math.round(elapsed)}ms`;
    inner.appendChild(el('use', { href: '#marker-blast', width: size, height: size }));
    outer.appendChild(inner);
    layers.effects.appendChild(outer);
  }
}

// --- speech bubbles (SPEC.md §5 Dialogue, §11) ---------------------------------

/**
 * The line of each man in `speakers` — the one selected and the one under the
 * mouse — in a bubble near his counter, the tail pointing at him. Lines wrap
 * by their measured width in the lettering face. Bubbles are placed in turn,
 * each at the nearest spot above or below him, to either side, that stays on
 * the board and covers neither an earlier bubble nor any counter; the tail
 * stretches to reach him. If nowhere is clear, the nearest spot on the board
 * is used anyway.
 */
function drawSpeech(layers, state, speakers) {
  const { map } = layers;
  const edge = boardEdges(map);
  const half = COUNTER.drawn / 2;
  const counterBox = (at) => {
    const c = axialToPixel(at.q, at.r, map.hexSize);
    return { x: c.x - half - 4, y: c.y - half - 4, width: COUNTER.drawn + 8, height: COUNTER.drawn + 8 };
  };
  const taken = [
    ...state.units.filter((u) => u.landed && !u.dead && !u.out).map(counterBox),
    ...state.enemies.map(counterBox),
  ];
  const overlaps = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
  const letter = (content, attrs = {}) => text(content, {
    'text-anchor': 'start', 'font-size': SPEECH.fontSize, 'font-family': SPEECH.font, 'font-weight': SPEECH.weight, class: 'ink', ...attrs,
  });
  const measure = (content) => {
    const probe = letter(content, { visibility: 'hidden' });
    layers.speech.appendChild(probe);
    const width = probe.getComputedTextLength();
    probe.remove();
    return width;
  };

  for (const { unitId, line } of state.speech ?? []) {
    if (!speakers.has(unitId)) continue;
    const unit = state.units.find((u) => u.id === unitId);
    if (!unit || !unit.landed || unit.dead || unit.out) continue;
    const c = axialToPixel(unit.q, unit.r, map.hexSize);
    const lines = [];
    for (const word of (SPEECH.capitals ? line.toUpperCase() : line).split(/\s+/)) {
      const joined = lines.length ? `${lines.at(-1)} ${word}` : word;
      if (lines.length && measure(joined) <= SPEECH.maxWidth) lines[lines.length - 1] = joined;
      else lines.push(word);
    }
    const width = Math.max(...lines.map(measure)) + SPEECH.padX * 2;
    const height = lines.length * SPEECH.lineHeight + SPEECH.padY * 2;

    const options = [];
    for (let step = 0; step < 5; step++) {
      const lift = SPEECH.gap + step * (map.hexSize * 0.75);
      for (const side of [1, -1]) {
        const x = side > 0 ? c.x - 14 : c.x + 14 - width;
        const tipX = c.x + side * 6;
        options.push({ x, y: c.y - lift - height, tip: { x: tipX, y: c.y - half } });
        options.push({ x, y: c.y + lift, tip: { x: tipX, y: c.y + half } });
      }
    }
    const onBoard = (o) => o.x >= edge.left && o.x + width <= edge.right && o.y >= edge.top && o.y + height <= edge.bottom;
    const box = (o) => ({ x: o.x, y: o.y, width, height });
    const at = options.find((o) => onBoard(o) && taken.every((t) => !overlaps(box(o), t)))
      ?? options.find(onBoard) ?? options[0];
    taken.push(box(at));

    // A bubble over the hex being hovered is printed faint, so it never hides
    // the path, the pips or the ground the player is looking at.
    const hover = state.hoverHex ? axialToPixel(state.hoverHex.q, state.hoverHex.r, map.hexSize) : null;
    const underMouse = hover && hover.x >= at.x - half && hover.x <= at.x + width + half
      && hover.y >= at.y - half && hover.y <= at.y + height + half;
    const g = el('g', { transform: `translate(${at.x} ${at.y})`, opacity: underMouse ? SPEECH.fadedOpacity : 1 });
    for (const part of speechBubble(width, height, { x: at.tip.x - at.x, y: at.tip.y - at.y })) g.appendChild(part);
    lines.forEach((l, i) => {
      g.appendChild(letter(l, { x: SPEECH.padX, y: SPEECH.padY + SPEECH.lineHeight * (i + 0.5) + 1 }));
    });
    layers.speech.appendChild(g);
  }
}

// --- objectives, charges, blasts, exfil (SPEC.md §7, §10) --------------------

// The printed objective pieces and the exfil barn, over the terrain and under
// every tint, centred on their footprints.
function drawArt(layers, state, view) {
  const { map } = layers;
  for (const objective of state.objectives) {
    const art = objectiveArt(objective);
    if (!art) continue;
    const at = labelPoint(map, objective.hexes);
    layers.art.appendChild(el('use', {
      href: `#${art.id}`, x: at.x - art.width / 2, y: at.y - art.height / 2, width: art.width, height: art.height,
    }));
  }
  if (view.exfil.length > 0) {
    const middle = view.exfil[Math.floor(view.exfil.length / 2)];
    const p = axialToPixel(middle.q, middle.r, map.hexSize);
    layers.art.appendChild(el('use', { href: `#${EXFIL.art}`, x: p.x - 40, y: p.y - 46, width: 80, height: 92 }));
  }
}

function drawSites(layers, state, view) {
  const { map } = layers;
  const areaOf = (hexes) => new Map(hexes.map((h) => [hexKey(h.q, h.r), h]));

  drawAreaEdge(layers, layers.sites, areaOf(view.exfil), [[EXFIL.casing, EXFIL.casingWidth], [EXFIL.stroke, EXFIL.width]]);
  const exfilAt = labelPoint(map, view.exfil);
  layers.sites.appendChild(casedText('EXFIL', exfilAt.x, exfilAt.top - map.hexSize * 0.6, EXFIL.label));

  if (view.previewBlastArea) fillArea(layers, view.previewBlastArea, BLAST.previewOpacity);
  if (view.blastArea.size > 0) {
    fillArea(layers, view.blastArea, BLAST.opacity);
    drawAreaEdge(layers, layers.sites, view.blastArea, [[BLAST.casing, BLAST.casingWidth], [BLAST.stroke, BLAST.width]]);
  }

  const labels = [];
  for (const objective of state.objectives) {
    const hovered = objective.id === view.hoverObjective?.id;
    const outline = el('g', { opacity: hovered ? 1 : OBJECTIVE.outlineOpacity });
    drawAreaEdge(layers, outline, areaOf(objective.hexes), [
      [OBJECTIVE.casing, OBJECTIVE.casingWidth], [OBJECTIVE.stroke, OBJECTIVE.width],
    ]);
    layers.sites.appendChild(outline);
    const at = labelPoint(map, objective.hexes);
    const name = objective.primary ? `${objective.label.toUpperCase()} ★` : objective.label.toUpperCase();
    // Names go on last, over the charge points around them.
    labels.push(casedText(name, at.x, at.top - map.hexSize * OBJECTIVE.labelLift, objective.primary ? OBJECTIVE.primaryLabel : OBJECTIVE.label));
    if (objective.destroyed) {
      layers.highlight.appendChild(el('use', {
        href: '#stamp-destroyed',
        x: at.x - OBJECTIVE.stampWidth / 2, y: at.y - OBJECTIVE.stampHeight / 2,
        width: OBJECTIVE.stampWidth, height: OBJECTIVE.stampHeight,
        transform: `rotate(${OBJECTIVE.stampRotate} ${at.x} ${at.y})`,
      }));
      continue;
    }
    // Every charge it needs is set: nowhere left to put one.
    if (view.chargedObjectiveIds.has(objective.id)) continue;
    for (const h of objective.chargeHexes) {
      const p = axialToPixel(h.q, h.r, map.hexSize);
      const inset = layers.corners.map((c) => `${p.x + c.x * OBJECTIVE.pointInset},${p.y + c.y * OBJECTIVE.pointInset}`).join(' ');
      const point = el('g', { opacity: hovered ? OBJECTIVE.pointHoverOpacity : OBJECTIVE.pointOpacity });
      point.appendChild(el('polygon', { points: inset, fill: 'none', stroke: OBJECTIVE.casing, 'stroke-width': OBJECTIVE.pointCasingWidth, 'stroke-linejoin': 'round' }));
      point.appendChild(el('polygon', {
        points: inset, fill: 'none', stroke: OBJECTIVE.pointStroke, 'stroke-width': OBJECTIVE.pointWidth,
        'stroke-dasharray': OBJECTIVE.pointDash, 'stroke-linejoin': 'round',
      }));
      const size = OBJECTIVE.pointIconSize;
      point.appendChild(el('use', { href: '#marker-charge-point', x: p.x - size / 2, y: p.y - size / 2, width: size, height: size }));
      layers.sites.appendChild(point);
    }
  }
  for (const label of labels) layers.sites.appendChild(label);

  // A charge set and burning: the satchel, and a token with the turns left.
  for (const charge of state.charges) {
    const p = axialToPixel(charge.q, charge.r, map.hexSize);
    const size = MARKER.groundSize;
    layers.tokens.appendChild(el('use', { href: '#marker-charge', x: p.x - 30, y: p.y + 20, width: size, height: size }));
    layers.tokens.appendChild(el('use', { href: `#${fuseMarkerId(charge.fuse)}`, x: p.x - 12, y: p.y + 24, width: MARKER.size, height: MARKER.size }));
  }
}

function fillArea(layers, area, opacity, fill = BLAST.fill) {
  const { corners, map } = layers;
  for (const { q, r } of area.values()) {
    layers.sites.appendChild(el('polygon', {
      points: cornersToPoints(axialToPixel(q, r, map.hexSize), corners), fill, 'fill-opacity': opacity,
    }));
  }
}

/** The middle of a group of hexes, in pixels, and the top row's centre line. */
function labelPoint(map, hexes) {
  const points = hexes.map((h) => axialToPixel(h.q, h.r, map.hexSize));
  return {
    x: points.reduce((n, p) => n + p.x, 0) / points.length,
    y: points.reduce((n, p) => n + p.y, 0) / points.length,
    top: Math.min(...points.map((p) => p.y)),
  };
}

function casedText(content, x, y, fill) {
  const g = el('g', {});
  const attrs = { x, y, 'font-size': OBJECTIVE.labelSize, 'font-weight': 'bold', 'letter-spacing': 1 };
  g.appendChild(text(content, { ...attrs, fill: 'none', stroke: OBJECTIVE.labelCasing, 'stroke-width': 5, 'stroke-linejoin': 'round' }));
  g.appendChild(text(content, { ...attrs, fill }));
  return g;
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

// A parachute (SPEC.md §9) sits on the left edge of its hex, over the counters:
// the man standing on his own chute is exactly when the player needs to see it.
function drawParachute(layers, chute) {
  const p = axialToPixel(chute.q, chute.r, layers.map.hexSize);
  const size = MARKER.size;
  const marker = el('use', {
    href: '#marker-parachute', x: p.x - COUNTER.drawn / 2 - size + 8, y: p.y - size / 2, width: size, height: size,
  });
  layers.tokens.appendChild(marker);
  return marker;
}

// The hex a hovered line of the turn report is about.
function drawHighlight(layers, hex) {
  const p = axialToPixel(hex.q, hex.r, layers.map.hexSize);
  for (const [stroke, width] of [[HIGHLIGHT.casing, HIGHLIGHT.casingWidth], [HIGHLIGHT.stroke, HIGHLIGHT.width]]) {
    layers.effects.appendChild(el('circle', { cx: p.x, cy: p.y, r: HIGHLIGHT.radius, fill: 'none', stroke, 'stroke-width': width }));
  }
}

// --- the drop (SPEC.md §9) ----------------------------------------------------
// Every run's flight line and wind arrow, the one being looked at strong and
// the others faint. For that one, where each man jumps (numbered as on his
// counter) and every hex he could come down on — the spread, never the roll.
// Hovering a run's name shows its description (SPEC.md §11), through the
// handlers given to createBoard.

function drawDrop(layers, drop) {
  const { map } = layers;
  if (drop.area) {
    fillArea(layers, drop.area, DROP.areaOpacity, DROP.areaFill);
    drawAreaEdge(layers, layers.sites, drop.area, [[DROP.casing, DROP.areaWidth + 3], [DROP.areaStroke, DROP.areaWidth]]);
  }
  const tabs = [];
  for (const run of [...drop.runs].sort((a, b) => Number(a.selected) - Number(b.selected))) {
    const group = el('g', { opacity: run.selected ? 1 : DROP.idleOpacity });
    const a = axialToPixel(run.from.q, run.from.r, map.hexSize);
    const b = axialToPixel(run.to.q, run.to.r, map.hexSize);
    group.appendChild(polyline([a, b], { stroke: DROP.casing, 'stroke-width': DROP.casingWidth }));
    group.appendChild(polyline([a, b], { stroke: DROP.stroke, 'stroke-width': DROP.width, 'stroke-dasharray': DROP.dash }));
    group.appendChild(arrow(b, a, DROP.stroke, DROP.width, DROP.windHead));

    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const d = NEIGHBOR_DIRS[DIRECTION_NAMES.indexOf(run.wind)];
    const v = axialToPixel(d.q, d.r, 1);
    const len = Math.hypot(v.x, v.y);
    const tip = { x: mid.x + (v.x / len) * DROP.windLength, y: mid.y + (v.y / len) * DROP.windLength };
    group.appendChild(polyline([mid, tip], { stroke: DROP.casing, 'stroke-width': DROP.windWidth + 4 }));
    group.appendChild(polyline([mid, tip], { stroke: DROP.windStroke, 'stroke-width': DROP.windWidth }));
    group.appendChild(arrow(tip, mid, DROP.windStroke, DROP.windWidth, DROP.windHead));

    // The name sits a way along the line, not at its start: the runs begin
    // close together in the north-west corner and their names would collide.
    const at = { x: a.x + (b.x - a.x) * DROP.labelAlong, y: a.y + (b.y - a.y) * DROP.labelAlong - map.hexSize * 0.35 };
    tabs.push(runTab(layers, run, at));

    if (run.selected) {
      run.jumps.forEach((j, i) => {
        const p = axialToPixel(j.q, j.r, map.hexSize);
        group.appendChild(el('circle', { cx: p.x, cy: p.y, r: DROP.jumpRadius, fill: DROP.jumpFill, stroke: DROP.stroke, 'stroke-width': 2 }));
        group.appendChild(text(String(i + 1), { x: p.x, y: p.y + 1, 'font-size': 13, 'font-weight': 'bold', fill: DROP.jumpText }));
      });
    }
    layers.routes.appendChild(group);
  }
  // The tabs go over every line, and are never faded: they are what to click.
  for (const tab of tabs) layers.routes.appendChild(tab);
}

/**
 * A drop run's name as a die-cut tab with a hard shadow. Clicking it picks the
 * run (the same as 1–3); hovering it shows the run's description.
 */
function runTab(layers, run, at) {
  const name = `${run.label} · ${run.tag}`.toUpperCase();
  const width = name.length * DROP.tabFontSize * 0.62 + DROP.tabPadX * 2;
  const height = DROP.tabHeight;
  const x = at.x - width / 2, y = at.y - height / 2;
  const tab = el('g', { 'pointer-events': 'all', cursor: 'pointer' });
  tab.appendChild(el('rect', { x: x + DROP.tabShadow, y: y + DROP.tabShadow, width, height, rx: 4, fill: DROP.tabStroke }));
  tab.appendChild(el('rect', {
    x, y, width, height, rx: 4, fill: run.selected ? DROP.tabSelectedFill : DROP.tabFill,
    stroke: DROP.tabStroke, 'stroke-width': DROP.tabStrokeWidth,
  }));
  tab.appendChild(text(name, {
    x: at.x, y: at.y + 1, 'font-size': DROP.tabFontSize, 'font-weight': 'bold', 'letter-spacing': 1,
    fill: run.selected ? DROP.tabSelectedText : DROP.tabText,
  }));
  tab.addEventListener('mouseenter', () => layers.handlers.onRunHover?.(run.id, tab));
  tab.addEventListener('mouseleave', () => layers.handlers.onRunLeave?.());
  tab.addEventListener('click', () => layers.handlers.onRunChoose?.(run.id));
  return tab;
}

/** An open arrowhead at `tip`, pointing away from `from`. */
function arrow(tip, from, stroke, width, size) {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const wing = (turn) => ({ x: tip.x - size * Math.cos(angle + turn), y: tip.y - size * Math.sin(angle + turn) });
  return polyline([wing(0.5), tip, wing(-0.5)], { stroke, 'stroke-width': width });
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

// A stone being aimed: earshot tinted and edged, then the lob as an arc bowed
// up the page from the man to where it lands, and the stone.
function drawThrow(layers, preview) {
  const { map } = layers;
  fillArea(layers, preview.earshot, THROW.earshotOpacity, THROW.earshot);
  drawAreaEdge(layers, layers.path, preview.earshot, [[THROW.earshot, THROW.earshotEdge]]);
  const a = axialToPixel(preview.from.q, preview.from.r, map.hexSize);
  const b = axialToPixel(preview.to.q, preview.to.r, map.hexSize);
  const lift = Math.hypot(b.x - a.x, b.y - a.y) * THROW.rise;
  const d = `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - lift} ${b.x} ${b.y}`;
  layers.path.appendChild(el('path', { d, fill: 'none', stroke: THROW.casing, 'stroke-width': THROW.casingWidth, 'stroke-linecap': 'round' }));
  layers.path.appendChild(el('path', { d, fill: 'none', stroke: THROW.arc, 'stroke-width': THROW.arcWidth, 'stroke-dasharray': THROW.arcDash, 'stroke-linecap': 'round' }));
  layers.path.appendChild(el('circle', { cx: b.x, cy: b.y, r: THROW.stone, fill: THROW.arc, stroke: THROW.casing, 'stroke-width': 2 }));
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
// Every arc is drawn faintly all the time as well — there is no fog of war.

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
    // Spotted there: a marker-pen cross over the hex, under the step count.
    if (result.spotted) {
      const s = RISK.crossSize;
      const d = `M${at.x - s} ${at.y - s} Q${at.x - 2} ${at.y + 3} ${at.x + s} ${at.y + s} M${at.x + s} ${at.y - s} Q${at.x + 3} ${at.y - 1} ${at.x - s} ${at.y + s}`;
      layers.reachable.appendChild(el('path', { d, fill: 'none', stroke: RISK.crossCasing, 'stroke-width': RISK.crossWidth + 4, 'stroke-linecap': 'round' }));
      layers.reachable.appendChild(el('path', { d, fill: 'none', stroke: RISK.crossStroke, 'stroke-width': RISK.crossWidth, 'stroke-linecap': 'round' }));
    }
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
      // What the shot does there, by the cover (SPEC.md §5): HIT, or PINNED.
      const label = result.shotResult === 'hit' ? 'HIT' : 'PINNED';
      const tagWidth = label.length * 6.6 + 8;
      layers.risk.appendChild(el('rect', {
        x: at.x - tagWidth / 2, y: y + 8, width: tagWidth, height: 13, rx: 2,
        fill: result.shotResult === 'hit' ? RISK.shotFill : RISK.pinnedFill,
      }));
      layers.risk.appendChild(text(label, {
        x: at.x, y: y + 15, 'font-size': 10, 'font-weight': 'bold', fill: RISK.shotText,
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
 * pair, widest first, so the line can be cased. Edges facing off the board are
 * left open: the border closes the area, and stroking them drew a sawtooth
 * past it.
 */
function drawAreaEdge(layers, layer, area, strokes) {
  const { corners, map } = layers;
  const edges = edgeCorners(corners, map.hexSize);
  let outline = '';
  for (const { q, r } of area.values()) {
    const center = axialToPixel(q, r, map.hexSize);
    NEIGHBOR_DIRS.forEach((d, dir) => {
      if (area.has(hexKey(q + d.q, r + d.r)) || !isInPlay(map, q + d.q, r + d.r)) return;
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

function drawPlan(layers, plan, risk) {
  const { map } = layers;
  const points = plan.path.map((hex) => axialToPixel(hex.q, hex.r, map.hexSize));
  const split = plan.affordableUpTo;
  // The first step on which he would be spotted: the line is red into it and
  // on from it, blue before it.
  const found = plan.path.findIndex((_, i) => i > 0 && risk?.[i]?.spotted);
  const spottedFrom = found === -1 ? Infinity : found;
  const colourAt = (i) => (i >= spottedFrom ? PATH.spottedStroke : PATH.lineStroke);

  if (split > 0) {
    const reach = points.slice(0, split + 1);
    layers.path.appendChild(polyline(reach, { stroke: PATH.lineCasing, 'stroke-width': PATH.lineCasingWidth }));
    const turn = Math.min(spottedFrom, split + 1);
    if (turn > 1) layers.path.appendChild(polyline(points.slice(0, turn), { stroke: PATH.lineStroke, 'stroke-width': PATH.lineWidth }));
    if (turn <= split) layers.path.appendChild(polyline(points.slice(turn - 1, split + 1), { stroke: PATH.spottedStroke, 'stroke-width': PATH.lineWidth }));
  }
  if (split < points.length - 1) {
    layers.path.appendChild(polyline(points.slice(split), {
      stroke: PATH.overspendStroke,
      'stroke-opacity': PATH.overspendOpacity,
      'stroke-width': PATH.lineWidth,
      'stroke-dasharray': PATH.overspendDash,
    }));
  }

  // Each step carries the AP spent by the time he gets there, as a wargame
  // map's movement count along a road: past what he has, it goes grey.
  points.forEach((point, i) => {
    if (i === 0) return;
    const withinReach = i <= split;
    const colour = withinReach ? colourAt(i) : PATH.overspendStroke;
    const step = el('g', { opacity: withinReach ? 1 : PATH.overspendOpacity + 0.2 });
    step.appendChild(el('circle', {
      cx: point.x, cy: point.y, r: PATH.stepRadius, fill: PATH.stepFill, stroke: colour, 'stroke-width': 2.5,
      ...(withinReach ? {} : { 'stroke-dasharray': '3 2.5' }),
    }));
    step.appendChild(text(String(plan.costs?.[i] ?? i), {
      x: point.x, y: point.y + 1, 'font-size': PATH.stepFontSize, 'font-weight': 'bold', fill: colour,
    }));
    layers.path.appendChild(step);
  });

  // The count says the cost; the badge is kept only for the one move the
  // numbers cannot explain, a single step that spends his whole pool.
  const end = points[points.length - 1];
  if (end && plan.steps > 0 && plan.minimumStep) drawCostBadge(layers.path, end, plan);
}

function drawCostBadge(layer, at, plan) {
  const label = plan.minimumStep ? `${plan.total} AP — all of it` : `${plan.total} AP`;
  const width = label.length * 7.8 + 12;
  const y = at.y - 30;

  const badge = el('g', {});
  badge.appendChild(el('rect', {
    x: at.x - width / 2, y: y - 11, width, height: 20, rx: 4,
    fill: plan.affordable ? PATH.badgeFill : PATH.blockedStroke,
  }));
  badge.appendChild(text(label, {
    x: at.x, y: y - 1, 'font-size': 13, 'font-weight': 'bold', fill: PATH.badgeText,
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
// All art is <use> of a registry symbol (CLAUDE.md rule 8). The AP figure and
// the selection ring are drawn here as geometry: they are readouts of state,
// not artwork, and they have no asset id.

/**
 * Counters are drawn in their 56-unit sprite space (ART-ASSETS.md §3) and
 * printed at COUNTER.drawn on the board, centred on the hex.
 */
function counterPlace(center) {
  const half = COUNTER.drawn / 2;
  return `translate(${center.x - half}, ${center.y - half}) scale(${COUNTER.drawn / COUNTER.size})`;
}

function drawCounter(unit, number, map, isSelected) {
  const center = axialToPixel(unit.q, unit.r, map.hexSize);
  const size = COUNTER.size;
  const group = el('g', {
    transform: counterPlace(center),
    opacity: unit.hidden ? MARKER.hiddenOpacity : 1,
  });
  // A man with no AP left is done for the turn: his die-cut edge goes grey.
  if (unit.ap === 0) group.style.setProperty('--counter-edge', COUNTER.spentEdge);
  const body = el('g', {});
  group.appendChild(body);

  group.insertBefore(el('use', { href: '#counter-shadow', width: size, height: size }), body);
  body.appendChild(el('use', { href: `#${counterFrameId(unit)}`, width: size, height: size }));
  body.appendChild(el('use', {
    href: `#${portraitId(unit.id, 'chip')}`, x: COUNTER.chip.x, y: COUNTER.chip.y, width: COUNTER.chip.size, height: COUNTER.chip.size,
  }));
  body.appendChild(el('use', {
    href: `#${roleSymbolId(unit.role)}`, x: COUNTER.role.x, y: COUNTER.role.y, width: COUNTER.role.size, height: COUNTER.role.size,
  }));

  // Roster number, boxed off at the left of the name strip.
  body.appendChild(el('rect', {
    x: 1, y: 38, width: COUNTER.nameBoxLeft - 1, height: 15,
    fill: COUNTER.numberFill, 'fill-opacity': 0.85,
  }));
  body.appendChild(text(String(number), {
    x: COUNTER.nameBoxLeft / 2, y: 46.5,
    'font-size': COUNTER.nameSize, 'font-weight': 'bold', fill: COUNTER.numberText,
  }));

  // Scaled as whole type, never stretched: a long name comes out smaller, not
  // condensed, so lettering keeps the same proportions on every counter.
  const room = COUNTER.nameBoxRight - COUNTER.nameBoxLeft;
  const fitted = room / Math.max(1, unit.shortName.length * COUNTER.nameAspect);
  body.appendChild(text(unit.shortName, {
    x: (COUNTER.nameBoxLeft + COUNTER.nameBoxRight) / 2, y: 46.5,
    'font-size': Math.min(COUNTER.nameSize, fitted).toFixed(2),
    'font-weight': 'bold', fill: COUNTER.nameFill,
  }));

  body.appendChild(text(String(unit.ap), {
    x: COUNTER.apAt.x, y: COUNTER.apAt.y, 'font-size': COUNTER.apSize, 'font-weight': 'bold',
    fill: COUNTER.apFill, opacity: unit.ap > 0 ? 1 : COUNTER.apSpentOpacity,
  }));

  if (isSelected) {
    body.appendChild(el('rect', {
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
  const group = el('g', { transform: counterPlace(center) });

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

  const body = el('g', {});
  group.appendChild(body);
  group.insertBefore(el('use', { href: '#counter-shadow', width: size, height: size }), body);
  body.appendChild(el('use', { href: '#counter-frame-enemy', width: size, height: size }));
  body.appendChild(el('use', { href: `#${enemySymbolId(enemy.type)}`, width: size, height: size }));

  const label = enemy.typeLabel.toUpperCase();
  const room = ENEMY.labelBoxRight - ENEMY.labelBoxLeft;
  const fitted = room / Math.max(1, label.length * COUNTER.nameAspect);
  body.appendChild(text(label, {
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
 * overhangs the border slightly, is not cut off by the edge of the SVG. The
 * sides get only enough for the border's stroke: margin there is wasted page.
 */
export function boardPixelBounds(map) {
  const padX = 3; // the border's own stroke
  const padY = 8; // counters on the top and bottom rows overhang
  const edge = boardEdges(map);
  return {
    minX: edge.left - padX,
    minY: edge.top - padY,
    maxX: edge.right + padX,
    maxY: edge.bottom + padY,
  };
}
