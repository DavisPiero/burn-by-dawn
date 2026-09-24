// The one place colour and art live. Art must be swappable by editing this
// file and nothing else (CLAUDE.md rule 8).
//
// Everything here is procedural: SVG <symbol> defs keyed by the asset ids in
// ART-ASSETS.md, with its viewBoxes, so a hand-drawn SVG replaces the body of
// one of these symbols and nothing else changes. Symbols colour themselves
// with the manifest's classes (.ink .paper .green .red .blue .leader, and
// `stroke-` versions of the same), never with hardcoded colours.
//
// M7 adds the print (SPEC.md §11): the Ben-Day halftone as <pattern> defs,
// applied in code through `tone-<colour>-<density>` classes; the 0.5px colour
// misregistration, applied in code to every colour fill and never to the ink;
// the paper fibre; and the type.

import { createRng } from '../rng.js';

export const PALETTE = {
  paper: '#F2E8D5',
  ink: '#1A1A18',
  green: '#5C6B4A',
  red: '#C1272D',
  blue: '#3D5A73',
  // The sixth spot colour, for the ranking man only: his counter's name strip
  // and chevrons, and his number in the roster. Brighter and more saturated
  // than cold blue so he stands out, and kept apart from it so the canal and
  // the move range do not light up too (SPEC.md §11).
  leader: '#2F7BBF',
};

// SPEC.md §11: a typewriter Courier for text, a condensed slab for the
// masthead, and hand lettering for speech bubbles. Nothing is supplied, so
// these are faces desktops ship: Noteworthy (set bold) on a Mac, Segoe Print
// and Ink Free on Windows. A supplied lettering face goes first in `lettering`
// (see ART-ASSETS.md §8). Never Comic Sans.
export const TYPE = {
  typewriter: '"Courier 10 Pitch", "Courier New", Courier, monospace',
  slab: '"Rockwell Condensed", "Roboto Slab", Rockwell, "American Typewriter", "Courier New", serif',
  lettering: 'Noteworthy, "Segoe Print", "Ink Free", "Marker Felt", "Chalkboard SE", fantasy',
};

// ---------------------------------------------------------------------------
// Print: halftone, misregistration, paper.

// The Ben-Day screen. One pattern per spot colour and density; density is the
// share of the paper the dots cover, in percent. Cells are small and the
// screen is turned 45°, as a printer's would be.
export const HALFTONE = {
  cell: 5,
  angle: 45,
  densities: [10, 20, 35, 50, 70],
  // The dots are printed faint, close to the colour under them: at full
  // strength the screen fought everything drawn over it.
  opacity: 0.25,
};

// Every colour fill is printed a hair off its ink outline. In the units of
// whatever it is drawn in; at board scale this is about half a screen pixel.
export const MISREGISTER = { x: 0.4, y: 0.3 };

/** The halftone class for a colour at a density, rounded to the nearest screen we print. */
export function toneClass(colour, density) {
  const nearest = HALFTONE.densities.reduce((a, b) => (Math.abs(b - density) < Math.abs(a - density) ? b : a));
  return `tone-${colour}-${nearest}`;
}

function halftonePatterns() {
  const patterns = [];
  for (const colour of Object.keys(PALETTE)) {
    for (const density of HALFTONE.densities) {
      const s = HALFTONE.cell;
      const r = Math.min(s * 0.62, s * Math.sqrt(density / 100 / Math.PI));
      patterns.push(svg('pattern', {
        id: `ht-${colour}-${density}`, width: s, height: s, patternUnits: 'userSpaceOnUse',
        patternTransform: `rotate(${HALFTONE.angle})`,
      }, [svg('circle', { cx: s / 2, cy: s / 2, r: r.toFixed(3), fill: PALETTE[colour], 'fill-opacity': HALFTONE.opacity })]));
    }
  }
  return patterns;
}

/** The same screen as a CSS background, for the HTML page. */
export function halftoneCss(colour, density, cell = HALFTONE.cell) {
  const r = cell * Math.sqrt(density / 100 / Math.PI);
  const hex = PALETTE[colour];
  const rgba = `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${HALFTONE.opacity})`;
  return `radial-gradient(circle, ${rgba} ${r.toFixed(2)}px, transparent ${(r + 0.6).toFixed(2)}px) 0 0 / ${cell}px ${cell}px`;
}

// Paper fibre: a tile of short hairline strokes and specks, drawn once from a
// fixed seed so it is the same sheet every time. It has its own generator and
// never touches the game's (CLAUDE.md rule 4).
const PAPER_SEED = 1947;

function paperTile() {
  const rng = createRng(PAPER_SEED);
  const size = 260;
  let body = '';
  for (let i = 0; i < 170; i++) {
    const x = rng.next() * size, y = rng.next() * size;
    const a = rng.next() * Math.PI * 2, len = 4 + rng.next() * 14, bend = (rng.next() - 0.5) * 6;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const mx = (x + x2) / 2 - Math.sin(a) * bend, my = (y + y2) / 2 + Math.cos(a) * bend;
    const alpha = (0.04 + rng.next() * 0.08).toFixed(3);
    body += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#5a4a30" stroke-opacity="${alpha}" stroke-width="${(0.4 + rng.next() * 0.6).toFixed(2)}" fill="none"/>`;
  }
  for (let i = 0; i < 70; i++) {
    const alpha = (0.05 + rng.next() * 0.12).toFixed(3);
    body += `<circle cx="${(rng.next() * size).toFixed(1)}" cy="${(rng.next() * size).toFixed(1)}" r="${(0.3 + rng.next() * 0.7).toFixed(2)}" fill="#4a3a20" fill-opacity="${alpha}"/>`;
  }
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(doc)}")`;
}

/**
 * The palette, type and paper as CSS custom properties on the page, so the
 * HTML chrome in index.html takes its colours from this file too.
 */
export function applyDocumentTheme(root = document.documentElement) {
  for (const [name, value] of Object.entries(PALETTE)) root.style.setProperty(`--${name}`, value);
  root.style.setProperty('--typewriter', TYPE.typewriter);
  root.style.setProperty('--slab', TYPE.slab);
  root.style.setProperty('--paper-fibre', paperTile());
  root.style.setProperty('--dots-ink', halftoneCss('ink', 10));
  root.style.setProperty('--dots-blue', halftoneCss('blue', 20));
  root.style.setProperty('--dots-red', halftoneCss('red', 20));
  root.style.setProperty('--dots-green', halftoneCss('green', 20));
  root.style.setProperty('--misregister', `${MISREGISTER.x}px ${MISREGISTER.y}px`);
  for (const [id, colour] of Object.entries(ALERT_STATE)) root.style.setProperty(`--alert-${id}`, colour);
}

// A supplied paper texture (ART-ASSETS.md §1, ART-PROMPTS.md): a PNG at
// PAPER_FILE replaces the drawn fibre tile once it loads, shown at half its
// pixel size for retina. A missing file is fine: the drawn tile stays.
export const PAPER_FILE = { url: 'assets/paper/paper-fibre.png', tile: 1024 };

export function loadSuppliedPaper(root = document.documentElement) {
  const probe = new Image();
  probe.onload = () => {
    root.style.setProperty('--paper-fibre', `url("${PAPER_FILE.url}")`);
    root.style.setProperty('--paper-fibre-size', `${PAPER_FILE.tile}px`);
  };
  probe.src = PAPER_FILE.url;
}

// ---------------------------------------------------------------------------
// Terrain (ART-ASSETS.md §4). Each hex is printed as a flat base, an optional
// flat tint of one spot colour over it (a printer's tint, at an opacity), an
// optional halftone screen, a motif, and the grid line. The board has to read
// at a glance (SPEC.md §11, M7b): open ground is flat colour, and the screen
// is kept for wood alone. `variants` motifs are picked per hex from its
// coordinates, so the same hex always looks the same; `sparse` is the share
// of hexes that get a motif at all. Roads are not a motif: board.js draws each
// one as a single continuous line through its hexes (`road`). `banks` terrain
// (the canal) gets a bank on every edge that faces dry land.

const TERRAIN_ART = {
  field: { base: 'paper', motif: 'terrain-field', variants: 3, sparse: 0.22 },
  track: { base: 'paper', motif: null, road: true },
  hedgerow: { base: 'paper', tint: ['green', 0.12], motif: 'terrain-hedgerow', variants: 3, hedge: true },
  // `area` terrain is printed as one shape across every run of neighbouring
  // hexes of it (see AREA), with its motif scattered over the shape.
  wood: { base: 'paper', area: { fill: 'green', tone: ['ink', 20], outline: 1.8 }, motif: 'terrain-wood', variants: 3 },
  orchard: { base: 'paper', area: { tint: ['green', 0.13], outline: 1.2, outlineClass: 'stroke-green', dash: '3 4' }, motif: 'terrain-orchard', variants: 3 },
  marsh: { base: 'paper', area: { tint: ['blue', 0.16] }, motif: 'terrain-marsh' },
  // High ground in tonal bands: darker at the crest, a paler band round the
  // edge where it falls away, a contour at its foot, and no symbol.
  ridge: { base: 'paper', area: { tint: ['ink', 0.13], rim: { width: 26, opacity: 0.5 }, outline: 1.2, outlineOpacity: 0.45, dash: '8 3' }, motif: null },
  canal: { base: 'blue', motif: 'terrain-canal', banks: ['canal', 'lock', 'bridge'] },
  lock: { base: 'blue', motif: 'terrain-canal', banks: ['canal', 'lock', 'bridge'] },
  farmhouse: { base: 'paper', tint: ['red', 0.08], motif: 'terrain-farmhouse' },
  emplacement: { base: 'paper', tint: ['red', 0.1], motif: 'terrain-emplacement' },
  // The bridge and the dump are drawn by their objective art, over the hexes.
  bridge: { base: 'paper', motif: null, road: true },
  depot: { base: 'paper', tint: ['ink', 0.07], motif: null },
};

// Area terrain's outline: it follows the hexes' edges, rounded off at every
// corner and pushed in and out by up to `wobble` at each edge's middle, so it
// reads as a wood on a map rather than a patch of hexes. The push is fixed by
// where the edge is, never rolled, so the map is the same every time.
export const AREA = { wobble: 6 };

/** A fixed push, -1 to 1, for the point (x, y). */
export function wobbleAt(x, y) {
  const rng = createRng((Math.round(x * 10) * 73856093) ^ (Math.round(y * 10) * 19349663));
  rng.next();
  return rng.next() * 2 - 1;
}

// A terrain id with no art yet still draws, in a colour that looks wrong on
// purpose, rather than vanishing.
const UNKNOWN_TERRAIN = { base: null, fill: '#FF00FF', tone: null, motif: null };

