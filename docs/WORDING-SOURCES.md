# Wording sheet: where each line lives

For the session that carries the operator's rewording back. Each tag in
`docs/WORDING.md` names its source here: a data file and its key, or the code file
and what builds it. Code lines are listed with example values in ‹›; find them by their
fixed words. The operator does not need this file.

## A. The cover, the contents page and the title cards


### The loading page

- A1 | index.html, the loading page
- A2 | index.html
- A3 | index.html
- A4 | index.html

### The contents page

- A5 | src/main.js GAME_TITLE
- A6 | src/main.js, the contents page subtitle
- A7 | src/main.js, the contents card title
- A8 | src/main.js, the contents card kicker
- A9 | src/main.js, the contents card
- A10 | src/render/ui.js, the stamp on a mission not yet out

### Its line: The Practice Ground

- A11 | data/missions.json `missions[0].flag`
- A12 | data/missions.json `missions[0].title`
- A13 | data/missions.json `missions[0].place`
- A14 | data/missions.json `missions[0].blurb`

### Its line: The Rail Bridge

- A15 | data/missions.json `missions[1].title`
- A16 | data/missions.json `missions[1].place`
- A17 | data/missions.json `missions[1].blurb`

### Its line: The Airfield

- A18 | data/missions.json `missions[2].title`
- A19 | data/missions.json `missions[2].place`
- A20 | data/missions.json `missions[2].blurb`

### Its line: The Aqueduct

- A21 | data/missions.json `missions[3].title`
- A22 | data/missions.json `missions[3].place`
- A23 | data/missions.json `missions[3].blurb`

### The taglines along the foot of each title card

- A24 | data/missions.json `missions[0].tagline`
- A25 | data/missions.json `missions[1].tagline`
- A26 | data/missions.json `missions[2].tagline`
- A27 | data/missions.json `missions[3].tagline`

## B. The orders


### The black bar

- B1 | src/main.js, the orders card
- B2 | data/difficulty.json `levels[0].label`
- B3 | data/difficulty.json `levels[1].label`
- B4 | data/difficulty.json `levels[2].label`

### Above the lines

- B5 | src/main.js, orders kicker
- B6 | src/main.js, orders kicker in play

### The first line: where they are dropping

- B7 | data/missions.json `missions[0].briefing`
- B8 | data/missions.json `missions[1].briefing`
- B9 | data/missions.json `missions[2].briefing`
- B10 | data/missions.json `missions[3].briefing`

### The job and the clock

- B11 | src/main.js, orders job (winWords)
- B12 | src/main.js, orders job, a mission with a count (missions.js winWords)
- B13 | src/main.js, orders job
- B14 | src/main.js, orders clock
- B15 | src/main.js, orders clock where the way out is a boat
- B16 | src/main.js, orders canister line

### The bonus line

- B17 | src/main.js, orders Bonus line (extras)
- B18 | src/main.js, orders Bonus line, the airfield salvo
- B19 | src/main.js, orders Bonus line, after a bonus target the stick cannot afford (M53)
- B20 | src/main.js, the fallback for words.cleanBonus
- B21 | data/missions.json `missions[0].words.cleanBonus`
- B22 | data/missions.json `missions[1].words.cleanBonus`
- B23 | data/missions.json `missions[2].words.cleanBonus`
- B24 | data/missions.json `missions[3].words.cleanBonus`

### At its foot

- B25 | src/main.js, orders back button
- B26 | src/main.js, orders tick box
- B27 | src/main.js, orders tick box
- B28 | src/main.js, orders button
- B29 | src/main.js, orders go button
- B30 | src/main.js, under START GAME
- B31 | src/render/ui.js, the go button of an orders card opened in play

### The difficulty rollovers

- B32 | data/difficulty.json `levels[0].summary`
- B33 | data/difficulty.json `levels[1].summary`
- B34 | data/difficulty.json `levels[2].summary`
- B35 | src/render/ui.js, difficulty option rollover
- B36 | src/render/ui.js, difficulty rollover in play

### What each level does to one mission (said before the level’s own line)

- B37 | data/missions.json `missions[1].levels.easy.summary`
- B38 | data/missions.json `missions[1].levels.hard.summary`
- B39 | data/missions.json `missions[2].levels.easy.summary`
- B40 | data/missions.json `missions[2].levels.hard.summary`
- B41 | data/missions.json `missions[3].levels.easy.summary`
- B42 | data/missions.json `missions[3].levels.hard.summary`

## C. How to play, the keyboard and the counter key


### The card

- C1 | src/main.js, help card title
- C2 | src/main.js, help card link
- C3 | src/main.js, help card go
- C4 | src/main.js, the ? button
- C5 | src/main.js, the ? button rollover

### Page: MOVING

- C6 | data/help.json `pages[0].tab`
- C7 | data/help.json `pages[0].lines[0]`
- C8 | data/help.json `pages[0].lines[1]`
- C9 | data/help.json `pages[0].lines[2]`

### Page: BEING SEEN

- C10 | data/help.json `pages[1].tab`
- C11 | data/help.json `pages[1].lines[0]`
- C12 | data/help.json `pages[1].lines[1]`
- C13 | data/help.json `pages[1].lines[2]`

### Page: CHARGES

- C14 | data/help.json `pages[2].tab`
- C15 | data/help.json `pages[2].lines[0]`
- C16 | data/help.json `pages[2].lines[1].text`
- C17 | data/help.json `pages[2].lines[2].text`
- C18 | data/help.json `pages[2].lines[3]`
- C19 | data/help.json `pages[2].scene.objective.label`

### Page: FIGHTING

- C20 | data/help.json `pages[3].tab`
- C21 | data/help.json `pages[3].lines[0]`
- C22 | data/help.json `pages[3].lines[1]`
- C23 | data/help.json `pages[3].lines[2].text`
- C24 | data/help.json `pages[3].lines[3].text`

### Page: GETTING OUT

- C25 | data/help.json `pages[4].tab`
- C26 | data/help.json `pages[4].lines[0]`
- C27 | data/help.json `pages[4].lines[1]`

### Page: TONIGHT

- C28 | data/help.json `pages[5].tab`
- C29 | src/main.js, TONIGHT (before the drop)
- C30 | src/main.js, TONIGHT needs
- C31 | src/main.js, TONIGHT, a mission with canisters, in place of “The squad carries”
- C32 | src/main.js, TONIGHT cut line
- C33 | src/main.js timerLine
- C34 | src/main.js salvoWords, after the timer line on the airfield
- C35 | src/main.js setterLines
- C36 | src/main.js, TONIGHT boat
- C37 | src/main.js, TONIGHT train (trainDue)
- C38 | src/main.js, TONIGHT last line
- C39 | data/missions.json `missions[0].words.cleanOrders`
- C40 | data/missions.json `missions[1].words.cleanOrders`
- C41 | data/missions.json `missions[2].words.cleanOrders`
- C42 | data/missions.json `missions[3].words.cleanOrders`

### KEYBOARD (the button’s rollover)

- C43 | src/render/ui.js KEYS heading; index.html button
- C44 | src/render/ui.js KEYS
- C45 | src/render/ui.js KEYS
- C46 | src/render/ui.js KEYS
- C47 | src/render/ui.js KEYS
- C48 | src/render/ui.js KEYS
- C49 | src/render/ui.js KEYS
- C50 | src/render/ui.js KEYS
- C51 | src/render/ui.js KEYS
- C52 | src/render/ui.js KEYS
- C53 | src/render/ui.js KEYS
- C54 | src/render/ui.js KEYS
- C55 | src/render/ui.js KEYS
- C56 | src/render/ui.js KEYS
- C57 | src/render/ui.js KEYS
- C58 | src/render/ui.js KEYS
- C59 | src/render/ui.js KEYS
- C60 | src/render/ui.js KEYS
- C61 | src/render/ui.js KEYS
- C62 | src/render/ui.js KEYS
- C63 | src/render/ui.js KEYS
- C64 | src/render/ui.js KEYS
- C65 | src/render/ui.js KEYS
- C66 | src/render/ui.js KEYS
- C67 | src/render/ui.js renderKeys

### HOW TO READ A COUNTER (the counter key)

- C68 | index.html
- C69 | index.html
- C70 | src/render/board.js, the counter key (about line 3284)
- C71 | src/render/board.js, the counter key (about line 3284)
- C72 | src/render/board.js, the counter key (about line 3284)
- C73 | src/render/board.js, the counter key (about line 3284)
- C74 | src/render/board.js, the counter key (about line 3284)
- C75 | src/render/board.js, the counter key (about line 3284)
- C76 | src/render/board.js, the counter key (about line 3284)
- C77 | src/render/board.js, the counter key (about line 3284)
- C78 | src/render/board.js, the counter key (about line 3284)
- C79 | src/render/board.js, the counter key (about line 3284)
- C80 | src/render/board.js, the counter key (about line 3284)
- C81 | src/render/board.js, the counter key (about line 3284)
- C82 | src/render/board.js, the counter key (about line 3284)
- C83 | src/render/board.js, the counter key (about line 3284)
- C84 | src/render/board.js, the counter key (about line 3284)
- C85 | src/render/board.js, the counter key (about line 3284)
- C86 | src/render/board.js, the counter key (about line 3284)
- C87 | src/render/board.js, the counter key (about line 3284)
- C88 | src/render/board.js, the counter key (about line 3284)

## D. The drop


### On the board and the right page before the jump

- D1 | src/render/ui.js / src/main.js, right page heading
- D2 | src/render/ui.js, the big button
- D3 | src/render/ui.js, the big button where there is one run
- D4 | src/render/ui.js, the big button once a run is picked
- D5 | src/render/ui.js, under the drop runs
- D6 | src/render/ui.js, the readout before the drop
- D7 | src/state.js, the diversion button before the drop

### The red pen before the jump (Play tips)

- D8 | src/render/board.js
- D9 | src/render/board.js
- D10 | src/render/board.js
- D11 | src/render/board.js

### A run’s button rollover

- D12 | src/render/ui.js run rollover title
- D13 | src/render/ui.js run rollover
- D14 | src/render/ui.js
- D15 | src/render/ui.js
- D16 | src/main.js, the readout with a run picked

### Hovering the ground before the jump

- D17 | src/main.js drop readout
- D18 | src/main.js drop readout
- D19 | src/main.js drop readout
- D20 | src/main.js drop readout
- D21 | src/main.js drop readout
- D22 | src/main.js drop readout

### The runs: The Practice Ground

- D23 | data/map-training.json `dropRuns[0].label`
- D24 | data/map-training.json `dropRuns[0].tag`
- D25 | data/map-training.json `dropRuns[0].description`

### The runs: The Rail Bridge

- D26 | data/map.json `dropRuns[0].label`
- D27 | data/map.json `dropRuns[0].tag`
- D28 | data/map.json `dropRuns[0].description`
- D29 | data/map.json `dropRuns[1].label`
- D30 | data/map.json `dropRuns[1].tag`
- D31 | data/map.json `dropRuns[1].description`
- D32 | data/map.json `dropRuns[2].label`
- D33 | data/map.json `dropRuns[2].tag`
- D34 | data/map.json `dropRuns[2].description`

### The runs: The Airfield

- D35 | data/map-airfield.json `dropRuns[0].label`
- D36 | data/map-airfield.json `dropRuns[0].tag`
- D37 | data/map-airfield.json `dropRuns[0].description`
- D38 | data/map-airfield.json `dropRuns[1].label`
- D39 | data/map-airfield.json `dropRuns[1].tag`
- D40 | data/map-airfield.json `dropRuns[1].description`
- D41 | data/map-airfield.json `dropRuns[2].label`
- D42 | data/map-airfield.json `dropRuns[2].tag`
- D43 | data/map-airfield.json `dropRuns[2].description`

