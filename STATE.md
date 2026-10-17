# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 17 Oct 2026, M53 built on branch `m53-wording`, not yet signed off.

## Where we are

- **`main` is M52.** Branch **`m53-wording`** holds M53, waiting for your sign-off:
  - **The wording sheet**, `docs/WORDING.md`: 1,389 lines the player sees, in 14 groups
    by where they show (contents, orders, how to play, the drop, the map, the men, the
    right page, actions, the hover readout, cards in play, the report, the back page,
    the comic panels, the training course). Reword the words after each `|`.
    `docs/WORDING-SOURCES.md` is for Claude: where each line lives.
  - **The orders on Hard's aqueduct** now say "ROAD BRIDGE +4 (no charge to spare)".
    One general rule: any bonus target that would leave too few charges for the job is
    marked. Today only Hard's road bridge is (the airfield's signals tent can be cut,
    and its bowser and bomb store are part of the job on Hard).
- Tests: 245 headless (`node tools/run-tests.mjs`).

## Next

1. **Your wording pass** on `docs/WORDING.md`. Then a session that carries the changed
   lines back into `data/` and the code, and makes the spec's quotes follow.
2. More playtests with new people (`docs/PLAYTEST.md`, `?playtest`).
3. Then the next big piece, your choice (ROADMAP.md): a fourth mission, or more panel
   moments with the in-world tips.

## Open with the operator

1. **Sign off M53** (merge `m53-wording` into main).
2. **Still standing:** France a little easier than its baselines say ("ok for now"); the
   bugle for a lesson passed; the knife's cry worded "a cry"; the record's tab at the
   top centre.

## Owed

- **From the operator:** the wording pass (the sheet holds the lessons, the aqueduct's
  copy, the ? pages and the panel captions); optional art 21 (winter kit).
- **Parked in ROADMAP.md:** more panel moments, tips as in-world briefings, an Advice
  button, hiding a body.
