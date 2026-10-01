// Bootstrap: owns the state, the input handling and the render loop. The
// render modules only draw; this module is the one place state actually
// changes (CLAUDE.md rule 7), and the one place game rules and rendering meet.

import {
  alertIndex, busyFor, decayTarget, detectionAt, fireRivals, fireTargetOf, hearingRadius, huntedContact, listeners, routePath, runDetection, runEnemyPhase, shotResultOf, testedHexes, visibleHexes, visionRadiusOf,
} from './enemy.js';
import { canLandOn, dropArea, jumpPoints, runById } from './drop.js';
import { applyDifficulty, difficultyFromQuery, levelById, validateDifficulty } from './difficulty.js';
import { DIRECTION_NAMES, axialToPixel, hexDistance } from './hex.js';
import { forEachCell, hexKey, isInPlay, loadMap, loadJson, terrainAt } from './map.js';
import { createRng, freshSeed, seedFromQuery } from './rng.js';
import {
  callDiversion, checkDiversion, chooseDropRun, createInitialState, cutLine, deselect, endTurn, hideUnit,
  jump, killEnemy, knifeEnemy, moveUnit, nextUnitId, packParachute, passCharge, pickUpCharge, placeCharge, selectHex, selectUnit, selectedUnit, setHover,
  exfilWouldFail, setTargeting, settleMission, silenceUnits, stabiliseUnit, suppressEnemy, swimAcross, throwStone, toggleRoutes,
} from './state.js';
import {
  blastEffect, blastHexesThisTurn, checkCutLine, checkPlaceCharge, checkSwim, effectiveMap, inBlast, isExfil, kindOf,
  objectiveAt, objectiveForChargeHex, swimTargets, blastsOfCharge, caughtBy, chainFrom, laterBlasts, offeredPencil, pencils,
} from './sabotage.js';
import { canPlay, isWinTarget, missionById, missionEnemyTypes, missionFromQuery, missionLevels, missionRoster, missionRules, ratingOf, validateMissions, winShortfall, winTargets, winWords } from './missions.js';
import { aidPrompts, aidWords, diversionPrompt, hintsFor, ordersWords } from './hints.js';
import { railwayLine, trainAt, trainCaught, trainObjective } from './train.js';
import { applyHook, validateTraits } from './traits.js';
import {
  chargeCapacity, checkHide, checkKill, checkKnife, checkPackParachute, checkPassCharge, checkPickUpCharge, checkStabilise, checkSuppress, checkThrowStone,
  hasInSights, onBoard, planMove, reachableFor, returnsFire, traitEffects, unitAt,
} from './units.js';
import { boardPixelBounds, createBoard, diversionTimeline, drawCounterKey, dropTimeline, pickDiversionLine, renderPieces, resetBoardMemory } from './render/board.js';
import { isMuted, loadSuppliedSounds, playCue, setMuted, startMusic, stopMusic, unlockSound } from './render/sound.js';
import { describeUnitReadout, renderRoster } from './render/roster.js';
import {
  BLAST, DEATH, DROP_SHOW, GARRISON_SHOW, KNIFE_SPLAT, POWER_CUT, SHOT, TRAIN, applyCounterColour, applyDocumentTheme, loadSuppliedAircraft, loadSuppliedBlast, loadSuppliedEnemyChips, loadSuppliedFonts, loadSuppliedPaper, loadSuppliedPortraits, loadSuppliedTitleCard, loadSuppliedVehicle,
} from './render/theme.js';
import {
  attachPopup, attachReportScroll, describeAlertStates, dropStalePopup, fitSpread, describeDetection, describePlan, describeRisk, describeRun,
  describeDiversion, hidePopup, placeName, rankedReport, renderActions, renderBriefing, renderAlertDial, renderDawnStrip, renderDiversion, renderDropRuns,
  renderEndTurnButton, renderError, renderUndoButton, describeUndo, renderGutter, renderKeys, renderMission, renderReadout, renderReport,
  capitalise, renderContentsBack, renderRestart, renderResults, renderTimerTin, renderSeed, renderSoundToggle, renderTurnCounter, renderVersion, showPopup, titled, useMissionWords,
} from './render/ui.js';

const svg = document.getElementById('board');
const readout = document.getElementById('coord-readout');
const errorBox = document.getElementById('error');
const turnCounter = document.getElementById('turn-counter');
const endTurnButton = document.getElementById('end-turn');
const undoButton = document.getElementById('undo');
const rosterList = document.getElementById('roster');
const alertDial = document.getElementById('alert-dial');
const alertCaption = document.getElementById('alert-caption');
const reportList = document.getElementById('report');
const reportScroll = document.getElementById('report-scroll');
const actionBar = document.getElementById('actions');
const diversionButton = document.getElementById('diversion');
const missionList = document.getElementById('mission');
const resultsBox = document.getElementById('results');
const seedBox = document.getElementById('seed');
const soundToggle = document.getElementById('sound-toggle');
const restartButton = document.getElementById('restart');
const contentsBackButton = document.getElementById('contents-back');
const timerTinBox = document.getElementById('timer-tin');
const dawnStrip = document.getElementById('dawn-strip');
const gutterNote = document.getElementById('gutter-note');
const keysTab = document.getElementById('keys-tab');
const helpTab = document.getElementById('help-tab');
const alertBox = document.getElementById('alert');
const briefingBackdrop = document.getElementById('briefing-backdrop');
const briefingCard = document.getElementById('briefing');

// The game's title, set over the title card on the orders and the back page.
const GAME_TITLE = 'BURN BY DAWN';
// The contents page's strapline (M27): the game's, not any one mission's.
const CONTENTS_TAGLINE = 'PARACHUTE RAIDS BEHIND THE LINES';

let state = null;
// `baseMap` is data/map.json as loaded; `map` is the board as the demolitions
// have left it (sabotage.js effectiveMap), refreshed on every render. Every
// rule is handed `map`; the terrain layer is drawn once from `baseMap`.
let baseMap = null;
let map = null;
let rules = null;
let layers = null;
// The files as loaded, before the difficulty level's patches (difficulty.js),
// kept so the level can be changed on the orders before the jump. `level` is
// the level in play; `rules` and `baseMap` above are already patched by it.
let rawRules = null;
let rawMap = null;
let difficulty = null;
// The mission being played (data/missions.json, M27): its map, roster and
// patches are already in `rawMap`, `roster` and `rawRules`; this is its own
// words, title card and sounds. `missions` is the whole contents page.
let missions = null;
let mission = null;
// The build shown in the margin (data/version.json, M15).
let version = null;
let level = null;
let roster = null;
let traits = null;
// Interface only, never game state: the hex a hovered report line points at,
// and the last derived view, for rollovers built when they are shown.
let highlightHex = null;
let currentView = null;
// The man whose roster row is under the mouse: he speaks, like the man selected.
let hoverUnitId = null;
// The man selected at the last draw. Once the selection moves off a man, his
// line has been heard and goes (SPEC.md §11).
let lastSelectedId = null;
// The drop being shown (SPEC.md §11): the run's line and where each man jumped
// and came down, and when. Display only: state already has them landed. Any
// key or click skips to the end.
let dropShow = null;
let dropShowTimer = null;
// The Dakota's drone over the drop (M15), cut short if the show is skipped.
let dropSound = null;
// The RAF flyover (M11): the Dakota over the garrison when the diversion is
// called, before its card. Display only; any key or click skips it.
let flyShow = null;
let flyShowTimer = null;
// A turn that ended with a bang (M11): its card waits until the explosion has
// been seen, instead of covering it at once. Any key or click brings it now.
let bangTimer = null;
// The garrison's turn shown on the board before its card (M15): who walked,
// who raised the alarm, what was heard. Display only.
let garrisonShow = null;
// Whether the player has picked out a man yet this game (M21): until then,
// once the stick is down, the men who can act are ringed as where to start.
let menPicked = false;
// The title music turned off from the orders (M21, the operator's): music
// only, for the session; M still turns every sound off. Carried in the
// address as `?music=off` when the contents page loads another mission (M29b).
let musicOff = new URLSearchParams(window.location.search).get('music') === 'off';
// The turns before this one, newest first, for the report's log (M21b): display only.
let earlierReports = [];
// Brings the report's ▲ ▼ up to date after a redraw (M22).
let syncReportScroll = null;
// Shots fired (M13): the flash and tracer of a suppress or a kill, display
// only, cleared once it has played.
let shotShow = null;
let shotShowTimer = null;
// A knife's splat or the line cut's power failing (M16), on the board for a moment.
let strikeShow = null;
let strikeShowTimer = null;
// The briefing card (SPEC.md §11): which one is open, if any, whether turn
// updates are wanted this session, and whether one is waiting for the drop
// to finish being shown. Interface only, never game state.
let briefing = null;
let briefingsOn = true;
// Undo (SPEC.md §4): the states before this turn's moves and actions, most
// recent last, kept to rules.json `undo.steps` (one on Normal, the whole turn
// on Easy). Emptied when the turn ends and when the stick jumps, so it can
// never take back what the garrison has seen — and the player phase rolls no
// dice, so taking a move back can never re-roll anything.
let undoStack = [];
// The time pencils open in the action strip (M30): the id of the man setting a
// charge, while he picks its length; null otherwise. Where it is shown, not
// what happens, so it lives here and not in the game state.
let pencilsFor = null;
// The pencil lifted out of the tin (M31d): picked by a click or its number,
// set by SET, Enter or C. The one offered first when the tin opens.
let pencilLifted = null;
let briefingAfterDrop = false;
// Which card or page was last on show, so each one rustles once as it opens.
let cardShown = null;

// Vision only changes when an enemy moves or the alert changes, not on every
// hover, so it is worked out once per enemy phase rather than per mouse move.
let visionCache = { enemies: null, points: null, map: null, byId: null };

function visionById() {
  if (visionCache.enemies !== state.enemies || visionCache.points !== state.alert.points || visionCache.map !== map) {
    visionCache = {
      enemies: state.enemies,
      points: state.alert.points,
      map,
      // A suppressed enemy sees nothing until its head comes up (M15).
      byId: new Map(state.enemies.map((e) => [e.id, e.suppressed ? new Map() : visibleHexes(map, e, state.alert.points, rules)])),
    };
  }
  return visionCache.byId;
}

// Where each enemy will be and which way it will face after the coming
// detection check and enemy phase, if the turn ended now (M13b: players found
// the garrison turned "unpredictably"). The rules are pure, so this is the
// same sum the turn will do; it changes as the men move, so it is worked out
// again only when the enemies, the men, the noises or the alert do.
let forecastCache = { keys: null, byId: null };

function forecast() {
  if (state.phase === 'drop' || state.outcome) return null;
  const keys = [state.enemies, state.units, state.noises, state.alert, map];
  if (forecastCache.keys && keys.every((k, i) => k === forecastCache.keys[i])) return forecastCache.byId;
  const detected = runDetection(state, map, rules).state;
  const after = runEnemyPhase(detected, map, rules).state;
  const byId = new Map(after.enemies.map((e) => [e.id, e]));
  forecastCache = { keys, byId };
  return byId;
}

/**
 * Everything the renderers need that is derived rather than stored: where the
 * selected trooper can go, what the hovered move would cost and how likely it
 * is to get him seen, and what every enemy can see. Pathing, vision and
 * detection are game rules, so they are computed here and handed to the
 * render modules already worked out.
 */
