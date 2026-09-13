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
