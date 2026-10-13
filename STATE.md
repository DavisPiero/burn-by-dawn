# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 14 Oct 2026, after M48's sixth session (M48g, not yet signed off).

## Where we are

- **Build M48g** on the branch `m48g-umpires-start-here`, waiting for the operator's
  sign-off. `main` is M48f, signed off and pushed. Tests: 220 headless, 222 in tests.html.
- **Four missions are playable from the contents page:** the practice ground (the
  course, first, flagged START HERE), the rail bridge (France), the airfield (Tunisia)
  and the aqueduct (Italy). The aqueduct is playable but not yet balanced.
- **The course is seventeen lessons** and, with M48g, playable. Its garrison is
  umpires: a peaked cap and a white armband, drawn in code, crying out in English.
- **Lesson 17 is Ready for Action.** Its card says the bridge takes two charges and
  that the bridge umpire watches both charge points; both points are ringed until
  each has its charge.

## Next

1. **M48h, the last of M48: the ? pages' diagrams** (in code). Five small pages
   (Moving, Being seen, Charges, Fighting, Getting out), each one looping diagram
   with the board's own counters; today's text kept as a sixth, TONIGHT. A short plan
   to the operator first.
2. **The aqueduct's balance, a short session of its own:** make the knife dearer there
   (a kill that is heard), try hiding a body with it (ROADMAP.md, Parked), and mend
   Hard's North run. Bot runs from a frozen copy.
3. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

1. **The red lines on the lesson list** could not be reproduced here. The two likely
   causes are removed (the hover is now a red bar inside the row). Still there? Then:
   which browser, and how big is the window?
2. **The umpire's look** is Claude's guess. Good enough until painted, or change it?
3. **PASSED OUT** is still the qualification and the clipboard's stamp, though the
   lesson is now Ready for Action. Claude's guess: keep.
4. **The course's lesson words are placeholders** and go live at the next push.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; optional: Priority 21 (winter
  kit), 24 (umpire chips), 25 (the course's contents panel and title card). The
  rewording pass on the lessons and the aqueduct's copy.
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard.
