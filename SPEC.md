# BURN BY DAWN — Specification

The game is called **Burn by Dawn**. *Night Drop* was its working title, and the repo,
branch history and some internal ids (`night-drop-ready`) keep that name.

A turn-based, hex tactical game. Six named British paratroopers land behind enemy lines
and sabotage German infrastructure before dawn. It is an engine plus missions: §1–§11
describe the engine through mission 1, the rail bridge in occupied France. How it looks
and sounds (§11) is in `ART-DIRECTION.md`, and mission 2, the airfield (§13), is in
`MISSION-AIRFIELD.md`, where it differs. Both missions are playable. Mission 3, the
aqueduct (§14), is specified in `MISSION-AQUEDUCT.md` and not yet built.

This file says how the game works **now**. It keeps no history: when and why each rule
came to be as it is, and the balance numbers each change was measured against, are in
`DECISIONS.md`. What comes next is in `ROADMAP.md`.

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
  difficulty.js   the difficulty patches (§10)
  missions.js     the missions and their win conditions (§10)
  rng.js
  render/
    board.js      the map, counters, markers, overlays, motion
    roster.js     the roster rail and a man's particulars
    ui.js         the right page, readout, log, cards, fitting the spread
    theme.js      colour tokens, halftone, the sprite registry, supplied art
    sound.js      cues, supplied recordings, made fallbacks, title music
/data
  missions.json   the missions: files, patches, win condition, words, title card (§10)
  map.json        France's map: terrain rows, drop runs, enemies, routes, objectives, exfil, names
  map-airfield.json  the airfield's (§13), in the same shape
  terrain.json    terrain types (§3)
  roster.json     the six, their traits and dialogue (§5)
  traits.json     trait definitions (hook + modifier)
  enemies.json    enemy types: vision, arc, speed, killable
  rules.json      everything else: costs, detection, alert, noise, combat, scoring
  difficulty.json the levels, as patches over rules.json and enemies.json
  version.json    the build shown in the margin
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

Dawn arrives at the end of the mission's last turn (`turnLimit`): **turn 16** in France, turn 20 on the airfield (§13). That is the clock and the whole pressure.

Each turn:
1. **Player phase** — each trooper has an AP pool. Move (terrain cost) or act.
2. **Detection check** — every enemy tests line of sight against every visible trooper.
   A trooper already in contact who is spotted again is fired on (§6).
3. **Enemy phase** — patrols move along routes, toward a noise they heard, or toward
   last known contact if alerted. An enemy holding contact stays put and faces its man.
4. **Fuse phase** — fuse timers tick down; charges at zero detonate.
5. **Alert decay** — see §6.

Unused AP is not banked. A man at full AP may always move one hex, even onto ground that
costs more than his pool, spending all of it (`minimumStep`), so a wounded man is never
stuck.

### Actions

All costs and modifiers are numbers in `rules.json`. Each action's button shows its cost
under its name ("2 AP", or "all AP" for those that take his whole turn); its rollover
gives the full cost and, when it cannot be used, why not.

- **Hide ("go to ground")** — 1 AP, and **ends his turn**; any AP left is lost. He gets
  **+1 concealment** on the hex he is on: a hiding man is as hard to see as a scout, a
  hiding scout harder still. It protects only the hex he stops on, not hexes he walked
  through earlier that turn. It lasts until he next spends AP, so a man left where he is
  stays hidden for free. A hidden man is marked on his counter.
- **Suppress** (gunner only) — 2 AP, leaving one step to get back into cover. The target
  must be a **visible enemy: within the gunner's spot radius, with a clear line of sight**
  (troopers have no facing arc). A suppressed enemy has its head down: it **does not spot
  or fire at the next detection check and does not move in the next enemy phase**, and
  its view is not drawn. Firing is gunfire: +2 alert, heard 5 hexes (§6). A suppressed
  enemy is open to a **kill** until the end of the next player phase.
- **Return fire** (anyone who is no gunner) — 2 AP (`actions.returnFire`; null turns it
  off), on the same key and button as Suppress. He must be **in contact**, and the target
  must be **an enemy that has him in its sights** (one that spotted him and is watching
  him), within his spot radius with a clear line. It is a gunner's suppress in every other
  way: the enemy's head is down for a turn, it is gunfire (+2 alert, heard 5 hexes), and
  it is open to a gunner's kill. He keeps the AP he has left to get away. Only a gunner
  fires first; a man nobody has seen has no shot. It is the verb for the man who has been
  seen: it pays now (he is not fired on by that enemy) and costs later (the dial, and
  every patrol in earshot coming to look). The button reads Fire back, and its rollover
  and the enemy's hover (a FIRE row) say whether he can, and why not.
- **Kill** (gunner only) — 2 AP. The target must be visible, as for suppress, and
  **under suppression**: suppressed this player phase or the one before, so one gunner
  needs two turns (suppress, then kill) and two gunners can do it in one. A kill is **one
  aimed shot from a silenced Sten**: +1 alert, heard 2 hexes (Cool Head applies to it as
  to gunfire). So a kill from cold costs +3 alert, leaving the garrison Suspicious; the
  body, once found, is the step to Alert. There are no dice: a legal kill always kills.
  The enemy is gone, stops holding anyone in contact, and leaves a **body** (§5 Wounds).
