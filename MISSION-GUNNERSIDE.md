# BURN BY DAWN — Mission 4, the heavy water plant (SPEC.md §16)

This is §16 of the specification, kept in a file of its own, as MISSION-AIRFIELD.md is
§13 and MISSION-AQUEDUCT.md §14. It is as authoritative as SPEC.md. Section numbers in
it (§4, §6, §7, §9, §10, §11) are SPEC.md's.

**Specified 18 Oct 2026 (M56). Its engine is built (M57): tracks in the snow (SPEC.md §9
Tracks), the no-shot clean run and the card before the first shot, all off until the
mission's patch turns them on. The map is drawn as a draft (M58), `?mission=gunnerside`,
not yet balanced or worded.** This file says what is to be built and
how it is to play; once the mission is playable it will say how things are, and keep no
history (DECISIONS.md has it). Every number in it is a starting point for the balance
milestone unless it says the operator chose it. The words and names are placeholder
copy for the operator to reword.

The operator's calls (18 Oct 2026):
- **Stealth is the point of this mission, and the game says so everywhere**: the orders,
  the words, the men's lines, the pictures and the score all tell a player who likes a
  fight that tonight a fight is how the job is lost, and reward the quiet way.
- **Footprints in the snow** are drawn on their hexes, each print turned the way the man
  walked through it, and fade over the turns after until they are gone.
- **The way out is in the north-east**, back across the gorge: unlike the three maps
  there are, whose ways out are in the south.
- **A decoy flare instead of the RAF diversion**: the same rule, its own words and sound.
- **Comic panels** belong to this mission's spec: where they would help it is written
  below, as an element to develop.

---

### The mission

**The Heavy Water Plant, Norway, February 1943.** Loosely based on Operation Gunnerside:
a handful of Norwegian commandos skied across the Hardanger plateau, climbed down into
the gorge below the Vemork plant and up its far side, went in through a cable duct, set
their charges on the heavy-water cells and were gone before the garrison knew where the
bang had come from. Not a shot was fired. Here it is the same six British paratroopers,
the same 18×13 board, and a **20-turn night** (a February night in Norway is long; the
balance milestone measures it).

The job is **the cell hall** inside the plant: three charges (Easy two, Hard four) on
the cells, set from inside, the way in one cable duct or one watched door. The plant
stands on a shelf on the far side of a **gorge** from where the stick lands, and the way
out is back across it. So the night has two crossings: one quiet, on the way in, while
nobody knows the stick is there; one hunted, on the way out, after the bang.

**What makes it the fourth mission and not a fourth of the same.** The other three are
won by timing bangs. This one is won by not being noticed: one bang, and before it a
night of leaving nothing behind. Its two rules both make evidence of movement:
the **gorge**, slow and unseen, against the quick bridge in the sentries' eyes; and
**tracks in the snow**, so fast open ground tells the garrison where the stick went.
Gunfire here is heard across the whole board, and the clean run, worth more here than
anywhere, is **not a shot fired**.

Its pillar check (SPEC.md, the second pillar). What the player does: send a scout along
the railway where the snow is swept, knife the plateau patrol before it reaches the
prints, climb into the gorge under the bridge post's nose, cut the telephone line, slip
through the cable duct, set three timers to one bang and be back on the ice before it
goes. What each costs: the gorge is two or three turns the bridge would do in one; open snow
leaves a trail for whoever walks past it; a knifed patrol is a body on the snow where
the next one walks; the telephone is a charge the hall may want and a turn of a scout's
night; and the bang turns the whole shelf out between the stick and home.

### Its two rules

