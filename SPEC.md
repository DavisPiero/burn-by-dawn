# NIGHT DROP — Specification

A single-level, turn-based, hex tactical game. Six named British paratroopers land in
occupied France and sabotage German infrastructure before dawn.

**Design spine — everything serves this:** *every successful sabotage makes the rest of
the mission harder.* Charges have fuse timers, explosions raise the garrison alert,
and alert sends patrols toward your last known position. The order and timing of your
demolitions is the strategy.

**Players:** single-player. The garrison is not an opponent; it follows the rules in §6,
so the hover readout can show exactly what it will do.

**Feel:** casual to pick up, rewarding to plan. No twitch. No fail-state that arrives
without warning. The player should always be able to see the risk before committing.

---

## 1. Technical constraints

- Vanilla JavaScript (ES modules), HTML, SVG. **No framework. No build step. No npm.**
- **Runs from a static file server, not a bundler.** Because the game uses ES modules,
  browsers block it over `file://`. Locally it is served with `./run.sh` (Python's built-in
  static server, nothing to install). In production it is served by GitHub Pages, if used.
  Nothing may require a bundler, a package manager, or a Node process.
- **Target: desktop, mouse and keyboard, 1280x800 minimum.** Do not build a mobile layout.
  It only needs to *load* on a phone so progress can be glanced at; it does not need to be
  playable there.
- Deployed via GitHub Pages.
- All randomness through one seeded RNG (`rng.js`). A seed reproduces a playthrough
  exactly. Seed is visible in the UI for debugging.
- Rules are pure functions over a state object. Rendering reads state and never mutates it.
- All balance numbers live in `/data/*.json`. Never hardcode a stat in logic.

### File layout