### The runs: The Aqueduct

- D44 | data/map-aqueduct.json `dropRuns[0].label`
- D45 | data/map-aqueduct.json `dropRuns[0].tag`
- D46 | data/map-aqueduct.json `dropRuns[0].description`
- D47 | data/map-aqueduct.json `dropRuns[1].label`
- D48 | data/map-aqueduct.json `dropRuns[1].tag`
- D49 | data/map-aqueduct.json `dropRuns[1].description`
- D50 | data/map-aqueduct.json `dropRuns[2].label`
- D51 | data/map-aqueduct.json `dropRuns[2].tag`
- D52 | data/map-aqueduct.json `dropRuns[2].description`

## E. The map: names, stamps and the garrison’s cries


### Names on the map: The Practice Ground

- E1 | data/map-training.json `name`
- E2 | data/map-training.json `places[0].name`
- E3 | data/map-training.json `places[1].name`
- E4 | data/map-training.json `places[2].name`
- E5 | data/map-training.json `places[3].name`
- E6 | data/map-training.json `places[4].name`
- E7 | data/map-training.json `objectives[0].label`
- E8 | data/map-training.json `enemies[0].label`
- E9 | data/map-training.json `enemies[1].label`
- E10 | data/map-training.json `reserve.label`
- E11 | data/map-training.json `reinforcements.label`

### Names on the map: The Rail Bridge

- E12 | data/map.json `name`
- E13 | data/map.json `places[0].name`
- E14 | data/map.json `places[1].name`
- E15 | data/map.json `places[2].name`
- E16 | data/map.json `places[3].name`
- E17 | data/map.json `places[4].name`
- E18 | data/map.json `places[5].name`
- E19 | data/map.json `objectives[0].label`
- E20 | data/map.json `objectives[1].label`
- E21 | data/map.json `objectives[2].label`
- E22 | data/map.json `enemies[0].label`
- E23 | data/map.json `enemies[1].label`
- E24 | data/map.json `enemies[2].label`
- E25 | data/map.json `enemies[3].label`
- E26 | data/map.json `enemies[4].label`
- E27 | data/map.json `enemies[5].label`
- E28 | data/map.json `enemies[6].label`
- E29 | data/map.json `enemies[7].label`
- E30 | data/map.json `reserve.label`
- E31 | data/map.json `reinforcements.label`

### Names on the map: The Airfield

- E32 | data/map-airfield.json `name`
- E33 | data/map-airfield.json `places[0].name`
- E34 | data/map-airfield.json `places[1].name`
- E35 | data/map-airfield.json `places[2].name`
- E36 | data/map-airfield.json `places[3].name`
- E37 | data/map-airfield.json `objectives[0].label`
- E38 | data/map-airfield.json `objectives[4].label`
- E39 | data/map-airfield.json `objectives[8].label`
- E40 | data/map-airfield.json `objectives[9].label`
- E41 | data/map-airfield.json `objectives[10].label`
- E42 | data/map-airfield.json `enemies[0].label`
- E43 | data/map-airfield.json `enemies[1].label`
- E44 | data/map-airfield.json `enemies[2].label`
- E45 | data/map-airfield.json `enemies[3].label`
- E46 | data/map-airfield.json `enemies[4].label`
- E47 | data/map-airfield.json `enemies[5].label`
- E48 | data/map-airfield.json `enemies[6].label`
- E49 | data/map-airfield.json `enemies[7].label`
- E50 | data/map-airfield.json `enemies[8].label`
- E51 | data/map-airfield.json `enemies[9].label`
- E52 | data/map-airfield.json `enemies[10].label`
- E53 | data/map-airfield.json `reserve.label`
- E54 | data/map-airfield.json `reinforcements.label`

### Names on the map: The Aqueduct

- E55 | data/map-aqueduct.json `name`
- E56 | data/map-aqueduct.json `places[0].name`
- E57 | data/map-aqueduct.json `places[1].name`
- E58 | data/map-aqueduct.json `places[2].name`
- E59 | data/map-aqueduct.json `places[3].name`
- E60 | data/map-aqueduct.json `objectives[0].label`
- E61 | data/map-aqueduct.json `objectives[1].label`
- E62 | data/map-aqueduct.json `enemies[0].label`
- E63 | data/map-aqueduct.json `enemies[1].label`
- E64 | data/map-aqueduct.json `enemies[2].label`
- E65 | data/map-aqueduct.json `enemies[3].label`
- E66 | data/map-aqueduct.json `enemies[4].label`
- E67 | data/map-aqueduct.json `enemies[5].label`
- E68 | data/map-aqueduct.json `reserve.label`
- E69 | data/map-aqueduct.json `reinforcements.label`

### What kind of enemy (the counter’s word)

- E70 | data/enemies.json `types.sentry.label`
- E71 | data/enemies.json `types.patrol.label`
- E72 | data/enemies.json `types.reserve.label`
- E73 | data/enemies.json `types.reserve.counterLabel`
- E74 | data/missions.json `missions[2].enemies.types.vehicle.label`
- E75 | data/missions.json `missions[2].enemies.types.vehicle.counterLabel`
- E76 | data/lessons-training.json, start.enemies[].label in lessons 2, 5–9, 12–13, 15
- E77 | data/lessons-training.json, lesson 17 start.enemies[].label

### Target names in the rules (used where the map has none)

- E78 | data/rules.json `objectives.bridge.label`
- E79 | data/rules.json `objectives.exchange.label`
- E80 | data/rules.json `objectives.fuelDump.label`
- E81 | data/missions.json `missions[1].rules.train.label`
- E82 | data/missions.json `missions[2].rules.objectives.aircraft.label`
- E83 | data/missions.json `missions[2].rules.objectives.bowser.label`
- E84 | data/missions.json `missions[2].rules.objectives.bombStore.label`
- E85 | data/missions.json `missions[2].rules.objectives.signals.label`
- E86 | data/missions.json `missions[3].rules.objectives.aqueduct.label`
- E87 | data/missions.json `missions[3].rules.objectives.roadBridge.label`

### Stamped on the board

- E88 | src/render/board.js
- E89 | src/main.js, the exfil’s label where it is a boat
- E90 | src/render/board.js, the primary target’s name
- E91 | src/render/theme.js
- E92 | src/render/theme.js
- E93 | src/render/theme.js, the silenced shot
- E94 | src/render/theme.js
- E95 | src/render/theme.js, the board’s corner
- E96 | src/render/board.js
- E97 | src/render/board.js, over a man shot
- E98 | src/render/board.js, over a man pinned
- E99 | src/render/board.js, on an enemy counter
- E100 | src/render/board.js, the playback of the night on the back page
- E101 | src/render/board.js, the playback

### Noise stamps

- E102 | src/render/theme.js, noise stamp
- E103 | src/render/theme.js, noise stamp
- E104 | src/render/theme.js, noise stamp
- E105 | src/render/theme.js, noise stamp
- E106 | src/render/theme.js, noise stamp
- E107 | src/render/theme.js, noise stamp

### The red pen on the board (Play tips)

- E108 | src/main.js cue
- E109 | src/main.js cue
- E110 | src/main.js cue
- E111 | src/main.js cue
- E112 | src/main.js cue
- E113 | src/main.js cue
- E114 | src/main.js cue
- E115 | src/main.js cue
- E116 | src/main.js target banner (one target)
- E117 | src/main.js target banner (a count)
- E118 | src/main.js, a bonus target’s banner
- E119 | src/main.js chargeCount
- E120 | src/main.js banner
- E121 | src/main.js banner
- E122 | src/main.js banner payoff
- E123 | src/main.js banner payoff
- E124 | src/main.js banner
- E125 | src/main.js banner
- E126 | src/main.js exfil banner
- E127 | src/main.js exfil banner on a boat mission
- E128 | src/main.js, over a target with its last charge (CHARGE IS SET. for one)
- E129 | src/main.js, the tin’s heading
- E130 | src/main.js countWord

### The garrison’s cries: The Practice Ground

- E131 | data/missions.json `missions[0].words.cries.spotted[0]`
- E132 | data/missions.json `missions[0].words.cries.spotted[1]`
- E133 | data/missions.json `missions[0].words.cries.spotted[2]`
- E134 | data/missions.json `missions[0].words.cries.found[0]`
- E135 | data/missions.json `missions[0].words.cries.found[1]`
- E136 | data/missions.json `missions[0].words.cries.found[2]`

### The garrison’s cries: The Rail Bridge

- E137 | data/missions.json `missions[1].words.cries.spotted[0]`
- E138 | data/missions.json `missions[1].words.cries.spotted[1]`
- E139 | data/missions.json `missions[1].words.cries.spotted[2]`
- E140 | data/missions.json `missions[1].words.cries.found[0]`
- E141 | data/missions.json `missions[1].words.cries.found[1]`
- E142 | data/missions.json `missions[1].words.cries.found[2]`

### The garrison’s cries: The Airfield

- E143 | data/missions.json `missions[2].words.cries.spotted[0]`
- E144 | data/missions.json `missions[2].words.cries.spotted[1]`
- E145 | data/missions.json `missions[2].words.cries.spotted[2]`
- E146 | data/missions.json `missions[2].words.cries.found[0]`
- E147 | data/missions.json `missions[2].words.cries.found[1]`
- E148 | data/missions.json `missions[2].words.cries.found[2]`

### The garrison’s cries: The Aqueduct

- E149 | data/missions.json `missions[3].words.cries.spotted[0]`
- E150 | data/missions.json `missions[3].words.cries.spotted[1]`
- E151 | data/missions.json `missions[3].words.cries.spotted[2]`
- E152 | data/missions.json `missions[3].words.cries.found[0]`
- E153 | data/missions.json `missions[3].words.cries.found[1]`
- E154 | data/missions.json `missions[3].words.cries.found[2]`

## F. The men


### Names and roles

- F1 | data/roster.json `troopers[0].name`
- F2 | data/roster.json `troopers[0].shortName`
- F3 | data/roster.json `troopers[1].name`
- F4 | data/roster.json `troopers[1].shortName`
- F5 | data/roster.json `troopers[2].name`
- F6 | data/roster.json `troopers[2].shortName`
- F7 | data/roster.json `troopers[3].name`
- F8 | data/roster.json `troopers[3].shortName`
- F9 | data/roster.json `troopers[4].name`
- F10 | data/roster.json `troopers[4].shortName`
- F11 | data/roster.json `troopers[5].name`
- F12 | data/roster.json `troopers[5].shortName`
- F13 | data/rules.json `roles.sapper.label`
- F14 | data/rules.json `roles.scout.label`
- F15 | data/rules.json `roles.gunner.label`

### Traits

- F16 | data/traits.json `traits.steady-hands.name`
- F17 | data/traits.json `traits.steady-hands.description`
- F18 | data/traits.json `traits.quick-work.name`
- F19 | data/traits.json `traits.quick-work.description`
- F20 | data/traits.json `traits.cats-eyes.name`
- F21 | data/traits.json `traits.cats-eyes.description`
- F22 | data/traits.json `traits.treetops.name`
- F23 | data/traits.json `traits.treetops.description`
- F24 | data/traits.json `traits.cool-head.name`
- F25 | data/traits.json `traits.cool-head.description`
- F26 | data/traits.json `traits.ox.name`
- F27 | data/traits.json `traits.ox.description`

### Traits in numbers (on each man’s row)

- F28 | src/render/ui.js describeEffect
- F29 | src/render/ui.js describeEffect
- F30 | src/render/ui.js describeEffect
- F31 | src/render/ui.js describeEffect
- F32 | src/render/ui.js describeEffect
- F33 | src/render/ui.js describeEffect
- F34 | src/render/ui.js describeEffect
- F35 | src/render/ui.js describeEffect
- F36 | src/render/ui.js STAT_WORDS, for a trait on any other number

