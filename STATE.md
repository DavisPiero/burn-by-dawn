# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 15 Oct 2026, after M48k.

## Where we are

- **`main` is build M48k**, signed off, merged and pushed. No branch open.
  Tests: 234 headless (`node tools/run-tests.mjs`), 236 in tests.html.
- **M48k, the layout tool:** `?layout` at the end of the address outlines START HERE,
  the clipboard, each mission's drop cue and its rings' notes in dashed blue; drag them.
  The panel bottom right counts what moved; COPY puts the whole of `data/layout.json` on
  the clipboard (open the file, select all, paste, save); PUT BACK undoes this visit's
  moves. Those places live in `data/layout.json` only.
- **Also in M48k:** a bugle call when a lesson is passed (the stamp is PASSED OUT's
  only); the clipboard's record shrinks to fit its paper in any browser.
- Four missions playable; the aqueduct is not yet balanced.

## Next

1. **The aqueduct's balance**, a short session of its own. Bot runs from a frozen copy
   (`git archive`), never from the working tree.
2. **M49: playtest the course on people who have never seen the game.**

## Open with the operator

1. **Guesses still standing:** the ? pages' lines are Claude's (good for now, the
   operator's word); the bugle for a lesson passed (the operator said all is working).
2. **DECISIONS.md is at 194 lines.** Next session it passes 200, and M40 to M43 go to
   DECISIONS-ARCHIVE.md, as the working agreement says.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; optional: 21 (winter kit), 25 (the course's contents panel and
  title card). The rewording pass on the lessons, the aqueduct's copy, and the ? pages.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard (now painted).
