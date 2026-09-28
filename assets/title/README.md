# Title card

Drop `title-card.jpg` here: 4:1, 2400 x 600 px (at least 1200 x 300), JPEG, sRGB, no
text. The game picks it up on load and shows it across the top of the orders card, with
BURN BY DAWN set over the middle by code — so keep the middle of the picture open, dark
night sky. A missing file just means the drawn night scene is used.

Since M25 `title-card.jpg` is a 1600 x 400 copy (about 200 KB) of the painted
`title-card_full.jpg`, which is kept and not loaded. For a new card, drop the 2400 x 600
painting in as `title-card_full.jpg` and make the copy (macOS, nothing to install):
`sips -s format jpeg -s formatOptions 90 -z 400 1600 title-card_full.jpg --out title-card.jpg` Full spec and a
prompt: ART-PROMPTS.md, priority 2b.
