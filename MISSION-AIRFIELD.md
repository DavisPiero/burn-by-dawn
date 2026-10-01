# BURN BY DAWN — Mission 2, the airfield (SPEC.md §13)

This is §13 of the specification, kept in a file of its own. It is as authoritative as
SPEC.md. "SPEC.md §13" in the code, the tests and the other documents means this file.
It is also the pattern for the next mission's file: what a mission's specification says,
and in what order.

Section numbers in it (§6, §10) are SPEC.md's. Like SPEC.md it says how things are **now** and keeps no history (DECISIONS.md has it).

---

SPEC.md §1–§11 describe mission 1 and the engine. This file describes mission 2 only
where it differs. Its two rules, time pencils and a blast that sets off its neighbours, are
engine rules and are written in SPEC.md §7; its numbers are here. The words and names are
placeholder copy for the operator to reword.

### The mission

**The Airfield, southern Tunisia, winter 1942.** Loosely based on 2 Para's jump at Oudna:
British paratroopers dropped by Dakota onto an Axis landing ground. The same six men,
the same 18×13 board, the same 20-turn night.

Eight **aircraft** stand in their dispersal pens, and one charge wrecks each. The job is
**any five of the eight** (Easy three, Hard seven), and every one past that is greed
against dawn. The stick carries **five bombs**, so the most it can wreck with bombs alone
is five. Two targets take more, each setting off the two aircraft beside it for one bomb:
the **fuel bowser** on the south apron and the **bomb store** in the north dispersal. On
Normal neither is needed: each is a greed, and which one, or both, is the plan the drop
run suggests. On Hard both have to go. A signals tent, the airfield's
telephone exchange, stops the reserve and the reinforcements, as in France.

Its pillar check. What the player does: slip down the wadi, knife a pen guard between the
blast walls, throw a stone to send the car away, set a long pencil and walk off, blow the
bowser or the bomb store for two aircraft with one bomb, time four to go up together. What it costs: every aircraft that goes up raises
the alert, and the car answers a noise fastest of anything on the board.

### The ground

New terrain, as data in `terrain.json` and drawn in `theme.js`, in **desert ochre** (§11).
Sand is a pale wash of the ochre, dunes a stronger one in bands, and the wadi the ochre
darkened with ink, so the safe artery reads as a dark channel as the hedges do. The strip
and the camp stay bare paper, man-made against the sand; scrub is army-green tufts on
sand. Every colour that means something is unchanged, so a counter, a threat or a burning
fuse reads the same on both boards. Only the airfield's map has these terrain types, so
no code asks which mission is on.

| Terrain | Move cost | Cover | Blocks sight | Notes |
|---|---|---|---|---|
| Sand | 1 | none | no | the open desert |
| Scrub | 1 | light | no | camel-thorn; light cover you can be seen in |
| Dunes | 2 | light | yes | a crest hides what lies beyond it |
| Wadi | 2 | heavy | yes | a dry watercourse: the safe artery; bad landing (rocks) |
| Wire | 3 | none | no | the perimeter wire; a full turn for a sapper; bad landing |
| Strip | 1 | none | no | the landing strip, drawn as one broad band |
| Pen | 1 | heavy | yes | the walls round an aircraft; its charge point stands in it |
| Aircraft | impassable | — | yes | a parked aircraft; the objective stands on it |
| Camp | 1 | heavy | yes | tents and huts |

Kept from France: **Track** (the perimeter track and the road in), **Ridge** (the
escarpment), **Emplacement** (the AA pits), **Fuel dump** (under the bowser). A mission
with none of the swim's `across` terrain does not offer Swim at all.

### The map

`data/map-airfield.json`.

- The **landing ground** fills the middle and east of the board inside a ring of **wire**,
  with the **perimeter track** just inside it. The **strip** runs east–west across the
  middle.
- **North dispersal**: four Ju 87 Stukas along the strip's north side. **South
  dispersal**: four Ju 52s on the apron, the **bowser** between the middle two. Each
  aircraft has one pen hex behind it, away from the strip, and that is its one charge
  point. The bowser has one charge point too: the one hex beside it whose blast takes in
  exactly the two Ju 52s either side of it (a test holds it to that), with a fuel hose
  drawn to it. **The bomb store** is its twin in the north: between the two eastern
  Stukas, its one charge point the hex north of it, between their pens, whose blast takes
  in exactly those two (a test holds that too), with a bomb trolley's rails drawn to it.
  What makes it a greed: it is the far corner of the field from the trucks, its charge
  point is where the north dispersal guard's beat ends, and the north AA pit is two hexes
  off.
