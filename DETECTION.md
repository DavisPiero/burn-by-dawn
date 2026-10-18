# BURN BY DAWN — Detection and alert (SPEC.md §6)

This is §6 of the specification, kept in a file of its own since M48c. It is as
authoritative as SPEC.md: how the garrison sees, hears, is alerted, fires and is reinforced. "SPEC.md §6" in the code, the tests and the other
documents means this file.

Section numbers in it (§4, §10) are SPEC.md's. Like SPEC.md it says how things are **now**
and keeps no history (DECISIONS.md and DECISIONS-ARCHIVE.md have it).

---


There is **no fog of war.** Enemies are always drawn. The hidden resource is alert.

Each enemy has a vision radius (3) and a facing arc (110°). A trooper inside it, with line
of sight, is tested:

```
detection = base(enemy, 3) - cover(none 0, light 1, heavy 2) - concealment(trooper)
            + proximity (+2 beside it, +1 two hexes off) + the alert state's detectionBonus
```

He is spotted at the threshold, **3**. The hover readout shows the sum as dots: "2 of 3
dots". The player must see risk before committing.

**Garrison alert has four states**, shown as a dial on the right page:

| State | From | Effect |
|---|---|---|
| **Calm** | 0 | Patrols walk fixed routes. |
| **Suspicious** | 2 | Vision +1. Patrols pause every other turn and sweep 60°. |
| **Alert** | 4 | Vision +1. **Detection +1**: light cover no longer hides a man in the open arc. Hearing +1. |
| **Alarmed** | 7 | As Alert, and every patrol hunts the last known contact. The reserve squad enters and watches the exfil. |

The alert is a **points total**; "From" is where each state begins, and points cap at
Alarmed. One event is not a whole state: a single sighting leaves the garrison Calm, a
second makes it Suspicious.

Raised by: being spotted (+1, only when he was not already in contact), gunfire (+2), a
silenced kill (+1), an explosion (+3, the fuel dump +4), a body found (+1), a parachute
found (+1, §9), a thrown stone (+1), the telephone line cut (+1), and where a mission has tracks, prints found (+1, once an enemy phase at most, SPEC.md §9 Tracks). Enemy fire raises
nothing extra: the sighting that caused it already counted.

**Decay:** after 4 quiet turns (no alert raised, nobody spotted) the points drop to the
start of the state below; in Calm, to 0.

**Explosion floor:** once any charge has exploded, the alert never decays below
Suspicious again.

What this does to a run: the bridge alone leaves the garrison Suspicious; the bridge plus
a cut telephone line still does; the bridge plus the fuel dump is Alarmed.

### Noise: the dial is global, the reaction is local

Every **noise** happens at a hex and is **heard within a radius**: parachute or body found
3, thrown stone 3, gunfire 5, silenced shot 2, explosion 7, plus the state's hearing bonus.
**A sighting is not a noise**: the enemies that spot a man hold and face him, but nobody
else comes unless something is heard. Hearing is distance only; walls do not stop sound.
Patrols that hear it leave their route, walk to that hex, sweep, and go back to their
route. Enemies out of earshot feel only the dial.

**The turn the patrols set out** (`patrols.setOutTurn`; 1 in France: they walk from the
start). Where a mission sets it later, nothing walks its route until that turn's enemy
phase: every patrol stands where the map put it. Standing is not sleeping: it sees,
turns to a man it spots and holds him, and goes to a noise as ever. The airfield's is 2
(§13), so the stick has one turn on the ground, and a second player phase, before the
patrols come round. An enemy's hover says it stands this turn, the turn card says so on
turn 1, and next turn's facing is shown as ever.

**A post may sweep** (`sweep` on a sentry in the map; none in France or on the
airfield). It looks its first way through the player phase of every odd turn and its
second through every even one, turning in the enemy phase, so the ground it covers is
open every other turn and an approach can be timed. The dashed wedge shows the turn to
come, as for any enemy. A noise or a man it has spotted turns it as it would any
sentry, and it goes back to its sweep after.

**Sentries cannot leave their post.** A sentry that hears a noise turns to face it in the
enemy phase and holds that facing through the next player phase and detection check,
then turns back to its facing in `map.json`. A thrown stone turns sentries in earshot
**at once**, in the player phase, through that turn's detection check — so a stone opens
the ground now, for the men who still have AP.