function deriveView() {
  // What each man's traits do to his numbers, for the roster. Base values come
  // from rules.json, which the render modules do not read.
  const traitEffectsById = new Map(state.units.map((u) => [u.id, traitEffects(u, rules)]));

  const hex = state.hoverHex;
  const enemyUnderMouse = hex ? state.enemies.find((e) => e.q === hex.q && e.r === hex.r) ?? null : null;
  // Aiming at an enemy shows a crosshair on it, not its route and view (M15).
  const hoverEnemy = AIMED.has(state.targeting) ? null : enemyUnderMouse;
  const routes = (state.showRoutes ? state.enemies : hoverEnemy ? [hoverEnemy] : [])
    .map((e) => routePath(map, e))
    .filter(Boolean);
  // Every hex the garrison is on its way to search, plus the last known
  // contact while it is being hunted. One "?" ring each. Below Alarmed nobody
  // goes to the last contact, so it is not marked (m26b, the operator's: a
  // sighting left a "?" under a man, found when he moved off it, for good).
  const searchHexes = new Map();
  for (const e of state.enemies) if (e.investigating && !e.investigating.searched) searchHexes.set(hexKey(e.investigating.q, e.investigating.r), e.investigating);
  const hunted = huntedContact(state, rules);
  if (hunted) searchHexes.set(hexKey(hunted.q, hunted.r), hunted);

  const exfil = baseMap.exfil.map(([q, r]) => ({ q, r }));
  const view = {
    traitEffectsById,
    // The goods train where it stands (M34), each car with the line's direction under it.
    train: trainView(),
    // What the win needs, for the board's star (M28: no longer the map's primary flag).
    winTargetIds: new Set(winTargets(state, rules).targets.map((o) => o.id)),
    // Hexes carry no printed coordinates (SPEC.md §11), so text names places.
    place: (h) => placeName(map, state.objectives, exfil, h),
    highlightHex,
    // Speech bubbles show for the man selected and the man under the mouse,
    // on the board or in the roster (SPEC.md §11).
    speakers: new Set([
      state.selectedUnitId,
      hoverUnitId,
      hex ? unitAt(state.units, hex.q, hex.r)?.id : null,
    ].filter(Boolean)),
    visionById: visionById(),
    garrisonShow,
    // Why each enemy wears the red "!", for its rollover and readout (M20).
    alarmed: alarmReasons(),
    hoverEnemy,
    hoverEnemyVision: hoverEnemy ? visionRadiusOf(map, hoverEnemy, state.alert.points, rules) : null,
    hoverEnemyFacing: hoverEnemy ? DIRECTION_NAMES[hoverEnemy.facing] : null,
    // Next turn's facing for every enemy, and for the one hovered what it
    // will see from where it will stand (M13b).
    nextFacing: null,
    hoverEnemyNext: null,
    hoverEnemyNextArea: null,
    routes,
    searchHexes: [...searchHexes.values()],
    alert: {
      index: alertIndex(state.alert.points, rules),
      states: rules.alert.states,
      points: state.alert.points,
      quietTurns: state.alert.quietTurns,
      quietTurnsToDecay: rules.alert.quietTurnsToDecay,
      floor: state.explosions > 0 ? rules.alert.states.find((s) => s.id === rules.explosionFloor)?.label ?? null : null,
      // Whether quiet turns can still bring it down (not at 0, not held by the explosion floor).
      canEase: decayTarget(state, rules) < state.alert.points,
      // What puts points on, for the dial's rollover, from rules.json.
      sources: alertSources(),
    },
    reachable: null,
    commandArea: null,
    commandCloseArea: null,
    commandLabel: null,
    plan: null,
    moveLabel: null,
    risk: null,
    riskLabel: null,
    // Aiming a swim: the far bank's risk, drawn like a move's (M20).
    landing: null,
    hideLabel: null,
    actions: null,
    targets: null,
    targetLabel: null,
    hearsIds: null,
    // Aiming a stone: the lob from the man to the hex, and the ground in
    // earshot of where it lands (SPEC.md §4), so it never reads as a move.
    throwPreview: null,
    // SPEC.md §7, §10: the exfil, what the hovered objective needs, and the
    // ground a charge going off this turn would kill a man on.
    exfil,
    blastArea: areaAround(blastHexesThisTurn(state, rules)),
    // Where it kills a man, not only wounds him (M20: the fuel dump's outer ring wounds).
    blastKillArea: areaAround(blastHexesThisTurn(state, rules).map((b) => ({ ...b, radius: b.killRadius }))),
    // Where a charge burning past this turn will go off (M30b, the operator's:
    // men were caught too close), drawn faintly until its turn comes.
    laterBlastArea: areaAround(laterBlasts(state, rules)),
    // An objective with every charge it needs set takes no more, so its empty
    // charge points are no longer drawn: "put one here" would be a lie.
    chargedObjectiveIds: new Set(state.objectives.filter((o) => !o.destroyed && chargesWanted(o) === 0).map((o) => o.id)),
    // The leader's orders, for his rollover in the roster (SPEC.md §5 Command).
    command: rules.command,
    diversionUses: rules.diversion.uses,
    diversionName: mission.words.diversionName,
    // The stealth score (SPEC.md §10, M11b), for each man's roster rollover.
    unseenPoints: rules.scoring.perTrooperUnseen,
    // A spotted man can fire back himself (M36), for the words about contact.
    returnFire: Boolean(rules.actions.returnFire),
    // The turn the patrols set out on, while they have not (M36): an enemy's hover says it stands until then.
    garrisonSetsOut: state.phase !== 'drop' && state.turn < rules.patrols.setOutTurn ? rules.patrols.setOutTurn : null,
    // Stabilise and Pass a charge, wherever one could be taken now (M26): the
    // roster, the readout and the man's own rows all point at them.
    aid: aidPrompts(state, rules).map((p) => ({ ...p, words: aidWords(p, state.units, rules) })),
    hoverObjective: null,
    previewBlastArea: null,
    previewBlastKillArea: null,
    // What stands on the hovered hex (M22): { title, rows: [{ label, text }] }.
    site: null,
    // The man under the mouse (M23): his id for the ring, his rows for the readout.
    hoverManId: null,
    aidTargetIds: null,
    manReadout: null,
    blastLabel: null,
    noiseLabel: null,
    searchLabel: null,
    mission: describeMissionState(),
    drop: null,
    dropRuns: null,
    dropLabel: null,
    dropShow,
    flyShow,
    shotShow,
    strikeShow,
    targetRings: null,
    timerTin: null, // M31d: the tin of time pencils, while its timers are open
    dropCue: null,
    selectCue: false,
  };

  if (state.phase === 'drop') return deriveDrop(view, hex);

  // Where to start (M21, from playtesting: a first-timer spent minutes trying
  // to move the Germans). Ringed until the player first selects a man.
  if (state.selectedUnitId) menPicked = true;
  view.selectCue = !menPicked && !dropShow && !state.outcome;

  const next = forecast();
  if (next) {
    view.nextFacing = new Map([...next].map(([id, e]) => [id, e.facing]));
    const ahead = hoverEnemy && next.get(hoverEnemy.id);
    if (ahead) {
      view.hoverEnemyNext = { q: ahead.q, r: ahead.r, facing: DIRECTION_NAMES[ahead.facing], moves: ahead.q !== hoverEnemy.q || ahead.r !== hoverEnemy.r };
      view.hoverEnemyNextArea = visibleHexes(map, ahead, state.alert.points, rules);
    }
  }

  const objective = hex && !hoverEnemy ? objectiveAt(state.objectives, hex) : null;
  if (objective) {
    view.hoverObjective = objective;
    // In short labelled rows under the target's own name (M22: one run-on
    // line ran off the bottom of the box).
    const onPoint = !objective.destroyed && objectiveForChargeHex(state.objectives, hex) === objective;
    view.site = { title: objective.label, rows: describeObjective(objective, onPoint, Boolean(state.selectedUnitId)) };
    if (!objective.destroyed) {
      const { blastRadius, killRadius } = kindOf(objective, rules);
      view.previewBlastArea = areaAround(objective.chargeHexes.map((h) => ({ ...h, radius: blastRadius })));
      if (killRadius < blastRadius) view.previewBlastKillArea = areaAround(objective.chargeHexes.map((h) => ({ ...h, radius: killRadius })));
    }
  } else if (hex && state.parachutes.some((p) => p.q === hex.q && p.r === hex.r)) {
    const chute = state.parachutes.find((p) => p.q === hex.q && p.r === hex.r);
    view.site = { title: `${chute.name}'s parachute`, rows: [
      { label: 'HERE', text: `found by an enemy on or next to it: alert +${rules.alert.parachuteFound}` },
      { label: 'PACK', text: `any man standing here can pack it: [U] ${rules.actions.packParachute.apCost} AP` },
    ] };
  } else if (hex && view.train?.cars.some((c) => c.q === hex.q && c.r === hex.r)) {
    view.site = { title: rules.train.label, rows: trainRows(view.train) };
  } else if (hex && isExfil(baseMap, hex)) {
    view.site = { title: 'Exfil', rows: [
      { label: 'HERE', text: 'a man who ends his move here is out' },
      { label: 'NEEDS', text: `${rules.mission.minimumOut} men out, with ${winWords(state, rules)} down, by dawn` },
      // Only for a man with a charge to leave, or nobody picked (M22: room).
      ...(selectedUnit(state)?.charges === 0 ? [] : [{ label: 'CHARGE', text: 'a man carrying one leaves it where he stepped off, for another to pick up [P]' }]),
    ] };
  }

  // A noise waiting to be heard (M15: the ring on a blown fuel dump was taken
  // for a leftover stone): what it was and who comes for it.
  const noise = hex && state.noises.findLast((n) => n.q === hex.q && n.r === hex.r);
  if (noise) {
    const what = { explosion: 'a bang', stone: 'a thrown stone', gunfire: 'gunfire', silenced: 'a silenced shot', found: 'something found here' }[noise.kind] ?? 'a noise';
    const radius = hearingRadius(noise.kind, state.alert.points, rules);
    view.noiseLabel = `HEARD — ${what}: in the enemy phase, patrols within ${radius} hexes come here to look, and sentries in earshot turn to face it`;
  }
  // The "?" ring (m26b): who is on the way to search here.
  const searchHere = hex && searchHexes.get(hexKey(hex.q, hex.r));
  if (searchHere) {
    const coming = state.enemies.filter((e) => e.investigating && !e.investigating.searched && e.investigating.q === hex.q && e.investigating.r === hex.r);
    view.searchLabel = searchHere === hunted
      ? 'last known contact: at Alarmed every patrol hunts it until one gets here'
      : `the ${coming.map((e) => e.label.toLowerCase()).join(' and the ')} ${coming.length === 1 ? 'is' : 'are'} on the way to look here`;
  }

  const unit = selectedUnit(state);
  // The leader selected, or under the mouse (M12): where a man must stand at
  // the start of a turn to get his orders (SPEC.md §5 Command, M11). A flag,
  // never a name (CLAUDE.md rule 6).
  const leader = unit?.leader ? unit : (!state.targeting && leaderAt(hex));
  if (leader) {
    const hexes = new Map();
    forEachCell(map, (q, r) => {
      if (isInPlay(map, q, r) && hexDistance(leader, { q, r }) <= rules.command.radius) hexes.set(hexKey(q, r), { q, r });
    });
    view.commandArea = hexes;
    const { closeRadius } = rules.command;
    if (closeRadius != null) view.commandCloseArea = new Map([...hexes].filter(([, h]) => hexDistance(leader, h) <= closeRadius));
    // In the readout off the board, or over his own hex (M22: on every hex it crowded the box).
    if (unit?.leader && (!hex || (hex.q === unit.q && hex.r === unit.r))) view.commandLabel = `blue dashes: ${leaderOrdersWords(unit)}`;
  }
  // A man under the mouse (M23, the operator's): his particulars in the readout
  // and a dashed ring on his counter, where M22 put his card in a popup over
  // the board. Not while aiming, which has its own words.
  const hoverMan = hex && !state.targeting && !dropShow && (!briefing || CARDS_CLICKED_THROUGH.has(briefing.kind))
    ? unitAt(state.units, hex.q, hex.r)
    : null;
  if (hoverMan) {
    view.hoverManId = hoverMan.id;
    view.manReadout = describeUnitReadout(hoverMan, state.units.indexOf(hoverMan) + 1, state, map, view);
  }
  if (!unit) return view;

  view.actions = pencilsOpen(unit) ? pencilActions(unit) : actionsFor(unit);
  // The timers open (M30b): the charge's blast, chain and all, on the board,
  // and what to do in the readout.
  if (pencilsOpen(unit)) {
    const objective = objectiveForChargeHex(state.objectives, unit);
    const blasts = blastsOfCharge(state, objective, unit, rules);
    // Drawn as a blast is, not a hover's faint preview: this is the ground to get off.
    view.blastArea = new Map([...view.blastArea, ...areaAround(blasts)]);
    view.blastKillArea = new Map([...view.blastKillArea, ...areaAround(blasts.map((b) => ({ ...b, radius: b.killRadius })))]);
    view.targetLabel = `SET THE TIMER for the charge on the ${objective.label}: pick a time pencil from the tin, how many turns until it goes off, then SET. A number picks one, Enter or C sets it. `
      + 'The red ground is its blast: every man must be off it by then. Esc: don\'t set it.';
    // The tin beside him (M31d), clear of the red ground where it can be; it
    // took the place of M31b's SET THE TIMER in the pen beside him.
    view.timerTin = { ...timerTin(unit, objective), keepClear: [...view.blastArea.values()] };
    return view;
  }
  // Over an enemy, what the selected man can do to it, and why not (M26d: a
  // playtester could not tell why Speers could kill one two hexes off and not
  // the two beside him — those had not been suppressed, and could see him).
  if (hoverEnemy && !state.targeting) view.enemyActs = enemyActsFor(unit, hoverEnemy);
  view.aidLabel = ['stabilise', 'pass'].map((kind) => aidFor(unit, kind)).filter(Boolean).join(' ');
  if (state.targeting) return deriveTargeting(view, unit, hex, enemyUnderMouse);

  view.reachable = reachableFor(map, state.units, unit, rules, state.enemies);
  if (!hex || hoverEnemy) return view;

  const plan = planMove(map, state.units, unit, hex, rules, state.enemies);
  view.plan = plan;
  view.moveLabel = describePlan(plan, unit);
  if (plan) {
    // The detection phase tests every hex he enters, or the hex he stands on
    // if he stays put (enemy.js testedHexes), so that is what gets pips. A man
    // already in contact is shot on any of them where a free enemy would spot
    // him again (SPEC.md §6), and the pips say so.
    const busy = busyNow(unit);
    view.risk = plan.path.map((step, i) => {
      if (i === 0 && plan.steps > 0) return null;
      // Moving brings him out of hiding, so only standing still keeps it.
      const mover = plan.steps > 0 ? { ...unit, hidden: false } : unit;
      const result = detectionAt(map, rules, state.enemies, state.alert.points, mover, step, busy);
      if (!result) return null;
      const shot = unit.inContact && result.spotted && result.firing;
      return { ...result, shot, shotResult: shot ? shotResultOf(result, rules) : null, drawnOff: shot ? null : drawnOff(unit, result) };
    });
    view.riskLabel = describeRisk(plan, view.risk, view.place);
    const end = plan.path[plan.path.length - 1];
    const blast = isExfil(baseMap, end) ? null : blastEffect(blastHexesThisTurn(state, rules), end);
    if (blast === 'killed' || (blast === 'wounded' && unit.hits > 0)) {
      view.blastLabel = `BLAST — a charge goes off this turn with him in it: KILLED${blast === 'wounded' ? ' (at its edge, but already wounded)' : ''}`;
    } else if (blast === 'wounded') {
      view.blastLabel = 'BLAST — a charge goes off this turn with him at its edge: WOUNDED';
    } else if (!isExfil(baseMap, end)) {
      // Inside a blast to come (M30b): say when, so he is off it by then.
      const later = laterBlasts(state, rules).filter((b) => blastEffect([b], end)).sort((a, b) => a.blows - b.blows)[0];
      if (later) view.blastLabel = `BLAST — to come: the ${later.label} goes up at the end of turn ${later.blows} with this ground in its blast; get him clear by then`;
    }
    const failure = exfilFailure(unit, plan);
    if (failure) view.blastLabel = `MISSION NOT YET COMPLETE — out now, it ends ${failure.kind.toUpperCase()}: ${failure.reason}`;
    // Not where nobody can see him: hiding would add nothing (M22: room).
    const seenHere = plan.steps === 0 && detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: false }, unit);
    if (seenHere && checkHide(unit, rules).ok) view.hideLabel = `[H] ${hideEffect(unit)}`;
  }
  return view;
}

/**
 * Each enemy fires at one man a turn (SPEC.md §6, M26d). `busyNow` is the
 * test for this man: is an enemy firing at another man ahead of him, as the
 * others stand now? Kept for the state it was worked out on.
 */
let rivalsFor = { state: null, rivals: null };
function busyNow(unit) {
  if (!unit.inContact) return null;
  if (rivalsFor.state !== state) rivalsFor = { state, rivals: fireRivals(map, rules, state) };
  return busyFor(rivalsFor.rivals, state, unit);
}

/**
 * A man in contact whom the enemies seeing him will not fire on, as each is
 * firing at someone else: "the sentry is firing at BARROW". Null if not so.
 */
function drawnOff(unit, result) {
  if (!unit.inContact || !result.spotted || result.firing || result.spotters.length === 0) return null;
  if (rivalsFor.state !== state) rivalsFor = { state, rivals: fireRivals(map, rules, state) };
  const words = result.spotters.map((id) => {
    const enemy = state.enemies.find((e) => e.id === id);
    const target = fireTargetOf(rivalsFor.rivals, state, enemy, unit.id);
    return target && `the ${enemy.label.toLowerCase()} is firing at ${state.units.find((u) => u.id === target).shortName}`;
  }).filter(Boolean);
  return words.length ? words.join(', ') : null;
}

/** A move onto the exfil that would lose the mission (state.js exfilWouldFail), or null. */
function exfilFailure(unit, plan) {
  return plan?.affordable ? exfilWouldFail(state, unit.id, plan, rules, baseMap) : null;
}

/** The exfil card's Exfil anyway: make the move it held back. */
function confirmExfil() {
  const { unitId, plan } = briefing;
  briefing = null;
  commitMove(unitId, plan);
  render();
}

/**
 * The drop phase (SPEC.md §9): every run's line and wind, and for the run being
 * looked at, the jump points and every hex a man could come down on. Hovering a
 * hex says what landing there would do. It never shows the roll.
 */
function deriveDrop(view, hex) {
  const selected = runById(baseMap, state.dropRunId);
  const count = state.units.length;
  view.dropRuns = baseMap.dropRuns.map((run, i) => ({
    id: run.id, key: String(i + 1), label: run.label, tag: run.tag, description: run.description, wind: run.wind, selected: run.id === state.dropRunId,
  }));
  // Nothing of the drop is drawn on the board under the orders: a run's line
  // showed through the title card as if it were part of the picture, and the
  // rings are drawn on as the card is put away, where they can be seen.
  if (briefing?.kind === 'orders') return view;
  // What to do next, in big pen lettering among the runs' names (M21).
  view.dropCue = selected ? 'jump' : 'pick';
  view.drop = {
    runs: baseMap.dropRuns.map((run) => ({
      id: run.id, label: run.label, tag: run.tag, wind: run.wind, labelAlong: run.labelAlong ?? null, labelNudge: run.labelNudge ?? null, windAlong: run.windAlong ?? null,
      from: { q: run.from[0], r: run.from[1] }, to: { q: run.to[0], r: run.to[1] },
      jumps: jumpPoints(run, count), selected: run.id === state.dropRunId,
    })),
    area: selected ? dropArea(map, rules, selected, state.units, state.enemies) : null,
  };
  // Before a run is picked, the targets and the exfil are ringed in marker pen
  // (SPEC.md §11), so the first thing the player sees is where to go.
  if (!selected) {
    const { targets, needed } = winTargets(state, rules);
    const single = rules.mission.win.condition === 'destroyPrimary';
    view.targetRings = [
      ...state.objectives.map((o) => ({
        // The primary is ringed twice; where any few of many will do (M28),
        // each is ringed once and the first carries the note for them all.
        // Where there are many (M29b, the operator's), a tight ring takes in
        // each target's charge points with it, so the two read as one thing.
        hexes: single ? o.hexes : [...o.hexes, ...o.chargeHexes], tight: !single,
        primary: single && targets.includes(o), colour: 'red',
        noteNudge: baseMap.objectives.find((m) => m.id === o.id)?.noteNudge ?? null,
        // The charges it takes, so three dashed points never read as three charges.
        // The primary's in two lines (M26d, the operator's): what it is, and how.
        // Where there are many targets (M29c, the operator's: a note moved
        // into clear ground lost its target), a bonus says whose it is.
        note: !targets.includes(o)
          ? [`${single ? '' : `${o.label.toUpperCase()}: `}BONUS +${kindOf(o, rules).score}`, ...payoffNote(kindOf(o, rules)), ...setsOffNote(o), ...chargeNote(kindOf(o, rules))].filter(Boolean)
          : single
            ? ['PRIMARY TARGET!', `BLOW IT WITH ${chargeCount(kindOf(o, rules).chargesNeeded).replace(/^USE /, '')}!`]
            : o === targets[0]
              ? [`ANY ${countWord(needed)} ${kindOf(o, rules).label.toUpperCase()}!`, `${chargeCount(kindOf(o, rules).chargesNeeded).replace(/^USE /, '')} EACH!`]
              : null,
      })),
      // Beside the exfil on its right, so it plainly means the exfil (M13).
      // `exfilNoteNudge` (M29c, art only) moves it, as an objective's `noteNudge` does.
      { hexes: view.exfil, primary: false, colour: 'green', beside: true, noteNudge: baseMap.exfilNoteNudge ?? null, note: [`GET AT LEAST ${rules.mission.minimumOut} MEN`, 'OUT THROUGH HERE'] },
    ];
  }
  if (!hex) {
    view.dropLabel = selected
      ? `${selected.label}, ${selected.tag.toUpperCase()}: ${selected.description} Wind ${selected.wind}. Press SPACE to jump, or click the run again.`
      : null;
    return view;
  }
  const terrain = terrainAt(map, hex.q, hex.r);
  if (!terrain) return view;
  const inArea = view.drop.area?.has(hexKey(hex.q, hex.r));
  let landing;
  if (!canLandOn(map, rules, hex, new Set(), state.enemies)) landing = 'nobody lands here';
  else if (terrain.landing === 'wounds') landing = 'a man landing here is WOUNDED and drags himself out on the nearest bank';
  else if (terrain.landing === 'bad') landing = `a bad landing: loses ${rules.landing.badLandingTurnsLost === 1 ? 'his first turn' : `${rules.landing.badLandingTurnsLost} turns`}`;
  else landing = 'a clean landing';
  view.dropLabel = selected
    ? `${inArea ? 'in reach of the ' : 'out of reach of the '}${selected.label.toLowerCase()} — ${landing}`
    : landing;
  return view;
}

