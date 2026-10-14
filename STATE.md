# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 14 Oct 2026, M48's eighth session (M48i, not yet signed off).

## Where we are

- **M48h signed off**, merged and pushed. `main` is M48h.
- **Build M48i** on the branch `m48i-help-diagrams`, waiting for the operator's
  sign-off, which ends M48. Tests: 226 headless, 228 in tests.html.
- **M48i, the ? pages:** how to play is six tabs: MOVING, BEING SEEN, CHARGES,
  FIGHTING, GETTING OUT and TONIGHT. Each of the first five has a small board that
  plays one thing over and over with tonight's men and counters, printed in the
  mission's own ground (sand and dunes in the desert), and at most three lines under
  it. TONIGHT is the mission's own lines, as before. ← and → turn the pages. The
  scenes are data in `data/help.json`; their AP costs and fuse come from the rules.

## Next

1. **The operator's sign-off on M48i** (merge, push, delete the branch).
2. **The aqueduct's balance**, a short session of its own. Bot runs from a frozen copy.
3. **M49: playtest the course on people who have never seen the game.**

## Open with the operator

1. **Look at the five scenes** (? in any mission, then the tabs or the arrow keys).
   Speed (a third of a second a hex, about 8 to 16 s a loop), the words under each,
   and whether the pen letter for a key (S, K, C) reads.
2. **Listen to the six new sounds** from M48h (cut by measuring, not by ear).
3. **The rest of `assets/audio/Src/`** is not wired in. Say which should go where.
4. **PASSED OUT** stays the qualification and the stamp (Claude's guess).

## Guesses in M48i, until confirmed

- The lines on each page are Claude's, to the operator's pattern (the rule with its number).
- The airfield and aqueduct show a 3-turn fuse watch in CHARGES, while their line
  speaks of the time pencil: the tin is not drawn in the scene.
- The page last opened is kept while the game runs; the card opens on MOVING first.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; optional: 21 (winter kit),
  25 (the course's contents panel and title card). The rewording pass on the lessons,
  the aqueduct's copy, and now the ? pages' lines.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard.
