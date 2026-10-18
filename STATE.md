# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M55 signed off, merged and pushed.

## Where we are

- **`main` is M55**, signed off, merged and pushed:
  - **Your rewording of the men's lines is in the game**: all 76 lines you changed in
    section F of `docs/WORDING.md`, in the three missions.
  - **Your title painting** is behind the opening page: it fades up behind BURN BY DAWN
    as soon as it loads, cropped to fill the window under a dark shade (your 2400 x 1500
    kept as `title-painting_full.jpg`; the game loads a 1600 x 1000 copy).
  - **The Dakota panel**: a comic panel when START GAME is clicked, before a drop run is
    picked, in France, the airfield and the aqueduct (not the course). Each mission tries
    its own painting first, then the shared one. Without either, nothing shows.
  - Both are specified in `ART-PROMPTS.md`, **Priorities 29 and 30**: sizes, what to keep
    clear, and a prompt each. The Dakota captions are placeholders, on the wording sheet as
    M1a, M3a and M5a.
- Tests: 248 headless (`node tools/run-tests.mjs`), 251 in `tests.html`.

## Next

1. **The opening page's title (the operator's note, 18 Oct 2026):** BURN BY DAWN twice
   as big (54 px to 108 px, `.loading-title` in index.html), its drop shadow dark blue
   instead of red. Guess: the palette's cold blue `#3D5A73` (leader blue is reserved for
   the leader), darkened if it reads too light over the painting.
2. **Paint the Dakota panel** (Priority 30). Drop it in as named; Claude makes the smaller
   copy the game loads.
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

- **From the operator:** the Dakota panel; optional art 21 (winter
  kit); optional per-mission Dakota panels.
- **Parked in ROADMAP.md:** more panel moments, tips as in-world briefings, an Advice
  button, hiding a body.