**Next turn is shown:** every enemy that will face a new way after the coming enemy
phase shows it as a hollow dashed wedge beside its solid one, and hovering an enemy
outlines what it will see next turn from where it will stand. It is the same sum the turn
will do, so it changes as the men move.

The most recent noise hex, or the hex of a first sighting, is the **last known contact**
that every patrol hunts at Alarmed. Seeing a man already in contact again does not move it.

**A repeat is not a new contact.** An event on a hex that enemies are already heading to
or searching updates that contact instead: nobody new sets off, the search is not
restarted, and the turn report says it once.

### Contact and enemy fire

Being spotted is a warning, not a wound:

1. **Detection check, turn N** — an enemy spots a trooper. The alert rises by 1. He is
   **in contact** and wears the spotted marker. In the enemy phase every enemy that
   spotted him **stays put and turns to face him**, so the player can see who has him.
2. **Player phase, turn N+1** — he has one turn to break contact: get out of sight, hide,
   get distance, return fire himself (§4), or have a gunner suppress (or someone kill)
   whoever is watching.
3. **Detection check, turn N+1** — if any enemy spots him again, **he is shot** (§5
   Wounds). The alert does not rise again. A suppressed enemy does not fire. If nobody
   spots him, contact ends.

**An enemy fires at one man a turn:** of the men already in contact it spots, the one it
has in its sights (the one it turned to face), else the nearest, else the first in the
roster. The others it sees stay in contact and are not shot by it that turn. So a man who
holds an enemy's eye can draw its fire while another slips past: hunter and hunted. It
turns to face whoever it fired at.

The hover readout marks every path hex where a man in contact would be shot, and whether
it would hit or pin him there, so being fired on is never a surprise. Where he is seen
but every enemy seeing him is firing at another man, it says NOT SHOT and at whom.

### Exfil watched

At Alarmed the reserve squad enters from the road edge (`reserve.entryHexes`), marches to
a guard hex beside the exfil, and stands there as a sentry facing it. The player sees the
exit narrowing and routes around it. It **cannot be killed** (`killable: false`): it is a
squad, not one man, and at Alarmed a kill would cost nothing and reopen the exfil for
free. It can be suppressed for a turn to slip past. Its counter reads RESERVES.

**Where a mission makes it killable** (its enemies patch; the aqueduct, §14) it is
knifed, shot or blown up like a patrol, and the garrison sends another for each one
killed, up to `reserve.replacements` (0 in the files; the aqueduct's is 1): it comes in
the next enemy phase the alert is at Alarmed, as the first did, and not at all once a
target's payoff has stopped the reserve. So a kill buys turns, not a free way out.

### Reinforcements

Blowing a target makes the garrison call up **reinforcements**: its kind's
`reinforcements` in `rules.json` (0 on Easy and Normal; on Hard the bridge 2 and the fuel
dump 1). They come on in the **enemy phase after the bang**, at the road's south end beside
the exfil (`reinforcements.entryHexes`), and march to **posts** on the ways into the exfil
— each squad the next post in order — where they stand as sentries. They are **patrols**,
so they can be suppressed and killed. The call goes by telephone: **none come once the
telephone exchange is down**, which makes the exchange the first job on Hard. The target
rings, the hovers and the mission panel say so, and the turn report says when they are
called and when they come on.

**A body found may call them too** (`bodyFound.reinforcements`; 0 in the files, 1 on
the aqueduct, §14). Where a mission sets it, the garrison finding **one of its own
dead** calls up that many squads, as a bang does: on down the road in the next enemy
phase, and none once a target's payoff has stopped the reserve. **Each goes to stand
where its body was found**, looking the way the dead man looked at rest, so ground
that has been cleared is garrisoned again; no more than `bodyFound.limit` of them in a
mission (the aqueduct's: 4). The bang's squads keep the posts by the exfil. One of our
men found dead calls nobody. The knife's and the
kill's rollovers and the turn card's knife hint say so, and the turn report says when
a squad is called for a body. It is what a kill costs later, where the alert alone was
not cost enough.
