# BURN BY DAWN — Win, lose, score (SPEC.md §10)

This is §10 of the specification, kept in a file of its own since M48d. It is as
authoritative as SPEC.md: how a mission is won, lost and scored, the missions as data, the difficulty levels, and the balance baselines.
"SPEC.md §10" in the code, the tests and the other documents means this file.

Section numbers in it (§5, §6) are SPEC.md's. Like SPEC.md it says how things are **now**
and keeps no history (DECISIONS.md and DECISIONS-ARCHIVE.md have it).

---

Every mission ends in one of three outcomes:

- **Success:** the primary destroyed AND at least **3** troopers out by the exfil by
  dawn (§4).
- **Withdrawn:** the mission can no longer succeed, but the stick is not wiped out —
  fewer men alive or already out than are needed, or not enough charges left anywhere
  (carried, dropped or set) to finish the primary (a dropped charge counts only while a
  man still on the board could carry it), or nobody left on the board with the primary
  intact. The mission ends at once: every man still on the board gets out, then any
  charges still burning go off (they can still finish an objective).
- **Failed:** dawn arrives without success, or every man is dead. A man still on the
  board at dawn is left behind and does not count as out.

The mission also ends when nobody is left on the board (all out or dead), after any
charges still burning have gone off.

**Asked before it is lost:** a move onto the exfil that would end the mission short of
success is held back by a card — "Are you sure? Mission not yet complete. An exfil now
will end it: WITHDRAWN." — with the reason; Enter or its button goes anyway, any other key
or click stays. The hover readout says it first, and charges still burning that would
finish the job are counted.

**Exfil** is a short run of hexes on a map edge, away from all three drop runs: the south
edge in France and on the aqueduct, the south-west corner on the airfield, the north-east
on the heavy water plant (§16).
A trooper who ends a move on an exfil hex is out: removed, safe, and counted. A man
carrying a charge does not take it out: he leaves it on the hex he stepped off from.

**The way out on a timetable** (`exfil`; `opensTurn` null in France and on the airfield,
whose exfil is open all night). Where a mission gives a turn, a **boat** lands on it, and
**nobody goes out before it lands**. The exfil's hexes are ground like any other, to the
men and the garrison: a man may walk onto them and wait there, seen and shot at as
anywhere (M49d, the operator's). Once the boat is in, a man ending a move there is out,
and a man already waiting there goes out by **boarding** it (§4, `B`). Nobody is taken
off the board by its landing, so boarding is the player's to do, and since on the other
maps a man there would be out already, the game says so: BOARD! [B] in the pen under
every man waiting there (tips or not), the turn report and the turn card when the boat
comes in, his button set in red, and on the boat's last turn a card before the turn
ends with anyone still on the beach. Going out is asked first, by the card above, if it
would end the mission short.
- **How long it stays** (`openFor`): that many turns, the turn it lands included, and
  **the mission ends with the last of them** as it would at dawn. Null: until dawn.
- **It can be called in early** (`call`: `{ apCost, leadTurns }`, or null): a man beside
  an exfil hex signals (§4), and the boat lands `leadTurns` turns after that turn, if
  that is sooner than `opensTurn`. It still stays only `openFor`, so the night is then
  that much shorter for everyone: the turn counter, the dawn strip, the last turn a
  timer can be set for and the outcome's words ("the boat has gone") all follow it.
- Unsignalled, it comes on `opensTurn` regardless.

**The results page** is the back page of the annual: all six by name and fate (out,
killed, left behind), the level, and the score, whatever the outcome:

- Each objective destroyed, blown or cut: its kind's `score` (the Rail Bridge 10, the
  Telephone Exchange 4, the Fuel Dump 5). Meeting the win condition pays `scoring.win` on top: 0 in France, whose
  bridge carries its own 10; a mission with no primary pays it for the job done.
- Each man out: 2 if never hit, 1 if wounded, dressed or not.
- Each man out who was never spotted all mission: 1 more. His roster rollover says
  whether he is still unseen.
- Each enemy killed by a knife or a gunner's shot: 1, less 1 for each of their bodies
  the garrison finds (so a kill nobody finds is worth 1, one they find nothing). A blast's
  kills score nothing, or blowing a target up beside a patrol would pay.
- **The goods train** (§7): where a mission has one, its target down within a turn of it:
  5 ("Goods train wrecked with it").