export function terrainArt(terrainId) {
  const art = TERRAIN_ART[terrainId];
  if (!art) return UNKNOWN_TERRAIN;
  const area = art.area ? { ...art.area, tintFill: art.area.tint ? PALETTE[art.area.tint[0]] : null } : null;
  return { ...art, area, fill: PALETTE[art.base], tintFill: art.tint ? PALETTE[art.tint[0]] : null };
}

/** Which variant of a motif a hex gets, or none: fixed by its coordinates, not rolled. */
export function terrainMotifId(art, q, r) {
  if (!art.motif) return null;
  const rng = createRng(((q + 64) * 73856093) ^ ((r + 64) * 19349663));
  rng.next();
  const pick = rng.next();
  if (art.sparse !== undefined && rng.next() > art.sparse) return null;
  if (!art.variants) return art.motif;
  return `${art.motif}-0${1 + Math.floor(pick * art.variants)}`;
}

// Roads and the railway are drawn as continuous lines over the terrain, not
// stamped per hex (SPEC.md §11, M7b). A road is a paper lane between two ink
// edges; the railway is the map-maker's rails-and-sleepers, on a faint bed.
export const ROAD = {
  edge: PALETTE.ink,
  edgeWidth: 12,
  fill: PALETTE.paper,
  fillWidth: 8.5,
};

// A hedgerow is a line: neighbouring hedgerow hexes are joined into one hedge,
// drawn as a lumpy green stroke with an ink edge (the lumps are a dotted
// stroke with round caps). A hedgerow hex with no hedgerow beside it keeps
// its motif.
export const HEDGE = {
  edgeWidth: 9.5,
  lumpEdgeWidth: 16.5,
  width: 6.5,
  lumpWidth: 13.5,
  lumpSpacing: '0 10.5',
};

export const RAIL = {
  bed: PALETTE.ink,
  bedWidth: 20,
  bedOpacity: 0.08,
  sleeper: PALETTE.ink,
  sleeperWidth: 13,
  sleeperDash: '2.2 6',
  rail: PALETTE.ink,
  railWidth: 6.5,
  gauge: PALETTE.paper,
  gaugeWidth: 3.5,
};

// Place names printed on the map (SPEC.md §11), set as a map-maker sets them:
// the village in spaced capitals, water in paper italic on the water, everything else in
// italic, all with a paper halo so they read over any ground. A kind with no
// entry is set as `other`.
export const PLACE = {
  font: 'Georgia, "Times New Roman", Times, serif',
  halo: PALETTE.paper,
  haloWidth: 4.5,
  village: { size: 19, weight: 'bold', italic: false, capitals: true, spacing: 4, fill: PALETTE.ink },
  water: { size: 17, weight: 'bold', italic: true, capitals: false, spacing: 1.5, fill: PALETTE.paper, halo: false },
  other: { size: 17, weight: 'normal', italic: true, capitals: false, spacing: 0.5, fill: PALETTE.ink },
};

export const GRID = {
  stroke: PALETTE.ink,
  strokeWidth: 1,
  strokeOpacity: 0.16,
  // The clipped half-hexes past the straight border. Drawn, so the border
  // reads as a printed crop rather than a void, but visibly dead.
  outOfPlayOpacity: 0.35,
  deadWash: PALETTE.paper,
  border: PALETTE.ink,
  borderWidth: 4,
};

export const SELECTION = {
  stroke: PALETTE.red,
  strokeWidth: 4,
};

// Counters are drawn in a 56px sprite space (ART-ASSETS.md §3) and printed at
// `drawn` inside an 80px hex, so the hex edge stays visible under them.
export const COUNTER = {
  size: 56,
  // Printed a little larger than the sprite, so the name strip reads at the
  // size the board is shown at; the hex edge still shows round it (M7b).
  drawn: 64,
  // The name strip is 52 wide with the roster number boxed off at its left,
  // so this is what is left for the name itself.
  nameBoxLeft: 14,
  nameBoxRight: 53,
  selectedStroke: PALETTE.red,
  selectedStrokeWidth: 3,
  // A man with no AP left stays fully printed; only his die-cut edge goes from
  // ink to grey (ink screened back toward paper), so the board still reads.
  edge: PALETTE.ink,
  spentEdge: '#A39E90',
  nameFill: PALETTE.paper,
  nameSize: 10.5,
  // Glyphs are never stretched to fill the strip — a long name scales down as
  // whole type instead. Roughly the width of one character at font-size 1.
  nameAspect: 0.62,
  numberFill: PALETTE.paper,
  numberText: PALETTE.ink,
  // AP left, one big figure top right, as a wargame counter prints its
  // factors; greyed back when he has none.
  apFill: PALETTE.paper,
  apSize: 16,
  apAt: { x: 47.5, y: 12 },
  apSpentOpacity: 0.4,
  // The man's own face, and his role in the roundel top left.
  chip: { x: 14, y: 6, size: 29 },
  role: { x: 3.5, y: 4, size: 12 },
};

// SPEC.md §11: no smooth easing anywhere. A trooper who moves travels his
// path a hex at a time, quickly, and stops; a blast is revealed in steps.
export const MOTION = {
  travelMsPerHex: 70,
  blastMs: 1500,
};

// Hover path preview. The affordable part of a path and the part beyond this
// turn's AP have to be told apart at a glance — that readout is the whole
// point of hover (SPEC.md §4).
export const PATH = {
  // This turn's move range: a blue tint on each reachable hex, and one
  // continuous line round the outside of the whole area, cased in paper so it
  // reads on both a cream field and a dark wood.
  reachableFill: PALETTE.blue,
  reachableOpacity: 0.3,
  reachableEdgeCasing: PALETTE.paper,
  reachableEdgeCasingWidth: 12,
  reachableEdge: PALETTE.blue,
  reachableEdgeWidth: 6,
  lineStroke: PALETTE.red,
  lineWidth: 5,
  overspendStroke: PALETTE.ink,
  overspendOpacity: 0.45,
  overspendDash: '6 7',
  stepRadius: 10,
  stepFill: PALETTE.paper,
  stepFontSize: 13,
  badgeFill: PALETTE.ink,
  badgeText: PALETTE.paper,
  blockedStroke: PALETTE.red,
};

// ---------------------------------------------------------------------------
// Enemies, vision and alert (SPEC.md §6).

export const ENEMY = {
  labelFill: PALETTE.paper,
  labelSize: 10,
  labelBoxLeft: 4,
  labelBoxRight: 52,
  // The small wedge outside the counter that says which way it is looking.
  facingFill: PALETTE.red,
  facingStroke: PALETTE.ink,
  facingDistance: 33,
  facingSize: 7,
};

export const VISION = {
  fill: PALETTE.red,
  opacity: 0.13,
  hoverOpacity: 0.3,
  edgeCasing: PALETTE.paper,
  edgeCasingWidth: 7,
  edge: PALETTE.red,
  edgeWidth: 3.5,
};

export const ROUTE = {
  casing: PALETTE.paper,
  casingWidth: 6,
  stroke: PALETTE.ink,
  width: 2.5,
  dash: '8 6',
  waypointSize: 9,
};

export const CONTACT = {
  stroke: PALETTE.red,
  width: 3,
  dash: '6 4',
  radius: 30,
  text: PALETTE.red,
};

export const WATCH = {
  stroke: PALETTE.red,
  casing: PALETTE.paper,
  width: 2.5,
  casingWidth: 5,
  dash: '5 5',
};

export const NOISE = {
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 6,
  radius: 24,
  text: PALETTE.ink,
};

export const TARGET = {
  stroke: PALETTE.blue,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 8,
  hearsStroke: PALETTE.red,
  hearsWidth: 3,
};

// A hex the turn report is pointing at, while its line is hovered.
export const HIGHLIGHT = {
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 9,
  radius: 36,
};

export const MARKER = {
  size: 22,
  hiddenOpacity: 0.6,
  groundSize: 26,
};

export const RISK = {
  badgeFill: PALETTE.paper,
  badgeStroke: PALETTE.ink,
  spottedStroke: PALETTE.red,
  pipRadius: 3.2,
  pipGap: 8.5,
  pipFill: PALETTE.ink,
  spottedFill: PALETTE.red,
  shotFill: PALETTE.red,
  pinnedFill: PALETTE.ink,
  shotText: PALETTE.paper,
  // The cross over a hex on the path where he would be spotted.
  crossStroke: PALETTE.red,
  crossCasing: PALETTE.paper,
  crossWidth: 5,
  crossSize: 22,
};

// SPEC.md §7, §10: objectives, their charge hexes, charges burning, blasts
// about to happen, and the exfil.
export const OBJECTIVE = {
  // The footprint outline is faint: the art says where the objective is, the
  // outline only says which hexes count as it.
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 2,
  casingWidth: 5,
  outlineOpacity: 0.35,
  label: PALETTE.ink,
  labelCasing: PALETTE.paper,
  primaryLabel: PALETTE.red,
  labelSize: 16,
  labelLift: 1.02, // hex radii above the top row's centre, clear of the bridge's girders
  ringRadius: 17,
  ringStroke: PALETTE.ink,
  ringDash: '4 3',
  ringOpacity: 0.55,
  ringHoverOpacity: 1,
  ringWidth: 2,
  stampWidth: 110,
  stampHeight: 44,
  stampRotate: -12,
};

// Multi-hex objective art by objective kind (the kind ids in data/rules.json).
// Drawn centred on the footprint at the manifest's size. A kind with no entry
// is drawn as its outline only.
const OBJECTIVE_ART = {
  bridge: { intact: 'objective-rail-bridge', destroyed: 'objective-bridge-destroyed' },
  exchange: { intact: 'objective-exchange', destroyed: 'objective-exchange-destroyed' },
  fuelDump: { intact: 'objective-fuel-dump', destroyed: 'objective-fuel-destroyed' },
};

/** { id, width, height } for an objective as it stands, or null. */
export function objectiveArt(objective) {
  const art = OBJECTIVE_ART[objective.kind];
  if (!art) return null;
  const id = objective.destroyed ? art.destroyed : art.intact;
  const [, , width, height] = SPRITES[id].viewBox.split(' ').map(Number);
  return { id, width, height };
}

export const EXFIL = {
  stroke: PALETTE.green,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 8,
  label: PALETTE.green,
  art: 'objective-rally-point',
};

export const BLAST = {
  fill: PALETTE.red,
  opacity: 0.18,
  stroke: PALETTE.red,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 6,
  previewOpacity: 0.08,
  // The starburst drawn where a charge went off, for a moment after the turn.
  artSize: 150,
};