/** Every hex within each blast's radius, as a Map for the board's area drawing. */
function areaAround(blasts) {
  const area = new Map();
  forEachCell(map, (q, r) => {
    if (isInPlay(map, q, r) && inBlast(blasts, { q, r })) area.set(hexKey(q, r), { q, r });
  });
  return area;
}

/** A count in the pen's capitals: FOUR, not 4, which a lettered 1 and I make hard to read. */
function countWord(n) {
  return ['NO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'][n] ?? String(n);
}

/** What raises the alert, and by how much, in words, from rules.json (SPEC.md §6). */
function alertSources() {
  const a = rules.alert;
  const bangs = [...new Set(Object.values(rules.objectives).map((k) => k.alert))].sort((x, y) => x - y);
  return [
    `seen +${a.spotted}`, `stone +${a.stone}`, `parachute or body found +${a.parachuteFound}`,
    `silenced shot +${a.silenced}`, `gunfire +${a.gunfire}`, `a bang +${bangs.join(' or +')}`,
  ];
}

/**
 * "USE ONE CHARGE", "USE TWO CHARGES": the marker-pen count on a target ring,
 * in words, since a lettered 1 is too easily read as I.
 */
function chargeCount(n) {
  return `USE ${countWord(n)} CHARGE${n === 1 ? '' : 'S'}`;
}

/**
 * The charge count on a ring, and for a target a scout can cut instead, the
 * other way in (M12: the operator wanted Cut the line on the rings):
 * "USE ONE CHARGE," / "OR HAVE A SCOUT CUT THE LINES".
 */
function chargeNote(kind) {
  const count = chargeCount(kind.chargesNeeded);
  const cutter = Object.values(rules.roles).find((role) => role.cutLine);
  // Where every target takes one charge (M29b, the operator's: the airfield's
  // board was all words), the win's note says so once, and the rest leave it out.
  if (oneChargeEach()) return kind.cutLine && cutter ? [`A ${cutter.label.toUpperCase()} CAN CUT ITS LINES`] : [];
  if (!kind.cutLine || !cutter) return [count];
  return [`${count},`, `OR HAVE A ${cutter.label.toUpperCase()} CUT THE LINES`];
}

/** Whether every objective on the board takes exactly one charge. */
function oneChargeEach() {
  return state.objectives.every((o) => kindOf(o, rules).chargesNeeded === 1);
}

/** Charges an objective still wants: what it needs, less those gone off or burning. */
function chargesWanted(o) {
  const set = state.charges.filter((c) => c.objectiveId === o.id).length;
  return Math.max(0, kindOf(o, rules).chargesNeeded - o.detonated - set);
}

/**
 * What an objective needs, against its charge points: "1 charge, on any one
 * of its 3 charge points", "2 charges, one on each of its 2 charge points".
 * There are more points than charges on purpose, so the player must be told
 * he does not have to fill them all.
 */
function chargesOnPoints(o) {
  const needed = kindOf(o, rules).chargesNeeded;
  const points = o.chargeHexes.length;
  const charges = `${needed} charge${needed === 1 ? '' : 's'}`;
  if (needed === points) return needed === 1 ? `${charges}, on its charge point` : `${charges}, one on each of its ${points} charge points`;
  return `${charges}, on any ${needed === 1 ? 'one' : needed} of its ${points} charge points`;
}

/**
 * SPEC.md §4: hovering an objective shows what it needs, as the readout's
 * rows (M22). `onPoint`: the mouse is on one of its charge points. `brief`:
 * a man is selected, so the move and its risk come first and only what bears
 * on acting here is added; the rest is the mission panel's rollover.
 */
function describeObjective(o, onPoint, brief = false) {
  const kind = kindOf(o, rules);
  const worth = !isWinTarget(state, rules, o)
    ? `bonus, +${kind.score} score`
    : rules.mission.win.condition === 'destroyPrimary'
      ? 'PRIMARY: needed to win'
      : `counts toward the job, ${winWords(state, rules)}; +${kind.score} score`;
  const payoff = payoffWords(kind);
  if (o.destroyed) return [{ label: 'DONE', text: `DESTROYED${o.cut ? ', line cut' : ''}` }, { label: 'WORTH', text: worth }];
  const wanted = chargesWanted(o);
  const set = state.charges.filter((c) => c.objectiveId === o.id);
  // When each blows (M30): the end of this turn, or of turn N.
  const blows = (c) => (c.fuse <= 1 ? 'blows this turn' : `blows turn ${state.turn + c.fuse - 1}`);
  const burning = set.length ? `; ${set.length} set, ${set.map(blows).join(', ')}` : '';
  const rows = [];
  // The goods train's turn, on the target it crosses (M34), while it can still be caught.
  if (trainObjective(state, rules) === o && state.turn <= rules.train.turn + rules.train.window) rows.push({ label: 'TRAIN', text: trainDue() });
  if (onPoint) {
    // The cut, when the rows below leave it out (M22: said twice otherwise).
    const scout = rules.roles[selectedUnit(state)?.role]?.cutLine;
    const cut = kind.cutLine && brief && scout ? ', or a scout cuts the line [X]' : '';
    rows.push({ label: 'HERE', text: wanted > 0 ? `charge point: place a charge [C]${cut}` : 'charge point: it has all the charges it needs' });
  }
  rows.push({ label: 'NEEDS', text: `${o.detonated || set.length ? `${wanted} more: ` : ''}${chargesOnPoints(o)}${o.detonated ? `; ${o.detonated} gone off` : ''}${burning}` });
  if (brief) {
    const takes = setsOffWords(o);
    if (takes) rows.push({ label: 'TAKES', text: takes });
    return rows;
  }
  const choice = rules.charges.fuseChoice;
  rows.push({ label: 'BANG', text: `${choice ? `timer ${choice.min}–${choice.max} turns` : `fuse ${rules.charges.fuseTurns} turns`} · ${blastWords(kind)} · alert +${kind.alert}` });
  const takes = setsOffWords(o);
  if (takes) rows.push({ label: 'TAKES', text: takes });
  if (kind.cutLine) rows.push({ label: 'CUT', text: `or a scout cuts the line [X]: a whole turn on a charge point, quiet, alert +${rules.alert.lineCut}` });
  rows.push({ label: 'WORTH', text: worth });
  if (payoff) rows.push({ label: 'DOWN', text: `it ${payoff}` });
  return rows;
}

/**
 * What an objective that sets off its neighbours (M30, the bowser) would take
 * with it, blown from its charge point: "sets off the 2 Ju 52s beside it,
 * which count toward the job: one explosion, alert +4", or null.
 */
function setsOffList(o) {
  if (o.destroyed || !kindOf(o, rules).setsOff) return [];
  return chainFrom(state.objectives, o, o.chargeHexes, rules).map((l) => l.objective);
}

function namesOf(objectives) {
  const counts = new Map();
  for (const o of objectives) counts.set(o.label, (counts.get(o.label) ?? 0) + 1);
  const names = [...counts].map(([label, n]) => (n === 1 ? `the ${label}` : `the ${n} ${label}s`));
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
}

function setsOffWords(o) {
  const caught = setsOffList(o);
  if (caught.length === 0) return null;
  const counted = caught.filter((c) => isWinTarget(state, rules, c)).length;
  const toward = counted === 0 ? '' : counted === caught.length ? `, which count toward the job` : `, ${counted} of them toward the job`;
  return `sets off ${namesOf(caught)} beside it${toward}: one explosion, alert +${kindOf(o, rules).alert}`;
}

/** How far a kind's blast reaches and what it does (SPEC.md §7; M20, a ring that only wounds our men). */
function blastWords(kind) {
  const hexes = (n) => `${n} hex${n === 1 ? '' : 'es'}`;
  if (kind.killRadius >= kind.blastRadius) return `kills anyone within ${hexes(kind.blastRadius)}`;
  return `kills all within ${hexes(kind.killRadius)} (darker); to ${hexes(kind.blastRadius)} kills enemies, wounds ours`;
}

/** What destroying an objective of this kind does for the stick (SPEC.md §7 payoffs), or null. */
function payoffWords(kind) {
  const { noReserve, withdrawPatrols } = kind.payoff;
  const words = [];
  // On a level where bangs call up reinforcements (M21b, Hard), the telephones stop those too.
  const anyCalled = Object.values(rules.objectives).some((k) => k.reinforcements > 0);
  if (noReserve) words.push(`keeps the reserve squad${anyCalled ? ' and any reinforcements' : ''} from being called up`);
  if (withdrawPatrols > 0) words.push(`draws the nearest ${withdrawPatrols === 1 ? 'patrol' : `${withdrawPatrols} patrols`} off the board`);
  if (kind.reinforcements > 0) words.push(`calls up ${kind.reinforcements === 1 ? 'a squad' : `${kind.reinforcements} squads`} of reinforcements to guard the way to the exfil, unless ${mission.words.lineIsDown}`);
  return words.length ? words.join(' and ') : null;
}

/** The same, lettered on its target ring before the drop: "STOPS THE RESERVE", "MAKES A PATROL LEAVE", "CALLS UP 2 SQUADS". */
function payoffNote(kind) {
  const { noReserve, withdrawPatrols } = kind.payoff;
  const notes = [];
  if (noReserve) notes.push('STOPS THE RESERVE');
  if (withdrawPatrols > 0) notes.push(withdrawPatrols === 1 ? 'MAKES A PATROL LEAVE' : `MAKES ${withdrawPatrols} PATROLS LEAVE`);
  // Hard (M21b): what it calls up, on the ring before the drop.
  if (kind.reinforcements > 0) notes.push(`CALLS UP ${kind.reinforcements === 1 ? 'A SQUAD' : `${kind.reinforcements} SQUADS`}`);
  return notes;
}

/** What it sets off, on its ring before the drop (M30): "SETS OFF 2 JU 52S". */
function setsOffNote(o) {
  const caught = setsOffList(o);
  return caught.length ? [`SETS OFF ${namesOf(caught).replace(/^the /, '').toUpperCase()}`] : [];
}

/** The RAF button: can it be called, how often more, and whether now is the time (M26d). */
function diversionView() {
  const check = checkDiversion(state, rules);
  const leader = state.units.find((u) => u.leader && onBoard(u));
  return { ...check, left: rules.diversion.uses - state.diversionsCalled, suggest: leader ? diversionPrompt(state, rules, check.ok) : null };
}

/** The mission at a glance for the panel: objectives, men out, the diversion. */
function describeMissionState() {
  const out = state.units.filter((u) => u.out).length;
  return {
    objectives: missionPanelObjectives(),
    out,
    minimumOut: rules.mission.minimumOut,
    shortfall: winShortfall(state, rules),
    diversion: diversionView(),
  };
}

/**
 * The panel's lines: one per objective, except that where any few of a kind
 * will do (M28, destroyCount) the kind is one line, so eight aircraft do not
 * read as a checklist of eight.
 */
function missionPanelObjectives() {
  const { targets, needed } = winTargets(state, rules);
  const grouped = rules.mission.win.condition === 'destroyCount';
  const lines = [];
  if (grouped) {
    const kind = kindOf(targets[0], rules);
    const done = targets.filter((o) => o.destroyed).length;
    const burning = state.charges.filter((c) => targets.some((o) => o.id === c.objectiveId)).length;
    lines.push({
      label: kind.label, win: true, destroyed: done >= needed, cut: false, points: kind.score,
      detail: `${done} of ${needed} needed destroyed, of the ${targets.length} on the field${burning ? `; ${burning} ${burning === 1 ? 'charge' : 'charges'} burning` : ''}. Each takes ${chargeCount(kind.chargesNeeded).replace(/^USE /, '').toLowerCase()}`,
      progress: `${done}/${needed}${burning ? ' ●' : ''}`,
    });
  }
  for (const o of state.objectives) {
    if (grouped && targets.includes(o)) continue;
    lines.push(describePanelObjective(o, targets.includes(o)));
  }
  // The goods train (M34): its turn, and whether it was caught.
  const crossed = trainObjective(state, rules);
  if (crossed) {
    const caught = trainCaught(state, rules);
    const missed = !caught && (crossed.destroyed || state.turn > rules.train.turn + rules.train.window + 1);
    lines.push({
      label: rules.train.label, win: false, destroyed: caught, cut: false, points: rules.train.score,
      detail: caught ? `Wrecked with the ${crossed.label}` : missed ? `Not caught: the ${crossed.label} went ${crossed.destroyed ? 'at the wrong time' : 'on standing'}` : capitalise(trainDue()),
      progress: caught ? 'done' : missed ? 'missed' : `turn ${rules.train.turn}`,
    });
  }
  return lines;
}

/** The turns a charge must be set on to bring the train's target down under it, by the usual fuse. */
function trainSetTurns() {
  const { turn, window } = rules.train;
  const burn = rules.charges.fuseTurns - 1;
  return { from: turn - window - burn, to: turn + window - burn, downFrom: turn - window, downTo: turn + window };
}

/** "crosses on turn 14: the Rail Bridge down on turns 13 to 15 wrecks it, +5 (charges set on turns 11 to 13)". */
function trainDue() {
  const t = trainSetTurns();
  const crossed = trainObjective(state, rules);
  return `crosses on turn ${rules.train.turn}: the ${crossed.label} down on turns ${t.downFrom} to ${t.downTo} wrecks it, +${rules.train.score} (charges set on turns ${t.from} to ${t.to})`;
}

/** The train's hover rows: what it is doing, and that it is only scenery. */
function trainRows(train) {
  const doing = {
    running: train.head >= train.objective.hexes.length && state.turn > rules.train.turn ? 'crossing' : `on its way: ${trainDue()}`,
    halted: `stopped: the ${train.objective.label} went before it got near`,
    wrecked: `wrecked with the ${train.objective.label}: +${rules.train.score}`,
  }[train.status];
  return [
    { label: 'DOING', text: doing },
    { label: 'HERE', text: 'only scenery: it sees nobody, and a man may stand on the line' },
  ];
}

/** trainAt for the board: the line it runs, its pace and length, and whether each car lies over water. */
function trainView() {
  if (!rules.train || state.phase === 'drop') return null;
  const train = trainAt(state, rules, baseMap);
  if (!train) return null;
  const fallen = (car) => train.objective.destroyed && train.objective.hexes.some((h) => h.q === car.q && h.r === car.r);
  return { ...train, cars: train.cars.map((car) => ({ ...car, sunk: fallen(car) })), line: railwayLine(baseMap), speed: rules.train.speed, length: rules.train.length };
}

function describePanelObjective(o, win) {
  const kind = kindOf(o, rules);
  const set = state.charges.filter((c) => c.objectiveId === o.id).length;
  return {
    label: o.label, win, destroyed: o.destroyed, cut: o.cut,
    points: kind.score,
    detail: (o.destroyed ? (o.cut ? 'Line cut' : 'Destroyed') : `${o.detonated + set} of ${kind.chargesNeeded} charges set${set ? `, ${set} burning` : ''}`)
      + (payoffWords(kind) ? `. Destroying it ${payoffWords(kind)}` : '')
      + (setsOffWords(o) ? `. It ${setsOffWords(o)}` : ''),
    progress: o.destroyed ? (o.cut ? 'cut' : 'done') : `${o.detonated + set}/${kind.chargesNeeded}${set ? ' ●' : ''}`,
  };
}

