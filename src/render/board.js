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
  BLAST, COMMAND, CONTACT, COUNTER, CUE, DEATH, DROP, DROP_GHOST, DROP_SHOW, ENEMY, KNIFE_SPLAT, POWER_CUT, GARRISON_SHOW, HEDGE, HEDGE_CLUMP, RINGS, EXFIL, GRID, HIGHLIGHT, MARKER, MOTION, NOISE, OBJECTIVE, PATH, RAIL, RISK, ROAD, ROUTE,
  SELECTION, SHOT, SPEECH, SUPPRESSED, TARGET, THROW, TYPE, VISION, WATCH, WIRES, counterFrameId, ordersMarkerId, createSpriteDefs, enemySymbolId, fuseMarkerId,
  AREA, PALETTE, PLACE, objectiveArt, portraitId, roleSymbolId, speechBubble, terrainArt, terrainMotifId, toneClass, wobbleAt,
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
  // Each in-play hex's node, which lasts the whole game: a rollover about what
  // stands on a hex anchors to it, as the counters are redrawn every frame.
  const hexNodes = new Map();
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
    hexNodes.set(hexKey(q, r), hex);
    terrain.appendChild(hex);
  });

  // Over the hexes and under the grid, none of it taking the mouse: area
  // terrain, the grid rule, the dead wash over the half-hexes past the border,
  // then roads and the railway.
  const areas = el('g', { 'pointer-events': 'none' });
  drawAreas(areas, defs, map, corners);
  terrain.appendChild(areas);
  const grid = el('g', { 'pointer-events': 'none' });
  const washBlur = el('filter', { id: 'dead-wash-blur', x: '-5%', y: '-5%', width: '110%', height: '110%' });
  washBlur.appendChild(el('feGaussianBlur', { stdDeviation: GRID.deadWashBlur }));
  defs.appendChild(washBlur);
  const wash = el('g', { fill: GRID.deadWash, 'fill-opacity': 1 - GRID.outOfPlayOpacity, filter: 'url(#dead-wash-blur)' });
  forEachCell(map, (q, r) => {
    const points = cornersToPoints(axialToPixel(q, r, map.hexSize), corners);
    grid.appendChild(el('polygon', {
      points, fill: 'none', stroke: GRID.stroke, 'stroke-width': GRID.strokeWidth, 'stroke-opacity': GRID.strokeOpacity,
    }));
    if (!isInPlay(map, q, r)) wash.appendChild(el('polygon', { points }));
  });
  grid.appendChild(wash);
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
    svg, map, corners, handlers, hexNodes, art, vision, sites, reachable, routes, path, highlight, counters, tokens, risk, effects, speech,
    // Drawing memory: where each counter was last drawn, and recent blasts.
    motion: new Map(),
    deaths: new Map(), // unit id -> { since, q, r }: a man seen alive, then dead (M21)
    blasts: { bangs: null, list: [] },
  };
}

