# DECISIONS

Append-only. One line per non-obvious choice, newest at the bottom. Never rewrite or
reorder existing entries.

Format: `YYYY-MM-DD | M<n> | decision — reason`

---

2026-09-14 | M0 | Vanilla JS + SVG, no build step — keeps Claude Code sessions free of toolchain failures, and SVG suits the paper-comic art direction
2026-09-14 | M0 | Pointy-top axial hex coords — simplest distance and neighbour maths, no offset conversions anywhere
2026-09-14 | M0 | Seeded RNG for all randomness — drop scatter must be reproducible for debugging and balance testing
2026-09-14 | M0 | Character traits as data on fixed hooks, never code branches — a seventh trooper must cost one JSON entry
