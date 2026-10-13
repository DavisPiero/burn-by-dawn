# BURN BY DAWN — The training mission, the practice ground (SPEC.md §15)

This is §15 of the specification, kept in a file of its own. It is as authoritative as
SPEC.md. "SPEC.md §15" in the code, the tests and the other documents means this file.

Section numbers in it (§4, §6) are SPEC.md's. Like SPEC.md it says how things are **now**
and what is **to be built next**, each marked; it keeps no history (DECISIONS.md has it).
The words and names are placeholder copy for the operator to reword.

**State: the lesson engine is built (M47); M48 is building the course, and has lessons
1 to 7 of fifteen. The mission is a draft, played by `?mission=training`.**

---

### What it is

**A course, not a raid.** A playtester's idea, taken up by the operator (ROADMAP.md,
Phase 5): a tutorial, one thing to do at a time, with the board holding the player's
hand. It is first on the contents page, marked START HERE once it is playable.

**The practice ground, Tatton Park, England, 1941**: the park where No. 1 Parachute
Training School dropped its pupils. The same six men and the same 18×13 board. The
garrison is **umpires**: sentries and patrols by the rules of §6, who blow a whistle
where the enemy would fire. The target is a **training bridge** over the brook.

Its pillar check. It adds nothing to do or to avoid: it is the game's own verbs, one at
a time, with nothing at stake. Its test is ROADMAP's: a new player makes a first move
within a minute, and never reads a paragraph to learn a rule.

### What the operator asked of it (requirements)

1. **Pictures first.** Every lesson shows the thing on the board, with the board's own
   counters and cues, and says little.
2. **Any lesson can be taken on its own**, again or as a refresher, from the course's
   list, at any time. So each lesson sets up its own small situation and needs nothing
   from the one before.
3. **Idiot proof.** Only what a step asks for does anything; a wrong click is ignored
   and the lesson card shakes its head. Steps can be gone back through one at a time,
   and a lesson started again.
4. **Nobody is hurt and it cannot be lost.** Caught out, the umpire's whistle blows and
   the step is put back as it began, with the reason on the lesson card.
5. **A clipboard at the end**: every skill learnt, ticked off as a qualification.

### The engine (built, M47)

A mission may name a **lessons file** (`lessons` in `missions.json`); it is then a
course. No code asks which mission is on: every other mission has no such file, and for
them nothing below exists. `src/lessons.js` is pure functions over state.

