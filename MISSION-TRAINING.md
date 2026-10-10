# BURN BY DAWN — The training mission, the practice ground (SPEC.md §15)

This is §15 of the specification, kept in a file of its own. It is as authoritative as
SPEC.md. "SPEC.md §15" in the code, the tests and the other documents means this file.

Section numbers in it (§4, §6) are SPEC.md's. Like SPEC.md it says how things are **now**
and what is **to be built next**, each marked; it keeps no history (DECISIONS.md has it).
The words and names are placeholder copy for the operator to reword.

**State: the lesson engine is built (M47) with two lessons that prove it; the mission is
a draft, played by `?mission=training`. M48 builds the course.**

---

### What it is

**A course, not a raid.** A playtester's idea, taken up by the operator (ROADMAP.md,
Phase 5): a tutorial, one thing to do at a time, with the board holding the player's
hand. It is first on the contents page, marked START HERE once it is playable.

**The practice ground, Tatton Park, England, 1941**: the park where No. 1 Parachute
Training School dropped its pupils. The same six men and the same 18×13 board. The
garrison is **umpires**: sentries and patrols by the rules of §6, who blow a whistle
where the enemy would fire. The target is a **dummy bridge** over the brook.

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
| `start` | Its own situation: `men` by roster id (`at`, and optionally `ap`, `charges`, `hits`, `hidden`), `enemies` in a map's own shape, `parachutes`, `droppedCharges`, `turn`, `alert`. A man not named is not on the board. The map's own enemies are not on |
| `steps` | What the player does, in order |

**A step**:

| Field | What it is |
|---|---|
| `say` | The pen's line on the board, **seven words at most**, at hex `at` or under the man it is about |
| `tell` | One sentence on the lesson card: the why |
| `ring` | Hexes ringed in the pen, or `"men"` |
| `allow` | The only things that do anything: `select` (ids, or true), `move` (hexes, or `"any"`), `actions` (ids), `endTurn` |
| `until` | What ends the step: one of the list below |
| `mayBeSeen` | True where being spotted is the lesson; then only a hit stops it |

**What a step may wait for**, a short fixed list in the spirit of the win conditions:
`selected` (a man), `movedTo` (hexes), `hovered` (hexes), `hidden`, `packed` (a
parachute), `turnEnded`, `chargeSet`, `enemyDown`, `destroyed` (an objective), `manOut`,
and `acknowledged` (a step that only shows something: the card has a NEXT button).

**How it runs.**
- The course's **orders are its list of lessons**: each with its number, what it
  qualifies, and PASSED once passed. Any key takes the first not yet passed; a click
  takes any. There is no level to choose and no drop to pick.
- A lesson starts **in play**: its men where it puts them, pools full. The game's own
  first-game cues (CLICK A MAN TO START, the first-move ghost) stand aside.
- **Looking is always allowed**: hovering, the routes, how to play. Selecting, moving,
  actions and ending the turn are allowed only as the step lists. Undo is off: a lesson
  goes back by its steps.
- After anything changes: **a man seen, hit or killed** (unless `mayBeSeen`) blows the
  whistle and puts the step back as it began; a step whose condition is met leads to
  the next, which begins from the board as it stands; the last leads to **PASSED**.
- **BACK** is the step before, as it began. **AGAIN** is the lesson from its start.
  **THE COURSE** is the list. All three come from one thing: every step's starting
  state is kept, and a lesson's start is rebuilt from its data.
- **Nothing is stored** (CLAUDE.md rule 9): the list ticks what was passed this
  session. Passes are not carried in the address: fifteen flags in a link is clutter,
  and nothing is unlocked by them.
- **Every lesson is played through by a test**, by the rule functions, doing what each
  step asks: a lesson that cannot be passed fails the suite, not a player. The test
  also holds what a lesson claims about the board (the hex it calls red is red).

**How it looks** (ART-DIRECTION.md has the detail): the step's `say` in the red pen on
the board with its rings; the **lesson card** in the turn card's place (lesson and
step, the sentence, the whistle's reason in red, BACK, AGAIN, THE COURSE); the PASSED
card; the umpire's whistle, made in code.

### The course (to be built, M48)

Fifteen lessons, the operator's eleven and four of mine (ROADMAP.md has the table).
M47 has two, to prove the engine: **3, Action points**, and the first half of **5, Not
being seen**.

| # | Lesson | Qualifies | Needs from the engine beyond M47 |
|---|---|---|---|
| 1 | The drop, and reading the page | PARACHUTIST | A lesson that starts in the drop, with a fixed landing (no scatter): `start.drop` |
| 2 | Parachutes | FIELDCRAFT | — (`packed`) |
| 3 | Action points | MOVEMENT | Built |
| 4 | Ground | MOVEMENT | — |
| 5 | Not being seen, then being seen and breaking contact | FIELDCRAFT | First half built; the second uses `mayBeSeen` and a condition for contact broken |
| 6 | Watching the garrison: routes, next turn, a stone | FIELDCRAFT | A condition for a stone thrown; hovering an enemy |
| 7 | Fighting: the knife, suppress and kill, firing back | WEAPONS | — (`enemyDown`); a condition for an enemy suppressed |
| 8 | Charges: canister, carry, pass, charge points, pencil, get clear | DEMOLITIONS | `start.canisters`; a mission rule for the time pencil in this lesson only is not possible (rules are per mission), so the course's charges take the tin throughout |
| 9 | The leader: orders and the radio | LEADERSHIP | A condition for the diversion called |
| 10 | The men: each man's own skill, by using it | THE STICK | — |
| 11 | Getting out: exfil, dawn, how many | EXFILTRATION | — (`manOut`); the exercise rule means the "are you sure" card is shown, not met |
| 12 | The alert: what raises it, what each state does, decay | FIELDCRAFT | `acknowledged` steps; `start.alert` |
| 13 | A wounded man: stabilising | FIRST AID | A condition for a man dressed (`start.men.hits`) |
| 14 | (folded into 1) Reading the page | — | — |
| 15 | The passing-out exercise: the dummy bridge, no hand held | PASSED OUT | A lesson whose one step allows everything and ends on `destroyed` then `manOut` |

So M48 adds perhaps five conditions to the list (contact broken, stone thrown, enemy
suppressed, diversion called, man dressed) and `start.drop` and `start.canisters`. Each
is a line or two in `lessons.js`, with its test. If a lesson needs more than that, the
lesson is cut to fit, not the engine grown: the same rule as the trait hooks.

Also M48's: the map finished (it is a sketch today: a wood, hedges, a brook, the dummy
bridge, a track); the umpires' own counters (white armbands; a mission's `enemyChips`
folder, as the aqueduct's Italians, drawn in code until painted) and their own cries;
the **clipboard** (today the course's list, ticked, stands in for it); START HERE on
the contents page and the mission made `playable`; the **?** pages' diagrams drawn
from the same lessons.

### Open for the operator

- **The setting's names**: Tatton Park, the Mere Brook, Home Wood. Mine.
- **Every word of the two lessons**: the pen lines and the sentences. Mine, and the
  pattern M48 will follow, so worth rewording before fifteen are written to it.
- **Lesson order.** The table follows the operator's list. Lesson 8 (charges) is the
  longest by far and may want splitting in two.
- **Should play tips default to on once a player has passed the course, or stay off?**
  Today they are off unless ticked (M46).