- **Knife** (any trooper) — a **full turn**: he must not have spent any AP yet. The
  target must be **beside him** and **unable to see him** (he is outside its arc), and he
  must **not be in contact**. So he has to end a turn behind an enemy and still be there,
  unseen, when his next turn starts: the risk is the enemy phase in between. It is silent
  — **no alert, no noise** — but it leaves a **body**, found like any other. The turn
  card hints at it when a man starts his turn behind an enemy. (`knife.fullTurn` false
  makes it 2 AP that ends his turn instead.)
- An enemy type marked `killable: false` in `enemies.json` (the reserve squad, §6 Exfil
  watched) can be suppressed but never killed or knifed. It is never outlined as a target,
  and its hover and the Kill and Knife buttons say so.
- **Stabilise** — another trooper spends a full turn beside a wounded man (§5). The
  wounded man gets his **full AP pool back and can carry a charge again**, but he is still
  one hit from death: the wound is dressed, not healed.
- **Pick up a charge** — 1 AP, on a hex with a dropped charge, if he has room for it.
  **Any man has room for one** (`charges.carryAtLeast`), whatever he jumped with: a scout
  or a gunner can pick up a charge left lying, carry it and set it. **Its weight slows
  him**: a man carrying more than he jumped with has **1 AP less** while he carries it
  (`charges.overloadApLoss`), taken at once as he takes it and from each turn's pool
  after, never below 1, before the leader's orders are added. So a charge handed to a
  scout is no faster than a sapper's, only harder to see: a trick worth learning, not
  the best way to set every charge. His particulars and the Pass and Pick up rollovers
  say so. A man whose loadout is
  none is shown Pick up only while a charge lies on his hex, and Charge and Pass only
  while he carries one.
- **Pass a charge** — 2 AP to the giver; the taker pays nothing. One charge to a man
  **beside him** who can carry it: not wounded, and with room (any man has room for one).
  If only one man beside him can take it, pressing it hands it straight over; otherwise
  it is aimed like stabilise, with a blue ring round each man who could take it: press
  it, then click the man.
- **Place a charge** — 1 AP (the `onPlaceCharge` hook may change it), on a charge hex of an
  objective that still needs charges (§7). One charge per charge hex.
- **Cut the line** (scout only) — a **full turn**: he must not have spent any AP yet.
  Standing on a telephone exchange charge hex, he destroys the exchange at once and
  quietly: **no noise**, so nobody comes to look, but the garrison notices its telephones
  go dead: **alert +1**. Being seen does not stop him, though it takes his turn. A man who
  walked onto the point must wait for the next turn, and the button, the target's hover
  and the turn card say so.
- **Throw a stone** (any trooper) — 1 AP, at a hex **up to 3 away**; no line of sight
  needed. It is a noise on that hex (§6): **alert +1**; patrols in earshot go and look in
  the enemy phase, and sentries in earshot turn to face it **at once**, for the rest of
  the player phase and the detection check. You choose where they look, and pay a
  sighting's worth of alert for it. **A throw is not a move:** he stays on his hex.
- **Swim** — a **full turn**. From a hex beside the canal, across one canal hex, to any
  free hex on the far bank beside that same water hex. Never onto or from the lock or the
  bridge, which are not banks. Where the canal is two hexes wide there is no swim. A
  wounded man cannot swim. He cannot hide as he comes out, and is tested on the far bank
  like any hex he enters. It exists so a man is never stranded by his own demolition, and
  so the telephone exchange can be reached without crossing the watched bridge deck: the
  bridge guards the bonus, never the mission. `requiresDestroyed` can gate it on an
  objective.
- **Pack a parachute** — 1 AP, standing on one, his own or anyone's (§9).
- **RAF diversion** (once per mission, while the leader is alive) — no AP, called at any
  point in the player phase. A raid on the town pulls the garrison's attention: the
  **alert drops one state** (to the start of the state below), **every enemy abandons
  its search or held contact** and goes back to its route or post, and **every trooper is
  out of contact**. It does not undo wounds, deaths, bodies already found, or the
  explosion floor (§6). The leader carries the radio: this is a rule keyed to the
  `leader` flag, not a trait. Calling it forfeits the clean-run score (§10). **In a
  pickle** (`diversion.prompt`: the garrison Alarmed, two men in contact at once, or a
  wounded man in contact) the button turns red and says to call it now, and the turn
  card says so second only to a charge about to blow. A mission may turn any of the three
off (the airfield's garrison is Alarmed in every raid, so there only men in contact urge
it). Its name is the mission's
  (`words.diversionName`): the airfield's is a **jeep raid** on the north wire, the same
  rule.

### Desktop interaction

Hover is a first-class mechanic, not a nicety. It is what makes the game readable enough
to be casual while still being strategic.

- **Hover a hex** with a trooper selected: draw the path, its AP cost, and a detection
  risk readout for every hex on it. The player commits only on click.