### The roster rail

- F37 | src/render/roster.js
- F38 | src/render/roster.js
- F39 | src/render/roster.js
- F40 | src/render/roster.js (‹2› charges)
- F41 | src/render/roster.js
- F42 | src/render/roster.js, Dutch’s row
- F43 | src/render/roster.js, status stamp
- F44 | src/render/roster.js, status stamp
- F45 | src/render/roster.js, status stamp
- F46 | src/render/roster.js, status stamp
- F47 | src/render/roster.js, status stamp
- F48 | src/render/roster.js, status stamp

### A man’s rollover on the rail

- F49 | src/render/roster.js
- F50 | src/render/roster.js
- F51 | src/render/roster.js
- F52 | src/render/roster.js
- F53 | src/render/roster.js
- F54 | src/render/roster.js
- F55 | src/render/roster.js
- F56 | src/render/roster.js
- F57 | src/render/roster.js
- F58 | src/render/roster.js
- F59 | src/render/roster.js
- F60 | src/render/roster.js, Dutch dead
- F61 | src/render/roster.js
- F62 | src/render/roster.js
- F63 | src/render/roster.js

### A man’s particulars (the readout when he is selected)

- F64 | src/render/roster.js particulars
- F65 | src/render/roster.js particulars
- F66 | src/render/roster.js particulars
- F67 | src/render/roster.js particulars
- F68 | src/render/roster.js particulars
- F69 | src/render/roster.js particulars
- F70 | src/render/roster.js particulars
- F71 | src/render/roster.js particulars
- F72 | src/render/roster.js particulars
- F73 | src/render/roster.js particulars
- F74 | src/render/roster.js particulars heading
- F75 | src/main.js, the leader’s dashed ring
- F76 | src/main.js, hovering the ring

### What the men say (every mission unless replaced below)

- F77 | data/roster.json `troopers[0].dialogue.onLand`
- F77b | data/roster.json `troopers[0].dialogue.onLand[1]`
- F77c | data/roster.json `troopers[0].dialogue.onLand[2]`
- F78 | data/roster.json `troopers[0].dialogue.onPlaceCharge`
- F78b | data/roster.json `troopers[0].dialogue.onPlaceCharge[1]`
- F78c | data/roster.json `troopers[0].dialogue.onPlaceCharge[2]`
- F79 | data/roster.json `troopers[0].dialogue.onWounded`
- F79b | data/roster.json `troopers[0].dialogue.onWounded[1]`
- F79c | data/roster.json `troopers[0].dialogue.onWounded[2]`
- F80 | data/roster.json `troopers[0].dialogue.onWoundedCarrying`
- F80b | data/roster.json `troopers[0].dialogue.onWoundedCarrying[1]`
- F80c | data/roster.json `troopers[0].dialogue.onWoundedCarrying[2]`
- F81 | data/roster.json `troopers[0].dialogue.onKill`
- F81b | data/roster.json `troopers[0].dialogue.onKill[1]`
- F81c | data/roster.json `troopers[0].dialogue.onKill[2]`
- F82 | data/roster.json `troopers[0].dialogue.onSpotted`
- F82b | data/roster.json `troopers[0].dialogue.onSpotted[1]`
- F82c | data/roster.json `troopers[0].dialogue.onSpotted[2]`
- F83 | data/roster.json `troopers[0].dialogue.onHide`
- F83b | data/roster.json `troopers[0].dialogue.onHide[1]`
- F83c | data/roster.json `troopers[0].dialogue.onHide[2]`
- F84 | data/roster.json `troopers[1].dialogue.onLand`
- F84b | data/roster.json `troopers[1].dialogue.onLand[1]`
- F84c | data/roster.json `troopers[1].dialogue.onLand[2]`
- F85 | data/roster.json `troopers[1].dialogue.onPlaceCharge`
- F85b | data/roster.json `troopers[1].dialogue.onPlaceCharge[1]`
- F85c | data/roster.json `troopers[1].dialogue.onPlaceCharge[2]`
- F86 | data/roster.json `troopers[1].dialogue.onWounded`
- F86b | data/roster.json `troopers[1].dialogue.onWounded[1]`
- F86c | data/roster.json `troopers[1].dialogue.onWounded[2]`
- F87 | data/roster.json `troopers[1].dialogue.onWoundedCarrying`
- F87b | data/roster.json `troopers[1].dialogue.onWoundedCarrying[1]`
- F87c | data/roster.json `troopers[1].dialogue.onWoundedCarrying[2]`
- F88 | data/roster.json `troopers[1].dialogue.onKill`
- F88b | data/roster.json `troopers[1].dialogue.onKill[1]`
- F88c | data/roster.json `troopers[1].dialogue.onKill[2]`
- F89 | data/roster.json `troopers[1].dialogue.onSpotted`
- F89b | data/roster.json `troopers[1].dialogue.onSpotted[1]`
- F89c | data/roster.json `troopers[1].dialogue.onSpotted[2]`
- F90 | data/roster.json `troopers[1].dialogue.onHide`
- F90b | data/roster.json `troopers[1].dialogue.onHide[1]`
- F90c | data/roster.json `troopers[1].dialogue.onHide[2]`
- F91 | data/roster.json `troopers[2].dialogue.onLand`
- F91b | data/roster.json `troopers[2].dialogue.onLand[1]`
- F91c | data/roster.json `troopers[2].dialogue.onLand[2]`
- F92 | data/roster.json `troopers[2].dialogue.onPlaceCharge`
- F92b | data/roster.json `troopers[2].dialogue.onPlaceCharge[1]`
- F92c | data/roster.json `troopers[2].dialogue.onPlaceCharge[2]`
- F93 | data/roster.json `troopers[2].dialogue.onWounded`
- F93b | data/roster.json `troopers[2].dialogue.onWounded[1]`
- F93c | data/roster.json `troopers[2].dialogue.onWounded[2]`
- F94 | data/roster.json `troopers[2].dialogue.onKill`
- F94b | data/roster.json `troopers[2].dialogue.onKill[1]`
- F94c | data/roster.json `troopers[2].dialogue.onKill[2]`
- F95 | data/roster.json `troopers[2].dialogue.onSpotted`
- F95b | data/roster.json `troopers[2].dialogue.onSpotted[1]`
- F95c | data/roster.json `troopers[2].dialogue.onSpotted[2]`
- F96 | data/roster.json `troopers[2].dialogue.onHide`
- F96b | data/roster.json `troopers[2].dialogue.onHide[1]`
- F96c | data/roster.json `troopers[2].dialogue.onHide[2]`
- F97 | data/roster.json `troopers[3].dialogue.onLand`
- F97b | data/roster.json `troopers[3].dialogue.onLand[1]`
- F97c | data/roster.json `troopers[3].dialogue.onLand[2]`
- F98 | data/roster.json `troopers[3].dialogue.onPlaceCharge`
- F98b | data/roster.json `troopers[3].dialogue.onPlaceCharge[1]`
- F98c | data/roster.json `troopers[3].dialogue.onPlaceCharge[2]`
- F99 | data/roster.json `troopers[3].dialogue.onWounded`
- F99b | data/roster.json `troopers[3].dialogue.onWounded[1]`
- F99c | data/roster.json `troopers[3].dialogue.onWounded[2]`
- F100 | data/roster.json `troopers[3].dialogue.onKill`
- F100b | data/roster.json `troopers[3].dialogue.onKill[1]`
- F100c | data/roster.json `troopers[3].dialogue.onKill[2]`
- F101 | data/roster.json `troopers[3].dialogue.onSpotted`
- F101b | data/roster.json `troopers[3].dialogue.onSpotted[1]`
- F101c | data/roster.json `troopers[3].dialogue.onSpotted[2]`
- F102 | data/roster.json `troopers[3].dialogue.onHide`
- F102b | data/roster.json `troopers[3].dialogue.onHide[1]`
- F102c | data/roster.json `troopers[3].dialogue.onHide[2]`
- F103 | data/roster.json `troopers[4].dialogue.onLand`
- F103b | data/roster.json `troopers[4].dialogue.onLand[1]`
- F103c | data/roster.json `troopers[4].dialogue.onLand[2]`
- F104 | data/roster.json `troopers[4].dialogue.onPlaceCharge`
- F104b | data/roster.json `troopers[4].dialogue.onPlaceCharge[1]`
- F104c | data/roster.json `troopers[4].dialogue.onPlaceCharge[2]`
- F105 | data/roster.json `troopers[4].dialogue.onWounded`
- F105b | data/roster.json `troopers[4].dialogue.onWounded[1]`
- F105c | data/roster.json `troopers[4].dialogue.onWounded[2]`
- F106 | data/roster.json `troopers[4].dialogue.onKill`
- F106b | data/roster.json `troopers[4].dialogue.onKill[1]`
- F106c | data/roster.json `troopers[4].dialogue.onKill[2]`
- F107 | data/roster.json `troopers[4].dialogue.onSpotted`
- F107b | data/roster.json `troopers[4].dialogue.onSpotted[1]`
- F107c | data/roster.json `troopers[4].dialogue.onSpotted[2]`
- F108 | data/roster.json `troopers[4].dialogue.onHide`
- F108b | data/roster.json `troopers[4].dialogue.onHide[1]`
- F108c | data/roster.json `troopers[4].dialogue.onHide[2]`
- F109 | data/roster.json `troopers[5].dialogue.onLand`
- F109b | data/roster.json `troopers[5].dialogue.onLand[1]`
- F109c | data/roster.json `troopers[5].dialogue.onLand[2]`
- F110 | data/roster.json `troopers[5].dialogue.onPlaceCharge`
- F110b | data/roster.json `troopers[5].dialogue.onPlaceCharge[1]`
- F110c | data/roster.json `troopers[5].dialogue.onPlaceCharge[2]`
- F111 | data/roster.json `troopers[5].dialogue.onWounded`
- F111b | data/roster.json `troopers[5].dialogue.onWounded[1]`
- F111c | data/roster.json `troopers[5].dialogue.onWounded[2]`
- F112 | data/roster.json `troopers[5].dialogue.onWoundedCarrying`
- F112b | data/roster.json `troopers[5].dialogue.onWoundedCarrying[1]`
- F112c | data/roster.json `troopers[5].dialogue.onWoundedCarrying[2]`
- F113 | data/roster.json `troopers[5].dialogue.onKill`
- F113b | data/roster.json `troopers[5].dialogue.onKill[1]`
- F113c | data/roster.json `troopers[5].dialogue.onKill[2]`
- F114 | data/roster.json `troopers[5].dialogue.onSpotted`
- F114b | data/roster.json `troopers[5].dialogue.onSpotted[1]`
- F114c | data/roster.json `troopers[5].dialogue.onSpotted[2]`
- F115 | data/roster.json `troopers[5].dialogue.onHide`
- F115b | data/roster.json `troopers[5].dialogue.onHide[1]`
- F115c | data/roster.json `troopers[5].dialogue.onHide[2]`

### What the men say instead: The Practice Ground

- F116 | data/missions.json `missions[0].dialogue.holloway.onLand`
- F117 | data/missions.json `missions[0].dialogue.fitch.onLand`
- F118 | data/missions.json `missions[0].dialogue.vance.onLand`
- F119 | data/missions.json `missions[0].dialogue.barrow.onLand`
- F120 | data/missions.json `missions[0].dialogue.speers.onLand`
- F121 | data/missions.json `missions[0].dialogue.nunn.onLand`

### What the men say instead: The Airfield

