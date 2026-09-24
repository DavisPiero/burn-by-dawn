// Bootstrap: owns the state, the input handling and the render loop. The
// render modules only draw; this module is the one place state actually
// changes (CLAUDE.md rule 7), and the one place game rules and rendering meet.

import { alertIndex, detectionAt, listeners, routePath, shotResultOf, visibleHexes, visionRadiusOf } from './enemy.js';
import { canLandOn, dropArea, jumpPoints, runById } from './drop.js';
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
  objectiveAt, primaryShortfall, swimTargets,
} from './sabotage.js';
import { validateTraits } from './traits.js';
import {
  chargeCapacity, checkHide, checkKill, checkPackParachute, checkPickUpCharge, checkStabilise, checkSuppress, checkThrowStone,
  onBoard, planMove, reachableFor, traitEffects, unitAt,
} from './units.js';
import { boardPixelBounds, createBoard, dropTimeline, renderPieces } from './render/board.js';
import { renderRoster } from './render/roster.js';
import { applyDocumentTheme, loadSuppliedPaper, loadSuppliedPortraits } from './render/theme.js';
import {
  DIVERSION_HELP, attachPopup, describeAlertStates, dropStalePopup, fitSpread, describeDetection, describePlan, describeRisk, describeRun,
  hidePopup, placeName, renderActions, renderAlertDial, renderDawnStrip, renderDiversion, renderDropRuns,
  renderEndTurnButton, renderError, renderGutter, renderKeys, renderMission, renderReadout, renderReport,
  renderResults, renderSeed, renderTurnCounter, showPopup,
} from './render/ui.js';

const svg = document.getElementById('board');
const readout = document.getElementById('coord-readout');
const errorBox = document.getElementById('error');
const turnCounter = document.getElementById('turn-counter');
const endTurnButton = document.getElementById('end-turn');
const rosterList = document.getElementById('roster');
const alertDial = document.getElementById('alert-dial');
const alertCaption = document.getElementById('alert-caption');
const reportList = document.getElementById('report');
const actionBar = document.getElementById('actions');
const diversionButton = document.getElementById('diversion');
const missionList = document.getElementById('mission');
const resultsBox = document.getElementById('results');
const seedBox = document.getElementById('seed');
const dawnStrip = document.getElementById('dawn-strip');
const gutterNote = document.getElementById('gutter-note');
const keysTab = document.getElementById('keys-tab');
const alertBox = document.getElementById('alert');

