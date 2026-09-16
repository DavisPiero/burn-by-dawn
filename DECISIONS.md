# DECISIONS

Append-only. One line per non-obvious choice, newest at the bottom. Never rewrite or
reorder existing entries.

Format: `YYYY-MM-DD | M<n> | decision — reason`

---

2026-09-14 | M0 | Vanilla JS + SVG, no build step — keeps Claude Code sessions free of toolchain failures, and SVG suits the paper-comic art direction
2026-09-14 | M0 | Pointy-top axial hex coords — simplest distance and neighbour maths, no offset conversions anywhere
2026-09-14 | M0 | Seeded RNG for all randomness — drop scatter must be reproducible for debugging and balance testing
2026-09-14 | M0 | Character traits as data on fixed hooks, never code branches — a seventh trooper must cost one JSON entry
2026-09-14 | M0 | Grid/hex-size constants hardcoded in main.js, not data/map.json — map.json doesn't exist until M1; will migrate then
2026-09-14 | M0 | rng.js deferred until a milestone actually needs randomness (M6 drop scatter) — nothing to seed yet, avoids build-ahead
2026-09-14 | M0 | Hex outlines drawn directly in board.js, not through theme.js sprite registry — treated as grid geometry, not sprite art; theme.js starts at M7
2026-09-14 | M0 | 18x13 axial grid renders as a parallelogram, not a rectangle — inherent to pointy-top axial coords with no offset system (SPEC.md §2 forbids offset coords)
2026-09-14 | M0 | Superseded above: shift each row's q start by -floor(r/2) (hex.js rowQStart) so the map's bounding box is a rectangle — still pure axial (q,r) per-hex, not an offset coordinate system, just picks which (q,r) belong to a rectangular map
2026-09-16 | M1 | Terrain rules live in data/terrain.json, a sixth data file not in SPEC.md §1 — terrain stats are global, not per-map; putting them in map.json duplicates them the moment a second map exists
2026-09-16 | M1 | Added bridge and lock terrain types — SPEC.md §3 says the canal is "crossable only at bridge/lock" but its table defines neither, so the canal was uncrossable; confirmed with the operator before adding
2026-09-16 | M1 | map.json stores the grid as 13 row strings + a char legend, not (q,r) pairs — rows are shifted by rowQStart so authoring by axial coords would be unusable by hand; column i in row r is q = rowQStart(r) + i
2026-09-16 | M1 | A bridge hex replaces the canal hex it spans rather than sitting on top of it — one terrain per hex keeps lookup trivial; the water beneath is implied by the M7 bridge art
2026-09-16 | M1 | theme.js created early (DECISIONS M0 deferred it to M7) holding colour tokens only, no sprite registry — terrain fills are the first real palette decision and CLAUDE.md rule 8 wants art swappable from one file
2026-09-16 | M1 | Terrain fills are tints of the five SPEC §11 palette colours, not new colours — twelve terrains cannot be legible in five flat colours, and tints keep M7 a swap rather than a redesign
2026-09-16 | M1 | A terrain id with no theme.js colour renders magenta instead of failing — an unstyled new terrain should be obvious on the board, not invisible
2026-09-16 | M1 | Data fetched with cache: 'no-cache' — the browser was serving a stale terrain.json after an edit, which silently defeats the whole point of a data-driven map
2026-09-16 | M1 | Bad map data throws with file, row and column and renders as an on-page error — a data-driven map is only useful if a typo says so out loud
