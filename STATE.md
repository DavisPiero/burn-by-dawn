# Burn by Dawn — state

The short version of where the project stands. Rewritten at the end of every session;
keep it under a page. SPEC.md says how the game works, ROADMAP.md says what comes after
and why, DECISIONS.md says why things are as they are. This file only says where we are.

Last updated: 15 Oct 2026, after M48l.

## Where we are

- **`main` is build M48l**, signed off, merged and pushed. No branch open. Tests: 235 headless (`node tools/run-tests.mjs`), 238 in
  tests.html.
- **M48l, the aqueduct's balance:** no change to how any mission plays (every bot batch
  byte for byte as before). A knife that is heard is in the engine as two numbers
  (`alert.knife`, `noise.knife`), measured on the aqueduct and left off: it cost the
  casual knife, not the hunter. The aqueduct's pillar check is read as passed (every man
  hunting loses; the spare men hunting is the pillar). Hard's North run stays at 15,
  its cause traced to the road through its landing ground.
- DECISIONS.md's M40 to M43 entries moved to DECISIONS-ARCHIVE.md (162 lines left).
- Four missions playable; the aqueduct balanced as far as numbers go.

## Next

1. **M49: playtest the course on people who have never seen the game.**
2. Later, with the operator: redraw the aqueduct's north-east corner for Hard's North
   run (where the canisters land, the road beside the landing ground).

## Open with the operator

1. **Guesses still standing:** the ? pages' lines are Claude's (good for now, the
   operator's word); the bugle for a lesson passed; the knife's cry worded "a cry" and
   CRY, though nothing shows it while it is off.

## Owed

- **From the operator** (ART-PROMPTS.md): Priority 22, reference art for the
  aqueduct's board; optional: 21 (winter kit), 25 (the course's contents panel and
  title card). The rewording pass on the lessons, the aqueduct's copy, and the ? pages.
- **Parked in ROADMAP.md** (the operator's, 14 Oct): tips as in-world briefings, an
  Advice button, a better clipboard (now painted), hiding a body.
