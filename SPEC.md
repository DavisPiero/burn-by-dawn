# BURN BY DAWN — Specification

The game is called **Burn by Dawn**. *Night Drop* was its working title, and the repo,
branch history and some internal ids (`night-drop-ready`) keep that name.

A turn-based, hex tactical game. Six named British paratroopers land behind enemy lines
and sabotage German infrastructure before dawn. It is an engine plus missions: §1–§11
describe the engine through mission 1, the rail bridge in occupied France. How it looks
and sounds (§11) is in `ART-DIRECTION.md`, `ART-CARDS.md` and `ART-PLAY.md`, and mission 2, the airfield (§13), is in
`MISSION-AIRFIELD.md`, where it differs. Mission 3, the aqueduct (§14,
`MISSION-AQUEDUCT.md`), is playable too, picked from the contents page.

This file says how the game works **now**. It keeps no history: when and why each rule
came to be as it is, and the balance numbers each change was measured against, are in
`DECISIONS.md` (before M49, `DECISIONS-ARCHIVE.md`). What comes next is in `ROADMAP.md`.
Turns and actions (§4) are in `TURNS.md`, detection and alert (§6) in `DETECTION.md`,
sabotage (§7) in `SABOTAGE.md` and winning and scoring (§10) in `WINNING.md`, each as
authoritative as this file; the milestones done are in `MILESTONES.md`.

**Design spine — everything serves this:** *every successful sabotage makes the rest of
the mission harder.* Charges have fuse timers, explosions raise the garrison alert,
and alert sends patrols toward your last known position. The order and timing of your
demolitions is the strategy.

**Second pillar — hunter and hunted.** The game became fun once the stick could act
(narrower arcs, the knife, kills that score) rather than spend the mission avoiding
mistakes. The player is both at once. Every turn should offer at least one active move
worth making — a kill, a lure, a charge, a dash — and the garrison should still be
something to fear. Every new threat comes with a verb that answers it, and every active
move pays now and costs later (a body is found, a bang raises the alert, a gunner's turn
is spent): the spine again, in miniature. A new feature should give the player something
to *do*, not only something to *avoid*.

**Players:** single-player. The garrison is not an opponent; it follows the rules in §6,
so the hover readout can show exactly what it will do.

**Feel:** casual to pick up, rewarding to plan. No twitch. No fail-state that arrives
without warning. The player should always be able to see the risk before committing.

---

## 1. Technical constraints

- Vanilla JavaScript (ES modules), HTML, SVG. **No framework. No build step. No npm.**
- **Runs from a static file server, not a bundler.** Browsers block ES modules over
  `file://`, so locally it is served with `./run.sh` (Python's built-in static server,
  nothing to install). It is published by GitHub Pages from `main`. Nothing may require a
  bundler, a package manager, or a Node process. (Node runs only the developer tools:
  the balance bot and the headless tests.)
- **Target: desktop, mouse and keyboard, 1280x800 minimum.** No mobile layout; it only
  needs to *load* on a phone. A window smaller than 1280x760 gets the same spread zoomed
  down to fit, to no less than 75%, rather than a sideways scroll: one layout scaled,
  never a second one.
- All randomness through one seeded RNG (`rng.js`). A seed reproduces a playthrough
  exactly. The seed is shown in the margin, and `?seed=` in the address picks one.
- Rules are pure functions over a state object. Rendering reads state and never mutates it.
- All balance numbers live in `/data/*.json`. Never hardcode a stat in logic.
- Nothing is stored between sessions (no `localStorage`, CLAUDE.md rule 9).

### File layout

