# BURN BY DAWN — Art direction: play (SPEC.md §11)

Part of SPEC.md §11, with `ART-DIRECTION.md` (the look: the spread, colour and type, the
board, counters and markers; read it first) and `ART-CARDS.md` (the cards). As
authoritative as SPEC.md; it says how things are **now** and keeps no history
(DECISIONS.md has it).

---

### Before the drop

- **Targets are ringed** in red marker pen, the primary twice, each with a hand-lettered
  note beside it (the primary's: PRIMARY TARGET! / BLOW IT WITH TWO CHARGES!, the count
  from its kind; the exchange's says a scout can cut its lines), and the exfil in green.
  Each ring takes in the objective's name and is drawn **over the garrison's chips**
  (the operator's, M42b: a chip on a ringed target cut the pen mark in two), kept to
  the board, with the notes on top. Picking a run clears them. Where the win is
  any few of many (the airfield), each target's ring is tight and takes in its charge
  points too, so target and point read as one, as does a target whose map says
  `ringCharges` (the cell hall, whose points stand outside its cells); where every target takes one charge, only
  the win's note says so, and a bonus target's note names it (BOWSER: BONUS +2). A note may be moved into clear ground (`notes` in
  `data/layout.json`, by objective id or `exfil`; art only). A ring may carry
  one thing in bigger letters under its note: the exfil's, where there is a boat (NO WAY
  OUT BEFORE THE BOAT: TURN 15).
- **Ghost Dakotas**: until a run is picked, a faint grey Dakota flies each drop line again
  and again, staggered, so the lines read as flight paths. Silent.
- Each run's tab sits on its line (`labelAlong`, `labelNudge` in `map.json`) with its word,
  QUIET, STEADY or FAST, as on its button and rollover.
- **Where to start**: until a run is picked, **PICK A DROP DIRECTION** is lettered big in
  the player's pen, **in the blue of our kit** (the canisters' blue: in red it read as one
  with the targets' rings), or in the mission's own `dropCueColour` (`missions.json`: army
  green on the aqueduct and in Norway, where blue on the frost was hard to read), with a
  pen ring of the same colour round each run's tab, drawn on in turn before the targets' red rings
  are (a second later), among the runs' tabs (or centred on the mission's `dropCue` hex in
  `data/layout.json`: every mission has one, the airfield's on the strip), still, on the map at 1280x800. Every
  pen note is kept whole on the map: CLICK A MAN TO START is moved in from an edge the
  men landed beside. Once one is
  picked it reads **HIT SPACE TO JUMP**, "or click the run again", in the same blue with
  the one ring round the run chosen, the JUMP! button turns
  danger red and throbs, and the run's rollover ends PRESS SPACE TO JUMP, OR CLICK AGAIN.
  Jumping needs **Space** or a second click on the same run. Once the stick is down, every
  man who can act wears a gently throbbing red pen ring, with CLICK A MAN TO START in the
  middle of the men, until the player first selects a man; never again that game.
  **Then, with the play tips on, HOVER A HEX. CLICK TO GO.** is lettered under the
  selected man, whoever is selected, and **a ghost of his counter**, printed faint, steps
  along a short path he could take unseen, its AP dots emptying, rests and starts again,
  until the first move of the game is made; never again that game. The ghost stands
  aside while a move is hovered.
  **With them, each supply canister is ringed in leader blue and lettered CHARGE
  CANISTER** in the same blue, on whichever side of it is clearest of counters, the
  other rings and names, the start note and the board's edge. The ring is round the
  canister's picture and its dots, a little down and left of the hex's middle, clear of
  the dots. **A canister is not on the ground until it lands**: its picture, its dots,
  its ring and its name pop on together as its canopy comes down in the drop, a little
  big and then its size, with its thump. If the drop is skipped, those still in the air
  pop on one by one, about half a second apart. CLICK A MAN TO START is lettered over
  the canisters' rings and names, never under them.
- **The drop is shown.** A Dakota flies the chosen line, in from off the board and on
  until it has left it, whatever the line's own ends, and each man's canopy opens where
  he jumps, drifts downwind to where the rules have already put him, lands and collapses
  into his parachute marker. **Each supply canister comes down the same way**, on a
  canopy of its own with its gores in the blue of its ring, opening a moment behind the
  man it leaves with. Display only; a click or Space skips it.

### The hover readout and the turn log

- **The danger wash.** A selected man's move range is tinted hex by hex: cold blue
  where he can go unseen, **danger red** where he would be spotted going there (a
  little stronger than the blue, and well over the faint red of the garrison's view),
  and for a man in contact **army green** where he would break it. Flat tint, no
  halftone, under the range's one outline. Where he could swim this turn, the far bank
  he would come out on is outlined beyond it in the same blue, dotted (M49d).
- **Who sees him.** On a hovered move, a thin line runs from the enemy that sees him
  most to the hex the pen note is on: solid red if he is spotted there, dotted ink if
  only seen. That hex's pips fill one at a time, about an eighth of a second each. The
  hex where the move ends wears a small **shield** at its top left for its cover: empty
  for none, half green for light, all green for heavy.
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
  = 2 of 3 dots", leaving out any term that is nought), TRACKS (where the
  move would leave prints: who finds them next turn, in red, or that nobody passes
  them), HIDE, HERE, HEARD, GROUND, ORDERS. A print in the snow is named in the headline
  (VANCE'S TRACKS) with HERE, FILLS and NEXT, and each path hex that would take prints
  wears a small boot mark.
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
  its counter flashing. A kill is the same burst, a little louder (M49d).
- **The pen's coaching is the play tips** (SPEC.md §4): on unless switched off.
  Where the charge goes, the ghost, BREAK CONTACT!, GET CLEAR!, GET OUT! and TRACKS! (the
  game's first trail in the snow, "the patrols will follow them" under it) are tips;
  the marks, throbs and the pip below are not.
- **Where the charge goes** (a tip): while the selected man carries a charge within one
  hex of a target that still wants one (of the target or any of its charge points), each
  of its empty charge points wears a throbbing red pen ring. Only the target nearest him
  is lettered, once: STAND ON A RING TO SET A CHARGE (STAND HERE TO SET THE CHARGE where
  there is one point). Standing on a point, only his own is ringed, and it reads PRESS C TO SET THE
  CHARGE if he can set it now. Not while he aims an action or the tin of timers is open.
- **The charges are set**: when a target is given the last charge it needs, the player's
  pen letters **CHARGES ARE SET. / GET CLEAR!** over it (CHARGE IS SET where it needs one),
  red with a paper outline, a little askew, over the counters and any speech bubble, kept
  whole on the board. The next click or key anywhere puts it away, and after four
  seconds it goes of itself; Space or Esc pressed at it does only that, so clearing it
  never ends the turn. A target that wants more than one says nothing until the last is
  set.
- **A blast that goes off this turn throbs**: its red ground swells and fades, about
  once a second. With the tips on, each man standing in it has **GET CLEAR!** lettered
  under him and a short pen arrow toward the nearest clear hex he can still reach.
- **What he could strike** (SPEC.md §4): the pen's red disc on the enemy chip's top left
  corner, gently throbbing, a paper knife, crosshair, or crosshair struck through in it.
- **Time to go**: once the job is done and the way out is open, the exfil's ground
  throbs army green, slowly, and with the tips on **GET OUT!** is lettered over it in
  the same green. Through the night's last three turns those cells of the dawn strip
  are printed over in red, and a man who cannot reach the exfil in time wears a small
  red clock over his counter; its rollover says so.
- **The alert's pip**: whatever raised the alert sends a red pip from its hex across
  the spread to the dial, one for each place it rose from, a moment apart, and the dial
  jolts as each lands.
- **The hint points**: while a turn card is up, what its hint is about (the parachutes,
  the man in contact, the charge about to blow, the exfil) wears the pen's throbbing
  ring on the board, six at most.
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
  pictures are in (never more than 8 s), while the table shows BURN BY DAWN (108 px, its
  hard shadow cold blue, M55b) and a fuse burning down. **The title painting** (M55), the stick in silhouette, fades up behind
  them as soon as it is in, cropped to the window under a dark shade; without it the
  table is plain dark. Ready, it asks for a key or a click — which also lets the browser play
  sound — and the spread fades up with the orders open.

**Comic panels** (M52, the operator's: tried behind a switch, then kept for everyone). At
three story moments a painting pops up over the board as a panel in a graphic novel would:
tipped 4° (the operator's: 2° read as a panel not quite level), in a thick ink frame on a paper
gutter with a hard shadow, popping in from smaller and more tipped (220 ms, from 11°), its caption
in comic lettering in a paper box over the top-left corner (the mission's
`comicPanels`, placeholder words for the operator), CLICK OR ANY KEY under it. **The
Dakota** (M55), the men in the back of the aircraft, when START GAME puts the orders
away, before a run is picked, in every mission but the course: the mission's own
painting if there is one, else the shared one (`art` may be a list, tried in order).
**The landing**, when the drop show ends, over the turn card; **mission accomplished**, on a
win, once the bang has been seen, beside the back page: the mission's contents panel.
Each shows once a game; a click or any key puts it away and does nothing else. A
painting not supplied shows nothing. No sound of its own.

### Sound

The sounds of the table, not the battlefield (ART-ASSETS.md §9), every one a supplied
recording in `assets/audio/` (the made-in-code version is the fallback if a file is
missing): a pencil for every action, a counter snapped down when a move is undone (a
move itself is silent), a card's rustle when a card or the back page opens, a dog a long
way off when the alert rises, three far-off crumps for the RAF diversion, and a gunfire
burst for suppressing and, a little louder, for a kill (M49d, the operator's: the one
shot was not satisfying). The Dakota drones over the drop and the RAF
flyover, cut short if the drop is skipped. The one exception to the table: a turn with a
bang plays a real explosion, close, loud, low and slow. The back page plays a fanfare (the operator's
recording, its first half, since M49b: the bells read as a funeral) for a mission accomplished, and tolls a single
bell with a siren far off for one withdrawn or failed. A mission names its own back-page
and diversion sounds: the airfield's jeep raid is an engine going by and bursts of fire,
its success a bugle call, the rest its own air-raid
siren close by. France's goods train is heard as it comes onto the board, passing
some way off (the operator's recording since M48h). **The aqueduct's three** are the
operator's recordings since M48h: its canisters
thump down in the drop, one thump each as its canopy lands and its blue ring pops on; the boat's oars are heard far off
the turn it is sighted or answers the signal; and the turn it lands, its last strokes
with a wave breaking on the shingle under them. Its back page is France's fanfare. **The umpire's whistle** in a
lesson (§15) is one short blast of a referee's whistle, and **the knife** is a short
blow (both the operator's recordings, M48h; the knife was a pencil before).

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
