# Burn by Dawn — Roadmap

For the operator's reference. Written 28 Sep 2026 at build M24. SPEC.md stays the source
of truth for how the game works; this file says what comes next and in what order.
Update it when a phase finishes or the plan changes.

---

## Where we are

Updated 29 Sep 2026 at build M27b. **v1.0 is tagged** (on the M27 merge).
- Mission 1 (the rail bridge, France) with three difficulty levels, three drop runs,
  six named men and 13 actions, published on GitHub Pages with painted art, recorded
  sound and title music. Phases 1 and 2 are done: the game is an engine plus missions
  (`data/missions.json`), opened from a contents page with the airfield and the aqueduct
  stamped NEXT YEAR'S ANNUAL.
- Tests: 130 headless, 132 in tests.html. Balance bot (naive, KNIFE=1, win %
  west/north/east): Easy 99/100/97, Normal 86/83/89, Hard 29/38/37, every run inside
  the SPEC §10 targets.
- **Phase 3, the airfield, is specified** in SPEC.md §13 (29 Sep 2026): southern Tunisia,
  1942; eight aircraft, any four to win; five bombs; the two new rules are time pencils
  and a bowser that sets off its neighbours. **Next: M28**, the engine work with no
  gameplay change, then M29–M31 as listed there.

## What playtesting taught us (the second pillar, now in SPEC.md)

The game got fun once the player could **act** instead of only avoid: narrower enemy
arcs (M13b), the knife (M12b), kills that score (M16). The original spine stays, *every
success makes the rest harder*, and a second pillar now sits next to it:

> **Hunter and hunted.** The player is both at once. Every turn should offer at least
> one active move worth making: a kill, a lure, a charge, a dash. The garrison should
> still be something to fear. Every new threat comes with a verb that answers it.

Test every new feature against it. Does it give the player a new thing **to do**, or
only a new thing **to avoid**? Prefer the first. The guard rail is that an active move
pays off now and costs later: a body gets found, a bang raises the alert, a gunner's
turn is spent. That is the spine again, in miniature.

---

## Phase 1 — Lock the base game (target: v1.0)

**M25 Housekeeping (no gameplay change)** ✅ done 2026-09-29
- Consolidate SPEC.md. It should describe the current rules only, not the history of
  each one ("110°, was 120° until M13b…"). The history already lives in DECISIONS.md.
  Target: well under half its current 1,100 lines. Also fix the out-of-date file
  layout, the out-of-order milestone table and the stale "1 in 3" balance target.
- (Done at the stocktake: the "Hunter and hunted" pillar is in SPEC.md's opening, and
  the six names are kept, no longer placeholders.)
- Shrink the images the game downloads (about 5.5 MB per first visit). Done for the
  title card (750 KB → 200 KB, 1600 × 400). The paper texture (1.8 MB) could not become a
  JPEG, because all its texture is in its transparency; halving its size would save
  1.1 MB but visibly soften the grain on a retina screen. The operator's call: keep it at
  full resolution (it looks too soft halved).
- Remove dead code: the drawn faces for each named man in theme.js (painted
  portraits replaced them; keep one generic fallback) and anything else only kept as a
  fallback for supplied files.
- Rename the map from "Night Drop — first pass".

**M26 Active-play pass** ✅ built 2026-09-29 on `m26-active-play`, not yet merged. Done: the prompts, the dialogue and the hunter bot style (below); the balance targets wait for the operator's call on the hunter finding (DECISIONS.md, SPEC §10 Balance) and the next playtest. Kept as written for the record:
- More dialogue: lines for a kill, being spotted and hiding. Data only, and the six men
  are the heart of the game.
- A "hunter" balance-bot style that goes looking for kills, to check that
  kill-everything never becomes the best way to play.
- **Stabilise and Pass a charge stay** (the operator's call: used only now and then,
  but they matter in edge cases and add flavour). Make them easier to find: a prompt
  appears while their use is valid, when a man stands beside a wounded man, or a man
  carrying a charge stands beside one who can take it. Today only Stabilise gets a hint,
  and only on the turn card at the start of a turn.
- Re-set the balance targets for what players now enjoy, e.g. Normal won by most
  people within three tries, and Hard as the real test.

**M26b Review of M26** ✅ built 2026-09-29 on `m26b-review`. The operator's call on the hunter finding: the knife takes a whole turn, and a Wood patrol walks the landing grounds so packing chutes matters (numbers in DECISIONS.md, SPEC §10 Balance); Pick up charge and Pass charge named in full; the "?" search ring fixed. The balance targets still wait for the next playtest.

