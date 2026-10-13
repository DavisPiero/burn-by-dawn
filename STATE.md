# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, after the operator's notes on M48's third session (M48d, signed off).

## Where we are

- **Build M48d** on `main`, the only branch, signed off and pushed on 13 Oct 2026.
  Tests: 218 headless, 220 in tests.html.
- **Three missions are playable:** the rail bridge (France), the airfield (Tunisia)
  and the aqueduct (Italy). The aqueduct is playable but not yet balanced.
- **Phase 5, teaching the game, is in progress.** The training course is a draft
  (`?mission=training`) with **lessons 1 to 11 of seventeen**: the drop and reading the
  page, parachutes, action points, ground, seen and not seen, watching the garrison,
  the knife, the gunner, firing back, charges (fetch and carry), charges (set and get
  clear).
- **Every lesson step is "do it, see it, then NEXT".** While a card waits on NEXT,
  doing exactly what the next step asks for counts as NEXT. In a lesson only what
  would do something shows as a button; End turn is greyed the same way.
- **The course's list is in two columns**: at eleven lessons it ran off the foot of
  the page, the green button with it.
- **The documents were split** (the operator's): decisions before M40 are in
  `DECISIONS-ARCHIVE.md`; SPEC §4, §6, §7 and §10 are `TURNS.md`, `DETECTION.md`,
  `SABOTAGE.md` and `WINNING.md`; the milestones done are `MILESTONES.md`. SPEC.md is
  468 lines.
- **M48d, the operator's notes:** in lesson 11 Nunn steps onto the charge point; the
  gear is a pixel right, centred in its margin.

## Next

1. **The rest of the course**, lessons 12 to 17: the leader, the men, getting out, the
   alert, a wounded man, the passing-out exercise. The table is in MISSION-TRAINING.md.
2. Also M48's: **the course's list as a two-page spread, with the end-of-course
   clipboard** (the operator's yes, 13 Oct; to be planned before it is built), umpire
   chips and cries, START HERE on the contents page and the course made playable, the **?** pages' diagrams (in code).
3. **The aqueduct's balance, a short session of its own:** make the knife dearer there
   (a kill that is heard), try hiding a body with it (ROADMAP.md, Parked), and mend
   Hard's North run. Bot runs from a frozen copy.
4. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

Answered on 13 Oct: the two-column look, lesson 11's card, the course's timers and the
gear's size are good; the lesson words stand until the operator's rewording pass.

1. **The gear moved 1 px, not "a few"**: the paper margin is 26 px and the gear 24, so
   a pixel centres it and two would touch the board. More needs a smaller gear. Enough?
2. **Lesson 11 is ten steps** now that he walks onto the point, the longest lesson.
   Claude's guess: fine, since each is one small act. Cut it if it drags in play.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; Priority 21, the six in winter
  kit, optional. The rewording pass on the lessons and the aqueduct's copy.
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.