**The gorge** (data only: a new terrain, no code). The gorge's sides are **Gorge side**,
whose move cost (30) is more than any man's pool, so a man steps onto one only at full AP,
with the step every man always has (SPEC.md §4, `minimumStep`), and it takes his whole
turn: climbing down is a turn, and climbing out is a turn. They are heavy cover and block
sight. Where the gorge narrows it is two sides and nothing between: a crossing is a
turn down and a turn up, **two turns, against one on the bridge**, which two sentries
watch. In its wider middle stretch the river at the bottom is frozen: **Ice**, 1 AP,
heavy cover, so a man down there is seen only from beside him, and that crossing is three
turns (M58b, the operator's: three turns everywhere was too slow, and a scout stuck at
the edge waiting for a full pool felt like the game, not the gorge). It is France's swim against the bridge, sharpened, and the map
draft sets the exact hexes to that aim. A wounded man can still climb (the step needs
only a full pool), at the same cost. The garrison does not climb: its routes keep to the
bridge, and a patrol hunting at Alarmed paths round by the bridge, as it would round
any ground that dear. (The operator's, M58: a whole turn, never 3 AP, so the gorge is
the slow way that keeps a man out of a fight. The 30 is never shown: the hover says
"a climb: a whole turn", and the move "climb · his whole turn".)

**Tracks in the snow** (an engine rule, `tracks` in the rules patch; null in every other
mission, so nothing changes there).
- A man who **moves onto open snow** leaves **prints** on that hex. Which ground takes
  prints is the terrain's own flag (`tracks: true` in `terrain.json`): the **Snowfield**
  and the **Drift**. Pine wood, rock, the road and the railway take none: the trees hold
  the snow off, the road and the line are trodden or swept. Landing leaves none (the
  parachute is evidence enough), and nor does a throw, a knife or anything that is not
  a step. The garrison leaves none that matter.
- **Prints last `turns` turns** (3 to start): laid in turn N, they are there through the
  enemy phases of N, N+1 and N+2, and gone at the end of turn N+2, when the wind and the
  falling snow have filled them. A hex walked again takes the newest prints.
- **They are found as a parachute is** (SPEC.md §9): an enemy coming onto or beside a
  hex with prints, on any hex it walks through or where it ends its go, finds them:
  **alert +1**, a noise there (heard 3 hexes, as a parachute found), and that hex becomes
  a last known contact. **Finding one hex of a trail clears the whole trail**: every
  print that man laid in that one move. So a long walk across the open is one find, not
  ten. In one enemy phase **prints raise the alert once at most** (`alertPerPhase` 1),
  however many trails are found, so the rule cannot snowball the dial on its own: the
  noises still go where each trail was found, and patrols still walk to them.
- **No dice, no hiding them.** There is no action to brush them out (building one would
  be building ahead): the answer is the route, the railway, the trees and the turns.
  Undo takes prints back with the move that laid them, as it takes back everything else
  in the player phase.
- **What the player sees.** The prints on the board (Its pictures, below). On the hover
  path, a boot mark on every hex that would take prints, and where a patrol's coming
  walk passes one, TRACKS: FOUND NEXT TURN BY THE PLATEAU PATROL in the readout, so it is
  never a surprise (Feel: the player sees the risk before committing). Hovering a print
  says whose it is, the turn it fills in, and who will walk past it first. The turn
  report says when prints are found, and by whom.
- **The play tip**: the first time a man lays prints, TRACKS! is lettered beside them in
  the pen, with "the patrols will follow them" under it, once a game.

Both rules serve the spine. The bridge is fast and seen; the gorge is slow and unseen.
The snow is fast and leaves a trail; the trees and the line are slow or out of the way
and leave none. Stealth costs turns; speed costs alert.

### The shot

Not a rule of its own: numbers in the rules patch, and one small engine addition.

- **The gorge echoes.** Gunfire (a gunner's suppress, anyone's fire back) raises the
  alert **+4** here, not +2, and is **heard across the whole board** (`noise.gunfire` 18),
  so every patrol comes to look. One shot from a quiet night puts the garrison straight
  to Alert; one shot and the bang is Alarmed. A silenced kill still needs a suppress
  first (SPEC.md §4), so there is no quiet shot to be had. **Speers's Cool Head** (gunfire
  alert −1) matters here more than anywhere, and his particulars say so.
- **The clean run is "not a shot fired"** (`scoring.cleanNoShot`, the engine addition:
  true asks, on top of the mission's state, that no man fired all night: no suppress,
  no fire back, no kill). Here: never Alarmed, no shot, no decoy flare. It pays **5**
  (`scoring.clean`; 3 elsewhere), the biggest clean bonus in the game, and the orders
  and the back page call it NOT A SHOT FIRED.
