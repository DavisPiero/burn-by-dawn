# BURN BY DAWN — Turn structure, actions and the desktop (SPEC.md §4)

This is §4 of the specification, kept in a file of its own since M48d. It is as
authoritative as SPEC.md: the turn and its phases, every action a man can take and what it costs, and how the mouse and keyboard work.
"SPEC.md §4" in the code, the tests and the other documents means this file.

Section numbers in it (§5, §6) are SPEC.md's. Like SPEC.md it says how things are **now**
and keeps no history (DECISIONS.md and DECISIONS-ARCHIVE.md have it).

---

Dawn arrives at the end of the mission's last turn (`turnLimit`): **turn 16** in France, turn 20 on the airfield (§13). That is the clock and the whole pressure.

Each turn:
1. **Player phase** — each trooper has an AP pool. Move (terrain cost) or act.
2. **Detection check** — every enemy tests line of sight against every visible trooper.
   A trooper already in contact who is spotted again is fired on (§6).
3. **Enemy phase** — patrols move along routes, toward a noise they heard, or toward
   last known contact if alerted. An enemy holding contact stays put and faces its man.
4. **Fuse phase** — fuse timers tick down; charges at zero detonate.
5. **Alert decay** — see §6.

Unused AP is not banked. A man at full AP may always move one hex, even onto ground that
costs more than his pool, spending all of it (`minimumStep`), so a wounded man is never
stuck.

### Actions

All costs and modifiers are numbers in `rules.json`. Each action's button shows its cost
under its name ("2 AP", or "all AP" for those that take his whole turn); its rollover
gives the full cost and, when it cannot be used, why not.

- **Hide ("go to ground")** — 1 AP, and **ends his turn**; any AP left is lost. He gets
  **+1 concealment** on the hex he is on: a hiding man is as hard to see as a scout, a
  hiding scout harder still. It protects only the hex he stops on, not hexes he walked
  through earlier that turn. It lasts until he next spends AP, so a man left where he is
  stays hidden for free. A hidden man is marked on his counter.
- **Suppress** (gunner only) — 2 AP, leaving one step to get back into cover. The target
  must be a **visible enemy: within the gunner's spot radius, with a clear line of sight**
  (troopers have no facing arc). A suppressed enemy has its head down: it **does not spot
  or fire at the next detection check and does not move in the next enemy phase**, and
  its view is not drawn. Firing is gunfire: +2 alert, heard 5 hexes (§6). A suppressed
  enemy is open to a **kill** until the end of the next player phase.
- **Return fire** (anyone who is no gunner) — 2 AP (`actions.returnFire`; null turns it
  off), on the same key and button as Suppress. He must be **in contact**, and the target
  must be **an enemy that has him in its sights** (one that spotted him and is watching
  him), within his spot radius with a clear line. It is a gunner's suppress in every other
  way: the enemy's head is down for a turn, it is gunfire (+2 alert, heard 5 hexes), and
  it is open to a gunner's kill. He keeps the AP he has left to get away. Only a gunner
  fires first; a man nobody has seen has no shot. It is the verb for the man who has been
  seen: it pays now (he is not fired on by that enemy) and costs later (the dial, and
  every patrol in earshot coming to look). The button reads Fire back, and its rollover
  and the enemy's hover (a FIRE row) say whether he can, and why not.
- **Kill** (gunner only) — 2 AP. The target must be visible, as for suppress, and
  **under suppression**: suppressed this player phase or the one before, so one gunner
  needs two turns (suppress, then kill) and two gunners can do it in one. A kill is **one
  aimed shot from a silenced Sten**: +1 alert, heard 2 hexes (Cool Head applies to it as
  to gunfire). So a kill from cold costs +3 alert, leaving the garrison Suspicious; the
  body, once found, is the step to Alert. There are no dice: a legal kill always kills.
  The enemy is gone, stops holding anyone in contact, and leaves a **body** (§5 Wounds).
- **Knife** (any trooper) — a **full turn**: he must not have spent any AP yet. The
  target must be **beside him** and **unable to see him** (he is outside its arc), and he
  must **not be in contact**. So he has to end a turn behind an enemy and still be there,
  unseen, when his next turn starts: the risk is the enemy phase in between. It is silent
  — **no alert, no noise** — but it leaves a **body**, found like any other. The turn
  card hints at it when a man starts his turn behind an enemy. (`knife.fullTurn` false
  makes it 2 AP that ends his turn instead. `noise.knife`, null in every mission, would
  make it heard: a cry at his hex, heard that far off, raising `alert.knife`; tried on
  the aqueduct and left off, `MISSION-AQUEDUCT.md`.)
- An enemy type marked `killable: false` in `enemies.json` (the reserve squad, §6 Exfil
  watched) can be suppressed but never killed or knifed. It is never outlined as a target,
  and its hover and the Kill and Knife buttons say so.
