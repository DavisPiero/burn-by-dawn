# BURN BY DAWN — Art direction: cards (SPEC.md §11)

Part of SPEC.md §11, with `ART-DIRECTION.md` (the look: the spread, colour and type, the
board, counters and markers; read it first) and `ART-PLAY.md` (before the drop, the
hover readout and the turn log, motion and feedback, sound). As authoritative as
SPEC.md; it says how things are **now** and keeps no history (DECISIONS.md has it).

---

### Cards

- **A card that asks** (signal the boat, out anyway) has its button on a line of its own
  above the way back (NOT YET — any other key or click), never beside it.
- **A card's way on is a button** at the right of its foot: what it does in bold
  (CARRY ON, BACK, LESSON 3) and how beside it, smaller (any key or click), filled in
  army green with paper letters; on a card that asks it is plain, so the card's own
  button stands out. **The one that starts a game is the biggest thing in the foot**:
  START GAME on the orders before the drop, START LESSON 2 on a course's list, in the
  stencil.
- **A card that leads somewhere new goes on only by that button**: the orders before
  the drop, a course's list, PASSED, or by Enter. No other key or click puts it away (the
  operator's, M48: the third time a stray key or click had moved the player on). A
  card that only says something (a turn card, how to play) still goes at any key or
  click, and says so beside its button.

