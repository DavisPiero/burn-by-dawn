# Burn by Dawn — Roadmap

For the operator's reference. Written 28 Sep 2026 at build M24. SPEC.md stays the source
of truth for how the game works (with ART-DIRECTION.md, its §11, and MISSION-AIRFIELD.md,
its §13); this file says what comes next and in what order.
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
- **Phase 3, the airfield, is specified** in SPEC.md §13, now MISSION-AIRFIELD.md (29 Sep 2026): southern Tunisia,
  1942; eight aircraft, any five to win on Normal (M30; four at first); five bombs; the
  two new rules are time pencils and a bowser that sets off its neighbours. **M28 to M30
  are built**: the engine work (France's bot output byte-for-byte unchanged), the
  airfield on the board as a draft (`?mission=airfield`), the operator's notes on it (a
  South run for the East, a camp guard, a bomb for each scout), and (M30, 30 Sep 2026)
  the two rules, the bot playing both, and the balance: a West patrol, five aircraft on
  Normal, six on Hard, every run inside the §10 targets; M30b, the operator's desert notes
  (the timer made plain, blasts to come shown, a default timer of 4, a Sand patrol, the
  desert chips); M31 (30 Sep 2026), its words, sounds and art hand-off: the orders explain
  the timer and the bowser, the diversion is a jeep raid, desert lines and back-page sounds,
  and the paintings and recordings listed in ART-PROMPTS (13, 15, 16). M31b, the
  operator's notes on it: the airfield **playable** from the contents page (30 Sep 2026).
  **Phase 3 is done. Next: Phase 4, the aqueduct — spec it first.** M31d (1 Oct 2026),
  the operator's notes before Phase 4: the timer as a tin of time pencils, orange counters
  on the airfield, a way back to the contents. A rule tried with them (patrols walk into
  our men and find them) was taken out again: it made the game worse (DECISIONS.md).

**The order from here** (the operator's, 1 Oct 2026): the bomb store and the salvo (done,
M33), then the goods train for France (done, M34), then **Phase 4, the aqueduct: next**,
specified first in `MISSION-AQUEDUCT.md`.

