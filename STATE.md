# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, after M48's second session.

## Where we are

- **Build M48b** on the branch `m48b-the-drop-and-notes`, **not yet signed off**: it is
  not merged to `main` and not pushed. `main` and the live game are still M48.
  Tests: 214 headless, 216 in tests.html.
- **Three missions are playable:** the rail bridge (France), the airfield (Tunisia)
  and the aqueduct (Italy). The aqueduct is playable but not yet balanced.
- **Phase 5, teaching the game, is in progress.** The training course is a draft
  (`?mission=training`) with **lessons 1 to 7 of fifteen**: the drop and reading the
  page, parachutes, action points, ground, seen and not seen, watching the garrison,
  fighting. It heads the contents page stamped NEXT YEAR'S ANNUAL (the operator's: leave
  it first).
- **This session's notes, done:** PASSED, the course list and START GAME go on only by
  their green button; play tips can be switched in the left margin, and come on once
  the course is passed (for that visit); the lesson card says what goes on; a wider ring
  on a man; Tatton Wood, TRAINING BRIDGE, "the road".

## Next

1. **Sign off M48b**, or send notes on it.
2. **The aqueduct's balance, a short session of its own** (the operator's answers 10
   and 11): make the knife dearer there (a kill that is heard) and mend Hard's North
   run. Bot runs from a frozen copy.
3. **M48, continued:** lessons 8 and 9 (charges, needing `start.canisters`), then 10 to
   15. The table is in MISSION-TRAINING.md.
4. Also M48's: umpire chips and cries, the end-of-course clipboard, START HERE on the
   contents page and the course made playable, the **?** pages' diagrams (in code).
5. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

Each of these stands as Claude guessed until answered.

1. **Charges are two lessons, 8 and 9**, and the course is still fifteen. Asked on
   13 Oct and not answered. Keep the split?
2. **The whistle blows only when the turn ends.** Asked and not answered; kept, since
   that is when a man is spotted in the game. Acceptable for the lessons?
3. **Tips on once the course is passed lasts only the visit**, as nothing is stored.
   Good enough, or should tips be on for everyone by default now they can be switched
   off in play?
4. **Enter does not count as the green button.** Right?
5. **TRAINING BRIDGE's name is 0.4 of a hex lower**, just over the deck. Low enough?
6. **A hover step goes on the instant the mouse crosses the hex.** Left alone; say if
   it skips a card you are reading.
7. **Lesson 7 tells firing back and does not have the player do it.** Enough?
8. **The contents blurb and tagline** now say "training bridge" too (a guess).

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; Priority 21, the six in winter
  kit, optional. The rewording pass on the lessons and the aqueduct's copy (theirs,
  when they have time).
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.

## Housekeeping due

- DECISIONS.md (893 lines) and SPEC.md (1,119 lines) are past the size limits in the
  global working agreement. Proposed, not done: move DECISIONS before M40 into
  `DECISIONS-ARCHIVE.md`; move SPEC §12's Done table into `MILESTONES.md` and §6 and
  §7 (detection, sabotage) into files of their own, as §11 and §13 to §15 are.
