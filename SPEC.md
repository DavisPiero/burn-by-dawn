# BURN BY DAWN — Specification

The game is called **Burn by Dawn**. *Night Drop* was its working title, and the repo,
branch history and some internal ids (`night-drop-ready`) keep that name.

A single-mission, turn-based, hex tactical game. Six named British paratroopers land in
occupied France and sabotage German infrastructure before dawn.

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
  drop.js         drop runs, scatter
  scoring.js      win, withdraw, lose, score
  hints.js        the turn card's hints (§11)
  difficulty.js   the difficulty patches (§10)
  rng.js
  render/
    board.js      the map, counters, markers, overlays, motion
    roster.js     the roster rail and a man's particulars
    ui.js         the right page, readout, log, cards, fitting the spread
    theme.js      colour tokens, halftone, the sprite registry, supplied art
    sound.js      cues, supplied recordings, made fallbacks, title music
/data
  map.json        terrain rows, drop runs, enemies, routes, objectives, exfil, names
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

Dawn arrives at the end of **turn 20**. That is the clock and the whole pressure.

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
- **Kill** (gunner only) — 2 AP. The target must be visible, as for suppress, and
  **under suppression**: suppressed this player phase or the one before, so one gunner
  needs two turns (suppress, then kill) and two gunners can do it in one. A kill is **one
  aimed shot from a silenced Sten**: +1 alert, heard 2 hexes (Cool Head applies to it as
  to gunfire). So a kill from cold costs +3 alert, leaving the garrison Suspicious; the
  body, once found, is the step to Alert. There are no dice: a legal kill always kills.
  The enemy is gone, stops holding anyone in contact, and leaves a **body** (§5 Wounds).
- **Knife** (any trooper) — 2 AP, and **ends his turn**. The target must be **beside him**
  and **unable to see him** (he is outside its arc), and he must **not be in contact**.
  It is silent — **no alert, no noise** — but it leaves a **body**, found like any other.
  The turn card hints at it when a man starts his turn behind an enemy. `knife.fullTurn`
  makes it a full turn instead, a lever if it proves too strong.
- An enemy type marked `killable: false` in `enemies.json` (the reserve squad, §6 Exfil
  watched) can be suppressed but never killed or knifed. It is never outlined as a target,
  and its hover and the Kill and Knife buttons say so.
- **Stabilise** — another trooper spends a full turn beside a wounded man (§5). The
  wounded man gets his **full AP pool back and can carry a charge again**, but he is still
  one hit from death: the wound is dressed, not healed.
- **Pick up a charge** — 1 AP, on a hex with a dropped charge, if he can carry one.
- **Pass a charge** — 2 AP to the giver; the taker pays nothing. One charge to a man
  **beside him** who can carry it: not wounded, and with room (a scout carries none).
  Aimed like stabilise: press it, then click the man.
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
  `leader` flag, not a trait. Calling it forfeits the clean-run score (§10).

### Desktop interaction

Hover is a first-class mechanic, not a nicety. It is what makes the game readable enough
to be casual while still being strategic.

- **Hover a hex** with a trooper selected: draw the path, its AP cost, and a detection
  risk readout for every hex on it. The player commits only on click.
- **Hover an enemy**: its vision arc and patrol route, and what it will see next turn.
- **Hover an objective**: what it needs (charges, fuse, blast radius) and what it pays.
- **Hover one of our men**: his particulars in the readout (§11).
- **A prompt while Stabilise or Pass a charge is open.** Both are used only now and then
  and were hard to find, so while a man could take either right now (the same check the
  button makes: for Stabilise a wounded man beside him and his whole pool unspent; for
  Pass a man beside him with room, while the primary still wants a charge) it is pointed
  out four ways: the button is set in the End turn button's red dots; his roster portrait
  wears the action's key in red; the readout says what to press, in the orders' blue; and
  the wounded man's, or the taker's, hover names who can help. The turn card's wounded
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
  `H` hide, `S` suppress, `K` kill, `N` knife, `T` throw a stone, `A` stabilise (aid),
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

Spot radius matters only to a gunner's suppress and kill (a ridge adds 1).

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
   get distance, or have a gunner suppress (or someone kill) whoever is watching.