**An exercise is never settled** (`mission.exercise` in `rules.json`, false in the
files, true in the course's patch): nobody withdraws, no dawn ends it, there is no back
page. Its `turnLimit` is 99.

**A lesson** is data:

| Field | What it is |
|---|---|
| `id`, `number`, `title` | Its name, and its place in the course as the list prints it |
| `qualification` | What passing it ticks off (MOVEMENT, FIELDCRAFT) |
| `start` | Its own situation: `men` by roster id (`at`, and optionally `ap`, `charges`, `hits`, `hidden`), `enemies` in a map's own shape, `parachutes`, `droppedCharges`, `turn`, `alert`. A man not named is not on the board. The map's own enemies are not on. Or, in place of `men`, **`drop`**: `{ run, landings }`, a lesson that starts in the drop, each man named coming down on his hex with nothing rolled |
| `steps` | What the player does, in order |

**A step**:

| Field | What it is |
|---|---|
| `say` | The pen's line on the board, **seven words at most**, at hex `at` or under the man it is about |
| `tell` | The lesson card's words, two or three short sentences: what he is looking at, the rule with its number (a hedge is 2 AP a hex), and what to do |
| `ring` | Hexes ringed in the pen, or `"men"` (a wider ring, round the man's whole hex) |
| `point` | A part of the page ringed in the pen, where what the step shows is not on the board: `roster`, `alert`, `clock`, `readout`, `actions` |
| `allow` | The only things that do anything: `select` (ids, or true), `move` (hexes, or `"any"`), `actions` (ids), `target` (the only hexes an aimed action may be clicked on; anywhere if left out), `endTurn`, and in the drop `run` and `jump` |
| `does` | Read only by the test that plays the lesson: where it throws, or how it kills |
| `until` | What ends the step: one of the list below |
| `mayBeSeen` | True where being spotted is the lesson; then only a hit stops it |

**What a step may wait for**, a short fixed list in the spirit of the win conditions:
`selected` (a man), `movedTo` (hexes), `hovered` (hexes), `hidden`, `packed` (a
parachute), `turnEnded`, `chargeSet`, `enemyDown`, `destroyed` (an objective), `manOut`,
`acknowledged` (a step that only shows something: the card has a NEXT button), and
M48's five: `runPicked` and `landed` (the drop), `contactBroken`, `stoneThrown`,
`suppressed`.

**How it runs.**
- The course's **orders are its list of lessons**: each with its number, what it
  qualifies, and PASSED once passed. **Only its green button** takes the first not yet
  passed (Enter is that button), and a click on a lesson takes that one: no stray key or click starts
  anything. There is no level to choose.
- A lesson starts **in play**: its men where it puts them, pools full. The game's own
  first-game cues (CLICK A MAN TO START, the first-move ghost) stand aside. Lesson 1
  alone starts **in the drop**, and the drop's own cues are its teaching.
- **PASSED stays until its green button is clicked** (the operator's: a stray click
  started the next lesson while the last was still being read).
- **Looking is always allowed**: hovering, the routes, how to play. Selecting, moving,
  actions and ending the turn are allowed only as the step lists. Undo is off: a lesson
  goes back by its steps.
- After anything changes: **a man seen, hit or killed** (unless `mayBeSeen`) blows the
  whistle and puts the step back as it began; a step whose condition is met leads to
  the next, which begins from the board as it stands; the last leads to **PASSED**.
- **STEP BACK** is the step before, as it began (not offered on the first step).
  **START AGAIN** is the lesson from its start. **COURSE MENU** is the list. All three come from one thing: every step's starting
  state is kept, and a lesson's start is rebuilt from its data.
- **Nothing is stored** (CLAUDE.md rule 9): the list ticks what was passed this
  session. Passes are not carried in the address: fifteen flags in a link is clutter,
  and nothing is unlocked by them.
- **Every lesson is played through by a test**, by the rule functions, doing what each
  step asks: a lesson that cannot be passed fails the suite, not a player. The test
  also holds what a lesson claims about the board (the hex it calls red is red).

**How it looks** (ART-DIRECTION.md has the detail): the step's `say` in the red pen on
the board with its rings; the **lesson card** in the turn card's place (lesson and
step, the sentence, the whistle's reason in red, TO GO ON: and the step's line, STEP
BACK, START AGAIN, COURSE MENU); the PASSED card; the umpire's whistle, made in code.

### The practice ground

A park, not France's bocage (the operator's, M48: the sketch read too like France).
**Tatton Mere** fills the north and runs out south as **the Mere Brook**, a hex west of
where the sketch had it, crossed by the training bridge on the road. **Tatton Hall** and
its kitchen garden are in the north-west; its road runs south-east to the bridge and
on east, and a lane runs south-west from the bridge to the gate, the exfil. The grass
is open, with copses, one L of paddock hedge, the Knoll east of the mere and **Tatton
Wood** in the south-east. The brook's name is set upright down its water. The lessons
call the drive **the road** (the operator's: "the drive" confused).

### The course (being built, M48)

Fifteen lessons, the operator's eleven and four of mine (ROADMAP.md has the table).
Built: **1 to 7**. PASSED leads to the next lesson built, and a test holds that their
numbers run on with none skipped. Charges are two lessons (the operator's: one was by
far the longest), and "reading the page" is
part of lesson 1, so the list runs 1 to 15 with no empty number.

| # | Lesson | Qualifies | Needs from the engine beyond M47 |
|---|---|---|---|
| 1 | The drop, and reading the page | PARACHUTIST | Built: `start.drop`, `runPicked`, `landed`, and `point` for the four steps that read the page |
| 2 | Parachutes | FIELDCRAFT | Built |
| 3 | Action points | MOVEMENT | Built |
| 4 | Ground | MOVEMENT | Built |
| 5 | Seen and not seen: not being seen, then being seen and breaking contact | FIELDCRAFT | Built: `mayBeSeen`, `contactBroken` |
| 6 | Watching the garrison: a beat, next turn, a stone | FIELDCRAFT | Built: `stoneThrown`, `allow.target` (a stone thrown anywhere else left the next step nothing to show) |
| 7 | Fighting: the knife, suppress and kill; firing back told, not done | WEAPONS | Built: `suppressed`. Firing back needs a man already seen and fired on; it is a NEXT step that points at the actions |
| 8 | Charges: the canister, carrying and its weight, passing | DEMOLITIONS | `start.canisters` |
| 9 | Charges: the charge points, the timer, getting clear, the bang | DEMOLITIONS | A mission rule for the time pencil in this lesson only is not possible (rules are per mission), so the course's charges take the tin throughout |
| 10 | The leader: orders and the radio | LEADERSHIP | A condition for the diversion called |
| 11 | The men: each man's own skill, by using it | THE STICK | — |
| 12 | Getting out: exfil, dawn, how many | EXFILTRATION | — (`manOut`); the exercise rule means the "are you sure" card is shown, not met |
| 13 | The alert: what raises it, what each state does, decay | FIELDCRAFT | `acknowledged` steps; `start.alert` |
| 14 | A wounded man: stabilising | FIRST AID | A condition for a man dressed (`start.men.hits`) |
| 15 | The passing-out exercise: the training bridge, no hand held | PASSED OUT | A lesson whose one step allows everything and ends on `destroyed` then `manOut` |

So far M48 has added five conditions (run picked, landed, contact broken, stone thrown,
enemy suppressed), `start.drop`, `point` and `allow.target`; still to come, perhaps two
more (diversion called, man dressed) and `start.canisters`. Each
is a line or two in `lessons.js`, with its test. If a lesson needs more than that, the
lesson is cut to fit, not the engine grown: the same rule as the trait hooks.

Also M48's: the umpires' own counters (white armbands; a mission's `enemyChips`
folder, as the aqueduct's Italians, drawn in code until painted) and their own cries;
the **clipboard** (today the course's list, ticked, stands in for it); START HERE on
the contents page and the mission made `playable`; the **?** pages' diagrams drawn
from the same lessons.

### Open for the operator

- **The setting's names** are kept for now (the operator's, 13 Oct): Tatton Park, the
  Mere Brook, Tatton Mere, Tatton Hall, the Knoll, and Tatton Wood and the Training
  Bridge, which are the operator's own.
- **The lessons' words** are Claude's, to the operator's pattern (say the rule plainly,
  with its number); the operator will reword them in a pass of their own.
- **Charges in two lessons** (8 and 9), and **the whistle only at the turn's end**:
  both the operator's (13 Oct).
- **A hover step goes on the instant the mouse crosses the hex**, which can skip a
  card still being read. Left alone unless it is met in play.
