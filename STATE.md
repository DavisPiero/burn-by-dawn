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
  their green button or Enter; play tips are on for everyone and can be switched in
  the left margin; the lesson card says what goes on; a wider ring
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

Each of these stands as Claude guessed until answered. (Answered 13 Oct: charges are
two lessons; the whistle stays at the turn's end; play tips are on for everyone; Enter
counts as the green button.)

1. **The operator's notes on M48b are planned, not built**, awaiting a go-ahead: every
   step "do, see, then NEXT"; lesson 1's card beside what it points at; lesson 2
   reordered; firing back made playable; the course's own drop lines; a settings menu
   behind a gear in the margin. Hiding a body goes to the roadmap as a rule to try.
2. **TRAINING BRIDGE's name is 0.4 of a hex lower**, just over the deck. Low enough?
3. **The contents blurb and tagline** now say "training bridge" too (a guess).

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
