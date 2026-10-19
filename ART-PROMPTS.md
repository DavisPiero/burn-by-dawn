# BURN BY DAWN — Art to generate next

A shopping list for an image generator: **only what is still to make**, the most wanted
first. Each entry has the file it becomes, the exact size and format, where it shows in
the game, and a prompt. Paste **the style block** (below the list, under "How to use
this") after every prompt.

Everything already made is in `ART-PROMPTS-ARCHIVE.md` (moved there at M60, 19 Oct 2026),
with its prompt, in case a piece is ever redone. `ART-ASSETS.md` is the full manifest and
still rules on formats. The list at the foot says which pieces the code draws itself, so
nobody makes those twice. When an item is done, Claude moves it to the archive.

**To make now:** 31c and 31d (Gunnerside's two comic panels), 30 (the shared Dakota
panel), 32 (Gunnerside's sounds). **Optional:** 21, 17, 18.

---

## Priority 31 — the heavy water plant's paintings (Gunnerside) — 31c and 31d to make (31a, 31b ✅ in, 2026-10-19)

**Why** (M60): Gunnerside becomes playable at the end of M60, and it is the only
mission with none of its own pictures yet. Four paintings, in the order to make them:
the first two are what a player sees before anything else, the last two are the comic
panels in the slots already built (Priority 28, Priority 30). Each loads the moment its
file is in; until then the contents page shows the line alone, the orders France's title
card, and a panel with no painting shows nothing.

**The setting, for every one of them.** Norway, February 1943, loosely Operation
Gunnerside. A hydroelectric plant on a narrow shelf cut into a mountainside: the
**hydrogen plant**, a long concrete block of four or five storeys with rows of tall
windows, where the heavy-water cells are, and behind and above it the **power station**
with **great penstock pipes** running straight down the cliff to it. In front of the
shelf a deep, narrow **gorge** with a frozen river at the bottom, crossed by a small
**suspension bridge**. Above the gorge on the near side, the bare snow of a high
**plateau** with scattered pines and rock. Deep snow, a hard clear cold. **The men wear
white hooded snow smocks over their battledress**, white covers on rimless steel
helmets (or wool caps), faces blackened, Sten guns and rucksacks; no skis needed. The
garrison is German.

**Colour.** The style block's palette, with the snow as the cream paper and pale cold
blue (`#EEF2F2` and `#D2DBE0` steer it), the shadows slate blue, the night ink. Fire
orange only for the bang. It should read colder than the aqueduct.

| # | File | Size, format | Shown at | Code does |
|---|---|---|---|---|
| 31a ✅ in (M60) | `assets/title/contents-gunnerside.jpg` | **As Priority 14**: 3:2, 1200 × 800, JPEG ~85, sRGB, opaque | 120 × 80 beside its line on the contents page, and again as the **mission accomplished** panel (about 550 × 370) | Claude makes the 480 × 320 copy; your original kept as `contents-gunnerside_full.jpg` |
| 31b ✅ in (M60, BURN BY DAWN painted in) | `assets/title/title-card-gunnerside.jpg` | **As Priority 2b**: 4:1, 2400 × 600, JPEG ~85 | Across the top of the orders and the back page | Claude makes the 1600 × 400 copy; original kept as `_full`. **Say whether BURN BY DAWN is painted in** |
| 31c | `assets/panels/panel-dakota-gunnerside.jpg` | **As Priority 30**: 3:2, 1200 × 800, JPEG ~85, no text | After START GAME, before the run is picked. **Top-left quarter quiet**: the caption sits there | Claude makes the 900 × 600 copy; original kept as `_full`. Until it is in, the shared Dakota panel shows (once that is painted) |
| 31d | `assets/panels/panel-landing-gunnerside.jpg` | **As Priority 28**: 3:2, 1200 × 800, JPEG ~85, no text | After the jump, before turn 1. **Top-left quarter quiet** | As 31c |

The contents panel must read at thumbnail size and again large as the last thing a
winning player sees, so it is the bang, with the men already slipping away, as the
other missions' panels are.

### Prompt — 31a, the contents panel (add the style block)

> A single comic-book panel, a bitter cold winter night in the mountains of Norway,
> February 1943: a long concrete industrial building of four storeys with rows of tall
> windows stands on a narrow snowy shelf against a dark cliff, great steel pipes running
> straight down the cliff behind it, and at the moment of an explosion inside it every
> window on its lower floor blows out in a burst of orange light and glass. In the
> foreground, small and dark against the lit snow, three British commandos in white
> hooded snow smocks run low away from it across deep snow toward the edge of a gorge,
> leaving a line of footprints. A small suspension bridge over the black gorge on the
> right, a starry sky. Pale cream and cold blue snow, slate-blue night, one burst of
> fire orange. Strong simple shapes that read at thumbnail size. No text.

### Prompt — 31b, the title card (add the style block)

> Wide panoramic night scene, February 1943, the mountains of Norway: a stick of
> paratroopers in white snow smocks coming down under round canopies over a bare snowy
> plateau with scattered dark pines, a four-engined Handley Page Halifax bomber flying
> away low. Along the bottom edge, the plateau breaks off into a deep black gorge with a
> small suspension bridge across it, and on the far side a long concrete plant on a
> shelf, a few lit windows, steel pipes running down the cliff behind it. A low moon,
> a hard clear starry sky. The centre of the picture is open dark night sky; the
> canopies and the aircraft are grouped toward the left and right edges. Deep slate
> blue and ink night palette, cream and pale cold blue moonlit snow.

The aircraft is a Halifax here, not a Dakota: Gunnerside flew in one (four engines, a
deep slab-sided fuselage, twin fins). The board's own aircraft stays the Dakota.

### Prompt — 31c, the Halifax panel (add the style block)

> A single comic-book panel, night, inside the dark fuselage of a Handley Page Halifax
> bomber, seen from low down close to a round hatch open in the floor: paratroopers in
> white hooded snow smocks sit hunched on the cold metal floor round the hole, legs
> dangling toward it, static lines hooked to a rail overhead, breath steaming. Through
> the hatch, far below, moonlit snow and black pines. The nearest man, close to us, lit
> red from one side by a jump light, stares down into the hole. Ribbed metal fuselage,
> frost on the ribs. Deep shadow and red light against cold slate blue and the pale snow
> below. The top-left of the picture is dark fuselage.

### Prompt — 31d, the landing (add the style block)

> A single comic-book panel, a still, bitter cold night on a high snowy plateau in
> Norway, February 1943, seen from low down and close: a paratrooper in a white hooded
> snow smock lands in deep snow and sinks to his knees, snow spraying up, his round
> parachute collapsing in great pale folds behind him. Behind him, his first few deep
> boot prints already crossing the untouched snow. Far off on the right, the plateau
> ends in the black line of a gorge, and beyond it a few faint lights. A low moon,
> stars, a few dark pines. Cream and pale cold blue moonlit snow, slate-blue night,
> near-black shadows. The top-left of the picture is open dark sky.

If the generator will not leave off text on the plant (signs, numbers), paint it out:
the game names the plant itself.


---

## Priority 30 — the Dakota panel (before the drop) — to make

**Why** (M55, the operator's): a comic panel of the men in the back of the aircraft
readying to jump, after START GAME and before the drop run is picked, in every mission.
It works like the landing panels (Priority 28): the same frame, tilt and caption box,
once a game, a click or any key puts it away.

**One shared painting first.** Each mission tries its own file before the shared one, so
a desert or winter version can be added later with no code change:
`panel-dakota-airfield.jpg` (khaki drill), `panel-dakota-aqueduct.jpg` (winter; the real
1941 raid flew in Whitley bombers, jumping through a hole in the floor, if you want it
true), `panel-dakota-france.jpg`.

| | |
|---|---|
| Files | `assets/panels/panel-dakota.jpg` (shared); later, optionally, `panel-dakota-<mission>.jpg` |
| Size, format | **As the landing panels**: 3:2, **1200 × 800**, JPEG quality about 85, sRGB, opaque, **no text** |
| Shown at | About 550 × 370, over the board, tipped in a thick ink frame the code draws |
| Composition | One clear moment, close and dramatic. **Keep the top-left quarter quiet** (dark fuselage): the caption box sits over it |
| Code does | Claude makes the 900 × 600 copy the game loads; the original is kept as `_full` |

### Prompt — the shared one, `panel-dakota.jpg` (add the style block)

> A single comic-book panel, night, inside the dark cabin of a Douglas Dakota transport
> aircraft, seen from low down near the open door, looking forward up the fuselage: a
> stick of British paratroopers in rimless steel helmets and camouflaged Denison smocks
> stands in a tight line, each with one hand on the static line hooked to the cable
> overhead, kitbags strapped to their legs. The nearest man, close to us, grim and
> lit red from one side, checks the man in front's kit. A small red jump light glows
> beside the open door on the right, cold wind and dark night sky and a sliver of moon
> through the doorway. Ribbed metal fuselage walls, bucket seats folded up. Deep shadow
> and red light against cold slate blue. The top-left of the picture is dark fuselage.

The caption over it is a placeholder in `data/missions.json` (`comicPanels.dakota`), one
per mission, for you to reword.


---

## Priority 32 — the heavy water plant's sounds (find, don't generate) — to find

**Why** (M60): three sounds are made in code for now and play already; a recording
dropped in with the right name replaces each with no code change, as Priority 11's did.
Levels are set in code, so they need not match. Formats and limits as ART-ASSETS.md §9:
M4A or MP3, mono, 44.1 kHz, under 200 KB, no silence at the front.

| File | What it is | Length |
|---|---|---|
| `assets/audio/echo.m4a` | **The shot's echo.** Not the shot: what comes back. Gunfire echoing off the far side of a mountain gorge, three or so returns each fainter and duller, then a low roll dying away. Search "gunshot echo canyon", "rifle echo valley" and cut the first shot off | 2–3 s |
| `assets/audio/flare.m4a` | **The decoy flare, far off.** A flare pistol's pop, the rising hiss of the flare climbing, then a long crackling fizz as it burns. Search "flare gun", "signal flare launch" | 2–3 s |
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

- **One style block for everything.** Paste the style block below at the end of every
  prompt. Consistent style matters more than any single image being perfect.
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

> Illustration in the style of a 1980s British boys' comic annual (Commando, Warlord,
> Battle Picture Weekly). Confident black ink linework with brush-weight variation, flat
> areas of limited spot colour: olive army green #5C6B4A, warm cream #F2E8D5, brick red
> #C1272D, slate blue #3D5A73, near-black ink #1A1A18. Light Ben-Day halftone dots for
> shading only, used sparingly. Printed on cheap matte paper. Strong readable
> silhouette, clear light and dark shapes, simple background. No text, no lettering, no
> signature, no watermark, no border, no frame.

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