3. **Detection check, turn N+1** — if any enemy spots him again, **he is shot** (§5
   Wounds). The alert does not rise again. A suppressed enemy does not fire. If nobody
   spots him, contact ends.

The hover readout marks every path hex where a man in contact would be shot, and whether
it would hit or pin him there, so being fired on is never a surprise.

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
| **Fuel Dump** | 1 charge | 2 / 1 | +4 | the nearest patrol leaves the board |

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
charge points are no longer drawn.

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

The spine in practice: blow the fuel dump first and the bridge approach becomes a hunt.
Blow the bridge last and you may not have turns left to reach exfil.

**Only the primary is needed to win (§10).** The secondaries are bonus targets, worth
score and costing alert, and each **pays back in play** (a `payoff` per kind, never a code
branch for one objective): the exchange stops the garrison calling up its reserve squad
(if it is already out, it stays) and its reinforcements; the fuel dump sends the nearest
patrol off the board to fight the fire, on top of any the blast kills. The target rings,
the hovers and the mission panel say what each pays before the player commits, and the
turn report says when it happens.

---

## 8. Routes

The map supports **three viable approaches**, each with a distinct cost:

- **Canal towpath** — heavy cover, slow, marsh, but runs directly under the bridge.
- **Hedgerow lanes** — the middle path. Balanced, crosses two patrol routes.
- **Wood and ridge line** — fast and good spotting, and the quiet one: the base patrol
  walks the fields south of the fuel dump, not up onto the ridge.

A **Road patrol** walks the road that runs north–south through the middle of the board,
from the south fields to the north edge and back. A **lane** runs east from the road's
south end to the lock, so a man swimming back near the exfil lands on firm ground; it is
not a crossing (the lock meets only the west bank).

Seven enemies in all: the bridge post and the base post (sentries), and the bridge,
lanes, village, base and road patrols.

No route reaches all three objectives efficiently. The drop runs are told apart by what
they are good for, one word each (`tag` in `map.json`), shown with the run's name:
**West · QUIET** (under cover the whole way, the fewest sightings, the longest walk),
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

---

## 10. Win, lose, score

Every mission ends in one of three outcomes:

- **Success:** the primary destroyed AND at least **3** troopers out by the exfil by the
  end of turn 20.
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

**The results page** is the back page of the annual: all six by name and fate (out,
killed, left behind), the level, and the score, whatever the outcome:

- Objectives destroyed: the primary 10, each secondary 4.
- Each man out: 2 if never hit, 1 if wounded, dressed or not.
- Each man out who was never spotted all mission: 1 more. His roster rollover says
  whether he is still unseen.
- Each enemy killed by a knife or a gunner's shot: 1, less 1 for each of their bodies
  the garrison finds (so a kill nobody finds is worth 1, one they find nothing). A blast's
  kills score nothing, or blowing a target up beside a patrol would pay.
- Never reached Alarmed and never called the RAF diversion: 3.

The bridge is worth 10 so that the job done with three men out (22 on a clean run) edges
out the best retreat (21); a full success tops out at 39 before kills. The score is the
same sum at every level.

### Difficulty

Three levels, chosen on the orders before the drop and fixed once the stick jumps. The
numbers in this spec are Normal's. A level is data only: a patch over `rules.json` and
`enemies.json` in `data/difficulty.json`, and no code asks which level is on. It is shown
beside the seed and on the back page, and `?difficulty=easy|hard` picks it.

| Level | Changes from Normal |
|---|---|
| **Easy** | The bridge takes 1 charge; 2 men out will do; the RAF can be called twice; the leader's orders reach 3 hexes; hiding gives +2 concealment; shots hit only from 2 hexes off; undo goes back to the start of the turn |
| **Normal** | The mission as above |
| **Hard** | 4 men must get out; every enemy sees 4 hexes in a 120° arc; blowing the bridge calls up 2 squads of reinforcements and the fuel dump 1, none once the exchange is down (§6) |

### Balance