// SPEC.md §4 Actions, for the selected man: what each costs and, if he cannot
// take it, why not. Suppress, stone and stabilise need a target, so here
// "ok" means he could take them against something. Actions his role or
// loadout can never allow are left off, so the strip keeps to three rows.
function actionsFor(unit) {
  const role = rules.roles[unit.role];
  const never = new Set([
    // A man who is no gunner has it too, to return fire (M36), where the rules allow.
    ...(role.suppress || returnsFire(unit, rules) ? [] : ['suppress']),
    ...(role.kill ? [] : ['kill']),
    ...(role.cutLine ? [] : ['cut']),
    ...(chargeCapacity(unit, rules) > 0 ? [] : ['pickUp', 'charge', 'pass']),
    // No water on the map to swim (M29, the airfield): no Swim button at all.
    ...(Object.values(baseMap.legend).includes(rules.actions.swim.across) ? [] : ['swim']),
  ]);
  const patients = state.units.filter((u) => (
    onBoard(u) && u.id !== unit.id && hexDistance(u, unit) === 1 && u.hits > 0 && !u.stabilised
  ));
  const stabilise = patients.length === 0
    ? { ok: false, cost: unit.apMax, reason: 'no wounded man beside him' }
    : patients.map((patient) => checkStabilise(unit, patient)).find((c) => c.ok) ?? checkStabilise(unit, patients[0]);
  // Returning fire (M36), the enemies that count are those with him in their
  // sights: if none can be fired on, the button says why of the first.
  const back = returnsFire(unit, rules);
  const fireAt = back ? state.enemies.filter((e) => hasInSights(e, unit)) : state.enemies;
  const canSuppress = fireAt.map((e) => checkSuppress(map, unit, e, rules));
  const suppress = canSuppress.find((c) => c.ok) ?? (back && canSuppress[0]) ?? checkSuppress(map, unit, null, rules);
  const fireAlert = applyHook(unit, 'onFire', 'alert', rules.alert.gunfire).value;
  const kill = state.enemies.map((e) => checkKill(map, unit, e, rules)).find((c) => c.ok)
    ?? checkKill(map, unit, null, rules);
  // The knife: ok if any enemy beside him could be knifed; otherwise the
  // reason for the nearest one beside him, or that there is none.
  const beside = state.enemies.filter((e) => hexDistance(e, unit) === 1);
  const knife = beside.map((e) => checkKnife(unit, e, rules)).find((c) => c.ok)
    ?? (beside.length ? checkKnife(unit, beside[0], rules) : checkKnife(unit, null, rules));
  // Every man has somewhere in range to throw, so only his AP can stop him.
  const stoneCheck = checkThrowStone(map, unit, nearestInPlay(unit), rules);
  const ap = (n) => `${n} AP`;
  return [
    {
      id: 'hide', key: 'H', label: 'Hide', ...withCost(checkHide(unit, rules), ap),
      help: `Go to ground: +${rules.actions.hide.concealment} concealment on this hex only, and it ends his turn. `
        + `It does not cover the hexes he crossed to get here. Here: ${hideEffect(unit)}`,
    },
    back
      ? {
        id: 'suppress', key: 'S', label: 'Return fire', lines: ['Return', 'fire'], tight: 'Fire',
        help: `Fire back at an enemy that has him in its sights: it keeps its head down — it will not see, fire or move until its next go — so he can get away, or a gunner can kill it. Only a gunner fires first. Loud: alert +${fireAlert}, and the patrols in earshot come.`,
        ...withCost(suppress.reason === 'pick an enemy' ? { ...suppress, reason: 'the enemy that saw him is gone' } : suppress, ap),
      }
      : { id: 'suppress', key: 'S', label: 'Suppress', help: 'Fire on an enemy he can see: it keeps its head down — it will not see, fire or move until its next go — so the others can move past it. Loud.', ...withCost(suppress.reason === 'pick an enemy' ? { ...suppress, reason: 'no enemy in range and sight' } : suppress, ap) },
    {
      id: 'knife', key: 'N', label: 'Knife', ...withCost(knife.reason === 'pick an enemy beside him' ? { ...knife, reason: 'no enemy beside him' } : knife, rules.actions.knife.fullTurn ? () => 'full turn' : ap),
      help: 'Creep up behind an enemy beside him that cannot see him — he is outside its arc — and kill it without a sound: no alert, no noise, '
        + `but it leaves a body, and ${knifeTurnWords()}. Not while he is spotted. The reserve squad cannot be killed. ${killScoreWords()} Press N, then click the enemy`,
    },
    { id: 'kill', key: 'K', label: 'Kill', help: `Finish an enemy suppressed this turn or last with one silenced shot: quieter than suppressing, but it leaves a body. The reserve squad cannot be killed. ${killScoreWords()}`, ...withCost(kill.reason === 'pick an enemy' ? { ...kill, reason: 'no suppressed enemy in range and sight' } : kill, ap) },
    {
      id: 'stone', key: 'T', label: 'Throw stone', short: 'Stone', ...withCost(stoneCheck, ap),
      help: `He stays put and lobs a stone onto a hex up to ${rules.actions.throwStone.range} away, over anything. Sentries in earshot turn to face it at once, for the rest of this turn; patrols walk over to look in the enemy phase — use it to turn a sentry's back now or pull a patrol off your path. Alert +${rules.alert.stone}. Press T, then click where it lands`,
    },
    { id: 'stabilise', key: 'A', label: 'Stabilise', short: 'Aid', help: 'A full turn beside a wounded man', suggest: aidFor(unit, 'stabilise'), ...withCost(stabilise, () => 'full turn') },
    { id: 'pack', key: 'U', label: 'Pack chute', tight: 'Pack', help: 'Pack up the parachute on this hex, his or anyone\'s, so no patrol finds it', ...withCost(checkPackParachute(state.parachutes, unit, rules), ap) },
    { id: 'pickUp', key: 'P', label: 'Pick up charge', lines: ['Pick up', 'charge'], help: 'Take a dropped charge from this hex', ...withCost(checkPickUpCharge(state.droppedCharges, unit, rules), ap) },
    passChargeAction(unit),
    placeChargeAction(unit),
    { id: 'cut', key: 'X', label: 'Cut the line', short: 'Cut line', help: cutLineHelp(), ...withCost(checkCutLine(state, unit, rules), () => `full turn, no noise, alert +${rules.alert.lineCut}`) },
    { id: 'swim', key: 'W', label: 'Swim', help: `A full turn: across the ${map.terrain[rules.actions.swim.across]?.label.toLowerCase() ?? 'water'} to the far bank`, ...withCost(checkSwim(map, state, unit, null, rules), () => 'full turn') },
  ].filter((a) => !never.has(a.id)).map((a) => ({ ...a, apLabel: apLabel(a), active: state.targeting === a.id }));
}

// Stabilise or Pass, if this man could take it right now (M26): the words for
// the button's mark and the readout, or null.
function aidFor(unit, kind) {
  const prompt = aidPrompts(state, rules).find((p) => p.unitId === unit.id && p.kind === kind);
  return prompt ? aidWords(prompt, state.units, rules) : null;
}

// What an action costs, under its name on the button (M19, the operator's):
// "2 AP", or "all AP" for those that take his whole turn. The rollover still
// has the full cost and what else it does.
function apLabel(action) {
  const wholeTurn = ['stabilise', 'cut', 'swim'].includes(action.id) || (action.id === 'knife' && rules.actions.knife.fullTurn);
  return wholeTurn ? 'all AP' : `${action.apCost} AP`;
}

// What the knife takes of his turn (m26b): all of it, from a standing start,
// while `knife.fullTurn` is on; otherwise its AP, and it ends his turn.
function knifeTurnWords() {
  return rules.actions.knife.fullTurn
    ? 'it takes his whole turn: he must start the turn beside it, before he moves'
    : 'it ends his turn';
}

// What a kill is worth on the back page (M16), from rules.json scoring.
function killScoreWords() {
  const { perKill, perKillFound } = rules.scoring;
  return `+${perKill} score, ${perKillFound} if its body is found.`;
}

/**
 * What going to ground would do for him where he stands, in words (SPEC.md §4
 * Hide): the detection check tests every hex he entered this turn, and hiding
 * helps only on the last, so a man seen on the way is seen whatever he does
 * now. Players hid and were shot anyway without knowing why (M11).
 */
function hideEffect(unit) {
  const seenOnTheWay = testedHexes(unit)
    .filter((h) => h.q !== unit.q || h.r !== unit.r)
    .map((h) => ({ h, d: detectionAt(map, rules, state.enemies, state.alert.points, unit, h) }))
    .find(({ d }) => d?.spotted);
  if (seenOnTheWay) {
    return `too late: the ${seenOnTheWay.d.enemyLabel.toLowerCase()} sees him on his way, in ${placeName(map, state.objectives, baseMap.exfil.map(([q, r]) => ({ q, r })), seenOnTheWay.h)}${unit.inContact ? ', and will fire' : ''}`;
  }
  const busy = busyNow(unit);
  const open = detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: false }, unit, busy);
  const hidden = detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: true }, unit, busy);
  if (!hidden) return 'no enemy can see this hex: hiding adds nothing';
  if (hidden.spotted) {
    return `still SPOTTED hidden, too close for this cover${unit.inContact && hidden.firing ? ', and fired on' : ''}: ${describeDetection(hidden)}`;
  }
  if (open?.spotted) return `NOT spotted once hidden${unit.inContact ? ', which breaks contact' : ''}: ${describeDetection(hidden)}`;
  return `not spotted either way: ${describeDetection(hidden)}`;
}

// Cut the line, in words that say why it is worth a turn: what it takes, and
// what it gives over a charge, from rules.json (the kinds a scout can cut).
function cutLineHelp() {
  const kind = Object.values(rules.objectives).find((k) => k.cutLine);
  const target = kind ? `the ${kind.label}` : 'the target';
  const payoff = kind ? payoffWords(kind) : null;
  return `Scouts only. Start his turn on one of ${target}'s charge points and spend the whole turn: it is destroyed at once, quietly. `
    + `No noise, so nobody comes to look, though the garrison notices ${mission.words.lineGoesDead} (alert +${rules.alert.lineCut}); no charge used, and the same bonus as blowing it${payoff ? `. It also ${payoff}` : ''}.`;
}

// Pass a charge to a man beside him (M11b): ok if there is anyone he could
// hand one to; the reason otherwise is the first man's, or why he cannot at all.
function passChargeAction(unit) {
  const beside = state.units.filter((u) => u.id !== unit.id && onBoard(u) && hexDistance(u, unit) === 1);
  const checks = beside.map((u) => checkPassCharge(unit, u, rules));
  const check = checks.find((c) => c.ok) ?? checks[0] ?? checkPassCharge(unit, null, rules);
  const reason = check.reason === 'pick a man beside him' ? 'nobody beside him' : check.reason;
  return {
    id: 'pass', key: 'E', label: 'Pass charge', lines: ['Pass', 'charge'], ok: check.ok, reason, cost: `${check.cost} AP`, apCost: check.cost, suggest: aidFor(unit, 'pass'),
    help: `Hand one of his charges to a man beside him who can carry it. He pays ${check.cost} AP; the man taking it pays nothing. Press E, then click the man.`,
  };
}

// Place a charge, with its fuse — and a warning if setting it on a secondary
// would leave too few for the primary, which ends the mission (SPEC.md §10).
function placeChargeAction(unit) {
  const check = checkPlaceCharge(state, unit, rules);
  const choice = rules.charges.fuseChoice;
  const lengths = pencils(state, unit, rules).map((p) => p.fuse);
  let cost = choice ? `${check.cost} AP, then set its timer: ${lengths[0]} to ${lengths[lengths.length - 1]} turns` : `${check.cost} AP, fuse ${check.fuse}`;
  if (check.ok && !winTargets(state, rules).targets.includes(check.objective) && winShortfall(placeCharge(state, unit.id, rules), rules) > 0) {
    cost += ` — leaves too few for ${winWords(state, rules)}: WITHDRAWS`;
  }
  return {
    id: 'charge', key: 'C', label: 'Place charge', short: 'Charge',
    // Two steps where there is a timer to set (M30b, the operator's: it was not clear a second was needed).
    ...(choice ? { lines: ['Charge', '+ timer'] } : {}),
    help: choice
      ? `Two steps: press C, then set its timer — how many turns until it goes off, ${lengths[0]} to ${lengths[lengths.length - 1]}, this turn's included. Give every man time to get clear of its blast.`
      : `Set a charge here: it goes off in ${check.fuse} fuse phase${check.fuse === 1 ? '' : 's'}, this turn's included`,
    ok: check.ok, reason: check.reason, cost, apCost: check.cost,
  };
}

/** Are the time pencils open for this man, and can he still set a charge? */
function pencilsOpen(unit) {
  return Boolean(unit && pencilsFor === unit.id && rules.charges.fuseChoice && checkPlaceCharge(state, unit, rules).ok);
}

/**
 * The tin of time pencils (SPEC.md §7; M31d, the operator's: the timer as a
 * period object, pick one then SET): one pencil a length, coloured as the
 * No. 10's were, with the turn it goes off; the one lifted is the one SET
 * takes, the one offered first when it opens; one that would catch a man who
 * cannot get clear of the blast in time says TOO SHORT and names him; one
 * that would go off after dawn is struck out and cannot be picked.
 */
function timerTin(unit, objective) {
  const choices = pencils(state, unit, rules);
  const open = choices.filter((p) => !p.afterDawn).map((p) => p.fuse);
  const lifted = open.includes(pencilLifted) ? pencilLifted : offeredPencil(state, map, unit, rules)?.fuse ?? null;
  return {
    anchor: { q: unit.q, r: unit.r },
    title: `CHARGE ON THE ${objective.label.toUpperCase()}`,
    range: open.length > 1 ? `${open[0]}–${open.at(-1)}` : `${open[0] ?? ''}`,
    pencils: choices.map((p) => {
      const caught = p.afterDawn ? [] : caughtBy(state, map, unit, objective, p.fuse, rules);
      return {
        fuse: p.fuse,
        blows: p.blows,
        words: p.afterDawn ? 'after dawn' : caught.length ? `too short: ${listNames(caught)}` : `on turn ${p.blows}`,
        ok: !p.afterDawn,
        danger: caught.length > 0,
        lifted: p.fuse === lifted,
      };
    }),
    lifted,
  };
}

/**
 * The action strip while the tin is open (M31d): what to do, SET for the
 * pencil lifted, and Back. The pencils themselves are in the tin on the map.
 */
function pencilActions(unit) {
  const tin = timerTin(unit, objectiveForChargeHex(state.objectives, unit));
  const lifted = tin.pencils.find((p) => p.lifted);
  return [
    { heading: `SET THE TIMER: PICK A PENCIL (${tin.range}), THEN SET` },
    {
      id: 'pencil-set', key: 'Enter', label: 'Set the charge', short: 'SET', apLabel: lifted ? `${lifted.fuse} turns` : 'no pencil',
      ok: Boolean(lifted), active: Boolean(lifted), danger: Boolean(lifted?.danger),
      reason: 'pick a pencil first', cost: lifted ? `${checkPlaceCharge(state, unit, rules, lifted.fuse).cost} AP; it goes off at the end of turn ${lifted.blows}` : 'nothing',
      help: lifted ? `Set the charge with the ${lifted.fuse}-turn pencil: it goes off at the end of turn ${lifted.blows}.` : 'Pick a pencil in the tin first',
    },
    { id: 'pencil-back', key: 'Esc', label: 'Back', short: 'Back', apLabel: 'no charge', ok: true, cost: 'nothing', help: 'Put the tin away without setting the charge' },
  ];
}

/** Lift a pencil out of the tin (M31d): the one SET will take. */
function liftPencil(unit, fuse) {
  const pencil = pencils(state, unit, rules).find((p) => p.fuse === fuse);
  if (pencil && !pencil.afterDawn) pencilLifted = fuse;
}

function listNames(names) {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
}

/** Set the charge with this pencil, or the one offered first. */
function setCharge(unit, fuse) {
  pencilsFor = null;
  pencilLifted = null;
  commit(placeCharge(state, unit.id, rules, fuse ?? offeredPencil(state, map, unit, rules)?.fuse));
}

/**
 * The selected man against the enemy under the mouse: one readout row for each
 * of Suppress, Kill and Knife his role has, saying he can (with its key and
 * cost) or why not.
 */
function enemyActsFor(unit, enemy) {
  const role = rules.roles[unit.role];
  const acts = [
    role.suppress && { label: 'SUPPRESS', key: 'S', check: checkSuppress(map, unit, enemy, rules) },
    // A man who is no gunner can fire back at an enemy that has seen him (M36).
    returnsFire(unit, rules) && { label: 'FIRE', key: 'S', check: checkSuppress(map, unit, enemy, rules) },
    role.kill && { label: 'KILL', key: 'K', check: checkKill(map, unit, enemy, rules) },
    { label: 'KNIFE', key: 'N', check: checkKnife(unit, enemy, rules) },
  ].filter(Boolean);
  return acts.map(({ label, key, check }) => ({
    label,
    text: check.ok
      ? `${unit.shortName} can, now [${key}]: ${label === 'KNIFE' && rules.actions.knife.fullTurn ? 'his whole turn' : `${check.cost} AP`}`
      : `${unit.shortName} can't: ${check.reason}`,
    tone: check.ok ? 'prompt' : null,
  }));
}

