# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, at the end of M48's second session (signed off).

## Where we are

- **Build M48b** on `main`, the only branch, signed off and pushed on 13 Oct 2026.
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

1. **M48, third session, first: the operator's two notes of 13 Oct**, planned and
   agreed for the next session, not built:
   - **Lesson 7 split in three, one man each:** 7 The knife (Vance: move in behind,
     end the turn, knife), 8 The gunner (Speers: suppress, end the turn, kill),
     9 Firing back (Fitch). The course becomes seventeen; charges move to 10 and 11.
   - **A step waiting on NEXT with live-looking buttons:** in a lesson the action strip
     shows as buttons only what the step allows; and while a card waits on NEXT, doing
     exactly what the next step asks counts as NEXT and does it.
2. **Then the rest of the course:** charges (two lessons, needing `start.canisters`)
   and on to the passing-out exercise. The table is in MISSION-TRAINING.md.
3. Also M48's: umpire chips and cries, the end-of-course clipboard, START HERE on the
   contents page and the course made playable, the **?** pages' diagrams (in code).
4. **The aqueduct's balance, a short session of its own:** make the knife dearer there
   (a kill that is heard), try hiding a body with it (ROADMAP.md, Parked), and mend
   Hard's North run. Bot runs from a frozen copy.
5. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

Each of these stands as Claude guessed until answered.

1. **Three lessons from lesson 7, making seventeen**, was Claude's recommendation; the
   operator asked for knives and guns apart and no switching between men. Confirm
   three (not two) at the next kickoff.
2. **Doing the next step's action counting as NEXT** lets a player skip reading the
   next card's instruction. Confirm.
3. **All the lesson words and the six landing lines for the course are Claude's**,
   for the operator's rewording pass.
4. **The practice ground keeps one drop run**; the board says CLICK THE DROP RUN.
5. **The gear at 24 px** (20% bigger, as asked) was not checked by eye. Big enough?
6. **The contents blurb and tagline** say "training bridge" (a guess).

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; Priority 21, the six in winter
  kit, optional. The rewording pass on the lessons and the aqueduct's copy.
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.

## Housekeeping due

- DECISIONS.md (901 lines) and SPEC.md (1,119 lines) are past the size limits in the
  global working agreement. Proposed, not done: move DECISIONS before M40 into
  `DECISIONS-ARCHIVE.md`; move SPEC §12's Done table into `MILESTONES.md` and §6 and
  §7 (detection, sabotage) into files of their own, as §11 and §13 to §15 are.
