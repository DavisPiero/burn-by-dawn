# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 17 Oct 2026, M52 built on branch `m52-aqueduct-rebalance`, not yet signed off.

## Where we are

- **`main` is M51.** M52 is on its branch, committed, tests passing (243 headless):
  - **The aqueduct rebalanced** to your pick: Normal takes five charges, Hard all six.
    Every run inside its target: Easy 96 / 99 / 98, Normal 89 / 83 / 82, Hard 37 / 33 / 41.
    Hard careful level with hunting; the rating bands kept.
  - **Comic panels, a test**: add `?panels=on` to the address. Mission accomplished shows
    the mission's contents panel over the board beside the back page; the landing shows
    once its painting is in `assets/panels/` (ART-PROMPTS.md 28: three prompts, France
    first). Off for everyone else.
  - **The Practice Ground's** contents panel and title card are in.

## Next

1. You sign M52 off (or send notes); then merge and push.
2. Paint France's landing panel, play with `?panels=on`, and decide whether panels are a
   phase of their own.
3. More playtests with new people (`docs/PLAYTEST.md`, `?playtest`).

## Open with the operator

1. **The Practice Ground's title card has a "Grok" watermark** bottom right, by the
   lorry's wheel: to paint out.
2. **Hard's orders still say "Bonus: ROAD BRIDGE +4"**, though with all six charges
   needed blowing it loses the mission (the level's summary says so). Reword, or keep?
3. **Normal's hunter is 8 over careful on West** (94 against 86), the pattern you left at
   M48l.
4. **The panel captions are placeholder copy**, for you to reword.
5. **Still standing:** France a little easier than its baselines say ("ok for now"); the ?
   pages' lines are Claude's; the bugle for a lesson passed; the knife's cry worded
   "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the landing paintings (28); the wording pass on the lessons, the
  aqueduct's copy and the ? pages; optional art 21 (winter kit).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