/** What a spotted man can do with a gun (M36): fire back himself, where the rules allow; else a gunner's job. */
function fireBackWords() {
  return rules.actions.returnFire
    ? `fire back at it [S]: loud, alert +${rules.alert.gunfire}, but it keeps its head down for a turn`
    : 'have a gunner suppress it [S]';
}

function withCost(check, format) {
  return { ok: check.ok, reason: check.reason, cost: format(check.cost), apCost: check.cost };
}

function nearestInPlay(unit) {
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]) {
    if (isInPlay(map, unit.q + d[0], unit.r + d[1])) return { q: unit.q + d[0], r: unit.r + d[1] };
  }
  return null;
}

/**
 * Aiming an action: outline every legal target, and say what the hovered one
 * would do. For a stone, ring the enemies that would hear it (SPEC.md §4: the
 * readout shows who would hear it before the player commits).
 */
// The actions aimed at an enemy (M15: a crosshair while aiming).
const AIMED = new Set(['suppress', 'kill', 'knife']);

function deriveTargeting(view, unit, hex, hoverEnemy) {
  const targets = new Map();
  const add = (h) => targets.set(hexKey(h.q, h.r), { q: h.q, r: h.r });
  const kind = state.targeting;

  if (kind === 'suppress') {
    for (const e of state.enemies) if (checkSuppress(map, unit, e, rules).ok) add(e);
    if (hoverEnemy) {
      const check = checkSuppress(map, unit, hoverEnemy, rules);
      view.aim = { q: hoverEnemy.q, r: hoverEnemy.r, ok: check.ok };
      const verb = returnsFire(unit, rules) ? 'Return fire at' : 'Suppress';
      view.targetLabel = check.ok
        ? `${verb} ${hoverEnemy.label} — ${check.cost} AP, gunfire: alert rises and it is heard. Click to fire.`
        : `${verb} ${hoverEnemy.label}: ${check.reason}.`;
    } else if (returnsFire(unit, rules)) {
      view.targetLabel = `Return fire: click an enemy that has ${unit.shortName} in its sights, inside his spot radius with a clear line. Esc to cancel.`;
    } else {
      view.targetLabel = `Suppress: click an enemy inside ${unit.shortName}'s spot radius with a clear line. Esc to cancel.`;
    }
  } else if (kind === 'kill') {
    for (const e of state.enemies) if (checkKill(map, unit, e, rules).ok) add(e);
    if (hoverEnemy) {
      const check = checkKill(map, unit, hoverEnemy, rules);
      view.aim = { q: hoverEnemy.q, r: hoverEnemy.r, ok: check.ok };
      view.targetLabel = check.ok
        ? `Kill the ${hoverEnemy.label.toLowerCase()} — ${check.cost} AP, one silenced shot: alert +${applyHook(unit, 'onFire', 'alert', rules.alert.silenced).value}, heard ${hearingRadius('silenced', state.alert.points, rules)} hexes off. Leaves a body. Click to fire.`
        : `Kill: ${check.reason}.`;
    } else {
      view.targetLabel = `Kill: click a suppressed enemy inside ${unit.shortName}'s spot radius with a clear line. Esc to cancel.`;
    }
  } else if (kind === 'knife') {
    for (const e of state.enemies) if (checkKnife(unit, e, rules).ok) add(e);
    if (hoverEnemy) {
      const check = checkKnife(unit, hoverEnemy, rules);
      view.aim = { q: hoverEnemy.q, r: hoverEnemy.r, ok: check.ok };
      view.targetLabel = check.ok
        ? `Knife the ${hoverEnemy.label.toLowerCase()} — ${rules.actions.knife.fullTurn ? 'all' : `${check.cost} AP and the rest`} of ${unit.shortName}'s turn. Silent: no alert, no noise. Leaves a body. Click to strike.`
        : `Knife: ${check.reason}.`;
    } else {
      view.targetLabel = `Knife: click an enemy beside ${unit.shortName} that is looking the other way. Esc to cancel.`;
    }
  } else if (kind === 'stone') {
    forEachCell(map, (q, r) => { if (checkThrowStone(map, unit, { q, r }, rules).ok) add({ q, r }); });
    const check = hex ? checkThrowStone(map, unit, hex, rules) : null;
    if (check?.ok) {
      const hears = listeners(state.enemies, 'stone', hex, state.alert.points, rules);
      view.hearsIds = new Set(hears.map((e) => e.id));
      const earshot = new Map();
      const heard = hearingRadius('stone', state.alert.points, rules);
      forEachCell(map, (q, r) => { if (isInPlay(map, q, r) && hexDistance({ q, r }, hex) <= heard) earshot.set(hexKey(q, r), { q, r }); });
      view.throwPreview = { from: { q: unit.q, r: unit.r }, to: { q: hex.q, r: hex.r }, earshot };
      const who = hears.length === 0
        ? 'nobody is in earshot, so it only costs alert'
        : hears.map((e) => `the ${e.label.toLowerCase()} ${e.speed === 0 ? 'turns to face it at once, until the garrison next moves' : 'walks over to look in the enemy phase'}`).join(', ');
      view.targetLabel = `${unit.shortName} stays put and lobs a stone into ${view.place(hex)} — ${check.cost} AP, alert +${rules.alert.stone}. `
        + `Heard ${heard} hexes round (shaded): ${who}. Click to throw.`;
    } else {
      view.targetLabel = check
        ? `Throw a stone: ${check.reason}.`
        : `THROW A STONE — ${unit.shortName} stays where he is and lobs it onto any outlined hex, up to ${rules.actions.throwStone.range} away; `
          + 'no line of sight needed. The noise draws patrols to it and turns sentries toward it. Hover a hex to see who would hear. Esc to cancel.';
    }
  } else if (kind === 'swim') {
    for (const h of swimTargets(map, state, unit, rules)) add(h);
    const check = hex ? checkSwim(map, state, unit, hex, rules) : null;
    view.targetLabel = check ? `Swim: ${check.reason}.` : 'Swim: click a hex on the far bank. Esc to cancel.';
    // The far bank's risk, drawn as a move's last hex would be (M20, the
    // operator's): he comes out of the water unhidden and is tested there.
    if (check?.ok) {
      const plan = { steps: 1, path: [{ q: unit.q, r: unit.r }, { q: hex.q, r: hex.r }] };
      const result = detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: false }, hex, busyNow(unit));
      const shot = Boolean(result && unit.inContact && result.spotted && result.firing);
      const risk = [null, result && { ...result, shot, shotResult: shot ? shotResultOf(result, rules) : null }];
      view.landing = { plan, risk };
      let seen = 'Unseen on the far bank.';
      if (risk[1]?.shot) {
        const { text, sum } = describeRisk(plan, risk, view.place);
        seen = `${text}: ${sum}.`;
      }
      else if (result?.spotted) seen = `SPOTTED as he comes out: ${describeDetection(result, { dots: true })}.`;
      else if (result) seen = `Seen, not spotted, as he comes out: ${describeDetection(result, { dots: true })}.`;
      view.targetLabel = `Swim across to ${view.place(hex)} — ${unit.shortName}'s whole turn. ${seen} Click to swim.`;
    }
  } else if (kind === 'pass') {
    for (const u of state.units) if (checkPassCharge(unit, u, rules).ok) add(u);
    view.aidTargetIds = new Set(state.units.filter((u) => u.id !== unit.id && checkPassCharge(unit, u, rules).ok).map((u) => u.id));
    const taker = hex ? unitAt(state.units, hex.q, hex.r) : null;
    const check = taker && taker.id !== unit.id ? checkPassCharge(unit, taker, rules) : null;
    view.targetLabel = check?.ok
      ? `Pass a charge to ${taker.shortName} — ${check.cost} AP of ${unit.shortName}'s. Click to hand it over.`
      : check ? `Pass a charge: ${check.reason}.` : 'Pass a charge: click a man beside him who can carry one. Esc to cancel.';
  } else if (kind === 'stabilise') {
    for (const u of state.units) if (checkStabilise(unit, u).ok) add(u);
    view.aidTargetIds = new Set(state.units.filter((u) => u.id !== unit.id && checkStabilise(unit, u).ok).map((u) => u.id));
    const patient = hex ? unitAt(state.units, hex.q, hex.r) : null;
    const check = patient ? checkStabilise(unit, patient) : null;
    // A red cross over the man under the mouse (M17), as the crosshair over an enemy.
    if (patient && patient.id !== unit.id) view.aim = { q: patient.q, r: patient.r, ok: check.ok, icon: 'heal' };
    view.targetLabel = check?.ok
      ? `Stabilise ${patient.shortName} — ${unit.shortName}'s whole turn. ${patient.shortName} gets his full AP back next turn. Click to start.`
      : check ? `Stabilise: ${check.reason}.` : 'Stabilise: click a wounded man beside him. Esc to cancel.';
  }
  view.targets = targets;
  return view;
}

function render() {
  syncMusic();
  map = effectiveMap(baseMap, state.objectives, rules);
  const view = deriveView();
  currentView = view;
  noteHeard();
  renderPieces(layers, state, view);
  renderAlertDial(alertDial, alertCaption, view.alert);
  renderReport(reportList, state, view.place, locateHex, earlierReports);
  syncReportScroll?.();
  renderTurnCounter(turnCounter, state, rules);
  renderDawnStrip(dawnStrip, state, rules);
  renderEndTurnButton(endTurnButton, state, rules);
  renderUndoButton(undoButton, state, undoStack.length > 0);
  renderRoster(rosterList, state, map, view, { onSelect: handleRosterClick, onHover: hoverRosterUnit });
  if (view.dropRuns) renderDropRuns(actionBar, view.dropRuns, handleChooseRun);
  else renderActions(actionBar, view.actions, handleAction);
  renderTimerTin(timerTinBox, view.timerTin, svg, map, {
    pick: (fuse) => handleAction(`pencil-${fuse}`),
    set: () => handleAction('pencil-set'),
    back: () => handleAction('pencil-back'),
  });
  renderReadout(readout, state, map, view);
  renderMission(missionList, view.mission);
  renderDiversion(diversionButton, view.mission.diversion);
  renderResults(resultsBox, state.outcome, level.label, { title: GAME_TITLE, tagline: mission.tagline }, restartMission, openContents,
    state.outcome?.kind === 'success' ? ratingOf(mission, state.outcome.score.total) : null);
  // Every man's name is set in bold on the card, as in the report.
  const card = briefing && { names: state.units.map((u) => u.shortName), ...describeBriefing(briefing, view) };
  showCounterKey(briefing?.kind === 'orders');
  renderBriefing(briefingBackdrop, briefingCard, card, (on) => { briefingsOn = on; });
  briefingBackdrop.classList.toggle('click-through', CARDS_CLICKED_THROUGH.has(briefing?.kind));
  dropStalePopup();
  // A card laid down, or the back page turned over, rustles once.
  const shown = state.outcome ? 'results' : briefing?.kind ?? null;
  if (shown && shown !== cardShown) playCue('card');
  if (shown === 'results' && cardShown !== 'results') playCue(state.outcome.kind === 'success' ? mission.endSounds.success : mission.endSounds.otherwise);
  cardShown = shown;
}

/**
 * A line is heard once its man has been selected and the selection has moved
 * off him; it is then silenced, so it does not come back every time he is
 * touched. Hovering a man shows his line but does not use it up. The view
 * being drawn already leaves him out, so nothing needs redrawing.
 */
function noteHeard() {
  const selected = state.selectedUnitId;
  if (lastSelectedId !== null && lastSelectedId !== selected) state = silenceUnits(state, [lastSelectedId]);
  lastSelectedId = selected;
}

/**
 * A hovered report line rings its hex. Only the board is redrawn, so the line
 * under the mouse is not rebuilt out from under it.
 */
function locateHex(hex) {
  highlightHex = hex;
  renderBoard();
}

/** A hovered roster row makes that man speak; again only the board is redrawn. */
function hoverRosterUnit(unitId) {
  hoverUnitId = unitId;
  renderBoard();
}

function renderBoard() {
  const view = deriveView();
  currentView = view;
  noteHeard();
  renderPieces(layers, state, view);
}

/**
 * The mouse has moved onto another hex: only the board and the readout under
 * it change (M26d). The rest of the page is not rebuilt, which on Safari made
 * every hover stutter.
 */
function renderHover() {
  renderBoard();
  renderReadout(readout, state, map, currentView);
  dropStalePopup();
}

/**
 * Take a player action's result and see whether it ended the mission — the
 * last man stepping onto the exfil, say, or a charge set on a secondary that
 * leaves the primary short (SPEC.md §10). `cue` is the sound it makes
 * (render/sound.js), or null for none.
 */
function commit(next, cue = 'action') {
  if (next === state) return;
  undoStack.push(state);
  const { steps } = rules.undo;
  if (steps !== null && undoStack.length > steps) undoStack = undoStack.slice(-steps);
  state = settleMission(next, rules, baseMap);
  if (cue) playCue(cue);
}

/** A move, in silence (M24, the operator's: neither M23's slides nor the snap before them suited it). */
function commitMove(unitId, plan) {
  commit(moveUnit(state, unitId, plan, baseMap), null);
}

/** Sound on or off (M, or the word in the margin). Not remembered: the game stores nothing (CLAUDE.md rule 9). */
function toggleSound() {
  setMuted(!isMuted());
  renderSoundToggle(soundToggle, isMuted());
  syncMusic();
}

/**
 * The title music (M17, the operator's) plays over a new game's orders and the
 * run choice, and fades at the jump (M20, the operator's: M19 faded it with the
 * orders and played it between turns, which was not enjoyable). Sound turned
 * back on before the jump carries on where it faded; a new game starts it from
 * the top.
 */
function syncMusic() {
  if (!opened || state.phase !== 'drop' || state.outcome || isMuted() || musicOff) stopMusic();
  else startMusic({ resume: briefing?.opening !== true });
}

/** The sounds of a turn's report: a crump for any bang, a dog when the garrison stirs. */
function cueReport(report) {
  if (report.some((e) => e.kind === 'explosion')) playCue('explosion');
  if (report.some((e) => e.kind === 'alertRise')) playCue('alertRise');
  // The goods train's whistle as it comes onto the board (M35).
  if (report.some((e) => e.kind === 'train' && e.what === 'comes')) playCue('train');
}

function showShot(kind, from, to) {
  shotShow = { kind, since: performance.now(), from: { q: from.q, r: from.r }, to: { q: to.q, r: to.r } };
  clearTimeout(shotShowTimer);
  shotShowTimer = setTimeout(() => {
    shotShow = null;
    renderBoard();
  }, SHOT.ms);
}

function showStrike(show, ms) {
  strikeShow = { ...show, since: performance.now() };
  clearTimeout(strikeShowTimer);
  strikeShowTimer = setTimeout(() => {
    strikeShow = null;
    renderBoard();
  }, ms);
}

/** Take back the last move or action, keeping where the mouse is. */
function undoLast() {
  if (undoStack.length === 0 || state.outcome || briefing || dropShow || flyShow || bangTimer) return;
  const previous = undoStack.pop();
  pencilsFor = null;
  playCue('move');
  state = { ...previous, hoverHex: state.hoverHex, showRoutes: state.showRoutes, targeting: null };
  render();
}

// --- input ------------------------------------------------------------------

function handleHexClick(q, r) {
  if (dropShow) return endDropShow();
  if (flyShow) return endFlyShow();
  if (bangTimer) return endBangHold();
  if (state.outcome || state.phase === 'drop') return;
  highlightHex = null;
  pencilsFor = null;
  if (state.targeting) {
    handleTargetClick(q, r);
    render();
    return;
  }
  const unit = unitAt(state.units, q, r);
  if (unit) {
    state = selectUnit(state, unit.id);
  } else {
    const mover = selectedUnit(state);
    const plan = mover ? planMove(map, state.units, mover, { q, r }, rules, state.enemies) : null;
    // An unaffordable target does nothing rather than moving part of the way:
    // a half-finished move the player did not ask for is worse than no move.
    if (plan && plan.affordable) {
      // Out now and the mission is lost: ask first (M14).
      const failure = exfilFailure(mover, plan);
      if (failure) briefing = { kind: 'exfil', unitId: mover.id, plan, failure };
      else commitMove(mover.id, plan);
    } else if (!mover) {
      state = selectHex(state, q, r);
    }
  }
  render();
}