- **Stabilise** — another trooper spends a full turn beside a wounded man (§5). The
  wounded man gets his **full AP pool back and can carry a charge again**, but he is still
  one hit from death: the wound is dressed, not healed.
- **Pick up a charge** — 1 AP, on a hex with a dropped charge, if he has room for it.
  **Any man has room for one** (`charges.carryAtLeast`), whatever he jumped with: a scout
  or a gunner can pick up a charge left lying, carry it and set it. **Its weight slows
  him**: a man carrying more than he jumped with has **1 AP less** while he carries it
  (`charges.overloadApLoss`), taken at once as he takes it and from each turn's pool
  after, never below 1, before the leader's orders are added. So a charge handed to a
  scout is no faster than a sapper's, only harder to see: a trick worth learning, not
  the best way to set every charge. His particulars and the Pass and Pick up rollovers
  say so. A man whose loadout is
  none is shown Pick up only while a charge lies on his hex, and Charge and Pass only
  while he carries one.
- **Pass a charge** — 2 AP to the giver; the taker pays nothing. One charge to a man
  **beside him** who can carry it: not wounded, and with room (any man has room for one).
  If only one man beside him can take it, pressing it hands it straight over; otherwise
  it is aimed like stabilise, with a blue ring round each man who could take it: press
  it, then click the man.
- **Place a charge** — 1 AP (the `onPlaceCharge` hook may change it), on a charge hex of an
  objective that still needs charges (§7). One charge per charge hex.
- **Cut the line** (scout only) — a **full turn**: he must not have spent any AP yet.
  Standing on a telephone exchange charge hex, he destroys the exchange at once and
  quietly: **no noise**, so nobody comes to look, but the garrison notices its telephones
  go dead: **alert +1**. Being seen does not stop him, though it takes his turn. A man who
  walked onto the point must wait for the next turn, and the button, the target's hover
  and the turn card say so.
- **Throw a stone** (any trooper) — 1 AP, at a hex **up to 3 away**; no line of sight
  needed. It is a noise on that hex (§6): **alert +1**; patrols in earshot go and look in
  the enemy phase, and sentries in earshot turn to face it **at once**, for the rest of
  the player phase and the detection check. You choose where they look, and pay a
  sighting's worth of alert for it. **A throw is not a move:** he stays on his hex.
- **Swim** — a **full turn**. From a hex beside the canal, across one canal hex, to any
  free hex on the far bank beside that same water hex. Never onto or from the lock or the
  bridge, which are not banks. Where the canal is two hexes wide there is no swim. A
  wounded man cannot swim. While the selected man can swim now, the far-bank hexes he
  could reach are outlined beyond his move range in its blue, dotted (M49d). He cannot hide as he comes out, and is tested on the far bank
  like any hex he enters. It exists so a man is never stranded by his own demolition, and
  so the telephone exchange can be reached without crossing the watched bridge deck: the
  bridge guards the bonus, never the mission. `requiresDestroyed` can gate it on an
  objective.
