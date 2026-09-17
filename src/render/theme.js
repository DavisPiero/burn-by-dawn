// The one place colour and art live. Art must be swappable by editing this
// file and nothing else (CLAUDE.md rule 8).
//
// M1 was colour tokens only. M2 adds the sprite registry: SVG <symbol> defs
// keyed by the asset ids in ART-ASSETS.md, drawn procedurally for now. The
// hand-drawn SVGs at M7 replace the bodies of these symbols and nothing else —
// same ids, same viewBoxes, so no game or render code changes.
//
// Symbols colour themselves with the class names ART-ASSETS.md mandates
// (.ink, .paper, .green, .red, .blue, .leader) so a supplied SVG drops straight in.
// Stroke versions of the same classes are prefixed `stroke-`.
//
// The halftone patterns and the 0.5px misregistration offset arrive at M7.

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
  depot: { fill: '#4A4A42', ink: PALETTE.paper },
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
  // This turn's move range: a blue tint on each reachable hex, and one
  // continuous line round the outside of the whole area. No single colour
  // reads on both a cream field and a near-black wood, so the line is cased:
  // a wide paper stroke under a narrower blue one. The casing carries it over
  // dark terrain, the blue core over light. Blue rather than red because red
  // is the hover path and the selection, and reads as danger.
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
  stepRadius: 7,
  badgeFill: PALETTE.ink,
  badgeText: PALETTE.paper,
  blockedStroke: PALETTE.red,
};

// ---------------------------------------------------------------------------
// Enemies, vision and alert (M4, SPEC.md §6).

export const ENEMY = {
  labelFill: PALETTE.paper,
  labelSize: 8.5,
  labelBoxLeft: 4,
  labelBoxRight: 52,
  // The small wedge outside the counter that says which way it is looking.
  facingFill: PALETTE.red,
  facingStroke: PALETTE.ink,
  facingDistance: 33,
  facingSize: 7,
};

