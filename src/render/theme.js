// The one place colour and art live. Art must be swappable by editing this
// file and nothing else (CLAUDE.md rule 8).
//
// M1 was colour tokens only. M2 adds the sprite registry: SVG <symbol> defs
// keyed by the asset ids in ART-ASSETS.md, drawn procedurally for now. The
// hand-drawn SVGs at M7 replace the bodies of these symbols and nothing else —
// same ids, same viewBoxes, so no game or render code changes.
//
// Symbols colour themselves with the class names ART-ASSETS.md mandates
// (.ink, .paper, .green, .red, .blue) so a supplied SVG drops straight in.
// Stroke versions of the same classes are prefixed `stroke-`.
//
// The halftone patterns and the 0.5px misregistration offset arrive at M7.

export const PALETTE = {
  paper: '#F2E8D5',
  ink: '#1A1A18',
  green: '#5C6B4A',
  red: '#C1272D',
  blue: '#3D5A73',
};

// fill: the hex body. ink: anything drawn on top of it, so labels stay legible
// on dark fills.
const TERRAIN_STYLES = {
  field: { fill: '#F2E8D5', ink: PALETTE.ink },
  track: { fill: '#E3D3AF', ink: PALETTE.ink },
  hedgerow: { fill: '#5C6B4A', ink: PALETTE.paper },
  wood: { fill: '#3B4531', ink: PALETTE.paper },
  orchard: { fill: '#96A37F', ink: PALETTE.ink },
  marsh: { fill: '#7E8C7A', ink: PALETTE.paper },
  canal: { fill: '#3D5A73', ink: PALETTE.paper },
  ridge: { fill: '#C9B78F', ink: PALETTE.ink },
  farmhouse: { fill: '#8C3F38', ink: PALETTE.paper },
  emplacement: { fill: '#C1272D', ink: PALETTE.paper },
  bridge: { fill: '#6E6353', ink: PALETTE.paper },
  lock: { fill: '#5B7488', ink: PALETTE.paper },
};

// A terrain id with no style yet still draws, in a colour that looks wrong on
// purpose, rather than vanishing.
const UNKNOWN_STYLE = { fill: '#FF00FF', ink: PALETTE.ink };

export function terrainStyle(terrainId) {
  return TERRAIN_STYLES[terrainId] ?? UNKNOWN_STYLE;
}

export const GRID = {
  stroke: PALETTE.ink,
  strokeWidth: 1,
  strokeOpacity: 0.45,
  // The clipped half-hexes past the straight border. Drawn, so the border
  // reads as a printed crop rather than a void, but visibly dead.
  outOfPlayOpacity: 0.35,
};

export const SELECTION = {
  stroke: PALETTE.red,
  strokeWidth: 4,
};

// Counters are 56px inside an 80px hex so the hex edge stays visible under
// them — ART-ASSETS.md §3.
export const COUNTER = {
  size: 56,
  // The name strip is 52 wide with the roster number boxed off at its left,
  // so this is what is left for the name itself.
  nameBoxLeft: 14,
  nameBoxRight: 53,
  selectedStroke: PALETTE.red,
  selectedStrokeWidth: 3,
  spentOpacity: 0.55, // a trooper with no AP left greys back
  nameFill: PALETTE.paper,
  nameSize: 9,
  // Glyphs are never stretched to fill the strip — a long name scales down as
  // whole type instead, so every counter's lettering keeps the same
  // proportions. Roughly the width of one character at font-size 1.
  nameAspect: 0.62,
  numberFill: PALETTE.ink,
  numberText: PALETTE.paper,
  pipFill: PALETTE.ink,
  pipRadius: 2.6,
};

