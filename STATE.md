# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, after M48's second session and the operator's notes on it.

## Where we are

- **Build M48b** on the branch `m48b-the-drop-and-notes`, **not yet signed off**: it is
  not merged to `main` and not pushed. `main` and the live game are still M48.
  Tests: 216 headless, 218 in tests.html.
- **Three missions are playable:** the rail bridge (France), the airfield (Tunisia)
  and the aqueduct (Italy). The aqueduct is playable but not yet balanced.
- **Phase 5, teaching the game, is in progress.** The training course is a draft
  (`?mission=training`) with **lessons 1 to 7 of fifteen**: the drop and reading the
  page, parachutes, action points, ground, seen and not seen, watching the garrison,
  fighting. It heads the contents page stamped NEXT YEAR'S ANNUAL.
- **Every lesson step is "do it, see it, then NEXT"**: the card stays and explains what
  was just done until the green NEXT (or Enter).
- **A menu behind a gear** at the top of the left margin: sound, music, play tips,
  restart, back to contents. Play tips are on for everyone unless switched off there.
- PASSED, the course list and START GAME go on only by their green button or Enter.

## Next

1. **Sign off M48b**, or send notes on it.
2. **The aqueduct's balance, a short session of its own:** make the knife dearer there
   (a kill that is heard), try hiding a body with it (ROADMAP.md, Parked), and mend
   Hard's North run. Bot runs from a frozen copy.
3. **M48, continued:** lessons 8 and 9 (charges, needing `start.canisters`), then 10 to
   15. The table is in MISSION-TRAINING.md.
4. Also M48's: umpire chips and cries, the end-of-course clipboard, START HERE on the
   contents page and the course made playable, the **?** pages' diagrams (in code).
5. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

Each of these stands as Claude guessed until answered.

1. **One more click a step.** "Do, see, NEXT" roughly doubles the clicks in a lesson.
   Right trade, or too slow once played?
2. **Lesson 7 is nine steps** now that firing back is played. Keep it whole, or make
   firing back a lesson of its own?
3. **The gear is 20 px with MENU under it**, at the top of the margin. Noticeable
   enough?
4. **The practice ground keeps one drop run**; the board says CLICK THE DROP RUN.
5. **All the lesson words and the six landing lines for the course are Claude's**,
   for the operator's rewording pass.
6. **TRAINING BRIDGE's name is 0.4 of a hex lower**, just over the deck. Low enough?

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; Priority 21, the six in winter
  kit, optional. The rewording pass on the lessons and the aqueduct's copy.
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.

## Housekeeping due

- DECISIONS.md (900 lines) and SPEC.md (1,119 lines) are past the size limits in the
  global working agreement. Proposed, not done: move DECISIONS before M40 into
  `DECISIONS-ARCHIVE.md`; move SPEC §12's Done table into `MILESTONES.md` and §6 and
  §7 (detection, sabotage) into files of their own, as §11 and §13 to §15 are.