- **The first shot asks first** (`confirmShot`, the engine addition's second half; off
  elsewhere). The first time in a night a man would fire, a card asks, as the exfil's
  does (SPEC.md §10): "A shot here is heard by the whole garrison. Alert +4, and the
  NOT A SHOT FIRED bonus is lost." Only Enter or its button fires; any other key or
  click stands down. After the first shot it does not ask again: the bonus is gone.
- **The knife is the weapon** (SPEC.md §4, unchanged: silent, a full turn, a body left).
  Its body, found, still raises the alert, and **calls a squad** to stand where it lay,
  as on the aqueduct (DETECTION.md, `bodyFound.reinforcements` 1, `limit` 3). So a
  knife clears the way tonight and costs later; a gun costs now, at once, and everywhere.

### The decoy flare

The RAF diversion's rule unchanged (SPEC.md §4: once a night, no AP, while the leader is
alive; the alert one state down, every search and held contact dropped). In Norway in
1943 there were no bombers to call, so **the leader fires a flare far off over the
plateau** and the garrison looks the other way. Its words: `diversionName` "Decoy flare",
its card's kicker A FLARE OVER THE FAR RIDGE, its log line "a flare over the far ridge".
Its sound is a flare's pop and fizz (Sounds, below). It still forfeits the clean run.
The leader's particulars say he carries the flare pistol, not the radio.

### Who carries what

In this mission's patch **a sapper has room for two**, as on the airfield and the
aqueduct, and the men jump with them: no canisters.

| Man | Jumps with | Can carry, 1 AP slower |
|---|---|---|
| Dutch, Fitch (sappers) | 2 | — |
| Nunn (gunner, Ox) | 1 | — |
| Vance, Barrow (scouts), Speers (gunner) | 0 | 1 |

Five in the stick. Normal's hall takes three, so two are spare: the telephone, or a
sapper lost. Hard's takes four, so one is spare. Losing a sapper drops two charges on
his hex, in the snow, for a scout to fetch.

### The ground

New terrain, as data in `terrain.json` and drawn in `theme.js`. Only this map has these
types, so no code asks which mission is on. Its wash is the aqueduct's **cold blue**,
thin over the paper, the snow the paper itself left nearly bare so it reads white
beside everything else: no new colour (ART-DIRECTION.md, Colour).

| Terrain | Move cost | Cover | Blocks sight | Prints | Notes |
|---|---|---|---|---|---|
| Snowfield | 1 | none | no | yes | the open plateau: fast, seen, and it keeps your trail |
| Drift | 2 | light | no | yes | deep snow: slow, and still leaves a trail |
| Pine wood | 2 | heavy | yes | no | the safe artery on the plateau; bad landing |
| Rock | 2 | light | yes | no | outcrops; a crest hides what lies beyond |
| Gorge side | above any pool | heavy | yes | no | a full turn down or up (Its two rules); bad landing |
| Ice | 1 | heavy | no | no | the frozen river at the gorge's bottom |
| Railway | 1 | none | no | no | the line along the shelf to the plant: swept, fast, open |
| Plant wall | impassable | — | yes | — | the plant's buildings |
| Hall | 1 | heavy | yes | no | inside the cell hall; its charge points are here |
| Cable duct | 2 | heavy | yes | no | the quiet way into the hall, one hex |
| Cells | impassable | — | yes | — | the electrolysis cells; the objective stands on them |
| Barracks | 1 | heavy | yes | no | the garrison's huts on the shelf |

