# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 18 Oct 2026, M56 (the Gunnerside spec) signed off, merged into main and
pushed.

## Where we are

- **`main` is M55c, pushed to GitHub** (18 Oct 2026). The live site has M55b and M55c.
- **M56, on its branch:** `MISSION-GUNNERSIDE.md`, SPEC §16, mission 4 written before
  it is built. No code. The heavy water plant, Norway 1943: drop on a snowy plateau,
  cross a gorge (a turn down, a turn on the ice, a turn up) or the guarded bridge, get
  into the cell hall by the cable duct, out by a ski trail in the north-east. Its one
  engine rule: **tracks in the snow**, drawn as footprints turned the way a man walked,
  fading over three turns, found by patrols like parachutes. Gunfire heard across the
  board (+4); the clean run NOT A SHOT FIRED (+5); a card before the first shot; a
  decoy flare for the diversion. How the game tells the player stealth is the point,
  and five new comic panel moments, are sections of their own.
- SPEC.md, CLAUDE.md, ROADMAP.md and WINNING.md point at it (WINNING's "exfil on the
  south edge" now says "on a map edge").
- Tests: 249 headless, 252 in `tests.html` (unchanged; nothing in the game changed).

## Next

1. **The operator reads `MISSION-GUNNERSIDE.md`** and signs it off, or notes changes.
2. **M57, the engine** for it: tracks, the no-shot clean run, the first-shot card, all
   off in the other missions.
3. **The Dakota panel** whenever it is painted (ART-PROMPTS.md Priority 30): nothing shows
   at START GAME until `assets/panels/panel-dakota.jpg` exists.

## Open with the operator

1. **Guesses in the spec to confirm or change** (all marked as starting points): a
   20-turn night; prints last 3 turns; three charges for the hall (Easy 2, Hard 4),
   sappers carrying two; the telephone line the one bonus target; seven enemies; the
   placeholder names (Vassdal Works, Mørkgjelet, Isvidda, Elvebyen) and all the words.
2. **PICK A DROP DIRECTION drawing in behind the Dakota panel**: judge it once the
   painting is in.
3. **Still standing:** France a little easier than its baselines say ("ok for now"); the
   bugle for a lesson passed; the knife's cry worded "a cry"; the record's tab at the top
   centre.

## Owed

- **From the operator:** the Dakota panel; optional art 21 (winter kit, which Gunnerside
  uses too); optional per-mission Dakota panels (Gunnerside's would be a Halifax).
- **Parked in ROADMAP.md:** more panel moments (Gunnerside's spec designs them), tips as
  in-world briefings, an Advice button, hiding a body.
