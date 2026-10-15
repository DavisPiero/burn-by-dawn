# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 15 Oct 2026, M49b signed off and merged.

## Where we are

- **`main` is build M49b**, signed off, merged and pushed on 15 Oct 2026. Tests: 242 headless (`node tools/run-tests.mjs`), 245 in tests.html.
- **M49b, the first playtest's notes:**
  - How to play has a ✕ in its corner.
  - The course's list has ◀ CONTENTS, back to the missions.
  - A man who could swim now wears a wave mark, bottom left of his counter.
  - A mission accomplished plays the first half of the operator's fanfare (France, the
    aqueduct), not the bells. The airfield keeps its bugle.
  - A lesson step done takes nothing away: its ring stays, its pen line is ticked, the
    card keeps what it asked (faint) with what is now to be seen under it, and three hover
    steps light the box under the map.
  - France's goods train comes on time to a bridge blown early, and stops short of it.
  - Enemies killed by a blast leave bodies, already counted as found: no alert, no score.
  - Second notes: faint swim marks on every man at the water, and a greyed Swim button
    for the selected one who has spent AP; ◀ CONTENTS on every mission's orders; mission
    music a quarter quieter; the signals tent redrawn from the reference.
  - Third notes: France's railway comes in a row higher and curves down past the fuel
    dump, off its charge point; the drop runs' blue rings draw on first, the targets'
    red ones a second later; the orders' buttons on one row again ("click, or Enter"
    under START GAME); the full swim mark on every man who can swim now; the contents
    music a quarter down, the drop's Dakota 35% down, the fanfare a fifth down.
- The bot is unchanged, byte for byte, on all eight batches run, and on France again
  after the railway moved (DECISIONS.md).

## Next

1. More playtests with new people (`docs/PLAYTEST.md`, `?playtest`), then their notes.
2. Later, with the operator: redraw the aqueduct's north-east corner for Hard's North run.

## Open with the operator

1. **Listen to the fanfare.** It was cut and levelled by measurement, not by ear. If the
   game seems not to have changed, reload with Cmd+Shift+R: the browser can keep old files.
2. **Guesses (M49b)**, taken as confirmed by "the new updates are good" unless the
   operator says otherwise: the course's title music turned down with the missions';
   the guards left off the tent; the ✕ only on how to play; the swim mark's look and
   corner; a done step's old words faint at 12 px; "stops short" said when the train
   stops; a blast's body drawn like a gunner's kill.
3. **Guesses (third notes):** the railway's curve and where it steps down; "click, or
   Enter" under START GAME (and START LESSON); the targets' rings 1.2 s after the runs'.
4. **Still standing from before:** the ? pages' lines are Claude's; the bugle for a lesson
   passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the aqueduct's
  board; optional: 21 (winter kit), 25 (the course's contents panel, and its title card,
  which now has a prompt). The rewording pass on the lessons, the aqueduct's copy, and
  the ? pages.
- **Size:** ART-DIRECTION.md 539 lines, past 500: propose a split. (DECISIONS.md M44 to
  M48l moved to the archive at M49b's sign-off.)
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
