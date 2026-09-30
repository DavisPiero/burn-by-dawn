# The desert portraits (the airfield)

The same six men in desert kit, for the airfield only (`portraits` in
data/missions.json). Same names, sizes and rules as `assets/portraits/`
(ART-ASSETS.md §2), with a desert-ochre background instead of blue:

- `portrait-<name>-full.png`, 960 x 1200, the source; the game loads
  `portrait-<name>-full.jpg`, 480 x 600, made from it (see ../README.md)
- `portrait-<name>-chip.png`, 128 x 128: unlike France's, the head is set on a dark
  red-brown rounded square with an ink edge (M30b, the operator's: "on a dark brown/red
  background, similar to the new portraits"). Made as tools/make-chips.js makes France's,
  from the PNGs: the square [0.13 W, 0.03 H, 0.74 W] (Vance's from 0.01 H), the flat
  background keyed out, laid on a radial fill #6b3322 → #4a2418 inside a 3 px inset
  rounded square (radius 14), stroked 5 px in ink #1A1A18

`<name>` is holloway, fitch, vance, barrow, speers or nunn. Any one missing
falls back to his France portrait, so they can come in one at a time.