The balance bot (`node tools/balance-bot.mjs 300 naive`, with `KNIFE=1`) plays whole
missions through the rule functions. Its win rates show which way a change pushes, not
the absolute answer; it never calls the diversion or stabilises, and only its `hunter`
style goes looking for kills, so a person does better. Current baselines, win % west / north / east: **Easy 100 / 100 / 97,
Normal 93 / 83 / 88, Hard 47 / 33 / 38**. Easy and Normal are meant to be kind to casual
players; Hard is the real test. Any rules, map or enemy change is re-run against these and
the shift logged in DECISIONS.md.

The `hunter` style (`node tools/balance-bot.mjs 300 hunter`) walks each man behind the
nearest killable enemy to knife it, and closes a gunner to suppress and kill. By default
only the men with no charge to place hunt; `HUNTERS=all` sends everyone, until the bridge
is down or turn `HUNT_TURNS` (12). It is the check on the second pillar: kill-everything
must not be the best way to play. Its numbers, against the baselines, are in DECISIONS.md.

---

## 11. Art direction

**The reference is a board game printed in an 80s British comic annual.** Cheap paper,
limited spot colours, slight misregistration, die-cut counters. Clarity beats texture: the
board must read at a glance.

### The spread

- The whole game is a **double-page spread**. Board on the left page. The right page
  carries, from the top: a fixed strip (the turn counter; End turn, which is the JUMP!
  button before the drop, and Undo; the selected man's actions), the alert dial and the
  RAF diversion, the mission panel, and the **roster rail: all six portraits, always
  visible**, six compact slots that fit at 1280x800 without scrolling, greying out as men
  are lost.
- Under the map, two boxes: the **hover readout** (always visible — it is the risk
  display, not detail) and the **turn log**. Both are 140–210 px tall.
- The right page carries only what the player needs every turn. Detail goes into
  rollovers: the drop runs' descriptions (on the run's button and its flight line), the
  keyboard list, the alert thresholds (on the dial), the terrain (in the readout). No
  coordinates are printed on hexes.
- Paper cream ground with a supplied fibre texture, centre-fold crease and gutter shadow.
  The fibre is printed faintly on the right page's flat boxes, the captions and the map;
  the cards keep their full-strength paper.
- The outer margin: BURN BY DAWN in the title stencil running up the page at the top;
  "CUT OUT AND PLAY" with scissors and a dashed cut line in the middle; at the foot the
  build ("build M25", from `data/version.json`), the level and seed, the sound on/off word,
  and a bold RESTART (a first click arms it, a second starts a new game on a fresh seed at
  the same level, without a reload).

### Colour, print and type

- Palette: paper `#F2E8D5`, ink `#1A1A18`, army green `#5C6B4A`, danger red `#C1272D`,
  cold blue `#3D5A73`. Two reserved colours: **leader blue `#2F7BBF`**, used only for the
  ranking man (his name strip, rank flash, roster number) and his orders (radius, chevron,
  the AP dots they add); and **fire orange `#C98249`**, used only for flames, the blast's
  fireball, a burning fuse's stopwatch and the dots for charges a man carries. Nothing else.
- Ben-Day halftone dots as SVG `<pattern>` defs, **used sparingly**: on wood, objectives,
  the enemy's vision and in the chrome, printed faint, close to the colour beneath.
  Open ground is flat spot colour.
- Deliberate 0.5px colour misregistration on fills against their ink outlines.
- **Type is not comic lettering**, except in the speech bubbles and the player's pen.
  The right page is a typewriter face (`Courier 10 Pitch`, then `Courier New`, `Courier`,
  `monospace`), a typed briefing. Speech bubbles, the target rings' notes, BOOM! and the
  where-to-start cues are hand lettering in capitals, Manly Men BB (never Comic Sans).
  Headings and the masthead are Stardos Stencil. Map names are a serif italic, the one
  type on the board that is neither. The board's label face is pinned, not left to the
  browser.
- **Type is set for reading**: 13–15px on the right page at 1280x800, never below 12.
- Keys are set in **bold** wherever the game's text names one. The targets are proper
  names in all text: Rail Bridge, Telephone Exchange, Fuel Dump. A description starts
  with a capital: the words under a bold label, in rollovers and the keyboard list, after
  "Not now:" and "Cost:", after a trait's name, and each item of the readout; text run
  into a sentence stays as it is. Labels sell a choice rather than warn.