/** Forget what was last drawn where, for a new game on the same board (M12 restart). */
export function resetBoardMemory(layers) {
  layers.motion = new Map();
  layers.deaths = new Map();
  layers.blasts = { bangs: null, list: [] };
  layers.ringsSince = null;
  layers.cueSince = null;
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
  const shadows = [];
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
      if (motif && style.shadows) shadows.push(el('use', { href: `#${motif}-shadow`, x: c.x - 40, y: c.y - 46, width: 80, height: 92 }));
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
  for (const shadow of shadows) layer.appendChild(shadow);
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
 * neighbouring hedgerow hexes, so a clump of three touching hexes draws as a
 * bend, never a little triangle. The joins are chosen as a hedger would lay
 * them (M12, the "trident" by Ferme Lebrun): between the hexes with the fewest
 * hedgerow neighbours first, and on a tie the one that carries a hedge
 * straight on, so a line of hedge stays one line and two lines meet in a T,
 * not in a fork with a stub. In a fixed order, so the map always draws the
 * same. Keyed by hexKey, each a list of directions.
 */
function hedgeTree(map) {
  const isHedge = (q, r) => Boolean(terrainArt(terrainIdAt(map, q, r)).hedge);
  const hexes = [];
  forEachCell(map, (q, r) => { if (isHedge(q, r)) hexes.push({ q, r }); });
  const degree = new Map(hexes.map((h) => [hexKey(h.q, h.r), NEIGHBOR_DIRS.filter((n) => isHedge(h.q + n.q, h.r + n.r)).length]));
  const edges = [];
  for (const h of hexes) {
    // Each pair once: the three directions E, SE, SW from each hex.
    for (const dir of [2, 3, 4]) {
      const n = NEIGHBOR_DIRS[dir];
      const next = { q: h.q + n.q, r: h.r + n.r };
      if (!isHedge(next.q, next.r)) continue;
      edges.push({ a: h, b: next, dir, weight: degree.get(hexKey(h.q, h.r)) + degree.get(hexKey(next.q, next.r)) });
    }
  }
  // Union-find, so no join closes a loop.
  const parent = new Map(hexes.map((h) => [hexKey(h.q, h.r), hexKey(h.q, h.r)]));
  const root = (k) => {
    while (parent.get(k) !== k) k = parent.get(k);
    return k;
  };
  const links = new Map();
  const has = (h, dir) => (links.get(hexKey(h.q, h.r)) ?? []).includes(dir);
  const join = (h, dir) => {
    const k = hexKey(h.q, h.r);
    if (!links.has(k)) links.set(k, []);
    links.get(k).push(dir);
  };
  // Carries a hedge straight on: either end already has a join the opposite way.
  const straight = (e) => Number(has(e.a, (e.dir + 3) % 6) || has(e.b, e.dir));
  let open = edges;
  while (open.length) {
    open = open.filter((e) => root(hexKey(e.a.q, e.a.r)) !== root(hexKey(e.b.q, e.b.r)));
    if (!open.length) break;
    let best = open[0];
    for (const e of open) {
      if (e.weight < best.weight || (e.weight === best.weight && straight(e) > straight(best))) best = e;
    }
    parent.set(root(hexKey(best.a.q, best.a.r)), root(hexKey(best.b.q, best.b.r)));
    join(best.a, best.dir);
    join(best.b, (best.dir + 3) % 6);
    open = open.filter((e) => e !== best);
  }
  return links;
}

/** Place names, printed on the map under everything that moves. */
function drawPlaces(layer, map) {
  for (const place of map.places ?? []) {
    const style = PLACE[place.kind] ?? PLACE.other;
    const c = axialToPixel(place.at[0], place.at[1], map.hexSize);
    const x = c.x + (place.dx ?? 0) * map.hexSize;
    const y = c.y + (place.dy ?? 0) * map.hexSize;
    const attrs = {
      x, y, 'font-family': PLACE.font, 'font-size': style.size, 'font-weight': style.weight,
      'font-style': style.italic ? 'italic' : 'normal', 'letter-spacing': style.spacing,
      ...(place.angle ? { transform: `rotate(${place.angle} ${x} ${y})` } : {}),
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
  // Where the clumps go (M17): every HEDGE_CLUMP.spacing along each hedge.
  const spots = new Map();
  const lay = (from, via, to, curved) => {
    const at = (t) => (curved
      ? { x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * via.x + t ** 2 * to.x, y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * via.y + t ** 2 * to.y }
      : { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    const steps = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / HEDGE_CLUMP.spacing));
    for (let i = 0; i <= steps; i++) {
      const p = at(i / steps);
      // Neighbouring hexes share the edge's middle: one clump there, not two.
      const key = `${Math.round(p.x / 3)},${Math.round(p.y / 3)}`;
      if (!spots.has(key)) spots.set(key, p);
    }
  };
  forEachCell(map, (q, r) => {
    if (!terrainArt(terrainIdAt(map, q, r)).hedge) return;
    const links = hedgeLinks(map, q, r);
    if (links.length === 0) return;
    if (links.length === 1) links.push((links[0] + 3) % 6);
    const c = axialToPixel(q, r, map.hexSize);
    const mids = links.map((dir) => edgeMiddle(map, q, r, dir));
    if (mids.length === 2) {
      d += `M${f(mids[0])} Q${f(c)} ${f(mids[1])} `;
      lay(mids[0], c, mids[1], true);
    } else {
      for (const m of mids) {
        d += `M${f(m)} L${f(c)} `;
        lay(m, null, c, false);
      }
    }
  });
  if (!d) return;
  // The hedge's bottom, in ink, so no paper shows between the clumps.
  layer.appendChild(el('path', {
    d, fill: 'none', class: 'stroke-ink', 'stroke-width': HEDGE.edgeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }));
  // Each clump's look, size and nudge fixed by where it stands, never rolled;
  // now and then one grows into a tree. Laid top to bottom so each overlaps
  // the one behind it, every shadow first.
  const clumps = [...spots.values()].map((p, i) => {
    const pick = wobbleAt(p.x, p.y);
    const tree = Math.abs(Math.round(pick * 1000)) % HEDGE_CLUMP.treeEvery === 0;
    const [lo, hi] = HEDGE_CLUMP.scale;
    const k = tree ? HEDGE_CLUMP.treeScale : lo + ((pick + 1) / 2) * (hi - lo);
    const size = HEDGE_CLUMP.size * k;
    const x = p.x + wobbleAt(p.y, p.x) * HEDGE_CLUMP.jitter;
    const y = p.y + wobbleAt(p.x + 1, p.y) * HEDGE_CLUMP.jitter;
    const variant = 1 + (Math.abs(Math.round(pick * 997)) % HEDGE_CLUMP.variants);
    return { x: x - size / 2, y: y - size / 2, size, id: `hedge-clump-0${variant}`, order: y + i * 1e-6 };
  }).sort((a, b) => a.order - b.order);
  for (const c of clumps) layer.appendChild(el('use', { href: `#${c.id}-shadow`, x: c.x, y: c.y, width: c.size, height: c.size }));
  for (const c of clumps) layer.appendChild(el('use', { href: `#${c.id}`, x: c.x, y: c.y, width: c.size, height: c.size }));
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
  // What the hovered enemy will see next turn, if the turn ended now (M13b):
  // a dashed outline only, so it never reads as this turn's risk.
  if (view.hoverEnemyNextArea) {
    drawAreaEdge(layers, layers.vision, view.hoverEnemyNextArea, [[VISION.edgeCasing, VISION.edgeCasingWidth]]);
    drawAreaEdge(layers, layers.vision, view.hoverEnemyNextArea, [[VISION.nextEdge, VISION.nextEdgeWidth]], { 'stroke-dasharray': VISION.nextDash });
  }
  drawSites(layers, state, view);
  const runNames = view.drop ? drawDrop(layers, view.drop) : [];
  if (view.drop && !view.drop.runs.some((r) => r.selected)) drawGhostPlanes(layers, view.drop.runs, now);

  // Where he can go and the leader's orders: every outline's paper casing
  // first, then every line, so where two run along the same hex edge neither
  // casing blanks out the other's line (M13: Dutch's two rings).
  if (view.reachable) drawReachable(layers, view.reachable);
  const outlines = [
    view.reachable && { area: view.reachable, casing: [PATH.reachableEdgeCasing, PATH.reachableEdgeCasingWidth], line: [PATH.reachableEdge, PATH.reachableEdgeWidth], extra: {} },
    view.commandArea && { area: view.commandArea, casing: [COMMAND.casing, COMMAND.casingWidth], line: [COMMAND.stroke, COMMAND.width], extra: { 'stroke-dasharray': COMMAND.dash } },
    // The inner band, where his orders are strongest (M12), in a finer dash.
    view.commandCloseArea && { area: view.commandCloseArea, casing: [COMMAND.casing, COMMAND.casingWidth], line: [COMMAND.stroke, COMMAND.width], extra: { 'stroke-dasharray': COMMAND.closeDash } },
  ].filter(Boolean);
  for (const o of outlines) drawAreaEdge(layers, layers.reachable, o.area, [o.casing]);
  for (const o of outlines) drawAreaEdge(layers, layers.reachable, o.area, [o.line], o.extra);

  for (const route of view.routes) drawRoute(layers, route);

  if (view.targets) drawTargets(layers, view.targets);
  if (view.throwPreview) drawThrow(layers, view.throwPreview);

  if (view.plan) drawPlan(layers, view.plan, view.risk);
  if (view.plan && view.risk) drawRisk(layers, view.plan, view.risk);
  else if (view.landing) drawRisk(layers, view.landing.plan, view.landing.risk);

  for (const hex of view.searchHexes) drawContact(layers, hex);
  for (const noise of state.noises) drawNoise(layers, noise);
  for (const body of state.bodies) {
    // A knifed enemy lies in a faint stain (M16), under the body; just after
    // the knife the stain spreads out from under him (M17).
    const knife = view.strikeShow;
    if (body.knifed && knife?.kind === 'knife' && knife.at.q === body.q && knife.at.r === body.r) drawBloodSpreading(layers, body, now - knife.since);
    else if (body.knifed) drawOnGround(layers, 'effect-blood-splat', body, -1, KNIFE_SPLAT.stainSize, KNIFE_SPLAT.stainOffset, { opacity: KNIFE_SPLAT.stainOpacity });
    drawOnGround(layers, body.enemyId ? 'marker-body-enemy' : 'marker-body', body, -1, MARKER.bodySize, MARKER.bodyOffset);
  }
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
    const counter = drawEnemy(enemy, map, hovered, view.hearsIds?.has(enemy.id), view.nextFacing?.get(enemy.id));
    // Suppressed, or the turn after, when it sees and fires again but a
    // gunner can still kill it (SPEC.md §4): two markers, since M15.
    if (enemy.suppressed) counter.appendChild(marker('marker-suppressed', 38, -12));
    else if (enemy.openToKill) counter.appendChild(marker('marker-open-kill', 38, -12));
    if (!enemy.killable) counter.appendChild(marker('marker-no-kill', -10, -12));
    // The garrison's turn (M15): a red "!" pops on each enemy that spotted a
    // man or found something, once it has got there. After the show it stays
    // on the chip for the player's turn, with a rollover saying what it saw or
    // found (M20, the operator's).
    const alarm = view.garrisonShow?.alarmed.get(enemy.id);
    const alarmAt = [(COUNTER.size - GARRISON_SHOW.alarmSize) / 2 - 2, -GARRISON_SHOW.alarmSize - 2];
    const elapsed = view.garrisonShow ? now - view.garrisonShow.since : Infinity;
    if (alarm !== undefined && elapsed < view.garrisonShow.length + GARRISON_SHOW.alarmLingerMs) {
      const pop = marker('marker-spotted', ...alarmAt, GARRISON_SHOW.alarmSize);
      pop.style.transformBox = 'fill-box';
      pop.style.transformOrigin = '50% 100%';
      playFrom(pop, [
        { opacity: 0, transform: 'scale(0.3)' }, { opacity: 1, transform: 'scale(1.25)', offset: 0.5 }, { opacity: 1, transform: 'scale(1)' },
      ], { delay: alarm, duration: GARRISON_SHOW.popMs, easing: 'steps(3, end)' }, elapsed);
      counter.appendChild(pop);
    } else if (view.alarmed?.has(enemy.id)) {
      const node = marker('marker-spotted', ...alarmAt, GARRISON_SHOW.alarmSize);
      node.setAttribute('pointer-events', 'all');
      node.dataset.q = enemy.q;
      node.dataset.r = enemy.r;
      node.addEventListener('mouseenter', () => layers.handlers.onEnemyMarkerHover?.(enemy.id, node));
      node.addEventListener('mouseleave', () => layers.handlers.onMarkerLeave?.());
      node.addEventListener('click', () => layers.handlers.onHexClick(enemy.q, enemy.r));
      counter.appendChild(node);
    }
    // Walked its steps this enemy phase, like a man his path (M15).
    const mover = el('g', {});
    mover.appendChild(counter);
    layers.counters.appendChild(mover);
    // At the pace of the show that set it off; after it, only a journey
    // already under way is carried on, at the pace it began at.
    travel(layers, mover, enemy, now, `enemy:${enemy.id}`, enemy.walked, view.garrisonShow?.msPerHex ?? GARRISON_SHOW.msPerHex.calm);
  }
  // The enemy being aimed at (M15), or the man being aided (M17), over his counter.
  if (view.aim) {
    const p = axialToPixel(view.aim.q, view.aim.r, map.hexSize);
    const size = map.hexSize * MARKER.aimScale;
    layers.tokens.appendChild(el('use', {
      href: `#marker-${view.aim.icon ?? 'aim'}${view.aim.ok ? '' : '-no'}`, x: p.x - size / 2, y: p.y - size / 2, width: size, height: size, 'pointer-events': 'none',
    }));
  }

  state.units.forEach((unit, i) => {
    if (!unit.landed || unit.dead || unit.out) {
      // Drawn alive last time and dead now: he has just been killed.
      if (unit.dead && layers.motion.has(`unit:${unit.id}`)) layers.deaths.set(unit.id, { since: now, q: unit.q, r: unit.r });
      if (unit.dead) drawDeath(layers, unit, i + 1, now);
      layers.motion.delete(`unit:${unit.id}`);
      return;
    }
    // The number on the counter is the trooper's place in the roster, which is
    // also his 1-6 hotkey and his position in the panel. One ordering, shown
    // in three places.
    const counter = drawCounter(unit, i + 1, map, unit.id === state.selectedUnitId);
    // Under the mouse (M23): the dashed ring a hovered enemy wears, his card in the readout.
    if (unit.id === view.hoverManId && unit.id !== state.selectedUnitId) hoverRing(counter);
    if (view.aidTargetIds?.has(unit.id)) targetRing(counter);
    // In contact top right, where the eye goes first; his condition top left.
    // Each marker has a rollover saying what it means (M11).
    if (unit.inContact) counter.appendChild(hoverMarker(layers, 'marker-spotted', 38, -12, unit));
    if (unit.hits > 0 && !unit.stabilised) counter.appendChild(hoverMarker(layers, 'marker-wounded', -6, -12, unit));
    if (unit.hidden) counter.appendChild(hoverMarker(layers, 'marker-hidden', MARKER.hiddenAt.x, MARKER.hiddenAt.y, unit));
    // The orders on the right, beside the AP they add to, clear of the rank flash (M12).
    // One chevron for the ordinary orders, two for the strongest, beside him.
    // Smaller since M14's blue AP dots say the same (M15: it outshone Dutch's own rank flash),
    // centred where it was.
    if (unit.commandBonus > 0) {
      const size = MARKER.size * MARKER.ordersScale;
      counter.appendChild(hoverMarker(layers, ordersMarkerId(unit.commandBonus), 51 - size / 2, 31 - size / 2, unit, size));
    }
    const mover = el('g', {});
    mover.appendChild(counter);
    layers.counters.appendChild(mover);
    travel(layers, mover, unit, now, `unit:${unit.id}`, unit.trail, MOTION.travelMsPerHex);
    appear(counter, show?.byUnit.get(unit.id), elapsed);
  });

  drawBlasts(layers, state, now);
  if (view.garrisonShow) drawHeard(layers, view.garrisonShow, now);
  drawTargetRings(layers, view.targetRings, now);
  if (view.dropCue && runNames.length) drawDropCue(layers, view.dropCue, runNames);
  if (view.selectCue) drawSelectCue(layers, state, now);
  if (view.shotShow) drawShot(layers, view.shotShow, now);
  if (view.strikeShow?.kind === 'cut') {
    const objective = state.objectives.find((o) => o.id === view.strikeShow.objectiveId);
    if (objective) drawPowerCut(layers, objective, now - view.strikeShow.since);
  }
  if (view.flyShow) drawAircraft(layers, flyoverTimeline(map, view.flyShow.points, view.flyShow.heading), now - view.flyShow.since);
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
    // The ring takes in the name printed over the hexes, so the pen never
    // runs through the words (M12: it crossed RAIL BRIDGE).
    const labelTop = Math.min(...points.map((p) => p.y)) - map.hexSize * OBJECTIVE.labelLift - OBJECTIVE.labelSize;
    const top = Math.min(Math.min(...points.map((p) => p.y)) - half.y, labelTop), bottom = Math.max(...points.map((p) => p.y)) + half.y;
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
      const path = el('path', { d, fill: 'none', stroke: colour, 'stroke-width': RINGS.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, opacity: RINGS.opacity });
      // Under the objectives' names, charge points and counters, as a pen
      // mark on the map would be, so where it crosses one the print still
      // reads over it (M12); the notes stay on top.
      layers.sites.insertBefore(path, layers.sites.firstChild);
      playFrom(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        delay: (i + loop * 0.5) * RINGS.staggerMs, duration: RINGS.drawMs,
      }, elapsed);
    }
    // The note, on the side of the ring toward the middle of the board. It may
    // be several lines; the last sits just above the ring.
    const east = ring.beside || c.x < midX;
    const x = ring.beside ? c.x + rx + 12 : east ? c.x + rx * 0.75 : c.x - rx * 0.75;
    const lines = [].concat(ring.note);
    const note = text('', {
      'text-anchor': east ? 'start' : 'end', 'font-family': SPEECH.font, 'font-weight': 'bold',
      'font-size': RINGS.noteSize, fill: colour, stroke: RINGS.halo, 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round',
    });
    // Above the ring, or under it if the lines would run off the top of the
    // board (M12: the exchange's four lines did).
    const lead = RINGS.noteSize * RINGS.noteLeading;
    const above = c.y - ry - 8 - (lines.length - 1) * lead - RINGS.noteSize / 2 >= edge.top;
    lines.forEach((words, k) => {
      // `beside`: level with the ring's middle, just off its right-hand side.
      const y = ring.beside ? c.y - ((lines.length - 1) / 2 - k) * lead
        : above ? c.y - ry - 8 - (lines.length - 1 - k) * lead : c.y + ry + 16 + k * lead;
      const span = el('tspan', { x, y });
      span.textContent = words;
      note.appendChild(span);
    });
    layers.effects.appendChild(note);
    playFrom(note, [{ opacity: 0 }, { opacity: 1 }], { delay: i * RINGS.staggerMs + RINGS.drawMs, duration: 120 }, elapsed);
  });
}

