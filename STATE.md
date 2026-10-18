# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, end of session: M59 merged and pushed; M59b built on its
branch, not yet signed off.

## Where we are

- **`main` is M59, pushed. M59b is on `m59b-gunnerside-hard`**, not merged; the margin
  there says build M59b. Tests: 273 headless, 276 in `tests.html`.
- **Four missions and the course.** France, the airfield and the aqueduct playable; the
  heavy water plant (Gunnerside) a draft at `?mission=gunnerside`, balanced, not yet
  worded.
- **M59b, the operator's Hard notes**: prints found only where an enemy looks (underfoot
  or ahead within 2); the cell hall a loop round the cells, two ways to every charge
  point (a test holds it); the gate guard looking down the road; patrols 2 hexes a turn;
  Hard three charges and three men out, the orders saying three; an 18-turn night.
  Naive, 200 seeds: Easy 97/95/94, Normal 87/92/79, Hard 47/18/6 (careful 72/51/53).
  Tidy wins below Alarmed 86/88/87%. Details: MISSION-GUNNERSIDE.md, Balance.

## Next

1. **The operator plays M59b and signs it off, or not.**
2. Then M60 (words, sounds, art hand-off), with MISSION-GUNNERSIDE.md split first (Open 3),
   and M61 (panel moments). M59c, the terrain painter in `?layout`, if wanted.
3. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **Hard, North and East, naive 18 and 6**: the naive men wait all night at the bridge;
   careful play wins about half. Accept, or a further pass?
2. **The stealth check is not shown**: firing back no longer costs wins, as a man is
   seldom seen. The hunter's kills still cost. Accept, or make the shot dearer?
3. **MISSION-GUNNERSIDE.md is 517 lines**, past the 500 where a split is due: proposed,
   its "Telling the player" and "Comic panels" to a file of their own at M60.
4. **M59c, a terrain painter in `?layout`** (paint ground, copy the map rows), so the
   operator can reshape the plant without another round. Offered, not built.
5. **Guesses in M59b**: findRange 2; the plant one up and one west, the plateau and
   gorge left; charge points two above and two below the cells; the gate guard E/NW;
   the bands 24 / 30 / 35. **In M59**: prints 2 turns; the plateau patrol's beat;
   the bot's `STAY=1`.
6. **Older guesses**, kept unless changed: the footprint wash in ink; the end-turn card
   for men left still; the hall drawn as a plan; the bridge south-west; the way out
   down the east edge; prints forecast one turn ahead; TRACKS! under the first print;
   the draft's placeholder words; PICK A DROP DIRECTION behind the Dakota panel.
7. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
