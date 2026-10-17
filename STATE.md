# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M55 built on `m55-title-dakota-panels`, waiting for sign-off.

## Where we are

- **`main` is M54b**, pushed. **M55 is on its branch**, not merged:
  - **Your rewording of the men's lines is in the game**: all 76 lines you changed in
    section F of `docs/WORDING.md`, in the three missions.
  - **The title painting**: a slot behind the opening page. Your painting fades up behind
    BURN BY DAWN as soon as it loads, cropped to fill the window under a dark shade.
    Without it the page is plain dark, as before.
  - **The Dakota panel**: a comic panel when START GAME is clicked, before a drop run is
    picked, in France, the airfield and the aqueduct (not the course). Each mission tries
    its own painting first, then the shared one. Without either, nothing shows.
  - Both are specified in `ART-PROMPTS.md`, **Priorities 29 and 30**: sizes, what to keep
    clear, and a prompt each. The Dakota captions are placeholders, on the wording sheet as
    M1a, M3a and M5a.
- Tests: 248 headless (`node tools/run-tests.mjs`), 251 in `tests.html`.

## Next

1. **Your sign-off on M55**, then the merge.
2. **Paint the two pictures** (Priorities 29 and 30). Drop them in as named; Claude makes
   the smaller copies the game loads.
3. **Then the Gunnerside spec**, `MISSION-GUNNERSIDE.md`, written in Claude Code, for your
   approval before anything is built.
4. Playtests with new people whenever one can be found (`docs/PLAYTEST.md`).

## Open with the operator

1. **The Dakota captions** are mine (M1a, M3a, M5a on the wording sheet): reword them.
2. **PICK A DROP DIRECTION draws itself on behind the Dakota panel**, so it is already
   drawn when you put the panel away. Say if you would rather it drew on afterwards.
3. **START HERE overlaps the practice ground's shorter line**: move it with `?layout` if
   you mind.
4. **Guesses to confirm:** "those aircraft" (was "the those"); Vance's "Touchdown." as one
   word; the practice ground keeps one landing line each.
5. **Still standing:** France a little easier than its baselines say ("ok for now"); the
   bugle for a lesson passed; the knife's cry worded "a cry"; the record's tab at the top
   centre.

## Owed

- **From the operator:** the title painting and the Dakota panel; optional art 21 (winter
  kit); optional per-mission Dakota panels.
- **Parked in ROADMAP.md:** more panel moments, tips as in-world briefings, an Advice
  button, hiding a body.
