# BURN BY DAWN — Art direction (SPEC.md §11)

This is §11 of the specification, kept in a file of its own. It is as authoritative as
SPEC.md: how the game looks, reads, moves and sounds. "SPEC.md §11" in the code, the
tests and the other documents means this file. The rules it draws are in SPEC.md; the
asset files and their sizes are in ART-ASSETS.md.

Section numbers in it (§6, §10) are SPEC.md's. Like SPEC.md it says how things are **now** and keeps no history (DECISIONS.md has it).

---

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
- The outer margin: at its top a small **← CONTENTS**, back to the
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
  airfield (a mission's `counterColour`: army green on the desert sat too close to the
  garrison's dark chits). Nothing else.
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
- **The goods train** (§7) is drawn in the art, under every counter: a car to a hex along
  the railway, turned along the line, every car with rounded corners: the engine in ink
  with its boiler bands and chimney, the wagons army green with their roof ribs, and both
  trimmed in cold blue and paper (a blue cab, blue wagon ends, a paper line down each
  side) so it shows against the green ground it comes in over. Wrecked, each car is
  thrown off the line a different way, the engine burns, and a car over the fallen bridge
  is printed fainter. **It runs between turns**: in the garrison's turn each car travels
  the hexes it made, 300 ms a hex, coming on from off the board's edge and its tail
  running off the far one, and a wrecked car keeps to the line until it gets there,
  then is thrown off it.
- **A road may be only drawn** (`roadArt` in a map, art only): a line through hexes'
  centres, on or off the board, printed as the roads are over ground that is whatever
  terrain it was. The aqueduct's: the road to the beach runs on past the exfil and off
  the bottom of the map, and the way along the top of the aqueduct runs off the map to
  the west and, a hex past its east end, away to the north-east. A line may be nudged
  (`{ through, nudge }`, in hex radii) to meet a picture's own road: those two are
  lifted to the aqueduct's channel.
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
- A map may print its targets' names only before the jump and under the mouse
  (`namesInPlay` false: the airfield), leaving the win's stars in play.
- An objective's name is printed above it; a map may move one (`nameNudge`, art only:
  the airfield's Stukas' are under them, clear of their pens' charge points) or print it
  a word to a line (`nameWrap`: BOMB STORE). A target that is not stood on and whose
  charge point sits among its neighbours' (the bowser, the bomb store) has a **lead**
  drawn to that point from under its picture, a fuel hose or a bomb trolley's rails
  (`hose` in its art), and the point itself is told apart: its hex dashed in **cold
  blue**, heavier and longer than a pen's red, its satchel in a blue ring.
- Two DESTROYED stamps side by side would print over each other: a map may give an
  objective a `stampNudge` (art only), used only while one beside it is destroyed too
  (the airfield's bowser's goes up, the Ju 52's beside it down). A `stampShift` (art
  only) moves a stamp always: the Rail Bridge's is three quarters of a hex lower, below
  the bridge, clear of the wreck and the train.
- **A supply canister counts its charges in fire-orange dots**, one for each still in
  it, as a man's counter counts his: under the middle of its hex, clear of its edge, and over any counter,
  so they show with a man standing on it. They stand in for the satchel drawn where a
  charge lies loose.
- Bodies are drawn half as big again, near the middle of their hex. A knifed enemy's
  stain spreads slowly out from under the body, dark and wet, over about three seconds,
  and dries to a faint print. Parachutes lie in one corner of their hex, the same one all
  game.
- A man killed floats straight up about a hex and fades over his body before the turn's
  card is laid.
- **An enemy that raises the alarm says so** (a mission's `words.cries`): a small
  paper bubble over its chip beside the "!", lettered in red, ACHTUNG! or HALT! for a
  man seen, MEIN GOTT! for something found (Italian on the aqueduct). It stays with the
  "!" through the player's turn.
- **Where a charge went off** a black scorch is left on its hex for the rest of the
  night, under any wreck.
- **A target with every charge it needs set** says ALL CHARGES SET · GET CLEAR in red
  under its name until it goes up; the pen note of the same words is only for the
  moment it is set.
- **A shut exfil** (a boat not yet in, §10) has the sea washed over its hexes, its
  outline dashed in danger red and its label in red with the turn (BOAT · TURN 15);
  open, it is green and reads EXFIL. **The boat** is drawn bow toward the beach, a
  little faint out at sea, and is rowed in from where it stood at each turn's start.
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
  For an enemy: DOING, ALARM, then with a man selected SUPPRESS and KILL (a gunner) or
  FIRE (anyone else: return fire), and KNIFE (he can, in blue, or why not), NEXT, SEES. A target, the exfil or a parachute is named in
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

- **A card that asks** (signal the boat, out anyway) has its button on a line of its own
  above the way back (NOT YET — any other key or click), never beside it.

- **The contents page comes first** (§10 Missions), as the annual's contents: the title
  card with PARACHUTE RAIDS BEHIND THE LINES, then each mission as a contents line, its
  title run to its page number with a dotted leader, its place in italic and a line about
  it. A mission to come is printed faint and stamped NEXT YEAR'S ANNUAL in red rubber,
  askew; a click on it does nothing. Clicking a playable one, or any key, opens its
  orders. `?mission=` skips it. The back page's CONTENTS starts a new game on it.
- **The orders are the first thing seen** after it. The orders card opens under the title card (a
  painted picture of the drop with the title lettered in; drawn in code if the file is
  missing), 820 wide, centred, standing off the page on a deep soft shadow while the
  whole spread is put in shade under a coarse halftone. The difficulty is in the black bar
  at the top, because it changes the numbers written below; under it the mission's title
  (THE AIRFIELD) heads the card, with ORDERS · BEFORE THE DROP beside it. The job is two
  lines, split at its comma so the EXFIL never stands alone; "Dawn comes…" has a line of
  its own, and so does the bonus paragraph's last
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
- **The back page** (§10) is headed by the title card, smaller, with the six, the score
  and the rating under it, and fits the right page at 1280x800 on the longest score
  sheet. PLAY AGAIN and CONTENTS sit side by side at its foot; Play again starts a new
  mission without a reload, and the orders open again.

### Before the drop

- **Targets are ringed** in red marker pen, the primary twice, each with a hand-lettered
  note beside it (the primary's: PRIMARY TARGET! / BLOW IT WITH TWO CHARGES!, the count
  from its kind; the exchange's says a scout can cut its lines), and the exfil in green.
  Each ring takes in the objective's name and is drawn **over the garrison's chips**
  (the operator's, M42b: a chip on a ringed target cut the pen mark in two), kept to
  the board, with the notes on top. Picking a run clears them. Where the win is
  any few of many (the airfield), each target's ring is tight and takes in its charge
  points too, so target and point read as one; where every target takes one charge, only
  the win's note says so, and a bonus target's note names it (BOWSER: BONUS +2). A map may move a note into clear ground (`noteNudge` on an
  objective, `exfilNoteNudge` on the map for the exfil's; art only). A ring may carry
  one thing in bigger letters under its note: the exfil's, where there is a boat (NO WAY
  OUT BEFORE THE BOAT: TURN 15).
- **Ghost Dakotas**: until a run is picked, a faint grey Dakota flies each drop line again
  and again, staggered, so the lines read as flight paths. Silent.
- Each run's tab sits on its line (`labelAlong`, `labelNudge` in `map.json`) with its word,
  QUIET, STEADY or FAST, as on its button and rollover.
- **Where to start**: until a run is picked, **PICK A DROP DIRECTION** is lettered big in
  the player's red pen among the runs' tabs (or centred on the map's `dropCueAt` hex where
  that is busy: the airfield's is on the strip), still, on the map at 1280x800. Every
  pen note is kept whole on the map: CLICK A MAN TO START is moved in from an edge the
  men landed beside. Once one is
  picked it reads **HIT SPACE TO JUMP**, "or click the run again", the JUMP! button turns
  danger red and throbs, and the run's rollover ends PRESS SPACE TO JUMP, OR CLICK AGAIN.
  Jumping needs **Space** or a second click on the same run. Once the stick is down, every
  man who can act wears a gently throbbing red pen ring, with CLICK A MAN TO START in the
  middle of the men, until the player first selects a man; never again that game.
  **With them, each supply canister is ringed in leader blue and lettered CHARGE
  CANISTER** in the same blue, still, on whichever side of it is clearest of counters,
  the other names, the start note and the board's edge.
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
- **The charges are set**: when a target is given the last charge it needs, the player's
  pen letters **CHARGES ARE SET. / GET CLEAR!** over it (CHARGE IS SET where it needs one),
  red with a paper outline, a little askew, over the counters and any speech bubble, kept
  whole on the board. The next click or key anywhere puts it away. A target that wants
  more than one says nothing until the last is set.
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
siren close by (made in code until recordings are supplied). France's goods train
whistles as it comes onto the board, one long blast and a short one, far off, with its
chuffing dying away after: made in code until a recording is supplied.

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