- **Hover an enemy**: its vision arc and patrol route, and what it will see next turn.
  With a man selected, whether he can suppress, kill or knife it now, and if not, why not
  (a kill wants it suppressed first; a knife wants it looking the other way).
- **Hover an objective**: what it needs (charges, fuse, blast radius) and what it pays.
- **Hover one of our men**: his particulars in the readout (§11).
- **A prompt while Stabilise or Pass a charge is open.** Both are used only now and then
  and were hard to find, so while a man could take either right now (the same check the
  button makes: for Stabilise a wounded man beside him and his whole pool unspent; for
  Pass a man beside him with room, while a target the win needs still wants a charge) it is pointed
  out four ways: the button is set in the End turn button's red dots; his roster portrait
  wears the action's key in red; the readout says what to press, in the orders' blue; and
  the wounded man's, or the taker's, hover names who can help. While aiming either, a blue
  ring circles each man it could go to. The turn card's wounded
  hint names the helper. No prompt outlives its use.
- **Right-click**: deselect / cancel.
- **Undo**: the button beside End turn, `Z`, or `Cmd`/`Ctrl`-`Z` takes back the last move
  or action. How far back it goes is `undo.steps`: one step on Normal and Hard, every step
  back to the start of the turn on Easy. It is forgotten when the turn ends or the stick
  jumps, so nothing the garrison has done is ever undone. The player phase rolls no dice
  (only the drop does), so undo can never re-roll anything: it is a mis-click safety net,
  not a scouting tool.
- **Keyboard**: `1`–`6` select trooper, `Tab` cycle, `Space` end turn, `Esc` cancel,
  `R` patrol-route overlay, `?` or `/` how to play (§11), `M` sound on or off. Actions:
  `H` hide, `S` suppress or return fire, `K` kill, `N` knife, `T` throw a stone, `A` stabilise (aid),
  `P` pick up a charge, `E` pass a charge, `C` place a charge, `X` cut the line, `W` swim,
  `U` pack a parachute, `D` RAF diversion, `Z` undo. An action with a target outlines where it can go and waits
  for a click; `Esc` backs out of it.

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

There is **no fog of war.** Enemies are always drawn. The hidden resource is alert.

Each enemy has a vision radius (3) and a facing arc (110°). A trooper inside it, with line
of sight, is tested:

```
detection = base(enemy, 3) - cover(none 0, light 1, heavy 2) - concealment(trooper)
            + proximity (+2 beside it, +1 two hexes off) + the alert state's detectionBonus
```

He is spotted at the threshold, **3**. The hover readout shows the sum as dots: "2 of 3
dots". The player must see risk before committing.

**Garrison alert has four states**, shown as a dial on the right page:

| State | From | Effect |
|---|---|---|
| **Calm** | 0 | Patrols walk fixed routes. |
| **Suspicious** | 2 | Vision +1. Patrols pause every other turn and sweep 60°. |
| **Alert** | 4 | Vision +1. **Detection +1**: light cover no longer hides a man in the open arc. Hearing +1. |
| **Alarmed** | 7 | As Alert, and every patrol hunts the last known contact. The reserve squad enters and watches the exfil. |

The alert is a **points total**; "From" is where each state begins, and points cap at
Alarmed. One event is not a whole state: a single sighting leaves the garrison Calm, a
second makes it Suspicious.

Raised by: being spotted (+1, only when he was not already in contact), gunfire (+2), a
silenced kill (+1), an explosion (+3, the fuel dump +4), a body found (+1), a parachute
found (+1, §9), a thrown stone (+1), the telephone line cut (+1). Enemy fire raises
nothing extra: the sighting that caused it already counted.

**Decay:** after 4 quiet turns (no alert raised, nobody spotted) the points drop to the
start of the state below; in Calm, to 0.

**Explosion floor:** once any charge has exploded, the alert never decays below
Suspicious again.

What this does to a run: the bridge alone leaves the garrison Suspicious; the bridge plus
a cut telephone line still does; the bridge plus the fuel dump is Alarmed.

### Noise: the dial is global, the reaction is local

Every **noise** happens at a hex and is **heard within a radius**: parachute or body found
3, thrown stone 3, gunfire 5, silenced shot 2, explosion 7, plus the state's hearing bonus.
**A sighting is not a noise**: the enemies that spot a man hold and face him, but nobody
else comes unless something is heard. Hearing is distance only; walls do not stop sound.
Patrols that hear it leave their route, walk to that hex, sweep, and go back to their
route. Enemies out of earshot feel only the dial.

**The turn the patrols set out** (`patrols.setOutTurn`; 1 in France: they walk from the
start). Where a mission sets it later, nothing walks its route until that turn's enemy
phase: every patrol stands where the map put it. Standing is not sleeping: it sees,
turns to a man it spots and holds him, and goes to a noise as ever. The airfield's is 2
(§13), so the stick has one turn on the ground, and a second player phase, before the
patrols come round. An enemy's hover says it stands this turn, the turn card says so on
turn 1, and next turn's facing is shown as ever.

