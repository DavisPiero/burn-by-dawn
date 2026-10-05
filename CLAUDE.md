# CLAUDE.md — working agreement

Read `SPEC.md` before doing anything. It is the source of truth, with the files that
hold its §11, §13 and §14 (below). If a request conflicts with any of them, say so before
writing code.

## Files in this repo

- `CLAUDE.md` — this file. Rules you must follow.
- `SPEC.md` — the design and technical spec. Authoritative. Two of its sections are files
  of their own, as authoritative as it is, so that it stays short enough to read whole:
  - `ART-DIRECTION.md` — SPEC §11: how the game looks, reads, moves and sounds. **Read it
    before touching anything the player sees or hears** (`src/render/`, `index.html`, the
    words on screen).
  - `MISSION-AIRFIELD.md` — SPEC §13: mission 2. **Read it before working on the
    airfield**, and as the pattern when specifying a new mission. Each later mission gets
    a `MISSION-<NAME>.md` like it, written before the mission is built.
  - `MISSION-AQUEDUCT.md` — SPEC §14: mission 3, playable, not yet balanced. **Read it
    before working on the aqueduct.**
- `ART-ASSETS.md` — the art asset manifest. **Read it at milestone M7**, and whenever you
  create a sprite id, an asset filename, or an asset dimension. Those must match it exactly.
- `ART-PROMPTS.md` — what art to generate next, with specs and prompts, for the operator.
  Keep its "what Claude is drawing in code" list true when sprites change.
- `DECISIONS.md` — append-only log. See below.
- `ROADMAP.md` — what comes after the current milestone, and in what order. Read it when
  choosing or scoping the next milestone. SPEC.md still wins where they differ.
- `docs/Historical_Raids.md` — the operator's notes on real raids, source material for
  future missions.
- `docs/BUILD-RUNBOOK.md` — **for the human operator only. Do not read or act on it.**
  It describes how sessions are run, not how the game is built.

## Hard rules

1. **No dependencies. No build step. No framework.** Vanilla JS ES modules, HTML, SVG.
   If you think a library is needed, stop and ask first.
2. **`./run.sh` then `localhost:8000` must run the game, with nothing else installed.**
   ES modules are blocked over `file://`, so a static file server is required and that is
   the only acceptable dependency. Nothing may require a bundler, a package manager, npm,
   or a Node process. If you need a build step to make something work, you have chosen the
   wrong approach — stop and ask.
3. **Desktop target: mouse and keyboard, 1280x800 minimum.** Do not write a mobile layout,
   do not add touch handlers, do not add breakpoints. Hover is a core interaction and the
   game is allowed to depend on it.
4. **All randomness goes through `rng.js`**, which is seeded. Never call `Math.random()`.
   The current seed is displayed in the UI.
5. **All balance numbers live in `/data/*.json`.** Movement costs, detection thresholds,
   turn limits, vision radii, fuse lengths, AP pools. Never hardcode them in logic files.
6. **Character traits are data, never code.** A trait is one entry in `traits.json` naming
   one hook and one modifier. Never add a code branch for a specific named character. If a
   trait cannot be expressed on an existing hook, make it flavour text and say so — do not
   extend the hook system for one character.
7. **Rules are pure functions.** They take state and return new state. Rendering reads
   state and never mutates it. Keep `src/render/` free of game rules.
8. **All art goes through the sprite registry in `theme.js`** as SVG `<symbol>`/`<use>`.
   No inline path data in game logic. Art must be swappable by editing one file.
9. No `localStorage` or `sessionStorage`.

## Scope discipline

- Build exactly the current milestone from SPEC.md §12. Do not build ahead.
- If you finish early, improve what exists rather than starting the next milestone.
- Prefer deleting a feature over half-building two.

## Commits and branches

- One branch per milestone: `m0-hex-grid`, `m1-terrain`, and so on.
- Commit at every working state, not just at the end. Small commits, present tense
  messages: `add axial neighbour lookup`.
- Never force-push. Never rewrite history on `main`.
- At the end of a session, leave the branch in a state that runs.

## At the end of every session, report

1. What was built, in plain language.
2. Anything you had to guess or invent because the spec was silent.
3. Anything in the spec that turned out to be a bad idea once implemented. Say this
   plainly. The spec is not sacred.
4. What is testable right now and how to test it by hand.

## Documentation

Keep a `DECISIONS.md` at the repo root. One line per non-obvious choice, with the reason.
Append, never rewrite.
