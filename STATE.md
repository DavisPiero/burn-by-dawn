# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M58e (the operator's notes on M58d) signed off by the
operator, merged into main and pushed.

## Where we are

- **`main` is M58e, pushed.** The margin says build M58e.
- **M58e, the notes**: the dog louder; the new contents line; the aqueduct's notes where
  the operator dragged them; the drop cue in a mission's own colour (green on the aqueduct
  and in Norway); the cell hall's ring takes in its charge points; PAINT CLEAR in
  `?layout` to leave any hex bare paper (`clear` in `layout.json`), with the hexes asked
  for painted; the practice ground's lane runs off the top.
- **M58d, the palette**: three ground colours, named by a mission's `ground` in
  `missions.json`: meadow `#D3D6B7` under France and the practice ground, pale frost
  `#EEF2F2` under Gunnerside's snow (its drifts deep frost), deep frost `#D2DBE0` under
  the aqueduct in place of its blue wash. Buildings and yards, and the aqueduct's plough,
  terraces and beach, stay bare paper, and so do roads and land beside water (the
  operator's first notes: both colours a third less saturated, clear ground kept). The
  airfield is unchanged.
- **M58c**: the footprint wash (snow the garrison passes next turn, hatched in ink while
  a man is selected); ARE YOU SURE? before ending a turn with men who have not moved
  (every mission); the cell hall two hexes west.
- **M58b, the operator's notes**: the map redrawn (a wandering gorge, two deep where it
  narrows; the plant east in a thin shell; no pipes in the way; three runs from three
  sides; the gorge named), EXFIL kept on the board, walls with a hard edge, the rating
  green in every mission.
- **SPEC.md §9 is now `DROP.md`** (the drop, parachutes, canisters, tracks); SPEC.md is 434
  lines.
- **M58, the heavy water plant as a draft**, `?mission=gunnerside`, stamped NEXT YEAR'S
  ANNUAL on the contents page: the map (`data/map-gunnerside.json`), its ground drawn in
  code, seven enemies, the cell hall and the telephone line, the ski trail, the mission's
  rules (tracks, NOT A SHOT FIRED, the shot card, +4 shots heard everywhere).
- **The gorge**: a climb is a whole turn (the operator's call), worded so in the hover;
  the garrison always goes round by the bridge.
- **The bot** climbs and keeps its prints away from where the garrison walks; France,
  the airfield and the aqueduct play byte for byte as before.
- Tests: 270 headless, 273 in `tests.html`.

## Next

1. **M59, balance** (MISSION-GUNNERSIDE.md, Balance): West is too easy beside the
   gorge's narrow end (95-99%); hunter beats careful; the alert budget. Then M60 (words, sounds, art), M61 (panel moments).
2. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **Guesses in M58e**, signed off: the lane off the top west of the hall; the cleared
   hexes are the operator's to repaint with PAINT CLEAR in `?layout`.
2. **Guesses in M58d**, signed off as built: only the road hexes cleared, not their
   neighbours; Gunnerside's ice not counted as water; its roads warm paper in the snow.
3. **Guesses in M58c**: the wash hatched in ink; the end-turn card asks about men left
   still on purpose too (there is no Hold).
4. **Guesses in M58**, kept unless changed: the hall drawn as a plan (walls, floor,
   cells), not a roofed building; the bridge running south-west; the way out down the
   east edge from the corner; the rating bands the aqueduct's numbers under
   Gunnerside's names; the draft's placeholder words.
5. **Guesses in M57**: prints forecast one turn ahead only; the shot card's words
   (placeholder until M60); TRACKS! under the trail's first print.
6. **Guesses in the Gunnerside spec**, starting points for M59: a 20-turn night; prints
   last 3 turns; the hall takes 3 charges (Easy 2, Hard 4); seven enemies; every word.
7. **PICK A DROP DIRECTION drawing in behind the Dakota panel**: judge it once painted.
8. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
