# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 13 Oct 2026, after M48's fourth session (M48e, signed off).

## Where we are

- **Build M48e** on `main`, the only branch, signed off and pushed on 13 Oct 2026.
  Tests: 219 headless, 221 in tests.html.
- **Three missions are playable:** the rail bridge (France), the airfield (Tunisia)
  and the aqueduct (Italy). The aqueduct is playable but not yet balanced.
- **Phase 5, teaching the game, is in progress.** The training course is a draft
  (`?mission=training`) with **lessons 1 to 16 of seventeen**. New this session:
  12 The leader (orders, then the radio), 13 The men (two skills used, four told),
  14 Getting out, 15 The alert, 16 A wounded man.
- **Every lesson step is "do it, see it, then NEXT".** While a card waits on NEXT,
  doing exactly what the next step asks for counts as NEXT. In a lesson only what
  would do something shows as a button; End turn and now the radio are greyed the
  same way.
- **The course's list fits at sixteen** in its two columns. Seventeen will not.

## Next

1. **Lesson 17, the passing-out exercise, with the end-of-course clipboard and the
   list as a two-page spread** (the operator's yes, 13 Oct). To be planned together
   before any of it is built.
2. Also M48's: umpire chips and cries, START HERE on the contents page and the
   course made playable, the **?** pages' diagrams (in code).
3. **The aqueduct's balance, a short session of its own:** make the knife dearer there
   (a kill that is heard), try hiding a body with it (ROADMAP.md, Parked), and mend
   Hard's North run. Bot runs from a frozen copy.
4. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

Answered on 13 Oct: the gear's position is good; lesson 11's ten steps are fine; the
passing-out exercise cannot be failed (seen is allowed, only a hit blows the whistle);
lesson 13's two skills done and four told, lesson 15's decay told, and lesson 12 as
one lesson all stand; lesson 5's card is top left.

1. **Lesson 12 is seven steps now**, not four: Fitch gets his 5 AP unseen, then walks
   into view to be seen for the radio. Claude's rework of the operator's note (the
   marks of being seen hid his AP). Too long?
2. **Path lines are kept on the hexes a hover step asks for** (lessons 4 and 5 speak
   of the path there) and hidden on every other hex he may not go to. Claude's reading
   of the note. Right?

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; Priority 21, the six in winter
  kit, optional. The rewording pass on the lessons and the aqueduct's copy.
- **Recordings not yet supplied**, made in code until they are: whistle, train,
  canister thump, oars, surf.
