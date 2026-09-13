// Hex coordinate math. Pointy-top hexes, axial coordinates (q, r). No offset
// coordinates anywhere in this codebase — see SPEC.md §2.
//
// Pure functions only. Nothing here touches the DOM or game state.

// Neighbour directions, in order N, NE, SE, S, SW, NW — SPEC.md §2.
export const NEIGHBOR_DIRS = [
  { q: 0, r: -1 }, // N
  { q: 1, r: -1 }, // NE
  { q: 1, r: 0 },  // SE
  { q: 0, r: 1 },  // S
  { q: -1, r: 1 }, // SW
  { q: -1, r: 0 }, // NW
];

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
