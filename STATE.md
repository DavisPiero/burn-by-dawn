# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 16 Oct 2026, M49e built on branch `m49e-aqueduct-balance`, awaiting sign-off.

## Where we are

- **`main` is M49d**, signed off, merged and pushed: spent charge points, parachutes under
  the targets' words, the dotted swim outline, the kill's burst, the aqueduct's beach to
  wait on and Board boat on B, its map a hex east with woods in the south-west corner.
- **`m49e-aqueduct-balance` is M49e**, not merged:
  - Most of the aqueduct's fall after M49d was the bot's fault: a spare man stood on a
    fresh charge point and the carrier waited beside him all night. The bot's new `PICK=1`
    mends it and is now in the aqueduct's reference.
  - Hard's aqueduct takes **four charges, not five** (the operator's option A).
  - Naive bot, west / north / valley: Easy 96 / 98 / 97, Normal 79 / 85 / 79, Hard
    43 / 26 / 32. Every level inside its target. Build M49e.
- Tests: 243 headless (`node tools/run-tests.mjs`), 246 in tests.html.

## Next

1. Sign-off of M49e (merge, push).
2. More playtests with new people (`docs/PLAYTEST.md`, `?playtest`), then their notes.
3. **Redraw the aqueduct's board pictures** from the Priority 22 references (aqueduct,
   road bridge, boat, canister, terraces, olive grove): a milestone of its own.

## Open with the operator

1. **France is a little easier than its baselines say.** The same bot fault blocked its
   bridge's two points. With `PICK=1`: Normal 93 / 92 / 94 (target 75 to 90), Hard
   41 / 40 / 55 (25 to 45). Its reference left as it was; whether to retune is yours.
2. **On Hard the hunter still beats careful play** on the aqueduct (79 / 68 / 74 against
   61 / 63 / 38), as M48l found and you left.
3. **Listen to the kill's burst** (levelled by reading, not by ear).
4. **Still standing from before:** the ? pages' lines are Claude's; the bugle for a lesson
   passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the wording pass on the lessons, the aqueduct's copy and the ?
  pages; optional art 21 (winter kit) and 25 (the course's contents panel and title card).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