```
index.html        the page, its CSS, the loading page
run.sh            local static server
tests.html        every test suite, in the browser
/src
  main.js         bootstrap, game loop, input, the words for cards and rollovers
  state.js        state shape, turn advance, the player's actions
  hex.js          coordinate math (§2)
  map.js          map and terrain load, pathing, line of sight
  units.js        movement, AP, what each action allows
  traits.js       the trait hook system (§5)
  enemy.js        patrols, detection, hearing, alert
  sabotage.js     charges, fuses, explosions, payoffs, reinforcements
  drop.js         drop runs, scatter, supply canisters
  scoring.js      win, withdraw, lose, score
  hints.js        the turn card's hints (§11)
  sight.js        what the board shows of being seen: the danger wash, who is fired on (§4)
  cues.js         what the board points at: who he could strike, get clear, the way out (§4)
  layout.js       data/layout.json: where the things placed by hand sit, and the layout tool's moves
  playtest.js     ?playtest: the moments a new player passes, timed, as plain lines (M49)
  lessons.js      the lesson engine: a course's lessons, steps and what each allows (§15)
  difficulty.js   the difficulty patches (§10)
  missions.js     the missions and their win conditions (§10)
  train.js        the goods train's timetable (§7)
  boat.js         the boat's (§10, §14)
  rng.js
  render/
    board.js      the map, counters, markers, overlays, motion
    roster.js     the roster rail and a man's particulars
    ui.js         the right page, readout, log, cards, fitting the spread
    theme.js      colour tokens, halftone, the sprite registry, supplied art
    sound.js      cues, supplied recordings, made fallbacks, title music
    layout-tool.js  ?layout: drag what is placed by hand, copy data/layout.json
    playtest-panel.js  ?playtest: the record's tab and COPY RECORD
/data
  missions.json   the missions: files, patches, win condition, words, title card (§10)
  map.json        France's map: terrain rows, drop runs, enemies, routes, objectives, exfil, names
  map-airfield.json  the airfield's (§13), in the same shape
  map-aqueduct.json  the aqueduct's (§14)
  map-training.json  the practice ground's (§15)
  lessons-training.json  the training course's lessons (§15)
  terrain.json    terrain types (§3)
  roster.json     the six, their traits and dialogue (§5)
  traits.json     trait definitions (hook + modifier)
  enemies.json    enemy types: vision, arc, speed, killable
  rules.json      everything else: costs, detection, alert, noise, combat, scoring
  difficulty.json the levels, as patches over rules.json and enemies.json
  version.json    the build shown in the margin
  layout.json     where the operator placed things by hand (art only, M48k)
/assets           supplied art, fonts and sound (ART-ASSETS.md); code draws what is missing
/tests            headless suites (node tools/run-tests.mjs)
/tools            balance-bot.mjs, run-tests.mjs, make-chips.js (developer only)
```

---

## 2. Hex coordinates

Pointy-top hexes, **axial coordinates** `(q, r)`. No offset coords anywhere.

Neighbours, in order NW, NE, E, SE, SW, W (pointy-top hexes have no straight north or
south neighbour; facings in data use these names):
`(0,-1) (+1,-1) (+1,0) (0,+1) (-1,+1) (-1,0)`

Axial to pixel (size = hex circumradius):
```
x = size * sqrt(3) * (q + r / 2)
y = size * 3 / 2 * r
```

Distance:
```
dist = (abs(q1-q2) + abs(q1+r1-q2-r2) + abs(r1-r2)) / 2
```

Pathfinding: A* over hex neighbours, cost from the terrain table. Line of sight: hex line
draw with cube-lerp, blocked by any terrain that blocks sight (§3).

The map is **18 wide x 13 tall**, hex size 46px, on the left page of the spread (§11).

---

## 3. Terrain

| Terrain | Move cost | Cover | Blocks sight | Notes |
|---|---|---|---|---|
| Field | 1 | none | no | fully exposed |
| Track | 1 | none | no | exposed, fast |
| Hedgerow | 2 | heavy | yes | the safe artery |
| Wood | 2 | heavy | yes | bad landing |
| Orchard | 1 | light | yes | |
| Marsh | 3 | light | no | bad landing |
| Canal | impassable | — | no | crossed at the bridge or lock, or swum (§4); landing in it wounds |
| Ridge | 2 | light | yes | high ground, +1 spot radius |
| Farmhouse | 1 | heavy | yes | |
| Emplacement | impassable | — | no | enemy position |
| Bridge | 1 | none | no | the rail bridge's deck; canal once destroyed |
| Lock | 1 | light | no | a crossing on foot, meeting only the west bank |
| Fuel dump | impassable | — | yes | the fuel dump objective stands on it |

