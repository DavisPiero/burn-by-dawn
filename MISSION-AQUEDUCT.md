# BURN BY DAWN — Mission 3, the aqueduct (SPEC.md §14)

This is §14 of the specification, kept in a file of its own, as MISSION-AIRFIELD.md is
§13. It is as authoritative as SPEC.md. Section numbers in it (§6, §10) are SPEC.md's.

**Specified 5 Oct 2026 (M39). Playable since M41d (6 Oct 2026, the operator's): picked
from the contents page, with its painted panel. Balanced by the bot at M42; its words,
sounds and art hand-off at M43.** Its two rules are in the engine and written in SPEC.md (§9 Supply
canisters, §10 The way out on a timetable); its numbers are here, set at M42 unless it
says the operator chose them. The words and names are placeholder
copy for the operator to reword. Once the mission is playable this file says how things
are, and keeps no history (DECISIONS.md has it).

The operator's calls (5 Oct 2026): southern Italy, February 1941; **every charge comes
down in a canister** and the men jump empty-handed; **the boat keeps a timetable**, like
the goods train (and, since 6 Oct, can be signalled in early); and **a tidy win on Normal ends with the
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

The way out is **a boat from the submarine**: in on **turn 15**, there for **three
turns**, gone at the end of **turn 17**. A man who reaches the beach can **signal it in
early**: it then lands two turns later and still stays only three. Before it lands
there is no way off the board. So the
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
charges: 2, scatterWeights: [0, 4, 4, 2, 1] }`. The men jump with no charges; three canisters holding two each leave the
aircraft among them, after the second, the fourth and the sixth man, and scatter as the
men do, a hex further at the most. A canister is a pile of charges with a container
round it: a man standing on it takes one with the ordinary **Pick up** (1 AP). It is
**evidence until it is empty**: an enemy coming onto or beside it finds it as it would a
parachute (alert +1, once, and that hex is a last known contact), but the charges stay
where they are. When the last charge is taken the canister is pulled under cover and is
gone.

**The way out on a timetable** (SPEC.md §10, `exfil` in the rules patch): `opensTurn`
15, `openFor` 3, `call` `{ apCost: 1, leadTurns: 2 }`. Until the boat lands the exfil
hexes are surf: no man may enter them, and they are drawn shut, in red, with the turn
the boat comes. The boat is seen rowing in across the sea for the two turns before it
lands, bow toward the beach. The exfil's hover, the orders, the mission panel and the
turn card say when it comes and when it goes.

**Signalling it** (the operator's, 6 Oct 2026: a fast game should be possible, with the
pressure kept on). A man beside the water presses **B**, and a card asks first: the turn
it will land, the turn it will be gone, who is not near the beach, whether the aqueduct
is down. Only Enter sends it. From then the night is five turns long at most, and the
turn counter says so.

What carries over unchanged, and so costs none of the two: **time pencils** (the
airfield's rule, 2 to 6 turns, here the default 6), **reinforcements** (France's Hard rule,
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
types, so no code asks which mission is on. Its wash is the palette's **cold blue**,
thin over the paper, for rock and winter ground, as the desert's ochre is for sand
(ART-DIRECTION.md, Colour): no new colour, and every colour that means something left
alone.

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

`data/map-aqueduct.json`, redrawn at M42 for the balance. What it holds:

- **The aqueduct** across the north of the board, carried over the **ravine** on its
  piers, two hexes east of where it was first drawn so its west end can be walked
  round. The hex the torrent runs under it by is ravine, open, and a man can walk
  through it. **Eight charge points** at the piers' feet, four on each side and two
  either side of the torrent, of which the job needs four: a choice of where to stand,
  and one side is enough, so the party can work together. (Hard's five need both.)
  The **farm** stands at its east end, as it did.
- **The ravine** runs from the aqueduct south-east down to the sea: the quiet way home,
  under cover all the way and slow.
- **The road** comes in from the north-east edge, crosses the ravine by the **road
  bridge** in the middle of the board, and runs down to the **fishing hamlet** above the
  beach: the fast way home, and the way the garrison's lorries come. The bridge has two
  charge points and needs one.
- **Terraces and olive groves** on the slopes between the two: the middle way.
- **A mule track** up the west bank of the torrent, from the road below the bridge to
  the south-west piers: a track's pace on the slowest side of the map, in the open,
  beside a ravine that is cover and half the speed.
- **The beach** in the south, west of the torrent's mouth, **shore rocks** at its west
  end, the **sea** open to its east, where the boat comes from. The exfil is three hexes at the water's edge. The boat's run in across
  the sea (`boatRun`, art only) ends there.
- **Three drop runs**, all landing north and west of the road bridge so nobody starts
  below the job, told apart as France's are: **West**, across the hillside three rows below the
  aqueduct's west end (QUIET: nobody near, the slowest ground and the longest walk to
  the boat); **North**, over the plough beside the farm (STEADY: soft landings and the
  canisters in plain sight, beside the road the squads come down); **Valley**, astride
  the torrent above the road bridge (FAST: nearest the bridge and the way home, with
  men down in the torrent's bed and the bridge post close).
- **Nobody and nothing lands in the sea or on a crag**, and no canister on a man.

### The garrison

**Six enemies** and the reserve: two fewer than France, five fewer than the airfield.
The real aqueduct had no guard at all; this one has enough to be feared and few enough
to keep the dial down.

- **Sentries, and every one sweeps** (SPEC.md §6; the operator's: fixed posts on the
  charge points made every approach a fight): the **aqueduct guard** at the farm end
  looks west along the south side of the piers, then south-east down the valley; the
  **bridge post** down at the bridge, then up the road; the **coast watcher** along
  the beach, then up the road. The aqueduct itself hides its north side from the guard.
- **Patrols**, each guarding something and touching a landing ground at one end only:
  the **aqueduct patrol** along the north side of the piers to the edge of the plough;
  the **road patrol** between the hamlet and the bend above the bridge; the **hill
  patrol** across the west hillside, between the West run's ground and the south-west
  piers. So on every run something can be found, and none is walked from end to end.
- **The patrols set out on turn 2**, as on the airfield: with canisters to find, turn 1
  is a heavier regroup than either other mission's.
- **The reserve** comes down the road at Alarmed and stands on it above the beach.
  **Here it can be killed**, and one more squad comes for it (SPEC.md §6; the
  operator's: with men all round it, a squad that could not be touched read as a fault).
- **Reinforcements**: the aqueduct going up calls **one squad** (Hard two) down the road
  to a post above the beach, in the enemy phase after the bang. They are patrols: they
  can be suppressed, knifed and killed.
- **A body found calls a squad** (SPEC.md §6, `bodyFound.reinforcements` 1, `limit` 4;
  the operator's, M42b and M42c): the garrison finding one of its own dead sends for
  one, and it comes down the road to **stand where the body was found**, looking as the
  dead man looked. Four at most in a night.
- **None of them comes once the road bridge is down**, reserve or reinforcements: the
  exchange's payoff in France, by road instead of by telephone.

### The objectives

Numbers are Normal's, per kind in the mission's rules patch.

| Objective | Needs | Blast / kills within | Alert | Score | Pays |
|---|---|---|---|---|---|
| **Aqueduct** (PRIMARY) | 4 charges, of 8 points | 1 / 1 | +3 | 10 | the win; calls up 1 squad |
| **Road bridge** | 1 charge, of 2 points | 1 / 1 | +3 | 4 | no reserve, no reinforcements; becomes ravine |

**The win**: `destroyPrimary`, and at least the level's `minimumOut` men **in the boat**
by dawn. Easy: three charges, and no squad is called. Hard: five charges, two squads,
and **the boat stays two turns** (in on 15, gone with 16).

**Time pencils**: 2 to 6 turns, and **the longest, 6, is the one offered first**
(Dutch, Steady Hands: 1 to 5, and 5). A timer that would go off after dawn cannot be
picked, as ever. Four charges are four men's work or two turns', so timers set to the
same turn make **one bang**, and that is worth a whole step of the dial here. The game
helps: a first charge on six turns leaves the others five to arrive in, and the tin
then offers each of them the timer that goes off with it (SPEC.md §7).

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

**The measure** (M42) is the bot's `tidy` style (SPEC.md §10): careful movement, every
parachute packed on turn 1, the charges timed to one bang, no knife. **Its Normal wins
never reach Alarmed in at least six games in ten on every run.** Measured, 300 seeds,
west / north / valley: **94 / 62 / 84**, with 1.8 / 2.2 / 2.4 slips a win (three or
fewer in 92 / 86 / 80). The map and the beats were redrawn to get there, not the
alert's numbers.

What it costs to be less tidy, the same way:
- **The knife** (`KNIFE=1`, every enemy a man finds himself behind): 67 / 35 / 92. A
  body on the road is found by whatever comes down it, and on the North run that is
  the squad the bang calls.
- **Not packing** (the naive bot, which also knifes and takes the timer offered):
  43 / 10 / 45; packing alone (`PACK=1`) makes it 48 / 21 / 51.
- A find leads to the next: whoever finds a parachute walks to it, and finds the ones
  beside it. So "no more than two found with nobody packing", asked for when this
  mission was specified, **cannot be held by any beat that touches a landing ground**,
  here or in France (3.5 of six found on its North run). What the beats do instead is
  touch each landing ground at one end, and the patrols stand through turn 1, so a
  stick that packs loses none.
- Four quiet turns take a state off the dial (§6), so a stick lying up for the boat can
  earn its way back down; the explosion floor still holds it at Suspicious.

### The boat and the clock

The lesson of the goods train (M37) was that waiting is dull, so the boat is **to be
in time for, not to wait for**. Measured at M42 (Normal, naive): the aqueduct goes up at
the end of turn 12 or 13, and three men are at the shore with it down on turn 12 or 13
(Hard: 14). So **the boat in on 15 and gone with 17 stands**: a turn or two in hand for
a stick that has come straight from the job, none for one that has dawdled. A turn
earlier (14 to 16) the runs fall to 75 / 75 / 84 and a turn later (16 to 18) they rise
to 84 / 83 / 89, against 81 / 83 / 80 as it is.

What the closed beach is for, since a well-timed stick barely waits: nobody can bail out
early with the job half done; the squad the bang called has time to reach its post, so
the last stretch is a problem and not a formality; and the long timer has a point,
because a bang that goes while the stick is still under the piers is a whole night of
being hunted.

**Withdrawn** stays the engine's rule: the mission ends at once and every man still on
the board gets out, boat or no boat. The back page's words for it are the mission's
("the rest take to the hills").

### Its words, sounds and pictures

All of it data in `missions.json` and the map (M43). The copy is placeholder for the
operator to reword.

- **The orders** say the two rules in a line each, from the rules' own numbers: "The
  BOAT is in on turn 15 and stays 3 turns. There is no way out before it", with how to
  signal it, and "The charges are in the 3 CANISTERS, 2 in each. Nobody jumps with one."
- **The tagline**: SIX MEN · ONE AQUEDUCT · THE BOAT WILL NOT WAIT.
- **The garrison is Italian**: in February 1941 the aqueduct's guards were. Its cries
  are (ALLARME!, CHI VA LÀ?, MADONNA!), where the other two missions' are German, and
  its chips have a folder of their own (`enemyChips`: `assets/enemies/italian`), tried
  type by type before the usual one. **Until the Italian chips are painted
  (ART-PROMPTS.md Priority 19) it wears the German ones.**
- **The contents page** keeps its line: "A great aqueduct in the mountains that wants
  every charge you carry, and a boat on the coast that will not wait."
- **The diversion** is the RAF again, as it was in 1941: BOMBERS OVER FOGGIA.
- **The six's lines**: only those that name France's ground change, as on the airfield
  (Fitch's olives, Vance's aqueduct, Barrow's trees in Italy), and Nunn's, who carries
  no spare down here: "Nothing to carry down, Sarge. Where's that canister?"
- **Sounds**, made in code until recordings are found (ART-PROMPTS.md Priority 23): the
  canisters' thump as the stick lands, the boat's oars far off the turn it is sighted
  or signalled, and oars and surf the turn it lands. The back page is France's bells
  and toll.
- **Pictures.** Drawn in code (M41): the canister, the boat, the aqueduct and its
  arches, the road bridge, the eleven kinds of ground. Painted: its contents panel.
  Asked of the operator in ART-PROMPTS.md, each with a slot that falls back until its
  file is there: the Italian chips (19), its own title card (20; France's until then),
  the six in winter kit (21, optional; `portraits`: `assets/portraits/winter`), and
  references to redraw the board's pictures from (22).

### Balance

Targets are §10's. The aqueduct's reference is `MISSION=aqueduct KNIFE=1 SENSE=1 node
tools/balance-bot.mjs 300 naive` (SENSE: SPEC.md §10). The bot fetches from the
canisters (the nearest man with room goes, a man the charge would slow only if he is
well the nearest), works the pier feet nearest the stick, and keeps the boat's time,
lying up in heavy cover within three hexes of the beach until it opens. It never
signals the boat or blows the road bridge unless `greedy`.

**Baselines** (M42; win %, west / north / valley):

| Level | Naive | Seeds | Target |
|---|---|---|---|
| Easy | **95 / 93 / 93** | 200 | 95 or more: North and Valley 2 under |
| Normal | **79 / 74 / 76** | 300 | 75 to 90: North 1 under |
| Hard | **31 / 15 / 35** | 400 | 25 to 45: North 10 under |

Since M42c (a squad for a body, standing where the body lay; cover on the plough; the
farmhouse off the aqueduct's east end). Before M42b: 95 / 95 / 93, 81 / 83 / 80,
33 / 21 / 40. The naive bot knifes
whoever it finds itself behind, so the squads are what the North run lost: they come
in through its landing ground. Normal, other styles (200 seeds): careful 91 / 93 / 87;
tidy, which never knifes, 86 / 91 / 68, never Alarmed in 94 / 65 / 82 of them.

**Known and left for the operator:**
- **The hunter check still fails, with a squad for every body found that takes the
  dead man's place.** Normal: hunter 95 / 99 / 88 against careful 91 / 93 / 87; Hard:
  73 / 59 / 63 against 72 / 43 / 50. Four or five squads come in a hunter's game and it
  wins as often, scoring a point less on the North run: a squad standing where a
  sentry stood is knifed as the sentry was. The limit makes no difference (3, 4 and 6
  measured the same). What the bot cannot say is how it plays: a cleared piece of
  ground is no longer clear two turns later. If killing is still the best plan in the
  operator's hands, the levers left are the knife's own price here (a kill that is
  heard, or a second turn to make it) and a seventh enemy, not more squads.
- **Hard's North run is well under** (15). Cover on the plough (olives at three hexes,
  a terrace at one) did not move it, with the rule or without: what loses it is the
  squads coming in through its landing ground and a garrison Alarmed before the job in
  two games in three.
- **The Valley run's tidy bot wins least** (70) though its naive bot is level with the
  others: men who land in the torrent's bed lose turn 1 and the tidy bot waits for them.

**The rating's bands** (SPEC.md §10): **24, 30 and 35**. The naive bot's winning scores
on Normal have their middle half at 25 to 31 (North 23 to 29), the tidy bot's at 22 to
28; with the Road Bridge the middle half is 31 to 35 and the best games 39 or 40.

### The order it is built in

| # | What |
|---|---|
| **M39** | This file, and the operator's four calls |
| **M40** | The engine: canisters and the exfil's opening turn, as data, off in both missions; France's and the airfield's bot output unchanged, byte for byte |
| **M41** | The map as a draft (`?mission=aqueduct`): terrain drawn in code, the garrison, the objectives, the boat as scenery; the bot taught to fetch and to wait |
| **M42** | Balance (done): the map and beats redrawn to the alert budget, the boat's turn and dawn measured and kept, the levels against the §10 targets, the rating's bands |
| **M43** | Words, sounds and the art hand-off (done): the garrison's own chip folder, the six's lines, three made sounds, slots for its title card and winter portraits, the art asked for |