**Gate to v1.0.** A playtest round with 3–5 people new to the game, with no rules changes
asked for, the game working in Chrome, Safari and Firefox, and the bot numbers noted.
Then tag it `v1.0`.
Prepared 2026-09-29 (build M26c): the playtest sheet is `docs/PLAYTEST.md`, and the
proposed balance targets are in SPEC.md §10.
**M26d** (2026-09-29) was built from the operator's own playtest notes, since a full round
with new players is not likely soon: two rules changes (the fuel dump's charge points
cost 1 AP; an enemy fires at one man a turn), a smoother hover for Safari, and five
clarity fixes. Every bot run is now inside the proposed targets. Whether that is enough to
tag v1.0 is the operator's call.

---

## Phase 2 — Missions architecture (M27, no gameplay change)

**M27** ✅ built 2026-09-29 on `m27-missions`. Everything below is in; France's bot output
is byte-for-byte unchanged. Left for Phase 3: the difficulty levels' patches and
summaries are still France's (Easy's "the bridge takes one charge"), so a mission will
want its own level patches; and the map's `primary` flag still sets the 10-point score
and the PRIMARY TARGET ring, which the airfield's `destroyCount` will need to say
something about.

Turn "the game" into "an engine plus a mission". France becomes mission 1, and the bot's
numbers for it must come out **identical**, which proves nothing changed.
- `data/missions.json` lists each mission: id, title, status (`playable` / `coming`),
  map file, a rules and enemies patch (the same deep-merge difficulty already uses),
  briefing text, tagline, title card and end-of-mission sounds.
- Move France's own words out of code: the tagline "SIX MEN · ONE BRIDGE", the
  telephone wording and the swim's "across the canal".
- `?mission=` in the address, like `?seed=` and `?difficulty=`. `MISSION=` for the
  balance bot.
- A small fixed list of **win conditions** (e.g. destroy this target / destroy N of
  these), in the same spirit as the trait hooks: a short vocabulary, never a code
  branch for one mission.
- **The mission menu, styled as the annual's contents page.** France is playable. The
  future missions are printed but stamped *NEXT YEAR'S ANNUAL*. The greyed-out entries
  are real `coming` entries in missions.json, not fake buttons.
- Every mission keeps the 18×13 board, so the spread layout never changes.

---

**Source material:** [docs/Historical_Raids.md](docs/Historical_Raids.md), the
operator's notes on real small-party parachute sabotage raids (Colossus, Bruneval,
Gunnerside, the SAS airfield raids, Chestnut, the Jedburghs, Nadzab).

## Phase 3 — Mission 2: the airfield (North Africa)

**Specified** in SPEC.md §13, which supersedes this outline where they differ. The
operator's calls (29 Sep 2026): southern Tunisia, 1942 (loosely 2 Para at Oudna, paras
from Dakotas); the two new rules are **time pencils** (choose a charge's fuse) and a
**fuel bowser that sets off the aircraft in its blast**; **sappers carry two bombs**
(five in the stick). Built as M28 (engine, no gameplay change), M29 (the map, under
today's rules), M30 (the two rules and balance), M31 (words, sound, art hand-off).

The outline as first written: The loose basis is the 1941–42
parachute raids on Axis airfields (Operation Squatter; 2 Para at Oudna, Tunisia).
Why it goes second: it is the most *different* puzzle and the most "hunter" mission.
- Many small targets. Aircraft parked in dispersal pens take one charge each. You win
  by destroying N of them, and every extra one is greed against dawn.
- Open ground. Wadis and dunes block sight (as hedgerows do now), scrub gives light
  cover, the pens give heavy cover. The detection rules stay the same.
- New content as data: sand/scrub/wadi terrain, a fast perimeter vehicle patrol (an
  enemy type with more speed), maybe a sympathetic blast (a fuel bowser setting off
  its neighbours).
- Exfil: a rendezvous with trucks at the map edge.
- **Mechanics budget: at most two new rules.**

## Phase 4 — Mission 3: the aqueduct and the boat (Italy)

The loose basis is Operation Colossus (Feb 1941, the Tragino aqueduct in southern
Italy, with a submarine pickup that never came). Colossus was on the mainland, not Sicily.
Operation Chestnut (July 1943, two small SAS parties dropped into northern Sicily to cut
roads and communications) is the closest Sicilian match, so the setting is free to
choose.
- A big single target: the aqueduct needs many charges.
- **Supply canisters**: charges come down in containers that scatter like the men, and
  must be found before they can be used. This puts the spine back on the drop.
- **Exfil by boat**: beach hexes that are only open for a window of turns.
- Mountain terrain and ravines. Maybe civilians who raise the alarm if they see you,
  but who can't be harmed.
- **Mechanics budget: at most two new rules.**

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

- **Different teams for different missions**, such as Australians at Nadzab, New Guinea
  (the operator's wish, not yet). For now every mission uses the same six men, and every
  mission stands alone with no saved progress. Phase 2 should still name the roster file
  per mission in missions.json, so that a new team later is new data and portraits, not
  new code.

- A short training drop in England as a tutorial mission. Cheap once Phase 2 exists.
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
