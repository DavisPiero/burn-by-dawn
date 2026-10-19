# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 19 Oct 2026: M60 built on `m60-gunnerside-words`, not yet signed off.

## Where we are

- **`main` is M59d, pushed. M60 is on its branch**, waiting for the operator's sign-off.
  The margin says build M60 there. Tests: 282 headless, 285 in `tests.html`.
- **Four missions and the course, all playable** once M60 is merged: the heavy water
  plant (Gunnerside) is on the contents page, worded, with its sounds made in code.
  Its balance is M59b's, measured unchanged (naive Normal 87/92/79).
- **Its words** are placeholder copy, all in the wording sheet's new section O
  (`docs/WORDING.md`): the orders' "Not a shot…" line and NOT A SHOT FIRED first on the
  Bonus line; the snow line on turn 1; the gun's cost in red on Suppress, its rollover
  and the enemy's hover row; the hint before the first shot; who fired first on the
  back page; the flare pistol; the men's lines; the three panels' captions.
- **Its art** is asked for in ART-PROMPTS.md Priority 31 (contents panel, title card,
  Halifax panel, landing panel), each wired to show the moment its file is in;
  **its sounds** (echo, flare, wind, optional music) in Priority 32.
- MISSION-GUNNERSIDE.md split: words, panels, pictures and sounds now in
  MISSION-GUNNERSIDE-WORDS.md. DECISIONS.md's M50 to M55c moved to the archive.

## Next

1. **The operator: sign off M60**, or send notes. Then the milestone row and merge.
2. **When the paintings come**: Claude makes the game's copies (480 × 320 contents,
   1600 × 400 title card, 900 × 600 panels) and keeps the originals as `_full`.
3. Then the operator's choice: **M61** (Gunnerside's new panel moments), the playtests
   (ROADMAP.md), or rewording from the sheet.

## Open with the operator

0. **Guesses in M60**, kept unless changed:
   - The contents panels are smaller (120 × 80, was 150 × 100) so five missions fit
     the card at 1280 × 800; the fifth was running off its foot. **Please look.**
   - The turn-1 snow line goes under the hint, not instead of it.
   - The hint before the first shot shows on any turn until the first shot.
   - Speers says "Bren stays slung", not "Sten". Barrow's tracks line is an onLand line.
   - The flare pistol is "fired" ("Fire it now!"); the flare card ends "No more flares
     tonight."
   - Gunnerside plays the title music until it has its own.
1. **Guess in M59d**, kept unless changed: a tab click in `?layout` does not pick the
   run (1-3 do).
2. **Guesses in M59 and M59b**, kept unless changed: prints found 2 hexes ahead and
   lasting 2 turns; the plant one up and one west; charge points two above and two
   below the cells; the gate guard looking E, sweeping NW; the bands 24 / 30 / 35; the
   plateau patrol's beat; the bot's `STAY=1`.
3. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** Gunnerside's four paintings (Priority 31) and sounds (32); the
  shared Dakota panel (30); optional art 21 (winter kit).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
