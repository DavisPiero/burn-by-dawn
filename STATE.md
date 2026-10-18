# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026: M59 signed off, merged and pushed.

## Where we are

- **`main` is M59, pushed.** The margin says build M59. Tests: 270 headless, 273 in `tests.html`.
- **Four missions and the course.** France, the airfield and the aqueduct playable; the
  heavy water plant (Gunnerside) a draft at `?mission=gunnerside`, balanced on Normal
  and Easy at M59, not yet worded.
- **M59, Gunnerside's balance**: the gorge's two holes closed (every crossing two climbs
  or more); the plateau patrol east of the road; prints last 2 turns; the operator's
  option B (a found body calls no squad, Alarmed from 9 on this map, a shot +6); the
  rating bands 21 / 27 / 33. Naive, 200 seeds: Easy 97/99/100, Normal 75/87/89, Hard
  3/2/0. Numbers and how they were chosen: MISSION-GUNNERSIDE.md, Balance.

## Next

1. **M59b, Gunnerside's Hard**, with the operator's notes from playing it (Open, 1).
2. Then M60 (words, sounds, art hand-off) and M61 (panel moments).
3. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **Hard on Gunnerside is 3 / 2 / 0** (target 25 to 45). Three charges and three men out
   measured 31 / 32 / 1, but the Hard line on the orders says four men in every mission,
   and a mission cannot change it yet. East stays at 1%: its men cross the bridge under
   posts that see four hexes on Hard.
2. **The alert measure is short**: tidy wins below Alarmed 45 / 66 / 83 % (the spec asks
   70 on every run). West and North fall short.
3. **The cable duct is still unused**: the bot goes in by the watched main door.
4. **MISSION-GUNNERSIDE.md is 499 lines**, at the 500 where a split is due: propose
   moving its "Telling the player" and "Comic panels" into the M60 words work, or a
   file of their own.
5. **Guesses in M59**: prints 2 turns; the plateau patrol's beat (11,3) to (14,3);
   the bot's `STAY=1`; the band names (placeholders).
6. **Guesses in M58c, M58, M57**, kept unless changed: the footprint wash in ink; the
   end-turn card asking about men left still on purpose; the hall drawn as a plan; the
   bridge south-west; the way out down the east edge; prints forecast one turn ahead;
   TRACKS! under the first print; the draft's placeholder words.
7. **PICK A DROP DIRECTION drawing in behind the Dakota panel**: judge it once painted.
8. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
