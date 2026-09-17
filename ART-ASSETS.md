# NIGHT DROP — Art asset manifest

Everything you need to supply, and the format it must be in. Procedural placeholders exist
from M0; these replace them at M7 without touching game logic.

Board geometry, for reference: pointy-top hexes, circumradius **46px**, so each hex is
**80px wide x 92px tall**. Board is 18 x 13 hexes.

---

## Universal format rules

Read these before drawing anything. They are what make the swap painless.

**SVG (default for everything that is a shape)**
- Export with a `viewBox`, and **strip `width`/`height` attributes**. The game scales them.
- **No hardcoded colours.** Use CSS classes only: `.ink`, `.paper`, `.green`, `.red`,
  `.blue`, and `.leader` for the ranking man's marks only (see the leader counter below).
  The palette lives in `theme.js` and must stay tunable.
- **Do not bake in the halftone.** Fills get the halftone `<pattern>` applied in code so
  density can be tuned per element.
- **Do not bake in the misregistration.** The 0.5px colour offset is applied in code.
- Flatten transforms. No SVG filters (slow at this element count). No embedded raster.
- **Prefix every `id` with the asset name** (`wood01-leaf-a`). Symbols get injected into
  one document and colliding ids are a genuinely annoying bug to trace.
- Run through SVGO but preserve `viewBox` and `id`s.

**PNG (only for genuine texture)**
- 8-bit, sRGB, alpha where stated.
- Supply at 2x the stated size for retina.
- Greyscale textures: keep them low contrast. They are composited as multiply at low
  opacity; anything punchy will fight the art.

**Naming:** kebab-case, category prefix, two-digit variant. `terrain-wood-01.svg`,
`portrait-holloway-full.svg`. Drop into `/assets/<category>/`.

---

## 1. Paper substrate — PNG

| Asset | Size | Notes |
|---|---|---|
| `paper-fibre.png` | 2048x2048, seamless tile | greyscale + alpha, low contrast. The base grain under everything. |
| `paper-crease.png` | 400x1800, alpha | vertical centre-fold shadow and highlight for the gutter |
| `paper-edge-wear.png` | 2560x1600, alpha | corner foxing, edge browning, one overlay across the whole spread |
| `paper-marks-01..03.png` | 300x300, alpha | optional: coffee ring, thumbprint, biro doodle. Three is plenty. |

Optional: `halftone-dots.png`, 512x512 seamless, if you want scanned dots rather than the
procedural SVG pattern. Supply at 2x and it will be used as a pattern fill.

---

## 2. The six — SVG

Each character needs **two** drawings. A portrait drawn for the roster rail will turn to
mud at counter size, so don't try to make one asset do both.

| Asset | viewBox | Notes |
|---|---|---|
| `portrait-<name>-full.svg` x6 | 240 x 300 | roster rail. Head and shoulders, pulp comic linework. Needs a greyed-out state — supply as one file, code handles desaturation. |
| `portrait-<name>-chip.svg` x6 | 32 x 32 | on the counter. Silhouette-level simplicity. Helmet shape, one distinguishing feature. Must read at 32px on a busy map. |

Names: holloway, fitch, vance, barrow, speers, nunn.

---

## 3. Counters and symbols — SVG

| Asset | viewBox | Notes |
|---|---|---|
| `counter-frame-allied.svg` | 56 x 56 | die-cut rounded square, name strip along the bottom |
| `counter-frame-allied-leader.svg` | 56 x 56 | the ranking man. Same die-cut silhouette as above so the two read as one set — distinguish it by the name strip and a rank flash, not by a different shape. Strip and rank flash use `.leader` |
| `counter-frame-enemy.svg` | 56 x 56 | visually distinct at a glance, not just recoloured |
| `symbol-sapper.svg` | 24 x 24 | detonator plunger or satchel |
| `symbol-scout.svg` | 24 x 24 | binoculars |
| `symbol-gunner.svg` | 24 x 24 | Bren |
| `counter-enemy-sentry.svg` | 56 x 56 | static post |
| `counter-enemy-patrol.svg` | 56 x 56 | foot patrol |
| `counter-enemy-vehicle.svg` | 56 x 56 | Kübelwagen or motorcycle |
| `counter-enemy-reserve.svg` | 56 x 56 | the reserve squad, arrives at Alarmed |

Counters are 56px inside an 80px hex, so the hex edge stays visible underneath. Design the
drop shadow as part of the frame, angled consistently (I'd suggest down-right, 2px, hard
edged — a cardboard chit, not a soft UI shadow).

---

## 4. Terrain motifs — SVG

One per type, drawn to sit inside a single hex. **Three variants each** for the four types
that cover large areas, or the map will look rubber-stamped.

| Asset | viewBox | Variants |
|---|---|---|
| `terrain-field-01..03.svg` | 80 x 92 | 3 |
| `terrain-hedgerow-01..03.svg` | 80 x 92 | 3 |
| `terrain-wood-01..03.svg` | 80 x 92 | 3 |
| `terrain-orchard-01..03.svg` | 80 x 92 | 3 |
| `terrain-track.svg` | 80 x 92 | 1 + needs 3 rotations, code handles rotation |
| `terrain-marsh.svg` | 80 x 92 | 1 |
| `terrain-canal.svg` | 80 x 92 | 1 + edge pieces |
| `terrain-ridge.svg` | 80 x 92 | 1 |
| `terrain-farmhouse.svg` | 80 x 92 | 1 |
| `terrain-emplacement.svg` | 80 x 92 | 1 |