// --- where to start (M21) --------------------------------------------------------

/** Pen lettering, haloed in paper so it reads over the map. */
function penLetters(lines, x, y, sizes) {
  const note = text('', {
    'font-family': SPEECH.font, 'font-weight': 'bold', fill: CUE.colour,
    stroke: CUE.halo, 'stroke-width': 6, 'paint-order': 'stroke', 'stroke-linejoin': 'round',
  });
  let dy = 0;
  lines.forEach((words, k) => {
    const span = el('tspan', { x, y: y + dy, 'font-size': sizes[k] ?? sizes.at(-1) });
    span.textContent = words;
    note.appendChild(span);
    dy += (sizes[k] ?? sizes.at(-1)) * 0.55 + (sizes[k + 1] ?? sizes.at(-1)) * 0.6;
  });
  return note;
}

/** A group that throbs from where it began, so a redraw does not restart it. */
function throbbing(layers, key, now) {
  const g = el('g', { class: 'nd-throb', 'pointer-events': 'none' });
  layers.cueSince ??= {};
  layers.cueSince[key] ??= now;
  g.style.animationDelay = `${-Math.round(now - layers.cueSince[key])}ms`;
  return g;
}

/**
 * Before the jump (M21, from playtesting: a first-timer did not know where to
 * begin): PICK A DROP DIRECTION among the runs' names until one is picked,
 * then HIT SPACE TO JUMP, in the player's pen. Still since M24 (the
 * operator's): the throb is kept for the men's rings.
 */
function drawDropCue(layers, cue, names) {
  const x = names.reduce((sum, p) => sum + p.x, 0) / names.length + CUE.nudge.x;
  const y = names.reduce((sum, p) => sum + p.y, 0) / names.length + CUE.nudge.y;
  const lines = cue === 'pick' ? ['PICK A DROP DIRECTION', 'click a run\'s name, or press 1-3'] : ['HIT SPACE TO JUMP', 'or click the run again'];
  const g = el('g', { 'pointer-events': 'none' });
  g.appendChild(penLetters(lines, x, y, [CUE.size, CUE.subSize]));
  layers.effects.appendChild(g);
}

/**
 * Once the stick is down (M21): a pen ring round each man who can act, until
 * the player first selects one, and a note over the topmost saying so.
 */
