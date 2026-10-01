# BURN BY DAWN — Specification

The game is called **Burn by Dawn**. *Night Drop* was its working title, and the repo,
branch history and some internal ids (`night-drop-ready`) keep that name.

A turn-based, hex tactical game. Six named British paratroopers land behind enemy lines
and sabotage German infrastructure before dawn. It is an engine plus missions (§12 M27):
mission 1, the rail bridge in occupied France, is the one playable today, and §1–§11
describe it. Mission 2, the airfield, is specified in §13 where it differs.

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
- **Pick up a charge** — 1 AP, on a hex with a dropped charge, if he can carry one.
- **Pass a charge** — 2 AP to the giver; the taker pays nothing. One charge to a man
  **beside him** who can carry it: not wounded, and with room (a scout carries none).
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
  card says so second only to a charge about to blow. Its name is the mission's
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

**Time pencils** (`charges.fuseChoice`; null in France, so a charge there is set with the
one fuse as above), called **timers** on screen. Where a mission gives a `{ min, max }`,
the man setting a charge picks its fuse from that many turns, and his `onPlaceCharge`
fuse hook applies to whichever he picks (Steady Hands: a turn off each). It is two plain
steps (M30b, the operator's: the second was missed): the button reads **Charge + timer**,
and **C** opens **the tin of time pencils** (M31d, the operator's: the timer as a period
object) on the map beside the man, in whichever of the eight places round him covers
least of his blast and his counter, the nearest on a tie: an olive tin stencilled SWITCH,
DELAY, No. 10 · TIME PENCILS, open on a card of pencils, one a length, each banded in its
colour as the real ones were (black, red, white, green, yellow, blue, shortest to longest)
with the turn it goes off ("4 TURNS on turn 19"). Click a pencil, or press its number, and
it is lifted out; **SET** (or **Enter**, or **C** again) sets the charge with the one
lifted, which is the one offered first when the tin opens; **Esc** or Back puts it away.
The action strip says SET THE TIMER: PICK A PENCIL, THEN SET, with SET and Back, while
the board shows the charge's blast in red, the chain's included, and the readout says
every man must be off that ground by then. **Getting clear** (M30b):
a timer that would catch a man who could not walk off the red ground before it goes off
(his AP left this turn and a full pool each turn after, over the ground's costs) reads
**too short** in red and names him; the one marked and offered first is the default
(`fuseTurns`), or if that is too short, the shortest longer one that lets everyone clear.
A timer that would go off after dawn is struck out and cannot be picked; if the default
is, C takes the longest still in time. A burning charge's stopwatch is divided into its
own length, and its hover and its target's say the turn it blows. Once set, the blast to
come stays on the board, faint with a dashed edge, until its turn, and a move that ends
on it says when it goes off. Undo takes it back like any other action.

**A blast that sets off its neighbours** (`setsOff` on an objective kind; false in France).
When an objective of such a kind is destroyed, every intact objective with a hex inside
its blast radius (measured from the charges that went off) goes up with it: destroyed,
counted toward the win, scored as its own, its payoff paid, and its own blast felt round
its own hexes, killing and wounding by its own radii. It is still **one explosion**: one
alert rise and one noise, the setting-off objective's. A charge already set on a caught
objective is spent. A caught objective whose kind sets off carries the chain on. Its
target ring and hover name what it takes ("SETS OFF 2 JU 52S"), and on the airfield a
fuel hose runs from the bowser to its own charge point (M30b, art only: `hose` in its
objective art); the path warnings
include every blast in the chain; and a setter still standing counts toward what the
stick can still do, so losing a bomb is not a withdrawal while the bowser could make it
up.

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

- Each objective destroyed, blown or cut: its kind's `score` (the Rail Bridge 10, each
  secondary 4). Meeting the win condition pays `scoring.win` on top: 0 in France, whose
  bridge carries its own 10; a mission with no primary pays it for the job done.
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

### Missions

The game is an engine plus missions, listed in `data/missions.json` in the order the
contents page prints them. A mission is data only, and no code asks which is on:

- A **playable** mission names its `map` and `roster` files, and a `rules` and `enemies`
  patch merged over `rules.json` and `enemies.json` the way a difficulty level's is; the
  mission's go first, then the level's. A patch key must already exist, except that a
  mission may add a new objective kind or enemy type. France's patches are empty: it is
  the files as they are, and the bot's numbers for it are unchanged by missions existing.
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
the absolute answer; it never calls the diversion or stabilises, and only its `hunter`
style goes looking for kills, and it packs no parachutes unless run with `PACK=1`, so a
person does better. Current baselines, win % west / north / east: **Easy 99 / 100 / 97,
Normal 86 / 83 / 89, Hard 29 / 38 / 37**; packing every chute on turn 1 (`PACK=1`):
Easy 100 / 99 / 97, Normal 92 / 86 / 94, Hard 45 / 33 / 35. Easy and Normal are meant to
be kind to casual players; Hard is the real test. Any rules, map or enemy change is re-run against these and
the shift logged in DECISIONS.md.

The `hunter` style (`node tools/balance-bot.mjs 300 hunter`) walks each man behind the
nearest killable enemy to knife it, and closes a gunner to suppress and kill. By default
only the men with no charge to place hunt; `HUNTERS=all` sends everyone, until the bridge
is down or turn `HUNT_TURNS` (12). It is the check on the second pillar: kill-everything
must not be the best way to play. It moves as the `careful` style does, so it is measured
against `careful` on the same run (M30b, the operator's: against naive, it measured how
much careful movement is worth, 10 to 40 points on the airfield). France, 200 seeds, W/N/E:
Normal careful 86 / 80 / 74, hunter 80 / 83 / 76, `HUNTERS=all` 76 / 79 / 78; Hard careful
38 / 51 / 43, hunter 29 / 33 / 27, all 27 / 24 / 28: level on Normal, within the bot's noise,
and well below on Hard. Its numbers, against the baselines, are in DECISIONS.md.

**Targets** (proposed at the v1.0 gate; the playtest in `docs/PLAYTEST.md` confirms or
moves them). What they are for is people, so the first three are measured on players new
to the game, and the bot's ranges are the guard rails a change must stay inside:

| Level | Players | Naive bot, every run | Hunter bot |
|---|---|---|---|
| **Easy** | A first try usually wins | 95 or more | — |
| **Normal** | Most win within three tries | 75 to 90 | Below careful on the same run (a few points over is the bot's noise) |
| **Hard** | The real test: a win is earned | 25 to 45 | Below careful on the same run (a few points over is the bot's noise) |

Today every run is inside them.

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
- The outer margin: at its top a small **← CONTENTS** (M31d, the operator's), back to the
  contents page to pick another mission: at once before the jump; once the stick has
  jumped a first click arms it (CLICK AGAIN: CONTENTS, in red, for a few seconds) and a
  second gives up the game on the board for a fresh one; then BURN BY DAWN in the title
  stencil running up the page;
  "CUT OUT AND PLAY" with scissors and a dashed cut line in the middle; at the foot the
  build ("build M29", from `data/version.json`), the level and seed, the sound on/off word,
  and a bold RESTART (a first click arms it, a second starts a new game on a fresh seed at
  the same level, without a reload).

### Colour, print and type

- Palette: paper `#F2E8D5`, ink `#1A1A18`, army green `#5C6B4A`, danger red `#C1272D`,
  cold blue `#3D5A73`. Two reserved colours: **leader blue `#2F7BBF`**, used only for the
  ranking man (his name strip, rank flash, roster number) and his orders (radius, chevron,
  the AP dots they add); and **fire orange `#C98249`**, used only for flames, the blast's
  fireball, a burning fuse's stopwatch and the dots for charges a man carries. One ground
  colour, **desert ochre `#D2A85C`**, used only by the desert's terrain (§13): it is the
  second colour the airfield's story is printed in (and the yellow time pencil's band). One
  counter colour, **burnt orange `#B4592A`**, used only for our men's counters on the
  airfield (a mission's `counterColour`; M31d, the operator's try: army green on the desert
  sat too close to the garrison's dark chits). Nothing else.
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
  its target (`pointNudge`); hovering one says so. A charge set on it is drawn in the
  same place as a solid green satchel, with its stopwatch beside it, and the dashed one
  goes. The exchange has a telegraph pole on
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
- Two DESTROYED stamps side by side would print over each other: a map may give an
  objective a `stampNudge` (art only), used only while one beside it is destroyed too
  (the airfield's bowser's goes up, the Ju 52's beside it down; M31d).
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
  For an enemy: DOING, ALARM, then with a man selected SUPPRESS, KILL and KNIFE (as his
  role has them: he can, in blue, or why not), NEXT, SEES. A target, the exfil or a parachute is named in
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

- **The contents page comes first** (§10 Missions), as the annual's contents: the title
  card with PARACHUTE RAIDS BEHIND THE LINES, then each mission as a contents line, its
  title run to its page number with a dotted leader, its place in italic and a line about
  it. A mission to come is printed faint and stamped NEXT YEAR'S ANNUAL in red rubber,
  askew; a click on it does nothing. Clicking a playable one, or any key, opens its
  orders. `?mission=` skips it. The back page's CONTENTS starts a new game on it.
- **The orders are the first thing seen** after it. The orders card opens under the title card (a
  painted picture of the drop with the title lettered in; drawn in code if the file is
  missing), 800 wide, centred, standing off the page on a deep soft shadow while the
  whole spread is put in shade under a coarse halftone. The difficulty is in the black bar
  at the top, because it changes the numbers written below; under it the mission's title
  (THE AIRFIELD) heads the card, with ORDERS · BEFORE THE DROP beside it (M31d, the
  operator's). The job is two lines, split at its comma so the EXFIL never stands alone
  (M31d); "Dawn comes…" has a line of its own, and so does the bonus paragraph's last
  sentence. Where charges take a timer, the bang sentence says to plan "the order and
  timer duration of the charges you set". A card too tall for the window is set tighter a
  step at a time (less air, then 14 px, then 13) before anything is cut.
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
  skipped by any key or click), its engines heard half a second first; where the map gives
  a `diversionRun` (the airfield), the vehicle its `art` names (a jeep, guns flashing)
  drives that line on the ground instead; then a card headed
  in the diversion's blue says what it did and what calls are left.
- **The back page** (§10) is headed by the title card, smaller. Play again starts a new
  mission without a reload, and the orders open again.

### Before the drop

- **Targets are ringed** in red marker pen, the primary twice, each with a hand-lettered
  note beside it (the primary's: PRIMARY TARGET! / BLOW IT WITH TWO CHARGES!, the count
  from its kind; the exchange's says a scout can cut its lines), and the exfil in green.
  Each ring takes in the objective's name and is drawn under the names, charge points and
  counters, as a pen mark on a map would be. Picking a run clears them. Where the win is
  any few of many (the airfield), each target's ring is tight and takes in its charge
  points too, so target and point read as one; where every target takes one charge, only
  the win's note says so, and a bonus target's note names it (BOWSER: BONUS +2). A map may move a note into clear ground (`noteNudge` on an
  objective, `exfilNoteNudge` on the map for the exfil's; art only).
- **Ghost Dakotas**: until a run is picked, a faint grey Dakota flies each drop line again
  and again, staggered, so the lines read as flight paths. Silent.
- Each run's tab sits on its line (`labelAlong`, `labelNudge` in `map.json`) with its word,
  QUIET, STEADY or FAST, as on its button and rollover.
- **Where to start**: until a run is picked, **PICK A DROP DIRECTION** is lettered big in
  the player's red pen among the runs' tabs (or centred on the map's `dropCueAt` hex where
  that is busy: the airfield's is on the strip), still, on the map at 1280x800. Once one is
  picked it reads **HIT SPACE TO JUMP**, "or click the run again", the JUMP! button turns
  danger red and throbs, and the run's rollover ends PRESS SPACE TO JUMP, OR CLICK AGAIN.
  Jumping needs **Space** or a second click on the same run. Once the stick is down, every
  man who can act wears a gently throbbing red pen ring, with CLICK A MAN TO START in the
  middle of the men, until the player first selects a man; never again that game.
- **The drop is shown.** A Dakota flies the chosen line, in from off the board and on
  until it has left it, whatever the line's own ends, and each man's canopy opens where
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
bell with a siren far off for one withdrawn or failed. A mission names its own back-page
and diversion sounds: the airfield's jeep raid is an engine going by and bursts of fire,
its success a bugle call, the rest its own air-raid
siren close by (made in code until recordings are supplied).

**Title music**: a recorded war-film main title, looped, over the orders and the run
choice, fading at the jump and never between turns. A new game brings it back from the
top; sound turned back on before the jump carries on where it faded. It is one speed at
every level.

Nothing sounds until the player first presses a key or clicks, as browsers require. `M`,
or the word under the seed, turns all sound off for the session; **Music off** on the
orders and on the contents page turns off only the music, and is carried in the address
(`?music=off`) when the contents page loads another mission. `?sound=off` in the address
starts muted. Nothing is
stored.

---

## 12. Milestones

One Claude Code session each; each ends in something playable in the browser and merged
to `main`. Do not start a milestone before the previous one is merged and playable. What
comes after the current milestone is in `ROADMAP.md`.

### Current

None chosen. Phase 3 is done: the airfield is `playable`, picked from the contents page
(M31b). What comes next, the aqueduct (Phase 4), is in ROADMAP.md, to be specified here
before it is built, as §13 was. v1.0 is tagged.

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
| M26 | Active play: prompts for Stabilise and Pass a charge, lines for a kill, a sighting and hiding, the bot's hunter style |
| M26b | Review of M26: the knife a whole turn, the Wood patrol, Pick up charge and Pass charge in full, the search ring |
| M26c | The v1.0 gate prepared: Dutch's chute line, the playtest sheet, the balance targets proposed |
| M26d | The operator's playtest notes: the fuel dump's points 1 AP, one shot per enemy a turn, the RAF urged in a pickle, pass rings, a smoother hover |
| M27 | Missions architecture: `data/missions.json`, win conditions as data, `?mission=`, the contents page; France's bot output byte-for-byte unchanged. Tagged v1.0 |
| M27b | The drop's Dakota flies off the board on every run (the East run's stopped mid-map) |
| M28 | Engine work for mission 2: a mission's own part of each level, score by kind, the win's targets instead of the primary flag, the RAF's words, a dialogue patch, `draft` missions; France's bot output byte-for-byte unchanged |
| M29 | The airfield on the board as a draft: its map, the desert in ochre, the car, the aircraft, bowser and signals tent, the trucks; played under France's rules |
| M29b | The operator's notes: the airfield's opening board cleared (tight rings, fewer words, notes and the drop cue in clear ground), a South run for the East, a camp guard, a bomb a scout and one a sapper, a lighter wadi, softer aircraft shadows, a mission's own portraits; Music off on the contents page; Men out in bold; France's two hidden charge points moved. France's bot output unchanged |
| M29c | The operator's second notes: the desert portraits in; the West run straight down outside the wire; the airfield's notes placed again (the signals note over its patrol, the bowser's named, the exfil's inside its ring) |
| M30 | The airfield's two new rules, time pencils and the bowser that sets off its neighbours; the bot learns both; the airfield balanced (a West patrol, five aircraft on Normal, six on Hard); France's bot output unchanged |
| M30b | The operator's desert notes: the timer made two plain steps with its blast shown and too-short timers named, a default of 4, blasts to come drawn; the bowser's hose and the Ju 52's point moved off it; the desert chips; the South tab moved; a Sand patrol; the hunter measured against careful |
| M31c | The operator's airfield art (title card, contents panels, car counter, jeep), the Stuka, Ju 52 and trucks redrawn, the airfield's recorded sounds |
| M31d | The operator's desert notes: the timer as a tin of time pencils beside the man; burnt-orange counters on the airfield; a way back to the contents; the orders' words and the mission's title on them; the run tabs, trucks, Oued Melah and the DESTROYED stamps moved |
| M31–M31b | The airfield's words and sounds (the orders and turn cards explain the timer and the bowser, the jeep raid, desert lines, a bugle and a siren for the back page) and the art hand-off; the operator's notes: `playable`, the jeep's line clear of counters, the strip's edges, SET THE TIMER in the pen on the map |

---

## 13. Mission 2 — the airfield

§1–§11 describe mission 1. This section describes mission 2 only where it differs. Each
engine change below (marked **engine**) is written into §4, §7 or §10 when it is built,
and then kept here only as the mission's numbers. The words and names here are
placeholder copy for the operator to reword.

### The mission

**The Airfield, southern Tunisia, winter 1942.** Loosely based on 2 Para's jump at Oudna:
British paratroopers dropped by Dakota onto an Axis landing ground. The same six men,
the same 18×13 board, the same 20-turn night.

Eight **aircraft** stand in their dispersal pens, and one charge wrecks each. The job is
**any five of the eight** (Normal; M30, the bot's: four was won nineteen times in
twenty once the bowser was in play), and every one past that is greed against dawn. The
stick carries **five bombs**, so the most it can wreck with bombs alone is five: the
**fuel bowser** on the apron is how to take more, since it sets off the aircraft beside
it (below, rule 2). On Hard the job is six, so the bowser has to go. A signals tent, the airfield's telephone exchange, stops the reserve
and the reinforcements, as in France.

Its pillar check. What the player does: slip down the wadi, knife a pen guard between the
blast walls, throw a stone to send the car away, set a long pencil and walk off, blow the
bowser for three aircraft with one bomb. What it costs: every aircraft that goes up raises
the alert, and the car answers a noise fastest of anything on the board.

### The ground

New terrain, as data in `terrain.json` and drawn in `theme.js`, in **one new colour,
desert ochre** (§11): on France's palette alone the desert was bare paper, France's fields
with the trees taken off. Sand is a pale wash of the ochre (about 30%), dunes a stronger
one (about 55%) in bands, and the wadi the ochre darkened with ink, so the safe artery
reads as a dark channel as the hedges do. The strip and the camp stay bare paper, man-made
against the sand; scrub is army-green tufts on sand. Every colour that means something
(green ours, red danger, the two blues, fire orange) is unchanged, so a counter, a threat
or a burning fuse reads the same on both boards. Only the desert's terrain types use the
ochre, and only the airfield's map has them, so no code asks which mission is on. M29
checks fire orange on ochre on the real board and moves the ochre if flames get lost.

| Terrain | Move cost | Cover | Blocks sight | Notes |
|---|---|---|---|---|
| Sand | 1 | none | no | the open desert, flat paper with a sparse stipple |
| Scrub | 1 | light | no | camel-thorn in green tufts; light cover you can be seen in |
| Dunes | 2 | light | yes | soft sand in tonal bands; a crest hides what lies beyond it |
| Wadi | 2 | heavy | yes | a dry watercourse below the ground: the safe artery; bad landing (rocks) |
| Wire | 3 | none | no | the perimeter wire; a full turn for a sapper to get through |
| Strip | 1 | none | no | the landing strip, rolled sand, drawn as one broad band |
| Pen | 1 | heavy | yes | the earth and sandbag walls round an aircraft; its charge points stand in it |
| Aircraft | impassable | — | yes | a parked aircraft; the objective stands on it |
| Camp | 1 | heavy | yes | tents and huts |

Kept from France: **Track** (the perimeter track and the road in), **Ridge** (the
escarpment), **Emplacement** (the AA pits), **Fuel dump** (under the bowser).

A mission with none of the swim's `across` terrain does not offer Swim at all.

### The map

Placed in M29 (`data/map-airfield.json`); tuned by the bot in M30 (the West patrol).

- The **landing ground** fills the middle and east of the board inside a ring of **wire**,
  with the **perimeter track** just inside it. The **strip** runs east–west across the
  middle.
- **North dispersal**: four Ju 87 Stukas along the strip's north side. **South
  dispersal**: four Ju 52s on the apron, the **bowser** between the middle two. Each
  aircraft has one pen hex behind it, away from the strip, and that is its one charge
  point. The bowser has one charge point too: the one hex beside it whose blast takes in
  exactly the two Ju 52s either side of it (a test holds it to that), with a fuel hose
  drawn to it. M30b, the operator's: the Ju 52 east of the bowser had its pen and point
  just beside the bowser's, where the two read as a pair, so its pen moved one hex east
  to (8,8). The hex west of the bowser, the other place offered for its point, would put
  a Stuka across the strip inside its blast as well.
- **The camp** in the east: tents, the **signals tent** with its mast, the AA pits, and
  the gate where the road comes in from the east edge (Hard's reinforcements come this
  way).
- **The escarpment** runs north–south on the west, looking down over the wire: high
  ground for a gunner.
- **The wadi** winds in from the south-west corner under the escarpment, through a gap in
  the wire, to the south dispersal: the quiet way in, like the towpath.
- **The dunes** in the north-west, slow and blind, lead to the north dispersal.
  **Scrub** in the north and north-east is fast and light cover, open to the car.
- **Exfil**: the rendezvous with the trucks, at the wadi's mouth in the south-west
  corner, drawn as two desert trucks with a scrap of netting (the map's `exfilArt`).
- **Three drop runs**: straight down outside the west wire, over the dunes and the
  escarpment (West, quiet; M29c, the operator's: it had run diagonally across the wire), along the scrub above the north
  wire (North, steady), and along the sand below the south wire, nearest the Ju 52s and
  the bowser (South, fast; M29b, the operator's: it replaced an East run from the
  north-east corner that was too like the North, and it uses the bottom rows). A man can
  come down in the wire (a bad landing). Their tags are
  data, as in France.
- **Art only**: an aircraft objective's `art` picks its picture (Stuka or Ju 52); the
  wire is laid as a line like a hedge; the strip is a grey wash with its painted centre
  line; the escarpment is France's ridge; the place names (Bir el Kasra, Erg Safra,
  Djebel Rhar, Oued Melah) are placeholders.

### The garrison

Eleven enemies, three more than France, plus the reserve:
- **Sentries**: the two AA pits (one in the north dispersal, one at the south-east
  corner), a guard beside the signals tent, and a guard among the south-east tents
  (M29b, the operator's: the camp's corner stood empty).
- **Patrols**: a guard walking each dispersal, the outer patrol walking the scrub above
  the north wire, where the North run lands (so its chutes are found), one in the
  camp, and (M30, the bot's) a West patrol on the sand under the escarpment outside the
  west wire, between (-1,7) and (0,4), where the West run lands: before it nobody found
  a West chute, and the West won nineteen games in twenty on Normal; and (M30b, the
  bot's) a Sand patrol below the south wire, from (4,11) east to (12,10), where the South
  run lands: with the default timer at 4 the South won 91% on Normal and 53% on Hard.
- **The perimeter car**, a new enemy type, `vehicle` (the mission's enemies patch;
  its counter is ART-ASSETS.md's `counter-enemy-vehicle`): speed 6, so it drives
  the whole perimeter in a few turns and reaches a noise first. Vision and arc as a
  patrol's, on every level (M30: Hard's 4 hexes and 120° for it took the North run,
  which it drives past, to 19%). It **can be suppressed but not killed or knifed** (`killable: false`, like the
  reserve): the crew duck, the car stops for a turn. The verbs that answer it: a stone
  sends it off to look, a gunner stops it for a turn, and the wadi and the dunes hide
  from it. It keeps to the track while it patrols, but drives across open ground to a
  noise, paying the same ground costs as anyone.
- **The reserve** turns out from the camp at Alarmed and guards the way to the trucks.
  None comes once the signals tent is down.

### The objectives

Numbers are Normal's, per kind in the mission's rules patch; M30's bot left them as they
were: the garrison is Alarmed in nearly every game here, so an alert number moves nothing.

| Objective | Needs | Blast / kills within | Alert | Score | Pays |
|---|---|---|---|---|---|
| **Aircraft** ×8 | 1 charge | 1 / 1 | +2 | 2 each | toward the win |
| **Fuel bowser** | 1 charge | 2 / 1 | +4 | 2 | sets off the aircraft in its blast |
| **Signals tent** | 1 charge, or cut the line | 1 / 1 | +3 (cut +1) | 4 | no reserve, no reinforcements |

**The win**: `destroyCount { kind: "aircraft", count: 5 }` (Easy 3, Hard 6), and at least
the level's `minimumOut` men out by dawn. No objective is `primary`.

**The bombs**: small Lewes bombs, so the mission's patch lets a **scout carry 1** as well
as each sapper: Dutch, Fitch, Vance, Barrow and Nunn (Ox) one each, five in the stick
(M29b, the operator's: M29 gave the sappers two each, and the scouts, with none, had
little to do here). Only Speers carries none: his job is the car. A man killed or wounded drops what he carried
on his hex, and anyone with room picks it up (1 AP each), so losing a sapper is a fetch
under fire, not a lost mission. It is withdrawn only when too few bombs are left anywhere
to reach the count, as §10 already says.

**The alert on this ground**: five aircraft at +2 is 10, so a win nearly always ends with
the garrison Alarmed. The mission is not whether it goes up but where the stick is when
it does. The clean-run bonus is kept: it is rare, and earned with patience.

### The two new rules (the budget)

Both are built (M30) and written into §7; kept here as the mission's numbers.

**1. Time pencils** (engine, `charges.fuseChoice`; null in `rules.json`, so France is
unchanged). When he sets a charge, the sapper picks its fuse from `min` to `max` turns
(the airfield: 2 to 6). The default (`fuseTurns`, 4 on the airfield since M30b, the operator's: men were
caught too close with 3) is offered first, so a player who
never chooses plays as in France. Steady Hands takes a turn off whichever he picks
(Dutch: 1 to 5).
- **C**, or the button, opens the pencils as buttons in the action strip, each with its
  length and the turn it goes off ("4 turns · blows turn 11"). **C** again or **Enter**
  takes the default, a number key takes that many turns, **Esc** backs out. A pencil that
  would go off after dawn is shown struck out and cannot be picked.
- The stopwatch's face is divided into the charge's own length. Its hover, and the
  target's, say when it blows. Undo takes it back like any other action.
- Why: the order and timing of the demolitions is the strategy (the spine). A long
  pencil lets charges set over three turns go off together, while the stick is already
  walking to the trucks, which is how the real raids were done.

**2. A blast that sets off its neighbours** (engine, `setsOff` on an objective kind; false
everywhere in France). When an objective of a kind with `setsOff` explodes, every intact
objective with a hex inside its blast radius goes up with it: destroyed, counted toward
the win, scored as its own, with its own blast felt around it, killing and wounding by
its own radii. It is still **one explosion**: one alert rise and one noise, the setting-off
objective's. A charge already set on a caught objective goes up with it and is spent. A
caught objective whose own kind `setsOff` carries the chain on.
- The bowser's ring and hover name the aircraft it will take. The path warnings include
  every blast in the chain, so a man in the pen next door is never caught unwarned.
- Why: one bomb for three aircraft at +4, not three bombs at +6. It is the biggest greed
  on the board, it stands in the open on the apron, and its blast is the widest.

### What the engine needs first (M28, no gameplay change) — done

Built in M28 and written into §4 and §10; kept here as the list the airfield leans on.

The three things M27 left as France's, and the rest of what the airfield leans on. The
proof is the same as M27's: France's bot `--json` output is byte-for-byte unchanged.

- **A mission's own level patches.** `missions.json` gains `levels.<id>` (`rules`,
  `enemies`, `summary`), merged after the level's own patch. France's Easy "the bridge
  takes one charge" and its Hard reinforcements move there; `difficulty.json` keeps only
  what holds in every mission. The orders print the mission's summary line before the
  level's.
- **Score by kind.** Each objective kind gets a `score` (France: bridge 10, exchange 4,
  fuel dump 4, so nothing changes), and `scoring.win` pays for meeting the win condition
  (France 0; the airfield 10, set in M30 so that a success with three men out still beats
  the best retreat, as France's bridge does). `scoring.primary` and `secondary` go.
- **`primary` only where the win condition uses it.** `destroyPrimary` wants exactly one;
  `destroyCount` wants none, and at least `count` objectives of its kind. The target
  rings, the ★, the mission panel, the turn-card hints, the Pass-a-charge prompt and the
  bot all ask `winTargets` instead of the flag. For `destroyCount` the orders ring each
  target once, with one note ("ANY FOUR AIRCRAFT! / ONE CHARGE EACH!"), and the mission
  panel shows the kind as one line ("★ Aircraft 1 of 4 · 8 on the field").
- **France's last words out of code**: the RAF card's "bombers over the town" and its log
  line become mission `words`.
- **A dialogue patch**: a mission may replace any man's lines (`dialogue.<man id>`),
  merged over the roster file. The six stay one roster; only the lines that name France
  (Vance's church, Barrow's trees, the bridge) get desert versions.
- **A `draft` status**: printed and stamped on the contents page like a coming mission,
  but `?mission=<id>` opens it, so the operator can try it on the live site before it is
  announced.

### Its words, sounds and pictures (M31)

Placeholder copy for the operator to reword; all of it data in `missions.json` and the map.

- **The orders** say the two rules where a mission has them: every charge takes a timer
  (the keys, the default, why a long one), and what a target that sets off its
  neighbours takes ("the BOWSER sets off the 2 Ju 52s beside it: 3 targets for one
  charge, and one bang"). Targets of one name are said once in the charges line
  ("Stukas 1 each, its point"). The **turn card** adds "then pick a timer" to the first
  turns' charge hint, and names what the bowser sets off while it stands.
- **The diversion** is a **jeep raid**: "JEEP RAID" on the button and card, "JEEPS ON THE
  NORTH WIRE", "jeeps shoot up the north wire" in the log. A jeep drives past outside
  the wire, guns flashing at the field, to an engine and four bursts of fire (`jeepRaid`).
  The map's `diversionRun` (art only) offers three lines, the north scrub, the south sand
  and the west edge, each from off the board to off it; when it is called the jeep takes
  the one with the fewest counters within 1.2 hex radii, the north on a tie (M31b, the
  operator's: it drove through chips).
- **The six's lines**: only those naming France or its ground change (Fitch's cabbages
  and dirt, Vance's church, Barrow's trees, bridge and mud).
- **The back page**: a bugle call, rising to its top note, for success (`desertVictory`;
  M31b, the operator's: M31's trucks and crumps sounded like a failure), the landing
  ground's siren for the rest (`desertDefeat`).
- **The timers open**: the tin of time pencils lies on the map beside the man (M31d). It
  took the place of M31b's SET THE TIMER lettered in the pen beside him, which said the
  same thing in the same spot.
- **Our men's counters** are burnt orange here (M31d), and Oued Melah is printed solid
  over the wadi's stones, a hex up the wadi from its mouth; the trucks sit a little
  higher (`exfilArtNudge`), clear of the board's foot.
- **The strip** has its two edges drawn as thick ink lines the length of it, with the
  painted centre line between, so it reads as a runway (M31b, the operator's).
- **Its title card** is `assets/title/title-card-airfield.jpg` (ART-PROMPTS Priority 13);
  France's shows until it is there. The tagline stays SIX MEN · EIGHT AIRCRAFT · DAWN AT
  TWENTY.
- The paintings and recordings it wants are in ART-PROMPTS.md (Priorities 13, 15, 16);
  every one has a drawn or made stand-in, so none holds up `playable`.

### Milestones for the airfield

| # | What it builds | Done when |
|---|---|---|
| **M28** | The engine work above | France's bot output byte-for-byte unchanged; a test mission with `destroyCount` plays through in the tests |
| **M29** | The airfield on the board: its terrain and art, `data/map-airfield.json`, the car, the aircraft, bowser and signals tent (no chain yet), the trucks, the drop runs; `draft` in missions.json | `?mission=airfield` plays start to end under today's rules; the bot runs `MISSION=airfield` |
| **M30** | The two new rules; the bot learns both (a pencil policy, and whether to go for the bowser); the three levels balanced | Every run inside the §10 targets; the hunter below careful (M30b; it said naive); France unchanged |
| **M31** | Its words and sounds: orders, tagline, turn-card hints, the six's desert lines, the RAF's; ART-ASSETS and ART-PROMPTS entries for the operator's paintings (title card, aircraft, car counter, trucks) | The operator's review, then `playable` |

Balance targets are §10's, for the airfield as for France.

**The airfield's baselines (M30b)**, 300 seeds, win % west / north / south, with `KNIFE=1
BOWSER=1`: the naive bot going for the bowser, as its ring tells a first-timer to, and
taking the timer offered first, as one who never chooses would. **Easy 97 / 98 / 99, Normal
89 / 80 / 86, Hard 41 / 29 / 37**, every run inside the targets. The hunter against `careful`, and what
each rule is worth to the bot, are in DECISIONS.md.
