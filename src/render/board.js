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
  BLAST, CONTACT, COUNTER, DROP, ENEMY, EXFIL, GRID, HIGHLIGHT, MARKER, MOTION, NOISE, OBJECTIVE, PATH, RAIL, RISK, ROAD, ROUTE,
  SELECTION, SPEECH, TARGET, TYPE, VISION, WATCH, counterFrameId, createSpriteDefs, enemySymbolId, fuseMarkerId,
  objectiveArt, portraitId, roleSymbolId, speechBubble, terrainArt, terrainMotifId, toneClass,
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

  forEachCell(map, (q, r) => {
    const center = axialToPixel(q, r, map.hexSize);
    const terrainId = terrainIdAt(map, q, r);
    const style = terrainArt(terrainId);
    const inPlay = isInPlay(map, q, r);
    const points = cornersToPoints(center, corners);

    const hex = el('g', { 'data-q': q, 'data-r': r });
    if (!inPlay) hex.setAttribute('opacity', GRID.outOfPlayOpacity);

    // Printed in plates: the flat base, a flat tint and a halftone screen over
    // it where the terrain has them, the motif, then the grid rule in ink.
    hex.appendChild(el('polygon', { points, fill: style.fill }));
    if (style.tint) hex.appendChild(el('polygon', { points, fill: style.tintFill, 'fill-opacity': style.tint[1] }));
    if (style.tone) hex.appendChild(el('polygon', { points, class: toneClass(...style.tone) }));
    if (style.banks) drawBanks(hex, map, q, r, center, style.banks);
    const motif = terrainMotifId(style, q, r);
    if (motif) hex.appendChild(el('use', { href: `#${motif}`, x: center.x - 40, y: center.y - 46, width: 80, height: 92 }));
    hex.appendChild(el('polygon', {
      points, fill: 'none', stroke: GRID.stroke, 'stroke-width': GRID.strokeWidth, 'stroke-opacity': GRID.strokeOpacity,
    }));

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

  const lines = el('g', { 'pointer-events': 'none' });
  const railway = railwayHexes(map);
  drawRoads(lines, map, edge, railway);
  drawRailway(lines, map, edge);
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
    if (links.length === 1) {
      const away = (links[0] + 3) % 6;
      const n = NEIGHBOR_DIRS[away];
      if (!inBounds(map, q + n.q, r + n.r)) links.push(away);
    }
    const c = axialToPixel(q, r, map.hexSize);
    const mids = links.map((dir) => edgeMiddle(map, q, r, dir));
    if (mids.length === 2) d += `M${f(mids[0])} Q${f(c)} ${f(mids[1])} `;
    else for (const m of mids) d += `M${f(m)} L${f(c)} `;
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

  if (view.plan) drawPlan(layers, view.plan);
  if (view.plan && view.risk) drawRisk(layers, view.plan, view.risk);

  for (const hex of view.searchHexes) drawContact(layers, hex);
  for (const noise of state.noises) drawNoise(layers, noise);
  for (const body of state.bodies) drawOnGround(layers, body.enemyId ? 'marker-body-enemy' : 'marker-body', body, -1);
  for (const chute of state.parachutes) drawParachute(layers, chute);
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
  });

  drawBlasts(layers, state, now);
  drawSpeech(layers, state, view.speakers ?? new Set());
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

  for (const objective of state.objectives) {
    const hovered = objective.id === view.hoverObjective?.id;
    const outline = el('g', { opacity: hovered ? 1 : OBJECTIVE.outlineOpacity });
    drawAreaEdge(layers, outline, areaOf(objective.hexes), [
      [OBJECTIVE.casing, OBJECTIVE.casingWidth], [OBJECTIVE.stroke, OBJECTIVE.width],
    ]);
    layers.sites.appendChild(outline);
    const at = labelPoint(map, objective.hexes);
    const name = objective.primary ? `${objective.label.toUpperCase()} ★` : objective.label.toUpperCase();
    layers.sites.appendChild(casedText(name, at.x, at.top - map.hexSize * OBJECTIVE.labelLift, objective.primary ? OBJECTIVE.primaryLabel : OBJECTIVE.label));
    if (objective.destroyed) {
      layers.highlight.appendChild(el('use', {
        href: '#stamp-destroyed',
        x: at.x - OBJECTIVE.stampWidth / 2, y: at.y - OBJECTIVE.stampHeight / 2,
        width: OBJECTIVE.stampWidth, height: OBJECTIVE.stampHeight,
        transform: `rotate(${OBJECTIVE.stampRotate} ${at.x} ${at.y})`,
      }));
      continue;
    }
    for (const h of objective.chargeHexes) {
      const p = axialToPixel(h.q, h.r, map.hexSize);
      for (const [stroke, width] of [[OBJECTIVE.casing, OBJECTIVE.ringWidth + 3], [OBJECTIVE.ringStroke, OBJECTIVE.ringWidth]]) {
        layers.sites.appendChild(el('circle', {
          cx: p.x, cy: p.y, r: OBJECTIVE.ringRadius, fill: 'none', stroke, 'stroke-width': width,
          'stroke-dasharray': OBJECTIVE.ringDash, opacity: hovered ? OBJECTIVE.ringHoverOpacity : OBJECTIVE.ringOpacity,
        }));
      }
    }
  }

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
  layers.tokens.appendChild(el('use', {
    href: '#marker-parachute', x: p.x - COUNTER.drawn / 2 - size + 8, y: p.y - size / 2, width: size, height: size,
  }));
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
  const name = run.label.toUpperCase();
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
// All art is <use> of a registry symbol (CLAUDE.md rule 8). The AP pips and
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

  for (let i = 0; i < unit.apMax; i++) {
    const spent = i >= unit.ap;
    body.appendChild(el('circle', {
      cx: 27 - ((unit.apMax - 1) * 8) / 2 + i * 8,
      cy: 6.5,
      r: COUNTER.pipRadius,
      fill: spent ? 'none' : COUNTER.pipFill,
      stroke: COUNTER.pipFill,
      'stroke-width': 1,
      'stroke-opacity': spent ? 0.5 : 1,
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
