// The one place colour lives. Art must be swappable by editing this file and
// nothing else (CLAUDE.md rule 8).
//
// M1 is colour tokens only. The SVG <symbol>/<use> sprite registry, the
// halftone patterns and the misregistration offset arrive with the art pass
// at M7; the terrain fills below are functional placeholders so the map is
// readable now. They are tints of the five-colour SPEC §11 palette rather
// than new colours, so the swap at M7 is a swap and not a redesign.

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
};

export const SELECTION = {
  stroke: PALETTE.red,
  strokeWidth: 4,
};