**Phase 4 is specified** (M39, 5 Oct 2026) in `MISSION-AQUEDUCT.md`, SPEC.md §14, which
supersedes the outline below where they differ. The operator's calls: southern Italy,
February 1941 (Colossus); every charge down in a canister, the men empty-handed; the boat
on a timetable like the goods train; a tidy Normal win ending at Alert, not Alarmed.
From play since M38b the operator finds return fire, the 16-turn night and the weight of
a carried charge all good, and may yet adjust them. Built as M40 (the engine, no
gameplay change), M41 (the map, a draft), M42 (balance), M43 (words, sounds, art).
**M40 is built** (5 Oct 2026): canisters and the exfil's opening turn are in the engine
as data, off in France and on the airfield, whose bot output is unchanged byte for byte.
**M41 is built** (5 Oct 2026): the aqueduct is a draft, played by `?mission=aqueduct`,
with its map, ground, targets, canisters and boat drawn in code and the bot taught to
fetch and to wait. Its first numbers miss the alert budget (the garrison Alarmed in two
games in three at best) and the Valley run is too kind: **next, M42, its balance**, by
the map and the beats. Tests: 184 headless.
**M41b** (6 Oct 2026), the operator's notes from playing the draft: every post sweeps
between two facings; the reserve can be killed here and one more comes; the boat can be
signalled in early from the beach (a card asks first) and stays three turns; the
aqueduct and ravine two hexes east; the shut beach in red; cries, soot marks and ALL
CHARGES SET. On the airfield the West run has a second way through the wire, and the
targets' names are quiet in play. Tests: 187 headless. **Next is still M42.**
**For M43** (the operator's, 6 Oct): the aqueduct's enemy chips are to be Italian, not
German: new paintings (ART-PROMPTS Priority 19) and a per-mission folder for enemy
chips; and its contents panel is asked for (Priority 14).
**M41d** (6 Oct): the panel is in and the aqueduct is **playable** from the contents
page, ahead of its balance (the operator's); the airfield's West gap is kept.
**M41e**: the gap moved two rows north (the operator's idea), which gives Hard's North
run back what the gap at the strip had cost it.

**M42** (the aqueduct's balance, by the bot): eight pier feet (one side is enough for
Normal's four charges), a mule track up the west bank, the West and Valley runs and
three beats redrawn, the longest timer offered first and then the one that makes one
bang, the boat two turns on Hard. A tidy Normal win stays below Alarmed in 94 / 62 / 84
games in 100; naive wins Easy 95 / 95 / 93, Normal 81 / 83 / 80, Hard 33 / 21 / 40.
Tests: 189 headless. **Open for the operator** (MISSION-AQUEDUCT.md, Balance): the
hunter bot is level with careful play on Normal and above it on Hard; Hard's North run
is 4 under its target. **Next: M43**, the aqueduct's words, sounds and art hand-off.

**M42b**, the operator's notes on it: a found enemy body calls a squad; cover on the
plough; drawn roads off the map; canisters ringed, named and counted in dots. Naive
Normal 81 / 74 / 77, Hard 33 / 15 / 37. The hunter bot is still not below careful play.
**M42c**: the squad for a body stands where the body was found (the operator's), four
at most; Normal 79 / 74 / 76, Hard 31 / 15 / 35; the hunter is still not below careful.

**M43** (the aqueduct's words, sounds and art hand-off): a folder of its own for its
garrison's chips, Italian once painted; the six's lines for Italy; the canisters' thump
and the boat's oars and surf, made in code; slots for its own title card and winter
portraits; the winter ground a little colder. **Phase 4 is done as planned.** Open, and
the operator's: the paintings and recordings in ART-PROMPTS.md (Priorities 19 to 23),
the placeholder copy, and the two balance questions above (the hunter; Hard's North).
Tests: 192 headless, 194 in tests.html. **Next:** the operator's play and art; then a choice from "More
missions after that" or "Parked" below.

**M43b**, the operator's notes: the Italian chips and the aqueduct's title card are
painted and in; the canisters' rings pop on one by one, a thump with each, round
their pictures. Still asked for: Priorities 21 to 23. Tests: 193 headless.

**M43c** (7 Oct 2026), the operator's notes and the first playtest fix: the canisters
come down in the drop on blue canopies and are on the ground only as each lands; the
charge points are ringed for a man carrying a charge near a target. **Phase 5 below is
proposed** from the same playtests. Tests: 194 headless.

**M44** (7 Oct 2026), the text diet, Phase 5's first: the orders are five lines (what
tonight asks); how to play is a card of its own behind **?** with the counter key; the
turn card is four marked lines and one short hint. Tests: 195 headless.

**M45** (7 Oct 2026), seeing and being seen: the danger wash, the sight line, filling
pips and cover shield, the crosshair on a man about to be fired on, Hide urged where it
works, and HOVER A HEX. CLICK TO GO. until the first move. Tests: 199 headless.
**M46** (9 Oct 2026), doing, with the operator's notes on M45: marks on the enemies a
man could strike, the first move's ghost, a throbbing blast and GET CLEAR!, GET OUT! and
the clocks, the alert's flying pip, the action strip cut to what can be done, the hint
ringed on the board. The pen's coaching is behind a **Play tips** box, off unless
ticked (the operator's); the drop is chosen in blue; the charge points are ringed from
one hex off. Tests: 204 headless, 206 in tests.html. **Next: M47**, the training mission specified.

**M32** (1 Oct 2026), a review before Phase 4, from the balance bot's numbers
(DECISIONS.md): the airfield has its own clean run (the garrison below Alert when the
first bang goes) and its jeep raid is urged only for men in contact, since its garrison is
Alarmed by the end of every raid; a mission accomplished is rated on the back page against
the mission's score bands; SPEC.md trimmed. Tests (at M34): 163 headless, 165 in tests.html.

### What the review found, for Phase 4 and after

- **France's dawn does not press.** The bridge is down by turn 9–10 and the game over by
  11–12; a 14-turn night would not change the win rate. See the goods train, below.
- **The airfield's alert dial is always at the top.** No number moves it. For the
  aqueduct: **decide in the spec which alert state a normal win should end in**, and
  count the bangs, bodies and parachutes against it before the map is drawn.
- **The longest timer is always best, and timing bangs together pays nothing.** Answered
  in M33 by the salvo score.
- **The bowser is the plan, not a greed**, so play gathers on the south apron. Answered
  in M33 by the bomb store.
- **The West run is the airfield's best by every measure**: it lands beside the wadi and
  the trucks, and its parachutes are almost never found. Still so by score; the North
  now wins as often.
- **The Fuel Dump in France is rarely worth it** (the bot takes it in 11–40% of games,
  the exchange in every one). M33 made it two patrols and 5 points; the bot cannot say
  whether that tempts a person, since it blows the dump last, when patrols leaving no
  longer help it.

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

**Specified** in SPEC.md §13 (now MISSION-AIRFIELD.md), which supersedes this outline where they differ. The
operator's calls (29 Sep 2026): southern Tunisia, 1942 (loosely 2 Para at Oudna, paras
from Dakotas); the two new rules are **time pencils** (choose a charge's fuse) and a
**fuel bowser that sets off the aircraft in its blast**; **sappers carry two bombs**
(five in the stick; M29b spread them one a man, scouts included). Built as M28 (engine, no gameplay change), M29 (the map, under
today's rules), M30 (the two rules and balance), M31 (words, sound, art hand-off; and from the operator's notes, the RAF diversion as a
jeep's drive-by outside the wire, the same rule in new words, art and sound, and the
desert portraits, which load from `assets/portraits/desert` as they arrive).

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
  but who can't be harmed. (M32's review advises against: they are a thing to avoid with
  no verb that answers them, which fails the second pillar. Spend the two rules on the
  canisters and the boat, and make the boat's window the clock, since a 20-turn night
  alone did not press in France.)
- **Mechanics budget: at most two new rules.**

---

## Done for the airfield: the bomb store and the salvo (M33, 1 Oct 2026)

Built as planned (MISSION-AIRFIELD.md, DECISIONS.md): a **bomb store** between the two
eastern Stukas, the bowser's twin, taking exactly those two; and **the salvo**, 3 points
for four or more aircraft up in one bang. Normal still wants five aircraft, so neither
big target is needed there and each is a greed; Hard wants seven, so both have to go.
The North run, which had no plan of its own, now wins as often as the West. The same
milestone made France's **Fuel Dump** send two patrols away and score 5 (the operator's).

## Done for France: the goods train (M34, M34b, 1 Oct 2026)

Built to the operator's decisions (SPEC.md §7): scenery, not an enemy; seen coming on
from the west edge three turns before it crosses; the bridge down within a turn of it
wrecks it and pays 5, score only. Drawn in code; a reference and its sounds are in
ART-PROMPTS.md Priority 18.

**Its turn is 17** (M34b, the operator's). It was 14 at first, and the bot found that
waiting for it then cost nothing: men holding their charges, hidden on the charge points,
won more often than men who set them on arriving (91 / 94 / 96 against 86 / 83 / 89). At
17 the waiting bot wins 84 / 87 / 92 on Normal, about level with not waiting, and on Hard
19 / 39 / 46 against 29 / 38 / 37: a gamble on the West run, and the stick has two to
four turns to reach the exfil before dawn.

Since M35 (2 Oct 2026, the operator's notes) it runs between turns, is trimmed in blue
and paper, and whistles as it comes on.

**Its turn is 10 since M37** (2 Oct 2026, the operator's: at 17 most games were spent
waiting for it). The bot's stick sets its charges on turns 7 to 9 as it is, so at 10 the
train is one to be in time for: a stick that tries catches it in 80 to 90 games in 100
on Normal after under a turn at the bridge, where at 17 it sat there seven. What was
given up, knowingly: holding the charges for it is again safer than setting them on
arriving (91 / 93 / 97 against 86 / 83 / 89), as it was at 14, and on Hard the stick is
too slow to catch it more than one game in five. Measured and not taken: 12 (a two to
three turn wait, caught more often on Hard), 14 (a four to five turn wait), and dawn at
15 with the train at 10, which the bot's win rates survive on every level (Normal
84 / 85 / 94, Hard 30 / 38 / 41) but which takes about two and a half points of bonus
targets off the greedy bot's night: one number, `turnLimit` in France's patch, if the
night should be shorter.

**Dawn in France is turn 15 since M38** (2 Oct 2026, the operator's, to try): with the
train at 10 it makes the night bridge, train, then four or five turns to get out or take
one bonus target. The bot wins as often as at 20 (Easy 100 / 100 / 97, Normal
84 / 85 / 91, Hard 27 / 39 / 42). What it costs is the Fuel Dump, which the greedy bot
now reaches in 15 to 53 games in 100 (it took it in most at dawn 20), so the top rating
band is seldom earned; and hunting, which a 15-turn night has no turns for. The same
milestone made a charge a man did not jump with cost him 1 AP while he carries it, so a
charge passed to a scout is a trick, not the rule.

**Turn 16 since M38b**, the operator's, the same day, with the top rating down to 40
(was 43). Easy 100 / 100 / 97, Normal 87 / 86 / 94, Hard 39 / 41 / 42: the extra turn is
worth most on Hard's West run (27 to 39). Normal's East is 4 over the target. The Fuel
Dump is still what there is rarely time for (17 to 55 games in 100 for the bot that
goes for it), and at 40 the top rating is earned by that bot's best quarter of games.

## Done for both missions: return fire, and the airfield's quiet first turn (M36, 2 Oct 2026)

From the operator's notes after M35: nothing offensive to do once spotted, and the
airfield punishing from the first turn. **Return fire** (SPEC.md §4): a man who is no
gunner, once seen, can fire back at the enemy that has him, a gunner's suppress at a
gunner's price in alert and noise. By the bot it does not make the game easier: fired
only when cornered it leaves the win rates where they are, fired every time it loses
games, and kill-everything stays below careful play. **The airfield's patrols set out
on turn 2** (MISSION-AIRFIELD.md): the early wounds go, Normal's win rate stays, and
Hard's three runs come inside the targets. Tried and dropped on the way: a cheaper
knife, a surprise knife on turn 1, landing further from the garrison, and patrols
started off their beats (DECISIONS.md, m35).

Left as it is: Normal's North run on the airfield is 5 over the target (95), and on Hard
the kill-everything bot is level with the careful one on the West and South runs
(69 / 41 / 67 against 67 / 68 / 60), where it was below.

## Phase 5 — Show, don't tell: teaching the game (agreed 7 Oct 2026)

**Agreed by the operator, 7 Oct 2026. M44 to M46 are done; M47 is next.** From the
first playtests with new players: there is too much to read before the first move, and
key rules are not found by looking (a player stood a sapper on the Rail Bridge and
could not see why he could not set his charge). M43c fixed that one case; this phase
does the same for every key mechanic, then adds a training mission.

**The aim:** a new player makes a first move within a minute of the contents page,
and never has to read a paragraph to learn a rule.

### How it is done (the rules of the phase)

1. **Orders and instructions are two things.** The orders say what tonight asks: the
   target, the way out, dawn, the bonus. Instructions say how to play. Today both are
   on one card of about 250 words, with the counter key beside it.
2. **Teach where it happens, when it matters.** A rule is shown on the board, on the
   thing it is about, the first moment the player needs it: never in a list beforehand.
3. **One cue language**, already begun: the player's **red pen** (a throbbing ring, a
   few capitals) means *do this, here*; **blue** means *our kit*; a **faint ghost**
   moving shows *how*. A pen note is six words at most.
4. **A text budget.** Orders: five lines. A turn card: what happened in icons, and one
   hint. The readout keeps its detail: it is asked for by hovering, not pushed.
5. **The spine and the second pillar stand.** Nothing here changes a rule or a number;
   it is all display, so the bot's baselines do not move.

### Each mechanic: from words to pictures

| Mechanic | What a new player has to read today | What the board shows instead |
|---|---|---|
| The job | The orders' paragraphs | The orders cut to five lines over the map's own pen rings (target, exfil), which are already there |
| Jump | Pen cue (done, M21) | Keep |
| Select and move, AP | HOW TO PLAY; the counter key | After the first select: a ghost counter walks a short path, its AP dots emptying, under HOVER A HEX. CLICK TO GO. Once |
| Being seen | The DOTS row; the counter key | **A danger wash**: with a man selected, every hex he can reach where he would be spotted is tinted red, so the risk map is read without hovering. On hover, a sight line from the enemy to the hex, and the pips fill one at a time |
| Cover | The readout's ground note | A small shield on the hovered hex: none, half, full |
| In contact, fired on | The spotted marker's rollover (90 words) | The watcher's dashed line turns into a crosshair that closes over the turn; hexes that break contact are tinted green; BREAK CONTACT! in the pen |
| Hide | The Hide button's rollover | The **H** button throbs when hiding here would turn SPOTTED into UNSEEN |
| Knife, suppress, kill, fire back | The enemy's hover rows; hints | **Opportunity marks**: a knife or crosshair on any enemy's chip the selected man could strike now. An enemy's blind side is shaded when a man is beside it |
| Charge points | HOW TO PLAY ("vulnerable points") | Done, M43c: ringed and lettered near a man with a charge |
| Fuse and blast | BANG row; turn card | The turn a charge will blow, its blast ground throbs red and each man inside wears GET CLEAR with an arrow to the nearest safe hex |
| The alert | The dial's rollover; the log | Whatever raised it sends a red pip flying from its hex to the dial, which jolts. The cause is seen, not read |
| Noise | NOISE rows | Keep the ripple; add an arrow from each patrol that will come |
| Parachutes | Turn 1's hint | On turn 1, a chute lying on a patrol's route is joined to that patrol by its route line, with **U** on it |
| Leader's orders | The chevron's rollover | Keep (radius and chevrons already show it) |
| The way out, dawn | The orders; the turn counter | Once the job is done the exfil throbs green with GET OUT; in the last three turns the dawn strip reddens and a man too far to reach it wears a clock |
| Actions | 13 buttons, each with a rollover | The buttons he can use now are full size and inked; the rest shrink to their key. A button that has just become usable pops once |
| What to do next | Up to three hints of 20 to 40 words | One hint, twelve words, and it **points**: each hint names a hex or a man, ringed in the pen while the card is up |
| Reference | The orders card again (**?**) | **?** opens a few small pages (Moving, Being seen, Charges, Fighting, Getting out), each one moving diagram drawn with the board's own counters, and the counter key |

### The training mission

A playtester's idea, taken up by the operator (notes of 7 Oct 2026, kept here): **a
tutorial, one thing to do at a time, with the board holding the player's hand.** First
on the contents page, marked START HERE. Set at **a paratrooper training school in
England**: a practice ground, umpires for a garrison, a dummy bridge. It needs its own
`MISSION-TRAINING.md` before it is built (M47).

**It is a course of lessons, each a qualification.** A lesson teaches one thing with
pictures and movement first and few words, the player does it once, and it is stamped
passed. The operator's list, with what I would add:

| # | Lesson | What is shown and done |
|---|---|---|
| 1 | **The drop** | Pick the run, jump, watch the stick and its scatter |
| 2 | **Parachutes** | A patrol's route runs over a chute: pack it, and why |
| 3 | **Action points** | Move a man and watch the dots empty; the turn ends, they fill |
| 4 | **Ground** | Field, hedge, wood, marsh, water: what each costs to cross and how much it hides |
| 5 | **Not being seen** | A sentry's view, the dots filling, cover, going to ground; then being spotted on purpose, and breaking contact |
| 6 | **Watching the garrison** | Hover a patrol for its route and next turn's facing; time a crossing; a stone to turn a sentry's head |
| 7 | **Fighting** | The knife from behind; a gunner's suppress, then kill; firing back when seen; what a body found costs |
| 8 | **Charges** | A canister to find; pick up, carry (and its weight), pass; the charge points; a time pencil; get clear; the bang and the alert |
| 9 | **The leader** | His orders (the extra AP near him) and his radio: calling the diversion |
| 10 | **The men** | Each man's own skill, shown by using it: Steady Hands, Quick Work, Cat's Eyes, Treetops, Cool Head, Ox |
| 11 | **Getting out** | The exfil, dawn, how many must be out, and the card that asks before a withdrawal |
| + | **The alert** (mine) | Its own short lesson: what raises it, what each state does, that it decays. It is the spine and nothing above teaches it whole |
| + | **A wounded man** (mine) | Wounds, and stabilising: rare in play and never found unaided (M26) |
| + | **Reading the page** (mine) | Folded into lesson 1: the readout, the log, the roster, undo, **?** |
| + | **The passing-out exercise** (mine) | A last short raid on the dummy bridge with no hand held, so the lessons are used together once before France |

**What the operator asks of it, as requirements:**

- **Pictures first.** Every lesson has a demonstration that moves, drawn with the
  board's own counters and cues, and painted panels where the operator supplies them.
- **Any lesson can be taken again on its own**, to learn it better or as a refresher,
  from a list of the course, at any time: so each lesson sets up its own small
  situation (its men, its ground, its garrison) and needs nothing from the one before.
- **A clipboard at the end**: the course's summary, every skill learnt ticked off as a
  qualification, in the annual's manner.
- **Idiot proof.** A wrong click at the wrong moment never breaks a lesson or leaves
  the player lost: only what the step asks for does anything; anything else is ignored
  or answered by the board pointing at what is wanted. **Steps can be gone back
  through**, one at a time, and a lesson restarted.
- **Nobody is hurt and it cannot be lost.** Caught out, an umpire's whistle blows and
  the step is put back to its start, with the reason shown on the board.

**What that means for how it is built** (to be settled in M47's spec):

- **Lessons are mission data**, so no code asks which mission is on: a mission may
  carry `lessons`, each with its own start (who is where, with what, on which turn)
  and a list of steps, each `{ say, show, allow, until }`: a pen line of a few words,
  what to ring or animate, the one action and hexes allowed, and a condition from a
  short fixed list in the spirit of the win conditions (selected, moved to, hidden,
  turn ended, charge set, enemy down, target destroyed, man out).
- **Going back and redoing come from one thing:** every step begins from a state the
  lesson can rebuild, so "back" is the step before's state and "again" is the lesson's
  start. The rules being pure functions over state (CLAUDE.md rule 7) is what makes
  this cheap.
- **Nothing is stored** (rule 9), so the clipboard shows what was passed this session,
  and the course can always be opened at any lesson. Whether passes should be carried
  in the address, as the level and music are, is a question for the spec.
- A fixed landing (no scatter) where a lesson names hexes; the six as they are, since
  lesson 10 is about them; a small part of the board in play for each lesson.
- It is the same cue language as the main game, which is why the cues (M45, M46) are
  built first.

### Order of work (a milestone each)

- **M44 — the text diet. Done.** Orders cut to five lines and split from the instructions;
  HOW TO PLAY and the counter key move behind **?**; the turn card down to icons and
  one hint. Mostly deleting. ART-DIRECTION's Cards section is rewritten with it.
- **M45 — seeing and being seen. Done** (with the hover-and-click cue pulled forward
  from M46, in words; the ghost counter is still M46's). The danger wash, the sight line and filling pips,
  the cover shield, contact's closing crosshair and green ways out, the Hide prompt.
  The biggest single gain: detection is the game, and today it is read off a row.
- **M46 — doing. Done.** Opportunity marks, the first-move ghost, blast and GET CLEAR, the
  alert's flying pip, the exfil's GET OUT, the action bar, hints that point. The pen's
  coaching among them is the **play tips**, off unless ticked (the operator's, 9 Oct):
  so a new player who does not tick the box gets the marks, throbs and washes but none
  of the pen's words after CLICK A MAN TO START. The training mission is then where a
  new player is taught, which makes M47 and M48 matter more. Not built, from the
  table above: an enemy's blind side shaded, the noise arrows from patrols that will
  come, the chute joined to a patrol's route, and the **?** pages' diagrams (M48).
- **M47 — the training mission specified** (`MISSION-TRAINING.md`) and its lesson
  engine built, off in every other mission.
- **M48 — the training mission built**, with the **?** pages' diagrams drawn from the
  same lessons. Fifteen lessons is more than one session: expect M48 to be two or
  three (M48, M48b…), a few lessons each, each playable when merged.
- **M49 — playtest it on people who have never seen the game**, and fix what they
  trip on. Measure: time to the first move, to the first charge set, and what they ask.

### Open questions for the operator

(Phase 5 was agreed with these unanswered, so each stands as I advised until the
operator says otherwise.)

- **The danger wash changes how the game feels**: SPEC §4 made hover the way risk is
  read, and a wash shows it before any hover. **Built at M45, on at every level**, as
  advised; one line in main.js would keep it to Easy and Normal if Hard plays too
  plainly with it.
- **Does the training mission come first?** It is the playtester's headline, but it
  reuses the cues, and the main game must stand without it (many players skip a
  tutorial). Hence M44 to M46 before it. It could be pulled forward if the operator
  would rather.
- **The words in the pen** are mine and placeholder, as the aqueduct's copy is.
- **Painted lesson panels?** The parked comic panels would suit the training mission's
  step cards. Code can draw every diagram; paintings would be the operator's to make.

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

- **Different teams for different missions**, such as Australians at Nadzab, New Guinea
  (the operator's wish, not yet). For now every mission uses the same six men, and every
  mission stands alone with no saved progress. Phase 2 should still name the roster file
  per mission in missions.json, so that a new team later is new data and portraits, not
  new code.

- (The training drop in England is now Phase 5's last part, above.)
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
