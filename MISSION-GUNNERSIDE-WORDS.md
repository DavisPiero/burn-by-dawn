# BURN BY DAWN — Mission 4, the heavy water plant: words, sounds and pictures (SPEC.md §16)

This is part of §16 of the specification, split from `MISSION-GUNNERSIDE.md` at M60 so
that file stays short enough to read whole. It is as authoritative as SPEC.md. It says
how the mission speaks to the player, looks and sounds; the rules it speaks of are in
`MISSION-GUNNERSIDE.md`, whose section names ("The shot", "The objectives") it cites.
Section numbers in it (§4, §9, §10) are SPEC.md's. Every line of the player's words is
also on the wording sheet (`docs/WORDING.md`), for the operator to reword.

---

### Telling the player: stealth tonight

A player who likes action will try to shoot through this mission and lose it. Every
place the game speaks says so before it happens, never as a scolding: as the briefing
of a job where the quiet way is the professional way. All of it is built (M60) and is
placeholder copy on the wording sheet. Each new piece is a mission word or a rule the
other missions do not have, so no code asks which mission is on, and the other three
read as they did.

- **The contents page**: "A heavy water plant across a frozen gorge. Get in, blow the
  cells and get out without a shot fired." Its line is the only one that says how to
  play, because this mission is the only one that asks it.
- **The tagline**: SIX MEN · ONE STATION · NOT A SHOT FIRED.
- **The orders** (ART-CARDS.md: five lines and one for the rule only this mission has):
  where they drop (the Isvidda, above the gorge); the job, in bold: the cell hall, then
  the ski trail; the clock; **the mission's own line, in bold: "Not a shot. Gunfire
  echoes down the gorge and the whole garrison hears it. The knife and the dark are
  your weapons."** (`words.ordersLine`, set after the clock); the Bonus line with NOT A
  SHOT FIRED +5 first, in capitals (first wherever `scoring.cleanNoShot` is on). The
  briefing's opening line: "Tonight six men are to drop onto a Norwegian plateau in the
  snow." How to play's TONIGHT page ends with the clean run's line (`words.cleanOrders`).
