# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M57 (the Gunnerside engine) built on branch
`m57-gunnerside-engine`, waiting for the operator's sign-off. Not merged, not pushed.

## Where we are

- **`main` is M56, pushed.** The branch adds M57 on top; the margin says build M57.
- **M57, the engine for mission 4**, all of it off in France, the airfield and the
  aqueduct (the bot plays them byte for byte as before, 9 runs compared):
  - **Tracks in the snow** (SPEC.md §9 Tracks, `src/tracks.js`): prints laid on ground
    marked `tracks: true`, turned the way the man walked, fading over 3 turns; found as
    a parachute is, one find taking that move's whole trail, the alert raised once a
    phase at most; undo takes them back. Drawn as two lines of boot prints; a boot mark
    and a TRACKS row on the hovered path say who finds them next turn; a print's hover
    says whose, when it fills, who finds it; TRACKS! tip on the first trail.
  - **The no-shot clean run** (`scoring.cleanNoShot`) and the first shot kept in state.
  - **The card before the first shot** (`confirmShot`): HOLD YOUR FIRE?, Enter fires.
  - Snowfield and Drift are in `terrain.json` as data; no map uses them yet.
- Tests: 258 headless, 261 in `tests.html`.

## Next

1. **The operator signs M57 off** (or not); then merge, a MILESTONES row, push.
2. **M58, the map as a draft** (MISSION-GUNNERSIDE.md, The order it is built in): the
   terrain drawn, the garrison, the objectives, the ski trail, the bot taught prints
   and the climb. Then M59 (balance), M60 (words, sounds, art), M61 (panel moments).
3. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **SPEC.md is 511 lines**, past the 500 the working agreement sets. Proposed: move §9,
   the drop (runs, scatter, parachutes, canisters, tracks), into `DROP.md`, as §4, §6,
   §7 and §10 are. Not done: waiting for a yes.
2. **Guesses in M57**, kept unless changed: prints found one turn ahead only; the shot
   card's words (placeholder until M60); TRACKS! under the trail's first print.
3. **Guesses in the Gunnerside spec**, starting points for balance: a 20-turn night;
   prints last 3 turns; the hall takes 3 charges (Easy 2, Hard 4); the telephone line the
   one bonus target; seven enemies; the names and every word.
4. **PICK A DROP DIRECTION drawing in behind the Dakota panel**: judge it once painted.
5. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