```
index.html
run.sh            local static server, see §1
/src
  main.js         bootstrap, game loop, input
  state.js        state shape, turn advance, save/load
  hex.js          coordinate math (see §2)
  map.js          terrain load, pathing, line of sight
  units.js        movement, actions
  traits.js       the trait hook system (see §5)
  enemy.js        patrols, detection, alert escalation
  sabotage.js     charges, fuses, explosions
  drop.js         drop run selection, scatter
  scoring.js      win/lose, medal rating
  render/
    board.js      hex grid, terrain, counters
    roster.js     the six portraits, status, speech bubbles
    ui.js         briefing panel, alert dial, turn counter
    theme.js      colour tokens, halftone patterns, sprite registry
  rng.js
/data
  map.json        terrain grid + objectives + patrol routes
  roster.json     the six characters, traits, dialogue (§5)
  traits.json     trait definitions (hook + modifier)
  enemies.json    enemy types, vision, speed
  rules.json      turn limit, action costs, detection thresholds
/assets           SVG sprites (procedural at first, hand-drawn later)
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

Pathfinding: A* over hex neighbours, cost from terrain table. Line of sight: hex line
draw with cube-lerp, blocked by Wood, Farmhouse, Ridge.

Map is **18 wide x 13 tall**, hex size 46px. That is roughly 1470x900 of board, sitting on
the left page of the spread (§11).

---

## 3. Terrain

| Terrain | Move cost | Cover | LOS blocking | Notes |
|---|---|---|---|---|
| Field | 1 | none | no | fully exposed |
| Track | 1 | none | no | exposed, fast |
| Hedgerow | 2 | heavy | no | the safe artery |
| Wood | 2 | heavy | yes | bad landing |
| Orchard | 1 | light | no | |
| Marsh | 3 | light | no | bad landing |
| Canal | impassable | — | no | crossable only at bridge/lock |
| Ridge | 2 | light | yes | high ground, +1 spot radius |
| Farmhouse | 1 | heavy | yes | may be occupied |
| Emplacement | impassable | — | no | enemy position |

---

## 4. Turn structure

Dawn arrives on **turn 20**. That is the clock and the whole pressure.

Each turn:
1. **Player phase** — each trooper has an AP pool. Move (terrain cost) or act (place
   charge, cut wire, suppress, hide, stabilise a casualty).
2. **Detection check** — every enemy tests line of sight against every visible trooper.
   A trooper already in contact who is spotted again is fired on (§6).
3. **Enemy phase** — patrols move along routes, toward a noise they heard, or toward
   last known contact if alerted. An enemy holding contact stays put and faces its man.
4. **Fuse phase** — fuse timers tick down; charges at zero detonate.
5. **Alert decay** — see §6.

Unused AP is not banked.

### Actions

All costs and modifiers below are numbers in `rules.json`.

- **Hide ("go to ground")** — costs **1 AP and ends the trooper's turn**; any AP left is
  lost. He gets **+1 concealment** on the hex he is on — a hiding man is as hard to see as
  a scout, a hiding scout harder still. It protects only the hex he stops on: hexes he
  walked through earlier that turn are tested without it. It lasts until he next spends
  AP, so a man who stays down (`H`) stays hidden for free. A hidden trooper is marked on
  his counter.
- **Suppress** (gunner only) — costs **2 AP**, leaving one step to get back into cover.
  The target must be a **visible enemy: within the gunner's spot radius, with a clear
  line of sight** (troopers have no facing arc). A suppressed enemy **does not fire at the
  next detection check and does not move in the next enemy phase**; it can still spot.
  Firing is gunfire: +2 alert (§6), and it is heard (§6).
- **Stabilise** — another trooper spends a full turn adjacent to a wounded man (§5). The
  wounded man gets his **full AP pool back and can carry a charge again**, but the hit is
  not undone: he is still one hit from death. The wound is dressed, not healed.
- **Pick up a charge** — 1 AP, standing on a hex with a dropped charge (§5), if he can
  carry one.
- **Throw a stone** (any trooper) — costs **1 AP**. Pick a hex **up to 3 away**; no line
  of sight needed, it is lobbed. It is a noise event on that hex (§6): **alert +1**, and
  enemies in earshot react to it — patrols go and look, sentries turn to face it. The
  trade is deliberate: you choose where they look, and you pay a sighting's worth of alert
  for it. The hover readout shows which enemies would hear it before the player commits.
- **Place a charge** (anyone carrying one) — costs **1 AP** (the `onPlaceCharge` hook may
  change it), standing on a charge hex of an objective that still needs charges (§7). One
  charge per charge hex.
- **Cut the line** (scout only) — a **full turn**, like stabilise: he must not have spent
  any AP yet, and it costs his whole pool. Standing on a telephone exchange charge hex,
  he destroys the exchange at once, silently: no alert, no noise (§7).
- **Swim** (once the rail bridge is destroyed) — a **full turn**. From a hex beside the
  canal, straight across one canal hex, to the bank opposite. A wounded man cannot swim.
  He cannot hide as he comes out, and is tested on the far bank like any hex he enters. It exists so a man
  is never stranded by his own demolition; while the bridge stands it is the only way
  over, so the chokepoint still matters.
- **RAF diversion** (once per mission, while the leader is alive) — costs **no AP**, called
  at any point in the player phase. A diversionary raid on the town pulls the garrison's
  attention: the **alert drops one state** (to the start of the state below), **every
  enemy abandons its search or held contact** and goes back to its route or post, and
  **every trooper is out of contact**. It does not undo wounds, deaths, bodies already
  found, or the explosion floor (§6). The leader carries the radio, so it is gone if he
  is dead; that is a rule keyed to the `leader` flag, not a trait (§5 Command). Calling it
  forfeits the "never reached Alarmed" score (§10): a clean run still scores highest.

### Desktop interaction (this matters more than it sounds)

Hover is a first-class mechanic, not a nicety. It is what makes the game readable enough
to be casual while still being strategic.

- **Hover a hex** with a trooper selected: draw the path, show total AP cost, and show a
  detection risk readout for every hex on that path. The player commits only on click.
- **Hover an enemy**: highlight its vision arc and its patrol route.
- **Hover an objective**: show what it needs (charges, fuse, blast radius).
- **Right-click**: deselect / cancel.
- **Keyboard**: `1`–`6` select trooper, `Tab` cycle, `Space` end turn, `Esc` cancel,
  `H` hold position, `R` toggle patrol-route overlay. Actions: `G` hide (go to ground),
  `S` suppress, `T` throw a stone, `A` stabilise (aid), `P` pick up a charge, `C` place a
  charge, `X` cut the line, `W` swim, `D` RAF diversion. An action
  with a target outlines where it can go and waits for a click; `Esc` backs out of it.

---

## 5. The roster — six named characters

The six are the point. The drop scatters them, the map separates them, and losing one by
name is what makes a single level land emotionally. Build them properly, but build them
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
- One trait = one hook = one modifier. No conditional chains.
- No trait may reference or interact with another trait.
- A trait that cannot be expressed this way becomes flavour text instead. Do not extend
  the hook system to accommodate a single character.

Adding a seventh character is then a JSON entry and a portrait.

Steady Hands was first written as "fuse ±1 turn, player's choice". A choice is not a
modifier, so that could not be a trait under the rules above. It is now a fixed **fuse
−1**, which makes it the one trait that can cost you something: Holloway's charges go off
a turn sooner, which is what you want when dawn is close and exactly what you do not want
when you still have to get clear of the blast (§7). That he is also the leader (below)
sharpens it further. That tension is deliberate; if it plays badly, the lever is the sign,
not the hook.

Cool Head was first written as "no alert rise, once per mission". A usage limit is a
condition, not a modifier, so it could not be a trait either. It is now a flat **−1 to the
alert his gunfire raises**, every time: +1 instead of +2 at the current numbers.

### The six

Names are placeholders and will be replaced.

| # | Name | Role | Trait | Hook | Effect |
|---|---|---|---|---|---|
| 1 | Sgt. Alec "Dutch" Holloway | Sapper | Steady Hands | `onPlaceCharge` | fuse −1 turn |
| 2 | Pte. Ronnie Fitch | Sapper | Quick Work | `onPlaceCharge` | placing costs 0 AP |
| 3 | Cpl. Eddie Vance | Scout | Cat's Eyes | `onSpotRadius` | +1 |
| 4 | Pte. Tom Barrow | Scout | Treetops | `onLand` | ignores bad-landing penalty |
| 5 | Cpl. Stan Speers | Gunner | Cool Head | `onFire` | gunfire alert −1 |
| 6 | Pte. Wilf Nunn | Gunner | Ox | `onChargeCapacity` | +1 charge |

### Command

Holloway is the ranking man, and that is a mechanic. At the start of each turn, every
trooper within **2 hexes** of the leader gets **+1 AP** for that turn: he has been given
his orders. The leader does not give the bonus to himself.

It is measured when pools are filled, so walking into the leader's radius mid-turn pays
off on the following turn, not the current one.

This is a **rule in `rules.json`, not a trait**, and that distinction matters. Every hook
in the table above modifies the trooper who owns the trait. Command modifies *other*
troopers, conditional on their distance from him, which the hook system cannot express
and must not be extended to cover. The leader is a `leader` flag on a roster entry, so
promoting a different trooper is a one-line data change and no code knows anyone's name.

What it buys the design: the command radius rewards moving as a group, and §6 punishes
moving as a group, because more men sit inside one vision arc. Speed against stealth,
decided every turn. It also makes losing Holloway expensive, which is the point of §5.

Nunn carrying a charge means a gunner can finish the job if both sappers are down. That
redundancy is deliberate — it is what stops a bad drop from being an unwinnable run.

### Roles (the three code behaviours)

- **Sapper** — 3 AP. Places and sets charges. Carries 1 charge.
- **Scout** — 4 AP. Spot radius 3. Detection against him reduced one step. No charges.
- **Gunner** — 3 AP. Can suppress a visible enemy (§4 Actions): it neither fires nor
  moves on its next go. Firing is loud, +2 alert. No charges (unless Ox).

### Wounds

There are no hit-point bars and no dice. What a shot does depends on the cover of the hex
he is shot on (`combat.shotResult` in `rules.json`):

| Cover where he is shot | Result |
|---|---|
| none (field, track, bridge) | **Hit** |
| light or heavy | **Pinned** — no hit, but his next turn's pool is 1 AP smaller (never below 1), and he stays in contact |

A trooper has **two hits** (`hitsToKill`): the first **wounds** him, the second **kills**
him. A trooper is shot **at most once per turn**, however many enemies fire, so there are
always at least two turns between being first spotted and dying — and a man who keeps to
cover is never hit at all, only pinned. If he was seen on several hexes in one move, the
shot lands on the most exposed of the hexes where he would be shot.

Wounded troopers drop to 1 AP and cannot carry a charge; a charge he was carrying drops
on his hex for anyone to pick up (§4 Actions). Another trooper can spend a full turn
adjacent to stabilise him (§4 Actions). Dead is permanent — there is one mission, and that
is it. A dead trooper leaves a **body** on his hex, found by enemies the same way as a
parachute (§9): alert +1, once.

### Dialogue

Each character has 3 lines in `roster.json`, keyed to `onLand`, `onPlaceCharge`,
`onWounded`. They render as comic speech bubbles on the board (§11). This is data and
costs nothing mechanically, and it is most of what makes the six feel like six people.

---

## 6. Detection and alert

There is **no fog of war.** Enemies are always drawn. The hidden resource is alert.

Each enemy has a vision radius and a facing arc (120°). A trooper inside it is tested:

```
detection = base(enemy) - cover(terrain) - concealment(trooper) + proximity bonus
```

Compare against a threshold in `rules.json`. Surface this maths in the hover readout as
pips. The player must see risk before committing.

**Garrison alert has four states**, global, shown as a dial on the right page:

| State | From | Effect |
|---|---|---|
| **Calm** | 0 | Patrols walk fixed routes. |
| **Suspicious** | 2 | Patrols pause and sweep. Vision radius +1. |
| **Alert** | 4 | Vision +1. Hearing +1: noise draws enemies from further away. |
| **Alarmed** | 7 | All patrols hunt last known contact. A reserve squad enters from the road edge and watches exfil. |

The alert level is a **points total**; "From" is the points at which each state begins, and points
cap at Alarmed. One event is not a whole state: a single sighting leaves the garrison
Calm, a second makes it Suspicious.

Raised by: being spotted (+1, and only when he was not already in contact — a man already
counted is not counted again each turn he stays in view), gunfire (+2), an explosion (+3), the fuel dump exploding
(+4, instead of +3), a body found (+1), an abandoned parachute found (+1, see §9), a
thrown stone (+1, §4 Actions).
Enemy fire at troopers raises nothing extra — the sighting that caused it already counted.

**Decay:** after 4 quiet turns (no alert raised and nobody spotted) the points drop to the start of the
state below; in Calm, to 0.

**Explosion floor:** once any charge has exploded, the alert never decays below
Suspicious again. After the first bang the garrison never fully settles.

What this does to a run: the bridge alone leaves the garrison Suspicious; the bridge
plus a silently cut telephone line still does; the bridge plus the fuel dump is Alarmed.

### Noise: the dial is global, the reaction is local

Every **noise** happens at a hex and is **heard within a radius** set in `rules.json`
(starting numbers: parachute or body found 3, thrown stone 3, gunfire 5, explosion 7),
plus the current state's hearing bonus. **A sighting is not a noise**: the enemies that
spot a man hold and face him (below), but nobody else comes running unless something is
heard. Hearing is distance
only; walls do not stop sound. Enemies that hear it leave their route, walk to that hex,
sweep, and go back to their route. Enemies out of earshot keep walking; they feel only
the dial.

**Sentries cannot leave their post.** A sentry that hears a noise turns to face it in the
enemy phase instead, and holds that facing through the next player phase and detection
check; in the enemy phase after that it turns back to its facing in `map.json`. So a stone
thrown on turn N opens the ground the sentry was watching for turn N+1. The turned facing
is drawn like any other, so the gap is visible.

The most recent noise hex, or the hex of a first sighting, is the **last known contact**
that every patrol hunts at Alarmed. Seeing a man who is already in contact again does not
move it.

**A repeat is not a new contact.** An event on a hex that enemies are already heading to
or searching updates that contact instead of starting a new one: nobody new sets off, the
search is not restarted, and the turn report says it once.

### Contact and enemy fire

Being spotted is a warning, not a wound:

1. **Detection check, turn N** — an enemy spots a trooper. The alert rises by 1. The trooper is
   **in contact** and wears the spotted marker. In the enemy phase, every enemy that
   spotted him **stays put and turns to face him**, so the player can see exactly who
   has him.
2. **Player phase, turn N+1** — he has one turn to break contact: get out of sight, hide,
   or have a gunner suppress whoever is watching (§4 Actions).
3. **Detection check, turn N+1** — if any enemy spots him again (the same sum and
   threshold, no dice), **he is shot**: hit in the open, pinned in cover (§5 Wounds). The
   alert does not rise again for him. A suppressed enemy does not fire. If nobody spots
   him, contact ends.

The hover readout marks every path hex where a man in contact would be shot, and whether
it would hit or pin him there, so being fired on is never a surprise.

### Exfil watched

At Alarmed the reserve squad does not hunt. It enters from the road edge, marches to a
guard hex set in `map.json` beside the exfil, and stands there as a sentry facing the exfil
hexes. It is drawn, so the player can see the exit narrowing and route around it.

---

## 7. Sabotage

Three objectives, each on a different approach:

1. **Rail bridge over the canal** (PRIMARY) — 2 charges, on separate hexes. The charges
   go on the **piers, placed from the west canal bank beside the bridge**, not on the deck:
   the towpath runs directly under it (§8). The deck and the east bank are in the bridge
   post's view every turn; the west bank is watched only some turns, so the skill is
   timing, not luck. **A destroyed bridge is gone**: its hexes become canal, and the only
   way over is to swim (§4 Actions).
2. **Telephone exchange, village** (secondary) — 1 charge, or a Scout can cut the line
   silently: a full turn instead of 1 AP, and it raises no alert (§4 Actions).
3. **Fuel dump and tank laager** (secondary) — 1 charge. Largest blast, +4 alert. The dump
   stands on the fields below the ridge, near the patrol base (§8).

Every objective lists its **charge hexes** in `map.json`: the hexes a trooper must stand
on to place a charge on it. Hovering an objective highlights them (§4). Charges needed,
blast radius and alert are per kind of objective in `rules.json`.

Placing a charge costs 1 AP and sets a 3-turn fuse by default. The fuse burns down in
every fuse phase, including the one at the end of the turn it was placed, and the charge
goes off when it reaches 0: a 3-turn charge placed on turn N goes off at the end of turn
N+2. Charges can be placed and left. An objective is destroyed once as many of its charges
have gone off as it needs, in the same turn or not. A trooper inside the blast radius of a
charge at detonation dies, wounded or not — hits (§5) do not apply — and the hover path
warns of it. Enemies are not harmed by blasts: nothing in the game kills an enemy.

**One objective, one explosion:** charges on the same objective that detonate in the same
fuse phase are one explosion — the alert rises once and the noise is heard once. Charges
that go off in different turns are separate explosions, each raising the alert. Timing the
bridge's two fuses together is therefore worth a whole alert step.

The spine in practice: blow the fuel dump first and the bridge approach becomes a hunt.
Blow the bridge last and you may not have turns left to reach exfil.

**Only the primary is needed to win (§10).** The secondaries are worth score and cost
alert, and nothing else. The panel labels them "optional, +2" so they do not read as a
checklist.

**To consider at M8 — secondary payoffs.** As written, a secondary makes the mission harder
and gives nothing back in play, so §8's "choosing which secondary objective is realistic"
has little pull. Candidates, to be tested in the balance pass rather than built earlier:
cutting or blowing the exchange delays or cancels the reserve squad (§6); blowing the fuel
dump takes a patrol off the board (the tank laager crew go to fight the fire). Each would be a
per-kind entry in `rules.json`, never a code branch for one objective.

---

## 8. Routes

The map must support **three genuinely viable approaches**, each with a distinct cost:

- **Canal towpath** — heavy cover, slow, marsh, but runs directly under the bridge.
- **Hedgerow lanes** — the middle path. Balanced, crosses two patrol routes.
- **Wood and ridge line** — fast and good spotting, but passes the patrol base.

No route reaches all three objectives efficiently. Choosing one is choosing which
secondary objective is realistic.

---

## 9. The drop

The drop is not a cutscene. It is the first decision, and it is how the player chooses a route.

Before turn 1, the player picks one of **three drop runs** (north, east, west), drawn as a
flight line across the map with a wind arrow. The run decides which corridor the stick
lands nearest: west on the wood and ridge line, north on the hedgerow lanes, east on the
canal towpath above the bridge. All three land west of the canal, so nobody starts on the
wrong side of the chokepoint. The men jump in roster order along the flight line. Each
trooper then lands with **small seeded scatter**, 1–2 hexes, rarely 3, leaning **downwind**.
Nobody lands out of play, on the exfil, on impassable ground other than the canal, on
another man, or within 2 hexes of an enemy.
Landing in Wood or Marsh costs that trooper their first turn: he has no AP on turn 1.
Landing in Canal wounds them, and he drags himself out onto the nearest bank, where his
parachute ends up with him.

Scatter stays small. It is texture, not chaos. The player's plan should survive it.

Turn 1 is therefore always a regroup problem, different every time, never unfair.

### Parachutes

Every trooper leaves a **parachute** on the hex he lands in. It is evidence, and what he
does about it is the second decision of turn 1.

- A trooper standing on his own parachute can **pack it up for 1 AP**, removing it. Only
  his own, only from that hex. He cannot go back for someone else's.
- A parachute left behind is found when an enemy comes **onto or adjacent to** it during
  the enemy phase — on or beside any hex it walks through, or where it ends its go. Alert **+1**,
  the parachute is removed, and that hex becomes a last known contact (§6). Found once,
  never again.
- Patrol routes are drawn, so the player can see which parachutes are actually at risk
  before deciding. This is a visible cost, not a hidden one.

That is the whole mechanic: stealth costs action points, speed costs alert. It puts the
design spine — *your own actions make the rest of the mission harder* — on the drop, which
is otherwise the one part of the mission with no consequences attached.

The player does **not** choose landing hexes. The drop run plus scatter decides where the
men and their parachutes end up; choosing both would remove the scatter, and the scatter is
what makes turn 1 different every time.

---

## 10. Win, lose, score

Every mission ends in one of three outcomes:

- **Success:** primary destroyed AND at least 3 troopers reach an exfil hex by turn 20.
- **Withdrawn:** the mission can no longer succeed, but the stick is not wiped out —
  fewer than 3 men are still alive or already out, or there are not enough charges left
  anywhere (carried, dropped or set) to finish the primary. Also: nobody is left on the
  board and the primary is intact. The mission ends at once: every man still on the board
  gets out, then any charges still burning go off (they can still finish an objective).
- **Failed:** dawn arrives (the end of turn 20) without success, or every man is dead.
  A man still on the board at dawn is left behind and does not count as out.

The mission also ends when nobody is left on the board (all out or dead), after any
charges still burning have gone off.

**Exfil** is a short run of hexes on the **south map edge**, listed in `map.json`, away
from all three drop runs (north, east, west — §9). A trooper who ends a move on an exfil
hex is out: removed from the board, safe, and counted. At Alarmed the reserve squad
watches it (§6).

Results page, styled as the back page of the annual, listing all six by name and fate
(out, killed, left behind), and the score, whatever the outcome:

- Objectives destroyed (primary 3, each secondary 2)
- Troopers exfiltrated (1 each)
- Turns remaining (1 per 2 turns)
- Never reached Alarmed and never called the RAF diversion (+3)

---

## 11. Art direction

**The reference is a board game printed in an 80s British comic annual.** Cheap paper,
limited spot colours, slight misregistration, die-cut counters.

Desktop makes the skeuomorphism work properly, so use the room:

- The whole game is a **double-page spread**. Board on the left page. Right page carries
  the mission briefing in caption boxes, the alert dial, the turn counter, and the
  **roster rail: all six portraits, always visible**, greying out as men are lost.
- Paper cream ground, fibre texture, centre-fold crease and gutter shadow between pages.
- Ben-Day halftone dots for all tonal fill, as SVG `<pattern>` defs.
- Palette: paper `#F2E8D5`, ink `#1A1A18`, army green `#5C6B4A`, danger red `#C1272D`,
  cold blue `#3D5A73`, and one reserved colour, leader blue `#2F7BBF`, used only to mark
  the ranking man (his counter's name strip and rank flash, his number on the roster).
  Nothing else.
- Deliberate 0.5px colour misregistration on fills against their ink outlines.
- Units are **counters**: rounded squares, drop shadow, symbol, name strip. They snap down
  with a 2-frame stepped rotation. No smooth easing anywhere — stepped animation reads as
  hand-made.
- Speech bubbles for dialogue on the board, tail pointing at the man's counter. Dialogue
  stays on the board, not in the roster rail.
- **Type is not comic lettering.** The annual look comes from the print, paper and colour.
  Text on the right page is a typewriter face, a Courier (`Courier 10 Pitch`, then
  `Courier New`, `Courier`, `monospace`), so it reads as a typed briefing; speech bubbles
  use it too. A condensed slab may still set big headings. Pin the board's label face
  rather than leaving it to the browser's default monospace.
- A **church** with a spire in the village, as art on an existing farmhouse hex: no rule,
  no new terrain. It is the landmark Vance's landing line refers to, and spires were how
  real sticks checked they had been dropped in the right place.
- "CUT OUT AND PLAY" margin note in the outer gutter.

**Right page layout (notes for M7, from the operator's review of M6).** The panel is too
busy and the roster runs off the bottom at 1280x800. At M7:

- The turn counter, End turn and the selected man's actions stay on the right page, in a
  fixed strip at its top. They do not move to the left page.
- The roster rail fits at 1280x800 without scrolling: six compact slots.
- Detail moves into rollover popups: the drop-run descriptions (on the run's button and
  its flight line), the keyboard list, the alert thresholds (on the dial), and the terrain
  legend (on hex hover, folded into the readout). The legend row under the board and the
  coordinates printed on every hex are build scaffolding and go.
- The hover readout (§4) stays always visible; it is the risk display, not detail.

**Architecture requirement:** all art is referenced by sprite id through `theme.js`,
rendered as SVG `<symbol>` / `<use>`. Procedural shapes now, hand-drawn SVG later, swapped
by changing one registry file and nothing else. No inline path data in game logic.

---

## 12. Milestones

One Claude Code session each. Each must end in something playable in the browser.

| # | Goal | Done when |
|---|---|---|
| **M0** | Repo, `index.html`, hex grid renders, click selects a hex | 18x13 grid draws, selected hex highlights, coords shown |
| **M1** | Terrain from `map.json` | Editing the JSON changes the map with no code change |
| **M2** | Units, selection, movement, AP, end turn, hover path preview | Six counters move, hover shows path and cost, turn counter reaches 20 |
| **M3** | Trait hook system + the six characters loaded from `roster.json` | All six traits fire; adding a 7th character needs no code |
| **M4** | Enemies, patrol routes, vision arcs, alert dial, detection readout on hover | Patrols walk, arcs draw, hover shows risk pips |
| **M5a** | Contact and combat: enemy fire, wounds and death, bodies, hide, suppress, stabilise, noise and hearing, repeat sightings folded into the open contact, throw a stone | A spotted man can break contact or be shot; two hits kill; hide and suppress change the readout; noise draws only enemies in earshot; a man seen on the same hex turn after turn is searched and reported once; a thrown stone turns the bridge post away for a turn |
| **M5b** | Charges, fuses, explosions, explosion floor, charge hexes per objective (bridge charges from the banks), win/lose, exfil, exfil watched by the reserve, RAF diversion | A full mission can be won and lost; the bridge can be charged without being spotted by timing the patrols; the diversion can be called once, only while the leader lives, and costs the clean-run score |
| **M6** | Drop phase and parachutes | Three drop runs, seeded scatter, regroup turn works; parachutes drop with the men, cost 1 AP to pack up, and raise alert when a patrol finds one |
| **M7** | Art pass: spread layout, roster rail, halftone, counters, speech bubbles | It looks like the annual |
| **M8** | Balance pass | Winnable roughly 1 in 3 by a thoughtful first-timer |

Do not start a milestone before the previous one is merged and playable.