- **The salvo** (`scoring.salvo`; null in France, which has one fuse and one primary):
  where a mission gives `{ count, points }`, that many or more of the win's targets going
  up in one fuse phase, set off by a neighbour or by charges timed to the same turn, pays
  `points` ("4 Aircraft up in one bang"). The airfield's is 4 for 3 (§13).
- **The clean run**: never reached Alarmed (`scoring.cleanNeverReached`) and never called
  the RAF diversion: 3. A mission may ask only about the night before the first bang
  (`scoring.cleanUntil: "firstExplosion"`) and name a lower state: the airfield's is
  **below Alert when the first bang goes**, whatever comes after (§13). The orders say it
  is there, in the mission's words (`words.cleanOrders`; France's: "Getting in and out
  with as little enemy attention as possible earns a special bonus!"). Where a mission
  sets `scoring.cleanNoShot` (false in the files; the heavy water plant's, §16) it asks
  too that **no man fired all night**: no suppress, no fire back, no kill. The game keeps
  who fired first and on what turn.

The bridge is worth 10 so that the job done with three men out (22 on a clean run) edges
out the best retreat (21); a full success tops out at 45 before kills. The score is the
same sum at every level. Targets of one name share a line ("3 Stukas destroyed").

**The rating.** A mission accomplished is rated against the mission's score bands
(`ratings` in `missions.json`: lowest first, each a `from` score and a `label`), printed
under the score as the annual's "how did you score?" table, best first, the band earned
in bold with its name in red above. A withdrawal or a failure is not rated: the outcome
is the verdict. The bands are set against the bot's winning scores on Normal
(`SCORES=1`): the job alone with most men out lands in the middle two, and the top wants
the bonus targets or a spotless night. France: under 28 SCRAPED HOME, 28 A GOOD NIGHT'S
WORK, 36 MENTIONED IN DESPATCHES, 40 ONE FOR THE ANNUAL; the airfield: 36, 43 and 50.
Nothing is stored: it rates the game just played.

### Missions

The game is an engine plus missions, listed in `data/missions.json` in the order the
contents page prints them. A mission is data only, and no code asks which is on:

- A **playable** mission names its `map` and `roster` files, and a `rules` and `enemies`
  patch merged over `rules.json` and `enemies.json` the way a difficulty level's is; the
  mission's go first, then the level's. A patch key must already exist, except that a
  mission may add a new objective kind or enemy type. France's patches are its dawn (`turnLimit` 16) and its goods train (§7): the rest
  is the files as they are.
- Its **own part of each level** (`levels.<id>` in `missions.json`: a `rules` and
  `enemies` patch and a `summary`) goes over the level's own patch, and its summary is
  printed before the level's. What a level does to one mission's targets lives there
  (France: the bridge's one charge on Easy, the reinforcements on Hard); what it does in
  every mission lives in `difficulty.json`.
- Its **win condition** is one of a short fixed list in `missions.js`, in the spirit of the
  trait hooks: `destroyPrimary` (the objective `map.json` marks primary; France) or
  `destroyCount` (any `count` objectives of one `kind`). Success is the win condition met
  and `minimumOut` men out by dawn; withdrawal counts the charges short of it.
- Its own words live with it: the orders' opening line, the tagline under the title card,
  the phrases for its cut line and the diversion's name, card and log line, its title card
  (the game's, France's, until its own is painted; `titleCardLettered` false if the title
  is not painted in), the diversion's sound and its back-page sounds. A `dialogue` patch may replace any of the men's lines for it;
  they are still the one roster. It may name folders of its own pictures, each tried
  before the usual one, file by file: the six in its kit (`portraits`) and its
  garrison's chips (`enemyChips`: the aqueduct's Italians).
- The map's `primary` flag is asked for only by `destroyPrimary`, which wants exactly one;
  a `destroyCount` map has none, and at least `count` of its kind. The target rings, the
  ★, the mission panel, the hints, the Pass prompt and the bot all ask the win condition
  which objectives it needs. Where any few of many will do, each is ringed once and the
  first carries one note ("ANY FOUR AIRCRAFT!"), and the mission panel gives the kind one
  line.
- A mission may be **a course** (§15): it names a `lessons` file, its orders are the
  list of its lessons, and its rules patch makes it an **exercise**
  (`mission.exercise`: never settled, so nobody withdraws, no dawn ends it and there is
  no back page). Where a mission names no lessons, none of that exists.
- A **coming** mission is printed on the contents page but stamped NEXT YEAR'S ANNUAL,
  and cannot be picked. A **draft** one is printed and stamped the same, but can be
  played by its address: how a mission is tried on the live site before it is announced.

A mission picked on the contents page is loaded in place, its files fetched and its board
drawn without the page loading again, and the address then names it.
`?mission=<id>` in the address picks a playable or draft mission and goes straight to its orders;
`MISSION=<id>` does the same for the balance bot. Every mission keeps the 18×13 board.

### Difficulty

Three levels, chosen on the orders before the drop and fixed once the stick jumps. The
numbers in this spec are Normal's. A level is data only: a patch over `rules.json` and
`enemies.json` in `data/difficulty.json`, then the mission's own part of it (§10
Missions), and no code asks which level is on. It is shown
beside the seed and on the back page, and `?difficulty=easy|hard` picks it.

