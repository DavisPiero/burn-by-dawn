# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 15 Oct 2026, after M48k.

## Where we are

- **Branch `m48k-layout-tool` is built and checked, not signed off.** `main` is still
  M48j. Tests: 234 headless (`node tools/run-tests.mjs`), 236 in tests.html.
- **M48k, the layout tool:** add `?layout` to the address (for example
  `localhost:8000/?layout`). START HERE, the clipboard, each mission's drop cue and its
  rings' notes are outlined in dashed blue; drag them. The panel bottom right counts
  what moved; COPY puts the whole of `data/layout.json` on the clipboard: open that
  file, select all, paste, save. PUT BACK undoes this visit's moves.
- All those places now live in `data/layout.json` only (moved out of the map files and
  theme.js, nothing moved on screen).
- **Also in M48k:** a bugle call, not the stamp, when a lesson is passed; the clipboard's
  record shrinks until it fits the paper in whatever browser shows it.
- Four missions playable; the aqueduct is not yet balanced.

## Next

1. **The operator plays M48k**, tries the tool, and signs it off (or not).
2. **The aqueduct's balance**, a short session of its own. Bot runs from a frozen copy.
3. **M49: playtest the course on people who have never seen the game.**

## Open with the operator

1. **Is the bugle right for a lesson passed?** A guess at "celebratory" from the sounds
   already in. Another recording would be a one-line swap.
2. **Does the clipboard now fit in your browser?** It was checked here with a much bigger
   font forced on it, not in your browser.
3. **Guesses still standing:** the ? pages' lines are Claude's (good for now, you said).

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; optional: 21 (winter kit), 25 (the course's contents panel and
  title card). The rewording pass on the lessons, the aqueduct's copy, and the ? pages.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard (now painted).
