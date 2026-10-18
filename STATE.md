# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M56 (the Gunnerside spec) signed off, merged into main and
pushed.

## Where we are

- **`main` is M56, pushed to GitHub.** The game itself is M55c (the margin still says
  build M55c: M56 changed documents only).
- **M56:** `MISSION-GUNNERSIDE.md`, SPEC §16, mission 4 written before it is built. The
  heavy water plant, Norway 1943, tagline SIX MEN · ONE STATION · NOT A SHOT FIRED.
  Drop on a snowy plateau; cross a gorge (a turn down, a turn on the ice, a turn up) or
  the guarded bridge; into the cell hall by the cable duct; out by a ski trail in the
  north-east. Its one engine rule is **tracks in the snow**: footprints turned the way
  a man walked, fading over three turns, found by patrols like parachutes. Gunfire is
  heard across the board (+4); the clean run NOT A SHOT FIRED pays 5; a card asks before
  the first shot; a decoy flare replaces the RAF diversion. How the game tells the
  player that stealth is the point, and five new comic panel moments, have sections of
  their own.
- Tests: 249 headless, 252 in `tests.html`.

## Next

1. **M57, the engine for Gunnerside** (MISSION-GUNNERSIDE.md, The order it is built in):
   tracks (laying, ageing, finding, undo, the readout, the footprint sprite turned and
   fading), `scoring.cleanNoShot`, `confirmShot`. All off in the other missions, whose
   bot output must stay the same byte for byte. There is no map yet, so it is tested in
   node and on a test board.
2. Then M58 (the map as a draft), M59 (balance), M60 (words, sounds, art hand-off), M61
   (new panel moments, if wanted).
3. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30).

## Open with the operator

1. **Guesses in the Gunnerside spec**, starting points for balance unless you change
   them: a 20-turn night; prints last 3 turns; the hall takes 3 charges (Easy 2, Hard 4)
   with sappers carrying two; the telephone line the one bonus target; seven enemies;
   the names (Vassdal Works, Mørkgjelet, Isvidda, Elvebyen) and every word, which are
   placeholders.
2. **PICK A DROP DIRECTION drawing in behind the Dakota panel**: judge it once the
   painting is in.
3. **Still standing:** France a little easier than its baselines say ("ok for now"); the
   bugle for a lesson passed; the knife's cry worded "a cry"; the record's tab at the top
   centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit, used by the
  aqueduct and Gunnerside); optional per-mission Dakota panels (Gunnerside's a Halifax).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