A hex that blocks sight hides what lies beyond it, never itself: a man in a hedge or on
an orchard's edge is seen as ever; the ground behind him is not.

---

## 4. Turn structure

**In `TURNS.md`**, a file of its own and as authoritative as this one: the turn and its
phases, action points, every action a man can take with its cost and its key, and the
desktop interaction (mouse, hover, keyboard, undo).

---

## 5. The roster — six named characters

The six are the point. The drop scatters them, the map separates them, and losing one by
name is what makes a single mission land emotionally. Build them properly, but build them
**as data**.

### Trait hook system

`traits.js` exposes a fixed, small set of hooks. A trait is a JSON entry naming **one hook**
and **one modifier**. The rules engine calls the hook and applies any matching modifiers.

| Hook | Called when | Modifies |
|---|---|---|
| `onLand` | resolving drop scatter | landing penalty, scatter distance |
| `onActionPoints` | start of player phase | AP pool |
| `onMoveCost` | pathing over a hex | terrain cost |
| `onSpotRadius` | computing what a trooper sees | radius |
| `onDetectionCheck` | an enemy tests this trooper | detection score |
| `onChargeCapacity` | loadout | charges carried |
| `onPlaceCharge` | placing a charge | AP cost, fuse length |
| `onFire` | gunner fires | alert delta |

**Rules of the system, non-negotiable:**
- One trait = one hook = one modifier. No conditional chains, no choices, no usage limits.
- No trait may reference or interact with another trait.
- A trait that cannot be expressed this way becomes flavour text instead. Do not extend
  the hook system to accommodate a single character.

Adding a seventh character is then a JSON entry and a portrait. Each man's roster row
prints his trait and what it does in numbers ("Steady Hands: fuse 3 → 2 turns").

### The six

| # | Name | Role | Trait | Hook | Effect |
|---|---|---|---|---|---|
| 1 | Sgt. Alec "Dutch" Holloway | Sapper | Steady Hands | `onPlaceCharge` | fuse −1 turn |
| 2 | Pte. Ronnie Fitch | Sapper | Quick Work | `onPlaceCharge` | placing costs 0 AP |
| 3 | Cpl. Eddie Vance | Scout | Cat's Eyes | `onDetectionCheck` | 1 harder to spot |
| 4 | Pte. Tom Barrow | Scout | Treetops | `onLand` | ignores bad-landing penalty |
| 5 | Cpl. Stan Speers | Gunner | Cool Head | `onFire` | gunfire alert −1 |
| 6 | Pte. Wilf Nunn | Gunner | Ox | `onChargeCapacity` | +1 charge |

Steady Hands is the one trait that can cost you something: Holloway's charges go off a
turn sooner, which is what you want when dawn is close and exactly what you do not want
when he still has to get clear of the blast (§7). Cat's Eyes makes Vance, already a scout,
the stick's ghost — the man to send over the canal to cut the line. Nunn carrying a
charge means a gunner can finish the job if both sappers are down: that redundancy is
what stops a bad drop from being an unwinnable run.

### Command

Holloway is the ranking man, and that is a mechanic. At the start of each turn every
trooper within **2 hexes** of the leader gets **+1 AP** for that turn, and a trooper
**beside him** gets **+2 AP** instead. A man with +1 wears one leader-blue chevron, a man
with +2 two. The leader does not give the bonus to himself. It is measured when pools are
filled, so walking into the radius mid-turn pays off on the following turn.

This is a **rule in `rules.json` (`command`), not a trait**. Every hook modifies the
trooper who owns the trait; command modifies *other* troopers, conditional on distance,
which the hook system cannot express and must not be extended to cover. The leader is a
`leader` flag on a roster entry, so promoting a different trooper is a one-line data
change and no code knows anyone's name.

While the leader is selected or under the mouse, his radius is outlined, dashed in leader
blue. His roster rollover and his particulars say what he gives the stick: the orders,
how many men have them this turn, and the radio for the RAF diversion.

