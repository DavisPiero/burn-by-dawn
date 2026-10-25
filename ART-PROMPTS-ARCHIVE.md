# BURN BY DAWN — Art prompts made (archive)

Every item of `ART-PROMPTS.md` that has been made, supplied or set aside, with the prompt
and spec it was made from, in the order it was asked for. Moved here unchanged at M60
(19 Oct 2026) so the open list fits on a screen. Not read every session: look here when
a piece is to be redone, or to match a new one to an old one. The style block they were
made with is in `ART-PROMPTS.md`, under "How to use this".

---

## Priority 1 — the six full portraits ✅ done (2026-09-26)

**Why first:** the roster rail shows all six all the time. They're the emotional payload
of the design (SPEC.md §11), and today they're the weakest drawn art in the game.

| | |
|---|---|
| Files | `assets/portraits/portrait-<id>-full.png` × 6 (since M17 the game loads a 480 × 600 JPEG made from each, `portrait-<id>-full.jpg`: a new PNG needs its JPEG remade, see the portraits README) |
| ids | `holloway`, `fitch`, `vance`, `barrow`, `speers`, `nunn` |
| Size | **4:5, 960 × 1200 px** (never below 480 × 600) |
| Format | PNG, 8-bit sRGB, **opaque** |
| Framing | Head and shoulders. Face and helmet inside the **central 80% of the width** and between **12% and 92% of the height**. Eyes about **40% down**. |
| Shown at | About 55 × 70 px in the roster rail and 96 × 120 px in the rollover. It **must read tiny**: squint at it at thumbnail size before accepting it. |
| Background | Plain or near-plain. A flat slate-blue or warm cream wash is ideal. |
| Code does | Frame, number, name, and greying out when the man dies. Don't draw any of those. |

### Base prompt (all six)

> Head-and-shoulders portrait of a British airborne paratrooper, Normandy, June 1944,
> at night. He wears the rimless steel paratrooper helmet with chin strap and a Denison
> camouflage smock. Face lightly blackened with burnt cork. Three-quarter view, looking
> slightly off-camera, determined. Lit from one side by moonlight, with deep shadow on
> the other. Face centred, eyes about 40% down the frame, shoulders filling the bottom
> of the frame. Flat plain slate-blue background. [PER-MAN DETAILS] [STYLE BLOCK]

### Per-man details

Each man has one feature that has to survive at thumbnail size. It is the same feature
his drawn chip uses, so painted and drawn versions agree.

| id | Who | Per-man details (paste into the prompt) | The one feature that must read |
|---|---|---|---|
| `holloway` | Sgt. Alec "Dutch" Holloway. Sapper, **the leader** | *Sergeant, weathered, late thirties, square jaw, heavy brows, a thick dark moustache. Three sergeant's chevrons visible on the upper sleeve. Calm, in command, has done this before.* | the moustache |
| `fitch` | Pte. Ronnie Fitch. Sapper | *Young private, about twenty, thin face, jug ears, freckles, cheeky lopsided grin, an unlit cigarette tucked in the corner of his mouth. A cocky East End type.* | the cigarette |
| `vance` | Cpl. Eddie Vance. Scout | *Corporal, lean, narrow watchful squinting eyes. Helmet covered in camouflage scrim netting. Binoculars on a strap round his neck. Quiet and alert.* | the helmet net |
| `barrow` | Pte. Tom Barrow. Scout | *Young private, lanky, big ears, open-mouthed half-laugh. A leafy twig stuck upright in his helmet netting. A country boy.* | the twig |
| `speers` | Cpl. Stan Speers. Gunner | *Corporal, broad-faced, dark stubble, a thin old scar across one cheek. A slate-blue scarf knotted at the throat. Bren gun sling over one shoulder. Unflappable.* | the scarf |
| `nunn` | Pte. Wilf Nunn. Gunner | *Private, enormous build, thick neck, broken flattened nose, heavy brow, placid and gentle expression. Shoulders much broader than the others.* | the sheer width |

**Check before accepting:** shrink the image to 56 × 70 px. Can you still tell which man
it is? If not, push the one feature harder and simplify the background.


---

## Priority 2 — the six counter chips ✅ done (2026-09-26)

Made by the operator from the second set of portraits (2026-09-26) and used as supplied.
`tools/make-chips.js` (paste it into the browser console on the running game) made the
first set and can still cut chips from the full portraits; its `CROPS` table was tuned
for the first portraits, so retune it before using it on these.

**Why:** if you supply painted portraits but no chips, the counters on the board show
drawn faces that won't match the portraits. Make the chips from the portraits you
accepted, so they match.

| | |
|---|---|
| Files | `assets/portraits/portrait-<id>-chip.png` × 6 |
| Size | **1:1, 128 × 128 px** |
| Format | PNG, 8-bit sRGB, **transparent background** |
| Framing | Helmet and face only, **filling the frame** |
| Shown at | About **25 px**, on a solid green counter. This is an icon, not a portrait. |

### Prompt

Use an image-to-image or reference mode with that man's accepted full portrait as the
input:

> Icon of the same soldier: helmet and face only, filling the square frame, front view.
> Extreme simplification: thick black ink outline, three flat colours, no halftone, no
> shading detail. His one distinguishing feature, [THE FEATURE], drawn oversized so it
> reads at 25 pixels. Transparent background. [STYLE BLOCK]

**Tip:** it's often quicker to make these by hand from the portrait than to generate
them. Crop, posterise to 4 colours, redraw the outline thicker. Check them at 25 px.
The counter behind them is army green, so give the helmet a clear ink outline or it will
melt into it.


---

## Priority 2b — the title card ✅ done (2026-09-26)

Supplied with the title painted in; `title-card_original.jpg` beside it is the picture
without, kept to revert to (set `TITLE_CARD.lettered` to false in `src/render/theme.js`).

**Why:** it is the first thing a player sees. It sits across the top of the orders card
when the game opens.

| | |
|---|---|
| File | `assets/title/title-card.jpg` |
| Size | **4:1, 2400 × 600 px** (never below 1200 × 300) |
| Format | **JPEG**, sRGB, quality about 85, opaque (the game loads a 1600 × 400 copy, M25; ART-ASSETS.md §7) |
| Shown at | 600 × 150 px across the top of the orders card. Another shape is cropped from its middle. |
| Composition | The title goes **across the middle**: keep the central 60% of the width and height open and fairly dark — night sky. Aircraft and canopies toward the left and right; fields, hedges and the skyline along the bottom fifth. |
| Code does | The title lettering, the frame, and a soft dark scrim behind the title. Don't put any text in the picture. |