function drawSelectCue(layers, state, now) {
  const { map } = layers;
  const men = state.units.filter((u) => u.landed && !u.dead && !u.out && u.ap > 0);
  if (!men.length) return;
  const points = men.map((u) => axialToPixel(u.q, u.r, map.hexSize));
  // Each ring throbs about its own man (M22, the operator's: one group for
  // all of them swelled from the group's middle, so the rings slid off the
  // counters), at half strength.
  for (const p of points) {
    const g = throbbing(layers, 'select', now);
    g.setAttribute('opacity', CUE.ringOpacity);
    g.appendChild(el('circle', { cx: p.x, cy: p.y, r: CUE.ringRadius + 3, fill: 'none', stroke: CUE.halo, 'stroke-width': CUE.ringWidth + 4, opacity: 0.8 }));
    g.appendChild(el('circle', { cx: p.x, cy: p.y, r: CUE.ringRadius, fill: 'none', stroke: CUE.colour, 'stroke-width': CUE.ringWidth }));
    layers.effects.appendChild(g);
  }
  // The note in the middle of the men (M22, the operator's; over the topmost
  // until then), kept on the board.
  const edge = boardEdges(map);
  const middle = { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
  const width = 'CLICK A MAN TO START'.length * CUE.noteSize * 0.5;
  const x = Math.min(Math.max(middle.x, edge.left + width / 2 + 8), edge.right - width / 2 - 8);
  const y = Math.min(Math.max(middle.y, edge.top + CUE.noteSize), edge.bottom - 8);
  layers.effects.appendChild(penLetters(['CLICK A MAN TO START'], x, y, [CUE.noteSize]));
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

  drawAircraft(layers, timeline, elapsed);
}

// The aircraft over everything, its shadow far below it, flying from the
// timeline's start to its end.
function drawAircraft(layers, timeline, elapsed) {
  const { start, end, angle } = timeline;
  const size = DROP_SHOW.aircraftSize;
  const at = (p) => `translate(${p.x}px, ${p.y}px) rotate(${angle}deg)`;
  if (elapsed >= DROP_SHOW.flightMs) return;
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

// Until a run is picked (M16): a faint grey Dakota flies each run's line, again
// and again, each a third of a pass behind the one before, so the lines read
// as the aircraft's path. Timed from the page's clock, so a redraw carries
// each pass on where it was. No shadow and no sound: it is only a hint.
function drawGhostPlanes(layers, runs, now) {
  const size = DROP_SHOW.aircraftSize * DROP_GHOST.scale;
  const period = DROP_GHOST.flightMs + DROP_GHOST.gapMs;
  const flying = DROP_GHOST.flightMs / period;
  runs.forEach((run, i) => {
    const { start, end, angle } = dropTimeline(layers.map, { from: run.from, to: run.to, jumps: [] });
    const at = (t, opacity, offset) => ({
      transform: `translate(${start.x + (end.x - start.x) * t}px, ${start.y + (end.y - start.y) * t}px) rotate(${angle}deg)`,
      opacity, offset: offset * flying,
    });
    const plane = el('g', { style: 'filter: grayscale(1)' });
    plane.appendChild(el('use', { href: '#aircraft-dakota', x: -size / 2, y: -size / 2, width: size, height: size }));
    const frames = [at(0, 0, 0), at(0.08, DROP_GHOST.opacity, 0.08), at(0.92, DROP_GHOST.opacity, 0.92), at(1, 0, 1), { ...at(1, 0, 1), offset: 1 }];
    playFrom(plane, frames, { duration: period, iterations: Infinity }, now + (i * period) / runs.length);
    layers.effects.appendChild(plane);
  });
}

// --- the RAF flyover (M11) --------------------------------------------------------
// Display only, like the drop: when the diversion is called the Dakota crosses
// the board over the garrison, on the straight line that best fits where the
// enemies stand, from edge to edge. Then the diversion's card opens.

/**
 * The flyover's line and length. `points` are the enemies' hexes as they
 * stood when the call was made. Exported so main.js knows when it is over.
 */
export function flyoverTimeline(map, points, heading = null) {
  const px = points.map((h) => axialToPixel(h.q, h.r, map.hexSize));
  const edge = boardEdges(map);
  const n = px.length || 1;
  const c = px.length
    ? { x: px.reduce((a, p) => a + p.x, 0) / n, y: px.reduce((a, p) => a + p.y, 0) / n }
    : { x: (edge.left + edge.right) / 2, y: (edge.top + edge.bottom) / 2 };
  // The line of best fit through them: the direction they are most spread along.
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of px) { sxx += (p.x - c.x) ** 2; syy += (p.y - c.y) ** 2; sxy += (p.x - c.x) * (p.y - c.y); }
  let theta = px.length > 1 ? 0.5 * Math.atan2(2 * sxy, sxx - syy) : 0;
  let ux = Math.cos(theta), uy = Math.sin(theta);
  // Always from the west, the way the bombers come in — unless a heading is
  // given (M13: each call its own, over the middle of the garrison).
  if (heading !== null) { ux = Math.cos(heading); uy = Math.sin(heading); }
  else if (ux < 0) { ux = -ux; uy = -uy; }
  // From where the line leaves the board behind it to where it leaves ahead,
  // plus the aircraft's own length, so it flies in and out of sight.
  const margin = DROP_SHOW.aircraftSize;
  const box = { left: edge.left - margin, right: edge.right + margin, top: edge.top - margin, bottom: edge.bottom + margin };
  const ts = [];
  if (Math.abs(ux) > 1e-6) ts.push((box.left - c.x) / ux, (box.right - c.x) / ux);
  if (Math.abs(uy) > 1e-6) ts.push((box.top - c.y) / uy, (box.bottom - c.y) / uy);
  const before = Math.max(...ts.filter((t) => t <= 0));
  const after = Math.min(...ts.filter((t) => t >= 0));
  theta = Math.atan2(uy, ux);
  return {
    start: { x: c.x + ux * before, y: c.y + uy * before },
    end: { x: c.x + ux * after, y: c.y + uy * after },
    angle: (theta * 180) / Math.PI,
    length: DROP_SHOW.flightMs + DROP_SHOW.tailMs,
  };
}

/**
 * Shots (M13): a gunner suppressing fires a burst — muzzle flashes stepping on
 * and off at his counter, tracer dashes running to the enemy, and the enemy's
 * counter flashing as it is hit — and a kill is one short, dim shot. Display
 * only, played once from `since`.
 */
function drawShot(layers, shot, now) {
  const elapsed = now - shot.since;
  if (elapsed > SHOT.ms) return;
  const { map } = layers;
  const a = axialToPixel(shot.from.q, shot.from.r, map.hexSize);
  const b = axialToPixel(shot.to.q, shot.to.r, map.hexSize);
  const burst = shot.kind === 'suppress';
  const rounds = burst ? SHOT.burstRounds : 1;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const muzzle = { x: a.x + ((b.x - a.x) / len) * SHOT.muzzleOffset, y: a.y + ((b.y - a.y) / len) * SHOT.muzzleOffset };
  for (let i = 0; i < rounds; i++) {
    const delay = i * SHOT.roundMs;
    const tracer = el('line', {
      x1: muzzle.x, y1: muzzle.y, x2: b.x, y2: b.y, stroke: SHOT.tracer, 'stroke-width': burst ? SHOT.tracerWidth : SHOT.tracerWidth * 0.6,
      'stroke-linecap': 'round', 'stroke-dasharray': `${SHOT.dash} ${len}`, opacity: 0,
    });
    layers.effects.appendChild(tracer);
    playFrom(tracer, [
      { strokeDashoffset: 0, opacity: burst ? 1 : 0.6 },
      { strokeDashoffset: -(len - SHOT.dash), opacity: burst ? 1 : 0.6 },
      { strokeDashoffset: -(len - SHOT.dash), opacity: 0 },
    ], { delay, duration: SHOT.travelMs }, elapsed);
    const flash = el('use', {
      href: '#marker-blast', x: muzzle.x - SHOT.flashSize / 2, y: muzzle.y - SHOT.flashSize / 2,
      width: SHOT.flashSize, height: SHOT.flashSize, opacity: 0,
    });
    layers.effects.appendChild(flash);
    playFrom(flash, [{ opacity: burst ? 1 : 0.5 }, { opacity: 0 }], { delay, duration: SHOT.roundMs * 0.8, easing: 'steps(2, end)' }, elapsed);
  }
  if (burst) {
    const hit = el('circle', { cx: b.x, cy: b.y, r: COUNTER.size / 2 + 4, fill: 'none', stroke: SHOT.tracer, 'stroke-width': 4, opacity: 0 });
    layers.effects.appendChild(hit);
    playFrom(hit, [{ opacity: 1 }, { opacity: 0 }], { delay: SHOT.travelMs, duration: rounds * SHOT.roundMs, easing: `steps(${rounds * 2}, end)` }, elapsed);
  }
}

// The knife (M17, the operator's: M16's splat burst over the counters and
// seemed to fly in onto the hex). A quiet kill: the stain spreads slowly out
// from under the body, where it will stay, dark at first and drying to the
// stain's faint print. It is the stain itself, grown, so it hands over to the
// still one without a jump. Eased, unlike the board's other motion: blood
// spreads, it does not step.
function drawBloodSpreading(layers, body, elapsed) {
  if (elapsed > KNIFE_SPLAT.ms) return;
  const p = axialToPixel(body.q, body.r, layers.map.hexSize);
  const size = KNIFE_SPLAT.stainSize;
  const at = { x: p.x - KNIFE_SPLAT.stainOffset.x, y: p.y + KNIFE_SPLAT.stainOffset.y };
  const pool = el('g', {});
  pool.appendChild(el('use', { href: '#effect-blood-splat', x: -size / 2, y: -size / 2, width: size, height: size }));
  layers.highlight.appendChild(pool);
  const spread = (scale, opacity, offset) => ({ transform: `translate(${at.x}px, ${at.y}px) scale(${scale})`, opacity, offset });
  playFrom(pool, [
    { ...spread(KNIFE_SPLAT.fromScale, KNIFE_SPLAT.wetOpacity, 0), easing: KNIFE_SPLAT.easing },
    spread(1, KNIFE_SPLAT.wetOpacity, KNIFE_SPLAT.spreadShare),
    spread(1, KNIFE_SPLAT.stainOpacity, 1),
  ], { duration: KNIFE_SPLAT.ms }, elapsed);
}

// The line cut (M16; M17, the operator's: fast and bright, not a slow
// dimming). The wires short as they part: the exchange and the ground round
// it flash white in quick stutters, a spark bursts at each wire with every
// flash, the lit windows flicker with them, and then they are out for good.
// Every step is held, not eased, like the rest of the board's motion.
function drawPowerCut(layers, objective, elapsed) {
  if (elapsed > POWER_CUT.ms) return;
  const { map } = layers;
  const art = objectiveArt(objective);
  const centre = labelPoint(map, objective.hexes);
  const origin = { x: centre.x - art.width / 2, y: centre.y - art.height / 2 };
  // Held steps, one every POWER_CUT.stepMs, then nothing.
  const flicker = (values) => values.map((opacity, i) => ({ opacity, offset: Math.min(1, (i * POWER_CUT.stepMs) / POWER_CUT.ms), easing: 'steps(1, end)' }))
    .concat([{ opacity: 0, offset: 1 }]);
  // White at the exchange, fading out to nothing at the village's edge.
  const glow = el('radialGradient', { id: 'power-cut-flash' });
  glow.append(el('stop', { offset: '0', 'stop-color': PALETTE.paper, 'stop-opacity': 1 }), el('stop', { offset: '0.5', 'stop-color': PALETTE.paper, 'stop-opacity': 0.75 }), el('stop', { offset: '1', 'stop-color': PALETTE.paper, 'stop-opacity': 0 }));
  const flash = el('circle', {
    cx: origin.x + 95, cy: origin.y + 105, r: map.hexSize * Math.sqrt(3) * POWER_CUT.flashHexes, fill: 'url(#power-cut-flash)', opacity: 0,
  });
  layers.effects.append(glow, flash);
  playFrom(flash, flicker(POWER_CUT.flashes), { duration: POWER_CUT.ms }, elapsed);
  // The windows, lit, stuttering with the flashes, then out.
  const lights = el('g', { opacity: 0 });
  for (const [x, y] of [[62, 103], [85, 103], [108, 103], [62, 118], [108, 118]]) {
    lights.appendChild(el('rect', { x: origin.x + x, y: origin.y + y, width: 10, height: 10, fill: PALETTE.paper }));
  }
  layers.effects.appendChild(lights);
  playFrom(lights, flicker(POWER_CUT.windows), { duration: POWER_CUT.ms }, elapsed);
  // A spark where each wire parted, with every flash.
  const standard = { x: origin.x + art.wires.x, y: origin.y + art.wires.y };
  const size = POWER_CUT.sparkSize;
  objective.chargeHexes.forEach((h, i) => {
    const p = axialToPixel(h.q, h.r, map.hexSize);
    const v = towardObjective(map, h, objective);
    const pole = { x: p.x - v.x * map.hexSize * WIRES.poleAway, y: p.y - v.y * map.hexSize * WIRES.poleAway - WIRES.poleSize * 0.3 };
    const at = { x: (pole.x + standard.x) / 2, y: (pole.y + standard.y) / 2 };
    const spark = el('use', { href: '#effect-spark', x: at.x - size / 2, y: at.y - size / 2, width: size, height: size, opacity: 0 });
    layers.effects.appendChild(spark);
    playFrom(spark, flicker(POWER_CUT.flashes.map((o) => (o > 0.5 ? 1 : 0))), { delay: i * 40, duration: POWER_CUT.ms }, elapsed);
  });
}

// --- motion (SPEC.md §11: stepped, never eased) --------------------------------

/**
 * A man who has just moved travels his path to where he now stands: quickly,
 * at a steady pace, and stops dead — no easing (SPEC.md §11). The path is the
 * hexes he entered this turn after the one he was last drawn on. A redraw
 * part-way through carries the journey on from where it was. A man appearing
 * for the first time (the drop) simply appears.
 */
function travel(layers, mover, unit, now, key, trailOf, msPerHex) {
  const where = hexKey(unit.q, unit.r);
  const last = layers.motion.get(key);
  if (!last) {
    layers.motion.set(key, { where, since: -Infinity, path: [], at: { q: unit.q, r: unit.r } });
    return;
  }
  if (last.where !== where) {
    const trail = trailOf ?? [];
    const from = trail.map((h) => hexKey(h.q, h.r)).lastIndexOf(last.where);
    let steps = trail.slice(from + 1);
    if (steps.length === 0 || hexKey(steps.at(-1).q, steps.at(-1).r) !== where) steps = [{ q: unit.q, r: unit.r }];
    layers.motion.set(key, { where, since: now, path: [last.at, ...steps], msPerHex });
  }
  layers.motion.get(key).at = { q: unit.q, r: unit.r };

  const journey = layers.motion.get(key);
  const duration = (journey.path.length - 1) * (journey.msPerHex ?? msPerHex);
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

/**
 * A man just killed (M21, the operator's): his counter, as it was, floats up
 * about a hex and fades out over his body. Drawing memory like a move, so a
 * redraw part-way carries on; it is forgotten once done.
 */
function drawDeath(layers, unit, number, now) {
  const death = layers.deaths.get(unit.id);
  if (!death) return;
  const elapsed = now - death.since;
  if (elapsed >= DEATH.delayMs + DEATH.floatMs) {
    layers.deaths.delete(unit.id);
    return;
  }
  const ghost = drawCounter({ ...unit, dead: false, hidden: false, q: death.q, r: death.r }, number, layers.map, false);
  ghost.setAttribute('pointer-events', 'none');
  const holder = el('g', {});
  holder.appendChild(ghost);
  layers.effects.appendChild(holder);
  const rise = layers.map.hexSize * 1.5 * DEATH.riseHexes;
  playFrom(holder, [
    { transform: 'translate(0px, 0px)', opacity: 1 },
    { transform: 'translate(0px, 0px)', opacity: 1, offset: DEATH.delayMs / (DEATH.delayMs + DEATH.floatMs) },
    { transform: `translate(0px, ${-rise}px)`, opacity: 0 },
  ], { duration: DEATH.delayMs + DEATH.floatMs, easing: 'ease-in' }, elapsed);
}

// The garrison's turn (M15): a ripple out from each noise it heard, twice,
// as the enemies set off toward it.
function drawHeard(layers, show, now) {
  const elapsed = now - show.since;
  if (elapsed >= GARRISON_SHOW.rippleMs * 2) return;
  const reach = layers.map.hexSize * GARRISON_SHOW.rippleHexes * Math.sqrt(3);
  for (const hex of show.heard) {
    const p = axialToPixel(hex.q, hex.r, layers.map.hexSize);
    for (const delay of [0, GARRISON_SHOW.rippleMs * 0.6]) {
      const ring = el('circle', { cx: p.x, cy: p.y, r: reach, fill: 'none', stroke: GARRISON_SHOW.rippleStroke, 'stroke-width': 3, opacity: 0 });
      ring.style.transformOrigin = `${p.x}px ${p.y}px`;
      playFrom(ring, [
        { transform: 'scale(0.15)', opacity: 0.8 }, { transform: 'scale(1)', opacity: 0 },
      ], { delay, duration: GARRISON_SHOW.rippleMs, easing: 'steps(6, end)' }, elapsed);
      layers.effects.appendChild(ring);
    }
  }
}

// Each charge that went off: the page flashes and the board jolts once, then
// at each charge a shock ring runs out to the edge of its blast, the
// starburst is revealed in steps, and smoke rolls up and thins (M11). Drawing
// memory like a move: redrawn part-way, it carries on from where it was.
function drawBlasts(layers, state, now) {
  // Keyed on the explosion events themselves, not the report: cutting the line
  // or calling the RAF adds to the turn's report mid-turn, and that must not
  // set off last turn's bang again (M14 bug).
  const bangs = state.report.filter((e) => e.kind === 'explosion');
  const known = layers.blasts.bangs;
  if (!known || bangs.length !== known.length || bangs.some((e, i) => e !== known[i])) {
    const list = bangs.flatMap((e) => (
      (e.at ?? [{ q: e.q, r: e.r }]).map((h) => ({ q: h.q, r: h.r, destroyed: e.destroyed, radius: e.blastRadius ?? 1 }))
    ));
    layers.blasts = { bangs, since: now, list };
    if (list.length && typeof layers.svg.animate === 'function') {
      const d = BLAST.shakePx;
      layers.svg.animate([
        { transform: 'translate(0, 0)' }, { transform: `translate(${-d}px, ${d * 0.6}px)` }, { transform: `translate(${d * 0.8}px, ${-d * 0.5}px)` },
        { transform: `translate(${-d * 0.5}px, ${-d * 0.4}px)` }, { transform: `translate(${d * 0.3}px, ${d * 0.3}px)` }, { transform: 'translate(0, 0)' },
      ], { duration: BLAST.shakeMs, easing: 'linear' });
    }
  }
  const { list, since } = layers.blasts;
  const elapsed = now - since;
  if (list.length === 0 || elapsed >= Math.max(BLAST.smokeMs + 600, MOTION.blastMs)) return;
  const { map } = layers;

  const edge = boardEdges(map);
  const flash = el('rect', {
    x: edge.left, y: edge.top, width: edge.right - edge.left, height: edge.bottom - edge.top, fill: BLAST.flash,
  });
  playFrom(flash, [{ opacity: BLAST.flashOpacity }, { opacity: 0 }], { duration: BLAST.flashMs }, elapsed);
  layers.effects.appendChild(flash);

  list.forEach((blast, n) => {
    const p = axialToPixel(blast.q, blast.r, map.hexSize);
    const reach = (blast.radius + 0.5) * map.hexSize * Math.sqrt(3);
    const ring = el('circle', { cx: p.x, cy: p.y, r: reach, fill: 'none', stroke: BLAST.ringStroke, 'stroke-width': BLAST.ringWidth });
    ring.style.transformOrigin = `${p.x}px ${p.y}px`;
    playFrom(ring, [
      { transform: 'scale(0.1)', opacity: 0.9, strokeWidth: BLAST.ringWidth * 2 },
      { transform: 'scale(1)', opacity: 0, strokeWidth: 1 },
    ], { duration: BLAST.ringMs, easing: 'ease-out' }, elapsed);
    layers.effects.appendChild(ring);

    for (let i = 0; i < BLAST.smokePuffs; i++) {
      // Spread round the blast by index, not rolled: display never uses the game's dice.
      const a = ((i * 137.5 + n * 53) % 360) * (Math.PI / 180);
      const spread = map.hexSize * (0.25 + (i % 3) * 0.22);
      const x = p.x + Math.cos(a) * spread, y = p.y + Math.sin(a) * spread * 0.6;
      const puff = el('circle', { cx: x, cy: y, r: map.hexSize * (0.35 + (i % 2) * 0.15), fill: BLAST.smoke });
      puff.style.transformOrigin = `${x}px ${y}px`;
      const rise = map.hexSize * (1 + (i % 4) * 0.35);
      playFrom(puff, [
        { transform: 'translate(0, 0) scale(0.4)', opacity: 0 },
        { transform: `translate(0, ${-rise * 0.3}px) scale(1)`, opacity: BLAST.smokeOpacity, offset: 0.2 },
        { transform: `translate(${(i % 2 ? 1 : -1) * 6}px, ${-rise}px) scale(1.8)`, opacity: 0 },
      ], { delay: 120 + i * 70, duration: BLAST.smokeMs, easing: 'ease-out' }, elapsed);
      layers.effects.appendChild(puff);
    }

    if (elapsed >= MOTION.blastMs) return;
    const size = BLAST.artSize * (blast.destroyed ? BLAST.destroyedScale : 1);
    const outer = el('g', { transform: `translate(${p.x - size / 2} ${p.y - size / 2})` });
    const inner = el('g', { class: 'nd-blast' });
    inner.style.animationDelay = `${-Math.round(elapsed)}ms`;
    inner.appendChild(el('use', { href: '#marker-blast', width: size, height: size }));
    outer.appendChild(inner);
    layers.effects.appendChild(outer);
  });
}

// --- speech bubbles (SPEC.md §5 Dialogue, §11) ---------------------------------

// Speech-bubble text widths, by the text measured (see drawSpeech).
const SPEECH_WIDTHS = new Map();

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
  // Each measurement makes the browser lay the text out, which on every hover
  // made Safari stutter (M26d): a width is kept once the fonts are in.
  const measure = (content) => {
    const known = SPEECH_WIDTHS.get(content);
    if (known !== undefined) return known;
    const probe = letter(content, { visibility: 'hidden' });
    layers.speech.appendChild(probe);
    const width = probe.getComputedTextLength();
    probe.remove();
    if (document.fonts?.status === 'loaded') SPEECH_WIDTHS.set(content, width);
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

  // Where a blast only wounds our men (M20) is printed lighter than where it kills.
  if (view.previewBlastArea) fillArea(layers, view.previewBlastArea, BLAST.previewOpacity);
  if (view.previewBlastKillArea) fillArea(layers, view.previewBlastKillArea, BLAST.previewOpacity);
  if (view.blastArea.size > 0) {
    fillArea(layers, view.blastArea, BLAST.woundOpacity);
    fillArea(layers, view.blastKillArea, BLAST.opacity - BLAST.woundOpacity);
    drawAreaEdge(layers, layers.sites, view.blastArea, [[BLAST.casing, BLAST.casingWidth], [BLAST.stroke, BLAST.width]]);
    if (view.blastKillArea.size < view.blastArea.size) {
      drawAreaEdge(layers, layers.sites, view.blastKillArea, [[BLAST.stroke, BLAST.killEdgeWidth]], { 'stroke-dasharray': BLAST.killEdgeDash });
    }
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
    // The exchange's telephone lines run out to a pole on each of its charge
    // points (M12), so "cut the line" has a line to cut; cut or blown, they hang snapped.
    if (objectiveArt(objective)?.wires) drawWires(layers, objective);
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
      // A charge set here is drawn in the point's place, below (M26d).
      if (state.charges.some((c) => c.q === h.q && c.r === h.r)) continue;
      const p = axialToPixel(h.q, h.r, map.hexSize);
      const inset = layers.corners.map((c) => `${p.x + c.x * OBJECTIVE.pointInset},${p.y + c.y * OBJECTIVE.pointInset}`).join(' ');
      const point = el('g', { opacity: hovered ? OBJECTIVE.pointHoverOpacity : OBJECTIVE.pointOpacity });
      point.appendChild(el('polygon', { points: inset, fill: 'none', stroke: OBJECTIVE.casing, 'stroke-width': OBJECTIVE.pointCasingWidth, 'stroke-linejoin': 'round' }));
      point.appendChild(el('polygon', {
        points: inset, fill: 'none', stroke: OBJECTIVE.pointStroke, 'stroke-width': OBJECTIVE.pointWidth,
        'stroke-dasharray': OBJECTIVE.pointDash, 'stroke-linejoin': 'round',
      }));
      const size = OBJECTIVE.pointIconSize;
      const { x, y } = pointIconAt(map, objective, h);
      point.appendChild(el('use', { href: '#marker-charge-point', x: x - size / 2, y: y - size / 2, width: size, height: size }));
      layers.sites.appendChild(point);
    }
  }
  for (const label of labels) layers.sites.appendChild(label);

  // A charge set and burning: the satchel, solid, where the point's empty one
  // was (M26d, the operator's: on the bridge, with a second point still
  // open, the set one read as unchanged), and a token with the turns left.
  for (const charge of state.charges) {
    const objective = state.objectives.find((o) => o.id === charge.objectiveId);
    const at = objective ? pointIconAt(map, objective, charge) : axialToPixel(charge.q, charge.r, map.hexSize);
    const size = OBJECTIVE.pointIconSize;
    layers.tokens.appendChild(el('use', { href: '#marker-charge', x: at.x - size / 2, y: at.y - size / 2, width: size, height: size }));
    const watch = MARKER.fuseSize;
    layers.tokens.appendChild(el('use', { href: `#${fuseMarkerId(charge.fuse)}`, x: at.x + size * 0.15, y: at.y - size * 0.2, width: watch, height: watch }));
  }
}

/**
 * Where a charge point's satchel sits on its hex: toward the target it is for,
 * not dead centre (M12), nudged clear of the objective's own art where
 * map.json says (M14). A charge set on the point is drawn in the same place.
 */
function pointIconAt(map, objective, h) {
  const p = axialToPixel(h.q, h.r, map.hexSize);
  const v = towardObjective(map, h, objective);
  const shift = map.hexSize * OBJECTIVE.pointIconShift;
  const [nx, ny] = map.objectives.find((o) => o.id === objective.id)?.pointNudge?.[`${h.q},${h.r}`] ?? [0, 0];
  return { x: p.x + v.x * shift + nx * map.hexSize, y: p.y + v.y * shift + ny * map.hexSize };
}

/**
 * The unit vector, in board pixels, from a charge point toward the nearest hex
 * of its objective (the first in data order on a tie).
 */
function towardObjective(map, hex, objective) {
  const p = axialToPixel(hex.q, hex.r, map.hexSize);
  let best = null;
  for (const h of objective.hexes) {
    const o = axialToPixel(h.q, h.r, map.hexSize);
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (!best || d < best.d - 1e-6) best = { d, x: o.x - p.x, y: o.y - p.y };
  }
  return best && best.d > 0 ? { x: best.x / best.d, y: best.y / best.d } : { x: 0, y: 0 };
}

/**
 * Telephone wires from the objective to a pole on each of its charge points,
 * on the far side of the hex from the satchel: each one long line, sagging,
 * from the pole's crossarm all the way to the objective's own standard (M14,
 * the operator's: the short wires stopped in their hex). Once the objective is
 * gone (the line cut, or blown) each wire is snapped: two ends hanging, with a
 * gap between.
 */
function drawWires(layers, objective) {
  const { map } = layers;
  const art = objectiveArt(objective);
  const centre = labelPoint(map, objective.hexes);
  const standard = { x: centre.x - art.width / 2 + art.wires.x, y: centre.y - art.height / 2 + art.wires.y };
  const g = el('g', {});
  for (const h of objective.chargeHexes) {
    const p = axialToPixel(h.q, h.r, map.hexSize);
    const v = towardObjective(map, h, objective);
    const pole = { x: p.x - v.x * map.hexSize * WIRES.poleAway, y: p.y - v.y * map.hexSize * WIRES.poleAway };
    const size = WIRES.poleSize;
    const top = { x: pole.x, y: pole.y - size * 0.3 };
    // On the standard's insulator on his side: left, middle or right.
    const side = Math.abs(top.x - standard.x) < map.hexSize * 0.5 ? 0 : Math.sign(top.x - standard.x);
    const end = { x: standard.x + side * WIRES.insulatorGap, y: standard.y };
    const sag = Math.hypot(end.x - top.x, end.y - top.y) * WIRES.sag;
    const at = (t) => ({ x: top.x + (end.x - top.x) * t, y: top.y + (end.y - top.y) * t });
    const wire = (d) => {
      g.appendChild(el('path', { d, fill: 'none', stroke: WIRES.casing, 'stroke-width': WIRES.width + 2.5, 'stroke-linecap': 'round' }));
      g.appendChild(el('path', { d, fill: 'none', stroke: WIRES.stroke, 'stroke-width': WIRES.width, 'stroke-linecap': 'round' }));
    };
    if (objective.destroyed) {
      // Snapped: each end falls from its post, short of the middle.
      const a = at(0.38), b = at(0.62);
      wire(`M${top.x} ${top.y} Q${a.x} ${top.y + WIRES.drop * 0.5} ${a.x - v.x * 4} ${a.y + WIRES.drop}`);
      wire(`M${end.x} ${end.y} Q${b.x} ${end.y + WIRES.drop * 0.5} ${b.x + v.x * 4} ${b.y + WIRES.drop}`);
    } else {
      const mid = at(0.5);
      wire(`M${top.x} ${top.y} Q${mid.x} ${mid.y + sag * 2} ${end.x} ${end.y}`);
    }
    g.appendChild(el('use', { href: '#marker-telegraph-pole', x: pole.x - size / 2, y: pole.y - size / 2, width: size, height: size }));
  }
  layers.sites.appendChild(g);
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

function marker(id, x, y, size = MARKER.size) {
  return el('use', { href: `#${id}`, x, y, width: size, height: size });
}

/**
 * A marker on one of our counters that takes the mouse, for its rollover: the
 * handlers given to createBoard say what it means. A click on it is a click on
 * his hex, as if the marker were not there.
 */
function hoverMarker(layers, id, x, y, unit, size = MARKER.size) {
  const node = marker(id, x, y, size);
  node.setAttribute('pointer-events', 'all');
  // Where it stands, as a hex does, so a click on it can be told apart (M23).
  node.dataset.q = unit.q;
  node.dataset.r = unit.r;
  node.addEventListener('mouseenter', () => layers.handlers.onMarkerHover?.(id, unit.id, node));
  node.addEventListener('mouseleave', () => layers.handlers.onMarkerLeave?.());
  node.addEventListener('click', () => layers.handlers.onHexClick(unit.q, unit.r));
  return node;
}

// Things left on the ground sit in a lower corner of their hex, a body to one
// side and dropped charges to the other, so both show when they share it.
function drawOnGround(layers, id, at, side, size = MARKER.groundSize, offset = MARKER.groundOffset, extra = {}) {
  const p = axialToPixel(at.q, at.r, layers.map.hexSize);
  layers.highlight.appendChild(el('use', {
    ...extra,
    href: `#${id}`, x: p.x + side * offset.x - size / 2, y: p.y + offset.y - size / 2, width: size, height: size,
  }));
}

// A parachute (SPEC.md §9) sits on the left edge of its hex, over the counters:
// the man standing on his own chute is exactly when the player needs to see it.
function drawParachute(layers, chute) {
  const p = axialToPixel(chute.q, chute.r, layers.map.hexSize);
  const size = MARKER.size;
  // Inside its hex, toward one of its corners (M13: on the left edge it sat on
  // the hex lines). Which corner is fixed by the man's id, so it never moves
  // about between frames; display only, no dice.
  let hash = 0;
  for (const ch of String(chute.unitId)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const angle = ((30 + 60 * (hash % 6)) * Math.PI) / 180;
  const reach = layers.map.hexSize * MARKER.chuteReach;
  const marker = el('use', {
    href: '#marker-parachute', x: p.x + Math.cos(angle) * reach - size / 2, y: p.y + Math.sin(angle) * reach - size / 2, width: size, height: size,
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

    // The wind arrow sits halfway along unless the run says where (M12: the
    // east run's met the north run's name).
    const windAlong = run.windAlong ?? 0.5;
    const mid = { x: a.x + (b.x - a.x) * windAlong, y: a.y + (b.y - a.y) * windAlong };
    const d = NEIGHBOR_DIRS[DIRECTION_NAMES.indexOf(run.wind)];
    const v = axialToPixel(d.q, d.r, 1);
    const len = Math.hypot(v.x, v.y);
    const tip = { x: mid.x + (v.x / len) * DROP.windLength, y: mid.y + (v.y / len) * DROP.windLength };
    group.appendChild(polyline([mid, tip], { stroke: DROP.casing, 'stroke-width': DROP.windWidth + 4 }));
    group.appendChild(polyline([mid, tip], { stroke: DROP.windStroke, 'stroke-width': DROP.windWidth }));
    group.appendChild(arrow(tip, mid, DROP.windStroke, DROP.windWidth, DROP.windHead));

    // The name sits a way along the line, not at its start: the runs begin
    // close together in the north-west corner and their names would collide.
    // Centred on the line, so the line runs through its middle (M12); a run
    // may set how far along (`labelAlong` in map.json).
    // Nudged off the line where map.json says (M24), as a charge point's satchel is.
    const along = run.labelAlong ?? DROP.labelAlong;
    const [nx, ny] = run.labelNudge ?? [0, 0];
    const at = { x: a.x + (b.x - a.x) * along + nx * map.hexSize, y: a.y + (b.y - a.y) * along + ny * map.hexSize };
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
  return tabs.map((t) => t.at);
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
  tab.at = at;
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
  if (NOISE.unringed.includes(noise.kind)) return;
  const p = axialToPixel(noise.q, noise.r, layers.map.hexSize);
  for (const [stroke, width] of [[NOISE.casing, NOISE.casingWidth], [NOISE.stroke, NOISE.width]]) {
    layers.highlight.appendChild(el('circle', { cx: p.x, cy: p.y, r: NOISE.radius, fill: 'none', stroke, 'stroke-width': width }));
  }
  layers.highlight.appendChild(text('!', {
    x: p.x, y: p.y - NOISE.radius - 2, 'font-size': 18, 'font-weight': 'bold', fill: NOISE.text,
  }));
  // Which noise it is, under the ring, cased so it reads over anything (M15).
  const word = NOISE.words[noise.kind];
  if (word) {
    const attrs = { x: p.x, y: p.y + NOISE.radius + NOISE.wordSize * 0.9, 'font-size': NOISE.wordSize, 'font-weight': 'bold', 'letter-spacing': 1 };
    layers.highlight.appendChild(text(word, { ...attrs, fill: 'none', stroke: NOISE.casing, 'stroke-width': 4, 'stroke-linejoin': 'round' }));
    layers.highlight.appendChild(text(word, { ...attrs, fill: NOISE.text }));
  }
}

// A stone being aimed: earshot tinted and edged, and where it lands.
function drawThrow(layers, preview) {
  const { map } = layers;
  fillArea(layers, preview.earshot, THROW.earshotOpacity, THROW.earshot);
  drawAreaEdge(layers, layers.path, preview.earshot, [[THROW.earshot, THROW.earshotEdge]]);
  // Where it lands, and nothing from the man to it (M17): a line read as a walk.
  const b = axialToPixel(preview.to.q, preview.to.r, map.hexSize);
  const size = map.hexSize * THROW.targetScale;
  layers.path.appendChild(el('use', { href: '#marker-stone-target', x: b.x - size / 2, y: b.y - size / 2, width: size, height: size, 'pointer-events': 'none' }));
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
// means that hex gets him spotted. A hex no enemy can see gets no pips. The
// last hex with pips has a pen note saying what they are (M19).

function drawRisk(layers, plan, risk) {
  const { map } = layers;
  const noted = risk.findLastIndex((r, i) => r && i < plan.path.length);
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
    if (i === noted) drawRiskNote(layers, at, y, width, result);
  });
}

/** "2 of 3 dots: 3 and he's spotted" beside the pips, in the player's pen. */
function drawRiskNote(layers, at, y, width, result) {
  const lines = result.spotted
    ? [`${result.threshold} of ${result.threshold} dots:`, "he's spotted"]
    : [`${Math.max(0, result.score)} of ${result.threshold} dots:`, `${result.threshold} and he's spotted`];
  const right = at.x + width / 2 + RISK.noteGap + RISK.noteRoom <= boardEdges(layers.map).right;
  const lead = RISK.noteSize * RISK.noteLeading;
  const note = text('', {
    'text-anchor': right ? 'start' : 'end', 'dominant-baseline': 'middle',
    'font-family': SPEECH.font, 'font-weight': 'bold', 'font-size': RISK.noteSize,
    fill: result.spotted ? RISK.noteSpotted : RISK.noteInk,
    stroke: RISK.noteHalo, 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round',
  });
  const x = right ? at.x + width / 2 + RISK.noteGap : at.x - width / 2 - RISK.noteGap;
  lines.forEach((words, k) => {
    const span = el('tspan', { x, y: y + (k - 0.5) * lead });
    span.textContent = words;
    note.appendChild(span);
  });
  layers.risk.appendChild(note);
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
  // Its outline is drawn with the leader's, in renderPieces.
}

/**
 * One line round the outside of a set of hexes (a Map keyed by hexKey): every
 * hex edge whose neighbour is not in the set, stroked once per [colour, width]
 * pair, widest first, so the line can be cased. Edges facing off the board are
 * left open: the border closes the area, and stroking them drew a sawtooth
 * past it.
 */
function drawAreaEdge(layers, layer, area, strokes, extra = {}) {
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
      d: outline, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round', ...extra,
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
  const group = el('g', { transform: counterPlace(center) });
  // A man with no AP left is done for the turn: his die-cut edge goes grey.
  if (unit.ap === 0) group.style.setProperty('--counter-edge', COUNTER.spentEdge);
  // A hidden man is printed faint, the counter and its shadow as one; the
  // marks added to `group` after it stay at full strength (M21: the hidden
  // mark faded with him and was hard to see).
  const print = el('g', { opacity: unit.hidden ? MARKER.hiddenOpacity : 1 });
  group.appendChild(print);
  const body = el('g', {});
  print.appendChild(body);

  print.insertBefore(el('use', { href: '#counter-shadow', width: size, height: size }), body);
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

  // A charge he carries (M15): an orange dot each, down the left under his
  // role, in the colour of what it does, ringed in paper to stand off the
  // green. The leader's sit on his rank flash, in the same place as every
  // other man's (M16, the operator's: beside it they read as something else).
  const dots = COUNTER.chargeDots;
  for (let i = 0; i < unit.charges; i++) {
    const at = { cx: dots.x, cy: dots.y + i * dots.pitch };
    body.appendChild(el('circle', { ...at, r: dots.radius + 1.1, fill: COUNTER.apFill }));
    body.appendChild(el('circle', { ...at, r: dots.radius, fill: dots.fill, stroke: COUNTER.apDots.stroke, 'stroke-width': 0.8 }));
  }

  // AP as dots top right (M13): one per point of this turn's pool, filled for
  // what he has left, hollow for what he has spent — the number by his name is
  // his roster number, and two numbers on one counter confused players.
  // The leader's orders are the last dots, in leader blue (M14), so they are
  // the first spent.
  const pool = Math.max(unit.apMax, unit.ap);
  const orders = pool - (unit.commandBonus ?? 0);
  for (let i = 0; i < pool; i++) {
    const col = i % COUNTER.apDots.columns, row = Math.floor(i / COUNTER.apDots.columns);
    const left = i < unit.ap;
    const fill = i >= orders ? COUNTER.apOrdersFill : COUNTER.apFill;
    body.appendChild(el('circle', {
      cx: COUNTER.apDots.x + col * COUNTER.apDots.pitch, cy: COUNTER.apDots.y + row * COUNTER.apDots.pitch, r: COUNTER.apDots.radius,
      fill: left ? fill : 'none', stroke: left ? COUNTER.apDots.stroke : fill,
      'stroke-width': left ? 0.8 : 1, opacity: left ? 1 : COUNTER.apSpentOpacity,
    }));
  }

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
function drawEnemy(enemy, map, isHovered, hears, nextFacing = null) {
  const center = axialToPixel(enemy.q, enemy.r, map.hexSize);
  const size = COUNTER.size;
  const group = el('g', { transform: counterPlace(center) });

  const wedge = (facing, attrs) => {
    const d = NEIGHBOR_DIRS[facing];
    const toward = axialToPixel(d.q, d.r, 1);
    const len = Math.hypot(toward.x, toward.y);
    const ux = toward.x / len, uy = toward.y / len;
    const tip = { x: size / 2 + ux * (ENEMY.facingDistance + ENEMY.facingSize), y: size / 2 + uy * (ENEMY.facingDistance + ENEMY.facingSize) };
    const base = { x: size / 2 + ux * ENEMY.facingDistance, y: size / 2 + uy * ENEMY.facingDistance };
    const w = ENEMY.facingSize;
    return el('polygon', { points: `${tip.x},${tip.y} ${base.x - uy * w},${base.y + ux * w} ${base.x + uy * w},${base.y - ux * w}`, ...attrs });
  };
  // Which way it will face next turn, if that is not the way it faces now
  // (M13b): a hollow dashed wedge beside the solid one.
  if (nextFacing != null && nextFacing !== enemy.facing) {
    group.appendChild(wedge(nextFacing, { fill: ENEMY.nextFill, stroke: ENEMY.facingFill, 'stroke-width': 1.5, 'stroke-dasharray': '2.5 1.5' }));
  }
  group.appendChild(wedge(enemy.facing, { fill: ENEMY.facingFill, stroke: ENEMY.facingStroke, 'stroke-width': 1.5 }));

  const body = el('g', {});
  group.appendChild(body);
  group.insertBefore(el('use', { href: '#counter-shadow', width: size, height: size }), body);
  body.appendChild(el('use', { href: '#counter-frame-enemy', width: size, height: size }));
  body.appendChild(el('use', { href: `#${enemySymbolId(enemy.type)}`, width: size, height: size }));

  const label = (enemy.counterLabel ?? enemy.typeLabel).toUpperCase();
  const room = ENEMY.labelBoxRight - ENEMY.labelBoxLeft;
  const fitted = room / Math.max(1, label.length * COUNTER.nameAspect);
  body.appendChild(text(label, {
    x: (ENEMY.labelBoxLeft + ENEMY.labelBoxRight) / 2, y: 45.5,
    'font-size': Math.min(ENEMY.labelSize, fitted).toFixed(2), 'font-weight': 'bold', fill: ENEMY.labelFill,
  }));

  // Suppressed (M13: players could not tell): the counter printed faint, as
  // if pressed flat, with a red band across it saying so.
  if (enemy.suppressed) {
    body.appendChild(el('rect', { x: 0, y: 0, width: size - 4, height: size - 4, rx: 7, fill: SUPPRESSED.fade, 'fill-opacity': SUPPRESSED.fadeOpacity }));
    const band = el('g', { transform: `rotate(${SUPPRESSED.bandRotate} ${size / 2} ${size / 2})` });
    band.appendChild(el('rect', {
      x: -6, y: size / 2 - SUPPRESSED.bandHeight / 2, width: size + 8, height: SUPPRESSED.bandHeight,
      fill: SUPPRESSED.band, stroke: SUPPRESSED.bandStroke, 'stroke-width': 1.5,
    }));
    band.appendChild(text('SUPPRESSED', {
      x: size / 2 + 1, y: size / 2 + 0.5, 'font-size': SUPPRESSED.textSize, 'font-weight': 'bold', 'letter-spacing': 0.5, fill: SUPPRESSED.text,
    }));
    body.appendChild(band);
  }

  if (isHovered) hoverRing(group);
  if (hears) {
    group.appendChild(el('circle', {
      cx: size / 2, cy: size / 2, r: size / 2 + 6,
      fill: 'none', stroke: TARGET.hearsStroke, 'stroke-width': TARGET.hearsWidth, 'stroke-dasharray': '4 3',
    }));
  }
  return group;
}

/**
 * A counter under the mouse: dashed, not the selected man's solid frame,
 * looked at, not picked (M22 for an enemy, M23 for our men too).
 */
function hoverRing(group) {
  const size = COUNTER.size;
  const g = ENEMY.hoverGap;
  const ring = { x: -2 - g, y: -2 - g, width: size + 2 * g, height: size + 2 * g, rx: 9 + g, fill: 'none', 'pointer-events': 'none' };
  group.appendChild(el('rect', { ...ring, stroke: ENEMY.hoverCasing, 'stroke-width': ENEMY.hoverCasingWidth, opacity: 0.85 }));
  group.appendChild(el('rect', { ...ring, stroke: ENEMY.hoverStroke, 'stroke-width': ENEMY.hoverWidth, 'stroke-dasharray': ENEMY.hoverDash, 'stroke-linecap': 'round' }));
}

// A man the action being aimed can go to (M26d): a ring in the targets' blue.
function targetRing(group) {
  const size = COUNTER.size;
  const ring = { cx: size / 2 - 2, cy: size / 2 - 2, r: size / 2 + TARGET.manGap, fill: 'none', 'pointer-events': 'none' };
  group.appendChild(el('circle', { ...ring, stroke: TARGET.casing, 'stroke-width': TARGET.casingWidth }));
  group.appendChild(el('circle', { ...ring, stroke: TARGET.stroke, 'stroke-width': TARGET.width }));
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

// --- the counter key (M15) ------------------------------------------------------

/**
 * "How to read a counter", beside the orders: one of our counters drawn big,
 * every mark on it labelled, the other marks a man can wear, and an enemy
 * counter the same way — drawn by the same code as the board, so the key can
 * never drift from what it explains. `examples` come from main.js: `man` (a
 * man with a charge, the leader's orders and some AP spent), `leader`, and
 * `enemy`; `numbers` the figures the words quote (`arc`).
 */
export function drawCounterKey(svg, examples, numbers) {
  svg.replaceChildren();
  const unitMap = { hexSize: 1 };
  const scale = COUNTER.drawn / COUNTER.size;
  // A point on a counter drawn at (cx, cy), k times its board size.
  const on = (cx, cy, k, p) => ({ x: cx + k * (-COUNTER.drawn / 2 + p.x * scale), y: cy + k * (-COUNTER.drawn / 2 + p.y * scale) });
  const place = (node, cx, cy, k) => {
    const g = el('g', { transform: `translate(${cx} ${cy}) scale(${k})` });
    g.appendChild(node);
    svg.appendChild(g);
    return g;
  };
  // The first `heads` lines are the bold label, the rest its description.
  const words = (x, y, lines, anchor = 'start', heads = 1) => {
    // 13 in the drawing, 12 px on screen at 1280x800, where the key is drawn
    // at 0.92: the right page's floor (SPEC.md §11).
    const t = el('text', { x, y, 'text-anchor': anchor, 'font-family': TYPE.typewriter, 'font-size': 13, fill: PALETTE.ink });
    lines.forEach((line, i) => {
      const span = el('tspan', { x, dy: i === 0 ? 0 : 14.5, 'font-weight': i < heads ? 'bold' : 'normal' });
      span.textContent = line;
      t.appendChild(span);
    });
    svg.appendChild(t);
  };
  // `short` stops the line that far before what it points at, so the thing
  // itself shows (M21: the blue AP dot was hidden under the red end).
  const pointer = (from, to, { tip = PALETTE.red, short = 0 } = {}) => {
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const end = { x: to.x - ((to.x - from.x) / len) * short, y: to.y - ((to.y - from.y) / len) * short };
    svg.appendChild(el('path', { d: `M${from.x} ${from.y} L${end.x} ${end.y}`, stroke: PALETTE.ink, 'stroke-width': 1, fill: 'none' }));
    svg.appendChild(el('circle', { cx: end.x, cy: end.y, r: 2.2, fill: tip, stroke: PALETTE.paper, 'stroke-width': 1 }));
  };
  const heading = (y, content) => {
    svg.appendChild(el('path', { d: `M0 ${y + 5} H336`, stroke: PALETTE.ink, 'stroke-width': 2 }));
    svg.appendChild(text(content, { x: 0, y: y - 4, 'text-anchor': 'start', 'dominant-baseline': 'auto', 'font-family': TYPE.slab, 'font-size': 14, 'letter-spacing': 2, fill: PALETTE.ink }));
  };
  const row = (y, node, lines, x = 64) => {
    svg.appendChild(node);
    words(x, y - 3, lines);
  };

  // Our men: Fitch, say, with a charge and the orders, one AP spent. The
  // spotted mark goes in the list below: on the counter it covers his AP.
  heading(16, 'YOUR MEN');
  const man = { ...examples.man, q: 0, r: 0 };
  const counter = drawCounter(man, examples.manNumber, unitMap, false);
  const ordersSize = MARKER.size * MARKER.ordersScale;
  counter.appendChild(marker(ordersMarkerId(man.commandBonus), 51 - ordersSize / 2, 31 - ordersSize / 2, ordersSize));
  const cx = 167, cy = 128, k = 1.8;
  place(counter, cx, cy, k);
  const dots = COUNTER.apDots;
  const firstBlue = man.apMax - man.commandBonus;
  // The leader by his name in the data, never a name in code (CLAUDE.md rule 6).
  const lead = examples.leader.shortName.charAt(0) + examples.leader.shortName.slice(1).toLowerCase();
  const left = [
    [{ x: COUNTER.role.x + COUNTER.role.size / 2, y: COUNTER.role.y + COUNTER.role.size / 2 }, 58, ['ROLE', 'Sapper, scout', 'or gunner']],
    [{ x: COUNTER.chargeDots.x, y: COUNTER.chargeDots.y }, 116, ['CHARGES', 'A dot each']],
    [{ x: 7, y: 46.5 }, 164, ['KEY 1–6', 'Beside his', 'name']],
  ];
  for (const [p, y, lines] of left) {
    pointer({ x: 100, y: y - 4 }, on(cx, cy, k, p));
    words(96, y, lines, 'end');
  }
  // [point on the counter, y, lines, how many of them are the bold label, pointer]
  // BLUE AP ends in a blue dot just off the one it means (M21, the operator's).
  const right = [
    [{ x: dots.x, y: dots.y }, 50, ['ACTION POINTS', 'REMAINING', 'Hollow when', 'spent'], 2],
    [{ x: dots.x + (firstBlue % dots.columns) * dots.pitch, y: dots.y + Math.floor(firstBlue / dots.columns) * dots.pitch }, 118, ['BLUE AP', 'Bonus from', `${lead}'s orders`], 1,
      { tip: COUNTER.apOrdersFill, short: (dots.radius * scale + 2.5) * k }],
    [{ x: 51, y: 31 }, 176, [`${lead.toUpperCase()}'S`, 'ORDERS', 'This turn'], 2],
  ];
  for (const [p, y, lines, heads, style] of right) {
    pointer({ x: 230, y: y - 4 }, on(cx, cy, k, p), style);
    words(234, y, lines, 'start', heads);
  }

  // The other marks a man can wear.
  const leader = drawCounter({ ...examples.leader, q: 0, r: 0, ap: examples.leader.apMax }, 1, unitMap, false);
  const small = el('g', { transform: 'translate(30 238) scale(0.8)' });
  small.appendChild(leader);
  row(234, small, [`${lead.toUpperCase()}, THE LEADER`, 'Blue name and rank; men near', 'him start a turn with more AP']);
  const markerAt = (id, y) => el('use', { href: `#${id}`, x: 17, y: y - 13, width: 26, height: 26 });
  row(284, markerAt('marker-spotted', 284), ['SPOTTED', 'Seen again this turn: fired on']);
  row(318, markerAt('marker-wounded', 318), ['WOUNDED', '1 AP; killed if hit again']);
  row(352, markerAt('marker-hidden', 352), ['HIDDEN', 'Gone to ground, harder to see']);

  // The garrison, with more air above its heading since M21 (the operator's);
  // the key's viewBox (index.html) has as much again under the last line.
  const air = 14;
  heading(390 + air, 'THE GARRISON');
  const east = 2, southEast = 3;
  const enemy = { ...examples.enemy, q: 0, r: 0, facing: east, suppressed: false, openToKill: false };
  const ex = 92, ey = 482 + air, ek = 1.7;
  place(drawEnemy(enemy, unitMap, false, false, southEast), ex, ey, ek);
  const size = COUNTER.size;
  const tip = (facing) => {
    const d = NEIGHBOR_DIRS[facing];
    const toward = axialToPixel(d.q, d.r, 1);
    const len = Math.hypot(toward.x, toward.y);
    const reach = ENEMY.facingDistance + ENEMY.facingSize * 0.6;
    return { x: size / 2 + (toward.x / len) * reach, y: size / 2 + (toward.y / len) * reach };
  };
  // WHO points at the right-hand end of the name on the chip (M17, the
  // operator's: at its middle the line ran over the facing wedge and was lost
  // on the dark chip). Where the name ends is worked out as drawEnemy sets it.
  const name = (enemy.counterLabel ?? enemy.typeLabel).toUpperCase();
  const nameRoom = ENEMY.labelBoxRight - ENEMY.labelBoxLeft;
  const nameSize = Math.min(ENEMY.labelSize, nameRoom / Math.max(1, name.length * COUNTER.nameAspect));
  const nameEnd = (ENEMY.labelBoxLeft + ENEMY.labelBoxRight) / 2 + (name.length * nameSize * COUNTER.nameAspect) / 2 + 1.5;
  const enemyLabels = [
    [tip(east), 428 + air, ['FACING', `Sees ${numbers.arc}° this`, 'way']],
    // WHO above NEXT TURN (M16): the other way round, their pointers crossed.
    [{ x: nameEnd, y: 45.5 }, 500 + air, ['WHO', 'Sentry, patrol', 'or reserve']],
    [tip(southEast), 552 + air, ['NEXT TURN', 'It will face', 'here (dashed)']],
  ];
  for (const [p, y, lines] of enemyLabels) {
    pointer({ x: 216, y: y - 4 }, on(ex, ey, ek, p));
    words(220, y, lines);
  }
  const mini = el('g', { transform: `translate(30 ${606 + air}) scale(0.8)` });
  mini.appendChild(drawEnemy({ ...enemy, suppressed: true }, unitMap, false, false));
  row(602 + air, mini, ['SUPPRESSED', 'Head down this turn: it', 'does not see, fire or move'], 76);
  row(656 + air, markerAt('marker-open-kill', 656 + air), ['OPEN TO A KILL [K]', 'The turn after: it sees again']);
  row(692 + air, markerAt('marker-no-kill', 692 + air), ['CANNOT BE KILLED', 'The reserve squad']);
  row(728 + air, markerAt('marker-spotted', 728 + air), ['RAISED THE ALARM', 'It saw or found something']);
}
