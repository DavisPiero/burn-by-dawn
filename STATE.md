# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, after M48's first session.

## Where we are

- **Build M48** on `main`, the only branch. Tests: 211 headless, 213 in tests.html.
- **Pushed:** GitHub and the live game are at M48 (13 Oct 2026).
- **Three missions are playable:** the rail bridge (France), the airfield (Tunisia)
  and the aqueduct (Italy). v1.0 was tagged on 29 Sep 2026 with France alone.
  The aqueduct is playable but not yet balanced.
- **Phase 5, teaching the game, is in progress.** Done: the text diet (M44), seeing and
  being seen (M45), doing (M46), the training mission specified and its lesson engine
  (M47).
- **The training course is a draft** (`?mission=training`): the practice ground is
  drawn and lessons 2 to 5 of fifteen are built. It heads the contents page stamped
  NEXT YEAR'S ANNUAL.

## Next

1. **M48, continued: the rest of the course**, a few lessons a session, each playable
   when merged. Lesson 1 (the drop) comes first; it needs a lesson that starts in the
   drop. Then the second half of lesson 5, then 6 to 15. The table is in
   MISSION-TRAINING.md.
2. Also M48's: umpire chips and cries, the end-of-course clipboard, START HERE on the
   contents page and the course made playable, the **?** pages' diagrams.
3. **M49: playtest the course on people who have never seen the game.** Measure the
   time to the first move and to the first charge set, and what they ask.

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

Each of these stands as Claude guessed until answered.

- **The course starts at LESSON 2** until lesson 1 is built. Not a bug.
- **The training ground's place names** (Tatton Mere, Tatton Hall, the Knoll) are
  Claude's inventions. Keep or rename?
- **The draft course heads the live contents page.** Leave it first, or move it last
  until it is finished?
- **Play tips are off by default**, which hides the charge-point rings from a new
  player. Still what you want?
- **The whistle blows only when the turn ends**, since that is when a man is spotted.
  Acceptable for the lessons?
- **The danger wash is on at every level**, Hard included. Too plain on Hard?
- **The words in the pen and the aqueduct's copy** are Claude's placeholders.
- **Painted lesson panels**, or diagrams drawn in code?
- **Not checked in the browser:** Space at the GET CLEAR note should now only clear
  it, not end the turn. Reasoned from the code only; worth a try by hand.

## Owed

- **Art from the operator:** ART-PROMPTS.md Priorities 21 to 23.
- **The aqueduct's balance:** its open questions are in MISSION-AQUEDUCT.md.

## Housekeeping due

- DECISIONS.md (874 lines) and SPEC.md (1,115 lines) are past the size limits in the
  global working agreement. Next session: propose archiving decisions by phase and
  what else can leave SPEC.md.
