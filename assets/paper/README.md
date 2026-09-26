# Paper

`paper-fibre.png` is the grain laid over the cream pages: 2048 x 2048, seamless,
**greyscale + alpha**. All the texture is in the alpha — clear where the paper is
lightest, faint ink where the fibres are — so the cream shows through. The game picks it
up on load, tiled at 1024 px.

`paper-fibre_original.png` is the grey scan it was made from (opaque, which would have
turned the pages grey). It is kept as the source and is not loaded. To remake the game's
file from a new scan: alpha = (232 − grey) × 0.8, ink colour 26, alpha in steps of 2.