// The drop (SPEC.md §9).
export const DROP = {
  casing: PALETTE.paper,
  casingWidth: 7,
  stroke: PALETTE.ink,
  width: 3,
  dash: '14 8',
  idleOpacity: 0.45,
  label: PALETTE.ink,
  labelAlong: 0.3,
  // Each run's name is a die-cut tab: click it to pick the run. The run being
  // looked at is printed solid.
  tabFill: PALETTE.paper,
  tabText: PALETTE.ink,
  tabSelectedFill: PALETTE.ink,
  tabSelectedText: PALETTE.paper,
  tabStroke: PALETTE.ink,
  tabStrokeWidth: 3,
  tabShadow: 4,
  tabFontSize: 22,
  tabPadX: 12,
  tabHeight: 34,
  windStroke: PALETTE.blue,
  windWidth: 4,
  windLength: 60,
  windHead: 12,
  jumpRadius: 11,
  jumpFill: PALETTE.paper,
  jumpText: PALETTE.ink,
  areaFill: PALETTE.blue,
  areaOpacity: 0.22,
  areaStroke: PALETTE.blue,
  areaWidth: 3,
};

// The drop shown (SPEC.md §11): a Dakota flies the chosen run's line and each
// man's canopy opens where he jumps, drifts to where the rules put him, and
// collapses into his parachute marker as his counter appears. Display only;
// every landing is decided before it starts. Times in ms.
export const DROP_SHOW = {
  flightMs: 2800,
  runIn: 2.5, // hexes the aircraft flies before the first waypoint and after the last
  aircraftSize: 170,
  aircraftShadow: { x: 34, y: 44, opacity: 0.16 },
  canopySize: 38,
  openMs: 220,
  driftMs: 1300,
  collapseMs: 220,
  shadowStart: 18, // the canopy's shadow starts this far down-right and closes in as it lands
  appearMs: 120,
  tailMs: 350,
};

// Speech bubbles on the board (SPEC.md §11): hand lettering in capitals,
// paper with an ink rule, the tail pointing at the man's counter. Shown for
// the man selected or under the mouse. Smaller than the board's own labels:
// dialogue is colour, not information.
export const SPEECH = {
  font: TYPE.lettering,
  weight: 'bold',
  capitals: true,
  fontSize: 12,
  lineHeight: 15,
  maxWidth: 170, // lines wrap at this width, measured in the face actually used
  padX: 7,
  padY: 5,
  gap: 38, // from the counter's centre to the near edge of the bubble
  tail: 12, // width of the tail where it meets the bubble
  stroke: 2.5,
  fadedOpacity: 0.15, // while the mouse is on the ground under it
};

/**
 * A speech bubble as two paths in its own box (0,0)-(width,height): the body
 * and a tail from its near edge to `tip`, given in the same box. The tail's
 * base sits just inside the body so its paper covers the body's rule there.
 */
export function speechBubble(width, height, tip) {
  const r = 10;
  const body = svg('path', {
    d: `M${r} 0 H${width - r} Q${width} 0 ${width} ${r} V${height - r} Q${width} ${height} ${width - r} ${height} H${r} Q0 ${height} 0 ${height - r} V${r} Q0 0 ${r} 0 Z`,
    class: 'paper', stroke: PALETTE.ink, 'stroke-width': SPEECH.stroke,
  });
  const below = tip.y > height;
  const baseY = below ? height - SPEECH.stroke : SPEECH.stroke;
  const baseX = Math.max(r + SPEECH.tail, Math.min(width - r - SPEECH.tail, tip.x));
  const tail = svg('path', {
    d: `M${baseX - SPEECH.tail / 2} ${baseY} L${tip.x} ${tip.y} L${baseX + SPEECH.tail / 2} ${baseY}`,
    class: 'paper', stroke: PALETTE.ink, 'stroke-width': SPEECH.stroke, 'stroke-linejoin': 'round',
  });
  return [body, tail];
}

// The active state beside the alert dial, keyed by the state ids in
// data/rules.json: a filled chip with paper lettering. Alert's dull red is red
// mixed toward ink, so the two reds stay a step apart.
export const ALERT_STATE = {
  calm: PALETTE.green,
  suspicious: PALETTE.blue,
  alert: '#8C3F38',
  alarmed: PALETTE.red,
  text: PALETTE.paper,
};

// The alert dial's four sectors run clockwise from lower left to lower right,
// like a gauge. Angles are degrees from straight up.
export const DIAL = {
  startAngle: -135,
  sweep: 270,
};

// The 20-turn clock (ART-ASSETS.md ui-dawn-strip): night sky lightening to
// dawn. The ticks and the burnt part are drawn by ui.js from the turn limit.
export const DAWN = {
  tick: PALETTE.ink,
  burnt: PALETTE.ink,
  burntOpacity: 0.55,
  now: PALETTE.red,
};

// ---------------------------------------------------------------------------
// Sprite registry. Ids and viewBoxes are ART-ASSETS.md's, exactly, plus the
// fallbacks for a trooper nobody has drawn yet.

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  for (const child of children) node.appendChild(child);
  return node;
}

// Shorthands for the procedural art below.
const fill = (d, cls, extra = {}) => svg('path', { d, class: cls, ...extra });
const line = (d, width = 2, cls = 'stroke-ink', extra = {}) => svg('path', {
  d, fill: 'none', class: cls, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra,
});
const inked = (d, cls, width = 2) => [fill(d, cls), line(d, width)];
const circle = (cx, cy, r, cls, extra = {}) => svg('circle', { cx, cy, r, class: cls, ...extra });
const ring = (cx, cy, r, width = 2, cls = 'stroke-ink') => svg('circle', { cx, cy, r, fill: 'none', class: cls, 'stroke-width': width });
function label(content, attrs) {
  const node = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': TYPE.typewriter, 'font-weight': 'bold', ...attrs });
  node.textContent = content;
  return node;
}

// --- counters ---------------------------------------------------------------

// Both allied frames are the same die-cut silhouette so the six read as one
// set of chits; only the name strip's colour and the rank flash differ. The
// chit is printed solid army green, so our side reads off the map at a glance
// as the enemy's black does (M7b), with a paper roundel for the role symbol.
// Under it, a sliver of the card's cut edge shows down-right. The soft shadow
// is not part of the frame: it is counter-shadow, drawn under it.
function cardEdge(d) {
  return [fill(d, 'paper', { transform: 'translate(1.8 1.8)' }), line(d, 0.8, 'stroke-ink', { transform: 'translate(1.8 1.8)', opacity: 0.7 })];
}

const ALLIED_OUTLINE = 'M6 1 H48 A5 5 0 0 1 53 6 V48 A5 5 0 0 1 48 53 H6 A5 5 0 0 1 1 48 V6 A5 5 0 0 1 6 1 Z';

function alliedFrame(stripClass, extras = []) {
  return [
    ...cardEdge(ALLIED_OUTLINE),
    fill(ALLIED_OUTLINE, 'green'),
    fill('M1 38 H53 V48 A5 5 0 0 1 48 53 H6 A5 5 0 0 1 1 48 Z', stripClass),
    circle(9.5, 10, 7.5, 'paper'), ring(9.5, 10, 7.5, 1.2),
    ...extras,
    // The die-cut edge takes its colour from --counter-edge, so board.js can
    // grey a spent man's edge without a second frame.
    svg('path', { d: ALLIED_OUTLINE, fill: 'none', class: 'counter-edge', 'stroke-width': 2 }),
  ];
}

// The enemy chit is cut with clipped corners and printed dark: it has to read
// as the other side at a glance, not as a recoloured allied counter.
const ENEMY_OUTLINE = 'M9 1 H45 L53 9 V45 L45 53 H9 L1 45 V9 Z';

// A coal-scuttle helmet, the one shape that says German at counter size.
function helmetPath(x, y, scale) {
  const t = (px, py) => `${x + px * scale} ${y + py * scale}`;
  return `M${t(0, 12)} C${t(0, 4)} ${t(5, 0)} ${t(11, 0)} C${t(17, 0)} ${t(22, 4)} ${t(22, 10)} L${t(25, 13)} L${t(24, 15)} L${t(0, 15)} Z`;
}

function helmet(x, y, scale) {
  const d = helmetPath(x, y, scale);
  return [fill(d, 'paper'), fill(d, toneClass('ink', 20))];
}

// --- the alert dial -----------------------------------------------------------

function dialPoint(angle, radius) {
  const a = (angle - 90) * (Math.PI / 180);
  return { x: 120 + radius * Math.cos(a), y: 120 + radius * Math.sin(a) };
}

function dialSector(from, to, inner, outer, cls) {
  const p1 = dialPoint(from, outer), p2 = dialPoint(to, outer);
  const p3 = dialPoint(to, inner), p4 = dialPoint(from, inner);
  const large = to - from > 180 ? 1 : 0;
  return fill(`M${p1.x} ${p1.y} A${outer} ${outer} 0 ${large} 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${inner} ${inner} 0 ${large} 0 ${p4.x} ${p4.y} Z`, cls);
}

// --- terrain motifs (80 x 92, hex centre at 40,46) ----------------------------

function tuft(x, y, s = 1) {
  return line(`M${x - 3 * s} ${y} L${x - 1 * s} ${y - 6 * s} M${x} ${y} L${x} ${y - 8 * s} M${x + 3 * s} ${y} L${x + 1 * s} ${y - 6 * s}`, 1.2);
}

function bush(x, y, r) {
  const d = `M${x - r} ${y + r * 0.4} C${x - r * 1.2} ${y - r * 0.6} ${x - r * 0.3} ${y - r * 1.2} ${x + r * 0.1} ${y - r * 0.8} C${x + r * 0.7} ${y - r * 1.3} ${x + r * 1.4} ${y - r * 0.2} ${x + r} ${y + r * 0.4} C${x + r * 0.6} ${y + r} ${x - r * 0.6} ${y + r} ${x - r} ${y + r * 0.4} Z`;
  return [fill(d, 'green'), line(d, 1.6)];
}