// A click while aiming on another of the stick stops aiming and selects him,
// as it would anywhere else — a stone is never thrown at one of our own — but
// for stabilise, whose target is one of the stick, which selects him only if
// it cannot be done. Any other click takes the action if it can; a miss
// leaves the player aiming, and the readout already says why it would not work.
function handleTargetClick(q, r) {
  const mover = selectedUnit(state);
  if (!mover) return;
  const other = unitAt(state.units, q, r);
  if (other && other.id !== mover.id && state.targeting !== 'stabilise' && state.targeting !== 'pass') {
    state = selectUnit(state, other.id);
    return;
  }
  let next = state;
  if (state.targeting === 'suppress') {
    const enemy = state.enemies.find((e) => e.q === q && e.r === r);
    if (enemy) next = suppressEnemy(state, mover.id, enemy.id, map, rules);
  } else if (state.targeting === 'kill') {
    const enemy = state.enemies.find((e) => e.q === q && e.r === r);
    if (enemy) next = killEnemy(state, mover.id, enemy.id, map, rules);
  } else if (state.targeting === 'knife') {
    const enemy = state.enemies.find((e) => e.q === q && e.r === r);
    if (enemy) next = knifeEnemy(state, mover.id, enemy.id, rules);
  } else if (state.targeting === 'stone') {
    next = throwStone(state, mover.id, { q, r }, map, rules);
  } else if (state.targeting === 'stabilise') {
    const patient = unitAt(state.units, q, r);
    if (patient) next = stabiliseUnit(state, mover.id, patient.id);
  } else if (state.targeting === 'swim') {
    next = swimAcross(state, mover.id, { q, r }, map, rules);
  } else if (state.targeting === 'pass') {
    const taker = unitAt(state.units, q, r);
    if (taker) next = passCharge(state, mover.id, taker.id, rules);
  }
  if (next !== state) {
    // Gunfire is heard and seen (M13): a burst for suppressing, one muffled
    // shot for a kill, with the muzzle flash and tracer on the board.
    const kind = state.targeting;
    const gun = kind === 'suppress' || kind === 'kill';
    const target = gun ? state.enemies.find((e) => e.q === q && e.r === r) : null;
    commit(setTargeting(next, null), gun ? kind : 'action');
    if (target) showShot(kind, mover, target);
    if (kind === 'knife') showStrike({ kind: 'knife', at: { q, r } }, KNIFE_SPLAT.ms);
  }
  else if (other && other.id !== mover.id) state = selectUnit(state, other.id);
}

/** An action button or its key. Aimed actions start aiming; the rest happen. */
function handleAction(id) {
  if (bangTimer) return endBangHold();
  if (state.outcome) return;
  if (id === 'diversion') {
    if (flyShow) return;
    const before = state;
    commit(callDiversion(state, rules), mission.diversionSound ?? 'diversion');
    // The Dakota flies over the garrison, then the call is said on a card, so
    // it can never pass unnoticed and be made twice.
    if (state !== before) {
      // A heading of its own each time (M13: it flew the same line every
      // call), from the seed, the turn and the call, so a replay flies it again.
      const heading = createRng((state.seed ^ Math.imul(state.turn, 2654435761) ^ state.diversionsCalled) >>> 0).next() * Math.PI * 2;
      // Its engines are heard before it comes into sight (M17): the cue plays now.
      const lead = DROP_SHOW.flyoverSoundLeadMs;
      flyShow = { since: performance.now() + lead, before, heading, points: before.enemies.map((e) => ({ q: e.q, r: e.r })) };
      // A vehicle on the ground (M31) takes the line clear of the counters.
      const chips = [...before.enemies, ...before.units.filter((u) => u.landed && !u.out && !u.dead)];
      if (baseMap.diversionRun) flyShow.line = pickDiversionLine(baseMap, chips.map((c) => ({ q: c.q, r: c.r })));
      clearTimeout(flyShowTimer);
      flyShowTimer = setTimeout(endFlyShow, lead + diversionTimeline(baseMap, flyShow).length);
    }
    render();
    return;
  }
  const unit = selectedUnit(state);
  if (!unit) return;
  switch (id) {
    case 'hide':
      commit(hideUnit(state, unit.id, rules));
      break;
    case 'pickUp':
      commit(pickUpCharge(state, unit.id, rules));
      break;
    case 'pack':
      commit(packParachute(state, unit.id, rules));
      break;
    case 'charge':
      // Time pencils (M30): C opens them, and C again takes the default.
      if (rules.charges.fuseChoice && !pencilsOpen(unit)) {
        if (checkPlaceCharge(state, unit, rules).ok) {
          pencilsFor = unit.id;
          pencilLifted = offeredPencil(state, map, unit, rules)?.fuse ?? null;
        }
      } else {
        setCharge(unit, pencilLifted ?? undefined);
      }
      break;
    case 'pencil-set':
      if (pencilsOpen(unit) && pencilLifted != null) setCharge(unit, pencilLifted);
      break;
    case 'pencil-back':
      pencilsFor = null;
      pencilLifted = null;
      break;
    case 'cut': {
      const before = state;
      commit(cutLine(state, unit.id, rules));
      const cut = state.objectives.find((o) => o.cut && !before.objectives.find((b) => b.id === o.id)?.cut);
      if (cut) showStrike({ kind: 'cut', objectiveId: cut.id }, POWER_CUT.ms);
      break;
    }
    case 'pass': {
      // Only one man beside him can take it (M26d, the operator's): it is
      // handed straight over, with no aiming. Undo takes it back.
      const takers = state.units.filter((u) => u.id !== unit.id && checkPassCharge(unit, u, rules).ok);
      if (state.targeting !== 'pass' && takers.length === 1) {
        commit(passCharge(state, unit.id, takers[0].id, rules));
        break;
      }
    }
    // falls through: more than one could take it, so he aims it
    case 'suppress':
    case 'kill':
    case 'knife':
    case 'stone':
    case 'swim':
    case 'stabilise': {
      // An action his role can never take is not in his list: its key does nothing.
      const action = actionsFor(unit).find((a) => a.id === id);
      if (state.targeting === id) state = setTargeting(state, null);
      else if (action?.ok) state = setTargeting(state, id);
      break;
    }
    default:
      // A pencil clicked in the tin is lifted, not set (M31d): SET sets it.
      if (!id.startsWith('pencil-') || !pencilsOpen(unit)) return;
      liftPencil(unit, Number(id.slice('pencil-'.length)));
  }
  render();
}

function handleHexHover(q, r) {
  state = setHover(state, { q, r });
  renderHover();
}

function handleHexLeave() {
  state = setHover(state, null);
  renderHover();
}

function handleRosterClick(unitId) {
  // A turn card is put away by picking a man from the roster too (M23).
  if (CARDS_CLICKED_THROUGH.has(briefing?.kind)) briefing = null;
  if (dropShow) return endDropShow();
  if (flyShow) return endFlyShow();
  if (bangTimer) return endBangHold();
  if (state.outcome) return;
  state = selectUnit(state, unitId);
  render();
}

function handleEndTurn() {
  if (briefing) return closeBriefing();
  if (dropShow) return endDropShow();
  if (flyShow) return endFlyShow();
  if (bangTimer) return endBangHold();
  if (state.phase === 'drop') return jumpNow();
  endTurnNow();
}

function endTurnNow() {
  undoStack = [];
  pencilsFor = null;
  const before = new Map(state.units.map((u) => [u.id, u.dead]));
  earlierReports = [{ turn: state.turn, events: state.report }, ...earlierReports].slice(0, 2);
  const trainWas = trainView();
  state = endTurn(state, rules, baseMap);
  // The goods train runs to its new place (M35): how far its engine went, or
  // its own pace where it has just come on or gone off.
  const trainNow = trainView();
  const trainSteps = !trainWas && !trainNow ? 0 : !trainWas || !trainNow ? rules.train.speed : trainNow.head - trainWas.head;
  cueReport(state.report);
  garrisonShow = describeGarrisonShow(state);
  // The card waits for the garrison's moves and any bang to be seen (M11, M15);
  // any key or click brings it at once.
  const hold = Math.max(
    garrisonShow.length,
    state.report.some((e) => e.kind === 'explosion') ? BLAST.holdMs : 0,
    trainSteps > 0 ? trainSteps * TRAIN.msPerHex + TRAIN.wreckMs + GARRISON_SHOW.tailMs : 0,
    // A man killed floats away before the card (M21).
    state.units.some((u) => u.dead && !before.get(u.id)) ? DEATH.delayMs + DEATH.floatMs : 0,
  );
  if (!state.outcome && briefingsOn) {
    if (hold > 0) {
      clearTimeout(bangTimer);
      bangTimer = setTimeout(endBangHold, hold);
    } else {
      briefing = { kind: 'turn' };
    }
  }
  render();
}

// The counter key beside the orders (M15), drawn once per game from its men
// and garrison, so its examples are the real counters.
const counterKey = document.getElementById('counter-key');
let counterKeyDrawn = null;

function showCounterKey(on) {
  counterKey.hidden = !on;
  // The orders make room for it beside the crease (M17).
  briefingBackdrop.classList.toggle('with-key', on);
  // Again for a new game or a new level, whose arcs may differ.
  const drawnFor = `${state.seed}:${level.id}`;
  if (!on || counterKeyDrawn === drawnFor) return;
  counterKeyDrawn = drawnFor;
  const index = state.units.findIndex((u) => !u.leader && chargeCapacity(u, rules) > 0);
  const man = state.units[index];
  // Beside him, so two blue dots, one of them spent: both kinds show.
  const bonus = rules.command.closeBonusActionPoints ?? rules.command.bonusActionPoints;
  const enemy = state.enemies.find((e) => e.speed > 0) ?? state.enemies[0];
  drawCounterKey(document.getElementById('counter-key-art'), {
    // A man with a charge and the leader's orders, one AP spent.
    man: { ...man, apMax: man.apBase + bonus, ap: man.apBase + bonus - 1, commandBonus: bonus, charges: 1, hidden: false, hits: 0 },
    manNumber: index + 1,
    leader: state.units.find((u) => u.leader),
    enemy,
  }, { arc: enemy.arcDegrees });
}

/**
 * Why each enemy wears the red "!" that popped on it in the garrison's turn
 * (M15): what it saw or found, from the last turn's report, by enemy id. It
 * stays on the chip through the player phase with a rollover saying so (M20,
 * the operator's: it could not be asked what had alerted it). The RAF
 * diversion calls every enemy off, so it takes them away.
 */
function alarmReasons() {
  const reasons = new Map();
  if (state.phase === 'drop' || state.report.some((e) => e.kind === 'diversion')) return reasons;
  const place = (h) => placeName(map, state.objectives, baseMap.exfil.map(([q, r]) => ({ q, r })), h);
  const add = (id, words) => reasons.set(id, [...(reasons.get(id) ?? []), words]);
  for (const e of state.report) {
    if (e.kind === 'spotted') for (const id of e.enemyIds ?? []) add(id, { kind: 'spotted', words: `spotted ${e.unitName} in ${place(e)}` });
    if (e.kind === 'bodyFound' && e.enemyId) add(e.enemyId, { kind: 'found', words: `found ${e.name}'s body in ${place(e)}` });
    if (e.kind === 'parachuteFound' && e.enemyId) add(e.enemyId, { kind: 'found', words: `found ${e.name}'s parachute in ${place(e)}` });
  }
  return reasons;
}

/** The "!" on an enemy's chip in words: what raised it, and what comes of it (M20). */
function describeAlarm(enemy) {
  const reasons = currentView?.alarmed.get(enemy.id) ?? [];
  const what = reasons.map((r) => r.words).join(', and ');
  const after = [];
  if (enemy.watching) {
    const man = state.units.find((u) => u.id === enemy.holding?.unitId || (u.q === enemy.watching.q && u.r === enemy.watching.r));
    after.push(`It has ${man ? man.shortName : 'him'} in its sights (the dashed line): if it sees him again at the end of this turn it fires. Get him out of its view, hide him [H], or ${fireBackWords()}.`);
  }
  if (reasons.some((r) => r.kind === 'found')) after.push(`What it found put the alert up +${rules.alert.bodyFound}, and the patrols in earshot come to look.`);
  return titled('RAISED THE ALARM', `At the end of last turn the ${enemy.label.toLowerCase()} ${what}. ${after.join(' ')}`.trim());
}

/**
 * What the board shows of the garrison's turn (M15): each enemy walks its
 * `walked` steps; a "!" pops on each that spotted a man (at once) or found a
 * body or parachute (once it has walked there); a ripple runs out from each
 * noise heard. `length` is how long the walking takes, with a beat after.
 */
function describeGarrisonShow(after) {
  const steps = Math.max(0, ...after.enemies.map((e) => e.walked?.length ?? 0));
  const msPerHex = GARRISON_SHOW.msPerHex[rules.alert.states[alertIndex(after.alert.points, rules)].id];
  const alarmed = new Map();
  for (const e of after.report) {
    if (e.kind === 'spotted') for (const id of e.enemyIds ?? []) alarmed.set(id, 0);
    if ((e.kind === 'bodyFound' || e.kind === 'parachuteFound') && e.enemyId && !alarmed.has(e.enemyId)) {
      const walked = after.enemies.find((x) => x.id === e.enemyId)?.walked?.length ?? 0;
      alarmed.set(e.enemyId, walked * msPerHex);
    }
  }
  const heard = after.report.filter((e) => e.kind === 'heard').map((e) => ({ q: e.q, r: e.r }));
  const busy = steps > 0 || alarmed.size > 0 || heard.length > 0;
  return { since: performance.now(), alarmed, heard, msPerHex, length: busy ? steps * msPerHex + GARRISON_SHOW.tailMs : 0 };
}

function endBangHold() {
  clearTimeout(bangTimer);
  bangTimer = null;
  briefing = { kind: 'turn' };
  render();
}

/**
 * Start a new game on a fresh seed at the same level, without reloading the
 * page (M12): the restart in the margin, and Play again on the back page. The
 * orders open again, as on any new game (SPEC.md §11).
 */
function restartMission() {
  clearTimeout(dropShowTimer);
  dropSound?.stop();
  dropSound = null;
  clearTimeout(flyShowTimer);
  clearTimeout(bangTimer);
  dropShow = null;
  flyShow = null;
  bangTimer = null;
  garrisonShow = null;
  strikeShow = null;
  briefingAfterDrop = false;
  highlightHex = null;
  hoverUnitId = null;
  lastSelectedId = null;
  hidePopup();
  resetBoardMemory(layers);
  // A seed in the address would replay the old drop on a reload: the new one is fresh.
  const query = new URLSearchParams(window.location.search);
  query.delete('seed');
  const search = query.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
  startMission(level, freshSeed(Date.now()));
  briefing = { kind: 'orders', opening: true };
  render();
}

// The restart in the margin asks once: a first click arms it for a few
// seconds, a second click starts again. A mission is too long to lose to a slip.
let restartArmed = null;
function handleRestartClick() {
  restartButton.blur();
  if (restartArmed) {
    clearTimeout(restartArmed);
    restartArmed = null;
    renderRestart(restartButton, false);
    restartMission();
    return;
  }
  restartArmed = setTimeout(() => {
    restartArmed = null;
    renderRestart(restartButton, false);
  }, 4000);
  renderRestart(restartButton, true);
}

// Back to the contents from inside a mission (M31d, the operator's). Before
// the jump nothing is at stake and it goes at once; after it, it asks once as
// RESTART does, and the game on the board is given up for a fresh one.
let contentsBackArmed = null;
function handleContentsBackClick() {
  contentsBackButton.blur();
  const atStake = state.phase !== 'drop' && !state.outcome;
  if (atStake && !contentsBackArmed) {
    contentsBackArmed = setTimeout(() => {
      contentsBackArmed = null;
      renderContentsBack(contentsBackButton, false);
    }, 4000);
    renderContentsBack(contentsBackButton, true);
    return;
  }
  clearTimeout(contentsBackArmed);
  contentsBackArmed = null;
  renderContentsBack(contentsBackButton, false);
  if (state.phase !== 'drop') restartMission();
  openContents();
}

/** The orders again, with the counter key beside them, at any time (M16, the operator's). */
function openHelp() {
  if (state.outcome || briefing?.kind === 'orders' || briefing?.kind === 'contents') return;
  // M17, the operator's: the button did nothing while a turn card was up, as
  // it is most of the time a player reaches for it. Anything being shown is
  // cut short, as a key would, and the card it leads to waits under the
  // orders, laid back down when they are put away.
  if (dropShow) endDropShow();
  if (flyShow) endFlyShow();
  if (bangTimer) endBangHold();
  hidePopup();
  briefing = { kind: 'orders', under: briefing };
  render();
}