let state = null;
// `baseMap` is data/map.json as loaded; `map` is the board as the demolitions
// have left it (sabotage.js effectiveMap), refreshed on every render. Every
// rule is handed `map`; the terrain layer is drawn once from `baseMap`.
let baseMap = null;
let map = null;
let rules = null;
let layers = null;
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
    // SPEC.md §7, §10: the exfil, what the hovered objective needs, and the
    // ground a charge going off this turn would kill a man on.
    exfil,
    blastArea: areaAround(blastHexesThisTurn(state, rules)),
    hoverObjective: null,
    previewBlastArea: null,
    siteLabel: null,
    blastLabel: null,
    mission: describeMissionState(),
    drop: null,
    dropRuns: null,
    dropLabel: null,
    dropShow,
  };

  if (state.phase === 'drop') return deriveDrop(view, hex);

  const objective = hex && !hoverEnemy ? objectiveAt(state.objectives, hex) : null;
  if (objective) {
    view.hoverObjective = objective;
    view.siteLabel = describeObjective(objective);
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
    if (plan.steps === 0 && checkHide(unit, rules).ok) {
      const hidden = detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: true }, unit);
      view.hideLabel = hidden
        ? `hide here [G]: ${hidden.spotted ? 'still SPOTTED' : 'not spotted'} — ${describeDetection(hidden)}`
        : 'hide here [G]: unseen anyway';
    }
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
  view.drop = {
    runs: baseMap.dropRuns.map((run) => ({
      id: run.id, label: run.label, wind: run.wind,
      from: { q: run.from[0], r: run.from[1] }, to: { q: run.to[0], r: run.to[1] },
      jumps: jumpPoints(run, count), selected: run.id === state.dropRunId,
    })),
    area: selected ? dropArea(map, rules, selected, state.units, state.enemies) : null,
  };
  view.dropRuns = baseMap.dropRuns.map((run, i) => ({
    id: run.id, key: String(i + 1), label: run.label, description: run.description, wind: run.wind, selected: run.id === state.dropRunId,
  }));
  if (!hex) {
    view.dropLabel = selected
      ? `${selected.label}: ${selected.description} Wind ${selected.wind}. Space or JUMP to go.`
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

/** SPEC.md §4: hovering an objective shows what it needs. */
function describeObjective(o) {
  const kind = kindOf(o, rules);
  const role = o.primary ? 'PRIMARY, needed to win' : `optional, +${rules.scoring.secondary} score`;
  if (o.destroyed) return `${o.label} (${role}) — DESTROYED${o.cut ? ', line cut' : ''}.`;
  const set = state.charges.filter((c) => c.objectiveId === o.id);
  const burning = set.length ? `, ${set.length} set (fuse ${set.map((c) => c.fuse).join(', ')})` : '';
  const parts = [
    `needs ${kind.chargesNeeded} charge${kind.chargesNeeded === 1 ? '' : 's'} on separate ringed hexes`,
    `${o.detonated} gone off${burning}`,
    `fuse ${rules.charges.fuseTurns} turns`,
    `blast ${kind.blastRadius} hex${kind.blastRadius === 1 ? '' : 'es'} from each charge`,
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
    diversion: checkDiversion(state, rules),
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
    { id: 'hide', key: 'G', label: 'Hide', help: 'Go to ground: +concealment on this hex, ends his turn', ...withCost(checkHide(unit, rules), ap) },
    { id: 'suppress', key: 'S', label: 'Suppress', help: 'Fire on an enemy he can see: it will not fire or move next turn. Loud.', ...withCost(suppress.reason === 'pick an enemy' ? { ...suppress, reason: 'no enemy in range and sight' } : suppress, ap) },
    { id: 'kill', key: 'K', label: 'Kill', help: 'Finish an enemy he suppressed this turn or last: dead, and it leaves a body. Loud. The reserve squad cannot be killed.', ...withCost(kill.reason === 'pick an enemy' ? { ...kill, reason: 'no suppressed enemy in range and sight' } : kill, ap) },
    { id: 'stone', key: 'T', label: 'Throw stone', short: 'Stone', help: `A noise up to ${rules.actions.throwStone.range} hexes away: patrols go to look, sentries turn`, ...withCost(stoneCheck, ap) },
    { id: 'stabilise', key: 'A', label: 'Stabilise', help: 'A full turn beside a wounded man', ...withCost(stabilise, () => 'full turn') },
    { id: 'pack', key: 'U', label: 'Pack chute', short: 'Pack', help: 'Pack up his own parachute from this hex, so no patrol finds it', ...withCost(checkPackParachute(state.parachutes, unit, rules), ap) },
    { id: 'pickUp', key: 'P', label: 'Pick up', help: 'Take a dropped charge from this hex', ...withCost(checkPickUpCharge(state.droppedCharges, unit, rules), ap) },
    placeChargeAction(unit),
    { id: 'cut', key: 'X', label: 'Cut the line', short: 'Cut line', help: 'A full turn on an exchange charge hex: destroyed, silently', ...withCost(checkCutLine(state, unit, rules), () => 'full turn, silent') },
    { id: 'swim', key: 'W', label: 'Swim', help: 'A full turn: straight across the canal to the far bank', ...withCost(checkSwim(map, state, unit, null, rules), () => 'full turn') },
  ].filter((a) => !never.has(a.id)).map((a) => ({ ...a, active: state.targeting === a.id }));
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
        ? `Kill the ${hoverEnemy.label.toLowerCase()} — ${check.cost} AP, gunfire: alert rises and it is heard. Leaves a body. Click to fire.`
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
      const who = hears.length === 0
        ? 'nobody would hear it'
        : hears.map((e) => `${e.label} ${e.speed === 0 ? 'turns' : 'goes to look'}`).join(', ');
      view.targetLabel = `Throw a stone into ${view.place(hex)} — ${check.cost} AP, alert +${rules.alert.stone}: ${who}. Click to throw.`;
    } else {
      view.targetLabel = check ? `Throw a stone: ${check.reason}.` : 'Throw a stone: click a hex. Esc to cancel.';
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
  renderRoster(rosterList, state, map, view, { onSelect: handleRosterClick, onHover: hoverRosterUnit });
  if (view.dropRuns) renderDropRuns(actionBar, view.dropRuns, handleChooseRun);
  else renderActions(actionBar, view.actions, handleAction);
  renderReadout(readout, state, map, view);
  renderMission(missionList, view.mission);
  renderDiversion(diversionButton, view.mission.diversion);
  renderResults(resultsBox, state.outcome);
  dropStalePopup();
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
 * leaves the primary short (SPEC.md §10).
 */
function commit(next) {
  state = next === state ? state : settleMission(next, rules, baseMap);
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
      commit(moveUnit(state, mover.id, plan, baseMap));
    } else if (!mover) {
      state = selectHex(state, q, r);
    }
  }
  render();
}