### Prompt (add the style block)

> Wide panoramic night scene, 1944: a stick of British paratroopers coming down under
> round canopies over moonlit French farmland, a C-47 Dakota with black and white
> invasion stripes flying away, a low horizon of hedgerows and a village church spire in
> silhouette, a full moon. The centre of the picture is open dark night sky; the
> parachutes and the aircraft are grouped toward the left and right edges. Deep slate-blue
> and ink night palette with cream moonlight on the canopies.

Generate wide, then crop to 4:1 yourself, keeping the empty sky in the middle. Drop the
file in and reload: the title should read clearly without squinting.


---

## Priority 3 — the paper ✅ done (2026-09-26)

Supplied as an opaque grey scan (`paper-fibre_original.png`); the game's file was made
from it by moving the texture into the alpha (see `assets/paper/README.md`).

**Why:** ART-ASSETS.md rates this as the single biggest change to the feel. It's also
very low risk: it sits under everything at low opacity.

| | |
|---|---|
| File | `assets/paper/paper-fibre.png` |
| Size | **2048 × 2048 px**, must tile seamlessly |
| Format | PNG, 8-bit **greyscale + alpha**, very low contrast |
| Code does | Lays it over the cream, tiled at 1024 px. The colour comes from code, so all the texture must be in the alpha. |

### Prompt

> Seamless tileable texture of cheap uncoated newsprint paper, extreme close-up, visible
> short paper fibres and faint flecks, very low contrast, pale grey on near-white, even
> flat lighting, no stains, no folds, no shadows, no vignette, no text.

**Check:** tile it 3 × 3 in any editor and look for seams or a repeating blotch. If you
can see the repeat from arm's length, it's too contrasty. Flatten it.


---

## Priority 4 — a lettering font (choose, don't generate) ✅ done (2026-09-26)

Manly Men BB for the lettering, Stardos Stencil for headings; see `assets/fonts/README.md`.

**Why:** speech bubbles are currently set in whatever hand face the desktop ships
(Noteworthy on a Mac). A proper comic lettering face makes them look like the annual.

| | |
|---|---|
| File | `assets/fonts/<name>.woff2` |
| Needs | Capitals, a bold weight, and a licence that **allows web embedding** |
| Avoid | Comic Sans, and anything with a desktop-only licence |
| Where to look | Blambot (Nate Piekos) has free-for-indie-use comic lettering faces. Check the licence page for web/game embedding. |

Once supplied, it goes first in `TYPE.lettering` in `src/render/theme.js` with an
`@font-face`. This is a two-line change, so tell Claude which file it is.


---

## Priority 5 — objective reference art (for tracing, not dropping in) ✅ done (2026-09-26)

In `assets/reference/`; the three objectives were redrawn in code after them.

**Why:** the fuel dump, telephone exchange and rail bridge are SVG (ART-ASSETS.md §5),
because they need recolouring and halftone applied in code. Generated raster art can't
go in directly, but a good reference makes the hand-drawn SVG much better. Claude
redraws these in M7b regardless, so this only raises the ceiling.

| | |
|---|---|
| Output | Reference images only. Save them to `assets/reference/` (not loaded by the game) |
| Size | Anything, ideally **top-down or a steep three-quarter view from above**, to match the board |

### Prompts (add the style block to each)

- **Fuel dump:**
  > Top-down view from high above of a German army fuel dump in a Normandy field at
  > night: neat rows of 200-litre fuel drums, half under a draped camouflage net, a
  > fuel bowser truck parked alongside, a sandbagged sentry position at the corner.
  > Simple bold shapes, like a symbol on a wargame map.
- **Telephone exchange:**
  > Top-down three-quarter view from above of a small French village telephone
  > exchange in 1944: a two-storey stone building with a slate roof, a PTT enamel
  > sign, several telephone poles carrying wires away from it, a small church with a
  > spire beside it. Simple bold shapes, like a symbol on a wargame map.
- **Rail bridge:**
  > Top-down view from above of a short steel girder railway bridge carrying a single
  > track across a narrow canal, stone abutments on each bank, towpaths. Simple bold
  > shapes, like a symbol on a wargame map.


---

## Priority 6 — the aircraft ✅ done (2026-09-26)

**Why:** the drop is the first thing that moves. The drawn Dakota is a flat icon; a
painted one matches the portraits and the title card. A bitmap is the right format here:
it is one object, on screen for about three seconds, turned but never recoloured, and at
about 95 px wide an SVG's crispness buys nothing.

| | |
|---|---|
| File | `assets/aircraft/aircraft-dakota.png` |
| Size | **1:1, 512 × 512 px** |
| Format | PNG, 8-bit sRGB, **transparent background** |
| View | **Straight down from above, nose pointing right (east)**, centred, wingspan about 90% of the width. Not three-quarter: the game turns it to each run's heading, and any perspective would tumble. |
| Shown at | About 95 × 95 px, flying across the board for about 3 seconds. |
| Code does | The ground shadow (the same picture printed black and faint, offset), the rotation and the flight. Don't paint a shadow, clouds or ground. |

### Prompt (add the style block)

> Top-down view from directly above of a C-47 Dakota transport aircraft in flight, olive
> drab, black and white invasion stripes on the wings and rear fuselage, nose pointing
> to the right, wings spread level, isolated on a plain transparent background, no
> shadow, no ground, no clouds.

Most generators can't make transparency: generate it on flat white or flat magenta, then
cut it out (Photoshop's Remove Background, or Preview's Instant Alpha) before saving.


---

## Priority 7 — the enemy counters ✅ done (2026-09-27)

**Why:** our six are painted; the garrison is still drawn helmets. The two sides should
look like they came from the same box. The slot is wired: drop a file in and reload.

| | |
|---|---|
| Files | `assets/enemies/counter-enemy-sentry.png`, `counter-enemy-patrol.png`, `counter-enemy-reserve.png` |
| Size | **1:1, 128 × 128 px** |
| Format | PNG, 8-bit sRGB, **transparent background** |
| Shown at | About **20 px**, inside the black clipped-corner counter, above the red name strip (code prints SENTRY / PATROL / RESERVE SQUAD). Silhouette-level: it must read at a glance as *German* and as *which kind*. |
| Tell them apart | Sentry: **one** man in a coal-scuttle helmet and greatcoat collar, rifle muzzle over the shoulder. Patrol: **two** helmets side by side. Reserve squad: **three** helmets and an MG42 barrel — the one you cannot kill. |
| Code does | The frame, the red strip and its name, the facing arrow, the suppressed and no-kill markers. |

