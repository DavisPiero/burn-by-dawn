# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 25 Oct 2026: M60c built on `m60c-gunnerside-art-flare`, not yet signed off.

## Where we are

- **`main` is M60b, pushed. M60c is on its branch**: Gunnerside's Halifax and landing
  panels and the operator's flare recording in. The margin says build M60c there. Tests: 282 headless, 285 in `tests.html`.
- **Four missions and the course, all playable**: the heavy water plant (Gunnerside)
  is on the contents page with its painted panel and title card, worded, with its
  sounds made in code.
  Its balance is M59b's, measured unchanged (naive Normal 87/92/79).
- **Its words** are the operator's since M60b, all in the wording sheet's section O
  (`docs/WORDING.md`): the orders' "Not a shot…" line and NOT A SHOT FIRED first on the
  Bonus line; the snow line on turn 1; the gun's cost in red on Suppress, its rollover
  and the enemy's hover row; the hint before the first shot; who fired first on the
  back page; the flare pistol; the men's lines; the three panels' captions.
- **Its art is all in** (the operator's): contents panel, title card, Halifax and
  landing panels. **Its sounds**: the flare recorded (the operator's); the echo and wind
  still made in code, asked for in Priority 32 with optional music.
- MISSION-GUNNERSIDE.md split: words, panels, pictures and sounds now in
  MISSION-GUNNERSIDE-WORDS.md. DECISIONS.md's M50 to M55c moved to the archive.
- **ART-PROMPTS.md holds only what is still to make** (432 lines); everything made is in
  ART-PROMPTS-ARCHIVE.md.

## Next

1. **Sign off M60c**, or send notes.
2. Then the operator's choice: **M61** (Gunnerside's new panel moments), the playtests
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
   - M60b: "MORKGJELET" in the landing caption kept as MØRKGJELET, as the map spells
     it; the two swapped ratings taken as meant (30 NOT A SHOT FIRED, 35 LIKE GHOSTS).
1. **Guess in M59d**, kept unless changed: a tab click in `?layout` does not pick the
   run (1-3 do).
2. **Guesses in M59 and M59b**, kept unless changed: prints found 2 hexes ahead and
   lasting 2 turns; the plant one up and one west; charge points two above and two
   below the cells; the gate guard looking E, sweeping NW; the bands 24 / 30 / 35; the
   plateau patrol's beat; the bot's `STAY=1`.
3. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** Gunnerside's echo and wind (32, music optional);
  optional art 21 (winter kit).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