function treeCrown(x, y, r) {
  const bumps = 7;
  let d = '';
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) d = `M${px.toFixed(1)} ${py.toFixed(1)}`;
    else {
      const m = a - Math.PI / bumps;
      d += ` Q${(x + Math.cos(m) * r * 1.35).toFixed(1)} ${(y + Math.sin(m) * r * 1.35).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
  }
  return [
    fill(d, 'green'), fill(d, toneClass('ink', 50)), line(d, 1.6),
    line(`M${x - r * 0.4} ${y - r * 0.2} Q${x - r * 0.1} ${y - r * 0.55} ${x + r * 0.3} ${y - r * 0.45}`, 1.4, 'stroke-paper', { opacity: 0.4 }),
  ];
}

function appleTree(x, y) {
  return [circle(x, y, 7, 'green'), ring(x, y, 7, 1.4)];
}

function reeds(x, y) {
  return line(`M${x} ${y} L${x - 4} ${y - 9} M${x} ${y} L${x} ${y - 11} M${x} ${y} L${x + 4} ${y - 9}`, 1.4, 'stroke-green');
}

// Few and bold (SPEC.md §11, M7b): one clear shape per hex at most, no shadows,
// no screens. A field is mostly bare paper: only some hexes get a mark at all.
const TERRAIN_SPRITES = {
  'terrain-field-01': () => [line('M26 40 Q40 37 54 40 M22 50 Q40 47 58 50', 1.2, 'stroke-ink', { opacity: 0.22 })],
  'terrain-field-02': () => [tuft(36, 50, 0.9), tuft(48, 56, 0.7)].map((t) => { t.setAttribute('opacity', 0.35); return t; }),
  'terrain-field-03': () => [line('M30 38 L50 58 M40 34 L56 50', 1.2, 'stroke-ink', { opacity: 0.18 })],

  'terrain-hedgerow-01': () => [...bush(12, 46, 8), ...bush(30, 44, 9), ...bush(50, 46, 9), ...bush(68, 44, 8)],
  'terrain-hedgerow-02': () => [...bush(24, 20, 8), ...bush(32, 38, 9), ...bush(42, 56, 9), ...bush(52, 74, 8)],
  'terrain-hedgerow-03': () => [...bush(16, 62, 8), ...bush(32, 50, 9), ...bush(48, 40, 9), ...bush(64, 28, 8)],

  'terrain-wood-01': () => [...treeCrown(30, 36, 14), ...treeCrown(52, 52, 15)],
  'terrain-wood-02': () => [...treeCrown(42, 32, 15), ...treeCrown(30, 58, 13), ...treeCrown(56, 60, 12)],
  'terrain-wood-03': () => [...treeCrown(28, 44, 13), ...treeCrown(50, 34, 13), ...treeCrown(46, 62, 13)],

  'terrain-orchard-01': () => [[28, 34], [52, 34], [28, 58], [52, 58]].flatMap(([x, y]) => appleTree(x, y)),
  'terrain-orchard-02': () => [[40, 30], [24, 50], [56, 50], [40, 68]].flatMap(([x, y]) => appleTree(x, y)),
  'terrain-orchard-03': () => [[32, 32], [54, 40], [26, 56], [48, 64]].flatMap(([x, y]) => appleTree(x, y)),

  'terrain-marsh': () => [
    line('M18 40 H32 M46 56 H62 M24 68 H38', 1.4, 'stroke-blue', { opacity: 0.8 }),
    reeds(26, 38), reeds(54, 54), reeds(32, 66),
  ],

  // One ripple; the water itself is the hex's base colour.
  'terrain-canal': () => [
    line('M28 44 Q34 40 40 44 Q46 48 52 44', 1.4, 'stroke-paper', { opacity: 0.5 }),
  ],
  // The bank along the east edge of the hex; board.js turns it to every edge
  // that faces dry land.
  'terrain-canal-edge': () => [
    fill('M79.8 23 L74 26 L74 66 L79.8 69 Z', 'paper'),
    line('M74 26 L74 66', 1.8),
  ],

  // High ground as the map-maker's hill: two rounded crests, no hachures.
  'terrain-ridge': () => [
    line('M12 58 Q27 32 42 58', 2),
    line('M36 48 Q52 24 68 48', 2),
  ],

  'terrain-farmhouse': () => [
    ...inked('M24 44 H58 V68 H24 Z', 'paper', 1.6),
    ...inked('M20 46 L41 28 L62 46 Z', 'red', 1.6),
    fill('M20 46 L41 28 L62 46 Z', toneClass('ink', 20)),
    ...inked('M49 34 V26 H54 V38', 'paper', 1.4),
    ...inked('M36 56 H44 V68 H36 Z', 'ink', 1),
    ...inked('M27 50 H33 V56 H27 Z', 'blue', 1),
    ...inked('M49 50 H55 V56 H49 Z', 'blue', 1),
  ],

  'terrain-emplacement': () => {
    const bags = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = 40 + Math.cos(a) * 20, y = 48 + Math.sin(a) * 17;
      // Turned in a <g>: the misregistration CSS transform would replace a
      // transform attribute on the coloured shape itself.
      bags.push(svg('g', { transform: `rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})` }, [
        svg('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: 7, ry: 4.5, class: 'paper' }),
        svg('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: 7, ry: 4.5, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.2 }),
      ]));
    }
    return [circle(40, 48, 13, toneClass('ink', 50)), ...bags, line('M40 48 L62 30', 4), circle(40, 48, 4, 'ink')];
  },
};

// --- objectives ---------------------------------------------------------------

function smoke(x, y, s) {
  return [circle(x, y, 9 * s, toneClass('ink', 35)), circle(x + 8 * s, y - 7 * s, 7 * s, toneClass('ink', 20)), circle(x - 6 * s, y - 12 * s, 6 * s, toneClass('ink', 10))];
}

function flame(x, y, s) {
  const d = `M${x - 8 * s} ${y} Q${x - 10 * s} ${y - 14 * s} ${x - 2 * s} ${y - 24 * s} Q${x} ${y - 14 * s} ${x + 4 * s} ${y - 18 * s} Q${x + 12 * s} ${y - 8 * s} ${x + 8 * s} ${y} Z`;
  return [...inked(d, 'red', 1.4), fill(`M${x - 4 * s} ${y} Q${x - 4 * s} ${y - 8 * s} ${x} ${y - 12 * s} Q${x + 5 * s} ${y - 6 * s} ${x + 4 * s} ${y} Z`, 'paper')];
}

// A fuel drum seen from above: a disc and its filler cap.
function drum(x, y, cls = 'green') {
  return [circle(x, y, 7, cls), ring(x, y, 7, 1.6), circle(x + 2.5, y - 2.5, 1.4, 'ink')];
}

function pole(x, y, h) {
  return [line(`M${x} ${y} V${y - h} M${x - 7} ${y - h + 4} H${x + 7}`, 2.4)];
}

// A telephone exchange building, front on, used intact and gutted: white
// walls, a slate roof, two rows of windows and the PTT board over the door.
function exchangeBuilding(gutted) {
  const walls = 'M46 84 H138 V150 H46 Z';
  const parts = [...inked(walls, 'paper', 2.4)];
  if (gutted) {
    parts.push(fill(walls, 'ink', { 'fill-opacity': 0.35 }));
    parts.push(line('M46 84 L62 74 L74 86 L92 66 L106 84 L122 70 L138 84', 2.4));
  } else {
    parts.push(...inked('M40 86 L92 58 L144 86 Z', 'blue', 2.4));
    parts.push(...inked('M112 70 V58 H120 V74', 'paper', 2));
  }
  for (const x of [58, 86, 114]) {
    for (const y of [96, 120]) parts.push(...inked(`M${x} ${y} h12 v14 h-12 Z`, gutted ? 'ink' : 'blue', 1.6));
  }
  parts.push(...inked('M84 134 h16 v16 h-16 Z', 'ink', 1.6));
  if (!gutted) {
    parts.push(...inked('M70 88 H114 V94 H70 Z', 'paper', 1.2));
    parts.push(label('PTT', { x: 92, y: 91.2, 'font-size': 6.5, class: 'ink' }));
  }
  return parts;
}

// The village church, the landmark Vance's landing line refers to (SPEC.md §11).
function church() {
  return [
    ...inked('M18 50 H58 V80 H18 Z', 'paper', 2),
    ...inked('M14 52 L38 40 L62 52 Z', 'red', 2),
    ...inked('M20 26 H32 V80 H20 Z', 'paper', 2),
    ...inked('M18 28 L26 2 L34 28 Z', 'blue', 2),
    line('M26 2 V-6 M22 -3 H30', 1.8),
    ...inked('M23 60 a3 3 0 0 1 6 0 v8 h-6 Z', 'ink', 1),
    ...inked('M40 60 a3 3 0 0 1 6 0 v8 h-6 Z', 'blue', 1.2),
  ];
}

// --- portraits ----------------------------------------------------------------
// ART-ASSETS.md §2: head and shoulders for the roster rail (240 x 300) and a
// silhouette chip for the counter (32 x 32). Built from one parametric head:
// each man's entry below says only what sets him apart. A trooper with no
// entry gets the fallback, so a seventh man is still one JSON entry.

const FACES = {
  holloway: { faceW: 46, jawW: 36, brows: 7, moustache: true, mouth: 'set', chevrons: true, shade: 20 },
  fitch: { faceW: 42, jawW: 30, ears: 10, mouth: 'grin', freckles: true, cigarette: true },
  vance: { faceW: 40, jawW: 28, eyes: 'squint', mouth: 'set', net: true, binoculars: true },
  barrow: { faceW: 44, jawW: 32, ears: 11, mouth: 'open', twig: true },
  speers: { faceW: 45, jawW: 35, stubble: true, scar: true, scarf: true, mouth: 'set', brows: 5 },
  nunn: { faceW: 54, jawW: 48, brows: 8, nose: 'broken', neck: 30, mouth: 'set', shade: 20 },
};

const CHIPS = {
  holloway: 'moustache',
  fitch: 'cigarette',
  vance: 'net',
  barrow: 'twig',
  speers: 'scarf',
  nunn: 'broad',
};

// Printed flat, not screened (M7b): each tone is its spot colour at an
// opacity, lit from the left by the moon, with a heavy ink line round it.
function portrait(id, f = {}) {
  const cx = 120;
  const faceW = f.faceW ?? 44, jawW = f.jawW ?? 32, chinY = 214, neck = f.neck ?? 22;
  const shade = (d) => fill(d, 'ink', { 'fill-opacity': 0.16 + (f.shade ?? 0) / 200 });
  const parts = [
    svg('rect', { x: 0, y: 0, width: 240, height: 300, class: 'blue' }),
    // Moonlight behind his head, so the silhouette reads at thumbnail size.
    circle(104, 128, 104, 'paper', { 'fill-opacity': 0.22 }),
  ];
  // Shoulders in a Denison smock, its camouflage in flat brush patches.
  const smock = 'M10 300 C14 246 56 224 98 218 L142 218 C184 224 226 246 230 300 Z';
  parts.push(fill(smock, 'green'));
  parts.push(fill('M40 262 Q60 240 88 250 Q92 270 66 280 Q44 284 40 262 Z M150 248 Q180 236 196 260 Q190 280 164 274 Q146 266 150 248 Z M100 280 Q120 266 140 284 L136 300 H104 Z', 'ink', { 'fill-opacity': 0.3 }));
  parts.push(fill('M150 222 C190 232 222 252 230 300 H160 Z', 'ink', { 'fill-opacity': 0.18 }));
  parts.push(line(smock, 4));
  if (f.chevrons) {
    for (let i = 0; i < 3; i++) parts.push(line(`M34 ${258 + i * 11} L48 ${248 + i * 11} L62 ${258 + i * 11}`, 5.5, 'stroke-leader'));
  }
  if (f.scarf) parts.push(...inked(`M${cx - neck - 16} 224 Q${cx} 250 ${cx + neck + 16} 224 L${cx + neck + 10} 244 Q${cx} 262 ${cx - neck - 10} 244 Z`, 'blue', 3));
  // Neck.
  parts.push(...inked(`M${cx - neck} 196 L${cx - neck} 230 Q${cx} 242 ${cx + neck} 230 L${cx + neck} 196 Z`, 'paper', 3.5));
  parts.push(shade(`M${cx - neck} 200 L${cx - neck} 230 Q${cx} 242 ${cx + neck} 230 L${cx + neck} 214 Z`));
  if (f.binoculars) {
    parts.push(line(`M${cx - neck} 228 L${cx - 18} 250 M${cx + neck} 228 L${cx + 18} 250`, 3));
    parts.push(...inked('M92 248 h24 v34 h-24 Z', 'ink', 2), ...inked('M124 248 h24 v34 h-24 Z', 'ink', 2));
    parts.push(svg('rect', { x: 114, y: 256, width: 12, height: 8, class: 'ink' }));
  }
  // Ears, behind the face.
  const earR = f.ears ?? 7;
  for (const side of [-1, 1]) {
    const x = cx + side * (faceW + 2);
    parts.push(svg('ellipse', { cx: x, cy: 150, rx: earR, ry: 13, class: 'paper' }));
    parts.push(svg('ellipse', { cx: x, cy: 150, rx: earR, ry: 13, fill: 'none', class: 'stroke-ink', 'stroke-width': 3.5 }));
  }
  // Face: paper warmed a touch, the right side in shadow, and burnt cork
  // smudged across the cheeks for the night.
  const face = `M${cx - faceW} 112 C${cx - faceW} 180 ${cx - jawW} ${chinY - 12} ${cx} ${chinY} C${cx + jawW} ${chinY - 12} ${cx + faceW} 180 ${cx + faceW} 112 Z`;
  parts.push(fill(face, 'paper'));
  parts.push(fill(face, 'red', { 'fill-opacity': 0.1 }));
  parts.push(shade(`M${cx + 8} 112 C${cx + 14} 150 ${cx + 4} 190 ${cx + 8} ${chinY - 2} C${cx + jawW} ${chinY - 12} ${cx + faceW} 180 ${cx + faceW} 112 Z`));
  parts.push(fill(`M${cx - faceW + 6} 166 Q${cx - 24} 158 ${cx - 12} 170 Q${cx - 26} 176 ${cx - faceW + 8} 178 Z M${cx + faceW - 6} 166 Q${cx + 24} 158 ${cx + 12} 170 Q${cx + 26} 176 ${cx + faceW - 8} 178 Z`, 'ink', { 'fill-opacity': 0.13 }));
  if (f.stubble) parts.push(fill(`M${cx - jawW - 6} 176 C${cx - jawW} 200 ${cx - 10} ${chinY} ${cx} ${chinY} C${cx + 10} ${chinY} ${cx + jawW} 200 ${cx + jawW + 6} 176 Q${cx} 196 ${cx - jawW - 6} 176 Z`, 'ink', { 'fill-opacity': 0.3 }));
  parts.push(line(face, 3.5));
  // Eyes and brows.
  const browW = f.brows ?? 4.5;
  parts.push(line(`M${cx - 33} 141 Q${cx - 22} 136 ${cx - 10} 139 M${cx + 10} 139 Q${cx + 22} 136 ${cx + 33} 141`, browW));
  if (f.eyes === 'squint') parts.push(line(`M${cx - 29} 154 L${cx - 11} 152 M${cx + 11} 152 L${cx + 29} 154`, 3.5));
  else {
    for (const side of [-1, 1]) {
      const x = cx + side * 19;
      parts.push(svg('ellipse', { cx: x, cy: 154, rx: 7, ry: 4, class: 'paper' }));
      parts.push(circle(x + 1, 154, 3, 'ink'));
      parts.push(line(`M${x - 8} 153 Q${x} 147 ${x + 8} 153`, 3));
    }
  }
  // Nose.
  parts.push(line(f.nose === 'broken' ? `M${cx} 150 L${cx + 7} 164 L${cx - 6} 182 L${cx + 6} 185` : `M${cx + 2} 150 L${cx - 6} 181 L${cx + 6} 184`, 3.5));
  // Mouth, and what is around it.
  if (f.moustache) parts.push(fill(`M${cx - 28} 198 Q${cx - 18} 180 ${cx} 186 Q${cx + 18} 180 ${cx + 28} 198 Q${cx + 12} 192 ${cx} 197 Q${cx - 12} 192 ${cx - 28} 198 Z`, 'ink'));
  const mouth = {
    set: `M${cx - 12} 199 L${cx + 12} 199`,
    grin: `M${cx - 18} 194 Q${cx} 212 ${cx + 18} 194`,
    open: `M${cx - 9} 197 Q${cx} 208 ${cx + 9} 197 Z`,
  }[f.mouth ?? 'set'];
  parts.push(line(mouth, 3.5));
  if (f.cigarette) parts.push(line(`M${cx + 14} 200 L${cx + 38} 209`, 6, 'stroke-ink'), line(`M${cx + 14} 200 L${cx + 38} 209`, 3.5, 'stroke-paper'), circle(cx + 39, 209.5, 3, 'red'));
  if (f.freckles) for (const [x, y] of [[-24, 170], [-18, 176], [-28, 177], [22, 172], [28, 177], [18, 178]]) parts.push(circle(cx + x, y, 1.8, 'ink'));
  if (f.scar) parts.push(line(`M${cx + 26} 158 L${cx + 34} 188`, 2.6, 'stroke-red'));
  // The para helmet, rimless, shaded on the right, and its chin strap.
  const hw = faceW + 13;
  const helm = `M${cx - hw} 132 C${cx - hw - 4} 52 ${cx + hw + 4} 52 ${cx + hw} 132 Q${cx} 116 ${cx - hw} 132 Z`;
  parts.push(fill(helm, 'green'));
  parts.push(fill(`M${cx + 10} 58 C${cx + hw} 60 ${cx + hw + 4} 100 ${cx + hw} 132 Q${cx + 30} 122 ${cx + 12} 121 Z`, 'ink', { 'fill-opacity': 0.25 }));
  if (f.net) {
    let net = '';
    for (let i = -6; i <= 6; i++) net += `M${cx + i * 12 - 30} 56 L${cx + i * 12 + 30} 134 M${cx + i * 12 + 30} 56 L${cx + i * 12 - 30} 134 `;
    const clipId = `${id}-helmet-clip`;
    parts.push(svg('clipPath', { id: clipId }, [fill(helm, 'ink')]));
    parts.push(line(net, 1.8, 'stroke-ink', { 'clip-path': `url(#${clipId})` }));
  }
  parts.push(line(`M${cx - hw + 16} 84 Q${cx - 22} 62 ${cx + 2} 64`, 5, 'stroke-paper', { opacity: 0.6 }));
  parts.push(line(helm, 4));
  parts.push(line(`M${cx - faceW + 4} 128 L${cx - jawW + 2} ${chinY - 14} Q${cx} ${chinY + 6} ${cx + jawW - 2} ${chinY - 14} L${cx + faceW - 4} 128`, 2.6, 'stroke-ink', { opacity: 0.85 }));
  if (f.twig) {
    parts.push(line(`M${cx + 20} 76 L${cx + 44} 20 M${cx + 34} 44 L${cx + 58} 32 M${cx + 38} 34 L${cx + 26} 18`, 4));
    for (const [x, y] of [[44, 16], [60, 28], [24, 14], [52, 42]]) {
      parts.push(svg('g', { transform: `rotate(-30 ${cx + x} ${y})` }, [
        svg('ellipse', { cx: cx + x, cy: y, rx: 8, ry: 4.5, class: 'green' }),
        svg('ellipse', { cx: cx + x, cy: y, rx: 8, ry: 4.5, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
      ]));
    }
  }
  parts.push(svg('rect', { x: 1.5, y: 1.5, width: 237, height: 297, fill: 'none', class: 'stroke-ink', 'stroke-width': 3 }));
  return parts;
}

function chip(id, feature) {
  const helm = 'M3 17 C2 3 30 3 29 17 Q16 13 3 17 Z';
  const faceW = feature === 'broad' ? 11 : 8.5;
  const face = `M${16 - faceW} 15 C${16 - faceW} 26 ${16 - faceW / 2} 30 16 30 C${16 + faceW / 2} 30 ${16 + faceW} 26 ${16 + faceW} 15 Z`;
  const parts = [...inked(face, 'paper', 1.4), fill(face, toneClass('red', 10))];
  parts.push(circle(12.5, 20, 1.1, 'ink'), circle(19.5, 20, 1.1, 'ink'));
  if (feature === 'moustache') parts.push(fill('M11 25.5 Q16 22.5 21 25.5 Q16 24.5 11 25.5 Z', 'ink', { 'stroke-width': 1.6, class: 'ink stroke-ink' }));
  if (feature === 'cigarette') parts.push(line('M18 26 L25 28', 2, 'stroke-paper'), line('M18 26 L25 28', 0.6), circle(25.5, 28.2, 1.1, 'red'));
  if (feature === 'scarf') parts.push(...inked('M8 28 Q16 33 24 28 L24 31.5 Q16 35 8 31.5 Z', 'blue', 1));
  parts.push(...inked(helm, 'green', 1.6), fill(helm, toneClass('ink', 35)));
  if (feature === 'net') parts.push(line('M7 7 L13 15 M13 5 L19 15 M19 5 L25 15 M25 7 L19 15 M19 5 L13 15 M13 5 L7 13', 0.8));
  if (feature === 'twig') parts.push(line('M20 7 L26 0 M23 3 L29 3', 1.6), circle(27, 0.5, 1.6, 'green'), circle(29.5, 3, 1.5, 'green'));
  return parts;
}

function fallbackPortrait() {
  const parts = portrait('portrait-fallback-full', { mouth: 'set' });
  parts.push(label('?', { x: 120, y: 280, 'font-size': 30, class: 'paper' }));
  return parts;
}

// --- chrome -------------------------------------------------------------------

// The bridge's stone abutments on either bank, and the track across its
// deck, drawn to match the railway either side (RAIL, board.js).
function bridgeAbutments() {
  return [84, 180].flatMap((x) => [
    ...inked(`M${x} 30 h16 v36 h-16 Z`, 'paper', 2.2),
    line(`M${x} 42 h16 M${x} 54 h16 M${x + 8} 30 v12 M${x + 5} 42 v12 M${x + 11} 54 v12`, 1.2),
  ]);
}

function bridgeTrack(from, to) {
  const sleepers = [];
  for (let x = from + 4; x < to - 2; x += 8) sleepers.push(`M${x} 41.5 V54.5`);
  return [line(sleepers.join(' '), 2.2, 'stroke-ink', { 'stroke-linecap': 'butt' }), line(`M${from} 45.5 H${to} M${from} 50.5 H${to}`, 1.6)];
}

function starburst(cx, cy, points, outer, inner, cls, extra = {}) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer * (i % 4 === 0 ? 1 : 0.86) : inner;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  return fill(`${d}Z`, cls, extra);
}