What it buys the design: the command radius rewards moving as a group, and §6 punishes
moving as a group, because more men sit inside one vision arc. Speed against stealth,
decided every turn. It also makes losing Holloway expensive.

### Roles (the three code behaviours)

| Role | AP | Spot radius | Concealment | Charges | Can |
|---|---|---|---|---|---|
| Sapper | 3 | 2 | 0 | 1 | place charges |
| Scout | 4 | 3 | +1 | 0 | cut the line |
| Gunner | 3 | 2 | 0 | 0 | suppress, kill |

Spot radius matters only to shooting: a gunner's suppress and kill, and anyone's return
fire (§4), which every role has (a ridge adds 1). Charges is what the role jumps with;
any man can carry one he picks up or is handed, 1 AP slower for its weight (§4), and
whoever carries one can set it.

### Wounds

There are no hit-point bars and no dice. What a shot does depends on where he is shot
(`combat` in `rules.json`):

- **In the open or light cover** (field, track, bridge, marsh, orchard, ridge, lock), from
  an enemy within **4 hexes** (`hitRange`): **hit**.
- **In heavy cover** (hedgerow, wood, farmhouse), or from further off than `hitRange`
  whatever the cover: **pinned** — no hit, but his next turn's pool is 1 AP smaller (never
  below 1), and he stays in contact. Getting distance is a way out, and the readout shows
  it before he moves.

A trooper has **two hits**: the first **wounds** him, the second **kills** him. He is
shot **at most once per turn**, however many enemies fire, so there are always at least
two turns between being first spotted and dying, and a man who keeps to heavy cover is
never hit at all, only pinned. If he was seen on several hexes in one move, the shot lands
on the most exposed of them.

A wounded man drops to 1 AP and cannot carry a charge; a charge he was carrying drops on
his hex for anyone to pick up. Another man can stabilise him (§4). Dead is permanent.
A dead trooper, or a dead enemy (§4 Kill), leaves a **body** on his hex, found by enemies
the same way as a parachute (§9): alert +1, once.

### Dialogue

Each character has lines in `roster.json` keyed to `onLand`, `onPlaceCharge` and
`onWounded` (all three required), and may have four more, each optional (a man without
one is silent): `onWoundedCarrying`, said instead of `onWounded` when he is hit still
carrying a charge; `onKill`, after a gunner's kill or anyone's knife; `onSpotted`, the
first time he is seen (not each turn he stays in view, and never on top of a wound: a man
hit says his wounded line); and `onHide`, going to ground. They show as speech bubbles on
the board (§11). This is data and costs nothing mechanically, and it is most of what makes
the six feel like six people.

---

## 6. Detection and alert

**In `DETECTION.md`**, a file of its own and as authoritative as this one: no fog of war,
the detection formula, the alert dial and what each state does, noise (the dial is global,
the reaction local), contact and enemy fire, the exfil watched, and reinforcements.

---

## 7. Sabotage

**In `SABOTAGE.md`**, a file of its own and as authoritative as this one: the objectives and
their charge points, charges and fuses, the time pencils, explosions and the alert they
raise, blasts that set off their neighbours, cutting the line, and what each target pays
back once it is destroyed.

---

## 8. Routes

The map supports **three viable approaches**, each with a distinct cost:

- **Canal towpath** — heavy cover, slow, marsh, but runs directly under the bridge.
- **Hedgerow lanes** — the middle path. Balanced, crosses two patrol routes.
- **Wood and ridge line** — fast and good spotting: the base patrol walks the fields
  south of the fuel dump, not up onto the ridge, but the wood patrol walks the wood.

A **Road patrol** walks the road that runs north–south through the middle of the board,
from the south fields to the north edge and back. A **lane** runs east from the road's
south end to the lock, so a man swimming back near the exfil lands on firm ground; it is
not a crossing (the lock meets only the west bank).

A **Wood patrol** walks up from the field below the fuel dump, through the Bois des
Moines, and east along the north edge, and back: it reaches the landing grounds of the
west and north runs a few turns after the drop, so a parachute left lying there is found.

Eight enemies in all: the bridge post and the base post (sentries), and the bridge,
lanes, village, base, road and wood patrols.