- F122 | data/missions.json `missions[2].dialogue.fitch.onLand`
- F122b | data/missions.json `missions[2].dialogue.fitch.onLand[1]`
- F122c | data/missions.json `missions[2].dialogue.fitch.onLand[2]`
- F123 | data/missions.json `missions[2].dialogue.fitch.onHide`
- F123b | data/missions.json `missions[2].dialogue.fitch.onHide[1]`
- F123c | data/missions.json `missions[2].dialogue.fitch.onHide[2]`
- F124 | data/missions.json `missions[2].dialogue.vance.onLand`
- F124b | data/missions.json `missions[2].dialogue.vance.onLand[1]`
- F124c | data/missions.json `missions[2].dialogue.vance.onLand[2]`
- F125 | data/missions.json `missions[2].dialogue.barrow.onLand`
- F125b | data/missions.json `missions[2].dialogue.barrow.onLand[1]`
- F125c | data/missions.json `missions[2].dialogue.barrow.onLand[2]`
- F126 | data/missions.json `missions[2].dialogue.barrow.onWounded`
- F126b | data/missions.json `missions[2].dialogue.barrow.onWounded[1]`
- F126c | data/missions.json `missions[2].dialogue.barrow.onWounded[2]`
- F127 | data/missions.json `missions[2].dialogue.barrow.onHide`
- F127b | data/missions.json `missions[2].dialogue.barrow.onHide[1]`
- F127c | data/missions.json `missions[2].dialogue.barrow.onHide[2]`

### What the men say instead: The Aqueduct

- F128 | data/missions.json `missions[3].dialogue.fitch.onLand`
- F128b | data/missions.json `missions[3].dialogue.fitch.onLand[1]`
- F128c | data/missions.json `missions[3].dialogue.fitch.onLand[2]`
- F129 | data/missions.json `missions[3].dialogue.vance.onLand`
- F129b | data/missions.json `missions[3].dialogue.vance.onLand[1]`
- F129c | data/missions.json `missions[3].dialogue.vance.onLand[2]`
- F130 | data/missions.json `missions[3].dialogue.barrow.onLand`
- F130b | data/missions.json `missions[3].dialogue.barrow.onLand[1]`
- F130c | data/missions.json `missions[3].dialogue.barrow.onLand[2]`
- F131 | data/missions.json `missions[3].dialogue.barrow.onWounded`
- F131b | data/missions.json `missions[3].dialogue.barrow.onWounded[1]`
- F131c | data/missions.json `missions[3].dialogue.barrow.onWounded[2]`
- F132 | data/missions.json `missions[3].dialogue.nunn.onLand`
- F132b | data/missions.json `missions[3].dialogue.nunn.onLand[1]`
- F132c | data/missions.json `missions[3].dialogue.nunn.onLand[2]`

## G. The right page and the margin


### Alert dial

- G1 | src/render/ui.js
- G2 | data/rules.json `alert.states[0].label`
- G3 | data/rules.json `alert.states[1].label`
- G4 | data/rules.json `alert.states[2].label`
- G5 | data/rules.json `alert.states[3].label`
- G6 | src/render/ui.js, under the dial
- G7 | src/render/ui.js
- G8 | src/render/ui.js
- G9 | src/render/ui.js, dial rollover, a line per state
- G10 | src/render/ui.js + src/main.js alert.sources
- G11 | src/render/ui.js
- G12 | src/render/ui.js

### The diversion button

- G13 | data/missions.json `missions[0].words.diversionName`
- G14 | data/missions.json `missions[1].words.diversionName`
- G15 | data/missions.json `missions[2].words.diversionName`
- G16 | data/missions.json `missions[3].words.diversionName`
- G17 | src/render/ui.js
- G18 | src/render/ui.js
- G19 | src/render/ui.js describeDiversion
- G20 | src/state.js reason
- G21 | src/state.js reason
- G22 | src/state.js reason

### Mission briefing box

- G23 | index.html
- G24 | src/render/ui.js
- G25 | src/render/ui.js
- G26 | src/render/ui.js, rollover
- G27 | src/render/ui.js, rollover
- G28 | src/main.js
- G29 | src/render/ui.js
- G30 | src/render/ui.js, rollover
- G31 | src/main.js, a target’s rollover
- G32 | src/main.js
- G33 | src/main.js, a count’s rollover
- G34 | src/main.js, the train’s line
- G35 | src/main.js
- G36 | src/main.js, the boat’s rollover
- G37 | src/main.js

### The big button and undo

- G38 | src/render/ui.js
- G39 | src/render/ui.js
- G40 | src/render/ui.js
- G41 | src/render/ui.js
- G42 | src/render/ui.js
- G43 | src/render/ui.js (Easy)
- G44 | src/render/ui.js
- G45 | src/render/ui.js
- G46 | src/render/ui.js
- G47 | src/render/ui.js
- G48 | src/render/ui.js, the actions strip with nobody selected

### The menu (the gear)

- G49 | index.html
- G50 | index.html rollover
- G51 | src/render/ui.js
- G52 | index.html rollover
- G53 | src/render/ui.js
- G54 | index.html rollover
- G55 | src/render/ui.js
- G56 | index.html rollover
- G57 | src/main.js, the Play tips rollover on the orders
- G58 | src/render/ui.js
- G59 | index.html rollover
- G60 | src/render/ui.js
- G61 | index.html rollover

### The margin

- G62 | src/render/ui.js
- G63 | src/render/ui.js
- G64 | src/render/ui.js
- G65 | src/render/ui.js
- G66 | src/render/ui.js

## H. The actions strip


### Buttons

- H1 | src/main.js actionsFor
- H2 | src/main.js actionsFor
- H3 | src/main.js actionsFor
- H4 | src/main.js actionsFor
- H5 | src/main.js actionsFor
- H6 | src/main.js actionsFor
- H7 | src/main.js actionsFor
- H8 | src/main.js actionsFor
- H9 | src/main.js actionsFor
- H10 | src/main.js actionsFor
- H11 | src/main.js actionsFor
- H12 | src/main.js actionsFor
- H13 | src/main.js actionsFor
- H14 | src/main.js actionsFor
- H15 | src/main.js actionsFor
- H16 | src/render/ui.js, a greyed button’s rollover title
- H17 | src/render/ui.js
- H18 | src/main.js costs

### Rollovers

- H19 | src/main.js Hide
- H20 | src/main.js Return fire
- H21 | src/main.js Suppress
- H22 | src/main.js Knife (knifeNoiseWords, knifeTurnWords, killScoreWords)
- H23 | src/main.js knifeNoiseWords, where the knife is heard
- H24 | src/main.js knifeTurnWords, where the knife is not a full turn
- H25 | src/main.js Kill
- H26 | src/main.js Throw stone
- H27 | src/main.js Stabilise
- H28 | src/main.js Signal boat
- H29 | src/main.js Board boat
- H30 | src/main.js Pack chute
- H31 | src/main.js Pick up (weightFor)
- H32 | src/main.js Pass charge (weightWords)
- H33 | src/main.js Place charge
- H34 | src/main.js Place charge with timers
- H35 | src/main.js Place charge cost
- H36 | src/main.js Place charge warning
- H37 | src/main.js cutLineHelp
- H38 | src/main.js Cut the line cost
- H39 | src/main.js Swim
- H40 | data/missions.json `missions[0].words.lineGoesDead`
- H41 | data/missions.json `missions[0].words.lineIsDown`
- H42 | data/missions.json `missions[1].words.lineGoesDead`
- H43 | data/missions.json `missions[1].words.lineIsDown`
- H44 | data/missions.json `missions[2].words.lineGoesDead`
- H45 | data/missions.json `missions[2].words.lineIsDown`
- H46 | data/missions.json `missions[3].words.lineGoesDead`
- H47 | data/missions.json `missions[3].words.lineIsDown`

### Why an action cannot be done

- H48 | src/units.js / src/main.js check reasons
- H49 | src/units.js / src/main.js check reasons
- H50 | src/units.js / src/main.js check reasons
- H51 | src/units.js / src/main.js check reasons
- H52 | src/units.js / src/main.js check reasons
- H53 | src/units.js / src/main.js check reasons
- H54 | src/units.js / src/main.js check reasons
- H55 | src/units.js / src/main.js check reasons
- H56 | src/units.js / src/main.js check reasons
- H57 | src/units.js / src/main.js check reasons
- H58 | src/units.js / src/main.js check reasons
- H59 | src/units.js / src/main.js check reasons
- H60 | src/units.js / src/main.js check reasons
- H61 | src/units.js / src/main.js check reasons
- H62 | src/units.js / src/main.js check reasons
- H63 | src/units.js / src/main.js check reasons
- H64 | src/units.js / src/main.js check reasons
- H65 | src/units.js / src/main.js check reasons
- H66 | src/units.js / src/main.js check reasons
- H67 | src/units.js / src/main.js check reasons
- H68 | src/units.js / src/main.js check reasons
- H69 | src/units.js / src/main.js check reasons
- H70 | src/units.js / src/main.js check reasons
- H71 | src/units.js / src/main.js check reasons
- H72 | src/units.js / src/main.js check reasons
- H73 | src/units.js / src/main.js check reasons
- H74 | src/units.js / src/main.js check reasons
- H75 | src/units.js / src/main.js check reasons
- H76 | src/units.js / src/main.js check reasons
- H77 | src/units.js / src/main.js check reasons
- H78 | src/units.js / src/main.js check reasons
- H79 | src/units.js / src/main.js check reasons
- H80 | src/units.js / src/main.js check reasons
- H81 | src/units.js / src/main.js check reasons
- H82 | src/units.js / src/main.js check reasons
- H83 | src/units.js / src/main.js check reasons
- H84 | src/units.js / src/main.js check reasons
- H85 | src/units.js / src/main.js check reasons
- H86 | src/units.js / src/main.js check reasons
- H87 | src/units.js / src/main.js check reasons
- H88 | src/sabotage.js check reasons
- H89 | src/sabotage.js check reasons
- H90 | src/sabotage.js check reasons
- H91 | src/sabotage.js check reasons
- H92 | src/sabotage.js check reasons
- H93 | src/sabotage.js check reasons
- H94 | src/sabotage.js check reasons
- H95 | src/sabotage.js check reasons
- H96 | src/sabotage.js check reasons
- H97 | src/sabotage.js check reasons
- H98 | src/sabotage.js check reasons
- H99 | src/sabotage.js check reasons
- H100 | src/sabotage.js check reasons
- H101 | src/sabotage.js check reasons
- H102 | src/sabotage.js check reasons
- H103 | src/sabotage.js check reasons
- H104 | src/sabotage.js check reasons
- H105 | src/sabotage.js check reasons
- H106 | src/sabotage.js check reasons
- H107 | src/sabotage.js check reasons
- H108 | src/sabotage.js check reasons
- H109 | src/sabotage.js check reasons
- H110 | src/sabotage.js check reasons
- H111 | src/sabotage.js check reasons
- H112 | src/sabotage.js check reasons
- H113 | src/main.js, in a lesson

## I. The hover readout


### Ground

