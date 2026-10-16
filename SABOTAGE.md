# BURN BY DAWN — Sabotage (SPEC.md §7)

This is §7 of the specification, kept in a file of its own since M48c. It is as
authoritative as SPEC.md: the objectives, charges, fuses and time pencils, explosions and what each target pays back. "SPEC.md §7" in the code, the tests and the other
documents means this file.

Section numbers in it (§4, §10) are SPEC.md's. Like SPEC.md it says how things are **now**
and keeps no history (DECISIONS.md and DECISIONS-ARCHIVE.md have it).

---


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
same turn or not. **A charge point that has gone off is spent** (M49d, the operator's:
two points blown twice made the aqueduct's four): nothing more is set on it, and its
point is no longer drawn, its scorch left to say so.

A trooper within a charge's **kill radius** at detonation dies, wounded or not. Inside the
**blast radius** but past the kill radius (only the fuel dump has such a ring) he takes
**one hit**, as from a shot. The hover path warns of both. **An enemy anywhere inside the
blast radius dies**, unless its type cannot be killed; it leaves a body where it fell
(M49b, the operator's: they vanished), **already counted as found**: the bang is what the
garrison hears, so a body found after it would count the same event twice. It raises
nothing, calls no squad and scores nothing, and the dead man stops holding anyone in
contact.

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
  shortest longer one that lets every man get clear. **Where charges already burn on
  his target**, the one that goes off the same turn as the last of them, if one of his
  reaches it and lets every man get clear: one bang, by pressing Enter. The tin says so
  in a line ("4 turns goes off with the charges already set: one bang.").
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
- The bridge down earlier stops it at the west bank, a hex short of the gap: on the
  board already, or setting out later on its own timetable (M49b, the operator's: none
  came at all, which was a pity); down after it has gone by, it runs on. Either way it
  pays nothing.
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