| Level | Changes from Normal |
|---|---|
| **Easy** | The bridge takes 1 charge; 2 men out will do; the RAF can be called twice; the leader's orders reach 3 hexes; hiding gives +2 concealment; shots hit only from 2 hexes off; undo goes back to the start of the turn |
| **Normal** | The mission as above |
| **Hard** | 4 men must get out; every enemy sees 4 hexes in a 120° arc; blowing the bridge calls up 2 squads of reinforcements and the fuel dump 1, none once the exchange is down (§6) |

### Balance

The balance bot (`node tools/balance-bot.mjs 300 naive`, with `KNIFE=1`) plays whole
missions through the rule functions. Its win rates show which way a change pushes, not
the absolute answer; it never calls the diversion or stabilises, returns fire only when run with `FIRE=cornered` or `FIRE=always`, and only its `hunter`
style goes looking for kills, and it packs no parachutes unless run with `PACK=1`, so a
person does better. Current baselines, win % west / north / east: **Easy 100 / 100 / 97,
Normal 87 / 86 / 94, Hard 39 / 41 / 42**; packing every chute on turn 1 (`PACK=1`):
Easy 100 / 99 / 97, Normal 92 / 91 / 95, Hard 53 / 43 / 42. Easy and Normal are meant to
be kind to casual players; Hard is the real test. Any rules, map or enemy change is re-run against these and
the shift logged in DECISIONS.md.

The `hunter` style (`node tools/balance-bot.mjs 300 hunter`) walks each man behind the
nearest killable enemy to knife it, and closes a gunner to suppress and kill. By default
only the men with no charge to place hunt; `HUNTERS=all` sends everyone, until the bridge
is down or turn `HUNT_TURNS` (12). It is the check on the second pillar: kill-everything
must not be the best way to play. It moves as the `careful` style does, so it is measured
against `careful` on the same run. France, 200 seeds, W/N/E:
Normal careful 90 / 79 / 72, hunter 72 / 77 / 71, `HUNTERS=all` 51 / 49 / 45; Hard careful
63 / 50 / 57, hunter 16 / 25 / 15, all 12 / 12 / 13: below or level on Normal and far below on
Hard, since a 16-turn night has few turns to spend hunting until turn 12. Its numbers, against the baselines, are in DECISIONS.md.

**Targets** (proposed at the v1.0 gate; the playtest in `docs/PLAYTEST.md` confirms or
moves them). What they are for is people, so the first three are measured on players new
to the game, and the bot's ranges are the guard rails a change must stay inside:

| Level | Players | Naive bot, every run | Hunter bot |
|---|---|---|---|
| **Easy** | A first try usually wins | 95 or more | — |
| **Normal** | Most win within three tries | 75 to 90 | Below careful on the same run (a few points over is the bot's noise) |
| **Hard** | The real test: a win is earned | 25 to 45 | Below careful on the same run (a few points over is the bot's noise) |

Today France's runs are inside them but Normal's East, 4 over; the airfield's are in §13,
the aqueduct's in §14 and the heavy water plant's in §16 (its Hard outside the target,
open with the operator).

The aqueduct has a third style, **`tidy`**, the player its alert budget is measured by
(§14): the `careful` mover who packs his parachute on turn 1, times a target's charges
to one bang, and would rather lose a turn than be seen. `ALERT=1` prints where the
dial's points came from. `SENSE=1` mends two faults in the bot's play found there (it
knifed standing in its own blast; it took a target's first-listed charge points, not
the nearest): the aqueduct's numbers are with it, and France's and the airfield's were
measured without it and are kept so. `CLEAR=1` (M51) has a naive man standing where a blast goes
this turn look at every hex he can reach to get clear, not only along his route: the
aqueduct's numbers are with it; France's and the airfield's are kept without it (France's
Normal moves 2 to 5 points with it).
