# NIGHT DROP — Specification

A single-level, turn-based, hex tactical game. Six named British paratroopers land in
occupied France and sabotage German infrastructure before dawn.

**Design spine — everything serves this:** *every successful sabotage makes the rest of
the mission harder.* Charges have fuse timers, explosions raise the garrison alert,
and alert sends patrols toward your last known position. The order and timing of your
demolitions is the strategy.

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

Neighbours, in order N, NE, SE, S, SW, NW:
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
3. **Enemy phase** — patrols move along routes, or toward last known contact if alerted.
4. **Fuse phase** — fuse timers tick down; charges at zero detonate.
5. **Alert decay** — see §6.

Unused AP is not banked.

### Desktop interaction (this matters more than it sounds)

Hover is a first-class mechanic, not a nicety. It is what makes the game readable enough
to be casual while still being strategic.

- **Hover a hex** with a trooper selected: draw the path, show total AP cost, and show a
  detection risk readout for every hex on that path. The player commits only on click.
- **Hover an enemy**: highlight its vision arc and its patrol route.
- **Hover an objective**: show what it needs (charges, fuse, blast radius).
- **Right-click**: deselect / cancel.
- **Keyboard**: `1`–`6` select trooper, `Tab` cycle, `Space` end turn, `Esc` cancel,
  `H` hold position, `R` toggle patrol-route overlay.

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

### The six

Names are placeholders and will be replaced.

| # | Name | Role | Trait | Hook | Effect |
|---|---|---|---|---|---|
| 1 | Sgt. Alec "Dutch" Holloway | Sapper | Steady Hands | `onPlaceCharge` | fuse ±1 turn, player's choice |
| 2 | Pte. Ronnie Fitch | Sapper | Quick Work | `onPlaceCharge` | placing costs 0 AP |
| 3 | Cpl. Eddie Vance | Scout | Cat's Eyes | `onSpotRadius` | +1 |
| 4 | Pte. Tom Barrow | Scout | Treetops | `onLand` | ignores bad-landing penalty |
| 5 | Cpl. Stan Speers | Gunner | Cool Head | `onFire` | no alert rise, once per mission |
| 6 | Pte. Wilf Nunn | Gunner | Ox | `onChargeCapacity` | +1 charge |

Holloway is the ranking man. That is flavour, not a mechanic: he has no leadership
rule, because a leadership rule would have to be a trait on an existing hook like
anything else. His counter is drawn differently so the player can find him.

Nunn carrying a charge means a gunner can finish the job if both sappers are down. That
redundancy is deliberate — it is what stops a bad drop from being an unwinnable run.

### Roles (the three code behaviours)

- **Sapper** — 2 AP. Places and sets charges. Carries 1 charge.
- **Scout** — 3 AP. Spot radius 3. Detection against him reduced one step. No charges.
- **Gunner** — 2 AP. Can suppress a visible enemy: it loses its next move. Firing is loud,
  +2 alert. No charges (unless Ox).

Wounded troopers drop to 1 AP and cannot carry a charge. Another trooper can spend a full
turn adjacent to stabilise them. Dead is permanent — there is one mission, and that is it.

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

| State | Effect |
|---|---|
| **Calm** | Patrols walk fixed routes. |
| **Suspicious** | Patrols pause and sweep. Vision radius +1. |
| **Alarmed** | Nearest two patrols converge on last known contact. Vision +1. |
| **Stand-To** | All patrols hunt. A reserve squad enters from the road edge. Exfil watched. |

Raised by: being spotted (+1), gunfire (+2), an explosion (+2), a body found (+1),
an abandoned parachute found (+1, see §9).
Decays one step after 4 quiet turns. Never decays below Suspicious once an explosion
has gone off.

---

## 7. Sabotage

Three objectives, each on a different approach:

1. **Rail bridge over the canal** (PRIMARY) — 2 charges, on separate hexes.
2. **Telephone exchange, village** (secondary) — 1 charge, or a Scout can cut the line
   silently: slower, raises no alert.
3. **Fuel dump and tank laager** (secondary) — 1 charge. Largest blast, +3 alert.

Placing a charge costs 1 AP and sets a 3-turn fuse by default. Charges can be placed and
left. A trooper inside the blast radius at detonation dies.

The spine in practice: blow the fuel dump first and the bridge approach becomes a hunt.
Blow the bridge last and you may not have turns left to reach exfil.

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
lands nearest. Each trooper then lands with **small seeded scatter**, 1–2 hexes, rarely 3.
Landing in Wood or Marsh costs that trooper their first turn. Landing in Canal wounds them.

Scatter stays small. It is texture, not chaos. The player's plan should survive it.

Turn 1 is therefore always a regroup problem, different every time, never unfair.

### Parachutes

Every trooper leaves a **parachute** on the hex he lands in. It is evidence, and what he
does about it is the second decision of turn 1.

- A trooper standing on his own parachute can **pack it up for 1 AP**, removing it. Only
  his own, only from that hex. He cannot go back for someone else's.
- A parachute left behind is found when an enemy moves **onto or adjacent to** it during
  the enemy phase: alert **+1**, the parachute is removed, and that hex becomes a last
  known contact for the Alarmed behaviour in §6. Found once, never again.
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

**Win:** primary destroyed AND at least 3 troopers reach an exfil hex by turn 20.
**Lose:** primary intact at dawn, or fewer than 3 out.

Results page, styled as the back page of the annual, listing all six by name and fate:

- Objectives destroyed (primary 3, each secondary 2)
- Troopers exfiltrated (1 each)
- Turns remaining (1 per 2 turns)
- Never reached Stand-To (+3)

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
  cold blue `#3D5A73`. Nothing else.
- Deliberate 0.5px colour misregistration on fills against their ink outlines.
- Units are **counters**: rounded squares, drop shadow, symbol, name strip. They snap down
  with a 2-frame stepped rotation. No smooth easing anywhere — stepped animation reads as
  hand-made.
- Speech bubbles for dialogue, hand-lettered feel, tail pointing at the counter.
- Condensed slab display face for headings, system stack fallback.
- "CUT OUT AND PLAY" margin note in the outer gutter.

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
| **M5** | Charges, fuses, explosions, win/lose, exfil | A full mission can be won and lost |
| **M6** | Drop phase and parachutes | Three drop runs, seeded scatter, regroup turn works; parachutes drop with the men, cost 1 AP to pack up, and raise alert when a patrol finds one |
| **M7** | Art pass: spread layout, roster rail, halftone, counters, speech bubbles | It looks like the annual |
| **M8** | Balance pass | Winnable roughly 1 in 3 by a thoughtful first-timer |

Do not start a milestone before the previous one is merged and playable.
