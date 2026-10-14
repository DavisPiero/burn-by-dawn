# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 15 Oct 2026, after M48j.

## Where we are

- **`main` is build M48j**, signed off, merged and pushed. No branch open.
  Tests: 227 headless (`node tools/run-tests.mjs`), 230 in tests.html.
- **M48, the course, is done:** seventeen lessons, the clipboard (the operator's
  painting since M48j), umpires, START HERE, and the ? card as six tabbed pages with
  small looping scenes (M48i).
- **M48j:** the operator's sounds (a Thompson kill, two dogs, a line cut, a stamp on
  PASSED and PASSED OUT), music by screen (strings on the contents page, the title
  music for the course, a track each for France, the desert and the aqueduct), START
  HERE on the dotted line, the goods train's turn on the Rail Bridge's orders.
- Four missions playable; the aqueduct is not yet balanced.

## Next

1. **The layout tool** (ROADMAP.md): `?layout`, drag the elements that keep being
   nudged, copy their places to `data/layout.json`. Plan it with the operator first.
2. **The aqueduct's balance**, a short session of its own. Bot runs from a frozen copy.
3. **M49: playtest the course on people who have never seen the game.**

## Open with the operator

1. **Listen to M48j in play**: the Thompson kill against the burst, the dogs, the line
   cut, the stamp, and the four music tracks (each levelled to the title music).
2. **Guesses still standing:** the stamp on every lesson's PASSED card as well as
   PASSED OUT; the line-cut sound for the airfield's Signals Tent too; the ? pages'
   lines are Claude's; CHARGES shows a fuse watch, not the tin, in the timer missions.
3. **The painted clipboard is shown at 320 wide**, not 268: its paper is a smaller
   share of it, and the record would not fit otherwise.
4. **The layout tool's list**: which elements, beyond START HERE, the drop cue, the
   clipboard and the PRIMARY TARGET note, should be draggable.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; optional: 21 (winter kit), 25 (the course's contents panel and
  title card). The rewording pass on the lessons, the aqueduct's copy, and the ? pages.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard (now painted).
