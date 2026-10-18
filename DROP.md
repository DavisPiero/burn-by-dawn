# BURN BY DAWN — The drop (SPEC.md §9)

This is §9 of the specification, kept in a file of its own since M58. It is as
authoritative as SPEC.md: the drop runs and their scatter, the parachutes, the supply
canisters, and tracks in the snow. "SPEC.md §9" in the code, the tests and the other
documents means this file.

Section numbers in it (§4, §10, §16) are SPEC.md's. Like SPEC.md it says how things are
**now** and keeps no history (DECISIONS.md and DECISIONS-ARCHIVE.md have it).

---

The drop is not a cutscene. It is the first decision, and it is how the player chooses a
route.

Before turn 1 the player picks one of **three drop runs**, each a flight line across the
map with a wind arrow: west over the wood and ridge line, north over the hedgerow lanes,
east from the north edge above La Butte's east side down toward Ferme Lebrun, nearest the
primary. All three land west of the canal, so nobody starts on the wrong side of the
chokepoint. The men jump in roster order along the line. Each lands with **small seeded
scatter**, 1–2 hexes, rarely 3, leaning **downwind**. Nobody lands out of play, on the
exfil, on impassable ground other than the canal, on another man, or within 2 hexes of an
enemy. Landing in Wood or Marsh costs that man his first turn (no AP on turn 1). Landing
in the Canal wounds him, and he drags himself out onto the nearest bank, his parachute
with him.

Scatter stays small. It is texture, not chaos: the plan should survive it, and turn 1 is
always a regroup problem, different every time, never unfair. The player does **not**
choose landing hexes; the run plus the scatter decides.

## Parachutes

Every trooper leaves a **parachute** on the hex he lands in. It is evidence, and what he
does about it is the second decision of turn 1.

- A trooper standing on a parachute can **pack it up for 1 AP**, his own or anyone's, one
  per action.
- A parachute left behind is found when an enemy comes **onto or beside** it during the
  enemy phase — on or beside any hex it walks through, or where it ends its go. Alert
  **+1**, the parachute is removed, and that hex becomes a last known contact. Found once.
- Patrol routes are drawn, so the player can see which parachutes are at risk.

Stealth costs action points, speed costs alert: the design spine on the drop.

## Supply canisters

(`canisters`; null in France and on the airfield, where the men jump with their charges.)
Where a mission gives `{ count, charges, scatterWeights }`, **the men jump with no
charges**, and `count` canisters holding `charges` each leave the aircraft among them:
spread evenly through the stick, the last with the last man, so three among six leave
after the second, the fourth and the sixth. Each scatters as a man does, leaning
downwind, by the canisters' own weights, onto ground a man can stand on: never on a man,
on another canister, in water, on the exfil, or within 2 hexes of an enemy. They are
rolled after the men from the same seed, so a seed lands the men the same way with
canisters or without.

- A canister is **a pile of charges**: a man standing on it takes one with the ordinary
  Pick up (§4), 1 AP, if he has room.
- A man's role still says how many he carries at full pace; one more than that costs him
  1 AP while he carries it (§4), as for any charge he did not jump with.
- It is **evidence until it is empty**. An enemy coming onto or beside it finds it as it
  would a parachute: alert +1, a noise there, once. A found canister stays where it is
  and **keeps its charges**. It cannot be packed; when its last charge is taken it is
  pulled under cover and is gone.
- Its charges count toward what the stick can still do (§10 Withdrawn) like any charge
  left lying.

## Tracks in the snow

(`tracks`; null in every mission but the heavy water plant, §16, so nowhere else does a
step leave anything behind.) Where a mission gives `{ turns, alert, alertPerPhase }`:

- A man who **steps onto ground that takes prints** (`tracks: true` in `terrain.json`:
  the Snowfield and the Drift) leaves **prints** there, each turned the way he walked:
  in by the edge he came from, out by the edge he went to next, and on the last hex of
  his move straight on the way he came in. Landing, a throw, a knife, a swim, anything
  that is not a step, leaves none, and so does the garrison. A hex walked again keeps
  only the newest prints.
- **They last `turns` turns**: laid in turn N, with 3, they are there through the enemy
  phases of N, N+1 and N+2, and gone at the end of N+2. Undo takes them back with the
  move that laid them.
- **They are found where an enemy looks** (M59b, the operator's: prints found behind an
  enemy's back were a puzzle): on any hex it walks onto, or ahead of it inside its arc
  within `findRange` hexes with a clear line, from each hex it walks through (facing
  the way it walks) and where it ends its go (facing as it ends). A parachute is still
  found on or beside, whatever the facing. A find makes a noise there (heard as a
  parachute found), so that hex becomes a last known contact, and **every print that
  man's one move laid goes with it**, so a long walk across the open is one find. A find
  raises the alert by `alert`, but prints raise it **no more than `alertPerPhase` times
  in one enemy phase**, however many trails are found. The diversion leaves them where
  they are. There is no action to brush them out: the answer is the route.
- **Seen first** (the footprint wash, while a man is selected, is the same sum: the snow
  ahead of the garrison's next walk): the hovered path marks each hex that would take prints with a boot,
  and its TRACKS row says who would find them next turn, by the same sum the turn will
  do; a print's hover says whose it is, the turn it fills in and who finds it next turn;
  the turn report says who found whose. With the tips on, the first trail of a game has
  TRACKS! lettered under it, with "the patrols will follow them".
  While a man is selected, **the footprint wash** hatches in ink every hex of snow on or
  beside where the garrison stands or walks next turn, by the same sum (M58c, the
  operator's: keeping prints from being found felt like luck): prints laid there now
  would be found, so a route round it can be planned.
