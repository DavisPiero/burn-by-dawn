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
  // The seventh, for fire only (M14, the operator's): a printed orange, kept
  // soft so it sits with the rest — flames, the blast's fireball.
  fire: '#C98249',
  // The eighth, the desert's ground (SPEC.md §11, §13, M29): the second colour
  // the airfield's story is printed in, used only by the desert's terrain.
  // Yellower than fire orange, so a burning fuse still stands out on it.
  ochre: '#D2A85C',
  // The ninth (M31d, the operator's "try orange"): our men's counters on the
  // desert, where army green on ochre sat too close to the garrison's dark
  // chits. Burnt, darker and redder than fire orange, so the orange dots for
  // the charges a man carries still stand off it in their paper rings. A
  // mission names it as its `counterColour` (data/missions.json).
  burnt: '#B4592A',
};

// SPEC.md §11: a typewriter Courier for text, a display face for the masthead
// and headings, and hand lettering for speech bubbles and the marker-pen notes.
// The supplied faces are FONTS below, first in their stacks; the rest are
// faces desktops ship, used until a supplied one loads or if its file is gone.
// Never Comic Sans.
export const TYPE = {
  typewriter: '"Courier 10 Pitch", "Courier New", Courier, monospace',
  // Stardos Stencil: the stencil the title card is lettered in, so headings match it.
  slab: '"Stardos Stencil", "Rockwell Condensed", Rockwell, "American Typewriter", "Courier New", serif',
  // Manly Men BB: comic lettering, whose 1 is flagged and never reads as I.
  lettering: '"Manly Men BB", Noteworthy, "Segoe Print", "Ink Free", "Marker Felt", "Chalkboard SE", fantasy',
};

// Supplied faces (ART-ASSETS.md §8), WOFF2 in assets/fonts. Only these are
// loaded; the other files in that folder are options not taken.
export const FONTS = [
  { family: 'Manly Men BB', weight: 400, url: 'assets/fonts/ManlyMenBB.woff2' },
  { family: 'Manly Men BB', weight: 700, url: 'assets/fonts/ManlyMenBB_bold.woff2' },
  { family: 'Stardos Stencil', weight: 700, url: 'assets/fonts/StardosStencil-Bold.woff2' },
];

/**
 * Load the supplied faces. Resolves once each has loaded or failed, so the
 * first draw can wait for them: speech bubbles are measured in the face
 * actually used. A missing file just leaves the desktop fallback.
 */
export function loadSuppliedFonts() {
  return Promise.allSettled(FONTS.map(({ family, weight, url }) => {
    const face = new FontFace(family, `url("${url}")`, { weight: String(weight) });
    document.fonts.add(face);
    return face.load();
  }));
}

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
  root.style.setProperty('--lettering', TYPE.lettering);
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
  return picture(PAPER_FILE.url).then((ok) => {
    if (!ok) return;
    root.style.setProperty('--paper-fibre', `url("${PAPER_FILE.url}")`);
    root.style.setProperty('--paper-fibre-size', `${PAPER_FILE.tile}px`);
  });
}

/**
 * Fetch a supplied picture. Resolves true once it has loaded, false if it is
 * missing, never rejects: every supplied file is optional, and the page waits
 * for them (M17) so it opens whole rather than filling in piece by piece.
 */
export function picture(url) {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = url;
  });
}

// A supplied aircraft (ART-ASSETS.md §6, ART-PROMPTS.md): a painted PNG at
// AIRCRAFT_FILE.url, seen from above, nose to the east, on transparency,
// replaces the drawn Dakota once it loads. Its shadow on the ground is the
// same picture printed flat black (board.js prints it faint), so the two can
// never disagree. A missing file is fine: the drawn Dakota stays.
export const AIRCRAFT_FILE = { url: 'assets/aircraft/aircraft-dakota.png', size: 120 };

export function loadSuppliedAircraft() {
  return picture(AIRCRAFT_FILE.url).then((ok) => {
    if (!ok) return;
    const image = (extra = {}) => svg('image', {
      href: AIRCRAFT_FILE.url, x: 0, y: 0, width: AIRCRAFT_FILE.size, height: AIRCRAFT_FILE.size, ...extra,
    });
    document.getElementById('aircraft-dakota')?.replaceChildren(image());
    // One element, shown for a few seconds: a CSS filter is cheap enough here.
    document.getElementById('aircraft-dakota-shadow')?.replaceChildren(image({ style: 'filter: brightness(0)' }));
  });
}

// A supplied blast (M17, the operator's): a painted starburst PNG at
// BLAST_FILE.url, square on transparency, replaces the drawn `marker-blast`
// once it loads — the bang on the board and the gunner's muzzle flash alike —
// with BOOM set over its middle in code.
// It is shown at 400 x 400 (twice the sprite's 200, for retina); the
// operator's full-size painting is kept beside it as marker-blast_original.png.
// A missing file is fine: the drawn one stays.
export const BLAST_FILE = { url: 'assets/markers/marker-blast.png', size: 200 };

export function loadSuppliedBlast() {
  return picture(BLAST_FILE.url).then((ok) => {
    if (!ok) return;
    // BOOM set over its empty middle, as the drawn one has it (ART-PROMPTS.md priority 10).
    document.getElementById('marker-blast')?.replaceChildren(
      svg('image', { href: BLAST_FILE.url, x: 0, y: 0, width: BLAST_FILE.size, height: BLAST_FILE.size }),
      boomLabel(),
    );
  });
}

// Supplied enemy chips (ART-ASSETS.md §3, ART-PROMPTS.md): a painted PNG per
// enemy type, assets/enemies/counter-enemy-<type>.png, 128 x 128 on
// transparency, replaces the drawn helmets on that type's counter. It sits in
// the dark frame above the name strip, which code still prints. A missing file
// is fine: the drawn symbol stays. Types are enemies.json's, so a new type
// needs only its picture.
export const ENEMY_CHIP_FILES = { dir: 'assets/enemies', box: { x: 11, y: 3, size: 34 } };

export function loadSuppliedEnemyChips(types) {
  return Promise.all(types.map((type) => {
    const id = enemySymbolId(type);
    const url = `${ENEMY_CHIP_FILES.dir}/${id}.png`;
    return picture(url).then((ok) => {
      if (!ok) return;
      const { x, y, size } = ENEMY_CHIP_FILES.box;
      document.getElementById(id)?.replaceChildren(svg('image', { href: url, x, y, width: size, height: size }));
    });
  }));
}

// A supplied title card (ART-ASSETS.md §7, ART-PROMPTS.md): a painted JPEG at
// the mission's `titleCard` (data/missions.json, M27; TITLE_CARD.url if none)
// replaces the drawn `title-card` sprite once it loads, cropped to the
// sprite's 4:1 from the middle. A missing file is fine: the drawn one stays.
// `lettered` says the picture has the title painted in, so the typed title is
// hidden over it; set it false for a picture without (title-card_original.jpg).
export const TITLE_CARD = { url: 'assets/title/title-card.jpg', width: 600, height: 150, lettered: true };

export function loadSuppliedTitleCard(url = TITLE_CARD.url, lettered = TITLE_CARD.lettered) {
  return picture(url).then((ok) => {
    // A mission whose own card is not painted yet (M31: the airfield's) has
    // the game's card, France's, until it is.
    if (!ok) return url === TITLE_CARD.url ? undefined : loadSuppliedTitleCard(TITLE_CARD.url);
    const symbol = document.getElementById('title-card');
    if (!symbol) return;
    symbol.setAttribute('overflow', 'hidden');
    symbol.replaceChildren(svg('image', {
      href: url, x: 0, y: 0, width: TITLE_CARD.width, height: TITLE_CARD.height, preserveAspectRatio: 'xMidYMid slice',
    }));
    document.documentElement.classList.toggle('title-card-lettered', lettered);
  });
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
  // `shadows`: each motif has a `<motif>-shadow` sprite, printed for the whole
  // run before any motif, so no tree is darkened by its neighbour's (M17).
  wood: { base: 'paper', area: { fill: 'green', tone: ['ink', 35], outline: 1.8 }, motif: 'terrain-wood', variants: 3, shadows: true },
  orchard: { base: 'paper', area: { tint: ['green', 0.08], outline: 1.2, outlineClass: 'stroke-green', dash: '3 4' }, motif: 'terrain-orchard', variants: 3, shadows: true },
  marsh: { base: 'paper', area: { tint: ['blue', 0.16] }, motif: 'terrain-marsh' },
  // High ground in tonal bands: darker at the crest, a paler band round the
  // edge where it falls away, a contour at its foot, and no symbol.
  ridge: { base: 'paper', area: { tint: ['ink', 0.13], rim: { width: 26, opacity: 0.5 }, outline: 1.2, outlineOpacity: 0.45, dash: '8 3' }, motif: null },
  canal: { base: 'blue', motif: 'terrain-canal', banks: ['canal', 'lock', 'bridge'] },
  lock: { base: 'blue', motif: 'terrain-canal', banks: ['canal', 'lock', 'bridge'] },
  farmhouse: { base: 'paper', tint: ['red', 0.08], motif: 'terrain-farmhouse', building: true },
  emplacement: { base: 'paper', tint: ['red', 0.1], motif: 'terrain-emplacement' },
  // The bridge and the dump are drawn by their objective art, over the hexes.
  bridge: { base: 'paper', motif: null, road: true },
  depot: { base: 'paper', tint: ['ink', 0.07], motif: null },
  // The desert (SPEC.md §13, M29), in desert ochre over the paper: sand a pale
  // wash of it, dunes a stronger one in bands, the wadi the ochre darkened
  // with ink. The strip and the camp stay bare paper, man-made against the
  // sand. Area terrain here keeps the sand's wash under its shape (`tint`
  // with `area`), so its rounded corners meet sand, not bare paper. The wire
  // is a line, like a hedge (`fence`, drawn by board.js with WIRE).
  sand: { base: 'paper', tint: ['ochre', 0.3], motif: 'terrain-sand', variants: 3, sparse: 0.4 },
  scrub: { base: 'paper', tint: ['ochre', 0.3], motif: 'terrain-scrub', variants: 3 },
  dunes: { base: 'paper', tint: ['ochre', 0.3], area: { tint: ['ochre', 0.4], outline: 1, outlineOpacity: 0.35, dash: '6 4' }, motif: 'terrain-dunes', variants: 3 },
  // The wadi a touch lighter (M29b, the operator's: too strong): the ochre at
  // 75% and a lighter ink tone, still the darkest ground on the board.
  wadi: { base: 'paper', tint: ['ochre', 0.3], area: { tint: ['ochre', 0.75], tone: ['ink', 25], outline: 1.6 }, motif: 'terrain-wadi', variants: 3 },
  wire: { base: 'paper', tint: ['ochre', 0.3], motif: null, fence: true },
  strip: { base: 'paper', tint: ['ink', 0.07], motif: 'terrain-strip' },
  pen: { base: 'paper', tint: ['ochre', 0.3], motif: 'terrain-pen' },
  aircraft: { base: 'paper', tint: ['ochre', 0.3], motif: null },
  camp: { base: 'paper', motif: 'terrain-camp', variants: 2, building: true },
  // The winter hills (SPEC.md §14, M41): a pale wash of the cold blue over the
  // paper where the desert has its ochre, the ravine the blue darkened with
  // ink as the wadi is, the crags in ink. The plough and the beach stay bare
  // paper, and the sea is the canal's blue. No new colour.
  hillside: { base: 'paper', tint: ['blue', 0.1], motif: 'terrain-hillside', variants: 3, sparse: 0.6 },
  crag: { base: 'paper', tint: ['blue', 0.1], area: { tint: ['ink', 0.3], outline: 1.8 }, motif: 'terrain-crag', variants: 2 },
  ravine: { base: 'paper', tint: ['blue', 0.1], area: { tint: ['blue', 0.5], tone: ['ink', 25], outline: 1.6 }, motif: 'terrain-ravine', variants: 3 },
  terrace: { base: 'paper', tint: ['green', 0.14], motif: 'terrain-terrace', variants: 2 },
  olives: { base: 'paper', tint: ['blue', 0.1], area: { tint: ['green', 0.1], outline: 1.2, outlineClass: 'stroke-green', dash: '3 4' }, motif: 'terrain-olives', variants: 3 },
  plough: { base: 'paper', motif: 'terrain-plough', variants: 2 },
  aqueduct: { base: 'paper', tint: ['blue', 0.1], motif: null },
  arch: { base: 'paper', tint: ['ink', 0.1], motif: 'terrain-arch' },
  shingle: { base: 'paper', tint: ['ink', 0.04], motif: 'terrain-shingle', variants: 2 },
  rocks: { base: 'paper', tint: ['ink', 0.04], motif: 'terrain-rocks', variants: 2 },
  sea: { base: 'blue', motif: 'terrain-sea', variants: 2, banks: ['sea'] },
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
  // Pushed back to a mid grey (ink at an opacity): names are flavour, and must
  // never out-shout the labels that affect play.
  village: { size: 19, weight: 'bold', italic: false, capitals: true, spacing: 4, fill: PALETTE.ink, opacity: 0.5 },
  water: { size: 17, weight: 'bold', italic: true, capitals: false, spacing: 1.5, fill: PALETTE.paper, opacity: 0.6, halo: false },
  other: { size: 17, weight: 'normal', italic: true, capitals: false, spacing: 0.5, fill: PALETTE.ink, opacity: 0.5 },
  // A dry watercourse (M31d, the operator's: the wadi's name was lost under its
  // stones): water's paper italic, solid, on a soft ink halo so it prints over
  // the stones rather than among them.
  wadi: { size: 17, weight: 'bold', italic: true, capitals: false, spacing: 1.5, fill: PALETTE.paper, opacity: 0.95, halo: PALETTE.ink, haloOpacity: 0.45 },
};

export const GRID = {
  stroke: PALETTE.ink,
  strokeWidth: 1,
  strokeOpacity: 0.16,
  // The clipped half-hexes past the straight border. Drawn, so the border
  // reads as a printed crop rather than a void, but visibly dead. M20 (the
  // operator's: the woods stopped dead at their edges): a lighter wash, its
  // edge blurred by `deadWashBlur` so what it covers fades out, not cut off.
  outOfPlayOpacity: 0.55,
  deadWash: PALETTE.paper,
  deadWashBlur: 7,
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
  // AP as dots top right since M13 (was one big figure): two across, filled
  // for AP left, hollow and faint for AP spent.
  apFill: PALETTE.paper,
  // AP from the leader's orders (SPEC.md §5 Command), in his blue (M14).
  apOrdersFill: PALETTE.leader,
  apDots: { x: 46, y: 6.5, pitch: 5.6, columns: 2, radius: 2.2, stroke: PALETTE.ink },
  apSpentOpacity: 0.45,
  // The man's own face, and his role in the roundel top left.
  chip: { x: 14, y: 6, size: 29 },
  role: { x: 3.5, y: 4, size: 12 },
  // One orange dot per charge carried, under the role (M15).
  chargeDots: { x: 9.5, y: 22, pitch: 7.4, radius: 2.7, fill: PALETTE.fire },
};

// SPEC.md §11: no smooth easing anywhere. A trooper who moves travels his
// path a hex at a time, quickly, and stops; a blast is revealed in steps.
// Shots on the board (M13): a gunner's burst when he suppresses, one dim shot
// when he kills. Display only.
export const SHOT = {
  ms: 900,
  burstRounds: 4,
  roundMs: 110,
  travelMs: 160,
  tracer: PALETTE.red,
  tracerWidth: 3,
  dash: 16,
  muzzleOffset: 24,
  flashSize: 30,
};

// An enemy under suppression (M13): its counter faded and a red band across it.
export const SUPPRESSED = {
  fade: PALETTE.paper,
  fadeOpacity: 0.5,
  band: PALETTE.red,
  bandStroke: PALETTE.ink,
  bandHeight: 13,
  bandRotate: -14,
  text: PALETTE.paper,
  textSize: 8.5,
};

export const MOTION = {
  travelMsPerHex: 190, // half as slow again since M13, a quarter slower again in M16, and 190 from 140 in M24 (for steps a hex apart, since taken out; the pace was kept)
  blastMs: 1500,
};

// A man killed (M21, the operator's): his counter floats up about a hex and
// fades away, over the body he leaves. Display only; the turn's card waits
// for it as it does for a bang.
export const DEATH = {
  delayMs: 250, // a beat on his hex first, so the eye finds him
  floatMs: 1700,
  riseHexes: 1, // in hex heights (1.5 radii), straight up
};

