# NIGHT DROP — Art to generate next

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

## Priority 1 — the six full portraits

**Why first:** the roster rail shows all six all the time. They're the emotional payload
of the design (SPEC.md §11), and today they're the weakest drawn art in the game.

| | |
|---|---|
| Files | `assets/portraits/portrait-<id>-full.png` × 6 |
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

## Priority 2 — the six counter chips

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

## Priority 3 — the paper

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

## Priority 4 — a lettering font (choose, don't generate)

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

## Priority 5 — objective reference art (for tracing, not dropping in)

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

## Later — once level design has settled

Not worth making yet. The map and layout will still change.

| Asset | Spec | Prompt starter |
|---|---|---|
| `paper-crease.png` | 400 × 1800, alpha | *Vertical centre-fold crease of an open comic annual, soft shadow and highlight, isolated on transparency.* |
| `paper-edge-wear.png` | 2560 × 1600, alpha | *Overlay of aged paper edge browning and corner foxing on transparency, centre fully clear.* |
| `logo-night-drop.svg` | 800 × 300, SVG | Generate a raster rough to trace: *Masthead lettering "NIGHT DROP" in the style of a 1980s British war comic title, bold condensed slab capitals with a hard offset shadow, parachute silhouette.* This is the one prompt where text is the point. Expect to redraw the letters by hand. |
| Audio | see ART-ASSETS.md §9 | — |

---

## What Claude is drawing in code (don't generate these)

These are part of M7b and are made as SVG in `src/render/theme.js`:

- The C-47 Dakota silhouette for the drop fly-by, and the opening, drifting and
  collapsing parachute canopies.
- The soft drop shadow under counters.
- Continuous roads, hedges and the railway line.
- Woods, orchards, marsh and the ridge as shapes across hexes, and their motifs.
- Place names on the map (they are type, set from `data/map.json`).
- The green counter frames, their AP figure and card edge.
- Redrawn fuel dump, telephone exchange and rail bridge, at the new, lower level of detail.
- Improved drawn portraits and chips: the fallback when no PNG is supplied.
