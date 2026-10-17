# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 17 Oct 2026, M52 signed off, merged and pushed.

## Where we are

- **`main` is M52**, signed off, merged and pushed; no branch open:
  - **The aqueduct rebalanced** to your pick: Normal takes five charges, Hard all six.
    Every run inside its target: Easy 96 / 99 / 98, Normal 89 / 83 / 82, Hard 37 / 33 / 41.
    Hard careful level with hunting; the rating bands kept.
  - **Comic panels, in the game for everyone**: your landing painting after the drop,
    the mission's contents painting on a win, tipped 4°, a click or key to put away.
  - **The Practice Ground's** contents panel and title card (watermark gone) are in.
- Tests: 243 headless (`node tools/run-tests.mjs`).

## Next

1. **A wording sheet** (your go-ahead): every line the player sees, by where it shows,
   in one document free of code and notes, for you to reword; Claude carries the
   changes back into `data/` and the code. Its own session.
2. More playtests with new people (`docs/PLAYTEST.md`, `?playtest`), then their notes:
   watch whether the panels feel like a reward or a speed bump.
3. Then the next big piece, your choice (ROADMAP.md): a fourth mission, or more panel
   moments with the in-world tips.

## Open with the operator

1. **Hard's orders still say "Bonus: ROAD BRIDGE +4"**, though with all six charges
   needed blowing it loses the mission. Recommended, not yet answered: the orders mark
   any bonus target the stick has no charge to spare for, "(no charge to spare)", as
   one general rule.
2. **The panel captions are placeholder copy**, for you to reword (`comicPanels` in
   `data/missions.json`).
3. **Still standing:** France a little easier than its baselines say ("ok for now"); the ?
   pages' lines are Claude's; the bugle for a lesson passed; the knife's cry worded
   "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the wording pass on the lessons, the aqueduct's copy, the ?
  pages and the panel captions; optional art 21 (winter kit).
- **Parked in ROADMAP.md:** more panel moments, tips as in-world briefings, an Advice
  button, hiding a body.
