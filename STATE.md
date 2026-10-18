# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, end of session: M58d and M58e signed off, merged and pushed.

## Where we are

- **`main` is M58e, pushed.** The margin says build M58e. Tests: 270 headless, 273 in
  `tests.html`.
- **Four missions and the course.** France, the airfield and the aqueduct playable; the
  heavy water plant (Gunnerside) a draft at `?mission=gunnerside`, stamped NEXT YEAR'S
  ANNUAL on the contents page, built to M58c and waiting for its balance.
- **The palette (M58d)**: each mission names its `ground` colour in `missions.json`:
  meadow under France and the practice ground, pale frost under Gunnerside, deep frost
  under the aqueduct; the airfield bare paper. Buildings, yards, roads and land beside
  water stay paper.
- **The notes (M58e)**: the drop cue in a mission's own `dropCueColour` (green on the
  aqueduct and in Norway); the cell hall's ring takes in its charge points
  (`ringCharges`); PAINT CLEAR in `?layout` leaves any hex bare paper (`clear` in
  `layout.json`), the operator's to repaint; the dog louder; the contents line reworded.
- **DECISIONS.md** had reached 199 lines: M49 to M49e moved to `DECISIONS-ARCHIVE.md`.

## Next

1. **M59, Gunnerside's balance** (MISSION-GUNNERSIDE.md, Balance), on its own branch,
   bot runs from a frozen `git archive` copy. Known: West wins 95-99% beside the
   gorge's narrow end; hunter beats careful; every style reaches Alarmed; nobody uses
   the cable duct; the ice is a hidden 1 AP walk from the bridge deck. Then dawn, the
   gorge's width, prints' life, the levels and the rating's bands.
2. Then M60 (words, sounds, art hand-off) and M61 (panel moments).
3. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **Guesses in M58c**: the footprint wash hatched in ink; the end-turn card asks about
   men left still on purpose too (there is no Hold).
2. **Guesses in M58**, kept unless changed: the hall drawn as a plan, not a roofed
   building; the bridge running south-west; the way out down the east edge; the rating
   bands the aqueduct's numbers under Gunnerside's names; the draft's placeholder words.
3. **Guesses in M57**: prints forecast one turn ahead only; the shot card's words
   (placeholder until M60); TRACKS! under the trail's first print.
4. **Guesses in the Gunnerside spec**, starting points for M59: a 20-turn night; prints
   last 3 turns; the hall takes 3 charges (Easy 2, Hard 4); seven enemies; every word.
5. **PICK A DROP DIRECTION drawing in behind the Dakota panel**: judge it once painted.
6. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
