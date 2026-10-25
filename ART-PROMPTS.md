# BURN BY DAWN — Art to generate next

A shopping list for an image generator: **only what is still to make**, the most wanted
first. Each entry has the file it becomes, the exact size and format, where it shows in
the game, and a prompt. Paste **the core prompt** (just below) after every prompt.

Everything already made is in `ART-PROMPTS-ARCHIVE.md` (moved there at M60, 19 Oct 2026),
with its prompt, in case a piece is ever redone. `ART-ASSETS.md` is the full manifest and
still rules on formats. The list at the foot says which pieces the code draws itself, so
nobody makes those twice. When an item is done, Claude moves it to the archive.

**To make now:** 33 (Gunnerside's five moment panels), 32 (Gunnerside's echo and wind; its music optional). **Optional:** 21, 17, 18.

CORE PROMPT:
Illustration in the style of a 1980s British boys' comic annual (Commando, Warlord, Battle Picture Weekly). Confident black ink linework with brush-weight variation, flat areas of limited spot colour: olive army green #5C6B4A, warm cream #F2E8D5, brick red #C1272D, slate blue #3D5A73, near-black ink #1A1A18. Light Ben-Day halftone dots for shading only, used sparingly. Printed on cheap matte paper. Strong readable silhouette, clear light and dark shapes, simple background. No text, no lettering, no signature, no watermark, no border, no frame.

---

## Priority 33 — the heavy water plant's moment panels (Gunnerside, M61)

**Why** (M61): the game can now show a comic panel the first time something happens
in the night, not only at the drop, the landing and the win. Gunnerside has five such
moments built and waiting; each painting shows the moment its file is in, and until
then nothing shows. In the order they matter: the first shot is the one panel that
teaches (the cost of a shot, felt), so it comes first.

**Every one:** as Priority 28's landing panels, **3:2, 1200 × 800, JPEG ~85, sRGB,
opaque, no text**, the **top-left quarter quiet** (the caption sits there). Claude makes
the 900 × 600 copy and keeps your original as `_full`. **The setting** is Priority 31's
(ART-PROMPTS-ARCHIVE.md): Norway, February 1943, the plant on its shelf across a frozen
gorge, men in white hooded snow smocks, German garrison, snow as cream and pale cold
blue, night as slate blue and ink.

| # | File | Shown when | Caption (yours to reword, wording sheet O63a–e) |
|---|---|---|---|
| 33a | `assets/panels/panel-shot-gunnerside.jpg` | The night's first shot | THE SHOT RANG DOWN THE GORGE. EVERY GERMAN ON THE SHELF WAS AWAKE NOW. |
| 33b | `assets/panels/panel-climb-gunnerside.jpg` | The first man onto the gorge side | DOWN INTO THE GORGE. ONE SLIP AND THE BRIDGE GUARDS WOULD HEAR HIM FALL. |
| 33c | `assets/panels/panel-inside-gunnerside.jpg` | The first man into the cable duct | THROUGH THE CABLE DUCT, INTO THE HEART OF THE PLANT. |
| 33d | `assets/panels/panel-bang-gunnerside.jpg` | The cell hall blown | A DULL THUMP INSIDE THE HALL — AND THE HEAVY WATER RAN AWAY DOWN THE DRAINS. |
| 33e | `assets/panels/panel-failed-gunnerside.jpg` | Failed or withdrawn, beside the back page | THE SNOW CAME DOWN AND FILLED THEIR TRACKS. THE PLATEAU KEPT ITS SECRETS. |

### Prompt — 33a, the first shot (add the style block)

> A single comic-book panel, night in a deep snowy gorge in Norway, 1943: in the
> foreground a British commando in a white hooded snow smock fires a Bren light machine
> gun from the snow, a hard red-orange muzzle flash. The sound is drawn as great pale
> rings spreading out from the flash and running away down the length of the black
> gorge. Across the gorge on a shelf, a long concrete plant whose windows are lighting
> up one after another, a searchlight swinging on. Cold blue and ink, one burst of red.

### Prompt — 33b, the climb (add the style block)

> A single comic-book panel, night, looking up a sheer icy cliff in a narrow gorge in
> Norway: a British commando in a white hooded snow smock hangs on a rope partway down
> the rock face, boots braced, rucksack on his back, a long drop to a frozen river below.
> High above him a small suspension bridge crosses the gorge, a lamp on it and the dark
> shape of a German sentry. Ink-black rock, pale ice, slate-blue night.

### Prompt — 33c, inside (add the style block)