- **The camp** in the east: tents, the **signals tent** with its mast, the AA pits, and
  the gate where the road comes in from the east edge (Hard's reinforcements come this
  way).
- **The escarpment** runs north–south on the west, looking down over the wire.
- **The wadi** winds in from the south-west corner under the escarpment, through a gap in
  the wire, to the south dispersal: the quiet way in, like the towpath.
- **The dunes** in the north-west, slow and blind, lead to the north dispersal.
  **Scrub** in the north and north-east is fast and light cover, open to the car.
- **Exfil**: the rendezvous with the trucks, at the wadi's mouth in the south-west
  corner, drawn as two desert trucks with a scrap of netting (the map's `exfilArt`).
- **Three drop runs**: straight down outside the west wire (West, quiet), along the scrub
  above the north wire (North, steady), and along the sand below the south wire, nearest
  the Ju 52s and the bowser (South, fast).
- **Art only**: an aircraft objective's `art` picks its picture (Stuka or Ju 52); the
  wire is laid as a line like a hedge; the strip is a grey wash with its two edges and a
  painted centre line; the escarpment is France's ridge; the place names (Bir el Kasra,
  Erg Safra, Djebel Rhar, Oued Melah) are placeholders.

### The garrison

Eleven enemies, three more than France, plus the reserve:
- **Sentries**: the two AA pits (one in the north dispersal, one at the south-east
  corner), a guard beside the signals tent, and a guard among the south-east tents.
- **Patrols**: a guard walking each dispersal; the outer patrol on the scrub above the
  north wire, where the North run lands; one in the camp; a West patrol on the sand under
  the escarpment, where the West run lands; and a Sand patrol below the south wire, where
  the South run lands. So every run's parachutes can be found.
- **The perimeter car**, an enemy type of the mission's own, `vehicle`: speed 6, so it
  drives the whole perimeter in a few turns and reaches a noise first. Vision and arc as
  a patrol's, on every level. It **can be suppressed but not killed or knifed**, like the
  reserve: the crew duck, the car stops for a turn. The verbs that answer it: a stone
  sends it off to look, a gunner stops it for a turn, and the wadi and the dunes hide
  from it. It keeps to the track while it patrols, but drives across open ground to a
  noise, paying the same ground costs as anyone.
- **The reserve** turns out from the camp at Alarmed and guards the way to the trucks.
  None comes once the signals tent is down.
- **The patrols set out on turn 2** (`patrols.setOutTurn` 2, SPEC.md §6): the patrols and
  the car stand where they are through turn 1, and walk from the end of turn 2. The board
  is small, and on every run two to four of the garrison start at the three hexes the
  landing rule allows, their beats lying across the landing grounds; so the stick has one
  quiet turn to regroup, pack its parachutes and get under cover before they come round.
  The posts watch from the first turn as ever. It is this mission's number: France's
  patrols start well away from its landings and walk from the start.

### The objectives

Numbers are Normal's, per kind in the mission's rules patch.

| Objective | Needs | Blast / kills within | Alert | Score | Pays |
|---|---|---|---|---|---|
| **Aircraft** ×8 | 1 charge | 1 / 1 | +2 | 2 each | toward the win |
| **Fuel bowser** | 1 charge | 2 / 1 | +4 | 2 | sets off the aircraft in its blast |
| **Bomb store** | 1 charge | 2 / 1 | +4 | 2 | sets off the aircraft in its blast |
| **Signals tent** | 1 charge, or cut the line | 1 / 1 | +3 (cut +1) | 4 | no reserve, no reinforcements |

**The win**: `destroyCount { kind: "aircraft", count: 5 }` (Easy 3, Hard 7), and at least
the level's `minimumOut` men out by dawn. No objective is `primary`. Meeting it pays
`scoring.win` 10, so the job done with three men out beats the best retreat.

**The bombs**: small Lewes bombs, so a **scout carries 1** as well as each sapper: Dutch,
Fitch, Vance, Barrow and Nunn (Ox) one each, five in the stick. Only Speers carries none:
his job is the car. A man killed or wounded drops what he carried on his hex, and anyone
with room picks it up, so losing a sapper is a fetch under fire, not a lost mission.

**Time pencils**: 2 to 6 turns, the default 4 (Dutch, Steady Hands: 1 to 5).

**The salvo** (SPEC.md §10): **four or more aircraft up in one fuse phase pays 3**
(`scoring.salvo`). A bowser or bomb store gives two of the four; the rest are timers set
to the same turn, each shorter than the last as the stick goes round. It is what the tin
of pencils is for besides getting clear: the bot setting every charge to go with the last
earns it in about half its games, the bot taking the timer offered in one in ten.

