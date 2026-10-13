# BURN BY DAWN — The training mission, the practice ground (SPEC.md §15)

This is §15 of the specification, kept in a file of its own. It is as authoritative as
SPEC.md. "SPEC.md §15" in the code, the tests and the other documents means this file.

Section numbers in it (§4, §6) are SPEC.md's. Like SPEC.md it says how things are **now**
and what is **to be built next**, each marked; it keeps no history (DECISIONS.md has it).
The words and names are placeholder copy for the operator to reword.

**State: the lesson engine is built (M47) and so is the course, all seventeen lessons
(M48). Since M48g it is playable from the contents page, first on it and flagged
START HERE.**

---

### What it is

**A course, not a raid.** A playtester's idea, taken up by the operator (ROADMAP.md,
Phase 5): a tutorial, one thing to do at a time, with the board holding the player's
hand. It is first on the contents page, marked START HERE (a mission's `flag` in
`missions.json`, in the red pen beside its title).

**The practice ground, Tatton Park, England, 1941**: the park where No. 1 Parachute
Training School dropped its pupils. The same six men and the same 18×13 board. The
garrison is **umpires**: sentries and patrols by the rules of §6, who blow a whistle
where the enemy would fire. They wear a service cap and a white armband (a mission's
`enemyKit`, drawn in code until a painted chip is in its `enemyChips` folder) and cry
out in English (YOU THERE!, WHAT'S THIS?). The target is a **training bridge** over the brook.

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
| `card` | Left out, the lesson card lies bottom right. `"northwest"` puts it top left for the whole lesson: the training bridge and both its charge points are under the usual corner, and the timer tin opens over it |
| `start` | Its own situation: `men` by roster id (`at`, and optionally `ap`, `charges`, `hits`, `hidden`), `enemies` in a map's own shape, `parachutes`, `droppedCharges`, `canisters` (`at` and the `charges` in it: a pile of charges, as §9), `turn`, `alert`. A man not named is not on the board. The map's own enemies are not on. Or, in place of `men`, **`drop`**: `{ run, landings }`, a lesson that starts in the drop, each man named coming down on his hex with nothing rolled |
| `steps` | What the player does, in order |

**A step**:

| Field | What it is |
|---|---|
| `say` | The pen's line on the board, **seven words at most**, at hex `at` or under the man it is about |
| `tell` | The lesson card's words before the step is done, a sentence or two: what to do. A new line in `tell` or `then` is a new paragraph on the card |
| `then` | The card's words once it is done, while what it did is still on the board: what he is now looking at, and the rule with its number (a hedge is 2 AP a hex). Every step has one but a step that only shows something |
| `ring` | Hexes ringed in the pen, or `"men"` (a wider ring, round the man's whole hex: the man the step names, or every man where it names none) |
| `point` | A part of the page ringed in the pen, where what the step shows is not on the board: `roster`, `alert`, `clock`, `readout`, `actions`, `radio` (the diversion's button). A card kept top left stays in its corner and only points |
| `allow` | The only things that do anything: `select` (ids, or true), `move` (hexes, or `"any"`), `actions` (ids), `target` (the only hexes an aimed action may be clicked on; anywhere if left out), `fuse` (the only time pencil a charge may be set with; any if left out), `endTurn`, and in the drop `run` and `jump` |
| `does` | Read only by the test that plays the lesson: where it throws, or how it kills |
| `until` | What ends the step: one of the list below |
| `mayBeSeen` | True where being spotted is the lesson; then only a hit stops it |
| `free` | True in the passing-out exercise's steps (M48f). It has no `then` and is never held: met, it runs straight on into the next, which is so a checkpoint. Its card is narrow and says only its `tell`; its `say` is not written on the board. Its `ring` is where its charges go: a ringed hex with a charge set on it is no longer ringed. The umpire says on a card of his own what a thing done would have cost on a real mission, and the whistle's words are a real mission's. Its `does.script` is the playthrough the test makes |

**What a step may wait for**, a short fixed list in the spirit of the win conditions:
`selected` (a man), `movedTo` (hexes), `hovered` (hexes), `hidden`, `packed` (a
parachute), `turnEnded`, `chargeSet`, `enemyDown`, `destroyed` (an objective), `manOut` (a man; so many men, with `count`),
`acknowledged` (a step that only shows something: the card has a NEXT button), and
M48's six: `runPicked` and `landed` (the drop), `contactBroken`, `stoneThrown`,
`suppressed`, `carrying` (a man holds so many charges: picked up, or passed to him),
and M48e's `dressed` (a man's wound has been dressed).

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
- **Looking is always allowed**: hovering, the routes, how to play. But no path is
  drawn to a hex he may not go to now (the operator's, M48e), except the hexes a hover
  step asks for; the box under the map still describes the hex, and says "no movement on
  this lesson step" (the operator's words) where it would have said "click to move". Selecting, moving,
  actions and ending the turn are allowed only as the step lists. Undo is off: a lesson
  goes back by its steps. The radio's button is greyed like End turn, lit only in
  the step that calls it.
- After anything changes: **a man seen, hit or killed** (unless `mayBeSeen`) blows the
  whistle and puts the step back as it began.
- **Do it, see it, then NEXT** (the operator's, M48: what a card said of a thing was
  gone the moment the thing was done). A step whose condition is met is **held**: the
  board stays as it is, nothing more does anything, the card says its `then`, and only
  NEXT (or Enter) leads to the next step, which begins from the board as it stands;
  the last leads to **PASSED**. What a hover step showed stays shown while it is held.
- **While a step is held, doing exactly what the next step asks for is NEXT, and does
  it** (the operator's, M48c: a card waiting on NEXT with Knife still looking pressable
  confused). Picking a man counts only where picking him is the next step, and a hover
  never does. So that nothing looks pressable that is not: in a lesson the action
  strip shows as buttons only what would do something now (the step's own actions, or
  the next step's while it is held), the rest as their keys; End turn is greyed the
  same way.
- **STEP BACK** is the step before, as it began (not offered on the first step); from
  a step done and held it is that step again.
  **START AGAIN** is the lesson from its start. **COURSE MENU** is the list. All three come from one thing: every step's starting
  state is kept, and a lesson's start is rebuilt from its data.
- **Nothing is stored** (CLAUDE.md rule 9): the list ticks what was passed this
  session. Passes are not carried in the address: seventeen flags in a link is clutter,
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

Seventeen lessons, the operator's eleven and four of mine (ROADMAP.md has the table),
with fighting in three and charges in two. Built: **all seventeen**. PASSED leads to the next lesson built, and a test holds that their
numbers run on with none skipped. Charges are two lessons (the operator's: one was by
far the longest), and "reading the page" is
part of lesson 1; fighting is three, one man each (the operator's: knives and guns
apart, and no lesson switching between men). The list runs 1 to 17 with no empty number.

| # | Lesson | Qualifies | Needs from the engine beyond M47 |
|---|---|---|---|
| 1 | The drop, and reading the page | PARACHUTIST | Built: `start.drop`, `runPicked`, `landed`, and `point` for the four steps that read the page |
| 2 | Parachutes | FIELDCRAFT | Built |
| 3 | Action points | MOVEMENT | Built |
| 4 | Ground | MOVEMENT | Built |
| 5 | Seen and not seen: not being seen, then being seen and breaking contact | FIELDCRAFT | Built: `mayBeSeen`, `contactBroken` |
| 6 | Watching the garrison: a beat, next turn, a stone | FIELDCRAFT | Built: `stoneThrown`, `allow.target` (a stone thrown anywhere else left the next step nothing to show) |
| 7 | The knife: move in behind, end the turn, knife (Vance) | WEAPONS | Built. He must start his turn beside the umpire, so the lesson has him wait a turn |
| 8 | The gunner: suppress, end the turn, kill (Speers) | WEAPONS | Built: `suppressed` |
| 9 | Firing back: seen as the first turn ends, he fires back in the second (Fitch) | WEAPONS | Built |
| 10 | Charges, fetch and carry: the canister, picking up and its weight, passing (Barrow to Fitch) | DEMOLITIONS | Built: `start.canisters`, `carrying`. A pass is 2 AP, so he ends a turn first, and sees his pool a point short |
| 11 | Charges, set and get clear: he steps onto a charge point (the operator's: so the player learns what one looks like), the two timers matched (4, then 2 on turn 3), getting clear, the bang (Nunn) | DEMOLITIONS | Built: `allow.fuse`, the `card` top left. Its last step ends two turns. The course's charges take the tin throughout, 2 to 4 turns (`missions.json`); the second charge is left lying at the far point, since no man has room for two |
| 12 | The leader: Dutch moves in beside Fitch, who has 5 AP when the turn ends; Fitch spends 4 of them walking into an umpire's view and is seen (the operator's: seen in the same turn, the marks on his counter hid the 5 AP); the radio puts him out of contact and the umpire turns back to his post | LEADERSHIP | Built: the radio is told by `contactBroken`, and its button is pointed at (`point: radio`). The game's own diversion card comes up over the lesson. The `card` top left: the sentry is under the usual corner |
| 13 | The men: two skills by using them (Fitch sets a charge for 0 AP; Vance stands where any other man is seen), the other four told | THE STICK | Built. Cut to fit (the operator's yes): six by hand was by far the longest lesson, and Treetops only works in a drop |
| 14 | Getting out: the gate, dawn, and one man walked out | EXFILTRATION | Built (`manOut`). An exercise is never settled, so withdrawing and its "are you sure" card are told, not met |
| 15 | The alert: a hex 4 off a sentry is not red at Calm; one stone makes Suspicious, and it is; then what raises the dial and what lowers it | FIELDCRAFT | Built: `acknowledged` steps, `start.alert`. Decay is told, not shown: it takes 4 quiet turns |
| 16 | A wounded man: Barrow dresses Nunn's wound, and Nunn has his pool back the turn after | FIRST AID | Built: `dressed` (`start.men.hits`) |
| 17 | Ready for Action (the operator's name for it, M48g), the passing-out exercise: all six from the drop, the bridge umpire and the lane umpire, the Training Bridge blown and every man out by the gate. No hand held: a small card with the job. Two things are said and shown all the same (the operator's, M48g: neither was clear): the bridge takes **two charges**, both charge points ringed until each has its charge; and **the bridge umpire watches both points**, so his head is turned with a stone, or he is silenced, first. **It cannot be failed** (the operator's, 13 Oct): being seen is allowed, a man hit or caught in a blast blows the whistle, and the whistle goes back to the last of three checkpoints (landed, first charge set, bridge down). **The umpire says what a thing would have cost on a real mission** (the operator's), on a card of his own: a man seen, a parachute or a body found, and at the whistle FITCH WOULD BE SHOT HERE ON A REAL MISSION! | PASSED OUT | Built: `free` steps, and `count` on `manOut` |

M48 has added seven conditions (run picked, landed, contact broken, stone thrown,
enemy suppressed, carrying, dressed), `count` on `manOut`, `start.drop`, `start.canisters`,
`point`, `card`, `allow.target`, `allow.fuse` and `free`. Each
is a line or two in `lessons.js`, with its test. If a lesson needs more than that, the
lesson is cut to fit, not the engine grown: the same rule as the trait hooks.

**The course's list is a two-page spread, with the clipboard** (built, M48f). The left
page is the seventeen lessons, a line each: its tick once passed, its title, its number.
The right page is the clipboard, the **training record**: the ten qualifications in the
order the course gives them, each with how many of its lessons are passed (FIELDCRAFT
2 of 4) and ticked QUALIFIED when all are, and stamped **PASSED OUT** across it when all
seventeen lessons are. It is the same page all through the course, filling in. Nothing
is stored: it is what was passed this session.

Still M48's: the **?** pages' diagrams drawn from the same lessons (M48h).

### Open for the operator

- **The setting's names** are kept for now (the operator's, 13 Oct): Tatton Park, the
  Mere Brook, Tatton Mere, Tatton Hall, the Knoll, and Tatton Wood and the Training
  Bridge, which are the operator's own.
- **The lessons' words** are Claude's, to the operator's pattern (say the rule plainly,
  with its number); the operator will reword them in a pass of their own.
- **Charges in two lessons** (10 and 11), **fighting in three** (7 to 9), and **the whistle only at the turn's end**:
  all the operator's (13 Oct).
- **The practice ground has one drop run**, so lesson 1's "pick" is a click on the only
  one; the board says CLICK THE DROP RUN there, and the card that missions have three.
- **The men's landing lines for the course** (`dialogue` in `missions.json`) are
  Claude's placeholders.
