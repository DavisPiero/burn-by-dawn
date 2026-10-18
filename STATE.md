# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M58 and M58b (the operator's notes on the draft) built on
branch `m58-gunnerside-map`, not yet signed off.

## Where we are

- **`main` is M57, pushed. The branch `m58-gunnerside-map` is M58 and M58b**, waiting
  for the operator's sign-off. The margin says build M58b.
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
- Tests: 267 headless, 270 in `tests.html`.

## Next

1. **The operator's look at M58b.** Then **M58c, the footprint wash** (agreed): while a
   man is selected, a faint wash on the snow where prints would be found next turn.
   Then sign-off and merge.
2. **The palette** (the operator's ask): meadow and frost ground washes to tell the
   grassy maps from the snowy ones, a milestone of its own once the colours are picked.
3. **M59, balance** (MISSION-GUNNERSIDE.md, Balance): West is too easy beside the
   gorge's narrow end (95-99%); hunter beats careful; the alert budget. Then M60 (words, sounds, art), M61 (panel moments).
4. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **The decoy flare**: what did you see? Its rule is one state down, never below
   Suspicious once anything has blown up. A bug, or a rule to change here?
2. **The palette**: pick or adjust meadow #D9DDB0 and frost #EEF2F2 / #CFDCE3.
3. **Guesses in M58**, kept unless changed: the hall drawn as a plan (walls, floor,
   cells), not a roofed building; the bridge running south-west; the way out down the
   east edge from the corner; the rating bands the aqueduct's numbers under
   Gunnerside's names; the draft's placeholder words.
4. **Guesses in M57**: prints forecast one turn ahead only; the shot card's words
   (placeholder until M60); TRACKS! under the trail's first print.
5. **Guesses in the Gunnerside spec**, starting points for M59: a 20-turn night; prints
   last 3 turns; the hall takes 3 charges (Easy 2, Hard 4); seven enemies; every word.
6. **PICK A DROP DIRECTION drawing in behind the Dakota panel**: judge it once painted.
7. **Still standing:** France a little easier than its baselines say; the bugle for a
   lesson passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit); optional
  per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
