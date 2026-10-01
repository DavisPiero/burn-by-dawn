# BURN BY DAWN — Art asset manifest

What to make next, in priority order and with image-generator prompts, is
`ART-PROMPTS.md`. This file is the full manifest and rules on formats.

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
  `.blue`, `.leader` for the ranking man's marks only (see the leader counter below), and
  `.fire` (a soft printed orange, M14) for flames and the blast's fireball only, and
  `.ochre` (desert ochre, M29) for the airfield's desert ground and what stands on it only.
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
| `paper-fibre.png` | 2048x2048, seamless tile | greyscale + alpha, low contrast. The base grain under everything. Drop into `/assets/paper/`; the game picks it up on load, shown at 1024px a tile. |
| `paper-crease.png` | 400x1800, alpha | vertical centre-fold shadow and highlight for the gutter |
| `paper-edge-wear.png` | 2560x1600, alpha | corner foxing, edge browning, one overlay across the whole spread |
| `paper-marks-01..03.png` | 300x300, alpha | optional: coffee ring, thumbprint, biro doodle. Three is plenty. |

Optional: `halftone-dots.png`, 512x512 seamless, if you want scanned dots rather than the
procedural SVG pattern. Supply at 2x and it will be used as a pattern fill.

---

## 2. The six — PNG

Each character needs **two** pictures. A portrait made for the roster rail will turn to
mud at counter size, so don't try to make one asset do both.

Portraits are the one place painted or photographic-style art is welcome, so they are
**PNG**, not SVG, and the universal SVG rules above do not apply to them. Drop them into
`/assets/portraits/` with exactly these names; the game picks them up on load, with no
code change, and uses its own drawn portrait for any file that is missing.

| Asset | Size | Notes |
|---|---|---|
| `portrait-<name>-full.png` x6 | **4:5**, 960 x 1200 px (no smaller than 480 x 600). Since M17 the game loads `portrait-<name>-full.jpg`, a 480 x 600 JPEG made from it (the six PNGs were 12 MB over the web); the PNG stays as the source, and a new one needs its JPEG remade (`assets/portraits/README.md`) | Head and shoulders. 8-bit sRGB, opaque, a plain or simple background, no border and no text (code draws the frame, number and name). The roster rail crops to the middle — keep the face and helmet inside the central **80% of the width** and between **12% and 92% of the height**; eyes about 40% down. Shown at roughly 55 x 70 in the rail and 96 x 120 in the rollover, so it must read small: strong silhouette, clear light and dark. Code greys it out when the man is killed. |
| `portrait-<name>-chip.png` x6 | **1:1**, 128 x 128 px | Optional. On the counter, about 15 px on screen. Helmet and face only, filling the frame, transparent background. Silhouette-level simplicity, one distinguishing feature. Without it the drawn stand-in chip is used, which will not match painted portraits. The desert's (`assets/portraits/desert`, M30b, the operator's) are not transparent: the head on a dark red-brown rounded square with an ink edge, like the desert portraits' ground; see that folder's README. |

Names: holloway, fitch, vance, barrow, speers, nunn — the trooper's `id` in
`data/roster.json`, so a seventh man's portrait is named after his id.

A mission may have the six in its own kit (M29b): `portraits` in `data/missions.json` names
a folder with the same file names, tried before `/assets/portraits/` man by man. The
airfield's is `/assets/portraits/desert/` (ART-PROMPTS.md Priority 12): the same sizes and
rules, on a desert-ochre background.

A trooper with no portrait of his own is drawn with `portrait-fallback-full` and
`portrait-fallback-chip`, which live in code and are not to be supplied: they are what
keeps a seventh man a JSON entry until someone draws him. (Until M25 each of the six
also had a drawn face of his own in code; the painted ones replaced them, so they went.)

---

## 3. Counters and symbols — SVG