**Sentries cannot leave their post.** A sentry that hears a noise turns to face it in the
enemy phase and holds that facing through the next player phase and detection check,
then turns back to its facing in `map.json`. A thrown stone turns sentries in earshot
**at once**, in the player phase, through that turn's detection check — so a stone opens
the ground now, for the men who still have AP.

**Next turn is shown:** every enemy that will face a new way after the coming enemy
phase shows it as a hollow dashed wedge beside its solid one, and hovering an enemy
outlines what it will see next turn from where it will stand. It is the same sum the turn
will do, so it changes as the men move.

The most recent noise hex, or the hex of a first sighting, is the **last known contact**
that every patrol hunts at Alarmed. Seeing a man already in contact again does not move it.

**A repeat is not a new contact.** An event on a hex that enemies are already heading to
or searching updates that contact instead: nobody new sets off, the search is not
restarted, and the turn report says it once.

### Contact and enemy fire

Being spotted is a warning, not a wound:

1. **Detection check, turn N** — an enemy spots a trooper. The alert rises by 1. He is
   **in contact** and wears the spotted marker. In the enemy phase every enemy that
   spotted him **stays put and turns to face him**, so the player can see who has him.
2. **Player phase, turn N+1** — he has one turn to break contact: get out of sight, hide,
   get distance, return fire himself (§4), or have a gunner suppress (or someone kill)
   whoever is watching.
3. **Detection check, turn N+1** — if any enemy spots him again, **he is shot** (§5
   Wounds). The alert does not rise again. A suppressed enemy does not fire. If nobody
   spots him, contact ends.

**An enemy fires at one man a turn:** of the men already in contact it spots, the one it
has in its sights (the one it turned to face), else the nearest, else the first in the
roster. The others it sees stay in contact and are not shot by it that turn. So a man who
holds an enemy's eye can draw its fire while another slips past: hunter and hunted. It
turns to face whoever it fired at.

The hover readout marks every path hex where a man in contact would be shot, and whether
it would hit or pin him there, so being fired on is never a surprise. Where he is seen
but every enemy seeing him is firing at another man, it says NOT SHOT and at whom.

### Exfil watched

At Alarmed the reserve squad enters from the road edge (`reserve.entryHexes`), marches to
a guard hex beside the exfil, and stands there as a sentry facing it. The player sees the
exit narrowing and routes around it. It **cannot be killed** (`killable: false`): it is a
squad, not one man, and at Alarmed a kill would cost nothing and reopen the exfil for
free. It can be suppressed for a turn to slip past. Its counter reads RESERVES.

### Reinforcements

Blowing a target makes the garrison call up **reinforcements**: its kind's
`reinforcements` in `rules.json` (0 on Easy and Normal; on Hard the bridge 2 and the fuel
dump 1). They come on in the **enemy phase after the bang**, at the road's south end beside
the exfil (`reinforcements.entryHexes`), and march to **posts** on the ways into the exfil
— each squad the next post in order — where they stand as sentries. They are **patrols**,
so they can be suppressed and killed. The call goes by telephone: **none come once the
telephone exchange is down**, which makes the exchange the first job on Hard. The target
rings, the hovers and the mission panel say so, and the turn report says when they are
called and when they come on.

---

## 7. Sabotage

Three objectives, each on a different approach. Their numbers are per kind in
`rules.json` `objectives`; their hexes and charge points are in `map.json`.

| Objective | Needs | Blast / kills within | Alert | Pays |
|---|---|---|---|---|
| **Rail Bridge** (PRIMARY) | 2 charges | 1 / 1 | +3 | the win; becomes canal |
| **Telephone Exchange** | 1 charge, or cut the line | 1 / 1 | +3 (cut +1) | no reserve, no reinforcements |
| **Fuel Dump** | 1 charge | 2 / 1 | +4 | the two nearest patrols leave the board |

1. **Rail Bridge** — the charges go on the **piers, placed from the west canal bank**
   beside the bridge, not on the deck. The deck is in the bridge post's view every turn;
   the west bank is walked by the bridge patrol only some turns, so the skill is timing,
   not luck. The post stands on the east bank just north of the bridge: at rest it looks
   over the north pier, and a stone thrown north of it from the west bank turns it off
   both piers for a turn. **A destroyed bridge is gone**: its hexes become canal, and the
   only way over is to swim.
2. **Telephone Exchange**, in the village of Bellecour, over the canal — 1 charge, or a
   scout cuts the line (§4): silent, no charge used, the same bonus.
3. **Fuel Dump and tank laager** — on the fields below the ridge, near the patrol base.
   The largest blast.

Every objective lists its **charge hexes**: where a trooper stands to place a charge. An
objective may list **more charge points than it needs charges** (the exchange has three
and needs one): they are a choice of where to stand, not a count, and the orders, target
rings and hovers must say so. Once an objective has every charge it needs, its empty
charge points are no longer drawn. A kind may set **`chargePointMoveCost`**: what a man
pays to step onto any of its charge points, whatever the ground. The fuel dump's are on
the ridge (2) and cost 1, so a man beside it is not stalled with nothing left to set the
charge. It is for the men only: the garrison walks the ridge at its own cost.