- I1 | src/render/ui.js
- I2 | src/render/ui.js
- I3 | src/render/ui.js terrain line
- I4 | data/terrain.json types.*.cover
- I5 | data/terrain.json `types.field.label`
- I6 | data/terrain.json `types.track.label`
- I7 | data/terrain.json `types.hedgerow.label`
- I8 | data/terrain.json `types.wood.label`
- I9 | data/terrain.json `types.orchard.label`
- I10 | data/terrain.json `types.marsh.label`
- I11 | data/terrain.json `types.canal.label`
- I12 | data/terrain.json `types.ridge.label`
- I13 | data/terrain.json `types.farmhouse.label`
- I14 | data/terrain.json `types.emplacement.label`
- I15 | data/terrain.json `types.bridge.label`
- I16 | data/terrain.json `types.lock.label`
- I17 | data/terrain.json `types.depot.label`
- I18 | data/terrain.json `types.sand.label`
- I19 | data/terrain.json `types.scrub.label`
- I20 | data/terrain.json `types.dunes.label`
- I21 | data/terrain.json `types.wadi.label`
- I22 | data/terrain.json `types.wire.label`
- I23 | data/terrain.json `types.strip.label`
- I24 | data/terrain.json `types.pen.label`
- I25 | data/terrain.json `types.aircraft.label`
- I26 | data/terrain.json `types.camp.label`
- I27 | data/terrain.json `types.hillside.label`
- I28 | data/terrain.json `types.crag.label`
- I29 | data/terrain.json `types.ravine.label`
- I30 | data/terrain.json `types.terrace.label`
- I31 | data/terrain.json `types.olives.label`
- I32 | data/terrain.json `types.plough.label`
- I33 | data/terrain.json `types.aqueduct.label`
- I34 | data/terrain.json `types.arch.label`
- I35 | data/terrain.json `types.shingle.label`
- I36 | data/terrain.json `types.rocks.label`
- I37 | data/terrain.json `types.sea.label`

### Moving a man

- I38 | src/render/ui.js
- I39 | src/render/ui.js
- I40 | src/render/ui.js
- I41 | src/render/ui.js
- I42 | src/render/ui.js
- I43 | src/render/ui.js
- I44 | src/main.js
- I45 | src/render/board.js, on the path
- I46 | src/render/ui.js
- I47 | src/render/ui.js
- I48 | src/render/ui.js
- I49 | src/render/ui.js
- I50 | src/render/ui.js
- I51 | src/render/ui.js
- I52 | src/render/ui.js
- I53 | src/render/ui.js, the detection row
- I54 | src/render/ui.js describeDetection
- I55 | src/render/board.js, the dots on the board

### Place words (filled into many lines)

- I56 | src/render/ui.js placeName

### The other rows

- I57 | src/render/ui.js / src/main.js readout row headings
- I58 | src/render/ui.js / src/main.js readout row headings
- I59 | src/render/ui.js / src/main.js readout row headings
- I60 | src/render/ui.js / src/main.js readout row headings
- I61 | src/render/ui.js / src/main.js readout row headings
- I62 | src/render/ui.js / src/main.js readout row headings
- I63 | src/render/ui.js / src/main.js readout row headings
- I64 | src/render/ui.js / src/main.js readout row headings
- I65 | src/render/ui.js / src/main.js readout row headings
- I66 | src/render/ui.js / src/main.js readout row headings
- I67 | src/render/ui.js / src/main.js readout row headings
- I68 | src/render/ui.js / src/main.js readout row headings
- I69 | src/render/ui.js / src/main.js readout row headings
- I70 | src/render/ui.js / src/main.js readout row headings
- I71 | src/render/ui.js / src/main.js readout row headings
- I72 | src/render/ui.js / src/main.js readout row headings
- I73 | src/render/ui.js / src/main.js readout row headings
- I74 | src/render/ui.js / src/main.js readout row headings
- I75 | src/render/ui.js / src/main.js readout row headings
- I76 | src/render/ui.js / src/main.js readout row headings
- I77 | src/render/ui.js / src/main.js readout row headings
- I78 | src/render/ui.js / src/main.js readout row headings
- I79 | src/render/ui.js / src/main.js readout row headings
- I80 | src/render/ui.js / src/main.js readout row headings
- I81 | src/render/ui.js / src/main.js readout row headings
- I82 | src/render/ui.js / src/main.js readout row headings
- I83 | src/render/ui.js / src/main.js readout row headings
- I84 | src/render/ui.js / src/main.js readout row headings
- I85 | src/render/ui.js / src/main.js readout row headings
- I86 | src/main.js
- I87 | src/main.js
- I88 | src/main.js
- I89 | src/main.js
- I90 | src/main.js
- I91 | src/main.js hideEffect
- I92 | src/main.js hideEffect
- I93 | src/main.js hideEffect
- I94 | src/main.js hideEffect
- I95 | src/main.js hideEffect

### A parachute

- I96 | src/main.js
- I97 | src/main.js
- I98 | src/main.js

### A canister

- I99 | src/main.js
- I100 | src/main.js
- I101 | src/main.js
- I102 | src/main.js
- I103 | src/main.js

### The exfil

- I104 | src/main.js
- I105 | src/main.js
- I106 | src/main.js
- I107 | src/main.js
- I108 | src/main.js
- I109 | src/main.js

### A target

- I110 | src/main.js
- I111 | src/main.js
- I112 | src/main.js
- I113 | src/main.js chargesOnPoints
- I114 | src/main.js
- I115 | src/main.js
- I116 | src/main.js
- I117 | src/main.js
- I118 | src/main.js blastWords
- I119 | src/main.js
- I120 | src/main.js
- I121 | src/main.js
- I122 | src/main.js
- I123 | src/main.js
- I124 | src/main.js
- I125 | src/main.js payoffWords
- I126 | src/main.js payoffWords
- I127 | src/main.js payoffWords
- I128 | src/main.js setsOffWords
- I129 | src/main.js

### The goods train

- I130 | src/main.js
- I131 | src/main.js

### An enemy

- I132 | src/render/ui.js
- I133 | src/render/ui.js
- I134 | src/render/ui.js
- I135 | src/render/ui.js
- I136 | src/render/ui.js
- I137 | src/render/ui.js
- I138 | src/render/ui.js
- I139 | src/render/ui.js
- I140 | src/render/ui.js
- I141 | src/main.js
- I142 | src/render/ui.js
- I143 | src/render/ui.js
- I144 | src/main.js
- I145 | src/main.js
- I146 | src/main.js
- I147 | src/render/ui.js

### Noises and searches

- I148 | src/main.js
- I149 | src/main.js noise words
- I150 | src/main.js
- I151 | src/main.js

### Aiming (after pressing an action’s key)

- I152 | src/main.js
- I153 | src/main.js
- I154 | src/main.js
- I155 | src/main.js, the verb
- I156 | src/main.js
- I157 | src/main.js (bodyFoundWords on Hard)
- I158 | src/main.js
- I159 | src/main.js
- I160 | src/main.js knifeNoiseWords (hover)
- I161 | src/main.js
- I162 | src/main.js
- I163 | src/main.js
- I164 | src/main.js
- I165 | src/main.js
- I166 | src/main.js
- I167 | src/main.js
- I168 | src/main.js
- I169 | src/main.js
- I170 | src/main.js
- I171 | src/main.js
- I172 | src/main.js, any aim that cannot be done
- I173 | src/main.js
- I174 | src/main.js
- I175 | src/main.js

## J. Cards in play


### The turn card

- J1 | src/main.js
- J2 | src/main.js
- J3 | src/main.js, first turn card
- J4 | src/main.js
- J5 | src/main.js / src/render/ui.js
- J6 | src/main.js
- J7 | src/main.js
- J8 | src/render/ui.js tick box

### WHAT NEXT: the hints

- J9 | src/hints.js
- J10 | src/hints.js
- J11 | src/hints.js
- J12 | src/hints.js
- J13 | src/hints.js
- J14 | src/hints.js
- J15 | src/hints.js
- J16 | src/hints.js
- J17 | src/hints.js
- J18 | src/hints.js
- J19 | src/hints.js
- J20 | src/hints.js
- J21 | src/hints.js
- J22 | src/hints.js
- J23 | src/hints.js
- J24 | src/hints.js
- J25 | src/hints.js
- J26 | src/hints.js
- J27 | src/hints.js
- J28 | src/hints.js
- J29 | src/hints.js
- J30 | src/hints.js
- J31 | src/hints.js
- J32 | src/hints.js
- J33 | src/hints.js
- J34 | src/hints.js

### Status cards

- J35 | src/main.js
- J36 | src/main.js
- J37 | src/main.js (fireBackWords)
- J38 | src/main.js fireBackWords, where there is no return fire
- J39 | src/main.js
- J40 | src/main.js
- J41 | src/main.js
- J42 | src/main.js
- J43 | src/main.js
- J44 | src/main.js
- J45 | src/main.js
- J46 | src/main.js
- J47 | src/main.js
- J48 | src/main.js
- J49 | src/main.js
- J50 | src/main.js
- J51 | src/main.js
- J52 | src/main.js
- J53 | src/main.js

### The diversion card

- J54 | data/missions.json `missions[0].words.diversionKicker`
- J55 | data/missions.json `missions[1].words.diversionKicker`
- J56 | data/missions.json `missions[2].words.diversionKicker`
- J57 | data/missions.json `missions[3].words.diversionKicker`
- J58 | src/main.js
- J59 | src/main.js
- J60 | src/main.js
- J61 | src/main.js
- J62 | src/main.js
- J63 | src/main.js
- J64 | src/main.js
- J65 | src/main.js
- J66 | src/main.js
- J67 | src/main.js

### The time pencils (setting a charge’s timer)

- J68 | src/render/ui.js
- J69 | src/render/ui.js, on the tin
- J70 | src/render/ui.js, on the tin
- J71 | src/render/ui.js, a pencil
- J72 | src/render/ui.js
- J73 | src/render/ui.js
- J74 | src/render/ui.js
- J75 | src/render/ui.js
- J76 | src/main.js
- J77 | src/main.js
- J78 | src/main.js
- J79 | src/main.js
- J80 | src/main.js
- J81 | src/main.js
- J82 | src/main.js
- J83 | src/main.js
- J84 | src/main.js
- J85 | src/main.js, under a pencil

### Asking first

- J86 | src/main.js
- J87 | src/main.js
- J88 | src/main.js
- J89 | src/main.js
- J90 | src/main.js
- J91 | src/main.js
- J92 | src/main.js
- J93 | src/main.js
- J94 | src/main.js
- J95 | src/main.js
- J96 | src/main.js
- J97 | src/main.js
- J98 | src/main.js
- J99 | src/main.js
- J100 | src/main.js
- J101 | src/main.js
- J102 | src/main.js

## K. The report under the map (the turn log)

- K1 | src/render/ui.js
- K2 | src/render/ui.js
- K3 | src/render/ui.js
- K4 | src/render/ui.js

### The landing

- K5 | src/render/ui.js
- K6 | src/render/ui.js
- K7 | src/render/ui.js (Treetops)
- K8 | src/render/ui.js (drowned, if already wounded)
- K9 | src/render/ui.js

### The night

- K10 | src/render/ui.js describeEvent
- K11 | src/render/ui.js describeEvent
- K12 | src/render/ui.js describeEvent
- K13 | src/render/ui.js describeEvent
- K14 | src/render/ui.js describeEvent
- K15 | src/render/ui.js describeEvent
- K16 | src/render/ui.js describeEvent
- K17 | src/render/ui.js describeEvent
- K18 | src/render/ui.js describeEvent
- K19 | src/render/ui.js describeEvent
- K20 | src/render/ui.js describeEvent
- K21 | src/render/ui.js describeEvent
- K22 | src/render/ui.js describeEvent
- K23 | src/render/ui.js describeEvent
- K24 | src/render/ui.js describeEvent
- K25 | src/render/ui.js describeEvent
- K26 | src/render/ui.js describeEvent
- K27 | src/render/ui.js describeEvent
- K28 | src/render/ui.js describeEvent
- K29 | src/render/ui.js describeEvent
- K30 | src/render/ui.js describeEvent
- K31 | src/render/ui.js describeEvent
- K32 | src/render/ui.js describeEvent
- K33 | src/render/ui.js describeEvent
- K34 | src/render/ui.js describeEvent
- K35 | src/render/ui.js describeEvent
- K36 | src/render/ui.js describeEvent
- K37 | src/render/ui.js describeEvent
- K38 | src/render/ui.js describeEvent
- K39 | src/render/ui.js describeEvent
- K40 | src/render/ui.js describeEvent
- K41 | src/render/ui.js describeEvent
- K42 | src/render/ui.js describeEvent
- K43 | src/render/ui.js describeEvent
- K44 | src/render/ui.js describeEvent
- K45 | data/missions.json `missions[0].words.diversionLog`
- K46 | data/missions.json `missions[1].words.diversionLog`
- K47 | data/missions.json `missions[2].words.diversionLog`
- K48 | data/missions.json `missions[3].words.diversionLog`

