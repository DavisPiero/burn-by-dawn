# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 16 Oct 2026, M49d built on branch `m49d-notes`, awaiting sign-off.

## Where we are

- **`main` is M49c**, signed off. **`m49d-notes` is M49d**, the operator's notes after
  M49c, not merged. Tests: 243 headless (`node tools/run-tests.mjs`), 246 in tests.html.
- **M49d:**
  - A charge point that has gone off is spent: nothing more is set on it (the bug where
    two aqueduct points blown twice made four).
  - Parachutes lie on the ground, under the targets' words (ALL CHARGES SET · GET CLEAR)
    and the counters.
  - The far bank a selected man could swim to now is dotted, in the move range's blue.
  - The kill is the gunner's burst again, a little louder than suppressing.
  - The aqueduct's beach: men may walk onto it and wait before the boat. Once the boat is
    in, a man waiting there boards it with **B** (Board boat, 0 AP). Told by BOARD! [B] in
    the pen, the turn report, the turn card, a red button, and on the boat's last turn an
    ARE YOU SURE? card before the turn ends with anyone still on the beach.
  - The aqueduct's whole map moved one hex east.
  - The operator's six aqueduct references (Priority 22) are committed in `assets/reference/`.

## Next

1. **M49e, the aqueduct rebalanced** (the operator's call, 16 Oct): once M49d is signed
   off, Claude brings options, each measured by the bot against the §10 targets, and the
   operator picks. The aqueduct stays as it is until then.
2. More playtests with new people (`docs/PLAYTEST.md`, `?playtest`), then their notes.
3. **Redraw the aqueduct's board pictures** from the Priority 22 references (aqueduct,
   road bridge, boat, canister, terraces, olive grove): a milestone of its own.

## Open with the operator

1. **The charge-point fix made the aqueduct harder.** The bot had been re-blowing spent
   points since M42. Naive bot now, west / north / valley: Easy 89 / 80 / 66, Normal 66 /
   50 / 70, Hard 24 / 10 / 23, all under target (was 95 / 93 / 93, 79 / 74 / 76, 31 / 15 /
   35). A player who plans one bang hardly notices (tidy bot 85 / 85 / 84). Whether, and how,
   to win it back is decided in M49e, from options with bot numbers. France moved a little
   (Normal 91 / 84 / 94).
2. **Listen to the kill's burst** (levelled by reading, not by ear). Reload with
   Cmd+Shift+R if nothing seems changed.
3. **Guesses (M49d):** the swim outline only while he can swim now; signal the boat from on
   the beach as well as beside it; the beach open to the garrison too; no sea wash on the
   shut beach; the drop cue left where it stood on the page.
4. **Still standing from before:** the ? pages' lines are Claude's; the bugle for a lesson
   passed; the knife's cry worded "a cry"; the record's tab at the top centre.

## Owed

- **From the operator:** the wording pass on the lessons, the aqueduct's copy and the ?
  pages; optional art 21 (winter kit) and 25 (the course's contents panel and title card).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body.
