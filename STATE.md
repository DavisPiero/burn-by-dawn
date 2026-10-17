# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 17 Oct 2026, M54b signed off, merged and pushed.

## Where we are

- **`main` is M54b**, signed off, merged and pushed:
  - **Your rewording is in the game**: every line you changed on `docs/WORDING.md`
    (contents, orders, How to Play, the drop, the counter key, the men, the panels), and
    the spec's quotes of them follow.
  - **Your new practice ground painting** is on the contents page, and START HERE sits
    where you placed it.
  - **Each man's moments now have three lines** (landing, setting a charge, hit, a kill,
    seen, going to ground), in the three missions. Which one he says changes with the
    seed and the turn, never with a dice roll, so a seed still plays the same game.
    The new lines are on the wording sheet as F77b, F77c and so on, for you to reword.
- **Your notes on M54 (M54b)**: the canister line and Hard
  aqueduct's orders say their rules plainly again, the counter key says "It will face",
  and the lesson card comes up with a quick scale-in instead of shaking (the shake also
  fired on every hover; that is fixed).
- Tests: 247 headless (`node tools/run-tests.mjs`), 250 in `tests.html`.

## Next

1. **M55, the title and Dakota panels** (decided 17 Oct 2026, ROADMAP.md item 1):
   - **A title painting** behind the opening page ("BURN BY DAWN / click or press any
     key", now plain dark): the stick in silhouette on a mission.
   - **A Dakota panel**: the men in the back of the aircraft readying to jump, shown as
     a comic panel after START GAME and before the drop run is picked, in every mission.
     One shared painting first; desert or winter variants later through each mission's
     own picture folder, which falls back to the shared one.
   - Claude writes both into `ART-PROMPTS.md` (sizes, prompts) and puts a placeholder
     in the game for each, so your paintings drop straight in.
   - Plus carrying back your rewording of the new lines (the `b` and `c` tags in section
     F of `docs/WORDING.md`), if it is ready.
2. **Then the Gunnerside spec**, `MISSION-GUNNERSIDE.md`, written in Claude Code (it
   has to fit the engine and data), for your approval before anything is built.
3. Playtests with new people whenever one can be found (`docs/PLAYTEST.md`).

## Open with the operator

1. **START HERE now overlaps the practice ground's shorter line** ("one lesson at a
   time"): move it with `?layout` if you mind.
2. **Guesses to confirm:** "those aircraft" (was "the those"); Vance's "Touchdown." as
   one word; the practice ground keeps one landing line each.
3. **Still standing:** France a little easier than its baselines say ("ok for now"); the
   bugle for a lesson passed; the knife's cry worded "a cry"; the record's tab at the
   top centre.

## Owed

- **From the operator:** the new lines' wording; the title and Dakota paintings once
  M55 has specified them; optional art 21 (winter kit).
- **Parked in ROADMAP.md:** more panel moments (beyond M55's two), tips as in-world briefings, an Advice
  button, hiding a body.