function closeBriefing() {
  // The contents page is put away by opening a mission: the one loaded.
  if (briefing?.kind === 'contents') return openMission(mission.id);
  briefing = briefing?.under ?? null;
  render();
}

/**
 * The contents page (M27): every mission in data/missions.json, the coming
 * ones stamped. It opens first unless `?mission=` named one, and the back
 * page's CONTENTS brings it back, on a new game.
 */
function openContents() {
  if (state.outcome) restartMission();
  briefing = { kind: 'contents', opening: true };
  render();
}

/**
 * A mission picked on the contents page. The one loaded opens its orders; any
 * other is its own files, so the page loads again with `?mission=` naming it.
 */
function openMission(id) {
  if (id === mission.id) {
    briefing = { kind: 'orders', opening: true };
    render();
    return;
  }
  const query = new URLSearchParams(window.location.search);
  query.set('mission', id);
  query.delete('seed');
  if (musicOff) query.set('music', 'off');
  else query.delete('music');
  window.location.search = query.toString();
}

// A turn card, or the diversion's, lets the board be seen and clicked round
// it (M23, the operator's: the first click of every turn only put the card
// away). A click on one of our men puts it away and selects him; any other
// click off the card only puts it away, as before, so a click meant to clear
// the card never moves the man still selected from last turn.
const CARDS_CLICKED_THROUGH = new Set(['turn', 'diversion']);

function clickThroughCard(event) {
  if (!CARDS_CLICKED_THROUGH.has(briefing?.kind) || briefingCard.contains(event.target)) return;
  const at = event.target.closest?.('#board [data-q]');
  const man = at && unitAt(state.units, Number(at.dataset.q), Number(at.dataset.r));
  closeBriefing();
  if (!man) event.stopPropagation();
}

/**
 * Set up the mission at a difficulty level (SPEC.md §10): the level's patches
 * over the files as loaded, and a fresh state on that seed. Only before the
 * jump, so a level can never be changed with anything at stake.
 */
function startMission(nextLevel, seed) {
  level = nextLevel;
  ({ rules, map: baseMap } = applyDifficulty(level, rawRules, rawMap));
  map = baseMap;
  state = createInitialState(roster, traits, rules, baseMap, seed);
  undoStack = [];
  menPicked = false;
  earlierReports = [];
  renderSeed(seedBox, seed, level, level.id === difficulty.default ? null : level.id, handleLevelClick);
}

/** A level picked on the orders: start again at it, keeping the seed and the run chosen. */
function handleChooseLevel(id) {
  if (state.phase !== 'drop' || id === level.id) return;
  const runId = state.dropRunId;
  startMission(levelById(difficulty, id), state.seed);
  if (runId) state = chooseDropRun(state, baseMap, runId);
  // Carried in the address, so Play again keeps it.
  const query = new URLSearchParams(window.location.search);
  if (id === difficulty.default) query.delete('difficulty');
  else query.set('difficulty', id);
  const search = query.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
  render();
}

/** The level in the margin: before the jump it opens the orders, where it is chosen. */
function handleLevelClick() {
  if (state.phase !== 'drop') return;
  briefing = { kind: 'orders' };
  render();
}

/** The card's words: the contents page, the orders before the drop, or this turn's update. */
function describeBriefing(which, view) {
  if (which.kind === 'contents') {
    return {
      banner: { title: GAME_TITLE, tagline: CONTENTS_TAGLINE },
      title: 'CONTENTS',
      kicker: 'IN THIS ANNUAL',
      paragraphs: ['Pick a mission. Each one stands alone: one night behind the lines, and out by dawn.'],
      contents: {
        entries: missions.missions.map((m) => ({ id: m.id, page: m.page, title: m.title, place: m.place, blurb: m.blurb, playable: m.status === 'playable', panel: m.panel ?? null })),
        onChoose: openMission,
      },
      sections: [],
      go: `TURN TO PAGE ${mission.page} — any key, or click a mission`,
      // Bottom left, as on the orders (M29b, the operator's).
      toggle: musicToggle(),
    };
  }
  if (which.kind === 'exfil') {
    const { kind, reason } = which.failure;
    const man = state.units.find((u) => u.id === which.unitId);
    return {
      title: 'ARE YOU SURE?',
      kicker: 'EXFIL',
      tone: 'warn',
      paragraphs: [[`Mission not yet complete. An exfil now will end it: ${kind.toUpperCase()}.`, `${reason[0].toUpperCase()}${reason.slice(1)}.`]],
      sections: [],
      confirm: { label: `${man.shortName} OUT ANYWAY [Enter]`, onConfirm: confirmExfil },
      go: 'STAY — any other key or click',
    };
  }
  if (which.kind === 'orders') {
    // Opened again in play with ? (M16): the same card, the level fixed and
    // the drop's own lines gone.
    const before = state.phase === 'drop';
    // Places in capitals, as the operator's orders name them (M12).
    const bonusTargets = state.objectives.filter((o) => !isWinTarget(state, rules, o));
    const bonus = bonusTargets.map((o) => `the ${o.label.toUpperCase()}`);
    // What each pays: one number if they all pay the same, as France's do;
    // else each in the order they are named (M33: names again ran a line over).
    const bonusScores = [...new Set(bonusTargets.map((o) => kindOf(o, rules).score))];
    const bonusPts = bonusScores.length === 1 ? `+${bonusScores[0]}pts${bonus.length === 1 ? '' : ' ea'}` : `${bonusTargets.map((o) => `+${kindOf(o, rules).score}`).join(', ')}pts`;
    const bonusText = bonus.length > 1 ? `${bonus.slice(0, -1).join(', ')} and ${bonus.at(-1)}` : bonus.join('');
    // Each target's charges against its points, and what the stick carries
    // between them, so a target with three points is not read as three charges.
    // Targets of one name and one need said once (M31: the airfield's eight
    // aircraft were eight clauses): "Stukas- 1ea at its charge target" (M31d).
    const needGroups = new Map();
    for (const o of state.objectives) {
      const needed = kindOf(o, rules).chargesNeeded;
      const points = o.chargeHexes.length;
      const where = needed === points ? (needed === 1 ? 'at its charge target' : ', one per charge target') : `at any ${needed === 1 ? '' : `${needed} `}charge target${needed === 1 ? '' : 's'}`;
      const key = `${o.label}|${needed}|${where}`;
      needGroups.set(key, { label: o.label, needed, where, n: (needGroups.get(key)?.n ?? 0) + 1 });
    }
    // Names that need the same said together (M33: with the bomb store the
    // airfield had four clauses alike): "Stukas, Ju 52s, Bowser, Bomb Store- 1ea…".
    const sameNeed = new Map();
    for (const { label, needed, where, n } of needGroups.values()) {
      const key = `${needed}|${where}`;
      const group = sameNeed.get(key) ?? { names: [], needed, where, n: 0 };
      sameNeed.set(key, { ...group, names: [...group.names, n === 1 ? label : `${label}s`], n: group.n + n });
    }
    const needs = [...sameNeed.values()].map(({ names, needed, where, n }) => (
      `${names.join(', ')}- ${needed}${n === 1 ? '' : 'ea'}${where.startsWith(',') ? '' : ' '}${where}`
    )).join('; ');
    const carried = state.units.reduce((n, u) => n + u.charges, 0);
    const runs = baseMap.dropRuns.map((r) => r.label.split(' ')[0].toUpperCase());
    const runList = runs.length > 1 ? `${runs.slice(0, -1).join(', ')} or ${runs.at(-1)}` : runs.join('');
    // The one target a scout can cut instead of blowing (M12: the orders did not say).
    const cuttable = state.objectives.find((o) => kindOf(o, rules).cutLine);
    const cutter = Object.values(rules.roles).find((role) => role.cutLine);
    // The airfield's two rules (M31), said where a mission has them: the timer
    // when charges take one, and whatever sets off its neighbours.
    // The salvo (M33), with the timers that earn it.
    const salvo = rules.scoring.salvo;
    const salvoWords = salvo ? ` ${salvo.count} ${kindOf(winTargets(state, rules).targets[0], rules).label.toLowerCase()} up in one bang: bonus +${salvo.points}.` : '';
    const choice = rules.charges.fuseChoice;
    const timerLine = choice
      ? `Every charge takes a timer: after C, pick a time pencil from the tin (${choice.min}–${choice.max} turns; ${rules.charges.fuseTurns} is offered first), then SET. A long timer lets charges set over several turns go off together, with the stick already on its way out.${salvoWords}`
      : null;
    // One line however many there are (M33: the bomb store made two, and the
    // airfield's orders had no room for a line each).
    const setters = state.objectives.filter((o) => setsOffList(o).length);
    const takes = setters.map((o, i) => `${i === 0 ? 'The' : 'the'} ${o.label.toUpperCase()}${i === 0 ? ' sets off' : ''} ${namesOf(setsOffList(o))} beside it`);
    const setterLines = setters.length === 0 ? [] : [
      `${takes.length > 1 ? `${takes.slice(0, -1).join(', ')} and ${takes.at(-1)}` : takes[0]}: ${setsOffList(setters[0]).length + 1} targets for one charge${setters.length > 1 ? ' each time' : ''}, and one bang.`,
    ];
    return {
      banner: { title: GAME_TITLE, tagline: mission.tagline },
      // The mission's title heads its orders (M31d, the operator's), and
      // ORDERS goes to the kicker, so the card is no taller.
      title: mission.title.toUpperCase(),
      kicker: `ORDERS · ${before ? 'BEFORE THE DROP' : `TURN ${state.turn} OF ${rules.turnLimit}`}`,
      paragraphs: [
        // The opening on a line of its own (M13), then the job.
        [
          mission.briefing,
          // Dawn on a line of its own (M22, the operator's).
          // Split at the comma (M31d, the operator's): EXFIL sat alone on a line.
          // In bold, the job standing out from the words round it (M31d, the operator's).
          { bold: `Blow ${winWords(state, rules, { upper: true })} before dawn,` },
          { bold: `then get at least ${rules.mission.minimumOut} of the men out at the EXFIL.` },
          `Dawn comes at the end of turn ${rules.turnLimit}.`,
        ],
        // The timer named where charges take one, and the last sentence on a
        // line of its own (M31d, the operator's).
        ...(bonus.length ? [[
          `${bonusText[0].toUpperCase()}${bonusText.slice(1)} ${bonus.length === 1 ? 'is a bonus target' : 'are bonus targets'} (${bonusPts}). ${rules.charges.fuseChoice
            ? 'Every bang alerts the garrison, so carefully plan the order and timer duration of the charges you set.'
            : 'Every bang alerts the garrison, so plan the order you set charges carefully.'}`,
          'It’s good to be slow and stealthy, but be sure to finish before dawn!',
          // The goods train (M34), where the mission has one.
          ...(rules.train ? [`The ${rules.train.label.toUpperCase()} ${trainDue().replace(/ \(charges.*\)$/, '').replace(trainObjective(state, rules).label, trainObjective(state, rules).label.toUpperCase())}.`] : []),
          // The clean run said up front (M32c, the operator's): until now only
          // the back page told of it. The mission's own words, as its condition is.
          ...(mission.words.cleanOrders ? [mission.words.cleanOrders] : []),
        ]] : []),
      ],
      sections: [{
        heading: 'HOW TO PLAY',
        lines: [
          ...(before ? [
            `The Dakota troop aircraft flies on your choice of ${runList} run; your men jump along it, drifting a hex or two downwind. Pick one with 1–3.`,
            'Hit SPACE to jump. Then click a man (or press 1–6), hover a hex to see what the move costs and risks, and click to go. SPACE ends a turn.',
          ] : ['Click a man (or press 1–6), hover a hex to see what the move costs and risks, and click to go. SPACE ends a turn.']),
          // The operator's words (M13): "vulnerable points" here only; the
          // game calls them charge points from then on.
          'The red dashed hexes are vulnerable points: to destroy, stand a man with a charge on one and press C.',
          // The operator's words (M31d): "charge target", and "Stukas- 1ea".
          `You don’t fill every charge target. Charges needed: ${needs}. The squad carries ${carried}.`
            + (cuttable && cutter ? ` Or a ${cutter.label.toLowerCase()} can cut the ${cuttable.label}’s lines [X]: a whole turn, and quiet.` : ''),
          ...(timerLine ? [timerLine] : []),
          ...setterLines,
          'Hover anything for detail; KEYBOARD lists every key, and ? brings this card back.',
        ],
      }],
      // SPEC.md §10: the level, chosen here and fixed once the stick jumps.
      // At the top (M13): the level changes numbers in the text under it.
      choice: {
        top: true,
        locked: !before,
        heading: 'DIFFICULTY',
        options: difficulty.levels.map((l) => ({ id: l.id, label: l.label, summary: l.summary, selected: l.id === level.id })),
        onChoose: handleChooseLevel,
      },
      // Bottom left (M21, the operator's): the music plays only before the jump.
      toggle: before ? musicToggle() : null,
    };
  }
  if (which.kind === 'diversion') return describeDiversionCard(which.before);
  const lines = rankedReport(state.report, view.place);
  const shown = 6;
  const alert = rules.alert.states[alertIndex(state.alert.points, rules)];
  return {
    title: `TURN ${state.turn} OF ${rules.turnLimit}`,
    kicker: `GARRISON ${alert.label.toUpperCase()}`,
    sections: [
      {
        heading: state.turn === 1 ? 'THE DROP' : 'SINCE LAST TURN',
        lines: lines.length ? lines.slice(0, shown) : ['A quiet night. Nothing seen.'],
        more: lines.length > shown ? `…and ${lines.length - shown} more in the report under the map.` : null,
      },
      { heading: 'WHAT NEXT', hints: true, lines: hintsFor(state, rules, { diversionOk: view.mission.diversion.ok, diversionName: mission.words.diversionName }) },
    ],
    toggle: { on: briefingsOn },
  };
}

/** Music off (M21, the operator's), bottom left of the orders and the contents page. */
function musicToggle() {
  return {
    on: musicOff,
    label: ' Music off',
    onChange: (on) => {
      musicOff = on;
      syncMusic();
    },
  };
}

/** The card when the RAF diversion is called: what it did, and what is left. */
function describeDiversionCard(before) {
  const label = (points) => rules.alert.states[alertIndex(points, rules)].label;
  const from = label(before.alert.points);
  const to = label(state.alert.points);
  const searches = before.enemies.filter((e) => e.investigating || e.holding).length + (before.contact ? 1 : 0);
  const freed = before.units.filter((u) => u.inContact).length;
  const left = rules.diversion.uses - state.diversionsCalled;
  const lines = [
    from !== to
      ? `The alert drops: ${from} → ${to}.`
      : `The alert stays ${to}${state.explosions ? ': after an explosion it never drops lower' : ''}.`,
  ];
  if (searches) lines.push(`${searches} ${searches === 1 ? 'search is' : 'searches are'} called off.`);
  if (freed) lines.push(`${freed} ${freed === 1 ? 'man is' : 'men are'} out of contact.`);
  lines.push('The clean-run bonus is gone.');
  return {
    title: mission.words.diversionName.toUpperCase(),
    kicker: mission.words.diversionKicker,
    // Headed in the diversion's own blue, as its button is (M11).
    tone: 'raf',
    paragraphs: ['The radio worked. The garrison looks the other way.'],
    sections: [
      { heading: 'WHAT IT DID', lines },
      { heading: 'THE RADIO', lines: [left > 0 ? `${left === 1 ? 'One more call' : `${left} more calls`} left, while the leader lives.` : 'No more calls this mission.'] },
    ],
  };
}

/** A marker on a man's counter, in words — [heading, text]: what it means and what to do about it. */
function describeMarker(id, unit) {
  const name = unit.shortName;
  if (id === 'marker-spotted') {
    return ['SPOTTED — IN CONTACT', `${name} has been seen, and whoever saw him is watching him (the dashed line). `
      + `If he is seen again at the end of this turn he is fired on: hit in the open or light cover, pinned in heavy cover — `
      + `and pinned, never hit, if every enemy firing is more than ${rules.combat.hitRange} hexes away. `
      + 'An enemy fires at one man a turn, the one it is watching first, so another man in its sights can draw its fire.\n'
      + `Break contact now: get out of its sight, hide where the readout says he is not spotted [H], or ${fireBackWords()}.`];
  }
  if (id === 'marker-wounded') {
    const left = rules.combat.hitsToKill - unit.hits;
    return ['WOUNDED', `${name} is down to ${rules.combat.woundedActionPoints} AP and cannot carry a charge. ${left === 1 ? 'One more hit kills him' : `${left} more hits kill him`}. `
      + 'A man beside him can stabilise him [A]: a full turn, and he gets his full AP back.'];
  }
  if (id === 'marker-hidden') {
    return ['HIDDEN', `${name} has gone to ground: +${rules.actions.hide.concealment} concealment on this hex until he next spends AP: leave him where he is and he stays down.`];
  }
  if (id === 'marker-orders') {
    const leader = state.units.find((u) => u.leader);
    const where = rules.command.closeRadius != null && unit.commandBonus === rules.command.closeBonusActionPoints
      ? (rules.command.closeRadius === 1 ? 'beside' : `within ${rules.command.closeRadius} hexes of`)
      : `within ${rules.command.radius} hexes of`;
    return ['ORDERS', `${name} started this turn ${where} ${leader?.shortName ?? 'the leader'}: +${unit.commandBonus} AP this turn. `
      + `The orders give ${ordersWords(rules.command)}.`];
  }
  return ['', ''];
}