> A single comic-book panel, a cramped concrete tunnel packed with thick cables and pipes
> on brackets: a British commando in a white snow smock crawls through it on his elbows
> toward the viewer, a small electric torch held in his teeth throwing a hard cone of
> light, a canvas bag of explosives dragged behind him. Darkness all round the torch
> beam. Ink, concrete grey, the torchlight cream.

### Prompt — 33d, the bang (add the style block)

> A single comic-book panel, inside a long industrial hall at night: a row of tall
> steel cells along the floor bursts open in a flat, muffled explosion, a white flash,
> metal peeling back, liquid spilling across the concrete floor, the tall windows along
> the wall blowing outwards. No men in the room. Ink, steel grey, cream flash, a little
> fire orange.

### Prompt — 33e, failed (add the style block)

> A single comic-book panel, dawn over a bare snowy plateau in Norway: snow falling
> thickly, a line of boot prints across the snow already filling in and fading, an
> abandoned white snow smock and a Sten gun half buried. Far off, small and grey, the
> lights of the plant still burning on its shelf across the gorge. Quiet, cold, still.
> Pale cream and cold blue, slate-blue shadows, no fire.

---

## Priority 32 — the heavy water plant's sounds (find, don't generate) — echo and wind to find (flare ✅ in)

**Why** (M60): three sounds are made in code for now and play already; a recording
dropped in with the right name replaces each with no code change, as Priority 11's did.
Levels are set in code, so they need not match. Formats and limits as ART-ASSETS.md §9:
M4A or MP3, mono, 44.1 kHz, under 200 KB, no silence at the front.