const SPRITES = {
  // --- counters and symbols (ART-ASSETS.md §3) ---
  'counter-frame-allied': { viewBox: '0 0 56 56', draw: () => alliedFrame('ink') },

  // The ranking man: leader-blue name strip, plus a sergeant's three chevrons
  // down the left margin under his role, clear of his face and his AP.
  'counter-frame-allied-leader': {
    viewBox: '0 0 56 56',
    draw: () => {
      const chevrons = 'M5.5 23 L9.5 19.5 L13.5 23 M5.5 28.5 L9.5 25 L13.5 28.5 M5.5 34 L9.5 30.5 L13.5 34';
      return alliedFrame('leader', [line(chevrons, 3.6, 'stroke-paper'), line(chevrons, 1.8, 'stroke-leader')]);
    },
  },

  // A soft shadow under every counter, down-right, as if the chit is lifted
  // off the page (SPEC.md §11, M7b). Soft without an SVG filter: a stack of
  // faint rounded squares, each a little bigger than the last.
  'counter-shadow': {
    viewBox: '0 0 56 56',
    draw: () => Array.from({ length: 6 }, (_, i) => {
      const grow = i * 1.6;
      return svg('rect', {
        x: 5 - grow, y: 6 - grow, width: 50 + grow * 2, height: 50 + grow * 2, rx: 6 + grow,
        class: 'ink', 'fill-opacity': 0.11,
      });
    }),
  },

  'symbol-sapper': {
    viewBox: '0 0 24 24',
    draw: () => [
      svg('rect', { x: 4, y: 12, width: 16, height: 9, rx: 1.5, class: 'ink' }),
      svg('rect', { x: 10.5, y: 5, width: 3, height: 8, class: 'ink' }),
      svg('rect', { x: 5, y: 2, width: 14, height: 3.5, rx: 1.5, class: 'ink' }),
    ],
  },
  'symbol-scout': {
    viewBox: '0 0 24 24',
    draw: () => [
      svg('rect', { x: 9, y: 9, width: 6, height: 4, class: 'ink' }),
      svg('rect', { x: 3, y: 5, width: 6, height: 4, rx: 1, class: 'ink' }),
      svg('rect', { x: 15, y: 5, width: 6, height: 4, rx: 1, class: 'ink' }),
      circle(6.5, 14, 4.5, 'ink'),
      circle(17.5, 14, 4.5, 'ink'),
    ],
  },
  'symbol-gunner': {
    viewBox: '0 0 24 24',
    draw: () => [
      svg('rect', { x: 2, y: 10, width: 18, height: 3, class: 'ink' }),
      svg('rect', { x: 10, y: 3, width: 3.5, height: 7, class: 'ink' }),
      fill('M18 13 L22 13 L18 19 Z', 'ink'),
      line('M6 13 L3 20 M6 13 L9 20', 1.6),
    ],
  },

  'counter-frame-enemy': {
    viewBox: '0 0 56 56',
    draw: () => [
      ...cardEdge(ENEMY_OUTLINE),
      fill(ENEMY_OUTLINE, 'ink'),
      fill('M1 38 H53 V45 L45 53 H9 L1 45 Z', 'red'),
      fill('M1 38 H53 V45 L45 53 H9 L1 45 Z', toneClass('ink', 20)),
      line(ENEMY_OUTLINE, 1, 'stroke-paper', { transform: 'translate(27 27) scale(0.9) translate(-27 -27)' }),
      line(ENEMY_OUTLINE, 2),
    ],
  },

  'counter-enemy-sentry': {
    viewBox: '0 0 56 56',
    draw: () => [
      ...helmet(12, 13, 1.1),
      svg('rect', { x: 40, y: 10, width: 4, height: 24, class: 'paper' }),
      svg('rect', { x: 36, y: 10, width: 12, height: 4, class: 'paper' }),
    ],
  },
  'counter-enemy-patrol': { viewBox: '0 0 56 56', draw: () => [...helmet(6, 11, 0.85), ...helmet(26, 19, 0.85)] },
  'counter-enemy-reserve': { viewBox: '0 0 56 56', draw: () => [...helmet(4, 8, 0.7), ...helmet(29, 8, 0.7), ...helmet(16, 22, 0.7)] },

  // --- the six (ART-ASSETS.md §2) ---
  ...Object.fromEntries(Object.entries(FACES).map(([name, face]) => [`portrait-${name}-full`, {
    viewBox: '0 0 240 300', draw: () => portrait(`portrait-${name}-full`, face),
  }])),
  ...Object.fromEntries(Object.entries(CHIPS).map(([name, feature]) => [`portrait-${name}-chip`, {
    viewBox: '0 0 32 32', draw: () => chip(`portrait-${name}-chip`, feature),
  }])),
  'portrait-fallback-full': { viewBox: '0 0 240 300', draw: fallbackPortrait },
  'portrait-fallback-chip': { viewBox: '0 0 32 32', draw: () => chip('portrait-fallback-chip', null) },

  // --- terrain (ART-ASSETS.md §4) ---
  ...Object.fromEntries(Object.entries(TERRAIN_SPRITES).map(([id, draw]) => [id, { viewBox: '0 0 80 92', draw }])),

  // --- objectives (ART-ASSETS.md §5) ---
  // Three hexes wide across the canal: water under the middle, a girder span
  // on stone abutments.
  // The girder span over the canal, on stone abutments, carrying the railway
  // (drawn by board.js either side of it) on its deck.
  'objective-rail-bridge': {
    viewBox: '0 0 280 92',
    draw: () => [
      fill('M100 0 H180 V92 H100 Z', 'blue'),
      line('M100 0 V92 M180 0 V92', 2),
      ...bridgeAbutments(),
      ...inked('M52 38 H228 V58 H52 Z', 'paper', 2.6),
      ...bridgeTrack(52, 228),
      // The girders, side on: a heavy top chord and the Warren web under it.
      line('M60 38 L78 12 H202 L220 38', 4),
      line('M78 12 L98 38 L118 12 L138 38 L158 12 L178 38 L198 12 L220 38 M60 38 L78 12', 2.4),
    ],
  },
  'objective-bridge-destroyed': {
    viewBox: '0 0 280 92',
    draw: () => [
      fill('M100 0 H180 V92 H100 Z', 'blue'),
      line('M100 0 V92 M180 0 V92', 2),
      ...bridgeAbutments(),
      ...inked('M52 38 H104 L112 50 L100 58 H52 Z', 'paper', 2.6),
      ...inked('M228 38 H178 L168 46 L180 58 H228 Z', 'paper', 2.6),
      ...bridgeTrack(52, 100),
      ...bridgeTrack(182, 228),
      // The fallen span, half in the water.
      ...inked('M116 40 L166 66 L158 78 L108 52 Z', 'ink', 2),
      line('M100 40 L122 14 M176 44 L156 18', 3),
      ...smoke(140, 24, 1.2),
    ],
  },
  'objective-exchange': {
    viewBox: '0 0 160 184',
    draw: () => [
      ...exchangeBuilding(false),
      svg('g', { transform: 'translate(-2 72) scale(0.9)' }, church()),
      ...pole(150, 150, 58), ...pole(150, 72, 40),
      // Wires away east, off the edge of the art: the line the scouts can cut.
      line('M143 96 Q152 104 172 100 M157 96 Q166 102 186 96 M143 36 Q156 44 176 40 M157 36 Q168 42 188 36', 1.3),
    ],
  },
  'objective-exchange-destroyed': {
    viewBox: '0 0 160 184',
    draw: () => [
      ...exchangeBuilding(true),
      svg('g', { transform: 'translate(-2 72) scale(0.9)' }, church()),
      line('M146 150 L120 116 M140 124 L156 112', 2.4),
      ...smoke(96, 58, 1.2), ...flame(112, 80, 0.8),
    ],
  },
  // Drums in rows under a camouflage net, seen from above, and a bowser beside.
  'objective-fuel-dump': {
    viewBox: '0 0 240 184',
    draw: () => [
      fill('M28 62 L134 50 L148 150 L40 160 Z', 'green', { 'fill-opacity': 0.3 }),
      ...[[48, 74], [66, 72], [84, 70], [102, 68], [120, 66],
        [50, 94], [68, 92], [86, 90], [104, 88], [122, 86],
        [52, 114], [70, 112], [88, 110], [106, 108], [124, 106],
        [54, 134], [72, 132], [90, 130], [108, 128], [126, 126]]
        .flatMap(([x, y], i) => drum(x, y, i % 7 === 3 ? 'red' : 'green')),
      line('M28 62 L134 50 L148 150 L40 160 Z', 2, 'stroke-ink', { 'stroke-dasharray': '6 4' }),
      // The bowser: cab and tank, nose to the road.
      ...inked('M166 72 H194 V150 H166 Z', 'green', 2.4),
      ...inked('M168 150 H192 V168 H168 Z', 'green', 2.4),
      ...inked('M171 154 H189 V160 H171 Z', 'blue', 1.4),
      line('M166 96 H194 M166 124 H194', 1.6),
    ],
  },
  'objective-fuel-destroyed': {
    viewBox: '0 0 240 184',
    draw: () => [
      fill('M24 150 Q60 50 140 64 Q200 70 214 156 Z', 'ink', { 'fill-opacity': 0.35 }),
      ...[[60, 120], [92, 132], [124, 116], [74, 146]].flatMap(([x, y]) => drum(x, y, 'ink')),
      ...inked('M166 96 H194 V160 H166 Z', 'ink', 2.4),
      ...flame(70, 110, 1.4), ...flame(108, 100, 1.1), ...flame(150, 118, 1.1),
      ...smoke(90, 56, 1.6), ...smoke(146, 46, 1.3),
    ],
  },
  // The exfil barn at the edge of the fields.
  'objective-rally-point': {
    viewBox: '0 0 80 92',
    draw: () => [
      fill('M20 42 H62 V70 H20 Z', 'ink', { transform: 'translate(2 2)', 'fill-opacity': 0.5 }),
      ...inked('M20 42 H62 V70 H20 Z', 'paper', 1.6), fill('M20 42 H62 V70 H20 Z', toneClass('red', 20)),
      ...inked('M16 44 L41 26 L66 44 Z', 'ink', 1.6),
      ...inked('M33 52 H49 V70 H33 Z', 'green', 1.4),
      line('M33 52 L49 70 M49 52 L33 70', 1.2),
    ],
  },
  'landmark-church': { viewBox: '0 0 80 92', draw: () => [svg('g', { transform: 'translate(2 8)' }, church())] },

  // --- the drop shown (ART-ASSETS.md §6) ---
  // A C-47 Dakota from above, nose to the east (+x): board.js turns it to the
  // run's heading. Olive drab with the invasion stripes on the wings and
  // fuselage, which is what says June 1944 at a glance.
  'aircraft-dakota': {
    viewBox: '0 0 120 120',
    draw: () => {
      const wings = 'M50 60 L56 6 Q60 2 64 6 L70 58 L70 62 L64 114 Q60 118 56 114 L50 62 Z';
      const body = 'M14 56 Q12 60 14 64 L96 64 Q112 62 114 60 Q112 58 96 56 Z';
      const tail = 'M18 60 L10 42 Q13 38 17 42 L26 58 L26 62 L17 78 Q13 82 10 78 Z';
      const stripes = svg('clipPath', { id: 'aircraft-dakota-wing-clip' }, [fill(wings, 'ink')]);
      const fuselageStripes = svg('clipPath', { id: 'aircraft-dakota-body-clip' }, [fill(body, 'ink')]);
      return [
        stripes, fuselageStripes,
        ...inked(tail, 'green', 2),
        fill(wings, 'green'),
        svg('g', { 'clip-path': 'url(#aircraft-dakota-wing-clip)' }, [
          svg('rect', { x: 48, y: 0, width: 26, height: 120, class: 'paper' }),
          svg('rect', { x: 52, y: 0, width: 4, height: 120, class: 'ink' }),
          svg('rect', { x: 60, y: 0, width: 4, height: 120, class: 'ink' }),
          svg('rect', { x: 68, y: 0, width: 4, height: 120, class: 'ink' }),
        ]),
        line(wings, 2.2),
        fill(body, 'green'),
        svg('g', { 'clip-path': 'url(#aircraft-dakota-body-clip)' }, [
          svg('rect', { x: 30, y: 50, width: 16, height: 20, class: 'paper' }),
          svg('rect', { x: 33, y: 50, width: 3, height: 20, class: 'ink' }),
          svg('rect', { x: 40, y: 50, width: 3, height: 20, class: 'ink' }),
        ]),
        line(body, 2.2),
        // Engines on the wings, the cockpit glazing.
        ...inked('M66 36 h16 q3 0 3 3 v2 q0 3 -3 3 h-16 Z', 'green', 2),
        ...inked('M66 76 h16 q3 0 3 3 v2 q0 3 -3 3 h-16 Z', 'green', 2),
        line('M86 36 V44 M86 76 V84', 2.6),
        fill('M100 57.5 Q108 58 110 60 Q108 62 100 62.5 Z', 'blue'),
      ];
    },
  },
  // The aircraft's and a canopy's shadows on the ground: flat ink silhouettes,
  // printed faint by board.js.
  'aircraft-dakota-shadow': {
    viewBox: '0 0 120 120',
    draw: () => [fill('M50 60 L56 6 Q60 2 64 6 L70 58 L70 62 L64 114 Q60 118 56 114 L50 62 Z M14 56 Q12 60 14 64 L96 64 Q112 62 114 60 Q112 58 96 56 Z M18 60 L10 42 Q13 38 17 42 L26 58 L26 62 L17 78 Q13 82 10 78 Z', 'ink')],
  },
  'parachute-canopy-shadow': { viewBox: '0 0 40 40', draw: () => [circle(20, 20, 18, 'ink')] },
  // An open canopy seen from above: eight gores, alternate ones printed in
  // green, round a vent. The man is under it and out of sight.
  'parachute-canopy': {
    viewBox: '0 0 40 40',
    draw: () => {
      const parts = [circle(20, 20, 18, 'paper')];
      for (let i = 0; i < 8; i += 2) {
        const a1 = (i / 8) * Math.PI * 2, a2 = ((i + 1) / 8) * Math.PI * 2;
        parts.push(fill(`M20 20 L${(20 + Math.cos(a1) * 18).toFixed(2)} ${(20 + Math.sin(a1) * 18).toFixed(2)} A18 18 0 0 1 ${(20 + Math.cos(a2) * 18).toFixed(2)} ${(20 + Math.sin(a2) * 18).toFixed(2)} Z`, 'green'));
      }
      let gores = '';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        gores += `M20 20 L${(20 + Math.cos(a) * 18).toFixed(2)} ${(20 + Math.sin(a) * 18).toFixed(2)} `;
      }
      parts.push(line(gores, 1.2), ring(20, 20, 18, 2), circle(20, 20, 3, 'paper'), ring(20, 20, 3, 1.2));
      return parts;
    },
  },

  // --- markers (ART-ASSETS.md §6) ---
  'marker-spotted': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'red'),
      ring(14, 14, 12),
      svg('rect', { x: 12, y: 6, width: 4, height: 10, rx: 1, class: 'paper' }),
      circle(14, 20.5, 2.2, 'paper'),
    ],
  },
  'marker-wounded': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'paper'),
      svg('rect', { x: 11, y: 5, width: 6, height: 18, class: 'red' }),
      svg('rect', { x: 5, y: 11, width: 18, height: 6, class: 'red' }),
      ring(14, 14, 12),
    ],
  },
  'marker-suppressed': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'paper'),
      line('M8 8 L12 15 M14 6 L14 15 M20 8 L16 15', 2.4),
      svg('rect', { x: 6, y: 17, width: 16, height: 4, class: 'ink' }),
      ring(14, 14, 12),
    ],
  },
  'marker-hidden': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'green'),
      line('M6 13 Q14 21 22 13', 2.4, 'stroke-paper'),
      line('M9 17 L7.5 20 M14 18.5 L14 22 M19 17 L20.5 20', 1.8, 'stroke-paper'),
      ring(14, 14, 12),
    ],
  },
  'marker-body': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('rect', { x: 2, y: 2, width: 24, height: 24, rx: 3, class: 'paper' }),
      svg('rect', { x: 12.5, y: 5, width: 3, height: 19, class: 'ink' }),
      svg('rect', { x: 7, y: 10, width: 14, height: 3, class: 'ink' }),
      fill('M6 24 Q14 14 22 24 Z', 'green'),
      svg('rect', { x: 2, y: 2, width: 24, height: 24, rx: 3, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },
  // A fallen enemy (SPEC.md §4 Kill): his helmet tipped over on red ground —
  // the enemy's colour, so it never reads as one of ours.
  'marker-body-enemy': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('rect', { x: 2, y: 2, width: 24, height: 24, rx: 3, class: 'paper' }),
      fill('M4 24 Q14 15 24 24 Z', 'red'),
      fill(helmetPath(0, 0, 0.64), 'ink', { transform: 'translate(14 14) rotate(-24) translate(-8 -5)' }),
      svg('rect', { x: 2, y: 2, width: 24, height: 24, rx: 3, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },
  // On the counter of an enemy that cannot be killed (SPEC.md §4 Kill, §6
  // Exfil watched): a gunsight struck through.
  'marker-no-kill': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'paper'),
      ring(14, 14, 6.5),
      line('M14 4 V10 M14 18 V24 M4 14 H10 M18 14 H24', 2),
      line('M6.5 6.5 L21.5 21.5', 3.2, 'stroke-red'),
      ring(14, 14, 12),
    ],
  },
  // A spent canopy crumpled on the ground, cords to the harness — kit left
  // behind, not a chute in the air.
  'marker-parachute': {
    viewBox: '0 0 28 28',
    draw: () => {
      const canopy = 'M3 16 C4 9 10 6 15 8 C19 5 25 8 25 13 C26 17 22 19 18 18 C14 21 7 21 3 16 Z';
      return [
        fill(canopy, 'paper'), fill(canopy, toneClass('green', 20)),
        line('M8 11 C10 14 9 17 7 19 M14 9 C15 13 14 16 13 20 M20 8 C20 12 21 15 19 18', 1.2),
        line(canopy, 2),
        line('M9 20 L14 25 M14 20 L15 25 M19 18 L16 25', 1.2),
        svg('rect', { x: 12, y: 23, width: 6, height: 4, rx: 1, class: 'green' }),
        svg('rect', { x: 12, y: 23, width: 6, height: 4, rx: 1, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.5 }),
      ];
    },
  },
  'marker-charge': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('rect', { x: 4, y: 10, width: 20, height: 14, rx: 2, class: 'green' }),
      svg('rect', { x: 4, y: 10, width: 20, height: 5, class: toneClass('ink', 50) }),
      line('M14 10 C14 5 19 6 20 3', 2),
      circle(20.5, 3, 2, 'red'),
      svg('rect', { x: 4, y: 10, width: 20, height: 14, rx: 2, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },
  // Fuse tokens: turns left before the charge goes off, typed in a paper disc
  // with a red rim. 1 is the red one.
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`marker-fuse-${n}`, {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, n === 1 ? 'red' : 'paper'),
      ring(14, 14, 12, 3, 'stroke-red'),
      label(String(n), { x: 14, y: 15, 'font-size': 18, class: n === 1 ? 'paper' : 'ink' }),
    ],
  }])),
  // A comic starburst, one frame; board.js does the stepped reveal.
  'marker-blast': {
    viewBox: '0 0 200 200',
    draw: () => [
      starburst(103, 103, 12, 96, 58, 'ink', { 'fill-opacity': 0.6 }),
      starburst(100, 100, 12, 96, 58, 'red'),
      starburst(100, 100, 12, 96, 58, toneClass('ink', 10)),
      line(starburst(100, 100, 12, 96, 58, 'red').getAttribute('d'), 3),
      starburst(100, 100, 10, 62, 36, 'paper'),
      label('BANG', { x: 100, y: 102, 'font-size': 30, 'font-family': TYPE.slab, class: 'ink', 'letter-spacing': 1 }),
    ],
  },
  'stamp-destroyed': {
    viewBox: '0 0 200 80',
    draw: () => [
      svg('rect', { x: 4, y: 4, width: 192, height: 72, rx: 6, class: 'paper', 'fill-opacity': 0.85 }),
      svg('rect', { x: 4, y: 4, width: 192, height: 72, rx: 6, fill: 'none', class: 'stroke-red', 'stroke-width': 6 }),
      label('DESTROYED', { x: 100, y: 42, 'font-size': 32, 'letter-spacing': 3, class: 'red' }),
    ],
  },

  // --- UI chrome (ART-ASSETS.md §7) ---
  // Face only: four sectors and the ticks between them. The state names are
  // set as type by ui.js from data/rules.json, so renaming a state is data.
  'ui-alert-dial': {
    viewBox: '0 0 240 240',
    draw: () => {
      const parts = [
        circle(124, 124, 116, 'ink', { 'fill-opacity': 0.6 }),
        circle(120, 120, 116, 'paper'),
        circle(120, 120, 116, toneClass('ink', 10)),
        circle(120, 120, 84, 'paper'),
      ];
      const classes = ['green', 'blue', 'red', 'red'];
      const tones = [null, null, ['paper', 35], null];
      const step = DIAL.sweep / classes.length;
      classes.forEach((cls, i) => {
        const from = DIAL.startAngle + i * step;
        parts.push(dialSector(from, from + step, 90, 112, cls));
        if (tones[i]) parts.push(dialSector(from, from + step, 90, 112, toneClass(...tones[i])));
        parts.push(dialSector(from, from + step, 90, 112, toneClass('ink', 10)));
      });
      for (let i = 0; i <= classes.length; i++) {
        const a = DIAL.startAngle + i * step;
        const p = dialPoint(a, 84), q = dialPoint(a, 114);
        parts.push(svg('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'stroke-ink', 'stroke-width': 4 }));
      }
      parts.push(ring(120, 120, 116, 4), ring(120, 120, 90, 2));
      return parts;
    },
  },
  // Pivots at (10, 110); ui.js places that on the dial's centre and rotates.
  'ui-alert-needle': {
    viewBox: '0 0 20 120',
    draw: () => [
      fill('M10 8 L15 104 L5 104 Z', 'ink'),
      circle(10, 110, 9, 'ink'),
      circle(10, 110, 3.5, 'red'),
    ],
  },
  // Night to dawn in ten bands of thinning screen; a treeline along the bottom.
  'ui-dawn-strip': {
    viewBox: '0 0 600 60',
    draw: () => {
      const parts = [svg('rect', { x: 0, y: 0, width: 600, height: 60, class: 'paper' })];
      for (let i = 0; i < 10; i++) {
        parts.push(svg('rect', { x: i * 60, y: 0, width: 61, height: 60, class: 'blue', 'fill-opacity': (0.9 - i * 0.09).toFixed(2) }));
        parts.push(svg('rect', { x: i * 60, y: 0, width: 61, height: 60, class: toneClass('ink', 35) }));
      }
      parts.push(fill('M540 60 A40 40 0 0 1 620 60 Z', 'red', { 'fill-opacity': 0.7 }));
      let trees = 'M0 60 V50';
      for (let x = 0; x <= 600; x += 15) trees += ` Q${x + 4} ${40 + ((x * 7) % 9)} ${x + 8} ${48} L${x + 15} ${51}`;
      parts.push(fill(`${trees} V60 Z`, 'ink'));
      parts.push(svg('rect', { x: 1.5, y: 1.5, width: 597, height: 57, fill: 'none', class: 'stroke-ink', 'stroke-width': 3 }));
      return parts;
    },
  },
  // The margin note down the outer edge of the left page.
  'ui-gutter-note': {
    viewBox: '0 0 60 900',
    draw: () => [
      line('M40 0 V900', 1.6, 'stroke-ink', { 'stroke-dasharray': '10 7', opacity: 0.55 }),
      svg('g', { transform: 'translate(40 120) rotate(-90)' }, [
        line('M-8 -6 L6 4 M-8 6 L6 -4', 1.6), ring(-12, -7, 4, 1.6), ring(-12, 7, 4, 1.6),
      ]),
      label('CUT OUT AND PLAY', { x: 0, y: 0, 'font-size': 20, 'letter-spacing': 6, class: 'ink', transform: 'translate(20 450) rotate(-90)', opacity: 0.75 }),
    ],
  },
  'logo-night-drop': {
    viewBox: '0 0 800 300',
    draw: () => [
      svg('rect', { x: 0, y: 60, width: 800, height: 180, class: toneClass('blue', 35) }),
      // A canopy and its man, top right.
      fill('M560 70 Q640 -6 720 70 Q700 60 680 66 Q660 58 640 66 Q620 58 600 66 Q580 60 560 70 Z', 'paper'),
      line('M560 70 Q640 -6 720 70 Q700 60 680 66 Q660 58 640 66 Q620 58 600 66 Q580 60 560 70 Z', 4),
      line('M562 70 L636 146 M640 66 L640 146 M718 70 L644 146', 2),
      fill('M630 146 h20 v24 h-20 Z M634 170 l-6 26 M646 170 l6 26', 'ink'),
      line('M634 170 l-6 26 M646 170 l6 26', 5),
      circle(640, 138, 9, 'green'), ring(640, 138, 9, 2),
      svg('g', { transform: 'translate(5 4)' }, [label('NIGHT', { x: 290, y: 132, 'font-size': 124, 'font-family': TYPE.slab, class: 'red', 'letter-spacing': 4 })]),
      label('NIGHT', { x: 290, y: 132, 'font-size': 124, 'font-family': TYPE.slab, class: 'ink', 'letter-spacing': 4 }),
      svg('g', { transform: 'translate(5 4)' }, [label('DROP', { x: 400, y: 244, 'font-size': 124, 'font-family': TYPE.slab, class: 'red', 'letter-spacing': 4 })]),
      label('DROP', { x: 400, y: 244, 'font-size': 124, 'font-family': TYPE.slab, class: 'ink', 'letter-spacing': 4 }),
      label('SIX MEN · ONE BRIDGE · DAWN AT TWENTY', { x: 400, y: 288, 'font-size': 20, class: 'ink', 'letter-spacing': 3 }),
    ],
  },
};

// ---------------------------------------------------------------------------
// Lookups. Everything that picks a sprite id from game data does it here, so
// render code never spells an id out.

/** Sprite id for an enemy's type counter. Types come from data, ids from here. */
export function enemySymbolId(type) {
  return `counter-enemy-${type}`;
}

/**
 * Sprite id for a trooper's counter frame. `leader` is a flag on the roster
 * entry, so this stays a data lookup rather than a branch on anybody's name
 * (CLAUDE.md rule 6).
 */
export function counterFrameId(unit) {
  return unit.leader ? 'counter-frame-allied-leader' : 'counter-frame-allied';
}

/** Sprite id for a trooper's role symbol. Roles come from data, ids from here. */
export function roleSymbolId(role) {
  return `symbol-${role}`;
}

/**
 * Sprite id for a trooper's portrait, `full` or `chip`. The portrait filename
 * is his roster id (ART-ASSETS.md §2); a man nobody has drawn yet gets the
 * fallback rather than a blank.
 */
export function portraitId(unitId, size) {
  const id = `portrait-${unitId}-${size}`;
  return hasSprite(id) || SUPPLIED.has(id) ? id : `portrait-fallback-${size}`;
}

// Supplied portraits (ART-ASSETS.md §2). A PNG in PORTRAIT_FILES.dir named as
// the manifest names it — portrait-holloway-full.png, portrait-holloway-chip.png
// — replaces the drawn portrait of that id; nothing else needs editing. Missing
// files are fine: the drawn one stays.
export const PORTRAIT_FILES = {
  dir: 'assets/portraits',
  ext: 'png',
  sizes: { full: { width: 240, height: 300 }, chip: { width: 32, height: 32 } },
};

const SUPPLIED = new Set();

/**
 * Look for a supplied portrait for each trooper id and swap each one found
 * into its <symbol>, so every <use> of it shows the file. `onLoaded` is called
 * after each swap, so the caller can redraw anything that picked a fallback.
 */
export function loadSuppliedPortraits(unitIds, onLoaded = () => {}) {
  const defs = document.getElementById('portrait-fallback-full')?.parentNode;
  if (!defs) return;
  for (const unitId of unitIds) {
    for (const [size, box] of Object.entries(PORTRAIT_FILES.sizes)) {
      const id = `portrait-${unitId}-${size}`;
      const url = `${PORTRAIT_FILES.dir}/${id}.${PORTRAIT_FILES.ext}`;
      const probe = new Image();
      probe.onload = () => {
        let symbol = document.getElementById(id);
        if (!symbol) {
          symbol = svg('symbol', { id, viewBox: `0 0 ${box.width} ${box.height}`, overflow: 'hidden' });
          defs.appendChild(symbol);
        }
        symbol.setAttribute('overflow', 'hidden');
        symbol.replaceChildren(svg('image', {
          href: url, x: 0, y: 0, width: box.width, height: box.height, preserveAspectRatio: 'xMidYMid slice',
        }));
        SUPPLIED.add(id);
        onLoaded(id);
      };
      probe.src = url;
    }
  }
}

/** Sprite id for a fuse token: turns left, 1 to 5; longer fuses show 5. */
export function fuseMarkerId(fuse) {
  return `marker-fuse-${Math.min(5, Math.max(1, fuse))}`;
}

export function hasSprite(id) {
  return Object.prototype.hasOwnProperty.call(SPRITES, id);
}

/** A sprite's viewBox size, { width, height }. */
export function spriteSize(id) {
  const [, , width, height] = SPRITES[id].viewBox.split(' ').map(Number);
  return { width, height };
}

/**
 * A <defs> holding every sprite as a <symbol>, the halftone patterns, and the
 * palette, screens, misregistration and motion as CSS. Call once for the page:
 * other inline SVGs reference the same ids.
 */
export function createSpriteDefs() {
  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = printCss();

  const symbols = Object.entries(SPRITES).map(([id, sprite]) => svg(
    'symbol',
    { id, viewBox: sprite.viewBox, overflow: 'visible' },
    sprite.draw(),
  ));

  return svg('defs', {}, [style, ...halftonePatterns(), ...symbols]);
}

function printCss() {
  const colours = Object.entries(PALETTE)
    .map(([name, value]) => `.${name}{fill:${value}}.stroke-${name}{stroke:${value}}`);
  const tones = [];
  for (const colour of Object.keys(PALETTE)) {
    for (const density of HALFTONE.densities) tones.push(`.tone-${colour}-${density}{fill:url(#ht-${colour}-${density})}`);
  }
  // Colour is printed off register from the ink; the ink plate is the key and
  // stays put.
  const offRegister = [...Object.keys(PALETTE).filter((c) => c !== 'ink').map((c) => `.${c}`), '[class*="tone-"]'];
  const misregister = `${offRegister.join(',')}{transform:translate(${MISREGISTER.x}px,${MISREGISTER.y}px)}`;
  // Stepped, never eased: a blast is revealed in three frames and then gone.
  // A spent man's die-cut edge is set by board.js through --counter-edge.
  const motion = [
    `.counter-edge{stroke:var(--counter-edge,${COUNTER.edge})}`,
    '@keyframes nd-blast{0%{transform:scale(0.35)}12%{transform:scale(0.75)}24%{transform:scale(1)}85%{opacity:1;transform:scale(1)}100%{opacity:0}}',
    `.nd-blast{animation:nd-blast ${MOTION.blastMs}ms step-end both;transform-box:fill-box;transform-origin:center}`,
  ];
  return [...colours, ...tones, misregister, ...motion].join('\n');
}