// The garrison's turn shown before its card (M15): each enemy walks its steps,
// a "!" pops on each that spotted a man or found something, and a ripple runs
// out from each noise it heard. Display only.
export const GARRISON_SHOW = {
  // Slower than our men, so the whole garrison can be watched at once, and
  // at a patrolling walk that quickens as the alarm rises (M16, the
  // operator's: at a flat 240 it was hard to follow). Keyed by alert state id
  // (data/rules.json), the state the garrison is in once its turn is done.
  msPerHex: { calm: 480, suspicious: 420, alert: 360, alarmed: 300 },
  tailMs: 500, // a beat after the last step before the card
  popMs: 300,
  alarmSize: 24,
  alarmLingerMs: 1800, // the "!" stays this long after the show
  rippleMs: 900,
  rippleHexes: 2.5,
  rippleStroke: PALETTE.ink,
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
  // The move line is cold blue, cased in paper so it reads over the blue of
  // the move range, and turns red from the first hex where he would be
  // spotted: red on the path means trouble, and only then (M11).
  lineStroke: PALETTE.blue,
  lineCasing: PALETTE.paper,
  lineCasingWidth: 9,
  spottedStroke: PALETTE.red,
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

// The leader's orders (SPEC.md §5 Command): while he is selected, the ground
// within his command radius, outlined in his blue, dashed so it never reads
// as the move range. Where a man stands at the start of a turn to get them.
export const COMMAND = {
  stroke: PALETTE.leader,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 7,
  dash: '10 6',
  closeDash: '4 5', // the inner band, where the orders are strongest (M12)
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
  // Next turn's facing, when it differs (M13b): hollow, dashed in red.
  nextFill: PALETTE.paper,
  // Hovered (M22, the operator's: the solid red frame of a selected man made
  // an enemy look selectable): a dashed red ring a little off the chip, on a
  // paper casing so the dashes read over the map.
  hoverStroke: PALETTE.red,
  hoverWidth: 2.5,
  hoverDash: '5 4',
  hoverCasing: PALETTE.paper,
  hoverCasingWidth: 5.5,
  hoverGap: 4,
};

export const VISION = {
  // The hovered enemy's next-turn view (M13b): a dashed ink outline.
  nextEdge: PALETTE.ink,
  nextEdgeWidth: 2.5,
  nextDash: '6 5',
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
  // What each kind of noise is called under its ring (M15: a bang's ring
  // looked like a stone's left behind).
  words: { explosion: 'BANG', stone: 'STONE', gunfire: 'SHOTS', silenced: 'SHOT', found: 'FOUND' },
  // Noises with no ring (M17, the operator's: a ring stood on the blown
  // bridge like a target until the garrison heard it). A bang's place is
  // already marked by the blast, the smoke and the DESTROYED stamp; hovering
  // the hex still says who it will bring.
  unringed: ['explosion'],
  wordSize: 10,
};

export const TARGET = {
  stroke: PALETTE.blue,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 8,
  hearsStroke: PALETTE.red,
  hearsWidth: 3,
  // A man an aid can go to (M26d, the operator's: the hex outline under his
  // counter did not show who a charge would be passed to): a ring round him.
  manGap: 8,
};

// A stone being aimed (SPEC.md §4): the lob drawn as a dashed arc from the man,
// the stone where it lands, and the ground in earshot tinted — a throw, not a move.
export const THROW = {
  // Since M17 no lob is drawn, only where it lands (marker-stone-target),
  // this many hex radii across.
  targetScale: 1.15,
  earshot: PALETTE.red,
  earshotOpacity: 0.1,
  earshotEdge: 2,
};

// A hex the turn report is pointing at, while its line is hovered.
export const HIGHLIGHT = {
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 9,
  radius: 36,
};

// The lengths a fuse token's face can be divided into (M30: the airfield's
// time pencils run to 6 turns; France's fuse is 3, Dutch's 2).
export const FUSE_LENGTHS = [1, 2, 3, 4, 5, 6];
// The time pencils' safety strips, shortest to longest (M31d): the No. 10's
// black, red, white, green, yellow and blue, in the palette's own colours.
const TIME_PENCIL_COLOURS = ['ink', 'red', 'paper', 'green', 'ochre', 'blue'];

export const MARKER = {
  size: 22,
  hiddenOpacity: 0.6,
  // The hidden mark's corner on a counter: bottom right, lifted off the foot
  // of the name strip (M21, the operator's), and printed at full strength
  // over the faint counter.
  hiddenAt: { x: 38, y: 33 },
  groundSize: 26,
  canisterSize: 34, // a supply canister (M41), bigger than the charges in it
  fuseSize: 34, // the stopwatch on a burning charge (M15)
  ordersScale: 0.6, // the orders chevrons on a counter, against MARKER.size (M15)
  bodySize: 39, // half as big again as groundSize since M15, the operator's: bodies were easy to miss
  // Where a thing on the ground sits from its hex's centre (x toward its side).
  groundOffset: { x: 18, y: 14 },
  bodyOffset: { x: 11, y: 8 }, // nearer the middle since M16, the operator's
  aimScale: 1.35, // the crosshair while aiming at an enemy, in hex radii across (M15)
  chuteReach: 0.72, // hex radii from the centre into a corner, clear of most of a counter (M13)
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
  // What the dots are (M19, the operator's: players did not know), a pen
  // note beside the dots on the last hex of the path that has them.
  noteSize: 13,
  noteLeading: 1.1, // of noteSize, between its two lines
  noteGap: 5, // from the dots' badge
  noteRoom: 140, // nearer the board's right-hand edge than this, it goes on the left
  noteInk: PALETTE.ink,
  noteSpotted: PALETTE.red,
  noteHalo: PALETTE.paper,
};

// SPEC.md §7, §10: objectives, their charge hexes, charges burning, blasts
// about to happen, and the exfil.
export const OBJECTIVE = {
  // The footprint: which hexes are the target, in a firm ink line cased in
  // paper, so the art and its hexes read as one thing (M7b).
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 7,
  outlineOpacity: 0.85,
  label: PALETTE.ink,
  labelCasing: PALETTE.paper,
  primaryLabel: PALETTE.red,
  labelSize: 16,
  labelLift: 1.02, // hex radii above the top row's centre, clear of the bridge's girders
  // A charge point, where a man stands to place a charge: a red dashed hex
  // just inside the hex's own edge, so it shows round a counter standing on
  // it, and an empty satchel in it — "put one here", not a target.
  pointInset: 0.84,
  pointStroke: PALETTE.red,
  pointDash: '7 4',
  pointWidth: 2.8,
  pointCasingWidth: 6.5,
  pointOpacity: 0.8,
  pointHoverOpacity: 1,
  pointIconSize: 34,
  pointIconShift: 0.3, // hex radii toward the target it serves (M12)
  // The charge point of a target with a lead to it (M33b): cold blue, a
  // heavier and longer dash, and a ring round its satchel.
  leadPointStroke: PALETTE.blue,
  leadPointDash: '11 5',
  leadPointWidth: 4,
  leadRingRadius: 19,
  leadRingWidth: 3,
  labelLeading: 1.05, // a wrapped name's line height, in label sizes
  stampWidth: 138,
  stampHeight: 44,
  stampRotate: -12,
};

// Telephone wires from an objective to a pole on each of its charge points
// (M12), for a kind whose art has `wires` below: what a scout cuts.
// The line cut at the exchange (M16, the operator's: it should look like the
// power going): the lights in its windows flicker and die, the village round
// it dims in stutters, and sparks jump where each wire parted. Display only.
export const POWER_CUT = {
  // M17: quick white stutters, one step every `stepMs`, then gone.
  ms: 1100,
  stepMs: 65,
  flashHexes: 2.2, // how far round the exchange the flash reaches
  flashes: [0.9, 0, 0.75, 0, 0, 0.95, 0.1, 0.8, 0, 0, 0, 0.6, 0, 0.35, 0],
  windows: [1, 0.3, 1, 0.2, 1, 1, 0, 1, 0.4, 0, 0.8, 0, 0, 0.5, 0],
  sparkSize: 46,
};

// The knife (M16, the operator's): a red splat bursts on the enemy's hex, then
// fades to a faint stain left under the body. Display only.
export const KNIFE_SPLAT = {
  // M17: the stain spreads from a fifth of its size over the first 70% of
  // `ms`, wet and dark, then dries to its faint print.
  ms: 3000,
  fromScale: 0.2,
  spreadShare: 0.7,
  wetOpacity: 0.9,
  easing: 'cubic-bezier(0.15, 0.55, 0.35, 1)',
  stainSize: 62,
  stainOpacity: 0.5,
  stainOffset: { x: -2, y: 0 }, // near the hex's middle, so it shows beside the body
};

// The bowser's fuel hose (M30b): a fat rubber line from the tank to its
// charge point, sagging, with a brass nozzle at the satchel.
export const HOSE = {
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 4.5,
  casingWidth: 8.5,
  sag: 0.35, // how far it droops, as a share of its length
  nozzle: PALETTE.ochre,
  nozzleRadius: 3.2,
  // The bomb store's lead to its charge point (M33): a bomb trolley's two
  // rails, straight, with sleepers, instead of a rubber hose.
  // M35 (the operator's): a pixel heavier, and the gauge a little wider to
  // keep the two rails apart.
  rails: { gauge: 6.5, width: 2.3, sleeperEvery: 6, sleeperWidth: 1.8, sleeperOver: 2.2 },
};

export const WIRES = {
  stroke: PALETTE.ink,
  casing: PALETTE.paper,
  width: 2,
  sag: 0.08, // how far a wire droops at its middle, as a share of its length
  drop: 14, // how far a snapped end hangs
  insulatorGap: 6, // the standard's insulators, either side of its middle one
  poleSize: 34,
  poleAway: 0.42, // hex radii from the charge point's centre, away from the target
};

// Multi-hex objective art by objective kind (the kind ids in data/rules.json).
// Drawn centred on the footprint at the manifest's size. A kind with no entry
// is drawn as its outline only. `wires`: its lines run out to its charge points,
// from the point given in the art's own units (M14: the exchange's roof standard,
// on the crossarm).
const OBJECTIVE_ART = {
  // The desert's (M29). An aircraft's picture is picked by its `art` in the
  // map (the Stukas' or the Ju 52s'); everything else by its kind.
  stuka: { intact: 'objective-aircraft-stuka', destroyed: 'objective-aircraft-stuka-destroyed' },
  ju52: { intact: 'objective-aircraft-ju52', destroyed: 'objective-aircraft-ju52-destroyed' },
  // `hose` (M30b, the operator's): a fuel hose from the tank's tail, in the
  // art's own units, out to its charge point, so the bowser's point reads as its own.
  bowser: { intact: 'objective-fuel-bowser', destroyed: 'objective-fuel-bowser-destroyed', hose: { x: 7, y: 33 } },
  // The bomb store (M33): `hose` again, to its own charge point between the
  // two pens' points, but drawn as the store's trolley rails (`style`). They
  // leave its upper left (M35, the operator's: from the top they ran under the
  // S of STORE).
  bombStore: { intact: 'objective-bomb-store', destroyed: 'objective-bomb-store-destroyed', hose: { x: 21, y: 25, style: 'rails' } },
  signals: { intact: 'objective-signals-tent', destroyed: 'objective-signals-tent-destroyed', cut: 'objective-signals-tent-cut', wires: { x: 60, y: 12 } },
  bridge: { intact: 'objective-rail-bridge', destroyed: 'objective-bridge-destroyed' },
  exchange: { intact: 'objective-exchange', destroyed: 'objective-exchange-destroyed', cut: 'objective-exchange-cut', wires: { x: 100, y: 42.4 } },
  fuelDump: { intact: 'objective-fuel-dump', destroyed: 'objective-fuel-destroyed' },
  // The aqueduct's (M41).
  aqueduct: { intact: 'objective-aqueduct', destroyed: 'objective-aqueduct-destroyed' },
  roadBridge: { intact: 'objective-road-bridge', destroyed: 'objective-road-bridge-destroyed' },
};

/** The orders chevrons for a man's bonus from the leader: one, or two for more than one AP (M12). */
export function ordersMarkerId(bonus) {
  return bonus > 1 ? 'marker-orders-2' : 'marker-orders';
}

/** { id, width, height } for an objective as it stands, or null. */
export function objectiveArt(objective) {
  const art = OBJECTIVE_ART[objective.art ?? objective.kind];
  if (!art) return null;
  // Cut quietly, not blown (M16): its own picture where it has one.
  const id = objective.destroyed ? (objective.cut && art.cut ? art.cut : art.destroyed) : art.intact;
  const [, , width, height] = SPRITES[id].viewBox.split(' ').map(Number);
  return { id, width, height, wires: art.wires ?? null, hose: art.hose ?? null };
}

export const EXFIL = {
  stroke: PALETTE.green,
  casing: PALETTE.paper,
  width: 4,
  casingWidth: 8,
  label: PALETTE.green,
  art: 'objective-rally-point',
  // Shut, while its boat is not in (M41b, the operator's): danger red, dashed,
  // its label in red, and a wash of the sea over its hexes.
  shutStroke: PALETTE.red,
  shutDash: '9 8',
  shutWash: PALETTE.blue,
  shutWashOpacity: 0.28,
};

// The goods train (M34): a car to a hex along the railway, engine first. A
// wrecked car is thrown off the line's angle, each a different way, and the
// engine burns; a car over water (the fallen bridge) is printed fainter.
export const TRAIN = {
  engine: 'train-engine',
  wagon: 'train-wagon',
  width: 80,
  height: 46,
  wreckAngles: [24, -17, 31, -26, 14],
  wreckShift: 7,
  sunkOpacity: 0.6,
  flame: 'marker-blast',
  flameSize: 44,
  // It moves between turns (M35, the operator's): each car runs the hexes it
  // made in the garrison's turn at this pace, quicker than anyone walks, and
  // a wrecked one is thrown off the line once it has got there.
  msPerHex: 300,
  wreckMs: 320,
};

// The exfil's picture, by the map's `exfilArt` (M29): France's barn, or the
// trucks waiting at the airfield's rendezvous.
const EXFIL_ART = { barn: 'objective-rally-point', trucks: 'objective-trucks', boat: 'objective-boat' };

// The boat on its way in (M41): the exfil's own picture, printed out at sea
// and a little fainter until it is on the beach.
// It is drawn bow up, so it is turned to the way it is going, and between
// turns it is rowed in from where it was (M41b, the operator's).
export const BOAT = { art: 'objective-boat', width: 80, height: 92, comingOpacity: 0.8, rowMs: 2200 };

// What an enemy calls out when it spots a man or finds something (M41b, the
// operator's): a small bubble over its chip beside the "!", in the mission's
// own words (data/missions.json `words.cries`).
export const CRY = { size: 12, padX: 6, height: 17, advance: 0.66, lift: 6 };

export function exfilArtId(name) {
  return EXFIL_ART[name] ?? EXFIL.art;
}

export const BLAST = {
  fill: PALETTE.red,
  opacity: 0.18,
  stroke: PALETTE.red,
  casing: PALETTE.paper,
  width: 3,
  casingWidth: 6,
  previewOpacity: 0.08,
  // A charge burning past this turn (M30b): its blast to come.
  laterOpacity: 0.08,
  laterEdgeWidth: 2,
  laterEdgeDash: '6 5',
  // The ring where a blast only wounds a man (M20), lighter than where it
  // kills, which is edged in a dashed line inside the solid one.
  woundOpacity: 0.08,
  killEdgeWidth: 2,
  killEdgeDash: '6 5',
  // The starburst drawn where a charge went off, for a moment after the turn,
  // half as big again when it brings the target down.
  artSize: 150,
  destroyedScale: 1.5,
  // Around it (M11, to make a bang land): the page flashes, the board jolts,
  // a shock ring runs out to the edge of the blast, and smoke rolls up and
  // thins. The turn's card waits `holdMs` so all of it is seen.
  flash: PALETTE.paper,
  flashOpacity: 0.85,
  flashMs: 260,
  shakeMs: 480,
  shakePx: 7,
  ringStroke: PALETTE.ink,
  ringWidth: 7,
  ringMs: 520,
  smoke: PALETTE.ink,
  smokeOpacity: 0.3,
  smokePuffs: 7,
  smokeMs: 2300,
  holdMs: 1900,
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
  // The RAF flyover's aircraft sets off this long after its sound starts
  // (M17, the operator's): the engines are heard coming before it is seen.
  flyoverSoundLeadMs: 500,
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

// The airfield's diversion (M31): where a map gives a `diversionRun`, a
// vehicle drives it on the ground instead of the Dakota flying over, its guns
// flashing. `art` in the run picks it by name. Display only. Times in ms.
export const DRIVE_BY = {
  size: 110,
  driveMs: 3400,
  tailMs: 350,
  flashMs: 180, // one blink of the muzzle flash, on and off
  clearance: 1.2, // hex radii from its line: a counter nearer is in its way (M31)
  edgeGap: 4, // board units past half its size that it keeps inside the board's edge (M31d)
};
// `painted` is where the painted picture's muzzles are, in the 60-unit box,
// and which way they point (degrees, 0 east): the flash moves there when the
// painting loads (M31c: the operator's jeep has its twin guns firing astern).
export const DRIVE_BY_ART = {
  jeep: { body: 'vehicle-jeep', flash: 'vehicle-jeep-flash', painted: { muzzles: [[5.6, 27.2], [5.6, 31.5]], angle: 180 } },
};

/** A muzzle flash: a small fire-orange burst at (x, y), pointing `angle` degrees. */
function muzzleBurst(x, y, angle) {
  return svg('g', { transform: `translate(${x} ${y}) rotate(${angle})` }, [
    fill('M0 -1.2 L4 -3.2 L3.2 -0.8 L7.5 0 L3.2 0.8 L4 3.2 L0 1.2 Z', 'fire'),
    fill('M0.5 -0.6 L3.5 0 L0.5 0.6 Z', 'paper'),
  ]);
}

// A painted vehicle (M31, ART-PROMPTS.md Priority 15): assets/vehicles/<body
// id>.png, from above, nose to the east, on transparency, replaces the drawn
// one once it loads, and its muzzle flashes move to the painting's muzzles.
// Only a map with a diversionRun asks for one. A missing file is fine.
export const VEHICLE_FILES = { dir: 'assets/vehicles', size: 60 };

export function loadSuppliedVehicle(art) {
  const body = DRIVE_BY_ART[art]?.body;
  if (!body) return Promise.resolve();
  const url = `${VEHICLE_FILES.dir}/${body}.png`;
  return picture(url).then((ok) => {
    if (!ok) return;
    document.getElementById(body)?.replaceChildren(svg('image', { href: url, x: 0, y: 0, width: VEHICLE_FILES.size, height: VEHICLE_FILES.size }));
    const { muzzles, angle } = DRIVE_BY_ART[art].painted;
    document.getElementById(DRIVE_BY_ART[art].flash)?.replaceChildren(...muzzles.map(([x, y]) => muzzleBurst(x, y, angle)));
  });
}

// Before a run is picked (M16, the operator's): a faint grey Dakota flies each
// drop line over and over, staggered, so the lines read as flight paths.
// Display only and silent.
export const DROP_GHOST = {
  flightMs: 7000, // slow: it is a suggestion, not the drop
  gapMs: 2400, // unseen between passes
  opacity: 0.38,
  scale: 0.8, // of DROP_SHOW.aircraftSize
};

// The marker-pen rings round the targets before the drop (SPEC.md §11): a
// loop that overshoots where it started, twice round the primary, drawn on
// once and then left; a note beside each in the lettering.
// Where to start (M21, from playtesting): big pen lettering among the drop
// runs' names — PICK A DROP RUN!, then SPACE TO JUMP! — and, once the stick
// is down, a pen ring round each man who can act until one is selected.
export const CUE = {
  colour: PALETTE.red,
  halo: PALETTE.paper,
  size: 54,
  subSize: 25,
  nudge: { x: 92, y: -44 }, // from the middle of the three runs' names (y −18 until M22: it sat on the west and east tabs; x 0 until M24, when the North tab moved left and PICK A DROP DIRECTION ran off the map's left edge)
  pulseMs: 2800, // the men's rings' throb: half the speed of M21's 1400 (M22, the operator's); the drop's lettering is still since M24
  pulseScale: 1.035, // half M21's swell of 1.07
  ringRadius: 40, // round a counter's middle, in board units
  ringWidth: 4.5,
  ringOpacity: 0.5, // M22, the operator's: the rings at full strength were loud
  noteSize: 22,
  // CHARGE IS SET. GET CLEAR! over a target a charge was just set on (M37).
  chargeNoteSize: 30,
  chargeNoteTilt: -5,
  noteAdvance: 0.72, // a letter's width in the pen lettering, in note sizes, for keeping a note on the board
  noteEdgeGap: 14,
};

// A supply canister on the board (SPEC.md §9, §11; M42b, the operator's).
// `dots`: a fire-orange dot for each charge still in it, as a man's counter
// counts his, under the hex's middle and over any counter, so they show with
// a man standing on it. `cue`: once the stick is down, each is ringed and
// named in blue until the player first selects a man.
export const CANISTER = {
  dots: { radius: 4.6, pitch: 11.5, y: 31, fill: PALETTE.fire, stroke: PALETTE.ink, strokeWidth: 1.2 },
  cue: { colour: PALETTE.leader, halo: PALETTE.paper, ringRadius: 30, ringWidth: 3.5, size: 15, words: 'CHARGE CANISTER', advance: 0.7, gap: 8 },
};

export const RINGS = {
  red: PALETTE.red,
  green: PALETTE.green,
  bigNoteScale: 1.45, // a ring's `bigNote` lines (M41b): the boat's turn
  width: 4.5,
  margin: 14, // beyond the footprint's hexes
  tightMargin: 2, // where many targets are ringed with their charge points (M29b)
  overshoot: 0.14, // of a turn past the start
  opacity: 0.8, // a touch under full, so what it crosses still shows (M12)
  wobble: 0.05, // of the radius
  drawMs: 650,
  staggerMs: 180,
  noteSize: 17,
  noteLeading: 1.05, // of noteSize, between a note's lines
  halo: PALETTE.paper,
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
/**
 * BOOM over the blast, in the comic lettering of the pen notes on the map
 * (M21, the operator's: the stencil read as print, not as a bang).
 */
// BOOM! in ink with a paper outline, so it reads over the painted blast, and
// tipped up off the level like a comic's sound effect (M22, the operator's).
function boomLabel() {
  return label('BOOM!', {
    x: 100, y: 104, 'font-size': 40, 'font-family': TYPE.lettering, class: 'ink stroke-paper', 'letter-spacing': 1,
    'stroke-width': 5, 'stroke-linejoin': 'round', 'paint-order': 'stroke', transform: 'rotate(-16 100 104)',
  });
}

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
    // The body's colour is --counter-body, green unless a mission names its
    // own (M31d, applyCounterColour).
    fill(ALLIED_OUTLINE, 'counter-body'),
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

// --- trees and hedges (M17, redrawn after the operator's references,
// assets/reference/Woods_, Hedgerows_ and Orchard_Reference_01.jpeg) --------
// Crowns are billows of round scallops, inked, darker on the side away from
// the light, with a few curls of ink inside for the leaves; each throws a
// solid ink shadow down and to the right, as the counters do, with a fringe
// of halftone past it. The shadows are sprites of their own so board.js can
// print every shadow of a wood before any crown, and no crown is darkened by
// its neighbour's shadow falling over it. The shapes are fixed by where each
// crown stands, never rolled, so the map is the same every time.

/** A billowing crown's outline: `bumps` round scallops on a circle of radius r, fixed by (x, y). */
function billowPath(x, y, r, bumps, seed = 0) {
  const rng = createRng((Math.round(x * 7) * 92821) ^ (Math.round(y * 7) * 68917) ^ (seed * 31337));
  rng.next();
  const points = [];
  for (let i = 0; i < bumps; i++) {
    const a = ((i + (rng.next() - 0.5) * 0.35) / bumps) * Math.PI * 2;
    const k = 0.84 + rng.next() * 0.12;
    points.push({ x: x + Math.cos(a) * r * k, y: y + Math.sin(a) * r * k });
  }
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  points.forEach((p, i) => {
    const n = points[(i + 1) % points.length];
    const chord = Math.hypot(n.x - p.x, n.y - p.y);
    d += ` A${(chord * 0.58).toFixed(1)} ${(chord * 0.58).toFixed(1)} 0 0 1 ${n.x.toFixed(1)} ${n.y.toFixed(1)}`;
  });
  return `${d} Z`;
}

// How far a crown's shadow falls, as a share of its radius: the solid shadow,
// and the halftone fringe past it.
export const CANOPY = { shadow: [0.26, 0.3], fringe: [0.5, 0.56], fringeTone: 50, shade: 35, woodScale: 1.18 };

// A wood is crowded crowns (M17): five a hex, [x, y, radius] in the hex's
// 80 x 92, big enough (with CANOPY.woodScale) to meet their neighbours' and
// hide the floor but for gaps of shade.
const WOOD_CROWNS = [
  [[24, 30, 14], [54, 26, 13], [40, 52, 15], [20, 66, 12], [60, 64, 13]],
  [[36, 24, 14], [62, 40, 12], [22, 46, 13], [46, 58, 15], [30, 76, 11]],
  [[20, 28, 12], [46, 30, 15], [28, 58, 14], [58, 60, 13], [44, 80, 11]],
];

/**
 * A crown at (x, y), radius r: dark screen on its shaded side, the lit face
 * over it, the ink edge and a few curls of leaf. `bumps` sets how billowy.
 */
function crown(x, y, r, bumps = 9, seed = 0) {
  const d = billowPath(x, y, r, bumps, seed);
  const lit = billowPath(x - r * 0.13, y - r * 0.15, r * 0.8, bumps, seed + 1);
  const curls = [];
  // Two or three curls on the shaded side: the leaf masses of the reference.
  for (const [ax, ay, k] of [[0.28, 0.2, 0.34], [-0.22, 0.38, 0.28], [0.42, -0.2, 0.24]].slice(0, r > 9 ? 3 : 2)) {
    const cx = x + ax * r, cy = y + ay * r, cr = r * k;
    curls.push(line(`M${(cx - cr).toFixed(1)} ${cy.toFixed(1)} A${cr.toFixed(1)} ${cr.toFixed(1)} 0 0 0 ${(cx + cr * 0.7).toFixed(1)} ${(cy - cr * 0.7).toFixed(1)}`, Math.max(0.9, r * 0.075)));
  }
  return [fill(d, 'green'), fill(d, toneClass('ink', CANOPY.shade)), fill(lit, 'green'), line(d, Math.max(1.1, r * 0.11)), ...curls];
}

/** The shadow a crown throws: solid ink, and a halftone fringe past it. */
function crownShadow(x, y, r, bumps = 9, seed = 0) {
  const [sx, sy] = CANOPY.shadow, [fx, fy] = CANOPY.fringe;
  return [
    fill(billowPath(x + r * fx, y + r * fy, r * 0.98, bumps, seed), toneClass('ink', CANOPY.fringeTone)),
    fill(billowPath(x + r * sx, y + r * sy, r, bumps, seed), 'ink'),
  ];
}

/**
 * An orchard tree (M20, the operator's: the round flat crowns read as oil
 * drums): the wood's billowing crown, smaller and less billowy, on a lattice
 * so the rows run on across the orchard. `v` is the hex's variant, so its
 * trees are not the same six as its neighbour's.
 */
function appleTree(x, y, v) {
  return crown(x, y, ORCHARD.radius, ORCHARD.bumps, v);
}

function appleTreeShadow(x, y, v) {
  return crownShadow(x, y, ORCHARD.radius, ORCHARD.bumps, v);
}

// The orchard is planted in rows (the reference): trees on a lattice of
// columns 40 apart and 23 down them, which every hex shares — its centre is
// on a multiple of 40 across and of 69 down — so the rows run unbroken
// across the whole orchard. Six trees a hex, small, with the grass and the
// odd windfall apple between the rows.
export const ORCHARD = { radius: 10.5, bumps: 7, columns: [20, 60], rows: [23, 46, 69] };

function orchardTrees(draw, v) {
  return ORCHARD.columns.flatMap((x) => ORCHARD.rows.flatMap((y) => draw(x, y, v)));
}

/** A windfall apple, with a short stalk (M20: without one it read as a ball or a bomb). */
function apple(x, y) {
  return [line(`M${x + 0.2} ${y - 1.6} L${x + 1.1} ${y - 4}`, 0.9), circle(x, y, 1.9, 'red'), ring(x, y, 1.9, 0.7)];
}

// A hedge is a run of clumps along its line (board.js lays them), each a
// small billow, with now and then a tree grown up out of it.
// The perimeter wire (M29), laid along its line like a hedge: a strand of
// ink, a picket every `postEvery`, and a coil of concertina every `spacing`.
export const WIRE = { width: 1.6, spacing: 7, coil: 4.4, coilWidth: 1.1, postEvery: 3, postLength: 9, postWidth: 2 };

export const HEDGE_CLUMP = { variants: 3, size: 24, spacing: 8.2, scale: [0.9, 1.15], jitter: 1.6, treeEvery: 9, treeScale: 1.5 };

function hedgeClump(v) {
  return crown(12, 12, 8, 7, v);
}

function hedgeClumpShadow(v) {
  return crownShadow(12, 12, 8, 7, v);
}

/** Clumps along a short line for a hedgerow hex with no hedgerow beside it. */
function hedgeRow(points) {
  return [...points.flatMap(([x, y], i) => crownShadow(x, y, 8, 7, i)), ...points.flatMap(([x, y], i) => crown(x, y, 8, 7, i))];
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

  'terrain-hedgerow-01': () => hedgeRow([[10, 46], [22, 44], [34, 47], [46, 44], [58, 46], [70, 44]]),
  'terrain-hedgerow-02': () => hedgeRow([[22, 16], [28, 30], [34, 44], [40, 58], [46, 72], [52, 84]]),
  'terrain-hedgerow-03': () => hedgeRow([[14, 66], [25, 58], [36, 50], [47, 42], [58, 34], [69, 26]]),

  'terrain-wood-01': () => WOOD_CROWNS[0].flatMap(([x, y, r]) => crown(x, y, r * CANOPY.woodScale)),
  'terrain-wood-02': () => WOOD_CROWNS[1].flatMap(([x, y, r]) => crown(x, y, r * CANOPY.woodScale)),
  'terrain-wood-03': () => WOOD_CROWNS[2].flatMap(([x, y, r]) => crown(x, y, r * CANOPY.woodScale)),
  'terrain-wood-01-shadow': () => WOOD_CROWNS[0].flatMap(([x, y, r]) => crownShadow(x, y, r * CANOPY.woodScale)),
  'terrain-wood-02-shadow': () => WOOD_CROWNS[1].flatMap(([x, y, r]) => crownShadow(x, y, r * CANOPY.woodScale)),
  'terrain-wood-03-shadow': () => WOOD_CROWNS[2].flatMap(([x, y, r]) => crownShadow(x, y, r * CANOPY.woodScale)),

  // Rows of trees (M17), the same lattice in every hex; the variants differ
  // only in the grass and the apples between the rows.
  'terrain-orchard-01': () => [tuft(40, 30, 0.7), tuft(40, 60, 0.6), tuft(4, 52, 0.6), ...apple(36, 44), ...orchardTrees(appleTree, 1)],
  'terrain-orchard-02': () => [tuft(40, 40, 0.7), tuft(78, 64, 0.6), tuft(41, 76, 0.5), ...apple(44, 60), ...orchardTrees(appleTree, 2)],
  'terrain-orchard-03': () => [tuft(40, 22, 0.6), tuft(40, 52, 0.7), tuft(2, 34, 0.5), ...orchardTrees(appleTree, 3)],
  'terrain-orchard-01-shadow': () => orchardTrees(appleTreeShadow, 1),
  'terrain-orchard-02-shadow': () => orchardTrees(appleTreeShadow, 2),
  'terrain-orchard-03-shadow': () => orchardTrees(appleTreeShadow, 3),

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

  // A farm round its yard, after the operator's reference (M14; it was one
  // cottage): seen from the south-west like the exchange, the half-timbered
  // house under red tiles along the back with its chimney, the stone barn
  // under slate on the right with its arched cart door, a haystack, and the
  // yard wall across the front with a gap for the gate. Ferme Lebrun is the
  // only farmhouse hex not under an objective, so this is its picture. Bold
  // shapes only: a hex is about 30 px across at 1280x800.
  'terrain-farmhouse': () => {
    const yard = 'M10 60 L40 52 L72 60 L66 76 L40 82 L14 76 Z';
    const front = 'M10 36 H44 V52 H10 Z';
    const gable = 'M44 52 V36 L49 26 L54 33 V48 Z';
    const roof = 'M8 37 H45 L50 25 H16 Z';
    const barnFront = 'M52 50 H70 V66 H52 Z';
    const barnGable = 'M70 66 V50 L73 44 L76 48 V62 Z';
    const barnRoof = 'M50 51 H71 L74 43 H55 Z';
    const wall = 'M8 68 L30 75 V81 L8 74 Z M38 77 L68 68 V74 L38 83 Z';
    return [
      fill(yard, toneClass('ink', 10)),
      // The house: tiles, then its timber frame over the plaster.
      ...inked(front, 'paper', 1.4),
      line('M16 36 V52 M23 36 V52 M31 36 V52 M38 36 V52 M10 44 H44 M16 44 L23 36 M31 44 L38 36', 0.8, 'stroke-ink', { opacity: 0.75 }),
      ...inked(gable, 'paper', 1.4), fill(gable, 'ink', { 'fill-opacity': 0.22 }),
      ...inked(roof, 'red', 1.4), fill(roof, toneClass('ink', 20)),
      line('M11 31 H47 M13.5 28 H48.5', 0.7, 'stroke-ink', { opacity: 0.5 }),
      ...inked('M37 27 V20 H42 V27', 'paper', 1.2),
      ...inked('M25 46 H30 V52 H25 Z', 'ink', 0.8),
      ...inked('M13 39 H17 V42 H13 Z', 'blue', 0.8), ...inked('M34 46 H38 V49 H34 Z', 'blue', 0.8),
      // The barn: stone, slate, the cart door arched.
      ...inked(barnFront, 'paper', 1.4), fill(barnFront, toneClass('ink', 10)),
      ...inked(barnGable, 'paper', 1.4), fill(barnGable, 'ink', { 'fill-opacity': 0.22 }),
      ...inked(barnRoof, 'blue', 1.4),
      ...inked('M56 66 V58 Q61 52 66 58 V66 Z', 'ink', 0.8),
      // The haystack in the yard, by the barn.
      ...inked('M41 66 Q41 56 46 55 Q51 56 51 66 Z', 'paper', 1.2),
      line('M42.5 60 Q46 58.5 49.5 60 M41.5 63.5 Q46 62 50.5 63.5', 0.7, 'stroke-ink', { opacity: 0.6 }),
      // The yard wall across the front, open for the gate.
      ...inked(wall, 'paper', 1.2), fill(wall, toneClass('ink', 20)),
      line('M19 71.5 V77.5 M53 72.5 V78.5', 0.7, 'stroke-ink', { opacity: 0.6 }),
      line('M30 74 V82 M38 76 V84', 2),
    ];
  },

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

// One tongue of flame standing on (x, y): w half its width at the root, h its
// height, its tip leaning `lean` to one side, the root rounded under.
function tongue(x, y, w, h, lean = 0) {
  return `M${x - w} ${y} C${x - w * 1.25} ${y - h * 0.45} ${x - w * 0.2 + lean * 0.5} ${y - h * 0.62} ${x + lean} ${y - h} `
    + `C${x + w * 0.45 + lean * 0.3} ${y - h * 0.6} ${x + w * 1.2} ${y - h * 0.42} ${x + w} ${y} Q${x} ${y + w * 0.45} ${x - w} ${y} Z`;
}

// A fire (M14, the operator's: the old flame was one red blob): a warm glow
// on the ground, three red tongues edged in ink, orange inside them, a paper
// core in the tallest, and embers going up.
function flame(x, y, s) {
  const tongues = (k) => [
    tongue(x - 7 * s, y, 6 * k * s, 20 * k * s, -4 * s),
    tongue(x + 7 * s, y, 6 * k * s, 23 * k * s, 4 * s),
    tongue(x, y, 9 * k * s, 32 * k * s, 1.5 * s),
  ];
  return [
    svg('ellipse', { cx: x, cy: y - 2 * s, rx: 18 * s, ry: 7 * s, class: toneClass('fire', 50) }),
    ...tongues(1).map((d) => fill(d, 'red')),
    ...tongues(1).map((d) => line(d, 1.3)),
    ...tongues(0.68).map((d) => fill(d, 'fire')),
    fill(tongue(x + 0.5 * s, y, 3.6 * s, 14 * s, 1 * s), 'paper'),
    circle(x - 9 * s, y - 29 * s, 1.5 * s, 'fire'), circle(x + 8 * s, y - 33 * s, 1.2 * s, 'red'), circle(x + 2 * s, y - 40 * s, 1 * s, 'fire'),
  ];
}

// A fuel drum seen from above: a disc, its rim and its filler cap.
function drum(x, y, cls = 'green') {
  return [circle(x, y, 5.6, cls), ring(x, y, 5.6, 1.3), ring(x, y, 3.4, 0.7), circle(x + 2, y - 2, 1.1, 'ink')];
}

// The dump's trodden ground, inside its three hexes.
const FUEL_GROUND = 'M46 40 Q120 30 198 38 L200 104 Q176 110 160 112 L158 164 Q120 176 84 166 L80 112 Q60 108 44 104 Z';

// Twelve drums in one neat stack, four by three: few enough to read as a
// dump at a glance (M11: the forty-drum park made the corner too busy to
// approach), all one colour so nothing in it reads as a marker.
function drumPark() {
  const parts = [];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 3; row++) parts.push(...drum(70 + col * 14, 56 + row * 14));
  }
  return parts;
}

// A camouflage net over a second stack, pegged at its corners: printed green,
// a little ink mottling, the drums under it left to the imagination.
function camouflageNet() {
  const net = 'M134 46 Q160 42 184 46 Q188 70 184 94 Q162 99 140 96 Q132 72 134 46 Z';
  const mottle = 'M146 56 q8 -4 12 3 q-4 7 -12 -3 Z M166 70 q9 2 8 9 q-9 1 -8 -9 Z M150 82 q8 -2 10 4 q-6 5 -10 -4 Z';
  return [
    line('M134 46 L128 40 M184 46 L190 40 M184 94 L190 100 M140 96 L134 102', 1.1, 'stroke-ink', { opacity: 0.6 }),
    ...[[128, 40], [190, 40], [190, 100], [134, 102]].map(([x, y]) => circle(x, y, 1.6, 'ink')),
    fill(net, 'green', { 'fill-opacity': 0.75 }),
    fill(mottle, 'ink', { 'fill-opacity': 0.3 }),
    line(net, 1.6, 'stroke-ink', { 'stroke-dasharray': '5 2.5' }),
  ];
}

// The bowser, nose east: a tanker on a lorry, its hatches along the top.
function bowser(burnt) {
  const tank = 'M92 124 H136 V144 H92 Q86 144 86 134 Q86 124 92 124 Z';
  const cab = 'M136 125 H148 Q154 125 154 131 V137 Q154 143 148 143 H136 Z';
  const cls = burnt ? 'ink' : 'green';
  const parts = [...inked(tank, cls, 2), ...inked(cab, cls, 2)];
  if (burnt) return [...parts, fill(tank, 'ink', { 'fill-opacity': 0.5 }), line('M100 124 L96 116 M126 144 L130 150', 1.6)];
  return [
    ...parts,
    line('M90 134 H134', 1, 'stroke-ink', { opacity: 0.5 }),
    circle(102, 134, 3.2, 'paper'), ring(102, 134, 3.2, 1.2), circle(122, 134, 3.2, 'paper'), ring(122, 134, 3.2, 1.2),
    ...inked('M146 127 H150 V141 H146 Z', 'blue', 1),
  ];
}

// A telephone pole: the post, a crossarm and its insulators.
function pole(x, y, h, lean = 0) {
  const top = { x: x + lean, y: y - h };
  return [
    line(`M${x} ${y} L${top.x} ${top.y}`, 2.4),
    line(`M${top.x - 8} ${top.y + 4} H${top.x + 8}`, 2),
    ...[-6, 0, 6].flatMap((dx) => [circle(top.x + dx, top.y + 2.4, 1.4, 'paper'), ring(top.x + dx, top.y + 2.4, 1.4, 0.8)]),
  ];
}

// Stone coursing over a rectangle: rows of blocks, joints staggered, printed faint.
function stonework(x0, y0, x1, y1, row = 6, block = 10, opacity = 0.4) {
  let d = '';
  for (let y = y0 + row; y < y1 - 0.5; y += row) d += `M${x0} ${y} H${x1} `;
  for (let y = y0, k = 0; y < y1 - 0.5; y += row, k++) {
    for (let x = x0 + (k % 2 ? block / 2 : block); x < x1 - 1; x += block) d += `M${x} ${y} V${Math.min(y + row, y1)} `;
  }
  return line(d, 0.8, 'stroke-ink', { opacity });
}

// The village's gravel square in front of the exchange.
function gravelYard() {
  const yard = 'M38 140 Q42 126 60 132 L126 132 Q152 128 158 142 Q154 162 112 164 Q70 168 46 158 Q34 150 38 140 Z';
  const stones = [];
  for (let i = 0; i < 46; i++) stones.push(`M${(44 + ((i * 37) % 108)).toFixed(1)} ${(136 + ((i * 23) % 26)).toFixed(1)} h1.2`);
  return [fill(yard, 'ink', { 'fill-opacity': 0.08 }), line(stones.join(' '), 1.3, 'stroke-ink', { opacity: 0.45 })];
}

// The exchange house from the south-west: the front wall, the east gable in
// shadow, the slate roof's front slope with two chimneys, used intact and gutted.
// `dark` (M16): the line cut, the house standing with its lights out.
function exchangeBuilding(gutted, dark = false) {
  const front = 'M58 88 H122 V134 H58 Z';
  const gable = 'M122 134 V88 L131 58 L140 77 V123 Z';
  const roof = 'M55 89 H124 L132 57 H64 Z';
  const parts = [
    ...inked(front, 'paper', 2.4), stonework(58, 88, 122, 134, 5.5, 9, 0.3),
    ...inked(gable, 'paper', 2.4), fill(gable, 'ink', { 'fill-opacity': 0.22 }),
  ];
  if (gutted) {
    // Roof gone: charred rafters over a black shell, the walls still up.
    parts.push(fill('M58 88 H122 L130 60 H66 Z', 'ink', { 'fill-opacity': 0.75 }));
    parts.push(line('M58 88 L70 70 L80 82 L92 62 L104 80 L116 64 L122 88 M72 62 L84 88 M96 60 L102 88', 2));
  } else {
    parts.push(...inked(roof, 'blue', 2.4));
    // Slate courses, parallel to the eaves.
    let slates = '';
    for (const t of [0.22, 0.44, 0.66, 0.86]) slates += `M${55 + 9 * t} ${89 - 32 * t} H${124 + 8 * t} `;
    parts.push(line(slates, 0.9, 'stroke-ink', { opacity: 0.55 }));
    for (const x of [68, 118]) {
      parts.push(...inked(`M${x} 46 h8 v14 h-8 Z`, 'paper', 1.4), stonework(x, 46, x + 8, 60, 4.5, 8, 0.35));
      parts.push(svg('rect', { x: x + 1.5, y: 42, width: 2, height: 4, class: 'ink' }), svg('rect', { x: x + 4.5, y: 42, width: 2, height: 4, class: 'ink' }));
    }
  }
  // The PTT board, the windows and the door.
  if (!gutted) {
    parts.push(...inked('M70 91 H110 V100 H70 Z', 'blue', 1.4));
    parts.push(label('PTT', { x: 90, y: 95.8, 'font-size': 8, class: 'paper', 'letter-spacing': 1.5 }));
  }
  for (const [x, y] of [[62, 103], [85, 103], [108, 103], [62, 118], [108, 118]]) {
    parts.push(...inked(`M${x} ${y} h10 v10 h-10 Z`, gutted || dark ? 'ink' : 'blue', 1.4));
    if (!gutted) parts.push(line(`M${x + 5} ${y} v10 M${x} ${y + 5} h10`, 0.8, 'stroke-paper', dark ? { opacity: 0.5 } : {}));
  }
  parts.push(...inked('M85 118 h10 v16 h-10 Z', gutted ? 'ink' : 'green', 1.4));
  // A window in the gable end.
  parts.push(...inked('M127 98 L134 94 V104 L127 108 Z', gutted || dark ? 'ink' : 'blue', 1.2));
  return parts;
}

// The line: poles along the square and the wires to the house and away east,
// off the edge of the art. Blown, the east pole leans and its wires hang.
// The exchange's roof standard (M14): a short post on the ridge with a
// crossarm, where every line from the charge points comes in — board.js runs
// the wires to it (OBJECTIVE_ART.exchange.wires). The poles that stood beside
// the house went: the charge points carry the poles now. Blown, it still
// stands on the charred rafters, and the wires hang snapped from it.
function roofStandard() {
  return pole(100, 58, 18);
}

// The village church, the landmark Vance's landing line refers to (SPEC.md §11),
// seen from the south-west like the exchange: a stone tower and spire, and the
// nave behind it with its own slate roof.
function church() {
  const naveFront = 'M30 52 H62 V84 H30 Z';
  const naveGable = 'M62 84 V52 L66 38 L70 47 V79 Z';
  const naveRoof = 'M28 53 H63 L67 37 H33 Z';
  const tower = 'M14 28 H30 V84 H14 Z';
  const towerSide = 'M30 84 V28 L38 23 V79 Z';
  return [
    ...inked(naveFront, 'paper', 2), stonework(30, 52, 62, 84, 5, 8, 0.3),
    ...inked(naveGable, 'paper', 2), fill(naveGable, 'ink', { 'fill-opacity': 0.22 }),
    ...inked(naveRoof, 'blue', 2),
    ...inked('M42 62 a4 4 0 0 1 8 0 v14 h-8 Z', 'blue', 1.2),
    ...inked(tower, 'paper', 2), stonework(14, 28, 30, 84, 5, 8, 0.3),
    ...inked(towerSide, 'paper', 2), fill(towerSide, 'ink', { 'fill-opacity': 0.22 }),
    ...inked('M18 38 a2.5 2.5 0 0 1 5 0 v7 h-5 Z M24 38 a2.5 2.5 0 0 1 5 0 v7 h-5 Z', 'ink', 0.8),
    ...inked('M18 70 a4 4 0 0 1 8 0 v14 h-8 Z', 'ink', 1),
    // The spire: two faces of a pyramid, the east one in shadow.
    ...inked('M13 29 H31 L26 -6 Z', 'blue', 2),
    fill('M31 29 L39 24 L26 -6 Z', 'blue'), fill('M31 29 L39 24 L26 -6 Z', 'ink', { 'fill-opacity': 0.35 }), line('M31 29 L39 24 L26 -6 Z', 2),
    line('M26 -6 V-15 M22 -11.5 H30', 1.8),
  ];
}

// --- portraits ----------------------------------------------------------------
// ART-ASSETS.md §2: head and shoulders for the roster rail (240 x 300) and a
// silhouette chip for the counter (32 x 32). Every man's portrait is supplied
// (assets/portraits); this is the stand-in for a man with none, so a seventh
// man is still one JSON entry. Until M25 each of the six had a drawn face of
// his own here, kept long after the painted ones replaced them.

// Printed flat, not screened (M7b): each tone is its spot colour at an
// opacity, lit from the left by the moon, with a heavy ink line round it.
function fallbackPortrait() {
  const cx = 120, faceW = 44, jawW = 32, chinY = 214, neck = 22;
  const shade = (d) => fill(d, 'ink', { 'fill-opacity': 0.16 });
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
  // Neck.
  parts.push(...inked(`M${cx - neck} 196 L${cx - neck} 230 Q${cx} 242 ${cx + neck} 230 L${cx + neck} 196 Z`, 'paper', 3.5));
  parts.push(shade(`M${cx - neck} 200 L${cx - neck} 230 Q${cx} 242 ${cx + neck} 230 L${cx + neck} 214 Z`));
  // Ears, behind the face.
  for (const side of [-1, 1]) {
    const x = cx + side * (faceW + 2);
    parts.push(svg('ellipse', { cx: x, cy: 150, rx: 7, ry: 13, class: 'paper' }));
    parts.push(svg('ellipse', { cx: x, cy: 150, rx: 7, ry: 13, fill: 'none', class: 'stroke-ink', 'stroke-width': 3.5 }));
  }
  // Face: paper warmed a touch, the right side in shadow, and burnt cork
  // smudged across the cheeks for the night.
  const face = `M${cx - faceW} 112 C${cx - faceW} 180 ${cx - jawW} ${chinY - 12} ${cx} ${chinY} C${cx + jawW} ${chinY - 12} ${cx + faceW} 180 ${cx + faceW} 112 Z`;
  parts.push(fill(face, 'paper'));
  parts.push(fill(face, 'red', { 'fill-opacity': 0.1 }));
  parts.push(shade(`M${cx + 8} 112 C${cx + 14} 150 ${cx + 4} 190 ${cx + 8} ${chinY - 2} C${cx + jawW} ${chinY - 12} ${cx + faceW} 180 ${cx + faceW} 112 Z`));
  parts.push(fill(`M${cx - faceW + 6} 166 Q${cx - 24} 158 ${cx - 12} 170 Q${cx - 26} 176 ${cx - faceW + 8} 178 Z M${cx + faceW - 6} 166 Q${cx + 24} 158 ${cx + 12} 170 Q${cx + 26} 176 ${cx + faceW - 8} 178 Z`, 'ink', { 'fill-opacity': 0.13 }));
  parts.push(line(face, 3.5));
  // Eyes and brows.
  parts.push(line(`M${cx - 33} 141 Q${cx - 22} 136 ${cx - 10} 139 M${cx + 10} 139 Q${cx + 22} 136 ${cx + 33} 141`, 4.5));
  for (const side of [-1, 1]) {
    const x = cx + side * 19;
    parts.push(svg('ellipse', { cx: x, cy: 154, rx: 7, ry: 4, class: 'paper' }));
    parts.push(circle(x + 1, 154, 3, 'ink'));
    parts.push(line(`M${x - 8} 153 Q${x} 147 ${x + 8} 153`, 3));
  }
  // Nose and mouth.
  parts.push(line(`M${cx + 2} 150 L${cx - 6} 181 L${cx + 6} 184`, 3.5));
  parts.push(line(`M${cx - 12} 199 L${cx + 12} 199`, 3.5));
  // The para helmet, rimless, shaded on the right, and its chin strap.
  const hw = faceW + 13;
  const helm = `M${cx - hw} 132 C${cx - hw - 4} 52 ${cx + hw + 4} 52 ${cx + hw} 132 Q${cx} 116 ${cx - hw} 132 Z`;
  parts.push(fill(helm, 'green'));
  parts.push(fill(`M${cx + 10} 58 C${cx + hw} 60 ${cx + hw + 4} 100 ${cx + hw} 132 Q${cx + 30} 122 ${cx + 12} 121 Z`, 'ink', { 'fill-opacity': 0.25 }));
  parts.push(line(`M${cx - hw + 16} 84 Q${cx - 22} 62 ${cx + 2} 64`, 5, 'stroke-paper', { opacity: 0.6 }));
  parts.push(line(helm, 4));
  parts.push(line(`M${cx - faceW + 4} 128 L${cx - jawW + 2} ${chinY - 14} Q${cx} ${chinY + 6} ${cx + jawW - 2} ${chinY - 14} L${cx + faceW - 4} 128`, 2.6, 'stroke-ink', { opacity: 0.85 }));
  parts.push(svg('rect', { x: 1.5, y: 1.5, width: 237, height: 297, fill: 'none', class: 'stroke-ink', 'stroke-width': 3 }));
  parts.push(label('?', { x: 120, y: 280, 'font-size': 30, class: 'paper' }));
  return parts;
}

function fallbackChip() {
  const helm = 'M3 17 C2 3 30 3 29 17 Q16 13 3 17 Z';
  const face = 'M7.5 15 C7.5 26 11.75 30 16 30 C20.25 30 24.5 26 24.5 15 Z';
  return [
    ...inked(face, 'paper', 1.4), fill(face, toneClass('red', 10)),
    circle(12.5, 20, 1.1, 'ink'), circle(19.5, 20, 1.1, 'ink'),
    ...inked(helm, 'green', 1.6), fill(helm, toneClass('ink', 35)),
  ];
}

// --- chrome -------------------------------------------------------------------

// The bridge's stone abutments on either bank, each with wing walls splayed
// back along the towpath, and the track across its deck, drawn to match the
// railway either side (RAIL, board.js). The east side is the west mirrored.
function bridgeAbutments() {
  const west = [
    ...inked('M104 24 L94 24 L84 2 L94 2 Z', 'paper', 2), ...inked('M104 72 L94 72 L84 94 L94 94 Z', 'paper', 2),
    line('M89.5 8 H97 M92 16 H100.5 M89.5 88 H97 M92 80 H100.5', 0.8, 'stroke-ink', { opacity: 0.5 }),
    ...inked('M78 24 H104 V72 H78 Z', 'paper', 2.2), stonework(78, 24, 104, 72, 6, 9, 0.45),
  ];
  return [...west, svg('g', { transform: 'translate(280 0) scale(-1 1)' }, west.map((node) => node.cloneNode(true)))];
}

// A plate girder along each side of the deck: the north one seen from above,
// the south one showing its face and the stiffeners down it.
function plateGirders(from, to) {
  let stiffeners = '';
  for (let x = from + 6; x < to - 2; x += 12) stiffeners += `M${x} 61 V70 M${x} 31 V36 `;
  return [
    fill(`M${from} 30 H${to} V36 H${from} Z`, 'ink', { 'fill-opacity': 0.55 }), line(`M${from} 30 H${to} V36 H${from} Z`, 1.8),
    fill(`M${from} 60 H${to} V70 H${from} Z`, 'ink', { 'fill-opacity': 0.45 }), line(`M${from} 60 H${to} V70 H${from} Z`, 1.8),
    line(`M${from} 62 H${to}`, 1.4),
    line(stiffeners, 1, 'stroke-paper', { opacity: 0.7 }),
  ];
}

// Mooring bollards on the towpath by the bridge.
function bollards(points) {
  return points.flatMap(([x, y]) => [circle(x, y, 2.8, 'ink'), circle(x - 0.8, y - 0.8, 1, 'paper', { opacity: 0.6 })]);
}

function bridgeTrack(from, to) {
  const sleepers = [];
  for (let x = from + 4; x < to - 2; x += 8) sleepers.push(`M${x} 41.5 V54.5`);
  return [line(sleepers.join(' '), 2.2, 'stroke-ink', { 'stroke-linecap': 'butt' }), line(`M${from} 45.5 H${to} M${from} 50.5 H${to}`, 1.6)];
}

// A blobby splat round (50, 50): a ring of fixed radii joined by curves, so
// it is the same every time, and a few droplets thrown clear of it.
function bloodSplat() {
  const radii = [30, 22, 35, 20, 27, 37, 19, 30, 24, 33, 21, 28];
  const pts = radii.map((r, i) => {
    const a = (i / radii.length) * Math.PI * 2;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
  const mid = (a, b) => `${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2}`;
  const d = `M${mid(pts.at(-1), pts[0])} ${pts.map((p, i) => `Q${p[0]} ${p[1]} ${mid(p, pts[(i + 1) % pts.length])}`).join(' ')} Z`;
  const drops = [[90, 28, 4.5], [12, 72, 4], [82, 86, 3.2], [18, 18, 3], [95, 60, 2.4], [40, 94, 2.6]];
  return [
    fill(d, 'ink', { transform: 'translate(2 2)', 'fill-opacity': 0.5 }),
    fill(d, 'red'),
    fill(d, toneClass('ink', 10)),
    line(d, 2.4),
    ...drops.flatMap(([x, y, r]) => [circle(x, y, r, 'red'), ring(x, y, r, 1.4)]),
  ];
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

// --- the desert (SPEC.md §13, M29) --------------------------------------------
// The airfield's ground and targets, drawn in the same hand as France's: bold
// inked shapes, a hex about 30 px across at 1280x800, in desert ochre where
// France has fields. Nothing here is used by France's map.

// A camel-thorn bush: a low spray of green twigs over a dab of shadow.
function thornBush(x, y, s = 1) {
  const t = (dx, dy) => `${(x + dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  return [
    svg('ellipse', { cx: x + 1.5 * s, cy: y + 0.8 * s, rx: 6 * s, ry: 1.8 * s, class: 'ink', opacity: 0.18 }),
    line(`M${t(-5, 0)} L${t(-3, -5)} M${t(-2, 0)} L${t(-1, -7)} M${t(1, 0)} L${t(1.5, -8)} M${t(3, 0)} L${t(4, -6)} M${t(5, 0)} L${t(6.5, -3.5)}`, 1.5, 'stroke-green'),
    line(`M${t(-6, 0.3)} H${t(7, 0.3).split(' ')[0]}`, 1, 'stroke-ink', { opacity: 0.45 }),
  ];
}

// A dune crest: the ridge line, and the lee side hatched below it.
function duneCrest(x, y, w, s = 1) {
  const hatch = [];
  for (let i = 1; i < 5; i++) {
    const hx = x - w + (2 * w * i) / 5;
    hatch.push(`M${hx.toFixed(1)} ${(y + 1.5).toFixed(1)} l${(-2 * s).toFixed(1)} ${(4 * s).toFixed(1)}`);
  }
  return [
    line(`M${x - w} ${y + 3} Q${x} ${y - 7 * s} ${x + w} ${y + 3}`, 1.5, 'stroke-ink', { opacity: 0.5 }),
    line(hatch.join(' '), 0.9, 'stroke-ink', { opacity: 0.3 }),
  ];
}

// A stone in the wadi's bed: paper, inked, with its shadow.
function wadiStone(x, y, rx, ry) {
  return [
    svg('ellipse', { cx: x + 1, cy: y + 1, rx, ry, class: 'ink', opacity: 0.3 }),
    svg('ellipse', { cx: x, cy: y, rx, ry, class: 'paper' }),
    svg('ellipse', { cx: x, cy: y, rx, ry, fill: 'none', class: 'stroke-ink', 'stroke-width': 1 }),
  ];
}

// A bell tent, seen from the south-west, with its door and a guy line.
function bellTent(x, y, s = 1) {
  const t = (dx, dy) => `${(x + dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  const body = `M${t(-10, 0)} L${t(0, -14)} L${t(10, 0)} Z`;
  return [
    svg('ellipse', { cx: x + 3 * s, cy: y + 1, rx: 11 * s, ry: 2.5 * s, class: 'ink', opacity: 0.25 }),
    ...inked(body, 'paper', 1.4),
    fill(`M${t(0, -14)} L${t(10, 0)} L${t(3, 0)} Z`, 'ochre', { 'fill-opacity': 0.55 }),
    fill(`M${t(-2.5, 0)} L${t(0, -6)} L${t(2.5, 0)} Z`, 'ink'),
    line(`M${t(0, -14)} L${t(0, -17)} M${t(-10, 0)} L${t(-14, 2)} M${t(10, 0)} L${t(14, 2)}`, 0.9),
  ];
}

// A ring of sandbags, filled with the sand they hold: a pen's blast walls.
function sandbagRing(cx, cy, rx, ry, count, gapFrom = null, gapTo = null) {
  const bags = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    if (gapFrom !== null && a > gapFrom && a < gapTo) continue;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    bags.push(svg('g', { transform: `rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})` }, [
      svg('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: 6.5, ry: 4, class: 'ochre' }),
      svg('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: 6.5, ry: 4, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.1 }),
    ]));
  }
  return bags;
}

const DESERT_TERRAIN = {
  // Sand: bare but for a stipple and now and then a ripple of wind.
  'terrain-sand-01': () => [[24, 34], [30, 58], [50, 40], [56, 62], [38, 50]].map(([x, y]) => circle(x, y, 0.9, 'ink', { opacity: 0.45 })),
  'terrain-sand-02': () => [line('M22 44 Q31 40 40 44 T58 44', 1.1, 'stroke-ink', { opacity: 0.28 }), line('M28 54 Q35 51 42 54', 1, 'stroke-ink', { opacity: 0.22 })],
  'terrain-sand-03': () => [[28, 40], [46, 32], [52, 54], [34, 62]].map(([x, y]) => circle(x, y, 1.1, 'ink', { opacity: 0.4 })),
  'terrain-scrub-01': () => [...thornBush(28, 42), ...thornBush(52, 56, 0.9), ...thornBush(40, 70, 0.75)],
  'terrain-scrub-02': () => [...thornBush(46, 38, 0.9), ...thornBush(28, 60), ...thornBush(56, 66, 0.7)],
  'terrain-scrub-03': () => [...thornBush(34, 48), ...thornBush(54, 40, 0.8), ...thornBush(44, 66, 0.85)],
  'terrain-dunes-01': () => [...duneCrest(34, 36, 16), ...duneCrest(48, 60, 18)],
  'terrain-dunes-02': () => [...duneCrest(44, 40, 20), ...duneCrest(30, 64, 13)],
  'terrain-dunes-03': () => [...duneCrest(40, 50, 22)],
  'terrain-wadi-01': () => [...wadiStone(30, 40, 4, 3), ...wadiStone(48, 56, 5, 3.4), ...wadiStone(38, 64, 2.6, 2)],
  'terrain-wadi-02': () => [...wadiStone(46, 36, 3.6, 2.6), ...wadiStone(30, 54, 4.6, 3.2), ...wadiStone(52, 64, 2.8, 2)],
  'terrain-wadi-03': () => [...wadiStone(40, 46, 5, 3.6), ...wadiStone(26, 62, 3, 2.2), ...wadiStone(54, 34, 2.6, 2)],
  // The strip: rolled sand, a painted centre line along it, and (M31, the
  // operator's: it did not read as an airstrip) its two edges as thick ink
  // lines the length of it, flush with the hexes' upright sides so they run on
  // unbroken from hex to hex.
  'terrain-strip': () => [
    line('M0 25 H80', 6, 'stroke-ink', { 'stroke-linecap': 'butt', opacity: 0.8 }),
    line('M0 67 H80', 6, 'stroke-ink', { 'stroke-linecap': 'butt', opacity: 0.8 }),
    line('M0 46 H80', 3, 'stroke-paper', { 'stroke-dasharray': '10 7' }),
    line('M0 46 H80', 0.8, 'stroke-ink', { opacity: 0.35, 'stroke-dasharray': '10 7' }),
  ],
  // A pen: blast walls of sandbags round a floor of sand, open to the strip.
  'terrain-pen': () => [
    svg('ellipse', { cx: 40, cy: 46, rx: 24, ry: 21, class: toneClass('ochre', 50) }),
    ...sandbagRing(40, 46, 24, 21, 14),
  ],
  'terrain-camp-01': () => [...bellTent(28, 44), ...bellTent(52, 62, 0.9)],
  'terrain-camp-02': () => [...bellTent(48, 40, 0.9), ...bellTent(30, 66)],
};

// A Balkenkreuz: the black cross, edged in paper, that says whose aircraft.
function balkenkreuz(x, y, s = 1) {
  const arm = (w, h) => `M${x - w} ${y - h} H${x + w} V${y + h} H${x - w} Z M${x - h} ${y - w} H${x + h} V${y + w} H${x - h} Z`;
  return [fill(arm(5 * s, 2.2 * s), 'paper'), fill(arm(4 * s, 1.1 * s), 'ink')];
}

// A parked aircraft's shadow (M29b, the operator's: bigger and softer): cast
// further down-right, its edge feathered by the same shape stroked wider and
// fainter in layers, not a blur filter (the board redraws on hover).
function planeShadow(paths) {
  const { x, y, core, feather } = PLANE_SHADOW;
  const layers = feather.map(([width, opacity]) => svg('g', { opacity }, paths.map((d) => svg('path', { d, class: 'ink stroke-ink', 'stroke-width': width, 'stroke-linejoin': 'round' }))));
  return svg('g', { transform: `translate(${x} ${y})` }, [...layers, svg('g', { opacity: core }, paths.map((d) => fill(d, 'ink')))]);
}

const PLANE_SHADOW = { x: 6, y: 7, core: 0.2, feather: [[9, 0.05], [6, 0.06], [3, 0.08]] };

// A Ju 87 Stuka from above, nose north (M31c, redrawn after the operator's
// Stuka_Reference_01): a long thin fuselage, the wings tapering to rounded
// tips with the crank in their trailing edge, the spats forward of them, the
// long glasshouse canopy and a square tailplane. Desert tan, mottled.
const STUKA = {
  body: 'M48 9.5 Q52.4 10 52.6 15 L52.8 46 L50.4 74 L48.8 82 L47.2 82 L45.6 74 L43.2 46 L43.4 15 Q43.6 10 48 9.5 Z',
  wings: 'M52 28 L65 29.3 L85.5 31.4 Q90 32.4 89.4 35.6 L87.6 38 L71.7 41.8 L52.4 45.2 Z M44 28 L31 29.3 L10.5 31.4 Q6 32.4 6.6 35.6 L8.4 38 L24.3 41.8 L43.6 45.2 Z',
  tail: 'M34 71.6 H62 Q63.6 74.4 62 77.4 H34 Q32.4 74.4 34 71.6 Z',
};

function stuka(burnt) {
  const { body, wings, tail } = STUKA;
  const shadow = planeShadow([body, wings, tail]);
  if (burnt) {
    const broken = 'M52 28 L65 29.3 L74 31 L70 37 L60 43 L52.4 45.2 Z M44 28 L31 29.3 L14 32 L18 38 L24.3 41.8 L43.6 45.2 Z';
    return [
      shadow,
      ...inked(broken, 'ink', 1.4), ...inked(body, 'ink', 1.4), fill(tail, 'ink', { 'fill-opacity': 0.7 }),
      fill('M84 33 L90 35 L86 38 Z M8 34 L5 36 L9 38 Z', 'ink', { 'fill-opacity': 0.6 }),
      ...flame(48, 46, 0.8), ...flame(28, 38, 0.5), ...smoke(56, 18, 1),
    ];
  }
  return [
    shadow,
    ...inked(tail, 'ochre', 1.3), fill(tail, toneClass('green', 30)),
    ...inked(wings, 'ochre', 1.6), fill(wings, toneClass('green', 30)),
    // The trailing edges' flaps, and the spats forward of the wing.
    line('M71.7 41.8 L86 38.4 M24.3 41.8 L10 38.4', 0.8, 'stroke-ink', { opacity: 0.5 }),
    ...inked('M35 24.5 q1.8 0 1.8 3.6 v2.6 h-3.6 v-2.6 q0 -3.6 1.8 -3.6 Z M61 24.5 q1.8 0 1.8 3.6 v2.6 h-3.6 v-2.6 q0 -3.6 1.8 -3.6 Z', 'ochre', 1),
    ...inked(body, 'ochre', 1.6),
    // The fin down the tail, the cowling's ring, the glasshouse in its frames.
    line('M48 70 V82', 1.6), line('M44 18 H52', 0.9, 'stroke-ink', { opacity: 0.6 }),
    svg('ellipse', { cx: 48, cy: 36.5, rx: 2.8, ry: 8.5, class: 'blue' }),
    svg('ellipse', { cx: 48, cy: 36.5, rx: 2.8, ry: 8.5, fill: 'none', class: 'stroke-ink', 'stroke-width': 1 }),
    line('M45.4 32 H50.6 M45.2 36.5 H50.8 M45.4 41 H50.6', 0.6),
    line('M39 9.5 H57', 2.4), circle(48, 9.5, 2.3, 'ink'),
    ...balkenkreuz(24.3, 35.5, 0.85), ...balkenkreuz(71.7, 35.5, 0.85),
  ];
}

// A Ju 52 from above, nose north (M31c, redrawn after the operator's
// Ju52_Reference_01): the long straight tapered wing, corrugated fore and
// aft, a broad slab-sided fuselage, the nose engine and one in a nacelle out
// on each wing, a wide tailplane. Darker than the Stukas.
const JU52 = {
  body: 'M48 13.5 Q51.8 13.8 52.2 18 L52.6 30 L52 58 L50.2 76 L48.7 81 L47.3 81 L45.8 76 L44 58 L43.4 30 L43.8 18 Q44.2 13.8 48 13.5 Z',
  wings: 'M52.4 28.8 L92.5 33.6 Q95.4 34.6 94.4 37.4 L93 38 L52.4 47.2 Z M43.6 28.8 L3.5 33.6 Q0.6 34.6 1.6 37.4 L3 38 L43.6 47.2 Z',
  tail: 'M34 69 L46 68.2 H50 L62 69 Q63.8 72.6 62 76.6 L50 77.2 H46 L34 76.6 Q32.2 72.6 34 69 Z',
  engines: 'M33.8 22 Q36.5 20.6 39.2 22 L38.8 35.6 L36.5 38 L34.2 35.6 Z M56.8 22 Q59.5 20.6 62.2 22 L61.8 35.6 L59.5 38 L57.2 35.6 Z',
};

function ju52(burnt) {
  const { body, wings, tail, engines } = JU52;
  const shadow = planeShadow([body, wings, tail]);
  if (burnt) {
    return [
      shadow,
      ...inked('M43.6 28.8 L12 32.6 L16 40 L43.6 47.2 Z M52.4 28.8 L80 32 L76 41 L52.4 47.2 Z', 'ink', 1.4), ...inked(body, 'ink', 1.4),
      fill(engines, 'ink'), fill(tail, 'ink', { 'fill-opacity': 0.7 }),
      ...flame(48, 48, 0.9), ...flame(66, 40, 0.55), ...smoke(40, 20, 1.1),
    ];
  }
  // Corrugations run fore and aft across the wing and tailplane.
  let ribs = '';
  for (let x = 6; x < 43; x += 3.2) {
    const t = (43.6 - x) / 40.1;
    ribs += `M${x.toFixed(1)} ${(28.8 + t * 4.8 + 0.8).toFixed(1)} V${(47.2 - t * 9.2 - 0.8).toFixed(1)} `;
    ribs += `M${(96 - x).toFixed(1)} ${(28.8 + t * 4.8 + 0.8).toFixed(1)} V${(47.2 - t * 9.2 - 0.8).toFixed(1)} `;
  }
  return [
    shadow,
    ...inked(tail, 'ochre', 1.3), fill(tail, toneClass('ink', 20)),
    line('M36 69.6 V76 M40 69 V76.8 M56 69 V76.8 M60 69.6 V76', 0.6, 'stroke-ink', { opacity: 0.4 }),
    ...inked(wings, 'ochre', 1.6), fill(wings, toneClass('ink', 20)),
    line(ribs, 0.6, 'stroke-ink', { opacity: 0.4 }),
    ...inked(body, 'ochre', 1.6), fill(body, toneClass('ink', 20)),
    ...inked(engines, 'ochre', 1.2),
    // The three propellers, the cockpit glazing, the fin down the tail.
    line('M31.5 21.4 H41.5 M54.5 21.4 H64.5 M43 13.5 H53', 2.1),
    fill('M45.4 19 Q48 17.6 50.6 19 L50.4 22.4 H45.6 Z', 'blue'), line('M45.4 19 Q48 17.6 50.6 19 L50.4 22.4 H45.6 Z', 0.8),
    line('M48 70 V81', 1.4),
    ...balkenkreuz(21.9, 37.2, 0.85), ...balkenkreuz(74.1, 37.2, 0.85),
  ];
}

// The signals tent: a marquee with its wireless mast; the field telephones'
// wires run from the mast's crossarm (60, 12) to a pole on each charge point.
function signalsTent(state) {
  const tent = 'M12 70 L20 46 H52 L60 70 Z';
  const roof = 'M20 46 L26 34 H46 L52 46 Z';
  const parts = [
    svg('ellipse', { cx: 40, cy: 72, rx: 30, ry: 5, class: 'ink', opacity: 0.25 }),
  ];
  if (state === 'destroyed') {
    return [
      ...parts,
      ...inked('M10 72 L22 58 L40 64 L56 56 L64 72 Z', 'ink', 1.4),
      line('M60 70 L78 40', 2.2), ...flame(34, 68, 0.8), ...smoke(46, 40, 1.1),
    ];
  }
  return [
    ...parts,
    ...inked(tent, 'paper', 1.6), fill('M36 46 H52 L60 70 H40 Z', 'ochre', { 'fill-opacity': 0.5 }),
    ...inked(roof, 'paper', 1.6), fill(roof, toneClass('ink', 20)),
    fill('M30 70 V56 H38 V70 Z', state === 'cut' ? 'ink' : 'fire', { 'fill-opacity': state === 'cut' ? 1 : 0.8 }),
    line('M30 70 V56 H38 V70', 1),
    line('M60 70 V10', 2.2), line('M54 14 H66', 1.8),
    line('M60 12 L74 70 M60 12 L46 34', 0.8, 'stroke-ink', { opacity: 0.6 }),
  ];
}

/** A man's helmet from straight above (M31, the jeep's crew). */
function helmetTop(x, y) {
  return [circle(x, y, 3.6, 'green'), ring(x, y, 3.6, 1), circle(x - 1, y - 1, 0.9, 'paper')];
}

// A desert lorry from the side, facing east (M31c, redrawn after the
// operator's Trucks_Reference_01 and _02): the tilt over its back draped in
// camouflage netting, a rounded cab and bonnet in mottled sand, big wheels
// under round mudguards. (x, y) is the ground under its middle.
function desertTruck(x, y, s = 1) {
  const P = (dx, dy) => `${(x + dx * s).toFixed(2)} ${(y + dy * s).toFixed(2)}`;
  const path = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, dx, dy) => P(+dx, +dy));
  const tilt = path('M-17,-4 L-17,-14 Q-17,-17 -14,-17 L0,-17 Q3,-17 3,-14 L3,-4 Z');
  const bed = path('M-18,-1 L-18,-5 L4,-5 L4,-1 Z');
  const cab = path('M3,-1 L3,-13 Q3,-14 4,-14 L9,-14 L11.5,-8 L11.5,-1 Z');
  const bonnet = path('M11.5,-8 L15.5,-8 Q17.5,-8 17.5,-6 L17.5,-1 L11.5,-1 Z');
  const guards = path('M7,-1 Q7,-6 12,-6 Q17,-6 17,-1 M-15,-1 Q-15,-6 -10,-6 Q-5,-6 -5,-1');
  // The netting: a lattice of diagonals across the tilt, kept inside it.
  let net = '';
  for (let k = -17 - 13; k <= 3; k += 2.6) {
    const a0 = Math.max(-17, k), a1 = Math.min(3, k + 13);
    if (a1 > a0) {
      net += `M${P(a0, -4 - (a0 - k))} L${P(a1, -4 - (a1 - k))} `;
      net += `M${P(a0, -17 + (a0 - k))} L${P(a1, -17 + (a1 - k))} `;
    }
  }
  const wheel = (dx) => [circle(x + dx * s, y - 0.5 * s, 3.9 * s, 'ink'), circle(x + dx * s, y - 0.5 * s, 1.6 * s, 'paper'), circle(x + dx * s, y - 0.5 * s, 0.6 * s, 'ink')];
  return [
    svg('ellipse', { cx: x, cy: y + 2 * s, rx: 20 * s, ry: 3 * s, class: 'ink', opacity: 0.25 }),
    ...inked(bed, 'ochre', 1.2),
    ...inked(tilt, 'ochre', 1.4), fill(tilt, toneClass('green', 50)),
    line(net, 0.5 * s, 'stroke-ink', { opacity: 0.55 }),
    ...inked(cab, 'ochre', 1.3), fill(path('M5,-12 L9,-12 L9,-7 L5,-7 Z'), 'blue'), line(path('M9,-14 L11.5,-8'), 0.9),
    fill(path('M3.5,-6 Q6,-8 8,-5 Q6,-3 3.5,-4 Z'), toneClass('green', 50)),
    ...inked(bonnet, 'ochre', 1.3), line(path('M15.5,-7 L15.5,-2 M16.5,-7 L16.5,-2'), 0.6),
    circle(x + 17.6 * s, y - 6.4 * s, 1 * s, 'paper'),
    line(guards, 1.2),
    ...wheel(12), ...wheel(-10),
  ];
}

// The bomb store (M33), from above: bombs laid in rows inside a low ring of
// sandbags, noses east, each with its fins and a red band. Blown: the ring
// broken open round a scorched pit, burning.
function bombStore(burnt) {
  const cx = 42, cy = 38;
  if (burnt) {
    return [
      ...sandbagRing(cx, cy, 31, 25, 15, 0.5, 2.3),
      fill(`M${cx - 22} ${cy + 4} Q${cx - 18} ${cy - 16} ${cx} ${cy - 15} Q${cx + 21} ${cy - 16} ${cx + 23} ${cy + 3} Q${cx + 16} ${cy + 17} ${cx - 2} ${cy + 16} Q${cx - 19} ${cy + 16} ${cx - 22} ${cy + 4} Z`, 'ink', { 'fill-opacity': 0.55 }),
      line(`M${cx - 12} ${cy + 6} l7 -3 M${cx + 6} ${cy + 9} l8 2 M${cx + 2} ${cy - 8} l-6 -4`, 1.6),
      ...flame(cx - 6, cy + 6, 0.6), ...flame(cx + 11, cy + 2, 0.45),
    ];
  }
  const bomb = (x, y) => {
    const body = `M${x - 7} ${y - 2.6} H${x + 4} Q${x + 9} ${y} ${x + 4} ${y + 2.6} H${x - 7} Z`;
    return [
      ...inked(body, 'green', 1.1),
      fill(`M${x + 1} ${y - 2.6} H${x + 3.2} V${y + 2.6} H${x + 1} Z`, 'red'),
      line(`M${x - 7} ${y - 4} V${y + 4} M${x - 9.5} ${y - 3.2} L${x - 7} ${y} L${x - 9.5} ${y + 3.2}`, 1.1),
    ];
  };
  const rows = [-11, -3.5, 4, 11.5].flatMap((dy, i) => [-12, 5].map((dx) => [cx + dx + (i % 2 ? 3 : 0), cy + dy]));
  return [
    svg('ellipse', { cx, cy, rx: 27, ry: 21, class: 'paper' }),
    svg('ellipse', { cx, cy, rx: 27, ry: 21, class: toneClass('ochre', 50) }),
    ...rows.flatMap(([x, y]) => bomb(x, y)),
    ...sandbagRing(cx, cy, 31, 25, 15),
  ];
}

// The goods train (M34), from above, running east: a tank engine in ink with
// its boiler bands, chimney, dome and cab, and a covered wagon in army green
// with its roof ribs and couplings. Each is one hex long. M35 (the operator's:
// green on the green ground it comes in over, it was hard to notice): every
// car has rounded corners and is trimmed in cold blue and paper, a blue cab
// and blue ends with a paper line down each side.
const roundBox = (x0, y0, x1, y1, r) => `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
function trainEngine() {
  const frame = roundBox(6, 12, 76, 34, 5);
  const boiler = 'M26 14 H66 Q73 14 73 20 V26 Q73 32 66 32 H26 Z';
  const cab = roundBox(6, 10, 26, 36, 4);
  return [
    line('M0 23 H6', 3),
    ...inked(frame, 'ink', 1.4),
    line('M29 12.8 H70 M29 33.2 H70', 1.6, 'stroke-paper'),
    fill(boiler, 'ink'), line(boiler, 1.2, 'stroke-paper', { opacity: 0.55 }),
    line('M36 14 V32 M46 14 V32 M56 14 V32', 1.2, 'stroke-paper', { opacity: 0.75 }),
    circle(64, 23, 4.2, 'paper'), ring(64, 23, 4.2, 1.2), circle(64, 23, 2, 'ink'),
    circle(50, 23, 3, 'blue'), ring(50, 23, 3, 1, 'stroke-paper'),
    ...inked(cab, 'blue', 1.4), line('M10 14 H22 M10 32 H22', 1.6, 'stroke-paper'),
    fill('M74 20 H79 V26 H74 Z', 'red'),
  ];
}
function trainWagon() {
  const body = roundBox(5, 11, 75, 35, 5);
  return [
    line('M0 23 H5 M75 23 H80', 3),
    fill(body, 'green'),
    // Its ends in blue, inside the body's rounded corners.
    fill('M10 11 H16 V35 H10 Q5 35 5 30 V16 Q5 11 10 11 Z', 'blue'),
    fill('M70 11 H64 V35 H70 Q75 35 75 30 V16 Q75 11 70 11 Z', 'blue'),
    line('M16 11 V35 M64 11 V35', 1.4, 'stroke-paper'),
    line('M28 11 V35 M40 11 V35 M52 11 V35', 0.9, 'stroke-ink', { opacity: 0.45 }),
    line('M19 14.4 H61 M19 31.6 H61', 1.6, 'stroke-paper'),
    fill('M34 19 H46 V27 H34 Z', 'paper', { 'fill-opacity': 0.9 }),
    line(body, 1.4),
  ];
}

const DESERT_OBJECTIVES = {
  'objective-aircraft-stuka': { viewBox: '0 0 96 92', draw: () => stuka(false) },
  'objective-aircraft-stuka-destroyed': { viewBox: '0 0 96 92', draw: () => stuka(true) },
  'objective-aircraft-ju52': { viewBox: '0 0 96 92', draw: () => ju52(false) },
  'objective-aircraft-ju52-destroyed': { viewBox: '0 0 96 92', draw: () => ju52(true) },
  // The bowser, as in France's fuel dump, alone on the apron in a crop of that drawing.
  'objective-fuel-bowser': {
    viewBox: '78 106 84 48',
    draw: () => [svg('ellipse', { cx: 122, cy: 146, rx: 36, ry: 4, class: 'ink', opacity: 0.25 }), ...bowser(false)],
  },
  'objective-fuel-bowser-destroyed': {
    viewBox: '78 106 84 48',
    draw: () => [fill('M82 146 Q100 128 124 130 Q152 132 158 146 Z', 'ink', { 'fill-opacity': 0.3 }), ...bowser(true), ...flame(112, 134, 0.7), ...flame(138, 132, 0.55)],
  },
  'objective-bomb-store': { viewBox: '0 0 84 76', draw: () => bombStore(false) },
  'objective-bomb-store-destroyed': { viewBox: '0 0 84 76', draw: () => bombStore(true) },
  'objective-signals-tent': { viewBox: '0 0 80 92', draw: () => signalsTent('intact') },
  'objective-signals-tent-cut': { viewBox: '0 0 80 92', draw: () => signalsTent('cut') },
  'objective-signals-tent-destroyed': { viewBox: '0 0 80 92', draw: () => signalsTent('destroyed') },
  // The rendezvous: two trucks under a scrap of netting, and the hooded green
  // lamp, the one friendly light on the map (as France's barn has).
  'objective-trucks': {
    viewBox: '0 0 80 92',
    draw: () => [
      ...desertTruck(26, 52, 0.95), ...desertTruck(50, 74, 0.95),
      circle(64, 44, 4.5, toneClass('green', 50)), circle(64, 44, 2, 'green'), ring(64, 44, 2, 0.8),
    ],
  },
  // The perimeter car (the manifest's counter-enemy-vehicle): a Kübelwagen
  // from the side, paper on the enemy counter's ink, two helmets aboard.
  'counter-enemy-vehicle': {
    viewBox: '0 0 56 56',
    draw: () => {
      const body = 'M6 32 L9 24 H20 L24 18 H34 L37 24 H48 L50 32 Z';
      return [
        ...helmet(18.5, 8.5, 0.55), ...helmet(29, 8.5, 0.55),
        fill(body, 'paper'), fill(body, toneClass('ink', 20)),
        line('M24 18 L22 24', 1.2), line('M8 28 H48', 0.8, 'stroke-ink', { opacity: 0.6 }),
        circle(15, 33, 5, 'ink'), circle(15, 33, 5, 'none', { fill: 'none', class: 'stroke-paper', 'stroke-width': 1.4 }), circle(15, 33, 1.6, 'paper'),
        circle(41, 33, 5, 'ink'), circle(41, 33, 5, 'none', { fill: 'none', class: 'stroke-paper', 'stroke-width': 1.4 }), circle(41, 33, 1.6, 'paper'),
      ];
    },
  },
};

// --- the winter hills (SPEC.md §14, M41) ---------------------------------------
// The aqueduct's ground and targets, in the same hand as France's and the
// desert's. Nothing here is used by either of those maps.

// Slope hachures: short strokes falling down and to the right.
function hachures(marks) {
  return [line(marks.map(([x, y, l]) => `M${x} ${y} l${(l * 0.45).toFixed(1)} ${l}`).join(' '), 1.1, 'stroke-ink', { opacity: 0.3 })];
}

// A rock face: an angular block, toned, with its cracks.
function rockFace(x, y, s = 1) {
  const t = (dx, dy) => `${(x + dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  const d = `M${t(-13, 8)} L${t(-9, -8)} L${t(-1, -13)} L${t(9, -7)} L${t(13, 7)} L${t(3, 11)} Z`;
  return [
    fill(d, 'paper'), fill(d, toneClass('ink', 35)), line(d, 1.5),
    line(`M${t(-1, -13)} L${t(1, 2)} L${t(-9, 8)} M${t(1, 2)} L${t(11, 5)}`, 1, 'stroke-ink', { opacity: 0.6 }),
  ];
}

// A dry-stone terrace wall across the hex, bowed with the slope.
function terraceWall(y, bow) {
  const d = `M12 ${y} Q40 ${y + bow} 68 ${y}`;
  return [line(d, 4.4), line(d, 2.4, 'stroke-paper', { 'stroke-dasharray': '6 2.5' })];
}

// An olive: a small grey-green crown over its shadow.
function oliveTree(x, y, s = 1) {
  return [
    svg('ellipse', { cx: x + 3 * s, cy: y + 5 * s, rx: 7 * s, ry: 3 * s, class: 'ink', opacity: 0.25 }),
    circle(x, y, 6.5 * s, 'paper'), circle(x, y, 6.5 * s, 'green', { 'fill-opacity': 0.6 }), ring(x, y, 6.5 * s, 1.3),
    line(`M${x - 2.5 * s} ${y - 1 * s} q${2 * s} ${-2.5 * s} ${4.5 * s} ${-0.5 * s}`, 0.9, 'stroke-ink', { opacity: 0.55 }),
  ];
}

// The torrent in its bed: a thread of water among the stones.
function torrent(d) {
  return [line(d, 3.2, 'stroke-blue'), line(d, 1, 'stroke-paper', { opacity: 0.7 })];
}

// A sea-worn boulder, bigger than the wadi's stones.
function boulder(x, y, rx, ry) {
  return [
    svg('ellipse', { cx: x + 2, cy: y + 2.5, rx, ry, class: 'ink', opacity: 0.3 }),
    svg('ellipse', { cx: x, cy: y, rx, ry, class: 'paper' }),
    svg('ellipse', { cx: x, cy: y, rx, ry, class: toneClass('ink', 20) }),
    svg('ellipse', { cx: x, cy: y, rx, ry, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.4 }),
  ];
}

const ITALY_TERRAIN = {
  'terrain-hillside-01': () => hachures([[26, 36, 7], [34, 40, 6], [50, 56, 7], [42, 60, 5]]),
  'terrain-hillside-02': () => [...hachures([[44, 34, 7], [52, 38, 6], [28, 58, 6]]), ...wadiStone(36, 48, 2.6, 1.9)],
  'terrain-hillside-03': () => [...hachures([[30, 44, 6], [38, 48, 7], [54, 62, 5]]), ...wadiStone(52, 40, 2.2, 1.6)],
  'terrain-crag-01': () => [...rockFace(32, 42), ...rockFace(52, 60, 0.8)],
  'terrain-crag-02': () => [...rockFace(48, 40, 0.9), ...rockFace(30, 60, 0.85)],
  'terrain-ravine-01': () => [...torrent('M30 22 Q46 36 36 50 T48 74'), ...wadiStone(26, 44, 4, 3), ...wadiStone(52, 58, 4.4, 3.2)],
  'terrain-ravine-02': () => [...torrent('M46 20 Q30 38 44 52 T34 76'), ...wadiStone(54, 38, 3.6, 2.6), ...wadiStone(28, 62, 4.2, 3)],
  'terrain-ravine-03': () => [...torrent('M38 20 Q50 40 38 54 T46 76'), ...wadiStone(26, 34, 3.2, 2.4), ...wadiStone(54, 66, 3.6, 2.6)],
  'terrain-terrace-01': () => [...terraceWall(34, 5), ...terraceWall(50, 6), ...terraceWall(66, 4)],
  'terrain-terrace-02': () => [...terraceWall(30, -4), ...terraceWall(46, -5), ...terraceWall(62, -4)],
  'terrain-olives-01': () => [...oliveTree(28, 38), ...oliveTree(50, 46, 0.9), ...oliveTree(36, 62, 0.95)],
  'terrain-olives-02': () => [...oliveTree(46, 34, 0.95), ...oliveTree(28, 52), ...oliveTree(52, 62, 0.9)],
  'terrain-olives-03': () => [...oliveTree(34, 36, 0.9), ...oliveTree(54, 48), ...oliveTree(30, 62, 0.95)],
  'terrain-plough-01': () => [line('M20 34 L58 30 M18 44 L62 40 M18 54 L62 50 M22 64 L60 60', 1.1, 'stroke-ink', { opacity: 0.24 })],
  'terrain-plough-02': () => [line('M22 30 L56 36 M18 40 L62 46 M18 50 L62 56 M24 60 L58 66', 1.1, 'stroke-ink', { opacity: 0.24 })],
  // The foot of a pier: dressed stone laid in courses, seen from above.
  'terrain-arch': () => [
    ...inked('M22 30 H40 V40 H22 Z', 'paper', 1.2), ...inked('M42 30 H58 V40 H42 Z', 'paper', 1.2),
    ...inked('M26 54 H44 V64 H26 Z', 'paper', 1.2), ...inked('M46 54 H60 V64 H46 Z', 'paper', 1.2),
  ].map((n) => { n.setAttribute('opacity', '0.55'); return n; }),
  'terrain-shingle-01': () => [[26, 36, 2.4, 1.6], [44, 30, 1.8, 1.2], [54, 46, 2.6, 1.8], [32, 56, 2, 1.4], [48, 64, 2.4, 1.6], [38, 44, 1.4, 1]]
    .map(([x, y, rx, ry]) => svg('ellipse', { cx: x, cy: y, rx, ry, class: 'ink', opacity: 0.35 })),
  'terrain-shingle-02': () => [[30, 32, 2, 1.4], [50, 36, 2.6, 1.8], [26, 50, 2.4, 1.6], [42, 56, 1.6, 1.1], [56, 60, 2, 1.4], [36, 68, 2.4, 1.6]]
    .map(([x, y, rx, ry]) => svg('ellipse', { cx: x, cy: y, rx, ry, class: 'ink', opacity: 0.35 })),
  'terrain-rocks-01': () => [...boulder(30, 40, 9, 6.5), ...boulder(50, 56, 11, 7.5), ...boulder(34, 64, 6, 4.5)],
  'terrain-rocks-02': () => [...boulder(48, 36, 10, 7), ...boulder(28, 54, 8, 6), ...boulder(52, 64, 7, 5)],
  'terrain-sea-01': () => [line('M22 38 Q28 34 34 38 Q40 42 46 38 M36 58 Q42 54 48 58 Q54 62 60 58', 1.4, 'stroke-paper', { opacity: 0.5 })],
  'terrain-sea-02': () => [line('M30 32 Q36 28 42 32 Q48 36 54 32 M20 54 Q26 50 32 54 Q38 58 44 54', 1.4, 'stroke-paper', { opacity: 0.5 })],
};

// The aqueduct, seen from the south and a little above, as the rail bridge is:
// the channel on top with its water, the masonry face below it with an arch
// between every pair of piers. Six hexes long, a hex to 80. The fourth hex is
// the torrent's: there the face is left open, pier to pier, so the ravine
// printed under it runs on through and reads as the way under (M41b, the
// operator's), with only the channel carried across overhead.
function aqueduct(blown) {
  const parts = [];
  const GAP = [248, 312]; // the open arch over the torrent
  // Whole, the face is two runs either side of the torrent; blown, the pier
  // west of it is gone and the two spans it carried with it.
  const faces = blown ? [[4, 152], [344, 476]] : [[4, GAP[0]], [GAP[1], 476]];
  const tops = blown ? [[4, 152], [344, 476]] : [[4, 476]];
  for (const [x0, x1] of faces) parts.push(fill(`M${x0} 72 H${x1} V80 H${x0} Z`, 'ink', { 'fill-opacity': 0.22 }));
  for (const [x0, x1] of faces) {
    const face = `M${x0} 46 H${x1} V72 H${x0} Z`;
    parts.push(...inked(face, 'paper', 2), fill(face, toneClass('ink', 20)));
    for (let k = 0; k < 6; k++) {
      const cx = 40 + 80 * k, r = 15;
      if (k === 3 || cx - r < x0 + 4 || cx + r > x1 - 4) continue;
      const arch = `M${cx - r} 72 V66 A${r} 10 0 0 1 ${cx + r} 66 V72 Z`;
      parts.push(fill(arch, 'ink', { 'fill-opacity': 0.75 }), line(arch, 1.4));
    }
  }
  for (const [x0, x1] of tops) {
    const top = `M${x0} 28 H${x1} V46 H${x0} Z`;
    parts.push(...inked(top, 'paper', 2), fill(`M${x0 + 2} 33 H${x1 - 2} V41 H${x0 + 2} Z`, 'blue'));
    let joints = '';
    for (let x = x0 + 20; x < x1 - 6; x += 20) joints += `M${x} 28 V33 M${x} 41 V46 `;
    parts.push(line(joints, 0.9, 'stroke-ink', { opacity: 0.5 }), line(`M${x0 + 2} 37 H${x1 - 2}`, 1, 'stroke-paper', { opacity: 0.6, 'stroke-dasharray': '9 7' }));
  }
  if (!blown) {
    // The soffit of the open arch: a light line under the channel, no wall.
    parts.push(line(`M${GAP[0]} 60 Q${(GAP[0] + GAP[1]) / 2} 44 ${GAP[1]} 60`, 1.2, 'stroke-ink', { opacity: 0.45 }));
    return parts;
  }
  const block = ([x, y, w, h, a]) => [
    svg('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, class: 'paper', transform: `rotate(${a} ${x} ${y})` }),
    svg('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.3, transform: `rotate(${a} ${x} ${y})` }),
  ];
  parts.push(
    // Scorched ground under the breach, and the standing masonry blackened and cracked beside it.
    svg('ellipse', { cx: 248, cy: 70, rx: 104, ry: 16, class: 'ink', opacity: 0.28 }),
    fill('M112 28 H152 V72 H112 Z', 'ink', { 'fill-opacity': 0.28 }), fill('M344 28 H388 V72 H344 Z', 'ink', { 'fill-opacity': 0.28 }),
    line('M120 28 L128 42 L118 54 L130 72 M96 46 L104 58 L98 72 M372 28 L364 44 L376 56 L366 72 M400 46 L394 60 L402 72', 1.3),
    // The broken ends, and the water pouring out of them.
    ...inked('M152 28 L164 34 L154 44 L166 58 L152 72 Z', toneClass('ink', 35), 1.8),
    ...inked('M344 28 L332 36 L342 46 L330 60 L344 72 Z', toneClass('ink', 35), 1.8),
    fill('M154 34 Q176 44 170 82 L186 84 Q190 44 160 30 Z', 'blue', { 'fill-opacity': 0.85 }),
    fill('M342 34 Q322 46 326 82 L312 84 Q308 46 338 30 Z', 'blue', { 'fill-opacity': 0.85 }),
    line('M160 40 Q176 52 176 80 M338 40 Q324 52 320 80', 1.1, 'stroke-paper', { opacity: 0.8 }),
    // The fallen pier and spans, strewn across the bed.
    ...[[196, 70, 14, 9, -14], [218, 78, 16, 8, 10], [236, 64, 11, 8, 28], [206, 56, 9, 7, -30], [258, 74, 15, 9, -8], [280, 62, 12, 8, 36], [300, 76, 13, 8, 14], [268, 52, 9, 6, -40], [232, 46, 8, 6, 20]].flatMap(block),
    ...flame(206, 62, 0.5), ...flame(292, 66, 0.45),
    ...smoke(216, 26, 1.3), ...smoke(286, 22, 1.1),
  );
  return parts;
}

// The road bridge: one stone arch carrying the road over the torrent, the
// road running from the hex's upper right to its lower left, as the map's does.
function roadBridge(blown) {
  const bed = 'M6 30 L74 62';
  const parts = [
    line(bed, 30, 'stroke-ink', { opacity: 0.32, 'stroke-linecap': 'butt' }),
    line('M10 34 Q40 40 70 58', 3, 'stroke-blue'),
  ];
  const deck = (d) => [line(d, 19, 'stroke-ink', { 'stroke-linecap': 'butt' }), line(d, 14, 'stroke-paper', { 'stroke-linecap': 'butt' })];
  if (!blown) {
    parts.push(...deck('M64 4 L16 88'), line('M58 4 L10 88 M70 4 L22 88', 1, 'stroke-ink', { opacity: 0.45, 'stroke-dasharray': '4 4' }));
  } else {
    parts.push(
      ...deck('M64 4 L48 32'), ...deck('M32 60 L16 88'),
      line('M42 28 L52 30 L48 36 L56 36 M26 58 L34 56 L30 62 L38 64', 1.6),
      ...[[40, 44, 9, 6, 20], [46, 52, 7, 5, -25], [34, 50, 6, 5, 50]].flatMap(([x, y, w, h, a]) => [
        svg('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, class: 'paper', transform: `rotate(${a} ${x} ${y})` }),
        svg('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.2, transform: `rotate(${a} ${x} ${y})` }),
      ]),
      ...smoke(44, 30, 0.9),
    );
  }
  return parts;
}

// The boat from the submarine, drawn up at the water's edge: a clinker dinghy
// seen from above, its thwarts and oars, and the hooded green lamp, the one
// friendly light on the map (as France's barn has).
function shipsBoat() {
  const hull = 'M40 22 C56 30 58 58 50 74 H30 C22 58 24 30 40 22 Z';
  return [
    svg('ellipse', { cx: 44, cy: 52, rx: 17, ry: 28, class: 'ink', opacity: 0.25 }),
    ...inked(hull, 'paper', 2), fill(hull, toneClass('green', 50)),
    line('M40 26 V72 M29 46 H51 M28 58 H52', 1.4),
    line('M30 52 L10 60 M50 52 L70 60', 2.4), line('M10 60 l-5 4 M70 60 l5 4', 4),
    circle(40, 34, 4.5, toneClass('green', 50)), circle(40, 34, 2.2, 'green'), ring(40, 34, 2.2, 0.9),
  ];
}

const ITALY_OBJECTIVES = {
  'objective-aqueduct': { viewBox: '0 0 480 92', draw: () => aqueduct(false) },
  'objective-aqueduct-destroyed': { viewBox: '0 0 480 92', draw: () => aqueduct(true) },
  'objective-road-bridge': { viewBox: '0 0 80 92', draw: () => roadBridge(false) },
  'objective-road-bridge-destroyed': { viewBox: '0 0 80 92', draw: () => roadBridge(true) },
  'objective-boat': { viewBox: '0 0 80 92', draw: shipsBoat },
  // Where a charge went off (M41b, the operator's): a black scorch on the
  // ground, ragged at the edge, left for the rest of the night.
  'effect-soot': {
    viewBox: '0 0 80 92',
    draw: () => [
      starburst(40, 48, 11, 30, 19, 'ink', { 'fill-opacity': 0.22 }),
      starburst(40, 48, 9, 21, 13, 'ink', { 'fill-opacity': 0.3 }),
      svg('ellipse', { cx: 40, cy: 48, rx: 11, ry: 9, class: 'ink', opacity: 0.4 }),
    ],
  },
  // A supply canister on the ground (SPEC.md §9): a steel drum in army green,
  // banded, with the lines of its own small parachute trailing off it.
  'marker-canister': {
    viewBox: '0 0 28 28',
    draw: () => [
      line('M5 9 Q2 5 6 3 M5 9 Q8 4 11 5', 1),
      svg('g', { transform: 'rotate(18 14 14)' }, [
        svg('rect', { x: 3, y: 9, width: 22, height: 11, rx: 5, class: 'green' }),
        line('M4.5 12 H23.5', 1, 'stroke-paper', { opacity: 0.6 }),
        line('M9 9 V20 M14 9 V20 M19 9 V20', 1.3),
        svg('rect', { x: 3, y: 9, width: 22, height: 11, rx: 5, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.8 }),
      ]),
    ],
  },
};

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
    draw: () => Array.from({ length: 5 }, (_, i) => {
      const grow = i * 0.8;
      return svg('rect', {
        x: 3 - grow, y: 3.5 - grow, width: 50 + grow * 2, height: 50 + grow * 2, rx: 6 + grow,
        class: 'ink', 'fill-opacity': 0.12,
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
  // Redrawn bolder and simpler in M13: at about 15 px the old ones blurred.
  // Binoculars from the front: two big lenses and the bridge between them.
  'symbol-scout': {
    viewBox: '0 0 24 24',
    draw: () => [
      svg('rect', { x: 8, y: 8.5, width: 8, height: 4.5, class: 'ink' }),
      circle(6.5, 13, 5.5, 'ink'),
      circle(17.5, 13, 5.5, 'ink'),
      circle(6.5, 13, 2.4, 'paper'),
      circle(17.5, 13, 2.4, 'paper'),
    ],
  },
  // A Bren from the side, as a solid silhouette: the curved magazine standing
  // up out of the top, the stock behind, the bipod down at the muzzle.
  'symbol-gunner': {
    viewBox: '0 0 24 24',
    draw: () => [
      fill('M1.5 10 H18 V14.5 H7 L4.5 17.5 H1.5 Z', 'ink'),
      svg('rect', { x: 17, y: 11, width: 6, height: 2.4, class: 'ink' }),
      fill('M9 10 L9.5 3 Q12.5 2 14.5 4 L13.2 10 Z', 'ink'),
      line('M17 14 L14.5 21 M17 14 L19.5 21', 2.2),
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

  // One man at his post (M14: the helmet beside an upright rifle read as a
  // helmet and a letter T): helmet over greatcoat shoulders, the collar
  // turned up, and a slung rifle's barrel slanting up behind his shoulder.
  'counter-enemy-sentry': {
    viewBox: '0 0 56 56',
    draw: () => {
      // The coat starts below the brim, leaving the face dark between them.
      const coat = 'M9 37 C10 32 16 29.5 22 29.5 H34 C40 29.5 46 32 47 37 Z';
      return [
        line('M38 34 L47 5', 3, 'stroke-paper'),
        svg('rect', { x: 44.6, y: 3.5, width: 3.4, height: 3, class: 'paper', transform: 'rotate(20 46.3 5)' }),
        fill(coat, 'paper'), fill(coat, toneClass('ink', 20)),
        line('M22 29.5 L28 34.5 L34 29.5', 1.4),
        ...helmet(14.5, 8, 1.1),
      ];
    },
  },
  'counter-enemy-patrol': { viewBox: '0 0 56 56', draw: () => [...helmet(6, 11, 0.85), ...helmet(26, 19, 0.85)] },
  'counter-enemy-reserve': { viewBox: '0 0 56 56', draw: () => [...helmet(4, 8, 0.7), ...helmet(29, 8, 0.7), ...helmet(16, 22, 0.7)] },

  // --- portraits (ART-ASSETS.md §2): the stand-in; each man's own is supplied ---
  'portrait-fallback-full': { viewBox: '0 0 240 300', draw: fallbackPortrait },
  'portrait-fallback-chip': { viewBox: '0 0 32 32', draw: fallbackChip },

  // --- terrain (ART-ASSETS.md §4) ---
  ...Object.fromEntries(Object.entries(TERRAIN_SPRITES).map(([id, draw]) => [id, { viewBox: '0 0 80 92', draw }])),
  ...Object.fromEntries(Object.entries(DESERT_TERRAIN).map(([id, draw]) => [id, { viewBox: '0 0 80 92', draw }])),
  ...DESERT_OBJECTIVES,
  ...Object.fromEntries(Object.entries(ITALY_TERRAIN).map(([id, draw]) => [id, { viewBox: '0 0 80 92', draw }])),
  ...ITALY_OBJECTIVES,
  'train-engine': { viewBox: '0 0 80 46', draw: trainEngine },
  'train-wagon': { viewBox: '0 0 80 46', draw: trainWagon },
  // A hedge's clumps (M17): board.js lays them along each hedge, every shadow first.
  ...Object.fromEntries(Array.from({ length: HEDGE_CLUMP.variants }, (_, i) => [
    [`hedge-clump-0${i + 1}`, { viewBox: `0 0 ${HEDGE_CLUMP.size} ${HEDGE_CLUMP.size}`, draw: () => hedgeClump(i) }],
    [`hedge-clump-0${i + 1}-shadow`, { viewBox: `0 0 ${HEDGE_CLUMP.size} ${HEDGE_CLUMP.size}`, draw: () => hedgeClumpShadow(i) }],
  ]).flat()),

  // --- objectives (ART-ASSETS.md §5) ---
  // --- objectives (after the operator's reference art, assets/reference/) ---
  // Bold shapes first: at 1280x800 each of these prints 80 to 150 pixels
  // across, so the references' texture is suggested, never copied.

  // The plate-girder span over the canal on stone abutments with splayed wing
  // walls, carrying the railway (drawn by board.js either side) on its deck.
  // Seen from above, the south girder's face showing and its shadow on the water.
  'objective-rail-bridge': {
    viewBox: '0 0 280 92',
    draw: () => [
      fill('M100 0 H180 V92 H100 Z', 'blue'),
      line('M100 0 V92 M180 0 V92', 2),
      fill('M104 66 H180 V76 H104 Z', 'ink', { 'fill-opacity': 0.3 }),
      ...bridgeAbutments(),
      ...inked('M64 36 H216 V60 H64 Z', 'paper', 2.4),
      ...bridgeTrack(52, 228),
      ...plateGirders(64, 216),
      ...bollards([[90, 84], [190, 8], [190, 84]]),
    ],
  },
  'objective-bridge-destroyed': {
    viewBox: '0 0 280 92',
    draw: () => [
      fill('M100 0 H180 V92 H100 Z', 'blue'),
      line('M100 0 V92 M180 0 V92', 2),
      ...bridgeAbutments(),
      // The deck broken off short at both piers, rails and all.
      ...inked('M64 36 H108 L114 44 L106 50 L112 60 H64 Z', 'paper', 2.4),
      ...inked('M216 36 H172 L166 42 L174 50 L168 60 H216 Z', 'paper', 2.4),
      ...bridgeTrack(52, 104),
      ...bridgeTrack(176, 228),
      ...plateGirders(64, 106), ...plateGirders(174, 216),
      // The fallen span, nose down in the canal, and the wreckage round it.
      fill('M112 50 L170 70 L164 84 L106 64 Z', 'ink', { 'fill-opacity': 0.6 }),
      line('M112 50 L170 70 L164 84 L106 64 Z M122 56 L116 70 M134 60 L128 74 M146 64 L140 78 M158 68 L152 82', 1.6),
      fill('M104 68 Q136 86 172 80 L174 90 Q136 94 102 80 Z', 'blue', { 'fill-opacity': 0.6 }),
      line('M110 88 Q124 84 138 88 M148 90 Q160 86 172 90', 1.2, 'stroke-paper', { opacity: 0.7 }),
      svg('rect', { x: 150, y: 44, width: 5, height: 4, class: 'ink' }), svg('rect', { x: 126, y: 40, width: 4, height: 3, class: 'ink' }),
      ...flame(118, 58, 0.55),
      ...smoke(140, 26, 1.2),
    ],
  },

  // The PTT exchange in the village, as the reference has it: a stone house
  // under a slate roof, seen from the south-west so the front and the east
  // gable both show, the PTT board over the door, a gravel yard, and the roof
  // standard its lines come in to (the lines themselves are the board's). The
  // church beside it.
  'objective-exchange': {
    viewBox: '0 0 160 184',
    draw: () => [
      ...gravelYard(),
      svg('g', { transform: 'translate(-4 66) scale(0.9)' }, church()),
      ...exchangeBuilding(false),
      ...roofStandard(),
    ],
  },
  // The line cut, not blown (M16): the house stands, and its lights are out.
  'objective-exchange-cut': {
    viewBox: '0 0 160 184',
    draw: () => [
      ...gravelYard(),
      svg('g', { transform: 'translate(-4 66) scale(0.9)' }, church()),
      ...exchangeBuilding(false, true),
      ...roofStandard(),
    ],
  },
  'objective-exchange-destroyed': {
    viewBox: '0 0 160 184',
    draw: () => [
      ...gravelYard(),
      svg('g', { transform: 'translate(-4 66) scale(0.9)' }, church()),
      ...exchangeBuilding(true),
      ...roofStandard(),
      ...smoke(96, 46, 1.2), ...flame(84, 86, 0.8), ...flame(108, 80, 0.7),
    ],
  },

  // The fuel dump from above, after the reference, kept plain (M11): a stack
  // of drums on trodden ground, a second under a camouflage net pegged at its
  // corners, and a bowser with its hose run out to the drums. The gun pit and
  // most of the drums went: the corner was too busy for players to approach.
  // Kept inside its three hexes, so the art, the outline and the label all
  // sit on the same ground.
  'objective-fuel-dump': {
    viewBox: '0 0 240 184',
    draw: () => [
      fill(FUEL_GROUND, 'green', { 'fill-opacity': 0.16 }),
      ...drumPark(),
      ...camouflageNet(),
      line('M92 136 Q76 120 84 98', 1.4, 'stroke-ink', { opacity: 0.7 }),
      ...bowser(false),
    ],
  },
  'objective-fuel-destroyed': {
    viewBox: '0 0 240 184',
    draw: () => [
      fill(FUEL_GROUND, 'ink', { 'fill-opacity': 0.3 }),
      fill('M50 110 Q64 40 140 44 Q204 48 198 110 Q176 146 120 146 Q66 146 50 110 Z', 'ink', { 'fill-opacity': 0.25 }),
      // Drums blown about.
      ...[[70, 62], [100, 54], [160, 62], [62, 94]].flatMap(([x, y]) => drum(x, y, 'ink')),
      ...bowser(true),
      ...flame(90, 80, 1.4), ...flame(150, 74, 1.2), ...flame(124, 112, 1.05),
      ...smoke(120, 34, 1.5),
    ],
  },
  // The exfil barn at the edge of the fields, seen from the south-west like the
  // exchange: a timber gable with its double doors and hayloft, a dark roof,
  // cart ruts out of the doors, and the hooded green lamp the pick-up party
  // shows — the one friendly light on the map.
  'objective-rally-point': {
    viewBox: '0 0 80 92',
    draw: () => {
      const gable = 'M14 74 V46 L32 30 L50 46 V74 Z';
      const side = 'M50 74 V46 L66 38 V66 Z';
      const roof = 'M31 29 L51 47 L67 38 L47 20 Z';
      let planks = '';
      for (let x = 18; x < 50; x += 4) planks += `M${x} ${x < 32 ? 46 - (x - 14) * (16 / 18) : 30 + (x - 32) * (16 / 18)} V74 `;
      let slats = '';
      for (const t of [0.25, 0.5, 0.75]) slats += `M${31 + 16 * t} ${29 - 9 * t} L${51 + 16 * t} ${47 - 9 * t} `;
      return [
        line('M26 76 Q24 84 20 92 M38 76 Q40 84 44 92', 2.2, 'stroke-ink', { opacity: 0.3 }),
        ...inked(side, 'paper', 1.8), fill(side, 'red', { 'fill-opacity': 0.35 }), fill(side, 'ink', { 'fill-opacity': 0.25 }),
        ...inked(gable, 'paper', 1.8), fill(gable, 'red', { 'fill-opacity': 0.35 }),
        line(planks, 0.8, 'stroke-ink', { opacity: 0.4 }),
        ...inked(roof, 'ink', 1.8), line(slats, 0.8, 'stroke-paper', { opacity: 0.4 }),
        line('M12 48 L32 28 L52 48', 2.6),
        ...inked('M28 38 H36 V46 H28 Z', 'ink', 1.2),
        ...inked('M22 56 H42 V74 H22 Z', 'green', 1.6),
        line('M32 56 V74 M22 56 L32 74 M32 56 L22 74 M32 56 L42 74 M42 56 L32 74', 1),
        // The lamp, hooded, showing green.
        circle(68, 80, 8, 'green', { 'fill-opacity': 0.25 }),
        circle(68, 80, 3.5, 'green'), ring(68, 80, 3.5, 1.4),
        line('M64 77 Q68 72 72 77', 1.8),
      ];
    },
  },

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
  // The airfield's diversion (M31, the operator's): a jeep driving by outside
  // the wire, from above, nose to the east as the Dakota's is, sand-painted,
  // two men aboard, jerrycans behind and twin guns on the left side, which
  // board.js turns toward the field. Its muzzle flash is a sprite of its own,
  // blinked by board.js.
  'vehicle-jeep': {
    viewBox: '0 0 60 60',
    draw: () => {
      const body = 'M12 20 H44 Q50 20 51 24 V36 Q50 40 44 40 H12 Q10 40 10 38 V22 Q10 20 12 20 Z';
      const wheels = [[18, 18], [18, 42], [42, 18], [42, 42]];
      return [
        svg('ellipse', { cx: 32, cy: 33, rx: 23, ry: 12, class: 'ink', opacity: 0.2 }),
        ...wheels.map(([x, y]) => svg('rect', { x: x - 5, y: y - 2.5, width: 10, height: 5, rx: 1.5, class: 'ink' })),
        ...inked(body, 'ochre', 1.6),
        // Bonnet and folded windscreen, the grille at the nose.
        line('M36 21 V39', 1.2), line('M51 25 V35', 1.6),
        // Jerrycans and the spare wheel on the back.
        ...inked('M12.5 23 H18 V29 H12.5 Z', 'green', 1), ...inked('M12.5 31 H18 V37 H12.5 Z', 'green', 1),
        circle(8.5, 30, 4, 'ink'), circle(8.5, 30, 1.5, 'paper'),
        // Two men aboard, and the twin guns over the left side.
        ...helmetTop(30, 25), ...helmetTop(22, 33),
        line('M32 22 L37 13 M34 22 L39 13', 1.2), line('M22 29 L17 19 M24 29 L19 19', 1.2),
      ];
    },
  },
  'vehicle-jeep-flash': {
    viewBox: '0 0 60 60',
    draw: () => [
      fill('M38 13 L34.5 7.5 L38.5 9.5 L40.5 5 L40.5 9.5 L44.5 8 L39.5 13.5 Z', 'fire'),
      fill('M18 19 L13.5 14.5 L17.5 15.5 L18 11 L19.5 15 L23 13 L19.5 19.5 Z', 'fire'),
    ],
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
  // The turn after suppression (M15): no longer suppressed — it sees and fires
  // again — but a gunner can still kill it. The suppressed marker stayed on
  // it and read as still suppressed.
  'marker-open-kill': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'paper'),
      ring(14, 14, 6.5, 2.2, 'stroke-red'),
      line('M14 3 V9 M14 19 V25 M3 14 H9 M19 14 H25', 2.2, 'stroke-red'),
      ring(14, 14, 12),
    ],
  },
  // Aiming a suppress, kill or knife (M15): a crosshair over the enemy under
  // the mouse, red if it can be done, grey if not, in place of its route and
  // view, which aiming does not need.
  ...Object.fromEntries([['marker-aim', 'red'], ['marker-aim-no', 'ink']].map(([id, colour]) => [id, {
    viewBox: '0 0 100 100',
    draw: () => {
      const ticks = 'M50 3 V28 M50 72 V97 M3 50 H28 M72 50 H97';
      return [
        svg('g', { opacity: colour === 'ink' ? 0.55 : 1 }, [
          ring(50, 50, 36, 10, 'stroke-paper'), line(ticks, 10, 'stroke-paper'),
          ring(50, 50, 36, 4.5, `stroke-${colour}`), line(ticks, 4.5, `stroke-${colour}`),
          circle(50, 50, 4.5, colour),
        ]),
      ];
    },
  }])),
  // Aiming Aid (M17, the operator's): a red cross over the man under the
  // mouse, as the crosshair is over an enemy — red if he can be stabilised,
  // grey if not. Big and on a paper disc, so it never reads as the small
  // wounded marker he already wears.
  ...Object.fromEntries([['marker-heal', 'red'], ['marker-heal-no', 'ink']].map(([id, colour]) => [id, {
    viewBox: '0 0 100 100',
    draw: () => {
      const cross = 'M40 18 H60 V40 H82 V60 H60 V82 H40 V60 H18 V40 H40 Z';
      return [
        svg('g', { opacity: colour === 'ink' ? 0.55 : 1 }, [
          circle(50, 50, 44, 'paper', { 'fill-opacity': 0.9 }), ring(50, 50, 44, 4.5, `stroke-${colour}`),
          fill(cross, colour), line(cross, 3),
        ]),
      ];
    },
  }])),
  // Where a thrown stone lands (M17, the operator's: the dashed lob from the
  // man read as a walk, so only its landing is marked): a pebble in an ink
  // target ring.
  'marker-stone-target': {
    viewBox: '0 0 100 100',
    draw: () => {
      const ticks = 'M50 6 V26 M50 74 V94 M6 50 H26 M74 50 H94';
      const pebble = 'M36 46 C36 36 46 32 54 34 C63 36 67 43 65 52 C63 61 55 65 46 63 C39 61 36 54 36 46 Z';
      return [
        ring(50, 50, 34, 10, 'stroke-paper'), line(ticks, 10, 'stroke-paper'),
        ring(50, 50, 34, 4, 'stroke-ink'), line(ticks, 4, 'stroke-ink'),
        fill(pebble, 'paper'), fill(pebble, toneClass('ink', 50)), line(pebble, 3),
        line('M44 42 Q48 38 54 39', 2.5, 'stroke-paper'),
      ];
    },
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
  // Paper with an ink eye since M21 (the operator's): green on the green
  // counter, printed faint with the hidden man, was very hard to see.
  'marker-hidden': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'paper'),
      line('M6 12 Q14 20 22 12', 2.6),
      line('M9 16 L7.5 19.5 M14 17.5 L14 21.5 M19 16 L20.5 19.5', 2),
      ring(14, 14, 12),
    ],
  },
  // On a man who has the leader's orders this turn (SPEC.md §5 Command, M11):
  // a sergeant's chevron in the leader's blue, the one colour kept for him.
  // The leader's orders on a man's counter (SPEC.md §5 Command): one chevron
  // for the ordinary bonus, two for the strongest, beside him (M12).
  'marker-orders': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'leader'),
      line('M7 16.5 L14 10.5 L21 16.5', 2.8, 'stroke-paper', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      ring(14, 14, 12),
    ],
  },
  'marker-orders-2': {
    viewBox: '0 0 28 28',
    draw: () => [
      circle(14, 14, 12, 'leader'),
      line('M7 12 L14 7 L21 12 M7 18 L14 13 L21 18', 2.6, 'stroke-paper', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      ring(14, 14, 12),
    ],
  },
  'marker-body': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('rect', { x: 2, y: 2, width: 24, height: 24, rx: 3, class: 'paper' }),
      svg('rect', { x: 12.5, y: 5, width: 3, height: 19, class: 'ink' }),
      svg('rect', { x: 7, y: 10, width: 14, height: 3, class: 'ink' }),
      // The mound in our counters' colour (M31d, the operator's: orange on the airfield).
      fill('M6 24 Q14 14 22 24 Z', 'counter-body'),
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
  // A spent canopy on the ground: the same cloth as parachute-canopy in the
  // air — green and cream gores round a vent — lying bunched in a fan, its
  // rigging lines run back to the pack. Spent kit, not a chute still flying.
  'marker-parachute': {
    viewBox: '0 0 28 28',
    draw: () => {
      const cx = 14, cy = 17;
      const at = (deg, r) => [cx + Math.cos((deg * Math.PI) / 180) * r, cy + Math.sin((deg * Math.PI) / 180) * r].map((n) => n.toFixed(2)).join(' ');
      const gores = [];
      let edge = '';
      for (let i = 0; i < 6; i++) {
        const a1 = -170 + i * 26.7, a2 = a1 + 26.7;
        const out = 11.5 + (i % 2 ? 1.2 : -0.4); // bunched, so the hem rises and falls
        gores.push(fill(`M${at(a1, 3)} L${at(a1, out)} L${at(a2, out)} L${at(a2, 3)} Z`, i % 2 ? 'paper' : 'green'));
        edge += `${i === 0 ? 'M' : 'L'}${at(a1, out)} L${at(a2, out)} `;
      }
      let seams = '';
      for (let i = 0; i <= 6; i++) seams += `M${at(-170 + i * 26.7, 3)} L${at(-170 + i * 26.7, 12)} `;
      return [
        ...gores,
        line(seams, 1),
        line(`${edge} L${at(10, 3)} L${at(-170, 3)} Z`, 1.8),
        line('M5 18 L13 24 M23 18 L15 24 M14 20 L14 24', 1),
        svg('rect', { x: 11, y: 22.5, width: 6, height: 4.5, rx: 1, class: 'green' }),
        svg('rect', { x: 11, y: 22.5, width: 6, height: 4.5, rx: 1, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.5 }),
      ];
    },
  },
  // A charge point (SPEC.md §7): an empty satchel with its fuse, and a red
  // plus — where a charge goes, not a charge.
  'marker-charge-point': {
    viewBox: '0 0 28 28',
    draw: () => [
      svg('rect', { x: 4, y: 10, width: 18, height: 13, rx: 2, class: 'paper' }),
      svg('rect', { x: 4, y: 10, width: 18, height: 13, rx: 2, fill: 'none', class: 'stroke-ink', 'stroke-width': 1.8, 'stroke-dasharray': '3 2' }),
      line('M13 10 C13 5 17 6 18 3', 1.8),
      circle(21.5, 21.5, 6, 'red'), ring(21.5, 21.5, 6, 1.4),
      line('M21.5 18.5 V24.5 M18.5 21.5 H24.5', 1.8, 'stroke-paper'),
    ],
  },
  // A telegraph pole on each of the exchange's charge points (M12): where the
  // wires go, so a scout can see the line he would cut. Ink only.
  'marker-telegraph-pole': {
    viewBox: '0 0 28 28',
    draw: () => [
      line('M14 27 V4', 4, 'stroke-paper'),
      line('M6 8.5 H22', 3.5, 'stroke-paper'),
      line('M14 27 V4', 2),
      line('M6 8.5 H22 M8 12.5 L14 9.5 L20 12.5', 1.6),
      circle(7, 7, 1.6, 'ink'), circle(21, 7, 1.6, 'ink'),
      line('M10 27 H18', 1.6),
    ],
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
  // Fuse tokens: a stopwatch counting down the turns left before the charge
  // goes off (M15: a number in a disc read as how many charges were laid).
  // The face is divided into the charge's own length (M30, time pencils), a
  // tick a turn, and the burning wedge is the turns left of it, swept from
  // twelve o'clock to the hand: full when it is set. On its last turn it is
  // red, with a burst behind the watch: it goes off at the end of this turn.
  ...Object.fromEntries(FUSE_LENGTHS.flatMap((length) => Array.from({ length }, (_, i) => i + 1).map((n) => [`marker-fuse-${length}-${n}`, {
    viewBox: '0 0 28 28',
    draw: () => {
      const cx = 14, cy = 15.5, r = 9.5;
      const sweep = (n / length) * 360;
      const at = (deg, rad = r) => ({ x: cx + rad * Math.sin((deg * Math.PI) / 180), y: cy - rad * Math.cos((deg * Math.PI) / 180) });
      const end = at(sweep);
      const wedge = sweep >= 360
        ? svg('circle', { cx, cy, r, class: 'fire' })
        : fill(`M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`, n === 1 ? 'red' : 'fire');
      const hand = at(sweep % 360, r - 1.5);
      return [
        ...(n === 1 ? [starburst(cx, cy, 16, 13.8, 10.2, 'red')] : []),
        svg('rect', { x: 12, y: 1.2, width: 4, height: 2.6, rx: 0.8, class: 'ink' }),
        svg('rect', { x: 13.2, y: 3.6, width: 1.6, height: 2.6, class: 'ink' }),
        circle(cx, cy, r + 1, 'paper'),
        wedge,
        line(Array.from({ length: Math.max(length, 2) }, (_, i) => (i * 360) / Math.max(length, 2)).map((d) => { const a = at(d, r), b = at(d, r - 2.4); return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} L${b.x.toFixed(2)} ${b.y.toFixed(2)}`; }).join(' '), 1.2),
        line(`M${cx} ${cy} L${hand.x.toFixed(2)} ${hand.y.toFixed(2)}`, 1.8),
        circle(cx, cy, 1.6, 'ink'),
        ring(cx, cy, r + 1, 2),
      ];
    },
  }]))),
  // Time pencils (M31d, the operator's: the timer as a period object). The
  // No. 10 delay switch as it was issued in its tin: a crimped copper tube
  // over the acid ampoule, the safety strip in the length's colour, then the
  // brass striker body with its inspection hole. Coloured by length as the
  // real ones were, shortest to longest: black, red, white, green, yellow,
  // blue (the yellow in desert ochre: only the airfield has pencils).
  ...Object.fromEntries(TIME_PENCIL_COLOURS.map((colour, i) => [`time-pencil-${i + 1}`, {
    viewBox: '0 0 200 26',
    draw: () => [
      // Its shadow on the tin's card, down and to the right as the counters'.
      svg('rect', { x: 8, y: 11, width: 188, height: 11, rx: 4, class: 'ink', 'fill-opacity': 0.18 }),
      // The copper tube, crimped at its end over the ampoule.
      ...inked('M6 13 Q6 8 11 8 H112 V18 H11 Q6 18 6 13 Z', 'paper', 1.4),
      fill('M6 13 Q6 8 11 8 H112 V18 H11 Q6 18 6 13 Z', toneClass('fire', 35)),
      line('M15 8.5 V17.5 M18.5 8.5 V17.5 M22 8.5 V17.5', 1.1),
      // The safety strip, in the colour that says how long it runs.
      ...inked('M112 7 H130 V19 H112 Z', colour, 1.4),
      ...inked('M117 19 H125 V24.5 H117 Z', colour, 1.2),
      // The brass striker body and its inspection hole, then the end fitting.
      ...inked('M130 9 H184 V17 H130 Z', 'paper', 1.4),
      fill('M130 9 H184 V17 H130 Z', toneClass('ink', 20)),
      circle(152, 13, 2.1, 'ink'),
      ...inked('M184 10 H194 Q196 10 196 12 V14 Q196 16 194 16 H184 Z', 'ink', 1.2),
    ],
  }])),
  // A comic starburst, one frame; board.js does the stepped reveal.
  // Blood, as the annual would print it (M16): a spot-red splat, halftoned,
  // inked round, with droplets thrown off it. The knife's burst, and drawn
  // small and faint as the stain under a knifed enemy's body.
  'effect-blood-splat': {
    viewBox: '0 0 100 100',
    draw: () => bloodSplat(),
  },
  // A spark where a wire parts (M16): a small paper starburst, inked.
  'effect-spark': {
    viewBox: '0 0 100 100',
    draw: () => [
      starburst(50, 50, 8, 46, 14, 'paper'),
      line(starburst(50, 50, 8, 46, 14, 'paper').getAttribute('d'), 3),
      starburst(50, 50, 6, 20, 8, 'ink'),
    ],
  },
  'marker-blast': {
    viewBox: '0 0 200 200',
    draw: () => [
      starburst(103, 103, 12, 96, 58, 'ink', { 'fill-opacity': 0.6 }),
      starburst(100, 100, 12, 96, 58, 'red'),
      starburst(100, 100, 12, 96, 58, toneClass('ink', 10)),
      line(starburst(100, 100, 12, 96, 58, 'red').getAttribute('d'), 3),
      // The fireball inside the burst (M14): orange, then the paper core.
      starburst(100, 100, 11, 78, 48, 'fire'),
      starburst(100, 100, 10, 62, 36, 'paper'),
      boomLabel(),
    ],
  },
  // Wider since M13: the stencil was squeezed to fit and looked squashed. It
  // is still fitted to the width, but by the gaps between letters, never by
  // narrowing the letters themselves.
  'stamp-destroyed': {
    viewBox: '0 0 250 80',
    draw: () => [
      svg('rect', { x: 4, y: 4, width: 242, height: 72, rx: 6, class: 'paper', 'fill-opacity': 0.85 }),
      svg('rect', { x: 4, y: 4, width: 242, height: 72, rx: 6, fill: 'none', class: 'stroke-red', 'stroke-width': 6 }),
      label('DESTROYED', { x: 125, y: 43, 'font-size': 34, 'font-family': TYPE.slab, textLength: 212, lengthAdjust: 'spacing', class: 'red' }),
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
  // The margin note down the outer edge of the left page, in the middle of
  // the margin (M15: back where it was before M14). The game's name above it
  // is type in index.html (#margin-title), not part of this drawing.
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
  // The title card over the orders (SPEC.md §11): drawn here until a painting
  // is supplied at TITLE_CARD.url, which replaces it on load. A moonlit sky,
  // the Dakota and a stick of canopies to either side, the village on the
  // skyline. The middle is left quiet: the title is set over it by ui.js.
  'title-card': {
    viewBox: '0 0 600 150',
    draw: () => {
      // A canopy seen from the side, its rigging lines, and the man under it.
      const canopy = (x, y, s) => svg('g', { transform: `translate(${x} ${y}) scale(${s})` }, [
        fill('M-14 0 Q-12 -16 0 -17 Q12 -16 14 0 Q7 -4 0 -2 Q-7 -4 -14 0 Z', 'paper', { opacity: 0.92 }),
        line('M-14 0 L0 22 M0 -2 L0 22 M14 0 L0 22', 0.8, 'stroke-paper', { opacity: 0.7 }),
        fill('M-2 21 h4 v8 h-4 Z', 'ink'),
      ]);
      const dakota = 'M0 0 Q3 -5 14 -5 L50 -4 L58 -13 L62 -13 L61 -3 Q63 0 59 1 L14 3 Q3 3 0 0 Z M20 -1 L42 -1 L36 4 L25 4 Z';
      const skyline = 'M0 150 V128 Q20 120 38 126 Q52 116 70 124 L96 122 Q112 112 130 122 L190 124 Q206 118 222 125 L300 126 '
        + 'L330 126 V110 L336 110 L340 80 L344 110 L350 110 V118 L366 118 V112 L380 112 V126 Q400 120 420 127 L470 124 '
        + 'Q488 114 506 124 Q526 118 544 126 Q570 118 600 125 V150 Z';
      return [
        svg('rect', { x: 0, y: 0, width: 600, height: 150, class: 'blue' }),
        svg('rect', { x: 0, y: 0, width: 600, height: 64, class: 'ink', opacity: 0.35 }),
        svg('rect', { x: 0, y: 0, width: 600, height: 28, class: 'ink', opacity: 0.3 }),
        circle(528, 34, 17, 'paper', { opacity: 0.9 }),
        svg('g', { transform: 'translate(424 24)' }, [fill(dakota, 'ink', { opacity: 0.9 })]),
        canopy(472, 52, 0.75), canopy(506, 74, 0.85), canopy(548, 88, 0.95), canopy(578, 62, 0.7),
        canopy(40, 40, 0.7), canopy(78, 66, 0.85), canopy(118, 88, 0.95),
        fill(skyline, 'ink'),
      ];
    },
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
/**
 * Our men's counters in a mission's own colour (M31d): `counterColour` in
 * data/missions.json names a PALETTE entry; green when it names none. Set on
 * the page, so every counter drawn from the sprite takes it: the board's, the
 * counter key's and the drop's.
 */
export function applyCounterColour(name) {
  const colour = PALETTE[name] ?? PALETTE.green;
  document.documentElement.style.setProperty('--counter-body', colour);
}

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
  return PLACED.has(id) ? id : `portrait-fallback-${size}`;
}

// Supplied portraits (ART-ASSETS.md §2). A PNG in PORTRAIT_FILES.dir named as
// the manifest names it — portrait-holloway-full.png, portrait-holloway-chip.png
// — becomes that man's portrait; nothing else needs editing. A missing file is
// fine: he wears the drawn stand-in.
// Since M17 the full portrait the game loads is a JPEG, 480 x 600, made from
// the operator's painted PNG (kept beside it, not loaded): the six PNGs came
// to 12 MB and filled in one by one for seconds after the page opened over
// the web. Shown at most 96 x 120, so 480 x 600 is still sharp on a retina
// screen. To remake one from a new PNG (macOS, nothing to install):
//   sips -s format jpeg -s formatOptions 82 -z 600 480 portrait-<id>-full.png --out portrait-<id>-full.jpg
export const PORTRAIT_FILES = {
  dir: 'assets/portraits',
  sizes: { full: { width: 240, height: 300, ext: 'jpg' }, chip: { width: 32, height: 32, ext: 'png' } },
};

// Each man's own portrait symbols, made by loadSuppliedPortraits before
// anything is drawn: the stand-in at first, his picture once it arrives. So
// art drawn once, before the files are in (the counter key), still shows it.
const PLACED = new Set();

/**
 * Look for a supplied portrait for each trooper id and swap each one found
 * into its <symbol>, so every <use> of it shows the file. `onLoaded` is called
 * after each swap, so the caller can redraw anything that picked a fallback.
 */
export function loadSuppliedPortraits(unitIds, onLoaded = () => {}, missionDir = null) {
  const defs = document.getElementById('portrait-fallback-full')?.parentNode;
  if (!defs) return Promise.resolve();
  const loads = [];
  for (const unitId of unitIds) {
    for (const [size, box] of Object.entries(PORTRAIT_FILES.sizes)) {
      const id = `portrait-${unitId}-${size}`;
      // A mission's own (M29b: the desert's, `portraits` in data/missions.json)
      // first, then the stick's usual one, so they can come in one at a time.
      const urls = [missionDir, PORTRAIT_FILES.dir].filter(Boolean).map((dir) => `${dir}/${id}.${box.ext}`);
      let symbol = document.getElementById(id);
      if (!symbol) {
        const { width, height } = spriteSize(`portrait-fallback-${size}`);
        symbol = svg('symbol', { id, viewBox: `0 0 ${width} ${height}`, overflow: 'hidden' });
        symbol.appendChild(svg('use', { href: `#portrait-fallback-${size}`, width, height }));
        defs.appendChild(symbol);
        PLACED.add(id);
      }
      loads.push(firstPicture(urls).then((url) => {
        if (!url) return;
        symbol.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
        symbol.replaceChildren(svg('image', {
          href: url, x: 0, y: 0, width: box.width, height: box.height, preserveAspectRatio: 'xMidYMid slice',
        }));
        onLoaded(id);
      }));
    }
  }
  return Promise.all(loads);
}

/** The first of these pictures that loads, or null. */
async function firstPicture(urls) {
  for (const url of urls) if (await picture(url)) return url;
  return null;
}

/** Sprite id for the time pencil of this many turns (M31d): 1 to 6 by colour. */
export function timePencilId(fuse) {
  return `time-pencil-${Math.min(TIME_PENCIL_COLOURS.length, Math.max(1, fuse))}`;
}

/**
 * Sprite id for a fuse token: turns left of the charge's own length (M30),
 * 1 to 6; a longer one is drawn as if it were 6 long.
 */
export function fuseMarkerId(fuse, length = fuse) {
  const whole = Math.min(FUSE_LENGTHS.length, Math.max(1, length));
  return `marker-fuse-${whole}-${Math.min(whole, Math.max(1, Math.ceil((fuse * whole) / Math.max(length, 1))))}`;
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
  const offRegister = [...Object.keys(PALETTE).filter((c) => c !== 'ink').map((c) => `.${c}`), '.counter-body', '[class*="tone-"]'];
  const misregister = `${offRegister.join(',')}{transform:translate(${MISREGISTER.x}px,${MISREGISTER.y}px)}`;
  // Stepped, never eased: a blast is revealed in three frames and then gone.
  // A spent man's die-cut edge is set by board.js through --counter-edge.
  const motion = [
    `.counter-edge{stroke:var(--counter-edge,${COUNTER.edge})}`,
    `.counter-body{fill:var(--counter-body,${PALETTE.green})}`,
    '@keyframes nd-blast{0%{transform:scale(0.35)}12%{transform:scale(0.75)}24%{transform:scale(1)}85%{opacity:1;transform:scale(1)}100%{opacity:0}}',
    `.nd-blast{animation:nd-blast ${MOTION.blastMs}ms step-end both;transform-box:fill-box;transform-origin:center}`,
    // The where-to-start cues throb gently, so the eye goes to them (M21).
    `@keyframes nd-throb{0%,100%{transform:scale(1)}50%{transform:scale(${CUE.pulseScale})}}`,
    `.nd-throb{animation:nd-throb ${CUE.pulseMs}ms ease-in-out infinite;transform-box:fill-box;transform-origin:center}`,
  ];
  return [...colours, ...tones, misregister, ...motion].join('\n');
}