export const VISION = {
  // Every enemy's field of view, faint, so the board always shows where it is
  // watched; the hovered enemy's, stronger and outlined. Red because being
  // seen is the danger.
  fill: PALETTE.red,
  opacity: 0.16,
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

// M5a (SPEC.md §6): who is watching a man in contact, what the garrison has
// heard, and where an action can be aimed.
export const WATCH = {
  // A dashed line from an enemy holding contact to the hex it saw him on.
  stroke: PALETTE.red,
  casing: PALETTE.paper,
  width: 2.5,
  casingWidth: 5,
  dash: '5 5',
};

export const NOISE = {
  // A noise made this turn, not yet heard: a ring round the hex, the same
  // family as the contact ring but solid, because it is certain.
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 6,
  radius: 24,
  text: PALETTE.ink,
};

export const TARGET = {
  // Where the action being aimed can go: a cased blue outline, the same family
  // as the move range, because it is also "where he can reach".
  stroke: PALETTE.blue,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 8,
  // Enemies that would hear a stone, ringed while the stone is being aimed.
  hearsStroke: PALETTE.red,
  hearsWidth: 3,
};

export const MARKER = {
  size: 22,
  // A hidden man's counter is printed faint, so a glance says who is down.
  hiddenOpacity: 0.6,
  groundSize: 26,
};

// Detection risk pips under each step of the hover path.
export const RISK = {
  badgeFill: PALETTE.paper,
  badgeStroke: PALETTE.ink,
  spottedStroke: PALETTE.red,
  pipRadius: 3.2,
  pipGap: 8.5,
  pipFill: PALETTE.ink,
  spottedFill: PALETTE.red,
  // A man in contact who would be spotted again there is shot (SPEC.md §6).
  shotFill: PALETTE.red,
  pinnedFill: PALETTE.ink,
  shotText: PALETTE.paper,
};

// M5b (SPEC.md §7, §10): objectives, their charge hexes, charges burning,
// blasts about to happen, and the exfil.
export const OBJECTIVE = {
  // The footprint: a cased ink outline with its name, drawn over the terrain.
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 7,
  label: PALETTE.ink,
  labelCasing: PALETTE.paper,
  primaryLabel: PALETTE.red,
  // Charge hexes: a dashed ring, faint until the objective is hovered.
  ringRadius: 17,
  ringStroke: PALETTE.ink,
  ringDash: '4 3',
  ringOpacity: 0.45,
  ringHoverOpacity: 1,
  ringWidth: 2,
  // A destroyed objective is stamped.
  stampWidth: 110,
  stampHeight: 44,
  stampRotate: -12,
};

export const BLAST = {
  // Hexes a charge going off in the coming fuse phase would kill a man on
  // (SPEC.md §7): the "no fail-state without warning" line.
  fill: PALETTE.red,
  opacity: 0.18,
  stroke: PALETTE.red,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 6,
  // The same area when an objective is only hovered: a preview, not a warning.
  previewOpacity: 0.08,
};

export const EXFIL = {
  stroke: PALETTE.green,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 8,
  label: PALETTE.green,
};

// The alert dial's four sectors run clockwise from lower left to lower right,
// like a gauge. Angles are degrees from straight up.
// The active state in the list beside the alert dial, keyed by the state ids
// in data/rules.json. Each is a filled chip with paper lettering: green and
// cold blue are too dark to read as text on the ink panel. Alert's dull red is
// the farmhouse tone, red mixed toward ink, so the two reds stay a step apart.
export const ALERT_STATE = {
  calm: PALETTE.green,
  suspicious: PALETTE.blue,
  alert: '#8C3F38',
  alarmed: PALETTE.red,
  text: PALETTE.paper,
};

export const DIAL = {
  startAngle: -135,
  sweep: 270,
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

// The enemy chit is cut with clipped corners and printed dark: it has to read
// as the other side at a glance, not as a recoloured allied counter
// (ART-ASSETS.md §3).
const ENEMY_OUTLINE = 'M9 1 H45 L53 9 V45 L45 53 H9 L1 45 V9 Z';

// A coal-scuttle helmet, the one shape that says German at counter size.
function helmet(x, y, scale) {
  const t = (px, py) => `${x + px * scale} ${y + py * scale}`;
  return svg('path', {
    d: `M${t(0, 12)} C${t(0, 4)} ${t(5, 0)} ${t(11, 0)} C${t(17, 0)} ${t(22, 4)} ${t(22, 10)} L${t(25, 13)} L${t(24, 15)} L${t(0, 15)} Z`,
    class: 'paper',
  });
}

// Gauge geometry for the alert dial, in its 240x240 viewBox.
function dialPoint(angle, radius) {
  const a = (angle - 90) * (Math.PI / 180);
  return { x: 120 + radius * Math.cos(a), y: 120 + radius * Math.sin(a) };
}

function dialSector(from, to, inner, outer, cls) {
  const p1 = dialPoint(from, outer), p2 = dialPoint(to, outer);
  const p3 = dialPoint(to, inner), p4 = dialPoint(from, inner);
  const large = to - from > 180 ? 1 : 0;
  return svg('path', {
    d: `M${p1.x} ${p1.y} A${outer} ${outer} 0 ${large} 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${inner} ${inner} 0 ${large} 0 ${p4.x} ${p4.y} Z`,
    class: cls,
  });
}

const SPRITES = {
  'counter-frame-allied': {
    viewBox: '0 0 56 56',
    draw: () => alliedFrame('green'),
  },

  // The ranking man: leader-blue name strip, plus a sergeant's three chevrons.
  // Not red — red on a friendly counter read as an error. The chevrons sit
  // in the right-hand margin of the counter, clear of the role symbol (x 16-40)
  // and the AP pips along the top centre.
  'counter-frame-allied-leader': {
    viewBox: '0 0 56 56',
    draw: () => alliedFrame('leader', [
      svg('path', {
        d: 'M42 12 L46 8 L50 12 M42 19 L46 15 L50 19 M42 26 L46 22 L50 26',
        fill: 'none', class: 'stroke-leader', 'stroke-width': 1.8,
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

  'counter-frame-enemy': {
    viewBox: '0 0 56 56',
    draw: () => [
      svg('path', { d: ENEMY_OUTLINE, transform: 'translate(2 2)', class: 'ink', 'fill-opacity': 0.55 }),
      svg('path', { d: ENEMY_OUTLINE, class: 'ink' }),
      svg('path', { d: 'M1 38 H53 V45 L45 53 H9 L1 45 Z', class: 'red' }),
      svg('path', { d: ENEMY_OUTLINE, fill: 'none', class: 'stroke-paper', 'stroke-width': 1, transform: 'translate(27 27) scale(0.9) translate(-27 -27)' }),
      svg('path', { d: ENEMY_OUTLINE, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },

  // Enemy types sit on the frame at full counter size, clear of the strip.
  'counter-enemy-sentry': {
    viewBox: '0 0 56 56',
    draw: () => [
      helmet(12, 13, 1.1),
      svg('rect', { x: 40, y: 10, width: 4, height: 24, class: 'paper' }),
      svg('rect', { x: 36, y: 10, width: 12, height: 4, class: 'paper' }),
    ],
  },
  'counter-enemy-patrol': {
    viewBox: '0 0 56 56',
    draw: () => [helmet(6, 11, 0.85), helmet(26, 19, 0.85)],
  },
  'counter-enemy-reserve': {
    viewBox: '0 0 56 56',
    draw: () => [helmet(4, 8, 0.7), helmet(29, 8, 0.7), helmet(16, 22, 0.7)],
  },

  // Sits on top of a trooper counter that was seen at the last detection.
  'marker-spotted': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('circle', { cx: 14, cy: 14, r: 12, class: 'red' }),
      svg('circle', { cx: 14, cy: 14, r: 12, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
      svg('rect', { x: 12, y: 6, width: 4, height: 10, rx: 1, class: 'paper' }),
      svg('circle', { cx: 14, cy: 20.5, r: 2.2, class: 'paper' }),
    ],
  },

  // A trooper who has taken a hit and is not yet stabilised.
  'marker-wounded': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('circle', { cx: 14, cy: 14, r: 12, class: 'paper' }),
      svg('rect', { x: 11, y: 5, width: 6, height: 18, class: 'red' }),
      svg('rect', { x: 5, y: 11, width: 18, height: 6, class: 'red' }),
      svg('circle', { cx: 14, cy: 14, r: 12, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },

  // An enemy pinned by a gunner: a burst of three strokes over a bar.
  'marker-suppressed': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('circle', { cx: 14, cy: 14, r: 12, class: 'paper' }),
      svg('path', { d: 'M8 8 L12 15 M14 6 L14 15 M20 8 L16 15', fill: 'none', class: 'stroke-ink', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
      svg('rect', { x: 6, y: 17, width: 16, height: 4, class: 'ink' }),
      svg('circle', { cx: 14, cy: 14, r: 12, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },

  // Gone to ground (SPEC.md §4 Hide): a closed eye.
  'marker-hidden': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('circle', { cx: 14, cy: 14, r: 12, class: 'green' }),
      svg('path', { d: 'M6 13 Q14 21 22 13', fill: 'none', class: 'stroke-paper', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
      svg('path', { d: 'M9 17 L7.5 20 M14 18.5 L14 22 M19 17 L20.5 20', fill: 'none', class: 'stroke-paper', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      svg('circle', { cx: 14, cy: 14, r: 12, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },

  // A fallen trooper's body on the ground (SPEC.md §5): a helmet on a cross.
  'marker-body': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('rect', { x: 2, y: 2, width: 24, height: 24, rx: 3, class: 'paper' }),
      svg('rect', { x: 12.5, y: 5, width: 3, height: 19, class: 'ink' }),
      svg('rect', { x: 7, y: 10, width: 14, height: 3, class: 'ink' }),
      svg('path', { d: 'M6 24 Q14 14 22 24 Z', class: 'green' }),
      svg('rect', { x: 2, y: 2, width: 24, height: 24, rx: 3, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },

  // A demolition charge: a satchel with a fuse. Dropped on the ground at M5a;
  // placed on an objective at M5b.
  'marker-charge': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('rect', { x: 4, y: 10, width: 20, height: 14, rx: 2, class: 'green' }),
      svg('rect', { x: 4, y: 10, width: 20, height: 5, class: 'ink', 'fill-opacity': 0.5 }),
      svg('path', { d: 'M14 10 C14 5 19 6 20 3', fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
      svg('circle', { cx: 20.5, cy: 3, r: 2, class: 'red' }),
      svg('rect', { x: 4, y: 10, width: 20, height: 14, rx: 2, fill: 'none', class: 'stroke-ink', 'stroke-width': 2 }),
    ],
  },

  // Fuse tokens (ART-ASSETS.md §6 marker-fuse-1..5): turns left before the
  // charge goes off, set in a paper disc with a red rim. 1 is the red one.
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`marker-fuse-${n}`, {
    viewBox: '0 0 28 28',
    draw: () => {
      const digit = svg('text', {
        x: 14, y: 15, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-family': 'ui-monospace, monospace', 'font-size': 17, 'font-weight': 'bold',
        class: n === 1 ? 'paper' : 'ink',
      });
      digit.textContent = String(n);
      return [
        svg('circle', { cx: 14, cy: 14, r: 12, class: n === 1 ? 'red' : 'paper' }),
        svg('circle', { cx: 14, cy: 14, r: 12, fill: 'none', class: 'stroke-red', 'stroke-width': 3 }),
        digit,
      ];
    },
  }])),

  // A red rubber stamp for a destroyed objective (ART-ASSETS.md §6). Rotated in code.
  'stamp-destroyed': {
    viewBox: '0 0 200 80',
    draw: () => {
      const word = svg('text', {
        x: 100, y: 42, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-family': 'ui-monospace, monospace', 'font-size': 38, 'font-weight': 'bold', 'letter-spacing': 4,
        class: 'red',
      });
      word.textContent = 'DESTROYED';
      return [
        svg('rect', { x: 4, y: 4, width: 192, height: 72, rx: 6, class: 'paper', 'fill-opacity': 0.85 }),
        svg('rect', { x: 4, y: 4, width: 192, height: 72, rx: 6, fill: 'none', class: 'stroke-red', 'stroke-width': 6 }),
        word,
      ];
    },
  },

  // Face only: four sectors and the ticks between them. The state names are
  // set as type by ui.js from data/rules.json, so renaming a state is data.
  'ui-alert-dial': {
    viewBox: '0 0 240 240',
    draw: () => {
      const parts = [
        svg('circle', { cx: 122, cy: 122, r: 116, class: 'ink', 'fill-opacity': 0.55 }),
        svg('circle', { cx: 120, cy: 120, r: 116, class: 'paper' }),
      ];
      const classes = ['green', 'blue', 'red', 'red'];
      const opacities = [1, 1, 0.55, 1];
      const step = DIAL.sweep / classes.length;
      classes.forEach((cls, i) => {
        const from = DIAL.startAngle + i * step;
        const sector = dialSector(from, from + step, 94, 112, cls);
        sector.setAttribute('fill-opacity', opacities[i]);
        parts.push(sector);
      });
      for (let i = 0; i <= classes.length; i++) {
        const a = DIAL.startAngle + i * step;
        const p = dialPoint(a, 90), q = dialPoint(a, 114);
        parts.push(svg('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'stroke-ink', 'stroke-width': 3 }));
      }
      parts.push(svg('circle', { cx: 120, cy: 120, r: 116, fill: 'none', class: 'stroke-ink', 'stroke-width': 3 }));
      return parts;
    },
  },
  // Pivots at (10, 110); ui.js places that on the dial's centre and rotates.
  'ui-alert-needle': {
    viewBox: '0 0 20 120',
    draw: () => [
      svg('path', { d: 'M10 8 L14 104 L6 104 Z', class: 'ink' }),
      svg('circle', { cx: 10, cy: 110, r: 8, class: 'ink' }),
      svg('circle', { cx: 10, cy: 110, r: 3, class: 'paper' }),
    ],
  },
};

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

/** Sprite id for a fuse token: turns left, 1 to 5; longer fuses show 5. */
export function fuseMarkerId(fuse) {
  return `marker-fuse-${Math.min(5, Math.max(1, fuse))}`;
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