## L. The back page

- L1 | src/render/ui.js
- L2 | src/render/ui.js
- L3 | src/render/ui.js
- L4 | src/render/ui.js
- L5 | src/render/ui.js, the men’s fates

### Why it ended

- L6 | src/scoring.js
- L7 | src/scoring.js
- L8 | src/scoring.js
- L9 | src/scoring.js
- L10 | src/scoring.js
- L11 | src/scoring.js
- L12 | src/scoring.js
- L13 | src/scoring.js
- L14 | src/scoring.js
- L15 | src/scoring.js

### The score

- L16 | src/render/ui.js
- L17 | src/scoring.js
- L18 | src/scoring.js
- L19 | src/scoring.js
- L20 | src/scoring.js
- L21 | src/scoring.js
- L22 | src/scoring.js
- L23 | src/scoring.js
- L24 | src/scoring.js
- L25 | src/scoring.js
- L26 | src/scoring.js
- L27 | src/scoring.js
- L28 | src/scoring.js

### The rating

- L29 | src/render/ui.js
- L30 | src/render/ui.js
- L31 | data/missions.json `missions[1].ratings[0].label`
- L32 | data/missions.json `missions[1].ratings[1].label`
- L33 | data/missions.json `missions[1].ratings[2].label`
- L34 | data/missions.json `missions[1].ratings[3].label`
- L35 | data/missions.json `missions[2].ratings[0].label`
- L36 | data/missions.json `missions[2].ratings[1].label`
- L37 | data/missions.json `missions[2].ratings[2].label`
- L38 | data/missions.json `missions[2].ratings[3].label`
- L39 | data/missions.json `missions[3].ratings[0].label`
- L40 | data/missions.json `missions[3].ratings[1].label`
- L41 | data/missions.json `missions[3].ratings[2].label`
- L42 | data/missions.json `missions[3].ratings[3].label`

### Its buttons

- L43 | src/render/ui.js
- L44 | src/render/ui.js

## M. The comic panels

- M1a | data/missions.json `missions[1].comicPanels.dakota.caption`
- M1 | data/missions.json `missions[1].comicPanels.landing.caption`
- M2 | data/missions.json `missions[1].comicPanels.success.caption`
- M3a | data/missions.json `missions[2].comicPanels.dakota.caption`
- M3 | data/missions.json `missions[2].comicPanels.landing.caption`
- M4 | data/missions.json `missions[2].comicPanels.success.caption`
- M5a | data/missions.json `missions[3].comicPanels.dakota.caption`
- M5 | data/missions.json `missions[3].comicPanels.landing.caption`
- M6 | data/missions.json `missions[3].comicPanels.success.caption`

## N. The training course


### The course card and record

- N1 | src/main.js
- N2 | src/main.js
- N3 | src/main.js
- N4 | src/main.js
- N5 | src/render/ui.js
- N6 | src/render/ui.js
- N7 | src/render/ui.js
- N8 | src/render/ui.js

### The lesson card

- N9 | src/render/ui.js
- N10 | src/render/ui.js
- N11 | src/render/ui.js
- N12 | src/render/ui.js
- N13 | src/render/ui.js
- N14 | src/render/ui.js
- N15 | src/render/ui.js
- N16 | src/render/ui.js
- N17 | src/render/ui.js
- N18 | src/main.js, a step done
- N19 | src/main.js stepName
- N20 | src/main.js

### The umpire’s card

- N21 | src/main.js
- N22 | src/main.js
- N23 | src/lessons.js
- N24 | src/lessons.js
- N25 | src/lessons.js
- N26 | src/lessons.js
- N27 | src/lessons.js
- N28 | src/lessons.js
- N29 | src/lessons.js
- N30 | src/lessons.js
- N31 | src/lessons.js
- N32 | src/lessons.js

### A lesson passed

- N33 | src/main.js
- N34 | src/main.js
- N35 | src/main.js
- N36 | src/main.js
- N37 | src/main.js
- N38 | src/main.js

### Lesson 1: The drop

- N39 | data/lessons-training.json `lessons[0].title`
- N40 | data/lessons-training.json `lessons[0].qualification`
- N41 | data/lessons-training.json `lessons[0].steps[0].say`
- N42 | data/lessons-training.json `lessons[0].steps[0].tell`
- N43 | data/lessons-training.json `lessons[0].steps[0].then`
- N44 | data/lessons-training.json `lessons[0].steps[1].say`
- N45 | data/lessons-training.json `lessons[0].steps[1].tell`
- N46 | data/lessons-training.json `lessons[0].steps[1].then`
- N47 | data/lessons-training.json `lessons[0].steps[2].say`
- N48 | data/lessons-training.json `lessons[0].steps[2].tell`
- N49 | data/lessons-training.json `lessons[0].steps[2].then`
- N50 | data/lessons-training.json `lessons[0].steps[3].say`
- N51 | data/lessons-training.json `lessons[0].steps[3].tell`
- N52 | data/lessons-training.json `lessons[0].steps[4].say`
- N53 | data/lessons-training.json `lessons[0].steps[4].tell`
- N54 | data/lessons-training.json `lessons[0].steps[5].say`
- N55 | data/lessons-training.json `lessons[0].steps[5].tell`
- N56 | data/lessons-training.json `lessons[0].steps[5].then`

### Lesson 2: Parachutes

- N57 | data/lessons-training.json `lessons[1].title`
- N58 | data/lessons-training.json `lessons[1].qualification`
- N59 | data/lessons-training.json `lessons[1].steps[0].say`
- N60 | data/lessons-training.json `lessons[1].steps[0].tell`
- N61 | data/lessons-training.json `lessons[1].steps[0].then`
- N62 | data/lessons-training.json `lessons[1].steps[1].say`
- N63 | data/lessons-training.json `lessons[1].steps[1].tell`
- N64 | data/lessons-training.json `lessons[1].steps[1].then`
- N65 | data/lessons-training.json `lessons[1].steps[2].say`
- N66 | data/lessons-training.json `lessons[1].steps[2].tell`
- N67 | data/lessons-training.json `lessons[1].steps[2].then`
- N68 | data/lessons-training.json `lessons[1].steps[3].say`
- N69 | data/lessons-training.json `lessons[1].steps[3].tell`
- N70 | data/lessons-training.json `lessons[1].steps[3].then`
- N71 | data/lessons-training.json `lessons[1].steps[4].say`
- N72 | data/lessons-training.json `lessons[1].steps[4].tell`
- N73 | data/lessons-training.json `lessons[1].steps[4].then`

### Lesson 3: Action points

- N74 | data/lessons-training.json `lessons[2].title`
- N75 | data/lessons-training.json `lessons[2].qualification`
- N76 | data/lessons-training.json `lessons[2].steps[0].say`
- N77 | data/lessons-training.json `lessons[2].steps[0].tell`
- N78 | data/lessons-training.json `lessons[2].steps[0].then`
- N79 | data/lessons-training.json `lessons[2].steps[1].say`
- N80 | data/lessons-training.json `lessons[2].steps[1].tell`
- N81 | data/lessons-training.json `lessons[2].steps[1].then`
- N82 | data/lessons-training.json `lessons[2].steps[2].say`
- N83 | data/lessons-training.json `lessons[2].steps[2].tell`
- N84 | data/lessons-training.json `lessons[2].steps[2].then`
- N85 | data/lessons-training.json `lessons[2].steps[3].say`
- N86 | data/lessons-training.json `lessons[2].steps[3].tell`
- N87 | data/lessons-training.json `lessons[2].steps[3].then`

### Lesson 4: Ground

- N88 | data/lessons-training.json `lessons[3].title`
- N89 | data/lessons-training.json `lessons[3].qualification`
- N90 | data/lessons-training.json `lessons[3].steps[0].say`
- N91 | data/lessons-training.json `lessons[3].steps[0].tell`
- N92 | data/lessons-training.json `lessons[3].steps[0].then`
- N93 | data/lessons-training.json `lessons[3].steps[1].say`
- N94 | data/lessons-training.json `lessons[3].steps[1].tell`
- N95 | data/lessons-training.json `lessons[3].steps[1].then`
- N96 | data/lessons-training.json `lessons[3].steps[2].say`
- N97 | data/lessons-training.json `lessons[3].steps[2].tell`
- N98 | data/lessons-training.json `lessons[3].steps[2].then`
- N99 | data/lessons-training.json `lessons[3].steps[3].say`
- N100 | data/lessons-training.json `lessons[3].steps[3].tell`
- N101 | data/lessons-training.json `lessons[3].steps[3].then`
- N102 | data/lessons-training.json `lessons[3].steps[4].say`
- N103 | data/lessons-training.json `lessons[3].steps[4].tell`
- N104 | data/lessons-training.json `lessons[3].steps[4].then`

### Lesson 5: Seen and not seen

- N105 | data/lessons-training.json `lessons[4].title`
- N106 | data/lessons-training.json `lessons[4].qualification`
- N107 | data/lessons-training.json `lessons[4].steps[0].say`
- N108 | data/lessons-training.json `lessons[4].steps[0].tell`
- N109 | data/lessons-training.json `lessons[4].steps[0].then`
- N110 | data/lessons-training.json `lessons[4].steps[1].say`
- N111 | data/lessons-training.json `lessons[4].steps[1].tell`
- N112 | data/lessons-training.json `lessons[4].steps[1].then`
- N113 | data/lessons-training.json `lessons[4].steps[2].say`
- N114 | data/lessons-training.json `lessons[4].steps[2].tell`
- N115 | data/lessons-training.json `lessons[4].steps[2].then`
- N116 | data/lessons-training.json `lessons[4].steps[3].say`
- N117 | data/lessons-training.json `lessons[4].steps[3].tell`
- N118 | data/lessons-training.json `lessons[4].steps[3].then`
- N119 | data/lessons-training.json `lessons[4].steps[4].say`
- N120 | data/lessons-training.json `lessons[4].steps[4].tell`
- N121 | data/lessons-training.json `lessons[4].steps[4].then`
- N122 | data/lessons-training.json `lessons[4].steps[5].say`
- N123 | data/lessons-training.json `lessons[4].steps[5].tell`
- N124 | data/lessons-training.json `lessons[4].steps[5].then`
- N125 | data/lessons-training.json `lessons[4].steps[6].say`
- N126 | data/lessons-training.json `lessons[4].steps[6].tell`
- N127 | data/lessons-training.json `lessons[4].steps[6].then`
- N128 | data/lessons-training.json `lessons[4].steps[7].say`
- N129 | data/lessons-training.json `lessons[4].steps[7].tell`
- N130 | data/lessons-training.json `lessons[4].steps[7].then`
- N131 | data/lessons-training.json `lessons[4].steps[8].say`
- N132 | data/lessons-training.json `lessons[4].steps[8].tell`
- N133 | data/lessons-training.json `lessons[4].steps[8].then`

### Lesson 6: Watching the garrison