**The alert on this ground.** The garrison is Alarmed by the end of every raid: the bot
reaches it in every game, in every style, and no alert number or threshold changes that
(found bodies and parachutes do it as much as the bangs). The mission is not whether it
goes up but where the stick is when it does. So two things are the mission's own:
- **The clean run** is the night before the first bang: the garrison **below Alert when
  the first bang goes** and no jeep raid called (`cleanNeverReached: "alert"`,
  `cleanUntil: "firstExplosion"`). The back page's line is "quiet to first bang, no
  diversion", and the orders say it up front: "Getting in with as little enemy attention
  as possible earns a special bonus!" (`words.cleanOrders`). It is what packing the parachutes and hiding the bodies are for here: the
  bot earns it about one game in twenty on the North run and one in three on the South
  without packing, and in half of the North's and most of the South's with every chute
  packed.
- **The jeep raid is urged only for men in contact** (`diversion.prompt.alertState` null):
  an Alarmed garrison is the ordinary state of things here, not a pickle.

### Its words, sounds and pictures

All of it data in `missions.json` and the map.

- **The orders** say the two rules: every charge takes a timer (the keys, the default,
  why a long one, and the salvo: "4 aircraft up in one bang: bonus +3"), and what the
  bowser and the bomb store take, in one line ("The BOWSER sets off the 2 Ju 52s beside
  it and the BOMB STORE the 2 Stukas beside it: 3 targets for one charge each time, and
  one bang"). Targets that need the same are said together in the charges line ("Stukas,
  Ju 52s, Bowser, Bomb Store- 1ea at its charge target"), and the bonus targets' points
  in the order they are named ("+2, +2, +4pts"): the card has no line to spare at
  1280x800. The **turn card** adds "then pick a timer" to the first turns' charge
  hint, and names what the bowser sets off while it stands.
- **The diversion** is a **jeep raid**: "JEEP RAID" on the button and card, "JEEPS ON THE
  NORTH WIRE", "jeeps shoot up the north wire" in the log. A jeep drives past outside
  the wire, guns flashing at the field, to an engine and four bursts of fire. The map's
  `diversionRun` (art only) offers three lines, the north scrub, the south sand and the
  west edge, each from off the board to off it; the jeep takes the one with the fewest
  counters near it, the north on a tie, and the whole jeep stays inside the board's edge.
- **The six's lines**: only those naming France or its ground change (Fitch's cabbages
  and dirt, Vance's church, Barrow's trees, bridge and mud). Their portraits are the
  desert set (`assets/portraits/desert`).
- **The back page**: a bugle call for success (`desertVictory`), the landing ground's
  siren for the rest (`desertDefeat`).
- **Our men's counters** are burnt orange here, and a fallen man's grave mound with them.
- **Its title card** is `assets/title/title-card-airfield.jpg`, with BURN BY DAWN painted
  in. The tagline is SIX MEN · EIGHT AIRCRAFT · DAWN AT TWENTY.
- The paintings and recordings it uses are listed in ART-ASSETS.md and ART-PROMPTS.md.

### Balance

Targets are §10's, for the airfield as for France. **Baselines**, 300 seeds, win % west /
north / south, with `KNIFE=1 BOWSER=1`: the naive bot going for the bowser, as its ring
tells a first-timer to (the bowser and the bomb store both, nearest first, while the job
wants two or more), and taking the timer offered first. **Easy 98 / 99 / 99, Normal
89 / 95 / 79, Hard 25 / 36 / 29**. Hard is inside the targets on every run; Normal's
North is 5 over. The careful bot, which is nearer a person: Normal 100 / 100 / 98, Hard
65 / 68 / 63. Before the patrols waited a turn (M36) the same runs gave Normal
88 / 92 / 82, Hard 34 / 22 / 29, and the careful bot's Hard 80 / 63 / 65: the quiet
turn evens the three runs on Hard, and on Normal it takes away the early wounds (men
hit in the first three turns, North and South: 0.54 and 0.16 a game before, 0.01 each
after) without moving the win rate. Returning fire only when cornered (`FIRE=cornered`)
leaves every one of these where it is. The hunter against `careful`, and what each rule
is worth to the bot, are in DECISIONS.md.

**The rating's bands** (SPEC.md §10): 36, 43 and 50.

Known and left as it is (DECISIONS.md): the West run, which lands beside both the wadi
and the trucks, is the best run by score and the quietest; the bomb store has made the
North its equal in games won.
