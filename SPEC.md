# BURN BY DAWN — Specification

The game is called **Burn by Dawn**. *Night Drop* was its working title, and the repo,
branch history and some internal ids (`night-drop-ready`) keep that name.

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
  playable there. A window smaller than 1280x760 (a Chromebook reports 1200 across) gets
  the same spread zoomed down to fit, to no less than 75%, rather than a sideways scroll
  (M12b); it is one layout scaled, never a second one.
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
draw with cube-lerp, blocked by Wood, Farmhouse, Ridge, and since M20 Hedgerow and Orchard.

Map is **18 wide x 13 tall**, hex size 46px. That is roughly 1470x900 of board, sitting on
the left page of the spread (§11).

---

## 3. Terrain

| Terrain | Move cost | Cover | LOS blocking | Notes |
|---|---|---|---|---|
| Field | 1 | none | no | fully exposed |
| Track | 1 | none | no | exposed, fast |
| Hedgerow | 2 | heavy | yes (M20) | the safe artery |
| Wood | 2 | heavy | yes | bad landing |
| Orchard | 1 | light | yes (M20) | |
| Marsh | 3 | light | no | bad landing |
| Canal | impassable | — | no | crossable only at bridge/lock |
| Ridge | 2 | light | yes | high ground, +1 spot radius |
| Farmhouse | 1 | heavy | yes | may be occupied |
| Emplacement | impassable | — | no | enemy position |

A hex that blocks line of sight hides what lies beyond it, never itself: a man in a hedge
or on an orchard's edge is seen as ever, the ground behind is not. Hedgerows and orchards
were see-through until M20, when the operator found the base post looking over the
orchard and, on Hard, past the hedges; the balance bot barely moved (Normal 93/85/76 from
94/84/76, Hard 53/38/23 from 48/37/20).

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
  AP, so a man left where he is stays hidden for free. A hidden trooper is marked on
  his counter.
- **Suppress** (gunner only) — costs **2 AP**, leaving one step to get back into cover.
  The target must be a **visible enemy: within the gunner's spot radius, with a clear
  line of sight** (troopers have no facing arc). A suppressed enemy has its head down: it
  **does not spot or fire at the next detection check and does not move in the next enemy
  phase** (M15: until then it still spotted, and playtesters found a suppressed enemy
  covered no one — the men it saw were put in contact and shot the turn after). Its view
  is not drawn while it is suppressed.
  Firing is gunfire: +2 alert (§6), and it is heard (§6). A suppressed enemy is open to a
  **kill** until the end of the next player phase.
- **Knife** (any trooper, M12b; a playtester: "I snuck up behind a patrol before
  realising my guy could only throw stones") — costs **2 AP and ends his turn**. The
  target must be **beside him** and **unable to see him**: he is outside its arc (beside
  it, range and line of sight are never the question). He must **not be in contact**. It
  is silent — **no alert, no noise** — but it leaves a **body**, found like any other
  (+1). The reserve squad cannot be knifed any more than shot (`killable: false`). The
  turn card hints at it when a man starts his turn behind an enemy. `knife.fullTurn` in
  `rules.json` makes it a full turn instead (he must not have spent AP), a lever if it
  proves too strong.
- **Kill** (gunner only) — costs **2 AP**. The target must be visible, exactly as for
  suppress, and **under suppression**: suppressed this player phase or the one before, so
  one gunner needs two turns (suppress, then kill) and two gunners can do it in one. From
  the detection check after that next player phase the enemy is back to normal. A kill is
  **one aimed shot from a silenced Sten**: quieter than the suppressing burst, **+1 alert,
  heard 2 hexes** from the gunner's hex (its own numbers in `rules.json`; Cool Head's
  onFire trait applies to it as to gunfire). So a kill from cold costs +3 alert, leaving the
  garrison Suspicious; the body, once found, is the step to Alert. The enemy is gone from the board, stops
  holding anyone in contact, and leaves a **body** (§5 Wounds) that the rest of the garrison
  finds the same way. There are no dice: a legal kill always kills. An enemy type marked
  `killable: false` in `enemies.json` cannot be killed (the reserve squad, §6 Exfil
  watched), though it can be suppressed; it is never outlined as a kill target, and its
  hover and the Kill button both say so, so no effort is wasted trying.