| File | What it is | Length |
|---|---|---|
| `assets/audio/echo.m4a` | **The shot's echo.** Not the shot: what comes back. Gunfire echoing off the far side of a mountain gorge, three or so returns each fainter and duller, then a low roll dying away. Search "gunshot echo canyon", "rifle echo valley" and cut the first shot off | 2–3 s |
| `assets/audio/flare.m4a` ✅ in (M60c, the operator's) | **The decoy flare, far off.** A flare pistol's pop, the rising hiss of the flare climbing, then a long crackling fizz as it burns. Search "flare gun", "signal flare launch" | 2–3 s |
| `assets/audio/wind.m4a` | **Wind over high snow.** A hollow gust that swells and falls away, no whistling trees, no rain. Search "wind snow mountain", "arctic wind gust" | 3–4 s |

**Optional, a fourth:** `assets/audio/music-gunnerside.m4a`, the mission's own music
over its orders and the drop, as the other three have (ART-ASSETS.md §9, Music by
screen): cold, slow, tense, strings or a low brass line, looped clean, under 1 MB.
When it is in, Claude adds `"music": "music-gunnerside"` to the mission. Until then it
plays the title music.


---

## Priority 21 — the six in winter kit (the aqueduct) — optional, yours to offer

The same six, dressed for a February night in the Apennines, as Priority 12 dressed
them for the desert. Wired in M43: each loads the moment it is in the folder, and any
one missing falls back to his France portrait, so they can come in one at a time, or
not at all. France's portraits do not look wrong here; this is for the rail to say
"winter, Italy" at a glance.

| | |
|---|---|
| Files | `assets/portraits/winter/portrait-<id>-full.png` × 6, and `portrait-<id>-chip.png` × 6 if the chips change too |
| ids | `holloway`, `fitch`, `vance`, `barrow`, `speers`, `nunn` |
| Size, format, framing | **Exactly as Priority 1 and 2** (full 4:5, 960 × 1200, opaque PNG; chip 1:1, 128 × 128, transparent) |
| Background | Flat **cold slate blue**, a little paler and greyer than France's, or the board's winter ground (`#3D5A73` washed well down toward the paper) |
| Code does | The same as for France. Send the PNGs; Claude makes the 480 × 600 JPEGs the game loads |

### Base prompt (all six)

> Head-and-shoulders portrait of a British airborne paratrooper, southern Italy,
> February 1941, on a cold clear night. He wears the early padded cloth-covered jump
> helmet with chin strap and a plain grey-green gabardine jump jacket with a high
> collar, a wool scarf at the throat, breath showing faintly in the cold. Face lightly
> blackened with burnt cork. Three-quarter view, looking slightly off-camera,
> determined. Lit from one side by moonlight, with deep shadow on the other. Face
> centred, eyes about 40% down the frame, shoulders filling the bottom of the frame.
> Flat plain pale slate-blue background. [PER-MAN DETAILS] [STYLE BLOCK]

If the 1941 helmet makes them read as different men at 56 × 70 px, keep the rimless
steel one of the other two sets: the same six matter more than the right year.

### Per-man details

Each man keeps his feature. Vance's net and Barrow's twig need a steel helmet to sit
on; with the cloth one, give Vance his binoculars held up at his chest and Barrow a
sprig of olive tucked in his collar.

| id | Per-man details (paste into the prompt) | The one feature that must read |
|---|---|---|
| `holloway` | *As in France: sergeant, weathered, late thirties, square jaw, a thick dark moustache, chevrons on the sleeve.* | the moustache |
| `fitch` | *As in France: young, thin face, jug ears, freckles, lopsided grin, an unlit cigarette in the corner of his mouth.* | the cigarette |
| `vance` | *As in France: lean, narrow watchful eyes; binoculars held ready at his chest.* | the binoculars (or the helmet net) |
| `barrow` | *Young, lanky, big ears, open-mouthed half-laugh; a sprig of olive leaves tucked into his collar.* | the olive sprig (or the twig) |
| `speers` | *As in France: broad face, dark stubble, a thin scar, a slate-blue scarf knotted at the throat, Bren sling.* | the scarf |
| `nunn` | *As in France: enormous build, thick neck, broken nose, placid and gentle expression.* | the sheer width |


---

## Priority 17 — the bomb store (reference, optional)

M33 put a **bomb store** in the airfield's north dispersal, between the two eastern
Stukas. Claude has drawn it in code (rows of bombs inside a sandbag ring, seen from
above). If the operator wants it nearer the painted look, a reference picture for Claude
to redraw from, as `Stuka_` and `Ju52_Reference_01` were for the aircraft, into
`assets/reference/`:

| File | Spec |
|---|---|
| `BombStore_Reference_01` | seen from straight above, about square, any size: a Luftwaffe bomb dump in the desert, SC 250 bombs stacked in rows on timber, a low sandbag or oil-drum blast wall round it, perhaps a net over half; the same desert tan and dark green as the aircraft |

### Prompt (add the style block)

> A Luftwaffe field bomb dump in the North African desert seen from directly overhead:
> rows of dark green aerial bombs with tail fins laid on timber baulks inside a low
> ring of sandbags, a camouflage net thrown over one end, bare sand around it.


---

## Priority 18 — the goods train (reference and a sound, optional)

M34 runs a **goods train** over France's rail bridge on turn 10 (M37). Claude has drawn an
engine and a wagon in code, from above, each one hex long (80 x 46). To bring them nearer
the painted look, a reference for Claude to redraw from, into `assets/reference/`:

| File | Spec |
|---|---|
| `Train_Reference_01` | seen from straight above, running left to right: a French or German wartime goods locomotive (a tank engine or a small tender engine) and two or three covered wagons, any size |

Since M35 it **whistles as it comes onto the board**. **Supplied at M48h** (the operator's recording of a steam train passing, cut to the pass); before that a whistle made in code. A
recording replaces it: `train.m4a` dropped into `assets/audio/` is played instead,
with no code change. The wreck has no sound of its own yet. Both would be found as
Priority 11's were (freesound.org CC0 or Pixabay); Claude can find, cut and level them
and wire the wreck in if asked:

| File | What | Length |
|---|---|---|
| `train.m4a` / `.mp3` | a steam goods train at a distance, a whistle first, then its chuffing | ~3–5 s, for the turn it comes on |
| `train-wreck.m4a` / `.mp3` | wagons piling up, steam, over the bridge's own bang | ~3 s |

### Prompt (add the style block)

> A wartime steam goods train seen from directly overhead, running left to right on a
> single track: a black tank locomotive and three dark green covered wagons, plain
> ground either side.


---

## How to use this

- **One style block for everything.** Paste the core prompt at the top of this file at
  the end of every prompt. Consistent style matters more than any single image being perfect.
- **Generate the six portraits as one batch**, same session and same seed if your tool
  allows it. Then regenerate any single man who drifts off-style. Six men who look like
  they came from one annual beat one great portrait and five mismatched ones.
- **Generate big, then downsize.** Ask for the largest size your tool gives at the right
  aspect ratio, then resize to the spec with a proper resampler (Photoshop, Affinity,
  `sips`, ImageMagick). Don't let the generator pick the final size.
- **Every prompt needs the same negatives:** *no text, no lettering, no captions, no
  signature, no watermark, no border, no frame, no speech bubble.* Generators love to add
  fake comic text, and the game draws its own frames, names and numbers.
- **Drop-in and check.** Portraits are live the moment the file is in
  `assets/portraits/` with the right name: reload the page. Nothing else needs a code
  change.

### The style block

It is the **core prompt** at the top of this file (the operator moved it there, as it is
wanted every time); "add the style block" in a prompt means that.

The hex values are there to steer the palette. Most generators won't match them exactly,
and that's fine. The game tints nothing in a portrait.


---

## Later — once level design has settled

Not worth making yet. The map and layout will still change.

| Asset | Spec | Prompt starter |
|---|---|---|
| `paper-crease.png` | 400 × 1800, alpha | *Vertical centre-fold crease of an open comic annual, soft shadow and highlight, isolated on transparency.* |
| `paper-edge-wear.png` | 2560 × 1600, alpha | *Overlay of aged paper edge browning and corner foxing on transparency, centre fully clear.* |


---

## What Claude is drawing in code (don't generate these)

These are part of M7b and are made as SVG in `src/render/theme.js`:

- (Not a sprite: the training course's clipboard, M48f, is drawn in CSS only when the operator's painted one, Priority 26, is missing.)
- The practice ground's umpires (M48g): `counter-enemy-sentry-umpire`, `-patrol-umpire`
  and `-reserve-umpire`, a peaked cap and a white armband, until Priority 24 is painted.

- The C-47 Dakota silhouette for the drop fly-by (until `aircraft-dakota.png` is
  supplied), and the opening, drifting and collapsing parachute canopies: the men's in
  green, a supply canister's in blue (M43c).
- The soft drop shadow under counters.
- Prints in the snow (M57, `prints`, half a hex of boot prints) and the boot mark on a
  hovered path (`marker-boot`). Not asked for as a painting (M60): at half a hex a
  painting would be a blur, as the parachutes would.
- The heavy water plant's ground and targets (M58; the board stays drawn at M60, its
  paintings are the panels and cards of Priority 31): the
  snowfield, drift, pine woods, rock, gorge sides, ice, plant walls, hall floor, cable
  duct, pipes, barracks and the suspension bridge's deck; the cells, the junction box on
  its pole, and the ski trail with its cairn at the way out. Since M58d its land is the
  pale frost, the drifts the deep frost.
- The ground colours (M58d): meadow for the green country, frost for snow, deep frost
  for winter slopes, flat under every map but the airfield's; roads and the land beside
  water left bare paper.
- The mouse arrow in the ? pages' scenes (M48i, `help-cursor`): plain paper and ink.
- The cover shields on a hovered move (M45): empty, half green, all green.
- The strike marks on an enemy's chip (M46: knife, crosshair, crosshair struck through,
  each in the pen's red disc) and the red clock on a man too far from the exfil.
- The counter markers (spotted, wounded, hidden, and since M11 the leader-blue orders
  chevron on a man who has the leader's +AP this turn).
- The bowser's fuel hose to its charge point (M30b), and the faint dashed ground of a
  blast still to come.
- The goods train (M34): its engine and wagons from above, running and wrecked, with
  rounded corners and blue and paper trim since M35 (Priority 18 if a reference is
  wanted). Its whistle is made in code too (M35).
- The bomb store (M33) in its sandbag ring, standing and blown, and the trolley rails to
  its charge point (Priority 17 if a reference is wanted).
- The desert chips (M30b), cut from the operator's desert portraits onto a dark red-brown
  ground; a painted set would replace them.
- The fuse stopwatches on a burning charge (M15), since M30 with the face divided into
  the charge's own length (the airfield's time pencils run 1 to 6 turns).
- The tin of time pencils (M31d): the six No. 10 delay switches, colour-banded by length,
  and the olive tin they lie in (the tin is page styling, the pencils `time-pencil-N`).
- The airfield's burnt-orange counters (M31d): the same frame, printed in another colour.
- Continuous roads, hedges and the railway line; since M17 the hedges are laid as bushy
  clumps along their line, with now and then a tree, after `Hedgerows_Reference_01.jpeg`.
- Woods, orchards, marsh and the ridge as shapes across hexes, and their motifs. Since M17
  the woods are crowded billowing crowns throwing ink shadows, and the orchards rows of
  round trees on one lattice across the orchard, after `Woods_` and `Orchard_Reference_01.jpeg`;
  since M20 the orchard's trees are small billowing crowns like the wood's (flat round ones
  read as oil drums), and a windfall apple has a stalk.
- Place names on the map (they are type, set from `data/map.json`).
- The where-to-start cues (M21): PICK A DROP DIRECTION and HIT SPACE TO JUMP (M24) in the pen lettering
  among the runs' names, and red pen rings round the men until one is first selected.
  They are type and strokes, not pictures.
- The green counter frames, their AP figure and card edge.
- The fuel dump, telephone exchange (with the church) and rail bridge, redrawn after the
  reference art, intact and destroyed.
- Ferme Lebrun's farm (M14), after the operator's reference: the farmhouse hex.
- One drawn stand-in portrait and chip, for a man with no files of his own (M25: the six
  men's own drawn faces were taken out, as every one of them is painted).
- A plain night scene for the title card (moon, Dakota, canopies, skyline), with the title
  set over it in type: the fallback if `assets/title/title-card.jpg` is missing.
- The exfil barn with the pick-up party's green lamp (M8e), in the same view as the
  exchange.
- The eleven sounds (M10, the explosion M11, the back page's bells M12, the gunfire M13, the Dakota M15), made with Web Audio in `src/render/sound.js` until the MP3s of
  priority 11 are supplied (all supplied since M21c; M23's counter slide was taken out in
  M24: a move is silent), and the title music over the opening screens (M17,
  `music-title.mp3` replaces it; cut it to loop cleanly, about a minute, under 1 MB).
- The role symbols on the counters (redrawn bolder M13), the AP dots (the leader's orders in blue, M14), the shots' flash and
  tracer, and the suppressed band.
- The telephone exchange's wires (M12; M14): a telegraph pole on each of its charge points
  and one long line from each to the roof standard on the exchange, hanging snapped once
  it is cut or blown.
- Fire (M14): the flames on a destroyed target and the blast's fireball, in the soft fire
  orange added to the palette for them.
- The cut exchange (M16): the house standing with its windows dark, the lights flickering
  out and sparks at the snapped wires as the line is cut.
- The knife's blood (M16): the faint stain left under the body, spreading slowly out from
  under him as he is knifed (M18).
- The aiming marks (M15, M18): the crosshair over an enemy, the red cross over a man being
  aided, and the pebble in a ring where a stone will land.
- The ghost Dakotas (M16): the same aircraft, greyed and faint, flying each drop line until a
  run is picked.
- The parachutes: the canopy opening and drifting in the air and the spent one on the
  ground are the same green-and-cream cloth (M8e). Not worth a bitmap: they print at about
  20 px, where a painting would just be a blur, and the drawn ones now match each other.
- The airfield (M29, SPEC.md §13), all of it in the palette's desert ochre: the sand,
  scrub, dunes, the wadi, the strip, the pens' sandbag walls, the camp's bell tents and
  the perimeter wire (a line with concertina coils and pickets, like a hedge); the eight
  aircraft from above, four Ju 87 Stukas and four Ju 52s, intact and burnt out (redrawn
  M31c after `Stuka_` and `Ju52_Reference_01`); the fuel
  bowser alone on the apron; the signals tent with its wireless mast and field-telephone
  wires, standing, cut and blown; the two trucks waiting at the rendezvous with the green
  lamp (netted lorries since M31c, after `Trucks_Reference_01` and `_02`); and the
  perimeter car's counter until its painting (M31c). The
  airfield's own title card (`titleCard` in data/missions.json) is France's until the
  operator paints one (Priority 13).
- The aqueduct (M41, SPEC.md §14), a first drawing for the draft, all of it in the
  palette as it stood (a pale wash of the cold blue for winter ground; since M58d the
  land is the deep frost, the mission's ground colour):
  the hillside, crags, the ravine with its torrent, terraces, olive groves, plough,
  shingle, shore rocks and the sea; the aqueduct whole and blown, the road bridge whole
  and blown, the ship's boat and the supply canister. Redrawn at M50 from the operator's
  references (Priority 22): the aqueduct in two tiers of arches, the road bridge from above
  with its parapets, the whaler with its sailor, the canister with its spilled chute, the
  terrace walls as courses of stone over a green bank, the olives as ragged crowns. At M51
  (the operator's notes) the road bridge's arch hangs from the deck the right way up, over
  the torrent printed on under it, and the canister's chute lies above it, clear of its dots. Since M43 the winter ground's wash
  is a little stronger (the cold blue at 0.18 over the paper, 0.1 before), and the
  hand-off is written: its title card (Priority 20), winter portraits (21), references
  to redraw the board's pictures from (22) and its sounds (23). The Italian chips and
  the title card are painted and in (M43b); its portraits are France's.
- The aqueduct's three sounds (M43), made with Web Audio until recordings are found:
  the canisters' thump, the boat's oars and the surf it lands in (Priority 23).
- The strip's two thick ink edges (M31b) along its rolled sand, so it reads as a runway.
- The airfield's jeep raid's muzzle flashes (M31), blinking at the painted jeep's guns. Its three sounds
  are made in code as the fallback; recordings supplied since M31c.
