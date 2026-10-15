# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 15 Oct 2026, M49 built, awaiting sign-off.

## Where we are

- **Branch `m49-playtest` is build M49**, not yet signed off; `main` is still M48l.
  Tests: 241 headless (`node tools/run-tests.mjs`), 244 in tests.html.
- **M49, the playtest kit:** `?playtest` in the address times what a new player does,
  from the moment the title screen is clicked: the first man selected, first move, first
  charge set, each lesson started and passed, every wrong click and umpire's whistle by
  lesson and step, ? opened, tips, undo, starting again, how a mission ended. A slim
  dashed tab above the board holds COPY RECORD, which gives it as plain text. Nothing is
  stored; a reload starts afresh. `docs/PLAYTEST.md` is rewritten as the sheet for it.
- Without `?playtest` the game is unchanged.
- Four missions playable; the course playable and flagged START HERE.

## Next

1. **Sign off M49**, merge and push, so `?playtest` works on the live site.
2. **The operator runs the playtests** (`docs/PLAYTEST.md`): 3 to 5 new people, one at
   a time, at https://davispiero.github.io/burn-by-dawn/?playtest
3. **M49b**: bring back each player's record, questions and notes (`/notes`); fix what
   they tripped on.
4. Later, with the operator: redraw the aqueduct's north-east corner for Hard's North run.

## Open with the operator

1. **Guesses still standing:** the ? pages' lines are Claude's; the bugle for a lesson
   passed; the knife's cry worded "a cry" and CRY (nothing shows it while it is off).
2. **New guesses (M49):** the record's tab sits at the top centre, above the board; its
   clock starts at the title click; the sheet says nothing to the player about START
   HERE; Claude checked Chrome only, and Safari and Firefox are on the sheet for you.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; optional: 21 (winter kit), 25 (the course's contents panel and
  title card). The rewording pass on the lessons, the aqueduct's copy, and the ? pages.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard (now painted), hiding a body.