No route reaches all three objectives efficiently. The drop runs are told apart by what
they are good for, one word each (`tag` in `map.json`), shown with the run's name:
**West · QUIET** (under cover the whole way, the longest walk),
**North · STEADY** (soft landings, the most reliable), **East · FAST** (down closest to the
bridge; its description says it is tricky, as it is the hardest run for a first-timer).

---

## 9. The drop

The drop is not a cutscene. It is the first decision, and it is how the player chooses a
route.

Before turn 1 the player picks one of **three drop runs**, each a flight line across the
map with a wind arrow: west over the wood and ridge line, north over the hedgerow lanes,
east from the north edge above La Butte's east side down toward Ferme Lebrun, nearest the
primary. All three land west of the canal, so nobody starts on the wrong side of the
chokepoint. The men jump in roster order along the line. Each lands with **small seeded
scatter**, 1–2 hexes, rarely 3, leaning **downwind**. Nobody lands out of play, on the
exfil, on impassable ground other than the canal, on another man, or within 2 hexes of an
enemy. Landing in Wood or Marsh costs that man his first turn (no AP on turn 1). Landing
in the Canal wounds him, and he drags himself out onto the nearest bank, his parachute
with him.

Scatter stays small. It is texture, not chaos: the plan should survive it, and turn 1 is
always a regroup problem, different every time, never unfair. The player does **not**
choose landing hexes; the run plus the scatter decides.

### Parachutes

Every trooper leaves a **parachute** on the hex he lands in. It is evidence, and what he
does about it is the second decision of turn 1.

- A trooper standing on a parachute can **pack it up for 1 AP**, his own or anyone's, one
  per action.
- A parachute left behind is found when an enemy comes **onto or beside** it during the
  enemy phase — on or beside any hex it walks through, or where it ends its go. Alert
  **+1**, the parachute is removed, and that hex becomes a last known contact. Found once.
- Patrol routes are drawn, so the player can see which parachutes are at risk.

Stealth costs action points, speed costs alert: the design spine on the drop.

### Supply canisters

(`canisters`; null in France and on the airfield, where the men jump with their charges.)
Where a mission gives `{ count, charges, scatterWeights }`, **the men jump with no
charges**, and `count` canisters holding `charges` each leave the aircraft among them:
spread evenly through the stick, the last with the last man, so three among six leave
after the second, the fourth and the sixth. Each scatters as a man does, leaning
downwind, by the canisters' own weights, onto ground a man can stand on: never on a man,
on another canister, in water, on the exfil, or within 2 hexes of an enemy. They are
rolled after the men from the same seed, so a seed lands the men the same way with
canisters or without.

- A canister is **a pile of charges**: a man standing on it takes one with the ordinary
  Pick up (§4), 1 AP, if he has room.
- A man's role still says how many he carries at full pace; one more than that costs him
  1 AP while he carries it (§4), as for any charge he did not jump with.
- It is **evidence until it is empty**. An enemy coming onto or beside it finds it as it
  would a parachute: alert +1, a noise there, once. A found canister stays where it is
  and **keeps its charges**. It cannot be packed; when its last charge is taken it is
  pulled under cover and is gone.
- Its charges count toward what the stick can still do (§10 Withdrawn) like any charge
  left lying.

---

## 10. Win, lose, score

**In `WINNING.md`**, a file of its own and as authoritative as this one: what wins and
loses a mission, withdrawal, the way out on a timetable, the score and its rating, the
missions as data (`missions.json`), the difficulty levels, and the balance baselines the
bot is measured against.

---

## 11. Art direction

**In three files of its own**, as authoritative as this one: `ART-DIRECTION.md`, the
spread, colour, print and type, the board, counters and markers; `ART-CARDS.md`, the
cards; `ART-PLAY.md`, the opening before the drop, the hover readout and the turn log,
motion and feedback, and sound. Read ART-DIRECTION.md, and the other one that covers
it, before touching anything the player sees or hears.