Kept from France: **Track** (the road, takes no prints), **Bridge** (the suspension
bridge's deck), **Farmhouse** (a hut on the plateau), and **Crag** from the aqueduct.
There is no canal and no sea, so Swim and the boat are not offered. There is a
telephone line, so Cut the line is.

### The map

`data/map-gunnerside.json`, drawn at M58 to this outline; the balance milestone moves
what it must. As drawn (M58b): the plateau in rows 0 to 4 or 5, the gorge between rows
4 and 7 as it wanders, the shelf below it; the bridge, two hexes, runs straight
south-west where the gorge narrows east of the middle, a sentry beside each end.

- **The plateau** fills the north third: snowfield and drift, pine woods in clumps, rock
  outcrops, a hut, and pine lanes running down to the rim so a careful man has a way
  across the snow that leaves no prints. All three drop runs are over it, and **nobody
  lands south of the gorge**.
- **The gorge** runs east–west across the middle of the board and wanders as it goes, a
  row up or down along its length so it reads as a gorge, not a ditch (M58b, the
  operator's): two gorge sides where it narrows, a side, the ice and a side in its wider
  middle stretch, crag at each end so it cannot be walked round. Its name is lettered
  along it in capitals, MØRKGJELET GORGE. A **suspension bridge**
  crosses it a little east of the middle, carrying the road; the **bridge post** is two
  sentries, one at each end.
- **The shelf** in the south third, where the plant stands, east of the middle with
  open ground and pines to the west of it (M58b, the operator's: the first draft's walls
  and pipes jammed the men up): the **cell hall**, a thin shell, one row of wall on its
  north side and the cells along its back on the board's south edge, its charge points on
  the hall floor beside them; the **cable duct** into its west end, at the railway's
  end; the **main door** at its east end, facing the gate; the **barracks** east of the
  plant. Every wall has a hard ink edge, so it reads as a wall. The **pipes** are not
  ground: they come down the hillside behind the plant off the board, a picture for M60.
- **The railway** runs along the shelf from the west edge to the plant: the quick way
  from the gorge to the duct, open but leaving no prints. Where the gorge side meets it
  on the south is the climb's top, as it was.
- **The road** comes up from the town off the south-east edge, zigzags to the gate,
  crosses the bridge and runs north over the plateau. Reinforcements come up it.
- **The telephone line** runs on poles beside the road, from the plant down towards
  the town, with its **junction box** on the shelf beside the road, under the gorge:
  south of it, so it is cut on the way in or not at all.
- **The way out** is a **ski trail** off the north-east corner of the plateau, three
  hexes down the east edge from the corner (M58: along the top edge its picture fell
  off the board), as far from the drop runs as the plateau allows: drawn as two lines
  of ski tracks running off the board into the dark with a cairn beside them
  (`exfilArt`). Open all night: no timetable.
- **Three drop runs**, all over the plateau, flown in from three sides so their names
  sit on three edges of the board (M58b, the operator's: in line along the top they
  overlapped), told apart as France's are: **West · QUIET** in from the west edge over
  the pine woods (under the trees, near where the gorge narrows; a man who lands in the
  woods loses his first turn); **North · STEADY** down from the top over the plateau's
  open middle (the most reliable landing, and prints wherever the men go); **East ·
  FAST** in from the east edge toward the road and the bridge (nearest the crossing and
  the way out, and nearest the bridge post and the plateau patrol). PICK A DROP
  DIRECTION sits on the empty shelf in the west (data/layout.json).
- Place names are placeholders: the plant **Vassdal Works**, the gorge **Mørkgjelet**,
  the plateau **Isvidda**, the town below **Elvebyen**.

### The garrison

**Seven enemies** and the reserve, as few as the aqueduct's, set to watch the crossings
and the snow rather than to fight.

- **Sentries**: the **bridge post**, two of them, one at each end, each sweeping
  (DETECTION.md: one way on odd turns, the other on even) between the deck and the gorge
  below it, so the climb beside the bridge can be timed; the **gate guard**, facing the
  road and the main door.
- **Patrols**: the **plateau patrol**, across the snow between the East run's ground and
  the road, the one that reads prints; the **rim patrol**, along the north rim of the
  gorge west of the bridge, touching the West run's ground at one end; the **plant
  patrol**, round the cell hall and along the railway to the duct; the **road patrol**,
  on the road between the junction box, the gate and the town.
- **The patrols set out on turn 2** (`patrols.setOutTurn`), as on the airfield and the
  aqueduct: turn 1 is for gathering and getting off the open snow.
- **The reserve** turns out of the barracks at Alarmed, crosses the bridge and stands
  guard on the ski trail. It cannot be killed, as in France.
- **Reinforcements**: the hall going up calls **one squad** (Hard two) up the road from
  the town, across the bridge, to posts on the way out. **None comes once the telephone
  line is cut**, and none for a body found either: the exchange's payoff in France.
- **A body found calls a squad**, as on the aqueduct (The shot, above), three at most.

### The objectives

Numbers are Normal's, per kind in the mission's rules patch.

| Objective | Needs | Blast / kills within | Alert | Score | Pays |
|---|---|---|---|---|---|
| **Cell hall** (PRIMARY) | 3 charges, of 4 points | 1 / 1 | +3 | 10 | the win; calls up 1 squad |
| **Telephone line** | 1 charge, or cut the line | 1 / 1 | +3 (cut +1) | 4 | no reserve, no reinforcements, no squads for bodies |

**The win**: `destroyPrimary`, and `minimumOut` men out by the ski trail by dawn. Easy:
two charges, no squad. Hard: four charges, two squads.

There is only one bonus target, fewer than any other mission, because the bonus here is
the quiet night. The telephone is the quiet bonus: a scout cuts it in silence, and the
night after the bang is safer for it.

**Time pencils**: as on the aqueduct, 2 to 6 turns, the default offered first, the tin
offering the one that goes off with the charges already set. The charge points are
inside the hall and the hall's kill radius is 1, so a man must be out of the duct before
his charge goes: a short timer is the hall in the night's quiet and a run with the
garrison waking; a long one is three charges left ticking where the plant patrol walks.
(No rule finds a set charge; the patrol walking past is a man seen if anyone is still
inside.)

**The score**: France's, with no train and no salvo, the clean run NOT A SHOT FIRED at 5.
The rating's bands are set at balance; their names say what this mission rewards, lowest
first (placeholders): HEARD IN ELVEBYEN, A QUIET JOB, LIKE GHOSTS, NOT A SHOT FIRED.

### The alert on this ground

Budgeted before the map is drawn, as for the aqueduct. The states begin at 0, 2, 4 and 7
points (DETECTION.md).

**A tidy win on Normal ends at Suspicious or Alert, never Alarmed; a shot is the
quickest way to Alarmed there is.**

| What happens | Points | Running |
|---|---|---|
| The cell hall, three charges in one bang | +3 | 3, Suspicious |
| Up to three slips: prints or a parachute found, a man seen, a stone, a body found | +1 each | 4 to 6, Alert |
| A fourth slip | +1 | 7, Alarmed |
| The hall in two bangs | +3 more | Alarmed with one slip |
| **One shot** | +4 | Alarmed with the bang alone |
| The telephone cut | +1 | a slip, but nothing comes up the road |

**The measure** (balance milestone): the bot's `tidy` style, taught to keep off open snow
where cover costs no more than a turn, never fires. **Its Normal wins never reach
Alarmed in at least seven games in ten on every run.** And the new check this mission
asks for, that stealth pays: the same bot run with `FIRE=always` must win **clearly
fewer** games than without it on every run, and the `hunter` style (knives and guns)
below `careful`, as SPEC.md §10 asks everywhere.

### Telling the player: stealth tonight

A player who likes action will try to shoot through this mission and lose it. Every
place the game speaks says so before it happens, never as a scolding: as the briefing
of a job where the quiet way is the professional way.

- **The contents page**: "A heavy water plant across a frozen gorge. Get in, blow the
  cells and get out without a shot fired." Its line is the only one that says how to
  play, because this mission is the only one that asks it.
- **The tagline**: SIX MEN · ONE STATION · NOT A SHOT FIRED.
- **The orders** (ART-CARDS.md: five lines and one for the rule only this mission has):
  where they drop (the Isvidda, above the gorge); the job, in bold: the cell hall, then
  the ski trail; the clock; **the mission's own line, in bold: "Not a shot. Gunfire
  echoes down the gorge and the whole garrison hears it. The knife and the dark are
  your weapons."**; the Bonus line with NOT A SHOT FIRED +5 first. The briefing's
  opening line: "Tonight six men are to drop onto a Norwegian plateau in the snow."
- **The turn card on turn 1** says it again in a line ("Stay off the open snow where you
  can: the patrols read tracks."), and on the first turn a gunner is selected beside a
  target he could fire on, the hint names the cost ("A shot is heard across the board:
  alert +4"). The hints already put a charge about to blow first; these come after it.
- **The Suppress and Fire back buttons and rollovers** give the cost in red on this map
  ("+4 alert · heard everywhere"), and the enemy's hover FIRE row says the same.
- **The first shot asks first** (The shot, above).
- **The men's lines** (a `dialogue` patch, three to a moment, as M54): the gunners on
  holding fire (Speers onLand: "Sten stays slung tonight, lads."; Nunn: "Not a shot? Then
  what am I carrying this for?"), the knife's onKill lines quiet and grim, the scouts on
  the snow (Vance onSpotted: "Should've kept to the trees."), Barrow on the tracks
  ("We're leaving a trail a blind man could follow."), Fitch on the cold ("Snow? Nobody
  said snow!" is his already, F128b). Placeholder for the operator, carried onto the
  wording sheet at M60.
- **The garrison's cries** are German (ACHTUNG!, HALT!, MEIN GOTT!), with one of its own
  for prints found: SPUREN! (tracks!).
- **The back page** names the clean run as NOT A SHOT FIRED when it is earned, and, when
  it is not, the line under the score says who fired first and on what turn ("Speers
  fired on turn 9: the whole valley heard it"), so the lesson is learned from the game
  just played.
- **The rating's band names** (The objectives, above).
- **The comic panels** (below), the first shot among them.

### Comic panels

The game has three moments with a painting (ART-PLAY.md, Comic panels): the Dakota, the
landing and mission accomplished, each a slot in the mission's `comicPanels` that shows
nothing until its painting is in. This mission is where they grow, as an element to
develop: it has the most story in it of the four, and a stealth mission's moments are
quiet ones that a painting tells better than a log line.

**Built as the slots there are (no code):**
- **The aircraft** (the Dakota slot, its own painting tried first): the men in the back of
  a Halifax over the snow, as Gunnerside flew, the jump hole open, cold. "OVER NORWAY.
  THE PLATEAU IS THIRTY MILES OF NOTHING, AND THEY'RE DROPPING US IN THE MIDDLE OF IT."
- **The landing**: canopies on the snow under a low moon, the gorge a black line far
  off. "THE ISVIDDA, FEBRUARY 1943. NOT A SOUL FOR MILES — AND EVERY STEP LEAVES A MARK."
- **Mission accomplished**: the contents panel, as for every mission. "THE CELLS WERE
  WRECKED, AND THE GARRISON NEVER KNEW WHERE THEY'D GONE."

**New moments, to develop** (an engine addition: a short fixed list of panel triggers
in `missions.json`, in the spirit of the win conditions, never a code branch for one
mission; each shows once a game, behaves as the panels do now, and shows nothing
until its painting is in):
- **The climb** (`firstEnter` a terrain: Gorge side): a man on a rope going down into the
  dark, the bridge lit above him. "DOWN INTO THE GORGE. ONE SLIP AND THE BRIDGE GUARDS
  WOULD HEAR HIM FALL."
- **Inside** (`firstEnter`: Cable duct): a man crawling through the duct among the cables,
  torch in his teeth. "THROUGH THE CABLE DUCT, INTO THE HEART OF THE PLANT."
- **The first shot** (`firstShot`): a gunner firing, the echo drawn as rings down the
  gorge, lights coming on across the plant. "THE SHOT RANG DOWN THE GORGE. EVERY GERMAN
  ON THE SHELF WAS AWAKE NOW." The one panel that is a warning: it is shown at the first
  shot so the cost is felt, not just read.
- **The bang** (`objectiveDestroyed`: the primary): the hall's windows blown out, the
  cells spilling. Could serve every mission later, each with its own painting.
- **Failed** (`outcome`: failed or withdrawn), a panel beside the back page as success
  has: parked in ROADMAP.md for every mission, worth doing first here, where it can
  show the snow closing over the tracks.

The art for each goes in ART-PROMPTS.md at M60 in the house style, with Gunnerside's
Halifax variant first, as it uses a slot that is already built.

### Its pictures

All drawn in code first (M58), painted art asked for in ART-PROMPTS.md at M60.

- **Footprints** (the operator's call), sprite `prints` in the registry, so a painted one
  can replace it with no code change:
  - **Two lines of boot prints** across the hex in ink, small, a little uneven, like a
    man's stride in snow, set on the board under the counters, the targets' words and
    the parachutes.
  - **Turned the way he walked**: each print hex is drawn along the line from the hex he
    came from to the hex he went to next, toes forward; on the last hex of his move,
    along the way he came in. (Six facings for straight walks, and the bend between two
    when he turned in the hex.) It is the trail, readable at a glance as a direction.
  - **Fading over the turns after**: full ink the turn they are laid, about two thirds
    the turn after, a third the turn after that, then gone (with `turns` 3; the steps
    follow whatever `turns` is). The fade is the clock: a player can see which prints
    will be there for the next patrol.
  - **Found prints**: when prints are found, the trail flashes red once and goes, and
    the finder wears the "!" and SPUREN! as for any find.
  - A hovered print is outlined dashed, as the parachutes are.
- **The ground**: the snowfield nearly bare paper with a faint cold-blue shadow at its
  edges; drift in soft bands; pine woods as dark firs in clumps, snow on their tops;
  rock grey with blue shadow; the gorge's sides as cliff hatching in ink, darkening
  down to the ice, a pale line with cracks.
- **The plant**: on the board a plan (M58b: dark walls with hard edges, the floor, the
  cells), as men stand inside it; for the painted panels the cell hall a long block with a pitched roof and tall windows, the pipes behind it as thick lines down the
  slope, the barracks as huts, the railway with its sleepers, the suspension bridge with
  its cables. Drawn from the operator's references, as the aqueduct was at M50.
- **The ski trail** at the way out, and its cairn.
- **The garrison**: German, France's chips; winter coats are an optional painting.
- **The six** in winter kit: ART-PROMPTS.md 21, already asked for the aqueduct
  (`portraits`: `assets/portraits/winter`).
- **Its contents panel and title card**, painted, as each mission's are.

### Its sounds

Made in code until recordings are found (ART-PROMPTS.md at M60).
- **The shot's echo**: a gunshot followed by its echo rolling away down the gorge, longer
  than the other maps' bursts. It is the sound of the mistake.
- **The decoy flare**: a pop, a rising hiss, a long fizz far off.
- **Wind** over the plateau under the drop's drone.
- **The back page**: France's fanfare for success; for withdrawn or failed, the wind
  alone, and a dog far off.

### Balance

Targets are SPEC.md §10's, and this file's alert measure and stealth check above. The
reference run is to be `MISSION=gunnerside KNIFE=1 SENSE=1 PICK=1 CLEAR=1 node
tools/balance-bot.mjs 300 naive`, with the bot taught at M58 to see prints (a careful
man keeps off open snow where it costs him no more than a turn) and to climb the gorge
as well as cross the bridge. Things to measure, in order:
1. Dawn: 20 turns, or fewer once the bot shows the slack.
2. The gorge's width: two turns where it narrows, three in the middle (M58b); whether
   the climb is worth it against the bridge.
3. Prints: `turns` 3, or 2 if the plateau is a minefield of finds.
4. The levels, the runs and the rating's bands.

### The order it is built in

| # | What |
|---|---|
| **M56** | This file, and the operator's calls |
| **M57** | The engine, off in every other mission and their bot output unchanged byte for byte: tracks (laying, ageing, finding, undo, the readout, the footprint sprite turned and fading); `scoring.cleanNoShot`; `confirmShot` |
| **M58** | The map as a draft (`?mission=gunnerside`, stamped NEXT YEAR'S ANNUAL on the contents page): the terrain drawn in code, the garrison, the objectives, the ski trail; the bot taught prints and the climb |
| **M59** | Balance: the map and beats to the alert budget, dawn, the gorge, the prints, the levels, the stealth check, the rating's bands |
| **M60** | Words, sounds and the art hand-off: the stealth wording everywhere above, the men's lines, the decoy flare, the three panels in today's slots, the art asked for |
| **M61** | The new panel moments (the panel triggers), if the operator wants them then |
