# The desert portraits (the airfield)

The same six men in desert kit, for the airfield only (`portraits` in
data/missions.json). Same names, sizes and rules as `assets/portraits/`
(ART-ASSETS.md §2), with a desert-ochre background instead of blue:

- `portrait-<name>-full.png`, 960 x 1200, the source; the game loads
  `portrait-<name>-full.jpg`, 480 x 600, made from it (see ../README.md)
- `portrait-<name>-chip.png`, 128 x 128, transparent

`<name>` is holloway, fitch, vance, barrow, speers or nunn. Any one missing
falls back to his France portrait, so they can come in one at a time.
