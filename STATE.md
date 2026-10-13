# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, after M48's fifth session (M48f, not yet signed off).

## Where we are

- **Build M48f** on the branch `m48f-passing-out`, waiting for the operator's
  sign-off. `main` is M48e. Tests: 220 headless, 222 in tests.html.
- **Three missions are playable:** the rail bridge (France), the airfield (Tunisia)
  and the aqueduct (Italy). The aqueduct is playable but not yet balanced.
- **The training course has all seventeen lessons**, still a draft
  (`?mission=training`). New this session: 17 Passing out, the whole of a raid with
  no hand held. It cannot be failed: a whistle goes back to the last of three
  checkpoints, and the umpire says on a card what a thing would have cost on a real
  mission.
- **The course's list is a two-page spread**: the lessons a line each on the left,
  the clipboard (the training record, ten qualifications) on the right, stamped
  PASSED OUT when all seventeen are passed.
- **Every other lesson step is "do it, see it, then NEXT".** In a lesson only what
  would do something shows as a button, no path is drawn to a hex he may not go to,
  and the readout says "no movement on this lesson step" there.

## Next

1. **The rest of M48:** umpire chips and cries, START HERE on the contents page and
   the course made playable, the **?** pages' diagrams (in code).
2. **The aqueduct's balance, a short session of its own:** make the knife dearer there
   (a kill that is heard), try hiding a body with it (ROADMAP.md, Parked), and mend
   Hard's North run. Bot runs from a frozen copy.
3. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

1. **The umpire's card comes up every time a man is first seen** in lesson 17. That
   is what was asked; if it nags in play, it could say each thing once an exercise.
2. **A whistle can go back several turns** (to the last checkpoint: there are three).
   Claude's guess: fine. A checkpoint at every turn's start would need the engine grown.
3. **Lesson 17 is called "Passing out"** in the list and on its card: the longer name
   ran to two lines on its narrow card.
4. **The clipboard is drawn in code.** Paint one, or keep it?

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; Priority 21, the six in winter
  kit, optional. The rewording pass on the lessons and the aqueduct's copy.
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.
