# NIGHT DROP — Build runbook

How to actually execute this in Claude Code, in order, with which model at each step.

---

## Phase 0 — Setup

Two routes. Pick one.

### Route A — local only (desktop, no account needed)

```
mkdir night-drop && cd night-drop
git init
```

Drop `SPEC.md`, `CLAUDE.md`, `ART-ASSETS.md` and `run.sh` in, then:

```
chmod +x run.sh
git add -A && git commit -m "specs and local server"
claude
```

Everything in this runbook works except cloud sessions from your phone and the Pages
preview URL. You can add a remote later with `git remote add origin <url>` and lose
nothing by having started local.

One caveat: a local-only repo on one machine is one disk failure from gone. Add a remote,
or at minimum a Time Machine backup, before you've put real hours in.

### Route B — GitHub (needed for iOS, 15 minutes on your phone)

1. **GitHub account.** github.com in Safari. Free tier is fine.
2. **New repository.** Name it `night-drop`. Public (needed for free GitHub Pages).
   Tick "Add a README". Default branch `main`.
3. **Upload the three spec files.** Add file → Upload files → `SPEC.md`, `CLAUDE.md`,
   `ART-ASSETS.md` into the repo root. Commit to `main`.
4. **Turn on Pages.** Settings → Pages → Source: Deploy from a branch → `main` → `/root`.
   Your game will live at `https://<username>.github.io/night-drop/` once `index.html` exists.
5. **Claude app → Code tab → New Session.** Pick the `night-drop` repo.

If you don't see a Code tab, your plan may not include it. Check
https://support.claude.com before troubleshooting anything else.

---

## Phase 1 — The session loop

Every milestone follows the same five steps. Don't improvise this; the loop is what keeps
a long project from drifting.

### 1. Open a fresh session

One session per milestone. Never two milestones in one session — context fills up, the
model starts forgetting rules from CLAUDE.md, and quality drops in ways that are hard to
spot until much later.

### 2. Set the model

`/model` inside the session. See the table below for which.

### 3. Give it this prompt

```
Read SPEC.md and CLAUDE.md in full before writing anything.

Build milestone M<N> only. Do not build ahead.

Work on a new branch named m<N>-<short-name>.

Before you write code, tell me your plan: which files you'll create or
change, and any place the spec is ambiguous or wrong. Wait for me to
confirm before implementing.
```

That last paragraph is the important one. Making it plan first, out loud, catches
misreadings before they become 400 lines you have to unpick.

### 4. Review

- Read the plan. Push back if it's building something you didn't ask for.
- When it's done, check the diff. `/diff` opens a native diff sheet on mobile.
- Open the GitHub Pages URL and actually play it. Every milestone must be playable.

### 5. Merge and close

- Merge the branch into `main` from GitHub.
- Confirm `DECISIONS.md` got a line for anything non-obvious.
- End the session. Start the next milestone fresh.

---

## Which model, when

The general rule: **Opus for decisions, Sonnet for typing, Haiku for chores.**

The simplest setup is to run `/model opusplan`, which uses Opus for planning and Sonnet
for execution automatically. That's a sensible default for this whole project. Where a
milestone is listed as Opus below, it's worth forcing Opus for the whole session instead.

| Milestone | Model | Why |
|---|---|---|
| **M0** grid + click | Sonnet 5 | Well-trodden. Hex maths is in the spec; it just has to type it. |
| **M1** terrain from JSON | Sonnet 5 | Data plumbing. |
| **M2** units, movement, hover preview | Sonnet 5 | A* and hover previews are standard. Use opusplan if it stalls. |
| **M3** trait hook system | **Opus 5** | This is architecture. The whole value is a system that stays cheap to extend for years. Getting it wrong costs you every session afterwards. |
| **M4** enemies, detection, alert | **Opus 5** | A state machine with escalation, decay and patrol re-targeting. Lots of interacting rules. This is where subtle bugs breed. |
| **M5** charges, fuses, win/lose | Sonnet 5 | Mostly mechanical once M4 exists. |
| **M6** drop phase | opusplan | Seeded determinism is easy to get subtly wrong. Let Opus plan it. |
| **M7** art pass | Sonnet 5 | High volume SVG output, low reasoning. Sonnet is faster and just as good here. |
| **M8** balance | **Opus 5** | This is judgement, not code. Ask it to reason about win rates and failure modes, not just tweak numbers. |

**Also:**
- **Haiku 4.5** for chores: renaming assets, reformatting JSON, updating docs, tidying
  comments. Fast and cheap, and none of it needs thinking.
- **Opus 5** any time you hit a bug that spans several files, or something is behaving
  strangely and you can't see why. Switching mid-session doesn't clear your history.
- **Fable 5.1** sits above Opus. Worth reaching for only if something is genuinely stuck
  after Opus has had a real go, or for a large refactor late in the project. Overkill for
  everything in the table above.

Check your plan covers the models you want. On some plans Opus access needs extra usage
enabled.

---

## Moving to desktop

You'll want to be at a real machine from M7, and honestly from M4 onward it'll be more
pleasant.

1. Install Node.js (LTS) from nodejs.org.
2. `npm install -g @anthropic-ai/claude-code`
3. `git clone https://github.com/<username>/night-drop.git && cd night-drop`
   (or skip this if you went with Route A — you already have the folder)
4. `claude` to start a session in that directory.
5. `/model` to pick, `/status` to check what you're on.
6. In a second terminal tab, `./run.sh`, then leave `localhost:8000` open in a browser.
   Refresh after each change rather than waiting on a Pages redeploy.

To pull a cloud session you started on your phone into your local terminal:
`claude --teleport`.

Once you're at a desk, the workflow improves in two ways: you can run a local preview
instead of waiting for Pages to redeploy, and you can actually see the game at the size
it's designed for.

---

## Session hygiene

Things that will save you hours.

- **One milestone per session.** Stated above, repeated because it's the one people ignore.
- **`/clear`** between unrelated tasks in the same session. It resets context without
  ending the session.
- **`/compact`** when a session gets long and you want to keep going. It summarises what
  came before.
- **Read the diff before merging.** It can misunderstand you confidently. This is the
  single habit that separates people who get good results from people who get a mess.
- **Commit often.** The CLAUDE.md rule asks for a commit at every working state. That's
  your undo button.
- **When it goes badly wrong, revert, don't argue.** Abandon the branch, start a fresh
  session, and rewrite the prompt to be clearer about the thing it got wrong. Arguing with
  a session that's gone off the rails costs more than starting over.
- **Keep `DECISIONS.md` honest.** In three months you will not remember why the detection
  formula subtracts concealment before the proximity bonus.

---

## A realistic schedule

Each milestone is a sitting of roughly 45–90 minutes, most of which is you reviewing and
playtesting rather than waiting.

- M0–M2 in one weekend gets you a board with six men walking around on it.
- M3–M5 in a second gets you a real, winnable mission.
- M6 adds the drop.
- M7 is the one that takes as long as you let it. Set a limit before you start.
- M8 is short and matters more than it sounds.

The trap is jumping to M7 early because the art is the fun part. Don't. Balance a grey-box
game first, or you'll be re-cutting beautiful assets to fit a design that changed.
