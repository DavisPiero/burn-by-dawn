# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M55b built on branch `m55b-title-train-taglines`, not yet
signed off.

## Where we are

- **`main` is M55**, signed off and pushed. **The branch has M55b** on top of it:
  - **The opening title** is twice the size (108 px, its spacing and shadow doubled with
    it) and its shadow is the palette's cold blue `#3D5A73` instead of red.
  - **The train turns with the line.** The playtester's diagonal look: since M49b the
    track bends down 16° past the fuel dump, and each car kept the angle it stops at for
    its whole run, so cars came in tilted or slid sideways round the bend. Each now turns
    to the track at every hex.
  - **Your wording is in:** the taglines (OUT BY DAWN for France and the airfield) and
    the panel captions M1a, M3, M3a, M5, M5a.
- Tests: 249 headless (`node tools/run-tests.mjs`), 252 in `tests.html`.

## Next

1. **Your sign-off on M55b** (merge, then you push).
2. **Paint the Dakota panel** (ART-PROMPTS.md Priority 30). Until its file is in
   `assets/panels/` the game shows nothing at START GAME, which is why you have not seen
   it. Drop it in as named; Claude makes the smaller copy the game loads.
3. **Then the Gunnerside spec**, `MISSION-GUNNERSIDE.md`, written in Claude Code, for
   your approval before anything is built.
4. Playtests with new people whenever one can be found (`docs/PLAYTEST.md`).

## Open with the operator

1. **The title's blue**: the cold blue as it is. Say if you want it darker.
2. **PICK A DROP DIRECTION draws itself on behind the Dakota panel**: judge it once the
   painting is in.
3. **Still standing:** France a little easier than its baselines say ("ok for now"); the
   bugle for a lesson passed; the knife's cry worded "a cry"; the record's tab at the top
   centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels.
- **Parked in ROADMAP.md:** more panel moments, tips as in-world briefings, an Advice
  button, hiding a body.