### Prompt (add the style block)

> Counter icon for a board game, head and shoulders of a WW2 German soldier in a Stahlhelm
> coal-scuttle helmet, seen from the front, grim, shadowed eyes under the rim, feldgrau
> greatcoat collar, simple bold shapes that read at thumbnail size, isolated on a plain
> transparent background, no text, no insignia, no symbols.

For the patrol and the reserve, ask for *two* / *three soldiers' helmeted heads close
together, overlapping*, and for the reserve add *an MG42 machine-gun barrel across the
front*. Keep all three the same painter, the same light and the same scale of head.
**No swastikas or eagle insignia**: they would not read at 20 px, and they are best left
out of a game like this anyway.


---

## Priority 8 — the results masthead ✖ not needed (2026-09-26)

**Dropped:** since M9b the back page is headed by the title card itself, smaller, so there
is no separate masthead to make. The spec is kept below in case that changes.

**Why it was here:** the last page of every game still had the drawn BURN BY DAWN lettering,
while the title card has your stencil.

| | |
|---|---|
| File | `assets/title/logo-burn-by-dawn.png` (needs a small code hook, like the title card) |
| Size | **8:3, 1600 × 600 px** |
| Format | PNG, **transparent background** — it sits on the cream results page |
| Content | The same BURN BY DAWN stencil as the title card, in **ink black** on transparency (or ink with a thin red offset shadow, like the annual's mastheads), on two lines: BURN / BY DAWN. A small parachute silhouette is welcome, no picture behind. |


---

## Priority 9 — reference art for the hedgerows, woods and orchards (for Claude to redraw) ✅ done (2026-09-27)

**Why:** after the objectives, the hedges are the next-biggest thing on the map, and they
are drawn as lumpy lines in code because they have to follow whatever route the hedgerow
hexes take. A bitmap cannot bend to follow them, so these are **references, like the
objectives were** — the look to match — and the code is redrawn to them. Save them to
`assets/reference/` (the game never loads them).

- **Hedgerows (bocage):**
  > Top-down view from directly above of Normandy bocage: dense hedgerows on earth banks
  > dividing small fields, clumps of bushes and a few trees along each hedge, a sunken lane
  > between two hedges. Simple bold shapes, like a symbol on a wargame map.
- **Woods:**
  > Top-down view from directly above of a small deciduous wood, tree crowns as rounded
  > clumps with a dark shadow side, a ragged edge where it meets the fields. Simple bold
  > shapes, like a symbol on a wargame map.
- **Orchard:**
  > Top-down view from directly above of an apple orchard in neat rows, round tree crowns
  > with small shadows, grass between. Simple bold shapes, like a symbol on a wargame map.

What helps most is a look to copy: how chunky the bushes are, how the shadow falls, how
dark the green is against the cream.


---

## Priority 10 — the explosion ✅ done (2026-09-27)

**Why:** the BOOM starburst is the game's big moment, and it is the flattest drawing on the
board.

| | |
|---|---|
| File | `assets/markers/marker-blast.png` (hooked up in M17: shown from a 400 × 400 copy; the full painting is kept as `marker-blast_original.png`) |
| Size | **1:1, 512 × 512 px**, PNG, **transparent background** |
| Shown at | About 110 px, stepped in over three frames, then gone (code does the timing). |
| Content | A comic-book explosion starburst, jagged spikes, red and yellow-cream with black ink outline and Ben-Day dots. **Leave the middle empty**: code sets BOOM! over it in the comic lettering (the stencil until M21), in ink with a paper outline and tipped 16° (M22). |

> Comic-book explosion starburst, jagged irregular spikes, bright red outer burst with a
> cream-yellow core, thick black ink outline, Ben-Day halftone dots, 1980s British war
> comic style, isolated on a transparent background, no text, empty centre.


---

## Priority 11 — the sounds (find, don't generate) ✅ done (supplied at M21c)

**Why:** since M10 the game has sound, but all eight are made in code and sound like it:
the paper and pencil are passable, the dog is a placeholder, and the crump, the
explosion (M11), the back page's bells (M12) and the gunfire (M13) want real recordings. Real ones are
found, not generated.

| | |
|---|---|
| Files | `assets/audio/paper-rustle.mp3`, `pencil-scratch.mp3`, `counter-snap.mp3`, `dog-distant.mp3`, `crump.mp3`, `explosion.mp3`, `church-bells.mp3`, `bell-toll.mp3`, `gunfire.mp3`, `silenced-shot.mp3`, `aircraft.mp3` (M15) — exactly these names; each replaces its placeholder on reload |
| Format | **MP3**, mono, 44.1 kHz, under 200 KB, trimmed with no silence at the start |
| Where | freesound.org with the **CC0** licence filter, or Pixabay's sound effects: both free to use with no credit needed |
| Feel | The table, not the battlefield (ART-ASSETS.md §9): a card counter put down on a wooden table, a page turned, a pencil note, a dog barking far across fields at night, a distant muffled explosion (the RAF's bombs) — and one from the battlefield, a demolition charge going off close by, big, with debris falling after (`explosion.mp3`, ~2 s). For the back page (M12): a village church's bells ringing a peal across the fields at dawn (`church-bells.mp3`, ~4–5 s, search "church bells peal distant"), and one low bell tolling slowly with an air-raid siren far off under it (`bell-toll.mp3`, ~5–6 s; if no single recording has both, a slow toll alone is fine) |

Lengths and when each is heard are in ART-ASSETS.md §9. Loudness is balanced in code.


---

## Priority 12 — the six in desert kit (the airfield) ✅ full portraits done (2026-09-30); chips optional

The same six men, dressed for the airfield (SPEC.md §13), on a desert-ochre background
instead of slate blue. Each loads the moment it is in the folder, and any one missing
falls back to his France portrait, so they can come in one at a time.

| | |
|---|---|
| Files | `assets/portraits/desert/portrait-<id>-full.png` × 6, and `portrait-<id>-chip.png` × 6 if the chips change too |
| ids | `holloway`, `fitch`, `vance`, `barrow`, `speers`, `nunn` |
| Size, format, framing | **Exactly as Priority 1 and 2** (full 4:5, 960 × 1200, opaque PNG; chip 1:1, 128 × 128, transparent) |
| Background | Flat **desert ochre**, the board's `#D2A85C` or a little paler, so the rail says "desert" at a glance |
| Code does | The same as for France. Send the PNGs; Claude makes the 480 × 600 JPEGs the game loads |

### Base prompt (all six)

> Head-and-shoulders portrait of a British airborne paratrooper, North Africa, winter
> 1942, at night. He wears the rimless steel paratrooper helmet with chin strap, painted
> sand-coloured and bare of foliage, and a faded Denison smock over khaki drill. Face
> lightly blackened with burnt cork, dust on the helmet rim. Three-quarter view, looking
> slightly off-camera, determined. Lit from one side by moonlight, with deep shadow on the
> other. Face centred, eyes about 40% down the frame, shoulders filling the bottom of the
> frame. Flat plain desert-ochre background. [PER-MAN DETAILS] [STYLE BLOCK]

### Per-man details

Keep each man's feature, but take the foliage out. Barrow's twig has no place in the desert, so
he gets a new one.

| id | Per-man details (paste into the prompt) | The one feature that must read |
|---|---|---|
| `holloway` | *As in France: sergeant, weathered, late thirties, square jaw, a thick dark moustache, chevrons on the sleeve.* | the moustache |
| `fitch` | *As in France: young, thin face, jug ears, freckles, lopsided grin, an unlit cigarette in the corner of his mouth.* | the cigarette |
| `vance` | *As in France, but the helmet scrim is plain sand-coloured hessian netting, no leaves; binoculars round his neck.* | the helmet net |
| `barrow` | *Young, lanky, big ears, open-mouthed half-laugh; a pair of dust goggles pushed up on the front of his helmet.* | the goggles (new) |
| `speers` | *As in France: broad face, dark stubble, a thin scar, a slate-blue scarf knotted at the throat, Bren sling.* | the scarf |
| `nunn` | *As in France: enormous build, thick neck, broken nose, placid and gentle expression.* | the sheer width |

**Check before accepting:** shrink to 56 × 70 px beside his France portrait. Same man?


---

## Priority 13 — the airfield's title card ✅ done (2026-09-30)

Supplied without the title painted in at first (`titleCardLettered: false`); since M31d (2026-10-01) the operator's revision has BURN BY DAWN painted in, so the code sets nothing over it.

Its own painting in place of France's, across the top of its orders and its back page.
Wired in M31: drop the file in and reload; until then the airfield shows France's card.
Say whether BURN BY DAWN is painted in: if not, Claude sets `titleCardLettered: false`.

| | |
|---|---|
| File | `assets/title/title-card-airfield.jpg` (keep your full-size original beside it as `title-card-airfield_full.jpg`) |
| Size, format | **Exactly as Priority 2b**: 4:1, 2400 × 600, JPEG quality about 85, sRGB, opaque |
| Composition | As France's: the middle 60% open and dark for the title, the action toward the left and right edges, the ground along the bottom fifth. With or without BURN BY DAWN painted in, but say which, since France's has it painted in |

### Prompt (add the style block)

> Wide panoramic night scene, winter 1942, a desert landing ground in Tunisia: a stick of
> British paratroopers coming down under round canopies over pale moonlit sand, a C-47
> Dakota flying away low, and along the bottom edge the dark silhouettes of parked
> German Ju 52 transports and Stuka dive-bombers in sandbagged pens, one already
> burning with a tall orange fire and black smoke. A low escarpment on the horizon, a
> sliver of moon. The centre of the picture is open dark night sky; the canopies and
> the aircraft are grouped toward the left and right edges. Deep slate-blue and ink
> night palette, with warm ochre sand and fire orange.


---

## Priority 14 — the contents page panels ✅ done (2026-09-30)

Wired in M31c at 150 × 100 beside each entry (120 × 80 since M60, so five fit); the game loads 480 × 320 copies, and your
1200 × 800 originals are kept beside them as `contents-<id>_full.jpg`.

One small painting per mission, beside its line on the contents page, so the page
reads as an annual's contents with a picture for each story. Make these whenever you
like. When the first two are in, Claude adds them to the contents page. Any mission
without one shows its line as now.

| | |
|---|---|
| Files | `assets/title/contents-france.jpg`, `assets/title/contents-airfield.jpg`, `assets/title/contents-aqueduct.jpg` (in since M41d) |
| Size | **3:2, 1200 × 800 px** (never below 600 × 400) |
| Format | JPEG, quality about 85, sRGB, opaque |
| Shown at | 120 × 80 px beside the entry, so it must read small: one clear subject, strong light and dark, like a single comic panel |
| Code does | The frame, the title, the page number and the NEXT YEAR'S ANNUAL stamp. No text in the picture |

### Prompt — the rail bridge (add the style block)

> A single comic-book panel, night, Normandy, June 1944: a steel girder railway bridge
> over a canal, seen from low on the bank, the moment its demolition charges go off,
> a huge orange blast in the middle span with girders twisting and flying, the
> silhouettes of two British paratroopers crouched in the reeds in the foreground
> looking back at it. Deep slate-blue night, fire orange. Strong simple shapes that
> read at thumbnail size.

### Prompt — the airfield (add the style block)

> A single comic-book panel, night, a desert landing ground in Tunisia, 1942: a British
> paratrooper in a sand-coloured helmet running low across the sand away from a parked
> Ju 52 transport that is erupting in flame behind him, its corrugated wing and three
> engines lit orange, sandbagged pen walls, black smoke against a starry sky. Warm
> ochre sand, deep night blue, fire orange. Strong simple shapes that read at thumbnail
> size.

### Prompt — the aqueduct (add the style block) ✅ done (2026-10-06)

Wired in M41d: the 1200 × 800 painting is kept as `contents-aqueduct_full.jpg` and the
game loads a 480 × 320 copy.

> A single comic-book panel, a cold winter night in the mountains of southern Italy,
> February 1941: a tall stone aqueduct of pale masonry arches spanning a rocky ravine,
> seen from low in the torrent's bed, the moment a demolition charge goes off at the
> foot of its middle pier, a huge orange blast, stone blocks flying and water bursting
> from the broken channel above. In the foreground the dark silhouettes of two British
> paratroopers in rimless jump helmets and smocks crouched among the boulders, one
> shielding his face. Bare hillsides with a dusting of snow, a few olive trees, a
> starry sky. Deep slate blue and cold grey, fire orange. Strong simple shapes that
> read at thumbnail size. No text.


---

## Priority 15 — the airfield's other paintings ✅ done (2026-09-30)

The jeep (its twin guns fire astern, so the flashes moved to its muzzles), the car's
counter (a 128 × 128 copy of your 512, kept as `counter-enemy-vehicle_full.png`), and
the Stuka, Ju 52 and trucks redrawn from your references in M31c.

Each has a drawn stand-in that works now. In the order they buy the most.

**The jeep** (the airfield's diversion, a jeep raid on the north wire). Wired: drop it in
and reload.

| | |
|---|---|
| File | `assets/vehicles/vehicle-jeep.png` |
| Size, format | **1:1, 512 × 512 px**, PNG, **transparent background** |
| View | **Straight down from above, nose pointing right (east)**, about 80% of the width long. Twin Vickers K guns on a pintle over its **left** side (the top of the picture), muzzles at about (325, 110) and (155, 160): the drawn muzzle flashes blink there |
| Shown at | About 40 px on screen, driving across the top of the board for 3½ seconds |

> Top-down view from directly above of a WW2 British SAS jeep, painted pale desert sand,
> nose pointing to the right, two soldiers in sand-coloured helmets seated, jerrycans and a
> spare wheel strapped on the back, twin Vickers machine guns on a pintle mount pointing
> out over the left side, isolated on a plain transparent background, no shadow, no
> ground.

**The perimeter car's counter.** Wired since M29: `assets/enemies/counter-enemy-vehicle.png`,
exactly as Priority 7 (1:1, 128 × 128, transparent, shown about 20 px). A Kübelwagen from
the side, two coal-scuttle helmets aboard, same painter and light as the three you made.

> Counter icon for a board game, a WW2 German Kübelwagen field car seen from the side, two
> soldiers in Stahlhelm helmets aboard, sand-coloured, simple bold shapes that read at
> thumbnail size, isolated on a plain transparent background, no text, no insignia.

**Reference art for the aircraft and the trucks (for Claude to redraw, not dropped in).**
As Priority 5: the board's pictures stay SVG, since they are recoloured, burnt out and
drawn at 30–90 px, so a painting would be a blur. One picture each of a **Ju 87 Stuka
from directly above**, a **Ju 52 from directly above** (three engines, corrugated wing),
and **two Bedford-style desert lorries with camouflage netting**, into `assets/reference/`
as `Stuka_Reference_01.jpeg`, `Ju52_Reference_01.jpeg`, `Trucks_Reference_01.jpeg`. Claude
redraws the board's pictures from them, as it did the bridge and the exchange.


---

## Priority 16 — the airfield's sounds ✅ done (2026-09-30)

Found, cut and levelled by Claude in M31c (`assets/audio/README.md`): a 1965 Jeep CJ-5
going by, a drum-roll-and-trumpet fanfare for the win (not a lone bugle), and a WW2 air-raid
siren. Swap any of them by dropping in a file of the same name.

Made in code now, and they sound like it. As Priority 11: freesound.org (CC0) or
Pixabay, into `assets/audio/` by these names; each replaces its made sound on reload.
Claude can find, cut and level them as it did in M21c, if asked.

| File | What | Length |
|---|---|---|
| `jeep.m4a` / `.mp3` | a jeep or light car going past fast, engine revving, gravel | ~3 s |
| `bugle.m4a` / `.mp3` | a bugle call, bright and rising, a held top note to finish: a win, not a Last Post | ~2–3 s |
| `siren.m4a` / `.mp3` | an air-raid siren close by, up, wailing, down | ~5–6 s |


---

## Priority 19 — Italian enemy counters for the aqueduct ✅ done (2026-10-05)

In since M43b, as supplied: the aqueduct's sentries, patrols and reserve wear them.

**Why** (M41c, the operator's): the aqueduct is southern Italy in February 1941, and its
garrison is Italian (its cries already are: ALLARME!), but the chips are Priority 7's
Germans in coal-scuttle helmets. Three new chips, the same painter, light and scale of
head as those, so the two sets could come from one box.

| | |
|---|---|
| Files | `assets/enemies/italian/counter-enemy-sentry.png`, `counter-enemy-patrol.png`, `counter-enemy-reserve.png` |
| Size | **1:1, 128 × 128 px** |
| Format | PNG, 8-bit sRGB, **transparent background** |
| Shown at | About **20 px**, inside the black clipped-corner counter. It must read at a glance as *not the German chip* and as *which kind* |
| Tell them apart | Sentry: **one** man. Patrol: **two** heads side by side. Reserve squad: **three** heads and a Breda machine-gun barrel across the front |
| What makes it Italian at 20 px | The **M33 helmet**: a smooth round bowl with a short even brim, no flared neck guard (the Stahlhelm's is its whole silhouette). Grey-green uniform, lighter than feldgrau, a cape or greatcoat collar. For one of the three, the **Bersaglieri's cockerel-feather plume** on the helmet's right side would read best of all |
| Code does | **Wired in M43**: drop a file into `assets/enemies/italian/` and reload. Each type that has no file there yet keeps its German chip, so they can come in one at a time. The frame, the red strip and its name, the facing arrow and the marks are code's, as for Priority 7 |

### Prompt (add the style block)

> Counter icon for a board game, head and shoulders of a WW2 Italian Army soldier of
> 1941 in a smooth round M33 steel helmet with a short brim, seen from the front, grim,
> shadowed eyes under the rim, grey-green greatcoat collar, simple bold shapes that
> read at thumbnail size, isolated on a plain transparent background, no text, no
> insignia, no symbols.

For the patrol and the reserve, ask for *two* / *three soldiers' helmeted heads close
together, overlapping*, and for the reserve add *a Breda machine-gun barrel across the
front*. For a plumed one add *a spray of black cockerel feathers on the right side of
the helmet*. **No fasces or other party insignia**, as with Priority 7.


---

## Priority 20 — the aqueduct's title card ✅ done (2026-10-05)

In since M43b, with BURN BY DAWN painted in. The 2400 × 600 painting is kept as
`title-card-aqueduct_full.jpg` and the game loads a 1600 × 400 copy.

Its own painting in place of France's, across the top of its orders and its back page.
Wired in M43: drop the file in and reload; until then the aqueduct shows France's card.
Say whether BURN BY DAWN is painted in: if not, Claude sets `titleCardLettered: false`.

| | |
|---|---|
| File | `assets/title/title-card-aqueduct.jpg` (keep your full-size original beside it as `title-card-aqueduct_full.jpg`; Claude makes the 1600 × 400 copy the game loads) |
| Size, format | **Exactly as Priority 2b**: 4:1, 2400 × 600, JPEG quality about 85, sRGB, opaque |
| Composition | As France's: the middle 60% open and dark for the title, the action toward the left and right edges, the ground along the bottom fifth |

### Prompt (add the style block)

> Wide panoramic night scene, February 1941, the mountains of southern Italy: a stick of
> British paratroopers coming down under round canopies over bare moonlit hillsides
> dusted with snow, an Armstrong Whitworth Whitley bomber flying away low, and among the
> canopies two or three long cylindrical supply containers on smaller coloured
> parachutes. Along the bottom edge a tall stone aqueduct of pale masonry arches
> crossing a rocky ravine, stone-walled terraces and a few olive trees, and far off on
> the right a sliver of dark sea. A cold clear sky with a low moon. The centre of the
> picture is open dark night sky; the canopies and the aircraft are grouped toward the
> left and right edges. Deep slate-blue and cold grey night palette, cream moonlight on
> the canopies and the stone.

The aircraft is a Whitley here, not a Dakota: the 1941 raid flew in them (twin engines,
a long slab-sided fuselage, twin fins). The board's own aircraft stays the Dakota.


---

## Priority 22 — reference art for the aqueduct's board (for Claude to redraw) ✅ done (2026-10-16)

Supplied by the operator (`assets/reference/`, all six; no blown aqueduct, so Claude drew
that from the whole one) and redrawn in code at M50.

As Priorities 5, 9 and 15: the board's pictures stay SVG, since they are recoloured,
blown up and drawn at 30 to 90 px, so these are **references**, the look to match, and
Claude redraws the code's first drawings (M41) from them. Into `assets/reference/`
(the game never loads them). In the order they buy the most:

| File | Spec |
|---|---|
| `Aqueduct_Reference_01` | **The one that matters.** Seen from the south and a little above, wide (about 5:1): a stone aqueduct of pale masonry, six tall arches on square piers, the open water channel along the top, crossing a ravine with a torrent under the middle arches. And if you can, the same view **blown**: two middle piers down, the channel broken and water pouring from both ends |
| `RoadBridge_Reference_01` | From directly above: a small single-arch stone road bridge over a torrent in a rocky bed, a dirt road running on from each end |
| `Boat_Reference_01` | From directly above, bow to the left: a Royal Navy ship's boat (a whaler or a folding canvas boat from a submarine), two or three thwarts, oars shipped along the sides, one sailor at the tiller with a hooded lamp |
| `Canister_Reference_01` | From above, lying on the ground: a 1941 airborne supply container, a long steel cylinder in dark green with carrying handles and a band or two, its small parachute spilled beside it |
| `Terraces_Reference_01` | From directly above: a hillside cut into stone-walled terraces, the dry-stone walls as curving parallel lines, bare winter earth and a few vines or stakes between |
| `OliveGrove_Reference_01` | From directly above: an olive grove in winter, grey-green crowns smaller and more ragged than an apple orchard's, widely spaced on bare stony ground |

### Prompts (add the style block to each)

- **The aqueduct:**
  > A tall stone aqueduct in the mountains of southern Italy seen from the south and a
  > little above, wide panoramic view: pale masonry, six tall round arches on square
  > piers, an open water channel along the top, crossing a rocky ravine with a torrent
  > running under the middle arches, bare winter hillside either side. Simple bold
  > shapes, like a symbol on a wargame map.
- **The road bridge:**
  > Top-down view from directly above of a small single-arch stone road bridge carrying
  > a dirt road over a mountain torrent in a rocky bed. Simple bold shapes, like a
  > symbol on a wargame map.
- **The boat:**
  > Top-down view from directly above of a small wooden ship's boat on dark water, bow
  > pointing left, oars laid along the thwarts, one sailor in a duffel coat at the
  > tiller holding a hooded lamp, isolated, no shore.
- **The canister:**
  > Top-down view of a WW2 British airborne supply container lying on stony ground: a
  > long dark green steel cylinder with carrying handles and two bands, a small
  > collapsed parachute and its lines spilled beside it.
- **Terraces:**
  > Top-down view from directly above of a southern Italian hillside in winter cut into
  > narrow terraces, curving dry-stone walls in parallel lines, bare earth between.
  > Simple bold shapes, like a symbol on a wargame map.
- **Olive grove:**
  > Top-down view from directly above of an olive grove in winter, small ragged
  > grey-green tree crowns with dark shadows, widely spaced on pale stony ground.
  > Simple bold shapes, like a symbol on a wargame map.


---

## Priority 23 — the aqueduct's sounds ✅ done (2026-10-14)

Supplied by the operator and in since M48h (cut and levelled by Claude, `assets/audio/README.md`).

Made in code since M43, and they sound like it. As Priorities 11 and 16:
freesound.org (CC0) or Pixabay, into `assets/audio/` by these names; each replaces its
made sound on reload. Claude can find, cut and level them, as it did the others, if
asked.

| File | What | Length |
|---|---|---|
| `canister-thump.m4a` / `.mp3` | a steel drum or heavy metal container dropped onto hard ground once: a dull thud with a short clank, no ringing on | ~0.3 s |
| `oars.m4a` / `.mp3` | a rowing boat, three or four strokes: rowlocks creaking, blades dipping and pulling, no voices, no gulls | ~3 s |
| `surf.m4a` / `.mp3` | one small wave breaking on a shingle beach at night and dragging back down the stones | ~2.5 s |

**The back page** rings France's church bells for a win here and tolls its bell for the
rest, which suits an Italian hill village well enough. If you would rather it had its
own, as the airfield has its bugle and siren, say what (a ship's bell and the
submarine's klaxon? a Whitley going home?) and Claude will wire the two cues.


---

## Priority 24 — umpire counters for the practice ground ✅ done (2026-10-14)

Painted by the operator and in at M48h: the sentry and the patrol. The drawn umpires stay as the fallback.

**Why** (M48g): the course's garrison is umpires, not Germans. Code now draws them (a
peaked cap, a white armband); paintings would sit better beside the six's portraits.
Paint them as Priority 7's and 19's were, the same painter, light and scale of head, so
the three sets could come from one box. At 20 px the **cap** is what tells an umpire
from a German: make its peak and flat crown the clearest shape in the chip, and the
**white armband** the brightest thing in it.

| | |
|---|---|
| Files | `assets/enemies/umpire/counter-enemy-sentry.png`, `counter-enemy-patrol.png` (the course uses no reserve squad) |
| Size | **1:1, 128 × 128 px**, PNG, 8-bit sRGB, **transparent background** |
| Shown at | About **20 px**, inside the black clipped-corner counter |
| Tell them apart | Sentry: **one** man. Patrol: **two** heads side by side |
| What makes it an umpire at 20 px | A British **peaked service cap** (no helmet), khaki battledress, and a broad **white armband** on the upper arm. A whistle on a lanyard if it reads. No weapon |
| Code does | **Wired in M48g**: drop a file into `assets/enemies/umpire/` and reload; a type with no file keeps the drawn umpire |

### Prompt — the sentry, `counter-enemy-sentry.png` (add the style block)

> Counter icon for a board game, head and shoulders of a 1941 British Army sergeant
> instructor acting as an exercise umpire, seen from the front and a little to one
> side, a khaki peaked service cap with a flat crown and a stiff shiny peak pulled low,
> a clipped moustache, stern but not hostile, khaki battledress blouse, a broad plain
> white armband round his left upper arm, a whistle on a lanyard at his chest, no
> rifle, simple bold shapes that read at thumbnail size, isolated on a plain
> transparent background, no text, no insignia, no symbols.

### Prompt — the patrol, `counter-enemy-patrol.png` (add the style block)

> Counter icon for a board game, two 1941 British Army exercise umpires walking
> together, heads and shoulders close and overlapping, the nearer one a little lower
> and larger, both in khaki peaked service caps with flat crowns and shiny peaks,
> khaki battledress, each with a broad plain white armband on the upper arm, one
> holding a clipboard, no rifles, simple bold shapes that read at thumbnail size,
> isolated on a plain transparent background, no text, no insignia, no symbols.

The course has no reserve squad, so no third chip is needed. **No regimental badges or
lettering on the armbands**: a cap badge is a dot at 20 px, and plain white reads best.


---

## Priority 25 — the practice ground's contents panel and title card ✅ done (2026-10-17)

In since M52, BURN BY DAWN painted in; the panel repainted by the operator in M54. Kept as
`contents-training_full.jpg` (1200 × 800; the game's copy is it at 480 × 320) and `title-card-training_full.jpg`
(2400 × 600; the game loads 1600 × 400), its watermark painted out by the operator.


**Why** (M48g): the course is first on the contents page and is the only line there
with no small painting beside it; and its orders open under France's title card.

| | |
|---|---|
| Panel | `assets/title/contents-training.jpg`, the same size and crop as the other three (Priority 14): parachutists coming down over an English park by day, a hall and a lake behind |
| Title card | `assets/title/title-card-training.jpg`, as Priority 13 and 20, 4:1 |
| Code does | Tell Claude when either is in: each is one line in `data/missions.json` (`panel`, `titleCard`) |

The title card, sized and laid out **exactly as Priority 20** (4:1, 2400 × 600, the middle
60% open for the title, the action toward the edges, the ground along the bottom fifth).
Say whether BURN BY DAWN is painted in.

### Title card prompt (add the style block)

> Wide panoramic daytime scene, summer 1941, Tatton Park in Cheshire: British parachute
> trainees in pale smocks and padded jump helmets coming down under round white
> canopies over open parkland, an Armstrong Whitworth Whitley flying away low on the
> left, and on the right a grey barrage balloon tethered on its cable with a small
> square jumping cage slung under it. Along the bottom edge a wide lawn with a few
> great oaks, a stone country hall and a long lake in the distance, and two or three
> instructors watching from beside a lorry with a windsock. A pale washed-blue English
> sky with high cloud. The centre of the picture is open sky; the canopies, the aircraft
> and the balloon are grouped toward the left and right edges. Soft greens and cream,
> the canopies bright against the sky.

The balloon and the Whitley are both true to No. 1 Parachute Training School, which
dropped its pupils over Tatton from each.


---

## Priority 26 — the course's clipboard ✅ done (2026-10-14)

`assets/course/clipboard.png`, 536 × 714, supplied by the operator and in since M48j
(ART-ASSETS.md §7): a wooden clipboard from straight above, a steel clip in the top
12%, blank cream paper. Code sets the training record and the PASSED OUT stamp on its paper.


---

## Priority 27 — the signals tent (reference, for Claude to redraw) ✅ done (2026-10-15)

In as `assets/reference/SignalsTest_Reference_01.jpeg`; the tent was redrawn after it in M49b,
mirrored so its mast stands east, toward the charge points.

**Why** (M49b, the operator's): the airfield's signals tent is drawn in code
(`objective-signals-tent`, ART-ASSETS.md §5) and is the weakest of its targets beside the
painted-from-reference Stukas, Ju 52s and trucks. A reference lets Claude redraw it, as
`Stuka_` and `Ju52_Reference_01` were for the aircraft. It is not dropped in: it needs
its cut and destroyed states and the wires to its mast drawn to match.

| File | Spec |
|---|---|
| `assets/reference/SignalsTent_Reference_01` | seen from straight above or a steep three-quarter view, about square, any size; the same desert tan and dark green as the aircraft |
| Code does | Tell Claude when it is in: the tent is redrawn in theme.js (`signalsTent`), with its cut and blown states and the mast's crossarm where the wires end |

### Prompt (add the style block)

> A Luftwaffe signals tent at a North African desert airfield, 1942, seen from directly
> overhead: a large tan canvas marquee with guy ropes and pegs, a tall wireless mast
> beside it with a crossarm, field-telephone wires running in on short poles, a low
> sandbag wall along one side, a lit doorway, a field radio set on a trestle table,
> bare sand around it.


---

## Priority 28 — comic panels: the landing, one per mission ✅ done (2026-10-17)

In since M52, all three, and the panels kept in the game for everyone (the operator's).
Kept as `panel-landing-<id>_full.jpg`; the game loads 900 × 600 copies.


**Why** (M52, the operator's): to try comic-book punctuation at the story's big moments,
the picture popping up over the board as if the page had turned in a graphic novel, and
see whether it is worth a phase of its own (ROADMAP.md, Parked). Two moments are wired,
now in the game for everyone:

- **Mission accomplished**: the mission's own contents panel (Priority 14), already
  painted. Nothing to make.
- **The landing**: the moment after the jump, before turn 1. **These three are to make.**

| | |
|---|---|
| Files | `assets/panels/panel-landing-france.jpg`, `panel-landing-airfield.jpg`, `panel-landing-aqueduct.jpg` |
| Size, format | **As the contents panels**: 3:2, **1200 × 800**, JPEG quality about 85, sRGB, opaque |
| Shown at | About 550 × 370, over the board, tipped a couple of degrees in a thick ink frame the code draws |
| Composition | One clear moment, close and dramatic, like a single panel of a comic, not a landscape. **Keep the top-left quarter quiet** (sky or dark ground): the caption box sits over it |
| Code does | Claude makes the 900 × 600 copy the game loads; the original is kept as `_full` |

The panel is seen for a second or two before a click, so it must read at a glance: one
figure, one action, strong light against dark. Paste the style block after each.

### Prompt — France, `panel-landing-france.jpg`

> A single comic-book panel, night, Normandy, June 1944, seen from low down and close:
> a British paratrooper in a rimless steel helmet and a camouflaged Denison smock hits
> the ground in a wet hayfield and rolls on his shoulder, Sten gun strapped to his
> chest, kitbag on its line beside him, his round parachute collapsing in great pale
> folds behind him. A dark hedgerow along the field's edge, and far off on the right
> the black girders of a railway bridge against a moonlit sky. Cold slate-blue night,
> cream moonlight on the canopy and his face, dew flying from the grass. The top-left
> of the picture is open dark sky.

### Prompt — the airfield, `panel-landing-airfield.jpg`

> A single comic-book panel, night, a desert landing ground in Tunisia, 1942, seen from
> low down and close: a British paratrooper in a rimless steel helmet and khaki drill,
> sleeves rolled, lands hard in soft sand and stones and goes down on one knee, his
> round parachute dragging and spilling behind him in the wind, a spray of sand off his
> boots. Low scrub and a dry wadi bank beside him, and far off on the right the
> silhouette of a Stuka's bent wing and a few dim lights of an airfield. A huge starry
> sky, cold blue night over pale ochre sand. The top-left of the picture is open sky.

### Prompt — the aqueduct, `panel-landing-aqueduct.jpg`

> A single comic-book panel, a cold winter night in the mountains of southern Italy,
> February 1941, seen from low down and close: a British paratrooper in a padded cloth
> jump helmet and a plain jump jacket lands on a snow-dusted terraced hillside between
> olive trees and stumbles forward, breath steaming, his round parachute caught and
> collapsing on a dry-stone terrace wall behind him. Beside him a long cylindrical
> supply container lies half in the snow, its own small parachute trailing. Far off on
> the right, the pale arches of a stone aqueduct cross a ravine under a low moon. Deep
> slate-blue and cold grey night, cream moonlight on the snow and the canopy. The
> top-left of the picture is open dark sky.

If a generator puts a second man in, that is fine; if it puts in a face that is clearly
one of the six (Dutch's moustache, Fitch's cigarette), even better, but it is not asked
for: whoever lands first is different every game.


---

## Priority 29 — the title painting (the opening page) ✅ done (2026-10-18)

In since M55: the painting is kept as `title-painting_full.jpg` and the game loads a
1600 × 1000 copy.

**Why** (M55, the operator's): the opening page, BURN BY DAWN and "click or press any
key", was a plain dark table. A painting behind it sets the night before the first click.
One painting for the whole game: this page comes before any mission is picked.

| | |
|---|---|
| File | `assets/title/title-painting.jpg` |
| Size, format | **16:10, 2400 × 1500**, JPEG quality about 85, sRGB, opaque, **no text** |
| Shown at | The whole window, cropped to fill it (a wider window loses a little top and bottom, a squarer one a little of each side), under a dark shade so the words read |
| Composition | **Keep the middle band clear and dark**: roughly the central half of the width, from 35% to 65% of the height. Code sets BURN BY DAWN, the fuse and the "click" line there. Put the men in the lower third and keep everything that matters inside the central 80% of the width, so no crop cuts a man in half |
| Code does | Claude makes a 1600 × 1000 copy at quality 85 for the game to load; the original is kept as `title-painting_full.jpg`. It fades up behind the title as soon as it has loaded |

### Prompt (add the style block)

> A wide night scene, Normandy, 1944: six British paratroopers in single file walk along
> the crest of a low hedged ridge, seen from below and far off as pure black silhouettes
> against a huge moonlit sky. Rimless steel helmets, rifles and a Bren gun slung, kitbags
> and charges on their backs, the leading man pointing ahead. A big pale moon low on the
> right, thin cloud, a few far-off parachute canopies drifting down in the distance on
> the left. The men and the ridge fill only the bottom third of the picture; above them
> is open, dark, empty slate-blue sky. Cold slate blue and near-black, a little cream
> moonlight on the cloud edges.

If the generator puts the men too big or too high, crop or extend the canvas downward:
the sky above them is where the title goes.

---

## Priority 30 — the Dakota panel (before the drop) ✅ done (2026-10-19)

In since M60b: kept as `panel-dakota_full.jpg`; the game loads a 900 × 600 copy. It shows
in every mission without its own, Gunnerside too until its Halifax (31c) is in.

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

## Priority 31 — the heavy water plant's paintings (Gunnerside) ✅ done (2026-10-25)

All four in: the contents panel and title card at M60, the Halifax and landing panels at
M60c, each kept as `_full` beside the game's copy.

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
| 31c ✅ in (M60c) | `assets/panels/panel-dakota-gunnerside.jpg` | **As Priority 30**: 3:2, 1200 × 800, JPEG ~85, no text | After START GAME, before the run is picked. **Top-left quarter quiet**: the caption sits there | Claude makes the 900 × 600 copy; original kept as `_full`. Until it is in, the shared Dakota panel shows (once that is painted) |
| 31d ✅ in (M60c) | `assets/panels/panel-landing-gunnerside.jpg` | **As Priority 28**: 3:2, 1200 × 800, JPEG ~85, no text | After the jump, before turn 1. **Top-left quarter quiet** | As 31c |

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