// Hover path preview. The affordable part of a path and the part beyond this
// turn's AP have to be told apart at a glance — that readout is the whole
// point of hover (SPEC.md §4).
export const PATH = {
  // A single tint cannot read on both a cream field and a near-black wood, so
  // reachable hexes get a tint plus an inset outline in the opposite value.
  reachableFill: PALETTE.green,
  reachableOpacity: 0.22,
  reachableStroke: PALETTE.paper,
  reachableStrokeWidth: 3,
  reachableStrokeOpacity: 0.55,
  reachableInset: 0.9,
  lineStroke: PALETTE.red,
  lineWidth: 5,
  overspendStroke: PALETTE.ink,
  overspendOpacity: 0.45,
  overspendDash: '6 7',
  stepRadius: 7,
  badgeFill: PALETTE.ink,
  badgeText: PALETTE.paper,
  blockedStroke: PALETTE.red,
};

// ---------------------------------------------------------------------------
// Sprite registry. Ids and viewBoxes are ART-ASSETS.md's, exactly.

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  for (const child of children) node.appendChild(child);
  return node;
}

// Both allied frames are the same die-cut silhouette so the six read as one
// set of chits; only the name strip's colour and the rank flash differ. The
// drop shadow is part of the frame, down-right 2px and hard edged: a cardboard
// chit, not a soft UI shadow (ART-ASSETS.md §3).
function alliedFrame(stripClass, extras = []) {
  return [
    svg('rect', { x: 3, y: 3, width: 52, height: 52, rx: 5, class: 'ink', 'fill-opacity': 0.55 }),
    svg('rect', { x: 1, y: 1, width: 52, height: 52, rx: 5, class: 'paper' }),
    svg('path', { d: 'M1 38 H53 V48 A5 5 0 0 1 48 53 H6 A5 5 0 0 1 1 48 Z', class: stripClass }),
    ...extras,
    svg('rect', {
      x: 1, y: 1, width: 52, height: 52, rx: 5,
      fill: 'none', class: 'stroke-ink', 'stroke-width': 2,
    }),
  ];
}

const SPRITES = {
  'counter-frame-allied': {
    viewBox: '0 0 56 56',
    draw: () => alliedFrame('green'),
  },

  // The ranking man: red name strip, plus a sergeant's three chevrons. They sit
  // in the right-hand margin of the counter, clear of the role symbol (x 16-40)
  // and the AP pips along the top centre.
  'counter-frame-allied-leader': {
    viewBox: '0 0 56 56',
    draw: () => alliedFrame('red', [
      svg('path', {
        d: 'M42 12 L46 8 L50 12 M42 19 L46 15 L50 19 M42 26 L46 22 L50 26',
        fill: 'none', class: 'stroke-red', 'stroke-width': 1.8,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }),
    ]),
  },

  // Role symbols, 24x24. Silhouette level — they sit at 24px on a busy map.
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
      svg('circle', { cx: 6.5, cy: 14, r: 4.5, class: 'ink' }),
      svg('circle', { cx: 17.5, cy: 14, r: 4.5, class: 'ink' }),
    ],
  },
  'symbol-gunner': {
    viewBox: '0 0 24 24',
    draw: () => [
      svg('rect', { x: 2, y: 10, width: 18, height: 3, class: 'ink' }),
      svg('rect', { x: 10, y: 3, width: 3.5, height: 7, class: 'ink' }),
      svg('path', { d: 'M18 13 L22 13 L18 19 Z', class: 'ink' }),
      svg('path', { d: 'M6 13 L3 20 M6 13 L9 20', class: 'stroke-ink', 'stroke-width': 1.6, fill: 'none' }),
    ],
  },
};

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

export function hasSprite(id) {
  return Object.prototype.hasOwnProperty.call(SPRITES, id);
}

/**
 * A <defs> holding every sprite as a <symbol>, plus the palette as CSS classes.
 * Call once per SVG document and reference sprites with <use href="#id">.
 */
export function createSpriteDefs() {
  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = paletteCss();

  const symbols = Object.entries(SPRITES).map(([id, sprite]) => svg(
    'symbol',
    { id, viewBox: sprite.viewBox, overflow: 'visible' },
    sprite.draw(),
  ));

  return svg('defs', {}, [style, ...symbols]);
}

function paletteCss() {
  return Object.entries(PALETTE)
    .map(([name, value]) => `.${name}{fill:${value}}.stroke-${name}{stroke:${value}}`)
    .join('\n');
}
