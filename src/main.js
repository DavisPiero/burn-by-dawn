// Bootstrap: owns the state, the input handling and the render loop. The
// render modules only draw; this module is the one place state actually
// changes (CLAUDE.md rule 7), and the one place game rules and rendering meet.

import { alertIndex, detectionAt, listeners, routePath, shotResultOf, visibleHexes, visionRadiusOf } from './enemy.js';
import { DIRECTION_NAMES, hexDistance } from './hex.js';
import { forEachCell, hexKey, isInPlay, loadMap, loadJson } from './map.js';
import {
  createInitialState, deselect, endTurn, hideUnit, holdUnit, isDawn, moveUnit, nextUnitId, pickUpCharge,
  selectHex, selectUnit, selectedUnit, setHover, setTargeting, stabiliseUnit, suppressEnemy, throwStone,
  toggleRoutes,
} from './state.js';
import { validateTraits } from './traits.js';
import {
  checkHide, checkPickUpCharge, checkStabilise, checkSuppress, checkThrowStone,
  onBoard, planMove, reachableFor, traitEffects, unitAt,
} from './units.js';
import { boardPixelBounds, createBoard, renderPieces } from './render/board.js';
import {
  describeDetection, describePlan, describeRisk, renderActions, renderAlertDial, renderEndTurnButton,
  renderError, renderLegend, renderReadout, renderReport, renderRoster, renderTurnCounter,
} from './render/ui.js';

const svg = document.getElementById('board');
const readout = document.getElementById('coord-readout');
const legend = document.getElementById('legend');
const errorBox = document.getElementById('error');
const turnCounter = document.getElementById('turn-counter');
const endTurnButton = document.getElementById('end-turn');
const rosterList = document.getElementById('roster');
const alertDial = document.getElementById('alert-dial');
const alertCaption = document.getElementById('alert-caption');
const reportList = document.getElementById('report');
const actionBar = document.getElementById('actions');

let state = null;
let map = null;
let rules = null;
let layers = null;

// Vision only changes when an enemy moves or the alert changes, not on every
// hover, so it is worked out once per enemy phase rather than per mouse move.
let visionCache = { enemies: null, points: null, byId: null };