### The board

- **Printed as a map, not as tiles.** Woods, orchards, marsh and the ridge are each one
  shape across their run of hexes, with a rounded, slightly irregular edge, and the hex
  grid printed over them. All of it is ink only: every rule still reads the hex.
- A wood is crowded billowing crowns; an orchard is rows of small billowing crowns, with
  a windfall apple (with a stalk) here and there; a hedge is bushy clumps laid along its
  line, now and then a tree, and neighbouring hedgerow hexes are joined into hedges, drawn
  like roads, meeting in a T where they branch. Trees throw solid ink shadows down and to
  the right, as the counters do. The ridge is tonal bands: dark crest, pale fall, a contour
  at its foot. A field is plain, with a small mark on a minority of hexes. One clear shape
  per hex at most.
- The half-hexes past the border are washed lighter, with a soft edge.
- **Roads and the railway are continuous lines** through their hexes' centres. The
  railway runs east–west across the board and over the rail bridge, with a level crossing
  where a road meets it: art only, no rule. So is the village **church** with its spire,
  drawn with the exchange: the landmark Vance's landing line refers to.
- **Place names** from `map.json`: the village in spaced capitals, water in italic on the
  water, the rest in italic, each nudged off its hex (`dx`, `dy`) to sit in what it names.
  The turn report uses them ("the field by Ferme Lebrun").
- **Objectives say where to go.** Each is outlined firmly, its art inside, its name above.
  Each charge point is a red dashed hex with an empty satchel a third of the way toward
  its target (`pointNudge`); hovering one says so. The exchange has a telegraph pole on
  each charge point with a wire to its roof, hanging snapped once it is cut or blown.
- An enemy's vision is a faint flat tint at rest (it is the risk map) and is filled
  strongly and outlined when that enemy is hovered. Next turn's facing is a hollow dashed
  wedge (§6).

### Counters and markers

- Units are **counters**: rounded squares, a soft drop shadow down-right, a sliver of the
  card's cut edge showing under it, a symbol and a name strip.
