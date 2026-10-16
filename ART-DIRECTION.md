# BURN BY DAWN — Art direction (SPEC.md §11)

This is §11 of the specification, kept in files of its own. It is as authoritative as
SPEC.md: how the game looks, reads, moves and sounds. "SPEC.md §11" in the code, the
tests and the other documents means these three files:

- **`ART-DIRECTION.md`** (this file): the look. The spread, colour, print and type, the
  board, counters and markers. Read it before touching anything the player sees.
- **`ART-CARDS.md`**: the cards. The contents page, the orders, how to play, the counter
  key, a course's orders and its lesson card, turn cards, the RAF diversion's card, the
  back page.
- **`ART-PLAY.md`**: play. Before the drop, the hover readout and the turn log, motion
  and feedback, and sound.

The rules they draw are in SPEC.md; the asset files and their sizes are in ART-ASSETS.md.
Section numbers in them (§6, §10) are SPEC.md's. Like SPEC.md they say how things are
**now** and keep no history (DECISIONS.md has it).

---

**The reference is a board game printed in an 80s British comic annual.** Cheap paper,
limited spot colours, slight misregistration, die-cut counters. Clarity beats texture: the
board must read at a glance.


### The spread

- The whole game is a **double-page spread**. Board on the left page. The right page
  carries, from the top: a fixed strip (the turn counter; End turn, which is the JUMP!
  button before the drop, and Undo; the selected man's actions: a full button for each
  he can take now, the rest as their keys alone, small and grey, in what is left of the
  last row, its rollover headed with its name and (UNAVAILABLE); a button that has just
  become usable pops once), the alert dial and the
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
- The outer margin: at its top **the menu's gear** (`ui-gear`, 24 px, ink, with MENU
  under it; red and turned a tooth under the mouse or while open); then BURN BY DAWN in
  the title stencil running up the page; "CUT OUT AND PLAY" with scissors and a dashed
  cut line in the middle; at the foot the build ("build M29", from `data/version.json`),
  the level and seed.
- **The menu** (the operator's, M48: the margin had gathered a row of loose switches)
  is a small card beside the gear, over the map and over any other card, the contents
  page among them: SOUND [M], MUSIC and PLAY TIPS, each a button with ON or OFF at its
  right (ON in green); then RESTART (a first click arms it, in red, CLICK AGAIN TO
  RESTART; a second starts a new game on a fresh seed at the same level, without a
  reload) and ← BACK TO CONTENTS (at once before the jump; armed the same way once the
  stick has jumped); then CLOSE. Esc, CLOSE, the gear or a click anywhere else shuts
  it. On the contents page RESTART and BACK TO CONTENTS are greyed.

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
  garrison's dark chits). Nothing else. **The aqueduct's winter ground** (§14) takes no
  new colour: its hillside, crags, ravine and olive groves are the paper under a wash
  of the cold blue (18%), the ravine and the sea stronger, the plough, the terraces and
  the beach left warm, so the slopes read cold beside them.
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
  railway runs east–west across the board and over the rail bridge, with a level
  crossing where a road meets it: art only, no rule. Where it steps down a row
  (France's, past the fuel dump, clear of its charge points) the step is one gentle
  slope spread over five hexes, eased in and out, never rising past the rows it joins
  (`RAIL.bend` in `theme.js`); there it runs through its hexes off their centres, and
  the train's cars stand on it. So is the village **church** with its spire,
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
  reads RESERVES). A mission may have its own garrison's painted chips (`enemyChips`,
  a folder tried before the usual one, type by type): the aqueduct's are Italian. Or a
  garrison drawn in a kit of its own (`enemyKit`) until it is painted: **the practice
  ground's umpires**, head and shoulders in a peaked service cap with a white armband
  on the left arm and no rifle, one for a sentry, two for a patrol. A suppressed enemy is printed faint with a red SUPPRESSED band. The turn
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
  game, on the ground: under the counters and the targets' words (M49d).
- A man killed floats straight up about a hex and fades over his body before the turn's
  card is laid.
- **An enemy that raises the alarm says so** (a mission's `words.cries`): a small
  paper bubble over its chip beside the "!", lettered in red, ACHTUNG! or HALT! for a
  man seen, MEIN GOTT! for something found (Italian on the aqueduct; an umpire's are
  English: YOU THERE!, WHAT'S THIS?). It stays with the
  "!" through the player's turn.
- **Where a charge went off** a black scorch is left on its hex for the rest of the
  night, under any wreck.
- **A target with every charge it needs set** says ALL CHARGES SET · GET CLEAR in red
  under its name until it goes up; the pen note of the same words is only for the
  moment it is set.
- **A shut exfil** (a boat not yet in, §10) has its
  outline dashed in danger red (no wash of the sea since M49d: men may wait on it) and its label in red with the turn (BOAT · TURN 15);
  open, it is green and reads EXFIL. **The boat** is drawn bow toward the beach, a
  little faint out at sea, and is rowed in from where it stood at each turn's start.
- **A man about to be fired on** (in contact, and a free enemy would spot him again as
  things stand) wears the aiming crosshair over his counter, big and gently throbbing,
  until he would not be. Selected, with no move hovered, **BREAK CONTACT!** is lettered
  under him in the pen.
- Hovering any marker explains it: the "!", the spotted marker, the wound, the hidden
  mark, the orders chevron.

**Architecture requirement:** all art is referenced by sprite id through `theme.js`,
rendered as SVG `<symbol>` / `<use>`. No inline path data in game logic. A supplied file
in `assets/` (ART-ASSETS.md) replaces its drawn sprite with no code change; what is not
supplied is drawn in code.