// A click while aiming either takes the action or does nothing: a miss leaves
// the player aiming, and the readout already says why it would not work.
function handleTargetClick(q, r) {
  const mover = selectedUnit(state);
  if (!mover) return;
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
}

/** An action button or its key. Aimed actions start aiming; the rest happen. */
function handleAction(id) {
  if (state.outcome) return;
  if (id === 'diversion') {
    commit(callDiversion(state, rules));
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
  if (dropShow) return endDropShow();
  if (state.phase === 'drop') return jumpNow();
  state = endTurn(state, rules, baseMap);
  render();
}

/** Jump, and show the stick going out and coming down. */
function jumpNow() {
  const run = runById(baseMap, state.dropRunId);
  if (!run) return;
  const jumps = jumpPoints(run, state.units.length);
  const order = state.units.map((u) => u.id);
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
  }
  render();
}

function endDropShow() {
  clearTimeout(dropShowTimer);
  dropShow = null;
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
  if (event.metaKey || event.ctrlKey || event.altKey) return;
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
      state = endTurn(state, rules, baseMap);
      break;
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
      commit(holdUnit(state, unit.id));
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
  baseMap = await loadMap();
  map = baseMap;
  rules = await loadJson('data/rules.json');
  const traits = validateTraits(await loadJson('data/traits.json'));
  const roster = await loadJson('data/roster.json');

  // SPEC.md §1: a seed reproduces a playthrough. `?seed=N` replays one; with
  // none, the clock picks a fresh one. It is shown on the page either way.
  const seed = seedFromQuery(window.location.search) ?? freshSeed(Date.now());
  state = createInitialState(roster, traits, rules, baseMap, seed);
  renderSeed(seedBox, seed);

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
  });

  // Right-click cancels (SPEC.md §4), so the browser menu has to get out of
  // the way over the board.
  svg.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    state = deselect(state);
    render();
  });
  endTurnButton.addEventListener('click', handleEndTurn);
  diversionButton.addEventListener('click', () => handleAction('diversion'));
  window.addEventListener('keydown', handleKey);

  // Portrait art dropped into assets/portraits replaces the drawn portraits
  // as each file arrives (ART-ASSETS.md §2).
  loadSuppliedPortraits(state.units.map((u) => u.id), () => render());
  renderGutter(gutterNote);
  renderKeys(keysTab);
  attachPopup(alertBox, () => describeAlertStates(currentView.alert));
  attachPopup(diversionButton, DIVERSION_HELP);
  render();

  // The board is up. The failure reporter in index.html stops attributing
  // stray page errors — extensions throw plenty — to the game's startup.
  window.dispatchEvent(new Event('night-drop-ready'));
} catch (error) {
  readout.textContent = '';
  renderError(errorBox, error);
}