Track and canal need to read as continuous across hexes. Simplest approach: draw the motif
running edge-to-edge through the hex centre and let code rotate it to match neighbours.

---

## 5. Objectives — SVG, multi-hex

These span several hexes and sit as overlays above the terrain layer.

| Asset | viewBox | Notes |
|---|---|---|
| `objective-rail-bridge.svg` | 280 x 92 | 3 hexes wide, spanning the canal |
| `objective-bridge-destroyed.svg` | 280 x 92 | collapsed span, same footprint |
| `objective-exchange.svg` | 160 x 184 | 2x2 hex village building, telephone poles |
| `objective-exchange-destroyed.svg` | 160 x 184 | |
| `objective-fuel-dump.svg` | 240 x 184 | drums, tank laager, tarpaulins |
| `objective-fuel-destroyed.svg` | 240 x 184 | |
| `objective-rally-point.svg` | 80 x 92 | the exfil barn or field |
| `landmark-church.svg` | 80 x 92 | village church with a spire, drawn over one farmhouse hex near the exchange. Art only, no rule (SPEC.md §11). |

---

## 6. Markers and state tokens — SVG

Small, and they sit on top of counters, so they must read against a busy background.

| Asset | viewBox |
|---|---|
| `marker-charge.svg` | 28 x 28 |
| `marker-parachute.svg` | 28 x 28 (an abandoned canopy, §9 — must read as spent kit on the ground, not as a chute in the air) |
| `marker-fuse-1..5.svg` | 28 x 28 (five number tokens, hand-inked digits) |
| `marker-wounded.svg` | 28 x 28 |
| `marker-suppressed.svg` | 28 x 28 |
| `marker-spotted.svg` | 28 x 28 |
| `marker-hidden.svg` | 28 x 28 (a trooper gone to ground, SPEC.md §4 Hide) |
| `marker-body.svg` | 28 x 28 (a fallen trooper left on the ground, SPEC.md §5 — reads as a loss, not as an objective) |
| `marker-blast.svg` | 200 x 200 (comic starburst, one frame, code does the stepped reveal) |
| `stamp-destroyed.svg` | 200 x 80 (red rubber stamp, rotated in code) |

---

## 7. UI chrome — SVG

| Asset | viewBox | Notes |
|---|---|---|
| `ui-caption-box.svg` | 400 x 120 | comic caption frame. **Must stretch** — supply as 9-slice, i.e. corners and edges as separate paths, or keep the border a simple enough shape that code can redraw it. |
| `ui-speech-bubble.svg` | 240 x 120 | same stretching requirement, plus a separate tail path so it can point in any direction |
| `ui-alert-dial.svg` | 240 x 240 | face only, with tick marks for Calm / Suspicious / Alert / Alarmed |
| `ui-alert-needle.svg` | 20 x 120 | separate, rotated in code |
| `ui-dawn-strip.svg` | 600 x 60 | the 20-turn clock. Consider a burning fuse or a lightening sky bar. |
| `ui-button.svg` | 160 x 48 | stretchable |
| `ui-gutter-note.svg` | 60 x 900 | the "CUT OUT AND PLAY" margin text, as outlines |
| `logo-night-drop.svg` | 800 x 300 | masthead for the title and results page |

---

## 8. Type

No comic lettering: the annual look is carried by print, paper and colour (SPEC.md §11).

- **Body, captions, speech bubbles, numbers and UI:** a typewriter Courier. `Courier 10
  Pitch` if supplied, falling back to `Courier New`, `Courier`, `monospace`, which ship on
  every desktop, so nothing has to be supplied.
- **Display / headings (optional):** a condensed slab for the masthead and big headings.

Any face that is supplied: **WOFF2**, into `/assets/fonts/`. Check the licence permits web
embedding — desktop-only licences are the usual trap. Supply a fallback stack for each.

Numbers appear constantly (AP, fuse, turn counter). Whatever you pick must have tabular
figures or the UI will jitter every turn.

---

## 9. Optional, later — audio

Not in the current milestones. If you add it: OGG plus M4A fallback, mono, 44.1kHz,
under 200KB each. Paper rustle, pencil scratch, counter snap, a distant dog, one muffled
crump for the demolitions. Keep it diegetic to the *table*, not the battlefield — you are
playing a paper game, not standing in Normandy.

---

## What to make first

Don't make all of this. In order of how much feel they buy you:

1. `paper-fibre.png` and the palette. This alone changes everything.
2. The six full portraits. They are the emotional payload of the whole design.
3. `counter-frame-allied.svg` and the three role symbols.
4. Terrain: hedgerow, wood, field. The rest can stay procedural for a long while.

Stop there and playtest. The remaining assets are worth making only once the level design
has settled, because half of them will change when it does.