| Asset | viewBox | Notes |
|---|---|---|
| `counter-frame-allied.svg` | 56 x 56 | die-cut rounded square printed solid `.green` (M31d: its body is `.counter-body`, green unless a mission names another palette colour, `counterColour`; the airfield's is burnt orange `#B4592A`), a dark name strip along the bottom, a paper roundel top left for the role symbol, AP dots top right are drawn by code (M13; a figure before), and a sliver of card edge down-right (M7b) |
| `counter-frame-allied-leader.svg` | 56 x 56 | the ranking man. Same die-cut silhouette as above so the two read as one set — distinguish it by the name strip and a rank flash, not by a different shape. Strip and rank flash use `.leader` |
| `counter-frame-enemy.svg` | 56 x 56 | visually distinct at a glance, not just recoloured |
| `symbol-sapper.svg` | 24 x 24 | detonator plunger or satchel |
| `symbol-scout.svg` | 24 x 24 | binoculars, from the front: two big lenses and a bridge (redrawn bolder M13) |
| `symbol-gunner.svg` | 24 x 24 | Bren, a solid side silhouette: curved magazine up, stock, bipod (redrawn bolder M13) |
| `counter-enemy-sentry.svg` | 56 x 56 | static post: one man, helmet over greatcoat shoulders with a slung rifle slanting behind (M14; the upright rifle read as a T). **Or a painted chip** for each enemy type, `/assets/enemies/counter-enemy-<type>.png`, 128 x 128 on transparency, which replaces the drawn helmets inside the frame on load (ART-PROMPTS.md priority 7) |
| `counter-enemy-patrol.svg` | 56 x 56 | foot patrol |
| `counter-enemy-vehicle.svg` | 56 x 56 | Kübelwagen or motorcycle. M29: the airfield's perimeter car (enemy type `vehicle`), a Kübelwagen from the side with two helmets aboard. *Drawn by code.* Or a painted chip, `counter-enemy-vehicle.png` |
| `counter-enemy-reserve.svg` | 56 x 56 | the reserve squad, arrives at Alarmed |

Counters are drawn in a 56px viewBox and printed at 64px inside an 80px hex (M7b, so the
name strip reads at board scale); the hex edge stays visible underneath. **Do not draw a
shadow into the frame.** The shadow is its own sprite, `counter-shadow` (56 x 56), a soft
shadow down-right drawn under every counter, allied and enemy (SPEC.md §11).

---

## 4. Terrain motifs — SVG

One per type, drawn to sit inside a single hex. **Three variants each** for the four types
that cover large areas, or the map will look rubber-stamped.

| Asset | viewBox | Variants |
|---|---|---|
| `terrain-field-01..03.svg` | 80 x 92 | 3 |
| `terrain-hedgerow-01..03.svg` | 80 x 92 | 3 |
| `terrain-wood-01..03.svg` | 80 x 92 | 3 — M17: crowded billowing crowns after `Woods_Reference_01.jpeg`, each with a `-shadow` sprite (the ink shadow they throw, printed for the whole wood first). *Drawn by code.* |
| `terrain-orchard-01..03.svg` | 80 x 92 | 3 — M17: six round trees in two columns on a lattice every hex shares (x 20 and 60, y 23, 46, 69), so the rows run on across the orchard, after `Orchard_Reference_01.jpeg`; grass and an apple between; a `-shadow` sprite each. M20: each tree a small billowing crown like the wood's, and the apple stalked. *Drawn by code.* |
| `terrain-marsh.svg` | 80 x 92 | 1 |
| `terrain-canal.svg` | 80 x 92 | 1: surface marks only, the water is the hex's printed base |
| `terrain-canal-edge.svg` | 80 x 92 | 1: the bank along the hex's **east** edge; code turns it to every edge that faces dry land |
| `terrain-ridge.svg` | 80 x 92 | 1 — not used since M7b: the ridge is drawn as tonal bands |
| `terrain-farmhouse.svg` | 80 x 92 | 1: Ferme Lebrun, the one farmhouse hex not under an objective — a farm round its yard after `assets/reference/Farmhouse_Reference_01.jpeg` (M14): half-timbered house under red tiles, stone barn under slate with an arched door, haystack, yard wall with a gate gap. *Drawn by code.* |
| `terrain-emplacement.svg` | 80 x 92 | 1 |

**The desert (M29, the airfield, SPEC.md §13)**, in desert ochre over the paper. *All drawn by code.*

| Asset | viewBox | Variants |
|---|---|---|
| `terrain-sand-01..03.svg` | 80 x 92 | 3: a stipple, a wind ripple; on about two hexes in five |
| `terrain-scrub-01..03.svg` | 80 x 92 | 3: camel-thorn, low green sprays |
| `terrain-dunes-01..03.svg` | 80 x 92 | 3: crests with the lee side hatched, over the dunes' area |
| `terrain-wadi-01..03.svg` | 80 x 92 | 3: stones in the bed, over the wadi's area (ochre darkened with ink) |
| `terrain-strip.svg` | 80 x 92 | 1: the painted centre line, the strip's rolled sand a grey wash |
| `terrain-pen.svg` | 80 x 92 | 1: a ring of sandbags round a floor of sand |
| `terrain-camp-01..02.svg` | 80 x 92 | 2: bell tents |

The perimeter wire is a line, not a motif: board.js lays it like a hedge (`WIRE` in
theme.js), a strand of ink with concertina coils and a picket every third coil.

`hedge-clump-01..03` (24 x 24, M17), each with a `-shadow`: one bush of a hedge, laid by board.js every few units along each hedge's line over an ink bottom, now and then half as big again as a tree, after `Hedgerows_Reference_01.jpeg`. *Drawn by code.*

**Roads and the railway are not motifs** (M7b). Code draws each road as one continuous
line through its hexes' centres, and the railway (art only, `railway` in `data/map.json`)
as rails and sleepers across the board; their colours and widths are `ROAD` and `RAIL` in
`src/render/theme.js`. Nothing to supply.

Keep motifs few and bold (SPEC.md §11): one clear shape per hex, no shadows, no screen.
Fields are mostly bare paper; code puts a field motif on only about one hex in five.

**Woods, orchards, marsh and the ridge are areas** (M7b): code draws one shape over each
run of neighbouring hexes, fills and outlines it (`TERRAIN_ART` `area`, `AREA` in
theme.js), and scatters the motif hex by hex over it. So their motifs are drawn with a
transparent background and should read as a scatter of trees or reeds, not a tile. The
ridge has no motif: it is tonal bands. **Hedgerows are lines** like the roads (`HEDGE`);
`terrain-hedgerow-01..03` are used only for a hedgerow hex with no hedgerow beside it.

The canal needs to read as continuous across hexes.

---

## 5. Objectives — SVG, multi-hex

These span several hexes and sit as overlays above the terrain layer.

| Asset | viewBox | Notes |
|---|---|---|
| `objective-rail-bridge.svg` | 280 x 92 | 3 hexes wide, spanning the canal |
| `objective-bridge-destroyed.svg` | 280 x 92 | collapsed span, same footprint |
| `objective-exchange.svg` | 160 x 184 | 2x2 hex village building with a roof standard on its ridge (a short post and crossarm at 100, 42 in these units, where the code's wires end; the poles beside the house went in M14) |
| `objective-exchange-destroyed.svg` | 160 x 184 | |
| `objective-exchange-cut.svg` | 160 x 184 | the line cut, not blown (M16): the house standing, its windows dark — the power has gone. *Drawn by code.* |
| `objective-fuel-dump.svg` | 240 x 184 | drums, tank laager, tarpaulins |
| `objective-fuel-destroyed.svg` | 240 x 184 | |
| `objective-rally-point.svg` | 80 x 92 | the exfil barn, from the south-west like the exchange, with the pick-up party's hooded green lamp. *Drawn by code (M8e).* |
| `objective-aircraft-stuka.svg`, `-destroyed` | 96 x 92 | M29, the airfield: a Ju 87 from above, nose north, desert tan mottled green, crosses on the wings; burnt out, a black hulk alight. An aircraft objective's `art` in its map picks Stuka or Ju 52. *Drawn by code.* |
| `objective-aircraft-ju52.svg`, `-destroyed` | 96 x 92 | a Ju 52 from above: three engines, a long corrugated wing, darker than the Stukas. *Drawn by code.* |
| `objective-fuel-bowser.svg`, `-destroyed` | 84 x 48 | the fuel dump's bowser alone on the apron, a crop of the fuel dump's drawing. *Drawn by code.* |
| `objective-signals-tent.svg`, `-cut`, `-destroyed` | 80 x 92 | a marquee with its wireless mast, the field telephones' wires ending at the mast's crossarm (60, 12); cut, its lit door dark; blown, collapsed and burning. *Drawn by code.* |
| `objective-trucks.svg` | 80 x 92 | the airfield's exfil (the map's `exfilArt: "trucks"`): two desert trucks, a scrap of netting and the pick-up party's green lamp. *Drawn by code.* |
| `landmark-church.svg` | 80 x 92 | village church with a spire. Art only, no rule (SPEC.md §11). The only farmhouse hexes in the village are the exchange's own, so the exchange art draws the church inside itself, beside the building (`church()` in theme.js; M25 took out the stand-alone `landmark-church` sprite nothing used); the church stands whether or not the exchange does. |

---

## 6. Markers and state tokens — SVG

Small, and they sit on top of counters, so they must read against a busy background.

| Asset | viewBox |
|---|---|
| `marker-charge.svg` | 28 x 28 |
| `marker-parachute.svg` | 28 x 28 (an abandoned canopy, §9 — must read as spent kit on the ground, not as a chute in the air) |
| `marker-fuse-L-N.svg` | 28 x 28 (a stopwatch for a charge set with an L-turn fuse and N turns left, L 1 to 6, N 1 to L; M30: the face is divided into the charge's own length, a tick a turn, and the burning `.fire` wedge is N of the L parts, from twelve to the hand, full when set; the last turn's wedge red with a burst behind the watch. Drawn at 34 on the board. M15 had `marker-fuse-1..5`, a quarter of the face a turn) |
| `marker-wounded.svg` | 28 x 28 |
| `marker-suppressed.svg` | 28 x 28 |
| `marker-open-kill.svg` | 28 x 28 (M15: a red crosshair in a paper disc — the turn after suppression, when a gunner can still kill it) |
| `marker-aim.svg`, `marker-aim-no.svg` | 100 x 100 (M15: the crosshair over an enemy while aiming a suppress, kill or knife — red if it can be done, grey if not) |
| `marker-spotted.svg` | 28 x 28 |
| `marker-hidden.svg` | 28 x 28 (a trooper gone to ground, SPEC.md §4 Hide; paper with an ink eye since M21, printed at full strength over the faint counter) |
| `marker-orders.svg` | 28 x 28 (a man with the leader's orders this turn, +1 AP, SPEC.md §5 Command: one chevron in leader blue `#2F7BBF`, the one place besides the leader himself that colour is used; on the right of the counter since M12) |
| `marker-orders-2.svg` | 28 x 28 (the same, +2 AP, beside the leader: two chevrons, M12b) |
| `marker-body.svg` | 28 x 28, drawn at 39 since M15 (a fallen trooper left on the ground, SPEC.md §5 — reads as a loss, not as an objective) |
| `marker-body-enemy.svg` | 28 x 28, drawn at 39 since M15 (a killed enemy left on the ground, SPEC.md §4 Kill — must never be mistaken for one of ours) |
| `marker-no-kill.svg` | 28 x 28 (on the counter of an enemy that cannot be killed, the reserve squad, SPEC.md §4 Kill) |
| `effect-blood-splat.svg` | 100 x 100 (M16: the knife's splat, spot red halftoned and inked, with droplets; drawn small and faint as the stain under a knifed enemy, and since M18 grown slowly from under the body when he is knifed. *Drawn by code.*) |
| `marker-heal.svg`, `marker-heal-no.svg` | 100 x 100 (M18: a big red cross on a paper disc over the man under the mouse while aiming Aid — red if he can be stabilised, grey if not. *Drawn by code.*) |
| `marker-stone-target.svg` | 100 x 100 (M18: where a thrown stone will land, a pebble in an ink target ring; no lob is drawn. *Drawn by code.*) |
| `effect-spark.svg` | 100 x 100 (M16: a spark where a cut telephone wire parts, a small paper starburst. *Drawn by code.*) |
| `marker-blast.svg` | 200 x 200 (comic starburst, one frame, code does the stepped reveal; red burst, a `.fire` fireball inside it and a paper core since M14). **Or a painted PNG**, `/assets/markers/marker-blast.png`, square on transparency, shown from a 400 x 400 copy (M17, the operator's; the full painting is `marker-blast_original.png`, not loaded). It replaces the drawn one on load, the muzzle flash too, and code sets BOOM! over its middle, in the comic lettering since M21 |
| `stamp-destroyed.svg` | 250 x 80 (red rubber stamp, rotated in code; wider since M13 so the word is not squeezed; M31d: a map may move one aside, `stampNudge`, where two blown targets stand side by side) |
| `time-pencil-N.svg` | 200 x 26 (M31d: a No. 10 delay switch lying on its side, N 1 to 6 the turns it runs: crimped copper tube, the safety strip in its length's colour, black, red, white, green, yellow, blue, shortest to longest, as the real ones were; the brass striker body with its inspection hole. Shown in the tin of time pencils when a charge's timer is set, 142 wide. *Drawn by code.*) |
| `marker-charge-point.svg` | 28 x 28 (a charge point, SPEC.md §7, §11: where a man stands to place a charge — an empty satchel with a red plus; must read as "put one here", never as a target. Drawn a third of the way toward the target it serves, M12) |
| `marker-telegraph-pole.svg` | 28 x 28 (a telegraph pole with its crossarm, ink only, on each of the telephone exchange's charge points; code runs one long sagging wire from its crossarm to the exchange's roof standard, M12; M14) |
| `counter-shadow.svg` | 56 x 56 (the soft shadow under every counter, down-right; no filters, so build the softness from stacked faint shapes) |
| `aircraft-dakota.svg` | 120 x 120 (a C-47 from above, **nose to the east**, invasion stripes; flown across the board at the drop, SPEC.md §11). **Or a painted PNG**, `/assets/aircraft/aircraft-dakota.png`, 512 x 512, transparent, the same view — it replaces the drawn one on load, and its shadow is made from it (see ART-PROMPTS.md) |
| `aircraft-dakota-shadow.svg` | 120 x 120 (the same silhouette, one flat fill; printed faint on the ground below it) |
| `vehicle-jeep.svg`, `vehicle-jeep-flash.svg` | 60 x 60 (M31: the airfield's diversion, a jeep raid driven along the north scrub, SPEC.md §13. From above, **nose to the east**, sand-painted, two men aboard, jerrycans and spare wheel behind, twin guns over its **left** side; the flash is two fire-orange bursts at the muzzles, blinked by code. *Drawn by code.* **Or a painted PNG**, `/assets/vehicles/vehicle-jeep.png`, 512 x 512, transparent, the same view: it replaces the drawn jeep on load, and the drawn flashes stay where the drawn guns end, about (325, 110) and (155, 160) of the 512, so paint the guns there) |
| `parachute-canopy.svg` | 40 x 40 (an open canopy from above, in the air — distinct from `marker-parachute`, which is spent on the ground) |
| `parachute-canopy-shadow.svg` | 40 x 40 (its silhouette, one flat fill) |

---

## 7. UI chrome — SVG

| Asset | viewBox | Notes |
|---|---|---|
| `ui-caption-box.svg` | 400 x 120 | comic caption frame. **Must stretch** — supply as 9-slice, i.e. corners and edges as separate paths, or keep the border a simple enough shape that code can redraw it. *Currently redrawn by code: an ink rule and hard offset shadow in CSS.* |
| `ui-speech-bubble.svg` | 240 x 120 | same stretching requirement, plus a separate tail path so it can point in any direction. *Currently redrawn by code: `speechBubble` in theme.js.* |
| `ui-alert-dial.svg` | 240 x 240 | face only, with tick marks for Calm / Suspicious / Alert / Alarmed |
| `ui-alert-needle.svg` | 20 x 120 | separate, rotated in code |
| `ui-dawn-strip.svg` | 600 x 60 | the 20-turn clock. Consider a burning fuse or a lightening sky bar. |
| `ui-button.svg` | 160 x 48 | stretchable. *Currently redrawn by code, like the caption box.* |
| `ui-gutter-note.svg` | 60 x 900 | the margin note in the middle of the margin: scissors, the dashed cut line and "CUT OUT AND PLAY", as outlines (BURN BY DAWN above it is type, M15) |
| `logo-burn-by-dawn.svg` | 800 x 300 | *Not used since M9b: the results page is headed by the title card. The drawn sprite was taken out of theme.js in M25.* |
| `title-card.jpg` | 4:1, **2400 x 600** px (no smaller than 1200 x 300) | **JPEG**, not SVG or PNG — see below. The painted picture across the top of the orders card, under the title, and smaller across the top of the results page. Drop into `/assets/title/`. |

**The title card** is the one painted picture outside the portraits, so like them it is
raster and the SVG rules above do not apply. It is JPEG rather than PNG because it is a
full-colour painting with no transparency, and a PNG that size would weigh several MB
for a page shared over the web. 8-bit sRGB, quality about 85, opaque. The title may be
**painted in** (the supplied card has it, in Stardos Stencil) — then `TITLE_CARD.lettered`
in `src/render/theme.js` is true and code hides its own; or left out, and code sets BURN
BY DAWN over the picture with a soft dark scrim. Shown at 600 x 150
across the card; a picture of another shape is cropped from its middle. Keep the middle
of the picture — roughly the central 60% of the width and height — open and dark (night
sky), since the title sits there; put the aircraft and canopies toward the left and right
and the ground along the bottom fifth. Without the file, code draws its own night scene
(`title-card` in `src/render/theme.js`).

Since M27 each playable mission names its own title card in `data/missions.json`
(`titleCard`); France's is `assets/title/title-card.jpg`. A new mission's is the same
size and format, dropped beside it under its own name. The contents page opens under
the game's card, France's. The airfield's will be `assets/title/title-card-airfield.jpg`
(ART-PROMPTS.md Priority 13), wired in M31: until the file is there the airfield shows
France's. If it is painted without the title, set `titleCardLettered: false` on the
airfield in `data/missions.json` and code sets BURN BY DAWN over it.

**Contents page panels** (M29b; shown since M31c, a mission's `panel` in missions.json, at 150 x 100; the game loads a 480 x 320 copy, the supplied 1200 x 800 kept as `contents-<id>_full.jpg`): `assets/title/contents-<mission
id>.jpg`, one per mission (`contents-france.jpg`, `contents-airfield.jpg`), **3:2,
1200 x 800** (no smaller than 600 x 400), JPEG, sRGB, opaque, no text. A small painting
beside each mission's line on the contents page, shown about 180 x 120 (ART-PROMPTS.md
Priority 14).

Since M25 the file the game loads is a **1600 x 400** copy at quality 90 (about 200 KB),
made from the painted 2400 x 600, which is kept beside it as `title-card_full.jpg` and
not loaded: the full size was 750 KB, and 1600 across is still sharp on a retina screen
at the card's size. Supply at 2400 x 600 as ever; to remake the game's copy (macOS,
nothing to install):
`sips -s format jpeg -s formatOptions 90 -z 400 1600 title-card_full.jpg --out title-card.jpg`

---

## 8. Type

The annual look is carried by print, paper and colour (SPEC.md §11); the one exception is
the speech bubbles, which are comic lettering.

- **Body, captions, numbers and UI:** a typewriter Courier. `Courier 10
  Pitch` if supplied, falling back to `Courier New`, `Courier`, `monospace`, which ship on
  every desktop, so nothing has to be supplied.
- **Speech bubbles and marker-pen notes:** comic lettering, set in capitals — **Manly Men
  BB** (Blambot), bold. It falls back to faces desktops ship (`Noteworthy` bold, `Segoe
  Print`, `Ink Free`, `Marker Felt`). Never Comic Sans.
- **Display / headings:** **Stardos Stencil** bold (OFL), the stencil the title card is
  lettered in: card titles, panel headings, the results masthead.

A supplied face is a WOFF2 in `/assets/fonts/`, listed in `FONTS` in `src/render/theme.js`
(which registers it; no `@font-face` needed) and put first in its `TYPE` stack. The game
waits for them before its first draw, since speech bubbles are measured in their face.
`assets/fonts/README.md` lists what each file is for and its licence.

Any face that is supplied: **WOFF2**, into `/assets/fonts/`. Check the licence permits web
embedding — desktop-only licences are the usual trap. Supply a fallback stack for each.

Numbers appear constantly (AP, fuse, turn counter). Whatever you pick must have tabular
figures or the UI will jitter every turn.

---

## 9. Audio

Keep it diegetic to the *table*, not the battlefield — you are playing a paper game, not
standing in Normandy — with one exception since M11: a charge going off is a real
explosion, close and loud, because it is the payoff of the whole plan, and since M12 the
back page is met by the village church: bells for a mission accomplished, a toll for the
rest. Since M10 all of
them are made in code (`src/render/sound.js`) as
placeholders; a file dropped into `/assets/audio/` with the name below replaces its
placeholder on the next reload, with no code change. A missing file is fine.

**M4A (AAC) or MP3**, mono, 44.1 kHz, under 200 KB each, trimmed tight (no silence before
the sound — it is played the moment its event happens). `.m4a` is tried first, then `.mp3`
(M21c: the supplied set is AAC, which macOS's `afconvert` can write and MP3 it cannot).
**Since M21c every sound below is supplied** (the airfield's jeep, bugle and siren since M31c), cut and levelled from free libraries; where
each came from, its licence and how it was cut are in `assets/audio/README.md`. The table's
names say `.mp3`; the same name in `.m4a` does as well.

| File | Heard when | Length |
|---|---|---|
| `paper-rustle.mp3` | a briefing card opens, the back page turns over | ~0.4 s |
| `pencil-scratch.mp3` | any action but a move: hide, a charge, a stone, suppress… | ~0.3 s |
| `counter-snap.mp3` | a move is undone (a move itself too until M22; silent since M24, the operator's, after M23's slide per hex did not suit) | ~0.1 s |
| `gunfire.mp3` | a gunner suppresses: a short burst of four shots (M13) | ~0.5 s |
| `silenced-shot.mp3` | a gunner's kill: one muffled shot from a silenced Sten and the bolt's click (M13) | ~0.2 s |
| `dog-distant.mp3` | the alert rises | ~0.6 s, two barks, far off |
| `crump.mp3` | three quiet ones for the RAF diversion, bombs miles off | ~1.2 s |
| `explosion.mp3` | a turn with an explosion: a demolition charge close by, crack, boom and falling debris (M11) | ~2 s |
| `church-bells.mp3` | the back page, mission accomplished: the village church ringing at dawn, heard across the fields (M12), rising to the top bell (M15) | ~4–7 s |
| `aircraft.mp3` | the Dakota going over: the drop, and under the RAF diversion's flyover (M15); cut short if the drop is skipped | ~3.5 s |
| `bell-toll.mp3` | the back page, withdrawn or failed: one low bell tolling slowly, a siren far off (M12) | ~5–6 s |
| `jeep.mp3` | the airfield's jeep raid (M31): a jeep going by fast, engine revving, wheels on stones; the cue lays four bursts of `gunfire` over it | ~3 s |
| `bugle.mp3` | the airfield's back page, mission accomplished (M31b): bright and triumphant, not a Last Post; supplied (M31c) as a drum roll and trumpet fanfare | ~2–4 s |
| `siren.mp3` | the airfield's back page, withdrawn or failed (M31): an air-raid siren close by, winding up, wailing and winding down | ~5–6 s |
| `music-title.mp3` | the opening screens, the orders and picking a run (M17): tense 1940s war-film music, looped until the stick jumps, then faded. Cut it to loop without a seam; the size limit above does not apply, but keep it under 1 MB | ~30–60 s |

How loud each plays is set in `sound.js` (CUES), so a file need not be levelled to the others.

---

## What to make first

Don't make all of this. In order of how much feel they buy you:

1. `paper-fibre.png` and the palette. This alone changes everything.
2. The six full portraits. They are the emotional payload of the whole design.
3. `counter-frame-allied.svg` and the three role symbols.
4. Terrain: hedgerow, wood, field. The rest can stay procedural for a long while.

Stop there and playtest. The remaining assets are worth making only once the level design
has settled, because half of them will change when it does.
