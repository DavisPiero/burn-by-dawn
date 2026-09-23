# Portraits

Drop portrait PNGs here. The game picks them up on load; no code changes.

- `portrait-<id>-full.png` — 4:5, 960 x 1200 px (at least 480 x 600), head and shoulders,
  opaque, no border or text. Keep the face inside the central 80% of the width and between
  12% and 92% of the height: the roster rail crops the edges.
- `portrait-<id>-chip.png` — optional, 1:1, 128 x 128 px, helmet and face only, transparent
  background. Used on the counter at about 15 px.

`<id>` is the trooper's id in `data/roster.json`: holloway, fitch, vance, barrow, speers,
nunn. A missing file just means the drawn portrait is used. Full spec: ART-ASSETS.md §2.