- **Ours** are solid army green with a dark name strip (leader blue for the leader), the
  role in a paper roundel, and AP as dots top right, filled for AP left and hollow for AP
  spent. A man with no AP left stays fully printed; his counter's edge goes grey. Down the
  left, a fire-orange dot per charge carried (the leader's on his rank flash). On the right,
  the leader-blue orders chevron, smaller than his rank flash. A hidden man's counter is
  printed faint, with the hidden mark — paper with an ink eye, a little high — at full
  strength. A burning charge is counted down on a stopwatch, a quarter of its face per
  turn left, red with a burst on its last turn.
- **An enemy** counter prints its type on its strip (`counterLabel`; the reserve squad's
  reads RESERVES). A suppressed enemy is printed faint with a red SUPPRESSED band. The turn
  after a suppression, when it sees and fires again but can still be killed, it wears a
  red crosshair.
- A hovered enemy, or a hovered one of our men, wears a dashed red ring a little off its
  chip, never a selected man's solid frame.
- Bodies are drawn half as big again, near the middle of their hex. A knifed enemy's
  stain spreads slowly out from under the body, dark and wet, over about three seconds,
  and dries to a faint print. Parachutes lie in one corner of their hex, the same one all
  game.
- A man killed floats straight up about a hex and fades over his body before the turn's
  card is laid.
- Hovering any marker explains it: the "!", the spotted marker, the wound, the hidden
  mark, the orders chevron.

### The hover readout and the turn log

- **The move path counts.** Each step on the path shows the AP spent by the time he gets
  there, grey past what he has. A hex where he would be spotted is crossed out in red
  marker over its risk pips. The line is cold blue, and red from the first hex where he
  would be spotted. The last hex with pips has a pen note: "2 of 3 dots: 3 and he's
  spotted", or "3 of 3 dots: he's spotted" in red.
- **Aiming.** Suppress, kill or knife draws a crosshair on the enemy under the mouse, red
  if it can be done and grey if not, instead of its route and view. Stabilise draws a big
  red cross on the man under the mouse, grey if he cannot be aided. A stone marks where it
  lands with a pebble in a target ring and shades the ground in earshot; nothing joins it
  to the man, and the readout says he stays put. A swim's hovered landing shows its risk
  dots and whether he would be spotted there.
- **The readout** is a headline — the ground's name in the stencil, or an enemy's name and
  type — with a stamp saying how the hovered move goes (UNSEEN in green, SEEN in ink,
  SPOTTED or SHOT in red, KILLED if a blast would), then one row per thing under a short
  label, in one column with every row's words starting at the same place, most rows one
  line. For a hex: LANDING, MOVE, BLAST, RISK (how it goes and where), DOTS (the sum, "…
  = 2 of 3 dots", leaving out any term that is nought), HIDE, HERE, HEARD, GROUND, ORDERS.
  For an enemy: DOING, ALARM, NEXT, SEES. A target, the exfil or a parachute is named in
  the headline with short rows (HERE, NEEDS, BANG, CUT, WORTH; only HERE and NEEDS while a
  man is selected); the ground is a small note at the headline's right. For one of our
  men: HAS, WHERE, TRAIT, SCORE, and CONTACT, CHUTE, ORDERS and RADIO where they apply;
  over the selected man's own hex his RISK and HIDE come first. Trouble is set in red. If
  it does not fit, the type steps down to 13 px, then 12, and only at 12 goes to two
  columns, before anything is cut.
- **The turn log** is a black bar per turn, this turn's lines under it and the two turns
  before faded below, each line with the board's own mark for what it is (the "!", the
  wound cross, a body, the blast, a parachute), and graded: deaths, wounds and bangs in
  bold red, routine in grey. Each man's lines are kept together, his death last, "killed"
  in bold red. ▲ ▼ buttons down its right edge scroll it, hidden when it all fits.

### Cards

- **The orders are the first thing seen.** The orders card opens under the title card (a
  painted picture of the drop with the title lettered in; drawn in code if the file is
  missing), 800 wide, centred, standing off the page on a deep soft shadow while the
  whole spread is put in shade under a coarse halftone. The difficulty is in the black bar
  at the top, because it changes the numbers written below; ORDERS / BEFORE THE DROP under
  it. The job has its own line ending at the EXFIL; "Dawn comes…" has a line of its own.
  **Music off** is at its foot.
- **The counter key** lies beside the orders over the crease, drawn with the board's own
  counters: one of our men with every mark labelled, the leader and the marks a man can
  wear, and an enemy with its facing, next turn's facing, type and marks. Its middle is on
  the crease where the window has room (at 1280 it sits as near as it can without covering
  the orders). WHO sits above NEXT TURN so their pointers do not cross, and points at the
  end of the enemy's name; BLUE AP's pointer ends in a blue dot beside the dot it means.
- **How to play, at any time:** a **?** button beside KEYBOARD, and the `?` or `/` key,
  open the orders again with the counter key, over a turn card too; in play the level is
  shown but fixed and the drop's own lines are left out. Any key or click puts it away,
  laying a turn card back down if one was up.
- **Turn cards.** At the start of every turn (turn 1 after the drop has been shown) a card
  sits in the bottom right of the map, narrow, with nothing darkened: what happened at the
  turn boundary, most important first, and up to three hints worked out from the state (a
  pure function in `src/hints.js`, numbers from `rules.json`). A key puts it away and does
  nothing else, except that a man's number or Tab also selects him; a click on one of our
  men puts it away and selects him, any other click only puts it away. A box on the card
  turns the turn cards off for the session; the orders still open on a new game.
- **The RAF diversion** flies the Dakota across the board over the garrison (display only,
  skipped by any key or click), its engines heard half a second first, then a card headed
  in the diversion's blue says what it did and what calls are left.
- **The back page** (§10) is headed by the title card, smaller. Play again starts a new
  mission without a reload, and the orders open again.

### Before the drop

- **Targets are ringed** in red marker pen, the primary twice, each with a hand-lettered
  note beside it (the exchange's says a scout can cut its lines), and the exfil in green.
  Each ring takes in the objective's name and is drawn under the names, charge points and
  counters, as a pen mark on a map would be. Picking a run clears them.
- **Ghost Dakotas**: until a run is picked, a faint grey Dakota flies each drop line again
  and again, staggered, so the lines read as flight paths. Silent.
- Each run's tab sits on its line (`labelAlong`, `labelNudge` in `map.json`) with its word,
  QUIET, STEADY or FAST, as on its button and rollover.
- **Where to start**: until a run is picked, **PICK A DROP DIRECTION** is lettered big in
  the player's red pen among the runs' tabs, still, on the map at 1280x800. Once one is
  picked it reads **HIT SPACE TO JUMP**, "or click the run again", the JUMP! button turns
  danger red and throbs, and the run's rollover ends PRESS SPACE TO JUMP, OR CLICK AGAIN.
  Jumping needs **Space** or a second click on the same run. Once the stick is down, every
  man who can act wears a gently throbbing red pen ring, with CLICK A MAN TO START in the
  middle of the men, until the player first selects a man; never again that game.
- **The drop is shown.** A Dakota flies the chosen line, and each man's canopy opens where
  he jumps, drifts downwind to where the rules have already put him, lands and collapses
  into his parachute marker. Display only; a click or Space skips it.

### Motion and feedback

- A man who moves travels his path at a steady 190 ms a hex and stops dead: no wobble, no
  easing.
- **The garrison's turn is shown.** When a turn ends, before its card, every enemy walks
  the steps it took, at a patrolling walk that quickens as the alarm rises (480 ms a hex at
  Calm to 300 at Alarmed); a red "!" pops over each enemy that spotted a man or found a
  body or parachute, and a ripple runs out from each noise it heard. The "!" stays on the
  enemy through the player's turn, and hovering it, or the enemy, says what it saw or found
  and what comes of it; the RAF diversion takes it away. Any key or click brings the card
  at once.
- A noise waiting to be heard is ringed and labelled (STONE, SHOTS, SHOT, FOUND), and its
  hex's hover says who it will bring. A bang has no ring: the blast, the smoke and the
  DESTROYED stamp mark it.
- A hex the garrison is on its way to search wears a dashed ring with a **?**: where a
  patrol is going to look, or the last known contact while it is hunted at Alarmed. Its
  hover says who is coming. Below Alarmed a last known contact is not marked, as nobody
  goes to it.
- **Shots**: suppressing fires a burst — flashes at the gunner, red tracer to the enemy,
  its counter flashing. A kill is one dim shot.
- **A bang lands**: the page flashes, the board jolts, a shock ring runs out to the edge of
  the blast under the starburst, smoke rolls up, and BOOM! in the pen lettering, with a
  paper outline and tipped up 16°, all before that turn's card is laid over it. It is the
  payoff of the plan.
- **The line cut**: the exchange and the ground round it flash white in quick stutters as
  the wires short, a spark with every flash, all over in about a second; it then stands
  with its windows dark, not burning as a blown one.
- **Speech bubbles** on the board, tail pointing at the man's counter, shown for the man
  selected or under the mouse (on the board or the roster), set smaller than the board's
  labels. A line is heard once: it goes when the selection moves off that man (hovering
  shows it without using it up), when he moves off the hex where he said it, and at the
  end of the turn if never heard.
- **The loading page**: the spread stays hidden until it is drawn and its supplied
  pictures are in (never more than 8 s), while the table shows BURN BY DAWN and a fuse
  burning down. Ready, it asks for a key or a click — which also lets the browser play
  sound — and the spread fades up with the orders open.

**Architecture requirement:** all art is referenced by sprite id through `theme.js`,
rendered as SVG `<symbol>` / `<use>`. No inline path data in game logic. A supplied file
in `assets/` (ART-ASSETS.md) replaces its drawn sprite with no code change; what is not
supplied is drawn in code.

### Sound

The sounds of the table, not the battlefield (ART-ASSETS.md §9), every one a supplied
recording in `assets/audio/` (the made-in-code version is the fallback if a file is
missing): a pencil for every action, a counter snapped down when a move is undone (a
move itself is silent), a card's rustle when a card or the back page opens, a dog a long
way off when the alert rises, three far-off crumps for the RAF diversion, a gunfire burst
and a muffled cough for a silenced shot. The Dakota drones over the drop and the RAF
flyover, cut short if the drop is skipped. The one exception to the table: a turn with a
bang plays a real explosion, close, loud, low and slow. The back page rings the village
church's bells, upward to the top bell, for a mission accomplished, and tolls a single
bell with a siren far off for one withdrawn or failed.

**Title music**: a recorded war-film main title, looped, over the orders and the run
choice, fading at the jump and never between turns. A new game brings it back from the
top; sound turned back on before the jump carries on where it faded. It is one speed at
every level.

Nothing sounds until the player first presses a key or clicks, as browsers require. `M`,
or the word under the seed, turns all sound off for the session; **Music off** on the
orders turns off only the music. `?sound=off` in the address starts muted. Nothing is
stored.

---

## 12. Milestones

One Claude Code session each; each ends in something playable in the browser and merged
to `main`. Do not start a milestone before the previous one is merged and playable. What
comes after the current milestone is in `ROADMAP.md`.

### Current

**M26, the active-play pass** (`ROADMAP.md`), on branch `m26-active-play`. Three pieces,
no rules changes, all built:

1. **Prompts for Stabilise and Pass a charge**, live while either is valid (§4).
2. **Dialogue for a kill, being spotted and going to ground** (§5): data in `roster.json`.
3. **A "hunter" style for the balance bot** (§10 Balance). It found that clearing the
   garrison first *is* the best way to play (DECISIONS.md), which is the operator's call.

Left for after that call and the operator's next playtest: re-setting the balance targets.

### Done

Each is recorded in full in DECISIONS.md and the git history.

| # | What it did |
|---|---|
| M0–M2 | Hex grid; terrain from `map.json`; units, movement, AP, end turn, hover path |
| M3 | The trait hook system and the six from `roster.json` |
| M4 | Enemies, patrol routes, vision arcs, the alert dial, the risk readout |
| M5a–M5b | Contact and combat, wounds, hide, suppress, stabilise, noise, stones; charges, fuses, explosions, win and lose, exfil, the reserve, the RAF diversion |
| M6 | The drop and parachutes |
| M7–M7b | The art pass and the visual clean-up: the spread, roster rail, counters, the drop shown |
| M8a–M8e | Killing; the balance pass; supplied art in and published; undo, blasts kill enemies |
| M9–M9c | Difficulty levels; operator review; the drop runs re-placed and tagged |
| M10 | Sound |
| M11–M11d | Playtest review; undo by level, swimming, passing a charge, the stealth score, bonus payoffs; the cut-line rollover; Cat's Eyes reworked |
| M12–M12b | Playtest review; the leader's orders in two bands, the knife, the spread zoomed to fit |
| M13–M13b | Playtest review; 110° arcs and the Road patrol, next turn shown, distance fire, stones turn sentries at once |
| M14 | Playtest review; Normal toughened, the exfil asked first |
| M15 | Playtest review; a cut line raises the alert, anyone packs any parachute, suppressed enemies do not spot; the garrison's turn shown |
| M16 | Playtest review; swimming fixed, the lane to the lock, kills score, how to play at any time |
| M17 | Playtest review; the painted art in, woods and hedges redrawn, title music, the loading page |
| M18 | Playtest review; the score re-weighted (the bridge 10) |
| M19 | Playtest review; each action's AP on its button, the risk dots explained |
| M20 | Playtest review; the fuel dump's outer ring wounds, hedgerows and orchards block sight |
| M21–M21c | Playtest review; where to start; Normal's shots from 4 hexes, Hard's reinforcements; the readout and log reworked; recorded sounds |
| M22 | Playtest review; the boxes under the map fitted; the East run moved two hexes west |
| M23 | Playtest review; the music bug; the readout in one column; a man's particulars on hover |
| M24 | Playtest review; the run tabs re-placed; the drop's lettering reworded and still; a move made silent |
| M25 | Housekeeping: this spec cut to current rules; a lighter title card; the drawn faces and unused sprites out; the map named |
