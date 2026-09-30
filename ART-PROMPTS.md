# BURN BY DAWN — Art to generate next

A shopping list for an image generator, in priority order. Each entry has the file it
becomes, the exact size and format, where it shows in the game, and a prompt.

`ART-ASSETS.md` is the full manifest and still rules on formats. This file covers only
what is worth generating **now**, after the M7b clean-up, and which pieces the code draws
itself, so nobody makes those twice.

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

## Priority 11 — the sounds (find, don't generate)

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

## Priority 13 — the airfield's title card · ready to make now

Its own painting in place of France's, across the top of its orders and its back page.
Wired in M31, when the airfield becomes playable.

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

## Priority 14 — the contents page panels · specs only, not wired yet

One small painting per mission, beside its line on the contents page, so the page
reads as an annual's contents with a picture for each story. Make these whenever you
like. When the first two are in, Claude adds them to the contents page. Any mission
without one shows its line as now.

| | |
|---|---|
| Files | `assets/title/contents-france.jpg`, `assets/title/contents-airfield.jpg` (later `contents-aqueduct.jpg`) |
| Size | **3:2, 1200 × 800 px** (never below 600 × 400) |
| Format | JPEG, quality about 85, sRGB, opaque |
| Shown at | About 180 × 120 px beside the entry, so it must read small: one clear subject, strong light and dark, like a single comic panel |
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

- The C-47 Dakota silhouette for the drop fly-by (until `aircraft-dakota.png` is
  supplied), and the opening, drifting and collapsing parachute canopies.
- The soft drop shadow under counters.
- The counter markers (spotted, wounded, hidden, and since M11 the leader-blue orders
  chevron on a man who has the leader's +AP this turn).
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
  aircraft from above, four Ju 87 Stukas and four Ju 52s, intact and burnt out; the fuel
  bowser alone on the apron; the signals tent with its wireless mast and field-telephone
  wires, standing, cut and blown; the two trucks waiting at the rendezvous with the green
  lamp; and the perimeter car's counter, a Kübelwagen with two helmets aboard. The
  airfield's own title card (`titleCard` in data/missions.json) is France's until the
  operator paints one; M31 lists it with the other paintings the airfield wants.