- **Pack a parachute** — 1 AP, standing on one, his own or anyone's (§9).
- **Board the boat** (only where a mission's way out is a boat, §10) — 0 AP, `B`, by a
  man **on an exfil hex once the boat is in**: he is out. Men may wait on the beach
  before it comes, and on the other maps a man there would be out already, so a man
  waiting with the boat in wears BOARD! [B] in the pen and his button is set in red. It
  asks first, by the exfil's card, if it would end the mission short. Its button takes
  Signal's place once the boat is in.
- **Signal the boat** (`exfil.call`; only where a mission's way out is a boat that can
  be called, §10) — 1 AP, by a man **on or beside an exfil hex**, once a mission. The boat
  lands two turns after the turn he signals and stays its three, and the mission ends
  when it goes. It is never done at a keypress: a card says the turn it will land, the
  turn it will be gone, who is not near the beach yet and whether the job is done, and
  only **Enter** or its button sends the signal. While a man could send it, its button
  is set in red and the readout says so, as for Stabilise and Pass. Not offered once the boat has been
  called, is in, or would land no sooner than it is coming anyway.
- **RAF diversion** (once per mission, while the leader is alive) — no AP, called at any
  point in the player phase. A raid on the town pulls the garrison's attention: the
  **alert drops one state** (to the start of the state below), **every enemy abandons
  its search or held contact** and goes back to its route or post, and **every trooper is
  out of contact**. It does not undo wounds, deaths, bodies already found, or the
  explosion floor (§6). The leader carries the radio: this is a rule keyed to the
  `leader` flag, not a trait. Calling it forfeits the clean-run score (§10). **In a
  pickle** (`diversion.prompt`: the garrison Alarmed, two men in contact at once, or a
  wounded man in contact) the button turns red and says to call it now, and the turn
  card says so second only to a charge about to blow. A mission may turn any of the three
off (the airfield's garrison is Alarmed in every raid, so there only men in contact urge
it). Its name is the mission's
  (`words.diversionName`): the airfield's is a **jeep raid** on the north wire, the same
  rule.

### Desktop interaction

Hover is a first-class mechanic, not a nicety. It is what makes the game readable enough
to be casual while still being strategic.

- **The danger wash: risk before any hover.** With a man selected, every hex he can
  reach this turn is tinted by what going there would do, by the path the game would
  take and the sums the detection check will do (`sight.js`): **red** where he would be
  spotted on the way or there, blue where he would not. For a man in contact, **green**
  where nobody would spot him, which breaks contact. The hover still gives the why.
- **Hover a hex** with a trooper selected: draw the path, its AP cost, and a detection
  risk readout for every hex on it; a line from the enemy that sees him most to the hex
  the pips are noted on; and the cover where the move ends, as a shield. The player
  commits only on click.
- **A man about to be fired on is marked**: a man in contact whom a free enemy would
  spot again as things stand wears a crosshair, gone the moment he would not be.
- **Hide is urged where it works**: its button is set in red, as Stabilise and Pass are
  below, while hiding where he stands would turn spotted into unseen.
- **Hover an enemy**: its vision arc and patrol route, and what it will see next turn.
  With a man selected, whether he can suppress, kill or knife it now, and if not, why not
  (a kill wants it suppressed first; a knife wants it looking the other way).
- **Hover an objective**: what it needs (charges, fuse, blast radius) and what it pays.
- **Hover one of our men**: his particulars in the readout (§11).
- **What he could do to an enemy now is marked on its chip**: a knife where the selected
  man could knife it, a crosshair where he could fire on it, a crosshair struck through
  where a gunner could kill it. One mark, the quietest; it is the action's own check.
- **A blast this turn throbs**, and so does the exfil, in green, once the job is done
  and the way out is open. In the night's last three turns the dawn strip reddens, and a
  man who can no longer reach the exfil in time wears a clock.
- **What raised the alert is seen**: a red pip flies from its hex to the dial, which
  jolts.
- **Only what he can do now is a button.** The actions the selected man cannot take
  shrink to their keys, each still with its rollover saying what it is and why not.
- **Play tips** (a box on the orders and the contents page, beside Music off, and in
  the menu behind the margin's gear at any time (§11); **on** unless turned off; `?tips=off` in the address). With them on, the player's pen coaches on
  the board: how to move, shown by a ghost of the man walking a short path, until the
  first move; where the charge goes (below); BREAK CONTACT!; GET CLEAR! with an arrow
  to the nearest clear hex; GET OUT! by the exfil. None of it changes a rule, and
  everything in the list above is shown whether they are on or off.
- **Where the charge goes** (a play tip). A man is never on a target to set a charge,
  only on one of its charge points (§7), and new players stood on the bridge. While the
  selected man carries a charge **within one hex** of a target that still wants one, its
  empty charge points are ringed, and the nearest target's are lettered (§11, Motion and
  feedback).
- **A prompt while Stabilise or Pass a charge is open.** Both are used only now and then
  and were hard to find, so while a man could take either right now (the same check the
  button makes: for Stabilise a wounded man beside him and his whole pool unspent; for
  Pass a man beside him with room, while a target the win needs still wants a charge) it is pointed
  out four ways: the button is set in the End turn button's red dots; his roster portrait
  wears the action's key in red; the readout says what to press, in the orders' blue; and
  the wounded man's, or the taker's, hover names who can help. While aiming either, a blue
  ring circles each man it could go to. The turn card's wounded
  hint names the helper. No prompt outlives its use.
- **Right-click**: deselect / cancel.
- **Undo**: the button beside End turn, `Z`, or `Cmd`/`Ctrl`-`Z` takes back the last move
  or action. How far back it goes is `undo.steps`: one step on Normal and Hard, every step
  back to the start of the turn on Easy. It is forgotten when the turn ends or the stick
  jumps, so nothing the garrison has done is ever undone. The player phase rolls no dice
  (only the drop does), so undo can never re-roll anything: it is a mis-click safety net,
  not a scouting tool.
- **Keyboard**: `1`–`6` select trooper, `Tab` cycle, `Space` end turn, `Esc` cancel,
  `R` patrol-route overlay, `?` or `/` how to play (§11: a card of its own, apart from the orders), `M` sound on or off. Actions:
  `H` hide, `S` suppress or return fire, `K` kill, `N` knife, `T` throw a stone, `A` stabilise (aid),
  `P` pick up a charge, `E` pass a charge, `C` place a charge, `X` cut the line, `W` swim,
  `U` pack a parachute, `B` signal the boat (or board it, once it is in), `D` RAF diversion, `Z` undo. An action with a target outlines where it can go and waits
  for a click; `Esc` backs out of it.
