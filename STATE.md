# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 14 Oct 2026, M48's seventh session (M48h, not yet signed off).

## Where we are

- **Build M48h** on the branch `m48h-notes-sound`, waiting for the operator's sign-off.
  `main` is M48g, signed off and pushed. Tests: 220 headless, 222 in tests.html.
- **Four missions are playable from the contents page**, the course first and stamped
  START HERE. The aqueduct is playable but not yet balanced.
- **M48h:** the operator's six recordings are in (the umpire's whistle, the train, the
  canister thump, the oars, the surf, and a new knife sound); START HERE is a faded
  stamp; the clipboard is a clipboard's shape; the drop cue no longer covers the
  practice ground's PRIMARY TARGET note; the operator's painted umpire chips are in.

## Next

1. **M48i, the last of M48: the ? pages' diagrams** (in code). Plan given to the
   operator on 14 Oct (tabs, a looping diagram each, scenes in `data/help.json`, no
   practise-a-lesson button); waiting for the go-ahead, and for M48h's sign-off.
2. **The aqueduct's balance**, a short session of its own. Bot runs from a frozen copy.
3. **M49: playtest the course on people who have never seen the game.**

Rule of the phase: cut a lesson to fit the engine; do not grow the engine for one lesson.

## Open with the operator

1. **Listen to the six new sounds.** They were cut by measuring, not by ear: the
   whistle is one 0.3 s blast; the train is the 4 s of its pass (it may have no clear
   whistle); the surf is one wave of a busy recording, and may carry a gull.
2. **The rest of `assets/audio/Src/`** is not wired in (gunfire, aircraft, music,
   impacts, cloth drops, a rubber stamp). Say which should go where.
3. **PASSED OUT** stays the qualification and the stamp (Claude's guess).

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; Priority 23, the aqueduct's sounds; optional: Priority 21 (winter
  kit), 25 (the course's contents panel and title card). The
  rewording pass on the lessons and the aqueduct's copy.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard.