- **The turn card on turn 1** says it again in a line under the hint
  (`words.firstTurn`: "Stay off the open snow where you can: the patrols read tracks."),
  so the parachutes' hint keeps its place. Until the first shot, a gunner who could
  fire on an enemy makes the hint name the cost ("SPEERS could fire on the bridge post
  (north), but a shot is heard across the board: alert +5. The knife is quieter."),
  next after a charge about to blow, wherever `confirmShot` is on.
- **The Suppress and Fire back button** gives the cost in red on this map ("2 AP +6"
  under its name; Speers's +5), its rollover ends in red "+6 ALERT · HEARD EVERYWHERE,
  and the bonus for not a shot fired is lost", and the enemy's hover row for it says
  "+6 alert · heard everywhere" in red. "Everywhere" is worked out: gunfire heard as
  far as the board is wide. All of it only where `confirmShot` is on.
- **The first shot asks first** (The shot, above).
- **The men's lines** (a `dialogue` patch, three to a moment, as M54): every man's
  onLand on the snow and the cold; the gunners on holding fire (Speers: "Bren stays
  slung tonight, lads.", his gun being a Bren; Nunn: "Not a shot? Then what am I
  carrying this heavy bloody gun for?"); quiet, grim onKill lines for the four who knife; Vance's
  onSpotted ("Should've kept to the trees."); Barrow's tracks line ("We're leaving a
  trail a blind man could follow.") among his onLand, as there is no moment for laying
  prints; his onWounded sends them on to the plant. Speers has no line of his own on
  Cool Head: his particulars already give it in numbers (Gunfire alert 6 → 5).
- **The flare pistol**: the leader's particulars and rollover say he carries it and
  fires the decoy flare (`words.diversionDevice`, `diversionVerb`); its card says the
  flare went up (`diversionWorked`) and "No more flares tonight." (`diversionSpent`).
- **The garrison's cries** are German (ACHTUNG!, HALT!, MEIN GOTT!), with one of its own
  for prints found: SPUREN! (tracks!).
- **The back page** names the clean run as NOT A SHOT FIRED when it is earned, and, when
  it is not, a line under the score, in the pen's red, says who fired first and on what
  turn ("SPEERS fired on turn 9: the whole valley heard it", `words.firstShotHeard`), so
  the lesson is learned from the game just played. Only where `scoring.cleanNoShot` is.
- **The rating's band names** (The objectives, above).
- **The comic panels** (below), the first shot among them.

### Comic panels

The game has three moments with a painting (ART-PLAY.md, Comic panels): the Dakota, the
landing and mission accomplished, each a slot in the mission's `comicPanels` that shows
nothing until its painting is in. This mission is where they grow, as an element to
develop: it has the most story in it of the four, and a stealth mission's moments are
quiet ones that a painting tells better than a log line.

**Built as the slots there are (no code, M60), each showing nothing until painted
(ART-PROMPTS.md Priority 31):**
- **The aircraft** (the Dakota slot, `panel-dakota-gunnerside.jpg` tried before the shared one): the men in the back of
  a Halifax over the snow, as Gunnerside flew, the jump hole open, cold. "OVER NORWAY.
  THIRTY MILES OF BARREN SNOW, AND THEY'RE DROPPING US IN THE MIDDLE OF IT."
- **The landing**: canopies on the snow under a low moon, the gorge a black line far
  off. "MØRKGJELET GORGE, FEBRUARY 1943. NOT A SOUL FOR MILES — AND EVERY STEP LEAVES A MARK."
- **Mission accomplished**: the contents panel, as for every mission. "THE CELLS WERE
  DESTROYED, AND THE GARRISON NEVER KNEW WHAT WENT WRONG."

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

The three in today's slots are asked for in ART-PROMPTS.md Priority 31 (M60), with the
contents panel and the title card. The new moments' art waits for M61.

### Its pictures

All drawn in code (M58). The paintings, its contents panel, title card and two comic
panels, are asked for in ART-PROMPTS.md Priority 31 (M60); the board stays drawn in
code, as no painting at hex size would read better.

- **Footprints** (the operator's call), sprite `prints` in the registry, so a painted one
  can replace it with no code change:
  - **Two lines of boot prints** across the hex in ink, small, a little uneven, like a
    man's stride in snow, set on the board under the counters, the targets' words and
    the parachutes.
  - **Turned the way he walked**: each print hex is drawn along the line from the hex he
    came from to the hex he went to next, toes forward; on the last hex of his move,
    along the way he came in. (Six facings for straight walks, and the bend between two
    when he turned in the hex.) It is the trail, readable at a glance as a direction.
  - **Fading over the turns after**: full ink the turn they are laid, half the turn
    after, then gone (with `turns` 2; the steps follow whatever `turns` is). The fade is the clock: a player can see which prints
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

Made in code (M60, `src/render/sound.js`) until recordings are found (ART-PROMPTS.md
Priority 32). The mission's `cues` put its own in place of the usual ones, so no code
asks which mission is on.
- **The shot's echo** (`shotEcho`, in place of `suppress`): the burst, then the burst
  coming back three times, each later, duller and quieter, over a long low roll down
  the gorge. It is the sound of the mistake. A kill's silenced shot has no echo.
- **The decoy flare** (`diversionSound` `flare`): a pop, a rising hiss, a long fizz,
  far off.
- **Wind** over the plateau under the drop's drone (`dropWind`, in place of `drop`).
- **The back page**: France's fanfare for success; for withdrawn or failed, the wind
  alone, and a dog far off (`windDefeat`, the operator's dog recording).
- **No music of its own** yet: the title music plays before the drop, as on the
  practice ground. A track is asked for in Priority 32.
