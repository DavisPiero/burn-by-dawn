// Bootstrap: owns the state, the input handling and the render loop. The
// render modules only draw; this module is the one place state actually
// changes (CLAUDE.md rule 7), and the one place game rules and rendering meet.

import { alertIndex, detectionAt, hearingRadius, listeners, routePath, shotResultOf, testedHexes, visibleHexes, visionRadiusOf } from './enemy.js';
import { canLandOn, dropArea, jumpPoints, runById } from './drop.js';
import { applyDifficulty, difficultyFromQuery, levelById, validateDifficulty } from './difficulty.js';
import { DIRECTION_NAMES, hexDistance } from './hex.js';
import { forEachCell, hexKey, isInPlay, loadMap, loadJson, terrainAt } from './map.js';
import { freshSeed, seedFromQuery } from './rng.js';
import {
  callDiversion, checkDiversion, chooseDropRun, createInitialState, cutLine, deselect, endTurn, hideUnit, holdUnit,
  jump, killEnemy, moveUnit, nextUnitId, packParachute, pickUpCharge, placeCharge, selectHex, selectUnit, selectedUnit, setHover,
  setTargeting, settleMission, silenceUnits, stabiliseUnit, suppressEnemy, swimAcross, throwStone, toggleRoutes,
} from './state.js';
import {
  blastHexesThisTurn, checkCutLine, checkPlaceCharge, checkSwim, effectiveMap, inBlast, isExfil, kindOf,
  objectiveAt, objectiveForChargeHex, primaryShortfall, swimTargets,
} from './sabotage.js';
import { hintsFor } from './hints.js';
import { applyHook, validateTraits } from './traits.js';
import {
  chargeCapacity, checkHide, checkKill, checkPackParachute, checkPickUpCharge, checkStabilise, checkSuppress, checkThrowStone,
  onBoard, planMove, reachableFor, traitEffects, unitAt,
} from './units.js';
import { boardPixelBounds, createBoard, dropTimeline, renderPieces } from './render/board.js';
import { isMuted, loadSuppliedSounds, playCue, setMuted, unlockSound } from './render/sound.js';
import { renderRoster } from './render/roster.js';
import {
  applyDocumentTheme, loadSuppliedAircraft, loadSuppliedEnemyChips, loadSuppliedFonts, loadSuppliedPaper, loadSuppliedPortraits, loadSuppliedTitleCard,
} from './render/theme.js';
import {
  attachPopup, describeAlertStates, dropStalePopup, fitSpread, describeDetection, describePlan, describeRisk, describeRun,
  describeDiversion, hidePopup, placeName, rankedReport, renderActions, renderBriefing, renderAlertDial, renderDawnStrip, renderDiversion, renderDropRuns,
  renderEndTurnButton, renderError, renderUndoButton, UNDO_HELP, renderGutter, renderKeys, renderMission, renderReadout, renderReport,
  renderResults, renderSeed, renderSoundToggle, renderTurnCounter, showPopup, titled,
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
const actionBar = document.getElementById('actions');
const diversionButton = document.getElementById('diversion');
const missionList = document.getElementById('mission');
const resultsBox = document.getElementById('results');
const seedBox = document.getElementById('seed');
const soundToggle = document.getElementById('sound-toggle');
const dawnStrip = document.getElementById('dawn-strip');
const gutterNote = document.getElementById('gutter-note');
const keysTab = document.getElementById('keys-tab');
const alertBox = document.getElementById('alert');
const briefingBackdrop = document.getElementById('briefing-backdrop');
const briefingCard = document.getElementById('briefing');

// The game's title, set over the title card on the orders and the back page.
const GAME_TITLE = 'BURN BY DAWN';
// Its strapline, along the foot of the title card on the orders and the back page.
const GAME_TAGLINE = 'SIX MEN · ONE BRIDGE · DAWN AT TWENTY';

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
// The briefing card (SPEC.md §11): which one is open, if any, whether turn
// updates are wanted this session, and whether one is waiting for the drop
// to finish being shown. Interface only, never game state.
let briefing = null;
let briefingsOn = true;
// Undo (SPEC.md §4): the state before the last move or action, and only the
// last — one step, a mis-click net. Cleared when it is used, when the turn
// ends and when the stick jumps, so it can never take back what the garrison
// has seen — and the player phase rolls no dice, so taking a move back can
// never re-roll anything.
let undoState = null;
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
      byId: new Map(state.enemies.map((e) => [e.id, visibleHexes(map, e, state.alert.points, rules)])),
    };
  }
  return visionCache.byId;
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
  const hoverEnemy = hex ? state.enemies.find((e) => e.q === hex.q && e.r === hex.r) ?? null : null;
  const routes = (state.showRoutes ? state.enemies : hoverEnemy ? [hoverEnemy] : [])
    .map((e) => routePath(map, e))
    .filter(Boolean);
  // Every hex the garrison is on its way to search, plus the last known
  // contact while nobody has searched it. One "?" ring each.
  const searchHexes = new Map();
  for (const e of state.enemies) if (e.investigating && !e.investigating.searched) searchHexes.set(hexKey(e.investigating.q, e.investigating.r), e.investigating);
  if (state.contact && !state.contact.searched) searchHexes.set(hexKey(state.contact.q, state.contact.r), state.contact);

  const exfil = baseMap.exfil.map(([q, r]) => ({ q, r }));
  const view = {
    traitEffectsById,
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
    hoverEnemy,
    hoverEnemyVision: hoverEnemy ? visionRadiusOf(map, hoverEnemy, state.alert.points, rules) : null,
    hoverEnemyFacing: hoverEnemy ? DIRECTION_NAMES[hoverEnemy.facing] : null,
    routes,
    searchHexes: [...searchHexes.values()],
    alert: {
      index: alertIndex(state.alert.points, rules),
      states: rules.alert.states,
      points: state.alert.points,
      quietTurns: state.alert.quietTurns,
      quietTurnsToDecay: rules.alert.quietTurnsToDecay,
      floor: state.explosions > 0 ? rules.alert.states.find((s) => s.id === rules.explosionFloor)?.label ?? null : null,
    },
    reachable: null,
    plan: null,
    moveLabel: null,
    risk: null,
    riskLabel: null,
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
    // An objective with every charge it needs set takes no more, so its empty
    // charge points are no longer drawn: "put one here" would be a lie.
    chargedObjectiveIds: new Set(state.objectives.filter((o) => !o.destroyed && chargesWanted(o) === 0).map((o) => o.id)),
    // The leader's orders, for his rollover in the roster (SPEC.md §5 Command).
    command: rules.command,
    diversionUses: rules.diversion.uses,
    hoverObjective: null,
    previewBlastArea: null,
    siteLabel: null,
    blastLabel: null,
    mission: describeMissionState(),
    drop: null,
    dropRuns: null,
    dropLabel: null,
    dropShow,
    targetRings: null,
  };

  if (state.phase === 'drop') return deriveDrop(view, hex);

  const objective = hex && !hoverEnemy ? objectiveAt(state.objectives, hex) : null;
  if (objective) {
    view.hoverObjective = objective;
    view.siteLabel = describeObjective(objective);
    if (!objective.destroyed && objectiveForChargeHex(state.objectives, hex) === objective) {
      const wanted = chargesWanted(objective);
      const points = objective.chargeHexes.length;
      view.siteLabel = wanted > 0
        ? `CHARGE POINT for the ${objective.label}, one of ${points} — a man carrying a charge stands here and places it [C]. `
          + `It needs ${wanted} more charge${wanted === 1 ? '' : 's'}${wanted === 1 && points > 1 ? ': any one of its points will do' : ''}. ${view.siteLabel}`
        : `The ${objective.label} has all the charges it needs. ${view.siteLabel}`;
    }
    if (!objective.destroyed) {
      const radius = kindOf(objective, rules).blastRadius;
      view.previewBlastArea = areaAround(objective.chargeHexes.map((h) => ({ ...h, radius })));
    }
  } else if (hex && state.parachutes.some((p) => p.q === hex.q && p.r === hex.r)) {
    const chute = state.parachutes.find((p) => p.q === hex.q && p.r === hex.r);
    view.siteLabel = `${chute.name}'s PARACHUTE — found if an enemy comes onto or beside this hex: alert +${rules.alert.parachuteFound}. `
      + `${chute.name} can pack it up standing here: [U] ${rules.actions.packParachute.apCost} AP.`;
  } else if (hex && isExfil(baseMap, hex)) {
    view.siteLabel = `EXFIL — a man who ends his move here is out. ${rules.mission.minimumOut} must get out, with the ${primaryLabel()} down, by dawn.`;
  }

  const unit = selectedUnit(state);
  if (!unit) return view;

  view.actions = actionsFor(unit);
  if (state.targeting) return deriveTargeting(view, unit, hex, hoverEnemy);

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
    view.risk = plan.path.map((step, i) => {
      if (i === 0 && plan.steps > 0) return null;
      // Moving brings him out of hiding, so only standing still keeps it.
      const mover = plan.steps > 0 ? { ...unit, hidden: false } : unit;
      const result = detectionAt(map, rules, state.enemies, state.alert.points, mover, step);
      if (!result) return null;
      const shot = unit.inContact && result.spotted && result.firing;
      return { ...result, shot, shotResult: shot ? shotResultOf(result, rules) : null };
    });
    view.riskLabel = describeRisk(plan, view.risk, view.place);
    const end = plan.path[plan.path.length - 1];
    if (inBlast(blastHexesThisTurn(state, rules), end) && !isExfil(baseMap, end)) {
      view.blastLabel = 'BLAST — a charge goes off at the end of this turn and he would be inside it: KILLED';
    }
    if (plan.steps === 0 && checkHide(unit, rules).ok) view.hideLabel = `hide here [G]: ${hideEffect(unit)}`;
  }
  return view;
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
  view.drop = {
    runs: baseMap.dropRuns.map((run) => ({
      id: run.id, label: run.label, tag: run.tag, wind: run.wind,
      from: { q: run.from[0], r: run.from[1] }, to: { q: run.to[0], r: run.to[1] },
      jumps: jumpPoints(run, count), selected: run.id === state.dropRunId,
    })),
    area: selected ? dropArea(map, rules, selected, state.units, state.enemies) : null,
  };
  // Before a run is picked, the targets and the exfil are ringed in marker pen
  // (SPEC.md §11), so the first thing the player sees is where to go.
  if (!selected) {
    view.targetRings = [
      ...state.objectives.map((o) => ({
        hexes: o.hexes, primary: o.primary, colour: 'red',
        // The charges it takes, so three dashed points never read as three charges.
        note: [o.primary ? 'BLOW IT!' : `BONUS +${rules.scoring.secondary}`, chargeCount(kindOf(o, rules).chargesNeeded)],
      })),
      { hexes: view.exfil, primary: false, colour: 'green', note: `GET ${rules.mission.minimumOut} OUT HERE` },
    ];
  }
  if (!hex) {
    view.dropLabel = selected
      ? `${selected.label}, ${selected.tag.toUpperCase()}: ${selected.description} Wind ${selected.wind}. Space or JUMP to go.`
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

function primaryLabel() {
  return state.objectives.find((o) => o.primary).label.toLowerCase();
}

/**
 * "USE ONE CHARGE", "USE TWO CHARGES": the marker-pen count on a target ring,
 * in words, since a lettered 1 is too easily read as I.
 */
function chargeCount(n) {
  const words = ['NO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
  return `USE ${words[n] ?? n} CHARGE${n === 1 ? '' : 'S'}`;
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

/** SPEC.md §4: hovering an objective shows what it needs. */
function describeObjective(o) {
  const kind = kindOf(o, rules);
  const role = o.primary ? 'PRIMARY, needed to win' : `optional, +${rules.scoring.secondary} score`;
  if (o.destroyed) return `${o.label} (${role}) — DESTROYED${o.cut ? ', line cut' : ''}.`;
  const set = state.charges.filter((c) => c.objectiveId === o.id);
  const burning = set.length ? `, ${set.length} set (fuse ${set.map((c) => c.fuse).join(', ')})` : '';
  const parts = [
    `needs ${chargesOnPoints(o)}`,
    `${o.detonated} gone off${burning}`,
    `fuse ${rules.charges.fuseTurns} turns`,
    `blast ${kind.blastRadius} hex${kind.blastRadius === 1 ? '' : 'es'} from each charge, killing anyone in it, ours or theirs`,
    `alert +${kind.alert}`,
  ];
  if (kind.cutLine) parts.push('or a scout can cut the line: a full turn, silent');
  return `${o.label} (${role}) — ${parts.join(', ')}.`;
}

/** The mission at a glance for the panel: objectives, men out, the diversion. */
function describeMissionState() {
  const out = state.units.filter((u) => u.out).length;
  return {
    objectives: state.objectives.map((o) => {
      const kind = kindOf(o, rules);
      const set = state.charges.filter((c) => c.objectiveId === o.id).length;
      return {
        label: o.label, primary: o.primary, destroyed: o.destroyed, cut: o.cut,
        points: o.primary ? rules.scoring.primary : rules.scoring.secondary,
        detail: o.destroyed ? (o.cut ? 'Line cut' : 'Destroyed') : `${o.detonated + set} of ${kind.chargesNeeded} charges set${set ? `, ${set} burning` : ''}`,
        progress: o.destroyed ? (o.cut ? 'cut' : 'done') : `${o.detonated + set}/${kind.chargesNeeded}${set ? ' ●' : ''}`,
      };
    }),
    out,
    minimumOut: rules.mission.minimumOut,
    shortfall: primaryShortfall(state, rules),
    diversion: { ...checkDiversion(state, rules), left: rules.diversion.uses - state.diversionsCalled },
  };
}

// SPEC.md §4 Actions, for the selected man: what each costs and, if he cannot
// take it, why not. Suppress, stone and stabilise need a target, so here
// "ok" means he could take them against something. Actions his role or
// loadout can never allow are left off, so the strip keeps to three rows.
function actionsFor(unit) {
  const role = rules.roles[unit.role];
  const never = new Set([
    ...(role.suppress ? [] : ['suppress']),
    ...(role.kill ? [] : ['kill']),
    ...(role.cutLine ? [] : ['cut']),
    ...(chargeCapacity(unit, rules) > 0 ? [] : ['pickUp', 'charge']),
  ]);
  const patients = state.units.filter((u) => (
    onBoard(u) && u.id !== unit.id && hexDistance(u, unit) === 1 && u.hits > 0 && !u.stabilised
  ));
  const stabilise = patients.length === 0
    ? { ok: false, cost: unit.apMax, reason: 'no wounded man beside him' }
    : patients.map((patient) => checkStabilise(unit, patient)).find((c) => c.ok) ?? checkStabilise(unit, patients[0]);
  const canSuppress = state.enemies.map((e) => checkSuppress(map, unit, e, rules));
  const suppress = canSuppress.find((c) => c.ok) ?? checkSuppress(map, unit, null, rules);
  const kill = state.enemies.map((e) => checkKill(map, unit, e, rules)).find((c) => c.ok)
    ?? checkKill(map, unit, null, rules);
  // Every man has somewhere in range to throw, so only his AP can stop him.
  const stoneCheck = checkThrowStone(map, unit, nearestInPlay(unit), rules);
  const ap = (n) => `${n} AP`;
  return [
    {
      id: 'hide', key: 'G', label: 'Hide', ...withCost(checkHide(unit, rules), ap),
      help: `Go to ground: +${rules.actions.hide.concealment} concealment on this hex only, and it ends his turn. `
        + `It does not cover the hexes he crossed to get here. Here: ${hideEffect(unit)}`,
    },
    { id: 'suppress', key: 'S', label: 'Suppress', help: 'Fire on an enemy he can see: it will not fire or move next turn. Loud.', ...withCost(suppress.reason === 'pick an enemy' ? { ...suppress, reason: 'no enemy in range and sight' } : suppress, ap) },
    { id: 'kill', key: 'K', label: 'Kill', help: 'Finish an enemy suppressed this turn or last with one silenced shot: quieter than suppressing, but it leaves a body. The reserve squad cannot be killed.', ...withCost(kill.reason === 'pick an enemy' ? { ...kill, reason: 'no suppressed enemy in range and sight' } : kill, ap) },
    {
      id: 'stone', key: 'T', label: 'Throw stone', short: 'Stone', ...withCost(stoneCheck, ap),
      help: `He stays put and lobs a stone onto a hex up to ${rules.actions.throwStone.range} away, over anything. Patrols in earshot walk over to look and sentries turn to face it — use it to pull a patrol off your path or turn a sentry's back. Alert +${rules.alert.stone}. Press T, then click where it lands`,
    },
    { id: 'stabilise', key: 'A', label: 'Stabilise', help: 'A full turn beside a wounded man', ...withCost(stabilise, () => 'full turn') },
    { id: 'pack', key: 'U', label: 'Pack chute', short: 'Pack', help: 'Pack up his own parachute from this hex, so no patrol finds it', ...withCost(checkPackParachute(state.parachutes, unit, rules), ap) },
    { id: 'pickUp', key: 'P', label: 'Pick up', help: 'Take a dropped charge from this hex', ...withCost(checkPickUpCharge(state.droppedCharges, unit, rules), ap) },
    placeChargeAction(unit),
    { id: 'cut', key: 'X', label: 'Cut the line', short: 'Cut line', help: 'A full turn on an exchange charge hex: destroyed, silently', ...withCost(checkCutLine(state, unit, rules), () => 'full turn, silent') },
    { id: 'swim', key: 'W', label: 'Swim', help: 'A full turn: straight across the canal to the far bank', ...withCost(checkSwim(map, state, unit, null, rules), () => 'full turn') },
  ].filter((a) => !never.has(a.id)).map((a) => ({ ...a, active: state.targeting === a.id }));
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
    return `too late to help — the ${seenOnTheWay.d.enemyLabel.toLowerCase()} already sees him in ${placeName(map, state.objectives, baseMap.exfil.map(([q, r]) => ({ q, r })), seenOnTheWay.h)}, on his way here${unit.inContact ? ', and will fire' : ''}.`;
  }
  const open = detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: false }, unit);
  const hidden = detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: true }, unit);
  if (!hidden) return 'no enemy can see this hex, so hiding adds nothing.';
  if (hidden.spotted) {
    return `still SPOTTED, hidden or not — too little cover this close (${describeDetection(hidden)})${unit.inContact && hidden.firing ? '. He will be fired on' : ''}. Get further away or into heavier cover.`;
  }
  if (open?.spotted) return `NOT spotted once hidden — hiding here ${unit.inContact ? 'breaks contact' : 'keeps him out of sight'} (${describeDetection(hidden)}).`;
  return `not spotted either way (${describeDetection(hidden)}).`;
}