- N134 | data/lessons-training.json `lessons[5].title`
- N135 | data/lessons-training.json `lessons[5].qualification`
- N136 | data/lessons-training.json `lessons[5].steps[0].say`
- N137 | data/lessons-training.json `lessons[5].steps[0].tell`
- N138 | data/lessons-training.json `lessons[5].steps[0].then`
- N139 | data/lessons-training.json `lessons[5].steps[1].say`
- N140 | data/lessons-training.json `lessons[5].steps[1].tell`
- N141 | data/lessons-training.json `lessons[5].steps[1].then`
- N142 | data/lessons-training.json `lessons[5].steps[2].say`
- N143 | data/lessons-training.json `lessons[5].steps[2].tell`
- N144 | data/lessons-training.json `lessons[5].steps[2].then`
- N145 | data/lessons-training.json `lessons[5].steps[3].say`
- N146 | data/lessons-training.json `lessons[5].steps[3].tell`
- N147 | data/lessons-training.json `lessons[5].steps[3].then`
- N148 | data/lessons-training.json `lessons[5].steps[4].say`
- N149 | data/lessons-training.json `lessons[5].steps[4].tell`
- N150 | data/lessons-training.json `lessons[5].steps[4].then`
- N151 | data/lessons-training.json `lessons[5].steps[5].say`
- N152 | data/lessons-training.json `lessons[5].steps[5].tell`
- N153 | data/lessons-training.json `lessons[5].steps[5].then`

### Lesson 7: The knife

- N154 | data/lessons-training.json `lessons[6].title`
- N155 | data/lessons-training.json `lessons[6].qualification`
- N156 | data/lessons-training.json `lessons[6].steps[0].say`
- N157 | data/lessons-training.json `lessons[6].steps[0].tell`
- N158 | data/lessons-training.json `lessons[6].steps[0].then`
- N159 | data/lessons-training.json `lessons[6].steps[1].say`
- N160 | data/lessons-training.json `lessons[6].steps[1].tell`
- N161 | data/lessons-training.json `lessons[6].steps[1].then`
- N162 | data/lessons-training.json `lessons[6].steps[2].say`
- N163 | data/lessons-training.json `lessons[6].steps[2].tell`
- N164 | data/lessons-training.json `lessons[6].steps[2].then`
- N165 | data/lessons-training.json `lessons[6].steps[3].say`
- N166 | data/lessons-training.json `lessons[6].steps[3].tell`
- N167 | data/lessons-training.json `lessons[6].steps[3].then`

### Lesson 8: The gunner

- N168 | data/lessons-training.json `lessons[7].title`
- N169 | data/lessons-training.json `lessons[7].qualification`
- N170 | data/lessons-training.json `lessons[7].steps[0].say`
- N171 | data/lessons-training.json `lessons[7].steps[0].tell`
- N172 | data/lessons-training.json `lessons[7].steps[0].then`
- N173 | data/lessons-training.json `lessons[7].steps[1].say`
- N174 | data/lessons-training.json `lessons[7].steps[1].tell`
- N175 | data/lessons-training.json `lessons[7].steps[1].then`
- N176 | data/lessons-training.json `lessons[7].steps[2].say`
- N177 | data/lessons-training.json `lessons[7].steps[2].tell`
- N178 | data/lessons-training.json `lessons[7].steps[2].then`
- N179 | data/lessons-training.json `lessons[7].steps[3].say`
- N180 | data/lessons-training.json `lessons[7].steps[3].tell`
- N181 | data/lessons-training.json `lessons[7].steps[3].then`

### Lesson 9: Firing back

- N182 | data/lessons-training.json `lessons[8].title`
- N183 | data/lessons-training.json `lessons[8].qualification`
- N184 | data/lessons-training.json `lessons[8].steps[0].say`
- N185 | data/lessons-training.json `lessons[8].steps[0].tell`
- N186 | data/lessons-training.json `lessons[8].steps[0].then`
- N187 | data/lessons-training.json `lessons[8].steps[1].say`
- N188 | data/lessons-training.json `lessons[8].steps[1].tell`
- N189 | data/lessons-training.json `lessons[8].steps[1].then`
- N190 | data/lessons-training.json `lessons[8].steps[2].say`
- N191 | data/lessons-training.json `lessons[8].steps[2].tell`
- N192 | data/lessons-training.json `lessons[8].steps[2].then`
- N193 | data/lessons-training.json `lessons[8].steps[3].say`
- N194 | data/lessons-training.json `lessons[8].steps[3].tell`
- N195 | data/lessons-training.json `lessons[8].steps[3].then`

### Lesson 10: Charges: fetch and carry

- N196 | data/lessons-training.json `lessons[9].title`
- N197 | data/lessons-training.json `lessons[9].qualification`
- N198 | data/lessons-training.json `lessons[9].steps[0].say`
- N199 | data/lessons-training.json `lessons[9].steps[0].tell`
- N200 | data/lessons-training.json `lessons[9].steps[0].then`
- N201 | data/lessons-training.json `lessons[9].steps[1].say`
- N202 | data/lessons-training.json `lessons[9].steps[1].tell`
- N203 | data/lessons-training.json `lessons[9].steps[1].then`
- N204 | data/lessons-training.json `lessons[9].steps[2].say`
- N205 | data/lessons-training.json `lessons[9].steps[2].tell`
- N206 | data/lessons-training.json `lessons[9].steps[2].then`
- N207 | data/lessons-training.json `lessons[9].steps[3].say`
- N208 | data/lessons-training.json `lessons[9].steps[3].tell`
- N209 | data/lessons-training.json `lessons[9].steps[3].then`
- N210 | data/lessons-training.json `lessons[9].steps[4].say`
- N211 | data/lessons-training.json `lessons[9].steps[4].tell`
- N212 | data/lessons-training.json `lessons[9].steps[4].then`

### Lesson 11: Charges: set and get clear

- N213 | data/lessons-training.json `lessons[10].title`
- N214 | data/lessons-training.json `lessons[10].qualification`
- N215 | data/lessons-training.json `lessons[10].steps[0].say`
- N216 | data/lessons-training.json `lessons[10].steps[0].tell`
- N217 | data/lessons-training.json `lessons[10].steps[0].then`
- N218 | data/lessons-training.json `lessons[10].steps[1].say`
- N219 | data/lessons-training.json `lessons[10].steps[1].tell`
- N220 | data/lessons-training.json `lessons[10].steps[1].then`
- N221 | data/lessons-training.json `lessons[10].steps[2].say`
- N222 | data/lessons-training.json `lessons[10].steps[2].tell`
- N223 | data/lessons-training.json `lessons[10].steps[2].then`
- N224 | data/lessons-training.json `lessons[10].steps[3].say`
- N225 | data/lessons-training.json `lessons[10].steps[3].tell`
- N226 | data/lessons-training.json `lessons[10].steps[3].then`
- N227 | data/lessons-training.json `lessons[10].steps[4].say`
- N228 | data/lessons-training.json `lessons[10].steps[4].tell`
- N229 | data/lessons-training.json `lessons[10].steps[4].then`
- N230 | data/lessons-training.json `lessons[10].steps[5].say`
- N231 | data/lessons-training.json `lessons[10].steps[5].tell`
- N232 | data/lessons-training.json `lessons[10].steps[5].then`
- N233 | data/lessons-training.json `lessons[10].steps[6].say`
- N234 | data/lessons-training.json `lessons[10].steps[6].tell`
- N235 | data/lessons-training.json `lessons[10].steps[6].then`
- N236 | data/lessons-training.json `lessons[10].steps[7].say`
- N237 | data/lessons-training.json `lessons[10].steps[7].tell`
- N238 | data/lessons-training.json `lessons[10].steps[7].then`
- N239 | data/lessons-training.json `lessons[10].steps[8].say`
- N240 | data/lessons-training.json `lessons[10].steps[8].tell`
- N241 | data/lessons-training.json `lessons[10].steps[8].then`
- N242 | data/lessons-training.json `lessons[10].steps[9].say`
- N243 | data/lessons-training.json `lessons[10].steps[9].tell`
- N244 | data/lessons-training.json `lessons[10].steps[9].then`

### Lesson 12: The leader

- N245 | data/lessons-training.json `lessons[11].title`
- N246 | data/lessons-training.json `lessons[11].qualification`
- N247 | data/lessons-training.json `lessons[11].steps[0].say`
- N248 | data/lessons-training.json `lessons[11].steps[0].tell`
- N249 | data/lessons-training.json `lessons[11].steps[0].then`
- N250 | data/lessons-training.json `lessons[11].steps[1].say`
- N251 | data/lessons-training.json `lessons[11].steps[1].tell`
- N252 | data/lessons-training.json `lessons[11].steps[1].then`
- N253 | data/lessons-training.json `lessons[11].steps[2].say`
- N254 | data/lessons-training.json `lessons[11].steps[2].tell`
- N255 | data/lessons-training.json `lessons[11].steps[2].then`
- N256 | data/lessons-training.json `lessons[11].steps[3].say`
- N257 | data/lessons-training.json `lessons[11].steps[3].tell`
- N258 | data/lessons-training.json `lessons[11].steps[3].then`
- N259 | data/lessons-training.json `lessons[11].steps[4].say`
- N260 | data/lessons-training.json `lessons[11].steps[4].tell`
- N261 | data/lessons-training.json `lessons[11].steps[4].then`
- N262 | data/lessons-training.json `lessons[11].steps[5].say`
- N263 | data/lessons-training.json `lessons[11].steps[5].tell`
- N264 | data/lessons-training.json `lessons[11].steps[5].then`
- N265 | data/lessons-training.json `lessons[11].steps[6].say`
- N266 | data/lessons-training.json `lessons[11].steps[6].tell`
- N267 | data/lessons-training.json `lessons[11].steps[6].then`

### Lesson 13: The men

- N268 | data/lessons-training.json `lessons[12].title`
- N269 | data/lessons-training.json `lessons[12].qualification`
- N270 | data/lessons-training.json `lessons[12].steps[0].say`
- N271 | data/lessons-training.json `lessons[12].steps[0].tell`
- N272 | data/lessons-training.json `lessons[12].steps[1].say`
- N273 | data/lessons-training.json `lessons[12].steps[1].tell`
- N274 | data/lessons-training.json `lessons[12].steps[1].then`
- N275 | data/lessons-training.json `lessons[12].steps[2].say`
- N276 | data/lessons-training.json `lessons[12].steps[2].tell`
- N277 | data/lessons-training.json `lessons[12].steps[2].then`
- N278 | data/lessons-training.json `lessons[12].steps[3].say`
- N279 | data/lessons-training.json `lessons[12].steps[3].tell`
- N280 | data/lessons-training.json `lessons[12].steps[3].then`
- N281 | data/lessons-training.json `lessons[12].steps[4].say`
- N282 | data/lessons-training.json `lessons[12].steps[4].tell`
- N283 | data/lessons-training.json `lessons[12].steps[4].then`
- N284 | data/lessons-training.json `lessons[12].steps[5].say`
- N285 | data/lessons-training.json `lessons[12].steps[5].tell`
- N286 | data/lessons-training.json `lessons[12].steps[5].then`
- N287 | data/lessons-training.json `lessons[12].steps[6].say`
- N288 | data/lessons-training.json `lessons[12].steps[6].tell`
- N289 | data/lessons-training.json `lessons[12].steps[6].then`

### Lesson 14: Getting out