- **The contents page comes first** (§10 Missions), as the annual's contents: the title
  card with PARATROOPER RAIDS BEHIND ENEMY LINES, then each mission as a contents line, its
  title run to its page number with a dotted leader, its place in italic and a line about
  it, its painted panel beside it at 138 × 92 (a panel not yet painted leaves the line
  alone). The card is 980 wide, across the whole table rather than the left page, its
  masthead a slimmer 8:1 strip of the title card (M61, the operator's: bigger; 150 × 100
  ran the fifth mission off the card's foot at 1280 × 800, 120 × 80 looked mean). A mission to come is printed faint and stamped NEXT YEAR'S ANNUAL in red rubber,
  askew; a click on it does nothing. The course is first, and nothing more marks it
  out (M60b, the operator's: START HERE was taken out, as The Practice Ground says it).
  **Where the operator places things by hand** is `data/layout.json` (M48k): the
  clipboard, each mission's drop cue and its rings' notes. `?layout` in the address
  outlines them, dashed in leader blue, to be dragged; a panel's COPY gives the whole
  file to paste over it. **It lies on the bare table**, as the loading page
  does: no mission's map is seen until one is picked, and then that mission's spread is
  under its orders. Only clicking a playable one opens its orders; a key does nothing. `?mission=` skips it. The back page's CONTENTS starts a new game on it.
- **The orders are the first thing seen** after it, and they are short: **what tonight
  asks, never how to play.** The orders card opens under the title card (a painted
  picture of the drop with the title lettered in; drawn in code if the file is missing),
  820 wide, centred, standing off the page on a deep soft shadow while the whole spread
  is put in shade under a coarse halftone. The difficulty is in the black bar at the
  top, because it changes the numbers written below; under it the mission's title (THE
  AIRFIELD) heads the card, with ORDERS · BEFORE THE DROP beside it. Then **five lines
  at most, and one more for a rule only this mission has**: where they are dropping;
  the job in bold, two lines, split at its comma so the EXFIL never stands alone; the
  clock ("Dawn comes at the end of turn 16. Every bang stirs the garrison.", or the
  boat's turn in bold where the way out is a boat); the canisters in bold where there
  are any; the mission's own line in bold where it has one (`words.ordersLine`, M60: the
  heavy water plant's "Not a shot…"); and one Bonus line naming everything that pays extra with its points (the
  bonus targets, the goods train, the salvo, the clean run in the mission's two or three
  words, `words.cleanBonus`, first and in capitals where the clean run is not a shot
  fired, M60); a bonus target that would leave too few charges for the job,
  as the road bridge on Hard's aqueduct, is marked "(no charge to spare)"). At its foot: **Music off** and beside it **Play tips**
  (ticked; in play, Play tips alone), a **HOW TO PLAY [?]** button, and CARRY ON.
  **Play tips are also in the menu** (ART-DIRECTION.md, the spread), to be turned on or off at any time. A card too tall for the window is set tighter a step at a time (less
  air, then 14 px, then 13) before anything is cut.
- **How to play is a card of its own**, at any time: a **?** button beside KEYBOARD, the
  `?` or `/` key, or the orders' button, over a turn card too. It has the orders' place
  and width, headed HOW TO PLAY with the mission's name; its last page, TONIGHT, is
  the run and the jump before the drop, the charges each target needs and what the
  stick carries, the timers, what sets off its neighbours, signalling the boat, the
  goods train, the order of the bangs, and the clean run in the mission's own sentence. A **THE ORDERS** button at its
  foot opens the orders, where in play the level is shown but fixed. Any key or click
  puts either away, laying back down whatever card was under it. It is the reference a
  player asks for; nothing in it is pushed at him. **Since M48i it is six pages, a tab
  each** on a rule under its head, the open one printed solid: MOVING, BEING SEEN,
  CHARGES, FIGHTING, GETTING OUT and TONIGHT. Each of the first five is a small board
  in its printed border (`data/help.json`, drawn by the board's own code, so its
  counters, wash, move line, charge points, fuse watches, blasts and exfil are the
  board's), playing one thing over and over a frame at a time: the pen letters the key
  pressed above the man, a plain arrow is the mouse, and the turn (or SPACE as it ends)
  is lettered in the corner. It is printed in tonight's country (the desert's sand and
  dunes) with tonight's men. Under it at most three lines. TONIGHT is the mission's
  own lines as before. ← and → turn the pages, round from the last to the first; a tab's
  click turns to it; any other key or click puts the card away. Every page is as tall
  as the tallest, so the card does not jump.
- **The counter key** lies beside how to play over the crease, never beside the orders,
  drawn with the board's own counters: one of our men with every mark labelled, the
  leader and the marks a man can wear, and an enemy with its facing, next turn's facing,
  type and marks. Its middle is on the crease where the window has room (at 1280 it sits
  as near as it can without covering the card). WHO sits above NEXT TURN so their
  pointers do not cross, and points at the end of the enemy's name; BLUE AP's pointer
  ends in a blue dot beside the dot it means.
- **A course's orders are a two-page spread** (§15, M48f), wider than the orders (1060
  against 820), under the same title card. **The left page is its list of lessons**,
  set as the contents page is but a line each: a green tick once passed, the title run
  to its number with a dotted leader, at 16 px; a row under the mouse is outlined in
  ink with a red bar down its left, inside the row (the rows are too close for the
  contents page's red shadow). **The right page is the clipboard**, taller than it is
  wide as a real one is (about 3 to 4, the operator's, M48h): a
  brown board with a metal clip at its head and a sheet of the page's paper on it,
  headed TRAINING RECORD in the slab over *No. 1 Parachute Training School*, then a row
  for each qualification (the record zoomed down until it fits the paper, in any
  browser's typewriter face, M48k): a box, ticked in green when it is earned, its name, and
  QUALIFIED or how many of its lessons are passed. With the whole course passed,
  **PASSED OUT** is stamped across the sheet in red rubber, askew, as the contents
  page's stamp is. All of it is drawn in code. No level, no HOW TO PLAY button; Music
  off at its foot beside the green button.
- **The umpire's card** (M48f): in the passing-out exercise, what a thing done would
  have cost on a real mission, on a card headed in red as a warning is: THE UMPIRE, or
  WHISTLE! where it stops the exercise, and ON A REAL MISSION; each thing a line in
  bold capitals (FITCH HAS BEEN SEEN!) and a sentence under it. That exercise's lesson
  card is narrow, 372 px, and says only the job, its heading set at 14 px to stay on
  one line; both charge points wear the pen's ring until each has its charge.
- **The lesson card** lies in the turn card's place while a lesson is on, and no turn
  card is laid: LESSON 3 · ACTION POINTS and STEP 2 OF 4 over a rule, the step's
  sentences, then what goes on from here: **TO GO ON:** and the step's own line in the
  red slab (CLICK BARROW.). **Once the step is done the card stays** and says what is
  now to be seen, with ✓ DONE and a green **NEXT ▶**; the pen's line and rings are gone
  from the board, and what a hover showed stays shown though the mouse has left it
  (the operator's: do it, see it, then NEXT). A step that only shows something has the
  NEXT from the start. Enter is NEXT.
  **In a lesson the action strip shows as buttons only what would do something now**
  (the step's actions; while the card waits on NEXT, the next step's, which then count
  as NEXT); everything else is its key in the small row, and End turn is greyed unless
  it would do something. A lesson at the bridge has its card top left, 400 px wide, clear
  of the charge points and of the timer tin.
  At its foot, small: ◀ STEP BACK (not on the first step), START AGAIN and COURSE
  MENU. After a whistle, **WHISTLE! FITCH was seen. Try that step again.**
  in red above the sentence. Only its buttons take clicks. A click the step does not
  ask for brings the card up again in a small, quick scale-in, as it comes up when it
  appears or its step changes (M54b: the shake read as a telling-off). The step's own line is
  on the board in the red pen, at the hex it is about, with the pen's throbbing ring on
  each hex it names. A ring on a man is wider, round his whole hex, so it frames his
  counter and the parachute beside it, with his line under the ring. A step about a
  part of the page (the roster, the dial, the clock, the readout, the actions) rings
  that part in the same red, throbbing, and its line is on the card only; **the card
  goes to it**, level with a part on the right page or just above one under the map,
  with a red pen arrow from the card to the part. **PASSED** is a card in the same place, headed with the
  qualification: LESSON 3 - Action Points - PASSED., the last word in army green.
- **Turn cards.** At the start of every turn (turn 1 after the drop has been shown) a card
  sits in the bottom right of the map, narrow, with nothing darkened: what happened at the
  turn boundary, most important first, **four lines at most, each with the board's own
  mark for it** as in the turn log (the rest are counted and left to the log), and
  **one hint** worked out from the state (a pure function in `src/hints.js`, numbers
  from `rules.json`): the most pressing thing, in a line or two, with its key. A key
  puts it away and does nothing else, except that a man's number or Tab also selects
  him; a click on one of our men puts it away and selects him, any other click only puts
  it away. A box on the card turns the turn cards off for the session; the orders still
  open on a new game. On turn 1 a mission's own line (`words.firstTurn`, M60: the
  snow) goes under the hint.
- **The RAF diversion** flies the Dakota across the board over the garrison (display only,
  skipped by any key or click), its engines heard half a second first; where the map gives
  a `diversionRun` (the airfield), the vehicle its `art` names (a jeep, guns flashing)
  drives that line on the ground instead; then a card headed
  in the diversion's blue says what it did and what calls are left. Where the mission
  names the leader's device (M60: the heavy water plant's flare pistol), the card, his
  particulars and the hint use it and its verb (`words.diversionDevice`,
  `diversionVerb`, `diversionWorked`, `diversionSpent`), else the radio.
- **The back page** (§10) is headed by the title card, smaller, with the six, the score
  and the rating under it (the rating in green since M58b, the operator's: in red a good
  night read as something gone wrong), and fits the right page at 1280x800 on the longest score
  sheet. Where the clean run is not a shot fired and a man fired (M60), a line under
  the score in the pen's red says who fired first and on what turn
  (`words.firstShotHeard`). PLAY AGAIN and CONTENTS sit side by side at its foot; Play again starts a new
  mission without a reload, and the orders open again.