A charge sets a **3-turn fuse** by default. The fuse burns down in every fuse phase,
including the one at the end of the turn it was placed, and the charge goes off at 0: a
charge placed on turn N goes off at the end of turn N+2. Charges can be placed and left.
An objective is destroyed once as many of its charges have gone off as it needs, in the
same turn or not.

A trooper within a charge's **kill radius** at detonation dies, wounded or not. Inside the
**blast radius** but past the kill radius (only the fuel dump has such a ring) he takes
**one hit**, as from a shot. The hover path warns of both. **An enemy anywhere inside the
blast radius dies**, unless its type cannot be killed; it leaves no body (the bang is what
the garrison hears; a body found after it would count the same event twice), and it stops
holding anyone in contact.

**One objective, one explosion:** charges on the same objective that detonate in the same
fuse phase are one explosion — the alert rises once and the noise is heard once. Timing
the bridge's two fuses together is therefore worth a whole alert step.

**Time pencils** (`charges.fuseChoice`; null in France, where a charge is set with the
one fuse as above), called **timers** on screen. Where a mission gives a `{ min, max }`,
the man setting a charge picks its fuse from that many turns, and his `onPlaceCharge`
fuse hook applies to whichever he picks (Steady Hands: a turn off each).
- **Two plain steps.** The button reads **Charge + timer**. **C** opens **the tin of time
  pencils** on the map beside the man, in whichever of the eight places round him covers
  least of his blast and his counter: an olive tin stencilled SWITCH, DELAY, No. 10 · TIME
  PENCILS, a pencil for each length, banded in the real colours (black, red, white, green,
  yellow, blue, shortest to longest) with the turn it goes off ("4 TURNS on turn 19").
  Click a pencil or press its number to lift it; **SET**, **Enter** or **C** again sets
  the charge with the one lifted; **Esc** or Back puts the tin away. Undo takes it back.
- **Which is offered first:** the default (`fuseTurns`), or if that is too short, the
  shortest longer one that lets every man get clear.
- **Getting clear.** While the tin is open the board shows the charge's blast in red, the
  chain's included. A timer that would catch a man who could not walk off that ground in
  time (his AP left this turn, a full pool each turn after) reads **too short** in red and
  names him. One that would go off after dawn is struck out and cannot be picked.
- **Once set**, the stopwatch is divided into the charge's own length, its hover and its
  target's say the turn it blows, and the blast to come stays on the board, faint with a
  dashed edge, until its turn.

**A blast that sets off its neighbours** (`setsOff` on an objective kind; false in France).
When an objective of such a kind is destroyed, every intact objective with a hex inside
its blast radius (measured from the charges that went off) goes up with it: destroyed,
counted toward the win, scored as its own, its payoff paid, and its own blast felt round
its own hexes, killing and wounding by its own radii. It is still **one explosion**: one
alert rise and one noise, the setting-off objective's. A charge already set on a caught
objective is spent. A caught objective whose kind sets off carries the chain on. Its
target ring and hover name what it takes ("SETS OFF 2 JU 52S"); the path warnings include
every blast in the chain; and a setter still standing counts toward what the stick can
still do, so losing a bomb is not a withdrawal while the setter could make it up.

