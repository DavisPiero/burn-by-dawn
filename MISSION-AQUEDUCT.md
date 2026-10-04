# BURN BY DAWN — Mission 3, the aqueduct (SPEC.md §14)

This is §14 of the specification, kept in a file of its own, as MISSION-AIRFIELD.md is
§13. It is as authoritative as SPEC.md. Section numbers in it (§6, §10) are SPEC.md's.

**Specified 5 Oct 2026 (M39). Not yet built.** Its two rules are engine rules, to be
written into SPEC.md (§9 Supply canisters, §10 The way out on a timetable) when the
engine has them (M40); until then they are here, with its numbers. Every number is a first guess for the balance
milestone (M42) unless it says the operator chose it. The words and names are placeholder
copy for the operator to reword. Once the mission is playable this file says how things
are, and keeps no history (DECISIONS.md has it).

The operator's calls (5 Oct 2026): southern Italy, February 1941; **every charge comes
down in a canister** and the men jump empty-handed; **the boat keeps a timetable**, like
the goods train, with no signal to make; and **a tidy win on Normal ends with the
garrison at Alert, not Alarmed**.

---

### The mission

**The Aqueduct, southern Italy, February 1941.** Loosely based on Operation Colossus,
Britain's first airborne raid: X Troop dropped from Whitleys onto the Tragino aqueduct,
which carried the water for the ports of Taranto, Bari and Brindisi, with a submarine
waiting off the coast. The same six men and the same 18×13 board, which puts the
mountains and the sea closer together than the map of Italy does.

The aqueduct is one big target that takes **four charges** (Easy three, Hard five), and
the stick has **six, all of them in three canisters** that come down along the run with
the men. Nobody lands holding a charge. So the first job of the night is not the walk
to the target but finding out where the explosive is, and who goes to fetch it.

The way out is **a boat from the submarine**, in to the beach from **turn 15** and gone
at dawn, the end of **turn 18**. Before turn 15 there is no way off the board. So the
job cannot be done and run from: a bang too early is three or four turns hunted on the
shore with nowhere to go, and one too late is a boat missed. The time pencils (SPEC.md
§7) are what answer it: set the charges on long timers, be most of the way down the
valley when they go.

A **road bridge** below the aqueduct is the bonus target, as the party blew one in 1941
to hold up pursuit: with it down, nothing comes up the road, neither the reserve nor the
reinforcements.

Its pillar check. What the player does: send a scout for the far canister while the
sappers load up at the near one, empty a canister before the patrol finds it, knife the
aqueduct's guard, set four timers to one turn, drop the road bridge to keep the lorries
off the beach, knife the coast watcher and lie up in the rocks for the boat. What each
costs: a fetch is turns off the walk home; a charge on the bridge is a spare the
aqueduct may want and three points on the dial; a long timer is a charge left set where
a patrol walks; and the aqueduct going up brings a squad down to the beach.

### Its two rules

Both are engine rules, off (null) in France and on the airfield.

**Supply canisters** (SPEC.md §9, `canisters` in the rules patch): `{ count: 3,
charges: 2 }`. The men jump with no charges; three canisters holding two each leave the
aircraft among them, after the second, the fourth and the sixth man, and scatter as the
men do, a hex further at the most. A canister is a pile of charges with a container
round it: a man standing on it takes one with the ordinary **Pick up** (1 AP). It is
**evidence until it is empty**: an enemy coming onto or beside it finds it as it would a
parachute (alert +1, once, and that hex is a last known contact), but the charges stay
where they are. When the last charge is taken the canister is pulled under cover and is
gone.

**The way out on a timetable** (SPEC.md §10, `exfil.opensTurn` in the rules patch): 15.
Before that turn's player phase the exfil hexes are surf: no man may enter them, and
they are drawn closed, with the turn the boat comes. From then until dawn they are the
way out as in any mission. The boat is scenery, as the train is: it is seen coming in
across the sea for two turns before, its place follows from the turn, and the exfil's
hover, the orders, the mission panel and the turn card say when it comes and when it
goes.

What carries over unchanged, and so costs none of the two: **time pencils** (the
airfield's rule, 2 to 6 turns, the default 4), **reinforcements** (France's Hard rule,
here on Normal too), the reserve, the RAF diversion, and "one objective, one explosion".

### Who carries what

Room is the role's `charges` (what he would have jumped with), and a man carrying more
than that is 1 AP slower (SPEC.md §4). In this mission's patch a **sapper has room for
two**. So:

| Man | Carries at full pace | Can carry, 1 AP slower |
|---|---|---|
| Dutch, Fitch (sappers) | 2 | — |
| Nunn (gunner, Ox) | 1 | — |
| Vance, Barrow (scouts), Speers (gunner) | 0 | 1 |

The two sappers and Nunn can carry five between them at full pace, so the sixth charge,
or any charge a sapper cannot get to, is a scout's fetch at a sapper's pace. Losing a
sapper drops two charges on his hex. Whoever carries a charge can set it.

