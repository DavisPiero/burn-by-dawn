# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 19 Oct 2026: M59 and M59b signed off, merged and pushed.

## Where we are

- **`main` is M59b, pushed.** The margin says build M59b. Tests: 273 headless, 276 in
  `tests.html`.
- **Four missions and the course.** France, the airfield and the aqueduct playable; the
  heavy water plant (Gunnerside) a draft at `?mission=gunnerside`, balanced (M59, M59b),
  not yet worded.
- **Gunnerside now**: an 18-turn night; prints found only where an enemy looks; the cell
  hall a loop round the cells with two ways to every charge point; patrols at 2 hexes a
  turn; a found body calls no squad; Alarmed from 9 there; Hard three charges and three
  men out. Naive, 200 seeds: Easy 97/95/94, Normal 87/92/79, Hard 47/18/6 (accepted:
  careful play wins about half on Hard). Details: MISSION-GUNNERSIDE.md, Balance.

## Next

1. **M59c, a terrain painter in `?layout`** (the operator's, 19 Oct 2026: useful for
   future maps): paint any ground type on a hex, and copy the map's rows for Claude to
   commit after the checks (the two-ways test among them). Today PAINT CLEAR paints
   bare paper only (art, `layout.json`); terrain is rules, so the painter's output is
   the map file's `rows`, not layout.json. Plan first.
2. **M60**: first split MISSION-GUNNERSIDE.md (517 lines): its "Telling the player"
   and "Comic panels" to a file of their own; then the words, sounds and art hand-off.
3. M61 (panel moments), if wanted. **The Dakota panel** whenever it is painted
   (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **Guesses in M59b**, kept unless changed: prints found 2 hexes ahead; the plant one
   up and one west, the plateau and gorge left; charge points two above and two below
   the cells; the gate guard looking E, sweeping NW; the bands 24 / 30 / 35. **In M59**:
   prints last 2 turns; the plateau patrol's beat; the bot's `STAY=1`.
2. **Older guesses**, kept unless changed: the footprint wash in ink; the end-turn card
   for men left still; the hall drawn as a plan; the bridge south-west; the way out
   down the east edge; prints forecast one turn ahead; TRACKS! under the first print;
   the draft's placeholder words; PICK A DROP DIRECTION behind the Dakota panel.
3. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