/** The leader standing on this hex, if he is: his counter has a rollover (M12). */
function leaderAt(hex) {
  if (!hex || state.phase === 'drop') return null;
  return state.units.find((u) => u.leader && onBoard(u) && u.q === hex.q && u.r === hex.r) ?? null;
}

/** "Dutch's orders — at the start of a turn, +2 AP beside him, +1 AP within 2 hexes of him". */
function leaderOrdersWords(leader) {
  return `${leader.shortName}'s orders — at the start of a turn, ${ordersWords(rules.command)}`;
}

/** Jump, and show the stick going out and coming down. */
function jumpNow() {
  const run = runById(baseMap, state.dropRunId);
  if (!run) return;
  const jumps = jumpPoints(run, state.units.length);
  const order = state.units.map((u) => u.id);
  undoStack = [];
  state = jump(state, baseMap, rules);
  const landed = state.report.filter((e) => e.kind === 'landed');
  if (landed.length) {
    dropShow = {
      since: performance.now(),
      from: { q: run.from[0], r: run.from[1] },
      to: { q: run.to[0], r: run.to[1] },
      jumps: landed.map((e) => ({ unitId: e.unitId, jump: jumps[order.indexOf(e.unitId)], land: { q: e.q, r: e.r } })),
    };
    clearTimeout(dropShowTimer);
    dropShowTimer = setTimeout(endDropShow, dropTimeline(baseMap, dropShow).length);
    dropSound = playCue('drop');
    briefingAfterDrop = briefingsOn;
  } else if (state.phase !== 'drop' && briefingsOn) {
    briefing = { kind: 'turn' };
  }
  render();
}

function endDropShow() {
  clearTimeout(dropShowTimer);
  dropSound?.stop();
  dropSound = null;
  dropShow = null;
  if (briefingAfterDrop) briefing = { kind: 'turn' };
  briefingAfterDrop = false;
  render();
}

function endFlyShow() {
  clearTimeout(flyShowTimer);
  if (flyShow) briefing = { kind: 'diversion', before: flyShow.before };
  flyShow = null;
  render();
}

// A run clicked a second time jumps (M12: players did not see that Space was next).
function handleChooseRun(runId) {
  if (runId !== null && runId === state.dropRunId && !briefing) {
    hidePopup();
    jumpNow();
    return;
  }
  state = chooseDropRun(state, baseMap, runId);
  render();
}

// Before anyone has landed there are only the runs to pick (1–3), the jump
// (Space), and the route overlay (R).
function handleDropKey(event) {
  const key = event.key;
  const run = key >= '1' && key <= '9' ? baseMap.dropRuns[Number(key) - 1] : null;
  if (run) {
    state = chooseDropRun(state, baseMap, run.id);
  } else if (key === ' ') {
    event.preventDefault();
    jumpNow();
    return;
  } else if (key === 'r' || key === 'R') {
    state = toggleRoutes(state);
  } else if (key === 'Escape') {
    state = chooseDropRun(state, baseMap, null);
  } else {
    return;
  }
  render();
}

/**
 * ? on any layout, or the slash key with or without shift (M22, the
 * operator's: / is the same key, unshifted). Not in the KEYBOARD list.
 */
function isHelpKey(event) {
  return event.key === '?' || event.key === '/' || event.code === 'Slash';
}

// SPEC.md §4: 1–6 select, Tab cycle, Space end turn, Esc cancel, H hold,
// R toggle the patrol-route overlay, and the action keys. Once the mission is
// over only R still does anything.
function handleKey(event) {
  unlockSound();
  // The loading page (M17): any key opens the game once it is ready, and does nothing else.
  if (!opened) {
    event.preventDefault();
    if (loaded) openGame();
    return;
  }
  if ((event.key === 'm' || event.key === 'M') && !event.metaKey && !event.ctrlKey && !event.altKey) {
    toggleSound();
    return;
  }
  // Cmd-Z or Ctrl-Z undoes, as everywhere else; so does Z on its own.
  if ((event.metaKey || event.ctrlKey) && !event.altKey && (event.key === 'z' || event.key === 'Z') && !briefing && !dropShow && !flyShow) {
    event.preventDefault();
    undoLast();
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  // Any key puts the briefing away, and does nothing else — but Enter on the
  // exfil card, which goes out anyway.
  if (briefing) {
    event.preventDefault();
    if (briefing.kind === 'exfil' && event.key === 'Enter') return confirmExfil();
    // ? over a turn card swaps it for the orders (M17), as the button does.
    if (isHelpKey(event) && !['orders', 'exfil', 'contents'].includes(briefing.kind)) return openHelp();
    const picksMan = CARDS_CLICKED_THROUGH.has(briefing.kind) && (/^[1-9]$/.test(event.key) || event.key === 'Tab');
    closeBriefing();
    // A man's number, or Tab, puts a turn card away and picks him (M23), as a click on him does.
    if (!picksMan) return;
  }
  if (dropShow) {
    event.preventDefault();
    endDropShow();
    return;
  }
  if (flyShow) {
    event.preventDefault();
    endFlyShow();
    return;
  }
  if (bangTimer) {
    event.preventDefault();
    endBangHold();
    return;
  }
  if (isHelpKey(event)) {
    event.preventDefault();
    openHelp();
    return;
  }
  if (state.phase === 'drop') {
    handleDropKey(event);
    return;
  }
  if (state.outcome && event.key !== 'r' && event.key !== 'R') return;
  const key = event.key;

  // The time pencils open (M30): a number takes that many turns, C or Enter
  // the default, Esc backs out; any other key puts them away and does its own.
  const setter = selectedUnit(state);
  if (pencilsOpen(setter)) {
    // A number lifts that pencil out of the tin; Enter or C sets the one lifted (M31d).
    if (/^[0-9]$/.test(key)) {
      liftPencil(setter, Number(key));
      render();
      return;
    }
    if (key === 'Enter' || key === 'c' || key === 'C') {
      event.preventDefault();
      setCharge(setter, pencilLifted ?? undefined);
      render();
      return;
    }
    pencilsFor = null;
    pencilLifted = null;
    if (key === 'Escape') {
      render();
      return;
    }
  } else {
    pencilsFor = null;
  }

  if (key >= '1' && key <= '9') {
    const unit = state.units[Number(key) - 1];
    if (unit && onBoard(unit)) {
      state = selectUnit(state, unit.id);
      render();
    }
    return;
  }

  switch (key) {
    case 'Tab': {
      event.preventDefault();
      const next = nextUnitId(state);
      if (next) state = selectUnit(state, next);
      break;
    }
    case ' ':
      event.preventDefault();
      endTurnNow();
      return;
    case 'r':
    case 'R':
      state = toggleRoutes(state);
      break;
    case 'Escape':
      state = deselect(state);
      break;
    // M13: Hide is H, and Hold is gone — Tab moves on, and End turn ends it.
    case 'h':
    case 'H':
      handleAction('hide');
      return;
    case 's':
    case 'S':
      handleAction('suppress');
      return;
    case 'k':
    case 'K':
      handleAction('kill');
      return;
    case 'n':
    case 'N':
      handleAction('knife');
      return;
    case 't':
    case 'T':
      handleAction('stone');
      return;
    case 'z':
    case 'Z':
      undoLast();
      return;
    case 'a':
    case 'A':
      handleAction('stabilise');
      return;
    case 'p':
    case 'P':
      handleAction('pickUp');
      return;
    case 'u':
    case 'U':
      handleAction('pack');
      return;
    case 'c':
    case 'C':
      handleAction('charge');
      return;
    case 'x':
    case 'X':
      handleAction('cut');
      return;
    case 'w':
    case 'W':
      handleAction('swim');
      return;
    case 'e':
    case 'E':
      handleAction('pass');
      return;
    case 'd':
    case 'D':
      handleAction('diversion');
      return;
    default:
      return;
  }
  render();
}

// --- the loading page (M17) ------------------------------------------------------
// The spread stays hidden until its first draw is done and the supplied
// pictures are in, so nothing is seen being laid out (the operator: over the
// web the boxes under the map were drawn first, in the middle of the page,
// then jumped). Meanwhile a fuse burns down on the table as the files arrive.
// Ready, it asks for a key or a click, which opens the spread on the orders —
// and, being the player's first touch, lets the browser start the title music
// with them.
const LOADING = { maxWaitMs: 8000 };
const loadingPage = document.getElementById('loading');
let loadingDone = 0;
let loadingTotal = 0;
let loaded = false;
let opened = false;

function loadingProgress(promises) {
  loadingTotal += promises.length;
  showLoadingProgress();
  for (const promise of promises) {
    promise.finally(() => {
      loadingDone++;
      showLoadingProgress();
    });
  }
}

function showLoadingProgress() {
  const share = loaded ? 1 : loadingTotal ? loadingDone / loadingTotal : 0;
  loadingPage.style.setProperty('--loaded', share.toFixed(3));
}

function gameLoaded() {
  loaded = true;
  showLoadingProgress();
  document.documentElement.classList.add('loaded');
  loadingPage.addEventListener('click', openGame);
}

function openGame() {
  if (opened) return;
  opened = true;
  document.documentElement.classList.add('opened');
  loadingPage.setAttribute('aria-hidden', 'true');
  render();
}

// --- start ------------------------------------------------------------------

// Tells the failure reporter in index.html that the module did run, so it can
// tell "the browser would not run this" apart from "this threw".
window.dispatchEvent(new Event('night-drop-started'));

try {
  applyDocumentTheme();
  const paperLoaded = loadSuppliedPaper();
  const fontsLoaded = loadSuppliedFonts().then(() => document.documentElement.classList.add('fonts-ready'));
  loadingProgress([paperLoaded, fontsLoaded]);
  // The mission (M27): `?mission=` picks one, as `?seed=` picks a seed; its
  // files and patches are loaded here, before the level's go over them.
  missions = validateMissions(await loadJson('data/missions.json'));
  mission = missionById(missions, missionFromQuery(window.location.search, missions));
  rawMap = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
  rawRules = missionRules(mission, await loadJson('data/rules.json'));
  traits = validateTraits(await loadJson('data/traits.json'));
  roster = missionRoster(mission, await loadJson(mission.roster));
  // The levels, with the mission's own part of each (M28) carried on them.
  difficulty = missionLevels(mission, validateDifficulty(await loadJson('data/difficulty.json'), rawRules, { types: rawMap.enemyTypes }), rawRules, rawMap.enemyTypes);
  useMissionWords(mission.words);
  // Our men's counters in the mission's own colour, if it has one (M31d).
  applyCounterColour(mission.counterColour ?? null);
  ({ version } = await loadJson('data/version.json'));
  renderVersion(document.getElementById('version'), version);

  // SPEC.md §1: a seed reproduces a playthrough. `?seed=N` replays one; with
  // none, the clock picks a fresh one. It is shown on the page either way,
  // with the difficulty, which `?difficulty=` picks the same way (§10).
  const seed = seedFromQuery(window.location.search) ?? freshSeed(Date.now());
  startMission(levelById(difficulty, difficultyFromQuery(window.location.search, difficulty)), seed);

  const bounds = boardPixelBounds(map);
  svg.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`);
  // The board takes all the room the window gives it (SPEC.md §11 layout).
  const aspect = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);
  fitSpread(aspect);
  window.addEventListener('resize', () => fitSpread(aspect));

  layers = createBoard(svg, map, {
    onHexClick: handleHexClick,
    onHexHover: handleHexHover,
    onHexLeave: handleHexLeave,
    // A drop run's name on the board has the same rollover as its button.
    onRunHover: (runId, anchor) => showPopup(anchor, describeRun(currentView.dropRuns.find((r) => r.id === runId))),
    onRunLeave: hidePopup,
    onRunChoose: handleChooseRun,
    onMarkerHover: (id, unitId, anchor) => showPopup(anchor, titled(...describeMarker(id, state.units.find((u) => u.id === unitId)))),
    onMarkerLeave: hidePopup,
    onEnemyMarkerHover: (enemyId, anchor) => {
      const enemy = state.enemies.find((e) => e.id === enemyId);
      if (enemy) showPopup(anchor, describeAlarm(enemy));
    },
  });

  // Right-click cancels (SPEC.md §4), so the browser menu has to get out of
  // the way over the board.
  svg.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    state = deselect(state);
    render();
  });
  syncReportScroll = attachReportScroll(reportList, reportScroll, document.getElementById('report-up'), document.getElementById('report-down'));
  endTurnButton.addEventListener('click', handleEndTurn);
  undoButton.addEventListener('click', undoLast);
  attachPopup(undoButton, () => describeUndo(rules.undo.steps));
  diversionButton.addEventListener('click', () => handleAction('diversion'));
  window.addEventListener('keydown', handleKey);
  // Browsers keep sound off until the page has been pressed or clicked.
  window.addEventListener('pointerdown', unlockSound);
  // `?sound=off` starts the game muted (M22, the operator's: a test run in
  // the browser played the music over their work). M still turns it on.
  if (new URLSearchParams(window.location.search).get('sound') === 'off') setMuted(true);
  soundToggle.addEventListener('click', () => {
    soundToggle.blur();
    toggleSound();
  });
  renderSoundToggle(soundToggle, isMuted());
  restartButton.addEventListener('click', handleRestartClick);
  renderRestart(restartButton, false);
  contentsBackButton.addEventListener('click', handleContentsBackClick);
  renderContentsBack(contentsBackButton, false);
  // Sound files dropped into assets/audio replace the placeholders (ART-ASSETS.md §9).
  loadSuppliedSounds();

  // Portrait art dropped into assets/portraits replaces the drawn stand-in
  // as each file arrives (ART-ASSETS.md §2). So do a painted title card in
  // assets/title (§7), a painted aircraft in assets/aircraft and a painted
  // blast in assets/markers (§6). The page waits for them (M17), so it opens
  // whole rather than filling in bit by bit.
  const pictures = [
    paperLoaded,
    loadSuppliedPortraits(state.units.map((u) => u.id), () => render(), mission.portraits ?? null),
    loadSuppliedTitleCard(mission.titleCard, mission.titleCardLettered ?? true),
    loadSuppliedAircraft(),
    loadSuppliedVehicle(baseMap.diversionRun?.art),
    loadSuppliedBlast(),
    loadSuppliedEnemyChips(Object.keys(baseMap.enemyTypes)),
  ];
  renderGutter(gutterNote);
  renderKeys(keysTab);
  attachPopup(helpTab, () => titled('HOW TO PLAY [?]', 'The orders, how to play and how to read a counter, at any time.'));
  helpTab.addEventListener('click', () => openHelp());
  attachPopup(alertBox, () => describeAlertStates(currentView.alert));
  attachPopup(diversionButton, () => describeDiversion(rules.diversion.uses));
  // The contents page opens over the board before anything else (M27), then
  // the orders (SPEC.md §11), with the title music over both. A mission named
  // in the address goes straight to its orders.
  briefing = { kind: missionFromQuery(window.location.search, missions) ? 'orders' : 'contents', opening: true };
  briefingBackdrop.addEventListener('click', () => closeBriefing());
  briefingBackdrop.parentElement.addEventListener('click', clickThroughCard, true);
  loadingProgress(pictures);
  // Speech bubbles are measured in the face they are set in: wait for it.
  await fontsLoaded;
  render();
  // Then for the pictures, but never for long: a slow file is not worth a
  // page that will not open. Whatever is late fills in as it arrives.
  await Promise.race([Promise.all(pictures), new Promise((resolve) => setTimeout(resolve, LOADING.maxWaitMs))]);
  gameLoaded();

  // The board is up. The failure reporter in index.html stops attributing
  // stray page errors — extensions throw plenty — to the game's startup.
  window.dispatchEvent(new Event('night-drop-ready'));
} catch (error) {
  readout.textContent = '';
  renderError(errorBox, error);
  // Nothing to wait for: show what did draw, under the error.
  document.documentElement.classList.add('opened');
}