// Place a charge, with its fuse — and a warning if setting it on a secondary
// would leave too few for the primary, which ends the mission (SPEC.md §10).
function placeChargeAction(unit) {
  const check = checkPlaceCharge(state, unit, rules);
  let cost = `${check.cost} AP, fuse ${check.fuse}`;
  if (check.ok && !check.objective.primary && primaryShortfall(placeCharge(state, unit.id, rules), rules) > 0) {
    cost += ` — leaves too few for the ${primaryLabel()}: WITHDRAWS`;
  }
  return {
    id: 'charge', key: 'C', label: 'Place charge', short: 'Charge', help: `Set a charge here: it goes off in ${check.fuse} fuse phase${check.fuse === 1 ? '' : 's'}, this turn's included`,
    ok: check.ok, reason: check.reason, cost,
  };
}

function withCost(check, format) {
  return { ok: check.ok, reason: check.reason, cost: format(check.cost) };
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
function deriveTargeting(view, unit, hex, hoverEnemy) {
  const targets = new Map();
  const add = (h) => targets.set(hexKey(h.q, h.r), { q: h.q, r: h.r });
  const kind = state.targeting;

  if (kind === 'suppress') {
    for (const e of state.enemies) if (checkSuppress(map, unit, e, rules).ok) add(e);
    if (hoverEnemy) {
      const check = checkSuppress(map, unit, hoverEnemy, rules);
      view.targetLabel = check.ok
        ? `Suppress ${hoverEnemy.label} — ${check.cost} AP, gunfire: alert rises and it is heard. Click to fire.`
        : `Suppress ${hoverEnemy.label}: ${check.reason}.`;
    } else {
      view.targetLabel = `Suppress: click an enemy inside ${unit.shortName}'s spot radius with a clear line. Esc to cancel.`;
    }
  } else if (kind === 'kill') {
    for (const e of state.enemies) if (checkKill(map, unit, e, rules).ok) add(e);
    if (hoverEnemy) {
      const check = checkKill(map, unit, hoverEnemy, rules);
      view.targetLabel = check.ok
        ? `Kill the ${hoverEnemy.label.toLowerCase()} — ${check.cost} AP, one silenced shot: alert +${applyHook(unit, 'onFire', 'alert', rules.alert.silenced).value}, heard ${hearingRadius('silenced', state.alert.points, rules)} hexes off. Leaves a body. Click to fire.`
        : `Kill: ${check.reason}.`;
    } else {
      view.targetLabel = `Kill: click a suppressed enemy inside ${unit.shortName}'s spot radius with a clear line. Esc to cancel.`;
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
        : hears.map((e) => `the ${e.label.toLowerCase()} ${e.speed === 0 ? 'turns to face it' : 'walks over to look'}`).join(', ');
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
    view.targetLabel = check?.ok
      ? `Swim across to ${view.place(hex)} — ${unit.shortName}'s whole turn. He is tested on the far bank. Click to swim.`
      : check ? `Swim: ${check.reason}.` : 'Swim: click the bank straight across the water. Esc to cancel.';
  } else if (kind === 'stabilise') {
    for (const u of state.units) if (checkStabilise(unit, u).ok) add(u);
    const patient = hex ? unitAt(state.units, hex.q, hex.r) : null;
    const check = patient ? checkStabilise(unit, patient) : null;
    view.targetLabel = check?.ok
      ? `Stabilise ${patient.shortName} — ${unit.shortName}'s whole turn. ${patient.shortName} gets his full AP back next turn. Click to start.`
      : check ? `Stabilise: ${check.reason}.` : 'Stabilise: click a wounded man beside him. Esc to cancel.';
  }
  view.targets = targets;
  return view;
}

function render() {
  map = effectiveMap(baseMap, state.objectives, rules);
  const view = deriveView();
  currentView = view;
  noteHeard();
  renderPieces(layers, state, view);
  renderAlertDial(alertDial, alertCaption, view.alert);
  renderReport(reportList, state, view.place, locateHex);
  renderTurnCounter(turnCounter, state, rules);
  renderDawnStrip(dawnStrip, state, rules);
  renderEndTurnButton(endTurnButton, state, rules);
  renderUndoButton(undoButton, state, Boolean(undoState));
  renderRoster(rosterList, state, map, view, { onSelect: handleRosterClick, onHover: hoverRosterUnit });
  if (view.dropRuns) renderDropRuns(actionBar, view.dropRuns, handleChooseRun);
  else renderActions(actionBar, view.actions, handleAction);
  renderReadout(readout, state, map, view);
  renderMission(missionList, view.mission);
  renderDiversion(diversionButton, view.mission.diversion);
  renderResults(resultsBox, state.outcome, level.label, { title: GAME_TITLE, tagline: GAME_TAGLINE });
  // Every man's name is set in bold on the card, as in the report.
  const card = briefing && { names: state.units.map((u) => u.shortName), ...describeBriefing(briefing, view) };
  renderBriefing(briefingBackdrop, briefingCard, card, (on) => { briefingsOn = on; });
  dropStalePopup();
  // A card laid down, or the back page turned over, rustles once.
  const shown = state.outcome ? 'results' : briefing?.kind ?? null;
  if (shown && shown !== cardShown) playCue('card');
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
 * Take a player action's result and see whether it ended the mission — the
 * last man stepping onto the exfil, say, or a charge set on a secondary that
 * leaves the primary short (SPEC.md §10). `cue` is the sound it makes
 * (render/sound.js), or null for none.
 */
function commit(next, cue = 'action') {
  if (next === state) return;
  undoState = state;
  state = settleMission(next, rules, baseMap);
  if (cue) playCue(cue);
}

/** Sound on or off (M, or the word in the margin). Not remembered: the game stores nothing (CLAUDE.md rule 9). */
function toggleSound() {
  setMuted(!isMuted());
  renderSoundToggle(soundToggle, isMuted());
}

/** The sounds of a turn's report: a crump for any bang, a dog when the garrison stirs. */
function cueReport(report) {
  if (report.some((e) => e.kind === 'explosion')) playCue('explosion');
  if (report.some((e) => e.kind === 'alertRise')) playCue('alertRise');
}

/** Take back the last move or action, once, keeping where the mouse is. */
function undoLast() {
  if (!undoState || state.outcome || briefing || dropShow) return;
  const previous = undoState;
  undoState = null;
  playCue('move');
  state = { ...previous, hoverHex: state.hoverHex, showRoutes: state.showRoutes, targeting: null };
  render();
}

// --- input ------------------------------------------------------------------

function handleHexClick(q, r) {
  if (dropShow) return endDropShow();
  if (state.outcome || state.phase === 'drop') return;
  highlightHex = null;
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
      commit(moveUnit(state, mover.id, plan, baseMap), 'move');
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
  if (other && other.id !== mover.id && state.targeting !== 'stabilise') {
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
  } else if (state.targeting === 'stone') {
    next = throwStone(state, mover.id, { q, r }, map, rules);
  } else if (state.targeting === 'stabilise') {
    const patient = unitAt(state.units, q, r);
    if (patient) next = stabiliseUnit(state, mover.id, patient.id);
  } else if (state.targeting === 'swim') {
    next = swimAcross(state, mover.id, { q, r }, map, rules);
  }
  if (next !== state) commit(setTargeting(next, null));
  else if (other && other.id !== mover.id) state = selectUnit(state, other.id);
}

/** An action button or its key. Aimed actions start aiming; the rest happen. */
function handleAction(id) {
  if (state.outcome) return;
  if (id === 'diversion') {
    const before = state;
    commit(callDiversion(state, rules), 'diversion');
    // Said on a card, so a call can never pass unnoticed and be made twice.
    if (state !== before) briefing = { kind: 'diversion', before };
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
      commit(placeCharge(state, unit.id, rules));
      break;
    case 'cut':
      commit(cutLine(state, unit.id, rules));
      break;
    case 'suppress':
    case 'kill':
    case 'stone':
    case 'swim':
    case 'stabilise': {
      const action = actionsFor(unit).find((a) => a.id === id);
      if (state.targeting === id) state = setTargeting(state, null);
      else if (action.ok) state = setTargeting(state, id);
      break;
    }
    default:
      return;
  }
  render();
}

function handleHexHover(q, r) {
  state = setHover(state, { q, r });
  render();
}

function handleHexLeave() {
  state = setHover(state, null);
  render();
}

function handleRosterClick(unitId) {
  if (dropShow) return endDropShow();
  if (state.outcome) return;
  state = selectUnit(state, unitId);
  render();
}

function handleEndTurn() {
  if (briefing) return closeBriefing();
  if (dropShow) return endDropShow();
  if (state.phase === 'drop') return jumpNow();
  endTurnNow();
}

function endTurnNow() {
  undoState = null;
  state = endTurn(state, rules, baseMap);
  cueReport(state.report);
  if (!state.outcome && briefingsOn) briefing = { kind: 'turn' };
  render();
}

function closeBriefing() {
  briefing = null;
  render();
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
  undoState = null;
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

/** The card's words: the orders before the drop, or this turn's update. */
function describeBriefing(which, view) {
  const primary = state.objectives.find((o) => o.primary);
  if (which.kind === 'orders') {
    const bonus = state.objectives.filter((o) => !o.primary).map((o) => `the ${o.label.toLowerCase()}`);
    const bonusText = bonus.length > 1 ? `${bonus.slice(0, -1).join(', ')} and ${bonus.at(-1)}` : bonus.join('');
    // Each target's charges against its points, and what the stick carries
    // between them, so a target with three points is not read as three charges.
    const needs = state.objectives.map((o) => {
      const needed = kindOf(o, rules).chargesNeeded;
      const points = o.chargeHexes.length;
      const where = needed === points ? (needed === 1 ? 'on its point' : 'one on each point') : `on any ${needed === 1 ? '' : `${needed} `}point${needed === 1 ? '' : 's'}`;
      return `the ${o.label.toLowerCase()} ${needed}, ${where}`;
    }).join('; ');
    const carried = state.units.reduce((n, u) => n + u.charges, 0);
    return {
      banner: { title: GAME_TITLE, tagline: GAME_TAGLINE },
      title: 'ORDERS',
      kicker: 'BEFORE THE DROP',
      paragraphs: [
        `Tonight six men drop behind the lines. Blow the ${primary.label.toLowerCase()} before dawn, then get at least ${rules.mission.minimumOut} of them out at the exfil. Dawn comes at the end of turn ${rules.turnLimit}.`,
        ...(bonus.length ? [`${bonusText[0].toUpperCase()}${bonusText.slice(1)} ${bonus.length === 1 ? 'is a bonus target' : 'are bonus targets'}, +${rules.scoring.secondary} each. Every bang wakes the garrison, so it’s important to plan the order you set them off. It’s good to be slow and stealthy, as long as you finish before dawn!`] : []),
      ],
      sections: [{
        heading: 'HOW TO PLAY',
        lines: [
          'The Dakota troop aircraft flies one of these lines; your men jump along it, drifting a hex or two downwind. Pick one with 1–3.',
          'Hit SPACE to jump. Then click a man (or press 1–6), hover a hex to see what the move costs and risks, and click to go. SPACE ends a turn.',
          'Red rings mark your targets. The red dashed hexes are their charge points: stand a man with a charge on one and press C.',
          `You don’t fill every point. Charges needed: ${needs}. The squad carries ${carried} charges in total.`,
          'Hover anything for detail. KEYS, top right, lists every key.',
        ],
      }],
      // SPEC.md §10: the level, chosen here and fixed once the stick jumps.
      choice: {
        heading: 'DIFFICULTY',
        options: difficulty.levels.map((l) => ({ id: l.id, label: l.label, summary: l.summary, selected: l.id === level.id })),
        onChoose: handleChooseLevel,
      },
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
      { heading: 'WHAT NEXT', hints: true, lines: hintsFor(state, rules, { diversionOk: view.mission.diversion.ok }) },
    ],
    toggle: { on: briefingsOn },
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
    title: 'RAF DIVERSION',
    kicker: 'BOMBERS OVER THE TOWN',
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
      + 'If he is seen again at the end of this turn he is fired on: hit in the open or light cover, pinned in heavy cover.\n'
      + 'Break contact now: get out of its sight, hide where the readout says he is not spotted [G], or have a gunner suppress it [S].'];
  }
  if (id === 'marker-wounded') {
    const left = rules.combat.hitsToKill - unit.hits;
    return ['WOUNDED', `${name} is down to ${rules.combat.woundedActionPoints} AP and cannot carry a charge. ${left === 1 ? 'One more hit kills him' : `${left} more hits kill him`}. `
      + 'A man beside him can stabilise him [A]: a full turn, and he gets his full AP back.'];
  }
  if (id === 'marker-hidden') {
    return ['HIDDEN', `${name} has gone to ground: +${rules.actions.hide.concealment} concealment on this hex until he next spends AP. Hold [H] to stay down.`];
  }
  if (id === 'marker-orders') {
    const leader = state.units.find((u) => u.leader);
    return ['ORDERS', `${name} started this turn within ${rules.command.radius} hexes of ${leader?.shortName ?? 'the leader'}: +${unit.commandBonus} AP this turn.`];
  }
  return ['', ''];
}

/** Jump, and show the stick going out and coming down. */
function jumpNow() {
  const run = runById(baseMap, state.dropRunId);
  if (!run) return;
  const jumps = jumpPoints(run, state.units.length);
  const order = state.units.map((u) => u.id);
  undoState = null;
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
    briefingAfterDrop = briefingsOn;
  } else if (state.phase !== 'drop' && briefingsOn) {
    briefing = { kind: 'turn' };
  }
  render();
}

function endDropShow() {
  clearTimeout(dropShowTimer);
  dropShow = null;
  if (briefingAfterDrop) briefing = { kind: 'turn' };
  briefingAfterDrop = false;
  render();
}

function handleChooseRun(runId) {
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

// SPEC.md §4: 1–6 select, Tab cycle, Space end turn, Esc cancel, H hold,
// R toggle the patrol-route overlay, and the action keys. Once the mission is
// over only R still does anything.
function handleKey(event) {
  unlockSound();
  if ((event.key === 'm' || event.key === 'M') && !event.metaKey && !event.ctrlKey && !event.altKey) {
    toggleSound();
    return;
  }
  // Cmd-Z or Ctrl-Z undoes, as everywhere else; so does Z on its own.
  if ((event.metaKey || event.ctrlKey) && !event.altKey && (event.key === 'z' || event.key === 'Z') && !briefing && !dropShow) {
    event.preventDefault();
    undoLast();
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  // Any key puts the briefing away, and does nothing else.
  if (briefing) {
    event.preventDefault();
    closeBriefing();
    return;
  }
  if (dropShow) {
    event.preventDefault();
    endDropShow();
    return;
  }
  if (state.phase === 'drop') {
    handleDropKey(event);
    return;
  }
  if (state.outcome && event.key !== 'r' && event.key !== 'R') return;
  const key = event.key;

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
    case 'g':
    case 'G':
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
    case 'd':
    case 'D':
      handleAction('diversion');
      return;
    case 'h':
    case 'H': {
      const unit = selectedUnit(state);
      if (!unit) return;
      commit(holdUnit(state, unit.id), null);
      const next = nextUnitId(state);
      if (next) state = selectUnit(state, next);
      break;
    }
    default:
      return;
  }
  render();
}

// --- start ------------------------------------------------------------------

// Tells the failure reporter in index.html that the module did run, so it can
// tell "the browser would not run this" apart from "this threw".
window.dispatchEvent(new Event('night-drop-started'));

try {
  applyDocumentTheme();
  loadSuppliedPaper();
  const fontsLoaded = loadSuppliedFonts();
  rawMap = await loadMap();
  rawRules = await loadJson('data/rules.json');
  traits = validateTraits(await loadJson('data/traits.json'));
  roster = await loadJson('data/roster.json');
  difficulty = validateDifficulty(await loadJson('data/difficulty.json'), rawRules, { types: rawMap.enemyTypes });

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
  });

  // Right-click cancels (SPEC.md §4), so the browser menu has to get out of
  // the way over the board.
  svg.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    state = deselect(state);
    render();
  });
  endTurnButton.addEventListener('click', handleEndTurn);
  undoButton.addEventListener('click', undoLast);
  attachPopup(undoButton, UNDO_HELP);
  diversionButton.addEventListener('click', () => handleAction('diversion'));
  window.addEventListener('keydown', handleKey);
  // Browsers keep sound off until the page has been pressed or clicked.
  window.addEventListener('pointerdown', unlockSound);
  soundToggle.addEventListener('click', () => {
    soundToggle.blur();
    toggleSound();
  });
  renderSoundToggle(soundToggle, isMuted());
  // Sound files dropped into assets/audio replace the placeholders (ART-ASSETS.md §9).
  loadSuppliedSounds();

  // Portrait art dropped into assets/portraits replaces the drawn portraits
  // as each file arrives (ART-ASSETS.md §2).
  loadSuppliedPortraits(state.units.map((u) => u.id), () => render());
  // So are a painted title card in assets/title (ART-ASSETS.md §7) and a
  // painted aircraft in assets/aircraft (§6).
  loadSuppliedTitleCard();
  loadSuppliedAircraft();
  loadSuppliedEnemyChips(Object.keys(baseMap.enemyTypes));
  renderGutter(gutterNote);
  renderKeys(keysTab);
  attachPopup(alertBox, () => describeAlertStates(currentView.alert));
  attachPopup(diversionButton, () => describeDiversion(rules.diversion.uses));
  // The orders open over the board before anything else (SPEC.md §11).
  briefing = { kind: 'orders' };
  briefingBackdrop.addEventListener('click', () => closeBriefing());
  // Speech bubbles are measured in the face they are set in: wait for it.
  await fontsLoaded;
  render();

  // The board is up. The failure reporter in index.html stops attributing
  // stray page errors — extensions throw plenty — to the game's startup.
  window.dispatchEvent(new Event('night-drop-ready'));
} catch (error) {
  readout.textContent = '';
  renderError(errorBox, error);
}
