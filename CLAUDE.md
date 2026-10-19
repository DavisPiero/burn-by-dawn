# CLAUDE.md — working agreement

Read `SPEC.md` before doing anything. It is the source of truth, with the files that
hold its §4, §6, §7, §9, §10, §11, §13, §14, §15 and §16 (below). If a request conflicts with any of them, say so before
writing code.

## Files in this repo

- `CLAUDE.md` — this file. Rules you must follow.
- `SPEC.md` — the design and technical spec. Authoritative. Some of its sections are files
  of their own, as authoritative as it is, so that it stays short enough to read whole:
  - `ART-DIRECTION.md` — SPEC §11: how the game looks: the spread, colour and type, the
    board, counters and markers. **Read it before touching anything the player sees or
    hears** (`src/render/`, `index.html`, the words on screen). Its two other parts, read
    the one that covers what you touch: `ART-CARDS.md` (every card: contents, orders, how
    to play, lessons, turn cards, the back page) and `ART-PLAY.md` (before the drop, the
    hover readout and the turn log, motion and feedback, sound).
  - `MISSION-AIRFIELD.md` — SPEC §13: mission 2. **Read it before working on the
    airfield**, and as the pattern when specifying a new mission. Each later mission gets
    a `MISSION-<NAME>.md` like it, written before the mission is built.
  - `MISSION-AQUEDUCT.md` — SPEC §14: mission 3, playable and balanced. **Read it
    before working on the aqueduct.**
  - `MISSION-GUNNERSIDE.md` — SPEC §16: mission 4, its rules, map and balance. **Read it
    before working on Gunnerside.** Its words, panels, pictures and sounds are in
    `MISSION-GUNNERSIDE-WORDS.md`: read that too before touching what Gunnerside's
    player reads, sees or hears.
  - `MISSION-TRAINING.md` — SPEC §15: the training course and its lesson engine. **Read
    it before working on a lesson or on `src/lessons.js`.**
  - `TURNS.md` — SPEC §4: the turn, every action and its cost, mouse and keyboard.
    **Read it before changing an action, a cost or an input.**
  - `WINNING.md` — SPEC §10: winning, losing, the score, missions as data, difficulty,
    the balance baselines. **Read it before touching scoring, `missions.json` or balance.**
  - `DETECTION.md` — SPEC §6: detection, the alert, noise, contact and enemy fire,
    reinforcements. **Read it before working on `src/enemy.js` or `src/sight.js`.**
  - `SABOTAGE.md` — SPEC §7: objectives, charges, fuses and time pencils, explosions,
    payoffs. **Read it before working on `src/sabotage.js`.**
  - `DROP.md` — SPEC §9: the drop runs and scatter, parachutes, supply canisters, tracks
    in the snow. **Read it before working on `src/drop.js` or `src/tracks.js`.**
- `MILESTONES.md` — the table of milestones done (SPEC §12). Add a row at each merge.
- `ART-ASSETS.md` — the art asset manifest. **Read it at milestone M7**, and whenever you
  create a sprite id, an asset filename, or an asset dimension. Those must match it exactly.
- `ART-PROMPTS.md` — what art to generate next, with specs and prompts, for the operator.
  Keep its "what Claude is drawing in code" list true when sprites change.
  Only what is still to make, most wanted first. Move an item to `ART-PROMPTS-ARCHIVE.md`
  (everything made, with its prompt; not read every session) when it is done.
- `STATE.md` — one page: where the project stands, what is next, what is open with the
  operator. **Read it at the start of every session and rewrite it at the end.**
- `DECISIONS.md` — append-only log. See below. Entries before M56 are in
  `DECISIONS-ARCHIVE.md`, which is not read every session.
- `ROADMAP.md` — what comes after the current milestone, and in what order. Read it when
  choosing or scoping the next milestone. SPEC.md still wins where they differ.
  Phases 1 to 5, done, are in `ROADMAP-ARCHIVE.md`, which is not read every session.
- `docs/WORDING.md` — the wording sheet (M53): every on-screen line by where it shows, for
  the operator to reword. `docs/WORDING-SOURCES.md` says where each tagged line lives.
  Read both only when carrying the operator's rewording back.
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
