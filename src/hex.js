// Hex coordinate math. Pointy-top hexes, axial coordinates (q, r). No offset
// coordinates anywhere in this codebase — see SPEC.md §2.
//
// Pure functions only. Nothing here touches the DOM or game state.

// Neighbour directions, in SPEC.md §2's order. §2 names them N, NE, SE, S, SW,
// NW, but those are flat-top names: on a pointy-top board (0,-1) is up-left and
// there is no straight north. The comments give where each one really points,
// which is what a facing written in data has to mean.
export const NEIGHBOR_DIRS = [
  { q: 0, r: -1 }, // NW
  { q: 1, r: -1 }, // NE
  { q: 1, r: 0 },  // E
  { q: 0, r: 1 },  // SE
  { q: -1, r: 1 }, // SW
  { q: -1, r: 0 }, // W
];

/** Compass names for NEIGHBOR_DIRS, index for index. Facings in data use these. */
export const DIRECTION_NAMES = ['NW', 'NE', 'E', 'SE', 'SW', 'W'];

/** Index into NEIGHBOR_DIRS of the step from a to an adjacent b, or -1. */
export function directionOf(a, b) {
  return NEIGHBOR_DIRS.findIndex((d) => a.q + d.q === b.q && a.r + d.r === b.r);
}

export function neighbors(q, r) {
  return NEIGHBOR_DIRS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

// The q value a rectangular map's row r should start from. Because axial
// pixel-x has a built-in shear (see axialToPixel), a naive q in [0, width)
// on every row draws a parallelogram, not a rectangle. Shifting each row's
// starting q by -floor(r/2) cancels that shear so the map's bounding box
// renders as a rectangle (with the usual half-hex zigzag on the left/right
// edges). Hexes are still addressed by their true (q, r) — this only picks
// which (q, r) pairs belong to a rectangular map; it is not an offset
// coordinate system (SPEC.md §2 forbids that for game logic, not this).
export function rowQStart(r) {
  return -Math.floor(r / 2);
}

// Axial to pixel, size = hex circumradius. SPEC.md §2.
export function axialToPixel(q, r, size) {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * (3 / 2) * r,
  };
}

// Hex distance between two axial coords. SPEC.md §2.
export function hexDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// The six corner points of a pointy-top hex of the given size, centred on
// the origin. Rotate by -30° per corner starting from the top-right point.
export function hexCorners(size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: size * Math.cos(angle), y: size * Math.sin(angle) });
  }
  return corners;
}

/**
 * Every hex on the straight line from a to b, both ends included. SPEC.md §2:
 * a cube lerp, rounded. Both ends are nudged by the same tiny amount so a line
 * running exactly along a hex edge always falls the same way — one fixed
 * answer, so the detection readout and the detection check can never disagree.
 */
export function hexLine(a, b) {
  const n = hexDistance(a, b);
  if (n === 0) return [{ q: a.q, r: a.r }];
  const eps = 1e-6;
  const aq = a.q + eps, ar = a.r + 2 * eps;
  const bq = b.q + eps, br = b.r + 2 * eps;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(roundAxial(aq + (bq - aq) * t, ar + (br - ar) * t));
  }
  return out;
}

function roundAxial(fq, fr) {
  const fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 }; // + 0 turns -0 into 0
}

/**
 * Is `target` inside a vision arc of `arcDegrees` centred on facing direction
 * `facing` (an index into NEIGHBOR_DIRS), seen from `from`? Measured between
 * hex centres in pixel space, edges inclusive: a 120° arc facing E takes in the
 * NE, E and SE neighbours, exactly half the ring.
 */
export function inArc(from, facing, target, arcDegrees) {
  const d = NEIGHBOR_DIRS[facing];
  const f = axialToPixel(d.q, d.r, 1);
  const v = axialToPixel(target.q - from.q, target.r - from.r, 1);
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return false;
  const cos = (f.x * v.x + f.y * v.y) / (Math.hypot(f.x, f.y) * len);
  return cos >= Math.cos((arcDegrees / 2) * (Math.PI / 180)) - 1e-9;
}