- N290 | data/lessons-training.json `lessons[13].title`
- N291 | data/lessons-training.json `lessons[13].qualification`
- N292 | data/lessons-training.json `lessons[13].steps[0].say`
- N293 | data/lessons-training.json `lessons[13].steps[0].tell`
- N294 | data/lessons-training.json `lessons[13].steps[0].then`
- N295 | data/lessons-training.json `lessons[13].steps[1].say`
- N296 | data/lessons-training.json `lessons[13].steps[1].tell`
- N297 | data/lessons-training.json `lessons[13].steps[2].say`
- N298 | data/lessons-training.json `lessons[13].steps[2].tell`
- N299 | data/lessons-training.json `lessons[13].steps[2].then`

### Lesson 15: The alert

- N300 | data/lessons-training.json `lessons[14].title`
- N301 | data/lessons-training.json `lessons[14].qualification`
- N302 | data/lessons-training.json `lessons[14].steps[0].say`
- N303 | data/lessons-training.json `lessons[14].steps[0].tell`
- N304 | data/lessons-training.json `lessons[14].steps[1].say`
- N305 | data/lessons-training.json `lessons[14].steps[1].tell`
- N306 | data/lessons-training.json `lessons[14].steps[1].then`
- N307 | data/lessons-training.json `lessons[14].steps[2].say`
- N308 | data/lessons-training.json `lessons[14].steps[2].tell`
- N309 | data/lessons-training.json `lessons[14].steps[2].then`
- N310 | data/lessons-training.json `lessons[14].steps[3].say`
- N311 | data/lessons-training.json `lessons[14].steps[3].tell`
- N312 | data/lessons-training.json `lessons[14].steps[3].then`
- N313 | data/lessons-training.json `lessons[14].steps[4].say`
- N314 | data/lessons-training.json `lessons[14].steps[4].tell`
- N315 | data/lessons-training.json `lessons[14].steps[4].then`
- N316 | data/lessons-training.json `lessons[14].steps[5].say`
- N317 | data/lessons-training.json `lessons[14].steps[5].tell`
- N318 | data/lessons-training.json `lessons[14].steps[6].say`
- N319 | data/lessons-training.json `lessons[14].steps[6].tell`

### Lesson 16: A wounded man

- N320 | data/lessons-training.json `lessons[15].title`
- N321 | data/lessons-training.json `lessons[15].qualification`
- N322 | data/lessons-training.json `lessons[15].steps[0].say`
- N323 | data/lessons-training.json `lessons[15].steps[0].tell`
- N324 | data/lessons-training.json `lessons[15].steps[0].then`
- N325 | data/lessons-training.json `lessons[15].steps[1].say`
- N326 | data/lessons-training.json `lessons[15].steps[1].tell`
- N327 | data/lessons-training.json `lessons[15].steps[1].then`
- N328 | data/lessons-training.json `lessons[15].steps[2].say`
- N329 | data/lessons-training.json `lessons[15].steps[2].tell`
- N330 | data/lessons-training.json `lessons[15].steps[2].then`

### Lesson 17: Ready for Action

- N331 | data/lessons-training.json `lessons[16].title`
- N332 | data/lessons-training.json `lessons[16].qualification`
- N333 | data/lessons-training.json `lessons[16].steps[0].say`
- N334 | data/lessons-training.json `lessons[16].steps[0].tell`
- N335 | data/lessons-training.json `lessons[16].steps[1].say`
- N336 | data/lessons-training.json `lessons[16].steps[1].tell`
- N337 | data/lessons-training.json `lessons[16].steps[2].say`
- N338 | data/lessons-training.json `lessons[16].steps[2].tell`
- N339 | data/lessons-training.json `lessons[16].steps[3].say`
- N340 | data/lessons-training.json `lessons[16].steps[3].tell`

## O. The Heavy Water Plant (M60)

### The contents page and its title card

- O1 | data/missions.json `missions[gunnerside].title`
- O2 | data/missions.json `missions[gunnerside].place`
- O3 | data/missions.json `missions[gunnerside].blurb`
- O4 | data/missions.json `missions[gunnerside].tagline`

### The orders and how to play

- O5 | data/missions.json `missions[gunnerside].briefing`
- O6 | data/missions.json `missions[gunnerside].words.ordersLine`
- O7 | data/missions.json `missions[gunnerside].words.cleanBonus` (set in capitals by src/main.js, the orders)
- O8 | data/missions.json `missions[gunnerside].words.cleanOrders`
- O9 | data/missions.json `missions[gunnerside].levels.easy.summary`
- O10 | data/missions.json `missions[gunnerside].levels.hard.summary`

### The drop runs

- O11 | data/map-gunnerside.json `dropRuns[0].label`
- O12 | data/map-gunnerside.json `dropRuns[0].tag`
- O13 | data/map-gunnerside.json `dropRuns[0].description`
- O14 | data/map-gunnerside.json `dropRuns[1].label`
- O15 | data/map-gunnerside.json `dropRuns[1].tag`
- O16 | data/map-gunnerside.json `dropRuns[1].description`
- O17 | data/map-gunnerside.json `dropRuns[2].label`
- O18 | data/map-gunnerside.json `dropRuns[2].tag`
- O19 | data/map-gunnerside.json `dropRuns[2].description`

### Names on the map

- O20 | data/map-gunnerside.json `places[0].name`
- O21 | data/map-gunnerside.json `places[1].name`
- O22 | data/map-gunnerside.json `places[2].name`
- O23 | data/map-gunnerside.json `places[3].name`
- O24 | data/map-gunnerside.json `objectives[0].label`
- O25 | data/map-gunnerside.json `objectives[1].label`
- O26 | data/map-gunnerside.json `enemies[0].label`
- O27 | data/map-gunnerside.json `enemies[1].label`
- O28 | data/map-gunnerside.json `enemies[2].label`
- O29 | data/map-gunnerside.json `enemies[3].label`
- O30 | data/map-gunnerside.json `enemies[4].label`
- O31 | data/map-gunnerside.json `enemies[5].label`
- O32 | data/map-gunnerside.json `enemies[6].label`
- O33 | data/map-gunnerside.json `reserve.label`

### The garrison’s cries

- O34 | data/missions.json `missions[gunnerside].words.cries.spotted[0]`
- O35 | data/missions.json `missions[gunnerside].words.cries.spotted[1]`
- O36 | data/missions.json `missions[gunnerside].words.cries.spotted[2]`
- O37 | data/missions.json `missions[gunnerside].words.cries.found[0]`
- O38 | data/missions.json `missions[gunnerside].words.cries.found[1]`
- O39 | data/missions.json `missions[gunnerside].words.cries.found[2]`
- O40 | data/missions.json `missions[gunnerside].words.cries.tracks[0]`

### Play: the turn card, the gun, the telephone

- O41 | data/missions.json `missions[gunnerside].words.firstTurn`
- O42 | src/hints.js pointedHints, the hint before the first shot
- O43 | src/main.js apLabel
- O44 | src/main.js loudShot, loudShotWords
- O45 | src/main.js enemyActsFor, loudShotWords
- O46 | data/missions.json `missions[gunnerside].words.lineGoesDead`
- O47 | data/missions.json `missions[gunnerside].words.lineIsDown`

### The decoy flare

- O48 | data/missions.json `missions[gunnerside].words.diversionName`
- O49 | data/missions.json `missions[gunnerside].words.diversionKicker`
- O50 | data/missions.json `missions[gunnerside].words.diversionLog`
- O51 | data/missions.json `missions[gunnerside].words.diversionDevice` (the card’s heading THE FLARE PISTOL, the particulars)
- O52 | data/missions.json `missions[gunnerside].words.diversionVerb` ("he can fire the Decoy flare", "Fire it now!")
- O53 | data/missions.json `missions[gunnerside].words.diversionWorked`
- O54 | data/missions.json `missions[gunnerside].words.diversionSpent`

### The back page

- O55 | data/missions.json `missions[gunnerside].words.firstShotHeard` (the rest src/main.js firstShotNote)
- O56 | src/scoring.js cleanRun
- O57 | data/missions.json `missions[gunnerside].ratings[0].label`
- O58 | data/missions.json `missions[gunnerside].ratings[1].label`
- O59 | data/missions.json `missions[gunnerside].ratings[2].label`
- O60 | data/missions.json `missions[gunnerside].ratings[3].label`

### The comic panels

- O61 | data/missions.json `missions[gunnerside].comicPanels.dakota.caption`
- O62 | data/missions.json `missions[gunnerside].comicPanels.landing.caption`
- O63 | data/missions.json `missions[gunnerside].comicPanels.success.caption`

### What the men say instead

- O64 | data/missions.json `missions[gunnerside].dialogue.holloway.onLand[0]`
- O65 | data/missions.json `missions[gunnerside].dialogue.holloway.onLand[1]`
- O66 | data/missions.json `missions[gunnerside].dialogue.holloway.onLand[2]`
- O67 | data/missions.json `missions[gunnerside].dialogue.holloway.onKill[0]`
- O68 | data/missions.json `missions[gunnerside].dialogue.holloway.onKill[1]`
- O69 | data/missions.json `missions[gunnerside].dialogue.holloway.onKill[2]`
- O70 | data/missions.json `missions[gunnerside].dialogue.fitch.onLand[0]`
- O71 | data/missions.json `missions[gunnerside].dialogue.fitch.onLand[1]`
- O72 | data/missions.json `missions[gunnerside].dialogue.fitch.onLand[2]`
- O73 | data/missions.json `missions[gunnerside].dialogue.fitch.onKill[0]`
- O74 | data/missions.json `missions[gunnerside].dialogue.fitch.onKill[1]`
- O75 | data/missions.json `missions[gunnerside].dialogue.fitch.onKill[2]`
- O76 | data/missions.json `missions[gunnerside].dialogue.vance.onLand[0]`
- O77 | data/missions.json `missions[gunnerside].dialogue.vance.onLand[1]`
- O78 | data/missions.json `missions[gunnerside].dialogue.vance.onLand[2]`
- O79 | data/missions.json `missions[gunnerside].dialogue.vance.onSpotted[0]`
- O80 | data/missions.json `missions[gunnerside].dialogue.vance.onSpotted[1]`
- O81 | data/missions.json `missions[gunnerside].dialogue.vance.onSpotted[2]`
- O82 | data/missions.json `missions[gunnerside].dialogue.vance.onKill[0]`
- O83 | data/missions.json `missions[gunnerside].dialogue.vance.onKill[1]`
- O84 | data/missions.json `missions[gunnerside].dialogue.vance.onKill[2]`
- O85 | data/missions.json `missions[gunnerside].dialogue.barrow.onLand[0]`
- O86 | data/missions.json `missions[gunnerside].dialogue.barrow.onLand[1]`
- O87 | data/missions.json `missions[gunnerside].dialogue.barrow.onLand[2]`
- O88 | data/missions.json `missions[gunnerside].dialogue.barrow.onWounded[0]`
- O89 | data/missions.json `missions[gunnerside].dialogue.barrow.onWounded[1]`
- O90 | data/missions.json `missions[gunnerside].dialogue.barrow.onWounded[2]`
- O91 | data/missions.json `missions[gunnerside].dialogue.speers.onLand[0]`
- O92 | data/missions.json `missions[gunnerside].dialogue.speers.onLand[1]`
- O93 | data/missions.json `missions[gunnerside].dialogue.speers.onLand[2]`
- O94 | data/missions.json `missions[gunnerside].dialogue.nunn.onLand[0]`
- O95 | data/missions.json `missions[gunnerside].dialogue.nunn.onLand[1]`
- O96 | data/missions.json `missions[gunnerside].dialogue.nunn.onLand[2]`
- O97 | data/missions.json `missions[gunnerside].dialogue.nunn.onKill[0]`
- O98 | data/missions.json `missions[gunnerside].dialogue.nunn.onKill[1]`
- O99 | data/missions.json `missions[gunnerside].dialogue.nunn.onKill[2]`
