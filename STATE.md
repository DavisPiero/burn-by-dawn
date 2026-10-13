# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, at the end of M48's third session (not yet signed off).

## Where we are

- **Build M48c** on the branch `m48c-fighting-split-and-charges`, waiting for the
  operator's sign-off. `main` is M48b. Tests: 219 headless, 221 in tests.html.
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
  `DECISIONS-ARCHIVE.md`; SPEC §6 and §7 are `DETECTION.md` and `SABOTAGE.md`; the
  milestones done are `MILESTONES.md`.

## Next

1. **The rest of the course**, lessons 12 to 17: the leader, the men, getting out, the
   alert, a wounded man, the passing-out exercise. The table is in MISSION-TRAINING.md.
2. Also M48's: umpire chips and cries, the end-of-course clipboard, START HERE on the
   contents page and the course made playable, the **?** pages' diagrams (in code).
3. **The aqueduct's balance, a short session of its own:** make the knife dearer there
   (a kill that is heard), try hiding a body with it (ROADMAP.md, Parked), and mend
   Hard's North run. Bot runs from a frozen copy.
4. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

Each of these stands as Claude guessed until answered.

1. **The course list as a two-page spread?** (the operator's question, 13 Oct). The two
   columns hold eleven; seventeen will need them a little tighter, or a real spread
   with the clipboard. Claude's recommendation: decide it with the clipboard.
2. **The two-column list's look** (18 px titles, two lines a lesson) is Claude's.
3. **Lesson 11's card lies top left**, to clear the bridge and the timer tin. Right?
4. **The course's timers run 2 to 4 turns**, and lesson 11 keeps the bridge's two
   charges with the second left lying at the far point. Both Claude's.
5. **All the lesson words** (now eleven lessons) and the course's landing lines are
   Claude's, for the operator's rewording pass.
6. **The gear at 24 px** was still not checked by eye by the operator.
7. **SPEC.md is 827 lines**, still over 500. Next to move out, if wanted: §4 (turn
   structure and actions) and §10 (win, lose, score).

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; Priority 21, the six in winter
  kit, optional. The rewording pass on the lessons and the aqueduct's copy.
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.