function visionById() {
  if (visionCache.enemies !== state.enemies || visionCache.points !== state.alert.points) {
    visionCache = {
      enemies: state.enemies,
      points: state.alert.points,
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

  const view = {
    traitEffectsById,
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
  };

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
    view.riskLabel = describeRisk(plan, view.risk);
    if (plan.steps === 0 && checkHide(unit, rules).ok) {
      const hidden = detectionAt(map, rules, state.enemies, state.alert.points, { ...unit, hidden: true }, unit);
      view.hideLabel = hidden
        ? `hide here [G]: ${hidden.spotted ? 'still SPOTTED' : 'not spotted'} — ${describeDetection(hidden)}`
        : 'hide here [G]: unseen anyway';
    }
  }
  return view;
}

// SPEC.md §4 Actions, for the selected man: what each costs and, if he cannot
// take it, why not. Suppress, stone and stabilise need a target, so here
// "ok" means he could take them against something.
function actionsFor(unit) {
  const patients = state.units.filter((u) => (
    onBoard(u) && u.id !== unit.id && hexDistance(u, unit) === 1 && u.hits > 0 && !u.stabilised
  ));
  const stabilise = patients.length === 0
    ? { ok: false, cost: unit.apMax, reason: 'no wounded man beside him' }
    : patients.map((patient) => checkStabilise(unit, patient)).find((c) => c.ok) ?? checkStabilise(unit, patients[0]);
  const canSuppress = state.enemies.map((e) => checkSuppress(map, unit, e, rules));
  const suppress = canSuppress.find((c) => c.ok) ?? checkSuppress(map, unit, null, rules);
  // Every man has somewhere in range to throw, so only his AP can stop him.
  const stoneCheck = checkThrowStone(map, unit, nearestInPlay(unit), rules);
  const ap = (n) => `${n} AP`;
  return [
    { id: 'hide', key: 'G', label: 'Hide', help: 'Go to ground: +concealment on this hex, ends his turn', ...withCost(checkHide(unit, rules), ap) },
    { id: 'suppress', key: 'S', label: 'Suppress', help: 'Fire on an enemy he can see: it will not fire or move next turn. Loud.', ...withCost(suppress.reason === 'pick an enemy' ? { ...suppress, reason: 'no enemy in range and sight' } : suppress, ap) },
    { id: 'stone', key: 'T', label: 'Throw stone', help: `A noise up to ${rules.actions.throwStone.range} hexes away: patrols go to look, sentries turn`, ...withCost(stoneCheck, ap) },
    { id: 'stabilise', key: 'A', label: 'Stabilise', help: 'A full turn beside a wounded man', ...withCost(stabilise, () => 'full turn') },
    { id: 'pickUp', key: 'P', label: 'Pick up charge', help: 'Take a dropped charge from this hex', ...withCost(checkPickUpCharge(state.droppedCharges, unit, rules), ap) },
  ].map((a) => ({ ...a, active: state.targeting === a.id }));
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
  } else if (kind === 'stone') {
    forEachCell(map, (q, r) => { if (checkThrowStone(map, unit, { q, r }, rules).ok) add({ q, r }); });
    const check = hex ? checkThrowStone(map, unit, hex, rules) : null;
    if (check?.ok) {
      const hears = listeners(state.enemies, 'stone', hex, state.alert.points, rules);
      view.hearsIds = new Set(hears.map((e) => e.id));
      const who = hears.length === 0
        ? 'nobody would hear it'
        : hears.map((e) => `${e.label} ${e.speed === 0 ? 'turns' : 'goes to look'}`).join(', ');
      view.targetLabel = `Throw a stone at (${hex.q}, ${hex.r}) — ${check.cost} AP, alert +${rules.alert.stone}: ${who}. Click to throw.`;
    } else {
      view.targetLabel = check ? `Throw a stone: ${check.reason}.` : 'Throw a stone: click a hex. Esc to cancel.';
    }
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
  const view = deriveView();
  renderPieces(layers, state, view);
  renderAlertDial(alertDial, alertCaption, view.alert);
  renderReport(reportList, state);
  renderTurnCounter(turnCounter, state, rules);
  renderEndTurnButton(endTurnButton, state, rules);
  renderRoster(rosterList, state, map, view, handleRosterClick);
  renderActions(actionBar, view.actions, handleAction);
  renderReadout(readout, state, map, view);
}

// --- input ------------------------------------------------------------------

function handleHexClick(q, r) {
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
      state = moveUnit(state, mover.id, plan);
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
  const before = state;
  if (state.targeting === 'suppress') {
    const enemy = state.enemies.find((e) => e.q === q && e.r === r);
    if (enemy) state = suppressEnemy(state, mover.id, enemy.id, map, rules);
  } else if (state.targeting === 'stone') {
    state = throwStone(state, mover.id, { q, r }, map, rules);
  } else if (state.targeting === 'stabilise') {
    const patient = unitAt(state.units, q, r);
    if (patient) state = stabiliseUnit(state, mover.id, patient.id);
  }
  if (state !== before) state = setTargeting(state, null);
}

/** An action button or its key. Aimed actions start aiming; the rest happen. */
function handleAction(id) {
  const unit = selectedUnit(state);
  if (!unit) return;
  switch (id) {
    case 'hide':
      state = hideUnit(state, unit.id, rules);
      break;
    case 'pickUp':
      state = pickUpCharge(state, unit.id, rules);
      break;
    case 'suppress':
    case 'stone':
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
  state = selectUnit(state, unitId);
  render();
}

function handleEndTurn() {
  if (isDawn(state, rules)) return;
  state = endTurn(state, rules, map);
  render();
}

// SPEC.md §4: 1–6 select, Tab cycle, Space end turn, Esc cancel, H hold,
// R toggle the patrol-route overlay.
function handleKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
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
      if (isDawn(state, rules)) return;
      state = endTurn(state, rules, map);
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
    case 'h':
    case 'H': {
      const unit = selectedUnit(state);
      if (!unit) return;
      state = holdUnit(state, unit.id);
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
  map = await loadMap();
  rules = await loadJson('data/rules.json');
  const traits = validateTraits(await loadJson('data/traits.json'));
  const roster = await loadJson('data/roster.json');

  state = createInitialState(roster, traits, rules, map);

  const bounds = boardPixelBounds(map);
  svg.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`);

  layers = createBoard(svg, map, {
    onHexClick: handleHexClick,
    onHexHover: handleHexHover,
    onHexLeave: handleHexLeave,
  });

  // Right-click cancels (SPEC.md §4), so the browser menu has to get out of
  // the way over the board.
  svg.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    state = deselect(state);
    render();
  });
  endTurnButton.addEventListener('click', handleEndTurn);
  window.addEventListener('keydown', handleKey);

  renderLegend(legend, map);
  render();

  // The board is up. The failure reporter in index.html stops attributing
  // stray page errors — extensions throw plenty — to the game's startup.
  window.dispatchEvent(new Event('night-drop-ready'));
} catch (error) {
  readout.textContent = '';
  renderError(errorBox, error);
}
