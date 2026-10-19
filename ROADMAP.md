# Burn by Dawn — Roadmap

For the operator's reference. SPEC.md stays the source of truth for how the game works;
this file says what comes next and in what order. STATE.md says where we are today.
Update it when a phase finishes or the plan changes.

Phases 1 to 5 are done and their history is in `ROADMAP-ARCHIVE.md` (moved 16 Oct 2026):
v1.0, the missions architecture, the airfield, the aqueduct, and teaching the game (the
text diet, the cues, the training course, the playtest kit). A file that cites "ROADMAP.md
Phase N" means the archive.

---

## Where we are

19 Oct 2026, build M60. Four missions (France, the airfield, the aqueduct and, since
M60, the heavy water plant) and the training course, all playable from the contents
page, at three difficulty levels, with painted art and recorded sound (the heavy water
plant's paintings and recordings asked for, ART-PROMPTS.md Priorities 31 and 32). Each map is printed on its own ground colour (M58d), and
the operator places notes and clears hexes in `?layout` (M58e), paints a map's ground there (M59c), and drags the board's labels (M59d). The test of the game is SPEC.md's two pillars: every
success makes the rest harder, and the player is hunter and hunted at once.

## Next, in order

1. **M55, the title and Dakota panels** (the operator's, 17 Oct 2026: the panels
   "flesh the game out well for flavour"): a title painting of the stick in silhouette
   behind the opening page, and a comic panel of the men in the back of the Dakota,
   shown after START GAME and before the drop run is picked, in every mission. One
   shared Dakota painting first; per-mission variants later through the missions'
   picture folders (as the aqueduct's portraits fall back). Claude specifies both in
   ART-PROMPTS.md and puts placeholders in the game; the operator paints them. With it,
   the carry-back of the operator's rewording of the men's new lines (the b and c tags
   in `docs/WORDING.md`, section F), if ready.
2. **Then the fourth mission, Gunnerside** (chosen 17 Oct 2026), because it plays least
   like the three there are. **Specified at M56** in `MISSION-GUNNERSIDE.md` (18 Oct
   2026): the stealth mission, a gorge to climb, tracks in the snow, NOT A SHOT FIRED.
   Built as M57 (engine) to M60 (words, sounds, art), **playable since M60**, with M61
   for new comic panel moments if wanted; the order is in that file.
3. **Playtests on people who have never seen the game** (`docs/PLAYTEST.md`,
   `?playtest`) whenever a tester can be found, and a milestone of fixes for what they
   trip on, as M49b was.

---

## More missions after that (candidates, from the historical notes)

- **Bruneval** (France, 1942): drop onto the cliffs, take the radar parts, fight down to
  the beach and go out by sea. A *carry* objective rather than a demolition, and it
  could share the boat exfil with mission 3.
- **Gunnerside** (Norway, 1943): snow, a gorge to climb, a plant that has to be wrecked
  with no shot fired. The purest stealth mission, a counterweight to the airfield.
- **Jedburgh / OSS** (France, 1944): a small team blowing a rail line with the Maquis.
  A possible smaller, shorter mission.

## Parked (good ideas, not now)

- **Comic panels at story moments** (the operator's, 2026-09-30): painted panels in the
  Commando-comic style that pop up at key moments: the drop, Dutch killed, the first
  enemy seen, the last charge set, victory, failure. The operator paints them. Needs a
  design pass first: which moments, how a panel shows and is dismissed without slowing
  play, one set shared by all missions or some per mission, and the art spec. A phase of
  its own after the airfield is playable.
  **In the game since M52** (the operator's, after trying it): two moments, the landing
  and mission accomplished (ART-PLAY.md). What is still parked is the rest: more moments
  (Dutch killed, the first enemy seen, the last charge set, failure) and their paintings.
  **Gunnerside's spec (M56) designs the next step**: a short fixed list of panel
  triggers (first onto a terrain, the first shot, the primary destroyed, the outcome)
  and five moments for that mission, as M61 (MISSION-GUNNERSIDE.md, Comic panels).

- **Different teams for different missions**, such as Australians at Nadzab, New Guinea
  (the operator's wish, not yet). For now every mission uses the same six men, and every
  mission stands alone with no saved progress. Phase 2 should still name the roster file
  per mission in missions.json, so that a new team later is new data and portraits, not
  new code.

- **Tips as in-world briefings** (the operator's, 14 Oct 2026): deliver the play tips
  in the 80s comic-annual manner rather than as bare pen notes: a radio message, a
  sergeant's field orders, a caption box in a comic panel. Short, in character, now
  and then wry. **The named men give the tips that touch their own traits** (Fitch on
  setting a charge quickly, Vance on not being seen). Needs a design pass first: which
  tips, where each sits so it never covers the board, and whose voice says what. It
  shares its look with the comic panels above, so plan the two together.

- **An "Advice" button** (the operator's, 14 Oct 2026): small, for a player who is
  stuck: it suggests one sensible move. `src/hints.js` already works out the turn
  card's one hint from the state, and the balance bot already chooses moves; the
  button would ask one of them on demand and ring what it names on the board. To
  settle first: whether it names a man and a hex or only the thing to worry about,
  and whether asking costs anything (the score, a count on the back page).

- **A better clipboard** (the operator's, 14 Oct 2026): the training record is drawn
  in code for now and is good enough; improve it later, in code or as a painting.

- **Hiding a body** (the operator's, 13 Oct 2026): a rule to try. A man beside or on a
  body spends a lot of AP, or two turns, to drag it under cover, where the garrison
  does not find it. It gives a kill a second decision (stay and hide it, or go). Try it
  **with** the aqueduct's dearer knife, not after: on its own it makes killing cheaper,
  which is the opposite of what that map needs. As data: a cost and a turn count in
  `rules.json`, off (null) everywhere until tried.

- (The training drop in England was Phase 5's last part: built as the training course.)
- A service record (medals per mission) or unlocks. This needs saved progress, which
  CLAUDE.md rule 9 forbids. Missions stay standalone for now (the operator's call).
- Minifying the JS. See below.
- Seeded variety within a mission (patrol start points, sentry facings) for replay.

## Standing answers

- **Minification: no, not now.** It needs a build step (hard rules 1–2). GitHub Pages
  already gzips the JS to about 195 KB, which is under 4% of what a first visit
  downloads, and minified code is much harder to debug on the live site. The real
  saving is in the images (M25). Look again only if the game is packaged for itch.io or
  Steam, and then as a separate release script that never touches the source.
- **Greyed-out maps: yes, built with Phase 2 on real mission data.** A mock menu now
  would be thrown away.
- **When to spec the expansions:** a one-page outline of each now (enough to shape
  Phase 2). The full spec for mission 2 after Phase 2 lands. Building after v1.0.