- **Stabilise** — another trooper spends a full turn adjacent to a wounded man (§5). The
  wounded man gets his **full AP pool back and can carry a charge again**, but the hit is
  not undone: he is still one hit from death. The wound is dressed, not healed. While it
  is aimed, the man under the mouse wears a big red cross, grey if he cannot be aided
  (M18, the operator's), as an aimed enemy wears a crosshair.
- **Pick up a charge** — 1 AP, standing on a hex with a dropped charge (§5), if he can
  carry one.
- **Throw a stone** (any trooper) — costs **1 AP**. Pick a hex **up to 3 away**; no line
  of sight needed, it is lobbed. It is a noise event on that hex (§6): **alert +1**, and
  enemies in earshot react to it — patrols go and look in the enemy phase, sentries turn
  to face it **at once** (M13b), for the rest of the player phase and the detection check. The
  trade is deliberate: you choose where they look, and you pay a sighting's worth of alert
  for it. The hover readout shows which enemies would hear it before the player commits.
  **A throw is not a move:** he stays on his hex. While it is aimed the board marks where
  it lands with a pebble in a target ring and shades the ground in earshot, and the
  readout says he stays put, so it never reads as a path. (Until M18 it drew the lob as
  a dashed arc from him; the operator found that read as a walk, so nothing joins them.)
- **Pass a charge** (M11b, from playtesting) — costs the giver **2 AP** (`passCharge` in
  `rules.json`); the man taking it pays nothing. He hands one of his charges to a man
  **beside him** who can carry it: not wounded, and with room under his capacity (a scout
  carries none). Aimed like stabilise: press it, then click the man.
- **Place a charge** (anyone carrying one) — costs **1 AP** (the `onPlaceCharge` hook may
  change it), standing on a charge hex of an objective that still needs charges (§7). One
  charge per charge hex.
- **Cut the line** (scout only) — a **full turn**, like stabilise: he must not have spent
  any AP yet, and it costs his whole pool. Standing on a telephone exchange charge hex,
  he destroys the exchange at once, quietly: **no noise**, so nobody comes to look, but the
  garrison notices its telephones go dead: **alert +1** (`alert.lineCut`; M15, the
  operator's — it raised nothing until then) (§7). Being seen does not stop him, though it
  takes his turn, so he cannot also get out of sight. A man who walked onto the point has
  spent AP and must wait for the next turn, and the button, the target's hover and the turn
  card say so in those words (M20: a playtester took the wait for being seen).
- **Swim** — a **full turn**. From a hex beside the canal, across one canal hex, to any
  free hex on the far bank beside that same water hex (M16, from playtesting: straight
  across only offered one landing, often not the nearest). Never onto the lock or the
  bridge, which are not banks, and not from them either: a man steps onto a bank first.
  Where the canal is two hexes wide there is no swim; the lane to the lock (§8) gives a
  man on the far bank there firm ground to land on. A wounded man cannot swim. He cannot hide as he comes out,
  and is tested on the far bank like any hex he enters; while it is aimed, the hovered
  landing shows its risk dots and says whether he would be spotted there, as a move's last
  hex does (M20). It exists so a man is never
  stranded by his own demolition. Until M11b it was allowed only once the bridge was
  down; playtesting showed that left the telephone exchange reachable only over the
  watched deck, so nobody went for it. The bridge's charges go on from the west bank and
  the exfil is on the west side, so the canal only has to be crossed for the exchange: the
  bridge guards the bonus, never the mission. `requiresDestroyed` in `rules.json` can
  still gate it on an objective.
- **RAF diversion** (once per mission, while the leader is alive) — costs **no AP**, called
  at any point in the player phase. A diversionary raid on the town pulls the garrison's
  attention: the **alert drops one state** (to the start of the state below), **every
  enemy abandons its search or held contact** and goes back to its route or post, and
  **every trooper is out of contact**. It does not undo wounds, deaths, bodies already
  found, or the explosion floor (§6). The leader carries the radio, so it is gone if he
  is dead; that is a rule keyed to the `leader` flag, not a trait (§5 Command). Calling it
  forfeits the "never reached Alarmed" score (§10): a clean run still scores highest.
  When it is called the Dakota flies across the board over the garrison (display only,
  skipped by any key or click), then a card headed in the diversion's blue says what it
  did (M11). Its engines are heard half a second before it comes into sight (M18).

### Desktop interaction (this matters more than it sounds)

Hover is a first-class mechanic, not a nicety. It is what makes the game readable enough
to be casual while still being strategic.

- **Hover a hex** with a trooper selected: draw the path, show total AP cost, and show a
  detection risk readout for every hex on that path. The player commits only on click.
- **Hover an enemy**: highlight its vision arc and its patrol route.
- **Hover an objective**: show what it needs (charges, fuse, blast radius).
- **Right-click**: deselect / cancel.
- **Undo** (M8e, one step since M9b, by level since M11b): the button beside End turn,
  `Z`, or `Cmd`/`Ctrl`-`Z` takes back the last move or action. How many steps back it can
  go is `undo.steps` in `rules.json`: one on Normal and Hard, so it cannot be pressed again
  to go further back, and on Easy every step back to the start of the turn. It is forgotten when the turn ends or the stick jumps, so nothing the
  garrison has done is ever undone. The player phase rolls no dice (only the drop does,
  §9), so undoing can never re-roll anything; it is a mis-click safety net, not a scouting
  tool, because there is nothing hidden to learn by trying a move.
- **Keyboard**: `1`–`6` select trooper, `Tab` cycle, `Space` end turn, `Esc` cancel,
  `R` toggle patrol-route overlay. Actions: `H` hide (go to ground; M13 — it was `G`, and
  `H` held a man's position, which nothing needed: Tab moves on, End turn ends it),
  `S` suppress, `K` kill, `N` knife, `T` throw a stone, `A` stabilise (aid), `P` pick up a charge, `E` pass a charge, `C` place a
  charge, `X` cut the line, `W` swim, `D` RAF diversion, `Z` undo, `M` sound on or off. An action
  with a target outlines where it can go and waits for a click; `Esc` backs out of it.
- **Each action's button shows its cost** (M19, the operator's): its AP under its name,
  "2 AP", or "all AP" for those that take his whole turn. The rollover keeps the full cost
  and why not.

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

Cat's Eyes was first written as `onSpotRadius` +1. Spot radius is read only by a gunner's
suppress and kill, so on a scout it did nothing at all; since M11d it is **1 harder to
spot** (`onDetectionCheck` −1), which makes Vance, already a scout, the stick's ghost —
the man to send over the canal to cut the line.

Each man's roster row prints his trait and what it does in numbers ("Steady Hands:
fuse 3 → 2 turns"), not just its name (M11d).

Cool Head was first written as "no alert rise, once per mission". A usage limit is a
condition, not a modifier, so it could not be a trait either. It is now a flat **−1 to the
alert his gunfire raises**, every time: +1 instead of +2 at the current numbers.

### The six

Names are placeholders and will be replaced.

| # | Name | Role | Trait | Hook | Effect |
|---|---|---|---|---|---|
| 1 | Sgt. Alec "Dutch" Holloway | Sapper | Steady Hands | `onPlaceCharge` | fuse −1 turn |
| 2 | Pte. Ronnie Fitch | Sapper | Quick Work | `onPlaceCharge` | placing costs 0 AP |
| 3 | Cpl. Eddie Vance | Scout | Cat's Eyes | `onDetectionCheck` | 1 harder to spot |
| 4 | Pte. Tom Barrow | Scout | Treetops | `onLand` | ignores bad-landing penalty |
| 5 | Cpl. Stan Speers | Gunner | Cool Head | `onFire` | gunfire alert −1 |
| 6 | Pte. Wilf Nunn | Gunner | Ox | `onChargeCapacity` | +1 charge |

### Command

Holloway is the ranking man, and that is a mechanic. At the start of each turn, every
trooper within **2 hexes** of the leader gets **+1 AP** for that turn: he has been given
his orders — and a trooper **beside him** gets **+2 AP** instead (M12b, from playtesting:
the orders are strongest closest to him; `closeRadius` and `closeBonusActionPoints` in
`rules.json`). A man with +1 wears one chevron, a man with +2 two. The leader does not
give the bonus to himself.

It is measured when pools are filled, so walking into the leader's radius mid-turn pays
off on the following turn, not the current one.

This is a **rule in `rules.json`, not a trait**, and that distinction matters. Every hook
in the table above modifies the trooper who owns the trait. Command modifies *other*
troopers, conditional on their distance from him, which the hook system cannot express
and must not be extended to cover. The leader is a `leader` flag on a roster entry, so
promoting a different trooper is a one-line data change and no code knows anyone's name.
His roster rollover says what he gives the stick: the orders (radius and bonus, from
`rules.json`), how many men have them this turn, and the radio for the RAF diversion (§4).
While he is selected, or the mouse is on him (M12), his radius is outlined on the board,
dashed in leader blue, and a man who has his orders this turn wears a leader-blue chevron
on the right of his counter, beside the AP it adds to (M11; moved right in M12, clear of
the leader's rank flash), so the bonus can be seen, not just read about. Hovering the
leader's counter says what the ring is and how many men have his orders this turn (M12).

What it buys the design: the command radius rewards moving as a group, and §6 punishes
moving as a group, because more men sit inside one vision arc. Speed against stealth,
decided every turn. It also makes losing Holloway expensive, which is the point of §5.

Nunn carrying a charge means a gunner can finish the job if both sappers are down. That
redundancy is deliberate — it is what stops a bad drop from being an unwinnable run.

### Roles (the three code behaviours)

- **Sapper** — 3 AP. Places and sets charges. Carries 1 charge.
- **Scout** — 4 AP. Spot radius 3. Detection against him reduced one step. No charges.
- **Gunner** — 3 AP. Can suppress a visible enemy (§4 Actions): it neither fires nor
  moves on its next go. Can kill an enemy under suppression (§4 Actions). Firing is loud, +2 alert. No charges (unless Ox).

### Wounds

There are no hit-point bars and no dice. What a shot does depends on the cover of the hex
he is shot on (`combat.shotResult` in `rules.json`):

| Cover where he is shot | Result |
|---|---|
| none or light (field, track, bridge; marsh, orchard, ridge, lock) | **Hit** |
| heavy (hedgerow, wood, farmhouse) | **Pinned** — no hit, but his next turn's pool is 1 AP smaller (never below 1), and he stays in contact |

**Range** (M13b, from playtesting — a spotted man had no way out): a shot hits only if an
enemy firing on him is within **4 hexes** (`combat.hitRange`; 2 until M14, when the
operator found Normal played like Easy — Easy keeps 2 — and 3 until M21b, when Normal
wanted to be harder again; Hard has it too); from further off, every shot only
pins, whatever the cover. Getting distance is a way out, and the readout shows it before
he moves.

A trooper has **two hits** (`hitsToKill`): the first **wounds** him, the second **kills**
him. A trooper is shot **at most once per turn**, however many enemies fire, so there are
always at least two turns between being first spotted and dying — and a man who keeps to
heavy cover is never hit at all, only pinned. Light cover hides a man but does not stop a
bullet (M8b balance: with light cover pinning, nobody ever died and every run was won). If he was seen on several hexes in one move, the
shot lands on the most exposed of the hexes where he would be shot.

Wounded troopers drop to 1 AP and cannot carry a charge; a charge he was carrying drops
on his hex for anyone to pick up (§4 Actions). Another trooper can spend a full turn
adjacent to stabilise him (§4 Actions). Dead is permanent — there is one mission, and that
is it. A dead trooper, or a dead enemy (§4 Kill), leaves a **body** on his hex, found by enemies the same way as a
parachute (§9): alert +1, once.

### Dialogue

Each character has 3 lines in `roster.json`, keyed to `onLand`, `onPlaceCharge`,
`onWounded`, and may have a fourth, `onWoundedCarrying` (M9b), said instead of
`onWounded` when he is hit still carrying a charge — so a line about the charge he drops
is only said when there is one to pick up. They render as comic speech bubbles on the board (§11). This is data and
costs nothing mechanically, and it is most of what makes the six feel like six people.

---

## 6. Detection and alert

There is **no fog of war.** Enemies are always drawn. The hidden resource is alert.

Each enemy has a vision radius and a facing arc (110° since M13b, was 120°: at 120° the
arc took in both hexes beside the facing one, and playtesters found patrols too hard to
avoid; the garrison gained the Road patrol, §8, to make up). A trooper inside it is tested:

```
detection = base(enemy) - cover(terrain) - concealment(trooper) + proximity bonus
            + alert bonus (the state's detectionBonus in rules.json: +1 at Alert and Alarmed)
```

Compare against a threshold in `rules.json`. Surface this maths in the hover readout as
pips. The player must see risk before committing.

**Garrison alert has four states**, global, shown as a dial on the right page:

| State | From | Effect |
|---|---|---|
| **Calm** | 0 | Patrols walk fixed routes. |
| **Suspicious** | 2 | Patrols pause and sweep (a turn of 60°, M13b; it was an about-face). Vision radius +1. |
| **Alert** | 4 | Vision +1. **Detection +1**: the garrison looks harder, so light cover no longer hides a man in the open arc. Hearing +1: noise draws enemies from further away. |
| **Alarmed** | 7 | As Alert, and all patrols hunt last known contact. A reserve squad enters from the road edge and watches exfil. |

The alert level is a **points total**; "From" is the points at which each state begins, and points
cap at Alarmed. One event is not a whole state: a single sighting leaves the garrison
Calm, a second makes it Suspicious.

Raised by: being spotted (+1, and only when he was not already in contact — a man already
counted is not counted again each turn he stays in view), gunfire (+2), a silenced kill
shot (+1), an explosion (+3), the fuel dump exploding
(+4, instead of +3), a body found (+1), an abandoned parachute found (+1, see §9), a
thrown stone (+1, §4 Actions), the telephone line cut (+1, M15, §4 Actions).
Enemy fire at troopers raises nothing extra — the sighting that caused it already counted.

**Decay:** after 4 quiet turns (no alert raised and nobody spotted) the points drop to the start of the
state below; in Calm, to 0.

**Explosion floor:** once any charge has exploded, the alert never decays below
Suspicious again. After the first bang the garrison never fully settles.

What this does to a run: the bridge alone leaves the garrison Suspicious; the bridge
plus a cut telephone line still does; the bridge plus the fuel dump is Alarmed.

### Noise: the dial is global, the reaction is local

Every **noise** happens at a hex and is **heard within a radius** set in `rules.json`
(starting numbers: parachute or body found 3, thrown stone 3, gunfire 5, silenced shot 2,
explosion 7),
plus the current state's hearing bonus. **A sighting is not a noise**: the enemies that
spot a man hold and face him (below), but nobody else comes running unless something is
heard. Hearing is distance
only; walls do not stop sound. Enemies that hear it leave their route, walk to that hex,
sweep, and go back to their route. Enemies out of earshot keep walking; they feel only
the dial.

**Sentries cannot leave their post.** A sentry that hears a noise turns to face it in the
enemy phase instead, and holds that facing through the next player phase and detection
check; in the enemy phase after that it turns back to its facing in `map.json`. A thrown
stone is the exception (M13b): the sentries in earshot turn to it **at once**, in the
player phase, and hold it through that turn's detection check, turning back to their post
in the enemy phase — so a stone opens the ground now, for the men who still have AP. The
turned facing is drawn like any other, so the gap is visible.

**Next turn is shown** (M13b): every enemy that will face a new way after the coming
enemy phase, if the turn ended now, shows it as a hollow dashed wedge beside its solid
one; hovering an enemy outlines, dashed, what it will see next turn from where it will
stand, and the readout says where it will be. It is the same sum the turn will do, so it
changes as the men move.

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
The reserve squad **cannot be killed** (`killable: false`): it is a squad, not one man, and
at Alarmed the alert is already at its cap, so a kill would cost nothing and reopen the
exfil for free. It can be suppressed for a turn to slip past it. Its counter and hover say
it cannot be killed.

### Reinforcements (M21b, the operator's, Hard only)

On Hard, blowing a target makes the garrison call up **reinforcements**: its kind's
`reinforcements` in `rules.json` (0 on Easy and Normal; on Hard the bridge 2 and the fuel
dump 1). They come on in the **enemy phase after the bang**, at the road's south end beside
the exfil (by lorry from the town; `reinforcements.entryHexes` in `map.json`), and march to
**posts** on the ways into the exfil — by the lane from the lock, over the west fields,
north of the exfil — each squad the next post in order, where it stands as a sentry. So
getting out after the bridge takes a detour, or a gunner. They are **patrols**, so they can
be suppressed and killed. The call goes by telephone: **none come once the telephone
exchange is down** (its `noReserve` payoff), which makes the exchange the first job on Hard.
The target rings say CALLS UP 2 SQUADS, the hovers and the mission panel say it, and the
turn report says when they are called and when they come on.

The balance bot does not feel them (Hard 47/33/19 either way): its men are nearly always out
within a turn or two of the bang, and its greedy strategy cuts the exchange first. They are
aimed at a person who lingers or goes on to the fuel dump after the bridge.

---

## 7. Sabotage

Three objectives, each on a different approach:

1. **Rail bridge over the canal** (PRIMARY) — 2 charges, on separate hexes. The charges
   go on the **piers, placed from the west canal bank beside the bridge**, not on the deck:
   the towpath runs directly under it (§8). The deck is in the bridge post's view every
   turn; the west bank is walked by the bridge patrol only some turns, so the skill is
   timing, not luck. The post stands on the east bank just north of the bridge (moved one
   hex north in M12): at rest it looks over the north pier, where a man in the marsh is
   seen but not spotted until the garrison is Alert, and a stone thrown north of it, from
   the west bank opposite, turns it off both piers for a turn (§6). Where it stood before,
   the north pier lay due west of it and no stone from the west bank could turn it away. **A destroyed bridge is gone**: its hexes become canal, and the only
   way over is to swim (§4 Actions).
2. **Telephone exchange, village** (secondary) — 1 charge, or a Scout can cut the line
   quietly: a full turn instead of 1 AP, no noise, and alert +1, not a bang's +3 (§4 Actions).
3. **Fuel dump and tank laager** (secondary) — 1 charge. Largest blast, +4 alert. The dump
   stands on the fields below the ridge, near the patrol base (§8).

Every objective lists its **charge hexes** in `map.json`: the hexes a trooper must stand
on to place a charge on it. Hovering an objective highlights them (§4). Charges needed,
blast radius and alert are per kind of objective in `rules.json`.

An objective may list **more charge points than it needs charges** (the exchange has three
points and needs one): the points are a choice of where to stand, not a count. The game
must say so wherever a player counts them — the orders, the target rings, the objective
and charge-point hovers — or three dashed hexes read as three charges. Once an objective
has every charge it needs set, its empty charge points are no longer drawn.

Placing a charge costs 1 AP and sets a 3-turn fuse by default. The fuse burns down in
every fuse phase, including the one at the end of the turn it was placed, and the charge
goes off when it reaches 0: a 3-turn charge placed on turn N goes off at the end of turn
N+2. Charges can be placed and left. An objective is destroyed once as many of its charges
have gone off as it needs, in the same turn or not. A trooper within the **kill radius** of a
charge at detonation dies, wounded or not — hits (§5) do not apply — and the hover path
warns of it. Inside the blast radius but past the kill radius he takes **one hit**, as from
a shot: wounded, and his charge dropped, or killed if he was already wounded (M20, the
operator's: the fuel dump killed a hex too far). Only the fuel dump has such a ring: its
blast is 2 hexes and it kills within 1; the bridge and the exchange kill all of their 1
(`killRadius` in `rules.json`). The ring is shaded lighter than where it kills. **An enemy inside the blast radius dies too**, all of it, the wounding ring included: an
enemy has no wounds (M8e, operator's call), unless
its type cannot be killed (`killable: false`: the reserve squad, §6). It leaves no body:
the explosion itself is what the garrison hears, and a body found after it would count
the same event twice. Like a gunner's kill (§4), it stops holding anyone in contact.

**One objective, one explosion:** charges on the same objective that detonate in the same
fuse phase are one explosion — the alert rises once and the noise is heard once. Charges
that go off in different turns are separate explosions, each raising the alert. Timing the
bridge's two fuses together is therefore worth a whole alert step.

The spine in practice: blow the fuel dump first and the bridge approach becomes a hunt.
Blow the bridge last and you may not have turns left to reach exfil.

**Only the primary is needed to win (§10).** The secondaries are worth score and cost
alert, and nothing else. The panel labels them "optional, +2" so they do not read as a
checklist.

**Secondary payoffs** (M11b; considered since M8, built after playtesters said beating
a bonus target should be worth more). A secondary pays back in play, not only in score:
- **The telephone exchange**, cut or blown: the garrison can no longer call up its
  **reserve squad** (§6 Exfil watched). If the reserve is already out, it stays.
- **The fuel dump**, blown: the **nearest patrol leaves the board** to deal with it (the
  tank laager crew go to fight the fire), on top of any the blast itself kills.

Each is a per-kind `payoff` in `rules.json` (`noReserve`, `withdrawPatrols`), never a
code branch for one objective. The target rings, the objective hovers and the mission
panel say what each pays before the player commits, and the turn report says when it
happens.

---

## 8. Routes

The map must support **three genuinely viable approaches**, each with a distinct cost:

- **Canal towpath** — heavy cover, slow, marsh, but runs directly under the bridge.
- **Hedgerow lanes** — the middle path. Balanced, crosses two patrol routes.
- *Since M13b* a **Road patrol** walks the length of the road that runs north–south
  through the middle of the board, from the south fields up past the railway to the north
  edge and back, starting at its south end.
- **Wood and ridge line** — fast and good spotting, but passes the patrol base.
- *Since M16* a **lane** runs east from the road's south end to the lock, over what was
  marsh, so a man swimming back from the village side near the exfil lands on firm ground
  and can reach the exfil the next turn, not after two turns of marsh (the operator's). It
  is not a crossing: the lock still meets only the west bank.

No route reaches all three objectives efficiently. Choosing one is choosing which
secondary objective is realistic.

*Since M9c:* the balance bot found the fuel dump equally reachable from every drop run —
what a bonus target costs is the garrison it rouses, not the walk — so the drop runs are
told apart by what they are good for instead, one word each, shown with the run's name
(`tag` in `map.json`): **West · QUIET** (under cover the whole way, the fewest sightings,
the longest walk), **North · STEADY** (soft landings, the most reliable), **East · FAST**
(down closest to the bridge; its description says it is tricky, as it is the hardest run
for a first-timer). The base patrol walks the fields south of the fuel dump, not
up onto the ridge, so the wood and ridge line is the quiet one.

---

## 9. The drop

The drop is not a cutscene. It is the first decision, and it is how the player chooses a route.

Before turn 1, the player picks one of **three drop runs** (north, east, west), drawn as a
flight line across the map with a wind arrow. The run decides which corridor the stick
lands nearest: west on the wood and ridge line, north on the hedgerow lanes, east on the
fields north-west of the bridge, nearest the primary (moved off the towpath at M9c: it
dropped the stick into the bridge patrol's walk and was hard by accident). All three land west of the canal, so nobody starts on the
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

- A trooper standing on a parachute can **pack it up for 1 AP**, removing it: his own or
  anyone's (M15; until then only his own), one per action, only from that hex.
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
  anywhere (carried, dropped or set) to finish the primary — a dropped charge counts only
  while a man still on the board could carry it (M13). Also: nobody is left on the
  board and the primary is intact. The mission ends at once: every man still on the board
  gets out, then any charges still burning go off (they can still finish an objective).
- **Failed:** dawn arrives (the end of turn 20) without success, or every man is dead.
  A man still on the board at dawn is left behind and does not count as out.

The mission also ends when nobody is left on the board (all out or dead), after any
charges still burning have gone off.

**Asked before it is lost** (M14, from playtesting): a move onto the exfil that would end
the mission short of success — too few men left on the board who can carry the charges
still needed, the last man leaving with the bridge up, too few men — is held back by a
card, "Are you sure? Mission not yet complete. An exfil now will end it: WITHDRAWN." with
the reason; Enter or its button goes anyway, any other key or click stays. The hover
readout says it first. It is the same move and settlement the click makes, so charges
still burning that would finish the job are counted.

**Exfil** is a short run of hexes on the **south map edge**, listed in `map.json`, away
from all three drop runs (north, east, west — §9). A trooper who ends a move on an exfil
hex is out: removed from the board, safe, and counted. At Alarmed the reserve squad
watches it (§6). A man carrying a charge does not take it out: he leaves it on the hex he
stepped off from, for another man to pick up (M13b).

Results page, styled as the back page of the annual, listing all six by name and fate
(out, killed, left behind), and the score, whatever the outcome:

- Objectives destroyed (primary 10, each secondary 4; 3 and 2 until M18)
- Troopers exfiltrated: 2 each who was never hit, 1 each who was wounded, dressed or not
  (M18, the operator's; 1 each until then)
- Troopers exfiltrated who were never spotted all mission (1 more each; M11b replaced
  "turns remaining, 1 per 2 turns", which paid players to rush — playtesters did, and
  either made chaos or finished early). A man's roster rollover says whether he is
  still unseen.
- Enemies killed by a knife or a gunner's shot (1 each), less 1 for each of their bodies
  the garrison finds (M16, the operator's; a body is found once, so a kill nobody finds
  is worth 1 and one they find nothing). A blast's kills leave no body and score nothing,
  or blowing a target up beside a patrol would pay. The Knife and Kill rollovers say so.
- Never reached Alarmed and never called the RAF diversion (+3)

Why the bridge is worth so much (M18): with men out paid 2 each, a stick that walked all
six out unseen without touching the bridge would outscore one that blew it and brought three
home. At 10 the job done with three men out (22 on a clean run) edges out the best retreat
(21), and a full success tops out at 39 before kills.

The page also says which difficulty the mission was played at.

**Difficulty** (M9). Three levels, chosen on the orders before the drop and fixed once
the stick jumps. The numbers above are Normal's. A level is data only: a patch over
`rules.json` and `enemies.json` in `data/difficulty.json`, and no code asks which level
is on. It is shown beside the seed, and `?difficulty=easy|hard` in the address picks it
as `?seed=` picks the seed.

| Level | Changes from Normal |
|---|---|
| **Easy** | The bridge takes 1 charge; 2 men out will do; the RAF diversion can be called twice; the leader's orders reach 3 hexes; undo goes back as far as the start of the turn (M11b); hiding gives +2 concealment, not +1 (M13b); shots hit only from 2 hexes off, not 3 (M14) |
| **Normal** | The mission as above |
| **Hard** | 4 men must get out; every sentry, patrol and the reserve sees 4 hexes, not 3, and keeps the old 120° arc (M13b); blowing the bridge calls up 2 squads of reinforcements and the fuel dump 1, none once the exchange is down (M21b, §6) |

The score is the same sum at every level.

---

## 11. Art direction

**The reference is a board game printed in an 80s British comic annual.** Cheap paper,
limited spot colours, slight misregistration, die-cut counters.

Desktop makes the skeuomorphism work properly, so use the room:

- The whole game is a **double-page spread**. Board on the left page. Right page carries
  the mission briefing in caption boxes, the alert dial, the turn counter, and the
  **roster rail: all six portraits, always visible**, greying out as men are lost.
- Paper cream ground, fibre texture, centre-fold crease and gutter shadow between pages.
  The fibre is also printed faintly on the flat boxes of the right page and the captions,
  and over the map (M16, the operator's: they read as too digital); the cards keep their
  own full-strength paper.
- Ben-Day halftone dots as SVG `<pattern>` defs, **used sparingly**: on wood, on
  objectives, on the enemy's vision and in the chrome. Open ground is flat spot colour.
  Clarity beats texture: the board must read at a glance, as the flat-colour prototype
  did (M7b).
- Palette: paper `#F2E8D5`, ink `#1A1A18`, army green `#5C6B4A`, danger red `#C1272D`,
  cold blue `#3D5A73`, and one reserved colour, leader blue `#2F7BBF`, used only to mark
  the ranking man (his counter's name strip and rank flash, his number on the roster) and
  his orders (their radius, chevron and AP dots, §5 Command), and one for fire, a soft
  printed orange `#C98249` (M14, the operator's), used only for flames, the blast's
  fireball, a burning fuse's stopwatch and the dots for charges a man carries (M15).
  Nothing else.
- Deliberate 0.5px colour misregistration on fills against their ink outlines.
- Units are **counters**: rounded squares, a soft drop shadow down-right, symbol, name strip. A man who
  moves travels his path quickly at a steady pace and stops dead at the end: no wobble,
  no easing in or out (190 ms a hex since M24, 140 from M16). A man with no AP left stays fully printed; his counter's edge goes
  grey. Halftone is printed faint, close to the colour beneath it.
- Speech bubbles for dialogue on the board, tail pointing at the man's counter, shown for
  the man selected or under the mouse (on the board or in the roster). A line is heard
  once: when the selection moves off that man it goes (hovering shows it without using
  it up), when he moves off the hex where he said it it goes (M14), and any line never
  heard goes at the end of the turn. Bubbles are set smaller
  than the board's labels. Dialogue stays on the board, not in the
  roster rail.
- **Type is not comic lettering,** except in the speech bubbles. The annual look comes
  from the print, paper and colour. Text on the right page is a typewriter face, a Courier
  (`Courier 10 Pitch`, then `Courier New`, `Courier`, `monospace`), so it reads as a typed
  briefing. Speech bubbles and the marker-pen notes are hand lettering in capitals, Manly
  Men BB (never Comic Sans). Headings and the masthead are set in Stardos Stencil, the
  stencil the title card is lettered in. Pin the board's label face rather than leaving
  it to the browser's default monospace.
- A **church** with a spire in the village, as art on an existing farmhouse hex: no rule,
  no new terrain. It is the landmark Vance's landing line refers to, and spires were how
  real sticks checked they had been dropped in the right place.
- "CUT OUT AND PLAY" margin note in the middle of the outer gutter, and above it, at the
  top of the margin, BURN BY DAWN in the title stencil, running up the page (M14; twice
  the size and darker in M15).
- **Roads and the railway read as continuous lines.** A track is drawn as one smooth road
  through its hexes' centres, not a motif stamped per hex. A **railway** runs east–west
  across the board and over the rail bridge, as art only, like the church: no rule, no
  terrain, no cost. It is why the bridge is there.
- **Ghost Dakotas** (M16, the operator's): until a run is picked, a faint grey Dakota flies
  each drop line again and again, staggered, so the lines read as flight paths. Silent.
- **The drop is shown.** When the player jumps, a Dakota flies the chosen run's line, and
  each man's canopy opens where he jumps, drifts downwind to where the rules have already
  put him, lands and collapses into his parachute marker. It is display only: every
  landing is decided before it starts. A click or Space skips it.
- **Terrain motifs are few and bold.** One clear shape per hex at most. A field is plain,
  with a small mark on a minority of hexes. An enemy's vision stays a faint flat tint at
  rest (it is the risk map, and there is no fog of war) and is filled strongly and
  outlined when that enemy is hovered.
- **The board is printed as a map, not as tiles** (M7b, after cardboard wargame maps).
  Woods, orchards, marsh and the ridge are each one shape across their run of hexes,
  with a rounded, slightly irregular edge, and the hex grid is printed over them. The
  ridge is tonal bands: dark crest, pale fall, a contour at its foot. Neighbouring
  hedgerow hexes are joined into hedges, drawn like roads. All of it is ink only: every
  rule still reads the hex. Since M17 (after the operator's reference art) a hedge is
  bushy clumps laid along its line, now and then a tree; a wood is crowded billowing
  crowns; an orchard is rows of round trees running on across it; and the trees throw
  solid ink shadows down and to the right, as the counters do. Since M20 an orchard's trees
  are small billowing crowns like the wood's (round flat ones read as oil drums), and a
  windfall apple has a stalk. The half-hexes past the border are washed lighter than
  before, with a soft edge, so a wood fades out into them rather than stopping dead.
- **Place names** are printed on the map, art only, from `data/map.json`: the village in
  spaced capitals, water in italic on the water, the rest in italic. The turn report uses
  them ("the field by Ferme Lebrun"). Map names may be set in a serif italic; they are
  the one type on the board that is neither typewriter nor lettering. A name can be nudged
  off its hex's middle (`dx`, `dy` in `map.json`) to sit in what it names.
- **An enemy counter prints its type** on its strip; the reserve squad's reads RESERVES
  (M20: RESERVE SQUAD was too small to read and ran off the chip). `counterLabel` in
  `enemies.json`; its hover still calls it the reserve squad.
  Marker-pen annotations (the target rings and their notes) are set in the speech
  lettering: they are the player's own pen, not print.
- **The move path counts.** Each step on the hover path shows the AP spent by the time he
  gets there, grey past what he has. A hex on the path where he would be spotted is
  crossed out in red, marker-pen style, over the risk pips. The line is cold blue, and
  red from the first hex where he would be spotted (M11), so red means trouble. The last
  hex on the path with pips has a pen note beside them saying what they are (M19, the
  operator's: players did not know): "2 of 3 dots: 3 and he's spotted", or "3 of 3 dots:
  he's spotted" in red; the readout's sum ends "= 2 of 3 dots" to match.
- **Our counters are printed solid army green** with a dark name strip (leader blue for
  the ranking man), AP left as dots top right (M13, was one large figure: two numbers on
  a counter confused players), filled for AP left and hollow for AP spent, the role in a paper roundel,
  and a sliver of the card's cut edge showing down-right under the soft shadow.
- **Objectives say where to go.** Each objective's hexes are outlined firmly, its art sits
  inside them, and its name above them. Each charge point is a red dashed hex with an empty
  satchel in it: where a man stands to place a charge. Hovering one says so.
- **Targets are ringed before the drop.** (M12: each ring takes in the objective's printed
  name, and is drawn under the names, charge points and counters, as a pen mark on the
  map would be, so the print reads over it; the exchange's note says a scout can cut its
  lines instead.) Until a drop run is picked, each objective is
  circled in red marker pen, the primary twice, with a hand-lettered note beside it, and
  the exfil in green. Picking a run clears them.
- **The title card.** The orders open under a painted picture of the drop across the top
  of the card with the title, BURN BY DAWN, lettered in stencil (a supplied
  `assets/title/title-card.jpg`, ART-ASSETS.md §7; drawn in code, with the title in type,
  if the file is missing).
- **The exchange has wires** (M12, art only): a telegraph pole on each of its charge points
  and a line from each to the building, hanging snapped once the exchange is cut or blown,
  so "cut the line" has a line to cut. A charge point's satchel sits a third of the way
  toward the target it serves, nudged off the wires where `pointNudge` says (M16).
- **The power goes** (M16, the operator's): cutting the line flickers the lights in the
  exchange's windows out and sparks each wire where it parts; since M18 (the operator's:
  it was a slow dark flicker) the exchange and the ground round it flash white in quick
  stutters as the wires short, a spark with every flash, all over in about a second. A cut exchange then stands with its windows dark, not burning as a blown one.
- **The knife is seen** (M16, the operator's): a faint stain stays under its body. Since
  M18 (the operator's: the M16 splat burst over the counters and seemed to fly onto the
  hex) the stain spreads slowly out from under the body, dark and wet, over about three
  seconds, and dries to its faint print: a quiet kill.
- **The loading page** (M17, the operator's: over the web the boxes under the map were
  drawn first, in the middle of the page, then jumped away as the rest came in). The
  spread stays hidden until it is drawn and its supplied pictures are in (never more than
  8 s); meanwhile the table shows BURN BY DAWN and a fuse burning down as files arrive.
  Ready, it asks for a key or a click, and the spread fades up with the orders open. The
  click is also what lets the browser play the title music (§11 Sound).
- **The orders are the first thing seen** (M12): while they are up the whole spread is put
  in shade under a coarse halftone, and the card stands off it on a deep soft shadow.
  Picking a run then jumping needs **Space**, or a second click on the same run.
- **Keys are set in bold** wherever the game's text names one (M12).
- **The turn cards sit in the bottom right of the map** (M13), narrower and with nothing
  darkened, so what they report can be seen beside them; the orders stay in the middle,
  wider, with the difficulty at the top because it changes the numbers written below it.
- **Shots are seen and heard** (M13): suppressing fires a burst — flashes at the gunner,
  red tracer to the enemy, its counter flashing, and a burst of gunfire — and a kill is
  one dim shot and a muffled cough. A suppressed enemy's counter is printed faint with a
  red SUPPRESSED band across it.
- **The turn report** keeps each man's lines together, his death always last, and sets
  "killed" in bold red (M13).
- **Parachutes** lie inside their hex, in one of its corners, the same one all game (M13).
- **Starting again.** A RESTART at the foot of the outer margin, bold (M15; a first click
  arms it, a second starts a new game on a fresh seed at the same level), and Play again
  on the back page, start a new mission without reloading the page; the orders open
  again (M12). Above the seed the margin says which build this is, "build M15", from
  `data/version.json` (M15; the game cannot read the git branch once it is published).
- **The garrison's turn is shown** (M15, from playtesting: players had to read the card
  to know what had happened). When a turn ends, before its card, every enemy walks the
  steps it took — at a patrolling walk, slower than our men, that quickens as the alarm
  rises (M16: 480 ms a hex at Calm to 300 at Alarmed) — a red "!" pops over each enemy that spotted a man or found a body or
  parachute, and a ripple runs out from each noise it heard. The "!" stays on the enemy's
  chip through the player's turn, and hovering it, or the enemy, says what it saw or found
  and what comes of it (M20, the operator's); the RAF diversion takes it away. Any key or click brings the
  card at once. A noise waiting to be heard says what it was under its ring (STONE,
  SHOTS, SHOT, FOUND), and its hex's hover says who it will bring. A bang has no ring
  (M18, the operator's: it stood on the blown bridge like a target): the blast, the smoke
  and the DESTROYED stamp already mark it, and its hover still says who it will bring.
- **Aiming at an enemy** (suppress, kill or knife) draws a crosshair over the enemy under
  the mouse, red if it can be done and grey if not, instead of its route and view (M15).
  The turn after a suppression, when it sees and fires again but can still be killed, it
  wears a red crosshair, not the suppressed mark.
- **Our counters** (M15): a dot in fire orange down the left for each charge a man
  carries (the leader's on his rank flash, in the same place as everyone's, M16), the leader's orders chevron smaller than his own rank flash, and a burning
  charge counted down on a stopwatch — a quarter of its face per turn left, red with a
  burst on its last turn — not a number, which read as a count of charges. Bodies are
  drawn half as big again, and since M16 nearer the middle of their hex.
- **How to read a counter** (M15): beside the orders, over the right page, a card of its
  own drawn with the board's own counters: one of our men with every mark labelled, the
  leader and the marks a man can wear, and an enemy with its facing, next turn's facing,
  type and marks. Since M16 it lies over the crease, as tall as what it holds and centred
  beside the orders; WHO sits above NEXT TURN so their pointers do not cross. Since M17
  its middle is on the crease, the orders centred in the room left of it (a 1280-wide
  window has no room for both, so there it sits as near the crease as it can without
  covering the orders), and WHO points at the end of the enemy's name, clear of its
  facing wedge.
- **How to play, at any time** (M16, the operator's): a **?** button beside KEYBOARD, and
  the `?` key, open the orders again with the counter key beside them; in play the level is
  shown but fixed and the drop's own lines are left out. Any key or click puts it away.
  Since M17 the button and the key work over a turn card too (they did nothing there,
  which is most of the time), and putting the orders away lays the card back down.
- **Descriptions start with a capital** (M16): the words under a bold label in the key, in
  the rollovers and the keyboard list, after "Not now:" and "Cost:", after a trait's name,
  and each item of the hover readout. Text run into a sentence stays as it is.
- **The orders** open with the difficulty in the black bar at the top, and ORDERS / BEFORE
  THE DROP under it in ink on the paper (M15).
- **Briefings.** A briefing card opens over the board: the orders before the drop, and at
  the start of every turn (turn 1 after the drop has been shown) an update: what happened
  at the turn boundary, most important first, and up to three hints about what to do
  next, worked out from the state (a pure function in `src/hints.js`, numbers from
  `data/rules.json`). Any key or click puts it away, and that key does nothing else. A
  box on the card turns the turn updates off for the rest of the session; the orders
  still open on a new game.
- **Where to start** (M21, from playtesting: a first-timer "spent 3 minutes trying to move
  the Germans"). Until a run is picked, **PICK A DROP DIRECTION** (PICK A DROP RUN! until
  M24) is lettered big in the player's red pen among the three runs' names, still since
  M24 (it throbbed gently until then); once one is picked it reads **HIT SPACE TO JUMP**
  (SPACE TO JUMP! until M24), "or click the run again", the JUMP! button on the right page
  turns danger red and throbs, and the run's rollover ends in red capitals, PRESS SPACE
  TO JUMP, OR CLICK AGAIN. Once the stick is down, every man who can act wears a red pen
  ring, with CLICK A MAN TO START over them, until the player first selects a man; after
  that, never again that game. It is the pen, like the target rings, so it is lettering,
  not print.
- **The boxes under the map** (M21b, the operator's: a wall of undifferentiated text, and
  little read). The hover readout is a headline — the ground's name in the stencil, or an
  enemy's name and type — with a stamp saying how the hovered move goes (UNSEEN in green,
  SEEN in ink, SPOTTED or SHOT in red; KILLED if a blast would), then one row per thing
  under a short label: LANDING, MOVE, BLAST, RISK, HIDE, HERE, HEARD, GROUND, ORDERS for a
  hex; DOING, ALARM, NEXT, SEES for an enemy. Trouble is set in red. The turn report is a
  log: a black bar per turn, this turn's lines under it and the two turns before faded
  below, each line with the board's own mark for what it is (the "!", the wound cross, a
  body, the blast, a parachute) and graded — deaths, wounds and bangs in bold red, routine in
  grey.
- **Twelfth review (M22, the operator's).** The where-to-start cues throb half as fast
  and half as far; PICK A DROP RUN! sits higher, clear of the West and East tabs; each man's
  ring throbs about its own counter, at half strength, and CLICK A MAN TO START is lettered
  in the middle of the men. BOOM! has a paper outline and is tipped up 16°. A hovered enemy
  wears a dashed red ring a little off its chip, not a selected man's solid frame, so it
  never looks selectable. Hovering one of our men on the board showed his roster card beside
  him (the leader's with what his rings mean) until M23. The orders are 800 wide, so the job's line
  ends at the EXFIL and "Dawn comes…" has a line of its own; Music off has a bigger box. The
  targets are proper names in all text: Rail Bridge, Telephone Exchange, Fuel Dump. `/`
  opens the orders as `?` does. `?sound=off` in the address starts the game muted. The
  East run flies two hexes further west (§9), from the north edge above La Butte's east
  side down toward Ferme Lebrun: on Hard it won 19% of the bot's games to West's 47%, and
  moving the line was the one change that helped East alone.
- **The boxes under the map, fitted** (M22, the operator's: rows ran off the bottom of the
  readout where nothing could scroll to them, with half the box empty; the log was fiddly
  to scroll). The boxes are 140–210 px tall (92–170 until M22). A row short enough for one
  line of half the readout sits beside another; a target, the exfil or a parachute is named
  in the headline with its facts in short rows (HERE, NEEDS, BANG, CUT, WORTH), and only
  HERE and NEEDS while a man is selected; the ground is a small note at the headline's right.
  If it still does not fit, the type steps down to 13 px, then 12, before anything is cut.
  The log has ▲ ▼ buttons down its right edge, hidden when it all fits.
- **Thirteenth review (M23, the operator's).** The readout is one column (M22's pairs of
  short rows read as clutter), every row's words starting at the same place, and worded
  shorter so most rows are one line: a move's risk says how it goes and where on its RISK
  row and gives the sum on a DOTS row of its own (the sum was the long second row), and a
  sum leaves out any term that is nought. Two columns come back only at 12 px if one will
  not fit. Hovering one of our men puts his particulars in the readout (HAS, WHERE, TRAIT,
  SCORE; CONTACT, CHUTE, ORDERS and RADIO where they apply; over the selected man's own hex
  his RISK and HIDE first) and gives his chip the dashed red ring a hovered enemy wears; the
  M22 card over the board was too busy. A turn card, or the diversion's, no longer takes the
  first click of the turn: a click on one of our men, a man's number or Tab puts it away and
  selects him; any other click only puts it away, so a click meant to clear the card never
  moves the man still selected. A move slid: a soft scuff for each hex as the counter
  crossed it, then the snap as it was set down (silent since M24).
- **Fourteenth review (M24, the operator's).** With the East run two hexes west (M22) the
  run tabs are re-placed: NORTH RUN between the West and East lines, WEST RUN a little left
  and up level with EAST RUN, and EAST RUN a little right, apart from it (map.json
  `labelAlong`, `labelNudge`). The drop's lettering reads PICK A DROP DIRECTION and HIT
  SPACE TO JUMP and no longer throbs; it sits a little right of the tabs' middle so the
  longer line stays on the map. A man's move makes no sound (M23's slides, then softer
  ones, did not suit); his walk is 190 ms a hex, from 140, kept from trying steps further apart.
- **A man killed** (M21, the operator's): his counter floats straight up about a hex and
  fades away over his body, "floating up to heaven", before the turn's card is laid.
- **BOOM!** over a blast is set in the comic lettering of the pen notes (M21, the
  operator's), not the stencil.
- **The hidden mark** (M21, from playtesting: it was very hard to see) is paper with an ink
  eye, sits a little higher on the counter, and is printed at full strength while the
  hidden man's counter is printed faint. The counter key shows the same mark.
- **The counter key** (M21): BLUE AP's pointer ends in a blue dot just off the blue AP it
  means, not a red one on top of it; more room above THE GARRISON and under the last line,
  the card a little taller for it.
- **Type is set for reading.** The right page is set at 13–15px at 1280x800, never below
  12. It carries only what the player needs every turn: detail goes into rollovers.

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

**Sound** (M10). The back page has its own since M12: the village church's bells for a
mission accomplished, and a single bell tolling with a siren far off for a mission
withdrawn or failed (`church-bells`, `bell-toll`). The sounds of the table, not the battlefield (ART-ASSETS.md §9): a
counter snapped down when a move is undone (a move itself is silent since M24, the operator's: it snapped until M23, then slid a hex at a time, and neither suited), a pencil for every other
action, a card's rustle when a briefing card or the back page opens, a dog a long way off
when the alert rises, and three far-off crumps for the RAF diversion. The Dakota drones
over the drop and the RAF flyover (M15, `aircraft`), cut short if the drop is skipped;
the victory bells ring upward to the top bell (M15: falling, they sounded sad). The one exception
(M11, from playtesting): a turn with a bang plays a real explosion, close and loud (lower
and slower since M18, the operator's), and
the board shows it — the page flashes, the board jolts, a shock ring runs out to the edge
of the blast under the starburst, and smoke rolls up — before that turn's card is laid
over it. It is the payoff of the plan, and it should land. **Title music** (M17, the
operator's): over a new game's orders, tense 1940s
war-film music in D minor (tremolo strings, a cello worrying at a semitone, a side drum
far off, timpani, a horn call every other time round) loops over the orders and the run
choice and fades at the jump (M20, the operator's). M19 faded it as the orders were put
away and played it again between turns; the operator found the between-turns music not
enjoyable, and wanted it longer at the start. A new game brings it back from the top;
sound turned back on before the jump carries on where it faded.
`M` stops it, and so does **Music off** at the foot of the orders (M21, the operator's:
music only, for the session). From M21 to M21c it played slower on Easy and quicker on
Hard; the operator found it weird and no help, so it is one speed again. Made in code (`src/render/sound.js`, Web Audio) until files are
supplied in `assets/audio/`, as the art is drawn until pictures are; since M21c every sound
and the title music are supplied recordings (the operator's pick from free libraries,
`assets/audio/README.md`), the made ones kept as the fallback. The title music is now a
recorded war-film main title, "War Epic", looped. Silent until the
player first presses a key or clicks, as browsers require; `M` or the word under the seed
turns it off for the session (nothing is stored, CLAUDE.md rule 9).

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
| **M7b** | Visual clean-up: less noise, bigger type, continuous roads and railway, soft counter shadows, the drop shown, redrawn objectives and portraits | The board reads at a glance at 1280x800; no text on the right page is below 12px; the right page has no empty gaps; the drop plays and can be skipped; no rules change |
| **M8a** | Killing: the gunner's kill of a suppressed enemy, enemy bodies, the unkillable reserve | A gunner can suppress an enemy and kill it next turn, or two gunners in one; the kill is a silenced shot, quieter than suppressing, and leaves a body the garrison finds; the reserve squad can be suppressed but never killed, and the game says so before the player tries |
| **M8b** | Balance pass | Winnable roughly 1 in 3 by a thoughtful first-timer |
| **M8c** | Operator review: title card, charge counts, the leader's rollover, ready to host | The orders open under the title card and fit at 1280x800; the orders, rings and hovers say how many charges each target takes; Holloway's rollover explains his orders and radio; the game runs from GitHub Pages; no rules change |
| **M8d** | Supplied art in: portraits, chips, paper, title card, fonts; objectives redrawn after the reference art; a slot for a painted aircraft; published | The supplied files load with no console errors but the optional aircraft; the orders fit at 1280x800; the game plays from its GitHub Pages address; no rules change |
| **M8e** | Operator review: undo, blasts kill enemies, the stone throw shown as a throw, the exfil barn, lighter paper | Undo takes back any move or action this turn and no further; an enemy in a blast dies unless it is the reserve, leaving no body; aiming a stone draws the lob and the earshot; the painted aircraft flies the drop |
| **M9** | Difficulty levels: Easy, Normal, Hard (§10) | The orders offer the three levels and still fit at 1280x800; each level's numbers show in the orders, the rings and the panel; the level is beside the seed and on the back page; it cannot change after the jump; the balance bot wins clearly more on Easy and clearly less on Hard |
| **M9b** | Operator review: one-step undo, the RAF diversion's card, aiming lets go of a clicked man, the title card and strapline on the orders and the back page, back page tidied | Undo takes back the last action only; calling the diversion opens a card saying what it did and what calls are left; clicking another man while aiming selects him; the orders still fit at 1280x800 |
| **M9c** | Drop runs: the east run clear of the bridge patrol, the base patrol off the ridge, each run labelled for what it is good for | No run is much the hardest for a first-timer by accident; each run shows its word (QUIET, STEADY, FAST) on its button, its tab and its rollover |
| **M10** | Sound: the five table sounds of ART-ASSETS.md §9, made in code, each replaceable by a supplied file (§11) | A move snaps, an action scratches, a card rustles, a rising alert brings a distant dog, a bang is a crump; nothing sounds before the first key or click; `M` mutes; a supplied MP3 replaces its placeholder with no code change |
| **M11** | Operator playtest review, no rules change: the drop runs explained and kept off the title card, clearer landing, alert and hide wording, names in bold, the move line blue until it gets him spotted, rollovers on the counter markers, the leader's orders shown, the RAF card and flyover, a calmer fuel dump, bigger bangs | The orders still fit at 1280x800; the runs are not drawn under the orders; the move line turns red from the first hex where he would be spotted; hovering the `!` explains it; the leader's radius shows while he is selected and his orders show on each man who has them; calling the RAF flies the Dakota over the garrison before its blue card; a bang is seen before the turn card covers it; no rules change |
| **M11b** | Operator playtest rules: undo steps by level, swimming while the bridge stands, passing a charge, a score for stealth instead of speed, in-play payoffs for the bonus targets | Easy undoes any step of the turn; a man can swim with the bridge up; a charge can be passed to the man beside him; the back page pays for men never spotted, not turns left; the exchange keeps the reserve away and the fuel dump takes a patrol off; the balance bot is re-run and compared |
| **M11c** | The Cut the line rollover says what it takes and why it is worth a turn | Hovering X says scouts only, a full turn on a charge point, silent, no charge used, the same bonus, and the exchange's payoff; its "not now" names the charge point; no rules change |
| **M11d** | Cat's Eyes one harder to spot; each trait's effect printed on the roster row | Cat's Eyes changes the detection sum, not the spot radius a scout never uses; each roster row reads like "Steady Hands: fuse 3 → 2 turns" and fits at 1280x800; the balance bot is re-run (Normal 81/78/69, from 80/66/57) |
| **M24** | Fourteenth operator playtest review, no rules change: the run tabs re-placed round the moved East run, the drop's lettering reworded and still, a move made silent and the walk a little slower | NORTH RUN sits between the West and East lines and WEST RUN is level with EAST RUN; PICK A DROP DIRECTION and HIT SPACE TO JUMP are still and on the map at 1280x800; a move makes no sound; undo still snaps |
| **M23** | Thirteenth operator playtest review, no rules change: the music bug (the made music giving way to the recording, several copies at once), the readout in one column and shorter, a man's particulars in the readout with a dashed ring instead of his card, a slide per hex of a move, a click on a man through a turn card | The title music plays the recording once, looped, from the first note, and never two at once; the readout's rows line up in one column at 1280x800 and a move's risk and its sum are rows of their own; hovering a man shows his particulars in the readout and a dashed ring on his chip, no popup; a move is heard a hex at a time; with a turn card up, one click on a man puts it away and selects him |
| **M22** | Twelfth operator playtest review, one map change (the East run's flight line two hexes west, the operator's pick after the bot showed Hard East at 19% to West's 47%): the boxes under the map fitted and taller, ▲ ▼ on the log, a man's card on hover, a dashed ring on a hovered enemy, the orders wider and re-broken, Music off bigger, target names capitalised, BOOM! outlined and tipped, the cues calmer and re-placed, `/` for the orders, `?sound=off` | Hovering any hex with any man selected, or none, at 1280x800, nothing in the readout is cut off; the log scrolls by its buttons; hovering a man shows his card; a hovered enemy's ring is dashed; the orders' job line ends at the EXFIL and the bonus paragraph at "before dawn!"; `/` opens the orders; the balance bot is re-run (Easy 100/100/97, Normal 93/83/88, Hard 47/33/38) |
| **M21c** | Recorded sounds for every sound and the title music, from free libraries, cut and levelled to the made ones; the title music back to one speed | Every sound plays its recording with no console error; each is as loud against the others as its made sound was; the music is the same speed on every level |
| **M21b** | Rules from the eleventh review: Normal's shots hit from 4 hexes; on Hard a bang calls up reinforcements to guard the way out; the boxes under the map in rows and a log | A man spotted 4 hexes off on Normal is hit in the open; on Hard the bridge going up brings two squads on at the road's south end the next enemy phase, marching to their posts, and none come once the exchange is down; the rings, hovers and panel say so; the readout shows a stamp and labelled rows; the report shows a bar per turn and marks per line; the balance bot is re-run (Normal 93/83/74, Hard 47/33/19) |
| **M21** | Eleventh operator playtest review, no rules change: where to start (PICK A DROP RUN!, SPACE TO JUMP!, the men ringed until one is selected), a man killed floats away, BOOM! in the lettering, the hidden mark clearer, the counter key's blue AP and spacing, music off on the orders, the music's pace by level | Before a run is picked the board says PICK A DROP RUN!, after it SPACE TO JUMP!, and the JUMP! button is red; after the landing the men who can act are ringed until one is clicked; a man killed floats up and fades; the hidden mark reads on a hidden man; the key's BLUE AP pointer ends in blue beside the dot; Music off stops the music and leaves the orders up; Easy's music is slower and Hard's quicker; the orders and key still fit at 1280x800 |
| **M20** | Tenth operator playtest review, two rules changes (the fuel dump's outer ring wounds rather than kills; hedgerows and orchards block sight): the title music until the jump and not between turns, orchard trees as crowns with stalked apples, the edge wash softened, the canal's name moved, a swim's landing shows its risk, the cut line explained, the alarm "!" explained, RESERVES on the chip | The music plays over the orders and run choice and stops at the jump, never between turns; a man two hexes from the fuel dump's charge is wounded, not killed, and the ring is shaded lighter; the base post sees neither past the hedges on Hard nor into the orchard; aiming a swim shows the far bank's dots; hovering an enemy's "!" says what it saw or found; the balance bot is re-run (Normal 93/85/76, Hard 53/38/23) |
| **M19** | Ninth operator playtest review, no rules change: the title music fading as the orders are put away and playing between turns, each action's AP on its button, the risk dots explained | The music fades as the orders are cleared, is silent over the run choice and the drop, and plays while the garrison moves and its card is up; every action button shows its AP and all fit at 1280x800, four across included; hovering a seen hex puts a note beside its dots saying what they count |
| **M18** | Eighth operator playtest review, one scoring change (the bridge 10, bonus targets 4, a man out 2 unhurt or 1 wounded): the exchange's satchels and the wood's name moved, the knife's stain spreading slowly, a stone's landing marked alone, the cut exchange flashing bright and fast, a red cross when aiming aid, the RAF heard first, a lower slower bang, no ring on a bang | The exchange's satchels touch no wire or dashed edge; Bois des Moines clears the north run's line; a knifed enemy's stain spreads from under the body; aiming a stone draws nothing from the man; aiming aid crosses the man under the mouse; no ring stands on a blown target |
| **M17** | Seventh operator playtest review, no rules change: the new title card, chips and painted blast in; woods, hedgerows and orchards redrawn after the reference art; the counter key centred on the crease and WHO pointed at the name; ? working over a turn card; title music; a loading page | The board's woods, hedges and orchards match their references and still read at 1280x800; the key's middle is on the crease where the window has room; clicking ? over a turn card opens the orders; music plays over the orders and run choice and fades at the jump; nothing on the spread is seen being laid out |
| **M16** | Sixth operator playtest review: swimming to any hex on the far bank beside the water and never onto the lock (a bug), a lane to the lock, points for kills and back for bodies found, the counter key reworded and moved, a ? for how to play, ghost Dakotas, faint paper, slower walks, the power going at the exchange, the knife's splat | A man beside the canal can swim to any free far-bank hex sharing its water hex, never the lock or the bridge; a man on the east bank by Canal St-Rémy can swim onto the lane and reach the exfil the next turn; a kill scores 1 and a found body takes it back; ? opens the orders at any time; the balance bot is re-run (unchanged: Normal 94/84/76 with the knife) |
| **M15** | Fifth operator playtest review: three rules (a cut line raises the alert, anyone packs any parachute, a suppressed enemy does not spot), the garrison's turn shown, a crosshair when aiming, the counter key beside the orders, a stopwatch fuse, charge dots, the orders' head reordered, the margin reworked with the build, the Dakota's drone and rising bells, the painted enemy chips in | Cutting the line raises the alert 1; a man packs another's parachute; a man walking past a suppressed enemy is not spotted; ending a turn shows the enemies walking before the card; the key reads at 12 px beside the orders at 1280x800; the balance bot is re-run (unchanged for the naive bot, naivefight 96/96/96) |
| **M14** | Fourth operator playtest review, no rules change: Normal toughened, an exfil that would lose the mission asked first, two bugs (a replayed bang, a passed charge not shown), bigger difficulty buttons, BURN BY DAWN in the margin, the squad's back page, lines that go when a man moves, the leader's AP in blue, a fire orange and better flames, Ferme Lebrun drawn, the exchange's lines run to its roof, the bridge's south satchel moved, a clearer sentry | Normal's shots hit from 3 hexes, Easy's from 2; cutting the line or calling the RAF never replays a bang; a hidden man handed a charge shows it; an exfil that would withdraw the mission asks first; the orders still fit at 1280x800; the balance bot is re-run (Normal 94/84/76 with the knife, from 99/90/86) |
| **M13b** | The approved playtest rules: 110° arcs and a Road patrol, next turn's facing shown, a 60° sweep, shots from far off only pin, a stone turns sentries at once, charges left at the exfil, hiding counts double on Easy, Hard keeping the old arcs and range | A shot from more than 2 hexes pins; a stone turns a sentry before the detection check; a man leaving with a charge leaves it before the exfil; hovering an enemy outlines its next turn; the balance bot is re-run at every level |
| **M13** | Third operator playtest review, no rules change but one bug: the orders reworked (level on top, wider, more air), Hide on H and Hold gone, turn cards docked bottom right, keys one to a line, shots and a suppressed band, AP as dots, new gunner and scout symbols, report grouped by man, the mission ended when no one can carry the charges left | The orders fit at 1280x800 with the difficulty first; H hides; a turn card leaves the left of the map clear; a suppress is seen and heard; with every man who could carry a charge dead the mission is withdrawn at once |
| **M12b** | The approved playtest rules: the leader's orders strongest beside him, the knife, the spread zoomed to fit a small window | A man beside the leader gets +2 AP and two chevrons, within 2 hexes +1 and one; any man behind an enemy beside him, not in contact, can knife it for 2 AP and his turn, silently, leaving a body; a 1200-wide window shows the whole spread with no sideways scroll; the balance bot is re-run with and without the knife |
| **M12** | Second operator playtest review: the bridge post a stone can turn, the orders and ring wording, keys in bold, restart, the leader's rollover, bells on the back page, the exchange's wires, rings clear of the names, a shaded spread under the orders, the run tabs on their lines, hedges that meet in a T | A stone thrown north of the bridge post turns it off both piers; the orders fit at 1280x800 and name the places in capitals; every key in the game's text is bold; a second click on a run jumps; restart and Play again start a new seed without a reload; hovering the leader shows his orders; the back page rings bells or tolls; the balance bot is re-run (Normal 81/75/65, from 81/78/69) |

Do not start a milestone before the previous one is merged and playable.