### The ground

New terrain, as data in `terrain.json` and drawn in `theme.js`. Only this map has these
types, so no code asks which mission is on. Its wash is for the art milestone (M43); a
proposal is a cold **slate blue** for rock and winter ground, as the desert's ochre is
for sand, with every colour that means something left alone.

| Terrain | Move cost | Cover | Blocks sight | Notes |
|---|---|---|---|---|
| Hillside | 2 | light | no | bare winter slope: slow and seen |
| Crag | impassable | — | yes | rock faces that shape the valleys |
| Ravine | 2 | heavy | yes | the torrent's bed: the safe artery; bad landing |
| Terrace | 2 | heavy | yes | stone-walled terraces, as hedgerows are in France |
| Olive grove | 1 | light | yes | as the orchard |
| Plough | 1 | none | no | open winter fields: fast, exposed, soft landings |
| Aqueduct | impassable | — | yes | the channel and its piers; the objective stands on it |
| Arch | 1 | heavy | yes | under the aqueduct, between the piers; its charge points |
| Shingle | 1 | none | no | the beach |
| Shore rocks | 2 | heavy | yes | where men lie up for the boat |
| Sea | impassable | — | no | no swim; nothing lands in it |

Kept from France: **Track** (the road and the mule track), **Farmhouse** (the farm by
the aqueduct, the fishing hamlet), **Ridge**, **Wood** (bad landing), and **Bridge**
(the road bridge's deck, which becomes ravine once it is down). There is no canal, so
Swim is not offered, and no telephone, so Cut the line is not.

### The map

`data/map-aqueduct.json`, drawn at M41. What it must hold:

- **The aqueduct** in the north-west, carried over the **ravine** on its piers. Six
  charge points under its arches, on both banks of the torrent, of which the job needs
  four: a choice of where to stand, as the exchange's three are in France. The **farm**
  stands beside it, as it did.
- **The ravine** runs from the aqueduct south-east down to the sea: the quiet way home,
  under cover all the way and slow.
- **The road** comes in from the north-east edge, crosses the ravine by the **road
  bridge** in the middle of the board, and runs down to the **fishing hamlet** above the
  beach: the fast way home, and the way the garrison's lorries come. The bridge has two
  charge points and needs one.
- **Terraces and olive groves** on the slopes between the two: the middle way.
- **The beach** in the south-east corner, **shore rocks** at either end of it, the
  **sea** beyond. The exfil is three hexes at the water's edge. The boat's run in across
  the sea (`boatRun`, art only) ends there.
- **Three drop runs**, all landing north and west of the road bridge so nobody starts
  below the job, told apart as France's are: one along the ravine above the aqueduct
  (QUIET: the canisters come down in cover, some in the torrent's bed where a landing
  costs a turn), one over the plough beside the farm (STEADY: soft landings, the
  aqueduct's guard close), one down the valley toward the road bridge (FAST: nearest the
  bridge and the way home, the longest carry up to the piers).
- **Nobody and nothing lands in the sea or on a crag**, and no canister on a man.

### The garrison

**Six enemies** and the reserve: two fewer than France, five fewer than the airfield.
The real aqueduct had no guard at all; this one has enough to be feared and few enough
to keep the dial down.

- **Sentries**: the **aqueduct guard** at the farm, looking along the piers; the
  **bridge post** on the road bridge; the **coast watcher** in the hamlet, looking over
  the beach.
- **Patrols**: one along the aqueduct and round the farm; one on the road between the
  bridge and the hamlet; one through the terraces, crossing the landing grounds, so
  that on every run something can be found.
- **The patrols set out on turn 2**, as on the airfield: with canisters to find, turn 1
  is a heavier regroup than either other mission's.
- **The reserve** comes down the road at Alarmed and guards the way onto the beach.
- **Reinforcements**: the aqueduct going up calls **one squad** (Hard two) down the road
  to a post above the beach, in the enemy phase after the bang. They are patrols: they
  can be suppressed, knifed and killed.
- **None of them comes once the road bridge is down**, reserve or reinforcements: the
  exchange's payoff in France, by road instead of by telephone.

### The objectives

Numbers are Normal's, per kind in the mission's rules patch.

| Objective | Needs | Blast / kills within | Alert | Score | Pays |
|---|---|---|---|---|---|
| **Aqueduct** (PRIMARY) | 4 charges, of 6 points | 1 / 1 | +3 | 10 | the win; calls up 1 squad |
| **Road bridge** | 1 charge, of 2 points | 1 / 1 | +3 | 4 | no reserve, no reinforcements; becomes ravine |

**The win**: `destroyPrimary`, and at least the level's `minimumOut` men **in the boat**
by dawn. Easy: three charges, and no squad is called. Hard: five charges, two squads.

**Time pencils**: 2 to 6 turns, the default 4 (Dutch, Steady Hands: 1 to 5). A timer
that would go off after dawn cannot be picked, as ever. Four charges are four men's
work or two turns', so timers set a turn apart to the same turn make **one bang**, and
that is worth a whole step of the dial here.

**The score**: as France's, with no train and no salvo. The clean run is France's too:
never Alarmed, no diversion, 3.

### The alert on this ground

The review before this mission asked that the dial be budgeted before the map is drawn,
since no number could bring the airfield's down afterwards. The states begin at 0, 2, 4
and 7 points (§6).

**A tidy win on Normal ends at Alert (4 to 6), and Alarmed is what a mistake or a greed
costs.**

| What happens | Points | Running |
|---|---|---|
| The aqueduct, all four charges in one bang | +3 | 3, Suspicious |
| Up to three slips: a man seen, a parachute or canister found, a stone, a body found, a silenced kill | +1 each | 4 to 6, Alert |
| A fourth slip | +1 | 7, Alarmed |
| The aqueduct in two bangs instead of one | +3 more | Alarmed with one slip |
| The road bridge as well | +3 more | Alarmed with one slip, but nothing comes down the road |

So the plan the dial rewards is one bang and a quiet walk, and the road bridge is a
real trade: the beach kept clear, for the clean run and a hunting garrison.

What the map has to do to keep that true, checked by the bot at M41 and M42 before any
art is asked for:

- There are **nine pieces of evidence** on the ground after the drop (six parachutes,
  three canisters), three more than France. With nobody packing and no canister
  emptied, the patrols' beats find **no more than two** of them on any run before the
  aqueduct goes. Tidying up is worth doing; not doing it is not the whole budget.
- With only six enemies there are few bodies to find and few finders.
- **The measure**: the careful bot's Normal wins end below Alarmed in **at least six
  games in ten** on every run, and the naive bot's in at least three in ten. If the
  first map misses that, the map and the beats are redrawn, not the alert's numbers.
- Four quiet turns take a state off the dial (§6), so a stick lying up for the boat can
  earn its way back down; the explosion floor still holds it at Suspicious.

### The boat and the clock

The lesson of the goods train (M37) was that waiting is dull: at turn 17 most of the
night was spent beside the bridge. So the boat's turn is set the same way the train's
was, **to be in time for, not to wait for**: the turn a stick that has come straight
from the job reaches the shore. The first guess is the aqueduct up on turns 10 to 12, a
five or six turn walk down, the boat in on 15 and dawn at 18. M42 sets it by the bot:
`opensTurn` is the turn the naive bot's first man reaches the beach on Normal, and dawn
three turns after.

What the closed beach is for, since a well-timed stick barely waits: nobody can bail out
early with the job half done; the squad the bang called has time to reach its post, so
the last stretch is a problem and not a formality; and the long timer has a point,
because a bang that goes while the stick is still under the piers is a whole night of
being hunted.

**Withdrawn** stays the engine's rule: the mission ends at once and every man still on
the board gets out, boat or no boat. The back page's words for it are the mission's
("the rest take to the hills").

### Its words, sounds and pictures

For M43, all of it data in `missions.json` and the map. Placeholder copy:

- **The orders** say the two rules in a line each: where the charges are ("The charges
  are in the CANISTERS: 2 in each. Nobody jumps with one") and when the boat is ("The
  BOAT is in on turn 15 and gone at dawn. Not before").
- **The tagline**: SIX MEN · ONE AQUEDUCT · THE BOAT LEAVES AT DAWN.
- **The contents page** keeps its line: "A great aqueduct in the mountains that wants
  every charge you carry, and a boat on the coast that will not wait."
- **The diversion** is the RAF again, as it was in 1941: BOMBERS OVER FOGGIA.
- **The six's lines**: only those that name France's ground change, as on the airfield.
- **To be drawn in code first, then painted** (ART-PROMPTS.md at M43): the canister, the
  boat, the aqueduct and its arches, the eleven terrain chips, a title card, a contents
  panel. A winter set of portraits is the operator's to offer, as the desert's was.
- **Sounds**: the canister's thump, surf on the beach, the boat's oars; the back page's
  own two if the operator records them.

### Balance

Targets are §10's. The bot has to learn two things before its numbers mean anything
(M41): to fetch from the canisters, the nearest man with room going to the nearest
charge, and to keep the boat's time, lying up in the shore rocks until the beach opens.
Baselines are written here when M42 has them.

### The order it is built in

| # | What |
|---|---|
| **M39** | This file, and the operator's four calls |
| **M40** | The engine: canisters and the exfil's opening turn, as data, off in both missions; France's and the airfield's bot output unchanged, byte for byte |
| **M41** | The map as a draft (`?mission=aqueduct`): terrain drawn in code, the garrison, the objectives, the boat as scenery; the bot taught to fetch and to wait |
| **M42** | Balance: the alert budget measured, the boat's turn and dawn set, the three levels inside the §10 targets, the rating's bands |
| **M43** | Words, sounds and the art hand-off; `playable` on the operator's word |