**The goods train** (`train`; null unless a mission gives one: France's). **Scenery with
a timetable.** A train runs the map's railway from its west end, four hexes a turn, five
hexes long, and is **on the Rail Bridge in the garrison's turn 10**. It comes onto the
board three turns before, so it is watched coming: on the west edge in turn 8, four
hexes on in turn 9, three short of the bridge in turn 10, across it in turn 11, and off
the east edge by turn 14. **The bridge down within a turn of it** (in the fuse phase of
turn 9, 10 or 11) **wrecks it and pays 5** on the back page (§10): on 9 the engine runs
into the gap, on 10 it goes down with the bridge, on 11 its tail does. With France's
three-turn fuse that is a charge set on turn 7, 8 or 9 (Dutch's a turn later): about
when a stick that has come straight from the drop reaches the bridge, so it is a train
to be in time for, not one to wait for, and the five or six turns left before dawn are
for a bonus target and the walk out.
- It **sees nobody, raises nothing, makes no noise and blocks no hex**; a man may stand on
  the line as it passes. Its one rule is the score.
- The bridge down earlier, with the train already on the board, stops it at the west
  bank; down before it set out, none comes; down after it has gone by, it runs on.
- Where it is follows from the turn and the turn the bridge went down, so nothing about
  it is kept in state, and its hover, the bridge's (a TRAIN row), the orders, the mission
  panel ("Goods train +5 · turn 10") and the turn card say when it is due. The turn card
  says so first on the turns a charge set now would catch it. The turn report says when
  it comes on, crosses, stops or is wrecked.
- By the bot (`TRAIN=1`: charges held, hidden on the charge points, until they would
  catch it): on Normal a stick that tries for it catches it in 91 to 95 games in 100,
  waiting under a turn at the bridge, and wins 94 / 95 / 97 against 87 / 86 / 94 for
  setting the charges on arriving, which catches it by chance in 15 to 29. On Hard it is
  a stretch: the stick is at the bridge a turn later, catches it in 36 to 54 games in
  100, and wins 37 / 39 / 53 against 39 / 41 / 42.

The spine in practice: blow the fuel dump first and the bridge approach becomes a hunt.
Blow the bridge last and you may not have turns left to reach exfil.

**Only the primary is needed to win (§10).** The secondaries are bonus targets, worth
score and costing alert, and each **pays back in play** (a `payoff` per kind, never a code
branch for one objective): the exchange stops the garrison calling up its reserve squad
(if it is already out, it stays) and its reinforcements; the fuel dump sends the two nearest
patrols off the board to fight the fire, on top of any the blast kills. The target rings,
the hovers and the mission panel say what each pays before the player commits, and the
turn report says when it happens.

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

Every mission ends in one of three outcomes:

- **Success:** the primary destroyed AND at least **3** troopers out by the exfil by
  dawn (§4).
- **Withdrawn:** the mission can no longer succeed, but the stick is not wiped out —
  fewer men alive or already out than are needed, or not enough charges left anywhere
  (carried, dropped or set) to finish the primary (a dropped charge counts only while a
  man still on the board could carry it), or nobody left on the board with the primary
  intact. The mission ends at once: every man still on the board gets out, then any
  charges still burning go off (they can still finish an objective).
- **Failed:** dawn arrives without success, or every man is dead. A man still on the
  board at dawn is left behind and does not count as out.

The mission also ends when nobody is left on the board (all out or dead), after any
charges still burning have gone off.

**Asked before it is lost:** a move onto the exfil that would end the mission short of
success is held back by a card — "Are you sure? Mission not yet complete. An exfil now
will end it: WITHDRAWN." — with the reason; Enter or its button goes anyway, any other key
or click stays. The hover readout says it first, and charges still burning that would
finish the job are counted.

**Exfil** is a short run of hexes on the **south map edge**, away from all three drop runs.
A trooper who ends a move on an exfil hex is out: removed, safe, and counted. A man
carrying a charge does not take it out: he leaves it on the hex he stepped off from.

**The way out on a timetable** (`exfil.opensTurn`; null in France and on the airfield,
whose exfil is open all night). Where a mission gives a turn, **no man may enter an exfil
hex before that turn's player phase**: until then those hexes are not ground at all, to
the men or the garrison. From that turn until dawn they are the way out as above. Nobody
is taken off the board by its opening: a man goes out by ending a move there, with the
card above if it would end the mission short.

**The results page** is the back page of the annual: all six by name and fate (out,
killed, left behind), the level, and the score, whatever the outcome:

- Each objective destroyed, blown or cut: its kind's `score` (the Rail Bridge 10, the
  Telephone Exchange 4, the Fuel Dump 5). Meeting the win condition pays `scoring.win` on top: 0 in France, whose
  bridge carries its own 10; a mission with no primary pays it for the job done.
- Each man out: 2 if never hit, 1 if wounded, dressed or not.
- Each man out who was never spotted all mission: 1 more. His roster rollover says
  whether he is still unseen.
- Each enemy killed by a knife or a gunner's shot: 1, less 1 for each of their bodies
  the garrison finds (so a kill nobody finds is worth 1, one they find nothing). A blast's
  kills score nothing, or blowing a target up beside a patrol would pay.
- **The goods train** (§7): where a mission has one, its target down within a turn of it:
  5 ("Goods train wrecked with it").
- **The salvo** (`scoring.salvo`; null in France, which has one fuse and one primary):
  where a mission gives `{ count, points }`, that many or more of the win's targets going
  up in one fuse phase, set off by a neighbour or by charges timed to the same turn, pays
  `points` ("4 Aircraft up in one bang"). The airfield's is 4 for 3 (§13).
- **The clean run**: never reached Alarmed (`scoring.cleanNeverReached`) and never called
  the RAF diversion: 3. A mission may ask only about the night before the first bang
  (`scoring.cleanUntil: "firstExplosion"`) and name a lower state: the airfield's is
  **below Alert when the first bang goes**, whatever comes after (§13). The orders say it
  is there, in the mission's words (`words.cleanOrders`; France's: "Getting in and out
  with as little enemy attention as possible earns a special bonus!").

The bridge is worth 10 so that the job done with three men out (22 on a clean run) edges
out the best retreat (21); a full success tops out at 45 before kills. The score is the
same sum at every level. Targets of one name share a line ("3 Stukas destroyed").

**The rating.** A mission accomplished is rated against the mission's score bands
(`ratings` in `missions.json`: lowest first, each a `from` score and a `label`), printed
under the score as the annual's "how did you score?" table, best first, the band earned
in bold with its name in red above. A withdrawal or a failure is not rated: the outcome
is the verdict. The bands are set against the bot's winning scores on Normal
(`SCORES=1`): the job alone with most men out lands in the middle two, and the top wants
the bonus targets or a spotless night. France: under 28 SCRAPED HOME, 28 A GOOD NIGHT'S
WORK, 36 MENTIONED IN DESPATCHES, 40 ONE FOR THE ANNUAL; the airfield: 36, 43 and 50.
Nothing is stored: it rates the game just played.

### Missions

The game is an engine plus missions, listed in `data/missions.json` in the order the
contents page prints them. A mission is data only, and no code asks which is on:

- A **playable** mission names its `map` and `roster` files, and a `rules` and `enemies`
  patch merged over `rules.json` and `enemies.json` the way a difficulty level's is; the
  mission's go first, then the level's. A patch key must already exist, except that a
  mission may add a new objective kind or enemy type. France's patches are its dawn (`turnLimit` 16) and its goods train (§7): the rest
  is the files as they are.
- Its **own part of each level** (`levels.<id>` in `missions.json`: a `rules` and
  `enemies` patch and a `summary`) goes over the level's own patch, and its summary is
  printed before the level's. What a level does to one mission's targets lives there
  (France: the bridge's one charge on Easy, the reinforcements on Hard); what it does in
  every mission lives in `difficulty.json`.
- Its **win condition** is one of a short fixed list in `missions.js`, in the spirit of the
  trait hooks: `destroyPrimary` (the objective `map.json` marks primary; France) or
  `destroyCount` (any `count` objectives of one `kind`). Success is the win condition met
  and `minimumOut` men out by dawn; withdrawal counts the charges short of it.
- Its own words live with it: the orders' opening line, the tagline under the title card,
  the phrases for its cut line and the diversion's name, card and log line, its title card
  (the game's, France's, until its own is painted; `titleCardLettered` false if the title
  is not painted in), the diversion's sound and its back-page sounds. A `dialogue` patch may replace any of the men's lines for it;
  they are still the one roster.
- The map's `primary` flag is asked for only by `destroyPrimary`, which wants exactly one;
  a `destroyCount` map has none, and at least `count` of its kind. The target rings, the
  ★, the mission panel, the hints, the Pass prompt and the bot all ask the win condition
  which objectives it needs. Where any few of many will do, each is ringed once and the
  first carries one note ("ANY FOUR AIRCRAFT!"), and the mission panel gives the kind one
  line.
- A **coming** mission is printed on the contents page but stamped NEXT YEAR'S ANNUAL,
  and cannot be picked. A **draft** one is printed and stamped the same, but can be
  played by its address: how a mission is tried on the live site before it is announced.

`?mission=<id>` in the address picks a playable or draft mission and goes straight to its orders;
`MISSION=<id>` does the same for the balance bot. Every mission keeps the 18×13 board.

### Difficulty

Three levels, chosen on the orders before the drop and fixed once the stick jumps. The
numbers in this spec are Normal's. A level is data only: a patch over `rules.json` and
`enemies.json` in `data/difficulty.json`, then the mission's own part of it (§10
Missions), and no code asks which level is on. It is shown
beside the seed and on the back page, and `?difficulty=easy|hard` picks it.

| Level | Changes from Normal |
|---|---|
| **Easy** | The bridge takes 1 charge; 2 men out will do; the RAF can be called twice; the leader's orders reach 3 hexes; hiding gives +2 concealment; shots hit only from 2 hexes off; undo goes back to the start of the turn |
| **Normal** | The mission as above |
| **Hard** | 4 men must get out; every enemy sees 4 hexes in a 120° arc; blowing the bridge calls up 2 squads of reinforcements and the fuel dump 1, none once the exchange is down (§6) |

### Balance

The balance bot (`node tools/balance-bot.mjs 300 naive`, with `KNIFE=1`) plays whole
missions through the rule functions. Its win rates show which way a change pushes, not
the absolute answer; it never calls the diversion or stabilises, returns fire only when run with `FIRE=cornered` or `FIRE=always`, and only its `hunter`
style goes looking for kills, and it packs no parachutes unless run with `PACK=1`, so a
person does better. Current baselines, win % west / north / east: **Easy 100 / 100 / 97,
Normal 87 / 86 / 94, Hard 39 / 41 / 42**; packing every chute on turn 1 (`PACK=1`):
Easy 100 / 99 / 97, Normal 92 / 91 / 95, Hard 53 / 43 / 42. Easy and Normal are meant to
be kind to casual players; Hard is the real test. Any rules, map or enemy change is re-run against these and
the shift logged in DECISIONS.md.

The `hunter` style (`node tools/balance-bot.mjs 300 hunter`) walks each man behind the
nearest killable enemy to knife it, and closes a gunner to suppress and kill. By default
only the men with no charge to place hunt; `HUNTERS=all` sends everyone, until the bridge
is down or turn `HUNT_TURNS` (12). It is the check on the second pillar: kill-everything
must not be the best way to play. It moves as the `careful` style does, so it is measured
against `careful` on the same run. France, 200 seeds, W/N/E:
Normal careful 90 / 79 / 72, hunter 72 / 77 / 71, `HUNTERS=all` 51 / 49 / 45; Hard careful
63 / 50 / 57, hunter 16 / 25 / 15, all 12 / 12 / 13: below or level on Normal and far below on
Hard, since a 16-turn night has few turns to spend hunting until turn 12. Its numbers, against the baselines, are in DECISIONS.md.

**Targets** (proposed at the v1.0 gate; the playtest in `docs/PLAYTEST.md` confirms or
moves them). What they are for is people, so the first three are measured on players new
to the game, and the bot's ranges are the guard rails a change must stay inside:

| Level | Players | Naive bot, every run | Hunter bot |
|---|---|---|---|
| **Easy** | A first try usually wins | 95 or more | — |
| **Normal** | Most win within three tries | 75 to 90 | Below careful on the same run (a few points over is the bot's noise) |
| **Hard** | The real test: a win is earned | 25 to 45 | Below careful on the same run (a few points over is the bot's noise) |

Today France's runs are inside them but Normal's East, 4 over; the airfield's are in §13.

---

## 11. Art direction

**In `ART-DIRECTION.md`**, a file of its own and as authoritative as this one: the spread,
colour, print and type, the board, counters and markers, the hover readout and the turn
log, the cards, the opening before the drop, motion and feedback, and sound. Read it
before touching anything the player sees or hears.

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

**M41, the aqueduct's map as a draft** (Phase 4; §14, `MISSION-AQUEDUCT.md`): played by
its address, `?mission=aqueduct`, still stamped NEXT YEAR'S ANNUAL on the contents page.
`data/map-aqueduct.json` and its terrain, drawn in code; the garrison, the two
objectives and the three drop runs; the canister and the closed exfil on the board, in
the hovers, the orders and the turn report (M40 gave them rules and no pictures or
words); the boat as scenery; and the balance bot taught to fetch from the canisters and
to wait for the boat. Read `ART-DIRECTION.md` first. Then M42, balance; M43, words,
sounds and the art hand-off. v1.0 is tagged.

### Done

Each is recorded in full in DECISIONS.md and the git history.

| # | What it did |
|---|---|
| M0–M6 | The engine: hex grid, terrain, units, traits, enemies and alert, combat, sabotage, the drop |
| M7–M8e | The art pass, killing, the first balance pass, supplied art, undo |
| M9–M10 | Difficulty levels, the drop runs tagged, sound |
| M11–M24 | Fourteen playtest reviews: swimming, passing a charge, the knife, narrower arcs, next turn shown, the garrison's turn shown, kills that score, painted art and music, the score re-weighted, the readout and log reworked |
| M25–M26d | Housekeeping; active play (prompts, lines, the hunter bot); the knife a whole turn, the Wood patrol; the v1.0 gate |
| M27–M27b | Missions architecture: `data/missions.json`, win conditions as data, the contents page. Tagged v1.0 |
| M28–M31d | Mission 2, the airfield (§13): the engine work, the map, time pencils and the bowser, its words, sounds and art, the operator's notes |
| M34–M34b | France's goods train: scenery with a timetable, on the Rail Bridge in turn 17 (turn 10 since M37), 5 points for the bridge down within a turn of it |
| M33–M33b | The airfield's bomb store, a second target that sets off its neighbours, and the salvo score; Hard wants seven aircraft; France's Fuel Dump sends two patrols away and scores 5 |
| M40 | The aqueduct's engine work, off in both missions: supply canisters (§9) and the way out on a timetable (§10) |
| M39 | Mission 3, the aqueduct, specified (§14): southern Italy 1941, every charge in a canister, a boat on a timetable, a tidy win ending at Alert. The airfield's line on the contents page reworded |
| M38–M38b | France's dawn at the end of turn 16 (15 for a turn), its top rating from 40; a charge a man did not jump with costs him 1 AP while he carries it |
| M37 | The goods train on turn 10; any man can carry one charge he picks up or is handed; CHARGES ARE SET. GET CLEAR! over a target with its last charge |
| M36 | Return fire, for a man who has been seen; the airfield's patrols set out on turn 2 |
| M35 | The operator's notes: the goods train runs between turns, trimmed in blue and paper, and whistles as it comes on; the Rail Bridge's DESTROYED printed below it; the bomb store's rails clear of its name |
| M32–M32c | The review before Phase 4: the airfield's own clean run and diversion prompt, the rating on the back page, this spec trimmed, §11 and §13 moved to files of their own, the clean run named on the orders |

---

## 13. Mission 2 — the airfield

**In `MISSION-AIRFIELD.md`**, a file of its own and as authoritative as this one: the
mission, its ground, map, garrison and objectives, its numbers for the two rules of §7
(time pencils and a blast that sets off its neighbours), its own clean run, its words,
sounds and pictures, and its balance baselines.

Each mission after the first has a file like it (`MISSION-<NAME>.md`), written before the
mission is built, and this spec gains only the engine rules the mission needs.

---

## 14. Mission 3 — the aqueduct

**In `MISSION-AQUEDUCT.md`**, specified and not yet built: southern Italy, February 1941.
One big target that takes four charges, every charge down in a supply canister, and a
boat that is in to the beach from turn 15 and gone at dawn. Its two rules are engine
rules, written above: supply canisters (§9) and the way out on a timetable (§10).
