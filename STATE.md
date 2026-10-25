# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 25 Oct 2026: M61 built on `m61-panel-triggers`, waiting on sign-off.

## Where we are

- **`main` is M60c, pushed.** **M61 is on its branch, `m61-panel-triggers`**, not yet
  merged: the margin there says M61. Tests: 286 headless, 289 in `tests.html`.
- **M61 built:**
  - **Comic panels at new moments**: a mission's panel can name when it shows (the first
    man onto a ground, the first shot, an objective blown, the night failed or
    withdrawn). Gunnerside has five: the climb, inside the duct, the first shot, the
    bang, failed. **None shows until its painting is in** (ART-PROMPTS.md Priority 33).
  - Two panels due at once wait their turn instead of one cancelling the other.
  - **Panels tip left and right in turn** (4°, then −4°, 3°, −3°), the operator's ask.
  - **The contents card is bigger**: 980 wide across the whole table, panels 138 × 92.
    150 × 100 does not fit 1280 × 800 at any width, so this is the largest that does.
- **Four missions and the course, all playable**; Gunnerside's balance is M59b's.

## Next

1. **The operator: try M61 and sign it off** (the contents page; a Gunnerside game:
   the Dakota tips left, the landing right).
2. Paint Priority 33 (Gunnerside's five moment panels), the first shot first.
3. Then: a playtest on someone new (`docs/PLAYTEST.md`), or Gunnerside's echo and wind
   recordings (Priority 32).

## Open with the operator

0. **Guesses in M61**, kept unless changed:
   - The captions for the bang (O63d) and failed (O63e) panels; failed is neutral on
     the hall, as a night can fail with it blown. One painting for failed and withdrawn.
   - A silenced kill counts as the first shot (as the back page counts it), so the
     "shot rang down the gorge" panel can follow a kill.
   - The tilt order is fixed (left, right, left, right), not random.
   - The contents masthead is a slimmer strip of the title card (8:1, was 5.8:1) to
     make room. **Please look.**
1. **Still standing from before** (the operator accepted M60's guesses on 25 Oct):
   France a little easier than its baselines say; the bugle for a lesson passed; the
   knife's cry worded "a cry"; the record's tab at the top centre; M59–M59d's map and
   bot guesses.

## Owed

- **From the operator:** Gunnerside's five moment panels (33); its echo and wind (32,
  music optional); optional art 21 (winter kit).
- **Parked in ROADMAP.md:** tips as in-world briefings, an Advice button, hiding a body,
  more panel moments for the other missions.