The one rule of it that binds the code's shape: all art is referenced by sprite id through
`theme.js`, rendered as SVG `<symbol>` / `<use>`, with no inline path data in game logic.
A supplied file in `assets/` (ART-ASSETS.md) replaces its drawn sprite with no code
change; what is not supplied is drawn in code.

---

## 12. Milestones

One Claude Code session each; each ends in something playable in the browser and merged
to `main`. Do not start a milestone before the previous one is merged and playable. What
comes after the current milestone is in `ROADMAP.md`.

### Current

**M49e, the aqueduct rebalanced, done:** most of the fall after
M49d's spent charge points was the bot's (a spare man stood on a fresh point and the
carrier waited beside him all night), mended by `PICK=1`; Hard's aqueduct takes four
charges, not five (the operator's pick of the options). Every level inside its target.
Before it, **M49d, the
operator's notes after M49c, done:** a charge point that
has gone off is spent; parachutes under the targets' words; the far bank a man could
swim to dotted on hover; the kill the gunner's burst again; on the aqueduct, men may
wait on the beach before the boat and board it with B once it is in, told so by the
pen, the report, the turn card and a card on its last turn; the aqueduct's map a hex
east, with three woods in its south-west corner. Before it, **M49b, the first playtest's notes, done:** a ✕ on how to play,
◀ CONTENTS on the course's list, a wave on the selected man who could swim now, the
operator's fanfare for a mission accomplished, a lesson step done that adds and takes
nothing away, the goods train coming on time to a bridge blown early and stopping short,
and a blast's dead left as bodies already found. Before it, **M49, the playtest kit,
built; the playtests themselves are the operator's.** With
`?playtest` in the address the game times what a new player does (the first move, the
first charge set, each lesson, every wrong click and whistle by step) and COPY RECORD
gives it as plain lines; `docs/PLAYTEST.md` is the sheet. What they trip on is fixed in
M49b, from the operator's notes. Before it, **M48l**: a knife that is heard was built,
measured and left off; Hard's North run is left under its target, both the operator's
calls (`MISSION-AQUEDUCT.md`, Balance). Before that, M48k, the
layout tool (`?layout`, `data/layout.json`; §11), and **M48, the course** (§15, `MISSION-TRAINING.md`), done: it has all seventeen lessons, the course's list as a two-page spread and the clipboard, umpires with their own counters and cries, and it is
playable from the contents page, flagged START HERE. The ? pages' diagrams are built (M48i, §11). Still open from before: M43 gave the aqueduct (§14) its words, sounds and art hand-off, which
ends Phase 4 as it was planned. What is open is the operator's: the paintings and
recordings still asked for in `ART-PROMPTS.md` (Priorities 21 to 23), the rewording of its
placeholder copy, and Hard's North run, well under its target, which wants that corner
of the map redrawn together (`MISSION-AQUEDUCT.md`, Balance). v1.0 is tagged.

### Done

The table of milestones finished is in `MILESTONES.md`. Each is recorded in full in
`DECISIONS.md` (before M49, `DECISIONS-ARCHIVE.md`) and the git history.

---

## 13. Mission 2 — the airfield

**In `MISSION-AIRFIELD.md`**, a file of its own and as authoritative as this one: the
mission, its ground, map, garrison and objectives, its numbers for the two rules of §7
(time pencils and a blast that sets off its neighbours), its own clean run, its words,
sounds and pictures, and its balance baselines.

Each mission after the first has a file like it (`MISSION-<NAME>.md`), written before the
mission is built, and this spec gains only the engine rules the mission needs.

---

## 15. The training mission — the practice ground

**In `MISSION-TRAINING.md`**: a course of lessons at a parachute school in England, and
the lesson engine that runs it. The engine is built and the course, all seventeen lessons, is playable from the contents page, where it is first and flagged START HERE.

---

## 14. Mission 3 — the aqueduct

**In `MISSION-AQUEDUCT.md`**, playable from the contents page and balanced at M42:
southern Italy, February 1941.
One big target that takes four charges, every charge down in a supply canister, and a
boat that is in on turn 15 for three turns, or sooner if a man signals it. Its two rules are engine
rules, written above: supply canisters (§9) and the way out on a timetable (§10).
